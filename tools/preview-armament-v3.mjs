import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {drawFieldSoldier} from '../js/games/iron-squad/visuals.js';
import {createSoldierAppearance} from '../js/games/iron-squad/soldier-appearance.js';
import {TIERS} from '../js/games/iron-squad/equipment-tiers.js';
import {generateRandomDrop,applyUpgradeStats} from '../js/games/iron-squad/index.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc'))GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
const canvas=createCanvas(1440,1250),c=canvas.getContext('2d');
c.fillStyle='#14202a';c.fillRect(0,0,1440,1250);
c.fillStyle='#e5d0a3';c.font='bold 27px Review';c.fillText('IRON SQUAD v3 — 装備の保護範囲と製造技術の成長',26,42);
c.fillStyle='#bfcbd0';c.font='15px Review';c.fillText('ゲームの実描画。左は小さく粗い初期品、右ほど保護面積・継ぎ目・留め具が増える。',26,71);
const tiers=[1,4,8,12,16,20,24,28],roles=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'],labels=['重装','軽装','射手','衛生','魔導'];
for(let column=0;column<tiers.length;column++){
 const tier=tiers[column],x=90+column*171;c.fillStyle='#ded2b8';c.textAlign='center';c.font='bold 18px Review';c.fillText('T'+tier,x,108);c.font='12px Review';c.fillText(TIERS[tier-1].mat.split('/')[0],x,131);
 for(let row=0;row<roles.length;row++){
  const role=roles[row],y=280+row*181;
  c.fillStyle=row%2?'#1b2b35':'#20313b';c.fillRect(x-76,y-135,152,159);
  const equipped={};for(const [type,key] of [['WEAPON','weapon'],['ARMOR','armor'],['SHIELD','shield'],['HELMET','helmet'],['LEGS','legs'],['GLOVES','gloves']]){
   const item=generateRandomDrop(0,'normal',{tier,type,quality:1,upgrade:0,merchant:true,random:()=>.5});
   if(type==='WEAPON'){item.weaponStyle=role==='ARCHER'?'bow':'sword';applyUpgradeStats(item,0);}equipped[key]=item;
  }
  const soldier={id:'v3-preview-'+role,soldierClass:role,appearance:createSoldierAppearance('v3-preview-'+role),x:0,y:0,hp:100,maxHp:100,equipped,portrait:true,facingAngle:0,vx:0,vy:0,magicAffinity:'fire'};
  c.save();c.translate(x,y);c.scale(2.7,2.7);drawFieldSoldier(c,soldier,0,{baseClassId:role},'#8a9ba1',false);c.restore();
  c.fillStyle='#c9d1cf';c.textAlign='center';c.font='12px Review';c.fillText(labels[row],x,y+17);
 }
}
c.textAlign='left';c.fillStyle='#bfcbd0';c.font='15px Review';c.fillText('28段階 = 素材7系列 × 初期型・制式型・改良型・完成型。装備部位ごとに形が変化。',26,1216);
const output=resolve('docs/previews/armament-v3.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
