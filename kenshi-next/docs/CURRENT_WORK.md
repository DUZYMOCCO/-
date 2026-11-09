# 現在地（kenshi-next）— 他のセッションはまずこれを読む

最終更新: 2026-11-08（筋肉探偵の基盤を実装済み）

- **方針（2026-11-07、本人決定）**: これからは **筋肉探偵** を主戦場にする。最終的には UE で綺麗な環境を
  目指すが、当面は **kenshi-next の地盤でウェブ版の実装とテストプレイ** を進める。
  本人（カニ）は 11/7 に grokbot から Hermes へ移行を表明した。このセッション（Hermes / phone）が指揮を取り、
  担当ごとにセッションを分ける。詳細は [WORK_REPORT.md](WORK_REPORT.md) の 2026-11-07 の節を見よ。
- **manny の rig を取り込んだ**（step 1）。bone は doll と同一（65骨・同名・同順）を確認済みでリターゲット不要。
  UE 移行を見据え、Manny 骨格（UE 標準）のキャラで作る方針（Quaternius だと移行時に全アニメを移し替える手間）。
  - 歩行 `walk_manny_male.json`（BEST_walk_v1_iter02 の Walk を pack 形式に変換。dolls.js で読む）
  - 体メッシュ `doll_manny.glb`（manny の体＋doll の基本アニメ8種。同一骨格なので既存アニメがそのまま当たる）
  - `sw-assets.js` は v14 / **0.10.2**。詳しくは [WORK_REPORT.md](WORK_REPORT.md) の 2026-11-07 の節。
- 新技 **パイルドライバー**（`pile_driver`、lv150、pair 投げ）を追加済み。クリップは `Pile Driver A`（攻め）/`Pile Driver B`（受け）で男女両 pack に追加（`martial2_*.json` 12→14本）。脳天砕き（Hell Slammer A/B）はそのまま。**モーションは暫定**（人形リグへの手続き生成。MetaHuman 由来の FBX 待ち）。詳細・残課題は `D:\codex_ground\piledriver\report_ja.md`。`sw-assets.js` は v12 / 0.10.0（当時）。
- 被弾 pack を男女各25本追加し、武器被弾を方向・部位に応じて選択。既存格闘と KO の扱いは維持。テスト・実機確認は未実施。詳細は `D:\codex_ground\hitreact2\report_ja.md`。

- **何をしたかの記録**: [WORK_REPORT.md](WORK_REPORT.md)
- **仕様の下調べ・Kenshi との突き合わせ**: [`../research/`](../research/)

---

## 1. これは何か

Kenshi 風の 3D サバイバル（砂漠・町・部隊・戦闘・怪我・交易）。`kenshi-proto` の後継。
遊ぶ端末は **iPhone（縦・横）**。three.js の WebGL ＋ DOM の HUD。Canvas 2D は使っていない。

- 規模: `js/` 221ファイル・約 5.9万行（`js/vendor/` を除く）
- 入口: `index.html` → `js/main.js`（起動・ループ・URL引数・`window.__game`）
- 層の分け方: `js/sim/`（ルール・DOM/Three 非依存）／ `js/render/`（描画）／ `js/ui/`（HUD・画面）／ `js/data/`（表データ）

### 公開・登録の状態

| 項目 | 状態 |
|---|---|
| ハブ（スタジオ本体）への登録 | **あり**。`id: 'kenshi-next'`、`section: 'sandbox'`、カード名「砂の果て」 |
| 旧作 `kenshi-proto` | **ハブから外して、フォルダも削除した**（2026-11-04）。`sw.js` の `RETIRED_GAME_IDS` に名前だけ残してある（端末の古いキャッシュを消す役目。**消さないこと**） |
| `sw-assets.js` | **ある**。`version: 'v40'` / `gameVersion: '0.22.0'` |
| `index.html` の robots | `noindex, nofollow`（工房全体が noindex なので合わせている） |
| GitHub Pages | `main` をそのまま配信 |

**更新の反映のしかた**: `sw-assets.js` の `version`（`v1` → `v2`）と `gameVersion` を上げる。
SW の `refresh-games` / `purgeStale` がそのゲームのキャッシュだけを作り直す。
**内部の `?v=` は使っていない**（`index.html` も `js/index.js` も `?v=` なしで読み、SW が
`?v=` の無いリクエストを `cache: 'no-cache'` で再検証する）。だから AGENTS.md §2 の
手順2（モジュール内の `?v=` を上げる）はこのゲームには要らない。

