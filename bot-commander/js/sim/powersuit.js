// パワードスーツ（試作 v1。URL に ?powersuit=1 を付けた時だけ効く）: 人間（少年・少女・ロウ）が着る小さな装甲服の決まりと計算。
// データと計算だけ（DOM・Pixi なし）。数値・ルールはすべてここで調整する。仕様は refs/POWERSUIT.md の「8. 決定」。
//
// フラグがない時は何もしない: sim.powersuit が無ければ stepPowersuit・initPowersuit の外では何も起こらず、乱数も 1 回も引かない（このファイルは乱数を一切使わない）。
// 機体に足す欄は「着た時だけ」: suitOn（着ている間 true）・suitGather・suitBusy（着る・脱ぐ途中）・suitGrace（脱げたあと捕まらない時刻）・suitSaved。
//
// 考え方（hp の入れかえ）: 着ている間、機体の hp / maxHp は「殻」の物（70）に入れかわる。中の人の hp は suit.bodyHp にしまう。
//   こうすると、敵の攻撃・盾・体の装甲・よろけの判定・HP バーは今のコードのまま殻に効く。殻の hp が尽きたら breakSuit で中の人の hp を戻す（最後の一撃のあまりは捨てる）。
// 殻は世界に 1 着だけ（sim.powersuit.suit）。持ち主（ownerId）が着ているか持ち歩く。脱いだ殻・壊れた殻も持ち主の持ち物に残る（地面には置かない）。
import { TILE, tileCenter } from './map.js?v=6';
import { EXTRACT_RADIUS } from './mission.js?v=10';

/** 型の表（決定 8: 後の章で B・C を足せるよう、数値はここから読む）。A だけが出ている（1〜3 章）。数値は（仮）で、出どころは out/CHANGES.md の表 */
export const SUIT_TYPES = Object.freeze({
  A: Object.freeze({
    name: 'スーツ A', hp: 70,            // 決定 3: 殻の HP 70（中の人の HP とは別）
    armor: 1, shieldHp: 28, blockChance: 0.35, wearMult: 1, // POWERSUIT.md 4-1 の案（装甲 1・盾 28／0.35）
    speed: 26, gather: 0.15,             // 少年 30・0.2 より遅く、ツギハギ号 22・PONCO 20 より速い（案 3-4）
    atk: 7, cooldown: 0.8, range: 96,    // DPS 8.75（PONCO 11.1 より弱く、射撃型 8.9 に近い）
    weapon: 'W1-02',                     // 決定 7: 軽い小銃（AK 型）1 種で固定
  }),
});
export const SUIT_DEFAULT_TYPE = 'A';

/** 調整用のつまみ（仮） */
export const POWERSUIT = Object.freeze({
  donSec: 1.0,            // 着るのにかかる時間（秒）。この間は止まっていて、まだ人間（捕まる）
  doffSec: 1.0,           // 脱ぐのにかかる時間（秒）。この間は止まっていて、撃てない。終わると人間に戻る
  graceSec: 1.5,          // 決定 3: 壊れて脱げてから、この秒数は捕まらない
  handoffRange: 40,       // 持ち主ではない人が着る時、持ち主のそばにいる距離（ワールド px。乗れる距離と同じ）
  wearMinFrac: 0.30,      // 直しかけの殻は、HP がこの割合に戻るまでは着られない
  baseRepairSec: 10,      // 拠点（仮: 資材の届け先）のそばで、殻が空から満タンまで直る秒数
  repairerRepairSec: 23,  // リペアラー（兵種 repairer）のそばで、同じ秒数（拠点より遅い）
  baseRadius: EXTRACT_RADIUS * TILE,   // 拠点の範囲（資材を届ける輪と同じ）
  repairerRange: 80,      // リペアラーの直す距離（sim.js の REPAIRER_HEAL_RANGE と同じ値）
});

export const POWERSUIT_COMMANDS = Object.freeze(['suitDon', 'suitDoff']);

/** できなかった理由 → 画面に出す短い言葉（やさしい日本語） */
export const SUIT_MESSAGES = Object.freeze({
  noSuit: 'スーツがない',
  noHuman: '人間を選んでください',
  busy: 'いまは着られない',
  inUse: 'ほかの人が着ている',
  far: 'スーツを持っている人のそばへ行こう',
  broken: 'こわれている。拠点かリペアラーのそばで直そう',
  riding: 'ロボからおりてから着よう',
  notWearing: '着ていない',
  working: '着たり脱いだりしている途中',
});

const byId = (sim, id) => sim.units.find(u => u.id === id) || null;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const typeOf = suit => SUIT_TYPES[suit.type] || SUIT_TYPES[SUIT_DEFAULT_TYPE];

