import {rescueUnits,friendlyNpcs,isMerchantCasualty,isMedic,commanderDown,carriedCount,revivalSkillCooldownLeft,medicHasStamina,MEDIC_TREAT_MIN,treatWounded,reviveByPotion,REVIVAL_POTION_RANGE} from './casualty-rules.js?v=274';
import {attributeFamily} from './unit-attributes.js?v=274';
import {inCurrentInstance} from './instance-rules.js?v=256';
import {gameText} from './game-text.js?v=271';

// Requests, cooldowns and jobs belong to this play session, never the save file.
const sessions=new WeakMap();
const alive=u=>u&&!u.dead&&!u.dying&&!u.isDown&&u.hp>0;
const down=u=>u?.isDown&&!u.dead&&!u.dying;
const npc=u=>isMerchantCasualty(u)||u?.isGateGuard;
const local=(g,u)=>g.currentDungeon?inCurrentInstance(g,u):!u?.isGateGuard||u.gateSpace==='field';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function session(game){
  let s=sessions.get(game);
  if(!s||s.player!==game.player){s?.panel?.remove();s={player:game.player,clock:0,declined:new Map(),prompt:null,job:null,runner:null,panel:null};sessions.set(game,s);}
  return s;
}
export const pendingNpcRescue=game=>session(game).prompt;
export function answerNpcRescue(game,accept){
  const s=session(game),p=s.prompt;if(!p)return false;
  if(accept)s.job=p;else s.declined.set(p.target,{until:s.clock+30,downId:p.target.downId});
  s.prompt=null;s.panel?.remove();s.panel=null;return true;
}
function showRequest(game,s){
  if(!s.prompt||s.panel||!game.container?.ownerDocument)return;
  const doc=game.container.ownerDocument,panel=doc.createElement('aside');
  panel.className='npc-rescue-request';panel.setAttribute('aria-label',gameText('おたすけの そうだん'));
  const text=doc.createElement('p'),p=s.prompt;
  text.textContent=gameText(`${p.medic.name||'えいせいし'}：ちかくで ${p.target.name||'なかま'}が たおれています。たすけに いきますか？`);panel.append(text);
  for(const [label,accept]of [['たすける',true],['いまはいい',false]]){
    const b=doc.createElement('button');b.type='button';b.textContent=label;b.dataset.rescueAnswer=String(accept);
    b.addEventListener('click',e=>{e.stopPropagation();answerNpcRescue(game,accept);});panel.append(b);
  }
  for(const event of ['pointerdown','pointerup','touchstart','touchend'])panel.addEventListener(event,e=>e.stopPropagation());
  game.container.append(panel);s.panel=panel;
}
const readyMedic=(g,u)=>alive(u)&&!u.heroPartyId&&isMedic(u)&&local(g,u)&&!u.regrouping&&!carriedCount(g,u)&&revivalSkillCooldownLeft(g,u)<=.000001&&medicHasStamina(u,MEDIC_TREAT_MIN);
export function updateRescueAssistance(game,dt,pool){
  const s=session(game);s.clock+=Math.max(0,dt);
  const ownDown=rescueUnits(game).some(u=>down(u)&&!npc(u)&&local(game,u));
  for(const [target,decline]of s.declined)if(!down(target)||target.downId!==decline.downId||s.clock>=decline.until)s.declined.delete(target);
  const targets=[...friendlyNpcs(game),...(game.currentDungeon?[]:game.merchants||[])];
  const valid=p=>p&&targets.includes(p.target)&&down(p.target)&&!p.target.carrierId&&local(game,p.target)&&pool.includes(p.medic)&&readyMedic(game,p.medic);
  if(ownDown||!alive(game.player)||!valid(s.job))s.job=null;
  if(s.prompt&&(ownDown||!alive(game.player)||!valid(s.prompt))){s.prompt=null;s.panel?.remove();s.panel=null;}
  if(s.prompt&&s.clock>=s.prompt.until)answerNpcRescue(game,false);
  if(!ownDown&&alive(game.player)&&!s.prompt&&!s.job){
    const medics=pool.filter(u=>readyMedic(game,u)&&distance(u,game.player)<=300).sort((a,b)=>Number(!!b.isPersonalGuard)-Number(!!a.isPersonalGuard)||distance(a,game.player)-distance(b,game.player));
    const target=targets.filter(u=>npc(u)&&down(u)&&!u.carrierId&&local(game,u)&&distance(u,game.player)<=300&&!s.declined.has(u)).sort((a,b)=>distance(a,game.player)-distance(b,game.player))[0];
    if(medics.length&&target)s.prompt={medic:medics[0],target,until:s.clock+10};
  }
  showRequest(game,s);
  const runnerReady=u=>pool.includes(u)&&alive(u)&&local(game,u)&&attributeFamily(u)==='LIGHT'&&!u.heroPartyId&&!u.regrouping&&!carriedCount(game,u)&&distance(u,game.player)<=400;
  if(!commanderDown(game)||game.player.dying||!(game.revivalPotion>0))s.runner=null;
  else if(!runnerReady(s.runner))s.runner=pool.filter(runnerReady).sort((a,b)=>Number(!!b.isPersonalGuard)-Number(!!a.isPersonalGuard)||distance(a,game.player)-distance(b,game.player))[0]||null;
  return {potionRunner:s.runner,npcMedic:s.job?.medic||null};
}
function approach(game,u,target,dt,speed,range){
  u.vx=u.vy=0;if(distance(u,target)<=range)return false;
  const goal=game.dungeonMoveTarget?.(u,target)||target,dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy);
  if(d>0){const step=Math.min(d,speed*dt);u.x+=dx/d*step;u.y+=dy/d*step;u.vx=dx/d;u.vy=dy/d;u.facingAngle=Math.atan2(dy,dx);}
  return true;
}
export function handleRescueAssistance(game,u,dt){
  const s=session(game);
  if(u===s.runner){
    if(!commanderDown(game)||!(game.revivalPotion>0)){s.runner=null;return false;}
    if(approach(game,u,game.player,dt,(u.speed||80)*1.6,REVIVAL_POTION_RANGE))return true;
    if(reviveByPotion(game,game.player,u)){
      game.revivalPotion--;s.runner=null;
      game.showToast?.(gameText(`${u.name||'けいそうへい'}が おくすりで 隊長を おこした！`));
      game.saveGame?.({background:true});game.updateStatsUI?.();
    }
    return true;
  }
  const job=s.job;if(job?.medic!==u)return false;
  if(!down(job.target)||job.target.carrierId){s.job=null;return false;}
  if(!approach(game,u,job.target,dt,(u.speed||80)*(u.soldierClass==='HIGH_PRIEST'?1.45:1.3),40)&&treatWounded(game,u,job.target,dt))s.job=null;
  return true;
}
