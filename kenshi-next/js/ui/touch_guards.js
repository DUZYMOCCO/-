// 文字入力欄では標準の選択・コピー・コンテキストメニューを残す。
export function isEditableTarget(target) {
  const element = target && (target.nodeType === 1 ? target : target.parentElement);
  if (!element) return false;
  return !!(element.closest('input, textarea, select') || element.isContentEditable);
}

export function guardNativeMenu(event) {
  if (!isEditableTarget(event.target)) event.preventDefault();
}

export function installTouchGuards(doc) {
  doc.addEventListener('contextmenu', guardNativeMenu);
  doc.addEventListener('dragstart', guardNativeMenu);
}
