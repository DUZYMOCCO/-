// v7.0.26: equipment comparison per unit type (barrier / magic / heal stats that do nothing are dimmed and not judged) and the "weak surplus" sale selection.
import assert from 'node:assert/strict';
import {compareEquipment,equipmentComparisonHtml,ineffectiveStatKeys,lowValueIds} from '../js/equipment-rules.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {requiredDefenseStrength} from '../js/defense-equipment.js';

const mk=(soldierClass,extra={})=>({id:`u-${soldierClass}-${Math.random()}`,name:soldierClass,level:10,soldierClass,equipped:{},attributeProfile:rollAttributeProfile(soldierClass==='MAGE'||soldierClass==='MEDIC'?soldierClass:soldierClass==='ARCHER'?'ARCHER':'HEAVY','AVERAGE',()=>.5,true),...extra});
const archer=mk('ARCHER'),mage=mk('MAGE'),medic=mk('MEDIC',{healPower:80}),heavy=mk('HEAVY');
const muscleMage=mk('MAGE');muscleMage.attributeProfile.innate.strength=80;
const commander=(weapon=null)=>({id:'cmd',isPlayer:true,level:10,equipped:weapon?{weapon}:{},weapon});
const piece=(stats,extra={})=>({id:`p${Math.random()}`,type:'ARMOR',tier:9,upgrade:0,stats,...extra});

// --- who is affected -------------------------------------------------------------------------------------------------
assert.deepEqual([...ineffectiveStatKeys(archer)].sort(),['barrier','healBonus','magicAttack','magicBonus']);
assert.deepEqual([...ineffectiveStatKeys(heavy)].sort(),['barrier','healBonus','magicAttack','magicBonus']);
assert.deepEqual([...ineffectiveStatKeys(mage)].sort(),['healBonus'],'mage: barrier and magic work');
assert.deepEqual([...ineffectiveStatKeys(medic)],[],'medic: everything works');
assert.ok(ineffectiveStatKeys(muscleMage).has('barrier'),'muscle mage cannot use a barrier');
assert.ok(!ineffectiveStatKeys(muscleMage).has('magicBonus'));
assert.deepEqual([...ineffectiveStatKeys(commander())].sort(),['healBonus','magicAttack','magicBonus'],'commander: barrier works, magic needs a staff');
const staff={type:'WEAPON',weaponStyle:'staff',tier:5,stats:{atk:10}},sword={type:'WEAPON',weaponStyle:'sword',tier:5,stats:{atk:10}};
assert.ok(!ineffectiveStatKeys(commander(staff)).has('magicBonus'));
assert.ok(ineffectiveStatKeys(commander(sword)).has('magicBonus'));
assert.ok(!ineffectiveStatKeys(commander(sword),staff,sword).has('magicAttack'),'swapping to a staff makes magic count');
assert.ok(!ineffectiveStatKeys(commander(staff),sword,staff).has('magicAttack'),'swapping away from a staff still loses magic');
assert.equal(ineffectiveStatKeys(null).size,0);

