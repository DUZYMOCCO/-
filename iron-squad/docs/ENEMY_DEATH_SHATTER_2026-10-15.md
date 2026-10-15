# 敵の撃破演出（砕け散る＋音）指示書 2026-10-15

担当: Codex または Gemini（実装）／ Opus（レビュー）
版: v7.0.6 / キャッシュ v283

## 目的
敵のHPが0になると、いまは配列から消えるだけで「フッと消える」。手ごたえがない。
倒した瞬間に **砕け散るエフェクト** と **砕ける音** を出す。全敵種で共通の1種類でよい（ユーザー指示「共用でいい」）。

## 現状（調査済み）
- 撃破の入口は `js/index.js` の `killMonster(monster, attacker, isPlayer)`（8492行付近）。先頭で `this.monsters.splice` して消している。`monster.retreated`（撤退）のときは何もせず return する → 撤退には演出を出さない。
- 既存のパーティクルは `this.particles`（上限 `PARTICLE_CAP=48`）と `pushParticle` / `spawnSparks`。ここは他の演出と取り合いになるので **使わない**（撃破演出が多いと火花が消える）。
- 効果音は `../../common/js/audio.js` の `sound`。`sound.play(name,{x,y,volume,gap,group})` で既存の wav を鳴らせる（距離減衰・左右定位・同時発音数の上限あり）。使える音: `common/assets/audio/` の blast, hammer, metal, stone, hit, down など。

## 作るもの
1. **新モジュール `js/death-shatter.js`**（ゲームフォルダ内）
   - `spawnDeathShatter(game, monster)`: 撃破位置に破片の群れを1つ登録する。
   - `updateDeathShatters(game, dt)` と `drawDeathShatters(game, ctx)`: 更新・描画。
   - 状態は `game.deathShatters`（配列）に置く。保存しない。
2. **見た目（共通1種）**
   - 一瞬の白い閃光（半径は敵の大きさ程度、0.08秒）＋ 敵の色の破片 6〜8個が外へ飛び散り、回転しながら落ちて0.4〜0.5秒でフェードアウト。破片は三角形か四角形（`fillRect` / `Path2D` 程度の軽い描画。`shadowBlur`・グラデーション・フィルタは使わない）。
   - 破片の色は敵の本体色を使う（monster に色の項目があればそれ、なければ灰色系の固定色）。大きさは敵の描画サイズ（scale など）に比例。
   - 中ボス・ボスは破片を2倍・時間を1.5倍、閃光を大きく。魔王は既存のボス演出があればそれと重ねてよい。
3. **音**
   - 雑魚: 既存の wav を流用（例 `stone` か `hammer` を volume 0.45 前後）。`gap` を 0.07 以上にして、群れを一掃したときに連打で耳障りにならないようにする。`x,y` を渡して距離減衰を効かせる。
   - 中ボス・ボス: `blast` など重い音を volume 0.7 前後で。
   - **新しい音素材の追加や `common/` の編集はしない**（共有ファイル。CLAUDE.md 1章）。
4. **呼び出し**
   - `killMonster` の中で、`retreated` で return した後・splice の前後どちらでもよいので `spawnDeathShatter(this, monster)` と音を1回だけ呼ぶ。撃破以外（撤退・波の終わりの一掃・ワープ消去など）で消える経路には付けない。
   - 毎フレームの更新と描画を既存のパーティクル更新・描画のそばに追加。描画は敵より手前、ダメージ数字より奥。画面外（カメラ範囲外）は描画しない。
   - ゲームの再開・終了（`destroy` / `gameOver` / 読込）で `game.deathShatters` を空にする。

## 性能の守り（iPhone SE2 想定、必須）
- 同時に存在する破片の群れは最大12個。超えたら古いものから捨てる。破片の総数は最大96個。
- 群れ1つにつき、閃光1回＋破片 n 回の描画だけ。`save/restore` は群れ単位で1回まで。
- 確認: CPU4倍スロットル・390×844・敵40体を範囲攻撃で一度に倒す場面で、100ms超えのフレームが変更前より増えないこと（既存の `tools/` の計測スクリプトを流用してよい）。

