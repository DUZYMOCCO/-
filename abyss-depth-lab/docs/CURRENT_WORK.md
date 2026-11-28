# ABYSS DIVE（`abyss-depth-lab/` 一本化版） — 現在地

最終更新: 2026-11-28 / 版 **v4.4.0**（`sw-assets.js` `v51`, `package.json` `4.4.0`, `js/index.js` `game.js?v=84`, `dive-3d.js?v=5`, `audio-3d.js?v=1`）

**方針転換（2026-11-27〜28 確定）**: **Three.js による「完全 3D 背後視点」の深海オープンワールド**へ段階移行中（最新正本: `docs/STORY.md`）。
- **Phase 1（完了・v4.0.0〜v4.0.1）**: `vendor/three.module.min.js`（r170 / MIT・完全無料・ローカル同梱）を導入し、大深度海流回廊・3,960 マイル BH 突入を Three.js 本格 3D 化（3D 潜水艇・PBR 岩盤洞窟・リアルタイム重力レンズ BH 統合・没入感優先で加速サークル撤去）。
- **Phase 2（基盤実装・v4.1.0〜v4.3.0）**: 2D 版の縦深海世界（表層サンゴ礁 → 深海棚・遺跡 → 熱水・火山帯 → マントル上層の楽園 → 最深部 BH ポータル）を再現する完全 3D 背後視点エンジン `js/dive-3d.js` に、**Lumina SFX v1.5 の 3D 空間音響（`js/audio-3d.js`）**・**潜水艇 3 モード物理変形（機動／パワー／バリア）**・**生態系 AI 4 分類**・**`InstancedMesh` 180 匹群生魚＆厳格 `dispose()`** を実装済み。
- **導入済み開発スキル（完全無料・ローカル完結）**: `lumina-sfx` (v1.5.0) / `optimize-threejs-games` / `three-best-practices` / `threejs-skills`（課金 API 一切不使用、ローカル GPU `RTX 2070 SUPER 8GB` + ComfyUI + CUDA `Depth Anything V2 Small`）。

---

## 0. いま何が動いているか（v4.3.0）

### 1) Phase 2: 完全 3D 背後視点・深海探査（`js/dive-3d.js` / `js/audio-3d.js` / `dive3d-lab.html`）
- **起動方法**: 本編 `☰ メニュー` → `🌊 3D 深海探査 [Phase 2]`、または `abyss-depth-lab/dive3d-lab.html`（`?wy=160|2300|5200|7900` で深度指定可）。
- **3D 操縦（v4.2.1 確定）**: ニュートラルで完全静止ホバリング（自動前進なし）。左仮想スティック（または WASD/矢印）で 360° 旋回・**非リバース上昇/下降**。右アクション群に長押し式 **`▲ 前進`**・**`⚡ 加速`**・**`🔥 魚雷`**・**`💡 照明弾`**（本物の 3D `PointLight`）。
- **潜水艇 3 モード物理変形（v4.3.0・`STORY.md` §2.7）**: 下部バー（`⚡ 機動` / `🔥 パワー` / `🛡 バリア`、PC は `1/2/3`）で操作を止めずに 2.5 秒物理変形（絶景を邪魔しない控えめな極細スリット発光）。
  - 機動: 翼後方折り畳み・速度＆旋回 +35%
  - パワー: 側面装甲ポッド＆エミッター展開・2 連装高威力魚雷
  - バリア: 超電導リングコイル全周展開＆逆回転・半透明シールド＆静粛ステルス
- **生態系 AI 4 分類（v4.3.0・`STORY.md` §5）**: ①無害群生魚（**`THREE.InstancedMesh` 1 ドローコールで 180 匹**・自艇接近で散開）、②縄張り防衛型クラゲ（UI 赤枠なしで発光脈動威嚇・マントル楽園では穏やか）、③巡回・索敵捕食者（騒音・出力依存索敵で静止/バリアによるステルス回避可能）、④巨大回遊マンタ。
- **Lumina SFX v1.5 × Three.js 3D 空間音響（v4.2.0・`js/audio-3d.js`）**: `THREE.AudioListener` + `THREE.PositionalAudio` で深海気泡ループ・深度連動低音ドローン・ソナーピング・魚雷発射／3D 着弾爆発・照明弾点火・BH ポータル立体低音を再生（iOS 自動アンロック＋右上 `🔊/🔇`）。
- **実測（ローカル Chrome 1280×720）**: **96fps / 67 ドローコール**、ループ内 GC ゼロ、終了時 `dispose()` 徹底。

