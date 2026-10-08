import {ensureMana,regenerateMana,spendMana} from './magic-rules.js?v=110';
import {recordHealing} from './phase-rules.js';
import {WORLD_SIZE} from './world.js';
import {grantPermanentRescueReward} from './rescue-rewards.js?v=110';

export const RESCUE_TIMEOUT = 45; // 救助猶予時間（秒）広域マップ対応で45秒に延長
export const isMedic=unit=>['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL'].includes(unit?.soldierClass);
// Compatibility names for existing medical callers; the shared resource is mana.
export const MEDIC_STAMINA_MAX=100;
export const MEDIC_STAMINA_REGEN=.6;
export const MEDIC_HEAL_COST=16;
export const MEDIC_AURA_COST=10;
export const MEDIC_TREAT_DRAIN=28;
export const MEDIC_TREAT_MIN=8;
export const AID_BLEED_RATE=.55;
export const ensureMedicStamina=unit=>isMedic(unit)?ensureMana(unit):0;
export const regenMedicStamina=(unit,dt)=>isMedic(unit)?regenerateMana(unit,dt):0;
export const medicHasStamina=(unit,cost)=>ensureMedicStamina(unit)>=(cost||0);
export const spendMedicStamina=(unit,cost)=>isMedic(unit)&&spendMana(unit,cost);
export const carryingCapacity=unit=>{
  if(!unit) return 1;
  // 隊長（紐で引っ張る仲間）デフォルト2名・聖騎士2名・他兵士1名
  if(unit.isHero || unit.isPlayer) return 2;
  if(unit.soldierClass==='PALADIN') return 2;
  return 1;
};
export const carrierKey=(game,unit)=>unit===game.player?'player':unit?.id;
export const isMerchantCasualty=unit=>!!(unit?.isMerchant||unit?.isMerchantEscort);
export const rescueUnits=game=>game._merchantWounded?.length?[...(game.squad||[]),...game._merchantWounded]:(game.squad||[]);
export function rebuildMerchantCasualties(game) {
  game._merchantWounded=(game.gateGuards||[]).filter(g=>g.isDown&&!g.dead);
  for(const m of game.merchants||[])for(const unit of [m,...(m.escorts||[])])if(unit.isDown&&!unit.dead)game._merchantWounded.push(unit);
}
export const carriedSoldiers=(game,unit)=>!unit?[]:rescueUnits(game).filter(s=>s.isDown&&!s.dead&&s.carrierId===carrierKey(game,unit));
export const carriedCivilians=(game,unit)=>!unit?[]:(game.civilians||[]).filter(c=>c&&!c.rescued&&c.carrierId===carrierKey(game,unit));
export const carriedCount=(game,unit)=>carriedSoldiers(game,unit).length+carriedCivilians(game,unit).length;
export const transportSpeedFactor=(game,unit)=>{
  const n=carriedCount(game,unit);
  return n>1?.55:n?.72:1;
};
export const carrierOf=(game,wounded)=>wounded.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===wounded.carrierId);
export const hasActiveRopePull=game=>{
  if(!game) return false;
  // 壊れた carrierId を先に掃除（常時trueで転送封じを防ぐ）
  sanitizeCarriers(game);
  const wounded=rescueUnits(game).some(s=>s&&s.isDown&&!s.dead&&s.carrierId);
  const civ=(game.civilians||[]).some(c=>c&&!c.rescued&&c.carrierId);
  return !!(wounded||civ);
};
/** 隊長本人が紐牽引中か（地図ファストトラベル判定用） */
export const playerHasActiveRopePull=game=>{
  if(!game?.player) return false;
  sanitizeCarriers(game);
  return carriedCount(game, game.player) > 0;
};

/** 子供・女性・老人の紐救出ボーナス定義 */
export const CIV_KINDS={
  child:{kind:'child',label:'子供',icon:'🧒',toast:'子供を安全な場所へ送り届けた！'},
  woman:{kind:'woman',label:'女性',icon:'👩',toast:'女性を安全な場所へ送り届けた！'},
  elder:{kind:'elder',label:'老人',icon:'🧓',toast:'老人を安全な場所へ送り届けた！'}
};
const CIV_NAME_POOL={
  child:['タロウ','ハナ','ケン','ユイ','ソラ','リン'],
  woman:['アヤ','ミホ','サキ','ナナ','レイ','カオル'],
  elder:['ジロウ','ハツ','ゲン','トメ','サダ','キク']
};

