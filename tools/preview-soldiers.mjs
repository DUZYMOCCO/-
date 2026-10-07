// Render the same heads used in game; no generated bitmap assets are required.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createSoldierAppearance,describeSoldierAppearance,drawSoldierPortrait} from '../js/games/iron-squad/soldier-appearance.js';
import {drawFieldSoldier} from '../js/games/iron-squad/visuals.js';
const packages=process.argv[2] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,GlobalFonts}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
const font='C:/Windows/Fonts/YuGothM.ttc'; if(existsSync(font))GlobalFonts.registerFromPath(font,'Review');
const canvas=createCanvas(1040,1588),c=canvas.getContext('2d');
c.fillStyle='#101a22';c.fillRect(0,0,1040,1588);
c.fillStyle='#deca99';c.font='bold 27px Review, sans-serif';c.fillText('IRON SQUAD  /  兵士の素顔',24,43);
c.fillStyle='#bec7ca';c.font='14px Review, sans-serif';c.fillText('ハゲ系を主役に。端正な顔は少数、衛生兵は可愛い女性風。右下は戦場での姿。',24,73);
const variants=[
 ['バーコード','barcode','HEAVY',{facialHair:'none',faceShape:'long'}],
 ['丸ハゲ','bald','HEAVY',{facialHair:'stubble',faceShape:'square'}],
 ['モヒカン','mohawk','LIGHT',{facialHair:'chin',faceShape:'long'}],
 ['サイドハゲ','sidebald','ARCHER',{facialHair:'none',faceShape:'round'}],
 ['落ち武者ハゲ','horseshoe','HEAVY',{facialHair:'mustache',faceShape:'long'}],
 ['うっすら坊主','buzz','LIGHT',{facialHair:'stubble',faceShape:'square'}],
 ['バーコード / 白髪・口ひげ','barcode','ARCHER',{hairColor:'#85827b',facialHair:'mustache',faceShape:'round'}],
 ['少数派のイケメン','swept','LIGHT',{handsome:true,faceShape:'angular',facialHair:'none',scar:false,smile:true}],
 ['衛生兵 / ボブ','bald','MEDIC',{medicHair:'bob',medicHairColor:'#51372f',medicAccessory:'clip'}],
 ['衛生兵 / ポニーテール','bald','MEDIC',{medicHair:'ponytail',medicHairColor:'#795442',medicAccessory:'ribbon'}],
 ['衛生兵 / 編み髪','bald','MEDIC',{medicHair:'braid',medicHairColor:'#332e32',medicAccessory:'none'}],
 ['大司教 / ショート','bald','HIGH_PRIEST',{medicHair:'short',medicHairColor:'#a77951',medicAccessory:'clip'}],
 ['丸ハゲ × 丸メガネ','bald','HEAVY',{glasses:'round',facialHair:'mustache',faceShape:'round'}],
 ['バーコード × 角メガネ','barcode','ARCHER',{glasses:'square',facialHair:'none',hairColor:'#85827b'}],
 ['サイドハゲ × ハーフリム','sidebald','LIGHT',{glasses:'half',facialHair:'chin'}],
 ['衛生兵 × 丸メガネ','bald','MEDIC',{glasses:'round',medicHair:'bob',medicHairColor:'#51372f'}]
];
for(let i=0;i<variants.length;i++) {
 const [name,hairStyle,soldierClass,overrides]=variants[i];
 const appearance={...createSoldierAppearance(`preview-${i}`),handsome:false,glasses:'none',hairStyle,...overrides};
 const soldier={id:`preview-${i}`,name:`兵士#${i+1}`,soldierClass,appearance,hp:100,maxHp:100,equipped:{},facingAngle:0,vx:0,vy:0,portrait:true};
 const x=16+(i%4)*256,y=96+Math.floor(i/4)*368;
 c.fillStyle='#21313d';c.fillRect(x,y,240,352);c.strokeStyle='#4e636e';c.strokeRect(x+.5,y+.5,239,351);
 c.fillStyle='#e2d5b1';c.font='bold 14px Review, sans-serif';c.fillText(name,x+12,y+26);
 c.save();c.translate(x+8,y+39);drawSoldierPortrait(c,soldier,224,238);c.restore();
 c.fillStyle='#c4cccb';c.font='11px Review, sans-serif';
 let line='',lineY=y+299;
 for(const char of describeSoldierAppearance(soldier)){if(c.measureText(line+char).width>220){c.fillText(line,x+10,lineY);line='';lineY+=14;}line+=char;}c.fillText(line,x+10,lineY);
 c.fillStyle='#90a7af';c.fillText('同じ顔をセーブに保持',x+10,y+332);
 c.save();c.translate(x+204,y+342);c.scale(1.15,1.15);drawFieldSoldier(c,{...soldier,x:0,y:0},0,{isAdvanced:soldierClass==='HIGH_PRIEST',name:soldierClass},'#829cae',false);c.restore();
}
c.fillStyle='#8f9da1';c.font='11px Review, sans-serif';c.fillText('実際のCanvas描画関数から生成した見本（ブラウザ画面のスクリーンショットではありません）。',24,1571);
const output=resolve(process.argv[3] || 'docs/previews/soldier-faces.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
