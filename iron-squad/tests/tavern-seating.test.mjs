import assert from 'node:assert/strict';
import {drawFieldTavern,FIELD_TAVERN} from '../js/tavern.js';
import {TAVERN_TABLES,TAVERN_SEAT_COUNT,tavernPoint,campPoseFor,GARDEN_SEAT_COUNT,gardenPoint} from '../js/camp-leisure.js';

const seats=Array.from({length:TAVERN_SEAT_COUNT},(_,i)=>tavernPoint(i,'drink'));
assert.equal(TAVERN_TABLES.length,2);assert.equal(TAVERN_SEAT_COUNT,12);
for(const [i,s]of seats.entries()){
  assert.ok(Math.abs(s.x-FIELD_TAVERN.x)>60,'the doorway stays clear');
  assert.ok(s.y>FIELD_TAVERN.y+30&&s.y<FIELD_TAVERN.y+110,'visitors sit on the terrace');
  const table=TAVERN_TABLES.find(t=>Math.hypot(t.x-s.x,t.y-s.y)<40);assert.ok(table,'each stool surrounds a table');
  assert.ok(Math.abs(s.facing-Math.atan2(table.y-s.y,table.x-s.x))<1e-9,'guests face their table');
  for(let j=i+1;j<seats.length;j++)assert.ok(Math.hypot(s.x-seats[j].x,s.y-seats[j].y)>25,'guests do not share stools');
  for(let j=0;j<GARDEN_SEAT_COUNT;j++){const army=gardenPoint(j,'sit');assert.ok(Math.hypot(s.x-army.x,s.y-army.y)>50,'the army keeps separate garden seats');}
}
assert.ok(new Set(seats.map(s=>Math.round(s.y))).size>8,'guests do not stand in straight rows');

const people=Array.from({length:4},(_,i)=>({unit:{id:`guest-${i}`,name:`Guest ${i}`,x:1,y:2,civilianOutfit:true},joined:false}));
people.push({unit:{id:'already-hired'},joined:true});
const waiting=Array.from({length:2},(_,i)=>({id:`friend-${i}`,name:`Friend ${i}`,x:3,y:4,equipped:{weapon:{tier:4}},level:9}));
const game={worldTime:300,taverns:{roster:{people},waiting}},before=structuredClone(game),drawn=[];
const noop=()=>{},ctx=new Proxy({},{get:(o,k)=>k in o?o[k]:noop});
drawFieldTavern(ctx,game,(unit,x,y)=>drawn.push({unit,x,y}));
assert.equal(drawn.length,6);assert.ok(!drawn.some(p=>p.unit.id==='already-hired'));
for(const [i,unit]of [...people.slice(0,4).map(p=>p.unit),...waiting].entries()){
  const p=drawn.find(p=>p.unit.id===unit.id),seat=tavernPoint(i,campPoseFor(unit));
  assert.deepEqual([p.x,p.y,p.unit.campPose,p.unit.facingAngle],[seat.x,seat.y,seat.pose,seat.facing]);
  assert.deepEqual(p.unit.equipped,unit.equipped);
}
assert.ok(drawn.some(p=>p.unit.campPose==='drink'));assert.ok(drawn.some(p=>p.unit.campPose==='eat'));
assert.ok(drawn.every((p,i)=>!i||p.y>=drawn[i-1].y),'nearer guests draw after farther guests');
assert.deepEqual(game,before,'visual sitting poses never overwrite saved equipment or positions');
game.currentDungeon={id:'town'};drawn.length=0;drawFieldTavern(ctx,game,(...p)=>drawn.push(p));assert.equal(drawn.length,0,'field guests stay outside dungeon scenes');
console.log('PASS: tavern candidates and waiting companions sit, eat and drink around terrace tables, clear of the doorway and army');
