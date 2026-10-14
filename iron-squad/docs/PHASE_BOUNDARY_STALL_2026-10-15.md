# 期の切替時の停止を減らす（Codex向け指示書）

## 症状（iPhone 17 実機・v6.11.14 の計測表示）
- 休憩中の毎秒の停止は解消した。残りは約2分ごとに2件1組:
  - 期の終了時: 731ms / 893ms
  - その約8秒後（休憩明け・敵の出現時）: 338ms / 349ms
- 内訳はどちらも「更新」が大半（保存の背景受付は約11ms）。

## 原因（v6.11.14 の Codex 計測より）
- `processSharedEquipmentBox()`（`js/index.js` 9879行付近）が、期の終了時（5597行付近）、休憩明け（5705行付近）、`supplyMissingEquipment` の中、の計3回走る。CPU 4倍・48人で合計約3秒。
- そのなかで `recalcSoldierStats` が約11,650回呼ばれている（約1.1秒）。`distributeSharedBoxToSoldiers` が兵士×装備の候補ごとに再計算しているか、`equipmentValueFor` が再計算を伴っていると思われる。まず計測で確かめる。

## 作業
1. 計測: 期の終了・休憩明けの処理で、関数ごとの時間と呼び出し回数を出す（既存の計測表示/再現ツール `tools/playtest-rest-background-save.mjs` を流用してよい）。`processSharedEquipmentBox` 以外に重いもの（敵の出現、`supplyReinforcements`、`investNation`、`supplyMissingEquipment` など）があれば併記する。
2. 軽量化（結果は変えない）:
   - `recalcSoldierStats` を、候補の評価ごとではなく、実際に装備が変わった兵士だけ、処理の最後に1回ずつにする。評価に能力値が要るなら、再計算せずに差分で見積もるか、兵士ごとの評価結果をその処理の間だけキャッシュする。
   - 同じ期の境界で `processSharedEquipmentBox` を何度も呼ぶ必要があるか見直す。共有箱の中身や兵士の装備が前回から変わっていなければ、2回目以降は省く（変更があったかどうかの印で判断）。
   - 売却基準づくり（`createSupplyEquipment` × 種類）などの使い捨て計算も、同じ処理の中で重複していればまとめる。
3. 結果が同じであることのテスト: 修正前後で、同じ入力（48人・大きなバッグ・共有箱あり）について、配った装備、売却数と金額、各兵士の能力値が完全に一致することを確かめる。
4. 目標: CPU 4倍・48人で、期の終了と休憩明けのフレームがそれぞれ 100ms 以下。届かなければ、どこまで下がったかと残りの内訳を書く。処理を複数フレームに分けるのは、結果を同じにできる場合だけ。

## 守ること
- 編集は `iron-squad/` 配下のみ。版を v6.11.15 に上げ、`sw-assets.js` の version と gameVersion、変更モジュールの `?v=` も上げる（CLAUDE.md §2）。
- 配布や売却のルール（誰に何を配るか、何を売るか）は変えない。
- 全テスト PASS、`git checkout iron-squad/docs/previews`、`git add -A` 禁止、コミット・プッシュしない。
- 終わったら、この文書の末尾「結果」と `docs/CURRENT_WORK.md` を更新する。

## 結果
- v6.11.14の既存ファイルを保持してv6.11.15 / cache v265へ更新。編集はiron-squad/だけ。ステージ/コミット/プッシュなし。背景保存と既定OFFの計測スイッチは維持。
- 原因を確認: `equipmentValueFor → soldierEquipmentValue` は候補ごとにコピー兵士を作り、実際と同じ能力式でrecalcSoldierStatsを行う。共有箱が空でも全7部位の兵士並べ替えを行い、試験計算が数千回ずつ走っていた。実兵士の再計算と試験コピーの再計算を分けて計測した。
- 軽量化:
  - 配布できる候補がない種類（保護品だけの場合を含む）は並べ替え/評価を省く。装備が変わった実兵士は従来どおり最後に1回ずつ再計算。
  - 同じ兵士/候補/部位の厳密な評価結果をその同期処理内だけキャッシュ。装備参照/強化/再計算で無効化。配布・外販と個人調達の両方へ適用。能力の見積りや判定式の変更はしない。
  - 期・実兵士の再計算番号・共有箱・装備/保護/兵士構成/成長の印を保持し、入力が同じなら次の共有箱処理を省く。装備を変更した処理の後は省略印を残さず、再計算で次の配布機会が生じるケースを維持。
  - 売却基準のminimumは既に種類ごとに1回生成するMapがあったため、その仕組みと支給品の生成規則を維持。処理の複数フレーム化は行っていない。
