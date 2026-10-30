// 体の窓（Kenshi の health pane そっくり）の計算。DOM に依存しない純粋関数だけ（テストあり）。
// 見た目の出典と対応は research/health_ui.md。
//
// Kenshi の並び: 一番上に Blood、続けて部位、一番下に Hunger。名前はバーの中央、数字は右の列。
// 部位バー（0〜最大）の色分け:
//   明るい黄緑 = 今の体力 / 赤 = 手当てで戻る傷（Kenshi の「まだ包帯を巻いていない切り傷」）
//   黒っぽい斜線 = 休まないと戻らない分（最大値が下がった分 = 傷 part.wound）
// 0 を下回ると Kenshi はバーを空にして数字だけ負にする。この窓ではさらに、バーを「負の物差し」
// （左 0 → 右 −最大）に切り替え、気絶点（KO点）と死・切断（−最大）の印まで伸ばす。

import { koPoint } from '../sim/melee.js';
import { BLOOD_MAX, BLOOD_KO } from '../sim/body.js';
import { effMax } from '../sim/rest.js';
import { VITALS } from '../sim/data.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// 体力の数字。0 より上は最低 1（まだ立てる）、0 未満は最大 −1（気絶・使えない）と見分けがつくように丸める。
export function fmtHp(v) {
  if (!Number.isFinite(v)) return '0';
  if (v > 0) return String(Math.max(1, Math.round(v)));
  if (v < 0) return String(Math.min(-1, Math.round(v)));
  return '0';
}

// 「今/最大」。最大は傷で下がった後の最大（effMax）。
export function fmtPair(cur, max) {
  return fmtHp(cur) + '/' + Math.max(0, Math.round(max));
}

// 気絶点（KO点）を最大に対する割合（負の物差しの左からの位置 0..1）で。打たれ強さ 0 → 0.10、100 → 0.85。
export function koMarkFrac(toughness) {
  const t = Math.max(0, Math.min(100, Number(toughness) || 0));
  return clamp01(-koPoint(t) / 100);
}

// 1部位のバー。戻り値の割合はすべて最大（part.max）に対して。
//   mode 'pos' : green（今）+ red（手当てで戻る）+ wound（最大が下がった分）= 1 以下
//   mode 'neg' : neg = |体力|/最大（0..1）。koMark（急所だけ）と、右端が −最大（急所=死・手足=切断）
//   mode 'missing' : 失った手足
export function limbBar(part, opts = {}) {
  const max = part && part.max > 0 ? part.max : 100;
  const hp = part && Number.isFinite(part.hp) ? part.hp : max;
  const em = part ? Math.min(max, effMax({ max, wound: part.wound || 0 })) : max;
  const vital = !!opts.vital;
  const out = {
    mode: 'pos', green: 0, red: 0, wound: 0, neg: 0, koMark: null,
    text: fmtPair(hp, em), state: 'ok',
  };
  if (opts.missing) {
    out.mode = 'missing';
    out.text = 'なし';
    out.state = 'missing';
    out.wound = 1;
    return out;
  }
  out.wound = clamp01((max - em) / max);
  if (hp > 0) {
    out.green = clamp01(Math.min(hp, em) / max);
    out.red = clamp01((em - Math.min(hp, em)) / max);
    out.state = hp < em * 0.5 ? 'hurt' : 'ok';
    return out;
  }
  out.mode = 'neg';
  out.red = clamp01(em / max); // 0 以下: 戻る分はバー全体（Kenshi でも空のバーは全部が傷の色）
  out.neg = clamp01(-hp / max);
  out.koMark = vital ? koMarkFrac(opts.toughness) : null;
  if (out.neg >= 1) out.state = vital ? 'dead' : 'sever';
  else if (vital && out.koMark !== null && out.neg > out.koMark) out.state = 'coma';
  else out.state = vital ? 'ko' : 'disabled';
  return out;
}

// 出血の矢印（Kenshi: 血のバーの上の < が多いほど速く出ている）。0..3
export const BLEED_ARROW_STEPS = [0.02, 0.3, 0.9];
export function bleedArrows(bleed, gush) {
  if (gush > 0) return 3;
  const b = Number(bleed) || 0;
  let n = 0;
  for (const s of BLEED_ARROW_STEPS) if (b > s) n += 1;
  return n;
}

// 血のバー。KO の線は 30（これを下回ると倒れる）。
export function bloodBar(blood, bleed, gush, max = BLOOD_MAX) {
  const b = Number.isFinite(blood) ? blood : max;
  return {
    fill: clamp01(b / max),
    lost: clamp01((max - Math.max(0, b)) / max),
    koMark: clamp01(BLOOD_KO / max),
    arrows: bleedArrows(bleed, gush),
    text: fmtPair(b, max),
    low: b < BLOOD_KO,
  };
}

// 空腹のバー（この世界は 0〜100。25 未満で弱る）。Kenshi と同じく減っていく間は < を出す。
export const HUNGER_WEAK = 25;
export function hungerBar(hunger, max = 100) {
  if (typeof hunger !== 'number' || !Number.isFinite(hunger)) return null;
  return {
    fill: clamp01(hunger / max),
    weakMark: clamp01(HUNGER_WEAK / max),
    text: String(Math.round(hunger)),
    arrows: hunger > 0 ? 1 : 0,
    low: hunger < HUNGER_WEAK,
  };
}

// 窓の上の一言（Kenshi の Normal / Bleeding / Slightly Injured … に当たる）。
export function healthWord(actor) {
  if (!actor) return '';
  if (actor.state === 'dead') return '死亡';
  const parts = actor.parts || {};
  const t = (actor.skills && actor.skills.toughness) || 0;
  const ko = koMarkFrac(t);
  if (actor.state === 'down' || actor.state === 'getup') {
    for (const k of VITALS) {
      const p = parts[k];
      if (p && p.hp < -p.max * ko) return '昏睡';
    }
    if (typeof actor.blood === 'number' && actor.blood < BLOOD_KO) return '失血で気絶';
    return '気絶';
  }
  if (actor.gush > 0) return '大出血';
  let lost = 0;
  let full = 0;
  for (const k of Object.keys(parts)) {
    const p = parts[k];
    if (!p || !(p.max > 0)) continue;
    full += p.max;
    lost += Math.max(0, p.max - Math.max(0, p.hp));
  }
  const r = full > 0 ? lost / full : 0;
  if (Array.isArray(actor.missing) && actor.missing.length) return '手足を失った';
  if (r > 0.45) return '重傷';
  if (r > 0.2) return '負傷';
  if ((Number(actor.bleed) || 0) > BLEED_ARROW_STEPS[0]) return '出血';
  if (r > 0.03) return '軽傷';
  return '正常';
}
