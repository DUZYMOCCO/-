# `neilsonnn/image-blaster` 調査＆ `abyss-depth-lab` 移植設計メモ

作成日: 2026-11-27  
対象リポジトリ: `https://github.com/neilsonnn/image-blaster`（MIT License / World Labs デザインチーム Neilson Koerner-Safrata 氏）

---

## 1. 技術の正体とコア構造

`image-blaster` は単体の新 AI モデルではなく、**Claude Code 上で動く「1枚画像 → 探索可能な 3D ワールド＆アセットパック」オーケストレーション Skill 群** である。

### 処理パイプライン
1. **技術的シーン調査（Literal Description Rules / `IMAGE-BLAST.md`）**
   - 「神秘的」「寂しい」といった主観・物語的表現を禁止し、見えている物体・材質・配置を事実ベースで構造化。
   - 壁・床・空などの広い環境面は除外し、**独立した剛体オブジェクトのみを識別・重複排除（`count_estimate`）**。
2. **プレート清掃＆参照切り出し（`nano-banana` / `gpt-image-2`）**
   - 対象オブジェクトを消した背景用クリーンプレートと、各オブジェクト単体の参照画像を生成。
3. **3D 空間生成（World Labs `marble-1.1`）**
   - クリーンプレートから探索可能な 3D Gaussian Splatting（`.spz`）を生成。
4. **個別メッシュ生成（Tencent `hunyuan-3d` via FAL）**
   - 各オブジェクト参照から PBR マテリアル付き `.glb` / `.obj` を生成。
   - 主要フラグ：`--face-count 50000`（生 API デフォルト 500,000 から軽量化）、`--enable-pbr true`、`--generate-type Normal|LowPoly|Geometry`。
5. **環境音・物理効果音生成（`elevenlabs-sfx` via FAL）**
   - シーンのループ環境音とオブジェクトごとの衝突・環境 SE（`.mp3`）を生成。
6. **統合（Three.js ビューワー / エンジン向け `worlds/<slug>/` パック）**

---

## 2. 方針決定：完全ローカル無料（外部従量課金 API を使わない持続可能パイプライン）

外部従量課金 API（World Labs / FAL / ElevenLabs 等）へ依存すると、反復検証・量産の持続可能性が失われるため、**有料 API が担う工程もすべてローカル GPU（RTX 2070 SUPER 8GB + ComfyUI + オープンウェイト／自前実装）で完全無料代替する** 方針とする。

| 工程 | `image-blaster` 原案（有料 API） | 当スタジオの完全無料ローカル代替 | 実装・稼働状況 |
| :--- | :--- | :--- | :--- |
| **1. シーン調査＆分解設計** | Claude Code (`IMAGE-BLAST.md`) | エージェントが `Literal Description Rules` で JSON 化 | 稼働中（無料） |
| **2. 2D コンセプトアート** | `nano-banana` / `gpt-image-2` | ローカル ComfyUI (`tools/comfy_gen.py --model juggernaut`) | 稼働中（無料） |
| **3. 深度マップ＆法線（`_n.webp`）＋Z 帯スライス** | —（3D 空間から抽出） | `tools/world_blaster.py slice` ＋ ローカル `Depth Anything V2`（VRAM ~2GB） | CLI 実装済・Depth Anything V2 連携予定（無料） |
| **4. 3D 空間／回廊の没入表現** | World Labs Marble 1.1（有料） | ローカル ComfyUI 生成のシームレス岩壁・発光洞窟テクスチャを 3D チューブへ UV 投影＋深度マップ視差 | 実装可能（無料・iPhone 60fps 維持） |
| **5. 単体オブジェクト 3D 化（`.glb`）** | FAL Hunyuan 3D（有料） | ローカルオープンウェイト（`TripoSR` / `Hunyuan3D-2mini` 量子化、8GB VRAM 対応）または ComfyUI 多角度生成 | 導入可能（無料） |
| **6. 環境音・効果音** | FAL ElevenLabs（有料） | ローカルオープンモデル（Stable Audio Open 等）＋ Python / WebAudio オフライン合成 | 実装可能（無料） |

---

## 3. 現状ローカル環境の確認（2026-11-27 時点）

