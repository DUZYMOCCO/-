import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';

const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/meiryo.ttc'))GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
globalThis.document={createElement:()=>createCanvas(1,1)};
const source=resolve(process.argv[3]||'.','js/games/iron-squad');
const {normalizeNation,DEVELOPMENT_STAGES}=await import(pathToFileURL(resolve(source,'nation-rules.js')));
const {drawSettlementQuarter,drawCommerceActor}=await import(pathToFileURL(resolve(source,'economic-visuals.js')));
const {drawFieldSoldier}=await import(pathToFileURL(resolve(source,'visuals.js')));
const {createSoldierAppearance}=await import(pathToFileURL(resolve(source,'soldier-appearance.js')));
const canvas=createCanvas(1500,1250),c=canvas.getContext('2d');c.showBattleLabels=false;
const text=(value,x,y,size=15,color='#d1c8a9')=>{c.font=`${size>=18?'bold ':''}${size}px Review`;c.fillStyle=color;c.fillText(value,x,y);};
c.fillStyle='#17271f';c.fillRect(0,0,1500,1250);
text('IRON SQUAD / 街の発展と街道の人物',24,35,25);
text('実ゲームの描画。6段階は都市技術を0に固定し、本陣Lvの違いを比較。',24,64,14,'#a3b6a3');
function nation(level){const n=normalizeNation({investment:DEVELOPMENT_STAGES[level].cost});n.economy.regions.hq.level=level;n.economy.technology.urban.level=0;n.economy.technology.production.level=Math.floor(level/2);return n;}
for(let level=0;level<6;level++){
  const x=level%3*500,y=85+Math.floor(level/3)*410;
  c.save();c.beginPath();c.rect(x+8,y+8,484,394);c.clip();c.fillStyle=level%2?'#2b3d2d':'#253b2c';c.fillRect(x+8,y+8,484,394);
  c.translate(x+250,y+205);c.scale(.64,.64);drawSettlementQuarter(c,{nation:nation(level)},0,0,'hq');c.restore();
  text(`Lv${level} · ${DEVELOPMENT_STAGES[level].name}`,x+23,y+34,18);
}
text('往来する人物と兵士 / 同じ人物スケール',24,946,19);
const actors=['merchant','traveler','guard'].map((role,i)=>({id:`commerce_${i+12}`,name:role,role,x:0,y:0,hp:100,maxHp:100,progress:25,points:[[0,0],[1000,0]],routeLength:1000}));
const entries=[...actors,{id:'reference',soldierClass:'HEAVY',x:0,y:0,hp:100,maxHp:100,vx:1,appearance:createSoldierAppearance('reference'),equipped:{weapon:{tier:9,weaponStyle:'spear'},armor:{tier:9},helmet:{tier:9},shield:{tier:9},legs:{tier:6}}}];
for(let i=0;i<4;i++){
  const x=i*375;c.fillStyle=i%2?'#2b3d2d':'#253b2c';c.fillRect(x+8,966,359,258);
  c.save();c.beginPath();c.rect(x+8,966,359,258);c.clip();c.translate(x+(i===0?175:155),1153);c.scale(2.8,2.8);
  if(i===3)drawFieldSoldier(c,entries[i],1200,{baseClassId:'HEAVY'},'#8c9e86',false);else drawCommerceActor(c,entries[i],1.2);c.restore();
  text(['商人・積荷の荷車','旅人・背負い袋と杖','街道護衛・兵士の共通描画','比較用の一般兵'][i],x+23,999,15);
}
text('Canvas描画関数の見本。iPhone実機の画面ではありません。',24,1244,12,'#95aa96');
const output=resolve(process.argv[2]||'docs/previews/commerce-city-v4.2.15.png');mkdirSync(dirname(output),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));

const field=createCanvas(1280,800),ctx=field.getContext('2d');ctx.showBattleLabels=false;
const game={nation:nation(5)};
const traffic=Array.from({length:24},(_,i)=>({...actors[i%3],id:`perf-${i}`,x:85+(i%8)*154,y:92+Math.floor(i/8)*250,progress:50+i*2}));
const render=()=>{ctx.clearRect(0,0,1280,800);drawSettlementQuarter(ctx,game,640,350,'hq');for(const actor of traffic)drawCommerceActor(ctx,actor,1.2);ctx.getImageData(0,0,1,1);};
const start=performance.now();render();const firstMs=performance.now()-start;
for(let i=0;i<20;i++)render();const samples=[];for(let i=0;i<100;i++){const t=performance.now();render();samples.push(performance.now()-t);}samples.sort((a,b)=>a-b);
const report={scene:'royal capital + maximum 24 commerce actors; native Canvas, no simulation',samples:100,firstMs:+firstMs.toFixed(3),medianMs:+samples[50].toFixed(3),p95Ms:+samples[95].toFixed(3)};
writeFileSync(output.replace(/\.png$/,'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,...report}));
