// v7.2.21: the hero party classes up one stage per guardian it slays (3 guardians = top class); the king is sized for top-class heroes only;
// low class-stage commander parties face a longer target; the king heals between commander visits.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const K=await import('../js/demon-king-rules.js');
const {recordSealGuardianKill}=await import('../js/seal-keys.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','saveGame'])game[m]=()=>{};
const toasts=[];game.showToast=m=>toasts.push(String(m));
game.activeSlotId=saveSlots.create('勇者クラスアップ検証').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const TOP={HEAVY:'IMMORTAL_AEGIS',LIGHT:'VOID_EDGE',ARCHER:'STAR_HUNTER',MEDIC:'ARCHANGEL',MAGE:'ARCANE_SOVEREIGN'};
const LINE={HEAVY:['HEAVY','PALADIN','TEMPLAR','IMMORTAL_AEGIS'],LIGHT:['LIGHT','BLADEMASTER','SWORD_EMPEROR','VOID_EDGE'],ARCHER:['ARCHER','SNIPER','STORM_BOW','STAR_HUNTER'],MEDIC:['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'],MAGE:['MAGE','ARCHMAGE','ELEMENTAL_SAGE','ARCANE_SOVEREIGN']};
function freshParty(phase=10){game.sealKeys.broken={};hp.initializeHeroJourney(game);game.phase=phase;assert.equal(hp.rollHeroRevelation(game),true);return game.heroJourney.party;}
const events=(p,t)=>p.journal.events.filter(e=>e.type===t);
{ // 1. one stage per guardian slain by this party, each along its own line
  const p=freshParty(),base=p.members.map(u=>u.soldierClass),lines=base.map(c=>Object.keys(LINE).find(k=>LINE[k][0]===c));
  assert.ok(lines.every(Boolean),'every hero starts in a base class');assert.equal(hp.heroGuardianStage(game,p),0);
  assert.equal(hp.syncHeroClassStage(game,p,SOLDIER_CLASSES),false,'no guardian: no class-up');
  const guardian=id=>({isSealGuardian:true,sealSiteId:id,name:'守護者'});
  game.phase=11;assert.equal(recordSealGuardianKill(game,guardian('seal_northwest'),p.members[0]),true);
  assert.equal(game.sealKeys.broken.seal_northwest.party,String(p.id),'the guardian remembers which party slew it');
  assert.equal(hp.heroGuardianStage(game,p),1);assert.equal(hp.syncHeroClassStage(game,p,SOLDIER_CLASSES),true);
  p.members.forEach((u,i)=>{assert.equal(u.soldierClass,LINE[lines[i]][1],`stage 1 ${lines[i]}`);assert.equal(u.heroClassStage,1);assert.equal(u.hp,u.maxHp,'healed on class-up');});
  assert.equal(p.classStage,1);assert.equal(events(p,'classup').length,1);assert.match(events(p,'classup')[0].text,/守護者をたおし、全員がクラス1になった/);
  assert.ok(toasts.some(t=>t.includes('全員クラス1へ昇格')),'class-up is announced');
  assert.equal(hp.syncHeroClassStage(game,p,SOLDIER_CLASSES),false,'nothing new: no second class-up');
  game.sealKeys.broken.seal_west={by:'commander',phase:11};assert.equal(hp.heroGuardianStage(game,p),1,'a guardian slain by the commander does not count');
  recordSealGuardianKill(game,guardian('seal_north'),p.members[1]);recordSealGuardianKill(game,guardian('seal_northeast'),p.members[2]);
  assert.equal(hp.heroGuardianStage(game,p),3);hp.syncHeroClassStage(game,p,SOLDIER_CLASSES);
  p.members.forEach((u,i)=>{assert.equal(u.soldierClass,TOP[lines[i]],`stage 3 ${lines[i]} → top class`);assert.equal(K.classTier(u),3);});
  assert.equal(p.classStage,3);assert.equal(events(p,'classup').length,2);
  game.sealKeys.broken.extra={by:'hero',phase:12,party:String(p.id)};assert.equal(hp.heroGuardianStage(game,p),3,'stage stops at 3');
}
{ // 2. old saves: no party id → guardians slain by heroes since this party's phase count; an earlier party's do not; several stages at once
  const p=freshParty(20);p.members.forEach(u=>assert.equal(K.classTier(u),0));
  game.sealKeys.broken={seal_northwest:{by:'hero',phase:12},seal_north:{by:'hero',phase:21},seal_northeast:{by:'hero',phase:22}};
  assert.equal(hp.heroGuardianStage(game,p),2,'only guardians slain during this hero\'s journey');
  toasts.length=0;hp.syncHeroClassStage(game,p,SOLDIER_CLASSES);p.members.forEach(u=>assert.equal(K.classTier(u),2));
  assert.ok(toasts.some(t=>t.includes('全員クラス2になった')));
  game.sealKeys.broken.seal_northwest={by:'hero',phase:12,party:'someone-else'};assert.equal(hp.heroGuardianStage(game,p),2,'another party\'s guardian does not count');
}
{ // 3. the king fighting heroes alone: sized only for top-class heroes, once, keeping the HP fraction
  const p=freshParty(30);const king={isDemonKing:true,hp:3e9,maxHp:3e9};
  assert.equal(K.gaugeDemonKingForHeroes(king,p.members),0,'heroes below class 3: the king stays at full strength');assert.equal(king.maxHp,3e9);assert.equal(king.heroGauge,undefined);
  game.sealKeys.broken={a:{by:'hero',phase:30,party:String(p.id)},b:{by:'hero',phase:30,party:String(p.id)},c:{by:'hero',phase:30,party:String(p.id)}};hp.syncHeroClassStage(game,p,SOLDIER_CLASSES);
  king.hp=1.5e9;const want=Math.round(K.heroPartyForce(p.members)*K.DEMON_KING_RULES.heroGaugeTtk);
  assert.equal(K.gaugeDemonKingForHeroes(king,p.members),want);assert.equal(king.maxHp,want);assert.equal(king.hp,Math.round(want/2),'half HP stays half');
  assert.ok(want<3e9&&want>0);assert.equal(K.gaugeDemonKingForHeroes(king,p.members),0,'sized once per visit');
}
{ // 4. commander parties: lower class stage → longer target; top class keeps 150 s
  const P=K.DEMON_KING_RULES;
  const base=K.estimateSortieForce({player:{atk:1e6},squad:[{isPersonalGuard:true,atk:5e5,soldierClass:'LIGHT'}]});
  const top=K.estimateSortieForce({player:{atk:1e6,advancedClass:'MYTHIC_EMPEROR',isAdvanced:true},squad:[{isPersonalGuard:true,atk:5e5,soldierClass:'VOID_EDGE'}]});
  assert.equal(base.ttkScale,1+P.lowTierTtkBonus);assert.equal(top.ttkScale,1);
  assert.equal(K.demonKingStatsForDps(1e8,base.ttkScale).hp,Math.round(1e8*P.targetTtk*base.ttkScale));assert.equal(K.demonKingStatsForDps(1e8).hp,1e8*P.targetTtk);
}
console.log('hero class-up v7.2.21 ok');
