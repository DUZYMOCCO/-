# 既存の失敗テスト7件（Codexへの引き継ぎ・2026-10-08）

## 前提

- 作業版は v2.7.0-dev／SW v110。兵種バランス調整まで入った状態。詳細は `docs/CURRENT_WORK.md`。
- 以下の7件は、兵種バランス調整前のバックアップ `D:\スマホゲーム工房_バックアップ\20261008-160502-v2.7.0-dev-before-class-balance.zip` でも同じ内容で失敗していた。つまり今回の調整が原因ではない。どの版から失敗しているかはまだ特定していない。
- 実行には `C:\Users\Yoshiyuki\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe tests/<名前>.test.mjs` を使った（Node 24.19.0、作業場所 `D:\スマホゲーム工房`）。
- 方針：まず「仕様変更に追従していない古い期待値」なのか「本当の不具合」なのかを判定する。古い期待値なら根拠を示して更新し、不具合なら本体を直す。理由なしに期待値を書き換えたり、assertを削除したりしない。
- 編集前にバックアップを取る。git push はしない。

## 一覧

| テスト | 失敗箇所 | 実際の値 | 期待値 | 推定（未検証） |
|---|---|---|---|---|
| population | `tests/population.test.mjs:9` | `DEPLOYMENT_CAPACITY` = 48 | 30 | 出撃上限が30から48に変わったのに、テストが追従していない可能性 |
| state-world | `tests/state-world.test.mjs:54` | `game.squad.length` = 48 | 30 | 同上（新規開始時の部隊人数） |
| equipment-loot | `tests/equipment-loot.test.mjs:19` | `sellInventoryItems` → `{count:2,value:76}` | `{count:2,value:40}` | 売却価格の計算（品質倍率など）が変わった可能性 |
| day-night | `tests/day-night.test.mjs:28` | 出現した敵 `sun_guard` | `wild_boar` | 出現テーブル・ゾーン距離・時間帯の判定が変わった可能性。v2.7.0の `field-scaling.js` は能力値の補正だけで、種類の抽選には触れていないはずなので要確認 |
| rest-maintenance | `tests/rest-maintenance.test.mjs:43` | 整備状態が `木の戦鎚+31を整備` | `/上限/` に一致 | `applyUpgradeStats(item,30)` で上限に届かず、+31まで整備できてしまっている。強化上限が30より上がったか、上限判定の不具合。テストで選ばれる武器種は乱数で変わる |
| casualty-transport | `tests/casualty-transport.test.mjs:13` | 2人目の負傷兵の `attachWounded` が `true` | `false` | 1人しか担げない仕様が、複数人を担げる仕様に変わった可能性。または上限チェックの不具合 |
| combat-phase | `tests/combat-phase.test.mjs:33` | `TypeError: document.createElement is not a function` | — | テスト環境の問題。DOMの代用品に `createElement` がない。テスト中の本体コードのどこかが新たに `document.createElement` を呼ぶようになった可能性 |

## 進め方の提案

1. 人数系の2件（population、state-world）は、48人化が意図した仕様かどうかをREADMEや仕様書、git履歴で確認する。意図した仕様ならテストを更新する。
2. combat-phase は、`document.createElement` を呼んでいる箇所を特定する。そのうえで、テスト用のDOM代用品に最低限の `createElement` を足すか、jsdom（`__pycache__/ui-tools/node_modules/jsdom`）を使う。
3. 残りの4件は、`git log -p` やバックアップとの差分で値が変わったコミットを特定し、仕様変更か不具合かを判定する。
4. 判定の結果と直した内容を、`docs/CURRENT_WORK.md` に追記する。

## 解決結果（2026-10-08・Codex）

上記7件を変更前に再現し、現在の仕様書・実装・Git履歴と照合した。ゲーム本体を変更する必要はなく、古い仕様の期待値とテスト場面の設定を更新して全7本が通過した。上の「推定」は引き継ぎ時点の記録として残す。

| テスト | 確認できた原因・根拠 | 修正と検証 |
|---|---|---|
| population | `d7c6da8`（v1.24.2）の実装で出撃48名・敵上限40体へ変更済み | 48／40を独立して検証。上限超過兵の予備兵化・保存・ID維持、欠員補充、ボスを含む敵上限を保持。旧マップ座標の敵が距離で除去されないよう、現在の隊長位置に配置 |
| state-world | 出撃48名に加え、v2.1で魔導兵、v2.3で本陣城下町を追加済み | 初期5兵種、地域の4町＋本陣城下町の計5町を検証。セーブ分離・新規開始・再開・地形検証を保持 |
| equipment-loot | `87427d5`（v1.17.9）で売価を `floor(14+tier^1.8*12+upgrade*8)` へ改定。今回の76GはT1＋3武器50Gと未強化品26Gの合計で、品質倍率ではない | 26G／50Gを個別検証し合計76Gへ更新。重複選択・保護品の保持も検証。後続の旧距離帯・祠上限も更新し、T7の最奥宝箱限定、新しい武器個性／限定品補正の保持、無限強化を検証 |
| day-night | `d99cea4`で世界中心が79,360へ移動し、距離帯が8,000／22,000／48,000mへ拡大。旧座標は想定した地域ではなかった | 現在の中心と距離で場面を作り、出現前に地域IDを検証。昼夜の敵種類の期待値は維持 |
| rest-maintenance | `29c4095`（v1.20.3）で＋30と祠の強化上限を撤廃済み（`SPEC_AND_HANDOVER.md`のv1.20.3節にも記載） | ＋30→31の整備成功、1秒1部位、支出・整備記録を検証。上限の代わりに資金不足と維持費6Gの制約を検証 |
| casualty-transport | `d99cea4`で隊長と聖騎士は搬送2名、一般兵は1名へ変更済み。搬送先には町・既知の救護所も追加済み | 隊長2名・3名目拒否、一般兵1名、聖騎士2名をそれぞれ検証。旧座標を修正し、最寄りの救護先へ近づくことを検証。英雄宝珠と覚醒宝玉はアイテム種別で区別して数える |
| combat-phase | `completePhase`から呼ぶ`renderStrategyUI`が、DOMを用意していない戦線シミュレーションで実行された | 他のUIメソッドと同じくパネル描画をテスト用に置換。実DOMのUI検証は`interface`で別途通過。戦闘／実回復の経験、非参加者除外、新兵・予備兵・死線覚醒・保存の検証を保持 |

### 確認と作業範囲

- 7本を個別に再実行し、すべて終了コード0。追加の回帰確認 `class-balance`／`major-invasion`／`interface` も通過。
- ゲーム本体（JS・CSS・素材・入口・SW）は編集前バックアップとバイト単位で同一。ユーザー承認済みの `SOLDIER_PHYS_DMG_MULT=2.2` を維持。
- 編集前バックアップ：`D:\スマホゲーム工房_バックアップ\20261008-164337-v2.7.0-dev-before-failing-tests.zip`（171ファイル、ZIP読取・全SHA256検証済み）。
- 今回の変更はテスト7本と引き継ぎ文書のみ。v2.7.0-dev／SW v110を維持。commit／pushなし。
- 実機の表示・操作感・FPSと、長期探索時のセーブ容量の確認は引き続き未実施。
