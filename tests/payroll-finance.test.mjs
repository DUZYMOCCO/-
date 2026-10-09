import assert from 'node:assert/strict';
import {salaryQuote,equipmentUpgradeCost,createPayrollPlan,paySoldiers} from '../js/games/iron-squad/payroll-rules.js';
import {calcAllRankerBonuses,calcSoldierRankerBonus,rankerSalaryBonus} from '../js/games/iron-squad/troop-rankings.js';
import {nationalPayroll,nationalPayrollPlan,nationalIncome,nationalSalaryReserve,normalizeNation,fiscalTotals} from '../js/games/iron-squad/nation-rules.js';
import {emptyFiscalLedger,calcCommanderStipend,formatFiscalReportHtml} from '../js/games/iron-squad/economy-rules.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {advanceRest} from '../js/games/iron-squad/phase-rules.js';
const gear=(id,tier,upgrade,type='WEAPON')=>({id,type,tier,upgrade,name:id,stats:{atk:100,def:20},baseStats:{atk:100,def:20}});
const armyUnit=(id,tier,upgrade,level=1)=>({id,soldierClass:'HEAVY',level,talent:'AVERAGE',gold:0,hp:100,maxHp:100,atk:100,def:20,equipped:Object.fromEntries(['weapon','armor','helmet','shield','gloves','legs','amulet'].map(key=>[key,gear(`${id}-${key}`,tier,upgrade,key.toUpperCase())]))});
const sample=[];
for(const [tier,upgrade,level,development] of [[1,0,1,0],[16,10,25,2],[28,100,100,5],[28,1000,250,5],[28,10000,1000,5]]){
  const s=armyUnit('sample',tier,upgrade,level),game={nation:{level:development}},quote=salaryQuote(s,game),cost=equipmentUpgradeCost(s.equipped.weapon),bonus=rankerSalaryBonus(game,s,1);
  assert.ok(quote.total>=cost*.6,'regular earnings keep pace with the unlimited price curve');
  assert.ok(cost/quote.total<1.67,'even +10000 does not stretch routine improvement into hundreds of waves');
  assert.ok(bonus>=quote.total*.5&&bonus>=50,'a first place honor scales with the actual income');
  sample.push({tier,upgrade,level,development,cost,regular:quote.total,oneFirstBonus:bonus,wavesPerUpgrade:Math.round(cost/quote.total*100)/100});
}
assert.equal(salaryQuote({level:1,soldierClass:'HEAVY'}).total,20,'unequipped recruits retain minimum basic pay');
assert.equal(salaryQuote(armyUnit('new',1,0)).total,32,'early standard equipment has a modest 12G maintenance allowance');
assert.ok(salaryQuote({...armyUnit('promoted',1,0),soldierClass:'PALADIN'}).total>32,'promotions pay for the role');

const ace={...armyUnit('ace',28,100,100),survivedWaves:10,minionKills:100,bossKills:5,healingHp:1000,magicPower:50,strength:50,quickness:50,magicDef:50,dodge:20};
const regular=armyUnit('regular',1,0),dead={...armyUnit('dead',28,10000),dead:true};
const game={squad:[ace,regular,dead],reserves:[ace],nation:{level:5},treasury:0,phaseFiscal:emptyFiscalLedger(1)};
const plan=nationalPayrollPlan(game);
assert.equal(plan.entries.length,2,'dead units and duplicate roster references are never paid');
assert.equal(plan.ranker,calcSoldierRankerBonus(game,ace.id).totalBonus,'single-person UI and batched payroll use the same growing award');
assert.equal(nationalPayroll(game),plan.total);
const gross=nationalIncome(game,1,2,plan),stipend=calcCommanderStipend(1,gross,game);
assert.ok(gross-stipend-plan.total>=3000+plan.total*.25-1,'funding includes every salary and a declared operating margin');
game.treasury=gross-stipend;const before=game.treasury,result=paySoldiers(game,plan,1);
assert.equal(result.shortfall,0);assert.equal(before-game.treasury,result.paid);assert.equal(ace.gold+regular.gold,result.paid);
assert.equal(game.phaseFiscal.salariesPaid,result.paid);assert.equal(game.phaseFiscal.rankerBonusesPaid,result.rankerPaid);
assert.match(formatFiscalReportHtml(game.phaseFiscal),/ランカー栄誉手当/);
const poor={squad:[{id:'a',gold:0},{id:'b',gold:0}],treasury:15,phaseFiscal:emptyFiscalLedger(1)};
const poorPlan=createPayrollPlan(poor,new Map([['a',{totalBonus:50}]]));
const short=paySoldiers(poor,poorPlan,1);
assert.equal(poor.treasury,0);assert.equal(poor.squad.reduce((n,s)=>n+s.gold,0),15);assert.equal(short.rankerPaid,0,'regular wages have priority during a real shortage');assert.equal(short.shortfall,75);assert.ok(Math.abs(poor.squad[0].gold-poor.squad[1].gold)<=1,'the final gold is distributed fairly');

