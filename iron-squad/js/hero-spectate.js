// v7.0.28: 勇者観戦モード。隊長は「観測者」として魔王城へ入り、勇者パーティを本編と同じ描画で見守る。
// 観測者の隊長は不可視・無敵・敵の標的外・操作無効。野外の敵と隊員は凍結（既存のダンジョン入退場の仕組みを再利用）。
// 観戦状態（game.spectating）は保存しない：保存データは入場前の野外位置を持つので、読み込み直しても隊長は魔王城に居座らない。
import {heroPartyActive} from './hero-rules.js?v=302';
import {DUNGEON_DEFS} from './dungeon.js?v=306';
import {formatCompact} from './number-format.js?v=282';
import {WORLD_SIZE} from './world.js?v=289';
import {CAMP_PEACE_RADIUS} from './peace-zones.js?v=277';
import {formatDistance} from './distance-format.js';

// v7.0.31: 観戦待ち（キュー）／野外の道中から魔王城まで通しで観戦／観戦中だけの倍速（×1/×2/×4）。
// 野外観戦は本編ワールドのまま（隊長は本陣で不可視・無敵、隊員は凍結して描画しない）、カメラだけ勇者を追う。
// 勇者が魔王城に入ったら、既存の城観戦（隊長が観測者として入場）へ短いフェードでつなぐ。観戦フラグ・倍速・キューは保存しない。
export const CASTLE_ID='dungeon_demon_castle';
export const SPECTATE_RULES=Object.freeze({hudSeconds:.25,logLines:3,cameraEase:.12,speeds:Object.freeze([1,2,4]),slowFrameDt:.045,fadeMs:900,returnGrace:4});
const CAMP_CENTER=WORLD_SIZE/2;
const ready=u=>!!u&&!u.dead&&!u.isDown&&u.hp>0;
const living=u=>!!u&&!u.dead;
export const castleOf=game=>game.dungeons?.find(d=>d.id===CASTLE_ID)||DUNGEON_DEFS.find(d=>d.id===CASTLE_ID);
export const isSpectating=game=>!!game?.spectating;
/** Spectating the march in the open field (the world is the ordinary field; only the camera follows the hero). */
export const fieldSpectating=game=>game?.spectating?.field===true;
/** The commander stands inside the camp's peace bubble: the only place the field spectate may start from (so a parked commander and guards are safe). */
export const commanderInCampPeace=game=>{const u=game?.player;return !!u&&Number.isFinite(u.x)&&Number.isFinite(u.y)&&Math.hypot(u.x-CAMP_CENTER,u.y-CAMP_CENTER)<CAMP_PEACE_RADIUS;};
const raidActive=game=>!!game.baseRaidActive||!!(game.invasions?.stage&&game.invasions.stage!=='idle');
const kingOf=game=>game.spectating?.field?null:(game.heroJourney?.castleScene?.monsters||game.monsters||[]).find(m=>m.isDemonKing&&m.hp>0)||null;

/**
 * Whether a spectate may start right now. `ok` = start now (kind 'castle' or 'field').
 * Everything else is a reason to wait (the queue keeps waiting), except 'no-party' which can never start (the queue is cancelled).
 * The one-line `reason` always says what the situation is and what has to happen next.
 */
