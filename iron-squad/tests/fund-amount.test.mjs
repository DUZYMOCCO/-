import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {fundLadderAmounts,formatFundKanji,donatePresetAmounts,normalizeFundAmount} from '../js/economy-rules.js';
// ladder: 1/5 steps from 100 up to the first step at or above the wallet
assert.deepEqual(fundLadderAmounts(2500),[100,500,1000,5000]);
const big=fundLadderAmounts(34000000);assert.equal(big.at(-1),50000000);assert.ok(big.includes(10000000)&&big.includes(5000000));assert.ok(big.every((n,i)=>!i||n>big[i-1]));
assert.equal(fundLadderAmounts(34000000).length,12);const huge=fundLadderAmounts(3400000000);assert.ok(!huge.includes(100)&&huge.includes(5000000)&&huge.at(-1)===5000000000,'small steps are trimmed');
assert.equal(fundLadderAmounts(34000000,[7777]).includes(7777),true,'kept amount stays');assert.equal(fundLadderAmounts(34000000,[100]).includes(100),true);
assert.equal(fundLadderAmounts(0).at(-1),100);assert.ok(fundLadderAmounts(Number.MAX_SAFE_INTEGER).at(-1)<=1e16);
assert.deepEqual(['100','1千','1万','10万','1千万','5千万','1億','12億'].map(String),[100,1000,10000,100000,10000000,50000000,100000000,1200000000].map(n=>formatFundKanji(n).replace('G','')));
assert.equal(formatFundKanji(2500),'2,500G');assert.equal(formatFundKanji(12345678),'12,345,678G');
assert.ok(donatePresetAmounts(34000000).includes(50000000)&&donatePresetAmounts(34000000).includes(10000000));
assert.equal(normalizeFundAmount('max'),'max');assert.equal(normalizeFundAmount('abc'),'');assert.equal(normalizeFundAmount(-5),'');assert.equal(normalizeFundAmount(5000),'5000');
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('FUND TEST').id;g.startFreshGame(false);g.openStrategyModal(true);g._selectStratTab('troops');
for(let i=0;i<2;i++){const m=g.createNewSoldier();m.isPersonalGuard=true;g.squad.push(m);}
g.gold=34000000;g.renderStrategyUI();
const sels=()=>[...document.querySelectorAll('.select-soldier-fund')];
assert.ok(sels().length>=1,'soldier fund selects render');
const vals=sels()[0].options?[...sels()[0].options].map(o=>o.value):[];assert.equal(vals.at(-1),'max');assert.ok(vals.includes('50000000'));assert.equal(sels()[0].value,'100');
// choose in one row: remembered for re-render, other rows, and donate screen does not change it
sels()[0].value='5000000';sels()[0].dispatchEvent(new window.Event('change'));assert.equal(g.soldierFundAmount,'5000000');
for(const s of sels())assert.equal(s.value,'5000000');
g.renderStrategyUI();for(const s of sels())assert.equal(s.value,'5000000','kept across re-render');
const donate=document.getElementById('select-global-fund-amount');donate.value='1000000';donate.dispatchEvent(new window.Event('change'));assert.equal(g.donateFundAmount,'1000000');assert.equal(g.soldierFundAmount,'5000000');
g.renderStrategyUI();assert.equal(document.getElementById('select-global-fund-amount').value,'1000000','donate pick kept, not overwritten by suggestion');for(const s of sels())assert.equal(s.value,'5000000');
// remembered amount above current wallet stays selected
g.gold=3000;g.renderStrategyUI();for(const s of sels())assert.equal(s.value,'5000000');assert.equal(document.getElementById('select-global-fund-amount').value,'1000000');
// max stays max
sels()[0].value='max';sels()[0].dispatchEvent(new window.Event('change'));g.renderStrategyUI();for(const s of sels())assert.equal(s.value,'max');
// save / load
g.saveGame({auto:true});const saved=saveSlots.get(g.activeSlotId).data;assert.equal(saved.soldierFundAmount,'max');assert.equal(saved.donateFundAmount,'1000000');
g.soldierFundAmount='100';g.donateFundAmount='';
g.resumeSavedGame(structuredClone(saved));assert.equal(g.soldierFundAmount,'max');assert.equal(g.donateFundAmount,'1000000');
g._syncTroopsSubView('roster');g.renderStrategyUI();for(const s of sels())assert.equal(s.value,'max','loaded amount selected');
// fundSoldier exact and overflow-safe
g.gold=2e15;const sol=g.squad.find(x=>g.isPersonalSquadSoldier(x));if(sol){sol.gold=Number.MAX_SAFE_INTEGER-10;g.fundSoldier(sol.id,'max');assert.ok(sol.gold<=Number.MAX_SAFE_INTEGER);}
dom.window.close();console.log('PASS: fund ladder, kanji labels, remembered soldier/donate amounts, save, over-wallet and max');
