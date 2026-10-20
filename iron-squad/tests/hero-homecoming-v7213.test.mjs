// v7.2.13: 魔王討伐後の勇者パーティは城を出て本陣へ凱旋し、そこで待機する（以前は魔王城で立ち尽くしていた）。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const hp=await import('../js/hero-party.js');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {WORLD_SIZE}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const C=WORLD_SIZE/2,d=DUNGEON_DEFS.find(x=>x.id==='dungeon_demon_castle');
const game=Object.create(IronSquadGame);
for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])game[m]=()=>{};
const toasts=[];game.showToast=m=>toasts.push(String(m));
const slot=saveSlots.create('凱旋検証');game.activeSlotId=slot.id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
hp.initializeHeroJourney(game);game.currentDungeon=null;game.phase=20;ok(hp.rollHeroRevelation(game,()=>0),'hero born');
const j=game.heroJourney,p=j.party;
// 魔王城の前まで来て突入
p.x=d.entrance.x-5;p.y=d.entrance.y-5;p.route=[{...p.destination}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
hp.updateHeroParty(game,.1,SOLDIER_CLASSES);ok(p.space===d.id,'party entered the castle');
const clear=()=>{j.castleScene.monsters.length=0;game.monsters.length=0;if(game.savedFieldMonsters)game.savedFieldMonsters.length=0;};
clear();hp.recordDemonKingDefeat(game,p.members[0]);ok(p.status==='victorious','victorious');
// 1) 城の出口へ歩いて、野外へ出る
let t=0;for(;t<120&&p.space!=='field';t+=.25){clear();hp.updateHeroParty(game,.25,SOLDIER_CLASSES);}
ok(p.space==='field',`left the castle (${t}s)`);ok(Math.hypot(p.x-d.entrance.x,p.y-d.entrance.y)<300,'appears at the castle gate');ok(toasts.some(s=>s.includes('帰途')),'departure is announced');
// 2) 戦闘中は進まない
{const x=p.x,y=p.y;game.monsters.push({id:'foe',x:p.x+100,y:p.y,hp:1e12,maxHp:1e12,atk:0,radius:12,speed:0});hp.updateHeroParty(game,.5,SOLDIER_CLASSES);ok(Math.hypot(p.x-x,p.y-y)<1,'stands and fights while an enemy is close');clear();}
// 3) セーブ・ロードをまたいでも帰還を続ける
{const saved=structuredClone(game.saveGame({immediate:true}));game.resumeSavedGame(saved);}
const q=game.heroJourney.party;ok(q.status==='victorious'&&q.space==='field','still homeward after load');
// 4) 本陣へ到着
const start=Math.hypot(q.x-C,q.y-C);for(t=0;t<4000&&q.homeState!=='home';t+=.5){clear();hp.updateHeroParty(game,.5,SOLDIER_CLASSES);}
ok(q.homeState==='home',`arrived home (${Math.round(t)}s from ${Math.round(start)})`);console.log(`homeward: ${Math.round(start)} in ${Math.round(t)}s`);ok(Math.hypot(q.x-C,q.y-C)<=hp.HERO_HOME_RADIUS+20,'stands at the headquarters');ok(toasts.some(s=>s.includes('凱旋')),'arrival is announced');
// 5) 到着後は待機（動かない）・新しい勇者は出ない
{const x=q.x,y=q.y;for(let i=0;i<40;i++){clear();hp.updateHeroParty(game,.5,SOLDIER_CLASSES);}ok(Math.hypot(q.x-x,q.y-y)<1,'stays at headquarters');}
game.phase=25;ok(hp.rollHeroRevelation(game,()=>0)===false,'no new hero after the king fell');
// 6) 旧セーブ：魔王城に立ち尽くしていた勇者隊も、読み込み後に動き出す
{const saved=structuredClone(game.saveGame({immediate:true}));const sp=saved.heroJourney.party;sp.space=d.id;sp.x=d.width-400;sp.y=d.height/2;delete sp.homeState;sp.route=[];
 game.resumeSavedGame(saved);const r=game.heroJourney.party;for(t=0;t<200&&r.space!=='field';t+=.25){clear();hp.updateHeroParty(game,.25,SOLDIER_CLASSES);}ok(r.space==='field','an old save idling in the castle starts home');}
saveSlots.delete(slot.id);
console.log(`PASS hero-homecoming-v7213 (${checks} checks)`);
