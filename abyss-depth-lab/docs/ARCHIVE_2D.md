# ABYSS DIVE — 旧 2D 版アーカイブ（v3.x 資産保存）

最終更新: 2026-11-28（v5.0.0 で Phase 2 以降の完全 3D 版を本編へ昇格したことに伴うアーカイブ化）

---

## 位置づけ
- **v5.0.0 以降の本編**: Three.js による完全 3D 背後視点・深海探査（`js/dive-3d.js`）＋ 3D 回廊・ブラックホール突入（`js/tunnel-runner.js` / `js/tunnel-three.js`）。
- **旧 2D 版の扱い**: 過去の 2D 深海探査・船内インターミッション・WebGL2 多層 2D 描画（`js/game.js`, `js/depth-bridge.js`, `js/base.js`, `js/explore.js` 等）は **アーカイブとして保存・凍結** し、通常の本編起動時には一切ロードされない。

## アーカイブの起動方法
1. **本編メニューから起動（遅延ロード）**:
   - 本編 3D 画面の右上 `☰ メニュー` → `📦 旧 2D 版アーカイブ`（選択時のみ `js/archive-2d.js` を動的 `import`）。
   - 2D アーカイブ画面の `☰ 2Dアーカイブ` → `🌊 3D 本編へ戻る` でいつでも 3D 本編へ復帰できる。
2. **単体ページから直接起動**:
   - `abyss-depth-lab/archive-2d.html`

## 3D 本編へ引き継いだ共通資産（現役）
以下の純粋ロジック・セーブデータ・アセットは 2D 版と 3D 本編で共有されており、今後も現役で活用する：
- `js/world-biomes.js`（全層バイオームパレット・深度 m/km 変換）
- `js/radio-rules.js`（ノンストップ無線会話・理論乖離・父の痕跡スクリプト）
- `js/resources.js`（共通資源台帳 `game_studio_abyss_resources`）
- `js/tunnel-rules.js` / `js/tunnel-view.js`（連続 3D パイプ数式・回廊＆BH ビュー）
- `assets/*.webp`（法線・発光付き深海テクスチャ、立ち絵等）
