// v7.0.9: friendly AI refused by the HQ/town wall walks through the nearest gate instead of trembling at the wall;
// a unit standing exactly on a wall line is stepped off it; stalled transports are carried past the snag.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {applyFortifications,WALL_ROUTE} from '../js/gate-rules.js?v=286';
import {markSoldierDown,attachWounded,rescueStalledTransport,TRANSPORT_STALL} from '../js/casualty-rules.js?v=286';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
let tick=1000;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>tick}});
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame),C=WORLD_SIZE/2,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WALL ROUTE TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame({immediate:true}));
const fresh=()=>{game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.civilians=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;game.nation.level=0;};
const mainForce=(x,y)=>{const u=game.squad.find(s=>!s.isDown&&!s.dead);u.radius=15;u.isPersonalGuard=false;game.player.x=C-4500;game.player.y=C-4500;u.x=x;u.y=y;delete u._wallSpace;return u;};
/** The same per-frame order the game uses: the AI steps straight at its goal, then walls are enforced. */
function walk(u,target,frames=900,step=2){
  let path=0,last={x:u.x,y:u.y},back=0;
  for(let i=0;i<frames;i++){
    const g=game.dungeonMoveTarget(u,target),dx=g.x-u.x,dy=g.y-u.y,d=Math.hypot(dx,dy);if(d>1){const s=Math.min(d,step);u.x+=dx/d*s;u.y+=dy/d*s;}
    applyFortifications(game,1/60);game.settleTerrain();
    const moved=Math.hypot(u.x-last.x,u.y-last.y);path+=moved;last={x:u.x,y:u.y};
    if(dist(u,target)<12)return {arrived:true,frames:i,path};
  }
  return {arrived:false,frames,path};
}
// Cases which used to shuttle in place at the wall (AI step toward the goal cancelled by a one-frame detour step).
const stuckBefore=[[0,330,320,260],[40,310,320,260],[280,302,320,260],[120,330,300,200],[0,330,300,200],[-120,330,350,260],[280,310,350,260]];
for(const [sx,sy,tx,ty] of stuckBefore){fresh();const u=mainForce(C+sx,C+sy);const r=walk(u,{x:C+tx,y:C+ty});assert.equal(r.arrived,true,`(${sx},${sy})->(${tx},${ty}) arrives, ended ${Math.round(u.x-C)},${Math.round(u.y-C)}`);assert.ok(r.path<1500,'goes via the gate, no endless shuffle');assert.equal(u._wallRoute,undefined,'route finished');}
// Standing exactly on a wall line outside the gate (the screenshot situation): neither route planning nor movement may freeze.
for(const own of [false,true]){fresh();const u=mainForce(C+131,C+300);u.isPersonalGuard=own;const r=walk(u,{x:C,y:C},1200);assert.equal(r.arrived,true,`own=${own} on-line unit reaches the base`);}
fresh();{const u=mainForce(C+131,C+300);u._wallX=u.x;u._wallY=u.y;u._wallSpace='field';applyFortifications(game,1/60);assert.ok(Math.abs(u.y-(C+300))>=WALL_ROUTE.nudge-1e-9,'stepped off the line');}
fresh();{const u=mainForce(C+30,C+300);u._wallX=u.x;u._wallY=u.y;u._wallSpace='field';applyFortifications(game,1/60);assert.equal(u.y,C+300,'a unit inside the gate opening is left alone');}
// Enemies keep the old behaviour (one-frame detour step) and never get a gate route.
fresh();{const mon={id:'wall-monster',hp:100,maxHp:100,x:C+131,y:C+330,radius:14,speed:80,dead:false};game.monsters=[mon];
  for(let i=0;i<300;i++){mon.y-=2;applyFortifications(game,1/60);}
  assert.equal(mon._wallRoute,undefined,'no gate route for enemies');}
// A route that cannot finish never keeps anyone stuck: after maxSeconds the unit is placed past the gate.
fresh();{const u=mainForce(C+131,C+330);u._wallRoute={legs:[{x:C,y:C+328},{x:C,y:C+272}],i:0,t:WALL_ROUTE.maxSeconds-.01};u._wallX=u.x;u._wallY=u.y;u._wallSpace='field';applyFortifications(game,.05);assert.deepEqual([Math.round(u.x-C),Math.round(u.y-C)],[0,272]);assert.equal(u._wallRoute,undefined);}
// Transport stall rescue (unit level): no progress for 3 s hops 160 px toward the goal; a repeat lands beside it.
{const s={x:0,y:0},dest={id:'st',x:1000,y:0};
 assert.equal(rescueStalledTransport(s,dest,.1),false);
 for(let i=0;i<29;i++)assert.equal(rescueStalledTransport(s,dest,.1),false);
 assert.equal(rescueStalledTransport(s,dest,.1),true);assert.ok(Math.abs(s.x-TRANSPORT_STALL.jump)<1e-6);
 for(let i=0;i<29;i++)rescueStalledTransport(s,dest,.1);assert.equal(rescueStalledTransport(s,dest,.1),true);assert.ok(Math.abs(s.x-(1000-TRANSPORT_STALL.landing))<1e-6,'second rescue lands next to the destination');
 const walking={x:0,y:0};for(let i=0;i<200;i++){walking.x+=2;assert.equal(rescueStalledTransport(walking,{id:'w',x:5000,y:0},.1),false);}
 const near={x:0,y:0};for(let i=0;i<100;i++)assert.equal(rescueStalledTransport(near,{id:'n',x:TRANSPORT_STALL.minDistance-1,y:0},.1),false,'already at the destination: never hop');}
// Full loop: a main-force soldier carrying a downed gate guard from a wall line reaches a station and the guard is revived.
fresh();{const g=game.gateGuards.find(u=>u.gateSpace==='field'),s=mainForce(C+131,C+300);Object.assign(g,{x:C+141,y:C+300});markSoldierDown(game,g);assert.equal(attachWounded(game,s,g),true);
  for(let i=0;i<60*40&&g.isDown;i++){tick+=16;game.update(1/60);}
  assert.equal(g.isDown,false,'the guard was delivered and revived');}
// Full loop, forced snag: the carrier's path planner returns "stay here" forever; the rescue still delivers within seconds.
fresh();{const g=game.gateGuards.find(u=>u.gateSpace==='field'),s=mainForce(C+250,C+270);Object.assign(g,{x:C+260,y:C+270});markSoldierDown(game,g);assert.equal(attachWounded(game,s,g),true);
  game.dungeonMoveTarget=unit=>({x:unit.x,y:unit.y});
  for(let i=0;i<60*40&&g.isDown;i++){tick+=16;game.update(1/60);}
  delete game.dungeonMoveTarget;assert.equal(g.isDown,false,'a hopelessly snagged carrier is carried to the station');}
console.log('PASS: friendly AI crosses walls through the gate (no trembling), on-line units are stepped off, no gate route for enemies, route timeout rescue, transport stall hop/landing, full-loop delivery incl. a forced snag');