**更新のたびに必ず `version` と `gameVersion` を上げる**（AGENTS.md §2）。規模で選ぶ:

| 規模 | `gameVersion` | 例 |
|---|---|---|
| 不具合修正・見た目の微調整・文言 | パッチ | `0.1.0` → `0.1.1` |
| 機能追加・仕様変更・バランス調整 | マイナー | `0.1.1` → `0.2.0` |
| 大きく作り替えた・区切りがついた | メジャー | `0.2.0` → `1.0.0` |

`version` はキャッシュ用の連番なので、規模に関係なく**毎回**上げる（`v1` → `v2` → `v3`）。

- ハブ: **https://duzymocco.github.io/-/**（「オープンワールド（3D試作）」の欄に並ぶ）
- 直リンク: **https://duzymocco.github.io/-/kenshi-next/**

ハブから押すと `js/index.js` が単独ページ `../index.html` へ移る（kenshi-proto と同じ形。コンテナには載らない）。
**戻るはブラウザの戻る**になるので、工房へ戻るボタンが要るなら `index.html` に足す。

---

## 2. 動かす

### ローカル

リポジトリの**ルート**から配信する（`file://` は不可。モジュールもアセットもルート相対）。

```bash
python common/tools/serve.py      # または common/tools/start.bat
# → /kenshi-next/index.html を開く
```

起動は重い（アセットが数十MB）。**`window.__ready === true` になるまで待つ**（固定 sleep は不可）。

### URLパラメータ（検証では必ず世界を固定する）

| パラメータ | 意味 |
|---|---|
| `seed=N` | 世界の乱数種（既定 `12345`） |
| `speed=0\|1\|2\|3\|5` | 時間の進み。`0` で停止 |
| `spawn=0` / `spawn=debug` / `spawnrate=N` | ランダム出現。検証では `spawn=0` にする |
| `town=0` | 町（小屋・鍵・盗み・法）を切る |
| `skip=N` | 起動時に N tick 進める |
| `female=0` | 女性の人形を出さない |
| `xbow=0\|1` | 仲間のクロスボウ初期装備を固定 |
| `load=auto` | 自動セーブから再開 |
| `cam=x,z,dist` | 初期カメラ |
| `showcase=gear` | 装備カタログ表示（`js/render/gear_showcase.js`） |

### ページ内の取っ手

`window.__game` = `main.js` の `gameApi`。

- `.state` — sim の全状態（`state.actors` / `state.tick` / `state.town` …）
- `.cam(x, z, dist, yawDeg, pitchDeg, lift)` — カメラを置く
- `.dolls` — **Map ではない**。`getDoll(id)` / `animations` / `countKinds()` を持つ API。
  `[...dolls.values()]` は**例外になる**
- そのほか `forceSquad` / `forceSite` / `openInventory` / `previewBlock` などの強制デモ

---

## 3. できていること

