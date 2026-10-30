# Kenshi の体の窓（health pane）— 見た目の調べ（hpui1）

画像・データはプロジェクトに入れていない（/tmp で見ただけ）。

## 見た出典
- Steam ストアの公式スクリーンショット（appdetails 233860）3枚: 左下の窓（Normal / Bleeding 状態）
  https://store.steampowered.com/app/233860/Kenshi/
- Kenshi wiki 画像: File:Blood Stats.JPG（Blood Spider, "Slightly Injured", 頭が赤）、File:Bonewolf health.jpg、
  File:Thief and their stats on the left bottom screen.jpg（Category:UI_Screenshots）
- reddit r/Kenshi 18kxaea の画像（UI mod の緑の配色、Right Leg が "-1."、腹が黄の帯）
- 文: kenshi.fandom.com/wiki/Guide_to_Health・Damage、kenshi.zone/en/medical・/en/knockout-death、
  Steam 議論 522730700396528120・846959998165182489、reddit Kenshi Fact of the Day #82（KO点）
- ファンの HTML 再現: https://valooford.github.io/kenshi-ui/（行の並び確認）

## 形
- 左下。左に State/Goal/Encumbrance と能力、中央に状態の一言の箱（Normal・Bleeding・Slightly Injured …）、
  その下に 9 本のバー: **Blood・Head・Chest・Stomach・Left Arm・Right Arm・Left Leg・Right Leg・Hunger**。
- 名前はバーの**中央**に書かれ、数字は右の別の列（羊皮紙色の箱）に**今の値だけ**（"13"、"-1."、"238"）。
- 地は木と羊皮紙。体力はオリーブ寄りの黄緑、減った所は薄いクリーム、切り傷は赤。

## 色の意味（wiki・Steam）
- 黄緑 = 体力 / 赤 = 包帯をしていない切り傷 / 黄 = 包帯済みで戻りつつある / 灰・クリーム = 打撃・気絶（自然に戻る）
  / 黒 = 体力なし（最大が下がった・失った） / 白っぽい = 添え木。
- バーは 0 で空になり、それ以下は数字だけ負になる（-1. など）。
- 血の上の `<` は出血。多いほど速い。部位の `<` は切り傷 20% 以上で悪化、`<<` は 100% 超。Hunger も減る間は `<`。

## 閾値
- 急所（頭・胸・腹）が 0 未満で気絶。KO点 = −10 − 0.75×打たれ強さ（−10〜−85）を下回ると回復昏睡。−最大で死。
- 手足は 0 で使えない、−最大で切断。血が 0 未満で気絶、−最大血で死。
- 空腹: 250 未満で食べる、200 未満で栄養不足、100 未満で倒れる。
- ダメージの浮き数字は Kenshi にもある（設定 "Show damage floaters"、既定は切り・突き・打撃・気絶を足した整数1つ）。

## この世界での写し方（game_next）
| Kenshi | game_next |
|---|---|
| 並び Blood→部位→Hunger、名前はバーの中・数字は右の列 | 同じ（血・頭・胸・腹・左腕・右腕・左脚・右脚・空腹） |
| 数字は今の値だけ | 「今/最大」（最大は傷で下がった後 effMax）— ユーザーの希望で最大も出す |
| 赤 = 未処置の切り傷 | 赤 = 手当てで戻る分（hp〜effMax） |
| 黒 = 体力なし | 黒い斜線 = 傷（max−effMax、休むと戻る） |
| 0 未満は数字だけ | バーを負の物差し（左 0 → 右 −最大）に切り替え、KO点の印・右端=死/切断 |
| 血 `<` | 出血量で `<`〜`<<<`、KO 線 30 |
| 状態の一言 | 正常・軽傷・出血・負傷・重傷・大出血・気絶・失血で気絶・昏睡・死亡 |
