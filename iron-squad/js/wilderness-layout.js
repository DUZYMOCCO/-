// World-only anchors: both terrain workers and gameplay reserve the same plots.
import {terrainHash} from './biome-terrain.js?v=278';
const C=79360,KINDS=['ruin','camp','shrine','tower'],anchors=[];
for(const [region,bearing] of [['east',0],['south',Math.PI/2],['north',-Math.PI/2],['west',Math.PI]])for(let ring=0;ring<3;ring++)for(let k=0;k<4;k++){
 const a=bearing+[-24,-8,8,24][k]*Math.PI/180+(ring-1)*.035,r=[28000,43000,62000][ring]+(terrainHash(k+region.length,ring+11)-.5)*2400;
 anchors.push(Object.freeze({region,ring,kind:KINDS[(k+ring)%4],x:C+Math.cos(a)*r,y:C+Math.sin(a)*r}));
}
export const WILDERNESS_ANCHORS=Object.freeze(anchors);
const buckets=new Map(),cell=4096,pad=900;
for(const a of anchors)for(let y=Math.floor((a.y-pad)/cell);y<=Math.floor((a.y+pad)/cell);y++)for(let x=Math.floor((a.x-pad)/cell);x<=Math.floor((a.x+pad)/cell);x++){
 const k=x*64+y;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(a);
}
export function wildernessPlotContains(x,y){
 for(const a of buckets.get(Math.floor(x/cell)*64+Math.floor(y/cell))||[])if((x-a.x)**2+(y-a.y)**2<pad*pad)return true;
 return false;
}
