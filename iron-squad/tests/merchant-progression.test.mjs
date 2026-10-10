import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {catalogTier,ensureMerchantCatalog,latestEquipmentTier,markMerchantPurchase} from '../js/merchant-catalog.js?v=139';
import {serializeMerchants,merchantBuyPrice} from '../js/merchant-rules.js?v=139';
import {fieldAdaptiveScaling} from '../js/field-scaling.js?v=139';
import {DROP_EXCLUSIVES,rollDropExclusive} from '../js/drop-exclusives.js?v=139';
import {isGodRollProtected,compareEquipment,distanceScaling} from '../js/equipment-rules.js?v=139';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats,rollItemQuality}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame),c=WORLD_SIZE/2;
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:c,y:c},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MERCHANT PROGRESSION TEST ONLY').id;game.startFreshGame(false);const initial=structuredClone(game.saveGame());
const fresh=()=>{game._merchantShopClose?.();game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.restTimer=0;game.currentQuest=null;};
// Rank comes from acquired gear rather than merchant position. T7 is never sold.
const near={id:'test-near',distance:1},far={id:'test-far',distance:90000};
game.inventory=[generateRandomDrop(0,'normal',{tier:4,type:'ARMOR',quality:1,id:'acquired-tier-four',upgrade:0,merchant:true})];assert.equal(catalogTier(game),2);game.nation.armament.techTier=4;assert.equal(catalogTier(game),5);
for(const m of [near,far]){ensureMerchantCatalog(game,m,generateRandomDrop);assert.equal(m.stockTier,5);assert.equal(m.stock.length,6);assert.ok(m.stock.every(i=>i.tier===5&&i.rollMult>=1.15&&!i.dropOnly&&!i.isGodRoll));assert.equal(m.stock.filter(i=>i.merchantFeatured).length,1);assert.ok(m.stock[0].rollMult>=1.35);assert.ok(m.stock[0].upgrade>=2);}
game.inventory=[];assert.equal(latestEquipmentTier(game),4,'selling the reference item does not regress the market');game.merchantEquipmentTier=28;game.nation.armament.techTier=28;
for(let phase=1;phase<=40;phase++){game.phase=phase;ensureMerchantCatalog(game,near,generateRandomDrop);assert.ok(near.stock.every(i=>i.tier===24&&!i.dropOnly),'market cap stays T24 even with T28 gear');}
// Stable per-wave goods, one featured purchase, sold-out persistence and next-wave renewal.
game.phase=40;const before=structuredClone(near.stock);assert.equal(ensureMerchantCatalog(game,near,generateRandomDrop),false);assert.deepEqual(near.stock,before);
const featured=near.stock[0];markMerchantPurchase(near,featured,40);near.stock.shift();assert.equal(ensureMerchantCatalog(game,near,generateRandomDrop),false);assert.equal(near.stock.some(i=>i.merchantFeatured),false);near.stock=[];assert.equal(ensureMerchantCatalog(game,near,generateRandomDrop),false);assert.equal(near.stock.length,0);game.phase=41;ensureMerchantCatalog(game,near,generateRandomDrop);assert.equal(near.stock.length,6);assert.equal(near.stock[0].merchantFeatured,true);assert.notEqual(near.stock[0].id,featured.id);
assert.notDeepEqual(near.stock.map(i=>[i.type,i.rollMult]),far.stock.map(i=>[i.type,i.rollMult]),'individual merchants have different featured goods');
// Merchant comparisons use the actual purchased item; plain buying does not inherit; shields now offer an explicit inherit option.
fresh();const m=game.merchants[0],current=generateRandomDrop(0,'normal',{tier:1,type:'SHIELD',quality:1,upgrade:20,id:'current-shield',merchant:true});game.equipped.shield=current;game.recalcPlayerStats();
const item=generateRandomDrop(0,'normal',{tier:2,type:'SHIELD',quality:1.2,upgrade:0,id:'buy-shield',merchant:true});Object.assign(item,{merchantFeatured:true,merchantQuality:'特選'});item._merchantPrice=merchantBuyPrice(item);m.stock=[item];m.catalogVersion=2;m.stockPhase=1;m.stockTier=2;game.gold=0;game.player.x=m.x;game.player.y=m.y;game.openMerchantShop(m);
const card=document.querySelector('.merchant-stock-card');assert.match(card.textContent,/一長一短/);assert.match(card.textContent,/引継後/);assert.match(card.textContent,/防御|HP/);assert.ok(card.querySelector('.stat-delta-down'));assert.equal(card.style.opacity,'');assert.equal(card.querySelector('[data-buy]').disabled,true);
game.gold=100000;game._merchantShopRefresh();const gold=game.gold,treasury=game.treasury,techBeforePurchase=game.nation.armament.techTier;document.querySelector('[data-buy]').click();assert.equal(game.nation.armament.techTier,techBeforePurchase,'a purchase alone cannot advance manufacturing');assert.equal(game.gold,gold-item._merchantPrice);assert.equal(game.treasury,treasury);assert.equal(item.upgrade,0);assert.equal(current.upgrade,20);assert.ok(game.inventory.some(i=>i.id===current.id));assert.ok(game.inventory.some(i=>i.id===item.id));assert.equal(game.sharedEquipBox.some(i=>i.id===item.id),false);assert.equal(m.featuredSoldPhase,1);assert.match(document.getElementById('merchant-shop-popup').textContent,/購入済み/);
game._merchantShopClose();game.openMerchantShop(m);assert.equal(m.stock.some(x=>x.merchantFeatured),false,'rank advancement cannot restock the featured item in the same wave');assert.ok(m.stock.every(x=>x.tier===2));m.stock=[];game.openMerchantShop(m);assert.equal(m.stock.length,0,'same-rank sold-out catalog stays empty');game._merchantShopClose();
game.saveGame();const saved=structuredClone(saveSlots.get(game.activeSlotId).data);game.resumeSavedGame(saved);const restored=game.merchants.find(x=>x.id===m.id);assert.equal(restored.stock.length,0);assert.equal(restored.featuredSoldPhase,1);assert.equal(game.merchantEquipmentTier,2);assert.deepEqual(serializeMerchants(game.merchants).find(x=>x.id===m.id).stock,[]);
game.completePhase();assert.ok(restored.stock.length===6);assert.ok(restored.stock[0].merchantFeatured);assert.equal(restored.stockTier,Math.min(24,game.nation.armament.techTier+1),'the refreshed market follows actual manufacturing, including legitimate funded research');
// A different weapon family must never advertise unperformed upgrade transfer.
fresh();
const weaponMerchant=game.merchants[0];
const oldWeapon=generateRandomDrop(0,'normal',{tier:1,type:'WEAPON',weaponStyle:'sword',quality:1,upgrade:12,id:'old-sword',merchant:true});
const boughtWeapon=generateRandomDrop(0,'normal',{tier:2,type:'WEAPON',weaponStyle:'bow',quality:1,upgrade:0,id:'bought-bow',merchant:true});
game.equipped.weapon=oldWeapon;game.inventory=[oldWeapon];game.recalcPlayerStats();game.gold=100000;
boughtWeapon._merchantPrice=52;Object.assign(weaponMerchant,{stock:[boughtWeapon],catalogVersion:2,stockPhase:1,stockTier:2});
game.openMerchantShop(weaponMerchant);
assert.notEqual(oldWeapon.weaponStyle,boughtWeapon.weaponStyle);
assert.doesNotMatch(document.querySelector('.merchant-stock-card').textContent,/引継後/);
const purchasedStats=structuredClone(boughtWeapon.stats);document.querySelector('[data-buy]').click();
assert.equal(game.equipped.weapon.id,boughtWeapon.id);assert.equal(boughtWeapon.upgrade,0);assert.deepEqual(boughtWeapon.stats,purchasedStats);assert.equal(oldWeapon.upgrade,12);assert.ok(game.inventory.some(i=>i.id===oldWeapon.id));
game._merchantShopClose();
// Drop quality spans poor→normal→good→excellent, with original exceptional god rolls retained.
const qualities=[];for(const r of [.1,.5,.9,.99,.001,.005]){const x={type:'ARMOR',tier:3,name:'鎧',baseName:'鎧',upgrade:0};let n=0;rollItemQuality(x,()=>n++===0?r:.5);qualities.push(x);}
assert.ok(qualities[0].rollMult<.9);assert.equal(qualities[0].qualityLabel,'粗悪');assert.ok(qualities[1].rollMult>=.88&&qualities[1].rollMult<=1.12);assert.ok(qualities[2].rollMult>1.12);assert.ok(qualities[3].rollMult>=1.3);assert.equal(qualities[4].forgeTag,'神鍛');assert.equal(qualities[5].forgeTag,'異質');
// Real generator emits exclusive gear and upgrading/inheriting never loses or compounds its unique stats.
for(const type of Object.keys(DROP_EXCLUSIVES)){
  let n=0;const x=generateRandomDrop(22000,'boss',{tier:3,type,upgrade:0,id:`exclusive-${type}`,random:()=>n++===0&&type!=='WEAPON'?.001:.5});
  if(type==='WEAPON')rollDropExclusive(x,'boss',()=>0);else assert.equal(x.dropOnly,true);
  x.dropOnly=true;x.dropOnlyKey=type;applyUpgradeStats(x,4);const stats=structuredClone(x.stats);applyUpgradeStats(x,4);assert.deepEqual(x.stats,stats);assert.ok(isGodRollProtected(x));
  const plain={...x,dropOnly:false,stats:{}};applyUpgradeStats(plain,4);assert.ok(compareEquipment(x,plain).changes.some(s=>s.delta>0));applyUpgradeStats(x,8);assert.equal(x.dropOnly,true);
}
const normalRoll=()=>.001;const actual=generateRandomDrop(8000,'boss',{tier:3,type:'ARMOR',upgrade:0,id:'actual-exclusive',random:normalRoll});assert.equal(actual.dropOnly,true);assert.match(actual.name,/古参の戦鎧/);
fresh();game.collectDrop(actual);assert.ok(game.inventory.some(i=>i.id===actual.id));game.saveGame();game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);assert.equal(game.inventory.find(i=>i.id===actual.id).dropOnly,true);
// Nearby encounters follow permanent nation/army/hero strength, with weaker extra scaling farther away and finite caps.
const weak={player:{maxHp:130,atk:25},squad:Array.from({length:20},()=>({maxHp:150,atk:25,def:20})),nation:{level:0}};
const strong={player:{maxHp:1200,atk:350,def:100},squad:Array.from({length:20},()=>({maxHp:1000,atk:200,def:100})),nation:{level:5}};
const close=fieldAdaptiveScaling(strong,800),middle=fieldAdaptiveScaling(strong,24000),edge=fieldAdaptiveScaling(strong,48000);assert.ok(close.hp>fieldAdaptiveScaling(weak,800).hp);assert.ok(close.atk>fieldAdaptiveScaling(weak,800).atk);assert.ok(close.hp>middle.hp);assert.ok(middle.hp>edge.hp);assert.equal(edge.hp,1);assert.equal(edge.atk,1);assert.ok(close.reward>1);
for(const key of ['player','squad','nation']){const one={...weak,[key]:strong[key]};assert.ok(fieldAdaptiveScaling(one,800).hp>fieldAdaptiveScaling(weak,800).hp,`${key} affects nearby encounters`);}
const down={...strong,squad:strong.squad.map(s=>({...s,hp:0,isDown:true}))};assert.equal(fieldAdaptiveScaling(down,800).hp,close.hp,'temporary wounds do not lower threat');const extreme={...strong,player:{maxHp:1e20,atk:1e20,def:1e20}};assert.ok(fieldAdaptiveScaling(extreme,0).hp<=8);assert.ok(fieldAdaptiveScaling(extreme,0).atk<=3);
// Actual spawn integration and reward payout use the snapshot, not a later mid-fight recalculation.
fresh();const random=Math.random;try{Math.random=()=>.5;game.nation.level=0;game.squad=weak.squad;Object.assign(game.player,weak.player);game.spawnMonster(c+800,c,{id:'ZONE_PEACE'});const first=game.monsters.pop();game.nation.level=5;game.squad=strong.squad;Object.assign(game.player,strong.player);game.spawnMonster(c+800,c,{id:'ZONE_PEACE'});const grown=game.monsters[0];assert.ok(grown.hp>first.hp);assert.ok(grown.atk>first.atk);assert.ok(grown.fieldAdaptive.reward>1);game.player.atk=1e9;game.player.maxHp=1e9;assert.equal(grown.hp,grown.maxHp);const money=game.gold;game.killMonster(grown,game.player,true);assert.equal(game.gold-money,Math.max(1,Math.round(8*distanceScaling(800,game.phase).gold*grown.fieldAdaptive.reward)));}finally{Math.random=random;}
console.log('PASS: technology-bound market/T24 cap/location independence, stable premium featured goods/wave renewal/purchase/save/no reroll, live weak/strong/inherit comparison and bag delivery, broad drop qualities/rare tags/exclusive generation/repeated upgrade/save, nation/army/hero field scaling/attenuation/caps/actual spawns/rewards');dom.window.close();
