import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {ammoCapacity} from '../js/supply-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop,applyUpgradeStats,SLOT_INFO}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),c=WORLD_SIZE/2;
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:c,y:c},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('MERCHANT SQUAD PURCHASE TEST ONLY').id;g.startFreshGame(false);const initial=structuredClone(g.saveGame());
let n=0;
function gear(type='WEAPON',style='sword',upgrade=0){return generateRandomDrop(0,'normal',{tier:2,type,weaponStyle:style,quality:1,upgrade,id:`squad-buy-${++n}`,merchant:true,random:()=>.5});}
function fresh(type='WEAPON',style='sword'){
  g._merchantShopClose?.();g.resumeSavedGame(structuredClone(initial));g.closeStrategyModal();g.monsters=[];g.restTimer=0;g.career.status='enlisted';
  const profile=rollAttributeProfile('HEAVY','AVERAGE',()=>.5,true);profile.innate.strength=150;
  const s=g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE',attributeProfile:profile});Object.assign(s,{isPersonalGuard:true,name:'購入先の兵士',gold:100000});g.squad=[s];g.reserves=[];
  const m=g.merchants[0],item=gear(type,style);item._merchantPrice=50;Object.assign(m,{stock:[item],catalogVersion:4,stockPhase:1,stockTier:2});g.player.x=m.x;g.player.y=m.y;g.gold=1000;g.treasury=5000;
  g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]').click();return {s,m,item};
}
function select(id){const el=document.getElementById('merchant-recipient');el.value=id;el.dispatchEvent(new window.Event('change',{bubbles:true}));}
const buy=()=>document.querySelector('[data-buy]:not([data-inherit])');
try{
  // Every equipment slot uses the recipient's comparison and is equipped atomically.
  for(const [type,info] of Object.entries(SLOT_INFO)){
    const {s,m,item}=fresh(type),old=gear(type,'sword',8),commander=g.equipped[info.key];s.equipped[info.key]=old;if(info.key==='weapon')s.weapon=old;g.recalcSoldierStats(s);
    const wallet=s.gold,treasury=g.treasury,ledger=structuredClone(g.phaseFiscal);select(s.id);
    assert.match(document.querySelector('.equip-cmp-head').textContent,/購入先の兵士の現装備比/);
    assert.equal(buy().disabled,false);buy().click();
    assert.equal(g.gold,950);assert.equal(s.gold,wallet,'soldier does not pay or auto-upgrade');assert.equal(g.treasury,treasury);assert.deepEqual(g.phaseFiscal,ledger,'no treasury/personal finance drift');
    assert.equal(s.equipped[info.key],item);if(info.key==='weapon')assert.equal(s.weapon,item);
    assert.equal(item.upgrade,0,'plain purchase does not silently inherit');assert.equal(g.equipped[info.key],commander,'commander equipment untouched');
    assert.equal(m.stock.length,0);assert.ok(g.inventory.some(i=>i.id===old.id));assert.equal(g.inventory.some(i=>i.id===item.id),false,'soldier ownership is unique');
    assert.equal(document.getElementById('merchant-recipient').value,s.id,'selection survives purchase');assert.equal(document.getElementById('merchant-shop-popup').classList.contains('hidden'),false);
    const saved=structuredClone(saveSlots.get(g.activeSlotId).data);g.resumeSavedGame(saved);const restored=g.squad.find(u=>u.id===s.id);assert.equal(restored.equipped[info.key].id,item.id);assert.equal(restored.gold,wallet);assert.equal(g.gold,950);
  }
  {const {s,m,item}=fresh('WEAPON','crossbow');select(s.id);buy().click();assert.equal(s.weapon.weaponStyle,'crossbow');assert.equal(s._ammoCapacity,ammoCapacity(s));assert.ok(s._ammoCapacity>=60);}
  // The dropdown is exactly the living own party, including overflow companions.
  {const {s}=fresh();const main=g.createNewSoldier(),overflow=g.createNewSoldier(),dead=g.createNewSoldier(),reserve=g.createNewSoldier();overflow.overflowGuard=true;dead.isPersonalGuard=true;dead.dead=true;reserve.isPersonalGuard=true;g.squad.push(main,overflow,dead);g.reserves=[reserve];g._merchantShopRefresh();
    assert.deepEqual([...document.getElementById('merchant-recipient').options].map(o=>o.value),['commander',s.id,overflow.id]);
    s.name='<img src=x onerror=alert(1)>';select(s.id);assert.equal(document.querySelector('.merchant-recipient-panel img'),null);assert.equal(document.querySelector('.equipment-comparison img'),null);assert.match(document.querySelector('.equip-cmp-head').textContent,/<img/);
  }
  // Requirements are checked against the recipient before any payment or removal.
  {const {s,m,item}=fresh('WEAPON','hammer');item.minStrength=999;select(s.id);assert.equal(buy().disabled,true);assert.match(document.querySelector('.weapon-requirement').textContent,/筋力不足/);buy().click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);}
  {const {s,m,item}=fresh('ARMOR');s.soldierClass=s.combatClass='MAGE';s.attributeProfile=rollAttributeProfile('MAGE','AVERAGE',()=>.5,true);s.attributeProfile.innate.strength=3;g.recalcSoldierStats(s);item.tier=7;applyUpgradeStats(item,0);select(s.id);assert.equal(buy().disabled,true,'heavy metal armor respects permanent caster strength');assert.match(document.querySelector('.weapon-requirement').textContent,/筋力不足/);buy().click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);}
  {const {s,m,item}=fresh();select(s.id);const stale=buy();item.minStrength=999;stale.click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);}
  for(const invalid of ['dead','left','removed']){
    const {s,m}=fresh();select(s.id);const stale=buy();if(invalid==='dead')s.dead=true;if(invalid==='left')s.isPersonalGuard=false;if(invalid==='removed')g.squad=[];
    stale.click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);assert.equal(buy().disabled,true,'missing recipient never falls back to commander');
  }
  {const {s,m}=fresh();select(s.id);g.gold=49;g._merchantShopRefresh();assert.equal(buy().disabled,true);buy().click();assert.equal(g.gold,49);assert.equal(m.stock.length,1);}
  {const {s,m}=fresh();select(s.id);const stale=buy();m.dead=true;stale.click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);}
  // Stale buttons cannot buy the next stock item or redirect to a new recipient.
  {const {s,m}=fresh(),next=gear();next._merchantPrice=50;m.stock.push(next);g._merchantShopRefresh();select(s.id);const stale=buy();stale.click();stale.click();assert.equal(g.gold,950);assert.equal(m.stock[0].id,next.id);}
  {const {s,m}=fresh();const stale=buy();select(s.id);stale.click();assert.equal(g.gold,1000);assert.equal(m.stock.length,1);}
  // Explicit inheritance remains optional and uses this soldier's current gear only.
  {const {s,m,item}=fresh(),old=gear('WEAPON','sword',9);s.equipped.weapon=old;s.weapon=old;g.recalcSoldierStats(s);select(s.id);const wallet=s.gold;document.querySelector('[data-inherit]').click();assert.equal(s.weapon,item);assert.equal(item.upgrade,9);assert.equal(s.gold,wallet);assert.equal(g.inventory.some(i=>i.id===old.id),false);assert.equal(m.stock.length,0);}
  {const {s}=fresh('WEAPON','bow');s.equipped.weapon=gear('WEAPON','sword',9);select(s.id);assert.equal(document.querySelector('[data-inherit]'),null);}
  {const {s,item}=fresh();s.isDown=true;s.hp=0;select(s.id);assert.match(document.getElementById('merchant-recipient').selectedOptions[0].textContent,/ダウン中/);buy().click();assert.equal(s.equipped.weapon,item);assert.equal(s.hp,0,'equipment purchase cannot revive');}
  // Save/load inside the shop retains the recipient and tab rather than closing.
  {const {s}=fresh('ARMOR');select(s.id);document.querySelector('.btn-close-merchant').click();document.querySelector('[data-merchant-section="save"]').click();document.querySelector('.transfer-popup-container').scrollTop=120;const checkpoint=document.querySelector('.merchant-checkpoint');checkpoint.querySelector('[data-supply="save"]').click();document.querySelector('[data-checkpoint-choice="overwrite"]').click();await new Promise(resolve=>window.setTimeout(resolve,460));g.gold=3;checkpoint.querySelector('[data-supply="load"]').click();document.querySelector('[data-checkpoint-choice="load"]').click();assert.equal(document.querySelector('#merchant-shop-popup').dataset.section,'save');assert.equal(document.querySelector('.transfer-popup-container').scrollTop,120);document.querySelector('.btn-close-merchant').click();document.querySelector('[data-merchant-section="trade"]').click();assert.equal(document.getElementById('merchant-recipient').value,s.id);buy().click();assert.equal(g.squad.find(u=>u.id===s.id).equipped.armor?.type,'ARMOR');assert.equal(g.gold,950);}
  console.log('PASS: own-party recipient menu, all seven slots, commander-funded atomic purchase, no soldier/treasury cost, no implicit inheritance/upgrade, old gear retention, strength guards, stale/dead/removed recipients and buttons, explicit inheritance, downed units, ammo cache, save/load/view continuity');
}finally{g._merchantShopClose?.();dom.window.close();}
