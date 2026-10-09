import {catalogTier,catalogPrice,ensureMerchantCatalog,MERCHANT_MAX_TIER,MERCHANT_CATALOG_VERSION} from './merchant-catalog.js?v=129';
import {applyAttributeStats} from './unit-attributes.js';
/**
 * IRON SQUAD: 宿場・本陣・各地のキャンプの行商人
 * - 最新入手Tier+1（最大T6）の厳選品を販売、毎ウェーブの目玉商品
 * - 強い護衛付き。放置するとモンスターに襲われ死亡しうる
 * - 護衛が倒した強敵のドロップを序盤から掠め取れるチャンス
 */
import { saleValue, distanceScaling, weaponCombatProfile } from './equipment-rules.js?v=129';
import { drawFieldSoldier } from './visuals.js?v=129';
import { createSoldierAppearance, drawSoldierHead } from './soldier-appearance.js?v=129';
import { attackAnimationRate } from './weapon-motion.js?v=129';
import { markSoldierDown, rebuildMerchantCasualties, RESCUE_TIMEOUT } from './casualty-rules.js?v=129';
import {emptyMastery,normalizeMastery,hitGrowthMult,applyHitGrowth,masteryAtkMult,masteryReloadMult} from './growth-rules.js?v=129';
import {recordCombat,finishExperience} from './phase-rules.js';

export const MERCHANT_PRICE_MULT = 3.2; // 相場の約3.2倍（高め）
export const MERCHANT_STOCK_SIZE = 6;
export const MERCHANT_INTERACT_R = 72;
export const MERCHANT_AGGRO_R = 340;
export const MERCHANT_RESPAWN_SEC = 210; // 死亡後〜3.5分で再訪
export const ESCORT_COUNT = 2;
export const MERCHANT_HEAL_COST = 150;
export const MERCHANT_HEAL_WAIT_WAVES = 2;
export const CAMP_MERCHANT_CHANCE = .55;

function campRoll(seed,id) {
  let n=(Number(seed)>>>0)^2166136261;
  for(const ch of id) {n^=ch.charCodeAt(0);n=Math.imul(n,16777619);}
  n=Math.imul(n^(n>>>16),2246822519);n=Math.imul(n^(n>>>13),3266489917);
  return ((n^(n>>>16))>>>0)/4294967296;
}
export const campHasMerchant = (seed,id) => campRoll(seed,id)<CAMP_MERCHANT_CHANCE;

function prepareMerchant(m) {
  m.isMerchant=true;m.soldierClass='MERCHANT';m.respawnDelay=MERCHANT_RESPAWN_SEC;
  m.appearance ||= createSoldierAppearance(`${m.id}:merchant`);
  m.homeX ??= m.x;m.homeY ??= m.y;
  const colors=['#937650','#6a7861','#887063','#5c7780'];
  m.coatColor=colors[Math.floor(campRoll(0,`${m.id}:coat`)*colors.length)];
  m._faceActor={id:m.id,appearance:m.appearance,soldierClass:/ミレイ|ネラ/.test(m.name)?'MEDIC':'LIGHT'};
  return m;
}

function returnToBase(unit,dt) {
  const dx=unit.homeX-unit.x,dy=unit.homeY-unit.y,d=Math.hypot(dx,dy);
  if(d<4) {unit.x=unit.homeX;unit.y=unit.homeY;unit.returningToBase=false;unit.vx=unit.vy=0;return;}
  const step=Math.min(d,(unit.isMerchant?55:unit.speed||78)*dt);
  unit.x+=dx/d*step;unit.y+=dy/d*step;unit.vx=dx/d;unit.vy=dy/d;unit.facingAngle=Math.atan2(dy,dx);
}

export function localAreaMaxTier(distance) {
  const d = Math.max(0, distance || 0);
  if (d < 8000) return 2;
  if (d < 22000) return 3;
  if (d < 48000) return 4;
  return 5;
}

export function merchantSellTier(game) {return catalogTier(typeof game==='object'?game:{});}

export function merchantBuyPrice(item) {
  return catalogPrice(item);
}

function escortStats(distance, phase = 1) {
  const sc = distanceScaling(Math.max(1200, distance), phase);
  // 護衛は「そのエリアより一枚上手」：エリート寄り・プレイヤー序盤でも倒しがい
  const hp = Math.max(220, Math.round(260 * sc.hp * 1.35));
  const atk = Math.max(18, Math.round(22 * sc.atk * 1.25));
  return { hp, atk, speed: 78, radius: 15, def: 28, dmgReduction: 12 };
}

