// v0.17.0: ギミック「でんしゃ」（ステージ4 くらやみの ちかてつ・あとから よむ）
// せんろ（map.gk.trains）ごとに: まつ → よこく（せんろの ふちが あかく ちかちか・おと）→ でんしゃが とおる
// とおる あいだ せんろに いると よこへ おされて すこし いたい。ゾンビも はねとばされる。いまの へやと となりの へやだけ うごく
import * as THREE from '../../../vendor/three.module.min.js';
import { TRAIN, trainNew, trainStep, trainSpan, trainHit, trainSide } from '../core.js?v=26';

export function create(game) {
  const grp = new THREE.Group(); game.scene.add(grp);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const M = {
    body: new THREE.MeshLambertMaterial({ color: 0x8a96a4 }), stripe: new THREE.MeshLambertMaterial({ color: 0x3a8ad8 }),
    win: new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), lamp: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    warn: new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.9, depthWrite: false }),
  };
  const part = (parent, mat, sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(box, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m; };
  let lanes = [], told = false, hitCd = 0;
  const key = (L) => `${L.room}|${L.at.toFixed(1)}|${L.axis}`;
  // せんろが かわった（セグメントを よんだ・すてた）
  function remap() {
    const now = (game.map.gk && game.map.gk.trains) || [], keep = new Map(lanes.map((o) => [o.k, o]));
    lanes = now.map((L) => {
      const k = key(L), old = keep.get(k);
      if (old) { keep.delete(k); old.L = L; return old; }
      const ax = L.axis === 'x', g = new THREE.Group(), w = L.w * 0.86;
      // でんしゃ（ローカル: x が はしる むき）
      const tr = new THREE.Group();
      part(tr, M.body, TRAIN.len, 2.9, w, 0, 1.75, 0);
      part(tr, M.stripe, TRAIN.len + 0.02, 0.35, w + 0.04, 0, 1.0, 0);
      part(tr, M.win, TRAIN.len - 1.2, 0.7, w + 0.06, 0, 2.3, 0);
      for (const s of [-1, 1]) part(tr, M.lamp, 0.1, 0.35, 0.5, s * (TRAIN.len / 2 + 0.03), 1.2, 0);
      tr.visible = false; g.add(tr);
      // よこくの ライン（せんろの りょうがわ）
      const lo = Math.min(L.from, L.to), hi = Math.max(L.from, L.to), mid = (lo + hi) / 2;
      const warn = new THREE.Group();
      for (const s of [-1, 1]) {
        const c = L.at + s * (L.w / 2 + 0.15);
        part(warn, M.warn, ax ? hi - lo : 0.22, 0.06, ax ? 0.22 : hi - lo, ax ? mid : c, 0.06, ax ? c : mid);
      }
      warn.visible = false; g.add(warn);
      grp.add(g);
      return { k, L, g, tr, warn, st: trainNew() };
    });
    for (const o of keep.values()) grp.remove(o.g);
  }
  function tick(dt) {
    const gk = game.gk; if (!gk) return;
    hitCd = Math.max(0, hitCd - dt);
    for (const o of lanes) {
      const L = o.L, on = Math.abs(L.room - gk.room) <= 1;
      if (!on) { o.st = trainNew(); o.tr.visible = o.warn.visible = false; continue; }
      const ch = trainStep(o.st, L, dt);
      const near = gk.room === L.room;
      if (ch === 'warn' && near) {
        game.sfx.warn?.();
        if (!told) { told = true; game.hud.kill('でんしゃが くるよ！ せんろから はなれて！', true); }
      }
      if (ch === 'pass' && near) game.sfx.slam?.(0.45);
      o.warn.visible = o.st.phase === 'warn' && Math.sin(o.st.t * 18) > -0.2;
      o.tr.visible = o.st.phase === 'pass';
      if (!o.tr.visible) continue;
      const [a0, a1] = trainSpan(o.st), c = (a0 + a1) / 2, ax = L.axis === 'x';
      o.tr.position.set(ax ? c : L.at, 0, ax ? L.at : c); o.tr.rotation.y = ax ? 0 : Math.PI / 2;
      // プレイヤー: よこへ おされる（すこし いたい・1びょうに 1かい）
      if (hitCd <= 0 && trainHit(o.st, L, game.pos.x, game.pos.z)) {
        const sd = trainSide(L, game.pos.x, game.pos.z);
        hitCd = 1;
        game.damagePlayer(TRAIN.dmg);
        game.pk.set(ax ? o.st.dir * 3 : sd * TRAIN.push, 0, ax ? sd * TRAIN.push : o.st.dir * 3);
        game.vy = Math.max(game.vy, 4); game.onGround = false;
      }
      // ゾンビ: はねとばす（ボスは ダメージ だけ）
      for (const z of game.zombies) {
        if (!z.alive || z.fly || z.demo || z.trainT > 0 || !trainHit(o.st, L, z.x, z.z, 0.4)) continue;
        z.trainT = 1.2;
        const sd = trainSide(L, z.x, z.z), dir = new THREE.Vector3(ax ? o.st.dir : sd, 0, ax ? sd : o.st.dir);
        game.hitZombie(z, TRAIN.zDmg, false, new THREE.Vector3(z.x, (z.y || 0) + 1, z.z), dir, { quiet: true });
        if (z.alive && z.kind !== 'boss') game.launchZombie(z, { vx: (ax ? o.st.dir * 6 : sd * 11), vy: 7, vz: (ax ? sd * 11 : o.st.dir * 6), spin: 8 });
      }
    }
    for (const z of game.zombies) if (z.trainT > 0) z.trainT -= dt;
  }
  function dispose() {
    game.scene.remove(grp);
    box.dispose(); for (const m of Object.values(M)) m.dispose();
    lanes = [];
  }
  remap();
  return { tick, remap, dispose, get lanes() { return lanes; } };
}
