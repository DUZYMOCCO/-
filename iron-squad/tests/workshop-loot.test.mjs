import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {CRAFT_MATERIALS,CRAFT_RECIPES,normalizeMaterials,rollTreasureLoot,rollMaterialDrop,recipeMaterials,equipmentDropChance,workshopTier} from '../js/crafting-rules.js';
import {workshopPrice} from '../js/workshop.js';
import {normalizeNation,nationalSalaryReserve,fiscalTotals} from '../js/nation-rules.js';
import {saleValue,isGodRollProtected} from '../js/equipment-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:375,height:780,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WORKSHOP TEST ONLY').id;game.startFreshGame(false);const initial=structuredClone(game.saveGame());
assert.deepEqual(game.materials,normalizeMaterials());
assert.equal(normalizeMaterials({wood:-1,iron:Infinity,fabric:2.9,unexpected:40}).fabric,2);
assert.equal(normalizeMaterials({wood:-1,iron:Infinity}).iron,0);
for(const [level,investment] of [0,6000,18000,45000,90000,180000].entries()){
 const n=normalizeNation({investment});assert.equal(n.armament.techTier,level*4+1);assert.equal(workshopTier({nation:n}),level*4+1);
}
assert.equal(normalizeNation({investment:180000,armament:{techTier:28}}).armament.techTier,28);
assert.equal(equipmentDropChance(0),.035);assert.equal(equipmentDropChance(100000),.05);
for(const kind of ['elite','boss','colossal','chest','dungeon_vault'])assert.ok(equipmentDropChance(0,kind)<1);
assert.equal(rollTreasureLoot(10000,'chest',generateRandomDrop,()=>.99).length,1,'a material-only chest is still a reward');
const rich=rollTreasureLoot(10000,'dungeon_vault',generateRandomDrop,()=>0);assert.equal(rich.length,2);assert.equal(rich[0].type,'MATERIAL');assert.ok(rich[0].materials.core>0);
for(const tier of [1,8,13,20,28])for(const recipe of CRAFT_RECIPES){assert.ok(Object.keys(recipeMaterials(recipe,tier)).every(id=>CRAFT_MATERIALS[id]));assert.ok(workshopPrice(tier)>saleValue({tier}));}
// Actual enemy production, attraction, ordinary soldier pickup and treasure delivery.
function quiet(){game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.updateSpawns=noop;game.squad=[];game.reserves=[];game.monsters=[];game.merchants=[];game.civilians=[];game.gateGuards=[];game.currentQuest=null;game.outposts=[];game.restTimer=0;}
quiet();const random=Math.random;
try{
 Math.random=()=>.1;const m={x:game.player.x+100,y:game.player.y,lootDistance:100,hp:0,maxHp:10,atk:1,type:'slime',color:'#aaa'};
 game.monsters=[m];game.killMonster(m,game.player,true);
 assert.equal(game.dropsOnField.filter(d=>d.item&&d.item.type!=='MATERIAL').length,0,'a 10% roll used to drop equipment; it now drops only material');
 assert.ok(game.dropsOnField.some(d=>d.item?.type==='MATERIAL'));
 const bag=game.inventory.length;game.update(.6);assert.equal(game.inventory.length,bag);assert.ok(Object.values(game.materials).some(n=>n>0));
}finally{Math.random=random;}
quiet();const s=game.createNewSoldier(null,{classKey:'LIGHT'});Object.assign(s,{x:game.player.x+600,y:game.player.y,isPersonalGuard:false,speed:0});game.squad=[s];
game.dropsOnField=[{x:s.x,y:s.y,item:rollMaterialDrop(0,'normal',()=>0)}];game.update(.01);assert.equal(game.dropsOnField.length,0);assert.ok(game.materials.wood>0,'ordinary contact pickup by a soldier enters the shared material store');
const realSave=game.saveGame;let pickupSaves=0;game.saveGame=function(...args){pickupSaves++;return realSave.apply(this,args);};
for(let i=0;i<3;i++)game.collectCraftMaterials({materials:{wood:2}});
assert.equal(pickupSaves,0,'a pickup burst cannot synchronously rewrite the whole save for each material');
game.autoSaveClock=9.99;game.update(.02);assert.ok(pickupSaves>0);assert.equal(saveSlots.get(game.activeSlotId).data.materials.wood,game.materials.wood,'existing autosave persists the shared material store');
game.saveGame=realSave;
quiet();game.nation=normalizeNation({investment:18000});game.gold=1000000;assert.equal(game.buyWorkshopEquipment('weapon-axe',9),false);
game.enterDungeon(game.dungeons.find(d=>d.id==='royal_castle_town'));game.gold=1000000;
const gold=game.gold,issued=game.buyWorkshopEquipment('weapon-axe',9);assert.ok(issued);assert.equal(issued.weaponStyle,'axe');assert.equal(issued.tier,9);assert.equal(game.gold,gold-workshopPrice(9));assert.ok(game.inventory.includes(issued));assert.ok(!issued.craftOnly&&!issued.dropOnly);
assert.equal(game.buyWorkshopEquipment('weapon-axe',10),false);assert.equal(game.buyWorkshopEquipment('unknown',1),false);
const emptyGold=game.gold,emptyBag=game.inventory.length;assert.equal(game.craftWorkshopEquipment('armor',9),false);assert.equal(game.gold,emptyGold);assert.equal(game.inventory.length,emptyBag);
game.materials=Object.fromEntries(Object.keys(CRAFT_MATERIALS).map(id=>[id,10000]));
const owned=[];
for(const recipe of CRAFT_RECIPES){
 const before=structuredClone(game.materials),g=game.gold,item=game.craftWorkshopEquipment(recipe.id,9),needed=recipeMaterials(recipe,9);
 assert.ok(item?.craftOnly&&item.favorite);assert.equal(item.type,recipe.type);if(recipe.weaponStyle)assert.equal(item.weaponStyle,recipe.weaponStyle);
 assert.equal(game.gold,g-workshopPrice(9,true));for(const id of Object.keys(before))assert.equal(game.materials[id],before[id]-(needed[id]||0));
 assert.ok(isGodRollProtected(item));applyUpgradeStats(item,4);const stats=structuredClone(item.stats);applyUpgradeStats(item,4);assert.deepEqual(item.stats,stats,'repeated upgrades do not stack craft or heavy-weapon multipliers');
 const ordinary={...item,craftOnly:false,stats:{}};applyUpgradeStats(ordinary,4);assert.ok(Object.keys(stats).some(key=>typeof stats[key]==='number'&&stats[key]>(ordinary.stats[key]||0)));
 owned.push(item);
}
assert.equal(new Set(owned.map(item=>item.id)).size,owned.length);assert.ok(game.inventory.filter(i=>i.craftOnly).length===15);
const craftedState=structuredClone(game.saveGame());game.resumeSavedGame(craftedState);assert.deepEqual(game.materials,craftedState.materials);assert.equal(game.inventory.filter(i=>i.craftOnly).length,15);
const legacy={...initial};delete legacy.materials;game.resumeSavedGame(legacy);assert.deepEqual(game.materials,normalizeMaterials(),'old saves gain an empty material store');
game.nation=normalizeNation({investment:18000});game.treasury=2000000;game.phase=2;game.phaseFiscal.startBalance=game.treasury;
const soldiers=game.squad.slice(0,2);game.squad=soldiers;game.reserves=[];for(const s of soldiers){s.equipped={};s.weapon=null;game.recalcSoldierStats(s);}
const treasury=game.treasury;game.supplyMissingEquipment();assert.ok(soldiers.every(s=>s.equipped.weapon?.tier===9),'automatic military supply uses the developed workshop tier');
assert.ok(game.treasury>=nationalSalaryReserve(game));assert.equal(treasury-game.treasury,game.phaseFiscal.equipmentProcurement+game.phaseFiscal.publicForging);
const after=game.treasury;game.supplyMissingEquipment();assert.equal(game.treasury,after,'same phase cannot supply twice');
game.renderStrategyUI();assert.equal(document.getElementById('workshop-tier').options.length,9);assert.ok(document.querySelector('.material-stock'));assert.equal(document.getElementById('workshop-craft').options.length,15);
console.log('PASS: reduced completed gear, guaranteed treasure materials, actual enemy/commander/soldier pickup, 6 development tiers, workshop purchases, 15 exclusive recipes, exact costs, guarded failures, unique ownership, nonstacking upgrades, save migration, automatic supply budget/phase/UI');
dom.window.close();