/** 着ている人か（殻が着られている間。着る途中は含まない） */
export const isSuited = u => !!u?.suitOn;
/** 捕まらない人か（着ている・脱げてから graceSec 以内）。sim.js の updateCaptures が呼ぶ */
export const isSuitSafe = (sim, u) => !!u.suitOn || (u.suitGrace ?? -1) > sim.time;
/** 着ている・着る・脱ぐの途中の人は、ロボには乗れない（ride.js の canBoard が見る） */
export const blocksBoarding = u => !!u?.suitOn || !!u?.suitBusy;

export const suitOf = sim => sim.powersuit?.suit || null;
/** 殻のいまの HP（着ている間は機体の hp が殻の hp） */
export function shellHp(sim, suit = suitOf(sim)) {
  if (!suit) return 0;
  const o = suit.ownerId != null ? byId(sim, suit.ownerId) : null;
  return o?.suitOn ? o.hp : suit.hp;
}
export const shellMax = suit => typeOf(suit).hp;
/** 殻の盾のいまの値（着ている間は機体の shieldHp） */
export function shellShield(sim, suit = suitOf(sim)) {
  if (!suit) return 0;
  const o = suit.ownerId != null ? byId(sim, suit.ownerId) : null;
  return o?.suitOn ? (o.shieldHp || 0) : suit.shieldHp;
}

/** 始まりに 1 着だけ作る。持ち主はミッションの最初の少年（いなければ最初の人間）。着てはいない（持っているだけ） */
export function initPowersuit(sim, type = SUIT_DEFAULT_TYPE) {
  const T = SUIT_TYPES[type];
  const humans = sim.units.filter(u => u.side === 'ally' && u.human && !u.aiAlly);
  const owner = humans.find(u => u.kind === 'boy') || humans[0] || null;
  sim.powersuit = {
    suit: { id: 1, type, hp: T.hp, shieldHp: T.shieldHp, ownerId: owner ? owner.id : null, phase: 'off', t: 0, broken: false, lost: false, bodyHp: 0, bodyMax: 0, breaks: 0, repairs: 0 },
  };
  return sim.powersuit;
}

// ---- 着られるか・脱げるか ----
/** 着られるか。{ ok, reason }。reason は SUIT_MESSAGES のキー */
export function canDon(sim, h) {
  const suit = suitOf(sim);
  if (!suit || suit.lost) return { ok: false, reason: 'noSuit' };
  if (!h || !h.human || h.side !== 'ally' || h.hp <= 0) return { ok: false, reason: 'noHuman' };
  if (suit.phase !== 'off') return { ok: false, reason: suit.ownerId === h.id ? 'working' : 'inUse' }; // 1 度に 1 着: 着ている・着る途中は他の人が着られない
  if (h.ride) return { ok: false, reason: 'riding' };
  if (h.captured != null || (h.dazed || 0) > 0 || h.suitBusy) return { ok: false, reason: 'busy' };
  if (suit.ownerId !== h.id) {
    const owner = suit.ownerId != null ? byId(sim, suit.ownerId) : null;
    if (!owner || dist(owner, h) > POWERSUIT.handoffRange) return { ok: false, reason: 'far' };
  }
  if (suit.hp < Math.ceil(typeOf(suit).hp * POWERSUIT.wearMinFrac)) return { ok: false, reason: 'broken' };
  return { ok: true, reason: null };
}
/** 脱げるか。着ていて、着る・脱ぐの途中でない時 */
export function canDoff(sim, h) {
  const suit = suitOf(sim);
  if (!suit || !h?.suitOn || suit.ownerId !== h.id) return { ok: false, reason: 'notWearing' };
  if (suit.phase !== 'on') return { ok: false, reason: 'working' };
  return { ok: true, reason: null };
}

/** 着る命令（次のステップで反映）。その場で調べて、できなければ命令を出さずに理由を返す */
export function issueDon(sim, humanId) {
  const r = canDon(sim, byId(sim, humanId));
  if (r.ok) sim.commands.push({ type: 'suitDon', humanId });
  return r;
}
/** 脱ぐ命令 */
export function issueDoff(sim, humanId) {
  const r = canDoff(sim, byId(sim, humanId));
  if (r.ok) sim.commands.push({ type: 'suitDoff', humanId });
  return r;
}

