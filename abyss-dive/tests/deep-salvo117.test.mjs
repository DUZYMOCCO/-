import test from 'node:test';
import assert from 'node:assert/strict';
import { rollItem } from '../js/weapon-rules.js';

function sample(type, options){
  let state = 45963;
  const rng = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  const counts = new Map();
  for (let i = 0; i < 10000; i++){
    const item = rollItem(type, rng, options);
    const key = `${item.count}:${item.pattern}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

test('6・9・12ウェイは深層の魚雷回収でだけ抽選され、本数が多いほど希少', () => {
  const early = sample('torpedo');
  const deep = sample('torpedo', { deepSalvo:true });
  const missile = sample('missile', { deepSalvo:true });
  assert.ok([...early.keys()].every(k => /^[123]:/.test(k)));
  assert.ok([...missile.keys()].every(k => /^[12]:/.test(k)));
  for (const k of deep.keys()) assert.match(k, /^(1:single|[23]:(parallel|fan)|(6|9|12):fan)$/);
  const [six,nine,twelve] = [6,9,12].map(n => deep.get(`${n}:fan`) || 0);
  assert.ok(six > nine && nine > twelve && twelve > 0, `deep fan counts: ${six}/${nine}/${twelve}`);
});
