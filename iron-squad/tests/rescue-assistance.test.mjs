import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {updateRescueAssistance,handleRescueAssistance,pendingNpcRescue,answerNpcRescue} from '../js/rescue-assistance.js';
import {buildTransportRescueAssign,nearestRevivalPotionTarget,REVIVAL_POTION_RANGE} from '../js/casualty-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const unit=(id,soldierClass,x=10000)=>({id,name:id,soldierClass,x,y:10000,hp:100,maxHp:100,speed:100,mana:100,maxMana:100,isPersonalGuard:true,level:1,reqExp:10000});
const casualty=(id,flags={})=>({...unit(id,'HEAVY',10280),isDown:true,hp:0,downTimer:45,...flags});
const fresh=()=>{document.getElementById('game').replaceChildren();const medic=unit('ルチア','MEDIC'),target=casualty('ルカ',{isMerchant:true});return {container:document.getElementById('game'),player:unit('隊長','LIGHT'),squad:[medic],reserves:[],merchants:[target],gateGuards:[],_merchantWounded:[target],worldTime:0,revivalPotion:1,saveGame(){},updateStatsUI(){}};};
const tick=(g,dt=.1)=>{const result=updateRescueAssistance(g,dt,g.squad);for(const u of g.squad)if(!u.isDown)handleRescueAssistance(g,u,dt);return result;};
let g=fresh(),medic=g.squad[0],target=g.merchants[0];
g.squad.push(casualty('自部隊'));tick(g);assert.equal(pendingNpcRescue(g),null);g.squad.pop();tick(g);assert.equal(pendingNpcRescue(g).target,target);assert.equal(document.querySelectorAll('.npc-rescue-request').length,1);assert.ok(!g.container.classList.contains('dialog-open'));
g.squad.push(unit('二人目','HIGH_PRIEST'));tick(g);assert.equal(document.querySelectorAll('.npc-rescue-request').length,1);
document.querySelector('[data-rescue-answer="false"]').click();assert.equal(pendingNpcRescue(g),null);tick(g,29);assert.equal(pendingNpcRescue(g),null);tick(g,1.1);assert.ok(pendingNpcRescue(g));tick(g,10.1);assert.equal(pendingNpcRescue(g),null);assert.equal(document.querySelector('.npc-rescue-request'),null);tick(g,29);assert.equal(pendingNpcRescue(g),null);
for(const [label,flags]of [['merchant',{isMerchant:true}],['escort',{isMerchantEscort:true}],['gate',{isMerchantEscort:true,isGateGuard:true,gateSpace:'field'}]]){
 g=fresh();medic=g.squad[0];target=casualty(label,flags);g.merchants=flags.isMerchant?[target]:[{escorts:flags.isMerchantEscort&&!flags.isGateGuard?[target]:[]}];g.gateGuards=flags.isGateGuard?[target]:[];g._merchantWounded=[target];let postCalls=0;g.onGateGuardRevived=()=>postCalls++;
 tick(g);document.querySelector('[data-rescue-answer="true"]').click();assert.equal(pendingNpcRescue(g),null);
 const start=medic.x;for(let i=0;i<50&&target.isDown;i++)tick(g);
 assert.ok(medic.x>start);assert.equal(target.isDown,false,label);assert.ok(medic.mana<100);assert.ok(medic.revivalSkillCooldownUntil>0);
 if(flags.isGateGuard)assert.equal(postCalls,1);else {assert.ok(target.returningToBase);assert.ok(target.rescuedToBase);}
}
g=fresh();tick(g);answerNpcRescue(g,true);const before=g.squad[0].x;g.squad.push(casualty('new down'));tick(g);assert.equal(g.squad[0].x,before,'own casualties cancel the NPC job');assert.equal(g.merchants[0].isDown,true);
// Main-body medics must be near; promoted medics and all three NPC types use the same flow.
for(const cls of ['MEDIC','HIGH_PRIEST','SAINT','ARCHANGEL']){g=fresh();g.squad[0].soldierClass=cls;g.squad[0].isPersonalGuard=false;g.squad[0].x+=301;tick(g);assert.equal(pendingNpcRescue(g),null);g.squad[0].x-=2;tick(g);assert.ok(pendingNpcRescue(g));}
g=fresh();g.squad[0].heroPartyId='independent-party';tick(g);assert.equal(pendingNpcRescue(g),null,'independent heroes do not accept a main-army medic job');
g=fresh();g.merchants=[];g.gateGuards=[casualty('town guard',{isGateGuard:true,isMerchantEscort:true,gateSpace:'town-other'})];g._merchantWounded=g.gateGuards;tick(g);assert.equal(pendingNpcRescue(g),null,'town-local guard coordinates are not field coordinates');
// Commander potion job: personal first, one runner, no transport competition or double dose.
g=fresh();g.merchants=[];g._merchantWounded=[];g.player.isDown=true;g.player.hp=0;const light=unit('ゲオルグ','LIGHT',10350),main=unit('本隊','LIGHT',10020);main.isPersonalGuard=false;g.squad=[main,light];
assert.equal(tick(g).potionRunner,light);assert.equal(g.revivalPotion,1);assert.ok(light.x<10350);for(let i=0;i<50&&g.player.isDown;i++)tick(g);assert.equal(g.player.isDown,false);assert.equal(g.player.hp,g.player.maxHp);assert.equal(g.revivalPotion,0);for(let i=0;i<5;i++)tick(g);assert.equal(g.revivalPotion,0);
for(const mode of ['no-potion','no-light','carrying','regrouping','far','other-space']){
 g=fresh();g.merchants=[];g._merchantWounded=[];g.player.isDown=true;g.player.hp=0;const u=unit('軽装','LIGHT',10200);g.squad=[u];
 if(mode==='no-potion')g.revivalPotion=0;if(mode==='no-light')u.soldierClass='HEAVY';if(mode==='regrouping')u.regrouping=true;if(mode==='far')u.x+=201;if(mode==='carrying'){g.squad.push(casualty('cargo',{carrierId:u.id}));}if(mode==='other-space'){g.currentDungeon={id:'cave'};u.isPersonalGuard=false;}
 assert.equal(tick(g).potionRunner,null,mode);assert.equal(g.revivalPotion,mode==='no-potion'?0:1);if(['no-potion','no-light'].includes(mode))assert.equal(buildTransportRescueAssign(g).get(u),g.player,'normal transport still available');
}
g=fresh();g.merchants=[];g._merchantWounded=[];g.player.isDown=true;g.player.hp=0;g.squad=[unit('軽装','LIGHT',10380)];tick(g);g.player.isDown=false;g.player.hp=50;tick(g);assert.equal(g.revivalPotion,1,'another rescue cancels without consuming medicine');
g=fresh();g.merchants=[];const patient=casualty('120',{x:10120});g.squad=[patient];assert.equal(REVIVAL_POTION_RANGE,150);assert.equal(nearestRevivalPotionTarget(g),patient);patient.x=10200;assert.equal(nearestRevivalPotionTarget(g),null);
// Commander dash: the medic falls behind (regrouping) but the prompt and the accepted job survive.
g=fresh();medic=g.squad[0];target=g.merchants[0];tick(g);assert.ok(pendingNpcRescue(g));g.player.x+=2000;medic.regrouping=true;for(let i=0;i<20;i++)tick(g);assert.ok(pendingNpcRescue(g),'dash keeps the prompt');assert.equal(document.querySelectorAll('.npc-rescue-request').length,1);document.querySelector('[data-rescue-answer="true"]').click();assert.equal(medic.regrouping,false);medic.regrouping=true;for(let i=0;i<50&&target.isDown;i++)tick(g);assert.equal(target.isDown,false,'accepted rescue finishes during dash');g=fresh();g.squad[0].regrouping=true;tick(g);assert.equal(pendingNpcRescue(g),null,'a regrouping medic is not newly asked');
dom.window.close();console.log('PASS: one nonmodal prompt, own priority/cancellation, accept/revive, decline/timeout, all NPCs/medics, light potion approach/fallback/cancel and 150 range');
