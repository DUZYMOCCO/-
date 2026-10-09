// Native Canvas checks for visible identity and equipment occlusion.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createSoldierAppearance,drawSoldierHead,drawSoldierPortrait,soldierAppearanceFamily} from '../js/games/iron-squad/soldier-appearance.js';
import {drawFieldSoldier} from '../js/games/iron-squad/visuals.js';
const packages=process.argv[2] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
const base={id:'field-identity-test',soldierClass:'HEAVY',x:0,y:0,hp:100,maxHp:100,portrait:true,equipped:{},facingAngle:0,vx:0,vy:0};
const look={...createSoldierAppearance(base.id),glasses:'none',facialHair:'none',faceShape:'round'};
const frame=(hairStyle,{far=false,down=false,glasses='none',helmet=false}={})=>{
 const canvas=createCanvas(160,180),c=canvas.getContext('2d');c.translate(80,140);c.scale(2,2);
 const actor={...base,appearance:{...look,hairStyle,glasses},isDown:down,downTimer:10,equipped:helmet?{helmet:{color:'#9daab0'}}:{}};
 const before=JSON.stringify(actor.appearance);drawFieldSoldier(c,actor,0,{isAdvanced:false},'#829cae',far);
 assert.equal(JSON.stringify(actor.appearance),before,'drawing states reuse the saved appearance');
 return canvas.toBuffer('image/png');
};
assert.notDeepEqual(frame('horseshoe',{far:true}),frame('sidebald',{far:true}),'far-away hair silhouettes remain distinct');
assert.notDeepEqual(frame('bald',{far:true,glasses:'round'}),frame('bald',{far:true}),'far-away glasses leave a visible marker');
assert.notDeepEqual(frame('barcode',{down:true}),frame('bald',{down:true}),'downed soldiers retain their own hairstyle');
assert.deepEqual(frame('mohawk',{helmet:true}),frame('bald',{helmet:true}),'a helmet covers crown hair, including the mohawk');
const head=helmet=>{
 const canvas=createCanvas(100,100),c=canvas.getContext('2d');
 drawSoldierHead(c,{...base,appearance:{...look,hairStyle:'mohawk'}},{x:50,y:50,scale:4,small:true,helmet});
 return c.getImageData(30,4,40,16).data;
};
assert.ok(head(null).some((v,i)=>i%4===3&&v>0),'the exposed mohawk reaches above the head');
assert.ok(head('#a5aaad').every((v,i)=>i%4!==3||v===0),'the helmet leaves no hair sticking through its top');
assert.equal(soldierAppearanceFamily('STORM_BOW'),'ARCHER');assert.equal(soldierAppearanceFamily('STAR_HUNTER'),'ARCHER');
assert.equal(soldierAppearanceFamily('SWORD_EMPEROR'),'LIGHT');assert.equal(soldierAppearanceFamily('VOID_EDGE'),'LIGHT');
assert.equal(soldierAppearanceFamily('ARCHANGEL'),'MEDIC');
const countPaints=far=>{
 let paints=0,depth=0;const noop=()=>{};
 const c=new Proxy({save(){depth++;},restore(){depth--;},fill(){paints++;},stroke(){paints++;},fillRect(){paints++;},measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:noop});
 drawFieldSoldier(c,{...base,appearance:{...look,hairStyle:'barcode',glasses:'square'}},0,{isAdvanced:false},'#829cae',far);
 assert.equal(depth,0);return paints;
};
assert.ok(countPaints(true)<countPaints(false)*.6,'preserving identity still leaves the far rendering substantially cheaper');
// Newly available hair is visible in the same close/far/down paths as old hair.
for(const style of ['short','parted','tousled','curly','tied'])for(const mode of [{},{far:true},{down:true}])assert.notDeepEqual(frame(style,mode),frame('bald',mode),`${style} remains visible in each battle state`);
const facePortrait=(beautiful,soldierClass='MEDIC')=>{
 const canvas=createCanvas(240,260),unit={...base,soldierClass,appearance:{...look,medicHair:'long',beautiful,eyeColor:'#476b64'}};
 const before=JSON.stringify(unit);drawSoldierPortrait(canvas.getContext('2d'),unit);assert.equal(JSON.stringify(unit),before,'rare looks cannot change any stats or the held identity');return canvas.toBuffer('image/png');
};
assert.notDeepEqual(facePortrait(false),facePortrait(true),'rare female face detail visibly differs at portrait size');
assert.deepEqual(facePortrait(false,'HEAVY'),facePortrait(true,'HEAVY'),'the female cosmetic does not change male faces');
console.log('PASS: field/far/down identity, glasses marker, helmet hides mohawk, promotion families, appearance unchanged and cheap LOD');
