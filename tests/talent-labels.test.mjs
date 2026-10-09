import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TALENT_TAGS,talentTag} from '../js/games/iron-squad/talent-labels.js';
const index=fs.readFileSync(new URL('../js/games/iron-squad/index.js',import.meta.url),'utf8');
const s0=index.indexOf('export const TALENTS = {'),block=index.slice(s0,index.indexOf('\n};',s0)+3);
for(const key of Object.keys(TALENT_TAGS)){
  const m=new RegExp(`id: '${key}'[\\s\\S]*?tag: '([^']+)'`).exec(block);
  assert.ok(m,`TALENTS.${key} tag`);
  assert.equal(talentTag(key),m[1],`${key} label matches TALENTS.tag`);
  assert.ok(!/^[A-Z_]+$/.test(talentTag(key)),`${key} label is Japanese`);
}
assert.equal(talentTag('UNKNOWN'),'凡庸');
const rank=fs.readFileSync(new URL('../js/games/iron-squad/troop-rankings.js',import.meta.url),'utf8');
assert.ok(!rank.includes('[${s.talent}]'),'ranking must not print the raw talent key');
assert.match(rank,/talentLabel\(s\.talent\)/);
console.log('talent-labels.test: PASS');
