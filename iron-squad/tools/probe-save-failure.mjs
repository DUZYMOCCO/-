import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});
g.setupUI();g.activeSlotId=saveSlots.create('SAVE PROBE').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
for(const phase of [1,10,50]){
  g.phase=phase;
  for(let tick=0;tick<100;tick++)g.update(.1);
  g.player.hp=g.player.maxHp;g.player.isDown=false;g.player.dead=false;g.player.x=g.player.y=79360;
  try{
    const snapshot=g.saveGame({persist:false}),json=JSON.stringify(snapshot);
    console.log(JSON.stringify({phase,chars:json.length,largest:Object.entries(snapshot).map(([key,value])=>[key,JSON.stringify(value)?.length||0]).sort((a,b)=>b[1]-a[1]).slice(0,6),checkpoint:g.saveCheckpoint(),newSlot:g.saveCheckpoint({newSlot:true})}));
  }catch(error){console.log('PROBE FAILURE',phase,error.stack);}
}
const snapshot=g.saveGame({persist:false}),key='game_studio_ironsquad_save_slots_v1',set=window.Storage.prototype.setItem;
const slots=Array.from({length:4},(_,i)=>({id:`capacity-${i}`,name:`保持${i}`,rulesVersion:5,savedAt:1,state:'active',data:snapshot,...(i<3?{checkpoint:{place:'本陣',savedAt:1,data:snapshot}}:{})}));
localStorage.setItem(key,JSON.stringify(slots));g.activeSlotId=slots.at(-1).id;
window.Storage.prototype.setItem=function(k,v){let bytes=2*(String(k).length+String(v).length);for(let i=0;i<this.length;i++){const other=this.key(i);if(other!==k)bytes+=2*(other.length+this.getItem(other).length);}if(bytes>5*1024*1024)throw new window.DOMException('Capacity fixture','QuotaExceededError');return set.call(this,k,v);};
console.log(JSON.stringify({case:'5MiB-four-slots',bytesBefore:localStorage.getItem(key).length*2,normal:!!g.saveGame(),overwrite:g.saveCheckpoint(),newSlot:g.saveCheckpoint({newSlot:true}),slotsAfter:saveSlots.list().length}));
window.Storage.prototype.setItem=set;dom.window.close();
