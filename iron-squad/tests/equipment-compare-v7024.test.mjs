// v7.0.24: equipment comparison judged on totals / same +level, ±2% ignored, weighted score, folded card; shared-box absorption unchanged.
import assert from 'node:assert/strict';
import {compareEquipment,equipmentComparisonHtml,EQUIPMENT_JUDGE} from '../js/equipment-rules.js';
import {shouldAbsorbToSharedBox} from '../js/economy-rules.js';
import {planBulkUpgrade,bulkUpgradeSummary,bulkUpgradeButtonsHtml,BULK_UPGRADE_STEPS} from '../js/bulk-upgrade.js';
import {equipmentUpgradeCost} from '../js/payroll-rules.js';
import {SELF_UPGRADE_SAFETY_LIMIT} from '../js/self-upgrade-rules.js';

assert.deepEqual(EQUIPMENT_JUDGE.weights,{atk:1,magicAttack:1,def:1,hp:1,speed:.5,other:.3});
assert.equal(EQUIPMENT_JUDGE.ignoreBelow,.02);assert.equal(EQUIPMENT_JUDGE.balance,.03);

const totals=(before,after)=>({before:{maxHp:1000,def:1000,atk:1000,speed:200,...before},after:{maxHp:1000,def:1000,atk:1000,speed:200,...after}});
const piece=(stats,extra={})=>({id:'x',type:'LEGS',tier:1,upgrade:0,stats,...extra});

// Image 1: T24 greaves vs a +288 cloth trousers. Plain swap: def barely moves in total, speed drops => 弱くなる (was 一長一短).
const clothPlus288=piece({def:985,speed:66}),greavesPlain=piece({def:1660,speed:29}),greavesInherited=piece({def:96983,speed:98});
const plainTotals=totals({def:674362,maxHp:679850,atk:4138038,speed:231},{def:675240,maxHp:679850,atk:4138038,speed:194});
const plain=compareEquipment(greavesPlain,clothPlus288,{totals:plainTotals});
assert.equal(plain.legacyKind,'mixed','the old any-up-any-down rule called this 一長一短');
assert.equal(plain.kind,'worse');assert.equal(plain.label,'弱くなる');assert.equal(plain.basis,'total');
assert.match(plain.reasonText,/移動/);assert.doesNotMatch(plain.reasonText,/防御/,'def +0.13% of the total is "ほぼ変わらず"');
assert.ok(plain.html.includes('stat-delta-minor'),'the tiny def change stays visible in the details, greyed');
// Same +level (inherit): both go up => 強くなる.
const inherited=compareEquipment(greavesInherited,clothPlus288,{totals:totals({def:674362,speed:231},{def:770360,speed:263})});
assert.equal(inherited.kind,'better');assert.equal(inherited.label,'強くなる');assert.match(inherited.reasonText,/防御 \+14\.2%/);
// Without totals the item's own numbers are used (workshop previews without a unit etc.).
assert.equal(compareEquipment(greavesInherited,clothPlus288).kind,'better');

// Image 2: T18 mithril cannon vs T24 +602 axe: attack -99.7%, only the length goes up => 弱くなる (was 一長一短).
const axe={id:'a',type:'WEAPON',weaponStyle:'axe',tier:24,upgrade:602,stats:{atk:492981,atkSpeed:-43,crit:25,lightning:1}};
const cannon={id:'c',type:'WEAPON',weaponStyle:'cannon',tier:18,upgrade:0,stats:{atk:1722,atkSpeed:-47,crit:15}};
for(const options of [{},{totals:totals({atk:4138038},{atk:1650000})}]){
  const r=compareEquipment(cannon,axe,options);
  assert.equal(r.legacyKind,'mixed');assert.equal(r.kind,'worse');assert.equal(r.label,'弱くなる');
  assert.match(r.reasonText,/^攻撃 -\d/,'attack, the main stat, leads the reason line');assert.match(r.reasonText,/長さ\/射程 \+/);
  assert.ok(r.changes.some(c=>c.key==='reach'&&c.delta>0),'the length really went up');
}
assert.match(compareEquipment(cannon,axe).reasonText,/攻撃 -99\.7%/);

