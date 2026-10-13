"""Turn measured JSON into a reviewable report, without external dependencies."""
import json
from pathlib import Path

base = Path(__file__).resolve().parents[1]
result = base / "docs/previews/caster-archer-balance-20261013/results.json"
r = json.loads(result.read_text(encoding="utf-8"))
old_accounting = r.get("accountingVersion", 1) < 2
stages = {"early": "Lv1 / T1", "middle": "Lv10 / T9", "late": "Lv30 / T21"}
affinities = {"none": "弓兵", "fire": "魔法使い・炎", "ice": "魔法使い・氷", "lightning": "魔法使い・雷", "explosion": "魔法使い・爆発"}
supplies = {"none": "野外・補給なし", "camp": "キャンプ補給", "hq-defense": "本陣防衛中の補給"}
mixes = {"physical": "物理100%", "mixed": "物理75% / 魔法25%", "magic": "魔法100%"}
fmt = lambda n: f"{n:,.1f}"

lines = [
    f"# 魔法使いと弓兵の実効DPS・耐久比較（{r['version']} / {r['cache']}）",
    "",
    "**主比較（Lv10/T9・野外・補給なし）では、弓兵の単体継続DPSが高い。密集した複数標的では魔法使いの総DPSが高い。物理耐久は弓兵、魔法耐久はローブが強い。** この計測だけを理由に弓兵の会心・単体倍率を上げる必要は認められない。",
    "",
    "## 条件と測定方法",
    "",
    f"- 現行ローカル作業版の `IronSquadGame.update`、`performAttack`、`damageTarget`、魔法AI、MP回復、弾生成・着弾、弾薬補給、バリアのコードを直接実行。{r['settings']['sampleCount']}個のseed（202610130〜202610153）で会心・回避の変動を確認。魔法攻撃にはこの条件で乱数がなく、各属性のDPSは1回の確定値。",
    f"- 通常職クラス0、凡庸・均衡の素質、品質100%、強化+0、熟練度0。Lv1/T1、Lv10/T9、Lv30/T21。魔法使いはワンドと魔導系防具、弓兵は弓と通常防具。全て実際の筋力条件を満たす。全防具を揃えた比較で、胴防具だけの差ではない。",
    f"- 単体はHPを十分大きくした静止標的（DEF100・魔法防御100）。密集試験は全標的が各属性の範囲内にある5体。着弾によって実際に減ったHPを合計し、{r['settings']['duration']}秒で割る。60〜180秒の安定区間も別に計測。",
    f"- 時間刻み{r['settings']['dt']}秒。連続戦闘の比較なのでウェーブ間の休息は入れない。最初はHP・MP・弾薬・バリア満タン。標的は攻撃しないため、DPSの測定に被弾停止を混ぜない。",
    "- 主比較は戦闘中の鍛錬・熟練・レベルアップを固定。成長を有効にした追加比較も実施。医療、蘇生、薬、重装のかばう・ヘイト、引き撃ちによる被弾回避、死線スキルは評価対象外。",
    "- 耐久は1人ずつ、0.5秒に1回、共通seedの±20%威力の被弾を `damageTarget` に入力。平均の生ダメージ圧力は序盤60、中盤300、後半1,200/秒。最初にダウンするまでを測る。敵の技をスタン等で止める効果を含まない、装備・能力の耐久試験。",
    "- 防衛中の補給は侵攻状態を固定して本陣のMP回復3/秒と通常回復を適用。キャンプは既存のMP/弾薬満タン補給。侵攻終了・再生成・描画・保存は停止し、ウェーブ更新を起こさない。",
    "- 有効HPはダウンまでに入力した軽減前の生ダメージの累計（回避した攻撃・最後の超過ダメージも含む）。理論式による厳密な有効HPと区別する。生存率はこの限定した被弾条件での率で、実際の遠征成功率ではない。",
    "",
    "## 単体への継続DPS",
    "",
    "|装備段階|補給|弓兵|炎|氷|雷|爆発|",
    "|---|---|---:|---:|---:|---:|---:|",
]
for stage in stages:
    for supply in supplies:
        rows = [x for x in r["offense"] if x["stage"] == stage and x["supply"] == supply and x["targets"] == 1]
        values = [next(x for x in rows if x["affinity"] == a)["dps"] for a in affinities]
        cells = [fmt(v) for v in values]
        if old_accounting and stage == "late":
            cells[0] = "訂正後は三武器レポート参照"
        lines.append(f"|{stages[stage]}|{supplies[supply]}|" + "|".join(cells) + "|")

if old_accounting:
    lines += ["", "**2026-10-13 訂正：** 元の集計で、魔法の矢の再帰呼び出しを親のHP差と重ねて数える問題を発見。Lv30の弓だけがこの条件に該当したため、そのDPS欄は撤回し、[三武器の修正版計測](RANGED_WEAPONS_BALANCE.md)を参照する。Lv1/Lv10、魔法使い、耐久の数値には影響しない。元のJSONは測定時の記録として保持し、新しい集計ではダメージ合計と実際に減ったHPの一致を検証する。"]

lines += ["", "## 中盤の時間帯別DPS（野外・補給なし）", "", "|職・属性|最初の15秒|180秒平均|60〜180秒|瞑想中の時間割合|", "|---|---:|---:|---:|---:|"]
for x in r["offense"]:
    if x["stage"] == "middle" and x["supply"] == "none" and x["targets"] == 1:
        lines.append(f"|{affinities[x['affinity']]}|{fmt(x['burstDps'])}|{fmt(x['dps'])}|{fmt(x['lateDps'])}|{fmt(x['meditationPct'])}%|")
