import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildCommanderAppearance} from '../js/commander-identity.js';
import {drawSoldierPortrait} from '../js/soldier-appearance.js';
import {drawFieldSoldier,drawFieldCommander} from '../js/visuals.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
for(const gender of ['male','female'])for(const soldierClass of ['HEAVY','LIGHT','ARCHER','MAGE','MEDIC']){
  const s={id:'traveler-clothes',gender,soldierClass,appearance:buildCommanderAppearance(gender),x:0,y:0,hp:100,maxHp:100,atk:20,def:10,maxMana:100,mana:100,magicAffinity:'fire',facingAngle:0,
    equipped:{helmet:{type:'HELMET',tier:1},armor:{type:'ARMOR',tier:1},weapon:{type:'WEAPON',tier:1,weaponStyle:'sword'}}};
  const render=(civilianOutfit,field=false,far=false)=>{
    const unit={...structuredClone(s),civilianOutfit},before=JSON.stringify(unit),canvas=createCanvas(240,260),c=canvas.getContext('2d');
    if(field){c.translate(120,220);c.scale(4,4);drawFieldSoldier(c,unit,100,{baseClassId:soldierClass},'#829cae',far);}else drawSoldierPortrait(c,unit,240,260);
    assert.equal(JSON.stringify(unit),before,'civilian art never changes faces, stats or actual equipped armor');return canvas.toBuffer('image/png');
  };
  for(const [field,far]of [[false,false],[true,false],[true,true]])assert.notDeepEqual(render(true,field,far),render(false,field,far),`${gender}/${soldierClass}: civilian clothing differs from uniform`);
}
const renderCommander=civilianOutfit=>{const cv=createCanvas(240,260),c=cv.getContext('2d');c.translate(120,220);c.scale(4,4);drawFieldCommander(c,{x:0,y:0,hp:100,maxHp:100,level:1,appearance:buildCommanderAppearance('male'),civilianOutfit},{},100,0,'',false,true);return cv.toBuffer('image/png');};
assert.notDeepEqual(renderCommander(true),renderCommander(false),'the player uses the same travel outfit distinction');
console.log('PASS: civilian/player travel clothes vs uniforms in both genders, five professions, portraits/close/far art, same identity/stats/equipment');