// --- the screenshot case: an archer-type unit buying a barrier robe --------------------------------------------------------
const plain=piece({def:1000,hp:1000}),ward=piece({def:1000,hp:1000,barrier:35503,magicBonus:30});
const noUnit=compareEquipment(ward,plain);
assert.equal(noUnit.kind,'better','without a unit the barrier still counts (unchanged behaviour)');
assert.match(noUnit.reasonText,/バリア/);
const forArcher=compareEquipment(ward,plain,{unit:archer});
assert.equal(forArcher.kind,'equal');assert.equal(forArcher.label,'ほぼ同じ');
assert.deepEqual(forArcher.ineffectiveKeys.sort(),['barrier','magicBonus']);
assert.ok(forArcher.changes.some(c=>c.key==='barrier'&&c.ineffective&&!c.significant),'the row stays in the list');
assert.match(forArcher.html,/バリア[^<]*↑[\s\S]*?\(効果なし\)/);assert.match(forArcher.html,/stat-delta-minor/);assert.match(forArcher.text,/バリア.*\(効果なし\)/);
assert.doesNotMatch(forArcher.reasonText,/バリア|魔力/);assert.match(forArcher.reasonText,/効く項目の差はなし/);
assert.equal(forArcher.legacyKind,'equal');
assert.equal(compareEquipment(ward,plain,{unit:mage}).kind,'better','mage uses the barrier');
assert.equal(compareEquipment(ward,plain,{unit:commander()}).kind,'better','commander uses the barrier');
assert.equal(compareEquipment(piece({def:1000,hp:1000,barrier:35503}),plain,{unit:muscleMage}).kind,'equal','muscle mage cannot use the barrier');
assert.equal(compareEquipment(piece({def:1000,hp:1000,magicBonus:30}),plain,{unit:commander(staff)}).kind,'better','commander with a staff: magic bonus counts');
assert.equal(compareEquipment(piece({def:1000,hp:1000,magicBonus:30}),plain,{unit:commander(sword)}).kind,'equal','commander with a sword: it does not');
assert.equal(compareEquipment(piece({def:1000,hp:1000,healBonus:30}),plain,{unit:archer}).kind,'equal');
assert.equal(compareEquipment(piece({def:1000,hp:1000,healBonus:30}),plain,{unit:medic}).kind,'better');
// A real difference still decides; the ignored stat cannot flip it.
const strongerNoBarrier=piece({def:1500,hp:1000});
assert.equal(compareEquipment(strongerNoBarrier,ward,{unit:archer}).kind,'better','archer: +50% def, the lost barrier is irrelevant');
assert.equal(compareEquipment(strongerNoBarrier,ward,{unit:mage}).kind,'mixed','mage: +50% def against losing barrier and magic bonus');
assert.equal(compareEquipment(piece({def:1030,hp:1000}),ward,{unit:mage}).kind,'worse','mage: small def gain does not make up for the barrier');
assert.equal(compareEquipment(piece({def:1015,hp:1000}),ward,{unit:archer}).kind,'equal','archer: def +1.5% only (under the 2% line)');
// "swap as is" and inheritance judge the same way: the card prints the hint
const card=equipmentComparisonHtml(forArcher,{});assert.match(card,/効かない項目/);
assert.doesNotMatch(equipmentComparisonHtml(noUnit,{}),/効かない項目/);
// totals-based judging still works with a unit
const totals={before:{maxHp:1000,def:1000,atk:1000,speed:200},after:{maxHp:1000,def:1200,atk:1000,speed:200}};
assert.equal(compareEquipment(piece({def:1200,barrier:9999}),plain,{unit:archer,totals}).kind,'better');
assert.equal(compareEquipment(piece({def:1000,barrier:9999}),plain,{unit:archer,totals:{before:totals.before,after:totals.before}}).kind,'equal');

// --- 弱い余剰 -------------------------------------------------------------------------------------------------------------
let n=0;const arm=(stats,extra={})=>({id:`a${++n}`,type:'ARMOR',tier:9,upgrade:0,name:`a${n}`,stats,...extra});
const wep=(stats,extra={})=>({id:`w${++n}`,type:'WEAPON',weaponStyle:'sword',tier:9,upgrade:0,name:`w${n}`,stats,...extra});
const strengthOf=item=>item.minStrength??0;
const roster=(...strengths)=>strengths.map((strength,i)=>({id:`s${i}`,strength,equipped:{},isPlayer:i===0}));
const optionsFor=units=>({commander:units[0],canUse:(unit,item)=>unit.strength>=strengthOf(item)});
const run=(bag,units,equipped={},tier=28)=>lowValueIds(bag,equipped,units.slice(1),tier,optionsFor(units));

// The top piece needs more strength and has more of everything; the old rule could never sell the lower one.
{const high=arm({def:2000,hp:2000},{minStrength:80}),low=arm({def:1000,hp:1000},{minStrength:30});
 assert.deepEqual(run([high,low],roster(100)),[low.id],'strong commander can wear the top piece: the lower one is surplus');
 assert.deepEqual(run([high,low],roster(50,60)),[],'nobody reaches 80 strength: the top piece is not a reference');
 assert.deepEqual(run([high,low],roster(50,90)),[low.id],'one soldier with 90 is enough');}
