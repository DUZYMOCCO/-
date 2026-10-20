import {WORLD_SIZE,TAVERN_SITE,SETTLEMENTS,fieldBlocks} from './world.js?v=289';
import {economicFieldBlocked} from './regional-economy.js?v=277';
import {headquartersBuildingBlocks} from './hq-facilities.js?v=322';
import {farmPosts,FARM_X,FARM_Y} from './reserve-farm.js?v=277';
import {drawFieldCivilian} from './civilian-visuals.js?v=295';
import {createSoldierAppearance} from './soldier-appearance.js?v=342';
import {daylightAt} from './day-night.js?v=208';
import {dungeonBlocks} from './dungeon.js?v=351';
import {gameText} from './game-text.js?v=341';
export const AMBIENT_LIMITS=Object.freeze({residents:16,walkers:12,walkingShare:.25,scanSeconds:.5,siteCache:6,walkSeconds:[10,20]});
export const AMBIENT_COUNTS=Object.freeze({many:16,normal:10,few:5,none:0});
export const AMBIENT_SETTING_KEY='game_studio_ironsquad_ambient';
const C=WORLD_SIZE/2,states=new WeakMap();
const hash=text=>{let n=2166136261;for(const ch of String(text))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;};
const sites=[{id:'hq',kind:'hq',x:C,y:C,rx:240,ry:270},
 {id:'tavern',kind:'tavern',x:TAVERN_SITE.x,y:TAVERN_SITE.y+200,rx:175,ry:160},
 {id:'river_farms',kind:'farm',x:FARM_X,y:FARM_Y,rx:600,ry:250},
 ...SETTLEMENTS.filter(s=>s.kind==='town').map(s=>({id:s.id,kind:'town',x:C+s.ox,y:C+s.oy,rx:s.padW/2-12,ry:s.padH/2-12,definition:s}))];
