# ABYSS DIVE（`abyss-depth-lab/` 3D 本編） — 現在地

最終更新: 2026-11-28 / 版 **v5.1.0**（`sw-assets.js` `v61`, `package.json` `5.1.0`, `js/index.js`, `dive-3d.js?v=14`, `cabin-intermission.js?v=1`, `tunnel-runner.js?v=1`, `tunnel-view.js?v=24`, `tunnel-three.js?v=6`, `archive-2d.js?v=1`）

- **アニメ調・船内インターミッション画面（v5.1.0）**: 3D 本編の `🔧 船内` を、アニメ調船内背景（`cabin-workshop.webp`）＋ 3 人の 4 コマ動きアニメ（エリー・Gem・ponco MarkII）＋ 強化・溶接リアクション掛け合いを備えたフルスクリーン・インターミッション（`js/cabin-intermission.js`）へ刷新。

- **メジャー昇格（v5.0.0）**: **Phase 2（完全 3D 背後視点・深海探査 `dive-3d.js`）＋ Phase 1（3D 回廊＆重力レンズ BH `tunnel-runner.js` / `tunnel-three.js`）を正規の本編（デフォルト起動）へ昇格**。
- **3D 深海探査 ⇔ 回廊・ブラックホールの完全シームレス接続**: 2D `game.js` 非依存の独立ランナー `js/tunnel-runner.js` を新設し、3D 空間内の 3 つの物理ポータル（熱水帯下部の **▼ 下降海流回廊**、マントル楽園の **▲ 上昇海流リフト**、最深部 3,960 マイルの **◉ BH 境界ポータル**）からそのまま突入 → 完走時の資源ボーナス加算＆3D 探査への自動着水／BH 通過クリア演出まで一本化。
- **旧 2D 版のアーカイブ化**: 旧 2D 版（`game.js` + `depth-bridge.js`）を `js/archive-2d.js`＆`archive-2d.html` へ隔離（詳細: [`docs/ARCHIVE_2D.md`](ARCHIVE_2D.md)）。本編通常起動時は一切ロードせず、メニューの `📦 旧 2D 版アーカイブ` から必要なときだけ動的 `import` できる。
- **採用モデル＆3 モード物理変形（v4.6.0〜継続）**: Hermes 制作の赤錆・露出鉄・緑青仕上げ初期スカベンジャー艇（`assets/models/submersible_stage1.glb`, 全長 20.066 m・7,784 三角・8 可動ノード）が 3D 深海探査＆回廊・BH の両方で稼働中（`Propeller` / `WingL/R` / `PowerPodL/R` / `CoilF/B` / `SlitEmissive` 実時間連動）。
- **開発方針（完全無料・ローカル完結）**: Three.js r170（MIT・ローカル同梱）、Lumina SFX v1.5、ローカル GPU（ComfyUI + CUDA Depth Anything V2 Small）。課金 API 一切不使用。

---

## 0. 本編の構成（v5.0.0）

### 1) 完全 3D 背後視点・深海探査（`js/dive-3d.js` / `js/audio-3d.js`）
- **起動**: ハブから `ABYSS DIVE` を開くと即座に 3D 本編として起動（単体ラボは `dive3d-lab.html?wy=160|2300|5200|7900`）。
- **3D 操縦**: ニュートラル完全静止ホバリング、船首ピッチ角ホールド（真下 `-89°` 直下潜航対応）＋`⌖ 水平` ボタン、スプリングアーム・カメラ衝突引き寄せ、長押し式 `▲ 前進` / `▼ 後退`（撃ちながら後退＋背後障害物の自動回り込み）、`⚡ 加速`、`🔥 魚雷`、`💡 照明弾`（本物の 3D `PointLight`）。
- **潜水艇 3 モード物理変形（`STORY.md` §2.7）**: 下部バー（`⚡ 機動` / `🔥 パワー` / `🛡 バリア`、PC は `1/2/3`）で操作を止めずに 2.5 秒物理変形。
- **3D 空間内の 3 つの回廊・BH ポータル**:
  - 熱水帯下部（`y = -182`）: `▼ 下降海流回廊` → 完走でマントル楽園（`wy = 7900`）へ着水
  - マントル楽園西端（`y = -212`）: `▲ 上昇海流リフト` → 完走で表層基地（`wy = 160`）へ帰還
  - 最深部（`y = -254`）: `◉ 3,960 マイル BH 境界ポータル` → 完走でブラックホール通過クリア演出＆資源ボーナス
- **生態系 AI 4 分類＆ダメージ規約**: ①`InstancedMesh` 180 匹群生魚、②縄張り防衛型クラゲ（発光脈動威嚇・マントル楽園は穏やか）、③立体 3D 巡回・索敵捕食者（騒音依存索敵・ステルス回避可）、④巨大回遊マンタ。**通常探索中の接触・環境スリップダメージは無し**（予告付き敵攻撃・トラップ・崩落のみ）。
- **船内強化ドック・無線・音響**: `🔧 船内`（共通資源台帳 `game_studio_abyss_resources`＋`abyss_3d_upgrades_v1`）、ノンストップ無線会話＆父の痕跡（`radio-rules.js`）、Lumina SFX v1.5 × Three.js 3D 空間音響（`audio-3d.js`）。

