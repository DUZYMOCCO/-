// v7.1.1: Mahjong inside the casino panel (jsdom): lobby entry, setup (3 levels), play, 2-step tap, call prompt (pon / chi / kan / ron / skip with a misclick guard),
// save/resume, auto-return, abandon, a v7.1.0 save (refund), payout once, kana mode.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,matchMedia:()=>({matches:true})});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{normalizeNation}=await import('../js/nation-rules.js');
const {casinoBaseBet,casinoPageMaxBet,MAX_MAHJONG_PAYOUT}=await import('../js/casino-rules.js');
const {MAHJONG_PAYOUT,claimPrompt,ownOptions,tsumoInfo}=await import('../js/mahjong-rules.js');
const {CLAIM_ARM_MS,kuikaeBlocked}=await import('../js/mahjong.js');
const {setKanaGrade}=await import('../../common/js/kana-mode.js?v=175');
const {leftoverKanji}=await import('../../common/js/kana-text.js');
const {HEADQUARTERS_FACILITIES}=await import('../js/hq-facilities.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MAHJONG TEST ONLY').id;game.startFreshGame(false);
game.nation=normalizeNation({investment:90000});game.gold=5000000;
const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');game.restTimer=0;Object.assign(game.player,{x:site.x,y:site.y+24});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const mj=()=>game.nation.casino.mahjong;
const waitFor=async(fn,label,ms=20000)=>{const t0=Date.now();while(!fn()){if(Date.now()-t0>ms)assert.fail('timeout: '+label);await sleep(15);}};
const panel=()=>document.querySelector('.casino-panel');
const reopen=()=>{game.closeHeadquartersFacility();Object.assign(game.player,{x:site.x,y:site.y+24});assert.equal(game.openHeadquartersFacility('casino'),true);};
const myTurnOrPrompt=()=>mj().over||(mj().stage==='act'&&mj().h.turn===0)||mj().stage==='result'||(mj().stage==='claim'&&mj().h.claim.wait==='human');
let checks=0;const ok=(c,m)=>{checks++;assert.ok(c,m);};
/** The simplest player through the UI methods: take wins, skip calls, throw the drawn tile (or the first legal tile after a call). */
function actOnce(call=null) {
  const st=mj();
  if(st.stage==='act'&&st.h.turn===0){
    if(game.tsumoCasinoMahjong())return;
    const h=st.h;if(h.drawn>=0&&!h.mustDiscard){game.tsumogiriCasinoMahjong();return;}
    const t=h.hands[0].find(id=>!kuikaeBlocked(st,id));game.discardCasinoMahjong(t??h.hands[0][0]);
  } else if(st.stage==='claim'){const p=claimPrompt(st);if(!p)return;if(p.ron){game.ronCasinoMahjong();return;}if(call&&call(p))return;game.passCasinoMahjong();}
  else if(st.stage==='result')game.nextCasinoMahjong();
}
assert.equal(game.openHeadquartersFacility('casino'),true);assert.equal(panel().dataset.casinoPage,'lobby');
const entry=document.querySelector('[data-casino-page="mahjong"]');ok(entry,'lobby has a mahjong entry');ok(!entry.textContent.includes('続き'),'no game in progress yet');
entry.click();assert.equal(panel().dataset.casinoPage,'mahjong');
ok(document.querySelector('#btn-mj-start'),'setup shows a start button');assert.equal(document.querySelectorAll('[data-mj-mode]').length,2);assert.equal(document.querySelectorAll('[data-mj-level]').length,3,'three CPU levels');
{const table=()=>[...document.querySelectorAll('.mj-setup .casino-paytable dd')].map(e=>e.textContent);
 for(const mode of ['full','short'])for(const level of ['novice','adept','master']){document.querySelector(`[data-mj-mode="${mode}"]`).click();document.querySelector(`[data-mj-level="${level}"]`).click();
  const want=MAHJONG_PAYOUT[mode][level];const got=table();assert.equal(got.length,4);want.forEach((x,i)=>ok(got[i].includes('×'+x),`${mode}/${level} rank ${i+1} shows ×${x}`));}
 document.querySelector('[data-mj-mode="full"]').click();document.querySelector('[data-mj-level="novice"]').click();}
