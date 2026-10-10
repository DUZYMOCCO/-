import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {joinLimitedEncounter,prepareLimitedEncounter} from '../js/limited-allies.js';
import {drawFieldMob,drawFieldSoldier} from '../js/visuals.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const css=document.createElement('style');css.textContent=['style','game-ui','iron-squad','iron-squad-interface'].map(name=>readFileSync(['style','game-ui'].includes(name)?`css/${name}.css`:`iron-squad/css/${name}.css`,'utf8')).join('\n');document.head.append(css);
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,SOLDIER_PHYS_DMG_MULT}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('SCOUT OWN SQUAD TEST ONLY').id;game.startFreshGame(false);
const base=structuredClone(game.saveGame());
function field(){game.resumeSavedGame(structuredClone(base));game.closeStrategyModal();Object.assign(game,{rankIndex:4,squad:[],reserves:[],monsters:[],outposts:[],merchants:[],civilians:[],projectiles:[],dropsOnField:[],currentQuest:null,restTimer:0,_monsterGrid:null,_hazardClock:0,updateSpawns:noop,worldTerrain:{tiles:new Map()}});Object.assign(game.player,{x:83000,y:83000,atkCooldown:100});game.recalcPlayerStats();game.player.hp=game.player.maxHp;game.player.dodge=game.player.crit=0;game.camera={x:83000,y:83000};game.joystick={active:false,dirX:0,dirY:0};}
const village=game.dungeons.find(d=>d.id==='ninja_village');
const rosterSoldier=()=>game.createNewSoldier(null,{classKey:'HEAVY'});
// --- 2) soldier detail scout button ---
field();game.rankIndex=4;const max=Math.min(2,game.limitedGuardLimit());
const main=rosterSoldier(),res=rosterSoldier(),own=rosterSoldier();own.isPersonalGuard=true;
game.squad=[main,own];game.reserves=[res];
const btnFor=id=>{game.openSoldierDetail(id);return document.querySelector('#soldier-detail-host .btn-scout-own-squad');};
assert.ok(btnFor(main.id)&&!btnFor(main.id).disabled,'main-force soldier gets the button');
assert.ok(btnFor(res.id)&&!btnFor(res.id).disabled,'reserve soldier gets the button');
assert.equal(btnFor(own.id),null,'own platoon soldier has no button');
btnFor(res.id).click();
assert.ok(game.squad.includes(res)&&res.isPersonalGuard&&!game.reserves.includes(res),'reserve moved into own platoon with room');
// full platoon opens the swap popup
const guardsNow=game.listPersonalGuardsAlive().length,limit=game.limitedGuardLimit();
for(let i=guardsNow;i<limit;i++){const g=rosterSoldier();g.isPersonalGuard=true;game.squad.push(g);}
const res2=rosterSoldier();game.reserves=[res2];btnFor(res2.id).click();
assert.ok(document.getElementById('personal-swap-popup'),'full platoon shows the existing swap popup');
document.querySelector('#personal-swap-popup .personal-swap-pick').click();
assert.ok(res2.isPersonalGuard&&game.squad.includes(res2));
// disabled with reason in an instance
game.enterDungeon(village);const dm=rosterSoldier();game.squad.push(dm);game.reserves.push(res);res.isPersonalGuard=false;
const dis=btnFor(res.id);assert.ok(dis&&dis.disabled&&document.querySelector('.soldier-scout-reason'));game.closeSoldierDetail();game.exitDungeon();
// --- 3) rescued limited ally follows ---
for(const full of [false,true]){
  field();game.squad=full?Array.from({length:game.limitedGuardLimit()},()=>{const s=rosterSoldier();s.isPersonalGuard=true;return s;}):[];game.reserves=[];
  game.enterDungeon(village);const enc=prepareLimitedEncounter(game,village);Object.assign(game.player,{x:enc.x,y:enc.y});
  assert.equal(joinLimitedEncounter(game,enc.id),true);
  const check=g=>{const a=g.squad.find(s=>s.id===enc.unit.id);assert.ok(a&&a.isPersonalGuard,'in own platoon');assert.ok(!g.reserves.some(s=>s.id===a.id),'not in reserve');return a;};
  const a=check(game);assert.ok(Math.hypot(a.x-game.player.x,a.y-game.player.y)<80,'next to player');assert.equal(!!a.overflowGuard,full);
  const sv=structuredClone(game.saveGame());game.resumeSavedGame(structuredClone(sv));check(game);
  game.exitDungeon();check(game);game.syncPersonalGuardSlots(null,game.limitedGuardLimit());check(game);
}
console.log('ok');
