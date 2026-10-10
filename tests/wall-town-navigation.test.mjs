import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {drawFortification,wallGeometry,gatePositions,resolveWallMovement,townExitReached} from '../js/games/iron-squad/gate-rules.js?v=139';
import {attachCivilian,updateCivilians,syncDragged,releaseWounded,markSoldierDown,attachWounded} from '../js/games/iron-squad/casualty-rules.js?v=139';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},fakeCtx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>fakeCtx;
let tick=1000;const originalPerformance=globalThis.performance;Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>tick}});
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame),center=WORLD_SIZE/2;
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx:fakeCtx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[m]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('WALL/TOWN TEST ONLY').id;game.startFreshGame(false);
const initial=structuredClone(game.saveGame()),fresh=()=>{game.resumeSavedGame(structuredClone(initial));game.closeStrategyModal();game.monsters=[];game.civilians=[];game.restTimer=0;game.currentQuest=null;game.updateSpawns=noop;};
// Reproduce carrying a civilian into town while their trailing body is outside the 70m entrance reception.
fresh();const town=game.dungeons.find(d=>d.kind==='town');const civ={id:'town-rope-offset',kind:'elder',name:'老人',x:town.entrance.x+145,y:town.entrance.y};game.civilians=[civ];Object.assign(game.player,{x:town.entrance.x+110,y:town.entrance.y});assert.equal(attachCivilian(game,game.player,civ),true);
game.enterDungeon(town);assert.equal(civ.rescued,true);assert.equal(civ.carrierId,undefined);assert.equal(game.container.dataset.location,'town');assert.match(document.getElementById('field-zone-badge').textContent,/探索中/);
const rewards=game.rescueRewardIds.length;game.exitDungeon();assert.equal(game.container.dataset.location,'field');assert.equal(game.rescueRewardIds.length,rewards);
// A previously carried patient already inside town is delivered to the displayed reception, not world coordinates.
game.enterDungeon(town);const local={id:'old-town-carry',kind:'woman',name:'女性',x:700,y:town.height/2,carrierId:'player'};game.civilians=[local];game.player.x=700;updateCivilians(game,0);assert.equal(local.rescued,undefined);game.player.x=230;syncDragged(game,1);updateCivilians(game,0);assert.equal(local.rescued,true);assert.equal(local.rescueStationId,`town-aid-${town.id}`);
// Releasing a carried local civilian allows reacquisition and saving/restoring without town-local coordinates leaking.
const pending={id:'town-save-carry',kind:'child',name:'子供',x:700,y:town.height/2,carrierId:'player'};game.civilians=[pending];game.player.x=700;syncDragged(game,1);assert.equal(pending.rescueSpace,town.id);releaseWounded(game,game.player);game.player.x=800;assert.equal(attachCivilian(game,game.player,pending),false);game.player.x=pending.x;assert.equal(attachCivilian(game,game.player,pending),true);
game.saveGame();const save=structuredClone(saveSlots.get(game.activeSlotId).data);assert.ok(Math.hypot(save.civilians[0].x-save.player.x,save.civilians[0].y-save.player.y)<50);assert.equal(save.civilians[0].rescueSpace,undefined);assert.equal(pending.rescueSpace,town.id,'save conversion leaves live objects alone');
game.resumeSavedGame(save);assert.equal(game.civilians[0].carrierId,'player');assert.ok(Math.hypot(game.civilians[0].x-game.player.x,game.civilians[0].y-game.player.y)<50);
// Town entry accepts a downed normal soldier even beyond the field entrance reception.
fresh();const soldier=game.squad[0];Object.assign(game.player,{x:town.entrance.x+110,y:town.entrance.y});Object.assign(soldier,{x:game.player.x+35,y:game.player.y});markSoldierDown(game,soldier);attachWounded(game,game.player,soldier);game.enterDungeon(town);assert.equal(soldier.isDown,false);assert.equal(soldier.hp,soldier.maxHp);assert.equal(soldier.carrierId,undefined);
// HUD ticks in a quiet town instead of depending on a kill or an action to refresh.
game.squad=[];game.monsters=[];game.gateGuards=[];game.currentQuest=null;game.phaseTimer=90;game.updateStatsUI();const oldTimer=document.getElementById('phase-timer-display').textContent;tick+=1000;game.update(1);assert.notEqual(document.getElementById('phase-timer-display').textContent,oldTimer);assert.equal(game.container.dataset.location,'town');
assert.equal(document.getElementById('merchant-prompt-banner').parentElement.id,'virtual-gamepad');assert.equal(document.getElementById('btn-open-merchant').textContent,'取引と回復');assert.equal(document.querySelector('.field-interactions').parentElement.id,'battle-menu-nearby');const style=document.createElement('style');style.textContent=readFileSync('css/iron-squad-interface.css','utf8');document.head.append(style);assert.equal(window.getComputedStyle(document.querySelector('.field-status')).display,'none','town mode clears status panels from the upper field');
// Every opening still permits movement and every solid wall still blocks it.
for(const mode of ['field','town']){
  const fixture={currentDungeon:mode==='town'?{kind:'town',width:1600,height:1000}:null},w=wallGeometry(fixture);
  for(const g of gatePositions(w)){
    const vertical=['east','west'].includes(g.side),u={x:g.x+(vertical?20:0),y:g.y+(vertical?0:20),radius:10};fixture.player=u;
    assert.equal(resolveWallMovement(fixture,u,g.x-(vertical?20:0),g.y-(vertical?0:20)),false,`${mode} ${g.side} opening remains passable`);
    if(mode==='town'){if(g.side==='west')u.x=w.left-8;else if(g.side==='east')u.x=w.right+8;else if(g.side==='north')u.y=w.top-8;else u.y=w.bottom+8;assert.equal(townExitReached(fixture),true);}
  }
  const u={x:w.left+20,y:w.top+90};fixture.player=u;assert.equal(resolveWallMovement(fixture,u,w.left-20,u.y),true);
}
const {createCanvas,GlobalFonts}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','sans-serif');
const canvas=createCanvas(800,800),ctx=canvas.getContext('2d'),scene={currentDungeon:null,nation:{level:0},camera:{x:center,y:center},width:800,height:800,zoom:1};
ctx.fillStyle='#294835';ctx.fillRect(0,0,800,800);ctx.translate(400-center,400-center);drawFortification(ctx,scene);
const wallPixel=ctx.getImageData(300,85,1,1).data,ground=ctx.getImageData(300,50,1,1).data;assert.ok(wallPixel[0]+wallPixel[1]+wallPixel[2]>ground[0]+ground[1]+ground[2]+80,'stone has contrast against the field');
const wallColors=new Set();for(let x=120;x<290;x++){const p=ctx.getImageData(x,89,1,1).data;wallColors.add(`${p[0]},${p[1]},${p[2]}`);}assert.ok(wallColors.size>=4,'masonry uses visible mortar and several stone tones');
const first=canvas.toBuffer('image/png');const random=Math.random;try{Math.random=()=>{throw new Error('visual renderer must not consume gameplay RNG');};drawFortification(ctx,scene);}finally{Math.random=random;}
// Native drawing of all four town exits and bright developed walls; no context state leaks.
scene.currentDungeon={kind:'town',width:1600,height:1000};scene.camera={x:800,y:52};scene.width=800;scene.height=600;ctx.resetTransform();ctx.clearRect(0,0,800,800);ctx.fillStyle='#332c20';ctx.fillRect(0,0,800,800);ctx.translate(-400,150);const originalTransform=ctx.getTransform();drawFortification(ctx,scene);assert.equal(ctx.getTransform().e,originalTransform.e);assert.equal(ctx.getTransform().f,originalTransform.f);assert.ok(ctx.getImageData(350,250,100,25).data.some((v,i)=>i%4===3&&v>0),'north exit label sits inside town below the gate');
if(process.env.WALL_REVIEW_DIR){mkdirSync(process.env.WALL_REVIEW_DIR,{recursive:true});writeFileSync(resolve(process.env.WALL_REVIEW_DIR,'stone-headquarters.png'),first);writeFileSync(resolve(process.env.WALL_REVIEW_DIR,'stone-town-north.png'),canvas.toBuffer('image/png'));}
console.log('PASS: reproduced trailing civilian/town reception/save/release, soldier arrival revive, quiet HUD refresh and bottom merchant action, all gates/collisions/exits unchanged, native masonry contrast/mortar/town north label/state');Object.defineProperty(globalThis,'performance',{configurable:true,value:originalPerformance});dom.window.close();