export function spectateAvailability(game) {
  if(game.spectating)return {ok:false,code:'active',kind:null,short:'観戦中',reason:'観戦中です'};
  const j=game.heroJourney,p=j?.party;
  if(!p||!heroPartyActive(p)||j.demonKingDefeat)return {ok:false,code:'no-party',kind:null,short:'勇者なし',reason:'観戦できる勇者パーティがいません'};
  const kind=p.space===CASTLE_ID?'castle':p.space==='field'?'field':null;
  if(!kind)return {ok:false,code:'not-castle',kind:null,short:'勇者の位置確認中',reason:'勇者パーティの居場所を確認中です。分かり次第、観戦を始められます'};
  if(!p.members.some(ready)||(kind==='castle'?p.status!=='castle':p.status==='down'))return {ok:false,code:'not-fighting',kind,short:'勇者が戦えるまで',reason:'勇者パーティが戦える状態になると観戦を始められます'};
  if(game.currentDungeon)return {ok:false,code:'inside',kind,short:'隊長が建物・洞窟内',reason:'建物や洞窟の中にいます。外に出ると観戦を始められます'};
  if(game.restTimer>0)return {ok:false,code:'rest',kind,short:'待機中',reason:'待機中です。待機が終わると観戦を始められます'};
  if(raidActive(game))return {ok:false,code:'raid',kind,short:game.baseRaidActive?'強襲中':'侵攻中',reason:'襲撃中です。収まると観戦を始められます'};
  const me=game.player;
  if(!me||me.dead||me.isDown||me.hp<=0)return {ok:false,code:'down',kind,short:'隊長がダウン中',reason:'隊長がダウンしています。立ち上がると観戦を始められます'};
  return {ok:true,code:'ok',kind,short:'開始中',reason:kind==='field'?'勇者の進軍を最初から見守ります。隊長と隊員はその場で姿を消します（操作・手助けはできません）':'魔王城の勇者パーティを、隊長は姿を消して見守ります（操作・手助けはできません）'};
}
/** One status line for the hero record screen: the current situation, and what happens next. */
export function spectateStatusLine(game) {
  if(game.spectating)return game.spectating.field?'観戦中です（勇者の進軍を追っています）。画面下の「観戦を終了」でも戻れます。':'観戦中です。画面下の「観戦を終了」でも戻れます。';
  const a=spectateAvailability(game);
  if(game.spectateQueued)return `観戦待ち：${a.ok?'まもなく始まります':a.reason.replace('観戦を始められます','観戦が始まります')}`;
  return a.ok?a.reason:`観戦：${a.reason}`;
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
  const marching=p?.space==='field',gate=castleOf(game)?.entrance;
  const castleText=marching&&gate?`野外を進軍中 · 魔王城まで約${formatDistance(Math.hypot(p.x-gate.x,p.y-gate.y))}`
    :game.spectating?.field&&p?.space===CASTLE_ID?'勇者が魔王城へ突入した。待機が終わると観戦を続けます'
    :`城内の敵 残り${mobs}体 · ${kingPct==null?'魔王は不在':`魔王HP ${kingPct>=10?kingPct.toFixed(1):kingPct.toFixed(2)}%`}`;
  return {alive:alive.length,total:members.length,bands,mobs,kingPct,kingHp:king?.hp??null,kingMax:king?.maxHp??null,log,
    partyText:`生存${alive.length}/${members.length}${bands?`（${bands}）`:''}`,castleText};
}

function endReason(game) {
  const j=game.heroJourney,p=j?.party,me=game.player;
  if(j?.demonKingDefeat||p?.status==='victorious')return '魔王が討たれたので、観戦を終えて戻った。';
  if(!p||p.status==='withdrawn')return '勇者パーティが魔王城から撤退したので、観戦を終えて戻った。';
  if(p.status==='fallen'||!p.members.some(living))return '勇者パーティが全滅したので、観戦を終えて戻った。';
  if(game.spectating?.field){if(p.space!=='field'&&p.space!==CASTLE_ID)return '勇者パーティの行方が分からなくなったので、観戦を終えて戻った。';}
  else if(p.space!==CASTLE_ID)return '勇者パーティが魔王城を離れたので、観戦を終えて戻った。';
  if(raidActive(game))return '襲撃が始まったので、観戦を終えて戻った。';
  if(!me||me.dead||me.isDown||me.hp<=0||game._saveFallen)return '隊長に異変があったので、観戦を終えて戻った。';
  return null;
}

/** Begin spectating. The commander walks into the castle as an invisible, invulnerable observer. */
export function startSpectate(game,classes=null) {
  const a=spectateAvailability(game);
  if(!a.ok){game.showToast?.(`観戦できません：${a.reason}`,{field:true});return false;}
  const p=game.heroJourney.party,first=p.members.find(m=>m.isChosenHero&&ready(m))||p.members.find(ready);
  dropQueue(game); // pressing the button (or the queue firing) replaces the waiting state
  game.heroFollowing=false;delete game._heroFollowPath;
  playSpectateFade(game); // v7.0.32: no countdown any more — a short black fade covers the start
  if(game.joystick){game.joystick.active=false;game.joystick.dirX=game.joystick.dirY=0;}
  game.spectating={targetId:first.id,targetOk:true,viewer:first,classes,hudClock:0,endRequested:false,pendingReason:null,startedPhase:game.phase,field:a.kind==='field',speed:1};
  if(a.kind==='field'){ // the ordinary field world: the commander stays parked in camp, only the camera leaves
    const viewer=resolveSpectateViewer(game);if(viewer&&game.camera){game.camera.x=viewer.x;game.camera.y=viewer.y;}
    game._sceneDirty=true;
    mountSpectateHud(game);
    game.showToast?.('👁 観戦を始めた。勇者の進軍を最初から見守る（隊長と隊員はその場で姿を消している）',{field:true});
    return true;
  }
  game.enterDungeon(castleOf(game));
  if(game.currentDungeon?.id!==CASTLE_ID){game.spectating=null;return false;}
  const viewer=resolveSpectateViewer(game);if(viewer&&game.camera){game.camera.x=viewer.x;game.camera.y=viewer.y;}
  mountSpectateHud(game);
  game.showToast?.('👁 観戦を始めた。隊長は姿を消して見守る（操作・手助けはできない）',{field:true});
  return true;
}