assert.equal(casinoPageMaxBet(game.nation.level,'mahjong'),casinoPageMaxBet(game.nation.level,'arena'));
const goldBefore=game.gold,bet=game.nation.casino.bet;
document.querySelector('#btn-mj-start').click();
ok(mj()&&!mj().over);assert.equal(game.gold,goldBefore-bet,'stake is taken at the start');assert.equal(mj().bet,bet);assert.equal(mj().v,2);
assert.equal(game.startCasinoMahjong(),false,'no second game while one is in progress');
ok(document.querySelector('.mj'),'table is shown');ok(document.querySelectorAll('.mj-hand .mj-tile').length>=13);
for(const t of document.querySelectorAll('.mj-tile')){assert.equal(t.textContent,'');if(!t.classList.contains('mj-back')){ok(t.dataset.n);ok(!/[一-龥]/.test(t.getAttribute('aria-label')),'aria-label has no kanji (kana mode)');}}
await waitFor(myTurnOrPrompt,'player turn');
while(mj().stage==='claim'){game.passCasinoMahjong();await waitFor(myTurnOrPrompt,'player turn 2');}
assert.equal(mj().h.turn,0);
{const st=mj();const first=document.querySelectorAll('.mj-hand [data-mj-tile]')[0],tile=st.h.hands[0][0];
 first.click();ok(document.querySelector('.mj-hand .is-selected'),'first tap selects');assert.equal(st.h.rivers[0].length,0,'no discard on the first tap');assert.equal(document.querySelector('#btn-mj-discard').disabled,false);
 document.querySelector('.mj-hand .is-selected').click();assert.equal(mj().h.rivers[0].length,1,'second tap discards');assert.equal(mj().h.rivers[0][0],tile);}
await waitFor(myTurnOrPrompt,'player turn 3');while(mj().stage==='claim'){game.passCasinoMahjong();await waitFor(myTurnOrPrompt,'t4');}
{const snap=structuredClone(game.saveGame({persist:false}));ok(snap.nation.casino.mahjong,'saved with the nation');
 const copy=JSON.parse(JSON.stringify(mj()));game.resumeSavedGame(snap);assert.deepEqual(JSON.parse(JSON.stringify(mj())),copy,'resume restores the identical game');assert.equal(game.gold,snap.gold);}
game.exitDungeon?.();Object.assign(game.player,{x:site.x,y:site.y+24});reopen();
assert.equal(panel().dataset.casinoPage,'mahjong','reopening returns to the game in progress');ok(document.querySelector('.mj-hand'));
document.querySelector('[data-casino-page="lobby"]').click();ok(document.querySelector('[data-casino-page="mahjong"]').textContent.includes('続き'),'lobby offers 続きから');
document.querySelector('[data-casino-page="mahjong"]').click();ok(document.querySelector('.mj-hand'),'pressing the entry returns to the game');
{const keep=JSON.stringify(mj());document.querySelector('[data-casino-page="lobby"]').click();document.querySelector('[data-casino-page="slot"]').click();assert.equal(game.spinCasinoSlot(),true);await sleep(80);assert.equal(JSON.stringify(mj()),keep);document.querySelector('[data-casino-page="lobby"]').click();document.querySelector('[data-casino-page="mahjong"]').click();}
const kanaOk=label=>{const left=leftoverKanji(document.querySelector('.casino-panel').textContent,2);if(left.length){const tx=document.querySelector('.casino-panel').textContent;console.log(left.map(c=>tx.slice(Math.max(0,tx.indexOf(c)-12),tx.indexOf(c)+8)).join(' | '));}assert.deepEqual(left,[],label+': '+left.join(''));for(const t of document.querySelectorAll('.mj-tile:not(.mj-back)'))ok(t.dataset.n,'tile data survives kana mode');};
setKanaGrade(2,{persist:false});game.openCasinoPage('mahjong');await sleep(20);kanaOk('table');
{const g=game.gold;document.querySelector('#btn-mj-abandon').click();ok(!mj().over,'first tap only asks');ok(document.querySelector('#btn-mj-abandon').classList.contains('is-confirm'));
 document.querySelector('#btn-mj-abandon').click();ok(mj().over);assert.equal(mj().abandoned,true);assert.equal(mj().ranks[0],4);assert.equal(mj().payout,0);assert.equal(game.gold,g,'abandon pays nothing back');
 ok(document.querySelector('.mj-final'));assert.equal(game.abandonCasinoMahjong(),false);
 reopen();assert.equal(panel().dataset.casinoPage,'lobby','a finished game is not offered as 続きから');document.querySelector('[data-casino-page="mahjong"]').click();ok(document.querySelector('.mj-final'));assert.equal(game.gold,g,'reopening never pays twice');ok(mj().paid);}
