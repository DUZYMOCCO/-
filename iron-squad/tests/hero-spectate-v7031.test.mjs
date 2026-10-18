// v7.0.31: spectate queue (観戦待ち), whole-march field spectate, spectate-only fast forward.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const sp=await import('../js/hero-spectate.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {visibleHeroMembers}=await import('../js/hero-rules.js');
const {activeSquad}=await import('../js/instance-rules.js');
const {WORLD_SIZE}=await import('../js/world.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
const toasts=[];game.showToast=m=>toasts.push(String(m));
game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('観戦検証7031').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle'),CASTLE=d.id,C=WORLD_SIZE/2;
const campPos={x:game.player.x,y:game.player.y};
assert.ok(Math.hypot(campPos.x-C,campPos.y-C)<1200,'the commander starts in the camp');
function marchParty(phase){
  sp.clearSpectate(game);game.currentDungeon=null;game.restTimer=0;game.baseRaidActive=false;game.monsters=[];game.player.x=campPos.x;game.player.y=campPos.y;game.player.isDown=false;game.player.hp=game.player.maxHp;
  hp.initializeHeroJourney(game);game.phase=phase;assert.equal(hp.rollHeroRevelation(game),true);const p=game.heroJourney.party;game.inBattle=true;
  return p;
}
const SQUAD_STATE=()=>game.squad.map(s=>`${s.id}:${s.x}:${s.y}:${s.hp}`).join('|');
// ---------- availability: kinds and one-line reasons ----------
{
  const p=marchParty(10);
  let a=sp.spectateAvailability(game);assert.deepEqual([a.ok,a.code,a.kind],[true,'ok','field']);assert.match(a.reason,/勇者の進軍を最初から見守ります/);
  game.player.x=C+1500;a=sp.spectateAvailability(game);assert.deepEqual([a.ok,a.code,a.kind],[false,'away','field'],'away from the camp peace bubble: wait');assert.match(a.reason,/勇者は進軍中。隊長が本陣に戻ると観戦を始められます/);
  game.player.x=campPos.x;
  game.restTimer=8;assert.equal(sp.spectateAvailability(game).code,'rest');game.restTimer=0;
  game.currentDungeon=DUNGEON_DEFS.find(x=>x.kind==='town');assert.equal(sp.spectateAvailability(game).code,'inside');game.currentDungeon=null;
  game.baseRaidActive=true;assert.equal(sp.spectateAvailability(game).code,'raid');game.baseRaidActive=false;
  game.player.isDown=true;assert.equal(sp.spectateAvailability(game).code,'down');game.player.isDown=false;
  game.inBattle=false;assert.equal(sp.spectateAvailability(game).ok,true,'the 戦況 window (inBattle=false) no longer blocks it');game.inBattle=true;
  assert.equal(sp.spectateStatusLine(game),a=sp.spectateAvailability(game).reason);
  game.player.x=C+1500;assert.match(sp.spectateStatusLine(game),/^観戦：勇者は進軍中/);game.player.x=campPos.x;
  assert.equal(p.space,'field');
}
// ---------- queue: toggling, waiting, 3-second notice, auto start ----------
{
  const p=marchParty(15);game.player.x=C+1500; // away from the camp
  toasts.length=0;assert.equal(sp.queueSpectate(game,SOLDIER_CLASSES),true);assert.ok(game.spectateQueued);assert.equal(sp.queueSpectate(game),false,'no double queue');
  assert.match(sp.spectateStatusLine(game),/^観戦待ち：勇者は進軍中。隊長が本陣に戻ると観戦を始まります|^観戦待ち：勇者は進軍中。隊長が本陣に戻ると/);
  for(let i=0;i<50;i++)sp.updateSpectateQueue(game,.1);
  assert.ok(game.spectateQueued,'still waiting');assert.equal(game.spectating,null);assert.ok(!toasts.some(t=>t.includes('観戦できません')),'waiting is not an error');assert.ok(!toasts.some(t=>t.includes('秒後に観戦')));
  // blockers keep the queue alive (and the game never enters anything)
  game.player.x=campPos.x;
  for(const [name,on,off] of [['rest',()=>{game.restTimer=8;},()=>{game.restTimer=0;}],['raid',()=>{game.baseRaidActive=true;},()=>{game.baseRaidActive=false;}],['inside',()=>{game.currentDungeon=DUNGEON_DEFS.find(x=>x.kind==='town');},()=>{game.currentDungeon=null;}],['down',()=>{game.player.isDown=true;},()=>{game.player.isDown=false;}]]){
    on();for(let i=0;i<40;i++)sp.updateSpectateQueue(game,.1);assert.ok(game.spectateQueued,`${name}: queue kept`);assert.equal(game.spectating,null,`${name}: nothing started`);off();
  }
  // conditions met: announce, count 3 s, then start (can be interrupted: the countdown restarts)
  toasts.length=0;sp.updateSpectateQueue(game,.1);
  assert.ok(toasts.some(t=>t==='3秒後に観戦を始めます（タップで中止）'),'pre-start notice');assert.equal(game.spectating,null);
  game.restTimer=8;sp.updateSpectateQueue(game,.1);assert.equal(game.spectateQueued.countdown,null,'a blocker resets the countdown');game.restTimer=0;
  toasts.length=0;sp.updateSpectateQueue(game,.1);assert.equal(toasts.filter(t=>t.includes('秒後に観戦')).length,1);
  for(let i=0;i<28;i++)sp.updateSpectateQueue(game,.1);assert.equal(game.spectating,null,'not before the 3 s are over');assert.ok(game.spectateQueued);
  for(let i=0;i<4;i++)sp.updateSpectateQueue(game,.1);
  assert.ok(game.spectating&&game.spectating.field===true,'field spectate started by itself');assert.equal(game.spectateQueued,null,'the queue is consumed');assert.equal(game.currentDungeon,null);
  sp.clearSpectate(game);
}
{ // cancel: by button, by clearSpectate (load / new game), and by the party disappearing
  const p=marchParty(20);game.player.x=C+1500;
  assert.equal(sp.queueSpectate(game),true);assert.equal(sp.cancelSpectateQueue(game,'取消'),true);assert.equal(game.spectateQueued,null);assert.equal(sp.cancelSpectateQueue(game),false);
  assert.equal(sp.queueSpectate(game),true);sp.clearSpectate(game);assert.equal(game.spectateQueued,null,'clearSpectate drops the queue');
  for(const [name,mutate,pattern] of [
    ['fallen',(q)=>{q.status='fallen';q.members.forEach(u=>{u.dead=true;});},/全滅/],
    ['withdrawn',(q)=>{q.status='withdrawn';},/撤退/],
    ['victory',(q)=>{game.heroJourney.demonKingDefeat={phase:1,by:'hero',name:'x'};q.status='victorious';},/魔王が討たれた/]]){
    const q=marchParty(25);game.player.x=C+1500;assert.equal(sp.queueSpectate(game),true);toasts.length=0;
    mutate(q);sp.updateSpectateQueue(game,.1);
    assert.equal(game.spectateQueued,null,`${name}: auto-cancelled`);assert.ok(toasts.some(t=>pattern.test(t)),`${name}: ${toasts.join('|')}`);
  }
  marchParty(30);assert.equal(sp.queueSpectate(game),true);game.heroJourney.party=null;sp.updateSpectateQueue(game,.1);assert.equal(game.spectateQueued,null,'no party at all');
  marchParty(35);game.heroJourney.demonKingDefeat={phase:1,by:'commander',name:'x'};assert.equal(sp.queueSpectate(game),false,'nothing to queue once the demon king is dead');
}
// ---------- field spectate: parked commander and squad, hero-only active squad, camera ----------
let p=marchParty(40);
const guard=game.squad.find(s=>s.isPersonalGuard)||(()=>{const g=game.createNewSoldier();g.isPersonalGuard=true;game.squad.push(g);return g;})();
guard.x=campPos.x+30;guard.y=campPos.y;
const before=SQUAD_STATE();
const normalActive=activeSquad(game).length;assert.ok(normalActive>6,'normally the commander squad fights with the party');
toasts.length=0;assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
assert.equal(sp.fieldSpectating(game),true);assert.equal(game.currentDungeon,null,'the ordinary field world');assert.equal(game.spectating.speed,1);
assert.equal(game.spectating.viewer,p.members[0],'the camera follows the hero first');assert.equal(sp.spectateCameraTarget(game),p.members[0]);
assert.ok(toasts.some(t=>t.includes('観戦を始めた')));
assert.deepEqual(activeSquad(game).map(u=>u.id).sort(),p.members.map(u=>u.id).sort(),'only the hero party is active');
assert.equal(visibleHeroMembers(game).length,6);
assert.equal(sp.spectateTargets(game).length,6,'no demon king to follow in the field');assert.ok(!sp.spectateTargets(game).some(t=>t.kind==='king'));
assert.match(sp.spectateSummary(game).castleText,/^野外を進軍中 · 魔王城まで約\d/);
{ // the commander and the squad are untouchable and frozen; enemies do not target them; the hero can still be hurt
  const me=game.player,hpBefore=me.hp;game.damageTarget(me,1e12,{});assert.equal(me.hp,hpBefore);
  const gHp=guard.hp;game.damageTarget(guard,1e9,{});assert.equal(guard.hp,gHp,'parked guard: no damage');
  const hero=p.members[0],hHp=hero.hp;game.damageTarget(hero,10,{environmental:true});assert.ok(hero.hp<hHp||hero.maxHp>0,'hero side keeps normal damage rules');
  hero.hp=hero.maxHp;
  const mob={x:guard.x+10,y:guard.y,hp:100,maxHp:100,atk:1e9,radius:10,type:'slime',speed:50,attackInterval:.1};game.monsters=[mob];
  for(let i=0;i<30;i++)game.update(.1);
  assert.equal(guard.hp,gHp,'monsters never pick the parked squad');assert.equal(game.player.hp,hpBefore);assert.equal(SQUAD_STATE().includes('NaN'),false);
  game.monsters=[];
}
{ // frozen: the squad does not move or act while spectating
  const snapshot=SQUAD_STATE();for(let i=0;i<30;i++)game.update(.1);
  assert.equal(game.squad.map(s=>`${s.id}:${s.x}:${s.y}`).join('|'),snapshot.split('|').map(s=>s.split(':').slice(0,3).join(':')).join('|'),'squad positions unchanged');
  assert.equal(game.player.x,campPos.x);assert.equal(game.player.y,campPos.y);
}
{ // the camera follows the hero out of the camp
  p.members.forEach(u=>{u.x=C+2600;u.y=C+300;});for(let i=0;i<90;i++)game.update(.05);
  assert.ok(Math.abs(game.camera.x-p.members[0].x)<120&&Math.abs(game.camera.y-p.members[0].y)<120,`camera at the hero (${game.camera.x},${game.camera.y})`);
  assert.equal(game.player.x,campPos.x,'the commander stays parked');
  assert.ok(sp.spectateCameraTarget(game)===game.spectating.viewer);
}
{ // switching members works; saving never stores the spectate state or a moved commander
  assert.equal(sp.selectSpectateTarget(game,1),p.members[1]);sp.selectSpectateTarget(game,p.members[0].id);
  const data=game.saveGame({immediate:true});assert.ok(data);assert.equal(data.player.x,campPos.x);assert.equal(data.player.y,campPos.y);
  const text=JSON.stringify(data);assert.ok(!text.includes('spectat'),'no spectate state');
}
{ // the user ends it: everything resumes
  toasts.length=0;game.camera.x=C+2600;assert.equal(sp.endSpectate(game),true);
  assert.equal(game.spectating,null);assert.equal(game.camera.x,campPos.x,'the camera snaps back to the commander');assert.equal(game.currentDungeon,null);
  assert.equal(activeSquad(game).length,normalActive,'the squad is active again');assert.ok(toasts.some(t=>t.includes('観戦を終えて')));
  const g=guard.hp;game.damageTarget(guard,5,{environmental:true});assert.ok(guard.hp<g||g<=0,'the squad is vulnerable again');guard.hp=guard.maxHp;
}
// ---------- field → castle hand-over ----------
{
  p=marchParty(45);
  const g2=game.squad.find(s=>s.isPersonalGuard)||guard;g2.x=campPos.x+30;g2.y=campPos.y;const gPos={x:g2.x,y:g2.y};
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);assert.equal(game.spectating.field,true);game.spectating.speed=4;
  // the party reaches the castle gate (field → castle)
  p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
  const scene=hp.ensureHeroCastle(game,d);scene.monsters.length=0;
  // during the 8-second rest the party cannot be entered nor followed: wait, ×1, camera holds
  const camBefore={x:game.camera.x,y:game.camera.y};
  game.restTimer=8;p.space=CASTLE;p.status='castle';p.x=240;p.y=d.height/2;p.members.forEach(u=>{u.x=240;u.y=d.height/2;});
  sp.updateSpectate(game,.1);assert.equal(game.spectating.field,true,'waits for the rest');assert.equal(game.currentDungeon,null);assert.equal(game.spectating.speed,1,'×1 during the rest');
  assert.deepEqual(sp.spectateCameraTarget(game),camBefore,'the camera holds its last view');assert.match(sp.spectateSummary(game).castleText,/魔王城へ突入した/);
  game.restTimer=0;sp.updateSpectate(game,.1);
  assert.equal(game.spectating.field,false,'handed over to the castle spectate');assert.equal(game.currentDungeon.id,CASTLE);assert.equal(game.monsters,scene.monsters);
  assert.ok(game.spectating.viewer&&game.camera.x===game.spectating.viewer.x,'camera on the hero in the castle');
  assert.equal(activeSquad(game).length,6,'the castle spectate: party only');
  assert.equal(g2.x,gPos.x,'the squad stayed in the field');assert.equal(game.savedFieldPos.x,campPos.x);
  assert.equal(sp.endSpectate(game),true);assert.equal(game.currentDungeon,null);assert.equal(game.player.x,campPos.x);assert.equal(g2.x,gPos.x);assert.equal(g2.y,gPos.y);assert.equal(game.spectating,null);
}
{ // the real march: the hero walks into the castle by himself and the spectate follows without any help
  p=marchParty(50);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  p.x=d.entrance.x-30;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
  let handedOver=false;for(let i=0;i<200&&!handedOver;i++){game.update(.1);handedOver=game.currentDungeon?.id===CASTLE;}
  assert.ok(handedOver,'automatic hand-over');assert.ok(game.spectating&&game.spectating.field===false);
  sp.endSpectate(game);assert.equal(game.currentDungeon,null);
}
// ---------- automatic ends in the field ----------
for(const [name,mutate,pattern] of [
  ['fallen',(q)=>{q.status='fallen';q.members.forEach(u=>{u.dead=true;});},/全滅/],
  ['victory',(q)=>{game.heroJourney.demonKingDefeat={phase:1,by:'hero',name:'x'};q.status='victorious';},/魔王が討たれた/],
  ['raid',()=>{game.baseRaidActive=true;},/襲撃/],
  ['commander',()=>{game.player.isDown=true;},/隊長に異変/]]){
  const q=marchParty(60);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true,name);game.spectating.speed=2;toasts.length=0;
  game.update(.1);assert.ok(game.spectating,`${name}: still on`);
  mutate(q);game.update(.1);
  assert.equal(game.spectating,null,`${name}: ends`);assert.equal(game.camera.x,campPos.x,`${name}: camera back`);assert.ok(toasts.some(t=>pattern.test(t)),`${name}: ${toasts.join('|')}`);assert.equal(sp.spectateSpeed(game),1,`${name}: ×1`);
  game.player.isDown=false;game.baseRaidActive=false;
}
{ // field spectate cannot start from, nor survive, a building
  const q=marchParty(65);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  game.currentDungeon=DUNGEON_DEFS.find(x=>x.kind==='town');game.update(.1);assert.equal(game.spectating,null);game.currentDungeon=null;
}
// ---------- speed ----------
{
  marchParty(70);
  assert.equal(sp.spectateSpeed(game),1);assert.equal(sp.spectateSteps(game,.016),1);assert.equal(sp.cycleSpectateSpeed(game),1,'no-op outside spectating');
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);assert.equal(sp.spectateSpeed(game),1);
  assert.equal(sp.cycleSpectateSpeed(game),2);assert.equal(sp.spectateSpeed(game),2);assert.equal(sp.cycleSpectateSpeed(game),4);assert.equal(sp.spectateSteps(game,.016),4);
  assert.equal(sp.spectateSteps(game,.09),2,'a slow frame is capped at ×2');assert.equal(sp.cycleSpectateSpeed(game),1);assert.equal(sp.cycleSpectateSpeed(game),2);
  // the world really runs faster (whole-world time)
  game.spectating.speed=1;const t0=game.totalBattleTime||0;for(let f=0;f<10;f++){const n=sp.spectateSteps(game,.016);for(let i=0;i<n;i++)game.update(.016);}const slow=(game.totalBattleTime||0)-t0;
  game.spectating.speed=4;const t1=game.totalBattleTime||0;for(let f=0;f<10;f++){const n=sp.spectateSteps(game,.016);for(let i=0;i<n;i++)game.update(.016);}const fast=(game.totalBattleTime||0)-t1;
  assert.ok(Math.abs(fast/slow-4)<.05,`×4 runs 4× the time (${fast}/${slow})`);
  // rest, end request, end → ×1 for sure
  game.spectating.speed=4;game.restTimer=8;assert.equal(sp.spectateSpeed(game),1);sp.updateSpectate(game,.1);assert.equal(game.spectating.speed,1,'the stored speed is reset too');game.restTimer=0;
  game.spectating.speed=2;sp.endSpectate(game);assert.equal(sp.spectateSpeed(game),1);assert.equal(game.spectating,null);
  // a fresh spectate starts at ×1; a save/load never keeps it
  marchParty(75);sp.startSpectate(game,SOLDIER_CLASSES);game.spectating.speed=4;
  const snap=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));game.resumeSavedGame(snap);assert.equal(game.spectating,null);assert.equal(sp.spectateSpeed(game),1);assert.equal(game.spectateQueued??null,null);
  marchParty(80);sp.startSpectate(game,SOLDIER_CLASSES);assert.equal(game.spectating.speed,1);
}
{ // castle spectate also starts at ×1 and resets during rest
  const q=marchParty(85);q.x=d.entrance.x;q.y=d.entrance.y;q.destination={...d.entrance};q.route=[{...d.entrance}];q.routeIndex=0;q.members.forEach(u=>{u.x=q.x;u.y=q.y;});
  hp.updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(q.space,CASTLE);const scene=hp.ensureHeroCastle(game,d);scene.monsters.length=0;q.route=[];
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);assert.equal(game.spectating.field,false);assert.equal(game.spectating.speed,1);
  sp.cycleSpectateSpeed(game);assert.equal(sp.spectateSpeed(game),2);game.restTimer=8;sp.updateSpectate(game,.1);assert.equal(game.spectating.speed,1);game.restTimer=0;
  sp.endSpectate(game);assert.equal(game.currentDungeon,null);
}
console.log('hero-spectate v7.0.31: queue, field spectate, castle hand-over, parked squad, speed passed');