// In-memory candidate only: approved permanent-strength ammunition carrying capacity.
// Chains the existing no-stone sidearm candidate without touching production modules.
import assert from 'node:assert/strict';
import {load as sidearmLoad} from './ranged-sidearm-loader.mjs';
export const approvedCapacityRules={bases:{bow:120,crossbow:60,cannon:30},strengthThreshold:30,weights:{bow:1,crossbow:2,cannon:4},temporaryStrengthExcluded:true};
export async function load(url,context,nextLoad){
  const result=await sidearmLoad(url,context,nextLoad);
  if(!new URL(url).pathname.endsWith('/iron-squad/js/supply-rules.js'))return result;
  let source=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  const before="export function ammoCapacity(u){return SIM_AMMO_CAPACITIES[(u?.equipped?.weapon||u?.weapon)?.weaponStyle]||30;}";
  assert.equal(source.split(before).length,2,'approved capacity must replace exactly one candidate ammoCapacity function');
  source="import {attributeValues as simulationAttributeValues} from './unit-attributes.js?v=231';\n"+source.replace(before,`export function ammoCapacity(u){
  const style=(u?.equipped?.weapon||u?.weapon)?.weaponStyle,base=SIM_AMMO_CAPACITIES[style]||30;
  const permanentStrength=simulationAttributeValues({...u,_casterStrengthTimer:0,_casterStrengthBonus:0}).strength;
  const capacity=base+Math.floor(Math.max(0,permanentStrength-30)/({bow:1,crossbow:2,cannon:4}[style]||1));
  if(u?.id==='sim-ARCHER')globalThis.__simApprovedAmmoProbe={id:u.id,style,permanentStrength,capacity};
  return capacity;
}`);
  return {...result,source};
}
