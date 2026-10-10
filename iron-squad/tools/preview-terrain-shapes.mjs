import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Review');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','sans-serif');
globalThis.document={createElement:()=>createCanvas(1,1)};
const {drawNaturalPond,terrainSeed,POND_PATTERNS,HAZARD_PATTERNS}=await import('../js/terrain-shapes.js');
const {drawHazardField}=await import('../js/hazard-fields.js');
const out=createCanvas(1000,890),c=out.getContext('2d');
c.fillStyle='#15231c';c.fillRect(0,0,1000,890);c.font='bold 23px Review';c.fillStyle='#d6d0b8';c.fillText('池と危険地帯 / ゲームの描画コード',20,34);
const fields=[];
for(let y=0;y<60&&fields.length<4;y++)for(let x=0;x<60&&fields.length<4;x++){
 const variant=terrainSeed(x,y)%4;if(!fields.some(f=>f.variant===variant))fields.push({x,y,radius:86,type:['fire','poison','storm','fire'][variant],variant});
}
fields.sort((a,b)=>a.variant-b.variant);
for(let i=0;i<9;i++){
 const x=15+i%3*330,y=55+Math.floor(i/3)*273,w=310,h=252;
 c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle='#1d3023';c.fillRect(x,y,w,h);
 for(let n=0;n<250;n++){const seed=terrainSeed(i,n),px=x+seed%w,py=y+((seed>>>9)%h);c.strokeStyle='#53634445';c.lineWidth=.7;c.beginPath();c.moveTo(px,py);c.lineTo(px-2,py-4);c.moveTo(px,py);c.lineTo(px+2,py-3);c.stroke();}
 c.translate(x+w/2,y+h/2+6);
 if(i<5){c.scale(1.55,1.55);drawNaturalPond(c,0,0,terrainSeed(i*17,63),i);}
 else{const f=fields[i-5];c.translate(-f.x,-f.y);drawHazardField(c,f);}
 c.restore();c.fillStyle='#d6d0b8';c.font='bold 15px Review';c.fillText(i<5?POND_PATTERNS[i]:HAZARD_PATTERNS[i-5],x+12,y+23);
}
mkdirSync('iron-squad/docs/previews',{recursive:true});writeFileSync('iron-squad/docs/previews/terrain-shapes-v4.2.4.png',out.toBuffer('image/png'));console.log('Wrote terrain-shapes-v4.2.4.png');
