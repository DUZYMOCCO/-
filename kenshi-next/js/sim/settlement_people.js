import { SETTLEMENTS, SETTLEMENT_PLANS, peopleActive } from '../world/settlement_plan.js';
import { WORLD_LAYOUT } from '../data/world_layout.js';
import { makeActor } from './world.js';
import { canonicalFaction } from './faction_relations.js';
import { equipFactionArmor } from './faction_armor.js';

// Local inhabitants are transient: they are recreated when the player returns.
export function updateSettlementPeople(state) {
  if (!state.settlementPeopleEnabled) return;
  const player=state.actors.find(a=>a.id===state.playerId); if(!player) return;
  const active=state.settlementPeople ||= {};
  if(state.tick%20===0) {
    for(let i=0;i<SETTLEMENTS.length;i++) {
      const p=SETTLEMENTS[i], plan=SETTLEMENT_PLANS[i]; if(plan.skipped) continue;
      const on=!!active[p.id], next=peopleActive(on,Math.hypot(player.x-p.x,player.z-p.z));
      if(on && !next) {
        const gone=new Set(state.actors.filter(a=>a.settlementId===p.id).map(a=>a.id));
        state.actors=state.actors.filter(a=>!gone.has(a.id));
        for(const a of state.actors) for(const key of ['targetId','carryingId','carriedBy','carryTargetId','lootTargetId']) if(gone.has(a[key])) a[key]=null;
        delete active[p.id];
      } else if(!on && next) {
        active[p.id]=true;
        const base=p.size==='camp'||p.size==='fort', guards=p.guards||0, residents=p.residents||0;
        for(let j=0;j<guards+residents;j++) {
          const gate=j<Math.min(2,guards), angle=j*2.399, radius=gate?p.radius*.64:Math.min(p.radius*.2,9);
          const x=gate?p.x+plan.gate.x*radius+plan.gate.z*(j===0?-2:2):p.x+Math.cos(angle)*radius;
          const z=gate?p.z+plan.gate.z*radius-plan.gate.x*(j===0?-2:2):p.z+Math.sin(angle)*radius;
          const a=makeActor(state,base?'bandit':'guard',x,z,null,false);
          a.talk=true; a.settlementId=p.id; a.settlementOwner=p.owner; a.settlementPalette=WORLD_LAYOUT.factionAlias[p.owner] || p.owner;
          if (!base) a.ownerFaction=canonicalFaction(p.owner);
          a.settlementRole=j<guards?'guard':'resident'; a.settlementGate=gate; a.settlementIndex=j;
          a.civil=!base && j>=guards; if(a.civil) {a.weapon='fists'; if(a.equip?.weapon) a.equip.weapon[0]=null;} else equipFactionArmor(a);
        }
      }
    }
  }
  if(state.tick%100===0) for(const a of state.actors) {
    if(!a.settlementId || a.settlementGate || a.targetId!==null || a.state==='dead' || a.state==='down' || a.carriedBy!==null) continue;
    const p=SETTLEMENTS.find(q=>q.id===a.settlementId); if(!p) continue;
    const phase=Math.floor(state.tick/100)+a.settlementIndex*3;
    if(phase%3===0) {a.moveTo=null; continue;}
    const angle=phase*2.399, radius=a.settlementRole==='guard'?p.radius*.38:p.radius*.18;
    a.moveTo={x:p.x+Math.cos(angle)*radius,z:p.z+Math.sin(angle)*radius};
  }
}
export function settlementPeopleInfo(state) {
  return {peopleActive:Object.keys(state.settlementPeople||{}),people:state.actors.filter(a=>a.settlementId).length};
}
