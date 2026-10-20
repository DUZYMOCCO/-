// v7.2.10: 衛生士の「たすけに いきますか？」は、選ぶまで残る。閉じるのは相手が亡くなった・起き上がった・いなくなったときだけ。商人・護衛・門番（救護所の番兵）すべて。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const RA=await import('../js/rescue-assistance.js?v=344');const CR=await import('../js/casualty-rules.js?v=322');
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
const toasts=[];
const setup=()=>{const game=Object.create(IronSquadGame);
 Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:0,y:0},selectedSaleIds:new Set(),commandActiveUntil:0});
 for(const name of ['startGameLoop','spawnSparks','spawnDamageText'])game[name]=noop;game.showToast=t=>toasts.push(t);
 game.setupUI();game.activeSlotId=saveSlots.create('PROMPT TEST ONLY').id;game.startFreshGame(false);game.restTimer=0;game.monsters=[];
 game.squad=game.squad.filter(s=>s.soldierClass!=='MEDIC');
 const med=game.createNewSoldier(null,{classKey:'MEDIC'});med.isPersonalGuard=true;med.x=game.player.x+30;med.y=game.player.y;game.squad.push(med);return {game,med};};
const panel=()=>document.querySelectorAll('.npc-rescue-request');
const run=(game,sec)=>{for(let t=0;t<sec;t+=1/30)game.update(1/30);};
const kinds=['merchant','escort','sentry'];
for(const kind of kinds){
 const {game,med}=setup();const m=game.merchants.find(x=>x.id==='merchant_base_camp');
 const target=kind==='merchant'?m:kind==='escort'?m.escorts[0]:(game.gateGuards||[]).find(g=>g.gateSpace==='field');
 ok(target,`${kind} exists`);target.x=game.player.x+150;target.y=game.player.y;CR.markSoldierDown(game,target);
 run(game,.2);eq(panel().length,1,`${kind}: prompt shown`);ok(RA.pendingNpcRescue(game).target===target);
 run(game,12);eq(panel().length,1,`${kind}: still open after 12 s (was closed at 10 s)`);
 med.mana=0;run(game,1);eq(panel().length,1,`${kind}: stays while the medic is out of MP`);
 const own=game.squad.find(s=>s!==med&&!s.isDown);CR.markSoldierDown(game,own);run(game,1);eq(panel().length,1,`${kind}: stays while one of ours is down`);
 own.isDown=false;own.hp=own.maxHp;game.player.x+=600;run(game,1);eq(panel().length,1,`${kind}: stays when the commander moves away`);game.player.x-=600;
 panel()[0].remove();run(game,.1);eq(panel().length,1,`${kind}: put back if the screen dropped it`);
 // Accept while no medic can go: the prompt stays, with a note.
 toasts.length=0;for(const u of game.squad)if(CR.isMedic(u))u.mana=0;panel()[0].querySelector('[data-rescue-answer="true"]').click();eq(panel().length,1,`${kind}: no free medic -> stays`);ok(toasts.some(t=>t.includes('えいせいし')),'note shown');
 med.mana=med.maxMana||100;med.revivalSkillCooldownUntil=0;med.x=game.player.x+30;med.y=game.player.y;panel()[0].querySelector('[data-rescue-answer="true"]').click();
 eq(panel().length,0,`${kind}: closes when chosen`);eq(RA.pendingNpcRescue(game),null);
}
// It closes by itself only when the person is gone: revived by someone else, or dead.
for(const end of ['revived','dead']){
 const {game}=setup();const m=game.merchants.find(x=>x.id==='merchant_base_camp');m.x=game.player.x+150;m.y=game.player.y;CR.markSoldierDown(game,m);run(game,.2);eq(panel().length,1);
 if(end==='revived'){m.isDown=false;m.hp=m.maxHp;}else{m.dead=true;}
 run(game,.2);eq(panel().length,0,`closes when ${end}`);}
dom.window.close();console.log(`PASS rescue-prompt-stays-v7210 (${checks} checks)`);
