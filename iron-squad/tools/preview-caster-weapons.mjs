import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {drawFieldSoldier} from '../js/visuals.js';
import {createSoldierAppearance} from '../js/soldier-appearance.js';
import {generateRandomDrop} from '../js/index.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc'))GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
const canvas=createCanvas(1100,660),c=canvas.getContext('2d');
c.fillStyle='#14202a';c.fillRect(0,0,1100,660);c.fillStyle='#e5d0a3';c.font='bold 25px Review';c.fillText('IRON SQUAD v3.1 — 職と武具',25,40);
c.fillStyle='#bfcbd0';c.font='14px Review';c.fillText('ゲームの実描画。杖・ワンド・剣・槍・鎚は形と持ち方が変わる。',25,70);
const styles=['staff','wand','sword','spear','hammer'],labels=['杖','ワンド','剣','槍','鎚'];
for(let row=0;row<2;row++)for(let col=0;col<styles.length;col++){
  const role=row?'MEDIC':'MAGE',style=styles[col],x=120+col*214,y=300+row*272;
  c.fillStyle='#20313b';c.fillRect(x-95,y-175,190,224);
  const weapon=generateRandomDrop(0,'normal',{tier:8,type:'WEAPON',weaponStyle:style,quality:1,upgrade:0,merchant:true,random:()=>.5});
  const soldier={id:`caster-preview-${role}`,soldierClass:role,appearance:createSoldierAppearance(`caster-preview-${role}`),x:0,y:0,hp:100,maxHp:100,mana:100,maxMana:100,equipped:{weapon},weapon,portrait:true,facingAngle:style==='spear'?-1:-.5,attackAngle:style==='spear'?-1:-.5,atkAnim:0,vx:0,vy:0,magicAffinity:'fire'};
  c.save();c.translate(x,y);c.scale(2.5,2.5);drawFieldSoldier(c,soldier,0,{baseClassId:role},'#8a9ba1',false);c.restore();
  c.textAlign='center';c.font='bold 17px Review';c.fillStyle='#e1d7bb';c.fillText(labels[col],x,y+28);c.font='12px Review';c.fillStyle='#bfcbd0';c.fillText(row?'衛生術師':'魔法使い',x,y+44);c.textAlign='left';
}
const output=resolve('iron-squad/docs/previews/caster-weapons.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