## 守るルール（CLAUDE.md）
- 編集は `iron-squad/` の中だけ。`sw.js`・`index.html`・`common/` は触らない。
- `iron-squad/sw-assets.js`: `version` を `v283`、`gameVersion` を `'7.0.6'` に。`files` に `js/death-shatter.js` を追加。
- 変更したモジュールの import の `?v=` を 283 に（新モジュールの import にも `?v=283` を付ける）。
- 改行コードは既存ファイルに合わせる（CRLF/LF を混ぜない）。
- コミットは指示があるまでしない（Gemini がコミットする運用）。

## テスト
- 新規 `tests/death-shatter.test.mjs`:
  - `spawnDeathShatter` で群れが1つ増え、雑魚は破片6〜8、ボスは倍になる。
  - 12個を超えたら古いものから捨て、破片総数は96以下。
  - 寿命が過ぎたら `updateDeathShatters` で消える。
  - `retreated` の敵を `killMonster` に渡しても群れが増えない。
- 全テスト: `node --test iron-squad/tests/*.test.mjs` が全PASS（現在208件＋新規）。実行で書き換わる `iron-squad/docs/previews/*.png` は `git checkout iron-squad/docs/previews` で戻す。

## 完了報告の形
- 変更ファイル一覧、テスト件数と結果、性能計測の前後比較（100ms超えの回数・平均フレーム時間）。
- 雑魚1体・群れ一掃・ボスの撃破瞬間のスクリーンショット（390×844）を `docs/validation/death-shatter-v7.0.6/` に保存。
- `docs/CURRENT_WORK.md` の先頭に v7.0.6 の項目を追記。

---

## 実装結果（Codex / 2026-10-15）

v7.0.6 / cache v283 として実装。コミット/プッシュなし。

### 変更ファイル

- `js/death-shatter.js`（新規）: 生成・更新・描画、7/14破片、0.45/0.675秒、閃光0.08秒、12群/96破片の上限、画面外省略、独立した描画用乱数。
- `js/index.js`: 実撃破の1回だけ生成/音、フレーム更新/描画、読込/新規/終了/ダンジョン遷移の破棄。撃破時の共有火花生成を置換。既存の巨大ボス追加演出は保持。
- `sw-assets.js`: v283 / 7.0.6、新モジュール追加。変更したindexの新importは `?v=283`。
- `tests/death-shatter.test.mjs`（新規）: 個数/色/大きさ/全ボス分類/古い順の破棄/混在上限/二重生成/撤退/物理/寿命/描画回数/画面外/実killの音/保存/更新/終了を検証。
- `tools/playtest-death-shatter.mjs`（新規）: 変更前/後の実範囲攻撃・計測・音/保存・390×844撮影。`screens` は保存済みの性能計測を保持して画像だけ再撮影。
- `tools/check-death-shatter.mjs`（新規）: 構文・相対import・全キャッシュ対象のHTTPバイト一致・改行・計測比較。
- `docs/CURRENT_WORK.md` と本書: 実装/検証結果。
- `docs/validation/death-shatter-v7.0.6/`: 画像5枚、before/after/final-validationのJSON。

### テスト結果

`node --test iron-squad/tests/*.test.mjs`: **209件、208 PASS / 1 FAIL**、82.28秒。
追加の撃破演出テストは単独/全体でPASS。失敗は `kana-mode.test.mjs` の既存共有ゲーム一覧にある「蟻」の未変換。
対象文字列は `common/js/games-registry.js:18` の別ゲーム紹介「色をたべつくす、わらわら蟻軍団！」。同ファイル・共有辞書は本作業で未変更。
変更前v7.0.5のindexを読む比較実行でも同じエラーを再現した。共有ファイルを編集しない指定を守り、この1件は未修正。
全件ログ: `docs/backups/full-tests-death-shatter-v7.0.6.log`、変更前再現: `docs/backups/kana-baseline-death-shatter-v7.0.5.log`。

テスト生成PNGは `docs/backups/20261015-before-death-shatter-v7.0.6.zip` 内の元バイトへ復元・SHA256照合。
変更前indexのSHA256: `6B59031F71DDFD256B3B4CE5019EFAC1361B8874945DEC9EFA99C8EE17F665A0`（凍結元との一致を確認）。凍結ソース: `docs/backups/death-shatter-reference-v7.0.5/`。

### 性能の前後比較

