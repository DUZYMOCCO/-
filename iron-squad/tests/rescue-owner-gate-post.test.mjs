import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {markSoldierDown,updateWounded,attachWounded,syncDragged,treatWounded,grantRescueBonus,grantCivilianRescueBonus} from '../js/casualty-rules.js';
import {initializeGateGuards,restoreGateGuardPost,updateGateGuards,replenishTownGateGuards,serializeGateGuards,serializeGatePosts,ensureTownGuards} from '../js/gate-rules.js';
import {emptyRescueBonuses} from '../js/rescue-rewards.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2,notices=[];
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});
for(const key of ['startGameLoop','spawnDamageText','spawnSparks'])g[key]=noop;g.showToast=t=>notices.push(t);
g.setupUI();g.activeSlotId=saveSlots.create('Rescue owner / gate post regression').id;g.startFreshGame(false);
const initial=structuredClone(g.saveGame({immediate:true})),fresh=()=>{g.resumeSavedGame(structuredClone(initial));g.closeStrategyModal();g.restTimer=0;g.monsters=[];g.civilians=[];notices.length=0;};
const downGuard=()=>{const guard=g.gateGuards.find(u=>u.gatePostId==='hq_gate_4');Object.assign(guard,{x:C+500,y:C});markSoldierDown(g,guard);return guard;};
const permanent=()=>notices.filter(t=>t.includes('（永続）'));
const random=Math.random;Math.random=()=>.1;
try{
  // Screenshot symptom: a guard recovers at aid while the commander is down elsewhere.
  fresh();let guard=downGuard();Object.assign(g.player,{x:C+1200,y:C,hp:0,isDown:true,downTimer:33});const hp=g.player.maxHp;
  guard.x=C;guard.y=C;updateWounded(g,0);
  assert.equal(guard.isDown,false);assert.equal(g.player.isDown,true);assert.equal(g.player.maxHp,hp);
  assert.deepEqual(g.rescueBonuses,emptyRescueBonuses());assert.deepEqual(g.rescueRewardIds,[]);assert.deepEqual(permanent(),[]);
  assert.ok(!guard.owesCommander&&!guard.rescueRewardGranted);
  // Both an ordinary soldier and a personal companion can carry to aid without granting a
  // permanent commander reward. Their established rescue/merit pathways still run.
  for(const personal of [false,true]){
    fresh();guard=downGuard();const carrier=g.squad[0];Object.assign(carrier,{x:guard.x,y:guard.y,isPersonalGuard:personal,hp:carrier.maxHp});
    g.player.x=C+1500;assert.equal(attachWounded(g,carrier,guard),true);carrier.x=C;carrier.y=C;syncDragged(g,1);updateWounded(g,0);
    assert.equal(guard.isDown,false);assert.deepEqual(g.rescueBonuses,emptyRescueBonuses());assert.deepEqual(permanent(),[]);assert.ok(carrier.rescues>0);
  }
  fresh();guard=downGuard();const medic=g.squad.find(s=>s.soldierClass==='MEDIC')||g.squad[0];Object.assign(medic,{soldierClass:'MEDIC',x:guard.x,y:guard.y,hp:medic.maxHp,mana:100});
  assert.equal(treatWounded(g,medic,guard,1),true);assert.equal(guard.isDown,false);assert.deepEqual(g.rescueBonuses,emptyRescueBonuses());assert.deepEqual(permanent(),[]);
  // A real commander rope delivery still grants one permanent reward, and it does not repeat.
  fresh();guard=downGuard();Object.assign(g.player,{x:guard.x,y:guard.y});assert.equal(attachWounded(g,g.player,guard),true);
  g.player.x=C;g.player.y=C;syncDragged(g,1);updateWounded(g,0);assert.equal(g.rescueBonuses.hpPct,1);assert.equal(permanent().length,1);assert.equal(guard.owesCommander,true);
  grantRescueBonus(g,guard,{carrier:g.player});assert.equal(g.rescueBonuses.hpPct,1);
  const data=g.saveGame({immediate:true});g.resumeSavedGame(structuredClone(data));assert.equal(g.rescueBonuses.hpPct,1);assert.ok(g.rescueRewardIds.includes(guard.id));
  // Direct player treatment is eligible; copied actor flags are not personal rescue evidence.
  for(const type of [{isMerchant:true},{isMerchantEscort:true},{isMerchantEscort:true,isGateGuard:true}]){
    fresh();const patient={...type,id:'owner-patient',name:'NPC',x:C+500,y:C,maxHp:100};
    grantRescueBonus(g,patient,{method:'MEDIC',medic:{...g.player}});assert.deepEqual(g.rescueBonuses,emptyRescueBonuses());
    delete patient.rescuedThisDown;grantRescueBonus(g,patient,{method:'MEDIC',medic:g.player});assert.equal(g.rescueBonuses.hpPct,1);
  }
  for(const carrierId of [undefined,'other-hero','player']){
    fresh();const civ={id:'civilian-owner',kind:'child',name:'子供',carrierId,x:C,y:C};g.squad.push({id:'other-hero',isHero:true,x:C,y:C});
    grantCivilianRescueBonus(g,civ,{id:'base'});assert.equal(civ.rescued,true);assert.equal(g.rescueBonuses.hpPct,carrierId==='player'?1:0);
  }
  // Old HQ refuge records (including a replacement for the same gate) move back to the gate
  // without losing either person's identity, development or a valid earned permanent bonus.
  fresh();const old=serializeGateGuards(g),target=old.find(u=>u.gatePostId==='hq_gate_0');Object.assign(target,{x:C,y:C,homeX:C,homeY:C,rescuedToBase:true,returningToBase:false});
  const replacement=structuredClone(target);Object.assign(replacement,{id:'hq_gate_0_replacement_1',rescuedToBase:false,level:12,exp:17});old.push(replacement);
  const count=old.length;initializeGateGuards(g,{gateGuards:old,gatePosts:serializeGatePosts(g)});
  const veterans=g.gateGuards.filter(u=>u.gatePostId==='hq_gate_0'),post=g.gatePosts.find(p=>p.id==='hq_gate_0');
  assert.equal(g.gateGuards.length,count);assert.equal(veterans.length,2);assert.ok(veterans.every(u=>Math.hypot(u.x-post.x,u.y-post.y)<80&&!u.rescuedToBase));
  assert.equal(g.gateGuards.find(u=>u.id===replacement.id).level,12);assert.equal(g.gateGuards.find(u=>u.id===replacement.id).exp,17);
  assert.ok(Math.hypot(veterans[0].x-veterans[1].x,veterans[0].y-veterans[1].y)>20);
  g.phase+=4;replenishTownGateGuards(g);assert.equal(g.gateGuards.filter(u=>u.gatePostId===post.id).length,2,'occupied gates do not keep spawning replacements');
  // A recovered field guard walks back to the assigned gate; a town guard returns to its
  // local gate coordinates instead of mixing an indoor post with world/HQ coordinates.
  fresh();guard=downGuard();const assigned=g.gatePosts.find(p=>p.id===guard.gatePostId);guard.x=C;guard.y=C;updateWounded(g,0);
  assert.deepEqual([guard.homeX,guard.homeY],[assigned.x,assigned.y]);assert.equal(guard.rescuedToBase,false);
  for(let i=0;i<180;i++)updateGateGuards(g,.1);assert.ok(Math.hypot(guard.x-assigned.x,guard.y-assigned.y)<5);
  const town=g.dungeons.find(d=>d.id==='royal_castle_town');ensureTownGuards(g,town);const local=g.gateGuards.find(u=>u.gateOrigin===town.id),localPost=g.gatePosts.find(p=>p.id===local.gatePostId);
  Object.assign(local,{gateSpace:'field',x:C,y:C,homeX:C,homeY:C,rescuedToBase:true});assert.equal(restoreGateGuardPost(g,local),true);
  assert.equal(local.gateSpace,town.id);assert.deepEqual([local.x,local.y],[localPost.x,localPost.y]);
  const before={x:guard.x,y:guard.y,homeX:guard.homeX,homeY:guard.homeY};guard._rescueMission=true;guard.homeX=C;assert.equal(restoreGateGuardPost(g,guard),false);assert.equal(guard.homeX,C);delete guard._rescueMission;Object.assign(guard,before);
  const guardSave=structuredClone(g.saveGame({immediate:true}));g.resumeSavedGame(guardSave);const restored=g.gateGuards.find(u=>u.id===local.id);assert.equal(restored.gateSpace,town.id);assert.equal(restored.homeX,localPost.x);
  console.log('PASS: no passive/AI permanent commander rewards, real commander rescue once/save, NPC and civilian owner checks, gate revival/return, legacy refuge migration, preserved veterans/replacements and town-space posts, rescue missions');
}finally{Math.random=random;g.destroy();dom.window.close();}