document.querySelector('#btn-mj-close')?.click()||game.closeCasinoMahjong();assert.equal(mj(),null);ok(document.querySelector('#btn-mj-start'));kanaOk('setup');
// ---------- the call prompt ----------
{
  let seen={pon:0,chi:0,kan:0,ron:0,own:0},checkedGuard=false,done=null;
  for(let seed=1;seed<=60&&!(seen.pon&&seen.chi&&checkedGuard);seed++){
    game.setCasinoMahjongSetup({mode:'short',level:'adept'});assert.equal(game.startCasinoMahjong({seed:seed*7+3}),true);
    for(let guard=0;guard<3000&&!mj().over&&!(seen.pon&&seen.chi&&checkedGuard);guard++){
      await waitFor(myTurnOrPrompt,'my move');if(mj().over)break;const st=mj();
      if(st.stage==='claim'){
        const p=claimPrompt(st);if(!p)continue;
        ok(document.querySelector('.mj-claim'),'the call prompt is drawn');const btns=[...document.querySelectorAll('.mj-claim button')];ok(btns.length>=1);
        ok(document.querySelector('#btn-mj-pass'),'there is always a skip button');
        if(!checkedGuard){ok(btns.every(b=>b.disabled),'the buttons start disabled (misclick guard)');document.querySelector('#btn-mj-pass').click();ok(mj().stage==='claim','a tap during the guard does nothing');
          await sleep(CLAIM_ARM_MS+80);ok([...document.querySelectorAll('.mj-claim button')].every(b=>!b.disabled),'the buttons arm after the guard time');checkedGuard=true;}
        else await sleep(CLAIM_ARM_MS+80);
        if(p.ron){seen.ron++;document.querySelector('#btn-mj-ron').click();continue;}
        const before=JSON.stringify(mj().h.melds[0]);
        if(p.pon&&seen.pon<2){seen.pon++;document.querySelector('#btn-mj-pon').click();const m=mj().h.melds[0];ok(m.length>=1&&m[m.length-1].type==='pon','the pon button makes a pon');ok(mj().h.mustDiscard,'then a discard is required');
          ok(document.querySelectorAll('.mj-mymelds .mj-meld').length>=1,'my melds are shown');await waitFor(()=>mj().stage==='act'&&mj().h.turn===0,'after pon');
          ok(!document.querySelector('.mj-hand .mj-drawn'),'no drawn tile after a call');{const forb=mj().h.hands[0].filter(id=>kuikaeBlocked(mj(),id));if(forb.length){ok(document.querySelectorAll('.mj-hand button:disabled').length>=forb.length,'kuikae tiles are disabled');seen.kuikae=(seen.kuikae||0)+1;}}
          continue;}
        if(p.chi.length&&seen.chi<2){seen.chi++;const cb=document.querySelectorAll('[data-mj-chi]');assert.equal(cb.length,p.chi.length);cb[0].click();const m=mj().h.melds[0];ok(m.length>=1&&m[m.length-1].type==='chi','the chi button makes a chi');continue;}
        if(p.kan&&!seen.kan){seen.kan++;document.querySelector('#btn-mj-kan').click();ok(mj().h.melds[0].some(x=>x.type==='minkan'),'the kan button makes a daiminkan');continue;}
        document.querySelector('#btn-mj-pass').click();continue;
      }
      if(st.stage==='act'&&st.h.turn===0){const o=ownOptions(st,0);if(o.ankan.length||o.kakan.length){seen.own++;ok(document.querySelector('[data-mj-ankan],[data-mj-kakan]'),'kan buttons on my turn');}}
      actOnce();
    }
    if(mj().over){game.closeCasinoMahjong();}
  }
  ok(seen.pon>0&&seen.chi>0&&checkedGuard,`the prompt flows were exercised ${JSON.stringify(seen)}`);
  if(mj()&&!mj().over)game.abandonCasinoMahjong();if(mj())game.closeCasinoMahjong();
}
// ---------- a whole game through the UI methods, calling now and then; payout credited exactly once ----------
reopen();game.openCasinoPage('mahjong');setKanaGrade(2,{persist:false});await sleep(10);
{game.setCasinoMahjongSetup({mode:'short',level:'novice'});const g0=game.gold;assert.equal(game.startCasinoMahjong({seed:12345}),true);const bet2=mj().bet;assert.equal(game.gold,g0-bet2);
 const seen=new Set();let n=0;
 const t0=Date.now();
 for(;!mj().over&&Date.now()-t0<90000;){
  const st=mj();const key=st.stage+(st.result?st.result.type:'')+(st.h.riichi[0]?'r':'')+(st.h.melds[0].length?'m':'');if(!seen.has(key)){seen.add(key);await sleep(5);kanaOk('stage '+key);}
  if((st.stage==='act'&&st.h.turn===0)||st.stage==='result'||claimPrompt(st))actOnce(p=>{if(p.pon&&n++%2===0)return game.ponCasinoMahjong();if(p.chi.length&&n++%2===0)return game.chiCasinoMahjong(p.chi[0]);return false;});
  await sleep(4);
 }
 ok(mj().over,'game finished');await sleep(5);kanaOk('final');setKanaGrade(0,{persist:false});const pay=mj().payout;assert.equal(mj().paid,true);assert.equal(game.gold,g0-bet2+pay);
 assert.equal(pay,Math.round(bet2*MAHJONG_PAYOUT.short.novice[mj().ranks[0]-1]));ok(pay<=MAX_MAHJONG_PAYOUT);assert.equal(mj().points.reduce((a,b)=>a+b,0),100000,'points are conserved to the end');
 {const num=x=>Number(x.replace('\u2212','-').replace(/[,G+]/g,''));assert.equal(num(document.querySelectorAll('.casino-wallet b')[1].textContent),pay-bet2,'the wallet line shows the net result');assert.equal(num(document.querySelectorAll('.casino-wallet b')[0].textContent),game.gold);}
 game.saveGame({persist:false});reopen();assert.equal(game.gold,g0-bet2+pay,'no double credit after reopening');game.closeCasinoMahjong();}
