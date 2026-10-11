import {isEnlisted,CAREER_RULES} from './career-rules.js?v=196';
import {isOwnSquad} from './own-squad-marker.js?v=182';
import {persistentUnit} from './render-support.js';
import {calcScoutCost} from './economy-rules.js?v=192';
import {drawSoldierPortrait} from './soldier-appearance.js?v=195';
import {setSubDialog} from './interface.js?v=195';
import {WORLD_SIZE,TAVERN_SITE} from './world.js?v=198';
import {daylightAt} from './day-night.js?v=197';
import {GARDEN_TABLES,drawLeisureTable} from './camp-leisure.js?v=198';

const classes=['HEAVY','LIGHT','ARCHER','MAGE','MEDIC'];
const jobs={HEAVY:'重装兵',LIGHT:'軽装兵',ARCHER:'弓兵',MAGE:'魔法師',MEDIC:'衛生士'};
const talks=[
  {line:'「旅の途中でこまっている人を見かけたら、どうする？」',answers:['できる範囲で力を貸す','面倒なので置いていく'],good:0},
  {line:'「強い敵に出会ったら、仲間をどう扱う？」',answers:['先に行かせて様子を見る','無理をせず、皆で帰る道を探す'],good:1},
  {line:'「しばらく同じ道を歩いてみてもいいかもしれないな。」',answers:['いっしょに旅をしよう','手柄はすべて自分のものだ'],good:0}
];
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
/** One large tavern stands on the field just south of HQ. Strangers and waiting friends all gather there. */
export const FIELD_TAVERN=Object.freeze({...TAVERN_SITE,radius:130,name:'本陣前の大酒場'});
export function initializeTaverns(game,saved){
  game.taverns={version:2,roster:saved?.roster?.people?structuredClone(saved.roster):null,waiting:Array.isArray(saved?.waiting)?saved.waiting.filter(s=>s?.id&&!s.dead).map(s=>structuredClone(s)):[]};
}
export const nearFieldTavern=game=>!game.currentDungeon&&!!game.player&&!game.player.isDown&&Math.hypot(game.player.x-FIELD_TAVERN.x,game.player.y-FIELD_TAVERN.y)<FIELD_TAVERN.radius;
export function ensureTavernRoster(game){
  game.taverns||initializeTaverns(game);let roster=game.taverns.roster;const phase=game.phase||1;
  if(!roster||(roster.people.every(p=>p.joined)&&roster.phase!==phase)){
    const people=Array.from({length:4},(_,i)=>{
      const unit=game.createNewSoldier(null,{classKey:classes[(i+phase)%classes.length]});
      unit.civilianOutfit=true;
      return {unit,cost:calcScoutCost(phase,unit.talent,unit.level||1),trust:0,talkStep:0,joined:false};
    });
    roster={phase,people};game.taverns.roster=roster;
  }
  return roster;
}
export function serializeTaverns(game){
  const state=game.taverns||{roster:null,waiting:[]},r=state.roster;
  return {version:2,waiting:state.waiting.map(persistentUnit),roster:r?{...r,people:r.people.map(p=>({...p,unit:p.joined?{id:p.unit.id}:persistentUnit(p.unit)}))}:null};
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
  const host=game.container?.querySelector?.('.field-prompts');if(!host)return;
  let button=host.querySelector('#btn-field-tavern');
  if(!button){button=el('button','phase-btn hidden',`🍺 ${FIELD_TAVERN.name}に入る`);button.id='btn-field-tavern';button.type='button';button.onclick=()=>game.openTavern();host.append(button);game._tavernPromptShown=false;}
  const show=nearFieldTavern(game);if(show===game._tavernPromptShown)return;
  game._tavernPromptShown=show;button.classList.toggle('hidden',!show);
}
export function drawFieldTavern(c,game,drawPerson){
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
  c.restore();
  for(const t of GARDEN_TABLES)drawLeisureTable(c,t);
  const visitors=people.filter(v=>!v.joined).map(v=>v.unit).concat(game.taverns?.waiting||[]).slice(0,12);
  for(const [i,s]of visitors.entries())drawPerson(s,x-150+(i%6)*60,y+40+Math.floor(i/6)*50);
}
export const tavernMethods={
  openTavern(){
    if(!nearFieldTavern(this)){this.showToast?.(`仲間との出会いは、本陣の南にある${FIELD_TAVERN.name}で探せます`);return false;}
    if(this.container.querySelector('#tavern-dialog'))return false;
    ensureTavernRoster(this);this.openStrategyModal(true);
    const host=el('div','game-overlay commander-editor');host.id='tavern-dialog';
    host.innerHTML='<section class="strategy-panel ce-panel tavern-panel"><header class="sheet-bar"><strong class="sheet-bar-title" id="tavern-title"></strong><button type="button" class="sheet-bar-btn" id="btn-tavern-close">閉じる ×</button></header><div class="ce-body tavern-body"></div></section>';
    (this.container.querySelector('.iron-squad')||this.container).append(host);
    const close=()=>{host.remove();setSubDialog(this,host,false);this.saveGame();};
    host.querySelector('#btn-tavern-close').onclick=close;setSubDialog(this,host,true,close);host.setAttribute('aria-label',FIELD_TAVERN.name);
    this.renderTavern();this.saveGame();return true;
  },
  renderTavern(){
    const host=this.container?.querySelector('#tavern-dialog');if(!host)return;
    host.querySelector('#tavern-title').textContent=FIELD_TAVERN.name;
    const body=host.querySelector('.tavern-body');for(const c of body.querySelectorAll('canvas')){c.width=c.height=1;}body.replaceChildren();
    const own=(this.squad||[]).filter(isOwnSquad),limit=this.limitedGuardLimit(),enlisted=this.isEnlisted();
    body.append(el('p','command-note',`同行する仲間 ${own.length} / ${limit}人。金で雇うか、話をして信頼を得ると仲間になります。`));
    body.append(el('p','command-note',enlisted?'同行しきれない仲間は本陣の予備に入ります。':'同行しきれない仲間は、この酒場で待ちます。入隊せずに旅を続けることもできます。'));
    const row=(unit,label)=>{
      const card=el('article','tavern-person'),portrait=el('canvas','tavern-portrait');portrait.width=120;portrait.height=132;
      const text=el('div','tavern-person-text');text.append(el('strong','',unit.name),el('p','',`${jobs[unit.soldierClass]||unit.soldierClass} · Lv.${unit.level||1} · HP ${unit.maxHp} · 攻撃 ${unit.atk}`),el('p','command-note',label));
      const actions=el('div','tavern-actions');card.append(portrait,text,actions);body.append(card);drawSoldierPortrait(portrait.getContext('2d'),unit,120,132);return {card,text,actions};
    };
    const button=(actions,label,fn,disabled=false)=>{const b=el('button','action-btn secondary',label);b.type='button';b.disabled=disabled;b.onclick=fn;actions.append(b);return b;};
    for(const person of ensureTavernRoster(this).people.filter(p=>!p.joined)){
      const {text,actions}=row(person.unit,`雇用 ${person.cost.toLocaleString()}G · ${person.trust>=3?'意気投合しています':'まだ出会ったばかり'}`);
      button(actions,`${person.cost.toLocaleString()}Gで雇う`,()=>this.recruitTavernPerson(person.unit.id,'gold'),this.gold<person.cost);
      if(person.trust>=3)button(actions,'旅の仲間に誘う',()=>this.recruitTavernPerson(person.unit.id,'talk'));
      else button(actions,'会話する',()=>{
        const topic=talks[person.talkStep%talks.length];text.append(el('p','tavern-talk',topic.line));actions.replaceChildren();
        topic.answers.forEach((answer,i)=>button(actions,answer,()=>this.talkToTavernPerson(person.unit.id,i)));
      });
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
  talkToTavernPerson(id,answer){
    if(!nearFieldTavern(this))return false;
    const p=ensureTavernRoster(this).people.find(p=>p.unit.id===id&&!p.joined);if(!p||p.trust>=3)return false;
    const topic=talks[p.talkStep%talks.length];
    if(!Number.isInteger(answer)||answer<0||answer>=topic.answers.length)return false;
    if(answer===topic.good){p.trust++;p.talkStep++;this.showToast(p.trust>=3?`${p.unit.name}と意気投合しました。旅に誘えます。`:`${p.unit.name}との距離が少し縮まりました。`);}
    else this.showToast(`${p.unit.name}は少しこまった顔をしました。もう一度、話をしてみましょう。`);
    this.saveGame();this.renderTavern();return true;
  },
  recruitTavernPerson(id,method='gold'){
    if(!nearFieldTavern(this))return false;
    const p=ensureTavernRoster(this).people.find(p=>p.unit.id===id&&!p.joined);if(!p||!['gold','talk'].includes(method))return false;
    if(method==='gold'&&this.gold<p.cost||method==='talk'&&p.trust<3)return false;
    if(method==='gold')this.gold-=p.cost;
    p.joined=true;const s=p.unit;s.civilianOutfit=!this.isEnlisted();s.joinedFrom='tavern';s.isPersonalGuard=true;s.overflowGuard=false;
    if((this.squad||[]).filter(isOwnSquad).length<this.limitedGuardLimit()){
      s.x=this.player.x+28;s.y=this.player.y+18;this.squad.push(s);this.syncPersonalGuardSlots(null,this.limitedGuardLimit());
      this.showToast(`${s.name}が旅の仲間になりました。`);
    }else if(!this.isEnlisted()){
      park(this,s);this.showToast(`${s.name}が仲間になり、この酒場で待つことになりました。`);
    }else{
      sendToReserve(this,s);this.showToast(`${s.name}が本陣の予備兵として加入しました。`);
    }
    this.normalizeDeployment();this.saveGame();this.updateStatsUI();this.renderTavern();return true;
  },
  parkTavernCompanion(id){
    if(!nearFieldTavern(this))return false;
    const s=(this.squad||[]).find(s=>s.id===id&&isOwnSquad(s));if(!s||s.isDown||s.carrierId)return false;
    if(this.isEnlisted())sendToReserve(this,s);else park(this,s);
    this.syncPersonalGuardSlots(null,this.limitedGuardLimit());this.normalizeDeployment();this.saveGame();this.updateStatsUI();this.renderTavern();return true;
  },
  rejoinTavernCompanion(id){
    if(!nearFieldTavern(this)||(this.squad||[]).filter(isOwnSquad).length>=this.limitedGuardLimit())return false;
    const s=this.taverns?.waiting.find(s=>s.id===id);if(!s)return false;
    this.taverns.waiting=this.taverns.waiting.filter(u=>u!==s);Object.assign(s,{x:this.player.x+28,y:this.player.y+18,isPersonalGuard:true,overflowGuard:false});
    this.squad.push(s);this.syncPersonalGuardSlots(null,this.limitedGuardLimit());this.saveGame();this.updateStatsUI();this.renderTavern();return true;
  }
};
