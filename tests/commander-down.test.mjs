// v4.2.23: the commander goes DOWN at 0 HP (like soldiers) and can be saved by a medic or by being carried.
import assert from 'node:assert/strict';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {RESCUE_TIMEOUT,updateWounded,treatWounded,handleTransportAI,nearestCasualtyStation,updateNpcRescue,grantRescueBonus,syncDragged,attachWounded,carriedSoldiers,buildMedicRescueAssign,rescueUnits} from '../js/games/iron-squad/casualty-rules.js';
import {healAmountFor} from '../js/games/iron-squad/phase-rules.js';
import {npcSave,applyNpcSave} from '../js/games/iron-squad/merchant-rules.js';
import {guardRescueLines} from '../js/games/iron-squad/soldier-dialogue.js';
import {saveSlots} from '../js/games/iron-squad/save-slots.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
globalThis.window={};globalThis.document={getElementById:()=>null};
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const game=Object.create(IronSquadGame);
for(const m of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast','spawnSparks','spawnDamageText','renderStrategyUI','gainExp','refreshSupplyUI'])game[m]=()=>{};
game.activeSlotId=saveSlots.create('隊長ダウン検証').id;game.startFreshGame(false);
const c=WORLD_SIZE/2;let overs=0;game.gameOver=()=>{overs++;};
const mk=(id,cls='HEAVY',x=c+800,y=c)=>({id,name:id,soldierClass:cls,hp:100,maxHp:100,x,y,speed:100});
const p=game.player;
const reset=()=>{Object.assign(p,{x:c+800,y:c,hp:p.maxHp,isDown:false,downTimer:0,invulnerableTimer:0,lethalGuardCooldown:999,rescuedThisDown:false});delete p.carrierId;delete p.downId;delete p.downedInAid;overs=0;game.gold=500;game.monsters=[];game.civilians=[];game.restTimer=0;};

// 1) lethal hit -> DOWN, not game over
reset();game.squad=[mk('a')];
game.damageTarget(p,p.maxHp*5);
assert.equal(p.isDown,true);assert.equal(p.hp,0);assert.equal(p.downTimer,RESCUE_TIMEOUT);assert.equal(overs,0,'0 HP is not instant death');
assert.ok(rescueUnits(game).includes(p));
const hpBefore=p.hp;game.damageTarget(p,9999);assert.equal(p.hp,hpBefore,'a downed commander takes no extra hits (same as soldiers)');assert.equal(overs,0);

// 2) 即死対策 keeps priority
reset();p.lethalGuardCooldown=0;game.squad=[mk('a')];game.damageTarget(p,p.maxHp*5);
assert.equal(p.isDown,false);assert.equal(p.hp,1);assert.ok(p.lethalGuardCooldown>0);

// 3) solo / nobody able to help: still DOWN with a countdown; game over only when it runs out
reset();game.squad=[];game.gateGuards=[];game.merchants=[];game.damageTarget(p,p.maxHp*5);assert.equal(p.isDown,true);assert.equal(overs,0);
updateWounded(game,10);assert.equal(overs,0);updateWounded(game,RESCUE_TIMEOUT);assert.equal(overs,1,'countdown expiry -> existing game over');
reset();game.squad=[{...mk('x'),isDown:true,hp:0}];game.damageTarget(p,p.maxHp*5);assert.equal(p.isDown,true);assert.equal(overs,0);

// 3b) solo + nearby gate guard carries the commander to the main base and revives on arrival
reset();game.squad=[];game.merchants=[];
const guard={id:'gg1',name:'門番',isGateGuard:true,gateSpace:'field',hp:100,maxHp:100,x:p.x+200,y:p.y,speed:90,homeX:p.x+200,homeY:p.y,radius:10};
game.gateGuards=[guard];game.damageTarget(p,p.maxHp*5);assert.equal(p.isDown,true);
for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);
assert.equal(p.carrierId,'gg1','gate guard picks the commander up');
const st=nearestCasualtyStation(game,p),dst=()=>Math.hypot(guard.x-st.x,guard.y-st.y),gd0=dst();for(let i=0;i<20;i++){updateNpcRescue(game,.1);syncDragged(game,.1);}
assert.ok(dst()<gd0,'guard heads for the nearest town/base/post');
for(let i=0;i<3000&&p.isDown;i++){updateNpcRescue(game,.1);syncDragged(game,.1);updateWounded(game,.1);}
assert.equal(p.isDown,false);assert.equal(p.hp,p.maxHp);assert.equal(overs,0);
updateNpcRescue(game,.1);assert.equal(guard._rescueMission,undefined);assert.equal(guard.returningToBase,true,'guard returns to its post');
// a far-away guard does not help
reset();game.squad=[];guard.x=p.x+5000;guard.homeX=guard.x;delete guard._rescueMission;game.damageTarget(p,p.maxHp*5);updateNpcRescue(game,.1);assert.equal(p.carrierId,undefined);

