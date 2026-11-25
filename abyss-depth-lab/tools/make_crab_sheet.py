"""ABYSS DIVE — 地層背負いの巨蟹（仮）: 同定規のレビューシート（1枚）。

実画面（等倍）・未照明の擬態・現行の魚/艇/戦車との同一縮尺・材質の拡大・
脚の同条件の旧新比較・予告→一振りの連続画像・撃破、をまとめる。
1 論理px = 0.9 シートpx。
使い方: python tools/make_crab_sheet.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / 'assets'
SCRATCH = Path(r'C:/Users/Yoshiyuki/AppData/Local/hermes/profiles/backup2/cache/scratch')
OUT = HERE / 'docs' / 'previews'
S = 0.9
FONT = 'C:/Windows/Fonts/YuGothM.ttc'
FONTB = 'C:/Windows/Fonts/YuGothB.ttc'
W = 1600
BG = (10, 13, 19, 255)
INK = (234, 240, 246, 255)
SUB = (152, 167, 182, 255)


def font(sz, bold=False):
    return ImageFont.truetype(FONTB if bold else FONT, sz)


def load(name):
    p = SCRATCH / name
    return Image.open(p).convert('RGBA') if p.exists() else None


def fit(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.Resampling.LANCZOS)


img = Image.new('RGBA', (W, 3600), BG)
d = ImageDraw.Draw(img)
d.text((28, 18), 'ABYSS DIVE — 地層背負いの巨蟹（仮）／同定規レビューシート', font=font(30, True), fill=INK)
d.text((28, 58), '合流広間の実画面（等倍）・未照明＝岩の擬態・現行の魚/艇/戦車との同一縮尺・材質の拡大・'
                 '脚の同条件の旧新比較・予告→一振り・撃破。  1論理px = 0.9シートpx。', font=font(16), fill=SUB)
y = 100


def panel(title, big=19):
    global y
    d.text((28, y), title, font=font(big, True), fill=INK)
    y += 34


def caption(x, yy, text, sub=True):
    d.text((x, yy), text, font=font(15 if sub else 16, not sub), fill=SUB if sub else INK)


# ---- ① 実画面（等倍）と未照明の擬態 ----
panel('① 合流広間の実画面（等倍 764×429）と、照明が外れたときの擬態')
hall = load('crab3d_1to1.png')
unlit = load('crab3d_unlit.png')
if unlit:
    # 検証シーンに別ボスが湧くので、HUD の帯（上バナー・下ボスバー）を外して擬態だけ見せる
    unlit = unlit.crop((0, 78, unlit.width, min(unlit.height, 340)))
row_h = 0
if hall:
    himg = fit(hall, 980)
    img.alpha_composite(himg, (28, y))
    caption(28, y + himg.height + 6, '①-a 等倍の実画面（殻は灯りの当たる面だけ質感が出る。全身発光なし）')
    row_h = max(row_h, himg.height + 30)
if unlit:
    uimg = fit(unlit, 520)
    img.alpha_composite(uimg, (1040, y))
    caption(1040, y + uimg.height + 6, '①-b 灯りを外すと「ただの岩」。輪郭の線も発光も足していない。')
    row_h = max(row_h, uimg.height + 30)
y += row_h + 22

# ---- ② 同一縮尺の並び ----
panel('② 同一縮尺の並び（巨蟹の殻 / 潜水艇09 / アングラー1コマ / 休眠ヤドカリ戦車）')
floor = y + 200
cx = 40


def place(rel_path, logical_w, label, sub, crop=None):
    global cx
    im = Image.open(ASSETS / rel_path).convert('RGBA')
    if crop:
        im = im.crop(crop)
    w = round(logical_w * S)
    h = max(1, round(im.height * w / im.width))
    img.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (cx, floor - h // 2))
    d.text((cx, floor + 205), label, font=font(17, True), fill=INK)
    d.text((cx, floor + 228), sub, font=font(14), fill=SUB)
    cx += w + 48


place('geo-crab-shell.webp', 1040, '地層背負いの巨蟹（殻）', '1040px・艇の約 6.9 倍')
place('submersible-09.webp', 142, '潜水艇09', '142px')
# アトラス全体ではなく 1 コマ（8 コマ × 4 顎行の先頭セル 368x304）
place('fish-angler-swim.webp', 184, 'アングラー', '184px・魚の枠（1 コマ）', crop=(0, 0, 368, 304))
place('hermit-tank-dormant.webp', 150, 'ヤドカリ戦車（休眠）', '150px')
y = floor + 205 + 50
d.line([(40, y), (40 + round(500 * S), y)], fill=(120, 200, 210, 255), width=3)
d.text((40, y + 8), '500 論理px（艇の約 3.5 倍）', font=font(14), fill=(150, 220, 225, 255))
d.line([(40, y + 44), (40 + round(1000 * S), y + 44)], fill=(120, 200, 210, 255), width=3)
d.text((40 + round(1000 * S) + 12, y + 36), '1000 論理px（巨蟹の殻の幅）', font=font(14), fill=(150, 220, 225, 255))
y += 86

# ---- ③ 材質と脚の拡大 ----
panel('③ 材質と脚（拡大）。殻はマット、艶は関節の濡れた膜と爪先だけ')
zoom = load('crab3d_leg_crop.png')
leg4x = load('leg3d_merus.png')
row2 = 0
if zoom:
    zimg = fit(zoom, 700)
    img.alpha_composite(zimg, (28, y))
    caption(28, y + zimg.height + 6, '③-a 実画面の脚（4×）。Blender 焼きの3パーツを関節ピボットで回して置いている')
    row2 = max(row2, zimg.height + 30)
if leg4x:
    limg = fit(leg4x, 560)
    img.alpha_composite(limg, (760, y))
    caption(760, y + limg.height + 6, '③-b 焼いた素材（上腕。Blender 4.5/Cycles・実体メッシュ）')
    row2 = max(row2, limg.height + 30)
y += row2 + 22

# ---- ④ 脚の旧新（同条件） ----
panel('④ 脚の旧新比較（まったく同じ瞬間・同じ構図・同じ倍率）: 旧=Canvas 図形 / 新=Blender 焼き')
old_t = load('crab_telegraph_old.png')
new_t = load('crab3d_telegraph_same.png')
row3 = 0
if old_t:
    oimg = fit(old_t, 740)
    img.alpha_composite(oimg, (28, y))
    caption(28, y + oimg.height + 6, '④-a 旧: Canvas 図形（ベタ塗り・一定幅）')
    row3 = max(row3, oimg.height + 30)
if new_t:
    nimg = fit(new_t, 740)
    img.alpha_composite(nimg, (800, y))
    caption(800, y + nimg.height + 6, '④-b 新: Blender 焼きの実体メッシュ（面の向きで陰影が出る）')
    row3 = max(row3, nimg.height + 30)
y += row3 + 22

# ---- ⑤ 予告→一振りの連続画像 ----
panel('⑤ 予告（前脚を上げる＝生物と分かる）→一振り、の連続画像')
seq = [load(f'crabanim_{i:02d}.png') for i in (0, 1, 2, 3, 5, 8)]
labels = ['wind', 'wind', 'swing', 'swing', 'recover', 'alert']
row4 = 0
xs = 28
for im2, lab in zip(seq, labels):
    if not im2:
        continue
    f2 = fit(im2, 248)
    img.alpha_composite(f2, (xs, y))
    d.text((xs, y + f2.height + 5), lab, font=font(13), fill=SUB)
    row4 = max(row4, f2.height + 26)
    xs += f2.width + 8
y += row4 + 22

# ---- ⑥ 撃破 ----
panel('⑥ 撃破（脚が弛んで崩れる。倒さなくても上・後ろを通過できる）')
dea = load('crab3d_defeat.png')
if dea:
    dimg = fit(dea, 740)
    img.alpha_composite(dimg, (28, y))
    caption(28, y + dimg.height + 6, '⑥ 撃破の瞬間（1遭遇の報酬は一度だけ）')
    y += dimg.height + 30

OUT.mkdir(parents=True, exist_ok=True)
out = OUT / 'geo-crab-identity-sheet.png'
img.crop((0, 0, W, min(img.height, y + 40))).convert('RGB').save(out, quality=92)
print('saved', out, Image.open(out).size)
