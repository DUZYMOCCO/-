"""Report hypothetical ranged rules, without comparing or changing live balance."""
import json
from pathlib import Path

base = Path(__file__).resolve().parents[1]
data_dir = base / 'docs/previews/ranged-candidates-20261013'
data = {policy: json.loads((data_dir / f'middle-{policy}.json').read_text(encoding='utf-8')) for policy in ['shared', 'inherited', 'idle']}
main = data['shared']
for policy, dataset in data.items():
    wide = json.loads((data_dir / f'middle-{policy}-wideLine5.json').read_text(encoding='utf-8'))
    for key in ['hypothetical', 'accountingVersion', 'fallback', 'settings', 'candidate', 'sourceHashes', 'loaderHash', 'checks']:
        assert wide[key] == dataset[key], f'Wide-line experiment differs: {key}'
    dataset['results'] += wide['results']
for policy, dataset in data.items():
    assert dataset['hypothetical'] and dataset['accountingVersion'] == 2
    assert dataset['fallback'] == policy and dataset['settings']['seeds'] == 8
    assert dataset['candidate'] == main['candidate']
    assert dataset['sourceHashes'] == main['sourceHashes']
    assert dataset['loaderHash'] == main['loaderHash']
    assert 'all hits equal actual enemy HP loss' in dataset['checks']
    assert 'source hash stability' in dataset['checks']

styles = {'bow': '弓', 'crossbow': 'クロスボウ', 'cannon': '火砲'}
layouts = {'single': '単体', 'dense5': '密集5体', 'line5': '狭い縦列5体', 'wideLine5': '広い縦列5体', 'spread5': '分散5体'}
policies = {'shared': '共通投石', 'inherited': '武器依存の投石', 'idle': '射撃停止'}
f = lambda x: f'{x:,.1f}'
def row(style, layout='single', supply='none', policy='shared'):
    return next(r for r in data[policy]['results'] if r['weaponStyle'] == style and r['layout'] == layout and r['supply'] == supply)
def table(header, rows):
    return ['|' + '|'.join(header) + '|', '|' + '|'.join('---' if i == 0 else '---:' for i in range(len(header))) + '|'] + ['|' + '|'.join(map(str, r)) + '|' for r in rows]

