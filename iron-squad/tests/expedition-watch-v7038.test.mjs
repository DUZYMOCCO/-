// v7.0.38: "遠征を見る" — watch a platoon expedition. Only the commander and his own guards are parked; everyone else fights as usual.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const sp=await import('../js/hero-spectate.js');const inv=await import('../js/invasion-rules.js');const ir=await import('../js/instance-rules.js');
const {isSoldierOnExpedition,expeditionCombatUnits}=await import('../js/expedition-rules.js');
const g=Object.create(IronSquadGame);const toasts=[];Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:m=>toasts.push(String(m))});
g.setupUI();g.activeSlotId=saveSlots.create('EXPEDITION WATCH TEST ONLY').id;g.startFreshGame(false);g.career.status='enlisted';g.closeStrategyModal();g.inBattle=true;g.monsters=[];g.updateSpawns=noop;g.phaseTimer=1e6;g.phaseDuration=1e6;
g.squad=g.squad.slice(0,48);for(let i=0;i<g.squad.length;i++)Object.assign(g.squad[i],{isPersonalGuard:false,platoonId:i%3});
const guards=[0,1,2].map(i=>Object.assign(g.createNewSoldier(null,{classKey:'HEAVY'}),{id:'guard-'+i,name:'guard-'+i,isPersonalGuard:true,platoonId:0,x:g.player.x+20*i,y:g.player.y}));g.squad.push(...guards);
g.initPlatoons();g.reserves=[];g.restTimer=0;g.monsters=[];
const run=(sec)=>{for(let k=0;k<Math.round(sec*10);k++)g.update(.1);};
const hpOf=u=>u.hp;
// ---------- not startable without an expedition: a reason, and a queue ----------
{
  const a=sp.expeditionAvailability(g);assert.equal(a.ok,false);assert.equal(a.code,'no-expedition');assert.ok(a.reason.includes('遠征'));
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES),false);assert.equal(g.spectating,null);
  assert.equal(sp.queueExpeditionSpectate(g,SOLDIER_CLASSES),true);assert.equal(g.spectateQueued.mode,'expedition');assert.ok(sp.expeditionStatusLine(g).includes('見学待ち'));
  run(1);assert.equal(g.spectating,null,'still waiting');
  assert.equal(g.startPlatoonExpedition(0,2),true,'platoon 0 leaves');run(1);
  assert.ok(g.spectating?.expedition,'the queue starts the watch once an expedition is out');assert.equal(g.spectateQueued,null);assert.equal(g.spectating.pid,0);
  sp.endSpectate(g);assert.equal(g.spectating,null);
}
// ---------- start: who is parked, who is not ----------
const p0=g.platoons[0];const members0=sp.expeditionUnits(g,0);assert.ok(members0.length>=3);
const mainHome=g.squad.find(s=>!s.isPersonalGuard&&(s.platoonId||0)%3===1);assert.ok(mainHome&&!isSoldierOnExpedition(p0,mainHome));
{
  g.player.x=g.player.x+500;g.player.y=g.player.y+400; // the commander may be anywhere in the field
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,0),true);
  const s=g.spectating;assert.equal(s.expedition,true);assert.equal(s.field,false);assert.ok(members0.includes(s.viewer),'camera follows a soldier of the platoon');
  assert.ok(Math.abs(g.camera.x-s.viewer.x)<1);
  // freeze set: guards only
  const act=ir.activeSquad(g);for(const gd of guards)assert.ok(!act.includes(gd),'guards are parked');
  assert.ok(act.includes(mainHome),'the main body at camp keeps acting');for(const m of members0)assert.ok(act.includes(m),'the expedition keeps acting');
  assert.ok(!ir.spectateLiveUnits(g).some(u=>guards.includes(u)));assert.ok(ir.spectateLiveUnits(g).includes(mainHome));
  assert.equal(ir.spectateParked(g,guards[0]),true);assert.equal(ir.spectateParked(g,mainHome),false);assert.equal(ir.spectateParked(g,members0[0]),false);
  // damage: the commander and the guards cannot be hurt; the camp's main body and the expedition can
  const before=[g.player,...guards].map(hpOf);for(const t of [g.player,...guards])g.damageTarget(t,500,{environmental:true});assert.deepEqual([g.player,...guards].map(hpOf),before,'commander and guards untouchable');
  const hb=hpOf(mainHome);g.damageTarget(mainHome,30,{environmental:true});assert.ok(hpOf(mainHome)<hb,'main body at camp takes damage as usual');
  const hm=hpOf(members0[0]);g.damageTarget(members0[0],30,{environmental:true});assert.ok(hpOf(members0[0])<hm,'expedition soldiers take damage as usual');
  // raids are held while watching
  assert.equal(inv.raidHeldBySpectate(g),true);
  // HUD: summary, no tabs with one platoon away, recall button present
  const box=document.getElementById('hero-spectate');assert.ok(box,'HUD mounted');assert.ok(box.querySelector('.spectate-recall'));assert.equal(box.querySelector('.spectate-platoons').hidden,true,'one platoon: no tabs');
  assert.ok(box.querySelector('.spectate-badge').textContent.includes('遠征'));assert.ok(box.querySelector('.spectate-castle').textContent.includes('敵'),box.querySelector('.spectate-castle').textContent);assert.ok(box.querySelector('.spectate-party').textContent.includes('生存'));
  assert.ok(box.querySelectorAll('.spectate-chip').length===members0.length);
  // ordinary frames: still watching, the commander stays put
  const px=g.player.x,py=g.player.y;g.joystick.active=true;g.joystick.dirX=1;run(1);g.joystick.active=false;assert.equal(g.player.x,px);assert.equal(g.player.y,py);assert.ok(g.spectating);
  // speed
  assert.equal(sp.cycleSpectateSpeed(g),2);assert.equal(sp.spectateSteps(g,.016),2);sp.cycleSpectateSpeed(g);sp.cycleSpectateSpeed(g);assert.equal(g.spectating.speed,1);
}
// ---------- platoon tabs and the two-tap recall ----------
{
  assert.equal(g.startPlatoonExpedition(1,2),true);g.update(.1);sp.updateSpectateHud(g,true);
  const box=document.getElementById('hero-spectate');assert.equal(box.querySelector('.spectate-platoons').hidden,false,'two platoons out: tabs shown');assert.equal(box.querySelectorAll('.spectate-platoon').length,2);
  const m1=sp.expeditionUnits(g,1);assert.ok(sp.selectExpeditionPlatoon(g,1));assert.equal(g.spectating.pid,1);assert.ok(m1.includes(g.spectating.viewer),'camera switched to the other platoon');
  assert.ok(sp.spectateTargets(g).every(t=>m1.includes(t.unit)));assert.ok(sp.selectExpeditionPlatoon(g,0));assert.equal(g.spectating.pid,0);
  // recall: first tap only arms
  const btn=document.querySelector('.spectate-recall');assert.equal(btn.disabled,false);
  assert.equal(sp.recallWatchedExpedition(g),'armed');assert.equal(g.platoons[0].mission,'expedition','one tap does not recall');sp.updateSpectateHud(g,true);assert.ok(btn.textContent.includes('もう一度'));
  // let the confirmation lapse: it disarms
  g.spectating.recallArmedUntil=Date.now()-1;sp.updateSpectateHud(g,true);assert.ok(!btn.textContent.includes('もう一度'));assert.equal(sp.recallWatchedExpedition(g),'armed','needs two taps again');
  assert.equal(sp.recallWatchedExpedition(g),'recalled');assert.equal(g.platoons[0].mission,'returning');assert.equal(g.platoons[0].returnReason,'manual');assert.equal(g.platoons[1].mission,'expedition','the other platoon is untouched');
  sp.updateSpectateHud(g,true);assert.equal(btn.disabled,true,'already returning');assert.equal(g.spectating.ended,undefined,'the watch goes on while they walk home');
  // arrival home: an outcome, the camera holds, the watch does not end by itself
  const viewerBefore=g.spectating.viewer;g.completePlatoonExpeditionReturn(g.platoons[0]);run(.5);
  assert.equal(g.spectating.ended,'returned');assert.ok(toasts.some(t=>t.includes('遠征隊が本陣へ帰ってきました')),toasts.join('|'));
  const cam=sp.spectateCameraTarget(g);assert.ok(cam&&Number.isFinite(cam.x));const cx=cam.x;run(2);assert.equal(sp.spectateCameraTarget(g).x,cx,'camera held');assert.equal(sp.spectateSpeed(g),1);
  assert.equal(sp.selectExpeditionPlatoon(g,1),false,'no switching after the outcome');
  assert.ok(g.spectating,'still watching until the user ends it');
  // a wiped expedition is an outcome too (fresh watch of platoon 1)
  sp.endSpectate(g);assert.equal(g.spectating,null);
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,1),true);
  for(const m of sp.expeditionUnits(g,1)){m.dead=true;m.hp=0;}
  g.update(.1);assert.equal(g.spectating?.ended,'fallen');assert.ok(toasts.some(t=>t.includes('遠征隊は全滅しました')));
  g.spectating.recallArmedUntil=0;assert.equal(sp.recallWatchedExpedition(g),false,'no recall after the outcome');
}
// ---------- ending: grace only for the guards; raid grace; not saved ----------
{
  sp.endSpectate(g);assert.equal(g.spectating,null);assert.equal(g._spectateGraceScope,'guards');assert.ok(g._spectateGrace>0);assert.ok(Math.abs(g._spectateRaidGrace-15)<1e-9,'15 s raid grace follows');
  const live=g.squad.find(s=>!s.isPersonalGuard&&!s.dead&&(s.platoonId||0)%3===2);const gb=hpOf(guards[0]),lb=hpOf(live);
  g.damageTarget(guards[0],30,{environmental:true});assert.equal(hpOf(guards[0]),gb,'the guards get the 4 s after coming back');g.damageTarget(live,30,{environmental:true});assert.ok(hpOf(live)<lb,'everyone else is not protected');
  assert.ok(!JSON.stringify(g.saveGame({immediate:true})).includes('"expedition":true'),'watch state is not saved');
  g._spectateGrace=0;g._spectateRaidGrace=0;
}
// ---------- cannot start / ends when it does not hold ----------
{
  g.spectateQueued=null;const town=g.dungeons.find(d=>d.id==='royal_castle_town');g.enterDungeon(town);assert.equal(sp.expeditionAvailability(g,0).ok,false);g.exitDungeon();
  assert.equal(g.startPlatoonExpedition(2,1),true);g.player.hp=g.player.maxHp;g.player.isDown=false;g.restTimer=8;assert.equal(sp.expeditionAvailability(g,2).code,'rest');g.restTimer=0;
  g.baseRaidActive=true;assert.equal(sp.expeditionAvailability(g,2).code,'raid');g.baseRaidActive=false;
  g.player.isDown=true;assert.equal(sp.expeditionAvailability(g,2).code,'down');g.player.isDown=false;
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,0),false,'platoon 0 is home: a reason, nothing starts');
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,2),true);g.player.isDown=true;g.update(.1);assert.equal(g.spectating,null,'a downed commander ends the watch');g.player.isDown=false;g.player.hp=g.player.maxHp;g.player.dead=false;
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,2),true);g.baseRaidActive=true;g.update(.1);assert.equal(g.spectating,null,'a raid in progress ends it (safety)');g.baseRaidActive=false;
  // the hero entry still reports an active spectate of another kind
  assert.equal(sp.startExpeditionSpectate(g,SOLDIER_CLASSES,2),true);assert.equal(sp.spectateAvailability(g).code,'active');sp.endSpectate(g);
}
// ---------- entry point in the expedition panel ----------
{
  g.renderExpeditionPanel();const btn=document.querySelector('.btn-expedition-watch');assert.ok(btn,'the panel has 遠征を見る');assert.ok(btn.textContent.includes('遠征を見る'));
  assert.ok(document.querySelector('.btn-expedition-watch-one'),'an away platoon has its own 見る button');
  btn.click();assert.ok(g.spectating?.expedition,'pressing it starts the watch');sp.endSpectate(g);
  for(const p of g.platoons)if(p.mission!=='idle'){g.completePlatoonExpeditionReturn(p);}
  g.renderExpeditionPanel();document.querySelector('.btn-expedition-watch').click();assert.equal(g.spectateQueued?.mode,'expedition','nothing out: it waits');
  g.renderExpeditionPanel();assert.ok(document.querySelector('.btn-expedition-watch').textContent.includes('取消'));document.querySelector('.btn-expedition-watch').click();assert.equal(g.spectateQueued,null,'cancelled');
}
console.log('expedition watch v7.0.38: only the commander and his guards parked, tabs, two-tap recall, outcomes, queue, entry button passed');
