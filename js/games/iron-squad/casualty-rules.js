import {recordHealing} from './phase-rules.js';
import {WORLD_SIZE} from './world.js';

export const RESCUE_TIMEOUT = 45; // 救助猶予時間（秒）広域マップ対応で45秒に延長
export const isMedic=unit=>['MEDIC','HIGH_PRIEST'].includes(unit?.soldierClass);
export const carryingCapacity=unit=>{
  if(!unit) return 1;
  // 隊長（紐で引っ張る仲間）デフォルト2名・聖騎士2名・他兵士1名
  if(unit.isHero || unit.isPlayer) return 2;
  if(unit.soldierClass==='PALADIN') return 2;
  return 1;
};
export const carrierKey=(game,unit)=>unit===game.player?'player':unit?.id;
export const carriedSoldiers=(game,unit)=>!unit?[]:(game.squad||[]).filter(s=>s.isDown&&!s.dead&&s.carrierId===carrierKey(game,unit));
export const carriedCivilians=(game,unit)=>!unit?[]:(game.civilians||[]).filter(c=>c&&!c.rescued&&c.carrierId===carrierKey(game,unit));
export const carriedCount=(game,unit)=>carriedSoldiers(game,unit).length+carriedCivilians(game,unit).length;
export const transportSpeedFactor=(game,unit)=>{
  const n=carriedCount(game,unit);
  return n>1?.55:n?.72:1;
};
export const carrierOf=(game,wounded)=>wounded.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===wounded.carrierId);
export const hasActiveRopePull=game=>{
  const wounded=(game.squad||[]).some(s=>s&&s.isDown&&!s.dead&&s.carrierId);
  const civ=(game.civilians||[]).some(c=>c&&!c.rescued&&c.carrierId);
  return !!(wounded||civ);
};

/** 子供・女性・老人の紐救出ボーナス定義 */
export const CIV_KINDS={
  child:{kind:'child',label:'子供',icon:'🧒',gold:80,treasury:0,xp:8,toast:'子供を安全な場所へ送り届けた！'},
  woman:{kind:'woman',label:'女性',icon:'👩',gold:40,treasury:60,xp:12,toast:'女性を安全な場所へ送り届けた！'},
  elder:{kind:'elder',label:'老人',icon:'🧓',gold:30,treasury:40,xp:25,toast:'老人を安全な場所へ送り届けた！'}
};
const CIV_NAME_POOL={
  child:['タロウ','ハナ','ケン','ユイ','ソラ','リン'],
  woman:['アヤ','ミホ','サキ','ナナ','レイ','カオル'],
  elder:['ジロウ','ハツ','ゲン','トメ','サダ','キク']
};

