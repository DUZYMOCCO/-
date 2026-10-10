// Real captain combat, supplies, equipment switching, UI and save round trips.
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {isPlayerCaster,isMage,MAGIC_AFFINITIES,PLAYER_MAGIC_RULES,ensureMana,castPlayerSpell,updateMagic,distributeMagicStones} from '../js/magic-rules.js';
import {supplyLocation} from '../js/supply-rules.js';
import {attributeValues} from '../js/unit-attributes.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,generateRandomDrop}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[name]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('PLAYER MAGIC TEST ONLY').id;game.startFreshGame(false);
const baseline=structuredClone(game.saveGame());
const weapon=(style,upgrade=0)=>generateRandomDrop(0,'normal',{type:'WEAPON',tier:1,weaponStyle:style,upgrade,quality:1,merchant:true,random:()=>.5,id:`player-${style}-${upgrade}`});
function field(style='wand'){
  game.resumeSavedGame(structuredClone(baseline));game.closeStrategyModal();
  Object.assign(game,{squad:[],reserves:[],monsters:[],outposts:[],merchants:[],dungeons:[],civilians:[],projectiles:[],dropsOnField:[],magicBursts:[],magicReserve:0,currentQuest:null,restTimer:0,worldTerrain:{tiles:new Map()},_monsterGrid:null,_hazardClock:0,updateSpawns:noop});
  Object.assign(game.player,{x:83000,y:83000,atkCooldown:0,powerAtkCooldown:0,crit:0});
  game.joystick={active:false,dirX:0,dirY:0};game.camera={x:83000,y:83000};
  game.equipItem(weapon(style));game.player.crit=0;
}
const monster=(dx=180,extra={})=>({type:'goblin',x:game.player.x+dx,y:game.player.y,hp:1e8,maxHp:1e8,def:100000,magicDef:0,atk:1,radius:12,speed:0,atkTimer:1000,exp:10,...extra});
const p=()=>game.player;
// Both weapon styles activate spells for the commander, without a soldier class.
for(const style of ['staff','wand'])for(const affinity of Object.keys(MAGIC_AFFINITIES)){
  field(style);p().magicAffinity=affinity;
  const target=monster(),neighbor=monster(200),outside=monster(330);game.monsters=[target,neighbor,outside];
  assert.equal(isPlayerCaster(p()),true);assert.equal(isMage(p()),false);assert.equal(p().maxMana,100);
  const strength=p().attributeProfile.practice.strength,magic=p().attributeProfile.practice.magic;
  const damage=Math.round(p().magicAttack*MAGIC_AFFINITIES[affinity].damage);
  game.manualAttack();
  assert.equal(target.maxHp-target.hp,damage,'magic uses magic defense instead of physical armor');
  assert.equal(neighbor.maxHp-neighbor.hp,damage);assert.equal(outside.hp,outside.maxHp);
  assert.equal(target._damageOwner,p());assert.equal(target._damageIsPlayer,true);
  assert.equal(p().mana,100-MAGIC_AFFINITIES[affinity].cost);
  assert.equal(p().attributeProfile.practice.strength,strength);assert.ok(p().attributeProfile.practice.magic>magic);
  if(affinity==='ice')assert.equal(target.magicSlowTimer,3);
  if(affinity==='lightning')assert.equal(target.magicStunTimer,.6);
  const hp=target.hp,mp=p().mana;game.manualAttack();assert.equal(target.hp,hp);assert.equal(p().mana,mp,'repeat taps cannot skip cooldown');
}
// One ordinary cast per shared cooldown through actual full-game updates.
field();game.monsters=[monster()];const t=game.monsters[0];game.update(.01);assert.ok(t.hp<t.maxHp);const autoHp=t.hp,autoMp=p().mana;game.manualAttack();assert.equal(t.hp,autoHp);assert.equal(p().mana,autoMp);
game.update(.01);assert.equal(t.hp,autoHp);assert.ok(p().mana<autoMp+1);
p().atkCooldown=0;game.manualAttack();const manualHp=t.hp;game.update(.01);assert.equal(t.hp,manualHp,'manual also gates auto');
// Magic resistance, and unavailable targets/mana, have actual combat effects.
field();const resistant=monster(180,{magicDef:100});game.monsters=[resistant];game.manualAttack();assert.equal(resistant.maxHp-resistant.hp,Math.round(Math.round(p().magicAttack*3.6)/2.2));
field();game.monsters=[monster(PLAYER_MAGIC_RULES.range+1)];const distant=game.monsters[0];assert.equal(castPlayerSpell(game),false);assert.equal(p().mana,100);assert.equal(p().atkCooldown,0);assert.equal(distant.hp,distant.maxHp);
field();game.monsters=[monster()];p().mana=0;const emptyTarget=game.monsters[0];const x=p().x;game.joystick={active:true,dirX:1,dirY:0};game.update(.1);assert.ok(p().x>x,'an exhausted captain can still move');assert.equal(emptyTarget.hp,emptyTarget.maxHp,'no physical fallback');assert.notEqual(p().magicRecovering,true,'player does not enter immobile mage AI');
// Charged spell: real area increase, cost and separate power cooldown, no sword effect.
field('staff');const main=monster(),edge=monster(250);game.monsters=[main,edge];
game.triggerPowerAttack();assert.equal(p().mana,64);assert.equal(p().powerAtkCooldown,8);assert.ok(edge.hp<edge.maxHp);assert.ok(p().atkCooldown>0);assert.equal(game.powerFx?.length||0,0);
const chargedHp=main.hp;game.triggerPowerAttack();assert.equal(main.hp,chargedHp);assert.equal(p().mana,64);
p().powerAtkCooldown=0;p().mana=35;game.triggerPowerAttack();assert.equal(main.hp,chargedHp);assert.equal(p().mana,35);assert.equal(p().powerAtkCooldown,0);
// Outposts are still capturable through manual/automatic magical damage.
for(const auto of [false,true]){
  field();game.outposts=[{id:'player-spell-outpost',x:p().x+200,y:p().y,radius:30,hp:100000,maxHp:100000,type:'MONSTER_LAIR',cleared:false}];
  if(auto)game.update(.01);else game.manualAttack();
  assert.ok(game.outposts[0].hp<100000);assert.ok(p().mana<100);assert.equal(p().attributeProfile.practice.strength,0);
}
// The captain receives kills/experience, rather than a phantom soldier owner.
field();game.monsters=[monster(180,{hp:1,maxHp:1})];const kills=p().minionKills,exp=game.exp;game.manualAttack();assert.equal(p().minionKills,kills+1);assert.ok(game.exp>exp);assert.equal(game.monsters.length,0);
// Supplies, defense HQ regeneration, potion and shared stones include the captain.
field();p().mana=0;updateMagic(game,.25,()=>null);assert.ok(p().mana>0&&p().mana<1);
Object.assign(p(),{x:79360,y:79360,mana:0});updateMagic(game,.25,supplyLocation);assert.equal(p().mana,100);
game.baseRaidActive=true;p().mana=0;updateMagic(game,.25,supplyLocation);assert.ok(p().mana>0&&p().mana<2,'HQ is not infinite mana during defense');game.baseRaidActive=false;
Object.assign(p(),{x:83000,y:83000,mana:0});game.squadPotion=1;assert.equal(game.useSquadPotion(),true);assert.equal(p().mana,100);
p().mana=0;assert.equal(distributeMagicStones(game,20),20);assert.equal(p().mana,20);
// Switching away cannot refill MP; mana/element/training survive a real save.
field();p().mana=7;p().magicAffinity='lightning';game.equipItem(weapon('sword'));assert.equal(isPlayerCaster(p()),false);assert.equal(p().maxMana,0);assert.equal(p().mana,7);
game.monsters=[monster(30,{def:0})];p().atkCooldown=0;p().crit=0;game.manualAttack();assert.ok(game.monsters[0].hp<1e8);assert.equal(p().mana,7);
const nonCasterSave=structuredClone(game.saveGame());game.resumeSavedGame(nonCasterSave);assert.equal(p().mana,7);assert.equal(isPlayerCaster(p()),false);
game.equipItem(weapon('staff'));assert.equal(p().mana,7);assert.equal(p().magicAffinity,'lightning');assert.equal(p().maxMana,100);
const save=structuredClone(game.saveGame());game.resumeSavedGame(save);assert.equal(p().mana,7);assert.equal(p().magicAffinity,'lightning');assert.equal(isPlayerCaster(p()),true);assert.deepEqual(p().attributeProfile,save.player.attributeProfile);
const oldSave=structuredClone(save);delete oldSave.player.mana;delete oldSave.player.magicAffinity;game.resumeSavedGame(oldSave);assert.equal(p().mana,100);assert.equal(p().magicAffinity,'fire');
// Full status UI and shortcut use the same real captain; element change is saved.
game.openStrategyModal(true);document.getElementById('btn-player-stats').click();assert.equal(document.getElementById('commander-record').open,true);
const grid=document.querySelector('.commander-stat-grid');assert.equal(grid.querySelectorAll('dt').length,12);
for(const label of ['HP','攻撃','防御','筋力','魔力','魔法防御','速さ','回避','魔法攻撃','移動','搬送','MP'])assert.ok([...grid.querySelectorAll('dt')].some(n=>n.textContent===label));
const select=document.getElementById('player-magic-affinity');select.value='ice';select.dispatchEvent(new window.Event('change',{bubbles:true}));assert.equal(p().magicAffinity,'ice');assert.equal(saveSlots.get(game.activeSlotId).data.player.magicAffinity,'ice');
assert.match(document.getElementById('player-magic-status').textContent,/隊長.*100\/100.*氷/);assert.match(document.getElementById('btn-pad-attack').textContent,/魔法/);assert.match(document.getElementById('btn-pad-power').textContent.split(/\s+/).join(''),/マナバースト/);
game.equipItem(weapon('sword'));assert.ok(document.getElementById('player-magic-status').classList.contains('hidden'));assert.doesNotMatch(document.getElementById('btn-pad-attack').textContent,/魔法/);
// The five attributes cap at 255, while equipment and spell output keep growing.
game.equipItem(weapon('staff',100));p().level=100000;game.recalcPlayerStats();const before=p().magicAttack;assert.ok(Object.values(attributeValues(p())).every(v=>v<=255));
game.equipItem(weapon('staff',200));assert.ok(p().magicAttack>before);assert.ok(p().magicAttack>255);
console.log('PASS: captain staff/wand spells, four elements, magic resistance, shared auto/manual cooldown, MP/movement, charged spell, outposts, kill credit, supplies, switch/save/legacy, full status shortcut and unlimited equipment');
dom.window.close();
