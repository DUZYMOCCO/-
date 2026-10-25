// 武器庫（出撃前の装備えらび）の計算。DOM・Pixi・Math.random なし（テストから読める）。画面は armory-view.js。
// v0.4.8-dev（10/24 お試し）: 機体ごとの枠の数・入れてよい物・兵種に向く物の絞り込み・出撃の時にシムへ反映する applyLoadout。
// 武器の資料は assets/weapons/armory-data.json（tools_claude/build_armory_assets.py が refs/weapons の weapons.json・weapons.js から写して作る）。
//   data = { SLOTS, SLOT_EXPANDER, weapons: [武器の行] }。数値は資料のまま（丸めない・足さない）。
// 装備を選ばない時（loadout を省く・空）は、シムの機体を1つも変えない（乱数を引かない・プロパティを足さない）。
import { weaponById } from '../sim/weapons.js?v=5';
import { WEAPON_DROP, weaponMul } from '../sim/cover.js?v=6';
import { buildLoadoutFx, RANGE_PX, traitsOf } from '../sim/loadout-effects.js?v=3'; // 2つ目以降の武器・修理・バリアの効き目（戦闘の計算は向こう）

/** 機体の種類 → 体の大きさ（data.SLOTS のキー）。PONCO02 は全高 2.4m（design_robot_identity_v3 の 5-1）＝ mid。
 *  ツギハギ号（設定上の新しい名前はジェミニ）は「改0 のジェミニ」＝ kai0（最初の体）。どちらも【仮】 */
export const BODY_OF_KIND = Object.freeze({ ponco: 'mid', scav: 'kai0' });
/** 資料にない種類は一番小さい体にする（無難） */
export const bodyOf = kind => BODY_OF_KIND[kind] || 'small';

/** 兵種のキー（sim の UNIT_CLASSES）→ weapons.json の classes の値。リペアラーは資料に値がないので classFits で別に決める */
export const JSON_CLASS = Object.freeze({
  rookie: 'ROOKIE', gunner: 'GUNNER', scout: 'SCOUT', supporter: 'SUPPORT', scavenger: 'SCAVENGER', stealth: 'STEALTH', giant: 'GIANT',
});
/** classes の値の読み方（カードに出す。資料の値そのまま＋日本語） */
export const JSON_CLASS_NAME = Object.freeze({
  ALL: '全兵種', ROOKIE: '新入り', GUNNER: 'ガンナー', SCOUT: 'スカウト', SUPPORT: 'サポーター', SCAVENGER: 'スカベンジャー', STEALTH: 'ストーカー', GIANT: '巨大機',
});

/** 枠の種類 */
export const SLOT_KINDS = Object.freeze(['weapon', 'back', 'support']);
/** 背中の枠に入る「大物」: 武器の枠の物で、付く場所が背中、大きさが L か XL（資料の roster 7-2-1「背中（大物だけ）」から決めた【仮】） */
export const BACK_SIZES = Object.freeze(['L', 'XL']);
export const isBackItem = row => !!row && row.slot === 'weapon' && row.attach === 'back' && BACK_SIZES.includes(row.size);

/**
 * 体 body・IT-01 を付けた数 it01 での枠の数。weapon＝手・肩などの武器の枠（IT-01 の分を含む）、back＝背中の枠、support＝修理・バリアの枠。
 * 資料の slotCount（weapon + back + 拡張）と合計 total が同じ。IT-01 は maxPerBody（1）個まで。
 */
export function slotCounts(data, body, it01 = 0) {
  const s = data.SLOTS[body];
  if (!s) throw new Error(`体の大きさがない: ${body}`);
  const x = Math.min(it01 ? 1 : 0, data.SLOT_EXPANDER.maxPerBody);
  return { weapon: s.weapon + x, back: s.back, support: s.support, total: s.weapon + s.back + x };
}

/** この物をこの種類の枠に入れてよいか（罠 carry・素手など default はどの枠にも入らない） */
export function slotAccepts(row, slotKind) {
  if (!row) return false;
  if (slotKind === 'support') return row.slot === 'support';
  if (slotKind === 'back') return isBackItem(row);
  if (slotKind === 'weapon') return row.slot === 'weapon' && !isBackItem(row);
  return false;
}

