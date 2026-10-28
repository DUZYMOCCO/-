// v0.17.0: ガンキック ステージの セグメント（くぎり）を すすみに あわせて よむ・すてる（Game に まぜる）
// - いまの セグメントと つぎの セグメントだけ メモリに おく（ドアを とおると うしろの ドアを しめて まえを すてる）
// - でぐちの ドアに 12m ちかづく（または さいごの へやを きれいに する）と つぎを よむ。おもいので 3フレームに わける
// - ぶつかり・みちさがし（ナビ）・あかり・ドア・みはりだいは セグメントが かわる たびに つくりなおす
import { makeMats, boxMeshes, groundMesh, farBoxes, farMeshes, disposeWorld } from '../world.js?v=36';
import { mapBuilder, playerColliders, zombieColliders, shotColliders } from '../map.js?v=36';
import { makeBoxIndex, ROBOT, ARMY } from '../rules.js?v=36';
import { makeNavAt } from '../nav.js?v=36';
import { SEG, placeSeg, joinSegs, segRegion, segOffset, segOfRoom, segStarts, segNear, segPassed, inBounds, segShouldLoad, segSeals } from './seg.js?v=36';
import { gkLoadSeg, gkRoomAt } from './core.js?v=36';

const GROUND = 300; // じめんの いた（いまの セグメントの まんなかに うごかす）
const inRooms = (rooms, o) => !!o && rooms.some((r) => o.x > r.b[0] && o.x < r.b[2] && o.z > r.b[1] && o.z < r.b[3]);

