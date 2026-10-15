import {enemyTier} from './enemy-tier.js?v=274';

export const DEATH_SHATTER_CAP=12,DEATH_SHARD_CAP=96;
const TAU=Math.PI*2,FLASH_LIFE=.08,GRAVITY=260;

/** A separate, temporary pool: kills must never displace combat sparks. */
export function spawnDeathShatter(game,monster) {
  if(!monster||monster.retreated||monster._deathShattered)return null;
  monster._deathShattered=true;
  const list=game.deathShatters||=[],tier=enemyTier(monster),boss=tier==='boss'||tier==='midboss';
  const count=boss?14:7,maxLife=.45*(boss?1.5:1);
  const size=Math.max(8,monster.radius||12)*Math.max(.25,monster.scale||1);
  const color=monster.bodyColor||monster.color||'#9ca3af';
  // Local visual RNG leaves loot, combat rolls and the global RNG untouched.
  let seed=((monster.x*73856093)^(monster.y*19349663)^Math.imul((game._deathShatterSequence=(game._deathShatterSequence||0)+1),83492791))>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const speed=Math.min(220,80+size*2),shards=[];
  for(let i=0;i<count;i++){
    const direction=TAU*(i+random()*.65)/count,velocity=speed*(.65+random()*.35);
    shards.push({x:Math.cos(direction)*size*.25,y:Math.sin(direction)*size*.25,
      vx:Math.cos(direction)*velocity,vy:Math.sin(direction)*velocity-35,
      angle:random()*TAU,spin:(random()-.5)*14,size:Math.max(4,size*.32*(.8+random()*.7))});
  }
  let total=list.reduce((sum,e)=>sum+e.shards.length,0);
  while(list.length>=DEATH_SHATTER_CAP||total+count>DEATH_SHARD_CAP)total-=list.shift().shards.length;
  const effect={x:monster.x,y:monster.y-size*.7,color,boss,shards,life:maxLife,maxLife,
    flashRadius:size*(boss?1.5:1.3),bounds:size*2+(speed+35)*maxLife+GRAVITY*maxLife*maxLife/2};
  list.push(effect);
  return effect;
}

export function updateDeathShatters(game,dt) {
  if(!(dt>0))return;
  const list=game.deathShatters;
  if(!list)return;
  for(let i=list.length-1;i>=0;i--){
    const effect=list[i];effect.life-=dt;
    if(effect.life<=0){list.splice(i,1);continue;}
    for(const shard of effect.shards){
      shard.x+=shard.vx*dt;shard.y+=shard.vy*dt+GRAVITY*dt*dt/2;
      shard.vy+=GRAVITY*dt;shard.angle+=shard.spin*dt;
    }
  }
}

/** Called inside the world transform, after enemies and before damage text. */
export function drawDeathShatters(game,ctx) {
  const list=game.deathShatters;
  if(!list?.length||!game.camera)return;
  const halfW=game.width/(2*(game.zoom||1)),halfH=game.height/(2*(game.zoom||1));
  for(const effect of list){
    if(Math.abs(effect.x-game.camera.x)>halfW+effect.bounds||Math.abs(effect.y-game.camera.y)>halfH+effect.bounds)continue;
    const age=effect.maxLife-effect.life;
    ctx.save();ctx.translate(effect.x,effect.y);
    const alpha=ctx.globalAlpha;
    if(age<FLASH_LIFE){
      ctx.globalAlpha=alpha*.9*(1-age/FLASH_LIFE);ctx.fillStyle='#ffffff';
      ctx.beginPath();ctx.arc(0,0,effect.flashRadius,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=alpha*Math.min(1,effect.life/.22);ctx.fillStyle=effect.color;
    ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=1;
    for(const shard of effect.shards){
      // Rotate three vertices instead of saving/restoring a context per shard.
      const c=Math.cos(shard.angle)*shard.size,s=Math.sin(shard.angle)*shard.size;
      ctx.beginPath();ctx.moveTo(shard.x+c,shard.y+s);
      ctx.lineTo(shard.x-c*.6-s*.7,shard.y-s*.6+c*.7);
      ctx.lineTo(shard.x-c*.5+s*.65,shard.y-s*.5-c*.65);
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
}
