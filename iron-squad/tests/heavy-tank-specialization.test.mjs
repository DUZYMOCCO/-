// v6.5.0 重装歩兵タンク特化: ヘイト距離補正・かばう(身代わり/重装側の防御計算)・重圧オーラ・重撃スタン・牽引速度
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WORLD_SIZE} from '../js/world.js';
import {TANK,prepareTanks,tankEvalDistSq,tankSlowFactor,tankStunSeconds,tankCover,isHeavySoldier} from '../js/heavy-tank.js';
import {attachWounded,transportSpeedFactor,RESCUE_TIMEOUT} from '../js/casualty-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame),C=WORLD_SIZE/2+4000;Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:C,y:C},selectedSaleIds:new Set()});
for(const key of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])g[key]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('Heavy tank').id;g.startFreshGame(false);g.monsters=[];
const foe={x:C+400,y:C,atk:10,hp:100,maxHp:100};
const realRecalc=IronSquadGame.recalcSoldierStats; // make() builds with real stats; afterwards recalc is frozen so growth does not reset the huge test HP
const make=(cls,x,y,def=0)=>{g.recalcSoldierStats=realRecalc;const s=g.createNewSoldier();s.soldierClass=cls;s.combatClass=cls;s.baseClassId=cls;s.hitGrowthHp=0;s.hitGrowthDef=0;g.recalcSoldierStats(s);Object.assign(s,{dodge:0,def,magicDef:0,dmgReduction:0,shieldTimer:0,equipmentBarrier:0,lethalGuardCooldown:999,hp:100000,maxHp:100000,x,y,isDown:false,dead:false,equipped:{},deathlineSkills:[]});g.recalcSoldierStats=noop;return s;};
const setup=(...units)=>{g.squad=units;g._tankHeavies=null;g._tankAllies=null;};
const lose=(u,fn)=>{u.maxHp=u.hp=100000;const b=u.hp;fn();return b-u.hp;};

// 柱1: 見かけ距離 (160x0.5=80 < 100) / ダウンで消失 / 実距離は返す
{const heavy=make('HEAVY',C+160,C),mage=make('MAGE',C+100,C);g.rebuildSquadSpatial([heavy,mage]);
 const hate=g.getNearestSquadInSpatial(C,C,500,true);assert.equal(hate.s,heavy);assert.ok(Math.abs(hate.dist-160)<1e-6,'distance reported is the real one');
 assert.equal(g.getNearestSquadInSpatial(C,C,500).s,mage,'no hate flag: plain nearest');
 assert.equal(tankEvalDistSq(heavy,160*160),160*160*.25);assert.equal(tankEvalDistSq(mage,100*100),100*100);
 assert.equal(tankEvalDistSq(g.player,100*100),100*100,'commander gets no bonus');
 {// 威圧感は近傍セル(約420px)の外にも届く：700pxの重装(見かけ350)が400pxの術士に勝つ。1000px超は届かない
 const far=make('HEAVY',C+700,C),near=make('MAGE',C,C+400);g.rebuildSquadSpatial([far,near]);prepareTanks(g,[far,near]);
 assert.equal(g.getNearestSquadInSpatial(C,C,2000,true).s,far,'distant heavy draws aggro');assert.ok(Math.abs(g.getNearestSquadInSpatial(C,C,2000,true).dist-700)<1e-6);
 far.x=C+1100;g.rebuildSquadSpatial([far,near]);prepareTanks(g,[far,near]);assert.equal(g.getNearestSquadInSpatial(C,C,2000,true).s,near,'beyond hate reach');
 g._tankHeavies=null;}
 heavy.isDown=true;assert.equal(tankEvalDistSq(heavy,160*160),160*160,'downed heavy loses the bonus');g.rebuildSquadSpatial([heavy,mage]);assert.equal(g.getNearestSquadInSpatial(C,C,500,true).s,mage);
 assert.equal(isHeavySoldier(g.player),false);assert.equal(isHeavySoldier({isGateGuard:true,soldierClass:'HEAVY'}),false);assert.equal(isHeavySoldier(make('LIGHT',0,0)),false);assert.equal(isHeavySoldier(make('PALADIN',0,0)),true);}
// 統合: update() の索敵で、遠い重装と近い術士なら重装を狙って進む
{const heavy=make('HEAVY',C+160,C),mage=make('MAGE',C+100,C);g.player.x=C-300;g.player.y=C;setup(heavy,mage);
 const m={id:'hate',type:'goblin',x:C,y:C,hp:1e6,maxHp:1e6,atk:1,def:0,speed:100,radius:10,atkTimer:5,attackInterval:5,color:'#0f0'};g.monsters=[m];
 g.update(.05);assert.equal(m._cachedTarget,heavy,'enemy picks the heavy (80 apparent < 100)');
 heavy.isDown=true;g.update(.05);assert.equal(m._cachedTarget,mage,'downed heavy -> back to the mage');g.monsters=[];}

