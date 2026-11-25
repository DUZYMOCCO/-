# ABYSS DIVE（`abyss-depth-lab/` 一本化版） — 現在地

最終更新: 2026-11-26 / 版 **v3.9.1**（`sw-assets.js` `v16`, `package.json` `3.9.1`）

船内インターミッション（「倉庫・換装」「強化・整備」「開発・製作」）＋ **v3.7.1 のレーザー/反射魚雷修正・船内メニュー重なり解消** ＋ 承認済みの敵（B亜種ヤドカリ／煤冠イソギンチャク, v3.8.0）を保持したまま、**新大型敵「地層背負いの巨蟹（仮）」を 1 遭遇として追加（v3.9.0）**。巨蟹の前脚 上腕(merus)は承認済みの ComfyUI 生成 v2（d0.62）へ差し替え済み。

---

## 0. いま何が動いているか

### v3.9.0 の追加点: 地層背負いの巨蟹（大型・`kind:'geo_crab'`）
- **合流広間（`confluence_hall`）の深床に 1 遭遇だけ**。プレイヤーが広間中心へ `|p.x - 中心| <= 2600` で近づいたときに 1 体だけ出現（`ensureGeoCrab`。カメラ相対＝遠方で先出ししない）。撃破後は同一遭遇で再出現しない。
- **生態**: 起伏のある黒玄武岩に擬態する幅広の海底大型蟹。**休眠（岩）→ 警戒 → 予告（wind・近側前脚を持ち上げる・無害）→ 一振り（swing）→ 復帰**。弾は撃たない・泳がない（触手・弾幕・泳ぐボスの焼き直しにしない）。
- **倒す必要はない**: 体（殻）への接触は無害。傷つくのは**見えている近側前脚の一振りの範囲にいるときだけ**（`geoCrabLegTouch`）。真上へ逃げれば振り中でも当たらず、**倒さず通過できる**。
- **殻は硬い（弾は無効化しない）**: 装甲を通した実ダメージ（`geoCrabDamage`）。序盤魚雷 1.5/発 → 殻には 1 発 ≈ **0.09**（= `dmg*FLOOR_BODY`）。最大強化（改造 200 段＋個体 200 段強化、perShot≈31）は装甲を通過。露出関節（軟部）は wind/swing の膝関節まわりのみ。
- **前脚の描画**: 上腕(merus)/前腕(fore)/爪(claw) は透過 WebP を**関節ピボットで回して置く**（`CRAB_LEG_META`）。Canvas 図形は素材が読めない時のフォールバックのみ。予告は照明に消されない別パス（`drawGeoCrabTelegraph`）。殻は `drawGeoCrab` が焼き 1 枚を描く。
- **撃破**: 資源 **1200** を一度だけ（`createCrabEncounter.onDefeat`）。崩壊（脚が弛みわずかに沈む）を 1.6 秒見せてから消える。
- **前脚の材質（v3.9.1 で展開済み）**: 上腕(merus) は承認済み d0.62（**バイト維持**）、前腕(fore)・爪(claw) も同意匠（暗玄武岩〜錆茶・厚い重なり甲殻・深い溝）へ展開済み。**実ゲーム等倍では肩〜爪が同一の暗いマット甲殻として読める**（旧版の灰色プレースホルダは解消）。ただし d0.62 上腕と完全同一ではなく近縁（前腕はわずかに暖色寄り・やや平滑、爪は二枚爪を保持 IoU 0.99）。詳細は `docs/WORK_REPORT.md` の v3.9.1 項。

### v3.8.0（保持）: B亜種ヤドカリ（`hermitB`）／煤冠イソギンチャク（`anemone`）
- **B亜種ヤドカリ**: 深部（合流広場の深床）へ進入で 1 遭遇。歩行→警戒→鋏を開く砲撃。撃破は表示ポーズを殻/胴/脚/鋏/眼の 6 部位へ分裂（`js/pose-debris.js`＝演出のみ）。世界固定でカリング対象外。
- **煤冠イソギンチャク**: 熱水・火山帯の竪穴左壁に根づく固定型。閉→白青い短い予告（無害）→触手を広げる（この間のみ接触ダメージ）→引っ込む。1 潜行＝1 遭遇、報酬は一度だけ。
- 既存の魚3種・戦車ヤドカリ・船内UI・レーザー/反射魚雷修正・セーブは**不変**。

---

## 1. 体制・担当分担（今後の開発指針）

- **唯一の正規開発先**: `abyss-depth-lab/`（ハブのゲームカードも `ABYSS DIVE` 1 枚へ一本化済み。旧 `abyss-dive/` フォルダは安全のため残置）。
- **ブランチ状態**: ローカル `main` と公開 `origin/main` は分岐なしの一直線履歴。必ず `abyss-depth-lab/` だけを編集・ステージする（`git add -A` 禁止）。
- **担当分担**:
  - **Antigravity**: **環境アート・ストーリーラインに沿ったマップ構造構築**（バイオーム別多層アート・水の色/見通し/空間ライティング遷移・実地形と透過マップ連動・Depth Stacking 最適化）
  - **Hermes**: **敵キャラクターの制作**（造形・モーション・バイオーム別生態AI・戦闘バランス）
  - **Gemini**: **物語・台詞**
