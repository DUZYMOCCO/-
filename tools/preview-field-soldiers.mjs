import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {createSoldierAppearance} from '../js/games/iron-squad/soldier-appearance.js';
import {drawFieldSoldier} from '../js/games/iron-squad/visuals.js';
const packages=process.argv[2] || 'C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,GlobalFonts}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
const font='C:/Windows/Fonts/YuGothM.ttc';if(existsSync(font)){GlobalFonts.registerFromPath(font,'Review');GlobalFonts.registerFromPath(font,'sans-serif');}
const canvas=createCanvas(824,1032),c=canvas.getContext('2d');
c.fillStyle='#111b22';c.fillRect(0,0,824,1032);
c.fillStyle='#deca99';c.font='bold 24px Review, sans-serif';c.fillText('IRON SQUAD / フィールドの兵士',20,38);
c.fillStyle='#bac6cc';c.font='12px Review, sans-serif';c.fillText('左から素顔・兜あり・遠距離・負傷。同じ兵士の描画を拡大して比較。',20,66);
const cases=[
 ['バーコード＋角メガネ','barcode','square','HEAVY'],['丸ハゲ＋丸メガネ','bald','round','HEAVY'],
 ['モヒカン','mohawk','none','LIGHT'],['サイドハゲ＋ハーフリム','sidebald','half','ARCHER'],
 ['落ち武者ハゲ','horseshoe','none','HEAVY'],['衛生兵・ポニーテール','bald','none','MEDIC'],
 ['衛生兵・ボブ＋丸メガネ','bald','round','MEDIC'],['聖女・編み髪','bald','none','SAINT']
];
for(let i=0;i<cases.length;i++) {
 const [label,hairStyle,glasses,soldierClass]=cases[i],x=16+(i%2)*404,y=88+Math.floor(i/2)*232;
 c.fillStyle='#21313d';c.fillRect(x,y,388,216);c.strokeStyle='#50636b';c.strokeRect(x+.5,y+.5,387,215);
 c.fillStyle='#e0d2ae';c.font='bold 14px Review, sans-serif';c.fillText(label,x+12,y+24);
 const appearance={...createSoldierAppearance(`field-demo-${i}`),hairStyle,glasses,handsome:false,
  medicHair:i===5?'ponytail':i===7?'braid':'bob',medicHairColor:i===5?'#795442':'#51372f'};
 const soldier={id:`field-demo-${i}`,name:'兵士',soldierClass,appearance,x:0,y:0,hp:100,maxHp:100,portrait:true,
  equipped:{weapon:{color:'#b6bbac',weaponStyle:soldierClass==='ARCHER'?'bow':'sword'}},facingAngle:0,vx:0,vy:0};
 const cls={name:soldierClass,isAdvanced:soldierClass==='SAINT'};
 const positions=[48,140,230,330],labels=['素顔','兜','遠距離','負傷'];
 for(let k=0;k<4;k++) {
  c.save();c.translate(x+positions[k],y+(k===3?120:152));c.scale(2.15,2.15);
  const actor={...soldier,equipped:{...soldier.equipped,...(k===1?{helmet:{color:'#9daab0'}}:{})},isDown:k===3,downTimer:10};
  drawFieldSoldier(c,actor,0,cls,'#829cae',k===2);c.restore();
  c.fillStyle='#bac6cc';c.font='11px Review, sans-serif';c.textAlign='center';c.fillText(labels[k],x+positions[k],y+190);c.textAlign='left';
 }
}
c.fillStyle='#8fa2a9';c.font='11px Review, sans-serif';c.fillText('ゲームの描画関数を使用した見本。実機スクリーンショットではありません。',20,1020);
const output=resolve(process.argv[3] || 'docs/previews/field-soldiers.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