// Town visitors, field armies and NPCs use distinct coordinate spaces.
export function isLocalRescueUnit(game,unit) {
  const d=game.currentDungeon;if(!d)return false;
  if(unit===game.player)return true;
  if(unit?.isGateGuard)return unit.gateSpace===d.id;
  if(isMerchantCasualty(unit))return false;
  return (game.squad||[]).includes(unit)&&(d.kind!=='town'||unit.isPersonalGuard);
}
export function aidStations(game,unit=null) {
  const d=game.currentDungeon;
  if(unit&&isLocalRescueUnit(game,unit))return d.kind==='town'?[{id:`town-aid-${d.id}`,kind:'town',x:230,y:d.height/2,radius:120,intakeRadius:72,name:`${d.name}・救護受付`}]:[];
  return [{id:'base',kind:'base',x:WORLD_SIZE/2,y:WORLD_SIZE/2,radius:150,name:'本陣'},
    ...(game.medicalPosts||[]),
    ...(game.dungeons||[]).filter(d=>d.kind==='town'&&d.entrance).map(d=>({id:`town-${d.id}`,kind:'town',x:d.entrance.x,y:d.entrance.y,radius:70,intakeRadius:40,name:d.name||'町'})),
    ...(game.outposts||[]).filter(o=>o.cleared).map(o=>({...o,kind:'outpost',radius:(o.radius||30)+24,name:o.name||'拠点'}))];
}
export function casualtyStations(game,unit) {
  const list=aidStations(game,unit);
  return isMerchantCasualty(unit)?list.filter(p=>['base','medical','town'].includes(p.kind)):list;
}
const nearest=(list,unit)=>list.reduce((a,b)=>!a||Math.hypot(unit.x-b.x,unit.y-b.y)<Math.hypot(unit.x-a.x,unit.y-a.y)?b:a,null);
export const nearestCasualtyStation=(game,unit)=>nearest(casualtyStations(game,unit),unit);
/** 民間人救出先：本陣・救護所・制圧拠点・町入口 */
export function civilianRescueStations(game,unit=null) {
  const d=game.currentDungeon,carrier=unit?.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===unit?.carrierId);
  if(d&&(unit?.rescueSpace===d.id||(carrier&&isLocalRescueUnit(game,carrier))))return d.kind==='town'?aidStations(game,game.player):[];
  return aidStations(game).filter(p=>p.kind!=='town'||(game.dungeons||[]).some(d=>`town-${d.id}`===p.id&&(d.discovered||d.cleared)));
}
export function nearestAidStation(game,unit) {return nearest(aidStations(game,unit),unit);}
export function nearestCivilianStation(game,unit) {return nearest(civilianRescueStations(game,unit),unit);}
export function attachWounded(game,carrier,wounded) {
  if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||!wounded?.isDown||wounded.dead||wounded===carrier||wounded.carrierId)return false;
  if(isLocalRescueUnit(game,carrier)!==isLocalRescueUnit(game,wounded))return false;
  const distance=Math.hypot(carrier.x-wounded.x,carrier.y-wounded.y);
  if(wounded.releasedBy===carrierKey(game,carrier)) {if(distance<=65)return false;delete wounded.releasedBy;}
  if(distance>45||carriedCount(game,carrier)>=carryingCapacity(carrier))return false;
  delete wounded.releasedBy;wounded.carrierId=carrierKey(game,carrier);wounded.rescueProgress=0;delete wounded.rescueHealerId;
  return true;
}
export function attachCivilian(game,carrier,civ) {
  if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||!civ||civ.rescued||civ.carrierId)return false;
  if(carrier!==game.player&&!carrier.isHero)return false; // 民間人紐牽引は隊長のみ
  if(game.currentDungeon&&civ.rescueSpace!==game.currentDungeon.id)return false;
  const distance=Math.hypot(carrier.x-civ.x,carrier.y-civ.y);
  if(civ.releasedBy===carrierKey(game,carrier)) {if(distance<=65)return false;delete civ.releasedBy;}
  if(distance>48||carriedCount(game,carrier)>=carryingCapacity(carrier))return false;
  delete civ.releasedBy;civ.carrierId=carrierKey(game,carrier);
  game.showToast?.(`${CIV_KINDS[civ.kind]?.icon||'🙏'} ${civ.name}を紐で牽引中 → 本陣・救護所・町・拠点へ`);
  return true;
}
export function releaseWounded(game,carrier) {
  for(const wounded of carriedSoldiers(game,carrier)){delete wounded.carrierId;wounded.releasedBy=carrierKey(game,carrier);}
  for(const civ of carriedCivilians(game,carrier)){delete civ.carrierId;civ.releasedBy=carrierKey(game,carrier);}
}
export function sanitizeCarriers(game) {
  const counts=new Map();
  const bump=(id)=>{const n=counts.get(id)||0;counts.set(id,n+1);return n;};
  for(const wounded of rescueUnits(game)) {
    if(!wounded.carrierId)continue;
    const carrier=carrierOf(game,wounded),count=bump(wounded.carrierId);
    if(!wounded.isDown||wounded.dead||!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||count>carryingCapacity(carrier))delete wounded.carrierId;
  }
  for(const civ of game.civilians||[]) {
    if(!civ||civ.rescued||!civ.carrierId)continue;
    const carrier=civ.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===civ.carrierId);
    const count=bump(civ.carrierId);
    if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||count>carryingCapacity(carrier))delete civ.carrierId;
  }
}

