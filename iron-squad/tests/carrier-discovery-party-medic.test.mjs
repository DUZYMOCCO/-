// v6.4.1: carriers only haul to known towns; with a medic in the commander's own squad they wait beside the commander.
import assert from 'node:assert/strict';
import {WORLD_SIZE} from '../js/world.js';
import {aidStations,casualtyStations,stationKnown,handleTransportAI,attachWounded,syncDragged,townKnown,waitsForPartyMedic,medicHoldsByCommander,carriedSoldiers,REVIVAL_COOLDOWN} from '../js/casualty-rules.js';
const c=WORLD_SIZE/2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const mk=(over={})=>{
  const player={x:c+2000,y:c,hp:100,maxHp:100,isDown:false};
  const town=(id,x,y,extra={})=>({id,kind:'town',name:id,entrance:{x,y,radius:40},...extra});
  const game={player,worldTime:100,currentDungeon:null,fog:{isExploredWorld:()=>false},medicalPosts:[],outposts:[],civilians:[],squad:[],
    dungeons:[town('hidden',c+2100,c),town('known',c+2900,c,{discovered:true})],...over};
  return game;
};
const soldier=(id,x,y,extra={})=>({id,name:id,soldierClass:'HEAVY',hp:100,maxHp:100,speed:100,x,y,isPersonalGuard:true,...extra});
const downed=(id,x,y,extra={})=>({id,name:id,soldierClass:'HEAVY',isDown:true,hp:0,maxHp:100,downTimer:45,x,y,isPersonalGuard:true,...extra});

// 1) Undiscovered towns are not carry destinations; discovered / cleared / fog-explored ones are. Delivery stations stay unchanged.
const usable=g=>casualtyStations(g).filter(p=>stationKnown(g,p)&&p.kind==='town').map(p=>p.id);
let g=mk();
assert.deepEqual(usable(g),['town-known']);assert.ok(aidStations(g).some(p=>p.id==='town-hidden'),'arrival delivery still accepted at any town');
g.dungeons[0].cleared=true;assert.ok(townKnown(g,g.dungeons[0]));assert.equal(usable(g).length,2);
g=mk({fog:{isExploredWorld:(x)=>x===c+2100}});assert.ok(usable(g).includes('town-hidden'),'minimap-explored town counts as known');

// 2) Main-army carrier (no medic rule) heads to a known place, never the nearer hidden town; with no town known it falls back to HQ.
g=mk();g.dungeons[0].entrance.x=c+1500;const army=soldier('army',c+1400,c,{isPersonalGuard:false}),w=downed('w',c+1400,c,{isPersonalGuard:false});g.squad=[army,w];
assert.equal(attachWounded(g,army,w),true);
let prev=army.x;for(let i=0;i<100;i++){handleTransportAI(g,army,.1);syncDragged(g,.1);assert.ok(army.x<=prev+1e-9,'heads west to HQ, not east to the hidden town 100px away');prev=army.x;}
assert.ok(army.x<c+1400-100);
g=mk();g.dungeons.forEach(d=>{d.discovered=false;});const a2=soldier('a2',c+800,c,{isPersonalGuard:false}),w2=downed('w2',c+800,c,{isPersonalGuard:false});g.squad=[a2,w2];attachWounded(g,a2,w2);
const d0=dist(a2,{x:c,y:c});for(let i=0;i<20;i++)handleTransportAI(g,a2,.1);assert.ok(dist(a2,{x:c,y:c})<d0,'falls back to HQ when no town is known');

// 3) Own-squad carrier + living medic in the commander's party: stays by the commander, drags the ally along.
g=mk();g.player.x=c+500;const med=soldier('med',c+520,c,{soldierClass:'MEDIC',revivalSkillCooldownUntil:g.worldTime+REVIVAL_COOLDOWN});
const own=soldier('own',c+600,c),wo=downed('wo',c+600,c);g.squad=[own,med,wo];assert.equal(attachWounded(g,own,wo),true);
assert.equal(waitsForPartyMedic(g,own),true);
for(let t=0;t<600;t++){g.player.x+=(t<300?.5:0);handleTransportAI(g,own,.1);syncDragged(g,.1);assert.ok(dist(own,g.player)<=200,`carrier stays near the commander (t=${t})`);}
assert.ok(dist(own,g.player)<=70&&dist(wo,g.player)<=130,'settles beside the commander with the ally in tow');
assert.equal(carriedSoldiers(g,own).length,1,'ally stays tied');
// far-away carrier catches up
own.x=g.player.x+900;wo.x=own.x;for(let i=0;i<200;i++){handleTransportAI(g,own,.1);syncDragged(g,.1);}assert.ok(dist(own,g.player)<=70);
// medic downed -> falls back to haul-to-safety (toward the known station / HQ, away from commander)
med.isDown=true;assert.equal(waitsForPartyMedic(g,own),false);const px=own.x;for(let i=0;i<20;i++)handleTransportAI(g,own,.1);assert.notEqual(own.x,px,'no medic: hauls again');
// a medic outside the own squad does not count
med.isDown=false;med.isPersonalGuard=false;assert.equal(waitsForPartyMedic(g,own),false);med.isPersonalGuard=true;
// non-own-squad carriers ignore the rule
const army2=soldier('army2',c+600,c,{isPersonalGuard:false});assert.equal(waitsForPartyMedic(g,army2),false);

// 4) Medic on revival CT holds by the commander while an own-squad ally is down; ready or no casualty -> normal AI.
g=mk();const m2=soldier('m2',c+2200,c,{soldierClass:'MEDIC',revivalSkillCooldownUntil:g.worldTime+30}),d2=downed('d2',c+2300,c);g.squad=[m2,d2];
assert.equal(medicHoldsByCommander(g,m2),true);
m2.revivalSkillCooldownUntil=g.worldTime;assert.equal(medicHoldsByCommander(g,m2),false,'CT over: free to treat');
m2.revivalSkillCooldownUntil=g.worldTime+30;d2.isDown=false;assert.equal(medicHoldsByCommander(g,m2),false,'nobody down');
console.log('carrier-discovery-party-medic ok');
