import {WORLD_SIZE,biomeAt,fieldTerrainAt} from './world.js?v=289';
import {WILDERNESS_ANCHORS} from './wilderness-layout.js?v=289';
import {encounterBand} from './biome-encounters.js?v=279';
const C=WORLD_SIZE/2,TAU=Math.PI*2;
export const WILDERNESS_RULES=Object.freeze({discovery:650,claim:110,guards:4,towerReveal:5000,blessingSeconds:180,attackBonus:.15});
const NAMES={ruin:'廃墟の宝箱',camp:'奥地の野営地',shrine:'旅人の祠',tower:'古い見張り台'};
const COLORS={ruin:'#d6bc86',camp:'#c69b79',shrine:'#b6cdb3',tower:'#a9c1ba'};
const PACKS={east:'wild_dog',south:'salt_scorpion',north:'snow_wolf',west:'bog_slime'};
const cache=new Map(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function clearGround(p,game,placed){
 if(p.x<1500||p.y<1500||p.x>WORLD_SIZE-1500||p.y>WORLD_SIZE-1500)return false;
 if((game.medicalPosts||[]).some(q=>distance(p,q)<1200)||(game.dungeons||[]).some(q=>q.entrance&&distance(p,q.entrance)<1200)||(game.outposts||[]).some(q=>distance(p,q)<1000)||placed.some(q=>distance(p,q)<1800))return false;
 for(const [dx,dy] of [[0,0],[-105,0],[105,0],[0,-105],[0,105],[-75,-75],[-75,75],[75,-75],[75,75]])if(fieldTerrainAt(p.x+dx,p.y+dy)!=='open')return false;
 return true;
}
export function wildernessLayout(game={}){
 const key=JSON.stringify([(game.medicalPosts||[]).map(p=>[p.x,p.y]),(game.dungeons||[]).map(d=>d.entrance),(game.outposts||[]).map(o=>[o.x,o.y])]);
 if(cache.has(key))return cache.get(key).map(p=>({...p}));
 const sites=[];
 for(const {region,ring,kind,x,y} of WILDERNESS_ANCHORS){
  const origin={x,y};let at=null;
  outer:for(const nudge of [0,140,280,420,700])for(let j=0;j<(nudge?16:1);j++){
   const q={x:Math.round(origin.x+Math.cos(j*TAU/16)*nudge),y:Math.round(origin.y+Math.sin(j*TAU/16)*nudge)};
   if(biomeAt(q.x,q.y).id===region&&clearGround(q,game,sites)){at=q;break outer;}
  }
  if(!at)continue;
  sites.push({id:`wild-${region}-${ring}-${kind}`,kind,region,...at,name:`${NAMES[kind]} ${ring+1}`,color:COLORS[kind],radius:60});
 }
 cache.set(key,sites.map(p=>Object.freeze({...p})));if(cache.size>4)cache.delete(cache.keys().next().value);return sites;
}
export function initializeWildernessSites(game,saved=null){
 const states=new Map((Array.isArray(saved?.wildernessSites)?saved.wildernessSites:[]).map(s=>[s.id,s]));
 game.wildernessSites=wildernessLayout(game).map(site=>{
  const old=states.get(site.id);return {...site,discovered:!!old?.discovered||!!game.fog?.isExploredWorld?.(site.x,site.y),cleared:!!old?.cleared,guardsDefeated:Math.max(0,Math.min(4,Math.floor(Number(old?.guardsDefeated)||0)))};
 });
 game.wildernessBlessing=Math.max(0,Math.min(180,Number(saved?.wildernessBlessing)||0));game._wildernessClock=0;
}
export const serializeWildernessSites=game=>(game.wildernessSites||[]).map(s=>({id:s.id,discovered:!!s.discovered,cleared:!!s.cleared,guardsDefeated:s.guardsDefeated||0}));
export function recordWildernessGuardKill(game,monster){
 if(!monster?.wildernessSiteId||monster._wildernessKillCredited)return;
 const site=game.wildernessSites?.find(s=>s.id===monster.wildernessSiteId);if(!site||site.cleared)return;
 monster._wildernessKillCredited=true;site.guardsDefeated=Math.min(4,(site.guardsDefeated||0)+1);
}
export function updateWildernessSites(game,dt=0){
 game.wildernessBlessing=Math.max(0,(game.wildernessBlessing||0)-Math.max(0,dt));
 if(game.currentDungeon||game.restTimer>0||!game.player||game.player.isDown||game.player.hp<=0)return;
 game._wildernessClock=(game._wildernessClock||0)+dt;if(game._wildernessClock<.25)return;game._wildernessClock=0;
 for(const site of game.wildernessSites||[]){
  const d=distance(site,game.player);if(d>650)continue;
  if(!site.discovered){site.discovered=true;game.showToast?.(`発見：${site.name}`);}
  if(site.cleared)continue;
  if(site.kind==='camp'&&(site.guardsDefeated||0)<4){
   const alive=(game.monsters||[]).filter(m=>m.wildernessSiteId===site.id&&m.hp>0).length;
   const resting=(game.restMonsters||[]).filter(m=>m.wildernessSiteId===site.id&&m.hp>0).length;
   const needed=4-(site.guardsDefeated||0)-alive-resting;
   if(needed>0&&game.monsters.length<40){
    const start=game.monsters.length,type=PACKS[site.region],band=encounterBand(Math.hypot(site.x-C,site.y-C));
    // Explicit group size also permits the remaining one/two guards after revisiting.
    game.spawnMonster(site.x+125,site.y-95,null,{type,band,region:site.region,groupLimit:Math.min(needed,40-start),forceGroup:true});
    for(let i=start;i<game.monsters.length;i++)game.monsters[i].wildernessSiteId=site.id;
   }
   continue;
  }
  if(d<=110)game.claimWildernessSite?.(site);
 }
}
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
export function drawWildernessSite(c,s,game){
 c.save();c.translate(s.x,s.y);c.lineJoin='round';c.lineCap='round';
 oval(c,2,9,66,27,'#0d171c66');oval(c,0,3,61,22,'#8a81604d');
 if(s.kind==='ruin'){
  for(const side of [-1,1])for(let i=0;i<3;i++){c.fillStyle=i%2?'#919789':'#737f78';c.fillRect(side*42-10,-i*15-15,22,13);c.fillStyle='#bcc0a455';c.fillRect(side*42-10,-i*15-15,22,2);}
  c.fillStyle='#554c39';c.fillRect(-23,-17,46,27);c.fillStyle='#a3834e';c.fillRect(-23,-19,46,8);c.strokeStyle='#c6ac71';c.lineWidth=3;c.strokeRect(-22,-18,44,27);c.fillStyle='#d7c286';c.fillRect(-3,-10,6,10);
  if(s.cleared){c.fillStyle='#272e2b';c.fillRect(-18,-15,36,8);c.fillStyle='#9d8659';c.fillRect(-23,-28,46,9);}
 }else if(s.kind==='camp'){
  c.fillStyle='#6a6550';c.beginPath();c.moveTo(-58,0);c.quadraticCurveTo(-47,-26,-32,-48);c.quadraticCurveTo(-18,-23,-7,0);c.closePath();c.fill();c.fillStyle='#a99b72';c.beginPath();c.moveTo(-58,0);c.lineTo(-32,-48);c.lineTo(-30,0);c.closePath();c.fill();
  c.fillStyle='#292f2a';c.beginPath();c.moveTo(-39,0);c.lineTo(-30,-26);c.lineTo(-22,0);c.closePath();c.fill();
  for(let i=0;i<7;i++)oval(c,23+Math.cos(i)*17,Math.sin(i)*8,5,3,'#929183');c.strokeStyle='#75563b';c.lineWidth=5;c.beginPath();c.moveTo(11,2);c.lineTo(35,-7);c.moveTo(13,-7);c.lineTo(33,2);c.stroke();
  if(!s.cleared){oval(c,23,-7,7,10,'#d48b50');oval(c,23,-10,3,6,'#e5c786');}
 }else if(s.kind==='shrine'){
  c.fillStyle='#78887d';c.fillRect(-32,-3,64,14);c.fillStyle='#a9b49c';c.fillRect(-25,-8,50,8);c.fillStyle='#8f9e8c';c.fillRect(-21,-49,42,41);c.fillStyle='#c9cbb0';c.fillRect(-25,-56,50,9);
  c.fillStyle='#3d5956';c.beginPath();c.arc(0,-32,11,Math.PI,0);c.lineTo(11,-12);c.lineTo(-11,-12);c.fill();oval(c,0,-27,5,8,s.cleared?'#91ada0':'#d2d3a7');c.strokeStyle='#d5d8b8';c.lineWidth=2;c.beginPath();c.moveTo(-15,-46);c.lineTo(15,-46);c.stroke();
 }else{
  c.strokeStyle='#625541';c.lineWidth=8;for(const side of [-1,1]){c.beginPath();c.moveTo(side*27,4);c.lineTo(side*21,-61);c.stroke();}c.lineWidth=3;c.beginPath();c.moveTo(-22,-53);c.lineTo(24,-4);c.moveTo(22,-53);c.lineTo(-24,-4);c.stroke();
  c.fillStyle='#b4a17a';c.fillRect(-34,-69,68,9);c.strokeStyle='#b3ae8b';c.lineWidth=3;c.strokeRect(-31,-90,62,22);c.fillStyle='#7f886e';c.beginPath();c.moveTo(-39,-90);c.lineTo(0,-110);c.lineTo(39,-90);c.closePath();c.fill();c.strokeStyle='#c3b28a';c.lineWidth=2;c.beginPath();c.moveTo(5,3);c.lineTo(5,-60);c.moveTo(18,3);c.lineTo(18,-60);for(let y=-55;y<3;y+=9){c.moveTo(5,y);c.lineTo(18,y);}c.stroke();
 }
 const y=s.kind==='tower'?-122:-70;
 c.textAlign='center';c.font='bold 11px sans-serif';c.strokeStyle='#1b2b2d';c.lineWidth=3;c.strokeText(s.name,0,y);c.fillStyle=s.cleared?'#9bb2a2':s.color;c.fillText(s.name,0,y);
 c.font='10px sans-serif';const text=s.cleared?'探索済':s.kind==='camp'?`守備隊 ${s.guardsDefeated||0}/4`:'近づいて調べる';c.strokeText(text,0,30);c.fillStyle='#e5ddbd';c.fillText(text,0,30);c.restore();
}
export function drawWildernessMap(c,game,px,py,inside=()=>true){
 c.save();c.lineWidth=1.2;
 for(const s of game.wildernessSites||[]){if(!inside(s.x,s.y)||(!s.discovered&&!game.fog?.isExploredWorld?.(s.x,s.y)))continue;const x=px(s.x),y=py(s.y),r=4;c.fillStyle=s.cleared?'#829b8d':s.color;c.strokeStyle='#1b3034';c.beginPath();
  if(s.kind==='ruin'){c.moveTo(x,y-r-1);c.lineTo(x+r,y);c.lineTo(x,y+r+1);c.lineTo(x-r,y);c.closePath();}
  else if(s.kind==='camp'){c.moveTo(x,y-r-1);c.lineTo(x+r+1,y+r);c.lineTo(x-r-1,y+r);c.closePath();}
  else if(s.kind==='tower'){c.rect(x-r*.7,y-r-2,r*1.4,r*2+3);}
  else c.arc(x,y,r,Math.PI,TAU);
  c.fill();c.stroke();
 }c.restore();
}
