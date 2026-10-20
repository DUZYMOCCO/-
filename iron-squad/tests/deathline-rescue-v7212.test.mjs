// v7.2.12: 衛生職の「死線救護」。敵の間近（240以内）か自身のHP35%以下で蘇生・搬送を始めると1回。ダウンと合算して直近5作戦期で10回なら死線覚醒。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const CR=await import('../js/casualty-rules.js?v=346'),PR=await import('../js/phase-rules.js?v=346');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const slotIds=[];
const setup=()=>{const game=Object.create(IronSquadGame);
 Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
 for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
 game.setupUI();const slot=saveSlots.create('DEATHLINE RESCUE TEST ONLY');slotIds.push(slot.id);game.activeSlotId=slot.id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
 const P=game.player;P.x+=3000;game.squad.forEach((s,i)=>{s.x=P.x+((i%8)-4)*25;s.y=P.y+60+Math.floor(i/8)*25;});
 const medic=game.squad.find(s=>s.soldierClass==='MEDIC'),light=game.squad.find(s=>s.soldierClass==='LIGHT'),victim=game.squad.find(s=>s.soldierClass==='HEAVY');
 medic.revivalSkillCooldownUntil=0;return {game,medic,light,victim};};
const enemyAt=(game,u,d)=>{game.monsters=[{id:'m1',x:u.x+d,y:u.y,hp:100,maxHp:100}];};
const downNear=(c,who)=>{c.victim.x=who.x+10;c.victim.y=who.y;CR.markSoldierDown(c.game,c.victim);};
const rescues=(u,g)=>PR.recentDeathlineRescueCount(u,g.phase);
// 1) 敵240以内で蘇生を始めると1回。処置を続けても増えない。
{const c=setup();enemyAt(c.game,c.medic,200);downNear(c,c.medic);for(let i=0;i<5;i++)CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),1,'revive started near an enemy counts once');
 // 同じダウンの処置をやり直しても増えない
 c.victim.rescueProgress=0;delete c.victim.rescueHealerId;CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),1,'restarting the same down does not count again');
 // 別の衛生職でも、同じダウンでは増えない
 const other=c.game.squad.find(s=>CR.isMedic(s)&&s!==c.medic);other.x=c.victim.x+5;other.y=c.victim.y;other.revivalSkillCooldownUntil=0;c.victim.rescueProgress=0;CR.treatWounded(c.game,other,c.victim,1/30);eq(rescues(other,c.game),0,'another medic on the same down does not count');
 // 新しいダウンなら再び数える
 c.victim.isDown=false;c.victim.hp=c.victim.maxHp;c.victim.rescueProgress=0;delete c.victim.rescueHealerId;downNear(c,c.medic);c.medic.revivalSkillCooldownUntil=0;CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),2,'a fresh down counts again');}
// 2) 敵が241で自身のHPが十分なら数えない／HP35%以下なら数える
{const c=setup();enemyAt(c.game,c.medic,241);downNear(c,c.medic);CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),0,'enemy at 241 with healthy medic: no count');}
{const c=setup();c.medic.hp=Math.floor(c.medic.maxHp*0.35);downNear(c,c.medic);CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),1,'medic at 35% HP counts without enemies');}
// 3) 搬送の開始：衛生職は数え、一般の兵は数えない
{const c=setup();enemyAt(c.game,c.medic,100);downNear(c,c.medic);ok(CR.attachWounded(c.game,c.medic,c.victim),'medic picks up');eq(rescues(c.medic,c.game),1,'transport started near an enemy counts');
 CR.dropCarriedWounded?.(c.game,c.medic);delete c.victim.carrierId;delete c.victim.releasedBy;CR.attachWounded(c.game,c.medic,c.victim);eq(rescues(c.medic,c.game),1,'drop and re-pick does not farm');}
{const c=setup();enemyAt(c.game,c.light,100);downNear(c,c.light);ok(CR.attachWounded(c.game,c.light,c.victim),'light picks up');eq(rescues(c.light,c.game),0,'non-medic carrying never counts');eq(c.light.deathlineDownHistory.filter(r=>r.rescues).length,0,'no rescue rows for other classes');}
// 4) 休息中は数えない
{const c=setup();c.game.restTimer=5;enemyAt(c.game,c.medic,100);downNear(c,c.medic);c.medic.revivalSkillCooldownUntil=0;CR.treatWounded(c.game,c.medic,c.victim,1/30);eq(rescues(c.medic,c.game),0,'no count during rest');}
// 5) 判定：ダウンと合算・5期の窓・他兵種は従来どおり
ok(PR.deathlineEligible({dead:false,deathlineDownHistory:[{phase:3,downs:4},{phase:5,downs:0,rescues:6}]},5),'4 downs + 6 rescues = awakening');
ok(!PR.deathlineEligible({dead:false,deathlineDownHistory:[{phase:3,downs:4,rescues:5}]},5),'9 total is not enough');
ok(!PR.deathlineEligible({dead:false,deathlineDownHistory:[{phase:1,downs:4},{phase:5,rescues:6}]},6),'phases outside the 5-wave window drop out');
ok(!PR.deathlineEligible({dead:true,deathlineDownHistory:[{phase:5,rescues:10}]},5),'must survive');
eq(PR.normalizeDeathlineHistory({deathlineDownHistory:[{phase:4,downs:2},{phase:5,downs:3}]},5),[{phase:4,downs:2},{phase:5,downs:3}],'legacy rows keep their shape');
eq(PR.normalizeDeathlineHistory({phaseActivity:{downs:3}},2),[{phase:2,downs:3}],'very old saves without history still work');
eq(PR.recentDownCount({deathlineDownHistory:[{phase:5,downs:2,rescues:7}]},5),2,'down count stays downs only');
// 6) 期末の覚醒・記録・セーブ往復
{const c=setup();const id=c.medic.id;c.medic.deathlineDownHistory=[{phase:c.game.phase,downs:3,rescues:6}];
 const saved=structuredClone(c.game.saveGame({immediate:true}));c.game.resumeSavedGame(saved);let m=c.game.squad.find(s=>s.id===id);eq(PR.recentDeathlineRescueCount(m,c.game.phase),6,'rescues survive save/load');
 m.deathlineDownHistory[m.deathlineDownHistory.length-1].rescues=7;const before=(m.deathlineSkills||[]).length;
 c.game.phaseTimer=0.0001;c.game.completePhase();m=c.game.squad.find(s=>s.id===id);
 ok((m.deathlineSkills||[]).length===before+1,'medic awakens from downs + rescues');eq(m.survivedDeathlines,1,'counted as a survived deathline');eq(PR.recentDeathlineCount(m,c.game.phase),0,'ledger consumed');
 const a=c.game.deathlineReport.awakenedList.find(x=>x.id===id);ok(a&&a.downCount===3&&a.rescueCount===7,'report carries the rescue count');}
for(const id of slotIds)saveSlots.delete(id);
dom.window.close();console.log(`PASS deathline-rescue-v7212 (${checks} checks)`);
