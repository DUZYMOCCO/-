import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawFieldBoss} from '../js/visuals.js';

const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const kinds=[['goblin_king',34],['lich_elder',38],['hellflame_drake',58],['demon_king',72]];
const frames=[],realRandom=Math.random;
Math.random=()=>{throw new Error('boss art consumed gameplay randomness');};
try{
 for(const [type,radius] of kinds)for(const hitPulse of [0,1]){
  const m=Object.freeze({type,radius,x:83000,y:83000,hp:200,maxHp:200,atk:20,isBoss:true,isColossal:true,isDungeonBoss:true,hitPulse});
  const before=JSON.stringify(m),canvas=createCanvas(375,375),native=canvas.getContext('2d');
  native.translate(187.5,280);native.scale(.85,.85);native.fillStyle='#153442';native.strokeStyle='#234531';native.lineWidth=3;native.globalAlpha=.8;
  // This test invokes the body renderer alone; neither names nor shadows can
  // satisfy visibility. A text call would be an accidental false positive.
  native.fillText=native.strokeText=()=>{throw new Error('body renderer used a label instead of a body');};
  let depth=0;const methods=new Map();
  const c=new Proxy(native,{get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;if(!methods.has(key))methods.set(key,(...args)=>{if(key==='save')depth++;if(key==='restore')depth--;return value.apply(target,args);});return methods.get(key);},set(target,key,value){return Reflect.set(target,key,value,target);}});
  const transform=()=>{const m=native.getTransform();return[m.a,m.b,m.c,m.d,m.e,m.f];};
  const state={transform:transform(),width:native.lineWidth,alpha:native.globalAlpha,blur:native.shadowBlur};
  assert.equal(drawFieldBoss(c,m,1200),true,`${type} is connected to the live boss renderer`);
  assert.equal(JSON.stringify(m),before,`${type} art leaves the monster untouched`);assert.equal(depth,0);
  assert.deepEqual({transform:transform(),width:native.lineWidth,alpha:native.globalAlpha,blur:native.shadowBlur},state,'every boss restores its transform and Canvas state');
  // napi-rs reports its last assigned style after restore, although its native
  // paint state restores correctly. Verify that state by painted pixels.
  native.save();native.setTransform(1,0,0,1,0,0);native.fillRect(0,0,8,8);native.strokeRect(12,1,8,8);native.restore();
  const fill=[...native.getImageData(3,3,1,1).data],stroke=[...native.getImageData(12,4,1,1).data];
  for(let i=0;i<3;i++){assert.ok(Math.abs(fill[i]-[21,52,66][i])<=1,'original fill paint is restored');assert.ok(Math.abs(stroke[i]-[35,69,49][i])<=1,'original stroke paint is restored');}
  const pixels=native.getImageData(80,120,220,145).data;
  let visible=0,left=220,right=-1,top=145,bottom=-1;
  for(let y=0;y<145;y++)for(let x=0;x<220;x++)if(pixels[(y*220+x)*4+3]>0){visible++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  assert.ok(visible>500,`${type}: substantial body pixels above the feet, without a shadow or label`);
  assert.ok(right-left>30&&bottom-top>40,`${type}: phone-size face/outline is larger than a soldier`);
  if(!hitPulse){const frame=canvas.toBuffer('image/png');for(const old of frames)assert.notDeepEqual(frame,old,'the four bosses have distinct bodies');frames.push(frame);}
 }
}finally{Math.random=realRandom;}
assert.equal(frames.length,4);
console.log('PASS: all 4 dungeon bosses have visible native Canvas bodies at 375px, hit flash, distinct silhouettes, no labels/shadow/RNG/stat mutation and balanced Canvas state');
