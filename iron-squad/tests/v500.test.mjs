// v5.0.0: give-up button, BGM after restart, visible loot pull, own-squad ring.
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const {JSDOM}=await import('../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js');
const dom=new JSDOM('<div id="game"><div id="canvas-container"></div></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document});
const {resumeBGM,syncGiveUpUI,commanderGiveUpVisible}=await import('../js/commander-giveup.js');
const {IronSquadGame}=await import('../js/index.js');
const {sound:shared}=await import('../../common/js/audio.js?v=151');
const {saveSlots}=await import('../js/save-slots.js');
const {attractFieldDrops,FIELD_DROP_ATTRACT_RADIUS,FIELD_DROP_PICKUP_RADIUS}=await import('../js/field-drops.js');
const {drawOwnSquadRing,isOwnSquad}=await import('../js/own-squad-marker.js');

// --- BGM: fake sound object ---
const fake=()=>({wanted:false,isMuted:false,playing:false,unlocked:0,listener:null,
  setListener(f){this.listener=f;},startBGM(){this.wanted=true;this.playing=this.wanted&&!this.isMuted;},unlock(){this.unlocked++;}});
let s1=fake();resumeBGM(s1,{});assert.equal(s1.playing,true,'BGM restarted');assert.ok(s1.unlocked>0);
s1=fake();s1.isMuted=true;resumeBGM(s1,{});assert.equal(s1.playing,false,'stays off when muted');assert.equal(s1.unlocked,0);

// --- give-up button + restart-from-save path ---
const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
let loop=0,resumed=0,bgm=0;game.stopGameLoop=()=>{loop--;};game.startGameLoop=()=>{loop++;};
game.showToast=()=>{};game.setDialogState=()=>{};game.resetMovementInput=()=>{};
game.resumeSavedGame=()=>{resumed++;};
const slot=saveSlots.create('giveup');game.activeSlotId=slot.id;
saveSlots.update(slot.id,{state:'active',data:{player:{hp:50,isDown:false},phase:2}});
game.player={isDown:false,dead:false,hp:100};game.inBattle=true;
const origStart=shared.startBGM.bind(shared);shared.startBGM=()=>{bgm++;};
syncGiveUpUI(game);const btn=document.getElementById('btn-commander-giveup'),dlg=document.getElementById('commander-giveup-dialog');
assert.ok(btn.classList.contains('hidden'),'hidden when not down');
game.player.isDown=true;syncGiveUpUI(game);assert.ok(!btn.classList.contains('hidden'),'visible while down');
assert.equal(commanderGiveUpVisible(game),true);
btn.click();assert.ok(!dlg.classList.contains('hidden'));
dlg.querySelector('[data-giveup="no"]').click();assert.ok(dlg.classList.contains('hidden'));assert.equal(resumed,0,'cancel keeps waiting');
btn.click();dlg.querySelector('[data-giveup="yes"]').click();
assert.equal(resumed,1,'same continueFallenSave path resumes the save');assert.equal(bgm,1,'BGM restarted after restart-from-save');
game.player.isDown=false;syncGiveUpUI(game);assert.ok(btn.classList.contains('hidden'),'hidden when revived');
game.player.isDown=true;game.player.dead=true;syncGiveUpUI(game);assert.ok(btn.classList.contains('hidden'));
shared.startBGM=origStart;

// --- loot pull: visible, ease-in, dt independent ---
const R=FIELD_DROP_ATTRACT_RADIUS;
const fly=dt=>{const g={player:{x:0,y:0,hp:10},dropsOnField:[{x:R,y:0}]},d=g.dropsOnField[0];let t=0,first=null;
  while(Math.hypot(d.x,d.y)>=FIELD_DROP_PICKUP_RADIUS&&t<3){attractFieldDrops(g,dt);t+=dt;if(first===null)first=Math.hypot(d.x,d.y);}
  return {t,first};};
for(const dt of [1/30,1/60,1/144]){const r=fly(dt);assert.ok(r.t>=.4&&r.t<=.8,`travel ${r.t} for dt ${dt}`);assert.ok(r.first>R-5,'starts slow');}
assert.ok(Math.abs(fly(1/30).t-fly(1/144).t)<.05,'frame-rate independent');
const g2={player:{x:0,y:0,hp:10,isDown:true},dropsOnField:[{x:100,y:0}]};attractFieldDrops(g2,.3);assert.equal(g2.dropsOnField[0].x,100,'no pull while down');
// --- own-squad ring ---
const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{calls.push(k);},set:(o,k,v)=>{o[k]=v;return true;}});
assert.equal(drawOwnSquadRing(ctx,{x:1,y:1,isPersonalGuard:true}),true);assert.ok(calls.includes('ellipse'));
for(const other of [{x:1,y:1},{x:1,y:1,isGateGuard:true},{x:1,y:1,isPersonalGuard:true,dead:true}]){calls.length=0;assert.equal(drawOwnSquadRing(ctx,other),false);assert.equal(calls.length,0);}
assert.equal(isOwnSquad({overflowGuard:true}),true);
let lw=[];const c2=new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>{if(k==='lineWidth')lw.push(v);o[k]=v;return true;}});
drawOwnSquadRing(c2,{isPersonalGuard:true});drawOwnSquadRing(c2,{isPersonalGuard:true,isDown:true});assert.ok(lw[1]>lw[0],'thicker when down');
// drawSoldier routes through the ring only for own platoon
const sg=Object.create(IronSquadGame);sg.platoons=[{color:'#fff'}];sg.zoom=1;
const seen=[];const sctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{if(k==='ellipse')seen.push(a);return {addColorStop(){}};},set:(o,k,v)=>{o[k]=v;return true;}});
const mk=extra=>({x:0,y:0,soldierClass:'HEAVY',hp:10,maxHp:10,platoonId:0,vx:0,vy:0,facingAngle:0,...extra});
sg.drawSoldier(sctx,mk({isPersonalGuard:true}),0);const withRing=seen.filter(a=>a[2]===15).length;
seen.length=0;sg.drawSoldier(sctx,mk({}),0);const without=seen.filter(a=>a[2]===15).length;
assert.equal(withRing,1,'own platoon gets the ring');assert.equal(without,0,'others do not');
// --- names: given name only, own platoon gold/big, main army small/faint ---
const {givenName,queueSquadName,flushSquadNames}=await import('../js/squad-names.js');
assert.equal(givenName('レオン・ミラー'),'レオン');assert.equal(givenName('ハンゾー'),'ハンゾー');
const texts2=[];const tctx={font:'',fillStyle:'',measureText:t=>({width:t.length*6}),save(){},restore(){},fillRect(){},fillText(t,x,y){texts2.push({t,font:this.font,style:this.fillStyle,x,y});}};
const ng={player:{x:0,y:0},camera:{x:0,y:0},zoom:1,width:375,height:667};
const ownS={x:0,y:0,name:'エミリア・ブラント',isPersonalGuard:true},mainS={x:100,y:0,name:'クラウス・ケラー'},nearOwn={x:5,y:0,name:'ミハイル・ハートマン'};
for(const u of [ownS,mainS,nearOwn])queueSquadName(ng,u);
flushSquadNames(tctx,ng);
assert.deepEqual(texts2.map(t=>t.t).sort(),['エミリア','クラウス'].sort(),'given names only; overlapping lower-priority label dropped');
const own=texts2.find(t=>t.t==='エミリア'),main=texts2.find(t=>t.t==='クラウス');
assert.ok(parseFloat(own.font.match(/([0-9]+)px/)[1])>parseFloat(main.font.match(/([0-9]+)px/)[1]),'main army smaller');assert.notEqual(own.style,main.style);
// main-army names only near the commander, fading at the edge; own platoon always
const {mainNameAlpha,MAIN_NAME_RADIUS}=await import('../js/squad-names.js');
assert.equal(mainNameAlpha(0),1);assert.equal(mainNameAlpha(MAIN_NAME_RADIUS),0);assert.ok(mainNameAlpha(MAIN_NAME_RADIUS-40)>0&&mainNameAlpha(MAIN_NAME_RADIUS-40)<1);
texts2.length=0;for(const u of [{x:0,y:0,name:'ア・イ',isPersonalGuard:true},{x:0,y:100,name:"ウ・エ"},{x:MAIN_NAME_RADIUS+50,y:0,name:'オ・カ'},{x:MAIN_NAME_RADIUS+50,y:300,name:'キ・ク',isPersonalGuard:true}])queueSquadName(ng,u);
ng.camera={x:0,y:0};ng.width=4000;ng.height=4000;flushSquadNames(tctx,ng);
assert.deepEqual(texts2.map(t=>t.t).sort(),['ア','ウ','キ'].sort(),'far main-army hidden, own platoon always');