// 柱2: かばう 50/50
{const heavy=make('HEAVY',C,C),mage=make('MAGE',C+50,C);setup(heavy,mage);
 assert.equal(lose(mage,()=>g.damageTarget(mage,100,{attacker:foe})),50,'victim takes half');
 assert.equal(100000-heavy.hp,50,'guardian takes the other half (DEF 0)');
 assert.ok(heavy.hitGrowthHp>0&&heavy.hitGrowthDef>0,'guardian grows HP and DEF from its share of the attack strength');
 assert.ok(mage.hitGrowthHp>0&&!(mage.hitGrowthDef>0),'victim grows only from its own share (no DEF growth for non-heavy)');
 assert.ok(Math.abs(mage.hitGrowthHp/heavy.hitGrowthHp-1)<.5,'both took a 50 share -> equal growth');}
// 範囲外(80px)・攻撃者なし・環境ダメージ・重装同士は対象外
{const heavy=make('HEAVY',C,C),far=make('MAGE',C+80,C),near=make('MAGE',C+60,C);setup(heavy,far,near);
 assert.equal(lose(far,()=>g.damageTarget(far,100,{attacker:foe})),100);assert.equal(heavy.hp,100000);
 assert.equal(lose(near,()=>g.damageTarget(near,100)),100,'no attacker (non-enemy) -> no cover');assert.equal(heavy.hp,100000);
 assert.equal(lose(near,()=>g.damageTarget(near,100,{attacker:foe,environmental:true})),100,'environmental is not covered');assert.equal(heavy.hp,100000);
 const h2=make('HEAVY',C+30,C);setup(heavy,h2);assert.equal(lose(h2,()=>g.damageTarget(h2,100,{attacker:foe})),100,'heavy is never covered by another heavy');assert.equal(heavy.hp,100000);}
// 隊長も守る
{const heavy=make('HEAVY',C,C);setup(heavy);const p=g.player;Object.assign(p,{x:C+40,y:C,invulnerableTimer:0,def:0,dodge:0,dmgReduction:0,hp:100000,maxHp:100000});
 g.recalcPlayerStats=noop; // 被弾成長でHPが整数を跨いでも、テスト用の巨大HPを再計算で潰さない
 assert.equal(lose(p,()=>g.damageTarget(p,100,{attacker:foe})),50);assert.equal(100000-heavy.hp,50);p.x=C-9000;delete g.recalcPlayerStats;}
// 瀕死(HP<=20%)の重装は発動しない / 最寄りが守護者
{const heavy=make('HEAVY',C,C),mage=make('MAGE',C+50,C);heavy.hp=Math.floor(heavy.maxHp*.15);setup(heavy,mage);const h0=heavy.hp;
 assert.equal(lose(mage,()=>g.damageTarget(mage,100,{attacker:foe})),100);assert.equal(heavy.hp,h0);
 const a=make('HEAVY',C+10,C),b=make('HEAVY',C+30,C),m=make('MAGE',C+40,C);setup(a,b,m);assert.equal(tankCover(g,m,100,{attacker:foe}).guardian,b,'nearest heavy covers');}
// 守護者の防御計算: DEFが高いほど失うHPが少ない / 犠牲者側の取り分は変わらない
{const run=def=>{const heavy=make('HEAVY',C,C,def),mage=make('MAGE',C+50,C);setup(heavy,mage);heavy.def=def;const lm=lose(mage,()=>g.damageTarget(mage,1000,{attacker:foe}));return {lh:100000-heavy.hp,lm};};
 const lo=run(0),hi=run(200);assert.ok(hi.lh<lo.lh,`DEF 200 guardian loses less (${hi.lh} < ${lo.lh})`);assert.equal(hi.lm,lo.lm,'victim share is independent of guardian DEF');assert.equal(lo.lh,500);
 assert.equal(hi.lh,Math.round(500*100/(100+200*1.2)),'guardian DEF applied as if hit directly');
 const heavy=make('HEAVY',C,C,0),mage=make('MAGE',C+50,C);heavy.magicDef=300;setup(heavy,mage);g.damageTarget(mage,1000,{attacker:foe,damageKind:'magic'});assert.ok(100000-heavy.hp<500,'magic DEF used for magic cover');}
// 回避しない／再帰しない／倒れない
{const heavy=make('HEAVY',C,C),mage=make('MAGE',C+50,C);heavy.dodge=100;setup(heavy,mage);g.damageTarget(mage,100,{attacker:foe});assert.equal(100000-heavy.hp,50,'guardian cannot dodge cover damage');
 const h2=make('HEAVY',C+20,C),h3=make('HEAVY',C-20,C),m=make('MAGE',C,C+30);setup(h2,h3,m);const orig=g.damageTarget;let calls=0;g.damageTarget=function(t,d,o){calls++;return orig.call(this,t,d,o);};g.damageTarget(m,100,{attacker:foe});g.damageTarget=orig;assert.equal(calls,2,'exactly victim + one guardian (no recursion)');
 assert.ok(100000-h2.hp+100000-h3.hp===50&&(h2.hp===100000||h3.hp===100000),'only one guardian pays');
 const tough=make('HEAVY',C,C),v=make('MAGE',C+50,C);tough.hp=Math.floor(tough.maxHp*.21);setup(tough,v);g.damageTarget(v,tough.maxHp*20,{attacker:foe});assert.equal(tough.hp,1,'guardian floors at 1 HP');assert.equal(tough.isDown,false);}

