# -*- coding: utf-8 -*-
"""武器庫の絵とデータを作る（何度流しても同じ出力になる）。

入力（読むだけ）: refs/weapon-art/png512/*.png、refs/weapon-art/catalog.json、refs/weapons/weapons.json、refs/weapons/weapons.js（SLOTS・SLOT_EXPANDER）
出力: game/bot-commander/assets/weapons/<asset>.webp（長い辺 256px）と armory-data.json（武器の表・枠の数・IT-01）
使い方（armory フォルダで）: python tools_claude/build_armory_assets.py        （絵の変換に1〜2分かかる）
                              python tools_claude/build_armory_assets.py --data-only  （armory-data.json だけ作り直す）
数値は資料のまま写す（丸めない・足さない）。素手（W0-01）は絵がない。
"""
import json, os, re, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REFS = os.path.join(ROOT, 'refs')
OUT = os.path.join(ROOT, 'game', 'bot-commander', 'assets', 'weapons')
LONG_SIDE = 256
# 武器の表から写す列（カードと枠の判定に要る物だけ。値はそのまま）
COLS = ['id', 'name', 'stage', 'type', 'category', 'line', 'tier', 'motion_s', 'pellets', 'range', 'range_key', 'splash',
        'classes', 'attach', 'size', 'special', 'special_text', 'power_req_label', 'slot', 'carry_cost']


def write_text(path, text):
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def slots_from_js():
    js = 'file:///' + os.path.join(REFS, 'weapons', 'weapons.js').replace(os.sep, '/')
    code = "import('%s').then(m=>process.stdout.write(JSON.stringify({SLOTS:m.SLOTS,SLOT_EXPANDER:m.SLOT_EXPANDER})))" % js
    r = subprocess.run(['node', '-e', code], capture_output=True, check=True)
    return json.loads(r.stdout.decode('utf-8'))


# 資料に読み方がない特殊効果の名前（10/25 武器庫の依頼で考えた【仮】）
EXTRA_SPECIAL_NAMES = {'hold_target': 'つきっきり', 'front_only': '前だけ', 'jam': '妨害', 'debuff': '弱体化', 'reach_air': '空にも届く', 'heal_in_combat': '戦闘中も修理', 'self_only': '自分だけ'}


def special_names(rows):
    """特殊効果の key → 読み方。special が1つだけで special_text がある行の、**太字** の見出しをそのまま使う（資料にない key は入れない）"""
    names = {}
    for r in rows:
        if len(r['special']) == 1 and r['special_text']:
            m = re.match(r'\*\*(.+?)\*\*', r['special_text'])
            if m: names.setdefault(r['special'][0], m.group(1))
    for k, v in EXTRA_SPECIAL_NAMES.items(): names.setdefault(k, v)
    return names


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = json.load(open(os.path.join(REFS, 'weapons', 'weapons.json'), encoding='utf-8'))
    catalog = json.load(open(os.path.join(REFS, 'weapon-art', 'catalog.json'), encoding='utf-8'))
    asset_of = {m['id']: m.get('asset') for m in catalog['mapping']}
    assets = sorted({a for a in asset_of.values() if a} | {'IT-01'})
    total = 0
    for a in ([] if '--data-only' in sys.argv else assets):
        src = os.path.join(REFS, 'weapon-art', 'png512', a + '.png')
        im = Image.open(src).convert('RGBA')
        k = LONG_SIDE / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        dst = os.path.join(OUT, a + '.webp')
        im.save(dst, 'WEBP', quality=82, method=6)
        total += os.path.getsize(dst)
    out_rows = []
    for r in rows:
        o = {c: r[c] for c in COLS}
        o['image'] = asset_of.get(r['id'])
        out_rows.append(o)
    data = dict(slots_from_js())
    data['SPECIAL_NAMES'] = special_names(rows)
    data['weapons'] = out_rows
    text = '{\n' + ',\n'.join('  %s: %s' % (json.dumps(k), json.dumps(v, ensure_ascii=False, separators=(',', ':') if k == 'weapons' else (', ', ': '))) for k, v in data.items() if k != 'weapons') + ',\n  "weapons": [\n'
    text += ',\n'.join('    ' + json.dumps(o, ensure_ascii=False, separators=(',', ':')) for o in out_rows) + '\n  ]\n}\n'
    write_text(os.path.join(OUT, 'armory-data.json'), text)
    print('assets', len(assets), 'bytes', total, 'rows', len(out_rows))


if __name__ == '__main__':
    sys.exit(main())
