# ダッシュ中の周期停止の診断（Codex向け指示書）

## 症状（ユーザー報告・iPhone 17 / iOS 26 / v6.11.10）
- 野外をダッシュで前進すると、約2秒に1回、0.5秒ほど止まる。新しい領域が開けるときに起きている感じ。
- 2026-10-13 まではなかった → 10-14 のコミット（f0e8c8d..a3b3876）による回帰の可能性が高い。

## これまでの調査（Claude、PC の Chrome で実測）
- Chrome headless・390×844・CPU 4倍スロットル・ダッシュ218px/s（タイル境界の通過は約2.3秒ごと）で約16秒走行しても、**再現しなかった**。
  - 地形先読みワーカーは間に合い、同期の `WorldTerrain.generate()` は0回。ズーム0.65〜1.3でも周期的な長フレームなし。
  - フォグ表示、ミニマップ、`follower-recovery` はいずれも軽い。
- コミット単位の比較: d46faf3 で同期保存が LZW 圧縮込みで重くなった（4倍スロットルで 304ms。624KB の一覧では 2.8〜3.5秒）。ただし走行中に毎回呼ぶ経路は見つかっていない。
- PC で測れていないもの: iOS WebKit の `localStorage` の速度、iOS でのワーカー（module worker + OffscreenCanvas）の実際の動作、`ImageBitmap` の受け渡し。
→ **実機でしか起きない可能性が高い。** まず実機で計測できるようにする。

## 作業: 実機で見られる計測表示を入れる
- URL に `?perf=1` を付けたとき（またはメニューの隠しスイッチ）だけ有効にする。通常のプレイには影響させない。
- 100ms を超えたフレームを記録し、画面の隅に直近10件を表示する。各件には次を出す:
  - 時刻（前回の停止からの秒数）とフレームの長さ（ms）
  - そのフレームで時間を使った処理の内訳。最低限、次をタイマーで包む:
    `WorldTerrain.generate`、地形ワーカーの `onmessage`（drawImage 含む）、`takeSurface`、`saveGame`、`saveSlots.update/updateBackground/list/get`、`localStorage.getItem/setItem`（ゲームのキー分）、セーブワーカーの `completeJob`、フォグの公開処理、ミニマップ／地図の再描画、`follower-recovery`、敵の出現処理
  - 地形ワーカーの状態: `_terrainWorkerDisabled`、`_pendingTerrain.size`、`rasterSize`、キャッシュ枚数
- 対応していれば `PerformanceObserver({type:'longtask'})` も併記する（iOS で使えなければ省略してよい）。
- 表示はスクショ1枚で読める大きさにする（ユーザーが iPhone でスクショを撮って送る想定）。

## 守ること
- 編集は `iron-squad/` 配下のみ。版上げは CLAUDE.md §2 のとおり（v6.11.11 の続きの版にする）。
- 計測コードは `?perf=1` がないときに何もしない（包み関数の付け替え自体をしない）。
- 全テスト PASS、`git checkout iron-squad/docs/previews`、`git add -A` 禁止。
- 原因がはっきり分かった場合以外は、推測で修正を入れない。計測表示だけ先に出す。

## 追加作業: ゲーム内のスイッチで計測を有効にする（v6.11.12 の続き）
- 問題: ユーザーのいつものセーブは、iPhone のホーム画面に追加したアプリ側にある。ホーム画面のアプリと Safari は保存領域が別で、ホーム画面のアプリには URL のクエリを付けられない。そのため `?perf=1` では、いつものセーブで計測できない。新規データでは主人公が遅く、症状が出ない。
- 作業: ゲーム内の設定（またはメニューの目立たない場所）に「計測表示」のオン・オフを追加する。オンにすると、`?perf=1` と同じ計測を有効にする。
  - 設定は端末に保存し（localStorage の小さなキーでよい）、再起動後もオンのままにする。オフにすると計測のフックをすべて外し、元の関数に戻す。
  - 再読込なしで切り替えられるならそうする。難しければ「再読込で有効になります」と表示する。
  - `?perf=1` も今までどおり使えるようにする。