export function makeEscort(merchant, index, phase = 1) {
  const st = escortStats(merchant.distance, phase);
  const ang = (index / ESCORT_COUNT) * Math.PI * 2 + 0.4;
  return {
    id: `${merchant.id}_escort_${index}`,
    merchantId: merchant.id,
    isMerchantEscort: true,
    name: index === 0 ? '行商護衛・槍兵' : '行商護衛・斧兵',
    x: merchant.x + Math.cos(ang) * 42,
    y: merchant.y + Math.sin(ang) * 42,
    homeX: merchant.x,
    homeY: merchant.y,
    hp: st.hp,
    maxHp: st.hp,
    atk: st.atk,
    speed: st.speed,
    radius: st.radius,
    def: st.def,
    dmgReduction: st.dmgReduction,
    color: index === 0 ? '#94a3b8' : '#78716c',
    soldierClass: 'HEAVY', isNamed: true, level: 1,
    exp:0,reqExp:14,minionKills:0,bossKills:0,survivedWaves:0,hitGrowthPct:0,hitGrowthEvents:0,
    weaponMastery:emptyMastery(),favoriteWeapon:index===0?'spear':'hammer',atkSpeed:1,
    escortBaseStats:{hp:st.hp,atk:st.atk,def:st.def,speed:st.speed,dmgReduction:st.dmgReduction},
    equipped:{weapon:{id:`${merchant.id}_guard_weapon_${index}`,weaponStyle:index===0?'spear':'hammer',stats:{}}},
    appearance: createSoldierAppearance(`${merchant.id}_escort_${index}`),
    // Illustration equipment is separate from combat stats and loot rules.
    displayEquipment: {
      weapon:{weaponStyle:index===0?'spear':'axe',color:'#bdc5c2'},
      helmet:{color:index===0?'#94a3b8':'#aaa18e'},
      armor:{color:index===0?'#5e7484':'#766753'}, legs:{color:'#514f46'}
    },
    facingAngle:ang,attackAngle:ang,atkAnim:0,vx:0,vy:0,
    atkTimer: 0.2 * index,
    dead: false
  };
}

export function recalcEscortStats(esc) {
  if(!esc?.isMerchantEscort)return;
  esc.escortBaseStats ||= {hp:esc.maxHp||220,atk:esc.atk||18,def:esc.def||28,speed:esc.speed||78,dmgReduction:esc.dmgReduction||12};
  esc.weaponMastery=normalizeMastery(esc.weaponMastery);
  const base=esc.escortBaseStats,lv=esc.level||1,waves=esc.survivedWaves||0,kills=esc.minionKills||0,bosses=esc.bossKills||0;
  const oldMax=esc.maxHp||base.hp,oldHp=esc.hp||0;
  esc.maxHp=Math.floor((base.hp+(lv-1)*8+waves*14+Math.floor(kills/15)*6+bosses*45)*hitGrowthMult(esc));
  esc.hp=esc.isDown||oldHp<=0?0:Math.min(esc.maxHp,oldHp+Math.max(0,esc.maxHp-oldMax));
  const style=esc.equipped?.weapon?.weaponStyle||esc.favoriteWeapon||'sword';
  esc.atk=Math.floor((base.atk+(lv-1)*2+waves*3+Math.floor(kills/5)+bosses*8)*masteryAtkMult(esc.weaponMastery,style));
  esc.def=base.def;esc.speed=base.speed;
  esc.dmgReduction=Math.min(65,base.dmgReduction+Math.min(30,bosses*3));
  esc.atkSpeed=1;
  esc.dodge=0;applyAttributeStats(esc);
}
export function finishEscortPhase(game) {
  for(const esc of [...(game.merchants||[]).flatMap(m=>m.escorts||[]),...(game.gateGuards||[])])if(!esc.dead&&finishExperience(esc))recalcEscortStats(esc);
}
function damageEscortFallback(game,esc,raw) {
  const dmg=Math.max(1,Math.round(raw*100/(100+(esc.def||0)*1.2)*(1-Math.min(.4,(esc.dmgReduction||0)/100))));
  recordCombat(esc);esc.hp-=dmg;
  const growth=applyHitGrowth(esc,dmg);if(growth.gain>0){esc.hitGrowthEvents=(esc.hitGrowthEvents||0)+1;recalcEscortStats(esc);}
  if(esc.hp<=0)markSoldierDown(game,esc);
}

function buildStock(game,merchant,generate) {ensureMerchantCatalog(game,merchant,generate);return merchant.stock||[];}

