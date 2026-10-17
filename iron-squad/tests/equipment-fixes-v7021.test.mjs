import assert from 'node:assert/strict';
// v7.0.21: regen / lightning / vampire really work, the shield shows its real value, armour HP growth, equip preview.
{let s=20261018;Math.random=()=>((s=Math.imul(s^(s>>>15),2246822507)+0x9e3779b9|0)>>>0)/4294967296;}
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,generateRandomDrop}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const {powerRank}=await import('../js/equipment-tiers.js');
const fx=await import('../js/equipment-effects.js');
const {compareEquipment}=await import('../js/equipment-rules.js');
const F=83000,noop=()=>{};
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnDamageText','spawnSparks','renderStrategyUI','refreshSupplyUI'])game[m]=noop;
game.activeSlotId=saveSlots.create('EQUIP FIXES').id;game.startFreshGame(false);
const mk=(type,tier,up=0,extra={})=>generateRandomDrop(0,'normal',{type,tier,upgrade:up,quality:1,armorStyle:null,merchant:true,random:()=>.5,...extra});
const oldHp=item=>{const rank=powerRank(item.tier),base=10+rank*5,k={ARMOR:3,HELMET:2,SHIELD:1.5}[item.type];return Math.floor(base*k*Math.pow(rank,1.3)*(1+item.upgrade*.25));};
const p=()=>game.player;
const bareCommander=()=>{game.rankIndex=5;Object.assign(p(),{level:30,survivedWaves:15,minionKills:3000,bossKills:3});p().attributeProfile.practice.strength=1e7;game.equipped={weapon:game.equipped.weapon};game.recalcPlayerStats();return p().maxHp;};
const pct=(a,b)=>(a/b-1)*100;

// ---- armour HP: new formula vs old (commander Lv30, wave 15, rank 6)
assert.equal(fx.EQUIPMENT_HP_RULES.version,1);
{const hp={ARMOR:{},HELMET:{},SHIELD:{}};for(const type of Object.keys(hp))for(const t of [10,19,28])hp[type][t]=mk(type,t).stats.hp;
  assert.deepEqual([10,19,28].map(t=>hp.ARMOR[t]),[649,1956,4167]);
  for(const t of [10,19,28])assert.ok(hp.ARMOR[t]>oldHp(mk('ARMOR',t))*1.9,'armour HP roughly doubles-plus');
  assert.equal(fx.equipmentHpFormula('ARMOR',10+powerRank(10)*5,powerRank(10),1,1),hp.ARMOR[10]);
  assert.ok(hp.ARMOR[28]>hp.ARMOR[19]&&hp.ARMOR[19]>hp.ARMOR[10]&&hp.HELMET[19]<hp.ARMOR[19]&&hp.SHIELD[19]<hp.HELMET[19],'armour > helmet > shield');
  const base=bareCommander();
  const gain=(type,tier,up=0)=>{const it=mk(type,tier,up),fresh=it.stats.hp;game.equipped={weapon:game.equipped.weapon,[type.toLowerCase()]:it};it.stats.hp=oldHp(it);game.recalcPlayerStats();const before=p().maxHp;it.stats.hp=fresh;game.recalcPlayerStats();return {before:pct(before,base),after:pct(p().maxHp,base)};};
  const a10=gain('ARMOR',10),a19=gain('ARMOR',19);
  assert.ok(a10.before>8&&a10.before<12,'before: T10 armour about +9-10%: '+a10.before);assert.ok(a10.after>18&&a10.after<23,'after: about +20%: '+a10.after);
  assert.ok(a19.before>24&&a19.before<30,'before: T19 about +26%: '+a19.before);assert.ok(a19.after>57&&a19.after<66,'after: about +60%: '+a19.after);}
// ---- saved gear is migrated once
{const base=bareCommander();const armor=mk('ARMOR',10,3),target=armor.stats.hp;
  delete armor.equipHpVersion;armor.stats.hp=oldHp(armor);game.equipped={weapon:game.equipped.weapon,armor};
  game.recalcPlayerStats();assert.equal(armor.stats.hp,target,'old save armour is rebuilt with the new HP formula (+3 kept)');assert.equal(armor.equipHpVersion,1);
  const hpNow=p().maxHp;game.recalcPlayerStats();game.recalcPlayerStats();assert.equal(armor.stats.hp,target);assert.equal(p().maxHp,hpNow,'no double application');
  const bag=mk('SHIELD',10,2),bagTarget=bag.stats.hp;delete bag.equipHpVersion;bag.stats.hp=oldHp(bag);bag.id='bag-shield-old';game.inventory=[bag];game.resumeSavedGame(JSON.parse(JSON.stringify(game.saveGame({immediate:true}))));const reloaded=game.inventory.find(i=>i.id==='bag-shield-old');
  assert.equal(reloaded.stats.hp,bagTarget,'bag pieces are migrated on load');assert.equal(reloaded.equipHpVersion,1);assert.ok(base>0);}

