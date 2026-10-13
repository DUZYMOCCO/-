# ファストトラベルで本陣の部隊までついてくる不具合の修正（v6.11.1）

## 症状
地図からファストトラベルすると、隊長に同行する直属部隊だけでなく、本陣防衛圏に残っているはずの本隊（最大48名）まで行き先へ転送される。

## 原因
`js/index.js` の `fastTravelTo()`（2008行付近）が、`this.squad` のうち死亡していない全員を行き先の周りへ転送している（2027〜2037行）。

```js
// 生存部隊も隊長周囲に一斉ワープ
if (this.squad) {
  this.squad.forEach((s, idx) => {
    if (!s.dead) { ... s.x = ...; s.y = ...; }
  });
}
```

本隊は、毎フレームの移動処理（6366行付近）で `isPersonalGuard` が偽のとき本陣（遠征メンバーなら小隊の重心）へ向かう。そのため、転送された本隊は行き先から本陣まで歩いて戻ることになる。

## 直し方
1. `fastTravelTo()` の一斉転送を、**`s.isPersonalGuard === true` の兵（直属部隊）だけ**に絞る。
   - 本隊（`isPersonalGuard` が偽）、勇者パーティ（`heroPartyId` あり）、予備兵（`this.reserves` にいて、`squad` には入っていない）は動かさない。
   - 配置角の計算 `idx / this.squad.length` は、直属だけを数えた番号と人数に変える（直属が少ないときに隊長の周りへ均等に並ぶようにする）。
2. 本陣救援ワープ（`rescueWarp: true`、1515行）も同じ扱いでよい。本陣に残っている本隊はもともと本陣にいるので、動かす必要はない。
3. 紐で搬送中の負傷者は、従来どおり `syncDragged`（`js/casualty-rules.js`）が運び手に合わせて動かす。ここは変えない。
4. 加入前（`isEnlisted()` が偽、仲間5人まで）の仲間は、`js/limited-allies.js:76` で `isPersonalGuard:true` になっているので、今までどおりついてくる。念のためテストで確認する。

## テストの追加
`tests/command-navigation.test.mjs` に、次を確かめるテストを足す（既存テストの書き方に合わせる）。
- 直属1名と本隊1名がいる状態で `fastTravelTo(x, y, 'test')` を呼ぶと、
  - 直属は行き先から60px以内にいる
  - 本隊の座標は変わらない
- 加入前の仲間（`isPersonalGuard:true`）は行き先についてくる

## バージョン（CLAUDE.md §2）
- `sw-assets.js`: `version` を `v250` → `v251`、`gameVersion` を `'6.11.0'` → `'6.11.1'`
- 変更したモジュールの `?v=` を iron-squad フォルダ内で上げる
- 共有ファイル（ルートの `sw.js` `index.html`、`common/`）は触らない

## 完了条件
- `node --test iron-squad/tests/*.test.mjs` がすべて通る（書き換わった `iron-squad/docs/previews/*.png` は `git checkout iron-squad/docs/previews` で戻す）
- `docs/CURRENT_WORK.md` に v6.11.1 の変更を1〜2行で追記する
- コミットするときは `git add iron-squad/` でステージする（`git add -A` は使わない）
