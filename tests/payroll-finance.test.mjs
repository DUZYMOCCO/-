import assert from 'node:assert/strict';
import {salaryQuote,equipmentUpgradeCost,createPayrollPlan,paySoldiers} from '../js/games/iron-squad/payroll-rules.js';
import {calcSoldierRankerBonus} from '../js/games/iron-squad/troop-rankings.js';
import {nationalPayroll,nationalPayrollPlan,nationalIncome,nationalSalaryReserve,normalizeNation,fiscalTotals} from '../js/games/iron-squad/nation-rules.js';
import {emptyFiscalLedger,calcCommanderStipend,formatFiscalReportHtml} from '../js/games/iron-squad/economy-rules.js';
import {economicHonorBudget,economicPayrollBudget,tickEconomicConstruction} from '../js/games/iron-squad/regional-economy.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
import {advanceRest} from '../js/games/iron-squad/phase-rules.js';
const unit=id=>({id,soldierClass:'HEAVY',level:1,gold:0,hp:100,maxHp:100,atk:100,def:20,equipped:{weapon:{id:id+'-weapon',type:'WEAPON',tier:28,upgrade:0,stats:{atk:100}}}});
const regular=unit('regular'),ace={...unit('ace'),level:100,survivedWaves:10,minionKills:100,bossKills:5,healingHp:1000,magicPower:50,strength:50,quickness:50,magicDef:50,dodge:20};
const game={squad:[ace,regular,{...unit('dead'),dead:true}],reserves:[ace],nation:normalizeNation(),treasury:0,phaseFiscal:emptyFiscalLedger(1)};
const salary=salaryQuote(ace,game).total,baseIncome=nationalIncome(game),prices=[];
for(const upgrade of [0,10,100,1000,10000]){
  ace.equipped.weapon.upgrade=upgrade;const cost=equipmentUpgradeCost(ace.equipped.weapon);prices.push(cost);
  assert.equal(salaryQuote(ace,game).total,salary);assert.equal(nationalIncome(game),baseIncome);
}
assert.ok(prices.every((cost,i)=>i===0||cost>prices[i-1]));assert.ok(prices.at(-1)>10000000);
const plan=nationalPayrollPlan(game);assert.equal(plan.entries.length,2);
assert.equal(plan.ranker,calcSoldierRankerBonus(game,ace.id).totalBonus);assert.equal(nationalPayroll(game),plan.total);
assert.ok(plan.regular<=economicPayrollBudget(game));assert.ok(plan.ranker<=economicHonorBudget(game));
const stipend=calcCommanderStipend(1,baseIncome,game);game.treasury=baseIncome-stipend;
const before=game.treasury,result=paySoldiers(game,plan,1);
assert.equal(result.shortfall,0);assert.equal(before-game.treasury,result.paid);assert.equal(ace.gold+regular.gold,result.paid);
assert.equal(game.phaseFiscal.salariesPaid,result.paid);assert.equal(game.phaseFiscal.rankerBonusesPaid,result.rankerPaid);
assert.match(formatFiscalReportHtml(game.phaseFiscal),/ランカー栄誉手当/);
const poor={squad:[{id:'a',gold:0},{id:'b',gold:0}],treasury:15,phaseFiscal:emptyFiscalLedger(1)};
const poorPlan=createPayrollPlan(poor,new Map([['a',{totalBonus:50}]])),short=paySoldiers(poor,poorPlan,1);
assert.equal(poor.treasury,0);assert.equal(poor.squad.reduce((n,s)=>n+s.gold,0),15);assert.equal(short.rankerPaid,0);
assert.equal(short.shortfall,poorPlan.total-15);assert.ok(Math.abs(poor.squad[0].gold-poor.squad[1].gold)<=1);
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats}=await import('../js/games/iron-squad/index.js');
const real=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])real[m]=()=>{};
real.activeSlotId=saveSlots.create('v4 payroll').id;real.startFreshGame(false);const starting=structuredClone(real.saveGame());
real.squad=Array.from({length:1000},(_,i)=>unit(`reserve-${i}`));real.reserves=[];
assert.ok(nationalPayrollPlan(real).regular<=economicPayrollBudget(real));assert.equal(nationalIncome(real),baseIncome);
real.resumeSavedGame(structuredClone(starting));
const simulate=(label,waves)=>{
  let upgrades=0,paid=0,rankerPaid=0;
  for(let i=0;i<waves;i++){
    tickEconomicConstruction(real,120);
    const count=[...real.squad,...real.reserves].filter(s=>!s.dead).length,start=real.phaseFiscal.startBalance;
    real.completePhase();const ledger=real.lastFiscalReport;
    assert.equal(ledger.salaryHeadcount,count);assert.equal(ledger.salaryShortfall,0);
    assert.equal(ledger.endBalance-start,fiscalTotals(ledger).net);
    assert.equal(ledger.salariesPaid,ledger.basicSalariesPaid+ledger.maintenanceAllowancesPaid+ledger.rankerBonusesPaid);
    assert.ok(real.treasury>=nationalSalaryReserve(real),'investment anticipates its future salary reserve');
    const phase=real.phase,wallets=[...real.squad,...real.reserves].map(s=>s.gold);real.completePhase();
    assert.equal(real.phase,phase);assert.deepEqual([...real.squad,...real.reserves].map(s=>s.gold),wallets);
    paid+=ledger.salariesPaid;rankerPaid+=ledger.rankerBonusesPaid;advanceRest(real,8);upgrades+=real.restReport.count;
  }
  return {label,waves,paid,rankerPaid,upgrades,treasury:real.treasury,fullPayroll:nationalPayroll(real)};
};
const runs=[simulate('fresh economy',40)];assert.ok(runs[0].upgrades>0);
real.resumeSavedGame(structuredClone(starting));real.nation=normalizeNation({investment:180000,armament:{techTier:28}});
for(const s of real.squad){s.gold=0;s.level=100;s.survivedWaves=50;s.minionKills=100;for(const item of Object.values(s.equipped))if(item){item.tier=28;applyUpgradeStats(item,100);}real.recalcSoldierStats(s);s.hp=s.maxHp;}
real.treasury=nationalSalaryReserve(real)*2;real.phaseFiscal=emptyFiscalLedger(real.phase,real.treasury);
runs.push(simulate('mature gear requires savings',24));assert.ok(real.squad.some(s=>s.gold>0));
assert.ok(real.squad.some(s=>s.gold<real.getUpgradeCost(s.equipped.weapon)));
const saved=structuredClone(real.saveGame()),wallets=[...real.squad,...real.reserves].map(s=>s.gold),treasury=real.treasury;
real.resumeSavedGame(saved);assert.equal(real.treasury,treasury);assert.deepEqual([...real.squad,...real.reserves].map(s=>s.gold),wallets);
assert.deepEqual(real.lastFiscalReport,saved.lastFiscalReport);
console.log(JSON.stringify({prices,runs}));
console.log('PASS: unlimited prices, economy-funded wages/honors, no army-created income, fair transfers, 40 fresh/24 mature periods, savings, reserves, no duplicate pay and save/resume');
