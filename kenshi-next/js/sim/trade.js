// 交易: 町ごとの値段・ゆっくりした揺れ・売り過ぎの値下がり・需要の高騰・交易スキル・相場メモ。
// 設計: research/trade_economy.md。DOM を使わない純粋なルール（UI は js/ui/trade_ui.js）。
// 通貨は「錆貨」。乱数の流れ（state.rngState）は使わず、種と時刻のハッシュで決める（他の仕組みの乱数を変えない）。

import { DAY_SEC, makeEvent } from './data.js';

export const CURRENCY_NAME = '錆貨';

// ★基本価格（錆貨）。kind: 'trade' は定価で売れる交易品。
export const GOODS = {
  grain: { name: '穀物袋', base: 30 },
  water: { name: '水瓶', base: 18 },
  dried_meat: { name: '干し肉', base: 60 },
  salt: { name: '岩塩', base: 40 },
  cotton: { name: '綿', base: 45 },
  cloth: { name: '布', base: 95 },
  scrap: { name: '屑鉄', base: 28 },
  iron: { name: '鉄板', base: 120 },
  parts: { name: '機械部品', base: 190 },
  cactus_rum: { name: 'サボテン酒', base: 110 },
  herbs: { name: '薬草', base: 140 },
  luxury: { name: '贅沢品', base: 320 },
};
export const GOOD_IDS = Object.keys(GOODS);

// ★地方（world/gemini_v1 の biome）ごとの特色。<1 = 産地で安い、>1 = 足りなくて高い。
export const BIOME_TRAITS = {
  fertile_valley: { grain: 0.6, cotton: 0.65, cloth: 0.8, water: 0.6, iron: 1.3, luxury: 1.15, cactus_rum: 1.3 },
  golden_grasslands: { grain: 0.7, dried_meat: 0.7, cotton: 0.8, iron: 1.25 },
  arid_savanna: { dried_meat: 0.8, water: 1.3, scrap: 0.85, grain: 1.1 },
  canyon_scrub: { dried_meat: 0.85, cloth: 1.2, herbs: 1.15 },
  rocky_mountain: { iron: 0.65, scrap: 0.8, grain: 1.4, dried_meat: 1.2, cloth: 1.25, cactus_rum: 1.2 },
  coastal_crags: { salt: 0.75, dried_meat: 0.85, iron: 1.15 },
  shipwreck_coast: { scrap: 0.6, parts: 0.8, salt: 0.8, grain: 1.25, herbs: 1.2 },
  solar_steppe: { salt: 0.9, water: 1.25, herbs: 1.2 },
  high_tundra: { luxury: 1.2, herbs: 1.35, cactus_rum: 1.4, grain: 1.2 },
  war_badlands: { iron: 1.25, herbs: 1.4, dried_meat: 1.2 },
  monolith_maze: { parts: 0.85, water: 1.2 },
  impact_wasteland: { parts: 0.8, scrap: 0.75, water: 1.4, grain: 1.3 },
  dune_desert: { cactus_rum: 0.6, salt: 0.8, water: 1.6, cloth: 1.2 },
  salt_flats: { salt: 0.5, water: 1.5, grain: 1.3 },
  collapsed_megacity: { scrap: 0.55, parts: 0.75, grain: 1.35, water: 1.3 },
  orbital_death_ray: { water: 1.5, grain: 1.3, parts: 0.9 },
  fog_basin: { herbs: 0.7, luxury: 1.1 },
  windswept_shelf: { herbs: 0.85, luxury: 0.9, dried_meat: 1.2 },
  deep_swamp: { herbs: 0.6, cactus_rum: 1.25, iron: 1.2 },
  mangrove_mire: { herbs: 0.75, cloth: 1.15, scrap: 1.1 },
  delta_shallows: { salt: 0.8, dried_meat: 0.85, luxury: 1.2 },
  mech_graveyard: { parts: 0.6, scrap: 0.6, grain: 1.35, herbs: 1.25 },
  acid_volcanic: { scrap: 0.8, water: 1.5, herbs: 1.3 },
  machine_hell: { parts: 0.7, grain: 1.5, water: 1.4 },
  wind_canyon: { iron: 0.9, dried_meat: 1.15 },
};

