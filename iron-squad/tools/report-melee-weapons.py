"""Keep ordinary soldier weapon DPS separate from commander strong skills."""
import json
from pathlib import Path

base = Path(__file__).resolve().parents[1]
directory = base / 'docs/previews/melee-weapons-20261013'
soldiers = {role: json.loads((directory / f'{role}.json').read_text(encoding='utf-8')) for role in ['heavy', 'light']}
skills = json.loads((directory / 'skills.json').read_text(encoding='utf-8'))
bow = json.loads((directory / 'bow-reference.json').read_text(encoding='utf-8'))
reference = soldiers['heavy']
for dataset in [*soldiers.values(), skills, bow]:
    assert dataset['sourceHashes'] == reference['sourceHashes'], 'All comparisons must use the same game source'
assert soldiers['heavy']['harnessHash'] == soldiers['light']['harnessHash']
for dataset in soldiers.values():
    assert dataset['settings']['level'] == 14 and dataset['settings']['tier'] == 9 and dataset['settings']['seeds'] == 8
    assert 'total damage equals actual enemy HP loss' in dataset['checks']
    assert 'knockback collision damage accounted separately' in dataset['checks']
assert 'actual HP loss reconciled with damage accounting' in skills['checks']

styles = {'sword': '剣', 'spear': '槍', 'hammer': 'ハンマー', 'axe': '斧'}
roles = {'heavy': '重装歩兵', 'light': '軽装遊撃兵'}
layouts = {'single': '単体', 'dense5': '密集5体', 'line5': '縦列5体'}
f = lambda value: f'{value:,.1f}'
def row(role, style, layout='single', moving=False):
    return next(r for r in soldiers[role]['results'] if r['weaponStyle'] == style and r['layout'] == layout and r['moving'] == moving)
def skill(style, shape):
    return next(r for r in skills['results'] if r['style'] == style and r['shape'] == shape)
def table(header, records):
    return ['|' + '|'.join(header) + '|', '|' + '|'.join('---' if i == 0 else '---:' for i in range(len(header))) + '|'] + ['|' + '|'.join(map(str, r)) + '|' for r in records]

