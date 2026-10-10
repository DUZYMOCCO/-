import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {createRequire} from 'node:module';
import {writeFileSync,readFileSync} from 'node:fs';
import {RANGED_ENEMIES,configureRangedEnemy,updateRangedEnemy,updateHostileBolt,updateDefenseWalls,interceptHostileShot,drawDefenseWalls} from '../js/games/iron-squad/enemy-ranged.js';
import {LIMITED_CLASSES,LIMITED_SETTLEMENTS,createLimitedAlly,prepareLimitedEncounter,joinLimitedEncounter,updateNinja,updateShuriken} from '../js/games/iron-squad/limited-allies.js';
import {shareCommanderExp,grantPersonalExp} from '../js/games/iron-squad/experience-rules.js';
import {fieldBlocks} from '../js/games/iron-squad/world.js';
import {dungeonBlocks,DUNGEON_DEFS} from '../js/games/iron-squad/dungeon.js';
import {isMage,ensureMana} from '../js/games/iron-squad/magic-rules.js';
import {canUseWeapon} from '../js/games/iron-squad/weapon-requirements.js';
import {rollScoutCandidate,RECRUIT_CLASSES} from '../js/games/iron-squad/recruitment.js';
import {drawSoldierPortrait} from '../js/games/iron-squad/soldier-appearance.js';
import {drawFieldMob,drawFieldSoldier} from '../js/games/iron-squad/visuals.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const css=document.createElement('style');css.textContent=['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(`css/${name}.css`,'utf8')).join('\n');document.head.append(css);
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,SOLDIER_PHYS_DMG_MULT}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('COMBAT ALLIES TEST ONLY').id;game.startFreshGame(false);
const base=structuredClone(game.saveGame());
function field(){game.resumeSavedGame(structuredClone(base));game.closeStrategyModal();Object.assign(game,{rankIndex:4,squad:[],reserves:[],monsters:[],outposts:[],merchants:[],civilians:[],projectiles:[],dropsOnField:[],currentQuest:null,restTimer:0,_monsterGrid:null,_hazardClock:0,updateSpawns:noop,worldTerrain:{tiles:new Map()}});Object.assign(game.player,{x:83000,y:83000,atkCooldown:100});game.recalcPlayerStats();game.player.hp=game.player.maxHp;game.player.dodge=game.player.crit=0;game.camera={x:83000,y:83000};game.joystick={active:false,dirX:0,dirY:0};}
const mob=(extra={})=>({x:83200,y:83000,type:'goblin',hp:10000,maxHp:10000,atk:30,speed:0,radius:12,atkTimer:0,...extra});
function guard(y=83030,capacity=10000){const s=game.createNewSoldier(null,{classKey:'HEAVY'});Object.assign(s,{x:83070,y,isPersonalGuard:true,speed:0,dodge:0,defenseTimer:3,defenseCooldown:9,defenseAngle:0,defenseCapacity:capacity});game.squad=[s];return s;}
const shot=(kind='physical',extra={})=>({type:'ENEMY_BOLT',x:83200,y:83000,vx:-600,vy:0,life:2,damage:30,damageKind:kind,...extra});
// Real ranged AI launches all six roles; physical/magic defenses remain independent.
for(const [kind,def] of Object.entries(RANGED_ENEMIES)){
 field();const enemy=configureRangedEnemy(mob(),{forceType:kind});enemy.atkTimer=0;game.monsters=[enemy];
 game.update(.01);assert.ok(game.projectiles.some(p=>p.type==='ENEMY_BOLT'),`${kind} fires through full update`);
 const p=game.projectiles.find(p=>p.type==='ENEMY_BOLT'),before=game.player.hp,trained=game.player.attributeProfile.practice.magicDefense;
 assert.equal(p.damageKind,def.kind);assert.equal(p.element,def.element);assert.equal(updateHostileBolt(game,p,1),true);assert.ok(game.player.hp<before);
 if(def.kind==='physical')assert.equal(game.player.attributeProfile.practice.magicDefense,trained);else assert.ok(game.player.attributeProfile.practice.magicDefense>trained);
}
// Low/high frame times cannot tunnel through a deployed front shield.
for(const kind of ['physical','elemental','magic'])for(const dt of [.1,.5]){
 field();const s=guard(),p=shot(kind),hp=game.player.hp;let done=false;
 for(let n=0;n<8&&!done;n++)done=updateHostileBolt(game,p,dt);
 assert.equal(done,true);assert.equal(game.player.hp,hp);assert.equal(s.defenseBlocked,30);assert.ok(s.phaseActivity.combatActions>0);
}
field();const weak=guard(83030,5),penetrating=shot();const hp=game.player.hp;updateHostileBolt(game,penetrating,.5);assert.equal(weak.defenseCapacity,0);assert.equal(weak.defenseTimer,0);assert.equal(penetrating.damage,25);assert.ok(game.player.hp<hp);
field();guard(83130);const flank=shot(),flankHp=game.player.hp;updateHostileBolt(game,flank,.5);assert.ok(game.player.hp<flankHp,'flanks are outside the shield segment');
field();const down=guard();down.isDown=true;down.hp=0;const exposed=game.player.hp;updateHostileBolt(game,shot(),.5);assert.ok(game.player.hp<exposed,'downed guards cannot block');
for(const type of ['BREATH_FLAME','TITAN_BEAM']){field();guard();assert.equal(interceptHostileShot(game,{...shot(),type},{x:83200,y:83000},{x:83000,y:83000}),true);}
field();const auto=guard();auto.defenseTimer=0;auto.defenseCooldown=0;game.monsters=[configureRangedEnemy(mob(),{forceType:'dark_mage'})];updateDefenseWalls(game,.1);assert.equal(auto.defenseTimer,3);assert.equal(auto.defenseCooldown,9);auto.equipped.shield=null;updateDefenseWalls(game,.1);assert.equal(auto.defenseTimer,0);
// Protect NPC trade targets too, and cap simultaneous enemy shots.
field();game.player.y+=100;const npc={isCommerce:true,x:83000,y:83000,hp:100,maxHp:100};let received=0;const damage=game.damageTarget;game.damageTarget=(u,n,o)=>{if(u===npc){received+=n;npc.hp-=n;}else damage.call(game,u,n,o);};assert.equal(updateHostileBolt(game,{...shot(),target:npc},.5),true);assert.ok(received>0);game.damageTarget=damage;
field();const firing=configureRangedEnemy(mob(),{forceType:'goblin_archer'});game.projectiles=Array.from({length:64},()=>shot());firing.atkTimer=0;updateRangedEnemy(game,firing,game.player,.1);assert.equal(game.projectiles.length,64);
field();game.player.y+=100;const foreignGuard={id:'town-guard',isGateGuard:true,gateSpace:'ninja_village',x:83000,y:83000,hp:100,maxHp:100};game.gateGuards=[foreignGuard];assert.equal(updateHostileBolt(game,shot(),.5),false);assert.equal(foreignGuard.hp,100,'town guard coordinates cannot become field hitboxes');
// Each personal guard receives a bonus, with fractional awards and no feedback loop.
field();const personal=game.createNewSoldier(),main=game.createNewSoldier(),dead=game.createNewSoldier();personal.isPersonalGuard=dead.isPersonalGuard=true;dead.dead=true;personal.reqExp=1e9;game.squad=[personal,main,dead,personal];game.reserves=[{...main,id:'reserve',isPersonalGuard:true}];
const earned=game.exp;game.gainExp(100);assert.equal(game.exp,earned+100);assert.equal(personal.commanderBonusExp,20);assert.equal(personal.exp,20);assert.equal(main.exp,0);assert.equal(dead.exp,0);assert.equal(game.reserves[0].exp,0);
for(let n=0;n<5;n++)game.gainExp(1);assert.equal(personal.commanderBonusExp,21);assert.ok(personal.commanderBonusRemainder<1e-8);
grantPersonalExp(game,game.player,50);assert.equal(personal.commanderBonusExp,31);game.gainExp(50,{share:false});assert.equal(personal.commanderBonusExp,31);
const fallen=game.createNewSoldier();Object.assign(fallen,{isPersonalGuard:true,isDown:true,hp:0});game.squad=[fallen];shareCommanderExp(game,100);assert.equal(fallen.level,2);assert.equal(fallen.hp,0);assert.equal(fallen.isDown,true);
field();const peer=game.createNewSoldier();peer.isPersonalGuard=true;peer.reqExp=1e9;game.squad=[peer];const victim=mob({hp:0,maxHp:10});game.monsters=[victim];game.killMonster(victim,peer,false);assert.equal(peer.commanderBonusExp||0,0,'soldier kill adds rank credit, not captain bonus');
const victim2=mob({hp:0,maxHp:10});game.monsters=[victim2];const rankBefore=game.exp;game.killMonster(victim2,game.player,true);assert.equal(peer.commanderBonusExp,Math.floor((game.exp-rankBefore)*.2));
game.gainExp(1);const remainder=peer.commanderBonusRemainder;const xpSave=structuredClone(game.saveGame());game.resumeSavedGame(xpSave);assert.equal(game.squad.find(s=>s.id===peer.id).commanderBonusRemainder,remainder);
// Limited classes never enter the normal recruitment pool.
field();const people=Object.keys(LIMITED_CLASSES).map(id=>createLimitedAlly(game,id,'test'));
for(const s of people){assert.equal(s.soldierClass,LIMITED_CLASSES[s.soldierClass].id);assert.equal(s.combatClass,LIMITED_CLASSES[s.soldierClass].combatClass);assert.ok(s.maxHp>0);assert.ok(s.attributeProfile);assert.ok(!RECRUIT_CLASSES.includes(s.soldierClass));}
const fox=people.find(s=>s.species==='fox');assert.equal(isMage(fox),true);assert.equal(ensureMana(fox),100);assert.equal(canUseWeapon(fox,fox.weapon),true,'rare muscular fox casters can also hold valid melee weapons');
for(let n=0;n<20;n++){game.scoutClass='NINJA';assert.ok(RECRUIT_CLASSES.includes(rollScoutCandidate(game).classKey));}
const castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle'),village=game.dungeons.find(d=>d.id==='ninja_village');assert.ok(Math.hypot(village.entrance.x-castle.entrance.x,village.entrance.y-castle.entrance.y)<3000);
for(const d of LIMITED_SETTLEMENTS)assert.equal(fieldBlocks(d.entrance.x,d.entrance.y),false,'settlement entrance is walkable');
// Talk through the actual UI, preserve the same individual and prevent repeated rewards.
field();game.enterDungeon(village);const volunteer=prepareLimitedEncounter(game,village),id=volunteer.unit.id;assert.equal(prepareLimitedEncounter(game,village).unit.id,id);Object.assign(game.player,{x:volunteer.x,y:volunteer.y});game.updateStatsUI();assert.equal(window.getComputedStyle(document.getElementById('btn-limited-ally')).pointerEvents,'auto');document.getElementById('btn-limited-ally').click();assert.ok(game.squad.some(s=>s.id===id));assert.equal(volunteer.joined,true);assert.equal(joinLimitedEncounter(game,volunteer.id),false);assert.equal(game.squad.filter(s=>s.id===id).length,1);game.exitDungeon();assert.ok(Math.hypot(game.squad.find(s=>s.id===id).x-game.player.x,game.squad.find(s=>s.id===id).y-game.player.y)<60);
game.enterDungeon(village);assert.equal(prepareLimitedEncounter(game,village).joined,true);game.exitDungeon();game.phase++;game.enterDungeon(village);const next=prepareLimitedEncounter(game,village);assert.notEqual(next.unit.id,id);game.exitDungeon();
field();game.squad=Array.from({length:game.limitedDeploymentLimit()},()=>game.createNewSoldier());game.enterDungeon(village);const fullArmy=prepareLimitedEncounter(game,village);Object.assign(game.player,{x:fullArmy.x,y:fullArmy.y});assert.equal(joinLimitedEncounter(game,fullArmy.id),true);{const ally=game.squad.find(s=>s.id===fullArmy.unit.id);assert.ok(ally&&ally.isPersonalGuard,'volunteer follows the commander even when the army is full');assert.ok(!game.reserves.some(s=>s.id===ally.id),'never absorbed into reserves');assert.ok(Math.hypot(ally.x-game.player.x,ally.y-game.player.y)<80,'spawns beside the commander');}game.exitDungeon();
// Persistent captive, nearby enemy gate, once-only rescue, full-party reserve fallback.
field();const dungeon=game.dungeons.find(d=>d.id==='dungeon_goblin_mines');game.enterDungeon(dungeon);let captive=prepareLimitedEncounter(game,dungeon);assert.equal(dungeonBlocks(dungeon,captive.x,captive.y),false);const captiveId=captive.unit.id;const captiveSave=structuredClone(game.saveGame());game.resumeSavedGame(captiveSave);game.enterDungeon(game.dungeons.find(d=>d.id===dungeon.id));captive=prepareLimitedEncounter(game,game.currentDungeon);assert.equal(captive.unit.id,captiveId);
Object.assign(game.player,{x:captive.x,y:captive.y});game.monsters=[mob({x:captive.x+10,y:captive.y})];assert.equal(joinLimitedEncounter(game,captive.id),false);game.monsters=[];const limit=game.limitedGuardLimit();game.squad=Array.from({length:limit},()=>{const s=game.createNewSoldier();s.isPersonalGuard=true;return s;});assert.equal(joinLimitedEncounter(game,captive.id),true);{const ally=game.squad.find(s=>s.id===captiveId);assert.ok(ally&&ally.isPersonalGuard&&ally.overflowGuard,'full guard: rescued ally follows as overflow guard');assert.ok(!game.reserves.some(s=>s.id===captiveId));assert.ok(Math.hypot(ally.x-game.player.x,ally.y-game.player.y)<80);}const joinedSave=structuredClone(game.saveGame());game.resumeSavedGame(structuredClone(joinedSave));game.enterDungeon(game.dungeons.find(d=>d.id===dungeon.id));assert.equal(prepareLimitedEncounter(game,game.currentDungeon).joined,true);assert.equal([...game.squad,...game.reserves].filter(s=>s.id===captiveId).length,1);
// A ninja really throws at range, strikes nearby, and does not need arrows.
field();const ninja=createLimitedAlly(game,'NINJA','test');Object.assign(ninja,{x:83000,y:83000,isPersonalGuard:true,speed:0,atkCooldown:0,ammo:0});game.squad=[ninja];game.monsters=[mob()];game.rebuildMonsterSpatial();updateNinja(game,ninja,.01,game.platoons[0],SOLDIER_PHYS_DMG_MULT);assert.equal(game.projectiles[0].type,'NINJA_SHURIKEN');const shuriken=game.projectiles[0],farHp=shuriken.target.hp;assert.equal(updateShuriken(game,shuriken,1),true);assert.ok(shuriken.target.hp<farHp);assert.equal(ninja.ammo,0);assert.equal(ninja.attributeProfile.practice.strength,.35);
ninja.atkCooldown=0;game.projectiles=[];game.monsters=[mob({x:ninja.x+30})];game.rebuildMonsterSpatial();const closeHp=game.monsters[0].hp;updateNinja(game,ninja,.01,game.platoons[0],SOLDIER_PHYS_DMG_MULT);assert.ok(game.monsters[0].hp<closeHp);assert.equal(game.projectiles.length,0);assert.ok(ninja.attributeProfile.practice.strength>=1.35);
saveSlots.update(game.activeSlotId,{state:'fallen',data:joinedSave,veterans:[],reserveSurvivors:joinedSave.reserves});game.startFreshGame(true);assert.equal(game.limitedAllies.encounters.find(e=>e.unit.id===captiveId).joined,true,'same-expedition reenlistment cannot regenerate a rescued captive');assert.ok(!game.squad.some(s=>s.id===captiveId)&&!game.reserves.some(s=>s.id===captiveId),'a fallen expedition does not duplicate the rescued ally (field squad is not a survivor pool)');
for(const place of DUNGEON_DEFS.filter(d=>d.guardian)){field();game.enterDungeon(game.dungeons.find(d=>d.id===place.id));const keeper=game.monsters.find(m=>m.isDungeonBoss);assert.equal(keeper.type,place.guardian.type||'orc');assert.equal(keeper.rangedKind,undefined,'authored guardians keep their original attack');game.exitDungeon();}
// Actual code/native Canvas proof: distinct races/roles, enemy weapon silhouettes, shield.
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Yu Gothic');
const image=createCanvas(1080,650),c=image.getContext('2d');c.fillStyle='#17232b';c.fillRect(0,0,1080,650);c.fillStyle='#dccca1';c.font='24px "Yu Gothic"';c.fillText('探索で出会う仲間 · 敵の射撃と防御展開',24,34);
for(const [j,s] of people.entries()){const face=createCanvas(125,130);drawSoldierPortrait(face.getContext('2d'),s,125,130);c.drawImage(face,25+j*175,60);c.fillStyle='#e0d5b6';c.font='16px "Yu Gothic"';c.fillText(LIMITED_CLASSES[s.soldierClass].name,30+j*175,215);}
for(const [j,[type,def]] of Object.entries(RANGED_ENEMIES).entries()){c.save();c.translate(86+j*175,320);c.scale(2.3,2.3);drawFieldMob(c,{...mob(),x:0,y:0,type},0);c.restore();c.fillStyle=def.color;c.font='15px "Yu Gothic"';c.fillText(def.name,20+j*175,350);}
field();const shield=guard(83030);c.save();c.translate(380,465);c.scale(1.5,1.5);c.translate(-83000,-83000);drawFieldSoldier(c,{...shield,portrait:true},0,SOLDIER_CLASSES.HEAVY,'#c7b078',false);drawDefenseWalls(c,game);c.restore();
for(const [y,color] of [[447,'#c8b898'],[492,'#bc795f'],[537,'#9b89af']]){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(740,y);c.lineTo(550,y);c.lineTo(557,y-4);c.moveTo(550,y);c.lineTo(557,y+4);c.stroke();}
c.fillStyle='#dacba4';c.font='19px "Yu Gothic"';c.fillText('前方の弾を遮断 · 側面は通る · 耐久が尽きると突破',40,620);
writeFileSync('docs/previews/limited-allies-and-shields-v4.1.0.png',image.toBuffer('image/png'));
console.log('PASS: six real ranged AIs, three defenses, swept shield/penetration/flanks/downs/legacy shots, shared EXP/fractions/no double credit/saves, six limited classes/ordinary exclusion, village/UI/coordinates/cage/once-only/reserves, ninja near/far, native visuals');dom.window.close();
