# v0.3.0 / v7 アート確認（公開前）

最終候補は **`art-review/raster/`**。`before/` は元のv0.2.1、`after/` と `after-native/` は最初のSVG案で、現行の採用候補ではない。

依頼書のSVG・小さなサイズ上限に対し、ユーザーから「もう少しアートに近づけて。元のはあくまでもたたき台」「大きさの定義にこだわらなくてもいい」「近づけたとき綺麗じゃないと萎える」と追加指示があった。そのため、最終候補では設定画に基づく画像を採用し、表示サイズと解像度、ズーム上限を見直した。

## 絵と表示

- ツギハギ号：丸いリベット打ちの金属頭、2つの青いレンズ、継ぎはぎ装甲、工具と配線。
- PONCO02：FREEDOM WORKSのTier 1を基準に、白・青・赤、暗いバイザー、2つのシアンの目、短い銃。
- 異星生物：設定画の黒い装甲、琥珀色の亀裂、棘と爪を持つ生体メカ。
- 廃墟：割れたコンクリート、錆びた鉄骨、光るクラゲ植物、暗い青緑の水面。地形の色分けを維持。
- ガラクタの山・空の跡・警告色のハッチ・本陣も同じ質感に統一。
- 機体サイズは40 / 42 / 64ワールドpx。足元のアンカー0.88は維持。ズームは最大4.5倍。HPバーの厚み・隊長旗・気づき表示を拡大時に抑えた。

## 保存先と制作方法

- 配信用：`../assets/art-v2/*.webp`、11枚、合計4,216,036 bytes。
- 元の生成画像：`art-review/sources/*.png`、1254×1254。透過を維持して保管。
- 使用した組み込みツール：`image_gen`。API/CLI生成は使用していない。
- 最終生成プロンプト、参照画像、元出力との対応：[`generation-prompts.json`](art-review/generation-prompts.json)。参照はユーザー提供のスカベンジャー設定画とFREEDOM WORKS設定画。
- `tools/pack-art.mjs` は原画を変更せず、配信用に縮小・WebPへ変換する。機体768px、環境1024px。ゲーム内では機体512px、地形・大型物1024pxに一度だけ焼く。
- キー30個を維持。地形の2キーは同じ画像を共有し、4×4マスの切り出しも同じGPU画像を共有する。毎フレームの画像読み込み・焼き直しはない。

## 検証

- `node --test bot-commander/tests/*.test.mjs`：27件合格。
- `git diff --check -- bot-commander`：正常。
- `git diff --exit-code -- bot-commander/js/sim`：差分なし。ゲームの計算・乱数・バランス・当たり判定は変更していない。共有ファイルと他ゲームも編集していない。
- 計算フォルダの完全維持を優先し、simに向くimportは既存の `?v=5` を残した。描画・入口・CSSのimportは `?v=7`。同じモジュールを異なる版で読む混在は構造テストで確認済み。
- Chromeの新規プロファイル、390×844、DPR2、タッチ設定でハブから起動。402×874も補助確認。端末実機サイズの再現と同義ではない。
- 30キーの読み込み、SVG文法・ID、画像サイズ、足元、通常倍率・引き・4倍ズームを確認。外部画像への依存はなく、配信用画像はゲームキャッシュへ登録。
- 最終の操作結果は [`mission-v7/mission-checks.json`](art-review/raster/mission-v7/mission-checks.json)。実タップによる命令、回収と掘り出し物、追跡、再試行、ハブ復帰、v7のキャッシュとオフライン再起動を確認。
- 勝敗画面は、スクリーンショット用に資材を目標値へ設定／味方HPを0に設定して表示を確認したもの。自然プレイによるクリア検証ではない。テスト用の新規ブラウザ内だけで実施。
- 速度の詳細は [`art-checks.json`](art-review/raster/art-checks.json)。RTX 2070 SUPER / Chrome WebGLで約60fps、フレーム時間p95約16.8ms。キャッシュされた画像のテクスチャ生成は7回の中央値約5.3ms。通信を含む初回起動時間ではない。元SVG案の約2.4msより増加したが、定常描画では約60fpsを維持した。
- **iPhone 17実機・iOS Safariでの画質、発熱、メモリ、フレームレートは未確認。**

## 確認画面

- [通常倍率](art-review/raster/start-zoom-1.png)
- [ツギハギ号・本陣、4倍](art-review/raster/start-zoom-4.png)
- [PONCO02、4倍](art-review/raster/ponco-zoom-4.png)
- [ハッチ、3倍](art-review/raster/hatch-zoom-3.png)
- [異星生物へ接近](art-review/raster/mission-v7/v030_03b_chase_close.png)
- [アート一覧](art-review/raster/art-sheet.png)

コミット・push・公開は未実施。ユーザーの見た目の確認後に公開する。
