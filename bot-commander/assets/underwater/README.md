# 水の中の地面・光・出入りの渦（v1.0.0 Codex gfx3 P_UNDERWATER）・まだ使っていない

- `ground/`: 海の底の地面 4 種（seabed-kelp・seabed-rock・seabed-sand・trench）1024×1024、つなぎ目なし。WebP（質 90）。
- `overlay/`: 水の中のゆらぐ光（underwater-caustics.webp・overlay.json）。Codex のメモでは「案」。
- `portal/`: もぐる・出る渦（portal_dive_0〜5・portal_exit_0〜5、512×512、透明あり）と portal.json・registration.json。
- `SPEC.md`・`finish_parameters.json`・`codex-notes.md`: Codex の仕様とメモ（json の中のファイル名は .webp に直した。SPEC.md は原文のまま .png と書いてある）。
- ゲームでは使っていない（水の中の地図はまだない。水陸両用機は今は地面の上で薄く青くして水の中を表す）。先読み（sw-assets.js）にも入れていない。
- Codex がやらなかった物: 斜めから見た版、もぐる動き（F_dive）。
