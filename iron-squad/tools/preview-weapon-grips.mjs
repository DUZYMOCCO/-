import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {drawFieldSoldier} from '../js/visuals.js';
import {buildCommanderAppearance} from '../js/commander-identity.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
globalThis.document={createElement:()=>createCanvas(1,1)};
const tag=process.argv[2]||'v5.3.0';
const styles=['sword','spear','hammer','axe','staff','wand','bow','crossbow','cannon'];
const names=['剣','槍','ハンマー','斧','杖','ワンド','弓','クロスボウ','火砲'];
const phases=[['構え',0,0],['引き',.82,0],['打点',.54,0],['振り抜き',.34,0],['左向き',0,Math.PI],['上向き',.54,-Math.PI/2]];
const cv=createCanvas(1500,1980),c=cv.getContext('2d');c.showBattleLabels=false;
c.fillStyle='#14221f';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#dacbad';c.font='bold 24px Review';c.fillText(`IRON SQUAD / 全武器の腕と握り / ${tag}`,20,34);
c.font='14px Review';c.fillStyle='#b2beae';c.fillText('実際のゲーム描画。肩・肘・手首、両手と柄の位置、左右と上下の向きを確認。',20,61);
for(let row=0;row<styles.length;row++)for(let col=0;col<phases.length;col++){
  const [label,anim,angle]=phases[col],x=col*250,y=84+row*206;c.fillStyle='#283b30';c.fillRect(x+6,y,238,196);
  const style=styles[row],s={id:'weapon-grip-review',soldierClass:row>=6?'ARCHER':row>=4?'MAGE':'HEAVY',x:0,y:0,hp:100,maxHp:100,portrait:true,facingAngle:angle,attackAngle:angle,atkAnim:anim,
    appearance:buildCommanderAppearance(col%2?'female':'male',{hairStyle:col%2?'bob':'short',accessory:'none'}),equipped:{weapon:{tier:13,weaponStyle:style},armor:{tier:9},gloves:{tier:6},legs:{tier:6}}};
  c.save();c.translate(x+(col===4?178:col===5?120:69),y+151);c.scale(2.9,2.9);drawFieldSoldier(c,s,1000,{baseClassId:s.soldierClass},'#839582',false);c.restore();
  c.font='14px Review';c.fillStyle='#d7cfb6';c.fillText(`${names[row]} · ${label}`,x+16,y+23);
}
c.fillStyle='#9faf9b';c.font='12px Review';c.fillText('Canvas関数の拡大見本。スマホの実画面は別途確認。',20,1960);
const out=resolve(`iron-squad/docs/previews/weapon-grips-${tag}.png`);writeFileSync(out,cv.toBuffer('image/png'));console.log(out);
