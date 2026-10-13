# v6.9.1 指示書：筋肉術士の「魔力の一撃」の消費MPを55へ（Claude、2026-10-13）

ユーザー決定：「威力はそのままでいい。MP消費を55にして」。

## 変更
- `js/unit-attributes.js` の `CASTER_STRIKE_COST` を `10` → `55` にする。
- 威力（`casterStrikeMultiplier`：×2〜5）、普段の攻撃力、筋肉術士の素質の幅、MP上限・MP回復は**変えない**。
- MPが55に足りないときは、今どおり普通の殴り（倍率1）。MPを消費しない。
- 目安：MP100の術士は満タンから1発、MP140で2発、MP180で3発。

## 表示・文書
- 兵士詳細の「魔力の一撃 ×N（近接・MP55）」は定数から出ているので、表示が55になることだけ確認する。
- `docs/SPEC_AND_HANDOVER.md` 105行目付近の「MP10を使えた一撃」を「MP55」に直す。

## テスト
- `tests/unit-attributes.test.mjs` 74行目付近は定数を参照しているので、そのまま通るはず。加えて次を確かめるテストを足す：
  - MP100で1発目は消費して倍率が掛かり（残り45）、2発目は倍率1でMPが減らない。
  - `CASTER_STRIKE_COST===55`。

## 確認と規則
- 編集は `iron-squad/` の中だけ。`sw-assets.js` を v248 / 6.9.1 にし、変更したモジュールの `?v=` を上げる（unit-attributes.js を読み込んでいる側の `?v=` も揃える）。
- `D:\スマホゲーム工房` から `node --test iron-squad/tests/*.test.mjs` を流して全件PASSにする。書き換わる docs/previews の3枚は git checkout で戻す。
- `CURRENT_WORK.md` を更新する。コミットはしない。
