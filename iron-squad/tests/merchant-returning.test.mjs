import assert from 'node:assert/strict';
import {nearestLivingMerchant,merchantHealingStatus,useMerchantHealing,updateMerchants,makeEscort} from '../js/merchant-rules.js';
import {reviveByPotion} from '../js/casualty-rules.js';
import {supplyLocation,supplyMethods} from '../js/supply-rules.js';
const merchant=()=>({id:'returning',name:'ルカ',isMerchant:true,soldierClass:'MERCHANT',x:10000,y:10000,homeX:10600,homeY:10000,hp:100,maxHp:100,returningToBase:true,rescuedToBase:true,stockPhase:1,stock:[],escorts:[]});
const game=m=>({phase:1,player:{x:m.x,y:m.y,hp:50,maxHp:100},merchants:[m],monsters:[],gold:100000,revivalPotion:0,squadPotion:0,squad:[],reserves:[],saveGame(){},updateStatsUI(){},renderSupplyPanel(){},showToast(){}});
let m=merchant(),g=game(m);
assert.equal(nearestLivingMerchant(g,m.x,m.y),m);assert.equal(merchantHealingStatus(g,m),'available');assert.equal(useMerchantHealing(g,m).ok,true);
assert.equal(supplyLocation(g).kind,'merchant');assert.equal(supplyMethods.replenishRevivalPotion.call(g,m),true);assert.equal(supplyMethods.replenishSquadPotion.call(g,m),true);
for(const fields of [{dead:true},{isDown:true},{hp:0}]){const old={...m};Object.assign(m,fields);assert.equal(nearestLivingMerchant(g,m.x,m.y),null);assert.equal(merchantHealingStatus(g,m),'unavailable');Object.assign(m,old);}
for(const fields of [{dead:true},{isDown:true},{hp:0}]){const old={...g.player};Object.assign(g.player,fields);assert.equal(nearestLivingMerchant(g,m.x,m.y),null);assert.equal(merchantHealingStatus(g,m),'unavailable');Object.assign(g.player,old);}
for(const far of [false,true]){
 m=merchant();g=game(m);m.escorts=[makeEscort(m,0),makeEscort(m,1)];
 const rescued=m.escorts[1];Object.assign(rescued,{rescuedToBase:true,returningToBase:true,homeX:10680,homeY:10040});
 if(far){g.player.x=20000;g.camera={x:20000,y:20000};}
 let maxGap=0;
 for(let i=0;i<480;i++){updateMerchants(g,1/60);for(const e of m.escorts)maxGap=Math.max(maxGap,Math.hypot(e.x-m.x,e.y-m.y));}
 assert.ok(maxGap<90,`${far?'far':'near'} maximum guard gap ${maxGap}`);
 g._tradingMerchant=m;const x=m.x;for(let i=0;i<180;i++)updateMerchants(g,1/60);assert.equal(m.x,x);for(const e of m.escorts)assert.ok(Math.hypot(e.x-m.x,e.y-m.y)<60);
 const enemy={x:m.x+40,y:m.y,hp:100,radius:14,atk:0};g.monsters=[enemy];let attacks=0;
 for(let i=0;i<120;i++)updateMerchants(g,1/60,null,{damageMonster(){attacks++;}});assert.ok(attacks>0,'guards fight beside the paused merchant');g.monsters=[];
 g._tradingMerchant=null;for(let i=0;i<600;i++)updateMerchants(g,1/60);
 assert.equal(m.returningToBase,false);assert.equal(m.x,m.homeX);assert.equal(rescued.returningToBase,false);assert.equal(rescued.x,rescued.homeX);assert.equal(rescued.y,rescued.homeY);
}
// A genuine rescue latches its permanent reward once; trading/arrival never award again.
m=merchant();g=game(m);m.isDown=true;m.hp=0;m.x+=20;g._merchantWounded=[m];
assert.equal(reviveByPotion(g,m),true);assert.equal(m.rescueRewardGranted,true);const reward=structuredClone(g.rescueBonuses),ids=[...g.rescueRewardIds];
g._tradingMerchant=m;updateMerchants(g,1);g._tradingMerchant=null;for(let i=0;i<900;i++)updateMerchants(g,1/60);
assert.equal(m.returningToBase,false);assert.deepEqual(g.rescueBonuses,reward);assert.deepEqual(g.rescueRewardIds,ids);
console.log('PASS: returning merchant services, incapacitated guards, near/far escorts, pause/resume, defense, posts and one reward');
