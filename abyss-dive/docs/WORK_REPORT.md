# ABYSS DIVE — 作業報告（過去ログ）

新しい作業をしたら、**この上に1セクション足す**（新しい順）。日付 / 版 / やったこと / なぜ / 検証 / 残したこと / つまずいた点。

---

## 2026-11-24 / v2.1.0（試作・未公開・改訂3）— 照明弾の照射範囲を約2.5倍（340→850px・中心光量は据え置き）

> **状態: 試作・未公開。** 隔離 worktree `abyss-flare-light-tree`（公開ベース `0990c1f771f5455bec82b855f3830f9e9fc2731c`、stage/commit/push なし）。ユーザー:「照射範囲が狭いな。2.5倍くらいに広げて」。

### やったこと（前版からの変更・照明半径だけ）
- **照射半径を約2.5倍**: `FLARE.LIGHT_R` を **340 → 850**（見える広がりの距離。面積ではなく距離で2.5倍）。**弾本体・芯・軌跡のサイズ、上昇・約10秒の沈降・着底消光・上限3・無制限・無ダメージは不変**。
- **調べた場所（すべて揃えた）**: `flare-rules` の `LIGHT_R`／`deep-light-rules` の `flareCovers`／`game.js` の (a) 暗幕 punch、(b) 敵ディテールマスク、(c) 水中グロー。**3 か所とも半径 `LIGHT_R*(係数)` に統一**（punch/mask 0.82+0.18s、glow 0.72+0.28s）。
- **中心光量は据え置き**: `LIGHT_R` に比例する新しい「広く柔らかい減衰」の `punchFlare` とマスクを追加（中心の強さは前版と同じ）。加算グローは**前版と同じ固定サイズの乳白の芯**＋別の「広く薄い散乱」に分け、半径を広げても**中心の明るさが変わらない**ようにした。
- **攻撃予告を消させない**: 深い区間の予告（砲口チャージ）を**加算光の後に描く**パス `drawWatchTelegraph` に移した（広い照明で塗りつぶさない）。**暗幕の全体設定・艇ライトは不変**。
- 版（試作）: `sw-assets version v34→v37`、`js/flare-rules.js?v=3→4`、`index.js game.js?v=34→37`。

### 検証（隔離 worktree・横持ち Chromium 764×429。実機とは称しない）
- `node --test abyss-dive/tests/*.test.mjs` → **364 件すべて通過**（`FLARE.LIGHT_R` が ≈850 の回帰ガードを追加）。変更 JS を `--check`。JS エラー 0。
- **旧/新 同条件の深海画面**（同一の固定照明弾・同一の敵・同一カメラ。照射半径だけを実行時に 340↔850 に切替）:
  - 距離プロファイル（対象の輝度 mean）: **412px** 26→70（旧は暗・新で読める）、**614px** 25→49、**794px** 24→28、**955px** 5.5→5.5（**新850の外＝対照は不変**）。旧半径(340)では 412px 以遠はすべて旧と同じ暗さ。
  - 対象（≈510px）: 基準/旧340 = 21.8 → **新850 = 55.4**。中心: 旧 128.8 → 新 130.6（**ほぼ同一＝中心光量は維持**）。
  - 目視（別 AI）でも「3枚目は明確に広い・右のイカ砲手が3枚目だけ読める・暗部は暗いまま・中心は乳白で白飛びしない」。
