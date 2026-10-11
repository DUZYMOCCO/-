import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {drawFieldBoss,drawFieldMob} from '../js/visuals.js';
import {RANGED_ENEMIES} from '../js/enemy-ranged.js';
import {PERIOD_ENEMIES} from '../js/day-night.js';

const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
// Every enemy type that any spawner can emit. Boss-only flags use the radius the spawner uses.
const periodTypes=[...new Set(Object.values(PERIOD_ENEMIES).flatMap(z=>Object.values(z).map(e=>e.type)))];
const TYPES=[
 ['slime',10],['goblin',11],['wolf',12],['orc',15],['wyvern',20],
 ...Object.keys(RANGED_ENEMIES).map(t=>[t,12]),
 ...periodTypes.map(t=>[t,14]),
 ['brute',30],['demon_front',16],['demon_rear',16],
 ['dragon',34],['colossal_dragon',56],['behemoth_king',62],['colossal_titan',70],
 ['goblin_king',34],['lich_elder',38],['hellflame_drake',58],['demon_king',72],
['ruin_guardian_orc',18,{type:'orc',isDungeonBoss:true}],['ruin_guardian_wyvern',24,{type:'wyvern',isDungeonBoss:true}]
];
// Pure-body renderer: mirrors drawMonster (boss art, then common mob art).
function body(c,m){return drawFieldBoss(c,m,1200)||drawFieldMob(c,m,1200);}
function render(type,radius,extra={}){
 const m=Object.freeze({type,radius,x:83000,y:83000,hp:200,maxHp:200,atk:20,hitPulse:0,...extra});
 const canvas=createCanvas(375,375),n=canvas.getContext('2d');
 n.translate(187.5,280);
 const ok=body(n,m);
 const px=n.getImageData(0,0,375,375).data;let visible=0,l=375,r=-1,t=375,b=-1;
 for(let y=0;y<375;y++)for(let x=0;x<375;x++)if(px[(y*375+x)*4+3]>0){visible++;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 return {ok,visible,w:r-l,h:b-t,png:canvas.toBuffer('image/png'),canvas};
}
const results=[];
for(const [name,radius,ex] of TYPES){
 const type=ex?.type||name,isBoss=['dragon','colossal_dragon','behemoth_king','colossal_titan','goblin_king','lich_elder','hellflame_drake','demon_king'].includes(type);
 const o={isBoss,isColossal:['colossal_dragon','behemoth_king','colossal_titan'].includes(type),...ex};delete o.type;
 results.push({name,type,radius,...render(type,radius,o)});
}
for(const r of results){
 assert.equal(r.ok,true,`${r.name}: no body renderer handles this type`);
 assert.ok(r.visible>=150,`${r.name}: body has only ${r.visible} px`);
 assert.ok(r.w>=12&&r.h>=14,`${r.name}: body ${r.w}x${r.h} is too small`);
}
// Ruins keepers must read as bosses: clearly larger than the plain orc/wyvern they are built on.
const by=Object.fromEntries(results.map(r=>[r.name,r]));
assert.ok(by.ruin_guardian_orc.visible>by.orc.visible*2.5&&by.ruin_guardian_orc.h>by.orc.h*1.5,'orc keeper is a boss-size body');
assert.ok(by.ruin_guardian_wyvern.visible>by.wyvern.visible*2.5&&by.ruin_guardian_wyvern.h>by.wyvern.h*1.5,'wyvern keeper is a boss-size body');
// Distinct silhouettes: any two different non-shared-base types must differ.
for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
 const a=results[i],b=results[j];
 if(a.type===b.type)continue;
 assert.notDeepEqual(a.png,b.png,`${a.name} and ${b.name} render as identical placeholders`);
}
if(process.env.ENEMY_SHEET){
 const cols=6,cw=190,ch=190,rows=Math.ceil(results.length/cols),sheet=createCanvas(cols*cw,rows*ch),s=sheet.getContext('2d');
 s.fillStyle='#17201d';s.fillRect(0,0,sheet.width,sheet.height);s.font='13px sans-serif';
 results.forEach((r,i)=>{const x=(i%cols)*cw,y=Math.floor(i/cols)*ch;s.strokeStyle='#345';s.strokeRect(x+.5,y+.5,cw-1,ch-1);
  // crop the body bbox area and scale to fit the cell
  s.save();s.beginPath();s.rect(x,y,cw,ch);s.clip();const sc=Math.min(2.2,(ch-34)/Math.max(r.h+8,40),(cw-10)/Math.max(r.w+8,40));
  s.drawImage(r.canvas,0,0,375,375,x+cw/2-187.5*sc,y+ch-24-280*sc,375*sc,375*sc);s.restore();
  s.fillStyle='#e8e3cf';s.fillText(`${r.name} (${r.visible}px)`,x+6,y+16);});
 writeFileSync(new URL('../docs/previews/enemy-bodies-audit.png',import.meta.url),sheet.toBuffer('image/png'));
}
console.log(`PASS: ${results.length} enemy types render a visible, distinct body`);
