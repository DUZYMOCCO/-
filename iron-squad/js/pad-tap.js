// 回復薬・蘇生薬ボタンの誤タップ対策: ボタンの上で押し始め、同じボタンの上で離したタップだけを「使う」とみなす。
// 移動スティックで始まった指は pointerdown がスティック側に届くので、ボタンの上に来ても反応しない。
const inside = (button, e) => {
  if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return e.target === button || button.contains?.(e.target);
  const r = button.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
};

export function bindPadTap(button, action) {
  if (!button) return;
  let downId = null, lastPointerAt = -Infinity;
  button.addEventListener('pointerdown', e => {
    e.stopPropagation();
    lastPointerAt = Date.now();
    downId = e.button > 0 ? null : e.pointerId;
  });
  button.addEventListener('pointerup', e => {
    e.stopPropagation();
    const started = downId === e.pointerId;
    downId = null;
    if (started && inside(button, e)) { e.preventDefault(); action(); }
  });
  button.addEventListener('pointercancel', () => { downId = null; });
  // タッチ・マウスのクリックは上の pointer 処理で済んでいる(直後のclickは無視)。pointer を伴わない click(キーボード操作など)だけ受ける。
  button.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    if (Date.now() - lastPointerAt > 1000) action();
  });
}