/**
 * その兵種に向く物か（weapons.json の classes。ALL はみな向く）。【仮】の決め方:
 * - リペアラー（資料の classes に値がない）: 修理の道具（type repair。巨大機専用は除く）と、ALL・ROOKIE の物
 * - サポーター: 修理はリペアラーへ移った（design v3 の 10/24 09:48）ので、classes に SUPPORT があっても type repair は向かない（バリアは向く）
 */
export function classFits(row, cls) {
  if (!row) return false;
  if (row.classes.includes('ALL')) return true;
  if (cls === 'repairer') return (row.type === 'repair' && !row.classes.every(c => c === 'GIANT')) || row.classes.includes('ROOKIE');
  if (cls === 'supporter' && row.type === 'repair') return false;
  const key = JSON_CLASS[cls];
  return !!key && row.classes.includes(key);
}

/**
 * 枠に入れられる候補（カードの一覧）。slotKind: 'weapon'|'back'|'support'。
 * classOnly: その兵種に向く物だけ。type: '' ならすべて。stage: null ならすべて。並びは 段階 → 格 → id（いつも同じ）。
 */
export function candidates(data, { slotKind, cls = null, classOnly = true, type = '', stage = null } = {}) {
  return data.weapons
    .filter(r => slotAccepts(r, slotKind) && (!classOnly || classFits(r, cls)) && (!type || r.type === type) && (stage == null || r.stage === stage))
    .sort((a, b) => a.stage - b.stage || a.tier - b.tier || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** 出撃で効くか。'active'＝効く／'noEffect'＝シムでは効かない／'stored'＝知らない枠の種類（しまっておくだけ）
 *  - 武器の枠（IT-01 で増えた枠も）と背中の枠: シムが持てる type（WEAPON_DROP.accepts）の物。2つ目以降・背中は戦闘で使い分けに入る（loadout-effects.js の pickShot）。射程の分けが分からない物は2つ目以降では効かない
 *  - 修理/バリアの枠: 修理の道具（repair）とバリアの道具（barrier）。どの機体でも効く（ツギハギ号も） */
export function simEffect(kind, row, slotKind, index) {
  if (slotKind === 'support') return row && row.slot === 'support' && (row.type === 'repair' || row.type === 'barrier') ? 'active' : 'noEffect';
  if (slotKind !== 'weapon' && slotKind !== 'back') return 'stored';
  const acc = WEAPON_DROP.accepts[kind];
  if (!(acc && row && acc.includes(row.type) && row.slot === 'weapon')) return 'noEffect';
  const tr = traitsOf(row.id);
  return slotKind === 'weapon' && index === 0 || (tr && RANGE_PX[tr.rangeKey]) ? 'active' : 'noEffect';
}

// ---- 1機分の装備（entry）。{ weapon: [id|null,...], back: [...], support: [...], it01: 0|1 } ----
export const emptyEntry = () => ({ weapon: [], back: [], support: [], it01: 0 });
const idsOf = e => [...(e.weapon || []), ...(e.back || []), ...(e.support || [])].filter(Boolean);
/** 何も付けていない（IT-01 もなし）か */
export const entryIsEmpty = e => !e || (!idsOf(e).length && !e.it01);

/** 枠の数に合わせて整える。ない id・入れてはいけない物・多い分は捨てる。返り値は新しい entry（元は変えない） */
export function normalizeEntry(data, body, raw) {
  const it01 = raw && raw.it01 ? 1 : 0;
  const n = slotCounts(data, body, it01);
  const byId = new Map(data.weapons.map(r => [r.id, r]));
  const fit = (list, count, slotKind) => Array.from({ length: count }, (_, i) => {
    const id = list && list[i];
    return id && slotAccepts(byId.get(id), slotKind) ? id : null;
  });
  return { weapon: fit(raw && raw.weapon, n.weapon, 'weapon'), back: fit(raw && raw.back, n.back, 'back'), support: fit(raw && raw.support, n.support, 'support'), it01 };
}

/** 枠 (slotKind, index) に id を入れた新しい entry（id が null なら外す） */
export function setSlot(entry, slotKind, index, id) {
  const e = { weapon: [...entry.weapon], back: [...entry.back], support: [...entry.support], it01: entry.it01 ? 1 : 0 };
  e[slotKind][index] = id || null;
  return e;
}
/** 同じ物をもう一度押したら外す */
export const toggleSlot = (entry, slotKind, index, id) => setSlot(entry, slotKind, index, entry[slotKind][index] === id ? null : id);

/** IT-01 を付ける（持っている数 owned が 1 以上で、まだ付いていない時だけ）。付けたら外せない。付けられなければ null */
export function attachIt01(data, body, entry, owned) {
  if (!(owned > 0) || entry.it01) return null;
  return normalizeEntry(data, body, { ...entry, it01: 1 });
}

// ---- 出撃する機体の一覧（MISSION_1.ally の並びから、毎回同じ名前で決まる） ----
/**
 * ミッションの味方ロボットの一覧 → [{ label, kind, cls, body }]。人間は武器を持たないので入れない。
 * label は createSim が機体に付ける名前（PONCO1〜・ツギハギ1〜）と同じ。kinds は sim.js の KINDS。
 */
export function buildRoster(mission, kinds) {
  const seen = {}, out = [];
  for (const def of mission.ally) {
    const info = kinds[def.kind];
    if (!info || info.human || def.ai) continue;
    const n = Math.max(1, def.count ?? 1);
    for (let j = 0; j < n; j++) {
      seen[def.kind] = (seen[def.kind] || 0) + 1;
      const cls = Array.isArray(def.cls) ? def.cls[j] ?? null : def.cls ?? null;
      out.push({ label: n === 1 && def.name ? def.name : `${info.short}${seen[def.kind]}`, kind: def.kind, cls, body: bodyOf(def.kind) });
    }
  }
  return out;
}

/** 保存してあった物（localStorage の中身など）→ 一覧の機体だけの、整えた loadout。読めない物は何も付けていないことにする。空の機体は入れない */
export function sanitizeLoadout(data, roster, raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const r of roster) {
    const src = raw[r.label];
    if (!src || typeof src !== 'object') continue;
    const e = normalizeEntry(data, r.body, src);
    if (!entryIsEmpty(e)) out[r.label] = e;
  }
  return out;
}

/**
 * 出撃の時（createSim の機体を置いた後）に、選んだ装備を機体へ反映する。loadout は { 機体の名前: entry }。
 * - 1つ目の武器の枠の武器を u.weapon に入れ、u.wmul は weaponMul(u.kind, row)（拾った時の「今より強い時だけ」の決まりは使わない）。
 *   シムが持てない type（WEAPON_DROP.accepts にない。ツギハギ号は何も持てない）・武器の枠でない物は反映しない。
 * - 選んだ装備は u.loadout にもしまう（武器庫の確かめ用。hashSim には混ぜない）。
 * - 2つ目からの武器（IT-01 で増えた枠も）・背中・修理/バリアの道具は、loadout-effects.js の buildLoadoutFx で u.loadoutFx（戦闘の効き目）にする。
 *   戦闘での使い方は sim.js の updateCombat（pickShot）・updateKits（healByLoadout）・shieldStats（withLoadoutShield）から。
 *   バリアの耐久はここで u.shieldMax・u.shieldHp に足す（シールドの数値・makeUnit は書きかえず、上から足す）。entry は sanitizeLoadout で整えた物を渡す（枠の数はそこで決まる）。
 * - 省いた・空の loadout、空の entry の機体には何もしない（u.loadout も u.loadoutFx も付けない）。
 */
export function applyLoadout(sim, loadout) {
  if (!loadout) return;
  for (const u of sim.units) {
    if (u.side !== 'ally' || u.human || u.aiAlly) continue;
    const e = loadout[u.label];
    if (entryIsEmpty(e)) continue;
    u.loadout = { weapon: [...(e.weapon || [])], back: [...(e.back || [])], support: [...(e.support || [])], it01: e.it01 ? 1 : 0 };
    const row = e.weapon && e.weapon[0] ? weaponById(e.weapon[0]) : null;
    if (row && simEffect(u.kind, row, 'weapon', 0) === 'active') { u.weapon = row.id; u.wmul = weaponMul(u.kind, row); }
    const fx = buildLoadoutFx(u, e);
    if (fx) {
      u.loadoutFx = fx;
      if (fx.shield && u.shieldMax > 0) { u.shieldMax += fx.shield.hp; u.shieldHp += fx.shield.hp; }
    }
  }
}
