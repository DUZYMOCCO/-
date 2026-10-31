// Shared immutable templates, one geometry assembly per item and cosmetic look.
export const CROSSBOW_IDS = ['crossbow', 'light_crossbow', 'heavy_crossbow', 'scrap_crossbow'];
export function buildCrossbowGeometry(THREE, id, look, materials) {
  const type = Math.max(0, CROSSBOW_IDS.indexOf(id));
  const v = ((Number(look) || 0) % 3 + 3) % 3;
  const g = new THREE.Group();
  const add = (name, dims, pos, rotation = 0, mat = materials.metal) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...dims), mat);
    m.name = name; m.position.set(...pos); m.rotation.y = rotation; g.add(m);
  };
  const len = [.66, .53, .80, .70][type];
  add('stock', [.13 + type*.014, .14 + v*.02, len], [0, 0, .10], 0, materials.wood);
  add('butt', [.10 + type*.015, .12 + v*.025, .18 + type*.025], [0, -.055-v*.012, -.22-type*.025], v*.08, materials.wood);
  if (type === 1) add('grip', [.06,.16,.07], [0,-.13,-.08], 0, materials.wood);
  if (type === 2) add('reinforcement', [.13,.035,.32], [0,.065,.12]);
  if (type === 3) { add('patch', [.12,.045,.17], [0,.07,-.06]); add('brace', [.14,.035,.09], [0,-.07,.28]); }
  for (const side of [-1,1]) {
    add('limb', [.31+type*.035+v*.025,.08+type*.008,.09], [side*(.17+type*.018),.02,.38], side*([.12,-.30,.40][v]+type*.04));
    if (v !== 0 || type === 1) add('recurve', [.14+type*.015,.06,.07], [side*(.38+type*.035),.02,.42+v*.025], -side*(.4+v*.15));
  }
  add('string', [.62+type*.07,.012,.012], [0,.02,.30]);
  if (v > 0 || type === 2) add('sight', [.035,.10+type*.015,.04], [0,.11,.24]);
  if (v === 2 || type === 3) add('magazine', [.10+type*.01,.14+v*.02,.12+type*.02], [0,.12,.06], 0, materials.wood);
  return g;
}
