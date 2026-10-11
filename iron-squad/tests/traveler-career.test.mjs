import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {CAREER_RULES} from '../js/career-rules.js';
import {ensureTavernRoster,FIELD_TAVERN,nearFieldTavern} from '../js/tavern.js';
import {joinLimitedEncounter,prepareLimitedEncounter} from '../js/limited-allies.js';
import {rollHeroRevelation,updateHeroFollowing} from '../js/hero-party.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,RANKS}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('TRAVELER TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();
assert.equal(game.currentRank().title,'在野の旅人');assert.equal(game.player.civilianOutfit,true);assert.equal(game.limitedGuardLimit(),5);
const main=game.squad[0];assert.equal(game.assignToPersonalSquad(main.id),false);assert.equal(game.personalScoutState(main).enabled,false);
game.gainExp(1e6,{service:false,share:false});assert.equal(game.exp,0);assert.equal(game.career.contribution,0);assert.equal(game.rankIndex,0);
for(let phase=1;phase<=9;phase++){game.phase=phase;game.gainExp(700,{share:false,merit:700});}
assert.equal(game.career.status,'traveler','nine active phases are not yet enough for an invitation');
game.phase=10;game.gainExp(120,{share:false,merit:120});
// Rescuing one's own downed companion is not a contribution to the region.
const ownBefore=game.career.contribution;game.gainExp(20,{share:false,merit:0});assert.equal(game.career.contribution,ownBefore);
assert.equal(game.career.status,'invited');assert.equal(game.exp,0);assert.equal(game.rankIndex,0,'a contribution threshold does not forcibly enlist or promote the traveler');
assert.ok(game.openCareerInvitation());document.getElementById('btn-career-later').click();assert.equal(game.career.status,'invited');game.closeStrategyModal();

Object.assign(game.player,{x:79360,y:79360});assert.equal(game.openTavern(),false,'the tavern is visited on the field, not from HQ');
Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});assert.ok(nearFieldTavern(game));game.updateStatsUI();assert.equal(document.getElementById('btn-field-tavern').classList.contains('hidden'),false);
const town=game.dungeons.find(d=>d.id==='royal_castle_town');game.enterDungeon(town);assert.equal(game.openTavern(),false,'towns no longer hold a tavern');game.exitDungeon();
Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});game.gold=1e6;assert.ok(game.openTavern());
const first=ensureTavernRoster(game).people[0],wallet=game.gold;
assert.equal(game.recruitTavernPerson(first.unit.id,'talk'),false,'strangers require actual conversation');
game.talkToTavernPerson(first.unit.id,1);assert.equal(first.trust,0,'a dismissive answer does not build trust');
for(const answer of [0,1,0])assert.ok(game.talkToTavernPerson(first.unit.id,answer));
assert.ok(game.recruitTavernPerson(first.unit.id,'talk'));assert.equal(game.gold,wallet);assert.equal(game.recruitTavernPerson(first.unit.id,'talk'),false,'joining is not repeatable');
for(const p of ensureTavernRoster(game).people.filter(p=>!p.joined))assert.ok(game.recruitTavernPerson(p.unit.id,'gold'));
game.phase++;const next=ensureTavernRoster(game).people;
for(const p of next.slice(0,3))assert.ok(game.recruitTavernPerson(p.unit.id,'gold'));
assert.equal(game.listPersonalGuardsAlive().length,5);assert.equal(game.taverns.waiting.length,2);
const waiting=game.taverns.waiting[0],identity=JSON.stringify(waiting.appearance),weapon=JSON.stringify(waiting.equipped),waitId=waiting.id;
assert.deepEqual([waiting.x,waiting.y],[FIELD_TAVERN.x,FIELD_TAVERN.y]);assert.equal(game.rejoinTavernCompanion(waitId),false,'the active party remains capped at five');
assert.ok(game.parkTavernCompanion(game.listPersonalGuardsAlive()[0].id));assert.ok(game.rejoinTavernCompanion(waitId));
assert.equal(JSON.stringify(game.squad.find(s=>s.id===waitId).appearance),identity);assert.equal(JSON.stringify(game.squad.find(s=>s.id===waitId).equipped),weapon);
document.getElementById('btn-tavern-close').click();game.closeStrategyModal();
const saved=structuredClone(game.saveGame());game.resumeSavedGame(structuredClone(saved));assert.equal(game.career.status,'invited');assert.equal(game.taverns.waiting.length,2);
assert.equal(game.listPersonalGuardsAlive().length,5);assert.deepEqual(game.taverns.waiting.map(s=>s.id),saved.taverns.waiting.map(s=>s.id));assert.equal(game.taverns.roster.phase,saved.taverns.roster.phase);game.closeStrategyModal();

