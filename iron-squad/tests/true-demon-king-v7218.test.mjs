// v7.2.18: 真魔王（決まったHP・段階・大技・初討伐）と、魔王のHP見積もりの見直し（職ごとの係数と戦い始めの見切り）。
import assert from 'node:assert/strict';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const T=await import('../js/true-demon-castle.js?v=352');
const K=await import('../js/demon-king-rules.js?v=352');
const {recordDemonKingDefeat}=await import('../js/hero-party.js?v=352');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const slots=[],R=T.TRUE_KING_RULES;
const make=()=>{const g=Object.create(IronSquadGame);for(const m of ['updateStatsUI','updateQuestUI','startGameLoop','spawnSparks','spawnDamageText','renderStrategyUI','refreshSupplyUI'])g[m]=()=>{};
 g.toasts=[];g.showToast=m=>g.toasts.push(String(m));const slot=saveSlots.create('真魔王検証');slots.push(slot.id);g.activeSlotId=slot.id;g.startFreshGame(false);g.restTimer=0;g.monsters=[];return g;};
const enter=g=>{recordDemonKingDefeat(g,g.player);const d=g.dungeons.find(d=>d.id===T.TRUE_CASTLE_ID);g.player.x=d.entrance.x;g.player.y=d.entrance.y;g.enterDungeon(d);return g.monsters.find(m=>m.isTrueDemonKing);};
const guard=(g,cls)=>{const s=g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE',level:40});s.isPersonalGuard=true;if(cls){s.soldierClass=cls;g.recalcSoldierStats(s);}s.maxHp=5e6;s.hp=s.maxHp;g.squad.push(s);return s;};
try{
// 1) 体力は決まっている：隊の強さでは変わらない
{const a=make();const k1=enter(a);eq(k1.maxHp,R.hp,'fixed HP');eq(k1.atk,R.atk,'fixed ATK');
 const b=make();b.player.atk*=50;for(const s of b.squad||[])s.atk*=50;const k2=enter(b);eq(k2.maxHp,R.hp,'a far stronger party meets the same king');
 ok(k1.hitGrowthStrength===R.growthStrength&&R.growthStrength<R.atk/10,'hit growth counts it as a strong field enemy, not its raw ATK');}
// 2) 段階：70%で止まって障壁、障壁中は削れない
const g=make();const king=enter(g);g.squad=g.squad.filter(s=>s.isPersonalGuard);
{king.hp=king.maxHp*.69;T.updateTrueDemonKing(g,king,.05,[]);eq(king.tk.phase,2,'phase 2 at 70%');eq(king.hp,king.maxHp*.7,'held at the threshold');ok(king.tk.barrier>0,'barrier');
 ok(g.toasts.some(t=>t.includes('さばきを受けよ')),'phase line');king.hp-=1e8;T.updateTrueDemonKing(g,king,.05,[]);eq(king.hp,king.maxHp*.7,'no damage through the barrier');
 for(let i=0;i<200;i++)T.updateTrueDemonKing(g,king,.05,[]);ok(!(king.tk.barrier>0),'barrier ends');}
// 3) さばきの刻：聖域の光がなければ満タンでも倒れる。光（聖騎士の系統）の中なら耐える
{const plain=guard(g,null),far={x:king.x-200,y:king.y};plain.x=far.x;plain.y=far.y;g.player.x=king.x-1000;
 king.tk.cast=null;king.tk.judgment=0;king.tk.wave=1e9;g.squad.forEach(s=>{if(s!==plain){s.x=king.x+3000;s.y=king.y;}});
 const w=T.updateTrueDemonKing(g,king,.05,g.squad);ok(w&&king.tk.cast?.kind==='judgment','wind-up');for(let i=0;i<60&&king.tk.cast;i++)T.updateTrueDemonKing(g,king,.05,g.squad);
 ok(plain.isDown||plain.hp<=0,'unlit unit at full HP goes down');
 const pal=guard(g,'PALADIN'),lit=guard(g,null);pal.x=king.x-240;pal.y=king.y+250;lit.x=king.x-200;lit.y=king.y;
 king.tk.judgment=0;T.updateTrueDemonKing(g,king,.05,g.squad);for(let i=0;i<60&&king.tk.cast;i++)T.updateTrueDemonKing(g,king,.05,g.squad);
 ok(!lit.isDown&&lit.hp>0,'unit in the paladin light survives');eq(T.trueKingBlowPct(g,lit,1.2),1.2*R.sanctuary.cut,'light cuts the blow');eq(T.trueKingBlowPct(g,{x:king.x+9000,y:king.y},1.2),1.2,'no light far away');}
// 4) 40%で第3段：終わりの鐘
{king.tk.barrier=0;king.hp=king.maxHp*.39;T.updateTrueDemonKing(g,king,.05,[]);eq(king.tk.phase,3,'phase 3 at 40%');ok(g.toasts.some(t=>t.includes('ほうむって')),'phase 3 line');
 king.tk.barrier=0;king.tk.requiem=0;king.tk.judgment=99;king.tk.cast=null;T.updateTrueDemonKing(g,king,.05,g.squad);eq(king.tk.cast?.kind,'requiem','bell wind-up');}
// 5) 初めての討伐：発表・記録・褒美。2度目は褒美なし
{const orbs=g.awakeningOrbs||0,gems=g.awakeningGems||0;king.hp=0;g.killMonster(king,null,true);
 ok(g.trueCastle.firstDefeat&&g.trueCastle.defeats===1,'recorded');eq([g.awakeningOrbs-orbs>=R.firstReward.orbs,g.awakeningGems-gems>=R.firstReward.gems],[true,true],'first reward');
 ok(g.toasts.some(t=>t.includes('真魔王討伐')),'announcement');ok((g.battleReport||[]).some(r=>String(r.text).includes('初めて討伐')),'battle report');
 const o2=g.awakeningOrbs;T.recordTrueKingDefeat(g,null,true);eq(g.trueCastle.defeats,2,'count');ok(g.awakeningOrbs===o2,'no second first-reward');
 const saved=structuredClone(g.saveGame({immediate:true}));const h=make();h.resumeSavedGame(saved);eq(h.trueCastle.defeats,2,'saved');ok(h.trueCastle.firstDefeat?.name,'first defeat kept');}
// 6) 魔王の見積もり：職とクラス段階で係数が変わる（同じATKなら上位職ほど高い）
{eq(K.guardDpsFactor({soldierClass:'VOID_EDGE'})>K.guardDpsFactor({soldierClass:'LIGHT'}),true,'top light > base light');
 eq(K.guardDpsFactor({soldierClass:'ARCHANGEL'})>K.guardDpsFactor({soldierClass:'MEDIC'}),true,'top medic > base medic');
 eq(K.guardDpsFactor({soldierClass:'NINJA_X'}),K.DEMON_KING_RULES.guardDps,'unknown class keeps the old factor');
 ok(K.captainDpsFactor({advancedClass:'MYTHIC_EMPEROR'})>K.captainDpsFactor({}),'captain stage counts');}
// 7) 見切り：戦い始め12秒の実火力でHPを引き上げる。下げない。次の入場にも残る
{const a=make();a.heroJourney.kingProfile=null;const k={hp:1e9,maxHp:1e9,isDemonKing:true};
 eq(K.gaugeDemonKing(a,k,1),0,'waits for the first damage');k.hp-=1;K.gaugeDemonKing(a,k,1);
 let raised=0,n=0;while(!raised&&n<30){k.hp-=2e7;raised=K.gaugeDemonKing(a,k,1);n++;}
 ok(raised>1e9,'raised from the real firepower');eq(n,11,'after 12 seconds');eq(k.maxHp,raised,'new max');ok(Math.abs((k.maxHp-k.hp)-(1+11*2e7))<2,'damage already dealt stays');
 ok(a.heroJourney.kingProfile.hp>=raised,'profile remembers it');eq(K.gaugeDemonKing(a,k,1),0,'once per visit');
 const weak={hp:1e9,maxHp:1e9,isDemonKing:true};weak.hp-=1;for(let i=0;i<13;i++){weak.hp-=10;K.gaugeDemonKing(a,weak,1);}eq(weak.maxHp,1e9,'never lowered');
 const sp={hp:1e9,maxHp:1e9};a.spectating={};sp.hp-=1e8;for(let i=0;i<14;i++)K.gaugeDemonKing(a,sp,1);eq(sp.maxHp,1e9,'an observer does not gauge');}
console.log(`true-demon-king-v7218: ${checks} checks ok`);
}finally{for(const id of slots)saveSlots.remove?.(id);}