/** Begin a new down event: latch flags for once-per-down rescue bonus. */
export function beginDownEvent(game, wounded) {
  if (!wounded) return;
  wounded.rescuedThisDown = false;
  wounded.downId = (wounded.timesDown || 0);
  const station = nearestCasualtyStation(game,wounded);
  wounded.downedInAid = !!(station && Number.isFinite(wounded.x) && Number.isFinite(wounded.y)
    && Math.hypot(wounded.x - station.x, wounded.y - station.y) <= station.radius);
}

/** Mark soldier down (field damage / raid penalty). Clears prior rescue latch. */
export function markSoldierDown(game, soldier, opts = {}) {
  if (!soldier || soldier.isDown || soldier.dead) return false;
  soldier.hp = 0;
  soldier.isDown = true;
  soldier.timesDown = (soldier.timesDown || 0) + 1;
  soldier.downTimer = opts.downTimer ?? RESCUE_TIMEOUT;
  soldier.rescueProgress = 0;
  delete soldier.carrierId;
  delete soldier.rescueHealerId;
  beginDownEvent(game, soldier);
  if(isMerchantCasualty(soldier)) {
    game._merchantWounded ||= [];
    if(!game._merchantWounded.includes(soldier))game._merchantWounded.push(soldier);
  }
  return true;
}

function revive(game,wounded,hp,options=null) {
  const carrier=carrierOf(game,wounded);
  wounded.isDown=false;wounded.hp=Math.max(1,Math.floor(hp));wounded.rescueProgress=0;wounded.downTimer=0;
  delete wounded.carrierId;delete wounded.rescueHealerId;delete wounded.rescueTargetId;
  delete wounded.downedInAid;delete wounded.downId;
  if(isMerchantCasualty(wounded)) {
    game._merchantWounded=(game._merchantWounded||[]).filter(unit=>unit!==wounded);
    if(!wounded.rescuedToBase) {
      // Separate resting spots keep rescued traders individually approachable.
      let slot=0;
      for(const merchant of game.merchants||[])for(const unit of [merchant,...(merchant.escorts||[])])if(unit!==wounded&&unit.rescuedToBase)slot++;
      slot+=(game.gateGuards||[]).filter(g=>g!==wounded&&g.rescuedToBase).length;
      const angle=slot*2.399963229728653,radius=Math.min(115,60+18*Math.sqrt(slot));
      wounded.homeX=WORLD_SIZE/2+Math.cos(angle)*radius;
      wounded.homeY=WORLD_SIZE/2+Math.sin(angle)*radius;
    }
    if(wounded.isGateGuard){if(game.currentDungeon&&wounded.gateSpace===game.currentDungeon.id){wounded.x=game.currentDungeon.entrance.x;wounded.y=game.currentDungeon.entrance.y;}wounded.gateSpace='field';}
    wounded.rescuedToBase=true;
    if(wounded.isGateGuard)game.onGateGuardRelocated?.(wounded);
    if(['medical','town'].includes(options?.station?.kind)){wounded.x=wounded.homeX;wounded.y=wounded.homeY;}
    wounded.returningToBase=Math.hypot(wounded.x-wounded.homeX,wounded.y-wounded.homeY)>4;
    if(wounded.isMerchant)wounded.placeName='本陣・救助した商人';
  }
  if(options) {
    grantRescueBonus(game,wounded,{...options,carrier});
    if(options.method==='BASE')wounded.hp=Math.max(1,Math.floor(wounded.maxHp));
  } else {
    game.showToast?.(`${wounded.name}が復活しました`);
  }
}

