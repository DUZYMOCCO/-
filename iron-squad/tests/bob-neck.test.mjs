import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawSoldierHead,drawSoldierPortrait} from '../js/soldier-appearance.js';
import {buildCommanderAppearance} from '../js/commander-identity.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const appearance=buildCommanderAppearance('female',{hairStyle:'bob',hairColor:'#342e2b',skin:'#e0b899',glasses:'none',accessory:'none',beautiful:false});
const actor={id:'bob-neck',gender:'female',soldierClass:'COMMANDER',appearance};
for(const small of [false,true]){
  const canvas=createCanvas(300,300),c=canvas.getContext('2d');c.translate(150,110);c.scale(20,20);drawSoldierHead(c,actor,{small});
  const central=c.getImageData(142,241,16,9).data;
  assert.equal(central.some((v,i)=>i%4===3&&v>0),false,'bob hair must not bridge the center of the neck just below the chin');
  const side=c.getImageData(35,176,20,38).data;
  assert.ok(side.some((v,i)=>i%4===3&&v>0),'the bob still has its side locks');
}
const portrait=createCanvas(500,520),p=portrait.getContext('2d');drawSoldierPortrait(p,actor,500,520);
const neck=[...p.getImageData(249,349,1,1).data];
assert.ok(neck[0]>neck[1]&&neck[1]>neck[2]&&neck[0]>150,'the exposed center of the neck shows skin in the portrait');
console.log('PASS: bob side locks remain while the neck below the chin is clear in close/far heads and the commander portrait');
