# 📱 スマホゲーム工房 (Mobile Game Studio)

> **目的**: 自分のiPhoneで快適・爽快に遊ぶことだけを追求した、個人専用のゲーム制作工房。

---

## 🚀 遊び方（iPhoneでの起動手順）

### 1. サーバーの起動
- `common/tools/` 内の **`start.bat`** をダブルクリック  
  （またはターミナルで `python common/tools/serve.py` をルートから実行）

### 2. iPhoneで開く
- 画面に **QRコード** と **URL**（例: `http://192.168.0.21:8000`）が表示されます。
- **PCとiPhoneが同じWi-Fiに繋がっている状態** で、iPhoneの標準カメラをPC画面のQRコードにかざしてください。
- 画面上部に出る通知をタップすると、Safariでゲーム工房が開きます！

### 3. 【超おすすめ】ホーム画面に追加（全画面アプリ化）
Safariで開いた後：
1. 画面下の **共有ボタン（四角から上矢印が出ているアイコン）** をタップ
2. メニューを少しスクロールして **「ホーム画面に追加 ＋」** をタップ
3. 右上の **「追加」** をタップ

---

## 🎮 ゲーム一覧

| ゲーム | フォルダ | 説明 |
|---|---|---|
| 🛡️ IRON SQUAD（雑兵立身出世録） | [iron-squad/](iron-squad/) | ローグライク・小隊育成アクションRPG。[README](iron-squad/README.md) / [最新の作業メモ](iron-squad/docs/CURRENT_WORK.md) / [仕様書](iron-squad/docs/SPEC_AND_HANDOVER.md) |
| 🐱 ダダサバイバーもどき | [dada-survivor/](dada-survivor/) | 子ども向けオートアタック・サバイバル。5ステージ・そうび・キャラ9人（canvas不使用・DOM＋SVGトゥーン描画）。[README](dada-survivor/README.md) |

---

## 🧩 構成とキャッシュ（ゲーム別に独立して更新できる仕組み）

- ゲームは `ゲーム/js/index.js`（default export: `init` と任意の `prepare`）を持ち、`games-registry.js` から **起動時に動的 import** される。CSS はゲーム自身が `prepare()` で読み込む（`index.html` にゲームのCSSは書かない）。
- `ゲーム/sw-assets.js` が、そのゲームのキャッシュ対象ファイルとバージョンを持つ。ルートの `sw.js` はシェル一覧とゲームフォルダ名（`GAME_IDS`）だけを持ち、各ゲームの `sw-assets.js` を `importScripts` して `studio-shell-vN` / `game-<id>-vN` を別々のキャッシュにする。有効化時は同じ接頭辞の古いキャッシュだけを削除するので、片方のゲームを更新しても他方は消えない。
- 更新検知: `sw.js` は `updateViaCache:'none'` で登録され、`importScripts` された `sw-assets.js` もブラウザの更新チェック（バイト比較）対象。保険として、ハブ起動時に SW へ `refresh-games` を送り、SW が各 `sw-assets.js` を `no-store` で取得して、バージョンが変わったゲームのキャッシュだけ作り直す（iOS Safari対策）。
- モジュールのキャッシュバスター: 入口 `index.js` は `?v=` なしで import し、SW が再検証付きで取得する。ゲーム内部の import の `?v=` は各ゲームのフォルダ内で管理する。
- 作業ルールは [CLAUDE.md](CLAUDE.md) / [AGENTS.md](AGENTS.md) を参照。

---

## 📁 フォルダ構成

```text
index.html / sw.js / manifest.json   スタジオ本体（ルート必須）
CLAUDE.md / AGENTS.md                作業ルール（AIセッション向け）
README.md / .gitignore / .nojekyll   説明・Git設定・GitHub Pages設定
common/      共通データ（スタジオ全体で使う「必要な基本データ」）
  js/        共通モジュール（app, games-registry, storage, audio, kana-*）
  css/       共通スタイル（style.css, game-ui.css）
  assets/    共通アセット（audio/, icons/, QR）
  tools/     サーバー起動・アイコン/音源の生成（serve.py, start.bat, generate_*.py）
iron-squad/  ゲーム本体（sw-assets.js js/ css/ assets/ tests/ tools/ docs/ README.md）
dada-survivor/ こどもゲーム（sw-assets.js js/ css/ tests/ tools/ README.md）
<ゲーム名>/   新しいゲームもこの形でルート直下にフォルダを増やす
```

`index.html` / `sw.js` / `manifest.json` は、公開URLと Service Worker の管理範囲（スコープ）がファイルの置き場所で決まるため、ルートから動かせません。

## ➕ 新しいゲームを追加するには

1. ルート直下に `<ゲーム名>/` を作り、`js/index.js` でゲームオブジェクト（`init(container, onBackToHub)` と任意の `prepare()`）を **default export** する。CSS は `prepare()` で `common/js/load-css.js` の `loadCss` を使って自分で読み込む。
2. `common/js/games-registry.js` の `games` 配列へメタデータ（id/title/subtitle/icon/color/description/section と `load: () => import(...)`）を追加する。ハブの見出しは `section` で決まる。
3. `<ゲーム名>/sw-assets.js` を作る（`self.GAME_ASSETS['<id>'] = { version, files }`）。
4. `sw.js` の `GAME_IDS` に id を足し、`SHELL_VERSION` と `app.js` の `?v=` を上げる。
5. テストは `node --test <ゲーム名>/tests/*.test.mjs` をリポジトリのルートから実行する。