/** 個人EXP付与＋レベルアップ（隊長/兵士）。救助功績の帰属先用。 */
function applyPersonalExp(game, unit, amount) {
  if (!game || !unit || !(amount > 0)) return false;
  const isPlayerUnit = unit === game.player || unit.isPlayer || unit.isHero;
  let didLevelUp = false;
  if (isPlayerUnit && game.player) {
    game.player.exp = (game.player.exp || 0) + amount;
    let pGuard = 0;
    while (game.player.exp >= (game.player.reqExp || 20) && pGuard++ < 30) {
      const req = Math.max(10, game.player.reqExp || 20);
      game.player.exp -= req;
      game.player.level = (game.player.level || 1) + 1;
      game.player.reqExp = Math.floor(req * 1.45 + 10);
      didLevelUp = true;
      game.sound?.playHighScore?.();
      game.spawnDamageText?.(game.player.x, game.player.y - 30, `⚡ Lv.${game.player.level} UP!`, '#34d399');
      game.showToast?.(`⚡ 救助功績でレベルアップ！ Lv.${game.player.level} に到達！`);
    }
    if (didLevelUp) game.recalcPlayerStats?.();
  } else {
    unit.exp = (unit.exp || 0) + amount;
    let sGuard = 0;
    while (unit.exp >= (unit.reqExp || 14) && sGuard++ < 30) {
      const req = Math.max(8, unit.reqExp || 14);
      unit.exp -= req;
      unit.level = (unit.level || 1) + 1;
      unit.reqExp = Math.floor(req * 1.5 + 8);
      didLevelUp = true;
    }
    if (didLevelUp) {
      if (typeof game.recalcSoldierStats === 'function') game.recalcSoldierStats(unit);
      game.spawnDamageText?.(unit.x, unit.y - 45, `⚡ Lv.${unit.level}!`, '#00f0ff');
    }
  }
  return didLevelUp;
}

