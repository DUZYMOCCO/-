#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ABYSS DIVE — 公式ビジュアルリファレンスシート生成スクリプト
既存の本番合格済みアセットから docs/art_reference_sheet.webp を生成する。

使い方:
  python abyss-depth-lab/tools/build_art_ref_sheet.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS = os.path.join(ROOT, "assets")
OUT_PATH = os.path.join(ROOT, "docs", "art_reference_sheet.webp")


def load_font(size: int, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\YuGothB.ttc" if bold else r"C:\Windows\Fonts\YuGothM.ttc",
        r"C:\Windows\Fonts\meiryob.ttc" if bold else r"C:\Windows\Fonts\meiryo.ttc",
        r"C:\Windows\Fonts\msgothic.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass
    return ImageFont.load_default()


def crop_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return im
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(im.width, bbox[2] + pad)
    y1 = min(im.height, bbox[3] + pad)
    return im.crop((x0, y0, x1, y1))


def load_sprite(name: str, grid=None) -> Image.Image:
    im = Image.open(os.path.join(ASSETS, name)).convert("RGBA")
    if grid:
        cols, rows, col, row = grid
        fw = im.width // cols
        fh = im.height // rows
        im = im.crop((col * fw, row * fh, (col + 1) * fw, (row + 1) * fh))
    return crop_alpha(im, pad=4)


def fit_paste(canvas: Image.Image, im: Image.Image, box: tuple[int, int, int, int]):
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    scale = min(bw / max(1, im.width), bh / max(1, im.height))
    nw = max(1, int(im.width * scale))
    nh = max(1, int(im.height * scale))
    resized = im.resize((nw, nh), Image.LANCZOS)
    px = x0 + (bw - nw) // 2
    py = y0 + (bh - nh) // 2
    canvas.alpha_composite(resized, (px, py))


def draw_panel(draw: ImageDraw.ImageDraw, rect, fill=(11, 22, 30, 255), outline=(64, 118, 138, 255), r=10):
    draw.rounded_rectangle(rect, radius=r, fill=fill, outline=outline, width=2)


def main():
    W, H = 1600, 1280
    canvas = Image.new("RGBA", (W, H), (5, 13, 19, 255))
    draw = ImageDraw.Draw(canvas)

    f_title = load_font(30, True)
    f_sec = load_font(22, True)
    f_label = load_font(16, True)
    f_sub = load_font(13, False)
    f_tiny = load_font(12, False)

    # Header
    draw.rectangle([0, 0, W, 76], fill=(9, 20, 28, 255))
    draw.line([0, 76, W, 76], fill=(160, 120, 62, 255), width=2)
    draw.text((28, 14), "ABYSS DIVE — 公式ビジュアルリファレンスシート（環境 × 敵 共通合格基準）", fill=(245, 236, 214, 255), font=f_title)
    draw.text((28, 50), "本番統合する敵・パーツ・環境素材は、必ず下段の既存合格アセットと同等の「質感密度・深い影・輪郭線なし厚塗り」を満たすこと", fill=(166, 208, 222, 255), font=f_sub)

    # =====================================================================
    # Section 1: 合格ライン — 既存本番アセット（質感・明暗・エッジの見本）
    # =====================================================================
    s1_y = 94
    draw.text((28, s1_y), "1. 合格ライン見本（実ゲーム暗部背景での質感・陰影・立体感の基準）", fill=(255, 214, 138, 255), font=f_sec)

    ok_items = [
        ("潜水艇 09（基準）", "錆・真鍮リベット・深い下影", load_sprite("submersible-09.webp")),
        ("ヤドカリ戦車（敵基準）", "重なる甲殻段差・強い明暗差", load_sprite("hermit-tank.webp")),
        ("ヤドカリB（v3.8.0）", "濃い暗褐色・鋭い棘とエッジ光", load_sprite("hermit-b-alert.webp")),
        ("イカ砲台（敵基準）", "高彩度暖色＋黄緑発光予兆", load_sprite("squid-gunner.webp")),
        ("チョウチン魚（v3.6.1）", "立体陰影・輪郭線なし・発光灯", load_sprite("fish-angler-swim.webp", (8, 4, 0, 0))),
        ("重装甲ミサイル（v3.5）", "細密金属・ボルト・塗装剥がれ", load_sprite("missile_stout.webp")),
    ]

    card_y0 = s1_y + 34
    card_h = 264
    gap = 14
    card_w = (W - 56 - gap * (len(ok_items) - 1)) // len(ok_items)
    for i, (title, note, sp) in enumerate(ok_items):
        cx0 = 28 + i * (card_w + gap)
        cx1 = cx0 + card_w
        draw_panel(draw, [cx0, card_y0, cx1, card_y0 + card_h], fill=(8, 22, 31, 255), outline=(74, 132, 152, 255))
        # Dark deep-sea stage inside card
        draw.rounded_rectangle([cx0 + 10, card_y0 + 10, cx1 - 10, card_y0 + 196], radius=8, fill=(4, 14, 21, 255))
        fit_paste(canvas, sp, (cx0 + 18, card_y0 + 18, cx1 - 18, card_y0 + 188))
        draw.text((cx0 + 12, card_y0 + 206), title, fill=(238, 248, 252, 255), font=f_label)
        draw.text((cx0 + 12, card_y0 + 232), note, fill=(156, 202, 216, 255), font=f_sub)

    # =====================================================================
    # Section 2: 図地分離 & 5バイオーム別カラー対比
    # =====================================================================
    s2_y = 414
    draw.text((28, s2_y), "2. 図地分離と 5 バイオーム別カラー対比（環境＝低彩度寒色／敵＝一段高いコントラスト＆明確な発光予兆）", fill=(255, 214, 138, 255), font=f_sec)

    biomes = [
        ("sunken_city", "沈没都市の外縁", "mid_ruins_arch.webp", (5, 17, 24), [(32, 62, 74), (178, 86, 68), (190, 255, 110)], "錆・赤茶甲殻＋黄緑発光"),
        ("trench_shelf", "海溝・深棚", "cliff_overhang.webp", (4, 13, 20), [(22, 38, 48), (134, 88, 62), (255, 194, 112)], "黒岩に紛れない明度差＋琥珀"),
        ("narrow_cave", "狭洞窟ルート", "cave_stalactite.webp", (2, 4, 7), [(28, 36, 44), (112, 92, 78), (255, 232, 160)], "静止は岩寄り・予兆だけ鮮明光"),
        ("hydrothermal", "熱水・火山帯", "volcanic_vent.webp", (15, 6, 4), [(26, 20, 18), (196, 86, 36), (138, 238, 255)], "黒耐熱殻＋補色の青白/白熱光"),
        ("confluence_hall", "合流広間・海草林", "hall_giant_kelp.webp", (7, 23, 34), [(24, 78, 92), (116, 152, 108), (255, 238, 120)], "無害クラゲ(青紫)と黄白放電で分離"),
    ]

    b_y0 = s2_y + 34
    b_h = 330
    b_gap = 14
    b_w = (W - 56 - b_gap * 4) // 5
    for i, (bid, bname, asset_name, fog_rgb, swatches, tip) in enumerate(biomes):
        bx0 = 28 + i * (b_w + b_gap)
        bx1 = bx0 + b_w
        draw_panel(draw, [bx0, b_y0, bx1, b_y0 + b_h], fill=(9, 19, 27, 255), outline=(66, 112, 132, 255))
        # Biome background preview box
        draw.rounded_rectangle([bx0 + 10, b_y0 + 10, bx1 - 10, b_y0 + 188], radius=8, fill=fog_rgb + (255,))
        sp_path = os.path.join(ASSETS, asset_name)
        if os.path.exists(sp_path):
            fit_paste(canvas, load_sprite(asset_name), (bx0 + 14, b_y0 + 14, bx1 - 14, b_y0 + 184))
        draw.text((bx0 + 12, b_y0 + 196), f"{bname}", fill=(240, 248, 252, 255), font=f_label)
        draw.text((bx0 + 12, b_y0 + 219), f"ID: {bid} / Fog rgb{fog_rgb}", fill=(142, 184, 198, 255), font=f_tiny)
        # Color swatches: 環境 / 敵主色 / 予兆光
        sw_labels = ["環境", "敵主色", "予兆光"]
        sw_w = (b_w - 36) // 3
        for si, (col, slbl) in enumerate(zip(swatches, sw_labels)):
            sx0 = bx0 + 12 + si * (sw_w + 6)
            draw.rounded_rectangle([sx0, b_y0 + 242, sx0 + sw_w, b_y0 + 272], radius=5, fill=col + (255,), outline=(180, 210, 224, 180))
            draw.text((sx0 + 4, b_y0 + 276), slbl, fill=(176, 208, 220, 255), font=f_tiny)
        draw.text((bx0 + 12, b_y0 + 300), tip, fill=(215, 238, 246, 255), font=f_sub)

    # =====================================================================
    # Section 3: 不合格 NG パターン vs 合格 OK チェックリスト
    # =====================================================================
    s3_y = 800
    draw.text((28, s3_y), "3. 不合格（NG）パターン例と本番統合前チェックリスト（1つでも該当すればリペイント差し戻し）", fill=(255, 166, 138, 255), font=f_sec)

    ng_y0 = s3_y + 36
    ng_h = 416
    ng_w = 270
    ng_gap = 14

    def draw_ng_card(idx, title, line1, line2, sample_fn):
        x0 = 28 + idx * (ng_w + ng_gap)
        x1 = x0 + ng_w
        draw_panel(draw, [x0, ng_y0, x1, ng_y0 + ng_h], fill=(24, 14, 16, 255), outline=(196, 86, 76, 255))
        box = [x0 + 12, ng_y0 + 12, x1 - 12, ng_y0 + 220]
        draw.rounded_rectangle(box, radius=8, fill=(6, 16, 23, 255))
        sample_fn(box)
        # Red NG badge
        draw.rounded_rectangle([x0 + 18, ng_y0 + 18, x0 + 70, ng_y0 + 44], radius=5, fill=(190, 48, 42, 255))
        draw.text((x0 + 28, ng_y0 + 22), "NG", fill=(255, 245, 240, 255), font=f_label)
        draw.text((x0 + 14, ng_y0 + 236), title, fill=(255, 210, 198, 255), font=f_label)
        draw.text((x0 + 14, ng_y0 + 266), line1, fill=(224, 192, 186, 255), font=f_sub)
        draw.text((x0 + 14, ng_y0 + 290), line2, fill=(224, 192, 186, 255), font=f_sub)

    # NG 1: プラスチックパイプ・単色塗り
    def sample_pipe(box):
        cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
        draw.rounded_rectangle([box[0] + 24, cy - 22, box[2] - 24, cy + 22], radius=16, fill=(104, 114, 122, 255))
        draw.rectangle([cx - 6, cy - 22, cx + 6, cy + 22], fill=(64, 72, 78, 255))

    # NG 2: 低コントラスト・淡い水色ぼやけ
    def sample_pale(box):
        cy = (box[1] + box[3]) // 2
        draw.rounded_rectangle([box[0] + 24, cy - 24, box[2] - 24, cy + 24], radius=18, fill=(142, 178, 188, 255))
        for k in range(8):
            ox = box[0] + 38 + k * 22
            draw.ellipse([ox, cy - 12, ox + 14, cy + 4], fill=(162, 192, 200, 255))

    # NG 3: 黒いアニメ輪郭線
    def sample_outline(box):
        cy = (box[1] + box[3]) // 2
        draw.rounded_rectangle([box[0] + 24, cy - 24, box[2] - 24, cy + 24], radius=14, fill=(170, 96, 72, 255), outline=(0, 0, 0, 255), width=6)

    # NG 4: 白・緑フリンジ残り
    def sample_fringe(box):
        cy = (box[1] + box[3]) // 2
        draw.rounded_rectangle([box[0] + 24, cy - 24, box[2] - 24, cy + 24], radius=14, fill=(92, 62, 48, 255), outline=(90, 255, 110, 255), width=4)

    draw_ng_card(0, "NG 1: 単色パイプ・仮絵直出し", "・コード描画の円柱やベタ塗り", "・段差/傷/フジツボ等の密度なし", sample_pipe)
    draw_ng_card(1, "NG 2: 低コントラスト淡色", "・水色/薄灰でのっぺり見える", "・深い影と硬いハイライト不足", sample_pale)
    draw_ng_card(2, "NG 3: 黒いアニメ輪郭線", "・太い黒線で囲うと深海で浮く", "・輪郭は陰影とエッジ光で作る", sample_outline)
    draw_ng_card(3, "NG 4: 白・緑フリンジ残り", "・透過抜き後の縁に背景色残留", "・暗い海背景上で必ず縁を確認", sample_fringe)

    # OK Checklist card on the right
    ck_x0 = 28 + 4 * (ng_w + ng_gap)
    ck_x1 = W - 28
    draw_panel(draw, [ck_x0, ng_y0, ck_x1, ng_y0 + ng_h], fill=(10, 28, 24, 255), outline=(96, 206, 152, 255))
    draw.rounded_rectangle([ck_x0 + 16, ng_y0 + 16, ck_x0 + 116, ng_y0 + 44], radius=5, fill=(44, 150, 98, 255))
    draw.text((ck_x0 + 26, ng_y0 + 20), "OK 基準", fill=(242, 255, 248, 255), font=f_label)
    draw.text((ck_x0 + 18, ng_y0 + 58), "本番統合前の 5 項目チェック", fill=(184, 246, 212, 255), font=f_label)

    checks = [
        "1. 必ず tools/comfy_gen.py 等で",
        "   高密度ペイント仕上げ済みか",
        "2. 仮絵の関節・当たり判定と",
        "   輪郭ズレが 1〜2px 以内か",
        "3. ヤドカリB・潜水艇09と同縮尺で",
        "   並べて質感密度が見劣りしないか",
        "4. 黒に近い深い影＋硬いエッジ光＋",
        "   殻板の段差・凹凸が読めるか",
        "5. 暗い海背景上で白/緑フリンジ・",
        "   黒輪郭線が出ていないか",
    ]
    cy = ng_y0 + 96
    for line in checks:
        col = (232, 248, 240, 255) if line[0].isdigit() else (172, 218, 198, 255)
        draw.text((ck_x0 + 18, cy), line, fill=col, font=f_sub)
        cy += 29

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    canvas.save(OUT_PATH, format="WEBP", quality=92, method=6)
    print(f"Saved visual reference sheet -> {OUT_PATH} ({W}x{H})")


if __name__ == "__main__":
    main()