/** sim.js の applyCommands が呼ぶ。出した時と反映する時の間に変わっていても大丈夫なように、もう一度調べる */
export function applyPowersuitCommand(sim, cmd) {
  if (!sim.powersuit) return;
  const h = byId(sim, cmd.humanId), suit = suitOf(sim);
  if (cmd.type === 'suitDon') {
    const r = canDon(sim, h);
    if (!r.ok) { sim.fx.push({ type: 'suitFail', id: cmd.humanId, reason: r.reason, x: h?.x ?? 0, y: h?.y ?? 0, t: sim.time }); return; }
    suit.ownerId = h.id; suit.phase = 'donning'; suit.t = 0;
    h.order = null; h.moving = false; h.gathering = null; h.suitBusy = true;
    sim.fx.push({ type: 'suitDonStart', id: h.id, x: h.x, y: h.y, t: sim.time, label: h.label });
  } else if (cmd.type === 'suitDoff') {
    const r = canDoff(sim, h);
    if (!r.ok) { sim.fx.push({ type: 'suitFail', id: cmd.humanId, reason: r.reason, x: h?.x ?? 0, y: h?.y ?? 0, t: sim.time }); return; }
    suit.phase = 'doffing'; suit.t = 0;
    h.order = null; h.moving = false; h.gathering = null; h.suitBusy = true;
    sim.fx.push({ type: 'suitDoffStart', id: h.id, x: h.x, y: h.y, t: sim.time, label: h.label });
  }
}

// ---- 着る・脱ぐ（機体の欄の入れかえ） ----
const SAVED_KEYS = ['atk', 'range', 'cooldown', 'speed', 'armor', 'shieldMax', 'shieldHp', 'shieldBlock', 'shieldWear', 'weapon', 'wmul'];

function wear(sim, h, suit) {
  const T = typeOf(suit);
  h.suitSaved = {}; for (const k of SAVED_KEYS) h.suitSaved[k] = h[k]; // 元の値（脱ぐ時にそのまま戻す。weapon が無かった人は無いまま）
  suit.bodyHp = h.hp; suit.bodyMax = h.maxHp;
  h.maxHp = T.hp; h.hp = Math.min(T.hp, suit.hp);
  h.armor = T.armor; h.shieldMax = T.shieldHp; h.shieldHp = Math.min(T.shieldHp, suit.shieldHp); h.shieldBlock = T.blockChance; h.shieldWear = T.wearMult;
  h.atk = T.atk; h.range = T.range; h.cooldown = T.cooldown; h.speed = T.speed; h.weapon = T.weapon; h.wmul = 1;
  h.suitGather = T.gather; h.suitOn = true; delete h.suitBusy;
  suit.phase = 'on'; suit.t = 0;
}
function unwear(h, suit) {
  const s = h.suitSaved || {};
  for (const k of SAVED_KEYS) { if (s[k] === undefined) delete h[k]; else h[k] = s[k]; }
  h.maxHp = suit.bodyMax || h.maxHp; h.hp = Math.min(h.maxHp, suit.bodyHp || h.hp);
  delete h.suitSaved; delete h.suitGather; delete h.suitOn; delete h.suitBusy;
}

/**
 * 殻が壊れた（着ている機体の hp が 0 以下になった）。sim.js の updateCombat が、体に当たる一撃のあとに呼ぶ（removeDead より前）。
 * 決定 3: 脱げて人間に戻り、graceSec 秒は捕まらない。殻は「壊れた殻」として持ち主の持ち物に残る。最後の一撃のあまりは捨てる。
 */
export function breakSuit(sim, h) {
  const suit = suitOf(sim);
  if (!suit || !h.suitOn) return false;
  unwear(h, suit);
  suit.hp = 0; suit.shieldHp = 0; suit.phase = 'off'; suit.t = 0; suit.broken = true; suit.breaks++;
  h.suitGrace = sim.time + POWERSUIT.graceSec;
  h.stunImmuneUntil = Math.max(h.stunImmuneUntil ?? -1, h.suitGrace); // 脱げた人は、よろけて転ばない（走って逃げられる）
  h.order = null; h.moving = false; h.anchor = { x: h.x, y: h.y };
  sim.fx.push({ type: 'suitBreak', id: h.id, x: h.x, y: h.y, t: sim.time, label: h.label });
  return true;
}

// ---- 毎ステップ ----
/** 直せる場所か。拠点（仮: 資材の届け先）のそば → 満タンまで baseRepairSec 秒。リペアラーのそば → repairerRepairSec 秒。どちらでもなければ 0（毎秒の割合） */
export function repairRate(sim, h) {
  const m = sim.mission, ex = m?.extraction;
  const atBase = !!ex && Math.hypot(h.x - tileCenter(ex.tx), h.y - tileCenter(ex.ty)) <= POWERSUIT.baseRadius;
  if (atBase) return { per: 1 / POWERSUIT.baseRepairSec, by: 'base' };
  const rep = sim.units.some(u => u !== h && u.side === 'ally' && u.cls === 'repairer' && u.hp > 0 && u.captured == null && dist(u, h) <= POWERSUIT.repairerRange);
  if (rep) return { per: 1 / POWERSUIT.repairerRepairSec, by: 'repairer' };
  return { per: 0, by: null };
}

