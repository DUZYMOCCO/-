import {CASINO_POLICY} from './casino-rules.js?v=307';
import {isPlatoonAway,isExpeditionReserve} from './expedition-rules.js?v=269';
import {rescueUnits} from './casualty-rules.js?v=317';

export function arenaCandidates(game) {
  const carrying=new Set([...rescueUnits(game),...(game.civilians||[])].filter(s=>s.carrierId).map(s=>String(s.carrierId)));
  return [...new Set([...(game.squad||[]),...(game.reserves||[])])].filter(s=>s&&!s.dead&&!s.isDown&&!s.dying&&s.hp>0&&!s.carrierId&&!carrying.has(String(s.id))&&!s.heroPartyId&&!isExpeditionReserve(game,s)&&
    (s.isPersonalGuard||!(game.squad||[]).includes(s)||!isPlatoonAway(game.platoons?.find(p=>p.id===(s.platoonId||0)%3))));
}
export function arenaProfile(s,cls={}) {
  const key=s.combatClass||s.soldierClass||'';
  return {id:s.id,name:s.name,className:cls.name||key,level:s.level||1,hp:Math.max(1,s.maxHp||s.hp),atk:Math.max(1,s.atk||1),def:Math.max(0,s.def||0),
    interval:Math.max(.12,(cls.atkCooldown||.9)/Math.max(.55,s.atkSpeed||1)),crit:Math.min(.75,(s.crit||5)/100),
    healer:cls.baseClassId==='MEDIC'||/MEDIC|PRIEST|SAINT|ARCHANGEL|HEAL/.test(key),magic:cls.baseClassId==='MAGE'||!!cls.magic||/MAGE|WIZARD|SORCER|MAGIC/.test(key),ranged:(cls.range||0)>100};
}
// Pure mock combat: all mutable HP/cooldowns belong to copies, never the soldiers.
// The identical function resolves both the pre-bet estimate and the paid match.
export function simulateArena(teams,random=Math.random,replay=false) {
  const units=teams.flatMap((team,side)=>team.map(p=>({...p,side,maxHp:p.hp,hp:p.hp,next:random()*.7,form:.55+random()*.9}))),frames=[];
  const capture=t=>{if(replay)frames.push({t,hp:units.map(u=>Math.max(0,u.hp)),attack:units.map(u=>u.flash||false)});};
  capture(0);let time=0,winner=null;
  for(let tick=1;tick<=600;tick++) {
    time=tick*.1;
    const first=random()<.5?0:1,order=[...units.filter(u=>u.side===first),...units.filter(u=>u.side!==first)];
    for(const u of order) {
      u.flash=false;if(u.hp<=0||time<u.next)continue;u.next=time+u.interval;
      const enemies=units.filter(v=>v.side!==u.side&&v.hp>0);if(!enemies.length)break;
      const ally=units.filter(v=>v.side===u.side&&v.hp>0).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(u.healer&&ally.hp<ally.maxHp*.7&&random()<.5)ally.hp=Math.min(ally.maxHp,ally.hp+u.atk*.9);
      else {const target=enemies[Math.floor(random()*enemies.length)];target.hp-=Math.max(1,u.atk*u.form*(.65+random()*.7)*(random()<u.crit?1.7:1)-(u.magic?.25:.5)*target.def);}
      u.flash=true;
    }
    if(tick%4===0)capture(time);
    if([0,1].some(side=>!units.some(u=>u.side===side&&u.hp>0))){winner=units.some(u=>u.side===0&&u.hp>0)?0:1;break;}
  }
  if(winner===null){const scores=[0,1].map(side=>units.filter(u=>u.side===side).reduce((n,u)=>n+Math.max(0,u.hp)/u.maxHp,0));winner=scores[0]===scores[1]?(random()<.5?0:1):scores[0]>scores[1]?0:1;}
  capture(time);return {winner,frames,duration:time};
}
export function estimateArena(teams,random=Math.random,trials=CASINO_POLICY.arenaTrials) {
  let red=0;for(let i=0;i<trials;i++)red+=simulateArena(teams,random).winner===0?1:0;
  const probability=[(red+.5)/(trials+1),(trials-red+.5)/(trials+1)];
  return {trials,probability,odds:probability.map(p=>Math.max(CASINO_POLICY.arenaOddsRange[0],Math.min(CASINO_POLICY.arenaOddsRange[1],CASINO_POLICY.arenaReturn/p)))};
}
export function chooseArena(game,random=Math.random) {
  const pool=arenaCandidates(game);if(pool.length<6)return null;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const soldiers=[pool.slice(0,3),pool.slice(3,6)],teams=soldiers.map(team=>team.map(s=>arenaProfile(s,game.casinoClassFor?.(s))));
  return {soldiers,teams,...estimateArena(teams,random)};
}
export function recordArena(match,winner) {
  match.soldiers.forEach((team,side)=>team.forEach(s=>{const old=s.arenaRecord||{};s.arenaRecord={wins:Math.max(0,Math.floor(old.wins||0))+(side===winner?1:0),losses:Math.max(0,Math.floor(old.losses||0))+(side===winner?0:1)};}));
}
