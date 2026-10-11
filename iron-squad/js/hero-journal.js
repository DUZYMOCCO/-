// A bounded travel diary. No video frames, battle replay or background rendering.
import {WORLD_SIZE} from './world.js?v=182';
import {formatDistance} from './distance-format.js';
import {zoneRingLabelJa} from './equipment-rules.js';
import {heroEquipmentSummary} from './hero-equipment.js';
const C=WORLD_SIZE/2;
export const JOURNAL_LIMITS=Object.freeze({events:48,trail:48,history:8,checkSeconds:2,trailStep:1200});
const timeLabel=s=>`${Math.floor(s/60)}分${Math.floor(s%60)}秒`;
function snapshot(u){return {id:u.id,name:u.name,talent:u.talent,soldierClass:u.soldierClass,isChosenHero:!!u.isChosenHero,level:u.level,maxHp:u.maxHp,atk:u.atk,def:u.def||0,strength:u.strength,magic:u.magicPower,equipment:heroEquipmentSummary(u),minionKills:u.minionKills||0,bossKills:u.bossKills||0,rescues:u.rescues||0,timesDown:u.timesDown||0,dead:!!u.dead,isDown:!!u.isDown};}
function event(game,p,type,text){const j=p.journal;j.events.push({type,text,time:Math.round(j.elapsed),phase:game.phase,space:p.space,x:Math.round(p.x),y:Math.round(p.y)});if(j.events.length>JOURNAL_LIMITS.events)j.events.splice(1,1);}
function trail(p){const j=p.journal;j.trail.push({x:Math.round(p.x),y:Math.round(p.y),space:p.space,time:Math.round(j.elapsed)});if(j.trail.length>JOURNAL_LIMITS.trail)j.trail=j.trail.filter((_,i,a)=>i===0||i===a.length-1||i%2===0);}
export function startHeroJournal(game,p){
  p.journal={version:1,id:p.id,name:p.name,startedPhase:p.phase,elapsed:0,startMembers:p.members.map(snapshot),members:p.members.map(snapshot),events:[],trail:[],marks:{},ring:0,ended:false,result:null};
  event(game,p,'departure','救いの御子が天啓を受け、本陣から新兵5職と出発。');
  if(p.members.some(u=>u.heroEquipmentVersion))event(game,p,'equipment','全員に勇者パーティ専用の武具を支給。');trail(p);
}
export function updateHeroJournal(game,p,dt,force=false){
  if(!p||!(dt>=0))return;if(!p.journal)startHeroJournal(game,p);
  const j=p.journal;if(j.ended)return;j.elapsed+=dt;p._journalClock=(p._journalClock||0)+dt;
  if(!force&&p._journalClock<JOURNAL_LIMITS.checkSeconds)return;p._journalClock=0;
  for(const u of p.members){
    const before=j.marks[u.id]||{dead:false,isDown:false,level:1,rescues:0,timesDown:0,timesRescued:0};
    if(u.dead&&!before.dead)event(game,p,'death',`${u.isChosenHero?'勇者 ':''}${u.name}が戦死（Lv.${u.level}）。`);
    else if(u.isDown&&!before.isDown)event(game,p,'down',`${u.name}がダウン（Lv.${u.level}）。`);
    else if(!u.isDown&&before.isDown&&!u.dead)event(game,p,'rescue',`${u.name}が救護を受け、復帰。`);
    else if(!u.dead&&!u.isDown&&(u.timesDown||0)>before.timesDown&&(u.timesRescued||0)>(before.timesRescued||0))event(game,p,'rescue',`${u.name}がダウンし、救護を受けて復帰。`);
    if(Math.floor(u.level/5)>Math.floor(before.level/5))event(game,p,'growth',`${u.name}がLv.${u.level}まで成長。`);
    j.marks[u.id]={dead:!!u.dead,isDown:!!u.isDown,level:u.level,rescues:u.rescues||0,timesDown:u.timesDown||0,timesRescued:u.timesRescued||0};
  }
  j.members=p.members.map(snapshot);
  const last=j.trail.at(-1);
  if(p.space!==last?.space||Math.hypot(p.x-(last?.x??p.x),p.y-(last?.y??p.y))>=JOURNAL_LIMITS.trailStep)trail(p);
  if(p.space==='field'){
    const ring=zoneRingLabelJa(Math.hypot(p.x-C,p.y-C));
    if(ring.ring>j.ring){j.ring=ring.ring;event(game,p,'region',`${ring.name}に到達（本陣から${formatDistance(Math.hypot(p.x-C,p.y-C))}）。`);}
  }else if(!j.enteredCastle){j.enteredCastle=true;event(game,p,'castle','魔王城に突入。');}
}
export function recordHeroEquipmentGrant(game,p){
  if(p?.journal&&!p.journal.ended){event(game,p,'equipment','勇者パーティ専用の武具を受け取った。');p.journal.members=p.members.map(snapshot);}
}
export function finishHeroJournal(game,p,result){
  if(!p)return;updateHeroJournal(game,p,0,true);const j=p.journal;if(j.ended)return;
  event(game,p,'result',result);trail(p);j.ended=true;j.result=result;j.finishedPhase=game.phase;
}
export function archiveHeroJournal(game,p,result){
  const history=game.heroJourney.history;if(history.some(h=>h.id===p.id))return;
  finishHeroJournal(game,p,result);history.push({id:p.id,name:p.name,phase:game.phase,result,journal:structuredClone(p.journal)});
  if(history.length>JOURNAL_LIMITS.history)history.splice(0,history.length-JOURNAL_LIMITS.history);
}
function element(tag,text,className=''){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(className)node.className=className;return node;}
function drawTrail(canvas,j){
  const ctx=canvas.getContext('2d'),points=j.trail.filter(p=>p.space==='field');if(!ctx||!points.length)return;
  const w=300,h=180;canvas.width=w;canvas.height=h;ctx.fillStyle='#17282b';ctx.fillRect(0,0,w,h);
  const xs=[C,...points.map(p=>p.x)],ys=[C,...points.map(p=>p.y)],left=Math.min(...xs)-300,top=Math.min(...ys)-300;
  const scale=Math.min((w-28)/Math.max(1000,Math.max(...xs)-left+300),(h-28)/Math.max(1000,Math.max(...ys)-top+300));
  const project=p=>({x:14+(p.x-left)*scale,y:14+(p.y-top)*scale});
  ctx.strokeStyle='#849e8a';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>{const q=project(p);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();
  const start=project({x:C,y:C}),end=project(points.at(-1));
  ctx.fillStyle='#b8c6b4';ctx.fillRect(start.x-3,start.y-3,6,6);ctx.fillStyle='#dec47a';ctx.beginPath();ctx.arc(end.x,end.y,5,0,Math.PI*2);ctx.fill();
  ctx.font='12px sans-serif';ctx.fillStyle='#e8e6cf';ctx.textAlign='left';ctx.fillText('本陣',Math.min(w-32,start.x+7),Math.max(14,start.y));
  ctx.textAlign='right';ctx.fillText(j.ended?'最後の地点':'現在地',w-8,h-10);
}
export function appendHeroDiary(parent,j,classes,talents){
  if(!j)return;
  const details=element('details',null,'hero-diary');details.append(element('summary',`旅日誌 · ${j.name} · 第${j.startedPhase}期出発${j.result?` · ${j.result}`:''}`));
  const body=element('div',null,'hero-diary-body'),hero=j.members.find(u=>u.isChosenHero),first=j.startMembers.find(u=>u.isChosenHero);
  body.append(element('p',`勇者の才能：${talents[hero?.talent]?.tag||hero?.talent||'不明'} · 旅の時間 ${timeLabel(j.elapsed)}`));
  if(hero&&first)body.append(element('p',`Lv.${first.level} → ${hero.level} · HP ${first.maxHp} → ${hero.maxHp} · 攻撃 ${first.atk} → ${hero.atk} · 防御 ${first.def} → ${hero.def}`));
  if(first?.equipment?.length)body.append(element('p',`出発装備：${first.equipment.join('・')}`));
  const last=j.trail.at(-1);if(last)body.append(element('p',last.space==='field'?`到達点：本陣から${formatDistance(Math.hypot(last.x-C,last.y-C))} · ${zoneRingLabelJa(Math.hypot(last.x-C,last.y-C)).name}`:'到達点：魔王城'));
  body.append(element('p',`仲間の戦果：通常敵${j.members.reduce((n,u)=>n+u.minionKills,0)}体・ボス${j.members.reduce((n,u)=>n+u.bossKills,0)}体 · 救護${j.members.reduce((n,u)=>n+u.rescues,0)}回`));
  const canvas=element('canvas');canvas.setAttribute('aria-label',`${j.name}の本陣からの足跡`);body.append(canvas);
  const members=element('ul');for(const u of j.members)members.append(element('li',`${u.isChosenHero?'勇者':classes[u.soldierClass]?.name||u.soldierClass} ${u.name} · ${talents[u.talent]?.tag||u.talent} · Lv.${u.level} · ${u.dead?'戦死':u.isDown?'ダウン':'生存'}`));body.append(members);
  const list=element('ol',null,'hero-diary-events');for(const e of j.events)list.append(element('li',`${timeLabel(e.time)} · 第${e.phase}期 · ${e.text}`));body.append(list);details.append(body);parent.append(details);
  // Map drawing happens only when the player opens this diary.
  details.addEventListener('toggle',()=>{if(details.open)drawTrail(canvas,j);});
}
