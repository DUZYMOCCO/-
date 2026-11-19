// 船の揺れは描画カメラのみ。照準・移動は変えない。
export function create(game){let t=0;return {tick(dt){t+=dt;game.gkVisualRoll=Math.sin(t*0.6)*0.025;},remap(){},dispose(){game.gkVisualRoll=0;}};}
