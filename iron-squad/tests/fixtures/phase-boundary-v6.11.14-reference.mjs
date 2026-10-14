// Frozen v6.11.14 reference for before/after behavior tests (captured 2026-10-15).
import {equipmentScore,isGodRollProtected} from '../../js/equipment-rules.js?v=242';
import {canUseEquipment} from '../../js/weapon-requirements.js?v=239';
import {attributeFamily} from '../../js/unit-attributes.js?v=248';
import {normalizeNation,publicEquipmentCap} from '../../js/nation-rules.js?v=264';
import {RESERVE_ARMAMENT_COUNT,personalEquipmentBudget,ARMAMENT_LIMITS,standardEquipmentCost} from '../../js/armament-rules.js?v=231';
import {sellWeakSurplusFromBox,EQUIPMENT_SLOTS} from '../../js/economy-rules.js?v=231';
const sharedScore=item=>item?equipmentScore({...item,tier:1,upgrade:0})-1000:0;
export function legacyDistributeSharedBoxToSoldiers(box, soldiers, recalcFn, valueFor=(unit,item)=>sharedScore(item)) {
  const held=new Set((soldiers||[]).flatMap(s=>Object.values(s?.equipped||{}).filter(Boolean).map(i=>i.id)));
  const remaining=[...new Map((box||[]).filter(i=>i&&!held.has(i.id)).map(i=>[i.id,i])).values()];let equippedCount=0;
  const alive=(soldiers||[]).filter(s=>s&&!s.dead),changed=new Set();
  for(const [type,key] of Object.entries(EQUIPMENT_SLOTS)){
    // Fill empty slots before upgrading existing equipment, including wounded soldiers.
    const recipients=[...alive].sort((a,b)=>Number(!!a.equipped?.[key])-Number(!!b.equipped?.[key])||valueFor(a,a.equipped?.[key],key)-valueFor(b,b.equipped?.[key],key));
    for(const soldier of recipients){soldier.equipped||={};
      const cur=soldier.equipped[key],score=cur?valueFor(soldier,cur,key):0;if(cur?.favorite||isGodRollProtected(cur))continue;
      const candidates=remaining.filter(i=>i.type===type&&!i.favorite&&!isGodRollProtected(i)&&canUseEquipment(soldier,i)&&Number.isFinite(valueFor(soldier,i,key))&&(!cur||valueFor(soldier,i,key)>score+1e-6)).sort((a,b)=>valueFor(soldier,b,key)-valueFor(soldier,a,key));
      const item=candidates[0];if(!item)continue;
      remaining.splice(remaining.indexOf(item),1);soldier.equipped[key]=item;if(key==='weapon')soldier.weapon=item;
      if(cur&&!remaining.some(i=>i.id===cur.id))remaining.push(cur);equippedCount++;changed.add(soldier);
    }
  }
  if(typeof recalcFn==='function')for(const soldier of changed)recalcFn(soldier);
  return {equippedCount,remaining};
}