trials = sum(r['seeds'] for d in data.values() for r in d['results'])
scenarios = sum(len(d['results']) for d in data.values())
lines = [
    '# 弓・クロスボウ・火砲の調整候補シミュレーション（2026-10-13）', '',
    '**調整案の試験結果。実ゲームのパラメータは変更していない。** 現行版との再比較は行わず、速射の弓・威力と貫通のクロスボウ・範囲の火砲という候補を評価した。途中のユーザー指定により石投げ廃止・クロスボウの小さなノックバックを採用方針とする。投石を残した試験は検討履歴として保持し、弾切れ後の副武器・移動AIは別の試験で確認する。', '',
    '## 仮置きした数値', '',
]
lines += table(['武器', '弾数', '基礎発射間隔 秒', '武器ATK倍率', '追加効果'], [
    ['弓', '120', '0.60', '1.05', '速射、魔法の矢は既存条件のまま'],
    ['クロスボウ', '60', '1.25', '2.40', '直線弾、最大3体、威力100%→70%→49%、小ノックバック12'],
    ['火砲', '30', '1.85', '3.15', '追加の砲弾倍率1.0、範囲半径62、押し戻しを維持'],
])
lines += [
    '', '基礎間隔は兵士の攻撃速度補正前。武器ATK倍率は装備の攻撃力部分に掛かるため、クロスボウの1.85→2.40は最終ダメージ全体が約30%増える意味ではない。', '',
    '弾切れの候補：', '',
    '- 武器依存の投石：既存の投石と同じ規則。装備武器の威力・発射間隔・射程を引き継ぎ、それぞれ75%へ落とす。貫通・範囲・砲弾の追加倍率は持たない。',
    '- 共通投石：武器の装備ATK部分を除外した攻撃力の75%。基礎間隔1.25秒、基礎射程150、弾速280、貫通・範囲なし。職種・レベル・筋力・防具の補正は残す。今回の同じ素質・装備条件では3武器の投石がほぼ同じ性能になる。',
    '- 射撃停止：0発では弾を生成せず、補給されると通常射撃へ戻る。今回の試験では近接への持ち替えや補給地点へ戻るAIは追加していない。', '',
    '## 試験条件', '',
    f'- Lv10/T9・通常職ARCHER・凡庸/均衡・熟練0・品質100%/+0・同じ全防具。180秒、0.05秒刻み、各8seed。{scenarios}条件・{trials}回。',
    '- 実ゲームの兵士AI、発射、飛翔、防御、会心、補給、ダメージを使用。候補の数値と貫通弾の処理だけをNodeのローダーでメモリ上に差し込む。公開ゲームJSやセーブへ書き込まない。',
    '- 敵のDEF/魔防100。死亡しない十分なHPとし、成長・回復・敵の攻撃を止める。毎フレーム敵を固定配置へ戻し、押し戻しによる配置の変化を除く。',
    '- 単体は距離1.5m。密集5体は半径0.2m内の十字配置。狭い縦列は射線上に0.2m間隔、広い縦列は0.6m間隔で先頭3体をクロスボウの射程内に置く。分散5体は側方へ1.0m以上離し、1発で複数体へ当たらない配置。',
    '- 貫通弾は発射時の方向へ直進。移動区間と敵の半径を使って接触を判定し、同じ敵には二度当たらず、最大3体で消える。壁の遮蔽判定も通す。追尾する貫通弾ではない。',
    '- 補給ありは既存のキャンプで0.25秒ごとに武器別の最大弾数まで戻す。共通投石案で計測するが、弾切れしないので3案とも同じ通常射撃となる。',
    '- 実際の敵HP減少＝集計ダメージ、装填弾＋投石＝全ダメージ、縦列の最大3体、分散時の誤った範囲ヒットなし、試験中の入力ソースSHA-256不変を検証。', '',
    '## 180秒平均DPS（弾切れ後は共通投石）', '',
]
lines += table(['敵配置 / 補給', *styles.values()], [[f'{layouts[layout]} / {"なし" if supply == "none" else "あり"}', *(f(row(style, layout, supply)['dps']) for style in styles)] for supply in ['none', 'camp'] for layout in layouts])
lines += ['', '複数体のDPSは全敵に与えた合計。分散配置でも1体を削り続けるため、敵の数だけで単体DPSが増えることはない。', '', '## 単体の弾数・一撃・投石への移行', '']
lines += table(['武器', '最初15秒DPS', '装填1発平均ダメージ', '弾切れまで 秒', '180秒の弾 / 石', '120〜180秒DPS'], [[styles[style], f(r['burstDps']), f(r['loadedDamagePerRound']), f(r['ammoEmptyAt']), f"{r['shots']-r['stones']} / {r['stones']}", f(r['tailDps'])] for style in styles for r in [row(style)]])
lines += ['', '増弾した弓・クロスボウは60秒時点でまだ弾が残るため、投石だけの比較には全員が弾切れした120〜180秒を使う。', '', '## 弾切れの動作による違い（単体・補給なし）', '']
lines += table(['武器 / 指標', *policies.values()], [[f'{styles[style]} / {metric}', *(f(row(style, policy=policy)[field]) for policy in policies)] for style in styles for metric, field in [('180秒平均', 'dps'), ('120〜180秒', 'tailDps')]])
lines += ['', '武器依存の投石を残すと、速射化した弓の投石も速くなる。共通投石にすると弾切れ後の差はほぼ消え、弾数と通常射撃の役割を評価しやすい。停止案は補給のない長期戦で火力が完全になくなるため、補給や退避のAIも合わせて設計する必要がある。', '', '## 貫通と爆発の違い（補給あり）', '']
lines += table(['配置', 'クロスボウの命中数 / 発', '火砲の命中数 / 発'], [[layouts[layout], f(row('crossbow', layout, 'camp')['hitsPerLoadedRound']), f(row('cannon', layout, 'camp')['hitsPerLoadedRound'])] for layout in layouts])
lines += [
    '', '最大3体・70%ずつ減衰するクロスボウは、列に対して効果がある。火砲の面への爆発と分けることができる。今回は敵が静止した配置なので、敵が横に動いて直進弾を避ける場合や密集が押し戻しで崩れる場合の命中率を保証するものではない。', '',
    '## 調整判断', '',
    'この候補では、補給中の単体は弓、間隔の広い列はクロスボウ、密集は火砲が最高DPSになった。狭い列は火砲の爆発に4体が入るため、クロスボウより高い。クロスボウは弓より一撃が重いが、単体の時間平均では速射の弓を上回らない設定になっている。', '',
    '弾数120でも速射の弓は約1分強で使い切る。180秒戦闘の途中で投石へ移る前提であり、「補給なしで3分ずっと弓を撃つ」設定ではない。', '',
    'ユーザー指定で投石は廃止する。残した場合の比較では、武器依存の投石が弓の速射まで引き継いでいたことを確認した。停止だけでは長期戦で完全に攻撃が途切れるため、[忍者の遠近切り替えを参考にした副武器の追加試験](RANGED_SIDEARM_SIMULATION.md)も行った。', '',
    '有限HPへの過剰ダメージ、撃破による次標的への切り替え、敵の攻撃、実際の勝率、上位職・魔法の矢・熟練成長、価格・弾薬ドロップは今回の比較外。武器案の方向を見るための固定条件であり、採用する数値は未決定。', '',
    '## 再実行', '',
    'PowerShellで `$env:IRON_RANGED_FALLBACK` を `shared` / `inherited` / `idle` にして、`node --no-warnings --loader ./iron-squad/tools/ranged-candidate-loader.mjs iron-squad/tools/simulate-ranged-candidates.mjs --seeds 8`。広い縦列は同じコマンドに `--layout wideLine5` を付けて実行。続いて `python iron-squad/tools/report-ranged-candidates.py`。', '',
    f'計測入力の版はv{main["version"]}/{main["cache"]}。全候補で同一の入力ソース・ローダーハッシュを確認した。現行版の武器との比較実行や、実ゲームの変更はしていない。', '',
    '[共通投石の記録](previews/ranged-candidates-20261013/middle-shared.json) / [武器依存の投石](previews/ranged-candidates-20261013/middle-inherited.json) / [射撃停止](previews/ranged-candidates-20261013/middle-idle.json)。個別seed、ダメージ時系列、配置別のHP減少、ハッシュと検証結果を保存。',
]
(base / 'docs/RANGED_WEAPONS_CANDIDATES.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'Generated RANGED_WEAPONS_CANDIDATES.md: {scenarios} scenarios / {trials} runs')
