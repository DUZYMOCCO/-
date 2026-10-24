#!/usr/bin/env python3
# Codex の建物跡・木の絵（1024px / 512px の PNG）を、ゲーム用に小さくして assets/landmarks/ へ入れる。
# 何度でも流し直せる（Codex が絵を差し替えたら、もう一度コピーしてこれを流すだけ）。
#   python3 tools/import-landmarks.py [元フォルダ（既定 /workspace/codex_landmarks/out）] [状態別フォルダ（既定 /workspace/codex_landmarks/states）]
# 出力: assets/landmarks/<id>.webp, <id>_damaged.webp, <id>_destroyed.webp,
#       assets/landmarks/icons/pickup-*.webp と assets/landmarks/landmarks.json（足元の位置・大きさ）
# 傷んだ・壊れた絵は元の絵と同じキャンバス（同じ位置合わせ）なので、元の足元の点をそのまま使う。
#   それぞれ余白を切るので anchor / worldW は絵ごとに書く（ゲームは同じ x,y に置くだけで重なる）。
# additional-landmarks/ はまだ使い道が決まっていないので入れない。
# ファイル名は固定なので、sw-assets.js の一覧は変えなくてよい（版 version だけ上げる）。
import json, sys
from pathlib import Path
from PIL import Image

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else '/workspace/codex_landmarks/out')
STATES = Path(sys.argv[2] if len(sys.argv) > 2 else '/workspace/codex_landmarks/states')
OUT = Path(__file__).resolve().parent.parent / 'assets' / 'landmarks'
# id: 長い辺の最大 px（出荷する大きさ）, ゲーム内で元の絵（正方形の枠ぜんぶ）を何ワールド px で描くか
IDS = {
    'town-ruins_v1': (512, 300), 'town-ruins_v2': (512, 300),
    'housing-remains_v1': (512, 320), 'housing-remains_v2': (512, 320),
    'highrise-remains_v1': (512, 350), 'highrise-remains_v2': (512, 350),
    'tree-leafy_v1': (256, 190), 'tree-sparse_v1': (256, 190), 'tree-dead_v1': (256, 175),
}
STATE_NAMES = ('damaged', 'destroyed')
ICONS = ('repair-kit', 'gun', 'cannon', 'blade', 'grenade')
ICON_PX = 64
PAD = 4

def export(png, name, maxpx, display, anchor_src):
    im = Image.open(png).convert('RGBA'); im.load()
    S = im.width
    l, t, r, b = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    l, t, r, b = max(0, l - PAD), max(0, t - PAD), min(S, r + PAD), min(S, b + PAD)
    crop = im.crop((l, t, r, b))
    k = min(1.0, maxpx / max(crop.size))
    w, h = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    crop.resize((w, h), Image.LANCZOS).save(OUT / f'{name}.webp', 'WEBP', quality=84, method=6)
    ax, ay = anchor_src if anchor_src else (S / 2, S * 0.92)
    m = {
        'file': f'{name}.webp', 'w': w, 'h': h,
        'anchor': [round((ax - l) / (r - l), 4), round((ay - t) / (b - t), 4)],  # 足元（0..1。枠の外になることもある）
        'worldW': round(display * (r - l) / S, 1),  # ゲーム内の幅（ワールド px）
    }
    print(f'{name}: {S}px -> crop {r-l}x{b-t} -> {w}x{h}, worldW {m["worldW"]}, anchor {m["anchor"]}')
    return m

def main():
    meta_src = {}
    aj = SRC / 'assets.json'
    if aj.exists():
        for a in json.loads(aj.read_text(encoding='utf-8')).get('landmarksAndTrees', []): meta_src[a['id']] = a
    OUT.mkdir(parents=True, exist_ok=True)
    out = {}
    for id_, (maxpx, display) in IDS.items():
        anc = meta_src.get(id_, {}).get('suggestedVisualAnchor')
        m = export(SRC / f'{id_}.png', id_, maxpx, display, anc)
        states = {}
        for st in STATE_NAMES:
            p = STATES / f'{id_}_{st}.png'
            if p.exists(): states[st] = export(p, f'{id_}_{st}', maxpx, display, anc)
            else: print(f'  (なし) {p}')
        if states: m['states'] = states
        out[id_] = m
    icons = {}
    (OUT / 'icons').mkdir(exist_ok=True)
    for n in ICONS:
        p = STATES / 'icons' / f'pickup-{n}.png'
        if not p.exists(): print(f'  (なし) {p}'); continue
        im = Image.open(p).convert('RGBA').resize((ICON_PX, ICON_PX), Image.LANCZOS)
        im.save(OUT / 'icons' / f'pickup-{n}.webp', 'WEBP', quality=90, method=6)
        icons[n] = {'file': f'icons/pickup-{n}.webp', 'w': ICON_PX, 'h': ICON_PX}
        print(f'icon pickup-{n}: -> {ICON_PX}px')
    if icons: out['_icons'] = icons  # 「_」で始まるキーは遮蔽物ではない（落とし物の絵）
    (OUT / 'landmarks.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')

if __name__ == '__main__': main()
