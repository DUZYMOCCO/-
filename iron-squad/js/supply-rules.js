import {attributeValues,ensureAttributeProfile,effectiveStrength} from './unit-attributes.js?v=298';
import {isMagicUser,ensureMana} from './magic-rules.js?v=296';
import {WORLD_SIZE} from './world.js?v=289';
import {inCurrentInstance} from './instance-rules.js?v=256';
import {saveSlots} from './save-slots.js?v=285';
import {requestCheckpointAction,checkpointNotice} from './checkpoint-ui.js?v=259';
import {addBattleReport} from './battle-report.js?v=302';
import {sound} from '../../common/js/audio.js?v=151';
import {nearestRevivalPotionTarget,reviveByPotion,REVIVAL_POTION_RANGE} from './casualty-rules.js?v=295';

export const AMMO_CAPACITY=30; // Legacy/default capacity for units without a ranged weapon.
export const AMMO_BASE_CAPACITY=Object.freeze({bow:120,crossbow:60,cannon:30});
export function recalcAmmoCapacity(unit){
  const held=(unit?.equipped?.weapon||unit?.weapon)?.weaponStyle;
  const style=AMMO_BASE_CAPACITY[held]?held:ARCHERS.has(unit?.soldierClass)?'bow':null;
  if(!unit)return AMMO_CAPACITY;
  let strength=0;
  if(style){
    if(!unit.attributeProfile&&Number.isFinite(unit.strength))strength=unit.strength-(unit._casterStrengthTimer>0?unit._casterStrengthBonus||0:0);
    else {ensureAttributeProfile(unit);strength=attributeValues({...unit,_casterStrengthTimer:0,_casterStrengthBonus:0}).strength;}
  }
  unit._ammoCapacity=style?AMMO_BASE_CAPACITY[style]+Math.floor(Math.max(0,effectiveStrength(strength)-30)/({bow:1,crossbow:2,cannon:4}[style])):AMMO_CAPACITY;
  unit._ammoCapacityVersion=1;unit._ammoStyle=held;unit._ammoClass=unit.soldierClass;unit._ammoLevel=unit.level;
  unit._ammoBuffStrength=unit._casterStrengthTimer>0?unit._casterStrengthBonus||0:0;unit._ammoStrength=unit.strength;unit._ammoInnate=unit.attributeProfile?.innate?.strength;unit._ammoPractice=unit.attributeProfile?.practice?.strength;
  return unit._ammoCapacity;
}
export function ammoCapacity(unit){
  if(!unit)return AMMO_CAPACITY;
  // Usually computed at the end of stat recalculation. These scalar guards also handle
  // lightweight actors and direct equipment/profile changes without per-frame allocation.
  if(unit._ammoCapacityVersion!==1||unit._ammoStyle!==(unit.equipped?.weapon||unit.weapon)?.weaponStyle||unit._ammoClass!==unit.soldierClass||unit._ammoLevel!==unit.level||unit._ammoStrength!==unit.strength||unit._ammoBuffStrength!==(unit._casterStrengthTimer>0?unit._casterStrengthBonus||0:0)||unit._ammoInnate!==unit.attributeProfile?.innate?.strength||unit._ammoPractice!==unit.attributeProfile?.practice?.strength)return recalcAmmoCapacity(unit);
  return unit._ammoCapacity;
}
export const SQUAD_POTION_COST=5000,SQUAD_POTION_MAX=3; // 携帯は3個まで。商人で1個ずつ、本陣では無料で満タン
export const REVIVAL_POTION_COST=30000,REVIVAL_POTION_MAX=2; // 携帯は2個まで、商人で1個ずつ補充
export const LETHAL_GUARD_COOLDOWN=120;
export const RANGED_DAMAGE_MULT=1.2;

