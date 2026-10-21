// v7.2.17: 真魔王城。魔王が倒れると南東の果てに現れる。旧セーブで魔王が倒れていれば開いた状態。勇者は向かわない。
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const T=await import('../js/true-demon-castle.js?v=351');
const {recordDemonKingDefeat}=await import('../js/hero-party.js?v=351');
const {DUNGEON_DEFS}=await import('../js/dungeon.js?v=351');
const {WORLD_SIZE,fieldTerrainAt}=await import('../js/world.js');
const {wildernessLayout}=await import('../js/wilderness-sites.js?v=281');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const C=WORLD_SIZE/2,slots=[],ID=T.TRUE_CASTLE_ID,CASTLE='dungeon_demon_castle';
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('真魔王城検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];return g;};
const has=g=>(g.dungeons||[]).filter(d=>d.id===ID).length;
try{
// 1) 場所：魔王城よりさらに南東、地図の端の近く、開けた地面
{const d=DUNGEON_DEFS.find(d=>d.id===ID),castle=DUNGEON_DEFS.find(d=>d.id===CASTLE);
 ok(d&&d.kind==='dungeon'&&d.boss?.type==='true_demon_king'&&d.boss.fixedStats,'true castle with a fixed-stat boss');
 ok(d.entrance.x>castle.entrance.x+20000&&d.entrance.y>castle.entrance.y+20000,'south-east of the demon castle');
 const edge=WORLD_SIZE-Math.max(d.entrance.x,d.entrance.y);ok(edge>3000&&edge<7000,`near the map edge (${edge})`);
 eq(fieldTerrainAt(d.entrance.x,d.entrance.y),'open','open ground');ok(d.distance>castle.distance+40000,'farther than the demon castle');}
// 2) 新しいゲーム：まだ現れない
const g=make();
eq(has(g),0,'hidden before the king falls');eq(g.trueCastle.unlocked,false,'locked');
const before={seals:g.sealShrines.map(s=>[s.x,s.y]),wild:g.wildernessSites.map(s=>[s.id,s.x,s.y]),others:g.dungeons.map(d=>[d.id,d.entrance.x,d.entrance.y])};
g.updateTrueCastle?.(.1);ok(!g.toasts.some(t=>t.includes('真魔王城')),'no hint before');
// 3) 魔王が倒れた瞬間：最期の言葉と城の出現
recordDemonKingDefeat(g,g.player);
eq(has(g),1,'appears once');ok(g.trueCastle.unlocked,'unlocked');
ok(g.toasts.some(t=>t.includes('最後のことば')&&t.includes('南東')),'king\'s last words');ok(g.toasts.some(t=>t.includes('真魔王城が姿を現した')),'castle appears');
ok((g.battleReport||[]).some(r=>String(r.text).includes('真魔王城')),'battle report');
{const d=T.trueCastleDef();ok(g.ensureFog().isExploredWorld(d.entrance.x,d.entrance.y),'its spot shows on the map');}
recordDemonKingDefeat(g,g.player);eq(has(g),1,'no second entry');
// 4) ほかの場所は動かない
eq(g.sealShrines.map(s=>[s.x,s.y]),before.seals,'seal shrines unchanged');
eq(wildernessLayout(g).map(s=>[s.id,s.x,s.y]),before.wild,'outdoor sites unchanged');
eq(g.dungeons.filter(d=>d.id!==ID).map(d=>[d.id,d.entrance.x,d.entrance.y]),before.others,'other places unchanged');
// 5) 入れる：真魔王が決まった体力でいる
{const d=g.dungeons.find(d=>d.id===ID);g.player.x=d.entrance.x;g.player.y=d.entrance.y;g.enterDungeon(d);eq(g.currentDungeon?.id,ID,'can enter');
 const k=g.monsters.find(m=>m.isTrueDemonKing);ok(k&&k.isDungeonBoss&&!k.isDemonKing,'the true king waits inside');eq(k.maxHp,d.boss.hp,'fixed HP');
 g.exitDungeon?.();}
// 6) 保存と読み込み
{const saved=structuredClone(g.saveGame({immediate:true}));const h=make();h.resumeSavedGame(saved);eq(has(h),1,'still open after load');ok(h.trueCastle.unlocked,'state kept');
 h.toasts.length=0;h.updateTrueCastle?.(.1);T.updateTrueCastle(h,.1);ok(!h.toasts.some(t=>t.includes('そびえている')),'no late notice when already known');}
// 7) 旧セーブ：魔王討伐済み（真魔王城の記録なし）→ 開いた状態で、一度だけ知らせる
{const raw=structuredClone(g.saveGame({immediate:true}));delete raw.trueCastle;const h=make();h.resumeSavedGame(raw);eq(has(h),1,'old save with the king slain: open');
 h.toasts.length=0;T.updateTrueCastle(h,.1);T.updateTrueCastle(h,.1);eq(h.toasts.filter(t=>t.includes('真魔王城だ')).length,1,'one quiet notice, no scene');}
// 8) 旧セーブ：討伐記録はないが魔王城が踏破済み → 開く
{const s=make();const raw=structuredClone(s.saveGame({immediate:true}));delete raw.trueCastle;if(raw.heroJourney)delete raw.heroJourney.demonKingDefeat;
 const c=raw.dungeons.find(d=>d.id===CASTLE);c.cleared=true;const h=make();h.resumeSavedGame(raw);eq(has(h),1,'cleared castle opens it');}
// 9) 魔王が倒れていないセーブは閉じたまま
{const s=make();const raw=structuredClone(s.saveGame({immediate:true}));const h=make();h.resumeSavedGame(raw);eq(has(h),0,'still hidden');eq(h.trueCastle.unlocked,false,'still locked');}
// 10) v7.2.20 から、魔王が倒れたあとの勇者は真魔王城へ向かう（hero-homecoming-v7213 が確かめる）。勇者の行き先を決めるのは hero-party.js だけ
{const src=readFileSync(new URL('../js/hero-party.js',import.meta.url),'utf8');ok(/TRUE_CASTLE_ID/.test(src)&&/trueCastleOpen\(game\)/.test(src),'heroes head for the true castle only once it is open');}
console.log(`true-demon-castle-v7217: ${checks} checks ok`);
}finally{for(const id of slots)saveSlots.remove?.(id);}
