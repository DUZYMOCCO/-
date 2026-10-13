import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {talentGrowth,practiceGrowth,attributeValues,cappedAttributeValue,rollAttributeProfile} from '../js/unit-attributes.js';
import {isLateBloomer,talentTag} from '../js/talent-labels.js';
import {applyInferiorExpeditionGrit} from '../js/expedition-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,TALENTS,SOLDIER_CLASSES}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('TALENT REWORK TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const rng=Math.random;
const make=(cls='HEAVY',talent='INFERIOR',level=1)=>g.createNewSoldier(null,{classKey:cls,talent,level,attributeProfile:rollAttributeProfile(cls,talent,()=>.5,true)});
const stats=u=>({maxHp:u.maxHp,atk:u.atk,def:u.def,strength:u.strength,magic:u.magicPower,quickness:u.quickness});
try{
  // Production scout roll: exact cutoffs and a reproducible 100,000-person simulation.
  for(const [roll,key] of [[0,'GENIUS'],[.000329999,'GENIUS'],[.00033,'ELITE'],[.059999,'ELITE'],[.06,'TALENTED'],[.2,'INFERIOR'],[.35,'AVERAGE']]){Math.random=()=>roll;assert.equal(g.rollScoutTalent(),key);}
  let seed=20261013;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const counts={};
  for(let i=0;i<100000;i++){const t=g.rollScoutTalent();counts[t]=(counts[t]||0)+1;}
  assert.ok(counts.GENIUS>=15&&counts.GENIUS<=55,`expected about 33 geniuses per 100,000: ${counts.GENIUS}`);Math.random=rng;
  assert.deepEqual([TALENTS.GENIUS.hpMult,TALENTS.GENIUS.atkMult,TALENTS.GENIUS.speedBonus,TALENTS.GENIUS.critBonus],[2,2.2,40,40]);
  // Either awakening evidence qualifies. Grit alone, or experience on another talent, does not.
  const checks=[{talent:'INFERIOR',survivedDeathlines:1},{talent:'INFERIOR',deathlineSkills:['PHANTOM_STEP']}];
  for(const evidence of checks)for(const [level,expected] of [[1,.85],[30,.85],[31,.92],[35,1.2],[40,1.55],[41,1.55],[100,1.55]]){
    const u={...evidence,level};assert.equal(talentGrowth(u),expected);assert.equal(practiceGrowth(u),expected);assert.equal(talentTag(u),'🍂大器晩成');
  }
  for(const level of [1,30,35,40,100]){assert.equal(talentGrowth({talent:'INFERIOR',level,inferiorGrit:8}),.85);assert.equal(talentTag({talent:'INFERIOR',level}),'🍂へっぽこ');assert.equal(talentGrowth({talent:'GENIUS',level}),2.4);}
  for(const talent of ['AVERAGE','TALENTED','ELITE','GENIUS'])assert.equal(isLateBloomer({talent,survivedDeathlines:1,deathlineSkills:['PHANTOM_STEP']}),false);
  // Real level and practice attributes use the same curve, including physical strength.
  for(const level of [30,35,40,60]){
    const u=make('LIGHT','INFERIOR',level);u.survivedDeathlines=1;u.attributeProfile.practice.strength=100;u.attributeProfile.practice.magic=100;u.attributeProfile.practice.travel=1500;
    const profile=structuredClone(u.attributeProfile),growth=talentGrowth(u),v=attributeValues(u),lv=level-1;
    assert.equal(v.strength,cappedAttributeValue(profile.innate.strength+lv*2.5*growth+20*growth,1,1));
    assert.equal(v.magic,cappedAttributeValue(profile.innate.magic+lv*2.5*growth+20*growth,1,1));
    assert.equal(v.quickness,cappedAttributeValue(profile.innate.quickness+lv*1.1*growth+2*growth,1,1));assert.deepEqual(u.attributeProfile,profile,'growth never changes saved innate/aptitude/practice');
  }
  // Acquiring a native deathline skill activates the curve without changing the talent key.
  const awakened=make('LIGHT','INFERIOR',40),weakStrength=awakened.strength;Math.random=()=>0;g.tryAwakenDeathlineSkill(awakened);Math.random=rng;
  assert.equal(awakened.talent,'INFERIOR');assert.equal(talentGrowth(awakened),1.55);assert.ok(awakened.strength>weakStrength);assert.equal(talentTag(awakened),'🍂大器晩成');
  // Exact percentage boosts at both low stats and endgame inflation, for all five families.
  let gritCases=0;
  for(const cls of ['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'])for(const level of [1,40]){
    const raw=make(cls,'INFERIOR',level);if(level===40){raw.survivedWaves=1000;raw.minionKills=50000;raw.bossKills=100;}raw.inferiorGrit=0;g.recalcSoldierStats(raw);const plain=stats(raw);
    for(const stacks of [1,4,8,99,-1]){
      const u=structuredClone(raw);u.inferiorGrit=stacks;g.recalcSoldierStats(u);const n=Math.max(0,Math.min(8,stacks));
      assert.equal(u.maxHp,Math.floor(plain.maxHp*(1+n*.05)));assert.equal(u.atk,Math.floor(plain.atk*(1+n*.04)));assert.equal(u.def,Math.floor(plain.def*(1+n*.03)));
      u.hp=u.maxHp*.25;const hp=u.hp,stable=stats(u);for(let i=0;i<4;i++)g.recalcSoldierStats(u);assert.deepEqual(stats(u),stable);assert.equal(u.hp,hp,'recalculation cannot grant repeated grit healing');
      u.isDown=true;u.hp=0;g.recalcSoldierStats(u);assert.equal(u.hp,0);gritCases++;
    }
    const survivor=structuredClone(raw);for(let i=0;i<10;i++)applyInferiorExpeditionGrit(survivor);assert.equal(survivor.inferiorGrit,8);assert.equal(isLateBloomer(survivor),false,'expedition grit without deathline evidence is insufficient');
  }
  // At equal level-1 attributes/equipment, genius base bonuses are really applied.
  const average=make('HEAVY','AVERAGE'),genius=structuredClone(average);genius.id+='-genius';genius.talent='GENIUS';g.recalcSoldierStats(genius);
  assert.equal(genius.maxHp,average.maxHp*2);assert.ok(genius.atk>=average.atk*2);assert.equal(genius.crit-average.crit,40);assert.ok(genius.speed>average.speed);
  // Old talent keys/counters and saved abilities stay intact, while real views show the new tag.
  const late=make('HEAVY','INFERIOR',35);late.name='大器晩成の確認';late.survivedDeathlines=1;late.inferiorGrit=8;g.recalcSoldierStats(late);g.squad=[late,genius];g.reserves=[];
  const snapshot=structuredClone(g.saveGame()),profile=structuredClone(late.attributeProfile),lateStats=stats(late);
  for(let n=0;n<3;n++){g.resumeSavedGame(structuredClone(n?g.saveGame():snapshot));const u=g.squad.find(s=>s.id===late.id);assert.equal(u.talent,'INFERIOR');assert.equal(u.inferiorGrit,8);assert.deepEqual(u.attributeProfile,profile);assert.deepEqual(stats(u),lateStats);}
  g.closeStrategyModal();g.openStrategyModal();g.renderStrategyUI();const roster=document.querySelector(`.roster-entry[data-soldier-id="${late.id}"]`);assert.ok(roster);assert.match(roster.querySelector('.roster-talent').textContent,/大器晩成/);assert.match(roster.dataset.search,/大器晩成/);
  assert.match(g.buildSoldierDetailHtml(g.squad.find(s=>s.id===late.id)),/🍂大器晩成/);g._troopRankingCategory='deathline';g.renderTroopRankings();assert.match(document.getElementById('command-troop-rankings').textContent,/大器晩成/);
  console.log(JSON.stringify({geniusSimulation:{samples:100000,count:counts.GENIUS,ratePercent:counts.GENIUS/1000,counts},growth:{lv30:.85,lv35:1.2,lv40:1.55,genius:2.4},gritCases,allFamilies:true,saveStable:true,uiLabelsVerified:true}));
  console.log('PASS: genius cutoffs and 100,000 scout rolls, late-blooming level/practice/strength growth and both awakening conditions, talent-key preservation, exact final HP/ATK/DEF grit percentages and cap, no recalculation/healing drift, old saves, roster/detail/ranking labels');
}finally{Math.random=rng;g._merchantShopClose?.();dom.window.close();}
