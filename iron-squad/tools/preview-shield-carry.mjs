import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {drawFieldSoldier} from '../js/visuals.js';
import {buildCommanderAppearance} from '../js/commander-identity.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
const styles=['sword','spear','hammer','axe','staff','wand','bow','crossbow','cannon'],names=['剣','槍','鎚','斧','杖','ワンド','弓','クロスボウ','火砲'];
const cv=createCanvas(1530,1000),c=cv.getContext('2d');c.showBattleLabels=false;
c.fillStyle='#14221f';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#ded2b6';c.font='bold 24px Review';c.fillText('装備した盾 / 両手武器は前腕に固定 / v5.3.1',20,35);
c.font='14px Review';c.fillStyle='#b3beaf';c.fillText('上から木の丸盾T1・鋼鉄の盾T13・神聖の盾T28。握りと攻撃の能力はそのまま。',20,63);
function person(style,tier,gender='male'){
  return {id:'shield-review',gender,soldierClass:style==='staff'||style==='wand'?'MAGE':style==='bow'||style==='crossbow'||style==='cannon'?'ARCHER':'HEAVY',x:0,y:0,hp:100,maxHp:100,portrait:true,facingAngle:0,attackAngle:0,atkAnim:.54,
    appearance:buildCommanderAppearance(gender,{hairStyle:gender==='female'?'bob':'short',skin:'#e0b899',glasses:'none',accessory:'none'}),
    equipped:{weapon:{tier:13,weaponStyle:style},shield:{type:'SHIELD',tier},armor:{tier:9},gloves:{tier:6},legs:{tier:6}}};
}
for(let row=0;row<3;row++)for(let col=0;col<9;col++){
  const tier=[1,13,28][row],x=col*170,y=87+row*212;c.fillStyle='#293d32';c.fillRect(x+5,y,160,202);
  c.fillStyle='#ded2b6';c.font='13px Review';c.fillText(`${names[col]} · 盾T${tier}`,x+12,y+24);
  const s=person(styles[col],tier,col%2?'female':'male');c.save();c.translate(x+63,y+158);c.scale(2.7,2.7);drawFieldSoldier(c,s,1000,{baseClassId:s.soldierClass},'#829581',false);c.restore();
}
const poses=[['待機',{}],['遠方',{far:true}],['左向き',{facingAngle:Math.PI,attackAngle:Math.PI}],['上向き',{facingAngle:-Math.PI/2,attackAngle:-Math.PI/2}],['休息',{campPose:'sit'}],['ダウン',{isDown:true}]];
for(let col=0;col<poses.length;col++){
  const [label,patch]=poses[col],x=col*255,y=731;c.fillStyle='#293d32';c.fillRect(x+5,y,245,243);c.font='14px Review';c.fillStyle='#ded2b6';c.fillText(`斧と盾 · ${label}`,x+16,y+25);
  const s={...person('axe',28,col%2?'female':'male'),atkAnim:0,...patch};c.save();c.translate(x+125,y+182);c.scale(3.5,3.5);drawFieldSoldier(c,s,1000,{baseClassId:'HEAVY'},'#829581',patch.far||false);c.restore();
}
const path=resolve('iron-squad/docs/previews/shield-carry-v5.3.1.png');writeFileSync(path,cv.toBuffer('image/png'));console.log(path);