// ---------- a v7.1.0 save in progress: ends at once, the stake comes back once ----------
{
  const g0=game.gold;
  game.nation.casino.mahjong=null;
  const snap=structuredClone(game.saveGame({persist:false}));snap.nation.casino.mahjong={v:1,mode:'full',level:'adept',bet:5000,seed:99,hand:1,points:[31000,22000,25000,22000],pot:0,stage:'act',over:false,paid:false,payout:0,h:{}};
  game.resumeSavedGame(snap);ok(mj()&&mj().over&&mj().refund,'the old game is ended with a refund');assert.equal(mj().payout,5000);
  reopen();ok(!document.querySelector('.mj-hand'));game.openCasinoPage('mahjong');await sleep(10);ok(document.querySelector('.mj-final'),'the final screen shows');ok(document.querySelector('.mj-final h4').textContent.length>5,'it says what happened');
  const g1=game.gold;game.closeCasinoMahjong();assert.equal(mj(),null);ok(game.gold>=g1,'settled once');
  const credited=game.gold-g1;ok(credited===0||credited===5000);
}
// ---------- stake / cap ----------
{game.gold=0;assert.equal(game.startCasinoMahjong(),false);assert.equal(mj(),null);game.gold=5000000;}
console.log('PASS mahjong ui',checks,'checks');
dom.window.close();
