// v7.2.9: 外側の世界の行商人と護衛は、いまいる場所の敵の強さに合わせる。本陣近くは従来どおり。歩いて地域が変わったら更新。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const MR=await import('../js/merchant-rules.js?v=343');const {distanceScaling}=await import('../js/equipment-rules.js?v=306');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MERCHANT POWER TEST ONLY').id;game.startFreshGame(false);
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const {WORLD_SIZE}=await import('../js/world.js?v=289');const C={x:WORLD_SIZE/2,y:WORLD_SIZE/2};
const make=(D,kind='field-camp')=>{const x=C.x+D,y=C.y;const m={id:`merchant_t${D}_${kind}`,isMerchant:true,placeKind:kind,x,y,distance:D,hp:(kind==='inn'?160:180)+Math.min(220,Math.round(D/120)),dead:false,name:'行商・ルカ',placeName:'野営キャンプ',stock:[],stockPhase:1};
 m.maxHp=m.hp;m.escorts=[0,1].map(i=>MR.makeEscort(m,i,1));return m;};
const hooks={damageEscort:(e,raw,o)=>game.damageTarget(e,raw,o),damageMonster:(esc,mon,dmg)=>{if(mon&&mon.hp>0)game.performAttack(esc,mon,false,dmg);}};
const tick=(m,sec,mons=[])=>{game.merchants=[m];game._merchantById=new Map([[m.id,m]]);game.monsters=mons;for(let t=0;t<sec;t+=1/30)MR.updateMerchants(game,1/30,()=>null,hooks);};
game.phase=1;
// Near the HQ nothing changes.
for(const D of [210,3000,7999]){const m=make(D),before=JSON.stringify([m.maxHp,m.escorts.map(e=>[e.maxHp,e.atk,e.def])]);tick(m,1.2);
 eq(JSON.stringify([m.maxHp,m.escorts.map(e=>[e.maxHp,e.atk,e.def])]),before,`${D}: unchanged near the HQ`);ok(!(m.powerDistance>0),'not marked');}
// Outside: escorts ×1.8 HP / ×1.5 ATK of the local escort, trader ×(enemy ATK growth since the border)×4.
for(const D of [8000,12000,30000,55000]){const m=make(D);tick(m,.1);const sc=distanceScaling(D,1);
 eq(m.maxHp,Math.round(MR.merchantBaseHp(m)*Math.max(1,sc.atk/1.25)*4),`${D}: trader HP`);ok(m.maxHp>=MR.merchantBaseHp(m)*4*4,`${D}: far above the old ${MR.merchantBaseHp(m)}`);
 const base=MR.makeEscort(make(D),0,1);eq(m.escorts[0].escortBaseStats.hp,Math.round(base.escortBaseStats.hp*1.8),`${D}: escort HP`);eq(m.escorts[0].escortBaseStats.atk,Math.round(base.escortBaseStats.atk*1.5),`${D}: escort ATK`);
 eq(m.hp,m.maxHp,'full HP stays full');
 const snap=JSON.stringify([m.maxHp,m.escorts.map(e=>[e.maxHp,e.atk])]);tick(m,2.5);eq(JSON.stringify([m.maxHp,m.escorts.map(e=>[e.maxHp,e.atk])]),snap,`${D}: no rescaling while standing still`);}
// Walking: the values follow the place; HP fraction is kept; back inside the border restores the HQ values.
{const m=make(30000);tick(m,.1);m.hp=Math.round(m.maxHp/2);const far=m.maxHp;
 m.x=C.x+12000;tick(m,1.1);ok(m.maxHp<far,'weaker region -> lower values');ok(Math.abs(m.hp/m.maxHp-.5)<.01,'half HP stays half');eq(Math.round(m.powerDistance),12000);
 m.x=C.x+12500;tick(m,1.1);eq(Math.round(m.powerDistance),12000,'small steps inside one region do not rescale');
 m.x=C.x+5000;tick(m,1.1);eq(m.maxHp,MR.merchantBaseHp(m),'inside the border: original trader HP');eq(m.powerDistance,0);
 const inner=MR.makeEscort(make(5000),0,1);eq(m.escorts[0].escortBaseStats.hp,inner.escortBaseStats.hp,'inside: local escort values');}
// Gate guards / aid-post sentries are not touched.
{const m=make(30000);m.escorts[1].isGateGuard=true;const g=JSON.stringify(m.escorts[1].escortBaseStats);tick(m,.1);eq(JSON.stringify(m.escorts[1].escortBaseStats),g,'gate guard untouched');}
// Save and load: no double scaling.
{const m=make(30000);tick(m,.1);const saved=MR.serializeMerchants([m])[0];const fresh=make(30000);MR.applyNpcSave(fresh,saved);for(const e of saved.escorts){const t=fresh.escorts.find(x=>x.id===e.id);MR.applyNpcSave(t,e);}
 tick(fresh,1.2);eq(fresh.maxHp,m.maxHp,'trader HP after load');eq(fresh.escorts[0].maxHp,m.escorts[0].maxHp,'escort HP after load');}
// A pack at 30000 no longer kills the trader in an instant (before v7.2.9: under a second).
{const m=make(30000),sc=distanceScaling(30000,1);const mons=Array.from({length:5},(_,i)=>({id:'mon'+i,type:'orc',x:m.x+Math.cos(i)*18,y:m.y+Math.sin(i)*18,hp:60*sc.hp,maxHp:60*sc.hp,atk:Math.round(20*sc.atk),def:0,radius:12,speed:0}));
 tick(m,10,mons);ok(!m.isDown&&m.hp>0,'trader still standing after 10 s');ok(m.escorts.every(e=>!e.isDown&&e.hp>0),'escorts still standing after 10 s');}
console.log(`PASS merchant-outer-power-v729 (${checks} checks)`);
