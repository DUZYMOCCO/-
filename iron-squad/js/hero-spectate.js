// v7.0.28: 勇者観戦モード。隊長は「観測者」として魔王城へ入り、勇者パーティを本編と同じ描画で見守る。
// 観測者の隊長は不可視・無敵・敵の標的外・操作無効。野外の敵と隊員は凍結（既存のダンジョン入退場の仕組みを再利用）。
// 観戦状態（game.spectating）は保存しない：保存データは入場前の野外位置を持つので、読み込み直しても隊長は魔王城に居座らない。
import {heroPartyActive} from './hero-rules.js?v=302';
import {DUNGEON_DEFS} from './dungeon.js?v=304';
import {formatCompact} from './number-format.js?v=282';

export const CASTLE_ID='dungeon_demon_castle';
export const SPECTATE_RULES=Object.freeze({hudSeconds:.25,logLines:3,cameraEase:.12});
const ready=u=>!!u&&!u.dead&&!u.isDown&&u.hp>0;
const living=u=>!!u&&!u.dead;
export const castleOf=game=>game.dungeons?.find(d=>d.id===CASTLE_ID)||DUNGEON_DEFS.find(d=>d.id===CASTLE_ID);
export const isSpectating=game=>!!game?.spectating;
const raidActive=game=>!!game.baseRaidActive||!!(game.invasions?.stage&&game.invasions.stage!=='idle');
const kingOf=game=>(game.heroJourney?.castleScene?.monsters||game.monsters||[]).find(m=>m.isDemonKing&&m.hp>0)||null;

/** Whether a spectate may start right now, and if not, why (shown next to the button). */
export function spectateAvailability(game) {
  if(game.spectating)return {ok:false,code:'active',reason:'観戦中です'};
  const j=game.heroJourney,p=j?.party;
  if(!p||!heroPartyActive(p)||j.demonKingDefeat)return {ok:false,code:'no-party',reason:'観戦できる勇者パーティがいません'};
  if(p.space!==CASTLE_ID)return {ok:false,code:'not-castle',reason:'魔王城で戦っているときだけ観戦できます'};
  if(p.status!=='castle'||!p.members.some(ready))return {ok:false,code:'not-fighting',reason:'勇者パーティが戦える状態のときだけ観戦できます'};
  if(game.currentDungeon)return {ok:false,code:'inside',reason:'建物や洞窟の中では観戦できません'};
  if(game.restTimer>0)return {ok:false,code:'rest',reason:'待機中は観戦できません'};
  if(raidActive(game))return {ok:false,code:'raid',reason:'襲撃中は観戦できません'};
  const me=game.player;
  if(!me||me.dead||me.isDown||me.hp<=0)return {ok:false,code:'down',reason:'隊長がダウンしているため観戦できません'};
  if(game.inBattle===false)return {ok:false,code:'idle',reason:'戦闘中のみ観戦できます'};
  return {ok:true,code:'ok',reason:'魔王城の勇者パーティを、隊長は姿を消して見守ります（操作・手助けはできません）'};
}

/** Follow targets: living party members (hero first) and, while he stands, the demon king. */
export function spectateTargets(game) {
  const p=game.heroJourney?.party;if(!p)return [];
  const list=p.members.filter(living).map(unit=>({id:unit.id,unit,kind:'member'}));
  const king=kingOf(game);if(king)list.push({id:'__king',unit:king,kind:'king'});
  return list;
}
const targetOk=t=>!!t&&(t.kind==='king'?t.unit.hp>0:ready(t.unit));

