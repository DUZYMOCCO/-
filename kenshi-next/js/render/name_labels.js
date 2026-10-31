// 仲間の頭上の名前（DOM）。人数分の div を使い回し、変わった時だけ書き換える。
// 画面外（人形が描画から外れている時）とカメラの後ろでは隠す。

import * as THREE from 'three';
import { headAnchor, indicatorShown, ICON_PX } from './dolls.js';
import { shouldShowSquadLabel, squadLabelText, squadLabelKind, resolveNudges } from '../ui/labels.js';
import { raceLabel } from '../sim/races.js';

const _p = new THREE.Vector3();

// 目と矢印・太陽の塊の横幅の半分（px）。目の左に矢印、右に矢印と太陽。
const EYE_HALF_W = ICON_PX.eye / 2 + ICON_PX.arrow + ICON_PX.gap + ICON_PX.sun;
const EYE_H = ICON_PX.eye + ICON_PX.arrow;

export function createNameLabels(dollsApi) {
  const root = document.createElement('div');
  root.className = 'name-layer';
  document.body.appendChild(root);

  const pool = new Map(); // actorId -> { el, text, kind, x, y, shown }
  const seen = new Set();

  function entryFor(id) {
    let entry = pool.get(id);
    if (!entry) {
      const el = document.createElement('div');
      el.className = 'name-label';
      el.style.display = 'none';
      root.appendChild(el);
      entry = { el, text: '', kind: '', x: NaN, y: NaN, shown: false };
      pool.set(id, entry);
    }
    return entry;
  }

  function hide(entry) {
    if (!entry.shown) return;
    entry.shown = false;
    entry.el.style.display = 'none';
  }

  const items = [];
  const shownLabel = new Map();

  function update(state, camera, selectedId, showNames) {
    seen.clear();
    items.length = 0;
    shownLabel.clear();
    const W = window.innerWidth || 1;
    const H = window.innerHeight || 1;
    const actors = state && Array.isArray(state.actors) ? state.actors : [];
    for (let i = 0; i < actors.length; i += 1) {
      const actor = actors[i];
      const label = shouldShowSquadLabel(state, actor, showNames);
      const eye = indicatorShown(actor);
      const doll = label || eye ? dollsApi.getDoll(actor.id) : null;
      if (doll) doll.nudgePx = 0;
      if (!label && !eye) continue;
      if (label) seen.add(actor.id);
      const entry = label ? entryFor(actor.id) : null;
      if (!doll || !doll.group.visible || !camera) {
        if (entry) hide(entry);
        continue;
      }
      headAnchor(doll, actor, _p);
      _p.project(camera);
      if (_p.z > 1 || _p.z < -1) {
        if (entry) hide(entry);
        continue;
      }
      const x = Math.round((_p.x + 1) * 0.5 * W);
      const y = Math.round((1 - _p.y) * 0.5 * H);
      let hw = 0;
      let h = 0;
      if (entry) {
        const text = squadLabelText(actor, selectedId);
        const raceText = raceLabel(actor);
        entry.el.title = raceText ? `種族: ${raceText}` : '';
        if (text !== entry.text) {
          entry.text = text;
          entry.el.textContent = text;
          entry.w = 0;
        }
        const kind = squadLabelKind(actor, selectedId);
        if (kind !== entry.kind) {
          entry.kind = kind;
          entry.el.className = 'name-label ' + kind;
          entry.w = 0;
        }
        if (!entry.shown) {
          entry.shown = true;
          entry.el.style.display = '';
        }
        if (!entry.w) entry.w = entry.el.offsetWidth || entry.text.length * 13 + 12;
        hw = entry.w / 2;
        h = ICON_PX.label + ICON_PX.gap * 2;
        shownLabel.set(actor.id, { entry, x, y });
      }
      if (eye) {
        hw = Math.max(hw, EYE_HALF_W);
        h += EYE_H;
      }
      items.push({ id: actor.id, x, y, hw, h, doll });
    }
    const nudges = items.length > 1 ? resolveNudges(items) : null;
    for (const it of items) {
      const n = nudges ? nudges.get(it.id) || 0 : 0;
      it.doll.nudgePx = n;
      const lab = shownLabel.get(it.id);
      if (!lab) continue;
      const ty = lab.y - n;
      const entry = lab.entry;
      if (lab.x !== entry.x || ty !== entry.y) {
        entry.x = lab.x;
        entry.y = ty;
        entry.el.style.transform = 'translate(' + lab.x + 'px,' + ty + 'px) translate(-50%, -100%)';
      }
    }
    for (const [id, entry] of pool) {
      if (seen.has(id)) continue;
      hide(entry);
      if (!actors.some((a) => a.id === id)) {
        entry.el.remove();
        pool.delete(id);
      }
    }
  }

  function clear() {
    for (const entry of pool.values()) entry.el.remove();
    pool.clear();
  }

  return { update, clear };
}
