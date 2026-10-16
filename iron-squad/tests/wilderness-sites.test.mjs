import assert from 'node:assert/strict';
import {initializeWildernessSites,serializeWildernessSites,updateWildernessSites,recordWildernessGuardKill,wildernessLayout,WILDERNESS_RULES} from '../js/wilderness-sites.js';
import {fieldTerrainAt,biomeAt,WORLD_SIZE,biomeTerrainAllowed} from '../js/world.js';
import {terrainCell} from '../js/biome-terrain.js?v=289';
import {medicalPostLayout} from '../js/medical-posts.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
for(const name of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','gainExp'])game[name]=()=>{};
game.activeSlotId=saveSlots.create('奥地の検証').id;game.startFreshGame(false);game.currentQuest=null;
const C=WORLD_SIZE/2,posts=structuredClone(game.medicalPosts),sites=game.wildernessSites;
assert.equal(sites.length,48);assert.equal(game.outposts.length,12,'the existing outposts are untouched');assert.deepEqual(medicalPostLayout(game).map(p=>[p.id,p.x,p.y]),posts.map(p=>[p.id,p.x,p.y]),'all 22 medical posts retain the same coordinates');
for(const region of ['east','south','north','west'])for(const kind of ['ruin','camp','shrine','tower'])assert.equal(sites.filter(s=>s.region===region&&s.kind===kind).length,3);
for(const s of sites){assert.ok(Math.hypot(s.x-C,s.y-C)>22000);assert.equal(biomeAt(s.x,s.y).id,s.region);assert.equal(fieldTerrainAt(s.x,s.y),'open');assert.ok(posts.every(p=>Math.hypot(p.x-s.x,p.y-s.y)>=1200));}
const layout=wildernessLayout(game);sites[0].cleared=true;assert.equal(layout[0].cleared,undefined,'cached layout is isolated from progress');sites[0].cleared=false;
const near=s=>{Object.assign(game.player,{x:s.x,y:s.y,hp:game.player.maxHp||100,isDown:false});game.currentDungeon=null;game.restTimer=0;};
// A vanished/despawned guard is not a defeated guard. Revisiting fills only the gap.
const camp=sites.find(s=>s.kind==='camp');near(camp);game.monsters=[];updateWildernessSites(game,.3);assert.equal(game.monsters.length,4);assert.ok(game.monsters.every(m=>m.wildernessSiteId===camp.id));assert.equal(game.claimWildernessSite(camp),false);
game.monsters=[];updateWildernessSites(game,.3);assert.equal(camp.guardsDefeated,0);assert.equal(game.monsters.length,4);
let first=game.monsters[0];first.hp=0;game.killMonster(first,game.player,true);assert.equal(camp.guardsDefeated,1,'actual death goes through the game hook');recordWildernessGuardKill(game,first);assert.equal(camp.guardsDefeated,1,'no double credit');
game.monsters=[];updateWildernessSites(game,.3);assert.equal(game.monsters.length,3,'only remaining guards return');
for(const m of [...game.monsters]){m.hp=0;game.killMonster(m,game.player,true);}assert.equal(camp.guardsDefeated,4);updateWildernessSites(game,.3);assert.equal(camp.cleared,true);const campGold=game.gold;assert.equal(game.claimWildernessSite(camp),false);assert.equal(game.gold,campGold);
const ruin=sites.find(s=>s.kind==='ruin');near(ruin);const loot=game.dropsOnField.length;updateWildernessSites(game,.3);assert.equal(ruin.cleared,true);assert.ok(game.dropsOnField.length>=loot+2);assert.equal(game.claimWildernessSite(ruin),false);
const shrine=sites.find(s=>s.kind==='shrine');near(shrine);updateWildernessSites(game,.3);assert.equal(game.wildernessBlessing,180);assert.equal(game.claimWildernessSite(shrine),false);
const random=Math.random;try{
 Math.random=()=>.99;const target={type:'orc',x:game.player.x+10,y:game.player.y,hp:1e9,maxHp:1e9,radius:15,def:0,atk:0};game.monsters=[target];game.player.crit=0;
 game.wildernessBlessing=0;game.performAttack(game.player,target,true,100,false,'physical');const base=1e9-target.hp;
 target.hp=1e9;game.wildernessBlessing=180;game.performAttack(game.player,target,true,100,false,'physical');const buffed=1e9-target.hp;assert.ok(buffed>=base*1.14&&buffed<=base*1.16,'temporary blessing affects real combat');
}finally{Math.random=random;}
const tower=sites.find(s=>s.kind==='tower');near(tower);const distant={x:tower.x+3500,y:tower.y};assert.equal(game.fog.isExploredWorld(distant.x,distant.y),false);updateWildernessSites(game,.3);assert.equal(tower.cleared,true);assert.equal(game.fog.isExploredWorld(distant.x,distant.y),true);
const save=structuredClone(game.saveGame({immediate:true}));assert.equal(save.wildernessSites.length,48);assert.ok(save.wildernessBlessing>170);game.resumeSavedGame(save);assert.equal(game.wildernessSites.find(s=>s.id===camp.id).cleared,true);assert.ok(game.wildernessBlessing>170);assert.equal(game.fog.isExploredWorld(distant.x,distant.y),true);
const before=serializeWildernessSites(game);let saves=0;game.saveGame=()=>{saves++;};game.currentDungeon={id:'inside'};updateWildernessSites(game,181);assert.equal(game.wildernessBlessing,0);assert.deepEqual(serializeWildernessSites(game),before);assert.equal(saves,0,'discovery/reward timers add no automatic synchronous saves');
initializeWildernessSites(game,{});assert.equal(game.wildernessSites.length,48);assert.ok(game.wildernessSites.every(s=>!s.cleared));assert.equal(game.wildernessBlessing,0,'old saves and fresh sessions do not inherit a previous blessing');
const otherCamp=game.wildernessSites.find(s=>s.kind==='camp');near(otherCamp);game.monsters=Array.from({length:39},()=>({hp:1}));updateWildernessSites(game,.3);assert.equal(game.monsters.length,40,'a camp respects the common cap even with one slot left');
const pond=terrainCell(49,80,biomeTerrainAllowed).find(f=>f.kind==='water');assert.ok(pond);
for(const flying of [false,true]){
 const fixture=Object.create(IronSquadGame),x=pond.x,y=pond.y+90;
 Object.assign(fixture,{player:{x:x+18,y,_openX:x,_openY:y,_terrainSpace:'field',isAdvanced:true,flying},squad:[],reserves:[],monsters:[],platoons:[],civilians:[],merchants:[]});fixture.settleTerrain();assert.ok(Math.abs(fixture.player.x-x-(flying?18:18*.85))<.001,'ground classes slow in water; flight stays free');
}
assert.equal(WILDERNESS_RULES.guards,4);console.log('PASS: 48 sparse far sites, unchanged 22 medical/12 old outposts, visible open ground, actual 4-guard deaths/cap/revisit, once-only loot, real temporary attack bonus/expiry, tower fog, save/migration and no extra saves');
