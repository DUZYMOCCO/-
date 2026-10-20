// v7.2.15: 勇者の巡礼。解けていない封印の祠を近い順に巡って守護者と戦い、三つとも解けてから魔王城へ入る。
import assert from 'node:assert/strict';
let seed=7;const realRandom=Math.random;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const S=await import('../js/seal-keys.js?v=349');
const H=await import('../js/hero-party.js?v=349');
const {spectateSummary}=await import('../js/hero-spectate.js?v=349');
const {DUNGEON_DEFS}=await import('../js/dungeon.js');
const {WORLD_SIZE}=await import('../js/world.js');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const C=WORLD_SIZE/2,castle=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle'),slots=[];
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI','recalcPlayerStats'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('巡礼検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];
 g.phase=10;H.initializeHeroJourney(g);H.rollHeroRevelation(g,()=>0);
 // 隊長は地下にいる（勇者は見えない所で戦う）
 g.currentDungeon=DUNGEON_DEFS.find(d=>d.id==='dungeon_catacombs');g.savedFieldMonsters=[];return g;};
const step=(g,sec)=>{for(let t=0;t<sec;t+=.25){H.updateHeroParty(g,.25,SOLDIER_CLASSES);S.updateSealShrines(g,.25);}};
try{
// 1) 出発：一番近い解けていない祠へ向かう
{const g=make(),p=g.heroJourney.party;step(g,1);
 const near=[...g.sealShrines].sort((a,b)=>Math.hypot(a.x-C,a.y-C)-Math.hypot(b.x-C,b.y-C))[0];
 eq(p.pilgrimTarget,near.id,'first goal is the nearest shrine');
 ok(Math.hypot(p.destination.x-near.x,p.destination.y-near.y-S.HERO_SHRINE_STAND)<1,'heads for the front of the shrine');
 ok(p.journal.events.some(e=>e.text.includes(near.name)),'diary names the shrine');
 ok(/封印の祠まで約/.test(spectateSummary(g).castleText),'spectate shows the shrine');}
// 2) 通し：三つの守護者を勇者が倒し、それから魔王城へ
{const g=make(),p=g.heroJourney.party;const seen=[];let t=0,firstBreak=null,released=false;
 while(t<3600&&p.space==='field'&&p.status!=='fallen'){step(g,5);t+=5;
  const ids=Object.keys(g.sealKeys.broken);if(ids.length&&firstBreak==null)firstBreak={id:ids[0],t};
  if(firstBreak&&!released&&g.sealKeys.guardians[firstBreak.id]?.heroKilled===false&&t>firstBreak.t)released=true;
  for(const id of ids)if(!seen.includes(id))seen.push(id);}
 eq(p.space,castle.id,'heroes reach the castle');ok(t<3000,`within 50 minutes (${t}s)`);
 eq(seen.length,3,'all three seals solved on the way');ok(Object.values(g.sealKeys.broken).every(b=>b.by==='hero'),'heroes broke them');
 ok(released,'a hero-slain guardian may return after the heroes move on');
 const order=seen.map(id=>g.sealShrines.find(s=>s.id===id));
 ok(Math.hypot(order[1].x-order[0].x,order[1].y-order[0].y)<=Math.hypot(order[2].x-order[0].x,order[2].y-order[0].y)+1,'nearest-first after the first seal');
 ok(p.journal.events.some(e=>e.text.includes('封印がすべて解けた')),'diary: all seals solved');
 ok(p.members.every(u=>u.level>=30),'heroes grew on the pilgrimage');}
// 3) 隊長が解いた祠は飛ばす。残った祠だけを巡る
{const g=make(),p=g.heroJourney.party;g.sealKeys.broken.seal_northwest={by:'commander',phase:9};g.sealKeys.broken.seal_north={by:'commander',phase:9};
 step(g,1);eq(p.pilgrimTarget,'seal_northeast','skips seals the commander solved');
 // 途中で残りも解かれたら、まっすぐ城へ
 g.sealKeys.broken.seal_northeast={by:'commander',phase:9};step(g,1);eq(p.pilgrimTarget,'castle','goes for the castle once all are solved');
 ok(Math.hypot(p.destination.x-castle.entrance.x,p.destination.y-castle.entrance.y)<1,'castle gate is the goal');}
// 4) 封印が残る間は勇者も城に入れない
{const g=make(),p=g.heroJourney.party;g.sealKeys.broken.seal_northwest={by:'commander',phase:9};g.sealKeys.broken.seal_north={by:'commander',phase:9};
 p.x=castle.entrance.x;p.y=castle.entrance.y;p.route=[{x:castle.entrance.x,y:castle.entrance.y}];p.routeIndex=0;p.pilgrimTarget='castle';
 p.members.forEach(u=>{u.x=p.x;u.y=p.y;});step(g,2);eq(p.space,'field','sealed gate keeps heroes out');eq(p.pilgrimTarget,'seal_northeast','they turn to the last shrine');}
// 5) 読み込み：行軍中の勇者は経路を引き直し、旧セーブ（城へ直行中）は祠へ向かい直す
{const g=make(),p=g.heroJourney.party;step(g,120);ok(p.route.length>1,'has a route');
 const saved=structuredClone(g.saveGame({immediate:true}));const sp=saved.heroJourney.party;delete sp.pilgrimTarget;sp.destination={...castle.entrance};
 const h=make();h.resumeSavedGame(saved);h.currentDungeon=DUNGEON_DEFS.find(d=>d.id==='dungeon_catacombs');h.savedFieldMonsters=[];
 const q=h.heroJourney.party;eq(q.route.length,0,'route is replanned on load');step(h,1);ok(S.sealDef(q.pilgrimTarget),'legacy marching party heads for a shrine');
 step(h,30);ok(Math.hypot(q.x-C,q.y-C)>Math.hypot(p.x-C,p.y-C)-50,'keeps marching after load');}
// 6) 勇者が倒れても、次の勇者は残りの祠へ
{const g=make(),p=g.heroJourney.party;g.sealKeys.broken.seal_northwest={by:'hero',phase:10};p.members.forEach(u=>{u.dead=true;u.hp=0;});step(g,.25);eq(p.status,'fallen','party fell');
 g.phase=15;H.rollHeroRevelation(g,()=>0);const q=g.heroJourney.party;ok(q!==p&&q.status!=='fallen','next hero rises');step(g,1);
 ok(['seal_north','seal_northeast'].includes(q.pilgrimTarget),'next hero visits the remaining seals');}
// 7) 古いセーブ（すでに城まで来ていた）では巡礼しない
{const g=make(),p=g.heroJourney.party;for(const d of S.SEAL_DEFS)g.sealKeys.broken[d.id]={by:'old-save',phase:1};step(g,1);eq(p.pilgrimTarget,'castle','solved world goes straight to the castle');}
console.log(`hero pilgrimage v7.2.15: ${checks} checks ok`);
}finally{for(const id of slots)saveSlots.remove?.(id);Math.random=realRandom;}
