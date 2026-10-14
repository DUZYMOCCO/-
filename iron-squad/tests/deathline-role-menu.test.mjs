import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {deathlineSkillPool,chooseDeathlineSkill,normalizeDeathlineSkills} from '../js/deathline-rules.js';
import {attributeFamily,rollAttributeProfile} from '../js/unit-attributes.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/world.js';
import {revivalCooldownOf} from '../js/casualty-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES,generateRandomDrop}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText','updateSpawns'])g[method]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('DEATHLINE ROLE AND MERCHANT MENU TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const initial=structuredClone(g.saveGame({immediate:true})),rng=Math.random;
const soldier=cls=>{const base=SOLDIER_CLASSES[cls].baseClassId||cls,u=g.createNewSoldier(null,{classKey:base,talent:'AVERAGE',attributeProfile:rollAttributeProfile(base,'AVERAGE',()=>.5,true)});u.soldierClass=cls;g.recalcSoldierStats(u);return u;};
const popup=()=>document.getElementById('merchant-shop-popup');
const enter=section=>popup().querySelector(`[data-merchant-section="${section}"]`).click();
const back=()=>popup().querySelector('.transfer-popup-close-btn').click();
try{
  // Every standard/promoted class, every part of the random pool, max four unique skills.
  const classes=Object.keys(SOLDIER_CLASSES).filter(id=>['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'].includes(SOLDIER_CLASSES[id].baseClassId||id));
  assert.ok(classes.length>=20);
  for(const cls of classes)for(let seed=0;seed<100;seed++){
    const u={soldierClass:cls,deathlineSkills:[]},family=attributeFamily(u);
    for(let n=0;n<4;n++){const skill=chooseDeathlineSkill(u,()=>seed/100);assert.ok(skill);u.deathlineSkills.push(skill);}
    assert.equal(new Set(u.deathlineSkills).size,4);assert.equal(chooseDeathlineSkill(u),null);
    assert.equal(u.deathlineSkills.includes('MIRACLE_PRAYER'),family==='MEDIC');
    assert.equal(u.deathlineSkills.includes('DEADLY_FOCUS'),family==='ARCHER');
    if(['MEDIC','MAGE'].includes(family))assert.equal(u.deathlineSkills.includes('BLOOD_RAGE'),false);
  }
  // Native rescue awakening also recognizes promoted classes.
  Math.random=()=>0;
  for(const [cls,first] of [['IMMORTAL_AEGIS','IRON_RESOLVE'],['VOID_EDGE','PHANTOM_STEP'],['STAR_HUNTER','DEADLY_FOCUS'],['ARCHANGEL','MIRACLE_PRAYER'],['ARCANE_SOVEREIGN','PHANTOM_STEP']]){
    const u=soldier(cls);u.deathlineSkills=[];assert.equal(g.tryAwakenDeathlineSkill(u).id,first);
    for(let n=0;n<3;n++)assert.ok(g.tryAwakenDeathlineSkill(u));assert.equal(g.tryAwakenDeathlineSkill(u),null);
    assert.ok(u.deathlineSkills.every(id=>deathlineSkillPool(u).includes(id)));
  }
  Math.random=rng;
  // Keep every valid acquired skill, replace invalid skills once, and preserve injury/down state.
  const light=soldier('LIGHT');light.deathlineSkills=['PHANTOM_STEP','MIRACLE_PRAYER'];light.hp=light.maxHp*.37;const fraction=light.hp/light.maxHp;g.recalcSoldierStats(light);
  assert.deepEqual(light.deathlineSkills,['PHANTOM_STEP','SURVIVAL_INSTINCT']);assert.equal(light.deathlineSkills.length,2);assert.ok(Math.abs(light.hp/light.maxHp-fraction)<1e-9);
  const mage=soldier('ARCANE_SOVEREIGN');mage.deathlineSkills=['BLOOD_RAGE','DEADLY_FOCUS','MIRACLE_PRAYER','PHANTOM_STEP'];g.recalcSoldierStats(mage);assert.equal(mage.deathlineSkills.length,4);assert.deepEqual(new Set(mage.deathlineSkills),new Set(deathlineSkillPool(mage)));
  const down=soldier('VOID_EDGE');down.deathlineSkills=['MIRACLE_PRAYER'];down.isDown=true;down.hp=0;g.recalcSoldierStats(down);assert.equal(down.hp,0);assert.equal(down.deathlineSkills.length,1);
  const hero={isHero:true,deathlineSkills:['MIRACLE_PRAYER']};assert.equal(normalizeDeathlineSkills(hero),false);assert.deepEqual(hero.deathlineSkills,['MIRACLE_PRAYER']);
  g.squad=[light,mage];g.reserves=[down];const stored=structuredClone(g.saveGame({immediate:true}));
  for(let n=0;n<3;n++){g.resumeSavedGame(structuredClone(n?g.saveGame({immediate:true}):stored));assert.deepEqual(g.squad.find(u=>u.id===light.id).deathlineSkills,light.deathlineSkills);assert.deepEqual(g.reserves.find(u=>u.id===down.id).deathlineSkills,down.deathlineSkills);}
  // A legacy save is repaired on load (both deployed soldiers and reserves), without re-awakening.
  const legacy=structuredClone(g.saveGame({immediate:true}));legacy.squad.find(u=>u.id===light.id).deathlineSkills=['PHANTOM_STEP','MIRACLE_PRAYER'];legacy.reserves.find(u=>u.id===down.id).deathlineSkills=['MIRACLE_PRAYER'];
  g.resumeSavedGame(legacy);assert.equal(g.squad.find(u=>u.id===light.id).deathlineSkills.includes('MIRACLE_PRAYER'),false);assert.equal(g.reserves.find(u=>u.id===down.id).deathlineSkills.includes('MIRACLE_PRAYER'),false);
  // A real healer keeps the useful healing and resurrection modifiers.
  const medic=soldier('MEDIC'),baseHeal=medic.healPower;medic.deathlineSkills=['MIRACLE_PRAYER'];g.recalcSoldierStats(medic);assert.ok(medic.healPower>baseHeal);assert.equal(revivalCooldownOf(medic),24);
  // The end-of-wave route uses the same role filter as rescue awakening.
  const promoted=['IMMORTAL_AEGIS','VOID_EDGE','STAR_HUNTER','ARCHANGEL','ARCANE_SOVEREIGN'].map(soldier);g.squad=promoted;g.reserves=[];g.restTimer=0;
  for(const u of promoted){u.deathlineSkills=[];u.deathlineDownHistory=[{phase:g.phase,downs:10}];u.phaseActivity={combatActions:1,healingDone:0,downs:10};}
  g.completePhase();for(const u of promoted){assert.equal(u.deathlineSkills.length,1);assert.ok(deathlineSkillPool(u).includes(u.deathlineSkills[0]));}
  // Native shooting at a distance only Deadeye can reach, for bow/crossbow/cannon.
  const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y);
  for(const style of ['bow','crossbow','cannon']){
    g._merchantShopClose?.();g.closeStrategyModal();Object.assign(g,{inBattle:true,restTimer:0,currentDungeon:null,currentQuest:null,squad:[],reserves:[],outposts:[],merchants:[],gateGuards:[],civilians:[],medicalPosts:[],projectiles:[],powerFx:[],_monsterGrid:null,_civSpawnClock:-1e9});
    Object.assign(g.player,{x,y,hp:g.player.maxHp,isDown:false,dead:false,atkCooldown:1e6});g.joystick={active:false,dirX:0,dirY:0};
    const u=soldier('ARCHER'),w=generateRandomDrop(0,'normal',{tier:1,type:'WEAPON',weaponStyle:style,merchant:true,random:()=>.5});w.weaponTraits.length=1;u.equipped={weapon:w};u.weapon=w;u.deathlineSkills=[];g.recalcSoldierStats(u);
    Object.assign(u,{x,y,hp:u.maxHp,isPersonalGuard:true,atkCooldown:0,speed:0,weaponSkillCooldown:1e6,ammo:10});g.squad=[u];const before=g.combatProfileFor(u,w),dist=Math.max(SOLDIER_CLASSES.ARCHER.range,before.reach)*1.15;
    const enemy={id:'range-'+style,type:'goblin',x:x+dist,y,hp:1e10,maxHp:1e10,radius:8,def:0,atk:0,speed:0,atkTimer:1e6};g.player.x=x+dist/2;g.monsters=[enemy];g.update(.001);assert.equal(u.ammo,10,'without Deadeye target remains outside range');
    u.deathlineSkills=['DEADLY_FOCUS'];g.recalcSoldierStats(u);Object.assign(u,{x,y,speed:0,atkCooldown:0,ammo:10});g.update(.001);assert.equal(u.ammo,9,'Deadeye allows real shooting at +15% distance');assert.ok(g.projectiles.length>0);assert.ok(Math.abs(g.combatProfileFor(u,w).reach/before.reach-1.3)<1e-9);
    u.ammo=0;assert.equal(g.combatProfileFor(u,w).reach,65,'no extra melee reach when out of ammo');
    const playerProfile=g.combatProfileFor({...u,isPlayer:true},w,true);assert.equal(playerProfile.sidearm,true);
  }
  // The first shop page contains exactly the requested three categories, no product/service wall.
  g.resumeSavedGame(initial);g.closeStrategyModal();const m=g.merchants[0];Object.assign(g.player,{x:m.x,y:m.y,hp:1});g.gold=100000;g.squadPotion=0;g.revivalPotion=0;g.openMerchantShop(m);
  assert.equal(popup().dataset.section,'home');assert.deepEqual([...popup().querySelectorAll('.merchant-main-menu strong')].map(n=>n.textContent),['回復','取引','セーブ']);assert.equal(popup().querySelector('[data-buy],.merchant-heal-button,.merchant-checkpoint'),null);
  enter('recovery');assert.equal(popup().querySelector('#merchant-recipient,.merchant-checkpoint'),null);popup().querySelector('.merchant-heal-button').click();assert.equal(popup().dataset.section,'recovery');assert.equal(g.gold,99850);assert.equal(g.player.hp,g.player.maxHp);
  popup().querySelector('.merchant-potion-button').click();assert.equal(g.squadPotion,1);back();assert.equal(popup().dataset.section,'home');assert.equal(popup().classList.contains('hidden'),false);
  enter('trade');const s=g.squad.find(u=>!u.dead);s.isPersonalGuard=true;g._merchantShopRefresh();let select=popup().querySelector('#merchant-recipient');select.value=s.id;select.dispatchEvent(new window.Event('change'));const tab=popup().querySelector('[data-shop-group][aria-selected="true"]').dataset.shopGroup;
  popup().querySelector('.transfer-popup-container').scrollTop=111;const stale=popup().querySelector('[data-buy]'),gold=g.gold;back();stale.click();assert.equal(g.gold,gold,'detached trade button cannot buy from another category');
  enter('save');assert.equal(popup().querySelector('.merchant-heal-button,#merchant-recipient'),null);assert.equal(popup().querySelector('[data-supply="potion"]').classList.contains('hidden'),true);
  const save=popup().querySelector('[data-supply="save"]');save.focus();save.click();document.querySelector('[data-checkpoint-choice="overwrite"]').click();await new Promise(resolve=>window.setTimeout(resolve,460));assert.equal(document.activeElement,save);g.gold=2;popup().querySelector('[data-supply="load"]').click();document.querySelector('[data-checkpoint-choice="load"]').click();assert.equal(g.gold,gold);assert.equal(popup().dataset.section,'save');
  const clock=g.worldTime;g.update(1);assert.equal(g.worldTime,clock,'loading still pauses in the merchant menu');back();enter('trade');assert.equal(popup().querySelector('#merchant-recipient').value,s.id);assert.equal(popup().querySelector('[aria-selected="true"]').dataset.shopGroup,tab);assert.equal(popup().querySelector('.transfer-popup-container').scrollTop,111);
  back();back();assert.equal(popup().classList.contains('hidden'),true);assert.equal(g._merchantShopClose,null);
  console.log(`PASS: ${classes.length} base/promoted classes × 100 random rolls, role-valid awakening on both routes, legacy repair and repeated saves, HP/down/hero preservation, healer effects, native extended shooting with all three weapons, three-category merchant navigation/transactions/checkpoint/pause/recipient/tab/scroll`);
}finally{Math.random=rng;g._merchantShopClose?.();dom.window.close();}