### 2) Phase 1: Three.js 3D 回廊＆重力レンズ・ブラックホール（`js/tunnel-three.js` / `js/tunnel-view.js` / `tunnel-lab.html`）
- **起動方法**: 本編 `☰ メニュー` → `🧪 回廊・BH 即時テスト`（`▼ 下降` / `▲ 上昇` / `◉ BH`）、または `abyss-depth-lab/tunnel-lab.html`（`?theme=blackhole&p=0.38&pause=1` 対応）。
- **構成**:
  - `createSubmarineRig()`: 耐圧チタン船体（v4.1.0 でテカリを抑えたマット塗装 `metalness: 0.24, roughness: 0.72` に調整）・真鍮リブ・後退翼・左右ナビゲーション灯・回転真鍮スクリュー＋シアン噴流・3D バリアドーム・本物の PBR `SpotLight` ヘッドライト。Phase 2 と共有。
  - 連続 3D 洞窟チューブメッシュ: `tunnel-rules.js` の `samplePipeAt()` と完全同一数式、360° 継ぎ目法線平均化済み。ComfyUI 生成玄武岩（`tunnel_canyon_wall.webp`）＋ Depth Anything V2 法線マップ（`_n.webp`）＋発光マップ（`_e.webp`）を適用。
  - リアルタイム重力レンズ・ブラックホール背景（`ShaderMaterial`）: 洞窟のカルデラ出口を抜けると降着円盤の黄金＆蒼の逆光が 3D 潜水艇を照らす。
  - v4.0.1 で没入感優先のため 3D 加速サークル表示を撤去。左下バッジは `THREE-3D v4.1.0`。
- **フォールバック**: Three.js 初期化不可時は `js/tunnel-gl.js`（WebGL2 レイマーチング）→ Canvas2D へ自動フォールバック。

### 3) 既存 2D 本編（保持・不変）
- 船内インターミッション・マップ・装備強化・無線会話（`js/radio-rules.js?v=2`: ponco MarkII の理論乖離・父のスティングレー号／Mark I 痕跡）・マントル上層（修羅 vs 楽園）・既存敵ロスター（魚3種／戦車ヤドカリ／B亜種ヤドカリ／イカ砲手／クラゲ／煤冠イソギンチャク／地層背負いの巨蟹／リヴァイアサン）・セーブ互換（`game_studio_abyss_*`）はそのまま維持。
- 2D 自艇は左右向き反転（`p.facing`）に完全同期済み（v3.13.3）。Depth Stacking の層ポップイン・マンタ複製も解消済み（v3.15.1）。

---

## 1. 体制・開発ルール

- **正規開発先**: `abyss-depth-lab/` のみ編集・ステージする（`git add -A` 禁止・共有ファイル不干渉）。
- **Antigravity × Hermes × Gemini の 3D 分業規約（衝突ゼロ境界）**: [`docs/HERMES_3D_SPEC.md`](HERMES_3D_SPEC.md) に確定済み。
  - **Antigravity**: 3D ワールド・カメラ・操縦・3 モード制御・音響・UI 統合（`js/dive-3d.js`, `js/tunnel-three.js`, `js/audio-3d.js`, `js/index.js`, `css/lab.css`）。
  - **Hermes**: Blender `.glb` 3D モデル制作（自艇・深海生物・大型敵）＋ 3D 生態系 AI 純粋ロジック＆単体テスト（`assets/models/*.glb`, `js/eco-*.js`, `tests/eco-*.test.mjs`）。受け皿として `vendor/GLTFLoader.js` をローカル同梱済み。
  - **Gemini**: プロット正本・無線会話台詞（`docs/STORY.md`）。
- **物語・世界観の正本**: [`docs/STORY.md`](STORY.md)（『海底4万マイル』改訂正本・ネタバレ厳禁ルール遵守）。
- **アート基準・ローカル生成**: [`docs/ART_STYLE_GUIDE.md`](ART_STYLE_GUIDE.md), [`docs/IMAGE_BLASTER_PIPELINE_STUDY.md`](IMAGE_BLASTER_PIPELINE_STUDY.md), `tools/world_blaster.py`（ComfyUI `127.0.0.1:8188` + ローカル CUDA `Depth-Anything-V2-Small-hf`）。
- **セーブ互換**: `game_studio_abyss_*` を維持。

---

## 2. 主要ファイル構成（v4.3.0）

