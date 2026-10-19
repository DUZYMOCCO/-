// v7.0.36: held raids/invasions start only 15 s after the hero spectate ends (the parked squad needs a moment); the grace is not saved.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const sp=await import('../js/hero-spectate.js');
const inv=await import('../js/invasion-rules.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
const toasts=[];game.showToast=m=>{toasts.push(String(m));};
game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('観戦猶予7036').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const campPos={x:game.player.x,y:game.player.y};
function marchParty(phase){
  sp.clearSpectate(game,false);game.currentDungeon=null;game.restTimer=0;game.baseRaidActive=false;game.monsters=[];game.player.x=campPos.x;game.player.y=campPos.y;game.player.isDown=false;game.player.hp=game.player.maxHp;
  hp.initializeHeroJourney(game);game.phase=phase;assert.equal(hp.rollHeroRevelation(game),true);game.inBattle=true;game.invasions.stage='idle';game.invasions.nextPhase=999;game.invasions.raidScheduledPhase=0;game.invasions.raidRollPhase=0;game.phaseDuration=120;game.phaseTimer=100;
}
const run=(sec)=>{for(let k=0;k<Math.round(sec*10);k++)game.update(.1);};
assert.equal(sp.SPECTATE_RULES.raidGrace,15);
// ---------- an invasion: held 15 s after the spectate, then it starts ----------
{
  marchParty(20);game.invasions.nextPhase=20;
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);run(3);
  toasts.length=0;assert.equal(sp.endSpectate(game),true);
  assert.ok(Math.abs(game._spectateRaidGrace-15)<1e-9,'grace set to 15 s');assert.equal(inv.raidHeldBySpectate(game),true,'held by the grace');
  assert.ok(toasts.some(t=>t.includes('魔王軍の侵攻が15秒後に始まる')),toasts.join('|'));
  assert.equal(game.startDemonInvasion(),false,'startDemonInvasion refuses during the grace');
  run(14);assert.equal(game.invasions.stage,'idle','no invasion in the first 14 s');assert.ok(game._spectateRaidGrace>0);
  run(1.5);assert.equal(game._spectateRaidGrace,0);assert.equal(inv.raidHeldBySpectate(game),false);
  run(.2);assert.equal(game.invasions.stage,'marching','the invasion starts once the grace is over');
  assert.ok(toasts.some(t=>t.includes('魔王城から第')||t.includes('侵攻軍が出撃')),'the normal start notice is shown');
  game.invasions.stage='idle';
}
// ---------- a rolled random raid: same ----------
{
  marchParty(20);const s=game.invasions;s.nextPhase=99;s.raidRollPhase=20;s.raidScheduledPhase=20;s.raidTriggerRemaining=100;s.raidLastPhase=0;game.baseRaidTriggeredPhase=0;game.phaseTimer=60;
  sp.startSpectate(game,SOLDIER_CLASSES);run(2);toasts.length=0;sp.endSpectate(game);
  assert.ok(toasts.some(t=>t.includes('本陣強襲が15秒後に始まる')),toasts.join('|'));
  run(14);assert.equal(game.baseRaidActive,false,'no raid inside the grace');assert.equal(inv.shouldTriggerRandomRaid(game),false);
  run(2);assert.equal(game.baseRaidActive,true,'the raid starts after the grace');
  game.completeBaseRaid(false);game.baseRaidActive=false;game.monsters=[];
}
// ---------- the HUD line: only while a raid waits ----------
{
  const els=new Map();const mk=()=>{const cls=new Set();return {id:'',className:'',textContent:'',classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),toggle:(c,on)=>{on?cls.add(c):cls.delete(c);},contains:c=>cls.has(c)},setAttribute(){},cls};};
  const host={prepend:e=>els.set(e.id,e),querySelector:q=>els.get(q.replace('#',''))||null};
  const fakeDoc=globalThis.document;globalThis.document={getElementById:()=>null,createElement:()=>mk()};
  const fake={querySelector:q=>q==='.field-alerts'?host:null,classList:{add(){},remove(){}}};
  const watchThenEnd=()=>{game.container=null;assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.container=fake;sp.endSpectate(game);};
  marchParty(20);game.invasions.nextPhase=20;watchThenEnd();
  const el=els.get('raid-grace-banner');assert.ok(el,'banner created');assert.ok(el.textContent.includes('魔王軍の侵攻まで あと15秒'),el.textContent);assert.equal(el.cls.has('hidden'),false);
  run(5);assert.ok(el.textContent.includes('あと10秒')||el.textContent.includes('あと11秒'),el.textContent);
  run(11);assert.equal(el.cls.has('hidden'),true,'hidden once the grace is over');game.invasions.stage='idle';
  // nothing waiting: no banner text even though the grace runs
  marchParty(40);toasts.length=0;watchThenEnd();assert.ok(game._spectateRaidGrace>0);assert.ok(!toasts.some(t=>t.includes('保留')));assert.equal(el.cls.has('hidden'),true,'no pending raid: nothing shown');
  game.container=null;globalThis.document=fakeDoc;
}
// ---------- spectating again inside the grace resets it ----------
{
  marchParty(20);game.invasions.nextPhase=20;sp.startSpectate(game,SOLDIER_CLASSES);sp.endSpectate(game);run(5);assert.ok(game._spectateRaidGrace<11);
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);assert.equal(game._spectateRaidGrace,0,'reset when watching again');run(20);assert.equal(game.invasions.stage,'idle','still held by the spectate');
  sp.endSpectate(game);assert.ok(Math.abs(game._spectateRaidGrace-15)<1e-9,'a fresh 15 s after the second end');sp.clearSpectate(game,false);
}
// ---------- not carried over: new game / load / game over / not saved ----------
{
  marchParty(20);sp.startSpectate(game,SOLDIER_CLASSES);sp.endSpectate(game);assert.ok(game._spectateRaidGrace>0);
  const saved=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));assert.ok(!JSON.stringify(saved).includes('spectateRaidGrace'),'not in the save data');
  game.resumeSavedGame(saved);assert.equal(game._spectateRaidGrace,0,'reset by a load');
  marchParty(20);sp.startSpectate(game,SOLDIER_CLASSES);sp.endSpectate(game);assert.ok(game._spectateRaidGrace>0);
  game.startFreshGame(false);assert.equal(game._spectateRaidGrace,0,'reset by a new game');
  game._spectateRaidGrace=9;game.stopGameLoop=()=>{};try{game.gameOver();}catch{}assert.equal(game._spectateRaidGrace,0,'reset on game over');
}
// ---------- rest: the grace runs through the rest without breaking it; the invasion cadence is unchanged ----------
{
  game.startFreshGame(false);game.monsters=[];marchParty(20);game.invasions.nextPhase=20;sp.startSpectate(game,SOLDIER_CLASSES);
  game.restTimer=8;sp.endSpectate(game);assert.ok(game._spectateRaidGrace>0||game.spectating);
  game.restTimer=0;sp.clearSpectate(game);run(14);assert.equal(game.invasions.nextPhase,20,'nextPhase untouched while held (one invasion, nothing stacks)');
  run(2);assert.equal(game.invasions.stage,'marching');assert.equal(game.invasions.nextPhase>20,true,'it was started once');game.invasions.stage='idle';
}
console.log('hero-spectate v7.0.36: 15 s raid grace after the spectate passed');
