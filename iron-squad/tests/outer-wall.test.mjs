import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
let simulationTime=0;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>simulationTime}});
let seed=9157;const originalRandom=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {WORLD_SIZE,TAVERN_SITE,northSouthRoadX,eastWestRoadY,WorldTerrain}=await import('../js/world.js?v=198');
const {OUTER_WALL,OUTER_GATES,OUTER_WALL_LEVEL,insideOuterWall}=await import('../js/hq-outer-wall.js?v=198');
const {fieldWalls,wallBlocksAttack,resolveWallMovement,fieldWallContext,updateGateGuards,drawFortification}=await import('../js/gate-rules.js?v=198');
const {tradeSegmentOpen,refreshTradeRoutes}=await import('../js/trade-routes.js?v=198');
const {advanceHeroRoute,heroSegmentOpen,heroRouteCurrent}=await import('../js/hero-navigation.js?v=198');
const {gardenPoint,messPoint,refreshCampQuiet,assignCampSeats,GARDEN_SEAT_COUNT,YARD_SEAT_COUNT}=await import('../js/camp-leisure.js?v=198');
const {hqFacilityPlotContains}=await import('../js/hq-facility-layout.js?v=198');
const {normalizeNation,DEVELOPMENT_STAGES}=await import('../js/nation-rules.js?v=198');
const {economicState}=await import('../js/regional-economy.js?v=182');
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const C=WORLD_SIZE/2,built={currentDungeon:null,nation:{level:OUTER_WALL_LEVEL}},unbuilt={currentDungeon:null,nation:{level:OUTER_WALL_LEVEL-1}};

// Gates sit on the four highways; the wall exists only from development Lv3 and only in the field.
for(const g of OUTER_GATES){
  if(g.side==='north'||g.side==='south')assert.ok(Math.abs(northSouthRoadX(C+g.y)-(C+g.x))<8,`${g.label} is on the highway`);
  else assert.ok(Math.abs(eastWestRoadY(C+g.x)-(C+g.y))<8,`${g.label} is on the highway`);
}
assert.equal(DEVELOPMENT_STAGES[OUTER_WALL_LEVEL].name,'交易都市');
assert.equal(fieldWalls(unbuilt).length,1);assert.equal(fieldWalls(built).length,2);
assert.equal(fieldWalls({currentDungeon:{kind:'dungeon'},nation:{level:5}}).length,0);
assert.equal(fieldWalls({currentDungeon:{kind:'town',width:1600,height:1000},nation:{level:5}}).length,1,'a town keeps only its own wall');
const across=[{x:C+700,y:C+600},{x:C+900,y:C+600}];
assert.equal(wallBlocksAttack(built,...across),true,'the outer wall blocks movement and attacks');
assert.equal(wallBlocksAttack(unbuilt,...across),false,'reserved land is open before the wall is built');
for(const g of OUTER_GATES){const v=g.side==='east'||g.side==='west',d=g.side==='east'||g.side==='south'?1:-1;
  const a={x:C+g.x-(v?d*60:0),y:C+g.y-(v?0:d*60)},b={x:C+g.x+(v?d*60:0),y:C+g.y+(v?0:d*60)};
  assert.equal(wallBlocksAttack(built,a,b),false,`${g.label} is open`);
}
// Enemy AI from any direction finds both gate rings and reaches the HQ centre.
for(const [sx,sy] of [[1500,1700],[-1500,1700],[1500,-1400],[-1400,-1500],[0,2000],[2000,600],[-2000,-400],[300,-1800]]){
  const walker={x:C+sx,y:C+sy,speed:70,radius:12};let i=0;
  for(;i<1500;i++){const fromX=walker.x,fromY=walker.y,dx=C-walker.x,dy=C-walker.y,d=Math.hypot(dx,dy);walker.x+=dx/d*7;walker.y+=dy/d*7;resolveWallMovement(built,walker,fromX,fromY,.1);if(Math.hypot(walker.x-C,walker.y-C)<80)break;}
  assert.ok(Math.hypot(walker.x-C,walker.y-C)<80,`attacker from ${sx},${sy} passes the outer and inner gates`);
}
// Route grids (256px) of caravans and the hero party pass every outer gate, and nowhere else.
for(const [a,b] of [[[C,C-768],[C,C-1024]],[[C,C+1024],[C,C+1280]],[[C+768,C],[C+1024,C]],[[C-768,C],[C-1024,C]]])
  assert.equal(wallBlocksAttack(built,{x:a[0],y:a[1]},{x:b[0],y:b[1]}),false,'grid line through a gate');
