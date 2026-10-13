// 死線覚醒スキルの動的効果（攻撃速度・自然治癒・HP低下時の底力）。値は recalcSoldierStats が兵士に集計する。
export const LOW_HP_RATIO = 0.35, LOW_HP_SPEED_MULT = 1.3, LOW_HP_DAMAGE_MULT = 0.5;

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
  const asp = s.deathlineAtkSpeed || 0;
  if (asp > 0 && (s.atkCooldown || 0) > 0) s.atkCooldown = Math.max(0, s.atkCooldown - dt * asp / 100);
  const regen = s.deathlineRegenPct || 0;
  if (regen > 0 && s.hp < s.maxHp) s.hp = Math.min(s.maxHp, s.hp + s.maxHp * regen / 100 * dt);
  if (s.deathlineLowHpGuard && s.deathlineLowHpSpeed > 0) {
    const low = lowHpGuardActive(s);
    if (low && !s._lowHpBoost) { s._lowHpBaseSpeed = s.speed; s.speed = Math.floor(s.speed * (1 + s.deathlineLowHpSpeed / 100)); s._lowHpBoost = true; }
    else if (!low && s._lowHpBoost) { s.speed = s._lowHpBaseSpeed; s._lowHpBoost = false; }
  }
}
