# 作業メモ v1.23.0（国庫・共有箱・スカウト・財政報告・兵士詳細）

日時: 2026-10-07（Etc/GMT-9）
版: フッタ v1.23.0 / SW v56 / ?v=56

## やったこと
1. 全軍一括資金援助を廃止し、国庫寄付→全国均等配分＋自部隊個別援助のみに改革
2. 国庫歳入・給与支払い・期末の国家財政報告（戦略会議/トースト）
3. T≤3弱装備の共有ボックス吸収・買い取り・自動装備・余剰換金
4. スカウト（本隊/自部隊）と放逐
5. 兵士「詳細」パネル（成長・マスタリー・ダウン/救護・討伐・作戦期履歴）とセーブ永続化

## 触ったファイル
- js/games/iron-squad/economy-rules.js (NEW)
- js/games/iron-squad/index.js
- js/games/iron-squad/casualty-rules.js
- js/games/iron-squad/phase-rules.js
- css/iron-squad.css
- sw.js, index.html
- docs/GROK_HANDOVER.md, docs/WORK_REPORT_2026-10-07.md

## 注意
- git push なし
- D: 直 Read/CopyToBox 不可のため Shell+TEMP 経由で編集
