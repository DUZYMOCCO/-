// v4.2.23: heal strength depends on the HEALER (healPower -> share of target max HP).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {healFraction,healAmountFor,healByMedic,HEAL_MAX_FRACTION,HEAL_MIN_FRACTION,HEAL_REF_POWER} from '../js/phase-rules.js';
import {treatWounded} from '../js/casualty-rules.js';

// pure curve
const f=healPower=>healFraction({healPower});
assert.ok(Math.abs(f(HEAL_REF_POWER)-.10)<1e-9,'reference healer = 10%');
assert.ok(f(15)<.05&&f(15)>=HEAL_MIN_FRACTION,'ポンコツ heals only a little');
assert.ok(f(100)>f(50)&&f(300)>f(100)&&f(300)>=.4&&f(300)<=.6,'monotonic, late game 40-60%');
assert.equal(f(1e6),HEAL_MAX_FRACTION);assert.equal(f(1),HEAL_MIN_FRACTION);
assert.equal(healAmountFor({healPower:50},{maxHp:200}),20);
assert.ok(healAmountFor({healPower:500},{maxHp:200})>4*healAmountFor({healPower:50},{maxHp:200})*.9);

// real game: commander on-the-spot revival, credit = real HP
import {WORLD_SIZE} from '../js/world.js';
import {saveSlots} from '../js/save-slots.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const game=Object.create(IronSquadGame);
for(const m of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','gainExp','refreshSupplyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('HEAL STRENGTH TEST ONLY').id;game.startFreshGame(false);
const c=WORLD_SIZE/2,p=game.player;game.gameOver=()=>{};
const mk=(id,healPower)=>({id,name:id,soldierClass:'MEDIC',hp:100,maxHp:100,x:c+800,y:c,speed:100,healPower});
for(const [hpw,label] of [[6,'weak'],[50,'starting'],[400,'strong']]){
  Object.assign(p,{x:c+800,y:c,hp:p.maxHp,isDown:false,downTimer:0,invulnerableTimer:0,lethalGuardCooldown:999,rescuedThisDown:false});delete p.carrierId;delete p.downId;
  game.gold=500;game.monsters=[];game.civilians=[];game.restTimer=0;
  const m=mk('m-'+label,hpw);game.squad=[m];game.damageTarget(p,p.maxHp*5);
  assert.equal(p.isDown,true);
  treatWounded(game,m,p,.5);assert.equal(treatWounded(game,m,p,.5),true);
  assert.equal(p.isDown,false);
  const expected=Math.max(1,Math.floor(healAmountFor(m,p)));
  assert.equal(p.hp,expected,`${label} commander revival uses the formula`);
  assert.equal(m.phaseActivity.healingDone,expected,'healing credit equals HP restored');
  if(label==='starting')assert.ok(Math.abs(p.hp/p.maxHp-.10)<.01,'starting healer ~10% of commander max HP');
  if(label==='weak')assert.ok(p.hp/p.maxHp<.05);
  if(label==='strong')assert.ok(p.hp/p.maxHp>.5);
}
console.log('heal-strength ok');
