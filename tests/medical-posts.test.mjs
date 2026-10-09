import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE,WorldTerrain} from '../js/games/iron-squad/world.js';
import {medicalPostLayout,MEDICAL_CASTLE_EXCLUSION,initializeMedicalPosts,updateMedicalPosts,nearestKnownMedicalPost,serializeMedicalPosts,drawMedicalPost,drawMedicalMap,drawTownMedicalReception,drawRescueDirection} from '../js/games/iron-squad/medical-posts.js?v=139';
import {markSoldierDown,updateWounded,attachWounded,attachCivilian,updateCivilians,handleTransportAI,syncDragged} from '../js/games/iron-squad/casualty-rules.js?v=139';
import {supplyLocation,updateSupplies} from '../js/games/iron-squad/supply-rules.js?v=139';
import {replenishTownGateGuards} from '../js/games/iron-squad/gate-rules.js?v=139';
import {updateMagic} from '../js/games/iron-squad/magic-rules.js?v=139';
import {currentFields} from '../js/games/iron-squad/hazard-fields.js?v=139';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame),center=WORLD_SIZE/2;
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MEDICAL TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame());
const fresh=()=>{game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.civilians=[];game.currentQuest=null;game.restTimer=0;};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
assert.equal(game.medicalPosts.length,12);
const castle=game.dungeons.find(d=>d.id==='dungeon_demon_castle').entrance;
for(const p of game.medicalPosts){assert.ok(dist(p,castle)>=MEDICAL_CASTLE_EXCLUSION);assert.ok(p.x>0&&p.y>0&&p.x<WORLD_SIZE&&p.y<WORLD_SIZE);}
const xs=[...new Set(game.medicalPosts.map(p=>p.x))].sort((a,b)=>a-b);assert.equal(xs.length,4);for(let i=1;i<xs.length;i++)assert.equal(xs[i]-xs[i-1],WORLD_SIZE/4);
assert.deepEqual(medicalPostLayout(game),medicalPostLayout(game));assert.equal(nearestKnownMedicalPost(game),null);
const p=game.medicalPosts[0];Object.assign(game.player,{x:p.x+600,y:p.y});updateMedicalPosts(game,.25);assert.equal(p.discovered,true);assert.equal(nearestKnownMedicalPost(game).id,p.id);
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.ok(game.medicalPosts.find(m=>m.id===p.id).discovered);assert.deepEqual(serializeMedicalPosts(game),[p.id]);
const legacy=structuredClone(initial);delete legacy.medicalPostIds;game.resumeSavedGame(legacy);assert.equal(game.medicalPosts.length,12,'old saves get facilities without losing world state');
// Real dragging delivers a soldier and detaches the rope. Aid latches prevent repeat rewards.
fresh();const post=game.medicalPosts[0];post.discovered=true;
const s=game.squad[0];Object.assign(s,{x:post.x+220,y:post.y,hp:s.maxHp});Object.assign(game.player,{x:s.x,y:s.y});markSoldierDown(game,s);assert.equal(attachWounded(game,game.player,s),true);
updateWounded(game,20);assert.equal(s.isDown,true);assert.equal(s.downTimer,45);
game.player.x=post.x;syncDragged(game,1);updateWounded(game,0);assert.equal(s.isDown,false);assert.equal(s.carrierId,undefined);assert.equal(s.hp,s.maxHp);
const paid=game.gold;updateWounded(game,1);assert.equal(game.gold,paid);
// A casualty who fell inside the aid radius still needs reception delivery; no cash/XP farming.
s.x=post.x+130;s.y=post.y;game.player.x=post.x+400;markSoldierDown(game,s);assert.equal(s.downedInAid,true);updateWounded(game,1);assert.equal(s.isDown,true);
game.player.x=s.x;attachWounded(game,game.player,s);updateWounded(game,0);assert.equal(s.isDown,true);game.player.x=post.x;syncDragged(game,1);const beforeReception=game.gold;updateWounded(game,0);assert.equal(s.isDown,false);assert.equal(game.gold,beforeReception);
// Civilian rescue missions receive their existing one-time permanent reward at a clinic.
const civ={id:'clinic-child',kind:'child',name:'子供',x:post.x+200,y:post.y};game.civilians=[civ];game.player.x=civ.x;assert.equal(attachCivilian(game,game.player,civ),true);game.player.x=post.x;syncDragged(game,1);updateCivilians(game,0);assert.equal(civ.rescued,true);assert.equal(civ.rescueStationId,post.id);const count=game.rescueRewardIds.length;updateCivilians(game,0);assert.equal(game.rescueRewardIds.length,count);
// NPCs are accepted locally and transported safely to HQ; town posts refill with a new guard.
fresh();const clinic=game.medicalPosts[1];clinic.discovered=true;const merchant=game.merchants[0],escort=merchant.escorts[0];
for(const npc of [merchant,escort]){npc.x=clinic.x+200;npc.y=clinic.y;game.player.x=npc.x;game.player.y=npc.y;markSoldierDown(game,npc);attachWounded(game,game.player,npc);game.player.x=clinic.x;syncDragged(game,1);updateWounded(game,0);assert.equal(npc.rescuedToBase,true);assert.equal(npc.returningToBase,false);assert.ok(dist(npc,{x:center,y:center})<=115);}
const town=game.dungeons.find(d=>d.kind==='town'),guard=game.gateGuards.find(g=>g.gateTownId===town.id&&g.gateSpace==='field');
guard.x=clinic.x+200;guard.y=clinic.y;game.player.x=guard.x;game.player.y=guard.y;markSoldierDown(game,guard);attachWounded(game,game.player,guard);game.player.x=clinic.x;syncDragged(game,1);updateWounded(game,0);assert.equal(guard.rescuedToBase,true);assert.ok(dist(guard,{x:center,y:center})<=115);const vacant=game.gatePosts.find(p=>p.id===guard.gatePostId);assert.equal(vacant.refillAtPhase,game.phase+2);game.phase+=2;assert.ok(replenishTownGateGuards(game)>0);
assert.ok(game.gateGuards.some(g=>g.gatePostId===guard.gatePostId&&g.id!==guard.id&&!g.rescuedToBase));
// Town entrances accept normal soldiers, including those downed in town's aid zone.
fresh();const town2=game.dungeons.find(d=>d.kind==='town'),soldier=game.squad[0];Object.assign(soldier,{x:town2.entrance.x+200,y:town2.entrance.y});Object.assign(game.player,{x:soldier.x,y:soldier.y});markSoldierDown(game,soldier);attachWounded(game,game.player,soldier);game.player.x=town2.entrance.x;syncDragged(game,1);updateWounded(game,0);assert.equal(soldier.isDown,false);
// Local reception works without mistaking world-space main troops or remote NPCs for town patients.
game.enterDungeon(town2);const localGuard=game.gateGuards.find(g=>g.gateSpace===town2.id);const distant=game.squad.find(s=>!s.isPersonalGuard);distant.x=230;distant.y=town2.height/2;markSoldierDown(game,distant);game.player.x=localGuard.x;game.player.y=localGuard.y;markSoldierDown(game,localGuard);updateWounded(game,0);assert.equal(localGuard.isDown,true);assert.equal(localGuard.carrierId,'player');game.player.x=230;game.player.y=town2.height/2;syncDragged(game,1);updateWounded(game,0);assert.equal(localGuard.isDown,false);assert.equal(localGuard.rescuedToBase,true);assert.equal(localGuard.gateSpace,'field');assert.equal(distant.isDown,true);assert.equal(attachWounded(game,game.player,distant),false,'field-space patients cannot attach to local-town carriers');const visitor=game.squad[4];Object.assign(visitor,{isPersonalGuard:true,x:430,y:town2.height/2});game.player.x=430;markSoldierDown(game,visitor);attachWounded(game,game.player,visitor);game.player.x=230;syncDragged(game,1);updateWounded(game,0);assert.equal(visitor.isDown,false);assert.ok(visitor.x<330,'ordinary soldiers revive in town instead of teleporting to HQ');
game.exitDungeon();assert.ok(dist(localGuard,{x:center,y:center})<=115,'exiting town leaves the rescued guard at HQ');
// Automatic carriers select nearby known aid, rather than HQ across the map.
fresh();const m=game.medicalPosts[0];m.discovered=true;const carrier=game.squad[0],patient=game.squad[1];Object.assign(carrier,{x:m.x+300,y:m.y,soldierClass:'HEAVY'});Object.assign(patient,{x:carrier.x,y:carrier.y});game.player.x=center;game.player.y=center;markSoldierDown(game,patient);handleTransportAI(game,carrier,.1);assert.equal(patient.carrierId,carrier.id);const oldX=carrier.x;handleTransportAI(game,carrier,1);assert.ok(carrier.x<oldX);
assert.equal(supplyLocation(game,{x:m.x,y:m.y}).kind,'medical');const archer=game.squad[2],medic=game.squad[3];Object.assign(archer,{soldierClass:'ARCHER',x:m.x,y:m.y,ammo:0});Object.assign(medic,{soldierClass:'MEDIC',x:m.x,y:m.y,mana:0});updateSupplies(game,.25);updateMagic(game,.25,supplyLocation);assert.equal(archer.ammo,30);assert.equal(medic.mana,medic.maxMana);game.player.x=m.x;game.player.y=m.y;assert.equal(game.saveCheckpoint(),true);assert.equal(saveSlots.get(game.activeSlotId).checkpoint.place,m.name);assert.ok(currentFields(game).every(f=>dist(f,m)>f.radius+m.radius));
// Direction chooses the nearest KNOWN station, respects town mode and transport locks.
game.medicalPosts[1].discovered=true;game.player.x=game.medicalPosts[1].x+5;game.player.y=game.medicalPosts[1].y;assert.equal(nearestKnownMedicalPost(game).id,game.medicalPosts[1].id);game.medicalPosts[1].discovered=false;assert.equal(nearestKnownMedicalPost(game).id,m.id);
patient.x=game.player.x;patient.y=game.player.y;delete patient.carrierId;attachWounded(game,game.player,patient);game.updateStatsUI();assert.match(document.getElementById('transport-status').textContent,/第1救護所/);assert.match(document.getElementById('transport-status').textContent,/[←↖↙]/);
game.worldTerrain=new WorldTerrain();game.openWorldMap();assert.match(document.getElementById('fast-travel-list').textContent,/第1救護所/);assert.doesNotMatch(document.getElementById('fast-travel-list').textContent,/第2救護所/);const pos={x:game.player.x,y:game.player.y};game.fastTravelTo(m.x,m.y,m.name);assert.equal(game.player.x,pos.x);assert.equal(game.player.y,pos.y,'carrying still prohibits map travel');game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.squad.find(u=>u.id===patient.id).carrierId,'player');assert.ok(game.medicalPosts.find(p=>p.id===m.id).discovered);
// Native Canvas verifies building, known map marker and directional arrow actually render.
const {createCanvas,GlobalFonts}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','sans-serif');const canvas=createCanvas(340,260),c=canvas.getContext('2d');
c.translate(170-m.x,145-m.y);drawMedicalPost(c,m);assert.ok(c.getImageData(105,100,130,75).data.some((v,i)=>i%4===3&&v>0));if(process.env.MEDICAL_REVIEW_DIR){mkdirSync(process.env.MEDICAL_REVIEW_DIR,{recursive:true});const preview=createCanvas(340,260),pc=preview.getContext('2d');pc.fillStyle='#465c43';pc.fillRect(0,0,340,260);pc.drawImage(canvas,0,0);writeFileSync(resolve(process.env.MEDICAL_REVIEW_DIR,'medical-post.png'),preview.toBuffer('image/png'));}c.resetTransform();c.clearRect(0,0,340,260);drawMedicalMap(c,game,x=>100,y=>100);assert.ok(c.getImageData(96,96,8,8).data.some((v,i)=>i%4===3&&v>0));
c.clearRect(0,0,340,260);game.player.x=m.x+500;game.player.y=m.y;c.translate(170-game.player.x,130-game.player.y);drawRescueDirection(c,game,true);assert.ok(c.getImageData(80,115,50,30).data.some((v,i)=>i%4===3&&v>0));c.resetTransform();c.clearRect(0,0,340,260);drawRescueDirection(c,game,false);assert.ok(c.getImageData(0,0,340,260).data.every(v=>v===0));
c.clearRect(0,0,340,260);for(const p of game.medicalPosts)p.discovered=false;drawRescueDirection(c,game,true);assert.ok(c.getImageData(0,0,340,260).data.every(v=>v===0),'unknown posts do not receive a direction arrow');c.translate(-60,130-town2.height/2);drawTownMedicalReception(c,town2);assert.ok(c.getImageData(130,155,80,100).data.some((v,i)=>i%4===3&&v>0));
console.log('PASS: 12 uniform clinics/castle exclusion, discovery/save/migration, rope delivery/revival/anti-farm, civilian rewards, merchant/escort/guard HQ transfer and replacement, town local/world coordinates, AI transport, supplies/hazard clearance, known-only arrows/maps/travel lock, native Canvas');dom.window.close();
