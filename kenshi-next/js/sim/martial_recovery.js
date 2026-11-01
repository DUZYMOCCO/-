// 投げで倒された人の復帰時間と、姿勢に合う復帰クリップ。
export const MARTIAL_RECOVERY_TICK_SEC = 0.1;

export function martialRecoveryLevel(actor) {
  return Math.max(0, Number(actor?.skills?.martial) || 0, Number(actor?.skills?.athletics) || 0);
}

export function martialRecoveryMultiplier(level) {
  if (Number(level) >= 100) return 0.5;
  if (Number(level) >= 50) return 0.7;
  return 1;
}

export function martialRecoveryTicks(baseTicks, level) {
  return Math.max(1, Math.ceil(Math.max(0, Number(baseTicks) || 0) * martialRecoveryMultiplier(level)));
}

export function martialGetUpClip(pose, level, recovery = false) {
  const normalizedPose = pose === 'supine' ? 'supine' : 'prone';
  if (recovery && Number(level) >= 50 && normalizedPose === 'supine') return 'Getting Up (1)';
  return normalizedPose === 'supine' ? 'Getting Up' : 'Standing Up (1)';
}

export function martialGetUpRate(clip, ticks, recovery = false, level = 0) {
  if (!recovery || Number(level) < 50 || !(Number(ticks) > 0)) return 1;
  const duration = clip === 'Standing Up (1)' ? 1.6666666666666667 : 2.7;
  return duration / (Number(ticks) * MARTIAL_RECOVERY_TICK_SEC);
}
