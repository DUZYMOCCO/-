import { storage } from '../../common/js/storage.js';
import {packSave,unpackSave,SAVE_ENCODING} from './save-codec.js?v=259';

const KEY = 'ironsquad_save_slots_v1';
const LOCAL_KEY=`game_studio_${KEY}`;
let cachedRaw,cachedJson;
function readSlots(){
  const raw=localStorage.getItem(LOCAL_KEY);if(raw===null)return null;
  if(raw!==cachedRaw){
    const stored=JSON.parse(raw),json=stored?.encoding===SAVE_ENCODING?unpackSave(stored):raw;
    if(!Array.isArray(JSON.parse(json)))throw new Error('Invalid save slot list');
    cachedRaw=raw;cachedJson=json;
  }
  // Each caller gets detached objects, as before. Cache only the decoded string.
  return JSON.parse(cachedJson);
}
function writeSlots(slots){
  try{
    const json=JSON.stringify(slots);
    const packed=json.length>=128_000?JSON.stringify(packSave(json)):null;
    const raw=packed&&packed.length<json.length?packed:json;
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;
    saveSlots.lastWriteError=null;
    return true;
  }catch(error){saveSlots.lastWriteError=error;console.warn('Save slot write failed:',error);return false;}
}
export const RULES_VERSION = 5;
export const saveSlots = {
  lastWriteError:null,
  list() {
    const existing = readSlots();
    if (storage.get('ironsquad_rules_version', 0) === RULES_VERSION && Array.isArray(existing)
        && existing.every(slot=>slot.rulesVersion===RULES_VERSION)) return existing;
    // The user authorized retiring all old saves for the traveler/tavern rules.
    const current = (Array.isArray(existing) ? existing : []).filter(slot => slot.rulesVersion === RULES_VERSION);
    if (!writeSlots(current)) throw new Error('セーブ一覧を保存できません。ブラウザの空き容量を確認してください。');
    if (!storage.remove('ironsquad_save_data_v3') || !storage.remove('ironsquad_veterans_backup')) {
      throw new Error('旧セーブを整理できませんでした。');
    }
    if (!storage.set('ironsquad_rules_version', RULES_VERSION)) throw new Error('保存形式を更新できませんでした。');
    return current;
  },
  create(name, initialValues = {}) {
    const slots = this.list();
    const slot = {id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`,
      name: name.trim().slice(0,40) || `遠征 ${slots.length + 1}`, rulesVersion: RULES_VERSION,
      savedAt: Date.now(), state: 'active', data: initialValues.data ?? null,
      veterans: initialValues.veterans ?? [], reserveSurvivors: initialValues.reserveSurvivors ?? []};
    if (initialValues.checkpoint) slot.checkpoint = initialValues.checkpoint;
    if (initialValues.career) slot.career = initialValues.career;
    if (!writeSlots([...slots, slot])) throw new Error('新しい遠征を保存できませんでした。');
    return slot;
  },
  get(id) { return this.list().find(slot => slot.id === id); },
  update(id, values) {
    const slots = this.list(), slot = slots.find(item => item.id === id);
    if (!slot) return false;
    Object.assign(slot, values, {savedAt: Date.now()});
    return writeSlots(slots);
  },
  delete(id) {
    const slots = this.list().filter(item => item.id !== id);
    return writeSlots(slots);
  }
};
