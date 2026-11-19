// 停電は短時間。懐中電灯は既存設定に従う。
export function create(game) {
 let t=0, base=game.baseHemiI, sun=game.sun.intensity;
 return { tick(dt){ t+=dt; const dark=t%18>12 && t%18<15; game.baseHemiI=base*(dark?0.38:1); game.sun.intensity=sun*(dark?0.35:1); game.setSpot(dark || !!game.night); }, remap(){}, dispose(){game.baseHemiI=base;game.sun.intensity=sun;game.setSpot(!!game.night);} };
}
