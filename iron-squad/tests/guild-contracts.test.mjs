import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {GUILD_CONTRACTS,GUILD_ZONES,GUILD_STATE_VERSION,guildQuote,guildBoard,guildView,normalizeGuild} from '../js/guild-contracts.js';
import {normalizeNation} from '../js/nation-rules.js';
import {casinoBaseBet,MAX_CASINO_BET,validCasinoBet} from '../js/casino-rules.js';
import {HEADQUARTERS_FACILITIES,nearHeadquartersFacility} from '../js/hq-facilities.js';
import {FIELD_TAVERN,nearFieldTavern} from '../js/tavern.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
// jsdom has no layout: give every element a remembered scrollTop so redraw-restoration is observable.
Object.defineProperty(window.Element.prototype,'scrollTop',{configurable:true,get(){return this._scrollTop||0},set(v){this._scrollTop=v}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set()});
for(const def of GUILD_CONTRACTS)for(let level=0;level<=5;level++)assert.equal(guildQuote(def,level).reward,Math.round(def.baseReward*(1+level*.65))*20,'every contract and development level pays twenty times the old quote');
const oldGuild={version:1,active:[{id:'slime',level:0,target:6,reward:120,progress:4,acceptedPhase:2},{id:'goblin-king',level:0,target:1,reward:800,progress:1,acceptedPhase:2},{id:'slime',level:0,target:6,reward:120,progress:5,acceptedPhase:2},{id:'wolf',level:0,target:5,reward:220,progress:2,acceptedPhase:2},{id:'unknown',progress:3}],claimed:{wolf:1},totalCompleted:3};
const migratedGuild=normalizeGuild(oldGuild);assert.equal(migratedGuild.version,GUILD_STATE_VERSION);assert.equal(migratedGuild.version,3);assert.equal(migratedGuild.active,undefined,'accepted jobs no longer exist');
assert.equal(migratedGuild.progress.slime,5,'duplicate accepted jobs keep the larger count');assert.equal(migratedGuild.progress.wolf,2);assert.ok(migratedGuild.progress['goblin-king']>=1,'a finished unreported job stays finished');
assert.equal(migratedGuild.progress.unknown,undefined);assert.deepEqual(migratedGuild.claimed,{wolf:1});assert.equal(migratedGuild.totalCompleted,3);assert.deepEqual(normalizeGuild(migratedGuild),migratedGuild,'reloading a migrated save changes nothing');
const v2=normalizeGuild({version:2,active:[{id:'sweep',level:0,target:10,reward:3600,progress:10,acceptedPhase:1}],claimed:{},totalCompleted:0});
assert.ok(v2.progress.sweep>=guildQuote(GUILD_CONTRACTS.find(q=>q.id==='sweep'),5).target,'a finished unreported job stays finished at any settlement level');
assert.deepEqual(normalizeGuild(undefined).progress,{});assert.deepEqual(normalizeGuild({progress:{slime:Infinity,sweep:'7',bogus:4,wolf:-3}}).progress,{sweep:7});
for(const q of GUILD_CONTRACTS.filter(q=>GUILD_ZONES[q.kind]))assert.ok(GUILD_ZONES[q.kind].some(([key])=>key===q.zone),`${q.id} belongs to a ${q.kind} zone`);
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
Object.assign(g.player,{x:79360,y:79360});assert.equal(nearHeadquartersFacility(g),null);assert.equal(g.claimGuildContract('slime'),false);
walk('guild');assert.equal(g.nation.level,0);assert.equal(g.openHeadquartersFacility('guild'),true);assert.equal(document.querySelector('.facility-note'),null);assert.ok(guildBoard(g).length>=12);
g.closeHeadquartersFacility();g.restTimer=5;assert.equal(g.openHeadquartersFacility('guild'),true,'facilities remain reachable during the field rest');const restBefore=g.restTimer;g.update(.1);assert.equal(g.restTimer,restBefore,'rest pauses while the building is open');g.restTimer=0;
// --- standing board: no accept step, every kill is always counted ---
assert.equal(g.acceptGuildContract,undefined);assert.equal(g.abandonGuildContract,undefined);
const prog=id=>g.nation.guild.progress[id]||0,entryOf=id=>guildBoard(g).find(q=>q.id===id);
assert.equal(g.nation.guild.version,3);assert.deepEqual(g.nation.guild.progress,{});
assert.equal(document.querySelector('[data-guild-accept]'),null);assert.equal(document.querySelector('[data-guild-abandon]'),null);assert.equal(document.querySelector('[data-guild-claim]'),null,'nothing to report yet');
assert.equal(g.claimGuildContract('slime'),false,'nothing is reportable before the target');assert.equal(g.claimAllGuildContracts(),0);
g.onNationKill({type:'goblin'});assert.equal(prog('slime'),0);assert.equal(prog('goblin'),1);assert.equal(prog('sweep'),1,'counting never needed an accept');
const same={type:'slime'};g.onNationKill(same);g.onNationKill(same);assert.equal(prog('slime'),1,'one kill is not counted twice');
g.onNationKill({type:'slime',retreated:true});assert.equal(prog('slime'),1,'retreats never count');
g.onNationKill({type:'colossal_dragon',isBoss:true,isColossal:true});assert.equal(prog('colossal'),1,'jobs still locked by settlement level are counted already');assert.equal(entryOf('colossal'),undefined);
const progBefore=structuredClone(g.nation.guild.progress);g.nation.investment=180000;g.nation=normalizeNation(g.nation);assert.deepEqual(g.nation.guild.progress,progBefore,'growth never changes counted progress');
const afterGrowth=entryOf('wolf'),low=guildQuote(GUILD_CONTRACTS.find(q=>q.id==='wolf'),0);assert.ok(afterGrowth.target>low.target&&afterGrowth.reward>low.reward);assert.equal(guildBoard(g).length,GUILD_CONTRACTS.length);
const saved=structuredClone(g.saveGame({immediate:true}));g.resumeSavedGame(saved);assert.deepEqual(g.nation.guild.progress,progBefore,'save and resume keep the counts');walk('guild');g.openHeadquartersFacility('guild');
g.onNationKill({type:'orc',isDungeonBoss:true,isBoss:false,isElite:true});assert.ok(prog('dungeon-boss')>=1,'a unique ruin guardian is a place boss regardless of visual flag');
const boss={id:'guild-boss',type:'goblin_king',isBoss:true,isDungeonBoss:true,isColossal:true,hp:0,maxHp:10,x:g.player.x,y:g.player.y,lootDistance:0};g.monsters=[boss];const gkBefore=prog('goblin-king');g.killMonster(boss,g.player,true);
assert.equal(prog('colossal'),1,'dungeon bosses share the large-drawing flag but are not outdoor colossal beasts');assert.equal(prog('goblin-king'),gkBefore+1);g.onNationKill({type:'colossal_dragon',isBoss:true,isColossal:true});assert.equal(prog('colossal'),2);
// --- report: pays the current quote, restarts the count, one report per phase ---
const gk=entryOf('goblin-king');for(let i=prog('goblin-king');i<gk.target;i++)g.onNationKill({type:'goblin_king',isBoss:true});
assert.equal(entryOf('goblin-king').ready,true);assert.ok(g.battleLogHistory.some(e=>e.text.includes('依頼達成')),'finishing a job posts a notice');
const goldBefore=g.gold,treasury=g.treasury,doneBefore=g.nation.guild.totalCompleted;assert.equal(g.claimGuildContract('goblin-king'),true);assert.equal(g.gold,goldBefore+gk.reward);assert.equal(g.treasury,treasury);assert.equal(prog('goblin-king'),0,'a report restarts the count from zero');assert.equal(g.nation.guild.totalCompleted,doneBefore+1);
assert.equal(g.claimGuildContract('goblin-king'),false,'one report per phase');assert.equal(entryOf('goblin-king').claimed,true);assert.equal(entryOf('goblin-king').state,'done');
for(let i=0;i<gk.target+2;i++)g.onNationKill({type:'goblin_king',isBoss:true});assert.equal(prog('goblin-king'),0,'a job reported this phase waits for the next phase');assert.equal(g.claimGuildContract('goblin-king'),false);
g.phase++;assert.equal(entryOf('goblin-king').claimed,false,'repeatable jobs return next phase');for(let i=0;i<gk.target;i++)g.onNationKill({type:'goblin_king',isBoss:true});assert.equal(entryOf('goblin-king').ready,true);assert.equal(g.claimGuildContract('goblin-king'),true);assert.equal(g.nation.guild.totalCompleted,doneBefore+2);
// --- unique demon king: once in a lifetime ---
assert.equal(entryOf('demon-king').target,1,'the unique castle boss never needs multiple kills');g.onNationKill({type:'demon_king',isBoss:true,isDemonKing:true});assert.equal(g.claimGuildContract('demon-king'),true);
g.phase++;g.onNationKill({type:'demon_king',isBoss:true,isDemonKing:true});assert.equal(entryOf('demon-king').ready,false,'the unique contract stays finished');assert.equal(g.claimGuildContract('demon-king'),false);assert.equal(prog('demon-king'),0);
delete g.nation.guild.claimed['demon-king'];g.heroJourney.demonKingDefeat={by:'hero',phase:g.phase};assert.equal(entryOf('demon-king').unavailable,true,'an already defeated unique boss is never an open job');assert.equal(entryOf('demon-king').ready,false);assert.equal(g.claimGuildContract('demon-king'),false);
// --- batch report ---
for(const id of ['sweep','slime','goblin'])g.nation.guild.progress[id]=entryOf(id).target;
const view=guildView(g),readyNow=guildBoard(g).filter(q=>q.ready);assert.ok(readyNow.length>=3);assert.equal(view.readyCount,readyNow.length);assert.equal(view.readyReward,readyNow.reduce((s,q)=>s+q.reward,0));
const ranks=view.rows.map(r=>r.state==='ready'?0:r.state==='progress'?1:2);assert.deepEqual(ranks,[...ranks].sort((a,b)=>a-b),'reportable jobs first, reported ones last');
const inProgress=view.rows.filter(r=>r.state==='progress');assert.ok(inProgress.every((r,i)=>i===0||inProgress[i-1].ratio>=r.ratio),'then by progress');
g.refreshHeadquartersFacility();const claimAllButton=document.getElementById('guild-claim-all');assert.ok(claimAllButton&&claimAllButton.textContent.includes(`${readyNow.length}件`)&&claimAllButton.textContent.includes(view.readyReward.toLocaleString()));
assert.deepEqual([...document.querySelectorAll('[data-guild-row]')].map(e=>e.dataset.guildRow).slice(0,readyNow.length).sort(),readyNow.map(q=>q.id).sort(),'the reportable jobs head the list');
const goldAll=g.gold,doneAll=g.nation.guild.totalCompleted;claimAllButton.click();assert.equal(g.gold,goldAll+view.readyReward);assert.equal(g.nation.guild.totalCompleted,doneAll+readyNow.length);for(const q of readyNow)assert.equal(prog(q.id),0);assert.equal(guildView(g).readyCount,0);assert.equal(document.getElementById('guild-claim-all'),null);assert.equal(g.claimAllGuildContracts(),0);
assert.ok(document.querySelector('.guild-stats').textContent.includes('累計達成'));
// --- filters (kind x zone), hints, inner scroll ---
for(const kind of ['band','species','boss'])for(const [zone] of GUILD_ZONES[kind]){const v=guildView(g,kind,zone);assert.ok(v.rows.every(r=>r.kind===kind&&r.zone===zone));assert.ok(v.rows.length+v.locked.length>0,`${kind}/${zone} has jobs`);}
assert.equal(guildView(g,'band','bogus').zone,'all');assert.equal(guildView(g,'all','near').zone,'all');
const rowIds=()=>[...document.querySelectorAll('[data-guild-row]')].map(e=>e.dataset.guildRow);
g.guildFilter='species';g.guildZone='all';g.refreshHeadquartersFacility();document.querySelector('[data-guild-zone="ruin"]').click();assert.equal(g.guildZone,'ruin');assert.deepEqual(rowIds(),guildView(g,'species','ruin').rows.map(r=>r.id));
document.querySelector('[data-guild-filter="boss"]').click();assert.equal(g.guildFilter,'boss');assert.equal(g.guildZone,'all');assert.deepEqual(rowIds(),guildView(g,'boss','all').rows.map(r=>r.id));
document.querySelector('[data-guild-filter="all"]').click();assert.equal(document.querySelector('.guild-zones'),null);assert.equal(rowIds().length,GUILD_CONTRACTS.length);
const body=document.querySelector('.hq-facility-body');assert.ok(body.classList.contains('guild-mode'));assert.equal(document.querySelector('.guild-list').contains(document.querySelector('.guild-head')),false,'the header sits outside the scrolling list');assert.equal(document.querySelector('.facility-intro'),null);
assert.equal(document.querySelector('.guild-hint'),null);document.querySelector('[data-guild-toggle="sweep"]').click();assert.ok(document.querySelector('[data-guild-row="sweep"] .guild-hint'));document.querySelector('[data-guild-toggle="sweep"]').click();assert.equal(document.querySelector('.guild-hint'),null);
const list=document.querySelector('.guild-list');list.scrollTop=240;body.scrollTop=0;g.refreshHeadquartersFacility();const list2=document.querySelector('.guild-list');assert.notEqual(list2,list);assert.equal(list2.scrollTop,240,'a redraw keeps the inner list position');assert.equal(document.querySelector('.hq-facility-body').scrollTop,0);
document.querySelector('[data-guild-filter="band"]').click();assert.equal(document.querySelector('.guild-list').scrollTop,0,'changing the filter starts at the top');document.querySelector('[data-guild-filter="all"]').click();
const pick=guildBoard(g).find(q=>!q.claimed&&!q.unavailable);g.nation.guild.progress[pick.id]=pick.target;g.refreshHeadquartersFacility();document.querySelector('.guild-list').scrollTop=180;document.getElementById('guild-claim-'+pick.id).click();assert.equal(prog(pick.id),0);assert.equal(document.querySelector('.guild-list').scrollTop,180,'reporting does not jump the list');
// A real v2 save (accepted jobs) loads into the standing board with its counts.
assert.equal(normalizeNation({guild:oldGuild}).guild.progress.slime,5);g.nation.guild=structuredClone(oldGuild);const legacySave=structuredClone(g.saveGame({immediate:true}));g.resumeSavedGame(legacySave);assert.equal(g.nation.guild.version,3);assert.equal(g.nation.guild.progress.slime,5);assert.equal(g.nation.guild.totalCompleted,3);assert.deepEqual(g.nation.guild.claimed,{wolf:1});
g.closeHeadquartersFacility();g.nation=normalizeNation();g.gold=50;walk('casino');assert.equal(g.openHeadquartersFacility('casino'),true);assert.equal(document.querySelector('.hq-facility-body').classList.contains('guild-mode'),false,'other facilities keep their own layout');g.openCasinoPage('poker');assert.equal(document.getElementById('btn-casino-poker').disabled,false);assert.equal(g.startCasinoPoker(),true);assert.equal(g.gold,40);const hand=g.nation.casino.poker;
g.nation.investment=180000;g.nation=normalizeNation(g.nation);assert.equal(g.nation.casino.bet,500);assert.equal(g.nation.casino.poker.bet,10,'settlement growth leaves the paid hand intact');assert.equal(g.drawCasinoPoker(),true);assert.equal(g.gold,40+g.nation.casino.poker.payout);assert.equal(g.drawCasinoPoker(),false);await new Promise(r=>setTimeout(r,900));
assert.deepEqual([0,1,2,3,4,5].map(casinoBaseBet),[10,25,50,100,250,500]);assert.equal(validCasinoBet(MAX_CASINO_BET),true);assert.equal(g.setCasinoBet(499),false);assert.equal(g.setCasinoBet(1000000),false);assert.equal(g.setCasinoBet(MAX_CASINO_BET),true);
g.closeHeadquartersFacility();
console.log('PASS: level-zero guild/casino, standing bounties counted without accepting, report restarts the count, one report per phase, unique demon king, batch report, kind x zone filters, report-first ordering, inner scroll kept on redraw, v1/v2 save migration, kill dedupe, paid wager stability and four-side building contact');dom.window.close();
