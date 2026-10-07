/**
 * IRON SQUAD: 宿場・本陣キャンプの行商人
 * - エリア最大Tier+1の品を高値で販売（日本語UI）
 * - 強い護衛付き。放置するとモンスターに襲われ死亡しうる
 * - 護衛が倒した強敵のドロップを序盤から掠め取れるチャンス
 */
import { saleValue, distanceScaling } from './equipment-rules.js?v=95';

export const MERCHANT_PRICE_MULT = 3.2; // 相場の約3.2倍（高め）
export const MERCHANT_STOCK_SIZE = 6;
export const MERCHANT_INTERACT_R = 72;
export const MERCHANT_AGGRO_R = 340;
export const MERCHANT_RESPAWN_SEC = 210; // 死亡後〜3.5分で再訪
export const ESCORT_COUNT = 2;

export function localAreaMaxTier(distance) {
  const d = Math.max(0, distance || 0);
  if (d < 8000) return 2;
  if (d < 22000) return 3;
  if (d < 48000) return 4;
  return 5;
}

export function merchantSellTier(distance) {
  return Math.min(7, localAreaMaxTier(distance) + 1);
}

export function merchantBuyPrice(item) {
  return Math.max(1, Math.floor(saleValue(item) * MERCHANT_PRICE_MULT));
}

function escortStats(distance, phase = 1) {
  const sc = distanceScaling(Math.max(1200, distance), phase);
  // 護衛は「そのエリアより一枚上手」：エリート寄り・プレイヤー序盤でも倒しがい
  const hp = Math.max(220, Math.round(260 * sc.hp * 1.35));
  const atk = Math.max(18, Math.round(22 * sc.atk * 1.25));
  return { hp, atk, speed: 78, radius: 15, def: 28, dmgReduction: 12 };
}

function makeEscort(merchant, index, phase = 1) {
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
    atkTimer: 0.2 * index,
    dead: false
  };
}

function buildStock(generateRandomDrop, distance, phase = 1) {
  const tierTarget = merchantSellTier(distance);
  // lootDistance を少し盛って目標Tier帯へ寄せる
  const lootDist = distance < 8000 ? 9000
    : distance < 22000 ? 24000
    : distance < 48000 ? 50000
    : 62000;
  const stock = [];
  let guard = 0;
  while (stock.length < MERCHANT_STOCK_SIZE && guard++ < 40) {
    const kind = Math.random() < 0.22 ? 'elite' : 'normal';
    const item = generateRandomDrop(lootDist, kind);
    if (!item) continue;
    // 目標Tier未満は弾いて、+1帯を優先
    if ((item.tier || 1) < tierTarget && Math.random() < 0.7) continue;
    if ((item.tier || 1) > tierTarget + 1) continue;
    item._merchantPrice = merchantBuyPrice(item);
    stock.push(item);
  }
  while (stock.length < MERCHANT_STOCK_SIZE) {
    const item = generateRandomDrop(lootDist, 'elite');
    if (!item) break;
    item._merchantPrice = merchantBuyPrice(item);
    stock.push(item);
  }
  return stock;
}

export function initMerchants(game, generateRandomDrop, BASE_CAMP) {
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
    title: '【本陣行商人】'
  };
  camp.stock = buildStock(generateRandomDrop, camp.distance, phase);
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
      title: '【宿場行商人】'
    };
    m.maxHp = m.hp;
    m.stock = buildStock(generateRandomDrop, m.distance, phase);
    m.escorts = Array.from({ length: ESCORT_COUNT }, (_, i) => makeEscort(m, i, phase));
    merchants.push(m);
  }

  game.merchants = merchants;
  return merchants;
}

export function ensureMerchants(game, generateRandomDrop, BASE_CAMP) {
  if (!game.merchants || !game.merchants.length) {
    initMerchants(game, generateRandomDrop, BASE_CAMP);
  }
  return game.merchants;
}

export function livingEscorts(merchant) {
  return (merchant.escorts || []).filter(e => e && !e.dead && e.hp > 0);
}

