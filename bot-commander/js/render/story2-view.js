// 第2章専用の調べる印。塔の絵が未制作のため、既存の残骸と同じ静かな色の仮マーカー。
import { TILE, tileCenter } from '../sim/map.js?v=6';
export function drawStory2(g, sim, cam, gfx6) {
  const sv = sim.story2?.survey; if (!sv || sv.done) return;
  const x = tileCenter(sv.tx), y = tileCenter(sv.ty), ink = 1 / Math.max(1, cam.zoom);
  // 目的地は出発時からわかるように、霧の上にも小さく示す。
  const col = sv.blocked ? 0xef7777 : 0x7dd3fc, r = 1.8 * TILE;
  g.circle(x,y,r).fill({color:col,alpha:0.06}).stroke({color:col,width:2*ink,alpha:0.8});
  if (!gfx6?.has(sv.amount <= sv.max / 2 ? 'radio-tower-remains_v1_damaged' : 'radio-tower-remains_v1')) g.moveTo(x-12,y).lineTo(x,y-55).lineTo(x+12,y).moveTo(x-8,y-18).lineTo(x+8,y-18).moveTo(x-5,y-35).lineTo(x+5,y-35).stroke({color:0xb6b6a7,width:3*ink});
  const p = 1 - sv.amount / sv.max;
  if (p > 0) { g.moveTo(x,y-r-5); g.arc(x,y,r+5,-Math.PI/2,-Math.PI/2+Math.PI*2*p).stroke({color:col,width:4*ink}); }
}
