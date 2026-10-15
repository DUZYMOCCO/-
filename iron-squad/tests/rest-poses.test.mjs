import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawFieldSoldier,restPoseArtStats,clearRestPoseArt} from '../js/visuals.js';
import {createSoldierAppearance} from '../js/soldier-appearance.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const s={id:'rest-visual',gender:'female',soldierClass:'LIGHT',name:'TEST',hp:100,maxHp:100,x:80,y:115,appearance:createSoldierAppearance('rest-visual','female'),equipped:{armor:{type:'ARMOR',tier:1},legs:{type:'LEGS',tier:1},helmet:{type:'HELMET',tier:1}},vx:0,vy:0};
const paint=(unit,far=false)=>{const canvas=createCanvas(160,150),c=canvas.getContext('2d');c.showBattleLabels=false;drawFieldSoldier(c,unit,1000,{baseClassId:'LIGHT'},'#8b9b88',far);const t=c.getTransform();assert.deepEqual([t.a,t.b,t.c,t.d,t.e,t.f],[1,0,0,1,0,0],'pose balances Canvas transforms');return canvas.toBuffer('image/png');};
const seen=[];for(const pose of ['sit','drink','eat','hoe','basket','tend'])for(const far of [false,true]){
 const unit={...s,campPose:['sit','drink','eat'].includes(pose)?pose:null,farmPose:['hoe','basket','tend'].includes(pose)?pose:null},before=structuredClone(unit),image=paint(unit,far);
 assert.deepEqual(unit,before,'drawing never changes HP/equipment/identity');assert.ok(image.length>650,'visible human rather than empty output');
 const upgraded={...unit,equipped:{...unit.equipped,armor:{type:'ARMOR',tier:16},helmet:{type:'HELMET',tier:16}}};assert.notDeepEqual(image,paint(upgraded,far),'real material/tier appears in rest and farm poses');seen.push(image);
}assert.notDeepEqual(seen[0],seen[2]);assert.notDeepEqual(seen[6],seen[8]);
// Cache pressure must not grow memory without bounds or retain evicted pixels.
const allocated=[];globalThis.document={createElement(){const c=createCanvas(1,1);allocated.push(c);return c;}};
for(let i=0;i<160;i++)paint({...s,id:`rest-cache-${i}`,appearance:createSoldierAppearance(`rest-cache-${i}`,'female'),campPose:'sit'});
assert.ok(restPoseArtStats().count>40);assert.ok(restPoseArtStats().bytes<=4*1024*1024);assert.ok(allocated.some(c=>c.width===1&&c.height===1));
const held=allocated.filter(c=>c.width===96&&c.height===136);clearRestPoseArt();assert.equal(restPoseArtStats().bytes,0);assert.ok(held.every(c=>c.width===1&&c.height===1));delete globalThis.document;
console.log('PASS: six rest/farm poses at both LODs, actual armor/headwear tiers, unchanged identity/equipment/HP and balanced Canvas state');
