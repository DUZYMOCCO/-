// Knockback distance: the attacker's strength against the target's size/weight and footing.
// Footing is relative: an enemy that takes many of this attacker's hits to fell stands its ground,
// so a trained, strong soldier can launch even tough enemies (off screen is acceptable).
// Brace: only the strength above a threshold (60% of the enemy's attack, capped) pushes at all,
// so early soldiers cannot shift invasion troops while trained ones and the commander can.
export const KNOCK_RULES = Object.freeze({
  playerStrengthRef: 50, soldierStrengthRef: 25, braceShare: .6, maxBrace: 180,
  baseRadius: 12, minMass: .6, bossMass: 1.5,
  footingHits: 3, maxFooting: 8,
  maxDistance: 1400, minFlight: 24,
  minTime: .45, maxTime: 1, timePerPx: 1 / 1600,
  slamShare: .6, minSlamRatio: .15,
  // Body collisions: the thrown enemy keeps part of its speed; the struck one is launched
  // with part of the remaining distance (scaled by weight) and carries a weaker slam.
  keepSpeed: .5, transferShare: .6, chainSlamShare: .7
});

export const knockBrace = monster => Math.min(KNOCK_RULES.maxBrace, Math.max(0, Number(monster?.atk) || 0) * KNOCK_RULES.braceShare);
export const strengthKnockMult = (strength, ref, brace = 0) =>
  Math.max(0, (Number.isFinite(Number(strength)) ? Number(strength) : ref) - brace) / ref;

/** Size and weight: area relative to an ordinary goblin; bosses are heavier for their size. */
export const knockMass = monster =>
  Math.max(KNOCK_RULES.minMass, ((monster?.radius || KNOCK_RULES.baseRadius) / KNOCK_RULES.baseRadius) ** 2)
  * (monster?.isBoss ? KNOCK_RULES.bossMass : 1);

/** Stronger enemies (more hits of this attacker to defeat) brace against the blow. */
export const knockFooting = (monster, attack) => {
  const hits = Math.max(0, Number(monster?.maxHp) || 0) / Math.max(1, Number(attack) || 1);
  return Math.min(KNOCK_RULES.maxFooting, Math.max(1, Math.sqrt(hits / KNOCK_RULES.footingHits)));
};

export function knockbackDistance(base, attacker, monster) {
  if (!monster || monster.isColossal || !(base > 0)) return 0;
  const {strength, strengthRef, attack} = attacker || {};
  const dist = base * strengthKnockMult(strength, strengthRef || KNOCK_RULES.soldierStrengthRef, knockBrace(monster))
    / (knockMass(monster) * knockFooting(monster, attack));
  return Math.min(KNOCK_RULES.maxDistance, dist);
}

/** Longer throws stay airborne longer; decay is chosen so ~96% of the distance is covered in the flight time. */
export function knockFlight(dist) {
  const time = Math.min(KNOCK_RULES.maxTime, Math.max(KNOCK_RULES.minTime, KNOCK_RULES.minTime + dist * KNOCK_RULES.timePerPx));
  return {time, decay: 3.15 / time};
}

/** Distance a struck enemy is sent: share of the thrower's remaining flight, by weight ratio. */
export function knockTransferDistance(remaining, thrown, struck) {
  if (!struck || struck.isColossal || !(remaining > 0)) return 0;
  const ratio = Math.min(2, knockMass(thrown) / knockMass(struck));
  return Math.min(KNOCK_RULES.maxDistance, remaining * KNOCK_RULES.transferShare * ratio);
}

/** Wall/obstacle impact damage, scaled by the speed still left at the moment of impact. */
export function slamDamage(slamBase, speedRatio) {
  if (!(slamBase > 0) || !(speedRatio >= KNOCK_RULES.minSlamRatio)) return 0;
  return Math.max(1, Math.round(slamBase * Math.min(1, speedRatio)));
}