/** Pick the unit the camera follows. A target that falls (down/dead) hands over to the next healthy member. */
export function resolveSpectateViewer(game) {
  const s=game.spectating;if(!s)return null;
  const list=spectateTargets(game);if(!list.length){s.viewer=null;return null;}
  let index=list.findIndex(t=>t.id===s.targetId),cur=list[index];
  if(cur&&targetOk(cur)){s.targetOk=true;s.viewer=cur.unit;return cur.unit;}
  if(!cur||s.targetOk){ // just fell (or vanished): next healthy member after it, then anyone alive
    const start=index<0?-1:index,order=[...list.slice(start+1),...list.slice(0,Math.max(0,start+1))];
    const next=order.find(t=>t.kind==='member'&&ready(t.unit))||order.find(targetOk)||order[0];
    s.targetId=next.id;s.targetOk=targetOk(next);s.viewer=next.unit;return next.unit;
  }
  s.viewer=cur.unit;return cur.unit; // the player chose someone who is down: stay on them
}

/** Switch the followed target (dir=+1 next, -1 previous) or jump to a specific id. */
export function selectSpectateTarget(game,which=1) {
  const s=game.spectating;if(!s)return null;
  const list=spectateTargets(game);if(!list.length)return null;
  let t;
  if(typeof which==='string')t=list.find(x=>x.id===which);
  else{const index=Math.max(0,list.findIndex(x=>x.id===s.targetId));t=list[(index+which+list.length*4)%list.length];}
  if(!t)return null;
  s.targetId=t.id;s.targetOk=targetOk(t);s.viewer=t.unit;updateSpectateHud(game,true);return t.unit;
}

const bandOf=u=>u.isDown?'ダウン':(u.hp??u.maxHp)>=u.maxHp*.6?'健在':(u.hp??u.maxHp)>=u.maxHp*.25?'負傷':'瀕死';
/** Corner summary (pure): party HP bands, enemies left in the castle, king HP, the last few diary lines. */
export function spectateSummary(game) {
  const p=game.heroJourney?.party,members=p?.members||[],alive=members.filter(living);
  const counts=new Map();for(const u of alive)counts.set(bandOf(u),(counts.get(bandOf(u))||0)+1);
  const bands=['健在','負傷','瀕死','ダウン'].filter(b=>counts.has(b)).map(b=>`${b}${counts.get(b)}`).join('・');
  const monsters=game.heroJourney?.castleScene?.monsters||game.monsters||[],king=monsters.find(m=>m.isDemonKing);
  const mobs=monsters.filter(m=>!m.isDemonKing&&m.hp>0).length;
  const kingPct=king&&king.maxHp>0?Math.max(0,king.hp/king.maxHp*100):null;
  const events=p?.journal?.events||[];
  const log=events.filter(e=>e.type!=='departure').slice(-SPECTATE_RULES.logLines).map(e=>`第${e.phase}期 ${e.text}`);
  return {alive:alive.length,total:members.length,bands,mobs,kingPct,kingHp:king?.hp??null,kingMax:king?.maxHp??null,log,
    partyText:`生存${alive.length}/${members.length}${bands?`（${bands}）`:''}`,
    castleText:`城内の敵 残り${mobs}体 · ${kingPct==null?'魔王は不在':`魔王HP ${kingPct>=10?kingPct.toFixed(1):kingPct.toFixed(2)}%`}`};
}

function endReason(game) {
  const j=game.heroJourney,p=j?.party,me=game.player;
  if(j?.demonKingDefeat||p?.status==='victorious')return '魔王が討たれたので、観戦を終えて戻った。';
  if(!p||p.status==='withdrawn')return '勇者パーティが魔王城から撤退したので、観戦を終えて戻った。';
  if(p.status==='fallen'||!p.members.some(living))return '勇者パーティが全滅したので、観戦を終えて戻った。';
  if(p.space!==CASTLE_ID)return '勇者パーティが魔王城を離れたので、観戦を終えて戻った。';
  if(raidActive(game))return '襲撃が始まったので、観戦を終えて戻った。';
  if(!me||me.dead||me.isDown||me.hp<=0||game._saveFallen)return '隊長に異変があったので、観戦を終えて戻った。';
  return null;
}

