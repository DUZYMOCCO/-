import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {offense,phases,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';
import {candidate} from './ranged-candidate-loader.mjs';
const stance=process.env.IRON_RANGED_SIDEARM||'hold',seeds=8,stage=phases.find(p=>p.id==='middle'),out='iron-squad/docs/previews/ranged-candidates-20261013';
const pressureArg=process.argv.indexOf('--pressure'),pressure=pressureArg<0?150:Number(process.argv[pressureArg+1]);
assert.ok([0,150].includes(pressure));
const report={hypothetical:true,version:release.gameVersion,cache:release.version,candidate,stance,settings:{seeds,duration,dt,sidearmCooldown:.9,sidearmReach:65,pressure,pressureInterval:.5,pressureDistance:65,freezeGrowth:true},sourceHashes:sourceStart,loaderHash:createHash('sha256').update(readFileSync('iron-squad/tools/ranged-sidearm-loader.mjs')).digest('hex'),fixtures,results:[],checks:[]};
mkdirSync(out,{recursive:true});
try{
  for(const moving of [false,true])for(const weaponStyle of ['bow','crossbow','cannon']){
    const config={weaponStyle,initialAmmo:candidate.capacities[weaponStyle],targets:1,supply:'none',anchorTargets:!moving,targetSpeed:moving?30:0,closePressure:pressure,allowDown:true};
    const runs=Array.from({length:seeds},(_,i)=>offense(stage,'ARCHER',config,202610130+i));
    for(const r of runs){assert.equal(r.stones,0,'sidearm must never throw stones');assert.equal(r.damage,r.loadedDamage+r.sidearmDamage,'all damage must belong to ammunition or sidearm');}
    const row={weaponStyle,moving,seeds,dps:mean(runs.map(r=>r.dps)),sidearmDps:mean(runs.map(r=>r.sidearmDamage/duration)),medianDownAt:quantile(runs.map(r=>r.downAt??duration),.5),survival180:mean(runs.map(r=>r.downAt===null?1:0)),medianPressure:quantile(runs.map(r=>r.pressureIncoming),.5),ammoEmptyAt:runs[0].ammoEmptyAt,runs};
    report.results.push(row);console.log(JSON.stringify({...row,runs:undefined}));
  }
  assert.deepEqual(fingerprint(),sourceStart);
  report.checks.push('no stone or shuriken fallback','sidearm ATK excludes ranged weapon attack bonus','actual HP loss reconciles with ammunition and sidearm hits','normal guard targeting and navigation','fixed per-seed starting stats','source hash stability');
  writeFileSync(`${out}/sidearm-${stance}${pressure===0?'-no-pressure':''}.json`,JSON.stringify(report,null,2));console.log(`PASS sidearm/${stance}/${pressure}: ${report.results.length} scenarios / ${report.results.length*seeds} runs`);
}finally{cleanup();}
