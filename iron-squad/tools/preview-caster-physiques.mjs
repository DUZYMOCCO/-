import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createSoldierAppearance,drawSoldierPortrait} from '../js/soldier-appearance.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {drawFieldSoldier} from '../js/visuals.js';
import {generateRandomDrop} from '../js/index.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc'))GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
const canvas=createCanvas(1000,700),c=canvas.getContext('2d');
c.fillStyle='#14202a';c.fillRect(0,0,1000,700);c.fillStyle='#e5d0a3';c.font='bold 25px Review';c.fillText('IRON SQUAD v3.1.1 — 術者の体格',24,40);
c.fillStyle='#bdc8cd';c.font='14px Review';c.fillText('同じ顔で体格を比較。人物画像と戦場の実描画を使用。',24,68);
for(let i=0;i<4;i++){
  const role=i<2?'MAGE':'MEDIC',muscular=i%2===1,x=135+i*244;
  const attributeProfile=rollAttributeProfile(role,'AVERAGE',()=>.5,true);
  if(muscular){attributeProfile.innate.strength=60;attributeProfile.aptitudes.strength=2;}
  const style=muscular?(role==='MAGE'?'sword':'hammer'):(role==='MAGE'?'wand':'staff');
  const weapon=generateRandomDrop(0,'normal',{tier:8,type:'WEAPON',weaponStyle:style,quality:1,upgrade:0,merchant:true,random:()=>.5});
  const unit={id:`physique-preview-${role}`,soldierClass:role,appearance:createSoldierAppearance(`physique-preview-${role}`),attributeProfile,
    level:1,talent:'AVERAGE',x:0,y:0,hp:100,maxHp:100,mana:100,maxMana:100,equipped:{weapon},weapon,
    portrait:true,facingAngle:style==='staff'?-.25:-.5,atkAnim:0,vx:0,vy:0,magicAffinity:'fire'};
  c.fillStyle='#e1d7bb';c.font='bold 17px Review';c.textAlign='center';c.fillText(`${role==='MAGE'?'魔法使い':'衛生術師'} · ${muscular?'筋力型':'通常'}`,x,105);
  const face=createCanvas(204,220);drawSoldierPortrait(face.getContext('2d'),unit,204,220);c.drawImage(face,x-102,122);
  c.fillStyle='#20313b';c.fillRect(x-102,358,204,258);
  c.save();c.translate(x,579);c.scale(3.3,3.3);drawFieldSoldier(c,unit,0,{baseClassId:role},'#8a9ba1',false);c.restore();
  c.fillStyle='#bdc8cd';c.font='14px Review';c.fillText(muscular?'広い肩・厚い胴・太い腕':'通常の体格',x,643);
  c.textAlign='left';
}
c.fillStyle='#90a3aa';c.font='12px Review';c.fillText('開発用の比較見本。ゲーム内に条件や専用名称は表示しない。',24,680);
const output=resolve('iron-squad/docs/previews/caster-physiques.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
