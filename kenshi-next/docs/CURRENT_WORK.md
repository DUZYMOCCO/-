# 現在地（kenshi-next）— 他のセッションはまずこれを読む

最終更新: 2026-11-04（歩きの作り直しまで）

- **何をしたかの記録**: [WORK_REPORT.md](WORK_REPORT.md)
- **仕様の下調べ・Kenshi との突き合わせ**: [`../research/`](../research/)

---

## 1. これは何か

Kenshi 風の 3D サバイバル（砂漠・町・部隊・戦闘・怪我・交易）。`kenshi-proto` の後継。
遊ぶ端末は **iPhone（縦・横）**。three.js の WebGL ＋ DOM の HUD。Canvas 2D は使っていない。

- 規模: `js/` 221ファイル・約 5.9万行（`js/vendor/` を除く）
- 入口: `index.html` → `js/main.js`（起動・ループ・URL引数・`window.__game`）
- 層の分け方: `js/sim/`（ルール・DOM/Three 非依存）／ `js/render/`（描画）／ `js/ui/`（HUD・画面）／ `js/data/`（表データ）

### 公開・登録の状態（ここが他のゲームと違う）

| 項目 | 状態 |
|---|---|
| ハブ（スタジオ本体）への登録 | **なし**。`common/js/games-registry.js` と `sw.js` の `GAME_IDS` に入っているのは `kenshi-proto` だけ |
| `sw-assets.js` | **無い**。よって版番号（`version` / `gameVersion`）の管理が無く、AGENTS.md §2 の版上げ手順はまだ使えない |
| `index.html` の robots | `noindex, nofollow`（検索避け） |
| GitHub Pages | **配信されている**。`main` をそのまま配信するので、直リンクで遊べる |

公開URL（直リンク・ハブからは辿れない）:
**https://duzymocco.github.io/-/kenshi-next/**

→ **ハブに出すかどうかは未決**。出すなら AGENTS.md §5「ゲームの新規追加」の手順
（`sw-assets.js` を作る／`sw.js` の `GAME_IDS`／`games-registry.js`／`SHELL_VERSION` と
`app.js` の `?v=`）が必要で、共有ファイルを触ることになる。**勝手にやらない。ユーザーに確認する。**

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

## 4. 未実装・既知の課題

コードに残っている印（`TODO` / `未実装`）:

- **歩き／走りの切り替えボタンが無い**。いま自分の部隊は**いつも走る**（`js/sim/ai.js:1328`, `:1403`）。担ぎ・忍び足は `stepToward` 側の決まりのまま
- 部隊AI設定のスタブ5つ。UI には「未実装」バッジが出る（`js/sim/squads.js:9-14`）
  `storeItemsAuto` / `restInBed` / `sitWhenIdle` / `shareFood` / `feedAnimals`
- 獣の食べ方の `execute` / `skinner` は未実装（`js/sim/data.js:206`）
- **仲間が敵に密着して殺到する件は、対策が入っている**。`js/sim/surround.js`（コミット `351e9e5e`）に
  待ち輪（`SURROUND.ringGap = 3.0`）・角度の割り当て（`assignedWaitAngle`）・入るまでの間（`joinDelayMin/Max`）・
  射手を近接枠から外す（`meleeSlotHolders` が `rangedForTarget` を除外）・大型獣の追加枠（`attackSlotsFor`）が入った。
  **ただし [`../research/kenshi_surround.md`](../research/kenshi_surround.md) の §3・§4 はコードの参照先が古い**
  （定数は `ai.js` から `surround.js` の `SURROUND` へ移った）。実測での見直しは未実施
- ハブ未登録・`sw-assets.js` 無し（§1 参照）
- `tests/` に2件あるが**未コミットのまま**（`assassination-approach` / `treat-after-work`）。
  誰かの作業中なら触らない

## 5. 検証のやり方

**コミット前に必ず実行する。**

```bash
# リポジトリのルートから
node --test kenshi-next/tests/*.test.mjs
```

sim の純粋ロジックはこれで回る。**描画・アニメ・速さの検証はテストが無いので無理**なので、
ヘッドレスブラウザで測る（手順は `browser-game-verification` スキルと
`templates/game-verify-harness.mjs` を参照）。

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

## 6. 次にやること（候補）

1. 歩きの実機確認（iPhone）。残っていれば場面を切り分ける（荷物満載で歩く／曲がる／人の間を抜ける）
2. 囲みの実測見直し。`js/sim/surround.js` の対策が効いているかを、仲間6人 対 敵1人で測る
   （待つ人どうしの距離／待つ人と敵の距離／射手が近づきすぎないか）。数値の案は
   [`../research/kenshi_surround.md`](../research/kenshi_surround.md) §4 にあるが、**コードの参照先は古い**
3. 歩き／走りの切り替えボタン
4. 部隊AI設定のスタブ5つ
5. `tests/` の未コミット2件をコミットするか決める
6. ハブ登録するか決める（するなら `sw-assets.js` を作る）

## 7. 触る時の注意

- **編集するのは `kenshi-next/` の中だけ**。ルートの `sw.js` / `index.html` / `common/` は
  「ハブ登録（新規ゲーム追加）」のときだけ（AGENTS.md §1・§5）
- `git add -A` / `git add .` は禁止。**パスを明示してステージする**
  （このリポジトリは複数のAIセッションが別ゲームを並行で触っている）
- `js/sim/` は DOM も Three も触らない。描画の都合を sim に入れない
- 1tick = 0.1 秒（`js/sim/data.js` の `TICK_SEC`）。sim は **10Hz**、描画は 60fps。
  位置は `render/dolls.js` の `placeDoll` が `alpha` で補間するので、位置のカクつきは出ない
- `movedThisTick` は **`updateStealth` が tick の頭で false に戻す**（`step.js` では `updateStealth` → `updateAI` → `moveActors` の順）。
  各システムが読む時点で「今回動いたか」なのか「前回動いたか」なのかを、必ず `step.js` の順番から確かめる
