import {explorationLayout,dungeonSegmentOpen} from './dungeon-layout.js?v=179';
import {chooseLootTier} from './equipment-rules.js?v=158';
import {drawTreasureChest} from './loot-visuals.js?v=177';

export const DUNGEON_RESET_PHASES=2;
const DEMON_CASTLE_ID='dungeon_demon_castle';
const integer=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
const phaseOf=game=>Math.max(1,integer(game.phase||game.wave||1));
const resettable=d=>!!d&&d.kind!=='town'&&d.id!==DEMON_CASTLE_ID;
const dungeonRecord=(game,d)=>(game.dungeons||[]).find(record=>record.id===d?.id)||d;
function explorationRecord(game,id) {
  return (game.dungeonExploration||={})[id]||={opened:[],resetAt:0};
}

export function normalizeDungeonExploration(saved) {
  const state=Object.create(null);
  if(saved&&typeof saved==='object')for(const [id,value]of Object.entries(saved).slice(0,64)){
    if(id.length>100||!value||typeof value!=='object')continue;
    state[id]={opened:[...new Set((Array.isArray(value.opened)?value.opened:[]).filter(x=>x==='north'||x==='south'))].slice(0,2),resetAt:integer(value.resetAt)};
  }
  return state;
}

/** Expired rooms repopulate only while the commander is outside that room. */
export function updateDungeonRespawns(game) {
  const phase=phaseOf(game);let resetCount=0;
  for(const d of game.dungeons||[]){
    if(!resettable(d)||game.currentDungeon?.id===d.id)continue;
    const record=game.dungeonExploration?.[d.id];
    const clearedAt=integer(d.clearedPhase)||integer(d.clearedWave);
    const clearedDue=!!d.cleared&&phase-clearedAt>=DUNGEON_RESET_PHASES;
    const partialDue=!d.cleared&&integer(record?.resetAt)>0&&phase>=integer(record.resetAt);
    if(!clearedDue&&!partialDue)continue;
    if(clearedDue)d.cleared=false;
    if(record){record.opened=[];record.resetAt=0;}
    resetCount++;
  }
  return resetCount;
}

/** Entry calls updateDungeonRespawns first; the ID record is authoritative over a stale definition. */
export function dungeonCoolingDown(game,def) {
  if(!def||def.kind==='town')return false;
  return !!dungeonRecord(game,def)?.cleared;
}

/** Completion starts a fresh two-phase rest period, including previously looted side chests. */
export function recordDungeonClear(game,def) {
  if(!def||def.kind==='town')return null;
  const phase=phaseOf(game),d=dungeonRecord(game,def);
  Object.assign(d,{cleared:true,clearedPhase:phase,clearedWave:phase});
  if(d!==def)Object.assign(def,{cleared:true,clearedPhase:phase,clearedWave:phase});
  const record=explorationRecord(game,def.id);
  record.resetAt=resettable(d)?phase+DUNGEON_RESET_PHASES:0;
  return record;
}

export function dungeonSideChests(game,dungeon=game.currentDungeon) {
  const l=explorationLayout(dungeon);if(!l)return [];
  const record=explorationRecord(game,dungeon.id);
  return l.branches.map(p=>({...p,opened:record.opened.includes(p.id),tier:chooseLootTier(dungeon.distance,'chest',()=>.5)}));
}
export function updateDungeonSideChests(game,createItem) {
  const d=game.currentDungeon,p=game.player;
  if(!d||!p||p.dead||p.isDown||p.hp<=0)return;
  for(const chest of dungeonSideChests(game,d)){
    if(chest.opened||Math.hypot(p.x-chest.x,p.y-chest.y)>=48||!dungeonSegmentOpen(d,p,chest))continue;
    const record=game.dungeonExploration[d.id];
    // Mark first, then immediately deliver: saves cannot lose unopened floor loot.
    record.opened.push(chest.id);
    if(resettable(d)&&!integer(record.resetAt))record.resetAt=phaseOf(game)+DUNGEON_RESET_PHASES;
    game.collectDrop(createItem(d.distance,'chest'));
    game.spawnDamageText?.(chest.x,chest.y-25,'宝箱を開いた！','#e1cc8f');
    game.saveGame?.();
  }
}
export function drawDungeonSideChests(ctx,game,time) {
  for(const chest of dungeonSideChests(game)){
    drawTreasureChest(ctx,chest.x,chest.y,chest.tier,time,{opened:chest.opened});
  }
}
