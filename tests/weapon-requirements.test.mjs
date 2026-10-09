import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/games/iron-squad/unit-attributes.js';
import {canUseWeapon,requiredWeaponStrength} from '../js/games/iron-squad/weapon-requirements.js';
import {WEAPON_STYLES,emptyMastery,migrateWeaponStyleFromName} from '../js/games/iron-squad/growth-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WEAPON REQUIREMENTS TEST ONLY').id;game.startFreshGame(false);
const profile=rollAttributeProfile('MAGE','AVERAGE',()=>.5,true);
const ordinary=game.createNewSoldier(null,{classKey:'MAGE',talent:'AVERAGE',attributeProfile:profile});
const strongProfile=structuredClone(profile);strongProfile.innate.strength=80;strongProfile.innate.magic=1;
const strong=game.createNewSoldier(null,{classKey:'MAGE',talent:'AVERAGE',attributeProfile:strongProfile});
const weapon=(style,tier=1,id=style)=>generateRandomDrop(0,'normal',{type:'WEAPON',tier,weaponStyle:style,upgrade:0,quality:1,merchant:true,random:()=>.5,id});
assert.ok(WEAPON_STYLES.includes('staff')&&WEAPON_STYLES.includes('wand'));assert.equal(Object.keys(emptyMastery()).length,8);
assert.ok(['staff','wand'].includes(ordinary.weapon.weaponStyle));assert.equal(strong.weapon.weaponStyle,'hammer');
for(const style of ['staff','wand'])for(const tier of [1,14,28]){const item=weapon(style,tier);assert.ok(item.stats.magicAttack>item.stats.atk);assert.equal(requiredWeaponStrength(item),0);assert.equal(canUseWeapon(ordinary,item),true);assert.ok(item.name.includes(style==='staff'?'杖':'ワンド'));}
assert.equal(requiredWeaponStrength(weapon('sword')),18);assert.equal(requiredWeaponStrength(weapon('spear')),24);assert.equal(requiredWeaponStrength(weapon('hammer')),32);
assert.equal(canUseWeapon(ordinary,weapon('hammer')),false);assert.equal(canUseWeapon(strong,weapon('hammer')),true);assert.equal(canUseWeapon(strong,weapon('hammer',28)),false);
assert.equal(migrateWeaponStyleFromName({type:'WEAPON',weaponStyle:'sword',name:'樫の杖'}).weaponStyle,'staff');
game.squad=[ordinary,strong];game.reserves=[];game.inventory=[];game.sharedEquipBox=[];
const hammer=weapon('hammer',8,'shared-hammer'),wand=weapon('wand',8,'shared-wand');game.sharedEquipBox=[hammer,wand];game.processSharedEquipmentBox();
assert.equal(ordinary.equipped.weapon.id,'shared-wand');assert.equal(strong.equipped.weapon.id,'shared-hammer');
const forbidden=weapon('hammer',28,'too-heavy');game.inventory.push(forbidden);const held=ordinary.weapon.id;
assert.equal(game.giveItemToSoldier(ordinary.id,forbidden),false);assert.equal(ordinary.weapon.id,held);assert.ok(game.inventory.includes(forbidden));
// Forging/transfer cannot bypass requirements by passing a fake cheap item with the same id.
assert.equal(game.giveItemToSoldier(ordinary.id,{...forbidden,minStrength:0}),false);
assert.equal(game.equipItem(forbidden),false);assert.notEqual(game.equipped.weapon?.id,forbidden.id);
assert.equal(canUseWeapon(ordinary,game.createSupplyEquipment('WEAPON',ordinary,28)),true);
assert.ok(['staff','wand'].includes(game.createSupplyEquipment('WEAPON',ordinary,28).weaponStyle));
const usableSupply=game.createSupplyEquipment('WEAPON',strong,8);assert.equal(usableSupply.weaponStyle,'hammer');assert.equal(canUseWeapon(strong,usableSupply),true);
// An old unsupported weapon is kept intact in the box, rather than disappearing on load.
ordinary.equipped.weapon=forbidden;ordinary.weapon=forbidden;game.inventory=game.inventory.filter(i=>i.id!==forbidden.id);
const saved=structuredClone(game.saveGame());game.resumeSavedGame(saved);
const resumed=[...game.squad,...game.reserves].find(s=>s.id===ordinary.id);assert.equal(resumed.weapon,null);assert.ok(game.sharedEquipBox.some(i=>i.id===forbidden.id));
game.closeStrategyModal();game.destroy();dom.window.close();
console.log('PASS: real staff/wand magical stats, 8 masteries and name migration, melee strength/material requirements, muscle mage hammer, shared/treasury/manual/player/source-identity gates, retained unsupported legacy items');
