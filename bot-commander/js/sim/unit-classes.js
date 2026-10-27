// 兵種は機体の種類とは別。視界は決定済み。
export const CLASS_TABLE = Object.freeze({
  rookie: { dataKey: 'ROOKIE', name: '新入り', mark: '新', sight: 5 },
  gunner: { dataKey: 'GUNNER', name: 'ガンナー', mark: 'ガ', sight: 4.5 },
  scout: { dataKey: 'SCOUT', name: 'スカウト', mark: 'ス', sight: 8 },
  supporter: { dataKey: 'SUPPORT', name: 'サポーター', mark: 'サ', sight: 5 },
  scavenger: { dataKey: 'SCAVENGER', name: 'スカベンジャー', mark: 'カ', sight: 6 },
  stealth: { dataKey: 'STEALTH', name: 'ストーカー', mark: 'ト', sight: 6 },
  repairer: { dataKey: 'REPAIRER', name: 'リペアラー', mark: 'リ', sight: 5 },
});
// 【仮】持ち主が決める表。数字はここだけ直せばよい。carry はまだ効かない。
export const CLASS_MULS = Object.freeze({
  rookie: { speed: 1, hp: 1, atk: 1, carry: 1 },
  gunner: { speed: .90, hp: 1.20, atk: 1.20, carry: 1.15 },
  scout: { speed: 1.15, hp: .85, atk: 1, carry: .85 },
  supporter: { speed: 1, hp: .85, atk: .85, carry: 1.10 },
  scavenger: { speed: 1.15, hp: 1.20, atk: .85, carry: 1.20 },
  stealth: { speed: 1.15, hp: .85, atk: 1, carry: 1 },
  repairer: { speed: 1, hp: .85, atk: .85, carry: 1 },
});
// 【仮】持ち主が決める表。行の位置ではなく元の kind と座標で引く。
export const CLASS_ASSIGN = Object.freeze({ m1: {
  'scav@20,53': ['scavenger', 'scavenger', 'scavenger', 'scavenger'],
  'ponco@15,55': ['scout', 'gunner', 'gunner', 'repairer'],
  'ponco@25,55': ['stealth', 'gunner', 'gunner', 'supporter'],
} });
export const CLASS_ASSIGN_BY_KIND = Object.freeze({ flyer: 'scout' });
const DEFAULT_MULS = Object.freeze({ speed: 1, hp: 1, atk: 1, carry: 1 });
export const classInfo = cls => CLASS_TABLE[cls] ?? null;
export const classSight = cls => classInfo(cls)?.sight ?? null;
export const classMuls = cls => CLASS_MULS[cls] ?? DEFAULT_MULS;
export function classAssignFor(missionId, def, j, base) {
  const row = CLASS_ASSIGN[missionId]?.[`${def.kind}@${def.tx},${def.ty}`];
  return row ? row[j] ?? base : CLASS_ASSIGN_BY_KIND[def.kind] ?? base;
}
export function applyClassToUnit(u) {
  if (u.side !== 'ally' || u.human || u.object || u.kind === 'giant' || !classInfo(u.cls)) return;
  const m = classMuls(u.cls);
  u.engageSight = u.sight; u.sight = classSight(u.cls);
  u.speed *= m.speed; u.atk *= m.atk;
  u.maxHp = Math.round(u.maxHp * m.hp); u.hp = Math.round(u.hp * m.hp);
  u.shieldMax = Math.round(u.shieldMax * m.hp); u.shieldHp = Math.round(u.shieldHp * m.hp);
}
const CLASS_KEYS = Object.keys(CLASS_TABLE);
export function classHashValues(sim) {
  const out = [];
  for (const u of sim.units) if (u.side === 'ally' && !u.human && !u.object && u.kind !== 'giant' && classInfo(u.cls)) {
    out.push(u.id, CLASS_KEYS.indexOf(u.cls) + 1, Math.round(u.sight * 100), Math.round(u.engageSight * 100), Math.round(u.speed * 1000), Math.round(u.atk * 1000), u.maxHp, u.shieldMax);
  }
  return out;
}
export function classSummary(units) {
  const counts = new Map();
  for (const u of units) if (classInfo(u.cls)) counts.set(u.cls, (counts.get(u.cls) || 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 1) return classInfo(counts.keys().next().value).name;
  return [...counts].map(([cls, n]) => `${classInfo(cls).mark}${n}`).join(' ');
}
