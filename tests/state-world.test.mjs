import assert from 'node:assert/strict';

// Isolated browser storage: the tests never touch the user's actual saves.
const memory = new Map();
globalThis.localStorage = {
  getItem: key => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: key => memory.delete(key)
};
globalThis.window = {};
const noop = () => {};
const context = new Proxy({}, {get: (_,key) =>
  key === 'createRadialGradient' ? () => ({addColorStop:noop}) : noop,
  set: () => true});
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({width:0,height:0,getContext:()=>context})
};
const {storage} = await import('../js/storage.js');
const {saveSlots} = await import('../js/games/iron-squad/save-slots.js');
const {WorldTerrain,WORLD_SIZE,WORLD_VERSION,reliefAt,SETTLEMENTS} = await import('../js/games/iron-squad/world.js');
const {IronSquadGame,getFieldZone} = await import('../js/games/iron-squad/index.js');

// Previous saves are retired with explicit user authorization; current saves remain.
storage.set('ironsquad_save_data_v3',{player:{level:3}});
storage.set('ironsquad_veterans_backup',[{name:'old'}]);
storage.set('ironsquad_save_slots_v1',[{id:'old',data:{gold:0}}]);
assert.deepEqual(saveSlots.list(),[]);
assert.equal(localStorage.getItem('game_studio_ironsquad_save_data_v3'),null);
assert.equal(localStorage.getItem('game_studio_ironsquad_veterans_backup'),null);
const first=saveSlots.create('第一遠征');
saveSlots.update(first.id,{data:{gold:0,phase:4,player:{level:3}}});
const fresh=saveSlots.create('第二遠征');
saveSlots.update(fresh.id,{data:{gold:99,player:{level:1}}});
assert.equal(saveSlots.get(first.id).data.gold,0);
const detached=saveSlots.get(first.id);detached.data.gold=999;
assert.equal(saveSlots.get(first.id).data.gold,0);
assert.equal(saveSlots.list().length,2,'cleanup does not repeat against current saves');
const beforeFailure=localStorage.getItem('game_studio_ironsquad_save_slots_v1');
const write=localStorage.setItem, warn=console.warn;
localStorage.setItem=()=>{throw new Error('quota test');};console.warn=noop;
try {
  assert.equal(saveSlots.update(fresh.id,{data:{gold:1234}}),false);
  assert.throws(()=>saveSlots.create('保存できない遠征'));
} finally {localStorage.setItem=write;console.warn=warn;}
assert.equal(localStorage.getItem('game_studio_ironsquad_save_slots_v1'),beforeFailure,'failed writes preserve prior saves');

const game=Object.create(IronSquadGame);
for(const method of ['recalcSoldierStats','recalcPlayerStats','updateStatsUI','updateQuestUI','startGameLoop','showToast']) game[method]=noop;
game.activeSlotId=fresh.id;game.phase=99;game.phaseTimer=2;game.totalBattleTime=800;
saveSlots.update(fresh.id,{veterans:[{id:'veteran',level:50}],state:'fallen'});
game.startFreshGame(false);
assert.equal(game.phase,1);assert.equal(game.phaseTimer,120);assert.equal(game.totalBattleTime,0);
assert.equal(game.squad.length,30);assert.ok(game.squad.every(s=>!s.isVeteran));
assert.equal(new Set(game.squad.map(s=>s.soldierClass)).size,4,'new games recruit all four base classes');
assert.ok(game.outposts.every(op=>!op.cleared));
game.player.x=8500;game.player.y=2300;game.gold=0;game.phase=7;game.phaseTimer=31;
game.phaseCasualties=2;game.phaseInitialSquadCount=22;
game.saveGame();
game.resumeSavedGame(saveSlots.get(fresh.id).data);
assert.equal(game.player.x,8500);assert.equal(game.player.y,2300);assert.equal(game.gold,0);
assert.equal(game.phase,7);assert.equal(game.phaseTimer,31);
assert.equal(game.phaseCasualties,2);assert.equal(game.phaseInitialSquadCount,22);
assert.equal(saveSlots.get(first.id).data.phase,4);
assert.ok(game.outposts.every(op=>op.x>0&&op.y>0&&op.x<WORLD_SIZE&&op.y<WORLD_SIZE));
const center=WORLD_SIZE/2;
assert.equal(WORLD_VERSION,4);
assert.equal(WORLD_SIZE,158720);
assert.equal(getFieldZone(center,center).id,'ZONE_PEACE');
assert.equal(getFieldZone(center+6000,center).id,'ZONE_PEACE');
assert.equal(getFieldZone(center+10000,center).id,'ZONE_WILD');
assert.equal(getFieldZone(center+25000,center).id,'ZONE_CHAOS');
assert.equal(getFieldZone(center+50000,center).id,'ZONE_ABYSS');
assert.equal(game.dungeons.filter(d=>d.kind==='town').length,4);
assert.equal(game.dungeons.filter(d=>d.kind==='ruin').length,4);
assert.equal(game.dungeons.find(d=>d.kind==='town').boss,null);
assert.ok(game.dungeons.every(d=>d.entrance.x>0&&d.entrance.y>0&&d.entrance.x<WORLD_SIZE&&d.entrance.y<WORLD_SIZE));
assert.equal(reliefAt(center,center+5000),'#6e7264');
assert.equal(reliefAt(center,center+5024),'#1a1e1c');
const town=SETTLEMENTS.find(s=>s.id==='place_crossroads');
assert.ok(reliefAt(center+town.ox,center+town.oy));

const world=new WorldTerrain();
const original=JSON.stringify(world.get(2,3).objects);
for(let y=0;y<10;y++)for(let x=0;x<10;x++) world.get(x,y);
assert.ok(world.tiles.size<=48,'terrain memory remains bounded while traversing the map');
assert.equal(JSON.stringify(world.get(2,3).objects),original,'evicted terrain regenerates identically');
const townTile=world.get(Math.floor((center+town.ox)/512),Math.floor((center+town.oy)/512));
assert.ok(townTile.objects.some(o=>o.type==='house'||o.type==='well'));
console.log('PASS: old-save cleanup, save isolation, fresh reset, position restore, 12 outposts, bounded deterministic terrain, expanded world');