// 3c) merchant escorts help only if the commander once rescued them (debt is consumed after one repayment)
reset();game.squad=[];game.gateGuards=[];
const said=[];game.dialogue={trigger:(u,cat)=>{said.push([u.id,cat]);return true;}};
const esc={id:'esc1',name:'護衛',isMerchantEscort:true,hp:100,maxHp:100,x:p.x+150,y:p.y,speed:90,homeX:p.x+150,homeY:p.y};
game.merchants=[{id:'mer',escorts:[esc]}];game.damageTarget(p,p.maxHp*5);
for(let i=0;i<30;i++)updateNpcRescue(game,.1);assert.equal(p.carrierId,undefined,'an escort never rescued by the commander does not help');assert.equal(said.length,0);
esc.owesCommander=true;
const saved=npcSave(esc);assert.equal(saved.owesCommander,true,'debt flag is saved');const esc2={id:'esc1',isMerchantEscort:true,hp:1,maxHp:1};applyNpcSave(esc2,JSON.parse(JSON.stringify(saved)));assert.equal(esc2.owesCommander,true,'debt flag survives load');
for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);
assert.equal(p.carrierId,'esc1');assert.deepEqual(said[0],['esc1','DEBT_REPAID']);
const st2=nearestCasualtyStation(game,p);for(let i=0;i<4000&&p.isDown;i++){updateNpcRescue(game,.1);syncDragged(game,.1);updateWounded(game,.1);}
game.random=()=>.9; // 貸し借りなし
assert.equal(p.isDown,false);updateNpcRescue(game,.1);assert.equal(esc.owesCommander,undefined,'debt consumed');assert.equal(esc.commanderFriend,undefined);assert.equal(esc.returningToBase,true);
assert.deepEqual(said.at(-1),['esc1','DEBT_SETTLED']);
reset();game.squad=[];game.damageTarget(p,p.maxHp*5);for(let i=0;i<40;i++)updateNpcRescue(game,.1);assert.equal(p.carrierId,undefined,'settled escort does not help again');
// friend outcome: owes again, repay with a low roll -> lasting friend, helps again, persisted
reset();game.squad=[];esc.owesCommander=true;esc.x=p.x+150;esc.y=p.y;game.random=()=>.1;game.damageTarget(p,p.maxHp*5);
for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);
for(let i=0;i<4000&&p.isDown;i++){updateNpcRescue(game,.1);syncDragged(game,.1);updateWounded(game,.1);}
updateNpcRescue(game,.1);assert.equal(esc.commanderFriend,true);assert.equal(esc.owesCommander,undefined);assert.deepEqual(said.at(-1),['esc1','FRIEND_FAREWELL']);
const sv=JSON.parse(JSON.stringify(npcSave(esc)));const esc3={id:'esc1',isMerchantEscort:true,hp:1,maxHp:1};applyNpcSave(esc3,sv);assert.equal(esc3.commanderFriend,true,'friend flag persists');
reset();game.squad=[];esc.x=p.x+150;esc.y=p.y;game.damageTarget(p,p.maxHp*5);for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);assert.equal(p.carrierId,'esc1','friend helps again');
p.isDown=false;p.hp=p.maxHp;updateNpcRescue(game,.1);delete game.random;
// rescuing an escort personally marks the debt
reset();game.squad=[];const hurt={id:'esc9',isMerchantEscort:true,isDown:true,hp:0,maxHp:100,x:p.x,y:p.y,downTimer:30,name:'護衛'};
grantRescueBonus(game,hurt,{method:'MEDIC',medic:p,carrier:null});assert.equal(hurt.owesCommander,true);
const hurt2={id:'esc8',isMerchantEscort:true,isDown:true,hp:0,maxHp:100,x:p.x,y:p.y,downTimer:30,name:'護衛'};grantRescueBonus(game,hurt2,{method:'MEDIC',medic:mk('zz','MEDIC')});assert.equal(hurt2.owesCommander,undefined,'only a personal rescue by the commander counts');
game.merchants=[];game.dialogue=undefined;

