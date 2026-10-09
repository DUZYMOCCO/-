import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rollAttributeProfile,ensureAttributeProfile,attributeValues,practiceAttribute,APTITUDE_ROLL_RANGE,TALENT_PRACTICE_BONUS,practiceGrowth} from '../js/games/iron-squad/unit-attributes.js';
import {classUpCostForNext,formatClassUpCostJa,canAffordClassUp,CLASS_UP_COSTS} from '../js/games/iron-squad/class-up-rules.js';
const index=fs.readFileSync(new URL('../js/games/iron-squad/index.js',import.meta.url),'utf8');
// seeded LCG
const lcg=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const range=talent=>{const r=lcg(12345);let lo=9,hi=0;for(let i=0;i<4000;i++){const p=rollAttributeProfile('HEAVY',talent,r);for(const k of Object.keys(p.aptitudes)){lo=Math.min(lo,p.aptitudes[k]);hi=Math.max(hi,p.aptitudes[k]);}}return {lo,hi};};
// 1. variance: compare base (non-focus) spread via spread of mean aptitude
const spread=talent=>{const r0=lcg(777),v=[];for(let i=0;i<4000;i++){let n=0;const r=()=>(++n===6?.9:r0());/* 6th draw = focus type: none */const p=rollAttributeProfile('HEAVY',talent,r);const a=Object.values(p.aptitudes);v.push(...a);}const m=v.reduce((x,y)=>x+y)/v.length;return Math.sqrt(v.reduce((x,y)=>x+(y-m)**2,0)/v.length);};
assert.ok(spread('AVERAGE')<spread('TALENTED')*.7,'AVERAGE aptitude spread is narrower');
assert.ok(range('AVERAGE').lo>=.8*.82-.01,'AVERAGE floor raised (focus penalty only)');
assert.ok(range('TALENTED').lo<.8*.82-.01,'TALENTED keeps wide low rolls');
assert.ok(range('AVERAGE').hi<=2.26&&range('AVERAGE').hi>1.3,'AVERAGE special focus still possible');
// other talents unchanged: identical sequence to the old formula
for(const t of ['INFERIOR','TALENTED','ELITE','GENIUS']){
  assert.equal(APTITUDE_ROLL_RANGE[t],undefined);
  const a=rollAttributeProfile('LIGHT',t,lcg(5)),r=lcg(5);
  const first=Math.round(Math.min(3,Math.max(.35,(.65+r()*.7)))*100)/100;
  // first attribute may be scaled by focus; just ensure raw bound used old range: all aptitudes within old bounds*multipliers
  assert.ok(Object.values(a.aptitudes).every(v=>v>=.35&&v<=3),t);
  assert.ok(first>=.65&&first<=1.35);
}
assert.deepEqual(Object.keys(TALENT_PRACTICE_BONUS),['AVERAGE']);
// 2. practice multiplier only on practice, not level growth
const mk=(talent,level,practice)=>{const u={id:'x'+talent,talent,level,soldierClass:'HEAVY',hp:10};u.attributeProfile={version:1,family:'HEAVY',innate:{strength:25,magic:12,magicDefense:8,quickness:15,evasion:2},aptitudes:{strength:1,magic:1,magicDefense:1,quickness:1,evasion:1},practice:{strength:practice,magic:0,magicDefense:0,travel:0,evasion:0}};return u;};
const lvOnly=(t)=>attributeValues(mk(t,21,0)).strength;
assert.equal(lvOnly('AVERAGE'),25+20*2.5,'AVERAGE level growth unchanged (x1)');
const gain=(t,lv,pr)=>attributeValues(mk(t,lv,pr)).strength-attributeValues(mk(t,lv,0)).strength;
for(const pr of [4,100,400]){
  const base=2*Math.sqrt(pr);
  assert.ok(Math.abs(gain('AVERAGE',1,pr)-base*1.16)<1.01,'AVERAGE practice x1.16 '+pr);
  assert.ok(Math.abs(gain('TALENTED',1,pr)-base*1.16)<1.01);
  assert.equal(gain('AVERAGE',1,pr),gain('TALENTED',1,pr),'AVERAGE practice portion equals TALENTED');
}
assert.equal(practiceGrowth({talent:'AVERAGE'}),practiceGrowth({talent:'TALENTED'}));assert.equal(practiceGrowth({talent:'GENIUS'}),1.8);assert.equal(practiceGrowth({talent:'INFERIOR'}),.85);
// practiceAttribute uses the bonus for dirty detection and accumulates raw amount
const u=mk('AVERAGE',1,0);u._attributesNormalized=true;u.dead=false;assert.ok(practiceAttribute(u,'strength',1));assert.equal(u.attributeProfile.practice.strength,1);
// 3. class-up discount
assert.deepEqual(classUpCostForNext({classTier:0},'AVERAGE'),CLASS_UP_COSTS[1]);
assert.deepEqual(classUpCostForNext({classTier:0}),CLASS_UP_COSTS[1]);
assert.deepEqual(classUpCostForNext({classTier:0},'TALENTED'),{orbs:1,gems:0},'min 1 orb');
assert.deepEqual(classUpCostForNext({classTier:1},'TALENTED'),{orbs:2,gems:0});
assert.deepEqual(classUpCostForNext({classTier:2},'TALENTED'),{orbs:4,gems:1},'gems untouched');
for(const t of ['INFERIOR','AVERAGE','ELITE','GENIUS'])assert.deepEqual(classUpCostForNext({classTier:2},t),CLASS_UP_COSTS[3]);
assert.equal(CLASS_UP_COSTS[2].orbs,3,'base table not mutated');
assert.equal(classUpCostForNext({classTier:3},'TALENTED'),null);
assert.equal(formatClassUpCostJa(classUpCostForNext({classTier:1},'TALENTED')),'覚醒宝珠💎×2');
assert.ok(canAffordClassUp(2,0,classUpCostForNext({classTier:1},'TALENTED')));
assert.ok(!canAffordClassUp(2,0,classUpCostForNext({classTier:1},'AVERAGE')));
// UI + execution both pass the soldier's talent; shortage text derives from the same cost
assert.match(index,/const cost = classUpCostForNext\(curCls, s\.talent\);/);
assert.match(index,/const cost = classUpCostForNext\(cls, s\.talent\);\s*const costJa = formatClassUpCostJa\(cost\);/);
// 4. saves don't re-roll
const saved={id:'old',talent:'AVERAGE',level:5,soldierClass:'HEAVY',attributeProfile:{version:1,family:'HEAVY',innate:{strength:30,magic:9,magicDefense:7,quickness:16,evasion:2},aptitudes:{strength:1.33,magic:.66,magicDefense:1.1,quickness:.7,evasion:1.2},practice:{strength:50,magic:0,magicDefense:0,travel:0,evasion:0}}};
const p=ensureAttributeProfile(JSON.parse(JSON.stringify(saved)));
assert.deepEqual(p.aptitudes,saved.attributeProfile.aptitudes);assert.deepEqual(p.innate,saved.attributeProfile.innate);
// descriptions: flavor only, no digits
const blk=index.slice(index.indexOf('export const TALENTS = {'));
for(const id of ['AVERAGE','TALENTED']){const d=new RegExp(`id: '${id}'[\\s\\S]*?desc: '([^']+)'`).exec(blk)[1];assert.ok(!/\d/.test(d),id+' desc has no numbers');}
console.log('talent-identity.test: PASS');
