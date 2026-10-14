import {encodeSaveList,unpackSave,SAVE_ENCODING} from './save-codec.js?v=261';
self.onmessage=({data})=>{
  try{
    const stored=JSON.parse(data.base),slots=stored?.encoding===SAVE_ENCODING?JSON.parse(unpackSave(stored)):stored;
    const slot=slots.find(item=>item.id===data.slotId);if(!slot)throw new Error('Save slot missing');
    Object.assign(slot,data.values,{savedAt:data.savedAt});
    const json=JSON.stringify(slots);self.postMessage({id:data.id,raw:encodeSaveList(json),json});
  }
  catch(error){self.postMessage({id:data.id,error:String(error?.message||error)});}
};