function makeCampMerchant(game,site,generateRandomDrop,BASE_CAMP) {
  const distance=Math.hypot(site.x-BASE_CAMP.x,site.y-BASE_CAMP.y);
  const names=['行商・ルカ','行商・ネラ','行商・ボルグ','行商・ミレイ'];
  const name=names[Math.floor(campRoll(game.merchantCampSeed,`${site.id}:name`)*names.length)];
  const hp=180+Math.min(220,Math.round(distance/120));
  const m={id:`merchant_${site.id}`,placeKind:'field-camp',placeId:site.id,campX:site.x,campY:site.y,placeName:'野営キャンプ',
    icon:'🏕️',x:site.x+50,y:site.y+26,distance,hp,maxHp:hp,dead:false,respawnIn:0,
    stockRefreshIn:90,name,title:'【野営地の行商人】',healingUsed:false};
  m.stock=buildStock(game,m,generateRandomDrop);
  m.escorts=Array.from({length:ESCORT_COUNT},(_,i)=>makeEscort(m,i,game.phase||1));
  return prepareMerchant(m);
}

export function discoverCampMerchants(game,sites,generateRandomDrop,BASE_CAMP) {
  const byId=game._merchantById;
  for(const site of sites||[]) {
    if(!/^camp_\d+_\d+$/.test(site.id)||!Number.isFinite(site.x)||!Number.isFinite(site.y))continue;
    const id=`merchant_${site.id}`;
    if(byId.has(id)||!campHasMerchant(game.merchantCampSeed,site.id))continue;
    const m=makeCampMerchant(game,site,generateRandomDrop,BASE_CAMP);
    game.merchants.push(m);byId.set(m.id,m);
  }
}

export function initMerchants(game, generateRandomDrop, BASE_CAMP) {
  if(!Number.isInteger(game.merchantCampSeed))game.merchantCampSeed=Math.floor(Math.random()*4294967296);
  const phase = game.phase || 1;
  const merchants = [];

  // 1) 本陣キャンプ露店
  const camp = {
    id: 'merchant_base_camp',
    placeKind: 'camp',
    placeName: '本陣キャンプ',
    icon: '🏕️',
    x: BASE_CAMP.x - 210,
    y: BASE_CAMP.y + 160,
    distance: 210,
    hp: 180,
    maxHp: 180,
    dead: false,
    respawnIn: 0,
    stockRefreshIn: 0,
    name: '露天商・ガルド',
    title: '【本陣行商人】',healingUsed:false
  };
  camp.stock = buildStock(game,camp,generateRandomDrop);
  camp.escorts = Array.from({ length: ESCORT_COUNT }, (_, i) => makeEscort(camp, i, phase));
  merchants.push(camp);

  // 2) 各宿場入口そば
  for (const d of (game.dungeons || [])) {
    if (d.kind !== 'town') continue;
    const dist = Math.hypot(d.entrance.x - BASE_CAMP.x, d.entrance.y - BASE_CAMP.y);
    const ang = Math.atan2(d.entrance.y - BASE_CAMP.y, d.entrance.x - BASE_CAMP.x) + 0.9;
    const m = {
      id: `merchant_${d.id}`,
      placeKind: 'inn',
      placeName: d.name || '宿場',
      placeId: d.id,
      icon: '🏪',
      x: d.entrance.x + Math.cos(ang) * 95,
      y: d.entrance.y + Math.sin(ang) * 95,
      distance: dist,
      hp: 160 + Math.min(220, Math.round(dist / 120)),
      maxHp: 160 + Math.min(220, Math.round(dist / 120)),
      dead: false,
      respawnIn: 0,
      stockRefreshIn: 0,
      name: dist < 5000 ? '行商・ミレイ' : (dist < 20000 ? '行商・ボルグ' : '行商・ネラ'),
      title: '【宿場行商人】',healingUsed:false
    };
    m.maxHp = m.hp;
    m.stock = buildStock(game,m,generateRandomDrop);
    m.escorts = Array.from({ length: ESCORT_COUNT }, (_, i) => makeEscort(m, i, phase));
    merchants.push(m);
  }

  game.merchants = merchants;
  for(const m of merchants)prepareMerchant(m);
  game._merchantWounded=[];
  game._merchantById=new Map(merchants.map(m=>[m.id,m]));
  return merchants;
}