// Existing rescue joins immediately even at five; safely waiting only after leaving the instance.
const village=game.dungeons.find(d=>d.id==='ninja_village');game.enterDungeon(village);const encounter=prepareLimitedEncounter(game,village);
Object.assign(game.player,{x:encounter.x,y:encounter.y});assert.ok(joinLimitedEncounter(game,encounter.id));assert.ok(game.squad.some(s=>s.id===encounter.unit.id));
game.exitDungeon();assert.ok(game.taverns.waiting.some(s=>s.id===encounter.unit.id));assert.equal(game.listPersonalGuardsAlive().length,5);
assert.equal(game.career.status,'invited');
game.phase=11;assert.ok(rollHeroRevelation(game,()=>0));Object.assign(game.player,{x:79340,y:79340});Object.assign(game.heroJourney.party,{x:80360,y:79360,space:'field'});game.heroFollowing=true;const beforeFollow={x:game.player.x,y:game.player.y};updateHeroFollowing(game,.5);assert.ok(game.heroFollowing);assert.ok(Math.hypot(game.player.x-beforeFollow.x,game.player.y-beforeFollow.y)>0,'travelers can follow the chosen hero');game.heroFollowing=false;
const castle=game.dungeons.find(d=>d.id==='dungeon_demon_castle');game.enterDungeon(castle);assert.equal(game.currentDungeon.id,castle.id,'military membership never gates the demon castle');
const demon={id:'traveler-demon',type:'demon_king',name:'魔王',isBoss:true,isDungeonBoss:true,isDemonKing:true,x:game.player.x+80,y:game.player.y,hp:0,maxHp:1e7,atk:1000,def:100,color:'#623a54'};game.monsters=[demon];game.killMonster(demon,game.player,true);assert.ok(game.heroJourney.demonKingDefeat);assert.equal(game.career.status,'invited');game.exitDungeon();

// Acceptance is explicit, preserves the five followers and moves waiting friends into the army reserve.
Object.assign(game.player,{x:79360,y:79360});const followers=game.listPersonalGuardsAlive().map(s=>s.id),waitingIds=game.taverns.waiting.map(s=>s.id);
assert.ok(game.acceptCareerInvitation());assert.equal(game.career.status,'enlisted');assert.equal(game.player.civilianOutfit,false);assert.ok(game.listPersonalGuardsAlive().every(s=>!s.civilianOutfit));assert.equal(game.exp,0);assert.deepEqual(game.listPersonalGuardsAlive().map(s=>s.id),followers);
assert.equal(game.taverns.waiting.length,0);for(const id of waitingIds)assert.ok(game.reserves.some(s=>s.id===id));
// After enlisting, stepping a friend out of the party sends them to the HQ reserve rather than the tavern.
Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});const leaving=game.listPersonalGuardsAlive()[0];assert.ok(game.parkTavernCompanion(leaving.id));
assert.equal(game.taverns.waiting.length,0);assert.ok(game.reserves.some(s=>s.id===leaving.id&&!s.isPersonalGuard));Object.assign(game.player,{x:79360,y:79360});
const soldier=game.squad.find(s=>!s.isPersonalGuard);assert.equal(game.personalScoutState(soldier).enabled,true);
game.exp=RANKS[8].reqExp*2;
for(let phase=10;phase<14;phase++){game.phase=phase;game.gainExp(1,{share:false});}
assert.equal(game.rankIndex,1,'huge stored merit still promotes just one grade after four active phases');
for(let i=0;i<100;i++)game.gainExp(1e6,{share:false});assert.equal(game.rankIndex,1,'many kills in the same phase do not count as years of service');
for(let phase=14;phase<20;phase++){game.phase=phase;game.gainExp(1,{share:false});}assert.equal(game.rankIndex,2);
const roundTrip=structuredClone(game.saveGame());game.resumeSavedGame(roundTrip);assert.equal(game.career.status,'enlisted');assert.equal(game.exp,roundTrip.exp);assert.equal(game.rankIndex,2);
// A later expedition keeps the enlisted status but restarts service streaks with the new phase numbering.
game.saveGame();game.startFreshGame(true);game.closeStrategyModal();assert.equal(game.career.status,'enlisted');assert.equal(game.rankIndex,0);
assert.equal(game.career.servicePhases,0);assert.equal(game.career.promotionServicePhases,0);assert.equal(game.career.lastActivePhase,0);
game.destroy();dom.window.close();
console.log('PASS: traveler start, own merit and optional invitation, five followers, paid/conversation tavern joins, waiting/swap/save, unchanged rescue, independent demon-king route, gated army, gradual promotions and current save roundtrip');
