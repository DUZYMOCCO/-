// v7.0.39: rescued traders walk (no hop) to the nearest aid station; every aid station keeps strong sentries (gate-guard rules).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {markSoldierDown,treatWounded,MERCHANT_REST} from '../js/casualty-rules.js';
import {updateMerchants,makeEscort} from '../js/merchant-rules.js';
import {AID_SENTRY,replenishTownGateGuards,restoreGateGuardPost,updateGateGuards} from '../js/gate-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame),center=WORLD_SIZE/2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('AID SENTRY TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame({immediate:true}));
const loot=()=>({id:'x',type:'WEAPON',tier:1,stats:{}});
const sentries=(post)=>game.gateGuards.filter(g=>g.aidPostId===post.id);
// ---------- 1) every aid station is staffed: 2 strong sentries beside it ----------
{
  const posts=game.medicalPosts;assert.ok(posts.length>=20);
  for(const p of posts){const s=sentries(p);assert.equal(s.length,AID_SENTRY.perStation,`${p.name} has ${AID_SENTRY.perStation} sentries`);
    for(const g of s){assert.equal(g.isGateGuard,true);assert.equal(g.gateSpace,'field');assert.ok(dist(g,p)<=AID_SENTRY.sideOffset+AID_SENTRY.frontOffset+5,'stands beside the station');assert.equal(g.name,p.name+'\u30fb\u756a\u5175');assert.equal(g.hp,g.maxHp);}
    assert.ok(Math.abs(sentries(p)[0].x-sentries(p)[1].x)>=AID_SENTRY.sideOffset,'one each side of the building');}
  assert.equal(game.gateGuards.filter(g=>g.aidPostId).length,posts.length*AID_SENTRY.perStation);
  assert.ok(game.gatePosts.filter(p=>p.aidPostId).length===posts.length*AID_SENTRY.perStation);
  // strength: gate-guard recipe, a notch stronger, scaled by the station's real distance from the HQ and the current wave
  const phase=Math.max(1,game.phase||1);
  for(const p of posts){const d=Math.max(1200,dist(p,{x:center,y:center}));const base=makeEscort({id:'ref',distance:d,x:0,y:0},0,phase);const s=sentries(p)[0];
    assert.equal(s.escortBaseStats.hp,Math.round(base.escortBaseStats.hp*AID_SENTRY.hp),`${p.name} HP follows its zone`);assert.equal(s.escortBaseStats.atk,Math.round(base.escortBaseStats.atk*AID_SENTRY.atk));}
  const hqGate=game.gateGuards.find(g=>g.gatePostId==='hq_gate_0');const near=sentries(posts.reduce((a,b)=>dist(a,{x:center,y:center})<dist(b,{x:center,y:center})?a:b))[0];
  assert.ok(near.maxHp>hqGate.maxHp&&near.maxHp/hqGate.maxHp<4,`stronger than a gate guard but not absurd (${near.maxHp} vs ${hqGate.maxHp})`);
  const far=sentries(posts.reduce((a,b)=>dist(a,{x:center,y:center})>dist(b,{x:center,y:center})?a:b))[0];assert.ok(far.maxHp>near.maxHp,'deeper zones have stronger sentries');
}
// ---------- 2) a later wave builds stronger replacements; a dead sentry is replaced after 2 waves like a gate guard ----------
{
  const p=game.medicalPosts[1],[a]=sentries(p);const oldHp=a.escortBaseStats.hp;
  a.dead=true;a.hp=0;game.phase=(game.phase||1)+30;replenishTownGateGuards(game);assert.equal(sentries(p).filter(g=>!g.dead).length,1,'refill is scheduled, not instant');
  game.phase+=2;replenishTownGateGuards(game);const live=sentries(p).filter(g=>!g.dead);assert.equal(live.length,2,'the post is staffed again');
  const rep=live.find(g=>g.id!==sentries(p).find(x=>!x.dead&&x!==a&&x.id!==a.id)?.id)||live[0];
  assert.ok(live.some(g=>g.escortBaseStats.hp>oldHp),'a replacement is built for the current wave');
}
// ---------- 3) save / load keeps sentries (and their growth); old saves get sentries on existing stations ----------
{
  game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();
  const p=game.medicalPosts[2];const [a,b]=sentries(p);a.level=5;a.hp=Math.floor(a.maxHp/2);a.x+=33;const snap=structuredClone(game.saveGame({immediate:true}));
  assert.ok(snap.gateGuards.filter(g=>g.gatePostId?.includes('_guard_')).length>=game.medicalPosts.length*2);
  game.resumeSavedGame(structuredClone(snap));game.closeStrategyModal();
  const [a2,b2]=sentries(game.medicalPosts[2]);assert.equal(a2.id,a.id);assert.equal(a2.level,5);assert.ok(a2.hp<a2.maxHp,'wounds persist');assert.equal(game.gateGuards.filter(g=>g.aidPostId).length,game.medicalPosts.length*2,'no duplicates after load');
  // an OLD save has no aid-station posts or guards at all
  const old=structuredClone(initial);old.gateGuards=(old.gateGuards||[]).filter(g=>!String(g.id).includes('_guard_')||!String(g.gatePostId||g.id).startsWith('medical-'));old.gatePosts=(old.gatePosts||[]).filter(q=>!String(q.id).startsWith('medical-'));
  assert.ok(!old.gateGuards.some(g=>String(g.id).startsWith('medical-')));
  game.resumeSavedGame(old);game.closeStrategyModal();
  for(const q of game.medicalPosts)assert.equal(sentries(q).length,2,'old save: existing station is now staffed');
  assert.ok(game.gateGuards.filter(g=>!g.aidPostId).length>=5,'gate guards untouched');
}
// ---------- 4) sentries behave as gate guards: fight monsters near the station, and raid mobs never target them ----------
{
  game.monsters=[];game.civilians=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;game.squad=[];
  const p=game.medicalPosts[3],[a]=sentries(p);game.player.x=p.x;game.player.y=p.y;
  a.x=a.homeX+400;a.y=a.homeY;a.returningToBase=true;updateGateGuards(game,.5);assert.ok(dist(a,{x:a.homeX,y:a.homeY})<400,'a displaced sentry walks back to its post');
  const mon={id:'m',x:a.x+60,y:a.y,hp:1e12,maxHp:1e12,atk:1,radius:14,dead:false,isRaidMob:false};game.monsters=[mon];const before=mon.hp;for(let i=0;i<30;i++)updateGateGuards(game,.1);assert.ok(mon.hp<before,'the sentry engages a monster that comes to the station');
  game.monsters=[];
  assert.ok(fs.readFileSync(new URL('../js/index.js',import.meta.url),'utf8').includes('&&!g.aidPostId)'),'raid mobs are never pointed at far-away station sentries');
}
// ---------- 5) merchants never hop: far field revive, carried to a far station ----------
{
  const arrive=(m)=>{let steps=0;while(m.returningToBase&&steps++<4000)updateMerchants(game,.5,loot);return steps;};
  game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.civilians=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;game.squad=[];
  const m=game.merchants.find(x=>x.placeKind==='field-camp')||game.merchants[1];game.medicalPosts.forEach(q=>q.discovered=true);
  // far from every post (> walkMax of the old rule)
  const spot=(()=>{let best={x:center+9000,y:center+2000},bd=0;for(let i=0;i<40;i++){const c={x:center+3000+i*1200,y:center-4000+((i*7)%11)*900};const d=Math.min(...game.medicalPosts.map(q=>dist(c,q)));if(d>bd){bd=d;best=c;}}return {...best,d:bd};})();
  assert.ok(spot.d>MERCHANT_REST.walkMax,`need a spot farther than the old hop limit (${Math.round(spot.d)})`);
  m.x=spot.x;m.y=spot.y;markSoldierDown(game,m);const medic={id:'v39-medic',soldierClass:'MEDIC',hp:100,x:m.x,y:m.y};game.squad=[medic];
  assert.equal(treatWounded(game,medic,m,.5),false);assert.equal(treatWounded(game,medic,m,.5),true);
  const np=game.medicalPosts.find(q=>q.id===m.restPostId);assert.equal(np,game.medicalPosts.reduce((a,b)=>dist(b,spot)<dist(a,spot)?b:a),'the nearest station');
  assert.deepEqual([m.x,m.y],[spot.x,spot.y],'revived exactly where he fell: no teleport');assert.equal(m.returningToBase,true);assert.ok(dist({x:m.homeX,y:m.homeY},np)<=125);
  let prev=dist(m,{x:m.homeX,y:m.homeY}),maxStep=0,sawFast=false;
  for(let i=0;i<3000&&m.returningToBase;i++){const x=m.x,y=m.y;updateMerchants(game,.1,loot);const step=Math.hypot(m.x-x,m.y-y);maxStep=Math.max(maxStep,step);const d=dist(m,{x:m.homeX,y:m.homeY});assert.ok(d<=prev+1e-6,'always closing in');prev=d;}
  assert.ok(maxStep<=75*.1+1e-6,`never faster than a brisk walk (${maxStep})`);assert.equal(m.returningToBase,false);assert.ok(dist(m,np)<=125,'arrived beside the station');
  void sawFast;
}
console.log('PASS: aid-station sentries (2 per station, gate-guard recipe x1.6/x1.35 at the zone distance and current wave, refill, save/load, old saves, not raid targets) and merchants that walk to the nearest station without hopping');
