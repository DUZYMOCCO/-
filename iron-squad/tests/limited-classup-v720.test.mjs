// v7.2.0: 忍者・獣人のクラス1〜3（18職）。系列判定、表示名（番号＋専用名）、狐の魔力段階、手裏剣の数値、引き継ぎ、セーブ。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {LIMITED_CLASSES,LIMITED_ADVANCED_CLASSES,limitedLineOf,createLimitedAlly,updateNinja}=await import('../js/limited-allies.js');
const {classDetailName,passesWalls}=await import('../js/class-up-rules.js');
const {attributeFamily}=await import('../js/unit-attributes.js');
const {soldierAppearanceFamily}=await import('../js/soldier-appearance.js');
const {soldierMeleeSkill,soldierMeleeSkill2}=await import('../js/soldier-melee-skills.js');
const {manaCapacity}=await import('../js/magic-rules.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
const toasts=[];for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=t=>toasts.push(t);
game.setupUI();game.activeSlotId=saveSlots.create('LIMITED CLASSUP TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const LINES={NINJA:['忍者','LIGHT',['中忍','上忍','影頭領']],BEAST_WOLF:['狼獣人','LIGHT',['牙狼','銀狼','天狼']],BEAST_BEAR:['熊獣人','HEAVY',['岩熊','鉄熊','山王']],BEAST_CAT:['猫獣人','LIGHT',['鈴猫','影猫','猫又']],BEAST_FOX:['狐獣人','MAGE',['気狐','天狐','九尾']],BEAST_BIRD:['鳥獣人','ARCHER',['鷹羽','風切','迦楼羅']]};
eq(Object.keys(LIMITED_ADVANCED_CLASSES).length,18,'18 advanced jobs');
eq(Object.keys(LIMITED_CLASSES).join(),'NINJA,BEAST_WOLF,BEAST_BEAR,BEAST_CAT,BEAST_FOX,BEAST_BIRD','base peoples unchanged');
// Old save: base peoples saved before v7.2.0 load and keep their identity.
game.squad=Object.keys(LINES).map((id,i)=>Object.assign(createLimitedAlly(game,id,'旧セーブ'),{isPersonalGuard:true,x:83000+i*20,y:83000}));
const ids=game.squad.map(s=>s.id),names=game.squad.map(s=>s.name);
const old=structuredClone(game.saveGame({immediate:true}));for(const s of old.squad||[])if(ids.includes(s.id))delete s.classTier;
game.resumeSavedGame(old);game.closeStrategyModal?.();game.career.status='enlisted';
const team=ids.map(id=>game.squad.find(s=>s.id===id));ok(team.every(Boolean),'old-save peoples load');
game.awakeningOrbs=1000;game.awakeningGems=100;
for(const [i,[line,[lineName,family,subs]]] of Object.entries(LINES).entries()){
  const s=team[i];eq(s.soldierClass,line);eq(s.name,names[i]);const species=s.species,hp0=s.maxHp,atk0=s.atk,mana0=manaCapacity(s);
  ok(!passesWalls(s,SOLDIER_CLASSES[s.soldierClass]),'base people cannot pass walls');
  for(let tier=1;tier<=3;tier++){
    const orbs=game.awakeningOrbs,gems=game.awakeningGems;toasts.length=0;
    ok(game.promoteSoldier(s.id),`${line} → class ${tier}`);
    const cls=SOLDIER_CLASSES[s.soldierClass];
    eq(cls.lineId,line);eq(cls.classTier,tier);eq(s.classTier,tier);eq(cls.name,`${lineName} クラス${tier}`,'narrow labels show the number only');
    eq(classDetailName(cls),`${lineName} クラス${tier} · ${subs[tier-1]}`,'detail/notice adds the own name');
    ok(toasts.some(t=>t.includes(`【${lineName} クラス${tier} · ${subs[tier-1]}】`)),'notice names the job');
    const cost={1:[1,0],2:[3,0],3:[5,1]}[tier];if(s.talent==='TALENTED')cost[0]=[1,2,4][tier-1];
    eq(orbs-game.awakeningOrbs,cost[0]);eq(gems-game.awakeningGems,cost[1]);
    eq(limitedLineOf(s),line);eq(attributeFamily(s),family);eq(soldierAppearanceFamily(s.soldierClass),family,'body shape keeps the people family');
    eq(s.species,species);eq(s.name,names[i]);eq(s.baseClassId,family);ok(passesWalls(s,cls),'class 1+ pass walls');
  }
  ok(s.maxHp>hp0*1.8&&s.atk>atk0*1.8,`${line} grows like a human class 3 (${hp0}->${s.maxHp}, ${atk0}->${s.atk})`);
  ok(!game.promoteSoldier(s.id),'class 3 is final');
  ok(game.buildSoldierDetailHtml(s).includes(`${lineName} クラス3 · ${subs[2]}`),'detail shows the own name');
  if(family==='MAGE')eq(manaCapacity(s),mana0+120,'fox mana grows by tier like human mages');
  if(line==='NINJA'){eq(soldierMeleeSkill(s),null);eq(soldierMeleeSkill2(s),null,'ninja keeps no melee skill after class-up');}
}
// Ninja keeps its shuriken and reads the job's numbers.
const ninja=team[0];Object.assign(ninja,{x:83000,y:83000,atkCooldown:0,speed:0});Object.assign(game.player,{x:83000,y:83000});game.currentDungeon=null;game.squad=[ninja];game.monsters=[{x:83200,y:83000,type:'goblin',hp:1e5,maxHp:1e5,atk:1,speed:0,radius:12,atkTimer:0}];game.rebuildMonsterSpatial?.();game.projectiles=[];game.restTimer=0;
ok(updateNinja(game,ninja,.01,game.platoons[0]),"promoted ninja runs the ninja AI");
eq(game.projectiles[0]?.type,'NINJA_SHURIKEN');eq(game.projectiles[0].damage,Math.round(ninja.atk*.7));
ok(ninja.atkCooldown<1.7,'shuriken cooldown shortens with class (1.0 base)');
// Save round trip keeps the promoted jobs.
game.squad=team;const data=structuredClone(game.saveGame({immediate:true}));game.squad=[];game.resumeSavedGame(data);
for(const [i,id] of ids.entries()){const s=[...game.squad,...(game.reserves||[])].find(u=>u.id===id);ok(s,'promoted ally saved');eq(SOLDIER_CLASSES[s.soldierClass].classTier,3);eq(s.name,names[i]);}
// Roster (narrow) shows the number only.
game.squad=team;game.openStrategyModal(true);game._selectStratTab('troops');game.renderStrategyUI();
const roster=document.getElementById('squad-roster-list')?.textContent||'';ok(roster.includes('忍者 クラス3')&&!roster.includes('影頭領'),'roster shows number only');
console.log(`PASS limited-classup-v720 (${checks} checks)`);
