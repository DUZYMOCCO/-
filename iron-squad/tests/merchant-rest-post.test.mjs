// v7.0.9: rescued traders go to the NEAREST medical post (not the HQ), the post is capped, and they leave after the rest period.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {markSoldierDown,updateWounded,attachWounded,syncDragged,treatWounded,MERCHANT_REST} from '../js/casualty-rules.js?v=286';
import {updateMerchants,serializeMerchants,applyMerchantSave,initMerchants} from '../js/merchant-rules.js?v=286';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame),center=WORLD_SIZE/2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MERCHANT REST TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame({immediate:true}));
const fresh=()=>{game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.civilians=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;game.squad=[];game.gateGuards=[];};
const loot=()=>({id:'x',type:'WEAPON',tier:1,stats:{}});
const post=()=>game.medicalPosts[1];
const rescueAt=(unit,station)=>{unit.x=station.x+200;unit.y=station.y;game.player.x=unit.x;game.player.y=unit.y;markSoldierDown(game,unit);assert.equal(attachWounded(game,game.player,unit),true);game.player.x=station.x;game.player.y=station.y;syncDragged(game,1);updateWounded(game,0);assert.equal(unit.isDown,false,'revived at the station');};
// v7.0.39: nobody hops — a rescued trader is put on foot toward the post; run the merchant clock until he is there.
const arrive=(...units)=>{for(let i=0;i<4000&&units.some(u=>u.returningToBase);i++)updateMerchants(game,.5,loot);};
const resting=p=>game.merchants.flatMap(m=>[m,...m.escorts]).filter(u=>u.restPostId===p.id);

// 1) Carried to a post: rests beside that post, labelled with it, never at the HQ.
fresh();let p=post();p.discovered=true;let m=game.merchants.find(x=>x.placeKind==='field-camp')||game.merchants[1];
const origin={x:m.originX,y:m.originY};assert.ok(Number.isFinite(origin.x)&&m.basePlaceName,'origin remembered');
rescueAt(m,p);
assert.equal(m.restPostId,p.id);assert.ok(dist({x:m.homeX,y:m.homeY},p)<=125);assert.equal(m.returningToBase,true,'v7.0.39: he walks from the station to his spot (no hop)');assert.ok(dist(m,p)<400);arrive(m);assert.ok(dist(m,p)<=125);assert.ok(dist(m,{x:center,y:center})>1000);assert.match(m.placeName,new RegExp(p.name));assert.equal(m.rescuedToBase,true);
assert.equal(m.restUntilPhase,(game.phase||1)+MERCHANT_REST.phases);

// 2) Carried to the HQ (a station too): still goes to the post that is nearest to the HQ, so the HQ never fills with traders.
fresh();game.merchants.slice(0,4).forEach((t,i)=>rescueAt(t,{x:center,y:center,id:'hq'}));
const nearHq=game.merchants.flatMap(t=>[t,...t.escorts]).filter(u=>u.rescuedToBase&&dist(u,{x:center,y:center})<400);
const postOf=u=>game.medicalPosts.find(q=>q.id===u.restPostId);
const walkers=game.merchants.slice(0,4);assert.ok(walkers.every(t=>t.returningToBase&&dist(t,{x:center,y:center})<400),'v7.0.39: delivered to the HQ, they walk out — they do not appear at the post');arrive(...walkers);
assert.ok(game.merchants.slice(0,4).every(t=>postOf(t)&&dist(t,postOf(t))<=125&&postOf(t)===game.medicalPosts.reduce((a,b)=>dist(b,t)<dist(a,t)?b:a)),'HQ rescues are sent to a medical post, the nearest one');
assert.equal(game.merchants.flatMap(t=>[t,...t.escorts]).filter(u=>u.rescuedToBase&&dist(u,{x:center,y:center})<400).length,0,'nobody accumulates at the HQ');void nearHq;

// 3) Revived in the field by a medic: walks to the nearest post when it is close.
fresh();p=post();p.discovered=true;m=game.merchants.find(x=>x.placeKind==='field-camp')||game.merchants[1];
m.x=p.x+700;m.y=p.y;markSoldierDown(game,m);const medic={id:'rest-medic',soldierClass:'MEDIC',hp:100,x:m.x,y:m.y};game.squad=[medic];
assert.equal(treatWounded(game,medic,m,.5),false);assert.equal(treatWounded(game,medic,m,.5),true);
assert.equal(m.restPostId,p.id);assert.equal(m.returningToBase,true,'walks to the post');assert.ok(dist(m,p)>600);
game.phase=game.phase||1;updateMerchants(game,100,loot);updateMerchants(game,.1,loot);assert.equal(m.returningToBase,false);assert.ok(dist(m,p)<=125);