Chrome / 390×844 / CPU4倍、60フレーム予熱後360フレーム。40体を斧の実際の範囲攻撃で一度に倒す場面を60フレームおきに6回。
前後とも描画/AI対象47兵、各攻撃の直前に敵40体、直後に0体を確認。自動保存は停止し、使い捨てブラウザ保存領域・Service Worker無効で既存セーブに影響しない。
全テスト終了後、前後を順番に実行して計測。他の検証テストを同時実行していない。単回比較であり、実機での高速化の保証にはしない。

| 指標 | v7.0.5 | v7.0.6 |
|---|---:|---:|
| 平均フレーム処理時間 | 22.626ms | 20.410ms |
| 処理時間p95 | 42.000ms | 30.700ms |
| 処理時間最大 | 374.000ms | 295.000ms |
| 処理100ms超 | 6回 | 6回 |
| 平均フレーム間隔 | 32.082ms | 29.027ms |
| 間隔100ms超 | 10回 | 8回 |

一掃直後の新演出は12群/84破片。単体テストではボス混在時も12群以下・96破片以下を確認。既存の一斉撃破時の長いフレームは残っている。
ブラウザ例外0。stone/blastの呼出位置・音量・gap、AudioContextのrunningとstoneのロードを確認。読込/終了時は0群、セーブ内に演出状態なし。

最終静的確認: JS/MJS 430ファイルの構文、相対import 1,134件、キャッシュ153対象の存在とHTTP応答バイト一致、変更したCRLFテキスト7ファイル、`git diff --check -- iron-squad/` を確認済み。結果は `validation/death-shatter-v7.0.6/final-validation.json`。

### 撃破瞬間の画像

- [雑魚1体・閃光](validation/death-shatter-v7.0.6/ordinary-390.png)
- [雑魚1体・飛散](validation/death-shatter-v7.0.6/ordinary-fragments-390.png)
- [40体一掃](validation/death-shatter-v7.0.6/crowd-390.png)
- [中ボス・閃光](validation/death-shatter-v7.0.6/midboss-390.png)
- [ボス・飛散](validation/death-shatter-v7.0.6/boss-390.png)

雑魚/中ボス/ボスは実際の通常攻撃経路、一掃は斧範囲攻撃。撮影時だけ死亡直後の演出年齢を0.035/0.12/0.18秒で止めている。
iPhone実機の確認は未実施。変更はIron Squad配下のみ。並行作業の他ゲームの差分は保持。

## Opusレビュー（2026-10-15）と手直し指示

全体の作り（別の入れ物・上限・撃破時だけ・撤退除外・破棄・音の間隔）は問題なし。以下の1点だけ直して v7.0.6 のまま（版は上げない）仕上げる。

### 直すこと：雑魚の破片が小さすぎて見えない
- `ordinary-fragments-390.png` では破片がほぼ見えない（世界座標で約2px、灰色の地面に灰色の破片）。ボスの破片（金色）は見える。これでは「手ごたえ」が出ない。
- `js/death-shatter.js` の調整:
  - 破片の大きさ `Math.max(2,size*.18)` → `Math.max(4,size*.32)` 程度に。
  - 破片に細い暗い縁（`strokeStyle='rgba(0,0,0,.55)'`、`lineWidth=1`、群れ単位で1回設定）を付けて、地面と同系色でも見えるようにする。
  - 雑魚の閃光の半径を `size*1.3` 以上に。
  - 飛ぶ距離を少し広げる（`speed` の上限 170 → 220、下限 55 → 80）。
- 個数・寿命・上限（12群/96破片）は変えない。
- 調整後に雑魚1体・40体一掃の390×844画像を撮り直し、**拡大しなくても破片が見えること**を確認。CPU4倍の100ms超が変更前（6回）より増えないことも再確認。

### 参考（今回は対応不要）
- `kana-mode.test.mjs` の失敗は、Gemini が追加した別ゲーム「カラー・アント」のハブ登録文（`common/js/games-registry.js` の「蟻」）が原因。Iron Squad の作業では直さない。ハブ側で別途対応する。


## Opusレビュー手直し結果（Codex / 2026-10-15）

**v7.0.6 / cache v283を維持して手直し完了。コミット/プッシュなし。**

