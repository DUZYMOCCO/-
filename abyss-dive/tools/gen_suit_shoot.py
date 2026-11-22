#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_suit_shoot.py — 徒歩射撃の「腕＋銃だけを支点で回せる」ための下地を作る。

入力 : assets/suit_shoot_upper.webp（射撃の上半身。頭・胴・腕・銃が1枚）
出力 : assets/suit_shoot_body.webp（同じ絵から腕＋銃の画素を抜き、肩の下地で埋めたもの）

使い方（実行時）:
  肩下地（body）→ その上に suit_shoot_upper を ARM_POLY で切り抜いて回転して重ねる。
  → 頭・胴は動かさず、腕と銃だけが肩（PIVOT）を支点に自然に下を向く。

同じ ARM_POLY / PIVOT / 切り口を explore.js の SHOOT と一致させること。

再現: cd abyss-dive && python tools/gen_suit_shoot.py
"""
import os
import sys
import hashlib

try:
    from PIL import Image, ImageDraw
except Exception:
    sys.exit("Pillow が必要です: pip install pillow")

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets"))
SRC = os.path.join(ASSETS, "suit_shoot_upper.webp")
OUT = os.path.join(ASSETS, "suit_shoot_body.webp")

# 腕＋銃の切り抜き（suit_shoot_upper.webp の座標。explore.js の SHOOT.armPoly と同一）。
ARM_POLY = [
    (105, 69), (115, 58), (219, 58), (219, 100), (186, 100), (181, 112),
    (171, 124), (153, 135), (137, 134), (114, 122), (114, 105), (106, 96),
]
# 回転の支点＝肩の関節（explore.js の SHOOT.pivotX/pivotY と同一）。
PIVOT = (122, 88)
# 銃口（回転前。explore.js の SHOOT.muzzleX/muzzleY、explore-rules.js の GUN と同一）。
MUZZLE = (218, 80)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def main():
    im = Image.open(SRC).convert("RGBA")
    W, H = im.size
    assert (W, H) == (272, 190), "想定外のサイズ: %r" % ((W, H),)

    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(ARM_POLY, fill=255)
    mp = mask.load()

    body = im.copy()
    bp, src = body.load(), im.load()
    # 腕＋銃の画素を消し、左側の装甲の明るい色で埋める（肩の下地＝パウルドロン）。
    for y in range(H):
        for x in range(W):
            # 元絵の閃光・火の粉は静止下地に残さない。閃光はゲーム側で発射時にだけ描く。
            if x >= MUZZLE[0] or (mp[x, y] and x >= 114):
                bp[x, y] = (0, 0, 0, 0)
                continue
            if mp[x, y] == 0 or src[x, y][3] == 0:
                continue
            col = None
            for dx in range(1, 90):
                xx = x - dx
                if xx < 0:
                    break
                if not mp[xx, y] and src[xx, y][3] > 24 and lum(src[xx, y]) > 105:
                    col = src[xx, y]
                    break
            if col is None:
                col = (150, 140, 120, 255)
            bp[x, y] = col

    body.save(OUT, "WEBP", lossless=True, quality=100, method=6)
    md5 = hashlib.md5(open(OUT, "rb").read()).hexdigest()
    print("wrote", OUT, "md5", md5)
    print("ARM_POLY", ARM_POLY)
    print("PIVOT", PIVOT, "MUZZLE", MUZZLE)


if __name__ == "__main__":
    main()
