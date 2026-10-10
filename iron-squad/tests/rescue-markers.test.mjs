import assert from 'node:assert/strict';
import {clusterRescueMarkers} from '../js/rescue-markers.js?v=174';
const P=(ex,ey,dist,carried=false)=>({ex,ey,angle:0,dist,carried});
// Five downed allies stacked at the right edge fold into one marker pointing at the nearest.
{
  const pts=[P(339,300,900),P(339,310,160),P(339,330,500),P(339,340,700),P(339,320,300,true)];
  const out=clusterRescueMarkers(pts,pts.length);
  assert.equal(out.length,1);assert.equal(out[0].count,5);assert.equal(out[0].dist,160);assert.equal(out[0].ey,310);assert.equal(out[0].carried,false);
}
// Far apart stay separate; every pair of survivors is outside the overlap box.
{
  const pts=[];for(let i=0;i<40;i++)pts.push(P(36+(i*37)%300,95+(i*53)%500,100+i*13,i%2===0));
  const out=clusterRescueMarkers(pts,pts.length);
  assert.equal(out.reduce((a,c)=>a+c.count,0),40);
  for(let i=0;i<out.length;i++)for(let j=i+1;j<out.length;j++)assert.ok(Math.abs(out[i].ex-out[j].ex)>=80||Math.abs(out[i].ey-out[j].ey)>=44,'markers never overlap');
}
// All carried -> green; reuse of the output pool does not grow.
{
  const out=[];const a=clusterRescueMarkers([P(10,10,5,true),P(20,20,9,true)],2,out);
  assert.equal(a[0].carried,true);assert.equal(a[0].count,2);
  const b=clusterRescueMarkers([P(10,10,5),P(300,500,9,true)],2,out);
  assert.equal(b,out);assert.equal(out.length,2);assert.equal(out[1].carried,true);
  assert.equal(clusterRescueMarkers([],0,out).length,0);
}
console.log('PASS: rescue marker clustering');
