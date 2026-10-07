import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {drawFieldCivilian} from '../js/games/iron-squad/civilian-visuals.js';
const {createCanvas,GlobalFonts}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc')){GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','sans-serif');}
const canvas=createCanvas(840,610),c=canvas.getContext('2d');c.fillStyle='#111b22';c.fillRect(0,0,840,610);
c.fillStyle='#deca99';c.font='bold 24px Review,sans-serif';c.fillText('IRON SQUAD / 救出対象の人物',20,36);
c.fillStyle='#bac6cc';c.font='13px Review,sans-serif';c.fillText('上段：待機、下段：紐で搬送中。同じ人物の顔と服を保持。',20,64);
for(let col=0;col<3;col++) {
 const kind=['child','woman','elder'][col],x=16+col*276;
 const person={id:`visual-${kind}`,kind,x:0,y:0};
 for(let row=0;row<2;row++) {
  const y=86+row*246;c.fillStyle='#21313d';c.fillRect(x,y,260,226);
  c.save();c.translate(x+130,y+(row?115:165));c.scale(2.7,2.7);
  drawFieldCivilian(c,{...person,appearance:person.appearance,carrierId:row?'player':undefined});c.restore();
  c.fillStyle='#bac6cc';c.font='13px Review,sans-serif';c.fillText(row?'搬送中':kind==='child'?'子供':kind==='woman'?'女性':'老人',x+12,y+24);
 }
}
c.fillStyle='#8fa2a9';c.font='11px Review,sans-serif';c.fillText('実際のゲームの描画関数で生成。実機画面ではありません。',20,595);
const output=resolve('docs/previews/civilians.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
