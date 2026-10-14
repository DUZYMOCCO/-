import assert from 'node:assert/strict';
import {test} from 'node:test';
import {REST_DURATION,advanceRest} from '../js/phase-rules.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js?v=262');
const {encodeSaveList,unpackSave,SAVE_ENCODING}=await import('../js/save-codec.js?v=261');

test('eight maintenance ticks do not save; rest boundaries and daylight save the final consistent state in background',async()=>{
  const game=Object.create(IronSquadGame);
  for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI'])game[method]=()=>{};
  game.activeSlotId=saveSlots.create('休憩保存').id;game.startFreshGame(false);
  const soldier=game.squad[0];soldier.gold=10000;
  let worker;
  globalThis.Worker=class{
    constructor(){worker=this;this.queue=[];}
    postMessage(message){this.queue.push(structuredClone(message));}
    finish(){const message=this.queue.shift(),stored=JSON.parse(message.base),slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
      Object.assign(slots.find(s=>s.id===message.slotId),message.values,{savedAt:message.savedAt});const json=JSON.stringify(slots);this.onmessage({data:{id:message.id,raw:encodeSaveList(json),json}});}
  };
  const modes=[],original=game.saveGame;game.saveGame=function(options){modes.push(options);return original.call(this,options);};
  game.completePhase();assert.deepEqual(modes,[{background:true}]);const atStart=localStorage.getItem('game_studio_ironsquad_save_slots_v1'),before=game.restReport.count;
  for(let i=0;i<REST_DURATION-1;i++)advanceRest(game,1);
  assert.equal(game.restTimer,1);assert.equal(modes.length,1,'maintenance makes no save request');assert.equal(localStorage.getItem('game_studio_ironsquad_save_slots_v1'),atStart);
  advanceRest(game,1);assert.equal(game.restTimer,0);assert.ok(game.restReport.count>before);assert.deepEqual(modes,[{background:true},{background:true}]);
  game.worldTime=700;game.changeTimePeriod();assert.deepEqual(modes.at(-1),{background:true});
  const pending=game._pendingAutoSave;while(worker.queue.length)worker.finish();assert.deepEqual(await pending,{status:'saved'});
  const saved=saveSlots.get(game.activeSlotId).data;assert.equal(saved.restTimer,0);assert.equal(saved.restReport.count,game.restReport.count);assert.equal(saved.restReport.spent,game.restReport.spent);assert.equal(saved.squad[0].gold,soldier.gold);
  assert.deepEqual(saved.squad[0].equipped,JSON.parse(JSON.stringify(soldier.equipped)),'money and the enhanced equipment come from the same final snapshot');
});