const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats}=await import('../js/games/iron-squad/index.js');
const real=Object.create(IronSquadGame);
for(const method of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])real[method]=()=>{};
real.activeSlotId=saveSlots.create('PAYROLL TEST ONLY').id;real.startFreshGame(false);
const starting=structuredClone(real.saveGame());
// A large reserve army makes a development promotion raise the whole future payroll.
real.squad=Array.from({length:1000},(_,i)=>({id:`reserve-fiscal-${i}`,soldierClass:'HEAVY',level:1,gold:0}));real.reserves=[];
real.nation=normalizeNation({investment:5999});real.treasury=60000;real.phaseFiscal=emptyFiscalLedger(1,60000);
real.investNation();assert.equal(real.nation.level,0,'the city promotion waits until its higher salaries are funded');assert.ok(real.treasury>=nationalSalaryReserve(real));
real.treasury=150000;real.investNation();assert.equal(real.nation.level,1);assert.ok(real.treasury>=nationalSalaryReserve(real),'development never consumes the new payroll reserve');
real.resumeSavedGame(structuredClone(starting));
const simulate=(label,waves)=>{
  let upgrades=0,paid=0,rankerPaid=0;
  for(let i=0;i<waves;i++){
    for(const s of [...real.squad,...real.reserves])if(!s.isDown)s.hp=s.maxHp;
    const count=[...real.squad,...real.reserves].filter(s=>!s.dead).length;
    const start=real.phaseFiscal.startBalance;real.completePhase();
    const ledger=real.lastFiscalReport;
    assert.equal(ledger.salaryHeadcount,count);assert.equal(ledger.salaryShortfall,0);
    assert.equal(ledger.endBalance-start,fiscalTotals(ledger).net,'the real wave reconciles every transferred gold');
    assert.equal(ledger.salariesPaid,ledger.basicSalariesPaid+ledger.maintenanceAllowancesPaid+ledger.rankerBonusesPaid);
    assert.ok(real.treasury>=nationalSalaryReserve(real),'public spending preserves the complete 2.5-cycle salary and honor reserve');
    const phase=real.phase,balances=[...real.squad,...real.reserves].map(s=>s.gold);real.completePhase();
    assert.equal(real.phase,phase);assert.deepEqual([...real.squad,...real.reserves].map(s=>s.gold),balances,'rest cannot repay salaries or ranker money');
    paid+=ledger.salariesPaid;rankerPaid+=ledger.rankerBonusesPaid;
    advanceRest(real,8);upgrades+=real.restReport.count;
  }
  assert.ok(upgrades>0,`${label}: routine personal improvement continues`);
  return {label,waves,paid,rankerPaid,upgrades,treasury:real.treasury,fullPayroll:nationalPayroll(real),reserveTarget:nationalSalaryReserve(real)};
};
const runs=[simulate('fresh progression',60)];
real.resumeSavedGame(structuredClone(starting));real.nation=normalizeNation({investment:180000,armament:{techTier:28}});
for(const s of real.squad){s.level=100;s.survivedWaves=50;s.minionKills=100;for(const item of Object.values(s.equipped))if(item){item.tier=28;applyUpgradeStats(item,100);}real.recalcSoldierStats(s);s.hp=s.maxHp;}
real.treasury=nationalSalaryReserve(real)*2;real.phaseFiscal=emptyFiscalLedger(real.phase,real.treasury);
runs.push(simulate('mature T28 +100 army',24));
real.completePhase();const saved=structuredClone(real.saveGame()),wallets=[...real.squad,...real.reserves].map(s=>s.gold),treasury=real.treasury;
real.resumeSavedGame(saved);assert.equal(real.treasury,treasury);assert.deepEqual([...real.squad,...real.reserves].map(s=>s.gold),wallets,'loading never repeats the new payments');assert.deepEqual(real.lastFiscalReport,saved.lastFiscalReport);
console.log(JSON.stringify({sample,runs}));
console.log('PASS: unlimited-price wages and growing ranker honors, real treasury transfers, fair shortages, no duplicate pay, complete fiscal accounting, 60 fresh waves, 24 mature waves and save/resume');
