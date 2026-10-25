# タイトル

- 内蔵画像生成3回: 新規構図1、ポンコの大きさと無文字装甲の描き直し1、縦長版への上下描き足し1。入力上限5枚を超えた事前エラー1件は生成されなかったため、この回数に含めない。
- 参考: BOY/GIRL/WOLFの設定画をwork/character_reference.pngに並べた参照専用画像、PONCO02/TITANFRAMEのneutral立ち絵、今回Bのbg_coast.png。タイトル自体は切り貼りではなく、全体を画像生成で描いた。trio_concept.pngは目視参考のみ。修正は今回タイトル原画とPONCO02、縦長は今回の修正原画を参照。
- 描いたロボ: PONCO02（白青・青い目）、TITANFRAME（黒鉄橙・細い橙目）。3人が前、大きいタイタンは後ろ。少年は銀髪白黒服、少女は布の猫耳フードでしっぽなし、狼は赤スカーフ。
- 原画はraw/、指示文はprompts/title.txt・title_scale_fix.txt・title_outpaint.txt。初回の小さすぎるポンコ案はtitle_small_ponco_rejected.pngとして不採用保存。
- 迷い: 主役の読みやすさを優先し、ロボはPONCO02＋TITANFRAMEだけ。宇宙人の影は省略。全員の重要な顔は中央80%内、3人の顔は35〜60%帯。
- 通常版1080×1920 RGB。縦長版1290×2796 RGBは空と地面を新しく描き足した原画から、比率を保って中央トリミングした。通常版を縦に引き伸ばしていない。
- 両版のtitle_checkはOK。previewのロゴ枠が人物・ロボに重ならず、下のボタン帯は地面。機体の文字・看板・タイトル文字なし。ゲームは画像の上にロゴとボタンを別に置く。実ゲームと実機は未確認。

```text
C:\Users\Yoshiyuki\codex_ground\out\gfx3\K_TITLE\title_1080x1920.png 上の模様 2.7 / 下の模様 16.0 / 上のばらつき 23 → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\K_TITLE\preview_1080x1920.png
OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\K_TITLE\title_1290x2796.png 上の模様 2.0 / 下の模様 10.3 / 上のばらつき 15 → OK
C:\Users\Yoshiyuki\codex_ground\out\gfx3\K_TITLE\preview_1290x2796.png
OK

```
