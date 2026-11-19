// 緑色の床にいる間、移動を少しだけ鈍くする。
export function create(game){return {tick(){const r=game.map.gk?.rooms?.[game.gk?.room];if(!r)return;const z=game.pos.z-(r.b[1]+r.b[3])/2,x=game.pos.x-(r.b[0]+r.b[2])/2;if(Math.abs(x)<2.5&&(Math.abs(z-6)<1.5||Math.abs(z+6)<1.5)){game.vel?.multiplyScalar?.(0.96);}},remap(){},dispose(){}};}