| ファイル | 役割 |
|---|---|
| `vendor/three.module.min.js` | Three.js r170（MIT・ローカル同梱・PWA オフライン対応） |
| `js/dive-3d.js` | **Phase 2**: 完全 3D 背後視点・深海探査（3モード・生態系 AI 4分類・InstancedMesh 群生魚） |
| `js/audio-3d.js` | Lumina SFX v1.5 生成 WAV 6種 × Three.js `AudioListener` / `PositionalAudio` 空間音響 |
| `assets/sfx/abyss-*.wav` | Lumina SFX ローカル生成深海 SFX 6種（underwater / drone / sonar / torpedoFire / torpedoHit / flare） |
| `js/tunnel-three.js` | **Phase 1**: 3モード物理変形 3D 潜水艇リグ（共有）・PBR 洞窟・重力レンズ BH 背景 |
| `js/tunnel-gl.js` | WebGL2 3D レイマーチング＆重力レンズ BH（フォールバック／単体互換） |
| `js/tunnel-rules.js` | 連続 3D パイプ数式 `samplePipeAt()`・壁擦り物理・テーマ定義（純粋ロジック） |
| `js/tunnel-view.js` | Three.js / WebGL2 / 2D の統合ビュー＆爆速マイル深度計 HUD |
| `js/world-biomes.js` | 全層バイオームパレット・濁度・深度 m/km 変換・ネタバレ禁止チェック（純粋） |
| `js/radio-rules.js` | ノンストップ無線会話状態機械（理論乖離・父の痕跡対応） |
| `js/index.js` / `css/lab.css` | 統合 `☰ メニュー`（Phase 2 起動・回廊/BH 即時テスト含む） |
| `dive3d-lab.html` / `tunnel-lab.html` | 3D 探査・回廊/BH の単体デバッグ＆スクリーンショット検証ラボ |
| `sw-assets.js` | `version: 'v50'`, `gameVersion: '4.3.0'`（全 177 ファイル登録） |

---

## 3. 壊れやすい箇所・実装上の注意

- **ハブ版表示と実行中モジュールのキャッシュズレ**: ハブのカードは `sw-assets.js` を毎回読むため即更新されるが、ページ再読込なしに再起動すると旧 ES モジュールがメモリに残る。実機確認時は必ず **左下バッジ（`THREE-3D v4.1.0` / `THREE-3D DIVE v4.1.0`）** で反映有無を確認する。
- **`world-biomes.js` の引数順**: `sampleBiomeAt(x, y, layout)` / `zoneNameAt(x, y, layout)` は **`x` が第 1 引数、`y` が第 2 引数**。逆にして `worldY` を第 1 引数に渡すと常に表層扱いになる。
- **アセット・JS 更新時の版上げ**: `sw-assets.js` の `version` / `gameVersion` / `files`、`package.json`、および関連 `?v=` クエリを必ず同時に更新する（`tests/assets.test.mjs` で検査）。
- **既存テストの既知フレーク**: `tests/hermit-b-ingame.test.mjs` は並列実行時にフレークする場合がある（単体実行では通過）。

---

## 4. 次にやること（優先度順）

1. **Phase 2（`dive-3d.js`）実機フィードバック反映と 2D 世界の本格再現**:
   - 潜水艇の 3D 造形ブラッシュアップ（船体ディテール・質感・プロペラ・艦橋の作り込み）。
   - 2D 本編の体験を 3D 空間へ本格移植：横分岐ルート（狭洞窟ルート vs 熱水・火山帯ルート）、父の痕跡（スティングレー号・Mark I 溶接跡）＋ノンストップ無線会話（`radio-rules.js`）連動、HP・被弾・バリア、船内インターミッション（強化・換装）との接続。
   - 3D 地形の立体感強化（岩柱・天然アーチ・横穴・立体サンゴ礁・3D 敵モデル／ボス遭遇）。
2. **Phase 2 の本編デフォルト化判断**: 3D 深海探査の操作感・FPS・ゲームループが実機で十分気持ちよくなったら、2D 本編から Three.js 3D 本編への主役切替を検討する。
3. **（並行・Hermes/Gemini 資産）**: 既存の敵ロジック・ストーリー台詞・装備データを 3D 側へ流用・統合。

---

## 5. 動作確認・テスト手順

```powershell
# 主要テスト（コミット前必須）
node --test abyss-depth-lab/tests/tunnel-dive.test.mjs abyss-depth-lab/tests/radio-and-corridor.test.mjs abyss-depth-lab/tests/world-biomes.test.mjs

# 全テスト
node --test abyss-depth-lab/tests/*.test.mjs
```

- **ローカル実描画確認（ヘッドレス Chrome）**: ルートを静的配信し、`dive3d-lab.html?wy=160|2300|5200|7900` および `tunnel-lab.html?theme=blackhole&p=0.38&pause=1` を `--headless=new --enable-webgl --ignore-gpu-blocklist --screenshot` で撮影して目視確認する。
- **iPhone 実機確認**: ハブで「最新版に更新」→ `☰ メニュー` → `🌊 3D 深海探査` / `🧪 回廊・BH 即時テスト` を起動し、左下バッジが `v4.1.0` であることを確認する。
