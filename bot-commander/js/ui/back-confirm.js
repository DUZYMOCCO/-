// 「◀ 工房」の確認ダイアログの状態（DOM なし・テスト用に分けてある）。
// open: 開く前の一時停止状態を覚えて止める。close: 覚えた状態に戻す。
export function createBackConfirm() {
  return { open: false, prevPaused: false };
}
// inMission=false（結果画面など）のときは確認せず、そのまま戻ってよい → 'exit'
export function requestBack(c, { inMission, paused }) {
  if (!inMission) return 'exit';
  if (c.open) return 'none';
  c.open = true; c.prevPaused = !!paused;
  return 'open';
}
// 閉じたあとに使う一時停止状態を返す
export function cancelBack(c) {
  if (!c.open) return null;
  c.open = false;
  return c.prevPaused;
}
