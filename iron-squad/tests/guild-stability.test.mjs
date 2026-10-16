import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {GUILD_CONTRACTS,GUILD_REWARD_MIN,GUILD_HERO_LEVEL_CAP,guildQuote,guildBoard,guildHeroLevelFactor,normalizeGuild} from '../js/guild-contracts.js';
import {HEADQUARTERS_FACILITIES} from '../js/hq-facilities.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
// --- pure reward rules: level scaling, 250G floor, snapshot-compatible base formula ---
const sweep=GUILD_CONTRACTS.find(q=>q.id==='sweep');
for(const def of GUILD_CONTRACTS)for(let level=0;level<=5;level++)assert.equal(guildQuote(def,level).reward,Math.max(GUILD_REWARD_MIN,Math.round(def.baseReward*(1+level*.65))*20),'hero Lv1 keeps the existing quote');
assert.equal(GUILD_REWARD_MIN,250);assert.equal(guildHeroLevelFactor(1),1);assert.equal(guildHeroLevelFactor(21),2);
assert.equal(guildQuote(sweep,0,21).reward,Math.round(180*2)*20,'+5% per hero level above 1');
assert.ok(guildQuote(sweep,0,10).reward>guildQuote(sweep,0,9).reward&&guildQuote(sweep,0,2).reward>guildQuote(sweep,0,1).reward,'reward rises with hero level');
assert.equal(guildQuote(sweep,0,GUILD_HERO_LEVEL_CAP).reward,guildQuote(sweep,0,GUILD_HERO_LEVEL_CAP+500).reward,'hero scaling is capped');
assert.equal(guildQuote(sweep,0,0).reward,guildQuote(sweep,0,1).reward);assert.equal(guildQuote(sweep,0,NaN).reward,guildQuote(sweep,0,1).reward);
assert.equal(guildQuote({...sweep,baseReward:1},0,1).reward,250,'the 250G floor applies to tiny contracts');
for(const def of GUILD_CONTRACTS)for(let hero=1;hero<=60;hero+=7)assert.ok(guildQuote(def,0,hero).reward>=250);
// --- game board: stable under reopening, refreshing, save and resume ---
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set()});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('GUILD STABILITY TEST').id;g.startFreshGame(false);g.monsters=[];g.currentQuest=null;g.restTimer=0;
const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='guild'),walk=()=>Object.assign(g.player,{x:site.x,y:site.y+22});
walk();assert.equal(g.openHeadquartersFacility('guild'),true);
const html=()=>document.querySelector('.hq-facility-body').innerHTML,board=()=>JSON.stringify(guildBoard(g));
const firstHtml=html(),firstBoard=board();
for(let i=0;i<5;i++){g.refreshHeadquartersFacility();assert.equal(html(),firstHtml,'refreshing the open board never reshuffles it');assert.equal(board(),firstBoard);}
g.closeHeadquartersFacility();walk();g.openHeadquartersFacility('guild');assert.equal(html(),firstHtml,'closing and reopening shows the same board');assert.equal(board(),firstBoard);
const ids=guildBoard(g).map(q=>q.id);assert.deepEqual(ids,GUILD_CONTRACTS.filter(q=>q.minLevel<=0).map(q=>q.id),'board order follows the fixed catalogue');
assert.equal(new Set(ids).size,ids.length);assert.ok(ids.includes('band-near')&&ids.includes('band-wild')&&!ids.includes('band-edge'),'distance-band jobs unlock with settlement growth');
// filters keep working and are stable
for(const key of ['band','species','boss','all']){g.guildFilter=key;g.refreshHeadquartersFacility();const a=html();g.refreshHeadquartersFacility();assert.equal(html(),a);}
assert.ok(document.querySelector('[data-guild-filter="band"]'),'distance filter button exists');g.guildFilter='band';g.refreshHeadquartersFacility();assert.ok(document.querySelector('#guild-accept-band-near')&&!document.querySelector('#guild-accept-slime'));g.guildFilter='all';g.refreshHeadquartersFacility();
// --- distance-band counting ---
assert.equal(g.acceptGuildContract('band-near'),true);assert.equal(g.acceptGuildContract('band-wild'),true);assert.equal(g.acceptGuildContract('slime'),true);
const act=id=>g.nation.guild.active.find(q=>q.id===id);
g.onNationKill({type:'goblin',lootDistance:1000});assert.deepEqual([act('band-near').progress,act('band-wild').progress,act('slime').progress],[1,0,0]);
g.onNationKill({type:'slime',lootDistance:9000});assert.deepEqual([act('band-near').progress,act('band-wild').progress,act('slime').progress],[1,1,1]);
g.onNationKill({type:'wolf',lootDistance:30000});assert.deepEqual([act('band-near').progress,act('band-wild').progress],[1,1],'other bands are not counted');
g.onNationKill({type:'orc',x:79360+2000,y:79360});assert.equal(act('band-near').progress,2,'position decides when no loot distance is recorded');
g.onNationKill({type:'orc'});assert.equal(act('band-near').progress,2,'an unplaced enemy never counts toward a band');
g.onNationKill({type:'orc',lootDistance:500,retreated:true});assert.equal(act('band-near').progress,2);
const same={type:'orc',lootDistance:500};g.onNationKill(same);g.onNationKill(same);assert.equal(act('band-near').progress,3,'a kill counts once');
// --- accepted snapshots are frozen; unaccepted quotes follow the hero level ---
const snap=structuredClone(g.nation.guild.active),quoteBefore=guildBoard(g).find(q=>q.id==='wolf').reward;
g.player.level=25;assert.ok(guildBoard(g).find(q=>q.id==='wolf').reward>quoteBefore,'a higher hero level raises unaccepted rewards');
assert.deepEqual(g.nation.guild.active,snap,'a level-up never rewrites a job already taken');
const afterLevel=board();g.refreshHeadquartersFacility();assert.equal(board(),afterLevel);
const saved=structuredClone(g.saveGame({immediate:true}));g.resumeSavedGame(saved);assert.deepEqual(g.nation.guild.active,snap,'save and resume keep every accepted job');assert.equal(board(),afterLevel,'save and resume keep the same board');
assert.deepEqual(normalizeGuild(normalizeGuild(g.nation.guild)),normalizeGuild(g.nation.guild),'normalizing twice changes nothing');
// --- jobs only change when finished or abandoned ---
walk();g.openHeadquartersFacility('guild');const slimeReward=act('slime').reward;for(let i=0;i<act('slime').target;i++)g.onNationKill({type:'slime',lootDistance:100});
assert.equal(g.claimGuildContract('slime'),true);assert.equal(g.nation.guild.active.some(q=>q.id==='slime'),false);assert.ok(act('band-near')&&act('band-wild'),'other jobs stay');
assert.ok(slimeReward>=250);g.closeHeadquartersFacility();
console.log('PASS: hero-level reward scaling with 250G floor and cap, stable board across refresh/reopen/save/resume, frozen accepted snapshots, distance-band job counting and filter');dom.window.close();