// DOM integration (v7.0.26): comparison cards per unit type, and the "weak surplus" button in the sale menu. node iron-squad/tests/ui-v7026.test.mjs [jsdom dir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const require = createRequire(resolve(process.argv[2] || '__pycache__/ui-tools', 'entry.cjs'));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="game" class="game-container"></div>', { url: 'http://localhost/' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage });
globalThis.alert=()=>{};
const css = ['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(['style','game-ui'].includes(name)?`common/css/${name}.css`:`iron-squad/css/${name}.css`,'utf8')).join('\n');
const sheet = document.createElement('style'); sheet.textContent=css; document.head.append(sheet);
const noop = () => {};
const context = new Proxy({ measureText: () => ({width:40}), createLinearGradient: () => ({addColorStop:noop}), createRadialGradient: () => ({addColorStop:noop}) }, {get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext = () => context;
const { IronSquadGame, generateRandomDrop } = await import('../js/index.js');
const { saveSlots } = await import('../js/save-slots.js');
const { rollAttributeProfile } = await import('../js/unit-attributes.js');
const game = Object.create(IronSquadGame); game.container = document.getElementById('game');
game.startGameLoop=noop;game.showToast=noop;
Object.assign(game, { width:390, height:664, zoom:1, ctx:context, camera:{x:79360,y:79360}, selectedSaleIds:new Set(), commandActiveUntil:0 });
game.setupUI(); game.activeSlotId = saveSlots.create('UI TEST ONLY').id; game.startFreshGame(false);game.career.status='enlisted';game.closeStrategyModal();
game.monsters=[];game.reserves=[];game.sharedEquipBox=[];
const drop=(id,type,tier,upgrade=0,armorStyle=null)=>generateRandomDrop(0,'normal',{tier,type,armorStyle,quality:1,upgrade,id,merchant:true,random:()=>.5});
const unit=classKey=>{const u=game.createNewSoldier(null,{classKey,talent:'AVERAGE',attributeProfile:rollAttributeProfile(classKey,'AVERAGE',()=>.5,true)});u.attributeProfile=rollAttributeProfile(classKey,'AVERAGE',()=>.5,true);u._attributesNormalized=false;u.equipped={};u.weapon=null;game.recalcSoldierStats(u);u.hp=u.maxHp;return u;};
const archer=unit('ARCHER'),mage=unit('MAGE');game.squad=[archer,mage];

// ---- the card for an archer-type unit: barrier / magic bonus are shown dimmed and not judged ----
const plain=drop('plain-shield','SHIELD',3),ward=drop('ward-shield','SHIELD',3,0,'ward');
assert.ok(ward.stats.barrier>0,'the ward shield carries a barrier');
const forArcher=game.equipmentComparisonFor(archer,ward,plain,{title:'x'}),forMage=game.equipmentComparisonFor(mage,ward,plain,{title:'x'});
assert.ok(forArcher.primary.ineffectiveKeys.includes('barrier'));assert.ok(!forMage.primary.ineffectiveKeys.includes('barrier'));
assert.match(forArcher.html,/バリア[\s\S]*?\(効果なし\)/);assert.doesNotMatch(forMage.html,/\(効果なし\)[\s\S]*バリア|バリア[^<]*<\/strong>[\s\S]{0,80}\(効果なし\)/);
assert.doesNotMatch(forArcher.primary.reasonText,/バリア/);
const forCommander=game.equipmentComparisonFor(game.player,ward,plain,{title:'x'});
assert.ok(!forCommander.primary.ineffectiveKeys.includes('barrier'),'commander can use a barrier');
// inheritance path (bag +level carried over) judges the same way
const worn=drop('worn-shield','SHIELD',3,5);
const inherited=game.equipmentComparisonFor(archer,ward,worn,{inherit:true});
assert.ok(inherited.primary.ineffectiveKeys.includes('barrier')&&inherited.plain.ineffectiveKeys.includes('barrier'),'both the headline and the as-is line skip the barrier');

// ---- sale menu: 弱い余剰を選択 ----
game.equipped={weapon:null,shield:null,helmet:null,armor:null,gloves:null,legs:null,amulet:null};
const top=drop('top-armor','ARMOR',4),lowPlus=drop('low-armor-plus','ARMOR',1,2),lowPlain=drop('low-armor','ARMOR',1),otherSlot=drop('only-helmet','HELMET',1);
const unreachable=drop('unreachable-legs','LEGS',24),lowLegs=drop('low-legs','LEGS',9);
game.inventory=[top,lowPlus,lowPlain,otherSlot,unreachable,lowLegs];game.recalcPlayerStats();
game.saleMaxTier=16;game.openStrategyModal(true);
document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-equip').click();
const button=()=>[...document.querySelectorAll('#equipment-sale-toolbar button')].find(b=>b.textContent==='弱い余剰を選択');
assert.ok(button(),'button exists');
const tier=document.querySelector('#equipment-sale-toolbar select');tier.value='16';tier.onchange();
button().click();
const picked=[...game.selectedSaleIds].sort();
assert.deepEqual(picked,['low-armor','low-armor-plus'].sort(),'lower armour (including the +2 one) is selected; the only helmet is kept; legs behind an unreachable strength requirement are kept');
assert.match(document.querySelector('#equipment-sale-toolbar p').textContent,/強化済みも含む/);
console.log('ok ui v7.0.26');