// ±2% is "ほぼ変わらず" (neither up nor down).
assert.equal(compareEquipment(piece({def:1010}),piece({def:1000})).label,'ほぼ同じ');
assert.equal(compareEquipment(piece({def:1010}),piece({def:1000})).kind,'equal');
assert.equal(compareEquipment(piece({def:1019}),piece({def:1000})).kind,'equal');
assert.equal(compareEquipment(piece({def:1021}),piece({def:1000})).kind,'better');
assert.equal(compareEquipment(piece({def:1000}),piece({def:1000})).label,'ほぼ同じ');
assert.equal(compareEquipment(piece({def:1010,speed:0}),piece({def:1000}),{totals:totals({def:1000},{def:1015})}).kind,'equal','measured on the total, not the piece');
// A small up and a small down inside ±2% are both ignored, so they cannot make 一長一短.
assert.equal(compareEquipment(piece({def:1010,hp:990}),piece({def:1000,hp:1000})).kind,'equal');

// Weighted score: atk/def/hp x1, speed x0.5, others x0.3; within ±3% = 一長一短; otherwise the larger side must be more than twice the other.
assert.equal(compareEquipment(piece({def:1100,hp:910}),piece({def:1000,hp:1000})).kind,'mixed','+10% / -9% => net +1%');
assert.equal(compareEquipment(piece({def:1500,hp:950}),piece({def:1000,hp:1000})).kind,'better','+50% / -5%');
assert.equal(compareEquipment(piece({def:950,hp:1500}),piece({def:1000,hp:1000})).kind,'better');
assert.equal(compareEquipment(piece({def:500,hp:1050}),piece({def:1000,hp:1000})).kind,'worse','-50% / +5%');
assert.equal(compareEquipment(piece({def:2000,hp:500}),piece({def:1000,hp:1000})).kind,'mixed','+100% / -50%: a real trade-off, not 2x apart');
assert.equal(compareEquipment({stats:{atk:10,def:5}},{stats:{atk:5,def:10}}).label,'一長一短');
// speed is weighted 0.5 and crit 0.3: -10% speed (-5%) vs +10 crit points (+3%) nets -2% = 一長一短; -20% speed (-10%) is clearly worse.
assert.equal(compareEquipment(piece({speed:90,crit:10}),piece({speed:100,crit:0}),{totals:totals({speed:200},{speed:180})}).kind,'mixed');
assert.equal(compareEquipment(piece({speed:80,crit:10}),piece({speed:100,crit:0}),{totals:totals({speed:200},{speed:160})}).kind,'worse');
// lightning is only a minor axis: losing it alone is a (small) downgrade, and it cannot outweigh a big attack gain.
assert.equal(compareEquipment({type:'AMULET',stats:{atk:2000}},{type:'AMULET',stats:{atk:1000,lightning:1}}).kind,'better');

// Card markup: verdict on one line, reasons on one line, every stat folded, "as-is" small, details keep the old stat lines.
const card=equipmentComparisonHtml(inherited,{plain,title:'隊長の現装備比',currentName:'布のズボン+288',basis:'✨+288引継後',warning:'※旧装備は消滅'});
assert.match(card,/class="cmp-label cmp-better">強くなる</);assert.match(card,/class="cmp-reason"/);assert.match(card,/<details class="cmp-details"><summary>全項目の差<\/summary>/);
assert.match(card,/そのまま替えた場合：<strong class="cmp-worse">弱くなる<\/strong>/);assert.match(card,/✨\+288引継後/);assert.match(card,/隊長の現装備比/);assert.match(card,/stat-delta-up/);
assert.doesNotMatch(equipmentComparisonHtml(plain),/cmp-plain/);

