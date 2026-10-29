// 20:13 チャンバラの見た目: 受けの構え・火花・よろけ・振りの速さ合わせ・音のきっかけ。
// sim（js/sim/combat.js）が残す state.combatFx と actor の anim / blockUntil / staggerUntil を読むだけ。
// main.js で dolls.update の後、crossbows.update（武器を手に付ける）の前に呼ぶ。
import * as THREE from 'three';
import { chooseBlock, poseFor, parseBlockForce, BLOCK_TIMING, BLOCK_TYPES } from './block_types.js';

const TICK = 0.1;
// Attack の動き（1.5秒）で刃が当たる瞬間。手の速さが一番大きい所を測った値（tools/glbview/clip.html）。
const ATTACK_IMPACT_SEC = 0.38; // 0.43 が一番速い所。少し手前（刃が胸の高さ）で受けに当てる
const ATTACK_RECOVER_FROM = 0.55;
const ATTACK_RETURN_SEC = 0.8; // 戻りの振りが始まる所 // ここから後は戻りの動きなので速めに流す
const PUNCH_IMPACT_SEC = 0.2;
const HIT_CLIP_SEC = 0.333;
const SPARKS = 320;
const RECOIL_SEC = 0.22; // 受けられた振りは刃が止まる（その間ほとんど進めない）
const CONTACT_Y = 1.3; // 刃が合う高さ（人形の足元から）

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _cur = new THREE.Vector3();
const _want = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _id = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _t = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _el = new THREE.Vector3();
const _bl = new THREE.Vector3();
const GRIP_PALM = 0.085; // crossbows.js の GRIP.off（手首から握りの中心まで）

// 骨 bone から子 child への向きを want（世界座標）へ回す。w は 0..1 の混ぜ具合。
function aim(bone, child, want, w) {
  if (!bone || !child || w <= 0) return;
  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  _cur.subVectors(_b, _a).normalize();
  rotateWorld(bone, _cur, want, w);
}

