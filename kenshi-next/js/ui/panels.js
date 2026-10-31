// One owner for the visible panel stack. Renderers retain their own data.
export function createPanelManager(onOpen) {
  const registry = new Map(), stack = [];
  const ancestors = id => { const result = []; while (id && registry.has(id)) { result.push(id); id = registry.get(id).parent; } return result; };
  function close(id) {
    for (const item of [...stack].reverse()) {
      if (!ancestors(item).includes(id)) continue;
      stack.splice(stack.indexOf(item), 1);
      registry.get(item).close?.();
    }
  }
  function open(id) {
    if (!registry.has(id)) throw new Error(`Unknown panel: ${id}`);
    const lineage = ancestors(id);
    for (const item of [...stack].reverse()) {
      const it = registry.get(item);
      // 建築モードのような「場の操作」パネルは、状態表示（nonModal）を開いても閉じない
      if (!lineage.includes(item) && !it.nonModal && !(it.keepOnNonModal && registry.get(id).nonModal)) close(item);
    }
    if (!stack.includes(id)) { stack.push(id); onOpen?.(); }
  }
  return {
    register(id, options) { registry.set(id, options || {}); }, open, close,
    toggle(id) { if (stack.includes(id)) close(id); else open(id); },
    top() { return stack.at(-1); }, list() { return [...stack]; },
    outside(target) {
      const id = stack.at(-1); if (!id) return;
      const opts = registry.get(id);
      if (!opts.contains?.(target)) close(id);
    },
    escape() { const id = stack.at(-1); if (id) close(id); return !!id; },
  };
}

let historyArmed = false;
function armHistory() {
  if (typeof window === 'undefined' || !window.history?.pushState || historyArmed) return;
  window.history.pushState({ ...window.history.state, gamePanel: true }, '');
  historyArmed = true;
}
export const panels = createPanelManager(armHistory);
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', e => panels.outside(e.target), true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && panels.escape()) { e.preventDefault(); e.stopImmediatePropagation?.(); } }, true);
  window.addEventListener('popstate', () => { historyArmed = false; if (panels.escape() && panels.top()) armHistory(); });
}
