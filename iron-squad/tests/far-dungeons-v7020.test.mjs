import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {WORLD_SIZE,fieldTerrainAt,eastWestRoadY,northSouthRoadX,riverCenterY} from '../js/world.js';
import {DUNGEON_DEFS,FAR_DUNGEON_DEFS,farRuinReward,farVaultReward,dungeonBlocks} from '../js/dungeon.js';
import {campaignScaling} from '../js/campaign-scaling.js?v=241';
import {dungeonSteeringTarget} from '../js/dungeon-layout.js';
const memory=new Map(),noop=()=>{};
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};globalThis.window={};globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{width:375,height:640,zoom:1,joystick:{active:false,dirX:0,dirY:0},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','updateStatsUI','updateQuestUI','renderStrategyUI','showToast','spawnSparks','spawnDamageText','refreshSupplyUI','refreshMagicUI','refreshInvasionUI'])game[name]=noop;
game.activeSlotId=saveSlots.create('FAR DUNGEON TEST ONLY').id;game.startFreshGame(false);
const C=WORLD_SIZE/2,hash=o=>createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0,16);
const IDS=['dungeon_sunken_tomb','dungeon_sand_king_tomb','dungeon_troll_pit','dungeon_battlefield_mausoleum','dungeon_titan_shrine','dungeon_frozen_cave','dungeon_bandit_fortress','dungeon_poison_marsh_temple','dungeon_salt_dragon_bones'];
const far=IDS.map(id=>{const d=game.dungeons.find(d=>d.id===id);assert.ok(d,id+' exists in a fresh game');return d;});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// 1) Definitions: nine new dungeons with real bosses and valid themes.
assert.equal(FAR_DUNGEON_DEFS.length,9);assert.equal(DUNGEON_DEFS.length,28,'19 old places + 9 far dungeons');
assert.equal(new Set(DUNGEON_DEFS.map(d=>d.id)).size,DUNGEON_DEFS.length,'ids are unique');
const THEMES=['mines','catacombs','dragon','demon','ruin','swamp','sand','ice','giant'];
for(const d of far){
  assert.equal(d.kind,'dungeon');assert.ok(d.name&&d.subtitle&&d.desc&&d.icon,d.id+' has Japanese texts');assert.ok(THEMES.includes(d.theme),d.id+' theme has an interior scene');
  assert.equal(d.entrance.radius,48);assert.ok(Math.abs(d.distance-Math.hypot(d.entrance.x-C,d.entrance.y-C))<1e-6,d.id+' distance follows the entrance');
  assert.ok(d.mobCount>=16&&d.eliteCount>=3&&d.mobTypes.length>=2,d.id+' has a real garrison');
  assert.ok(['colossal_dragon','behemoth_king','colossal_titan','goblin_king','lich_elder'].includes(d.boss.type),d.id+' boss uses an existing body');
  assert.ok(d.reqDef>=400&&d.reqDef<800&&d.reqLv>=30&&d.reqLv<40,d.id+' requirement sits before the demon castle (800/40)');
  assert.equal(d.reward.lootKind,'dungeon_vault');
}
// 2) Placement: open ground, open surroundings, reachable on foot, clear of every other place.
const cell=160,N=Math.floor(WORLD_SIZE/cell),known=new Uint8Array(N*N),blocked=new Uint8Array(N*N),seen=new Uint8Array(N*N);
const blk=(i,j)=>{const k=j*N+i;if(!known[k]){known[k]=1;blocked[k]=fieldTerrainAt(i*cell+cell/2,j*cell+cell/2)==='rock'?1:0;}return blocked[k];};
const start=Math.floor(C/cell)+Math.floor(C/cell)*N,queue=[start];seen[start]=1;
for(let h=0;h<queue.length;h++){const k=queue[h],i=k%N,j=(k-i)/N;for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){if(!di&&!dj)continue;const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N)continue;const kk=b*N+a;if(seen[kk]||blk(a,b))continue;if(di&&dj&&(blk(i+di,j)||blk(i,j+dj)))continue;seen[kk]=1;queue.push(kk);}}
const reach=(x,y)=>{const i=Math.floor(x/cell),j=Math.floor(y/cell);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(i+a>=0&&j+b>=0&&i+a<N&&j+b<N&&seen[(j+b)*N+i+a])return true;return false;};
const olds=game.dungeons.filter(d=>d.entrance&&!IDS.includes(d.id)),caves=olds.filter(d=>d.kind==='dungeon');
for(const d of far){
  const {x,y}=d.entrance;assert.equal(fieldTerrainAt(x,y),'open',d.id+' entrance is open ground');
  for(const r of [60,90,120,240,480])for(let k=0;k<16;k++)assert.equal(fieldTerrainAt(x+Math.cos(k*Math.PI/8)*r,y+Math.sin(k*Math.PI/8)*r),'open',`${d.id} approach is open at ${r}`);
  assert.ok(reach(x,y),d.id+' is reachable on foot');
  for(const c of caves)assert.ok(dist(c.entrance,d.entrance)>=3500,`${d.id} keeps 35m from ${c.id}`);
  for(const o of far.filter(o=>o!==d))assert.ok(dist(o.entrance,d.entrance)>=3500,`${d.id} keeps 35m from ${o.id}`);
  for(const s of game.wildernessSites)assert.ok(dist(s,d.entrance)>=2500,`${d.id} keeps 25m from ${s.id}`);
  for(const p of game.medicalPosts)assert.ok(dist(p,d.entrance)>=1800,`${d.id} keeps 18m from ${p.id}`);
  for(const o of game.outposts)assert.ok(dist(o,d.entrance)>=2500,`${d.id} keeps 25m from an outpost`);
  assert.ok(Math.min(Math.abs(x-northSouthRoadX(y)),Math.abs(y-eastWestRoadY(x)))>=450,d.id+' is off the highway');
  assert.ok(Math.abs(y-riverCenterY(x))>=700,d.id+' is off the river');
}
// Nothing else moved: all medical posts, wilderness sites, outposts and the pre-existing entrances keep their coordinates (hashes taken on v7.0.19).
assert.equal(game.wildernessSites.length,48);assert.equal(game.medicalPosts.length,22);
assert.equal(hash(game.medicalPosts.map(p=>[p.id,p.x,p.y])),'532da7a37a497ad1','22 medical posts keep their coordinates');
assert.equal(hash(game.wildernessSites.map(s=>[s.id,s.x,s.y])),'2ffc9dae18cea9b4','48 wilderness sites keep their coordinates');
assert.equal(hash(game.outposts.map(o=>[o.type,o.x,o.y])),'3bcc628f2b88cc26','outposts keep their coordinates');
assert.equal(hash(olds.filter(d=>d.id!=='wolf_hamlet').map(d=>[d.id,d.entrance])),'0d1c3172ae231055','old entrances other than the wolf hamlet are unchanged');
// 3) Bosses: real HP/ATK near the design table (distance-scaled x0.75, never below the authored value).
const BOSS={dungeon_sunken_tomb:[339e3,1.6e3],dungeon_sand_king_tomb:[600e3,2.6e3],dungeon_troll_pit:[8.62e6,21.8e3],dungeon_battlefield_mausoleum:[13.2e6,29.3e3],dungeon_titan_shrine:[26.6e6,54.2e3],dungeon_frozen_cave:[825e3,3.5e3],dungeon_bandit_fortress:[6.02e6,15.7e3],dungeon_poison_marsh_temple:[6.82e6,17.1e3],dungeon_salt_dragon_bones:[23.6e6,51.2e3]};
for(const d of far){const b=game.createDungeonBoss(d.boss,100,100,d),[hp,atk]=BOSS[d.id];assert.ok(Math.abs(b.maxHp/hp-1)<.03&&Math.abs(b.atk/atk-1)<.04,`${d.id} boss ${b.maxHp}/${b.atk} is near ${hp}/${atk}`);assert.equal(b.bossPlaceId,d.id);assert.equal(b.isDungeonBoss,true);}
// 4) Rewards follow the band: wild < 22,000 pays 1500/400 x scale, frontier pays 600/250 x scale; they grow with distance inside a band.
for(const d of far){const c=campaignScaling(d.distance,1),wild=d.distance<22000;assert.equal(d.reward.gold,Math.round((wild?1500:600)*c.gold/10)*10);assert.equal(d.reward.exp,Math.round((wild?400:250)*c.exp/10)*10);assert.deepEqual(farVaultReward(d.distance,d.reward.itemCount),d.reward);}
const byDistance=[...far].sort((a,b)=>a.distance-b.distance);
for(const band of [byDistance.filter(d=>d.distance<22000),byDistance.filter(d=>d.distance>=22000)])for(let i=1;i<band.length;i++){assert.ok(band[i].reward.gold>=band[i-1].reward.gold&&band[i].reward.exp>=band[i-1].reward.exp,'rewards do not fall with distance inside a band');}
const cata=game.dungeons.find(d=>d.id==='dungeon_catacombs');assert.ok(byDistance[0].reward.gold>cata.reward.gold&&byDistance[0].reward.exp>cata.reward.exp,'the nearest far dungeon pays more than the catacombs');
assert.ok(byDistance.at(-1).reward.gold<game.dungeons.find(d=>d.id==='dungeon_demon_castle').reward.gold,'every far dungeon pays less than the demon castle');
// 5) Far ruins pay about ten ordinary kills at their own distance; the near north fort keeps its authored reward.
const ruins=game.dungeons.filter(d=>d.kind==='ruin');
for(const r of ruins){const c=campaignScaling(r.distance,1);if(r.distance<8000){assert.deepEqual(r.reward,{gold:420,exp:110,itemCount:1,lootKind:'chest'},r.id+' near ruin is unchanged');continue;}
  assert.ok(r.reward.gold>=8*c.gold*9&&r.reward.gold<=8*c.gold*11,r.id+' gold is about ten minion kills');assert.ok(r.reward.exp>=6*c.exp*9&&r.reward.exp<=6*c.exp*11,r.id+' EXP is about ten minion kills');assert.equal(r.reward.lootKind,'chest');assert.equal(r.reward.itemCount,2);}
