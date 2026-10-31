// 浮かぶダメージ数字（DOM）。決まりは ui/dmgpop.js。div を POP_CAP 個だけ作って使い回す。
// シミュは触らない: 毎フレーム部位の体力を前と比べ、減った分・手当てで増えた分を数字にする。

import * as THREE from 'three';
import { headAnchor } from './dolls.js';
import {
  POP_CAP, POP_STYLE, HEAL_MIN, HEAL_GAP, PART_DROP, PART_SIDE,
  createPopQueue, snapshotActor, diffParts, damagePops, hitKind, popAnim,
} from '../ui/dmgpop.js';

const _p = new THREE.Vector3();
const _r = new THREE.Vector3();

export function createDmgNumbers(dollsApi) {
  const root = document.createElement('div');
  root.className = 'pop-layer';
  document.body.appendChild(root);

  const slots = [];
  for (let i = 0; i < POP_CAP; i += 1) {
    const el = document.createElement('div');
    el.className = 'dmg-pop';
    el.style.display = 'none';
    root.appendChild(el);
    slots.push({ el, itemId: 0, cls: '', text: '' });
  }
  const queue = createPopQueue(POP_CAP);
  const snaps = new Map(); // actorId -> parts hp
  const healAcc = new Map(); // actorId -> { amount, part, last }
  const seenFx = new WeakSet();
  let clock = 0;

  function freeSlot() {
    const used = new Set(queue.items.map((it) => it.slot));
    for (let i = 0; i < slots.length; i += 1) if (!used.has(i)) return i;
    return 0;
  }

  function push(p) {
    const it = queue.add({ ...p, t: clock });
    if (it.slot < 0) it.slot = freeSlot();
  }

  function attackerInfo(state, actor) {
    const id = actor.lastAttackerId;
    if (id === null || id === undefined) return { kind: 'cut' };
    const a = state.actors.find((x) => x.id === id);
    if (!a) return { kind: 'cut' };
    const dist = Math.hypot(a.x - actor.x, a.z - actor.z);
    return { kind: hitKind(a.weapon, dist) };
  }

  function update(state, camera, dt) {
    clock += Math.max(0, Math.min(0.1, dt || 0));
    const actors = state && Array.isArray(state.actors) ? state.actors : [];
    // この区切りで新しく起きた受け・崩し
    const blocked = new Set();
    const broken = new Set();
    const defenses = [];
    for (const fx of state.combatFx || []) {
      if (seenFx.has(fx)) continue;
      seenFx.add(fx);
      if (fx.type === 'pan') push({ actorId: fx.defenderId, part: 'head', kind: 'pan', amount: 0 });
      if (fx.type === 'parry' || fx.type === 'evade') defenses.push(fx);
      if (fx.type === 'block') blocked.add(fx.defenderId);
      else if (fx.type === 'break') broken.add(fx.defenderId);
    }
    for (const fx of defenses) push({ actorId: fx.defenderId, part: 'head', kind: fx.type, amount: 0 });
    // 手当てを受けている者
    const treated = new Set();
    for (const a of actors) {
      if (a.task && a.task.type === 'treat' && a.state !== 'dead') treated.add(a.task.targetId);
    }
    for (const actor of actors) {
      const prev = snaps.get(actor.id);
      const changes = diffParts(prev, actor);
      snaps.set(actor.id, snapshotActor(actor));
      if (blocked.has(actor.id)) push({ actorId: actor.id, part: 'head', kind: 'block', amount: 0 });
      if (!changes.length) continue;
      const info = attackerInfo(state, actor);
      for (const p of damagePops(changes, { kind: info.kind, partial: broken.has(actor.id) })) {
        push({ actorId: actor.id, ...p });
      }
      if (treated.has(actor.id)) {
        let gain = 0;
        let part = 'chest';
        for (const c of changes) if (c.delta > 0) { gain += c.delta; part = c.part; }
        if (gain > 0) {
          const h = healAcc.get(actor.id) || { amount: 0, part, last: -9 };
          h.amount += gain;
          h.part = part;
          if (h.amount >= HEAL_MIN && clock - h.last >= HEAL_GAP) {
            push({ actorId: actor.id, part: h.part, kind: 'heal', amount: h.amount });
            h.amount = 0;
            h.last = clock;
          }
          healAcc.set(actor.id, h);
        }
      }
    }
    queue.update(clock);
    draw(state, camera);
  }

  function draw(state, camera) {
    const W = window.innerWidth || 1;
    const H = window.innerHeight || 1;
    const shown = new Set();
    for (const it of queue.items) {
      const slot = slots[it.slot];
      if (!slot) continue;
      const doll = dollsApi.getDoll(it.actorId);
      const actor = state.actors.find((a) => a.id === it.actorId);
      if (!doll || !actor || !doll.group.visible || !camera) continue;
      headAnchor(doll, actor, _p);
      const lying = actor.state === 'down' || actor.state === 'dead' || (actor.carriedBy !== null && actor.carriedBy !== undefined);
      const scale = doll.group.scale.y || 1;
      if (!lying) _p.y -= (PART_DROP[it.part] || 0) * scale;
      _p.y += 0.25 * scale;
      const side = PART_SIDE[it.part] || 0;
      if (side) {
        _r.set(1, 0, 0).applyQuaternion(camera.quaternion);
        _p.addScaledVector(_r, side * scale);
      }
      _p.project(camera);
      if (_p.z > 1 || _p.z < -1) continue;
      const a = popAnim(it.age, it.life);
      // 同じ相手の続く数字は少し横にずらす
      const jitter = ((it.id * 37) % 5 - 2) * 6;
      const x = Math.round((_p.x + 1) * 0.5 * W + jitter);
      const y = Math.round((1 - _p.y) * 0.5 * H - a.rise);
      if (slot.itemId !== it.id || slot.text !== it.text) {
        slot.itemId = it.id;
        slot.text = it.text;
        slot.el.textContent = it.text;
      }
      const cls = 'dmg-pop ' + POP_STYLE[it.kind].cls + (it.big ? ' pop-big' : '');
      if (slot.cls !== cls) {
        slot.cls = cls;
        slot.el.className = cls;
      }
      slot.el.style.display = '';
      slot.el.style.opacity = a.alpha.toFixed(2);
      slot.el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%) scale(' + a.scale.toFixed(2) + ')';
      shown.add(it.slot);
    }
    for (let i = 0; i < slots.length; i += 1) {
      if (!shown.has(i) && slots[i].el.style.display !== 'none') {
        slots[i].el.style.display = 'none';
        slots[i].itemId = 0;
      }
    }
  }

  function reset() {
    queue.clear();
    snaps.clear();
    healAcc.clear();
    for (const s of slots) {
      s.el.style.display = 'none';
      s.itemId = 0;
    }
  }

  function count() {
    return queue.items.length;
  }

  return { update, reset, count, items: queue.items };
}