- オフのとき（既定）は、これまでどおり計測コードを一切差し込まないこと。
- 全テスト PASS、版上げ（v6.11.13 など）、`git add -A` 禁止、コミット・プッシュしない。

## 結果
- v6.11.12 / cache v262として、未コミットのv6.11.11に重ねて実装。編集はiron-squad/だけ。共有ファイル/地形生成/フォグ/保存方式/バリア等の既存動作を変えず、原因を推測した修正は入れていない。コミット/プッシュなし。
- `?perf=1` のときだけ計測を設置。通常URLでは関数の差し替え/計測Observer/計測タイマー/診断DOMなし。IRON SQUADの終了時に元の関数/Storage/Workerハンドラーを復元。
- 100ms超の直近10件に、時計時刻/前回の検出から秒数/フレーム長/各フレームの地形Worker停止フラグ・待機数・rasterSize・キャッシュ枚数を表示。処理時間はスクショで読める上位3件を表示し、全計測対象の名称/時間/包含時間/回数はコピーJSONに保持。入れ子の時間は二重計上しない。計測用コードの表示コストも別に計測。
- 指定された全対象を計測: generate、地形Worker onmessage（画像貼付含む）、takeSurface、saveGame、saveSlots.update/updateBackground/list/get、ゲームのStorage getItem/setItem、completeJob、フォグ公開、ミニマップ/地図、follower-recovery、敵出現。処理自体と例外/戻り値/Promiseはそのまま。
- 実ブラウザー検証で、Workerタスクの後にrAFの提供時刻が遅れて追いつく例を確認。タイマーと同じperformance.now()のコールバック到着間隔をフレーム長とし、rAF間隔はrafMsへ別保存。これによりWorkerの遅延を取りこぼしたり2回記録したりしない。非表示/ループ停止と再開の空白は除外。タイマー外の時間は「未計測」で、GC/描画待ち等と推測しない。
- PerformanceObserverのlongtaskは対応時のみ併記。Worker/OffscreenCanvas/ImageBitmap対応情報もJSONへ保持。LS/OffscreenCanvas/longtaskの対応は表示へ反映。新しい保存キーや記録の永続化はせず、計測結果はメモリ内のみ。
- 「表示固定」で10件とコピー用データを固定。「コピー」で全内訳を取得。Clipboard不可（iPhoneのHTTP接続等）では長押し用テキスト欄を表示。リロードすると計測記録は消えるため、撮影/コピーしてから再読込する。
- 通常のゲームURLへ `?perf=1`（既にクエリがあれば `&perf=1`）を付けてゲームを起動し、症状が出たら「表示固定」を押してスクショを撮る。W=Worker停止フラグ、Q=待機数、R=解像度、C=画像枚数。コピー結果があれば上位3件以外の内訳も調査できる。
- 検証: 重点8テストPASS（計測7件/かな1件）。最終全164テストPASS（234.4秒、失敗0）。Chromeの実ハブ→ゲーム経路、390×844/1280×800で10件を1枚に収め、横はみ出し/縦スクロール0を確認。全指定タイマーを実ゲームで確認し、通常モードの元関数/Native Storage保持、表示固定/コピー/Clipboard不可時、終了時の全フック復元、Worker/OffscreenCanvas/longtask非対応でも起動を確認。135アセットのHTTP200/作業ファイル一致を確認。
- 画像とJSON: `iron-squad/docs/validation/perf-diagnostics-v6.11.12/`。`normal-mobile.png`（通常）、`natural-walk-mobile.png`（CPU4倍の実移動）、`injected-ten-mobile.png` / `injected-ten-desktop.png`（検証用遅延で10件表示）、`unsupported-mobile.png`（非対応）。結果 `browser-playtest.json`。試験用遅延は再現ツール内だけにあり、製品コードに待機処理を入れていない。
- 約16秒のChrome実移動と試験用の画像受信/Storage遅延は計測器の確認であり、iPhoneの周期停止の原因特定/修正を示すものではない。iPhone実機の検証はこれから。
- 引き継ぎ CURRENT_WORK.md/SPEC_AND_HANDOVER.mdを更新。変更前ZIP `iron-squad/docs/backups/20261014-before-perf-panel-v6.11.12.zip`、最終ログ `iron-squad/docs/backups/full-tests-v6.11.12-final.log`。追加文言のかな読み6語はゲーム側だけへ追加。

