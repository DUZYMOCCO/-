#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""礫鎧ガニ A/B/C の原寸・透過連結チェック（自己完結）。

4 パーツ（legs / clawFar / carapace / clawNear）を parts.json の offset に従って
原寸で重ねたアルファ（合併）を作り、次を見る:

  - 内部の抜け（穴）: 合併の内側なのにアルファが 0 の画素がないか（外側から塗って判定）
  - 結合: 各パーツが他のパーツと接触しているか（浮いたパーツが無いか）
  - 不透明: 合併の最大アルファが 255（=1.0）か（半透明の継ぎ目を作っていないか）

使い方:
  python abyss-depth-lab/tools/check_gravel_crab_concat.py \
    --parts-dir abyss-depth-lab/assets --json abyss-depth-lab/assets/gravel-crab-parts.json
"""
import argparse, json, os, sys
from PIL import Image, ImageChops, ImageFilter

KEYS = ["a", "b", "c"]
PARTS = ["legs", "clawFar", "carapace", "clawNear"]


def flood_bg(bg):
    """背景(>0)を外周から内側へ広げ、内側に取り残された 0 画素（穴）を残す。"""
    grown = bg
    for _ in range(4000):
        nxt = ImageChops.darker(grown.filter(ImageFilter.MaxFilter(3)), bg)
        if ImageChops.difference(nxt, grown).getbbox() is None:
            return nxt
        grown = nxt
    return grown


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parts-dir", required=True)
    ap.add_argument("--json", required=True)
    ap.add_argument("--out-dir", default=None)
    a = ap.parse_args()

    with open(a.json, "r", encoding="utf-8") as f:
        meta = json.load(f)

    ok = True
    for k in KEYS:
        parts = meta[k]["parts"]
        loaded = []
        for p in PARTS:
            m = parts.get(p)
            if not m:
                continue
            im = Image.open(os.path.join(a.parts_dir, f"gravel-crab-{k}-{p}.webp")).convert("RGBA")
            loaded.append((p, im, int(round(m["offset"][0])), int(round(m["offset"][1]))))
        minx = min(x for _, _, x, _ in loaded)
        miny = min(y for _, _, _, y in loaded)
        W = max(x + im.width for _, im, x, _ in loaded) - minx
        H = max(y + im.height for _, im, _, y in loaded) - miny

        canvas = Image.new("L", (W, H), 0)
        placed = []
        for p, im, x, y in loaded:
            ch = im.getchannel("A")
            ox, oy = x - minx, y - miny
            cur = canvas.crop((ox, oy, ox + im.width, oy + im.height))
            canvas.paste(ImageChops.lighter(cur, ch), (ox, oy))
            placed.append((p, ch, ox, oy))

        bg = canvas.point(lambda v: 255 if v <= 8 else 0)
        grown = flood_bg(bg)
        holes_mask = ImageChops.subtract(bg, grown)
        holes = sum(holes_mask.histogram()[9:])

        isolated = []
        for p, ch, ox, oy in placed:
            others = Image.new("L", (W, H), 0)
            for q, ch2, ox2, oy2 in placed:
                if q == p:
                    continue
                cur = others.crop((ox2, oy2, ox2 + ch2.width, oy2 + ch2.height))
                others.paste(ImageChops.lighter(cur, ch2), (ox2, oy2))
            pad = ch.filter(ImageFilter.MaxFilter(3))
            box = (ox, oy, ox + ch.width, oy + ch.height)
            # multiply は小さいアルファで 0 に潰れるので、画素ごとの min（両方とも非0）で見る
            # pad はパーツサイズなので、そのまま他のパーツ（同サイズに切ったもの）と比べる
            touch = ImageChops.darker(pad, others.crop(box))
            if not touch.getbbox():
                isolated.append(p)

        max_alpha = int(canvas.getextrema()[1])
        fg = sum(canvas.histogram()[9:])
        if holes or max_alpha < 255 or isolated:
            ok = False
        print(json.dumps({"key": k, "canvas": [W, H], "fg_px": fg, "max_alpha": max_alpha,
                          "interior_holes": holes, "isolated_parts": isolated}, ensure_ascii=False))
        if a.out_dir:
            os.makedirs(a.out_dir, exist_ok=True)
            canvas.save(os.path.join(a.out_dir, f"concat_{k}.png"))
            holes_mask.save(os.path.join(a.out_dir, f"concat_holes_{k}.png"))

    print("RESULT", "OK" if ok else "NG")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
