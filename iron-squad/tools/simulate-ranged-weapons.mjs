import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {offense,durability,phases,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';

const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const stageId=arg('--stage','middle'),seeds=Number(arg('--seeds','24')),out='iron-squad/docs/previews/ranged-weapons-balance-20261013';
mkdirSync(out,{recursive:true});assert.ok(['early','middle','late'].includes(stageId));
const stage=phases.find(s=>s.id===stageId),styles=['bow','crossbow','cannon'];
const report={version:release.gameVersion,cache:release.version,stage:stageId,accountingVersion:2,settings:{seeds,duration,dt,seedBase:202610130,quality:1,upgrade:0,level:stage.level,tier:stage.tier,class:'ARCHER',targetDef:100,initialAmmo:30,frozenProgress:true},sourceHashes:sourceStart,fixtures,results:[],durability:[],checks:[]};
function measure(config,count=seeds){
  const runs=[];for(let i=0;i<count;i++)runs.push(offense(stage,'ARCHER',config,202610130+i));
  for(const r of runs){
    assert.ok(r.shots>0&&r.loadedDamage>0);assert.ok(r.damage===r.loadedDamage+r.stoneDamage,'all damage belongs to shell/bolt/arrow or stone');
    if(config.supply==='camp')assert.equal(r.stones,0);else if(config.anchorTargets)assert.ok(r.stones>0,'stationary target keeps being fought after ammo exhaustion');
  }
  const summary={...config,seeds:count,dps:mean(runs.map(r=>r.dps)),p10Dps:quantile(runs.map(r=>r.dps),.1),p90Dps:quantile(runs.map(r=>r.dps),.9),burstDps:mean(runs.map(r=>r.burstDps)),lateDps:mean(runs.map(r=>r.lateDps)),loadedDamagePerRound:mean(runs.map(r=>r.loadedDamage/r.loadedShots)),ammoEmptyAt:runs[0].ammoEmptyAt,shots:runs[0].shots,stones:runs[0].stones,infusedShots:runs[0].infusedShots,hitsPerLoadedRound:mean(runs.map(r=>r.loadedHits/r.loadedShots)),trace:runs[0].trace,runs:runs.map(({trace,...r})=>r)};
  report.results.push(summary);console.log(JSON.stringify({stage:stageId,...Object.fromEntries(Object.entries(summary).filter(([k])=>!['trace','runs'].includes(k)))}));
  return summary;
}
try{
  // Single target at all three equipment stages; packed targets and moving enemies at the middle stage.
  for(const supply of ['none','camp'])for(const targets of stageId==='middle'?[1,5]:[1])for(const weaponStyle of styles){
    measure({weaponStyle,supply,targets,anchorTargets:true});
  }
  if(stageId==='middle'){
    for(const targets of [1,5])for(const weaponStyle of styles)measure({weaponStyle,supply:'none',targets,anchorTargets:false,targetSpeed:30},Math.min(8,seeds));
    for(const weaponStyle of styles)measure({weaponStyle,supply:'none',targets:1,anchorTargets:true,liveGrowth:true},1);
    for(const weaponStyle of styles){
      const runs=[];for(let i=0;i<seeds;i++)runs.push(durability(stage,'ARCHER','physical',202610130+i,{weaponStyle}));
      report.durability.push({weaponStyle,seeds,medianSeconds:quantile(runs.map(r=>r.downAt??180),.5),medianRawIncoming:quantile(runs.map(r=>r.rawIncoming),.5),runs});
    }
    assert.ok(report.durability.every(r=>r.medianSeconds===report.durability[0].medianSeconds),'same armour and fixed pressure must give the same durability');
  }
  assert.deepEqual(fingerprint(),sourceStart,'source changed while simulation was running');
  if(stageId==='middle'){
    const old=JSON.parse(readFileSync('iron-squad/docs/previews/caster-archer-balance-20261013/results.json','utf8'));
    const previous=old.offense.find(r=>r.stage==='middle'&&r.role==='ARCHER'&&r.supply==='none'&&r.targets===1);
    const current=report.results.find(r=>r.weaponStyle==='bow'&&r.supply==='none'&&r.targets===1&&r.anchorTargets&&!r.liveGrowth);
    if(seeds===24){assert.ok(Math.abs(previous.dps-current.dps)/previous.dps<.005,'previous bow result must reproduce within 0.5% after target anchoring');report.checks.push('previous bow DPS reproduced within 0.5%');}
    const stationary=report.results.filter(r=>r.anchorTargets&&!r.liveGrowth);
    for(const style of styles){
      const one=stationary.find(r=>r.weaponStyle===style&&r.targets===1&&r.supply==='camp'),many=stationary.find(r=>r.weaponStyle===style&&r.targets===5&&r.supply==='camp');
      if(style==='cannon')assert.ok(many.dps>one.dps*3,'shell blasts actually damage the dense group');
      else assert.ok(Math.abs(many.dps/one.dps-1)<.2,'bow/bolt have no splash');
    }
  }
  report.checks.push('legal gear and fixed per-seed stats','actual projectile and damage code','total damage equals actual enemy HP loss','loaded/stone damage reconciles','30-round depletion','camp refill','source hash stability');
  writeFileSync(`${out}/${stageId}.json`,JSON.stringify(report,null,2));console.log(`PASS: ${stageId} ${report.results.length} scenarios / ${report.results.reduce((n,r)=>n+r.seeds,0)} runs`);
}finally{cleanup();}
