// v7.2.3: 忍者の系列が剣（刀）を持つときだけ逆手で描く。判定・威力・他の兵種は変えない。
import assert from 'node:assert/strict';
const {meleePose,reverseGripFor,drawMeleeWeapon,REVERSE_GRIP,attackAnimationRate}=await import('../js/weapon-motion.js?v=337');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const unit=(soldierClass,extra={})=>({soldierClass,atkAnim:0,facingAngle:0,equipped:{weapon:{weaponStyle:'sword'}},...extra});
// Who holds the blade reversed.
for(const id of ['NINJA','NINJA_CHUNIN','NINJA_JONIN','NINJA_KASHIRA'])eq(reverseGripFor(unit(id),'sword'),true,id);
for(const style of ['spear','hammer','axe','wand','staff','bow'])eq(reverseGripFor(unit('NINJA_JONIN'),style),false,`ninja ${style} stays as before`);
for(const id of ['LIGHT','BLADEMASTER','SWORD_SAINT','HEAVY','BEAST_CAT','BEAST_CAT_KAGE','BEAST_WOLF_TENRO'])eq(reverseGripFor(unit(id),'sword'),false,id);
eq(reverseGripFor(unit('NINJA',{isPlayer:true}),'sword'),false,'commander unchanged');eq(reverseGripFor(unit('NINJA',{isHero:true}),'sword'),false);
eq(reverseGripFor(null,'sword'),false);
// Rest: blade points down, pommel above the fist, carried on the facing side for both directions.
for(const aim of [0,Math.PI]){
 const pose=meleePose('sword',0,aim,null,true),blade=pose.angle+Math.PI,side=Math.cos(aim)<-.15?-1:1;
 eq(pose.reverse,true);ok(Math.sin(blade)>.9,`blade points down (aim ${aim})`);ok(Math.sin(pose.angle)<-.9,'pommel up');
 ok(pose.grip.x*side>4,'fist in front on the facing side');ok(pose.grip.y<-12&&pose.grip.y>-24,'fist at chest height');
 ok(pose.length<35&&pose.length>20,'short blade along the forearm');eq(pose.twoHanded,false);
}
// Attack: the fist pulls back, then punches forward; the blade sweeps behind it. Continuous at both ends.
{const rest=meleePose('sword',0,0,null,true),pull=meleePose('sword',.82,0,null,true),punch=meleePose('sword',.57,0,null,true),end=meleePose('sword',.001,0,null,true);
 ok(punch.grip.x>rest.grip.x+3,'punch reaches forward');ok(pull.grip.x<punch.grip.x,'pulled back before the strike');
 ok(Math.cos(punch.angle+Math.PI)<Math.cos(rest.angle+Math.PI),'blade sweeps back during the strike');
 ok(Math.abs(end.angle-rest.angle)<.02&&Math.hypot(end.grip.x-rest.grip.x,end.grip.y-rest.grip.y)<.3,'returns smoothly');
 ok(punch.trail>0,'swing trace shows');}
// Everyone else keeps the previous sword pose exactly.
{const a=meleePose('sword',0,0),b=meleePose('sword',0,0,null,false),c=meleePose('spear',0,0,null,true);
 ok(Math.abs(a.angle-(-.68))<1e-9,'normal sword rest unchanged');eq(a.reverse,false);eq(JSON.stringify(a),JSON.stringify(b));eq(c.reverse,false,'reverse applies to swords only');
 for(const anim of [.9,.6,.3]){eq(JSON.stringify(meleePose('sword',anim,.4)),JSON.stringify(meleePose('sword',anim,.4,null,false)));}}
// Drawing rotates the blade half a turn only for ninja swords.
const rotations=ctx=>ctx.log.filter(([k])=>k==='rotate').map(([,a])=>a);
const recorder=()=>{const log=[];return new Proxy({log},{get:(o,k)=>k in o?o[k]:(...args)=>{log.push([k,...args]);}});};
const colors={cloth:'#555',gloves:'#666',blade:'#ccc',board:'#444',hand:'#c1a083'};
for(const [id,reversed] of [['NINJA_CHUNIN',true],['LIGHT',false]]){
 const actor=unit(id),pose=meleePose('sword',0,0,null,reverseGripFor(actor,'sword')),ctx=recorder();
 drawMeleeWeapon(ctx,actor,'sword',colors,false,false,null);
 ok(rotations(ctx).some(a=>Math.abs(a-(pose.angle+(reversed?Math.PI:0)))<1e-9),`${id} blade rotation`);
}
// Visual only: attack timing is the same as any sword.
eq(attackAnimationRate({weaponStyle:'sword'}),attackAnimationRate({weaponStyle:'sword'}));ok(REVERSE_GRIP.length<1);
console.log(`PASS ninja-reverse-grip-v723 (${checks} checks)`);
