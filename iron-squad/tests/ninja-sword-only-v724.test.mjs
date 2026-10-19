// v7.2.4: 忍者の系列（忍者・中忍・上忍・影頭領）は剣だけを持つ。防具は筋力の条件のまま。古いセーブの剣以外は共有箱へ戻す。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js?v=338');
const W=await import('../js/weapon-requirements.js?v=338');
const {distributeSharedBoxToSoldiers}=await import('../js/economy-rules.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
const toasts=[];for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=t=>toasts.push(t);
game.setupUI();game.activeSlotId=saveSlots.create('NINJA SWORD ONLY TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const STYLES=['sword','spear','hammer','axe','bow','crossbow','cannon','wand','staff'];
const strong=s=>{s.attributeProfile.innate.strength=400;game.recalcSoldierStats(s);return s;};
const ninja=(id='NINJA')=>{const s=createLimitedAlly(game,'NINJA','test');s.soldierClass=id;return strong(s);};
const weapon=(style,extra={})=>({id:`w-${style}-${Math.random().toString(36).slice(2)}`,type:'WEAPON',weaponStyle:style,tier:1,name:`試しの${style}`,baseName:`試しの${style}`,stats:{atk:20},baseStats:{atk:20},...extra});
// The rule: swords only for the whole ninja line; armour still by strength; everybody else unchanged.
for(const id of ['NINJA','NINJA_CHUNIN','NINJA_JONIN','NINJA_KASHIRA']){
 const s=ninja(id);
 for(const style of STYLES)eq(W.canUseEquipment(s,weapon(style)),style==='sword',`${id} ${style}`);
 for(const type of ['SHIELD','ARMOR','HELMET','GLOVES','LEGS'])ok(W.canUseEquipment(s,{type,tier:5}),`${id} ${type} by strength`);
 eq(W.equipmentRequirementText(s,weapon('spear')),'忍びは刀のみを携える');ok(/req-short/.test(W.equipmentRequirementHtml(s,weapon('bow'))),'shown as unavailable');
 ok(!/忍び/.test(W.equipmentRequirementText(s,weapon('sword'))),'sword shows the usual strength line');
 eq(W.preferredWeaponStyle(s,1,'spear'),'sword');eq(game.createSupplyEquipment('WEAPON',s,1).weaponStyle,'sword','issued weapons are swords');
 eq(game.equipmentValueFor(s,weapon('cannon'),'weapon'),-Infinity,'auto equipment / drops never pick other styles');
}
{const weak=ninja();weak.attributeProfile.innate.strength=1;game.recalcSoldierStats(weak);ok(W.canUseEquipment(weak,{type:'SHIELD',tier:1}));ok(!W.canUseEquipment(weak,{type:'ARMOR',tier:10}),'heavy armour still needs strength');}
for(const line of ['BEAST_WOLF','BEAST_BEAR','BEAST_CAT','BEAST_FOX','BEAST_BIRD']){const s=strong(createLimitedAlly(game,line,'test'));for(const style of STYLES)ok(W.canUseEquipment(s,weapon(style)),`${line} ${style} unchanged`);}
for(const key of ['LIGHT','HEAVY','ARCHER']){const s=strong(game.createNewSoldier(null,{classKey:key}));ok(W.canUseEquipment(s,weapon('bow'))&&W.canUseEquipment(s,weapon('spear')),`${key} unchanged`);}
{const p={...game.player,soldierClass:'NINJA'};ok(W.weaponStyleAllowed(p,weapon('spear'))===true||!game.player.soldierClass,'commander unchanged');}
// Every equipment path refuses a non-sword.
const kage=ninja('NINJA_JONIN');game.squad=[kage];game.reserves=[];
const spear=weapon('spear'),sword=weapon('sword');game.inventory=[spear,sword];
eq(game.giveItemToSoldier(kage.id,spear),false,'hand-over refused');ok(toasts.at(-1).includes('忍びは刀のみを携える'),'short in-world reason');
ok(game.inventory.includes(spear),'refused item stays in the bag');
ok(game.giveItemToSoldier(kage.id,sword)!==false,'sword hand-over works');eq(kage.equipped.weapon,sword);
{const box=[weapon('axe'),weapon('bow')];const bare=ninja();bare.equipped.weapon=null;bare.weapon=null;
 distributeSharedBoxToSoldiers(box,[bare],noop,(u,i,k)=>game.equipmentValueFor(u,i,k));eq(bare.equipped.weapon,null,'shared box: nothing but swords');
 const box2=[weapon('axe'),weapon('sword')];distributeSharedBoxToSoldiers(box2,[bare],noop,(u,i,k)=>game.equipmentValueFor(u,i,k));eq(bare.equipped.weapon?.weaponStyle,'sword','shared box sword is taken');}
{const bare=ninja();bare.equipped.weapon=null;bare.weapon=null;bare.gold=1e6;game.squad=[bare];game.supplyMissingEquipment();ok(!bare.equipped.weapon||bare.equipped.weapon.weaponStyle==='sword','supply issues swords only');}
// Merchant purchase for a ninja: the buy button carries the same rule (canUseEquipment) — checked through the shared rule above;
// the field pickup uses equipmentValueFor (−Infinity for other styles).
// Old save: a ninja with a spear loads with it in the shared box and a sword in hand; nothing is lost.
const weaponIds=()=>new Set([...(game.inventory||[]),...(game.sharedEquipBox||[]),...[...game.squad,...game.reserves].flatMap(s=>Object.values(s.equipped||{}).filter(i=>i?.type==='WEAPON'))].filter(i=>i?.type==='WEAPON').map(i=>i.id));
for(const withBoxSword of [false,true]){
 const a=ninja('NINJA_KASHIRA'),b=ninja('NINJA'),oldSpear=weapon('spear',{upgrade:3}),oldBow=weapon('bow'),boxSword=weapon('sword',{stats:{atk:60},baseStats:{atk:60}});
 a.equipped.weapon=oldSpear;a.weapon=oldSpear;b.equipped.weapon=oldBow;b.weapon=oldBow;
 game.squad=[a];game.reserves=[b];game.sharedEquipBox=withBoxSword?[boxSword]:[];game.inventory=[];
 const before=weaponIds();const save=structuredClone(game.saveGame({immediate:true}));
 game.resumeSavedGame(save);game.closeStrategyModal?.();
 const pool=[...game.squad,...game.reserves],A=pool.find(s=>s.id===a.id),B=pool.find(s=>s.id===b.id);
 ok(A&&B,'both ninjas still here');
 ok(game.sharedEquipBox.some(i=>i.id===oldSpear.id&&i.upgrade===3),'spear back in the shared box with its upgrade');ok(game.sharedEquipBox.some(i=>i.id===oldBow.id),'bow back in the shared box');
 eq(A.equipped.weapon?.weaponStyle,'sword');eq(B.equipped.weapon?.weaponStyle,'sword');eq(A.weapon,A.equipped.weapon);
 if(withBoxSword)ok([A,B].some(s=>s.equipped.weapon.id===boxSword.id)&&!game.sharedEquipBox.some(i=>i.id===boxSword.id),'the shared-box sword is drawn out');
 const after=weaponIds();for(const id of before)ok(after.has(id),'no weapon lost');
 ok(!game.sharedEquipBox.some(i=>i.weaponStyle==='sword'&&(i.id===A.equipped.weapon.id||i.id===B.equipped.weapon.id)),'not duplicated');
 const again=structuredClone(game.saveGame({immediate:true}));game.resumeSavedGame(again);eq(game.sharedEquipBox.filter(i=>i.id===oldSpear.id).length,1,'second load changes nothing');
}
console.log(`PASS ninja-sword-only-v724 (${checks} checks)`);