// 4) A post is capped; a full post sends away whoever has stayed longest.
fresh();p=post();p.discovered=true;
for(const t of game.merchants.slice(0,5))for(const unit of [t,...t.escorts])rescueAt(unit,p);
assert.ok(resting(p).length<=MERCHANT_REST.capPerPost,`cap ${MERCHANT_REST.capPerPost}, got ${resting(p).length}`);
assert.ok(resting(p).length>=MERCHANT_REST.capPerPost-1);
const slots=resting(p).map(u=>u.restSlot);assert.equal(new Set(slots).size,slots.length,'every resting person has its own slot');

// 5) After the rest period they leave and are back at their own camp/inn.
fresh();p=post();p.discovered=true;m=game.merchants.find(x=>x.placeKind==='field-camp')||game.merchants[1];const spot={x:m.originX,y:m.originY},baseName=m.basePlaceName;
rescueAt(m,p);const escort=m.escorts[0];updateMerchants(game,.1,loot);assert.equal(m.restPostId,p.id,'still resting before the period ends');
arrive(m,...m.escorts);game.phase=(game.phase||1)+MERCHANT_REST.phases;updateMerchants(game,.1,loot);
assert.equal(m.restPostId,undefined);assert.equal(m.rescuedToBase,false);
assert.equal(m.returningToBase,dist(m,spot)>4,'v7.0.39: he walks home, no hop');assert.ok(dist(m,spot)>1000,'still out at the post right after the rest ends: no hop home');const posBefore={x:m.x,y:m.y};updateMerchants(game,.5,loot);assert.ok(dist(m,posBefore)<=75*.5+1e-6,'one half-second step is a walking step');arrive(m);for(let i=0;i<80;i++)updateMerchants(game,.5,loot);
assert.deepEqual([m.x,m.y],[spot.x,spot.y]);assert.deepEqual([m.homeX,m.homeY],[spot.x,spot.y]);assert.equal(m.placeName,baseName);
assert.ok(m.escorts.filter(e=>!e.dead).every(e=>dist(e,m)<80&&!e.rescuedToBase),'guards return with their trader');
assert.equal(resting(p).length,0);

// 6) Save/load keeps the rest, and an old save that parked a trader at the HQ sends it home.
fresh();p=post();p.discovered=true;m=game.merchants.find(x=>x.placeKind==='field-camp')||game.merchants[1];rescueAt(m,p);
const saved=serializeMerchants(game.merchants);const copy=structuredClone(initial);
game.resumeSavedGame(copy);game.closeStrategyModal();initMerchants(game,loot,{x:center,y:center});applyMerchantSave(game,saved,loot,{x:center,y:center});
const loaded=game.merchants.find(x=>x.id===m.id);assert.equal(loaded.restPostId,p.id);assert.equal(loaded.restUntilPhase,m.restUntilPhase);assert.match(loaded.placeName,new RegExp(p.name));
const legacy=structuredClone(saved);const entry=legacy.find(x=>x.id===m.id);for(const k of ['restPostId','restPostName','restSlot','restSince','restUntilPhase'])delete entry[k];
Object.assign(entry,{rescuedToBase:true,returningToBase:false,x:center+40,y:center+30,homeX:center+40,homeY:center+30});
game.merchants=null;initMerchants(game,loot,{x:center,y:center});applyMerchantSave(game,legacy,loot,{x:center,y:center});
const old=game.merchants.find(x=>x.id===m.id);assert.equal(old.rescuedToBase,true);updateMerchants(game,.1,loot);
assert.equal(old.rescuedToBase,false,'legacy HQ resident leaves');arrive(old);assert.deepEqual([old.x,old.y],[old.originX,old.originY]);assert.ok(dist(old,{x:center,y:center})>1000||old.placeKind==='camp');
console.log('PASS: merchants rest at the nearest medical post (carried, HQ-delivered, field revive), per-post cap and slots, leave after the rest period with their guards, save/load and legacy HQ residents');