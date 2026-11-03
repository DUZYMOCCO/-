/**
 * DOM dialogue overlays. createBubbleLayer({container, camera,
 * getSpeakerWorldPos, onTap, maxVisible, hearDist}) returns update/dispose.
 * createChoiceWindow({container, onChoose}) returns show/dispose.
 * createHistory() collects history events and converts them to log entries.
 */
import * as THREE from 'three';
import { bubbleVariantClass } from './bubble_style.js';

const css = `
.dlg-layer { position:fixed; inset:0; z-index:5; pointer-events:none; overflow:hidden; }
.dlg-bubble { --dlg-fill:rgba(24,22,20,.8); --dlg-edge:rgba(233,216,181,.5); position:absolute; display:flex; align-items:center; gap:4px; box-sizing:border-box; width:max-content; min-width:0;
   max-width:min(273px,70vw); background:var(--dlg-fill); color:#fff2d8; border:1px solid var(--dlg-edge);
   border-radius:4px; padding:2px 5px; font:600 13px/1.2 sans-serif; box-shadow:0 1px 4px rgba(0,0,0,.35);
   pointer-events:auto; text-align:left; animation:dlg-pop .22s ease-out; }
.dlg-bubble.bubble--hostile { --dlg-fill:rgba(24,22,20,.52); --dlg-edge:rgba(255,239,207,.55); background:var(--dlg-fill); box-shadow:0 1px 4px rgba(0,0,0,.25); }
.dlg-bubble.bubble--hostile .dlg-text { color:#fff2d8; text-shadow:0 1px 2px rgba(0,0,0,.8); }
.dlg-text { display:block; flex:1 1 auto; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dlg-invite { --dlg-edge:#c39a4c; cursor:pointer; }
.dlg-pursue { --dlg-edge:#e85c32; cursor:pointer; animation:dlg-pop .22s ease-out, dlg-shake .35s ease-out; }
.dlg-declare { --dlg-fill:rgba(78,25,24,.88); --dlg-edge:var(--ui-rust); background:var(--dlg-fill); color:white; font-weight:bold;
   animation:dlg-pop .22s ease-out, dlg-flash .55s ease-out; }
.dlg-badge { display:inline-block; flex:0 0 auto; border-radius:50%; background:#895b2d;
   color:white; text-align:center; min-width:14px; font-size:.85em; }
.dlg-invite .dlg-badge, .dlg-pursue .dlg-badge { animation:dlg-pulse 2s infinite; }
.dlg-pursue .dlg-badge { background:#c34225; }
.dlg-speaker { display:block; flex:0 0 auto; max-width:30%; overflow:hidden; color:inherit; font-size:10px; font-weight:400; opacity:.72; text-overflow:ellipsis; white-space:nowrap; }
#app:has(.dlg-sheet:not([hidden])) .dlg-layer, #app:has(#history:not([hidden])) .dlg-layer { visibility:hidden; }
@media (min-width:1000px) {
  .dlg-bubble { max-width:min(300px,70vw); font-size:12px; padding:2px 5px; }
  .dlg-speaker { font-size:10px; }
  .dlg-sheet { width:min(100%,702px); font-size:21px; padding:24px; }
  .dlg-sheet button { font-size:21px; min-height:59px; }
}
.dlg-sheet { position:absolute; bottom:0; left:50%; transform:translateX(-50%);
   width:min(100%,520px); box-sizing:border-box; background:linear-gradient(155deg,rgba(53,43,31,.98),rgba(30,29,25,.99)); color:#fff4dc;
   border:2px dashed var(--ui-border); border-radius:var(--ui-radius-l) var(--ui-radius-l) 0 0; padding:18px; box-shadow:var(--ui-shadow),inset 0 1px rgba(255,236,196,.12);
   z-index:20; max-height:45%; overflow:auto; font:16px sans-serif; }
.dlg-sheet[hidden] { display:none; }
.dlg-sheet button { display:block; width:100%; min-height:44px; margin:8px 0;
   background:linear-gradient(#70583a,#4a3a2b); color:white; border:1px solid var(--ui-border); border-radius:var(--ui-radius-s);
   font-size:16px; }
.dlg-sheet button:disabled { opacity:.55; cursor:default; }
.dlg-sheet button small { display:block; font-size:12px; color:#ffc9a0; }
.dlg-name { color:#ffdd9a; font-weight:bold; }
@keyframes dlg-pop { from { opacity:0; scale:.85; } to { opacity:1; scale:1; } }
@keyframes dlg-shake { 25%,75% { translate:4px 0; } 50% { translate:-4px 0; } }
@keyframes dlg-flash { 30% { background:#ee4936; } }
@keyframes dlg-pulse { 50% { box-shadow:0 0 12px #ffb66b; } }
`;

