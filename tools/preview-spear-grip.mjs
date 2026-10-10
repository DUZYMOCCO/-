import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {drawFieldSoldier:after}=await import('../js/games/iron-squad/visuals.js');
const baseline=resolve(process.argv[2]||'__pycache__/commerce-city-baseline','js/games/iron-squad/visuals.js');
const before=existsSync(baseline)?(await import(pathToFileURL(baseline))).drawFieldSoldier:null;
const rows=before?2:1,height=before?700:400;
const canvas=createCanvas(1260,height),c=canvas.getContext('2d');c.showBattleLabels=false;
c.fillStyle='#17271f';c.fillRect(0,0,1260,height);c.fillStyle='#d8d1b6';c.font='bold 24px Review';c.fillText('槍の両手持ち / 腕と握り',22,34);
c.font='14px Review';c.fillStyle='#a8b7a2';c.fillText(before?'上段：修正前、下段：修正後。兵士・隊長・街道護衛が使う共通描画。':'現在の描画。兵士・隊長・街道護衛が使う共通描画。',22,62);
const poses=[{label:'待機',angle:0,anim:0,moving:false},{label:'歩行・左向き',angle:Math.PI,anim:0,moving:true},{label:'突きの打点',angle:0,anim:.57,moving:false}];
for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
  const x=col*420,y=85+row*300,p=poses[col];c.fillStyle=row?'#2a3d2f':'#24382c';c.fillRect(x+8,y,404,284);
  c.save();c.beginPath();c.rect(x+8,y,404,284);c.clip();c.translate(x+(col===1?306:94),y+221);c.scale(3.6,3.6);
  (row||!before?after:before)(c,{id:'spear-hands',soldierClass:'HEAVY',x:0,y:0,vx:p.moving?1:0,vy:0,hp:100,maxHp:100,facingAngle:p.angle,attackAngle:p.angle,atkAnim:p.anim,equipped:{weapon:{tier:9,weaponStyle:'spear'},helmet:{tier:9},armor:{tier:9},gloves:{tier:6},legs:{tier:6}}},1200,{baseClassId:'HEAVY'},'#8c9e86',false);c.restore();
  c.font='16px Review';c.fillStyle='#d7d0b5';c.fillText(`${row||!before?'修正後':'修正前'} · ${p.label}`,x+22,y+29);
}
c.font='12px Review';c.fillStyle='#9eaf9a';c.fillText('描画だけの変更。槍の威力・射程・貫通と攻撃判定は同じ。実機画面ではありません。',22,height-10);
const out=resolve('docs/previews/spear-grip-v4.2.15.png');mkdirSync(dirname(out),{recursive:true});writeFileSync(out,canvas.toBuffer('image/png'));console.log(out);
