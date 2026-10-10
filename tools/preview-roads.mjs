import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {WorldTerrain,WORLD_SIZE,northSouthRoadX,eastWestRoadY}=await import('../js/games/iron-squad/world.js');
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const mid=WORLD_SIZE/2;
const scenes=[['北の街道',{x:northSouthRoadX(mid-1800),y:mid-1800}],['東の街道',{x:mid+1800,y:eastWestRoadY(mid+1800)}],['南の街道',{x:northSouthRoadX(mid+1800),y:mid+1800}],['西の板道',{x:mid-1800,y:eastWestRoadY(mid-1800)}]];
const canvas=createCanvas(980,1050),ctx=canvas.getContext('2d'),terrain=new WorldTerrain();
const game=Object.create(IronSquadGame);game.player={x:-1e6,y:-1e6};
ctx.fillStyle='#121e18';ctx.fillRect(0,0,980,1050);ctx.font='bold 23px Review';ctx.fillStyle='#d9d1b6';ctx.fillText('IRON SQUAD / 街道の実描画',20,35);
const objects=[],cold=[];
for(let i=0;i<scenes.length;i++){
 const [label,camera]=scenes[i],x=14+(i%2)*486,y=55+Math.floor(i/2)*488,w=470,h=470;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x+w/2-camera.x,y+h/2-camera.y);
 const start=performance.now(),props=terrain.draw(ctx,camera,w,h,1);cold.push(performance.now()-start);objects.push(props);
 for(const o of props.sort((a,b)=>a.y-b.y))game.drawWorldObj(ctx,o,1200,false);ctx.restore();
 ctx.fillStyle='#15251ce8';ctx.fillRect(x+10,y+10,125,30);ctx.fillStyle='#ded5b9';ctx.font='bold 15px Review';ctx.fillText(label,x+20,y+31);
}
ctx.fillStyle='#b5bea9';ctx.font='12px Review';ctx.fillText('既存の地形・街道・風景を使用。道の位置と通行はそのまま。',20,1040);
const output=resolve(process.argv[2]||'docs/previews/roads-v4.2.2.png');mkdirSync(resolve(output,'..'),{recursive:true});writeFileSync(output,canvas.toBuffer('image/png'));
writeFileSync(output.replace(/\.png$/,'.json'),JSON.stringify({objects,coldMs:cold,cacheTiles:terrain.tiles.size},null,2)+'\n');terrain.clear();console.log(JSON.stringify({output,coldMs:cold.map(n=>+n.toFixed(2))}));