for(const [a,b] of [[[C+512,C-768],[C+512,C-1024]],[[C+768,C+512],[C+1024,C+512]],[[C-512,C+1024],[C-512,C+1280]]])
  assert.equal(wallBlocksAttack(built,{x:a[0],y:a[1]},{x:b[0],y:b[1]}),true,'grid line through the wall');
// Scenery stays off the wall line even before it is built (fixed tile cache).
const terrain=new WorldTerrain();
for(const g of OUTER_GATES){const tile=terrain.get(Math.floor((C+g.x)/512),Math.floor((C+g.y)/512));
  assert.ok(!tile.objects.some(o=>(g.side==='east'||g.side==='west'?Math.abs(o.x-C-g.x)<50:Math.abs(o.y-C-g.y)<50)&&insideOuterWall(o.x-C,o.y-C,50)),`no trees on ${g.label}`);}
terrain.clear();

// Real game: the wall is completed by development, guarded, saved, and reroutes traffic and the hero.
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('OUTER WALL TEST').id;g.startFreshGame(false);g.closeStrategyModal();g.updateSpawns=noop;g.monsters=[];
const outerGuards=()=>g.gateGuards.filter(x=>x.gatePostId?.startsWith('hq_outer_gate_'));
updateGateGuards(g,.1);assert.equal(outerGuards().length,0,'no outer gate guards before the wall');
assert.equal(fieldWalls(g).length,1);
g.nation=normalizeNation({...g.nation,investment:DEVELOPMENT_STAGES[OUTER_WALL_LEVEL].cost});assert.equal(g.nation.level,OUTER_WALL_LEVEL);
assert.equal(fieldWalls(g).length,2);updateGateGuards(g,.1);updateGateGuards(g,.1);
assert.equal(outerGuards().length,4,'each outer gate gets one guard, once');
assert.deepEqual(outerGuards().map(x=>x.name).sort(),['外郭門番・北門','外郭門番・南門','外郭門番・東門','外郭門番・西門'].sort());
for(const guard of outerGuards()){const post=OUTER_GATES[Number(guard.gatePostId.at(-1))];assert.equal(guard.x,C+post.x);assert.equal(guard.y,C+post.y);}
outerGuards()[0].dead=true;
const saved=structuredClone(g.saveGame({immediate:true}));g.resumeSavedGame(saved);g.closeStrategyModal();g.updateSpawns=noop;g.monsters=[];
updateGateGuards(g,.1);assert.equal(outerGuards().filter(x=>!x.dead).length,3,'the vacancy is not filled at once');
const vacantPost=g.gatePosts.find(p=>p.id==='hq_outer_gate_0');assert.equal(vacantPost.refillAtPhase,g.phase+2);
g.phase+=2;updateGateGuards(g,.1);assert.equal(outerGuards().filter(x=>!x.dead).length,4,'a new outer gate guard arrives two phases later');
assert.equal(outerGuards().length,4,'the fallen guard record is dropped');assert.ok(outerGuards().find(x=>x.gatePostId==='hq_outer_gate_0').id.includes('_replacement_'));
const hqGuard=g.gateGuards.find(x=>x.gatePostId==='hq_gate_2');hqGuard.dead=true;g.phase+=1;updateGateGuards(g,.1);assert.ok(!g.gateGuards.some(x=>x.gatePostId==='hq_gate_2'&&!x.dead));g.phase+=2;updateGateGuards(g,.1);
assert.ok(g.gateGuards.some(x=>x.gatePostId==='hq_gate_2'&&!x.dead),'HQ gate guards are replaced too');
assert.equal(g.gatePosts.filter(p=>p.id.startsWith('hq_outer_gate_')).length,4,'outer gate posts survive save/load');

