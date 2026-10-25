# v0.4.8-dev（10/24）地面の境界の絵（Claude 作 edges2、Python で生成済み）を assets/ へ取り込む。
#   <SRC>/<上>_on_<下>/*.png        → assets/ground-edges/<上>_on_<下>/（12枚ずつ、10組）
#   <SRC>/mix3/<上>-<下>/*.png      → assets/ground-edges/mix3/<上>-<下>/（8枚ずつ、3組）
#   mix3 の「上の地形が覆う所」のアルファ → assets/ground-edges/mix3/<上>-<下>/mask/<名前>.png（RGB=0, A=覆う量）
#     ゲームは、下の地形の地面を mix3 のアルファで、上の地形の地面をこの mask で切り抜いて重ねる（隣のマスと模様が続く）。
#     mask は Claude の生成スクリプト（<SRC>/_tools/edges2lib.py の render_mix3 と同じ計算）で作り直す。mix3 の絵と1画素も違わないことを確かめてから書く。
#   <SRC>/ground-shallow.webp       → assets/art-v2/ground-shallow.webp（浅瀬の地面。元は無劣化 1.3MB なので品質92で入れ直す）
# 使い方（ゲームフォルダで）: python3 tools/make-ground-edges.py [SRC（既定 /workspace/new-game-rts/claude_results/edges2）] [REFS（既定 /workspace/new-game-rts/edges2_pkg/refs）]
# 要るもの: Pillow, numpy, scipy
import sys, os, shutil
from pathlib import Path
import numpy as np
from PIL import Image
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/new-game-rts/claude_results/edges2')
REFS = Path(sys.argv[2] if len(sys.argv) > 2 else '/workspace/new-game-rts/edges2_pkg/refs')
OUT = Path('assets/ground-edges')
ORDER = ['plain', 'shallow', 'water', 'mountain', 'forest']
NAMES = ['edge_top', 'edge_bottom', 'edge_left', 'edge_right', 'corner_out_tl', 'corner_out_tr', 'corner_out_bl', 'corner_out_br', 'corner_in_tl', 'corner_in_tr', 'corner_in_bl', 'corner_in_br']
sys.path.insert(0, str(SRC / '_tools'))
import edges2lib as L  # noqa: E402
L.ROOT, L.REFS, L.OUT = SRC.parent, REFS, SRC
L.clear_cache()

def check_rgba(p):
    im = Image.open(p)
    assert im.size == (128, 128) and im.mode == 'RGBA', (p, im.size, im.mode)

n = 0
for i, lo in enumerate(ORDER):
    for hi in ORDER[i + 1:]:
        d = f'{hi}_on_{lo}'
        (OUT / d).mkdir(parents=True, exist_ok=True)
        for name in NAMES:
            check_rgba(SRC / d / f'{name}.png'); shutil.copyfile(SRC / d / f'{name}.png', OUT / d / f'{name}.png'); n += 1
for O, U in L.MIX3_PAIRS:
    d = OUT / 'mix3' / f'{O}-{U}'
    (d / 'mask').mkdir(parents=True, exist_ok=True)
    for c in ['tl', 'tr', 'bl', 'br']:
        for o_side in L.CORNER_SIDES[c]:
            name = L.mix3_name(c, o_side, O, U)
            src = SRC / 'mix3' / f'{O}-{U}' / f'{name}.png'
            check_rgba(src)
            C, A = L.render_mix3(O, U, c, o_side)
            assert np.array_equal(L.to_rgba(C, A), np.asarray(Image.open(src))), f'mix3 を作り直せない: {name}'
            # 上の地形が覆う量（render_mix3 の aO と同じ）
            s1, s2 = L.CORNER_SIDES[c]
            dO = L.SIDE_D[o_side]
            aO = L.alpha_from(dO, L.perturb(dO, O, L.seed_of('mix3', O, U, c, o_side)), O)
            m = np.zeros((128, 128, 4), np.uint8); m[..., 3] = np.clip(np.round(aO * 255), 0, 255)
            Image.fromarray(m, 'RGBA').save(d / 'mask' / f'{name}.png', optimize=True)
            shutil.copyfile(src, d / f'{name}.png'); n += 2
Image.open(SRC / 'ground-shallow.webp').convert('RGB').save('assets/art-v2/ground-shallow.webp', 'WEBP', quality=92, method=6); n += 1
print('files', n)
