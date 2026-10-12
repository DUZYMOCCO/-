import assert from 'node:assert/strict';
import {meleePose,weaponAim,weaponRestAim,attackAnimationRate} from '../js/weapon-motion.js';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {heavyWeaponAttackMult} from '../js/growth-rules.js';
import {KNOCK_RULES,knockbackDistance,knockFlight,slamDamage,knockMass,knockFooting,knockBrace} from '../js/knockback-rules.js';
import {GUARD_LEASH,guardRegrouping,guardTarget,guardSpeedMult} from '../js/guard-leash.js';

// Multipliers: axe x3, hammer x7, others unchanged.
assert.equal(heavyWeaponAttackMult('axe'),3);assert.equal(heavyWeaponAttackMult({weaponStyle:'hammer'}),7);assert.equal(heavyWeaponAttackMult('sword'),1);
// Slower heavy swings than before (v6.1: cooldown .98, animation .34s).
assert.ok(weaponCombatProfile({weaponStyle:'axe'}).baseCooldown>1.1);
assert.ok(attackAnimationRate({weaponStyle:'axe'})<1/.34);
assert.ok(weaponCombatProfile({weaponStyle:'hammer'}).knockback>=150,'the commander launches enemies far');

// Swing direction mirrors with facing: right = clockwise (angle increases), left = counter-clockwise.
for(const style of ['axe','hammer','sword']){
  const right=[.9,.6,.3].map(a=>meleePose(style,a,0).angle),left=[.9,.6,.3].map(a=>meleePose(style,a,Math.PI).angle);
  assert.ok(right[0]<right[1]&&right[1]<right[2],`${style} right-facing swing turns clockwise`);
  assert.ok(left[0]>left[1]&&left[1]>left[2],`${style} left-facing swing turns counter-clockwise`);
  assert.equal(meleePose(style,.3,Math.PI).side,-1);
  // Rest poses are mirror images: the weapon is raised on the facing side, not dropped below.
  const r=meleePose(style,0,0),l=meleePose(style,0,Math.PI);
  assert.ok(Math.abs(Math.sin(r.angle)-Math.sin(l.angle))<1e-9,`${style} rest height matches on both sides`);
}

// Idle/moving weapons point left or right only, never along the stick direction.
assert.equal(weaponRestAim({facingAngle:-Math.PI/2}),0);
assert.equal(weaponRestAim({facingAngle:Math.PI*.8}),Math.PI);
assert.equal(weaponAim({facingAngle:Math.PI/2}),0);
assert.equal(weaponAim({facingAngle:0,atkAnim:.5,attackAngle:1.2}),1.2,'attacks still aim at the target');

