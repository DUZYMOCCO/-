import {CRAFT_MATERIALS,CRAFT_RECIPES,craftRecipe,normalizeMaterials,addMaterials,workshopTier,workshopLevel,
  recipeMaterials,canAffordMaterials,stampCraftedItem,craftExclusiveLabel} from './crafting-rules.js?v=189';
import {standardEquipmentCost} from './armament-rules.js?v=189';
import {tierDescription,tierNumber} from './equipment-tiers.js';
import {equipmentName} from './equipment-rules.js?v=189';

export const WORKSHOP_STOCK=CRAFT_RECIPES.map(recipe=>({...recipe,name:recipe.type==='WEAPON'?{
  sword:'剣',spear:'槍',hammer:'ハンマー',axe:'斧',bow:'弓',crossbow:'クロスボウ',cannon:'火砲',staff:'長杖',wand:'ワンド'
}[recipe.weaponStyle]:{SHIELD:'盾',HELMET:'兜',ARMOR:'鎧',GLOVES:'籠手',LEGS:'脚具',AMULET:'装飾'}[recipe.type]}));
const money=n=>`${Math.max(0,n||0).toLocaleString()}G`;
const atWorkshop=game=>game.currentDungeon?.kind==='town'&&game.nation?.level>=1&&!game.player?.dead&&!game.player?.isDown;
export const workshopPrice=(tier,crafted=false)=>Math.ceil(standardEquipmentCost({tier})*(crafted?3:1.4));
function quote(game,id,tier,crafted) {
  const recipe=craftRecipe(id);if(!recipe)return null;
  const t=Number(tier);
  if(!Number.isInteger(t)||t<1||t>workshopTier(game))return null;
  return {recipe,tier:t,cost:workshopPrice(t,crafted),materials:crafted?recipeMaterials(recipe,t):{}};
}
function finish(game,item,message) {
  (game.inventory||=[]).push(item);game.showToast?.(message);
  game.saveGame?.();game.updateStatsUI?.(true);game.renderStrategyUI?.();
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
    return finish(this,item,`工房の供給：[T${item.tier}] ${equipmentName(item)}をバッグへ（${money(q.cost)}）`);
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
    return finish(this,item,`製作完了：[T${item.tier}] ${equipmentName(item)}をバッグへ。保護付き・${craftExclusiveLabel(item)}`);
  },
  renderWorkshop(panel) {
    const maximum=workshopTier(this),level=workshopLevel(this),town=atWorkshop(this);
    this.materials=normalizeMaterials(this.materials);
    const selectedTier=Math.min(maximum,tierNumber(this.workshopSelectedTier||maximum));
    this.workshopSelectedTier=selectedTier;
    const supplyId=craftRecipe(this.workshopSupplyId)?.id||'weapon-sword',craftId=craftRecipe(this.workshopCraftId)?.id||'weapon-sword';
    const makeOptions=(recipes,id)=>recipes.map(r=>`<option value="${r.id}" ${r.id===id?'selected':''}>${r.name}</option>`).join('');
    const cq=quote(this,craftId,selectedTier,true),stock=this.materials;
    panel.insertAdjacentHTML('beforeend',`<div class="town-facility workshop-panel"><strong>鍛冶工房 · Lv${level}</strong>
      <p>供給上限：${tierDescription(maximum)}<br>本陣の発展で素材帯が上がり、軍備研究でさらに改良します。軍への不足補給・換装にもこのティアを使用。</p>
      <label class="workshop-choice">製造ティア<select id="workshop-tier">${Array.from({length:maximum},(_,i)=>`<option value="${i+1}" ${i+1===selectedTier?'selected':''}>${tierDescription(i+1)}</option>`).join('')}</select></label>
      <h5>制式装備の供給</h5><p>必要な装備をGで購入。バッグへ届きます。</p>
      <label class="workshop-choice">装備<select id="workshop-supply">${makeOptions(WORKSHOP_STOCK,supplyId)}</select></label>
      <button type="button" id="btn-workshop-buy" ${!town||this.gold<workshopPrice(selectedTier)?'disabled':''}>装備を受け取る · ${money(workshopPrice(selectedTier))}</button>
      <details class="material-stock" open><summary>素材庫 · バッグの枠を使いません</summary><div class="material-grid">${Object.entries(CRAFT_MATERIALS).map(([id,m])=>`<span>${m.name}<b data-material="${id}">${stock[id].toLocaleString()}</b></span>`).join('')}</div></details>
      <h5>製作限定の装備</h5><p>敵・宝箱の素材から製作。品質120%と専用効果を持ち、完成品は保護してバッグへ届けます。</p>
      <label class="workshop-choice">製作する品<select id="workshop-craft">${makeOptions(CRAFT_RECIPES,craftId)}</select></label>
      <p class="craft-bonus">${craftExclusiveLabel({craftOnly:true,type:cq.recipe.type})}</p>
      <ul class="recipe-materials">${Object.entries(cq.materials).map(([id,n])=>`<li class="${stock[id]>=n?'positive':'negative'}">${CRAFT_MATERIALS[id].name} ${stock[id]} / ${n}</li>`).join('')}</ul>
      <button type="button" id="btn-workshop-craft" ${!town||this.gold<cq.cost||!canAffordMaterials(stock,cq.materials)?'disabled':''}>製作してバッグへ · ${money(cq.cost)}</button>
      ${town?'':'<p class="facility-note">本陣発展Lv1以上の町で供給・製作できます。</p>'}</div>`);
    for(const [selector,key] of [['#workshop-tier','workshopSelectedTier'],['#workshop-supply','workshopSupplyId'],['#workshop-craft','workshopCraftId']]){
      panel.querySelector(selector).onchange=e=>{this[key]=key==='workshopSelectedTier'?Number(e.target.value):e.target.value;this.renderStrategyUI();};
    }
    panel.querySelector('#btn-workshop-buy').onclick=()=>this.buyWorkshopEquipment(supplyId,selectedTier);
    panel.querySelector('#btn-workshop-craft').onclick=()=>this.craftWorkshopEquipment(craftId,selectedTier);
  }
};