- **世界**: 起伏のある地形、急斜面は歩けず峠道だけ越えられる、山は岩の色、昼夜と明るさ（`terrain.js` / `lights.js`）
- **町**: 建物と戸口・階（室内の床・屋根・階段）、鍵と錠前破り、盗みと盗品マーク、目撃と賞金、逮捕・牢屋・保釈金・脱獄（`town.js` / `locks.js` / `law.js` / `jail.js` / `stolen_goods.js`）
- **店と経済**: 売買・相場・スプレッド、闇市、店主の力量、町が食料を買って補充する経済（`shops.js` / `gear_trade.js` / `trade.js`）
- **部隊**: 命令（移動・あさる・手当て・縄ほどき・担ぐ・追従・持ち場固守）、隊列と隊形、自立行動と命令の優先、会話（分岐・噂・セリフ）（`orders.js` / `squads.js` / `ui/squad_panel.js` / `dialogue*.js` / `narrative_text.js`）
- **戦闘**: 武器種ごとの間合いと重さ、攻撃枠と「輪になって待つ」＋角度の割り当て、巻き込み攻撃、格闘と剣の技（`js/data/sword_moves.js` は7000行超）、クロスボウ・投擲、罠、隠密・暗殺・隠密射撃（`combat.js` / `melee.js` / `cleave.js` / `surround.js` / `martial.js` / `sword.js` / `crossbow.js` / `traps.js` / `stealth.js`）
- **体**: 部位ごとの体力、出血、気絶（KO）とラグドール、手足の欠損と義足、手当てと救急箱、休息と寝袋（`body.js` / `body_fluid.js` / `medkit.js` / `rest.js` / `ko_collapse.js`）
- **持ち物**: 重量と荷重（速度に効く）、装備スロット、グリッド表示、長押しドラッグ、全品アイコン（`inventory.js` / `ui/inventory.js` / `ui/loot.js`）
- **拠点**: 建築（素材運び・大工）、アウトポスト、料理（`build.js` / `outposts.js` / `cooking.js`）
- **生き物**: 獣（四足の手続きモデル）・巨人・古代の暴走機械（`beasts.js` / `giants.js` / `machines.js`）
- **描画**: glb の人形（男/女）と手続きフォールバック、防具の見た目、血糊の飛沫、ダメージ数字、吹き出し会話（`dolls.js` / `armor_look.js` / `blood.js` / `dmg_numbers.js` / `ui/bubbles.js`）
- **manny 体（筋肉探偵の地盤）**: manny の骨格は doll と同一（65骨）を確認済み。歩行 `walk_manny_male.json` と体メッシュ `doll_manny.glb`（manny の体＋doll の基本アニメ8種）を kenshi-next に取り込み済み（dolls.js が読む）。既存キャラの見た目は変えない。筋肉探偵のキャラは manny 体で作る方針
- **パンプアップ・シティの交通と床の硬さ（v0.21.0）**: 車は表通りの2レーンを回り、高架列車が店先の上を走る。通行人は歩道・横断歩道の固定ルートを歩き、車に当たると負傷・転倒・「撥ねられた」イベントが発生する。`?city=0` で停止、`?match=1&city=1` で試合でも交通を入れられる（既定は試合を孤立させる）。

  床の硬さは `js/world/pumpu_city.js` の `PUMPU_FLOOR_ZONES` で定義した。店先広場・歩道・路地＝硬い（1.2〜1.35）、表通り＝アスファルト（1.15）、公園の芝＝柔らかい（0.55）。投げペアの着地ダメージはこの係数で変わる。`js/sim/traffic.js` が車／列車／通行人更新、`tests/traffic.test.mjs` が床硬さと車の事故を検証する
- **パンプアップ・シティの環境（v0.20.0）**: 
  `D:/MuscleDetective/リファレンス倉庫/パンプアップシティ外観.mp4` と `viz/town-block` の寸法を合わせた地盤。通りの南側に質屋／雑貨／カラオケ／ゲームセンター／洗濯店／バー／東マートを配置し、中心奥に市庁舎とコブラ会ビル、南に第1・第2貨物倉庫／荷捌き場／港湾事務所を置いた。`js/world/pumpu_city.js` が作者配置、`js/render/pumpu_city.js` が車道・横断歩道・庇・電柱・電線・西公園・水面・桟橋・クレーン・船・コンテナ・駐車・看板を描く。通り寸法は車道9.0m／店先歩道4.7m／向かいの歩道3.45m／戦闘範囲8×6.5m。リグやモーションには触らない。 Codex 側のリグ作業と並行できよう、名称・役割付きの配置データを `js/world/pumpu_city.js` に置いた。**v0.20.1 で現代アメリカ風の外観に寄せた**: 建物はコンクリート／ガラス／メタル／レンガ色へ寄せ、既存の町箱ではなく `pumpu` 種類で描く。店先にはガラス帯、屋上設備、駐車枠、消火栓、ゴミ箱、バス停風ポール、コンクリート基盤を追加した。`?match=1` の開始時刻は参考外観の夕暮れ（18:00）に合わせた
