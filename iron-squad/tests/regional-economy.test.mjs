import assert from 'node:assert/strict';
import {ECONOMIC_REGIONS,PUBLIC_WORKS,economicState,normalizeRegionalEconomy,regionalTaxQuote,recurringNationalIncome,localProduction,discoverEconomicRegions,advanceRegionalEconomy,tickEconomicConstruction,investEconomicProject,economicFieldBlocked,recordEconomicKill,regionDevelopmentCost,civilTechCost} from '../js/regional-economy.js';
import {refreshTradeRoutes,tradeSegmentOpen,spawnTradeParty,damageCommerce,routePosition} from '../js/trade-routes.js';
import {salaryQuote,equipmentUpgradeCost} from '../js/payroll-rules.js';
import {nationalPayrollPlan,nationalSalaryReserve,nationalIncome,fiscalTotals,normalizeNation} from '../js/nation-rules.js';
import {WORLD_SIZE} from '../js/world.js';
import {saveSlots} from '../js/save-slots.js';

const memory=new Map(),noop=()=>{};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,applyUpgradeStats}=await import('../js/index.js');
const game=Object.create(IronSquadGame),C=WORLD_SIZE/2;
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[m]=noop;
game.joystick={active:false,dirX:0,dirY:0};game.width=390;game.height=664;game.zoom=1;
game.activeSlotId=saveSlots.create('regional economy').id;
const fresh=()=>{game.startFreshGame(false);game.monsters=[];game.updateSpawns=noop;game.civilians=[];game.merchants=[];game.gateGuards=[];};
fresh();let e=economicState(game);

// No phase, headcount or weapon cost can manufacture national revenue.
const initial=nationalIncome(game),wage=salaryQuote(game.squad[0],game).total;
game.phase=100000;assert.equal(nationalIncome(game),initial);
const weapon=game.squad[0].equipped.weapon;applyUpgradeStats(weapon,10000);
assert.ok(equipmentUpgradeCost(weapon)>1000000);assert.equal(nationalIncome(game),initial);assert.equal(salaryQuote(game.squad[0],game).total,wage);
const incomeWithArmy=nationalIncome(game);game.reserves=[...game.squad];assert.equal(nationalIncome(game),incomeWithArmy);game.reserves=[];

// Dark gaps prevent a connection even when the endpoints are discovered.
const town=ECONOMIC_REGIONS.find(d=>d.id==='place_crossroads');
game.fog={revision:1,isExploredWorld:(x,y)=>Math.hypot(x-C,y-C)<800||Math.hypot(x-town.x,y-town.y)<150};
e.regions[town.id].discovered=true;refreshTradeRoutes(game,Infinity);assert.ok(!e.routes.some(r=>r.to===town.id));
game.fog={revision:2,isExploredWorld:(x,y)=>x>=C-300&&x<=C+1350&&Math.abs(y-C)<300};
refreshTradeRoutes(game,Infinity);assert.ok(e.routes.some(r=>r.to===town.id),'a discovered walkable corridor opens commerce');
const route=e.routes.find(r=>r.to===town.id);assert.ok(route.points.every(p=>game.fog.isExploredWorld(...p)));
for(let i=1;i<route.points.length;i++)assert.equal(tradeSegmentOpen(game,route.points[i-1],route.points[i]),true);
assert.ok(nationalIncome(game)>initial,'connected regional production pays tax');

// A physical gap is removed only after funding and active construction.
fresh();e=economicState(game);const bridge=PUBLIC_WORKS[0];e.projects[bridge.id].discovered=true;
assert.equal(economicFieldBlocked(game,bridge.x,bridge.y),true);
game.gold=bridge.cost;const treasury=game.treasury;
assert.equal(investEconomicProject(game,'project',bridge.id,bridge.cost,'personal'),bridge.cost);
assert.equal(game.gold,0);assert.equal(game.treasury,treasury);assert.equal(economicFieldBlocked(game,bridge.x,bridge.y),true);
tickEconomicConstruction(game,44);assert.equal(e.projects[bridge.id].done,false);
tickEconomicConstruction(game,1);assert.equal(e.projects[bridge.id].done,true);assert.equal(economicFieldBlocked(game,bridge.x,bridge.y),false);
const production=localProduction(e,'river_farms');e.regions.river_farms.discovered=true;
assert.ok(localProduction(e,'river_farms')>production);

// Public investment cannot spend the salary reserve, including future technology costs.
fresh();e=economicState(game);const cost=civilTechCost('production',0);
assert.equal(investEconomicProject(game,'technology','production',cost,'treasury',0,nationalSalaryReserve),0);
game.treasury=nationalSalaryReserve(game)+cost+100;
const spent=investEconomicProject(game,'technology','production',cost,'treasury',game.treasury-nationalSalaryReserve(game),nationalSalaryReserve);
assert.ok(spent>0);assert.ok(game.treasury>=nationalSalaryReserve(game));
if(spent<cost)assert.equal(e.technology.production.level,0,'a promotion waits for its future payroll buffer');

