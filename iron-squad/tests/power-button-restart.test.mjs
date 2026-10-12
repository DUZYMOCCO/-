import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const m of ['startGameLoop','showToast'])game[m]=noop;game.setupUI();game.activeSlotId=saveSlots.create('POWER BUTTON TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();
const saved=structuredClone(game.saveGame()),overlay=document.getElementById('pad-power-cd-overlay'),text=document.getElementById('pad-power-cd-text'),btn=document.getElementById('btn-pad-power');
// Counting down shows the remaining time.
game.player.powerAtkCooldown=2.3;game.update(1/30);assert.equal(overlay.classList.contains('hidden'),false);assert.equal(text.textContent,'2.3');
// Restarting from a save (e.g. after death) replaces the commander with cooldown 0: the overlay must clear.
game.resumeSavedGame(structuredClone(saved));game.closeStrategyModal?.();assert.equal(game.player.powerAtkCooldown,0);
game.update(1/30);assert.equal(overlay.classList.contains('hidden'),true,'no frozen countdown after a restart');assert.equal(btn.classList.contains('ready'),true);
// And a normal countdown still finishes.
game.player.powerAtkCooldown=.05;for(let i=0;i<5;i++)game.update(1/30);assert.equal(game.player.powerAtkCooldown,0);assert.equal(overlay.classList.contains('hidden'),true);
console.log('PASS: power-attack button countdown, restart from a save clears a frozen overlay, normal expiry');dom.window.close();
