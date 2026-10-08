import {isMagicUser,ensureMana} from './magic-rules.js?v=121';
import {WORLD_SIZE} from './world.js?v=121';
import {inCurrentInstance} from './instance-rules.js?v=121';
import {saveSlots} from './save-slots.js';

export const AMMO_CAPACITY=30;
export const SQUAD_POTION_COST=300;
export const LETHAL_GUARD_COOLDOWN=120;
export const RANGED_DAMAGE_MULT=1.2;
export const STONE_MULT=.75;
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
  u.ammo=u.ammo==null?AMMO_CAPACITY:Math.max(0,Math.min(AMMO_CAPACITY,Math.floor(Number(u.ammo)||0)));
  return u.ammo;
}
export function squadUnits(game) {return [game.player,...(game.squad||[]),...(game.reserves||[])].filter(Boolean);}
export function personalSquadUnits(game) {
  return [game.player,...(game.squad||[]).filter(u=>u.isPersonalGuard&&(!game.currentDungeon||inCurrentInstance(game,u)))].filter(Boolean);
}
export function initializeSupplies(game,saved=null) {
  game.ammoReserve=Math.max(0,Math.floor(Number(saved?.ammoReserve)||0));
  game.squadPotion=saved?.squadPotion==null?1:(Number(saved.squadPotion)>0?1:0);
  game._supplyClock=0;
  for(const u of squadUnits(game))if(saved)ensureAmmo(u);else u.ammo=AMMO_CAPACITY;
  game.player.invulnerableTimer=Math.max(0,Math.min(2,Number(saved?.player?.invulnerableTimer)||0));
  game.player.lethalGuardCooldown=Math.max(0,Math.min(LETHAL_GUARD_COOLDOWN,Number(saved?.player?.lethalGuardCooldown??(game.player.invulnerableTimer>0?LETHAL_GUARD_COOLDOWN:0))||0));
  game.player.retreatWarningTimer=game.player.invulnerableTimer>0?6:0;
}
export function takeRangedShot(unit,damage) {
  const loaded=ensureAmmo(unit)>0;
  if(loaded)unit.ammo--;
  return {loaded,damage:Math.max(1,Math.round(damage*RANGED_DAMAGE_MULT*(loaded?1:STONE_MULT)))};
}
export function ammoCombatProfile(unit,profile) {
  if(!profile.ranged||ensureAmmo(unit)>0)return profile;
  return {...profile,stone:true,reach:profile.reach*STONE_MULT,reachWarlord:profile.reachWarlord*STONE_MULT,
    baseCooldown:profile.baseCooldown/STONE_MULT,projSpeed:profile.projSpeed*STONE_MULT,splash:0,knockback:0,knockbackWarlord:0};
}
// Distribute one round per pass so the closest collector does not monopolize supplies.
export function distributeAmmo(game,amount=0) {
  game.ammoReserve=Math.max(0,Math.floor(Number(game.ammoReserve)||0))+Math.max(0,Math.floor(Number(amount)||0));
  const recipients=squadUnits(game).filter(u=>usable(u)&&isRangedUnit(game,u));
  let delivered=0;
  while(game.ammoReserve>0) {
    let changed=false;
    for(const u of recipients) {
      if(ensureAmmo(u)>=AMMO_CAPACITY)continue;
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
    if(!usable(m)||m.returningToBase)continue;
    if(near(u,m,110))return {kind:'merchant',name:m.placeName||'商人のキャンプ'};
  }
  for(const tile of game.worldTerrain?.tiles?.values?.()||[])for(const camp of tile.camps||[])if(near(u,camp,110))return {kind:'camp',name:'野営キャンプ'};
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
  for(const u of squadUnits(game))if(usable(u)&&ensureAmmo(u)<AMMO_CAPACITY&&supplyLocation(game,u))u.ammo=AMMO_CAPACITY;
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

export const supplyMethods={
  useSquadPotion() {
    if(!this.inBattle||this.container?.classList.contains('dialog-open')||this._merchantShopClose||!usable(this.player)||!this.squadPotion)return false;
    this.squadPotion=0;
    for(const u of personalSquadUnits(this))if(usable(u)){u.hp=u.maxHp;u.ammo=AMMO_CAPACITY;if(isMagicUser(u)){ensureMana(u);u.mana=u.maxMana;u.magicRecovering=false;}}
    this.showToast('隊長と直属兵のHP・弾薬・魔力を全回復しました');this.saveGame();this.updateStatsUI();
    return true;
  },
  replenishSquadPotion(merchant=null) {
    if(this.squadPotion||!usable(this.player))return false;
    const place=supplyLocation(this);
    if(merchant) {
      if(!(this.merchants||[]).includes(merchant)||!usable(merchant)||merchant.returningToBase)return false;
      const inside=this.currentDungeon?.kind==='town'&&merchant.placeId===this.currentDungeon.id;
      if(!inside&&!near(this.player,merchant,110))return false;
      if((this.gold||0)<SQUAD_POTION_COST)return false;
      this.gold-=SQUAD_POTION_COST;
    } else if(place?.kind!=='base')return false;
    this.squadPotion=1;this.saveGame();this.updateStatsUI();this.renderSupplyPanel();
    this.showToast(merchant?`部隊ポーションを購入 · ${SQUAD_POTION_COST}G`:'本陣で部隊ポーションを補給しました');
    return true;
  },
  saveCheckpoint() {
    const place=supplyLocation(this);if(!place||!usable(this.player))return false;
    const snapshot=this.saveGame();if(!snapshot)return false;
    const checkpoint={place:place.name,entrance:this.currentDungeon?.kind==='town',savedAt:Date.now(),data:JSON.parse(JSON.stringify(snapshot))};
    if(!saveSlots.update(this.activeSlotId,{checkpoint})) {this.showToast('地点セーブに失敗しました');return false;}
    this.showToast(`${place.name}で地点セーブしました`);this.renderSupplyPanel();return true;
  },
  loadCheckpoint() {
    if(!supplyLocation(this))return false;
    const checkpoint=saveSlots.get(this.activeSlotId)?.checkpoint;if(!checkpoint?.data)return false;
    this._merchantShopClose?.();this.closeStrategyModal();
    this.inBattle=true;this.resumeSavedGame(JSON.parse(JSON.stringify(checkpoint.data)));
    this.showToast(`${checkpoint.place}の地点セーブを読み込みました`);return true;
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
    if(badge){const previous=badge.textContent;badge.textContent=`${heroRanged?`弾薬 ${ensureAmmo(this.player)}/${AMMO_CAPACITY} · `:''}${empty?`要補給 ${empty}名（石75%）`:`射手の弾薬 ${ranged.reduce((n,u)=>n+ensureAmmo(u),0)}/${ranged.length*AMMO_CAPACITY}`} · 回復薬 ${this.squadPotion?1:0}/1`;badge.dataset.empty=String(empty>0);}
    const button=document.getElementById('btn-pad-potion');
    if(button){button.disabled=!this.squadPotion||!usable(this.player);button.textContent=`回復薬 ${this.squadPotion?1:0}`;}
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
    panel.innerHTML='<h4>補給・地点セーブ</h4><p class="supply-location"></p><p class="supply-counts"></p><p class="lethal-guard-status"></p><div class="supply-actions"><button type="button" data-supply="potion">本陣で回復薬を補給</button><button type="button" data-supply="save">現在地をセーブ</button><button type="button" data-supply="load">地点セーブへ戻る</button></div><p class="checkpoint-summary"></p><p class="supply-help">弾薬・魔力は本陣・救護所・町・商人・キャンプの近くで自動補給。回復薬は隊長と行動可能な直属兵のHP・弾薬・魔力を全回復。本隊・予備兵は対象外。ダウン中は搬送・衛生兵が必要です。地点セーブはオートセーブと別に保持し、読込時は記録時点へ戻ります。</p>';
    panel.querySelector('.lethal-guard-status').textContent=this.player.lethalGuardCooldown>0?`即死対策：再発動まで${Math.ceil(this.player.lethalGuardCooldown)}秒`:`即死対策：使用可能（再使用${LETHAL_GUARD_COOLDOWN}秒）`;
    panel.querySelector('.supply-location').textContent=place?`補給地点：${place.name}`:'野外：本陣・救護所・町・商人・キャンプに近づくとセーブ／読込できます';
    panel.querySelector('.supply-counts').textContent=`回復薬 ${this.squadPotion?1:0}/1 · 射手の弾薬 ${ranged.reduce((n,u)=>n+ensureAmmo(u),0)}/${ranged.length*AMMO_CAPACITY} · 予備弾薬 ${this.ammoReserve||0}`;
    const potion=panel.querySelector('[data-supply="potion"]');potion.disabled=!!this.squadPotion||place?.kind!=='base';potion.onclick=()=>this.replenishSquadPotion();
    const save=panel.querySelector('[data-supply="save"]');save.disabled=!place;save.onclick=()=>{this.saveCheckpoint();if(host)this.renderSupplyPanel(host);};
    const load=panel.querySelector('[data-supply="load"]');load.disabled=!place||!cp?.data;load.onclick=()=>this.loadCheckpoint();
    panel.querySelector('.checkpoint-summary').textContent=cp?`記録：${cp.place} · 第${cp.data.phase}期 · ${new Date(cp.savedAt).toLocaleString('ja-JP')}${cp.data.player?` · HP ${Math.ceil(cp.data.player.hp)}`:''}${cp.entrance?'（町入口から再開）':''}`:'地点セーブはまだありません';
  }
};
