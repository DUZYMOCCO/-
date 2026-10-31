import { buildCrossbowGeometry, CROSSBOW_IDS } from './crossbow_geometry.js';
// 武器の見た目: クロスボウ（持つ人ごとの弓・構えの腕）、飛んでいる矢、近接武器（剣・鉈）。
// 腕の構え: 動き（アニメ）を当てた後に、上腕と前腕の骨を前へ向け直す。
// glb（assets/models/）があればそれを使い、無ければ従来の箱の弓・円柱の矢（近接武器は描かない）。
// glb の弓と近接武器は種類ごとに InstancedMesh へまとめる（人数が増えても draw call が増えない）。

import * as THREE from 'three';
import { heightAt, CROSSBOW } from '../sim/index.js';
import { instancedModel } from './models.js';
import { meleeModelFor } from './asset_plan.js';
import { proceduralWeapon } from './procedural_weapon.js';
import { WEAPONS } from '../sim/data.js';
import { weaponModel, weaponGeneration } from './weapons_v3.js';
import { clearMergedWeapon, mergeWeapon, weaponMergeFallback } from './weapon_merge.js';

const MAX_BOLTS = 32;
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _cur = new THREE.Vector3();
const _want = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _fwd = new THREE.Vector3();
const _side = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// 引きの画面でも弓と分かるよう、人の大きさより少し大きめに描く。
const BOW_SCALE_AIM = 1.45;
const BOW_SCALE_BACK = 1.2;
// glb の弓は幅 0.9m（箱の弓 0.72m より大きい）ので倍率を下げる。
const GLB_BOW_SCALE_AIM = 1.2;
const GLB_BOW_SCALE_BACK = 1.0;
// glb の矢は長さ 0.325m。引きの画面でも見えるよう 1.7倍（約0.55m）で描く。
const GLB_BOLT_SCALE = 1.7;
// 近接武器: 手の骨の向きに対する持ち方（握りが原点、刃は +Z）。人形の大きさに合わせて少し大きめ。
// 引きの画面でも刀・鉈と分かるよう、少しだけ大きめ（1.15倍）。
const MELEE_SCALE = 1.15;
const _hq = new THREE.Quaternion();
const _hp = new THREE.Vector3();
const _e = new THREE.Euler();
// 手の骨（+Y が指先、+Z が親指側）に対する持ち方。握りが原点・刃は +Z・刃の側は -Y の glb を、
// 刃を親指側（拳から縦に出る）へ、刃の側を指先の向き（振り下ろす向き）へ向ける = Z 軸まわりに半回転。
// 攻撃の動き（振りかぶり→前下へ）で手の骨の向きを測って決めた（PROGRESS 参照）。
export const GRIP = { x: 0, y: 0, z: Math.PI, off: [0, 0.085, 0.0] };
// 腰に差す時（骨盤に対して）
export const SHEATH = { x: 2.6, y: 0, z: 0.25, off: [-0.2, 0, 0.05] };
// 矢の後ろの光の筋（短め。矢だと分かる長さ）
const TRAIL_LEN = 0.8;

function buildBowGeometry() {
  // 台（銃床）・弓・弦。1つのグループに3つのメッシュ。前は +z。
  const wood = new THREE.MeshStandardMaterial({ color: '#5a3d24', roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: '#8b8f93', roughness: 0.5, metalness: 0.4 });
  const string = new THREE.MeshBasicMaterial({ color: '#d8d0bc' });
  const stock = new THREE.BoxGeometry(0.07, 0.08, 0.68);
  stock.translate(0, 0, 0.12);
  const limbs = new THREE.BoxGeometry(0.72, 0.035, 0.06);
  // 弓を少し反らせる（端を後ろへ）
  const pos = limbs.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) - x * x * 0.25);
  }
  limbs.translate(0, 0.02, 0.42);
  const str = new THREE.BoxGeometry(0.62, 0.012, 0.012);
  str.translate(0, 0.02, 0.31);
  return { stock, limbs, str, wood, metal, string };
}

