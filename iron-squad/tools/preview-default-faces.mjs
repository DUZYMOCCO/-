import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {drawSoldierHead} from '../js/soldier-appearance.js';
import {buildCommanderAppearance} from '../js/commander-identity.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
const tag=process.argv[2]||'v5.3.1',cv=createCanvas(1280,690),c=cv.getContext('2d');
c.fillStyle='#14221f';c.fillRect(0,0,cv.width,cv.height);c.fillStyle='#ded2b6';c.font='bold 24px Review';c.fillText(`ふつうの顎と、選択した四角い顎 / ${tag}`,20,35);
c.font='14px Review';c.fillStyle='#b3beaf';c.fillText('左3列は顎「ふつう」。右端だけ四角い顎を選択。上が男、下が女。',20,63);
const choices=[['ふつう / 既存の面長',{faceShape:'long'}],['ふつう / 既存の角顔',{faceShape:'square'}],['ふつう / 細い輪郭',{faceOutline:'angular'}],['選択した四角い顎',{jaw:'square'}]];
for(let row=0;row<2;row++)for(let col=0;col<4;col++){
  const gender=row?'female':'male',[title,patch]=choices[col],x=col*320,y=88+row*292;
  c.fillStyle='#293d32';c.fillRect(x+8,y,304,278);c.font='14px Review';c.fillStyle='#d9cfb7';c.fillText(title,x+20,y+25);
  const a={...buildCommanderAppearance(gender,{hairStyle:row?'bob':'short',skin:'#e0b899',accessory:'none',glasses:'none',...patch}),...patch};
  const actor={id:'default-face-preview',gender,soldierClass:'COMMANDER',appearance:a};
  drawSoldierHead(c,actor,{x:x+112,y:y+141,scale:14});drawSoldierHead(c,actor,{x:x+252,y:y+153,scale:6,small:true});
  c.fillStyle='#a9b7a7';c.font='12px Review';c.fillText('肖像',x+90,y+254);c.fillText('戦場',x+233,y+254);
}
const path=resolve(`iron-squad/docs/previews/default-faces-${tag}.png`);writeFileSync(path,cv.toBuffer('image/png'));console.log(path);
