// v7.2.7: 忍者の奥の手（盾側）に手裏剣かクナイ。idで決まり固定、盾の有無で変わらない。クナイ持ちはクナイを投げる（威力は同じ）。
import assert from 'node:assert/strict';
const {ninjaHandTool,hidesShieldArt}=await import('../js/limited-lines.js?v=341');
const {drawFarArm,drawHandTool,meleePose,reverseGripFor}=await import('../js/weapon-motion.js?v=341');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const ninja=(id,extra={})=>({id,soldierClass:'NINJA_CHUNIN',equipped:{},...extra});
const tools=Array.from({length:40},(_,i)=>ninjaHandTool(ninja(`ab${i}-${i}`)));
ok(tools.every(t=>t==='shuriken'||t==='kunai'),'always one of the two');ok(tools.includes('shuriken')&&tools.includes('kunai'),'both appear');
for(let i=0;i<40;i++)eq(ninjaHandTool(ninja(`ab${i}-${i}`)),tools[i],'same id, same tool (no save needed)');
eq(ninjaHandTool(ninja('x1-3',{equipped:{shield:{type:'SHIELD'}}})),ninjaHandTool(ninja('x1-3')),'shield does not matter');
eq(ninjaHandTool({id:'x1-3',soldierClass:'HEAVY'}),null,'others hold nothing');eq(ninjaHandTool({id:'x1-3',soldierClass:'NINJA',isPlayer:true}),null,'commander unchanged');
ok(hidesShieldArt(ninja('a')),'ninja line');
// Drawing: the tool is drawn between the far arm and the far hand, only for farArm poses, small and outside the back edge.
const rec=()=>{const log=[];let x=0;return {log,c:new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{log.push([k,...a]);}, set:(o,k,v)=>{o[k]=v;return true;}})};};
const colors={physique:{bodyWidth:1},gloves:'#555',hand:'#c1a083',cloth:'#333'};
for(const side of [1,-1]){const pose=meleePose('sword',0,side>0?0:Math.PI,colors.physique,reverseGripFor(ninja('a'),'sword'));ok(pose.farArm,'ninja pose keeps the far arm');eq(pose.side,side);
 const a=rec();drawFarArm(a.c,pose,colors,false,null);const b=rec();drawFarArm(b.c,pose,colors,false,'shuriken');const k=rec();drawFarArm(k.c,pose,colors,false,'kunai');
 ok(b.log.length>a.log.length&&k.log.length>a.log.length,'tool adds strokes');
 const last=l=>JSON.stringify(l.slice(-12));eq(last(b.log),last(a.log),'the hand is drawn last, over the tool');
 const t=rec();drawHandTool(t.c,pose.offGrip.x,pose.offGrip.y,side,'kunai');const xs=t.log.filter(([k])=>k==='lineTo'||k==='moveTo').map(([,x])=>x);
 ok(xs.every(x=>Math.abs(x)<=6),'small');ok(Math.min(...xs.map(x=>x*side))<=-5,'the blade peeks outward past the back edge');
 const s=rec();drawHandTool(s.c,pose.offGrip.x,pose.offGrip.y,side,'shuriken');const tr=s.log.find(([k])=>k==='translate');ok(tr[1]*side<pose.offGrip.x*side,'shuriken sits outside the hand');}
const simple=rec();drawFarArm(simple.c,meleePose('sword',0,0,colors.physique,true),colors,true,'kunai');const plain=rec();drawFarArm(plain.c,meleePose('sword',0,0,colors.physique,true),colors,true,null);eq(simple.log.length,plain.log.length,'simple mode skips the tool');
// Thrown weapon: tagged for the picture only; damage and timing come from the same code.
const src=(await import('node:fs')).readFileSync(new URL('../js/limited-allies.js',import.meta.url),'utf8');
ok(src.includes("type:'NINJA_SHURIKEN',tool:ninjaHandTool(s),attacker:s,")&&src.includes("damage:Math.round(s.atk*(cls.shurikenDamage||.7)),speed:390"),'same projectile, same damage');
const idx=(await import('node:fs')).readFileSync(new URL('../js/index.js',import.meta.url),'utf8');ok(idx.includes("proj.type==='NINJA_SHURIKEN'&&proj.tool==='kunai'"),'kunai picture');
console.log(`PASS ninja-hand-tool-v727 (${checks} checks)`);
