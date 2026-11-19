// 味方の自動砲台。壁から近い敵だけをゆっくり攻撃する。
import * as THREE from '../../../vendor/three.module.min.js';
import { castShot } from '../../rules.js?v=46';
export function create(game) {
 let t=1; return {tick(dt){if(!game.gk || game.gk.phase!=='fight' || (t-=dt)>0)return;t=2.2;const r=game.map.gk.rooms[game.gk.room];if(!r)return;const [x0,z0,x1,z1]=r.b, x=x0+1.5,z=(z0+z1)/2,y=2.4;let best=null,d=24;for(const e of game.zombies){if(!e.alive||e.demo)continue;const len=Math.hypot(e.x-x,e.z-z);if(len<d){d=len;best=e;}}if(!best)return;const v=new THREE.Vector3(best.x-x,best.y+1-y,best.z-z).normalize();const hit=castShot(x,y,z,v.x,v.y,v.z,game.zombies,game.sCol,d+1);if(hit.kind!=='zombie'||game.zombies[hit.index]!==best)return;const p=new THREE.Vector3(best.x,best.y+1,best.z);game.fx.tracer(new THREE.Vector3(x,y,z),p);game.hitZombie(best,30,false,p,v,{quiet:true});},remap(){},dispose(){}};
}
