import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {updateAmbientCrowd,ambientResidents,ambientSnapshot,ambientSoldierPose,ambientFarmPosts,resetAmbientCrowd,ambientRoute,ambientBlocked,AMBIENT_LIMITS,configureAmbientSettings,AMBIENT_SETTING_KEY} from '../js/town-ambient.js';
import {WORLD_SIZE,TAVERN_SITE,SETTLEMENTS} from '../js/world.js';
import {messPoint,gardenPoint} from '../js/camp-leisure.js';
import {FARM_X,FARM_Y} from '../js/reserve-farm.js';
import {persistentUnit} from '../js/render-support.js';
const C=WORLD_SIZE/2;
const g={camera:{x:C,y:C+70},width:390,height:844,zoom:1,player:{x:C,y:C},worldTime:80,nation:{level:0},squad:[],reserves:[],monsters:[],civilians:[],_campYardQuiet:true,ambientDensity:'normal'};
const step=(n=1,dt=1/60)=>{for(let i=0;i<n;i++)updateAmbientCrowd(g,dt);};
assert.equal(ambientSnapshot(g).populations,0,'lazy population');step(60);assert.ok(ambientResidents(g).length>0);assert.ok(ambientResidents(g).every(p=>p.ambient&&!('hp'in p)));assert.equal(g.civilians.length,0);
const identities=ambientResidents(g).map(p=>({id:p.id,appearance:structuredClone(p.appearance)}));resetAmbientCrowd(g);step(60);for(const p of ambientResidents(g)){const old=identities.find(v=>v.id===p.id);if(old)assert.deepEqual(old.appearance,p.appearance);}
const day=ambientSnapshot(g).residents;g.worldTime=300;step(60);assert.ok(ambientSnapshot(g).residents<day,'fewer at night');g.worldTime=80;
for(const [setting,max] of [['many',16],['normal',10],['few',5],['none',0]]){g.ambientDensity=setting;step(60);assert.ok(ambientSnapshot(g).residents<=max);}
g.ambientDensity='many';g.camera={x:TAVERN_SITE.x,y:TAVERN_SITE.y+180};resetAmbientCrowd(g);step(90);const tavernDay=ambientSnapshot(g).residents;g.worldTime=300;step(60);assert.ok(ambientSnapshot(g).residents>tavernDay,'more adults at tavern at night');assert.ok(ambientResidents(g).every(p=>p.kind!=='child'));g.worldTime=80;
g.camera={x:C,y:C+70};resetAmbientCrowd(g);step(60);g.monsters=[{x:C,y:C+100,hp:100}];step(180);assert.equal(ambientSnapshot(g).residents,0,'flee and disappear');g.monsters=[];step(60);const early=ambientSnapshot(g).residents;step(500);assert.ok(ambientSnapshot(g).residents>early,'staggered reappearance');
// Cached sites are bounded; far actors stop updating.
const captured=ambientResidents(g)[0],old={x:captured.x,y:captured.y};g.camera={x:1000,y:1000};step(120);assert.equal(ambientSnapshot(g).residents,0);assert.equal(captured.x,old.x);assert.equal(captured.y,old.y);
for(const s of SETTLEMENTS.filter(s=>s.kind==='town')){g.camera={x:C+s.ox,y:C+s.oy};step(40);}assert.ok(ambientSnapshot(g).populations<=AMBIENT_LIMITS.siteCache);
// Route checks include intermediate points: never tunnel through fences/buildings.
assert.equal(ambientRoute({x:0,y:0},{x:100,y:0},(x,y)=>x>40&&x<60),null);
const route=ambientRoute({x:0,y:0},{x:100,y:100},(x,y)=>x>30&&x<70&&y>30&&y<70);assert.equal(route.length,2);
assert.equal(ambientBlocked(g,{id:'hq',kind:'hq',x:C,y:C,rx:240,ry:270},C+300,C),true);
// Wandering is a drawing offset. The saved logical soldier never moves.
g.camera={x:C,y:C+100};g.monsters=[];g._campAtTavern=false;g.squad=Array.from({length:48},(_,i)=>{const seat=messPoint(i,'sit');return {id:`off-duty-${i}`,x:seat.x,y:seat.y,hp:100,maxHp:100,_leisureSeat:seat,campPose:'sit',equipped:{weapon:{id:'sword'}},exp:20};});g.reserves=[];g.ambientDensity='none';resetAmbientCrowd(g);
const saved=g.squad.map(persistentUnit),before=structuredClone(g.squad);let peak=0,moved=0;
for(let i=0;i<3600;i++){step();const snap=ambientSnapshot(g);peak=Math.max(peak,snap.walkers);assert.ok(snap.walkers<=12);for(const s of g.squad)if(ambientSoldierPose(g,s))moved++;}
assert.ok(peak>0&&moved>0);g._merchantWounded=g.squad.map(s=>({id:`npc-${s.id}`,carrierId:s.id,isDown:true}));step();assert.equal(ambientSnapshot(g).walkers,0,'NPC transport cancels wandering');g._merchantWounded=[];assert.deepEqual(g.squad,before);assert.deepEqual(g.squad.map(persistentUnit),saved);g.squad[0].isDown=true;g.squad[1].carrierId='player';g.squad[2].magicRecovering=true;step();for(const i of [0,1,2])assert.equal(ambientSoldierPose(g,g.squad[i]),null);
g.monsters=[{x:C,y:C+100,hp:100}];step();assert.equal(ambientSnapshot(g).walkers,0,'combat immediately cancels visual walking');g.monsters=[];
// Farm offsets and returning posts are separate from the actual reserve object.
g.squad=[];g.reserves=Array.from({length:48},(_,i)=>({id:`reserve-${i}`,hp:100,maxHp:100,x:C,y:C}));g.camera={x:FARM_X+370,y:FARM_Y+70};resetAmbientCrowd(g);const reserveBefore=structuredClone(g.reserves);step(60);assert.equal(ambientFarmPosts(g).length,48);let farmPeak=0;for(let i=0;i<3600;i++){step();farmPeak=Math.max(farmPeak,ambientSnapshot(g).walkers);}assert.ok(farmPeak>0&&farmPeak<=12);assert.deepEqual(g.reserves,reserveBefore);resetAmbientCrowd(g);assert.equal(ambientSnapshot(g).walkers,0);
// Player preference is lightweight and separate from the game save.
const dom=new JSDOM('<div id="game"><div id="view-strat-overview"></div></div>',{url:'http://localhost/'});Object.assign(globalThis,{document:dom.window.document,localStorage:dom.window.localStorage});g.container=document.getElementById('game');const settings=configureAmbientSettings(g),select=document.getElementById('ambient-density');assert.equal(select.value,'normal');select.value='none';select.dispatchEvent(new dom.window.Event('change'));assert.equal(g.ambientDensity,'none');assert.equal(localStorage.getItem(AMBIENT_SETTING_KEY),'none');settings.dispose();assert.equal(document.getElementById('ambient-settings'),null);dom.window.close();
console.log('PASS: lazy bounded visual crowds, stable identity, day/night/tavern, flee/reappear, far freeze, blocked paths, 25%/12 walking, logical/save isolation, combat/down/carry/mana priority, farm posts, reset and preferences',{peak,farmPeak});
