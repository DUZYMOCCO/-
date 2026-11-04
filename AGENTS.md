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
  - kenshi-next: `node --test kenshi-next/tests/*.test.mjs`

## 4. 引き継ぎドキュメント
- Iron Squad: `iron-squad/docs/CURRENT_WORK.md`（仕様は `iron-squad/docs/SPEC_AND_HANDOVER.md`）
- ダダサバイバー: `dada-survivor/README.md`
- kenshi-next: `kenshi-next/docs/CURRENT_WORK.md`（現状とこれから）／ 何をしたかは `kenshi-next/docs/WORK_REPORT.md`、仕様の下調べは `kenshi-next/research/`
- 作業終了時は自分のゲームの該当ドキュメントを更新する。

## 5. 新しいゲームを追加するとき（共有ファイルを触ってよい唯一の場面）
- `<id>/js/index.js` が `export default { init(container, onBackToHub), prepare?() }` を持ち、CSS は `prepare()` で `common/js/load-css.js` の `loadCss` により自分で読み込む。
- `<id>/sw-assets.js` を作る（`self.GAME_ASSETS['<id>'] = { version, files }`）。
- `sw.js` の `GAME_IDS` と、`common/js/games-registry.js` の `games` に追記し、`SHELL_VERSION` と `app.js` の `?v=` を上げる。

## 6. UI・表記
- 不要なセカンダリラベルや説明を避ける。レイアウトに説明させる。