- **パワーボム（合格版 clutch_fold_v1, v0.22.0）**: `D:/MuscleDetective/runs/powerbomb_sol/approved/clutch_fold_v1/Powerbomb_A.glb` / `Powerbomb_B.glb` を int16 pack 経由で `assets/anims/martial2_male.json` に統合した（各 195 トラック、3.7s）。Duration=3.7s、grabTime=0.8s、impactTime=2.5667s。`U` キー（スマホは「パワーボム」ボタン）で発動。パイルドライバー J とは別技。出典は Blender 手続き生成ではなく、承認された生成素材の再利用である旨を `sourceFolder: 'powerbomb_clutch_fold_v1'` で記録した
- **筋肉探偵の直接操作基盤（v0.17.0）**: `?match=1` のタンクは WASD/方向キー（Shift でダッシュ）で直接動く。タップや目的地命令による自動歩行・自動交戦は使わない。技は J（組技）/ K（打撃）/ L（関節技）で、その場の距離内のときだけ発動する。スマホ用は左スティックと技ボタン（`ui/muscle_controls.js`）。ボビーは AI のまま寄る。技カテゴリは『闘魂烈伝』準拠の3すくみ（関節 > 打撃 > 組 > 関節）で、現在のモーションが勝てる側の攻撃は自動ブロックされる
- **パイルドライバー iteration 11（v0.19.0）**: 掴み開始→逆さ吊り保持→駆動→着地→復帰の間を増やした **参考映像に合わせた Blender キーフレーム再現（実モーションキャプチャではない）**。胴体と頭は保持・駆動・着地で地面と垂直を保ち、接触後は脚が伸びたまま足先を地面向きにする。実機の見た目の良し悪しは本人確認待ち
- **脚の可動域を定めた（v0.19.1→v0.19.5）**: 股関節は屈曲 0〜120°・伸展 0〜20°、膝は屈曲 0〜130°とし、生成側で `leg()` として正規化する。逆向きの太腿伸展／膝過伸展を防ぐため、攻め手の脚と受け手の俯せ姿勢を修正した。**胴体と頭は保持・駆動・着地で地面と垂直を保ち、接触後も胴体は垂直のまま脚だけが地面へ下がって伸ばしたまま足先を地面向きにした**。接触時は関節可動域を15%まで許容する
- **筋肉探偵の試合はタンクとボビーだけ（v0.18.2）**: `?match=1` では衛兵・盗賊・獣隊、仲間、通常町の出現と settlement NPC を止める。パンプアップ・シティの建物だけを残し、関係ない NPC が割り込まない。倒れた相手には打撃が通り、組技・関節技は受け手が起き上がるまで最大60 tick保持される
- **筋肉探偵の無限体力（v0.18.0）**: `?match=1` のタンク・ナックル・ボビーは `muscleInfinite` で、部位HP・出血・気絶蓄積が増えない。投げの転倒や回復は通常どおり動くため、KO で観察が切れなくなる
- **3すくみ（筋肉探偵）**: 組技＝パイルドライバー等、打撃＝MA 技、関節技＝十字固め・キムラロック（Blender 生成。受け手は「くの字」の膝折りを優先）
- **音（BGM）**: 12曲。夜・町の中などの状況で切り替え、曲の間は環境音（`js/audio/bgm_player.js` / `assets/music/`。作り直すのは `tools/generate_piano_music.py`）
- **天候**: 日ごとに決まる（乱数種と日から決まるので同じ日は同じ天気）。`?weather=rain` などで固定できる（`render/weather.js` / `weatherForDay`）
- **死んだフリ**: 意識のある仲間が倒れて動かずにいる（`sim/playing_dead.js`）。這って移動でき、味方の手当てもでき、出血と傷の治りは半分になる。見つかって動くと撃たれる
- **スマホ縦のページ送り**: 縦持ちのとき、持ち物・あさる画面などを1ページずつ送る（`ui/mobile_pages.js`）
- **近くの人のクイック操作**: 目の前の相手をその場で操作する導線（`ui/quick_nearby.js`）
- **気絶の倒れ方**: 意識を失った者（気絶・死亡）はラグドールで倒れる。`sim/body.js` が気絶した者に
  入れる `maDownClip = 'Knocked Out'` を、人形側（`render/dolls.js` の `KO_CLIP`）は
  「専用クリップ無し」として扱い、台本付きの倒れクリップを再生しない（再生するとラグドールが見えなくなる）。
  意識のある転倒（`knocked`）と投げの受け身中（`martialRecovery`）はラグドールにしない。
  **ラグドールが居る時は root を寝かせない**（二重に回って脚が上を向く）。倒れ終わりの姿勢は
  全員 Fall の最終フレームに揃うので、**手足だけ人ごとに ±23° ずらす**（`ko_collapse.js` の `scatterLimbs`）
