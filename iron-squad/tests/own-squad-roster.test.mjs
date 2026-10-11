import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
const {saveSlots}=await import('../js/save-slots.js');
game.setupUI();game.activeSlotId=saveSlots.create('OWN SQUAD ROSTER TEST ONLY').id;game.startFreshGame(false);
// new game, rank 0: platoon-mates are NOT own squad
assert.equal(game.rankIndex,0);
const alive=()=>[...game.squad,...game.reserves].filter(s=>!s.dead);
assert.ok(alive().length>1);
assert.equal(alive().filter(s=>game.isPersonalSquadSoldier(s)).length,0,'no own squad at start');
const ally=game.createNewSoldier(null,{classKey:'HEAVY'});ally.overflowGuard=true;ally.isPersonalGuard=true;game.squad.push(ally);
assert.equal(alive().filter(s=>game.isPersonalSquadSoldier(s)).length,1,'one rescued ally = 1');
// promoted with guards: count = guards only
game.rankIndex=3;
const g=game.squad.filter(s=>!s.dead&&!s.isPersonalGuard).slice(0,3);g.forEach(s=>{s.isPersonalGuard=true;});
assert.equal(alive().filter(s=>game.isPersonalSquadSoldier(s)).length,4);
assert.equal(game.isPersonalSquadSoldier({dead:true,isPersonalGuard:true}),false);
console.log('ok');