// Weapon: a slower (negative attack speed) top weapon is still better overall.
{const top=wep({atk:2000,atkSpeed:-10}),low=wep({atk:1000,atkSpeed:0});
 assert.deepEqual(run([top,low],roster(100)),[low.id]);
 const other=wep({atk:2000},{weaponStyle:'bow'});assert.deepEqual(run([other,low],roster(100)),[],'a different weapon style is never the reason to sell');}
// Enhanced lower pieces are included; the higher enhancement stays.
{const top=arm({def:2000,hp:2000}),lowPlus=arm({def:1100,hp:1100},{upgrade:2}),topPlus=arm({def:3000,hp:3000},{upgrade:2});
 assert.deepEqual(run([top,lowPlus],roster(100)),[lowPlus.id],'+2 low piece is selected');
 assert.deepEqual(run([top,topPlus],roster(100)),[top.id],'the more enhanced / stronger one stays');}
// Protection: equipped, favorite, hero-only, god-roll, tier cap
{const top=arm({def:2000,hp:2000}),a=arm({def:1000,hp:1000}),b=arm({def:1000,hp:1000},{favorite:true}),c=arm({def:1000,hp:1000},{isGodRoll:true}),d=arm({def:1000,hp:1000},{forgeTag:'神鍛'}),e=arm({def:1000,hp:1000},{heroOnly:true}),f=arm({def:1000,hp:1000},{tier:20});
 assert.deepEqual(run([top,a,b,c,d,e,f],roster(100),{},10),[a.id]);
 const worn=arm({def:1000,hp:1000});const soldier={id:'s9',strength:100,equipped:{armor:worn}};
 assert.deepEqual(lowValueIds([top,worn],{},[soldier],28,{commander:roster(100)[0],canUse:()=>true}),[],'a worn piece is never selected');}
// Never empty a slot, even for copies and for chains
{const x=arm({def:1000,hp:1000}),y=arm({def:1000,hp:1000}),z=arm({def:1000,hp:1000});
 assert.deepEqual(run([x,y,z],roster(100)),[y.id,z.id],'identical copies: the first in the bag stays');
 const best=arm({def:1000,hp:1000});assert.deepEqual(run([x,y],roster(100),{armor:best}),[x.id,y.id],'the captain\'s own piece counts as a reference');
 const chain=[arm({def:1000,hp:1000}),arm({def:1500,hp:1000}),arm({def:2500,hp:1000}),arm({def:4000,hp:1000})];
 const sold=run(chain,roster(100));assert.equal(sold.length,3);assert.ok(!sold.includes(chain[3].id));}
// Casters keep what only casters want
{const plate=arm({def:5000,hp:5000}),robe=arm({def:200,hp:200,magicBonus:25});
 assert.deepEqual(run([plate,robe],roster(100)),[robe.id],'only a sword-wielding commander: magic bonus is worthless, the robe is surplus');
 const withMage=[...roster(100),{id:'m',strength:1,soldierClass:'MAGE',equipped:{},level:10,attributeProfile:rollAttributeProfile('MAGE','AVERAGE',()=>.5,true)}];
 assert.deepEqual(run([plate,robe],withMage),[],'a mage can use the robe: keep it');
 const ward=arm({def:200,hp:200,barrier:900});
 assert.deepEqual(run([plate,ward],roster(100)),[],'the commander can use a barrier: keep it');}
// Without options (old call style): item numbers only, a higher requirement is no reference
{const high=arm({def:2000,hp:2000},{tier:12}),low=arm({def:1000,hp:1000},{tier:12});
 assert.ok(requiredDefenseStrength(high)>=0);
 assert.deepEqual(lowValueIds([high,low],{},[],28),[low.id]);}
console.log('ok equipment v7.0.26');