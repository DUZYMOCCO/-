// REPRO (not committed): all heroes down but "搬送中" label shown
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const sp=await import('../js/hero-spectate.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {markSoldierDown,downLabel,rescueUnits}=await import('../js/casualty-rules.js');
const {WORLD_SIZE}=await import('../js/world.js');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
game.showToast=()=>{};game.width=800;game.height=450;game.zoom=1;
game.activeSlotId=saveSlots.create('repro').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
const d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle'),C=WORLD_SIZE/2;
const camp={x:game.player.x,y:game.player.y};
const show=(tag,p)=>console.log(tag,'status=',p.status,p.members.map(u=>`${u.name}:${u.dead?'dead':u.isDown?'down':'ok'}/car=${u.carrierId??'-'}/t=${Math.ceil(u.downTimer??-1)}/${downLabel(u)}`).join(' | '));
function fresh(){sp.clearSpectate(game);game.currentDungeon=null;game.restTimer=0;game.baseRaidActive=false;game.monsters=[];game.player.x=camp.x;game.player.y=camp.y;game.player.isDown=false;game.player.hp=game.player.maxHp;hp.initializeHeroJourney(game);game.phase=10;hp.rollHeroRevelation(game);game.inBattle=true;return game.heroJourney.party;}
// S1: field march, all heroes down far away (no carriers)
{const p=fresh();p.members.forEach(u=>{u.x=C+2600;u.y=C+300;});p.members.forEach(u=>markSoldierDown(game,u));for(let i=0;i<5;i++)game.update(.1);show('S1 field far, no spectate',p);}
// S2: field march, all heroes down next to the commander (parked in camp / spectating)
{const p=fresh();p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));for(let i=0;i<5;i++)game.update(.1);show('S2 heroes down at commander',p);}
// S2b: same while field spectating
{const p=fresh();sp.startSpectate(game,SOLDIER_CLASSES);p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));for(let i=0;i<20;i++)game.update(.1);show('S2b field spectate, heroes at parked commander',p);sp.clearSpectate(game);}
// S3: own soldiers near downed heroes
{const p=fresh();const s0=game.squad.find(s=>!s.dead&&!s.isDown);p.members.forEach((u,i)=>{u.x=s0.x+20+i*5;u.y=s0.y;});p.members.forEach(u=>markSoldierDown(game,u));game.player.x=C+4000;for(let i=0;i<30;i++)game.update(.1);show('S3 squad soldiers near',p);}
// S4: castle spectate, heroes down near the entrance where the observer stands
{const p=fresh();p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});hp.updateHeroParty(game,.1,SOLDIER_CLASSES);
 const sc=hp.ensureHeroCastle(game,d);sc.monsters.length=0;sp.startSpectate(game,SOLDIER_CLASSES);console.log('S4 in castle?',game.currentDungeon?.id,'player',Math.round(game.player.x),Math.round(game.player.y),'hero',Math.round(p.members[0].x),Math.round(p.members[0].y));
 p.members.forEach(u=>markSoldierDown(game,u));for(let i=0;i<40;i++)game.update(.1);show('S4 castle spectate',p);}
// ---- timelines ----
function tl(tag,p,secs,step=.1){let last='';for(let t=0;t<secs;t+=step){game.update(step);const k=p.status+'|'+p.members.map(u=>u.dead?'D':u.isDown?(u.carrierId?'C':'d'):'o').join('');if(k!==last&&Math.abs(t%5)<step){}if(k!==last){console.log(tag,'t='+t.toFixed(1),k,'timers',p.members.map(u=>Math.ceil(u.downTimer??-1)).join(','));last=k;}}console.log(tag,'END',p.status,'fallen?',p.status==='fallen','spectating',!!game.spectating,'players carried',rescueUnits(game).filter(u=>u.carrierId).length);}
{const p=fresh();sp.startSpectate(game,SOLDIER_CLASSES);p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));tl('T-S2b',p,120);sp.clearSpectate(game);}
{const p=fresh();p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});hp.updateHeroParty(game,.1,SOLDIER_CLASSES);
 const sc=hp.ensureHeroCastle(game,d);sc.monsters.length=0;sp.startSpectate(game,SOLDIER_CLASSES);p.members.forEach((u,i)=>{u.x=game.player.x+8+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));tl('T-S4b',p,120);}
// rest-phase staleness: carried hero then rest
{const p=fresh();p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));game.update(.1);const carried=p.members.filter(u=>u.carrierId);console.log('R carried before',carried.length);game.player.isDown=true;game.player.hp=0;game.restTimer=8;for(let i=0;i<5;i++)game.update(.1);console.log('R after commander down during rest: carried=',p.members.filter(u=>u.carrierId).length);}
{const p=fresh();p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));
 for(let t=0;t<100;t+=.1){game.update(.1);if(Math.abs(t-Math.round(t/5)*5)<.06)console.log('Q t='+Math.round(t),p.status,p.members.map(u=>`${u.dead?'D':u.isDown?(u.carrierId?'C':'d'):'o'}${(u.downTimer??-1).toFixed(0)}${u.dying?'*':''}`).join(' '),'restTimer',game.restTimer);}
}
console.log('===== away-from-camp field spectate =====');
function away(){const p=fresh();game.player.x=C+3000;game.player.y=C+500;game.squad.forEach(s=>{s.x=game.player.x;s.y=game.player.y;});return p;}
{const p=away();sp.startSpectate(game,SOLDIER_CLASSES);p.members.forEach((u,i)=>{u.x=game.player.x+10+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));
 let last='';for(let t=0;t<120;t+=.1){game.update(.1);const k=p.status+'|'+p.members.map(u=>u.dead?'D':u.isDown?(u.carrierId?'C':'d'):'o').join('');if(k!==last||Math.abs(t-Math.round(t/10)*10)<.06){console.log('W t='+t.toFixed(0),p.status,p.members.map(u=>`${u.dead?'D':u.isDown?(u.carrierId?'C':'d'):'o'}${(u.downTimer??-1).toFixed(0)}`).join(' '),'label0=',downLabel(p.members[0]));last=k;}}}
console.log('===== castle debug =====');
{const p=fresh();p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});hp.updateHeroParty(game,.1,SOLDIER_CLASSES);
 const sc=hp.ensureHeroCastle(game,d);sc.monsters.length=0;sp.startSpectate(game,SOLDIER_CLASSES);p.members.forEach((u,i)=>{u.x=game.player.x+8+i;u.y=game.player.y;});p.members.forEach(u=>markSoldierDown(game,u));
 console.log('X player',game.player.x,game.player.y,'hp',game.player.hp,'spectating',!!game.spectating,'hero0',p.members[0].x,p.members[0].y,'inst',p.members[0].downedInAid,p.members[0].downTimer);
 for(let i=0;i<3;i++){game.update(.1);console.log('X after',i,'player',game.player.x.toFixed(1),game.player.y.toFixed(1),'hero0',p.members[0].x.toFixed(1),p.members[0].y.toFixed(1),'car',p.members[0].carrierId,'timer',p.members[0].downTimer,'aid',p.members[0].downedInAid);}
 for(let t=0;t<90;t+=.1){game.update(.1);if(Math.abs(t-Math.round(t/15)*15)<.06)console.log('X t='+Math.round(t),p.status,'timer',p.members[0].downTimer.toFixed(1),'aid',p.members[0].downedInAid,'car',p.members[0].carrierId);}}