lines += [
    "",
    "弓兵は約27.6秒で最初の30発を使い切る。以後も石投げを続け、威力・射程・攻撃頻度が低下する。『リロードだけで永久に同じ射撃をする』仕様ではない。魔法使いはMP不足で瞑想し、40MPまで回復すると攻撃へ戻る。MPが尽きると移動も止まる。",
    "",
    "## 密集5体への総DPS（中盤・補給なし）",
    "",
    "|職・属性|単体|密集5体の合計|",
    "|---|---:|---:|",
]
for affinity in affinities:
    rows = [x for x in r["offense"] if x["stage"] == "middle" and x["supply"] == "none" and x["affinity"] == affinity]
    one = next(x for x in rows if x["targets"] == 1)
    many = next(x for x in rows if x["targets"] == 5)
    lines.append(f"|{affinities[affinity]}|{fmt(one['dps'])}|{fmt(many['dps'])}|")
lines += ["", "標的が散らばると魔法の同時命中数は減る。上表は密集時の範囲攻撃の利点を測ったもの。", "", "## ダウンまでの耐久", "", "数値は24回の中央値、括弧内は10〜90パーセンタイル。", "", "|装備段階|被弾の種類|弓兵 秒|魔法使い 秒|弓兵の累計生ダメージ|魔法使いの累計生ダメージ|", "|---|---|---:|---:|---:|---:|"]
for stage in stages:
    for mix in mixes:
        a = next(x for x in r["durability"] if x["stage"] == stage and x["mix"] == mix and x["role"] == "ARCHER")
        m = next(x for x in r["durability"] if x["stage"] == stage and x["mix"] == mix and x["role"] == "MAGE")
        display = lambda x: f"{fmt(x['medianSeconds'])}（{fmt(x['p10Seconds'])}〜{fmt(x['p90Seconds'])}）"
        lines.append(f"|{stages[stage]}|{mixes[mix]}|{display(a)}|{display(m)}|{a['medianRawIncoming']:,.0f}|{m['medianRawIncoming']:,.0f}|")
lines += ["", "後半の30秒時点の生存率（同じ平均生ダメージ1,200/秒）：", "", "|被弾の種類|弓兵|魔法使い|", "|---|---:|---:|"]
for mix in mixes:
    a = next(x for x in r["durability"] if x["stage"] == "late" and x["mix"] == mix and x["role"] == "ARCHER")
    m = next(x for x in r["durability"] if x["stage"] == "late" and x["mix"] == mix and x["role"] == "MAGE")
    lines.append(f"|{mixes[mix]}|{a['survival30']:.0%}|{m['survival30']:.0%}|")
lines += ["", "ローブには魔法防御もあるため、魔法が混ざるほど通常鎧側の優位が崩れる。後半は魔法25%混合でも魔法使いが長く耐えた。『魔法使いはどの敵相手でも脆い』という結論にはならない。", "", "## 主比較の実ステータス", "", "|段階|職|HP|DEF|魔法防御|バリア|筋力|魔法攻撃|", "|---|---|---:|---:|---:|---:|---:|---:|"]
for stage in stages:
    for role in ["ARCHER", "MAGE"]:
        x = r["fixtures"][f"{stage}-{role}"]
        lines.append(f"|{stages[stage]}|{'弓兵' if role == 'ARCHER' else '魔法使い'}|{x['hp']}|{x['def']}|{x['magicDef']}|{x['barrier']}|{x['strength']}|{x['magicAttack']}|")
lines += ["", "## 追加比較", ""]
live = [x for x in r["sensitivity"] if x["kind"] == "live-growth"]
lines.append("中盤の戦闘中の鍛錬・熟練成長を有効にした180秒の1例（炎魔法、同一seed）：" + " / ".join(f"{'弓兵' if x['role'] == 'ARCHER' else '魔法使い'} {fmt(x['dps'])}DPS" for x in live) + "。この例でも単体の優位は逆転しなかった。")
for x in r["sensitivity"]:
    if x["kind"] == "ward-robe":
        lines.append(f"- 中盤の魔法使いの胴だけを結界ローブに替えた耐久（{mixes[x['mix']]}）：{fmt(x['medianSeconds'])}秒。魔法攻撃341→308と引き換えにバリア97→213。")
lines += [
    "",
    "## 判断と限界",
    "",
    "今回の主比較では、弓兵はすでに単体の継続火力と物理耐久を担当できる。序盤のキャンプ補給では雷魔法54.9DPSが弓兵50.7DPSを少し上回る例もあり、補給・成長段階で優劣は変わる。魔法使いは範囲火力と魔法耐久で強みがある。無条件の弓兵強化は見送りが妥当。実ボスの物理/魔法耐性、上位職、射程、移動、敵数・撃破による補給、重装の保護、衛生術師の治療を入れた部隊戦は別の検証になる。今回の測定だけで全状況の職バランスが確定したとは扱わない。",
    "",
    "ゲームの戦闘パラメータは変更していない。これは現行コードの固定条件での数値比較であり、iPhoneでの性能測定・実プレイの勝率測定ではない。実行前後の全ゲームJSとアセット一覧のSHA-256一致、装備条件、弾切れ、瞑想、補給、意図しない休息/死亡の防止を確認済み。",
    "",
    "再生成：`node iron-squad/tools/simulate-caster-archer-balance.mjs --seeds 24`、続けて `python iron-squad/tools/report-caster-archer-balance.py`。Codex付属ランタイムでも実行可。",
    "",
    "[測定データ・seed・ソースハッシュ](previews/caster-archer-balance-20261013/results.json) / [実行ログ](previews/caster-archer-balance-20261013/run.log)。",
]
(base / "docs/CASTER_ARCHER_BALANCE.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("Generated CASTER_ARCHER_BALANCE.md")
