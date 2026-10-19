import {WORLD_SIZE} from './world.js?v=289';
import {HQ_FACILITY_LAYOUT,hqFacilityBlocks} from './hq-facility-layout.js?v=201';
import {setSubDialog} from './interface.js?v=321';
import {daylightAt} from './day-night.js?v=208';
import {buildingContact} from './building-interactions.js?v=201';
import {drawCasinoSign} from './nightlife-visuals.js?v=277';
const center=WORLD_SIZE/2;
export const HEADQUARTERS_FACILITIES=HQ_FACILITY_LAYOUT.map(p=>Object.freeze({...p,type:'hq-facility',x:center+p.x,y:center+p.y}));
// Service architecture keeps the army's established combat and movement rules.
export const headquartersBuildingBlocks=(x,y)=>hqFacilityBlocks(x-center,y-center);
export function nearHeadquartersFacility(game,id) {
  if(game.currentDungeon||!game.player||game.player.dead||game.player.isDown)return null;
  return HEADQUARTERS_FACILITIES.find(p=>(!id||p.id===id)&&(buildingContact(game.player,p)||Math.hypot(game.player.x-p.x,game.player.y-(p.y+24))<68))||null;
}
// Town transactions keep their established rules; the headquarters service is reached on foot.
export const atFacility=(game,id,level)=>!game.player?.dead&&!game.player?.isDown&&game.nation?.level>=level&&
  (game.currentDungeon?.kind==='town'||!!nearHeadquartersFacility(game,id));
