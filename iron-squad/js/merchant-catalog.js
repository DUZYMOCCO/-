import {observeEquipment} from './armament-rules.js?v=274';
import {MAX_EQUIPMENT_TIER,TRADE_MAX_TIER} from './equipment-tiers.js?v=231';
import {EQUIPMENT_TYPES,saleValue} from './equipment-rules.js?v=273';
import {WEAPON_STYLES} from './growth-rules.js?v=282';
export const MERCHANT_MAX_TIER=TRADE_MAX_TIER;
// v6.3.0: x10 (was 3.2) - gold piles up quickly, so shop gear must be a real goal.
export const CATALOG_PRICE_MULT=32;
export const catalogPrice=item=>Math.max(1,Math.floor(saleValue(item)*CATALOG_PRICE_MULT*Math.max(1,item.rollMult||1)*(item.merchantFeatured?1.15:1)));
export const MERCHANT_CATALOG_VERSION=4; // Independent random rolls: 2 weapons + 4 defensive items.
export const MERCHANT_WEAPON_SLOTS=2,MERCHANT_ARMOR_SLOTS=4;
export const MERCHANT_CATALOG_SIZE=MERCHANT_WEAPON_SLOTS+MERCHANT_ARMOR_SLOTS;
const ARMOR_TYPES=EQUIPMENT_TYPES.filter(type=>type!=='WEAPON');
export function recordMerchantEquipment(game,item) {
  if(EQUIPMENT_TYPES.includes(item?.type))observeEquipment(game,item);
  if(item&&EQUIPMENT_TYPES.includes(item.type)&&Number.isFinite(item.tier))game.merchantEquipmentTier=Math.max(game.merchantEquipmentTier||1,Math.min(MAX_EQUIPMENT_TIER,Math.floor(item.tier)));
}
export function latestEquipmentTier(game) {
  for(const item of [...(game.inventory||[]),...Object.values(game.equipped||{}),...(game.sharedEquipBox||[])])recordMerchantEquipment(game,item);
  for(const u of [...(game.squad||[]),...(game.reserves||[])])for(const item of Object.values(u.equipped||{}))recordMerchantEquipment(game,item);
  return Math.max(1,Math.min(MAX_EQUIPMENT_TIER,game.merchantEquipmentTier||1));
}
export const catalogTier=game=>{latestEquipmentTier(game);return Math.min(MERCHANT_MAX_TIER,(game.nation?.armament?.techTier||1)+1);};
const hash=value=>{let n=2166136261;for(const ch of String(value)){n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
function randomFor(seed) {let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function ensureMerchantCatalog(game,m,generate,force=false) {
  if(!m||m.dead)return false;
  const phase=game.phase||game.wave||1,tier=catalogTier(game);
  if(!force&&m.catalogVersion===MERCHANT_CATALOG_VERSION&&m.stockPhase===phase&&m.stockTier===tier&&Array.isArray(m.stock))return false;
  // Do not refill an old sold-out shop just because its catalog format changed.
  if(!force&&m.catalogVersion===3&&m.stockPhase===phase&&m.stockTier===tier&&Array.isArray(m.stock)&&m.stock.length===0){m.catalogVersion=MERCHANT_CATALOG_VERSION;return true;}
  const random=randomFor(hash(`${game.merchantCampSeed||0}:${m.id}:${phase}:${tier}`)),stock=[];
  for(let i=0;i<MERCHANT_CATALOG_SIZE;i++){
    const weapon=i<MERCHANT_WEAPON_SLOTS;
    const type=weapon?'WEAPON':ARMOR_TYPES[Math.floor(random()*ARMOR_TYPES.length)];
    const weaponStyle=weapon?WEAPON_STYLES[Math.floor(random()*WEAPON_STYLES.length)]:undefined;
    const featured=i===0;if(featured&&m.featuredSoldPhase===phase)continue;
    const quality=Math.round((featured?1.35+random()*.15:1.15+random()*.15)*1000)/1000;
    const upgrade=featured?2+Math.floor(random()*2):Math.floor(random()*2);
    const item=generate(0,'normal',{tier,type,weaponStyle,quality,upgrade,random,merchant:true,id:`market_v4_${m.id}_${phase}_t${tier}_${i}`});
    if(!item)continue;
    Object.assign(item,{merchantQuality:featured?'特選':'厳選',merchantFeatured:featured,merchantWave:phase,merchantOwner:m.id});
    item._merchantPrice=catalogPrice(item);stock.push(item);
  }
  m.stock=stock;m.stockPhase=phase;m.stockTier=tier;m.catalogVersion=MERCHANT_CATALOG_VERSION;m.stockRefreshIn=0;
  delete m.casterCatalogVersion;delete m.casterStockPhase;
  return true;
}
export function refreshWaveCatalogs(game,generate) {latestEquipmentTier(game);for(const m of game.merchants||[])ensureMerchantCatalog(game,m,generate);}
export const markMerchantPurchase=(m,item,phase)=>{if(item.merchantFeatured)m.featuredSoldPhase=phase;};
