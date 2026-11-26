# ABYSS DIVE（`abyss-depth-lab/` 一本化版） — 現在地

最終更新: 2026-11-26 / 版 **v3.11.0**（`sw-assets.js` `v23`, `package.json` `3.11.0`, `js/index.js` `game.js?v=61`）

**v3.11.0**: 合流広間（`y=6900`）の底に **大深度・海流回廊（左＝高速下降／右＝上昇リフト）** と次層 **「マントル上層・発光深淵（`y=8500..9900`, 深度 120〜180 km）」** を開通。回廊滑走中のスピード線・泡・水流 SE・深度計 `m→km` 高速カウントアップに加え、時間を止めず操作を邪魔しない **ノンストップ無線会話（`js/radio-rules.js`）** を実装。

船内インターミッション（「倉庫・換装」「強化・整備」「開発・製作」）＋ **v3.7.1 のレーザー/反射魚雷修正・船内メニュー重なり解消** ＋ 承認済みの敵（B亜種ヤドカリ／煤冠イソギンチャク, v3.8.0）を保持したまま、**新大型敵「地層背負いの巨蟹（仮）」を 1 遭遇として追加（v3.9.0）**。巨蟹の前脚 上腕(merus)は承認済みの ComfyUI 生成 v2（d0.62）へ差し替え済み。

**v3.9.2（隔離試作・未 push）**: 承認済みの**全身原画 A/B/C** から解剖分割した別種**「礫鎧ガニ」3 種**（A=丸い／B=低く幅広い／C=青灰の異形鎧）を、合流広間に**離して配置した隔離プレイアブル候補**として追加（旧 gravel-crab の石板状 art は不使用。`docs/gravel-crab-abc-review.png` / `docs/gravel-crab-walk.mp4`）。

**v3.9.3（同上・未 push）**: 礫鎧ガニの**左右バグ**（`gravelCrabClaw` が `R` を `S` の外側で掛け、swing 末尾の鋏先が左右とも +x だった）を**共有変換**へ統一して修正。**遠距離からの正面定点撃ち一択**を解消（正面=かばわれて僅少／横・背後=露出関節で有効／一振り直後の隙=最も有効／遠いと数歩だけ詰める＝退路は残る）。一律の距離無効・硬さ盛り・弾幕追加はしない。

**v3.9.4（同上・未 push）**: 礫鎧ガニ 3 種へ**架空のゲーム内攻撃**を追加して役割分担を付けた（**A=バブルショット**＝口元に泡が溜まる無害な予備動作→ゆっくり進む泡の短い斉射 / **B=岩石投げ**＝大鋏で岩を拾う無害な予備動作→鋏先から弧を描く岩 1 個 / **C=遠距離なし**・大鋏と短い追跡のまま）。既存の近接は残し、遠距離は**視界・間合い・地形・クールダウン**で制限（画面外狙撃・連続弾幕・岩越し・全画面予告なし）。あわせて**原画は正面向きで近い大鋏が画像の左**と判明したため左右反転の条件を訂正（`dir>0` で反転。大鋏・当たり・発射起点が常にプレイヤーの側へ）。`node --test` **129/129**。

---

## 0. いま何が動いているか

### v3.9.4（隔離試作）の変更点: 礫鎧ガニの遠距離攻撃（泡／岩）と役割分担
- **A=バブルショット**: `charge`（口元に泡が溜まる・**当たり判定なし**）→ `release` で**短い斉射 3 発**（150 px/s・gap 0.16s・寿命 3.0s・**追尾なし**）。寿命切れ／地形接触で**破裂**（±0.11rad の散らし）。威力 12。
- **B=岩石投げ**: `charge`（大鋏で岩を拾う・無害）→ **岩 1 個**を照準へ放物線で発射（重力 900・**追尾なし**）。**床/壁で止まり砕ける**（shatter→破片→settled）。威力 22。
- **C=遠距離なし**: 大鋏の一振りと**短い追跡**のまま（役割分担＝動き・体格・鋏で識別。色替えではない）。
- **制限（逃げ道を残す）**: 視界（向き＋`castSegment` で**岩越し不可**）／間合い（A 540–620, B 560–640）／地形（`pointInShapes`・床）／**クールダウン**（A 3.2s, B 3.8s）。**画面外では撃たない**。予告は**局所のみ**（口元の泡／鋏先の岩＋細い破線）。
- **左右の訂正**: 原画は**正面（手前）向きで近い側の大鋏が画像の左**。→ `dir>0` のときだけ反転が正しい。`drawGravelCrab`／`gravelCrabClaw`／`gravelCrabBodyHit` を同じ変換に統一（回帰 5b・新 31）。
- **実測**: 実ブラウザ（横持ち・実タッチ・Depth ON・Std）で A 被弾 **HP 100→88**＝12、B 被弾 **HP 100→78**＝22、B の岩が床で砕ける／画面外では撃たない／真上通過は **HP 100 のまま**、JS エラー 0。`node --test` **129/129**。原寸透過の連結は A/B/C すべて**穴 0・最大アルファ 255・浮きパーツ 0**（`tools/check_gravel_crab_concat.py`）。
- **レビューシート**: `docs/gravel-crab-abc-review.png`（3 種 × 原画 → 解剖分割 → 実画面・警戒 → 予備動作 → 発射物/近接）。短い動画 `docs/gravel-crab-attacks.mp4`（1024×460・3.8s）。

