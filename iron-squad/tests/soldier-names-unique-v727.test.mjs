// v7.2.7: 忍者・獣人を100人仲間にしても名前がかぶらない。名簿を使い切ったら「二代目〇〇」など。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js?v=341');
const N=await import('../js/soldier-names.js?v=341');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('NAMES TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const allNames=()=>[game.player,...game.squad,...game.reserves].map(u=>u.name);
const unique=list=>new Set(list).size===list.length;
// 100 ninjas (and 100 of each beastfolk) joining one after another: all distinct, all world-fitting.
const join=u=>{(game.squad.length<60?game.squad:game.reserves).push(u);};
game.squad=game.squad.slice(0,5);game.reserves=[];
for(let i=0;i<100;i++)join(createLimitedAlly(game,'NINJA','test'));
{const ninjas=[...game.squad,...game.reserves].filter(u=>u.soldierClass==='NINJA').map(u=>u.name);eq(ninjas.length,100);ok(unique(allNames()),'100 ninjas, no duplicates');
 const pool=new Set([...N.NINJA_NAMES_BY_GENDER.male,...N.NINJA_NAMES_BY_GENDER.female]);
 ok(ninjas.every(n=>pool.has(N.baseSoldierName(n))&&(pool.has(n)||/^[一二三四五六七八九十]+代目/.test(n))),'only list names or 〇代目 forms');ok(ninjas.some(n=>n.startsWith('二代目')),'lists ran out -> 二代目');}
for(const line of ['BEAST_WOLF','BEAST_BEAR','BEAST_CAT','BEAST_FOX','BEAST_BIRD'])for(let i=0;i<100;i++)join(createLimitedAlly(game,line,'test'));
ok(unique(allNames()),'beastfolk too');ok(allNames().some(n=>/^(若|小|子|雛)/.test(n)),'second beast uses the species word');
console.log(`PASS soldier-names-unique-v727 (${checks} checks)`);