assert.deepEqual(['place_salt_village','place_west_keep','place_rim_watch'].map(id=>ruins.find(r=>r.id===id).reward.gold>980),[true,true,true]);
assert.deepEqual(farRuinReward({gold:1,exp:1,itemCount:2,lootKind:'chest'},100),{gold:1,exp:1,itemCount:2,lootKind:'chest'});
// 6) Wolf hamlet: its entrance stands on open ground in the west, the other five hamlets are untouched.
const wolf=game.dungeons.find(d=>d.id==='wolf_hamlet');assert.equal(fieldTerrainAt(wolf.entrance.x,wolf.entrance.y),'open','the wolf hamlet is no longer in the pond');
for(const r of [60,120,180,240,480])for(let k=0;k<16;k++)assert.equal(fieldTerrainAt(wolf.entrance.x+Math.cos(k*Math.PI/8)*r,wolf.entrance.y+Math.sin(k*Math.PI/8)*r),'open',`wolf hamlet approach is open at ${r}`);
assert.deepEqual([Math.round(wolf.entrance.x-C),Math.round(wolf.entrance.y-C)],[-4100,-540]);assert.ok(reach(wolf.entrance.x,wolf.entrance.y));
assert.deepEqual(['ninja_village','bear_hamlet','cat_hamlet','fox_hamlet','bird_hamlet'].map(id=>{const d=game.dungeons.find(d=>d.id===id);return [Math.round(d.entrance.x-C),Math.round(d.entrance.y-C)];}),[[40200,41800],[-9000,4600],[7000,-4200],[17000,12000],[-20000,-12500]],'the other five hamlets keep their entrances');
for(const id of ['ninja_village','wolf_hamlet','bear_hamlet','cat_hamlet','fox_hamlet','bird_hamlet']){const d=game.dungeons.find(d=>d.id===id);assert.equal(fieldTerrainAt(d.entrance.x,d.entrance.y),'open',id+' entrance is open');}
// 7) Saves: a new save carries every id; an old save (v7.0.19: no far dungeons, old wolf entrance, old ruin rewards) keeps progress and gains the new ids and the new values.
const fresh=structuredClone(game.saveGame({immediate:true}));
assert.ok(IDS.every(id=>fresh.dungeons.some(d=>d.id===id)),'a new save stores the nine ids');
const old=structuredClone(fresh);old.dungeons=old.dungeons.filter(d=>!IDS.includes(d.id));
const oldWolf={x:C-4100,y:C-900,radius:68},oldReward={gold:980,exp:240,itemCount:2,lootKind:'chest'};
Object.assign(old.dungeons.find(d=>d.id==='wolf_hamlet'),{entrance:oldWolf,distance:Math.hypot(4100,900)});
for(const id of ['place_salt_village','place_west_keep'])old.dungeons.find(d=>d.id===id).reward={...oldReward};
old.dungeons.find(d=>d.id==='place_rim_watch').reward={gold:1200,exp:280,itemCount:2,lootKind:'chest'};
Object.assign(old.dungeons.find(d=>d.id==='dungeon_goblin_mines'),{cleared:true,discovered:true,clearedWave:3});
Object.assign(old.dungeons.find(d=>d.id==='place_salt_village'),{discovered:true});
game.resumeSavedGame(old);
for(let pass=0;pass<2;pass++){
  for(const id of IDS){const d=game.dungeons.find(d=>d.id===id);assert.ok(d&&d.boss&&d.entrance&&!d.cleared,id+' is added to an old save');}
  assert.equal(game.dungeons.length,28);
  const w=game.dungeons.find(d=>d.id==='wolf_hamlet');assert.deepEqual([Math.round(w.entrance.x-C),Math.round(w.entrance.y-C)],[-4100,-540],'an old save moves the wolf entrance out of the pond');assert.equal(fieldTerrainAt(w.entrance.x,w.entrance.y),'open');assert.ok(Math.abs(w.distance-Math.hypot(4100,540))<1e-6);
  assert.equal(game.dungeons.find(d=>d.id==='place_salt_village').reward.gold,15180,'an old save gets the distance-linked ruin reward');assert.equal(game.dungeons.find(d=>d.id==='place_rim_watch').reward.gold,126760);
  const mines=game.dungeons.find(d=>d.id==='dungeon_goblin_mines');assert.deepEqual([mines.cleared,mines.discovered,mines.clearedWave],[true,true,3],'saved progress still wins');assert.equal(game.dungeons.find(d=>d.id==='place_salt_village').discovered,true);
  assert.equal(game.dungeons.find(d=>d.id==='dungeon_demon_castle').reward.gold,250000);
  if(!pass)game.resumeSavedGame(structuredClone(game.saveGame({immediate:true})));
}
// 8) Entering each far dungeon: boss and garrison stand on walkable floor, the vault exists, and leaving works.
for(const id of IDS){
  const place=game.dungeons.find(d=>d.id===id);game.monsters=[];game.squad=[];game.reserves=[];game.civilians=[];game.merchants=[];game.gateGuards=[];game.currentQuest=null;game.restTimer=0;game.currentDungeon=null;
  Object.assign(game.player,{x:place.entrance.x,y:place.entrance.y,isDown:false});game.enterDungeon(place);
  assert.equal(game.currentDungeon?.id,id,'entered '+id);const boss=game.monsters.find(m=>m.isDungeonBoss);assert.ok(boss&&boss.type===place.boss.type,id+' boss spawned');
  assert.equal(game.monsters.filter(m=>m.isDungeonMob&&!m.isElite).length,place.mobCount);assert.equal(game.monsters.filter(m=>m.isDungeonMob&&m.isElite).length,place.eliteCount);
  for(const m of game.monsters)assert.ok(!dungeonBlocks(place,m.x,m.y),`${id} ${m.type} spawns on floor`);
  assert.ok(game.dungeonVault&&!game.dungeonVault.opened&&!dungeonBlocks(place,game.dungeonVault.x,game.dungeonVault.y),id+' vault is reachable floor');
  const goal=dungeonSteeringTarget(place,game.player,boss);assert.ok(Number.isFinite(goal.x)&&Number.isFinite(goal.y));
  game.monsters=[];game.currentDungeon=null;
}
console.log('PASS: 9 far dungeons (open/reachable/spaced, real boss HP/ATK, band rewards, vault, enter), far ruin rewards linked to distance, wolf hamlet out of the pond, old saves migrate, nothing else moved');
process.exit(0);