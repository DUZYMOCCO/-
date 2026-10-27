// v0.17.0: ギミック「ガスの あな」（ステージ15 さいごの けんきゅうじょ・あとから よむ）
// ゆかの あなが まつ → みどりに ひかる（よこく 1.2びょう）→ ガスが ふきだす（なかに いると すこし いたい・ゾンビにも きく）
// あなごとに じかんを ずらす。いまの へやと となりの へや だけ うごく
import * as THREE from '../../../vendor/three.module.min.js';
import { VENT, ventPhase } from '../core.js?v=26';
import { groundHeight } from '../../rules.js?v=26';

export function create(game) {
  const grp = new THREE.Group(); game.scene.add(grp);
  const geo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x8aff5a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  let vents = [], t = 0, zAcc = 0;
  const key = (v) => `${v.x.toFixed(1)}|${v.z.toFixed(1)}`;
  function remap() {
    const now = (game.map.gk && game.map.gk.vents) || [], keep = new Map(vents.map((o) => [o.k, o]));
    vents = now.map((v, i) => {
      const k = key(v), old = keep.get(k);
      if (old) { keep.delete(k); old.v = v; return old; }
      const y = groundHeight(v.x, v.z, 0.1, 1, game.pCol) + 0.05;
      const m = new THREE.Mesh(geo, mat.clone()); m.scale.set(v.r || VENT.r, 1, v.r || VENT.r); m.position.set(v.x, y, v.z); m.renderOrder = 2; grp.add(m);
      return { k, v, m, y, off: (Math.abs(Math.round(v.x * 7 + v.z * 13)) % 7) * 1.1 + i * 0.37, last: 'idle' };
    });
    for (const o of keep.values()) { grp.remove(o.m); o.m.material.dispose(); }
  }
  function tick(dt) {
    t += dt; zAcc += dt;
    const room = game.gk ? game.gk.room : 0, hitZ = zAcc >= 0.5;
    if (hitZ) zAcc = 0;
    for (const o of vents) {
      const on = Math.abs(o.v.room - room) <= 1, ph = on ? ventPhase(t, o.off) : 'idle', r = o.v.r || VENT.r;
      o.m.material.opacity = ph === 'warn' ? 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 16)) : ph === 'puff' ? 0.5 : 0.06;
      if (ph === 'puff' && o.last !== 'puff') { game.addHazard('gas', o.v.x, o.y, o.v.z, r, VENT.dps, VENT.puff); game.sfx.gas?.(0.4); }
      if (ph === 'puff' && hitZ) for (const z of game.zombies) {
        if (!z.alive || z.kind === 'boss' || Math.hypot(z.x - o.v.x, z.z - o.v.z) > r) continue;
        game.hitZombie(z, VENT.zDps * 0.5, false, new THREE.Vector3(z.x, (z.y || 0) + 1, z.z), new THREE.Vector3(0, 0, 1), { quiet: true });
      }
      o.last = ph;
    }
  }
  function dispose() { game.scene.remove(grp); geo.dispose(); mat.dispose(); for (const o of vents) o.m.material.dispose(); vents = []; }
  remap();
  return { tick, remap, dispose, get vents() { return vents; } };
}
