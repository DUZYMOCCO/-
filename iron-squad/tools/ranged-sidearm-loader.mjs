// Hypothetical close/far transition following updateNinja's movement/attack pattern.
// Reuses normal guard targeting/navigation. No shuriken or stone fallback.
import assert from 'node:assert/strict';
import {load as candidateLoad} from './ranged-candidate-loader.mjs';
const stance=process.env.IRON_RANGED_SIDEARM||'hold';
assert.ok(['charge','hold'].includes(stance));
assert.equal(process.env.IRON_RANGED_FALLBACK,'idle');
const replaceOnce=(s,before,after)=>{assert.equal(s.split(before).length,2,`Missing sidearm patch anchor: ${before.slice(0,80)}`);return s.replace(before,after);};
export async function load(url,context,nextLoad){
  const result=await candidateLoad(url,context,nextLoad);
  if(!new URL(url).pathname.endsWith('/iron-squad/js/index.js'))return result;
  let s=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  s=replaceOnce(s,'    return ammoCombatProfile(unit,applyMasteryToCombatProfile(base, mastery));',`    const profile=ammoCombatProfile(unit,applyMasteryToCombatProfile(base,mastery));
    if(profile.ranged&&ensureAmmo(unit)<=0)return {...profile,sidearm:true,stone:false,reach:60,reachWarlord:60,baseCooldown:.9,pierce:false,splash:0,knockback:0};
    return profile;`);
  const destination=stance==='charge'?'targetX=nearestEnemy.x;targetY=nearestEnemy.y;':`if(enemyDist<=90){targetX=nearestEnemy.x;targetY=nearestEnemy.y;}else{targetX=this.player.x+35;targetY=this.player.y+25;}`;
  s=replaceOnce(s,'          if (enemyDist < safeDist) {',`          if(rkProf.sidearm){
            ${destination}
            if(enemyDist<=48){targetX=soldier.x;targetY=soldier.y;}
          }else if (enemyDist < safeDist) {`);
  s=replaceOnce(s,'          if (enemyDist <= shotRange) {',`          if(rangedProf.sidearm){
            if(enemyDist<=65){
              soldier.atkCooldown=.9/Math.max(.55,soldier.atkSpeed||1);soldier.atkAnim=1;
              soldier.facingAngle=Math.atan2(nearestEnemy.y-soldier.y,nearestEnemy.x-soldier.x);
              this.__simRangedKind='sidearm';
              try{this.performAttack(soldier,nearestEnemy,false,Math.round(totalAtk*(soldier.__candidateStoneAttack/(soldier.atk||1))),false,'physical');}finally{delete this.__simRangedKind;}
            }
          }else if (enemyDist <= shotRange) {`);
  return {...result,source:s};
}