export function resetAmbientCrowd(game){states.delete(game);}
function state(game) {
 let s=states.get(game);if(!s){s={clock:0,nextScan:0,populations:new Map(),active:[],visible:[],walkers:new Map(),waiting:new WeakMap(),poses:new Map(),posts:[],source:null};states.set(game,s);}return s;
}
const visible=(game,p,margin=40)=>!!game.camera&&Math.abs(p.x-game.camera.x)<game.width/(2*(game.zoom||1))+margin&&Math.abs(p.y-game.camera.y)<game.height/(2*(game.zoom||1))+margin;
const local=(site,p)=>Math.abs(p.x-site.x)<site.rx&&Math.abs(p.y-site.y)<site.ry;
// Visual houses/crops also count here, in addition to the game's terrain/shop checks.
export function ambientBlocked(game,site,x,y) {
 if(!local(site,{x,y}))return true;
 if(site.interior){if(dungeonBlocks(game.currentDungeon,x,y))return true;}
 else if(fieldBlocks(x,y)||economicFieldBlocked(game,x,y)||headquartersBuildingBlocks(x,y))return true;
 if(site.kind==='tavern')return y<TAVERN_SITE.y+35;
 const dx=x-site.x,dy=y-site.y;
 if(site.kind==='town'&&site.definition)for(const p of site.definition.props||[])if(p.type==='house'&&Math.abs(dx-p.dx)<p.w/2+9&&dy>p.dy-p.h-8&&dy<p.dy+10)return true;
 const region=game.nation?.economy?.regions?.[site.regionId||site.id],level=Math.max(region?.level||0,site.kind==='hq'||site.headquarters?game.nation?.level||0:0),urban=game.nation?.economy?.technology?.urban?.level||0;
 const stage=Math.min(5,level+Math.floor(urban/2)),radius=site.interior?220:140+stage*16,count=Math.min(22,4+stage*3);
 // Settlement graphics use the same radial house placements at each development stage.
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2,r=radius*(stage>=2?.9+i%3*.05:1),bx=Math.cos(a)*r,by=Math.sin(a)*r;
  if(Math.abs(dx-bx)<(stage>=3?34:27)&&dy>by-(24+stage*4)-10&&dy<by+12)return true;}
 if(stage>=4&&Math.abs(Math.abs(dx)-radius*.6)<33&&Math.abs(Math.abs(dy)-radius*.39)<40)return true;
 if((site.kind==='hq'||site.headquarters)&&Math.abs(dx)<85&&dy<25&&dy> -165)return true;
 if(stage>=1&&Math.abs(dx+radius*.6)<38&&Math.abs(dy-radius*.7)<28)return true;
 if((site.kind!=='hq'||site.interior)&&Math.abs(dx-radius*.75)<38&&dy> -radius*.7-45&&dy< -radius*.7+42)return true;
 if(stage>=3&&Math.abs(dx)<30&&Math.abs(dy-radius*.65)<20)return true;
 if(site.kind==='farm')for(let i=0;i<3;i++)if(dx>radius+50&&dx<radius+170&&dy> -80+i*54&&dy< -20+i*54)return true;
 return false;
}
const segmentClear=(a,b,blocked)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=1;i<=Math.max(1,n);i++)if(blocked(a.x+(b.x-a.x)*i/Math.max(1,n),a.y+(b.y-a.y)*i/Math.max(1,n)))return false;return true;};
export function ambientRoute(from,to,blocked) {
 if(blocked(to.x,to.y))return null;
 if(segmentClear(from,to,blocked))return [{...to}];
 for(const corner of [{x:from.x,y:to.y},{x:to.x,y:from.y}])if(segmentClear(from,corner,blocked)&&segmentClear(corner,to,blocked))return [corner,{...to}];
 return null;
}
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/2**32;}
function goal(site,origin,s,reach=90) {return {x:Math.max(site.x-site.rx+12,Math.min(site.x+site.rx-12,origin.x+(random(s)-.5)*reach*2)),y:Math.max(site.y-site.ry+12,Math.min(site.y+site.ry-12,origin.y+(random(s)-.5)*reach*2))};}
function makePopulation(game,site) {
 const pop={site,seed:hash(site.id),people:[],unsafe:false,enemy:null};
 for(let i=0;i<AMBIENT_LIMITS.residents;i++){
  const id=`ambient:${site.id}:${i}`,n=hash(id),kind=i%4===2?'child':i%4===3?'elder':'woman',gender=kind==='woman'||n%2===0?'female':'male';
  const appearance=createSoldierAppearance(id,gender);Object.assign(appearance,{scar:false,handsome:false,facialHair:'none'});
  if(kind==='elder')Object.assign(appearance,{hairColor:'#dedbd1',hairStyle:n%2?'horseshoe':'swept',facialHair:'chin'});
  if(kind==='child')Object.assign(appearance,{faceShape:'round',glasses:'none'});
  const group=Math.floor(i/3),anchor={x:site.x+(site.kind==='farm'?(group%2?310:35)+(group%3-1)*40:(group%3-1)*55),y:site.y+45+Math.floor(group/3)*52};
  let p=null;for(let attempt=0;attempt<50;attempt++){const candidate=goal(site,anchor,pop,attempt<15?45:150);if(!ambientBlocked(game,site,candidate.x,candidate.y)){p=candidate;break;}}
  if(!p)continue;
  pop.people.push({id,kind,appearance,x:p.x,y:p.y,home:{...p},anchor,seed:n,wait:1+n%9,alpha:0,hidden:false,path:[],ambient:true,ambientWalking:false,ambientCloth:(site.kind==='farm'?['#83815d','#9b825e','#78866c']:['#8e7479','#758c89','#9a8665'])[n%3]});
 }
 return pop;
}
function refreshSites(game,s) {
 const dungeon=game.currentDungeon;let definitions=[];
 if(dungeon?.kind==='town')definitions=[{id:`inside:${dungeon.id}`,regionId:dungeon.id==='royal_castle_town'?'hq':dungeon.id,headquarters:dungeon.id==='royal_castle_town',kind:'town',interior:true,x:dungeon.width*.62,y:dungeon.height*.5,rx:300,ry:235}];
 else if(!dungeon)definitions=sites;
 const nearby=definitions.filter(site=>Math.abs(site.x-game.camera.x)<site.rx+game.width/(2*(game.zoom||1))+30&&Math.abs(site.y-game.camera.y)<site.ry+game.height/(2*(game.zoom||1))+30);
 s.active=nearby.map(site=>{let pop=s.populations.get(site.id);if(!pop){pop=makePopulation(game,site);if(s.populations.size>=AMBIENT_LIMITS.siteCache)s.populations.delete(s.populations.keys().next().value);s.populations.set(site.id,pop);}return pop;});
 for(const pop of s.active){const site=pop.site;pop.enemy=(game.monsters||[]).find(m=>!m.dead&&!m.retreated&&m.hp>0&&Math.abs(m.x-site.x)<site.rx+350&&Math.abs(m.y-site.y)<site.ry+350)||null;pop.unsafe=!!pop.enemy;}
 const farmNear=!dungeon&&nearby.some(site=>site.kind==='farm');
 s.posts=farmNear?farmPosts((game.reserves||[]).filter(u=>!u.isDown&&!u.dying&&u.hp>0&&!u.carrierId&&!u.heroPartyId),(x,y)=>economicFieldBlocked(game,x,y)):[];
}
function advance(person,dt,speed) {
 let remaining=dt*speed;person.ambientWalking=false;
 while(person.path.length&&remaining>0){const target=person.path[0],dx=target.x-person.x,dy=target.y-person.y,d=Math.hypot(dx,dy);if(d<.01){person.path.shift();continue;}const step=Math.min(d,remaining);person.x+=dx/d*step;person.y+=dy/d*step;person.facingAngle=Math.atan2(dy,dx);person.ambientWalking=true;remaining-=step;if(step>=d)person.path.shift();}
}
function updateResidents(game,s,dt) {
 const limit=AMBIENT_COUNTS[game.ambientDensity||'normal'],night=daylightAt(game.worldTime).period==='night';s.visible.length=0;
 for(const pop of s.active){
  const desired=pop.site.kind==='tavern'?(night?Math.min(16,limit+2):Math.ceil(limit*.6)):night?Math.ceil(limit*.45):limit;
  for(let i=0;i<pop.people.length;i++){
   const p=pop.people[i];if(s.visible.length>=limit||(!visible(game,p,55)&&!p.fleeing&&!p.hidden))continue;
   if(i>=desired||(night&&pop.site.kind==='tavern'&&p.kind==='child'))continue;
   if(!pop.unsafe)p.wait-=dt;
   if(pop.unsafe){
    if(!p.fleeing&&!p.hidden){p.fleeing=true;p.fleeTime=0;const dx=p.x-pop.enemy.x,dy=p.y-pop.enemy.y,d=Math.hypot(dx,dy)||1;const dest={x:Math.max(pop.site.x-pop.site.rx+12,Math.min(pop.site.x+pop.site.rx-12,p.x+dx/d*100)),y:Math.max(pop.site.y-pop.site.ry+12,Math.min(pop.site.y+pop.site.ry-12,p.y+dy/d*100))};p.path=ambientRoute(p,dest,(x,y)=>ambientBlocked(game,pop.site,x,y))||[];}
    if(p.fleeing){advance(p,dt,65);p.fleeTime+=dt;p.alpha=Math.max(0,p.alpha-dt*.8);if(p.fleeTime>1.5||!p.path.length){p.hidden=true;p.fleeing=false;p.wait=2+i*.45;p.path=[];}}
   }else{
    if(p.hidden){if(p.wait>0)continue;p.hidden=false;p.x=p.home.x;p.y=p.home.y;p.alpha=0;p.wait=3+i%5;}
    p.fleeing=false;p.alpha=Math.min(1,p.alpha+dt*.7);
    if(!p.path.length&&p.wait<=0){
     const block=(x,y)=>ambientBlocked(game,pop.site,x,y);let path=null;
     // Small groups share a meeting spot; children sometimes circle its adult.
     if(p.kind==='child'&&random(pop)<.4){const adult=pop.people[Math.max(0,i-1)],points=Array.from({length:8},(_,k)=>({x:adult.home.x+Math.cos(k*Math.PI/4)*22,y:adult.home.y+Math.sin(k*Math.PI/4)*22}));let from=p;path=[];for(const to of points){const leg=ambientRoute(from,to,block);if(!leg){path=null;break;}path.push(...leg);from=to;}}
     for(let a=0;!path&&a<8;a++){const to=random(pop)<.4?{x:p.anchor.x+(i%3-1)*15,y:p.anchor.y+(i%2)*10}:goal(pop.site,p.home,pop,90);path=ambientRoute(p,to,block);}
     p.path=path||[];p.wait=6+random(pop)*9;p.running=p.kind==='child'&&random(pop)<.3;
    }
    advance(p,dt,p.kind==='elder'?12:p.kind==='child'?(p.running?62:34):22);
   }
   if(!p.hidden&&p.alpha>0&&visible(game,p,55))s.visible.push(p);
  }
 }
}
function updateWalkers(game,s,dt) {
 const site=game._campAtTavern?sites[1]:sites[0],cohort=[];
 if(!game.currentDungeon&&game._campYardQuiet)for(const unit of game.squad||[]){const seat=unit._leisureSeat;
  if(!unit.isPersonalGuard&&seat&&unit.campPose&&!unit.dead&&!unit.isDown&&!unit.carrierId&&!unit.magicRecovering&&unit.hp>=unit.maxHp*.98&&!game._medicRescueAssign?.has(unit.id)&&visible(game,seat,80)&&Math.hypot(unit.x-seat.x,unit.y-seat.y)<12)cohort.push({unit,home:seat,site});}
 for(const post of s.posts)if(visible(game,post,80)&&!post.soldier.dead&&!post.soldier.isDown&&!post.soldier.dying&&post.soldier.hp>=post.soldier.maxHp*.98&&!game._medicRescueAssign?.has(post.soldier.id))cohort.push({unit:post.soldier,home:post,site:sites[2]});
 const max=Math.min(AMBIENT_LIMITS.walkers,Math.floor(cohort.length*AMBIENT_LIMITS.walkingShare)),eligible=new Set(cohort.map(c=>c.unit)),carriers=new Set((game.squad||[]).concat(game.reserves||[],game.civilians||[],game._merchantWounded||[],game.player||[]).filter(u=>u.carrierId).map(u=>u.carrierId));
 s.poses.clear();for(const unit of s.walkers.keys())if(!eligible.has(unit)||carriers.has(unit.id))s.walkers.delete(unit);while(s.walkers.size>max)s.walkers.delete(s.walkers.keys().next().value);
 for(const {unit,home,site}of cohort){
  const threat=(game.monsters||[]).some(m=>!m.dead&&m.hp>0&&Math.hypot(m.x-home.x,m.y-home.y)<500);
  if(threat||carriers.has(unit.id)||game.baseRaidActive||game.invasions?.stage&&game.invasions.stage!=='idle'){s.walkers.delete(unit);continue;}
  let walk=s.walkers.get(unit),wait=s.waiting.get(unit);if(wait===undefined)wait=5+hash(unit.id)%37;
  if(!walk){wait-=dt;s.waiting.set(unit,wait);if(wait>0||s.walkers.size>=max)continue;
   const seed={seed:hash(`${unit.id}:${Math.floor(s.clock)}`)},block=(x,y)=>ambientBlocked(game,site,x,y);let route=null;
   for(let a=0;!route&&a<10;a++)route=ambientRoute(home,goal(site,home,seed,75),block);
   if(!route){s.waiting.set(unit,8);continue;}
   const routeBack=[...route.slice(0,-1)].reverse().concat([{x:home.x,y:home.y}]),path=route.concat(routeBack),length=path.reduce((n,p,i)=>n+Math.hypot(p.x-(i?path[i-1].x:home.x),p.y-(i?path[i-1].y:home.y)),0);
   walk={x:home.x,y:home.y,path,elapsed:0,speed:length/(10+hash(unit.id)%11),facingAngle:home.facing};s.walkers.set(unit,walk);
  }
  advance(walk,dt,walk.speed);walk.elapsed+=dt;
  if(!walk.path.length||walk.elapsed>20.1){s.walkers.delete(unit);s.waiting.set(unit,25+hash(unit.id)%25);continue;}
  s.poses.set(unit,{x:walk.x,y:walk.y,vx:Math.cos(walk.facingAngle),vy:Math.sin(walk.facingAngle),facingAngle:walk.facingAngle,campPose:null,farmPose:null});
 }
}
export function updateAmbientCrowd(game,dt) {
 if(!game.camera||!game.player||!(dt>0))return;const s=state(game);s.clock+=dt;
 const geometry=`${game.nation?.level||0}:${game.nation?.economy?.technology?.urban?.level||0}:${game.nation?.economy?.revision||0}`;
 if(s.geometry!==geometry||s.dungeon!==game.currentDungeon){s.populations.clear();s.walkers.clear();s.poses.clear();s.nextScan=0;s.geometry=geometry;s.dungeon=game.currentDungeon;}
 if(s.clock>=s.nextScan){refreshSites(game,s);s.nextScan=s.clock+AMBIENT_LIMITS.scanSeconds;}
 updateResidents(game,s,Math.min(.1,dt));updateWalkers(game,s,Math.min(.1,dt));
}
export function ambientResidents(game){return states.get(game)?.visible||[];}
export function ambientSoldierPose(game,unit){return states.get(game)?.poses.get(unit)||null;}
export function ambientFarmPosts(game){return states.get(game)?.posts||[];}
export function ambientSnapshot(game){const s=state(game);return {populations:s.populations.size,residents:s.visible.length,walkers:s.poses.size,people:s.visible.map(p=>({id:p.id,kind:p.kind,x:p.x,y:p.y,alpha:p.alpha,walking:p.ambientWalking})),paths:[...s.walkers.values()].map(p=>({x:p.x,y:p.y,path:p.path}))};}
export function drawAmbientResident(ctx,person,now){ctx.save();ctx.globalAlpha*=person.alpha;drawFieldCivilian(ctx,person,now);ctx.restore();}
export function configureAmbientSettings(game) {
 const host=game.container?.querySelector('#view-strat-settings')||game.container?.querySelector('#view-strat-overview');if(!host)return null;
 let saved='normal';try{saved=localStorage.getItem(AMBIENT_SETTING_KEY)||saved;}catch{}
 game.ambientDensity=Object.hasOwn(AMBIENT_COUNTS,saved)?saved:'normal';
 const section=document.createElement('details');section.className='command-fold';section.id='ambient-settings';section.innerHTML=gameText('<summary>街のにぎわい</summary><div class="fold-content"><label>住民の数 <select id="ambient-density"><option value="many">多い</option><option value="normal">ふつう</option><option value="few">少ない</option><option value="none">なし</option></select></label><p>近くの住民だけを表示します。</p></div>');host.append(section);
 const select=section.querySelector('select');select.value=game.ambientDensity;select.onchange=()=>{game.ambientDensity=select.value;try{localStorage.setItem(AMBIENT_SETTING_KEY,select.value);}catch{}const s=state(game);s.visible.length=0;s.nextScan=0;};
 return {dispose(){select.onchange=null;section.remove();resetAmbientCrowd(game);}};
}