// 種類ごとの InstancedMesh。1フレーム分の行列をためて、最後にまとめて書く（足りなければ作り直して倍に）。
function makePool(model, name, parent) {
  let cap = 16;
  let set = null;
  const mats = [];
  let n = 0;
  function build() {
    if (set) set.dispose(parent);
    set = instancedModel(model, cap, { name, castShadow: true, receiveShadow: false });
    set.meshes.forEach((m) => {
      m.frustumCulled = false;
    });
    set.addTo(parent);
  }
  build();
  return {
    begin() {
      n = 0;
    },
    push(matrix) {
      if (!mats[n]) mats[n] = new THREE.Matrix4();
      mats[n].copy(matrix);
      n += 1;
    },
    end() {
      if (n > cap) {
        while (cap < n) cap *= 2;
        build();
      }
      for (let i = 0; i < n; i += 1) set.set(i, mats[i]);
      set.setCount(n);
      set.finish(false);
    },
    get count() {
      return n;
    },
    dispose() {
      if (set) set.dispose(parent);
      set = null;
    },
  };
}

function aimBone(bone, child, want, w) {
  if (!bone || !child || w <= 0) return;
  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  _cur.subVectors(_b, _a).normalize();
  _q.setFromUnitVectors(_cur, want);
  if (w < 1) _q.slerp(_qp.identity(), 1 - w);
  bone.getWorldQuaternion(_qw);
  _qw.premultiply(_q);
  if (bone.parent) {
    bone.parent.getWorldQuaternion(_qp);
    _qp.invert();
    _qw.premultiply(_qp);
  }
  bone.quaternion.copy(_qw);
  bone.updateMatrixWorld(true);
}

// Two bone reach, with an elbow bend biased down and out from the body.
function reachHand(upper, lower, hand, target, pole) {
  if (!upper || !lower || !hand) return;
  const shoulder = new THREE.Vector3(), elbow = new THREE.Vector3(), wrist = new THREE.Vector3();
  upper.getWorldPosition(shoulder); lower.getWorldPosition(elbow); hand.getWorldPosition(wrist);
  const l1 = shoulder.distanceTo(elbow), l2 = elbow.distanceTo(wrist);
  const dir = target.clone().sub(shoulder);
  const distance = Math.max(0.001, Math.min(dir.length(), (l1 + l2) * 0.999));
  dir.normalize();
  const cosine = THREE.MathUtils.clamp((l1*l1 + distance*distance - l2*l2) / (2*l1*distance), -1, 1);
  const bend = pole.clone().addScaledVector(dir, -pole.dot(dir)).normalize();
  const wantedElbow = shoulder.clone().addScaledVector(dir, l1*cosine).addScaledVector(bend, l1*Math.sqrt(1-cosine*cosine));
  aimBone(upper, lower, wantedElbow.sub(shoulder).normalize(), 1);
  lower.getWorldPosition(elbow);
  aimBone(lower, hand, target.clone().sub(elbow).normalize(), 1);
}

function supportGrip(bones, point, scale, pole) {
  if (!bones.hl) return;
  // Target the wrist, leaving the palm centre on the grip point.
  // The hand orientation changes as the arm bends, so refine the palm offset.
  for (let i = 0; i < 4; i += 1) {
    const wrist = point.clone().sub(new THREE.Vector3(0, 0.085 * scale, 0).applyQuaternion(bones.hl.getWorldQuaternion(new THREE.Quaternion())));
    reachHand(bones.ul, bones.ll, bones.hl, wrist, pole);
  }
}

