# 🤖 ロボットコマンダー（仮）

> 「スマホゲーム工房」で遊べるゲームの1つ（試作 v0.1.0 / ゲームキャッシュ v1）。起動方法・サーバー・ホーム画面追加はスタジオ側の [../README.md](../README.md) を参照。
> SFC『バトルコマンダー』に着想を得た、スマホ縦持ちのリアルタイム部隊シミュレーション。キャラ・メカはすべてオリジナルのデフォルメロボット。

## 操作
- 自軍の部隊をタップ → そのまま指でなぞる → 離すと命令（経由点は最大4、間は A* で地形を考えて進む）
- 何もない所をドラッグ＝画面の移動、2本指＝ズーム（PCはホイール）、何もない所をタップ＝選択を外す
- 上の部隊ボタンで選択＆その部隊へ移動。⏸＝一時停止（止めたまま命令できる）、1x／2x＝速さ。左下「◀ 工房」でハブへ戻る

## 構成
```
js/index.js        入口（export default { init(container, onBackToHub), prepare() }）。ループとHUD
js/sim/            ゲームの中身。DOM・Pixi を import しない（Node でそのまま動く）。1/30秒の固定ステップ、決まった種の乱数
  rng.js map.js path.js fog.js stroke.js sim.js
js/render/         描画と操作（sim の状態を読むだけ）
  art.js        手書きSVG（ダダサバイバー art.js の作風: 暗い輪郭・セル塗り・細い目）
  textures.js   SVG → Pixi テクスチャ（起動時に1回）
  renderer.js   Pixi v8 の描画（地形・本陣・機体・HPバー・経路・弾・ぼかした霧）とカメラ
  input.js      タップ・なぞり・ドラッグ・ピンチ
css/bot-commander.css   .bc-root の中だけに効くスタイル（prepare() で loadCss）
vendor/pixi-8.22.0.min.mjs   PixiJS v8.22.0（同梱。オフラインで動く）
tests/             node --test bot-commander/tests/*.test.mjs
tools/studio-shots.mjs   ハブ込みのスクショ（playwright-core＋Chrome）
```

## 版の上げ方（AGENTS.md 2章と同じ）
1. `sw-assets.js` の `version`（v1 → v2）と `gameVersion` を上げる。ファイルを増減したら `files` も直す（テストが確認する）。
2. 変更したモジュールの `?v=` を、このフォルダ内で上げる。**同じファイルはどこから読んでも同じ `?v=` にそろえる**（違うと別のモジュールとして2回読まれる。テストが確認する）。CSS の `?v=` は `js/index.js` の `prepare()`。

## 流用元
- `js/sim/path.js` … Iron Squad `js/hero-navigation.js` の差分A*（タイル＋地形コストに変更）
- `js/sim/fog.js` … Iron Squad `js/fog.js` の FogGrid（「今見えている」層を追加して2層に）
- `js/render/art.js` … ダダサバイバー `js/art.js` の作風と `shadedCircle`

## まだない物（試作）
経済・生産・兵種8種・補給・塹壕・地雷・占領・本陣の勝敗・セーブ・音。機体どうしの押し合い、兵士自身の経路探索、霧の視線（山・森でさえぎる）。iPhone 実機は未確認。
