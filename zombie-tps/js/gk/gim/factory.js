// 床のベルトではゆっくり押される。衝突処理は通常の移動と同じ。
export function create(game) {
 return {tick(dt){const r=game.map.gk?.rooms?.[game.gk?.room];if(!r)return;const [x0,z0,x1,z1]=r.b, x=game.pos.x-(x0+x1)/2,z=game.pos.z-(z0+z1)/2;if(Math.abs(Math.abs(x)-5)<1.4 && Math.abs(z)<12 && game.onGround) game.pk.z += (x<0?-1:1)*dt*2;},remap(){},dispose(){}};
}
