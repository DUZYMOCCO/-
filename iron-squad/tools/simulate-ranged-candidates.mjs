import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {offense,phases,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';
import {candidate} from './ranged-candidate-loader.mjs';
import {weaponCombatProfile} from '../js/equipment-rules.js';
import {ammoCapacity} from '../js/supply-rules.js';
import {CANNON_RULES} from '../js/index.js';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const fallback=process.env.IRON_RANGED_FALLBACK||'shared',seeds=Number(arg('--seeds','8')),stageId=arg('--stage','middle');
const layouts={single:[[0,0]],dense5:[[0,0],[-20,0],[20,0],[0,-20],[0,20]],line5:[[-40,0],[-20,0],[0,0],[20,0],[40,0]],spread5:[[0,0],[0,-100],[0,100],[90,-100],[90,100]]};
const stage=phases.find(p=>p.id===stageId),out='iron-squad/docs/previews/ranged-candidates-20261013';
assert.ok(stage&&seeds>0);
assert.equal(weaponCombatProfile({weaponStyle:'bow'}).baseCooldown,candidate.bowCooldown,'candidate loader must be active');
assert.equal(ammoCapacity({weapon:{weaponStyle:'bow'}}),120);
assert.equal(CANNON_RULES.damageMult,1);
mkdirSync(out,{recursive:true});
const report={version:release.gameVersion,cache:release.version,hypothetical:true,accountingVersion:2,candidate,fallback,stage:stageId,settings:{seeds,duration,dt,frozenProgress:true},sourceHashes:sourceStart,loaderHash:createHash('sha256').update(readFileSync('iron-squad/tools/ranged-candidate-loader.mjs')).digest('hex'),fixtures,results:[],checks:[]};
try{
  for(const supply of fallback==='shared'?['none','camp']:['none'])for(const [layout,positions]of Object.entries(layouts))for(const weaponStyle of ['bow','crossbow','cannon']){
    const config={weaponStyle,initialAmmo:candidate.capacities[weaponStyle],targets:positions.length,positions,supply,anchorTargets:true};
    const runs=Array.from({length:seeds},(_,i)=>offense(stage,'ARCHER',config,202610130+i));
    for(const r of runs){
      assert.equal(r.damage,r.loadedDamage+r.stoneDamage,'all hits, including weakened penetration hits, must reconcile');
      if(supply==='camp'||fallback==='idle')assert.equal(r.stones,0);
      else assert.ok(r.stones>0);
    }
    const tailDps=mean(runs.map(r=>(r.damage-r.trace.find(t=>t.seconds===120).damage)/(duration-120)));
    const result={weaponStyle,layout,supply,seeds,dps:mean(runs.map(r=>r.dps)),p10:quantile(runs.map(r=>r.dps),.1),p90:quantile(runs.map(r=>r.dps),.9),burstDps:mean(runs.map(r=>r.burstDps)),lateDps:mean(runs.map(r=>r.lateDps)),tailDps,ammoEmptyAt:runs[0].ammoEmptyAt,shots:runs[0].shots,stones:runs[0].stones,hitsPerLoadedRound:mean(runs.map(r=>r.loadedHits/r.loadedShots)),loadedDamagePerRound:mean(runs.map(r=>r.loadedDamage/r.loadedShots)),stoneDps:mean(runs.map(r=>r.stoneDamage/duration)),runs};
    if(weaponStyle==='crossbow'&&layout==='line5')assert.ok(result.hitsPerLoadedRound>2.9&&result.hitsPerLoadedRound<=3,'line formation must receive three distinct hits per bolt');
    if(weaponStyle==='crossbow'&&['single','spread5'].includes(layout))assert.ok(result.hitsPerLoadedRound<=1,'penetration must not become splash');
    report.results.push(result);console.log(JSON.stringify({...result,runs:undefined}));
  }
  assert.deepEqual(fingerprint(),sourceStart,'source changed during hypothetical simulation');
  report.checks.push('candidate values confirmed in loaded game modules','all hits equal actual enemy HP loss','loaded and stone damage reconcile','penetration hits at most three unique enemies','spread enemies receive no false splash','source hash stability');
  writeFileSync(`${out}/${stageId}-${fallback}.json`,JSON.stringify(report,null,2));
  console.log(`PASS ${stageId}/${fallback}: ${report.results.length} scenarios, ${report.results.length*seeds} runs`);
}finally{cleanup();}
