import {isEnlisted,CAREER_RULES} from './career-rules.js?v=291';
import {isOwnSquad} from './own-squad-marker.js?v=182';
import {persistentUnit} from './render-support.js';
import {drawSoldierPortrait} from './soldier-appearance.js?v=295';
import {setSubDialog} from './interface.js?v=322';
import {WORLD_SIZE,TAVERN_SITE} from './world.js?v=289';
import {daylightAt} from './day-night.js?v=208';
import {drawTavernFixtures,drawTavernCandles} from './nightlife-visuals.js?v=277';
import {GARDEN_TABLES,TAVERN_TABLES,TAVERN_SEAT_COUNT,tavernPoint,campPoseFor,drawLeisureTable} from './camp-leisure.js?v=277';
import {buildingContact} from './building-interactions.js?v=201';

const classes=['HEAVY','LIGHT','ARCHER','MAGE','MEDIC'];
const jobs={HEAVY:'重装兵',LIGHT:'軽装兵',ARCHER:'弓兵',MAGE:'魔法師',MEDIC:'衛生士'};
export const TAVERN_HIRE_COST=5000;
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
/** One large tavern stands on the field just south of HQ. Strangers and waiting friends all gather there. */
export const FIELD_TAVERN=Object.freeze({...TAVERN_SITE,radius:130,name:'本陣前の大酒場'});
export function initializeTaverns(game,saved){
  game.taverns={version:3,roster:saved?.roster?.people?structuredClone(saved.roster):null,waiting:Array.isArray(saved?.waiting)?saved.waiting.filter(s=>s?.id&&!s.dead).map(s=>structuredClone(s)):[]};
}
export const nearFieldTavern=game=>!game.currentDungeon&&!!game.player&&!game.player.dead&&!game.player.isDown&&(Math.hypot(game.player.x-FIELD_TAVERN.x,game.player.y-FIELD_TAVERN.y)<FIELD_TAVERN.radius||buildingContact(game.player,{...FIELD_TAVERN,w:344,h:150,roof:62},36));
export function ensureTavernRoster(game){
  game.taverns||initializeTaverns(game);let roster=game.taverns.roster;const phase=game.phase||1;
  // v7.0.37: the strangers are replaced every wave (= game.phase, the unit the merchant restock and the 3-uses-per-wave potion also follow). The old ones were just civilians and simply leave; anyone already hired lives in the squad / waiting list / reserves, not in this roster.
  if(!roster||roster.phase!==phase){
    const people=Array.from({length:4},(_,i)=>{
      const unit=game.createNewSoldier(null,{classKey:classes[(i+phase)%classes.length]});
      unit.civilianOutfit=true;
      return {unit,cost:TAVERN_HIRE_COST,joined:false};
    });
    roster={phase,people};game.taverns.roster=roster;
  }
  for(const person of roster.people){person.cost=TAVERN_HIRE_COST;delete person.trust;delete person.talkStep;}
  return roster;
}
/** v7.0.37: the wave advanced. Replace the strangers now; when the tavern menu is open, close a stale spec sheet and redraw so nothing outdated can be hired, and say so lightly. */
export function tavernWaveChanged(game){
  const host=game?.container?.querySelector?.('#tavern-dialog');
  if(!host)return false; // closed: the roster is rebuilt on the next visit / approach (ensureTavernRoster)
  ensureTavernRoster(game);
  if(host.dataset.wavePhase===String(game.phase||1))return false; // already showing this wave
  game.closeTavernPersonDetail?.();game.renderTavern?.();
  game.showToast?.('🍺 大酒場の人が入れかわった。新しい顔ぶれが来ている');return true;
}
export function serializeTaverns(game){
  const state=game.taverns||{roster:null,waiting:[]},r=state.roster;
  return {version:3,waiting:state.waiting.map(persistentUnit),roster:r?{phase:r.phase,people:r.people.map(p=>({cost:TAVERN_HIRE_COST,joined:p.joined,unit:p.joined?{id:p.unit.id}:persistentUnit(p.unit)}))}:null};
}
function park(game,unit){
  game.taverns||initializeTaverns(game);
  game.squad=(game.squad||[]).filter(s=>s.id!==unit.id);
  Object.assign(unit,{isPersonalGuard:true,overflowGuard:false,x:FIELD_TAVERN.x,y:FIELD_TAVERN.y,_guardSlot:-1});
  if(!game.taverns.waiting.some(s=>s.id===unit.id))game.taverns.waiting.push(unit);
  return true;
}
/** After enlisting, a friend who steps out of the party joins the HQ reserve instead of the tavern. */
function sendToReserve(game,unit){
  game.squad=(game.squad||[]).filter(s=>s.id!==unit.id);
  Object.assign(unit,{isPersonalGuard:false,overflowGuard:false,x:WORLD_SIZE/2,y:WORLD_SIZE/2,_guardSlot:-1});
  (game.reserves||=[]).push(unit);
  return true;
}
/** Rescues still join immediately in instances. The extra companion waits safely after returning outside. */
export function settleTravelerCompanions(game){
  if(isEnlisted(game)||game.currentDungeon||!game.taverns)return;
  const friends=(game.squad||[]).filter(isOwnSquad);
  let excess=friends.length-CAREER_RULES.companionLimit;
  for(const s of [...friends].reverse())if(excess>0&&!s.isDown&&!s.carrierId){
    if(park(game,s)){excess--;game.showToast?.(`${s.name}は${FIELD_TAVERN.name}で待っています。`);}
  }
  const active=(game.squad||[]).filter(isOwnSquad);
  for(const s of active){s.overflowGuard=false;s._guardSlot=active.indexOf(s);}
}
/** Called every frame; touches the DOM only when the prompt changes. */
export function updateTavernPrompt(game){
  // Populate the terrace on approach, before the first visit opens its menu.
  if(!game.currentDungeon&&game.player&&!game.player.dead&&Math.hypot(game.player.x-FIELD_TAVERN.x,game.player.y-FIELD_TAVERN.y)<430)ensureTavernRoster(game);
  const host=game.container?.querySelector?.('.field-prompts');if(!host)return;
  let button=host.querySelector('#btn-field-tavern');
  if(!button){button=el('button','phase-btn hidden',`🍺 ${FIELD_TAVERN.name}に入る`);button.id='btn-field-tavern';button.type='button';button.onclick=()=>game.openTavern();host.append(button);game._tavernPromptShown=false;}
  const show=nearFieldTavern(game);if(show===game._tavernPromptShown)return;
  game._tavernPromptShown=show;button.classList.toggle('hidden',!show);
}
export function drawFieldTavern(c,game,drawPerson,now=0){
  if(game.currentDungeon)return;
  const {x,y}=FIELD_TAVERN,people=game.taverns?.roster?.people||[];
  c.save();c.translate(x,y);
  c.fillStyle='rgba(20,16,12,.28)';c.beginPath();c.ellipse(0,4,190,26,0,0,Math.PI*2);c.fill();
  c.fillStyle='#5b4b39';c.fillRect(-160,-150,320,150);c.fillStyle='#463a2d';c.fillRect(70,-150,90,150);
  c.strokeStyle='#33291f';c.lineWidth=2;for(let yy=-125;yy<0;yy+=25){c.beginPath();c.moveTo(-160,yy);c.lineTo(160,yy);c.stroke();}
  c.fillStyle='#6f5640';c.beginPath();c.moveTo(-182,-150);c.lineTo(0,-212);c.lineTo(182,-150);c.closePath();c.fill();
  c.strokeStyle='#3d3024';c.lineWidth=3;c.stroke();
  c.fillStyle='#241e18';c.fillRect(-24,-70,48,70);c.fillStyle='#b6a06e';c.fillRect(-26,-74,52,5);
  const lamp=daylightAt(game.worldTime).nightLight;
  for(const wx of [-120,-75,95,130]) {
    c.fillStyle='#70664e';c.fillRect(wx-12,-110,24,28);
    if(lamp>0){c.fillStyle=`rgba(255,197,101,${lamp})`;c.fillRect(wx-12,-110,24,28);}
    c.strokeStyle='#3b2f23';c.lineWidth=2;c.strokeRect(wx-12,-110,24,28);
  }
  c.fillStyle='#3b2f23';c.fillRect(-70,-178,140,30);c.fillStyle='#ecd9aa';c.font='bold 18px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('大酒場',0,-163);
  c.fillStyle='#7a5a36';for(const bx of [-140,140]){c.beginPath();c.ellipse(bx,-12,13,16,0,0,Math.PI*2);c.fill();}
  drawTavernFixtures(c,now);
  c.restore();
  for(const t of [...TAVERN_TABLES,...GARDEN_TABLES])drawLeisureTable(c,t);
  drawTavernCandles(c);
  const visitors=people.filter(v=>!v.joined).map(v=>v.unit).concat(game.taverns?.waiting||[]).slice(0,TAVERN_SEAT_COUNT);
  const seated=visitors.map((s,i)=>({unit:s,seat:tavernPoint(i,campPoseFor(s))})).sort((a,b)=>a.seat.y-b.seat.y);
  for(const {unit,seat}of seated)drawPerson({...unit,campPose:seat.pose,facingAngle:seat.facing},seat.x,seat.y);
}
import {fieldDialogReturn} from './dialog-return.js?v=200';
export const tavernMethods={
  openTavern(){
    if(!nearFieldTavern(this)){this.showToast?.(`仲間との出会いは、本陣の南にある${FIELD_TAVERN.name}で探せます`);return false;}
    if(this.container.querySelector('#tavern-dialog'))return false;
    ensureTavernRoster(this);const returnToCaller=fieldDialogReturn(this);
    const host=el('div','game-overlay commander-editor');host.id='tavern-dialog';
    host.innerHTML='<section class="strategy-panel ce-panel tavern-panel"><header class="sheet-bar"><strong class="sheet-bar-title" id="tavern-title"></strong><button type="button" class="sheet-bar-btn" id="btn-tavern-close">閉じる ×</button></header><div class="ce-body tavern-body"></div></section>';
    (this.container.querySelector('.iron-squad')||this.container).append(host);
    const close=()=>{this.closeTavernPersonDetail();setSubDialog(this,host,false);host.remove();this.saveGame({background:true});returnToCaller();};
    host.querySelector('#btn-tavern-close').onclick=close;setSubDialog(this,host,true,close);host.setAttribute('aria-label',FIELD_TAVERN.name);
    this.renderTavern();this.saveGame({background:true});return true;
  },
  renderTavern(){
    const host=this.container?.querySelector('#tavern-dialog');if(!host)return;
    host.querySelector('#tavern-title').textContent=FIELD_TAVERN.name;host.dataset.wavePhase=String(this.phase||1);
    const body=host.querySelector('.tavern-body');for(const c of body.querySelectorAll('canvas')){c.width=c.height=1;}body.replaceChildren();
    const own=(this.squad||[]).filter(isOwnSquad),limit=this.limitedGuardLimit(),enlisted=this.isEnlisted();
    body.append(el('p','command-note',`同行する仲間 ${own.length} / ${limit}人。雇用は1人${TAVERN_HIRE_COST.toLocaleString()}Gです。所持金 ${this.gold.toLocaleString()}G。`));
    body.append(el('p','command-note',enlisted?'同行しきれない仲間は本陣の予備に入ります。':'同行しきれない仲間は、この酒場で待ちます。入隊せずに旅を続けることもできます。'));
    const strangers=ensureTavernRoster(this).people.filter(p=>!p.joined);
    body.append(el('p','command-note tavern-wave-note',strangers.length?`第${this.phase||1}期の人たちです。次のウェーブで入れかわります。`:`この期の人たちは全員雇用済みです。次のウェーブで新しい人たちが来ます。`));
    const row=(unit,label)=>{
      const card=el('article','tavern-person'),portrait=el('canvas','tavern-portrait');portrait.width=120;portrait.height=132;
      const text=el('div','tavern-person-text');text.append(el('strong','',unit.name),el('p','',`${jobs[unit.soldierClass]||unit.soldierClass} · Lv.${unit.level||1} · HP ${unit.maxHp} · 攻撃 ${unit.atk}`),el('p','command-note',label));
      const actions=el('div','tavern-actions');card.append(portrait,text,actions);body.append(card);drawSoldierPortrait(portrait.getContext('2d'),unit,120,132);
      // Tapping the face or name opens the full spec sheet (same as the strategy screen's personal file).
      portrait.setAttribute('role','button');portrait.tabIndex=0;portrait.setAttribute('aria-label',`${unit.name}の詳細を見る`);
      portrait.onclick=text.querySelector('strong').onclick=()=>this.openTavernPersonDetail(unit);
      return {card,text,actions};
    };
    const button=(actions,label,fn,disabled=false)=>{const b=el('button','action-btn secondary',label);b.type='button';b.disabled=disabled;b.onclick=fn;actions.append(b);return b;};
    for(const person of ensureTavernRoster(this).people.filter(p=>!p.joined)){
      const {actions}=row(person.unit,`雇用 ${person.cost.toLocaleString()}G`);
      button(actions,'詳しく見る',()=>this.openTavernPersonDetail(person.unit));
      button(actions,`${person.cost.toLocaleString()}Gで雇う`,()=>this.recruitTavernPerson(person.unit.id,'gold'),this.gold<person.cost);
    }
    body.append(el('h3','ce-heading','同行中の仲間'));
    if(!own.length)body.append(el('p','command-note','まだ一人旅です。'));
    for(const s of own){const {actions}=row(s,'次の旅へいっしょに出発する仲間');button(actions,enlisted?'本陣の予備に回す':'酒場で待ってもらう',()=>this.parkTavernCompanion(s.id),!!s.isDown||!!s.carrierId);}
    const waiting=this.taverns.waiting||[];
    if(waiting.length||!enlisted){
      body.append(el('h3','ce-heading',`この酒場で待つ仲間（${waiting.length}人）`));
      for(const s of waiting){const {actions}=row(s,'いっしょに旅をした仲間。装備と成長を保持して待っています。');button(actions,'いっしょに出発する',()=>this.rejoinTavernCompanion(s.id),own.length>=limit);}
    }
  },
  /** Spec sheet for a stranger, companion or waiting friend; strangers get a hire button inside it. */
  openTavernPersonDetail(unit){
    const tavern=this.container?.querySelector('#tavern-dialog');if(!tavern||!unit)return false;
    this.closeTavernPersonDetail();
    const person=ensureTavernRoster(this).people.find(p=>p.unit===unit&&!p.joined);
    const host=el('div','soldier-detail-host tavern-person-detail');host.id='tavern-person-detail';
    host.innerHTML=this.buildSoldierDetailHtml(unit,{preview:!!person});
    tavern.querySelector('.tavern-panel').append(host);
    const portrait=host.querySelector('.soldier-face-portrait');
    portrait.setAttribute('aria-label',`${unit.name}の素顔`);drawSoldierPortrait(portrait.getContext('2d'),unit,portrait.width,portrait.height);
    this.wireSoldierDetailPopovers(host);
    if(person){
      const hire=el('button','action-btn tavern-detail-hire',this.gold<person.cost?`雇用 ${person.cost.toLocaleString()}G（所持金が足りません）`:`${person.cost.toLocaleString()}Gで雇う`);
      hire.type='button';hire.disabled=this.gold<person.cost;
      hire.onclick=()=>{this.closeTavernPersonDetail();this.recruitTavernPerson(unit.id,'gold');};
      host.querySelector('.soldier-detail-head').after(hire);
    }
    const close=()=>this.closeTavernPersonDetail();
    host.querySelector('.btn-close-soldier-detail').onclick=close;host.onclick=e=>{if(e.target===host)close();};
    setSubDialog(this,host,true,close);return true;
  },
  closeTavernPersonDetail(){
    const host=this.container?.querySelector('#tavern-person-detail');if(!host)return;
    setSubDialog(this,host,false);for(const c of host.querySelectorAll('canvas')){c.width=c.height=1;}host.remove();
  },
  recruitTavernPerson(id,method='gold'){
    if(!nearFieldTavern(this))return false;
    const p=ensureTavernRoster(this).people.find(p=>p.unit.id===id&&!p.joined);if(!p||method!=='gold'||this.gold<TAVERN_HIRE_COST)return false;
    this.gold-=TAVERN_HIRE_COST;
    p.joined=true;const s=p.unit;s.civilianOutfit=!this.isEnlisted();s.joinedFrom='tavern';s.isPersonalGuard=true;s.overflowGuard=false;
    if((this.squad||[]).filter(isOwnSquad).length<this.limitedGuardLimit()){
      s.x=this.player.x+28;s.y=this.player.y+18;this.squad.push(s);this.syncPersonalGuardSlots(null,this.limitedGuardLimit());
      this.showToast(`${s.name}が旅の仲間になりました。`);
    }else if(!this.isEnlisted()){
      park(this,s);this.showToast(`${s.name}が仲間になり、この酒場で待つことになりました。`);
    }else{
      sendToReserve(this,s);this.showToast(`${s.name}が本陣の予備兵として加入しました。`);
    }
    this.normalizeDeployment();this.savePurchase();this.updateStatsUI();this.renderStrategyUI();this.renderTavern();return true;
  },
  parkTavernCompanion(id){
    if(!nearFieldTavern(this))return false;
    const s=(this.squad||[]).find(s=>s.id===id&&isOwnSquad(s));if(!s||s.isDown||s.carrierId)return false;
    if(this.isEnlisted())sendToReserve(this,s);else park(this,s);
    this.syncPersonalGuardSlots(null,this.limitedGuardLimit());this.normalizeDeployment();this.saveGame({background:true});this.updateStatsUI();this.renderTavern();return true;
  },
  rejoinTavernCompanion(id){
    if(!nearFieldTavern(this)||(this.squad||[]).filter(isOwnSquad).length>=this.limitedGuardLimit())return false;
    const s=this.taverns?.waiting.find(s=>s.id===id);if(!s)return false;
    this.taverns.waiting=this.taverns.waiting.filter(u=>u!==s);Object.assign(s,{x:this.player.x+28,y:this.player.y+18,isPersonalGuard:true,overflowGuard:false});
    this.squad.push(s);this.syncPersonalGuardSlots(null,this.limitedGuardLimit());this.saveGame({background:true});this.updateStatsUI();this.renderTavern();return true;
  }
};
