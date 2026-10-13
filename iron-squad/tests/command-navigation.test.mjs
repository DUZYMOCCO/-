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
$('btn-fast-travel').focus();$('btn-fast-travel').click();assert.equal($('world-map-modal').dataset.mode,'travel');assert.equal(shown($('world-map-canvas')),false);assert.equal(shown($('fast-travel-list')),true);
assert.match($('fast-travel-list').textContent,/第1救護所/);assert.doesNotMatch($('fast-travel-list').textContent,/第2救護所/);assert.equal(g.inBattle,false);
$('btn-world-map-close').click();assert.equal(shown($('strategy-modal')),true);assert.equal(g.inBattle,false);assert.equal(document.activeElement,$('btn-fast-travel'));
$('btn-fast-travel').click();g.player.x+=1000;$('fast-travel-list').querySelector('button').click();assert.equal($('world-map-modal').classList.contains('hidden'),true);assert.equal($('strategy-modal').classList.contains('hidden'),true);assert.equal(g.inBattle,true);
g.openWorldMap();$('btn-world-map-close').click();assert.equal(g.inBattle,true,'map opened directly from the field returns to battle');
g.openStrategyModal(true);g.currentDungeon=g.dungeons[0];const position=[g.player.x,g.player.y];$('btn-fast-travel').click();assert.equal($('fast-travel-list').querySelectorAll('button').length,0);g.fastTravelTo(0,0,'test');assert.deepEqual([g.player.x,g.player.y],position);assert.equal(g.inBattle,false);$('btn-world-map-close').click();assert.equal(g.inBattle,false);
g.currentDungeon=null;const patient=g.squad[0];Object.assign(patient,{isDown:true,hp:0,carrierId:'player',x:g.player.x,y:g.player.y});$('btn-fast-travel').click();$('fast-travel-list').querySelector('button').click();assert.deepEqual([g.player.x,g.player.y],position);assert.ok(shown($('world-map-modal')));assert.equal(g.inBattle,false,'blocked transfer leaves the pause and destination screen intact');
assert.equal(new Set([...document.querySelectorAll('[id]')].map(n=>n.id)).size,document.querySelectorAll('[id]').length);
console.log('PASS: all 4 categories / 13 pages, real donation and both investment wallets, policy and selection redraws, traveler gates, back/Escape, direct fast travel, pause/focus, discovery, dungeon and carrying restrictions');