- **間合い（囲み）**: 待ち輪は**命令で狙っている者にも効く**（`ai.js` の `canSurroundWait`）。
  近接の枠（同時に斬れる数）が埋まっていたら、間合いの外の者は輪で待つ。命令は外さないので枠が空けば入る
- **投げた後の追撃**: 攻撃命令も、意識のある転倒（`knocked`）には追撃できる（`commands.js`。ai.js / combat.js と同じ決まり）
- **担ぎ**: 担ぐのは**プレイヤーが `pickup` 命令を出した時だけ**。命令なしで仲間が倒れた味方を担ぎに行く
  自動の担ぎは 2026-11-05 に外した（`sim/carry.js` の `updateCompanionCarry`）。担いだ相手を下ろした瞬間に、
  意識がなければラグドール・あれば通常の倒れを始める（担ぎ中は「倒れ始め」を忘れる）
- **体の窓（HUD の体力）**: 折り畳み（「体の詳細」ボタン）は無しで常に表示。赤は**出血している部位だけ**で、
  最大値が下がった分（休めば戻る傷）は赤や斜線で描かず**バーが短くなる**形で見せる。右端の数字は**現在値だけ**

## 4. 未実装・既知の課題

コードに残っている印（`TODO` / `未実装`）:

- ~~歩き／走りの切り替えボタン~~（2026-11-07 本人指示で不要と判断。いま自分の部隊は**いつも走る**（`js/sim/ai.js`）。担ぎ・忍び足は `stepToward` 側の決まりのまま）
- 部隊AI設定のスタブ5つ。UI には「未実装」バッジが出る（`js/sim/squads.js:9-14`）
  `storeItemsAuto` / `restInBed` / `sitWhenIdle` / `shareFood` / `feedAnimals`
- 獣の食べ方の `execute` / `skinner` は未実装（`js/sim/data.js:206`）
- **仲間が敵に密着して殺到する件は、対策が入っている**。`js/sim/surround.js`（コミット `351e9e5e`）に
  待ち輪（`SURROUND.ringGap = 3.0`）・角度の割り当て（`assignedWaitAngle`）・入るまでの間（`joinDelayMin/Max`）・
  射手を近接枠から外す（`meleeSlotHolders` が `rangedForTarget` を除外）・大型獣の追加枠（`attackSlotsFor`）が入った。
  **ただし [`../research/kenshi_surround.md`](../research/kenshi_surround.md) の §3・§4 はコードの参照先が古い**
  （定数は `ai.js` から `surround.js` の `SURROUND` へ移った）。実測での見直しは未実施
- ハブ未登録・`sw-assets.js` 無し（→ 2026-11-04 に解消。§1 参照）
- `tests/` の2件は 2026-11-04 にコミット済み
- **`research/kenshi_surround.md` §3・§4 のコード参照が古い**（定数は `ai.js` から `surround.js` の `SURROUND` へ移った）。実測での見直しは未実施
- **格闘の段位技は 11 個**（Lv150 に「脳天砕き」＝頭から叩きつける大技を追加。受けの弾みは `dolls.js` の `SLAM_BOUNCE`、`martial_pair.js` の `impactTick` が元）
- **倒れた相手の扱い**: 意識を失った相手は、命令で狙っていても追わない（すぐ死ぬため。v0.8.0 で v0.6.0 の逆をやった）。
  投げで転んだだけの相手（`knocked`＝意識あり）には今までどおり追撃できる。
  命令が無ければ従来どおり、意識を失った相手は斬らず狙いも外す（`DOWNED_HARM.attack=false` はそのまま）
