# 水中・深海の地図

- 内蔵画像生成7回: dive/exitの6コマアトラス各1回、砂/岩/海草/谷の地形各1回、光のゆらめき1回。完成用PNG17枚（ポータル12、地形4、光1）。原画はraw/、指示文はprompts/。
- 参考: ポータルはrefs/props/hatch.pngの角度と塗り、ground-water.png、今回B/bg_deepsea.png。砂はground-plain.png、岩はground-mountain.png、海草はground-forest.png、谷はground-water.pngを細かさの参考にし、全地形はBの深海背景も色と材料の参考にした。光はB深海のみ。以前の地面を青く塗り替えた物ではない。
- Bから継承: 青灰の砂と小さな貝、青緑の玄武岩と灰苔、暗い海草、紺黒の谷、弱い冷たい光。地形4種は真上から見た新規の構造として生成した。
- 仕上げ: 地形を1024 RGBへ縮小、彩度.86、明るさを砂62/岩52/海草48/谷18目標へ。生成原画の端の明るさの食い違いだけを周期成分に補正し、継ぎ目を整えた。新しい模様をプログラムで描いていない。具体値はfinish_parameters.json。
- ポータルは生成6コマを切り出し、共通.90倍で中心を登録。端の透明をなじませ、色と明るさを少し落ち着かせた。6枚はそれぞれ生成された絵で、回転だけのコピーではない。registration.jsonに配置を記録。各6コマ、8fps。
- 光は生成されたアルファの模様を使い、端を周期補正し、不要な薄い面を透明化、最大alpha140へ。白水色の発光色で保存。RGBが一定なのでtile_checkだけでは透明の継ぎ目を確認できず、追加でアルファの端差も測定した（左右0.17/上下0.12以下）。preview_caustics.pngでも目視確認。
- 迷い: 安全側の暗くくすんだ青、6コマ8fps。ななめ地形版は省略。光は新しい重ね方の提案で、ゲーム担当が採否を決める。
- 目視: 地面2×2で大きな継ぎ目の線なし。砂・岩・海草が同じ材料に見え、谷は暗く区別できる。入口は暗い水の渦、出口は上向き光と泡。自然な透明の縁と6コマの位置を確認。sample_mapは780×1688、出口128px・水陸機体約103px（論理60px相当）で比較。光の重ね方は見本用。実ゲーム・実機は未確認。
- 深海は陸の段ではなく別地図。水面のdiveから移動、深海のexitから帰る。潜れるロボと密閉席の人のみ、背中乗りは潜れない。

```text
となりの差 平均 70.3 / 最後→最初 74.7
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\preview_portal_dive.png
OK
となりの差 平均 46.0 / 最後→最初 42.9
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\preview_portal_exit.png
OK
（参考: ground-plain の明るさ 106）
（参考: ground-water の明るさ 30）
（参考: ground-shallow の明るさ 111）
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\ground\ground-seabed-sand.png 明るさ 62 / はしの差 3.9,3.8（中 11.2） → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\ground\ground-seabed-rock.png 明るさ 52 / はしの差 4.5,5.0（中 12.4） → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\ground\ground-seabed-kelp.png 明るさ 47 / はしの差 5.2,5.6（中 13.6） → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\ground\ground-trench.png 明るさ 17 / はしの差 2.0,1.5（中 3.9） → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\preview_ground.png
OK
（参考: ground-plain の明るさ 106）
（参考: ground-water の明るさ 30）
（参考: ground-shallow の明るさ 111）
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\overlay\underwater-caustics.png 明るさ 237 / はしの差 0.0,0.0（中 0.0） → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\P_UNDERWATER\preview_caustics.png
OK

```
