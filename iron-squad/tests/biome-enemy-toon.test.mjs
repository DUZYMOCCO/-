import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {ENEMY_ROSTER,drawEnemyArt,enemyArtHeadHeight} from '../js/enemy-art.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const silhouettes=new Set();
function render(type,facingAngle=0,hitPulse=0,applied=false){
 const canvas=createCanvas(160,128),c=canvas.getContext('2d');c.translate(80,110);const transform=c.getTransform();
 const mob={type,x:50,y:50,hitPulse,facingAngle},before=structuredClone(mob);
 drawEnemyArt(c,mob,1000,applied);assert.deepEqual(mob,before);assert.equal(c.getTransform().e,transform.e);assert.equal(c.getTransform().f,transform.f);assert.equal(c.globalAlpha,1);
 return {png:canvas.toBuffer('image/png'),pixels:c.getImageData(0,0,160,128).data};
}
for(const e of ENEMY_ROSTER){
 const normal=render(e.id),flash=render(e.id,0,1),left=render(e.id,Math.PI),applied=render(e.id,Math.PI,0,true);
 assert.notDeepEqual(normal.png,flash.png,`${e.id} visibly flashes on a hit`);assert.deepEqual(applied.png,normal.png,'main renderer applies facing exactly once');
 if(!['bog_slime','giant_frog','marsh_wisp','wraith','vampire_bat','harpy'].includes(e.id))assert.notDeepEqual(left.png,normal.png,'asymmetric body has a readable facing');
 let minX=160,maxX=0,minY=128,maxY=0,count=0;
 for(let y=0;y<128;y++)for(let x=0;x<160;x++)if(normal.pixels[(y*160+x)*4+3]>100){minX=Math.min(x,minX);maxX=Math.max(x,maxX);minY=Math.min(y,minY);maxY=Math.max(y,maxY);count++;}
 assert.ok(maxX-minX>=22&&maxY-minY>=22,`${e.id} is legible at actual phone scale`);
 assert.ok(minY>110-enemyArtHeadHeight({type:e.id})+1,`${e.id} HP bar clears its head/wings/weapon`);
 assert.ok(count>250,`${e.id} has a solid body`);silhouettes.add(normal.png.toString('base64'));
}
assert.equal(silhouettes.size,22);console.log('PASS: native pixels for 22 distinct rounded bodies, phone-size silhouette, flash, facing once, gauge clearance and Canvas/unit isolation');
