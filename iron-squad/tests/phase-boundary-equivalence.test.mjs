import assert from 'node:assert/strict';
import {test} from 'node:test';
import {legacyProcessSharedEquipmentBox,legacySupplyMissingEquipment} from './fixtures/phase-boundary-v6.11.14-reference.mjs';
import {createEquipmentValueCache} from '../js/armament-rules.js?v=265';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js?v=262');
const {normalizeNation}=await import('../js/nation-rules.js?v=265');
const source=Object.create(IronSquadGame);
for(const key of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])source[key]=()=>{};
source.activeSlotId=saveSlots.create('境界一致テスト').id;source.startFreshGame(false);
for(let i=0;i<source.squad.length;i++){
  const unit=source.squad[i];unit.level=1+i%12;unit.minionKills=i%35;unit.isDown=i%13===0;
  for(const item of Object.values(unit.equipped||{}))if(item)applyUpgradeStats(item,i%3);
  source.recalcSoldierStats(unit);
}
function fixture(seed){
  const g=Object.create(IronSquadGame);
  Object.assign(g,structuredClone({squad:source.squad,reserves:[],career:source.career,nation:normalizeNation({investment:1000}),phase:2,phaseFiscal:{sharedEquipmentIssued:0,surplusSales:0,surplusCount:0},treasury:10000,inventory:[],sharedEquipBox:[]}));
  g.showToast=()=>{};g.recordBattleLog=()=>{};
  const types=['WEAPON','ARMOR','SHIELD','HELMET','LEGS','GLOVES','AMULET'];
  for(let i=0;i<70;i++){
    const owner=g.squad[i%48],item=g.createSupplyEquipment(types[(i+seed)%7],owner,1+i%4);item.id=`box-${seed}-${i}`;
    if(i%17===0)item.favorite=true;if(i%19===0)item.isGodRoll=true;
    if(i%11===0){item.tier=1;applyUpgradeStats(item,0);}g.sharedEquipBox.push(item);
  }
  g.sharedEquipBox.push(g.sharedEquipBox[5],g.squad[0].equipped.weapon);
  g.inventory=Array.from({length:500},(_,i)=>({...structuredClone(g.sharedEquipBox[i%70]),id:`bag-${i}`}));
  return g;
}
const output=g=>structuredClone({squad:g.squad,reserves:g.reserves,box:g.sharedEquipBox,bag:g.inventory,nation:g.nation,treasury:g.treasury,fiscal:g.phaseFiscal});
for(const seed of [0,1,3])test(`48 mixed soldiers / 500 bag items / shared box: old and new results are identical (seed ${seed})`,()=>{
  const base=fixture(seed),old=Object.create(IronSquadGame),next=fixture(seed);
  Object.assign(old,structuredClone({squad:base.squad,reserves:base.reserves,sharedEquipBox:base.sharedEquipBox,inventory:base.inventory,nation:base.nation,treasury:base.treasury,phaseFiscal:base.phaseFiscal,career:base.career,phase:base.phase}));old.recordBattleLog=()=>{};
  const counts={old:{trial:0,actual:0},next:{trial:0,actual:0}},recalc=IronSquadGame.recalcSoldierStats;
  for(const [label,g]of [['old',old],['next',next]])g.recalcSoldierStats=function(unit){counts[label][unit._equipmentTrial?'trial':'actual']++;return recalc.call(this,unit);};
  const expected=legacyProcessSharedEquipmentBox.call(old),actual=next.processSharedEquipmentBox();
  assert.deepEqual(actual,expected);assert.deepEqual(output(next),output(old),'equipment recipients/order, exports, all actor fields and wallets must match exactly');
  assert.ok(counts.next.trial<counts.old.trial,JSON.stringify(counts));assert.equal(counts.next.actual,counts.old.actual);
  assert.equal(counts.next.actual,new Set(next.squad.filter((s,i)=>JSON.stringify(s.equipped)!==JSON.stringify(base.squad[i].equipped)).map(s=>s.id)).size,'only actors whose equipment changed are recalculated once');
  for(let i=0;i<4;i++){
    const expectedRepeat=legacyProcessSharedEquipmentBox.call(old),repeat=next.processSharedEquipmentBox();assert.deepEqual(repeat,expectedRepeat);assert.deepEqual(output(next),output(old));
    if(!repeat.equippedCount)break;
  }
  const calls=counts.next.trial,before=output(next);assert.deepEqual(next.processSharedEquipmentBox(),{equippedCount:0,soldGold:0,soldCount:0});assert.deepEqual(output(next),before);assert.equal(counts.next.trial,calls,'unchanged stable repeat skips evaluation');
});
test('box, in-place upgrade, protection, membership and stat changes invalidate the repeat marker',()=>{
  const next=fixture(2),old=fixture(2);next.processSharedEquipmentBox();legacyProcessSharedEquipmentBox.call(old);
  const changeBoth=change=>{change(next);change(old);assert.deepEqual(next.processSharedEquipmentBox(),legacyProcessSharedEquipmentBox.call(old));assert.deepEqual(output(next),output(old));};
  changeBoth(g=>{const item=g.createSupplyEquipment('ARMOR',g.squad[1],4);item.id='new-arrival';g.sharedEquipBox.push(item);});
  changeBoth(g=>{if(g.sharedEquipBox[0]){g.sharedEquipBox[0].favorite=false;applyUpgradeStats(g.sharedEquipBox[0],5);}});
  changeBoth(g=>{g.squad[1].level++;g.recalcSoldierStats(g.squad[1]);});
  changeBoth(g=>{g.reserves.push(g.squad.pop());});
});
test('scoped evaluation cache invalidates after a replacement and explicit in-place recalculation',()=>{
  const unit={equipped:{weapon:{id:'a'}}};let calls=0;const value=createEquipmentValueCache((s,item)=>{calls++;return s.equipped.weapon.id==='a'?1:2;});
  const candidate={id:'c'};assert.equal(value(unit,candidate,'weapon'),1);assert.equal(value(unit,candidate,'weapon'),1);assert.equal(calls,1);
  unit.equipped.weapon={id:'b'};assert.equal(value(unit,candidate,'weapon'),2);assert.equal(calls,2);unit.equipped.weapon.upgrade=1;value(unit,candidate,'weapon');assert.equal(calls,3);value.invalidate(unit);value(unit,candidate,'weapon');assert.equal(calls,4);
});
test('personal/public procurement with changed equipment has identical old/new purchases, scores and wallets',()=>{
  const old=fixture(0),next=fixture(0);old.processSharedEquipmentBox=legacyProcessSharedEquipmentBox;
  for(const g of [old,next]){g.treasury=100000;for(const s of g.squad)s.gold=500;g.nation.armament.techTier=3;delete g.squad[2].equipped.helmet;delete g.squad[7].equipped.gloves;}
  assert.deepEqual(next.supplyMissingEquipment(),legacySupplyMissingEquipment.call(old));assert.deepEqual(output(next),output(old));assert.deepEqual(next.lastEquipmentSupply,old.lastEquipmentSupply);
});
