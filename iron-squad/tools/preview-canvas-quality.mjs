import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const packages='C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,GlobalFonts}=createRequire(resolve(packages,'entry.cjs'))('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {WorldTerrain,WORLD_SIZE}=await import('../js/world.js');
const {drawFieldSoldier,drawFieldMob}=await import('../js/visuals.js');
const {createSoldierAppearance}=await import('../js/soldier-appearance.js');
const {IronSquadGame,generateRandomDrop,applyUpgradeStats}=await import('../js/index.js');
const roles=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
const labels=['重装兵','軽装兵','射手','衛生術師','魔法使い'];
const center=WORLD_SIZE/2;
const game=Object.create(IronSquadGame);game.player={x:-100000,y:-100000};
function soldier(role,tier,i=0){
 const equipped={};
 for(const [type,key] of [['WEAPON','weapon'],['ARMOR','armor'],['SHIELD','shield'],['HELMET','helmet'],['LEGS','legs'],['GLOVES','gloves']]){
  equipped[key]=generateRandomDrop(0,'normal',{tier,type,quality:1,upgrade:0,merchant:true,random:()=>.5});
 }
 equipped.weapon.weaponStyle=role==='ARCHER'?'bow':role==='MAGE'?'staff':'sword';applyUpgradeStats(equipped.weapon,0);
 return {id:`quality-${role}-${i}`,soldierClass:role,appearance:createSoldierAppearance(`quality-${role}-${i}`),x:0,y:0,hp:100,maxHp:100,equipped,portrait:true,facingAngle:0,vx:1,vy:0,magicAffinity:'fire'};
}
const terrain=new WorldTerrain();
const canvas=createCanvas(1240,1010),c=canvas.getContext('2d');
c.fillStyle='#17221f';c.fillRect(0,0,1240,1010);
const title=(text,x,y,size=15)=>{c.fillStyle='#ded3b5';c.font=`bold ${size}px Review`;c.fillText(text,x,y);};
title('IRON SQUAD / Canvas の人物・装備・風景',24,35,24);
c.fillStyle='#abb9a7';c.font='13px Review';c.fillText('実ゲームの描画関数。上段は装備3段階、下段は風景と通常敵。',24,62);
for(let row=0;row<3;row++){
 const tier=[1,12,28][row],y=85+row*180;
 c.fillStyle=row%2?'#263b30':'#22352b';c.fillRect(20,y,1200,168);title(`T${tier}`,35,y+27);
 for(let i=0;i<roles.length;i++){
  c.save();c.translate(176+i*224,y+130);c.scale(2.55,2.55);
  drawFieldSoldier(c,soldier(roles[i],tier),1200,{baseClassId:roles[i]},'#7c9bb4',false);c.restore();title(labels[i],144+i*224,y+154,13);
 }
}
const y=635;
c.save();c.beginPath();c.rect(20,y,760,350);c.clip();c.translate(20,y);
for(let ty=154;ty<=156;ty++)for(let tx=154;tx<=156;tx++){const tile=terrain.get(tx,ty);c.drawImage(tile.canvas,tx*512-(center-330),ty*512-(center-170));}
c.translate(375,225);c.scale(2.0,2.0);
for(const obj of [{type:'oak',x:-110,y:5,s:1.5,tone:0,ph:.7},{type:'pine',x:-65,y:-47,s:1.2,tone:0,ph:1},{type:'rock',x:-38,y:18,s:1.3,tone:0},{type:'house',x:70,y:12,w:56,h:42,roof:'#725343'},{type:'bush',x:22,y:35,s:1,tone:0}])game.drawWorldObj(c,obj,1200,false);
c.restore();title('風景：樹木・岩・建物・地面',38,y+29,16);
c.fillStyle='#25372e';c.fillRect(796,y,424,350);title('通常敵',814,y+29,16);
for(const [i,type] of ['slime','goblin','wolf','orc','wyvern'].entries()){
 const x=859+(i%3)*139,yy=y+132+Math.floor(i/3)*153;
 c.save();c.translate(x,yy);c.scale(2.35,2.35);drawFieldMob(c,{type,x:i,hitPulse:0},1200);c.restore();title(type,x-29,yy+30,12);
}
const output=resolve(process.argv[2]||'iron-squad/docs/previews/canvas-quality-v4.2.1.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));
// Identical native Canvas work before/after: 48 soldiers + 40 enemies, no simulation.
const field=createCanvas(844,844),ctx=field.getContext('2d');ctx.showBattleLabels=false;
const soldiers=Array.from({length:48},(_,i)=>soldier(roles[i%5],[1,12,28][i%3],i));
const render=()=>{
 ctx.clearRect(0,0,844,844);
 for(let i=0;i<48;i++){ctx.save();ctx.translate(90+(i%8)*89,90+Math.floor(i/8)*118);drawFieldSoldier(ctx,soldiers[i],1200,{baseClassId:roles[i%5]},'#7c9bb4',false);ctx.restore();}
 for(let i=0;i<40;i++){ctx.save();ctx.translate(40+(i%8)*98,68+Math.floor(i/8)*150);drawFieldMob(ctx,{type:['slime','goblin','wolf','orc','wyvern'][i%5],x:i,hitPulse:0},1200);ctx.restore();}
 // Native drawing is flushed by readback, equally in both measurements.
 ctx.getImageData(0,0,1,1);
};
for(let i=0;i<25;i++)render();
const times=[];for(let i=0;i<100;i++){const start=performance.now();render();times.push(performance.now()-start);}
times.sort((a,b)=>a-b);
const stats={scene:'48 soldiers + 40 normal enemies; native Canvas render only',samples:times.length,medianMs:+times[50].toFixed(3),p95Ms:+times[95].toFixed(3),terrainCache:terrain.tiles.size};
writeFileSync(output.replace(/\.png$/,'.json'),JSON.stringify(stats,null,2)+'\n');terrain.clear();
console.log(JSON.stringify({output,...stats}));
