import {CRAFT_MATERIALS,CRAFT_RECIPES,craftRecipe,normalizeMaterials,addMaterials,workshopTier,workshopLevel,
  recipeMaterials,canAffordMaterials,stampCraftedItem,craftExclusiveLabel} from './crafting-rules.js?v=306';
import {standardEquipmentCost} from './armament-rules.js?v=306';
import {tierDescription,tierNumber} from './equipment-tiers.js?v=231';
import {equipmentName,compareEquipment} from './equipment-rules.js?v=306';
import {equipmentRequirementText} from './weapon-requirements.js?v=338';
import {atFacility} from './hq-facilities.js?v=322';
import {sound} from '../../common/js/audio.js?v=151';

export const WORKSHOP_STOCK=CRAFT_RECIPES.map(recipe=>({...recipe,name:recipe.armorStyle?recipe.name:recipe.type==='WEAPON'?{
  sword:'剣',spear:'槍',hammer:'ハンマー',axe:'斧',bow:'弓',crossbow:'クロスボウ',cannon:'火砲',staff:'長杖',wand:'ワンド'
}[recipe.weaponStyle]:{SHIELD:'盾',HELMET:'兜',ARMOR:'鎧',GLOVES:'籠手',LEGS:'脚具',AMULET:'装飾'}[recipe.type]}));
const money=n=>`${Math.max(0,n||0).toLocaleString()}G`;
const atWorkshop=game=>atFacility(game,'smith',1);
const slots={WEAPON:'weapon',SHIELD:'shield',HELMET:'helmet',ARMOR:'armor',GLOVES:'gloves',LEGS:'legs',AMULET:'amulet'};
export function workshopPreview(game,recipe,tier,crafted=false) {
  const item=game.makeWorkshopItem(recipe,tier,{preview:true});
  if(crafted){stampCraftedItem(item,recipe);game.applyEquipmentUpgrade(item,0);}
  return item;
}
function comparison(game,item) {
  const current=game.equipped?.[slots[item.type]];
  // v7.0.24: judged on real totals when possible (no cache: craft previews are rebuilt each time); a new item cannot inherit +levels here.
  const info=game.equipmentComparisonFor?.(game.player,item,current,{title:'今の装備とくらべる',cache:false});
  const cmp=info?.primary||compareEquipment(item,current);
  const card=info?.html||`<div class="equipment-comparison ${cmp.kind}"><div class="equip-cmp-head">今の装備とくらべる：<strong>${cmp.label}</strong></div><small>現在：${current?equipmentName(current):'未装備'}</small>${cmp.html}</div>`;
  return `${card}<p class="weapon-requirement">${equipmentRequirementText(game.player,item)}</p>`;
}
// v6.3.0: x10 (was x1.4 bought / x3 crafted), in line with merchant prices.
export const WORKSHOP_PRICE_MULT={bought:14,crafted:30};
export const workshopPrice=(tier,crafted=false)=>Math.ceil(standardEquipmentCost({tier})*(crafted?WORKSHOP_PRICE_MULT.crafted:WORKSHOP_PRICE_MULT.bought));
function quote(game,id,tier,crafted) {
  const recipe=craftRecipe(id);if(!recipe)return null;
  const t=Number(tier);
  if(!Number.isInteger(t)||t<1||t>workshopTier(game))return null;
  return {recipe,tier:t,cost:workshopPrice(t,crafted),materials:crafted?recipeMaterials(recipe,t):{}};
}
function showWorkshopReceipt(game,title,message) {
  const host=game.container?.querySelector('#hq-facility-dialog[data-facility="smith"]')||game.container?.querySelector('#strategy-modal:not(.hidden) .strategy-panel');
  if(!host)return;
  const previous=game._workshopReceipt;if(previous){clearTimeout(previous._expiry);previous.remove();}
  const notice=document.createElement('section');notice.className='workshop-receipt';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const text=document.createElement('div'),heading=document.createElement('strong'),detail=document.createElement('p'),close=document.createElement('button');
  heading.textContent=title;detail.textContent=message;text.append(heading,detail);
  close.type='button';close.textContent='×';close.setAttribute('aria-label','購入・製作通知を閉じる');
  const dismiss=()=>{clearTimeout(notice._expiry);notice.remove();if(game._workshopReceipt===notice)game._workshopReceipt=null;};
  close.onclick=dismiss;notice.append(text,close);host.append(notice);game._workshopReceipt=notice;
  notice._expiry=setTimeout(dismiss,8000);notice._expiry?.unref?.();
}
function finish(game,item,message,title='購入完了') {
  (game.inventory||=[]).push(item);game.showToast?.(message);
  if(game.savePurchase)game.savePurchase();else game.saveGame?.({background:true});game.updateStatsUI?.(true);game.renderStrategyUI?.();
  sound.playItem();showWorkshopReceipt(game,title,message);
  return item;
}
export const workshopMethods={
  collectCraftMaterials(item) {
    const received=addMaterials(this,item?.materials);if(!received)return false;
    // Frequent field pickup uses the existing ten-second autosave. Treasure and
    // expedition callers already save their whole reward transaction once.
    this.showToast?.(`素材入手：${received}`);return true;
  },
  buyWorkshopEquipment(id,tier) {
    const q=quote(this,id,tier,false);
    if(!atWorkshop(this)||!q||(this.gold||0)<q.cost)return false;
    const item=this.makeWorkshopItem(q.recipe,q.tier);
    item.workshopSupply=true;item.qualityLabel='工房の制式品';
    this.gold-=q.cost;
    return finish(this,item,`[T${item.tier}] ${equipmentName(item)}をバッグへ追加しました（−${money(q.cost)}）`);
  },
  craftWorkshopEquipment(id,tier) {
    const q=quote(this,id,tier,true);
    if(!atWorkshop(this)||!q||(this.gold||0)<q.cost||!canAffordMaterials(this.materials,q.materials))return false;
    // Construct the result before spending anything. One click makes one actual item.
    const item=stampCraftedItem(this.makeWorkshopItem(q.recipe,q.tier),q.recipe);
    this.applyEquipmentUpgrade(item,0);
    this.materials=normalizeMaterials(this.materials);
    for(const [key,n] of Object.entries(q.materials))this.materials[key]-=n;
    this.gold-=q.cost;
    return finish(this,item,`[T${item.tier}] ${equipmentName(item)}をバッグへ追加しました（−${money(q.cost)}）。保護付き・${craftExclusiveLabel(item)}`,'製作完了');
  },
  renderWorkshop(panel) {
    const maximum=workshopTier(this),level=workshopLevel(this),town=atWorkshop(this);
    this.materials=normalizeMaterials(this.materials);
    const selectedTier=Math.min(maximum,tierNumber(this.workshopSelectedTier||this.equipped?.weapon?.tier||1));
    this.workshopSelectedTier=selectedTier;
    const supplyId=craftRecipe(this.workshopSupplyId)?.id||'weapon-sword',craftId=craftRecipe(this.workshopCraftId)?.id||'weapon-sword';
    const makeOptions=(recipes,id)=>recipes.map(r=>`<option value="${r.id}" ${r.id===id?'selected':''}>${r.name}</option>`).join('');
    const cq=quote(this,craftId,selectedTier,true),sq=quote(this,supplyId,selectedTier,false),stock=this.materials;
    const supply=workshopPreview(this,sq.recipe,selectedTier),crafted=workshopPreview(this,cq.recipe,selectedTier,true);
    const reason=q=>!town?(this.nation?.level<1?'本陣発展Lv1で利用できます':'鍛冶工房で利用できます'):(this.gold||0)<q.cost?`あと${money(q.cost-(this.gold||0))}必要です`:!canAffordMaterials(stock,q.materials)?'必要な素材が足りません':'';
    const buyReason=reason(sq),craftReason=reason(cq);
    panel.insertAdjacentHTML('beforeend',`<div class="town-facility workshop-panel"><strong>鍛冶工房 · Lv${level}</strong>
      <p>製造可能ティア：${tierDescription(maximum)}<br>購入には各自のGが必要です。</p>
      <p>重装には筋力が必要です。魔導・治癒・結界の防具は低筋力で使えます。物理防御は低め。バリアは被ダメージの50%を吸収し、被弾が8秒止まると再生します。</p>
      <label class="workshop-choice">製造ティア<select id="workshop-tier">${Array.from({length:maximum},(_,i)=>`<option value="${i+1}" ${i+1===selectedTier?'selected':''}>${tierDescription(i+1)}</option>`).join('')}</select></label>
      <label class="workshop-choice">購入する品<select id="workshop-supply">${makeOptions(WORKSHOP_STOCK,supplyId)}</select></label>
      <div class="workshop-purchase-preview">${comparison(this,supply)}</div>
      <button type="button" id="btn-workshop-buy" ${buyReason?'disabled':''}>選んだ装備を購入 · ${money(sq.cost)}</button>
      ${buyReason?`<p class="workshop-unavailable" id="workshop-buy-reason">${buyReason}</p>`:''}
      <details class="material-stock" open><summary>持っている素材</summary><div class="material-grid">${Object.entries(CRAFT_MATERIALS).map(([id,m])=>`<span>${m.name}<b data-material="${id}">${stock[id].toLocaleString()}</b></span>`).join('')}</div></details>
      <label class="workshop-choice">製作する品<select id="workshop-craft">${makeOptions(CRAFT_RECIPES,craftId)}</select></label>
      <div class="workshop-craft-preview">${comparison(this,crafted)}</div>
      <p class="craft-bonus">${craftExclusiveLabel({craftOnly:true,type:cq.recipe.type})}</p>
      <ul class="recipe-materials">${Object.entries(cq.materials).map(([id,n])=>`<li class="${stock[id]>=n?'positive':'negative'}">${CRAFT_MATERIALS[id].name} · 所持${stock[id].toLocaleString()} / 必要${n}</li>`).join('')}</ul>
      <button type="button" id="btn-workshop-craft" ${craftReason?'disabled':''}>製作してバッグへ · ${money(cq.cost)}</button>
      ${craftReason?`<p class="workshop-unavailable" id="workshop-craft-reason">${craftReason}</p>`:''}</div>`);
    for(const [selector,key] of [['#workshop-tier','workshopSelectedTier'],['#workshop-supply','workshopSupplyId'],['#workshop-craft','workshopCraftId']]){
      panel.querySelector(selector).onchange=e=>{this[key]=key==='workshopSelectedTier'?Number(e.target.value):e.target.value;this.renderStrategyUI();};
    }
    panel.querySelector('#btn-workshop-buy').onclick=()=>this.buyWorkshopEquipment(supplyId,selectedTier);
    panel.querySelector('#btn-workshop-craft').onclick=()=>this.craftWorkshopEquipment(craftId,selectedTier);
  }
};
