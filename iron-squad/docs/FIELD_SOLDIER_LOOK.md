# フィールド上の兵士の個体差

2026-10-07 / v1.27.2 / Service Worker v85

## 変更

- 近距離だけでなく遠距離の簡略描画、負傷して倒れている姿にも同じ外見を使用する。
- 遠距離は細かな目・鼻・顔の描画を省き、髪のシルエット・ひげ・メガネの有無を残す。丸ハゲ・バーコード・モヒカン・サイドハゲ・落ち武者を区別できる形へ変更。胴体には軽い腕と足の形を追加する。
- 兜や聖職帽がある時は頭頂の髪を描かず、モヒカン等が装備を突き抜けないようにする。後ろ髪や側面に残る髪は表示する。
- 衛生兵のボブ・ポニーテール・編み髪をフィールドの輪郭に反映する。遠距離・負傷でも医療マークを表示する。
- 医療職の昇格先にも医療服を描く。背の高い帽子に名前やHPバーが重ならないよう、該当する表示の位置を上げる。
- 極職・伝説職の弓兵と遊撃兵を元の職の衣装・持ち物の描画へ接続。高位の弓兵が通常の重装兵の姿へ変わらないようにする。

保存された `appearance` の読み取りと描画のみ。新たな外見抽選、戦闘能力や人数の変更は行わない。装備で隠れた顔を無理に表示しない。

見本: [previews/field-soldiers.png](previews/field-soldiers.png)。同じ人物を素顔・兜・遠距離・負傷の4状態で描画した比較画像。ゲーム内の描画関数を拡大した画像で、ブラウザ画面やiPhoneのスクリーンショットではない。

## 検証

- `iron-squad/tests/field-appearance.test.mjs`：ネイティブCanvasの画素で、遠距離の髪型・メガネ、負傷者の髪型が区別できることを確認。
- モヒカンの上部は素顔で描画され、兜着用時は透明になることを画素検査。同じ肌・顔・装備条件では、兜付きのモヒカンと丸ハゲが同じ姿になる。
- 高位職の系統と、描画が保存済みの外見を変更しないことを確認。
- 遠距離の描画回数が同じ人物の近距離描画の60%未満であることを確認。
- 外見の保存・統合UI・フィールド造形・既存性能の回帰確認を実行。
- 48兵士・40敵、100フレームのPCソフトウェアCanvas計測ではフレーム中央値13.114ms。これはiPhoneやブラウザのFPSを保証する計測ではない。
- 比較画像を生成して目視確認。実機表示は未確認。

```powershell
node iron-squad/tests/field-appearance.test.mjs <@napi-rs/canvasを含むnode_modules>
node iron-squad/tests/soldier-appearance.test.mjs
node iron-squad/tests/interface.test.mjs
node iron-squad/tests/field-form.test.mjs
node iron-squad/tests/performance-regression.test.mjs
node iron-squad/tools/preview-field-soldiers.mjs <@napi-rs/canvasを含むnode_modules> <出力PNG>
```

今回の環境ではパッケージ位置と出力先に既定値があり、引数なしで実行できる。これらの依存は開発用で、ゲーム本体に追加していない。
