import assert from 'node:assert/strict';
import {attackSpeedState,attackCooldown,soldierAttackCooldown,weaponCombatProfile,compareEquipment} from '../js/equipment-rules.js';
import {attackAnimationRate} from '../js/weapon-motion.js';
import {applyUpgradeStats} from '../js/index.js';
const gear=(type,style='sword')=>({type,tier:28,weaponStyle:style,name:'検証',rollMult:1,stats:{},weaponTraits:{attackTempo:1,swingSpeed:1,crit:0}});
for(const type of ['GLOVES','AMULET']){
 const item=gear(type);applyUpgradeStats(item,0);const before=structuredClone(item);applyUpgradeStats(item,50);
 assert.equal(item.stats.atkSpeed,before.stats.atkSpeed);
 if(type==='GLOVES')assert.ok(item.stats.atk>before.stats.atk&&item.stats.def>before.stats.def);
 assert.equal(compareEquipment(item,before).changes.find(c=>c.key==='atkSpeed'),undefined);
}
const intervals=[];
for(const style of ['sword','spear','hammer','axe','bow']){
 const weapon=gear('WEAPON',style);applyUpgradeStats(weapon,50);
 const equipped={weapon,gloves:gear('GLOVES'),amulet:gear('AMULET')};
 applyUpgradeStats(equipped.gloves,50);applyUpgradeStats(equipped.amulet,50);
 const plain=attackSpeedState(equipped,500),king=attackSpeedState(equipped,500,30),base=weaponCombatProfile(weapon).baseCooldown;
 assert.equal(plain.attackSpeedBonusPct,60);assert.equal(king.attackSpeedBonusPct,60);
 assert.ok(Math.abs(king.atkSpeed-plain.atkSpeed-.3)<1e-9);
 const cd=attackCooldown(weapon,base,plain.atkSpeed),royal=attackCooldown(weapon,Math.min(.42,base*.8),king.atkSpeed,king.warlordSpeedPct);
 assert.ok(cd>=base*.6);assert.ok(royal>=base*.6/1.3&&royal<cd);
 assert.equal(soldierAttackCooldown({soldierClass:'LIGHT',equipped,attackSpeedBonusPct:60},.001),Math.max(.12,base*.6));
 assert.equal(attackAnimationRate(weapon,100),attackAnimationRate(weapon,1/.6));
 intervals.push({style,base,normal:cd,warlord:royal});
}
assert.ok(intervals[2].normal>intervals[0].normal);assert.ok(intervals[2].warlord>intervals[0].warlord);
console.log(JSON.stringify(intervals));
console.log('PASS: fixed gear speed, shared +60% budget, Warlord exception, weapon floors and visible swings');