// ゲームの町 → world.json の町（地方の特色をもらう）。★町が増えたらここへ足す。
export const MARKETS = {
  town1: { worldTown: 'koba_town', region: '錆野', biome: 'arid_savanna', cash: 4000, nearGreen: true },
  town2: { worldTown: 'kokkaku_tanbo', region: '骨角連峰', biome: 'rocky_mountain', cash: 2500 },
};
// 灯守の町は翠緑の盆地のすぐ隣なので、盆地の作物も安く入る（★）
const NEAR_GREEN = { grain: 0.8, cotton: 0.85, water: 0.85 };

export const TRADE_TUNING = {
  townSpread: [0.75, 1.3], // 町ごとの乱数倍率（Kenshi は 0.7〜1.3）
  driftAmp: 0.1, // ★ゆっくりした揺れ ±10%（0 で止める）
  driftKnotDays: 3, // 揺れの節の間隔（日）
  sellDipPerUnit: 0.035, // 1個売るごとの値下がり
  buyRisePerUnit: 0.025, // 1個買うごとの値上がり
  pressMin: -0.45,
  pressMax: 0.4,
  pressRecoverDays: 1.5, // 値下がり・値上がりが戻る速さ（e で割れる日数）
  buyMarkup: 1.1, // 買値＝中値×1.10
  sellMarkdown: 0.92, // 売値＝中値×0.92
  skillBonus: 0.05, // スキル100で買値 −5%・売値 +5%（合わせて約10%得）
  spikeEveryDays: 3, // 高騰の起きる間隔
  spikeMult: [1.7, 2.4],
  spikeDays: [3, 5],
  memoEveryTicks: 10,
  inTownPad: 8,
};

// ---- ハッシュ（乱数の流れを使わない） ----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}
export function h01(...parts) {
  return hashStr(parts.join('|')) / 4294967296;
}

export function dayOf(state) {
  return state.timeSec / DAY_SEC;
}

export function ensureTrade(state) {
  if (!state.trade || typeof state.trade !== 'object') {
    state.trade = { cargo: {}, memo: {}, press: {}, cash: {}, announced: [], earned: 0, lastSale: null };
  }
  const t = state.trade;
  for (const k of ['cargo', 'memo', 'press', 'cash']) if (!t[k] || typeof t[k] !== 'object') t[k] = {};
  if (!Array.isArray(t.announced)) t.announced = [];
  if (typeof t.earned !== 'number') t.earned = 0;
  return t;
}

export function townMult(state, market, good) {
  const [lo, hi] = TRADE_TUNING.townSpread;
  return lo + (hi - lo) * h01(state.seed, 'town', market, good);
}

export function traitMult(market, good) {
  const m = MARKETS[market];
  if (!m) return 1;
  let v = (BIOME_TRAITS[m.biome] || {})[good] || 1;
  if (m.nearGreen) v *= NEAR_GREEN[good] || 1;
  return v;
}

// ゆっくりした揺れ（数日ごとの節を滑らかにつなぐ）
export function driftMult(state, market, good, day) {
  const amp = TRADE_TUNING.driftAmp;
  if (!amp) return 1;
  const k = TRADE_TUNING.driftKnotDays;
  const i = Math.floor(day / k);
  const f = day / k - i;
  const a = h01(state.seed, 'drift', market, good, i) * 2 - 1;
  const b = h01(state.seed, 'drift', market, good, i + 1) * 2 - 1;
  const s = f * f * (3 - 2 * f);
  return 1 + amp * (a + (b - a) * s);
}

