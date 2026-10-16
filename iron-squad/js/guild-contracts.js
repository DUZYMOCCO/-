import {enemyTier} from './enemy-tier.js?v=274';
import {atFacility} from './hq-facilities.js?v=290';
import {encounterBand} from './biome-encounters.js?v=279';
import {WORLD_SIZE} from './world.js?v=289';
const species=(id,title,types,baseTarget,baseReward,hint,minLevel=0)=>({id,title,types,baseTarget,baseReward,hint,minLevel,kind:baseTarget===1?'boss':'species'});
const band=(id,title,bands,baseTarget,baseReward,hint,minLevel=0)=>({id,title,bands,baseTarget,baseReward,hint,minLevel,kind:'band'});
const challenge=(id,title,match,baseTarget,baseReward,hint,minLevel=0)=>({id,title,match,baseTarget,baseReward,hint,minLevel,kind:'boss'});
export const GUILD_CONTRACTS=Object.freeze([
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
]);
const byId=new Map(GUILD_CONTRACTS.map(q=>[q.id,q]));
const integer=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
export const GUILD_REWARD_MULT=20,GUILD_STATE_VERSION=2,GUILD_REWARD_MIN=250,GUILD_HERO_LEVEL_CAP=40,GUILD_HERO_LEVEL_STEP=.05;
// Reward = base x (1 + .65 x settlement Lv) x (1 + .05 x (hero Lv - 1), hero Lv capped at 40) x 20, never below 250G.
// The board quote and the accepted snapshot share this one deterministic formula, so reopening the board can never reroll a contract.
const heroLv=level=>Math.max(1,Math.min(GUILD_HERO_LEVEL_CAP,integer(level,1e6)||1));
export const guildHeroLevelFactor=level=>1+GUILD_HERO_LEVEL_STEP*(heroLv(level)-1);
export function guildQuote(def,level=0,heroLevel=1) {
  const l=integer(level,5),hero=heroLv(heroLevel),boss=def.kind==='boss'||def.baseTarget===1;
  return {...def,level:l,heroLevel:hero,target:def.unique?1:boss?def.baseTarget+Math.floor(l/3):def.baseTarget+l*2,reward:Math.max(GUILD_REWARD_MIN,Math.round(def.baseReward*(1+l*.65)*guildHeroLevelFactor(hero))*GUILD_REWARD_MULT)};
}
export function normalizeGuild(raw={}) {
  const active=[],seen=new Set();
  for(const q of Array.isArray(raw?.active)?raw.active:[]){
    const def=byId.get(q?.id);if(!def||seen.has(def.id))continue;seen.add(def.id);
    const quote=guildQuote(def,q.level);
    const savedReward=integer(q.reward),reward=savedReward?integer(savedReward*(integer(raw.version)<GUILD_STATE_VERSION?GUILD_REWARD_MULT:1)):quote.reward;
    active.push({id:def.id,level:quote.level,target:Math.max(1,integer(q.target,10000)||quote.target),reward,progress:Math.min(integer(q.progress,10000),Math.max(1,integer(q.target,10000)||quote.target)),acceptedPhase:integer(q.acceptedPhase)});
  }
  const claimed=Object.fromEntries([...byId.keys()].filter(id=>integer(raw?.claimed?.[id])>0).map(id=>[id,integer(raw.claimed[id])]));
  return {version:GUILD_STATE_VERSION,active,claimed,totalCompleted:integer(raw?.totalCompleted)};
}
const guildState=game=>!game.nation.guild||game.nation.guild.version!==GUILD_STATE_VERSION?(game.nation.guild=normalizeGuild(game.nation.guild)):game.nation.guild;
export function guildBoard(game) {
  const state=guildState(game),level=game.nation.level||0,hero=game.player?.level||1,phase=game.phase||1;
  return GUILD_CONTRACTS.filter(q=>q.minLevel<=level).map(def=>{
    const accepted=state.active.find(q=>q.id===def.id),quote=guildQuote(def,level,hero);
    return {...quote,...accepted,accepted:!!accepted,completed:!!accepted&&accepted.progress>=accepted.target,unavailable:!!def.unique&&!!game.heroJourney?.demonKingDefeat,claimed:def.unique?!!state.claimed[def.id]:state.claimed[def.id]===phase};
  });
}
function matches(def,m) {
  if(def.bands){const d=Number.isFinite(m.lootDistance)?m.lootDistance:Number.isFinite(m.x)&&Number.isFinite(m.y)?Math.hypot(m.x-WORLD_SIZE/2,m.y-WORLD_SIZE/2):NaN;return Number.isFinite(d)&&def.bands.includes(encounterBand(d));}
  if(def.types)return def.types.includes(m.type);
  return {any:true,elite:!!m.isElite,boss:enemyTier(m)==='boss',dungeonBoss:!!m.isDungeonBoss&&enemyTier(m)==='boss',colossal:!!m.isColossal&&enemyTier(m)==='midboss',demonKing:!!m.isDemonKing,invasion:(!!m.isDemonInvasion||!!m.isRaidMob)&&!m.isDungeonBoss}[def.match]||false;
}
export function advanceGuildContracts(game,monster) {
  if(!monster||monster.retreated||monster._guildCredited)return [];
  monster._guildCredited=true;
  const completed=[];
  for(const q of game.nation?.guild?.active||[]){
    const def=byId.get(q.id);if(q.progress>=q.target||!def||!matches(def,monster))continue;
    q.progress++;
    if(q.progress===q.target)completed.push(def.title);
  }
  if(completed.length){
    const names=completed.slice(0,2).join(' / '),extra=completed.length>2?` ほか${completed.length-2}件`:'';
    game.recordBattleLog?.(`依頼達成：${names}${extra}。組合で報酬を受け取れます。`,{field:true});
  }
  return completed;
}
function persist(game) {game.saveGame?.({background:true});game.updateStatsUI?.(true);game.renderStrategyUI?.();}
export const guildMethods={
  acceptGuildContract(id) {
    if(!atFacility(this,'guild',0))return false;
    const q=guildBoard(this).find(q=>q.id===id);if(!q||q.accepted||q.claimed||q.unavailable)return false;
    this.nation.guild.active.push({id:q.id,level:q.level,target:q.target,reward:q.reward,progress:0,acceptedPhase:this.phase||1});
    this.showToast?.(`依頼を受けました：${q.title}`);persist(this);return true;
  },
  claimGuildContract(id) {
    if(!atFacility(this,'guild',0))return false;
    const state=guildState(this),q=state.active.find(q=>q.id===id);if(!q||q.progress<q.target)return false;
    state.active=state.active.filter(other=>other!==q);state.claimed[id]=this.phase||1;state.totalCompleted++;
    this.gold=(this.gold||0)+q.reward;this.showToast?.(`組合依頼を達成！${byId.get(id).title} · 報酬${q.reward.toLocaleString()}G`);persist(this);return true;
  },
  abandonGuildContract(id) {
    if(!atFacility(this,'guild',0))return false;
    const state=this.nation.guild,q=state?.active.find(q=>q.id===id);if(!q||q.progress>=q.target)return false;
    state.active=state.active.filter(other=>other!==q);persist(this);return true;
  },
  renderGuild(panel) {
    const board=guildBoard(this),state=this.nation.guild,filter=this.guildFilter||'all',open=atFacility(this,'guild',0);
    // Accepted snapshots remain on the board when the settlement grows.
    const active=state.active.map(q=>({...byId.get(q.id),...q,accepted:true,completed:q.progress>=q.target,unavailable:!!byId.get(q.id).unique&&!!this.heroJourney?.demonKingDefeat})).sort((a,b)=>Number(b.completed)-Number(a.completed));
    const available=board.filter(q=>!q.accepted&&(filter==='all'||q.kind===filter));
    const card=q=>`<article class="guild-contract ${q.completed?'guild-complete':''}"><header><strong>${q.title}</strong><b>${q.reward.toLocaleString()}G</b></header><p>${q.accepted?`討伐 ${q.progress} / ${q.target}`:`討伐目標 ${q.target}体`} · ${q.hint}</p>${q.unavailable&&!q.completed?'<p>依頼の対象は討伐済みです。</p>':''}<button type="button" id="guild-${q.accepted?'claim':'accept'}-${q.id}" ${q.accepted?`data-guild-claim="${q.id}"`:`data-guild-accept="${q.id}"`} ${!open||(q.accepted?!q.completed:q.claimed||q.unavailable)?'disabled':''}>${q.accepted?q.completed?'報酬を受け取る':'討伐中':q.claimed?q.unique?'達成済み':'今期は達成済み':q.unavailable?'討伐済み':'依頼を受ける'}</button>${q.accepted&&!q.completed?`<button type="button" class="guild-abandon" data-guild-abandon="${q.id}" ${!open?'disabled':''}>依頼を取り下げる</button>`:''}</article>`;
    panel.insertAdjacentHTML('beforeend',`<section class="guild-board"><p>発展Lv${this.nation.level} · 主人公Lv${this.player?.level||1} · 報酬は両方のLvで増えます。いくつもの依頼をいっしょに進められます。</p><h5>受けている依頼（${active.length}件）</h5><div class="guild-contract-list">${active.map(card).join('')||'<p>まだ依頼を受けていません。</p>'}</div><h5>新しい依頼</h5><nav class="guild-filters" aria-label="依頼の種類">${[['all','すべて'],['band','距離帯'],['species','魔物別'],['boss','ボス・強敵']].map(([key,label])=>`<button type="button" data-guild-filter="${key}" aria-pressed="${filter===key}">${label}</button>`).join('')}</nav><div class="guild-contract-list">${available.map(card).join('')||'<p>この種類の依頼はもう受けています。</p>'}</div></section>`);
    for(const b of panel.querySelectorAll('[data-guild-accept]'))b.onclick=()=>this.acceptGuildContract(b.dataset.guildAccept);
    for(const b of panel.querySelectorAll('[data-guild-claim]'))b.onclick=()=>this.claimGuildContract(b.dataset.guildClaim);
    for(const b of panel.querySelectorAll('[data-guild-abandon]'))b.onclick=()=>this.abandonGuildContract(b.dataset.guildAbandon);
    for(const b of panel.querySelectorAll('[data-guild-filter]'))b.onclick=()=>{this.guildFilter=b.dataset.guildFilter;this.refreshHeadquartersFacility();};
  }
};
