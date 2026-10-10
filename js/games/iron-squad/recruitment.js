import {calcScoutCost} from './economy-rules.js';
import {formatDistance,formatSpeed,formatLength,formatLengthDelta} from './distance-format.js?v=148';
import {drawSoldierPortrait} from './soldier-appearance.js';
import {ATTRIBUTE_KEYS,ATTRIBUTE_LABELS,attributeSpecialties,attributeCarryCapacity,aptitudeGrade} from './unit-attributes.js';
import {weaponRequirementText} from './weapon-requirements.js';
import {releaseCanvas} from './canvas-surface.js?v=148';

export const RECRUIT_CLASSES=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
export const RECRUITMENT_INTERVAL=1200;
export function rollScoutCandidate(game) {
  const classKey=RECRUIT_CLASSES.includes(game.scoutClass)?game.scoutClass:'HEAVY';
  const talent=game.rollScoutTalent(),level=1+Math.floor(Math.random()*Math.min(5,1+Math.floor((game.phase||1)/8)));
  const soldier=game.createNewSoldier(null,{classKey,talent,level});
  const average=ATTRIBUTE_KEYS.reduce((sum,key)=>sum+soldier.attributeProfile.aptitudes[key],0)/5;
  const cost=Math.round(calcScoutCost(game.phase||1,talent,level)*(1+Math.max(0,average-1)*.3));
  game.scoutRollCount=(game.scoutRollCount||0)+1;
  return {id:soldier.id,talent,classKey,level,cost,soldier};
}
export function stopAutomaticRecruitment(game,save=false) {
  clearTimeout(game._scoutAutoTimer);game._scoutAutoTimer=null;game._scoutAuto=false;
  if(save)game.saveGame?.();
}
function recruitingVisible(game) {
  const root=game.container;
  const dialog=root?.querySelector('#recruitment-dialog');
  return !!dialog&&!dialog.classList.contains('hidden')&&!root.querySelector('#strategy-modal')?.classList.contains('hidden')&&!document.hidden;
}
export function nextScoutCandidate(game,automatic=false) {
  if(!automatic)stopAutomaticRecruitment(game);
  if((game.scoutCandidates||[]).some(c=>c.talent==='GENIUS')){
    if(automatic||!window.confirm('天才候補を見送って、次の候補へ進みますか？')){game.renderScoutCandidates();return false;}
  }
  game.refreshScoutCandidates();
  if(game.scoutCandidates[0]?.talent==='GENIUS'){
    stopAutomaticRecruitment(game);
    game.showToast?.('🌟 天才候補が現れました。自動募集を停止して、この人を保持します。');
    game.saveGame?.();
  } else if(!automatic)game.saveGame?.();
  game.renderScoutCandidates();return true;
}
export function startAutomaticRecruitment(game) {
  if(game.scoutCandidates?.some(c=>c.talent==='GENIUS')){game.showToast?.('🌟 天才候補を確認してください。次の候補へ進むまで自動募集は停止します。');return false;}
  stopAutomaticRecruitment(game);game._scoutAuto=true;
  const tick=()=>{
    if(!game._scoutAuto)return;
    if(!recruitingVisible(game)){stopAutomaticRecruitment(game,true);game.renderScoutCandidates();return;}
    nextScoutCandidate(game,true);
    if(game._scoutAuto)game._scoutAutoTimer=setTimeout(tick,RECRUITMENT_INTERVAL);
  };
  game._scoutAutoTimer=setTimeout(tick,RECRUITMENT_INTERVAL);game.renderScoutCandidates();return true;
}
const number=value=>Math.round(value||0).toLocaleString();
export function renderRecruitment(game,classes,talents) {
  const root=game.container||document,list=root.querySelector?.('#scout-candidates-list');if(!list)return;
  const job=root.querySelector('#scout-class');
  if(job){
    job.innerHTML=RECRUIT_CLASSES.map(key=>`<option value="${key}">${classes[key].icon} ${classes[key].name}</option>`).join('');job.value=game.scoutClass||'HEAVY';
    job.onchange=()=>{
      const selected=job.value,previous=game.scoutClass||'HEAVY';
      if(game.scoutCandidates?.some(c=>c.talent==='GENIUS')&&!window.confirm('天才候補を見送って、募集する職種を変えますか？')){job.value=previous;return;}
      stopAutomaticRecruitment(game);game.scoutClass=selected;game.refreshScoutCandidates();game.saveGame();game.renderScoutCandidates();
    };
  }
  const next=root.querySelector('#btn-refresh-scouts');if(next){next.textContent='次の候補（無料）';next.onclick=()=>nextScoutCandidate(game);}
  const auto=root.querySelector('#btn-auto-scouts');if(auto){auto.textContent=game._scoutAuto?'⏸ 自動募集を停止':'▶ 自動募集';auto.setAttribute('aria-pressed',String(!!game._scoutAuto));auto.onclick=()=>{if(game._scoutAuto){stopAutomaticRecruitment(game,true);game.renderScoutCandidates();}else startAutomaticRecruitment(game);};}
  const status=root.querySelector('#scout-roll-status');if(status)status.textContent=`確認した候補 ${number(game.scoutRollCount)}人 · ${game._scoutAuto?'1.2秒ごとに次の人へ／天才で停止':'候補を保持中／天才で自動停止'}`;
  const wallet=root.querySelector('#recruitment-wallet');if(wallet)wallet.textContent=`軍資金 ${number(game.gold)}G`;
  for(const canvas of list.querySelectorAll('canvas'))releaseCanvas(canvas);
  list.replaceChildren();
  for(const candidate of game.scoutCandidates||[]){
    const unit=candidate.soldier;if(!unit)continue;
    const cls=classes[candidate.classKey],talent=talents[candidate.talent],specialties=attributeSpecialties(unit);
    const profile=unit.attributeProfile;
    const row=document.createElement('article');row.className='scout-card recruitment-candidate';
    row.innerHTML=`<div class="recruit-person"><canvas class="recruit-portrait" width="120" height="130" aria-label="${cls.name}候補の素顔"></canvas><div><strong>${cls.icon} ${unit.name}</strong><div>${cls.name} · Lv.${candidate.level} <span style="color:${talent.color}">[${talent.tag}]</span></div><p class="recruit-specialties">${specialties.length?specialties.join('・'):'均整型'}</p><strong class="recruit-price">雇用費 ${number(candidate.cost)}G</strong></div></div>
      <div class="recruit-stat-grid">${[
        ['HP',number(unit.maxHp)],['攻撃',number(unit.atk)],['防御',number(unit.def)],
        ['筋力',number(unit.strength)],['魔力',number(unit.magicPower)],['魔法防御',number(unit.magicDef)],
        ['速さ',number(unit.quickness)],['回避',`${unit.evasion} / ${unit.dodge}%`],['搬送',`${attributeCarryCapacity(unit)}人`],
        ['魔法攻撃',number(unit.magicAttack)],['回復力',number(unit.healPower)],['移動',formatSpeed(unit.speed)]
      ].map(([label,value])=>`<span><small>${label}</small><b>${value}</b></span>`).join('')}</div>
      <div class="recruit-aptitudes"><strong>成長素質</strong>${ATTRIBUTE_KEYS.map(key=>`<span>${ATTRIBUTE_LABELS[key]}<b>${aptitudeGrade(profile.aptitudes[key])}</b></span>`).join('')}</div>
      <div class="recruit-practice-note">初期武器：${unit.equipped?.weapon?.name||'なし'}<br>${weaponRequirementText(unit,unit.equipped?.weapon)}</div>`;
    for(const [className,destination] of [['btn-scout-main','main'],['btn-scout-personal','personal']]){
      const button=root.querySelector(`#recruitment-dialog .${className}`);
      if(button){button.disabled=(game.gold||0)<candidate.cost;button.onclick=()=>game.scoutSoldier(candidate.id,destination);}
    }
    list.appendChild(row);
    const canvas=row.querySelector('canvas'),ctx=canvas.getContext('2d');if(ctx)drawSoldierPortrait(ctx,unit,canvas.width,canvas.height);
  }
}