function installStyle() {
  if (document.getElementById('dlg-styles')) return;
  const style = document.createElement('style');
  style.id = 'dlg-styles';
  style.textContent = css;
  document.head.append(style);
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function placeBubbleRect({ anchorX, anchorY, width, height, viewport, minTop = 52, maxBottom = viewport.height - 96, occupied = [], obstacles = [] }) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const minLeft = 8, maxLeft = Math.max(8, viewport.width - width - 8);
  const collisionHeight = height + 4;
  const maxTop = Math.max(minTop, maxBottom - collisionHeight);
  const xs = new Set([minLeft, maxLeft, anchorX - width / 2, anchorX - width - 16, anchorX + 16]);
  const ys = new Set([minTop, maxTop, anchorY - height - 8, anchorY + 8 - height]);
  const stride = Math.max(34, height + 8);
  for (let y = minTop; y <= maxTop; y += stride) ys.add(y);
  for (const other of [...obstacles, ...occupied]) {
    xs.add(other.left - width - 8); xs.add(other.right + 8);
    ys.add(other.top - height - 8); ys.add(other.bottom + 8);
  }
  const candidates = [];
  for (const rawX of xs) for (const rawY of ys) {
    const left = clamp(rawX, minLeft, maxLeft), top = clamp(rawY, minTop, maxTop);
    if (!candidates.some((box) => box.left === left && box.top === top)) candidates.push({ left, right: left + width, top, bottom: top + collisionHeight });
  }
  let best = candidates[0], bestScore = Infinity;
  for (const box of candidates) {
    let overlapArea = 0;
    for (const other of [...obstacles, ...occupied]) if (intersects(box, other)) {
      overlapArea += Math.max(0, Math.min(box.right, other.right) - Math.max(box.left, other.left)) *
        Math.max(0, Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top));
    }
    const score = overlapArea * 100 + Math.abs((box.left + width / 2) - anchorX) + Math.abs(box.bottom - anchorY) * .2;
    if (score < bestScore) { best = box; bestScore = score; }
  }
  return { ...best, overlapArea: Math.max(0, (bestScore - Math.abs((best.left + width / 2) - anchorX) - Math.abs(best.bottom - anchorY) * .2) / 100) };
}

function bubbleObstacles(rect) {
  const roots = [...document.querySelectorAll(
    '#hud > *, body > :not(#hud):not(.dlg-layer):not(canvas), ' +
    '.hud-hp, .event-toasts, .hud-party, .hud-portraits, .hud-menu-items:not([hidden]), ' +
    '.inventory-panel, .squad-panel-overlay, .event-history, #trade-panel, .dlg-sheet, ' +
    '.hud-skills:not(.hidden), .build-mode-panel, .outpost-panel, .build-jobs-panel, .build-storage-panel'
  )];
  const seen = new Set();
  const boxes = [];
  for (const el of roots) {
    if (el.classList?.contains('dlg-bubble') || el.hidden) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || (r.width >= rect.width * .96 && r.height >= rect.height * .96)) continue;
    const box = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    const key = [box.left, box.right, box.top, box.bottom].join(':');
    if (!seen.has(key)) { seen.add(key); boxes.push(box); }
  }
  return boxes;
}

