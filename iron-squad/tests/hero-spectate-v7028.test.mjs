// v7.0.28: hero spectate mode (observer commander in the demon castle) — rules, camera, targeting, king hunt, save safety, end conditions.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const sp=await import('../js/hero-spectate.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {visibleHeroMembers}=await import('../js/hero-rules.js');
const {activeSquad,inCurrentInstance}=await import('../js/instance-rules.js');
const {markSoldierDown}=await import('../js/casualty-rules.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
const toasts=[];game.showToast=m=>toasts.push(String(m));
game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('観戦検証').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle'),CASTLE=d.id;
const fieldMob={x:game.player.x+900,y:game.player.y,hp:10,maxHp:10,atk:1,radius:10,type:'slime'};
function castleParty(phase){
  game.currentDungeon=null;game.spectating=null;game.restTimer=0;game.baseRaidActive=false;
  hp.initializeHeroJourney(game);game.phase=phase;assert.equal(hp.rollHeroRevelation(game),true);const p=game.heroJourney.party;
  p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
  hp.updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(p.space,CASTLE);
  const scene=hp.ensureHeroCastle(game,d);scene.monsters.length=0;
  const king={isDemonKing:true,isBoss:true,isColossal:true,name:'魔王',hp:1e12,maxHp:1e12,x:d.width-350,y:d.height/2,atk:1,radius:20,speed:40,type:'demon_king',skillCooldown:1e9,skillTimer:1e9,bossDef:{skillCooldown:1e9}};scene.monsters.push(king);p.route=[];
  game.monsters=[fieldMob];game.player.hp=game.player.maxHp;game.player.isDown=false;game.inBattle=true;
  return {p,king,scene};
}
// ---------- start conditions ----------
{
  game.heroJourney=null;hp.initializeHeroJourney(game);
  assert.equal(sp.spectateAvailability(game).code,'no-party');
  hp.initializeHeroJourney(game);game.phase=10;hp.rollHeroRevelation(game);
  game.inBattle=true;let a=sp.spectateAvailability(game);assert.equal(a.ok,true);assert.equal(a.kind,'field','v7.0.31: marching in the field can be watched from the camp (see hero-spectate-v7031.test.mjs)');
  game.player.x=game.player.x+5000;a=sp.spectateAvailability(game);assert.equal(a.ok,true,'v7.0.32: away from the camp is fine (no peace-bubble condition)');game.restTimer=8;assert.equal(sp.startSpectate(game),false);assert.equal(game.currentDungeon,null);assert.ok(toasts.some(t=>t.includes('観戦できません')));game.restTimer=0;game.player.x-=5000;
  const {p}=castleParty(20);
  assert.equal(sp.spectateAvailability(game).ok,true);
  game.restTimer=8;assert.equal(sp.spectateAvailability(game).code,'rest');game.restTimer=0;
  game.baseRaidActive=true;assert.equal(sp.spectateAvailability(game).code,'raid');game.baseRaidActive=false;
  game.invasions={...(game.invasions||{}),stage:'marching'};assert.equal(sp.spectateAvailability(game).code,'raid');game.invasions.stage='idle';
  game.player.isDown=true;assert.equal(sp.spectateAvailability(game).code,'down');game.player.isDown=false;
  p.members.forEach(u=>{u.isDown=true;});assert.equal(sp.spectateAvailability(game).code,'not-fighting','everyone down: nothing to watch');p.members.forEach(u=>{u.isDown=false;});
  p.status='down';assert.equal(sp.spectateAvailability(game).code,'not-fighting');p.status='castle';
  game.currentDungeon=DUNGEON_DEFS.find(x=>x.kind==='town');assert.equal(sp.spectateAvailability(game).code,'inside');game.currentDungeon=null;
  p.space='field';assert.equal(sp.spectateAvailability(game).kind,'field');p.space=CASTLE;
}
const drop=m=>{const i=scene.monsters.indexOf(m);if(i>=0)scene.monsters.splice(i,1);};
// ---------- start, observer rules ----------
const fieldPos={x:game.player.x,y:game.player.y};
const {p,king,scene}=castleParty(25);
const guard=game.squad.find(s=>s.isPersonalGuard)||(()=>{const g=game.createNewSoldier();g.isPersonalGuard=true;game.squad.push(g);return g;})();
guard.x=fieldPos.x+30;guard.y=fieldPos.y;const guardPos={x:guard.x,y:guard.y};
const savedMonsters=game.monsters;
assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
assert.equal(game.currentDungeon.id,CASTLE);assert.ok(game.spectating);assert.equal(game.monsters,scene.monsters,'the same castle scene as the hero party');
assert.equal(game.savedFieldMonsters.includes(fieldMob),true,'field enemies are stashed (frozen)');
assert.equal(visibleHeroMembers(game).length,6,'the party is drawn in the shared scene');
assert.equal(inCurrentInstance(game,guard),false,'the commander enters alone: personal guards stay in the field');
assert.ok(!activeSquad(game).includes(guard));assert.equal(activeSquad(game).length,6);
assert.equal(game.heroFollowing,false);assert.equal(game.spectating.viewer,p.members[0],'follows the hero first');
assert.ok(toasts.some(t=>t.includes('観戦を始めた')));
{ // invulnerable and not a target
  const me=game.player,hpBefore=me.hp;game.damageTarget(me,1e12,{});game.damageTarget(me,1e9,{pctMax:.5,attacker:king});assert.equal(me.hp,hpBefore,'no damage at all');
  const mob={x:me.x+5,y:me.y,hp:100,maxHp:100,atk:1e9,radius:10,type:'slime',speed:50,attackInterval:.1};scene.monsters.push(mob);
  for(let i=0;i<20;i++)game.update(.1);
  assert.equal(me.hp,hpBefore);assert.notEqual(mob._cachedTarget,me,'enemies never pick the observer');
  drop(mob);
}
{ // controls are dead: stick, strike, auto-attack, potions
  p.members.forEach(u=>{u.x=3000;u.y=d.height/2;u.speed=0;}); // keep the party out of reach so any damage to the foe would have to come from the observer
  const me=game.player,x=me.x,y=me.y;game.joystick={active:true,x:1,y:0,dirX:1,dirY:0};
  const foe={x:me.x+20,y:me.y,hp:1e6,maxHp:1e6,atk:0,radius:10,type:'slime',speed:0};scene.monsters.push(foe);me.atkCooldown=0;
  for(let i=0;i<10;i++)game.update(.1);
  assert.equal(me.x,x);assert.equal(me.y,y);assert.equal(foe.hp,1e6,'the observer does not fight');
  const cd=me.powerAtkCooldown||0;game.triggerPowerAttack();assert.equal(me.powerAtkCooldown||0,cd,'strike is disabled');
  game.squadPotion=3;assert.equal(game.useSquadPotion(),false);assert.equal(game.squadPotion,3);game.revivalPotion=1;assert.equal(game.useRevivalPotion(),false);
  drop(foe);game.joystick={active:false,x:0,y:0,dirX:0,dirY:0};
}
{ // the camera follows the watched unit; the exit portal does not trigger
  p.members[0].x=1500;p.members[0].y=d.height/2;for(let i=0;i<120;i++)game.update(.05);
  const v=game.spectating.viewer;assert.ok(Math.abs(game.camera.x-Math.max(400,v.x))<90&&Math.abs(game.camera.y-v.y)<90,`camera follows the hero (${game.camera.x},${game.camera.y} vs ${v.x},${v.y})`);
  p.members.forEach(u=>{u.x=1500;});for(let i=0;i<4;i++)game.update(.01);assert.ok(game.camera.x>420,'it keeps moving with the watched unit');
  assert.equal(game.currentDungeon.id,CASTLE,'still inside');
  assert.equal(sp.spectateCameraTarget(game),p.members[0]);
}
{ // switching: next / previous / by id, king included, wraps
  const ids=sp.spectateTargets(game).map(t=>t.id);assert.equal(ids.length,7);assert.equal(ids.at(-1),'__king');
  assert.equal(sp.selectSpectateTarget(game,1),p.members[1]);assert.equal(sp.selectSpectateTarget(game,-1),p.members[0]);
  assert.equal(sp.selectSpectateTarget(game,-1),king,'wraps back to the king');assert.equal(sp.selectSpectateTarget(game,1),p.members[0]);
  assert.equal(sp.selectSpectateTarget(game,p.members[3].id),p.members[3]);assert.equal(sp.selectSpectateTarget(game,'nobody'),null);
  assert.equal(game.spectating.targetId,p.members[3].id);
}
{ // when the followed unit falls the camera moves on by itself (down, then dead); a manual pick of a downed unit stays
  sp.selectSpectateTarget(game,p.members[0].id);
  markSoldierDown(game,p.members[0]);game.update(.05);
  assert.equal(game.spectating.targetId,p.members[1].id,'hero down → next healthy member');assert.equal(game.spectating.viewer,p.members[1]);
  p.members[1].dead=true;game.update(.05);assert.equal(game.spectating.targetId,p.members[2].id,'dead → next');
  assert.equal(sp.spectateTargets(game).some(t=>t.id===p.members[1].id),false,'the dead are not listed');
  sp.selectSpectateTarget(game,p.members[0].id);game.update(.05);game.update(.05);assert.equal(game.spectating.targetId,p.members[0].id,'a manual pick of a downed member is respected');
  p.members[0].isDown=false;p.members[0].hp=p.members[0].maxHp;p.members[1].dead=false;p.members[1].isDown=false;p.members[1].hp=p.members[1].maxHp;
}
{ // the summary corner (pure)
  p.members[2].hp=p.members[2].maxHp*.4;p.members[3].hp=p.members[3].maxHp*.1;markSoldierDown(game,p.members[4]);
  const s=sp.spectateSummary(game);assert.equal(s.total,6);assert.match(s.partyText,/生存6\/6（健在\d・負傷1・瀕死1・ダウン1）/);
  assert.match(s.castleText,/城内の敵 残り0体 · 魔王HP 100\.0%/);assert.ok(Array.isArray(s.log));
  p.members[4].isDown=false;p.members[2].hp=p.members[2].maxHp;p.members[3].hp=p.members[3].maxHp;
}
{ // the king hunts the party through the castle even though the commander is "inside"; he stays near a lone observer otherwise
  king.x=d.width-350;king.y=d.height/2;p.members.forEach(u=>{u.x=600;u.y=d.height/2;u.speed=0;u.atk=0;});
  const before=Math.hypot(king.x-600,king.y-d.height/2);for(let i=0;i<80;i++)game.update(.1);
  const after=Math.hypot(king.x-600,king.y-d.height/2);assert.ok(before-after>600,`the king walked ${Math.round(before-after)}px toward the party`);
  assert.ok(Math.hypot(king.x-game.player.x,king.y-game.player.y)>400,'he is not after the observer');
}
{ // "commander in the castle" no longer blocks sending the king home while observing
  king.x=1000;king.y=1000;hp.homeDemonKing(game);assert.equal(king.x,d.width-350,'observer does not count as the commander standing in the castle');
}
// ---------- save safety ----------
{
  const data=game.saveGame({immediate:true});assert.ok(data);assert.equal(data.player.x,fieldPos.x);assert.equal(data.player.y,fieldPos.y,'saved at the field position, not inside the castle');
  const text=JSON.stringify(data);assert.ok(!text.includes('spectat'),'no spectate state in the save');
  assert.equal(data.squad.find(s=>s.id===guard.id).x,guardPos.x,'guards keep their field positions');
}
// ---------- user ends it: everything returns ----------
{
  toasts.length=0;assert.equal(sp.endSpectate(game,'観戦を終えて戻った。'),true);
  assert.equal(game.currentDungeon,null);assert.equal(game.spectating,null);assert.equal(game.player.x,fieldPos.x);assert.equal(game.player.y,fieldPos.y);
  assert.equal(game.monsters.includes(fieldMob),true,'field enemies are back');assert.equal(guard.x,guardPos.x);assert.equal(guard.y,guardPos.y);
  assert.ok(toasts.some(t=>t.includes('観戦を終えて')));
  assert.equal(game.heroJourney.castleScene.monsters,scene.monsters,'the castle battle state is kept for the hidden fight');
  assert.equal(sp.endSpectate(game),false,'nothing to end');
}
// ---------- automatic ends ----------
const reasonCases=[
  ['fallen',(p)=>{p.status='fallen';p.members.forEach(u=>{u.dead=true;});},/全滅/],
  ['withdrawn',(p)=>{p.status='withdrawn';},/撤退/],
  ['victory',(p,k)=>{game.heroJourney.demonKingDefeat={phase:1,by:'hero',name:'x'};p.status='victorious';},/魔王が討たれた/],
  ['raid',()=>{game.baseRaidActive=true;},/襲撃/],
  ['commander',()=>{game.player.isDown=true;},/隊長に異変/],
  ['left',(p)=>{p.space='field';},/魔王城を離れた/],
];
for(const [name,mutate,pattern] of reasonCases){
  const c=castleParty(30);const fp={x:game.player.x,y:game.player.y};toasts.length=0;
  assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true,name);game.update(.1);assert.ok(game.spectating,`${name}: still spectating before the event`);
  mutate(c.p,c.king);game.update(.1);
  assert.equal(game.spectating,null,`${name}: spectate ends`);assert.equal(game.currentDungeon,null,`${name}: back in the field`);assert.equal(game.player.x,fp.x,name);assert.ok(toasts.some(t=>pattern.test(t)),`${name}: toast ${toasts.join('|')}`);
  game.player.isDown=false;game.baseRaidActive=false;
}
{ // an end during the 8-second rest waits until the rest is over (no half-swapped monster lists)
  const c=castleParty(35);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  game.restTimer=8;game.restMonsters=game.monsters;game.monsters=[];c.p.status='withdrawn';
  game.updateSpectateOnly?.();sp.updateSpectate(game,.1);assert.ok(game.spectating,'deferred during rest');assert.equal(game.spectating.endRequested,true);assert.equal(game.currentDungeon.id,CASTLE);
  game.restTimer=0;game.monsters=game.restMonsters;game.restMonsters=[];sp.updateSpectate(game,.1);
  assert.equal(game.spectating,null);assert.equal(game.currentDungeon,null);
  const c2=castleParty(50);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.restTimer=8;assert.equal(sp.endSpectate(game,'x'),false,'the button also waits');assert.equal(game.spectating.endRequested,true);game.restTimer=0;
  game.restMonsters=[];sp.updateSpectate(game,.1);assert.equal(game.spectating,null);
}
{ // loading a game or starting a new one never leaves the flag behind
  const c=castleParty(40);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);
  const snapshot=JSON.parse(JSON.stringify(game.saveGame({immediate:true})));
  game.resumeSavedGame(snapshot);assert.equal(game.spectating,null);assert.equal(game.currentDungeon,null,'the commander does not sit in the castle after loading');
  assert.equal(game.player.x,fieldPos.x);
  const c3=castleParty(45);assert.equal(sp.startSpectate(game,SOLDIER_CLASSES),true);game.startFreshGame(false);assert.equal(game.spectating,null);
}
console.log('hero-spectate v7.0.28: start rules, observer (invisible/invulnerable/untargetable), camera, switching, auto-switch, king hunt, save safety, end conditions passed');
