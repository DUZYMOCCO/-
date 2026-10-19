// v7.1.6: classed-up units keep the wall-passing ability but hop over what they cross (take off at the edge, land beyond).
import assert from 'node:assert/strict';
import {WALL_VAULT,stepWallVault,vaultLanding,restingPosition,clearWallVault} from '../js/wall-vault.js';
import {passesWalls} from '../js/class-up-rules.js';
import {persistentUnit} from '../js/render-support.js';
import {wallGeometry,resolveWallMovement} from '../js/gate-rules.js';
import {IronSquadGame} from '../js/index.js';
import {dungeonBlocks} from '../js/dungeon.js';

let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
// A 60px-wide block between x=100 and x=160 (any y), plus open ground elsewhere.
const block=(x,y)=>x>=100&&x<160;
const g={currentDungeon:{kind:'dungeon',id:'test'},particles:[],pushParticle(p){this.particles.push(p);}};
const walker=()=>({x:60,y:0,radius:10});
const walk=(u,dx,steps,dt=1/60,space='test')=>{const trace=[];for(let i=0;i<steps;i++){if(!u._vault)u.x+=dx;stepWallVault(g,u,block,dt,space);trace.push({x:u.x,lift:u._jumpLift||0,air:!!u._vault});}return trace;};

// 1. Approaching: no hop on open ground.
{const u=walker();const t=walk(u,2,15);ok(t.every(s=>!s.air),'open ground: no hop');ok(u.x<100);}
// 2. Entering the block starts a hop from the near edge; the unit is never drawn inside; it lands beyond and the hop ends.
{
  const u=walker();u.x=90;stepWallVault(g,u,block,1/60,'test');
  u.x=101;eq(stepWallVault(g,u,block,1/60,'test'),true,'entering starts the hop');ok(u._vault,'in the air');eq(u.x,90,'takes off at the edge it reached');
  const land=u._vault.tx;ok(land>=160+10,'lands past the far side with clearance');ok(u._vault.dur>=WALL_VAULT.minTime&&u._vault.dur<=WALL_VAULT.maxTime,'0.3-0.45 s');
  let peak=0,frames=0;
  while(u._vault&&frames<60){u.x+=2;stepWallVault(g,u,block,1/60,'test');frames++;peak=Math.max(peak,u._jumpLift);ok(u.x>=90&&u.x<=land,'moves along the arc, not by walking');}
  eq(u._vault,undefined,'the hop ends on landing');eq(u._jumpLift,0,'lift cleared');eq(u.x,land);ok(!block(u.x,u.y),'never stops on the obstacle');
  ok(frames>=Math.floor(WALL_VAULT.minTime*60)-1&&frames<=Math.ceil(WALL_VAULT.maxTime*60)+1,`air time ${frames} frames`);
  ok(peak>=8&&peak<=WALL_VAULT.maxHeight,`small jump height ${peak.toFixed(1)}`);
  ok(g.particles.length>0,'landing dust');ok(u._vaultCd>0,'cooldown after landing');
}
// 3. Back-to-back obstacles: no hop every frame; during the cooldown the unit waits at the next edge (not inside), then hops.
{
  const twin=(x)=>(x>=100&&x<160)||(x>=200&&x<240);
  const u=walker();let hops=0,inside=0;
  for(let i=0;i<240;i++){const was=!!u._vault;if(!u._vault)u.x+=3;stepWallVault(g,u,twin,1/60,'test');if(!was&&u._vault)hops++;if(!u._vault&&twin(u.x,u.y))inside++;}
  eq(inside,0,'never walks inside either obstacle');ok(hops>=1&&hops<=2,`hops ${hops}`);ok(u.x>240,'got past both');
}
// 4. Reduced motion keeps the hop low.
{
  globalThis.matchMedia=()=>({matches:true});
  const u=walker();u.x=95;stepWallVault(g,u,block,1/60,'test');u.x=101;stepWallVault(g,u,block,1/60,'test');eq(u._vault.h,WALL_VAULT.reducedHeight,'low hop with reduced motion');
  delete globalThis.matchMedia;
}
// 5. Too thick to hop: old pass-through behaviour (no stuck unit); teleports and space changes never start a hop.
{
  const wide=(x)=>x>=100&&x<100+WALL_VAULT.scan+50;
  const u=walker();u.x=95;stepWallVault(g,u,wide,1/60,'test');u.x=101;eq(stepWallVault(g,u,wide,1/60,'test'),false);eq(u._vault,undefined);eq(u.x,101,'keeps moving');
  eq(vaultLanding(g,u,{x:95,y:0},{x:101,y:0},wide),null);
  const t=walker();t.x=95;stepWallVault(g,t,block,1/60,'test');t.x=130+WALL_VAULT.maxStep;eq(stepWallVault(g,t,block,1/60,'test'),false,'a teleport is not a hop');
  const s=walker();s.x=95;stepWallVault(g,s,block,1/60,'test');s.x=101;stepWallVault(g,s,block,1/60,'test');ok(s._vault);
  eq(stepWallVault(g,s,block,1/60,'other-space'),false,'space change cancels');eq(s._vault,undefined);
  const d=walker();d.x=95;stepWallVault(g,d,block,1/60,'test');d.x=101;stepWallVault(g,d,block,1/60,'test');d.isDown=true;stepWallVault(g,d,block,1/60,'test');eq(d._vault,undefined,'going down cancels');
  const f={...walker(),flying:true};f.x=95;stepWallVault(g,f,block,1/60,'test');f.x=101;eq(stepWallVault(g,f,block,1/60,'test'),false,'flyers do not hop');
}
// 6. Fortification lines (field walls): a classed-up commander hops across the line; a basic walker is still stopped.
{
  const field={currentDungeon:null,particles:[],pushParticle(p){this.particles.push(p);}};
  const w=wallGeometry(field),open=()=>false;
  const hero={x:w.right+40,y:w.top+120,radius:10,isAdvanced:true,advancedClass:'WARLORD'};
  stepWallVault(field,hero,open,1/60,'field');hero.x=w.right-4;
  eq(stepWallVault(field,hero,open,1/60,'field'),true,'crossing the wall line starts a hop');eq(hero.x,w.right+40,'takes off outside');ok(hero._vault.tx<w.right-10,'lands inside, clear of the line');
  for(let i=0;i<40&&hero._vault;i++)stepWallVault(field,hero,open,1/60,'field');eq(hero._vault,undefined);ok(hero.x<w.right-10);
  const basic={x:w.right+40,y:w.top+120,radius:10};
  eq(resolveWallMovement({currentDungeon:null,player:basic},basic,w.right-40,basic.y),true);ok(basic.x<w.right,'basic walker unchanged (blocked)');
  eq(passesWalls({soldierClass:'HEAVY'}),false,'basic soldiers still do not pass');
}
// 7. Save: the hop is never saved; a unit saved mid-air is stored at its landing spot.
{
  const u=walker();u.x=95;stepWallVault(g,u,block,1/60,'test');u.x=101;stepWallVault(g,u,block,1/60,'test');stepWallVault(g,u,block,.1,'test');
  const saved=persistentUnit(u);eq(saved._vault,undefined);eq(saved._jumpLift,undefined);eq(saved.x,u._vault.tx,'saved at the landing spot');eq(restingPosition(u).x,u._vault.tx);
  assert.doesNotThrow(()=>JSON.stringify(saved));clearWallVault(u);eq(u._vault,undefined);
  const plain=walker();eq(persistentUnit(plain).x,60);
}
// 8. Real dungeon layout (the same test dungeon as class-wall): open 520-840, rock 840-1560, open 1560-2120 on y=200.
//    The classed-up commander and soldier hop over the 720 px rock (faster, slightly longer hop); a basic soldier is pushed back.
{
  const game=Object.create(IronSquadGame);
  const dungeon={kind:'dungeon',id:'vault-test',width:2200,height:900};
  Object.assign(game,{currentDungeon:dungeon,platoons:[],civilians:[],merchants:[],monsters:[],particles:[]});
  game.pushParticle=function(p){this.particles.push(p);};
  game.player={x:800,y:200,isAdvanced:true,advancedClass:'WARLORD',radius:10};
  game.squad=[{id:1,x:800,y:205,soldierClass:'BLADEMASTER',radius:10,isPersonalGuard:true},{id:2,x:800,y:210,soldierClass:'HEAVY',radius:10,isPersonalGuard:true}];
  game.settleTerrain(1/60);
  const adv=[game.player,game.squad[0]],seenInside={};let maxAir={};
  for(let i=0;i<120;i++){
    for(const u of [...adv,game.squad[1]])if(!u._vault)u.x+=3;
    game.settleTerrain(1/60);
    for(const u of adv){if(u._vault)maxAir[u===game.player?'p':'s']=(maxAir[u===game.player?'p':'s']||0)+1;else if(dungeonBlocks(dungeon,u.x,u.y))seenInside[u===game.player?'p':'s']=true;}
  }
  ok(game.player.x>1560&&game.squad[0].x>1560,`advanced units are past the rock (${game.player.x.toFixed(0)}, ${game.squad[0].x.toFixed(0)})`);
  eq(Object.keys(seenInside).length,0,'never shown walking inside the rock');
  ok(maxAir.p/60<=WALL_VAULT.longMaxTime+.05,'thick rock hop stays short');
  ok(game.squad[1].x<860,'a basic soldier is still stopped by the dungeon wall');eq(game.squad[1]._vault,undefined);
  const saved=persistentUnit(game.squad[0]);eq(saved._vault,undefined);eq(saved._vaultCd,undefined);
}
// 9. A goal inside the obstacle (formation spot in rock): the unit waits at the edge instead of hopping past and back.
{
  const gg={...g,_terrainTick:5};const u=walker();u.x=95;stepWallVault(gg,u,block,1/60,'test');
  u._moveGoal={x:130,y:0};u._moveGoalTick=4;u.x=101;eq(stepWallVault(gg,u,block,1/60,'test'),true);eq(u._vault,undefined,'no hop toward a goal inside the block');eq(u.x,95,'waits at the edge');
  u._moveGoal={x:400,y:0};u.x=101;stepWallVault(gg,u,block,1/60,'test');ok(u._vault,'a goal beyond the block hops');
  const s2=walker();s2.x=95;stepWallVault(gg,s2,block,1/60,'test');s2._moveGoal={x:130,y:0};s2._moveGoalTick=1;s2.x=101;stepWallVault(gg,s2,block,1/60,'test');ok(s2._vault,'a stale goal is ignored');
}
console.log(`PASS: v7.1.6 wall hop (edge take-off, 0.3-0.45 s arc, landing + dust, cooldown wait at the next edge, reduced motion, thick fallback, teleport/space/down/flyer, fortification line, basic walkers unchanged, save never stores the hop) (${checks} checks)`);