- **環境 × 敵アートスタイル擦り合わせ基準（必読）**: [`docs/ART_STYLE_GUIDE.md`](ART_STYLE_GUIDE.md)（公式ビジュアルリファレンスシート [`docs/art_reference_sheet.webp`](art_reference_sheet.webp) 組込み済み）。画像生成パイプラインは `tools/comfy_gen.py`。
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

- **拠点方針（2026-11-25 決定）**: 地球パートでは旧案の「海底4都市」は採用しない。改造・メンテナンス・武器開発・会話は **「船内インターミッション」への切替**（ponco MarkII のナノマシン工作＋Gem の船内重工作・ケア）。

1. **沈没都市の外縁（実装済み）**: `y = 0..2600`
2. **海溝と第2前哨基地「深棚」（実装済み）**: `y = 2600..4100`（`trench-rules.js`, `FLOOR_Y = 2600`）
3. **第1拡張フェーズ：深棚下の2分岐と合流広間**:
   - **左ルート「狭洞窟・直下降」**（`narrow_cave`, `y = 4100..5650`）
   - **右ルート「熱水・火山帯 横回り」**（`hydrothermal`, `y = 3540..5650`）：**v3.8.0: 火山竪穴左壁に煤冠イソギンチャク。**
   - **下層「合流広間」**（`confluence_hall`, `y = 5650..6900`, `WORLD_BOTTOM = 6900`）：**v3.8.0: 深床に B亜種ヤドカリ。v3.9.0: 広間中心の深床に地層背負いの巨蟹が 1 遭遇。**
   - **共通純粋ワールド定義**: `js/world-biomes.js`（`BIOMES`, `sampleBiomeAt`, `zoneNameAt`）と `js/trench-rules.js`（`createTrench`）を WebGL2・Canvas2D・透過マップが同一座標系で参照。
   - **ネタバレ防止規則**: 序盤〜第1拡張フェーズの UI・地図・バイオーム名に種明かしを一切含めない（自動テストで担保）。
4. **中長期のストーリー到達域（次フェーズ以降）**: マントル領域／深度 3,920〜3,960 マイル境界／4,000 マイル〜木星内部海。

---

## 3. 現在の実装・ファイル構成（v3.9.0）

- **ハイブリッド描画基盤**:
  - 下層 WebGL2（`js/depth-bridge.js?v=5`, `js/renderer-webgl2.js`, `js/shaders.js`, `js/depth-math.js`, `js/world-biomes.js`）：バイオーム連続補間、15層 Depth Stacking、実地形レイヤー（`terrain_0`, `z=0.0`）、5ライティンググループ、ブルーム。
  - **船内インターミッション（`js/base.js?v=20`, `js/base-rules.js?v=10`, `js/cabin-panels.js`, `assets/cabin-*.webp`）**：統合「☰ メニュー」から切替、5 項目＋テーマ別背景アニメーション＋3 人の 4 コマアニメ。**v3.9.0 で不変。**
  - 中層 Canvas2D（`js/game.js?v=54`, `js/projectile-shapes.js?v=3`, `js/trench.js?v=4`, `js/trench-rules.js?v=2`, `js/dive-map.js?v=2`, `js/map-rules.js?v=2`）：`depthActive` 時は実地形描画を WebGL2 側へ一本化。ミサイルは 4 形状スプライト＋3 段階挙動。**v3.8.0: `js/pose-debris.js?v=1`, `js/anemone-rules.js?v=1`。v3.9.0: `js/geo-crab-rules.js?v=1`。**
- **敵ロスター（v3.9.0 時点）**: 魚3種（`minnow`/`hunter`/`angler`）／戦車擬態型ヤドカリ（`hermit`）／B亜種ヤドカリ（`hermitB`）／イカ砲手（`gunner`）／クラゲ（`jelly`）／煤冠イソギンチャク（`anemone`）／**地層背負いの巨蟹（`geo_crab`, 大型・合流広間1遭遇）**／リヴァイアサン。
- **巨蟹アセット（v3.9.1）**: `assets/geo-crab-shell.webp`/`_n`/`_e`（殻・1180×470）、`assets/crab-leg-merus.webp`（1614×287, **承認 d0.62・バイト維持**）、`assets/crab-leg-fore.webp`（1739×240, **v3.9.1 で merus 意匠へ再生成**）、`assets/crab-leg-claw.webp`（360×344, **v3.9.1 で再生成**）、`assets/crab-leg-parts.json`（寸法・ピボット）。生成: `tools/bake_geo_crab*.py`＋`tools/bake_merus_v2.py`（殻・脚の Blender 焼き／上腕 仮絵）、`tools/comfy_gen.py`（img2img: 上腕 seed20261125 d0.62 / 前腕 0.32 / 爪 0.38）＋`keyer.py`（緑キー・despill）。
- **キャッシュ・版管理**: `sw-assets.js`（`version: 'v16'`, `gameVersion: '3.9.1'`, 全 127 ファイル登録）、`package.json`（`3.9.1`）。
- **テスト**: `cabin-panels`(5) + `depth-math`(6) + `intro`(24) + `world-biomes`(4) + `pose-debris`(14) + `hermit-b`(7) + `hermit-b-ingame`(11) + `assets`(4) + `anemone`(6) + `geo-crab`(8) ＝ **計 100 件**（全通過）。

