// v7.2.5: 忍者の系列だけ斜め後ろ姿（頭巾の結び目・目元だけのぞく横顔・背中の縫い目と帯の結び）。他の兵種・隊長は従来どおり。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js?v=338');
const {drawFieldSoldier,ninjaBackView}=await import('../js/visuals.js?v=339');
const {drawSoldierHead}=await import('../js/soldier-appearance.js?v=339');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('NINJA BACK TEST ONLY').id;game.startFreshGame(false);
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const recorder=()=>{const log=[];const o={log,measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),canvas:{}};return new Proxy(o,{get:(t,k)=>k in t?t[k]:(...a)=>{log.push([k,...a].join(','));},set:(t,k,v)=>{t[k]=v;return true;}});};
const ninja=id=>{const s=createLimitedAlly(game,'NINJA','t');s.soldierClass=id;game.recalcSoldierStats(s);return Object.assign(s,{x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0});};
for(const id of ['NINJA','NINJA_CHUNIN','NINJA_JONIN','NINJA_KASHIRA'])eq(ninjaBackView(ninja(id)),true,id);
for(const key of ['LIGHT','HEAVY','ARCHER'])eq(ninjaBackView(game.createNewSoldier(null,{classKey:key})),false,key);
eq(ninjaBackView(createLimitedAlly(game,'BEAST_CAT','t')),false,'beastfolk unchanged');eq(ninjaBackView({...ninja('NINJA'),isPlayer:true}),false,'commander unchanged');
// Head: the back view shows the knot and just the eye corner; the front mask is not painted.
{const s=ninja('NINJA_CHUNIN'),back=recorder(),front=recorder();
 drawSoldierHead(back,s,{silhouette:true,back:true});drawSoldierHead(front,s,{silhouette:true});
 ok(back.log.includes('fillRect,3.2,-1.2,2.3,1.3'),'eye corner at the front edge');ok(back.log.some(l=>l==='lineTo,-10.2,2.2'),'knot tails behind');
 ok(!back.log.includes('fillRect,-5.4,1,10.8,4.2'),'no front mask from behind');ok(front.log.includes('fillRect,-5.4,1,10.8,4.2'),'front view unchanged elsewhere');}
// Body: the field sprite carries the back seam and the sash knot for ninjas only; facing left mirrors the whole figure.
const field=s=>{const c=recorder();drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[s.soldierClass]||{},'#a59a76',false);return c.log;};
for(const face of [0,Math.PI]){const log=field(Object.assign(ninja('NINJA_KASHIRA'),{facingAngle:face}));ok(log.includes('fillRect,-6,-11.5,12,2.2'),'sash at the back');ok(log.includes('lineTo,-1.2,-11'),'back seam');
 if(face)ok(log.includes('scale,-1,1'),'left-facing mirrors');}
{const human=Object.assign(game.createNewSoldier(null,{classKey:'LIGHT'}),{x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0});const log=field(human);ok(!log.includes('fillRect,-6,-11.5,12,2.2'),'human light unchanged');}
console.log(`PASS ninja-back-view-v725 (${checks} checks)`);
