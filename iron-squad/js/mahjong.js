// v7.1.4: Mahjong at the casino (UI + game methods). Rules live in mahjong-rules.js, the CPUs in mahjong-ai.js.
// Tile faces are inline SVG from mahjong-tiles.js (circles, bamboo, 萬 numerals, honours), so the kana mode (which only rewrites strings that go through gameText) leaves them alone.
// Everything the player reads goes through gameText piece by piece; tile markup never does (it would turn 東 into とう).
import {MAHJONG_MODES,MAHJONG_LEVELS,MAHJONG_PAYOUT,newMahjong,mahjongStep,humanDiscard,humanTsumo,humanAnkan,humanKakan,humanKyuushu,humanClaim,nextHand,abandonMahjong,tsumoInfo,ownOptions,riichiOptions,claimPrompt,riichiNeedsPlayer,discardWaits,currentWaits,liveWallLeft,handsTotal,tileFace,kindCounts,isRedId} from './mahjong-rules.js?v=322';
import {mahjongAi} from './mahjong-ai.js?v=322';
import {tileSvg,backSvg} from './mahjong-tiles.js?v=322';
import {MAX_MAHJONG_PAYOUT} from './casino-rules.js?v=322';
import {gameText} from './game-text.js?v=341';
import {sound} from '../../common/js/audio.js?v=151';
let host=null;
/** casino.js hands over its session helpers (state, refresh, money, ...) so this module does not import it back. */
export const setMahjongHost=h=>{host=h;};
const T=gameText;
const SEAT_NAMES=['あなた','右','正面','左'];
const HONOR_KANA=['とん','なん','しゃー','ぺー','はく','はつ','ちゅん'];
const LIMIT_NAMES={mangan:'満貫',haneman:'跳満',baiman:'倍満',sanbaiman:'三倍満',kazoe:'数え役満',yakuman:'役満',doubleYakuman:'ダブル役満'};
const ABORT_NAMES={kyuushu:'九種九牌',suufon:'四風連打',suucha:'四家立直',suukan:'四槓散了'};
/** One line per CPU level in the setup. */
const LEVEL_NOTES={novice:'守りはしません。ときどきミスをします。',adept:'あぶない牌をさけ、鳴いて手を早めます。ときどきミスをします。',master:'相手の捨て牌を読んで守り、手の高さを見て押すか引くかを決めます。ミスはしません。'};
const CALL_NAMES={chi:'チー',pon:'ポン',minkan:'カン',ankan:'カン',kakan:'加カン'};
/** The call buttons stay dead for a moment after they appear, so the tap that threw a tile cannot land on them. */
export const CLAIM_ARM_MS=450;
export const tileLabel=t=>t<27?`${t%9+1}${['まん','ぴん','そう'][Math.floor(t/9)]}`:HONOR_KANA[t-27];
const sessionOf=game=>{const s=host.state(game);return s.mj||(s.mj={sel:-1,riichi:false,timer:0,msg:null,confirm:false,mode:'full',level:'novice',armKey:'',armAt:0,armTimer:0});};
export const mahjongOf=game=>game.nation?.casino?.mahjong||null;
export const mahjongInProgress=game=>{const st=mahjongOf(game);return !!st&&!st.over;};
const ownDraw=st=>!!st.h&&st.h.turn===0&&st.stage==='act';
const needsAuto=st=>!!st&&!st.over&&!!st.h&&((st.stage==='act'&&(st.h.turn!==0||(st.h.riichi[0]&&!riichiNeedsPlayer(st))))||(st.stage==='claim'&&!!st.h.claim&&st.h.claim.wait!=='human'));
/** A tile kind (0..33) as markup. */
export const tileHtml=(t,cls='',attrs='',aka=false)=>{const f=tileFace(t);return `<span class="mj-tile mj-${f.suit} ${cls}${aka?' is-aka':''}" data-n="${f.n}" data-s="${f.s}" role="img" aria-label="${tileLabel(t)}" ${attrs}>${tileSvg(t,aka)}</span>`;};
const idHtml=(id,cls='')=>tileHtml(id>>2,cls,'',isRedId(id));
const backHtml=cls=>`<span class="mj-tile mj-back ${cls}" aria-hidden="true">${backSvg()}</span>`;
const tileButton=(id,i,cls,disabled)=>{const f=tileFace(id>>2),aka=isRedId(id);return `<button type="button" class="mj-tile mj-${f.suit} ${cls}${aka?' is-aka':''}" data-mj-tile="${i}" data-n="${f.n}" data-s="${f.s}" aria-label="${tileLabel(id>>2)}" ${disabled?'disabled':''}>${tileSvg(id>>2,aka)}</button>`;};
const pts=n=>Number(n).toLocaleString();
const signedPts=n=>`${n>0?'+':''}${pts(n)}`;
const mult=x=>`×${x}`;
const modeLabel=st=>(st.mode==='full'?T(`東風戦 ${st.hand+1}/${handsTotal(st)}局`):T('1局戦'))+(st.honba?` ${st.honba}${T('本場')}`:'');
const seatTag=(st,seat)=>st.h&&seat===st.h.dealer?'<em class="mj-tag">'+T('親')+'</em>':'';
/** A discard the next player took for a call is hidden from the river (as on a real table). */
const takenIds=h=>new Set(h.taken.map(i=>h.log[i]?.[1]));
function meldHtml(m,cls='mj-sm') {
  if(m.type==='ankan')return `<span class="mj-meld">${backHtml(cls)}${idHtml(m.tiles[1],cls)}${idHtml(m.tiles[2],cls)}${backHtml(cls)}</span>`;
  return `<span class="mj-meld">${m.tiles.map(id=>idHtml(id,cls+(id===m.called?' is-called':''))).join('')}</span>`;
}
function riverHtml(st,seat) {
  const h=st.h,gone=takenIds(h),lastE=h.log[h.log.length-1],riichiId=h.riichiAt[seat]>=0?h.log[h.riichiAt[seat]]?.[1]:-1;
  const tiles=h.rivers[seat].filter(id=>!gone.has(id)||(lastE&&lastE[1]===id&&st.stage==='claim'));
  return `<div class="mj-river" aria-label="${T('捨て牌')}">${tiles.map(id=>idHtml(id,'mj-sm'+(lastE&&lastE[0]===seat&&lastE[1]===id&&['act','claim'].includes(st.stage)?' is-last':'')+(id===riichiId?' is-riichi':''))).join('')}</div>`;
}
function playerBox(st,seat,cls='') {
  const h=st.h,melds=h.melds[seat];
  return `<section class="mj-seat ${cls} ${h.turn===seat&&st.stage==='act'?'is-turn':''}"><header><b>${T(SEAT_NAMES[seat])}</b>${seatTag(st,seat)}${h.riichi[seat]?'<i class="mj-riichi">'+T('立直')+'</i>':''}<span class="mj-pts">${pts(st.points[seat])}</span></header>${riverHtml(st,seat)}${melds.length?`<div class="mj-melds">${melds.map(m=>meldHtml(m)).join('')}</div>`:''}</section>`;
}
function seenCounts(st) {
  const h=st.h;
  return kindCounts([...h.hands[0],...(h.drawn>=0?[h.drawn]:[]),...h.rivers.flat(),...h.melds.flatMap(ms=>ms.flatMap(m=>m.tiles.filter(id=>id!==m.called))),...h.doraInds]);
}
function waitsInfo(st,m) {
  const h=st.h;if(st.over||st.stage!=='act'||h.turn!==0)return {waits:[]};
  let waits,label='',sel=null;
  if(m.sel>=0){sel=m.sel===13?h.drawn:h.hands[0][m.sel];if(sel!=null&&sel>=0){waits=discardWaits(st,0,sel);label=T('これを捨てると');}}
  if(!waits){waits=currentWaits(st,0);label=T('いま');}
  if(!waits.length)return {waits:[]};
  const c=seenCounts(st),furiten=h.furitenTemp[0]||h.furitenPerm[0]||waits.some(w=>h.rivers[0].some(id=>id>>2===w)||(sel!=null&&sel>=0&&w===sel>>2));
  return {waits,label,furiten,c};
}
function waitHtml(st,m) {
  const w=waitsInfo(st,m);if(!w.waits.length)return `<div class="mj-wait is-empty" aria-live="polite"><span>${T('聴牌すると、待ち牌がここに出ます。')}</span></div>`;
  return `<div class="mj-wait" aria-live="polite"><span>${w.label}${T('待ち')}</span>${w.waits.map(t=>`<span class="mj-wait-tile">${tileHtml(t,'mj-sm')}<small>${Math.max(0,4-w.c[t])}</small></span>`).join('')}${w.furiten?`<strong class="mj-furiten">${T('振聴')}</strong>`:''}</div>`;
}
/** True when throwing this tile is forbidden after a call (kuikae: the called tile or its swap-call twin) and something else could be thrown. */
export function kuikaeBlocked(st,id) {
  const h=st.h;return h.turn===0&&h.mustDiscard&&h.kuikae.includes(id>>2)&&h.hands[0].some(i=>!h.kuikae.includes(i>>2));
}
function handHtml(st,m,busy) {
  const h=st.h,mine=ownDraw(st)&&!busy&&!h.riichi[0],opts=m.riichi?riichiOptions(st,0):null;
  const bad=id=>kuikaeBlocked(st,id)||(opts&&!opts.includes(id));
  const tiles=h.hands[0].map((id,i)=>tileButton(id,i,`${m.sel===i?'is-selected':''} ${bad(id)?'is-dim':''}`,!mine||bad(id)));
  const drawn=h.drawn>=0?tileButton(h.drawn,13,`mj-drawn ${m.sel===13?'is-selected':''} ${bad(h.drawn)?'is-dim':''}`,!mine||bad(h.drawn)):'';
  const melds=h.melds[0].length?`<div class="mj-melds mj-mymelds" aria-label="${T('あなたの副露')}">${h.melds[0].map(x=>meldHtml(x)).join('')}</div>`:'';
  return `<div class="mj-hand" role="group" aria-label="${T('あなたの手牌')}">${tiles.join('')}${drawn}</div>${melds}`;
}
const showHand=(ids,melds,win)=>`<div class="mj-showhand">${[...ids].sort((a,b)=>a-b).map(id=>idHtml(id,'mj-sm')).join('')}${win!=null?idHtml(win,'mj-sm mj-win'):''}${(melds||[]).map(x=>meldHtml(x)).join('')}</div>`;
function resultHtml(st) {
  const r=st.result,r0=r.next==='over';
  const delta=`<ul class="mj-deltas">${[0,1,2,3].map(s=>`<li class="${r.deltas[s]>0?'is-plus':r.deltas[s]<0?'is-minus':''}"><span>${T(SEAT_NAMES[s])}</span><b>${signedPts(r.deltas[s])}</b></li>`).join('')}</ul>`;
  let body;
  if(r.type==='draw')body=`<h4>${T('流局')}</h4><p>${T('聴牌')}: ${[0,1,2,3].filter(s=>r.tenpai[s]).map(s=>T(SEAT_NAMES[s])).join('・')||T('だれもいません')}</p>${r.hands.map((x,s)=>x?`<div class="mj-showhand"><b>${T(SEAT_NAMES[s])}</b>${x.map(id=>idHtml(id,'mj-sm')).join('')}${(r.melds[s]||[]).map(mm=>meldHtml(mm)).join('')}</div>`:'').join('')}`;
  else if(r.type==='abort')body=`<h4>${T(ABORT_NAMES[r.reason]||'途中流局')}</h4><p>${T('途中で流局になりました。点数は動きません。')}</p>${r.hands.map((x,s)=>x?`<div class="mj-showhand"><b>${T(SEAT_NAMES[s])}</b>${x.map(id=>idHtml(id,'mj-sm')).join('')}</div>`:'').join('')}`;
  else {
    const lim=LIMIT_NAMES[r.limit]||'',doraRow=(label,ids)=>ids&&ids.length?`<div class="mj-dora-row"><small>${T(label)}</small>${ids.map(id=>idHtml(id,'mj-sm')).join('')}</div>`:'';
    body=`<h4>${T(SEAT_NAMES[r.winner])}${r.type==='tsumo'?T('のツモ和了！'):T('が')+T(SEAT_NAMES[r.loser])+T(r.chankan?'からチャンカンのロン！':'からロン！')}</h4>${showHand(r.hand,r.melds,r.tile)}${doraRow('ドラ表示',r.doraInds)}${doraRow('裏ドラ表示',r.uraInds)}<ul class="mj-yaku">${r.yaku.map(y=>`<li><span>${T(y.name)}</span><b>${y.han}${T('翻')}</b></li>`).join('')}</ul><p class="mj-han">${lim?`<b class="mj-limit">${T(lim)}</b> `:''}${r.yakuman?'':`<b>${r.han}${T('翻')} ${r.fu}${T('符')}</b>`}${r.pot?` ${T('供託')} +${pts(r.pot)}`:''}${r.honba?` ${r.honba}${T('本場')}`:''}</p>`;
  }
  const bust=st.points.some(p=>p<0),note=bust?T('持ち点が0を下回りました（飛び）。対局は終わります。'):r.next==='renchan'?T('連荘です。同じ親でもう一局。'):r0?T('これで最後の局でした。'):'';
  return `<div class="mj-result" role="status">${body}${delta}${note?`<p class="mj-note">${note}</p>`:''}<button type="button" class="casino-play" id="btn-mj-next">${T(r0?'最終結果へ':'次の局へ')}</button></div>`;
}
function finalHtml(st) {
  const order=[0,1,2,3].sort((a,b)=>st.ranks[a]-st.ranks[b]),rank=st.ranks[0],net=st.payout-st.bet,m=MAHJONG_PAYOUT[st.mode][st.level];
  const head=st.refund?T('以前のバージョンの対局でした。掛け金を払い戻しました。'):st.abandoned?T('放棄しました（最下位・払い戻し0）'):T(`${rank}位でした`);
  const bust=!st.refund&&st.points.some(p=>p<0);
  return `<div class="mj-final" role="status"><h4>${head}</h4>${bust?`<p class="mj-note">${T('飛びで終わりました。')}</p>`:''}<ol class="mj-ranks">${order.map(s=>`<li class="${s===0?'is-me':''}"><span>${st.ranks[s]}${T('位')}</span><b>${T(SEAT_NAMES[s])}</b><em>${pts(st.points[s])}</em></li>`).join('')}</ol><p class="casino-award"><strong>${T('受取')} ${host.money(st.payout)}</strong><span>${T('掛け金')} ${host.money(st.bet)} → ${T('収支')} ${host.signed(net)}${st.abandoned||st.refund?'':` (${mult(m[rank-1])})`}</span></p><button type="button" class="casino-play" id="btn-mj-close">${T('とじて、新しい対局へ')}</button></div>`;
}
function claimHtml(st,m,prompt) {
  const key=`${st.deal}:${st.h.log.length}:${prompt.chankan?1:0}`;
  if(m.armKey!==key){m.armKey=key;m.armAt=Date.now()+CLAIM_ARM_MS;}
  const wait=Math.max(0,m.armAt-Date.now());
  if(wait>0&&!m.armTimer)m.armTimer=setTimeout(()=>{m.armTimer=0;const g=m.game;if(g&&host.state(g)&&mahjongOf(g)?.stage==='claim')host.refresh(g);},wait+20);
  const dis=wait>0?'disabled':'',from=T(SEAT_NAMES[prompt.from]);
  const btn=(id,cls,html)=>`<button type="button" id="${id}" class="${cls}" ${dis}>${html}</button>`;
  const chis=prompt.chi.map((p,i)=>`<button type="button" data-mj-chi="${i}" ${dis}>${T('チー')}${idHtml(p[0],'mj-sm')}${idHtml(p[1],'mj-sm')}</button>`).join('');
  return `<div class="mj-claim" role="group" aria-label="${T('鳴き')}"><p class="mj-claim-tile">${from}${T('の')} ${idHtml(prompt.tile,'mj-sm mj-win')} ${T(prompt.chankan?'を加カンしようとしています':'で、どうしますか？')}</p><div class="mj-actions mj-claim-actions">${prompt.ron?btn('btn-mj-ron','casino-play mj-hot',T('ロン')):''}${prompt.pon?btn('btn-mj-pon','',T('ポン')):''}${chis}${prompt.kan?btn('btn-mj-kan','',T('カン')):''}</div><div class="mj-actions mj-skip">${btn('btn-mj-pass','mj-pass',T('スキップ'))}</div></div>`;
}
function ownActionHtml(st,m,mine,opts) {
  const h=st.h,canTsumo=mine&&!!tsumoInfo(st,0),canRiichi=mine&&!h.riichi[0]&&opts.riichi.length>0,sel=m.sel>=0&&mine&&!h.riichi[0];
  const kans=mine?[...opts.ankan.map(k=>`<button type="button" data-mj-ankan="${k}">${T('カン')}${tileHtml(k,'mj-sm')}</button>`),...opts.kakan.map(k=>`<button type="button" data-mj-kakan="${k}">${T('加カン')}${tileHtml(k,'mj-sm')}</button>`)].join(''):'';
  return `<div class="mj-actions">${canTsumo?`<button type="button" class="casino-play mj-hot" id="btn-mj-tsumo">${T('ツモ')}</button>`:''}${canRiichi?`<button type="button" id="btn-mj-riichi" aria-pressed="${m.riichi}" class="${m.riichi?'is-on':''}">${T('立直')}</button>`:''}${kans}${mine&&opts.kyuushu?`<button type="button" id="btn-mj-kyuushu">${T('九種九牌')}</button>`:''}<button type="button" id="btn-mj-discard" ${sel?'':'disabled'}>${T(m.riichi?'立直して捨てる':'捨てる')}</button><button type="button" id="btn-mj-tsumogiri" ${mine&&h.drawn>=0?'':'disabled'}>${T('ツモ切り')}</button></div>`;
}
function playHtml(game,s,st) {
  const m=sessionOf(game);m.game=game;
  const h=st.h,busy=!!m.timer,mine=ownDraw(st)&&!busy,prompt=claimPrompt(st);
  const opts=mine?ownOptions(st,0):{riichi:[],ankan:[],kakan:[],kyuushu:false};
  const sel=m.sel>=0&&mine&&!h.riichi[0];
  const status=st.over?'':prompt?'':busy||!mine?(st.stage==='act'||st.stage==='claim'?`<span class="mj-think">${T(h.turn===0?'…':SEAT_NAMES[h.turn]+'の番です')}</span>`:''):h.riichi[0]?T('立直中：ツモ切りです'):h.mustDiscard?T('鳴いたあとです。捨てる牌を選んでください'):m.riichi?T('立直する牌を選んでください'):sel?T('もういちどタップ、または「捨てる」'):T('捨てる牌を選んでください');
  const actions=st.over||st.stage==='result'?'':prompt?claimHtml(st,m,prompt):ownActionHtml(st,m,mine,opts);
  const abandon=st.over?'':`<button type="button" class="mj-abandon ${m.confirm?'is-confirm':''}" id="btn-mj-abandon">${T(m.confirm?'本当に放棄する？（最下位・払い戻し0）':'放棄')}</button>`;
  const dora=h.doraInds.map(id=>idHtml(id,'mj-sm')).join('');
  return `<div class="mj" data-stage="${st.stage}"><div class="mj-head"><div><strong>${modeLabel(st)}</strong><span>${T('残り')} ${liveWallLeft(st)}${T('枚')}</span>${st.pot?`<span>${T('供託')} ${st.pot/1000}${T('本')}</span>`:''}<span>${T('掛け金')} ${host.money(st.bet)}</span></div><div class="mj-dora"><small>${T('ドラ表示')}</small>${dora}</div></div>
  <div class="mj-opps">${playerBox(st,3,'mj-left')}${playerBox(st,2,'mj-front')}${playerBox(st,1,'mj-right')}</div>
  ${playerBox(st,0,'mj-me')}
  ${st.stage==='result'?resultHtml(st):`${waitHtml(st,m)}${handHtml(st,m,busy)}<p class="mj-status" aria-live="polite">${status}</p>${m.msg?`<p class="mj-msg">${describe(m.msg)}</p>`:''}${actions}`}
  ${abandon}</div>`;
}
function setupHtml(game,s) {
  const m=sessionOf(game),bet=host.wager(game,'mahjong'),table=MAHJONG_PAYOUT[m.mode][m.level],can=host.canPlay(game)&&game.gold>=bet;
  const choice=(attr,map,cur)=>Object.values(map).map(v=>`<button type="button" ${attr}="${v.key}" aria-pressed="${v.key===cur}" class="${v.key===cur?'is-on':''}">${T(v.name)}</button>`).join('');
  const minutes={full:'8〜12',short:'2〜3'}[m.mode];
  return `<div class="mj-setup"><p class="casino-help">${T('4人で打つ麻雀です。相手はCPU3人。ポン・チー・カン、立直、ドラ、役満があり、親は連荘します。持ち点が0を下回ると終わります。閉じても、つぎに開くと続きから打てます。')}</p>
  <h4>${T('対局')}</h4><div class="mj-choice">${choice('data-mj-mode',MAHJONG_MODES,m.mode)}</div><small>${T(`${m.mode==='full'?'東風戦は4局（連荘で延びます）':'1局戦は1局だけ'}。時間の目安は${minutes}分。`)}</small>
  <h4>${T('相手')}</h4><div class="mj-choice is-three">${choice('data-mj-level',MAHJONG_LEVELS,m.level)}</div><small class="mj-level-note">${T(LEVEL_NOTES[m.level]||'')}</small>
  <details class="casino-paytable" open><summary>${T('着順の払い戻し')}</summary><dl>${table.map((x,i)=>`<div><dt>${i+1}${T('位')}</dt><dd>${mult(x)} · ${host.money(Math.round(bet*x))}</dd></div>`).join('')}</dl><p class="casino-help">${T('掛け金は参加費。始めるときに引かれ、終わると着順に応じて戻ります。「放棄」は最下位あつかいで、戻りは0です。同点は座順で決まります。')}</p></details>
  <button type="button" class="casino-play" id="btn-mj-start" ${can?'':'disabled'}>${T('対局をはじめる')} · ${host.money(bet)}</button>${can||game.gold>=bet?'':`<small>${T('所持金が足りません。')}</small>`}</div>`;
}
/** The whole mahjong page (below the casino nav). Setup when no game exists, the table while one is in progress, the final result after it ended. */
export function mahjongHtml(game,s) {
  const st=mahjongOf(game);
  if(!st)return setupHtml(game,s);
  return st.over?`<div class="mj" data-stage="over"><div class="mj-head"><div><strong>${modeLabel(st)}</strong></div></div>${finalHtml(st)}</div>`:playHtml(game,s,st);
}
export function bindMahjong(root,game) {
  const on=(sel,fn)=>{const el=root.querySelector(sel);if(el)el.onclick=fn;};
  for(const b of root.querySelectorAll('[data-mj-tile]'))b.onclick=()=>game.tapCasinoMahjongTile(Number(b.dataset.mjTile));
  for(const b of root.querySelectorAll('[data-mj-mode]'))b.onclick=()=>game.setCasinoMahjongSetup({mode:b.dataset.mjMode});
  for(const b of root.querySelectorAll('[data-mj-level]'))b.onclick=()=>game.setCasinoMahjongSetup({level:b.dataset.mjLevel});
  for(const b of root.querySelectorAll('[data-mj-ankan]'))b.onclick=()=>game.ankanCasinoMahjong(Number(b.dataset.mjAnkan));
  for(const b of root.querySelectorAll('[data-mj-kakan]'))b.onclick=()=>game.kakanCasinoMahjong(Number(b.dataset.mjKakan));
  for(const b of root.querySelectorAll('[data-mj-chi]'))b.onclick=()=>{const p=claimPrompt(mahjongOf(game));const ids=p?.chi[Number(b.dataset.mjChi)];if(ids)game.chiCasinoMahjong(ids);};
  on('#btn-mj-start',()=>game.startCasinoMahjong());on('#btn-mj-discard',()=>game.discardSelectedCasinoMahjong());on('#btn-mj-tsumogiri',()=>game.tsumogiriCasinoMahjong());
  on('#btn-mj-riichi',()=>game.toggleCasinoMahjongRiichi());on('#btn-mj-tsumo',()=>game.tsumoCasinoMahjong());on('#btn-mj-ron',()=>game.ronCasinoMahjong());on('#btn-mj-pass',()=>game.passCasinoMahjong());
  on('#btn-mj-pon',()=>game.ponCasinoMahjong());on('#btn-mj-kan',()=>game.kanCasinoMahjong());on('#btn-mj-kyuushu',()=>game.kyuushuCasinoMahjong());
  on('#btn-mj-next',()=>game.nextCasinoMahjong());on('#btn-mj-close',()=>game.closeCasinoMahjong());
  on('#btn-mj-abandon',()=>{const m=sessionOf(game);if(!m.confirm){m.confirm=true;host.refresh(game);setTimeout(()=>{if(m.confirm){m.confirm=false;host.refresh(game);}},4000);return;}game.abandonCasinoMahjong();});
}
// ---------------- session helpers ----------------
const saveNow=game=>{try{game.saveGame?.({immediate:true});}catch(e){console.warn(e);}};
const delay=()=>host.reduced()?60:340;
function describeOne(ev) {
  if(!ev)return '';
  if(ev.t==='discard')return `${T(SEAT_NAMES[ev.seat])}${ev.riichi?T('が立直！'):T('が')} ${tileHtml(ev.tile>>2,'mj-sm')} ${T('を捨てました')}`;
  if(ev.t==='call')return `${T(SEAT_NAMES[ev.seat])}${T('が')} ${tileHtml(ev.tile>>2,'mj-sm')} ${T('を')}${T(CALL_NAMES[ev.type==='minkan'?'minkan':ev.type])}`;
  if(ev.t==='kan')return `${T(SEAT_NAMES[ev.seat])}${T('が')}${T(ev.type==='kakan'?'加カン':'カン')}${tileHtml(ev.kind,'mj-sm')}`;
  return '';
}
function describe(ev) {return [describeOne(ev),describeOne(ev?.next)].filter(Boolean).join(' ／ ');}
/** Credit the payout exactly once when the game has ended (the stake was taken when it started). */
export function settleMahjong(game) {
  const st=mahjongOf(game);if(!st?.over||st.paid)return 0;
  const pay=Math.min(MAX_MAHJONG_PAYOUT,Math.max(0,Math.round(st.payout)));st.paid=true;game.gold+=pay;
  const s=host.state(game);s.net+=pay;host.remember(game,'mahjong',{result:st.refund?'払い戻し':st.abandoned?'放棄（最下位）':`${st.ranks[0]}位`,payout:pay,bet:st.bet});
  host.payoutComment(game,pay,st.bet,!st.refund&&st.ranks[0]===1);
  return pay;
}
function changed(game,ev,{save=true}={}) {
  const st=mahjongOf(game),m=sessionOf(game);
  if(ev&&['discard','call','kan'].includes(ev.t)){m.msg=ev;}
  else if(ev&&['tsumo','ron','draw','abort','pass'].includes(ev.t))m.msg=null;
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
    if(ev?.t==='discard'||ev?.t==='call'||ev?.t==='kan')sound.playTap();
    if(needsAuto(mahjongOf(game)))changed(game,ev,{save:false});else changed(game,ev);
  },delay());
  if(render)host.refresh(game);return true;
}
/** Run a player action on the current game: guard, apply, reset the selection, then drive the CPUs. */
function act(game,fn,{snd='tap'}={}) {
  const st=mahjongOf(game),m=sessionOf(game);if(!st||st.over||m.timer)return false;
  const ev=fn(st);if(!ev)return false;
  m.sel=-1;m.riichi=false;m.confirm=false;sound[snd==='item'?'playItem':'playTap']();changed(game,ev);return true;
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
    casino.mahjong=st;this.gold-=bet;s.net-=bet;m.sel=-1;m.riichi=false;m.msg=null;m.confirm=false;m.armKey='';
    sound.playTap();saveNow(this);host.refresh(this);drive(this);return true;
  },
  tapCasinoMahjongTile(index) {
    const st=mahjongOf(this),m=sessionOf(this);
    if(!st||st.over||!ownDraw(st)||m.timer||st.h.riichi[0]||!Number.isInteger(index)||index<0||index>13)return false;
    const tile=index===13?st.h.drawn:st.h.hands[0][index];if(tile==null||tile<0||kuikaeBlocked(st,tile))return false;
    if(m.riichi&&!riichiOptions(st,0).includes(tile))return false;
    if(m.sel===index)return this.discardCasinoMahjong(tile);
    m.sel=index;m.confirm=false;sound.playTap();host.refresh(this);return true;
  },
  discardSelectedCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||m.sel<0)return false;
    const tile=m.sel===13?st.h.drawn:st.h.hands[0][m.sel];return tile!=null&&tile>=0?this.discardCasinoMahjong(tile):false;
  },
  discardCasinoMahjong(tile) {const m=sessionOf(this);return act(this,st=>ownDraw(st)?humanDiscard(st,tile,m.riichi):null);},
  tsumogiriCasinoMahjong() {const st=mahjongOf(this);return !!st&&!st.over&&ownDraw(st)&&st.h.drawn>=0&&this.discardCasinoMahjong(st.h.drawn);},
  toggleCasinoMahjongRiichi() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||m.timer||!ownDraw(st)||st.h.riichi[0])return false;
    if(!m.riichi&&!riichiOptions(st,0).length)return false;
    m.riichi=!m.riichi;m.sel=-1;sound.playTap();host.refresh(this);return true;
  },
  tsumoCasinoMahjong() {return act(this,st=>humanTsumo(st),{snd:'item'});},
  ronCasinoMahjong() {return act(this,st=>humanClaim(st,{t:'ron'}),{snd:'item'});},
  passCasinoMahjong() {return act(this,st=>humanClaim(st,{t:'pass'}));},
  ponCasinoMahjong() {return act(this,st=>humanClaim(st,{t:'pon'}));},
  kanCasinoMahjong() {return act(this,st=>humanClaim(st,{t:'kan'}));},
  chiCasinoMahjong(ids) {return act(this,st=>humanClaim(st,{t:'chi',ids:Array.isArray(ids)?[...ids]:[]}));},
  ankanCasinoMahjong(kind) {return act(this,st=>humanAnkan(st,kind));},
  kakanCasinoMahjong(kind) {return act(this,st=>humanKakan(st,kind));},
  kyuushuCasinoMahjong() {return act(this,st=>humanKyuushu(st));},
  nextCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over||st.stage!=='result')return false;
    const r=nextHand(st);if(!r)return false;m.sel=-1;m.riichi=false;m.msg=null;sound.playTap();changed(this,null);return true;
  },
  abandonCasinoMahjong() {
    const st=mahjongOf(this),m=sessionOf(this);if(!st||st.over)return false;
    abandonMahjong(st);m.confirm=false;m.sel=-1;m.riichi=false;changed(this,null);return true;
  },
  closeCasinoMahjong() {
    const casino=this.nation?.casino,st=casino?.mahjong,m=sessionOf(this);if(!st?.over)return false;
    settleMahjong(this);casino.mahjong=null;m.sel=-1;m.msg=null;saveNow(this);host.refresh(this);return true;
  },
  /** One CPU action without the pause (tests, and a safety net). Returns the event or null. */
  stepCasinoMahjong() {
    const st=mahjongOf(this);if(!needsAuto(st))return null;
    const ev=mahjongStep(st,mahjongAi);changed(this,ev);return ev;
  }
};
