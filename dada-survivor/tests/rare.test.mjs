// v1.23.0 すごい ぶき：かみなりチェーンガン・ブラックホールほう・ドラゴンバスター
import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, MAX_LEVEL, SPECIAL, RARE, upgradeChoices, rareAllowed, weaponStat, normalizeSave } from '../js/rules.js';
import { ART_NAMES } from '../js/art.js';

const RARES = ['chaingun', 'blackhole', 'dragon'];
const kana = /^[\u3040-\u30ff\u30fc\s！。、]+$/;

test('three rare weapons: kana names, 5 levels, art', () => {
  for (const id of RARES) {
    const w = WEAPONS[id];
    assert.ok(w && w.rare && !w.gift && !w.evolved, id);
    assert.match(w.name, kana); assert.match(w.desc, kana);
    for (const [k, v] of Object.entries(w)) if (Array.isArray(v) && typeof v[0] === 'number') assert.equal(v.length, MAX_LEVEL, `${id}.${k}`);
    assert.ok(ART_NAMES.includes(w.shot), w.shot);
    assert.ok(weaponStat(id, 'damage', 5) > weaponStat(id, 'damage', 1), id);
  }
  assert.ok(weaponStat('chaingun', 'chain', 5) > weaponStat('chaingun', 'chain', 1));
  assert.ok(weaponStat('dragon', 'burnLife', 1) >= 2);
  assert.ok(SPECIAL.maxHoles <= 3 && SPECIAL.maxBurns <= 40 && SPECIAL.zapMax <= 10);
});

test('rare weapons only after a Lv5 weapon, rarely, and one per run', () => {
  const never = (w, p = {}) => { for (let i = 0; i < 300; i++) for (const c of upgradeChoices(w, p)) assert.ok(!RARES.includes(c.id), c.id); };
  never({ gun: 4, bomb: 3 });
  assert.ok(RARES.every(id => rareAllowed(id, { gun: MAX_LEVEL })));
  let seen = 0;
  for (let i = 0; i < 2000; i++) if (upgradeChoices({ gun: MAX_LEVEL }, {}).some(c => RARES.includes(c.id))) seen++;
  assert.ok(seen > 100 && seen < 1000, String(seen));
  for (let i = 0; i < 300; i++) for (const c of upgradeChoices({ gun: MAX_LEVEL, dragon: 2 }, {})) assert.ok(c.id !== 'chaingun' && c.id !== 'blackhole', c.id);
  // もって いる rare は そだてられる
  let up = false;
  for (let i = 0; i < 300 && !up; i++) up = upgradeChoices({ gun: MAX_LEVEL, dragon: 2 }, {}).some(c => c.id === 'dragon' && c.level === 3);
  assert.ok(up);
  assert.ok(RARE.maxOwned === 1);
});

test('rare weapons are strong but below the gift super missile', () => {
  for (const id of RARES) assert.ok(weaponStat(id, 'damage', 5) < WEAPONS.supermissile.damage[0], id);
  const chainDps = weaponStat('chaingun', 'damage', 5) * (1 + weaponStat('chaingun', 'chain', 5) * WEAPONS.chaingun.chainMul) / weaponStat('chaingun', 'cooldown', 5);
  assert.ok(chainDps < 450, String(chainDps));
  const s = normalizeSave({ coins: 5, character: 'cat' });
  assert.equal(s.coins, 5);
});
