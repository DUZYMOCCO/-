import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {applyHitGrowth,HIT_HP_PER_DAMAGE,HIT_DEF_PER_DAMAGE,migrateHitGrowth} from '../js/growth-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('Heavy hit defense').id;g.startFreshGame(false);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ~ ${b}`);
// Absolute points proportional to HP actually lost; no cap, no diminishing returns; none from 0 damage.
{const u={maxHp:100};const r=applyHitGrowth(u,100);near(u.hitGrowthHp,100*HIT_HP_PER_DAMAGE);near(r.gain,.6);assert.equal(u.hitGrowthDef,undefined,'non-heavy gets no DEF growth');
 applyHitGrowth(u,200);near(u.hitGrowthHp,300*HIT_HP_PER_DAMAGE);
 const big={maxHp:100};applyHitGrowth(big,1e6);near(big.hitGrowthHp,1e6*HIT_HP_PER_DAMAGE);
 const late={maxHp:100,hitGrowthHp:5000};near(applyHitGrowth(late,100).gain,100*HIT_HP_PER_DAMAGE);
 const none={maxHp:100};for(const d of [0,-5,NaN])assert.equal(applyHitGrowth(none,d).gain,0);assert.equal(none.hitGrowthHp,undefined);}
{const h={maxHp:100};applyHitGrowth(h,1000,true);near(h.hitGrowthDef,1000*HIT_DEF_PER_DAMAGE);assert.ok(h.hitGrowthDef<h.hitGrowthHp/3,'DEF growth is gentle');}
// Milestone toast: +100 HP steps, 1000 steps above 1000.
assert.equal(applyHitGrowth({hitGrowthHp:99.9},100).crossed,100);assert.equal(applyHitGrowth({hitGrowthHp:50},1).crossed,null);assert.equal(applyHitGrowth({hitGrowthHp:1999.9},100).crossed,2000);
// Migration: percentage saves convert once to absolute points.
{const u={hitGrowthPct:.4};migrateHitGrowth(u,200,20,true);assert.equal(u.hitGrowthHp,80);assert.equal(u.hitGrowthDef,3);assert.equal('hitGrowthPct' in u,false);migrateHitGrowth(u,999,999,true);assert.equal(u.hitGrowthHp,80,'converted only once');}
const make=cls=>{const s=g.createNewSoldier();s.soldierClass=cls;s.combatClass=cls;s.baseClassId=cls;s.hitGrowthHp=0;s.hitGrowthDef=0;g.recalcSoldierStats(s);return s;};
const heavy=make('HEAVY'),light=make('LIGHT');
const def0=heavy.def,hp0=heavy.maxHp,light0=light.def,lhp0=light.maxHp;assert.ok(def0>0);
// Flat addition after all multipliers: exact floor(points) on top.
heavy.hitGrowthHp=123.9;heavy.hitGrowthDef=45.9;light.hitGrowthHp=123.9;light.hitGrowthDef=45.9;g.recalcSoldierStats(heavy);g.recalcSoldierStats(light);
assert.equal(heavy.maxHp,hp0+123);assert.equal(heavy.def,def0+45,'heavy DEF +floor(points)');
assert.equal(light.maxHp,lhp0+123);assert.equal(light.def,light0,'light infantry DEF unchanged');
const grown=[heavy.maxHp,heavy.def];for(let i=0;i<3;i++)g.recalcSoldierStats(heavy);assert.deepEqual([heavy.maxHp,heavy.def],grown,'no drift on recalc');
// Real hits via damageTarget: grows from HP actually lost (heavy also DEF), light only HP; absorbed hit grows nothing.
{const h=make('HEAVY'),l=make('LIGHT');for(const u of [h,l]){u.dodge=0;u.def=0;u.dmgReduction=0;u.shieldTimer=0;u.lethalGuardCooldown=999;u.hp=u.maxHp=100000;u.x=C;u.y=C;}
 g.squad=[h,l];h.def=0;
 let dealt=0;g.spawnDamageText=(x,y,txt)=>{if(typeof txt==='number')dealt=txt;};g.damageTarget(h,5000);const lost=dealt;g.damageTarget(l,5000);g.spawnDamageText=noop;
 assert.ok(h.hitGrowthHp>0&&l.hitGrowthHp>0);assert.ok(h.hitGrowthDef>0);assert.ok(!(l.hitGrowthDef>0));
 assert.ok(lost>0);assert.ok(h.hitGrowthHp<=lost*HIT_HP_PER_DAMAGE+1e-9&&h.hitGrowthHp>=lost*HIT_HP_PER_DAMAGE-1e-9);}
// Lethal hit still downs (growth does not save the target).
{const t=make('HEAVY');t.dodge=0;t.def=0;t.dmgReduction=0;t.shieldTimer=0;t.lethalGuardCooldown=999;t.hitGrowthHp=0;t.hp=10;t.x=C;t.y=C;g.squad=[t];g.damageTarget(t,1e7);assert.ok(t.isDown||t.hp<=0,'lethal hit downs');assert.ok(t.hitGrowthHp<=10*HIT_HP_PER_DAMAGE+1e-9,'growth only from HP actually lost');}
// Old-save migration through recalc, and persistence round trip.
{const o=make('HEAVY');o.hitGrowthHp=0;o.hitGrowthDef=0;g.recalcSoldierStats(o);const base=o.maxHp,baseDef=o.def;o.hitGrowthPct=.5;g.recalcSoldierStats(o);assert.equal(o.hitGrowthPct,undefined);assert.equal(o.maxHp,base+Math.round(base*.5));assert.ok(o.def>=baseDef);const v=[o.maxHp,o.def];g.recalcSoldierStats(o);assert.deepEqual([o.maxHp,o.def],v);
 const copy=JSON.parse(JSON.stringify(o));g.recalcSoldierStats(copy);assert.deepEqual([copy.maxHp,copy.def,copy.hitGrowthHp,copy.hitGrowthDef],[o.maxHp,o.def,o.hitGrowthHp,o.hitGrowthDef],'soldier round trip');}
{g.player.hitGrowthHp=0;g.recalcPlayerStats();const pm=g.player.maxHp;g.player.hitGrowthHp=250.7;g.recalcPlayerStats();assert.equal(g.player.maxHp,pm+250);g.recalcPlayerStats();assert.equal(g.player.maxHp,pm+250,'player no drift');
 g.saveGame();const hp=g.player.hitGrowthHp;g.player.hitGrowthHp=0;g.resumeSavedGame(saveSlots.get(g.activeSlotId).data);near(g.player.hitGrowthHp,hp);assert.equal(g.player.maxHp,pm+250,'player round trip');
 const pp=g.player;pp.hitGrowthPct=.2;pp.hitGrowthHp=0;g.recalcPlayerStats();assert.ok(pp.hitGrowthHp>0&&pp.hitGrowthPct===undefined,'player migrates old percentage');}
assert.match(g.buildSoldierDetailHtml(heavy),/被弾防御成長/);assert.doesNotMatch(g.buildSoldierDetailHtml(light),/被弾防御成長/);assert.match(g.buildSoldierDetailHtml(heavy),/被弾HP成長 💪 <strong[^>]*>\+123</);
console.log('PASS: absolute uncapped hit growth (HP all, DEF heavy-only gentle), migration, round trip, no drift, lethal still downs');
