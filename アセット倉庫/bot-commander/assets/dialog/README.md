# 会話の台本の書き方（v0.4.7）

会話（立ち絵＋セリフ）の中身は、コードと分けて JSON で書きます。読むのは `js/dialog/dialog-script.js`（画面を使わない計算・テストは `tests/dialog.test.mjs`）、出すのは `js/dialog/dialog-view.js`。
立ち絵の一覧（だれが・どの表情を持っているか・左右のどちらに立つか・名札）は `assets/portraits/portraits.json`（`tools/make-portraits.py` が作る）。

## 形
```json
{
  "id": "demo",
  "cast": { "NEJI": "neutral", "GIRL": "neutral" },
  "lines": [
    { "who": "NEJI", "text": "これは試しのセリフです（仮）" },
    { "who": "GIRL", "face": "smile", "text": "……（仮）" },
    { "who": "BOY", "face": "smile" },
    { "exit": "GIRL" },
    { "enter": "WOLF", "face": "neutral" }
  ]
}
```
- `cast`: 始めから出ている人と表情（`"ID": "表情"`）。左に1人・右に1人まで。
- `lines` の1行は次のどれか（上から順に流れる）。
  | 書き方 | すること |
  |---|---|
  | `{ "who", "face"?, "text" }` | セリフ。`who` は出ている人。`face` を書くと、その表情に替えてから話す（書かなければ前の表情のまま） |
  | `{ "who", "face" }` | 話さずに表情だけ替える（止まらずにすぐ次の行へ） |
  | `{ "enter", "face"? }` | 登場（`face` を書かなければ neutral）。立つ側は portraits.json の `side` で決まる。同じ側にだれかいたら、その人は下がる |
  | `{ "exit" }` | 退場 |
- 立つ側は人ごとに決まっていて、台本では選べない（左右反転しないため）。いまは 左: NEJI・BOY、右: GIRL・WOLF・PONCO02・JEMINI。
- 少年（BOY）は話さない（`speaks: false`）。セリフは `"……"` だけにする。名札は出ない。
- 表情のキーは portraits.json にあるものだけ（例: GIRL は neutral・smile・surprised・worried・angry・sad・pain・smug）。
- 誤り（いない人・ない表情・出ていない人が話す・もう出ている人がまた出る など）は `checkScript` が見つけ、`playDialog` は始める前に止まる。

## 背景（bg）
- 台本の一番上に `"bg": "hideout"` と書くと始まりの背景。どの行にも `"bg": "ruins_town"` を足せて、その行から背景が替わる。`{ "bg": "night_camp" }` だけの行は、背景を替えてタップを待たずに次へ進む。`"bg": null` で背景なし。
- 名前は 13 こ: `hideout`・`ruins_town`・`wasteland`・`junk_market`・`factory_ruins`・`night_camp`・`alien_nest`、v1.0.0 で足した `battlefield_day`（昼の戦場）・`hangar`（格納庫）・`briefing`（作戦会議）・`coast`（海岸）・`sky`（雲海）・`deepsea`（深海）（Codex gfx3。quality 82・method 6 で WebP。いつも読み込む一覧には入れない）。名前 → 絵の表は `js/dialog/dialog-bg.js`（絵は `assets/dialog/bg/*.webp`）。知らない名前は `checkScript` がまちがいとして教える。
- 絵は要る時に読む（次に出る背景は先に読み始める）。読めなければ背景なしの見た目で進む。替わる時は 0.4 秒のクロスフェード。

## 画面での動き
- 下に文字の枠（画面の高さの約22%）。枠の上に名札（話す人の側）。文字は1文字ずつ出て、途中でタップすると全部出る。全部出ていたら次へ。最後まで行くと会話が終わる。
- 話していない人は暗く（明るさ60%）・少し下がる。表情は重ねて入れ替える。登場・退場は横へすべる。
- ロボは目の光のレイヤーに、portraits.json の `eye_color`（表情ごとの色 `eye_color_by_face`）をかけて光らせる。ゆっくり明るさが揺れ、ときどきまばたき。損傷（damaged）はちらつく。off は目の光がない（目が消える）。
- 操作は右上の小さな「☰ メニュー」の中: 会話をとばす・会話にもどる（お試しでは 工房へ戻る も）。PC は Enter・スペース・→ で進む、Esc でメニュー。

## 呼び出し方
- ゲームの中から: `await game.playDialog(script)`（`js/index.js`。出ている間は一時停止し、地図のタップ・ドラッグは通らない。終わると前の一時停止の状態に戻る）。返り値は `{ skipped }`。
- 自動テスト・スクショ: `window.__botCommander.playDialog(script)`。会話が出ている間は `window.__dialog`（`tap()`・`skip()`・`state()`）。
- お試し: 入れ物の URL に `?dialogdemo=1` を付けてからゲームを選ぶ。台本は `assets/dialog/demo.json`（セリフはすべて仮）。
