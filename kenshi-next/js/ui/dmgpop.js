// 浮かぶダメージ数字の決まり（種類・文字・合体・上限・動き）。DOM・Three.js に依存しない（テストあり）。
// シミュは触らない: 画面側で毎フレーム部位の体力を前と比べ、減った分を数字にする（決定性・セーブに影響しない）。
// Kenshi の "Show damage floaters"（既定は切り・突き・打撃・気絶を足した1つの整数）に倣い、1回の当たりは1つの整数。

import { WEAPONS } from '../sim/data.js';

export const POP_CAP = 16; // 画面に同時に出す数の上限（iPhone 向け。超えたら一番古いものを使い回す）
export const POP_LIFE = 1.1; // 秒
export const PAN_POP_LIFE = 0.6;
export const POP_MERGE = 0.15; // 秒以内の同じ相手・同じ部位・同じ種類は1つにまとめる
export const POP_MIN = 0.5; // これ未満の減りは出さない（飢え・出血のじわじわは出さない）
export const RANGED_DIST = 3; // m。これより離れた相手からの当たりは「突き」（クロスボウ）
export const HEAL_MIN = 2; // 手当ての回復はこれだけ溜まってから
export const HEAL_GAP = 0.8; // 秒（同じ相手の回復の数字の間）
export const BIG_HIT = 25;

// 打撃か切りか。blunt ≥ 1（棍棒・大槌）と素手は打撃、それ以外は切り。離れた所からは突き。
export function hitKind(weaponKey, dist) {
  if (Number.isFinite(dist) && dist > RANGED_DIST) return 'pierce';
  if (!weaponKey || weaponKey === 'fists') return 'blunt';
  const w = WEAPONS[weaponKey];
  if (!w) return 'cut';
  return (w.blunt || 0) >= 1 ? 'blunt' : 'cut';
}

// 種類ごとの見た目（CSS の class 名と色）。
export const POP_STYLE = {
  cut: { cls: 'pop-cut', color: '#ff5a4e' },
  blunt: { cls: 'pop-blunt', color: '#f0b04a' },
  pierce: { cls: 'pop-pierce', color: '#ff8fb0' },
  partial: { cls: 'pop-partial', color: '#e8d8a8' },
  block: { cls: 'pop-block', color: '#a9bccc' },
  parry: { cls: 'pop-block', color: '#a9bccc' },
  evade: { cls: 'pop-block', color: '#a9bccc' },
  heal: { cls: 'pop-heal', color: '#7fd46a' },
  pan: { cls: 'pop-pan', color: '#ffe36a' },
};

export function popText(kind, amount) {
  if (kind === 'pan') return 'パカーン！';
  if (kind === 'block') return '受け';
  if (kind === 'parry') return 'パリィ';
  if (kind === 'evade') return 'かわした';
  const n = Math.max(1, Math.round(Math.abs(amount)));
  if (kind === 'heal') return '+' + n;
  return String(n);
}

// 動き: 上へ浮き（ease-out）、後半で消える。age 秒 → { rise px, alpha, scale }
export function popAnim(age, life = POP_LIFE) {
  const t = Math.max(0, Math.min(1, age / life));
  const rise = 34 * (1 - (1 - t) * (1 - t));
  const alpha = t >= 1 ? 0 : t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
  const scale = t < 0.12 ? 0.7 + 0.3 * 2.5 * (t / 0.12) * (1 - t) : 1;
  return { rise, alpha, scale: Math.min(1.3, scale) };
}

// 部位の上に出す高さの目安（立っている時の頭の位置からの下げ幅 m）と横のずれ（m, 画面上で）。
export const PART_DROP = {
  head: 0, chest: 0.45, stomach: 0.7, lArm: 0.5, rArm: 0.5, lLeg: 1.15, rLeg: 1.15,
};
export const PART_SIDE = { lArm: -0.28, rArm: 0.28, lLeg: -0.12, rLeg: 0.12 };

// 浮かぶ数字の列。add は合体・上限つき。update で年を取らせ、寿命を過ぎたものを消す。
export function createPopQueue(cap = POP_CAP) {
  const items = [];
  let seq = 0;
  function add(p) {
    const now = p.t || 0;
    if (p.kind !== 'block') {
      for (const it of items) {
        if (it.actorId === p.actorId && it.part === p.part && it.kind === p.kind && now - it.born <= POP_MERGE) {
          it.amount += p.amount;
          it.text = popText(it.kind, it.amount);
          it.big = it.kind !== 'heal' && it.amount >= BIG_HIT;
          return it;
        }
      }
    }
    const it = {
      id: (seq += 1), actorId: p.actorId, part: p.part || 'head', kind: p.kind, amount: p.amount || 0, life: p.life || (p.kind === 'pan' ? PAN_POP_LIFE : POP_LIFE),
      text: popText(p.kind, p.amount || 0), born: now, age: 0,
      big: p.kind !== 'heal' && p.kind !== 'block' && (p.amount || 0) >= BIG_HIT,
      slot: -1,
    };
    if (items.length >= cap) {
      let oldest = 0;
      for (let i = 1; i < items.length; i += 1) if (items[i].born < items[oldest].born) oldest = i;
      const [old] = items.splice(oldest, 1);
      it.slot = old.slot; // 同じ DOM を使い回す
    }
    items.push(it);
    return it;
  }
  function update(now) {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      items[i].age = now - items[i].born;
      if (items[i].age >= (items[i].life || POP_LIFE)) items.splice(i, 1);
    }
  }
  function clear() {
    items.length = 0;
  }
  return { add, update, clear, items };
}

// 部位の体力の写し（actorId -> { parts: {key: hp}, dead }）。
export function snapshotActor(actor) {
  const parts = {};
  for (const k of Object.keys(actor.parts || {})) parts[k] = actor.parts[k].hp;
  return parts;
}

// 前の写しと比べた変化。[{ part, delta }]（delta < 0 は減った）
export function diffParts(prev, actor) {
  const out = [];
  if (!prev) return out;
  for (const k of Object.keys(actor.parts || {})) {
    const before = prev[k];
    if (typeof before !== 'number') continue;
    const d = actor.parts[k].hp - before;
    if (d !== 0) out.push({ part: k, delta: d });
  }
  return out;
}

// 減った分から出す数字を決める（合計で POP_MIN 未満は出さない）。
// ctx: { kind, partial } 当てた者の武器から決めた種類と、崩しの当たりか。
export function damagePops(changes, ctx) {
  const out = [];
  for (const c of changes) {
    if (!(c.delta < 0)) continue;
    const amount = -c.delta;
    if (amount < POP_MIN) continue;
    out.push({ part: c.part, amount, kind: ctx && ctx.partial ? 'partial' : (ctx && ctx.kind) || 'cut' });
  }
  return out;
}
