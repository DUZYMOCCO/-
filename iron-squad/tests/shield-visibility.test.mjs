import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawFieldSoldier} from '../js/visuals.js';
import {drawEquipmentShield} from '../js/equipment-art.js';
import {drawMeleeWeapon,drawRangedWeapon,meleePose,rangedPose,shieldMountFor} from '../js/weapon-motion.js';
import {equipmentVisualProfile} from '../js/equipment-tiers.js';
import {WEAPON_STYLES,isRangedStyle} from '../js/growth-rules.js';
import {buildCommanderAppearance} from '../js/commander-identity.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const colors={cloth:'#71858a',gloves:'#987c64',blade:'#c8d1c9',board:'#d4b56d',hand:'#c6a17d',shieldProfile:equipmentVisualProfile({tier:28})};
for(const style of WEAPON_STYLES)for(let dir=0;dir<8;dir++){
  const aim=dir*Math.PI/4,pose=(isRangedStyle(style)?rangedPose:meleePose)(style,.54,aim),actor={soldierClass:'HEAVY',atkAnim:.54,attackAngle:aim,facingAngle:aim};
  const cv=createCanvas(180,180),c=cv.getContext('2d');c.translate(90,120);
  const draw=isRangedStyle(style)?drawRangedWeapon:drawMeleeWeapon;
  draw(c,actor,style,colors);const shield=cv.toBuffer('image/png');c.clearRect(-90,-120,180,180);
  draw(c,actor,style,{...colors,shieldProfile:{coverage:0}});assert.notDeepEqual(cv.toBuffer('image/png'),shield,`${style}/${dir}: equipped shield is painted even when both hands hold a weapon`);
  const mount=shieldMountFor(actor,pose);assert.ok(Number.isFinite(mount.x)&&Number.isFinite(mount.y));
}
function field(shield,patch={},far=false){
  const cv=createCanvas(200,210),c=cv.getContext('2d');c.showBattleLabels=false;c.translate(100,150);c.scale(2.5,2.5);
  const unit={id:'visible-shield',gender:'female',soldierClass:'HEAVY',x:0,y:0,hp:90,maxHp:100,atk:70,def:42,portrait:true,facingAngle:0,atkAnim:0,
    appearance:buildCommanderAppearance('female',{hairStyle:'bob',jaw:'standard'}),equipped:{weapon:{type:'WEAPON',weaponStyle:'axe',tier:9},shield:shield?{type:'SHIELD',tier:28,stats:{def:30,hp:20}}:null},...patch};
  const before=JSON.stringify(unit);drawFieldSoldier(c,unit,1000,{baseClassId:'HEAVY'},'#829581',far);assert.equal(JSON.stringify(unit),before,'shield art changes no stats, appearance, inventory or gameplay state');return cv.toBuffer('image/png');
}
const random=Math.random;Math.random=()=>{throw new Error('shield/face art consumed gameplay RNG');};
try{
  for(const [patch,far]of [[{},false],[{},true],[{atkAnim:.54},true],[{campPose:'sit'},false],[{campPose:'drink'},true],[{isDown:true},false],[{soldierClass:'BLADEMASTER',equipped:{weapon:{weaponStyle:'sword',tier:9},shield:{type:'SHIELD',tier:28}}},false]]){
    if(patch.equipped){const without={...patch,equipped:{...patch.equipped,shield:null}};assert.notDeepEqual(field(true,patch,far),field(false,without,far),'dual blades keep a forearm shield');}
    else assert.notDeepEqual(field(true,patch,far),field(false,patch,far),'standing, distant, resting and downed shields remain visible');
  }
}finally{Math.random=random;}
const cv=createCanvas(80,80),c=cv.getContext('2d');c.translate(40,40);c.globalAlpha=.8;const transform=c.getTransform();const pictures=[];
for(const tier of [1,5,9,13,17,21,28]){c.clearRect(-40,-40,80,80);drawEquipmentShield(c,0,0,'#baae89',equipmentVisualProfile({tier}));assert.deepEqual(c.getTransform(),transform);assert.equal(c.globalAlpha,.8);pictures.push(cv.toBuffer('image/png'));}
assert.notDeepEqual(pictures[0],pictures[2],'wooden round shield differs from an iron shield');assert.notDeepEqual(pictures[2],pictures[6],'a high tier has a large rim and crest');
console.log('PASS: visible shields for all 9 weapons and 8 directions, forearm/dual grips, near/far/rest/down, tier silhouettes, Canvas state and no RNG/stat/save mutation');