export function grantRescueBonus(game,wounded,options={}) {
  const {method='BASE',medic=null,carrier=null}=options;
  if(!game||!wounded)return;
  // Once-per-down latch: same down event cannot farm base/medic rescue bonus repeatedly.
  if(wounded.rescuedThisDown)return;
  wounded.rescuedThisDown=true;

  if(isMerchantCasualty(wounded)) {
    wounded.timesRescued=(wounded.timesRescued||0)+1;
    const rescuer=carrier||medic;
    if(rescuer)rescuer.rescues=(rescuer.rescues||0)+1;
    grantPermanentRescueReward(game,wounded);
    game.updateStatsUI?.();
    return;
  }


  if(options.suppressAidReward)return; // Moving an in-facility casualty to reception grants no farmable gold/XP.
  const isBase=method==='BASE';
  const baseGold=isBase?200:100;
  const carrierBonusGold=carrier===game.player?50:0;
  const totalGold=baseGold+carrierBonusGold;

  // 1. 部隊軍資金（共有経済）
  game.gold=(game.gold||0)+totalGold;

  // 2. 昇進EXP（指揮階級）— 誰が救助しても部隊武勲として加算
  const rankExpGain=isBase?20:12;
  if(typeof game.gainExp==='function') {
    game.gainExp(rankExpGain);
  } else {
    game.exp=(game.exp||0)+rankExpGain;
  }

  // 3. 個人救助EXP — 実際の救助者（搬送者優先、いなければ衛生兵）。隊長への固定付与バグ修正
  const rescuerPersonalExp=isBase?30:20;
  const unitLabel=u=>!u?'':(u===game.player||u.isPlayer||u.isHero)?'隊長':(u.name||'兵士');

  if(carrier) {
    if(carrier===game.player) {
      game.player.rescues=(game.player.rescues||0)+1;
      game.rescueBuffTimer=isBase?6.0:4.0;
      applyPersonalExp(game,game.player,rescuerPersonalExp);
      game.spawnDamageText?.(game.player.x,game.player.y-25,'✨ 救助の英雄！(高速ダッシュ)','#38bdf8');
    } else {
      carrier.gold=(carrier.gold||0)+(isBase?80:50);
      applyPersonalExp(game,carrier,rescuerPersonalExp);
      carrier.rescues=(carrier.rescues||0)+1;
      game.spawnDamageText?.(carrier.x,carrier.y-20,`🎖️ ${unitLabel(carrier)} 搬送功績! +${isBase?80:50}G`,'#fbbf24');
    }
  }

  // 4. 衛生兵へのボーナス（搬送なし＝主救助者でフル個人EXP／搬送あり＝補助で小さめ）
  if(medic&&medic!==carrier) {
    medic.gold=(medic.gold||0)+50;
    const medicExp=carrier?20:rescuerPersonalExp;
    applyPersonalExp(game,medic,medicExp);
    medic.rescues=(medic.rescues||0)+1;
    game.spawnDamageText?.(medic.x,medic.y-20,`💚 ${unitLabel(medic)} 救命功績! +50G`,'#34d399');
  }

  // 5. 救助された兵士へのボーナス（経験値・軍資金・生還シールド）
  const sExpGain = isBase ? 45 : 30;
  const sGoldGain = isBase ? 60 : 40;
  if(!isMerchantCasualty(wounded)) {
    wounded.exp = (wounded.exp || 0) + sExpGain;
    wounded.gold = (wounded.gold || 0) + sGoldGain;
  }
  wounded.timesRescued = (wounded.timesRescued || 0) + 1;
  wounded.shieldTimer = 3.0; // 3秒間被ダメージ半減シールド

  // 救助された兵士のレベルアップ判定
  let sGuard = 0;
  let didLevelUp = false;
  while (!isMerchantCasualty(wounded) && wounded.exp >= (wounded.reqExp || 14) && sGuard++ < 30) {
    const req = Math.max(8, wounded.reqExp || 14);
    wounded.exp -= req;
    wounded.level = (wounded.level || 1) + 1;
    wounded.reqExp = Math.floor(req * 1.5 + 8);
    didLevelUp = true;
  }
  if (didLevelUp) {
    if (typeof game.recalcSoldierStats === 'function') game.recalcSoldierStats(wounded);
    game.spawnDamageText?.(wounded.x, wounded.y - 45, `⚡ Lv.${wounded.level}!`, '#00f0ff');
  }

  // 6. 演出・サウンド・通知（救助者名を表示）
  const primary=carrier||medic||null;
  const rescuerName=unitLabel(primary);
  const lvTxt = didLevelUp ? ` ⚡Lv.${wounded.level}UP!` : '';
  if(isBase) {
    game.sound?.playHighScore?.();
    game.spawnDamageText?.(wounded.x,wounded.y-30,`🚑 拠点救護成功! +${totalGold}G`,'#ffd700');
    const carrierTxt=carrier===game.player?' (隊長に快足バフ)':(carrier?` (搬送: ${rescuerName})`:'');
    game.showToast?.(`🚑 ${options.station?.name||'拠点'}救護成功！【${wounded.name}】${isMerchantCasualty(wounded)?'は本陣に留まります':'が全快復帰！'}(+${totalGold}G, 武勲+${rankExpGain}${rescuerName?`, ${rescuerName}+${rescuerPersonalExp}EXP`:''}${isMerchantCasualty(wounded)?'':`, 兵士+${sExpGain}EXP/+${sGoldGain}G`}${carrierTxt}${lvTxt})`);
  } else {
    game.sound?.playItem?.();
    game.spawnDamageText?.(wounded.x,wounded.y-30,`💚 衛生兵救護成功! +${totalGold}G`,'#34d399');
    const who=rescuerName?`救助: ${rescuerName}`:'';
    const carrierTxt=carrier===game.player?' (隊長に快足バフ)':(carrier&&carrier!==medic?` (搬送: ${unitLabel(carrier)})`:'');
    game.showToast?.(`💚 衛生救護！【${wounded.name}】${isMerchantCasualty(wounded)?'は本陣へ避難します':'が戦線復帰！'}(+${totalGold}G, 武勲+${rankExpGain}${who?`, ${who}+${rescuerPersonalExp}EXP`:''}${isMerchantCasualty(wounded)?'':`, 兵士+${sExpGain}EXP/+${sGoldGain}G`}${carrierTxt}${lvTxt})`);
  }

  game.updateStatsUI?.();
}

/** Civilian rescue: one random permanent commander stat reward per person. */
export function grantCivilianRescueBonus(game,civ,station) {
  if(!game||!civ||civ.rescued)return;
  const def=CIV_KINDS[civ.kind]||CIV_KINDS.child;
  const carrierId=civ.carrierId;
  const carrier=carrierId==='player'?game.player:(game.squad||[]).find(s=>s&&s.id===carrierId);
  civ.rescued=true;civ.rescueStationId=station?.id;delete civ.carrierId;
  game.civilianRescues=(game.civilianRescues||0)+1;
  if(carrier)carrier.rescues=(carrier.rescues||0)+1;
  grantPermanentRescueReward(game,civ);
  game.sound?.playHighScore?.();
  const popX=(carrier?.x??game.player?.x??civ.x);
  const popY=(carrier?.y??game.player?.y??civ.y)-28;
  game.spawnDamageText?.(popX,popY,`${def.icon} 救出!`,'#fde68a');
  game.updateStatsUI?.();
}

