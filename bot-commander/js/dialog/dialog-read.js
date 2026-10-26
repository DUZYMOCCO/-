// 会話の既読判定と記録（DOM なし・テスト用）。
export const DIALOG_READ_KEY = 'game_studio_bc-dialog-read';

function getStore(store) {
  if (store !== undefined) return store;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function getRaw(store, key) {
  const s = getStore(store);
  if (!s) return null;
  try {
    if (typeof s.getItem === 'function') return s.getItem(key);
    if (typeof s.get === 'function') return s.get(key);
    return s[key] ?? null;
  } catch {
    return null;
  }
}

function setRaw(store, key, val) {
  const s = getStore(store);
  if (!s) return false;
  try {
    if (typeof s.setItem === 'function') { s.setItem(key, val); return true; }
    if (typeof s.set === 'function') { s.set(key, val); return true; }
    s[key] = val;
    return true;
  } catch {
    return false;
  }
}

export function readList(store) {
  const raw = getRaw(store, DIALOG_READ_KEY);
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function isRead(id, store) {
  if (!id) return false;
  return readList(store).includes(id);
}

export function markRead(id, store) {
  if (!id) return false;
  const list = readList(store);
  if (!list.includes(id)) {
    list.push(id);
    return setRaw(store, DIALOG_READ_KEY, JSON.stringify(list));
  }
  return true;
}
