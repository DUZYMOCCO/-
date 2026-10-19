// v7.0.5 被弾鍛錬の基準は「防御で減らす前の攻撃の強さ」。DEF・軽減・結界・最大HPで成長量が変わらない（負のループ・雪だるまなし）。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {HIT_HP_PER_DAMAGE,HIT_DEF_PER_DAMAGE} from '../js/growth-rules.js';
import {canUseEquipmentBarrier} from '../js/defense-equipment.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('Hit growth strength').id;g.startFreshGame(false);
const near=(a,b,m)=>assert.ok(Math.abs(a-b)<1e-9,`${m||''} ${a} ~ ${b}`);
const make=(cls,maxHp=1e9)=>{const s=g.createNewSoldier();s.soldierClass=cls;s.combatClass=cls;s.baseClassId=cls;s.hitGrowthHp=0;s.hitGrowthDef=0;s.hitGrowthEvents=0;g.recalcSoldierStats(s);Object.assign(s,{dodge:0,dmgReduction:0,shieldTimer:0,lethalGuardCooldown:999,x:C,y:C});s.maxHp=maxHp;s.hp=maxHp;g.squad=[s];return s;};
const RAW=100000;

// (a) 同じ攻撃: 高DEFの重装も低DEFの重装も、軽装も同じ量だけ成長（DEFが高いほど被ダメが減っても成長は鈍らない）
{const hi=make('HEAVY');hi.def=600000;const lo=make('HEAVY');lo.def=10;const light=make('LIGHT');light.def=5;
 let dealt={};const hit=(u,key)=>{g.spawnDamageText=(x,y,t)=>{if(typeof t==='number')dealt[key]=t;};g.squad=[u];u.hp=u.maxHp;g.damageTarget(u,RAW,{});g.spawnDamageText=noop;};
 // damageTarget の成長が recalc で def を作り直すので、DEFは被弾の直前に与える
 hi.def=600000;hit(hi,'hi');lo.def=10;hit(lo,'lo');hit(light,'light');
 assert.ok(dealt.hi<dealt.lo/100,`high DEF lost far less HP (${dealt.hi} vs ${dealt.lo})`);
 near(hi.hitGrowthHp,RAW*HIT_HP_PER_DAMAGE,'high DEF heavy');near(lo.hitGrowthHp,RAW*HIT_HP_PER_DAMAGE,'low DEF heavy');near(light.hitGrowthHp,RAW*HIT_HP_PER_DAMAGE,'light');
 near(hi.hitGrowthDef,RAW*HIT_DEF_PER_DAMAGE);near(lo.hitGrowthDef,RAW*HIT_DEF_PER_DAMAGE);near(light.hitGrowthDef,RAW*HIT_DEF_PER_DAMAGE*.55,'v7.1.10: light grows DEF at 0.55');
 for(const u of [hi,lo,light])assert.equal(u.hitGrowthEvents,1);}

// (b) 結界で全部吸収されても成長する（赤い数字は出ない）。結界を使えるのは隊長/術士/衛生兵で、魔法ダメージは100%吸収
{const u=g.player;Object.assign(u,{hitGrowthHp:0,hitGrowthEvents:0,dodge:0,dmgReduction:0,shieldTimer:0,invulnerableTimer:0,lethalGuardCooldown:999,maxHp:1e9,hp:1e9,x:C,y:C});assert.ok(canUseEquipmentBarrier(u));Object.assign(u,{equipmentBarrier:1e12,equipmentBarrierMax:1e12,equipmentBarrierDelay:0});
 let texts=0;g.spawnDamageText=(x,y,t)=>{if(typeof t==='number')texts++;};g.damageTarget(u,RAW,{damageKind:'magic'});g.spawnDamageText=noop;
 assert.ok(u.equipmentBarrier<1e12||u.equipmentBarrierMax<1e12,'barrier took the hit');assert.equal(texts,0,'fully absorbed: no red number');
 near(u.hitGrowthHp,RAW*HIT_HP_PER_DAMAGE,'absorbed hit still trains');assert.equal(u.hitGrowthEvents,1);}

// (c) 回避では成長しない
{const u=make('LIGHT');u.dodge=100;const rnd=Math.random;Math.random=()=>0;try{g.damageTarget(u,RAW,{});}finally{Math.random=rnd;}
 assert.equal(u.hp,u.maxHp,'dodged');assert.ok(!(u.hitGrowthHp>0),'no growth on a dodge');assert.equal(u.hitGrowthEvents,0);}

// 環境ダメージ（最大HPに比例する）は成長しない
{const u=make('HEAVY');g.damageTarget(u,RAW,{environmental:true,damageKind:'elemental',element:'fire'});assert.ok(!(u.hitGrowthHp>0),'environmental damage does not train');}

// (d) 最大HPが小さくても大きくても、1発の成長量は同じ（雪だるまなし）
{const small=make('LIGHT',500);g.damageTarget(small,RAW,{});const sg=small.hitGrowthHp;
 const big=make('LIGHT',5e9);g.damageTarget(big,RAW,{});const bg=big.hitGrowthHp;
 assert.ok(sg>0);near(sg,bg,'same growth regardless of max HP');near(sg,RAW*HIT_HP_PER_DAMAGE);}

// 倒れる一撃でも基準は攻撃の強さ（成長は致命傷を救わない）
{const u=make('LIGHT');u.hp=1;u.maxHp=100;g.damageTarget(u,1e7,{});assert.ok(u.isDown||u.hp<=0,'lethal hit downs');near(u.hitGrowthHp,1e7*HIT_HP_PER_DAMAGE);}
console.log('PASS: hit growth keys on pre-defence attack strength (DEF-independent, absorbed hits train, dodges/environment do not, no max-HP snowball)');
