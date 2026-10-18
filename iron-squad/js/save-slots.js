import { storage } from '../../common/js/storage.js';
import {encodeSaveList,unpackSave,SAVE_ENCODING} from './save-codec.js?v=261';

const KEY = 'ironsquad_save_slots_v1';
const LOCAL_KEY=`game_studio_${KEY}`;
// v7.0.34: a separate "saves have existed here" mark. If the save key reads as missing while the mark exists, the read
// failed (iOS home-screen apps can return null right after launch) - never write over it and never report it as a fresh start.
const MARK_KEY='game_studio_ironsquad_save_seen_v1';
const UNREADABLE_MESSAGE='保存を読み込めない可能性があるため、中止しました。再読み込みしてからやり直してください。';
let seenInSession=false;
function hasMark(){
  if(seenInSession)return true;
  try{return localStorage.getItem(MARK_KEY)!==null;}catch{return false;}
}
function setMark(){
  seenInSession=true;
  try{if(localStorage.getItem(MARK_KEY)===null)localStorage.setItem(MARK_KEY,'1');}catch{}
}
function probeSlots(){
  let raw;
  try{raw=localStorage.getItem(LOCAL_KEY);}catch{return 'unreadable';}
  if(raw!==null)return 'ok';
  return hasMark()?'unreadable':'empty';
}
function unreadableError(){const error=new Error(UNREADABLE_MESSAGE);error.code='SAVE_UNREADABLE';return error;}
function refuseUnreadable(){const error=unreadableError();saveSlots.lastWriteError=error;return error;}
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
    if(slots.length)setMark();
  }
  // Each caller gets detached objects, as before. Cache only the decoded string.
  return JSON.parse(cachedJson);
}
function writeSlots(slots){
  // Safety net for every write path: a missing key with the mark present is an unreadable store, not an empty one.
  if(probeSlots()==='unreadable'){refuseUnreadable();return false;}
  revision++; // A manual write supersedes any older background snapshot, even if it fails.
  if(pendingJob){pendingJob.resolve({status:'superseded'});pendingJob=null;}
  try{
    const json=JSON.stringify(slots);
    const raw=encodeSaveList(json);
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;cachedIds=new Set(slots.map(slot=>slot.id));
    if(slots.length)setMark();
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
    if(localStorage.getItem(LOCAL_KEY)===null)throw unreadableError();
    localStorage.setItem(LOCAL_KEY,raw);cachedRaw=raw;cachedJson=json;saveSlots.lastWriteError=null;setMark();
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
  /** 'ok' (key present), 'empty' (never had saves here) or 'unreadable' (key missing although saves existed before). */
  probe:probeSlots,
  /** Re-read a few times (about 1 s) before trusting an empty read when saves are known to have existed. */
  async settle({tries=6,interval=160}={}){
    for(let i=0;i<tries&&probeSlots()==='unreadable';i++)await new Promise(resolve=>setTimeout(resolve,interval));
    return probeSlots();
  },
  /** Deliberate escape hatch after the player confirmed that the saves are really gone. */
  forgetSaveMark(){
    seenInSession=false;cachedRaw=undefined;cachedJson=undefined;cachedIds=new Set();
    try{localStorage.removeItem(MARK_KEY);}catch{}
  },
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
    if (probeSlots() === 'unreadable') throw refuseUnreadable();
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
    if (probeSlots() === 'unreadable') {refuseUnreadable();return false;}
    const slots = this.list(), slot = slots.find(item => item.id === id);
    if (!slot) return false;
    Object.assign(slot, values, {savedAt: Date.now()});
    return writeSlots(slots);
  },
  updateBackground(id,values){
    try{
      if(probeSlots()==='unreadable'){refuseUnreadable();return Promise.resolve({status:'failed'});}
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
    if (probeSlots() === 'unreadable') throw refuseUnreadable();
    const slots = this.list().filter(item => item.id !== id);
    return writeSlots(slots);
  }
};
