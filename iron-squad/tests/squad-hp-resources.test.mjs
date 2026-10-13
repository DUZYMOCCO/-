import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {squadHpRows,updateSquadHpHud} from '../js/squad-hp-hud.js';

// v6.5.2: the left-edge squad HP list adds MP (mages/medics) or ammo (archers) as a second gauge.
const dom=new JSDOM('<div id="game"><div id="canvas-container"></div></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document});
const mk=(id,soldierClass,extra={})=>({id,name:`${soldierClass}${id}`,soldierClass,hp:80,maxHp:100,isPersonalGuard:true,...extra});
const mage=mk(1,'MAGE',{mana:40}),archer=mk(2,'ARCHER',{ammo:12}),sword=mk(3,'HEAVY'),medic=mk(4,'MEDIC',{mana:90}),downedMage=mk(5,'MAGE',{isDown:true,downTimer:10,mana:50});
const game={inBattle:true,container:document.getElementById('game'),player:{},squad:[mage,archer,sword,medic,downedMage]};
const rows=squadHpRows(game);
const byId=id=>rows.find(r=>r.id===id);
assert.equal(byId(1).res.kind,'mp');assert.equal(byId(1).res.text,'MP 40/100');
assert.equal(byId(2).res.kind,'ammo');assert.equal(byId(2).res.text,'弾 12/30');assert.equal(byId(2).res.ratio,.4);
assert.equal(byId(3).res,null,'sword soldier has no extra gauge');
assert.equal(byId(4).res.kind,'mp');
assert.equal(byId(5).res,null,'downed rows keep the old layout');

updateSquadHpHud(game,0,true);
const box=document.getElementById('squad-hp-hud');
assert.equal(box.querySelectorAll('.squad-hp-row').length,5);
assert.equal(box.querySelectorAll('.squad-hp-res.mp').length,2);assert.equal(box.querySelectorAll('.squad-hp-res.ammo').length,1);
assert.equal(box.querySelectorAll('.squad-hp-row')[2].querySelector('.squad-hp-res'),null);
// Values update in place: same row/gauge nodes, new text and width.
const rowEls=[...box.querySelectorAll('.squad-hp-row')],resEl=rowEls[1].querySelector('.squad-hp-res');
archer.ammo=3;mage.mana=100;mage.hp=60;
updateSquadHpHud(game,1,true);
assert.equal(box.querySelectorAll('.squad-hp-row')[1],rowEls[1],'row node is reused');
assert.equal(rowEls[1].querySelector('.squad-hp-res'),resEl);
assert.equal(resEl.querySelector('span').textContent,'弾 3/30');assert.equal(resEl.querySelector('i').style.width,'10%');
assert.equal(rowEls[0].querySelector('.squad-hp-res span').textContent,'MP 100/100');
assert.equal(rowEls[0].querySelector('.squad-hp-num').textContent,'60/100');
// Unchanged values do not touch the DOM.
const before=box.innerHTML;updateSquadHpHud(game,1,true);assert.equal(box.innerHTML,before);
// Compact mode (>6 rows) still renders gauges (text hidden by CSS).
for(let i=10;i<14;i++)game.squad.push(mk(i,'ARCHER'));
updateSquadHpHud(game,1,true);assert.ok(box.classList.contains('compact'));assert.equal(box.querySelectorAll('.squad-hp-res.ammo').length,5);
console.log('PASS: squad HP list shows MP/ammo gauges and updates in place');
dom.window.close();