- 最終版のブラウザー再検証も成功（ページエラー0、135アセット一致）。164テストの生成PNG3枚を指定どおりgit checkoutで復元。124ファイルの構文検査/git diff --checkも通過。

## 追加作業の結果（v6.11.13 / cache v263）

- 「メニュー → 戦況 → 計測表示」へON/OFFを追加。いつものセーブを開いたまま、再読込なしで切替。初期値OFF。ONは端末キー `game_studio_ironsquad_perf_enabled=1` へ保存し、ゲーム終了/再起動後も維持。OFFはこの設定キーだけ削除。
- OFFでは関数/Storage/Workerハンドラー/Observer/タイマーをすべて元へ戻し、予約済みのrAFも元ループへ再予約。既定OFFでは計測フックなし（設定UIとキーの読込のみ）。設定を書き込めなくても表示は切替でき、保存失敗を案内する。`?perf=1` も保持し、そのURLでOFFにした場合の次回ONを画面に説明。
- 全167テストPASS（248.1秒、失敗0）、重点11件PASS。生成PNG3枚をgit checkoutで復元。Chrome390×844/1280×800の実ハブ経路で既存セーブを開く→ON→100ms超を記録→再起動ON→OFF→再起動OFF、反復切替、URL指定、終了時解除を確認。切替で保存バイト/プレイヤー/地形を保持、OFF後も実ジョイスティックで約333単位移動。135アセット一致、ブラウザーエラー0。
- 検証 `docs/validation/perf-switch-v6.11.13/`（設定OFF/ONと計測中の画像、browser-playtest.json）、ツール `tools/playtest-perf-switch.mjs`、全件ログ `docs/backups/full-tests-v6.11.13.log`、変更前ZIP `docs/backups/20261014-before-perf-switch-v6.11.13.zip`。
- CURRENT_WORK.md/SPEC_AND_HANDOVER.mdを更新。編集はiron-squad/だけ。計測スイッチのみで、推測による原因修正なし。コミット/プッシュなし。iPhoneホーム画面アプリの実機確認・周期停止の原因特定は未実施。

- 最終確認: 125ファイルの構文検査とgit diff --check通過。ブラウザーの再撮影後も全切替操作/135アセット一致/エラー0を確認。途中のHTTP確認でWindowsの一時ポートエラーEADDRINUSEが1回出たが、再試行で成功。テスト生成PNGの差分なし。

## 原因（2026-10-14 23:28 iPhone 17 実機の計測で判明）
- 止まった10件のうち9件で「枠更新」（`saveSlots.update`。同期の `saveGame()`）が 515〜961ms かかっていた。W0 Q0 で、地形ワーカーは正常。地形・フォグは無関係。
- 発生源: 休憩中（`REST_DURATION=8` 秒）に `phase-rules.js:27` から毎秒呼ばれる `processRestSecond()`。その末尾（`index.js` 5693行付近）の `this.saveGame()` が同期保存になっている。1秒ごとの処理と約0.55秒の停止で、間隔が約1.5秒になる。画面の背景にも休憩中の「強化」表示が出ていた。
- 回帰の理由: 毎秒の同期保存は前からあった。ただし d46faf3 で同期保存に LZW 圧縮（メインスレッド）が入り、v6.11.11 で読み戻し検証（解凍）も加わったため、大きなセーブでは1回あたり約0.5秒になった。昨日までは JSON 化と `setItem` だけで軽かった。
- 「ダッシュ中・新しい領域」は休憩時間と重なっていただけと考えられる。新規データでは起きないのは、セーブが小さく圧縮の対象外（128,000文字未満）だから。