export function treatWounded(game,medic,wounded,dt) {
  if(!Number.isFinite(dt)||dt<=0||!isMedic(medic)||medic.dead||medic.isDown||medic.hp<=0||!wounded?.isDown||wounded.dead||Math.hypot(medic.x-wounded.x,medic.y-wounded.y)>40)return false;
  // Soft fatigue: cannot channel revive when exhausted (HQ wipe becomes possible).
  if(!medicHasStamina(medic, MEDIC_TREAT_MIN)) return false;
  const drain = MEDIC_TREAT_DRAIN * dt;
  if(!spendMedicStamina(medic, Math.min(drain, ensureMedicStamina(medic)))) return false;
  wounded.rescueProgress=(wounded.rescueProgress||0)+dt*(medic.soldierClass==='HIGH_PRIEST'?2.8:1.1);
  wounded.rescueHealerId=medic.id;
  if(wounded.rescueProgress<1)return false;
  recordHealing(medic,Math.max(1,Math.floor(wounded.maxHp*.35)));
  revive(game,wounded,wounded.maxHp*.35,{method:'MEDIC',medic});return true;
}

/**
 * 衛生兵・大司教を異なる負傷者へ分散割当（全員が同一ターゲットに群がらない）
 * 余り衛生兵は最も近い未完了ターゲットを支援可
 */
export function buildMedicRescueAssign(aliveSquad) {
  const map=new Map();
  const medics=(aliveSquad||[]).filter(s=>s&&!s.dead&&!s.isDown&&isMedic(s));
  const downed=(aliveSquad||[]).filter(s=>s&&s.isDown&&!s.dead);
  if(!medics.length||!downed.length)return map;
  const claimed=new Set();
  // 1) sticky: 既に処置中／指定済のターゲットを優先確保
  for(const medic of medics) {
    const stickyId=medic.rescueTargetId||null;
    const sticky=stickyId?downed.find(d=>d.id===stickyId):null;
    if(sticky&&!claimed.has(sticky.id)) {
      map.set(medic.id,sticky);claimed.add(sticky.id);medic.rescueTargetId=sticky.id;continue;
    }
    // 自分が間近で処置中の負傷者
    const near=downed.find(d=>d.rescueHealerId===medic.id&&!claimed.has(d.id)&&Math.hypot(d.x-medic.x,d.y-medic.y)<=55);
    if(near){map.set(medic.id,near);claimed.add(near.id);medic.rescueTargetId=near.id;}
  }
  // 2) 未割当衛生兵 → 最も近い未クレーム負傷者
  for(const medic of medics) {
    if(map.has(medic.id))continue;
    let best=null,bestD=Infinity;
    for(const d of downed) {
      if(claimed.has(d.id))continue;
      const dist=Math.hypot(d.x-medic.x,d.y-medic.y);
      if(dist<bestD){bestD=dist;best=d;}
    }
    if(best){map.set(medic.id,best);claimed.add(best.id);medic.rescueTargetId=best.id;}
  }
  // 3) 負傷者より衛生兵が多い場合のみ、最寄りへ支援合流
  for(const medic of medics) {
    if(map.has(medic.id))continue;
    let best=null,bestD=Infinity;
    for(const d of downed) {
      const dist=Math.hypot(d.x-medic.x,d.y-medic.y);
      if(dist<bestD){bestD=dist;best=d;}
    }
    if(best){map.set(medic.id,best);medic.rescueTargetId=best.id;}
  }
  return map;
}

