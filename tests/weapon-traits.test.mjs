import assert from 'node:assert/strict';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {weaponCombatProfile,meleeSweetSpotFor,evaluateMeleeSweetSpot,compareEquipment} from '../js/games/iron-squad/equipment-rules.js?v=134';
import {attackAnimationRate} from '../js/games/iron-squad/weapon-motion.js?v=134';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WEAPON AXES TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();game.squad=[];game.restTimer=0;
const weapon=(id,traits)=>{const item={id,type:'WEAPON',tier:3,weaponStyle:'sword',name:id,baseName:id,rollMult:1,weaponTraits:traits,stats:{}};applyUpgradeStats(item,0);return item;};
const slow=weapon('short-slow',{length:.85,attackTempo:.85,swingSpeed:.85,sweep:.8,sweetWidth:.8,sweetPower:.85,sweetShift:0,crit:0});
const fast=weapon('long-fast',{length:1.2,attackTempo:1.15,swingSpeed:1.2,sweep:.8,sweetWidth:1.2,sweetPower:1.3,sweetShift:.03,crit:8});
const a=weaponCombatProfile(slow),b=weaponCombatProfile(fast);assert.ok(b.reach>a.reach);assert.ok(b.baseCooldown<a.baseCooldown);assert.ok(attackAnimationRate(fast)>attackAnimationRate(slow));assert.equal(fast.stats.crit,8);const crit=fast.stats.crit;applyUpgradeStats(fast,0);assert.equal(fast.stats.crit,crit);
const sweetA=meleeSweetSpotFor(slow),sweetB=meleeSweetSpotFor(fast);assert.ok(sweetB.sweetMax-sweetB.sweetMin>sweetA.sweetMax-sweetA.sweetMin);assert.ok(evaluateMeleeSweetSpot(fast,sweetB.peak*b.playerReach,b.playerReach).dmgMult>evaluateMeleeSweetSpot(slow,sweetA.peak*a.playerReach,a.playerReach).dmgMult);
const cmp=compareEquipment(fast,slow);for(const key of ['reach','attackWidth','swingSpeed','attackRate','sweetWidth','sweetPower','crit'])assert.ok(cmp.changes.some(c=>c.key===key),`comparison exposes ${key}`);
// Real manual attack: longer reach, tempo cooldown and limited cone collateral.
game.equipped.weapon=fast;game.recalcPlayerStats();Object.assign(game.player,{x:80000,y:80000,atkCooldown:0});game.monsters=[{id:'primary',x:80080,y:80000,hp:100000,maxHp:100000,radius:12,atk:1},{id:'inside',x:80100,y:80010,hp:100000,maxHp:100000,radius:12,atk:1},{id:'outside',x:80100,y:80060,hp:100000,maxHp:100000,radius:12,atk:1}];
const random=Math.random;try{Math.random=()=>.99;game.manualAttack();assert.ok(game.monsters[0].hp<100000);assert.ok(game.monsters[1].hp<100000);assert.equal(game.monsters[2].hp,100000);assert.ok(game.player.atkCooldown<.52/(game.player.atkSpeed||1));const dealt=100000-game.monsters[0].hp,secondary=100000-game.monsters[1].hp;assert.ok(secondary<dealt,'collateral has reduced damage');}finally{Math.random=random;}
game.saveGame();const saved=saveSlots.get(game.activeSlotId).data;assert.deepEqual(saved.equipped.weapon.weaponTraits,fast.weaponTraits);game.resumeSavedGame(structuredClone(saved));assert.deepEqual(game.equipped.weapon.weaponTraits,fast.weaponTraits);
console.log('PASS: individual length/tempo/swing/width/sweet/crit axes, no crit compounding, real manual reach/cooldown/cone damage, weapon comparisons and save/load');dom.window.close();
