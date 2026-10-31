/**
 * DOM dialogue overlays. createBubbleLayer({container, camera,
 * getSpeakerWorldPos, onTap, maxVisible, hearDist}) returns update/dispose.
 * createChoiceWindow({container, onChoose}) returns show/dispose.
 * createHistory() collects history events and converts them to log entries.
 */
import * as THREE from 'three';

const css = `
.dlg-layer { position:fixed; inset:0; z-index:5; pointer-events:none; overflow:hidden; }
.dlg-bubble { position:absolute; box-sizing:border-box; width:max-content; min-width:120px;
   max-width:min(273px,70vw); background:#f4e6c6; color:#30271d; border:2px solid #b8a078;
   border-radius:12px; padding:9px 12px; font:600 15px/1.4 sans-serif; box-shadow:0 3px 12px #0008;
   pointer-events:auto; text-align:left; animation:dlg-pop .22s ease-out; }
.dlg-bubble:after { content:''; position:absolute; left:var(--tail,50%); bottom:-9px;
   border-width:8px 7px 0; border-style:solid; border-color:#b8a078 transparent transparent;
   }
.dlg-text { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:anywhere; }
.dlg-invite { border-color:#c39a4c; cursor:pointer; }
.dlg-pursue { border-color:#e85c32; cursor:pointer; animation:dlg-pop .22s ease-out, dlg-shake .35s ease-out; }
.dlg-declare { background:#691d1d; color:white; border-color:#ff8b78; font-weight:bold;
   animation:dlg-pop .22s ease-out, dlg-flash .55s ease-out; }
.dlg-badge { display:inline-block; margin-right:5px; border-radius:50%; background:#895b2d;
   color:white; text-align:center; min-width:21px; }
.dlg-invite .dlg-badge, .dlg-pursue .dlg-badge { animation:dlg-pulse 2s infinite; }
.dlg-pursue .dlg-badge { background:#c34225; }
.dlg-hint { display:block; font-size:11px; font-weight:400; opacity:.8; margin-top:3px; }
.dlg-speaker { display:block; font-size:11px; font-weight:400; opacity:.7; margin-bottom:2px; }
#app:has(.dlg-sheet:not([hidden])) .dlg-layer, #app:has(#history:not([hidden])) .dlg-layer { visibility:hidden; }
@media (min-width:1000px) {
  .dlg-bubble { max-width:min(369px,70vw); font-size:20px; padding:12px 16px; }
  .dlg-hint, .dlg-speaker { font-size:15px; }
  .dlg-sheet { width:min(100%,702px); font-size:21px; padding:24px; }
  .dlg-sheet button { font-size:21px; min-height:59px; }
}
.dlg-sheet { position:absolute; bottom:0; left:50%; transform:translateX(-50%);
   width:min(100%,520px); box-sizing:border-box; background:#202522f5; color:#fff;
   border:2px solid #ad9973; border-radius:18px 18px 0 0; padding:18px; box-shadow:0 0 30px #0009;
   z-index:20; max-height:45%; overflow:auto; font:16px sans-serif; }
.dlg-sheet[hidden] { display:none; }
.dlg-sheet button { display:block; width:100%; min-height:44px; margin:8px 0;
   background:#514a37; color:white; border:1px solid #bba77d; border-radius:8px;
   font-size:16px; }
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

export function createBubbleLayer({ container, camera, getSpeakerWorldPos, getPlayerWorldPos, getTriggerDist, onTap,
  maxVisible = 3, hearDist = 25 }) {
  installStyle();
  const root = document.createElement('div');
  root.className = 'dlg-layer';
  container.append(root);
  const elements = new Map();
  const hinted = new Set();
  let hintCount = 0;
  function makeBubble(b, off) {
    const el = document.createElement(b.interactive ? 'button' : 'div');
    el.className = `dlg-bubble dlg-${b.kind}`;
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
      if (hinted.has(b.id) || hintCount < 3) {
        if (!hinted.has(b.id)) { hinted.add(b.id); hintCount++; }
        const hint = document.createElement('span');
        hint.className = 'dlg-hint';
        hint.textContent = 'タップで話す';
        el.append(hint);
      }
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
      const key = `${b.text}|${off}|${b.kind}`;
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
      el.style.opacity = String(1 - (1 - minimum) * fade);
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const anchorX = (project.x + 1) * rect.width / 2;
      let left = Math.max(8, Math.min(rect.width - width - 8, anchorX - width / 2));
      let top = Math.max(minTop, Math.min(maxBottom - height, (1 - project.y) * rect.height / 2 - height));
      let box = { left, right: left + width, top, bottom: top + height };
      for (const old of occupied) {
        if (intersects(box, old)) {
          top = Math.max(minTop, old.top - height - 10);
          box = { left, right: left + width, top, bottom: top + height };
        }
      }
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.setProperty('--tail', `${Math.max(10, Math.min(width - 20, anchorX - left))}px`);
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