/** 殻・着る・脱ぐ・直すを 1 ステップ進める。sim.js の stepSim が呼ぶ。sim.powersuit が無ければ何もしない */
export function stepPowersuit(sim, dt) {
  const P = sim.powersuit; if (!P) return;
  const suit = P.suit, T = typeOf(suit);
  const owner = suit.ownerId != null ? byId(sim, suit.ownerId) : null;
  if (!owner) { // 持ち主がいなくなった（やられた）: 殻もいっしょに失われる（試作）
    if (!suit.lost) { suit.lost = true; suit.ownerId = null; suit.phase = 'off'; sim.fx.push({ type: 'suitLost', t: sim.time }); }
    return;
  }
  if (suit.phase === 'donning' || suit.phase === 'doffing') {
    owner.order = null; owner.moving = false; owner.suitBusy = true; // 着る・脱ぐの間は止まっている
    if (suit.phase === 'doffing') owner.cd = Math.max(owner.cd || 0, dt * 2); // 脱ぐ途中は撃たない
    if (owner.captured != null || owner.hp <= 0) { suit.phase = 'off'; delete owner.suitBusy; } // 着る途中に捕まった: 着られなかった（脱ぐ途中は着たまま捕まらない）
    else {
      suit.t += dt;
      if (suit.phase === 'donning' && suit.t >= POWERSUIT.donSec - 1e-6) {
        wear(sim, owner, suit);
        sim.fx.push({ type: 'suitOn', id: owner.id, x: owner.x, y: owner.y, t: sim.time, label: owner.label });
      } else if (suit.phase === 'doffing' && suit.t >= POWERSUIT.doffSec - 1e-6) {
        suit.hp = owner.hp; suit.shieldHp = owner.shieldHp || 0; // 殻の傷はそのまま残る
        unwear(owner, suit);
        suit.phase = 'off'; suit.t = 0;
        sim.fx.push({ type: 'suitOff', id: owner.id, x: owner.x, y: owner.y, t: sim.time, label: owner.label });
      }
    }
  }
  // 直す（決定 3）: 拠点のそば・リペアラーのそばでだけ。修理キットの拾い物では直らない（sim.js の canTake が着ている人の拾い物を止める）
  const on = !!owner.suitOn, cur = on ? owner.hp : suit.hp;
  if (suit.phase !== 'donning' && cur < T.hp && owner.captured == null) {
    const rate = repairRate(sim, owner);
    if (rate.per > 0) {
      const add = T.hp * rate.per * dt, was = cur, now = Math.min(T.hp, cur + add);
      const sh = Math.min(T.shieldHp, (on ? owner.shieldHp : suit.shieldHp) + T.shieldHp * rate.per * dt);
      if (on) { owner.hp = now; owner.shieldHp = sh; } else { suit.hp = now; suit.shieldHp = sh; }
      const need = Math.ceil(T.hp * POWERSUIT.wearMinFrac);
      if (suit.broken && was < need && now >= need) sim.fx.push({ type: 'suitFixed', id: owner.id, by: rate.by, x: owner.x, y: owner.y, t: sim.time, label: owner.label }); // また着られる
      if (now >= T.hp - 1e-9) { suit.broken = false; suit.repairs++; sim.fx.push({ type: 'suitRepaired', id: owner.id, by: rate.by, x: owner.x, y: owner.y, t: sim.time, label: owner.label }); }
      suit.repairing = rate.by;
    } else suit.repairing = null;
  } else suit.repairing = null;
}

/** 状態の要約（画面用・テスト用。何も書かない）。sim.powersuit が無ければ null */
export function suitStatus(sim) {
  const suit = suitOf(sim); if (!suit) return null;
  const T = typeOf(suit), owner = suit.ownerId != null ? byId(sim, suit.ownerId) : null;
  const hp = shellHp(sim, suit);
  return {
    type: suit.type, name: T.name, hp, maxHp: T.hp, phase: suit.phase, broken: suit.broken, lost: suit.lost,
    ownerId: suit.ownerId, ownerLabel: owner?.label ?? null, worn: !!owner?.suitOn, repairing: suit.repairing || null,
    wearable: !suit.lost && suit.phase === 'off' && hp >= Math.ceil(T.hp * POWERSUIT.wearMinFrac),
  };
}

/** hashSim に混ぜる値（sim.powersuit がある時だけ呼ぶ） */
export function powersuitHashValues(sim) {
  const s = sim.powersuit.suit;
  return [s.id, ['off', 'donning', 'on', 'doffing'].indexOf(s.phase) + 1, s.ownerId ?? -1, Math.round(shellHp(sim, s) * 100), Math.round(shellShield(sim, s) * 100), Math.round(s.t * 1000), s.broken ? 1 : 0, s.lost ? 1 : 0];
}
