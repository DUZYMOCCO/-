import { storage } from '../../storage.js';

const KEY = 'ironsquad_save_slots_v1';
const RULES_VERSION = 2;
export const saveSlots = {
  list() {
    const existing = storage.get(KEY, null);
    if (storage.get('ironsquad_rules_version', 0) === RULES_VERSION && Array.isArray(existing)
        && existing.every(slot=>slot.rulesVersion===RULES_VERSION)) return existing;
    // The user authorized retiring all saves from the previous combat rules.
    const current = (Array.isArray(existing) ? existing : []).filter(slot => slot.rulesVersion === RULES_VERSION);
    if (!storage.set(KEY, current)) throw new Error('セーブ一覧を保存できません。ブラウザの空き容量を確認してください。');
    if (!storage.remove('ironsquad_save_data_v3') || !storage.remove('ironsquad_veterans_backup')) {
      throw new Error('旧セーブを整理できませんでした。');
    }
    if (!storage.set('ironsquad_rules_version', RULES_VERSION)) throw new Error('保存形式を更新できませんでした。');
    return current;
  },
  create(name) {
    const slots = this.list();
    const slot = {id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`,
      name: name.trim().slice(0,40) || `遠征 ${slots.length + 1}`, rulesVersion: RULES_VERSION,
      savedAt: Date.now(), state: 'active', data: null, veterans: [], reserveSurvivors: []};
    if (!storage.set(KEY, [...slots, slot])) throw new Error('新しい遠征を保存できませんでした。');
    return slot;
  },
  get(id) { return this.list().find(slot => slot.id === id); },
  update(id, values) {
    const slots = this.list(), slot = slots.find(item => item.id === id);
    if (!slot) return false;
    Object.assign(slot, values, {savedAt: Date.now()});
    return storage.set(KEY, slots);
  },
  delete(id) {
    const slots = this.list().filter(item => item.id !== id);
    return storage.set(KEY, slots);
  }
};