- **3発重なり（白飛び/予告）**: 3 発をほぼ同位置に重ねて、**輝度≥250 の画素は 0.039%**（1発 0.017%、基準 0.012%＝**白飛びなし**）。砲口の予告は 3 発重ねでも **R244/G217/B138**（B が低いまま＝黄色を保持、消えない）。
- **負荷**: 深海（広い照明＋弾道）**57.2fps**（前版 60.4 と同程度）。
- **短尺 MP4（実時間）**: `ABYSS_FLARE_reach_realtime.mp4`（実キャンバス約6.1fps取得＝**再生 11.97s ≒ 実時間 12.01s**）。遠方の目標（≈670px）が **7.0 → 16.2** に読める。比較 PNG: `ABYSS_FLARE_reach_old_vs_new_1x3.png` / `ABYSS_FLARE_reach_profile_1x3.png` / `ABYSS_FLARE_overlap_1_vs_3_1x3.png`、コンタクトシート `ABYSS_FLARE_reach_2x4.png`。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-flare-light-tree\_flare_lab\evidence\`。

### 残したこと
- 公開判断（**未公開**）。`LIGHT_R=850`・減衰の各係数は試遊で調整する叩き台。
- **実 iPhone 未確認**。main／他試作／Gemini 不触。

### つまずいた点
- 加算グローを半径比例で広げると中心の stop 位置も動き、**中心の明るさが 101→113 にズレた** → グローを「固定サイズの芯＋広く薄い散乱」の 2 段に分けて中心を据え置き（128.8→130.6）。
- 広い照明が**砲口の予告を白く塗りつぶした**（B 119→193） → 予告を**加算光の後に描く**パスへ移して解決（B 138 に）。

---

## 2026-11-24 / v2.1.0（試作・未公開・改訂2）— 照明弾の沈降をさらに低速化（頂点→接触 約10秒）

> **状態: 試作・未公開。** 隔離 worktree `abyss-flare-light-tree`（公開ベース `0990c1f771f5455bec82b855f3830f9e9fc2731c`、stage/commit/push なし）。ユーザー:「もっと遅くだね。ゆっくり落ちてしっかり照らす。10秒くらいかけて落ちるくらいでいい」。**上昇の見せ方は前版のまま**。

### やったこと（前版からの変更）
- **沈降をさらに低速化**: 落下の終端速度 `FLARE.FALL_MAX` を **110 → 27 px/s**（重力 `GRAV=236`・角度 `-0.6`・初速 `480` は据え置き＝**上昇／頂点の見た目は前版と同一**）。床距離で時間は変わるため固定秒数には合わせない（要望どおり）。
- **安全寿命を十分延長**: `FLARE.LIFE` を **12 → 24 s**（沈降が長いので、落下を見せる前に切らない）。
- 着底の減衰は前版どおり `FADE=0.55s`。**色・弾数無制限・同時上限3・無ダメージ・地形衝突（壁/天井すり抜けなし・海底/下の地形で着底）は保持**。
- 版（試作）: `sw-assets version v33→v34`、`js/flare-rules.js?v=3`、`index.js game.js?v=34`。`gameVersion 2.1.0` のまま。

### 検証（隔離 worktree・**前回と同条件**＝発射 y=2370 / 同じ岩 y=2586・r=98 の上面。横持ち Chromium 764×429。実機とは称さない）
- `node --test abyss-dive/tests/*.test.mjs` → **363 件すべて通過**（`flare-rules` 15・`deep-light` 3。着底テストの床を浅くして低速化に追随）。変更 JS を `--check`。JS エラー 0。
- **実プレイの実測（同条件）**: 発射 y=2370（`vx>0/vy=-267`）→ **頂点 t=1.19s・y=2221（前回と同値＝上昇不変）** → **岩接触 t=11.23s**（着地点 y=2488＝岩の上面、めり込みなし）→ 光度 0.82→0.24→0（約0.55sで自然に消光、`off t=11.54s`）。**頂点→接触＝10.04 秒**（目安 9〜11 秒内）。沈降速度は実測 約27px/s。
- **沈降中は明るさを維持**: 飛翔中の光度は `1`（寿命の最後 0.6s 以外は 1）、着底で 1→0 へ単調に減衰。
- **入力・不変条件（保持を再確認）**: 照準を後ろ下向きにしても発射は `vx=341>0, vy=-232<0`（前方斜め上・照準非依存）／**「撃つ」ホールド＋「照明」同時タップで弾と照明弾が両立**／4回点灯→**同時3（上限）**／敵HP不変（6/6）・資源0。
- **負荷**: 深海（マスク＋沈降中の照明弾）**60.4fps** ＝ 実測差なし。
- **短尺 MP4（実時間・タイムラプスではない）**: `ABYSS_FLARE_arc_slow_realtime.mp4`（実キャンバスを約6.4fpsで連続取得＝**再生 11.72s ≒ 実時間 11.76s**。着底/消灯まで）。フレームのコンタクトシート `ABYSS_FLARE_arc_slow_2x4.png`。目視（別 AI）でも「3/5/7/9 秒の沈降中も明るく点灯・淡い乳白〜琥珀・局所ハロー・着底で減衰」を確認。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-flare-light-tree\_flare_lab\evidence\`。

### 残したこと
- 公開判断（**未公開**）。`FALL_MAX=27`・`LIFE=24` は試遊で調整する叩き台（床距離で頂点→接触の秒数は変わる）。
- **実 iPhone 未確認**。既存造形・main／他試作／Gemini は不触。

### つまずいた点
- 終端速度を下げるだけだと既存の着底テスト（床 700・8 秒上限）が間に合わなくなる → テストの床を浅くしループを延長（低速化に追随）。
- キャプチャは 1 フレームごとに `toDataURL` の往復があり約6.4fps が上限 → **その実測 fps でエンコード**して実時間再生に合わせた（タイムラプスにしない）。

---

## 2026-11-24 / v2.1.0（試作・未公開・改訂）— 照明弾を弾道へ（前方斜め上→頂点→ゆっくり沈む→着底で消灯）

> **状態: 試作・未公開。** 隔離 worktree `abyss-flare-light-tree`（公開ベース `0990c1f771f5455bec82b855f3830f9e9fc2731c`、stage/commit/push なし）。ユーザー承認の軌道修正＋最新指示（雰囲気優先）を反映。**数値は試作であり全世界には適用しない。** 下の v2.1.0（初版＝照準方向へ直進）を置き換える。

### やったこと（初版からの変更）
- **弾道化**: 照準に関係なく**艇の前方斜め上**へ発射（`FLARE.ANGLE=-0.6`≒34°・初速480）。重力で上がって頂点（上昇≒156px）を越え、**水中をゆっくり沈む**（`FALL_MAX=110` の終端速度／前進は `DRAG=0.9` でなめらかに減衰）。落下中も**通常発光を保つ**。
- **接触と消灯**: `js/game.js` が本編と**同じ地形の当たり**（`worldGeometry()`＝海溝の壁・岩棚・岩 ＋ 海底 `floorY(x)`＝trench-aware ＋ 画面上端 `ceilY`）を `env` で渡し、`flare-rules` が `geometry-rules` の**掃引判定**で接触。**海底/下の地形の上面に接したら短く減衰（`FADE=0.55s`）して消灯**。**壁・天井は面へ入る成分だけ消す＝すり抜けない**（滑って落ちる）。底が極端に深い場合は**安全寿命 `LIFE=12s`**（落下を見せる前には切らない）。同時上限3・短い間隔0.34s・弾数無制限・ダメージなし・他操作と同時タッチは維持。
- **色**: 赤固定を撤回。**白に近い淡い乳白の芯＋淡い琥珀の柔らかい散乱**（`drawFlareBody`/加算光）。**赤い火球・画面全体の色被り・強い白飛びを避ける**。軌跡は短い淡い残像（comet）。暖色は弾周辺だけ。**既存の攻撃予告・航路・暗幕は維持**。
- 版（試作）: `sw-assets version v32→v33`、`js/flare-rules.js?v=2`・`js/deep-light-rules.js?v=2`（`flareIntensity` を flare-rules へ移設）。`gameVersion 2.1.0` のまま。

### なぜ
ユーザー: 「斜め上の前方に放たれて下に落ちるまで光続けるでいいよ。まさにコンセプトのやつだね」→「ぶっちゃけ雰囲気優先なのでコンセプトよりもゆっくり落ちて光続ける感じで。光も赤じゃなくていい」。**仕様はユーザー文を正**とする。

### 検証（隔離 worktree・横持ち Chromium 764×429。実機とは称さない）
- `node --test abyss-dive/tests/*.test.mjs` → **363 件すべて通過**（新規 `flare-rules` 15・`deep-light` 3）。変更 JS を `node --input-type=module --check`。JS エラー 0（`error`/`unhandledrejection` 収集も空）。
- **実地形でのライフサイクル実測**（海底面上・`y=2380` 深海層）: 発射(2046,2370, vx>0/vy=-267) → **頂点 t=1.11s（y=2221＝上昇156px）** → **着底 t=3.86s**（岩の上面 y≈2488 に `y+R` が一致）→ 光度 0.85→0.58→0.30→0.03→0（**約0.55sで自然に消光**）。落下は約96px/s＝ゆっくり。
- **海溝（`bossKills=1`）の実地形で接触**: 岩棚 `ledgeR1`（下面 y=3102）へ上昇して**最小 y=3110（＝3102+R）で上昇停止**、その後すり抜けず落下。**めり込み違反 0 件**（150 サンプル、solid 内包チェック）。天井/壁とも貫通なし。
- **入力（実タッチ・改訂後）**: 照準を**後ろ下向き**にしても発射は `vx=341>0, vy=-232<0`（前方斜め上・照準非依存）／**「撃つ」ホールド＋「照明」同時タップで弾と照明弾が両立**／4回点灯→**同時3（上限）**。
- **非攻撃の不変条件**: 照明弾はダメージ/資源/装填を持たない（敵HP不変・資源0・武器/自動攻撃に影響なし）。
- **「光を当てて初めて見える」との両立**: 同条件 無照射→艇ライト→照明弾→消灯。対象（イカ砲手）の画素測定 ① 22.5/17.1 → ② 63.5/44.1 → ③ 44.4/30.2 → ④ 22.5/17.1（＝①に戻る）。射線外の個体は全状態で不変。
- **負荷**: 深海（マスク＋弾道の照明弾が飛行中）60.8fps / 通常 61.2fps ＝ 実測差なし。
- **短尺 MP4**: `ABYSS_FLARE_arc_sequence.mp4`（実キャンバスを連続取得。発射→頂点→落下点灯→着底→消灯）。フレームのコンタクトシート `ABYSS_FLARE_arc_2x4.png`。目視（別 AI）でも「前方斜め上→弧→ゆっくり沈む・淡い乳白〜琥珀・局所ハロー・終端で減衰」を確認。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-flare-light-tree\_flare_lab\evidence\`。

### 残したこと
- 公開判断（**未公開**）。数値（角度・初速・重力・終端・寿命・減衰・照らす半径・上限）は**試遊で調整する叩き台**。
- 既存の造形は不変（`squid-gunner.webp` のまま）。`abyss-gunner-art-tree` の承認造形の移植は未実施。
- **実 iPhone 未確認**（狭幅/横持ち/実タッチはデスクトップのエミュレーション）。

### つまずいた点
- 弾道は「頂点→落下」で見た目の到達距離が伸びるため、初版の直進前提の照明（近距離で急減衰する見える光条）では遠くが読めない → v2.1.0 初版で入れた**マスク専用の緩い減衰の白コーン**をそのまま使って解決。
- 深い空間では落下が長く、寿命が短いと着底前に消える → **LIFE を 12s に**（落下を見せる前には切らない）。底が極端に深い場合のみ安全寿命で消える。

---

## 2026-11-24 / v2.1.0（試作・未公開）— 弾数無制限の照明弾 ＋「光を当てて初めて見える」深海区間

> **状態: 試作・未公開。** 隔離 worktree `abyss-flare-light-tree`（公開ベース `0990c1f771f5455bec82b855f3830f9e9fc2731c` = main v2.0.1 の detached worktree、stage/commit/push なし）。原案（ユーザー）: 「照明弾の重要性も増すし光を当てて初めて見えるでもいいかもしれないね」「ぶっちゃけエンドレスで照明弾撃つでもいい」。**数値は試作であり全世界（通常バランス）には適用していない**。

### やったこと
- **照明弾（非攻撃の光）** を追加。一押しで 1 発・**弾数無制限（資源/弾薬を消費しない・補給/装填なし）**・短い連射間隔・**有限寿命**・**同時点灯の上限**（あふれたら**残り寿命の短い＝古いもの**から消す）。初期方向は**前方／現在の照準**（狙った先を照らせる）。出撃ごとにリセット（持ち越しなし）。**敵/岩にダメージ・ノックバックなし、武器の装填・自動攻撃・資源に影響なし**。
  - 新規 純粋ルール `js/flare-rules.js?v=1`（`FLARE` 数値＋`createFlareState/fireFlare/tickFlares/resetFlares`）。描画・入力・更新は `js/game.js` 側。
  - 入力は**明示の「照明」タッチボタン**（`Input.ui` に `id:'flare'` を1つ追加、既存の仮想スティック/撃つ/ミサイル/バリア/ソナー/ポーズ/降艇とは別位置・当たり重複なし）と**キーボード `F`**。押した瞬間だけ（`Input.wantFlare`）、`clearFireHold`/blur/ポーズ/出撃でクリア。
- **「光を当てて初めて見える」代表の深い区間**（`y>=1750`＝漸深層〜超深海だけ。**通常海域は原則これまでどおり**）。新規 純粋ルール `js/deep-light-rules.js?v=1`（`LIT_WATCH`/`inLitWatch`/`flareIntensity`/`flareCovers`）。
  - `js/game.js` の `drawDeepWatch`（暗幕の後・加算光の前）で、**ライトのマスク**（自艇の灯＋ツイン光条＋照明弾）を作り、対象の敵のディテールを `destination-in` で切り抜いて**当たった側だけ**読ませる（低コスト Canvas2D マスク、ハーフ解像度）。その下に**薄いシルエット**（`SILHOUETTE_ALPHA 0.22`）を残して所在は分かる。**砲口のチャージ予告は光に依らず残す**。
  - 深い区間だけ、**イカ砲手の恒常的な punch（水と本体をまとめて明るくする）を 0 に弱め**、あらかじめ照らさない。見た目の光条（`beamTexture`）は近距離で急減衰するため、**マスク専用の緩い減衰の白コーン**（`litBeamTexture`）を追加（可読性のためのマスクで、見える光条・当たり・造形は不変）。
  - **画面全体を暗くするだけ／敵全身を一律に明るくするだけ／予告を消す、のいずれもしない**。**既存の造形は変更しない**（`squid-gunner.webp` をそのまま使用。`abyss-gunner-art-tree` の承認造形＝部位 WebP の移植は、造形を変えない方針のため今回は見送り＝README に記載）。

### なぜ
要望は「エンドレスで撃てる照明弾」と「光を当てて初めて見える深海区間」。既存の暗幕は画面全体を一律に暗くし、イカ砲手は恒常 punch で水ごと明るくなるため、**光が当たった側だけ読ませる**には (a) 非攻撃で撃ち放題の光と (b) 当たり面だけを見せるマスクが要る。

### 検証（隔離 worktree・横持ち Chromium 764×429／狭幅 640×300。実機とは称さない）
- `node --test abyss-dive/tests/*.test.mjs` → **358 件すべて通過**（既存 345 ＋ 新規 13: `flare-rules.test.mjs` 10 / `deep-light.test.mjs` 3）。全変更 JS を `node --input-type=module --check`。JS エラー 0（`window.__abyss.errors` 空＋`error`/`unhandledrejection` 収集で空）。
- **同条件の実キャプチャ（撮影は実際の描画。遮蔽なし・同ステージ `y=1900` 深海層・同じ 2 体のイカ砲手）**: 無照射 → 艇ライトを振る → 照明弾 点灯 → 消灯。**同位置・同一体の画素測定（グレースケール平均/コントラスト）**:
  - 対象（右上のイカ砲手）: ① 無照射 **mean 22.8 / contrast 17.2**（薄いシルエット）→ ② 艇ライト **63.5 / 44.1**（肉・腕・砲が読める）→ ③ 照明弾 **56.2 / 36.8**（読める）→ ④ 消灯 **22.8 / 17.2＝①と同一**（シルエットへ戻る）。
  - 射線外の別個体（左下）: 全状態で **10.1 / 6.2 不変**（光が当たらない側は明るくならない）。
  - 目視（別 AI）でも「②③ は 肉/腕/砲が読め、①④ は薄いシルエット」「④ は ① と同等に暗い」と一致。
- **短尺 MP4**（同ステージ・照明の一連）: `ABYSS_FLARE_light_sequence.mp4`（実キャンバスを 12fps で連続取得）。
- **入力（実タッチイベント）**: 「照明」タップで 1 発／間隔内の再タップは不発／**5 回点灯→同時 3（上限）**／**上限＋1 で最古 id が落ちる**。**「撃つ」ホールド＋「照明」同時タップで 弾（bullets）と照明弾が両立**。**`F` キー**で発射。狭幅 640×300 でも「照明」が画面内・他ボタンと非重複。
- **非攻撃の不変条件**: 照明弾を敵へ 3 回当てて **敵 HP 不変（6/6）**、**資源 0 のまま**、武器/自動攻撃に影響なし。
- **寿命・場面復帰**: 1.0s で flares=1 → 4.2s で 0（有限寿命）。ハブ「← もどる」→再加入で `flares:[]/fired:0`（持ち越しなし）、JS エラー 0。
- **負荷**: 深海（マスク描画オン・敵 2）**61fps** / 通常（浅）**59.5fps** ＝ 実測差なし。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-flare-light-tree\_flare_lab\evidence\`（`01_nolight.png` `02_boatlight.png` `03_flare.png` `04_off.png` `05_telegraph.png` `06_normal.png` `07_narrow.png` `ABYSS_FLARE_sequence_1x4.png` `ABYSS_FLARE_g1_zoom_1x4.png` `ABYSS_FLARE_light_sequence.mp4`）。

### 残したこと
- 公開判断（今回は**未公開**・stage/commit/push なし）。`abyss-flare-light-tree` は隔離 worktree。
- 照明弾の数値（寿命 3.4s / 間隔 0.34s / 上限 3 / 到達≒760px / 照らす半径 360 / シルエット 0.22）は**試遊で調整する叩き台**。全世界には適用しない。
- `abyss-gunner-art-tree` の承認造形（部位 WebP）の移植は未実施（造形を変えない方針）。照明比較の品質をさらに上げたい場合の選択肢。
- **実 iPhone 未確認**（狭幅/横持ち/実タッチはデスクトップのエミュレーション）。`ctx.filter` 等は使っていない（Canvas2D の `destination-in` のみ）。

### つまずいた点
- 撮影中にシミュレーションが進み構図が動く（プレイヤーが流れる・敵が移動する）。→ **毎フレーム後段で状態を再設定する rAF フック**で固定してから撮影（`requestAnimationFrame` は登録順でゲームの `frame()` の後に走る）。
- 見える光条（`beamTexture`）は近距離で急減衰し、遠くの敵をマスクで読ませられない。→ マスク専用の緩い減衰の白コーンを別途用意（見た目・当たりは不変）。

---

## 2026-11-23 / v2.0.1（統合候補）— 製作/指定開発の「結果モーダル」と基地UIの文字拡大を、v2.0.0（ストーリー公開版）へ統合

### やったこと
- 公開 main `c3d7378ee98254c337201cd0fe9397e6ff918c77`（v2.0.0 / sw v30）を基点に、別 worktree `abyss-v201-craft-release-tree` を **detached** で作成（main は不触、stage/commit/push なし）。入力は隔離試作 `abyss-craft-result-tree`（基点 `602867b9` = v1.18.0、親が見た `FIX_result_*` の版・read-only）。その差分を **`git merge-file` の 3-way**（祖先=`602867b9`、ours=main、theirs=試作）で統合。`git apply --3way` は index を触るため使わない。
- 取り込み（許可範囲 `abyss-dive/` のみ）: **製作/指定開発の成功結果モーダル**（新規 `js/craft-result.js?v=1` ＋ `js/base.js`）と、**基地UIの主要文字の拡大**（`js/base-rules.js` の `BASE_UI.fonts` に集約、`js/base.js` は `font()` ヘルパで参照）。結果モーダルは**図のラベル帯と数値帯を上下に分離**した修正版（親レビュー後）。
- **保持（main 側の差分をそのまま残す）**: `base.js` の格納庫＝**火力型の専用船体**（`hasBespokeHull`/`drawShipBody`、`ship-rig.js?v=3`）／`base-rules.js` の**固定前哨**（`OUTPOST`/`outpostMarker`/`deepOpen` の責務分離）／`game.js` の**立ち絵・導入・艇モーション**（v2.0.0 の全変更）。新しい `intro-rules.js`・`intro.js`・`ship-motion.js`・立ち絵/火力型素材・他ゲーム・プレビューは上書きしない。
- 版（**v2.0.1 / sw v31**）: `sw-assets version v30→v31` / `gameVersion 2.0.0→2.0.1`、`index.js game.js?v=31→?v=32`、`game.js base.js?v=13→?v=14 / base-rules.js?v=8→?v=9`、`base.js base-rules.js?v=7→?v=9`・`craft-result.js?v=1` 追加、`package.json 2.0.1`、`sw-assets files` に `js/craft-result.js` を追加。**main に残っていた `base.js` の `base-rules.js?v=7` と `game.js` の `?v=8` の不整合も `?v=9` へ揃えて解消**。

### なぜ
要望「武器製作結果（○○ができました）と基地文字拡大を、ストーリー公開版の上に v2.0.1 として統合して検証。プッシュはしない」。main はストーリー公開の独立担当が検証中のため不触。

### 検証（統合後の候補で実施）
- **3-way の競合は 3 か所だけ**（`game.js` の import 2 行、`index.js` の `game.js?v=`、`sw-assets.js` の版）。いずれも人間の意味どおり（base.js?v=14 / base-rules.js?v=9 / game.js?v=32 / v31・2.0.1）に解決。他は自動で衝突なし。`base.js` は **main の火力型船体ロジック＋試作の結果モーダル/文字拡大**を、`base-rules.js` は **main の固定前哨＋試作の fonts/result/状態**を両立。
- **全件 diff check**: `game.js` は import の 2 行のみ、`index.js` は 1 行、`sw-assets.js` は版と `craft-result.js` 追加のみ（いずれも main からの差分）。
- `node --test abyss-dive/tests/*.test.mjs` → **345 件すべて通過**（対象 3 ファイル `base-ui117`/`weapons-loot`/`craft-result119` で 73 件）。全変更 JS を `node --input-type=module --check`。
- **横持ち Chromium 874×402 / 狭幅 640×360**（ハブ経由・実タッチ・SW 登録解除＋キャッシュ無効・**実機とは称さない**、JSエラー 0）:
  - ハブのカードは **v2.0.1**。起動で**初回ストーリー導入**（立ち絵 エリー / 話者名 / タップ送り）、**スキップ（Esc）→タイトル**、タイトル右下の**「↺ 物語をもう一度」で再視聴**（実タッチ）を確認。
  - **ボス0での前哨入港**: `bossKills=0` のまま固定前哨マーカー（6400,1560）へ寄せて `入港`（E）→ 前哨メニューが開く（`mode:'base'` / `screen:'menu'` / `msg:'入港 — 前哨基地'`）。
  - **通常製作（魚雷）**: 武器パネル→`製作する`（E）。結果モーダル `魚雷・粗悪ができました`（実ロールの弾形 sleek・威力×0.80・弾速675・間隔0.387・発熱0.322・外観標準）。資源 **50,000→49,880（-120ちょうど）**、倉庫 **0→1**、装備は `initial:torpedo` のまま（**自動装備なし**）。モーダル中に **E を4回連打しても倉庫 1→1（二重製作なし）**、選択も動かない。**Esc で閉じて武器画面へ戻る**。
  - **指定開発（通常レーザー）**: 開発→`通常レーザーを指定開発`→設計画面→`開発（通常レーザー）`。結果モーダル `通常レーザー・並ができました`（**ビーム**（反射なし）・指定開発・威力×0.94/弾速×1.05/間隔×0.95/発熱×0.95）。追加兵装 **0→1**、資源 **-140**。Esc で設計画面へ戻る。
  - **狭幅 640×360**: 基地メニューの項目名/説明/資源/閉じる/実行ボタンは**重なり・欠けなし**（右上の `安全区画` ラベルは右端に余白を残して完結）。結果モーダルも**画面内に収まり**、図のラベル帯と数値帯は重ならない。
  - **火力型の船体**: 艇の換装で `火力型` を装備 → 格納庫の船体が **09（光沢＋外部の箱/管）とは明確に別の、マットな専用船体**（`hasBespokeHull('firepower')===true`）で描かれることを 09 と見比べて確認。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-v201-evidence\`（`01_intro_replay_874.png` `02_title_after_skip_874.png` `03_dive_874.png` `04_outpost_approach_boss0_874.png` `05_base_menu_boss0_874.png` `06_weapon_panel_874.png` `07_result_modal_torpedo_874.png` `08_result_modal_laser_874.png` `09_base_menu_640.png` `10_result_modal_torpedo_640.png` `11_ship_panel_firepower_874.png` `12_hangar_firepower_874.png` `13_hangar_09_874.png` `14_hangar_firepower_874b.png` `cmp2_hull_09_vs_fp.png`）。作業ログ: `...\scratch\abyss-v201-work\`。

### 残したこと
- **未公開**（stage/commit/push なし）。基点 main は不触。ルートの `sw.js` / `index.html` は範囲外のため不触（SHELL_VERSION・`app.js?v=` は据え置き）＝ハブのシェル版は元のまま、`abyss-dive/sw-assets.js` の `v31` のみ更新。
- 狭幅の折り返し・行間の最終微調整、導入の実機での見え方、iPhone 実機・発熱は未検証。

### つまずいた点
- `git merge-file` は**全入力を LF に揃えないと全体が 1 つの競合ブロックになる**（Windows の CRLF 混在で発生）。CR を除去して 3-way し、結果を CRLF で書き戻した。
- ブラウザが**非表示（`document.hidden`）だと rAF が止まり**、`intro.update` の入力ロックが進まず操作が効かない。`Page.bringToFront`＋`Emulation.setFocusEmulationEnabled` で可視化してから実タッチで検証した。

---

## 2026-11-23 / v2.0.0（統合候補）— 冒頭ストーリー（会話用立ち絵つき）＋前哨基地の固定化

### やったこと
- 公開済み **v1.21.0（`214bf869`）から別の隔離リリース候補**を作り、隔離試作（旧基点 `602867b9`）の差分を統合。`js/game.js` は **3-way（git apply --3way）で衝突なく適用**、`js/base-rules.js`・新規 `js/intro-rules.js`・`js/intro.js`・テスト・立ち絵/ロボ素材を移植。`index.js`/`sw-assets.js`/`package.json` は手当て（game.js?v=31 / v30 / 2.0.0）。
- 内容は「冒頭ストーリー（16コマ・会話用立ち絵・タップ/スキップ・再視聴・初回のみ・既存セーブ非改変）」＋「前哨基地を世界の固定地点化（ボス不要の序盤導線、bossKills の責務分離、深部は従来どおりボス撃破で解放、HUD に父の信号）」。
- 立ち絵は倉庫 `portraits/GIRL`（エリー胸上: neutral/smug/surprised/sad）と `portraits/PONCO02`（ponco MarkII 全身: neutral/alert）。発話者を立ち絵＋話者名で明示、顔・文字・タップは重ならない。

### なぜ
要望「ストーリーラインをみたいので組み込んだら公開（冒頭ストーリー＋前哨固定・ボス不要の序盤導線、v2.0.0）」。公開承認はこの範囲で、**実際の commit/push は別のリリース担当**が行う。BGM・武器UI・前哨/通常海域の美術・都市マップは含めない。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **333 件すべて通過**（v1.21 の ship-hull 10 / ship-motion 12 を含む＋導入21・OW6）。並列高負荷時のみ既存 weapons-loot の1件がまれに落ちる（単体・`--test-concurrency=1` では常に緑）。
- 横持ち Chromium（ハブ経由・実タッチ・SW/キャッシュ無効・JSエラー0）:
  - カード **v2.0.0**。**公開版セーブの移行**（`game_studio_abyss_resources=1234` を注入→表示・潜航で 資源 1,234 を維持）。
  - 初回で導入（立ち絵つき）→ スキップ → タイトル → 潜航。タイトル右下で**再視聴**（step0）→ 再スキップ。
  - **ボス0**で前哨基地を発見 → 実タッチ「入港」→ 出港 → 再入港。**艇換装**（火力型の専用船体）を保持して潜航（資源・船体は移行）。
- 証拠（絶対パス）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-story-intro-evidence\` の `rc_wide_ellie.png`・`rc_narrow_ellie.png`・`rc_hull_firepower.png`。

### 残したこと
- iPhone 実機・発熱は未検証。
- 深棚以深のマップ、BGM、武器UI、前哨/通常海域の美術、都市マップは**別工程**（今回含めない）。
- 前哨座標 `{6400,1560}` と海溝の錨（前哨+1900）は仮値。

### つまずいた点
- `introView` に `portrait` を載せ忘れ、立ち絵が描かれない不具合を目視キャプチャで検出（テストは通っていた）。修正＋テスト追加。
- ハーネスの SW キャッシュで `intro-rules.js` の更新が反映されず、検証時に SW/キャッシュを消して確認（モジュール `?v` も更新）。

---

## 2026-11-23 / v1.21.0 — 【本番公開】火力型のマット外観と4艇モーションを main へ

**本リリースの公開版**: `main` へ commit / push。`abyss-dive` の `sw-assets` `version: v29` / `gameVersion: 1.21.0` / `package.json 1.21.0`。
下の v1.21.0 / v1.20.0 / v1.19.0 の3セクションは隔離作業ツリーで開発した記録。そのうち**「火力型のマット外観（船体）」と「4艇モーション」の範囲だけ**を本番へ反映した（地図・都市・BGM・特殊武器(special)・曳光・ヤドカリ等の他の未公開ツリーは混ぜていない）。

### 公開した差分（このリリース）
- `js/ship-rig.js` … 火力型の専用船体（`drawShipBody`/`hasBespokeHull`/`firepowerLandmarks`）＋ Blender 焼きの透過 WebP 板（`FIREPOWER_PLATE`/`firepowerPlateRect`、遅延ロード＋プロシージャルへのフォールバック）。`ship-rig.js?v=3`。
- `js/ship-motion.js`（新規）… 進行方向に応じた見た目のピッチ＋切り返しのひねり（純粋ルール）。`ship-motion.js?v=1`。
- `js/game.js` … 上記の配線（**見た目のみ**。当たり・照準・発射位置 `p.x/p.y/p.aim`・物理・バリア・艇の実性能は不変）。`game.js?v=30`。
- `js/base.js` … 格納庫・艇ドックで火力型の専用船体を描く。`base.js?v=13`。
- `js/index.js` … `game.js?v=30`。`sw-assets.js` … `version v29` / `gameVersion 1.21.0` / `files` に `js/ship-motion.js`・`assets/firepower-hull.webp`。`package.json` … 1.21.0。
- `assets/firepower-hull.webp`（新規・透過 WebP）／ `tests/ship-hull.test.mjs`・`tests/ship-motion.test.mjs`（新規）。
- 触っていない: 共有 `sw.js` / `GAME_IDS`、他ゲーム。

### なぜ
要望「火力型はそれでもなんか浮く。マットな質感の方がいいかも」＋「進行方向に伴って傾いたりひねったりするアニメーション」。マット塗装で明部の色温度を 09 に揃え、4艇共通の見た目の動きを足した。

### 検証（公開木で再実行）
- `node --test abyss-dive/tests/*.test.mjs` → **全 306 件通過**。変更 JS は `node --input-type=module --check` OK。`git diff --check` クリーン。ステージは明示パスで `git diff --cached --name-only` と照合（12 パス）。
- 実ゲーム（横持ち Chromium エミュレーション・ハブ経由）: 潜航で `state().hull === 'plate'`・`ship === 'firepower'`、4艇換装でモーション（pitch/bank/squash）が追従、JS エラー 0。WebP を拒否させると `procedural` へフォールバック。

### 実機（端末）での確認手順
1. 公開ハブ `https://duzymocco.github.io/-/` を端末のブラウザで開く（横持ち推奨）。
2. カード **ABYSS DIVE** をタップ（版 v1.21.0）。
3. 潜航し、基地の **艇の換装** で **火力型** を選ぶ（通常進行＝初回ボス後の基地などで入手・換装）。
4. 火力型の **マット塗装の船体**（青白い面反射なし・09 と同系の色温度）を確認。
5. スティックで上下・左右に動かし、**進行方向のピッチ**と**切り返しの短いひねり（バンク）**、減速で水平へ戻る動き、船体とライト/発射口がズレないことを確認。
6. 09／機動／バリア へ換装し、どの艇でも同じ動きが出ることを確認。
7. 発熱・実機 FPS は端末依存。**本検証は横持ち Chromium エミュレーションであり、iPhone 実機での確認ではない**。

### 残したこと / ローカル専用
- `tools/firepower_hull.py`（Blender 再焼きスクリプト）と比較キャプチャ（`docs/previews/`）は**ローカル専用で未公開**（`tests/ship-hull.test.mjs` は生成スクリプトの実在を必須にしない）。
- iPhone 実機・発熱は未検証（横持ち Chromium エミュレーション）。

---

## 2026-11-23 / v1.21.0（追補）— 火力型の船体をマット塗装版へ（青白い面反射の抑制）

隔離ツリー `scratch/abyss-hull-redesign-tree` の v1.21.0 の続き（**→ 本リリース v1.21.0 で公開**）。
**形状・座標・灯火発光・当たり・入力・他3艇は不変**。`tools/firepower_hull.py` の**材質のみ**編集して Blender 4.5 で再焼き。

### やったこと
- `tools/firepower_hull.py`: `paint()` に `spec`（誘電体の鏡面レベル）引数を追加。火力型の主要面（`steel`／`steel_d`／`plate`）の**金属度 .58/.60 → .05〜.08・粗さ .44〜.50 → .72〜.84・鏡面レベル .12〜.17** へ（＝低光沢の塗装済み耐圧鋼）。基色を青緑の鋼 → **チャコール／くすんだ暖色寄りの灰色**（09 に近い色温度）へ。剥げ・鋲・接触影・汚れ（wear/salt/dirt/rust）は**部分的に残した**。青白い面反射は**金属度が高く粗さが低い**ことで水面の青が板一面に回り込むのが原因。
- Blender 4.5 で再焼き（1656×720・Cycles 96spp・AgX・`film_transparent`）→ `assets/firepower-hull.webp`（q90/alpha100/method6・**約80KB**）。**変化前の WebP は別 scratch へ退避**。
- `sw-assets.js` のキャッシュ版のみ `version: v28 → v29`（`gameVersion` は **1.21.0 のまま**＝同版の素材差し替え。共有 `sw.js`／`GAME_IDS` は触らない）。

### なぜ
要望「火力型はそれでもなんか浮く。マットな質感の方がいいかも」。直前の比較で、09 は明部が暖色なのに対し火力型の板は**明部が青白く（板一面の広い面反射）浮いていた**。

### 検証（数値・実ゲーム）
- **板の本体画素**（α>200 の不透明部）: 直前板 p50 rgb(72,56,41) / p75 (81,89,95) / p90 (90,116,128)（**R−B −14〜−38＝青白**）→ マット板 p50 (62,52,41) / p75 (78,75,64) / p90 (100,90,69)（**R−B +14〜+31＝暖色**）。09 の同値は p50 (66,57,55) / p75 (86,83,73) / p90 (114,103,98)（R−B +11〜+16）＝**明部の色温度が 09 に一致**。明部の輝度は下がるが**全体は暗転していない**（p50 の和 169→155、09 は 178）。
- **α／登録位置**: 直前板とマット板の α バウンディングボックスが**完全一致** `(1,136,1567,632)`（1656×720）＝登録位置一致。
- **実潜航（横持ち 1280×720 論理・実ゲーム）**: 同ポーズ（`p.x=1500, p.y=520, camX=1070, camY=160`）で 09／直前板／マット板を撮影。**直前板は実画面でも青白い面反射が見え、マット板はそれを除去**（2 と 3 は同形状）。＝**ゲームの後処理（暗幕＋光条）は材質差を支配していない**（マットでも輪郭・進行方向は読める）。
- **テスト**: `node --test abyss-dive/tests/*.test.mjs` → **全 306 件通過**。
- **実ゲームで板が表示**: ハブ→ABYSS DIVE→潜航で `state().hull === 'plate'`・`ship==='firepower'`、`window.__abyss.errors` 0。`setHullPlate(null)` 後は `procedural` へ戻る（既存フォールバック）。

### 証拠（絶対パス）
- 変更前 WebP（退避）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-firepower-matte\prev\firepower-hull.before.webp`（＋同 `firepower_hull.before.py`）
- 再焼き成果物・素材3点・実潜航フレーム: `…\scratch\abyss-firepower-matte\`（`bake\firepower-hull.png/.webp`、`cmp_assets_3up.png`、`ingame\{dive_09,dive_prev,dive_matte}.png`）
- 承認済ドック固定比較（3行・2x拡大）: `…\abyss-hull-redesign-tree\abyss-dive\docs\previews\hull-redesign\ABYSS_HULL_firepower_matte_compare.png`
- 実潜航の同ポーズ比較: `…\docs\previews\hull-redesign\v1210_dive_matte_compare.png`（＋フル `v1210_dive_matte_full.png`）

### 残したこと
- ① 親の画作りレビュー（今回はドック固定＋実潜航の同ポーズ比較を添付）。② iPhone 実機・発熱は未検証（横持ち Chromium エミュレーション）。③ 本ツリーの内容は本リリース v1.21.0 で公開済み。

### つまずいた点
- CDP の `Runtime.evaluate` は約 141KB の data URL を送れない（`RuntimeError: Separator is not found, and chunk exceed the limit`）。→ 直前板は**同一起源の一時ファイル**（`abyss-dive/assets/__prevplate.webp`）経由で読み込み、検証後に削除（ツリーに残さない）。
- ドラフト焼き（`--draft`・半解像度/24spp）でも色温度の傾向は本焼きと一致したため、材質の反復はドラフト＋実測で行い、最終だけ本焼きした。

---

## 2026-11-23 / v1.21.0 — 火力型の船体の「質感」を仕上げる（Blender/Cycles の焼き板へ）＋遅延ロード/フォールバック（→ 本リリース v1.21.0 で公開）

隔離ツリー `scratch/abyss-hull-redesign-tree`（base `602867b9`、v1.20.0 の火力型専用船体を移植済み）。**→ 本リリース v1.21.0 で公開**。v1.20.0 の**形（低く厚い耐圧胴＋一体の兵装区画＋前後の非対称）はそのまま**。

### やったこと
- **火力型の船体だけ、Canvas のプロシージャル描画から「オフラインで焼いた透過 WebP の板」へ**（`js/ship-rig.js`）。
  - 新規 `FIREPOWER_PLATE`（設計座標＝船体ローカル w=150/h=54、+x=船首）／`firepowerPlateRect(w,h)`（純粋・設計箱を呼び出し側の (w,h) へ比例で写す）／`hullSource(id)`／`setFirepowerPlate(img)`（検証用）。
  - `drawShipBody` は板があれば `drawImage`、無ければ従来の**プロシージャル船体へフォールバック**（遅延ロード。板は火力型が最初に描かれるときだけ読む。読み込み失敗は二度と試さない＝プロシージャルのまま）。
  - `drawFirepowerProcedural(g,w,h,opts)` を公開（フォールバック兼・比較用）。
- **生成**: `tools/firepower_hull.py`（Blender 4.5 / Cycles、`-b -P`）。設計座標 1unit=1px。直交・側面（5°の俯仰）、`film_transparent`、AgX。1656×720 → WebP（q90, alpha 100）**約103KB**。.blend は scratch 側。
  - 質感＝層になった装甲板（船体格子から持ち上げた実ジオメトリ＋ベベル）／継ぎ目にたまる汚れ（沈んだ溝＋dirt 材質）／塩食（縦筋の白）／縁だけの剥げ（Pointiness＋錆色）／リベット（大きさを少し不揃い）／沈んだ面（腹部の暗帯）／暖色の小さな灯（灯火・覗き窓）。
  - 灯火は設計 (±59,±17)＝潜航の光条の出所と一致（実測 1px 以内）。発射口 (51,±10/4)・排気 (-30,-15.4)/(-48,-14.4)・継手も v1.20.0 のまま。
- 版: `ship-rig.js?v=3`（game/base 両方）／`base.js?v=13`／`index.js game.js?v=30`／`sw-assets v28`・`gameVersion 1.21.0`・files に `assets/firepower-hull.webp`。**共有 sw.js / GAME_IDS は触らない**（ゲーム内キャッシュのみ）。
- `state().hull`（'plate'|'procedural'|'sprite'）と `hullSource()` / `setHullPlate(img)` を検証用に公開。

### なぜ
- v1.20.0 の形は良いが**質感が平坦**（均一に白い輪郭・平坦なグラデ・大きすぎる丸灯）で、承認済みドック背景と 09 に馴染まなかった。実ジオメトリと焼き込みで金属らしさ（層装甲の陰・継ぎ目の汚れ・塩食・縁の剥げ・リベット・暖色の小灯）を与える。

### 検証
- 新テスト 7 件（焼き板の設計箱・矩写・灯火/発射口/排気が板の内側・生成物の実在・遅延ロードのフォールバック・板描画・state().hull）。**全 306 件通過**。
- 横持ち Chromium 874×402/DPR2 の**実タッチ**（合成 TouchEvent → canvas の実リスナ）で 09→機動→バリア→火力 を換装、**火力は plate / 他は sprite**、JS エラー 0。スティックで px 449→764・pitch −0.40、切り返しで bank −0.59・squash 0.84（板が姿勢に追従）、「撃つ」で魚雷 1 発、「バリア」で active/耐久10。
- **フォールバック**: WebP をブロックして再読込 → `hull='procedural'`・JS エラー 0。
- 証拠: `docs/previews/hull-redesign/`（`ABYSS_HULL_firepower_material_compare.png`＝承認ドック背景に 09／質感前／質感後を同位置・同縮尺・同露出で、`v1210_dive_firepower_plate.png`・`v1210_hangar_firepower_plate.png`・`v1210_dive_firepower_procedural_fallback.png`・`v1210_dive_09_vs_firepower_zoom.png`）。

### 残したこと
- ① 親の画作りレビュー（潜航の実画面は暗幕・光条が重なるため、板の内部コントラストは実画面で最終判断）。② iPhone 実機の見え方・発熱は未検証。③ 本ツリーの内容は本リリース v1.21.0 で公開済み。

### つまずいた点
- Blender の `bpy.ops.object.transform_apply` を選択なしで呼ぶと落ちる（寸法はメッシュへ直接焼いた）。`from_pydata` の面インデックスが範囲外だとセグフォルト（`mesh.validate()` を入れた）。
- 材質ノイズの scale をドック（≈5unit）向けの 2〜3 のままにすると、150unit の船体では sub-pixel で平均化し**完全に平坦**になる。scale を 0.1〜0.3 へ。
- 回転済みトーラスに `obj.scale` を入れるとオブジェクトのローカル軸で伸びて暴発する（z=−49 まで）。明示的な楕円リングに置換。
- プロペラを「送り軸まわり（edge-on）」に作ると側面で線にしか見えない。09 と同じく**横から円**になる向きへ。

---

## 2026-11-23 / v1.20.0 — 火力型の船体を作り直し（専用の重装艇）＋4艇モーション適合の実タッチ検証（→ 本リリース v1.21.0 で公開）

隔離ツリー `scratch/abyss-hull-redesign-tree`（base `602867b9`、v1.19.0 のモーションを移植済み）。**→ 本リリース v1.21.0 で公開**。

### やったこと
- **火力型だけ「09 素材＋箱/筒を貼る」のをやめ、専用の船体にした**（`js/ship-rig.js`）。
  - 新規 `hasBespokeHull(id)` / `drawShipBody(g,id,w,h,opts)` / `firepowerLandmarks(w,h)`。`drawShipRig('firepower')` は何もしない。
  - 船体＝**低く厚い耐圧胴**（幅>高さ・腹部が厚い）＋**装甲化した衝角**（前）＋**上部装甲ケーシング**（一体・発射セル）＋**舷/腹部の兵装区画**＋**荷重を支える継手**＋**短い排気**＋プロペラ。
  - 前後で非対称（船首は張り出し船尾は絞る）＝**向きが読める**。09 のリベット・暖色灯・擦れ・素材を基準に、上部の暖色リム／下部の陰／付属物ごとの接地影で立体感を出す。
  - 船首の灯火は潜航の光条の出所（`game.js` `LAMP_X=59` / `LAMP_Y=17`）と一致＝**ライトが浮かない**（テストで固定）。
  - **見た目だけ**＝当たり・照準・発射位置 `p.x/p.y/p.aim`・物理・バリア・艇の実性能は不変。
- 呼び出し側：`game.js` の `drawSub`（潜航）と `base.js` の `drawShip`／`drawShipStation`（格納庫・艇ドック）で、`hasBespokeHull` のとき `drawShipBody` を描き 09 素材を使わない。09／機動／バリアは従来どおり（09 素材＋`drawShipRig`）。
- 版: `ship-rig.js?v=1→?v=2`（game.js/base.js 両方）、`index.js game.js?v=28→?v=29`、`sw-assets version v26→v27` / `gameVersion 1.19.0→1.20.0`。新テスト `tests/ship-hull.test.mjs`（10 件）。

### なぜ
要望「火力型のアートデザインが変→潜水艇のタイプ分けも含めて作り直す」。旧火力型は 09 の丸い船体に長方形ポッドを上下へ貼っただけで『箱/筒を貼った』見た目＝重装艇に見えなかった。専用の重装船体へ作り直し、格納庫縮尺でも“何のための形か”が読めるようにした。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **299 件通過**（従来 289 ＋ 新規 10）。全変更 JS `node --input-type=module --check` OK。`git status` で `abyss-dive/` 以外に変更なし。
- **横持ち Chromium 960×540・実タッチ（TouchEvent）** で 4 艇それぞれ **入港→（艇の換装で）換装→発進→上下と反転→射撃/バリア** を実行。JS エラー 0。
  - 換装は実タッチで成立（09/mobility/firepower/barrier すべて `state().ship` 一致）。
  - 移動（スティックの実タッチ）：上で tilt<0（約 -0.37〜-0.39）／下で tilt>0／切り返しで bank=±1／離して水平（約 -0.01）。4 艇とも同様＝**新モーションが全艇で動く**。
  - 射撃ボタンの実タッチで魚雷 1 発（bullets 0→1）。バリアボタンで発動（バリア型 active=true/耐久16、他艇も展開＝全艇作動）。
- **火力型の格納庫＆潜航を両方撮影**。旧（main 1.18.0）と新（本ツリー 1.20.0）を**同縮尺・同照明**で比較。旧＝箱/筒を貼った見た目／新＝一体の重装船体。4 艇は形で読み分け可能（09=素の胴、機動=フィン＋推進器、バリア=頭上の環、火力=専用の低く厚い胴）。
- 証拠（絶対パス）:
  - 旧新比較（隔離ボード・同縮尺/同照明）: `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-hull-redesign-tree\abyss-dive\docs\previews\hull-redesign\ABYSS_HULL_firepower_compare.png`
  - 4 艇の形くらべ: `…\hull-redesign\ABYSS_HULL_4ships.png`
  - 潜航 旧新比較: `…\hull-redesign\ABYSS_DIVE_firepower_compare.png`
  - 格納庫 旧新比較: `…\hull-redesign\ABYSS_HANGAR_firepower_compare.png`
  - 火力型の動き（短い動画・960×540/12fps/5.5s）: `…\hull-redesign\ABYSS_HULL_firepower_motion.mp4`
  - 実画面の生キャプチャ: `…\hull-redesign\{OLD_,HANGAR_,DIVE_}*.png`

### 残したこと
- 傾き・ひねりの強さは `ship-motion.js` の 1 か所で調整可（v1.19.0 の値）。
- **iPhone 実機・発熱・実機 60fps は未検証**（本検証は横持ち Chromium エミュレーション）。
- 火力型の船体は Canvas2D の専用描画（追加アセットなし＝SW の `files` 変更不要、版のみ更新）。質感をさらに上げるなら透明 WebP へ焼く余地あり。
- 本作業は独立作業ツリーで開発し、**本リリース v1.21.0 で公開**。地図・BGM・special 等の他ツリーには触れていない。

### つまずいた点
- 格納庫の接岸艇は入港メニューで下半分が隠れる。等倍の判定は隔離ボード（同縮尺/同照明）で行い、実画面は“実際に見える範囲”の証拠として併記した。
- 動画は毎フレーム `Page.captureScreenshot` を間引いて取得し ffmpeg で 12fps にまとめた（rAF は約 60fps）。

---

## 2026-11-23 / v1.19.0 — 潜水艇の進行方向に応じた見た目の動き：ピッチ＋切り返しの「ひねり」（→ 本リリース v1.21.0 で公開）

### やったこと
- **新規の純粋ルール `js/ship-motion.js`**（DOM 非依存）。艇の「見た目」の姿勢だけを作る。
  - `pitchTarget(vx,vy)`／`pitchStep`：**進行の上下成分で船首を上下**。速度が小さいほど 0 に寄る＝**減速で自然に水平**。`atan2(vy,|vx|)` を使うので **vx=0 を跨いでも連続**（斜め・往復の急反転で跳ねない）。
  - `twistStep`：**水平方向の切り返し**（前フレームとの vx 差＝水平加速度）で入る**短いひねり**。常に減衰（`TWIST_DECAY=5.4/s`）＝一定速では 0 に戻る。上限 ±1、大 dt は clamp（ポーズ復帰で跳ねない）。
  - `bodyTransform`／`localToWorld`：pitch と twist を **回転角 rotate と横の縮み squash** にまとめる。twist=0 なら rotate=pitch・squash=1（＝従来と同じ）。**squash は `[SQUASH_MIN=0.78, 1]` に必ず収める＝艇が紙のようにならない**。
- **`game.js` に配線**（見た目だけ。当たり・照準・発射位置 `p.x/p.y/p.aim`、物理速度・慣性・バリアは不変）。`makePlayer` に `bank`/`motionPrevVx` を追加し、`playerUpdate` の 1 行（旧 `p.tilt = lerp(..., vy/400 ...)`）を `pitchStep`＋`twistStep` に置換。
- **船体と付属物を同じ変換に載せる**（`applyBody`／`bodyWorld`＝`localToWorld`）。`drawSub`（船体＋`drawShipRig`）、`drawHeadlightAtmosphere`（光条）、`drawLighting`（暗幕の穴＋光条）、`drawGlowPass`（ライトの発光・スラスター排気）、スラスター泡の発生点を**すべて同じ姿勢変換**に統一＝**艇からライト／発射口／各取付物がズレない**。4 艇（09／機動／火力／バリア）は同じ 1 枚の素材＋`drawShipRig` の差分なので、どの艇でも同じ動きになる。
- **観測**：`state().motion = { pitch, bank, rotate, squash }` を追加（物理とは独立）。
- 版: `sw-assets` `version: v25→v26` / `gameVersion 1.18.0→1.19.0`、`sw-assets files` に `js/ship-motion.js` を追加、`index.js game.js?v=27→?v=28`。新テスト `tests/ship-motion.test.mjs`（17 件）。

### なぜ
要望「いまは固定した動きだけど、進行方向に伴って傾いたりひねったりするアニメーションを加えて滑らかさを表現」。単なる既存回転の誇張ではなく、**進行速度と切り返し**に応じた滑らかな動き（船首の上下・減速時の水平・方向変更時の短いひねり/バンク）を Canvas2D で足した。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **289 件すべて通過**（従来 272 ＋ 新規 17）。新テスト単体は **25 回連続 0 失敗**。
- 新テスト（純粋）: 停船は水平／上下進行で船首上下／横進行は水平／vx=0 を跨いでも連続（最大差 <0.02）／減速で水平へ／追従はフレームレート非依存／一定速でひねりが消え切り返しで反転／|twist|≤1・大 dt でも跳ねない／squash 下限（紙にならない）／船体と付属物が同一写像。
- 新テスト（実挙動・本物のループと入力）: 横進は水平、上昇で船首上・降下で下、停船で滑らかに水平（最大差 <0.05）、急反転でピッチ跳ねず短いひねり＋縮みが下限を割らない、斜めでも跳ねない、**物理・照準・発射は不変**、**4 艇すべてで回帰**、死亡→復帰で姿勢リセット（跳ねない）。
- 全変更 JS `node --input-type=module --check` OK。`git diff --stat`＝`game.js`／`index.js`／`sw-assets.js` の 3 ファイル＋新規 2。**`git status` で `abyss-dive/` 以外に変更なし**。
- **横持ち Chromium 960×540（実タッチ・固定シーケンス・旧新同一入力）**: 旧ビルド（main リポジトリ＝既存公開版 1.18.0、SW 迂回）と新ビルド（本ツリー 1.19.0）で同じ 8 フェーズの実タッチ（巡航→斜め上昇→真上→減速→急反転→前進→斜め降下→停船）を撮影。JS エラー 0（`window.__abyss.errors` 旧新とも 0）。rAF は両ビルド約 60fps（旧 447/448 tick・新 448 tick）。約 30fps で各 225/226 フレーム取得。
  - 実測（フェーズ中央・旧 tilt ｜ 新 tilt, 新 bank）: 巡航 -0.015｜-0.024, 0.75 ／ 斜め上昇 -0.455｜-0.394, -0.42 ／ 真上 -0.500｜-0.400, -0.88 ／ **減速 -0.274｜-0.050** ／ **急反転 0.064｜0.115, -0.93** ／ 前進 0.085｜0.085, **1.00** ／ 斜め降下 0.401｜0.391, -0.43 ／ **停船間際 0.343｜0.092**。→ **減速・停船で新は水平へ戻る（旧は傾きが残る）**、**切り返しで bank が ±1 に振れる**（旧は bank 無し）。
- 証拠（絶対パス）:
  - `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-sub-motion-tree\abyss-dive\docs\previews\sub-motion\sub-motion-compare.mp4`（旧上/新下・960×1148・30fps・7.5s）
  - `…\sub-motion\sub-motion-compare-lite.mp4`（crf30・352KB・Discord 用）
  - `…\sub-motion\old.mp4` / `…\sub-motion\new.mp4`（各 960×540）
  - `…\sub-motion\stills\sub-motion-zoomed.png` / `…\stills\tight_E_reverse.png` / `…\stills\pair_C_up.png`
  - `…\sub-motion\analysis.json` / `…\new\telemetry.json` / `…\old\telemetry.json` / `…\subpos.json`

### 残したこと
- 調整値（`MOTION.PITCH_MAX=0.40` / `LEAN_MAX=0.18` / `SQUASH_MIN=0.78` / `TWIST_GAIN=0.020` / `TWIST_DECAY=5.4`）は**プレイテスト用**。実機で強すぎる／弱すぎる場合はここだけで調整できる。
- ひねりは「水平加速度（vx 差）」駆動なので、**停止からの加速でも短く入る**（方向変更に限定していない）。実機で気になる場合は駆動源を変える余地あり。
- iPhone 実機・発熱・実機 60fps は**未検証**（本検証は横持ち Chromium エミュレーション）。
- 本作業は独立作業ツリー `scratch/abyss-sub-motion-tree`（base 602867b9）で開発し、**本リリース v1.21.0 で公開**。地図・BGM・special の既存独立ツリーには触れていない。

### つまずいた点
- ブラウザの撮影ヘルパは**毎フレームの `toDataURL` でページの rAF を遅くしうる**ため、画像は約 30fps に間引き、時刻を各フレームに記録して後段で復元した（rAF 実測は約 60fps のまま）。
- 小型スプライト（艇幅 ~142px）は 960×540 の 1 枚では差が読みにくい。**等倍比較だけで判断せず、5 倍ズームの切り抜き**で「切り返し時の横の縮み・傾き」を確認した。
- 検証中、無関係の既存テスト（`weapons-loot.test.mjs` の回収品ドロップ）が**まれに失敗**した（旧新どちらでも同程度・base でも 1/60 失敗）。**乱数（Date.now シードの初期生成／ドロップ）由来の既存の間欠**で、本変更（乱数を消費しない見た目のみ）とは無関係。

---

## 2026-11-23 / v1.18.0 — ミサイル迎撃：生き残った敵のノックバックとボス突進の停止（未公開）

### やったこと
- **ミサイルでボスの突進を止める迎撃**（`game.js`）。`lunge`／`sweep` とその予備動作（`lungeWind`/`sweepWind`）の**リヴァイアサンだけ**を、**直撃または十分近い爆風**で一度止める。中断＝**短い押し戻し（プレイヤーから離れる向きへ `BOSS_STAGGER_PUSH=560`px/s・減衰）→ 安全な復帰**（新状態 `stagger` → `recover` → `stalk`）。`lvx`/`lvy` は 0、押し戻し中は**その突進の接触ダメージを無効**（`collide` が `state==='stagger'` を除外）。復帰後は通常。
- **「十分近い」は描画と共通の当たり幾何**（`enemyHit`）で判定。中心座標が爆風半径（標準110px）の外でも、**実ボディが爆心に触れていれば止まる**（頭・胴の芯に沿った円）。
- **イカ（突進なし）は対象外**。**遠い爆風・待機/回復中の追撃・魚雷では中断しない**＝永久ハメにしない。既存の爆発・ダメージ・体表発光の抑止は不変（二重加算なし）。
- **生き残った通常敵のノックバック**は変更なし（`knockEnemy` が `e.vx/vy`＋短い `stun`。次フレームも押しが残って流れることをテストで固定）。固定ヤドカリは従来どおり動かさない。
- 版: `sw-assets` `v24→v25` / `gameVersion 1.17.0→1.18.0`、`package.json 1.18.0`、`index.js game.js?v=26→?v=27`。新テスト `tests/boss-dash-interrupt118.test.mjs`。

### なぜ
要望「ミサイルの爆風は敵を倒せなかった時のノックバック効果もつけて。ボスの突進を止めたりとかに使う」への対応。突進中のボスをミサイルで撃ち抜くと止められるようにし、押し戻し〜安全復帰までを既存の状態機械に足した。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **272 件すべて通過**（従来 262 ＋ 新規 10）。
- 新規テスト: 直撃で停止→recover→stalk、lvx/lvy が 0、押し戻しで位置後退、幾何（中心外でも実ボディで停止／stalk では中断なし）、遠い爆風で中断なし、魚雷で中断なし、回復中の追撃で中断なし、stagger 中は接触ダメージ無効（対照は通常被弾）、イカは対象外、直撃ダメージは一度だけ。
- `git diff --check` クリーン。全変更 JS `node --input-type=module --check`。
- **横持ち Chromium 874×402（ハブ経由・実タッチ・ボス状態と位置だけステージ）**: 実タッチのミサイル発射→着弾→`lunge`→`stagger`（`lvx:0`, `vx:560` 押し戻し, `hp:-19.8`）→`recover`→`stalk`。同条件で何もしない対照は `lunge` 継続。近距離の群れは爆風で放射に押し分け（2 体が `vx/vy` を持つ）。JS エラー 0（`window.__abyss.errors = []`）。
- 証拠画像（絶対パス・一時領域）: `C:\Users\Yoshiyuki\AppData\Local\Temp\abyss-knock-118\compare_knockback.png`（5面: before／stopped／recovered／control／group）。個別: 同フォルダの `A1_before_lunge.png` `A3_boss_stopped.png` `A4_boss_recovered.png` `C1_control_no_action.png` `D1_group_before.png` `D2_group_knocked.png`。

### 残したこと
- 数値（`BOSS_STAGGER_T=0.7s` / `BOSS_STAGGER_PUSH=560`px/s / 起動対象の状態）は**プレイテスト用の調整値**。
- 予備動作（`lungeWind`/`sweepWind`）も対象に含めた（近距離限定の指定は「必要なら」だったため、共通の幾何で一括）。実機で強すぎる場合は wind を外す余地あり。
- iPhone 実機・発熱・写実描画・新マップは対象外（未検証）。

### つまずいた点
- ブラウザの `capture_screenshot` は**撮影のたびにページの rAF を約3倍遅くする**ため、撮影を挟むと発射→着弾のポーリングが間に合わず（ミサイルが届く前にボスが接触）、検証が不安定だった。**プレイを進めてから撮る**順序に変え、状態と数値で確認した。

---

## 2026-11-23 / v1.17.0 — 基地UI・ミサイル調整・深層斉射の統合

- 基地の主要文字を30〜34px（論理座標）に拡大し、ページ送りと「装備する」「売却する」等のボタンを追加。売値を提示し、確認後にだけ資源へ換金。エリーの全身はメニューと装備・開発画面の下から見える。弾形を実戦と共有し、扇と並列は軌道アイコンで区別する。
- ミサイル直撃は標準11→19.8、威力Lv3で44→79.2。爆風とノックバック、局所の閃光・圧力波・破片を調整。ボス本体の部位の光だけを無効にし、爆発・目・予告を維持。深層回収を6/9/12ウェイの抽選につないだ。
- 統合後262件通過。横持ち Chromium 874×402 のタッチ経路で入港・装備・売却・開発・出港。640×360の表示も確認。3/6/9/12ウェイの比較は各60fps・p95 16.8ms・33ms超0（ゲーム内DPR上限1.5）。iPhone実機は未検証。写実描画と新マップは対象外。

## 2026-11-23 / v1.17.0 — 装弾数（ミサイル）・序盤緩和・200段強化カーブ・売却・斉射確率/12ウェイ・各種指定の再設計（未公開）

### やったこと
- **ミサイルに「装弾数」の個体軸を追加**（`weapon-rules.js`）。標準＝8。`weaponParams('missile').ammoCap = round(8 × 個体倍率)`。ロール/比較（実値 8→n）/開発結果/保存/実 HUD（`×残弾/上限`）へ配線。`game.js` は装備中個体の装弾数で `maxMissiles` を決め、**新潜航は満タン（装備容量）**、**装備交換・出港は残弾を増やさない（上限減はクランプのみ）**。補給は**実際の増加量だけ表示**（`ミサイル +n`、上限/残量で端数）。
- **魚雷は熱方式のまま**（弾倉/自動装填なし）。初期は**遅い単発間隔（0.30s）**＋**発熱 0.30（容量1.0）で連続発射を抑制**（連続 4〜6 発で過熱）。HUD は「**魚雷 連続発射の目安 n発**」。反射魚雷も同じ規則（`advanced-weapons.js` の reftorp：heat 0.30 / fireCd 0.36）。レーザーは発熱のまま。
- **強化の上限を 3 → 200 段**（共有カーブ `js/enhance-curve.js` 新規）。既存 3 段は従来値（威力 +12%/段・他 +6%/段）を保持し、4 段目以降は**等比で逓減して有限に収束**（威力 ≈ 5.86 倍、他 ≈ 3.68 倍。指数的な 200 乗にしない）。費用も既存 3 段（150/300/600）は不変、以降は `600 + 90×(level-2)` の線形。武器個体・追加個体・全自動近接のすべてに適用（`ENHANCE_MAX`/`ADV_ENHANCE_MAX`/`MELEE_ENHANCE_MAX` = 200）。
- **艇の基地改造も 200 段**（`upgrade-rules.js` を再構成）。各項目 `head`（既存値）→ `cap` へ漸近する逓減カーブ。既存段（威力 Lv0〜3・他 Lv0/1）の値と費用は不変。**ミサイル威力の弾体の見た目は既存最大 4 を越えない**（`visualHead` は 4 で頭打ち）。費用は `headPrices` ＋ `slope` の線形。**旧セーブの旧Lv（例 missilePower:3）はそのまま読む＝没収しない**。
- **『捨てる』を『売却する』へ置換**（`weapon-rules.js`/`advanced-weapons.js`）。資源+額を**事前提示**（`sellPreview`）→**明示確認（二度押し）**→資源加算。初期品・装備中は不可・**二重付与なし**。標準系と追加（遠距離）の両方。庫は標準系 **10→40**、追加 **8→32**。
- **斉射の抽選確率を調整**（`weapon-rules.js`/`advanced-weapons.js`）。同時発射数は**単発が最多**、**同じ発射数なら並列 < 扇状**、**3連並列は全ロールの 1〜3%**。並列 2 連は従来 14.5% → 約 6.7%。**序盤のランダム抽選は 1/2/3 のみ**。指定開発（`designItem`/`designRoll`）は選択を固定・上書きせず、装備/旧セーブも不変。
- **後半の魚雷は扇状 6/9/12 ウェイまで**（並列は最大 3、**4 以上は扇状のみ**）。`SALVO_PER_SHELL` を 4/6/9/12 まで拡張、扇の半角は控えめ（全体角の上限）、`salvoHeat` は 4 以上で逓減（1 斉射で過熱しない）。12 ウェイは**指定開発**で到達（序盤抽選には混ぜない）。
- **序盤の緩和**（`game.js`）。進行 `G.dist` に依存（座標ではない）：`earlyHpMul` 0.45→1、`earlyDmgMul` 0.60→1、`earlySpawnMul` 1.8→1。導入が明ける（`EARLY_RAMP=6000`、前哨基地より手前）と通常へ戻り、**前哨基地の後も永久に弱くしない**。ボス/巨大敵は対象外。
- 版: `sw-assets` `v22→v23` / `gameVersion 1.16.1→1.17.0`、`package.json 1.17.0`、`index.js game.js?v=24→?v=25`、`game.js base.js?v=10→?v=11 / weapon-rules.js?v=4→?v=5 / advanced-weapons.js?v=2→?v=3 / upgrade-rules.js?v=1→?v=2`、`base.js weapon-rules.js?v=4→?v=5`、`sw-assets files` に `js/enhance-curve.js` を追加。

### なぜ
要望「性能の軸に装弾数を」「最初から魚雷の連射が強すぎる／最初は弱く段階を踏んで強化」「強化も 200 段階くらい」「装備一覧は文字でなく弾の形で」「透明化だけに頼らない」「並列が増えるほど強いから確率を絞る」「12 ウェイまで派手に」への対応。標準のミサイル装弾 8 を維持しつつ、個体差として残弾上限を持たせ、序盤は弱く・後半は緩く伸びる 200 段の積み上げに再設計した。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **242 件すべて通過**（+12: 装弾数のロール/比較/保存、庫 40/32、売却の事前提示・明示確認、200段カーブ代表値 Lv0/1/10/50/100/200、費用が指数的に破綻しないこと、確率（固定シード、単発最多・並列<扇状・3連並列 1〜3%）、4 以上は扇状のみ・全体角上限・熱、序盤抽選は 1/2/3 のみ）。
- 全変更 JS を `node --input-type=module --check` で確認（game/weapon-rules/advanced-weapons/upgrade-rules/enhance-curve）。
- **強化カーブ代表値（報告用）**: 武器 power 倍率 Lv0=1.00 / Lv1=1.12 / Lv10≈1.95 / Lv50≈4.12 / Lv100≈5.23 / Lv200≈5.78。艇 ミサイル威力 ≈ Lv0=11 / Lv1=18 / Lv3=44（据置）/ Lv200≈196（cap 220）。費用 武器 Lv0/1/2=150/300/600、Lv199=18,330（線形）。

### 残したこと（この版では未了・要継続）
- **基地UIの改組（実表示 およそ2倍フォント・一覧/詳細の階層・ページ・弾形プレビュー・発射パターン軌道アイコン・Ellie を窓の帯で見せる・文字裏のみ下地）**: 未実装。文言の一部（『装備する』等）は未反映。**タッチの一覧ページングも未実装**。
- **横持ち 874×402 DPR2 の実タッチ検証と性能計測**（3/6/9/12 ウェイの p95 フレーム時間・粒子/弾数・JSエラー）: 未実施。12 ウェイの実負荷は未計測（不安定なら安定本数を採用する方針）。
- 序盤の資源量・敵の攻撃頻度の実機確認、ミサイル大型化の見え方、iPhone 実機は対象外（Chromium 計測≠iPhone）。

### つまずいた点
- `write_file` が既読ファイルの全上書きを拒否したため、大きい `upgrade-rules.js` は**部分 patch で再構成**した。
- 魚雷の仕様が「弾倉＋自動装填」→「弾倉なし・熱で抑制」へ途中撤回されたため、追加した ammo/reload を撤去し発熱方式に戻した。

---

## 2026-11-23 / v1.16.1 — 実ブラウザレビューで判明した指定開発・強化の欠落を修正 ＋ 近接強化 ＋ 新弾形「流線」 ＋ 海溝を Canvas2D 一本化（未公開）

### やったこと
- **魚雷/ミサイルの指定開発を 形状/発射音/着弾音 の独立指定へ**（欠落修正）。実ブラウザで「魚雷 を指定開発」に発射音/着弾音が出ず、`arsenal.items()` に `style` 1 項目しか無かった。
  - `js/weapon-rules.js`（`?v=4`）: 個体に `projectile`/`launchSound`/`impactSound` を追加（`rollItem`/`designItem`/`normalizeItem`/`weaponParams`）。**旧 `style` だけの個体は三者へ同じ値へ互換**（未指定は標準）。`WEAPON_TYPES` に `traits`（形状/発射音/着弾音の候補と重み）を追加。
  - `js/game.js`: `fireTorpedo`/`fireMissile` が弾へ三者を載せ、**AU.shoot（魚雷発射）/AU.mLaunch（ミサイル発射）は launchSound**、**魚雷着弾は AU.boom(..., impactSound)、ミサイル着弾は AU.missileBoom(..., impactSound)** を使う。`AU.boom` が着弾音で余韻を変えるよう拡張（stock は従来の音そのまま）。弾の描画は `b.projectile` を優先。
  - `js/advanced-weapons.js`（`?v=2`）: `DESIGN_CATS` の魚雷/ミサイルを **5 項目**（count/pattern/projectile/launchSound/impactSound）へ。**レーザー（beam）は弾の形も着弾音の実処理も無いため、意味のある同時発射/方向/発射音の 3 項目だけ**を表示（監査の結果）。
- **全自動近接6種の段階強化**（未対応だったので追加）。`MELEE_ENHANCE_MAX/COST`・`effectiveMeleeStats`、`store.enhanceMelee`/`meleeEnhanceInfo`/`meleeEnhanceLevel`。**解放時の個体差（倍率）は保持**し、威力中心（power +12%/段, 他 +6%/段）に伸ばす。開発パネルで「強化」→ 段と費用（150/300/600）。`meleeStats` が実効値＝実ダメージ（`meleeParams` 経由）、保存に反映。未解放/上限は無消費。
- **新弾形「流線（sleek）」を追加**（要望）。潜水艇09 と馴染む：弾頭→胴へ滑らかに繋がり、短く面積のある尾翼・後端の排気口・装甲の継ぎ目/帯。**既存形状（標準/細身/ずんぐり/尾翼）は置換・削除しない**。`TRAIT_COMPAT`（魚雷/ミサイルの形状）と `PROJECTILES`/`TRAIT_COST` に追加。大型化（ミサイル威力ランク＝`vscale`）は維持。
- **海溝を Canvas2D に一本化**（要望「描画の切り替えは廃止」）。`js/game.js` から 3D ボタン/`T`/描画バッジ/`THREE_KEY`・`threeOn`・`setThreeOn`・`trenchThree` 初期化/切替/デバッグ・描画分岐を撤去。`sw-assets.js` から `three-trench.js`/`vendor/three.module.min.js`/`assets/three/ground-trench.webp` を削除。**同梱物 `js/three-trench.js`・`vendor/three.module.min.js`・`vendor/three-LICENSE.txt`・`assets/three/ground-trench.webp` を削除**（ABYSS DIVE 専用で他参照なし）。2D の地形・視差・海雪・水流・巨影・照明はそのまま。古い保存の ON/OFF は無視。
- `js/base.js`（`?v=10`）: 開発パネルの近接行に**強化段（n/3）**を表示、強化ボタンを近接にも有効化。
- バージョン: `sw-assets.js` `v21→v22` / `gameVersion 1.16.0→1.16.1`、`index.js game.js?v=23→?v=24`、`game.js base.js?v=9→?v=10 / weapon-rules.js?v=3→?v=4 / advanced-weapons.js?v=1→?v=2`、`base.js weapon-rules.js?v=2→?v=3`、`package.json 1.16.1`。

### なぜ
- 親の実ブラウザ確認で、指定開発に発射音/着弾音の項目が無く「好きな組み合わせ」要件未達だった。近接の段階強化も未対応。加えて要望で 3D 切替の廃止と新弾形が追加された。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **230 通過**（旧 226 ＋ 指定開発の独立三特性・近接強化・実弾/実音到達の 4 件。旧 `designCats('torpedo')=3項目` の断言は新仕様へ更新）。全変更 JS `node --check` OK。
- 横持ち Chromium（実タッチ）での確認は下記「実ブラウザ検証」を参照。

### 残したこと／つまずいた点
- 実機（iPhone Safari）は未確認。装飾強度・近接/レーザーの数値はチューニング値。
- `git add`/commit/push はしていない（親が仕上げる）。

#### 実ブラウザ検証（874×402 / DPR2・ポート 8187・実タッチ）
- ハブのカードが **v1.16.1**。ゲームを開くと右上の **「3D」ボタンは無い**（`Input.ui = ['fire','missile','dash','sonar','pause']`）。JS エラー 0。
- **指定開発（実タッチ、デバッグパネルAPIは使わず）**: 基地メニュー「開発（指定・近接）」→「魚雷 を指定開発」で、行が **同時発射 / 発射方向 / 弾の形 / 発射音 / 着弾音** の 5 項目になった（旧は弾の形まで）。実タッチで 弾の形=流線 / 発射音=ずんぐり / 着弾音=細身 を選んで開発（費用 460・資源 6000→5540）→ armory 個体 `w1` が `projectile:'sleek', launchSound:'stout', impactSound:'slender'`、装備。**ミサイルも同様に 弾の形=流線 / 発射音=尾翼 / 着弾音=ずんぐり** で開発（`w2`、費用 500）。
- **実弾と実音へ到達**: 潜航で実タッチ発射 → 魚雷弾が `projectile:'sleek', launchSound:'stout', impactSound:'slender'`、ミサイル弾が `projectile:'sleek', launchSound:'finned', impactSound:'stout'` を保持。
- **近接の段階強化（実タッチ）**: 開発パネルの近接行「斧」（強化 0/3）で「強化」→ +1（費用 150・資源 5040→4890、`meleeEnhanceInfo` price 300 へ）。装備後 `melee().params().power` が素の 1.165 倍（40→46.6）から強化後 **52.2**（=40×1.165×1.12）へ上がる。
- **2D 一本化**: 海溝へ入れて `trenchStage='inside'`、`state()` に `three` フィールドは無い。**2D の岩壁・下向きビーコン・海雪・ヘッドライトの光条・自艇**が描画（3D ボタン無し）。
- 画像（絶対パス・`C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-v1161\`）: `base_menu.png` / `forge_list.png` / `forge_design_torpedo.png`（5 項目）/ `trench_2d_gameplay.png` / 形状比較 `c_mis_stock_r1.png` `c_mis_sleek_r1.png` `c_mis_stock_rmax.png` `c_mis_sleek_rmax.png` `c_torp_stock.png` `c_torp_sleek.png`。
- 形状比較（通常/最大ランク）: 既存 stock は**先端が尖った円錐＋円筒胴**、新 sleek は**丸みのある弾頭→胴へ滑らかに繋がる輪郭・幅広で後退した短い尾翼・後端の暗い排気口（同心リング）・胴の装甲帯**として読める（最大ランクで拡大して確認）。
- ※別セッションのタブ切替で localStorage が別文脈になった場合があるため、設計個体の「再読込維持」は新規テスト（`advanced-weapons.test.mjs` の armory design 保存→再読込、`weapons-loot.test.mjs` の実弾/実音＋リロード）で担保。

### やったこと
- 独立ツリー `scratch/abyss-advanced-weapons-tree`（旧歩行 base・211テスト）の追加兵装を、main の**基地直メニュー版 `base.js`** へ **3way 統合**（base は上書きせず関数/データ接続のみ移植）。
  - 新規モジュール（純粋ルール）: `js/geometry-rules.js` / `js/reflect-rules.js` / `js/melee-rules.js` / `js/advanced-weapons.js`（各 `?v=1`）。
  - `js/game.js`（`?v=23`）: 撃つ枠への追加兵装換装（`fireAdvancedShot`）、反射魚雷（`advanceProjectile`・壁1回）、レーザーの可視経路＝実当たり（`fireBeam`/`G.beams`）、全自動近接（`updateMelee`/`drawMeleeSwing`）、回収解放、検証フック（`advanced`/`forgePanel`/`melee`/`advancedShot`）。
  - `js/base.js`（`?v=9`）: **共通 `drawPanelChrome` を再利用**した指定開発パネル（`drawForgePanel`）。親直メニューに「開発（指定・近接）」を追加して直行、閉じると親へ、エリー自律は不変、タッチ（行タップ/決定/強化/×）と PC（↑↓・←→・E・C・Esc）に対応。
- **不足分の補完**:
  1. **通常魚雷/ミサイルも回収成功で恒久解放**: `unlockFromItem` が armory 個体（`style`）も受け、`style` → 形状/発射音/着弾音 を同じ値で解放（**旧styleは3項目を同じにする互換**）。`pickupSalvage` が armory 個体の特性も登録。`TRAIT_TYPES`（torpedo/missile/laser/reflaser/reftorp）と `missile` 互換を追加。
  2. **指定開発の対象拡張**: 魚雷/ミサイルも指定開発でき、armory 個体として生成（`weapon-rules.designItem`）→ 装備（撃つ枠は魚雷のまま）。レーザー等は advanced 個体として生成。
  3. **新兵装の段階強化**: `advanced.enhance` ＋ `advEnhanceInfo`/`advItemLabel`（威力中心・逓増[150/300/600]・上限3・初期品保護）。保存され `shotParams`（実射）へ反映。forge の「強化」で消費（不足/上限/満杯は無消費）。
- 版: `sw-assets.js` `version:v21`/`gameVersion:1.16.0`（値は不変・内部バスターのみ）、`files` に新規4モジュール追加、`index.js game.js?v=23`、`game.js base.js?v=9 / base-rules.js?v=6 / weapon-rules.js?v=3`、`package.json 1.16.0`。
- **基地メニュー枠の作り替え**（追補条件）: 共有 `drawPanelChrome` の細い真鍮縁 → ほどよく太い**赤銅の板枠＋面取り/擦り傷＋外周に間隔を置いたリベット**（四隅だけでなく全周）。内側の青ホロと琥珀の選択は維持。文字/価格/ボタン領域には重ねない（既存余白のみ）。親・整備・艇・武器・指定開発で共有。

### なぜ
- ユーザー条件: ランダム回収/製造/個体強化、弾速/斉射/弾道/形状/射出音/着弾音、通常レーザー/反射レーザー/反射魚雷、全自動近接6種（パンチ/チェーンソー/ビームソード/斧/実体剣/ハンマー）、ドロップから獲得した特性を基地で好きに組み合わせ、基地直メニュー/エリー自律/真鍮枠。
- 追補: 「基地メニュー枠はもう少し縁取りを太く、銅板とリベットで」。公開ゲートへ追加。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **226 件すべて通過**（190 ＋ 新規 `advanced-weapons.test.mjs` 36）。全 JS `node --check` OK。
- 既存の武器/基地の入力テストを**保持**（メニュー項目追加に伴う index 期待のみ更新: `BASE_MENU` 5項目・出港まで 4 移動／trench の出港 4 移動）。旧セーブ不変（保存が無くても標準値で起動）。
- **横持ち Chromium 844×390/DPR2（ハブ経由・実タッチ・JSエラー0）** で一連を通しで確認:
  - 回収（salvage 8 個）→ **特性解放**（torpedo: count[1,2,3] / projectile[stock,slender,stout] / impactSound[stock,slender,stout]、missile 同様、laser/reflaser/reftorp も解放）。
  - **指定開発**（通常レーザー ×2 細身を開発・資源 400 消費）→ **強化**（+1・資源 150・威力 8.84→9.90）→ **換装**（`equippedShot='laser'`）→ **出港（実タッチ）** → **発射**（beams=2）→ **近接**（chainsaw: hp 1000→955・熱上昇・専用ボタンなし）→ **再読み込み**（items=1 / equipped=laser / melee=chainsaw / enh=[1] / 解放維持）。
  - **倉庫満杯は無消費**（実機: 満杯時の開発 spent 0）。
- 回帰: 3D/2D 切替・BGM(`destroy` 可)・バリア（発動/残量10）・資源/武器/Three の別キー保存、いずれも NG なし。**第2基地も同一ストアを共有**（trench テスト）。
- 比較画像（絶対パスは下記）: 近接6種の実機フレーム／基地メニューの赤銅枠（指定開発の一覧・設計画面）。

### 残したこと
- 公開は**親レビュー後**（push なし）。装飾の強さ・近接/レーザーの数値（威力・間隔・反射回数・押し返し）・出現重みは実機調整（チューニング値）。
- 近接6種はルール上すべて作動（テスト）＋比較画像で弧の違いを確認。非公開ツリー `abyss-advanced-weapons-tree` は残置（移植メモは配信用に不要）。

### つまずいた点
- 撃つ枠の倉庫（`advanced`）と armory（魚雷/ミサイル）で**倉庫が2つ**。指定開発の出力先を型で分岐（armory 型は `weapon-rules`、その他は `advanced`）。
- `forgePanel.rows()` は毎回作り直す配列なので、テストで `indexOf(row)` が効かない（`findIndex` で都度引く）。
- ブラウザ検証は `state==='play'` でないと近接/射撃が動かない（リロード後はタイトル→ `startGame` が要る）。

---

## 2026-11-23 / v1.16.0 — 基地を「直接メニュー方式」へ（徒歩ナビ廃止）＋エリーの自律行動＋スチームパンク外装（未公開）

### やったこと
- 基地の室内を、徒歩で設備まで歩く方式から**入港直後に出る直接メニュー**へ（`js/base-rules.js` を `?v=5`、`js/base.js` を `?v=8`）。
  - 親メニューは **整備・改造 / 艇の換装 / 武器（製作・換装） / 出港**。出港だけを区切り線と別色で**明確に分離**。
  - **選択（カーソル）と実行（決定）を分ける**（誤出港しない）。子メニュー（既存パネル）を閉じると**親へ戻る**。**両基地で同じ**（第1=baseMarker / 第2=base2Marker、出港地点は従来どおり `m.x-(r+120)`）。
  - タッチ（行タップ→決定・×で閉じる）、PC（↑↓＋E・Esc）、ゲームパッド（上下＝スティック/十字、A＝決定）を維持。`game.js` の `pollGamepad` に**縦入力 `pad.y` と十字キー上下を追加**（潜航側の既存機能は不変＝追加のみ）。
- **エリーは操作対象ではなく背景で自律行動**（`stepEllie`）。待つ・歩く・周囲を見る（立ち止まって向きを変える）・艇/ドック/製作台/端末を点検する、を**自然な間隔で少数**選ぶ。**既存の idle / walk のみ**（新規アニメなし）。**メニュー操作・資源・装備・出港に影響しない**。**子メニュー中も止めない**。入退場で状態を再初期化。
- 親メニューと整備・艇・武器の各パネルを**共通のスチームパンク外装**（`drawPanelChrome`）へ：黒鉄の地＋擦れた真鍮の多重枠・四隅/辺のリベット・彫刻銘板・目盛り/ゲージ・小さな装飾歯車・**琥珀の選択インジケータ**。**70℃ の青ホロは情報表示の内側に残し**、外側だけ物理真鍮。文字・価格・選択・確認には飾りを重ねない（余白にのみ配置）。共通化したので後続の武器開発 UI もこの枠に乗せられる。
- 版: `sw-assets.js` `v20→v21` / `gameVersion 1.15.0→1.16.0`、`index.js` `game.js?v=21→?v=22`、`game.js` `base.js?v=7→?v=8`・`base-rules.js?v=4→?v=5`。`package.json` 1.16.0。`weapon-rules.js` と戦闘側は不変。

### なぜ
- ユーザー要望「基地はエリーを移動させるのではなくてメニューにして、その間エリーは自由に移動してランダムに行動する。両基地の入港直後、徒歩なしで分かりやすい直接メニュー（整備・修理/改造、艇の乗り換え、武器/開発、明確に分離された出港）」。追加「基地のメニュー枠・インターフェースをスチームパンク寄りにし、それも全武器等とあわせて公開条件」。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **190 件すべて通過**（旧 186。base 10→14: 親メニュー構成／カーソルの端クランプと選択≠実行／エリーの区画内自律と idle・walk のみ／徒歩なしで3メニュー開閉と子→親／誤出港なしと正しい出港／子メニュー中のエリー独立）。全 JS `node --check` OK、`git diff --check` クリーン。
- **横持ち Chromium 874×402／DPR2（ハブ経由・実タッチ・SW/キャッシュ無効）**、カード **v1.16.0**:
  - 実タッチの「入港」→ 親メニュー（`screen='menu'`・先頭=整備）→ 実タッチで**整備/艇/武器を順に開いて × で親へ**。全行程 `mode='base'`（**誤出港なし**）。
  - **エリーは子メニューを開いたまま** x761→599 と歩行（**操作と独立**）。
  - 親メニューで「出港」を選んで決定 → `mode='dive'`・px304 ＝ マーカーx−216（**正しい側**）。**第2基地**も同一（baseIndex 2、3 メニュー開閉、出港 px4844）。
- 比較画像（横持ち 1748×804・scratch）: `...cache\scratch\abyss-base-menu\parent_menu.png` / `maintenance.png` / `ship_panel.png` / `weapon_panel.png` / `base2_parent.png`。目視: 親・整備・艇・武器が同じ真鍮枠の設備に見え、琥珀の選択、70℃ 青ホロは内側、文字と飾りの重なりなし。

### 残したこと
- **回収した武器の形状・特性を解放し基地で好きな組み合わせを指定開発**は別工程（既存武器パネルの入口はそのまま拡張可能）。レーザー・近接も別工程。
- 装飾の強さ・エリーの行動間隔・メニュー行の高さは実機で詰める（チューニング値）。

### つまずいた点
- 矢印キー/Esc はレベル入力（`Input.keys`）なので、テストの「押下」は keydown→1フレーム→keyup が要る（`press` の即時 down/up では**メニューが動かない**）。E は `wantDock` のラッチなので即時 press で可。
- タッチの × で閉じるとフレーム外で閉じるため、`update` 冒頭で `openChild()` が null なら画面を親へ戻す**照合**を足した（無いと `screen` が子のまま残りメニュー操作が効かなくなる）。
- ハブの ABYSS DIVE カードは横持ちビューポートでは下方にあり、`scrollIntoView` してから実タッチしないと当たらない（先頭 `IRON SQUAD` カードに当たりやすい）。

---

## 2026-11-23 / v1.15.0 追補 — 同時発射数・射出方向・外観/音色を武器の個体に追加（未公開・同一版内）

### やったこと
- 武器の個体に **同時発射数（魚雷1〜3 / ミサイル1〜2）** と **射出方向（単発/並列/扇状）** を追加（`js/weapon-rules.js` を `?v=2`。**弾速ロールは維持**）。離散値で**保存**し、**強化で再抽選しない**。旧保存・初期品は**単発**へ正規化。
- **多連を無条件の上位にしない**設計: 1発威力割引（`SALVO_PER_SHELL` 1.00/0.80/0.66＝総火力は線形未満）、**発熱=斉射ぶん（`base×count`）**、**ミサイルは斉射ぶんの残数を消費（残り1なら単発・空撃ち/無料複製なし）**。
- 実射（`js/game.js`）: `salvoSpread(count,pattern)` で各弾に**角度差/横位置を対称付与**（背後へ撃たない）。**多連は `homeDelay=0.12s` で発射直後の進路を保つ**。**火花/揺れ/音は一斉射に1回**。1発・長押し連射・1押し1斉射は従来どおり。
- 比較UI（`js/base.js`）: 行に発射数、比較に**斉射（実効火力・発熱/消費弾）**・**外観**・**弾速等の実値**を追加。
- **外観・音色プロファイル `STYLES`**（標準を含む2〜3組）: 弾体の形と射出/着弾音が変わる。**性能には一切影響しない**。近接着弾の音は控えめに。

### なぜ
- ユーザー要望「弾速、同時発射数、同時発射ならば発射の方向なども要素に入れて」。追補「（気分で）弾丸の形状、射出音、着弾音にもバリエーション」。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **186 件すべて通過**（従来 172 ＋ 新規 14: ロール範囲／幾何対称／威力割引と発熱／保存と旧保存正規化／強化で不変／外観が性能非影響／単発従来／並列／扇状／ミサイル残弾／発熱／長押し／進路保持／比較UI）。全 JS `node --check` OK、`git diff --check` クリーン。
- **横持ち Chromium 874×402/DPR2（ハブ経由・実キー）**: 製作台で製造→換装→潜航で実射。実弾の本数・角度・左右対称・残弾・弾速差を確認、`errors=[]`。比較画像 `...\abyss-salvo\compare_salvo.png`（ラベル付き1枚）。

### 残したこと
- **レーザー・近接（自動アームパンチ/チェーンソー/ビームソード）は別工程**（本斉射に依存）。出現重み・割引率・`homeDelay` は実機で詰める。

### つまずいた点
- ブラウザ検証では**タイトル画面を抜ける開始操作が要る**（`state==='title'` の間は `baseNear` が立たず入港できない）。入港は**基地マーカーを自艇位置へ置いて静止**させると安定した。

---

## 2026-11-23 / v1.15.0 — 2D 海溝背景の「動きとスケール感」を Canvas2D に実装＋ローグライト武器（個体）の統合（未公開）

### やったこと
- **2D 経路の海溝背景に、Three 側 v2 と同じ発想の「視差・海雪/水流・巨大生物の影」を Canvas2D で実装**（`js/trench.js` を `?v=2` に）。
  - **視差レイヤー**: 奥の崖（px0.30/py0.88）／中距離の岩壁（0.58/0.94）／手前の岩影（画面固定＋左右 1.10）。カメラが上下左右で**層ごとに違う速度**で流れる。奥は低コントラストのシルエット、中距離はやや彫りの深い岩壁、手前は上端/下端をふさぐ壊れた輪郭。**左右・底の縁も揺らして直線の辺を残さない**（Three の `cliffMesh` と同じ狙い）。
  - **停船中も動く水**: 海雪（緩く沈む点 96）＋水流の筋（緩く下へ流れる 10）。`G.time` で連続＝停止しても動く。
  - **巨大生物の影**: 奥を**幅＝画面 2.0 倍**の平たい影が 18〜26 秒で時折横切る。**衝突なし・敵/ボスとは別系統**（専用の描画のみ、ゲーム状態を持たない）。暗い胴＋淡い青白い輪郭。`forceShadow()` は検証用。
  - **負荷/キャッシュ**: 崖・岩・雪・水流は `layout.ax` 単位で 1 回だけ生成（`buildFx`）。描画は画面範囲で間引き。**縦の視差は上限つき**＝深く潜っても通路をふさがない。
  - **暗部は維持しつつ降下ルートを可読に**: `drawLighting` の 2D 経路（`!threeDrawnThisFrame`）で、海溝の軸に沿ってごく淡い明かり（strength 0.16）を足す。3D 経路は three 側が同等の明かりを持つので二重にしない。
  - **地形の判定は不変**（`trench-rules` の `solids` に触れない。見た目だけ）。
- **別ツリーのローグライト武器（個体）を 3-way で統合**（`game.js`/`docs`/`sw-assets.js` の同時変更を統合し、一方の差分を落とさない）。
  - `game.js` の衝突は import 行のみ（three-trench `?v=2` と weapon-rules import を両方採る）。他のハンクは非重複で自動統合。
  - `sw-assets.js` files に `js/weapon-rules.js` を追加。`index.js`/`package.json` は両者同一（`game.js?v=20` / 1.15.0）。武器の詳細は下の v1.15.0 武器セクション。
- **版**: `sw-assets.js` `version: v20` / `gameVersion: 1.15.0`（未公開同士を統合）。`game.js?v=20`、`three-trench.js?v=2`、`trench.js?v=2`、`base.js?v=6`、`base-rules.js?v=4`、`weapon-rules.js?v=1`。`package.json` 1.15.0。

### なぜ
- ユーザーは **3D より 2D の質感・描き込みを優先**し、**背景の動きと壮大さ**を求めた。Three 側 v2 にだけ実装されていた視差・巨影を **2D 経路（3D OFF / 非対応端末）にも反映**して両者を揃える。あわせて**同じ統合版で武器（回収/製造/強化/換装→実射→再読込）を通しで検証**するため、別ツリーの武器差分を統合した。公開はしない。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **172 件すべて通過**（fail 0。統合後も武器の 26 件を含む）。全 JS `node --check` OK、`git diff --check` クリーン。
- **横持ち Chromium 874×402 / DPR2（ハブ経由・実タッチ・キャッシュ無効）**:
  - 2D で `trenchFx()={far:20,mid:22,fore:12,snow:96,cur:10}`、巨影 active、**JS エラー 0**。
  - **実タッチのスティックで 停止→降下→左右**（py 2598→2817、x 8102→7933）。2D 経路がタッチで応答。
  - **3D トグル**: ON で `status='ready'`/`drawn=true`。**WebGL2 を undefined にすると `status='failed'`/`drawn=false` で 2D へ**（errs 0）。
  - **武器の通し（統合版・実タッチ）**: ハンター撃破→**回収品ドロップ**→実タッチで拾得（倉庫 1・資源は撃破報酬 +60 のみ）→基地の武器製作台で**製造（-120）**→**比較（標準→粗悪）**→**強化 3 段（-150/-300/-600、上限は無消費）**→**換装**→**実射 dmg 1.4709 = 1.5×0.9806**→**もどる→再入場で `w2`/粗悪/強化+3 を維持**（保存 `game_studio_abyss_arsenal`）。
- **旧2Dと新2Dを同一寸法（874×402、各フレーム 1748×804）で並べた比較**（scratch `…\cache\scratch\abyss-2d-parallax\`）: `cmp_old_new_2d.mp4`（左右並び・12fps・36f・3.0s）／`cmp_old_new_2d_grid.png`（停止/降下/深部の3段×旧新）。**混在解像度なし**。目視: OLD はほぼ平坦な暗い void、NEW は多重の岩壁/崖＋視差＋巨影で読める。`new_notes/shadow_2d.png`＝巨影、`new_notes/three_on.png`＝3D。

### 残したこと / つまずいた点
- **未公開（stage / commit / push なし）**。親レビュー後に採否判断。
- つまずいた点1: 2D の縦視差をそのまま `PY*(CAM_REF-camY)` にすると、**深く潜ったとき上下の岩が寄って全画面をふさぐ**（＝直線的な黒い壁）。→ 縦の視差に上限を設け、必ず「通路」を残すようにした。
- つまずいた点2: 岩の側面が直線的で「黒い縦棒」に見えた。→ 左右・底の縁も揺らして壊した。
- つまずいた点3: 比較フレームを再取得した際、**エミュレーションの寸法が混在**（874×402 と 764×429）した。→ 両者を同じメトリクスで撮り直し `1748×804` に揃えてから並べた（前回の指摘の再発防止）。
- 巨影・海雪は控えめ。実機（iPhone）での見え方・発熱・FPSはこれから。ドロップ率・強化値は実機で詰める前提。

---

## 2026-11-23 / v1.15.0 — 海溝の潜航の背景に「水中の動きとスケール感」を足す試作（未公開）

### やったこと
- **`js/three-trench.js` を v2 に作り替え**（背景の描画だけ。合成点は `drawWorld` の 1 か所のまま。**操作・当たり・見える岩の輪郭・BGM・UI は不変**）。
  - **視差レイヤー**: 奥の崖（px0.30/py0.88）／中距離の岩壁（0.58/0.94）／手前の岩影（画面固定＋左右は 1.10 で世界より速く）。`layer.position = ((1-px)camX, (py-1)camY)`・子は設計座標（画面 x = W0 - px·camX）。カメラが上下左右へ動くと**それぞれ違う速度**で流れる。
  - **岩の形**: `cliffMesh` は上端ギザ＋左右の縁も揺らし、**世界単位 UV**（`UV=1/300`）で岩肌を連続させる（従来は PlaneGeometry の 0..1 UV で、岩が「貼り付いた矩形」に見えた）。横の層（strata）で岩の積み。奥は MeshBasic＋頂点色グラデ＝低コントラストのシルエット、中距離/手前は MeshStandard＋テクスチャ＋頂点色リム。
  - **停船時も動く水**: 海雪（柔らかい点 110・緩く沈む＋揺れ）と水流の筋（8・緩く下へ流れる）を画面固定で `dt` 更新。
  - **巨大生物の影**: 奥（z=-50）を**幅＝画面 2.0 倍**の平たい影が **16〜24 秒で時折**横切る（`shadow.wait` 11〜24 秒の間）。専用メッシュのみで**衝突なし・敵やボスとは別系統**。暗い胴＋淡い青白い輪郭（テクスチャに stroke）で暗い遠景でも読めるようにした。
  - **当たり＝見た目（不変）**: 描く岩は `trench-rules.js` の `solids`（矩形）そのもの。
  - **キャッシュ**: 岩・崖・手前は `layout.ax` 単位で 1 回だけ生成（毎フレーム再生成なし）。検証用に `debug()` / `forceShadow()` を追加（通常動作には影響しない）。
  - **破棄**: 追加したテクスチャ・マテリアル・ジオメトリを `destroyGL` で破棄。
- **暗幕**: `game.js` の `drawLighting` を、**3D 描画中だけ `base*=0.5`** に（視差レイヤーが暗幕に潰れないように）。**2D 経路は不変**。
- **版**: `sw-assets.js` `v19→v20` / `gameVersion 1.14.0→1.15.0`、`js/index.js` `game.js?v=19→?v=20`、`js/game.js` 内 `three-trench.js?v=1→?v=2`。`package.json` `1.15.0`。

### なぜ
- ユーザーが最新フィードバックで「**背景の動きとか壮大な感じがないのも深海ものなのに不満**」と指摘。3D 版と 2D 版の品質差が小さく、**描き込みを重視**している。→ まず**海溝への降下**に絞って、**2D を美術の基準に**、**背景に視差の動きと奥行き**を足す。**既存の 3D 切替は壊さない**。公開はしない。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **146 件すべて通過**（fail 0。テスト増減なし）。全 JS `node --check` OK。
- **横持ち Chromium 874×402／DPR2（ハブ経由・実タッチ・キャッシュ無効）**: カード **v1.15.0**、全域で **JS エラー 0**、**rAF 60 fps**、Three 内部 **794×446**。
  - 海溝で `three.status='ready'`／`drawn=true`、`debug().layers` すべて true。**実タッチ（停止→降下→左右）**を撮影→旧新で同一構図比較（`cmp_old_new.png`）。
  - **旧新の目視**: OLD（v1.14.0）は**ほぼ何もない暗い void**、NEW は**多重の岩壁・崖・海底・岩棚**＋**パララックス**＋**巨影の横断**として読める（ビジョン比較）。
  - **3D トグル**: OFF で `status='idle'`・`drawn=false`、2D のまま実タッチで進行可（px 7871）。ON へ戻すと `ready`／`drawn=true`。**WebGL2 を null にすると `status='failed'`・2D へ**（`errs=0`）。
- 素材（`…\cache\scratch\abyss-bg-motion\`）: `old_trench_3d.mp4`（v1.14.0）/ `new_trench_3d.mp4`（v1.15.0 試作）/ `cmp_old_new.png` / `cmp_stop.png` / `sh2_900.png`（巨影）/ `raw_three5.png`。

### 残したこと / つまずいた点
- **未公開（commit / stage / push なし）**。親レビュー後に採否判断。
- つまずいた点1: `PlaneGeometry` の既定 UV（0..1）で岩を描いていたため、**1 枚ごとにテクスチャ全体が貼られた「矩形パッチ」**に見えていた（座標が数千pxの実寸で世界単位 UV にしていなかった）。→ `cliffMesh` で **world 単位 UV** を割り当てて解決。
- つまずいた点2: 手前/上端のマスを `scale.y=-1` で反転したら**裏面カリングで消えた**。→ レイヤーの材質を `THREE.DoubleSide` に。
- つまずいた点3: 巨影を暗色だけで描くと、**暗い水では見えなかった**。→ 胴を暗く＋**淡い青白い輪郭（stroke）**にして遠景でも読ませた。
- つまずいた点4: 暗幕が強いため、視差レイヤーが画面合成後に潰れた。→ **3D 時だけ暗幕を 0.5 倍**に。
- 検証では**海溝/基地の解放条件（`G.bossKills=1`・`G.baseMarker`）と位置合わせ**をステージした（描画・当たり・解放ロジック自体はテストと実タッチで担保）。**実機 iPhone はこれから**。

---

## 2026-11-23 / v1.15.0 — ローグライト武器（個体）＋資源による段階強化（未公開）

### やったこと
- **新規 `js/weapon-rules.js`（純粋ルール・DOM 非依存 / `?v=1`）に集約**。武器は魚雷/ミサイルの2種。**初期品（標準装備）は倍率すべて1＝現行同等**で固定、**常に装備候補として選べる（劣っても強制装備しない）**。
  - **品質は4段（粗悪 .86 / 並 1.00 / 良品 1.15 / 特上 1.30）**を重み付き（出現 .30/.42/.20/.08）で抽選。**個体値は項目ごとの tilt（配分）**で決まり、**同じ品質でも突出する項目が違う＝用途が分かれる**（魚雷＝威力/弾速/間隔/発熱、ミサイル＝威力/誘導/弾速。low 系は小さいほど有利）。
  - **乱数は注入（`rng`）**。個体は `id`（`w<連番>`）と数値・品質・強化段を保存し、**再読み込みで再抽選しない**（`normalizeItem` で未知の型・範囲外・重複は安全に正規化）。
  - **倉庫**（`ARSENAL_CAP=10`）：上限あり。**満杯は追加せず（安全）**、装備は明示のみ（初期品へいつでも戻せる）、**装備中・初期品は捨てられない（整理）**。
- **回収品（敵の確率ドロップ）**: `hunter/angler/gunner` の撃破で `G.lootRng`（**表示の乱数とは別系統・注入可**）により `salvage` ピックアップを確率 0.22 でドロップ（ボスは確実に2個）。**資源・補給（ミサイル/修理）とは別の物**で、拾うと**倉庫に武器の個体が入る**（資源は増えない）。図は**青白い鋼のコンテナ（弾の刻印＋留め具）**でミサイル（橙）・修理（緑十字）と形で区別。
- **基地の「武器製作台」**（新規ステーション `WEAPON_STATION_X=820`、出港圏/艇ドック/整備端末と重ならない。**両基地共通＝`base.js` 1実装**）。パネルで**製造（種類を選び既存資源で消費＝魚雷120/ミサイル150、ランダム1個）**と**換装**。**選択は明示の「決定」だけ**（誤タップで消費しない）。**不足・満杯は消費なし**。
  - **比較表示**: 「装備中 X → 候補 Y」＋ **項目ごとの前→後（▲▼）**＋**現在段→次段・費用・威力の伸び**。所持が増えても溢れない**表示ウィンドウ（5行）**＋上下の気配表示。
- **資源による段階強化（最新の明示要望）**: **回収/製造した個体だけ**を、基地で**資源を払って段階強化**（各個体 **3段**、費用 **150/300/600 の逓増**、**威力中心＝1段ごと 威力 +12% / 他 +6%（low 系は有利側へ）**で予測可能）。**ID・品質ラベル・ランダムロールは維持（粗悪品が良品に再抽選されない）**。**標準の固定初期品は保護（UI明示「強化対象外（標準装備は保護）」）**。**不足・上限・初期品は無消費**（強化ボタンは対象外/上限で淡色）。
- **実射への反映**: `weaponParams()` が**強化後の実効個体値**を使い、`game.js` の魚雷（威力=魚雷火力×個体.威力 / 弾速900×倍率 / 発射間隔0.075×倍率 / 発熱0.058×倍率）とミサイル（威力×倍率 / 誘導4.2×倍率 / 弾速・加速×倍率）に乗る。**既存の改造・艇差は従来どおり `G.stats` 側**で、個体の倍率はその**更に上に掛かる**（買い直させない）。**ミサイル爆風（`aoe`）は個体で変えない＝表示と判定は不変**。**魚雷の押しっぱなし連射・ミサイルの1押し1発は不変**。
- **HUD**: 潜航右上に**「装備 魚雷・粗悪 強化+3 ／ ミサイル・標準装備」**を常時表示（換装・強化の効果が読める）。
- **保存**: 独自キー `game_studio_abyss_arsenal`（`{v,nextId,equipped,items[]}`）。**既存の資源/改造/艇の各キーは不変（互換）**、**やり直し(`startGame`)・ハブ帰還・リロードをまたいで維持**（試作なので世界・死亡時ルールは変えていない）。
- **版**: `sw-assets.js` `v19→v20` / `gameVersion 1.14.0→1.15.0`、`js/index.js` `game.js?v=19→?v=20`、`js/game.js` `base.js?v=5→?v=6`・`base-rules.js?v=3→?v=4`。`sw-assets` files に `js/weapon-rules.js` を追加。`package.json` `1.15.0`。新規テスト `tests/weapons-loot.test.mjs`。

### なぜ
- ユーザー『武器の作成やドロップはランダム要素。細かいステータスがランダムに設定される。同じ武器でも良品だったり粗悪だったり』、および最新の明示要望『武器は資源を突っ込んで強化できるように』『ねるからとりあえず通しでやっておいて』。**既存の固定の初期魚雷・ミサイルは維持**し、**資源/補給とは別の回収品**として拾い、**基地で資源を使って種類を選んでランダム製造**、**個体ごとの品質＋配分**、**資源で段階強化**までを**少数武器・実動優先**で縦に通す試作。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **172 件すべて通過**（v1.14.0 の 146 から回帰なし。**+26 件**＝`weapons-loot.test.mjs`）。全 JS `node --input-type=module --check` OK、`git diff --check` クリーン。
  - 純粋ルール: 品質重み・範囲・配分差・**品質順に強くなる（4000 ロールの平均）**・初期品同一・倉庫上限/保存/装備/整理/壊れた保存の正規化・**強化の予測可能な伸び（威力+12%/段）**・**強化で ID/品質/ロール不変**。
  - パネル: 製造の消費/不足/満杯、換装と比較、強化の消費/上限/初期（無消費）、捨てる。
  - 実挙動（本物のゲームループ・入力・localStorage）: 敵撃破→回収品ドロップ→**実拾得で倉庫入り（資源は増えない・二重なし）**、製造→換装→**強化→装備→実射に反映**、**保存→新規セッションで ID/数値/強化が再抽選されない**、劣る個体でも初期品のまま、`startGame` をまたいで保持。
- **横持ち Chromium 874×402／DPR2（ハブ経由、実タッチ、`http://127.0.0.1:8153/`＝作業ツリー、カード v1.15.0、JS エラー 0）**:
  - **回収品（実タッチ）**: ハンターを**実タッチの「ソナー」で撃破**→ `salvage` が落ちる（資源 +120＝撃破報酬のみ、倉庫 0）→ **実タッチのスティックで前進して拾得**→ 倉庫 1・`w1 魚雷・粗悪 {power0.705,speed0.75,interval0.953,heat0.953}`。
  - **製造（実タッチ）**: 基地入港→**実タッチで武器製作台へ歩行**→「武器」→**行をタップ→「決定」**→ `w2 魚雷・良品 {power1.226,…}`、資源 5120→5000（-120、消費なし不具合なし）。
  - **比較（実タッチ）**: 所持品行を選択→「装備中 標準装備 → 候補 粗悪」＋ 威力 1.00→0.70▼ 弾速 1.00→0.75▼ 間隔 1.00→0.95▲ 発熱 1.00→0.95▲、**強化 +0 → +1 ／ 資源 150 ／ 威力 0.705→0.7896** を表示。
  - **強化（実タッチ）**: 「強化」で +1（-150）→+2→+3（累計 -1050、資源 3950）、**上限でタップしても消費なし**、**ロール・品質は不変**。
  - **換装→実射（実タッチ）**: 「決定」で装備（`equipped.torpedo=w1`、`wp.torpedo={dmgMul0.9588,speed796.5,fireCd0.06057,heat0.04684}`）→基地を出て**実タッチの「撃つ」**→ 実弾 `dmg=1.4382=1.5×0.9588`・`wp.speed` 一致。
  - **再読込（ハブ経由）**: 「もどる」→ハブ（`__abyss=null`）→再入場→`weapon.torpedo.id=w1 / 粗悪 / count2 / wp.dmgMul0.9588`（**強化維持**）。保存値も `equipped.torpedo=w1, w1.enh=3, w1.stats 不変`。
  - **別基地共通**: 第2（海溝）基地でも武器製作台で `nearWeaponStation=true`・**武器パネルが開く**（`baseIndex=2`・rows 6）。
  - 比較スクショ（scratch、絶対パス `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-weapon-loot-verify\`）: `v115_weapon_panel_compare.png`（比較＋強化プレビュー）/ `v115_loot_salvage.png`（回収品の鋼コンテナ）/ `v115_hud_equipped.png`（HUD「装備 魚雷・粗悪 強化+3」）/ `v115_base_weapon_station.png`（武器製作台）。

### 残したこと / つまずいた点
- **未公開（stage / commit / push なし）**。**親のレビュー後に公開**。
- 試作。**世界・死亡時ルールは変えていない**。**貴重品・ショップの大規模追加はしていない**。
- ドロップ率 0.22・出現重み・強化の伸び（威力+12%/段・費用150/300/600）・製造費 120/150 は**実機で詰める前提のチューニング値**。
- つまずいた点1: 強化の `low` 系（間隔/発熱）を素直に倍率すると**強化で悪化**する。→ high 系は ×、low 系は ÷ にして**強化は常に有利**へ。
- つまずいた点2: 測定用に立てた簡易サーバのポートが**別セッションのサーバと衝突**（8137 は別ツリーを配信していた）。→ **固有ポート（8153）＋ probe ファイル**で自分の作業ツリーを配信していることを確認してから検証した。
- **iPhone 17 Safari 実機はこれから**（タップの取りこぼし・比較の読みやすさ・強化の手応え）。


---

## 2026-11-22 / v1.14.0 — 海溝の潜航に Three.js（WebGL2・正射影）の 2.5D 背景を統合（未公開）

### やったこと
- **新規 `js/three-trench.js`**（`createTrenchThree({VW,VH})`）: 海溝の**背景と照明だけ**を Three.js で 1 回だけ描き、その canvas を従来の 2D 潜航パイプラインへ **1 枚の画像として合成**する（`ctx.drawImage`）。**別画面のデモ起動でも別物理でもない**。
  - **当たり＝見た目**: 描く岩は `trench-rules.js` の `solids`（矩形）**そのもの**。同じ世界座標・同じ大きさの矩形を、**z だけ起伏（値ノイズ）させて**（XY の外形＝当たり矩形は不変）、`ground-trench.webp` を world 単位で UV 展開して描く。奥の（触れない）岩壁は暗い板を数枚重ねて沈める。`plate(w,h,cx,cy,z,amp,mat)` が 1 枚の板＝1 矩形。
  - **正射影カメラを 1 回だけ世界の窓へ**: `OrthographicCamera(-VW/2,VW/2,VH/2,-VH/2)`、`camera.position=(camX+VW/2, -(camY+VH/2), 10)`（three.y = -world.y）。**世界座標は板の生成時に 1 回だけ**扱う。
  - **統合点は 1 か所**: `game.js` の `drawWorld` で従来 `trenchView.renderTerrain` を呼んでいた行を、`threeOn && ready() ? ctx.drawImage(threeCanvas, camX, camY, VW, VH) : trenchView.renderTerrain(...)` に。**2D の海溝の岩・岩盤は 3D のときだけ差し替え**、誘導灯・発光植物・光の穴（`renderGlow`/`lightPunches`）は従来どおり 2D が重ねる。**自艇・敵・弾・バリア・HUD・入出港・BGM はすべて従来のまま**（自艇は既存 2D を重ねる）。
  - **3D 描画中だけ** `drawLighting` に、`solids` へ柔らかい明かりの穴（`punch`）を足す。暗幕の強い深海でも 3D の岩が「形」として読めるように（2D 経路の見た目は変えない）。
  - **安全側の設計**: 遅延初期化（`preload()`。海溝が近づくまで three 本体もレンダラも作らない）／WebGL2 判定（`typeof WebGL2RenderingContext` ＋ `getContext('webgl2')`。**node テストでは即 false**）／読み込み失敗・コンテキストロスは `state='failed'|'lost'` で**その場で 2D へ**／**内部解像度 0.62 倍（794×446）**・影なし・光源4・メッシュ約10枚・毎フレーム再生成なし／**ON/OFF は右上の「3D」ボタン**（PC は `T`、独自キー `game_studio_abyss_three`）／OFF は `release()`（**破棄時に `webglcontextlost` を先に外してから `forceContextLoss`**）、ハブ帰還は `dispose()`／**再入場の二重初期化なし**。
  - **ユーザー向け表示**: 海溝が見えているときだけ**左下バッジ**（`海溝 3D 描画 ●` ＋ `右上の「3D」ボタンで 2D に切替` / `海溝 2D 描画`）と**右上の「3D/2D」トグル**。
- **同梱物（新規）**: `vendor/three.module.min.js`（three r170・**MIT**・`vendor/three-LICENSE.txt`。`zombie-tps/vendor/three.module.min.js` と**同一 md5** `a8ddfd919b84706fa561eba68a44faa4`）、`assets/three/ground-trench.webp`（倉庫 `bot-commander/assets/underwater/ground` の 1024²、**ゲーム未使用**と倉庫 README 記載）。**CDN なし**。
- **版**: `sw-assets.js` `v18→v19` / `gameVersion 1.13.0→1.14.0`、`js/index.js` `game.js?v=18→?v=19`。`sw-assets` files に `js/three-trench.js`・`vendor/three.module.min.js`・`assets/three/ground-trench.webp` を追加。`package.json` `1.14.0`。**探索/基地/バリア/艇/音楽/海溝ルールの各 `?v=` は不変**（触っていない）。`game.js` へ `three-trench.js` の import 1 行。

### なぜ
- ユーザーが選択肢3『Three.js を本編に組み込んでから公開する』を選択。試作（`scratch/abyss-three-look/`）の画作りを、**本編の海溝潜航**へ**最小スコープ**（背景/照明、できれば整合する艇）で入れる。**既存の 2D 横持ちの操作・シミュレーション・敵・地形・弾・バリア・HUD・入出港・BGM を維持**し、**別画面のデモや別物理にしない**。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **146 件すべて通過**（fail 0。v1.13.0 の 146 から回帰なし。テストは増減なし）。全 JS `node --check` OK。
- **横持ち Chromium 874×402／DPR2（ハブ経由、実タッチ、キャッシュ無効）**: カード **v1.14.0**、全行程で **JS エラー 0**、**rAF 60.0 fps**、Three の内部バッキング **794×446**。
  - **浅場（実タッチ）**: スティックで移動。**「撃つ」長押しで魚雷 16 発**、**「バリア」タップで `barrier.active=true`／`ready=false`**。
  - **海溝（実タッチ）**: スティックで px 345→2972・py 292→2718（`trenchStage='inside'`）・hp 92 で生存。その間 **`three.status='ready'`・`drawn=true`**（=3D 背景を合成）。**同一構図の 3D/2D 比較スクショ**を取得。
    - 実測の**合成 mid 平均輝度は 15.4（3D）/ 16.2（2D）**でほぼ同等。**2D は扁平な矩形、3D は起伏のある岩肌**（ビジョン比較でも「2D は flat rectangles / 3D は mottled rocky surface」）。
  - **入出港（実タッチ）**: 「入港」→ `mode='base'`（エリー x=420・near）→「出港」→ `mode='dive'`。
  - **再入場**: 「もどる」でハブ（`window.__abyss=null`＝`dispose()` 実行）→ 再起動 → 海溝で **`status='ready'`・`drawn=true`（二重初期化なし）**。
  - **Canvas fallback**: `Page.addScriptToEvaluateOnNewDocument` で `getContext('webgl2'|'webgl'|…)` を null にして起動 → **`three.status='failed'`・`drawn=false`**。海溝は**従来の 2D**で描かれ、**実タッチで進行可**（px 2450→2821）。バッジは `海溝 2D 描画`。
  - **配信容量**: 追加 **約 858 KB**（three 675.4 KB ＋ テクスチャ 169.9 KB ＋ モジュール 12.1 KB ＋ LICENSE 1.1 KB）。SW 事前キャッシュ対象は **877,954 B**。
- スクショ（scratch、絶対パス `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-three-integration\`）: `final_shallow.png` / `final_trench_3d.png` / `cmp_3d.png` / `cmp_2d.png` / `tuned_3d.png` / `tuned_2d.png` / `final_fallback_2d.png`。

### 残したこと / つまずいた点
- **未公開（commit / stage / push なし）**。**親のレビュー後に公開**。
- つまずいた点1: 最初の UV を `0.5`（world 1 単位＝0.5 周期）にしたため、世界座標が数千pxの本編では**同じ画素を数千回サンプルして平均色に潰れ**、岩が真っ黒＝自己発光だけになった（`three` 単体の平均輝度 6.7・最大 21）。**UV を 1/300** にして解決（平均 34.4・最大 98 → その後ライト調整）。
- つまずいた点2: トグル OFF で `dispose()` が `forceContextLoss()` を呼び、その `webglcontextlost` が `state='lost'` に固定 → **OFF→ON で再初期化できなかった**。**破棄前にリスナーを外す**＋**OFF は `release()`（再初期化可）／ハブ帰還は `dispose()`（恒久）** に分けて解決。
- **iPhone 17 Safari 実機はこれから**（3D 背景の体感・電池・発熱・FPS、ON/OFF の分かりやすさ）。
- 海溝は暗幕が強く、**3D でも平均輝度は 2D と同程度**（頭のライトと誘導灯で見せる設計は不変）。さらに明るくするなら 3D 時だけ暗幕を緩める選択肢がある（今回は 2D と揃えた）。
- 検証では**海溝/基地の解放条件（`G.bossKills=1`・`G.baseMarker`）と、比較スクショ用の位置合わせ／敵のクリア**をステージした（描画・当たり・解放ロジック自体はテストと実タッチの潜航で担保）。

---

## 2026-11-22 / v1.13.0 — 緊急回避を「瞬間バリア（緩めのジャストガード）」へ置き換え／基地で 4 艇を乗り換え（小規模試作）

### やったこと
- **回避を瞬間バリアへ置き換え**（新規 `js/barrier-rules.js`＝純粋ルール）。既存の回避ボタン／Space を流用し、**進行方向・速度を変えない**（旧ダッシュの `cos*780` の押し飛ばし・`warp()`・気泡を撤去）。既存 dash の残骸（`dashCd/dashT`）は残していない。
  - 発動 **0.4s** / 耐久 **標準弾 1 発分（10）** / 再使用 **2.0s**。**耐久が尽きれば割れ、超過分だけ船体へ**（全吸収はノックバックなし）。**岩との衝突はバリア対象外**（従来どおり船体へ）。**被弾無敵とは別系統**（吸収では `p.inv` を立てない）。
  - **ジャストガード**: 発動直後 **0.12s** に攻撃が重なると**完全防御・膜消費・再使用待ちゼロ**（次の押し直しで別の攻撃を狙える）。受付は**描画フレームでなく経過時間**で判定。**全体の持続を伸ばしてもジャスト受付は伸びない**。
  - **通常ガード・空振りは再使用待ちあり**。**押しっぱなし／キーリピートでは連続発動しない**（`wantDash` はエッジのみ・発動中は再発動不可）。**同一の持続接触では連続ジャストにしない**（`justLatch`。接触が離れると外れる）。**連続接触の吸収は 0.2s おきに間引く**（毎フレームで耐久が抜けない）。
  - **青白い薄膜・波紋・短い SE**（通常＝柔らかい音／ジャスト＝澄んだ音／破損＝割れる音）を状況で描き分け。**ボタンに待ち時間を可視化**（`barrierReadyProgress`）。**潜航のみ**で、降艇・入港・出港・やり直しに持ち越さない（`clearInputLatch` で膜を閉じる）。
- **潜水艇の乗り換え（4 艇・小規模試作）**（新規 `js/ship-rules.js`＝純粋ルール、`js/ship-rig.js`＝見分けの描画）。**09 万能型を基準のまま**、**機動型**（加速/制動/切り返し◎・耐久火力控えめ）、**火力型**（魚雷/ミサイル◎・切り返し不利）、**バリア型**（通常ガードの耐久16/持続0.56/再使用1.4 が優位・兵装と機動控えめ）。
  - **改造後の実性能に艇差の倍率を重ねる**（`applyShipStats`）。**共有の改造・資源はそのまま引き継ぐ**（艇ごとに買い直さない）。**ジャストの受付（0.12s）・報酬（完全防御・即再使用）は全艇共通**＝特定の艇を必須にしない。
  - **基地で選択と決定を分ける**（`createShipPanel`）。船のそばの**艇ドック（TERMINAL_X=980 とは別の SHIP_STATION_X=660）**で「換装」→↑↓で選択／E で決定／Esc で閉じる。**PC もスマホも同じ操作**、**両基地（第1・第2）で同じ**（同じ `base.js`）。
  - **換装で船体を無償全回復しない・弾を増やさない**（最大船体に合わせてクランプのみ）。**選択は永続**（独自キー `game_studio_abyss_ship`）。
  - **見分けは形（色だけに依存しない）**: 機動型＝上下の増加フィン＋尾部の追加推進器2基、火力型＝船体下の大型兵装ポッド＋上部の太い発射筒、バリア型＝頭上の発生器リング。**潜航（`drawSub`）と格納庫（`drawBase` の `drawShip`）の両方**に同じ差分を重ねる。09 は何も足さない（現行のまま）。
- **BGM・爆発・地形/入出港・スーツ戦の仕様は変更なし**（触っていない）。
- **版**: `sw-assets.js` `v17→v18` / `gameVersion 1.12.0→1.13.0`、`js/index.js` `game.js?v=17→?v=18`、`js/game.js` `base.js?v=4→?v=5`・`base-rules.js?v=2→?v=3`。`sw-assets` files に `js/barrier-rules.js`・`js/ship-rules.js`・`js/ship-rig.js` を追加。`package.json` `1.13.0`。

### なぜ
- ユーザー指示「回避ボタン/Space を速度・方向を変えない瞬間バリアへ。基本 0.4 秒、通常弾 1 発程度、再使用約 2 秒。着弾前 0.12 秒の受付でジャストは完全防御・膜消費・待ちゼロ。通常と空振りは待ちあり。長押し/キーリピート・持続接触の連続ジャスト払い戻し不可。被弾無敵・岩とは別。青白い膜・波紋・短い SE、ボタンに待ちを可視化、歩行や基地に持ち越さない」＋「検証できたら 09 基準のまま機動/火力/バリアの 4 艇、基地で選択と決定を分け、両基地から試乗・乗り換え、共有改造と資源は買い直さない、選択を永続化、換装で全回復/弾増やしをしない、09 の絵柄を崩さず輪郭が読める軽量な差分（潜航・格納庫）」。
- `DEEP_FIELD_PLAN.md` の「瞬間バリア」「潜水艇のバリエーション」節の試作。**耐圧改修・新敵・新武装・熱/酸素・広域マップ/ソナーは今回も足していない**。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **146 件すべて通過**（assets5 / combat5 / explore24 / weapons14 / skirmish25 / base10 / upgrade15 / trench14 ＋**barrier17** ＋**ship17**）。既存 112 は全回帰（fail 0）。
  - `tests/barrier.test.mjs`: 既定値／空振り→待ち／ジャスト＝完全防御・膜消費・待ちゼロ／受付境界（0.12s 以内はジャスト・超えると通常）／持続を伸ばしても受付は伸びない／通常吸収と超過（26→10 吸収＋16 船体）／同一持続接触で連続ジャスト不可・離れれば再取得／連続接触の間引き／非稼働＝船体へ／closeBarrier。実挙動: **速度が変わらない**／弾を吸収して船体が減らない／ジャスト完全防御・押し直し可／超過は船体へ・膜が割れる／**岩はバリア対象外**／持続接触で連続ジャストなし／降艇・やり直しで持ち越さない。
  - `tests/ship.test.mjs`: 4 艇・09 基準・未知は 09／機動・火力・バリアの得意不得意／バリアだけ通常ガードの差分（JUST は含めない）／改造に倍率が重なる／形が4つとも別／選択の永続／パネルの選択と決定。実挙動: 既定 09／**換装で全回復も弾増やしもしない**（クランプのみ）／バリアの cfg 優位・JUST 共通／**火力型の魚雷威力が上がる**／改造は維持／基地の艇ドックで選択→決定→搭乗中は変更なし／整備端末とは別／第2基地でも同じ。
- 全 JS モジュール `node --input-type=module --check` OK。
- **横持ち Chromium 874×402／DPR2（ハブ経由、実タッチ、キャッシュ無効）**: カード **v1.13.0**。JS エラー **0**（`__abyss.errors`＝[]）。
  - **実タッチのバリア**: ジャスト＝**完全防御（hp 100 のまま）・cooldown 0・ready true**、続けてもう一撃もジャスト。通常ガード（受付窓の外）＝**吸収して hp 100 のまま**→持続切れで再使用待ち。空振り＝発動→約 0.4s で待ち→約 2s 後に再使用可。**膜は自艇の周りに青白い半透明の楕円**として見える（スクショ確認）。
  - **実タッチの基地**: 入港 → **艇ドック（x≈677）で「換装」** → パネル（4 行・「搭乗中」表示）→ 火力型の行をタップで選択 → 決定 → `ship=firepower`。×で閉じる → 船のそばへ戻り出港 → 潜航で `ship=firepower`。`localStorage['game_studio_abyss_ship']='"mobility"'` → **リロード → 再入場で `ship=mobility`**（実効 accel 1313 / drag 4.34 / maxHp 80）。4 艇の差分は**潜航画面の同じ構図**で取り、輪郭の違い（フィン＋追加推進器／下のポッド＋上の筒／頭上のリング／何も無し）を比較した。
- スクショ（scratch、`C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\browser-use\workspace\sa-0-b9c02732\`）: `ship_panel.png`（換装パネル）／`rig_compare.png`（4 艇の差分の比較）／`dive_firepower.png`。

### 残したこと / つまずいた点
- **未公開**（ステージ/コミット/push なし）。版は `sw-assets.js` `v17→v18` / `gameVersion 1.13.0`、`js/index.js` `game.js?v=18`、`js/game.js` `base.js?v=5`・`base-rules.js?v=3`。新規 `js/barrier-rules.js`・`js/ship-rules.js`・`js/ship-rig.js` を `sw-assets` files へ追加。`package.json` `1.13.0`。
- **iPhone 17 Safari 実機はこれから**（バリアの手応え・ジャストの気持ちよさ・4 艇の見分け・格納庫の換装操作）。
- 数値は試作。バリア耐久 10（1 発分）・受付 0.12s・再使用 2.0s は実機と手応えで詰める余地。艇の倍率（機動 加速1.25/最高速1.15/応答1.40/耐久0.80、火力 魚雷1.35/ミサイル1.30/爆風1.20/応答0.60、バリア 耐久16/持続0.56/再使用1.4）も同じ。
- **耐圧改修・新敵・新武装・熱/酸素・広域マップ/ソナーは次段階**（今回は足していない）。
- 検証では基地の開放条件（`G.bossKills=1; G.baseMarker`）と敵の配置をステージした（開放ロジック自体は base.test / trench.test / ship.test が担保）。

---

## 2026-11-22 / v1.12.0 — 最初の基地の先に「海溝への下り口」（固定地形）と最奥の第2前哨基地＋新バイオーム／ミサイル着弾の爽快感／控えめな環境BGM

### やったこと
- **海溝（固定地形）を新規モジュールで追加**: `js/trench-rules.js`（純粋ルール）＋`js/trench.js`（描画）。第1基地マーカーの先（+1900px）に**下り口を1か所だけ**置く。**見える岩棚（リップ）と通れる開口**、左右の壁、**互い違いの岩棚（張り出し）で小さな進路選択**。棚と棚の間は広く空けて**狭い道を連続させない（戦闘の広場を残す）**。
- **海溝は海底（FLOOR_Y=2600）からさらに下へ潜る**（深さ +1500、底 4100）。`trenchFloorYAt(x)` で**開口の内側だけ床が深く**、カメラも深くまで追従（`camY` 上限を床-720に）。**潜水艇と弾は描画と共有する同じ矩形へ当たる**（`resolveSub` / `trenchSegHit` ＝見た目と当たりが一致）。
- **下向きの誘導**: ビーコン列（下向きの矢印）＋ゆっくり沈む水流＋入口のビーコン。**暗い水全体は青く塗らず**、局所の淡い青白で読ませる。
- **新バイオーム（1つ）**: 最奥の棚は黒い岩の落ち着いたトーンに、**青白い発光植物（丸い房・細い葉・紫の花）**を決定的に配置（参考 `scratch/abyss-70-concept.jpg`）。
- **第2前哨基地を最奥の棚に固定**。**ボスの追加撃破なし**（第1ボス撃破で開く）で接岸できる。室内は既存 `base.js` の格納庫を再利用＝**両基地で同じ資源・改造（整備端末）**を使う。**どちらからも出港で手前（正しい側）へ出て、そのまま引き返せる**。地形より後に描かないと岩盤に隠れるため描画順を修正（地形→基地→実体）。
- **`G.baseMarker`（1個）の整理**: 第1基地は従来どおり `G.baseMarker`、第2基地は `base2Marker(baseMarker, bossKills)` で導出。`G.nearBase`（1/2）と `G.baseAnchor` で入港先を控え、`checkDiveEntrance`→`enterBase(index)`→`exitBase` を基地ごとに処理。**第1基地のバックトラックは不変**。
- **ミサイル着弾を爽快に**（`game.js`）: 発火点の短く強い光 → 暖色の厚い水中爆発（複数の膨張塊・火花・気泡）→ **淡い青白い水圧リングが実爆風半径 R に到達** → 残光。威力ランクで重さが増す。短く重い着弾音 `AU.missileBoom`、控えめな揺れ、**全面白飛びなし**。リングは `toR` で実半径へ到達（**爆風範囲の改造だけが到達距離を変える**）。**ダメージ/連射/ノックバックは据え置き**。
- **控えめな環境 BGM**（新規 `js/music.js`）: 倉庫 kenshi-next `track05_ruins.m4a`（『忘却の遺構』）を `assets/` へコピーし、**既存マスターへ薄く（0.07）ループ再生**。初回タッチ後に開始、**失敗は非ブロッキング**、**M で SE と一緒にミュート**（マスター経由）、**ハブ帰還で停止**、**再入場で二重にならない**、**ページ非表示で減衰**。専用 `music.js` に分離。

### なぜ
- ユーザー「だだっ広い空間をただ真横に進むだけ → 下方に潜る方向性と地形要素、バイオーム、基地が1回だけ」への対応。加えて「ミサイルの爆発がショボい」「kenshi-next の BGM を入れてみて」。
- **耐圧改修・新敵・新武装・熱/酸素・地図は今回足さない（次段階と明記）**。`DEEP_FIELD_PLAN.md` の深度解除・ソナー分離・広域カメラは未着手のまま（設計メモは変更していない）。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **112 件すべて通過**（assets5 / combat5 / explore24 / weapons14 / skirmish25 / base10 / upgrade15 / **新規 trench14**）。新規 `tests/trench.test.mjs` で**海溝の固定形状・描画＝衝突の矩形・潜水艇の押し出し・降下→浮上の往復・第2基地の開放/接岸/段階・ミサイル主リングの実半径到達**を検証。**既存 98 は全回帰**（fail 0）。
- 全 JS モジュール `node --check` OK。
- **横持ち Chromium 874×402／DPR2（ハブ経由、実タッチ、キャッシュ無効）**: カード **v1.12.0**。海溝の降下は**実タッチのスティック**で py 2340→2894→4040（床=floorY-60）、camY 1979→3380、`trenchStage` inside。第2基地は**実タッチの「入港」ボタン**で `mode:'base'` →**実タッチの「出港」ボタン**で `mode:'dive'`（px=base2.x-216, py≈棚）。**実タッチのスティックで浮上**（py 4037→2664）。**JS エラー0**。
- ミサイル: 通常魚雷＝小さい橙のパフ／通常ミサイル＝白核＋暖色の火球＋水圧リング＋泡／最終ランク＝明らかに大きく重い（多重リング・広いバースト）。同一構図で比較（下記）。
- BGM: 実タッチ後に `music.state()` = `{loaded:true, playing:true, blocked:false, volume:0.07}`。M で `AU.muted` true↔false（マスター経由＝SE と一緒に切れる）。ハブ「もどる」で旧インスタンス `playing:false`（停止）・再入場で新しい1インスタンス（**二重なし**）。
- スクショ（scratch、絶対パス）:
  - `C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-trench\01_entrance.png`（下り口）
  - `...\02_deep.png`（最奥）/ `...\06_mid_shelf.png`（中腹の岩棚と誘導）
  - `...\07_base2_exterior.png`（第2基地の外観＋発光植物）/ `...\11_biome_ledge.png`（発光棚）
  - `...\12_torp_b.png` / `...\13_missile_b.png` / `...\14_final_b.png`（着弾比較）

### 残したこと / つまずいた点
- **未公開**（ステージ/コミット/push なし）。版は `sw-assets.js` `v16→v17` / `gameVersion 1.11.0→1.12.0`、`js/index.js` `game.js?v=16→?v=17`、`js/game.js` `base.js?v=3→?v=4`。新規 `js/trench.js`・`js/trench-rules.js`・`js/music.js` と `assets/track05_ruins.m4a` を `sw-assets` files へ追加。
- ブラウザ検証では**第1ボスの解放条件をステージ**（`G.bossKills=1; G.baseMarker={...}`）して海溝と第2基地を出した（開放ロジック自体は base.test / trench.test が担保）。
- **耐圧改修・新敵・新武装・熱/酸素・地図・広域カメラは次段階**。海溝の底の岩は暗く、遠目には淡い（局所の青白で読ませる方針）。第2基地の外観は**地形より後に描く**（順序を誤ると岩盤に隠れて見えない）。iPhone 17 Safari 実機はこれから。BGM の音量・ループ点の詰めは実機で。

---

## 2026-11-22 / v1.11.0 — 基地の画作りを「70℃ DEEP SEA WORLD」へ寄せる（格納庫＝施設化／端末＝青ホロ／外観＝厚い防圧リムと設備）

### やったこと（`base.js` のみ）
- **格納庫（室内）を倉庫から稼働中の施設へ**。天井に**鉄骨トラス＋循環配管3系統（冷色ハイライト付き）**と**吊り下げのケージランタン2基（鎖がわずかに揺れる＝稼働の気配）**。右壁に**頑丈な金属エアロック扉**（厚い多重枠・まぐさ・敷居・縦の観音開きの継ぎ目・縁のボルト列・右側3連の丁番・ハンドルホイール・黄黒の警戒帯・青い気密シール・暖色の状態灯）。**短い減圧蒸気**（エアロックの気密シール・配管の継手・ランタン横の4点から。局所・短命・低アルファ＝**濃霧にしない**）。整備の痕跡として**床の工具箱（暖色リム）と寝かせたホース**。
- **整備端末を青いホログラムに**（`drawTerminal`）。無骨な鋼材の筐体（ボルト・通気スリット・摩耗）の上に、投影リングから浮く**青い半透明スクリーン**（走査線・ホロのバー・微妙なフリッカー）を重ね、**硬い筐体と軽いホロの対比**を出す。
- **整備パネルに薄いホロ感**。読めなければ本末転倒なので、走査線は **alpha 0.05 の静的オーバーレイ＋掃引1本**のみ、四隅に**ホロ金具（L字）**。**価格・残高・選択行・項目名の可読性は不変**（検証で劣化なしを確認）。
- **外観に厚い防圧リムと使い込まれた設備**。`drawDockMouth` の枠を**多重フレーム（46/34/22/3px）**に厚くし、**開口の周囲（両側の柱＋アーチ）に沿って外向きのボルト列**を打つ。`drawModule` に**冷色の環境光リム（上辺）／リブのボルト／下辺の陰と錆の縦スジ／大型の点検ハッチ／端フランジのボルト**。`drawBeams` に**斜材トラス・ガセット付き支柱・垂れケーブル**。新規 `drawEquipment` で**給排気スタック（薄い排気の湯気）・パラボラ・係留ボラード**。`drawWorkLights` を3点→**7点へ増やして暖色の接岸灯/作業灯を分散**（海＝冷色、基地＝局所暖色＝70℃の対比）。
- **自艇・弾を隠さない**。外観は従来どおり `renderDiveMarker`→`drawWorld` の順（建築は背景、自艇・敵・弾は手前）。順序は変えていない。
- **エリーと艇のスケール／全身表示は維持**（`GIRL`・`SUB` は不変）。

### なぜ
- ユーザー指示「基地の画作りを 70℃ DEEP SEA WORLD に寄せ、横持ち実画面で検証」。格納庫は倉庫ではなく、頑丈な金属エアロック・使い込んだ循環配管・短い減圧蒸気（基地内部のみ、読みにくい濃霧は不可）・暖色の局所作業灯・架台など生活/整備の痕跡が見える施設へ。端末は青ホロで無骨な筐体と対比し、価格・残高・選択 UI の読みやすさは維持。外観は現行モジュールをベースにドックの厚い防圧リム・鉄の梁と使い込まれた設備・海の冷色と暖色接岸灯。近接で自艇・弾を背景に隠さない。
- PDF 原典（`70℃ DEEP SEA WORLD`）の **「1. 基地シークエンス（ディーゼルパンク・重厚感・生活感・ホログラムによるカスタマイズ）」** が直接の基準。動画モンタージュ（`abyss-70-concept.jpg`）の発光植物・コックピットの暖色／外海の冷色対比も参照（動画に基地そのものは映っていないため、基地は PDF を基準にした）。モブや海全体の新仕様（温度/酸素ゲージ等）は今回触っていない。

### 検証
- **倉庫の素材確認**: `アセット倉庫` を全走査。基地/格納庫に使える素材は `bot-commander/assets/dialog/bg/hangar.webp` のみで、**現行 `abyss-dive/assets/base-hangar.webp` と SHA-256 完全一致**（`3a3935f7…`）。他に格納庫らしき素材は無いため**新規素材は採らず**、既存 hangar の帯を維持（＝**新規アセット無し＝`game.js`/`sw-assets.js` の配線は不要**）。
- `node --check abyss-dive/js/base.js` / `node --input-type=module --check` → OK。
- `node --test abyss-dive/tests/*.test.mjs` → **98 件すべて通過**（fail 0）。
- **横持ち Chromium 874×402／DPR2（ハブ経由、CDP 実タッチ、キャッシュ無効）**: **実タッチで入港 → スティックで左右移動（x420→596→420）→ 実タッチで出港**まで通し、**JS エラー 0**（`__abyss.errors`＝`[]`）。整備パネルの開閉・8 行表示も確認。エラーは操作を通じて 0。
- 比較画像（scratch、絶対パス下記）: `ABYSS_CMP_base_exterior.png` / `ABYSS_CMP_base_hangar.png` / `ABYSS_CMP_base_panel.png`（上段=参照 `abyss111-*`、下段=候補。同一視野 874×402／DPR2）。

### 残したこと / つまずいた点
- **公開版 v1.11.0 / v16 に同梱**。公開済み v1.10.0 / v14 から版を更新し、再調整した基地描画は `base.js?v=3` で読み込む。新規素材の追加なし。
- 外観で自艇のシルエットを暖色背景から分離する案（自艇への冷色リム）は `game.js` 側の描画になるため今回は触っていない。
- iPhone 17 Safari 実機の手応え・FPS はこれから。

### やったこと
- **潜航側の基地外観を作り替え**（`base.js`）。単一の四角い塊（旧 `drawSteelWall` の 1160px 長方形）をやめ、**岩盤に沿って並ぶ複数の耐圧モジュール**（横倒しの円筒＋リブ＋端のフランジ＋暖色の覗き窓）・**梁と斜め支柱**・**暖色に照らされた入港ドックの開口**・**進入灯**でシルエットを読ませる。濁った青緑の外海に**局所的な暖色の作業灯だけ**を置く（全体を高コントラストで塗らない）。進入灯 → 外壁（モジュール群）→ ドック の段階表示は維持。
- **格納庫の縮尺を修正**（`base.js`）。潜水艇の表示を、**船体ハルがエリーの約 2 倍の高さ**になる大きさ（スプライト高約 290px・幅約 742px。ハル下端を床に接地）に変更（旧は高さ 120px でエリー約 198px より小さかった）。**エリーと艇の接地ラインは同じ床に揃え**、**整備架台（クレードル）を船体の手前に描いて停泊を示し**、床に暖色の作業灯を置く。
- **船のそば（船首寄り）に整備端末**（`BASE_WORLD.TERMINAL_X=980` / `TERMINAL_RANGE=96`。出港圏 |x−250|≤200 とは重ならない）。近づいて E／「整備」で**整備・改造パネル**を開く。**パネルを開いている間は歩かない**。**選択（↑↓）／確認（E・決定）／閉じる（Esc・×）は出港と別操作**（パネルを閉じてから出港）。
- **船体修理＋7 項目の改造**（新規 `js/upgrade-rules.js`＝純粋ルール）。装甲（最大船体 100→150）／運動性（逆進・横滑り・停止の減衰 3.1→4.8）／最高速（360→430）／加速（1050→1500）／魚雷火力（1.5→2.4）／ミサイル威力／ミサイル爆風範囲（110→150）。**初回は各 1 段（有限・明確な価格と前後の効果）**。ミサイル威力だけは**通常＋改造 3 段（計 4 ランク、価格 350/700/1200）**。価格は資源。**不足時・購入済み/上限は消費なし**、**購入と効果の適用は一度だけ**、効果は `G.stats` 経由で**艇の性能のみ**（移動・魚雷・ミサイル・爆風・最大船体）。**未購入は現行同等**（`BASE_STATS` は実数一致）。パネルは**項目・前→後・価格・現在残高・購入後残高**を表示。
- **ミサイル威力の見た目**（`game.js`）。ランクで**発射する弾体の見た目**が大きくなる（通常比 1→1.5→2.3→4）。最終ランクは**艇の全長に匹敵**（潜航の自艇＝幅 142px、弾体は通常 42px×4＝168px）。三角の拡大ではなく**弾頭・胴・尾翼・太く短い航跡**でシルエットを読ませる。**発射は一発押しのまま**。**命中判定は見た目の先端側**へ寄せ（`b.hitAhead=14×scale`）、**半径は控えめ（≤15）**なので自艇・発射直後に広がらない。**爆風範囲は別項目のまま**。
- **爆風範囲の整合**。改造で `b.aoe` が変わり、**実判定（`missileBlast` の距離ループ）／リングの見た目（`missileBurst` を半径引数化）／吹き飛び範囲（`MISSILE_KNOCK` の距離減衰）が同じ R** を使う。
- **永続**（`js/resources.js` に `spend` を追加、`UPGRADE_KEY` は資源とは別キー `game_studio_abyss_upgrades`）。**以前の保存資源はそのまま使う**（`RESOURCE_KEY` は不変）。
- 版: `sw-assets.js` `v14→v16` / `gameVersion 1.10.0→1.11.0`、`js/index.js` `game.js?v=14→?v=16`、`js/game.js` `base.js?v=1→?v=2`・`base-rules.js?v=1→?v=2`・`resources.js?v=1→?v=2`・新規 `upgrade-rules.js?v=1`。スーツ戦闘の `explore.js`/`explore-rules.js` も統合（内部 `?v=13`）。

### なぜ
- ユーザー指示『基地がでかい四角い塊で雰囲気がない、コンセプト通りに。基地の女の子の方が潜水艇よりでかい。メンテナンス改造: 装甲、運動性、スピード、加速、魚雷火力、ミサイル威力、爆発範囲など』。追加指示『ミサイル威力だけ通常＋改造 3 段、ランクが上がるほど発射したミサイル本体を大きく、最高ランクは艇の全長に匹敵。弾頭・胴・尾翼と太い航跡でシルエットを読ませる。命中は先端側、発射は一発押し、爆風範囲は別項目』。
- マップ拡張は対象外。別工程のスーツ戦闘修正は本版へ同梱。新武装は**次段階として記録するだけ**（下記）。

### 検証
- **TDD**: `tests/upgrade.test.mjs` を新規（15 件）。未購入＝現行同等／各項目が 1 段で効く／ミサイル威力の 4 ランク・価格上限・見た目スケール／範囲外・未知の正規化／保存と再ロード維持／パネルの不足・上限・一度だけの消費／修理費の比例・満タン・不足／閉じる選択が出港と別（状態機械）／実挙動: 端末で購入→残高減・実効性能とレベル更新／各パラメータが艇に効く（速度・応答・威力・爆風・装甲）／運動性は惰性を変え最高速は到達速度を上げる／パネル中は出港しない・閉じれば出港／やり直しをまたいで維持。
- `node --test abyss-dive/tests/*.test.mjs` → **98 件すべて通過**（assets 5 / combat 5 / explore 24 / weapons 14 / skirmish 25 / base 10 / **upgrade 15**）。各 JS の構文チェック OK。
- **統合版の横持ちChromium 874×402／DPR2（ハブ、CDPタッチ、ボス条件をステージ）**：入港→端末→修理（HP95.7→100、資源3000→2978）→ミサイル威力3段購入（資源728、保存値Lv3）→出港。最終弾（弾体4倍、威力44、爆風未改造で半径110）の発射と自艇が外観に隠れないことを確認。JSエラー0。最終画像はscratchの `abyss111-exterior.png`、`abyss111-hangar.png`、`abyss111-panel-max.png`、`abyss111-missile-max.png`。
- 比較画像（scratch、絶対パスは下記）: `ABYSS_compare_base_exterior.png`（旧=四角い塊 / 新=モジュール群）、`ABYSS_compare_hangar.png`（旧=艇<少女 / 新=ハル≈少女×2）、`ABYSS_compare_missile.png`（通常 / 最終ランク）。

### 残したこと / つまずいた点
- **新武装は次段階（未実装）**: 端末に載せられる追加兵装の枠を記録するだけ（今回は 7 改造に限定）。
- **基地開錠はボス撃破**。ブラウザ検証は**ボス条件だけステージ**（`G.bossKills=1`）して入港動線を確認（開錠ロジック自体は `base.test` が担保）。
- iPhone 17 Safari 実機の手応え・FPS はこれから。**コミット・push はしていない**。

## 2026-11-22 / v1.10.1 — スーツ戦闘: 地面の G06 へ銃を下へ向ける／自然な撃破演出（沈む・コア消灯）

### やったこと
- **前方の交戦可能な G06 の胴/甲殻の高さへ銃を下へ向けるようにした**。`explore-rules.js` の `AIM`（支点＝肩 `pivotDx/pivotUp`・狙う高さ `targetUp=80`・上限 `maxAngle=0.30rad≈17°`・`minForward=40`/`maxRange=640`）と `aimAngle()`/`aimVector()`。**銃口（見える閃光）・曳光・実弾の発生座標と向きをすべて同じ `aimVector()` から取る**ので、見た目と当たりが食い違わない。標的なしでは水平（`vy=0`）。親レビューで元絵に焼き込まれた閃光を切り離し、弾の原点を実際の銃身先端（`x=st.x+facing*95.16` / `y=413.90`、水平時）へ移した。横持ちChromiumで斜め構えから3発で撃破し、沈み込みとJSエラー0を再確認。
- **頭・胴・脚は動かさず、腕＋銃だけを肩（支点 (122,88)）で回す**。体は腕を抜いた新素材 `assets/suit_shoot_body.webp`（`tools/gen_suit_shoot.py` で元の `suit_shoot_upper.webp` から腕の画素を抜き、肩の下地で埋めたもの）、腕は既存 `suit_shoot_upper.webp` を `SHOOT.armPoly` で切り抜いて回転（クリップは回転後の座標系で切るので絵の腕の画素がそのまま回る）。**歩行・装甲の質感はそのまま**、頭/脚は傾けない。
- **背後の敵へは向けない**（`minForward`）。標的が無い・休眠・引き返し・遠すぎは θ=0 の自然な姿勢。**角度は近いほど大きいが `maxAngle` で頭打ち**（これ以上曲げると肩が割れて見えるため。実測で 12°/16° は自然、20° で肩に穴が出る）。
- **撃破演出**。撃破の瞬間から**無害・撃てない**（`alive=false` は従来どおり即時、`stepFoe` は `false` を返して攻撃しない）。見た目だけ `FOE.deathT=0.85s` で〈少しのけぞる（活動絵を向きの逆へ傾ける）→ 休眠差分 `G06_dormant.webp` へクロスフェードして崩れ・コア消灯（`source-atop` で絵の画素だけ暗く）→ 地面へ沈む → 消える〉。`foeDeathView()` が純粋に進捗を返す。**少量の砂（落ちて床に残る）と気泡（浮いて消える）**を残し、**画面全体を白飛びさせる長いフラッシュは使わない**。ドロップは**G06 自身の2枚のみ**（別キャラの倒れ絵は使わない）。
- **撃破は一度きり**。資源 `addResourceOnce('foe',40)` は不変（`killFoe` は 1 回だけ）。**再入場（`clearTransient`）で `deathT` を保つ**ので復活も演出再生もしない。迫撃・装甲・歩行の値は不変。
- 版: `sw-assets.js` `v14→v15` / `gameVersion 1.10.0→1.10.1`。`js/index.js` `game.js?v=14→?v=15`、`js/game.js` `explore.js?v=12→?v=13`、`js/explore.js` `explore-rules.js?v=12→?v=13`。`sw-assets.js` の files に `assets/suit_shoot_body.webp` を追加（`suit_shoot_upper.webp` は腕の切り抜き元として継続使用）。`package.json` 1.10.1。

### なぜ
- ユーザー指摘『スーツ戦闘は敵は地面にいるのに銃は水平を向いてて不自然。あと倒した時唐突に消えてちょっと味気ない』に応えるため。歩行・装甲の質感を保ったまま、前方の実画像の胴/甲殻の高さへ銃を下へ向け、撃破は短い崩れ・沈み・コア消灯・砂/気泡を残して自然に消す。

### 検証
- **TDD（RED→GREEN）**: `tests/skirmish.test.mjs` を 13→**25 件**へ拡張。交戦可能の判定／前方の活動中の G06 で銃口が下がり敵の見える形の高さ（407〜564）で当たる／実弾＝見える銃口と同じ計算／左右の斜め弾道が左右対称／射線外（背後の敵へは向けない・勝手に背後へ撃たない）／休眠と遠すぎは水平のまま／近いほど下向きで上限を超えない／撃破は直ちに無害・撃てない／演出は短く一度だけ（のけぞり→沈む→消える）で完了後は再生しない／資源イベントは一度きり／長押し連射の各発も銃口・狙いが同じ計算／撃破後も帰還できる。まず実装前に新テストが落ちるのを確認（RED）。
- `node --test abyss-dive/tests/*.test.mjs` → **83 件すべて通過**（assets 5 / combat 5 / explore 24 / weapons 14 / skirmish 25 / base 10）。JS 5 本 `node --check` OK、`git diff --check` クリーン。
- **アセット**: `python tools/gen_suit_shoot.py` → `assets/suit_shoot_body.webp`（md5 `a1a2fdf64e9632eabf88a868b33503c9`、決定的）。腕の切り抜きと肩下地の合成を θ=0/12°/16°/20° で目視（12°/16° は自然、20° で肩に穴＝`maxAngle` の根拠）。
- **ブラウザ（横持ち Chromium 874×402 / DPR2、ハブ経由、実タッチ）**: ハブのカード **v1.10.1**。降艇 → **実タッチのスティックで前進** → G06 が `alert` で**銃口が下がる**（`aim.theta≈0.21〜0.30`、銃口 y 412→434〜443、下向きの曳光＋銃口閃光）→ **実タッチの「撃つ」長押しで 3 発撃破** → `foeDeath.phase` が `lean→sink→fade→done` と進み**崩れ・沈み・コア消灯・砂/気泡**（白飛びなし）→ 完了後は**跡形もなく消え**、標的が無いので**姿勢が自然な水平へ戻る**（`aim.theta=0`）。**左向き**でも前方の G06 へ**左下**に構える（頭は直立）。**勝手に背後へは撃たない**（背後の敵には θ=0）。撃破後も帰還可、被弾なし。
- 比較用（scratch、`C:\Users\Yoshiyuki\AppData\Local\hermes\profiles\backup2\cache\scratch\abyss-aim\`）: `cmp_aim_and_death.png`（4 場面の比較）／`clip_kill.gif`（撃破の短いクリップ）／`cap_00.png`（狙い・発射）／`cap_01.png`（のけぞり）／`cap_02.png`（沈む）／`cap_after.png`（撃破後）／`05_left_engage.png`（左向き）／`zoom_firing_player.png`（肩のズーム、7.5/10 で破綻なし）。

### 残したこと / つまずいた点
- iPhone 17 Safari 実機（徒歩の射撃・撃破演出の手応えと FPS）はこれから。**コミット・push はしていない**。
- **角度は `maxAngle≈17°` で頭打ち**。狙い線（支点→目標）は胴の高さ（`targetUp=80`）を指すが、実弾は見える銃口から出るぶん約 4°下へずれるため、着弾は胴重心より少し上（見える形 407〜564 の中央付近）。厳密に胴重心へ合わせるには銃口基準で解き直す必要があるが、**見た目と判定の一致・肩の自然さ**を優先した（テストは「見える形の高さで当たる」を担保）。
- 撃破演出の長さ 0.85s と砂/気泡の量は手応え次第で調整の余地。被弾モーション（点滅＋赤ふち＋揺れ）は従来のまま。
- 生成時に Pyright が PIL の型で偽陽性を出すが実行に影響なし。

---

## 2026-11-22 / v1.10.0 — スコアに代わる保存資源／最初のボスの先の入港可能な海底基地（室内の徒歩・出港）

### やったこと
- **資源（スコアに代わる保存値）を導入**。ゲーム内の累積スコア表示をやめ、**資源残高**を表示（HUD 右上＝`資源 <n>`、死亡画面＝`資源 <n>`）。`js/resources.js` の `createResourceLedger` に純粋ルールを分離。戦闘の撃破（`killEnemy` → `addResource`）と遺跡の調査（`onSurvey` → `addResourceOnce('relic'+idx,250)`）、徒歩の G06 撃破（`onKill` → `addResourceOnce('foe',40)`）で獲得する。**`localStorage` の独自キー**（`storage` 経由で `game_studio_abyss_resources`）に保存し、**ハブへ戻る・リロード・やり直しでも維持**。**同じ潜航内で同じ源は二重付与しない**（`awardOnce`。`startGame` の `resetDive()` で新規潜航は再取得可）。**旧ベストからは移行しない**（読まない・書かない）。**資源残高はハブのカードの BEST SCORE には渡さない**（`index.js` の `onGameOver` は保存しない）。`G.score` は**互換のデバッグ値**として残し、UI・永続高得点から分けた。魚雷/ミサイル補給・船体修理は従来どおり。
- **最初のボス（リヴァイアサン）の先に入港可能な海底基地**。初回撃破（`bossKills===1`）で `G.baseMarker = baseMarker(bossKills,e.x,e.y)`（撃破現場 **+2600px**）。**進入灯 → 鋼鉄の外壁 → 暖色に照らされた入港ドック** と近づくほど段階的に見える（`baseStage`: approach≤1600 / wall≤760 / dock≤320）。撃破前は `baseMarker=null` で**入れない**。**自分で近づいて E／「入港」で明示入港**（`baseDockNear`: r96+pad60。勝手にワープしない）。**現在の唐突な遺跡エアロックは移設していない**（`explore.js` / `explore-rules.js` は未変更）。
- **室内は有限の安全区画**（`base-rules.js` の `BASE_WORLD`: 1画面1280・床566・歩ける 420〜1150・船 SHIP_X=250・出港範囲200）。**敵もダメージも無い**（`stepBase` は `{moved,depart}` のみ）。**スーツなしのエリー**（倉庫 `GIRL` の `idle_m60`/`walk_m60` を lossless webp 化。scale3.0・idle4/walk12 コマ・着地影）が**待機・歩行**できる。船（潜水艇09）が左に接岸。**船のそばで E／「出港」** で潜航へ戻る。室内候補は倉庫 `hangar.webp`（1080x2340 縦長）から**16:9 の帯を切り出し**（`CROP y=1560,h=608`）、青緑へ寄せて暗い鋼材のトーンに整える（**外観は室内とは別素材・別描画**）。
- **出港時に射撃入力を持ち越さない**（`exitBase` → `clearInputLatch` が `wantShoot`/`shootHeld`/`fireQueued`/`fireHeld` を捨てる）。**やり直しで進行が壊れない**（`G.baseOn/baseMarker` を `startGame` でリセット。資源残高は維持）。`Input.wantDock` は入口（降艇）と基地（入港）で共用し、`checkDiveEntrance` は入口→基地の順に受理する。
- 版: `sw-assets.js` `v13→v14` / `gameVersion 1.9.0→1.10.0`、`js/index.js` `game.js?v=13→?v=14`。新規 `js/base.js`・`js/base-rules.js`・`js/resources.js` は `?v=1`。`explore.js?`/`explore-rules.js?` は未変更。

### なぜ
- ユーザー指示『ボスの先に基地』『コンセプトにそっくり』『スコアより資源、あとで使う』『基地ができたらまとめてプッシュ』『最小限の遊べる基地: 初回リヴァイアサン撃破後にボスの先へ自走、遠方の進入灯から鋼鉄の外壁・暖色に照らされた入港ドックへ段階的に見える（現在の唐突な遺跡エアロックは移設しない）。範囲内で明示入港、勝手にワープしない。有限の安全区画、スーツなしのエリーで待機と歩行ができ、船に戻って出港。やり直しで進行が壊れず、出港時に射撃入力持ち越さない。青緑の外海・暖色の灯・暗い鋼材など既存の映像トーンを保つ』に応えるため。資源は『戦闘と遺物の報酬を得て保存（localStorage 独自キー、ハブへ戻る・リロード・やり直しでも維持、同じ潜航内で二重付与なし、旧ベストから移行しない、船体修理等は従来どおり）』。**ショップ・改修・広域マップ・新ソナーは今回なし**（基本動線＝到着と再出発を先に固める）。

### 検証
- **TDD（RED→GREEN）**: `tests/base.test.mjs` を新規（10 件）。資源の〈旧ベストから移行しない〉〈同じ潜航内で二重付与しない〉〈保存され作り直しても維持・新規潜航で再取得可〉、基地の〈撃破前は入れない=マーカー null〉〈近づけば入港圏・遠いと圏外・勝手にワープしない〉〈進入灯→外壁→ドックの段階〉〈有限の安全区画を歩ける（端でクランプ・体力の概念なし）〉〈船のそばでだけ出港〉、実挙動の〈撃破前入れない→近づいて E で入港→E で出港・射撃入力を持ち越さない〉〈やり直しで進行が壊れず資源は維持〉。最初は `base-rules.js` 未定義で全滅（RED）→ 実装で GREEN。テスト側の 1 件（リロード後は新しい潜航＝再取得可）を期待どおりに直した。
- `node --test abyss-dive/tests/*.test.mjs` → **71 件すべて通過**（assets 5 / combat 5 / explore 24 / weapons 14 / skirmish 13 / **base 10**）。JS 5 本 `node --check` OK、`git diff --check` クリーン。`addScore` の残存参照なし。
- **ブラウザ（横持ち Chromium 874×402 / DPR2、ハブ経由、実キー/CDP）**: ハブのカード **v1.10.0**。HUD 右上が **`資源 0`**（スコア表示は無し）。ソナーで機雷撃破 → **`資源 20`** → `localStorage['game_studio_abyss_resources']=20`（旧 `game_studio_highscore_abyss-dive` は **None＝未書き込み**＝残高を BEST に渡していない）→ `startGame` 後も 20、**フル・リロード後も 20 維持**。遺物（x=1200）で **E → `資源 310`（+250）**、2 回目は「この遺物は調査済み」で**増えない**。**ボス条件だけ検証上ステージ**（`G.bossKills=1` / `G.baseMarker={x:12000,y:500}` を直接設定。本来はリヴァイアサン撃破で開く。開閉ロジック自体は base.test が担保）→ 進入灯（遠）→ 鋼鉄の外壁（中）→ 暖色ドック（近・`E 入港`）と段階表示 → **実キー E で入港**（`mode:'base'`）→ エリーが待機→**`D` で歩行**（x420→713、`anim:'walk'`）→ 船のそばへ戻り（`near:true`）→ **実キー E で出港**（`mode:'dive'`、`shootHeld/wantShoot/fireHeld/fireQueued` すべて false）。**遺跡探索（v1.9.0 スーツ）は回帰なし**（入口 x=1450 で E→`mode:'explore'`、D で歩行 x430→802、J で G06 の HP 3→2）。目視で外観の段階・格納庫（接岸した潜水艇09＋スーツなしのエリー＋安全区画ラベル＋「E 出港する」）を確認。
- 比較用スクショ（scratch）: 外観 `base_ext_{approach,wall,dock,near}.png` / 格納庫 `base_interior_{idle,walk}.png` / まとめ `cmp_base_overview.png`（絶対パスは下記）。

### 残したこと / つまずいた点
- **ハブのカードには固定の「BEST SCORE」表示が残る**（`common/js/app.js` が `storage.getHighScore` を表示）。**権限外なので共通ハブは編集していない**。`index.js` で `onGameOver` を保存しないようにして、**資源残高は絶対に渡していない**（該当キーは未書き込み＝0 のまま）。カードの表示を消す/差し替えるのはハブ側の作業。
- **カメラは右の約850pxしか映さない**ため、段階表示（進入灯/外壁/ドック）が画面内で読めるのは近距離だけ。遠いと画面外（=仕様。近づくほど見える）。進入灯のビーコン/点列は近づくと見えることを確認済み。
- **基地の外観の作り込みは最小限**（鋼材パネル＋リム＋作業灯＋ドック口）。室内候補は倉庫 hangar の下段の帯で、横持ちに切った全景（奥行きのある格納庫）。`GIRL_OBL`/`BOY`/`ponco`/`scavenger` を使う住人・ロボの静止背景役は**次回**。
- iPhone 17 Safari 実機（基地の入港・歩行・出港の手応えと FPS）はこれから。**コミット・push はしていない**（テスト/構文/diff/ブラウザまで）。

---

## 2026-11-22 / v1.9.0 — 遺跡に地上敵 G06 を 1 体（戦闘試作）／歩行ストライド 1.5 倍／拾得物アイコン刷新

### やったこと
- **遺跡探索に地上敵 G06 を 1 体だけ置いた（試作）**。倉庫 `bot-commander/assets/enemies` の `G06.webp`（活動）と `G06_dormant.webp`（休眠）を `assets/` にコピー。配置は通路の **x=900**（降艇地点 430 の少し奥）。**降艇直後は休眠で静か**（休眠絵・発光なし・無害）、距離 **340** 以内で**予兆（`alert`）**へ（活動絵・緑のコアが脈打つ・地面の輪・頭上に「!」）。**予兆 0.9 秒は停止**（撃つ／引く猶予）。→ 追跡（172/s）→ 間合い 112 で溜め 0.34s → **踏み込み（620/s・0.22s）** → 硬直 0.9s。接触で **HP −25**（無敵 0.8s）。**距離 560 超で引き返す**（`return`）。
- **攻撃は既存の徒歩銃の実測値を使う**。`explore-rules.js` に `GUN` を追加し、銃口（`explore.js` の `SHOOT.muzzleX 254`・`muzzleY 78`・`SPR` から算出＝前方 123.24px／床から 153.66px）・速度 1500・寿命 0.14s（射程 約210px）・太さ 5 で弾を出す。**線分と箱の掃引**（`segHitBox`，Liang–Barsky）で**すり抜けない**。**向きを尊重**（敵を背に撃つと当たらない）。**届いた弾だけ一度ダメージ**（1 発 1 点、HP 3）。**撃破で絵が消える**（火花のみ。画面全体を明るく塗る長いフラッシュは使わない）。弾は `stepExplore` が動かすので**見た目と判定が同じ銃口・弾道**。
- **探索者に歩行 HP**（`PLAYER.hp=100`。潜航の船体 HP とは別系統）。被弾は **HP バー（中央上）＋赤いふち＋人物の点滅＋短い揺れ**。**0 で短い演出のあと自動で潜水艇へ撤退**（`onDefeat → exitExplore`。ソフトロックしない）。
- **再入場で撃破済みは復活しない**。敵の `hp`/`alive` は探索 state に持ち、入口を出入りしても保つ（降艇のたびに位置・行動だけ休眠へ戻す）。`startGame`→`explore.reset` で新規（また 1 体）。
- **歩行のストライドを 1.5 倍**（`tools/gen_suit_walk.py` の `S=32→48`）。`CENTER_X=180`（体の軸）と**手前=画像左／奥=画像右**の重なりは維持。端で脚が届かないため**歩行中だけ骨盤を下げる**（`BOB=3→12`）。`gen_suit_walk.py` に検証出力（IK 到達不能・枠はみ出し・歩行コマ最下点）を追加。**移動速度 310・歩調 0.90s には連動させない**。
- **潜航の拾得物アイコンを刷新**（`game.js` drawWorld の pickups ブロックのみ）。ミサイル補給＝**ミサイルの形**（弾頭・胴・尾翼）、船体修理＝**明るい緑十字**。縁取り＋控えめな発光（15）。補給量・回復量・ドロップ・当たり判定は不変。
- 版: `sw-assets.js` `v12→v13` / `gameVersion 1.8.2→1.9.0`、`js/index.js` `game.js?v=12→?v=13`、`js/game.js` `explore.js?v=10→?v=12`、`js/explore.js` `explore-rules.js?v=11→?v=12`。潜航の兵装・ボス・照明は未変更。

### なぜ
- ユーザー指示『既存遺跡内の 1 箇所に以前合意した地上敵 G06 を一体だけ置く試作。降艇直後は静か・安全、少し進むとライトに浮かぶ。分かりやすい予兆から短い接近攻撃、撃つ・引くで対処。既存の徒歩銃の実際の発射タイミング・銃口・弾道を使い、届く弾だけ一度ダメージ。向きを尊重、弾はすり抜けにくく、命中と撃破ははっきり。徒歩被弾を分かるように、敗北時にソフトロックせず潜水艇に撤退。再入場で撃破済みが復活しない』に応えるため。
- 同セッションの追加依頼（潜航の拾得物を形で分かるアイコンへ／歩行ストライドを 1.5 倍）も同じ版に含めた。

### 検証
- **TDD（RED→GREEN）**: `tests/skirmish.test.mjs` を新規（13 件）。降艇直後の安全／予兆と停止／踏み込みの一度きり被弾（無敵）／向きの尊重（背に撃つと外れ）／届く弾だけ／弾は銃口から向きへ／高速でもすり抜けない（`segHitBox`）／命中と撃破（`alive=false`）／再入場で復活しない・リスタートで戻る／敗北で撤退（`down`）／戦闘中でも帰還可／既存の射撃タイミング維持。最初は `segHitBox` 未定義で全滅（RED）→ 実装で 13/13。
- `node --test abyss-dive/tests/*.test.mjs` → **61 件すべて通過**（assets 5 / combat 5 / explore 24 / weapons 14 / skirmish 13）。JS 5 本 `node --check` OK、`git diff --check` クリーン。
- **アトラス**: `python tools/gen_suit_walk.py` → **IK 到達不能なし**、**歩行 8 コマの最下点 y=360（浮き/食い込み 0）**、枠はみ出しは調査の最深 2 コマのみ（**従来から**。今回の変更とは無関係・survey フレームは S/BOB 不使用で旧と画素一致を確認）。**再生成で md5 一致**（`7338de64fe68fad759d36e33cc040eba`）。ストライド 1.5 倍は `cmp_stride_old_vs_new.png`（OLD/NEW の walk1..8、接地ガイド線つき）で確認。
- **ブラウザ（横持ち Chromium 874×402 / DPR2、ハブ経由、実タッチ/CDP）**: ハブのカードが **v1.9.0**。入口で **E**（実キー）→ 降艇。スティック（実 `touchStart/Move`）で前進、`x≒560` で **`foe.state` が `alert`**（予兆スクショ）→ 実タッチの「撃つ」長押しで **`foe.hp` 3→2→1→0 → `alive:false`（絵が消える）**。撃たずに近づくと**踏み込みで `hp` 100→75**（`inv` 0.68・点滅）。放置で **`hp` 0 → `down:true` → 自動で `mode:'dive'`（撤退）**。**戻る**（実タッチ）で潜航復帰（`px` 1618）→ **再入場で `foe.alive:false` のまま**（復活せず）→ `startGame` で `foe.hp:3/alive:true`（リセット）。拾得物はミサイル形／緑十字が同画面で判別可。SW キャッシュ確認でアトラスは新版（219684B）配信を確認。
- 比較画像（scratch、絶対パスは下記）: 戦闘スクショ `06_explore_combat_hitflash.png` / 静かな探索 `01_explore_quiet_spawn.png` と、その重ね `cmp_explore_quiet_vs_combat.png`。歩行 `07b_explore_walk_maxstride.png`。拾得物 `08_dive_pickup_icons.png` / `zoom_pickup_icons.png`。ストライド `cmp_stride_old_vs_new.png`。

### 残したこと / つまずいた点
- **調査の最深 2 コマが従来から枠下で 2px 切れる**（survey2/3 の bbox が y=370、crop 下端 368）。S/BOB 不使用で旧生成と画素一致のため**今回の変更とは無関係**。直すなら調査のしゃがみ量か crop を見直す。
- エアロック移設・基地・マップ拡張・G12 は今回スコープ外（次回）。コミット・push はしていない（テスト/構文/diff まで）。
- 被弾モーションは点滅＋赤ふち＋揺れのみ（本数は今後の余地）。

---

## 2026-11-22 / v1.8.2 — 歩行の前後レイヤーとストライド中心を原画に合わせる／歩行を 310 に／徒歩射撃と魚雷の押しっぱなし連射

### やったこと
- **歩行の前後（遮蔽順）を原画に合わせて入れ替えた**。`tools/suitrig.py` は手前の脚を画像**右**（x>186）としていたが、原画 `suit_idle` の腰まわりの陰影（奥の脚＝右側が暗く、手前の脚と接する内側が最も暗い）から、**手前の脚は画像左（x<186）・奥の脚は画像右**と判定。`leg_x` と `KNEE`/`ANKLE` を入れ替え、`render_pose` の `far→near` の重ね順はそのままなので**常に同じ手前の脚が上**に描かれる（左右反転時も維持）。脚は「もも/すね/ブーツ」を**足ごとに完全に合成してから**奥→手前へ重ねる（この順序は変更なし・確認）。
- **ストライド中心を体の軸へ移した**。`CENTER_X` を 184（画像中央 192 でもニュートラル時の足首座標 181.5 でもない）から **180（原画の胴体/骨盤の縦軸。頭・胴・骨盤の重心 x≈179.5）** にし、股関節 `HIP` も 180 に合わせた。両足の歩幅はこの軸に対称に振れ、半周期で脚が交換される。腰の縦線・接地（足裏/踵）・アンカー（idle/walk/survey/shoot の基準点）は動かしていない。
- **歩く速さを 250 → 310 論理px/s**（`explore-rules.js` の `WALK_SPEED`）。歩調は**時間ベースのまま**（`WALK_CYCLE_T=0.90s`）、スティックのアナログ減速もそのまま。340 以上は将来の「改造」の余地として空けておく（改造システムは未実装）。
- **徒歩スーツ射撃をタップ=1発・長押し=連射にした**。`stepExplore` に `shootHold` を足し、撃つボタン/J/Z を押している間は**既存の射撃サイクル（0.34s）完了ごと**に発射。離すと進行中の1発以外は撃たない。
- **潜航の通常魚雷も同じ**にした（専用「撃つ」ボタン・PC 左クリック・J/Z）。押している間は**既存の発射間隔（0.075s）ごと**に発射し、**熱・過熱・冷却はそのまま効く**（オーバーヒート中は撃てない）。**ミサイルとその他の兵装は未変更**（押しっぱなしでも連発しない）。
- 入力の保持はタッチの**指IDごと**（`Input.btnTouch[id]==='fire'` の指だけが離すと解除。他の指の解放では止めない）。左スティックと併用可。`keyup`（J/Z 両方を見る）・`window mouseup`・`touchend/cancel`・`blur`・モード切替/ポーズ・`clearInputLatch`（降艇・帰還）・`startGame` でホールドを解除し、持ち越さない（短押しはラッチ `fireQueued`/`wantShoot` で必ず1発、OSリピートに依存しない）。
- 版: `sw-assets.js` `v11 → v12` / `gameVersion 1.8.1 → 1.8.2`、`js/index.js` の `game.js?v=11 → ?v=12`、`js/game.js` の `explore.js?v=9 → ?v=10`、`js/explore.js` の `explore-rules.js?v=10 → ?v=11`。

### なぜ
- ユーザー指摘『奥足と手前の足の交差が逆』『ストライドの中心と体の軸がズレてる』に応えるため。原画の陰影から前後を判定し直し、ストライド中心を体の軸に合わせた。
- 『足が遅い』『基礎速度は 250→310、340 以上は将来の改造に余地』に応えるため。
- 『徒歩スーツ射撃をタップ1発・長押し中は連射』『魚雷も同じ（ミサイルはそのまま）』に応えるため。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **48 件すべて通過**（assets 5 / combat 5 / explore 24 / weapons 14）。新規: 満倒し 310px/s・半倒し同歩調、徒歩射撃のタップ1発/ホールド連射/離して停止/移動併用、魚雷のタップ1発/ホールド連射/過熱で停止/ミサイル非連発。他のボタンを長押ししても魚雷は出ず、移動指や別の発射指を離しても残りの発射指で連射し、最後の発射指をキャンセルすると停止する。
- `node --check` で JS 5 本 OK、`git diff --check` クリーン。
- アトラス再生成: `python tools/gen_suit_walk.py` → **IK 到達不能なし**、全15コマで最下点 y=360、md5 `3f7cb39d0322982b486dcf8891b640b7`（同条件で一致・決定的）。`suit_shoot_upper.webp` は不変（md5 一致）。
- 原画との一致: 前後入替／中心移動後の `idle` 再描画の差は 2525px（入替前の基準 2177px と同水準。腰の股関節帯 y264-278 と上半身は不変、足元の接地は原画のまま）。**まとめ画像** `scratch/abyss-suit-fix/cmp_walk_occlusion.png`（OLD/NEW/反転の交差フレームに赤＝体の軸・緑＝アンカー・橙＝接地のガイド線）。
- ブラウザ（横持ち Chromium、ハブ経由）で実挙動を確認: ハブのカードが **v1.8.2**。潜航で**Jを押しっぱなし → 魚雷 6 発（約0.5s）、離すと 6 のまま**（新規発射なし）。探索で**歩行の速度実測 約310px/s**、停止状態で遺物（x=1200 付近）に **E → 調査姿勢（surveyed 1/2）**、入口（x≒240）に戻り停止して **E → 潜航へ復帰**（fireHeld/shootHeld が False に戻る）。徒歩射撃は J を押している間 `firing:'fire'`、離すと `recoil`（進行中の1発のみ）で、HUD に「長押しで連射」を表示。

### 残したこと / つまずいた点
- 奥行きのごく小さな透視差は**不要**だった（入れ替えと軸移動だけで交差と対称性が取れた）ため付けていない。
- 前後判定は原画の陰影（奥＝暗い）と腰での重なりに基づく。`suit_idle` は両脚がほぼ接して描かれており（オーバーラップが無い）、続く `suit_walk_0/1` の交差コマは股関節帯を除外して初めて分離するため、判定は陰影が主な根拠。
- iPhone 17 Safari 実機の確認はこれから。横持ちの連続クリップは未取得。

---

## 2026-11-22 / v1.8.1 — 徒歩の歩調を移動から分離／ボスの当たり判定とロック表示を修正

### やったこと
- **歩調を「歩いている時間」で回すようにした**（v1.8.0 は移動距離ベース）。`WALK_CYCLE_T = 0.90s`（左右1周期）。移動速度・移動距離・スティックの倒し込み量は位相に使わない。→ 速さに関係なく一定のゆったりした歩み（接地足はその分滑るが、歩調が暴れない）。
- **移動速度を 140 → 250 論理px/s に戻した**（アナログ量は移動距離にだけ反映）。
- **押しても壁で動けないときは足踏みしない**。実際に x が動いたときだけ歩行し、動けなければ停止→待機へ。
- **足がつま先だけに見えた原因を特定して直した**。v1.8.0 は「すね＋ブーツ」を 1 ピースにして足首を床へ置いており、接地点を**最下点**に合わせていたため、脚が傾くと**爪先だけが接地**していた。脚を**もも／すね／ブーツの3ピース**に分け、**足首（ブーツの付け根）を独立に回せる**ようにした。接地中は**ブーツ底を水平**に保ち、**踵で着いて足裏に体重、蹴り出しでだけ踵を上げる**（爪先上げ／踵上げは足首角度で作る）。`tools/suitrig.py` / `tools/gen_suit_walk.py`。
  - ブーツを細い所（y=334）で切り分け、すねが床より下へはみ出さないようにした（**全15コマで最下点＝床 y=360、はみ出し 0**）。膝同様に**足首の丸い関節カバー**をブーツ側に持たせた。
  - ストライドを 30 → 32 元絵px に広げた（脚長で届く範囲。IK 到達不能なし）。
- **ボスの当たり判定から巨大な透明円を外した**。`enemyHit` のボス分岐は「頭の1点を中心にした旧フォールバック円 (r=150/190)」をやめ、**頭は描いた頭の形に沿った円・胴は背骨に沿った円**（描画と同じ式）で判定する。何も描いていない空間（鼻先の前・胴のはるか上）では当たらない。胴体への命中は維持。
- **ロック表示を「頭のそばの小さな中立色ブラケット」に変えた**（旧: ボスを囲う大きな赤い円 r=166/206）。当たり判定はシルエット側で、この表示はただの目印。
- リヴァイアサンは頭の画像の後端を胴の鱗へなじませ、急に太く見えた肩の輪郭と大きな繰り返し模様を抑えた。胴の太さは描画と判定で同じ関数を使う。
- **巨大イカの危険な触腕を、描いている長い触腕（クラブ付き2本）と同じ式・同じ太さに合わせ**、**攻撃中（state 'whip'）だけ**ダメージにした（旧: 描画と違う座標の円 r=132）。
- 版: `sw-assets.js` `v10 → v11` / `gameVersion 1.8.0 → 1.8.1`、`js/index.js` の `game.js?v=10 → ?v=11`、`explore.js` の `explore-rules.js?v=9 → ?v=10`。ミサイルの性能と通常の潜航操作は未変更。

### なぜ
- ユーザー指摘『つま先歩きでちょこちょこ…ものすごくおそい。動きとスピードはれんどうさせないほうがいい』に応えるため。歩調を時間ベースにして移動と切り離し、速度を戻し、接地足のブーツ底が地面に見えるようにした。
- ユーザー指摘『ボスの体が変』『ボスの周りにある赤いサークルに当たり判定があって変』に応えるため。巨大な透明円を外し、描いた形に寄せた。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **38 件すべて通過**（assets 5 / combat 5 / explore 20 / weapons 8）。新規・改訂: コマ送りは時間ベース（満速と半倒しで同じ時間→同じ位相・距離は異なる）、壁で足踏みしない、ボスの巨大な透明円が無い（空洞では当たらない）、描いた頭・胴に当たる（接触と弾）、イカの触腕は攻撃中だけ危険。
- `node --check` で JS 5 本 OK、`git diff --check` クリーン。
- アトラス再生成: `python tools/gen_suit_walk.py` → 全15コマで最下点 y=360（はみ出し 0）、IK 到達不能なし、union が共通枠内。接地点で**支持脚のブーツ底が水平**であることを底コンターの傾き≈0 で確認。
- ブラウザ（横持ち Chromium 874×402 / DPR2、ハブ経由）: ハブのカードが **v1.8.1** 表示。探索で歩行を実走し、**前脚のブーツ底が床に水平接地・後脚は踵上げの蹴り出し**で接地していることをスクショで確認（つま先立ちでない）。ボスは**大きな赤い円が消え、頭のそばに小さな淡色ブラケット**のみ。ひらいた顎は歯が並ぶが口内・継ぎ目に破れ/ズレなし（白フラッシュで形状を確認）。

### 残したこと / つまずいた点
- **未取得**: 横持ちの連続クリップ（歩調の推移）と、ボスの頭/胴の継ぎ目・イカの頭/外套の接続を**明るくはっきり**見る比較画像。深海は暗く低コントラストで、ブラウザの自動キャプチャが安定して枠に入らない。旧版（v1.8.0）の比較画像も未取得。
- 歩行コマのすれ違いで遊脚と支持脚のシルエットが少し重なる点は継続（v1.8.0 から）。
- iPhone 17 Safari 実機の確認はこれから。

---

## 2026-11-22 / v1.8.0 — 徒歩探索の歩行を8コマ化／歩き出し・停止・調査・徒歩射撃

### やったこと
- **探索者の歩行を 2 コマ → 8 コマに**。元絵（アセット倉庫 `suit_idle` / `suit_shoot`）から、上半身（胴・腕・銃・ペルヴィス）はマスクで切り出して**剛体のまま**使い、脚だけを「もも」「すね＋ブーツ」の 2 ピースに切って**股関節・膝の 2 ボーン IK** で姿勢を作る。接地足の裏は床 y=360 に合わせ、遊脚はクリアランスぶん浮かせる。→「接地→踏み込み→すれ違い→蹴り出し × 左右」の実フレーム 8 枚。フェードや縦揺れだけの水増しはしていない（8 枚で脚の姿勢が実際に変わる）。
- **コマ送りを時間ではなく「移動距離」で回す**（`WALK_CYCLE_DIST = 2×60×0.78 = 93.6` 論理px／周期、1 コマ = /8）。接地足が後方へ動く量と胴体の移動距離が一致するので、フル送りでも**アナログ低速でも接地足が滑らない**。`WALK_SPEED` は 250 → **140**（この歩幅と釣り合う速度。歩幅・速度・コマを距離でそろえた）。
- **歩き出し**（専用 2 コマ・0.12s）と**停止**（コマを足元の構えへ寄せる・0.16s）の姿勢遷移を追加。
- **遺物の「調べる」に短い非ループの姿勢変化**（専用 4 コマ・0.95s。しゃがんで対象へ寄る）。動き出すとキャンセル。報酬は従来どおり**一度だけ**（二度目は「調査済み」）。
- **徒歩射撃**。PC は J/Z、スマホは右下の**「撃つ」ボタン**（既存の「調べる／戻る」とは独立）。押した瞬間だけのエッジで **1 押下 1 発**（キーリピートしない・発射アニメ中は次の 1 発を受けない）。**構え→発射→短い反動**（0.34s）で、**上半身に射撃ポーズを重ねるだけ**にして脚の接地と移動は止めない（歩きながら撃てる）。銃口に小さな閃光、弾＝曳光と火花（見た目のみ。潜航の弾・敵・弾薬には触らない）。**移動と同時入力可**。降艇／帰還時は発射入力を捨てる。
- **ピクセル絵を荒らさない工夫**: 回転リサンプルを NEAREST にして色数を増やさず、上半身は元絵のドットをそのまま使う。膝はすね側に**回転対称な関節カバー（円）**を持たせて、曲げても切断面が割れないようにした（膝の丸い装甲が動いて見える）。
- **資産**: `assets/suit_walk.webp`（4×4 アトラス・セル 200×280。コマ順 0=待機 / 1..8=歩行 / 9,10=歩き出し / 11..14=調査）と `assets/suit_shoot_upper.webp`（射撃の上半身）。旧 `suit_idle.webp` / `suit_walk_0.webp` / `suit_walk_1.webp` は削除。**生成は `tools/gen_suit_walk.py`（+ `tools/suitrig.py`）で再現可能**（同条件で再生成すると md5 一致、非破壊の lossless WebP 238KB）。
- 版: `sw-assets.js` `v9 → v10` / `gameVersion 1.7.0 → 1.8.0`、`js/index.js` の `game.js?v=9 → ?v=10`、`explore.js` の import を `explore-rules.js?v=9` に。CSS・潜航の描画/操作/ミサイル/魚雷・探索地形/HUD は未変更。

### なぜ
- ユーザー要望『今のスーツの絵柄を保って、接地→踏み込み→足がすれ違う→蹴り出し、左右計8コマ。接地足が滑らないよう速度とコマを合わせ、次に歩き出し・停止、遺物を調べる。射撃も（素材があったはず）』に応えるため。上半身は荒らさず、脚だけを実フレームで作り直し、足の滑りを距離ベースで消した。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **34 件すべて通過**（assets 5 / combat 2 / explore 17 / weapons 8）。explore に歩行8コマ巡回・距離ベース（速さを変えても同位相）・1周期で位相0復帰・歩き出し→歩行→停止・調査の非ループとキャンセル・射撃の1押下1発/同時入力/局面順序/調査報酬に影響しない、を追加。
- 変更した JS 4 本の `node --input-type=module --check` OK。`git diff --check` クリーン。
- **ブラウザ実走（Chromium 横持ち 874×402 CSS / DPR3 / タッチ相当、`python -m http.server` + ハブ経由）**:
  - ハブのカードが **v1.8.0** 表示 → 起動。
  - 潜航で入口近くへ寄せ、**実タッチで「降艇」ボタン**を押して探索へ遷移。
  - **実タッチのドラッグ**で右移動→左移動→離して停止。`anim` が `start → walk → stop → idle` と遷移。位相が 0.125/コマずつ進む（＝距離ベース）ことを実測（phase 0.199→0.274→0.399→0.524→0.648→0.773→0.897→0.022）。
  - 実画面で歩行 8 コマを連続取得（`animFrame` ごとに 1 枚）→ 脚の前後・ストライド・浮きが変わることを確認（8 枚は全部ピクセルが異なる。差 5,000〜19,000px/枚）。
  - 実タッチで「調べる」→ `anim='survey'`・`surveyed=1`・「遺物を調査した」→ 0.95s で待機へ（非ループ）→ 2 回目は「この遺物は調査済み」で**報酬は増えない**。
  - 実タッチで「撃つ」→ `firing='fire'`（閃光＋曳光）→ 0.34s で復帰。**歩きながら**も `firing='fire' && moving=true`（同時入力可）。
  - 入口で実タッチ「戻る」→ `mode='dive'` に復帰し、`fireQueued=false / wantShoot=false / wantDock=false`（**予約入力の持ち越しなし**）。潜航の射撃・魚雷/ミサイル・HUD は無回帰。
  - 確認画像（未追跡・スクラッチ）: 実画面 8 コマのコンタクトシートとループ GIF、既存版（2コマ）との比較画像、実画面アクション（調査/射撃/復帰）。

### 残したこと
- **未検証**: iPhone 17 Safari 実機の FPS・発熱・タッチの手応え、長いループでの見え方（GIF/MP4 は実画面 8 コマを短く繋いだだけ）。
- **既知の小さな不具合**: 歩行コマ 5 で遊脚が支持脚にやや近く、シルエットが軽く重なる。実機で気になればクリアランスかストライドを微調整。
- 調査の姿勢変化は控えめ（しゃがみ最大 24 元絵px ≒ 画面 11px）で、静止画では変化が分かりにくい。大げさにするなら専用の脚ポーズを足す。

### つまずいた点
- 脚を 1 本ずつ自前の股関節で回すだけでは、奥脚の接地位置が手前脚と対称にならず「同じ足で歩いている」ように見えた → **左右の接地を骨盤中心で対称**にした（着地点を共通中心±ストライドに）。
- 2 ボーンで膝を切ると、曲げた瞬間に切断面が割れて**脚が外れて見えた** → 膝に**回転対称な関節カバー（円）**をすね側に持たせて塞いだ。
- 回転リサンプルを BICUBIC にするとドット絵が増色してアトラスが肥大（369→ナシ）→ **NEAREST** にして色数を保ち、WebP lossless 238KB に収めた。
- WebP に書き出す前にアルファ下の RGB が残っていると再構成で差分が出る → 目視に効かないので無視してよいと判断。

---

## 2026-11-22 / v1.7.0 — ミサイルの爆発と吹っ飛ばしを強化／魚雷に弱い誘導

### やったこと
- **ミサイル着弾の演出を専用化**（`missileBurst()`）。魚雷の小爆発と差別化し、**白熱した小さい核**（短命の白い光 r64 + 暖色のにじみ r190）＋**橙の火花**（白熱の小粒14＋橙34）＋**水中の膨張衝撃波**（暖色リング + 青白リングの2枚）＋**泡18**を出す。**画面全体を明るく塗る長いフラッシュは焚かない**（`G.flash` 不使用）。画面揺れは `+12`（上限24）で「短く適度」、音は既存 `AU.boom(1.8)` の重い低音。
- **爆心から周囲の普通の敵を距離減衰つきで放射状に吹き飛ばす**（`knockEnemy()` / `missileBlast()`）。放射速度は基準 640px/s、距離減衰 `0.5〜1.0`（ダメージは中心 1.0〜外周 0.3）。吹き飛び中は既存の `stun` を短く（0.42s）借りて `vx/vy` で移動させ、ミニ魚・クラゲ・機雷のように `vx` を持たない敵も目で追えるように飛ぶ。
- **直撃は満額（威力11）**。直撃した敵は `directEnemy` として周囲ループから**除外**し、二重加算を防ぐ。直撃の敵は弾の進行方向へ飛ぶ。
- **地形（岩）着弾でも周囲効果は一貫**。`missileBlast()` は直撃/地形で共通（引数 `enemy` が null でも放射ループは同じ）。`collide()` は `b.kind === 'missile'` で専用処理へ分岐し、魚雷は従来の挙動のまま。
- **ボス（リヴァイアサン／コロッサル・スクイッド）と海底固定の戦車ヤドカリは吹き飛ばさない**（`knockEnemy` が `isBoss` / `hermit` を `stun` ごと弾く）。ダメージは入る。撃破済み（`dead`）には触れないので復活しない。
- **魚雷に弱い誘導**（`pickTorpedoTarget()`）。発射時に前方コーン（±0.42 rad ＝約24°）・射程1000以内の生きた標的を**1つだけ**選び、角速度 **1.1 rad/s**（ミサイル 4.2 の約1/4）で寄る。射出方向（PCマウス・タッチ）は尊重し、**背後や射線外には旋回しない**。`a` を動かしても `vx/vy` は現在速度から作り直して常に揃え、標的が死んだら直進に戻る。**毎フレームの全弾×全敵走査は追加していない**（候補は発射時のみ・継続は選択済みの1体だけ）。
- 版を `v1.7.0` / `sw-assets` `v9` に上げ、`js/index.js` の `game.js?v=8` を `?v=9` に。`package.json` も 1.7.0 に。変更していない探索モジュール（`explore.js` / `explore-rules.js`）と CSS、`?v=`（CSS 側）には触れていない。
- `tests/weapons.test.mjs` を追加（8件）。README / docs を v1.7.0 に更新。

### なぜ
- ユーザー希望『ミサイルの爆発と吹っ飛ばしは爽快感を感じる重要なポイントとして力を入れて欲しい。あと普段のショットも多少ホーミングして』に応えるため。魚雷との差別化、直撃/地形での一貫性、ボス・固定敵の例外、誘導の負荷対策まで含めて実装した。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **24 件すべて通過**（assets 5 / combat 2 / explore 9 / weapons 8）。`node --check` で index.js / game.js / explore.js / explore-rules.js / sw-assets.js の構文 OK。`git diff --check` クリーン。
- `tests/weapons.test.mjs` の内訳（本物のゲームループを回して実挙動を検証）:
  1. ミサイル直撃:威力はそのまま（`hp 50→39` で二重加算なし）＋進行方向へ吹き飛ぶ（`vx>100`, `stun>0`）
  2. ミサイル周囲:距離減衰ダメージ（直撃39 < 周囲46.7 < 無傷50）＋爆心から放射状（`vx>0 && vy>0`）
  3. ミサイル地形着弾:岩に当たっても周囲の敵が巻き込まれ吹き飛ぶ
  4. ボス:ダメージは入る（`hp 9999→9988`）が `vx=vy=0` / `stun=0` で吹き飛ばない
  5. 戦車ヤドカリ:ダメージは入るが `vx=vy=0` / `stun=0` で吹き飛ばない
  6. 魚雷の前方補正:`b.target` が選ばれ `a` が負方向へ変化、`vx/vy` が `a` と整合
  7. 魚雷は背後・射線外へ補正なし（`b.target === null`、`a` 不変）
  8. 魚雷は標的死亡で壊れない（弾は残り前進、速度も有限）
- ブラウザ実走（Chromium, 横持ち 874×402 CSS / DPR3 / タッチ相当。`python -m http.server` + `window.__abyss`）:
  - ハブに ABYSS DIVE カードが **v1.7.0** で表示（`gameVersion` 実行時読み）。
  - ミサイルを密な敵群へ発射 → 着弾直後に **3体が被弾・飛散（直撃1＋周囲2）、範囲外3は無傷**。吹き飛び後の敵 `vx/vy` が爆心から外向き（例: 直撃個体 `vx≈390, vy≈178`）であることを実測。
  - 魚雷を前方の敵（マウス照準から少し上）へ発射 → `a` が `0 → -0.11 → -0.495` と上向きに補正され、敵へ寄った。
  - スクショ: `abyss-dive/docs/previews/v1.7.0_missile_burst.png`（着弾の演出）／`v1.7.0_missile_scatter.png`（飛散）／`v1.7.0_torpedo_homing.png`（魚雷の経路）。※この3枚は新規の検証画像（未追跡）。不要なら削除してよい。

### 残したこと
- iPhone 17 Safari 実機でのプレイ確認は未実施。爆発の粒数（`G.parts` は 700 上限）と `AU.boom(1.8)` の鳴りは実機で違和感がないか要確認。
- 吹き飛ばしの効き（MISSILE_KNOCK 640 / 減衰 0.5〜1.0）と魚雷誘導（1.1 rad/s・コーン0.42）の最終バランスは、ユーザーの手応え次第で調整の余地。

### つまずいた点
- テスト用の「静止する敵」を未知の `kind` で作ったところ、描画 `drawWorld` が魚として扱い `drawFish` で落ちた。**実在の renderable な kind（`jelly`）で代用**し、`vx` を上書きしない敵を選んだ（`enemyUpdate` が `vx` に触れない）。
- 検証ブラウザの `capture_screenshot()` は毎回同じパスへ上書きするため、撮るたびに別名へコピーしてから見比べた。

---

## 2026-11-22 / v1.6.0 — 遺跡の徒歩探索（最初の縦切り）を追加／回避と撃破表示の不具合修正

### やったこと
- **潜航から降りて遺跡を歩く小さなループ**を追加。序盤の浅い位置（潜航側 `x=1450, y=430`, 半径78）に光る「沈没都市 遺跡エアロック」を置き、入口の近く（距離 ≤ 124）でのみ `E` / Enter / パッドA / タッチの「降艇」ボタンで降りられる。
- 探索マップは1枚（全長2600）。床 `y=566` の水平1本、遺物は2つ（`x=1200`「崩れた祭壇」／`x=2010`「沈んだ石碑」）。近づいて「調べる」で**1度だけ**報酬（各+250点）。同じ入口（`x=250`）に戻って「潜航へ戻る」で再開。
- 徒歩中は**潜航シミュレーションを止め**（`frame()` が探索の更新・描画へ委譲）、**帰還時は予約入力を全消し**（`clearInputLatch`）。潜水艇は入口の外側へ出して場内再突入を防ぐ。進捗は1潜航のあいだ保持し `startGame()` でリセット。
- **潜航の描画・HUD・戦闘・既存タッチは非変更**。探索は別モジュールに分離: 描画・入力を `js/explore.js`、歩く／調べる／戻るの純粋ルールを `js/explore-rules.js`。潜航側の入口マーカー描画も `explore.js` に置き、`render()` へは呼び出し1行だけ足した。
- 探索者はアセット倉庫 `bot-commander/assets/suit` の `suit_idle`・`suit_walk_0`・`suit_walk_1`（384×384, 足元 y=363, 頭 y=96）をコピーして使用。足元を床に固定し、歩行は2コマ（0.18s ごと）。遠景は既存 `sunken-city.webp` を青緑に染めた事前描画板（視差0.24）、暖色ライト・床の輪郭・洞窟風の枠で見せる。
- 入力: PC は A/D・←→ と E。パッドはスティック／十字 + A（同時押し可）。タッチは既存スティックを共用し、右下の文脈ボタンで調べる・戻る。
- 版を `v1.6.0` / `sw-assets` `v8` に上げ、`js/index.js` と `game.js` の内部 `?v=` を 8 に。`sw-assets.js` の files に `js/explore.js`・`js/explore-rules.js`・探索者3枚を追加。`package.json`（type:module）と `tests/explore.test.mjs` を追加。
- 併せて親セッションが `game.js` を2点修正: **回避の `Input.wantDash` を `playerUpdate` で毎フレーム消費**（連続発動の解消）と、**描画前の `cull()` 復帰**（撃破済みの敵が残る不具合の解消）。`tests/combat.test.mjs` を追加。
- README と `docs/CURRENT_WORK.md` を v1.6.0 に更新。

### なぜ
- 「海底都市・遺跡を人間で探索」の最初の遊べる形として、潜航から降りて歩き、遺物を調べて戻る小さなループを作るため。序盤から気軽に試せるよう、入口は浅く・早期に置き、深潜りやダメージ前提にしていない。

### 検証
- `node --test abyss-dive/tests/*.test.mjs` → **16 件すべて通過**（assets 5 / combat 2 / explore 9）。`node --check` で index.js / game.js / explore.js / explore-rules.js / sw-assets.js の構文確認 OK。
- ブラウザ（Chromium, ローカルサーバ）で実走: ハブ → ABYSS DIVE 起動 → `x=1450` の入口マーカー表示（ラベルと「E で降艇」）→ E で降艇（`mode: explore`）→ D 長押しで歩行（x 430→1238、歩行コマ）→ 遺物で「調べる」（`relics[0]=true`, `surveyed 1`, score 250）→ 再押下で「調査済み・加点なし」→ 入口へ戻って E（`mode: dive`、潜水艇 1618 で `entranceNear=false`、`fireQueued`/`wantDash`/`wantDock`/`stick` すべて false、進捗維持）。スクリーンショットで探索シーン（探索者が床に接地・青緑遠景・暖色ライト・床輪郭・UI）と潜航側の入口リング＋HUD の正常表示を目視。
- 回避・撃破の2修正は親セッション側で公開版の再現→修正確認・`combat.test.mjs` 通過を確認済み。
- リリース前に親セッションが横持ち Chromium でタッチ操作だけの降艇・歩行（2コマ）・調査・帰還を確認。柱で調査員が隠れないよう描画順を変更し、遠景の石造都市を明るく調整。左上のハブ復帰ボタンとの重なり、および調査ラベルが顔にかかる問題も解消した。

### 残したこと
- iPhone 17 Safari 実機での探索（徒歩・タッチ・パッド・FPS/発熱）は未確認。
- 探索の見栄えと手応えの詰め（接地感・ライトの当たり）、洞窟の分岐や2マップ目、探索内の戦闘（`suit_shoot`）は今後。

### つまずいた点
- 検証ブラウザでタブが非表示だと `requestAnimationFrame` が約1fpsに絞られ、歩行が進まず「移動しない」ように見えた。`Page.bringToFront` で解決（実機では無関係）。
- CDP の合成キーが届かず、`window.dispatchEvent(new KeyboardEvent(...))` で既存ハンドラを叩いて確認した。
- `docs/*.md` は `write_file` の上書きガードに弾かれたため、局所 `patch` で更新した。

---

## 2026-11-22 / v1.5.0 — v1.2.0 以降の変更を取りまとめ

- GitHub の `main` で ABYSS DIVE の前版が v1.2.0（`08933d45`）であることを確認。v1.3.0〜v1.5.0 を追加素材7点とあわせて取りまとめた。
- 素材・登録テスト5件、変更した JavaScript の構文、Git の差分チェックを再確認した。
- v1.3.0 以降のブラウザプレイと iPhone 17 Safari での実機確認は未実施。

---

## 2026-11-22 / v1.5.0 — 遠景の小魚と敵の見分けを改善

- 遠景に青灰色の小魚の群れを追加。敵魚には背棘・牙・暖色の目を持たせ、群れの牙魚にも小さな接触ダメージを設定した。
- 素材倉庫の `G04.webp` を砲撃イカとして採用。深い区間で潜水艇を追い、砲口を光らせてから撃つ。
- JavaScript の構文と素材の配置を確認。プッシュ依頼時に既存の `assets.test.mjs` を実行し、5件すべて通過。ブラウザと実機でのプレイ確認は未実施。
- v1.3.0〜v1.5.0 の変更は作業ツリーに残っている。セッションの書き込み範囲が `abyss-dive` に限られ、親の `.git` に書き込めなかったため未コミット。GitHub への接続も許可範囲外で、プッシュと公開先への反映は未実施。次のセッションは親の Git ルートを開き、ゲームの差分を確認してコミット・プッシュへ進む。

---

## 2026-11-22 / v1.4.0 — 背景魚、直撃表示、照準を調整

- 背景魚を幅広いひれと細い尾のエイに描き替えた。敵魚の輪郭や発光する目との見分けをつけるため。
- 敵魚への攻撃は胴体を基準に判定。弾の移動経路上を調べてすり抜けを減らし、敵への直撃を着弾点の × で伝える。
- 船体とライトは移動で傾き、照準は弾の射出方向に使う。緊急回避も移動入力方向で行う。
- JavaScript の構文を確認。ブラウザと実機でのプレイ確認は未実施。

---

## 2026-11-22 / v1.3.0 — パイロット・機雷・戦車ヤドカリに倉庫素材を採用

- パイロットの立ち絵をタイトルに追加。船体ゲージ横では通常顔と被弾顔を切り替える。
- 機雷に `G10_mine` の透過画像を採用。戦車ヤドカリは `G09` の起動・休眠差分を使い、海底に固定。接近や被弾で起動し、予兆を出してプレイヤーに砲撃する。
- 画像6点をゲームのキャッシュ対象に追加。元絵の色と形を活かし、暗い海底では砲口の発光で攻撃のタイミングを伝える。
- 追加画像の配置と JavaScript の構文を確認。ゲーム画面と iPhone 実機での確認は未実施。砲撃イカなどは次の再利用候補。

---

## 2026-11-21 / v1.2.0 — コンセプト動画に合わせた船体・深海・巨大魚の再描画

- 動画から抜き出したフレームを確認し、潜水艇09の摩耗した金属と暖色ライト、石造都市の青緑の奥行き、泡、巨大魚の黄色い目と牙を反映した。
- 3枚の WebP を追加。都市は視差で流し、リヴァイアサンの下顎は既存の開口値で動かす。暗幕を 640×360 に縮小し、光芒と泡を使い回して、描画を最大 60 fps 目安に調整した。
- Chromium の 874×402 CSS px / DPR 3 でハブから起動し、魚雷・ミサイルのタップ、移動、ボス描画、一時停止、ハブ復帰と再起動を確認。JS エラーなし。自動テスト 5 件と構文チェックを通過。
- 実機評価は未実施。小型敵・巨大イカの質感と背景のバリエーションは今後の課題。

---

## 2026-11-21 / v1.1.1 — 水中の光と質感の初期改善

- 浮遊物の事前描画テクスチャ、ライトの光芒、潜水艇の鋲と傷を追加。水中の奥行きと工業的な質感を改善するため。
- 高密度画面の Canvas 描画倍率を最大 1.5 に制限し、塗りつぶし負荷を抑制。画質と性能のバランスは iPhone 17 実機で要確認。
- 検証: assets.test.mjs 5件成功、game.js の構文確認成功。画面の目視確認と実機測定は未実施。
- 動画ファイルの場所は確認したが、利用可能な再生・デコード手段で映像を確認できず、動画との直接比較は未完了。写実的な造形や素材への置き換えは残る。

---

## 2026-11-21 / v1.1.0 — セミオート化・ボス当たり判定の拡張・背景レイヤーの遮蔽

### やったこと
- **魚雷を自動連射 → セミオートに変更**
  - PC: 左クリック または `J` / `Z` で1発。押しっぱなしでは撃たない（`Input.fireQueued` のラッチを `update()` が1回だけ消費する方式）
  - スマホ: 右下に大きな「撃つ」ボタンを追加。ボタン以外の画面タップでも1発（左66%は移動スティックのまま）
  - 連射クールダウン 0.075 秒。過熱（オーバーヒート）はそのまま残した
- **ボスの当たり判定を胴体まで拡張**（`enemyHit()` に集約）
  - 頭の1点だけだったのを、体の芯に沿って13個の円を並べる方式に変更
  - リヴァイアサン / コロッサル・スクイッド の両方。プレイヤーとボスの接触判定も同じ形に統一
- **背景と手前の区別（遮蔽レイヤー）**
  - 背景（水のグラデーション / 光条 / 尖塔 / 遺跡 / 巨大魚 / 海雪）と実体のあいだに `drawDepthScrim()` を1枚追加
  - 背景を泳ぐ巨大魚を「黒い影（`#00040a` / 不透明度0.52）」→「青い靄（`rgba(96,150,190,0.55)` / 不透明度0.46）」に変更
  - 遺跡の不透明度 0.55–0.95 → 0.38–0.64、背景尖塔 0.85 → 0.62

### なぜ
- 通常弾が勝手に連射されると撃つ手応えが無い、という指摘
- 背景の魚と敵の区別がつかない、という指摘
- ボスっぽい敵に当たり判定が無い（＝胴体を撃っても通らない）、という指摘

### 検証（ローカルサーバ + 実ブラウザ）
- 押しっぱなし2秒 → 発熱 0・弾1本（自動連射の頃なら 発熱1.0・弾20本以上）
- 左クリック5回 → 弾5本
- リヴァイアサン: 頭から700px後ろ（頭の判定 r=150 の外＝胴体）への着弾で HP 300 → 295
- コロッサル・スクイッド: 頭から400px後ろへの着弾で HP 420 → 415
- タッチの「撃つ」ボタン → 弾1本
- 同一画面に背景の靄と手前の敵（黒い体＋光る目）を並べ、見分けがつくことを目視で確認
- JSエラー0 / `node --test abyss-dive/tests/assets.test.mjs` 5件パス / 構文チェックOK

### 残したこと
- セミオートにしたぶんの「撃つ気持ちよさ」は未調整（1発の重さ・音・反動）。要望があれば押しっぱなし連射のオプション化も検討
- ミサイルの入手機会・弾数バランスは未着手

---

## 2026-11-21 / v1.0.0 — 工房に初追加

### やったこと
- 単体HTMLで作っていたものを工房のゲームモジュール形式に移植
  - `js/index.js` … `prepare()` で CSS、`init(container, onBackToHub)` で DOM生成と起動、「← もどる」ボタン、`destroy()`
  - `js/game.js` … `createAbyssDive({ canvas, onGameOver })` が描画・更新・入力・音を内包。`destroy()` でリスナー解除と AudioContext の close
  - `css/abyss-dive.css` / `sw-assets.js` / `tests/assets.test.mjs` / `README.md`
- 共有ファイル更新（新規ゲーム追加のため）: `common/js/games-registry.js`（`section: kids`）、`sw.js`（`GAME_IDS` 追加 + `SHELL_VERSION` v229→v230）、`index.html`（`app.js?v=`229→230）、`README.md`（ゲーム一覧に1行）
- ゲーム内容: ツインヘッドライトの潜水艇、沈んだ古代都市、リヴァイアサン（巨大魚）とコロッサル・スクイッド（巨大イカ）の2ボス、ソナー、緊急回避、深度による暗転、ボス戦の地響き

### なぜ
- 参考にした映像（Deep Sea Protocol 風の深海シネマティック）に寄せた見た目と、撃ちまくる手応えのある横スクロールシューティングを作るため

### 検証
- 工房のローカルサーバで ハブ → カード（v1.0.0 表示）→ 起動 → プレイ →「← もどる」→ ハブ復帰 → 再入場まで確認。JSエラー0
- 60fps（通常戦闘・ボス戦とも）

### つまずいた点（環境）
- このセッションから `git push` が通らなかった。原因は system gitconfig の `credential.helper = helper-selector`（Git for Windows 2.56 同梱の `git-credential-helper-selector.exe`）が **GUIダイアログで使う helper を選ばせる作り**で、対話デスクトップを持たない実行環境では `CreateWindowExW` が返らずハングするため（`strings` で `CreateWindowExW` / `IsDialogMessageW` / Common-Controls を確認、`GIT_TRACE` でセレクタが60秒停止するのを確認）。読み取りの `git ls-remote` は通る。→ **push はユーザーが通常の PowerShell で実行する運用**にした（手順は AGENTS.md / CLAUDE.md 3章）。