// Private funds speed up development; money and built assets persist on resume.
fresh();e=economicState(game);const buildCost=regionDevelopmentCost(e.regions.hq);game.gold=buildCost;
assert.equal(investEconomicProject(game,'region','hq',buildCost,'personal'),buildCost);
assert.equal(e.regions.hq.level,0);tickEconomicConstruction(game,45);assert.equal(e.regions.hq.level,1);
const builtIncome=nationalIncome(game);assert.ok(builtIncome>initial);
game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);e=economicState(game);
assert.equal(e.regions.hq.level,1);assert.equal(game.gold,0);assert.equal(nationalIncome(game),builtIncome);

// Actual arrivals, loss, patrol combat and period accounting use the game update.
fresh();e=economicState(game);discoverEconomicRegions(game);refreshTradeRoutes(game,Infinity);
const active=e.routes.find(r=>r.to===town.id);assert.ok(active);
const cart=spawnTradeParty(game,active,'merchant'),expectedTax=Math.floor(cart.cargo*.18),bank=game.treasury;
cart.progress=active.length-cart.speed*.5;game.update(.5);
assert.equal(game.treasury,bank+expectedTax);assert.equal(e.shipments,1);assert.equal(game.phaseFiscal.tradeRevenue,expectedTax);
game.update(.1);assert.equal(game.treasury,bank+expectedTax,'arrival cannot pay twice');
const lost=spawnTradeParty(game,active,'merchant');const beforeLoss=game.treasury,safety=e.regions[town.id].safety;
damageCommerce(game,lost,10000);game.update(.1);assert.equal(game.treasury,beforeLoss);assert.equal(e.losses,1);assert.ok(e.regions[town.id].safety<safety);
assert.equal(e.traffic.some(a=>a.id===lost.id),false);

e.patrols=1;const escorted=spawnTradeParty(game,active,'merchant'),guard=e.traffic.find(a=>a.party===escorted.id&&a.role==='guard');assert.ok(guard);
game.monsters=[{id:'test-raider',name:'略奪者',isTradeRaider:true,type:'goblin',x:guard.x+10,y:guard.y,hp:10,maxHp:10,atk:0,speed:0,radius:10}];
game.update(.1);assert.equal(game.monsters[0]?.hp||0,0,'guard attacks a real nearby enemy');
const outbound=spawnTradeParty(game,active,'traveler',true);assert.deepEqual({x:outbound.x,y:outbound.y},routePosition(active,0,true));

// Discovery, investments, actor health/path and threats survive serialization.
escorted.hp=73;game.monsters=[{id:'persist-raider',isTradeRaider:true,type:'goblin',x:C+1000,y:C,hp:77,maxHp:160,atk:18,speed:95,_cachedTarget:escorted}];
game.saveGame();const data=saveSlots.get(game.activeSlotId).data;assert.doesNotThrow(()=>JSON.stringify(data));
game.resumeSavedGame(data);e=economicState(game);const survivor=e.traffic.find(a=>a.id===escorted.id);
assert.equal(survivor.hp,73);assert.deepEqual(survivor.points,escorted.points);assert.equal(game.monsters.find(m=>m.id==='persist-raider').hp,77);
game.monsters=[];game.completePhase();
const ledger=game.lastFiscalReport,total=fiscalTotals(ledger);
assert.equal(ledger.endBalance-ledger.startBalance,total.net);assert.equal(ledger.tradeRevenue,expectedTax);assert.equal(ledger.securityUpkeep,18);
assert.equal(ledger.salaryShortfall,0);assert.ok(game.treasury>=nationalSalaryReserve(game));

// Mission rewards and production are paid once per completed phase.
const rewardStart=game.treasury;for(let i=0;i<12;i++)recordEconomicKill(game,{x:town.x,y:town.y});
const rewardEnd=game.treasury;assert.ok(rewardEnd>rewardStart);recordEconomicKill(game,{x:town.x,y:town.y});assert.equal(game.treasury,rewardEnd);
const last=e.lastPhase;advanceRegionalEconomy(game,last);assert.equal(game.treasury,rewardEnd);
const old=normalizeNation({investment:90000});assert.equal(old.level,4);assert.equal(old.economy.regions.hq.level,4);
assert.equal(old.economy.technology.production.level,2);assert.equal(normalizeRegionalEconomy(old.economy).version,4);

// A real remote raider can kill a moving merchant while the commander is elsewhere.
fresh();e=economicState(game);e.regions.river_farms.discovered=true;
const far={id:'remote-combat',to:'river_farms',points:[[C+512,C],[C+4512,C]],length:4000};e.routes=[far];
const victim=spawnTradeParty(game,far,'merchant');victim.progress=2200;
Object.assign(victim,routePosition(far,victim.progress));
game.monsters=[{id:'remote-enemy',name:'略奪者',isTradeRaider:true,type:'goblin',x:victim.x+20,y:victim.y,homeX:victim.x+20,homeY:victim.y,hp:1000,maxHp:1000,atk:100,speed:165,radius:12}];
const combatBank=game.treasury;
for(let i=0;i<50;i++)game.update(.1);
assert.equal(e.traffic.some(a=>a.id===victim.id),false);assert.equal(e.losses,1);assert.equal(game.treasury,combatBank,'dead cargo never pays a trade tax');
console.log('PASS: independent tax/payroll, discovered walkable routes, real bridge construction, funding reserves, private investment, arrivals/losses/guards, saved actor paths/threats, reconciled accounts, once-only missions and migration');