- **投げで死んだ死体**: クリップの pack metadata に `endPose` が無いと、人形を作り直した時にTポーズになる（v0.8.0 で Hell Slammer に付与）。
- **歩いている相手への暗殺**: 相手の 1tick の移動から 0.3 秒先を狙い、回り込みの境目は 110→130度の幅、歩く相手へは 1.9m/秒で寄る（v0.8.0）
- **壁の角での「行って戻って」（ガクガク）は残っている**。2026-11-05 に
  `MIN_STEP`（1.2cm 未満の候補を採らない）・押し合いの壁チェック・経路を諦めたら止まる、を入れて
  減らしたが、角を回り込む時に候補の向きが毎tick入れ替わる動きは未着手
  （反転を検出して止める案は、ドアや家の出口の正しい動きまで止めてしまうので不採用）
- `css/inventory.css` に文字化けしたコメントが1行ある（`/* ??????????????????? */`）。main に元から入っている。直すなら1行

## 5. 検証のやり方

**コミット前に必ず実行する。**

```bash
# リポジトリのルートから
node --test kenshi-next/tests/*.test.mjs
```

sim の純粋ロジックはこれで回る。**描画・アニメ・速さの検証はテストが無いので無理**なので、
ヘッドレスブラウザで測る（手順は `browser-game-verification` スキルと
`templates/game-verify-harness.mjs` を参照）。

**全件はハーネスで回す**（`$SK/scripts/run_tests.sh`、約2分・1116件）。

- **baseline（`D:\codex_ground\kenshi_live\baseline_failures.txt`）は 2026-11-03 のままで古い**。
  HEAD 単体でも 36 件が baseline 外で落ちる（UI スモーク系は振れやすい）。
  なので実際の判定は **HEAD と作業ツリーの失敗一覧の比較**にする:
  `git stash push -q -- kenshi-next/` → `run_tests.sh` → `cp run_fail_names.txt fail_head.txt` →
  `git stash pop` → `run_tests.sh` → `comm -13 fail_head.txt run_fail_names.txt` が **0 件**なら OK
- 意図して仕様を変える時は `baseline_failures.txt` に**理由を書いて**足す
  （2026-11-05: 「相棒は敵がいなければ倒れた仲間を担ぐ」＝命令なしの自動の担ぎをやめたため）

要点だけ:

- リポジトリの**ルート**を HTTP で配信する（`iron-squad/tools/qa-server.mjs` は `process.cwd()` を使うので、ルートで node を起動する）
- Playwright はこのリポジトリの依存ではない。`C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs` から `require` する
- コンテキストは `serviceWorkers: 'block'` で作る（古い Service Worker が古いコードを配ると測定が前のビルドを説明してしまう）
- **`?seed=N&speed=1&spawn=0&town=0` で世界を固定する**
- sim を見るなら `?speed=0` ＋ `await import('/kenshi-next/js/sim/index.js')` で `step(state)` を回す（完全に決定的）
- **描画を見るなら `speed=1` の実時間で走らせる**。`speed=0` だと描画側が毎フレーム前tickの位置を取り直すので、移動量から出した値が 0 になる
- 平均速度だけで判断しない。断続的に動く人や、当たり判定・押し合い・詰まり復帰で動かされた分が混ざる。
  **同じ1人を連続で動かす**か、**同じ人を条件を変えて前後で比べる**（比なら混入が消える）
- `setEffectiveTimeScale(v)` は `action.timeScale` に代入する。`getEffectiveTimeScale()` は親の `mixer.timeScale` を掛けた値なので、式と一致しない

## 6. 次にやること

**主戦場は筋肉探偵**（2026-11-07 本人決定）。kenshi-next の地盤でウェブ版の実装とテストプレイを進める。
最終的には UE で綺麗な環境を目指す（Manny 骨格は UE 標準なのでキャラ資産はそのまま移る）。

