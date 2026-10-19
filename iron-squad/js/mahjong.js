// v7.1.0: Mahjong at the casino (UI + game methods). Rules live in mahjong-rules.js, the CPUs in mahjong-ai.js.
// Tile faces are drawn by CSS from data-* attributes, never as text nodes, so the kana mode (which rewrites text and aria-label/title) leaves them alone.
// Everything the player reads goes through gameText piece by piece; tile markup never does (it would turn 東 into とう).
import {MAHJONG_MODES,MAHJONG_LEVELS,MAHJONG_PAYOUT,newMahjong,mahjongStep,humanDiscard,humanTsumo,humanRon,humanPass,nextHand,abandonMahjong,tsumoInfo,riichiOptions,discardWaits,currentWaits,liveWallLeft,handsTotal,tileFace,countsOf,mahjongPayout} from './mahjong-rules.js?v=318';
import {mahjongAi} from './mahjong-ai.js?v=318';
import {MAX_MAHJONG_PAYOUT} from './casino-rules.js?v=318';
import {gameText} from './game-text.js?v=318';
import {sound} from '../../common/js/audio.js?v=151';
let host=null;
/** casino.js hands over its session helpers (state, refresh, money, ...) so this module does not import it back. */
export const setMahjongHost=h=>{host=h;};
const T=gameText;
const SEAT_NAMES=['あなた','右','正面','左'];
const HONOR_KANA=['とん','なん','しゃー','ぺー','はく','はつ','ちゅん'];
export const tileLabel=t=>t<27?`${t%9+1}${['まん','ぴん','そう'][Math.floor(t/9)]}`:HONOR_KANA[t-27];
const sessionOf=game=>{const s=host.state(game);return s.mj||(s.mj={sel:-1,riichi:false,timer:0,msg:null,last:null,confirm:false,mode:'full',level:'novice'});};
export const mahjongOf=game=>game.nation?.casino?.mahjong||null;
export const mahjongInProgress=game=>{const st=mahjongOf(game);return !!st&&!st.over;};
const ownDraw=st=>st.h.turn===0&&st.stage==='act';
const needsAuto=st=>!!st&&!st.over&&st.stage==='act'&&(st.h.turn!==0||(st.h.riichi[0]&&!tsumoInfo(st,0)));
export const tileHtml=(t,cls='',attrs='')=>{const f=tileFace(t);return `<span class="mj-tile mj-${f.suit} ${cls}" data-n="${f.n}" data-s="${f.s}" role="img" aria-label="${tileLabel(t)}" ${attrs}></span>`;};
const tileButton=(t,i,cls,disabled)=>{const f=tileFace(t);return `<button type="button" class="mj-tile mj-${f.suit} ${cls}" data-mj-tile="${i}" data-n="${f.n}" data-s="${f.s}" aria-label="${tileLabel(t)}" ${disabled?'disabled':''}></button>`;};
const pts=n=>Number(n).toLocaleString();
const signedPts=n=>`${n>0?'+':''}${pts(n)}`;
const mult=x=>`×${x}`;
const modeLabel=st=>st.mode==='full'?T(`東風戦 ${st.hand+1}/${handsTotal(st)}局`):T('1局戦');
function seatTag(st,seat){return seat===st.h.dealer?'<em class="mj-tag">'+T('親')+'</em>':'';}
function riverHtml(st,seat,m){
  const r=st.h.rivers[seat];
  return `<div class="mj-river" aria-label="${T('捨て牌')}">${r.map((t,i)=>tileHtml(t,'mj-sm'+(m.last&&m.last.seat===seat&&i===r.length-1?' is-last':''))).join('')}</div>`;
}
function playerBox(st,seat,m,cls=''){
  const h=st.h;
  return `<section class="mj-seat ${cls} ${h.turn===seat&&st.stage==='act'?'is-turn':''}"><header><b>${T(SEAT_NAMES[seat])}</b>${seatTag(st,seat)}${h.riichi[seat]?'<i class="mj-riichi">'+T('立直')+'</i>':''}<span class="mj-pts">${pts(st.points[seat])}</span></header>${riverHtml(st,seat,m)}</section>`;
}
function waitsInfo(st,m){
  const h=st.h;if(st.over||!['act','ron'].includes(st.stage))return {waits:[],text:'',furiten:false};
  let waits,label='',sel=null;
  if(st.stage==='act'&&h.turn===0&&m.sel>=0){sel=m.sel===13?h.drawn:h.hands[0][m.sel];if(sel!=null&&sel>=0){waits=discardWaits(st,0,sel);label=T('これを捨てると');}}
  if(!waits){waits=currentWaits(st,0);label=T('いま');}
  if(!waits.length)return {waits:[],text:'',furiten:false};
  const seen=countsOf([...h.hands[0],...(h.drawn>=0?[h.drawn]:[]),...h.rivers.flat(),h.doraInd]);
  const furiten=h.furitenTemp[0]||h.furitenPerm[0]||waits.some(w=>h.rivers[0].includes(w)||(sel!=null&&w===sel));
  return {waits,label,furiten,seen};
}
function waitHtml(st,m){
  const w=waitsInfo(st,m);if(!w.waits.length)return `<div class="mj-wait is-empty" aria-live="polite"><span>${T('聴牌すると、待ち牌がここに出ます。')}</span></div>`;
  return `<div class="mj-wait" aria-live="polite"><span>${w.label}${T('待ち')}</span>${w.waits.map(t=>`<span class="mj-wait-tile">${tileHtml(t,'mj-sm')}<small>${Math.max(0,4-w.seen[t])}</small></span>`).join('')}${w.furiten?`<strong class="mj-furiten">${T('振聴')}</strong>`:''}</div>`;
}
function handHtml(st,m,busy){
  const h=st.h,mine=ownDraw(st)&&!busy&&!h.riichi[0],opts=m.riichi?riichiOptions(st,0):null;
  const tiles=h.hands[0].map((t,i)=>tileButton(t,i,`${m.sel===i?'is-selected':''} ${opts&&!opts.includes(t)?'is-dim':''}`,!mine||(opts&&!opts.includes(t))));
  const drawn=h.drawn>=0?tileButton(h.drawn,13,`mj-drawn ${m.sel===13?'is-selected':''} ${opts&&!opts.includes(h.drawn)?'is-dim':''}`,!(ownDraw(st)&&!busy)||(opts&&!opts.includes(h.drawn))):'';
  return `<div class="mj-hand" role="group" aria-label="${T('あなたの手牌')}">${tiles.join('')}${drawn}</div>`;
}
function resultHtml(st,game){
  const r=st.result,last=st.hand+1>=handsTotal(st);
  const delta=`<ul class="mj-deltas">${[0,1,2,3].map(s=>`<li class="${r.deltas[s]>0?'is-plus':r.deltas[s]<0?'is-minus':''}"><span>${T(SEAT_NAMES[s])}</span><b>${signedPts(r.deltas[s])}</b></li>`).join('')}</ul>`;
  let body;
  if(r.type==='draw')body=`<h4>${T('流局')}</h4><p>${T('聴牌')}: ${[0,1,2,3].filter(s=>r.tenpai[s]).map(s=>T(SEAT_NAMES[s])).join('・')||T('だれもいません')}</p>${r.hands.map((x,s)=>x?`<div class="mj-showhand"><b>${T(SEAT_NAMES[s])}</b>${x.map(t=>tileHtml(t,'mj-sm')).join('')}</div>`:'').join('')}`;
  else body=`<h4>${T(SEAT_NAMES[r.winner])}${T(r.type==='tsumo'?'のツモ和了！':`が${SEAT_NAMES[r.loser]}からロン！`)}</h4><div class="mj-showhand">${r.hand.map(t=>tileHtml(t,'mj-sm')).join('')}${tileHtml(r.tile,'mj-sm mj-win')}</div><ul class="mj-yaku">${r.yaku.map(y=>`<li><span>${T(y.name)}</span><b>${y.han}${T('翻')}</b></li>`).join('')}</ul><p class="mj-han"><b>${r.han}${T('翻')}</b>${r.pot?` ${T('供託')} +${pts(r.pot)}`:''}</p>`;
  return `<div class="mj-result" role="status">${body}${delta}<button type="button" class="casino-play" id="btn-mj-next">${T(last?'最終結果へ':'次の局へ')}</button></div>`;
}
function finalHtml(st,game){
  const order=[0,1,2,3].sort((a,b)=>st.ranks[a]-st.ranks[b]),rank=st.ranks[0],net=st.payout-st.bet,m=MAHJONG_PAYOUT[st.mode][st.level];
  return `<div class="mj-final" role="status"><h4>${st.abandoned?T('放棄しました（最下位・払い戻し0）'):T(`${rank}位でした`)}</h4><ol class="mj-ranks">${order.map(s=>`<li class="${s===0?'is-me':''}"><span>${st.ranks[s]}${T('位')}</span><b>${T(SEAT_NAMES[s])}</b><em>${pts(st.points[s])}</em></li>`).join('')}</ol><p class="casino-award"><strong>${T('受取')} ${host.money(st.payout)}</strong><span>${T('掛け金')} ${host.money(st.bet)} → ${T('収支')} ${host.signed(net)}${st.abandoned?'':` (${mult(m[rank-1])})`}</span></p><button type="button" class="casino-play" id="btn-mj-close">${T('とじて、新しい対局へ')}</button></div>`;
}
function playHtml(game,s,st){
  const m=sessionOf(game),h=st.h,busy=!!m.timer,mine=ownDraw(st)&&!busy,ron=st.stage==='ron'&&!!h.claim;
  const canTsumo=mine&&!!tsumoInfo(st,0),canRiichi=mine&&!h.riichi[0]&&riichiOptions(st,0).length>0;
  const sel=m.sel>=0&&mine&&!h.riichi[0];
  const status=st.over?'':ron?`${T('ロンできます！')} ${tileHtml(h.claim.tile,'mj-sm')}`:busy||!mine?(st.stage==='act'?`<span class="mj-think">${T(h.turn===0?'…':SEAT_NAMES[h.turn]+'の番です')}</span>`:''):h.riichi[0]?T('立直中：ツモ切りです'):m.riichi?T('立直する牌を選んでください'):sel?T('もういちどタップ、または「捨てる」'):T('捨てる牌を選んでください');
  const actions=st.over?'':st.stage==='result'?'':ron?`<div class="mj-actions"><button type="button" class="casino-play mj-hot" id="btn-mj-ron">${T('ロン')}</button><button type="button" id="btn-mj-pass">${T('見送り')}</button></div>`:
    `<div class="mj-actions">${canTsumo?`<button type="button" class="casino-play mj-hot" id="btn-mj-tsumo">${T('ツモ')}</button>`:''}${canRiichi?`<button type="button" id="btn-mj-riichi" aria-pressed="${m.riichi}" class="${m.riichi?'is-on':''}">${T('立直')}</button>`:''}<button type="button" id="btn-mj-discard" ${sel?'':'disabled'}>${T(m.riichi?'立直して捨てる':'捨てる')}</button><button type="button" id="btn-mj-tsumogiri" ${mine&&h.drawn>=0&&!h.riichi[0]?'':'disabled'}>${T('ツモ切り')}</button></div>`;
  const abandon=st.over?'':`<button type="button" class="mj-abandon ${m.confirm?'is-confirm':''}" id="btn-mj-abandon">${T(m.confirm?'本当に放棄する？（最下位・払い戻し0）':'放棄')}</button>`;
  return `<div class="mj" data-stage="${st.stage}"><div class="mj-head"><div><strong>${modeLabel(st)}</strong><span>${T('残り')} ${liveWallLeft(st)}${T('枚')}</span>${st.pot?`<span>${T('供託')} ${st.pot/1000}${T('本')}</span>`:''}<span>${T('掛け金')} ${host.money(st.bet)}</span></div><div class="mj-dora"><small>${T('ドラ表示')}</small>${tileHtml(h.doraInd,'mj-sm')}</div></div>
  <div class="mj-opps">${playerBox(st,3,m,'mj-left')}${playerBox(st,2,m,'mj-front')}${playerBox(st,1,m,'mj-right')}</div>
  ${playerBox(st,0,m,'mj-me')}
  ${st.stage==='result'?resultHtml(st,game):`${waitHtml(st,m)}${handHtml(st,m,busy)}<p class="mj-status" aria-live="polite">${status}</p>${m.msg?`<p class="mj-msg">${describe(m.msg)}</p>`:''}${actions}`}
  ${abandon}</div>`;
}
function setupHtml(game,s){
  const m=sessionOf(game),bet=host.wager(game,'mahjong'),table=MAHJONG_PAYOUT[m.mode][m.level],can=host.canPlay(game)&&game.gold>=bet;
  const choice=(attr,map,cur)=>Object.values(map).map(v=>`<button type="button" ${attr}="${v.key}" aria-pressed="${v.key===cur}" class="${v.key===cur?'is-on':''}">${T(v.name)}</button>`).join('');
  const minutes={full:'6〜8',short:'2〜3'}[m.mode];
  return `<div class="mj-setup"><p class="casino-help">${T('4人で打つ麻雀です。相手はCPU3人。鳴きなし（門前のみ）で、ツモ・ロン・立直・振聴があります。閉じても、つぎに開くと続きから打てます。')}</p>
  <h4>${T('対局')}</h4><div class="mj-choice">${choice('data-mj-mode',MAHJONG_MODES,m.mode)}</div><small>${T(`${m.mode==='full'?'東風戦は4局':'1局戦は1局だけ'}。時間の目安は${minutes}分。`)}</small>
  <h4>${T('相手')}</h4><div class="mj-choice">${choice('data-mj-level',MAHJONG_LEVELS,m.level)}</div>
  <details class="casino-paytable" open><summary>${T('着順の払い戻し')}</summary><dl>${table.map((x,i)=>`<div><dt>${i+1}${T('位')}</dt><dd>${mult(x)} · ${host.money(Math.round(bet*x))}</dd></div>`).join('')}</dl><p class="casino-help">${T('掛け金は参加費。始めるときに引かれ、終わると着順に応じて戻ります。「放棄」は最下位あつかいで、戻りは0です。同点は座順で決まります。')}</p></details>
  <button type="button" class="casino-play" id="btn-mj-start" ${can?'':'disabled'}>${T('対局をはじめる')} · ${host.money(bet)}</button>${can||game.gold>=bet?'':`<small>${T('所持金が足りません。')}</small>`}</div>`;
}
/** The whole mahjong page (below the casino nav). Setup when no game exists, the table while one is in progress, the final result after it ended. */
export function mahjongHtml(game,s) {
  const st=mahjongOf(game);
  if(!st)return setupHtml(game,s);
  return st.over?`<div class="mj" data-stage="over"><div class="mj-head"><div><strong>${modeLabel(st)}</strong></div></div>${finalHtml(st,game)}</div>`:playHtml(game,s,st);
}
export function bindMahjong(root,game) {
  const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
  for(const b of root.querySelectorAll('[data-mj-tile]'))b.onclick=()=>game.tapCasinoMahjongTile(Number(b.dataset.mjTile));
  for(const b of root.querySelectorAll('[data-mj-mode]'))b.onclick=()=>game.setCasinoMahjongSetup({mode:b.dataset.mjMode});
  for(const b of root.querySelectorAll('[data-mj-level]'))b.onclick=()=>game.setCasinoMahjongSetup({level:b.dataset.mjLevel});
  on('#btn-mj-start',()=>game.startCasinoMahjong());on('#btn-mj-discard',()=>game.discardSelectedCasinoMahjong());on('#btn-mj-tsumogiri',()=>game.tsumogiriCasinoMahjong());
  on('#btn-mj-riichi',()=>game.toggleCasinoMahjongRiichi());on('#btn-mj-tsumo',()=>game.tsumoCasinoMahjong());on('#btn-mj-ron',()=>game.ronCasinoMahjong());on('#btn-mj-pass',()=>game.passCasinoMahjong());
  on('#btn-mj-next',()=>game.nextCasinoMahjong());on('#btn-mj-close',()=>game.closeCasinoMahjong());
  on('#btn-mj-abandon',()=>{const m=sessionOf(game);if(!m.confirm){m.confirm=true;host.refresh(game);setTimeout(()=>{if(m.confirm){m.confirm=false;host.refresh(game);}},4000);return;}game.abandonCasinoMahjong();});
}
// ---------------- session helpers ----------------
const saveNow=game=>{try{game.saveGame?.({immediate:true});}catch(e){console.warn(e);}};
const delay=()=>host.reduced()?60:340;
function describe(ev){
  if(!ev)return '';
  if(ev.t==='discard')return `${T(SEAT_NAMES[ev.seat])}${ev.riichi?T('が立直！'):T('が')} ${tileHtml(ev.tile,'mj-sm')} ${T('を捨てました')}`;
  return '';
}
/** Credit the payout exactly once when the game has ended (the stake was taken when it started). */
export function settleMahjong(game) {
  const st=mahjongOf(game);if(!st?.over||st.paid)return 0;
  const pay=Math.min(MAX_MAHJONG_PAYOUT,Math.max(0,Math.round(st.payout)));st.paid=true;game.gold+=pay;
  const s=host.state(game);s.net+=pay;host.remember(game,'mahjong',{result:st.abandoned?'放棄（最下位）':`${st.ranks[0]}位`,payout:pay,bet:st.bet});
  host.payoutComment(game,pay,st.bet,st.ranks[0]===1);
  return pay;
}
function changed(game,ev,{save=true}={}) {
  const m=sessionOf(game),st=mahjongOf(game);
  if(ev?.t==='discard'||ev?.next?.t==='ron')m.last={seat:ev.seat,tile:ev.tile};
  if(ev?.t==='discard')m.msg={t:'discard',seat:ev.seat,riichi:!!ev.riichi,tile:ev.tile};
  settleMahjong(game);
  if(save)saveNow(game);
  drive(game,false);
  host.refresh(game);
  return st;
}
/** Plays the CPUs one action at a time with a short pause, until it is the player's turn (or the hand ends). */
export function drive(game,render=true) {
  const s=host.state(game),m=sessionOf(game),st=mahjongOf(game);
  if(m.timer||!needsAuto(st)||!(s.root?.isConnected&&s.page==='mahjong'))return false;
  m.timer=setTimeout(()=>{
    m.timer=0;if(host.state(game)!==s)return;
    const cur=mahjongOf(game);if(!needsAuto(cur))return host.refresh(game);
    const ev=mahjongStep(cur,mahjongAi);
    if(ev?.t==='discard')sound.playTap();
    if(needsAuto(mahjongOf(game)))changed(game,ev,{save:false});else changed(game,ev);
  },delay());
  if(render)host.refresh(game);return true;
}
export const mahjongMethods={
  setCasinoMahjongSetup(opts={}) {
    const m=sessionOf(this);if(mahjongOf(this))return false;
    if(opts.mode&&MAHJONG_MODES[opts.mode])m.mode=opts.mode;if(opts.level&&MAHJONG_LEVELS[opts.level])m.level=opts.level;
    host.refresh(this);return true;
  },
  startCasinoMahjong(options={}) {
    const casino=this.nation?.casino,s=host.state(this),m=sessionOf(this),bet=host.wager(this,'mahjong');
    if(!host.canPlay(this)||!casino||casino.mahjong||this.gold<bet)return false;
    const st=newMahjong({mode:options.mode||m.mode,level:options.level||m.level,bet,...(options.seed!=null?{seed:options.seed}:{})});
    casino.mahjong=st;this.gold-=bet;s.net-=bet;m.sel=-1;m.riichi=false;m.msg=null;m.last=null;m.confirm=false;
    sound.playTap();saveNow(this);host.refresh(this);drive(this);return true;
  },
  tapCasinoMahjongTile(index) {
    const st=mahjongOf(this),m=sessionOf(this);
    if(!st||st.over||!ownDraw(st)||m.timer||st.h.riichi[0]||!Number.isInteger(index)||index<0||index>13)return false;
    const tile=index===13?st.h.drawn:st.h.hands[0][index];if(tile==null||tile<0)return false;
    if(m.riichi&&!riichiOptions(st,0).includes(tile))return false;
    if(m.sel===index)return this.discardCasinoMahjong(tile);
    m.sel=index;m.confirm=false;sound.playTap();host.refresh(this);return true;
  },
  discardSelectedCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||m.sel<0)return false;
    const tile=m.sel===13?st.h.drawn:st.h.hands[0][m.sel];return tile!=null&&tile>=0?this.discardCasinoMahjong(tile):false;
  },
  discardCasinoMahjong(tile) {
    const st=mahjongOf(this),m=sessionOf(this);
    if(!st||st.over||m.timer||!ownDraw(st))return false;
    const ev=humanDiscard(st,tile,m.riichi);if(!ev)return false;
    m.sel=-1;m.riichi=false;m.confirm=false;m.msg=null;sound.playTap();changed(this,ev);return true;
  },
  tsumogiriCasinoMahjong() {const st=mahjongOf(this);return !!st&&!st.over&&st.h.drawn>=0&&!st.h.riichi[0]&&this.discardCasinoMahjong(st.h.drawn);},
  toggleCasinoMahjongRiichi() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||m.timer||!ownDraw(st)||st.h.riichi[0])return false;
    if(!m.riichi&&!riichiOptions(st,0).length)return false;
    m.riichi=!m.riichi;m.sel=-1;sound.playTap();host.refresh(this);return true;
  },
  tsumoCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||m.timer||!humanTsumo(st))return false;
    m.sel=-1;m.riichi=false;m.msg=null;sound.playItem();changed(this,{t:'tsumo',seat:0});return true;
  },
  ronCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||!humanRon(st))return false;
    m.msg=null;sound.playItem();changed(this,{t:'ron',seat:0});return true;
  },
  passCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||!humanPass(st))return false;
    m.msg=null;sound.playTap();changed(this,{t:'pass'});return true;
  },
  nextCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||st.stage!=='result')return false;
    const r=nextHand(st);if(!r)return false;m.sel=-1;m.riichi=false;m.msg=null;m.last=null;sound.playTap();changed(this,null);return true;
  },
  abandonCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over)return false;
    abandonMahjong(st);m.confirm=false;m.sel=-1;m.riichi=false;changed(this,null);return true;
  },
  closeCasinoMahjong() {
    const casino=this.nation?.casino,st=casino?.mahjong,m=sessionOf(this);if(!st?.over)return false;
    settleMahjong(this);casino.mahjong=null;m.sel=-1;m.msg=null;m.last=null;saveNow(this);host.refresh(this);return true;
  },
  /** One CPU action without the pause (tests, and a safety net). Returns the event or null. */
  stepCasinoMahjong() {
    const st=mahjongOf(this);if(!needsAuto(st))return null;
    const ev=mahjongStep(st,mahjongAi);changed(this,ev);return ev;
  }
};