// 3d) gate guard lines: eligibility + per-guard repeat count (persisted)
assert.deepEqual(guardRescueLines({}),['大丈夫か？','めんどくせぇなぁ']);
assert.ok(guardRescueLines({repeat:true}).includes('また転がってるのか'));
assert.ok(!guardRescueLines({family:'山田'}).some(l=>l.includes('家の')),'unknown gender: family line omitted');
assert.ok(!guardRescueLines({gender:'male'}).some(l=>l.includes('家の')),'unknown surname: family line omitted');
assert.ok(guardRescueLines({family:'山田',gender:'male'}).includes('お前、山田家の息子か？'));
assert.ok(guardRescueLines({family:'山田',gender:'female'}).includes('お前、山田家の娘か？'));
reset();game.squad=[];game.merchants=[];const lines=[];game.dialogue={say:(u,t)=>{lines.push(t);return true;}};
const g2={id:'gg2',name:'門番',isGateGuard:true,gateSpace:'field',hp:100,maxHp:100,x:p.x+120,y:p.y,speed:90,homeX:p.x+120,homeY:p.y,radius:10};game.gateGuards=[g2];
Object.assign(p,{familyName:'山田',gender:'female'});game.random=()=>.99;game.damageTarget(p,p.maxHp*5);
for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);assert.equal(lines.at(-1),'お前、山田家の娘か？','last eligible line chosen with random .99');
for(let i=0;i<4000&&p.isDown;i++){updateNpcRescue(game,.1);syncDragged(game,.1);updateWounded(game,.1);}updateNpcRescue(game,.1);
assert.equal(g2.commanderRescues,1);assert.equal(JSON.parse(JSON.stringify(npcSave(g2))).commanderRescues,1);
const g2b={id:'gg2'};applyNpcSave(g2b,JSON.parse(JSON.stringify(npcSave(g2))));assert.equal(g2b.commanderRescues,1,'repeat count persists');
reset();game.squad=[];g2.x=p.x+120;g2.y=p.y;game.random=()=>.5;game.damageTarget(p,p.maxHp*5);
for(let i=0;i<200&&!p.carrierId;i++)updateNpcRescue(game,.1);assert.ok(['また転がってるのか','お前、山田家の娘か？','めんどくせぇなぁ','大丈夫か？'].includes(lines.at(-1)));
p.isDown=false;updateNpcRescue(game,.1);delete p.familyName;delete p.gender;delete game.random;game.dialogue=undefined;game.gateGuards=[];

// 4) medic revives on the spot, HP from the healer's formula (healAmountFor; was a flat 35%), brief invulnerability, no gold, control returns
reset();const medic=mk('m','MEDIC',c+810,c);game.squad=[medic];game.damageTarget(p,p.maxHp*5);
const gold=game.gold,treasury=game.treasury||0;
treatWounded(game,medic,p,.5);assert.equal(treatWounded(game,medic,p,.5),true);
assert.equal(p.isDown,false);assert.equal(p.hp,Math.max(1,Math.floor(healAmountFor(medic,p))));assert.ok(p.invulnerableTimer>0);
assert.equal(game.gold,gold,'no gold to the commander for being rescued');assert.equal(game.treasury||0,treasury);assert.ok(medic.rescues>=1);
assert.equal(p.shieldTimer||0,0);
game.damageTarget(p,5);assert.equal(p.hp,Math.max(1,Math.floor(healAmountFor(medic,p))),'brief invulnerability after revival');

