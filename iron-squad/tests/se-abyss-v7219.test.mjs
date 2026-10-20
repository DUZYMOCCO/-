// v7.2.19: 魔王城より南東だけ、敵が強くなる（魔王城の線で1倍 → 真魔王城の線で10倍）。ほかの3つの角と今までの場所は変わらない。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const S=await import('../js/campaign-scaling.js?v=353');
const M=await import('../js/merchant-rules.js?v=353');
const {DUNGEON_DEFS}=await import('../js/dungeon.js?v=353');
const {WORLD_SIZE}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const near=(a,b,m,tol=1e-9)=>ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${m}: ${a} vs ${b}`);
const C=WORLD_SIZE/2,slots=[];
const realRandom=Math.random;
try{
// 1) the curve
eq(S.southEastAbyss(0,0),1,'headquarters');eq(S.southEastAbyss(42000,42000),1,'the demon castle line');
near(S.southEastAbyss(74000,74000),10,'the true demon castle');near(S.southEastAbyss(79000,79000),10,'stays x10 to the edge');
near(S.southEastAbyss(58000,58000),Math.sqrt(10),'halfway is about x3.2');
ok(S.southEastAbyss(50000,50000)<S.southEastAbyss(60000,60000)&&S.southEastAbyss(60000,60000)<S.southEastAbyss(70000,70000),'grows toward the true castle');
for(const [x,y] of [[74000,-74000],[-74000,74000],[-74000,-74000],[79000,30000],[30000,79000],[41999,79000],[79000,41999],[0,79000],[79000,0]])eq(S.southEastAbyss(x,y),1,`unchanged at (${x},${y})`);
near(S.southEastAbyss(43000,79000),S.southEastAbyss(43000,43000),'needs both offsets past the castle (no jump at the edge of the quadrant)');
ok(S.southEastAbyss(42001,79000)<1.001,'smooth at the quadrant border');
// 2) no existing place sits in the abyss except the true castle (the demon castle is on the x1 line)
for(const d of DUNGEON_DEFS){const k=S.southEastAbyss(d.entrance.x-C,d.entrance.y-C);if(d.id==='dungeon_true_demon_castle')near(k,10,'true castle at x10');else eq(k,1,`${d.id} unchanged`);}
// 3) field spawns
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('南東の深み検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];return g;};
const g=make();
const spawnAt=(dx,dy,seed)=>{let s=seed;Math.random=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};g.monsters=[];g.spawnMonster(C+dx,C+dy);Math.random=realRandom;return [...g.monsters];};
for(let seed=1;seed<=6;seed++){
 const se=spawnAt(74000,74000,seed);ok(se.length>0,'spawned');
 for(const m of se){near(m.abyss,S.southEastAbyss(m.x-C,m.y-C),'every member carries its own multiplier',1e-9);ok(m.abyss>9.9,'about x10 at the true castle');}
 for(const [dx,dy] of [[74000,-74000],[-74000,74000],[-74000,-74000],[30000,30000]])for(const m of spawnAt(dx,dy,seed))eq(m.abyss,undefined,`no multiplier at (${dx},${dy})`);
}
// same type, same roll: the abyss copy is exactly the distance curve x the multiplier. Compare one point with its mirror across the diagonal
// into the x1 side would change the biome, so compare against the curve directly.
{const se=spawnAt(74000,74000,7)[0],dist=Math.hypot(se.x-C,se.y-C),plain=S.campaignScaling(dist,Math.max(1,g.phase||g.wave||1));
 ok(se.maxHp/se.abyss>=plain.hp*10&&se.atk/se.abyss>=plain.atk*5,'base strength still follows the distance curve');}
// 4) merchants and escorts keep up with the abyss (v7.2.9 rule)
{const mk=(dx,dy)=>{const m={id:'m_test',distance:50000,x:C+dx,y:C+dy,hp:1,maxHp:1,escorts:[]};m.escorts=[M.makeEscort(m,0,1)];M.syncMerchantPower(g,m,true);return m;};
 const a=mk(74000,74000),b=mk(74000,-74000);
 near(a.maxHp/b.maxHp,10,'merchant HP x10',1e-3);near(a.escorts[0].escortBaseStats.atk/b.escorts[0].escortBaseStats.atk,10,'escort ATK x10',1e-3);
 near(a.escorts[0].escortBaseStats.hp/b.escorts[0].escortBaseStats.hp,10,'escort HP x10',1e-3);eq(a.powerAbyss>9.9,true,'remembered');eq(b.powerAbyss,undefined,'none outside');
 a.x=C+74000;a.y=C-74000;ok(M.syncMerchantPower(g,a),'walking out of the abyss resyncs');near(a.maxHp,b.maxHp,'back to normal',1e-6);}
console.log(`se-abyss-v7219: ${checks} checks ok`);
}finally{Math.random=realRandom;for(const id of slots)saveSlots.remove?.(id);}