## 修正作業（v6.11.13 の続き）
1. `processRestSecond()` の毎秒の `saveGame()` は**削除する**（ユーザー判断: そんなに頻繁に保存する必要はない）。休憩は8秒だけで、休憩終了時（`index.js` 5708行付近の第N期開始）の保存、10秒ごとのオートセーブ、hidden 時の保存で足りる。途中で落ちても、自己強化の数秒分が巻き戻るだけで、お金と強化は整合する。
2. ゲーム中に繰り返し呼ばれる、ほかの同期 `saveGame()` も見直す。プレイ中に自動で走る経路（昼夜の切替 5669行付近、波の開始・終了 5655/5708行付近、侵攻の判定 5228行付近、エンカウント 8203行付近 など）は `background:true` にする。
   - 同期のまま残すのは、データ消失を防ぐ必要がある場面だけ: `visibilitychange` の hidden、ハブに戻る（`btn-back`）、セーブ画面へ移る、ゲームオーバーや全滅の記録、地点セーブ（`supply-rules.js` の `saveCheckpoint`）。
   - メニュー内のボタン操作（購入、編成など）で呼ぶ保存も、連打で止まるようなら background を検討する。判断と一覧を結果に書く。
3. background 保存は連続で呼ばれても、古いジョブが新しい保存を上書きしないこと（既存の revision 判定）。最後の1回が確実に書かれることをテストで確認する。
4. 計測表示はそのまま残してよい（既定オフ）。
- 守ること: 全テスト PASS、版上げ（v6.11.14 など）、`git add -A` 禁止、コミット・プッシュしない。
- 確認: 大きなセーブ（600KB 程度）を用意し、CPU 4倍スロットルで休憩時間をまたいで 100ms 超のフレームが出ないことを計測する。

## 修正作業1〜4の結果（v6.11.14 / cache v264）

- 現行v6.11.13のファイルを保持して変更を追加。`processRestSecond()`末尾の毎秒保存を削除。8秒間の自己強化は従来どおり実行し、休憩終了/10秒自動保存/hidden時の保存へ任せる。
- プレイ中の自動保存を `background:true` に変更。昼夜切替、期の終了/休憩終了、侵攻抽選/出撃/到着/終了、遠征の自動召還/帰還、経験による昇進、戦利品/宝珠/自動装備/国庫買取、ダンジョン遭遇/宝箱、限定兵加入、NPC救出報酬、自動募集の停止を含む。従来の10秒自動保存は背景保存を維持。
- メニューも連続操作でLZW圧縮/読み戻しを毎回同期実行しないよう、結果をその場で待たない保存を背景化。商人の購入/回復、装備/継承/強化/昇格/譲渡/売却/保護、兵士の編成/雇用/放逐/資金支援/栄誉、寄付/国家設定/工房/組合/カジノ、補給/蘇生薬/部隊薬/全回復、酒場、身だしなみ、司令部メニューを開く際の保存。ゲーム状態変更の処理は変更せず、保存受付の方式だけ変更。
- 同期のまま残す一覧と理由:
  - hiddenのvisibilitychange、ハブへ戻るbtn-back、セーブ画面へ移るbtn-restart-from-strat: 次の画面/停止前に書込みを完了する。
  - gameOverの `saveSlots.update(...state:'fallen')`: 死亡/全滅状態を完了確認して記録する。
  - supply-rules.saveCheckpoint: `saveGame({persist:false})`で時点を作り、update/createを同期で完了させ、保存成功の通知を返す。
  - startFreshGame/resumeSavedGameと隊長作成・生存記録再開の直接update: 初期記録/旧保存の正規化を起動時に確定する。
  - startPlatoonExpedition/toggleSoldierLock: 書込み失敗時に派遣/保護設定を巻き戻す現在の結果保証を保持する。背景受付だけを成功扱いにしない。
  - `saveGame()`の既定値自体: 明示保存と上記の同期利用を維持。Workerが使用不能/故障した場合の同期救済も従来どおり。
