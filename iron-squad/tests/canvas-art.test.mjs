import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawSoldierHead,createSoldierAppearance} from '../js/soldier-appearance.js';
import {drawFieldSoldier} from '../js/visuals.js';
import {drawOakCrown} from '../js/world.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const allocated=[];
globalThis.document={createElement(){const art=createCanvas(1,1);allocated.push(art);return art;}};
const ctx=createCanvas(160,160).getContext('2d');
for(let i=0;i<160;i++){
 const role=['HEAVY','LIGHT','MEDIC'][i%3];
 const person={id:`bounded-art-${i}`,soldierClass:role,appearance:createSoldierAppearance(`bounded-art-${i}`),x:60,y:80,hp:100,maxHp:100,equipped:{armor:{tier:1+i%28}},portrait:true};
 drawFieldSoldier(ctx,person,1000,{baseClassId:role},`#${(0x607080+i*97).toString(16)}`,false);
}
for(let tone=0;tone<4;tone++)assert.equal(drawOakCrown(ctx,tone,['#243b2c','#36543a','#527047','#8b9c65'],1),true);
assert.ok(allocated.filter(c=>c.width>1).length<=148,'head, uniform, armor and crown caches have fixed limits');
assert.ok(allocated.slice(0,20).every(c=>c.width===1&&c.height===1),'evicted pixels are released without waiting for GC');
assert.ok(allocated.reduce((bytes,c)=>bytes+c.width*c.height*4,0)<4.6*1024*1024,'all static art stays under 4.6 MiB even with deferred GC');
const person={id:'live-face',soldierClass:'HEAVY',appearance:createSoldierAppearance('live-face')};
function headPixels(){ctx.clearRect(0,0,160,160);drawSoldierHead(ctx,person,{small:true,x:60,y:40});return [...ctx.getImageData(40,20,40,50).data];}
const first=headPixels();person.appearance.glasses=person.appearance.glasses==='square'?'round':'square';assert.notDeepEqual(headPixels(),first,'an edited personal appearance cannot reuse stale face art');
const originalCreate=document.createElement;
document.createElement=()=>({width:1,height:1,getContext:()=>null});
person.appearance.hairStyle=person.appearance.hairStyle==='bald'?'mohawk':'bald';assert.doesNotThrow(headPixels,'a failed cache allocation falls back to direct drawing');
document.createElement=originalCreate;
console.log('PASS: bounded 4.6 MiB art surfaces, explicit pixel release, live appearance changes, allocation fallback');