---

## 4. 壊れやすい箇所・実装上の注意

- `game.js` の 2D コンテキストは `alpha: true`。`depthActive` 時は透過クリアし WebGL2 多層背景を奥へ抜く（Depth OFF 時は Canvas2D 背景へ自動フォールバック）。
- ワイド画面の 16:9 境界段差を防ぐため、`drawLighting` の左右端ソフトフェードと Canvas2D 側二重 `vignette` の抑止を維持する。
- **接地型/固定型の敵を足すときは共有フックを同時更新**: `damageEnemy` の吹き飛ばし除外（`e.kind==='hermit' || e.kind==='hermitB' || e.kind==='geo_crab' || e.rooted`。巨蟹はさらに装甲計算へ分岐）、`knockEnemy`（`|| e.kind==='hermitB' || e.rooted`）、`drawWatchTelegraph` の予告ループ、`updateEnemy` の switch、`drawEnemyBody`／描画ループ、`G` 状態を必ずそろえる。
- **巨蟹は `cull()` の deadT 残存**（`e.kind==='geo_crab' && (e.deadT||0)>0`）を消すと崩壊が見えなくなる。**hermitB は世界固定でカリング対象外**（`e.kind==='hermitB'`）を消すと消える。
- **巨蟹の召喚**: `ensureGeoCrab()` は `deepUnlocked()` と `|p.x-中心|<=2600` が前提。`spawnEnemy('geo_crab',...)` を直接呼ぶと 1 遭遇台帳（`crabEncounter`）を通らず報酬・非再出現が壊れる。
- anemone の 1 遭遇台帳は `G.anemone`（新しい潜行でのみ作り直す）。`createAnemoneEncounter` の `needSpawn()/onSpawn()/onDefeat()` を迂回すると多重化・報酬二重になる。
- アセットや JS を増減したら必ず `sw-assets.js` の `files` / `version` / `gameVersion` と、更新 JS/CSS の `?v=` を同時に上げる（`tests/assets.test.mjs` が実在と `gameVersion`=package.json 一致を検査）。
- `tests/hermit-b-ingame.test.mjs`「range 内でも notice が進む」はテスト並列実行時のフレーム供給に敏感。失敗したら単体実行で切り分ける（実装の退行ではない）。

---

## 5. 次にやること（優先度順）

1. **（Hermes・最優先）巨蟹 前脚 前腕(fore)・爪(claw) の材質リペイント**: 上腕(merus) は承認済み d0.62 で高密度マット甲殻になったが、前腕は平滑な明灰プレースホルダ、爪は平滑な暗色のまま。`ART_STYLE_GUIDE` / `art_reference_sheet.webp` を基準に、`tools/bake_merus_v2.py`＋`tools/comfy_gen.py`（seed 20261125, denoise 掃引）と同じパイプラインで前腕・爪を再生成し、同縮尺・同条件で比較する。
2. **（Hermes）新バイオーム向け敵の拡充**: 狭洞窟（待ち伏せ型）・熱水帯（耐熱型）・合流広間（海草回り込み型／放電クラゲ型）。巨蟹の 1 遭遇配置を雛形にする。
3. **（Antigravity）Depth Stacking Phase 2 最適化＆次層（マントル領域）準備**: インスタンシング（~95–100 DC → 40 DC 以下）、巨大生物通過時のゴッドレイ強調、マントル領域の設計・試作。
4. **（Gemini 連携）深棚〜分岐ルート到達時の ponco MarkII / エリー探索会話・環境ログ**。

---

## 6. 動作確認・テスト手順

```powershell
# 単体テスト（コミット前必須）
node --test abyss-depth-lab/tests/*.test.mjs

# ローカル配信（ルートからハブ確認）または公開サイトで確認
```

- 巨蟹の確認（実ブラウザ横持ち 874×402 DPR2・タッチ・**Depth ON**）: ハブで `ABYSS DIVE` カードを実タップ→導入スキップ→タイトル実タップ→`window.__abyss.G.bossKills=1` で深部開放→`window.__abyss.G.player` を合流広間（`trench().sites.confluenceHall.x`, 深床 `deepFloorY`）へ移動→接近で 1 体出現。射撃は**画面右 1/3 の実タップ**。装甲は `window.__abyss.applyInitialLoadout()`／`applyMaxLoadout()` と `loadout()` で同条件比較できる。
- 検証手順の詳細例は `docs/WORK_REPORT.md` の v3.9.0 項。実機（スマホ実ハード）の FPS・発熱は未確認。ヘッドレス Chromium の結果と混同しないこと。
