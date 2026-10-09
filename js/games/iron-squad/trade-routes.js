import {WORLD_SIZE} from './world.js?v=146';
import {wallBlocksAttack} from './gate-rules.js?v=146';
import {ECONOMIC_REGIONS,PUBLIC_WORKS,ECONOMIC_RULES,economicState,discoverEconomicRegions,tickEconomicConstruction,economicFieldBlocked,localProduction,recordEconomicKill} from './regional-economy.js?v=146';
import {peaceContainment} from './peace-zones.js?v=146';

const C=WORLD_SIZE/2,STEP=256,MAX_SEARCH_NODES=400000,SEARCH_BATCH=96;
const FIELD_WALL_CONTEXT={currentDungeon:null};
const key=(x,y)=>`${x},${y}`;
const point=(x,y)=>[x*STEP,y*STEP];
const usable=(game,x,y)=>game.fog?.isExploredWorld(x,y)&&!economicFieldBlocked(game,x,y);
export function tradeSegmentOpen(game,a,b) {
  if(wallBlocksAttack(FIELD_WALL_CONTEXT,{x:a[0],y:a[1]},{x:b[0],y:b[1]}))return false;
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.max(1,Math.ceil(length/32));
  for(let i=0;i<=steps;i++)if(!usable(game,a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps))return false;
  return true;
}
const routeLength=points=>points.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0);
function simplify(points) {
  const result=[];
  for(const p of points){const a=result.at(-2),b=result.at(-1);if(a&&b&&(b[0]-a[0])*(p[1]-b[1])===(b[1]-a[1])*(p[0]-b[0]))result.pop();result.push(p);}
  return result;
}
function finishSearch(game,search) {
  const e=economicState(game),routes=[];
  for(const d of ECONOMIC_REGIONS){if(d.id==='hq'||!e.regions[d.id].discovered||!e.regions[d.id].liberated)continue;
    let end=null;
    for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
      const gx=Math.round(d.x/STEP)+dx,gy=Math.round(d.y/STEP)+dy,k=key(gx,gy);
      if(search.parents.has(k)&&tradeSegmentOpen(game,point(gx,gy),[d.x,d.y])){end=k;break;}
    }
    if(!end)continue;
    const points=[[d.x,d.y]];let cursor=end;
    while(cursor!==null){const [gx,gy]=cursor.split(',').map(Number);points.push(point(gx,gy));cursor=search.parents.get(cursor);}
    points.reverse();const cleaned=simplify(points),id=`trade_${d.id}`;
    routes.push({id,to:d.id,points:cleaned,length:routeLength(cleaned)});
    if(!e.routes.some(r=>r.id===id))game.showToast?.(`交易路開通：本陣 ↔ ${d.name} · 商人と旅人の往来が始まります`);
  }
  // An established route is retained only while every physical segment remains usable.
  e.routes=routes;game._tradeSearch=null;game._tradeRevision=search.revision;
}
export function refreshTradeRoutes(game,budget=SEARCH_BATCH) {
  const e=economicState(game);if(!game.fog)return;
  const revision=`${game.fog.revision||0}:${e.revision}`;
  if(!game._tradeSearch&&game._tradeRevision===revision)return;
  if(!game._tradeSearch){
    // Depart through the eastern approach, outside the headquarters walls.
    const sx=Math.round((C+512)/STEP),sy=Math.round(C/STEP),start=key(sx,sy);
    if(!usable(game,...point(sx,sy)))return;
    game._tradeSearch={revision,queue:[[sx,sy]],head:0,parents:new Map([[start,null]]),seen:new Set([start])};
  }
  const s=game._tradeSearch;let count=0;
  while(s.head<s.queue.length&&count++<budget&&s.parents.size<MAX_SEARCH_NODES){
    const [gx,gy]=s.queue[s.head++],a=point(gx,gy);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=gx+dx,ny=gy+dy,k=key(nx,ny);if(s.seen.has(k))continue;
      const b=point(nx,ny);if(b[0]<0||b[1]<0||b[0]>=WORLD_SIZE||b[1]>=WORLD_SIZE||!usable(game,...b)){s.seen.add(k);continue;}
      if(!tradeSegmentOpen(game,a,b))continue;s.seen.add(k);
      s.parents.set(k,key(gx,gy));s.queue.push([nx,ny]);
    }
  }
  if(s.head>=s.queue.length||s.parents.size>=MAX_SEARCH_NODES)finishSearch(game,s);
}
export function routePosition(route,distance,outbound=false) {
  let remaining=outbound?Math.max(0,route.length-distance):Math.max(0,distance);
  for(let i=1;i<route.points.length;i++){
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(remaining<=length||i===route.points.length-1){const t=Math.min(1,remaining/(length||1));return {x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t};}remaining-=length;
  }
  return {x:route.points[0][0],y:route.points[0][1]};
}
export function spawnTradeParty(game,route,role='merchant',outbound=false) {
  const e=economicState(game);if(!route||e.traffic.length>=ECONOMIC_RULES.trafficLimit)return null;
  const r=e.regions[route.to];if(!r||r.safety<.15)return null;
  const id=`commerce_${++e.sequence}`,pos=routePosition(route,0,outbound);
  const cargo=role==='merchant'?Math.max(40,Math.floor(localProduction(e,r.id)*.025)):0;
  const a={id,name:role==='merchant'?`商隊 ${e.sequence}`:`旅人 ${e.sequence}`,role,region:r.id,routeId:route.id,points:route.points.map(p=>[...p]),routeLength:route.length,...pos,hp:role==='merchant'?180:90,maxHp:role==='merchant'?180:90,atk:0,speed:role==='merchant'?100:135,progress:0,cargo,outbound,party:id,isCommerce:true};
  e.traffic.push(a);
  if(role==='merchant'&&e.patrols>0&&e.traffic.length<ECONOMIC_RULES.trafficLimit){
    e.traffic.push({...a,id:id+'_guard',name:'街道護衛',role:'guard',hp:240+e.technology.production.level*60,maxHp:240+e.technology.production.level*60,atk:22+e.technology.production.level*12,cargo:0,isCommerceGuard:true,speed:a.speed*1.05});
  }
  return a;
}
export function damageCommerce(game,actor,damage) {
  if(!actor||actor.dead||actor.hp<=0||!(damage>0))return false;
  const canonical=game.nation?.economy?.traffic?.find(a=>a.id===actor.id);
  if(!canonical)return false;
  const original=actor;actor=canonical;
  actor.hp=Math.max(0,actor.hp-damage);game.spawnDamageText?.(actor.x,actor.y-14,Math.round(damage),'#d8b2a2');
  original.hp=actor.hp;
  if(actor.hp>0)return true;
  actor.dead=true;const e=economicState(game),r=e.regions[actor.region];
  if(r){r.safety=Math.max(.05,r.safety-(actor.role==='merchant'?.12:.04));r.lost++;}
  if(actor.role==='merchant')e.losses++;
  game.leaveRemains?.(actor);
  if(actor.role==='merchant'&&game.remains?.at(-1))game.remains.at(-1).commerceWreck=true;
  game.recordBattleLog?.(`${actor.name}が${r?ECONOMIC_REGIONS.find(d=>d.id===r.id)?.name+'への街道':''}で襲撃され死亡${actor.cargo?' · 積荷を喪失':''}`,'rescue');
  return true;
}
export function nearestCommerceTarget(game,monster,current,distance=Infinity) {
  if(game.currentDungeon)return {target:current,distance};
  if(current?.isCommerce){current=game.nation?.economy?.traffic.find(a=>a.id===current.id&&a.hp>0)||null;distance=current?Math.hypot(current.x-monster.x,current.y-monster.y):Infinity;}
  let target=current,min=distance;
  for(const a of game.nation?.economy?.traffic||[]){if(a.dead||a.hp<=0)continue;const d=Math.hypot(a.x-monster.x,a.y-monster.y);if(d<min&&d<650){min=d;target=a;}}
  return {target,distance:min};
}
function deliver(game,a) {
  const e=economicState(game),r=e.regions[a.region];
  if(a.role==='merchant'){
    const tax=Math.floor(a.cargo*ECONOMIC_RULES.taxRate),local=a.cargo-tax;
    r.wealth+=local;r.delivered++;r.prosperity+=a.cargo/1000;r.safety=Math.min(1,r.safety+.015);
    game.treasury=(game.treasury||0)+tax;e.phaseTrade+=tax;e.shipments++;
    if(game.phaseFiscal)game.phaseFiscal.tradeRevenue=(game.phaseFiscal.tradeRevenue||0)+tax;
    game.recordBattleLog?.(`商隊到着：${ECONOMIC_REGIONS.find(d=>d.id===r.id).name}との取引 · 交易税+${tax}G`,'loot');
  }else if(a.role==='traveler'){
    r.wealth+=12;r.prosperity+=.1;
    const d=ECONOMIC_REGIONS.find(d=>d.id===r.id),capacity=(d.population||20)+r.level*35+e.technology.urban.level*25;
    r.population=Math.min(capacity,r.population+.2);
  }
  a.arrived=true;
}
function roadEncounter(game,dt) {
  const e=economicState(game);if(game.restTimer>0)return;
  e.raidClock+=dt;if(e.raidClock<45)return;e.raidClock=0;
  const candidates=e.traffic.filter(a=>a.role==='merchant'&&Math.hypot(a.x-C,a.y-C)>1800&&!peaceContainment(a.x,a.y));
  if(!candidates.length)return;
  const a=candidates[Math.floor(Math.random()*candidates.length)],r=e.regions[a.region];
  if(Math.random()<r.safety*.7||Math.random()<e.patrols*.08)return;
  const field=game.currentDungeon?(game.savedFieldMonsters||=[]):game.monsters;
  if(!field||field.filter(m=>m.isTradeRaider&&m.hp>0).length>=4)return;
  const raider={id:`road_raider_${++e.sequence}`,name:'街道の略奪者',type:'goblin',isTradeRaider:true,x:a.x+70,y:a.y+25,homeX:a.x+70,homeY:a.y+25,hp:180,maxHp:180,atk:26,speed:145,radius:12,color:'#a1a88b',atkTimer:0,lootDistance:Math.hypot(a.x-C,a.y-C)};
  field.push(raider);
}
function roadsideCombat(game,dt) {
  const e=economicState(game),field=game.currentDungeon?game.savedFieldMonsters:game.monsters;if(!field)return;
  for(const m of field){if(m.hp<=0||!m.isTradeRaider)continue;
    m._commerceRemote=false;
    // Ordinary outdoor AI handles raiders near the commander. This is remote traffic combat.
    if(!game.currentDungeon&&Math.hypot(m.x-game.player.x,m.y-game.player.y)<900)continue;
    m._commerceRemote=true;
    let target=null,best=500;for(const a of e.traffic){if(a.hp<=0||a.dead)continue;const d=Math.hypot(a.x-m.x,a.y-m.y);if(d<best){best=d;target=a;}}
    if(!target)continue;
    if(best>28){const step=Math.min(best-24,m.speed*dt),next={x:m.x+(target.x-m.x)/best*step,y:m.y+(target.y-m.y)/best*step};if(!economicFieldBlocked(game,next.x,next.y)&&!wallBlocksAttack(FIELD_WALL_CONTEXT,m,next)){m.x=next.x;m.y=next.y;}}
    m.atkTimer=(m.atkTimer||0)-dt;
    if(Math.hypot(m.x-target.x,m.y-target.y)<40&&m.atkTimer<=0){m.atkTimer=1.2;damageCommerce(game,target,m.atk);}
  }
  for(const guard of e.traffic){if(guard.role!=='guard'||guard.hp<=0)continue;guard.attackClock=Math.max(0,(guard.attackClock||0)-dt);if(guard.attackClock>0)continue;
    const enemy=field.find(m=>m.hp>0&&Math.hypot(m.x-guard.x,m.y-guard.y)<70);if(!enemy)continue;
    guard.attackClock=1;enemy.hp-=guard.atk;
    if(enemy.hp<=0){enemy.hp=0;recordEconomicKill(game,enemy,true);const region=e.regions[guard.region];if(region)region.safety=Math.min(1,region.safety+.05);game.recordBattleLog?.(`街道護衛が${enemy.name||'魔物'}を撃退`,'combat');}
  }
}
export function updateRegionalTraffic(game,dt) {
  if(!(dt>0)||!game.inBattle)return;
  const e=economicState(game);tickEconomicConstruction(game,dt);
  game._economyDiscoveryClock=(game._economyDiscoveryClock||0)+dt;
  if(game._economyDiscoveryClock>=1){game._economyDiscoveryClock=0;discoverEconomicRegions(game);}
  refreshTradeRoutes(game);
  e.spawnClock+=dt;
  const interval=Math.max(4,15-e.technology.transport.level*.6);
  if(e.spawnClock>=interval){e.spawnClock=0;const routes=e.routes.filter(r=>e.regions[r.to]?.safety>.15);
    if(routes.length&&e.traffic.length<ECONOMIC_RULES.trafficLimit){const route=routes[Math.floor(Math.random()*routes.length)];spawnTradeParty(game,route,Math.random()<.65?'merchant':'traveler',Math.random()<.5);}}
  for(const a of e.traffic){if(a.dead||a.hp<=0)continue;const route=a.points?.length>=2?{points:a.points,length:a.routeLength}:e.routes.find(r=>r.id===a.routeId);if(!route)continue;
    const party=a.role==='guard'?e.traffic.find(p=>p.id===a.party&&!p.dead&&!p.arrived):null;
    const roadBonus=PUBLIC_WORKS.filter(p=>p.region===a.region&&p.kind==='road'&&e.projects[p.id]?.done).length*.12;
    let speed=a.speed*(1+e.technology.transport.level*.04+roadBonus);
    const enemies=game.currentDungeon?game.savedFieldMonsters:game.monsters;
    if(a.role!=='guard'&&enemies?.some(m=>m.hp>0&&Math.hypot(m.x-a.x,m.y-a.y)<130))speed*=e.traffic.some(g=>g.role==='guard'&&g.party===a.id&&g.hp>0)?.4:1.35;
    a.progress=party?party.progress:Math.min(route.length,a.progress+speed*dt);
    const pos=routePosition(route,a.progress,a.outbound);a.x=pos.x;a.y=pos.y;
    if(a.progress>=route.length){if(a.role==='guard')a.arrived=true;else deliver(game,a);}
  }
  if(!(game.restTimer>0)){roadEncounter(game,dt);roadsideCombat(game,dt);}
  e.traffic=e.traffic.filter(a=>!a.dead&&!a.arrived&&a.hp>0);
}
export function persistTradeRaiders(game) {
  const e=economicState(game),field=game.currentDungeon?game.savedFieldMonsters:game.monsters;
  e.raiders=(field||[]).filter(m=>m.isTradeRaider&&m.hp>0).slice(0,4).map(m=>Object.fromEntries(Object.entries(m).filter(([k])=>!k.startsWith('_'))));
}
export function restoreTradeRaiders(game) {
  for(const m of economicState(game).raiders)if(!game.monsters.some(old=>old.id===m.id))game.monsters.push({...m});
}
