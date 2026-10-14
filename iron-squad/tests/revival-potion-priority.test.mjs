import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {nearestRevivalPotionTarget,REVIVAL_POTION_RANGE,revivalSkillCooldownLeft} from '../js/casualty-rules.js?v=255';
const unit=(id,soldierClass,distance)=>({id,name:id,soldierClass,isDown:true,hp:0,maxHp:100,x:1000+distance,y:1000});
const plain=squad=>({player:{x:1000,y:1000,hp:100,maxHp:100},squad,reserves:[],heroParty:{members:[]}});
const light=unit('light','LIGHT',1),heavy=unit('heavy','HEAVY',30),medic=unit('medic','MEDIC',70);
let game=plain([light,heavy,medic]);game.random=()=>{throw new Error('priority groups must not draw random numbers');};
assert.equal(nearestRevivalPotionTarget(game),medic,'a farther medic wins over nearby heavy/other');
for(const cls of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']){medic.soldierClass=cls;assert.equal(nearestRevivalPotionTarget(game),medic);}
medic.dead=true;assert.equal(nearestRevivalPotionTarget(game),heavy);
for(const cls of ['HEAVY','PALADIN','TEMPLAR','IMMORTAL_AEGIS']){heavy.soldierClass=cls;assert.equal(nearestRevivalPotionTarget(game),heavy);}
medic.dead=false;const nearMedic=unit('near-medic','HIGH_PRIEST',40);game.squad.push(nearMedic);assert.equal(nearestRevivalPotionTarget(game),nearMedic);nearMedic.dead=true;medic.dead=true;
const nearHeavy=unit('near-heavy','PALADIN',20);game.squad.push(nearHeavy);assert.equal(nearestRevivalPotionTarget(game),nearHeavy);
// Only reachable, living downed units in the same coordinate space qualify.
medic.dead=false;medic.x=1000+REVIVAL_POTION_RANGE+1;assert.equal(nearestRevivalPotionTarget(game),nearHeavy);medic.x=1000+REVIVAL_POTION_RANGE;assert.equal(nearestRevivalPotionTarget(game),medic);
medic.dying=true;assert.equal(nearestRevivalPotionTarget(game),nearHeavy);medic.dying=false;medic.isDown=false;assert.equal(nearestRevivalPotionTarget(game),nearHeavy);
game.currentDungeon={id:'room',kind:'dungeon'};for(const u of game.squad)u.isPersonalGuard=false;light.isPersonalGuard=true;assert.equal(nearestRevivalPotionTarget(game),light,'a field medic/heavy cannot take priority inside the dungeon');game.player.isDown=true;assert.equal(nearestRevivalPotionTarget(game),null);
// Random selection is uniform by index and stable while the candidate set is unchanged.
for(const [roll,index]of [[0,0],[.34,1],[.999,2]]){
 const members=[unit('mage','MAGE',1),unit('archer','ARCHER',2),unit('light','LIGHT',70)],order=[...members];game=plain(members);let calls=0;game.random=()=>{calls++;return roll;};
 const selected=nearestRevivalPotionTarget(game);assert.equal(selected,members[index]);for(let n=0;n<100;n++)assert.equal(nearestRevivalPotionTarget(game),selected);assert.equal(calls,1,'HUD polling does not reroll');assert.deepEqual(game.squad,order,'selection does not reorder soldiers');
 selected.isDown=false;assert.notEqual(nearestRevivalPotionTarget(game),selected);assert.equal(calls,2,'revival invalidates the choice for the next patient');
 const newMedic=unit('new-medic','MEDIC',79);game.squad.push(newMedic);assert.equal(nearestRevivalPotionTarget(game),newMedic,'a newly eligible medic immediately supersedes the cached other');
}
// Actual controller uses the HUD target, spends one dose, restores full HP and keeps spell cooldowns.
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0,startGameLoop:noop,showToast:noop});g.setupUI();g.activeSlotId=saveSlots.create('REVIVAL PRIORITY TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();Object.assign(g.player,{x:80560,y:79360});g.inBattle=true;g.random=()=>.999;
const actual=(id,cls,distance)=>Object.assign(g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE'}),{id,name:id,isPersonalGuard:true,isDown:true,hp:0,downTimer:45,x:g.player.x+distance,y:g.player.y});
const a=actual('mage','MAGE',2),b=actual('other','LIGHT',60),h=actual('heavy','HEAVY',1),m=actual('medic','MEDIC',70);m.revivalSkillCooldownUntil=g.worldTime+30;g.squad=[a,b,h,m];g.reserves=[];g.revivalPotion=2;
const button=document.getElementById('btn-pad-revive');g.refreshSupplyUI();assert.match(button.title,/medic/);const cooldown=revivalSkillCooldownLeft(g,m);button.click();assert.equal(m.isDown,false);assert.equal(m.hp,m.maxHp);assert.equal(g.revivalPotion,1);assert.equal(revivalSkillCooldownLeft(g,m),cooldown);assert.equal(h.isDown,true);assert.match(button.title,/heavy/);
button.click();assert.equal(h.isDown,false);assert.equal(h.hp,h.maxHp);assert.equal(g.revivalPotion,0);assert.equal(a.isDown,true);assert.equal(b.isDown,true);button.click();assert.equal(g.revivalPotion,0);
g.revivalPotion=1;g.refreshSupplyUI();assert.match(button.title,/other/);button.click();assert.equal(b.isDown,false);assert.equal(b.hp,b.maxHp);assert.equal(a.isDown,true,'random other can be farther than another other');assert.equal(g.revivalPotion,0);
dom.window.close();console.log('PASS: medic/heavy priority and all promoted classes, nearest within priority, range/dead/dying/down/instance guards, random others and stable HUD/cache invalidation, real controller full-HP revival/one dose/no spell cooldown change');
