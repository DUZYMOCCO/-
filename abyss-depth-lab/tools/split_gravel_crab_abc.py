#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ABYSS DIVE — 礫鎧ガニ A/B/C 全身原画 → 解剖学的パーツ分割（隔離試作）

ART_STYLE_GUIDE §1.1 の「全身原画ファースト」に従い、承認済みの全身原画
(scratch/gravel-crab-fullbody-ff358a86/) から、その原画の画素そのものを
解剖学的な領域（甲羅+眼 / 近側の太い鋏 / 奥側の鋏 / 脚）へ分割する。

- 幾何ブロックアウトのアルファで型抜きしない（旧 geo-crab の NG を踏襲しない）。
- 背景は RMBG-1.4 (briaai/RMBG-1.4) のサリエンシーマットで抜く（原画の輪郭を保持）。
- 分割は前景画素の領域所属（矩形 + 最近傍）で行い、隙間も二重取りも作らない。
- 原画の角度・色はそのまま保持し、横持ちのゲーム内倍率で読めるかを実機で評価する。

使い方:
  python abyss-depth-lab/tools/split_gravel_crab_abc.py --outdir <dir> [--sheet <png>]
"""
import argparse
import json
import os
import sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DEFAULT = os.path.join(
    os.environ.get("HERMES_SCRATCH", r"C:/Users/Yoshiyuki/AppData/Local/hermes/profiles/backup2/cache/scratch"),
    "gravel-crab-fullbody-ff358a86")

# 種ごとの原画・解剖領域（正規化 x0,y0,x1,y1、原画全体に対する）・目標体幅(px)
SPECIES = {
    "a": dict(
        label="丸いカニ（A: natural_710342）",
        src="natural_710342.png", target_body_w=980, drop_bottom_ground=True,
        regions=[
            ("carapace", (0.15, 0.07, 0.86, 0.43)),
            ("clawNear", (0.00, 0.40, 0.36, 0.90)),
            ("clawFar",  (0.44, 0.42, 0.86, 0.82)),
            ("legs",     (0.00, 0.36, 1.00, 0.96)),
        ]),
    "b": dict(
        label="低く幅広いカニ（B: final_02）",
        src="final_02.png", target_body_w=1180,
        regions=[
            ("carapace", (0.18, 0.18, 0.82, 0.55)),
            ("clawNear", (0.00, 0.36, 0.44, 0.88)),
            ("clawFar",  (0.54, 0.38, 1.00, 0.90)),
            ("legs",     (0.00, 0.30, 1.00, 0.82)),
        ]),
    "c": dict(
        label="青灰の異形鎧ガニ（C: review_01）",
        src="review_01.png", target_body_w=940,
        regions=[
            ("carapace", (0.16, 0.01, 0.86, 0.35)),
            ("clawNear", (0.00, 0.42, 0.46, 0.97)),
            ("clawFar",  (0.46, 0.42, 0.80, 1.00)),
            ("legs",     (0.00, 0.33, 1.00, 0.92)),
        ]),
}


def rmbg_matte(rgb_img):
    import torch
    from torchvision import transforms
    from transformers.modeling_utils import PreTrainedModel
    PreTrainedModel.all_tied_weights_keys = {}
    from transformers import AutoModelForImageSegmentation
    global _M, _TF, _DEV
    try:
        _M
    except NameError:
        _DEV = "cuda" if torch.cuda.is_available() else "cpu"
        _M = AutoModelForImageSegmentation.from_pretrained("briaai/RMBG-1.4", trust_remote_code=True).to(_DEV).eval()
        _TF = transforms.Compose([transforms.Resize((1024, 1024)), transforms.ToTensor(),
                                  transforms.Normalize([0.5]*3, [1.0]*3)])
    w, h = rgb_img.size
    with torch.no_grad():
        out = _M(_TF(rgb_img).unsqueeze(0).to(_DEV))
    ma = out[0][0].sigmoid().squeeze().float().cpu().numpy()
    return np.asarray(Image.fromarray((ma*255).astype(np.uint8)).resize((w, h), Image.BILINEAR)).astype(np.float32)/255.0


def rect_px(rect, w, h):
    x0, y0, x1, y1 = rect
    return (int(x0*w), int(y0*h), int(x1*w), int(y1*h))


def disk(r):
    y, x = np.mgrid[-r:r+1, -r:r+1]
    return (x*x + y*y) <= r*r


def partition(mask, regions, w, h):
    """解剖分割: 「太い塊 = 甲羅/鋏」「細い構造 = 脚」を太さで分ける。

    1) 開口(opening)で太い塊（甲羅・鋏）の芯だけ残す
    2) 芯を領域（甲羅/近鋏/奥鋏）へ位置で割当
    3) 前景の各画素を「最寄りの芯」へ、ただし距離 K 以内だけ。K を超える
       細い張り出しは脚（＝太い芯に属さない付属肢）。
    前景を隙間なく・二重取りなく充填する。
    """
    H, W = mask.shape
    r = max(6, int(min(W, H) * 0.016))
    st = disk(r)
    opened = ndimage.binary_opening(mask, structure=st)
    lab, n = ndimage.label(opened)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n+1)) if n else []
    thick_names = [nm for nm, _ in regions if nm != "legs"][:3]   # carapace, clawNear, clawFar
    centers = {}
    for nm, rect in regions:
        x0, y0, x1, y1 = rect_px(rect, w, h)
        centers[nm] = ((x0+x1)*0.5, (y0+y1)*0.5)
    cores_lab = np.zeros((H, W), np.int16)
    ys, xs = np.mgrid[0:H, 0:W]
    for nm in thick_names:                       # 太い芯を領域の矩形ごとに割当（優先順）
        x0, y0, x1, y1 = rect_px(dict(regions)[nm], w, h)
        sel = opened & (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1) & (cores_lab == 0)
        cores_lab[sel] = list(thick_names).index(nm) + 1
    # どの矩形にも入らない芯（隙間）は最寄り中心へ
    leftover = opened & (cores_lab == 0)
    if leftover.any():
        ly, lx = np.where(leftover)
        for yi, xi in zip(ly, lx):
            best = min(thick_names, key=lambda nm: (xi-centers[nm][0])**2 + (yi-centers[nm][1])**2)
            cores_lab[yi, xi] = list(thick_names).index(best) + 1
    idx = {nm: i for i, (nm, _) in enumerate(regions)}
    assign = np.full((H, W), idx["legs"], np.int16)
    # 太い塊の矩形に入る前景 = 甲羅/鋏（最寄りの芯で排他分割）。矩形外 = 脚。
    in_rect = np.zeros((H, W), bool)
    for nm in thick_names:
        x0, y0, x1, y1 = rect_px(dict(regions)[nm], w, h)
        in_rect |= (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    core_any = cores_lab > 0
    if core_any.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~core_any, return_indices=True)
        src = cores_lab[iy, ix]
        lut = np.array([idx["legs"]] + [idx[nm] for nm in thick_names], np.int16)
        inside = mask & in_rect
        assign[inside] = lut[src[inside]]
    return {nm: (assign == i) for i, (nm, _) in enumerate(regions)}


def split_one(key, cfg, src_dir, outdir):
    rgb = Image.open(os.path.join(src_dir, cfg["src"])).convert("RGB")
    w, h = rgb.size
    ma = rmbg_matte(rgb)
    ma = np.clip((ma - 0.22) / 0.5, 0.0, 1.0)      # 内部を不透明へ（原寸で透過抜けしない）
    fg = ma > 0.35
    fg = ndimage.binary_closing(fg, iterations=2)
    fg = ndimage.binary_fill_holes(fg)
    lab, n = ndimage.label(fg)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n+1))
        fg = lab == (int(np.argmax(sizes)) + 1)
    # 砂地など、下端に接する低彩度の地切り領域を落とす（原画の背景残り）
    if cfg.get("drop_bottom_ground"):
        arrc = np.asarray(rgb).astype(np.float32) / 255.0
        mx = arrc.max(-1); mn = arrc.min(-1)
        sat = (mx - mn) / (mx + 1e-6)
        lab2, n2 = ndimage.label(fg)
        bottom_labels = set(np.unique(lab2[-3:, :])) - {0}
        for b in bottom_labels:
            comp = lab2 == b
            if sat[comp].mean() < 0.24:      # 低彩度＝砂/地面
                fg[comp] = False
                ma[comp] = 0.0
    parts = partition(fg, cfg["regions"], w, h)
    # 隣接パーツを少し重ねる（境界は直線なので、姿勢で片方を動かすと隙間＝暗い帯が出る）。
    # 同じ原画画素で重ねるので静止時は完全一致、動かしても下のパーツが埋める。
    ov = int(cfg.get("overlap", 18))
    if ov > 0:
        st = disk(ov)
        parts = {nm: (ndimage.binary_dilation(m, structure=st) & fg) for nm, m in parts.items()}
    arr = np.asarray(rgb).astype(np.float32)

    # 体の原点 = 甲羅パーツの重心
    car = parts["carapace"]
    cys, cxs = np.where(car)
    ox, oy = float(cxs.mean()), float(cys.mean())

    out = {"key": key, "label": cfg["label"], "source": cfg["src"],
           "source_size": [w, h], "target_body_w": cfg["target_body_w"],
           "origin": [round(ox, 2), round(oy, 2)], "parts": {}}
    for name, m in parts.items():
        ys2, xs2 = np.where(m)
        if len(xs2) == 0:
            continue
        x0, x1, y0, y1 = xs2.min(), xs2.max()+1, ys2.min(), ys2.max()+1
        alpha = np.zeros((y1-y0, x1-x0), np.float32)
        alpha[m[y0:y1, x0:x1]] = 1.0
        alpha *= ma[y0:y1, x0:x1]      # 元の柔らかいエッジを保持
        sub = arr[y0:y1, x0:x1]
        rgba = np.dstack([sub, alpha*255]).astype(np.uint8)
        img = Image.fromarray(rgba, "RGBA")
        fn = f"gravel-crab-{key}-{name}.webp"
        img.save(os.path.join(outdir, fn), "WEBP", quality=92, method=6)
        # ピボット = パーツ bbox の上辺中央（肩/股の近似）。甲羅は重心。
        if name == "carapace":
            piv = [ (x1-x0)/2, (y1-y0)/2 ]
        else:
            piv = [ (x1-x0)/2, (y1-y0)*0.05 ]
        out["parts"][name] = {
            "file": fn, "w": int(x1-x0), "h": int(y1-y0),
            "offset": [round(x0-ox, 2), round(y0-oy, 2)],   # 体原点からの左上
            "pivot": [round(piv[0], 2), round(piv[1], 2)],
            "px": int(m.sum()),
        }
        print(f"  {key}/{name}: {fn} {x1-x0}x{y1-y0} px={int(m.sum())}")
    return out


def contact_sheet(metas, outdir, path):
    cell = 380
    cols = 4
    rows = len(metas)
    sheet = Image.new("RGB", (cols*cell, rows*cell), (26, 30, 38))
    d = ImageDraw.Draw(sheet)
    for r, (key, m) in enumerate(metas.items()):
        order = ["carapace", "clawNear", "clawFar", "legs"]
        for c, name in enumerate(order):
            p = m["parts"].get(name)
            if not p:
                continue
            im = Image.open(os.path.join(outdir, p["file"])).convert("RGBA")
            s = min((cell-20)/im.width, (cell-20)/im.height)
            im = im.resize((max(1, int(im.width*s)), max(1, int(im.height*s))), Image.LANCZOS)
            bg = Image.new("RGB", im.size, (58, 68, 84))
            bg.paste(im, (0, 0), im)
            sheet.paste(bg, (c*cell+10, r*cell+20))
            d.text((c*cell+12, r*cell+4), f"{key}:{name}", fill=(255, 225, 140))
    sheet.save(path)
    print("sheet ->", path)


def emit_js(metas, path):
    """parts.json をゲーム内で使う JS モジュールへ（オフライン。実行時 fetch しない）。"""
    lines = ["/* 自動生成: tools/split_gravel_crab_abc.py --emit-js が assets/gravel-crab-parts.json から作成。",
             "   礫鎧ガニ A/B/C のパーツ寸法・体原点・ピボット（原画 px 座標）。手編集しない。 */",
             "export const GRAVEL_CRAB_PARTS = Object.freeze(" + json.dumps(metas, ensure_ascii=False) + ");", ""]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("js ->", path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=SRC_DEFAULT)
    ap.add_argument("--outdir", default=os.path.join(ROOT, "assets"))
    ap.add_argument("--sheet", default="")
    ap.add_argument("--only", default="")
    ap.add_argument("--emit-js", default="")
    args = ap.parse_args()
    os.makedirs(args.outdir, exist_ok=True)
    metas = {}
    keys = [args.only] if args.only else list(SPECIES.keys())
    for key in keys:
        print(f"[{key}] {SPECIES[key]['label']}")
        metas[key] = split_one(key, SPECIES[key], args.src, args.outdir)
    with open(os.path.join(args.outdir, "gravel-crab-parts.json"), "w", encoding="utf-8") as f:
        json.dump(metas, f, ensure_ascii=False, indent=1)
    print("json ->", os.path.join(args.outdir, "gravel-crab-parts.json"))
    if args.sheet:
        contact_sheet(metas, args.outdir, args.sheet)
    if args.emit_js:
        emit_js(metas, args.emit_js)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback; traceback.print_exc()
        sys.exit(1)
