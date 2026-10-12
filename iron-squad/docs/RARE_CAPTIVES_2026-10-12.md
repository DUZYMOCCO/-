# 囚われた仲間の希少化（v6.1.2 / v203）

2026-10-12。すべてのダンジョンに必ず捕虜が出る状態を改め、ダンジョンと廃墟の初回探索時の出現率を10%へ下げた。同じ遠征で場所ごとに1回抽選し、結果を保存する。

クマに偏っていた原因は場所IDからの固定選択だった。本陣近くの「北の崩れ砦」と「ゴブリンの地下廃坑」が両方クマで、全8ダンジョン/廃墟の内訳はクマ3・鳥2・狼2・猫1・狐0だった。出現判定とは独立した種族抽選へ変え、どの場所でも狼・熊・猫・狐・鳥が各20%で出るようにした。

捕虜がいなかった結果も `limitedAllies.captiveChecks` へ保存。出入り、期経過、通常保存/ロード、同じ遠征の継承で引き直さない。未救出の本人・種族・装備と、救出済みの履歴を保持する。集落の志願者、野外の捕虜拠点、周囲の敵を排除して無料で救出する操作、同行枠超過時の扱いを保持した。

実際の8か所を、決まった乱数列で2,500遠征・2万回抽選した結果は1,988回出現（9.94%）。種族は狼434・熊387・猫390・狐363・鳥414で、各場所に5種すべてが出た。10%の境界、未出現時に人物を生成しないこと、保存済みの結果が乱数を再使用しないこと、種族抽選の独立性も自動検証した。

Chromeの使い捨て保存で、捕虜なしの保存と20回の再入場、5種それぞれの実描画・名前・救出ボタン、敵が近い間の救出不可、装備/人物の保存保持、無料の直属加入、保存/再入場後も救出済みの本人が増えないことを確認。5種を確認する場面では検証用の抽選結果を指定し、実際の確率は上記の2万回で検証している。通常セーブは既存どおり野外へ復帰し、ダンジョンを再訪したときも本人が残る。

新しいブラウザでキャッシュを作ったあと、オフラインのv6.1.2表示、再開、同じ狐の再訪/救出を確認。ページ例外0。iPhone実機未検証。共有コード・他ゲーム・実セーブは変更していない。commit/pushなし。

全106テスト合格。結果：[全体テスト](previews/captives-20261012/tests.log)、[ブラウザ](previews/captives-20261012/ui.json)、[構文/アセット](previews/captives-20261012/validation.json)。画像：[捕虜なし](previews/captives-20261012/01-no-captive.png)、[狼](previews/captives-20261012/02-captive-wolf.png)、[熊](previews/captives-20261012/02-captive-bear.png)、[猫](previews/captives-20261012/02-captive-cat.png)、[狐](previews/captives-20261012/02-captive-fox.png)、[鳥](previews/captives-20261012/02-captive-bird.png)。

再検証（ルートディレクトリから、一時サーバー起動後）：

```
node iron-squad/tools/verify-rare-captives.mjs http://127.0.0.1:8001
node iron-squad/tools/verify-consistency-tests.mjs iron-squad/docs/previews/captives-20261012
node iron-squad/tools/check-consistency-files.mjs iron-squad/docs/previews/captives-20261012 6.1.2 v203
```