export function ensureMerchants(game, generateRandomDrop, BASE_CAMP) {
  if (!game.merchants || !game.merchants.length) {
    initMerchants(game, generateRandomDrop, BASE_CAMP);
  }
  if(!game._merchantById||game._merchantById.size!==game.merchants.length)game._merchantById=new Map(game.merchants.map(m=>[m.id,m]));
  discoverCampMerchants(game,game.worldTerrain?.visibleCamps,generateRandomDrop,BASE_CAMP);
  return game.merchants;
}

export function merchantHealWavesLeft(game,m) {
  const phase=game.phase||game.wave||1;
  // Convert the previous one-use service to a single saved cooldown.
  if(m?.healingUsed&&!Number.isInteger(m.healReadyPhase))m.healReadyPhase=phase+MERCHANT_HEAL_WAIT_WAVES;
  return Math.max(0,(m?.healReadyPhase||0)-phase);
}
export function merchantHealingStatus(game,m) {
  if(!m||m.dead||m.isDown||m.returningToBase||m.hp<=0||!game.player||game.player.hp<=0||!(game.merchants||[]).includes(m))return 'unavailable';
  if(merchantHealWavesLeft(game,m)>0)return 'cooldown';
  if(game.currentDungeon) {
    if(game.currentDungeon.kind!=='town'||m.placeId!==game.currentDungeon.id)return 'unavailable';
  } else if(Math.hypot(game.player.x-m.x,game.player.y-m.y)>MERCHANT_INTERACT_R+40)return 'unavailable';
  if(!(game.player.maxHp>0)||game.player.hp>=game.player.maxHp)return 'full';
  if(!(game.gold>=MERCHANT_HEAL_COST))return 'poor';
  return 'available';
}

export function useMerchantHealing(game,m) {
  const reason=merchantHealingStatus(game,m);
  if(reason!=='available')return {ok:false,reason};
  const restored=game.player.maxHp-game.player.hp;
  game.gold-=MERCHANT_HEAL_COST;game.player.hp=game.player.maxHp;m.healingUsed=true;
  m.healReadyPhase=(game.phase||game.wave||1)+MERCHANT_HEAL_WAIT_WAVES;
  return {ok:true,restored,cost:MERCHANT_HEAL_COST};
}

export function livingEscorts(merchant) {
  return (merchant.escorts || []).filter(e => e && !e.dead && !e.isDown && e.hp > 0);
}

