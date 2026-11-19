# assets/models
ゲーム用に作った glb（低ポリ、頂点色）。原点と向き:
- 武器（crossbow_junk / sword_guard / cleaver_bandit / bolt）: 原点が握り、+Z が前。
- campfire: `flame` の点（炎の根元）。street_lamp・lantern_hand: `light` の点（光源）。
- wall_adobe / wall_door / roof_flat: 2m 幅の板。小屋の組み方は `js/render/asset_plan.js` の `shackPieces`。
読み込みは `js/render/models.js`（材質ごとにまとめてインスタンス描画）。読めない時は前の形で描く。

## 2回目（_r2 ほか）
- 武器: katana_curved（衛兵）、cleaver_rust・cleaver_bandit_r2（盗賊、人ごとに混ぜる）、crossbow_junk_r2、bolt_r2、sword_guard_r2（katana_curved が読めない時の控え）。
- 小物: campfire_r2、lantern_hand_r2、street_lamp_big・street_lamp_r2（場所で混ぜる）。
- 小屋: wall_adobe（オレンジ）・wall_adobe_sand・wall_adobe_grey と、そろいの wall_door_*。roof_flat_r2 は小屋ごとに1枚に伸ばして焼き込む。
- どの役割にどれを使うかは `js/render/asset_plan.js` の `MODEL_ROLES`。最後の候補は必ず1回目のファイルなので、新しいのが読めなくても前の形で出る。