### 2) 3D 回廊＆重力レンズ・ブラックホール（`js/tunnel-runner.js` / `js/tunnel-three.js` / `js/tunnel-view.js`）
- 2D `game.js` から完全独立。3D 深海探査の物理ポータルまたは右上 `☰ メニュー` からいつでも出撃でき、完走するとボーナス資源を共通台帳へ加算して 3D 深海探査へシームレス復帰する。
- 単体ラボは `tunnel-lab.html?theme=blackhole&p=0.38&pause=1`。

### 3) 旧 2D 版アーカイブ（`js/archive-2d.js` / `archive-2d.html`）
- 本編 `☰ メニュー` → `📦 旧 2D 版アーカイブ` から遅延ロードで起動可能（詳細は `docs/ARCHIVE_2D.md`）。

---

## 1. 体制・開発ルール

- **正規開発先**: `abyss-depth-lab/` のみ編集・ステージする（`git add -A` 禁止・共有ファイル不干渉）。
- **Antigravity × Hermes × Gemini の 3D 分業規約（衝突ゼロ境界）**: [`docs/HERMES_3D_SPEC.md`](HERMES_3D_SPEC.md)。
  - **Antigravity**: 3D ワールド・カメラ・操縦・3 モード制御・回廊ランナー・音響・UI 統合（`js/dive-3d.js`, `js/tunnel-runner.js`, `js/tunnel-three.js`, `js/audio-3d.js`, `js/index.js`, `css/lab.css`）。
  - **Hermes**: Blender `.glb` 3D モデル制作（自艇・深海生物・大型敵）＋ 3D 生態系 AI 純粋ロジック＆単体テスト（`assets/models/*.glb`, `js/eco-*.js`, `tests/eco-*.test.mjs`）。
  - **Gemini**: プロット正本・無線会話台詞（`docs/STORY.md`）。

---

## 2. 主要ファイル構成（v5.0.0）

| ファイル | 役割 |
|---|---|
| `js/index.js` | **v5.0.0 本編エントリー**: 3D 深海探査をデフォルト起動、回廊ランナー統合、旧 2D は遅延ロード |
| `js/dive-3d.js` | **3D 深海探査本編**: 3 モード変形・3 ポータル物理接続・生態系 AI・船内ドック・無線 |
| `js/tunnel-runner.js` | **3D 回廊＆BH 独立ランナー**: 2D 非依存の回廊・BH 実行＆完走帰還・クリア演出 |
| `js/tunnel-three.js` / `js/tunnel-view.js` | Three.js 3D 自艇リグ（Hermes `.glb` 統合）・PBR 洞窟・重力レンズ BH |
| `js/audio-3d.js` | Lumina SFX v1.5 WAV 6 種 × Three.js 3D 空間音響 |
| `assets/models/submersible_stage1.glb` | Hermes 制作・赤錆仕上げ初期スカベンジャー艇（20m 規格・8 可動ノード） |
| `js/world-biomes.js` / `js/radio-rules.js` / `js/resources.js` | バイオーム・ノンストップ無線・共通資源台帳（純粋ロジック） |
| `js/archive-2d.js` / `archive-2d.html` | 旧 2D 版アーカイブ（遅延ロード専用） |
| `sw-assets.js` | `version: 'v60'`, `gameVersion: '5.0.0'` |

---

## 3. 壊れやすい箇所・実装上の注意

- **キャッシュ更新確認**: 実機では左下バッジが `THREE-3D v5.0.0` になっていることで最新版反映を確認する。
- **`world-biomes.js` の引数順**: `sampleBiomeAt(x, y, layout)` / `zoneNameAt(x, y, layout)` は **`x` が第 1 引数、`y` が第 2 引数**。
- **アセット・JS 更新時の版上げ**: `sw-assets.js` の `version` / `gameVersion` / `files`、`package.json`、および `?v=` クエリを必ず同時に更新する（`tests/assets.test.mjs` で検査）。

---

## 4. 次にやること（優先度順）

1. **回廊・BH ＆ 3D 探査の演出・ゲーム体験ブラッシュアップ**:
   - 回廊内の音響連携（Lumina SFX 空間音・ブースト音・BH 突入ドローン）や 3 モード（バリア展開時の見た目・性能）のさらなる統一。
   - 3D 地形の立体感・景観強化（岩柱・天然アーチ・横穴・立体サンゴ礁・発光植物群）。
2. **Hermes 制作 3D 生物・大型敵 `.glb` ＆ `js/eco-*.js` の本編統合**:
   - 深海巨大症の「修羅」大型敵モデルや生態系 AI モジュールが届き次第、`dive-3d.js` へ統合。
3. **木星内部海（4,000〜40,000 マイル）プロトタイプ設計**:
   - BH 通過後の次章ステージ（超巨大縦穴・大対流層・フローティングオリジン）。

---

## 5. 動作確認・テスト手順

```powershell
# 主要テスト（コミット前必須）
node --test abyss-depth-lab/tests/assets.test.mjs abyss-depth-lab/tests/tunnel-dive.test.mjs abyss-depth-lab/tests/radio-and-corridor.test.mjs abyss-depth-lab/tests/world-biomes.test.mjs

# 全テスト
node --test abyss-depth-lab/tests/*.test.mjs
```