- 破片を `Math.max(4,size*.32*(.8+random()*.7))` に変更。小さい敵や乱数の最小値でも4px以上。
- 群れごとに一度だけ `strokeStyle='rgba(0,0,0,.55)'` / `lineWidth=1` を設定し、各三角形に暗い縁を追加。save/restoreは群れごとに1回のまま。
- 通常敵の閃光半径をsizeの1.3倍、飛散速度の基準を `Math.min(220,80+size*2)` に拡大。
- 通常7/ボス14破片、寿命0.45/0.675秒、閃光0.08秒、12群/96破片、保存/破棄/撤退除外/音は維持。
- `js/death-shatter.js` / `tests/death-shatter.test.mjs` / `tools/playtest-death-shatter.mjs` / `tools/check-death-shatter.mjs` / `docs/CURRENT_WORK.md` / 本書を更新。Gemini向け依頼文 `docs/GEMINI_REQUEST_KANA_2026-10-15.md` を追加。

### 手直し後の検証

全テスト: **209件、208 PASS / 1 FAIL**（75.54秒）。最小4px・閃光の広さ・破片すべての暗い縁・描画状態の復元を追加検証しPASS。
失敗は共有ハブ紹介文の「蟻」のかな変換1件のみ。共有ファイルは編集していない。ログ: `docs/backups/full-tests-death-shatter-v7.0.6-review.log`。

手直し前のv7.0.6モジュールを凍結し、同一ハーネス・使い捨て保存領域で前後を順番に計測。CPU4倍・390×844、60フレーム予熱＋360計測、40体の実範囲攻撃を6回、前後とも47兵。全テストとは同時実行していない。

| 指標 | 手直し前v7.0.6 | 手直し後v7.0.6 |
|---|---:|---:|
| 平均フレーム処理時間 | 25.674ms | 23.799ms |
| 処理時間p95 | 41.800ms | 37.900ms |
| 処理時間最大 | 456.200ms | 343.200ms |
| 処理100ms超 | 6回 | 6回 |
| 平均フレーム間隔 | 35.092ms | 33.517ms |
| 間隔100ms超 | 14回 | 14回 |

100ms超の処理フレームは初回実装時と同じ6回で増加なし。新演出は一掃直後に12群/84破片、ブラウザ例外0。保存対象外・読込/終了の破棄・音の呼出も再確認。
単回計測の差を高速化の保証にはしない。既存の一斉撃破時の長いフレームは残る。iPhone実機は未確認。

390×844の原寸で、通常色/灰色ともに三角形と暗い縁を目視確認。撮影し直した画像:

- [雑魚1体・閃光](validation/death-shatter-v7.0.6/ordinary-390.png)
- [雑魚1体・飛散](validation/death-shatter-v7.0.6/ordinary-fragments-390.png)
- [灰色の破片・飛散](validation/death-shatter-v7.0.6/ordinary-gray-fragments-390.png)
- [40体一掃](validation/death-shatter-v7.0.6/crowd-390.png)
- [中ボス](validation/death-shatter-v7.0.6/midboss-390.png)
- [ボス](validation/death-shatter-v7.0.6/boss-390.png)

上記の初回実装の計測値は歴史的な記録。初回画像/JSONは `docs/backups/death-shatter-pre-review-v7.0.6/validation/`、手直し前モジュールは同ディレクトリの `iron-squad/js/death-shatter.js` に保存。
現在の `validation/death-shatter-v7.0.6/before.json` はレビュー手直し前v7.0.6、`after.json` は手直し後。再現: `node iron-squad/tools/playtest-death-shatter.mjs before iron-squad/docs/backups/death-shatter-pre-review-v7.0.6` の後、`node iron-squad/tools/playtest-death-shatter.mjs after`。
テスト生成PNG3枚は今回の編集前ZIPから元バイトへ復元しSHA256照合。改行は各ファイルの形式を維持。

### Geminiへの依頼

「蟻」を「あり」に置き換える依頼文を [GEMINI_REQUEST_KANA_2026-10-15.md](GEMINI_REQUEST_KANA_2026-10-15.md) に保存。
Geminiへの接続ツールとローカルCLIが確認できず、直接送信は未完了。別のCodexチャットをGeminiとして扱って送ることはしていない。
