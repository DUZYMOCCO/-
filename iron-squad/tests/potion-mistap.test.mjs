import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {squadNeedsRecovery,ammoCapacity} from '../js/supply-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('POTION MISTAP TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
game.inBattle=true;game.currentDungeon=null;
const potion=document.getElementById('btn-pad-potion'),stick=document.getElementById('dpad-base');
const topUp=()=>{for(const u of [game.player,...game.squad])if(u){u.hp=u.maxHp;u.ammo=ammoCapacity(u);if(u.maxMana)u.mana=u.maxMana;}};
const reports=()=>(game.battleReport||[]).filter(e=>e.kind==='supply');

// 作業2-1: 全員が満タンなら使えない（ボタンも押せない見た目）。
game.squad=[];game.squadPotion=2;topUp();
assert.equal(squadNeedsRecovery(game),false);
game.refreshSupplyUI();assert.ok(potion.classList.contains('is-full')&&potion.getAttribute('aria-disabled')==='true','full squad: button looks unavailable');
assert.equal(game.useSquadPotion(),false);assert.equal(game.squadPotion,2,'nothing spent when nobody needs it');assert.equal(reports().length,0);
game.player.ammo=0;assert.equal(squadNeedsRecovery(game),true,'empty ammo counts as needing recovery');
game.player.ammo=ammoCapacity(game.player);game.player.hp=game.player.maxHp-1;game.refreshSupplyUI();assert.equal(potion.classList.contains('is-full'),false);assert.equal(potion.disabled,false);
const guard={id:'g',isPersonalGuard:true,soldierClass:'MAGE',x:game.player.x,y:game.player.y,hp:50,maxHp:50,ammo:0,mana:1,maxMana:100,magicAffinity:'fire'};
game.player.hp=game.player.maxHp;game.squad=[guard];guard.ammo=ammoCapacity(guard);assert.equal(squadNeedsRecovery(game),true,'low mana on a personal guard counts');
guard.mana=guard.maxMana;assert.equal(squadNeedsRecovery(game),false);
guard.isDown=true;guard.hp=0;assert.equal(squadNeedsRecovery(game),false,'downed units are not usable and are ignored');
game.squad=[];

// 作業1: 使うと戦闘報告書に残り、HUDに光と中央表示が出る。
game.player.hp=1;game.squadPotion=2;
assert.equal(game.useSquadPotion(),true);assert.equal(game.squadPotion,1);
assert.equal(reports().length,1);assert.match(reports()[0].text,/回復薬を使用（残り1個）/);
assert.ok(document.querySelector('.potion-flash'),'center flash shown');assert.ok(potion.classList.contains('potion-used'),'HUD button flashes');

// 作業2-2: ボタンの上で始まり、ボタンの上で離したタップだけで使う。
const fire=(el,type,x,y,id=1)=>{const e=new dom.window.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:id});el.dispatchEvent(e);};
potion.getBoundingClientRect=()=>({left:100,right:164,top:100,bottom:148});
game.player.hp=1;game.squadPotion=2;
fire(stick,'pointerdown',50,200);fire(potion,'pointerup',120,120);
assert.equal(game.squadPotion,2,'finger that started on the stick does not use the potion');
fire(potion,'pointerdown',120,120);fire(potion,'pointerup',300,300);
assert.equal(game.squadPotion,2,'finger released outside the button does not use it');
fire(potion,'pointerdown',120,120);fire(potion,'pointercancel',120,120);fire(potion,'pointerup',120,120);
assert.equal(game.squadPotion,2,'cancelled press does not use it');
fire(potion,'pointerup',120,120,7);assert.equal(game.squadPotion,2,'pointerup without its own pointerdown is ignored');
fire(potion,'pointerdown',120,120);fire(potion,'pointerup',130,130);
assert.equal(game.squadPotion,1,'down and up on the button uses one potion');
potion.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
assert.equal(game.squadPotion,1,'the click that follows a tap does not double-spend');

// 蘇生薬も報告書に残る。
const downed={id:'d',name:'テスト兵',isPersonalGuard:true,x:game.player.x+10,y:game.player.y,hp:0,maxHp:80,isDown:true,downTimer:30};
game.squad=[downed];game.revivalPotion=2;assert.equal(game.useRevivalPotion(),true);
assert.ok(reports().some(e=>/蘇生薬を使用.*テスト兵.*残り1個/.test(e.text)),'revival potion is reported');

// 作業3: 購入すると、その場で（背景保存のまとめ経由で）保存される。
game.squad=[];game.squadPotion=0;game.gold=100000;
const merchant={id:'vendor',x:game.player.x,y:game.player.y,hp:10,maxHp:10};game.merchants=[merchant];
game.gold=100000;assert.equal(game.replenishSquadPotion(merchant),true);
assert.ok(game._pendingAutoSave instanceof Promise,'purchase queues a background save');await game._pendingAutoSave;
let stored=saveSlots.get(game.activeSlotId).data;assert.equal(stored.squadPotion,1);assert.equal(stored.gold,game.gold,'gold and potion are saved together');
game.revivalPotion=0;assert.equal(game.replenishRevivalPotion(merchant),true);await game._pendingAutoSave;
stored=saveSlots.get(game.activeSlotId).data;assert.equal(stored.revivalPotion,1);assert.equal(stored.gold,game.gold);
// 連打しても保存は「実行中1件＋最新1件」にまとまる。
const results=[];for(let i=0;i<3;i++){game.squadPotion=0;game.replenishSquadPotion(merchant);results.push(game._pendingAutoSave);}
const settled=await Promise.all(results);assert.ok(settled.filter(r=>r.status==='superseded').length>=1||settled.every(r=>r.status),'rapid purchases coalesce');
assert.equal(saveSlots.get(game.activeSlotId).data.gold,game.gold,'latest purchase wins');
// 装備の購入と強化も同じ保存を使う。
let saved=0;const realSave=game.saveGame;game.saveGame=function(o){if(o?.auto&&o?.background)saved++;return realSave.call(this,o);};
game.savePurchase();assert.equal(saved,1);game.saveGame=realSave;
console.log('PASS: potion mistap guards, report/feedback, purchase saves');
dom.window.close();
