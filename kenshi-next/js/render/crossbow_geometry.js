// Shared immutable templates, one geometry assembly per item and cosmetic look.
import { WB_CROSSBOW_ID, buildWbCrossbowGeometry } from './wb_weapon_geometry.js';

export const CROSSBOW_IDS = ['crossbow', 'light_crossbow', 'heavy_crossbow', 'scrap_crossbow'];
// 既存の CROSSBOW_IDS はそのままに、追加の弩（wa_ / wb_）を別枠で加える（既存の数を変えない）。
export const EXTRA_CROSSBOW_IDS = ['wa_arashi_crossbow', WB_CROSSBOW_ID];
export const ALL_CROSSBOW_IDS = [...CROSSBOW_IDS, ...EXTRA_CROSSBOW_IDS];
export function buildCrossbowGeometry(THREE, id, look, materials) {
  // wb_ の弩は既存の 4 種と形を共有しない専用の組み立て。
  if (id === WB_CROSSBOW_ID) return buildWbCrossbowGeometry(THREE, look, materials);
  const type = Math.max(0, ALL_CROSSBOW_IDS.indexOf(id)); // wa_arashi_crossbow は 4
  const v = ((Number(look) || 0) % 3 + 3) % 3;
  const g = new THREE.Group();
  const add = (name, dims, pos, rotation = 0, mat = materials.metal) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...dims), mat);
    m.name = name; m.position.set(...pos); m.rotation.y = rotation; g.add(m);
  };
  const len = [.66, .53, .80, .70, .74][type];
  add('stock', [.13 + type*.014, .14 + v*.02, len], [0, 0, .10], 0, materials.wood);
  add('butt', [.10 + type*.015, .12 + v*.025, .18 + type*.025], [0, -.055-v*.012, -.22-type*.025], v*.08, materials.wood);
  if (type === 1) add('grip', [.06,.16,.07], [0,-.13,-.08], 0, materials.wood);
  if (type === 2) add('reinforcement', [.13,.035,.32], [0,.065,.12]);
  if (type === 3) { add('patch', [.12,.045,.17], [0,.07,-.06]); add('brace', [.14,.035,.09], [0,-.07,.28]); }
  // 嵐呼びの弩（wa_）: 前握り・長い道床・引き金の囲いで他と形を分ける。
  if (type === 4) {
    add('foregrip', [.055,.18,.07], [0,-.135,.26], 0, materials.wood);
    add('rail', [.10,.03,.46], [0,.075,.16]);
    add('trigger_guard', [.03,.10,.13], [0,-.08,.02]);
    if (v > 0) add('windlass', [.20+v*.02,.05,.09], [0,.10,-.20], 0, materials.wood);
  }
  for (const side of [-1,1]) {
    add('limb', [.31+type*.035+v*.025,.08+type*.008,.09], [side*(.17+type*.018),.02,.38], side*([.12,-.30,.40][v]+type*.04));
    if (v !== 0 || type === 1) add('recurve', [.14+type*.015,.06,.07], [side*(.38+type*.035),.02,.42+v*.025], -side*(.4+v*.15));
  }
  add('string', [.62+type*.07,.012,.012], [0,.02,.30]);
  if (v > 0 || type === 2) add('sight', [.035,.10+type*.015,.04], [0,.11,.24]);
  if (v === 2 || type === 3) add('magazine', [.10+type*.01,.14+v*.02,.12+type*.02], [0,.12,.06], 0, materials.wood);
  return g;
}
