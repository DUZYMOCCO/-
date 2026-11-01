// 義肢の装着・技能・レシピ。部位キーは actor.missing と共通にする。
export const PROSTHETIC_PARTS = Object.freeze([
  Object.freeze({ key: 'lArm', kind: 'arm' }),
  Object.freeze({ key: 'rArm', kind: 'arm' }),
  Object.freeze({ key: 'lLeg', kind: 'leg' }),
  Object.freeze({ key: 'rLeg', kind: 'leg' }),
]);

export const PROSTHETIC_RECIPES = Object.freeze({
  prosthetic_arm: Object.freeze({ materials: Object.freeze({ wood: 2, cloth: 1, metal: 1 }), seconds: 50 }),
  prosthetic_leg: Object.freeze({ materials: Object.freeze({ wood: 3, cloth: 1, metal: 1 }), seconds: 60 }),
  iron_prosthetic_arm: Object.freeze({ materials: Object.freeze({ metal: 3, cloth: 1 }), seconds: 70 }),
  iron_prosthetic_leg: Object.freeze({ materials: Object.freeze({ metal: 4, cloth: 1 }), seconds: 80 }),
});

export function prostheticIndex(partKey) {
  return PROSTHETIC_PARTS.findIndex((part) => part.key === partKey);
}

export function prostheticFor(actor, partKey) {
  const index = prostheticIndex(partKey);
  return index < 0 ? null : actor?.equip?.prosthetic?.[index] || null;
}

export function prostheticKind(item) {
  if (item?.id === 'prosthetic_arm' || item?.id === 'iron_prosthetic_arm') return 'arm';
  if (item?.id === 'prosthetic_leg' || item?.id === 'iron_prosthetic_leg') return 'leg';
  return null;
}

export function canAttachProsthetic(actor, item, index) {
  const part = PROSTHETIC_PARTS[index];
  if (!part) return { ok: false, reason: '装着する部位を選んでください' };
  if (prostheticKind(item) !== part.kind) return { ok: false, reason: '義肢の種類が部位に合いません' };
  if (!actor?.missing?.includes(part.key)) return { ok: false, reason: '欠損した部位にだけ装着できます' };
  if (actor.equip?.prosthetic?.[index]) return { ok: false, reason: 'この部位には義肢が付いています' };
  return { ok: true, reason: '' };
}

export function attachProsthetic(actor, item, index) {
  const check = canAttachProsthetic(actor, item, index);
  if (!check.ok) return check;
  const partKey = PROSTHETIC_PARTS[index].key;
  // 旧セーブの gushing loss は部位別記録がないため、未補綴の欠損部位に分けて扱う。
  if (!actor.limbLossGush || typeof actor.limbLossGush !== 'object') {
    const openParts = (actor.missing || []).filter((key) => prostheticIndex(key) >= 0 && !prostheticFor(actor, key));
    const share = openParts.length ? Math.max(0, Number(actor.gush) || 0) / openParts.length : 0;
    actor.limbLossGush = Object.fromEntries(openParts.map((key) => [key, share]));
  }
  if (!actor.limbLossBleed || typeof actor.limbLossBleed !== 'object') {
    const openParts = (actor.missing || []).filter((key) => prostheticIndex(key) >= 0 && !prostheticFor(actor, key));
    const share = openParts.length ? Math.min(0.5, Math.max(0, Number(actor.bleed) || 0) / openParts.length) : 0;
    actor.limbLossBleed = Object.fromEntries(openParts.map((key) => [key, share]));
  }
  actor.equip.prosthetic[index] = item;
  const gush = Math.max(0, Number(actor.limbLossGush[partKey]) || 0);
  actor.gush = Math.max(0, (Number(actor.gush) || 0) - gush);
  delete actor.limbLossGush[partKey];

  const bleed = Math.max(0, Number(actor.limbLossBleed?.[partKey]) || 0);
  actor.bleed = Math.max(0, (Number(actor.bleed) || 0) - bleed);
  if (actor.limbLossBleed) delete actor.limbLossBleed[partKey];
  return { ok: true, reason: '', partKey };
}

export function detachProsthetic(actor, index) {
  if (!PROSTHETIC_PARTS[index]) return { ok: false, reason: '枠がありません' };
  const item = actor?.equip?.prosthetic?.[index];
  if (!item) return { ok: false, reason: '義肢が付いていません' };
  actor.equip.prosthetic[index] = null;
  (actor.inv ||= []).push(item);
  return { ok: true, reason: '', item, partKey: PROSTHETIC_PARTS[index].key };
}

export function prostheticLegFactor(actor) {
  let factor = 1;
  for (const key of ['lLeg', 'rLeg']) {
    const item = prostheticFor(actor, key);
    if (!item) continue;
    factor *= item.id === 'iron_prosthetic_leg' ? 0.9 : 0.8;
  }
  return factor;
}

export function prostheticsSkill(actor) {
  const value = Number(actor?.skills?.prosthetics);
  return Math.max(0, Math.min(150, Number.isFinite(value) ? value : 1));
}

export function prostheticRank(skill) {
  return Math.max(1, Math.min(10, 1 + Math.floor(Math.min(100, prostheticsSkill({ skills: { prosthetics: skill } })) / 10)));
}

export function gainProstheticsXp(actor) {
  actor.skills ||= {};
  const current = prostheticsSkill(actor);
  if (current >= 100) return { xp: 0, newSkill: current };
  const xp = Math.round(Math.max(0.05, 0.8 * (1 - Math.min(100, current) / 110)) * 100) / 100;
  actor.skills.prosthetics = Math.min(100, Math.round((current + xp) * 100) / 100);
  return { xp, newSkill: actor.skills.prosthetics };
}