export function pressNow(state, market, good) {
  const t = ensureTrade(state);
  const p = t.press[market] && t.press[market][good];
  if (!p) return 0;
  const days = Math.max(0, (state.timeSec - p.t) / DAY_SEC);
  return p.v * Math.exp(-days / TRADE_TUNING.pressRecoverDays);
}

function addPress(state, market, good, dv) {
  const t = ensureTrade(state);
  const cur = pressNow(state, market, good);
  if (!t.press[market]) t.press[market] = {};
  const v = Math.max(TRADE_TUNING.pressMin, Math.min(TRADE_TUNING.pressMax, cur + dv));
  t.press[market][good] = { v: Math.round(v * 10000) / 10000, t: state.timeSec };
}

// ---- 需要の高騰（噂・張り紙で知らせる） ----
export function spikeAt(state, slot) {
  const ids = Object.keys(MARKETS);
  const T = TRADE_TUNING;
  const market = ids[Math.floor(h01(state.seed, 'spk-m', slot) * ids.length)];
  const good = GOOD_IDS[Math.floor(h01(state.seed, 'spk-g', slot) * GOOD_IDS.length)];
  const mult = T.spikeMult[0] + (T.spikeMult[1] - T.spikeMult[0]) * h01(state.seed, 'spk-x', slot);
  const len = T.spikeDays[0] + (T.spikeDays[1] - T.spikeDays[0]) * h01(state.seed, 'spk-l', slot);
  // 最初の高騰は始まって半日ほどで起きる
  const start = slot * T.spikeEveryDays + 0.4 + h01(state.seed, 'spk-s', slot) * 1.2;
  return { id: 'spk' + slot, slot, market, good, mult: Math.round(mult * 100) / 100, start, end: start + len };
}

export function activeSpikes(state, day = dayOf(state)) {
  const out = [];
  const k = TRADE_TUNING.spikeEveryDays;
  const last = Math.floor(day / k);
  for (let s = Math.max(0, last - 3); s <= last; s += 1) {
    const sp = spikeAt(state, s);
    if (day >= sp.start && day < sp.end) out.push(sp);
  }
  return out;
}

export function spikeMult(state, market, good, day) {
  let m = 1;
  for (const sp of activeSpikes(state, day)) if (sp.market === market && sp.good === good) m = Math.max(m, sp.mult);
  return m;
}

// ---- 交易スキル ----
export function traderOf(state) {
  let best = null;
  for (const a of state.actors) {
    if (a.faction !== 'player' || a.state === 'dead') continue;
    if (!state.squadIds || !state.squadIds.includes(a.id)) continue;
    if (!best || skillOf(a) > skillOf(best)) best = a;
  }
  return best;
}
export function skillOf(actor) {
  const v = actor && actor.skills ? actor.skills.trade : 0;
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 1;
}
export function partySkill(state) {
  const a = traderOf(state);
  return a ? skillOf(a) : 1;
}
// ★利益が出ると伸びる。上がるほど伸びにくい。
export function skillGain(profit, skill) {
  if (profit <= 0) return 0.02;
  return Math.min(3, profit / 150) * Math.max(0.05, 1 - skill / 105);
}

// ---- 値段 ----
export function midPrice(state, market, good, day = dayOf(state)) {
  const g = GOODS[good];
  if (!g) return 0;
  return (
    g.base *
    townMult(state, market, good) *
    traitMult(market, good) *
    driftMult(state, market, good, day) *
    (1 + pressNow(state, market, good)) *
    spikeMult(state, market, good, day)
  );
}

export function prices(state, market, good, skill = partySkill(state)) {
  const T = TRADE_TUNING;
  const mid = midPrice(state, market, good);
  const s = Math.max(0, Math.min(100, skill)) / 100;
  let buy = Math.max(1, Math.round(mid * T.buyMarkup * (1 - T.skillBonus * s)));
  let sell = Math.max(1, Math.round(mid * T.sellMarkdown * (1 + T.skillBonus * s)));
  if (sell >= buy) sell = buy - 1; // 同じ町で買って売るだけでは儲からない
  return { buy, sell: Math.max(0, sell) };
}

