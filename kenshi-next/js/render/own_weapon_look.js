// 系統の glb 見た目ではなく、専用の手続き的な形を使う武器の ID。
// weaponModel（glb）はこれらに null を返し、呼び出し側は proceduralWeapon /
// buildCrossbowGeometry の専用形状へ落ちる。
export const OWN_LOOK_IDS = new Set([
  'wa_kazekiri_tachi',
  'wa_iwari_otsuchi',
  'wa_tsukikage_yari',
  'wa_arashi_crossbow',
]);

export function hasOwnLook(id) {
  return OWN_LOOK_IDS.has(id);
}
