// v7.0.23: soldiers' self-funded upgrades are limited by money. Rest maintenance / funding / donation caps relaxed; price, plus-strength and the +level itself unchanged.
import assert from 'node:assert/strict';
import {saveSlots} from '../js/save-slots.js';
import {equipmentUpgradeCost} from '../js/payroll-rules.js';
import {powerRank} from '../js/equipment-tiers.js';
import {planSelfUpgrades,SELF_UPGRADE_SAFETY_LIMIT,REST_UPGRADES_PER_PHASE_MAX,REST_UPGRADES_PER_TICK_MAX} from '../js/self-upgrade-rules.js';
import {REST_DURATION} from '../js/phase-rules.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};globalThis.confirm=()=>true;globalThis.alert=()=>{};
const {IronSquadGame,applyUpgradeStats}=await import('../js/index.js');
const {formatCompact}=await import('../js/number-format.js');

// --- price formula is unchanged: (20 + 18 up + 6 up^1.4) x max(1, powerRank x .8)
for(const [tier,up] of [[1,0],[1,5],[10,0],[24,134],[24,1000],[40,300]]){
  const expected=Math.floor((20+up*18+Math.pow(up,1.4)*6)*Math.max(1,powerRank(tier)*.8));
  assert.equal(equipmentUpgradeCost({tier,upgrade:up}),expected,`cost T${tier}+${up}`);
}
assert.ok(REST_UPGRADES_PER_TICK_MAX*REST_DURATION>=REST_UPGRADES_PER_PHASE_MAX,'per-second cap spreads the per-period cap over the rest');

// --- pure planner: same price, lowest +level first, upkeep reserve, safety limit, no mutation
const piece=(tier,upgrade)=>({id:`p${tier}-${upgrade}`,tier,upgrade});
{
  const a=piece(24,134),b=piece(24,140),c=piece(10,0);
  const plan=planSelfUpgrades([a,b,c],1e6,{});
  assert.equal(a.upgrade,134);assert.equal(b.upgrade,140);assert.equal(c.upgrade,0,'planning never mutates items');
  let gold=1e6,spent=0,levels=new Map([[a,134],[b,140],[c,0]]),count=0;
  for(;;){ // reference: the old one-at-a-time rule
    const order=[a,b,c].sort((x,y)=>levels.get(x)-levels.get(y));
    const pick=order.find(i=>gold>=equipmentUpgradeCost({tier:i.tier,upgrade:levels.get(i)}));
    if(!pick)break;const cost=equipmentUpgradeCost({tier:pick.tier,upgrade:levels.get(pick)});gold-=cost;spent+=cost;levels.set(pick,levels.get(pick)+1);count++;
  }
  assert.equal(plan.count,count);assert.equal(plan.spent,spent);assert.equal(plan.gold,gold);
  for(const s of plan.steps)assert.equal(s.to,levels.get(s.item));
  assert.ok(plan.count>80,'a million gold buys more than the old 80-step limit');
  const reserved=planSelfUpgrades([piece(1,0)],100,{reserve:6});assert.ok(reserved.gold>=6,'six gold upkeep stays');
  assert.equal(planSelfUpgrades([piece(1,0)],10,{}).count,0);
  const limited=planSelfUpgrades([piece(1,0),piece(1,0)],1e15,{maxCount:37});assert.equal(limited.count,37);assert.equal(limited.limited,true);
  const huge=planSelfUpgrades([piece(1,0)],Number.MAX_SAFE_INTEGER,{maxCount:1e9});assert.equal(huge.count,SELF_UPGRADE_SAFETY_LIMIT,'safety limit cannot be raised by the caller');
  assert.equal(planSelfUpgrades([],1e9).count,0);assert.equal(planSelfUpgrades([piece(1,0)],NaN).count,0);
  assert.ok(Number.isFinite(planSelfUpgrades([piece(40,0)],Number.MAX_SAFE_INTEGER).spent));
}