- revision判定/保存Worker/圧縮方式は変更していない。12回連続の背景依頼を順順/逆順で応答して、古い11件superseded・最後の1件saved、お金/休憩/強化の最終値、他枠/地点保存の保持を追加テストで確認。実休憩8tickの途中に書込み/保存依頼なし、期と休憩終了/昼夜は背景保存、最終保存のお金と強化装備の整合も確認。重点19テストPASS。
- 計測表示は既定OFF・即時切替/端末保持/URL指定を維持。表示バージョンを6.11.14に更新。ゲームのキャッシュはv264、変更モジュールの内部参照を更新。編集はiron-squad/だけ。コミット/プッシュ/ステージなし。
- CPU4倍のChrome390×844・48人編成、約610KB UTF-8のセーブ一覧（現行データ＋実データの地点記録）で計測。試験環境だけで旧毎秒同期保存を復元すると、休憩8tickに同期保存の停止を再現。修正後の自動saveGameは背景受付だけで約30〜40ms、毎秒の保存による停止は消えた。
- **指定の「休憩をまたいで100ms超なし」は、この48人編成では未達。** 修正後も期終了/休憩終了の2件に約2571ms/約1263msの処理が残った。追加の実測で共有装備評価 `processSharedEquipmentBox` が計3回/約3370ms、そのうち `supplyMissingEquipment` 内からも呼ばれていた。`recalcSoldierStats`が11668回/約1276ms（包含時間で、他の値と足さない）。保存タイマー以外の更新部分が長く、保存修正の成功と全フレーム100ms以下を混同しない。修正作業1〜4の範囲を越える共有装備評価の最適化は行っていない。
- 最初の現行バッグ約460装備の大型化試験でも、毎秒保存は消えたが同じ境界の長時間処理が残った。`active-inventory-stress.json`へ保存。一覧サイズと現行装備処理を切り分けるため、地点記録を含む約610KB一覧でも再計測し、同様の2件を確認。入力は期終了時の既存リセット後に再操作して、修正後に約2751単位移動。
- 計測資料 `docs/validation/rest-background-v6.11.14/`、再現ツール `tools/playtest-rest-background-save.mjs`、ログ `docs/backups/browser-rest-background-v6.11.14.log`、変更前ZIP `docs/backups/20261014-before-background-events-v6.11.14.zip`。実機での修正後確認は未実施。

- 全169テストPASS（130.7秒、失敗0）。ログ `docs/backups/full-tests-v6.11.14.log`。生成プレビューPNG3枚を指定どおりgit checkoutで復元。126ファイルの構文検査/git diff --checkを確認。

- 最終再計測: 約610,123 bytesの一覧、48人、CPU4倍、8回整備。旧毎秒保存を戻した比較では100ms超9件→修正後2件。残ったフレームは約2452ms/1066msで、保存ではなく更新部分が約2435ms/1050msを占めた。共有装備評価は3回/約3010ms、recalcSoldierStatsは11650回/約1141ms（包含）。保存受付5回は約32〜42ms。実移動約2749単位、休憩終了の保存と整備回数/支出/兵士のお金/装備強化が一致。
- 実Workerの12連続依頼も古い11件superseded/最後savedを確認（最終gold=211）。直後のhidden同期保存gold=222を古い背景依頼gold=999が上書きしないことも確認。ブラウザーエラー0。`browser-playtest.json`に `savingRegressionFixed=true` / `allFramesAtMost100ms=false` を明記し、100ms条件のassertion失敗を隠さずログへ記録。最終ログ `docs/backups/browser-rest-background-v6.11.14-final.log`。