// 柱3-A: 重圧オーラ
{const heavy=make('HEAVY',C,C);const m={x:C+40,y:C};g._tankHeavies=[heavy];
 assert.equal(tankSlowFactor(g,m,1),TANK.auraSlow);assert.equal(tankSlowFactor(g,{x:C+60,y:C},1),1,'outside 48px');
 assert.ok(Math.abs(tankSlowFactor(g,m,.55)-.33)<1e-9,'stacks with magic slow');assert.equal(tankSlowFactor(g,m,.3),.25,'25% floor');assert.equal(tankSlowFactor(g,{x:C+60,y:C},.55),.55,'magic slow alone untouched');
 heavy.isDown=true;assert.equal(tankSlowFactor(g,m,1),1,'downed heavy does not slow');g._tankHeavies=[];assert.equal(tankSlowFactor(g,m,1),1);}
// 統合: update() で重装のオーラ内の敵は0.60倍で進む
{const mk=(id,x,y)=>({id,type:'goblin',x,y,hp:1e6,maxHp:1e6,atk:1,def:0,speed:100,radius:10,atkTimer:5,attackInterval:5,color:'#0f0'});
 const heavy=make("HEAVY",C,C);g.player.x=C-300;g.player.y=C;setup(heavy);
 const a=mk('aura',C+25,C),b=mk('free',C+300,C);g.monsters=[a,b];const ax=a.x,bx=b.x;g.update(.05);
 const da=ax-a.x,db=bx-b.x;assert.ok(da>0&&db>0,`both advance (${da}, ${db})`);assert.ok(Math.abs(da/db-.6)<.05,`aura ratio ${da/db}`);g.monsters=[];}

// 柱3-B: 重撃スタン
{const shielded=make('HEAVY',0,0),hammer=make('HEAVY',0,0),sword=make('HEAVY',0,0),light=make('LIGHT',0,0);
 shielded.equipped={shield:{type:'SHIELD'},weapon:{weaponStyle:'sword'}};hammer.equipped={weapon:{weaponStyle:'hammer'}};sword.equipped={weapon:{weaponStyle:'sword'}};light.equipped={shield:{type:'SHIELD'},weapon:{weaponStyle:'axe'}};
 const mon={},boss={isBoss:true},titan={isBoss:true,isColossal:true},lo=()=>0,hi=()=>.9;
 assert.equal(tankStunSeconds(shielded,mon,lo),.8);assert.equal(tankStunSeconds(hammer,mon,lo),.8);assert.equal(tankStunSeconds(sword,mon,lo),0,'plain sword heavy: no stun');assert.equal(tankStunSeconds(light,mon,lo),0,'non-heavy: no stun');
 assert.equal(tankStunSeconds(shielded,mon,hi),0,'35% only');assert.equal(tankStunSeconds(shielded,boss,lo),.4,'boss: half');assert.equal(tankStunSeconds(shielded,titan,lo),0,'colossal immune');
 shielded.atk=50;shielded.x=C;shielded.y=C;g.squad=[shielded];const mk=()=>({x:C+10,y:C,hp:1e6,maxHp:1e6,def:0,type:'goblin',radius:10,color:'#0f0'});
 const rnd=Math.random,mm=mk(),mm2=mk();Math.random=()=>0;
 try{g.performAttack(shielded,mm,false);sword.atk=50;sword.x=C;sword.y=C;g.performAttack(sword,mm2,false);}finally{Math.random=rnd;}
 assert.equal(mm.magicStunTimer,.8,'hit applies the stun');assert.ok(!(mm2.magicStunTimer>0),'plain sword heavy never stuns');}

// 牽引: 重装は速度が落ちない
{const heavy={id:'tank',name:'tank',soldierClass:'PALADIN',combatClass:'HEAVY',hp:100,x:C,y:C,speed:100},down=a=>({id:a,name:a,x:C+10,y:C,isDown:true,hp:0,maxHp:100,downTimer:RESCUE_TIMEOUT,rescueProgress:0});
 const w1=down('w1'),w2=down('w2'),w3=down('w3'),w4=down('w4');g.player.x=C;g.player.y=C;g.squad=[heavy,w1,w2,w3,w4];
 assert.equal(attachWounded(g,heavy,w1),true);assert.equal(attachWounded(g,heavy,w2),true);assert.equal(transportSpeedFactor(g,heavy),1,'heavy towing 2: full speed');
 assert.equal(attachWounded(g,g.player,w3),true);assert.ok(transportSpeedFactor(g,g.player)<1,'commander towing still slows');
 const plain={id:'plain',name:'plain',soldierClass:'LIGHT',combatClass:'LIGHT',hp:100,x:C,y:C,speed:100};g.squad.push(plain);assert.equal(attachWounded(g,plain,w4),true);assert.ok(transportSpeedFactor(g,plain)<1,'non-heavy towing slows');
 assert.equal(transportSpeedFactor(g,make('HEAVY',0,0)),1,'no cargo: 1');}
console.log('PASS: heavy tank specialization (hate, cover, aura, stun, towing)');