export function aidStations(game) {
  return [{x:WORLD_SIZE/2,y:WORLD_SIZE/2,radius:150,name:'本陣'},...(game.outposts||[]).filter(o=>o.cleared).map(o=>({...o,radius:(o.radius||30)+24,name:o.name||'拠点'}))];
}
/** 民間人救出先：本陣・制圧拠点・宿場入口 */
export function civilianRescueStations(game) {
  const list=aidStations(game).map(s=>({...s,kind:'camp'}));
  for(const d of game.dungeons||[]) {
    if(d.kind==='town'&&(d.discovered||d.cleared)&&d.entrance) {
      list.push({x:d.entrance.x,y:d.entrance.y,radius:70,name:d.name||'宿場',kind:'town'});
    }
  }
  return list;
}
export function nearestAidStation(game,unit) {
  return aidStations(game).sort((a,b)=>Math.hypot(unit.x-a.x,unit.y-a.y)-Math.hypot(unit.x-b.x,unit.y-b.y))[0];
}
export function nearestCivilianStation(game,unit) {
  const stations=civilianRescueStations(game);
  return stations.sort((a,b)=>Math.hypot(unit.x-a.x,unit.y-a.y)-Math.hypot(unit.x-b.x,unit.y-b.y))[0];
}
export function attachWounded(game,carrier,wounded) {
  if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||!wounded?.isDown||wounded.dead||wounded===carrier||wounded.carrierId)return false;
  const distance=Math.hypot(carrier.x-wounded.x,carrier.y-wounded.y);
  if(wounded.releasedBy===carrierKey(game,carrier)) {if(distance<=65)return false;delete wounded.releasedBy;}
  if(distance>45||carriedCount(game,carrier)>=carryingCapacity(carrier))return false;
  delete wounded.releasedBy;wounded.carrierId=carrierKey(game,carrier);wounded.rescueProgress=0;delete wounded.rescueHealerId;
  return true;
}
export function attachCivilian(game,carrier,civ) {
  if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||!civ||civ.rescued||civ.carrierId)return false;
  if(carrier!==game.player&&!carrier.isHero)return false; // 民間人紐牽引は隊長のみ
  const distance=Math.hypot(carrier.x-civ.x,carrier.y-civ.y);
  if(civ.releasedBy===carrierKey(game,carrier)) {if(distance<=65)return false;delete civ.releasedBy;}
  if(distance>48||carriedCount(game,carrier)>=carryingCapacity(carrier))return false;
  delete civ.releasedBy;civ.carrierId=carrierKey(game,carrier);
  game.showToast?.(`${CIV_KINDS[civ.kind]?.icon||'🙏'} ${civ.name}を紐で牽引中 → 本陣・拠点・宿場へ`);
  return true;
}
export function releaseWounded(game,carrier) {
  for(const wounded of carriedSoldiers(game,carrier)){delete wounded.carrierId;wounded.releasedBy=carrierKey(game,carrier);}
  for(const civ of carriedCivilians(game,carrier)){delete civ.carrierId;civ.releasedBy=carrierKey(game,carrier);}
}
export function sanitizeCarriers(game) {
  const counts=new Map();
  const bump=(id)=>{const n=counts.get(id)||0;counts.set(id,n+1);return n;};
  for(const wounded of game.squad||[]) {
    if(!wounded.carrierId)continue;
    const carrier=carrierOf(game,wounded),count=bump(wounded.carrierId);
    if(!wounded.isDown||wounded.dead||!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||count>=carryingCapacity(carrier))delete wounded.carrierId;
  }
  for(const civ of game.civilians||[]) {
    if(!civ||civ.rescued||!civ.carrierId)continue;
    const carrier=civ.carrierId==='player'?game.player:(game.squad||[]).find(s=>s.id===civ.carrierId);
    const count=bump(civ.carrierId);
    if(!carrier||carrier.dead||carrier.isDown||carrier.hp<=0||count>=carryingCapacity(carrier))delete civ.carrierId;
  }
}
function revive(game,wounded,hp,options=null) {
  const carrier=carrierOf(game,wounded);
  wounded.isDown=false;wounded.hp=Math.max(1,Math.floor(hp));wounded.rescueProgress=0;wounded.downTimer=0;
  delete wounded.carrierId;delete wounded.rescueHealerId;delete wounded.rescueTargetId;
  if(options) {
    grantRescueBonus(game,wounded,{...options,carrier});
  } else {
    game.showToast?.(`${wounded.name}が復活しました`);
  }
}
export function grantRescueBonus(game,wounded,options={}) {
  const {method='BASE',medic=null,carrier=null}=options;
  if(!game||!wounded)return;

  const isBase=method==='BASE';
  const baseGold=isBase?200:100;
  const carrierBonusGold=carrier===game.player?50:0;
  const totalGold=baseGold+carrierBonusGold;

  // 1. 部隊軍資金
  game.gold=(game.gold||0)+totalGold;

  // 2. 昇進EXP & プレイヤーEXP
  const expGain=isBase?20:12;
  const pExpGain=isBase?30:20;
  if(typeof game.gainExp==='function') {
    game.gainExp(expGain);
  } else {
    game.exp=(game.exp||0)+expGain;
  }
  if(game.player) {
    game.player.exp=(game.player.exp||0)+pExpGain;
    let pGuard=0;
    while(game.player.exp>=(game.player.reqExp||20)&&pGuard++<30) {
      const req=Math.max(10,game.player.reqExp||20);
      game.player.exp-=req;
      game.player.level=(game.player.level||1)+1;
      game.player.reqExp=Math.floor(req*1.45+10);
      game.sound?.playHighScore?.();
      game.spawnDamageText?.(game.player.x,game.player.y-30,`⚡ Lv.${game.player.level} UP!`,'#34d399');
      game.showToast?.(`⚡ 救助功績でレベルアップ！ Lv.${game.player.level} に到達！`);
    }
  }

  // 3. 搬送者へのボーナス（快足ダッシュバフ・個人報酬）
  if(carrier) {
    if(carrier===game.player) {
      game.player.rescues=(game.player.rescues||0)+1;
      game.rescueBuffTimer=isBase?6.0:4.0;
      game.spawnDamageText?.(game.player.x,game.player.y-25,'✨ 救助の英雄！(高速ダッシュ)','#38bdf8');
    } else {
      carrier.gold=(carrier.gold||0)+(isBase?80:50);
      carrier.exp=(carrier.exp||0)+20;
      carrier.rescues=(carrier.rescues||0)+1;
      game.spawnDamageText?.(carrier.x,carrier.y-20,`🎖️ 搬送功績! +${isBase?80:50}G`,'#fbbf24');
    }
  }

  // 4. 衛生兵へのボーナス
  if(medic&&medic!==carrier) {
    medic.gold=(medic.gold||0)+50;
    medic.exp=(medic.exp||0)+20;
    medic.rescues=(medic.rescues||0)+1;
    game.spawnDamageText?.(medic.x,medic.y-20,'💚 救命功績! +50G','#34d399');
  }

  // 5. 救助された兵士へのボーナス（経験値・軍資金・生還シールド）
  const sExpGain = isBase ? 45 : 30;
  const sGoldGain = isBase ? 60 : 40;
  wounded.exp = (wounded.exp || 0) + sExpGain;
  wounded.gold = (wounded.gold || 0) + sGoldGain;
  wounded.timesRescued = (wounded.timesRescued || 0) + 1;
  wounded.shieldTimer = 3.0; // 3秒間被ダメージ半減シールド

  // 救助された兵士のレベルアップ判定
  let sGuard = 0;
  let didLevelUp = false;
  while (wounded.exp >= (wounded.reqExp || 14) && sGuard++ < 30) {
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

  // 6. 演出・サウンド・通知
  if(isBase) {
    game.sound?.playHighScore?.();
    game.spawnDamageText?.(wounded.x,wounded.y-30,`🚑 拠点救護成功! +${totalGold}G`,'#ffd700');
    const carrierName=carrier===game.player?'隊長':(carrier?carrier.name:null);
    const carrierTxt=carrierName?` (搬送: ${carrierName}に快足バフ)`:'';
    const lvTxt = didLevelUp ? ` ⚡Lv.${wounded.level}UP!` : '';
    game.showToast?.(`🚑 拠点救護成功！【${wounded.name}】が全快復帰！(+${totalGold}G, 昇進EXP+${expGain}, 兵士+${sExpGain}EXP/+${sGoldGain}G${carrierTxt}${lvTxt})`);
  } else {
    game.sound?.playItem?.();
    game.spawnDamageText?.(wounded.x,wounded.y-30,`💚 衛生兵救護成功! +${totalGold}G`,'#34d399');
    const carrierTxt=carrier===game.player?' (隊長に快足バフ)':'';
    const lvTxt = didLevelUp ? ` ⚡Lv.${wounded.level}UP!` : '';
    game.showToast?.(`💚 衛生救護！【${wounded.name}】が戦線復帰！(+${totalGold}G, 昇進EXP+${expGain}, 兵士+${sExpGain}EXP/+${sGoldGain}G${carrierTxt}${lvTxt})`);
  }

  game.updateStatsUI?.();
}

/** 民間人救出ボーナス（軍資金・国庫・経験・士気トースト） */
export function grantCivilianRescueBonus(game,civ,station) {
  if(!game||!civ||civ.rescued)return;
  const def=CIV_KINDS[civ.kind]||CIV_KINDS.child;
  civ.rescued=true;delete civ.carrierId;
  const gold=def.gold|0, treasury=def.treasury|0, xp=def.xp|0;
  if(gold) game.gold=(game.gold||0)+gold;
  if(treasury) game.treasury=(game.treasury||0)+treasury;
  if(xp) {
    if(typeof game.gainExp==='function') game.gainExp(xp);
    else game.exp=(game.exp||0)+xp;
  }
  game.civilianRescues=(game.civilianRescues||0)+1;
  game.moraleBonusTimer=Math.max(game.moraleBonusTimer||0, 8);
  const place=station?.name||'拠点';
  const parts=[];
  if(gold) parts.push(`軍資金+${gold}G`);
  if(treasury) parts.push(`国庫+${treasury}G`);
  if(xp) parts.push(`武勲+${xp}`);
  parts.push('士気向上');
  game.sound?.playHighScore?.();
  game.spawnDamageText?.(game.player?.x||civ.x,(game.player?.y||civ.y)-28,`${def.icon} 救出!`,'#fde68a');
  game.showToast?.(`${def.icon}【民間人救出】${def.toast}（${place}） ${parts.join(' / ')}`);
  game.updateStatsUI?.();
}

export function treatWounded(game,medic,wounded,dt) {
  if(!Number.isFinite(dt)||dt<=0||!isMedic(medic)||medic.dead||medic.isDown||medic.hp<=0||!wounded?.isDown||wounded.dead||Math.hypot(medic.x-wounded.x,medic.y-wounded.y)>40)return false;
  wounded.rescueProgress=(wounded.rescueProgress||0)+dt*(medic.soldierClass==='HIGH_PRIEST'?2.8:1.1);
  wounded.rescueHealerId=medic.id;
  if(wounded.rescueProgress<1)return false;
  revive(game,wounded,wounded.maxHp*.35,{method:'MEDIC',medic});recordHealing(medic,wounded.hp);return true;
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
    for(const wounded of game.squad||[])attachWounded(game,game.player,wounded);
    for(const civ of game.civilians||[]) {
      if(civ&&!civ.rescued)attachCivilian(game,game.player,civ);
    }
  }
  for(const wounded of game.squad||[]) {
    if(!wounded.isDown||wounded.dead)continue;
    wounded.hp=0;
    const station=nearestAidStation(game,wounded);
    if(Math.hypot(wounded.x-station.x,wounded.y-station.y)<=station.radius) {revive(game,wounded,wounded.maxHp,{method:'BASE'});continue;}
    if(wounded.carrierId)continue;
    wounded.downTimer=Math.max(0,(wounded.downTimer??RESCUE_TIMEOUT)-dt);
    if(wounded.downTimer<=0) {
      wounded.dead=true;wounded.isDown=false;wounded.rescueProgress=0;
      game.leaveRemains?.(wounded);
      game.phaseCasualties=(game.phaseCasualties||0)+1;
      game.showToast?.(`${wounded.name}は力尽きました`);
    }
  }
  updateCivilians(game,dt);
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
  const candidate=!isMedic(soldier)&&carried.length<carryingCapacity(soldier)?(game.squad||[])
    .filter(s=>s!==soldier&&s.isDown&&!s.dead&&!s.carrierId&&Math.hypot(s.x-soldier.x,s.y-soldier.y)<(carried.length?160:240))
    .sort((a,b)=>Math.hypot(a.x-soldier.x,a.y-soldier.y)-Math.hypot(b.x-soldier.x,b.y-soldier.y))[0]:null;
  if(candidate&&attachWounded(game,soldier,candidate))return true;
  const destination=candidate || (carried.length?nearestAidStation(game,soldier):null);
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
    });
  }
}

export function orbDropChance(monster,distance) {
  if(monster.isColossal)return distance>=4400?.45:0;
  if(distance<2700)return 0;
  return monster.isBoss?.12:monster.isElite?.02:0;
}
