#!/usr/bin/env python3
# v1.0.3 Codex gfx5 の絵を、ゲームで読む小さな webp にする（何度流しても同じ出力）。
#   python tools/import-gfx5.py <codex_results/gfx5 のフォルダ>
# 既にある絵は上書きしない（同じ名前があれば止まる）。表情（7_FACES）は tools/make-portraits.py で入れる。
import sys
from pathlib import Path
from PIL import Image
SRC = Path(sys.argv[1]); A = Path(__file__).resolve().parent.parent / 'assets'
jobs = []  # (src, dst, long_side, quality, mode)
for n in ['ponco_damaged', 'ponco_wreck', 'scavenger_damaged', 'scavenger_wreck', 'alt-flyer_wreck', 'alt-amphi_wreck']:
    jobs.append((f'1_ALLY_WRECK/{n}.png', f'art-v2/{n}.webp', 768, 92, 'RGBA'))
for k in ['plain', 'forest', 'mountain', 'water', 'shallow']:
    jobs.append((f'2_GROUND_TILE/ground-{k}_v2.png', f'art-v2/ground-{k}_v2.webp', 1024, 90, 'RGB'))
jobs.append(('2_GROUND_TILE/oblique/ground-shallow.png', 'art-v2-oblique/ground-shallow.webp', 1024, 90, 'RGB'))
for n in ['repair-tool', 'barrier']:
    jobs.append((f'3_PICKUP_ICON/pickup-{n}.png', f'landmarks/icons/pickup-{n}.webp', 64, 90, 'RGBA'))
for w in ['W1-11', 'W2-04', 'W2-07', 'W3-08']:
    jobs.append((f'3B_WEAPON_EXTRA/{w}.png', f'weapons/{w}.webp', 256, 82, 'RGBA'))
for g in ['G05', 'G06', 'G07', 'G08', 'G09', 'G10', 'G11', 'G12']:
    jobs.append((f'4_GROUND_ENEMY/{g}/{g}.png', f'enemies/{g}.webp', 768, 90, 'RGBA'))
    jobs.append((f'4_GROUND_ENEMY/{g}/{g}_dormant.png', f'enemies/{g}_dormant.webp', 768, 90, 'RGBA'))
jobs.append(('4_GROUND_ENEMY/G10/G10_mine.png', 'enemies/G10_mine.webp', 256, 90, 'RGBA'))
jobs.append(('4_GROUND_ENEMY/alien/alien_dormant.png', 'enemies/alien_dormant.webp', 768, 90, 'RGBA'))
for s in ['', '_damaged', '_wreck']:
    jobs.append((f'5_GIANT_MAP/LASTTITAN_map{s}.png', f'giant/LASTTITAN_map{s}.webp', 768, 90, 'RGBA'))
for p, side in [('rock', 256), ('tank-wreck', 512), ('jelly-plant', 256)]:
    for s in ['', '_damaged', '_destroyed']:
        jobs.append((f'6_MAP_PROPS/{p}/{p}_v1{s}.png', f'props/{p}_v1{s}.webp', side, 84, 'RGBA'))
bad = [d for _, d, *_ in jobs if (A / d).exists() and '--force' not in sys.argv]
if bad: sys.exit('既にある絵（上書きしない）: ' + ', '.join(bad))
total = 0
for s, d, side, q, mode in jobs:
    im = Image.open(SRC / s).convert(mode)
    k = side / max(im.size)
    if k < 1: im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    (A / d).parent.mkdir(parents=True, exist_ok=True)
    im.save(A / d, 'WEBP', quality=q, method=6); total += (A / d).stat().st_size
print(len(jobs), 'files', total, 'bytes')