- **ComfyUI**: `D:\AI\ComfyUI`（v0.28.0 / RTX 2070 SUPER 8GB VRAM）
- **導入済みモデル**: `Juggernaut-XL v9`（SDXL）, `SDXL base 1.0`, `DreamShaper 8`, `RealisticVision v6`, `control_v11f1p_sd15_depth`
- **カスタムノード**: 未導入（素の状態）。`models/geometry_estimation`・`models/background_removal` ディレクトリは標準で存在。

---

## 4. 実装・移植ロードマップ（すぐ動ける順）

### Phase 1（完全無料・最優先）：ローカル「1枚アート → 多層 2D＋法線マップ」パイプライン
- `image-blaster` の「Literal Description Rules（事実ベース分解）」思想を取り入れ、ローカル完結のスクリプト（例：`abyss-depth-lab/tools/slice_layers.py`）を構築：
  1. 1 枚の深海アート（`comfy_gen.py --model juggernaut` 等）を入力
  2. ローカル深度推定（Depth Anything V2 等）で **深度マップ（0..1）** を生成
  3. 深度マップの勾配から WebGL2 `depth-bridge.js` 規格の **タンジェント法線マップ（`_n.webp`）** を自動生成
  4. 深度帯（遠景・中景・近景）ごとにマスク分割して透過 PNG/WebP レイヤーへ書き出し
- **効果**: 背景レイヤーの繋ぎ目・ライティングの一体感が一気に上がり、手作業の法線作成コストが激減。

### Phase 2（ピンポイント API 活用）：回廊コースター＆潜水艇リアビューの圧倒的クオリティ化
- **潜水艇（`submersible_09`）の 3D 化 → 2D 焼き出し**:
  - 現行の側面アートから Hunyuan 3D で 1 回だけ `.glb` 化 → 背後視点（`tunnel-view.js` 用）の **真後ろ・左ロール・右ロール・上下チルト** の高精細リアスプライトを焼き出し。
- **海溝回廊・ブラックホールの空間素材化**:
  - Marble 1.1 で海底大洞窟空間を 1 シーン生成し、カメラ前進しながら左右岩壁・天井・海底の奥行き素材を 2D 焼き出しして `tunnel-view.js` へ組み込む（スマホ 60fps を維持しつつ映画的な没入感を実現）。

### Phase 3（エージェント間横展開）
- `abyss-depth-lab/tools/` 配下の CLI＋手順書として整備し、HERMES（敵キャラの多角度・法線生成）や Neon（多層背景制作）からも共通利用できる Skill へパッケージ化する。

---

## 5. 実装済み CLI（`abyss-depth-lab/tools/world_blaster.py`）

ローカル無料部分（深度推定・法線 `_n.webp`・発光 `_e.webp`・遠/中/近景 2D スライス）と、有料外部 API 部分（FAL Hunyuan 3D `.glb`・World Labs Marble `.spz`・FAL ElevenLabs SFX `.mp3`）を 1 本のゼロ追加依存 CLI へ統合済み（2026-11-27 実画像検証済み）。

```powershell
# 1) ローカル無料: 1枚アート → 法線(_n.webp) + 発光(_e.webp) + 遠/中/近景スライス
python abyss-depth-lab/tools/world_blaster.py slice --input abyss-depth-lab/assets/hall_giant_kelp.webp --out-dir abyss-depth-lab/worlds/kelp/layers

# 2) 有料 API: 潜水艇を Hunyuan 3D (.glb) 化（FAL_KEY を環境変数 or tools/.env.local へ設定）
python abyss-depth-lab/tools/world_blaster.py hunyuan3d --input abyss-depth-lab/assets/submersible_09.webp --out-dir abyss-depth-lab/worlds/sub/mesh --face-count 50000

# 3) 有料 API: 海溝回廊を Marble (.spz) 空間化（WORLD_LABS_API_KEY を設定）
python abyss-depth-lab/tools/world_blaster.py marble --input <canyon_art.webp> --out-dir abyss-depth-lab/worlds/canyon/marble

# 4) 有料 API: 環境音・SE (.mp3) 生成
python abyss-depth-lab/tools/world_blaster.py sfx --prompt "deep underwater abyssal current roar" --out abyss-depth-lab/worlds/canyon/audio/rush.mp3

# 5) 一気通貫 blast（--dry-run で API 課金前の確認が可能）
python abyss-depth-lab/tools/world_blaster.py blast --input <art.webp> --slug mantle_canyon --with-mesh --sfx-prompt "deep ocean bioluminescent cavern" --dry-run
```

