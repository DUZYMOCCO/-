import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {drawSoldierHead} from '../js/soldier-appearance.js';
import {buildCommanderAppearance,FACE_OUTLINES} from '../js/commander-identity.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Yu Gothic');
const out='iron-squad/docs/previews/wolf-20261012',stage=process.argv[2]||'after';mkdirSync(out,{recursive:true});
const faces=Object.keys(FACE_OUTLINES),canvas=createCanvas(656,faces.length*180+60),c=canvas.getContext('2d');
c.fillStyle='#17232b';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#e0d5bd';c.font='16px "Yu Gothic"';
for(let col=0;col<4;col++)c.fillText(`${col<2?'近景':'遠景'} / ${col%2?'美形':'通常'}`,col*164+12,27);
for(const [row,faceOutline]of faces.entries())for(let col=0;col<4;col++){
  const a=buildCommanderAppearance('female',{hairStyle:'wolf',hairColor:'#342e2b',skin:'#e0b899',faceOutline,jaw:'standard',accessory:'none',glasses:'none',beautiful:!!(col%2)});
  const unit={id:'wolf-preview',gender:'female',soldierClass:'COMMANDER',appearance:a};
  c.fillStyle='#aebac1';c.font='14px "Yu Gothic"';c.fillText(FACE_OUTLINES[faceOutline],col*164+12,55+row*180);
  c.save();c.translate(col*164+82,140+row*180);c.scale(8.5,8.5);drawSoldierHead(c,unit,{small:col>=2});c.restore();
}
writeFileSync(`${out}/${stage}.png`,canvas.toBuffer('image/png'));console.log(`${out}/${stage}.png`);