// --- downed soldier countdown: 0 never lingers; 死亡 for 2 s, then removed ---
const {updateWounded,downLabel,DYING_SECONDS,RESCUE_TIMEOUT}=await import('../js/casualty-rules.js');
const dg={player:{x:0,y:0,hp:100,maxHp:100,isDown:false},squad:[],civilians:[],gateGuards:[],merchants:[],leaveRemains(){},showToast(){}};
const w={id:'w1',name:'負傷',x:5000,y:5000,hp:0,maxHp:100,isDown:true,downTimer:0.3,downId:1,speed:100};dg.squad.push(w);
updateWounded(dg,0.2);assert.ok(downLabel(w).startsWith('救助'),'still counting');assert.ok(!/ 0秒/.test(downLabel(w)));
updateWounded(dg,0.2);assert.equal(w.dying,true);assert.equal(downLabel(w),'死亡');assert.equal(w.dead,undefined);
updateWounded(dg,1.5);assert.equal(downLabel(w),'死亡');assert.ok(!w.dead,'still labelled before 2 s');
updateWounded(dg,0.6);assert.equal(w.dead,true);assert.equal(w.isDown,false);
// carried at 0 does not hang; undefined timer never shows 0
const cw={id:'w2',name:'搬送',x:5000,y:5000,hp:0,maxHp:100,isDown:true,downTimer:0,downId:1,carrierId:'nobody'};dg.squad=[cw];
updateWounded(dg,0.1);updateWounded(dg,2.1);assert.equal(cw.dead,true,'a carried 0-second casualty does not hang');
const u2={isDown:true};assert.equal(downLabel(u2),'救助 '+RESCUE_TIMEOUT+'秒');assert.equal(downLabel({isDown:true,downTimer:0}),'救助 1秒');
console.log('v5.0.0 ok');
dom.window.close();
