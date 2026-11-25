# ABYSS DIVE（`abyss-depth-lab/` 一本化版） — 現在地

最終更新: 2026-11-25 / 公開版 **v3.0.0**（`sw-assets.js` `v3`, ハブ `SHELL_VERSION v233`）

## 1. 一本化体制と担当分担

- **唯一の正規開発先**: `abyss-depth-lab/`（ハブ上のカードも `ABYSS DIVE` 1枚に一本化。旧 `abyss-dive/` フォルダは安全のため過去アーカイブとして残置、ハブ・SW からは `RETIRED_GAME_IDS` へ退役済み）。
- **ブランチ状態**: ローカル `main` と公開 `origin/main` の分岐を解消し、単一の一直線履歴へ統一済み（今後は全セッションが `origin/main` 最新の `abyss-depth-lab/` のみを編集する）。
- **セーブ互換**: 従来の `abyss-dive` 本番セーブキー（`game_studio_abyss_*`）をそのまま正規保存先として引き継ぎ。旧キーが空で `_depthlab` キーがある端末もフォールバック読み込みに対応。
- **担当分担**: Gemini＝物語・台詞、Hermes＝敵・ワールド美術、Antigravity＝Depth Stacking 描画基盤・空間ライティング・最適化。

## 2. 現在の機能（v3.0.0 全部入り）

- **描画アーキテクチャ**: 下層 WebGL2（10層＋5ライティンググループ 3×2 アトラス＋深度比較遮蔽シャドウ＋ノーマルマップ立体照光＋ブルーム＋多層浮遊粒子）＋中層 Canvas2D 操作層＋上層前景（4層：深海蔓・揺れる海藻・ボケ粒子）＝計 15 層（5〜30 層可変）。
- **本編 v2.2.0 全要素**: 潜航・戦闘・魚雷/ミサイル（着弾音3種）・弾数無制限の照明弾（WebGL2 空間光源へリアルタイム連動）・深い区間の光照射ディテール抜き・潜航ズーム（ピンチ/縮尺ボタン、WebGL2 視差と完全同期）・透過マップ・前哨基地・海溝・徒歩探索。
- **冒頭ストーリー＆立ち絵（v3.0.0 統合）**: 4カット世界観デモ＋Gem 立ち絵（`assets/gem_neutral.webp`）を含む新台本（`INTRO_VERSION = 4`、`js/intro-rules.js?v=6`, `js/intro.js?v=5`）。設定資料一式も `docs/STORY.md`, `docs/DEEP_FIELD_PLAN.md`, `docs/STORY_WORK_LOG.md`, `docs/story-reference/` へ移設済み。
- **インゲーム調整 UI（左上 `⚙ Depth`）**: Depth Stacking ON/OFF 即比較、レイヤー数（5〜30）、内部解像度（874×402 / 1748×804 / 2622×1206）、ライトバッファ解像度、前景濃さ、暗幕倍率、背景明度、遮蔽影、法線照光、ブルーム、粒子数。

## 3. 主要ファイル構成

- 入口・描画ブリッジ: `js/index.js`, `js/depth-bridge.js`, `js/depth-math.js`, `js/shaders.js`, `js/renderer-webgl2.js`, `css/lab.css`
- ゲーム本体・ルール: `js/game.js`（`v42`）, `js/intro-rules.js`（`v6`）, `js/intro.js`（`v5`）, `js/flare-rules.js`, `js/zoom-rules.js`, `js/dive-map.js`, `js/base.js`, `js/explore.js`, `js/trench.js` 他
- テスト: `tests/depth-math.test.mjs`, `tests/intro.test.mjs`（`node --test abyss-depth-lab/tests/*.test.mjs`）
- 設計・報告: `docs/PHASE0_ARCHITECTURE.md`, `docs/PHASE1_REPORT.md`, `docs/CURRENT_WORK.md`, `docs/WORK_REPORT.md`

## 4. 壊れやすい箇所・注意点

- `game.js` の `ctx` は `alpha: true`（透過）前提。不透明黒で塗る分岐は `suspendDepth`（導入・基地・徒歩探索）または `!depthActive` 時のみ。
- ワイド端末（iPhone 横持ち等）での 16:9 境界段差を防ぐため、`drawLighting` の左右端フェードと `vignette` の二重描画抑止を `game.js` 側に入れている。
- 新アセット追加時は `sw-assets.js` の `files` と `version` / `gameVersion` を必ず同時に更新する。

## 5. 次にやること（優先度順）

1. **実機 Safari プレイテスト（iPhone 17）**: 継続潜航・戦闘での FPS、発熱、敵/弾/予告の視認性、前景濃さ・暗幕倍率の最適値を見極める。
2. **熱水洞窟の一区間＆ヤドカリB の段階移植（Hermes 連携）**: 照明弾・前景遮蔽・ズーム・攻撃予告の見やすさを Depth Stacking ON/OFF の同一航路で比較検証。
3. **Phase 2 深化・最適化**: 魚群・同種スプライトのインスタンシング化（Draw Calls 圧縮）、世界観別ライティングプリセット（熱水/マントル/ブラックホール等）、巨大生物通過時のゴッドレイ遮蔽影強化。
4. **旧 `abyss-dive/` フォルダの最終整理**: v3.0.0 の実機安定を確認後、ユーザー承認のもとで旧アーカイブフォルダ削除を判断。
