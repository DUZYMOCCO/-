import { storage } from '../../common/js/storage.js';
import {encodeSaveList,unpackSave,SAVE_ENCODING} from './save-codec.js?v=260';

const KEY = 'ironsquad_save_slots_v1';
const LOCAL_KEY=`game_studio_${KEY}`;
let cachedRaw,cachedJson;
let cachedIds=new Set();
let revision=0,sequence=0,worker=null,workerDisabled=false;
const jobs=new Map();
function readSlots(){
  const raw=localStorage.getItem(LOCAL_KEY);if(raw===null)return null;
  if(raw!==cachedRaw){
    const stored=JSON.parse(raw),json=stored?.encoding===SAVE_ENCODING?unpackSave(stored):raw;
    const slots=JSON.parse(json);if(!Array.isArray(slots))throw new Error('Invalid save slot list');
    cachedIds=new Set(slots.map(slot=>slot.id));
    cachedRaw=raw;cachedJson=json;
  }
  // Each caller gets detached objects, as before. Cache only the decoded string.
  return JSON.parse(cachedJson);
}
function writeSlots(slots){
  revision++; // A manual write supersedes any older background snapshot, even if it fails.
  try{
    const json=JSON.stringify(slots);
    const raw=encodeSaveList(json);
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;cachedIds=new Set(slots.map(slot=>slot.id));
    saveSlots.lastWriteError=null;
    return true;
  }catch(error){saveSlots.lastWriteError=error;console.warn('Save slot write failed:',error);return false;}
}
function completeJob(job,raw,error,json){
  jobs.delete(job.id);
  try{
    if(job.revision!==revision||localStorage.getItem(LOCAL_KEY)!==job.base){job.resolve({status:'superseded'});return;}
    if(error)throw new Error(error);
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;saveSlots.lastWriteError=null;
    job.resolve({status:'saved'});
  }catch(failure){saveSlots.lastWriteError=failure;console.warn('Background save failed:',failure);job.resolve({status:'failed'});}
}
function backgroundWorker(){
  if(workerDisabled||typeof Worker!=='function')return null;
  if(worker)return worker;
  try{
    worker=new Worker(new URL('./save-worker.js?v=260',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{const job=jobs.get(data.id);if(job)completeJob(job,data.raw,data.error,data.json);};
    worker.onerror=()=>{
      workerDisabled=true;worker?.terminate();worker=null;
      for(const job of [...jobs.values()]){
        // Preserve saving in browsers where workers are blocked; only the current job may commit.
        if(job.revision!==revision){completeJob(job,null);continue;}
        try{
          const stored=JSON.parse(job.base),slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
          const slot=slots.find(item=>item.id===job.slotId);if(!slot)throw new Error('Save slot missing');
          Object.assign(slot,job.values,{savedAt:job.savedAt});
          const json=JSON.stringify(slots);completeJob(job,encodeSaveList(json),null,json);
        }catch(error){completeJob(job,null,String(error));}
      }
    };
    return worker;
  }catch{workerDisabled=true;return null;}
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
  updateBackground(id,values){
    try{
      const target=backgroundWorker();
      if(!target)return Promise.resolve({status:this.update(id,values)?'saved':'failed'});
      if(localStorage.getItem(LOCAL_KEY)!==cachedRaw)this.list();
      if(!cachedIds.has(id))return Promise.resolve({status:'missing'});
      const base=localStorage.getItem(LOCAL_KEY),ticket=++revision,jobId=++sequence;
      return new Promise(resolve=>{
        const job={id:jobId,slotId:id,values,savedAt:Date.now(),base,revision:ticket,resolve};jobs.set(jobId,job);
        // postMessage clones the snapshot before gameplay resumes. Parsing/merging/JSON/packing run off-thread.
        try{target.postMessage({id:jobId,slotId:id,values,savedAt:job.savedAt,base});}catch(error){completeJob(job,null,String(error));}
      });
    }catch(error){saveSlots.lastWriteError=error;return Promise.resolve({status:'failed'});}
  },
  delete(id) {
    const slots = this.list().filter(item => item.id !== id);
    return writeSlots(slots);
  }
};
