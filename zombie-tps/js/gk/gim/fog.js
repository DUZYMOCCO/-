export function create(game) {
 const fog=game.scene.fog, near=fog.near, far=fog.far;
 return {tick(){fog.near=Math.min(near,8);fog.far=Math.min(far,32);},remap(){},dispose(){fog.near=near;fog.far=far;}};
}
