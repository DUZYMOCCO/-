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
const buyMarkup=(kind)=>{
  fresh();const m=game.merchants[0];
  const old=generateRandomDrop(0,'normal',{tier:1,type:'WEAPON',weaponStyle:'sword',quality:1,upgrade:12,id:'old-sword',merchant:true});
  const next=generateRandomDrop(0,'normal',{tier:2,type:'WEAPON',weaponStyle:kind,quality:1,upgrade:0,id:'new-'+kind,merchant:true});
  game.equipped.weapon=old;game.inventory=[old];game.player.str=9999;game.recalcPlayerStats();game.gold=100000;
  next._merchantPrice=50;Object.assign(m,{stock:[next],catalogVersion:2,stockPhase:1,stockTier:2});
  game.player.x=m.x;game.player.y=m.y;game.openMerchantShop(m);
  return {m,old,next};
};
{
  const {old,next}=buyMarkup('sword');
  if(!game.player||!document.querySelector('.merchant-inherit-btn')){assert.ok(false,'same-family weapon must offer the inherit purchase');}
  const base=structuredClone(next.stats);
  document.querySelector('.merchant-inherit-btn').click();
  assert.equal(game.equipped.weapon.id,next.id);assert.equal(next.upgrade,12,'+X carried over');
  assert.equal(game.inventory.some(i=>i.id===old.id),false,'old weapon destroyed');
  assert.ok(game.inventory.some(i=>i.id===next.id));assert.ok(next.stats.atk>base.atk,'upgraded stats applied');
  game._merchantShopClose();
}
{
  const {old,next}=buyMarkup('sword');
  document.querySelector('.transfer-tap-btn[data-buy]:not(.merchant-inherit-btn)').click();
  assert.equal(next.upgrade,0,'plain purchase never inherits');assert.ok(game.inventory.some(i=>i.id===old.id));assert.equal(old.upgrade,12);
  game._merchantShopClose();
}
{
  buyMarkup('bow');
  assert.equal(document.querySelector('.merchant-inherit-btn'),null,'different family offers no inherit');
  game._merchantShopClose();
}
{ // Other slots: shield and armor inherit too; mismatched slot / lower +X offer nothing.
  const slotBuy=(type,eqUp,newUp)=>{
    fresh();const m=game.merchants[0];
    const old=generateRandomDrop(0,'normal',{tier:1,type,quality:1,upgrade:eqUp,id:'old-'+type,merchant:true});
    const next=generateRandomDrop(0,'normal',{tier:2,type,quality:1,upgrade:newUp,id:'new-'+type,merchant:true});
    game.equipped[old.type.toLowerCase()]=old;game.inventory=[old];game.player.str=9999;game.recalcPlayerStats();game.gold=100000;
    next._merchantPrice=50;Object.assign(m,{stock:[next],catalogVersion:2,stockPhase:1,stockTier:2});
    game.player.x=m.x;game.player.y=m.y;game.openMerchantShop(m);
    return {old,next};
  };
  for(const type of ['SHIELD','ARMOR']){
    const key=type.toLowerCase();
    const {old,next}=slotBuy(type,9,0);
    const btn=document.querySelector('.merchant-inherit-btn');
    assert.ok(btn,type+' must offer the inherit purchase');
    btn.click();
    assert.equal(game.equipped[key].id,next.id);assert.equal(next.upgrade,9,type+' +X carried over');
    assert.equal(game.inventory.some(i=>i.id===old.id),false,type+' old item destroyed');
    game._merchantShopClose();
    slotBuy(type,3,5);
    assert.equal(document.querySelector('.merchant-inherit-btn'),null,type+' lower equipped +X offers no inherit');
    game._merchantShopClose();
  }
  // Different slot: equipped armor must not make a shield inherit-eligible.
  fresh();const m=game.merchants[0];
  const arm=generateRandomDrop(0,'normal',{tier:1,type:'ARMOR',quality:1,upgrade:9,id:'eq-armor',merchant:true});
  const sh=generateRandomDrop(0,'normal',{tier:2,type:'SHIELD',quality:1,upgrade:0,id:'st-shield',merchant:true});
  game.equipped.armor=arm;game.equipped.shield=null;game.inventory=[arm];game.recalcPlayerStats();game.gold=100000;
  sh._merchantPrice=50;Object.assign(m,{stock:[sh],catalogVersion:2,stockPhase:1,stockTier:2});
  game.player.x=m.x;game.player.y=m.y;game.openMerchantShop(m);
  assert.equal(document.querySelector('.merchant-inherit-btn'),null,'different slot offers no inherit');
  game._merchantShopClose();
}
{ // Bag [+X引継] still works.
  fresh();
  const cur=generateRandomDrop(0,'normal',{tier:1,type:'WEAPON',weaponStyle:'sword',quality:1,upgrade:7,id:'bag-cur',merchant:true});
  const bag=generateRandomDrop(0,'normal',{tier:2,type:'WEAPON',weaponStyle:'sword',quality:1,upgrade:0,id:'bag-new',merchant:true});
  game.equipped.weapon=cur;game.inventory=[cur,bag];game.player.str=9999;game.recalcPlayerStats();
  assert.equal(game.equipItem(bag,true),true);
  assert.equal(game.equipped.weapon.id,'bag-new');assert.equal(bag.upgrade,7);assert.equal(game.inventory.some(i=>i.id==='bag-cur'),false);
}
console.log('PASS: merchant weapon upgrade inheritance');