const BASE={x:WORLD_SIZE/2,y:WORLD_SIZE/2,radius:150};
const ARCHERS=new Set(['ARCHER','SNIPER','STORM_BOW','STAR_HUNTER']);
const RANGED=new Set(['bow','crossbow','cannon']);
const usable=u=>u && !u.dead && !u.isDown && u.hp>0;
const near=(u,p,r)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&(u.x-p.x)**2+(u.y-p.y)**2<=r*r;
export function isRangedUnit(game,u) {
  if(u!==game.player&&isMagicUser(u))return false;
  const item=u===game.player?game.equipped?.weapon:(u?.equipped?.weapon||u?.weapon);
  return RANGED.has(item?.weaponStyle)||ARCHERS.has(u?.soldierClass);
}
export function ensureAmmo(u) {
  u.ammo=u.ammo==null?ammoCapacity(u):Math.max(0,Math.min(ammoCapacity(u),Math.floor(Number(u.ammo)||0)));
  return u.ammo;
}
export function squadUnits(game) {return [game.player,...(game.squad||[]),...(game.reserves||[])].filter(Boolean);}
export function personalSquadUnits(game) {
  return [game.player,...(game.squad||[]).filter(u=>u.isPersonalGuard&&(!game.currentDungeon||inCurrentInstance(game,u)))].filter(Boolean);
}
export function initializeSupplies(game,saved=null) {
  game.ammoReserve=Math.max(0,Math.floor(Number(saved?.ammoReserve)||0));
  game.squadPotion=saved?.squadPotion==null?1:Math.max(0,Math.min(SQUAD_POTION_MAX,Math.floor(Number(saved.squadPotion)||0)));
  game.revivalPotion=saved?.revivalPotion==null?(saved?0:1):Math.max(0,Math.min(REVIVAL_POTION_MAX,Math.floor(Number(saved.revivalPotion)||0)));
  game._supplyClock=0;
  for(const u of squadUnits(game))if(saved)ensureAmmo(u);else u.ammo=ammoCapacity(u);
  game.player.invulnerableTimer=Math.max(0,Math.min(2,Number(saved?.player?.invulnerableTimer)||0));
  game.player.lethalGuardCooldown=Math.max(0,Math.min(LETHAL_GUARD_COOLDOWN,Number(saved?.player?.lethalGuardCooldown??(game.player.invulnerableTimer>0?LETHAL_GUARD_COOLDOWN:0))||0));
  game.player.retreatWarningTimer=game.player.invulnerableTimer>0?6:0;
}
export function takeRangedShot(unit,damage) {
  const loaded=ensureAmmo(unit)>0;
  if(loaded)unit.ammo--;
  return {loaded,damage:loaded?Math.max(1,Math.round(damage*RANGED_DAMAGE_MULT)):0};
}
export function ammoCombatProfile(unit,profile) {
  if(!profile.ranged||ensureAmmo(unit)>0)return profile;
  return {...profile,sidearm:true,stone:false,reach:65,reachWarlord:65,baseCooldown:profile.style==='cannon'?1.4:.9,pierce:false,splash:0,knockback:0,knockbackWarlord:0,projType:null};
}
// Distribute one round per pass so the closest collector does not monopolize supplies.
export function distributeAmmo(game,amount=0) {
  game.ammoReserve=Math.max(0,Math.floor(Number(game.ammoReserve)||0))+Math.max(0,Math.floor(Number(amount)||0));
  const recipients=squadUnits(game).filter(u=>usable(u)&&isRangedUnit(game,u));
  let delivered=0;
  while(game.ammoReserve>0) {
    let changed=false;
    for(const u of recipients) {
      if(ensureAmmo(u)>=ammoCapacity(u))continue;
      u.ammo++;game.ammoReserve--;delivered++;changed=true;
      if(!game.ammoReserve)break;
    }
    if(!changed)break;
  }
  return delivered;
}
export function supplyLocation(game,u=game.player) {
  if(!u)return null;
  if(game.currentDungeon) {
    if(inCurrentInstance(game,u))return game.currentDungeon.kind==='town'?{kind:'town',name:game.currentDungeon.name||'町'}:null;
    // Main army and reserves stay in world coordinates while guards enter town.
  }
  if(near(u,BASE,BASE.radius))return {kind:'base',name:'本陣'};
  for(const p of game.medicalPosts||[])if(near(u,p,p.radius))return {kind:'medical',name:p.name};
  for(const d of game.dungeons||[])if(d.kind==='town'&&near(u,d.entrance||d,150))return {kind:'town',name:d.name||'町'};
  for(const m of game.merchants||[]) {
    if(!usable(m))continue;
    if(near(u,m,110))return {kind:'merchant',name:m.placeName||'商人のキャンプ'};
  }
  for(const tile of game.worldTerrain?.tiles?.values?.()||[])if(!tile.prefetched)for(const camp of tile.camps||[])if(near(u,camp,110))return {kind:'camp',name:'野営キャンプ'};
  return null;
}
export function updateSupplies(game,dt) {
  const p=game.player;if(!p)return;
  p.invulnerableTimer=Math.max(0,(p.invulnerableTimer||0)-dt);
  p.lethalGuardCooldown=Math.max(0,(p.lethalGuardCooldown||0)-dt);
  p.retreatWarningTimer=Math.max(0,(p.retreatWarningTimer||0)-dt);
  game._supplyClock=(game._supplyClock||0)+dt;
  if(game._supplyClock<.25)return;
  game._supplyClock=0;
  for(const u of squadUnits(game))if(usable(u)&&ensureAmmo(u)<ammoCapacity(u)&&supplyLocation(game,u))u.ammo=ammoCapacity(u);
  distributeAmmo(game);
}
export function preventLethalHit(game,target,damage) {
  if(target!==game.player)return false;
  if(target.lethalGuardCooldown>0)return false;
  if(damage<target.maxHp*.8||damage<target.hp)return false;
  target.hp=1;target.invulnerableTimer=2;target.retreatWarningTimer=6;target.lethalGuardCooldown=LETHAL_GUARD_COOLDOWN;
  game.showToast('危険なので撤退すべきだ');game.refreshSupplyUI?.();
  return true;
}
// Field resumes cannot reuse a town/dungeon's local room coordinates.
export function normalizeFieldSave(game,data) {
  if(!game.currentDungeon||!game.savedFieldPos)return data;
  Object.assign(data.player,game.savedFieldPos);
  const positions=new Map((game.savedFieldSquadPos||[]).map(p=>[p.id,p]));
  data.squad=data.squad.map((u,i)=>{
    const pos=positions.get(u.id);
    if(pos)return {...u,x:pos.x,y:pos.y};
    if(!inCurrentInstance(game,u))return u;
    return {...u,x:game.savedFieldPos.x+(i%8-4)*18,y:game.savedFieldPos.y+Math.floor(i/8)*18};
  });
  data.reserves=(data.reserves||[]).map(u=>{
    if(!inCurrentInstance(game,u)&&!game.instanceCargoIds?.includes(u.id))return u;
    const pos=positions.get(u.id)||game.savedFieldPos;return {...u,x:pos.x,y:pos.y};
  });
  data.civilians=(data.civilians||[]).map(c=>{
    if(c.rescueSpace!==game.currentDungeon.id&&c.carrierId!=='player')return {...c};
    const next={...c,x:game.savedFieldPos.x-28,y:game.savedFieldPos.y+12};delete next.rescueSpace;return next;
  });
  const fieldCargo=u=>game.instanceCargoIds?.includes(u.id)?{...u,x:game.savedFieldPos.x-28,y:game.savedFieldPos.y+12}:u;
  data.merchants=(data.merchants||[]).map(m=>({...fieldCargo(m),escorts:(m.escorts||[]).map(fieldCargo)}));
  const platoonPositions=new Map((game.savedFieldPlatoonPos||[]).map(p=>[p.id,p]));
  for(const mission of data.platoonMissions||[]) {
    const old=platoonPositions.get(mission.id);if(old){mission.x=old.x;mission.y=old.y;}
  }
  return data;
}


