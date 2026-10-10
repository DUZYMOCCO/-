import assert from 'node:assert/strict';
import {startHeroJournal,updateHeroJournal,finishHeroJournal,archiveHeroJournal,JOURNAL_LIMITS} from '../js/games/iron-squad/hero-journal.js';
import {WORLD_SIZE} from '../js/games/iron-squad/world.js';
const C=WORLD_SIZE/2,game={phase:10,heroJourney:{history:[]}};
const make=(id='p')=>({id,name:'旅の勇者',phase:10,space:'field',x:C,y:C,members:Array.from({length:6},(_,i)=>({id:`u${i}`,name:`仲間${i}`,talent:'AVERAGE',soldierClass:'LIGHT',isChosenHero:i===0,level:1,maxHp:100,hp:100,atk:10,def:5}))});
const p=make();startHeroJournal(game,p);
for(let i=0;i<700;i++){p.x+=180;p.y+=150;p.members[0].level+=1;updateHeroJournal(game,p,2);}
assert.ok(p.journal.events.length<=JOURNAL_LIMITS.events);assert.ok(p.journal.trail.length<=JOURNAL_LIMITS.trail);
assert.equal(p.journal.events[0].type,'departure');assert.deepEqual(p.journal.trail[0],{x:C,y:C,space:'field',time:0});
p.members[0].isDown=true;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).type,'down');
p.members[0].isDown=false;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).type,'rescue');
p.members[0].timesDown=1;p.members[0].timesRescued=1;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).type,'rescue','short down/revival between checks is retained');
p.members[0].dead=true;updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).type,'death');
p.space='dungeon_demon_castle';updateHeroJournal(game,p,2);assert.equal(p.journal.events.at(-1).type,'castle');
finishHeroJournal(game,p,'全滅');assert.equal(p.journal.events.at(-1).type,'result');assert.equal(p.journal.members[0].dead,true);
const endTime=p.journal.elapsed;updateHeroJournal(game,p,100);assert.equal(p.journal.elapsed,endTime,'closed diary is frozen');
archiveHeroJournal(game,p,'全滅');archiveHeroJournal(game,p,'全滅');assert.equal(game.heroJourney.history.length,1,'no duplicated final record');
p.journal.members[0].name='changed';assert.notEqual(game.heroJourney.history[0].journal.members[0].name,'changed','archived identity is independent');
for(let i=0;i<12;i++){const next=make(`p${i}`);startHeroJournal(game,next);archiveHeroJournal(game,next,'全滅');}
assert.equal(game.heroJourney.history.length,JOURNAL_LIMITS.history);
const bytes=Buffer.byteLength(JSON.stringify(game.heroJourney));assert.ok(bytes<100000,'bounded persistent footprint');
console.log(`hero-journal: identity, route, growth, down/rescue, result, history limits and serialization passed (${bytes} bytes)`);
