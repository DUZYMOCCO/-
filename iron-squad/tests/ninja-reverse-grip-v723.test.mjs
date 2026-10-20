// v7.2.3: 忍者の系列が剣（刀）を持つときだけ逆手で描く。判定・威力・他の兵種は変えない。
import assert from 'node:assert/strict';
const {meleePose,reverseGripFor,drawMeleeWeapon,REVERSE_GRIP,attackAnimationRate}=await import('../js/weapon-motion.js?v=339');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const unit=(soldierClass,extra={})=>({soldierClass,atkAnim:0,facingAngle:0,equipped:{weapon:{weaponStyle:'sword'}},...extra});
// Who holds the blade reversed.
for(const id of ['NINJA','NINJA_CHUNIN','NINJA_JONIN','NINJA_KASHIRA'])eq(reverseGripFor(unit(id),'sword'),true,id);
for(const style of ['spear','hammer','axe','wand','staff','bow'])eq(reverseGripFor(unit('NINJA_JONIN'),style),false,`ninja ${style} stays as before`);
for(const id of ['LIGHT','BLADEMASTER','SWORD_SAINT','HEAVY','BEAST_CAT','BEAST_CAT_KAGE','BEAST_WOLF_TENRO'])eq(reverseGripFor(unit(id),'sword'),false,id);
eq(reverseGripFor(unit('NINJA',{isPlayer:true}),'sword'),false,'commander unchanged');eq(reverseGripFor(unit('NINJA',{isHero:true}),'sword'),false);
eq(reverseGripFor(null,'sword'),false);
// v7.2.5 Rest and strike: the facing-side hand (right hand facing right) holds the blade reversed, outside the body.
// The blade never crosses the belly (no seppuku look) at any moment of the motion, for both directions.
const tip=pose=>{const a=pose.angle+Math.PI;return {x:pose.grip.x+Math.cos(a)*pose.length,y:pose.grip.y+Math.sin(a)*pose.length};};
const crossesBelly=pose=>{const a=pose.angle+Math.PI;for(let k=0;k<=20;k++){const d=pose.length*k/20,x=pose.grip.x+Math.cos(a)*d,y=pose.grip.y+Math.sin(a)*d;if(Math.abs(x)<7&&y>-20&&y<-2)return true;}return false;};
for(const aim of [0,Math.PI]){
 const side=aim?-1:1,rest=meleePose('sword',0,aim,null,true),t=tip(rest);
 eq(rest.reverse,true);eq(rest.side,side);ok(rest.grip.x*side>=12,'fist outside the body on the facing side');ok(rest.grip.y<-15&&rest.grip.y>-23,'fist at chest height');
 ok(Math.sin(rest.angle+Math.PI)>.95,'blade points down');ok(Math.sin(rest.angle)<-.95,'pommel up');ok(t.x*side>=9,'tip stays outside the body');
 ok(rest.length<30&&rest.length>20,'short blade');eq(rest.twoHanded,false);ok(rest.offGrip.x*side<0,'other hand on the far side');
 for(let anim=0;anim<=1.0001;anim+=.05)ok(!crossesBelly(meleePose('sword',anim,aim,null,true)),`no blade across the belly (aim ${aim}, anim ${anim.toFixed(2)})`);
 const out=meleePose('sword',.55,aim,null,true),wind=meleePose('sword',.82,aim,null,true),end=meleePose('sword',.001,aim,null,true);
 ok(out.grip.x*side>rest.grip.x*side+5,'arm swings outward');ok(wind.grip.x*side<rest.grip.x*side,'gathers in before the swing');
 ok(tip(out).x*side>out.grip.x*side+10,'blade sweeps out ahead of the fist');ok(Math.sin(out.angle+Math.PI)>0,'still blade-down (reverse grip)');
 ok(out.trail>0,'swing trace shows');ok(Math.abs(end.angle-rest.angle)<.02&&Math.hypot(end.grip.x-rest.grip.x,end.grip.y-rest.grip.y)<.3,'returns smoothly');
 const mirror=meleePose('sword',.55,0,null,true);ok(Math.abs(out.grip.x+side*0- side*mirror.grip.x)<1e-9&&Math.abs(out.grip.y-mirror.grip.y)<1e-9,'left is the mirror of right');
 ok(Math.abs(Math.cos(out.angle+Math.PI)-side*Math.cos(mirror.angle+Math.PI))<1e-9,'blade mirrored too');
 ok(Math.abs(Math.sin(out.aim))<1e-9,'drawn in front of the head');
}
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