export function updateWounded(game,dt) {
  sanitizeCarriers(game);
  if(game.player?.hp>0) {
    for(const wounded of rescueUnits(game))attachWounded(game,game.player,wounded);
    for(const civ of game.civilians||[]) {
      if(civ&&!civ.rescued)attachCivilian(game,game.player,civ);
    }
  }
  for(const wounded of rescueUnits(game)) {
    if(!wounded.isDown||wounded.dead)continue;
    wounded.hp=0;
    // Init once-per-down meta (also covers saves loaded while already down).
    if(wounded.downId==null) beginDownEvent(game,wounded);
    const station=nearestCasualtyStation(game,wounded);
    // Carry-to-base bonus only if this down did NOT start already inside an aid station.
    // Downed-at-HQ: no farmable BASE bonus; bleed-out still applies (safer rate, still mortal).
    const reception=station&&['medical','town'].includes(station.kind);
    const delivered=station&&Math.hypot(wounded.x-station.x,wounded.y-station.y)<=(wounded.downedInAid?station.intakeRadius||station.radius:station.radius);
    if(!wounded.rescuedThisDown&&delivered&&(!wounded.downedInAid||(reception&&wounded.carrierId))) {revive(game,wounded,wounded.maxHp,{method:'BASE',station,suppressAidReward:!!wounded.downedInAid});continue;}
    // Field carry can pause the timer; HQ/aid downs keep bleeding even while carried (no immortal freeze).
    if(wounded.carrierId && !wounded.downedInAid)continue;
    const bleedDt = wounded.downedInAid ? dt * AID_BLEED_RATE : dt;
    wounded.downTimer=Math.max(0,(wounded.downTimer??RESCUE_TIMEOUT)-bleedDt);
    if(wounded.downTimer<=0) {
      wounded.dead=true;if(wounded.isGateGuard)game.onGateGuardRelocated?.(wounded);wounded.isDown=false;wounded.rescueProgress=0;
      delete wounded.carrierId;delete wounded.downedInAid;delete wounded.downId;
      game.leaveRemains?.(wounded);
      if(isMerchantCasualty(wounded)) {
        game._merchantWounded=(game._merchantWounded||[]).filter(unit=>unit!==wounded);
        if(wounded.isMerchant)wounded.respawnIn=wounded.respawnDelay||210;
      } else game.phaseCasualties=(game.phaseCasualties||0)+1;
      game.showToast?.(`${wounded.name}は力尽きました`);
    }
  }
  updateCivilians(game,dt);
}

/** Town arrival is a valid delivery even when the trailing rope body is outside the field entrance radius. */
export function receiveTownCargo(game,town) {
  const station={id:`town-${town.id}`,kind:'town',name:town.name||'町'};
  for(const wounded of carriedSoldiers(game,game.player))revive(game,wounded,wounded.maxHp,{method:'BASE',station,suppressAidReward:!!wounded.downedInAid});
  for(const civ of carriedCivilians(game,game.player))grantCivilianRescueBonus(game,civ,station);
}
export function leaveCivilianSpace(game,space) {
  for(const civ of game.civilians||[])if(!civ.rescued&&(civ.rescueSpace===space||civ.carrierId==='player')){civ.x=game.player.x-28;civ.y=game.player.y+12;delete civ.rescueSpace;}
}

export function updateCivilians(game,dt) {
  if(!Array.isArray(game.civilians))game.civilians=[];
  for(const civ of game.civilians) {
    if(!civ||civ.rescued)continue;
    // 軽く佇む（牽引中は syncDragged 側）
    if(!civ.carrierId) {
      civ._idle=(civ._idle||0)+dt;
      if(civ._idle>2.5) {
        civ._idle=0;
        civ.x+=(Math.random()-0.5)*10;
        civ.y+=(Math.random()-0.5)*10;
      }
      continue;
    }
    const station=nearestCivilianStation(game,civ);
    if(station&&Math.hypot(civ.x-station.x,civ.y-station.y)<=station.radius) {
      grantCivilianRescueBonus(game,civ,station);
    }
  }
  // 救出済みは軽量に間引く（配列肥大防止）
  if(game.civilians.length>12) {
    game.civilians=game.civilians.filter(c=>c&&!c.rescued).concat(game.civilians.filter(c=>c&&c.rescued).slice(-2));
  }
}