export function createCrossbows(scene, models) {
  const md = models || {};
  const g = buildBowGeometry();
  const bowModel = null; // Shared procedural shapes retain cosmetic differences.
  const bows = new Map(); // actorId -> { group, w }（glb の弓の group は場面に置かない。行列だけ使う）
  const melees = new Map(); // actorId -> { group, kind }（group は行列を作るためだけ）
  const thrownMeshes = new Map(); // projectileId -> { group, kind }
  const bowPool = bowModel ? makePool(bowModel, 'crossbow', scene) : null;
  const meleePools = new Map(); // 役目名 -> pool
  function meleePool(name) {
    let p = meleePools.get(name);
    if (!p) {
      p = makePool(md[name], 'melee_' + name, scene);
      meleePools.set(name, p);
    }
    return p;
  }
  function thrownMesh(projectile) {
    let entry = thrownMeshes.get(projectile.id);
    const kind = projectile.itemId?.startsWith('shuriken_') ? 'shuriken' : 'knife';
    if (entry?.kind === kind) return entry.group;
    if (entry) scene.remove(entry.group);
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: kind === 'shuriken' ? 0xc6cbd0 : 0xb9c1c4, metalness: .65, roughness: .38 });
    if (kind === 'shuriken') {
      const shape = new THREE.Shape();
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? .07 : .19;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (!i) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      shape.closePath();
      const star = new THREE.Mesh(new THREE.ShapeGeometry(shape), steel);
      star.rotation.x = -Math.PI / 2; // 平たく寝かせて水平に回す
      star.name = 'spin';
      steel.side = THREE.DoubleSide;
      group.add(star);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(.07, .035, .42), steel);
      blade.position.z = .06;
      group.add(blade);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(.09, .05, .12), new THREE.MeshStandardMaterial({ color: 0x4a3421 }));
      handle.position.z = -.2;
      group.add(handle);
    }
    steel.emissive = new THREE.Color(0x3a3f44);
    // 小さくて砂地に紛れるので、うっすら白い軌跡を後ろに引く
    const trail = new THREE.Mesh(new THREE.BoxGeometry(.035, .012, .9), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .45, depthWrite: false }));
    trail.position.z = -.6;
    group.add(trail);
    scene.add(group);
    thrownMeshes.set(projectile.id, { group, kind });
    return group;
  }

  let bolts;
  const boltModel = md.bolt || null;
  if (boltModel) {
    const set = instancedModel(boltModel, MAX_BOLTS, { name: 'bolts', castShadow: false, receiveShadow: false });
    set.meshes.forEach((m) => {
      m.frustumCulled = false;
    });
    // 1つ目のメッシュを代表にし、残りは同じ行列を写す
    bolts = set.meshes[0];
    bolts.userData.set = set;
    set.addTo(scene);
  } else {
    const boltGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5);
    boltGeo.rotateX(Math.PI / 2);
    const boltMat = new THREE.MeshBasicMaterial({ color: '#f4ead0' });
    bolts = new THREE.InstancedMesh(boltGeo, boltMat, MAX_BOLTS);
    scene.add(bolts);
  }
  bolts.count = 0;
  bolts.frustumCulled = false;
  // 矢の後ろの光の筋（見やすさのため。加算合成の細長い板）
  const trailGeo = new THREE.BoxGeometry(0.05, 0.05, TRAIL_LEN);
  trailGeo.translate(0, 0, (boltModel ? -0.2 : -0.35) - TRAIL_LEN / 2);
  const trailMat = new THREE.MeshBasicMaterial({
    color: '#fff1c4',
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const trails = new THREE.InstancedMesh(trailGeo, trailMat, MAX_BOLTS);
  trails.count = 0;
  trails.frustumCulled = false;
  trails.renderOrder = 2;
  scene.add(trails);

  const tmp = new THREE.Object3D();
  const stats = { bows: 0, bolts: 0, melee: 0, glbBow: !!bowModel, glbBolt: !!boltModel };

  const variants = CROSSBOW_IDS.flatMap(id => [0, 1, 2].map(v => buildCrossbowGeometry(THREE, id, v, g)));
  function makeBow() {
    if (bowModel) {
      const group = new THREE.Object3D();
      return { group, w: 0, bones: null, glb: true };
    }
    const group = new THREE.Group();
    variants.forEach(v => group.add(v.clone()));
    group.userData.shared = true;
    for (const m of group.children) m.userData.shared = true;
    scene.add(group);
    return { group, w: 0, bones: null };
  }

  function bonesOf(doll) {
    if (!doll.root) return null;
    const get = (n) => doll.root.getObjectByName(n) || null;
    return {
      ur: get('upperarm_r'),
      lr: get('lowerarm_r'),
      hr: get('hand_r'),
      ul: get('upperarm_l'),
      ll: get('lowerarm_l'),
      hl: get('hand_l'),
      spine: get('spine_03'),
    };
  }

  // dolls.update の後に呼ぶ（腕の向きを上書きするため）。
  function update(state, dolls, alpha, dt) {
    const live = new Set();
    if (bowPool) bowPool.begin();
    for (const actor of state.actors) {
      if (!actor.crossbow || actor.state === 'dead') continue;
      const doll = dolls.getDoll(actor.id);
      if (!doll || !doll.group || doll.beast) continue;
      live.add(actor.id);
      let bow = bows.get(actor.id);
      if (!bow) {
        console.info(weaponMergeFallback('crossbow'));
        bow = makeBow();
        bows.set(actor.id, bow);
      }
      if (!bow.bones) bow.bones = bonesOf(doll) || {};
      const carried = typeof actor.carriedBy === 'number';
      const down = actor.state === 'down' || actor.state === 'getup' || carried;
      bow.group.visible = doll.group.visible;
      if (!doll.group.visible) continue;
      const holdingBow = !!actor.equip?.weapon?.some(x => x?.id?.includes('crossbow')) && !down && actor.carryingId === null;
      const aiming = holdingBow;
      bow.w += ((aiming ? 1 : 0) - bow.w) * Math.min(1, (dt || 0.016) * 10);
      const rot = doll.group.rotation.y;
      _fwd.set(Math.sin(rot), 0, Math.cos(rot));
      _side.crossVectors(UP, _fwd).normalize(); // 左
      const b = bow.bones;
      doll.group.updateMatrixWorld(true);
      if (bow.w > 0.02 && b.ur) {
        // 右腕: 肘を横に張り、前腕は肩の高さで前へ（台を肩に当てる）。
        // 左腕: ほぼまっすぐ前へ伸ばして弓の先を支える。
        _want.copy(_fwd).multiplyScalar(0.55).addScaledVector(UP, -0.35).addScaledVector(_side, -0.75).normalize();
        aimBone(b.ur, b.lr, _want, bow.w);
        _want.copy(_fwd).addScaledVector(UP, 0.18).addScaledVector(_side, 0.55).normalize();
        aimBone(b.lr, b.hr, _want, bow.w);
        _want.copy(_fwd).addScaledVector(UP, -0.12).addScaledVector(_side, -0.2).normalize();
        aimBone(b.ul, b.ll, _want, bow.w);
        _want.copy(_fwd).addScaledVector(UP, 0.08).addScaledVector(_side, -0.12).normalize();
        aimBone(b.ll, b.hl, _want, bow.w);
      }
      const s = doll.group.scale.x || 1;
      if (holdingBow && b.hr) {
        b.hr.getWorldPosition(_a);
        bow.group.position.copy(_a).addScaledVector(UP, 0.04 * s).addScaledVector(_fwd, (bow.glb ? 0.02 : -0.12) * s);
        // 撃った直後は少し跳ねる
        const since = state.tick - (actor.lastShotTick || -1000);
        const kick = since >= 0 && since < 3 ? (3 - since) * 0.02 : 0;
        bow.group.position.addScaledVector(_fwd, -kick);
        bow.group.rotation.set(-kick * 2, rot, 0);
      } else if (down) {
        const p = doll.group.position;
        bow.group.position.set(p.x + _side.x * 0.6, p.y + 0.06, p.z + _side.z * 0.6);
        bow.group.rotation.set(0, rot + 0.6, 0);
      } else {
        // 背中に背負う
        if (b.spine) b.spine.getWorldPosition(_a);
        else _a.copy(doll.group.position).addScaledVector(UP, 1.3 * s);
        bow.group.position.copy(_a).addScaledVector(_fwd, -0.2 * s);
        bow.group.rotation.set(Math.PI / 2 - 0.25, rot, 0, 'YXZ');
      }
      const bowItem = actor.equip?.weapon?.find(x => x?.id && x.id.includes('crossbow'));
      const bowVariant = Math.abs(Number(bowItem?.variant) || 0) % 3;
      const bowType = Math.max(0, CROSSBOW_IDS.indexOf(bowItem?.id || 'crossbow'));
      if (!bow.glb) bow.group.children.forEach((child, i) => { child.visible = i === bowType * 3 + bowVariant; });
      const bowKey = bowItem?.id + ':' + bowVariant + ':' + weaponGeneration();
      if (!bow.glb && bow.key !== bowKey) {
        if (bow.weapon) bow.group.remove(bow.weapon);
        bow.weapon = weaponModel(bowItem?.id || 'crossbow', bowVariant);
        if (bow.weapon) bow.group.add(bow.weapon);
        bow.key = bowKey;
      }
      if (bow.weapon) { variants.forEach((_, i) => { bow.group.children[i].visible = false; }); bow.weapon.visible = true; }
      const bowWidth = 1 + bowVariant * .15 + (bowItem?.id === 'heavy_crossbow' ? .2 : bowItem?.id === 'light_crossbow' ? -.12 : 0);
      if (bow.glb) {
        bow.group.scale.set(s * (bow.w > 0.5 ? GLB_BOW_SCALE_AIM : GLB_BOW_SCALE_BACK) * bowWidth, s * (bow.w > 0.5 ? GLB_BOW_SCALE_AIM : GLB_BOW_SCALE_BACK), s * (bow.w > 0.5 ? GLB_BOW_SCALE_AIM : GLB_BOW_SCALE_BACK));
        bow.group.updateMatrix();
        bowPool.push(bow.group.matrix);
      } else { const scale = s * (holdingBow ? BOW_SCALE_AIM : BOW_SCALE_BACK); bow.group.scale.set(scale * bowWidth, scale, scale); }
      if (holdingBow && b.hl) {
        bow.group.updateMatrixWorld(true);
        const point = bow.group.localToWorld(new THREE.Vector3(0, 0, 0.28));
        supportGrip(b, point, s, _side.clone().negate().addScaledVector(UP, -1));
      }
    }
    if (bowPool) bowPool.end();
    updateMelee(state, dolls);
    for (const [id, bow] of bows) {
      if (live.has(id)) continue;
      if (!bow.glb) scene.remove(bow.group);
      bows.delete(id);
    }

    const list = Array.isArray(state.projectiles) ? state.projectiles : [];
    const k = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
    let n = 0;
    const liveThrown = new Set();
    for (const p of list) {
      if (p.kind === 'thrown') {
        liveThrown.add(p.id);
        const x = p.px + (p.x - p.px) * k, z = p.pz + (p.z - p.pz) * k;
        const mesh = thrownMesh(p);
        mesh.position.set(x, heightAt(x, z) + 1.3, z);
        mesh.rotation.set(0, Math.atan2(p.dirX, p.dirZ), 0);
        const spin = mesh.getObjectByName('spin');
        if (spin) spin.rotation.z = (state.tick + k) * .75;
        const scale = .9;
        mesh.scale.setScalar(scale);
        continue;
      }
      if (n >= MAX_BOLTS) break;
      const x = p.px + (p.x - p.px) * k;
      const z = p.pz + (p.z - p.pz) * k;
      tmp.position.set(x, heightAt(x, z) + CROSSBOW.boltY, z);
      tmp.rotation.set(0, Math.atan2(p.dirX, p.dirZ), 0);
      tmp.scale.set(1, 1, 1);
      tmp.updateMatrix();
      trails.setMatrixAt(n, tmp.matrix);
      if (boltModel) {
        tmp.scale.setScalar(GLB_BOLT_SCALE);
        tmp.updateMatrix();
        bolts.userData.set.set(n, tmp.matrix);
      } else {
        bolts.setMatrixAt(n, tmp.matrix);
      }
      n += 1;
    }
    if (boltModel) {
      bolts.userData.set.setCount(n);
      bolts.userData.set.finish(false);
    } else {
      bolts.count = n;
      bolts.instanceMatrix.needsUpdate = true;
    }
    trails.count = n;
    trails.instanceMatrix.needsUpdate = true;
    for (const [id, entry] of thrownMeshes) if (!liveThrown.has(id)) { scene.remove(entry.group); thrownMeshes.delete(id); }
    stats.bows = bows.size;
    stats.bolts = n;
  }

  // 近接武器: 戦っている時（または攻撃の振り）は右手に、それ以外は腰に。倒れたら地面に置く。
  // クロスボウを構えている間は腰へ戻す。
  function updateMelee(state, dolls) {
    const seen = new Set();
    for (const p of meleePools.values()) p.begin();
    for (const actor of state.actors) {
      const item = actor.equip?.weapon?.find(x => x?.id === actor.weapon);
      const variant = item?.variant || 0;
      const procedural = !!WEAPONS[actor.weapon]?.family || ['sword', 'sabre', 'machete', 'hammer', 'club', 'frying_pan'].includes(actor.weapon);
      const name = procedural ? 'proc:' + actor.weapon + ':' + variant + ':' + weaponGeneration() : meleeModelFor(actor.weapon, actor.id);
      if (!name || (!procedural && !md[name]) || actor.state === 'dead') continue;
      const doll = dolls.getDoll(actor.id);
      if (!doll || !doll.group || doll.beast || !doll.root) continue;
      seen.add(actor.id);
      let w = melees.get(actor.id);
      if (!w || w.kind !== name) {
        clearMergedWeapon(doll);
        if (WEAPONS[actor.weapon]?.family === 'polearm') console.info(weaponMergeFallback('polearm'));
        if (w?.procedural) scene.remove(w.group);
        w = { group: procedural ? (weaponModel(actor.weapon, variant) || proceduralWeapon(actor.weapon, variant)) : new THREE.Object3D(), procedural, kind: name, model: md[name], hand: null, pelvis: null };
        if (w.procedural) scene.add(w.group);
        w.doll = doll;
        melees.set(actor.id, w);
      }
      if (!w.hand) {
        w.hand = doll.root.getObjectByName('hand_r') || null;
        w.pelvis = doll.root.getObjectByName('pelvis') || null;
      }
      w.group.visible = doll.group.visible;
      if (!doll.group.visible || !w.hand) continue;
      const s = doll.group.scale.x || 1;
      const carried = typeof actor.carriedBy === 'number';
      const down = actor.state === 'down' || actor.state === 'getup' || carried;
      const drawn = !down && !actor.aiming && (actor.state === 'fight' || actor.targetId !== null && actor.targetId !== undefined);
      const rot = doll.group.rotation.y;
      const poleAttack = drawn && actor.anim === 'Attack' && WEAPONS[actor.weapon]?.family === 'polearm';
      if (poleAttack) {
        const b = bonesOf(doll);
        _fwd.set(Math.sin(rot), 0, Math.cos(rot));
        _side.crossVectors(UP, _fwd).normalize();
        const phase = Math.max(0, Math.min(1, (state.tick - actor.animTick) / 15));
        const thrust = Math.sin(Math.PI * phase);
        const shoulder = b.ur?.getWorldPosition(new THREE.Vector3());
        if (shoulder) {
          const target = shoulder.clone().addScaledVector(_fwd, (0.22 + thrust * 0.12) * s).addScaledVector(_side, -0.13 * s).addScaledVector(UP, -0.24 * s);
          reachHand(b.ur, b.lr, b.hr, target, _side.clone().addScaledVector(UP, -1));
        }
      }
      if (down) {
        const p = doll.group.position;
        _fwd.set(Math.sin(rot), 0, Math.cos(rot));
        _side.crossVectors(UP, _fwd).normalize();
        w.group.position.set(p.x - _side.x * 0.7, p.y + 0.05, p.z - _side.z * 0.7);
        w.group.quaternion.setFromEuler(_e.set(0, rot + 1.1, 0));
        w.group.rotateX(Math.PI / 2);
      } else {
        const bone = drawn || !w.pelvis ? w.hand : w.pelvis;
        const spec = bone === w.hand ? GRIP : SHEATH;
        bone.getWorldPosition(_hp);
        bone.getWorldQuaternion(_hq);
        w.group.quaternion.copy(_hq).multiply(_q.setFromEuler(_e.set(spec.x, spec.y, spec.z)));
        if (poleAttack) w.group.quaternion.setFromEuler(_e.set(0, rot, 0));
        _a.set(spec.off[0], spec.off[1], spec.off[2]).multiplyScalar(s).applyQuaternion(_hq);
        w.group.position.copy(_hp).add(_a);
      }
      w.group.scale.setScalar(s * MELEE_SCALE);
      w.group.updateMatrix();
      if (drawn && WEAPONS[actor.weapon]?.family === 'polearm') {
        w.group.updateMatrixWorld(true);
        const point = w.group.localToWorld(new THREE.Vector3(0, 0, poleAttack ? 0.12 : 0.22));
        const b = bonesOf(doll);
        _fwd.set(Math.sin(rot), 0, Math.cos(rot));
        _side.crossVectors(UP, _fwd).normalize();
        supportGrip(b, point, s, _side.clone().negate().addScaledVector(UP, -1));
      }
      const canMerge = drawn && w.procedural && WEAPONS[actor.weapon]?.family !== 'polearm';
      const mergeKey = name + '|' + (doll.v4Meshes || []).map(m => m.uuid).join(',');
      if (doll.weaponMerge && (!canMerge || doll.weaponMerge.key !== mergeKey)) clearMergedWeapon(doll);
      if (!canMerge) w.mergeAttempt = null;
      if (canMerge && !doll.weaponMerge && w.mergeAttempt !== mergeKey) {
        w.mergeAttempt = mergeKey;
        mergeWeapon(doll, w.group, w.hand, mergeKey);
      }
      w.group.visible = doll.group.visible && !doll.weaponMerge;
      // 同じ glb を別の役目で使う時（片方が無い時の代わり）も、同じ pool にまとめる
      if (!w.procedural) meleePool(poolKey(w.model, name)).push(w.group.matrix);
    }
    for (const p of meleePools.values()) p.end();
    for (const [id] of melees) {
      if (seen.has(id)) continue;
      const old = melees.get(id);
      const doll = dolls.getDoll(id);
      if (doll) clearMergedWeapon(doll);
      if (old?.procedural) scene.remove(old.group);
      melees.delete(id);
    }
    stats.melee = melees.size;
  }

  function poolKey(model, name) {
    for (const [k] of meleePools) if (md[k] === model) return k;
    return name;
  }

  function reset() {
    for (const bow of bows.values()) if (!bow.glb) scene.remove(bow.group);
    bows.clear();
    if (bowPool) {
      bowPool.begin();
      bowPool.end();
    }
    for (const w of melees.values()) { clearMergedWeapon(w.doll); if (w.procedural) scene.remove(w.group); }
    melees.clear();
    for (const entry of thrownMeshes.values()) scene.remove(entry.group);
    thrownMeshes.clear();
    for (const p of meleePools.values()) {
      p.begin();
      p.end();
    }
  }

  return { update, reset, stats, melees };
}

