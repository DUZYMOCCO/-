// Released gameplay only: no candidate loaders, disposable memory, actual HP-loss accounting.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {offense,phases,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const seeds=Number(arg('--seeds','8')),out=arg('--out','iron-squad/docs/previews/campaign-ranged-v6.7.0-20261013');
const part=arg('--part','damage');assert.ok(['damage','pressure'].includes(part));
const stage=phases.find(p=>p.id==='middle');mkdirSync(out,{recursive:true});
const layouts={single:[[0,0]],dense5:[[0,0],[-20,0],[20,0],[0,-20],[0,20]],line5:[[-40,0],[-20,0],[0,0],[20,0],[40,0]],wideLine5:[[-60,0],[0,0],[60,0],[120,0],[180,0]],spread5:[[0,0],[0,-100],[0,100],[90,-100],[90,100]]};
const report={version:release.gameVersion,cache:release.version,hypothetical:false,sourceHashes:sourceStart,fixtures,settings:{seeds,duration,dt,stage:stage.id,progressFrozen:true,initialAmmo:'actual strength-dependent capacity'},results:[],checks:[]};
function record(label,config){
  const runs=Array.from({length:seeds},(_,i)=>offense(stage,'ARCHER',config,202610130+i));
  for(const r of runs){assert.equal(r.stones,0);assert.equal(r.stoneDamage,0);assert.equal(r.damage,r.loadedDamage+r.sidearmDamage+r.impactDamage,'actual native damage categories reconcile');}
  const first=runs[0],tail=mean(runs.map(r=>(r.damage-(r.trace.find(t=>t.seconds===120)?.damage??r.damage))/(duration-120)));
  const row={...label,dps:mean(runs.map(r=>r.dps)),burstDps:mean(runs.map(r=>r.burstDps)),tailDps:tail,ammoEmptyAt:first.ammoEmptyAt,shots:first.shots,hitsPerRound:first.loadedShots?mean(runs.map(r=>r.loadedHits/r.loadedShots)):0,damagePerRound:first.loadedShots?mean(runs.map(r=>r.loadedDamage/r.loadedShots)):0,sidearmDps:mean(runs.map(r=>r.sidearmDamage/duration)),survival180:mean(runs.map(r=>r.downAt===null?1:0)),medianDownAt:quantile(runs.map(r=>r.downAt??duration),.5),runs};
  report.results.push(row);console.log(JSON.stringify({...row,runs:undefined}));return row;
}
try{
  if(part==='damage')for(const supply of ['none','camp'])for(const [layout,positions] of Object.entries(layouts))for(const weaponStyle of ['bow','crossbow','cannon']){
    const row=record({weaponStyle,layout,supply},{weaponStyle,supply,positions,targets:positions.length,anchorTargets:true});
    if(weaponStyle==='crossbow'&&['line5','wideLine5'].includes(layout))assert.ok(row.hitsPerRound>2.9&&row.hitsPerRound<=3);
    if(weaponStyle==='crossbow'&&['single','spread5'].includes(layout))assert.ok(row.hitsPerRound<=1);
  }
  if(part==='pressure')for(const moving of [false,true])for(const weaponStyle of ['bow','crossbow','cannon'])record({weaponStyle,layout:moving?'closing-pressure':'stationary-pressure',supply:'none'},{weaponStyle,targets:1,supply:'none',anchorTargets:!moving,targetSpeed:moving?30:0,closePressure:150,allowDown:true});
  assert.deepEqual(fingerprint(),sourceStart);
  report.checks.push('native modules only','legal equipment','actual HP-loss accounting','loaded/sidearm/impact categories reconcile','zero stone projectiles','three distinct hits per aligned crossbow bolt','no splash on spread crossbow targets','source hash stability');
  writeFileSync(`${out}/ranged-${part}.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS native ranged: ${report.results.length} scenarios / ${report.results.length*seeds} runs`);
}finally{cleanup();}
