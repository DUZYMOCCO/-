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
| 🐱 ダダサバイバーもどき | [dada-survivor/](dada-survivor/) | 子ども向けオートアタック・サバイバル（canvas不使用・DOM＋SVGトゥーン描画）。[README](dada-survivor/README.md) |

---

## 📁 フォルダ構成

```text
index.html / sw.js / manifest.json   スタジオ本体（ルート必須）
README.md / .gitignore / .nojekyll   説明・Git設定・GitHub Pages設定
common/      共通データ（スタジオ全体で使う「必要な基本データ」）
  js/        共通モジュール（app, games-registry, storage, audio, kana-*）
  css/       共通スタイル（style.css, game-ui.css）
  assets/    共通アセット（audio/, icons/, QR）
  tools/     サーバー起動・アイコン/音源の生成（serve.py, start.bat, generate_*.py）
iron-squad/  ゲーム本体（js/ css/ assets/ tests/ tools/ docs/ README.md）
dada-survivor/ こどもゲーム（js/ css/ tests/ README.md）
<ゲーム名>/   新しいゲームもこの形でルート直下にフォルダを増やす
```

`index.html` / `sw.js` / `manifest.json` は、公開URLと Service Worker の管理範囲（スコープ）がファイルの置き場所で決まるため、ルートから動かせません。

## ➕ 新しいゲームを追加するには

1. ルート直下に `<ゲーム名>/` を作り、`js/index.js` でゲームオブジェクト（`id`, `title`, `init` など）を export する。
2. `common/js/games-registry.js` に import して `games` 配列へ追加する。ハブの見出しはゲームの `section`（`sections` の id、未指定は `main`）で決まる。
3. ゲーム専用CSSがあれば `index.html` に `<link>` を追加する。
4. `sw.js` の `ASSETS_TO_CACHE` に新ファイルを加え、`CACHE_NAME` と `?v=` を上げる。
5. テストは `node --test <ゲーム名>/tests/*.test.mjs` をリポジトリのルートから実行する。