/** Begin spectating. The commander walks into the castle as an invisible, invulnerable observer. */
export function startSpectate(game,classes=null) {
  const a=spectateAvailability(game);
  if(!a.ok){game.showToast?.(`観戦できません：${a.reason}`);return false;}
  const p=game.heroJourney.party,first=p.members.find(m=>m.isChosenHero&&ready(m))||p.members.find(ready);
  game.heroFollowing=false;delete game._heroFollowPath;
  if(game.joystick){game.joystick.active=false;game.joystick.dirX=game.joystick.dirY=0;}
  game.spectating={targetId:first.id,targetOk:true,viewer:first,classes,hudClock:0,endRequested:false,pendingReason:null,startedPhase:game.phase};
  game.enterDungeon(castleOf(game));
  if(game.currentDungeon?.id!==CASTLE_ID){game.spectating=null;return false;}
  const viewer=resolveSpectateViewer(game);if(viewer&&game.camera){game.camera.x=viewer.x;game.camera.y=viewer.y;}
  mountSpectateHud(game);
  game.showToast?.('👁 観戦を始めた。隊長は姿を消して見守る（操作・手助けはできない）');
  return true;
}

/** Leave the castle and clear the observer state. Waits out the 8-second rest between phases. */
export function endSpectate(game,message='観戦を終えて戻った。') {
  const s=game.spectating;if(!s)return false;
  if(game.restTimer>0){s.endRequested=true;s.pendingReason=message;updateSpectateHud(game,true);return false;}
  if(game.currentDungeon?.id===CASTLE_ID)game.exitDungeon(); // still flagged as spectating here, so the guards are not pulled out of the field
  clearSpectate(game);
  if(message)game.showToast?.(message);
  return true;
}

/** Drop the flag and the DOM (no castle exit). Used after the commander has already left, and when a game is loaded. */
export function clearSpectate(game) {
  if(!game)return;
  game.spectating=null;
  game.container?.classList?.remove('is-spectating');
  game.container?.querySelector?.('#hero-spectate')?.remove();
}

/** Per-frame: end conditions, camera target, HUD refresh. */
export function updateSpectate(game,dt) {
  const s=game.spectating;if(!s)return;
  if(game.currentDungeon?.id!==CASTLE_ID){clearSpectate(game);return;} // the commander left by some other route
  const reason=s.endRequested?s.pendingReason:endReason(game);
  if(reason){if(game.restTimer>0){s.endRequested=true;s.pendingReason=reason;}else{endSpectate(game,reason);return;}}
  resolveSpectateViewer(game);
  s.hudClock=(s.hudClock||0)-dt;if(s.hudClock<=0){s.hudClock=SPECTATE_RULES.hudSeconds;updateSpectateHud(game);}
}

/** The unit the camera should centre on while spectating, or null for the normal commander camera. */
export const spectateCameraTarget=game=>game?.spectating?.viewer||null;

// ---------------- DOM (corner HUD) ----------------
function mountSpectateHud(game) {
  const container=game.container;if(!container||typeof container.querySelector!=='function'||typeof document==='undefined'||!document.createElement)return null;
  container.querySelector('#hero-spectate')?.remove();
  const host=container.querySelector('#canvas-container')||container,box=document.createElement('div');
  box.id='hero-spectate';box.className='hero-spectate';box.setAttribute('role','region');box.setAttribute('aria-label','勇者の観戦');
  const head=document.createElement('div');head.className='spectate-head';
  const badge=document.createElement('span');badge.className='spectate-badge';badge.textContent='👁 観戦中';
  const end=document.createElement('button');end.type='button';end.className='spectate-end';end.textContent='観戦を終了';
  end.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();endSpectate(game,'観戦を終えて戻った。');});
  head.append(badge,end);
  const who=document.createElement('div');who.className='spectate-who';
  const name=document.createElement('span');name.className='spectate-name';
  const bar=document.createElement('div');bar.className='spectate-hpbar';const fill=document.createElement('i');bar.append(fill);
  const hp=document.createElement('span');hp.className='spectate-hp';
  const prev=document.createElement('button');prev.type='button';prev.className='spectate-prev';prev.textContent='◀';prev.setAttribute('aria-label','前の隊員');
  const next=document.createElement('button');next.type='button';next.className='spectate-next';next.textContent='▶';next.setAttribute('aria-label','次の隊員');
  prev.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectSpectateTarget(game,-1);});
  next.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectSpectateTarget(game,1);});
  who.append(prev,name,next,bar,hp);
  const chips=document.createElement('div');chips.className='spectate-chips';
  const party=document.createElement('p');party.className='spectate-party';
  const castle=document.createElement('p');castle.className='spectate-castle';
  const log=document.createElement('ul');log.className='spectate-log';
  box.append(head,who,chips,party,castle,log);
  // taps inside the panel never reach the game underneath
  for(const type of ['pointerdown','touchstart','mousedown'])box.addEventListener(type,e=>e.stopPropagation());
  host.append(box);container.classList?.add('is-spectating');
  updateSpectateHud(game,true);
  return box;
}

