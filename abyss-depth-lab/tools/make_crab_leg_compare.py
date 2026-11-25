"""ABYSS DIVE — 巨蟹の前脚（Blender 焼き）と、公開中 v3.8.0 の敵アートとの比較シート。

上段: 実ゲームと同じ縮尺（論理px）で並べる（1 シートpx = 1 論理px）。
下段: 同じ縮尺で拡大し、造形と材質を較べる（1 シートpx = 3 論理px）。
公開中の敵素材は origin/main（v3.8.0）から読み出したもの（本ツリーは変更しない）。
使い方: python tools/make_crab_leg_compare.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent.parent
ASSETS = HERE / 'assets'
PUB = Path(r'C:/Users/Yoshiyuki/AppData/Local/hermes/profiles/backup2/cache/scratch/pub380')
OUT = HERE / 'docs' / 'previews'
FONT = 'C:/Windows/Fonts/YuGothM.ttc'
FONTB = 'C:/Windows/Fonts/YuGothB.ttc'
W = 1600
BG = (12, 16, 21, 255)
INK = (234, 240, 246, 255)
SUB = (150, 165, 180, 255)


def font(sz, bold=False):
    return ImageFont.truetype(FONTB if bold else FONT, sz)


img = Image.new('RGBA', (W, 1500), BG)
d = ImageDraw.Draw(img)
d.text((26, 16), 'ABYSS DIVE — 巨蟹の前脚（Blender 4.5/Cycles 焼き）と公開中 v3.8.0 の敵アートの比較',
       font=font(27, True), fill=INK)
d.text((26, 52), '公開中の敵は Blender のパーツ別レンダ（150box を 768px で焼いたもの）。'
                 '同じ縮尺・同じ照明基準（左上キー＋寒色アンビエント、輪郭線なし）で並べる。',
       font=font(15), fill=SUB)
y = 92


def section(title):
    global y
    d.text((26, y), title, font=font(19, True), fill=INK)
    y += 34


def caption(x, yy, t, sub=True):
    d.text((x, yy), t, font=font(14 if sub else 16, not sub), fill=SUB if sub else INK)


# ---- 上段: 実ゲームと同じ縮尺（1 sheet px = 1 論理px）----
section('① 実ゲームと同じ縮尺（左から: 巨蟹の殻 / 巨蟹の前脚3パーツ / ヤドカリB / 煤冠イソギンチャク）')
SC1 = 0.55     # 上段は殻(1040)+脚(692)+ヤドカリB(150)+イソギンチャク(200) が 1600 に収まる縮尺
floor = y + 150
cx = 30


def place(path, logical_h=None, logical_w=None, label='', sub='', y_mid=None):
    global cx
    im = Image.open(path).convert('RGBA')
    if logical_w:
        w = round(logical_w * SC1)
    else:
        w = round(im.width * (logical_h * SC1) / im.height)
    h = max(1, round(im.height * w / im.width))
    ym = floor if y_mid is None else y_mid
    img.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (cx, ym - h // 2))
    if label:
        d.text((cx, floor + 160), label, font=font(15, True), fill=INK)
        d.text((cx, floor + 182), sub, font=font(13), fill=SUB)
    cx += w + 34


place(ASSETS / 'geo-crab-shell.webp', logical_w=1040, label='巨蟹の殻', sub='1040 論理px')
# 前脚3パーツを実ゲームと同じ縮尺で横並びに
leg_x0 = cx
for n, lw in (('merus', 300), ('fore', 320), ('claw', 72)):
    p = ASSETS / f'crab-leg-{n}.webp'
    im = Image.open(p).convert('RGBA')
    w = round(lw * SC1)
    h = max(1, round(im.height * w / im.width))
    img.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (cx, floor - h // 2))
    cx += w + 12
d.text((leg_x0, floor + 160), '巨蟹の前脚（3パーツ）', font=font(15, True), fill=INK)
d.text((leg_x0, floor + 182), '上腕300 / 前腕320 / 爪 論理px', font=font(13), fill=SUB)
cx += 22
place(PUB / 'hermit-b-part-shell.webp', logical_h=150, label='ヤドカリB（公開 v3.8.0）', sub='150 論理px 箱')
place(PUB / 'anemone-cinder-open.webp', logical_h=150, label='煤冠イソギンチャク（公開）', sub='高さ 150 論理px')
y = floor + 160 + 46
d.line([(30, y), (30 + 300, y)], fill=(120, 200, 210, 255), width=3)
d.text((30, y + 8), '300 論理px（前脚の上腕と同じ長さ）', font=font(13), fill=(150, 220, 225, 255))
y += 56

# ---- 下段: 同じ縮尺で拡大（1 sheet px = 3 論理px）----
section('② 同じ縮尺で拡大（上段と同じ 3 倍）— 造形と材質の比較')
SC2 = 3.0
y2 = y
left_x = 30
right_x = 820


def draw_zoom(path, logical_w_full, label, sub, col, crop_frac=(0.0, 1.0)):
    """crop_frac: 画像の横方向のうち見せる範囲（0..1）"""
    global y2
    im = Image.open(path).convert('RGBA')
    x0 = round(crop_frac[0] * im.width)
    x1 = round(crop_frac[1] * im.width)
    lpp = logical_w_full / im.width          # 論理px / 画像px
    im = im.crop((x0, 0, x1, im.height))
    w = round(im.width * lpp * SC2)          # 上段と同じ論理px スケールの 3 倍
    h = max(1, round(im.height * w / im.width))
    px = left_x if col == 0 else right_x
    img.alpha_composite(im.resize((w, h), Image.Resampling.LANCZOS), (px, y2))
    caption(px, y2 + h + 6, label, sub=False)
    if sub:
        caption(px, y2 + h + 26, sub)
    return h


h_my = draw_zoom(ASSETS / 'crab-leg-merus.webp', 322.8, '巨蟹の上腕（本試作・Blender 焼き）',
                 '殻板の重なり／隆起／孔／付着物／摩耗', 0, (0.28, 0.60))
h_pub = draw_zoom(PUB / 'hermit-b-part-legs.webp', 119.9, 'ヤドカリB の脚（公開 v3.8.0）',
                  '重なった殻板／球の関節／棘／まだらな材質', 1, (0.02, 0.52))
y2 += max(h_my, h_pub) + 56
h2 = draw_zoom(ASSETS / 'crab-leg-claw.webp', 72.0, '巨蟹の爪（本試作）', '関節ピボットは手首', 0, (0.10, 0.95))
h3 = draw_zoom(PUB / 'hermit-b-part-clawL.webp', 52.5, 'ヤドカリB の爪（公開 v3.8.0）', '', 1, (0.05, 0.90))
y2 += max(h2, h3) + 60

OUT.mkdir(parents=True, exist_ok=True)
out = OUT / 'geo-crab-leg-vs-published.png'
img.crop((0, 0, W, min(img.height, y2 + 40))).convert('RGB').save(out, quality=92)
print('saved', out, Image.open(out).size)
