// 雷鳴前に短く点滅。攻撃判定はない。
export function create(game){let t=0,base=game.baseHemiI;return {tick(dt){t+=dt;const p=t%12;game.baseHemiI=base*(p>10.8&&p<11.1?1.65:1);},remap(){},dispose(){game.baseHemiI=base;}};}