const label=(game,u)=>u.isChosenHero?'勇者':(game.spectating?.classes?.[u.soldierClass]?.name||u.soldierClass||'隊員');
export function updateSpectateHud(game,force=false) {
  const s=game.spectating,box=game.container?.querySelector?.('#hero-spectate');if(!s||!box)return;
  const list=spectateTargets(game),sum=spectateSummary(game),viewer=s.viewer;
  box.querySelector('.spectate-badge').textContent=s.endRequested?'👁 観戦中（待機が終わると戻ります）':'👁 観戦中';
  const king=viewer?.isDemonKing;
  box.querySelector('.spectate-name').textContent=viewer?(king?`魔王 ${viewer.name||''}`.trim():`${label(game,viewer)} ${viewer.name||''} · Lv.${viewer.level||1}${viewer.dead?' · 戦死':viewer.isDown?' · ダウン':''}`):'—';
  const ratio=viewer&&viewer.maxHp>0?Math.max(0,Math.min(1,(viewer.hp||0)/viewer.maxHp)):0;
  box.querySelector('.spectate-hpbar i').style.width=`${Math.round(ratio*100)}%`;
  box.querySelector('.spectate-hp').textContent=viewer?`HP ${formatCompact(Math.max(0,Math.round(viewer.hp||0)))} / ${formatCompact(Math.round(viewer.maxHp||0))}`:'';
  const chips=box.querySelector('.spectate-chips'),struct=list.map(t=>t.id).join('|');
  if(force||chips.dataset.struct!==struct){
    chips.dataset.struct=struct;chips.replaceChildren(...list.map(t=>{
      const b=document.createElement('button');b.type='button';b.className='spectate-chip';b.dataset.target=t.id;
      const n=document.createElement('span');n.textContent=t.kind==='king'?'魔王':(t.unit.isChosenHero?'勇者':String(t.unit.name||'').split(/[・\s]/)[0]);
      const bar=document.createElement('i');b.append(n,bar);
      b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectSpectateTarget(game,t.id);});return b;}));
  }
  list.forEach((t,i)=>{const b=chips.children[i];if(!b)return;
    const r=t.unit.maxHp>0?Math.max(0,Math.min(1,(t.unit.hp||0)/t.unit.maxHp)):0;
    b.classList.toggle('active',t.id===s.targetId);b.classList.toggle('down',!!t.unit.isDown);b.classList.toggle('low',r<.25&&!t.unit.isDown);
    b.querySelector('i').style.width=`${Math.round(r*100)}%`;b.setAttribute('aria-pressed',String(t.id===s.targetId));});
  box.querySelector('.spectate-party').textContent=sum.partyText;
  box.querySelector('.spectate-castle').textContent=sum.castleText;
  const ul=box.querySelector('.spectate-log'),key=sum.log.join('\n');
  if(ul.dataset.key!==key){ul.dataset.key=key;ul.replaceChildren(...sum.log.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));}
}
