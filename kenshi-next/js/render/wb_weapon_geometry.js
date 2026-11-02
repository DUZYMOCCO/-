// wb_ の武器だけに使う専用の形。握りを原点にし、+Z へ伸ばす既存の約束に合わせる。
// 既存系統の glb や既存 ID の形は使わない（weapons_v3 側で wb_ は null を返す）。
export const WB_MELEE_IDS = ['wb_moonseam_katana', 'wb_quarry_maul', 'wb_reed_glaive'];
export const WB_CROSSBOW_ID = 'wb_storm_crossbow';
export const WB_WEAPON_IDS = [...WB_MELEE_IDS, WB_CROSSBOW_ID];

const palette = (THREE, materials = {}) => ({
  steel: materials.steel || materials.metal || new THREE.MeshStandardMaterial({ color: 0x8d999e, metalness: .55, roughness: .5 }),
  wood: materials.wood || new THREE.MeshStandardMaterial({ color: 0x5a4029, roughness: .9 }),
  accent: materials.accent || new THREE.MeshStandardMaterial({ color: 0xb08a4e, metalness: .45, roughness: .55 }),
});

function box(THREE, group, name, dims, pos, material, rotationY = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(dims[0], dims[1], dims[2]), material);
  mesh.name = name;
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.y = rotationY;
  group.add(mesh);
  return mesh;
}

function katana(THREE, v, mat) {
  const g = new THREE.Group();
  const gripLen = .20 + v * .012;
  const bladeLen = .70 + v * .06;
  const guardZ = gripLen + .014;
  box(THREE, g, 'grip', [.042, .052, gripLen], [0, 0, gripLen / 2], mat.wood);
  box(THREE, g, 'pommel', [.05, .055, .024], [0, 0, .012], mat.accent);
  box(THREE, g, 'tsuba', [.155 + v * .028, .02, .028], [0, 0, guardZ], mat.accent);
  box(THREE, g, 'blade', [.038 + v * .006, .014, bladeLen], [0, 0, guardZ + .014 + bladeLen / 2], mat.steel);
  box(THREE, g, 'ridge', [.012, .007, bladeLen * .78], [0, .011, guardZ + .014 + bladeLen * .5], mat.steel);
  box(THREE, g, 'tip', [.026, .012, .06], [0, 0, guardZ + .014 + bladeLen + .028], mat.steel);
  if (v > 0) box(THREE, g, 'moon', [.055 + v * .01, .026, .018], [.062, 0, guardZ + .02], mat.accent);
  return g;
}

function maul(THREE, v, mat) {
  const g = new THREE.Group();
  const haftLen = .84 + v * .05;
  const headW = .32 + v * .05;
  const headH = .17 + v * .02;
  const headD = .20 + v * .03;
  box(THREE, g, 'haft', [.05, .05, haftLen], [0, 0, haftLen / 2], mat.wood);
  box(THREE, g, 'butt', [.062, .062, .03], [0, 0, .015], mat.accent);
  box(THREE, g, 'collar', [.09, .10, .06], [0, 0, haftLen + .03], mat.steel);
  box(THREE, g, 'head', [headW, headH, headD], [0, 0, haftLen + .06], mat.steel);
  box(THREE, g, 'spike', [.038, .038, .10 + v * .03], [0, 0, haftLen + .06 + headD / 2 + (.10 + v * .03) / 2], mat.accent);
  if (v === 2) {
    box(THREE, g, 'band_l', [.035, headH * 1.04, headD * .96], [-headW / 2 - .015, 0, haftLen + .06], mat.accent);
    box(THREE, g, 'band_r', [.035, headH * 1.04, headD * .96], [headW / 2 + .015, 0, haftLen + .06], mat.accent);
  }
  return g;
}

function glaive(THREE, v, mat) {
  const g = new THREE.Group();
  const shaftLen = 1.18 + v * .06;
  const bladeLen = .38 + v * .05;
  const guardZ = shaftLen + .09;
  box(THREE, g, 'shaft', [.044, .044, shaftLen], [0, 0, shaftLen / 2], mat.wood);
  box(THREE, g, 'butt', [.056, .056, .04], [0, 0, .02], mat.accent);
  box(THREE, g, 'collar', [.07, .07, .09], [0, 0, shaftLen + .04], mat.steel);
  box(THREE, g, 'guard', [.22 + v * .03, .022, .035], [0, 0, guardZ], mat.accent);
  box(THREE, g, 'blade', [.10 + v * .02, .02, bladeLen], [0, 0, guardZ + .018 + bladeLen / 2], mat.steel);
  box(THREE, g, 'spine', [.026, .012, bladeLen * .85], [0, .012, guardZ + .018 + bladeLen * .5], mat.steel);
  box(THREE, g, 'tip', [.05, .016, .05], [0, 0, guardZ + .018 + bladeLen + .02], mat.steel);
  if (v === 2) box(THREE, g, 'hook', [.05, .018, .09], [.08, 0, guardZ + .10], mat.accent);
  return g;
}

export function buildWbMeleeGeometry(THREE, id, variant = 0, materials = {}) {
  const v = ((Number(variant) || 0) % 3 + 3) % 3;
  const mat = palette(THREE, materials);
  if (id === 'wb_moonseam_katana') return katana(THREE, v, mat);
  if (id === 'wb_quarry_maul') return maul(THREE, v, mat);
  if (id === 'wb_reed_glaive') return glaive(THREE, v, mat);
  return null;
}

export function buildWbCrossbowGeometry(THREE, variant = 0, materials = {}) {
  const v = ((Number(variant) || 0) % 3 + 3) % 3;
  const mat = palette(THREE, materials);
  const g = new THREE.Group();
  const stockLen = .60 + v * .04;
  const limbLen = .34 + v * .035;
  box(THREE, g, 'stock', [.11 + v * .006, .12, stockLen], [0, 0, .14], mat.wood);
  box(THREE, g, 'butt', [.09, .10, .16], [0, -.045, -.17], mat.wood);
  box(THREE, g, 'grip', [.05, .14, .07], [0, -.10, -.02], mat.wood);
  box(THREE, g, 'rail', [.035, .03, stockLen * .9], [0, .075, .18], mat.steel);
  for (const side of [-1, 1]) {
    box(THREE, g, 'limb', [limbLen, .05, .07], [side * (limbLen / 2 + .02), .03, .36 + v * .015], mat.steel, side * (.25 + v * .05));
    box(THREE, g, 'limbtip', [.06, .04, .05], [side * (limbLen + .02), .03, .36 + v * .015], mat.accent, side * (.25 + v * .05));
  }
  box(THREE, g, 'string', [.55 + v * .05, .01, .01], [0, .03, .24], mat.accent);
  box(THREE, g, 'sight', [.03, .06 + v * .01, .035], [0, .105, .18], mat.steel);
  if (v === 1) box(THREE, g, 'brace', [.14, .03, .05], [0, -.03, .30], mat.steel);
  if (v === 2) box(THREE, g, 'magazine', [.09, .10, .10], [0, .10, .04], mat.wood);
  return g;
}
