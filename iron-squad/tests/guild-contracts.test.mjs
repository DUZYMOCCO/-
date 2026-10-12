import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {GUILD_CONTRACTS,guildQuote,guildBoard,normalizeGuild} from '../js/guild-contracts.js';
import {normalizeNation} from '../js/nation-rules.js';
import {casinoBaseBet,MAX_CASINO_BET,validCasinoBet} from '../js/casino-rules.js';
import {HEADQUARTERS_FACILITIES,nearHeadquartersFacility} from '../js/hq-facilities.js';
import {FIELD_TAVERN,nearFieldTavern} from '../js/tavern.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set()});
for(const def of GUILD_CONTRACTS)for(let level=0;level<=5;level++)assert.equal(guildQuote(def,level).reward,Math.round(def.baseReward*(1+level*.65))*20,'every contract and development level pays twenty times the old quote');
const oldGuild={version:1,active:[{id:'slime',level:0,target:6,reward:120,progress:4,acceptedPhase:2},{id:'goblin-king',level:0,target:1,reward:800,progress:1,acceptedPhase:2}],claimed:{wolf:1},totalCompleted:3};
const migratedGuild=normalizeGuild(oldGuild);assert.deepEqual(migratedGuild.active.map(q=>q.reward),[2400,16000]);assert.deepEqual(migratedGuild.active.map(q=>[q.progress,q.target,q.acceptedPhase]),[[4,6,2],[1,1,2]]);assert.equal(migratedGuild.totalCompleted,3);assert.deepEqual(normalizeGuild(migratedGuild),migratedGuild,'save reload cannot multiply an upgraded reward twice');
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('GUILD SERVICES TEST').id;g.startFreshGame(false);g.monsters=[];g.currentQuest=null;g.restTimer=0;
const site=id=>HEADQUARTERS_FACILITIES.find(p=>p.id===id),walk=id=>Object.assign(g.player,{x:site(id).x,y:site(id).y+22});
// The full building silhouette is interactive on every side, including the tavern.
for(const p of HEADQUARTERS_FACILITIES){
  for(const [x,y]of [[p.x-p.w/2-20,p.y-p.h/2],[p.x+p.w/2+20,p.y-p.h/2],[p.x,p.y-p.h-50],[p.x,p.y+22]]){
    Object.assign(g.player,{x,y});assert.equal(nearHeadquartersFacility(g)?.id,p.id,'four-side contact');
  }
}
for(const [x,y]of [[FIELD_TAVERN.x-195,FIELD_TAVERN.y-70],[FIELD_TAVERN.x+195,FIELD_TAVERN.y-70],[FIELD_TAVERN.x,FIELD_TAVERN.y-230],[FIELD_TAVERN.x,FIELD_TAVERN.y+22]]){Object.assign(g.player,{x,y});assert.equal(nearFieldTavern(g),true);}
Object.assign(g.player,{x:79360,y:79360});assert.equal(nearHeadquartersFacility(g),null);assert.equal(g.acceptGuildContract('slime'),false);
walk('guild');assert.equal(g.nation.level,0);assert.equal(g.openHeadquartersFacility('guild'),true);assert.equal(document.querySelector('.facility-note'),null);assert.ok(guildBoard(g).length>=12);
g.closeHeadquartersFacility();g.restTimer=5;assert.equal(g.openHeadquartersFacility('guild'),true,'facilities remain reachable during the field rest');const restBefore=g.restTimer;g.update(.1);assert.equal(g.restTimer,restBefore,'rest pauses while the building is open');g.restTimer=0;
for(const id of ['sweep','slime','goblin','boss','dungeon-boss','goblin-king'])assert.equal(g.acceptGuildContract(id),true);
assert.equal(g.nation.guild.active.length,6);assert.equal(g.acceptGuildContract('slime'),false);assert.equal(g.acceptGuildContract('colossal'),false,'advanced jobs follow settlement growth');
const active=id=>g.nation.guild.active.find(q=>q.id===id);
g.onNationKill({type:'goblin'});assert.equal(active('slime').progress,0);assert.equal(active('goblin').progress,1);assert.equal(active('sweep').progress,1);
const same={type:'slime'};g.onNationKill(same);g.onNationKill(same);assert.equal(active('slime').progress,1,'one kill is not counted twice');
g.onNationKill({type:'slime',retreated:true});assert.equal(active('slime').progress,1,'retreats never count');
const snapshots=structuredClone(g.nation.guild.active);g.nation.investment=180000;g.nation=normalizeNation(g.nation);assert.deepEqual(g.nation.guild.active,snapshots,'growth does not change accepted targets or rewards');
const afterGrowth=guildBoard(g).find(q=>q.id==='wolf'),low=guildQuote(GUILD_CONTRACTS.find(q=>q.id==='wolf'),0);assert.ok(afterGrowth.target>low.target&&afterGrowth.reward>low.reward);assert.equal(guildBoard(g).length,GUILD_CONTRACTS.length);
const saved=structuredClone(g.saveGame());g.resumeSavedGame(saved);assert.deepEqual(g.nation.guild.active,snapshots);walk('guild');g.openHeadquartersFacility('guild');
assert.equal(g.acceptGuildContract('colossal'),true);g.onNationKill({type:'orc',isDungeonBoss:true,isBoss:false,isElite:true});assert.equal(active('dungeon-boss').progress,0,'a ruin guardian is an elite, not a boss');
const boss={id:'guild-boss',type:'goblin_king',isBoss:true,isDungeonBoss:true,isColossal:true,hp:0,maxHp:10,x:g.player.x,y:g.player.y,lootDistance:0};g.monsters=[boss];g.killMonster(boss,g.player,true);
assert.equal(active('colossal').progress,0,'dungeon bosses share the large-drawing flag but are not outdoor colossal beasts');g.onNationKill({type:'colossal_dragon',isBoss:true,isColossal:true});assert.equal(active('colossal').progress,1);
assert.equal(active('boss').progress,1);assert.equal(active('dungeon-boss').progress,1);assert.equal(active('goblin-king').progress,1);assert.ok(g.battleLogHistory.some(e=>e.text.includes('依頼達成')));
const before=g.gold,reward=active('goblin-king').reward,treasury=g.treasury,otherIds=g.nation.guild.active.filter(q=>q.id!=='goblin-king').map(q=>q.id);assert.equal(g.claimGuildContract('goblin-king'),true);assert.equal(g.gold,before+reward);assert.equal(g.treasury,treasury);assert.deepEqual(g.nation.guild.active.map(q=>q.id),otherIds,'claiming one job retains every other accepted job');assert.equal(g.claimGuildContract('goblin-king'),false);assert.equal(g.acceptGuildContract('goblin-king'),false);
g.phase++;assert.equal(g.acceptGuildContract('goblin-king'),true,'repeatable contracts return next phase');
assert.equal(g.acceptGuildContract('demon-king'),true);assert.equal(active('demon-king').target,1,'the unique castle boss never needs multiple kills');g.onNationKill({type:'demon_king',isBoss:true,isDemonKing:true});assert.equal(g.claimGuildContract('demon-king'),true);g.phase++;assert.equal(g.acceptGuildContract('demon-king'),false,'the unique contract stays finished');
const remaining=g.nation.guild.active.length;assert.equal(g.abandonGuildContract('slime'),true);assert.equal(g.nation.guild.active.length,remaining-1);assert.equal(active('slime'),undefined);assert.equal(g.acceptGuildContract('slime'),true);assert.equal(active('slime').progress,0);
delete g.nation.guild.claimed['demon-king'];g.heroJourney.demonKingDefeat={by:'hero',phase:g.phase};assert.equal(g.acceptGuildContract('demon-king'),false,'an already defeated unique boss cannot be offered as an impossible job');
assert.deepEqual(normalizeGuild({active:[{id:'unknown'},{id:'slime',progress:Infinity},{id:'slime'}]}).active.map(q=>q.id),['slime']);
g.closeHeadquartersFacility();g.nation=normalizeNation();g.gold=50;walk('casino');assert.equal(g.openHeadquartersFacility('casino'),true);assert.equal(document.getElementById('btn-casino-poker').disabled,false);assert.equal(g.startCasinoPoker(),true);assert.equal(g.gold,40);const hand=g.nation.casino.poker;
g.nation.investment=180000;g.nation=normalizeNation(g.nation);assert.equal(g.nation.casino.bet,500);assert.equal(g.nation.casino.poker.bet,10,'settlement growth leaves the paid hand intact');assert.equal(g.drawCasinoPoker(),true);assert.equal(g.gold,40+g.nation.casino.poker.payout);assert.equal(g.drawCasinoPoker(),false);
assert.deepEqual([0,1,2,3,4,5].map(casinoBaseBet),[10,25,50,100,250,500]);assert.equal(validCasinoBet(MAX_CASINO_BET),true);assert.equal(g.setCasinoBet(499),false);assert.equal(g.setCasinoBet(1000000),true);
g.closeHeadquartersFacility();
console.log('PASS: level-zero guild/casino, 26 scalable simultaneous contracts, species/boss filtering, unique demon king, kill dedupe, snapshots/save/one reward, paid wager stability and four-side building contact');dom.window.close();