// --- game level
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('自費強化緩和').id;game.startFreshGame(false);game.saveGame=()=>{};
const pool={};for(const s of [...game.squad,...(game.reserves||[])])for(const [k,it] of Object.entries(s.equipped||{}))if(it&&!pool[k])pool[k]=it;
assert.ok(pool.weapon&&pool.amulet&&pool.gloves);
let seq=0;
function kit(s,{tier=24,up=134,slots=['weapon','gloves','amulet']}={}){
  s.equipped={};for(const k of slots){const c=structuredClone(pool[k]);c.id=`t${seq++}`;c.tier=k==='gloves'?Math.min(tier,5):tier;applyUpgradeStats(c,up);s.equipped[k]=c;}
  s.weapon=s.equipped.weapon;return Object.values(s.equipped);
}
const soldier=game.squad[0];soldier.isPersonalGuard=true;
const startRest=()=>{game.restReport={phase:game.phase,count:0,spent:0,trainedIds:[]};soldier.lastMaintenance={phase:game.phase,count:0,spent:0,status:''};};
const tick=()=>{const before=soldier.lastMaintenance.count;game.processRestSecond();return soldier.lastMaintenance.count-before;};
// grandfathering keeps these pieces on during recalculation; check they are still worn
function rich(gold){const items=kit(soldier);soldier.gold=gold;game.recalcSoldierStats(soldier);assert.equal(Object.values(soldier.equipped).filter(Boolean).length,items.length);return Object.values(soldier.equipped).filter(Boolean);}

// rest maintenance grows with money
const counts={};
for(const gold of [0,50000,400000,3000000]){
  const items=rich(gold);startRest();for(let i=0;i<REST_DURATION;i++)game.processRestSecond();
  counts[gold]=soldier.lastMaintenance.count;
  assert.equal(soldier.lastMaintenance.spent+soldier.gold,gold,'gold is conserved');assert.ok(game.restReport.count>=counts[gold],'the period report includes every soldier');
  if(gold>0)assert.ok(soldier.gold>=6||counts[gold]===0,'upkeep kept');
  assert.equal(items.reduce((n,i)=>n+i.upgrade-134,0),counts[gold]);
}
assert.equal(counts[0],0);assert.ok(counts[50000]>=1&&counts[50000]<counts[400000]&&counts[400000]<counts[3000000],'upgrades per period scale with money');
assert.ok(counts[3000000]>8,'more than the old 8 per period');

// rich soldier: per-second and per-period safety caps
{
  const items=rich(35_700_000);startRest();const per=[];for(let i=0;i<REST_DURATION;i++)per.push(tick());
  assert.deepEqual(per,Array(REST_DURATION).fill(REST_UPGRADES_PER_TICK_MAX),'25 a second, spread over the rest');
  assert.equal(soldier.lastMaintenance.count,REST_UPGRADES_PER_PHASE_MAX);
  assert.equal(tick(),0,'no more than the period cap');assert.match(soldier.lastMaintenance.status,/上限/);
  const ups=items.map(i=>i.upgrade);assert.ok(Math.max(...ups)-Math.min(...ups)<=1,'lowest +level first keeps the pieces level');
  assert.equal(items.reduce((n,i)=>n+i.upgrade-134,0),REST_UPGRADES_PER_PHASE_MAX);
  assert.ok(soldier.gold>6);
  for(const i of items)assert.equal(i.name,`${i.baseName}+${i.upgrade}`,'names follow the +level');
  startRest();assert.equal(tick(),REST_UPGRADES_PER_TICK_MAX,'next period starts fresh');
}
// downed soldier / poor soldier stay deferred
{rich(0);startRest();assert.equal(tick(),0);assert.match(soldier.lastMaintenance.status,/資金不足/);soldier.isDown=true;assert.equal(tick(),0);assert.match(soldier.lastMaintenance.status,/負傷/);soldier.isDown=false;}
// shared equipment is only maintained once per second (seen set)
{
  const items=rich(1e7);const other=game.squad[1];const saved=other.equipped,gold=other.gold;other.equipped={weapon:items[0]};other.gold=1e7;other.isDown=false;
  startRest();other.lastMaintenance={phase:game.phase,count:0,spent:0,status:''};game.processRestSecond();
  assert.equal(other.lastMaintenance.count,0,'a piece already maintained this second is skipped for the next soldier');
  other.equipped=saved;other.gold=gold;
}