export function priceTable(state, market) {
  const out = {};
  const skill = partySkill(state);
  for (const g of GOOD_IDS) out[g] = prices(state, market, g, skill);
  return out;
}

// ---- 場所・お金 ----
function partyAlive(state) {
  return state.actors.filter(
    (a) => a.faction === 'player' && a.state !== 'dead' && state.squadIds && state.squadIds.includes(a.id),
  );
}

export function marketHere(state) {
  for (const id of Object.keys(MARKETS)) {
    const p = state.places && state.places[id];
    if (!p) continue;
    for (const a of partyAlive(state)) {
      if (a.state === 'down' || a.carriedBy) continue;
      if (Math.hypot(a.x - p.x, a.z - p.z) <= p.r + TRADE_TUNING.inTownPad) return id;
    }
  }
  return null;
}

export function marketName(state, market) {
  const p = state.places && state.places[market];
  return p ? p.name : market;
}

export function partyMoney(state) {
  return partyAlive(state).reduce((n, a) => n + (a.money || 0), 0);
}

function pay(state, amount) {
  let left = amount;
  for (const a of partyAlive(state)) {
    if (left <= 0) break;
    const take = Math.min(left, a.money || 0);
    a.money -= take;
    left -= take;
  }
  return left <= 0;
}

function receive(state, amount) {
  const p = state.actors.find((a) => a.id === state.playerId && a.state !== 'dead') || partyAlive(state)[0];
  if (p) p.money = (p.money || 0) + amount;
}

export function marketCash(state, market) {
  const t = ensureTrade(state);
  const day = Math.floor(dayOf(state));
  const c = t.cash[market];
  if (!c || c.day !== day) t.cash[market] = { day, amt: (MARKETS[market] || {}).cash || 2000 };
  return t.cash[market].amt;
}

export function canTradeAt(state, market) {
  if (!MARKETS[market]) return false;
  if (state.relations && state.relations.guard_player === 'hostile') return false;
  return marketHere(state) === market;
}

export function cargoCount(state, good) {
  const c = ensureTrade(state).cargo[good];
  return c ? c.n : 0;
}

export function recordMemo(state, market) {
  const t = ensureTrade(state);
  t.memo[market] = { t: state.timeSec, prices: priceTable(state, market) };
}

// ---- 売り買い ----
export function tradeBuy(state, market, good, n, events) {
  if (!canTradeAt(state, market) || !GOODS[good]) return 0;
  const t = ensureTrade(state);
  let done = 0;
  let spent = 0;
  for (let i = 0; i < n; i += 1) {
    const { buy } = prices(state, market, good);
    if (partyMoney(state) < buy) break;
    pay(state, buy);
    const cashNow = marketCash(state, market);
    t.cash[market].amt = cashNow + buy;
    const c = t.cargo[good] || { n: 0, cost: 0 };
    c.cost = (c.cost * c.n + buy) / (c.n + 1);
    c.n += 1;
    t.cargo[good] = c;
    addPress(state, market, good, TRADE_TUNING.buyRisePerUnit);
    done += 1;
    spent += buy;
  }
  if (done > 0) {
    recordMemo(state, market);
    if (events) events.push(tradeEvent(state, GOODS[good].name + 'を' + done + '個買った（' + CURRENCY_NAME + ' ' + spent + '）'));
  }
  return done;
}

