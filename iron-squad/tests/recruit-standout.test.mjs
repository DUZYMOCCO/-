import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {standoutAptitude,rollAttributeProfile} from '../js/unit-attributes.js';

// Off-type or extreme aptitudes: magic swordsman, muscle mage, any aptitude of 2.4+. Plain specialists are not flagged.
const unit=(soldierClass,aptitudes)=>({soldierClass,attributeProfile:{version:1,family:soldierClass,innate:{strength:20,magic:20,magicDefense:8,quickness:15,evasion:2},aptitudes:{strength:1,magic:1,magicDefense:1,quickness:1,evasion:1,...aptitudes},practice:{strength:0,magic:0,magicDefense:0,travel:0,evasion:0}}});
assert.match(standoutAptitude(unit('HEAVY',{magic:2.1,strength:.9})),/魔法剣士/);
assert.match(standoutAptitude(unit('ARCHER',{magic:2.1,strength:.9})),/^マジックシューターの素質/,'archers are called magic shooters, not swordsmen');
assert.match(standoutAptitude(unit('MAGE',{strength:1.8})),/筋肉魔術師/);
assert.match(standoutAptitude(unit('LIGHT',{quickness:2.5})),/速さが突出/);
assert.equal(standoutAptitude(unit('HEAVY',{strength:1.9})),null,'a strong fighter is normal');
assert.equal(standoutAptitude(unit('MAGE',{magic:2.2})),null,'a strong mage is normal');
assert.equal(standoutAptitude(unit('HEAVY',{magic:2.1,strength:1.2})),null,'magic must clearly outweigh strength');
// Rare by design.
let seed=7;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
const rate=cls=>{let n=0;for(let i=0;i<20000;i++)if(standoutAptitude({soldierClass:cls,attributeProfile:rollAttributeProfile(cls,'AVERAGE',random)}))n++;return n/20000;};
assert.ok(rate('HEAVY')<.06,'about 3% of fighters');assert.ok(rate('MAGE')<.01,'well under 1% of casters');

const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,joystick:{active:false,dirX:0,dirY:0}});
const toasts=[];for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=t=>toasts.push(t);
game.setupUI();game.activeSlotId=saveSlots.create('STANDOUT TEST ONLY').id;game.startFreshGame(false);
game.rollScoutTalent=()=> 'AVERAGE';game.refreshScoutCandidates();
const makeStandout=c=>{c.soldier.attributeProfile.aptitudes.magic=2.2;c.soldier.attributeProfile.aptitudes.strength=.9;c.soldier.attributeProfile.family='HEAVY';c.soldier.soldierClass='HEAVY';};
const makePlain=c=>{Object.assign(c.soldier.attributeProfile.aptitudes,{strength:1,magic:1,magicDefense:1,quickness:1,evasion:1});};
makeStandout(game.scoutCandidates[0]);const held=game.scoutCandidates[0].id;game.renderScoutCandidates();
assert.match(document.getElementById('scout-candidates-list').textContent,/魔法剣士の素質/,'the card shows the standout skill');
let asked=null;window.confirm=msg=>{asked=msg;return false;};
assert.equal(game.nextScoutCandidate(),false);assert.equal(game.scoutCandidates[0].id,held,'cancel keeps the candidate');
assert.match(asked,/^突出した技能（魔法剣士の素質（魔力が突出））を持っていますが、次の候補へ進んでも大丈夫ですか？$/);
window.confirm=()=>true;const realRefresh=game.refreshScoutCandidates.bind(game);game.refreshScoutCandidates=()=>{realRefresh();makePlain(game.scoutCandidates[0]);};
assert.equal(game.nextScoutCandidate(),true);assert.notEqual(game.scoutCandidates[0].id,held,'OK moves on');
asked=null;window.confirm=msg=>{asked=msg;return true;};game.nextScoutCandidate();assert.equal(asked,null,'ordinary candidates pass without asking');
// Changing profession asks too.
makeStandout(game.scoutCandidates[0]);window.confirm=msg=>{asked=msg;return false;};game.openStrategyModal(true);game.renderScoutCandidates();
const job=document.getElementById('scout-class');const before=job.value;job.value=before==='MAGE'?'HEAVY':'MAGE';job.onchange();
assert.equal(job.value,before);assert.match(asked,/募集する職種を変えても大丈夫ですか？/);
// Automatic recruiting stops on a standout and refuses to restart until it is handled.
const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let scheduled;
globalThis.setTimeout=(cb)=>{scheduled=cb;return 99;};globalThis.clearTimeout=()=>{};
try{
  makePlain(game.scoutCandidates[0]);window.confirm=()=>true;
  game.refreshScoutCandidates=()=>{realRefresh();makeStandout(game.scoutCandidates[0]);};
  game.container.querySelector('#recruitment-dialog')?.classList.remove('hidden');
  assert.equal(game.startScoutAuto(),true);scheduled();
  assert.equal(game._scoutAuto,false,'auto stops on a standout');assert.ok(toasts.some(t=>/突出した技能の候補/.test(t)));
  assert.equal(game.startScoutAuto(),false,'cannot restart past an unhandled standout');
}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;game.stopScoutAuto();game.destroy();dom.window.close();}
console.log('PASS: standout recruits (magic swordsman / muscle mage / extreme) ask before passing, stop auto recruiting and show on the card');