export function nearestLivingMerchant(game, x, y, maxR = MERCHANT_INTERACT_R) {
  let best = null, bestD = maxR;
  for (const m of (game.merchants || [])) {
    if (!m || m.dead || m.isDown || m.returningToBase) continue;
    // 宿場内にいるときは、その宿場の商人を会話可能に（入口外にいる商人）
    if (game.currentDungeon && game.currentDungeon.kind === 'town') {
      if (m.placeId === game.currentDungeon.id) return m;
      continue;
    }
    if (game.currentDungeon) continue;
    const d = Math.hypot(m.x - x, m.y - y);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

export function refreshMerchantStock(merchant, generateRandomDrop, phase = 1, game=null) {
  if(!merchant||merchant.dead)return;
  const context=game||{phase,merchantEquipmentTier:Math.max(1,(merchant.stockTier||2)-1)};
  merchant.stock=buildStock(context,merchant,generateRandomDrop);
}

/**
 * 護衛AI＋商人被弾・死亡・リスポーン。
 * @param {object} hooks { damageMonster(attacker, monster), onMerchantDied(m), onMerchantRespawn(m) }
 */
export function updateEscortPatrol(game,m,dt,monsters,hooks={}) {
    // 護衛行動
    for (const esc of (m.escorts || [])) {
      if (!esc || esc.dead || esc.isDown) {
        if (esc && !esc.isDown) esc.dead = true;
        continue;
      }
      esc.vx=0;esc.vy=0;
      if(esc.shieldTimer>0)esc.shieldTimer=Math.max(0,esc.shieldTimer-dt);
      esc.atkAnim=Math.max(0,(esc.atkAnim||0)-dt*attackAnimationRate(esc.displayEquipment?.weapon));
      // 近くの敵を探す
      const homeX=esc.rescuedToBase?esc.homeX:m.x,homeY=esc.rescuedToBase?esc.homeY:m.y;
      if(esc.returningToBase) {returnToBase(esc,dt);continue;}
      let target = null, tDist = MERCHANT_AGGRO_R;
      for (const mon of monsters) {
        if (!mon || mon.hp <= 0) continue;
        if((esc.rescuedToBase||m.rescuedToBase)&&Math.hypot(mon.x-homeX,mon.y-homeY)>180)continue;
        const d = Math.hypot(mon.x - esc.x, mon.y - esc.y);
        if (d < tDist) { tDist = d; target = mon; }
      }
      // 商人から離れすぎたら帰宅
      const homeD = Math.hypot(esc.x - homeX, esc.y - homeY);
      if (!target && homeD > 55) {
        const ang = Math.atan2(homeY - esc.y, homeX - esc.x);
        esc.x += Math.cos(ang) * esc.speed * dt * 0.7;
        esc.y += Math.sin(ang) * esc.speed * dt * 0.7;
        esc.facingAngle=ang;esc.vx=Math.cos(ang);esc.vy=Math.sin(ang);
        continue;
      }
      if (!target) continue;
      const profile=weaponCombatProfile(esc.equipped?.weapon);
      const contactRange=profile.style==='spear'?Math.max(esc.radius+(target.radius||14),profile.reach*.55):Math.max(52,esc.radius+(target.radius||14));
      if (tDist > contactRange) {
        const ang = Math.atan2(target.y - esc.y, target.x - esc.x);
        esc.x += Math.cos(ang) * esc.speed * dt;
        esc.y += Math.sin(ang) * esc.speed * dt;
        esc.facingAngle=ang;esc.vx=Math.cos(ang);esc.vy=Math.sin(ang);
      } else {
        esc.atkTimer = (esc.atkTimer || 0) - dt;
        if (esc.atkTimer <= 0) {
          esc.atkTimer = 0.85*masteryReloadMult(esc.weaponMastery,profile.style)/(esc.atkSpeed||1);
          esc.facingAngle=Math.atan2(target.y-esc.y,target.x-esc.x);
          esc.attackAngle=esc.facingAngle;esc.atkAnim=1;
          hooks.damageMonster?.(esc, target, esc.atk);
        }
      }
    }

}

export function updateMerchants(game, dt, generateRandomDrop, hooks = {}) {
  const merchants = game.merchants || [];
  if (!merchants.length || !(dt > 0)) return;
  if (game.currentDungeon) {
    // ダンジョン内はフィールド更新スキップ（会話のみ許可）
    return;
  }
  const phase = game.phase || 1;
  const monsters = game.monsters || [];

  for (const m of merchants) {
    if (m.dead) {
      m.respawnIn = (m.respawnIn || MERCHANT_RESPAWN_SEC) - dt;
      if (m.respawnIn <= 0) {
        m.dead = false;
        m.hp = m.maxHp;
        m.stock = buildStock(game,m,generateRandomDrop);
        m.escorts = Array.from({ length: ESCORT_COUNT }, (_, i) => m.escorts?.[i]&&!m.escorts[i].dead?m.escorts[i]:makeEscort(m,i,phase));
        m.respawnIn = 0;
        hooks.onMerchantRespawn?.(m);
      }
    }

    if(!m.dead&&m.stockPhase!==phase)buildStock(game,m,generateRandomDrop);
    if(m.returningToBase&&!m.isDown)returnToBase(m,dt);
    // Discovered camps persist, but distant caravans do not run full escort AI.
    const nearPlayer=game.player&&Math.hypot(m.x-game.player.x,m.y-game.player.y)<850;
    const nearView=game.camera&&Math.hypot(m.x-game.camera.x,m.y-game.camera.y)<850;
    const activeEscort=(m.escorts||[]).some(e=>!e.dead&&(e.returningToBase||(e.rescuedToBase&&game.player&&Math.hypot(e.x-game.player.x,e.y-game.player.y)<850)));
    if(!nearPlayer&&!nearView&&!activeEscort&&!monsters.some(mon=>mon&&mon.hp>0&&Math.hypot(mon.x-m.x,mon.y-m.y)<MERCHANT_AGGRO_R+160))continue;

    updateEscortPatrol(game,m,dt,monsters,hooks);

    // 敵が商人に接触 → 護衛が少ないと商人も削られる
    const escortsAlive = livingEscorts(m).length;
    for (const mon of monsters) {
      if (!mon || mon.hp <= 0) continue;
      const d = Math.hypot(mon.x - m.x, mon.y - m.y);
      // 護衛がいる間は商人へのヘイトは薄い
      if (!m.dead && !m.isDown && d <= (mon.radius || 14) + 16) {
        mon._merchantAtk = (mon._merchantAtk || 0) - dt;
        if (mon._merchantAtk <= 0) {
          mon._merchantAtk = 1.05;
          const raw = Math.max(1, Math.round((mon.atk || 10) * (escortsAlive > 0 ? 0.35 : 1)));
          m.hp -= raw;
          if (m.hp <= 0) {
            markSoldierDown(game,m);
            game.showToast?.(`${m.name}が負傷！紐で本陣へ救助できます`);
          }
        }
      }
      // 護衛へヘイト（近い護衛を殴る）
      for (const esc of livingEscorts(m)) {
        const ed = Math.hypot(mon.x - esc.x, mon.y - esc.y);
        if (ed <= (mon.radius || 14) + esc.radius) {
          mon._escortAtk = (mon._escortAtk || 0) - dt;
          if ((mon._escortAtk || 0) <= 0) {
            mon._escortAtk = 1.0;
            if(hooks.damageEscort)hooks.damageEscort(esc,mon.atk||10);
            else damageEscortFallback(game,esc,mon.atk||10);
          }
        }
      }
    }
  }
}

const ESCORT_CLASS={name:'行商護衛',isAdvanced:false};
export function drawMerchantEscort(ctx,esc,now=0,simple=false) {
  if(!esc||esc.dead||(!esc.isDown&&esc.hp<=0))return;
  drawFieldSoldier(ctx,esc,now,ESCORT_CLASS,'#b69d72',simple,esc.displayEquipment);
  ctx.save();ctx.font='8px sans-serif';ctx.textAlign='center';
  const label=`${esc.isGateGuard?'門番':esc.displayEquipment?.weapon.weaponStyle==='spear'?'護衛・槍':'護衛・斧'} Lv.${esc.level||1}`;
  const width=ctx.measureText(label).width+6;
  ctx.fillStyle='rgba(18,24,25,.82)';ctx.fillRect(esc.x-width/2,esc.y+8,width,11);
  ctx.fillStyle='#d4c5a2';ctx.fillText(label,esc.x,esc.y+16);ctx.restore();
}

const merchantShape=(c,points,color)=>{c.fillStyle=color;c.strokeStyle='#34342d';c.lineWidth=.8;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();c.stroke();};
function drawMerchantPerson(ctx,m) {
  if(!m._faceActor)prepareMerchant(m);
  ctx.save();ctx.translate(m.x,m.y);
  ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,2,m.isDown?18:10,3.5,0,0,Math.PI*2);ctx.fill();
  if(m.isDown){ctx.translate(16,-1);ctx.rotate(-Math.PI/2);}
  ctx.fillStyle='#454338';ctx.fillRect(-5,-10,4,10);ctx.fillRect(2,-10,4,10);
  ctx.fillStyle='#322b24';ctx.fillRect(-6,-1,6,3);ctx.fillRect(1,-1,6,3);
  merchantShape(ctx,[[-6,-25],[5,-25],[8,-12],[6,-5],[-7,-5],[-8,-16]],m.coatColor);
  merchantShape(ctx,[[-4,-24],[2,-24],[2,-11],[-3,-8]],'#cfbb91');
  merchantShape(ctx,[[-8,-24],[-12,-21],[-11,-9],[-7,-7]],'#63503c');
  ctx.strokeStyle='#bda77b';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,-24);ctx.lineTo(7,-12);ctx.stroke();
  merchantShape(ctx,[[4,-15],[11,-15],[12,-8],[5,-7]],'#8f643f');
  ctx.fillStyle='#c9b17b';ctx.fillRect(7,-13,2,2);
  ctx.strokeStyle=m.coatColor;ctx.lineWidth=3.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(5,-22);ctx.lineTo(10,-17);ctx.lineTo(8,-14);ctx.stroke();
  ctx.fillStyle=m.appearance.skin;ctx.beginPath();ctx.ellipse(8,-14,2,2,0,0,Math.PI*2);ctx.fill();
  drawSoldierHead(ctx,m._faceActor,{y:-31,small:true});
  // Wide felt brim and a band distinguish traders from metal-clad guards.
  merchantShape(ctx,[[-6,-34],[-5,-39],[3,-40],[6,-34]],'#776b4c');
  ctx.fillStyle='#cbb589';ctx.fillRect(-5,-35,10,1.5);
  ctx.strokeStyle='#554c36';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-9,-33);ctx.lineTo(9,-33);ctx.stroke();
  ctx.restore();
  if(m.isDown) {
    ctx.save();ctx.textAlign='center';ctx.font='10px sans-serif';ctx.fillStyle='#e6d7b8';
    ctx.fillText(m.carrierId?'商人・搬送中':`商人・救助 ${Math.ceil(m.downTimer||0)}秒`,m.x,m.y-18);ctx.restore();
  }
}

