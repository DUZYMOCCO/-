// v7.2.14 魔王城の封印。北西・北・北東の祠に守護者が立ち、守護者が倒れるとその方角の封印が解ける。
// 解けた封印は世界で共有（隊長・勇者のどちらが解いても同じ）。三つすべて解けるまで隊長は魔王城へ入れない。
import {WORLD_SIZE,fieldTerrainAt} from './world.js?v=289';
import {DUNGEON_DEFS} from './dungeon.js?v=306';
import {distanceScaling} from './equipment-rules.js?v=306';
import {CAMPAIGN_SCALE_VERSION} from './campaign-scaling.js?v=241';
const C=WORLD_SIZE/2,TAU=Math.PI*2,R=38000,D=Math.round(R/Math.SQRT2);
export const SEAL_RULES=Object.freeze({discovery:900,respawnPhases:2,heroLeaveDistance:1500,radius:70});
export const DEMON_CASTLE_ID='dungeon_demon_castle';
export const SEAL_DEFS=Object.freeze([
  {id:'seal_northwest',dir:'北西',name:'北西の封印の祠',ox:-D,oy:-D,color:'#a78bfa',
   guardian:{type:'colossal_dragon',name:'霧翼の守護竜・ネヴラ',title:'【北西の封印を守る竜】',icon:'🐉🌫️',color:'#8b7fd1',radius:54,hp:64000,atk:640,speed:44,skillCooldown:4.6,skillName:'メガフレアブレス',desc:'北西の封印を守る古竜。'}},
  {id:'seal_north',dir:'北',name:'北の封印の祠',ox:0,oy:-R,color:'#67e8f9',
   guardian:{type:'colossal_titan',name:'凍岩の守護巨神・グラニト',title:'【北の封印を守る巨神】',icon:'🗿❄️',color:'#5fb8c9',radius:56,hp:64000,atk:640,speed:38,skillCooldown:4.8,skillName:'ミシックレーザー',desc:'北の封印を守る巨神。'}},
  {id:'seal_northeast',dir:'北東',name:'北東の封印の祠',ox:D,oy:-D,color:'#fbbf24',
   guardian:{type:'behemoth_king',name:'雷角の守護獣・ヴォルグ',title:'【北東の封印を守る巨獣】',icon:'🦏⚡',color:'#d6a23a',radius:60,hp:64000,atk:640,speed:42,skillCooldown:5.0,skillName:'アースクエイク',desc:'北東の封印を守る巨獣。'}}
]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function openGround(p,avoid){
  if(avoid.some(q=>dist(p,q)<1500))return false;
  for(const [dx,dy] of [[0,0],[-150,0],[150,0],[0,-150],[0,150],[-110,-110],[-110,110],[110,-110],[110,110],[0,-260],[0,260],[-260,0],[260,0]])if(fieldTerrainAt(p.x+dx,p.y+dy)!=='open')return false;
  return true;
}
const layoutCache=new Map();
/** Fixed spots: the anchor nudged onto open ground away from dungeon doors, aid posts and outdoor sites. */
export function sealLayout(game={}){
  const avoid=[...DUNGEON_DEFS.map(d=>d.entrance),...(game.medicalPosts||[]),...(game.wildernessSites||[])].filter(p=>p&&Number.isFinite(p.x));
  const key=avoid.length+':'+avoid.slice(0,6).map(p=>Math.round(p.x)).join(',');
  if(layoutCache.has(key))return layoutCache.get(key);
  const out=SEAL_DEFS.map(def=>{
    const origin={x:C+def.ox,y:C+def.oy};let at=null;
    outer:for(const nudge of [0,300,600,900,1300,1800,2400])for(let j=0;j<(nudge?16:1);j++){
      const q={x:Math.round(origin.x+Math.cos(j*TAU/16)*nudge),y:Math.round(origin.y+Math.sin(j*TAU/16)*nudge)};
      if(openGround(q,avoid)){at=q;break outer;}
    }
    at||=origin;return Object.freeze({id:def.id,x:at.x,y:at.y,distance:Math.hypot(at.x-C,at.y-C)});
  });
  layoutCache.set(key,out);return out;
}
export const sealDef=id=>SEAL_DEFS.find(d=>d.id===id);
/** Castle already reached in this save (king slain, a commander's visit sized him, a castle scene exists, or the party stands inside). */
export function castleAlreadyReached(game){
  const j=game.heroJourney;
  return !!(j?.demonKingDefeat||j?.kingProfile||j?.castleScene||j?.party?.space===DEMON_CASTLE_ID||(game.dungeons||[]).find(d=>d.id===DEMON_CASTLE_ID)?.cleared);
}
export function initializeSealKeys(game,saved=null){
  const raw=saved?.sealKeys,state={broken:{},guardians:{}};
  const legacy=!raw||typeof raw!=='object';
  if(!legacy){
    for(const def of SEAL_DEFS){
      const b=raw.broken?.[def.id];if(b&&typeof b==='object')state.broken[def.id]={by:b.by==='hero'?'hero':b.by==='old-save'?'old-save':'commander',phase:Math.max(0,Math.floor(Number(b.phase)||0))};
      const g=raw.guardians?.[def.id];if(g&&typeof g==='object')state.guardians[def.id]={respawnPhase:Math.max(0,Math.floor(Number(g.respawnPhase)||0)),heroKilled:!!g.heroKilled};
    }
    state.discovered=Object.fromEntries(SEAL_DEFS.filter(d=>raw.discovered?.[d.id]).map(d=>[d.id,true]));
  }else state.discovered={};
  game.sealKeys=state;
  // 旧セーブ：すでに魔王城へ辿り着いていた世界では、三つの封印は解けている。
  if(legacy&&saved&&castleAlreadyReached(game))for(const def of SEAL_DEFS)state.broken[def.id]={by:'old-save',phase:Math.max(0,Math.floor(game.phase||0))};
  game.sealShrines=sealLayout(game).map(p=>({...p,...sealDef(p.id),x:p.x,y:p.y}));
  game._sealClock=0;
  return state;
}
export const serializeSealKeys=game=>game.sealKeys?structuredClone(game.sealKeys):null;
export const sealBroken=(game,id)=>!!game.sealKeys?.broken?.[id];
export const sealsRemaining=game=>SEAL_DEFS.filter(d=>!sealBroken(game,d.id)).length;
export const castleSealed=game=>sealsRemaining(game)>0;
export const castleSealText=game=>`封印 残り${sealsRemaining(game)}`;
/** Every list a guardian can live in (field, the field while the commander is inside, the rest pause). */
const fieldLists=game=>[game.currentDungeon?game.savedFieldMonsters:game.monsters,game.restMonsters].filter(Array.isArray);
export const sealGuardianOf=(game,id)=>fieldLists(game).flat().find(m=>m?.sealSiteId===id&&m.hp>0)||null;
export function createSealGuardian(game,shrine){
  const g=shrine.guardian,s=distanceScaling(shrine.distance,game.phase||1);
  const hp=Math.round(g.hp*Math.max(1,s.hp*.75)),atk=Math.round(g.atk*Math.max(1,s.atk*.75));
  const x=shrine.x+90,y=shrine.y-40;
  return {type:g.type,name:g.name,title:g.title,icon:g.icon,color:g.color,radius:g.radius,speed:g.speed,x,y,homeX:x,homeY:y,hp,maxHp:hp,atk,
    isBoss:true,isColossal:true,isPlaceBoss:true,isSealGuardian:true,sealSiteId:shrine.id,bossPlaceId:shrine.id,
    bossDef:{skillCooldown:g.skillCooldown},skillTimer:g.skillCooldown,skillName:g.skillName,desc:g.desc,
    lootDistance:shrine.distance,campaignScaleVersion:CAMPAIGN_SCALE_VERSION,atkTimer:0,hitPulse:0};
}
/** Spawn the guardian into a field list unless it is already there or still resting after a commander's victory. */
export function ensureSealGuardian(game,shrine,list){
  if(!Array.isArray(list)||sealGuardianOf(game,shrine.id))return null;
  const g=game.sealKeys.guardians[shrine.id];
  if(g?.respawnPhase&&Math.floor(game.phase||1)<g.respawnPhase)return null;
  if(g?.heroKilled)return null; // 勇者が倒した守護者は、勇者隊が離れてから戻る
  delete game.sealKeys.guardians[shrine.id];
  const m=createSealGuardian(game,shrine);list.push(m);return m;
}
/** Called from every kill path. Breaks the seal on the first fall; schedules the guardian's return. */
export function recordSealGuardianKill(game,monster,attacker=null){
  if(!monster?.isSealGuardian||monster._sealCredited||!game?.sealKeys)return false;
  monster._sealCredited=true;
  const id=monster.sealSiteId,def=sealDef(id);if(!def)return false;
  const byHero=!!attacker?.heroPartyId,phase=Math.max(1,Math.floor(game.phase||1));
  game.sealKeys.guardians[id]=byHero?{respawnPhase:0,heroKilled:true}:{respawnPhase:phase+SEAL_RULES.respawnPhases,heroKilled:false};
  if(sealBroken(game,id))return false;
  game.sealKeys.broken[id]={by:byHero?'hero':'commander',phase};
  const left=sealsRemaining(game);
  const who=byHero?`勇者【${game.heroJourney?.party?.name||''}】のパーティが`:'';
  game.showToast?.(left?`🔓 ${who}${def.dir}の封印を解いた。魔王城の封印は残り${left}。`:`🔓 ${who}${def.dir}の封印を解いた。魔王城の封印がすべて解けた！`,{important:true});
  game.recordBattleLog?.(`🔓 ${def.name}の守護者『${monster.name}』が倒れ、${def.dir}の封印が解けた（残り${left}）`,'growth');
  return true;
}
/** Hero-slain guardians come back once no living hero stands near the shrine. */
export function releaseHeroKilledGuardians(game,heroes=[]){
  for(const shrine of game.sealShrines||[]){
    const g=game.sealKeys?.guardians?.[shrine.id];if(!g?.heroKilled)continue;
    if(heroes.some(u=>u&&!u.dead&&Number.isFinite(u.x)&&dist(u,shrine)<SEAL_RULES.heroLeaveDistance))continue;
    g.heroKilled=false;
  }
}
export function updateSealShrines(game,dt=0){
  if(!game.sealKeys||!game.sealShrines)return;
  game._sealClock=(game._sealClock||0)+dt;if(game._sealClock<.25)return;game._sealClock=0;
  const party=game.heroJourney?.party,heroes=party&&party.status!=='withdrawn'&&party.space==='field'?party.members:[];
  releaseHeroKilledGuardians(game,heroes);
  if(game.currentDungeon||game.restTimer>0||!game.player||game.player.isDown||!(game.player.hp>0))return;
  for(const shrine of game.sealShrines){
    if(dist(shrine,game.player)>SEAL_RULES.discovery)continue;
    if(!game.sealKeys.discovered[shrine.id]){game.sealKeys.discovered[shrine.id]=true;game.showToast?.(`発見：${shrine.name}`);}
    ensureSealGuardian(game,shrine,game.monsters);
  }
}
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
export function drawSealShrine(c,s,game,now=0){
  const broken=sealBroken(game,s.id);c.save();c.translate(s.x,s.y);c.lineJoin='round';
  oval(c,2,12,92,34,'#0b101466');oval(c,0,6,84,28,'#4a4a5a55');
  c.fillStyle='#4b4f5c';c.fillRect(-58,-4,116,16);c.fillStyle='#6b7080';c.fillRect(-48,-12,96,10);
  for(const side of [-1,1]){c.fillStyle='#5b6070';c.fillRect(side*40-9,-86,18,76);c.fillStyle='#8a90a0';c.fillRect(side*40-11,-92,22,8);}
  c.fillStyle='#3a3d48';c.fillRect(-54,-100,108,12);c.fillStyle='#777d8e';c.fillRect(-58,-106,116,7);
  const glow=broken?.25:.6+.25*Math.sin(now*2.2);
  c.globalAlpha=glow;oval(c,0,-44,22,30,s.color);c.globalAlpha=1;
  c.fillStyle=broken?'#5a5f6b':'#262935';c.beginPath();c.moveTo(0,-74);c.lineTo(16,-44);c.lineTo(0,-14);c.lineTo(-16,-44);c.closePath();c.fill();
  c.strokeStyle=broken?'#8b909c':s.color;c.lineWidth=3;c.stroke();
  if(broken){c.strokeStyle='#cfd3dc';c.lineWidth=2;c.beginPath();c.moveTo(-6,-66);c.lineTo(3,-48);c.lineTo(-4,-36);c.lineTo(5,-20);c.stroke();}
  c.textAlign='center';c.font='bold 12px sans-serif';c.strokeStyle='#14161c';c.lineWidth=3;c.strokeText(s.name,0,-116);c.fillStyle=broken?'#aab0bb':s.color;c.fillText(s.name,0,-116);
  c.font='10px sans-serif';const text=broken?'封印は解けている':'守護者が封印を守っている';c.strokeText(text,0,34);c.fillStyle='#e5e1d0';c.fillText(text,0,34);
  c.restore();
}
/** World map: every shrine is marked (the castle's seals are common knowledge), solved ones dimmed. */
export function drawSealMap(c,game,px,py){
  c.save();
  for(const s of game.sealShrines||[]){const x=px(s.x),y=py(s.y),broken=sealBroken(game,s.id),r=6;
    c.fillStyle=broken?'#6b7280':s.color;c.strokeStyle='#111827';c.lineWidth=1.5;
    c.beginPath();c.moveTo(x,y-r-2);c.lineTo(x+r,y);c.lineTo(x,y+r+2);c.lineTo(x-r,y);c.closePath();c.fill();c.stroke();
    if(!broken){c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(x,y,r+4,0,TAU);c.stroke();}
    c.font='bold 9px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#111827';const label=broken?'解':'封';c.strokeText(label,x,y-r-5);c.fillStyle=broken?'#d1d5db':s.color;c.fillText(label,x,y-r-5);
  }
  const castle=DUNGEON_DEFS.find(d=>d.id===DEMON_CASTLE_ID);
  if(castle){const x=px(castle.entrance.x),y=py(castle.entrance.y);c.font='bold 9px sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#111827';const t=castleSealed(game)?castleSealText(game):'封印解除';c.strokeText(t,x,y+16);c.fillStyle=castleSealed(game)?'#fca5a5':'#d1d5db';c.fillText(t,x,y+16);}
  c.restore();
}
