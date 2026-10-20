// v7.2.14: 魔王城の三つの封印（北西・北・北東の祠と守護者）、城門、共有状態、セーブ移行、地図の印。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const S=await import('../js/seal-keys.js?v=349');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {WORLD_SIZE}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const C=WORLD_SIZE/2,castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle'),slots=[];
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('封印検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];return g;};
const g=make();
// 1) 配置：北西・北・北東、本陣から離れた所
eq(g.sealShrines.map(s=>s.dir),['北西','北','北東'],'three shrines');
ok(g.sealShrines.every(s=>Math.hypot(s.x-C,s.y-C)>30000),'far from headquarters');
const [nw,n,ne]=g.sealShrines;ok(nw.x<C&&nw.y<C&&Math.abs(n.x-C)<2500&&n.y<C&&ne.x>C&&ne.y<C,'directions match');
ok(g.sealShrines.every(s=>DUNGEON_DEFS.every(d=>Math.hypot(d.entrance.x-s.x,d.entrance.y-s.y)>=1500)),'no shrine on a dungeon door');
eq(S.castleSealText(g),'封印 残り3','castle shows the seals left');
// 2) 城門：封印が残る間は入れない
g.player.x=castle.entrance.x;g.player.y=castle.entrance.y;g.enterDungeon(castle);ok(!g.currentDungeon,'castle gate is shut');ok(g.toasts.some(t=>t.includes('封印 残り3')),'the gate tells how many seals are left');
// 3) 守護者：近づくと一体だけ現れる
g.player.x=nw.x;g.player.y=nw.y+200;for(let i=0;i<5;i++)S.updateSealShrines(g,.3);
ok(g.monsters.filter(m=>m.isSealGuardian).length===1,'one guardian appears');ok(g.sealKeys.discovered.seal_northwest,'shrine discovered');
const gd=g.monsters.find(m=>m.isSealGuardian);ok(gd.homeX===gd.x&&gd.isPlaceBoss&&gd.maxHp>1e6,'guardian is a leashed boss');
// 4) 隊長が倒すと封印が解け、2期は戻らない
g.killMonster(gd,null,true);ok(S.sealBroken(g,'seal_northwest'),'seal broken');eq(S.sealsRemaining(g),2,'two left');
eq(g.sealKeys.broken.seal_northwest.by,'commander','commander credit');
S.updateSealShrines(g,.3);ok(!g.monsters.some(m=>m.isSealGuardian),'guardian rests after a commander victory');
g.phase+=2;S.updateSealShrines(g,.3);const again=g.monsters.find(m=>m.isSealGuardian);ok(again,'guardian returns two phases later');
g.killMonster(again,null,true);eq(S.sealsRemaining(g),2,'a second victory does not solve another seal');
// 5) 勇者が倒した守護者は、勇者隊が離れるまで戻らない
{g.player.x=n.x;g.player.y=n.y+200;S.updateSealShrines(g,.3);const gn=g.monsters.find(m=>m.sealSiteId==='seal_north');ok(gn,'north guardian');
 const hero={heroPartyId:'hp1',x:n.x,y:n.y,dead:false};g.heroJourney.party={status:'marching',space:'field',members:[hero],name:'テスト'};
 g.killMonster(gn,hero,false);eq(g.sealKeys.broken.seal_north.by,'hero','hero credit is shared');ok(g.toasts.some(t=>t.includes('勇者【テスト】')),'hero victory announced');
 S.updateSealShrines(g,.3);ok(!g.monsters.some(m=>m.sealSiteId==='seal_north'),'stays down while heroes stand there');
 hero.x=n.x+2000;S.updateSealShrines(g,.3);ok(g.monsters.some(m=>m.sealSiteId==='seal_north'),'returns once the heroes leave');g.heroJourney.party=null;}
// 6) セーブ・ロード
{const saved=structuredClone(g.saveGame({immediate:true}));const h=make();h.resumeSavedGame(saved);eq(Object.keys(h.sealKeys.broken).sort(),['seal_north','seal_northwest'],'seals survive save/load');eq(S.castleSealText(h),'封印 残り1','one left after load');}
// 7) 三つ解けたら門が開く
{g.player.x=ne.x;g.player.y=ne.y+200;S.updateSealShrines(g,.3);g.killMonster(g.monsters.find(m=>m.sealSiteId==='seal_northeast'),null,true);ok(!S.castleSealed(g),'all seals solved');ok(g.toasts.some(t=>t.includes('すべて解けた')),'all solved announced');
 g.monsters=[];g.player.x=castle.entrance.x;g.player.y=castle.entrance.y;g.enterDungeon(castle);ok(g.currentDungeon?.id==='dungeon_demon_castle','castle opens');g.exitDungeon?.();}
// 8) 旧セーブの移行
const legacy=mut=>{const h=make();const saved=structuredClone(h.saveGame({immediate:true}));delete saved.sealKeys;mut(saved);const k=make();k.resumeSavedGame(saved);return S.sealsRemaining(k);};
eq(legacy(()=>{}),3,'an old save that never reached the castle keeps all three seals');
eq(legacy(s=>{s.heroJourney.demonKingDefeat={phase:3,by:'hero',name:'x'};}),0,'king slain: all seals solved');
eq(legacy(s=>{s.heroJourney.kingProfile={hp:1e9,atk:1,dps:1,version:1};}),0,'castle visited: all seals solved');
eq(legacy(s=>{s.heroJourney.castleScene={layoutVersion:1,monsters:[],vault:{}};}),0,'party fought in the castle: all seals solved');
// 9) 地図の印（描画が通る）
{const calls=[];const ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:(...a)=>{calls.push(k);}});S.drawSealMap(ctx,g,x=>x/100,y=>y/100);S.drawSealShrine(ctx,g.sealShrines[0],g,1);ok(calls.includes('fillText'),'map and shrine draw');}
// 10) 守護者は巨大魔獣の出現を妨げない
{const h=make();h.player.x=nw.x;h.player.y=nw.y+200;S.updateSealShrines(h,.3);ok(!h.monsters.some(m=>m.isColossal&&!m.isDungeonBoss&&!m.isSealGuardian),'no wandering colossal yet');}
for(const id of slots)saveSlots.delete(id);
console.log(`PASS seal-keys-v7214 (${checks} checks)`);
