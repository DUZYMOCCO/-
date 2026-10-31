// 文脈メニュー（長押し／右クリック）。対象に対して有効な行動一覧を表示する。

import { panels } from './panels.js';
import { availableActions, actionLabel } from '../sim/actions.js';

export function createContextMenu(options) {
  const onAction = options.onAction || (() => {});
  const container = document.createElement('div');
  container.className = 'hud-context-menu';
  container.style.display = 'none';
  document.body.appendChild(container);

  let currentTarget = null;
  let currentActors = [];

  function open(world, actorIds, target, screenX, screenY) {
    currentTarget = target;
    currentActors = Array.isArray(actorIds) ? [...actorIds] : [actorIds];
    const actions = availableActions(world, actorIds, target);
    if (!actions || actions.length === 0) {
      close();
      return false;
    }

    container.innerHTML = '';
    const dismiss = document.createElement('button');
    dismiss.type = 'button'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', '閉じる');
    dismiss.addEventListener('click', close); container.appendChild(dismiss);
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-context-item';
      btn.textContent = actionLabel(act);
      btn.dataset.action = act;
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        const actionToRun = act;
        const tgt = currentTarget;
        const acts = [...currentActors];
        close();
        onAction(actionToRun, tgt, acts);
      });
      container.appendChild(btn);
    }

    panels.open('context');
    container.style.display = 'flex';

    // 画面外にはみ出さないよう初期配置
    const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
    const approxW = 120;
    const approxH = 100;
    const initX = Math.max(10, Math.min(winW - approxW - 10, screenX));
    const initY = Math.max(10, Math.min(winH - approxH - 10, screenY));
    container.style.left = initX + 'px';
    container.style.top = initY + 'px';
    container.style.visibility = 'visible';

    // 画面外にはみ出さないよう実寸で座標を微調整
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const w = rect.width || approxW;
        const h = rect.height || approxH;
        const curWinW = typeof window !== 'undefined' ? window.innerWidth : winW;
        const curWinH = typeof window !== 'undefined' ? window.innerHeight : winH;
        const x = Math.max(10, Math.min(curWinW - w - 10, screenX));
        const y = Math.max(10, Math.min(curWinH - h - 10, screenY));
        container.style.left = x + 'px';
        container.style.top = y + 'px';
      });
    }

    return true;
  }

  panels.register('context', { contains: target => container.contains(target), close: () => { container.style.display = 'none'; currentTarget = null; currentActors = []; } });
  function close() {
    panels.close('context');
    container.style.display = 'none';
    currentTarget = null;
    currentActors = [];
  }

  function isOpen() {
    return container.style.display !== 'none';
  }

  window.addEventListener('pointerdown', (ev) => {
    if (isOpen() && !container.contains(ev.target)) {
      close();
    }
  });

  function dispose() {
    if (container.parentNode) container.parentNode.removeChild(container);
  }

  return { open, close, isOpen, dispose };
}