/** The hero party reached the castle while we watch the march: hand over to the castle spectate (commander walks in as the observer). */
function enterCastleFromField(game) {
  const s=game.spectating;
  s.field=false;delete s.hold;
  game.enterDungeon(castleOf(game));
  if(game.currentDungeon?.id!==CASTLE_ID){clearSpectate(game);game.showToast?.('魔王城へ入れなかったので、観戦を終えて戻った。',{field:true});return false;}
  playSpectateFade(game);
  const viewer=resolveSpectateViewer(game);if(viewer&&game.camera){game.camera.x=viewer.x;game.camera.y=viewer.y;}
  updateSpectateHud(game,true);
  game.showToast?.('👁 勇者が魔王城へ突入した。観戦を続ける',{field:true});
  return true;
}

/** Leave the castle and clear the observer state. Waits out the 8-second rest between phases. */
export function endSpectate(game,message='観戦を終えて戻った。') {
  const s=game.spectating;if(!s)return false;
  if(s.field){clearSpectate(game);if(message)game.showToast?.(message,{field:true});return true;} // nothing to leave: the field world never changed
  if(game.restTimer>0){s.endRequested=true;s.pendingReason=message;s.speed=1;updateSpectateHud(game,true);return false;}
  if(game.currentDungeon?.id===CASTLE_ID)game.exitDungeon(); // still flagged as spectating here, so the guards are not pulled out of the field
  clearSpectate(game);
  if(message)game.showToast?.(message,{field:true});
  return true;
}

/** Drop the flag and the DOM (no castle exit). Used after the commander has already left, and when a game is loaded. */
export function clearSpectate(game) {
  if(!game)return;
  const was=game.spectating;
  game.spectating=null;dropQueue(game);
  if(was){game._spectateGrace=SPECTATE_RULES.returnGrace;if(game.player)game.player.invulnerableTimer=Math.max(game.player.invulnerableTimer||0,SPECTATE_RULES.returnGrace);} // v7.0.32: the squad was parked (and the commander watching): a few safe seconds after coming back
  // the speed lives on the spectate state, so it is gone too
  if(was?.field&&game.player&&game.camera){game.camera.x=game.player.x;game.camera.y=game.player.y;game._sceneDirty=true;} // back to the parked commander
  game.container?.classList?.remove('is-spectating');
  game.container?.querySelector?.('#hero-spectate')?.remove();
}

/** Per-frame: end conditions, camera target, HUD refresh. */
export function updateSpectate(game,dt) {
  const s=game.spectating;if(!s)return;
  if(s.field){
    if(game.currentDungeon){clearSpectate(game);return;} // the commander went somewhere by another route
    const reason=endReason(game);
    if(reason){endSpectate(game,reason);return;}
    const resting=game.restTimer>0; // v7.0.33: the speed survives the rest
    if(game.heroJourney.party.space===CASTLE_ID&&!resting){if(!enterCastleFromField(game))return;}
    if(s.field&&game.heroJourney.party.space==='field')resolveSpectateViewer(game); // while the party is already in the castle but we wait out the rest, the camera holds
  }else{
    if(game.currentDungeon?.id!==CASTLE_ID){clearSpectate(game);return;} // the commander left by some other route
    const reason=s.endRequested?s.pendingReason:endReason(game);
    if(reason){if(game.restTimer>0){s.endRequested=true;s.pendingReason=reason;}else{endSpectate(game,reason);return;}}
    if(s.endRequested&&s.speed!==1)s.speed=1;
    resolveSpectateViewer(game);
  }
  s.hudClock=(s.hudClock||0)-dt;if(s.hudClock<=0){s.hudClock=SPECTATE_RULES.hudSeconds;updateSpectateHud(game);}
}

/** The unit the camera should centre on while spectating, or null for the normal commander camera. */
export function spectateCameraTarget(game) {
  const s=game?.spectating;if(!s)return null;
  if(s.field&&game.heroJourney?.party?.space!=='field')return s.hold||(s.hold={x:game.camera?.x??0,y:game.camera?.y??0}); // the party went in while we wait: keep the last view
  return s.viewer||null;
}

// ---------------- speed (spectate only, whole-world time) ----------------
/** Effective time multiplier now: ×1 unless spectating at ×2/×4; always ×1 during an end request or when not spectating. v7.0.33: the rest between phases keeps the chosen speed. */
export function spectateSpeed(game) {
  const s=game?.spectating;if(!s||s.endRequested)return 1;
  return SPECTATE_RULES.speeds.includes(s.speed)?s.speed:1;
}
/** How many ordinary update steps one frame should run (each keeps the normal dt, so nothing tunnels). A slow frame is capped at ×2. */
export function spectateSteps(game,dt) {
  const speed=spectateSpeed(game);
  return dt>SPECTATE_RULES.slowFrameDt?Math.min(speed,2):speed;
}
/** Button: ×1 → ×2 → ×4 → ×1. */
export function cycleSpectateSpeed(game) {
  const s=game?.spectating;if(!s)return 1;
  const list=SPECTATE_RULES.speeds;s.speed=list[(Math.max(0,list.indexOf(s.speed))+1)%list.length];
  updateSpectateHud(game,true);return s.speed;
}