/** 購入の保存: 背景保存のまとめ（実行中1件＋最新1件）に乗せる。 */
const PURCHASE_SAVE=Object.freeze({auto:true,background:true});
/** 隊長と直属兵の全員が、HP・弾薬・魔力とも満タンなら false（回復薬を使う意味がない）。 */
export function squadNeedsRecovery(game) {
  return personalSquadUnits(game).some(u=>{
    if(!usable(u))return false;
    if(u.hp<u.maxHp||ensureAmmo(u)<ammoCapacity(u))return true;
    if(!isMagicUser(u))return false;
    ensureMana(u);return u.mana<u.maxMana;
  });
}
/** 使った瞬間の知らせ: HUDボタンの光、画面中央の短い表示、効果音、戦闘報告書。 */
function potionUsedFeedback(game,kind,text,left) {
  addBattleReport(game,'supply',`${text}（残り${left}個）`);
  sound.playItem?.();
  const root=game.container;if(!root?.querySelector||typeof document?.createElement!=='function')return;
  const button=root.querySelector(kind==='revival'?'#btn-pad-revive':'#btn-pad-potion');
  if(button){button.classList.remove('potion-used');void button.offsetWidth;button.classList.add('potion-used');setTimeout(()=>button.classList.remove('potion-used'),900);}
  root.querySelectorAll('.potion-flash').forEach(n=>n.remove());
  const flash=document.createElement('div');flash.className=`potion-flash potion-flash-${kind}`;flash.setAttribute('role','status');flash.textContent=text;
  root.append(flash);setTimeout(()=>flash.remove(),1100);
}

