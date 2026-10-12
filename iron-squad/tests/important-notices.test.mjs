import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {recordBattleLog,resetBattleLog,showsOnFieldLog} from '../js/battle-log.js';
import {grantPermanentRescueReward} from '../js/rescue-rewards.js';

const dom=new JSDOM('<section class="battle-log-window"><div id="battle-log-stream"></div></section>');globalThis.document=dom.window.document;
const stream=document.getElementById('battle-log-stream'),host=stream.parentElement;
const game={player:{x:0,y:0},showToast(text,options){recordBattleLog(this,text,options);}};
const savedSet=globalThis.setTimeout,savedClear=globalThis.clearTimeout,timers=new Map();let clock=0,sequence=0;
globalThis.setTimeout=(fn,ms)=>{const id=++sequence;timers.set(id,{fn,at:clock+ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);
const advance=ms=>{const until=clock+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;clock=due[1].at;timers.delete(due[0]);due[1].fn();}clock=until;};
const visible=()=>host.classList.contains('has-field-note');
try{
  recordBattleLog(game,'短剣をドロップ');advance(2999);assert.ok(visible());advance(1);assert.equal(visible(),false,'normal field notices remain three seconds');
  resetBattleLog(game);
  const reward=grantPermanentRescueReward(game,{id:'permanent-one',name:'旅人'},()=>.1);assert.equal(reward.key,'hpPct');assert.equal(game.rescueBonuses.hpPct,1);
  assert.match(stream.textContent,/最大HP \+1%（永続）/);assert.equal(game.battleLogHistory[0].category,'growth');
  advance(4000);recordBattleLog(game,'盾をドロップ');assert.match(stream.textContent,/永続/,'ordinary loot cannot replace the permanent reward');
  assert.ok(game.battleLogHistory.some(e=>e.text==='盾をドロップ'),'suppressed field lines still go to history');
  advance(3999);assert.ok(visible());advance(1);assert.equal(visible(),false,'important reward gets the full eight seconds');

  resetBattleLog(game);recordBattleLog(game,'第一の永続報酬（永続）');recordBattleLog(game,'第二の永続報酬（永続）');
  assert.match(stream.textContent,/第一/);advance(8000);assert.match(stream.textContent,/第二/);assert.ok(visible());
  advance(7999);assert.ok(visible());advance(1);assert.equal(visible(),false);assert.equal(game.battleLogHistory.length,2,'playing queued rewards does not duplicate history');

  resetBattleLog(game);recordBattleLog(game,'攻撃力 +1%（永続）');advance(1000);
  recordBattleLog(game,'仲間の死亡まで残り14秒');assert.match(stream.textContent,/死亡まで残り/,'urgent warnings immediately interrupt important rewards');
  advance(3000);assert.match(stream.textContent,/攻撃力/,'the interrupted reward is restored after the warning');advance(8000);assert.equal(visible(),false);

  resetBattleLog(game);recordBattleLog(game,'隊長のHPが半分以下 · 残り30/100');
  recordBattleLog(game,'死線覚醒の報酬',{important:true});assert.match(stream.textContent,/HPが半分以下/);
  advance(3000);assert.match(stream.textContent,/死線覚醒/);advance(8000);assert.equal(visible(),false);

  resetBattleLog(game);recordBattleLog(game,'保留の永続報酬（永続）');recordBattleLog(game,'次の永続報酬（永続）');
  const stale=timers.get(game._battleLogTimer).fn;resetBattleLog(game);stale();advance(100000);assert.equal(stream.children.length,0);assert.equal(visible(),false,'reset never resurrects an old queued reward');
  assert.equal(showsOnFieldLog('秘宝獲得'),true);assert.equal(showsOnFieldLog('永続のお礼（永続）',{field:false}),false);
  assert.equal(showsOnFieldLog('普通のレベルアップ'),false,'ordinary growth stays out of the field');
  recordBattleLog(game,'明示的な通常通知',{field:true,important:false});advance(3000);assert.equal(visible(),false);
}finally{resetBattleLog(game);globalThis.setTimeout=savedSet;globalThis.clearTimeout=savedClear;dom.window.close();}
console.log('PASS: normal three-second and important eight-second expiry, real permanent reward, ordinary loot protection, queued rewards, urgent interruption/restoration and reset');
