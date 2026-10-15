// Current world contract: 48 soldiers, five base classes (v2.1), four regional towns plus the national castle town (v2.3).
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
  ['createRadialGradient','createLinearGradient'].includes(key) ? () => ({addColorStop:noop}) : noop,
  set: () => true});
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({width:0,height:0,getContext:()=>context})
};
const {storage} = await import('../../common/js/storage.js');
const {saveSlots} = await import('../js/save-slots.js');
const {WorldTerrain,WORLD_SIZE,WORLD_VERSION,reliefAt,SETTLEMENTS,HOME_SANCTUARY_RADIUS,depthFade,fieldBlocks,fieldTerrainAt,settleUnit,eastWestRoadY,northSouthRoadX,riverCenterY} = await import('../js/world.js');
const {DUNGEON_DEFS,dungeonBlocks,dungeonSolids} = await import('../js/dungeon.js');
const {IronSquadGame,getFieldZone,DEPLOYMENT_CAPACITY} = await import('../js/index.js');

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
assert.equal(game.squad.length,DEPLOYMENT_CAPACITY);assert.ok(game.squad.every(s=>!s.isVeteran));
assert.deepEqual(new Set(game.squad.map(s=>s.soldierClass)),new Set(['HEAVY','LIGHT','ARCHER','MEDIC','MAGE']),'new games include the five current base classes');
assert.ok(game.outposts.every(op=>!op.cleared));
game.player.x=8500;game.player.y=2300;game.gold=0;game.phase=7;game.phaseTimer=31;
game.phaseCasualties=2;game.phaseInitialSquadCount=22;
game.saveGame({immediate:true});
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
assert.equal(game.dungeons.filter(d=>d.kind==='town').length,11,'four regional towns plus castle town plus six ally settlements');
assert.equal(game.dungeons.find(d=>d.id==='royal_castle_town').kind,'town');
assert.equal(game.dungeons.filter(d=>d.kind==='ruin').length,4);
assert.equal(game.dungeons.find(d=>d.kind==='town').boss,null);
assert.ok(game.dungeons.every(d=>d.entrance.x>0&&d.entrance.y>0&&d.entrance.x<WORLD_SIZE&&d.entrance.y<WORLD_SIZE));
assert.equal(reliefAt(center,center+5000),null,'the old cliff lip is gone');
assert.equal(reliefAt(center,center+5024),null,'the old cliff face is gone');
assert.equal(HOME_SANCTUARY_RADIUS,3000);
assert.equal(depthFade(center,center),0);
assert.equal(depthFade(center+2999,center),0);
assert.equal(depthFade(center+3900,center),1);
const town=SETTLEMENTS.find(s=>s.id==='place_crossroads');
assert.ok(reliefAt(center+town.ox,center+town.oy));

const world=new WorldTerrain();
const original=JSON.stringify(world.get(2,3).objects);
for(let y=0;y<10;y++)for(let x=0;x<10;x++) world.get(x,y);
assert.ok(world.tiles.size<=48,'terrain memory remains bounded while traversing the map');
assert.equal(JSON.stringify(world.get(2,3).objects),original,'evicted terrain regenerates identically');
const townTile=world.get(Math.floor((center+town.ox)/512),Math.floor((center+town.oy)/512));
assert.ok(townTile.objects.some(o=>o.type==='house'||o.type==='well'));

