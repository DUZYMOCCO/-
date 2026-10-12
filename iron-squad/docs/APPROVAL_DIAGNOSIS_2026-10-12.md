# ブラウザ検証の停止原因と説明の訂正（2026-10-12）

前の「自動承認レビューの利用上限」という説明は、実行ツールのエラー文を自動レビュー固有の上限と解釈した誤り。無料の安全性レビューが利用枠を消費したと示す証拠はない。

## 元のツール結果

時刻は日本時間。現在のチャットの保存記録から実際のツール出力を抽出した。

| 時刻 | 操作 | 実際の結果 |
| --- | --- | --- |
| 12:11:56 | サンドボックス内でChromeから127.0.0.1:8001へ接続 | `ERR_NETWORK_ACCESS_DENIED` |
| 12:12:15 | 承認付きでChromeから同じサーバーへ接続 | `ERR_CONNECTION_TIMED_OUT` |
| 12:12:27 | サンドボックス内のPowerShellで同じURLへ接続 | 「アクセス許可で禁じられた方法でソケットにアクセスしようとしました」 |
| 12:12:41 | 承認付きで127.0.0.1:8002の一時サーバー起動を要求 | 実行前の承認経路が利用上限エラーを返し、コマンドは実行されなかった |

最後のエラー原文：

```text
Automatic approval review failed: You’ve hit your usage limit.
... try again at 12:17 PM.
The action was not executed because automatic approval review could not be completed.
This is a review failure, not a determination that the action is unsafe.
```

[元のツール出力](previews/nightlife-20261012/original-tool-errors.json)。この操作は `exec_command` によるPowerShell実行で、Computer Useのアプリ操作やその権限要求は使用していない。

## 確認できる範囲

- 公式の [Using Codex with your ChatGPT plan](https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan) は、ChatGPTサインイン時のAuto-review安全性チェックが無料でプランの利用枠に計上されないと明記している。通常のCodex活動には利用枠が適用される。
- [Auto-reviewの公式ガイド](https://learn.chatgpt.com/docs/sandboxing/auto-review) によると、承認はサンドボックス境界を越える個別要求に対するものであり、Auto-reviewを有効にしてもネットワーク制限そのものは解除されない。
- ローカル通信の拒否と、サーバー起動要求の実行前の承認経路の失敗は別々の停止点。
- 元の承認経路から利用上限エラーが返されたことは確認できるが、当時どの利用枠を参照したか、無料レビューの扱いに実装上の不整合があったかは取得できた記録にない。サーバー/ブラウザ側の独自利用上限や自動レビュー固有の上限とは断定しない。
- 再確認時の利用情報は `ordinaryUsageAllowed=true`、5時間枠の使用率3%、週枠48%。これは再確認時の情報で、12:12時点の利用状況を証明するものではない。上限のリセットや設定変更は実行していない。

## 再実行結果

承認付きの読み取り専用コマンドが成功。続いて、前回と同じ一時サーバー起動要求が成功し、対象ファイルへのHTTP応答200を確認。Chrome検証も成功した。

- カジノ/酒場 × 昼/夜 × 390×844・844×390・1280×800の12場面。
- 夜の発光、昼の消灯、アニメーション、日没/夜明けの強度、ダンジョン内へ野外の光を描かないこと。
- カジノと酒場への出入り、未探索の黒い遮蔽、115アセットのキャッシュ、オフライン起動とネオン描画。
- ページ例外0。[ブラウザ検証結果](previews/nightlife-20261012/validation.json)。iPhone実機は未確認。

ブラウザ検証の停止は解消したが、元の利用上限エラーの内部原因を特定できたとは扱わない。