// ---------------- queue ("観戦待ち": starts by itself once the conditions are met) ----------------
function dropQueue(game) {
  if(!game)return;
  game.spectateQueued=null;
  game.container?.querySelector?.('#hero-spectate-queue')?.remove();
}
const queueEndReason=game=>{
  const j=game.heroJourney,p=j?.party;
  if(j?.demonKingDefeat||p?.status==='victorious')return '魔王が討たれたので、観戦待ちを取り消した。';
  if(!p||p.status==='withdrawn')return '勇者パーティが撤退したので、観戦待ちを取り消した。';
  return '勇者パーティが全滅したので、観戦待ちを取り消した。';
};
/** Start waiting: nothing is entered now; updateSpectateQueue starts the spectate when it can. */
export function queueSpectate(game,classes=null) {
  if(game.spectating||game.spectateQueued)return false;
  if(spectateAvailability(game).code==='no-party'){game.showToast?.('観戦できる勇者パーティがいません',{field:true});return false;}
  game.spectateQueued={classes};
  mountQueueChip(game);
  game.showToast?.(`👁 観戦待ちにした（${spectateAvailability(game).short}）。条件が整うと自動で始まる（画面端のチップで取消）`,{field:true});
  return true;
}
export function cancelSpectateQueue(game,message=null) {
  if(!game?.spectateQueued)return false;
  dropQueue(game);if(message)game.showToast?.(message,{field:true});return true;
}
/** Per-frame (v7.0.32, no countdown): cancel only when the party is gone; keep waiting while anything blocks (the queue is never dropped for a blocker); start at once (black fade) as soon as nothing blocks. */
export function updateSpectateQueue(game,dt) {
  const q=game.spectateQueued;if(!q)return;
  if(game.spectating){dropQueue(game);return;}
  const a=spectateAvailability(game);
  if(a.code==='no-party'){cancelSpectateQueue(game,queueEndReason(game));return;}
  if(!a.ok){refreshQueueChip(game);return;}
  if(!startSpectate(game,q.classes))dropQueue(game);
}
function mountQueueChip(game) {
  const container=game.container;if(!container||typeof container.querySelector!=='function'||typeof document==='undefined'||!document.createElement)return null;
  container.querySelector('#hero-spectate-queue')?.remove();
  const host=container.querySelector('#canvas-container')||container,chip=document.createElement('button');
  chip.id='hero-spectate-queue';chip.type='button';chip.className='hero-spectate-queue';
  chip.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cancelSpectateQueue(game,'観戦待ちを取り消した。');});
  for(const type of ['pointerdown','touchstart','mousedown'])chip.addEventListener(type,e=>e.stopPropagation());
  host.append(chip);refreshQueueChip(game);return chip;
}
function refreshQueueChip(game) {
  const q=game.spectateQueued,chip=game.container?.querySelector?.('#hero-spectate-queue');if(!q||!chip)return;
  const a=spectateAvailability(game),text=`👁観戦待ち：${a.short||'準備中'} ✕`; // the reason is always visible as text (not only in the title)
  if(chip.textContent!==text)chip.textContent=text;
  chip.dataset.state=a.ok?'starting':'waiting';chip.dataset.code=a.code;chip.title=spectateStatusLine(game);
}

/** A short black fade-in that hides the swap from the field world to the castle. */
function playSpectateFade(game) {
  const container=game.container;if(!container||typeof container.querySelector!=='function'||typeof document==='undefined'||!document.createElement)return;
  const host=container.querySelector('#canvas-container')||container,el=document.createElement('div');
  el.className='spectate-fade';host.append(el);
  const timer=setTimeout(()=>el.remove(),SPECTATE_RULES.fadeMs+100);timer?.unref?.();
}

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
  const speed=document.createElement('button');speed.type='button';speed.className='spectate-speed';speed.textContent='⏩ ×1';speed.setAttribute('aria-label','観戦中の倍速切替');
  speed.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();cycleSpectateSpeed(game);});
  const tools=document.createElement('span');tools.className='spectate-tools';tools.append(speed,end);
  head.append(badge,tools);
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
  const speedBtn=box.querySelector('.spectate-speed');if(speedBtn){const sp=spectateSpeed(game),text=`⏩ ×${sp}`;if(speedBtn.textContent!==text)speedBtn.textContent=text;speedBtn.classList.toggle('fast',sp>1);speedBtn.title='観戦中だけの倍速（期の進行・収支も速くなります。待機中も維持）';}
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
