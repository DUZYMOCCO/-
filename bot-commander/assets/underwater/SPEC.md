# 水中・深海の素材仕様

## ポータル

portal/portal_dive_0.png〜_5.png、portal_exit_0.png〜_5.png。各512×512 RGBA、ななめ上から、自然な透明の縁、影なし。入口は青い水の渦と白波、出口は淡い水色の光柱と泡・砂。どちらも6コマ、8fps、loop:true、0→1→2→3→4→5→0。anchor=[0.5,0.5]、地図2×2マス。portal/portal.jsonにファイルパターンと設定。全コマを同じ中心へ登録してあるので、コマごとの中心調整や拡大率変更は不要。ゲームが付ける地面影は使わない。

地上の水面にdive、別の深海地図にexitを置く。水中は陸の高さの段ではなく別地図。ALT_AMPHIなど潜れる機体と、その密閉操縦席の人が移動できる。背中乗りの人は潜れない。

## 海底地形

全部1024×1024 RGB、真上、上下左右連続、1枚が4×4マス。斜め版は作っていない。

| 名前 | ファイル | 材料 | 通行 |
|---|---|---|---|
| ground-seabed-sand | ground/ground-seabed-sand.png | 青灰砂の波紋・小貝・小石 | 潜水機体が通る想定 |
| ground-seabed-rock | ground/ground-seabed-rock.png | 青緑の玄武岩・苔 | 潜水機体の規則はゲーム担当が決める |
| ground-seabed-kelp | ground/ground-seabed-kelp.png | 暗い海草のしげみ | 潜水機体の規則はゲーム担当が決める |
| ground-trench | ground/ground-trench.png | 底の見えない紺黒の深い谷 | 通れない |

B/bg_deepsea.pngと同じ色と材料。繰り返す時は4マス単位で原点を保ち、地面ごとにランダムな拡大率を付けない。描画時の縮小方式や地形間の境界処理はゲーム側が決める。

## 光のゆらめき（提案）

overlay/underwater-caustics.png: 1024×1024 RGBA、周期的な光の網目、発光のみ透明背景。最大alpha140、端のアルファも連続。overlay/overlay.json: blend:screen、opacity:0.5、tint:#0b2a44。先に地図全体へ濃い青のtint、次に模様をscreenで弱く重ね、ゆっくり同じ方向へ周期スクロールする案。新しい形式なのでゲームの担当が採否・濃さ・速度を決める。キャラやUIへ重ねず地面に掛ける想定。sample_mapでは地面にだけ薄く重ねた。重ねなくても4地形だけで使える。

## 確認用

preview_portal_dive.png・preview_portal_exit.png: 水/浅瀬に6コマ比較。portal_dive.gif・portal_exit.gif: 8fps見本。preview_ground.png: 各地形2×2。preview_caustics.png: 光2×2。sample_map.png: 780×1688、砂主体に岩と海草、谷1本、出口、ALT_AMPHI論理60px（2倍画面で本体約103px）。sample_surface.png: 既存水/浅瀬と入口。これらの地形配置とぼかした境界は見本用で、ゲームロジックではない。

portal_check2組・tile_check4地形と光はOK。光のアルファ境界も追加測定済み。実ゲームと実機は未確認。
