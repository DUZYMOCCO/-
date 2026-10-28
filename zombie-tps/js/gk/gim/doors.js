// v0.17.0: ギミック「でてくる ドア」（ステージ18 とびらの そうこ・あとから よむ）
// へやの てきは でぐちでは なく かべの ドアから でる: ランプが あかく ちかちか（0.9びょう）→ ドアが よこに スライド → 1〜2たい → しまる
// いちどに あくのは 3つ まで。ボスも ドアを つかう（game.gkDoorsApi）
import * as THREE from '../../../vendor/three.module.min.js';
import { DOORS, doorFront, doorsBusy, doorPick } from '../core.js?v=42';

export function create(game) {
  const grp = new THREE.Group(); game.scene.add(grp);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const M = { panel: new THREE.MeshLambertMaterial({ color: 0x6a7480 }), stripe: new THREE.MeshLambertMaterial({ color: 0xe0b020 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff3b30 }), dim: new THREE.MeshBasicMaterial({ color: 0x501010 }), green: new THREE.MeshBasicMaterial({ color: 0x3bff6a }) };
  const part = (p, m, sx, sy, sz, x, y, z) => { const o = new THREE.Mesh(box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); p.add(o); return o; };
  let doors = [];
  game.gkPending = 0;
  const key = (d) => `${d.x.toFixed(1)}|${d.z.toFixed(1)}`;
  function remap() {
    const now = (game.map.gk && game.map.gk.spawnDoors) || [], keep = new Map(doors.map((o) => [o.k, o]));
    doors = now.map((d) => {
      const k = key(d), old = keep.get(k);
      if (old) { keep.delete(k); old.d = d; return old; }
      const g = new THREE.Group(); g.position.set(d.x, d.y || 0, d.z); g.rotation.y = d.yaw;
      const slide = new THREE.Group(); g.add(slide);
      part(slide, M.panel, 1.6, 2.55, 0.16, 0, 1.3, 0); part(slide, M.stripe, 1.62, 0.25, 0.18, 0, 1.0, 0);
      const lamp = part(g, M.dim, 0.5, 0.22, 0.2, 0, 2.95, -0.62);
      grp.add(g);
      return { k, d, g, slide, lamp, st: 'idle', t: 0, q: [], warnT: DOORS.warn };
    });
    for (const o of keep.values()) { grp.remove(o.g); game.gkPending -= o.q.length; }
    game.gkPending = Math.max(0, game.gkPending);
  }
  // ドアを うごかす（warnT びょう ちかちか → あく → onOpen → しまる）
  function cycle(o, warnT = DOORS.warn, onOpen = null) { o.st = 'warn'; o.t = 0; o.warnT = Math.max(DOORS.warn, warnT); o.onOpen = onOpen; return o; }
  // へやの てき: ドアから だす（だめなら 'wait'・ドアが ない へやは false）
  game.gkSpawnVia = (kind) => {
    const room = game.gk.room;
    if (!doors.some((o) => o.d.room === room)) return false;
    const warm = doors.find((o) => o.st === 'warn' && o.d.room === room && !o.onOpen && o.q.length < DOORS.per && o.t < o.warnT * 0.5);
    if (warm && Math.random() < 0.5) { warm.q.push(kind); game.gkPending++; return true; }
    const o = doorPick(doors, room, game.pos.x, game.pos.z);
    if (!o) return 'wait';
    cycle(o); o.q = [kind]; game.gkPending++;
    return true;
  };
  game.gkDoorsApi = {
    pick(n, room = game.gk.room) {
      const out = [];
      for (let i = 0; i < n; i++) { const o = doorPick(doors, room, game.pos.x, game.pos.z); if (!o) break; o.st = 'held'; out.push(o); }
      for (const o of out) o.st = 'idle';
      return out;
    },
    cycle, front: (o) => doorFront(o.d, 1.3),
  };
  function tick(dt) {
    for (const o of doors) {
      if (o.st === 'idle') continue;
      o.t += dt;
      if (o.st === 'warn') {
        o.lamp.material = Math.sin(o.t * 22) > 0 ? M.red : M.dim;
        if (o.t >= o.warnT) { o.st = 'open'; o.t = 0; game.sfx.clink?.(0.3); }
      } else if (o.st === 'open') {
        o.lamp.material = M.green;
        const k = Math.min(1, o.t / DOORS.open); o.slide.position.x = 1.7 * k * k;
        if (k >= 1) {
          o.st = 'hold'; o.t = 0;
          o.q.forEach((kind, i) => {
            const f = doorFront(o.d, 1.3 + i * 0.9);
            if (game.state === 'play' && game.gk) game.spawnZombie(kind, f.x, f.z, game.spec ? game.spec.hpMul : 1, o.d.y || 0).yaw = o.d.yaw;
          });
          game.gkPending = Math.max(0, game.gkPending - o.q.length); o.q = [];
          if (o.onOpen) { o.onOpen(o); o.onOpen = null; }
          if (game.pushHud) game.pushHud(true);
        }
      } else if (o.st === 'hold') { if (o.t >= DOORS.hold) { o.st = 'close'; o.t = 0; } }
      else if (o.st === 'close') {
        const k = Math.max(0, 1 - o.t / DOORS.close); o.slide.position.x = 1.7 * k * k;
        if (k <= 0) { o.st = 'idle'; o.t = 0; o.lamp.material = M.dim; }
      }
    }
  }
  function dispose() {
    game.scene.remove(grp); box.dispose(); for (const m of Object.values(M)) m.dispose();
    delete game.gkSpawnVia; delete game.gkDoorsApi; game.gkPending = 0; doors = [];
  }
  remap();
  return { tick, remap, dispose, get doors() { return doors; }, get busy() { return doorsBusy(doors); } };
}
