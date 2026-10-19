import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {NATION_GROUPS} from '../js/command-navigation.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const sheet=document.createElement('style');sheet.textContent=readFileSync('iron-squad/css/iron-squad-interface.css','utf8')+'\n.hidden{display:none!important}';document.head.append(sheet);
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('COMMAND QA ONLY').id;g.startFreshGame(false);g.career.status='enlisted';g.gold=100000;g.treasury=100000;g.worldTerrain={drawOverview:noop};
const $=id=>document.getElementById(id),shown=node=>!!node&&!node.closest('.hidden');
g.openStrategyModal(true);$('tab-strat-nation').click();
assert.equal($('nation-home').children.length,4);assert.ok(shown($('nation-home')));
assert.equal(shown($('view-econ-invest')),false);assert.equal(window.getComputedStyle($('view-econ-invest')).display,'none');
assert.equal(shown($('nation-status')),false,'nation starts with categories, not the entire long report');
for(const [group,definition] of Object.entries(NATION_GROUPS)) {
  $(`nation-home`).querySelector(`[data-nation-group="${group}"]`).click();
  assert.equal(shown($('nation-home')),false);assert.equal($('nation-page-tabs').children.length,definition.pages.length);
  for(const [page,label] of definition.pages) {
    $('nation-page-tabs').querySelector(`[data-nation-page="${page}"]`).click();
    assert.equal($('strat-window-title').textContent,label);assert.equal($('nation-page-tabs').querySelector('[aria-pressed="true"]').dataset.nationPage,page);
    g.renderStrategyUI();assert.deepEqual(g._nationRoute,{group,page},'real action redraws retain the current page');
    for(const node of document.querySelectorAll('[data-nation-section],[data-economic-page]'))assert.equal(shown(node),(node.dataset.nationSection||node.dataset.economicPage)===page,'only selected content is visible');
  }
  $('btn-strat-window-back').click();assert.ok(shown($('nation-home')));assert.ok(!$('strategy-modal').classList.contains('hidden'));assert.equal(g.inBattle,false);
}
g._openNationPage('territory','technology');g._selectStratTab('overview');[...document.querySelectorAll('.command-shortcuts button')].find(b=>b.textContent==='国家').click();assert.ok(shown($('nation-home')),'the overview shortcut also starts at the categories');
// Real expenditure handlers still use the selected wallet and preserve their page.
g._openNationPage('finance','treasury');$('select-global-fund-amount').value='100';const goldBefore=g.gold;
$('btn-donate-treasury').click();assert.equal(g.gold,goldBefore-100);assert.deepEqual(g._nationRoute,{group:'finance',page:'treasury'});
g._openNationPage('territory','regions');$('economic-investment-amount').value=100;
const personalBefore=g.gold,treasuryBefore=g.treasury;
document.querySelector('[data-economic-page="regions"] [data-economic-source="personal"]').click();
assert.equal(g.gold,personalBefore-100);assert.equal(g.treasury,treasuryBefore);assert.equal(g._nationRoute.page,'regions');
document.querySelector('[data-economic-page="regions"] [data-economic-source="treasury"]').click();
assert.equal(g.treasury,treasuryBefore-100);assert.equal(g.gold,personalBefore-100);
g._openNationPage('army','armament');const policy=document.querySelector('[data-armament-policy]:not([aria-pressed="true"])');const selected=policy.dataset.armamentPolicy;policy.click();assert.equal(g.nation.armament.policy,selected);assert.equal(g._nationRoute.page,'armament');
g._openNationPage('operations','expedition');const members=document.querySelector('.expedition-members');members.open=true;members.querySelector('input').click();assert.equal(document.querySelector('.expedition-members').open,true);
$('strategy-modal').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.ok(shown($('nation-home')),'Escape returns to the nation categories first');
$('strategy-modal').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal($('strategy-modal').classList.contains('strat-window-open'),false);
// Travelers may invest their own money, but national controls remain locked.
g.career.status='traveler';g.renderStrategyUI();g._openNationPage('territory','regions');
assert.equal(document.querySelector('[data-economic-page="regions"] [data-economic-source="treasury"]').disabled,true);
assert.equal(document.querySelector('[data-economic-page="regions"] [data-economic-source="personal"]').disabled,false);
g._openNationPage('army','armament');assert.ok([...document.querySelectorAll('[data-armament-policy]')].every(b=>b.disabled));
g._openNationPage('operations','expedition');document.querySelector('.btn-danger-tier:not(.active)').click();assert.ok([...document.querySelectorAll('.btn-expedition-send')].every(b=>b.disabled));
// Fast travel is one menu action; close returns to a paused menu, success to the field.
g.career.status='enlisted';g.openStrategyModal(true);g.medicalPosts[0].discovered=true;g.medicalPosts[1].discovered=false;
$('tab-strat-travel').click();assert.ok($('view-strat-travel').contains($('btn-fast-travel'))&&$('view-strat-travel').contains($('btn-world-map')),'v7.1.14: travel and map live in 地図・移動');$('btn-fast-travel').focus();$('btn-fast-travel').click();assert.equal($('world-map-modal').dataset.mode,'travel');assert.equal(shown($('world-map-canvas')),false);assert.equal(shown($('fast-travel-list')),true);
assert.match($('fast-travel-list').textContent,/第1救護所/);assert.doesNotMatch($('fast-travel-list').textContent,/第2救護所/);assert.equal(g.inBattle,false);
$('btn-world-map-close').click();assert.equal(shown($('strategy-modal')),true);assert.equal(g.inBattle,false);assert.equal(document.activeElement,$('btn-fast-travel'));
$('btn-fast-travel').click();g.player.x+=1000;$('fast-travel-list').querySelector('button').click();assert.equal($('world-map-modal').classList.contains('hidden'),true);assert.equal($('strategy-modal').classList.contains('hidden'),true);assert.equal(g.inBattle,true);
g.openWorldMap();$('btn-world-map-close').click();assert.equal(g.inBattle,true,'map opened directly from the field returns to battle');
// Regression: destination formation contains only the actual personal squad.
{
const realSquad=g.squad,realReserves=g.reserves;
const freshUnit=(id,personal=false)=>Object.assign(g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'}),{id,isPersonalGuard:personal,x:79360+350,y:79360+400});
const guardA=freshUnit('travel-guard-a',true),guardB=freshUnit('travel-guard-b',true),mainA=freshUnit('travel-main-a'),mainB=freshUnit('travel-main-b'),hero=freshUnit('travel-hero',true),deadGuard=freshUnit('travel-dead',true),reserve=freshUnit('travel-reserve',true);
hero.heroPartyId='independent-heroes';deadGuard.dead=true;
g.squad=[mainA,guardA,hero,mainB,guardB,deadGuard];g.reserves=[reserve];
const stationary=[mainA,mainB,hero,deadGuard,reserve],stationaryPositions=stationary.map(u=>[u.x,u.y]),resourceSnapshot=[guardA,guardB].map(u=>[u.hp,u.mana,u.ammo,JSON.stringify(u.equipped)]);
const target={x:86000,y:85000};g.fastTravelTo(target.x,target.y,'guard-only-test');
assert.deepEqual(stationary.map(u=>[u.x,u.y]),stationaryPositions,'main army, hero, dead guard and reserves do not move');
assert.ok(Math.hypot(guardA.x-target.x,guardA.y-target.y)<=60);assert.ok(Math.hypot(guardB.x-target.x,guardB.y-target.y)<=60);
assert.ok(Math.abs((guardA.x-target.x)/30+(guardB.x-target.x)/45)<1e-8,'two guards use two-person angles despite unrelated squad indices');
assert.ok(Math.abs((guardA.y-target.y)/30+(guardB.y-target.y)/45)<1e-8);
assert.deepEqual([guardA,guardB].map(u=>[u.hp,u.mana,u.ammo,JSON.stringify(u.equipped)]),resourceSnapshot,'travel does not alter resources or equipment');
g.career.status='traveler';g.fastTravelTo(87000,86000,'traveler-test');assert.ok(Math.hypot(guardA.x-87000,guardA.y-86000)<=60,'pre-enlistment companions still follow');assert.deepEqual(stationary.map(u=>[u.x,u.y]),stationaryPositions);
g.career.status='enlisted';g.fastTravelTo(79360,79360,'headquarters',{rescueWarp:true});assert.deepEqual(stationary.map(u=>[u.x,u.y]),stationaryPositions,'headquarters rescue warp also leaves the main army in place');
// A main-army casualty follows its personal carrier through the existing rope sync.
const {syncDragged}=await import('../js/casualty-rules.js');const patient=freshUnit('travel-patient');Object.assign(patient,{isDown:true,hp:0,carrierId:guardA.id});g.squad.push(patient);
const patientBefore=[patient.x,patient.y];g.fastTravelTo(86000,85000,'carrier-test');assert.deepEqual([patient.x,patient.y],patientBefore,'the travel loop does not move a carried main-army patient');syncDragged(g,1);assert.ok(Math.hypot(patient.x-guardA.x,patient.y-guardA.y)<=40);assert.equal(patient.hp,0);assert.equal(patient.carrierId,guardA.id);
// A personal casualty being carried by a stationary main soldier stays with that carrier.
delete patient.carrierId;const carriedGuard=freshUnit('travel-carried-guard',true);Object.assign(carriedGuard,{isDown:true,hp:0,carrierId:mainA.id});g.squad.push(carriedGuard);const carriedPosition=[carriedGuard.x,carriedGuard.y];g.fastTravelTo(88000,88000,'stationary-carrier-test');assert.deepEqual([carriedGuard.x,carriedGuard.y],carriedPosition);syncDragged(g,1);assert.ok(Math.hypot(carriedGuard.x-mainA.x,carriedGuard.y-mainA.y)<=40);assert.equal(carriedGuard.hp,0);assert.deepEqual(stationary.map(u=>[u.x,u.y]),stationaryPositions);
// The rescue exception still carries the commander's casualty without reviving it.
Object.assign(patient,{isDown:true,hp:0,carrierId:'player'});delete carriedGuard.carrierId;g.fastTravelTo(79360,79360,'rope-rescue-test',{rescueWarp:true});syncDragged(g,1);assert.ok(Math.hypot(patient.x-g.player.x,patient.y-g.player.y)<=40);assert.equal(patient.hp,0);assert.deepEqual(stationary.map(u=>[u.x,u.y]),stationaryPositions);
g.squad=realSquad;g.reserves=realReserves;
}
g.openStrategyModal(true);g.currentDungeon=g.dungeons[0];const position=[g.player.x,g.player.y];$('btn-fast-travel').click();assert.equal($('fast-travel-list').querySelectorAll('button').length,0);g.fastTravelTo(0,0,'test');assert.deepEqual([g.player.x,g.player.y],position);assert.equal(g.inBattle,false);$('btn-world-map-close').click();assert.equal(g.inBattle,false);
g.currentDungeon=null;const patient=g.squad[0];Object.assign(patient,{isDown:true,hp:0,carrierId:'player',x:g.player.x,y:g.player.y});$('btn-fast-travel').click();$('fast-travel-list').querySelector('button').click();assert.deepEqual([g.player.x,g.player.y],position);assert.ok(shown($('world-map-modal')));assert.equal(g.inBattle,false,'blocked transfer leaves the pause and destination screen intact');
assert.equal(new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size,document.querySelectorAll('[id]').length);
console.log('PASS: all 4 categories / 13 pages, real donation and both investment wallets, policy and selection redraws, traveler gates, back/Escape, direct fast travel, pause/focus, discovery, dungeon and carrying restrictions');
