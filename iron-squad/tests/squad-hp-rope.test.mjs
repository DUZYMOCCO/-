import assert from 'node:assert/strict';
import {attachForCommander,carriedSoldiers,carryingCapacity} from '../js/casualty-rules.js';
import {squadHpRows} from '../js/squad-hp-hud.js';

// v6.3.10: in a field of bodies the commander's rope prefers own-squad members.
const down=(id,x,own=false)=>({id,name:`兵士${id}・テスト`,x,y:0,isDown:true,hp:0,maxHp:100,downTimer:40,isPersonalGuard:own});
const player={x:0,y:0,hp:100,maxHp:100,strength:20};
const cap=carryingCapacity(player);assert.ok(cap>=1);
const strangers=Array.from({length:cap+1},(_,i)=>down(i+1,10+i));
const game={player,squad:[...strangers],reserves:[],civilians:[],showToast(){}};
attachForCommander(game);
assert.equal(carriedSoldiers(game,player).length,cap,'with nobody from the squad, anyone nearby is tied');
// An own-squad member lies within reach while the rope is full: a stranger is untied and the member tied.
const friend=down(99,20,true);game.squad.push(friend);attachForCommander(game);
assert.equal(friend.carrierId,'player','own-squad member is re-tied automatically');
assert.equal(carriedSoldiers(game,player).length,cap);
const dropped=strangers.find(s=>!s.carrierId&&s.releasedBy==='player');assert.ok(dropped,'a stranger was set down');
attachForCommander(game);assert.equal(dropped.carrierId,undefined,'the stranger is not grabbed back immediately');
// Own members are tied before strangers even when listed later.
const p2={...player},g2={player:p2,squad:[...Array.from({length:cap},(_,i)=>down(200+i,5)),down(300,30,true)],reserves:[],civilians:[],showToast(){}};
attachForCommander(g2);assert.equal(g2.squad.at(-1).carrierId,'player');
// A rope made only of own members is never swapped.
const g3={player:{...player},squad:[...Array.from({length:cap},(_,i)=>down(400+i,5,true)),down(500,6,true)],reserves:[],civilians:[],showToast(){}};
attachForCommander(g3);assert.equal(carriedSoldiers(g3,g3.player).length,cap);assert.ok(carriedSoldiers(g3,g3.player).every(s=>s.isPersonalGuard));
// Members the commander untied on purpose are not pulled back by a swap.
const g4={player:{...player},squad:[...Array.from({length:cap},(_,i)=>down(600+i,5)),{...down(700,10,true),releasedBy:'player'}],reserves:[],civilians:[],showToast(){}};
attachForCommander(g4);assert.equal(g4.squad.at(-1).carrierId,undefined);
console.log('PASS: commander rope ties own-squad members first and swaps out strangers');

// HP list: own squad only, number + gauge ratio, down state shows the rescue timer.
const rows=squadHpRows({squad:[{id:1,name:'ルチア・アルデン',hp:50,maxHp:200,isPersonalGuard:true},{id:2,name:'本隊兵',hp:10,maxHp:100},{id:3,name:'エド',isDown:true,downTimer:12.2,maxHp:90,overflowGuard:true},{id:4,name:'死者',dead:true,isPersonalGuard:true}]});
assert.deepEqual(rows.map(r=>r.id),[1,3],'only own-squad members are listed');
assert.equal(rows[0].name,'ルチア');assert.equal(rows[0].text,'50');assert.equal(rows[0].ratio,.25);assert.equal(rows[0].state,'low');
assert.equal(rows[1].state,'down');assert.equal(rows[1].text,'救助 13秒');assert.equal(rows[1].ratio,0);
console.log('PASS: own-squad HP list');