export function updateHeadquartersFacilityPrompt(game) {
  const host=game.container?.querySelector('.field-prompts');if(!host)return;
  let button=host.querySelector('#btn-hq-facility');
  if(!button){button=document.createElement('button');button.id='btn-hq-facility';button.type='button';button.className='phase-btn hidden';button.onclick=()=>game.openHeadquartersFacility(button.dataset.facility);host.append(button);}
  const facility=nearHeadquartersFacility(game);
  button.classList.toggle('hidden',!facility);
  if(facility){button.dataset.facility=facility.id;const text=`${facility.name}に入る`;if(button.textContent!==text)button.textContent=text;}
}
export function drawHeadquartersFacilityGround(c) {
  c.save();c.fillStyle='#605b45';
  c.fillRect(center-260,center-81,520,58);c.fillRect(center-25,center-24,50,303);
  c.fillRect(center-25,center+259,265,40);
  c.fillStyle='#8a8161';
  for(const p of HEADQUARTERS_FACILITIES)c.fillRect(p.x-48,p.y+2,96,42);
  c.strokeStyle='#a99b7148';c.lineWidth=1;
  for(let x=center-255;x<center+260;x+=24){c.beginPath();c.moveTo(x,center-79);c.lineTo(x,center-25);c.stroke();}
  c.restore();
}
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const poly=(c,points,color)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
/** Context is already translated to the building's foot, in the same depth queue as actors. */
export function drawHeadquartersFacility(c,prop,game,now) {
  const p=HEADQUARTERS_FACILITIES.find(p=>p.id===prop.id);if(!p)return;
  const open=(game.nation?.level||0)>=p.level,lamp=open?daylightAt(game.worldTime).nightLight:0;
  const w=p.w,h=p.h;
  c.fillStyle='rgba(12,15,12,.35)';c.beginPath();c.ellipse(3,8,w*.58,19,0,0,Math.PI*2);c.fill();
  rect(c,-w/2,-h,w,h,p.id==='smith'?'#696853':p.id==='guild'?'#69735c':'#5c625d');
  rect(c,w/2-28,-h,28,h,'#41483e');
  c.strokeStyle='#c1b58b45';c.lineWidth=1;
  for(let y=-h+13;y<0;y+=15){c.beginPath();c.moveTo(-w/2,y);c.lineTo(w/2,y);c.stroke();for(let x=-w/2+(y%2?0:10);x<w/2;x+=28){c.beginPath();c.moveTo(x,y-15);c.lineTo(x,y);c.stroke();}}
  const roof=p.id==='smith'?'#75513b':p.id==='guild'?'#4a6258':'#51577a';
  poly(c,[[-w/2-10,-h+4],[0,-h-35],[w/2+10,-h+4]],roof);
  c.strokeStyle='#c4b68b';c.lineWidth=2;c.beginPath();c.moveTo(-w/2-10,-h+4);c.lineTo(0,-h-35);c.lineTo(w/2+10,-h+4);c.stroke();
  rect(c,-16,-43,32,43,open?'#232a21':'#3b382d');rect(c,-20,-47,40,5,'#b7a982');
  if(!open){rect(c,-13,-24,26,4,'#b5a078');rect(c,-13,-16,26,4,'#b5a078');}
  for(const x of [-55,48]){
    rect(c,x-12,-65,24,28,'#303c37');
    if(lamp>0)rect(c,x-12,-65,24,28,`rgba(255,195,98,${lamp*.9})`);
    rect(c,x-13,-66,26,3,'#b6ae8b');rect(c,x-1,-65,2,28,'#b6ae8b');
  }
  if(p.id==='smith') {
    rect(c,42,-h-37,18,32,'#7d7767');rect(c,39,-h-40,24,5,'#a6a28a');
    // Furnace and anvil distinguish the workshop at field scale.
    rect(c,-72,-40,31,34,'#403e35');rect(c,-68,-28,23,20,open?'#a97439':'#252a25');
    if(lamp>0)rect(c,-66,-25,19,16,`rgba(255,182,76,${lamp})`);
    poly(c,[[39,-14],[67,-14],[72,-21],[44,-21],[35,-27],[30,-24]],'#242e30');rect(c,46,-14,13,10,'#394449');
  } else if(p.id==='guild') {
    rect(c,-72,-38,27,30,'#433d29');rect(c,-69,-35,21,24,'#d5c9a2');
    c.strokeStyle='#797058';c.lineWidth=1;for(let y=-30;y<-14;y+=5){c.beginPath();c.moveTo(-66,y);c.lineTo(-52,y);c.stroke();}
    poly(c,[[45,-38],[64,-38],[64,-18],[55,-11],[45,-18]],'#acb098');
    c.strokeStyle='#e2d6a3';c.lineWidth=2;c.beginPath();c.moveTo(55,-34);c.lineTo(55,-16);c.moveTo(49,-26);c.lineTo(61,-26);c.stroke();
  } else {
    rect(c,-61,-31,22,28,'#d4cbb5');rect(c,-34,-28,22,28,'#d4cbb5');
    poly(c,[[-50,-25],[-46,-17],[-50,-9],[-54,-17]],'#973f42');
    poly(c,[[-23,-22],[-18,-14],[-23,-6],[-28,-14]],'#2d3b3e');
  }
  const titleY=-h+15;
  if(p.id==='casino')drawCasinoSign(c,w,h,now);
  else {rect(c,-w/2+5,titleY,w-10,25,'#2e352b');c.font='bold 15px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#efe1b5';c.fillText(p.name,0,titleY+13);}
  if(!open){c.font='11px sans-serif';c.fillStyle='#e1cf9c';c.fillText(`準備中 · 本陣発展Lv${p.level}`,0,18);}
}
const money=n=>`${Math.max(0,n||0).toLocaleString()}G`;
export const headquartersFacilityMethods={
  openHeadquartersFacility(id) {
    const facility=nearHeadquartersFacility(this,id);if(!facility||this.container?.querySelector('#hq-facility-dialog'))return false;
    const host=document.createElement('section');host.id='hq-facility-dialog';host.className='hq-facility-sheet';host.dataset.facility=facility.id;host._wasBattle=this.inBattle;
    host.innerHTML=`<div class="sheet-bar"><strong class="sheet-bar-title">${facility.name}</strong><button type="button" id="btn-hq-facility-close" class="sheet-bar-btn">‹ 本陣へ</button></div><div class="hq-facility-body"></div>`;
    (this.container.querySelector('.game-wrapper')||this.container).append(host);
    this.inBattle=false;this.resetMovementInput();this.setDialogState(true);
    this.refreshHeadquartersFacility();const close=()=>this.closeHeadquartersFacility();host.querySelector('#btn-hq-facility-close').onclick=close;
    setSubDialog(this,host,true,close);host.setAttribute('aria-label',facility.name);return true;
  },
  closeHeadquartersFacility(resume=true) {
    const host=this.container?.querySelector('#hq-facility-dialog');if(!host)return;
    setSubDialog(this,host,false);host.remove();this.setDialogState(false);this.resetMovementInput();this.inBattle=resume&&host._wasBattle;
    if(resume){this.saveGame({background:true});this.updateStatsUI(true);this.container.querySelector('#btn-hq-facility')?.focus();}
  },
  refreshHeadquartersFacility() {
    const host=this.container?.querySelector('#hq-facility-dialog');if(!host)return;
    const p=HEADQUARTERS_FACILITIES.find(p=>p.id===host.dataset.facility),body=host.querySelector('.hq-facility-body'),focus=document.activeElement?.id,innerTop=body.querySelector('.guild-list')?.scrollTop,resetInner=!!this.guildScrollReset,keep=[host,body].map(e=>[e,e.scrollTop]);
    const ready=(this.nation?.level||0)>=p.level;
    body.classList.toggle('guild-mode',p.id==='guild'&&ready);this.guildScrollReset=false;
    body.innerHTML=`${p.id==='guild'?'':`<p class="facility-intro">本陣の${p.name} · 所持金 ${money(this.gold)}</p>`}${ready?'':`<p class="facility-note">営業準備中。本陣の発展Lv${p.level}で利用できます。</p>`}`;
    if(p.id==='smith') {
      this.renderWorkshop(body);
      const item=this.equipped?.weapon,cost=item?Math.max(1,Math.floor(this.getUpgradeCost(item)*.8)):0;
      body.insertAdjacentHTML('beforeend',`<div class="town-facility"><h5>武器の強化</h5><p>隊長武器の強化が2割引。1期に1回。${item?money(cost):'武器装備が必要'}${this.nation.smithPhase===this.phase?' · 今期は利用済み':''}</p><button type="button" data-hq-service="smith" ${!atFacility(this,'smith',1)||!item||this.nation.smithPhase===this.phase||this.gold<cost?'disabled':''}>武器を強化する</button></div>`);
    } else if(p.id==='guild') {
      this.renderGuild(body);
    } else this.renderCasino(body);
    for(const button of body.querySelectorAll('[data-hq-service]'))button.onclick=()=>this.useTownFacility(button.dataset.hqService);
    for(const [e,t] of keep)e.scrollTop=t;
    const list=body.querySelector('.guild-list');if(list&&innerTop!=null)list.scrollTop=resetInner?0:innerTop;
    if(focus)body.querySelector(`[id="${focus}"]`)?.focus({preventScroll:true});
  }
};
