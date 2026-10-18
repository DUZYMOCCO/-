// v7.0.25: hero record progress log (status dedupe, grouped growth, protected events, throttled notices) and withdrawal of a stagnant party.
import assert from 'node:assert/strict';
import {startHeroJournal,updateHeroJournal,finishHeroJournal,JOURNAL_LIMITS} from '../js/hero-journal.js';
import {HERO_RULES,nextHeroRevelationPhase,heroPartyActive} from '../js/hero-rules.js';
const CASTLE='dungeon_demon_castle';
// ---------- journal-level (no full game) ----------
const make=(id='p',n=6)=>({id,name:'旅の勇者',phase:20,space:CASTLE,x:240,y:300,castleInfo:{mobs:28,bossHp:1e9,bossMax:1e9},members:Array.from({length:n},(_,i)=>({id:`${id}u${i}`,name:`仲間${i}`,talent:'AVERAGE',soldierClass:'LIGHT',isChosenHero:i===0,level:1,maxHp:100,hp:100,atk:10,def:5}))});
const mkGame=()=>{const toasts=[];return {phase:20,battleReport:[],toasts,showToast:m=>toasts.push(String(m)),heroJourney:{history:[]}};};
const count=(p,type)=>p.journal.events.filter(e=>e.type===type).length;
{ // status log: once per phase, only when changed, immediately on big changes
  const game=mkGame(),p=make();startHeroJournal(game,p);
  updateHeroJournal(game,p,2);updateHeroJournal(game,p,2);updateHeroJournal(game,p,2);
  assert.equal(count(p,'castle'),1);assert.equal(count(p,'status'),1,'identical situation is not repeated');
  assert.match(p.journal.events.find(e=>e.type==='status').text,/城内の敵 残り28体.*魔王HP 100%（無傷）.*生存6\/6（健在6）/);
  p.castleInfo.mobs=27;updateHeroJournal(game,p,2);assert.equal(count(p,'status'),1,'small change inside the same phase waits for the next phase');
  game.phase=21;updateHeroJournal(game,p,2);assert.equal(count(p,'status'),2,'next phase reports the change');
  updateHeroJournal(game,p,2);assert.equal(count(p,'status'),2);
  p.castleInfo.bossHp=.9e9;updateHeroJournal(game,p,2);assert.equal(count(p,'status'),3,'king lost 10 points: reported at once');
  assert.match(p.journal.events.at(-1).text,/魔王HP 90\.0%（10\.0%削った）/);
  p.castleInfo.mobs=0;updateHeroJournal(game,p,2);assert.equal(count(p,'status'),4,'castle cleared: reported at once');
  p.members[1].hp=10;p.members[2].hp=40;p.members[3].isDown=true;game.phase=22;updateHeroJournal(game,p,2);
  assert.match(p.journal.events.at(-1).text,/生存6\/6（健在3・負傷1・瀕死1・ダウン1）/);
}
{ // growth: six members reaching the same level become one line
  const game=mkGame(),p=make();startHeroJournal(game,p);
  for(const u of p.members){u.level=5;updateHeroJournal(game,p,2);}
  assert.equal(count(p,'growth'),1);assert.equal(p.journal.events.find(e=>e.type==='growth').text,'勇者隊6人がLv.5まで成長。');
  game.phase=21;for(const u of p.members)u.level=10;updateHeroJournal(game,p,2);assert.equal(count(p,'growth'),2,'another phase is a separate line');
  assert.equal(p.journal.events.at(-1).text,'勇者隊6人がLv.10まで成長。');
  game.phase=22;p.members[0].level=15;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).text,'仲間0がLv.15まで成長。','a single member keeps the individual line');
  p.members[1].level=16;p.members[2].level=15;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).text,'勇者隊3人が成長（Lv.15〜16）。','differences are shown as a range');
}
{ // a full diary keeps the important entries
  const game=mkGame(),p=make();startHeroJournal(game,p);p.space='field';p.castleInfo=null;
  p.space=CASTLE;p.castleInfo={mobs:500,bossHp:1e9,bossMax:1e9};
  for(let i=0;i<300;i++){game.phase=21+i;p.castleInfo.mobs--;p.members[0].level+=5;p.members[1].level+=5;updateHeroJournal(game,p,2);}
  const events=p.journal.events;assert.ok(events.length<=JOURNAL_LIMITS.events);
  assert.equal(events[0].type,'departure');assert.equal(count(p,'castle'),1,'castle entry survives');
  finishHeroJournal(game,p,'撤退','魔王城から撤退。');assert.equal(p.journal.events.at(-1).type,'result');assert.equal(p.journal.events.at(-1).text,'魔王城から撤退。');
  assert.equal(count(p,'castle'),1);assert.ok(events.length<=JOURNAL_LIMITS.events);assert.ok(count(p,'status')>5,'recent status lines remain');
  assert.equal(p.journal.result,'撤退');
}
{ // notices are throttled: simultaneous deaths = one toast; later deaths wait out the cooldown; all-down announces once
  const game=mkGame(),p=make();startHeroJournal(game,p);updateHeroJournal(game,p,2);
  const heroToasts=()=>game.toasts.filter(t=>t.includes('戦死'));
  for(const i of [0,1,2])p.members[i].dead=true;updateHeroJournal(game,p,2);
  assert.equal(heroToasts().length,1);assert.match(heroToasts()[0],/勇者隊：勇者 仲間0ほか2名が戦死/);
  p.members[3].dead=true;updateHeroJournal(game,p,2);assert.equal(heroToasts().length,1,'inside the cooldown');
  for(let i=0;i<6;i++)updateHeroJournal(game,p,2);assert.equal(heroToasts().length,1);
  for(let i=0;i<6;i++)updateHeroJournal(game,p,2);assert.equal(heroToasts().length,2,'pending death announced after the cooldown');assert.match(heroToasts()[1],/仲間3が戦死（Lv\.1）/);
  assert.equal(count(p,'death'),4,'the diary still lists every death');
  p.members[4].isDown=true;p.members[5].isDown=true;updateHeroJournal(game,p,2);
  assert.equal(game.toasts.filter(t=>t.includes('全員ダウン')).length,1);assert.equal(count(p,'alldown'),1);
  p.members[4].isDown=false;updateHeroJournal(game,p,2);p.members[4].isDown=true;updateHeroJournal(game,p,2);
  assert.equal(game.toasts.filter(t=>t.includes('全員ダウン')).length,1,'no announcement spam');
  assert.equal(game.battleReport.filter(e=>e.kind==='hero').length,game.toasts.length,'every notice is also in the battle report (kind hero)');
}
assert.equal(nextHeroRevelationPhase(1),10);assert.equal(nextHeroRevelationPhase(10),15);assert.equal(nextHeroRevelationPhase(14),15);assert.equal(nextHeroRevelationPhase(15),20);
assert.equal(heroPartyActive(null),false);assert.equal(heroPartyActive({status:'withdrawn',members:[{dead:false}]}),false);assert.equal(heroPartyActive({status:'castle',members:[{dead:false}]}),true);
// ---------- full game: stagnation → withdrawal → next hero ----------
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const {initializeHeroJourney,rollHeroRevelation,serializeHeroJourney,updateHeroParty,recordDemonKingDefeat,ensureHeroCastle,heroCastleInfo}=await import('../js/hero-party.js');
const {heroMembers,visibleHeroMembers}=await import('../js/hero-rules.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {markSoldierDown}=await import('../js/casualty-rules.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI'])game[m]=()=>{};
const toasts=[];game.showToast=m=>toasts.push(String(m));
game.activeSlotId=saveSlots.create('勇者撤退検証').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle');
const tick=ph=>{game.phase=ph;const p=game.heroJourney.party;const r=rollHeroRevelation(game);if(game.heroJourney.party===p&&p)updateHeroParty(game,1.1,SOLDIER_CLASSES);const q=game.heroJourney.party;if(q)updateHeroJournal(game,q,2);return r;};
function castleParty(phase){
  initializeHeroJourney(game);game.phase=phase;assert.equal(rollHeroRevelation(game),true);const p=game.heroJourney.party;
  p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
  updateHeroParty(game,.1,SOLDIER_CLASSES);assert.equal(p.space,d.id);
  const scene=ensureHeroCastle(game,d);scene.monsters.length=0;
  const king={isDemonKing:true,name:'魔王',hp:1e9,maxHp:1e9,x:p.x+5000,y:p.y,atk:1,radius:20,type:'demon_king'};scene.monsters.push(king);p.route=[];
  game.phase=phase+1;updateHeroParty(game,1.1,SOLDIER_CLASSES);assert.ok(p.watch,'progress watch starts inside the castle');assert.equal(p.watch.sincePhase,phase+1);
  return {p,king,scene,start:phase+1};
}
assert.equal(HERO_RULES.stagnationPhases,4);
{ // no progress at all: warning after 2 phases, withdrawal after 4 (at the phase change), next hero at the next revelation phase
  toasts.length=0;const {p,start}=castleParty(10);
  const history=game.heroJourney.history;assert.equal(history.length,0);
  assert.equal(tick(start+1),false);assert.equal(p.status,'castle');assert.equal(p.journal.events.filter(e=>e.type==='stall').length,0);
  assert.equal(tick(start+2),false);assert.equal(p.journal.events.filter(e=>e.type==='stall').length,1,'warned at 2 phases');
  assert.equal(heroCastleInfo(game).mobs,0);
  tick(start+3);assert.equal(p.status,'castle','3 phases: still waiting');
  const revelation=tick(start+4); // phase 15 is a revelation phase
  assert.equal(p.status,'withdrawn');assert.equal(history.length,1);assert.equal(history[0].result,'撤退');
  assert.match(history[0].journal.events.at(-1).text,/魔王城から撤退。4期のあいだ進展がなかった。/);
  assert.ok(toasts.some(t=>t.includes('魔王城から撤退した')),'toast');assert.ok(game.battleReport.some(e=>e.kind==='hero'&&e.text.includes('撤退')),'battle report');
  assert.equal(revelation,true,'the next hero is born right away in the same phase');
  const q=game.heroJourney.party;assert.notEqual(q.id,p.id);assert.equal(history.length,1,'no duplicate "全滅" entry');assert.equal(q.journal.events[0].type,'departure');
  assert.equal(heroMembers(game).length,6,'only the new party');
}
{ // progress keeps the party: king damage, then enemies, then kills
  toasts.length=0;const {p,king,scene,start}=castleParty(20);
  for(let i=1;i<=10;i++){king.hp-=1000;assert.equal(tick(start+i),false);}
  assert.notEqual(p.status,'withdrawn','king damage = progress');
  for(let i=0;i<3;i++)scene.monsters.push({hp:5,maxHp:5,x:p.x+4000,y:p.y,atk:1,radius:10,type:'slime'});
  p.watch.mobs=3;assert.equal(heroCastleInfo(game).mobs,3);let ph=start+10;
  for(let i=0;i<3;i++){scene.monsters.splice(scene.monsters.findIndex(m=>!m.isDemonKing),1);ph++;tick(ph);assert.notEqual(p.status,'withdrawn');assert.equal(p.watch.sincePhase,ph,'one enemy fewer = progress');}
  assert.equal(heroCastleInfo(game).mobs,0);
  for(let i=0;i<3;i++){ph++;tick(ph);}assert.equal(p.status,'castle','3 quiet phases');
  p.members[0].minionKills=(p.members[0].minionKills||0)+1;updateHeroParty(game,1.1,SOLDIER_CLASSES);assert.equal(p.watch.sincePhase,ph,'a kill counts as progress');
  for(let i=0;i<3;i++){ph++;tick(ph);}assert.notEqual(p.status,'withdrawn');
  ph++;tick(ph);assert.equal(p.status,'withdrawn','4 quiet phases after the last progress');
}
{ // all down and never bleeding out: also counted as stagnation
  toasts.length=0;const {p,start}=castleParty(25);
  p.members.forEach(u=>{markSoldierDown(game,u);u.downTimer=1e9;});
  tick(start+1);assert.equal(p.status,'down');assert.ok(toasts.some(t=>t.includes('全員ダウンした')));
  tick(start+2);tick(start+3);assert.equal(p.status,'down');
  tick(start+4);assert.equal(p.status,'withdrawn');assert.equal(game.heroJourney.history.at(-1).result,'撤退');
}
{ // old save: party sitting in the castle without any of the new fields
  const {p,start}=castleParty(30);
  const saved=JSON.parse(JSON.stringify(serializeHeroJourney(game)));const sp=saved.party;delete sp.watch;delete sp.castleInfo;delete sp._watchClock;delete sp.journal.notice;delete sp.journal.statusMark;
  initializeHeroJourney(game,saved);const q=game.heroJourney.party;assert.equal(q.watch,undefined);
  game.phase=40;updateHeroParty(game,1.1,SOLDIER_CLASSES);assert.equal(q.watch.sincePhase,40,'fresh clock on the first update after loading');assert.notEqual(q.status,'withdrawn');
  for(const ph of [41,42,43])tick(ph);assert.equal(q.status,'castle');
  tick(44);assert.equal(q.status,'withdrawn');
  // a withdrawn party survives save/load and the next revelation still works
  const again=JSON.parse(JSON.stringify(serializeHeroJourney(game)));initializeHeroJourney(game,again);
  assert.equal(game.heroJourney.party.status,'withdrawn');assert.equal(heroMembers(game).length,0);assert.equal(visibleHeroMembers(game).length,0);
  // a king defeat afterwards must not revive or re-archive the withdrawn party
  const keep=JSON.stringify(serializeHeroJourney(game));
  recordDemonKingDefeat(game,null);assert.equal(game.heroJourney.party.status,'withdrawn');assert.equal(game.heroJourney.history.length,1);
  initializeHeroJourney(game,JSON.parse(keep));
  game.phase=45;assert.equal(rollHeroRevelation(game),true);assert.equal(game.heroJourney.history.at(-1).result,'撤退');assert.equal(game.heroJourney.history.length,1);assert.equal(heroMembers(game).length,6);
}
console.log('hero-v7025: status log, grouped growth, protected events, throttled notices, stagnation withdrawal and old saves passed');