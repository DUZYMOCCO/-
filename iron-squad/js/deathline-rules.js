import {attributeFamily} from './unit-attributes.js?v=248';
// 死線覚醒スキルの抽選と動的効果。昇格職も元の兵種で判定する。
export const LOW_HP_RATIO = 0.35, LOW_HP_SPEED_MULT = 1.3, LOW_HP_DAMAGE_MULT = 0.5;

const COMMON_SKILLS = ['SURVIVAL_INSTINCT','IRON_RESOLVE','PHANTOM_STEP','VETERAN_GRIT'];
const PREFERRED_SKILLS = {HEAVY:'IRON_RESOLVE',LIGHT:'PHANTOM_STEP',ARCHER:'DEADLY_FOCUS',MEDIC:'MIRACLE_PRAYER',MAGE:'PHANTOM_STEP'};
/** 術士には通常の物理会心、衛生職以外には回復・蘇生、射手以外には射程の覚醒を配らない。 */
export function deathlineSkillPool(unit) {
  const family=attributeFamily(unit);
  return [...COMMON_SKILLS,...(['HEAVY','LIGHT','ARCHER'].includes(family)?['BLOOD_RAGE']:[]),...(family==='ARCHER'?['DEADLY_FOCUS']:[]),...(family==='MEDIC'?['MIRACLE_PRAYER']:[])];
}
/** 既存の有効な技能を優先保持し、無効な技能だけを固定順で置換。再計算/再読込で再抽選しない。 */
export function normalizeDeathlineSkills(unit) {
  if(!unit||unit.isHero||unit.heroPartyId||unit.isPlayer||unit.isCommander)return false;
  const old=Array.isArray(unit.deathlineSkills)?unit.deathlineSkills:[],pool=deathlineSkillPool(unit);
  const used=new Set(old.filter(id=>pool.includes(id)));
  const preferred=PREFERRED_SKILLS[attributeFamily(unit)],replacementOrder=[preferred,...pool];
  const seen=new Set(),next=old.map(id=>{
    if(pool.includes(id)&&!seen.has(id)){seen.add(id);return id;}
    const replacement=replacementOrder.find(key=>key&&!used.has(key)&&!seen.has(key));
    if(replacement){used.add(replacement);seen.add(replacement);}return replacement;
  }).filter(Boolean);
  const changed=next.length!==old.length||next.some((id,i)=>id!==old[i]);
  if(changed||!Array.isArray(unit.deathlineSkills))unit.deathlineSkills=next;
  return changed;
}
/** 両方の覚醒経路が同じ候補・優先技能・上限を使う。 */
export function chooseDeathlineSkill(unit,random=Math.random) {
  normalizeDeathlineSkills(unit);
  if((unit.deathlineSkills||[]).length>=4)return null;
  const available=deathlineSkillPool(unit).filter(id=>!unit.deathlineSkills.includes(id));
  const preferred=PREFERRED_SKILLS[attributeFamily(unit)];
  return available.includes(preferred)?preferred:available[Math.min(available.length-1,Math.floor(random()*available.length))]||null;
}
/** デッドアイの射程。隊長・独立勇者・弾切れ時の白兵戦には掛けない。 */
export const deathlineRangedRange=(unit,range)=>range*(unit?.isPlayer||unit?.isHero||unit?.heroPartyId||unit?.isCommander?1:unit?.deathlineSkillRangeMult||1);

/** スキル一覧から動的効果の集計値を作る（兵士へ書き込む用）。 */
export function aggregateDeathlineDynamics(skillIds, table) {
  const r = { atkSpeed: 0, revivalSpeed: 1, regenPct: 0, lowHpGuard: false, lowHpSpeed: 0 };
  for (const id of skillIds || []) {
    const sk = table[id]; if (!sk) continue;
    r.atkSpeed += sk.atkSpeedBonus || 0;
    if (sk.rescueSpeedMult) r.revivalSpeed = Math.max(r.revivalSpeed, sk.rescueSpeedMult);
    r.regenPct += sk.regenPct || 0;
    if (sk.lowHpGuard) { r.lowHpGuard = true; r.lowHpSpeed = Math.max(r.lowHpSpeed, sk.lowHpSpeedPct || 0); }
  }
  return r;
}

const alive = s => !!s && !s.dead && !s.isDown && (s.hp || 0) > 0;
/** HP35%以下で底力が発動中か（サバイバルソウル）。 */
export const lowHpGuardActive = s => !!s?.deathlineLowHpGuard && alive(s) && s.hp <= (s.maxHp || 1) * LOW_HP_RATIO;
/** 被ダメージ補正（底力発動中は半減）。 */
export const deathlineDamage = (s, dmg) => lowHpGuardActive(s) ? Math.max(1, Math.round(dmg * LOW_HP_DAMAGE_MULT)) : dmg;
/** 救助（治療）進行の倍率。 */

/** 毎フレーム1回: 攻撃速度（CDを追加で進める）・自然治癒・底力の移動速度。ダウン中/死亡中は何もしない。 */
export function tickDeathline(s, dt) {
  if (!s || !(dt > 0)) return;
  if (s._lowHpBoost && !alive(s)) { s.speed = s._lowHpBaseSpeed; s._lowHpBoost = false; }
  if (!alive(s)) return;
  const asp = Number.isFinite(s.attackSpeedBonusPct)?0:s.deathlineAtkSpeed || 0;
  if (asp > 0 && (s.atkCooldown || 0) > 0) s.atkCooldown = Math.max(0, s.atkCooldown - dt * asp / 100);
  const regen = s.deathlineRegenPct || 0;
  if (regen > 0 && s.hp < s.maxHp) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * regen / 100 * dt);
  if (s.deathlineLowHpGuard && s.deathlineLowHpSpeed > 0) {
    const low = lowHpGuardActive(s);
    if (low && !s._lowHpBoost) { s._lowHpBaseSpeed = s.speed; s.speed = Math.floor(s.speed * (1 + s.deathlineLowHpSpeed / 100)); s._lowHpBoost = true; }
    else if (!low && s._lowHpBoost) { s.speed = s._lowHpBaseSpeed; s._lowHpBoost = false; }
  }
}
