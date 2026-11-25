# ABYSS DIVE（`abyss-depth-lab/` 一本化版） — 現在地

最終更新: 2026-11-25 / 版 **v3.5.1**（`sw-assets.js` `v9`, `package.json` `3.5.1`）

---

## 1. 体制・担当分担（今後の開発指針）

- **唯一の正規開発先**: `abyss-depth-lab/`（ハブのゲームカードも `ABYSS DIVE` 1 枚へ一本化済み。旧 `abyss-dive/` フォルダは安全のため残置）。
- **ブランチ状態**: ローカル `main` と公開 `origin/main` は分岐なしの一直線履歴。必ず `abyss-depth-lab/` だけを編集・ステージする（`git add -A` 禁止）。
- **担当分担**:
  - **Antigravity**: **環境アート・ストーリーラインに沿ったマップ構造構築**（バイオーム別多層アート・水の色/見通し/空間ライティング遷移・実地形と透過マップ連動・Depth Stacking 最適化）
  - **Hermes**: **敵キャラクターの制作**（造形・モーション・バイオーム別生態AI・戦闘バランス）
  - **Gemini**: **物語・台詞**
- **環境 × 敵アートスタイル擦り合わせ基準（必読）**: [`docs/ART_STYLE_GUIDE.md`](ART_STYLE_GUIDE.md)
  - 共通の絵柄（線画なしセミリアリスティック厚塗り・高密度テクスチャ）、図地分離（環境＝低彩度/寒色・黒岩ベース、敵＝中高彩度・暖色/明確な発光予兆）、バイオーム別の色対比指針、および座標・バイオーム参照インターフェースを明文化済み。
- **セーブ互換**: 本番キー（`game_studio_abyss_*`）を正規保存先とし、旧本番セーブをそのまま自動引き継ぎ。

---

## 2. ストーリーラインに沿ったワールド＆マップ構造（v3.1.0 現在地）

必読資料（すべて `abyss-depth-lab/docs/` に統合済み）:
- 物語・世界観の正本: [`docs/STORY.md`](STORY.md)（原文: `docs/story-reference/4.md`）
- フィールド・マップ構想: [`docs/DEEP_FIELD_PLAN.md`](DEEP_FIELD_PLAN.md)
- 環境 × 敵アート基準: [`docs/ART_STYLE_GUIDE.md`](ART_STYLE_GUIDE.md)
- 描画基盤設計・計測: [`docs/PHASE0_ARCHITECTURE.md`](PHASE0_ARCHITECTURE.md), [`docs/PHASE1_REPORT.md`](PHASE1_REPORT.md)

### 世界の縦構造（『海底4万マイル』・下に広がるピラミッド構造）
主方向は右ではなく **下**。潜るほど左右に探索範囲と分岐・降下口が広がる（クリア強制・リセットなしのシームレス探索）。

- **拠点方針（2026-11-25 決定）**: 地球パートでは旧案の「海底4都市」は採用しない。ストーリー（ロボットに囲まれて自活していたエリーが父の信号を追って地球中心へ潜る旅）に合わせ、改造・メンテナンス・武器開発・会話は **「船内インターミッション」への切替**（ponco MarkII のナノマシン工作＋Gem の船内重工作・ケア）を基本案とする（海中に不自然な有人都市を置かず、未踏の深淵でも自然に改修・会話ができる構造）。

1. **沈没都市の外縁（実装済み）**: `y = 0..2600`（遺跡エアロック・徒歩探索・改造/開発用基地）
2. **海溝と第2前哨基地「深棚」（実装済み）**: `y = 2600..4100`（`trench-rules.js`, `FLOOR_Y = 2600`）
3. **第1拡張フェーズ：深棚下の2分岐と合流広間（v3.1.0 で構築完了！）**:
   - **左ルート「狭洞窟・直下降」**（`narrow_cave`, `y = 4100..5650`）：暗く閉じた岩窟と互い違い岩棚・鍾乳石アーチ（`cave_stalactite`）。最小通過幅 `>= 340px` で自力帰還可能。照明弾・ヘッドライトが最も映える暗がり。
   - **右ルート「熱水・火山帯 横回り」**（`hydrothermal`, `y = 3540..5650`）：深棚右壁の横穴から右へ広がる黒玄武岩回廊と熱水噴出口（`volcanic_vent` + 上昇プルーム + 琥珀局所光）を経て火山竪穴へ下降。
   - **下層「合流広間 — クラゲ帯／海草林」**（`confluence_hall`, `y = 5650..6900`, `WORLD_BOTTOM = 6900`）：両ルートが合流する広大な空間。**深度と明るさを直結させず**、澄んだ青緑〜淡い青紫の間接光・見通しの抜け・巨大発光海草（`hall_giant_kelp`）・無害なクラゲ群れを配置。どちらのルートからも深棚へ自力帰還可能。
   - **共通純粋ワールド定義**: `js/world-biomes.js`（`BIOMES`, `sampleBiomeAt`, `zoneNameAt`）と `js/trench-rules.js`（`createTrench`）を WebGL2（`depth-bridge.js` / `shaders.js` / `renderer-webgl2.js`）・Canvas2D（`trench.js` / `game.js`）・透過マップ（`map-rules.js` / `dive-map.js`）が同一座標系で参照。
   - **ネタバレ防止規則**: 序盤〜第1拡張フェーズの UI・地図・バイオーム名にブラックホール・木星・4万マイル・3,920/3,960マイル等の種明かしは一切含めない（自動テストで担保）。
