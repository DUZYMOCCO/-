// v7.2.22: the true demon king has ten times the HP that the challenging party's demon king would have (floor 10B);
// heroes alone face ten times the king they met when they entered his castle.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const K=await import('../js/demon-king-rules.js');
const {TRUE_KING_RULES:T}=await import('../js/true-demon-castle.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','saveGame'])game[m]=()=>{};
game.showToast=()=>{};game.activeSlotId=saveSlots.create('真魔王HP検証').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const t=DUNGEON_DEFS.find(d=>d.id==='dungeon_true_demon_castle');assert.ok(t);
const make=()=>game.createDungeonBoss(t.boss,0,0,t);
assert.equal(T.kingHpMultiple,10);assert.equal(T.hp,10_000_000_000,'the floor stays 10B');
{ // commander: weak party → floor; strong party → 10 × its demon-king HP (the larger of the recorded and the current estimate)
  game.heroJourney.kingProfile=null;game.squad=[];game.player.atk=1;game.player.magicAttack=0;
  const weak=make();assert.equal(weak.maxHp,T.hp);assert.equal(weak.hp,weak.maxHp);assert.ok(weak.isTrueDemonKing&&weak.tk);
  game.heroJourney.kingProfile={version:2,hp:4.2e9,atk:85000,dps:0,phase:1};
  assert.equal(K.commanderKingHp(game),4.2e9);const k=make();assert.equal(k.maxHp,4.2e10,'ten times the recorded king');
  game.player.atk=1e8;const est=K.estimateSortieForce(game),now=K.demonKingStatsForDps(est.dps,est.ttkScale).hp;assert.ok(now>4.2e9);
  assert.equal(make().maxHp,10*now,'a stronger party now: ten times the king it would meet now');
  assert.equal(game.heroJourney.kingProfile.hp,4.2e9,'making the true king does not rewrite the record');
}
{ // heroes: ten times the king they met; no floor
  hp.initializeHeroJourney(game);game.phase=10;assert.equal(hp.rollHeroRevelation(game),true);const p=game.heroJourney.party;
  p.kingHp=2e7;game.heroJourney.trueScene=null;let king=hp.ensureHeroTrueCastle(game).monsters[0];
  assert.equal(king.maxHp,2e8);assert.equal(king.hp,2e8);assert.ok(king.isTrueDemonKing);
  delete p.kingHp;game.heroJourney.trueScene=null;game.heroJourney.kingProfile=null;
  assert.equal(hp.heroKingHp(game,p),K.DEMON_KING_RULES.defaultHp,'heroes below class 3 who never met him: the default king');
  king=hp.ensureHeroTrueCastle(game).monsters[0];assert.equal(king.maxHp,10*K.DEMON_KING_RULES.defaultHp);
  for(const u of p.members){while(SOLDIER_CLASSES[u.soldierClass]?.advancedClassId)u.soldierClass=SOLDIER_CLASSES[u.soldierClass].advancedClassId;game.recalcSoldierStats(u);}
  assert.equal(hp.heroKingHp(game,p),Math.round(K.heroPartyForce(p.members)*K.DEMON_KING_RULES.heroGaugeTtk),'top-class heroes: the king sized for them');
  // the hero gauge records what they met
  game.heroJourney.trueScene=null;const dk={isDemonKing:true,hp:3e9,maxHp:3e9};const sized=K.gaugeDemonKingForHeroes(dk,p.members);assert.ok(sized>0&&sized===hp.heroKingHp(game,p));
}
console.log('true king hp v7.2.22 ok');
