// v7.2.13 の凱旋（本陣へ帰って待つ）は v7.2.20 でやめた。魔王が倒れたあと（勇者でも隊長でも）、勇者は南東の真魔王城へ向かい、真魔王と戦って倒される。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js?v=354');
const {DUNGEON_DEFS}=await import('../js/dungeon.js?v=354');
const {TRUE_CASTLE_ID,TRUE_KING_RULES}=await import('../js/true-demon-castle.js?v=354');
const {zoneRingLabelJa}=await import('../js/equipment-rules.js?v=354');
const {campaignScaling,southEastAbyss}=await import('../js/campaign-scaling.js?v=353');
const {WORLD_SIZE}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const C=WORLD_SIZE/2,d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle'),td=DUNGEON_DEFS.find(x=>x.id===TRUE_CASTLE_ID),slots=[];
const make=()=>{const game=Object.create(IronSquadGame);
 for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
 game.toasts=[];game.showToast=m=>game.toasts.push(String(m));
 const slot=saveSlots.create('真魔王への旅検証');slots.push(slot.id);game.activeSlotId=slot.id;game.startFreshGame(false);for(const id of ['seal_northwest','seal_north','seal_northeast'])game.sealKeys.broken[id]={by:'commander',phase:1};game.restTimer=0;game.monsters=[];
 hp.initializeHeroJourney(game);game.currentDungeon=null;game.phase=20;ok(hp.rollHeroRevelation(game,()=>0),'hero born');return game;};
