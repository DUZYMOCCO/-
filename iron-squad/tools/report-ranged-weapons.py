"""Build a comparison report from completed, independently checked simulations."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

base = Path(__file__).resolve().parents[1]
data_dir = base / 'docs/previews/ranged-weapons-balance-20261013'
datasets = {stage: json.loads((data_dir / f'{stage}.json').read_text(encoding='utf-8')) for stage in ['early', 'middle', 'late']}
root = base.parent
for stage, data in datasets.items():
    assert data['accountingVersion'] == 2, 'Only corrected damage accounting is publishable'
    assert data['settings']['seeds'] == (24 if stage == 'middle' else 12)
    assert 'total damage equals actual enemy HP loss' in data['checks']
    assert data['sourceHashes'] == datasets['middle']['sourceHashes'], 'All stages must use the same game source'
    assert 'source hash stability' in data['checks']

# Another session may update the game after these completed measurements.
# Verify any changed source against the recorded release's Git snapshot,
# rather than silently presenting the results as measurements of newer code.
snapshot_commit = 'bff6467'
changed_sources = []
for name, digest in datasets['middle']['sourceHashes'].items():
    if hashlib.sha256((root / name).read_bytes()).hexdigest() == digest:
        continue
    blob = subprocess.run(['git', 'show', f'{snapshot_commit}:{name}'], cwd=root, capture_output=True, check=True).stdout
    lf = blob.replace(b'\r\n', b'\n')
    assert any(hashlib.sha256(candidate).hexdigest() == digest for candidate in [blob, lf, lf.replace(b'\n', b'\r\n')]), f'Unverified recorded snapshot: {name}'
    changed_sources.append(name)
current_manifest = (base / 'sw-assets.js').read_text(encoding='utf-8')
current_version = re.search(r"gameVersion:\s*'([^']+)'", current_manifest).group(1)

main = datasets['middle']
styles = {'bow': '弓', 'crossbow': 'クロスボウ', 'cannon': '火砲'}
stages = {'early': 'Lv1/T1', 'middle': 'Lv10/T9', 'late': 'Lv30/T21'}
f = lambda x: f'{x:,.1f}'
def row(stage, style, targets=1, supply='none', moving=False, growth=False):
    return next(x for x in datasets[stage]['results'] if x['weaponStyle'] == style and x['targets'] == targets and x['supply'] == supply and x['anchorTargets'] == (not moving) and x.get('liveGrowth', False) == growth)
def table(header, records):
    return ['|' + '|'.join(header) + '|', '|' + '|'.join('---' if i == 0 else '---:' for i in range(len(header))) + '|'] + ['|' + '|'.join(map(str, record)) + '|' for record in records]

lines = [
    f"# 弓・クロスボウ・火砲の実効DPS比較（{main['version']} / {main['cache']}）",
    '',
    '**通常弓兵の比較では、火砲は密集処理だけでなく単体の180秒平均DPSも高い。クロスボウは弓より単体火力が少し高い。弾切れ後は火砲の砲弾2倍・範囲攻撃を失い、クロスボウと近いDPSまで落ちる。** バランスの数値は変更していない。',
    '',
    '## 条件',
    '',
    '- 画面描画を省いた実ゲームの実行。実際の兵士AI、弾生成、飛翔・着弾、会心、防御計算、弾薬、範囲攻撃、ノックバックを通す。図式だけのDPS計算ではない。',
    '- 同じ通常職ARCHER、凡庸/均衡、全防具、品質100%、強化+0、熟練度0。武器だけを交換し、全品が必要筋力を満たす。Lv10/T9は24seed、Lv1/T1とLv30/T21は各12seed。',
    '- 180秒の連続戦闘。HP/弾薬/利用可能なMPは開始時満タン。DPS主比較では成長・撃破・休息・回復・敵の攻撃を止める。標的のDEF/魔防は100、HPは十分大きくして死亡させない。',
    '- 固定標的は毎フレーム元の場所へ戻す。押し出しによる位置の差を取り除いて火力を比較する。単体は距離1.5m、5体は全員が砲弾の範囲に入る密集配置。弾切れ後の石投げも含める。',
    '- 別に、実際に接近する5体/単体（0.3m/秒、攻撃なし）の試験を各8seed実施。こちらは押し戻し・密集の崩れ・射程外・照準からの移動をそのまま残す。生存率の試験ではなく、移動で変わる実効火力の試験。',
    '- 補給ありはキャンプの既存の弾薬/MP満タン処理。消費速度が違っても全武器に同じ条件を与える。',
    '- 物理被弾耐久の追加試験は平均生ダメージ300/秒、0.5秒ごと、威力±20%、各24seed。敵を射撃して減らす効果や押し戻しで攻撃を止める効果は含めない。',
    '- 発射・装填弾・石投げのダメージ内訳を記録し、集計値が実際に減った標的HPと一致することを毎試験で検証。実行前後の全ゲームJS/アセット一覧のSHA-256も確認する。',
    '',
    '## 中盤の主比較（固定標的・180秒平均）',
    '',
]
if changed_sources:
    lines[6:6] = [
        f'計測版は **v{main["version"]} / {main["cache"]}**。各試験中のソース不変を確認済み。計測後に作業ツリーがv{current_version}へ進んだため、変わった{len(changed_sources)}ファイルは記録済みハッシュとGit `{snapshot_commit}` の内容を照合した。v6.5.2との差分は結界の全吸収時の処理・結界描画・HP欄のMP/弾薬表示とキャッシュ参照の更新で、今回の通常鎧・結界なしの武器比較に影響する攻撃倍率、発射間隔、弾薬容量の変更はない。測定値自体はv6.5.1の記録として扱う。',
        '',
    ]
lines += table(['条件', *styles.values()], [
    [label, *(f(row('middle', style, targets, supply)['dps']) for style in styles)]
    for label, targets, supply in [('単体・補給なし', 1, 'none'), ('密集5体・補給なし', 5, 'none'), ('単体・補給あり', 1, 'camp'), ('密集5体・補給あり', 5, 'camp')]
])
lines += ['', '密集5体の欄は5体に与えた合計ダメージ。火砲以外は範囲攻撃がないため、5体いても1体ずつを削る。', '', '## 弾薬・時間帯・効率（中盤、単体、補給なし）', '']
lines += table(['武器', '最初15秒のDPS', '60〜180秒のDPS', '最初30発の終了 秒', '装填1発あたり平均ダメージ', '総投射数 / うち石投げ'], [
    [styles[style], f(x['burstDps']), f(x['lateDps']), f(x['ammoEmptyAt']), f(x['loadedDamagePerRound']), f"{x['shots']}/{x['stones']}"]
    for style in styles for x in [row('middle', style)]
])
lines += [
    '',
    '火砲の武器ATK倍率は3.15、弓1.05、クロスボウ1.85。さらに装填された砲弾は発射時にダメージ2倍になり、範囲攻撃する。現在の単体性能の高さにはこの2倍が強く効く。弾切れ後は全て石投げとなり、砲弾2倍・範囲・ノックバックを失う。',
    '',
    '同じ30発でも、弓は速射で早く使い切り、火砲は遅射で長く持つ。補給ありと補給なしを混ぜて評価すると優劣を誤りやすい。',
    '',
    '## 敵が接近し、押し戻しが残る場合（中盤・補給なし）',
    '',
]
lines += table(['条件', *styles.values()], [[label, *(f(row('middle', style, targets, moving=True)['dps']) for style in styles)] for label, targets in [('単体・180秒平均', 1), ('密集5体・180秒平均', 5), ('単体・60〜180秒', 1)]])
# The final row is the stable interval, rather than the average.
last = ['単体・60〜180秒', *(f(row('middle', style, moving=True)['lateDps']) for style in styles)]
lines[-1] = '|' + '|'.join(last) + '|'
lines += [
    '',
    '固定配置の火力を、そのまま移動する敵への火力とは扱わない。火砲は押し出しで密集が崩れたり、射程・隊長の追撃範囲から外れたりする。攻撃しない敵なので、この試験では敵の攻撃を防いだ価値を数値化していない。',
    '',
    '## 序盤・後半の単体DPS（固定標的）',
    '',
]
lines += table(['段階/補給', *styles.values()], [[f'{stages[stage]} / {"なし" if supply == "none" else "あり"}', *(f(row(stage, style, supply=supply)['dps']) for style in styles)] for stage in ['early', 'late'] for supply in ['none', 'camp']])
late_bow = row('late', 'bow')
lines += [
    '',
    f"Lv30/T21では、均衡の素質でも丸め後の筋力91・魔力85が魔法の矢の条件を満たす。弓は単体・補給なしで{late_bow['infusedShots']}発が魔法の矢になり、補給ありではより多く発動する。他の2武器には同じ魔法追撃がないため、ここは純粋な物理武器倍率だけの比較ではない。",
    '',
    '**前回データの訂正：** 前回のLv30の弓は、魔法の矢の追撃を親のHP差と重ねて集計していた。本表は再帰した追撃を1回だけ数え、HPの減少と一致する修正版。前回のLv10・333DPS、魔法使い、耐久比較には影響しない。元のJSONは測定当時の記録として保持した。',
    '',
    '## 被弾耐久と戦闘中の成長',
    '',
]
lines += table(['武器', 'HP', 'DEF', '物理被弾の耐久中央値 秒'], [[styles[x['weaponStyle']], main['fixtures'][f"middle-ARCHER-{x['weaponStyle']}"]['hp'], main['fixtures'][f"middle-ARCHER-{x['weaponStyle']}"]['def'], f(x['medianSeconds'])] for x in main['durability']])
lines += [
    '',
    '同じ職種・防具なのでHP/DEFは同じで、同じ被弾を入力すれば耐久も同じ。実戦では敵を倒す速さやノックバックで被弾回数が変わるため、その生存率まで同じとは断定しない。',
    '',
    '得意武器を持ち武器に揃え、鍛錬・熟練成長を有効にした単体180秒の1例（同一seed）：',
    '',
]
lines += table(['武器', '180秒平均DPS', '60〜180秒DPS'], [[styles[style], f(x['dps']), f(x['lateDps'])] for style in styles for x in [row('middle', style, growth=True)]])
lines += [
    '',
    'これは1例であり、成長込みの全個体の順位を確定するものではない。前回の追加成長例はランダムな初期得意武器を残していたが、今回は各武器の熟練成長条件も揃えている。',
    '',
    '## 判断',
    '',
    '通常職では弓＝速射、クロスボウ＝弓より少し高い単体火力、火砲＝強い初期弾と範囲制圧、という差を確認した。ただし火砲は単体でも強く、範囲特化の代わりに単体を犠牲にする設計にはなっていない。補給を維持すると火砲の2倍弾を撃ち続けられるため優位が大きい。',
    '',
    '弓専用の上位職技能、マジックシューター素質、個体装備の射程・装填特性、敵の高速移動、障害物、距離、有限HPへの過剰ダメージ、実際の価格・弾薬供給を加えると結果は変わり得る。今回だけで全兵種・全場面の武器順位を確定しない。ゲームのバランスは変更していない。',
    '',
    '再生成：`node iron-squad/tools/simulate-ranged-weapons.mjs --stage middle --seeds 24`、`--stage early --seeds 12`、`--stage late --seeds 12`、続けて `python iron-squad/tools/report-ranged-weapons.py`。',
    '',
    '[中盤の全データ](previews/ranged-weapons-balance-20261013/middle.json) / [序盤](previews/ranged-weapons-balance-20261013/early.json) / [後半](previews/ranged-weapons-balance-20261013/late.json)。各ファイルにseed・個別試験値・ソースハッシュ・検証結果を保存。',
]
report_path = base / 'docs/RANGED_WEAPONS_BALANCE.md'
report_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('Generated RANGED_WEAPONS_BALANCE.md')
