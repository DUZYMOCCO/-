# スマホゲーム工房 作業ルール（CLAUDE.md / AGENTS.md 共通）

複数のAIセッションが「ゲームごと」に並行作業する。干渉を避けるため以下を守る。

## 1. 編集範囲
- 各セッションは **自分の担当ゲームのフォルダ（`iron-squad/` または `dada-survivor/`）だけ** を編集する。
- 共有ファイル（ルートの `index.html` `sw.js` `manifest.json` `README.md`、`common/` 以下）は、
  **ゲームの新規追加** または **ハブ（スタジオ本体）自体の変更** のときだけ編集する。コミットメッセージに理由を書く。
- ゲームの更新で `sw.js` / `index.html` / `common/js/games-registry.js` / `common/js/app.js` を触る必要はない。

## 2. ゲームのバージョンの上げ方（ゲーム側だけで完結）
1. `<ゲーム>/sw-assets.js` の `version`（キャッシュ用。例 `v180` → `v181`）を上げる。ファイルを増減したら `files` も直す。
   あわせて同ファイルの `gameVersion`（例 `'5.0.1'`）も上げる。ハブのゲームカードの表示版はここを実行時に読む（ハブ側の編集は不要）。
   **更新のたびに必ずこの2つを上げる**。`gameVersion` は規模で選ぶ：
   不具合修正・見た目の微調整・文言＝パッチ（`5.0.1` → `5.0.2`）／機能追加・仕様変更・バランス調整＝マイナー（`5.0.2` → `5.1.0`）／大きく作り替えた・区切りがついた＝メジャー（`5.1.0` → `6.0.0`）。
2. 変更したモジュールの内部 `?v=` を、そのゲームのフォルダ内だけで上げる（CSS の `?v=` は `<ゲーム>/js/index.js` の `prepare()`）。
- キャッシュは `game-<id>-<version>` としてゲームごとに分かれ、他ゲームのキャッシュは消えない。
- Service Worker は `sw-assets.js` の変更を検知して更新される（詳細は README.md「構成とキャッシュ」）。

## 3. Git
- `git add -A` / `git add .` 禁止（他ゲームの作業中変更を巻き込む）。**`git add <自分のゲーム>/` のようにフォルダ指定**でステージする。
- コミット前に自分のゲームのテストを実行して通すこと。
  - Iron Squad: `node --test iron-squad/tests/*.test.mjs`（実行で書き換わる `iron-squad/docs/previews/*.png` は `git checkout iron-squad/docs/previews` で戻す）
  - ダダサバイバー: `node --test dada-survivor/tests/*.test.mjs`

### 認証まわりで触ってはいけないもの
- `credential.helper` を `wincred` 等に変更・上書きしない（このPCは `credential.helper=manager` で認証済み）。
- Windows 資格情報マネージャーや `cmdkey` 等からトークンを抽出・参照しない。
- remote URL にトークンを埋め込まない。

### push がハング / 認証エラーで止まったとき
実行サンドボックスが資格情報ストアに触れず `git push` が返らないことがある（system gitconfig の
`credential.helper = helper-selector` が GUI ダイアログで helper を選ばせる作りで、対話デスクトップが無いと
`CreateWindowExW` が返らず止まる）。**回避しようと認証設定をいじらない。** ローカルで `git commit` まで
完了させて停止し、ユーザーに依頼する:

> ローカルコミットまで完了しました。通常の PowerShell で以下を実行してください:
> `cd D:\スマホゲーム工房; git push origin main`

## 4. 引き継ぎドキュメント
- Iron Squad: `iron-squad/docs/CURRENT_WORK.md`（仕様は `iron-squad/docs/SPEC_AND_HANDOVER.md`）
- ダダサバイバー: `dada-survivor/README.md`
- kenshi-next: `kenshi-next/docs/CURRENT_WORK.md`（現状とこれから）／ 何をしたかは `kenshi-next/docs/WORK_REPORT.md`、仕様の下調べは `kenshi-next/research/`
- ABYSS DIVE: `abyss-dive/docs/CURRENT_WORK.md`（現在地と展望）／ 何をしたかは `abyss-dive/docs/WORK_REPORT.md`
- 作業終了時は自分のゲームの該当ドキュメントを更新する。

## 5. 新しいゲームを追加するとき（共有ファイルを触ってよい唯一の場面）
- `<id>/js/index.js` が `export default { init(container, onBackToHub), prepare?() }` を持ち、CSS は `prepare()` で `common/js/load-css.js` の `loadCss` により自分で読み込む。
- `<id>/sw-assets.js` を作る（`self.GAME_ASSETS['<id>'] = { version, files }`）。
- `sw.js` の `GAME_IDS` と、`common/js/games-registry.js` の `games` に追記し、`SHELL_VERSION` と `app.js` の `?v=` を上げる。

## 6. UI・表記
- 不要なセカンダリラベルや説明を避ける。レイアウトに説明させる。

## 7. 作業の締め（作業報告と現在地）
まとまった作業をしたら、終わったときに必ず2つ書く。小さな修正は後でまとめてでよい。
- `<ゲーム>/docs/WORK_REPORT.md` … **過去ログ（追記型）**。日付 / 版 / やったこと / なぜ / 検証結果 / 残したこと / つまずいた点を、新しい順に上へ足す。消さない。
- `<ゲーム>/docs/CURRENT_WORK.md` … **現在地**。いまの機能・バランス値・ファイル構成・壊れやすい箇所・次にやること（優先度つき）・動作確認手順を、常に最新に上書きする。