// 骨の世界での向き from を to へ回す（w で混ぜる）
function rotateWorld(bone, from, to, w) {
  _q.setFromUnitVectors(from, to);
  if (w < 1) _q.slerp(_id, 1 - w);
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

// 刀・鉈など（受けができる武器）を持っているか
function armed(actor) {
  return actor.weapon && actor.weapon !== 'fists' && actor.weapon !== 'bite';
}

function dirOf(out, f, r, fw, rt, up) {
  return out.set(f.x * fw + r.x * rt, up, f.z * fw + r.z * rt).normalize();
}

// 骨を世界の軸 axis まわりに angle 回す（上体のひねり）
function twistWorld(bone, axis, angle) {
  if (!bone || !angle) return;
  _q.setFromAxisAngle(axis, angle);
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

// 2関節の簡単な IK: 上腕 ua・前腕 la・手 hand の手首を target へ。pole は肘を出したい向き。
function reach(ua, la, hand, target, pole, w) {
  if (!ua || !la || !hand || w <= 0) return;
  ua.getWorldPosition(_s);
  la.getWorldPosition(_e);
  hand.getWorldPosition(_t);
  const l1 = _s.distanceTo(_e);
  const l2 = _e.distanceTo(_t);
  _a.subVectors(target, _s);
  const d = Math.min(Math.max(_a.length(), 0.02), (l1 + l2) * 0.999);
  _a.normalize();
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const sinA = Math.sqrt(1 - cosA * cosA);
  _b.copy(pole).addScaledVector(_a, -pole.dot(_a)).normalize();
  _el.copy(_s).addScaledVector(_a, l1 * cosA).addScaledVector(_b, l1 * sinA);
  aim(ua, la, _want.subVectors(_el, _s).normalize(), w);
  la.getWorldPosition(_e);
  aim(la, hand, _want.subVectors(target, _e).normalize(), w);
}

function blockForceFromUrl() {
  if (typeof window === 'undefined' || !window.location) return null;
  try {
    return parseBlockForce(new URLSearchParams(window.location.search).get('block'));
  } catch {
    return null;
  }
}

export function createCombatFx(scene) {
  // 火花: 加算合成の点。寿命つきの小さな粒を使い回す。
  const pos = new Float32Array(SPARKS * 3);
  const col = new Float32Array(SPARKS * 3);
  const vel = new Float32Array(SPARKS * 3);
  const life = new Float32Array(SPARKS);
  const tint = new Float32Array(SPARKS * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  scene.add(points);
  // 当たった瞬間の光（大きめの点 1つ）
  const flashGeo = new THREE.BufferGeometry();
  const flashPos = new Float32Array(8 * 3);
  const flashCol = new Float32Array(8 * 3);
  const flashLife = new Float32Array(8);
  const flashTint = new Float32Array(8 * 3);
  flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPos, 3));
  flashGeo.setAttribute('color', new THREE.BufferAttribute(flashCol, 3));
  const flashMat = new THREE.PointsMaterial({
    size: 0.45,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const flash = new THREE.Points(flashGeo, flashMat);
  flash.frustumCulled = false;
  flash.renderOrder = 6;
  scene.add(flash);

  let next = 0;
  let flashNext = 0;
  const seen = new Map(); // 出した fx の鍵 -> tick
  const poses = new Map(); // actorId -> { guard }
  const incoming = new Map(); // actorId -> 一番早く当たる振りを出している攻める側
  const stats = { sparks: 0, blocks: 0, hits: 0, breaks: 0, blockTypes: {}, lastBlock: null };
  for (const t of BLOCK_TYPES) stats.blockTypes[t] = 0;
  const urlForce = blockForceFromUrl();
  const byId = new Map();
  let audio = null;
  let audioOk = false;
  if (typeof window !== 'undefined') {
    const unlock = () => {
      audioOk = true;
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  function spawn(x, y, z, kind) {
    // 受け = 白っぽい橙の火花が多め / 崩し = 赤みのある火花 / 当たり = 暗い赤の少しだけ
    const n = kind === 'block' ? 40 : kind === 'break' ? 50 : 10;
    const c = kind === 'hit' ? [0.55, 0.06, 0.04] : kind === 'break' ? [1.0, 0.4, 0.12] : [1.0, 0.68, 0.28];
    const speed = kind === 'hit' ? 1.4 : 3.6;
    for (let i = 0; i < n; i += 1) {
      const k = next;
      next = (next + 1) % SPARKS;
      pos[k * 3] = x;
      pos[k * 3 + 1] = y;
      pos[k * 3 + 2] = z;
      const th = Math.random() * Math.PI * 2;
      const ph = (Math.random() - 0.3) * Math.PI * 0.7;
      const s = speed * (0.35 + Math.random() * 0.65);
      vel[k * 3] = Math.cos(th) * Math.cos(ph) * s;
      vel[k * 3 + 1] = Math.sin(ph) * s + 1.0;
      vel[k * 3 + 2] = Math.sin(th) * Math.cos(ph) * s;
      life[k] = 0.18 + Math.random() * 0.3;
      tint[k * 3] = c[0];
      tint[k * 3 + 1] = c[1];
      tint[k * 3 + 2] = c[2];
    }
    if (kind !== 'hit') {
      const f = flashNext;
      flashNext = (flashNext + 1) % 8;
      flashPos[f * 3] = x;
      flashPos[f * 3 + 1] = y;
      flashPos[f * 3 + 2] = z;
      flashLife[f] = 0.12;
      flashTint[f * 3] = c[0];
      flashTint[f * 3 + 1] = c[1];
      flashTint[f * 3 + 2] = c[2];
    }
    stats.sparks += n;
  }

  // 音のきっかけ: 'chanbara' イベントを出す（音の素材は後で差し替える）。
  // 素材が無い間は、画面に触れた後だけ WebAudio で短い金属音 / 鈍い音を鳴らす。
  function sound(fx, x, z) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('chanbara', { detail: { type: fx.type, x, z, tick: fx.tick } }));
    if (!audioOk || window.__chanbaraMute) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      const g = audio.createGain();
      g.connect(audio.destination);
      if (fx.type === 'hit') {
        const o = audio.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.12);
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(g);
        o.start(t);
        o.stop(t + 0.15);
      } else {
        const base = fx.type === 'break' ? 900 : 1700;
        for (const m of [1, 1.53, 2.41]) {
          const o = audio.createOscillator();
          o.type = 'sine';
          o.frequency.value = base * m + Math.random() * 40;
          o.connect(g);
          o.start(t);
          o.stop(t + 0.3);
        }
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      }
    } catch {
      audioOk = false;
    }
  }

  function readFx(state, dolls) {
    const list = state.combatFx;
    if (!list || !list.length) return;
    for (const f of list) {
      const key = f.tick + ':' + f.type + ':' + f.attackerId + ':' + f.defenderId;
      if (seen.has(key)) continue;
      seen.set(key, f.tick);
      // 古すぎるもの（読み込み直後など）は出さない
      if (state.tick - f.tick > 3) continue;
      const da = dolls.getDoll(f.attackerId);
      const dd = dolls.getDoll(f.defenderId);
      let x = f.x;
      let z = f.z;
      let y = 0;
      if (da && dd && da.group && dd.group) {
        // 守る側の少し手前（刃が合う所）
        const pa = da.group.position;
        const pd = dd.group.position;
        x = pa.x + (pd.x - pa.x) * 0.62;
        z = pa.z + (pd.z - pa.z) * 0.62;
        y = pd.y + CONTACT_Y * (dd.group.scale.y || 1) - (f.type === 'hit' ? 0.15 : 0);
        // 受け・崩しは守る側の刃の中ほど（手の骨の +Z の先）に出す
        const hb = f.type !== 'hit' && dd.root ? bonesOf(dd).hr : null;
        if (hb) {
          hb.getWorldPosition(_a);
          _b.set(0, 0, 1).applyQuaternion(hb.getWorldQuaternion(_qw));
          const len = 0.32 * (dd.group.scale.x || 1);
          x = _a.x + _b.x * len;
          y = _a.y + _b.y * len;
          z = _a.z + _b.z * len;
        }
        if (!dd.group.visible) continue;
      }
      spawn(x, y, z, f.type);
      if (f.type === 'block') {
        const pa = poses.get(f.attackerId);
        if (pa) pa.recoil = RECOIL_SEC;
        // 守る側: 受けた瞬間の刃の動きと、型ごとの保つ時間
        const pd = poses.get(f.defenderId);
        const def = byId.get(f.defenderId);
        const att = byId.get(f.attackerId);
        if (pd && def) {
          if (pd.attackerId !== f.attackerId) setType(pd, def, att, f.tick);
          pd.contact = 0.15;
          pd.hold = BLOCK_TIMING[pd.type].hold;
          stats.blockTypes[pd.type] += 1;
          stats.lastBlock = { id: def.id, type: pd.type, side: pd.side, tick: f.tick };
        }
      }
      stats[f.type === 'block' ? 'blocks' : f.type === 'break' ? 'breaks' : 'hits'] += 1;
      sound(f, x, z);
    }
    if (seen.size > 200) {
      for (const [k, t] of seen) if (state.tick - t > 50) seen.delete(k);
    }
  }

  function bonesOf(doll) {
    if (doll.cfxBones) return doll.cfxBones;
    const g = (n) => doll.root.getObjectByName(n) || null;
    doll.cfxBones = {
      ual: g('upperarm_l'), lal: g('lowerarm_l'), hl: g('hand_l'),
      uar: g('upperarm_r'), lar: g('lowerarm_r'), hr: g('hand_r'),
      sp: g('spine_02'), mid: g('middle_01_r'),
    };
    return doll.cfxBones;
  }

  // 受けの構え（型ごと）。side=-1 は鏡写し（左から来る攻撃）。k = 受けた瞬間の動き（0..1）
  function blockPose(doll, actor, type, side, w, k) {
    const b = bonesOf(doll);
    if (!b.uar || !b.lar || !b.hr) return;
    const P = poseFor(type, actor.weapon);
    const sc = doll.group.scale.x || 1;
    const rot = doll.group.rotation.y;
    _fwd.set(Math.sin(rot), 0, Math.cos(rot));
    _right.crossVectors(_fwd, UP).normalize();
    const d = (v, add, ak) => dirOf(_want, _fwd, _right,
      v[0] + (add ? add[0] * ak : 0), (v[1] + (add ? add[1] * ak : 0)) * side, v[2] + (add ? add[2] * ak : 0));
    if (b.sp) {
      _cur.copy(UP);
      rotateWorld(b.sp, _cur, d(P.spine), w);
      if (P.yaw) twistWorld(b.sp, UP, P.yaw * side * w);
    }
    aim(b.uar, b.lar, d(P.uar), w);
    aim(b.lar, b.hr, d(P.lar), w);
    // 刃（手の骨の +Z）
    _cur.set(0, 0, 1).applyQuaternion(b.hr.getWorldQuaternion(_qw)).normalize();
    rotateWorld(b.hr, _cur, d(P.blade, P.contact, k), w);
    if (!b.ual || !b.lal || !b.hl) return;
    if (P.twoHand) {
      // 左手は柄の後ろ（右手の握りから柄頭の側へ）。肘は下・外へ。
      b.hr.getWorldPosition(_t);
      b.hr.getWorldQuaternion(_qw);
      _bl.set(0, 0, 1).applyQuaternion(_qw);
      _a.set(0, GRIP_PALM * sc, 0).applyQuaternion(_qw);
      const tgt = _t.clone().add(_a).addScaledVector(_bl, -0.1 * sc);
      // 左手首は手のひらの分だけ手前（左の手の骨の +Y が指先なので、柄から -Y 側）
      _a.set(0, -GRIP_PALM * sc, 0).applyQuaternion(b.hl.getWorldQuaternion(_qp));
      tgt.add(_a);
      dirOf(_pole, _fwd, _right, 0.1, -0.7 * side, -0.7);
      reach(b.ual, b.lal, b.hl, tgt, _pole, w);
    } else {
      const ual = P.ual || [0.45, -0.3, -0.7];
      const lal = P.lal || [0.85, 0.45, 0.3];
      aim(b.ual, b.lal, d(ual), w);
      aim(b.lal, b.hl, d(lal), w);
    }
  }

  function setType(p, defender, attacker, startTick) {
    const force = (typeof window !== 'undefined' && parseBlockForce(window.__blockForce)) || urlForce;
    const c = chooseBlock(defender, attacker, startTick, force);
    if (p.w > 0.05 && (c.type !== p.type || c.side !== p.side)) {
      // 構えたまま型が変わる時は前の型から移す（ぱっと切り替わらないように）
      p.prevType = p.type;
      p.prevSide = p.side;
      p.fade = 0;
    }
    p.type = c.type;
    p.side = c.side;
    p.attackerId = attacker ? attacker.id : null;
    p.key = (attacker ? attacker.id : 0) + ':' + startTick;
  }

  function updatePoses(state, dolls, dt) {
    const tick = state.tick;
    incoming.clear();
    byId.clear();
    for (const a of state.actors) {
      byId.set(a.id, a);
      if (!a.swing) continue;
      const prev = incoming.get(a.swing.targetId);
      if (prev === undefined || a.swing.impactTick < prev.swing.impactTick) incoming.set(a.swing.targetId, a);
    }
    for (const actor of state.actors) {
      const doll = dolls.getDoll(actor.id);
      if (!doll || !doll.root || doll.beast || doll.fallback || !doll.group.visible) continue;
      let p = poses.get(actor.id);
      if (!p) {
        p = { w: 0, recoil: 0, type: 'B0', side: 1, key: null, attackerId: null, contact: 0, hold: 0,
          prevType: null, prevSide: 1, fade: 1 };
        poses.set(actor.id, p);
      }
      const up = actor.state !== 'down' && actor.state !== 'dead' && actor.state !== 'getup';
      const blocking =
        up && actor.anim === 'Block' && ((actor.blockUntil || 0) > tick || tick - (actor.animTick || 0) < 4);
      const att = incoming.get(actor.id);
      // 刀を持っていて、自分に来る振りが 0.3秒以内に当たる時は、その振りに合う型を半分まで上げておく（見た目だけ）
      const ready = up && !blocking && armed(actor) && att !== undefined &&
        att.swing.impactTick - tick <= 3 && actor.anim !== 'Attack' && actor.anim !== 'Hit' && actor.anim !== 'Stagger';
      if (att && armed(actor) && up) {
        const key = att.id + ':' + att.swing.startTick;
        if (key !== p.key && (ready || p.w < 0.05)) setType(p, actor, att, att.swing.startTick);
      }
      if (!up || actor.anim === 'Hit' || actor.anim === 'Stagger') p.hold = 0;
      const goal = blocking || p.hold > 0 ? 1 : ready ? 0.55 : 0;
      const T = BLOCK_TIMING[p.type] || BLOCK_TIMING.B0;
      if (goal > p.w) p.w = Math.min(goal, p.w + dt / T.raise);
      else p.w = Math.max(goal, p.w - dt / T.release);
      p.hold = Math.max(0, p.hold - dt);
      if (p.w > 0.02) {
        const ease = p.w * p.w * (3 - 2 * p.w);
        const k = p.contact > 0 ? Math.sin((1 - p.contact / 0.15) * Math.PI) : 0;
        p.contact = Math.max(0, p.contact - dt);
        if (p.fade < 1 && p.prevType) {
          p.fade = Math.min(1, p.fade + dt / 0.1);
          blockPose(doll, actor, p.prevType, p.prevSide, ease, 0);
          blockPose(doll, actor, p.type, p.side, ease * p.fade, k);
        } else {
          blockPose(doll, actor, p.type, p.side, ease, k);
        }
      } else {
        p.fade = 1;
      }

      // 振りの速さを sim の振りかぶり（当たる tick）に合わせる
      const act = doll.currentAction;
      if (!act || !doll.actions) continue;
      if (doll.animName === 'Attack' || doll.animName === 'Punch') {
        const wind = Math.max(1, actor.swingWindup || 5) * TICK;
        const impact = doll.animName === 'Attack' ? ATTACK_IMPACT_SEC : PUNCH_IMPACT_SEC;
        let k = Math.min(1.8, Math.max(0.45, impact / wind));
        if (doll.animName === 'Attack' && act.time > ATTACK_RECOVER_FROM) k = Math.max(k, 1.5);
        if (p.recoil > 0) {
          p.recoil -= dt;
          k = 0.12;
          // 止まった後は振り抜かず、戻りの動きへ飛ばす（刃が相手の刀を通り抜けて見えないように）
          if (p.recoil <= 0 && doll.animName === 'Attack' && act.time < ATTACK_RETURN_SEC) act.time = ATTACK_RETURN_SEC;
        }
        act.setEffectiveTimeScale(k);
      } else if (doll.animName === 'Hit') {
        // ひるみ 0.3秒はそのまま。よろけ（約1秒）は同じ動きをゆっくり。
        const stagger = actor.anim === 'Stagger' && (actor.staggerUntil || 0) > tick;
        act.setEffectiveTimeScale(stagger ? HIT_CLIP_SEC / 0.9 : 1);
        if (stagger) {
          const b = bonesOf(doll);
          if (b.sp) {
            const rot = doll.group.rotation.y;
            _fwd.set(Math.sin(rot), 0, Math.cos(rot));
            _right.crossVectors(_fwd, UP).normalize();
            _cur.copy(UP);
            rotateWorld(b.sp, _cur, dirOf(_want, _fwd, _right, -0.4, 0.12, 1), 1);
          }
        }
      }
    }
    if (poses.size > state.actors.length * 2) {
      const ids = new Set(state.actors.map((a) => a.id));
      for (const id of poses.keys()) if (!ids.has(id)) poses.delete(id);
    }
  }

  function updateParticles(dt) {
    for (let k = 0; k < SPARKS; k += 1) {
      if (life[k] <= 0) {
        col[k * 3] = col[k * 3 + 1] = col[k * 3 + 2] = 0;
        continue;
      }
      life[k] -= dt;
      vel[k * 3 + 1] -= 9.8 * dt;
      pos[k * 3] += vel[k * 3] * dt;
      pos[k * 3 + 1] += vel[k * 3 + 1] * dt;
      pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
      const a = Math.max(0, Math.min(1, life[k] / 0.2));
      col[k * 3] = tint[k * 3] * a;
      col[k * 3 + 1] = tint[k * 3 + 1] * a;
      col[k * 3 + 2] = tint[k * 3 + 2] * a;
    }
    for (let f = 0; f < 8; f += 1) {
      if (flashLife[f] > 0) flashLife[f] -= dt;
      const a = Math.max(0, flashLife[f] / 0.12);
      flashCol[f * 3] = flashTint[f * 3] * a;
      flashCol[f * 3 + 1] = flashTint[f * 3 + 1] * a;
      flashCol[f * 3 + 2] = flashTint[f * 3 + 2] * a;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    flashGeo.attributes.position.needsUpdate = true;
    flashGeo.attributes.color.needsUpdate = true;
  }

  function update(state, dolls, dt, speed) {
    if (!state) return;
    updatePoses(state, dolls, Math.min(0.1, dt * (speed > 0 ? Math.min(speed, 3) : 0)));
    readFx(state, dolls);
    updateParticles(dt * (speed > 0 ? Math.min(speed, 2) : 0));
  }

  function reset() {
    seen.clear();
    poses.clear();
    life.fill(0);
    flashLife.fill(0);
  }

  return { update, reset, stats };
}
