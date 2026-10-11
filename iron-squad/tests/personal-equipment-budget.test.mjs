import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {normalizeNation,fiscalTotals} from '../js/nation-rules.js';
import {standardEquipmentCost,personalEquipmentBudget} from '../js/armament-rules.js';
import {formatFiscalReportJa,formatFiscalReportHtml} from '../js/economy-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:375,height:780,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('PERSONAL EQUIPMENT BUDGET TEST').id;game.startFreshGame(false);
const base=structuredClone(game.saveGame());
function buyer(id,gold){
  const s=game.createNewSoldier(null,{classKey:'LIGHT'});s.id=id;s.gold=gold;s.equipped={};s.weapon=null;
  s.attributeProfile.innate.strength=10000;game.recalcSoldierStats(s);return s;
}
const gearCost=standardEquipmentCost({tier:21}),lowCost=standardEquipmentCost({tier:1});
for(const balance of [0,10000000]){
  game.resumeSavedGame(structuredClone(base));game.closeStrategyModal();game.sharedEquipBox=[];game.reserves=[];
  const poor=buyer('poor',0),limited=buyer('limited',lowCost+6),rich=buyer('rich',gearCost*7+6);
  game.squad=[poor,limited,rich];game.gold=10000000;game.treasury=balance;game.phase=2;
  game.nation=normalizeNation({investment:180000});
  const untouched=JSON.stringify(game.squad.map(s=>s.equipped));game.renderNationStatus();
  assert.equal(JSON.stringify(game.squad.map(s=>s.equipped)),untouched,'unlock and render cannot give equipment or charge anyone');
  assert.equal(game.nation.armament.techTier,21);
  const golds=game.squad.map(s=>s.gold),commanderGold=game.gold,result=game.supplyMissingEquipment();
  assert.deepEqual(poor.equipped,{});assert.equal(poor.gold,0,'other people and the treasury cannot fund the broke buyer');
  assert.equal(Object.values(limited.equipped).filter(Boolean).length,1);assert.equal(limited.equipped.weapon.tier,1);assert.equal(limited.gold,6,'one affordable item cannot become a free full set');
  assert.equal(Object.values(rich.equipped).filter(Boolean).length,7);assert.ok(Object.values(rich.equipped).every(item=>item.tier===21&&item.selfFunded));assert.equal(rich.gold,6);
  assert.equal(result.spent,lowCost+gearCost*7);assert.equal(result.funding,'personal');assert.equal(game.treasury,balance);assert.equal(game.gold,commanderGold);
  for(const [i,s]of game.squad.entries())assert.equal(golds[i]-s.gold,s.lastEquipmentPurchase.spent,'each personal purchase ledger reconciles to that wallet');
  assert.equal(game.phaseFiscal.equipmentProcurement,0);assert.equal(game.phaseFiscal.publicForging,0);
  assert.equal(game.phaseFiscal.personalEquipmentProcurement,result.spent);assert.equal(fiscalTotals(game.phaseFiscal).expenses,0,'personal spending is not charged to the public ledger twice');
  assert.ok(formatFiscalReportJa(game.phaseFiscal).includes(`兵士の自費調達・強化 ${result.spent.toLocaleString()}G`));
  assert.ok(formatFiscalReportHtml(game.phaseFiscal).includes(`装備調達 ${result.spent.toLocaleString()}G`));
  const saved=structuredClone(game.saveGame());game.resumeSavedGame(saved);
  const ownership=JSON.stringify(game.squad.map(s=>[s.gold,s.equipped]));game.supplyMissingEquipment();assert.equal(JSON.stringify(game.squad.map(s=>[s.gold,s.equipped])),ownership,'resume cannot buy or pay twice within the phase');
  const beforePoor=game.squad.find(s=>s.id==='poor');beforePoor.gold=lowCost+6;game.phase++;game.supplyMissingEquipment();
  assert.equal(beforePoor.gold,6);assert.equal(Object.values(beforePoor.equipped).filter(Boolean).length,1,'an individual can buy after receiving enough personal funds');
}
// A well equipped broke soldier also keeps their old weapon when a new generation opens.
game.resumeSavedGame(structuredClone(base));game.closeStrategyModal();game.sharedEquipBox=[];game.reserves=[];
const veteran=buyer('veteran',0);veteran.equipped.weapon=game.createSupplyEquipment('WEAPON',veteran,1);veteran.weapon=veteran.equipped.weapon;
game.squad=[veteran];game.nation=normalizeNation({investment:180000});game.treasury=10000000;game.phase=2;
const original=structuredClone(veteran.equipped.weapon);game.supplyMissingEquipment();assert.deepEqual(veteran.equipped.weapon,original);assert.equal(veteran.gold,0);
for(const n of [0,-100,5,6,Infinity,NaN])assert.equal(personalEquipmentBudget({gold:n}),0);
assert.equal(personalEquipmentBudget({gold:100}),94);
assert.match(document.getElementById('nation-status').textContent,/各兵士の所持G/);assert.match(document.getElementById('nation-facilities').textContent,/購入には各自のGが必要/);
console.log('PASS: unlock without delivery, independent poor/limited/rich wallets, zero/rich public treasuries, exact personal charges and public reconciliation, retained old weapon, six-gold buffer, saved phase guard, later funded purchase, explicit UI');
dom.window.close();
