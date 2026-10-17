// v7.0.22: kill-XP floor (near-field rebalance plan B). Normal kills pay at least 0.3% (0-80 m) / 0.5% (80-220 m) of the killer's XP-to-next-level.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {KILL_XP_FLOOR,killXpFloor,killExpWithFloor,strongEnemyReward} from '../js/combat-rewards.js';
import {distanceScaling} from '../js/equipment-rules.js';
// ---- pure floor numbers
assert.deepEqual({...KILL_XP_FLOOR},{nearRate:.003,wildRate:.005,nearLimit:8000,wildLimit:22000,eliteMult:2,levelCap:60});
assert.equal(killXpFloor({distance:4000,required:48135,level:20,captain:true}),144,'captain Lv20 near: 0.3%');
assert.equal(killXpFloor({distance:7999,required:48135,level:20,captain:true}),144);
assert.equal(killXpFloor({distance:8000,required:48135,level:20,captain:true}),241,'80 m: 0.5% band starts');
assert.equal(killXpFloor({distance:21999,required:48135,level:20,captain:true}),241);
assert.equal(killXpFloor({distance:22000,required:48135,level:20,captain:true}),0,'220 m and beyond: no floor');
assert.equal(killXpFloor({distance:48000,required:48135,level:20,captain:true}),0);
assert.equal(killXpFloor({distance:4000,required:65393,level:20,captain:false}),196,'soldier Lv20 near');
assert.equal(killXpFloor({distance:4000,required:48135,level:20,captain:true,elite:true}),289,'elite pays double');
assert.equal(killXpFloor({distance:4000,required:20,level:1,captain:true}),0,'level 1: the floor rounds to nothing, early game is unchanged');
assert.equal(killXpFloor({distance:4000,required:1119,level:10,captain:false}),3);
// ---- level cap / overflow: never NaN, Infinity or growing past the cap value
const capReq=(first,growth,add,min)=>{let r=first;for(let l=2;l<=60;l++)r=Math.floor(Math.max(min,r)*growth+add);return r;};
const capCaptain=Math.round(capReq(20,1.45,10,10)*.003),capSoldier=Math.round(capReq(14,1.5,8,8)*.003);
assert.ok(Number.isFinite(capCaptain)&&capCaptain<2**53&&capSoldier<2**53);
for(const [level,required] of [[60,capReq(20,1.45,10,10)],[61,1e12],[90,1e15],[200,1e300],[300,Infinity],[500,NaN]])assert.equal(killXpFloor({distance:4000,required,level,captain:true}),capCaptain,`captain Lv${level} saturates at the Lv60 value`);
assert.equal(killXpFloor({distance:4000,required:1e300,level:99,captain:false}),capSoldier);
for(const bad of [undefined,null,NaN,-5,0,Infinity,'x']){
  const a=killXpFloor({distance:4000,required:bad,level:20,captain:true}),b=killXpFloor({distance:bad,required:48135,level:20,captain:true}),c=killXpFloor({distance:4000,required:48135,level:bad,captain:true});
  for(const v of [a,b,c]){assert.ok(Number.isFinite(v)&&v>=0,'finite non-negative '+bad);}
}
assert.equal(killXpFloor(),0);
// ---- max() against the old reward: large rewards (level-gap bonus, far enemies) never change
const big=strongEnemyReward(500,{maxHp:1e6,atk:1000},{maxHp:100,atk:10});assert.equal(big.multiplier,25);
assert.deepEqual(killExpWithFloor(big,144),{...big,floorExp:0});
const small={baseExp:40,exp:40,bonusExp:0,multiplier:1,ratio:.1};
assert.equal(killExpWithFloor(small,144).exp,144);assert.equal(killExpWithFloor(small,144).floorExp,144);
assert.equal(killExpWithFloor(small,0).exp,40);assert.equal(killExpWithFloor(small,NaN).exp,40);assert.equal(killExpWithFloor(small,Infinity).exp,40);
// ---- real kills
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('KILL XP FLOOR TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.currentQuest=null;
const mob=(distance,extra={})=>({type:'goblin',x:80000,y:80000,lootDistance:distance,hp:0,maxHp:60,atk:5,def:0,...extra});
const oldExp=(m,unit)=>strongEnemyReward(Math.max(2,Math.round((m.isElite?24:6)*distanceScaling(m.lootDistance,g.phase||g.wave||1).exp*(m.fieldAdaptive?.reward||1))),m,unit).exp;
const grants=[];const realGain=g.gainExp;g.gainExp=function(amount,opts){grants.push(amount);return realGain.call(this,amount,opts);};
const kill=(unit,isPlayer,m)=>{const before=unit.exp||0;grants.length=0;g.monsters=[m];g.dropsOnField=[];g.killMonster(m,unit,isPlayer);return unit.exp-before;};
const setLevel=(u,level,reqExp)=>{u.level=level;u.reqExp=reqExp;u.exp=0;};
const captain=g.player;
// captain, near (0.3%) and 80-220 m (0.5%)
setLevel(captain,20,48135);let m=mob(4000);assert.ok(oldExp(m,captain)<144,'the old near-field reward is far below the floor');
assert.equal(kill(captain,true,m),144);assert.equal(grants[0],oldExp(m,captain),'career / guard share keep the old amount (no double counting)');
setLevel(captain,20,48135);m=mob(15000);assert.equal(kill(captain,true,m),Math.max(241,oldExp(m,captain)));
setLevel(captain,20,48135);m=mob(4000,{isElite:true});assert.equal(kill(captain,true,m),Math.max(289,oldExp(m,captain)));
// beyond 220 m, boss tiers and early game are unchanged
setLevel(captain,20,48135);m=mob(30000);assert.equal(kill(captain,true,m),oldExp(m,captain),'far enemies are unchanged');
setLevel(captain,20,48135);m=mob(4000,{isColossal:true});assert.equal(kill(captain,true,m),oldExp(m,captain),'mid-bosses are unchanged');
setLevel(captain,1,20);m=mob(4000);assert.equal(kill(captain,true,m),oldExp(m,captain),'level 1 is unchanged');
setLevel(captain,6,300);m=mob(4000);assert.equal(kill(captain,true,m),Math.max(1,oldExp(m,captain)),'early game keeps the old reward when it is higher');
// level-gap bonus: a stronger enemy keeps its bonus when it is above the floor
setLevel(captain,20,48135);m=mob(4000,{maxHp:1e9,atk:1e6});const strong=oldExp(m,captain);assert.ok(strong>=144);assert.equal(kill(captain,true,m),strong);
// soldier
const soldier=g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});g.squad=[soldier];
setLevel(soldier,20,65393);m=mob(4000);assert.equal(kill(soldier,false,m),Math.max(196,oldExp(m,soldier)));
const before=captain.exp||0;setLevel(soldier,20,65393);captain.exp=before;kill(soldier,false,mob(4000));assert.equal(captain.exp,before,'the captain never receives a soldier kill XP');
// overflow-sized levels stay finite
setLevel(captain,200,1e300);m=mob(4000);const gained=kill(captain,true,m);assert.ok(Number.isFinite(gained)&&gained>0&&gained<2**53,'huge level stays finite: '+gained);assert.ok(Number.isFinite(captain.exp)&&Number.isFinite(captain.reqExp));
setLevel(captain,20,48135);
// save format is untouched
const saved=g.saveGame({persist:false});assert.ok(saved&&!JSON.stringify(saved).includes('floorExp'));
console.log('PASS: kill XP floor 0.3% / 0.5%, elite x2, Lv60 saturation, finite everywhere, bosses / far / early game unchanged, no double counting');
g.destroy();dom.window.close();