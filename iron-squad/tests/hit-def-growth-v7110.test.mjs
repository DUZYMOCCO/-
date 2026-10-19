// v7.1.10: hit DEF growth for every class by one per-class factor table (heavy 1.0 = 0.0105), the commander included.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {applyHitGrowth,HIT_DEF_PER_DAMAGE,HIT_DEF_CLASS_FACTORS,hitDefGrowthFactor,hitGrowthDefOf} from '../js/growth-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('Hit DEF growth v7110').id;g.startFreshGame(false);
let checks=0;const near=(a,b,m)=>{assert.ok(Math.abs(a-b)<1e-9,`${m||''} ${a} ~ ${b}`);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;},ok=(v,m)=>{assert.ok(v,m);checks++;};
// 1. One table; heavy unchanged, others modest and ordered by role.
eq(HIT_DEF_PER_DAMAGE,0.0105);ok(Object.isFrozen(HIT_DEF_CLASS_FACTORS));
assert.deepEqual({...HIT_DEF_CLASS_FACTORS},{HEAVY:1,LIGHT:.55,COMMANDER:.55,ARCHER:.3,MEDIC:.25,MAGE:.25});checks++;
const F=HIT_DEF_CLASS_FACTORS;ok(F.HEAVY>F.LIGHT&&F.LIGHT>F.ARCHER&&F.ARCHER>F.MEDIC&&F.MEDIC===F.MAGE);
// 2. Families: advanced and limited classes, commander and hero party.
for(const [unit,f] of [[{soldierClass:'HEAVY'},1],[{soldierClass:'PALADIN'},1],[{soldierClass:'IMMORTAL_AEGIS'},1],[{soldierClass:'LIGHT'},.55],[{soldierClass:'BLADEMASTER'},.55],[{soldierClass:'NINJA',combatClass:'LIGHT'},.55],[{soldierClass:'BEAST_BEAR',combatClass:'HEAVY'},1],
  [{soldierClass:'ARCHER'},.3],[{soldierClass:'SNIPER'},.3],[{soldierClass:'MEDIC'},.25],[{soldierClass:'ARCHANGEL'},.25],[{soldierClass:'MAGE'},.25],[{soldierClass:'BEAST_FOX',combatClass:'MAGE'},.25],[{isPlayer:true},.55],[{isHero:true},.55]])eq(hitDefGrowthFactor(unit),f,JSON.stringify(unit));
// 3. applyHitGrowth: numeric factor, boolean compatibility.
{const a={},b={},c={},d={};applyHitGrowth(a,1000,.3);applyHitGrowth(b,1000,true);applyHitGrowth(c,1000,false);applyHitGrowth(d,1000);
 near(a.hitGrowthDef,1000*.0105*.3);near(b.hitGrowthDef,10.5);eq(c.hitGrowthDef,undefined);eq(d.hitGrowthDef,undefined);near(a.hitGrowthHp,b.hitGrowthHp,'HP growth independent of the DEF factor');}
// 4. Real hits per class via damageTarget: DEF growth = strength x 0.0105 x factor.
const make=cls=>{const s=g.createNewSoldier();Object.assign(s,{soldierClass:cls,combatClass:cls,baseClassId:cls,hitGrowthHp:0,hitGrowthDef:0,hitGrowthEvents:0});g.recalcSoldierStats(s);Object.assign(s,{dodge:0,dmgReduction:0,shieldTimer:0,lethalGuardCooldown:999,x:C,y:C});s.hp=s.maxHp=1e9;return s;};
for(const cls of ['HEAVY','LIGHT','ARCHER','MEDIC','MAGE']){const s=make(cls);s.hp=s.maxHp=1e9;g.squad=[s];g.damageTarget(s,2000);near(s.hitGrowthDef,2000*.0105*F[cls],cls);eq(s.hitGrowthEvents,1);}
// 5. Recalc adds the bonus for every class (absolute, before grit), no drift.
for(const cls of ['LIGHT','ARCHER','MEDIC','MAGE']){const s=make(cls);s.hitGrowthDef=0;g.recalcSoldierStats(s);const d0=s.def;s.hitGrowthDef=30.7;g.recalcSoldierStats(s);ok(s.def>=d0+30,`${cls} DEF +30 (${d0}->${s.def})`);const d1=s.def;g.recalcSoldierStats(s);eq(s.def,d1,'no drift');}
// 6. Class change / class-up keeps grown DEF (heavy-grown points stay on a light soldier and on a paladin).
{const s=make('HEAVY');s.hitGrowthDef=50;g.recalcSoldierStats(s);Object.assign(s,{soldierClass:'LIGHT',combatClass:'LIGHT',baseClassId:'LIGHT'});s.hitGrowthDef=0;g.recalcSoldierStats(s);const base=s.def;s.hitGrowthDef=50;g.recalcSoldierStats(s);ok(s.def>=base+50,'grown DEF kept after class change');near(hitGrowthDefOf(s),50);
 const p=make('HEAVY');p.hitGrowthDef=40;Object.assign(p,{soldierClass:'PALADIN'});g.recalcSoldierStats(p);near(p.hitGrowthDef,40,'kept through class-up');eq(hitDefGrowthFactor(p),1);
 const json=JSON.parse(JSON.stringify(s));g.recalcSoldierStats(json);eq(json.def,s.def,'save round trip');}
// 7. Commander: grows at 0.55 and DEF includes it; saved and loaded.
{const P=g.player;P.hitGrowthDef=0;P.hitGrowthHp=0;g.recalcPlayerStats();const d0=P.def;g.trainFromHit(P,4000);near(P.hitGrowthDef,4000*.0105*.55,'commander DEF growth');eq(P.def,d0+Math.floor(P.hitGrowthDef),'commander DEF +floor(points)');
 P.hitGrowthDef=123.4;g.recalcPlayerStats();eq(P.def,d0+123);g.recalcPlayerStats();eq(P.def,d0+123,'no drift');}
console.log(`PASS hit-def-growth-v7110 (${checks} checks)`);