- 結果一致: v6.11.14の配布/共有箱/個人調達の実装を `tests/fixtures/phase-boundary-v6.11.14-reference.mjs` へ凍結。同じ48人（複数兵種・Lv・負傷）/バッグ500点/共有箱70点・重複/保護品の入力3ケースで、配布結果、売却件数・金額、残箱/バッグ、兵士全フィールド（能力/HP/MP/装備/財布含む）、国庫/財政が完全一致。連続処理、箱追加、強化、保護、成長、編成変更の後も旧処理と一致。個人/公費調達で実際に装備が変わるケースの購入/能力/財布も一致。処理内キャッシュの持替え/強化/明示失効を確認。
- 重点8テストPASS。最終全175テストPASS（73.9秒、失敗0）。生成PNG3枚をgit checkoutで復元。126ファイル構文検査、135アセットの存在/全122runtime JSの登録、git diff --checkも通過。

CPU4倍・Chrome390×844・48人・約610KB UTF-8のセーブ一覧（現行記録＋地点記録）の最終比較。旧コードもv6.11.14の背景保存を維持し、凍結した旧共有箱/個人調達のコードだけを実行。旧毎秒同期保存の再挿入はしていない。

| 場面 | 旧処理のフレーム | v6.11.15のフレーム | v6.11.15の関数本体 | 試験再計算回数（旧→新） | 実兵士の再計算回数（旧→新） |
| --- | ---: | ---: | ---: | ---: | ---: |
| 期終了 | 2501.0ms | 377.7ms | 355.1ms | 7822→152 | 109→109 |
| 休憩明け | 1327.6ms | 75.5ms | 51.9ms | 3731→0 | 0→0 |

- 共有装備評価processSharedEquipmentBox: 期終了2回合計2016.0→19.8ms、休憩明け1回1245.4→7.1ms。不要な能力試験を削減し、配布/整備で実際に必要な再計算回数は維持。
- **休憩明けは100ms以下を達成。期終了は未達（377.7ms）。** 残りはupdateStatsUI 1回/101.2ms、supplyMissingEquipment 1回/108.5ms（equipmentValueFor 152回/73.0msや共有箱処理を含む）、recalcSoldierStats合計261回/91.6ms（実109回・試験152回）。supplyReinforcements 9.0ms、investNation 2.6ms、研究2.0ms、createSupplyEquipment 24回/1.7ms。敵の初期出現は休憩明けに1回/4.5ms。値は包含時間があるため、合計してフレーム時間とはしない。個人調達/能力表示などが残る。初回比較でも期終了344ms/休憩明け73msだった。
- 8回の休憩整備・実移動約2742単位・昼夜切替/10秒保存を確認。休憩終了後の保存は整備回数/支出/兵士のお金/装備と一致。実Worker12連続保存の旧11件superseded/最後saved、hidden同期保存を古い依頼が上書きしないことも確認。ブラウザーエラー0。iPhone実機の修正後確認は未実施。
- 画像/全関数内訳/JSON `docs/validation/phase-boundary-v6.11.15/`。`legacy-phase-boundary-mobile.png` / `fixed-phase-boundary-mobile.png` と `browser-playtest.json`（phaseBoundariesAtMost100ms=falseを明記）。再現ツール `tools/playtest-phase-boundary.mjs`。最終ログ `docs/backups/browser-phase-boundary-v6.11.15-final.log` / `docs/backups/full-tests-v6.11.15-final.log`。変更前ZIP `docs/backups/20261015-before-phase-boundary-v6.11.15.zip`。
- CURRENT_WORK.md/SPEC_AND_HANDOVER.mdを更新。期終了の100ms目標は残課題として引き継ぐ。