export const StreamMixin = {
  // ステージの はじめ（チェックポイントなら その セグメント）: s0 を いま つくる
  gkStreamLoad(no, info, mods, s0) {
    if (this.rideScene) { this.rideScene.dispose(); this.rideScene = null; }
    if (this.world) disposeWorld(this.scene, this.world);
    this.gkGimEnd();
    if (this.gkDoorGroup) { this.scene.remove(this.gkDoorGroup); this.gkDoorGroup = null; this.gkDoors = []; }
    const { mats, mat } = makeMats(this.T);
    this.world = { meshes: [], mats, levels: new Map() };
    const S = this.gs = { no, info, segs: info.segs, starts: segStarts(info.segs), mods: { ...mods }, live: new Map(), jobs: [], loading: new Set(), mat, cur: s0, far: [], start: null, boot: true };
    const p = this.gkSegPlace(s0, mods[s0].build(mapBuilder), null);
    this.gkSegMeshes(p);
    S.live.set(s0, p);
    S.ground = groundMesh(p.theme, this.T, mats, GROUND, this.shadows);
    this.scene.add(S.ground); this.world.meshes.push(S.ground);
    this.gkSegRemap(); S.boot = false;
    this.initVehicles();
    this.cullOn = false; this.cullKey = '';
    this.backdrop.setMap(this.map.backdrop || 'city');
    this.gkBuildDoors();
    // よるの あかり（がいとう）を この マップに あわせる
    this.scene.remove(this.nightGroup); this.scene.remove(this.sunDisk);
    this.nightGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.buildNight();
    if (this.todP) this.applyTod(this.todP, true);
    this.gkPrefetch(s0 + 1);
  },
  // セグメントを ステージの ばしょに おく（まえの セグメントの でぐちに いりぐちを かさねる）
  gkSegPlace(idx, built, prev) {
    const off = prev && prev.exit && built.seg.entry ? segOffset(prev.exit, built.seg.entry) : { x: 0, z: 0 };
    return placeSeg(built, { idx, r0: this.gs.starts[idx], ox: off.x, oz: off.z });
  },
  gkSegMeshes(p) {
    const r = boxMeshes(this.scene, p.boxes, this.gs.mat, this.shadows);
    p.meshes = r.meshes; p.edges = r.edges;
    this.world.meshes.push(...r.meshes);
  },
  // さきに モジュールだけ よんでおく（ネットワーク）。つくるのは ちかづいてから
  gkPrefetch(idx) {
    const S = this.gs; if (!S || !S.segs[idx] || S.mods[idx] || S.loading.has(idx)) return;
    S.loading.add(idx);
    gkLoadSeg(S.segs[idx].mod).then((m) => { if (this.gs === S) S.mods[idx] = m; }).catch((e) => console.warn(e)).finally(() => S.loading.delete(idx));
  },
  gsReady(room) { const S = this.gs; return !S || S.live.has(segOfRoom(S.segs, room).seg); },
  // つぎの セグメントを つくり はじめる（まえの セグメントが のこって いる あいだは まつ → かさならない）
  gsWantNext() {
    const S = this.gs, nx = S.cur + 1;
    if (!segShouldLoad({ cur: S.cur, total: S.segs.length, live: S.live, busy: S.jobs.some((j) => j.idx === nx), want: true })) return;
    if (!S.mods[nx]) { this.gkPrefetch(nx); return; }
    S.jobs.push({ idx: nx, step: 0 });
  },
  // まいフレーム（gkUpdate から）
  gkStreamTick(dt) {
    const S = this.gs, g = this.gk; if (!S || !g) return;
    S.cur = segOfRoom(S.segs, g.room).seg;
    const cp = S.live.get(S.cur);
    if (cp && segNear(cp, this.pos.x, this.pos.z)) this.gsWantNext();
    // 1フレームに 1だんかい だけ（つくる → メッシュ → ぶつかり・ナビ）
    const j = S.jobs[0];
    if (j) {
      if (j.step === 0) { j.p = this.gkSegPlace(j.idx, S.mods[j.idx].build(mapBuilder), S.live.get(j.idx - 1)); j.step = 1; }
      else if (j.step === 1) { this.gkSegMeshes(j.p); j.step = 2; }
      else { S.live.set(j.idx, j.p); S.jobs.shift(); this.gkSegRemap(); this.gkPrefetch(j.idx + 1); }
    }
    if (S.dropT != null && (S.dropT -= dt) <= 0) { S.dropT = null; this.gkSegDetach(S.drop); }
    // かべの そとに とんだ ゾンビは へやに もどす（へやが きれいに ならない のを ふせぐ）
    if ((S.rescueT = (S.rescueT || 0) - dt) <= 0) { S.rescueT = 0.5; this.gkRescue(0.5); }
  },
  // ドアの むこうへ すすんだ: うしろの ドア（セグメントの さかいめ）を しめて まえの セグメントを すてる
  // まだ ドアの すぐ そばなら false（てきは まだ でない）
  gsCrossed(room) {
    const S = this.gs; if (!S) return true;
    const { seg, local } = segOfRoom(S.segs, room);
    if (local !== 0 || !S.live.has(seg - 1) || S.drop === seg - 1) return true;
    const gm = this.map.gk, d = gm.doors[room - 1];
    if (!segPassed(d, gm.rooms[room], this.pos.x, this.pos.z)) return false;
    this.gkSetDoor(room - 1, false);
    this.sfx.clink?.(0.5);
    S.drop = seg - 1; S.dropT = 0.7; // しまってから すてる
    S.start = { x: this.pos.x, z: this.pos.z, yaw: this.yaw }; // なかまを おきなおす ところ
    return true;
  },
  gkSegDetach(idx) {
    const S = this.gs, p = S && S.live.get(idx); if (!p) return;
    for (const m of p.meshes) { this.scene.remove(m); m.geometry.dispose(); }
    const set = new Set(p.meshes); this.world.meshes = this.world.meshes.filter((m) => !set.has(m));
    S.live.delete(idx); S.drop = null;
    this.gkSegRemap();
    this.gkClearArea(p.rooms);
    this.gsWantNext();
  },
  // いま ある セグメントで マップを つくりなおす
  gkSegRemap() {
    const S = this.gs, list = [...S.live.values()].sort((a, b) => a.idx - b.idx);
    const m = joinSegs(list);
    m.id = S.info.map; m.half = SEG.far;
    if (S.start) m.playerStart = S.start;
    for (const p of list) for (const e of p.edges) e.visible = !S.live.has(p.idx - 1); // まえが あれば いりぐちの かべは まえの もの
    this.map = m; this.half = m.half;
    const R = S.region = segRegion(list);
    // むこうの へやが ない ドア（よんで いない・すてた セグメント）は ゾンビ・ナビにも かべ（なかま・スーツが そとに おかれない）
    const pc = playerColliders(m), zc = zombieColliders(m).concat(segSeals(m));
    this.pCol = makeBoxIndex(pc, R.half, 4, 2, R.cx, R.cz); this.zCol = makeBoxIndex(zc, R.half, 4, 2, R.cx, R.cz);
    this.sCol = shotColliders(m);
    this.camCol = this.sCol.filter((b) => b.maxY > 0.6);
    this.nav = makeNavAt(zc, m, R);
    const P = this.pos || m.playerStart;
    this.nav.update(P.x, this.state === 'play' ? this.pFloor ?? 0 : 0, P.z); this.flowT = 0.25;
    this.vertical = !!m.vertical; this.ladders = m.ladders || [];
    this.buildPerchMarks();
    if (!S.boot) { this.gkSyncDoors(); this.gkLamps(); for (const gi of this.gkGims || []) gi.remap(); }
    // じめん・とおくの けしき
    S.ground && (S.ground.position.set(R.cx, 0, R.cz), S.ground.updateMatrix());
    for (const f of S.far) { this.scene.remove(f); f.geometry.dispose(); }
    const fset = new Set(S.far); this.world.meshes = this.world.meshes.filter((x) => !fset.has(x));
    const skip = (x, z) => list.some((p) => inBounds(p.bounds, x, z, 3));
    S.far = farMeshes(this.scene, farBoxes({ half: R.half - SEG.pad, theme: m.theme }, { cx: R.cx, cz: R.cz, skip }), S.mat);
    this.world.meshes.push(...S.far);
  },
  // がいとうの ひかり（かずが かわる → つくりなおす）
  gkLamps() {
    this.dropLamps();
    this.buildLamps(this.nightGroup);
    if (this.todP) for (const [m, o] of this.lampMats) m.opacity = o * this.todP.lamps;
  },
  // すてた へやに いた もの: なかまは そばへ ワープ・まっている ロボと スーツは いまの セグメントに おきなおす・おちている ものは けす
  gkClearArea(rooms) {
    const r = this.robot, a = this.army;
    if (r && inRooms(rooms, r)) { if (r.state === 'on') this.allyTeleport(r, ROBOT, r.warpColor); else this.spawnRobot(); }
    if (a && inRooms(rooms, a)) { if (a.state === 'on') this.allyTeleport(a, ARMY, a.warpColor); else this.spawnArmy(); }
    if (this.suitPick && inRooms(rooms, this.suitPick)) this.placeSuit();
    if (this.tankPick && inRooms(rooms, this.tankPick)) this.placeTank();
    if (this.cop && inRooms(rooms, this.cop)) this.endCop();
    if (this.drunk && inRooms(rooms, this.drunk)) this.endDrunk();
    if (this.oji && inRooms(rooms, this.oji)) this.endOji();
    const drop = (arr, rel, at = (o) => o) => arr ? arr.filter((o) => { if (inRooms(rooms, at(o))) { rel(o); return false; } return true; }) : arr;
    this.pickups = drop(this.pickups, (o) => this.releasePickup(o));
    this.gearDrops = drop(this.gearDrops, (o) => this.releaseGear(o));
    this.spits = drop(this.spits, (o) => this.releaseSpit(o), (o) => o.p);
    for (const h of [...(this.hazards || [])]) if (inRooms(rooms, h)) this.releaseHazard(h);
    if (this.state === 'play') this.nav.update(this.pos.x, this.pFloor ?? this.pos.y, this.pos.z);
  },
  // へやの そと（かべの うえ・そと）に 3びょう いる ゾンビ → へやの でぐちへ
  gkRescue(dt) {
    const rooms = this.map.gk && this.map.gk.rooms; if (!rooms || this.gk.phase !== 'fight') return;
    for (const z of this.zombies) {
      if (!z.alive || z.fly || z.demo) continue;
      if (gkRoomAt(rooms, z.x, z.z) >= 0) { z.outT = 0; continue; }
      if ((z.outT = (z.outT || 0) + dt) < 3) continue;
      const s = this.pickSpawn();
      z.x = z.lastX = s.x; z.z = z.lastZ = s.z; z.y = s.y || 0; z.vy = 0; z.outT = 0; z.climb = null;
      z.model.root.position.set(z.x, z.y, z.z);
    }
  },
};
