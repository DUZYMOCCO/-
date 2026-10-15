// v7.0.5 被弾鍛錬（基準＝防御前の攻撃の強さ・HP 0.0001 / DEF 0.00035）と、旧セーブの積み上げ分の一括換算（HP×3.5 / DEF×50、セーブ全体の印 hitGrowthScale）。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {HIT_HP_PER_DAMAGE,HIT_DEF_PER_DAMAGE,HIT_GROWTH_SCALE,applyHitGrowth,migrateSaveHitGrowth,scaleUnitHitGrowth,scaleTavernHitGrowth} from '../js/growth-rules.js';
import {recalcEscortStats} from '../js/merchant-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js');const {saveSlots}=await import('../js/save-slots.js');
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message||''} ${a} ~ ${b}`);

// (a) 係数
assert.equal(HIT_HP_PER_DAMAGE,0.003);assert.equal(HIT_DEF_PER_DAMAGE,0.0105);assert.equal(HIT_GROWTH_SCALE,2);
{const u={};const r=applyHitGrowth(u,1e6,true);near(u.hitGrowthHp,3000);near(u.hitGrowthDef,10500);near(r.gain,3000);near(r.defGain,10500);}

// 換算の純関数: 全ユニットの種類を一度だけ
{const unit=()=>({hitGrowthHp:100,hitGrowthDef:10});
 const save={player:unit(),squad:[unit()],reserves:[unit()],scoutCandidates:[{soldier:unit()}],heroJourney:{party:{members:[unit(),unit()]}},
  merchants:[{escorts:[unit(),unit()]}],gateGuards:[unit()],taverns:{waiting:[unit()],roster:{people:[{joined:false,unit:unit()},{joined:true,unit:{id:'x'}}]}},
  limitedAllies:{encounters:[{joined:false,unit:unit()},{joined:true,unit:{id:'y'}}]}};
 const all=()=>[save.player,...save.squad,...save.reserves,save.scoutCandidates[0].soldier,...save.heroJourney.party.members,...save.merchants[0].escorts,...save.gateGuards,
  ...save.taverns.waiting,save.taverns.roster.people[0].unit,save.limitedAllies.encounters[0].unit];
 assert.equal(migrateSaveHitGrowth(save),true);assert.equal(save.hitGrowthScale,2);
 for(const u of all()){near(u.hitGrowthHp,350,'HP x3.5');near(u.hitGrowthDef,500,'DEF x50');}
 assert.equal(migrateSaveHitGrowth(save),false,'second pass is a no-op');for(const u of all()){near(u.hitGrowthHp,350);near(u.hitGrowthDef,500);}
 assert.equal(migrateSaveHitGrowth({hitGrowthScale:2,player:unit()}),false);assert.equal(migrateSaveHitGrowth({hitGrowthScale:3,player:unit()}),false);
 const nothing={hitGrowthHp:0};scaleUnitHitGrowth(nothing);assert.equal(nothing.hitGrowthHp,0);assert.equal(nothing.hitGrowthDef,undefined,'no growth stays absent');
 assert.equal(scaleTavernHitGrowth(null),null);}

const game=Object.create(IronSquadGame);game.container=document.getElementById('game');
Object.assign(game,{width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const key of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[key]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('HIT GROWTH SCALE TEST ONLY').id;game.startFreshGame(false);

// (d) 新規ゲームは印 2
const fresh=game.saveGame({immediate:true});assert.equal(fresh.hitGrowthScale,2,'a new game is saved with the mark');
assert.equal(saveSlots.get(game.activeSlotId).data.hitGrowthScale,2);

// (b) 印の無い旧セーブを作る（隊長・重装・予備・商人の護衛に積み上げを持たせ、最大HP/DEFは旧値のまま）
const old=structuredClone(saveSlots.get(game.activeSlotId).data);delete old.hitGrowthScale;
old.player.hitGrowthHp=1000;old.player.hitGrowthDef=0;
const heavy=old.squad.find(s=>s.soldierClass==='HEAVY'),light=old.squad.find(s=>s.soldierClass!=='HEAVY');
Object.assign(heavy,{hitGrowthHp:2000,hitGrowthDef:40});Object.assign(light,{hitGrowthHp:600,hitGrowthDef:0});
const reserve=structuredClone(old.squad.find(s=>s.id!==heavy.id&&s.id!==light.id&&s.soldierClass==='HEAVY')||heavy);reserve.id='reserve-heavy-test';reserve.name='予備重装テスト';Object.assign(reserve,{hitGrowthHp:800,hitGrowthDef:8,isPersonalGuard:false});
old.reserves=[reserve];
const escortSave=old.merchants[0].escorts[0];Object.assign(escortSave,{hitGrowthHp:300,hitGrowthDef:6});
const ids={heavy:heavy.id,light:light.id,reserve:reserve.id,escort:escortSave.id};

const find=id=>[...game.squad,...game.reserves].find(s=>s.id===id);
const probeStats=unit=>{const probe=structuredClone(unit);probe.hitGrowthHp=0;probe.hitGrowthDef=0;game.recalcSoldierStats(probe);return probe;};
function checkLoaded(label){
 near(game.player.hitGrowthHp,3500,`${label} commander HP growth`);
 const h=find(ids.heavy),l=find(ids.light),r=find(ids.reserve);
 near(h.hitGrowthHp,7000,`${label} heavy HP growth`);near(h.hitGrowthDef,2000,`${label} heavy DEF growth`);
 near(l.hitGrowthHp,2100,`${label} light HP growth`);
 assert.ok(r,`${label} reserve exists`);near(r.hitGrowthHp,2800,`${label} reserve HP growth`);near(r.hitGrowthDef,400,`${label} reserve DEF growth`);
 // 最大HP・DEFは換算後の成長ぶんが載っている（再計算を挟んでも変わらない）
 for(const [u,hp,def] of [[h,7000,2000],[l,2100,0],[r,2800,400]]){
  const probe=probeStats(u);assert.equal(u.maxHp-probe.maxHp,hp,`${label} ${u.name} maxHp includes growth`);
  if(u.soldierClass==='HEAVY')assert.equal(u.def-probe.def,def,`${label} ${u.name} def includes growth`);
  const shown=[u.maxHp,u.def];game.recalcSoldierStats(u);assert.deepEqual([u.maxHp,u.def],shown,`${label} ${u.name} stable`);
 }
 const e=game.merchants.flatMap(m=>m.escorts).find(x=>x.id===ids.escort);
 near(e.hitGrowthHp,1050,`${label} escort HP growth`);near(e.hitGrowthDef,300,`${label} escort DEF growth`);
 const ep=structuredClone(e);ep.hitGrowthHp=0;ep.hitGrowthDef=0;recalcEscortStats(ep);
 assert.equal(e.maxHp-ep.maxHp,1050,`${label} escort maxHp includes growth`);assert.equal(e.def-ep.def,300,`${label} escort def includes growth`);
}
game.resumeSavedGame(structuredClone(old));checkLoaded('first load');
{const player=game.player,probe=structuredClone(player);probe.hitGrowthHp=0;game.recalcPlayerStats();assert.equal(player.maxHp,Math.floor(player.maxHp),'commander maxHp is an integer');
 const keep=player.hitGrowthHp;player.hitGrowthHp=0;game.recalcPlayerStats();const bare=player.maxHp;player.hitGrowthHp=keep;game.recalcPlayerStats();assert.equal(player.maxHp-bare,3500,'commander maxHp includes growth');}

// (c) 保存 → 再読込を繰り返しても二重に掛からない
for(let round=1;round<=3;round++){
 const saved=game.saveGame({immediate:true});assert.equal(saved.hitGrowthScale,2,`round ${round}: mark is saved`);
 game.resumeSavedGame(saveSlots.get(game.activeSlotId).data);checkLoaded(`reload ${round}`);
}
// 同じ旧スナップショット（地点セーブ相当）を何度読んでも、その都度一回だけ換算される
game.resumeSavedGame(structuredClone(old));checkLoaded('checkpoint-style load A');
game.resumeSavedGame(structuredClone(old));checkLoaded('checkpoint-style load B');
// 印があるセーブは換算しない
{const marked=structuredClone(saveSlots.get(game.activeSlotId).data);assert.equal(marked.hitGrowthScale,2);game.resumeSavedGame(marked);checkLoaded('marked load');}
// 読み込んだセーブオブジェクト自体にも印が書き戻される（メモリ上のスロットを再度読んでも二重換算しない）
{const once=structuredClone(old);game.resumeSavedGame(once);assert.equal(once.hitGrowthScale,2);near(once.player.hitGrowthHp,3500);checkLoaded('in-place mark');}

// 戦死スロットの先輩兵・予備兵（スロット直下は別保存）も、スロットの印が無ければ一度だけ換算
{const make=growth=>{const s=game.createNewSoldier(null,{classKey:'HEAVY'});Object.assign(s,{hitGrowthHp:growth,hitGrowthDef:growth/10});return JSON.parse(JSON.stringify(s));};
 for(const [marked,factorHp,factorDef] of [[false,3.5,50],[true,1,1]]){
  const vet=make(100),res=make(200);
  const slot=saveSlots.create(`FALLEN ${marked}`,{veterans:[vet],reserveSurvivors:[res]});
  saveSlots.update(slot.id,{state:'fallen',...(marked?{hitGrowthScale:2}:{})});
  game.activeSlotId=slot.id;game.startFreshGame(true);
  const v=game.squad.find(s=>s.id===vet.id),r=[...game.squad,...game.reserves].find(s=>s.id===res.id);
  assert.ok(v&&r,'inherited units exist');
  near(v.hitGrowthHp,100*factorHp,`veteran HP growth (marked=${marked})`);near(v.hitGrowthDef,10*factorDef,`veteran DEF growth (marked=${marked})`);
  near(r.hitGrowthHp,200*factorHp,`reserve survivor HP growth (marked=${marked})`);
  assert.equal(saveSlots.get(slot.id).data.hitGrowthScale,2,'the new run saves with the mark');
 }}

console.log('PASS: HIT_HP 0.0001 / HIT_DEF 0.00035, old saves converted exactly once (commander, squad, reserves, escorts, hero party, gate guards, taverns, fallen-slot veterans), save/reload x3 stable, new game marked 2');
dom.window.close();