export function nearestLivingMerchant(game, x, y, maxR = MERCHANT_INTERACT_R) {
  let best = null, bestD = maxR;
  for (const m of (game.merchants || [])) {
    if (!m || m.dead) continue;
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

export function refreshMerchantStock(merchant, generateRandomDrop, phase = 1) {
  if (!merchant || merchant.dead) return;
  merchant.stock = buildStock(generateRandomDrop, merchant.distance, phase);
  merchant.stockRefreshIn = 90;
}

/**
 * 護衛AI＋商人被弾・死亡・リスポーン。
 * @param {object} hooks { damageMonster(attacker, monster), onMerchantDied(m), onMerchantRespawn(m) }
 */
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
        m.stock = buildStock(generateRandomDrop, m.distance, phase);
        m.escorts = Array.from({ length: ESCORT_COUNT }, (_, i) => makeEscort(m, i, phase));
        m.respawnIn = 0;
        hooks.onMerchantRespawn?.(m);
      }
      continue;
    }

    m.stockRefreshIn = Math.max(0, (m.stockRefreshIn || 0) - dt);

    // 護衛行動
    for (const esc of (m.escorts || [])) {
      if (!esc || esc.dead || esc.hp <= 0) {
        if (esc) esc.dead = true;
        continue;
      }
      // 近くの敵を探す
      let target = null, tDist = MERCHANT_AGGRO_R;
      for (const mon of monsters) {
        if (!mon || mon.hp <= 0) continue;
        const d = Math.hypot(mon.x - esc.x, mon.y - esc.y);
        if (d < tDist) { tDist = d; target = mon; }
      }
      // 商人から離れすぎたら帰宅
      const homeD = Math.hypot(esc.x - m.x, esc.y - m.y);
      if (!target && homeD > 55) {
        const ang = Math.atan2(m.y - esc.y, m.x - esc.x);
        esc.x += Math.cos(ang) * esc.speed * dt * 0.7;
        esc.y += Math.sin(ang) * esc.speed * dt * 0.7;
        continue;
      }
      if (!target) continue;
      if (tDist > (esc.radius + (target.radius || 14))) {
        const ang = Math.atan2(target.y - esc.y, target.x - esc.x);
        esc.x += Math.cos(ang) * esc.speed * dt;
        esc.y += Math.sin(ang) * esc.speed * dt;
      } else {
        esc.atkTimer = (esc.atkTimer || 0) - dt;
        if (esc.atkTimer <= 0) {
          esc.atkTimer = 0.85;
          hooks.damageMonster?.(esc, target, esc.atk);
        }
      }
    }

    // 敵が商人に接触 → 護衛が少ないと商人も削られる
    const escortsAlive = livingEscorts(m).length;
    for (const mon of monsters) {
      if (!mon || mon.hp <= 0) continue;
      const d = Math.hypot(mon.x - m.x, mon.y - m.y);
      // 護衛がいる間は商人へのヘイトは薄い
      if (escortsAlive > 0 && d > 28) continue;
      if (d <= (mon.radius || 14) + 16) {
        mon._merchantAtk = (mon._merchantAtk || 0) - dt;
        if (mon._merchantAtk <= 0) {
          mon._merchantAtk = 1.05;
          const raw = Math.max(1, Math.round((mon.atk || 10) * (escortsAlive > 0 ? 0.35 : 1)));
          m.hp -= raw;
          if (m.hp <= 0) {
            m.hp = 0;
            m.dead = true;
            m.respawnIn = MERCHANT_RESPAWN_SEC;
            for (const esc of (m.escorts || [])) {
              if (esc && !esc.dead) esc.dead = true;
            }
            hooks.onMerchantDied?.(m);
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
            let dmg = Math.max(1, Math.round(mon.atk || 10));
            const defF = 100 / (100 + (esc.def || 0) * 1.2);
            const red = Math.min(0.4, (esc.dmgReduction || 0) / 100);
            dmg = Math.max(1, Math.round(dmg * defF * (1 - red)));
            esc.hp -= dmg;
            if (esc.hp <= 0) {
              esc.hp = 0;
              esc.dead = true;
            }
          }
        }
      }
    }
  }
}

export function drawMerchants(ctx, game, camera, viewW, viewH, zoom) {
  if (!ctx || game.currentDungeon) return;
  const z = zoom || 1;
  const margin = 80;
  const halfW = viewW / (2 * z) + margin;
  const halfH = viewH / (2 * z) + margin;
  for (const m of (game.merchants || [])) {
    if (!m || m.dead) continue;
    if (Math.abs(m.x - camera.x) > halfW || Math.abs(m.y - camera.y) > halfH) continue;
    // 護衛
    for (const esc of livingEscorts(m)) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(esc.x + 2, esc.y + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = esc.color || '#94a3b8';
      ctx.beginPath(); ctx.arc(esc.x, esc.y, esc.radius || 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('護衛', esc.x, esc.y - 18);
      // HP
      const ratio = Math.max(0, esc.hp / Math.max(1, esc.maxHp));
      ctx.fillStyle = '#1e293b'; ctx.fillRect(esc.x - 12, esc.y + 12, 24, 3);
      ctx.fillStyle = '#34d399'; ctx.fillRect(esc.x - 12, esc.y + 12, 24 * ratio, 3);
    }
    // 商人本体（幌馬車っぽい箱）
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(m.x + 3, m.y + 14, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b4f2a';
    ctx.fillRect(m.x - 18, m.y - 10, 36, 22);
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.moveTo(m.x - 20, m.y - 8);
    ctx.lineTo(m.x, m.y - 28);
    ctx.lineTo(m.x + 20, m.y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${m.icon || '🏪'} ${m.name}`, m.x, m.y - 34);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${m.placeName} · T${merchantSellTier(m.distance)}帯`, m.x, m.y - 22);
    const ratio = Math.max(0, m.hp / Math.max(1, m.maxHp));
    ctx.fillStyle = '#1e293b'; ctx.fillRect(m.x - 16, m.y + 16, 32, 3);
    ctx.fillStyle = '#f87171'; ctx.fillRect(m.x - 16, m.y + 16, 32 * ratio, 3);
  }
}

export function serializeMerchants(merchants) {
  return (merchants || []).map(m => ({
    id: m.id,
    dead: !!m.dead,
    hp: m.hp,
    respawnIn: m.respawnIn || 0,
    stockIds: (m.stock || []).map(i => i?.id).filter(Boolean)
  }));
}

export function applyMerchantSave(game, savedList, generateRandomDrop, BASE_CAMP) {
  ensureMerchants(game, generateRandomDrop, BASE_CAMP);
  if (!savedList || !Array.isArray(savedList)) return;
  for (const s of savedList) {
    const m = (game.merchants || []).find(x => x.id === s.id);
    if (!m) continue;
    if (s.dead) {
      m.dead = true;
      m.hp = 0;
      m.respawnIn = s.respawnIn > 0 ? s.respawnIn : MERCHANT_RESPAWN_SEC;
      for (const e of (m.escorts || [])) e.dead = true;
    } else if (Number.isFinite(s.hp)) {
      m.hp = Math.min(m.maxHp, Math.max(0, s.hp));
    }
  }
}
