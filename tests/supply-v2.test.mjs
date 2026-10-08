import assert from 'node:assert/strict';
import {strongEnemyReward,combatPower} from '../js/games/iron-squad/combat-rewards.js';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {AMMO_CAPACITY,LETHAL_GUARD_COOLDOWN,initializeSupplies,updateSupplies,distributeAmmo,supplyLocation,ammoCombatProfile} from '../js/games/iron-squad/supply-rules.js';
import {weaponCombatProfile} from '../js/games/iron-squad/equipment-rules.js';
import {masteryReloadMult} from '../js/games/iron-squad/growth-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,DEPLOYMENT_CAPACITY,ENEMY_LIMIT}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('V2 TEST ONLY').id;game.startFreshGame(false);
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.equal(game.monsters.length,ENEMY_LIMIT);
assert.equal(game.squadPotion,1);assert.ok(game.squad.every(s=>s.ammo===30));assert.equal(saveSlots.get(game.activeSlotId).data.squadPotion,1,'initial auto-save records the issued potion');assert.equal(saveSlots.get(game.activeSlotId).data.player.ammo,30);
const baseline=structuredClone(game.saveGame());
function field() {
  game.resumeSavedGame(structuredClone(baseline));game.closeStrategyModal();
  Object.assign(game.player,{x:81000,y:81000,atk:100,atkCooldown:0,powerAtkCooldown:0,speed:0});
  game.camera={x:81000,y:81000};game.joystick={active:false,dirX:0,dirY:0};
  game.squad=[];game.reserves=[];game.outposts=[];game.merchants=[];game.civilians=[];game.projectiles=[];game.dropsOnField=[];game.monsters=[];
  game.updateSpawns=noop;game.restTimer=0;game.currentQuest=null;
}
const enemy=(x=81090,y=81000)=>({x,y,type:'goblin',hp:1e6,maxHp:1e6,radius:12,speed:0,atk:1,atkCooldown:100});
const weapon=style=>({id:`test-${style}`,type:'WEAPON',weaponStyle:style,stats:{atk:0}});
// All three loaded projectiles, exact 20% base boost and 75% empty fallback.
for(const [style,type] of [['bow','ARROW'],['crossbow','BOLT'],['cannon','CANNONBALL']]) {
  field();game.equipped.weapon=weapon(style);game.player.ammo=1;game.monsters=[enemy()];game.rebuildMonsterSpatial();game.manualAttack();
  assert.equal(game.player.ammo,0);assert.equal(game.projectiles[0].type,type);assert.equal(game.projectiles[0].damage,120);
  game.projectiles=[];game.player.atkCooldown=0;game.rebuildMonsterSpatial();game.manualAttack();const stone=game.projectiles[0];
  assert.equal(stone.type,'STONE');assert.equal(stone.damage,90);assert.equal(stone.splash,0);assert.equal(stone.knockback,0);
  const profile=ammoCombatProfile(game.player,game.combatProfileFor(game.player,weapon(style),true));assert.equal(profile.splash,0);
  game.player.atkCooldown=100;stone.x=game.monsters[0].x;stone.y=game.monsters[0].y;
  const neighbor=enemy(stone.x+8,stone.y);game.monsters.push(neighbor);const hp=neighbor.hp;
  game.update(.01);assert.equal(neighbor.hp,hp,'stones never damage neighboring enemies');assert.ok(game.monsters[0].hp<1e6);
  // Empty strong attack cannot create explosive / piercing / rain effects.
  game.projectiles=[];game.powerFx=[];game.player.powerAtkCooldown=0;game.triggerPowerAttack();
  assert.ok(game.projectiles.every(p=>p.type==='STONE'));assert.equal(game.powerFx.length,0);
}
assert.equal(weaponCombatProfile(weapon('crossbow')).baseCooldown,1.25);
assert.equal(weaponCombatProfile(weapon('cannon')).baseCooldown,1.85);
assert.ok(masteryReloadMult({cannon:1e10},'cannon')>=.55,'existing mastery reload floor is retained');
field();game.equipped.weapon=weapon('bow');game.player.ammo=4;game.monsters=[enemy()];game.triggerPowerAttack();assert.equal(game.player.ammo,0);assert.equal(game.powerFx.length,4);
// Player automatic shot and real squad AI, including an almost-empty SNIPER burst.
field();game.equipped.weapon=weapon('crossbow');game.player.ammo=2;game.monsters=[enemy()];game.update(.01);assert.equal(game.player.ammo,1);assert.equal(game.projectiles[0].type,'BOLT');
field();game.equipped.weapon=weapon('sword');game.player.atkCooldown=100;
const sniper=structuredClone(baseline.squad[0]);Object.assign(sniper,{soldierClass:'SNIPER',x:81000,y:81000,isPersonalGuard:true,ammo:1,atkCooldown:0,speed:0,isDown:false,hp:1000,maxHp:1000,equipped:{weapon:weapon('bow')},weapon:weapon('bow'),_cachedEnemy:null,_pgTick:0});
game.squad=[sniper];game.monsters=[enemy()];game.update(.01);
assert.equal(sniper.ammo,0);assert.equal(game.projectiles.filter(p=>p.type==='STAR_ARROW').length,1);assert.equal(game.projectiles.filter(p=>p.type==='STONE').length,2);
Object.assign(sniper,{soldierClass:'ARCHER',x:81000,y:81000,ammo:0,speed:100,_pgTick:3,atkCooldown:0});game.monsters=[enemy(81230,81000)];game.projectiles=[];game.update(.01);assert.ok(sniper.x>81000,'an empty archer closes to stone range rather than stopping at bow range');
// Direct structure attacks also consume ammunition; empty stones still deal less damage.
field();game.equipped.weapon=weapon('cannon');game.player.ammo=1;
const op={x:81020,y:81000,radius:50,hp:1e6,maxHp:1e6,type:'FORTRESS',cleared:false};game.outposts=[op];game.rebuildMonsterSpatial();game.manualAttack();assert.equal(game.player.ammo,0);const loss=1e6-op.hp;
game.player.atkCooldown=0;const before=op.hp;game.rebuildMonsterSpatial();game.manualAttack();assert.ok(before-op.hp<loss);
// Automatic supply by each unit's proximity, town entrance, field merchant and town coordinates.
field();game.equipped.weapon=weapon('bow');game.player.ammo=0;updateSupplies(game,.25);assert.equal(game.player.ammo,0);
Object.assign(game.player,{x:79360,y:79360});updateSupplies(game,.25);assert.equal(game.player.ammo,AMMO_CAPACITY);
game.player.ammo=0;const town=game.dungeons.find(d=>d.kind==='town');Object.assign(game.player,town.entrance);assert.equal(supplyLocation(game).kind,'town');updateSupplies(game,.25);assert.equal(game.player.ammo,30);
game.player.ammo=0;game.player.x=81000;game.player.y=81000;game.merchants=[{id:'supply',x:81010,y:81000,hp:10,maxHp:10,placeName:'野営キャンプ'}];updateSupplies(game,.25);assert.equal(game.player.ammo,30);
game.player.ammo=0;game.merchants[0].isDown=true;updateSupplies(game,.25);assert.equal(game.player.ammo,0);
game.currentDungeon={...town};game.player.x=180;game.player.y=town.height/2;updateSupplies(game,.25);assert.equal(game.player.ammo,30);game.currentDungeon=null;
// Picked ammo reaches archers even when a melee soldier or the player collects it.
field();const archer={id:'archer',soldierClass:'ARCHER',x:83000,y:83000,hp:10,maxHp:10,ammo:0,speed:0,atkCooldown:100,equipped:{weapon:weapon('bow')}};
const melee=structuredClone(baseline.squad[0]);Object.assign(melee,{soldierClass:'HEAVY',x:81000,y:81000,hp:1000,maxHp:1000,speed:0,atkCooldown:100,isPersonalGuard:true,equipped:{weapon:weapon('sword')},weapon:weapon('sword')});
game.squad=[melee,archer];game.player.atkCooldown=100;game.dropsOnField=[{x:81000,y:81000,isAmmo:true,ammo:5}];game.update(.01);assert.equal(archer.ammo,5);assert.equal(game.dropsOnField.length,0);assert.equal(game.inventory.length,baseline.inventory.length);
game.squad=[archer];game.dropsOnField=[{x:81000,y:81000,isAmmo:true,ammo:3}];game.update(.01);assert.equal(archer.ammo,8);
archer.ammo=30;distributeAmmo(game,4);assert.equal(game.ammoReserve,4);archer.ammo=28;updateSupplies(game,.25);assert.equal(archer.ammo,30);assert.equal(game.ammoReserve,2);
// Enemy ammo drops are independent of equipment loot.
field();const oldRandom=Math.random;try{Math.random=()=>.1;const mob=enemy();mob.hp=0;game.monsters=[mob];game.killMonster(mob,game.player,true);assert.ok(game.dropsOnField.some(d=>d.isAmmo&&d.ammo>=2&&d.ammo<=6));}finally{Math.random=oldRandom;}
// One controller click consumes exactly one potion; no revival, no double-use.
field();const alive={id:'alive',isPersonalGuard:true,soldierClass:'ARCHER',x:81000,y:81000,hp:1,maxHp:100,ammo:0},down={id:'down',isPersonalGuard:true,x:81000,y:81000,hp:0,maxHp:100,ammo:0,isDown:true},dead={id:'dead',isPersonalGuard:true,hp:0,maxHp:100,dead:true};
const main={id:'main',soldierClass:'MAGE',x:81000,y:81000,hp:2,maxHp:100,ammo:2,mana:3,maxMana:100,magicAffinity:'fire',magicRecovering:true};
const healer={id:'healer',isPersonalGuard:true,soldierClass:'MEDIC',x:81000,y:81000,hp:1,maxHp:100,ammo:0,mana:0};
game.squad=[alive,healer,down,dead,main];game.reserves=[{id:'reserve',isPersonalGuard:true,soldierClass:'MAGE',hp:1,maxHp:50,ammo:1,mana:1,maxMana:100,magicAffinity:'ice',magicRecovering:true}];game.player.hp=1;game.player.ammo=0;
const mainBefore=structuredClone(main),reserveBefore=structuredClone(game.reserves[0]);
document.getElementById('btn-pad-potion').click();assert.equal(game.squadPotion,0);assert.equal(game.player.hp,game.player.maxHp);assert.equal(game.player.ammo,30);assert.equal(alive.hp,100);assert.equal(alive.ammo,30);assert.equal(healer.hp,100);assert.equal(healer.mana,100);assert.equal(down.hp,0);assert.equal(down.ammo,0);assert.equal(dead.hp,0);
assert.deepEqual(main,mainBefore,'co-located main army receives no HP/ammo/mana from potion');assert.deepEqual(game.reserves[0],reserveBefore,'reserves stay excluded even with a stale personal-guard flag');
for(const kind of ['dungeon','ruin','town']){game.currentDungeon={id:'potion-instance',kind};Object.assign(alive,{x:180,y:180,hp:1,ammo:0});healer.hp=1;healer.mana=0;game.squadPotion=1;assert.equal(game.useSquadPotion(),true);assert.equal(alive.hp,100);assert.equal(healer.mana,100);assert.deepEqual(main,mainBefore);assert.deepEqual(game.reserves[0],reserveBefore);}
game.currentDungeon=null;
alive.hp=1;assert.equal(game.useSquadPotion(),false);assert.equal(alive.hp,1);
assert.equal(game.replenishSquadPotion(),false);Object.assign(game.player,{x:79360,y:79360});assert.equal(game.replenishSquadPotion(),true);assert.equal(game.replenishSquadPotion(),false);
game.squadPotion=0;const merchant={id:'vendor',x:79360,y:79360,hp:10,maxHp:10};game.merchants=[merchant];game.gold=299;assert.equal(game.replenishSquadPotion(merchant),false);game.gold=500;assert.equal(game.replenishSquadPotion(merchant),true);assert.equal(game.gold,200);assert.equal(game.replenishSquadPotion(merchant),false);
// Effective lethal damage, player only, exact HP 1 and a 2-second timer.
field();Object.assign(game.player,{hp:100,maxHp:100,def:0,dmgReduction:0,invulnerableTimer:0});game.damageTarget(game.player,100);assert.equal(game.player.hp,1);assert.equal(game.player.invulnerableTimer,2);game.damageTarget(game.player,1000);assert.equal(game.player.hp,1);
assert.equal(game.player.lethalGuardCooldown,LETHAL_GUARD_COOLDOWN);assert.match(document.getElementById('retreat-warning').textContent,/再発動まで120秒/);
assert.equal(document.getElementById('retreat-warning').classList.contains('hidden'),false);updateSupplies(game,1.99);assert.ok(game.player.invulnerableTimer>0);updateSupplies(game,.011);assert.equal(game.player.invulnerableTimer,0);
game.squadPotion=1;assert.equal(game.useSquadPotion(),true);assert.ok(game.player.lethalGuardCooldown>117,'full healing cannot reset the guard');
const cooldownBefore=game.player.lethalGuardCooldown,guardSave=structuredClone(game.saveGame());assert.equal(guardSave.player.lethalGuardCooldown,cooldownBefore);
game.resumeSavedGame(guardSave);assert.equal(game.player.lethalGuardCooldown,cooldownBefore,'save/resume retains the actual cooldown');
game.renderStrategyUI();assert.match(document.querySelector('.lethal-guard-status').textContent,/再発動まで118秒/);
Object.assign(game.player,{x:79360,y:79360});assert.equal(game.saveCheckpoint(),true);game.player.lethalGuardCooldown=0;assert.equal(game.loadCheckpoint(),true);assert.equal(game.player.lethalGuardCooldown,cooldownBefore,'checkpoint loads restore the recorded cooldown too');Object.assign(game.player,{x:81000,y:81000});
game.openStrategyModal(true);game.update(10);assert.equal(game.player.lethalGuardCooldown,cooldownBefore,'paused dialogs do not advance the cooldown');game.closeStrategyModal();
let cooldownDeath=false;const actualGameOver=game.gameOver;game.gameOver=()=>{cooldownDeath=true;};Object.assign(game.player,{hp:100,maxHp:100,def:0,dmgReduction:0,invulnerableTimer:0});game.damageTarget(game.player,1000);assert.equal(cooldownDeath,true,'a second large hit during cooldown really kills the player');assert.equal(game.player.hp,0);assert.equal(game.player.invulnerableTimer,0);
Object.assign(game.player,{hp:100,maxHp:100,def:0,dmgReduction:0});updateSupplies(game,cooldownBefore-.01);assert.ok(game.player.lethalGuardCooldown>0);updateSupplies(game,.02);assert.equal(game.player.lethalGuardCooldown,0);game.damageTarget(game.player,1000);assert.equal(game.player.hp,1);assert.equal(game.player.invulnerableTimer,2);assert.equal(game.player.lethalGuardCooldown,120);game.gameOver=actualGameOver;
const ordinary={id:'ordinary',hp:100,maxHp:100,def:0,soldierClass:'HEAVY'};game.damageTarget(ordinary,1000);assert.ok(ordinary.isDown);assert.equal(ordinary.invulnerableTimer,undefined);
let lost=false;game.gameOver=()=>{lost=true;};Object.assign(game.player,{hp:10,maxHp:100,def:0,invulnerableTimer:0,hitGrowthPct:.4});game.damageTarget(game.player,20);assert.equal(lost,true,'small damage remains lethal at low HP');
// Independent checkpoints, actual UI clicks, immutable snapshot, saved supply state and slot isolation.
field();Object.assign(game.player,{x:79360,y:79360,ammo:7});game.gold=321;game.squadPotion=0;game.renderStrategyUI();document.querySelector('#view-strat-overview [data-supply="save"]').click();
let cp=saveSlots.get(game.activeSlotId).checkpoint;assert.equal(cp.place,'本陣');assert.equal(cp.data.player.ammo,7);assert.equal(cp.data.squadPotion,0);game.gold=999;game.player.ammo=1;game.saveGame();assert.equal(saveSlots.get(game.activeSlotId).checkpoint.data.gold,321);
assert.equal(game.loadCheckpoint(),true);assert.equal(game.gold,321);assert.equal(game.player.ammo,7);assert.equal(game.squadPotion,0);
Object.assign(game.player,{x:81000,y:81000});game.merchants=[];assert.equal(game.saveCheckpoint(),false);assert.equal(game.loadCheckpoint(),false);
const firstSlot=game.activeSlotId;game.activeSlotId=saveSlots.create('OTHER V2 SLOT').id;assert.equal(saveSlots.get(game.activeSlotId).checkpoint,undefined);game.activeSlotId=firstSlot;
// Quota failure must not overwrite the previous checkpoint.
Object.assign(game.player,{x:79360,y:79360});const savedCp=saveSlots.get(firstSlot).checkpoint;const set=dom.window.Storage.prototype.setItem,log=console.warn;console.warn=noop;
try{dom.window.Storage.prototype.setItem=()=>{throw new Error('quota fixture');};assert.equal(game.saveCheckpoint(),false);}finally{dom.window.Storage.prototype.setItem=set;console.warn=log;}
assert.deepEqual(saveSlots.get(firstSlot).checkpoint,savedCp);
// Real town entry records field positions, and a load resumes at that entrance.
game.resumeSavedGame(structuredClone(baseline));game.closeStrategyModal();const actualTown=game.dungeons.find(d=>d.kind==='town');Object.assign(game.player,actualTown.entrance);const entry={x:game.player.x,y:game.player.y};game.enterDungeon(actualTown);
assert.equal(game.currentDungeon.kind,'town');assert.equal(game.saveCheckpoint(),true);cp=saveSlots.get(firstSlot).checkpoint;assert.deepEqual({x:cp.data.player.x,y:cp.data.player.y},entry);assert.equal(game.loadCheckpoint(),true);assert.equal(game.currentDungeon,null);assert.deepEqual({x:game.player.x,y:game.player.y},entry);
const legacy=structuredClone(baseline);delete legacy.squadPotion;delete legacy.ammoReserve;delete legacy.player.ammo;for(const s of legacy.squad)delete s.ammo;game.resumeSavedGame(legacy);assert.equal(game.squadPotion,1);assert.equal(game.player.ammo,30);assert.ok(game.squad.every(s=>s.ammo===30));
delete legacy.player.lethalGuardCooldown;legacy.player.invulnerableTimer=1;game.resumeSavedGame(legacy);assert.equal(game.player.lethalGuardCooldown,120,'legacy saves with active protection receive a cooldown');legacy.player.invulnerableTimer=0;game.resumeSavedGame(legacy);assert.equal(game.player.lethalGuardCooldown,0,'untriggered legacy protection is available');
// A fallen expedition can explicitly resume its manual checkpoint from selection.
Object.assign(game.player,{x:79360,y:79360});game.gold=654;game.saveCheckpoint();game.gold=0;saveSlots.update(game.activeSlotId,{state:'fallen'});
game.resizeCanvas=noop;game.render=noop;game.showSaveMenu();const checkpointButton=document.querySelector(`[data-checkpoint-slot="${game.activeSlotId}"]`);assert.ok(checkpointButton);checkpointButton.click();assert.equal(game.gold,654);assert.equal(saveSlots.get(game.activeSlotId).state,'active');
// Strong enemy experience uses full stats; damage already dealt and low own HP do not change it.
const equal={maxHp:100,hp:100,atk:20,def:10};
assert.equal(strongEnemyReward(10,equal,equal).exp,10);
assert.equal(strongEnemyReward(10,{...equal,maxHp:50,atk:10},equal).exp,10,'weak enemies retain existing XP');
const double={...equal,maxHp:200,atk:40,hp:1};
assert.equal(strongEnemyReward(10,double,equal).exp,50,'twice the full combat power gives 5x XP');
assert.equal(strongEnemyReward(10,double,{...equal,hp:1}).exp,50,'remaining own HP is not an XP farming condition');
assert.ok(strongEnemyReward(10,{...equal,maxHp:101},equal).exp>=20);
assert.ok(strongEnemyReward(10,{...equal,maxHp:10000},equal).exp>=200,'durable enemies are rewarded even without huge attack');
assert.equal(strongEnemyReward(10,{maxHp:1e7,atk:1e6},equal).exp,250,'extreme boss bonus is bounded at 25x');
assert.ok(combatPower({...equal,def:100})>combatPower(equal));
field();game.player.reqExp=1e9;game.player.exp=0;game.exp=0;
const threat={...enemy(),hp:0,maxHp:game.player.maxHp*2,atk:game.player.atk*2,def:game.player.def,lootDistance:0,name:'格上検証敵'};
game.monsters=[threat];game.killMonster(threat,game.player,true);
assert.equal(game.player.exp,30);assert.equal(game.exp,30);assert.equal(game.lastStrongKill.bonusExp,24);
game.renderStrategyUI();assert.match(document.getElementById('kill-xp-summary').textContent,/格上検証敵.*30EXP/);
game.saveGame();assert.equal(saveSlots.get(game.activeSlotId).data.lastStrongKill.exp,30);
field();const strongSoldier=structuredClone(baseline.squad[0]);strongSoldier.reqExp=1e9;strongSoldier.exp=0;game.squad=[strongSoldier];
const soldierThreat={...enemy(),hp:0,maxHp:strongSoldier.maxHp*2,atk:strongSoldier.atk*2,def:strongSoldier.def,dmgReduction:strongSoldier.dmgReduction,lootDistance:0};
game.monsters=[soldierThreat];game.killMonster(soldierThreat,strongSoldier,false);assert.equal(strongSoldier.exp,30,'soldiers receive the same relative-strength bonus');
console.log('PASS: v2 real manual/auto/SNIPER/strong/outpost shots, 20%/75%, single-target stones, supply locations, any-collector ammo, reserve, independent enemy drop; personal-only potion in field/dungeon/ruin/town, no revival/main/reserves; lethal-hit 2s immunity/120s cooldown/second-hit death/rearm/heal/save/checkpoint/pause/legacy; immutable checkpoints/quota/slot isolation/town entry/legacy migration, unchanged population; relative-strength XP/5x/25x/player/soldier/save/display');
dom.window.close();
