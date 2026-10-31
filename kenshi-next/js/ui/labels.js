// 頭上の名前と、タップした相手の情報（勢力・関係・状態）の決まり。DOM・Three.js に依存しない。
// Kenshi どおり: 名前が頭上に常に出るのは自分の仲間だけ。選択中の仲間は [名前]。NPC は出さない。

import { FACTIONS, isHostile } from '../sim/data.js';

export const OPTION_NAMES_KEY = 'sunahate_opt_names';

export const RELATION = {
  self: { key: 'self', text: '仲間', color: '#e8c65a' },
  hostile: { key: 'hostile', text: '敵対', color: '#ff5a4e' },
  neutral: { key: 'neutral', text: '中立', color: '#f4efe6' },
  friendly: { key: 'friendly', text: '友好', color: '#7fd46a' },
};

function findActor(state, id) {
  if (!state || !Array.isArray(state.actors) || id === null || id === undefined) return null;
  for (const actor of state.actors) {
    if (actor.id === id) return actor;
  }
  return null;
}

export function playerFactionOf(state) {
  const player = findActor(state, state ? state.playerId : null);
  return player ? player.faction : 'player';
}

// 仲間か（部隊の一員）。squadIds が無い古いセーブでは勢力で見る。
export function isSquadMember(state, actor) {
  if (!actor) return false;
  if (state && Array.isArray(state.squadIds) && state.squadIds.length > 0) {
    return state.squadIds.includes(actor.id);
  }
  return actor.faction === playerFactionOf(state);
}

// 頭上に名前を出すか。仲間だけ・設定で消せる。担がれている間は担ぐ人と重なるので出さない。
export function shouldShowSquadLabel(state, actor, showNames) {
  if (!showNames || !actor) return false;
  if (!isSquadMember(state, actor)) return false;
  if (actor.carriedBy !== null && actor.carriedBy !== undefined) return false;
  return true;
}

export function squadLabelText(actor, selectedId) {
  if (!actor) return '';
  const name = actor.name || '';
  return actor.id === selectedId ? '[' + name + ']' : name;
}

// 名前の見た目の種類（色分け用）。
export function squadLabelKind(actor, selectedId) {
  if (!actor) return 'normal';
  if (actor.state === 'dead') return 'dead';
  if (actor.id === selectedId) return 'selected';
  if (actor.state === 'down' || actor.state === 'getup') return 'down';
  return 'normal';
}

// プレイヤー側から見た関係。友好は state.relations に 'friendly' がある時だけ。
export function relationOf(state, actor) {
  if (!actor) return RELATION.neutral;
  const pf = playerFactionOf(state);
  if (actor.faction === pf || isSquadMember(state, actor)) return RELATION.self;
  if (isHostile(state, pf, actor)) return RELATION.hostile;
  const rel = state && state.relations ? state.relations : null;
  if (rel) {
    const a = pf < actor.faction ? pf : actor.faction;
    const b = pf < actor.faction ? actor.faction : pf;
    if (rel[a + '_' + b] === 'friendly' || rel[actor.faction + '_' + pf] === 'friendly') {
      return RELATION.friendly;
    }
  }
  return RELATION.neutral;
}

export const BLEED_SHOW = 0.02;

// 状態の短い言葉（死亡・気絶・出血）。何も無ければ空の配列。
export function conditionList(actor) {
  const out = [];
  if (!actor) return out;
  if (actor.state === 'dead') {
    out.push('死亡');
    return out;
  }
  if (actor.bound) out.push(actor.meal ? '食われている' : '杭に縛られている');
  else if (actor.state === 'down' || actor.state === 'getup') out.push('気絶');
  if (actor.gush > 0) out.push('大出血');
  else if (typeof actor.bleed === 'number' && actor.bleed > BLEED_SHOW) out.push('出血');
  if (typeof actor.blood === 'number' && actor.blood < 100) out.push('血 ' + Math.max(0, Math.round(actor.blood)));
  const MISS = { lArm: '左腕', rArm: '右腕', lLeg: '左脚', rLeg: '右脚' };
  if (Array.isArray(actor.missing) && actor.missing.length) {
    out.push(actor.missing.map((k) => MISS[k] || k).join('・') + 'なし');
  }
  return out;
}

// 情報パネルの2行目（勢力と関係）。
export function factionLine(state, actor) {
  if (!actor) return { faction: '', relation: RELATION.neutral };
  const f = FACTIONS[actor.faction];
  return { faction: f ? f.name : String(actor.faction || ''), relation: relationOf(state, actor) };
}

// 画面上で重なる仲間の名前と目を上へずらす（純粋関数・テストあり）。
// items: [{ id, x, y, hw, h }]（y は頭の基準点、塊は y-h..y）。戻り値: id -> ずらす px。
export function resolveNudges(items, pad) {
  const gap = pad === undefined ? 2 : pad;
  const order = items.slice().sort((a, b) => b.y - a.y || a.id - b.id);
  const placed = [];
  const out = new Map();
  for (const it of order) {
    let nudge = 0;
    for (let iter = 0; iter < 12; iter += 1) {
      let moved = false;
      const bottom = it.y - nudge;
      const top = bottom - it.h;
      for (const p of placed) {
        if (Math.abs(it.x - p.x) >= it.hw + p.hw) continue;
        const pb = p.y - p.nudge;
        const pt = pb - p.h;
        if (bottom <= pt - gap || top >= pb + gap) continue;
        nudge = it.y - (pt - gap);
        moved = true;
        break;
      }
      if (!moved) break;
    }
    placed.push({ x: it.x, y: it.y, hw: it.hw, h: it.h, nudge });
    out.set(it.id, nudge);
  }
  return out;
}

// 情報パネルの武器の行。クロスボウを持つ人だけ（例: 「クロスボウ 装填済み・矢 12」）。
export function weaponLine(actor) {
  if (!actor || !actor.crossbow || actor.state === 'dead') return '';
  const c = actor.crossbow;
  let st;
  if (c.loaded) st = '装填済み';
  else if (c.bolts > 0) st = '装填中';
  else st = '矢なし';
  return 'クロスボウ ' + st + '・矢 ' + c.bolts;
}