const clear=game=>{const j=game.heroJourney;if(j.castleScene)j.castleScene.monsters.length=0;game.monsters.length=0;if(game.savedFieldMonsters)game.savedFieldMonsters.length=0;};
const run=(game,until,limit,dt=.5)=>{let t=0;for(;t<limit&&!until();t+=dt){clear(game);hp.updateHeroParty(game,dt,SOLDIER_CLASSES);}return t;};
const toTrue=p=>Math.hypot(p.x-td.entrance.x,p.y-td.entrance.y);
try{
// 1) 勇者が魔王を倒す → 城を出て、本陣ではなく真魔王城へ
{const game=make(),j=game.heroJourney,p=j.party;
 p.x=d.entrance.x-5;p.y=d.entrance.y-5;p.route=[{...p.destination}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
 hp.updateHeroParty(game,.1,SOLDIER_CLASSES);ok(p.space===d.id,'party entered the castle');
 clear(game);hp.recordDemonKingDefeat(game,p.members[0]);ok(p.status==='victorious','victorious');ok(game.trueCastle.unlocked,'the true castle opened');
 let t=run(game,()=>p.space==='field',120,.25);
 ok(p.space==='field',`left the castle (${t}s)`);ok(Math.hypot(p.x-d.entrance.x,p.y-d.entrance.y)<300,'appears at the castle gate');
 ok(game.toasts.some(s=>s.includes('真魔王城へ向かった')),'departure toward the true castle is announced');ok(!game.toasts.some(s=>/帰途|凱旋/.test(s)),'no homecoming text');
 ok(Math.hypot(p.destination.x-td.entrance.x,p.destination.y-td.entrance.y)<1,'heads for the true castle gate');ok(p.homeState===undefined,'no home state');
 // 2) 野外では、強い敵がいても足を止めずに進む
 {const x=p.x,y=p.y,dist=toTrue(p);game.monsters.push({id:'foe',x:p.x+100,y:p.y,hp:1e12,maxHp:1e12,atk:0,radius:12,speed:0});for(let i=0;i<6;i++)hp.updateHeroParty(game,.5,SOLDIER_CLASSES);
  ok(Math.hypot(p.x-x,p.y-y)>20&&toTrue(p)<dist,'keeps marching past a strong enemy');clear(game);}
 // 3) セーブ・ロードをまたいでも続ける
 {const saved=structuredClone(game.saveGame({immediate:true}));game.resumeSavedGame(saved);}
 const q=game.heroJourney.party;ok(q.status==='victorious'&&q.space==='field'&&q.trueQuest==='marching','still on the way after load');
 // 4) 真魔王城へ着いて突入（途中で止まらない）
 const start=toTrue(q);t=run(game,()=>q.space===TRUE_CASTLE_ID,3000);
 ok(q.space===TRUE_CASTLE_ID,`reached the true castle (${Math.round(start)} in ${Math.round(t)}s)`);console.log(`to the true castle: ${Math.round(start)} in ${Math.round(t)}s`);
 ok(game.toasts.some(s=>s.includes('真魔王城へ突入')),'entry is announced');
 const king=game.heroJourney.trueScene.monsters.find(m=>m.isTrueDemonKing);ok(king&&king.maxHp===Math.max(1,Math.round(TRUE_KING_RULES.kingHpMultiple*hp.heroKingHp(game,q))),'the true king waits on his throne (v7.2.22: ten times the king these heroes met)');
 // 5) 真魔王と戦い、倒される（ほぼ必ず）
 t=run(game,()=>q.status==='fallen',900,.25);
 ok(q.status==='fallen'&&q.trueQuest==='fallen',`the party fell to the true king (${Math.round(t)}s)`);ok(game.toasts.some(s=>s.includes('真魔王にやぶれ')),'the defeat is announced');
 ok(!game.trueCastle.firstDefeat,'the true king still stands');ok(!game.heroJourney.trueScene,'the hero scene is cleared');
 game.phase=25;ok(hp.rollHeroRevelation(game,()=>0)===false,'no new hero after the king fell');}
// 6) 隊長が魔王を倒した場合も、巡礼中の勇者は真魔王城へ向かう
{const game=make(),p=game.heroJourney.party;p.x=C+3000;p.y=C;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
 hp.recordDemonKingDefeat(game,game.player);ok(game.heroJourney.demonKingDefeat.by==='commander','commander slew the king');
 run(game,()=>p.trueQuest==='marching',5);ok(p.trueQuest==='marching'&&Math.hypot(p.destination.x-td.entrance.x,p.destination.y-td.entrance.y)<1,'heroes turn to the true castle');
 const dist=toTrue(p);run(game,()=>toTrue(p)<dist-1000,120,.1);ok(toTrue(p)<dist-1000,'and make headway');}
// 7) 旧セーブ：本陣で凱旋して待っていた勇者も、読み込み後に真魔王城へ
{const game=make(),p=game.heroJourney.party;hp.recordDemonKingDefeat(game,p.members[0]);
 const saved=structuredClone(game.saveGame({immediate:true}));const sp=saved.heroJourney.party;Object.assign(sp,{space:'field',x:C,y:C,homeState:'home',homePhase:20,route:[],routeIndex:0,status:'victorious'});delete sp.trueQuest;sp.members.forEach(u=>{u.x=C;u.y=C;});
 game.resumeSavedGame(saved);const r=game.heroJourney.party;game.toasts.length=0;
 const start=toTrue(r);let t=run(game,()=>r.space===TRUE_CASTLE_ID,3000);
 ok(game.toasts.some(s=>s.includes('本陣を出て')),'the waiting party sets out');ok(r.homeState===undefined,'home state cleared');
 ok(r.space===TRUE_CASTLE_ID,`from headquarters to the true castle (${Math.round(start)} in ${Math.round(t)}s)`);console.log(`from headquarters: ${Math.round(start)} in ${Math.round(t)}s`);}
// 8) 旧セーブ：魔王城に立ち尽くしていた勇者隊も出てくる
{const game=make(),p=game.heroJourney.party;hp.recordDemonKingDefeat(game,p.members[0]);
 const saved=structuredClone(game.saveGame({immediate:true}));const sp=saved.heroJourney.party;Object.assign(sp,{space:d.id,x:d.width-400,y:d.height/2,route:[]});delete sp.homeState;delete sp.trueQuest;
 game.resumeSavedGame(saved);const r=game.heroJourney.party;run(game,()=>r.space==='field',200,.25);ok(r.space==='field'&&r.trueQuest==='marching','an old save idling in the castle sets out');}
// 9) 状態の表示（真魔王へ向かう内容）
{const src=(await import('node:fs')).readFileSync(new URL('../js/hero-party.js',import.meta.url),'utf8');
 ok(src.includes('真魔王城へ進軍中')&&src.includes('真魔王城で真魔王と交戦中')&&src.includes('真魔王にやぶれて全滅'),'status lines');ok(!/本陣に凱旋|本陣へ帰還中|帰途/.test(src),'no homecoming lines left');}
// 10) 危険な地域の表示に南東の倍率
{const at=(dx,dy)=>zoneRingLabelJa(Math.hypot(dx,dy),dx,dy),plain=(dx,dy)=>zoneRingLabelJa(Math.hypot(dx,dy));
 const se=at(74000,74000),c=campaignScaling(Math.hypot(74000,74000),1);
 ok(Math.abs(se.mult/(c.hp*10)-1)<1e-9&&se.abyss>9.99,'mult includes x10');ok(se.tip.includes('×10をふくむ')&&se.tip.startsWith(`HP×${Math.round(c.hp*10).toLocaleString('ja-JP')}`),`tip shows the real strength: ${se.tip}`);
 for(const [dx,dy] of [[74000,-74000],[-74000,74000],[-74000,-74000],[30000,30000],[0,9000]])ok(at(dx,dy).tip===plain(dx,dy).tip&&at(dx,dy).abyss===1,`unchanged at (${dx},${dy})`);
 const mid=at(58000,58000);ok(mid.tip.includes('×3.2をふくむ'),'halfway shows x3.2');
 // the notice when the commander walks into the abyss
 const game=make();game.heroJourney.party=null;game.player.x=C+30000;game.player.y=C+30000;game.checkZoneTransition();game.toasts.length=0;
 for(const k of [43000,50000,60000,70000,74500,76000]){game.player.x=C+k;game.player.y=C+k;game.checkZoneTransition();}
 const notes=game.toasts.filter(s=>s.includes('【南東のおく】'));ok(notes.length===4,`enter, x2, x5, x10 notices (${notes.length})`);ok(notes.at(-1).includes('×10'),'last one says x10');
 game.player.x=C+30000;game.player.y=C+30000;game.checkZoneTransition();game.toasts.length=0;game.player.x=C+74000;game.player.y=C+74000;game.checkZoneTransition();ok(game.toasts.filter(s=>s.includes('【南東のおく】')).length===1,'re-armed after leaving, one notice on a jump');
 ok(Math.abs(southEastAbyss(74000,74000)-10)<1e-9,'same curve as the spawns');}
console.log(`PASS hero-homecoming-v7213 / v7.2.20 true quest (${checks} checks)`);
}finally{for(const id of slots)saveSlots.delete?.(id);}
