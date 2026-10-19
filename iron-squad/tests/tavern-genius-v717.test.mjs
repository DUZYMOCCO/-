// v7.1.7: only the field tavern's strangers are more often geniuses; every other recruitment path keeps 0.033%.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {ensureTavernRoster,FIELD_TAVERN,TAVERN_GENIUS_RATE,TAVERN_ROSTER_SIZE} from '../js/tavern.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SCOUT_GENIUS_RATE}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
const toasts=[];for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=m=>toasts.push(String(m));
game.setupUI();game.activeSlotId=saveSlots.create('TAVERN GENIUS TEST ONLY').id;game.startFreshGame(false);game.closeStrategyModal();
const rng=Math.random;let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const seeded=s=>()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
try{
  eq(SCOUT_GENIUS_RATE,0.00033,'ordinary rate unchanged');eq(TAVERN_GENIUS_RATE,0.05);eq(TAVERN_ROSTER_SIZE,4);
  // 1. Ordinary roll: exactly the old cut-offs (scouting, rescues, hero party, createNewSoldier without a talent).
  for(const [roll,key] of [[0,'GENIUS'],[.000329999,'GENIUS'],[.00033,'ELITE'],[.059999,'ELITE'],[.06,'TALENTED'],[.2,'INFERIOR'],[.35,'AVERAGE'],[.999,'AVERAGE']]){Math.random=()=>roll;eq(game.rollScoutTalent(),key);eq(game.rollScoutTalent(SCOUT_GENIUS_RATE),key);}
  // 2. Tavern roll: genius below 5%, the rest keeps the old table's proportions (shrunk by 0.95/0.99967).
  const r=TAVERN_GENIUS_RATE,scale=(1-r)/(1-SCOUT_GENIUS_RATE),at=p=>r+(p-SCOUT_GENIUS_RATE)/(1-SCOUT_GENIUS_RATE)*(1-r)*(1-SCOUT_GENIUS_RATE)/(1-SCOUT_GENIUS_RATE);
  for(const [roll,key] of [[0,'GENIUS'],[r-1e-9,'GENIUS'],[r,'ELITE'],[at(.06)-1e-7,'ELITE'],[at(.06)+1e-7,'TALENTED'],[at(.2)+1e-7,'INFERIOR'],[at(.35)+1e-7,'AVERAGE'],[.999,'AVERAGE']]){Math.random=()=>roll;eq(game.rollScoutTalent(r),key,`tavern roll ${roll}`);}
  // 3. Statistics: 200,000 rolls each (seeded).
  const count=(rate,n=200000)=>{Math.random=seeded(20261019);const c={};for(let i=0;i<n;i++){const t=rate===undefined?game.rollScoutTalent():game.rollScoutTalent(rate);c[t]=(c[t]||0)+1;}return c;};
  const base=count(),tav=count(r);
  ok(base.GENIUS>=36&&base.GENIUS<=96,`ordinary about 66 per 200,000: ${base.GENIUS}`);
  ok(Math.abs(tav.GENIUS/200000-r)<.002,`tavern genius ${(tav.GENIUS/2000).toFixed(2)}%`);
  for(const [key,p] of [['ELITE',.06-SCOUT_GENIUS_RATE],['TALENTED',.14],['INFERIOR',.15],['AVERAGE',.65]])ok(Math.abs(tav[key]/200000-p*scale)<.004,`${key} shrinks proportionally: ${(tav[key]/2000).toFixed(2)}% vs ${(p*scale*100).toFixed(2)}%`);
  // 4. Real tavern rosters: 4 strangers per wave; about 0.2 geniuses per wave, at least one in about 18.5% of waves.
  toasts.length=0; // only this section's toasts (the fresh game's own recruits can be geniuses by chance)
  Math.random=seeded(7171);let people=0,genius=0,wavesWith=0;const waves=3000;
  for(let w=1;w<=waves;w++){game.phase=w;const roster=ensureTavernRoster(game);eq(roster.people.length,TAVERN_ROSTER_SIZE);people+=roster.people.length;const n=roster.people.filter(p=>p.unit.talent==='GENIUS').length;genius+=n;if(n)wavesWith++;}
  const per=genius/people,mean=genius/waves,atLeast=wavesWith/waves,expect=1-(1-r)**TAVERN_ROSTER_SIZE;
  ok(per>.035&&per<.065,`tavern stranger genius rate ${(per*100).toFixed(2)}%`);
  ok(Math.abs(atLeast-expect)<.03,`waves with a genius ${(atLeast*100).toFixed(1)}% (expected ${(expect*100).toFixed(1)}%)`);ok(mean>.14&&mean<.26,`geniuses per wave ${mean.toFixed(3)}`);
  ok(!toasts.some(t=>t.includes('奇跡の新兵')),'a genius stranger is not announced as a new recruit before being hired');
  // 5. Other paths keep the ordinary rate: the scout candidate and a plain createNewSoldier call rollScoutTalent() without a rate.
  const calls=[];const real=game.rollScoutTalent;game.rollScoutTalent=function(...a){calls.push(a[0]);return real.apply(this,a);};
  try{game.refreshScoutCandidates();game.createNewSoldier(null,{classKey:'HEAVY'});game.phase=99999;ensureTavernRoster(game);}finally{game.rollScoutTalent=real;}
  ok(calls.slice(0,-TAVERN_ROSTER_SIZE).every(a=>a===undefined),`ordinary paths use the default rate: ${JSON.stringify(calls)}`);ok(calls.slice(-TAVERN_ROSTER_SIZE).every(a=>a===r),'only the tavern roster asks for the tavern rate');
  for(const file of ['../js/recruitment.js','../js/hero-party.js'])ok(!/rollScoutTalent\([^)]/.test(readFileSync(new URL(file,import.meta.url),'utf8')),`${file} uses the ordinary rate`);
  // 6. v7.1.8: the tavern note stays in-world (no explanation of the genius rate).
  Object.assign(game.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+60});game.phase=100000;game.openTavern();
  const note=game.container.querySelector('#tavern-dialog .tavern-wave-note')?.textContent||'';ok(note.length>0&&!note.includes('天才')&&!/確率|見つかりやすい/.test(note),`v7.1.8: no meta explanation in the tavern note: ${note}`);
  console.log(`PASS: v7.1.7 tavern genius ${r*100}% (ordinary ${SCOUT_GENIUS_RATE*100}%), proportional shrink of other talents, ${(atLeast*100).toFixed(1)}% of waves with a genius, other paths unchanged (${checks} checks)`);
}finally{Math.random=rng;dom.window.close();}
