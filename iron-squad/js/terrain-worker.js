import {WorldTerrain} from './world.js?v=281';
// Ground generation uses procedural Canvas drawing only; scenery stays on the main thread.
globalThis.document={createElement:()=>new OffscreenCanvas(1,1)};
const terrain=new WorldTerrain();
self.onmessage=({data})=>{
  try{
    terrain.rasterSize=data.size;const tile=terrain.generate(data.tx,data.ty);
    const bitmap=tile.canvas.transferToImageBitmap();tile.canvas.width=tile.canvas.height=1;
    self.postMessage({...data,bitmap,objects:tile.objects,camps:tile.camps},[bitmap]);
  }catch(error){self.postMessage({...data,error:String(error?.message||error)});}
};
