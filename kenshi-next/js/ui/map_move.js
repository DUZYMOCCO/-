import { mapToWorld } from './map_draw.js';

export function mapTapWorldPoint(x,y,rect,view) {
 return mapToWorld(x-rect.left,y-rect.top,view);
}

export function resolveMapDestination(point,place,walkableAt) {
 const target=place?{x:place.x,z:place.z}:{x:point?.x,z:point?.z};
 if(!Number.isFinite(target.x)||!Number.isFinite(target.z))return {ok:false,reason:'移動先を読み取れませんでした'};
 if(typeof walkableAt==='function'&&!walkableAt(target.x,target.z))return {ok:false,reason:'その地点は歩けません。別の場所を選んでください'};
 return {ok:true,...target,place:place||null};
}

export function buildMoveCommands(actorIds,x,z,{formation='line',formationPositions=null,spacing=1.4}={}) {
 const ids=[...new Set((actorIds||[]).filter(id=>id!==null&&id!==undefined))];
 if(!ids.length||!Number.isFinite(x)||!Number.isFinite(z))return [];
 if(ids.length>1&&typeof formationPositions==='function'){
  return formationPositions(ids,x,z,spacing,formation).map(pos=>({type:'move',x:pos.x,z:pos.z,actorId:pos.id}));
 }
 return ids.map(actorId=>({type:'move',x,z,actorId}));
}
