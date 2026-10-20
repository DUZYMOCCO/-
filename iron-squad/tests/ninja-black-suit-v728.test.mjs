// v7.2.8: 忍者の系列は全身黒装束。マント・式典服の紋章・防具の色は描かない。段階は帯の差し色だけ。描画だけで数値は同じ。他の兵種は従来どおり。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js?v=341');
const {drawFieldSoldier,ninjaBackView}=await import('../js/visuals.js?v=342');
const {NINJA_SUIT,NINJA_SASH}=await import('../js/visuals.js?v=342');const {CLASS_REGALIA,LIMITED_REGALIA}=await import('../js/class-regalia.js?v=335');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('NINJA SUIT TEST ONLY').id;game.startFreshGame(false);
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const recorder=()=>{const log=[],fills=new Set();const o={log,fills,measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),canvas:{}};
 return new Proxy(o,{get:(t,k)=>k in t?t[k]:(...a)=>{log.push([k,...a].join(','));},set:(t,k,v)=>{if(k==='fillStyle'||k==='strokeStyle'){fills.add(String(v).toLowerCase());log.push(`${k}=${v}`);}t[k]=v;return true;}});};
const ninja=id=>{const s=createLimitedAlly(game,'NINJA','t');s.soldierClass=id;game.recalcSoldierStats(s);return Object.assign(s,{x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0});};
const field=s=>{const c=recorder();drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[s.soldierClass]||{},'#a59a76',false);return c;};
const heavy={armor:{type:'ARMOR',tier:6,name:'重鎧'},helmet:{type:'HELMET',tier:6,name:'兜'},legs:{type:'LEGS',tier:6,name:'脚甲'},gloves:{type:'GLOVES',tier:6,name:'籠手'},shield:{type:'SHIELD',tier:6,name:'大盾'}};
const regaliaColors=new Set(Object.values({...CLASS_REGALIA,...LIMITED_REGALIA}).filter(r=>r.lineId==='NINJA').flatMap(r=>[r.cloth,r.mantle,r.metal,r.light,r.gem]).map(x=>String(x).toLowerCase()));
ok(regaliaColors.size>3,'ninja regalia palette known');
for(const id of ['NINJA','NINJA_CHUNIN','NINJA_JONIN','NINJA_KASHIRA'])for(const face of [0,Math.PI]){
 const s=Object.assign(ninja(id),{facingAngle:face}),plain=field(s);
 const used=[...plain.fills].filter(c=>regaliaColors.has(c));eq(used.length,0,`${id}: no mantle or crest colours (${used})`);
 ok(plain.fills.has(NINJA_SUIT.cloth.toLowerCase())&&plain.fills.has(NINJA_SUIT.legs.toLowerCase()),`${id}: black suit`);
 ok(plain.log.includes(`fillStyle=${NINJA_SASH[id]}`)&&plain.log.includes('fillRect,-6,-11.5,12,2.2'),`${id}: sash in its colour`);
 ok(!plain.log.includes('lineTo,-14,-1'),`${id}: no cape`);ok(!plain.log.some(l=>l==='strokeStyle=#c8b797'),`${id}: no light-armour strap`);
 const s2={...s,equipped:{...s.equipped,...heavy}};
 eq(field(s2).log.join('|'),plain.log.join('|'),`${id}: heavy armour draws the same black suit`);}
eq(new Set(Object.values(NINJA_SASH)).size,4,'four sash colours');
// Numbers unchanged: heavy armour still counts.
{const s=ninja('NINJA_JONIN'),def0=s.def;Object.assign(s.equipped,{armor:{...heavy.armor,def:30}});game.recalcSoldierStats(s);ok(s.def>=def0,'armour still worn');}
// Other classes keep their mantle, crest and armour colours.
{const s=Object.assign(game.createNewSoldier(null,{classKey:'HEAVY'}),{x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0});s.soldierClass='PALADIN';const r=CLASS_REGALIA.PALADIN;
 const log=field(s);ok(log.fills.has(r.mantle.toLowerCase())||log.log.some(l=>l.startsWith('drawImage')),'paladin keeps the mantle');ok(!log.fills.has(NINJA_SUIT.cloth.toLowerCase()),'not black');}
{const s=Object.assign(createLimitedAlly(game,'BEAST_WOLF','t'),{x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0});s.soldierClass='BEAST_WOLF_GARO';const r=LIMITED_REGALIA.BEAST_WOLF_GARO;ok(field(s).fills.has(r.mantle.toLowerCase()),'beastfolk regalia unchanged');}
// Hood: black, knot tails kept, a sliver of skin at the eye.
{const {drawSoldierHead}=await import('../js/soldier-appearance.js?v=342');const s=ninja('NINJA_CHUNIN'),c=recorder();drawSoldierHead(c,s,{silhouette:true,back:true,helmet:'#aabbcc'});
 ok(c.log.some(l=>l==='lineTo,-10.2,2.2'),'knot tails');ok(c.fills.has(String(s.appearance.skin).toLowerCase()),'eye skin');ok(!c.fills.has('#aabbcc'),'helmet colour not painted over the hood');}
console.log(`PASS ninja-black-suit-v728 (${checks} checks)`);
