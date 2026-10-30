// 古代の暴走機械の模型の表（three を読まない純粋な表。テストからも読む）。

export const MECH_DIR = 'assets/mech/';

// height = 背の高さ（m）。読み込み時に測って倍率を決める。null は glb のまま（刀の行列が倍率1で求めてあるので人型は null）。
// katana: hand_r の局所行列（列優先）。katana_attachment_3b.json の向きを Blender で付けて
// three.js の hand_r の空間へ移した値（tools/katana_mat.py）。刀の glTF の +Z が刃の向き。
export const MECH_MODELS = {
  robot_light: { file: 'robot_light.glb', height: null, humanoid: true,
    katana: [0.70717, 0.18677, -0.68193, 0, -0.68193, 0.43495, -0.58804, 0, 0.18677, 0.88087, 0.43495, 0, 0.01494, 0.10218, 0.0348, 1] },
  robot_heavy: { file: 'robot_heavy.glb', height: null, humanoid: true,
    katana: [0.68026, 0.19224, -0.70731, 0, -0.70731, 0.42527, -0.56467, 0, 0.19225, 0.88441, 0.42527, 0, 0.01538, 0.11968, 0.03402, 1] },
  rogue_quad: { file: 'rogue_quad.glb', height: 1.25 },
  mech_dog: { file: 'mech_dog.glb', height: 0.85 },
  mech_boar: { file: 'mech_boar.glb', height: 1.0 },
  mech_spider: { file: 'mech_spider.glb', height: 0.75 },
  mech_lizard: { file: 'mech_lizard.glb', height: 0.6 },
};

// 役目 → 模型（spawn_data.js の MACHINE_ROLES と同じ名前）
export function machineModelFor(actor) {
  if (!actor || !actor.role) return null;
  return MECH_MODELS[actor.role] ? actor.role : null;
}