// Off-duty army drinks at the tavern's beer garden once the outer bailey stands.
for(let i=0;i<GARDEN_SEAT_COUNT;i++){const s=gardenPoint(i,'drink');
  assert.ok(insideOuterWall(s.x-C,s.y-C,-40),'garden seats are inside the outer bailey');
  assert.ok(s.y>TAVERN_SITE.y+120,'garden seats are clear of the tavern and its visitors');
  assert.equal(hqFacilityPlotContains(s.x-C,s.y-C,0),false);
}
// The guard checks above advanced the phase into a scheduled invasion; nobody drinks during one.
if(g.invasions.stage!=='idle')g.finishDemonInvasion('timeout');Object.assign(g.invasions,{stage:'idle',nextPhase:g.phase+50});g.monsters=[];
g.player.x=C;g.player.y=C-150;g.restTimer=0;g.phaseTimer=100;g.inBattle=true;
for(let i=0;i<300;i++){simulationTime+=50;g.update(.05);}
const body=g.squad.filter(s=>!s.isPersonalGuard&&!s.heroPartyId&&!s.dead);
const seatedAtTavern=body.filter(s=>s.campPose&&Math.abs(s.x-TAVERN_SITE.x)<215&&s.y>TAVERN_SITE.y+120);
assert.ok(body.length>0&&seatedAtTavern.length===body.length,`all ${body.length} soldiers sit at the beer garden (${seatedAtTavern.length})`);
g.monsters.push({id:'intruder',type:'goblin',x:C+600,y:C+900,hp:50,maxHp:50,atk:1,def:0,radius:12,speed:1});
refreshCampQuiet(g,simulationTime);assert.equal(g._campYardQuiet,false,'an enemy inside the outer bailey ends the break');g.monsters=[];
// Before the wall the army still rests in the HQ yard.
const yard={...g,nation:{...g.nation,level:2},_campYardQuiet:true};refreshCampQuiet(yard,simulationTime);assignCampSeats(yard,yard.squad);
const seat=yard.squad.find(s=>s._leisureSeat&&!s.isPersonalGuard)._leisureSeat;assert.ok(Math.abs(seat.x-C)<280&&Math.abs(seat.y-C)<280,'HQ yard seats before the wall');
assert.ok(GARDEN_SEAT_COUNT>=48&&YARD_SEAT_COUNT>=48,'a full 48-soldier body has a stool in both places');
// Tables, not a parade ground: seats sit at many different heights and spacing.
for(const [count,seatOf] of [[YARD_SEAT_COUNT,messPoint],[GARDEN_SEAT_COUNT,gardenPoint]]){const pts=[...Array(count)].map((_,i)=>seatOf(i,'sit'));
  assert.ok(new Set(pts.map(p=>Math.round(p.y))).size>count*.6,'no long straight rows');
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)assert.ok(Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y)>=20,'two soldiers never share a stool');}
for(const s of yard.squad){s._leisureSeat=null;}

// Trade routes: completed wall triggers a re-plan, every segment stays physical and leaves by a gate.
const e=economicState(g);for(const r of Object.values(e.regions)){r.discovered=true;r.liberated=true;r.safety=1;}
const fog=g.ensureFog(),explored=fog.isExploredWorld;fog.isExploredWorld=()=>true;fog.revision++;g._tradeSearch=null;g._tradeRevision=null;
for(let i=0;i<400&&(g._tradeSearch||g._tradeRevision===null);i++)refreshTradeRoutes(g,4000);
assert.ok(e.routes.length>0,'routes were found through the outer gates');
for(const route of e.routes)for(let i=1;i<route.points.length;i++){
  const [a,b]=[route.points[i-1],route.points[i]];
  assert.equal(wallBlocksAttack(g,{x:a[0],y:a[1]},{x:b[0],y:b[1]}),false,`trade route ${route.id} passes the walls only at gates`);
}
assert.ok(e.routes.some(r=>r.points.some(p=>!insideOuterWall(p[0]-C,p[1]-C))),'routes actually leave the outer bailey');
fog.isExploredWorld=explored;const routeRevision=g._tradeRevision;assert.match(routeRevision,/:1$/,'the trade search records the wall state');