export function createBubbleLayer({ container, camera, getSpeakerWorldPos, getPlayerWorldPos, getTriggerDist, onTap,
  maxVisible = 3, hearDist = 25 }) {
  installStyle();
  const root = document.createElement('div');
  root.className = 'dlg-layer';
  container.append(root);
  const elements = new Map();
  function makeBubble(b, off) {
    const el = document.createElement(b.interactive ? 'button' : 'div');
    el.className = `dlg-bubble dlg-${b.kind}${bubbleVariantClass(b)}`;
    const speaker = document.createElement('span');
    speaker.className = 'dlg-speaker';
    speaker.textContent = getSpeakerWorldPos(b.speakerId)?.name || '';
    el.append(speaker);
    const text = document.createElement('span');
    text.className = 'dlg-text';
    const badge = { invite: '…', pursue: '！', declare: '⚔' }[b.kind];
    if (badge) {
      const icon = document.createElement('span');
      icon.className = 'dlg-badge';
      icon.textContent = badge;
      text.append(icon);
    }
    text.append(document.createTextNode((off ? '➤ ' : '') + b.text));
    el.append(text);
    if (b.interactive) {
      el.onclick = () => onTap(b.id);
    }
    root.append(el);
    return el;
  }
  function update(bubbles) {
    // The layer is a fixed full-viewport overlay. (#hud is itself a full-screen
    // overlay, so its rect must not be used as the "top bar" bound.)
    const rect = { width: window.innerWidth, height: window.innerHeight };
    const minTop = 52;
    const maxBottom = rect.height - 96;
    const occupied = [];
    const avoidHud = bubbleObstacles(rect);
    const priorities = { declare: 4, pursue: 3, invite: 2, ambient: 1 };
    const triggerRanges = { ambient: 12, invite: 12, pursue: 20, declare: 20 };
    const player = getPlayerWorldPos?.() || camera.position;
    const list = bubbles.map(b => {
      const p = getSpeakerWorldPos(b.speakerId);
      if (!p) return null;
      const v = new THREE.Vector3(p.x, p.y, p.z);
      return { b, distance: Math.hypot(p.x - player.x, p.z - player.z), project: v.clone().project(camera) };
    }).filter(item => item && (item.distance <= hearDist || ['pursue', 'declare'].includes(item.b.kind)))
      .sort((a, b) => priorities[b.b.kind] - priorities[a.b.kind] || a.distance - b.distance);
    const visible = new Set();
    for (const { b, project, distance } of list) {
      if (visible.size >= maxVisible) break;
      const off = project.z > 1 || Math.abs(project.x) > 1 || Math.abs(project.y) > 1;
      if (off && !['pursue', 'declare'].includes(b.kind)) continue;
      visible.add(b.id);
      const key = `${b.text}|${off}|${b.kind}|${!!b.hostile}`;
      let entry = elements.get(b.id);
      if (!entry || entry.key !== key) {
        if (entry) entry.el.remove();
        entry = { key, el: makeBubble(b, off) };
        elements.set(b.id, entry);
      }
      const el = entry.el;
      const trigger = getTriggerDist?.(b) ?? b.triggerDist ?? triggerRanges[b.kind] ?? 12;
      const fade = Math.min(1, Math.max(0, (distance - trigger) / Math.max(1, hearDist - trigger)));
      const minimum = ['pursue', 'declare'].includes(b.kind) ? .85 : .35;
      el.style.opacity = b.hostile ? '1' : String(1 - (1 - minimum) * fade);
      el.style.width = '';
      let width = el.offsetWidth;
      let height = el.offsetHeight;
      const anchorX = (project.x + 1) * rect.width / 2;
      let box = placeBubbleRect({ anchorX, anchorY: (1 - project.y) * rect.height / 2, width, height, viewport: rect, minTop, maxBottom, occupied, obstacles: avoidHud });
      if (box.overlapArea > 0) {
        for (const factor of [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]) {
          el.style.width = `${Math.max(120, width * factor)}px`;
          width = el.offsetWidth; height = el.offsetHeight;
          box = placeBubbleRect({ anchorX, anchorY: (1 - project.y) * rect.height / 2, width, height, viewport: rect, minTop, maxBottom, occupied, obstacles: avoidHud });
          if (box.overlapArea === 0) break;
        }
      }
      if (box.overlapArea > 0) { el.remove(); elements.delete(b.id); visible.delete(b.id); continue; }
      el.style.left = `${box.left}px`;
      el.style.top = `${box.top}px`;
      occupied.push(box);
    }
    for (const [id, entry] of elements) {
      if (!visible.has(id)) { entry.el.remove(); elements.delete(id); }
    }
  }
  return { update, rects() { return [...elements.values()].map(entry => entry.el.getBoundingClientRect()); },
    dispose() { root.remove(); } };
}

export function createChoiceWindow({ container, onChoose, onTrade }) {
  installStyle();
  const el = document.createElement('div');
  el.className = 'dlg-sheet';
  el.hidden = true;
  container.append(el);
  function show(value) {
    if (!value) { el.hidden = true; return; }
    el.hidden = false;
    el.replaceChildren();
    const name = document.createElement('div');
    name.className = 'dlg-name';
    name.textContent = value.faction ? `${value.speakerName}（${value.faction}）` : `${value.speakerName}`;
    el.append(name);
    for (const line of value.lines) {
      const p = document.createElement('p');
      p.textContent = line;
      el.append(p);
    }
    for (const option of value.options) {
      const button = document.createElement('button');
      button.textContent = option.text;
      if (option.disabled) {
        // 選べない選択肢は理由を添えて薄く出す
        button.disabled = true;
        if (option.note) { const note = document.createElement('small'); note.textContent = option.note; button.append(note); }
      }
      button.onclick = () => onChoose(option.id);
      el.append(button);
    }
    if (value.tradeAvailable) {
      const trade = document.createElement('button');
      trade.textContent = '取引する';
      trade.onclick = () => onTrade?.(value.speakerId);
      el.append(trade);
    }
  }
  return { show, dispose() { el.remove(); } };
}

export function createHistory() {
  const entries = [];
  return { entries, add(event) { if (event.type === 'history') entries.push(event);
   }, toLogEntries() { return entries.map(({ tick, text }) => ({ tick, text }));
   } };
}
