// Touch events let the browser scroll normally until the long press succeeds.
export function bindTouchDrag(node, { start, move, end, cancel = () => {}, pending = () => {}, pendingEnd = () => {} }) {
  let gesture = null, suppressClick = false;
  const clear = () => { if (gesture?.timer) clearTimeout(gesture.timer); gesture = null; };
  node.addEventListener('touchstart', (event) => {
    if (gesture || event.touches.length !== 1) return;
    const t = event.changedTouches[0];
    gesture = { id: t.identifier, x: t.clientX, y: t.clientY, active: false };
    pending();
    gesture.timer = setTimeout(() => {
      if (!gesture) return;
      if (node.isConnected === false) { clear(); pendingEnd(); return; }
      gesture.active = true; gesture.timer = null; suppressClick = true;
      start(gesture.x, gesture.y);
    }, 350);
  }, { passive: true });
  node.addEventListener('touchmove', (event) => {
    if (!gesture) return;
    const t = Array.from(event.changedTouches).find((v) => v.identifier === gesture.id);
    if (!t) return;
    if (!gesture.active) {
      if (Math.hypot(t.clientX - gesture.x, t.clientY - gesture.y) > 8 || event.touches.length > 1) { clear(); pendingEnd(); }
      return;
    }
    if (event.cancelable) event.preventDefault();
    move(t.clientX, t.clientY);
  }, { passive: false });
  const finish = (event, cancelled) => {
    if (!gesture) return;
    const t = Array.from(event.changedTouches).find((v) => v.identifier === gesture.id);
    if (!t) return;
    const active = gesture.active;
    clear();
    if (active) {
      if (event.cancelable) event.preventDefault();
      if (cancelled) cancel(); else end(t.clientX, t.clientY);
      setTimeout(() => { suppressClick = false; }, 700);
    } else pendingEnd();
  };
  node.addEventListener('touchend', (e) => finish(e, false), { passive: false });
  node.addEventListener('touchcancel', (e) => finish(e, true), { passive: false });
  node.addEventListener('click', (event) => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
  }, true);
  node.addEventListener('contextmenu', (event) => { if (gesture) event.preventDefault(); });
}

export function touchGhost(node, x, y) {
  const ghost = node.cloneNode(true);
  ghost.classList.add('inventory-touch-ghost');
  ghost.removeAttribute('id');
  document.body.append(ghost);
  const blockGesture = (event) => { if (event.cancelable) event.preventDefault(); };
  document.addEventListener('touchmove', blockGesture, { passive: false });
  document.addEventListener('touchstart', blockGesture, { passive: false });
  const move = (left, top) => { ghost.style.left = `${left}px`; ghost.style.top = `${top}px`; };
  move(x, y);
  return { move, remove: () => { document.removeEventListener('touchmove', blockGesture); document.removeEventListener('touchstart', blockGesture); ghost.remove(); } };
}