### v3.9.3（隔離試作）の変更点: 礫鎧ガニの左右修正と「定点撃ち一択」の解消
- **左右バグ修正**: 描画は `T·S(dir)·R(rot)`、当たり（`gravelCrabClaw`）は `R` を `S` の外側で掛けていたため、swing 末尾の鋏先が左右とも +x（a 247.9 / b 312.3 / c 239.5）。**共有変換**（局所で R → 最後に S(dir)）に統一し、向きで符号が反転。攻撃中（wind/swing/recover）は向き固定。
- **面で効きを変える**（`gravelCrabHitZone` / `gravelCrabDamage`）: 正面 `guard`=ごく僅少（0 にはしない）／横・背後 `joint`=有効／振り直後 `open`=最も有効。正面命中で **guardT**（鋏でかばう姿勢＋効き低下）。
- **短い追跡**: `stalk` で `pursueR` 内を `homeX±pursueMax` までだけ詰め、外れたら `return` で定位置へ（**退路を確保**）。
- **実測（実ブラウザ・実入力・同一装備 perShot≈27.93）**: 定点・正面 12 発 → **HP −8.8**／回り込んで背後 12 発 → **HP −311.1**（約 35 倍）。`node --test` **117/117**。

### v3.9.2（隔離試作）の追加点: 礫鎧ガニ A/B/C（`kind:'gravel_crab'`, `species:'a'|'b'|'c'`）
- **承認済みの全身原画から解剖分割**（`tools/split_gravel_crab_abc.py`）: 背景はサリエンシーマット（`briaai/RMBG-1.4`）で抜き、
  原画を **甲羅+眼 ／ 近側の太い鋏 ／ 奥側の鋏 ／ 脚** の 4 部位へ分割（「太い塊=甲羅・鋏／細い張り出し=脚」を開口＋距離で分離、
  前景を隙間なく充填し、隣接は 18px 重ねる）。**幾何ブロックアウトの型抜きはしない**（ART_STYLE_GUIDE §1.1）。
- **共有リグ** `js/gravel-crab-rules.js`（純粋）。3 別種は**色替えでなく**体格（体幅 980/1180/940）・歩行（22/42/16）・
  鋏（間合い 440/470/530・威力 18/14/27・装甲 2/1/6）で識別。**足裏は床に接地**（`e.y = floorY - feetY`）＝横歩き。警戒→予告(無害)→一振り→復帰。
- **配置**: 合流広間の深床へ中央 x から −1450 / +1350 / +2350 に**離して**置く（既存 `geo_crab` は中央のまま不変）。
  体の接触は無害・上や後ろを通過可・撃破は必須にしない。
- **検証（実ブラウザ・横持ち・タッチ・Depth ON）**: 3 体が同一点に密集せず出現・足裏が深床に接地・JS エラー 0。
  中立／警戒／予告を撮影し、**甲羅・眼・鋏・脚が読める**ことを確認。Depth ON/OFF、原寸透過の連結一致は `WORK_REPORT.md` v3.9.2 項。
- **残**: 実機（実ハード）FPS・発熱は未確認。「脚」は解剖の残差で、B/C は原画で脚が鋏の陰に隠れるため分離が粗い（同モデル補完は未実施）。

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
  - 中層 Canvas2D（`js/game.js?v=57`, `js/projectile-shapes.js?v=3`, `js/trench.js?v=4`, `js/trench-rules.js?v=2`, `js/dive-map.js?v=2`, `js/map-rules.js?v=2`）：`depthActive` 時は実地形描画を WebGL2 側へ一本化。ミサイルは 4 形状スプライト＋3 段階挙動。**v3.8.0: `js/pose-debris.js?v=1`, `js/anemone-rules.js?v=1`。v3.9.0: `js/geo-crab-rules.js?v=1`。v3.9.3: `js/gravel-crab-rules.js?v=3`, `js/gravel-crab-parts.js?v=2`。**