// Shared-box absorption keeps the old rule: only "no stat is higher than the current gear's" is absorbed, whatever the new verdict says.
const owned={legs:piece({def:985,speed:66},{id:'owned',tier:3})};
const lowTierGreaves=piece({def:1660,speed:29},{id:'new',tier:3});
assert.equal(shouldAbsorbToSharedBox(lowTierGreaves,owned,'legs'),false,'def up + speed down is not absorbed (it was not before either)');
assert.equal(shouldAbsorbToSharedBox(piece({def:900,speed:60},{id:'w',tier:2}),owned,'legs'),true,'strictly weaker is absorbed');
assert.equal(shouldAbsorbToSharedBox(piece({def:985,speed:66},{id:'same',tier:2}),owned,'legs'),true,'equal is absorbed');
assert.equal(shouldAbsorbToSharedBox(piece({def:986,speed:60},{id:'tiny',tier:2}),owned,'legs'),false,'any higher stat keeps it (old rule), even if the new verdict says ほぼ同じ/弱い');
assert.equal(compareEquipment(piece({def:986,speed:60},{tier:2}),owned.legs).legacyKind,'mixed');
assert.equal(shouldAbsorbToSharedBox(piece({def:5000},{id:'hi',tier:4}),owned,'legs'),false,'above T3 is never absorbed');

// ---- bulk upgrade planning (+1 / +10 / +100) ----
assert.deepEqual([...BULK_UPGRADE_STEPS],[1,10,100]);
const gear={id:'g',tier:24,upgrade:134,type:'WEAPON'};
const costOf=level=>equipmentUpgradeCost({...gear,upgrade:level});
const sum=(from,n)=>Array.from({length:n},(_,i)=>costOf(from+i)).reduce((a,b)=>a+b,0);
const frozen=structuredClone(gear);
const rich=planBulkUpgrade(gear,1e12,100);
assert.equal(rich.count,100);assert.equal(rich.spent,sum(134,100));assert.equal(rich.from,134);assert.equal(rich.to,234);assert.equal(rich.short,false);
assert.deepEqual(gear,frozen,'planning never touches the item');
assert.equal(planBulkUpgrade(gear,1e12,1).spent,costOf(134));assert.equal(planBulkUpgrade(gear,1e12,10).spent,sum(134,10));
// Not enough gold: as many as the purse allows, never more.
const budget=sum(134,7)+costOf(141)-1;
const partial=planBulkUpgrade(gear,budget,10);
assert.equal(partial.count,7);assert.equal(partial.spent,sum(134,7));assert.equal(partial.short,true);assert.ok(partial.spent<=budget);
assert.equal(planBulkUpgrade(gear,sum(134,10),10).count,10,'exactly enough pays all of them');
assert.equal(planBulkUpgrade(gear,sum(134,10)-1,10).count,9);
const none=planBulkUpgrade(gear,costOf(134)-1,10);assert.equal(none.count,0);assert.equal(none.spent,0);assert.equal(none.to,134);
assert.equal(planBulkUpgrade(gear,0,100).count,0);assert.equal(planBulkUpgrade(gear,NaN,100).count,0);assert.equal(planBulkUpgrade(gear,100,0).count,0);
// Safety limit: never above 5,000 in one action.
assert.equal(planBulkUpgrade({tier:1,upgrade:0},1e15,1e9).count,SELF_UPGRADE_SAFETY_LIMIT);
assert.equal(bulkUpgradeSummary(rich),`強化+100回（合計${sum(134,100).toLocaleString('ja-JP')}G）`);
// Buttons: +1 / +10 / +100, totals shown, zero affordable = disabled, +1 stays tappable (it reports a short purse itself).
const html=bulkUpgradeButtonsHtml(gear,1e12,{className:'btn-up-inv'});
assert.equal((html.match(/<button/g)||[]).length,3);assert.match(html,/data-times="1"/);assert.match(html,/data-times="10"/);assert.match(html,/data-times="100"/);
assert.ok(html.includes(`${sum(134,10).toLocaleString('ja-JP')}G`));assert.ok(html.includes(`${sum(134,100).toLocaleString('ja-JP')}G`));assert.doesNotMatch(html,/disabled/);
const poor=bulkUpgradeButtonsHtml(gear,costOf(134)-1,{className:'btn-up-inv'});
assert.match(poor,/data-times="1"[^>]*>/);assert.equal((poor.match(/disabled/g)||[]).length,2);assert.match(poor,/所持金不足/);
const mid=bulkUpgradeButtonsHtml(gear,budget,{className:'btn-up-inv'});
assert.ok(mid.includes(`7回・${sum(134,7).toLocaleString('ja-JP')}G`),'a partial run shows how many levels and the total for them');
console.log('PASS: totals-based verdicts, ±2% tolerance, weighted score, folded card, absorption unchanged, bulk upgrade planning');