筋肉探偵の進み具合:
1. **キャラの体格（manny の rig 取り込み）** ✅ done。manny_walk（歩行）と doll_manny.glb（体メッシュ）を kenshi-next に取り込み済み。骨格は doll と同一（65骨）を確認済み。doll に manny 体を選べるようにした（v0.10.1 / v0.10.2 / v0.11.1）
2. **町を立てる（パンプアップ・シティ）** ✅ done。viz/town-block のレイアウト・寸法を作者配置で再現（v0.11.0）。参考外観動画と台本に合わせて、南の店先帯・市庁舎・コブラ会ビル・港の荷役帯・西公園・看板・電柱を拡張し、リグ／モーションと分離できる配置データにした（v0.20.0）。現代アメリカ風外観に寄せ（v0.20.1）、車・列車・通行人・床の硬さを入れた（v0.21.0）。原典は触らない
3. **試合の型を作る** ✅ done。タンク vs ナックル・ボビーを店先広場で1対1プロレス（v0.13.0）。パイルドライバーのモーションを作り直し（v0.13.1）。投げ技をレベルに関係なく出るようにした（v0.14.0）。フリーズ・Tポーズ・duration 欠落を修正（v0.14.2/v0.14.3/v0.15.1）。関節技（十字固め・キムラロック）を追加し3すくみを揃えた（v0.16.0）。合格版パワーボム（clutch_fold_v1）を U キーで追加した（v0.22.0）
4. **基盤を作り替えた** ✅ done。『闘魂烈伝3』をリファレンスとして、タンクを直接操作（WASD/方向キー・スティック）にし、目的地への自動歩行と自動交戦を外した（v0.17.0）。技は J 組技 / K 打撃 / L 関節技 で、範囲内のみ発動。3すくみ（関節 > 打撃 > 組 > 関節）の自動ブロックを持たせた
5. **テストプレイ** — ハブに載せて実際に触れる（?match=1 で試合が立つ）。見た目の良し悪しの判断は本人の目で
6. 次の段: ツームストン・パイルドライバー、水際の歩行可否／転落、物語の進行（10試合・尋問分岐）

残りの候補（kenshi-next 側）:
1. 歩きの実機確認（iPhone）。残っていれば場面を切り分ける（荷物満載で歩く／曲がる／人の間を抜ける）
2. 囲みの実測見直し。`js/sim/surround.js` の対策が効いているかを、仲間6人 対 敵1人で測る
   （待つ人どうしの距離／待つ人と敵の距離／射手が近づきすぎないか）。数値の案は
   [`../research/kenshi_surround.md`](../research/kenshi_surround.md) §4 にあるが、**コードの参照先は古い**
4. 部隊AI設定のスタブ5つ
5. 工房へ戻るボタンを `index.html` に足す（いまはブラウザの戻るだけ）
6. `sw-assets.js` の `files` を見直す（起動に要るもの＋BGM を載せてある。オフラインで最初から遊ばせたい物があれば足す。**返りは約35MB を fetch 時にキャッシュする**）
7. 体の窓の「血」バーの赤（失った血の分）をどうするか佳之さんに確認する。部位は「赤＝出血中だけ」にしたが、
   血のバーは失った血を赤で見せたままにしている
8. 暗殺の到達を実機で確認する（歩いている相手に追いつけるよう、寄る時だけ通常の歩き速度にした。
   背後を取れないまま2秒隣に付けたら押さえ込んで実行する。`tests/assassination-approach.test.mjs` は4件通過）
9. 受け率（`blockBase: 70`）／戦闘のテンポ — 2026-11-07 に受けの予告を入れた（振りかぶり全体で構える）。
   ノーダメージが多い感じが残るなら次はここ。`js/sim/melee.js` の `KENSHI.blockBase`

## 7. 触る時の注意

- **編集するのは `kenshi-next/` の中だけ**。ルートの `sw.js` / `index.html` / `common/` は
  「ハブ登録（新規ゲーム追加）」のときだけ（AGENTS.md §1・§5）。kenshi-next は登録済みなので、
  更新でこれらを触る必要は無い（版を上げるのは `sw-assets.js` だけで完結する）
- ファイルを増減したら `kenshi-next/sw-assets.js` の `files` を直す（起動に要るものだけ載せている）
- `git add -A` / `git add .` は禁止。**パスを明示してステージする**
  （このリポジトリは複数のAIセッションが別ゲームを並行で触っている）
- `js/sim/` は DOM も Three も触らない。描画の都合を sim に入れない
- 1tick = 0.1 秒（`js/sim/data.js` の `TICK_SEC`）。sim は **10Hz**、描画は 60fps。
  位置は `render/dolls.js` の `placeDoll` が `alpha` で補間するので、位置のカクつきは出ない
- `movedThisTick` は **`updateStealth` が tick の頭で false に戻す**（`step.js` では `updateStealth` → `updateAI` → `moveActors` の順）。
  各システムが読む時点で「今回動いたか」なのか「前回動いたか」なのかを、必ず `step.js` の順番から確かめる
