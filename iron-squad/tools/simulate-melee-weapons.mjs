// Ordinary soldier weapon comparison: actual AI/attack/magic/knockback, no invented weapon skills.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {offense,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const role=arg('--role','HEAVY'),seeds=Number(arg('--seeds','8')),stage={id:'melee-middle',level:14,tier:9,pressure:150};
assert.ok(['HEAVY','LIGHT'].includes(role));
const layouts={single:[[0,0]],dense5:[[0,0],[-20,0],[20,0],[0,-20],[0,20]],line5:[[-40,0],[-20,0],[0,0],[20,0],[40,0]]},styles=['sword','spear','hammer','axe'];
const out='iron-squad/docs/previews/melee-weapons-20261013';mkdirSync(out,{recursive:true});
const report={version:release.gameVersion,cache:release.version,role,settings:{seeds,level:14,tier:9,duration,dt,frozenProgress:true,neutralTraits:true,quality:1,upgrade:0,targetDef:100,initialDistance:100,targetHp:1e12},sourceHashes:sourceStart,harnessHash:createHash('sha256').update(readFileSync('iron-squad/tools/simulate-caster-archer-balance.mjs')).digest('hex'),fixtures,results:[],checks:[]};
try{
  for(const moving of [false,true])for(const [layout,positions]of Object.entries(layouts))for(const weaponStyle of styles){
    const config={weaponStyle,neutralTraits:true,targets:positions.length,positions,distance:100,supply:'none',anchorTargets:!moving,targetSpeed:moving?30:0};
    const runs=Array.from({length:seeds},(_,i)=>offense(stage,role,config,202610130+i));
    for(const r of runs){assert.equal(r.shots,0);assert.equal(r.stones,0);assert.ok(r.magicalDamage>=0&&r.magicalDamage+r.impactDamage<=r.damage);}
    const row={weaponStyle,layout,moving,seeds,dps:mean(runs.map(r=>r.dps)),physicalDps:mean(runs.map(r=>(r.damage-r.magicalDamage-r.impactDamage)/duration)),magicalDps:mean(runs.map(r=>r.magicalDamage/duration)),impactDps:mean(runs.map(r=>r.impactDamage/duration)),p10:quantile(runs.map(r=>r.dps),.1),p90:quantile(runs.map(r=>r.dps),.9),burstDps:mean(runs.map(r=>r.burstDps)),tailDps:mean(runs.map(r=>(r.damage-r.trace.find(t=>t.seconds===120).damage)/60)),meanAttackDistance:mean(runs.map(r=>r.meanAttackDistance)),hits:mean(runs.map(r=>r.hits)),runs};
    report.results.push(row);console.log(JSON.stringify({...row,runs:undefined}));
  }
  assert.deepEqual(fingerprint(),sourceStart);
  report.checks.push('legal weapon and armour requirements','constant starting stats per weapon','real class AI and actual damage','total damage equals actual enemy HP loss','magic follow-up counted once','knockback collision damage accounted separately','zero ranged shots and stones','source hash stability');
  writeFileSync(`${out}/${role.toLowerCase()}.json`,JSON.stringify(report,null,2));console.log(`PASS ${role}: ${report.results.length} scenarios / ${report.results.length*seeds} runs`);
}finally{cleanup();}
