// usage: node iron-squad/tools/analyze-cpuprofile.mjs file.cpuprofile... -> top self-time functions
import {readFileSync} from 'node:fs';
for(const f of process.argv.slice(2)){
  const p=JSON.parse(readFileSync(f,'utf8')),by=new Map(),nodes=new Map(p.nodes.map(n=>[n.id,n]));
  const dt=p.timeDeltas;let total=0;
  p.samples.forEach((id,i)=>{const n=nodes.get(id),c=n.callFrame,k=`${c.functionName||'(anon)'} ${c.url.split('/').slice(-2).join('/')}:${c.lineNumber+1}`;const d=(dt[i]||0)/1000;by.set(k,(by.get(k)||0)+d);total+=d;});
  console.log('==',f,'total ms',total.toFixed(0));
  [...by.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).forEach(([k,v])=>console.log(' ',v.toFixed(0).padStart(6),k));
}