export function legacyProcessSharedEquipmentBox() {
    this.sharedEquipBox = this.sharedEquipBox || [];
    // 異質/神鍛 that somehow landed in 国庫共有 → repatriate to personal inventory (never auto-sell/distribute as weak surplus)
    const stay = [];
    this.inventory = this.inventory || [];
    for (const it of this.sharedEquipBox) {
      if (isGodRollProtected(it)) {
        if (it && !this.inventory.some(i => i && i.id === it.id)) this.inventory.push(it);
      } else {
        stay.push(it);
      }
    }
    this.sharedEquipBox = stay;
    const soldiers = [...(this.squad || []), ...(this.reserves || [])];
    const value=(unit,item,key)=>this.equipmentValueFor(unit,item,key);
    const dist = legacyDistributeSharedBoxToSoldiers(this.sharedEquipBox, soldiers, (s) => this.recalcSoldierStats(s),value);
    this.sharedEquipBox = dist.remaining;
    if(this.phaseFiscal)this.phaseFiscal.sharedEquipmentIssued=(this.phaseFiscal.sharedEquipmentIssued||0)+dist.equippedCount;
    // 売却基準は通常品で作る（先頭が術士だと魔導/治癒品が基準になり、低ティアの通常防具まで売ってしまう）
    const sample=soldiers.find(s=>!s.dead&&!['MAGE','MEDIC'].includes(attributeFamily(s)))||{id:'stock',soldierClass:'HEAVY'};
    const strength=i=>equipmentScore({...i,tier:1,upgrade:0});
    const minimum=new Map();
    const sold = sellWeakSurplusFromBox(this.sharedEquipBox, soldiers,value,{perSlot:RESERVE_ARMAMENT_COUNT,keep:item=>{if(!minimum.has(item.type))minimum.set(item.type,strength(this.createSupplyEquipment(item.type,sample,1)));return strength(item)>minimum.get(item.type);}});
    this.sharedEquipBox = sold.remaining;
    this.nation=normalizeNation(this.nation);this.nation.totalExports+=sold.soldGold;
    if (sold.soldGold > 0) {
      this.treasury = (this.treasury || 0) + sold.soldGold;
      if (this.phaseFiscal) {
        this.phaseFiscal.surplusSales = (this.phaseFiscal.surplusSales || 0) + sold.soldGold;
        this.phaseFiscal.surplusCount = (this.phaseFiscal.surplusCount || 0) + sold.soldCount;
      }
    }
    return { equippedCount: dist.equippedCount, soldGold: sold.soldGold, soldCount: sold.soldCount };
  }