4. **中長期のストーリー到達域（次フェーズ以降）**:
   - **マントル領域（超臨界水・極限生態系の楽園）**: 熱輻射・放射線を吸収して青白〜黄金色に光る深淵植物群（蓄熱コア／真空断熱バリアの舞台）
   - **深度 3,920〜3,960 マイル境界**: 水圧上昇停止・下方発光・宇宙空間と美しいブラックホール（重力レンズ歪みシェーダー）
   - **4,000 マイル〜木星内部海**: 地球側 3,960 マイル＋木星側 36,000 マイルの異質海

---

## 3. 現在の実装・ファイル構成（v3.3.0）

- **ハイブリッド描画基盤**:
  - 下層 WebGL2（`js/depth-bridge.js?v=4`, `js/renderer-webgl2.js?v=3`, `js/shaders.js?v=2`, `js/depth-math.js?v=2`, `js/world-biomes.js?v=1`）：バイオーム連続補間による水色・環境光・霧散乱・コースティクス遷移、15層 Depth Stacking（5〜30層可変）、**操作層実地形レイヤー（`terrain_0`, `z=0.0`）による `trench.solids`・`G.rocks`・海底・熱水チムニーのノーマルマップ＋遮蔽シャドウ付き描画**、5ライティンググループ 3×2 アトラス、ブルーム。
  - 新規バイオーム環境アート素材（`assets/manifest.json` 登録済み・線画なし厚塗り）：
    - `volcanic_vent.webp` / `_n.webp` / `_e.webp`（熱水・火山帯 黒玄武岩チムニー＆琥珀亀裂）
    - `cave_stalactite.webp` / `_n.webp`（狭洞窟 鍾乳石アーチ）
    - `hall_giant_kelp.webp` / `_n.webp` / `_e.webp`（合流広間 巨大発光海草・シアン＆淡い青紫）
  - **船内インターミッション（`js/base.js?v=17`, `assets/cabin-workshop.webp`, `cabin_ellie_anim.webp`, `cabin_gem_anim.webp`, `cabin_ponco_anim.webp`）**：潜航 HUD 上部の「船内」ボタン（または `B` キー）からいつでも切り替えられ、船内ワークショップ背景＋環境演出の上で、アニメ調 4 コマアニメーションの 3 人（くつろぐエリー／溶接整備する Gem／ホログラム演算する ponco MarkII）が動きながら改造・機体換装・武器製作・指定開発を完結し、元の潜航位置へシームレス復帰する。
  - 中層 Canvas2D（`js/game.js?v=47`, `js/projectile-shapes.js?v=2`, `js/trench.js?v=4`, `js/trench-rules.js?v=2`, `js/dive-map.js?v=2`, `js/map-rules.js?v=2`）：旧 Canvas2D 時代のギザギザ多角形視差・単色矩形岩盤・旧ベクター岩・単色海底ベタ塗りを撤去し、`depthActive` 時は実地形描画をすべて WebGL2 側へ一本化。ミサイルは 4 形状（`missile_stock/finned/stout/sleek.webp`）の高精細スプライト＋動的スラスター推進炎へ刷新（実戦・補給アイコン・武器プレビュー共通）。
  - 透過マップ：深棚下の 2 分岐＋合流広間の実地形・海域トーン・発見済み地点（`cave-route`, `volcanic-vent`, `confluence-hall`）を反映。
- **キャッシュ・版管理**: `sw-assets.js`（`version: 'v8'`, `gameVersion: '3.5.0'`, 全 114 ファイル登録）、`package.json`（`3.5.0`）。
- **テスト**: `tests/depth-math.test.mjs`（6件）, `tests/intro.test.mjs`（24件）, `tests/world-biomes.test.mjs`（4件）＝計 34 件全通過。

---

## 4. 壊れやすい箇所・実装上の注意

- `game.js` の 2D コンテキストは `alpha: true`。`depthActive` 時は透過クリアし、海溝開口の `seaFloor` 描画と `trench.js` の不透明背景抜きをスキップすることで WebGL2 多層背景を奥へ抜いている（Depth OFF 時は従来 Canvas2D 背景へ自動フォールバック）。
- ワイド画面（iPhone 横持ち `874×402` 等）の 16:9 境界段差を防ぐため、`drawLighting` の左右端ソフトフェードと Canvas2D 側二重 `vignette` の抑止を維持すること。
- アセットや JS を増減したら必ず `sw-assets.js` の `files` / `version` / `gameVersion` と、更新 JS/CSS の `?v=` を同時に上げる。

---

## 5. 次にやること（優先度順）

1. **（Hermes 連携）新バイオーム向け敵キャラクターの配置＆生態実装**:
   - `docs/ART_STYLE_GUIDE.md` と `js/world-biomes.js`（`sampleBiomeAt`）を参照し、狭洞窟（待ち伏せ型）・熱水火山帯（噴出の合間を行き来する耐熱型）・合流広間（海草回り込み型／放電クラゲ型）の敵を実装。
2. **（Antigravity）Depth Stacking Phase 2 最適化＆次層（マントル領域）準備**:
   - 魚群・同素材のインスタンシング描画（Draw Calls 圧縮：現状 ~95–100 DC → 40 DC 以下目標）。
   - 巨大生物通過時の遮蔽ゴッドレイ強調、および合流広間のさらに下「マントル領域（超臨界水・青白〜黄金の発光深淵植物群）」の設計・試作。
3. **（Gemini 連携）深棚〜分岐ルート到達時の ponco MarkII / エリー探索会話・環境ログ**:
   - 狭洞窟・熱水帯・合流広間の初回発見時 (`G.discNotice`) に合わせた短い探索セリフの接続。

---

## 6. 動作確認・テスト手順

```powershell
# 単体テスト（コミット前必須）
node --test abyss-depth-lab/tests/*.test.mjs

# ローカル配信（ルートからハブ確認）または公開サイトで確認
```
