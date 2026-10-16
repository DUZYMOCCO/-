// v1.24.0 あたらしい おみせ
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOP_ITEMS, shopCost, playerStats, normalizeSave, defaultSave, DIFFICULTIES, FORTRESS, CHEST_COST, xpToNext, TUNE } from '../js/rules.js';

const NEW = ['zap', 'guard', 'rate', 'multi', 'reach', 'heal', 'crit', 'bonus'];
const kana = /^[\u3040-\u30ff\u30fc\s！。、%+\-0-9.]+$/;

test('new shop items: kana, levels, rising costs, old items unchanged', () => {
  for (const id of NEW) {
    const it = SHOP_ITEMS[id];
    assert.ok(it && it.max >= 2 && it.max <= 5 && it.base, id);
    assert.match(it.name, kana); assert.match(it.desc, kana);
    for (let l = 1; l < it.max; l++) assert.ok(shopCost(l, id) > shopCost(l - 1, id), id);
  }
  assert.ok(shopCost(0, 'hp') <= 30 && shopCost(0, 'zap') <= 100); // さいしょは やすい
  assert.ok(SHOP_ITEMS.hp.max >= 15 && SHOP_ITEMS.atk.max >= 15 && SHOP_ITEMS.spd.max >= 15);
  assert.ok(shopCost(14, 'hp') > shopCost(9, 'hp') * 1.5);
});

test('effects are modest and stack into stats', () => {
  const max = Object.fromEntries(NEW.map(id => [id, SHOP_ITEMS[id].max]));
  const a = playerStats({}, {}), b = playerStats({}, max);
  assert.equal(a.zap, 0); assert.equal(a.guard, 1); assert.equal(a.multi, 0); assert.equal(a.crit, 0); assert.equal(a.coinMul, 1);
  assert.ok(b.guard >= 0.8 && b.guard < 1);
  assert.ok(b.cooldown >= 0.85 && b.cooldown < 1);
  assert.equal(b.multi, 2);
  assert.ok(b.crit <= 0.2 && b.coinMul <= 1.5 && b.regen <= 1 && b.zap <= 90);
  assert.ok(b.pickup > a.pickup);
});

test('save compat: new keys default 0, bad values clamped', () => {
  const s = normalizeSave({ coins: 9, shop: { hp: 10, atk: 10, spd: 10 } });
  for (const id of NEW) assert.equal(s.shop[id], 0, id);
  assert.equal(s.shop.hp, 10);
  const t = normalizeSave({ shop: { multi: 99, crit: 'x', guard: -3 } });
  assert.equal(t.shop.multi, 2); assert.equal(t.shop.crit, 0); assert.equal(t.shop.guard, 0);
  for (const id of NEW) assert.equal(defaultSave().shop[id], 0);
});

// v1.25.0 おこづかいの ばらんす：ふつうの 1かいの コインと、ステージ8の きんこ（3かいに 1かい）で なんかいで ぜんぶ かえるか
const costOf = ids => ids.reduce((t, id) => { for (let l = 0; l < SHOP_ITEMS[id].max; l++) t += shopCost(l, id); return t; }, 0);
test('economy: many runs to max, vault is a treat', () => {
  assert.equal(DIFFICULTIES.easy.coin, 1);
  assert.ok(DIFFICULTIES.normal.coin <= 1.25 && DIFFICULTIES.hard.coin <= 1.5);
  assert.ok(FORTRESS.mega.coins <= 2000);
  assert.ok(CHEST_COST >= 150);
  const base = 180, d = DIFFICULTIES.normal.coin;
  const run = Math.round(base * d) + 50;
  const vault = Math.round((base + 330 + FORTRESS.mega.coins) * d) + 50;
  const oldThree = costOf(['hp', 'atk', 'spd']), all = costOf(Object.keys(SHOP_ITEMS));
  assert.ok(oldThree / run >= 40 && oldThree / run <= 80, String(oldThree / run));           // ふつうの ラン だけなら 40〜80かい
  assert.ok(all / ((2 * run + vault) / 3) >= 30 && all / ((2 * run + vault) / 3) <= 60);      // 3かいに 1かい きんこ → 30〜60かい
  assert.ok(all / vault >= 12);                                                                 // きんこ ばかりでも 12かい いじょう
});

test('xp curve: same early, heavier later (slower in-run level ups)', () => {
  assert.equal(xpToNext(1), 4); assert.equal(xpToNext(20), Math.round(4 + 19 * TUNE.xpStep));
  assert.ok(xpToNext(30) > Math.round(4 + 29 * TUNE.xpStep) + 60);
  for (let l = 1; l < 80; l++) assert.ok(xpToNext(l + 1) >= xpToNext(l));
  let tot = 0, lv = 1; while (tot + xpToNext(lv) <= 2952) { tot += xpToNext(lv); lv++; }
  assert.ok(lv >= 30 && lv <= 37, String(lv)); // むかしは 42
});

test('save compat v1.25.0: owned levels and coins stay, new max is higher', () => {
  const s = normalizeSave({ coins: 77777, shop: { hp: 10, atk: 7, spd: 10, zap: 5 } });
  assert.equal(s.coins, 77777);
  assert.deepEqual([s.shop.hp, s.shop.atk, s.shop.spd, s.shop.zap], [10, 7, 10, 5]);
  assert.equal(normalizeSave({ shop: { hp: 15 } }).shop.hp, 15);
  assert.equal(normalizeSave({ shop: { hp: 99 } }).shop.hp, 15);
});
