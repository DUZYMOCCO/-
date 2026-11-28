# ABYSS DIVE 3D（Three.js）— Hermes 向け 3D アセット＆生態系 AI 規格書

最終更新: 2026-11-28（Three.js 完全 3D 移行・Antigravity × Hermes 分業規約）

---

## 1. 分業とファイル境界（Git 衝突ゼロ規則）

| 担当 | 主な担当領域 | 編集してよいファイル（境界） |
|---|---|---|
| **Antigravity** | 3D ワールド・カメラ・操縦・3 モード制御・ライティング・重力レンズ BH・Lumina SFX 3D 音響・UI 統合 | `js/dive-3d.js`, `js/tunnel-three.js`, `js/audio-3d.js`, `js/world-biomes.js`, `js/index.js`, `css/lab.css` |
| **Hermes** | **Blender による `.glb` 3D モデル制作**（自艇・深海生物・大型敵）＋ **生態系 AI 4 分類の純粋ロジック＆単体テスト** | `assets/models/*.glb`, `js/eco-*.js`, `tests/eco-*.test.mjs` |
| **Gemini** | プロット正本・無線会話・生態ログ台詞 | `docs/STORY.md` |

- **共通ルール**: `abyss-depth-lab/` だけ編集・ステージする（`git add -A` 禁止）。新ファイル追加時は `sw-assets.js` の `files` / `version` / `gameVersion` と `package.json` を揃える（`tests/assets.test.mjs` が検査）。
- **2D 向けの敵追加（礫鎧ガニ脚補完など）は一区切り**とし、今後は Three.js 3D 用 `.glb` と 3D 生態系 AI にリソースを集約する。

---

## 2. Three.js `.glb` モデル規格（Blender エクスポート規約）

Antigravity 側に `vendor/GLTFLoader.js`（Three.js r170・ローカル同梱）を用意済み。以下の規約で出力すればそのまま 1 行で読み込める。

### 座標系・向き・原点
- **座標系**: Three.js 標準右手系（Blender の glTF 2.0 Exporter で **`+Y Up` チェック ON**）。
- **正面の向き**: **`-Z` が前方（艦首・生物の頭）**、`+Y` が上、`+X` が右舷。
- **原点（Pivot）**: モデルの幾何中心（潜水艇なら船体中心、設置型生物なら接地底面中心）。
- **スケール**: `1 unit = 1 meter`（ゲーム内で等倍または `scale` 指定で配置）。

### ポリゴン・テクスチャ予算（iPhone 60fps 維持）
- **自艇（潜水艦）**: 3,000〜8,000 三角ポリゴン目安、PBR テクスチャ 1024×1024 以下（WebP 埋め込みまたは軽量 PNG）。
  - 質感方針（`STORY.md` §2.7）: **テカリを抑えたマットな実戦塗装**（`roughness: 0.65〜0.80`, `metalness: 0.20〜0.40`）。ネオン的な強い発光は避け、極細スリットのみ控えめに `emissive`。
- **通常生物（群生・中小型）**: 300〜1,500 三角ポリゴン（群生魚は `InstancedMesh` 用に 300 以下推奨）。
- **大型敵・ボス（巨蟹・リヴァイアサン等）**: 4,000〜12,000 三角ポリゴン、テクスチャ 1024×1024 以下。

### 3 モード変形対応・潜水艇パーツ命名規約（任意・対応すると自動連動！）
`assets/models/submersible_stage1.glb` 内に以下の名前（Object3D.name）のノードを含めると、`tunnel-three.js` / `dive-3d.js` の 3 モード物理変形＆スクリュー回転がそのまま自動連動する：
- `Propeller` — 回転する後部スクリュー（Z 軸回転）
- `WingL` / `WingR` — 機動モードで後方へ折り畳まれる左右可変翼
- `PowerPodL` / `PowerPodR` — パワーモードで外側前方へ展開する武装ポッド
- `CoilF` / `CoilB` — バリアモードで拡大・逆回転する超電導リングコイル
- `SlitEmissive` — モード色（青白／赤橙／エメラルド）へ滑らかに遷移する極細スリットメッシュ

---

## 3. 3D 生態系 AI モジュール規約（`js/eco-*.js`）

将来の Web Worker 分離を見据え、**DOM / Three.js 非依存の純粋ロジック**として書く：
- 入力: `{ dt, elapsed, playerPos: {x,y,z}, playerNoise, playerMode, entities }`
- 出力: 各個体の次フレーム座標・向き・状態（`idle | patrol | warn | chase | attack | flee`）・発光強度・イベント配列（`territorial_pulse`, `predator_bite` 等）。
- 4 分類（`STORY.md` §5）: ①無害・環境生物 / ②縄張り防衛型（UI 赤枠なし・発光脈動で威嚇）/ ③巡回・索敵捕食者（騒音・出力でステルス回避可）/ ④巨大回遊型。
- `tests/eco-*.test.mjs` で純粋単体テストを必ず添付する。

---

## 4. 最初の Hermes 推奨タスク案
1. **`assets/models/submersible_stage1.glb`**: 初期スカベンジャー潜水艇（全長 20m 規格・無骨なマット工業ボディ＋溶接跡、上記ノード名対応）→ 現在の仮プリミティブ自艇を即差し替え可能！
2. **深海巨大症の「修羅」大型敵 `.glb` 第 1 号**（例: 3D 版・深海巨蟹またはハンター捕食者）＋ `js/eco-rules.js`（純粋 3D 生態系 AI 状態機械）。
