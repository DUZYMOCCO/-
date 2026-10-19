import {enemyTier} from './enemy-tier.js?v=274';
import {atFacility} from './hq-facilities.js?v=318';
import {encounterBand} from './biome-encounters.js?v=279';
import {WORLD_SIZE} from './world.js?v=289';
const species=(id,title,types,baseTarget,baseReward,hint,minLevel=0)=>({id,title,types,baseTarget,baseReward,hint,minLevel,kind:baseTarget===1?'boss':'species'});
const band=(id,title,bands,baseTarget,baseReward,hint,minLevel=0)=>({id,title,bands,baseTarget,baseReward,hint,minLevel,kind:'band'});
const challenge=(id,title,match,baseTarget,baseReward,hint,minLevel=0)=>({id,title,match,baseTarget,baseReward,hint,minLevel,kind:'boss'});
const CATALOG=[
  {id:'sweep',title:'近くの魔物を討伐',match:'any',baseTarget:10,baseReward:180,hint:'敵の種類を問わず数えます。',minLevel:0,kind:'sweep'},
  band('band-near','近郊の魔物を討伐',[0],12,150,'本陣から800m以内で倒した魔物を、種類を問わず数えます。'),
  band('band-wild','荒野の魔物を討伐',[1],10,260,'本陣から800〜2,200mの荒野で倒した魔物を数えます。'),
  band('band-frontier','辺境の魔物を討伐',[2],8,420,'本陣から2,200〜4,800mの辺境で倒した魔物を数えます。',1),
  band('band-edge','最果ての魔物を討伐',[3],6,700,'本陣から4,800m以上の最果てで倒した魔物を数えます。',3),
  species('slime','スライムの討伐',['slime'],6,120,'本陣の近くの草原にいます。'),
  species('goblin','ゴブリンの討伐',['goblin'],6,160,'草原や街道で見かけます。'),
  species('wolf','狼の討伐',['wolf'],5,220,'本陣から少し離れた場所にいます。'),
  species('orc','オークの討伐',['orc'],4,260,'本陣から少し離れた場所にいます。'),
  species('boar','野猪の討伐',['wild_boar'],5,150,'昼の本陣周辺で見かけます。'),
  species('bat','夜コウモリの討伐',['cave_bat'],6,160,'夜の本陣周辺で見かけます。'),
  species('bandit','山賊の討伐',['sun_bandit'],5,220,'昼の荒野で見かけます。'),
  species('shade-wolf','影狼の討伐',['shade_wolf'],5,240,'夜の荒野で見かけます。'),
  challenge('elite','精鋭の魔物を討伐','elite',2,320,'精鋭の敵を倒すと数えます。'),
  challenge('boss','ボスの討伐','boss',1,600,'ダンジョンや遺跡の主が対象です。'),
  challenge('dungeon-boss','ダンジョンのボスを討伐','dungeonBoss',1,700,'ダンジョンや遺跡の奥にいます。'),
  species('goblin-king','ゴブリンの王を討伐',['goblin_king'],1,800,'ゴブリンの巣の奥にいます。'),
  species('skeleton','スケルトンの討伐',['skeleton'],6,300,'遠くの魔境やダンジョンにいます。',1),
  species('bone-warrior','骸骨兵の討伐',['bone_warrior'],5,340,'夜の魔境や最果てで見かけます。',1),
  species('sun-guard','昼番の討伐',['sun_guard'],5,340,'昼の魔境や最果てで見かけます。',1),
  species('wyvern','ワイバーンの討伐',['wyvern'],3,420,'遠くの魔境や遺跡にいます。',1),
  species('lich','リッチの討伐',['lich'],3,500,'遠くの魔境や遺跡にいます。',2),
  species('lich-elder','古代リッチの討伐',['lich_elder'],1,1200,'死霊の遺跡の奥にいます。',2),
  species('drake','炎の竜を討伐',['hellflame_drake'],1,1500,'竜のダンジョンの奥にいます。',2),
  species('brute','巨大な魔物の討伐',['brute'],2,800,'街道から離れた場所で見かけます。',2),
  species('demon-front','魔王軍の前衛を討伐',['demon_front'],5,900,'遠くの街道で魔王軍と出会えます。',3),
  species('demon-rear','魔王軍の後衛を討伐',['demon_rear'],4,1000,'魔王軍の前衛といっしょに進みます。',3),
  challenge('colossal','超巨大魔獣を討伐','colossal',1,2000,'最果ての巨大な敵が対象です。',3),
  challenge('defense','本陣へ攻める敵を討伐','invasion',8,1200,'本陣を襲う強襲軍が対象です。',3),
  {...challenge('demon-king','魔王の討伐','demonKing',1,6000,'魔王城の奥にいます。',4),unique:true}
];
// Zones: the second filter row. Every band/species/boss job belongs to exactly one zone of its own kind.
export const GUILD_ZONES=Object.freeze({
  band:Object.freeze([['near','近郊'],['wild','荒野'],['frontier','辺境'],['edge','最果て']]),
  species:Object.freeze([['home','本陣周辺'],['wild','荒野'],['ruin','魔境・遺跡'],['demon','魔王軍']]),
  boss:Object.freeze([['elite','精鋭・ボス'],['dungeon','ダンジョン'],['field','野外・防衛'],['castle','魔王城']])
});
const ZONE_OF={
  'band-near':'near','band-wild':'wild','band-frontier':'frontier','band-edge':'edge',
  slime:'home',goblin:'home',wolf:'home',orc:'home',boar:'home',bat:'home',bandit:'wild','shade-wolf':'wild',brute:'wild',
  skeleton:'ruin','bone-warrior':'ruin','sun-guard':'ruin',wyvern:'ruin',lich:'ruin','demon-front':'demon','demon-rear':'demon',
  elite:'elite',boss:'elite','dungeon-boss':'dungeon','goblin-king':'dungeon','lich-elder':'dungeon',drake:'dungeon',colossal:'field',defense:'field','demon-king':'castle'
};
export const GUILD_CONTRACTS=Object.freeze(CATALOG.map(def=>Object.freeze({...def,zone:ZONE_OF[def.id]||''})));
const byId=new Map(GUILD_CONTRACTS.map(q=>[q.id,q]));
const integer=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
export const GUILD_REWARD_MULT=20,GUILD_STATE_VERSION=3,GUILD_REWARD_MIN=250,GUILD_HERO_LEVEL_CAP=40,GUILD_HERO_LEVEL_STEP=.05,GUILD_PROGRESS_CAP=1e6,GUILD_MAX_LEVEL=5;
// Reward = base x (1 + .65 x settlement Lv) x (1 + .05 x (hero Lv - 1), hero Lv capped at 40) x 20, never below 250G.
// The board has no "accept" step: every job is standing, the guild counts every kill all the time, and a report pays the quote of that moment.
const heroLv=level=>Math.max(1,Math.min(GUILD_HERO_LEVEL_CAP,integer(level,1e6)||1));
export const guildHeroLevelFactor=level=>1+GUILD_HERO_LEVEL_STEP*(heroLv(level)-1);
export function guildQuote(def,level=0,heroLevel=1) {
  const l=integer(level,GUILD_MAX_LEVEL),hero=heroLv(heroLevel),boss=def.kind==='boss'||def.baseTarget===1;
  return {...def,level:l,heroLevel:hero,target:def.unique?1:boss?def.baseTarget+Math.floor(l/3):def.baseTarget+l*2,reward:Math.max(GUILD_REWARD_MIN,Math.round(def.baseReward*(1+l*.65)*guildHeroLevelFactor(hero))*GUILD_REWARD_MULT)};
}
// v3 state: progress {id: kills counted since the last report}, claimed {id: phase of the last report}, totalCompleted.
// v1/v2 saves held accepted jobs {id,target,progress}; their counts carry over (the larger count wins when an id appears twice),
// and a finished-but-unreported job stays reportable at any settlement level.
export function normalizeGuild(raw={}) {
  const progress={},src=raw?.progress&&typeof raw.progress==='object'&&!Array.isArray(raw.progress)?raw.progress:{};
  for(const id of byId.keys()){const n=integer(src[id],GUILD_PROGRESS_CAP);if(n>0)progress[id]=n;}
  if(integer(raw?.version)<GUILD_STATE_VERSION)for(const q of Array.isArray(raw?.active)?raw.active:[]){
    const def=byId.get(q?.id);if(!def)continue;
    const target=Math.max(1,integer(q.target,10000)||guildQuote(def,q.level).target),done=integer(q.progress,10000);
    const carried=done>=target?Math.max(done,guildQuote(def,GUILD_MAX_LEVEL).target):done;
    if(carried>(progress[def.id]||0))progress[def.id]=carried;
  }
  const claimed=Object.fromEntries([...byId.keys()].filter(id=>integer(raw?.claimed?.[id])>0).map(id=>[id,integer(raw.claimed[id])]));
  return {version:GUILD_STATE_VERSION,progress,claimed,totalCompleted:integer(raw?.totalCompleted)};
}
const guildState=game=>!game.nation.guild||game.nation.guild.version!==GUILD_STATE_VERSION?(game.nation.guild=normalizeGuild(game.nation.guild)):game.nation.guild;
const isClaimed=(def,state,phase)=>def.unique?!!state.claimed[def.id]:state.claimed[def.id]===phase;
function entry(game,def,state) {
  const level=game.nation.level||0,hero=game.player?.level||1,phase=game.phase||1,quote=guildQuote(def,level,hero);
  const raw=state.progress[def.id]||0,claimed=isClaimed(def,state,phase),ready=!claimed&&raw>=quote.target&&def.minLevel<=level;
  const unavailable=!!def.unique&&!!game.heroJourney?.demonKingDefeat&&!claimed&&raw<quote.target,progress=Math.min(raw,quote.target);
  return {...quote,raw,progress,ratio:progress/quote.target,claimed,unavailable,ready,locked:def.minLevel>level,state:ready?'ready':claimed||unavailable?'done':'progress'};
}
// Every unlocked job in catalog order (the fixed order that never reshuffles).
export function guildBoard(game) {
  const state=guildState(game);
  return GUILD_CONTRACTS.map(def=>entry(game,def,state)).filter(q=>!q.locked);
}
// What the guild screen shows: ready jobs first (largest reward first), then by progress, then reported/finished ones at the end.
export function guildView(game,filter=game.guildFilter||'all',zone=game.guildZone||'all') {
  const state=guildState(game),level=game.nation.level||0,all=GUILD_CONTRACTS.map(def=>entry(game,def,state)),open=all.filter(q=>!q.locked);
  const zones=GUILD_ZONES[filter]||[],z=zones.some(([key])=>key===zone)?zone:'all',kind=GUILD_ZONES[filter]?filter:'all';
  const match=q=>(kind==='all'||q.kind===kind)&&(z==='all'||q.zone===z),rank=q=>q.state==='ready'?0:q.state==='progress'?1:2;
  const rows=open.filter(match).map((q,order)=>({...q,order})).sort((a,b)=>rank(a)-rank(b)||(rank(a)===0?b.reward-a.reward:rank(a)===1?b.ratio-a.ratio:0)||a.order-b.order);
  const locked=all.filter(q=>q.locked&&match(q)),ready=open.filter(q=>q.ready);
  return {level,heroLevel:game.player?.level||1,gold:game.gold||0,totalCompleted:state.totalCompleted,readyCount:ready.length,readyReward:ready.reduce((s,q)=>s+q.reward,0),filter:kind,zone:z,zones,rows,locked,nextUnlock:locked.length?Math.min(...locked.map(q=>q.minLevel)):0};
}
function matches(def,m) {
  if(def.bands){const d=Number.isFinite(m.lootDistance)?m.lootDistance:Number.isFinite(m.x)&&Number.isFinite(m.y)?Math.hypot(m.x-WORLD_SIZE/2,m.y-WORLD_SIZE/2):NaN;return Number.isFinite(d)&&def.bands.includes(encounterBand(d));}
  if(def.types)return def.types.includes(m.type);
  return {any:true,elite:!!m.isElite,boss:enemyTier(m)==='boss',dungeonBoss:!!m.isDungeonBoss&&enemyTier(m)==='boss',colossal:!!m.isColossal&&enemyTier(m)==='midboss',demonKing:!!m.isDemonKing,invasion:(!!m.isDemonInvasion||!!m.isRaidMob)&&!m.isDungeonBoss}[def.match]||false;
}
// Counts one kill for every job (accepted or not, unlocked or not). A job already reported this phase waits for the next phase with a clean count.
export function advanceGuildContracts(game,monster) {
  if(!monster||monster.retreated||monster._guildCredited||!game?.nation)return [];
  monster._guildCredited=true;
  const state=guildState(game),level=game.nation.level||0,hero=game.player?.level||1,phase=game.phase||1,completed=[];
  for(const def of GUILD_CONTRACTS){
    if(isClaimed(def,state,phase)||!matches(def,monster))continue;
    const before=state.progress[def.id]||0;if(before>=GUILD_PROGRESS_CAP)continue;
    state.progress[def.id]=before+1;
    if(before+1===guildQuote(def,level,hero).target&&def.minLevel<=level)completed.push(def.title);
  }
  if(completed.length){
    const names=completed.slice(0,2).join(' / '),extra=completed.length>2?` ほか${completed.length-2}件`:'';
    game.recordBattleLog?.(`依頼達成：${names}${extra}。組合で報告すると報酬を受け取れます。`,{field:true});
  }
  return completed;
}
function persist(game) {game.saveGame?.({background:true});game.updateStatsUI?.(true);game.renderStrategyUI?.();}
function settle(game,state,def) {
  const q=entry(game,def,state);if(!q.ready)return 0;
  delete state.progress[def.id];state.claimed[def.id]=game.phase||1;state.totalCompleted++;game.gold=(game.gold||0)+q.reward;
  return q.reward;
}
export const guildMethods={
  claimGuildContract(id) {
    if(!atFacility(this,'guild',0))return false;
    const def=byId.get(id),reward=def?settle(this,guildState(this),def):0;if(!reward)return false;
    this.showToast?.(`組合依頼を達成！${def.title} · 報酬${reward.toLocaleString()}G`);persist(this);return true;
  },
  // Reports every finished job in one go; returns how many were paid.
  claimAllGuildContracts() {
    if(!atFacility(this,'guild',0))return 0;
    const state=guildState(this);let count=0,total=0;
    for(const def of GUILD_CONTRACTS){const reward=settle(this,state,def);if(reward){count++;total+=reward;}}
    if(!count)return 0;
    this.showToast?.(`まとめて報告！${count}件 · 報酬${total.toLocaleString()}G`);persist(this);return count;
  }
};