lines = [
    '# 剣・槍・ハンマー・斧の実効DPSとスキル比較（2026-10-13）', '',
    '**通常兵の単体火力はハンマーが大きく上回る。斧は通常攻撃の形・間隔・吹き飛ばしがハンマーと共通で、武器ATKの倍率は3対7。斧の全周回転スキルは隊長の強撃にあり、普通の斧兵が自動で使う技能ではない。** ゲームのバランスは変更していない。', '',
    '## 武器と技能の実装', '',
]
lines += table(['軸', *styles.values()], [
    ['武器ATK倍率', '1.0', '1.5', '2.45×7＝17.15', '2.45×3＝7.35'],
    ['通常兵の攻撃間隔', '職CT×0.8', '職CT×1.5', '職CT×2.25', '職CT×2.25'],
    ['通常兵の追加威力', '×1', '×1.15', '×1.35', '×1.35'],
    ['通常攻撃の範囲', '追加1体へ35%薙ぎ払い', '直線内の敵に貫通', '追加1体へ35%薙ぎ払い', '追加1体へ35%薙ぎ払い'],
    ['必要筋力 T9', '26', '35', '50', '50'],
])
lines += [
    '', '薙ぎ払いはweaponTraitsを持つ武器で発生。今回の普通兵は特性を全て中立値に揃えた現代の装備として測定。初期支給装備は特性が除かれており、同じ攻撃速度・薙ぎ払い・装備クリティカルになるとは限らない。', '',
    '武器ATK倍率は武器の攻撃力部分に掛かり、本人の基礎攻撃力・他部位の補正は別に加わる。最終DPSが剣の17.15倍になるという意味ではない。ハンマーと斧の大きな倍率は、通常攻撃にも隊長の強撃にも効く。', '',
    '## 普通兵の条件', '',
    '- 通常職HEAVYとLIGHT。Lv14/T9・凡庸/均衡・品質100%/+0・全防具・熟練0・成長なし。各条件8seed、48条件・384回、180秒の継続戦闘。',
    '- Lv10の標準重装は筋力48でT9ハンマー/斧の50を満たさないため、全武器が合法になるLv14へ揃えた。重装は筋力58/HP879/DEF623、軽装は筋力53/HP759/DEF563。武器比較は同じ職種内で行う。',
    '- 敵DEF/魔防100、HPは十分大きくして撃破しない。敵からの攻撃、休息、回復、重装のかばうによる生存への影響は除く。初期位置は距離1.0m。密集/縦列は間隔0.2m。',
    '- 固定配置は毎フレーム敵を元の場所へ戻す。追加の移動試験は敵が0.3m/秒で接近し、吹き飛ばし・衝突・再接近をそのまま処理する。敵HPが十分大きいため、吹き飛ばしの踏ん張り倍率は上限8となる。有限HPの弱い敵を倒す戦闘そのものではない。',
    '- 実際の兵士AI、職CT、適正距離補正、会心、魔法追撃、吹き飛ばし、敵同士の衝突とダメージを通す。個々の測定で実際のHP減少と集計値が一致することを検証。',
    '- 標準素質でもこのレベルでは重装/軽装の魔法追撃条件に入るため、その実装を残し、魔法分と衝突分を別に記録。魔法追撃の再帰を二重には計上しない。', '',
    '## 通常兵の180秒平均DPS（固定配置）', '',
]
lines += table(['職種 / 敵', *styles.values()], [[f'{roles[role]} / {layouts[layout]}', *(f(row(role, style, layout)['dps']) for style in styles)] for role in roles for layout in layouts])
lines += ['', '複数体は全敵への合計。衝突による追加ダメージも含む。', '', '## 敵が接近し、吹き飛ばしが残る場合', '']
lines += table(['職種 / 敵', *styles.values()], [[f'{roles[role]} / {layouts[layout]}', *(f(row(role, style, layout, True)['dps']) for style in styles)] for role in roles for layout in layouts])
lines += ['', '密集が続く硬い敵の集団では、ハンマーと斧の衝突ダメージが大きい。有限HPなら敵が倒れて衝突相手が減るため、上の値を実戦全般のDPSとして扱わない。', '', '## 内訳（軽装遊撃兵・密集5体）', '']
lines += table(['武器 / 配置', '直接物理DPS', '魔法追撃DPS', '衝突DPS', '合計DPS'], [[f'{styles[style]} / {"移動" if moving else "固定"}', f(r['physicalDps']), f(r['magicalDps']), f(r['impactDps']), f(r['dps'])] for moving in [False, True] for style in styles for r in [row('light', style, 'dense5', moving)]])
lines += [
    '', '## 間合いと槍の注意点', '',
    '重装は敵座標へ接近して約6内部単位（0.06m）で止まり、軽装は敵の向こう側へ回り込み目標を更新し続けるため、今回の時間刻みでは約4.5内部単位（0.045m）まで接近する。軽装が0.35mの間合いを維持する測定ではない。', '',
    '槍は先端側で威力/クリティカルが上がり、密着で弱くなる。現在の通常兵AIは近づきすぎているため、単体では槍の長さを活かしにくい。それでも集団への貫通で合計DPSは伸びる。槍の単体倍率だけを強化する前に、間合いを保つAIの試験が有用。', '',
    '## 隊長の強撃：1回あたりのダメージ', '',
    '通常隊長Lv12/T9・筋力78・品質100%/+0・中立特性・各8seed、12条件96回。通常攻撃なしで、実際の強撃と遅延効果だけを処理。兵士のDPS表には加算しない。隊長には今回の魔法追撃はなく、全量物理。', '',
]
lines += table(['配置', *styles.values()], [[label, *(f(skill(style, shape)['meanDamage']) for style in styles)] for label, shape in [('単体・距離0.8m', 'single'), ('周囲0.8mに5体', 'circle5'), ('前方の縦列5体', 'forward5')]] + [['CT 秒', *(f(skill(style, 'single')['cooldown']) for style in styles)]])
lines += [
    '', '剣は周囲への2連撃、槍は前方扇状、ハンマーは単体の重撃と大きな吹き飛ばし/スタン、斧は全周の回転攻撃。前方列でハンマーのダメージが高くなるのは、最も近い1体が適正距離帯に入るためで、複数体への範囲強撃になったわけではない。', '',
    '剣聖の貫通剣波や聖騎士の衝撃波は上位職の技能であり、今回は通常職の武器比較とは別軸として未計測。', '',
    '## 同じLv14/T9の弓候補', '',
    '弓は通常ARCHERで測定。同じレベル/装備段階でも職種・筋力・攻撃速度・AIが異なるため、これは各役割の比較であり、同一個体の武器交換試験ではない。速射0.60秒と筋力積載の候補をメモリ上で適用し、石投げなし・弾切れで隊長へ戻る/近距離のみ副武器迎撃。', '',
]
bow_labels = {'full-field': '満載・補給なし', 'full-camp': '満載・キャンプ補給', 'empty-near': '弾0・近い敵へ副武器', 'empty-far': '弾0・遠い敵から帰還'}
lines += table(['弓候補の状態', '180秒平均DPS', '120〜180秒DPS', '弾切れまで 秒'], [[bow_labels[r['id']], f(r['dps']), f(r['tailDps']), 'なし' if r['ammoEmptyAt'] is None else ('開始時から弾0' if r['config']['initialAmmo'] == 0 else f(r['ammoEmptyAt']))] for r in bow['results']])
lines += ['', '射手の筋力51では141発を持つ。補給なしでは約91秒で使い切り、遠い敵からは帰還して攻撃が止まる。近接で副武器を使える場合は約288DPS。同レベルの軽装兵の剣約1,205DPSと比べると、近接専任の兵ほどの火力はない。弾薬の積載だけでなく再補給までの行動も評価対象となる。']
lines += [
    '', '## 判断', '',
    '通常攻撃の火力ではハンマーが強く、斧は現状では同じ通常攻撃形状・間隔で低い武器ATKになっている。斧の全周スキルを普通兵にも持たせるなら、別の兵士技能として実装/試験が必要。', '',
    '剣は手数と小薙ぎ払い、槍は直線貫通と長さ、ハンマーは大きい一撃と制圧、斧は隊長の回転範囲で差がある。ただし通常兵の槍の間合いと斧の固有技能は、説明上の役割より実装が弱い箇所として検討対象になる。', '',
    '弾切れの射手を重い武器と同じ威力で殴らせると、遠距離性能と持久力の両方を得る。副武器の性能、弾数、再補給への行動を合わせて評価する必要がある。筋力での積載式はユーザー承認済みだが、本番への反映はまだ行っていない。', '',
    '## 計測コードと検証', '',
    '最初の近接試験では、通常攻撃とは別の `knockImpactDamage` 経路のダメージが集計されず、実HP減少との一致検証で停止した。衝突ダメージを独立して数えるよう解析ツールを修正し、全条件を再計測して通過した。ゲーム自体の起動やポート接続の失敗ではない。', '',
    'Nodeで `iron-squad/tools/simulate-melee-weapons.mjs --role HEAVY --seeds 8` と `--role LIGHT`、続けて `simulate-melee-skills.mjs`。弓の比較は `simulate-melee-bow-reference.mjs` のローダー設定を参照。最後に `python iron-squad/tools/report-melee-weapons.py`。入力JSのSHA-256は各試験の開始/終了で不変、全群で同一。実ゲームのバランスやバージョンは変更していない。', '',
    '[重装の全データ](previews/melee-weapons-20261013/heavy.json) / [軽装](previews/melee-weapons-20261013/light.json) / [隊長強撃](previews/melee-weapons-20261013/skills.json) / [弓候補](previews/melee-weapons-20261013/bow-reference.json)。',
]
(base / 'docs/MELEE_WEAPONS_BALANCE.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('Generated MELEE_WEAPONS_BALANCE.md')