// Hero march: plans through gates; a route planned before the wall is re-planned once it is built.
const party={x:C+512,y:C,destination:{x:C+5200,y:C+4300}};
for(let i=0;i<2000&&!party.route?.length;i++)advanceHeroRoute(g,party,400);
assert.ok(party.route?.length>1,'the hero party finds a route out of the bailey');
for(let i=1;i<party.route.length;i++)assert.equal(wallBlocksAttack(g,party.route[i-1],party.route[i]),false,'hero route crosses walls only at gates');
const early={x:C+512,y:C,destination:{x:C+600,y:C+2600}};g.nation=normalizeNation({...g.nation,investment:0});
for(let i=0;i<2000&&!early.route?.length;i++)advanceHeroRoute(g,early,400);
assert.ok(early.route.some((p,i)=>i&&wallBlocksAttack(built,early.route[i-1],p)),'fixture: the old route cuts across the future wall');
g.nation=normalizeNation({...g.nation,investment:DEVELOPMENT_STAGES[OUTER_WALL_LEVEL].cost});
assert.equal(heroRouteCurrent(g,early),false,'completing the wall invalidates the old hero route');
for(let i=0;i<2000&&!early.route?.length;i++)advanceHeroRoute(g,early,400);
for(let i=1;i<early.route.length;i++)assert.equal(wallBlocksAttack(g,early.route[i-1],early.route[i]),false,'the new hero route uses a gate');
// Hero members walking the route are not stopped by the walls.
const walker={x:early.x,y:early.y,speed:120};let index=0;
for(let i=0;i<4000&&index<early.route.length;i++){const t=early.route[index],dx=t.x-walker.x,dy=t.y-walker.y,d=Math.hypot(dx,dy);
  if(d<8){index++;continue;}const step=Math.min(d,12),next={x:walker.x+dx/d*step,y:walker.y+dy/d*step};
  assert.equal(heroSegmentOpen(g,walker,next),true,'each march step is open');Object.assign(walker,next);}
assert.equal(index,early.route.length,'the hero reaches the destination');

// Real invasion with the wall built: invaders enter through gates instead of piling up outside.
g.player.x=C;g.player.y=C;g.phase=3;g.monsters=[];g.startDemonInvasion();g.arriveDemonInvasion();g.phaseTimer=100;
const invaders=()=>g.monsters.filter(m=>m.hp>0&&m.isInvasion!==false);
for(let i=0;i<450&&g.invasions.stage==='battle';i++){simulationTime+=100;g.update(.1);}
const inside=invaders().filter(m=>insideOuterWall(m.x-C,m.y-C)).length;
console.log(JSON.stringify({invaders:invaders().length,inside,stage:g.invasions.stage,outcome:g.invasions.lastResult?.outcome}));
assert.ok(g.invasions.stage!=='battle'||inside>=invaders().length*.5,'most living invaders got through the outer gates');

// The outer wall renders without consuming gameplay randomness.
Object.assign(g,{camera:{x:C+800,y:C+86},width:390,height:844});const before=seed;drawFortification(ctx,g);assert.equal(seed,before);
Math.random=originalRandom;
console.log('PASS: outer bailey at Lv3 on the highways, wide gates on the route grid, enemy pathing from 8 directions, cleared wall line, 4 outer guards saved and refilled like HQ gates, round-table beer-garden leisure and alarm, trade re-plan through gates, hero re-plan and march, real invasion entry, rendering');
dom.window.close();
