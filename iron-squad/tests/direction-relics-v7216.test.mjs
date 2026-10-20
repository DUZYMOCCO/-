// v7.2.16: 方角の遺宝（北西・北・北東の守護者と南西の黄昏の霊廟の主が遺す限定装備）と南西の霊廟。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const S=await import('../js/seal-keys.js?v=350');
const X=await import('../js/drop-exclusives.js?v=350');
const {DUNGEON_DEFS}=await import('../js/dungeon.js?v=350');
const {WORLD_SIZE,biomeAt}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const C=WORLD_SIZE/2,slots=[],SW='dungeon_twilight_sepulcher';
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('遺宝検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];return g;};
const relicsIn=g=>g.inventory.filter(i=>String(i.dropOnlyKey||'').startsWith('RELIC_'));
try{
// 1) 定義：四方角・種類はばらばら・出どころは祠と南西の霊廟
eq(Object.keys(X.DIRECTION_RELICS),['RELIC_NORTHWEST','RELIC_NORTH','RELIC_NORTHEAST','RELIC_SOUTHWEST'],'four relics');
eq(new Set(Object.values(X.DIRECTION_RELICS).map(r=>r.type)).size,4,'each relic is a different slot');
eq(Object.values(X.DIRECTION_RELICS).map(r=>r.source),['seal_northwest','seal_north','seal_northeast',SW],'sources');
ok(!Object.keys(X.DROP_EXCLUSIVES).some(k=>k.startsWith('RELIC_')),'ordinary drops can never roll a relic');
// 2) 南西の霊廟：南西・約450m・湿地と塩原の境
{const d=DUNGEON_DEFS.find(d=>d.id===SW);ok(d&&d.kind==='dungeon'&&d.boss,'south-west sepulcher exists');
 ok(d.entrance.x<C&&d.entrance.y>C,'it lies south-west');ok(Math.abs(d.distance-45000)<300,`about 450 m out (${Math.round(d.distance)})`);
 ok(d.reqLv<40&&d.reqDef<800,'it stays below the demon castle requirement');}
const g=make();
// 3) 祠の発見で、守護者が守る遺宝がわかる
{const nw=g.sealShrines[0];g.player.x=nw.x;g.player.y=nw.y+200;S.updateSealShrines(g,.3);ok(g.toasts.some(t=>t.includes('霧翼の遺飾')),'discovery names the relic');
 // 4) 隊長が初めて倒す：必ず遺す、持ち物に入る
 const gd=g.monsters.find(m=>m.isSealGuardian);const before=g.inventory.length;g.killMonster(gd,null,true);
 const got=relicsIn(g);eq(got.length,1,'first commander victory always leaves the relic');ok(g.inventory.length>before,'relic is in the inventory');
 const r=got[0];eq([r.type,r.dropOnlyKey,r.dropOnly],['AMULET','RELIC_NORTHWEST',true],'north-west relic');ok(r.name.startsWith('霧翼の遺飾・'),'relic name');
 ok(r.stats.atkSpeed>=10&&r.stats.speed>=8,'relic bonus applied');eq(X.dropExclusiveLabel(r),'攻速+10%・移動+8','label');
 ok(g.toasts.some(t=>t.includes('北西の遺宝')),'toast');eq(g.sealKeys.relics.seal_northwest,1,'recorded');}
// 5) 2回目以降は15%
{const fake={isSealGuardian:true,sealSiteId:'seal_northwest'};eq(S.directionRelicRoll(g,{...fake},g.player,()=>.5),null,'repeat: 50% roll misses');
 eq(S.directionRelicRoll(g,{...fake},g.player,()=>.1),'RELIC_NORTHWEST','repeat: 10% roll hits');eq(g.sealKeys.relics.seal_northwest,2,'count grows');
 const once={...fake};S.directionRelicRoll(g,once,g.player,()=>0);eq(S.directionRelicRoll(g,once,g.player,()=>0),null,'one roll per body');}
// 6) 勇者が倒しても遺さない（隊長の初回は残る）
{const n=g.sealShrines[1];g.player.x=n.x;g.player.y=n.y+200;S.updateSealShrines(g,.3);const gn=g.monsters.find(m=>m.sealSiteId==='seal_north');
 const hero={heroPartyId:'hp1',x:n.x,y:n.y,dead:false,name:'勇者'};g.heroJourney.party={status:'marching',space:'field',members:[hero],name:'テスト'};
 const k=relicsIn(g).length;g.killMonster(gn,hero,false);eq(relicsIn(g).length,k,'hero victory leaves no relic');ok(!(g.sealKeys.relics.seal_north>0),'north relic still waits for the commander');
 g.heroJourney.party=null;S.updateSealShrines(g,.3);const again=g.monsters.find(m=>m.sealSiteId==='seal_north');ok(again,'guardian back after the heroes left');
 g.killMonster(again,g.squad[0],false);const nr=relicsIn(g).find(i=>i.dropOnlyKey==='RELIC_NORTH');ok(nr&&nr.type==='ARMOR','a squad member victory counts for the commander');}
// 7) 南西の霊廟の主
{const d=g.dungeons.find(d=>d.id===SW);const boss=g.createDungeonBoss(d.boss,600,400,d);g.monsters.push(boss);g.killMonster(boss,null,true);
 const sw=relicsIn(g).find(i=>i.dropOnlyKey==='RELIC_SOUTHWEST');ok(sw&&sw.type==='LEGS'&&sw.name.startsWith('黄昏の遺脚具・'),'sepulcher lord leaves the south-west relic');
 ok(sw.stats.speed>=10,'speed bonus');eq(g.sealKeys.relics[SW],1,'recorded');
 const other=g.createDungeonBoss(DUNGEON_DEFS.find(x=>x.id==='dungeon_salt_dragon_bones').boss,600,400,DUNGEON_DEFS.find(x=>x.id==='dungeon_salt_dragon_bones'));eq(S.directionRelicRoll(g,other,g.player,()=>0),null,'other dungeons give no relic');}
// 8) セーブ・ロード：記録と遺宝が残る
{const saved=structuredClone(g.saveGame({immediate:true}));const h=make();h.resumeSavedGame(saved);
 eq(h.sealKeys.relics,{seal_northwest:3,seal_north:1,[SW]:1},'relic counts survive');eq(relicsIn(h).length,relicsIn(g).length,'relics stay in the inventory');
 ok(relicsIn(h).every(i=>X.dropExclusiveLabel(i)!=='限定補正'),'labels survive');
 eq(S.directionRelicRoll(h,{isSealGuardian:true,sealSiteId:'seal_north'},h.player,()=>.5),null,'after load the north relic is no longer guaranteed');}
// 9) 旧セーブ（遺宝の記録なし）でも初回は必ず遺す
{const h=make();const raw=structuredClone(h.saveGame({immediate:true}));delete raw.sealKeys.relics;const k=make();k.resumeSavedGame(raw);eq(k.sealKeys.relics,{},'old save has no relic record');
 eq(S.directionRelicRoll(k,{isSealGuardian:true,sealSiteId:'seal_northeast'},k.player,()=>.99),'RELIC_NORTHEAST','first one is guaranteed');}
console.log(`PASS direction-relics-v7216 (${checks} checks)`);
}finally{for(const id of slots)saveSlots.remove?.(id);}
