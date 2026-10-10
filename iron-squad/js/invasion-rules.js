import {WORLD_SIZE} from './world.js?v=151';
import {combatPower} from './combat-rewards.js?v=151';
import {persistentUnit} from './render-support.js?v=151';
import {sound} from '../../common/js/audio.js?v=151';

export const INVASION_FIRST_PHASE=3,INVASION_INTERVAL=4,INVASION_MARCH_SECONDS=25,INVASION_BATTLE_SECONDS=70;
export const MAJOR_FIRST_PHASE=11,MAJOR_INTERVAL=8,MAJOR_MARCH_SECONDS=35,MAJOR_BATTLE_SECONDS=125;
// A bounded regular force gives equipment development a real hurdle to overcome.
export const REGULAR_INVASION_RULES=Object.freeze({hpFloor:180,hpCeiling:360,atkFloor:36,atkCeiling:72,defFloor:18,defCeiling:50,count:28,hpScale:12,atkScale:16,attackReach:58,cleaveRadius:20});
const MAJOR_HP_SCALE=2.25,MAJOR_ATK_SCALE=1.8;
export const RANDOM_RAID_MIN_PHASE=8,RANDOM_RAID_GAP=8,RANDOM_RAID_CHANCE=.12;
const center=WORLD_SIZE/2;
const positive=(x,f=1)=>Number.isFinite(x)&&x>0?x:f;
export function invasionStrength(game) {
  // Use full health and a robust army percentile; one exceptional hero cannot inflate every recruit's opposition.
  const army=(game.squad||[]).filter(s=>s&&!s.dead&&!s.isDown&&s.hp>0).sort((a,b)=>combatPower(a)-combatPower(b));
  const anchor=army[Math.floor(Math.max(0,army.length-1)*.65)]||game.player;
  const hero=game.player||anchor,ratio=Math.max(.7,Math.min(1.6,combatPower(hero)/combatPower(anchor))),factor=army.length?.75+.25*ratio:1;
  return {hp:positive(anchor?.maxHp,120)*factor,atk:positive(anchor?.atk,15)*factor,def:Math.max(0,anchor?.def||0),level:positive(anchor?.level),count:Math.min(20,8+Math.floor(army.length/4)),heroHp:positive(hero?.maxHp,120),heroDef:Math.max(0,hero?.def||0)};
}
export function majorInvasionStrength(reference,number=1) {
  const growth=1+Math.min(2,Math.max(0,number-1)*.12);
  return {...reference,hp:reference.hp*growth,atk:reference.atk*(1+Math.min(1,Math.max(0,number-1)*.06)),def:reference.def,count:36};
}
export function regularInvasionStrength(strength) {
 const r=REGULAR_INVASION_RULES,clamp=(v,min,max)=>Math.max(min,Math.min(max,positive(v,min)));
 return {...strength,hp:clamp(strength.hp,r.hpFloor,r.hpCeiling),atk:clamp(strength.atk,r.atkFloor,r.atkCeiling),def:clamp(strength.def,r.defFloor,r.defCeiling),count:r.count};
}
export function majorReference(strength) {
  return {...strength,hp:Math.max(120,Math.min(220,positive(strength?.hp,120))),atk:Math.max(24,Math.min(48,positive(strength?.atk,24))),def:Math.max(15,Math.min(50,positive(strength?.def,15))),count:36};
}
export function initializeInvasions(game,saved=null) {
  const old=saved?.invasions;
  game.invasions={nextPhase:Math.max(INVASION_FIRST_PHASE,old?.nextPhase??Math.max(INVASION_FIRST_PHASE,game.phase||1)),stage:['marching','battle'].includes(old?.stage)?old.stage:'idle',
    eta:Math.max(0,old?.eta||0),remaining:Math.max(0,old?.remaining||0),sequence:old?.sequence||0,source:old?.source||{x:center+42000,y:center+42000},strength:old?.strength||null,
    kind:old?.kind==='major'?'major':'regular',majorCount:old?.majorCount||0,nextMajorPhase:Math.max(MAJOR_FIRST_PHASE,old?.nextMajorPhase||MAJOR_FIRST_PHASE),majorReference:old?.majorReference?majorReference(old.majorReference):null,marchDuration:old?.marchDuration||INVASION_MARCH_SECONDS,
    lastResult:old?.lastResult||null,raidRollPhase:old?.raidRollPhase||0,raidScheduledPhase:old?.raidScheduledPhase||0,raidTriggerRemaining:old?.raidTriggerRemaining||0,raidLastPhase:old?.raidLastPhase||0};
  game.baseRaidActive=!!old?.baseRaidActive;game.baseRaidTimer=old?.baseRaidTimer||0;game.baseRaidTriggeredPhase=game.invasions.raidLastPhase;
  const mobs=(old?.mobs||[]).filter(m=>m&&m.hp>0).map(persistentUnit);
  if(mobs.length){const target=game.restTimer>0?(game.restMonsters||=[]):(game.monsters||=[]);for(let i=target.length-1;i>=0;i--)if(target[i].isRaidMob)target.splice(i,1);makeEnemyRoom(target,mobs.length);target.push(...mobs);}
  game._invasionUISeconds=-1;game.refreshInvasionUI?.();
}
export function serializeInvasions(game) {
  return {...game.invasions,baseRaidActive:!!game.baseRaidActive,baseRaidTimer:game.baseRaidTimer||0,
    raidLastPhase:game.baseRaidTriggeredPhase||game.invasions?.raidLastPhase||0,
    mobs:[...(game.currentDungeon?game.savedFieldMonsters||[]:game.monsters||[]),...(game.restMonsters||[])].filter(m=>m.isRaidMob&&m.hp>0).map(persistentUnit)};
}
export function makeEnemyRoom(list,count) {
  while(list.length+count>40){let index=-1,d=-1;for(let i=0;i<list.length;i++){const m=list[i];if(m.isBoss||m.isColossal||m.isRaidMob)continue;const dist=Math.hypot(m.x-center,m.y-center);if(dist>d){d=dist;index=i;}}if(index<0)break;list.splice(index,1);}
}
export function shouldTriggerRandomRaid(game,random=Math.random) {
  const state=game.invasions;if(!state||game.baseRaidActive||game.currentDungeon||game.restTimer>0||state.stage!=='idle'||(game.phase||1)>=state.nextPhase)return false;
  const phase=game.phase||1;
  if(phase<RANDOM_RAID_MIN_PHASE||phase-(game.baseRaidTriggeredPhase||state.raidLastPhase||0)<RANDOM_RAID_GAP)return false;
  if(state.raidRollPhase!==phase){state.raidRollPhase=phase;state.raidScheduledPhase=random()<RANDOM_RAID_CHANCE?phase:0;state.raidTriggerRemaining=(game.phaseDuration||120)*(.4+random()*.15);}
  return state.raidScheduledPhase===phase&&game.phaseTimer<=state.raidTriggerRemaining;
}
export const invasionMethods={
  startDemonInvasion() {
    const s=this.invasions;if(!s||s.stage!=='idle'||this.baseRaidActive||this.currentDungeon||this.restTimer>0)return false;
    const castle=(this.dungeons||[]).find(d=>d.id==='dungeon_demon_castle');if(castle?.cleared)return false;
    s.kind=(this.phase||1)>=s.nextMajorPhase?'major':'regular';s.stage='marching';s.marchDuration=s.kind==='major'?MAJOR_MARCH_SECONDS:INVASION_MARCH_SECONDS;s.eta=s.marchDuration;s.remaining=s.kind==='major'?MAJOR_BATTLE_SECONDS:INVASION_BATTLE_SECONDS;s.sequence++;
    const strength=invasionStrength(this);
    if(s.kind==='major'){s.majorReference ||= majorReference(strength);s.majorCount++;s.nextMajorPhase=(this.phase||1)+MAJOR_INTERVAL;s.strength=majorInvasionStrength(s.majorReference,s.majorCount);}else s.strength=regularInvasionStrength(strength);
    s.source={...(castle?.entrance||{x:center+42000,y:center+42000})};s.nextPhase=(this.phase||1)+INVASION_INTERVAL;
    this.showToast(s.kind==='major'?`壊滅危険！魔王城の本格侵攻軍が出撃。${s.eta}秒後に到着。隊長の救援・育成兵・衛生兵で迎撃し、撤退も判断せよ`:`壊滅危険！魔王城から第${s.sequence}侵攻軍が出撃。25秒後に本陣の三方向へ展開。初期装備での迎撃は厳しい。救援・退避を判断せよ`);sound.playBomb();this.refreshInvasionUI();this.saveGame();return true;
  },
  arriveDemonInvasion() {
    const s=this.invasions;if(!s||s.stage!=='marching')return;
    const strength=s.strength||invasionStrength(this);makeEnemyRoom(this.monsters,strength.count);
    const count=Math.min(strength.count,Math.max(0,40-this.monsters.length));
    if(!count)return; // Defer arrival while authored bosses occupy the entire encounter budget.
    s.stage='battle';s.eta=0;
    for(let i=0;i<count;i++) {
      const major=s.kind==='major',commander=i===0,elite=major&&!commander&&i%6===0,flanker=!commander&&!elite&&i%4===0,offset=(i%5-2)*60,rank=Math.floor(i/5)*48;
      const r=REGULAR_INVASION_RULES,HS=MAJOR_HP_SCALE,AS=MAJOR_ATK_SCALE;const hp=Math.round(strength.hp*(major?HS*(commander?90:elite?40:flanker?18:24):r.hpScale*(commander?8:flanker?2.2:3))),def=Math.min(180,strength.def*(major?1.3:commander?.85:.55)+(major?(commander?100:elite?75:55):(commander?18:5)));
      const cap=Math.max(130,Math.min(260,strength.heroHp||130))*.24*(1+Math.max(0,Math.min(20,strength.heroDef||0))*.012);
      const atk=Math.max(2,Math.round(major?AS*strength.atk*(commander?14:elite?12:flanker?8:10):r.atkScale*Math.min(strength.atk*(commander?1.15:flanker?.65:.8),cap)));
      const angle=(i%3-1)*Math.PI/3+Math.PI/4,distance=650+Math.floor(i/3)*35,x=major?center+520+offset:center+Math.cos(angle)*distance,y=major?center+490+rank:center+Math.sin(angle)*distance;
      this.monsters.push({id:`invasion_${s.sequence}_${i}`,x,y,homeX:x,homeY:y,
        type:flanker?'wolf':'orc',name:major?(commander?'魔王軍・征服将軍':elite?'魔王軍・攻城黒騎士':flanker?'魔王軍・上位魔獣':'魔王軍・精鋭黒鎧兵'):commander?'魔王軍・侵攻隊長':flanker?'魔王軍・魔獣騎兵':'魔王軍・黒鎧兵',title:major?'【本格侵攻】':'魔王城侵攻軍',
        hp,maxHp:hp,atk,def,dmgReduction:major?(commander?30:elite?25:20):commander?12:5,speed:major?(flanker?95:78):flanker?86:commander?64:70,radius:commander?23:flanker?13:16,
        color:'#754851',isBoss:commander,isInvasionCommander:commander,isDemonInvasion:true,attackReach:major?(commander?100:elite?78:flanker?30:52):r.attackReach,cleaveRadius:major?(commander?65:elite?45:0):commander?35:r.cleaveRadius,isMajorInvasion:major,isMajorElite:elite,isRaidMob:true,attackInterval:major?.85:1,atkTimer:.3+(i%4)*.15,hitPulse:0,
        lootDistance:Math.min(22000,1200+strength.level*180)});
    }
    this.showToast(s.kind==='major'?'本格侵攻軍が到着！放置防衛は壊滅危険。隊長の強撃・育成兵・衛生兵を投入せよ':'魔王軍が本陣の三方向へ展開！初期軍は壊滅危険。隊長の救援・育成兵・衛生兵で門を守れ');this.refreshInvasionUI();this.saveGame();
  },
  finishDemonInvasion(outcome) {
    const s=this.invasions;if(!s||s.stage==='idle')return false;
    const sequence=s.sequence;s.stage='idle';s.eta=0;s.remaining=0;
    for(const key of ['monsters','restMonsters','savedFieldMonsters'])if(this[key])this[key]=this[key].filter(m=>{if(m.isDemonInvasion)m.retreated=true;return !m.isDemonInvasion;});
    this.projectiles=(this.projectiles||[]).filter(p=>!p.target?.retreated);
    if(outcome==='victory'){
      const bonus=s.kind==='major'?3:1,rewardGold=(450+sequence*100)*bonus,treasuryGold=(1500+sequence*250)*bonus;
      this.gold+=rewardGold;this.treasury+=treasuryGold;if(!this.phaseFiscal)this.beginPhaseFiscal();this.phaseFiscal.defenseRewards=(this.phaseFiscal.defenseRewards||0)+treasuryGold;
      s.lastResult={phase:this.phase,sequence,kind:s.kind,outcome,rewardGold,treasuryGold};sound.playHighScore();this.showToast(`魔王軍を撃退！隊長+${rewardGold}G／国庫+${treasuryGold}G`);
    } else {s.lastResult={phase:this.phase,sequence,kind:s.kind,outcome};this.showToast(outcome==='castle-fallen'?'魔王城を制圧！定期侵攻軍は指揮を失い撤退した':outcome==='timeout'?'魔王軍は攻撃時間を終えて撤退した。負傷兵を救助し、次の侵攻へ備えよう':'魔王軍が本隊を制圧して撤退。負傷兵の救助を優先せよ');}
    this.refreshInvasionUI();this.saveGame();return true;
  },
  updateDemonInvasion(dt) {
    const s=this.invasions;if(!s||!(dt>0)||!this.inBattle)return;
    const defeated=(this.dungeons||[]).some(d=>d.id==='dungeon_demon_castle'&&d.cleared);
    if(defeated){if(s.stage!=='idle')this.finishDemonInvasion('castle-fallen');return;}
    if(this.currentDungeon||this.restTimer>0)return;
    if(s.stage==='idle'){if((this.phase||1)>=s.nextPhase&&this.phaseTimer<=(this.phaseDuration||120)-20)this.startDemonInvasion();return;}
    if(s.stage==='marching'){s.eta=Math.max(0,s.eta-dt);if(s.eta<=0)this.arriveDemonInvasion();}
    else if(s.stage==='battle') {
      const enemies=(this.monsters||[]).filter(m=>m.isDemonInvasion&&m.hp>0);
      if(!enemies.length){this.finishDemonInvasion('victory');return;}
      const defenders=[...(this.squad||[]).filter(u=>u&&!u.isPersonalGuard&&Math.hypot(u.x-center,u.y-center)<2200),...(this.gateGuards||[]).filter(g=>g.gateSpace==='field'&&Math.hypot(g.x-center,g.y-center)<900)].filter(u=>u&&!u.dead&&!u.isDown&&u.hp>0);
      if(!defenders.length&&Math.hypot(this.player.x-center,this.player.y-center)>900){this.finishDemonInvasion('overrun');return;}
      s.remaining=Math.max(0,s.remaining-dt);if(s.remaining<=0){this.finishDemonInvasion('timeout');return;}
    }
    const seconds=Math.ceil(s.stage==='marching'?s.eta:s.remaining);if(seconds!==this._invasionUISeconds){this._invasionUISeconds=seconds;this.refreshInvasionUI();}
  },
  refreshInvasionUI() {
    const s=this.invasions;if(!s)return;const stopped=(this.dungeons||[]).some(d=>d.id==='dungeon_demon_castle'&&d.cleared);
    const count=(this.currentDungeon?this.savedFieldMonsters||[]:this.monsters||[]).filter(m=>m.isDemonInvasion&&m.hp>0).length;
    const danger=s.kind==='major'?'本格侵攻・壊滅危険':'魔王軍・壊滅危険';
    const text=stopped?'魔王城制圧済み · 定期侵攻停止':s.stage==='marching'?`${danger}が南東から進軍中 · 到着まで${Math.ceil(s.eta)}秒`:s.stage==='battle'?`${danger}迎撃 · 残り${count}体 / ${Math.ceil(s.remaining)}秒`:`次の${s.nextPhase>=s.nextMajorPhase?'本格侵攻（壊滅危険）':'魔王軍侵攻'} · 第${s.nextPhase}ウェーブ`;
    const banner=this.container?.querySelector('#demon-invasion-banner');if(banner){banner.classList.toggle('hidden',s.stage==='idle'||!!this.currentDungeon);banner.textContent=text;banner.dataset.major=String(s.kind==='major'&&s.stage!=='idle');}
    const panel=this.container?.querySelector('#nation-defense');if(panel){panel.replaceChildren();const heading=document.createElement('h4');heading.textContent='魔王軍と本陣防衛';const info=document.createElement('p');info.textContent=text+(this.currentDungeon&&s.stage!=='idle'?'（町・ダンジョン滞在中は進行待機）':'');const rules=document.createElement('p');rules.textContent='第3ウェーブから4ウェーブ間隔。25秒の出撃予告。通常軍も初期装備では壊滅危険。28体が三方向へ展開し、戦力には下限と上限があるため育成で乗り越えられる。第11ウェーブから本格侵攻が8ウェーブ間隔で混ざる。本格侵攻は35秒前に予告し、放置防衛は壊滅危険。育成で対抗可能。既存の強襲は低頻度の抽選。';panel.append(heading,info,rules);const pending=(this.gatePosts||[]).filter(p=>p.townId&&p.refillAtPhase);if(pending.length){const relief=document.createElement('p');relief.textContent=`町の門番補充：${pending.length}か所 · 最短あと${Math.max(0,Math.min(...pending.map(p=>p.refillAtPhase))-(this.phase||1))}ウェーブ。救助者は本陣に残ります。`;panel.append(relief);}if(s.lastResult){const result=document.createElement('p');result.textContent=`直近：第${s.lastResult.phase}ウェーブ · ${({victory:'撃退成功',timeout:'敵軍撤退',overrun:'本隊制圧','castle-fallen':'魔王城制圧'})[s.lastResult.outcome]||'撤退'}`;panel.append(result);}}
  }
};
export function drawInvasionRoute(ctx,game,px,py,inside) {
  const s=game.invasions;if(s?.stage!=='marching')return;
  const progress=1-Math.max(0,Math.min(1,s.eta/(s.marchDuration||INVASION_MARCH_SECONDS))),x=s.source.x+(center-s.source.x)*progress,y=s.source.y+(center-s.source.y)*progress;
  ctx.save();ctx.strokeStyle='#b87777';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px(s.source.x),py(s.source.y));ctx.lineTo(px(center),py(center));ctx.stroke();ctx.setLineDash([]);
  if(inside(x,y)){ctx.fillStyle='#df9b8d';ctx.beginPath();ctx.moveTo(px(x),py(y)-4);ctx.lineTo(px(x)+4,py(y)+3);ctx.lineTo(px(x)-4,py(y)+3);ctx.fill();}ctx.restore();
}