- **敵ロスター（v3.9.2 時点）**: 魚3種（`minnow`/`hunter`/`angler`）／戦車擬態型ヤドカリ（`hermit`）／B亜種ヤドカリ（`hermitB`）／イカ砲手（`gunner`）／クラゲ（`jelly`）／煤冠イソギンチャク（`anemone`）／**地層背負いの巨蟹（`geo_crab`, 大型・合流広間1遭遇）**／**礫鎧ガニ A/B/C（`gravel_crab`, 合流広間に離して配置した隔離候補）**／リヴァイアサン。
- **巨蟹アセット（v3.9.1）**: `assets/geo-crab-shell.webp`/`_n`/`_e`（殻・1180×470）、`assets/crab-leg-merus.webp`（1614×287, **承認 d0.62・バイト維持**）、`assets/crab-leg-fore.webp`（1739×240, **v3.9.1 で merus 意匠へ再生成**）、`assets/crab-leg-claw.webp`（360×344, **v3.9.1 で再生成**）、`assets/crab-leg-parts.json`（寸法・ピボット）。生成: `tools/bake_geo_crab*.py`＋`tools/bake_merus_v2.py`（殻・脚の Blender 焼き／上腕 仮絵）、`tools/comfy_gen.py`（img2img: 上腕 seed20261125 d0.62 / 前腕 0.32 / 爪 0.38）＋`keyer.py`（緑キー・despill）。
- **キャッシュ・版管理**: `sw-assets.js`（`version: 'v19'`, `gameVersion: '3.9.3'`, 全 159 ファイル登録）、`package.json`（`3.9.3`）。
- **礫鎧ガニ アセット（v3.9.2）**: `assets/gravel-crab-{a,b,c}-{carapace,clawNear,clawFar,legs}.webp`（12）＋ `assets/gravel-crab-parts.json`。寸法・体原点・ピボットは `js/gravel-crab-parts.js`（`tools/split_gravel_crab_abc.py --emit-js` の自動生成）に同梱。
- **テスト**: `cabin-panels`(5) + `depth-math`(6) + `intro`(24) + `world-biomes`(4) + `pose-debris`(14) + `hermit-b`(7) + `hermit-b-ingame`(11) + `assets`(4) + `anemone`(6) + `geo-crab`(8) + **`gravel-crab`(17)** ＝ **計 117 件**（全通過。`hermit-b-ingame` の 1 件は既知の並列フレークで、単体実行では通過）。

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

1. **（Hermes）礫鎧ガニ A/B/C の判断待ち**: 隔離候補のまま（未 push）。ユーザーの目視でどれを本編の敵にするか（または全部／別種へ）を決める。脚の分離が粗い B/C は同モデルでの脚の補完生成、深い区間での視認性は照明とのバランス調整が次の作業。
2. **（Hermes）巨蟹 前脚 前腕(fore)・爪(claw) の材質リペイント**: 上腕(merus) は承認済み d0.62 で高密度マット甲殻になったが、前腕は平滑な明灰プレースホルダ、爪は平滑な暗色のまま。`ART_STYLE_GUIDE` / `art_reference_sheet.webp` を基準に、`tools/bake_merus_v2.py`＋`tools/comfy_gen.py`（seed 20261125, denoise 掃引）と同じパイプラインで前腕・爪を再生成し、同縮尺・同条件で比較する。
3. **（Hermes）新バイオーム向け敵の拡充**: 狭洞窟（待ち伏せ型）・熱水帯（耐熱型）・合流広間（海草回り込み型／放電クラゲ型）。巨蟹の 1 遭遇配置を雛形にする。
4. **（Antigravity）Depth Stacking Phase 2 最適化＆次層（マントル領域）準備**: インスタンシング（~95–100 DC → 40 DC 以下）、巨大生物通過時のゴッドレイ強調、マントル領域の設計・試作。
5. **（Gemini 連携）深棚〜分岐ルート到達時の ponco MarkII / エリー探索会話・環境ログ**。

---

## 6. 動作確認・テスト手順

```powershell
# 単体テスト（コミット前必須）
node --test abyss-depth-lab/tests/*.test.mjs

# ローカル配信（ルートからハブ確認）または公開サイトで確認
```

- 巨蟹の確認（実ブラウザ横持ち 874×402 DPR2・タッチ・**Depth ON**）: ハブで `ABYSS DIVE` カードを実タップ→導入スキップ→タイトル実タップ→`window.__abyss.G.bossKills=1` で深部開放→`window.__abyss.G.player` を合流広間（`trench().sites.confluenceHall.x`, 深床 `deepFloorY`）へ移動→接近で 1 体出現。射撃は**画面右 1/3 の実タップ**。装甲は `window.__abyss.applyInitialLoadout()`／`applyMaxLoadout()` と `loadout()` で同条件比較できる。
- 検証手順の詳細例は `docs/WORK_REPORT.md` の v3.9.0 項。実機（スマホ実ハード）の FPS・発熱は未確認。ヘッドレス Chromium の結果と混同しないこと。
