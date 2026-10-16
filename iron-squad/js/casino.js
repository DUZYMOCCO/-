import {CASINO_BET,casinoBaseBet,casinoMaxBet,casinoPageMaxBet,validCasinoBet,normalizeCasinoBet,CASINO_POLICY,POKER_PAYOUTS,SLOT_SYMBOLS,SLOT_LINES,SLOT_CHERRY_TWO,dealPoker,finishPoker,cardFace,rollSlots,pokerWinningCards,evaluatePoker} from './casino-rules.js?v=276';
import {chooseArena,arenaCandidates,simulateArena,recordArena} from './casino-arena.js?v=276';
import {atFacility} from './hq-facilities.js?v=290';
import {drawSoldierPortrait} from './soldier-appearance.js?v=206';
import {casinoQuip} from './soldier-dialogue.js?v=276';
import {sound} from '../../common/js/audio.js?v=151';
import {gameText} from './game-text.js?v=281';
const states=new WeakMap();
const state=game=>{let s=states.get(game);if(!s||s.source!==game.nation?.casino){s={source:game.nation?.casino,page:'lobby',busy:null,step:0,net:0,history:{slot:[],poker:[],arena:[]},losses:0,comment:'',lastSpeech:0};states.set(game,s);}return s;};
const canPlay=game=>atFacility(game,'casino',0);
const wager=(game,page=state(game).page)=>Math.min(casinoPageMaxBet(game.nation?.level,page),Math.max(casinoBaseBet(game.nation?.level),validCasinoBet(game.nation?.casino?.bet,CASINO_BET,Infinity)?Number(game.nation.casino.bet):CASINO_BET));
const money=n=>`${Number(n||0).toLocaleString(undefined,{maximumFractionDigits:1})}G`;
const signed=n=>`${n>=0?'+':''}${money(n)}`;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function refresh(game){const s=state(game);if(s.root?.isConnected)draw(game,s.root);}
function remember(game,page,result){const s=state(game);s.history[page].unshift(result);s.history[page].length=Math.min(10,s.history[page].length);}
function speak(game,unit,force=false,big=false) {
 const s=state(game),now=Date.now();if(now-s.lastSpeech<7000||(!force&&Math.random()>.35))return;
 unit=unit||(game.squad||[]).find(u=>u.isPersonalGuard&&!u.dead&&!u.isDown);if(!unit)return;
 s.comment=`${unit.name}「${casinoQuip(unit,big)}」`;s.lastSpeech=now;
 setTimeout(()=>{if(states.get(game)===s){s.comment='';refresh(game);}},4500);
}
function animation(game,kind,count,onDone) {
 const s=state(game);s.busy=kind;s.step=0;
 const duration=reduced()?CASINO_POLICY.reducedMs:kind==='slot'?CASINO_POLICY.slotMs:CASINO_POLICY.pokerMs;
 for(let i=1;i<=count;i++)setTimeout(()=>{if(states.get(game)!==s)return;s.step=i;if(i===count){s.busy=null;onDone?.();}refresh(game);},duration*i/count);
 refresh(game);
}
function payoutComment(game,payout,bet,big){const s=state(game);s.losses=payout<bet?s.losses+1:0;if(big||s.losses>=3)speak(game);}
const historyHtml=(s,page)=>`<details class="casino-history"><summary>直近の結果 · ${s.history[page].length}/10</summary><ol>${s.history[page].map(r=>`<li>${escape(r.result)} <b>${signed(r.payout-r.bet)}</b></li>`).join('')||'<li>まだ記録がありません。</li>'}</ol></details>`;
const lineSvg=(lines,small=false)=>`<svg class="${small?'slot-line-key':'slot-win-lines'}" viewBox="0 0 300 300" aria-label="${small?'横3・縦3・ななめ2の8本':'当たりの線'}">${lines.map((line,i)=>{const cells=SLOT_LINES[line],a=cells[0],b=cells[2];return `<line x1="${a%3*100+50}" y1="${Math.floor(a/3)*100+50}" x2="${b%3*100+50}" y2="${Math.floor(b/3)*100+50}" stroke="${['#f9d978','#ef8787','#86bde8','#9dd2aa','#d9a7e8','#e7b27a','#f1f1c3','#b3eee9'][i%8]}"/>`;}).join('')}</svg>`;
function draw(game,root) {
 const s=state(game),casino=game.nation.casino,page=s.page,open=canPlay(game),bet=wager(game),base=casinoBaseBet(game.nation.level),max=casinoPageMaxBet(game.nation.level,page),slotMax=casinoMaxBet(game.nation.level),arenaMax=casinoPageMaxBet(game.nation.level,'arena'),locked=!!s.busy;
 root.dataset.casinoPage=page;if(root.previousElementSibling?.classList.contains('facility-intro'))root.previousElementSibling.remove();
 root.innerHTML=gameText(`<nav class="casino-path"><button type="button" data-casino-page="lobby" ${page==='lobby'?'hidden':''}>‹ 入口へ</button><strong>CASINO / ${{lobby:'入口',slot:'SLOT',poker:'POKER',arena:'ARENA'}[page]}</strong></nav>
 ${!open?'<p>本陣のカジノから遊べます。</p>':''}
 ${page==='lobby'?`<p class="casino-welcome">戦いの合間に、ひと勝負。</p><p>所持金 ${money(game.gold)}</p><p>何回でも遊べます。お金の勝負に経験値は入りません。</p><div class="casino-lobby">${[['slot','7 · 🍒 · 💎','スロット','3×3、8本の線で大当たり。'],['poker','♠ ♥ ♦ ♣','ポーカー','5枚を配り、1回だけ交換。'],['arena','⚔','闘技場','仲間6人の練習試合。赤組か青組か。']].map(([p,icon,title,desc])=>`<button type="button" data-casino-page="${p}"><b>${icon}</b><strong>${title}</strong><small>${desc}</small></button>`).join('')}</div>`:
 `<div class="casino-wallet" aria-live="polite"><span>所持金 <b>${money(game.gold)}</b></span><span>今回の収支 <b>${signed(s.net)}</b></span></div><div class="casino-wager"><label>掛け金<input id="casino-bet" type="number" inputmode="numeric" min="${base}" max="${max}" step="1" value="${bet}" ${locked?'disabled':''}></label><small>基本 ${money(base)} / ${page==='arena'?'闘技場の上限':'今の上限'} ${money(max)}（今の掛け金 ${money(bet)}）</small><small>${page==='arena'?`スロット・ポーカーの上限は ${money(slotMax)}。そちらへ移ると上限で止まります。`:`闘技場の上限は ${money(arenaMax)}。`}</small><div class="casino-bet-actions"><button data-bet-base>基本に戻す</button><button data-bet-mult="2">2倍</button><button data-bet-mult="10">10倍</button></div></div>
 ${page==='slot'?slotHtml(game,s):page==='poker'?pokerHtml(game,s):arenaHtml(game,s)}${historyHtml(s,page)}`}
 <p class="casino-comment" role="status">${escape(s.comment)}</p>`);
 for(const b of root.querySelectorAll('[data-casino-page]'))b.onclick=()=>game.openCasinoPage(b.dataset.casinoPage);
 const input=root.querySelector('#casino-bet');if(input)input.onchange=()=>{game.setCasinoBet(Number(input.value));refresh(game);};
 root.querySelector('[data-bet-base]')?.addEventListener('click',()=>game.setCasinoBet(base));
 for(const b of root.querySelectorAll('[data-bet-mult]'))b.onclick=()=>game.setCasinoBet(Math.min(max,bet*Number(b.dataset.betMult)));
 for(const b of root.querySelectorAll('[data-poker-hold]'))b.onclick=()=>game.holdCasinoCard(Number(b.dataset.pokerHold));
 root.querySelector('#btn-casino-poker')?.addEventListener('click',()=>casino.poker?.status==='draw'?game.drawCasinoPoker():game.startCasinoPoker());
 root.querySelector('#btn-casino-slot')?.addEventListener('click',()=>game.spinCasinoSlot());
 root.querySelector('#btn-arena-shuffle')?.addEventListener('click',()=>game.shuffleCasinoArena());
 root.querySelector('#btn-arena-fast')?.addEventListener('click',()=>game.finishCasinoArena());
 for(const b of root.querySelectorAll('[data-arena-bet]'))b.onclick=()=>game.betCasinoArena(Number(b.dataset.arenaBet));
 if(page==='arena'&&s.arena)for(const c of root.querySelectorAll('[data-arena-face]')){const i=Number(c.dataset.arenaFace),unit=s.arena.soldiers.flat()[i];drawSoldierPortrait(c.getContext('2d'),unit,c.width,c.height,{compact:true});}
 const field=root.querySelector('.arena-field');if(field)drawArenaField(game,s,field);
}
function drawArenaField(game,s,canvas) {
 const c=canvas.getContext('2d'),fight=s.fight,index=Math.min(fight.frames.length-1,Math.floor((s.arenaProgress||0)*(fight.frames.length-1))),frame=fight.frames[index];
 c.fillStyle='#27352d';c.fillRect(0,0,600,240);c.strokeStyle='#938663';c.lineWidth=2;c.strokeRect(12,12,576,216);
 for(let i=0;i<6;i++){
  const side=Math.floor(i/3),u=s.arena.soldiers[side][i%3],hp=frame.hp[i],attack=frame.attack[i],x=side?410:190,y=53+(i%3)*68;
  c.save();c.translate(x+(attack?(side?-13:13):0),y);c.scale(1.45,hp<=0?.8:1.45);
  game.drawCasinoArenaUnit?.(c,{...u,x:0,y:0,vx:attack?1:0,vy:0,campPose:null,farmPose:null,atkAnim:attack?.22:0,facingAngle:side?Math.PI:0,attackAngle:side?Math.PI:0,isDown:false},performance.now());c.restore();
  c.fillStyle='#15211c';c.fillRect(x-45,y+12,90,7);c.fillStyle=side?'#90b6d5':'#ce978c';c.fillRect(x-45,y+12,90*Math.max(0,hp)/s.arena.teams[side][i%3].hp,7);
 }
}
function slotHtml(game,s) {
 const result=game.nation.casino.slot,rolling=s.busy==='slot',reels=result?.reels||['bell','seven','cherry','lemon','gem','clover','seven','bell','lemon'];
 const wins=rolling?[]:result?.wins||[],cells=new Set(wins.flatMap(w=>w.cells)),keys=new Set(wins.map(w=>w.key));
 return `<div class="casino-slot-board"><div class="slot-reels">${reels.map((id,i)=>{const symbol=SLOT_SYMBOLS.find(v=>v.id===id),spin=rolling&&i%3>=s.step;return `<span class="slot-reel ${spin?'is-spinning':''} ${cells.has(i)?'is-winning':''}" aria-label="${spin?'回転中':symbol.name}">${spin?'◆':symbol.icon}</span>`;}).join('')}</div>${lineSvg(wins.map(w=>w.line))}</div>
 <div class="casino-award" aria-live="polite"><strong>${rolling?'回転中…':result?money(result.payout):'8本の線で勝負'}</strong><span>${rolling?'左から止まります':result?`${result.result} · 収支 ${signed(result.payout-result.bet)}`:'掛け金ひとつで、全8本が対象'}</span></div>
 <button class="casino-play" id="btn-casino-slot" ${!canPlay(game)||s.busy||game.gold<wager(game)?'disabled':''}>${rolling?'回転中…':result?'もう一回 回す':'リールを回す'} · ${money(wager(game))}</button>
 <div class="slot-line-results">${wins.map(w=>`<small>${['上段','中段','下段','左列','中列','右列','右下がり','右上がり'][w.line]} ${money(w.payout)}</small>`).join('')}</div>
 <details class="casino-paytable" open><summary>1線あたりの配当 / 8本の線</summary><div class="casino-slot-pay">${lineSvg([0,1,2,3,4,5,6,7],true)}<dl>${SLOT_SYMBOLS.map(v=>`<div class="${keys.has(v.id)?'is-winning':''}"><dt>${v.icon} ×3</dt><dd>${v.mult}倍</dd></div>`).join('')}<div class="${keys.has('cherryTwo')?'is-winning':''}"><dt>🍒 ×2</dt><dd>${SLOT_CHERRY_TWO}倍</dd></div></dl></div></details>`;
}
function pokerHtml(game,s) {
 const hand=game.nation.casino.poker,drawing=hand?.status==='draw',busy=s.busy==='deal'||s.busy==='draw',replaced=s.replaced||[],winning=!drawing&&!busy&&hand?pokerWinningCards(hand.hand):[],key=!drawing&&!busy&&hand?evaluatePoker(hand.hand).key:'';
 const cards=Array.from({length:5},(_,i)=>{
 const hidden=!hand||(s.busy==='deal'&&i>=s.step)||(s.busy==='draw'&&replaced.indexOf(i)>=s.step&&replaced.includes(i));
 if(hidden)return '<div class="poker-card card-back" aria-label="カードのうら">◆</div>';
 const face=cardFace(hand.hand[i]),held=hand.held[i];return `<button type="button" class="poker-card ${face.red?'red':''} ${winning.includes(i)?'is-winning':''}" data-poker-hold="${i}" aria-pressed="${drawing&&held}" aria-label="${face.suit}${face.rank} ${held?'保持':'交換'}" ${!drawing||busy||!canPlay(game)?'disabled':''}><small class="hold-badge">${drawing?(held?'保持':'交換'):'確定'}</small><span>${face.rank}</span><b>${face.suit}</b></button>`;
 }).join('');
 return `<p class="casino-help">残すカードを押して「保持」。交換は1回です。</p><div class="poker-hand">${cards}</div><div class="casino-award" aria-live="polite"><strong>${busy?'カードを配っています…':drawing?'残すカードを選ぼう':hand?hand.result:'5枚の勝負'}</strong><span>${busy?'':drawing?`この手の掛け金 ${money(hand.bet)}`:hand?`受取 ${money(hand.payout)} · 収支 ${signed(hand.payout-hand.bet)}`:'10以上のペアから配当'}</span></div>
 <button class="casino-play" id="btn-casino-poker" ${!canPlay(game)||s.busy||(!drawing&&game.gold<wager(game))?'disabled':''}>${busy?'配り中…':drawing?'交換して確定':hand?'もう一回 配る':'カードを配る'}${drawing?'':` · ${money(wager(game))}`}</button>
 <details class="casino-paytable" open><summary>ポーカーの役と配当</summary><dl>${POKER_PAYOUTS.filter(v=>v.mult).map(v=>`<div class="${key===v.key?'is-winning':''}"><dt>${v.name}</dt><dd>${v.mult}倍</dd></div>`).join('')}</dl></details>`;
}
function arenaHtml(game,s) {
 const match=s.arena;if(!match)return '<p>練習試合には、元気な兵士・予備兵が6人必要です。ダウン・搬送・遠征中の人は出場できません。</p><button id="btn-arena-shuffle">組み合わせを探す</button>';
 const fight=s.fight,playing=s.busy==='arena',frame=fight?.frames[Math.min(fight.frames.length-1,Math.floor((s.arenaProgress||0)*(fight.frames.length-1)))];
 return `${fight?'<canvas class="arena-field" width="600" height="240" role="img" aria-label="赤組と青組の模擬戦"></canvas>':''}<div class="arena-teams ${playing?'is-fighting':''}">${match.teams.map((team,side)=>`<section class="arena-team ${side?'blue':'red'}"><h4>${side?'青組':'赤組'} <span>${match.odds[side].toFixed(2)}倍</span></h4>${team.map((p,i)=>{const idx=side*3+i,hp=frame?frame.hp[idx]:p.hp;return `<div class="arena-unit ${hp<=0?'is-down':''} ${playing&&frame?.attack[idx]?'is-attacking':''}"><canvas width="88" height="100" data-arena-face="${idx}" role="img" aria-label="${escape(p.name)}"></canvas><div><strong>${escape(p.name)}</strong><small>${escape(p.className)} · Lv${p.level}</small><small>攻 ${Math.round(p.atk)} / 防 ${Math.round(p.def)}</small><small>HP ${Math.ceil(hp)} / ${Math.round(p.hp)}</small><progress max="${p.hp}" value="${hp}"></progress></div></div>`;}).join('')}<button data-arena-bet="${side}" ${s.busy||fight||game.gold<wager(game)||!canPlay(game)?'disabled':''}>${side?'青組':'赤組'}に賭ける</button></section>`).join('')}</div>
 <p class="arena-caption ${s.bigWin?'is-big-win':''}">${playing?'練習試合中…':fight?`${s.bigWin?'大当たり！ ':''}${fight.winner?'青組':'赤組'}の勝ち · 受取 ${money(fight.payout)}`:`本番と同じ模擬戦${CASINO_POLICY.arenaTrials}回で勝率を予想。倍率は${CASINO_POLICY.arenaOddsRange.join('〜')}倍。`}</p>
 ${playing?'<button class="casino-play" id="btn-arena-fast">早送り</button>':`<button class="casino-play" id="btn-arena-shuffle" ${s.busy?'disabled':''}>組み直す · 無料</button>`}`;
}
export const casinoMethods={
 openCasinoPage(page='lobby') {
 if(!['lobby','slot','poker','arena'].includes(page))return false;
 const s=state(this),casino=this.nation?.casino,cap=casinoPageMaxBet(this.nation?.level,page);s.page=page;s.net=0;s.comment='';
 if(casino&&casino.bet>cap){const old=casino.bet;casino.bet=cap;s.comment=`掛け金を${money(old)}から、このページの上限 ${money(cap)}に下げました。`;}
 if(page==='arena'&&!s.arena)s.arena=chooseArena(this);
 if(s.root?.parentElement)s.root.parentElement.scrollTop=0;
 refresh(this);return true;
 },
 setCasinoBet(value) {
 if(!this.nation?.casino||state(this).busy||!validCasinoBet(value,casinoBaseBet(this.nation.level),casinoPageMaxBet(this.nation.level,state(this).page)))return false;
 this.nation.casino.bet=Number(value);refresh(this);return true;
 },
 startCasinoPoker() {
 const casino=this.nation?.casino,s=state(this),bet=wager(this);
 if(!canPlay(this)||!casino||s.busy||casino.poker?.status==='draw'||this.gold<bet)return false;
 casino.poker=dealPoker(this.phase,Math.random,bet);this.gold-=bet;s.net-=bet;sound.playTap();animation(this,'deal',5);return true;
 },
 holdCasinoCard(index) {
 const hand=this.nation?.casino?.poker;
 if(!canPlay(this)||state(this).busy||hand?.status!=='draw'||!Number.isInteger(index)||index<0||index>=5)return false;
 hand.held[index]=!hand.held[index];sound.playTap();refresh(this);return true;
 },
 drawCasinoPoker() {
 const hand=this.nation?.casino?.poker,s=state(this);if(!canPlay(this)||s.busy||hand?.status!=='draw')return false;
 s.replaced=hand.held.map((held,i)=>held?-1:i).filter(i=>i>=0);const payout=finishPoker(hand);this.gold+=payout;s.net+=payout;
 remember(this,'poker',hand);animation(this,'draw',Math.max(1,s.replaced.length),()=>{payoutComment(this,payout,hand.bet,['royalFlush','straightFlush','fourKind'].includes(evaluatePoker(hand.hand).key));if(payout)sound.playItem();});return true;
 },
 spinCasinoSlot() {
 const casino=this.nation?.casino,s=state(this),bet=wager(this);if(!canPlay(this)||!casino||s.busy||this.gold<bet)return false;
 const result=rollSlots(Math.random,bet);casino.slot=result;this.gold+=result.payout-bet;s.net+=result.payout-bet;remember(this,'slot',result);sound.playTap();
 animation(this,'slot',3,()=>{payoutComment(this,result.payout,bet,result.wins.some(w=>['seven','gem'].includes(w.key)));if(result.payout)sound.playItem();});return true;
 },
 shuffleCasinoArena() {
 const s=state(this);if(s.busy||!canPlay(this))return false;s.arena=chooseArena(this);s.fight=null;s.bigWin=false;s.arenaProgress=0;speak(this,s.arena?.soldiers[0][0]);refresh(this);return !!s.arena;
 },
 betCasinoArena(side) {
 const s=state(this),match=s.arena,bet=wager(this),eligible=new Set(arenaCandidates(this));
 if(!canPlay(this)||s.busy||!match||s.fight||![0,1].includes(side)||this.gold<bet||!match.soldiers.flat().every(u=>eligible.has(u)))return false;
 const result=simulateArena(match.teams,Math.random,true),payout=side===result.winner?Math.round(bet*match.odds[side]):0;
 this.gold+=payout-bet;s.net+=payout-bet;recordArena(match,result.winner);
 s.fight={...result,payout,bet};s.bigWin=false;s.arenaProgress=0;s.busy='arena';speak(this,match.soldiers[side][0]);
 const started=Date.now(),tick=()=>{if(states.get(this)!==s||s.busy!=='arena')return;s.arenaProgress=Math.min(1,(Date.now()-started)/(CASINO_POLICY.arenaSeconds*1000));if(s.arenaProgress>=1)this.finishCasinoArena();else {refresh(this);setTimeout(tick,250);}};
 refresh(this);setTimeout(tick,250);return true;
 },
 finishCasinoArena() {
 const s=state(this);if(s.busy!=='arena')return false;s.busy=null;s.arenaProgress=1;
 const {winner,payout,bet}=s.fight,result=`${winner?'青組':'赤組'}の勝ち（${s.arena.teams[winner].map(p=>p.name).join('・')}）`;
 const big=payout>=bet*CASINO_POLICY.bigWinMultiple;s.bigWin=big;remember(this,'arena',{result,payout,bet});speak(this,s.arena.soldiers[winner][0],big,big);sound.playItem();if(big)setTimeout(()=>sound.playItem(),180);refresh(this);return true;
 },
 renderCasino(panel) {
 const s=state(this),root=document.createElement('section');root.className='town-facility casino-panel';
 if(!s.root?.isConnected){s.page='lobby';s.net=0;}s.root=root;panel.append(root);draw(this,root);
 }
};
