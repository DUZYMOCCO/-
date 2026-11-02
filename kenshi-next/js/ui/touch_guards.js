// 文字入力欄では標準の選択・コピー・コンテキストメニューを残す。
export function isEditableTarget(target) {
  const element = target && (target.nodeType === 1 ? target : target.parentElement);
  if (!element) return false;
  return !!(element.closest('input, textarea, select') || element.isContentEditable);
}

export function guardNativeMenu(event) {
  const element = event.target && (event.target.nodeType === 1 ? event.target : event.target.parentElement);
  if (event.type === 'dragstart' && element?.closest('[draggable="true"].inventory-grid-item, [draggable="true"].inventory-body-slot, [draggable="true"].inventory-slot-card, [draggable="true"].inventory-overflow-item')) return;
  if (!isEditableTarget(event.target)) event.preventDefault();
}

export function installTouchGuards(doc) {
  doc.addEventListener('contextmenu', guardNativeMenu);
  doc.addEventListener('dragstart', guardNativeMenu);
}
