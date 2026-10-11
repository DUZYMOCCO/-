import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {WORLD_SIZE}=await import('../js/world.js');
const BASE_CAMP={x:WORLD_SIZE/2,y:WORLD_SIZE/2};
const {saveSlots}=await import('../js/save-slots.js');
const {initializeHeroJourney,rollHeroRevelation,serializeHeroJourney,updateHeroParty,recordDemonKingDefeat,ensureHeroCastle,awardHeroBattle}=await import('../js/hero-party.js');
const {heroMembers,visibleHeroMembers}=await import('../js/hero-rules.js');
const {activeSquad}=await import('../js/instance-rules.js');
const {practiceAttribute}=await import('../js/unit-attributes.js');
const {gainWeaponMastery,applyHitGrowth}=await import('../js/growth-rules.js');
const {grantPersonalExp}=await import('../js/experience-rules.js');
const {updateWounded,markSoldierDown,rescueUnits,treatWounded}=await import('../js/casualty-rules.js');
const {advanceHeroRoute,heroSegmentOpen}=await import('../js/hero-navigation.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {zoneRingPower}=await import('../js/equipment-rules.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('勇者検証').id;game.startFreshGame(false);game.restTimer=0;
game.phase=9;assert.equal(rollHeroRevelation(game,()=>0),false);
game.phase=10;assert.equal(rollHeroRevelation(game,()=>.5),false);assert.equal(rollHeroRevelation(game,()=>0),false,'one roll per phase');
game.phase=11;assert.equal(rollHeroRevelation(game,()=>0),true);
let p=game.heroJourney.party;
assert.equal(p.members.length,6);assert.equal(p.members[0].isChosenHero,true);
assert.deepEqual(p.members.slice(1).map(s=>s.soldierClass),['HEAVY','LIGHT','ARCHER','MEDIC','MAGE']);
assert.ok(p.members.every(s=>s.level===1&&s.talent&&!s.isPersonalGuard));
assert.equal(game.squad.length,48,'separate from deployment');game.normalizeDeployment();assert.equal(heroMembers(game).length,6);
game.phase=12;assert.equal(rollHeroRevelation(game,()=>0),false,'no concurrent second party');
const normal=game.createNewSoldier(null,{talent:'AVERAGE'}),hero=structuredClone(normal);hero.id='growth';hero.heroPartyId=p.id;
normal.reqExp=hero.reqExp=1e6;grantPersonalExp(game,normal,3);grantPersonalExp(game,hero,3);assert.equal(hero.exp,normal.exp*20);
practiceAttribute(normal,'strength',2);practiceAttribute(hero,'strength',2);assert.equal(hero.attributeProfile.practice.strength,normal.attributeProfile.practice.strength*20);
gainWeaponMastery(normal,'sword',2);gainWeaponMastery(hero,'sword',2);assert.equal(hero.weaponMastery.sword,normal.weaponMastery.sword*20);
normal.maxHp=hero.maxHp=100;assert.equal(applyHitGrowth(hero,10).gain,applyHitGrowth(normal,10).gain*20);
assert.equal(Math.round(zoneRingPower(8000)),10);assert.equal(Math.round(zoneRingPower(22000)),100);
game.monsters=[];const x=p.x;for(let i=0;i<60;i++)updateHeroParty(game,.1,SOLDIER_CLASSES);assert.ok(p.x>x+200,'marches without player movement');
assert.ok(p.members.some(u=>u.attributeProfile.practice.travel>0));
const plan={x:BASE_CAMP.x+512,y:BASE_CAMP.y,destination:{x:BASE_CAMP.x+42000,y:BASE_CAMP.y+42000},route:[]};
for(let i=0;i<500&&!plan.route.length;i++)advanceHeroRoute(game,plan,100);
assert.ok(plan.route.length>2,'physical route to castle');for(let i=1;i<plan.route.length;i++)assert.ok(heroSegmentOpen(game,plan.route[i-1],plan.route[i]));
// Shared battle awards every nearby member, and a real attack consumes/levels normal units.
p.members.forEach((u,i)=>{u.x=BASE_CAMP.x+1000+i*8;u.y=BASE_CAMP.y;u.dodge=0;});
game.monsters=[{x:p.members[0].x+10,y:p.members[0].y,hp:1,maxHp:1,atk:1,radius:10,type:'slime'}];
const levels=p.members.map(u=>u.level);game.performAttack(p.members[0],game.monsters[0],false,10000);
assert.equal(game.monsters.length,0);assert.ok(p.members.every((u,i)=>u.level>levels[i]),'party battle EXP shared at x20');
assert.equal(activeSquad(game).length,54);
// The ordinary population culler must retain enemies near the remote hero party.
p.members.forEach(u=>{u.x=BASE_CAMP.x+10000;u.y=BASE_CAMP.y;});
const protectedEnemy={x:BASE_CAMP.x+10050,y:BASE_CAMP.y,hp:100,maxHp:100,atk:1,speed:10,radius:10,type:'slime'};
game.monsters=[protectedEnemy];game.colossalBossRespawnTimer=100;game.updateSpawns(.01);assert.ok(game.monsters.includes(protectedEnemy),'hero encounter survives remote culling');game.monsters=[];
// Unreachable foes behind headquarters walls must not halt the march.
p.x=BASE_CAMP.x+400;p.y=BASE_CAMP.y+100;p.route=[{x:BASE_CAMP.x+700,y:p.y}];p.routeIndex=0;
p.members.forEach(u=>{u.x=p.x;u.y=p.y;});game.monsters=[{x:BASE_CAMP.x+250,y:p.y,hp:100,maxHp:100,atk:1,radius:10,type:'slime'}];
const wallStart=p.x;updateHeroParty(game,.1,SOLDIER_CLASSES);assert.ok(p.x>wallStart,'blocked attack line is not a reachable threat');game.monsters=[];
// Medic rescues fallen hero. Blood loss is real; it does not inflate main-army casualty counts.
const medic=p.members.find(u=>u.soldierClass==='MEDIC'),w=p.members[0];w.x=medic.x;w.y=medic.y;markSoldierDown(game,w);medic.mana=medic.maxMana;
for(let i=0;i<5&&w.isDown;i++)treatWounded(game,medic,w,.5);assert.equal(w.isDown,false);
markSoldierDown(game,w);const casualties=game.phaseCasualties;updateWounded(game,46);updateWounded(game,2.1);assert.equal(w.dead,true);assert.equal(game.phaseCasualties,casualties);
// Hidden field movement/combat when commander is in another instance.
game.currentDungeon=DUNGEON_DEFS.find(d=>d.kind==='town');game.savedFieldMonsters=[];
assert.equal(visibleHeroMembers(game).length,0);assert.ok(!rescueUnits(game).includes(medic));
const s=p.members[1];s.x=BASE_CAMP.x+1100;s.y=BASE_CAMP.y;p.x=s.x;p.y=s.y;
game.savedFieldMonsters=[{x:s.x+1,y:s.y,hp:1,maxHp:1,atk:1,radius:10,type:'slime'}];updateHeroParty(game,.2,SOLDIER_CLASSES);
assert.equal(game.savedFieldMonsters.length,0,'remote field combat runs');
game.currentDungeon=null;
// Saves include positions, down timers, failed chance and history; no target cycles.
const snapshot=game.saveGame();assert.ok(snapshot.heroJourney);const encoded=JSON.stringify(snapshot);
game.resumeSavedGame(JSON.parse(encoded));p=game.heroJourney.party;assert.equal(p.members.length,6);assert.equal(p.members[0].dead,true);assert.equal(game.heroJourney.lastRollPhase,12);
const d=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');const scene=ensureHeroCastle(game,d);scene.monsters.at(-1).hp=543210;
const encodedJourney=JSON.stringify(serializeHeroJourney(game));initializeHeroJourney(game,JSON.parse(encodedJourney));assert.equal(game.heroJourney.castleScene.monsters.at(-1).hp,543210);
// Party reaches the castle and commander joins the SAME scene.
p=game.heroJourney.party;p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;
p.members.forEach(u=>{u.dead=false;u.isDown=false;u.hp=u.maxHp;u.x=p.x;u.y=p.y;});game.monsters=[];
updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(p.space,d.id);
game.enterDungeon(d);assert.equal(game.monsters,game.heroJourney.castleScene.monsters);assert.equal(game.monsters.filter(m=>m.isDemonKing).length,1);assert.equal(visibleHeroMembers(game).length,6);
game.restTimer=8;game.restMonsters=game.monsters.map(m=>({...m,hp:m.hp-1}));game.monsters=[];
assert.equal(serializeHeroJourney(game).castleScene.monsters.at(-1).hp,543209,'rest copies remain authoritative');
game.restTimer=0;game.monsters=game.restMonsters;game.restMonsters=[];
const king=game.monsters.find(m=>m.isDemonKing);king.hp=1;game.killMonster(king,game.player,true);
assert.equal(game.heroJourney.demonKingDefeat.by,'commander');game.exitDungeon();game.enterDungeon(d);assert.ok(!game.monsters.some(m=>m.isDemonKing),'defeated king cannot respawn');
initializeHeroJourney(game);game.currentDungeon=null;game.phase=20;rollHeroRevelation(game,()=>0);recordDemonKingDefeat(game,heroMembers(game)[0]);assert.equal(game.heroJourney.demonKingDefeat.by,'hero');
game.phase=21;assert.equal(rollHeroRevelation(game,()=>0),false,'no revelation after victory');
// All down is a recoverable state; only bleed-out ends a party. New party may appear later.
initializeHeroJourney(game);game.phase=30;rollHeroRevelation(game,()=>0);p=game.heroJourney.party;
p.members.forEach(u=>{u.x=BASE_CAMP.x+1400;u.y=BASE_CAMP.y;markSoldierDown(game,u);});
updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(p.status,'down');updateWounded(game,46);updateWounded(game,2.1);updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(p.status,'fallen');
game.phase=31;assert.equal(rollHeroRevelation(game,()=>0),true);assert.equal(game.heroJourney.history.at(-1).result,'全滅');
console.log('hero-party: revelation, 6 members, x20 growth, autonomous march/battle, rescue, castle scene, victory, saves and defeat passed');
