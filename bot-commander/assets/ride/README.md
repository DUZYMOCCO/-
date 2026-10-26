# 背中の乗り姿（v1.0.0 Codex gfx3 R_RIDE・v1.0.1 Codex gfx4 SCAV_RIDE）

- `PONCO02_{BOY,GIRL,WOLF}_{0..3}.webp`: ポンコ（PONCO02）の背中に少年・少女・狼が乗った絵。768×768、4 こま（6 こま／秒）。
  ポンコの絵（art-v2/ponco.webp）と同じ切り抜き [90,16,1126,1218]（1254 の原画で）なので、ロボの体の上にそのまま重なる（js/render/raster-art.js の rideArtSources、js/render/renderer.js の syncRiderArt）。
- 乗る席の決まり（js/sim/ride.js の RIDE_TABLE。前から同じ）: ポンコ＝背中 1、巨大ロボ＝中（操縦席）2、ツギハギ＝背中 1。人の絵を出すのは背中の席だけ（中の席は人を見せない）。
- `SCAV_{BOY,GIRL,WOLF}_{0..3}.webp`（v1.0.1 Codex gfx4 SCAV_RIDE）: ツギハギ号（scav）の背中に少年・少女・狼が乗った絵。768×768、4 こま（6 こま／秒）。
  ツギハギ号の絵（art-v2/scavenger.webp）と同じ 768 枠・同じ切り抜き [199,51,898,1163]（1254 の原画で）なので、ツギハギ号の体の上にそのまま重なる
  （raster-art.js の rideArtSources('scav') → キーは ride_scav_<人>_<コマ>。ride-view.js の riderArtKey。ツギハギ号に乗った時に初めて読む）。
  背中の席だけ。乗る途中・降りる途中は今までどおり小さな人の絵。
- `scav-ride.codex.json`: Codex の gfx4 SCAV_RIDE の ride.json（こまの並び）。参考に置いておく。狼の 1 回目の絵は Codex 側で作り直し（使っていない）。
- `ride.codex.json`: Codex の R_RIDE/back/ride.json（こまの並び。中の名前は .png のまま）。参考に置いておく。

## 使っていない物（codex_results/gfx3/R_RIDE/cockpit と R_RIDE/preview_cockpit.png にだけ置いてある）

佳之さんの決まり「操縦席は人が見える形で見せない」のため、次は使わない・ゲームの assets にも入れない。

- ALT_AMPHI_occupied（アビスポンコの操縦席に人が乗った絵）
- ALT_AMPHI_open（操縦席を開けた絵）
- cockpit.json（上の絵の設定）
- cockpit_BOY（操縦席の中の少年）
- bg_cockpit_interior（操縦席の中の背景）
- preview_cockpit（上の確かめの絵）
