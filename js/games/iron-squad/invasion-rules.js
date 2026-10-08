import {WORLD_SIZE} from './world.js?v=106';
import {combatPower} from './combat-rewards.js?v=106';
import {persistentUnit} from './render-support.js?v=106';
import {sound} from '../../audio.js?v=106';

export const INVASION_FIRST_PHASE=3,INVASION_INTERVAL=4,INVASION_MARCH_SECONDS=25,INVASION_BATTLE_SECONDS=70;
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
export function initializeInvasions(game,saved=null) {
  const old=saved?.invasions;
  game.invasions={nextPhase:Math.max(INVASION_FIRST_PHASE,old?.nextPhase??Math.max(INVASION_FIRST_PHASE,game.phase||1)),stage:['marching','battle'].includes(old?.stage)?old.stage:'idle',
    eta:Math.max(0,old?.eta||0),remaining:Math.max(0,old?.remaining||0),sequence:old?.sequence||0,source:old?.source||{x:center+42000,y:center+42000},strength:old?.strength||null,
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
    s.stage='marching';s.eta=INVASION_MARCH_SECONDS;s.remaining=INVASION_BATTLE_SECONDS;s.sequence++;s.strength=invasionStrength(this);s.source={...(castle?.entrance||{x:center+42000,y:center+42000})};s.nextPhase=(this.phase||1)+INVASION_INTERVAL;
    this.showToast(`魔王城から第${s.sequence}侵攻軍が出撃！25秒後に本陣南東へ到着。門番・本隊と迎撃せよ`);sound.playBomb();this.refreshInvasionUI();this.saveGame();return true;
  },
  arriveDemonInvasion() {
    const s=this.invasions;if(!s||s.stage!=='marching')return;
    const strength=s.strength||invasionStrength(this);makeEnemyRoom(this.monsters,strength.count);
    const count=Math.min(strength.count,Math.max(0,40-this.monsters.length));
    if(!count)return; // Defer arrival while authored bosses occupy the entire encounter budget.
    s.stage='battle';s.eta=0;
    for(let i=0;i<count;i++) {
      const commander=i===0,flanker=!commander&&i%4===0,offset=(i%5-2)*60,rank=Math.floor(i/5)*48;
      const hp=Math.round(strength.hp*(commander?8:flanker?2.2:3)),def=Math.min(180,strength.def*(commander?.85:.55)+(commander?18:5));
      const cap=strength.heroHp*.24*(1+strength.heroDef*.012);
      const atk=Math.max(2,Math.round(Math.min(strength.atk*(commander?1.15:flanker?.65:.8),cap)));
      this.monsters.push({id:`invasion_${s.sequence}_${i}`,x:center+520+offset,y:center+490+rank,homeX:center+520,homeY:center+490,
        type:flanker?'wolf':'orc',name:commander?'魔王軍・侵攻隊長':flanker?'魔王軍・魔獣騎兵':'魔王軍・黒鎧兵',title:'魔王城侵攻軍',
        hp,maxHp:hp,atk,def,dmgReduction:commander?12:5,speed:flanker?86:commander?64:70,radius:commander?23:flanker?13:16,
        color:'#754851',isBoss:commander,isInvasionCommander:commander,isDemonInvasion:true,isRaidMob:true,atkTimer:.3+(i%4)*.15,hitPulse:0,
        lootDistance:Math.min(22000,1200+strength.level*180)});
    }
    this.showToast('魔王軍が本陣南東へ到着！門を守り、侵攻隊長を倒して全軍を撃退せよ');this.refreshInvasionUI();this.saveGame();
  },
  finishDemonInvasion(outcome) {
    const s=this.invasions;if(!s||s.stage==='idle')return false;
    const sequence=s.sequence;s.stage='idle';s.eta=0;s.remaining=0;
    for(const key of ['monsters','restMonsters','savedFieldMonsters'])if(this[key])this[key]=this[key].filter(m=>{if(m.isDemonInvasion)m.retreated=true;return !m.isDemonInvasion;});
    this.projectiles=(this.projectiles||[]).filter(p=>!p.target?.retreated);
    if(outcome==='victory'){
      const rewardGold=450+sequence*100,treasuryGold=1500+sequence*250;
      this.gold+=rewardGold;this.treasury+=treasuryGold;if(!this.phaseFiscal)this.beginPhaseFiscal();this.phaseFiscal.defenseRewards=(this.phaseFiscal.defenseRewards||0)+treasuryGold;
      s.lastResult={phase:this.phase,sequence,outcome,rewardGold,treasuryGold};sound.playHighScore();this.showToast(`魔王軍を撃退！隊長+${rewardGold}G／国庫+${treasuryGold}G`);
    } else {s.lastResult={phase:this.phase,sequence,outcome};this.showToast(outcome==='castle-fallen'?'魔王城を制圧！定期侵攻軍は指揮を失い撤退した':outcome==='timeout'?'魔王軍は攻撃時間を終えて撤退した。負傷兵を救助し、次の侵攻へ備えよう':'魔王軍が本隊を制圧して撤退。負傷兵の救助を優先せよ');}
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
      const defenders=[...(this.squad||[]),...(this.gateGuards||[]).filter(g=>g.gateSpace==='field')].filter(u=>u&&!u.dead&&!u.isDown&&u.hp>0);
      if(!defenders.length&&Math.hypot(this.player.x-center,this.player.y-center)>900){this.finishDemonInvasion('overrun');return;}
      s.remaining=Math.max(0,s.remaining-dt);if(s.remaining<=0){this.finishDemonInvasion('timeout');return;}
    }
    const seconds=Math.ceil(s.stage==='marching'?s.eta:s.remaining);if(seconds!==this._invasionUISeconds){this._invasionUISeconds=seconds;this.refreshInvasionUI();}
  },
  refreshInvasionUI() {
    const s=this.invasions;if(!s)return;const stopped=(this.dungeons||[]).some(d=>d.id==='dungeon_demon_castle'&&d.cleared);
    const count=(this.currentDungeon?this.savedFieldMonsters||[]:this.monsters||[]).filter(m=>m.isDemonInvasion&&m.hp>0).length;
    const text=stopped?'魔王城制圧済み · 定期侵攻停止':s.stage==='marching'?`魔王軍が南東から進軍中 · 到着まで${Math.ceil(s.eta)}秒`:s.stage==='battle'?`魔王軍迎撃 · 残り${count}体 / ${Math.ceil(s.remaining)}秒`:`次の魔王軍侵攻 · 第${s.nextPhase}ウェーブ`;
    const banner=this.container?.querySelector('#demon-invasion-banner');if(banner){banner.classList.toggle('hidden',s.stage==='idle'||!!this.currentDungeon);banner.textContent=text;}
    const panel=this.container?.querySelector('#nation-defense');if(panel){panel.replaceChildren();const heading=document.createElement('h4');heading.textContent='魔王軍と本陣防衛';const info=document.createElement('p');info.textContent=text+(this.currentDungeon&&s.stage!=='idle'?'（町・ダンジョン滞在中は進行待機）':'');const rules=document.createElement('p');rules.textContent='第3ウェーブから4ウェーブ間隔。25秒の出撃予告。敵の戦力は出撃時の現役部隊に合わせて固定。既存の強襲は低頻度の抽選。';panel.append(heading,info,rules);if(s.lastResult){const result=document.createElement('p');result.textContent=`直近：第${s.lastResult.phase}ウェーブ · ${({victory:'撃退成功',timeout:'敵軍撤退',overrun:'本隊制圧','castle-fallen':'魔王城制圧'})[s.lastResult.outcome]||'撤退'}`;panel.append(result);}}
  }
};
export function drawInvasionRoute(ctx,game,px,py,inside) {
  const s=game.invasions;if(s?.stage!=='marching')return;
  const progress=1-Math.max(0,Math.min(1,s.eta/INVASION_MARCH_SECONDS)),x=s.source.x+(center-s.source.x)*progress,y=s.source.y+(center-s.source.y)*progress;
  ctx.save();ctx.strokeStyle='#b87777';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(px(s.source.x),py(s.source.y));ctx.lineTo(px(center),py(center));ctx.stroke();ctx.setLineDash([]);
  if(inside(x,y)){ctx.fillStyle='#df9b8d';ctx.beginPath();ctx.moveTo(px(x),py(y)-4);ctx.lineTo(px(x)+4,py(y)+3);ctx.lineTo(px(x)-4,py(y)+3);ctx.fill();}ctx.restore();
}
