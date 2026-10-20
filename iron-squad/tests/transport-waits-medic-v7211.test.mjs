// v7.2.11: 手のあいた衛生職が近くで向かっている負傷者は一般の兵が運び出さない。自部隊の負傷者は、運ぶのが本隊の兵でも、自部隊に衛生職がいれば（CT中でも）隊長のそばで待つ（v6.4.1の仕様）。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const CR=await import('../js/casualty-rules.js?v=345');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const setup=scen=>{const game=Object.create(IronSquadGame);
 Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
 for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
 game.setupUI();game.activeSlotId=saveSlots.create('TRANSPORT TEST ONLY').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
 const P=game.player;P.x+=3000;const all=game.squad;all.forEach((s,i)=>{s.x=P.x+((i%8)-4)*25;s.y=P.y+60+Math.floor(i/8)*25;s.isPersonalGuard=false;});
 const medics=all.filter(CR.isMedic),victim=all.find(s=>s.soldierClass==='HEAVY');
 if(scen.own){victim.isPersonalGuard=true;medics[0].isPersonalGuard=true;}
 if(scen.ct)for(const m of medics)m.revivalSkillCooldownUntil=1e9;
 if(scen.noMedic)for(const m of medics)m.soldierClass='LIGHT';
 if(scen.farMedic)for(const m of medics){m.x=victim.x+(m.x>=victim.x?1:-1)*(420+Math.random()*40);}
 CR.markSoldierDown(game,victim);return {game,victim,P,all};};
const run=(c,sec)=>{let carrier=null,maxD=0;for(let t=0;t<sec&&c.victim.isDown;t+=1/30){c.game.update(1/30);if(c.victim.carrierId&&!carrier)carrier=c.all.find(s=>s.id===c.victim.carrierId);maxD=Math.max(maxD,Math.hypot(c.victim.x-c.P.x,c.victim.y-c.P.y));}return {carrier,maxD,revived:!c.victim.isDown};};
{const r=run(setup({}),3);ok(r.revived,'free medic nearby revives');ok(!r.carrier,'nobody runs off with the patient');}
{const r=run(setup({own:true,ct:true}),20);ok(r.carrier&&!r.carrier.isPersonalGuard,'a main-body soldier picks up our casualty');ok(r.maxD<200,`waits by the commander while our medic is on CT (max ${Math.round(r.maxD)})`);}
for(const cls of ['HIGH_PRIEST','SAINT','ARCHANGEL']){const c=setup({own:true,ct:true});c.all.find(s=>CR.isMedic(s)&&s.isPersonalGuard).soldierClass=cls;const r=run(c,8);ok(r.maxD<200,`${cls} counts as our medic`);}
{const r=run(setup({noMedic:true}),8);ok(r.carrier&&r.maxD>400,'no medic at all: carried to a station');}
{const r=run(setup({farMedic:true}),8);ok(r.carrier,'medics too far: the nearest soldier carries');}
{const c=setup({own:true,ct:true});c.game.update(1/30);const carriers=c.all.filter(s=>CR.carriedSoldiers(c.game,s).length);ok(carriers.length<=1,'only one carrier');}
dom.window.close();console.log(`PASS transport-waits-medic-v7211 (${checks} checks)`);