export function legacySupplyMissingEquipment() {
    this.nation=normalizeNation(this.nation);const a=this.nation.armament,phase=Math.max(1,this.phase-1);
    if(a.supplyPhase>=phase)return a.last||{issued:0,spent:0,updated:0,forged:0};
    a.supplyPhase=phase;
    let spent=0,issued=0,updated=0,forged=0,forgeSpent=0,publicSpent=0,publicIssued=0;
    // The armament policy caps how much of the treasury may fill empty slots this wave.
    const publicCap=publicEquipmentCap(this);
    const slots=Object.entries(EQUIPMENT_SLOTS),missing=s=>slots.filter(([,key])=>!s.equipped?.[key]).length;
    const deployed=(this.squad||[]).filter(s=>s&&!s.dead),reserves=(this.reserves||[]).filter(s=>s&&!s.dead).slice(0,RESERVE_ARMAMENT_COUNT);
    const buyers=[...deployed,...reserves],budget=buyers.reduce((sum,s)=>sum+personalEquipmentBudget(s),0);
    for(const s of buyers)s.lastEquipmentPurchase={phase,budget:personalEquipmentBudget(s),spent:0,issued:0,updated:0,forged:0};
    for(const group of [deployed,reserves]) {
      const recipients=group.filter(s=>missing(s)).sort((a,b)=>missing(b)-missing(a));
      let progress=true;
      while(progress){progress=false;
        for(const soldier of recipients){
          const next=slots.find(([,key])=>!soldier.equipped?.[key]);if(!next)continue;
          const [type,key]=next;let cost,tier=a.techTier,item;
          const available=personalEquipmentBudget(soldier),lowCost=standardEquipmentCost({tier:1});
          if(available>=lowCost){
            for(;tier>=1;tier--){cost=standardEquipmentCost({tier});if(cost<=available)break;}
            item=this.createSupplyEquipment(type,soldier,tier);
            if(!canUseEquipment(soldier,item))continue;
            soldier.gold-=cost;item.selfFunded=true;
            soldier.lastEquipmentPurchase.spent+=cost;soldier.lastEquipmentPurchase.issued++;
            spent+=cost;issued++;
          }else{
            // A broke soldier still gets the cheapest piece for an empty slot, paid by the treasury above the payroll reserve.
            if(publicSpent+lowCost>publicCap)continue;
            item=this.createSupplyEquipment(type,soldier,1);item.publicIssue=true;
            if(!canUseEquipment(soldier,item))continue;
            publicSpent+=lowCost;publicIssued++;
          }
          soldier.equipped||={};soldier.equipped[key]=item;if(key==='weapon')soldier.weapon=item;
          this.recalcSoldierStats(soldier);progress=true;
        }
      }
    }
    // One paid improvement per actor, at most eight actors per wave. Keep the old piece intact.
    const ordered=[...deployed].sort((x,y)=>this.equipmentValueFor(x,x.equipped?.weapon,'weapon')-this.equipmentValueFor(y,y.equipped?.weapon,'weapon'));
    for(const soldier of ordered){
      if(updated+forged>=ARMAMENT_LIMITS.improvementsPerWave)break;let best=null;
      const available=personalEquipmentBudget(soldier);if(!available)continue;
      for(const [type,key] of slots){
        const cur=soldier.equipped?.[key];if(!cur||cur.favorite||isGodRollProtected(cur))continue;
        const cost=standardEquipmentCost({tier:a.techTier}),forgeCost=soldier.isDown?Infinity:this.getUpgradeCost(cur);
        if(cost>available&&forgeCost>available)continue;
        const value=this.equipmentValueFor(soldier,cur,key);
        if(cost<=available){
          const item=this.createSupplyEquipment(type,soldier,a.techTier),next=this.equipmentValueFor(soldier,item,key),gain=next/Math.max(1,value)-1;
          if(gain>=ARMAMENT_LIMITS.replacementMinGain&&(!best||gain/cost>best.efficiency))best={key,item,cost,efficiency:gain/cost,kind:'replace'};
        }
        if(forgeCost<=available){
          const enhanced={...cur,stats:{...cur.stats}};this.applyEquipmentUpgrade(enhanced,(cur.upgrade||0)+1);
          const benefit=this.equipmentValueFor(soldier,enhanced,key)/Math.max(1,value)-1;
          if(benefit>=ARMAMENT_LIMITS.forgeMinGain&&(!best||benefit/forgeCost>best.efficiency))best={key,item:enhanced,cost:forgeCost,efficiency:benefit/forgeCost,kind:'forge'};
        }
      }
      if(!best)continue;
      if(best.cost>personalEquipmentBudget(soldier))continue;
      soldier.gold-=best.cost;
      soldier.lastEquipmentPurchase.spent+=best.cost;soldier.lastEquipmentPurchase[best.kind==='replace'?'updated':'forged']++;
      const old=soldier.equipped[best.key];
      if(best.kind==='replace'){(this.sharedEquipBox||=[]).push(old);best.item.selfFunded=true;soldier.equipped[best.key]=best.item;updated++;}
      else{this.applyEquipmentUpgrade(old,best.item.upgrade);forged++;forgeSpent+=best.cost;}
      if(best.key==='weapon')soldier.weapon=soldier.equipped.weapon;
      spent+=best.cost;this.recalcSoldierStats(soldier);
    }
    this.treasury=(this.treasury||0)-publicSpent;
    if(!this.phaseFiscal)this.beginPhaseFiscal();
    this.phaseFiscal.equipmentProcurement=(this.phaseFiscal.equipmentProcurement||0)+publicSpent;
    this.phaseFiscal.publicEquipmentIssued=(this.phaseFiscal.publicEquipmentIssued||0)+publicIssued;
    this.phaseFiscal.personalEquipmentProcurement=(this.phaseFiscal.personalEquipmentProcurement||0)+spent-forgeSpent;
    this.phaseFiscal.personalForging=(this.phaseFiscal.personalForging||0)+forgeSpent;
    this.phaseFiscal.equipmentIssued=(this.phaseFiscal.equipmentIssued||0)+issued;
    this.phaseFiscal.equipmentUpdated=(this.phaseFiscal.equipmentUpdated||0)+updated;
    this.lastEquipmentSupply=a.last={phase,issued,spent,updated,forged,budget,publicIssued,publicSpent,funding:'personal'};
    this.processSharedEquipmentBox();
    return a.last;
  }
