# 背中の乗り姿（v1.0.0 Codex gfx3 R_RIDE）

- `PONCO02_{BOY,GIRL,WOLF}_{0..3}.webp`: ポンコ（PONCO02）の背中に少年・少女・狼が乗った絵。768×768、4 こま（6 こま／秒）。
  ポンコの絵（art-v2/ponco.webp）と同じ切り抜き [90,16,1126,1218]（1254 の原画で）なので、ロボの体の上にそのまま重なる（js/render/raster-art.js の rideArtSources、js/render/renderer.js の syncRiderArt）。
- 乗る席の決まり（js/sim/ride.js の RIDE_TABLE。前から同じ）: ポンコ＝背中 1、巨大ロボ＝中（操縦席）2、ツギハギ＝背中 1。人の絵を出すのは背中の席だけ（中の席は人を見せない）。
  ツギハギの背中に乗った絵はまだないので、前と同じく小さな人の絵を背中に出す。
- `ride.codex.json`: Codex の R_RIDE/back/ride.json（こまの並び。中の名前は .png のまま）。参考に置いておく。

## 使っていない物（codex_results/gfx3/R_RIDE/cockpit と R_RIDE/preview_cockpit.png にだけ置いてある）

佳之さんの決まり「操縦席は人が見える形で見せない」のため、次は使わない・ゲームの assets にも入れない。

- ALT_AMPHI_occupied（アビスポンコの操縦席に人が乗った絵）
- ALT_AMPHI_open（操縦席を開けた絵）
- cockpit.json（上の絵の設定）
- cockpit_BOY（操縦席の中の少年）
- bg_cockpit_interior（操縦席の中の背景）
- preview_cockpit（上の確かめの絵）
