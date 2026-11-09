// 筋肉探偵の試合用タッチ操作（左スティックと技ボタン）。
// PC キーボードは js/ui/input.js が担当する。ここではスマホのドラッグとボタンだけを用意する。
export function installMuscleControls(options = {}) {
  const root = options.root || document.body;
  const setInput = options.setInput || (() => {});
  const queueAction = options.queueAction || (() => {});
  const isActive = options.isActive || (() => false);
  const getYaw = options.getYaw || (() => 0);

  const layer = document.createElement('div');
  layer.className = 'muscle-controls';
  layer.innerHTML = `
    <div class="muscle-hint">WASD/方向キー: 移動　J: 投げ　U: パワーボム　K: 打撃　L: 関節　Shift: ダッシュ</div>
    <div class="muscle-stick" aria-label="移動スティック">
      <span class="muscle-nub"></span>
    </div>
    <div class="muscle-actions">
      <button type="button" data-action="grapple">投げ</button>
      <button type="button" data-action="powerbomb">パワーボム</button>
      <button type="button" data-action="strike">打撃</button>
      <button type="button" data-action="submission">関節</button>
    </div>
  `;
  root.appendChild(layer);

  const stick = layer.querySelector('.muscle-stick');
  const nub = layer.querySelector('.muscle-nub');
  let pointerId = null;

  const toWorld = (sx, sy) => {
    const yaw = Number(getYaw()) || 0;
    const len = Math.hypot(sx, sy) || 1;
    const nx = sx / len;
    const ny = sy / len;
    // 画面の右と上を世界方向へ変換する（input.js と同じ式）。
    return {
      x: nx * Math.cos(yaw) + ny * Math.sin(yaw),
      z: nx * -Math.sin(yaw) + ny * Math.cos(yaw),
    };
  };

  const setFromPoint = (clientX, clientY) => {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = Math.max(1, rect.width / 2);
    let dx = (clientX - cx) / radius;
    let dy = (clientY - cy) / radius;
    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }
    nub.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
    const world = toWorld(dx, dy);
    setInput({ ...world, run: false });
  };

  const clearStick = () => {
    pointerId = null;
    nub.style.transform = 'translate(0px, 0px)';
    setInput({ x: 0, z: 0, run: false });
  };

  stick.addEventListener('pointerdown', (event) => {
    if (!isActive()) return;
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    stick.setPointerCapture?.(event.pointerId);
    setFromPoint(event.clientX, event.clientY);
  });
  stick.addEventListener('pointermove', (event) => {
    if (!isActive() || pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setFromPoint(event.clientX, event.clientY);
  });
  stick.addEventListener('pointerup', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearStick();
  });
  stick.addEventListener('pointercancel', clearStick);
  stick.addEventListener('lostpointercapture', clearStick);

  for (const button of layer.querySelectorAll('[data-action]')) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isActive()) queueAction(button.dataset.action);
    });
  }

  return {
    sync() {
      layer.style.display = isActive() ? 'flex' : 'none';
    },
    dispose() {
      layer.remove();
    },
  };
}