export function tradeSell(state, market, good, n, events) {
  if (!canTradeAt(state, market) || !GOODS[good]) return 0;
  const t = ensureTrade(state);
  const c = t.cargo[good];
  let done = 0;
  let got = 0;
  let profit = 0;
  for (let i = 0; i < n && c && c.n > 0; i += 1) {
    const { sell } = prices(state, market, good);
    if (marketCash(state, market) < sell) break;
    t.cash[market].amt -= sell;
    receive(state, sell);
    profit += sell - c.cost;
    c.n -= 1;
    addPress(state, market, good, -TRADE_TUNING.sellDipPerUnit);
    done += 1;
    got += sell;
  }
  if (c && c.n <= 0) delete t.cargo[good];
  if (done > 0) {
    const trader = traderOf(state);
    if (trader) {
      if (!trader.skills) trader.skills = {};
      const s = skillOf(trader);
      trader.skills.trade = Math.min(100, Math.round((s + skillGain(profit, s)) * 100) / 100);
    }
    profit = Math.round(profit);
    t.earned += profit;
    t.lastSale = { t: state.timeSec, got, profit, good, n: done };
    recordMemo(state, market);
    const sign = profit >= 0 ? '+' : '';
    if (events) events.push(tradeEvent(state, GOODS[good].name + 'を' + done + '個売った（' + CURRENCY_NAME + ' ' + got + '、利益 ' + sign + profit + '）'));
  }
  return done;
}

// 仕入れ値より高く売れる物だけを売る（売るたびに値が下がるので、1個ずつ確かめる）
export function sellProfitable(state, market, events) {
  const t = ensureTrade(state);
  let total = 0;
  for (const g of Object.keys(t.cargo)) {
    for (;;) {
      const c = t.cargo[g];
      if (!c || c.n <= 0) break;
      if (prices(state, market, g).sell <= c.cost) break;
      if (tradeSell(state, market, g, 1, events) !== 1) break;
      total += 1;
    }
  }
  return total;
}

function tradeEvent(state, text) {
  return makeEvent(state, 'trade', text);
}

// 1tick ごと: 町にいれば相場メモを付け、新しい高騰の噂を記録に出す。
export function updateTrade(state, events) {
  const t = ensureTrade(state);
  if (state.tick % TRADE_TUNING.memoEveryTicks === 0) {
    const m = marketHere(state);
    if (m) recordMemo(state, m);
  }
  for (const sp of activeSpikes(state)) {
    if (t.announced.includes(sp.id)) continue;
    t.announced.push(sp.id);
    if (t.announced.length > 20) t.announced.shift();
    const days = Math.max(1, Math.round(sp.end - dayOf(state)));
    if (events) {
      events.push(
        tradeEvent(
          state,
          '噂: ' + marketName(state, sp.market) + 'で' + GOODS[sp.good].name + 'が足りず、高く買い取っている（あと約' + days + '日）',
        ),
      );
    }
  }
}

// 相場メモの見出し用（何日前か）
export function memoAgeText(state, market) {
  const m = ensureTrade(state).memo[market];
  if (!m) return '未訪問';
  const d = (state.timeSec - m.t) / DAY_SEC;
  if (d < 1 / 24) return 'いま';
  if (d < 1) return Math.round(d * 24) + '時間前';
  return Math.floor(d) + '日前';
}

// 値札の色: 他の町（相場メモ）や基本価格と比べて、得なら 'good'、損なら 'bad'
export function priceTag(state, market, good, side) {
  const t = ensureTrade(state);
  const here = prices(state, market, good)[side];
  const refs = [];
  for (const [m, memo] of Object.entries(t.memo)) {
    if (m === market || !memo.prices[good]) continue;
    refs.push(memo.prices[good][side]);
  }
  const ref = refs.length ? refs.reduce((a, b) => a + b, 0) / refs.length : GOODS[good].base;
  const r = here / ref;
  if (side === 'buy') return r < 0.85 ? 'good' : r > 1.15 ? 'bad' : 'even';
  return r > 1.15 ? 'good' : r < 0.85 ? 'bad' : 'even';
}

export function cargoValue(state) {
  const t = ensureTrade(state);
  return Object.values(t.cargo).reduce((n, c) => n + c.n * c.cost, 0);
}
