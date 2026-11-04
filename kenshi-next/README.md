# kenshi-next（砂の果て 3D試作）

Kenshi 風の 3D サバイバル（砂漠・町・部隊・戦闘・怪我・交易）。`kenshi-proto` の後継。
遊ぶ端末は iPhone（縦・横）。three.js の WebGL ＋ DOM の HUD。

## まず読むもの

| 知りたいこと | 読む |
|---|---|
| **いま何ができていて、次に何をするか** | [docs/CURRENT_WORK.md](docs/CURRENT_WORK.md) ← **最初にこれ** |
| **これまで何をしたか（実測値つき）** | [docs/WORK_REPORT.md](docs/WORK_REPORT.md) |
| **機能の仕様メモ（モバイル操作・死んだフリ・戦闘演出・BGM・天候）** | [docs/FEATURES.md](docs/FEATURES.md) |
| Kenshi の仕様調べと本作の決め | [research/](research/) |
| スタジオ共通の作業ルール | [../AGENTS.md](../AGENTS.md) |

## 動かす

リポジトリの**ルート**で配信して `/kenshi-next/index.html` を開く（`file://` は不可）。

```bash
python common/tools/serve.py
```

公開（ハブには未登録なので直リンク）: https://duzymocco.github.io/-/kenshi-next/

## テスト

```bash
node --test kenshi-next/tests/*.test.mjs   # リポジトリのルートから
```

描画・アニメ・速さはここでは測れない。ヘッドレスブラウザでの測り方は
[docs/CURRENT_WORK.md](docs/CURRENT_WORK.md) §5 を見る。

## 構成

```text
index.html / manifest.webmanifest   入口（js/main.js を読み込む）
js/sim/       ルール層（DOM も Three も触らない）
js/render/    描画（three.js）
js/ui/        HUD・画面
js/data/      表データ（武器・技・建物・セリフ…）
js/vendor/    three.js（触らない）
assets/       モデル・アニメ・テクスチャ
css/          スタイル
docs/         現在地と作業報告（この README の上の表を参照）
research/     Kenshi の仕様調べと決め
tests/        node:test
```