export const supplyMethods={
  useRevivalPotion() {
    if(!this.inBattle||this.container?.classList.contains('dialog-open')||this._merchantShopClose||!usable(this.player)||!this.revivalPotion)return false;
    const target=nearestRevivalPotionTarget(this);if(!target)return false;
    this.revivalPotion--;
    if(!reviveByPotion(this,target)){this.revivalPotion++;return false;}
    this.saveGame({background:true});this.updateStatsUI();
    potionUsedFeedback(this,'revival',`蘇生薬を使用: ${target.name}`,this.revivalPotion);return true;
  },
  /** お金で物を買った直後の保存。背景保存のまとめ（実行中1件＋最新1件）に乗るので、連打しても保存がたまらない。 */
  savePurchase() {return this.saveGame(PURCHASE_SAVE);},
  replenishRevivalPotion(merchant) {
    if((this.revivalPotion||0)>=REVIVAL_POTION_MAX||!usable(this.player)||!(this.merchants||[]).includes(merchant)||!usable(merchant))return false;
    // 店を開いている商人なら距離は見ない（店は112以内で開けるので、110の判定だと押しても無反応になる隙間があった）
    const inside=(this.currentDungeon?.kind==='town'&&merchant.placeId===this.currentDungeon.id)||this._tradingMerchant===merchant;
    if(!inside&&!near(this.player,merchant,110))return false;
    if((this.gold||0)<REVIVAL_POTION_COST){this.showToast(`所持金が足りません（蘇生薬は${REVIVAL_POTION_COST.toLocaleString()}G）`);return false;}
    this.gold-=REVIVAL_POTION_COST;this.revivalPotion=(this.revivalPotion||0)+1;this.saveGame(PURCHASE_SAVE);this.updateStatsUI();this.renderSupplyPanel();
    this.showToast(`蘇生薬を購入 · ${REVIVAL_POTION_COST.toLocaleString()}G`);return true;
  },
  useSquadPotion() {
    if(!this.inBattle||this.container?.classList.contains('dialog-open')||this._merchantShopClose||!usable(this.player)||!this.squadPotion||!squadNeedsRecovery(this))return false;
    this.squadPotion--;
    for(const u of personalSquadUnits(this))if(usable(u)){u.hp=u.maxHp;u.ammo=ammoCapacity(u);if(isMagicUser(u)){ensureMana(u);u.mana=u.maxMana;u.magicRecovering=false;}}
    this.showToast('隊長と直属兵のHP・弾薬・魔力を全回復しました');this.saveGame({background:true});this.updateStatsUI();
    potionUsedFeedback(this,'squad','回復薬を使用',this.squadPotion);
    return true;
  },
  replenishSquadPotion(merchant=null) {
    if((this.squadPotion||0)>=SQUAD_POTION_MAX||!usable(this.player))return false;
    const place=supplyLocation(this);
    if(merchant) {
      if(!(this.merchants||[]).includes(merchant)||!usable(merchant))return false;
      const inside=(this.currentDungeon?.kind==='town'&&merchant.placeId===this.currentDungeon.id)||this._tradingMerchant===merchant;
      if(!inside&&!near(this.player,merchant,110))return false;
      if((this.gold||0)<SQUAD_POTION_COST){this.showToast(`所持金が足りません（部隊ポーションは${SQUAD_POTION_COST.toLocaleString()}G）`);return false;}
      this.gold-=SQUAD_POTION_COST;
    } else if(place?.kind!=='base')return false;
    this.squadPotion=merchant?(this.squadPotion||0)+1:SQUAD_POTION_MAX;this.saveGame(PURCHASE_SAVE);this.updateStatsUI();this.renderSupplyPanel();
    this.showToast(merchant?`部隊ポーションを購入 · ${SQUAD_POTION_COST.toLocaleString()}G`:'本陣で部隊ポーションを補給しました');
    return true;
  },
  saveCheckpoint({newSlot=false}={}) {
    saveSlots.lastWriteError=null;
    try {
      const place=supplyLocation(this);if(!place||!usable(this.player))throw new Error('現在は保存できません');
      const previous=saveSlots.get(this.activeSlotId);if(!previous)throw new Error('保存先がありません');
      const snapshot=this.saveGame({persist:false});if(!snapshot)throw new Error('記録を作成できません');
      const checkpoint={place:place.name,entrance:this.currentDungeon?.kind==='town',savedAt:Date.now(),data:JSON.parse(JSON.stringify(snapshot))};
      const values={data:snapshot,checkpoint,state:'active',career:{...this.career}};
      if(newSlot){
        const name=previous.name;
        const slot=saveSlots.create(name,{...values,veterans:previous.veterans,reserveSurvivors:previous.reserveSurvivors});
        this.activeSlotId=slot.id;
      }else if(!saveSlots.update(this.activeSlotId,values))throw new Error('記録を書き込めません');
      this.renderSupplyPanel();
      const host=document.querySelector('#merchant-shop-popup:not(.hidden) .merchant-checkpoint');if(host)this.renderSupplyPanel(host);
      checkpointNotice(this,'セーブしました');return true;
    } catch(error) {
      const failure=saveSlots.lastWriteError||error;
      const reason=failure.name==='QuotaExceededError'?'（保存容量不足）':failure.name==='SecurityError'?'（保存が許可されていません）':'';
      console.warn('Checkpoint save failed:',failure);checkpointNotice(this,`セーブに失敗しました${reason}`,true);return false;
    }
  },
  loadCheckpoint() {
    try {
      if(!supplyLocation(this))return false;
      const checkpoint=saveSlots.get(this.activeSlotId)?.checkpoint;if(!checkpoint?.data)return false;
      const snapshot=JSON.parse(JSON.stringify(checkpoint.data)),restoreMerchant=this._merchantShopRestore?.();
      this._merchantShopClose?.();this.closeStrategyModal();
      this.inBattle=true;this.resumeSavedGame(snapshot);
      restoreMerchant?.();
      checkpointNotice(this,'地点セーブへ戻りました');return true;
    }catch{checkpointNotice(this,'地点セーブを読み込めませんでした',true);return false;}
  },
  refreshSupplyUI() {
    if(!this.player)return;
    this.refreshMagicUI?.();this.refreshHazardUI?.();
    let badge=document.getElementById('supply-status-badge');
    const status=document.querySelector('.field-status');
    if(!badge&&status){badge=document.createElement('div');badge.id='supply-status-badge';badge.className='supply-status-badge';status.append(badge);}
    const ranged=squadUnits(this).filter(u=>usable(u)&&isRangedUnit(this,u));
    const empty=ranged.filter(u=>ensureAmmo(u)===0).length;
    const heroRanged=isRangedUnit(this,this.player);
    if(badge){const previous=badge.textContent;badge.textContent=`${heroRanged?`弾薬 ${ensureAmmo(this.player)}/${ammoCapacity(this.player)} · `:''}${empty?`要補給 ${empty}名（白兵戦で援護）`:`射手の弾薬 ${ranged.reduce((n,u)=>n+ensureAmmo(u),0)}/${ranged.reduce((n,u)=>n+ammoCapacity(u),0)}`} · 回復薬 ${this.squadPotion||0}/${SQUAD_POTION_MAX}`;badge.dataset.empty=String(empty>0);}
    const button=document.getElementById('btn-pad-potion');
    if(button){button.disabled=!this.squadPotion||!usable(this.player);
      // 満タンの表示は disabled にしない: 表示更新は間引かれるので、傷ついた直後に押せなくなるのを避ける。使うときに毎回あらためて判定する。
      const full=!squadNeedsRecovery(this);button.classList.toggle('is-full',full);button.setAttribute('aria-disabled',String(button.disabled||full));button.textContent=`回復薬 ${this.squadPotion||0}`;}
    const revival=document.getElementById('btn-pad-revive'),target=nearestRevivalPotionTarget(this);
    if(revival){revival.disabled=!this.revivalPotion||!target;revival.textContent=`蘇生薬 ${this.revivalPotion||0}`;revival.title=target?`${target.name}を蘇生（自分には使用不可）`:`近く${REVIVAL_POTION_RANGE/100}mのダウン中の味方に使用（自分には使用不可）`;}
    let warning=document.getElementById('retreat-warning');
    const alerts=document.querySelector('.field-alerts');
    if(!warning&&alerts){warning=document.createElement('div');warning.id='retreat-warning';warning.setAttribute('role','status');warning.textContent='危険なので撤退すべきだ';alerts.append(warning);}
    if(warning)warning.textContent=`危険なので撤退すべきだ · 即死対策の再発動まで${Math.ceil(this.player.lethalGuardCooldown||0)}秒`;
    warning?.classList.toggle('hidden',!(this.player.retreatWarningTimer>0));
  },
  renderSupplyPanel(host=null) {
    const overview=host||document.getElementById('view-strat-overview');if(!overview||!this.player)return;
    let panel=overview.querySelector('.supply-panel');
    if(!panel){panel=document.createElement('section');panel.className='supply-panel hub-section';overview.prepend(panel);}
    const place=supplyLocation(this),cp=saveSlots.get(this.activeSlotId)?.checkpoint;
    const ranged=squadUnits(this).filter(u=>usable(u)&&isRangedUnit(this,u));
    if(!panel.querySelector('.supply-actions'))panel.innerHTML='<h4>補給・地点セーブ</h4><p class="supply-location"></p><p class="supply-counts"></p><p class="lethal-guard-status"></p><div class="supply-actions"><button type="button" data-supply="potion">本陣で回復薬を補給</button><button type="button" data-supply="save">現在地をセーブ</button><button type="button" data-supply="load">地点セーブへ戻る</button></div><p class="checkpoint-summary"></p><p class="supply-help"></p>';
    panel.querySelector('.lethal-guard-status').textContent=this.player.lethalGuardCooldown>0?`即死対策：再発動まで${Math.ceil(this.player.lethalGuardCooldown)}秒`:`即死対策：使用可能（再使用${LETHAL_GUARD_COOLDOWN}秒）`;
    panel.querySelector('.supply-location').textContent=place?`補給地点：${place.name}`:'野外：本陣・救護所・町・商人・キャンプに近づくとセーブ／読込できます';
    panel.querySelector('.supply-counts').textContent=`回復薬 ${this.squadPotion||0}/${SQUAD_POTION_MAX} · 射手の弾薬 ${ranged.reduce((n,u)=>n+ensureAmmo(u),0)}/${ranged.reduce((n,u)=>n+ammoCapacity(u),0)} · 予備弾薬 ${this.ammoReserve||0}`;
    panel.querySelector('.supply-counts').textContent+=` · 蘇生薬 ${this.revivalPotion||0}/${REVIVAL_POTION_MAX}`;
    panel.querySelector('.supply-help').textContent='地点セーブへ戻ると、保存時点に巻き戻ります。';
    const potion=panel.querySelector('[data-supply="potion"]');potion.disabled=(this.squadPotion||0)>=SQUAD_POTION_MAX||place?.kind!=='base';potion.onclick=()=>{this.replenishSquadPotion();if(host){if(host.closest('#merchant-shop-popup'))this._merchantShopRefresh?.();else this.renderSupplyPanel(host);}};
    const save=panel.querySelector('[data-supply="save"]');save.disabled=!place||!usable(this.player);save.onclick=()=>requestCheckpointAction(this,'save',save);
    const load=panel.querySelector('[data-supply="load"]');load.disabled=!place||!cp?.data;load.onclick=()=>requestCheckpointAction(this,'load',load);
    const merchantCheckpoint=!!host?.closest('#merchant-shop-popup');
    panel.querySelector('h4').textContent=merchantCheckpoint?'地点セーブ':'補給・地点セーブ';
    potion.classList.toggle('hidden',merchantCheckpoint);
    for(const selector of ['.supply-counts','.lethal-guard-status'])panel.querySelector(selector).classList.toggle('hidden',merchantCheckpoint);
    if(merchantCheckpoint)panel.querySelector('.supply-help').textContent='地点セーブはオートセーブとは別の記録です。読み込むと、HP・所持金・装備・品揃えなどが記録時点に戻ります。';
    panel.querySelector('.checkpoint-summary').textContent=cp?`記録：${cp.place} · 第${cp.data.phase}期 · ${new Date(cp.savedAt).toLocaleString('ja-JP')}${cp.data.player?` · HP ${Math.ceil(cp.data.player.hp)}`:''}${cp.entrance?'（町入口から再開）':''}`:'地点セーブはまだありません';
  }
};
