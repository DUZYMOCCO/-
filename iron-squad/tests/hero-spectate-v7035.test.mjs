// v7.0.35: raids/invasions wait while the hero spectate runs; a wiped party does not end it; the commander cannot rope a hero while watching.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const sp=await import('../js/hero-spectate.js');
const inv=await import('../js/invasion-rules.js');
const cas=await import('../js/casualty-rules.js');
const {WORLD_SIZE}=await import('../js/world.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
const toasts=[],toastOpts=[];game.showToast=(m,o)=>{toasts.push(String(m));toastOpts.push(o);};
game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('観戦検証7035').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const C=WORLD_SIZE/2,campPos={x:game.player.x,y:game.player.y};
function marchParty(phase){
  sp.clearSpectate(game,false);game.currentDungeon=null;game.restTimer=0;game.baseRaidActive=false;game.monsters=[];game.player.x=campPos.x;game.player.y=campPos.y;game.player.isDown=false;game.player.hp=game.player.maxHp;
  hp.initializeHeroJourney(game);game.phase=phase;assert.equal(hp.rollHeroRevelation(game),true);game.inBattle=true;game.invasions.stage='idle';game.invasions.nextPhase=999;game.invasions.raidScheduledPhase=0;game.invasions.raidRollPhase=0;game.phaseDuration=120;game.phaseTimer=100;
  return game.heroJourney.party;
}
// ---------- the invasion waits while spectating and starts when the spectate ends ----------
{
  const p=marchParty(20);game.invasions.nextPhase=20;
  assert.equal(inv.pendingRaid(game),'invasion','an invasion is due');
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);assert.equal(game.spectating.field,true);
  assert.equal(inv.raidHeldBySpectate(game),true);assert.equal(game.startDemonInvasion(),false,'startDemonInvasion refuses while spectating');
  for(let i=0;i<40;i++)game.update(.1);assert.equal(game.invasions.stage,'idle','the invasion is held');assert.equal(game.baseRaidActive,false);assert.equal(inv.pendingRaid(game),'invasion','still waiting');assert.ok(game.spectating,'the spectate is not interrupted');
  toasts.length=0;toastOpts.length=0;assert.equal(sp.endSpectate(game),true);
  const i=toasts.findIndex(t=>t.includes('保留されていた魔王軍の侵攻が始まる'));assert.ok(i>=0,`the held invasion is announced: ${toasts.join('|')}`);assert.deepEqual(toastOpts[i],{field:true},'visible on screen');
  game.update(.1);assert.equal(game.invasions.stage,'marching','the held invasion starts right after the spectate');
  game.invasions.stage='idle';
}
// ---------- a rolled random raid waits too (the roll still happens), and starts after ----------
{
  const p=marchParty(20);const s=game.invasions;s.nextPhase=99;s.raidRollPhase=20;s.raidScheduledPhase=20;s.raidTriggerRemaining=100;s.raidLastPhase=0;game.baseRaidTriggeredPhase=0;game.phaseTimer=60;
  assert.equal(inv.pendingRaid(game),'raid');assert.equal(inv.shouldTriggerRandomRaid(game),true,'without a spectate it fires');
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  assert.equal(inv.shouldTriggerRandomRaid(game),false,'held while spectating');game.triggerBaseRaid();assert.equal(game.baseRaidActive,false,'triggerBaseRaid does not start a raid');
  for(let k=0;k<30;k++)game.update(.1);assert.equal(game.baseRaidActive,false);assert.ok(game.spectating);
  // a phase change while held: the roll is redone for the new phase (the scheduled raid of the old phase is gone); an invasion that is due is not lost
  game.phase=21;assert.equal(inv.pendingRaid(game),null,'the old phase\'s raid is gone');assert.equal(inv.shouldTriggerRandomRaid(game,()=>.99),false);
  game.phase=20;Object.assign(game.invasions,{raidRollPhase:20,raidScheduledPhase:20,raidTriggerRemaining:100});game.phaseTimer=60;
  toasts.length=0;assert.equal(sp.endSpectate(game),true);assert.ok(toasts.some(t=>t.includes('保留されていた本陣強襲が始まる')),toasts.join('|'));
  assert.equal(inv.shouldTriggerRandomRaid(game),true);game.triggerBaseRaid();assert.equal(game.baseRaidActive,true,'the raid starts after the spectate');
  game.completeBaseRaid(false);game.baseRaidActive=false;game.monsters=[];
  // an invasion that comes due while held survives the phase change and the rest
  marchParty(30);game.invasions.nextPhase=30;assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.phase=31;game.phaseTimer=50;assert.equal(inv.pendingRaid(game),'invasion');
  game.restTimer=8;assert.equal(inv.pendingRaid(game),null,'during the rest nothing is due');game.restTimer=0;
  assert.equal(sp.endSpectate(game),true);game.update(.1);assert.equal(game.invasions.stage,'marching');game.invasions.stage='idle';
  // nothing pending: no announcement
  marchParty(40);toasts.length=0;sp.startSpectate(game,SOLDIER_CLASSES);sp.endSpectate(game);assert.ok(!toasts.some(t=>t.includes('保留')),'no pending raid, no announcement');
}
// ---------- a safety valve stays: a raid that is somehow active ends the spectate ----------
{
  marchParty(50);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.baseRaidActive=true;game.update(.1);assert.equal(game.spectating,null,'ended at once');game.baseRaidActive=false;
}
// ---------- the camera never loses its place ----------
{
  const p=marchParty(55);p.members.forEach((u,i)=>{u.x=C+2600+i*10;u.y=C+300;});assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.update(.1);
  const s=game.spectating;s.viewer=null;assert.ok(s.lastPos,'the last place is remembered');const t=sp.spectateCameraTarget(game);assert.ok(t&&Number.isFinite(t.x),'a viewer-less spectate still has a fixed target');
  game.heroJourney.party.status='fallen';p.members.forEach(u=>{u.dead=true;});s.viewer=null;assert.doesNotThrow(()=>{sp.resolveSpectateViewer(game);sp.updateSpectate(game,.1);sp.updateSpectateHud(game,true);});assert.ok(game.spectating.ended==='fallen');assert.ok(Number.isFinite(sp.spectateCameraTarget(game).x));
  sp.endSpectate(game);
}
// ---------- the commander cannot rope a hero while watching ----------
{
  const p=marchParty(60);const me=game.player,hero=p.members[0];
  p.members.forEach((u,i)=>{u.x=me.x+10+i;u.y=me.y;});cas.markSoldierDown(game,hero);
  cas.releaseWounded(game,me);delete hero.releasedBy;delete hero.carrierId;
  assert.equal(game.spectating,null);assert.equal(cas.attachWounded(game,me,hero),true,'without a spectate the commander can rope a hero (unchanged)');cas.releaseWounded(game,me);delete hero.releasedBy;delete hero.carrierId;
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  assert.equal(cas.attachWounded(game,me,hero),false,'v7.0.35: no rope on a hero while spectating');assert.equal(hero.carrierId,undefined);
  p.members.forEach(u=>cas.markSoldierDown(game,u));
  for(let i=0;i<30;i++)game.update(.1);assert.ok(!p.members.some(u=>u.carrierId),'nobody is carried by the observer');
  sp.endSpectate(game);game._spectateGrace=0;
}
{ // a rope tied before the spectate began is cut; the bleed timer runs, so the party really falls — and the spectate goes on
  const q=marchParty(65);const me2=game.player;assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  q.members.forEach((u,i)=>{u.x=me2.x+10+i;u.y=me2.y;cas.markSoldierDown(game,u);});
  q.members.forEach(u=>{u.carrierId='player';});assert.ok(q.members.some(u=>u.carrierId==='player'));
  cas.sanitizeCarriers(game);assert.ok(!q.members.some(u=>u.carrierId),'the old ropes are cut');
  q.members[0].carrierId='player';game.update(.1);assert.ok(!q.members[0].carrierId,'cut again in the ordinary frame');
  let frames=0;while(q.status!=='fallen'&&frames<4000){game.update(.1);frames++;}
  assert.equal(q.status,'fallen',`the party fell (frames ${frames})`);assert.ok(game.spectating&&game.spectating.ended==='fallen','the spectate carries on after the wipe');assert.ok(!q.members.some(u=>u.carrierId));
  assert.ok(toasts.some(t=>t.includes('全滅しました（観戦を終了で戻ります）')));
  const cam=sp.spectateCameraTarget(game);assert.ok(cam&&Number.isFinite(cam.x));for(let i=0;i<20;i++)game.update(.1);assert.ok(game.spectating);assert.equal(sp.spectateSpeed(game),1);
  assert.equal(sp.endSpectate(game),true);
}
console.log('hero-spectate v7.0.35: raids held while spectating, announced after, camera never lost, no rope on heroes passed');