// upgrades from funding: more than 80
{
  game.gold=1e10;
  for(const amount of [1_000_000,10_000_000]){
    const items=kit(soldier,{slots:['weapon','gloves','amulet']});soldier.gold=0;const before=game.gold;
    assert.equal(game.fundSoldier(soldier.id,amount),true);
    const gained=items.reduce((n,i)=>n+i.upgrade-134,0);
    assert.equal(before-game.gold,amount);assert.ok(gained>0);
    assert.ok(soldier.gold<Math.min(...items.map(i=>equipmentUpgradeCost(i))),'nothing affordable is left unspent');
    assert.equal(amount-soldier.gold,items.reduce((n,i)=>{let s=0;for(let u=134;u<i.upgrade;u++)s+=equipmentUpgradeCost({tier:i.tier,upgrade:u});return n+s;},0),'spent equals the sum of the unchanged prices');
    if(amount===10_000_000)assert.ok(gained>80,`10M buys ${gained} upgrades, beyond the old 80`);
  }
  const rich35=kit(soldier);soldier.gold=35_700_000;game.fundSoldier(soldier.id,1_000_000);
  assert.ok(rich35.reduce((n,i)=>n+i.upgrade-134,0)>500,'a rich soldier spends down to the price');
  assert.ok(soldier.gold<Math.min(...rich35.map(i=>equipmentUpgradeCost(i))));
}

// donation: more than 20 per soldier
{
  const living=game.squad.filter(s=>!s.dead);
  for(const s of living)kit(s);
  const before=living.map(s=>Object.values(s.equipped).reduce((n,i)=>n+i.upgrade,0));
  for(const s of living)s.gold=0;game.gold=4e10;game.treasury=0;
  assert.equal(game.donateToTreasury(4e10),true);
  const gained=living.map((s,i)=>Object.values(s.equipped).reduce((n,x)=>n+x.upgrade,0)-before[i]);
  assert.ok(Math.max(...gained)>20,`donation gives a soldier ${Math.max(...gained)} upgrades, beyond the old 20`);
  assert.ok(gained.every(n=>n<=SELF_UPGRADE_SAFETY_LIMIT));
}

// huge +levels never produce NaN / Infinity / unsafe numbers
for(const up of [500,2000,10000,100000]){
  for(const [slot,source] of Object.entries(pool)){
    const item=structuredClone(source);item.tier=24;applyUpgradeStats(item,up);
    assert.equal(item.upgrade,up);assert.equal(item.name,`${item.baseName}+${up}`);
    for(const [key,value] of Object.entries(item.stats))if(typeof value==='number')assert.ok(Number.isFinite(value)&&Math.abs(value)<Number.MAX_SAFE_INTEGER,`${slot} +${up} ${key}`);
  }
  const items=kit(soldier,{slots:['weapon','gloves','amulet'],up});soldier.gold=0;game.recalcSoldierStats(soldier);
  for(const key of ['atk','maxHp','def','speed','crit','dodge','atkSpeed'])assert.ok(Number.isFinite(soldier[key]),`soldier ${key} at +${up}`);
  assert.ok(soldier.atk<Number.MAX_SAFE_INTEGER&&soldier.maxHp<Number.MAX_SAFE_INTEGER);
  assert.ok(!/NaN|Infinity/.test(formatCompact(soldier.atk)));
}
console.log('PASS: rest maintenance scales with money (25/s, 200/period caps), funding and donation lose their 80/20 caps, price formula unchanged, large +levels stay finite');