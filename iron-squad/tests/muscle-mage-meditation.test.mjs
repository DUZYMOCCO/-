import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rollAttributeProfile,prefersCasterMelee} from '../js/unit-attributes.js';
import {canMeditate,ensureMana,regenerateMana,distributeMagicStones,updateMageAI,MAGE_IDS} from '../js/magic-rules.js';

const mage=(role='MAGE',muscle=true,style='wand')=>{
  const attributeProfile=rollAttributeProfile(role,'AVERAGE',()=>.5,true);
  if(muscle)attributeProfile.innate.strength=60;
  return {id:'test-mage',soldierClass:role,attributeProfile,level:1,talent:'AVERAGE',
    equipped:{weapon:{weaponStyle:style}},hp:100,maxHp:100,mana:0,magicRecovering:true,
    magicAffinity:'fire',atk:10,magicAttack:100,speed:90,x:0,y:0,isPersonalGuard:true};
};
const game=()=>({player:{x:100,y:0},squad:[],reserves:[],monsters:[],
  getNearestMonster:()=>null,getNearestFromList:()=>null});

test('muscle mage never meditates with any weapon or promotion; stale saved meditation clears before regeneration',()=>{
  for(const role of MAGE_IDS)for(const style of ['wand','staff','sword','spear','hammer','axe']){
    const u=mage(role,true,style),g=game();g.squad=[u];
    assert.equal(prefersCasterMelee(u),false,'high magic attack reproduces the reported regression');
    assert.equal(canMeditate(u),false);
    regenerateMana(u,2);
    assert.equal(u.magicRecovering,false);
    assert.equal(u.mana,1,'only ordinary natural regeneration, not meditation boost');
    updateMageAI(g,u,.1,{id:0},{range:260});
    assert.equal(u.magicRecovering,false);
    assert.ok(u.x>0,'MP exhaustion does not block following the commander');
    distributeMagicStones(g,18);
    assert.equal(u.mana,19,'magic stone supply still works');
    const saved=JSON.parse(JSON.stringify(u));saved.magicRecovering=true;
    ensureMana(saved);assert.equal(saved.magicRecovering,false);
  }
});

test('ordinary mage still meditates and temporary strength does not change identity',()=>{
  const u=mage('MAGE',false);u.strength=255;u._casterStrengthBonus=100;u._casterStrengthTimer=8;
  const g=game();g.squad=[u];
  assert.equal(canMeditate(u),true);
  updateMageAI(g,u,.1,{id:0},{range:260});
  assert.equal(u.magicRecovering,true);assert.equal(u.x,0);
  regenerateMana(u,2);assert.equal(u.mana,8);
});

test('muscle mage with an actual melee preference keeps attacking without MP',()=>{
  const u=mage('MAGE',true,'hammer');u.atk=200;u.magicAttack=10;
  const target={hp:100,x:20,y:0},g=game();let hits=0;
  g.getNearestMonster=()=>target;g.performCasterMelee=()=>{hits++;};
  updateMageAI(g,u,.1,{id:0},{range:260});
  assert.equal(u.magicRecovering,false);assert.equal(hits,1);assert.equal(u.mana,0);
});
