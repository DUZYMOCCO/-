import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {soldierProfileBase,buildSoldierProfile,pickColleague,pairAffinity,describeDeathlineEffect,PERSONALITIES,HOBBIES,FAMILIES,NO_COLLEAGUE_TEXT} from '../js/soldier-profile.js';

// 1. pure generator
assert.ok(PERSONALITIES.length>=30&&HOBBIES.length>=30&&FAMILIES.length>=20,'pool sizes');
const a={id:'s-100',name:'アレン',gender:'male'},b={id:'s-101',name:'ベル',gender:'female'},c={id:'s-102',name:'カイ',gender:'male'};
assert.deepEqual(soldierProfileBase(a),soldierProfileBase({...a,name:'別名'}),'depends on id only');
assert.deepEqual(soldierProfileBase(a),soldierProfileBase(structuredClone(a)));
const profiles=new Set(Array.from({length:60},(_,i)=>JSON.stringify(soldierProfileBase({id:`x${i}`,gender:'male'}))));
assert.ok(profiles.size>=55,'profiles differ across ids');
for(let i=0;i<300;i++){
  const m=soldierProfileBase({id:`m${i}`,gender:'male'}),f=soldierProfileBase({id:`f${i}`,gender:'female'});
  assert.ok(!/\{sp\}/.test(m.family+f.family));
  assert.ok(!/妻/.test(f.family),'female soldiers never get the wife wording');
  assert.ok(!/(^|と)夫/.test(m.family),'male soldiers never get the husband wording');
  assert.ok(!/おおかみ|里/.test(m.family+f.family),'beast-only lines are not given to humans');
  const beast=soldierProfileBase({id:`w${i}`,gender:'male',species:'wolf'});
  assert.ok(typeof beast.family==='string'&&beast.family.length>0);
}
assert.ok(Array.from({length:300},(_,i)=>soldierProfileBase({id:`w${i}`,gender:'male',species:'wolf'}).family).some(t=>/おおかみ|里/.test(t)),'beasts can get beast lines');
// colleague
assert.equal(pickColleague(a,[a]),null,'alone');assert.equal(buildSoldierProfile(a,[a]).colleague,NO_COLLEAGUE_TEXT);
const mates=[a,b,c,{id:'s-103',name:'死者',dead:true}];
const col=pickColleague(a,mates);
assert.ok(col&&col.soldier!==a&&!col.soldier.dead&&col.name!==a.name,'another living soldier');
assert.deepEqual(pickColleague(a,mates).soldier,col.soldier,'deterministic');
assert.equal(pairAffinity('p','q'),pairAffinity('q','p'));
assert.match(buildSoldierProfile(a,mates).colleague,new RegExp(`^${col.name}（.+）$`));
assert.equal(buildSoldierProfile(a,mates,{withColleague:false}).colleague,'');
// deathline text from numeric fields
assert.equal(describeDeathlineEffect({atkMultBonus:.4,bonusCrit:20}),'ATK +40%、クリティカル率 +20%');
assert.equal(describeDeathlineEffect({allStatsMultBonus:.25,regenPct:2}),'最大HP +25%、ATK +25%、DEF +25%、毎秒最大HPの2%回復');
assert.equal(describeDeathlineEffect({speedMultBonus:.3,atkSpeedBonus:25,dodgeBonus:15}),'移動速度 +30%、回避 +15%、攻撃速度 +25%');
assert.equal(describeDeathlineEffect({healMultBonus:.6,rescueSpeedMult:2.5}),'回復力 +60%、蘇生の再使用時間 2.5倍速');
assert.match(describeDeathlineEffect({hpMultBonus:.35,dmgReduction:15,lowHpGuard:true,lowHpSpeedPct:30}),/HP35%以下で被ダメージ半減・移動速度 \+30%/);

