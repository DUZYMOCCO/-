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

## 2. `abyss-depth-lab` 向け切り分け（ローカル無料 vs 外部 API）

本プロジェクト（iPhone 60fps 狙いの WebGL2 多層 2D 深海レンダラー＋背後視点コースター）では、**3D 空間をそのままブラウザに載せず「高品質な多層 2D 素材・法線マップ・多角度スプライトを焼き出す中間工程」として使う**のが最も合理的である。

| 工程 | ローカル無料（RTX 2070 SUPER 8GB + ComfyUI） | 外部 API（ピンポイント課金） | 結論・推奨運用 |
| :--- | :--- | :--- | :--- |
| **1. シーン調査＆分解設計** | エージェント（Antigravity / HERMES / Neon）が `Literal Description Rules` で JSON 化 | 不要 | **100% ローカル無料**で移植 |
| **2. 2D コンセプトアート生成** | 稼働中の `tools/comfy_gen.py --model juggernaut`（SDXL 1024px） | 不要 | **100% ローカル無料**（構築済み） |
| **3. 背景分離・クリーンプレート** | ComfyUI インペイント + 背景透過（`rembg` / `RMBG`） | `nano-banana` 等の方が複雑遮蔽の補完精度は高い | **通常はローカル無料**、複雑背景のみ外部検討 |
| **4. 深度マップ＆法線マップ（`_n.webp`）** | `Depth Anything V2`（ComfyUI / Python）→ 勾配変換でタンジェント法線 `_n.webp`＋Z 帯スライス出力 | 不要 | **100% ローカル無料**（`depth-bridge.js` へ直結！） |
| **5. 3D 大空間からの奥行き焼き出し** | 2D だけではカメラ前進時の立体回り込みが破綻しやすい | **World Labs Marble 1.1（`.spz`）** で 3D 空間化 → Three.js で Z スライス／回廊壁面を 2D レンダリング | **最重要シーンだけピンポイント課金**（海溝回廊・マントル楽園・3,960マイル・木星内部海） |
| **6. 潜水艇・巨大生物の多角度 2D 化** | 2D 画像生成だけだと側面・背後・バンク角の一貫性が崩れやすい | **Hunyuan 3D（FAL API）** で 1 回だけ `.glb` 生成 → 側面／背後／バンク角＋正確な法線 `_n.webp` を 2D 焼き出し | **主役機（潜水艇リアビュー）や大型ボスだけピンポイント課金**（1体作って一生使い回せる） |
| **7. 環境音・映画的 SE** | WebAudio 合成（現行 `AU`） | **ElevenLabs SFX** で海流轟音・ブラックホール低周波・EMP 音を生成 | **クライマックス演出のみピンポイント課金** |

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
