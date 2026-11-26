#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""礫鎧ガニ A/B/C のレビューシート（原画 → 解剖分割 → 実画面）を作る。

使い方:
  python abyss-depth-lab/tools/build_gravel_crab_review.py \
    --concept-dir <fullbody dir> --parts-dir <assets> --shots-dir <evidence> --out <png/webp>
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

SPECIES = [("a", "natural_710342.png", "A: 丸いカニ（バブルショット）"), ("b", "final_02.png", "B: 低く幅広いカニ（岩石投げ）"), ("c", "review_01.png", "C: 青灰の異形鎧ガニ（大鋏と短い追跡）")]
COLS = ["原画（全身・承認）", "解剖分割（原画から）", "実画面・警戒（横持ち Depth ON）", "実画面・予備動作（予告は局所のみ）", "実画面・発射物／近接"]
# 種ごとの 4〜5 列目に使う実画面ショット（無ければ -, c は近接の予告）
SHOT_TAIL = {
    "a": ["a_charge.png", "a_shot_flight.png"],
    "b": ["b_charge.png", "b_rock_shatter.png"],
    "c": ["c_wind.png", "c_alert.png"],
}
CW, CH = 460, 300
PAD, HDR = 14, 66


def font(sz):
    for p in [r"C:/Windows/Fonts/meiryo.ttc", r"C:/Windows/Fonts/msgothic.ttc", r"C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
    return ImageFont.load_default()


def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--concept-dir", required=True)
    ap.add_argument("--parts-dir", required=True)
    ap.add_argument("--shots-dir", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    W = PAD + len(COLS) * (CW + PAD)
    H = HDR + len(SPECIES) * (CH + HDR) + PAD
    sheet = Image.new("RGB", (W, H), (20, 23, 30))
    d = ImageDraw.Draw(sheet)
    fh, fc = font(20), font(16)
    for j, c in enumerate(COLS):
        d.text((PAD + j * (CW + PAD) + 6, 14), c, fill=(255, 226, 140), font=fh)
    for i, (key, src, label) in enumerate(SPECIES):
        y0 = HDR + i * (CH + HDR)
        d.text((PAD, y0 - 26), f"{label}  [{key}]", fill=(150, 220, 255), font=fc)
        cells = []
        p = os.path.join(a.concept_dir, src)
        if os.path.exists(p): cells.append(Image.open(p).convert("RGB"))
        else: cells.append(Image.new("RGB", (CW, CH), (40, 40, 40)))
        p = os.path.join(a.parts_dir, f"{key}_tint.png")
        if os.path.exists(p): cells.append(Image.open(p).convert("RGB"))
        else: cells.append(Image.new("RGB", (CW, CH), (40, 40, 40)))
        p = os.path.join(a.shots_dir, f"{key}_alert.png")
        if os.path.exists(p):
            im = Image.open(p).convert("RGB")
            # in-game shot is 2x DPR; crop to the crab area (left-centre)
            w, h = im.size
            im = im.crop((int(w * 0.10), int(h * 0.12), int(w * 0.74), int(h * 1.0)))
            cells.append(im)
        else: cells.append(Image.new("RGB", (CW, CH), (40, 40, 40)))
        for name in SHOT_TAIL[key]:
            p = os.path.join(a.shots_dir, name)
            if os.path.exists(p):
                im = Image.open(p).convert("RGB")
                w, h = im.size
                im = im.crop((int(w * 0.10), int(h * 0.12), int(w * 0.74), int(h * 1.0)))
                cells.append(im)
            else: cells.append(Image.new("RGB", (CW, CH), (40, 40, 40)))
        for j, im in enumerate(cells):
            bg = Image.new("RGB", (CW, CH), (30, 34, 42))
            t = fit(im, CW - 6, CH - 6)
            bg.paste(t, ((CW - t.width) // 2, (CH - t.height) // 2))
            sheet.paste(bg, (PAD + j * (CW + PAD), y0))
            d.rectangle([PAD + j * (CW + PAD) - 1, y0 - 1, PAD + j * (CW + PAD) + CW, y0 + CH], outline=(70, 80, 96))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sheet.save(a.out)
    print("review sheet ->", a.out, sheet.size)


if __name__ == "__main__":
    main()
