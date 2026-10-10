import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {initMerchants,drawMerchantBody,drawMerchantEscort,discoverCampMerchants,campHasMerchant} from '../js/merchant-rules.js';
globalThis.window={};
const {IronSquadGame}=await import('../js/index.js');
const {createCanvas,GlobalFonts}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
if(existsSync('C:/Windows/Fonts/YuGothM.ttc')) {GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','sans-serif');}
const base={x:79360,y:79360};let seq=0;
const canvas=createCanvas(860,860),c=canvas.getContext('2d');
const game={phase:1,merchantCampSeed:987654,dungeons:[
 {id:'preview_inn_1',kind:'town',name:'宿場',entrance:{x:base.x+1500,y:base.y}},
 {id:'preview_inn_2',kind:'town',name:'遠方の宿場',entrance:{x:base.x+24000,y:base.y}}
]};
const loot=()=>({id:`preview-${seq++}`,tier:3,name:'見本',type:'WEAPON',stats:{atk:10}});
initMerchants(game,loot,base);const escorts=game.merchants[0].escorts;
c.fillStyle='#111b22';c.fillRect(0,0,860,860);c.fillStyle='#deca99';c.font='bold 24px Review,sans-serif';c.fillText('IRON SQUAD / 商人と護衛',22,36);
c.fillStyle='#bac6cc';c.font='13px Review,sans-serif';c.fillText('槍兵と斧兵。兵士と同じ装備・顔・歩行・攻撃の描画を使用。',22,62);
const poses=[['待機',0,0],['歩行',0,1],['攻撃',.57,0]];
for(let row=0;row<2;row++)for(let col=0;col<3;col++) {
 const x=16+col*282,y=85+row*154;
 c.fillStyle='#21313d';c.fillRect(x,y,270,142);
 const escort={...escorts[row],x:0,y:0,facingAngle:0,attackAngle:0,atkAnim:row===1&&col===2?.54:poses[col][1],vx:poses[col][2],vy:0};
 c.save();c.translate(x+85,y+111);c.scale(1.7,1.7);drawMerchantEscort(c,escort,300);c.restore();
 c.fillStyle='#bac6cc';c.font='12px Review,sans-serif';c.fillText(poses[col][0],x+185,y+125);
}
c.fillStyle='#deca99';c.font='bold 16px Review,sans-serif';c.fillText('商人本人 / 帽子・旅装・肩掛け鞄',22,410);
for(let col=0;col<3;col++) {
 const x=16+col*282,y=424;c.fillStyle='#21313d';c.fillRect(x,y,270,171);
 c.save();c.beginPath();c.rect(x,y,270,171);c.clip();c.translate(x+155,y+134);c.scale(1.55,1.55);
 drawMerchantBody(c,{...game.merchants[col],x:0,y:0});c.restore();
}
c.fillStyle='#deca99';c.font='bold 16px Review,sans-serif';c.fillText('野営キャンプでの露店',22,626);
c.save();c.beginPath();c.rect(16,642,828,184);c.clip();c.fillStyle='#494e38';c.fillRect(16,642,828,184);
let site;for(let n=0;n<50;n++){if(campHasMerchant(game.merchantCampSeed,`camp_${n}_10`)){site={id:`camp_${n}_10`,x:base.x+1000,y:base.y};break;}}
discoverCampMerchants(game,[site],loot,base);const m=game.merchants.at(-1);
c.translate(420-m.x,762-m.y);
const painter=Object.create(IronSquadGame);painter.player={x:m.x+160,y:m.y};painter.squad=[];
const props=[{type:'tent',x:site.x,y:site.y,s:1.4,color:'#75634b',ph:1},
 {type:'barrel',x:site.x-42,y:site.y+20,s:1},{type:'crate',x:site.x+35,y:site.y+46,s:1}];
const queue=[...props.map(o=>({y:o.y,kind:0,o})),{y:m.y,kind:1,o:m},...m.escorts.map(o=>({y:o.y,kind:2,o}))];
queue.sort((a,b)=>a.y-b.y);
for(const entry of queue){if(entry.kind===0)painter.drawWorldObj(c,entry.o,300,false);else if(entry.kind===1)drawMerchantBody(c,entry.o);else drawMerchantEscort(c,entry.o,300);}
c.restore();c.fillStyle='#8fa2a9';c.font='11px Review,sans-serif';c.fillText('ゲームの描画関数による見本。実機画面ではありません。',22,847);
const output=resolve('iron-squad/docs/previews/merchant-guards.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));console.log(output);