/** 安全寄りの草地・廃墟付近に民間人を少数スポーン（軽量） */
export function ensureCiviliansSpawned(game, opts={}) {
  if(!game||game.currentDungeon)return;
  if(!Array.isArray(game.civilians))game.civilians=[];
  const living=game.civilians.filter(c=>c&&!c.rescued);
  const target=opts.targetCount??4;
  if(living.length>=target)return;
  const need=target-living.length;
  const spots=[];
  for(const d of game.dungeons||[]) {
    if(d.kind==='ruin'&&d.entrance) spots.push({x:d.entrance.x,y:d.entrance.y,spread:160});
    if(d.kind==='town'&&d.entrance) spots.push({x:d.entrance.x,y:d.entrance.y,spread:180});
  }
  for(const o of game.outposts||[]) {
    if(!o.cleared) spots.push({x:o.x,y:o.y,spread:200});
  }
  // 本陣外周の安全帯
  const cx=WORLD_SIZE/2,cy=WORLD_SIZE/2;
  spots.push({x:cx+420,y:cy-280,spread:140},{x:cx-380,y:cy+320,spread:140},{x:cx+500,y:cy+200,spread:120});
  if(!spots.length)return;
  const kinds=Object.keys(CIV_KINDS);
  let spawned=0,guard=0;
  while(spawned<need&&guard++<40) {
    const spot=spots[Math.floor(Math.random()*spots.length)];
    const ang=Math.random()*Math.PI*2;
    const dist=40+Math.random()*(spot.spread||120);
    const x=Math.max(80,Math.min(WORLD_SIZE-80,spot.x+Math.cos(ang)*dist));
    const y=Math.max(80,Math.min(WORLD_SIZE-80,spot.y+Math.sin(ang)*dist));
    // 本陣直近すぎ／他民間人と近すぎを避ける
    if(Math.hypot(x-cx,y-cy)<200)continue;
    if(living.some(c=>Math.hypot(c.x-x,c.y-y)<70))continue;
    const kind=kinds[Math.floor(Math.random()*kinds.length)];
    const def=CIV_KINDS[kind];
    const pool=CIV_NAME_POOL[kind]||['名無し'];
    const name=`${def.label}・${pool[Math.floor(Math.random()*pool.length)]}`;
    const civ={id:`civ_${Date.now().toString(36)}_${Math.floor(Math.random()*9999)}`,kind,name,x,y,rescued:false,r:10};
    game.civilians.push(civ);
    living.push(civ);
    spawned++;
  }
}

export function handleTransportAI(game,soldier,dt) {
  if(soldier.dead||soldier.isDown)return false;
  const carried=carriedSoldiers(game,soldier);
  // Medics treat in place; everyone else collects nearby casualties and returns to aid.
  const candidate=!isMedic(soldier)&&carried.length<carryingCapacity(soldier)?rescueUnits(game)
    .filter(s=>s!==soldier&&s.isDown&&!s.dead&&!s.carrierId&&isLocalRescueUnit(game,s)===isLocalRescueUnit(game,soldier)&&(!s.downedInAid||['medical','town'].includes(nearestCasualtyStation(game,s)?.kind))&&Math.hypot(s.x-soldier.x,s.y-soldier.y)<(carried.length?160:240))
    .sort((a,b)=>Math.hypot(a.x-soldier.x,a.y-soldier.y)-Math.hypot(b.x-soldier.x,b.y-soldier.y))[0]:null;
  if(candidate&&attachWounded(game,soldier,candidate))return true;
  const destination=candidate || (carried.length?nearest(casualtyStations(game,carried.some(isMerchantCasualty)?carried.find(isMerchantCasualty):soldier).filter(p=>p.kind!=='medical'||p.discovered),soldier):null);
  if(!destination)return false;
  const dx=destination.x-soldier.x,dy=destination.y-soldier.y,d=Math.hypot(dx,dy);
  if(d>1){const step=Math.min(d,(soldier.speed||80)*transportSpeedFactor(game,soldier)*dt);soldier.x+=dx/d*step;soldier.y+=dy/d*step;soldier.vx=dx/d;soldier.vy=dy/d;soldier.facingAngle=Math.atan2(dy,dx);}
  return true;
}
export function syncDragged(game,dt) {
  sanitizeCarriers(game);
  for(const carrier of [game.player,...(game.squad||[])].filter(Boolean)) {
    const list=[...carriedSoldiers(game,carrier),...carriedCivilians(game,carrier)];
    list.forEach((unit,i)=>{
      const angle=(carrier.facingAngle||0)+Math.PI+(list.length>1?(i?-.4:.4):0);
      const x=carrier.x+Math.cos(angle)*38,y=carrier.y+Math.sin(angle)*38;
      const blend=Math.min(1,dt*8);
      unit.x+=(x-unit.x)*blend;unit.y+=(y-unit.y)*blend;unit.vx=0;unit.vy=0;
      if((game.civilians||[]).includes(unit)){if(isLocalRescueUnit(game,carrier))unit.rescueSpace=game.currentDungeon.id;else delete unit.rescueSpace;}
    });
  }
}

export function orbDropChance(monster,distance) {
  if(monster.isColossal)return distance>=4400?.45:0;
  if(distance<2700)return 0;
  return monster.isBoss?.12:monster.isElite?.02:0;
}