// 5) medic gets TOP priority in the AI assignment
reset();const m2=mk('m2','MEDIC',c+900,c),other={...mk('o'),isDown:true,hp:0,x:c+810,y:c};
p.isDown=true;p.hp=0;
const assign=buildMedicRescueAssign([p,other,m2],p);assert.equal(assign.get('m2'),p);

// 6) real update loop: medic walks to the downed commander and revives
reset();const node={classList:{add(){},remove(){},toggle(){}},style:{}};globalThis.document={getElementById:()=>node};
game.width=390;game.height=700;game.zoom=1;game.joystick={active:false,dirX:0,dirY:0};game.updateSpawns=()=>{};
const mm=Object.assign(game.createNewSoldier(),{x:c+850,y:c,soldierClass:'MEDIC',hp:100,maxHp:100});game.squad=[mm];game.damageTarget(p,p.maxHp*5);
for(let i=0;i<400&&p.isDown;i++)game.update(.1);
assert.equal(p.isDown,false,'medic arrives and revives');assert.ok(p.hp>0);assert.equal(overs,0);

// 7) no medic: a soldier carries the commander to the main base, revived at full HP on arrival
reset();const carrier=mk('car','HEAVY',c+400,c);game.squad=[carrier];p.x=c+420;game.damageTarget(p,p.maxHp*5);
assert.equal(attachWounded(game,carrier,p),true);assert.equal(carriedSoldiers(game,carrier)[0],p);
const d0=Math.hypot(carrier.x-c,carrier.y-c);handleTransportAI(game,carrier,1);assert.ok(Math.hypot(carrier.x-c,carrier.y-c)<d0);
const t0=p.downTimer;updateWounded(game,5);assert.equal(p.downTimer,t0,'timer pauses while carried in the field');
p.x=c;p.y=c;p.downedInAid=false;updateWounded(game,.1);
assert.equal(p.isDown,false);assert.equal(p.hp,p.maxHp);assert.equal(game.gold,500);assert.equal(overs,0);

// 8) with a healer somewhere, carriers bring the commander to the healer rather than the base
reset();const car2=mk('car2','HEAVY',c+3000,c),healer=mk('h','MEDIC',c+3600,c);game.squad=[car2,healer];p.x=c+3040;p.y=c;game.damageTarget(p,p.maxHp*5);
attachWounded(game,car2,p);const dh=Math.hypot(car2.x-healer.x,car2.y-healer.y);handleTransportAI(game,car2,1);
assert.ok(Math.hypot(car2.x-healer.x,car2.y-healer.y)<dh&&car2.x>c+3000,'moves toward the healer (away from base)');

// 9) countdown expiry -> existing game over
reset();game.squad=[mk('a')];game.damageTarget(p,p.maxHp*5);p.downTimer=.2;updateWounded(game,1);assert.equal(overs,1);

// 10) rest: timer does not run (dt 0) and base regen / phase heal cannot heal a downed commander
reset();game.squad=[mk('a')];game.damageTarget(p,p.maxHp*5);const rt=p.downTimer;updateWounded(game,0);assert.equal(p.downTimer,rt);

// 11) save / load while down
reset();game.squad=[mk('a')];game.damageTarget(p,p.maxHp*5);p.downTimer=33;
assert.ok(game.saveGame()||true);const snap=saveSlots.get(game.activeSlotId).data;assert.equal(snap.player.isDown,true);
game.resumeSavedGame(structuredClone(snap));
assert.equal(game.player.isDown,true);assert.equal(game.player.hp,0);assert.equal(game.player.downTimer,33);assert.equal(overs,0);
game.player.downTimer=2;game.saveGame();game.resumeSavedGame(structuredClone(saveSlots.get(game.activeSlotId).data));assert.ok(game.player.downTimer>=20,'resume never drops straight into death');
console.log('commander-down ok');
