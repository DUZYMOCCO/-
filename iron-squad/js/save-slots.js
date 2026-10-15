import { storage } from '../../common/js/storage.js';
import {encodeSaveList,unpackSave,SAVE_ENCODING} from './save-codec.js?v=261';

const KEY = 'ironsquad_save_slots_v1';
const LOCAL_KEY=`game_studio_${KEY}`;
let cachedRaw,cachedJson;
let cachedIds=new Set();
let revision=0,sequence=0,worker=null,workerDisabled=false,workerFailures=0;
let pendingJob=null;
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
  if(pendingJob){pendingJob.resolve({status:'superseded'});pendingJob=null;}
  try{
    const json=JSON.stringify(slots);
    const raw=encodeSaveList(json);
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;cachedIds=new Set(slots.map(slot=>slot.id));
    saveSlots.lastWriteError=null;
    return true;
  }catch(error){saveSlots.lastWriteError=error;console.warn('Save slot write failed:',error);return false;}
}
function disableWorker(){
  workerDisabled=true;worker?.terminate();worker=null;
}
function drainPending(){
  if(jobs.size||!pendingJob)return;
  const job=pendingJob;pendingJob=null;
  try{
    // Read again at dispatch, but never rebase a request over a newer manual/external write.
    const base=localStorage.getItem(LOCAL_KEY);
    if(job.revision!==revision||base!==job.base){job.resolve({status:'superseded'});return;}
    job.base=base;sendJob(job);
  }catch(error){completeJob(job,null,String(error),null,false);}
}
function sendJob(job){
  jobs.set(job.id,job);
  const target=backgroundWorker();
  if(!target){retryJob(job);drainPending();return;}
  try{target.postMessage({id:job.id,slotId:job.slotId,values:job.values,savedAt:job.savedAt,base:job.base});}
  catch(error){completeJob(job,null,String(error));drainPending();}
}
function retryJob(job){
  try{
    const stored=JSON.parse(job.base),slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
    const slot=slots.find(item=>item.id===job.slotId);if(!slot)throw new Error('Save slot missing');
    Object.assign(slot,job.values,{savedAt:job.savedAt});
    const json=JSON.stringify(slots);completeJob(job,encodeSaveList(json),null,json,false);
  }catch(error){completeJob(job,null,String(error),null,false);}
}
function completeJob(job,raw,error,json,retry=true){
  jobs.delete(job.id);
  try{
    if(job.revision!==revision||localStorage.getItem(LOCAL_KEY)!==job.base){job.resolve({status:'superseded'});return;}
    if(error){
      if(retry){
        if(++workerFailures>=2)disableWorker();
        retryJob(job);return;
      }
      throw new Error(error);
    }
    if(retry)workerFailures=0;
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;saveSlots.lastWriteError=null;
    job.resolve({status:'saved'});
  }catch(failure){saveSlots.lastWriteError=failure;console.warn('Background save failed:',failure);job.resolve({status:'failed'});}
}
// The opt-in diagnostic installs this hook; normal saves keep the original function.
export function profileSaveCompletions(wrap){
  const original=completeJob,timed=wrap(original);completeJob=timed;
  return ()=>{if(completeJob===timed)completeJob=original;};
}
function backgroundWorker(){
  if(workerDisabled||typeof Worker!=='function')return null;
  if(worker)return worker;
  try{
    worker=new Worker(new URL('./save-worker.js?v=261',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{const job=jobs.get(data.id);if(job)completeJob(job,data.raw,data.error,data.json);drainPending();};
    worker.onerror=()=>{
      disableWorker();
      for(const job of [...jobs.values()]){
        // Preserve saving in browsers where workers are blocked; only the current job may commit.
        if(job.revision!==revision||localStorage.getItem(LOCAL_KEY)!==job.base){completeJob(job,null);continue;}
        retryJob(job);
      }
      drainPending();
    };
    return worker;
  }catch{workerDisabled=true;return null;}
}
export const RULES_VERSION = 5;
// Ask the browser (iOS home screen apps included) not to evict this origin's saves under storage pressure.
export function requestPersistentSaves(){
  try{const s=globalThis.navigator?.storage;if(s?.persist)s.persisted().then(done=>done||s.persist()).catch(()=>{});}catch{}
}
export const saveSlots = {
  lastWriteError:null,
  list() {
    const existing = readSlots();
    // Nothing to read (fresh install, or a storage read that came back empty): never overwrite it with an empty list.
    if (existing === null) return [];
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
      if(localStorage.getItem(LOCAL_KEY)!==cachedRaw)this.list();
      if(!cachedIds.has(id))return Promise.resolve({status:'missing'});
      const snapshot=structuredClone(values),base=localStorage.getItem(LOCAL_KEY),ticket=++revision,jobId=++sequence;
      return new Promise(resolve=>{
        const job={id:jobId,slotId:id,values:snapshot,savedAt:Date.now(),base,revision:ticket,resolve};
        // Retain only one running clone and the newest waiting snapshot, including across slots.
        if(jobs.size){if(pendingJob)pendingJob.resolve({status:'superseded'});pendingJob=job;}
        else sendJob(job);
      });
    }catch(error){saveSlots.lastWriteError=error;return Promise.resolve({status:'failed'});}
  },
  delete(id) {
    const slots = this.list().filter(item => item.id !== id);
    return writeSlots(slots);
  }
};
