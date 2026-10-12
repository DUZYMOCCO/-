// v1.24.0 あたらしい おみせ
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHOP_ITEMS, shopCost, playerStats, normalizeSave, defaultSave } from '../js/rules.js';

const NEW = ['zap', 'guard', 'rate', 'multi', 'reach', 'heal', 'crit', 'bonus'];
const kana = /^[\u3040-\u30ff\u30fc\s！。、%+\-0-9.]+$/;

test('new shop items: kana, levels, rising costs, old items unchanged', () => {
  for (const id of NEW) {
    const it = SHOP_ITEMS[id];
    assert.ok(it && it.max >= 2 && it.max <= 5 && it.base, id);
    assert.match(it.name, kana); assert.match(it.desc, kana);
    for (let l = 1; l < it.max; l++) assert.ok(shopCost(l, id) > shopCost(l - 1, id), id);
  }
  assert.equal(shopCost(0, 'hp'), 30); assert.equal(shopCost(9, 'atk'), 300);
  const total = NEW.reduce((s, id) => { for (let l = 0; l < SHOP_ITEMS[id].max; l++) s += shopCost(l, id); return s; }, 0);
  assert.ok(total > 40000 && total < 120000, String(total)); // ちかの きんこ（10000）で すこしずつ かえる
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