// Leash: fight near the commander, dash back when too far, normal speed otherwise.
const game={player:{x:0,y:0}},guard={isPersonalGuard:true,x:100,y:0},enemyNear={x:200,y:0},enemyFar={x:GUARD_LEASH.engage+50,y:0};
assert.equal(guardTarget(game,guard,enemyNear),enemyNear);assert.equal(guardTarget(game,guard,enemyFar),null,'ignores enemies far from the commander');
assert.equal(guardSpeedMult(guard),1);
guard.x=GUARD_LEASH.breakAway+1;assert.equal(guardRegrouping(game,guard),true);assert.equal(guardTarget(game,guard,{x:guard.x+5,y:0}),null,'stops fighting while regrouping');
assert.equal(guardSpeedMult(guard),GUARD_LEASH.dash);
guard.x=GUARD_LEASH.rejoin+20;assert.equal(guardRegrouping(game,guard),true,'keeps running until close');
guard.x=GUARD_LEASH.rejoin-1;assert.equal(guardRegrouping(game,guard),false);assert.equal(guardSpeedMult(guard),1);
const mainBody={isPersonalGuard:false,x:5000,y:0};assert.equal(guardTarget(game,mainBody,enemyFar),enemyFar,'main-body soldiers are not leashed');
game.player.isDown=true;const g2={isPersonalGuard:true,x:900,y:0};assert.equal(guardRegrouping(game,g2),false,'no leash while the commander is down');
// Knockback: attacker strength vs target size/weight and footing (strong enemies brace).
const goblin={radius:12,maxHp:100},big={radius:24,maxHp:100},boss={radius:12,maxHp:100,isBoss:true},tough={radius:12,maxHp:100*300};
const ref={strength:50,strengthRef:50,attack:100};
assert.equal(knockbackDistance(170,ref,goblin),170,'reference commander vs weak goblin keeps the base distance');
assert.ok(Math.abs(knockbackDistance(170,{...ref,strength:100},goblin)-340)<1e-9,'double strength flies twice as far');
assert.ok(Math.abs(knockbackDistance(170,ref,big)-170/4)<1e-9,'twice the size is four times the weight');
assert.ok(knockbackDistance(170,ref,boss)<170,'bosses are heavier');
assert.equal(knockFooting(tough,100),KNOCK_RULES.maxFooting);assert.equal(knockFooting(goblin,100),1);
assert.ok(knockbackDistance(170,ref,tough)<knockbackDistance(170,{...ref,attack:100*300},tough),'a stronger hitter overcomes footing');
assert.equal(knockbackDistance(62,{strength:255,strengthRef:25,attack:1e6},{radius:12,maxHp:10}),62*255/25,'trained soldiers launch weak enemies off screen');
assert.equal(knockbackDistance(1e5,ref,goblin),KNOCK_RULES.maxDistance);assert.equal(knockbackDistance(170,ref,{radius:80,isColossal:true}),0,'colossi do not move');
assert.ok(knockMass({radius:4})>=KNOCK_RULES.minMass);
// Brace: invasion troops (atk 50) cannot be shifted by a starting soldier (strength 25), trained ones can.
const invader={radius:12,maxHp:260,atk:50};assert.equal(knockBrace(invader),30);
assert.equal(knockbackDistance(62,{strength:25,strengthRef:25,attack:60},invader),0,'starting soldiers cannot push invaders');
assert.ok(knockbackDistance(62,{strength:120,strengthRef:25,attack:600},invader)>150,'trained soldiers launch them');
assert.ok(knockbackDistance(170,{strength:50,strengthRef:50,attack:100},invader)>0,'the commander still moves them');
assert.equal(knockBrace({atk:1e9}),KNOCK_RULES.maxBrace,'brace is capped so max strength can always push');
assert.ok(knockFlight(1200).time>knockFlight(100).time,'long throws stay airborne longer');
assert.equal(slamDamage(100,1),100);assert.equal(slamDamage(100,.5),50);assert.equal(slamDamage(100,.1),0,'a spent flight does not hurt');
console.log('PASS: axe x3 / hammer x7, strength/size/footing knockback and wall slam rules, slower heavy swings, mirrored swing per facing, horizontal idle aim, guard leash with dash-only regroup');
// Weapon sounds: game-local PCM, normalized, click-free, with distinct lengths and weight.
const {synthesizeMeleeSound,MELEE_SOUND_STYLES,playMeleeSound}=await import('../js/weapon-sounds.js');
const pcm=Object.fromEntries(MELEE_SOUND_STYLES.map(s=>[s,synthesizeMeleeSound(s,22050)]));
for(const [style,data] of Object.entries(pcm)){const peak=Math.max(...data.map(Math.abs));assert.ok(peak>.85&&peak<=.9001,`${style} normalized`);assert.ok(Math.abs(data.at(-1))<1e-3,`${style} ends without a click`);}
assert.ok(pcm.sword.length<pcm.axe.length&&pcm.axe.length<pcm.hammer.length&&pcm.spear.length<pcm.axe.length,'light sword/spear, heavier axe, longest hammer');
const zc=d=>{let n=0;for(let i=1;i<d.length;i++)if((d[i-1]<0)!==(d[i]<0))n++;return n/d.length;};
assert.ok(zc(pcm.sword)>zc(pcm.axe)&&zc(pcm.axe)>zc(pcm.hammer),'sword brightest, hammer deepest');
assert.equal(playMeleeSound('hammer'),false,'silent without an unlocked audio context');
console.log('PASS: weapon sounds');
// v6.3.0 shop prices x10: merchant = sale value x32 (was x3.2), workshop = standard cost x14 / x30 (was x1.4 / x3).
const {CATALOG_PRICE_MULT,catalogPrice}=await import('../js/merchant-catalog.js');const {workshopPrice,WORKSHOP_PRICE_MULT}=await import('../js/workshop.js');
const {saleValue}=await import('../js/equipment-rules.js');const {standardEquipmentCost}=await import('../js/armament-rules.js');
assert.equal(CATALOG_PRICE_MULT,32);assert.deepEqual(WORKSHOP_PRICE_MULT,{bought:14,crafted:30});
const shopItem={type:'WEAPON',tier:5,stats:{atk:100},upgrade:0,rollMult:1};assert.equal(catalogPrice(shopItem),Math.max(1,Math.floor(saleValue(shopItem)*32)));
assert.equal(workshopPrice(5),Math.ceil(standardEquipmentCost({tier:5})*14));assert.equal(workshopPrice(5,true),Math.ceil(standardEquipmentCost({tier:5})*30));
console.log('PASS: shop prices x10');
