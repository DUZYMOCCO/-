import assert from 'node:assert/strict';
import {test} from 'node:test';
import {beginGuardFormation,guardFormationTarget,guardFormationSpeedMult,guardFormationRole} from '../js/guard-formation.js?v=266';
import {guardTarget,guardRegrouping,GUARD_LEASH} from '../js/guard-leash.js?v=266';
import {rollAttributeProfile} from '../js/unit-attributes.js?v=248';
import {updateMageAI} from '../js/magic-rules.js?v=266';
const unit=(role,slot,muscle=false)=>({id:`${role}-${slot}`,soldierClass:role,combatClass:role,_guardSlot:slot,isPersonalGuard:true,hp:100,maxHp:100,x:100,y:100,speed:90,
  attributeProfile:rollAttributeProfile(role,'AVERAGE',()=>.5,true),level:1,talent:'AVERAGE',atk:muscle?200:10,magicAttack:muscle?10:100,
  equipped:{weapon:{weaponStyle:muscle?'hammer':role==='MAGE'?'wand':role==='MEDIC'?'staff':role==='ARCHER'?'bow':'sword'}},mana:52,magicAffinity:'fire'});
const game=()=>({player:{isPlayer:true,x:100,y:100,hp:100,facingAngle:0,equipped:{weapon:{weaponStyle:'sword'}}},squad:[],monsters:[],getNearestMonster:()=>null,getNearestFromList:()=>null});
for(const caster of [false,true])test(`four directions put ranged guards behind and melee guards ahead (caster commander: ${caster})`,()=>{
  for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const g=game();g.player.facingAngle=angle;if(caster)g.player.equipped.weapon.weaponStyle='wand';
    g.squad=[unit('HEAVY',0),unit('LIGHT',1),unit('ARCHER',2),unit('MAGE',3),unit('MEDIC',4),unit('MAGE',5,true),unit('MEDIC',6,true)];
    beginGuardFormation(g,.016);const targets=g.squad.map(u=>guardFormationTarget(g,u));
    for(let i=0;i<g.squad.length;i++){
      const u=g.squad[i],p=targets[i],projection=(p.x-g.player.x)*Math.cos(angle)+(p.y-g.player.y)*Math.sin(angle);
      assert.ok(guardFormationRole(u)==='rear'?projection<0:projection>0,`${u.id}: ${projection}`);
      assert.ok(Math.hypot(p.x-g.player.x,p.y-g.player.y)<=80,'recovery still recognizes a follow goal');
      assert.ok(targets.every((other,j)=>i===j||Math.hypot(p.x-other.x,p.y-other.y)>=22));
    }
  }
});
test('twelve same-role guards retain slot order, spacing and a stable stopped heading',()=>{
  const g=game();g.squad=Array.from({length:12},(_,i)=>unit('MAGE',i));beginGuardFormation(g,.016);
  const first=g.squad.map(u=>guardFormationTarget(g,u));
  for(let i=0;i<first.length;i++){assert.ok(Math.hypot(first[i].x-100,first[i].y-100)<=80);for(let j=0;j<i;j++)assert.ok(Math.hypot(first[i].x-first[j].x,first[i].y-first[j].y)>=22);}
  for(let i=0;i<600;i++){beginGuardFormation(g,.016);assert.deepEqual(g.squad.map(u=>guardFormationTarget(g,u)),first,'no orbit while standing');}
});
test('a reversal sends the rear guard through a short side passage without a forward arc or teleport',()=>{
  const g=game(),u=unit('MAGE',0);g.squad=[u];beginGuardFormation(g,.016);Object.assign(u,guardFormationTarget(g,u));
  g.joystick={active:true,dirX:-1,dirY:0};let minRadius=Infinity,maxRadius=0;
  for(let i=0;i<240;i++){
    beginGuardFormation(g,1/60);const target=guardFormationTarget(g,u);assert.ok(target.x>=g.player.x,'new rear target never points ahead of the reversed commander');
    const dx=target.x-u.x,dy=target.y-u.y,d=Math.hypot(dx,dy),step=Math.min(d,u.speed*guardFormationSpeedMult(g,u,target)*1/60);
    if(d){u.x+=dx/d*step;u.y+=dy/d*step;}const radius=Math.hypot(u.x-100,u.y-100);minRadius=Math.min(minRadius,radius);maxRadius=Math.max(maxRadius,radius);
    assert.ok(step<=u.speed*GUARD_LEASH.dash/60+.00001);
  }
  assert.ok(u.x>130);assert.ok(minRadius>15,'passes beside the commander');assert.ok(maxRadius<60,'no wide circle');assert.equal(guardFormationSpeedMult(g,u,guardFormationTarget(g,u)),1);
});
test('formation catch-up uses 60/20 hysteresis, stops in combat, and leaves the 300/90 leash unchanged',()=>{
  const g=game(),u=unit('HEAVY',0);g.squad=[u];beginGuardFormation(g,.016);const goal=guardFormationTarget(g,u);
  for(const [distance,mult]of [[61,1.9],[59,1.9],[21,1.9],[20,1],[59,1]]){Object.assign(u,{x:goal.x+distance,y:goal.y});assert.equal(guardFormationSpeedMult(g,u,goal),mult);assert.equal(u.regrouping,undefined);}
  u.x=goal.x+100;assert.equal(guardFormationSpeedMult(g,u,goal),1.9);assert.equal(guardFormationSpeedMult(g,u,goal,true),1);
  const enemy={x:120,y:100};assert.equal(guardTarget(g,u,enemy),enemy,'formation flag never suppresses engagement');
  u.x=g.player.x+301;assert.equal(guardRegrouping(g,u),true);assert.equal(guardTarget(g,u,enemy),null);assert.equal(guardFormationSpeedMult(g,u,goal,true),1.9,'existing leash dash remains independent');
  u.x=g.player.x+89;assert.equal(guardRegrouping(g,u),false);
});
test('MP52 and exhausted mageHolds use rear goals in all four directions; meditation still holds during combat',()=>{
  for(const mana of [52,0])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){
    const g=game(),u=unit('MAGE',0);g.squad=[u];u.mana=mana;g.player.facingAngle=angle;beginGuardFormation(g,.1);let target;
    g.dungeonMoveTarget=(u,goal)=>(target=goal);updateMageAI(g,u,.1,{id:0},{range:260});
    assert.ok((target.x-100)*Math.cos(angle)+(target.y-100)*Math.sin(angle)<0);assert.ok((u.x-100)*Math.cos(angle)+(u.y-100)*Math.sin(angle)<0);
    assert.equal(!!u.magicRecovering,mana===0);
  }
  const g=game(),u=unit('MAGE',0);g.squad=[u];u.mana=0;g.getNearestMonster=()=>({x:140,y:100,hp:100});updateMageAI(g,u,.1,{id:0},{range:260});assert.deepEqual([u.x,u.y],[100,100]);
});
test('mage combat still retreats inside 100, holds at spell range, and muscle casters engage without formation acceleration',()=>{
  for(const [distance,muscle]of [[50,false],[180,false],[50,true]]){
    const g=game(),u=unit('MAGE',0,muscle);g.squad=[u];const enemy={x:u.x+distance,y:u.y,hp:100};g.getNearestMonster=()=>enemy;u.atkCooldown=10;
    updateMageAI(g,u,.1,{id:0},{range:260});
    if(muscle)assert.ok(u.x>100&&u.x<=109.01);else if(distance<100)assert.ok(u.x<100&&u.x>=90.99);else assert.equal(u.x,100);
  }
});