// 2. UI
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,alert:()=>{throw new Error('alert is forbidden');}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=noop;
try{
  game.setupUI();game.activeSlotId=saveSlots.create('SOLDIER PROFILE TEST ONLY').id;game.startFreshGame(false);
  const base=game.squad[0];
  const mk=(id,name,extra={})=>({...structuredClone(base),id,name,minionKills:5,bossKills:0,level:3,dead:false,isDown:false,isPlayer:false,isHero:false,...extra});
  game.squad=[mk('p1','アレン',{deathlineSkills:['PHANTOM_STEP','IRON_RESOLVE'],favoriteWeapon:'crossbow'}),mk('p2','ベル',{gender:'female'}),mk('p3','カイ')];
  game.reserves=[];game.reserveSoldiers=[];
  const host=()=>document.getElementById('soldier-detail-host');
  game.openSoldierDetail('p1',['p1','p2','p3']);
  const h=host();
  assert.match(h.textContent,/PERSONNEL FILE/);
  assert.ok(!h.querySelector('.soldier-look-description')&&!/兜を外した姿/.test(h.textContent),'appearance text is gone');
  assert.ok(h.querySelector('canvas.soldier-face-portrait'),'portrait kept');
  assert.deepEqual([...h.querySelectorAll('.soldier-profile-list dt')].map(x=>x.textContent),['性格','趣味','家族構成','仲の良い同僚']);
  const first=h.querySelector('.soldier-profile-list').textContent;
  const colleagueName=h.querySelector('.profile-colleague').textContent;
  assert.ok(/ベル|カイ/.test(colleagueName)&&!/アレン/.test(colleagueName),'colleague is another soldier');
  // mastery chips
  const chips=()=>[...host().querySelectorAll('button.mastery-chip')],cap=()=>host().querySelector('.mastery-caption');
  assert.equal(chips().length,9);assert.ok(cap().hidden);
  assert.equal(chips().filter(x=>x.classList.contains('is-fav')).length,1);
  const cb=chips().find(x=>x.dataset.style==='crossbow');assert.match(cb.getAttribute('aria-label'),/クロスボウ \d+%（得意）/);
  assert.ok(chips().every(x=>/^\d+%$/.test(x.querySelector('strong').textContent)),'chips show number only');
  cb.click();assert.ok(!cap().hidden);assert.match(cap().textContent,/クロスボウ/);assert.equal(cb.getAttribute('aria-pressed'),'true');
  chips()[0].click();assert.ok(!cap().hidden&&!/クロスボウ/.test(cap().textContent),'switches');assert.equal(cb.getAttribute('aria-pressed'),'false');
  chips()[0].click();assert.ok(cap().hidden,'same chip hides');
  // deathline
  const dl=()=>[...host().querySelectorAll('button.deathline-chip')],dd=()=>host().querySelector('.deathline-desc');
  assert.equal(dl().length,2);assert.ok(dd().hidden);
  dl()[0].click();assert.ok(!dd().hidden);assert.match(dd().textContent,/ファントムステップ/);assert.match(dd().textContent,/移動速度 \+30%/);
  assert.match(dd().textContent,/攻撃速度 \+25%/,'implemented attack speed is described');
  dl()[1].click();assert.match(dd().textContent,/DEF \+50%/);dl()[1].click();assert.ok(dd().hidden);
  // paging resets popovers and keeps working; profile stable
  chips()[2].click();dl()[0].click();assert.ok(!cap().hidden&&!dd().hidden);
  host().querySelector('.btn-soldier-next').click();assert.equal(game.selectedSoldierDetailId,'p2');
  assert.ok(cap().hidden,'mastery popover reset on paging');
  assert.equal(chips().length,9);
  host().querySelector('.btn-soldier-prev').click();assert.equal(game.selectedSoldierDetailId,'p1');
  assert.ok(cap().hidden&&dd().hidden,'popovers closed after coming back');
  assert.equal(host().querySelector('.soldier-profile-list').textContent,first,'same profile after paging back');
  game.closeSoldierDetail();game.openSoldierDetail('p1');
  assert.equal(host().querySelector('.soldier-profile-list').textContent,first,'same after reopening');
  // the colleague follows who is still around
  game.squad=[game.squad[0],game.squad[2]];game.openSoldierDetail('p1');
  assert.match(host().querySelector('.profile-colleague').textContent,/カイ/);
  game.squad=[game.squad[0]];game.openSoldierDetail('p1');
  assert.equal(host().querySelector('.profile-colleague').textContent,NO_COLLEAGUE_TEXT);
  game.closeSoldierDetail();
}finally{try{saveSlots.remove?.(game.activeSlotId);}catch{}}
console.log('soldier-profile ok');process.exit(0);
