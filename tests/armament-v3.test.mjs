import {tickEconomicConstruction} from '../js/games/iron-squad/regional-economy.js';
import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {TIERS,powerRank,equipmentVisualProfile} from '../js/games/iron-squad/equipment-tiers.js';
import {advanceResearch,normalizeArmament,researchCost,observeEquipment,standardEquipmentCost} from '../js/games/iron-squad/armament-rules.js';
import {lootWeights,chooseLootTier,saleValue} from '../js/games/iron-squad/equipment-rules.js';
import {catalogTier,ensureMerchantCatalog} from '../js/games/iron-squad/merchant-catalog.js';
import {distributeSharedBoxToSoldiers} from '../js/games/iron-squad/economy-rules.js';
import {normalizeNation,nationalPayroll,fiscalTotals} from '../js/games/iron-squad/nation-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{document:dom.window.document,window:dom.window,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {storage}=await import('../js/storage.js');
storage.set('ironsquad_rules_version',3);storage.set('ironsquad_save_slots_v1',[{id:'old',rulesVersion:3,data:{player:{}}}]);storage.set('sound_muted',true);
const {saveSlots,RULES_VERSION}=await import('../js/games/iron-squad/save-slots.js');
assert.equal(RULES_VERSION,4);assert.deepEqual(saveSlots.list(),[]);assert.equal(storage.get('sound_muted'),true);
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/games/iron-squad/index.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('V3 TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame()),fresh=()=>{game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();};
const gear=(tier,type='WEAPON',upgrade=0)=>generateRandomDrop(0,'normal',{tier,type,upgrade,quality:1,merchant:true,random:()=>.5,id:`test-${tier}-${type}-${upgrade}`});
assert.equal(TIERS.length,28);assert.equal(powerRank(1),1);assert.equal(powerRank(28),7);
for(const type of ['WEAPON','ARMOR','SHIELD','HELMET','LEGS','GLOVES','AMULET']){
 let previous=null;
 for(let tier=1;tier<=28;tier++){
  const item=gear(tier,type);assert.equal(item.tier,tier);assert.ok(Object.values(item.stats).every(v=>typeof v==='boolean'||Number.isFinite(v)));
  assert.ok(standardEquipmentCost(item)>Math.floor(saleValue(item)*1.6),'procurement cannot profit through immediate export');
  if(previous&&item.stats.atk)assert.ok(item.stats.atk>=previous.stats.atk);
  if(previous&&item.stats.def)assert.ok(item.stats.def>=previous.stats.def);
  if(previous)assert.ok(equipmentVisualProfile(item).coverage>equipmentVisualProfile(previous).coverage);
  previous=item;
 }
}
assert.equal(gear(28).stats.atk,3712,'endgame spear stays at the former final-tier power');
assert.equal(equipmentVisualProfile(null).coverage,0);
assert.equal(new Set(TIERS.map(t=>t.weapon)).size,28);
for(const distance of [0,8000,22000,48000,70000])for(const kind of ['normal','elite','boss','colossal','chest']){
 assert.equal(lootWeights(distance,kind).length,28);
 for(const r of [0,.2,.5,.9,.999999])assert.ok(chooseLootTier(distance,kind,()=>r)<=24,'mythic materials remain vault rewards');
}
assert.equal(chooseLootTier(10000,'dungeon_vault',()=>.999999),28);
// Study credit happens once; national procurement cannot unlock itself.
const researchGame={nation:normalizeNation({investment:180000}),phase:2,showToast:noop};
observeEquipment(researchGame,gear(28));const credit=researchGame.nation.armament.research;observeEquipment(researchGame,gear(28));assert.equal(researchGame.nation.armament.research,credit);
const issued={...gear(28),nationalIssue:true};researchGame.nation.armament=normalizeArmament();observeEquipment(researchGame,issued);assert.equal(researchGame.nation.armament.observedTier,1);
observeEquipment(researchGame,gear(28));
for(let wave=1;wave<=100;wave++){researchGame.phase=wave+1;const before=researchGame.nation.armament.techTier;advanceResearch(researchGame,1e6);assert.ok(researchGame.nation.armament.techTier<=before+1);assert.equal(advanceResearch(researchGame,1e6),0);}
assert.equal(researchGame.nation.armament.techTier,28,'research keeps progressing beyond the maximum city development');
const market={nation:normalizeNation(),phase:1,merchantEquipmentTier:28};assert.equal(catalogTier(market),2);market.nation.armament.techTier=12;assert.equal(catalogTier(market),13);market.nation.armament.techTier=28;assert.equal(catalogTier(market),24);
// Same actor, same actual stats: shared distribution and direct pickup cannot prefer a nominally high-tier weak item.
fresh();const soldier=game.squad.find(s=>s.soldierClass==='LIGHT');
soldier.attributeProfile.innate.strength=100;game.recalcSoldierStats(soldier);
const weak={...gear(20),weaponStyle:'sword',stats:{atk:1},id:'nominal-high'},strong={...gear(4),weaponStyle:'sword',stats:{atk:20},id:'actual-strong'};
delete weak.weaponTraits;delete strong.weaponTraits;
soldier.equipped.weapon=weak;soldier.weapon=weak;game.recalcSoldierStats(soldier);
const beforeActor=JSON.stringify(soldier),value=(s,item,key)=>game.equipmentValueFor(s,item,key);
assert.ok(value(soldier,strong,'weapon')>value(soldier,weak,'weapon'));assert.equal(JSON.stringify(soldier),beforeActor,'trial evaluation never heals or mutates the actor');
const distribution=distributeSharedBoxToSoldiers([strong],[soldier],s=>game.recalcSoldierStats(s),value);assert.equal(soldier.equipped.weapon.id,strong.id);assert.ok(distribution.remaining.includes(weak));
// A real field pickup returns even an enhanced old item intact and pays no duplicated inheritance.
applyUpgradeStats(strong,4);soldier.equipped.weapon=strong;soldier.weapon=strong;game.recalcSoldierStats(soldier);
const newWeapon={...gear(24),weaponStyle:'sword',id:'field-new'};delete newWeapon.weaponTraits;
Object.assign(soldier,{x:81000,y:81000,isPersonalGuard:true,isDown:false,hp:100,atkCooldown:100});game.squad=[soldier];game.reserves=[];game.joystick={active:false,dirX:0,dirY:0};game.player.x=83000;game.player.y=83000;
game.monsters=[];game.outposts=[];game.merchants=[];game.civilians=[];game.currentQuest=null;game.restTimer=0;game.updateSpawns=noop;game.dropsOnField=[{x:soldier.x,y:soldier.y,item:newWeapon}];game.update(.01);
assert.equal(soldier.equipped.weapon.id,newWeapon.id);assert.equal(newWeapon.upgrade,0);assert.equal(game.sharedEquipBox.find(i=>i.id===strong.id).upgrade,4);
// Real wave completion: payroll reserves, budgeting, tech advancement, inventory uniqueness and exact fiscal reconciliation.
fresh();let issuedCount=0,updatedCount=0,forgedCount=0;
for(let wave=1;wave<=30;wave++){
 tickEconomicConstruction(game,120);
 game.completePhase();const a=game.nation.armament,l=game.lastFiscalReport,totals=fiscalTotals(l);
 assert.equal(l.endBalance-l.startBalance,totals.net);assert.ok(game.treasury>=Math.max(6000,nationalPayroll(game)*2));
 assert.ok(a.last.spent<=a.last.budget,'procurement stays inside its quoted budget including the growing operating allocation');issuedCount+=a.last.issued;updatedCount+=a.last.updated;forgedCount+=a.last.forged;
 const treasury=game.treasury;game.supplyMissingEquipment();assert.equal(game.treasury,treasury,'same-wave calls cannot buy or forge twice');
 game.finishRest();
 const owned=[...game.squad,...game.reserves].flatMap(s=>Object.values(s.equipped).filter(Boolean)).concat(game.sharedEquipBox);assert.equal(new Set(owned.map(i=>i.id)).size,owned.length,'an item has exactly one owner');
}
assert.ok(issuedCount>0);assert.ok(updatedCount+forgedCount>0);assert.ok(game.nation.armament.techTier>=2);assert.ok(game.nation.armament.techTier<=Math.max(4*(game.nation.level+1),game.nation.armament.observedTier),'manufacturing follows funded development and observed loot');assert.ok(game.squad.every(s=>Object.values(s.equipped).filter(Boolean).length===7));
const currentArmament=structuredClone(game.nation.armament);game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.deepEqual(game.nation.armament,currentArmament);
game.renderStrategyUI();assert.match(document.getElementById('nation-status').textContent,/製造技術|軍備整備/);assert.match(document.getElementById('nation-status').textContent,/補充8名/);assert.ok(!document.getElementById('nation-status').textContent.includes('[object Object]'));
const policy=document.querySelector('[data-armament-policy="military"]');assert.ok(policy);policy.click();assert.equal(game.nation.armament.policy,'military');
assert.equal(researchCost(29),researchCost(28));
console.log(`PASS: 28 continuous tiers, visual coverage, vault boundaries, legacy-save retirement, study/research/city independence, bounded market, pure role-aware replacement, intact enhanced hand-me-downs; 30 waves issued=${issuedCount}, updated=${updatedCount}, forged=${forgedCount}, tech=${game.nation.armament.techTier}, city=${game.nation.level}, payroll/budget/fiscal/save/policy/unique ownership`);
dom.window.close();
