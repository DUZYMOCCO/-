import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {drawFieldSoldier,drawFieldCommander} from '../js/games/iron-squad/visuals.js';
import {drawMeleeRangeCue,meleeDrawReach,meleePose} from '../js/games/iron-squad/weapon-motion.js';
const packages='C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,GlobalFonts}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc')) GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
const folder=resolve('docs/previews');mkdirSync(folder,{recursive:true});
const styles=['sword','spear','hammer'],names=['剣 / 横薙ぎ','槍 / 両手突き','鎚 / 両手振り下ろし'];
const phases=[['構え',0],['引き',.82],['打点',.57],['振り抜き',.34],['戻し',.13],['構え',0]];
function actor(c,style,anim,angle,x,y,scale=1.7,commander=false) {
  const eq={weapon:{weaponStyle:style,color:'#bfc7c4'},helmet:{color:'#9daab0'}};
  c.save();c.translate(x,y);c.scale(scale,scale);
  drawMeleeRangeCue(c,0,0,angle,meleeDrawReach(eq.weapon),style,anim);
  const p={id:'motion-demo',x:0,y:0,soldierClass:'HEAVY',hp:100,maxHp:100,
    facingAngle:angle,attackAngle:angle,atkAnim:anim,equipped:eq,portrait:true};
  if(commander) drawFieldCommander(c,{...p,slashAngle:angle,slashAnim:anim},eq,0,2,'隊長',false,true);
  else drawFieldSoldier(c,p,0,{isAdvanced:false},'#829cae',false);
  c.restore();
}
const sheet=createCanvas(1212,750),c=sheet.getContext('2d');
c.fillStyle='#111b22';c.fillRect(0,0,sheet.width,sheet.height);
c.fillStyle='#deca99';c.font='bold 24px Review,sans-serif';c.fillText('IRON SQUAD / 武器の構えとスイング',20,35);
c.fillStyle='#bac6cc';c.font='14px Review,sans-serif';c.fillText('手・肘・握りを同じ動作で接続。下の短い目印は実際のスイートスポット距離。',20,62);
for(let row=0;row<3;row++) {
 c.fillStyle='#deca99';c.font='bold 15px Review,sans-serif';c.fillText(names[row],20,96+row*214);
 for(let col=0;col<6;col++) {
  const x=12+col*200,y=110+row*214;
  c.fillStyle='#21313d';c.fillRect(x,y,190,172);
  actor(c,styles[row],phases[col][1],0,x+49,y+100,1.6);
  c.fillStyle='#bac6cc';c.font='12px Review,sans-serif';c.fillText(phases[col][0],x+10,y+156);
 }
}
c.fillStyle='#8fa2a9';c.font='11px Review,sans-serif';c.fillText('ゲームのCanvas描画関数から生成。実機画面ではありません。',20,738);
writeFileSync(resolve(folder,'weapon-motion.png'),sheet.toBuffer('image/png'));
// A strip of actual rendered frames, converted to GIF with Pillow by the same tool run.
const frames=32,w=800,h=330,strip=createCanvas(w,h*frames),f=strip.getContext('2d');
for(let i=0;i<frames;i++) {
 f.save();f.translate(0,h*i);f.fillStyle='#111b22';f.fillRect(0,0,w,h);
 f.font='bold 19px Review,sans-serif';f.fillStyle='#deca99';f.fillText('武器モーション / ゆっくり再生',18,30);
 const anim=i<24?1-i/24:0;
 for(let j=0;j<3;j++) {
  f.fillStyle='#21313d';f.fillRect(12+j*264,50,256,260);
  f.fillStyle='#bac6cc';f.font='14px Review,sans-serif';f.fillText(names[j],24+j*264,75);
  actor(f,styles[j],anim,0,64+j*264,163,1.65);
  // A different direction and commander body exercise the shared pose.
  actor(f,styles[j],anim,Math.PI,178+j*264,277,1.45,true);
 }
 f.restore();
}
const output=resolve('__pycache__/weapon-motion-frames.png');mkdirSync(resolve(output,'..'),{recursive:true});
writeFileSync(output,strip.toBuffer('image/png'));
console.log(resolve(folder,'weapon-motion.png'));console.log(output);
