// Test hypothetical rules in memory. Never writes or patches production game files.
import assert from 'node:assert/strict';
export const candidate={bowCooldown:.60,crossbowAtk:2.4,crossbowCooldown:1.25,pierceLimit:3,pierceFalloff:.7,pierceWidth:10,cannonShellMult:1,capacities:{bow:120,crossbow:60,cannon:30}};
const fallback=process.env.IRON_RANGED_FALLBACK||'shared';
assert.ok(['inherited','shared','idle'].includes(fallback));
const replaceOnce=(source,before,after)=>{assert.equal(source.split(before).length,2,`Expected one patch anchor: ${before.slice(0,70)}`);return source.replace(before,after);};
export async function load(url,context,nextLoad){
  const result=await nextLoad(url,context),file=new URL(url).pathname;
  if(!file.includes('/iron-squad/js/')||!['/supply-rules.js','/equipment-rules.js','/index.js'].some(name=>file.endsWith(name)))return result;
  let s=typeof result.source==='string'?result.source:Buffer.from(result.source).toString('utf8');
  s=s.replaceAll('\r\n','\n');
  if(file.endsWith('/equipment-rules.js')){
    s=replaceOnce(s,'baseCooldown: 0.95, pierce: false',`baseCooldown: ${candidate.bowCooldown}, pierce: false`);
    s=replaceOnce(s,'baseCooldown: 1.25, pierce: false',`baseCooldown: ${candidate.crossbowCooldown}, pierce: false`);
    s=replaceOnce(s,'atkMult: 1.85, knockback:',`atkMult: ${candidate.crossbowAtk}, knockback:`);
  }
  if(file.endsWith('/supply-rules.js')){
    s=replaceOnce(s,'export const AMMO_CAPACITY=30;',`export const AMMO_CAPACITY=30;
export const SIM_AMMO_CAPACITIES=${JSON.stringify(candidate.capacities)};
export function ammoCapacity(u){return SIM_AMMO_CAPACITIES[(u?.equipped?.weapon||u?.weapon)?.weaponStyle]||30;}`);
    s=s.replaceAll('Math.min(AMMO_CAPACITY,','Math.min(ammoCapacity(u),').replaceAll('u.ammo=AMMO_CAPACITY','u.ammo=ammoCapacity(u)').replaceAll('ensureAmmo(u)>=AMMO_CAPACITY','ensureAmmo(u)>=ammoCapacity(u)').replaceAll('ensureAmmo(u)<AMMO_CAPACITY','ensureAmmo(u)<ammoCapacity(u)');
    if(fallback==='shared'){
      s=replaceOnce(s,'return {loaded,damage:Math.max(1,Math.round(damage*RANGED_DAMAGE_MULT*(loaded?1:STONE_MULT)))};',`const stoneBase=damage*(unit.__candidateStoneAttack/(unit.atk||1));
  return {loaded,damage:Math.max(1,Math.round((loaded?damage:stoneBase)*RANGED_DAMAGE_MULT*(loaded?1:STONE_MULT)))};`);
      s=replaceOnce(s,'return {...profile,stone:true,reach:profile.reach*STONE_MULT,reachWarlord:profile.reachWarlord*STONE_MULT,\n    baseCooldown:profile.baseCooldown/STONE_MULT,projSpeed:profile.projSpeed*STONE_MULT,splash:0,knockback:0,knockbackWarlord:0};','return {...profile,stone:true,reach:150,reachWarlord:150,baseCooldown:1.25,projSpeed:280,splash:0,knockback:0,knockbackWarlord:0};');
    }
  }
  if(file.endsWith('/index.js')){
    s=replaceOnce(s,'Object.freeze({damageMult: 2, skillRadius:',`Object.freeze({damageMult: ${candidate.cannonShellMult}, skillRadius:`);
    s=replaceOnce(s,'    applyAttributeStats(s);',`    applyAttributeStats(s);
    s.__candidateStoneAttack=Math.max(1,Math.round(s.atk*(baseCalcAtk-(s.equipped?.weapon?.stats?.atk||0))/baseCalcAtk));`);
    if(fallback==='idle')s=replaceOnce(s,'    const shot=takeRangedShot(attacker,damage);damage=shot.damage;','    if(ensureAmmo(attacker)<=0)return;\n    const shot=takeRangedShot(attacker,damage);damage=shot.damage;');
    s=replaceOnce(s,"        type: 'BOLT', damage, speed, color, knockback: knock",`        type: 'SIM_PIERCE_BOLT', damage, speed, color, knockback: knock,
        vx:Math.cos(Math.atan2(target.y-attacker.y,target.x-attacker.x))*speed,
        vy:Math.sin(Math.atan2(target.y-attacker.y,target.x-attacker.x))*speed,
        life:(profile.reach||285)/speed,hitEnemies:[]`);
    s=replaceOnce(s,"        if(proj.type==='ENEMY_BOLT')",`        if(proj.type==='SIM_PIERCE_BOLT'){
          const nx=proj.x+proj.vx*dt,ny=proj.y+proj.vy*dt,dx=nx-proj.x,dy=ny-proj.y,len2=dx*dx+dy*dy;
          proj.life-=dt;
          if(coverBlocked(this,proj,{x:nx,y:ny})){this.projectiles.splice(i,1);continue;}
          const touched=[...this.monsters].filter(m=>m.hp>0&&!proj.hitEnemies.includes(m)).map(m=>{
            const along=((m.x-proj.x)*dx+(m.y-proj.y)*dy)/len2,t=Math.max(0,Math.min(1,along));
            return {m,along,distance:Math.hypot(m.x-proj.x-t*dx,m.y-proj.y-t*dy)};
          }).filter(h=>h.along>=0&&h.along<=1&&h.distance<=${candidate.pierceWidth}+(h.m.radius||8)).sort((a,b)=>a.along-b.along);
          for(const {m} of touched){
            if(proj.hitEnemies.length>=${candidate.pierceLimit})break;
            if(coverBlocked(this,proj.attacker,m))continue;
            const damage=Math.round(proj.damage*Math.pow(${candidate.pierceFalloff},proj.hitEnemies.length));
            proj.hitEnemies.push(m);this.__simRangedKind='loaded';
            try{this.performAttack(proj.attacker,m,!!proj.isPlayer,damage,false);}finally{delete this.__simRangedKind;}
            if(proj.knockback&&!m.isColossal){const a=Math.atan2(m.y-proj.attacker.y,m.x-proj.attacker.x);m.x+=Math.cos(a)*proj.knockback;m.y+=Math.sin(a)*proj.knockback;}
          }
          proj.x=nx;proj.y=ny;
          if(proj.life<=0||proj.hitEnemies.length>=${candidate.pierceLimit})this.projectiles.splice(i,1);
          continue;
        }
        if(proj.type==='ENEMY_BOLT')`);
  }
  return {...result,source:s};
}