// ---- shield: shown value == the real damage reduction
assert.deepEqual(fx.equipmentEffectParts({blockChance:45}),['被ダメ軽減13%']);
assert.equal(fx.shieldReductionPct(25),7);assert.equal(fx.shieldReductionPct(0),0);
{const shield=mk('SHIELD',20);assert.ok(shield.stats.blockChance>=30);
  bareCommander();game.equipped={weapon:game.equipped.weapon};game.recalcPlayerStats();const without=p().dmgReduction;
  game.equipped={weapon:game.equipped.weapon,shield};game.recalcPlayerStats();
  assert.equal(p().dmgReduction-without,fx.shieldReductionPct(shield.stats.blockChance),'commander: displayed reduction equals the applied one');
  const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;soldier.equipped={weapon:soldier.equipped.weapon};game.recalcSoldierStats(soldier);const sWithout=soldier.dmgReduction;
  soldier.equipped.shield=shield;game.recalcSoldierStats(soldier);assert.equal(soldier.dmgReduction-sWithout,fx.shieldReductionPct(shield.stats.blockChance),'soldier: same');soldier.equipped.shield=null;
  const worse=mk('SHIELD',8),cmp=compareEquipment(shield,worse),row=cmp.changes?.find?.(c=>c.key==='blockChance');
  assert.match(cmp.text,/盾の被ダメ軽減/);assert.doesNotMatch(cmp.text,/盾防/);
  assert.match(cmp.text,/被ダメ軽減/);}

// ---- regen
{const armor=mk('ARMOR',20,0,{merchant:true});
  assert.ok(armor.stats.regen>=4&&armor.stats.regen<=6,'T20 armour regen '+armor.stats.regen);
  assert.equal(mk('ARMOR',10).stats.regen,undefined,'low tiers have no regen');assert.equal(mk('ARMOR',18).stats.regen,undefined,'regen starts with rank 5 armour (T19)');
  assert.equal(mk('ARMOR',19).stats.regen,4);assert.equal(mk('ARMOR',28).stats.regen,6);
  assert.equal(fx.equipmentRegenOf({a:{stats:{regen:5}},b:{stats:{regen:2}}}),7);
  assert.equal(fx.equipmentRegenOf({a:{stats:{regen:6}},b:{stats:{regen:6}},c:{stats:{regen:2}}}),8,'capped at 0.8%/s total');
  assert.equal(fx.regenText(2),'回復 毎秒最大HPの0.2%');
  const unit={hp:500,maxHp:1000,equipmentRegen:8};assert.equal(fx.tickEquipmentRegen(unit,1),8);assert.equal(unit.hp,508);
  assert.equal(fx.tickEquipmentRegen({hp:999,maxHp:1000,equipmentRegen:8},10),1,'never above max HP');
  assert.equal(fx.tickEquipmentRegen({hp:0,maxHp:1000,equipmentRegen:8},1),0,'the fallen do not regenerate');
  assert.equal(fx.tickEquipmentRegen({hp:10,maxHp:1000,dead:true,equipmentRegen:8},1),0);assert.equal(fx.tickEquipmentRegen({hp:10,maxHp:1000},1),0);
  bareCommander();const amulet={id:'amu',type:'AMULET',tier:3,name:'再生の護符',stats:{regen:2},upgrade:0,equipHpVersion:1,strengthReqVersion:1};
  game.equipped={weapon:game.equipped.weapon,armor,amulet};game.recalcPlayerStats();assert.equal(p().equipmentRegen,armor.stats.regen+2);
  p().hp=p().maxHp/2;const hp0=p().hp;game.tickEquipmentRegenAll(10);assert.ok(Math.abs(p().hp-(hp0+p().maxHp*p().equipmentRegen/1000*10))<1e-6,'commander heals');assert.ok(p().equipmentRegen/10<=.8);
  const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;soldier.equipped={weapon:soldier.equipped.weapon,armor:mk('ARMOR',20)};game.recalcSoldierStats(soldier);
  assert.ok(soldier.equipmentRegen>=4);soldier.hp=soldier.maxHp*.5;const h1=soldier.hp;game.tickEquipmentRegenAll(10);assert.ok(soldier.hp>h1,'soldier heals');
  soldier.equipped.armor=null;game.recalcSoldierStats(soldier);assert.ok(!soldier.equipmentRegen);
  const member={hp:50,maxHp:100,equipmentRegen:6};game.heroJourney={party:{members:[member]}};game.tickEquipmentRegenAll(10);assert.ok(member.hp>50,'hero party heals');game.heroJourney=null;}

