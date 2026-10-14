import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {ensureMerchantCatalog,MERCHANT_CATALOG_SIZE,catalogPrice} from '../js/merchant-catalog.js';
import {canUseEquipment,requiredWeaponStrength} from '../js/weapon-requirements.js';
import {requiredDefenseStrength} from '../js/defense-equipment.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {drawFieldSoldier} from '../js/visuals.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('CASTER MARKET TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
function caster(cls){const p=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);p.innate.strength=3;const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:p});u.isPersonalGuard=true;u.gold=50;g.recalcSoldierStats(u);return u;}
const mage=caster('MAGE'),medic=caster('MEDIC');g.squad=[mage,medic];
const recipes=[{type:'WEAPON',weaponStyle:'staff'},{type:'WEAPON',weaponStyle:'wand'},...['arcane','healing','ward'].flatMap(armorStyle=>['HELMET','GLOVES'].map(type=>({type,armorStyle})))];
const weaponKinds=new Set(),armorKinds=new Set();let repeatedWeapons=0,repeatedArmor=0;
try{
  // All catalogs have independent 2/4 rolls; caster equipment remains implemented without guarantee slots.
  for(const techTier of [1,8,23,28])for(let phase=1;phase<=6;phase++)for(let i=0;i<12;i++){
    const state={phase,merchantCampSeed:731,nation:{armament:{techTier}},inventory:[],equipped:{},squad:[]},m={id:`caster-market-${i}`};
    assert.equal(ensureMerchantCatalog(state,m,generateRandomDrop),true);assert.equal(m.stock.length,MERCHANT_CATALOG_SIZE);assert.equal(m.stock.filter(i=>i.merchantFeatured).length,1);
    const weapons=m.stock.filter(i=>i.type==='WEAPON'),armor=m.stock.filter(i=>i.type!=='WEAPON');assert.equal(weapons.length,2);assert.equal(armor.length,4);assert.equal(m.stock.some(i=>i.merchantCasterSupply),false);assert.equal(new Set(m.stock.map(i=>i.id)).size,m.stock.length);weapons.forEach(i=>weaponKinds.add(i.weaponStyle));armor.forEach(i=>armorKinds.add(i.type));if(weapons[0].weaponStyle===weapons[1].weaponStyle)repeatedWeapons++;if(new Set(armor.map(i=>i.type)).size<4)repeatedArmor++;
    for(const recipe of recipes){const item=generateRandomDrop(0,'normal',{...recipe,tier:Math.min(24,techTier+1),merchant:true,random:()=>.5});assert.ok(item);assert.equal(item.tier,Math.min(24,techTier+1));assert.ok(canUseEquipment(mage,item)&&canUseEquipment(medic,item));
      if(item.type==='WEAPON'){assert.equal(requiredWeaponStrength(item),0);assert.ok(item.stats.magicAttack>0);assert.match(item.name,item.weaponStyle==='wand'?/ワンド/:/長杖/);}
      else{assert.equal(requiredDefenseStrength(item),1);assert.ok(item.stats.barrier>0&&item.stats.magicDefense>0);assert.match(item.name,item.type==='HELMET'?/頭巾/:/手袋/);if(item.armorStyle==='arcane')assert.ok(item.stats.magicBonus>0);if(item.armorStyle==='healing')assert.ok(item.stats.healBonus>0);}
    }
    const before=JSON.stringify(m.stock);assert.equal(ensureMerchantCatalog(state,m,generateRandomDrop),false);assert.equal(JSON.stringify(m.stock),before);
  }
  assert.equal(weaponKinds.size,9);assert.equal(armorKinds.size,6);assert.ok(repeatedWeapons>0&&repeatedArmor>0,'duplicate kinds remain possible');
  // Old live catalogs migrate once; old sold-out catalogs must stay sold out.
  g.nation.armament.techTier=8;for(const merchant of g.merchants)ensureMerchantCatalog(g,merchant,generateRandomDrop);
  const saved=structuredClone(g.saveGame({immediate:true})),entry=saved.merchants[0];entry.catalogVersion=3;const sold=entry.stock.shift();entry.featuredSoldPhase=saved.phase;
  const emptyEntry=saved.merchants[1];emptyEntry.catalogVersion=3;emptyEntry.stock=[];
  g.resumeSavedGame(saved);let m=g.merchants.find(u=>u.id===entry.id);
  assert.equal(m.stock.length,5);assert.equal(m.stock.some(i=>i.id===sold.id),false);assert.equal(m.stock.some(i=>i.merchantCasterSupply),false);assert.equal(m.stock.some(i=>i.merchantFeatured),false);assert.equal(m.catalogVersion,4);
  assert.equal(g.merchants.find(u=>u.id===emptyEntry.id).stock.length,0);
  const migrated=JSON.stringify(m.stock);g.saveGame({immediate:true});g.resumeSavedGame(structuredClone(g.saveGame({immediate:true})));m=g.merchants.find(u=>u.id===entry.id);assert.equal(JSON.stringify(m.stock),migrated,'reload cannot restock or reroll');
  // Explicit shop fixtures test caster purchase support, independently of random availability.
  m.stock=recipes.map((recipe,i)=>generateRandomDrop(0,'normal',{...recipe,tier:9,id:`purchase-fixture-${i}`,merchant:true,random:()=>.5}));m.catalogVersion=4;m.featuredSoldPhase=0;
  const restoredMage=g.squad.find(u=>u.id===mage.id),restoredMedic=g.squad.find(u=>u.id===medic.id);g.player.x=m.x;g.player.y=m.y;g.gold=1e7;g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]').click();
  const choose=u=>{const el=document.getElementById('merchant-recipient');el.value=u.id;el.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(document.querySelector('[data-shop-group="caster"]').getAttribute('aria-selected'),'true');};
  const purchased=[];
  for(const [unit,style] of [[restoredMage,'arcane'],[restoredMedic,'healing']]){
    choose(unit);const before=unit.soldierClass==='MAGE'?unit.magicAttack:unit.healPower,wallet=unit.gold;
    for(const type of ['HELMET','GLOVES']){const item=m.stock.find(i=>i.type===type&&i.armorStyle===style);const button=[...document.querySelectorAll('[data-buy]:not([data-inherit])')].find(b=>b.dataset.buyId===item.id);assert.ok(button&&!button.disabled);button.click();assert.equal(unit.equipped[type.toLowerCase()].id,item.id);purchased.push(item.id);}
    assert.ok((unit.soldierClass==='MAGE'?unit.magicAttack:unit.healPower)>before,'head/hand bonuses affect actual recalculated caster stats');assert.equal(unit.gold,wallet);
    const weapon=m.stock.find(i=>i.weaponStyle===(style==='arcane'?'wand':'staff'));[...document.querySelectorAll('[data-buy]:not([data-inherit])')].find(b=>b.dataset.buyId===weapon.id).click();assert.equal(unit.weapon.id,weapon.id);assert.ok(unit.magicAttack>0);purchased.push(weapon.id);
  }
  g._merchantShopClose();g.saveGame({immediate:true});g.resumeSavedGame(structuredClone(g.saveGame({immediate:true})));m=g.merchants.find(u=>u.id===entry.id);for(const id of purchased)assert.equal(m.stock.some(i=>i.id===id),false);
  m.stock=[];assert.equal(ensureMerchantCatalog(g,m,generateRandomDrop),false);assert.equal(m.stock.length,0,'sold-out supplies stay sold through reload/open');g.phase++;ensureMerchantCatalog(g,m,generateRandomDrop);assert.equal(m.stock.length,MERCHANT_CATALOG_SIZE);assert.equal(m.stock.some(i=>i.merchantCasterSupply),false);
  // Actual Canvas text matrices, including attack-facing and walking bob.
  const labelEvidence=[];
  for(const cls of ['MEDIC','MAGE'])for(const facingAngle of [0,Math.PI])for(const attackAngle of [0,Math.PI]){
    const unit=caster(cls);Object.assign(unit,{x:0,y:0,mana:cls==='MAGE'?0:8,magicRecovering:cls==='MAGE',facingAngle,attackAngle,atkAnim:.7,vx:1,vy:0});
    const canvas=createCanvas(320,320),c=canvas.getContext('2d'),original=c.fillText.bind(c),expected=cls==='MAGE'?'瞑想':'MP不足';let labelMatrix;
    c.translate(160,180);c.scale(2,2);const before=c.getTransform();c.fillText=function(text,...args){if(text===expected)labelMatrix=c.getTransform();return original(text,...args);};
    drawFieldSoldier(c,unit,137,{id:cls,name:cls,baseClassId:cls},'#88aabb',false);
    assert.ok(labelMatrix);assert.ok(labelMatrix.a>0&&labelMatrix.d>0,'caster text is readable in both body/attack directions');assert.equal(labelMatrix.b,0);assert.equal(labelMatrix.c,0);assert.deepEqual(c.getTransform(),before,'drawing leaves caller transform intact');labelEvidence.push({cls,facingAngle,attackAngle,text:expected,a:labelMatrix.a,d:labelMatrix.d});
  }
  console.log('PASS: implemented caster hood/gloves/staff/wand stats/requirements, 288 random 2/4 catalogs, all kinds/duplicates, deterministic stock, one-time legacy catalog migration/sold-out preservation, no repeat refill, actual caster tab/party purchases/stat bonuses/save, native Canvas MP/meditation text orientation');
  console.log(JSON.stringify({catalogs:288,repeatedWeapons,repeatedArmor,labelEvidence}));
}finally{g._merchantShopClose?.();dom.window.close();}