for (let a = 0; a < 16; a++) {
  const ang = a / 16 * Math.PI * 2;
  assert.equal(fieldBlocks(center + Math.cos(ang) * 2990, center + Math.sin(ang) * 2990), false, 'sanctuary stays open');
}
for (let t = -40000; t <= 40000; t += 200) {
  assert.equal(fieldBlocks(center + t, eastWestRoadY(center + t)), false, 'east-west road stays open');
  assert.equal(fieldBlocks(northSouthRoadX(center + t), center + t), false, 'north-south road stays open');
}
// No field cliffs: the former straight lines and arcs are ordinary open ground.
const formerCliffs = [];
for (let x = center - 16000; x <= center + 16000; x += 40) {
  formerCliffs.push([x, center + 5000 + Math.sin((x - center) / 980) * 110 + 23]);
  formerCliffs.push([x, center - 8000 + Math.sin((x - center) / 1100) * 90 + 23]);
  formerCliffs.push([x, center + 24000 + Math.sin((x - center) / 1400) * 160 - 30]);
}
for (let y = center - 14000; y <= center + 14000; y += 40) formerCliffs.push([center - 6400 + Math.sin((y - center) / 860) * 80 + 23, y]);
for (const r of [16800, 26000, 40000, 52000, 64000]) for (let a = -Math.PI; a < Math.PI; a += 0.0005) formerCliffs.push([center + Math.cos(a) * (r - 30), center + Math.sin(a) * (r - 30)]);
let walkable = 0;
for (const [x, y] of formerCliffs) {
  if(fieldBlocks(x,y))assert.equal(fieldTerrainAt(x,y),'rock','only a newly visible isolated rock can block a former cliff point');
  else walkable++;
}
assert.ok(walkable > formerCliffs.length*.85,'former cliff bands stay overwhelmingly open, with natural rock gaps');
const walker = {x: center + 2500, y: center + 5024};
assert.equal(settleUnit(walker, fieldBlocks), false, 'a unit standing on a former cliff is never pushed');
assert.equal(walker.y, center + 5024);
// Ravines and the river stay walkable; only unbuilt public works hold the field back.
assert.equal(fieldBlocks(center + 11000 + 100, center - 5500 - 40), false, 'ravine is walkable');
assert.equal(fieldBlocks(center + 3000, riverCenterY(center + 3000)), false, 'river is walkable');
assert.equal(fieldBlocks(center + 2400, center + 1700, [{kind:'bridge', x:center + 2400, y:center + 1700, w:370, h:110, angle:0, done:false}]), true, 'an unbuilt bridge pit still blocks');
assert.equal(fieldBlocks(center + 2400, center + 1700, [{kind:'bridge', x:center + 2400, y:center + 1700, w:370, h:110, angle:0, done:true}]), false, 'a built bridge is open');
for (const d of DUNGEON_DEFS) {
  assert.equal(fieldBlocks(d.entrance.x, d.entrance.y), false, d.id);
  for (let a = 0; a < 8; a++) {
    const ang = a / 8 * Math.PI * 2;
    assert.equal(fieldBlocks(d.entrance.x + Math.cos(ang) * 90, d.entrance.y + Math.sin(ang) * 90), false, `${d.id} approach`);
  }
}
for (const s of SETTLEMENTS) {
  assert.equal(fieldBlocks(center + s.entranceOx, center + s.entranceOy), false, s.id);
}
for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 4; i++) {
  const angle = (i * 90 + 45 + ring * 22) * Math.PI / 180;
  const radius = [1800, 4500, 7800][ring];
  assert.equal(fieldBlocks(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius), false, `outpost ${ring}-${i}`);
}
for (const dungeon of DUNGEON_DEFS) {
  if (!['dungeon', 'ruin'].includes(dungeon.kind)) {
    assert.equal(dungeonSolids(dungeon).length, 0, dungeon.id);
    assert.equal(dungeonBlocks(dungeon, 180, dungeon.height / 2), false);
    continue;
  }
  const h = dungeon.height, w = dungeon.width;
  assert.equal(dungeonBlocks(dungeon, 180, h / 2), false, `${dungeon.id} exit`);
  assert.equal(dungeonBlocks(dungeon, 240, h / 2), false, `${dungeon.id} entry`);
  assert.equal(dungeonBlocks(dungeon, w - 240, h / 2), false, `${dungeon.id} vault`);
  assert.equal(dungeonBlocks(dungeon, w - 350, h / 2), false, `${dungeon.id} boss`);
  assert.equal(dungeonBlocks(dungeon, 360, 40), true, `${dungeon.id} bulkhead`);
  assert.equal(dungeonBlocks(dungeon, 360, h / 2), false, `${dungeon.id} corridor`);
  const step = 24, cols = Math.ceil(w / step);
  const cell = (x, y) => Math.floor(y / step) * cols + Math.floor(x / step);
  const seen = new Uint8Array(cols * Math.ceil(h / step));
  const queue = [cell(180, h / 2)];
  seen[queue[0]] = 1;
  let reached = false;
  while (queue.length) {
    const cur = queue.pop();
    const cx = (cur % cols) * step + step / 2, cy = Math.floor(cur / cols) * step + step / 2;
    if (Math.hypot(cx - (w - 240), cy - h / 2) < step) { reached = true; break; }
    for (const [dx, dy] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dungeonBlocks(dungeon, nx, ny)) continue;
      const ni = cell(nx, ny);
      if (seen[ni]) continue;
      seen[ni] = 1;
      queue.push(ni);
    }
  }
  assert.equal(reached, true, `${dungeon.id} room path reaches the vault`);
}
console.log('PASS: old-save cleanup, save isolation, fresh reset, position restore, 12 outposts, bounded deterministic terrain, expanded world, cliff gates and dungeon rooms');