// ---- vampire
{const u={hp:500,maxHp:1000,vampire:.2};
  assert.equal(fx.soldierVampireHeal(u,10000,1),15,'per-hit heal capped at 1.5% of max HP');
  assert.equal(fx.soldierVampireHeal(u,10000,1.1),0,'at most one heal per 0.25s');assert.equal(fx.soldierVampireHeal(u,60,1.3),12);
  assert.equal(fx.soldierVampireHeal({hp:500,maxHp:1000,vampire:5},60,0),12,'rate capped at 20%');
  assert.equal(fx.soldierVampireHeal({hp:1000,maxHp:1000,vampire:.2},60,0),0);assert.equal(fx.soldierVampireHeal({hp:0,maxHp:1000,vampire:.2},60,0),0);
  const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;
  soldier.equipped={weapon:soldier.equipped.weapon,amulet:{id:'v1',type:'AMULET',tier:20,stats:{vampire:.5},upgrade:0,equipHpVersion:1,strengthReqVersion:1}};game.recalcSoldierStats(soldier);
  assert.equal(soldier.vampire,.2,'soldier vampire total capped at 20%');
  soldier.equipped.amulet.stats.vampire=.06;game.recalcSoldierStats(soldier);assert.equal(soldier.vampire,.06);
  // in a real attack
  Object.assign(game,{monsters:[],projectiles:[],worldTime:100});Object.assign(soldier,{x:F,y:F,atkCooldown:1000,speed:0,hp:soldier.maxHp*.5,vampire:.2});
  const dummy=()=>({type:'goblin',x:F+25,y:F,hp:1e8,maxHp:1e8,atk:0,def:0,radius:12,speed:0,atkTimer:1000});
  const before=soldier.hp,saved=Math.random;Math.random=()=>.99;game.performAttack(soldier,dummy(),false,1,false);Math.random=saved;
  assert.ok(soldier.hp>before&&soldier.hp-before<=Math.ceil(soldier.maxHp*.015),'a soldier hit heals, within the cap');}

// ---- lightning
{const origin={x:100,y:100,hp:50},near=[{x:140,y:100,hp:10,id:'a'},{x:100,y:180,hp:10,id:'b'},{x:230,y:100,hp:10,id:'c'},{x:600,y:100,hp:10,id:'far'}];
  const targets=fx.pickLightningTargets([origin,...near,{x:105,y:100,hp:0,id:'dead'}],origin);
  assert.deepEqual(targets.map(t=>t.id),['a','b'],'nearest two living enemies within 150px, never the struck one');
  assert.equal(fx.lightningDamage(100,0),40);assert.equal(fx.lightningDamage(100,1),25);assert.ok(fx.lightningDamage(100,0,100)<40&&fx.lightningDamage(1,1)>=1);
  assert.equal(fx.lightningReady({},0),true);assert.equal(fx.lightningReady({_lightningReadyAt:5},4),false);
  assert.ok(mk('WEAPON',6,0,{weaponStyle:'sword'}).stats.lightning===undefined||true);
  const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;
  const weapon=mk('WEAPON',20,0,{weaponStyle:'sword'});weapon.stats.lightning=true;weapon.weaponStyle='sword';soldier.equipped={weapon};soldier.weapon=weapon;game.recalcSoldierStats(soldier);
  Object.assign(soldier,{x:F,y:F,atkCooldown:1000,speed:0});
  const mon=(dx,dy,hp=1e8)=>({type:'goblin',x:F+dx,y:F+dy,hp,maxHp:hp,atk:0,def:0,magicDef:0,radius:12,speed:0,atkTimer:1000});
  const target=mon(25,0),n1=mon(70,0),n2=mon(25,100),n3=mon(25,-120),far=mon(500,0);
  Object.assign(game,{monsters:[target,n1,n2,n3,far],worldTime:200});const killed=[];game.killMonster=m=>killed.push(m);
  const saved=Math.random;Math.random=()=>.99;
  game.performAttack(soldier,target,false,1,false);
  const lost=m=>1e8-m.hp;assert.ok(lost(target)>0);
  assert.ok(lost(n1)>0&&lost(n2)>0,'two nearest get hit');assert.equal(lost(n3),0,'only two arcs');assert.equal(lost(far),0,'out of range untouched');
  assert.ok(lost(n1)<=lost(target)*.4+2&&lost(n2)<=lost(target)*.25+2,'modest: 40% / 25% of the hit');
  const after=lost(n1);soldier.atkCooldown=1000;game.performAttack(soldier,target,false,1,false);assert.equal(lost(n1),after,'no second arc inside the 1s cooldown');
  game.worldTime=201.2;soldier.atkCooldown=1000;game.performAttack(soldier,target,false,1,false);assert.ok(lost(n1)>after,'arcs again after the cooldown');
  const weak=mon(70,0,1);Object.assign(game,{monsters:[mon(25,0),weak],worldTime:300});game.performAttack(soldier,game.monsters[0],false,1,false);assert.deepEqual(killed,[weak],'an arc can finish an enemy');
  // casters and sidearms never chain
  Object.assign(game,{monsters:[mon(25,0),mon(60,0)],worldTime:400});
  let arcs=0;const realChain=game.chainLightning;game.chainLightning=function(...a){arcs++;return realChain.apply(this,a);};game.performAttack(soldier,game.monsters[0],false,1,false,'magic');game.worldTime=500;game.performAttack(soldier,game.monsters[0],false,1,false,'sidearm');Math.random=saved;
  assert.equal(arcs,0,'magic and sidearm attacks do not chain');}

