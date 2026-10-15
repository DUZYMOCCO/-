# v6.11.21 までをコミット・プッシュする手順（Gemini向け）

## 状況
- コミット済み: v6.11.20（08feaa0）まで。
- 作業ツリー（`D:/スマホゲーム工房`）には、未コミットで次の2つが混ざっている:
  - v6.11.21 カジノ（完成・検証済み）
  - v6.11.22 街のにぎわい（**作りかけ**。Codex が利用制限で中断。`js/town-ambient.js`、`tests/town-ambient.test.mjs` など）
- 目的: **v6.11.21 だけ**をコミットしてプッシュする。v6.11.22 の作りかけは、作業ツリーにそのまま残す（消さない・コミットしない）。
- v6.11.21 の完全な状態: `iron-squad/docs/backups/20261015-before-town-crowd-v6.11.22.zip`（405ファイル。`sw-assets.js` が `v271` / `6.11.21`）。

## 守ること
- 本体の作業ツリー（`D:/スマホゲーム工房`）のファイルは、手順5の `git reset`（ファイルを変えない）以外で触らない。`git checkout` / `git stash` / `git reset --hard` / `git clean` は本体で使わない。
- `git add -A` / `git add .` は使わない。
- 途中で想定と違うこと（テスト失敗、ZIP の版が違う、など）が起きたら、そこで止めて報告する。

## 手順
1. 別フォルダに、今のコミット（v6.11.20）の作業ツリーを作る。
   ```
   cd D:/スマホゲーム工房
   git worktree add --detach "D:/is-push-v61121" HEAD
   ```
2. その別フォルダに、ZIP の中身を上書きで展開する。
   ```
   cd "D:/is-push-v61121"
   unzip -o "D:/スマホゲーム工房/iron-squad/docs/backups/20261015-before-town-crowd-v6.11.22.zip" -d .
   ```
   - 確認: `iron-squad/sw-assets.js` が `version: 'v271'`、`gameVersion: '6.11.21'`。
   - 確認: `iron-squad/js/town-ambient.js` が**ない**こと。
3. ZIP に入っていないカジノの資料を、本体からコピーする。
   - `iron-squad/docs/CASINO_PAGES_2026-10-15.md`
   - `iron-squad/docs/validation/casino-v6.11.21/`（フォルダごと）
4. 別フォルダでテストして、コミットする。
   ```
   cd "D:/is-push-v61121"
   node --test iron-squad/tests/*.test.mjs
   git checkout iron-squad/docs/previews
   git status --short
   git add iron-squad/
   git commit -m "feat(iron-squad): v6.11.21 - casino lobby with slot/poker/arena pages, unlimited plays, raised returns (cache v271)"
   git log -1 --format=%H
   ```
   - テストが全件 PASS しなければ、コミットせずに止めて報告する。
   - 最後に出たコミットのハッシュ（以下 `<HASH>`）を控える。
5. 本体の `main` を、そのコミットへ進める（**ファイルは変えない** `--mixed`）。
   ```
   cd D:/スマホゲーム工房
   git reset --mixed <HASH>
   git status --short
   ```
   - これで本体の作業ツリーは v6.11.22 の作りかけのまま、差分は「街のにぎわいの分だけ」になる。`sw-assets.js` が `v272` / `6.11.22` のままであることを確認する。
6. プッシュして、別フォルダを片づける。
   ```
   git push origin main
   git worktree remove "D:/is-push-v61121"
   ```

## 終わったら報告すること
- コミットのハッシュ、テストの結果（件数）、`git status --short` の要約（街のにぎわいの差分だけが残っていること）。
