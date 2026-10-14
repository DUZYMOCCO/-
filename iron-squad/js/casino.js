import {casinoBaseBet,MAX_CASINO_BET,validCasinoBet,normalizeCasinoBet,POKER_PAYOUTS,SLOT_SYMBOLS,dealPoker,finishPoker,cardFace} from './casino-rules.js?v=201';
import {rollSlots} from './casino-rules.js?v=201';
import {atFacility} from './hq-facilities.js?v=264';
const canPlay=game=>atFacility(game,'casino',0);
const wager=game=>Math.max(casinoBaseBet(game.nation?.level),normalizeCasinoBet(game.nation?.casino?.bet));
function persist(game) {game.saveGame?.({background:true});game.updateStatsUI?.(true);game.renderStrategyUI?.();}
const money=n=>`${n.toLocaleString()}G`;
const profit=(payout,bet)=>`${payout-bet>=0?'+':''}${money(payout-bet)}`;
export const casinoMethods={
  setCasinoBet(value) {
    if(!this.nation?.casino||!validCasinoBet(value,casinoBaseBet(this.nation.level)))return false;
    this.nation.casino.bet=Number(value);persist(this);return true;
  },
  startCasinoPoker() {
    const casino=this.nation?.casino,phase=this.phase||1;
    const bet=wager(this);
    if(!canPlay(this)||!casino||casino.poker?.status==='draw'||casino.pokerPhase>=phase||this.gold<bet)return false;
    const hand=dealPoker(phase,Math.random,bet);this.gold-=bet;casino.poker=hand;casino.pokerPhase=phase;
    persist(this);return true;
  },
  holdCasinoCard(index) {
    const hand=this.nation?.casino?.poker;
    if(!canPlay(this)||hand?.status!=='draw'||!Number.isInteger(index)||index<0||index>=5)return false;
    hand.held[index]=!hand.held[index];persist(this);return true;
  },
  drawCasinoPoker() {
    const hand=this.nation?.casino?.poker;
    if(!canPlay(this)||hand?.status!=='draw')return false;
    const payout=finishPoker(hand);if(payout===false)return false;
    this.gold+=payout;this.showToast?.(`ポーカー：${hand.result} · 受取${money(payout)}（収支${profit(payout,hand.bet)}）`);
    persist(this);return true;
  },
  spinCasinoSlot() {
    const casino=this.nation?.casino,phase=this.phase||1;
    const bet=wager(this);
    if(!canPlay(this)||!casino||casino.slotPhase>=phase||this.gold<bet)return false;
    const result=rollSlots(Math.random,bet);this.gold-=bet;casino.slotPhase=phase;casino.slot=result;this.gold+=result.payout;
    this.showToast?.(`スロット：${result.result} · 受取${money(result.payout)}（収支${profit(result.payout,result.bet)}）`);
    persist(this);return true;
  },
  renderCasino(panel) {
    const casino=this.nation.casino,phase=this.phase||1,open=canPlay(this),hand=casino.poker,drawing=hand?.status==='draw',bet=wager(this),base=casinoBaseBet(this.nation.level);
    const cards=hand?hand.hand.map((id,i)=>{
      const face=cardFace(id),held=hand.held[i];
      return `<button type="button" class="poker-card ${face.red?'red':''}" data-poker-hold="${i}" aria-pressed="${held}" aria-label="${face.suit}${face.rank} ${held?'保持中':'交換'}" ${!open||!drawing?'disabled':''}><span>${face.rank}</span><b>${face.suit}</b><small>${drawing?(held?'保持':'交換'):'確定'}</small></button>`;
    }).join(''):Array.from({length:5},()=>'<div class="poker-card card-back" aria-hidden="true">◆</div>').join('');
    const slots=(casino.slot?.reels||['bell','seven','cherry']).map(id=>{const symbol=SLOT_SYMBOLS.find(s=>s.id===id);return `<span class="slot-reel" aria-label="${symbol.name}">${symbol.icon}</span>`;}).join('');
    panel.insertAdjacentHTML('beforeend',`<div class="town-facility casino-panel"><strong>カジノ · 発展Lv${this.nation.level}</strong><p>ポーカーとスロット。各1期に1回。基本の掛け金は${base}G。自由に増やせます。表示の倍率は受取額です。</p>
      ${open?'':'<p class="facility-note">本陣のカジノから遊べます。</p>'}
      <label class="workshop-choice">次の掛け金<input id="casino-bet" type="number" inputmode="numeric" min="${base}" max="${MAX_CASINO_BET}" step="1" value="${bet}"></label>
      <div class="casino-bet-actions"><button type="button" data-bet-add="${base}">＋${base}G</button><button type="button" data-bet-mult="2">2倍</button><button type="button" data-bet-mult="10">10倍</button></div>
      <p>所持金 ${money(this.gold||0)} · 次の掛け金 ${money(bet)}</p>
      <h5>ポーカー</h5><p>残すカードを押して「保持」にし、1回だけ交換できます。すべて保持でも確定できます。</p>
      <div class="poker-hand" role="group" aria-label="ポーカーのカード">${cards}</div>
      <p class="casino-result" aria-live="polite">${drawing?`この手の掛け金 ${money(hand.bet)} · 交換・確定してください。`:hand?`${hand.result} · 受取${money(hand.payout)}（収支${profit(hand.payout,hand.bet)}）`:'5つのカードで役を作ろう。'}</p>
      <button type="button" id="btn-casino-poker" ${!open||(!drawing&&(casino.pokerPhase>=phase||this.gold<bet))?'disabled':''}>${drawing?'カードを交換して確定':casino.pokerPhase>=phase?'今期のポーカーは終了':`ポーカーを始める · ${money(bet)}`}</button>
      <details class="casino-paytable"><summary>ポーカーの役と配当</summary><dl>${POKER_PAYOUTS.filter(row=>row.mult).map(row=>`<div><dt>${row.name}</dt><dd>${row.mult}倍</dd></div>`).join('')}</dl></details>
      <h5>スロット</h5><div class="slot-reels" role="group" aria-label="スロットのリール">${slots}</div>
      <p class="casino-result" aria-live="polite">${casino.slot?`${casino.slot.result} · 受取${money(casino.slot.payout)}（収支${profit(casino.slot.payout,casino.slot.bet)}）`:'3つ同じ絵柄で当たり。チェリーは2つでも受取あり。'}</p>
      <button type="button" id="btn-casino-slot" ${!open||casino.slotPhase>=phase||this.gold<bet?'disabled':''}>${casino.slotPhase>=phase?'今期のスロットは終了':`リールを回す · ${money(bet)}`}</button>
      <details class="casino-paytable"><summary>スロットの配当</summary><dl>${SLOT_SYMBOLS.map(s=>`<div><dt>${s.icon} ${s.name} ×3</dt><dd>${s.mult}倍</dd></div>`).join('')}<div><dt>🍒 チェリー ×2</dt><dd>1倍</dd></div></dl></details></div>`);
    for(const b of panel.querySelectorAll('[data-poker-hold]'))b.onclick=()=>this.holdCasinoCard(Number(b.dataset.pokerHold));
    panel.querySelector('#casino-bet').onchange=e=>{if(!this.setCasinoBet(e.target.value))this.renderStrategyUI();};
    panel.querySelector('[data-bet-add]').onclick=()=>this.setCasinoBet(Math.min(MAX_CASINO_BET,bet+base));
    for(const b of panel.querySelectorAll('[data-bet-mult]'))b.onclick=()=>this.setCasinoBet(Math.min(MAX_CASINO_BET,bet*Number(b.dataset.betMult)));
    panel.querySelector('#btn-casino-poker').onclick=()=>drawing?this.drawCasinoPoker():this.startCasinoPoker();
    panel.querySelector('#btn-casino-slot').onclick=()=>this.spinCasinoSlot();
  }
};
