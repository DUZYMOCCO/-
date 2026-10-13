// Matched Lv14 bow reference for ordinary melee soldiers; all candidate rules are in memory.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {offense,fixtures,sourceStart,fingerprint,release,dt,duration,mean,quantile,cleanup} from './simulate-caster-archer-balance.mjs';
import {candidate} from './ranged-candidate-loader.mjs';
import {approvedCapacityRules} from './ranged-approved-capacity-loader.mjs';
import {weaponCombatProfile} from '../js/equipment-rules.js';
const out='iron-squad/docs/previews/melee-weapons-20261013',stage={id:'melee-middle',level:14,tier:9,pressure:150},seeds=8;
mkdirSync(out,{recursive:true});
assert.equal(process.env.IRON_RANGED_FALLBACK,'idle');assert.equal(process.env.IRON_RANGED_SIDEARM,'hold');
assert.equal(weaponCombatProfile({weaponStyle:'bow'}).baseCooldown,.60,'in-memory candidate loader must be active');
const configs=[
  {id:'full-field',initialAmmo:10000,distance:100,supply:'none'},
  {id:'full-camp',initialAmmo:10000,distance:100,supply:'camp'},
  {id:'empty-near',initialAmmo:0,distance:60,supply:'none'},
  {id:'empty-far',initialAmmo:0,distance:150,supply:'none',allowIdle:true}
];
const loaders=['ranged-approved-capacity-loader.mjs','ranged-sidearm-loader.mjs','ranged-candidate-loader.mjs'];
const report={version:release.gameVersion,cache:release.version,accountingVersion:2,hypothetical:true,kind:'matched-melee-bow-reference',candidate,approvedCapacityRules,settings:{level:14,tier:9,seeds,duration,dt,role:'ARCHER',neutralTraits:true,quality:1,upgrade:0,frozenProgress:true,fallback:'sidearm-hold',targetDef:100,targetMagicDef:100,targetHp:1e12,targets:1,targetSpeed:0},sourceHashes:sourceStart,loaderHashes:Object.fromEntries(loaders.map(f=>[f,createHash('sha256').update(readFileSync(`iron-squad/tools/${f}`)).digest('hex')])),fixtures,capacityProbe:null,results:[],checks:[],notes:[
  'Approved carrying capacity uses permanent attributeValues strength with temporary caster-strength buff cleared. Larger capacity does not itself replenish ammunition.',
  'First update clamps full-field/full-camp initialAmmo10000 to the computed carrying capacity through real ensureAmmo.',
  'Bow cooldown .60 and no stones are candidate behavior only. Empty units use the prior hold-sidearm loader: approach enemies within90, attack within65, stop approach within48, otherwise return near commander.',
  'Sidearm damage excludes the equipped ranged weapon attack contribution. No incoming damage is applied; these are damage/idle references, not survivability trials.',
  'Enemy location is fixed before/after each update. Real unit movement, projectile hits, criticals, MP, ammunition and supplies remain active. Progression is reset per frame.'
]};
try{
  for(const config of configs){
    const runs=Array.from({length:seeds},(_,i)=>offense(stage,'ARCHER',{...config,weaponStyle:'bow',neutralTraits:true,targets:1,anchorTargets:true,targetSpeed:0},202610130+i));
    const probe={...globalThis.__simApprovedAmmoProbe};
    const fixture=fixtures['melee-middle-ARCHER-bow'];
    assert.equal(probe.style,'bow');assert.equal(probe.permanentStrength,fixture.strength);
    assert.equal(probe.capacity,120+Math.floor(Math.max(0,fixture.strength-30)));
    if(report.capacityProbe)assert.deepEqual(probe,report.capacityProbe);else report.capacityProbe=probe;
    for(const run of runs){
      assert.equal(run.stones,0,'stone fallback is abolished');
      assert.equal(run.damage,run.loadedDamage+run.sidearmDamage,'ammunition and sidearm damage must exactly reconcile with actual target HP loss');
      if(config.id==='empty-far'){assert.equal(run.damage,0);assert.equal(run.shots,0);}
      if(config.id==='empty-near'){assert.equal(run.shots,0);assert.ok(run.sidearmDamage>0);}
      if(config.id==='full-camp'){assert.equal(run.ammoEmptyAt,null);assert.equal(run.sidearmDamage,0);}
      if(config.id==='full-field'){assert.equal(run.shots,probe.capacity);assert.ok(run.ammoEmptyAt>0);}
    }
    const row={id:config.id,config,seeds,initialCapacity:probe.capacity,initialStrength:fixture.strength,dps:mean(runs.map(r=>r.dps)),p10:quantile(runs.map(r=>r.dps),.1),p90:quantile(runs.map(r=>r.dps),.9),burstDps:mean(runs.map(r=>r.burstDps)),lateDps:mean(runs.map(r=>r.lateDps)),tailDps:mean(runs.map(r=>(r.damage-r.trace.find(t=>t.seconds===120).damage)/60)),loadedDps:mean(runs.map(r=>r.loadedDamage/duration)),sidearmDps:mean(runs.map(r=>r.sidearmDamage/duration)),magicalDps:mean(runs.map(r=>r.magicalDamage/duration)),ammoEmptyAt:runs[0].ammoEmptyAt,shots:mean(runs.map(r=>r.shots)),meanAttackDistance:runs[0].meanAttackDistance,runs};
    report.results.push(row);console.log(JSON.stringify({...row,runs:undefined}));
  }
  assert.deepEqual(fingerprint(),sourceStart,'source changed during matched bow reference');
  report.checks.push('candidate bow cooldown .60 confirmed','all actual equipment legal','actual strength and runtime capacity confirmed','full ammunition clamped to strength capacity','no stones','actual HP loss reconciles with loaded and sidearm damage','near empty bow attacks with sidearm','far empty bow remains idle','camp never depletes ammo','source hash stability');
  writeFileSync(`${out}/bow-reference.json`,JSON.stringify(report,null,2));console.log(`PASS matched bow reference: ${report.results.length} scenarios / ${report.results.length*seeds} runs`);
}finally{cleanup();}
