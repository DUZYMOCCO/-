import {WORLD_SIZE,fieldBlocks} from './world.js?v=148';
import {inCurrentInstance} from './instance-rules.js?v=148';
import {isSoldierOnExpedition} from './expedition-rules.js';
export const LIMITED_CLASSES=Object.freeze({
 NINJA:{id:'NINJA',name:'忍者',icon:'🥷',baseClassId:'LIGHT',combatClass:'LIGHT',color:'#8e97ac',range:250,speed:136,atkCooldown:.75,bonusHp:5,bonusAtk:12,desc:'刀と手裏剣を間合いに応じて使い分ける。'},
 BEAST_WOLF:{id:'BEAST_WOLF',name:'狼獣人',icon:'🐺',species:'wolf',baseClassId:'LIGHT',combatClass:'LIGHT',color:'#9cabb0',range:65,speed:122,atkCooldown:.85,bonusHp:15,bonusAtk:15,desc:'近接戦と追跡に長けた獣人。'},
 BEAST_BEAR:{id:'BEAST_BEAR',name:'熊獣人',icon:'🐻',species:'bear',baseClassId:'HEAVY',combatClass:'HEAVY',color:'#a88e70',range:65,speed:88,atkCooldown:1.2,bonusHp:65,bonusAtk:15,bonusDef:20,desc:'盾で仲間を守る頑強な獣人。'},
 BEAST_CAT:{id:'BEAST_CAT',name:'猫獣人',icon:'🐱',species:'cat',baseClassId:'LIGHT',combatClass:'LIGHT',color:'#baa088',range:65,speed:145,atkCooldown:.6,bonusHp:-5,bonusAtk:10,desc:'速さと身のこなしに長けた獣人。'},
 BEAST_FOX:{id:'BEAST_FOX',name:'狐獣人',icon:'🦊',species:'fox',baseClassId:'MAGE',combatClass:'MAGE',color:'#bb926b',range:275,speed:100,atkCooldown:2.1,bonusHp:-20,bonusAtk:22,desc:'魔法を扱う狐の一族。'},
 BEAST_BIRD:{id:'BEAST_BIRD',name:'鳥獣人',icon:'🦅',species:'bird',baseClassId:'ARCHER',combatClass:'ARCHER',color:'#9baba2',range:260,speed:125,atkCooldown:1.1,bonusHp:5,bonusAtk:14,desc:'弓を扱う鳥の一族。'}
});
const LIMITED_NAMES={NINJA:['影丸','朔','蓮','黒羽','千鳥','銀次'],wolf:['灰尾','ロウ','銀牙','遠吠'],bear:['ゴウ','岩掌','森助','厚丸'],cat:['ミケ','鈴音','クロ','日向'],fox:['琥珀','灯','コン','白露'],bird:['羽音','鷹丸','青羽','ツバサ']};
const center=WORLD_SIZE/2;
const locations=[['ninja_village','隠れ忍者村','NINJA',40200,41800],['wolf_hamlet','狼獣人の小集落','BEAST_WOLF',-4100,-900],['bear_hamlet','熊獣人の小集落','BEAST_BEAR',-9000,4600],['cat_hamlet','猫獣人の小集落','BEAST_CAT',7000,-4200],['fox_hamlet','狐獣人の小集落','BEAST_FOX',17000,12000],['bird_hamlet','鳥獣人の小集落','BEAST_BIRD',-20000,-12500]];
export const LIMITED_SETTLEMENTS=locations.map(([id,name,limitedClass,ox,oy])=>{
 let x=center+ox,y=center+oy;
 outer:for(const r of [0,40,80,120,180,240,320])for(let i=0;i<16;i++){const a=i*Math.PI/8,nx=center+ox+Math.cos(a)*r,ny=center+oy+Math.sin(a)*r;if(!fieldBlocks(nx,ny)){x=nx;y=ny;break outer;}}
 return {id,name,limitedClass,kind:'town',theme:'town',subtitle:'探索で出会う仲間',icon:LIMITED_CLASSES[limitedClass].icon,color:'#afa17e',accentColor:'#c6b17d',reqDef:0,reqLv:1,desc:'住民に話しかけると志願者が仲間になる。',entrance:{x,y,radius:68},width:1100,height:720,ambientColor:'#241e16',floorColor:'#3a3428',wallColor:'#14110e',torchColor:'#c47a3a',distance:Math.hypot(ox,oy),mobTypes:[],mobCount:0,eliteCount:0,boss:null,guardian:null};
});
const alive=u=>u&&!u.dead&&!u.isDown&&u.hp>0;
export function initializeLimitedAllies(game,saved=null) {
 game.limitedAllies={version:1,encounters:Array.isArray(saved?.encounters)?saved.encounters.filter(e=>e?.id&&e.unit?.id&&LIMITED_CLASSES[e.unit.soldierClass]):[],joinedIds:[...new Set(saved?.joinedIds||[])],joinNoticeIds:Array.isArray(saved?.joinNoticeIds)?saved.joinNoticeIds.filter(id=>typeof id==='string').slice(-8):[]};
}
export function createLimitedAlly(game,classId,origin) {
 const def=LIMITED_CLASSES[classId];if(!def)return null;
 const s=game.createNewSoldier(null,{classKey:def.combatClass});
 s.soldierClass=classId;s.combatClass=def.combatClass;s.species=def.species||null;s.limitedOrigin=origin;s.isNamed=true;
 const names=LIMITED_NAMES[def.species||classId];let nameSeed=0;for(const ch of s.id)nameSeed=(nameSeed*31+ch.charCodeAt(0))>>>0;s.name=`${def.name}・${names[nameSeed%names.length]}`;
 // Each people has a tendency; individual aptitude rolls and rare talents remain intact.
 const p=s.attributeProfile;if(classId==='NINJA'||classId==='BEAST_CAT')p.aptitudes.quickness=Math.min(3,p.aptitudes.quickness*1.35);
 if(classId==='NINJA'){
  p.innate.strength=Math.max(20,p.innate.strength);s.favoriteWeapon='sword';
  const w=s.equipped.weapon;Object.assign(w,{weaponStyle:'sword',name:'木の忍刀',baseName:'木の忍刀',minStrength:18,baseStats:{atk:14},stats:{atk:14}});delete w.weaponTraits;s.weapon=w;
  game.applyEquipmentUpgrade(w,0);
 }
 if(classId==='BEAST_BEAR')p.innate.strength*=1.35;
 if(classId==='BEAST_FOX')p.aptitudes.magic=Math.min(3,p.aptitudes.magic*1.25);
 game.recalcSoldierStats(s);s.hp=s.maxHp;return s;
}
export function prepareLimitedEncounter(game,dungeon) {
 game.limitedAllies||initializeLimitedAllies(game);const state=game.limitedAllies;
 const settlement=!!dungeon.limitedClass;if(!settlement&&dungeon.kind!=='dungeon'&&dungeon.kind!=='ruin')return null;
 // Villages offer one individual each wave. Captives are once per dungeon for this expedition.
 if(settlement){const waiting=state.encounters.find(e=>e.dungeonId===dungeon.id&&!e.joined);if(waiting)return waiting;}
 const id=settlement?`${dungeon.id}:wave:${game.phase||1}`:`${dungeon.id}:captive`;
 let e=state.encounters.find(e=>e.id===id);if(e)return e;
 if(settlement)state.encounters=state.encounters.filter(e=>e.dungeonId!==dungeon.id);
 const species=Object.keys(LIMITED_CLASSES).filter(k=>k!=='NINJA');let hash=0;for(const ch of dungeon.id)hash=(hash*31+ch.charCodeAt(0))>>>0;
 const classId=dungeon.limitedClass||species[hash%species.length];const unit=createLimitedAlly(game,classId,dungeon.name);
 e={id,dungeonId:dungeon.id,kind:settlement?'volunteer':'cage',x:settlement?430:Math.round(dungeon.width*.62),y:settlement?dungeon.height/2:Math.round(dungeon.height*.7),joined:false,unit};
 state.encounters.push(e);return e;
}
export function joinLimitedEncounter(game,id) {
 const e=game.limitedAllies?.encounters.find(e=>e.id===id),place=game.currentDungeon;
 if(!e||e.joined||!place||place.id!==e.dungeonId||!alive(game.player)||game.restTimer>0)return false;
 if(Math.hypot(game.player.x-e.x,game.player.y-e.y)>100)return false;
 if(e.kind==='cage'&&(game.monsters||[]).some(m=>alive(m)&&Math.hypot(m.x-e.x,m.y-e.y)<190)){game.showToast?.('ケージの周りの敵を先に倒してください');return false;}
 const already=[...(game.squad||[]),...(game.reserves||[])].some(s=>s.id===e.unit.id);
 if(!already){
  const s=e.unit;const room=(game.squad||[]).filter(u=>!u.dead&&u.isPersonalGuard).length<(game.limitedGuardLimit?.()??12)
    &&(game.squad||[]).filter(u=>!u.dead).length<(game.limitedDeploymentLimit?.()??48);
  Object.assign(s,{isPersonalGuard:room,x:game.player.x+28,y:game.player.y+18,joinedFrom:e.kind==='cage'?'rescue':'settlement'});
  if(room)(game.squad||=[]).push(s);else {s.x=WORLD_SIZE/2;s.y=WORLD_SIZE/2;(game.reserves||=[]).push(s);}
  notifyLimitedJoin(game,[s]);
 }
 e.joined=true;game.limitedAllies.joinedIds.push(e.unit.id);game.saveGame?.();game.updateStatsUI?.();return true;
}
export function serializeLimitedAllies(game) {
 const state=game.limitedAllies||{version:1,encounters:[],joinedIds:[]};
 return {...state,encounters:state.encounters.map(e=>e.joined?{...e,unit:{id:e.unit.id,soldierClass:e.unit.soldierClass}}:e)};
}
export function notifyLimitedJoin(game,units) {
 game.limitedAllies||initializeLimitedAllies(game);
 const limited=units.filter(u=>LIMITED_CLASSES[u.soldierClass]);if(!limited.length)return;
 game.limitedAllies.joinNoticeIds=[...new Set([...(game.limitedAllies.joinNoticeIds||[]),...limited.map(u=>u.id)])].slice(-8);
 for(const u of limited){const reserve=(game.reserves||[]).some(s=>s.id===u.id);game.showToast?.(reserve?`【予備兵に加入】${u.name}。本陣で待機し、出撃枠の欠員時に合流します。`:u.isPersonalGuard?`【直属部隊に加入】${u.name}が隊長に同行します。`:`【本隊に加入】${u.name}が出撃部隊に合流しました。`);}
 renderLimitedJoinNotice(game);
}
function renderLimitedJoinNotice(game) {
 const host=game.container?.querySelector('.field-alerts');if(!host)return;
 let notice=host.querySelector('#limited-join-notice');
 if(!notice){
  notice=document.createElement('section');notice.id='limited-join-notice';notice.className='limited-join-notice hidden';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const title=document.createElement('strong');title.className='limited-join-title';const names=document.createElement('div');names.className='limited-join-names';const hint=document.createElement('p');hint.className='limited-join-hint';
  const actions=document.createElement('div');actions.className='limited-join-actions';
  const roster=document.createElement('button');roster.type='button';roster.textContent='加入兵の名簿';roster.id='btn-limited-join-roster';
  roster.onclick=()=>{game.rosterManageTab='roster';game.openStrategyModal?.(true);game._selectStratTab?.('troops');const reserves=game.container.querySelector('#reserve-roster');if(reserves&&notice.dataset.hasReserves==='true'){reserves.open=true;reserves.scrollIntoView?.({block:'start'});reserves.querySelector('summary')?.focus({preventScroll:true});}};
  const close=document.createElement('button');close.type='button';close.textContent='確認';close.id='btn-limited-join-dismiss';close.setAttribute('aria-label','加入通知を閉じる');
  close.onclick=()=>{game.limitedAllies.joinNoticeIds=[];renderLimitedJoinNotice(game);game.saveGame?.();};
  actions.append(roster,close);notice.append(title,names,hint,actions);host.append(notice);
 }
 const ids=new Set(game.limitedAllies?.joinNoticeIds||[]),reserves=game.reserves||[];
 const units=[...(game.squad||[]),...reserves].filter(u=>ids.has(u.id)&&!u.dead);notice.classList.toggle('hidden',!units.length);
 const badge=game.container.querySelector('.menu-join-count');if(badge){badge.textContent=String(units.length);badge.classList.toggle('hidden',!units.length);game.container.querySelector('#btn-strategy')?.setAttribute('aria-label',units.length?`メニューを開く（仲間の加入通知${units.length}件）`:'メニューを開く');}
 if(!units.length)return;
 const waiting=units.filter(u=>reserves.some(s=>s.id===u.id)),signature=units.map(u=>`${u.id}:${waiting.includes(u)?'reserve':u.isPersonalGuard?'personal':'army'}`).join('|');
 if(notice.dataset.signature===signature)return;notice.dataset.signature=signature;notice.dataset.hasReserves=String(waiting.length>0);
 notice.querySelector('.limited-join-title').textContent=waiting.length===units.length?'予備兵に加入しました':waiting.length?'仲間が加入しました':'部隊に加入しました';
 const names=notice.querySelector('.limited-join-names');names.replaceChildren();for(const u of units){const row=document.createElement('div');row.textContent=`${waiting.includes(u)?'予備兵':u.isPersonalGuard?'直属部隊':'本隊'}：${u.name}`;names.append(row);}
 notice.querySelector('.limited-join-hint').textContent=waiting.length?'予備兵は本陣で待機。出撃枠に欠員が出ると合流します。':'加入した仲間は出撃中です。';
}
export function updateLimitedAllies(game) {
 renderLimitedJoinNotice(game);
 const root=game.container;if(!root)return;
 let button=root.querySelector('#btn-limited-ally');
 if(!button){const host=root.querySelector('.field-interactions');if(!host)return;button=document.createElement('button');button.id='btn-limited-ally';button.className='phase-btn';button.type='button';host.append(button);}
 const e=game.limitedAllies?.encounters.find(e=>!e.joined&&e.dungeonId===game.currentDungeon?.id&&Math.hypot(game.player.x-e.x,game.player.y-e.y)<=100);
 button.classList.toggle('hidden',!e);if(e){button.textContent=e.kind==='cage'?`ケージを開けて${e.unit.name}を救助`:`${e.unit.name}に話しかける`;button.onclick=()=>joinLimitedEncounter(game,e.id);}
}
export function updateNinja(game,s,dt,platoon,damageMult=1) {
 if(s.soldierClass!=='NINJA')return false;
 const free=s.isPersonalGuard||game.currentDungeon||isSoldierOnExpedition(platoon,s);
 const target=free?game.getNearestMonster(s.x,s.y):game.getNearestFromList(s.x,s.y,game._baseThreatList);
 const d=target?Math.hypot(target.x-s.x,target.y-s.y):Infinity;
 const anchor=s.isPersonalGuard?game.player:platoon;
 const destination=alive(target)&&d<360?target:{x:anchor.x+35,y:anchor.y+25};
 const dx=destination.x-s.x,dy=destination.y-s.y,dist=Math.hypot(dx,dy)||1;
 s.atkCooldown=Math.max(0,(s.atkCooldown||0)-dt);s.atkAnim=Math.max(0,(s.atkAnim||0)-dt*4);
 const profile=game.combatProfileFor(s,s.equipped?.weapon||s.weapon),reach=Math.min(95,profile.reach);
 if(dist>Math.max(35,reach*.8)){const step=Math.min(dist,s.speed*dt);s.x+=dx/dist*step;s.y+=dy/dist*step;s.vx=dx/dist;s.vy=dy/dist;}else{s.vx=s.vy=0;}
 s.facingAngle=Math.atan2(dy,dx);
 if(alive(target)&&s.atkCooldown<=0&&d<=250){
  if(d<=reach+10){if(profile.ranged)game.performAttack(s,target,false,Math.round(s.atk*damageMult),false,'physical');else game.performMeleeSweep(s,target,false,Math.round(s.atk*damageMult),profile,reach);s.atkCooldown=.75/(s.atkSpeed||1);}
  else{game.projectiles.push({type:'NINJA_SHURIKEN',attacker:s,target,x:s.x,y:s.y,damage:Math.round(s.atk*.7*damageMult),speed:390,life:1.5});s.atkCooldown=1.7/(s.atkSpeed||1);}
  s.atkAnim=1;
 }
 return true;
}
export function updateShuriken(game,p,dt) {
 p.life-=dt;if(!alive(p.target)||p.life<=0)return true;
 const dx=p.target.x-p.x,dy=p.target.y-p.y,d=Math.hypot(dx,dy)||1;
 if(d<=p.speed*dt+12){game.performAttack(p.attacker,p.target,false,p.damage,false,'thrown');return true;}
 p.x+=dx/d*p.speed*dt;p.y+=dy/d*p.speed*dt;return false;
}
export function drawLimitedEncounter(c,game,drawPerson) {
 for(const e of game.limitedAllies?.encounters||[])if(!e.joined&&e.dungeonId===game.currentDungeon?.id){
  drawPerson(e.unit,e.x,e.y);
  c.save();c.translate(e.x,e.y);c.strokeStyle='#a19578';c.lineWidth=3;
  if(e.kind==='cage'){c.strokeRect(-28,-50,56,57);for(let x=-18;x<=18;x+=12){c.beginPath();c.moveTo(x,-50);c.lineTo(x,7);c.stroke();}}
  c.font='11px sans-serif';c.textAlign='center';c.fillStyle='#dbcfae';c.fillText(e.kind==='cage'?'助けを待つ獣人':'志願者',0,-58);c.restore();
 }
}
export function drawLimitedEntrance(c,def) {
 if(!def.limitedClass)return false;
 c.save();c.translate(def.entrance.x,def.entrance.y);
 for(const x of [-48,32]){c.fillStyle='#766652';c.fillRect(x,-24,34,28);c.fillStyle='#423c34';c.beginPath();c.moveTo(x-5,-24);c.lineTo(x+17,-43);c.lineTo(x+39,-24);c.fill();c.fillStyle='#211d18';c.fillRect(x+13,-11,10,15);}
 c.fillStyle='#c0b28d';c.font='12px sans-serif';c.textAlign='center';c.fillText(def.name,0,-54);c.restore();return true;
}