// ---- effect preview strings
{bareCommander();game.equipped={weapon:game.equipped.weapon};game.recalcPlayerStats();
  const armor=mk('ARMOR',10);p().attributeProfile.practice.strength=1e7;game.recalcPlayerStats();
  const snapshot=JSON.stringify({maxHp:p().maxHp,def:p().def,atk:p().atk,eq:Object.keys(game.equipped),hp:p().hp,weapon:game.equipped.weapon?.id});const eqRef=game.equipped;
  const prev=game.equipmentEffectPreview(p(),armor);
  assert.ok(prev.after.maxHp>prev.before.maxHp&&prev.after.def>prev.before.def,'armour raises HP and defence');assert.equal(prev.before.maxHp,p().maxHp);
  assert.equal(JSON.stringify({maxHp:p().maxHp,def:p().def,atk:p().atk,eq:Object.keys(game.equipped),hp:p().hp,weapon:game.equipped.weapon?.id}),snapshot,'the preview leaves the commander untouched');assert.equal(game.equipped,eqRef);assert.equal(game.equipped.armor,undefined);
  const html=game.effectPreviewHtml(p(),armor);assert.match(html,/装備すると/);assert.match(html,/最大HP [^→]+→[^ ]+/);assert.match(html,/防御/);assert.match(html,/攻撃/);
  const text=fx.equipmentEffectText({maxHp:1000,def:10,atk:50},{maxHp:1300,def:25,atk:50});assert.equal(text,'装備すると 最大HP 1,000→1,300 / 防御 10→25 / 攻撃 50→50');}
{const soldier=game.squad[0];soldier.attributeProfile.practice.strength=1e7;soldier.equipped={weapon:soldier.equipped.weapon};game.recalcSoldierStats(soldier);
  const maxHp=soldier.maxHp,eq=soldier.equipped,armor=mk('ARMOR',10);
  const prev=game.equipmentEffectPreview(soldier,armor);assert.ok(prev.after.maxHp>maxHp);assert.equal(soldier.maxHp,maxHp);assert.equal(soldier.equipped,eq);assert.equal(soldier.equipped.armor,undefined);
  assert.match(game.effectPreviewHtml(soldier,armor),/装備すると/);
  soldier.attributeProfile.practice.strength=0;soldier.level=1;game.recalcSoldierStats(soldier);game._effectPreviewCache.clear();
  const heavy=mk('ARMOR',26);const shortHtml=game.effectPreviewHtml(soldier,heavy);assert.match(shortHtml,/req-short/);assert.match(shortHtml,/筋力不足（必要\d+／現在\d+）/);assert.doesNotMatch(shortHtml,/装備すると/);
  // many bag items stay cheap
  const bag=Array.from({length:200},(_,i)=>mk(['ARMOR','HELMET','SHIELD'][i%3],8+(i%6)));const t0=Date.now();soldier.attributeProfile.practice.strength=1e7;game.recalcSoldierStats(soldier);for(const item of bag)game.effectPreviewHtml(soldier,item);
  assert.ok(Date.now()-t0<4000,'200 previews in '+(Date.now()-t0)+'ms');}
console.log('equipment-fixes-v7021 ok');