export function drawMerchantBody(ctx,m) {
  if(!m||m.dead)return;
  if(m.isDown){drawMerchantPerson(ctx,m);return;}
  ctx.save();
  ctx.translate(-42,-5);
    // 商人本体（幌馬車っぽい箱）
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(m.x + 3, m.y + 14, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(m.x - 18, m.y - 10, 36, 22);
    ctx.fillStyle='#473b2d';ctx.fillRect(m.x-18,m.y+6,36,2);
    ctx.fillStyle='#998162';ctx.fillRect(m.x-17,m.y-9,1,19);ctx.fillRect(m.x+15,m.y-9,1,19);
    for(const offset of [-12,-2,8]) {ctx.fillStyle=offset===-2?'#9aab8d':'#b59263';ctx.fillRect(m.x+offset,m.y-5,6,8);}
    ctx.fillStyle = '#98865d';
    ctx.beginPath();
    ctx.moveTo(m.x - 20, m.y - 8);
    ctx.lineTo(m.x, m.y - 28);
    ctx.lineTo(m.x + 20, m.y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle='#c4b991';ctx.fillRect(m.x-20,m.y-8,40,4);
    ctx.fillStyle='#89754f';for(let i=0;i<5;i++)ctx.fillRect(m.x-20+i*8,m.y-8,4,4);
    ctx.fillStyle='#39372c';for(const offset of [-13,13]) {ctx.beginPath();ctx.ellipse(m.x+offset,m.y+13,4,4,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a79470';ctx.fillRect(m.x+offset-.7,m.y+12,1.4,2);ctx.fillStyle='#39372c';}
  ctx.restore();
  drawMerchantPerson(ctx,m);
  ctx.save();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${m.icon || '🏪'} ${m.name}`, m.x-18, m.y - 53);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${m.placeName} · T${m.stockTier||2}帯`, m.x-18, m.y - 41);
    const ratio = Math.max(0, m.hp / Math.max(1, m.maxHp));
    ctx.fillStyle = '#1e293b'; ctx.fillRect(m.x - 16, m.y + 16, 32, 3);
    ctx.fillStyle = '#f87171'; ctx.fillRect(m.x - 16, m.y + 16, 32 * ratio, 3);
  ctx.restore();
}

export function drawMerchants(ctx,game,camera,viewW,viewH,zoom,now=0) {
  if(!ctx||game.currentDungeon)return;
  const z=zoom||1,hw=viewW/(2*z)+100,hh=viewH/(2*z)+100;
  const visible=o=>Math.abs(o.x-camera.x)<hw&&Math.abs(o.y-camera.y)<hh;
  for(const m of game.merchants||[]) {
    if(!m)continue;
    for(const esc of m.escorts||[])if(!esc.dead&&visible(esc))drawMerchantEscort(ctx,esc,now);
    if(!m.dead&&visible(m))drawMerchantBody(ctx,m);
  }
}

export function serializeMerchants(merchants) {
  return (merchants || []).map(m => ({
    id: m.id,
    ...npcSave(m),campX:m.campX,campY:m.campY,distance:m.distance,
    escorts:(m.escorts||[]).map(e=>({id:e.id,...npcSave(e),atk:e.atk,def:e.def,dmgReduction:e.dmgReduction})),
    placeKind:m.placeKind,placeId:m.placeId,x:m.x,y:m.y,
    healingUsed:!!m.healingUsed,
    healReadyPhase:m.healReadyPhase,
    dead: !!m.dead,
    hp: m.hp,
    respawnIn: m.respawnIn || 0,
    stockIds: (m.stock || []).map(i => i?.id).filter(Boolean),
    stock:(m.stock||[]).map(i=>({...i,stats:{...i.stats}})),stockPhase:m.stockPhase,stockTier:m.stockTier,catalogVersion:m.catalogVersion,featuredSoldPhase:m.featuredSoldPhase
  }));
}

export function applyMerchantSave(game, savedList, generateRandomDrop, BASE_CAMP) {
  ensureMerchants(game, generateRandomDrop, BASE_CAMP);
  if (!savedList || !Array.isArray(savedList)) return;
  for (const s of savedList) {
    let m = game._merchantById.get(s.id);
    if(!m&&s.placeKind==='field-camp'&&/^camp_\d+_\d+$/.test(s.placeId)&&s.id===`merchant_${s.placeId}`&&Number.isFinite(s.x)&&Number.isFinite(s.y)) {
      m=makeCampMerchant(game,{id:s.placeId,x:Number.isFinite(s.campX)?s.campX:s.x-50,y:Number.isFinite(s.campY)?s.campY:s.y-26},generateRandomDrop,BASE_CAMP);
      game.merchants.push(m);game._merchantById.set(m.id,m);
    }
    if (!m) continue;
    applyNpcSave(m,s);
    m.featuredSoldPhase=Math.max(0,Number(s.featuredSoldPhase)||0);
    if(s.catalogVersion===MERCHANT_CATALOG_VERSION&&Array.isArray(s.stock)){m.stock=s.stock.filter(i=>i&&i.tier>=1&&i.tier<=MERCHANT_MAX_TIER&&!i.dropOnly).map(i=>({...i,stats:{...i.stats}}));m.stockPhase=s.stockPhase;m.stockTier=s.stockTier;m.catalogVersion=MERCHANT_CATALOG_VERSION;}
    ensureMerchantCatalog(game,m,generateRandomDrop);
    if(Number.isFinite(s.distance))m.distance=s.distance;
    if(m.rescuedToBase)m.placeName='本陣・救助した商人';
    for(const savedEscort of s.escorts||[]) {
      const escort=m.escorts.find(e=>e.id===savedEscort.id);
      if(escort)applyNpcSave(escort,savedEscort);
    }
    m.healingUsed=!!s.healingUsed;
    m.healReadyPhase=Number.isInteger(s.healReadyPhase)?s.healReadyPhase:(m.healingUsed?(game.phase||1)+MERCHANT_HEAL_WAIT_WAVES:0);
    if (s.dead) {
      m.dead = true;
      m.hp = 0;
      m.respawnIn = s.respawnIn > 0 ? s.respawnIn : MERCHANT_RESPAWN_SEC;
      if(!Array.isArray(s.escorts))for (const e of (m.escorts || [])) e.dead = true;
    } else if (Number.isFinite(s.hp)) {
      m.hp = Math.min(m.maxHp, Math.max(0, s.hp));
    }
  }
  rebuildMerchantCasualties(game);
}

export function npcSave(unit) {
  const result={};
  for(const key of ['x','y','hp','maxHp','isDown','dead','downTimer','carrierId','homeX','homeY','timesDown','timesRescued','rescuedThisDown','downedInAid','downId','rescuedToBase','returningToBase','rescueRewardGranted','rescueReward','level','exp','reqExp','minionKills','bossKills','survivedWaves','hitGrowthPct','hitGrowthEvents','weaponMastery','favoriteWeapon','phaseActivity','escortBaseStats','attributeProfile'])if(unit[key]!==undefined)result[key]=unit[key];
  return result;
}
export function applyNpcSave(unit,saved) {
  for(const key of ['x','y','hp','maxHp','downTimer','homeX','homeY','timesDown','timesRescued','downId','atk','def','dmgReduction','level','exp','reqExp','minionKills','bossKills','survivedWaves','hitGrowthPct','hitGrowthEvents'])if(Number.isFinite(saved[key]))unit[key]=saved[key];
  if(saved.weaponMastery)unit.weaponMastery=normalizeMastery(saved.weaponMastery);
  if(saved.attributeProfile){unit.attributeProfile=structuredClone(saved.attributeProfile);unit._attributesNormalized=false;}
  if(saved.escortBaseStats)unit.escortBaseStats=saved.escortBaseStats;
  else if(unit.isMerchantEscort&&Number.isFinite(saved.maxHp))unit.escortBaseStats={hp:saved.maxHp,atk:saved.atk||unit.atk,def:saved.def??unit.def,speed:unit.speed,dmgReduction:saved.dmgReduction??unit.dmgReduction};
  if(saved.phaseActivity)unit.phaseActivity=saved.phaseActivity;
  if(saved.favoriteWeapon)unit.favoriteWeapon=saved.favoriteWeapon;
  for(const key of ['isDown','dead','rescuedThisDown','downedInAid','rescuedToBase','returningToBase'])unit[key]=!!saved[key];
  unit.rescueRewardGranted=saved.rescueRewardGranted===undefined?!!saved.rescuedToBase:!!saved.rescueRewardGranted;
  if(saved.rescueReward)unit.rescueReward=saved.rescueReward;
  if(typeof saved.carrierId==='string')unit.carrierId=saved.carrierId;
  if(unit.isDown){unit.hp=0;unit.downTimer=Math.max(0,unit.downTimer??RESCUE_TIMEOUT);}
}
