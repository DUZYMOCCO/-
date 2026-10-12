import {normalizeArmament,ARMAMENT_POLICIES,advanceResearch,researchCost,standardEquipmentCost,personalEquipmentBudget,RESERVE_ARMAMENT_COUNT,ARMAMENT_LIMITS} from './armament-rules.js?v=191';
import {tierDescription,MAX_EQUIPMENT_TIER} from './equipment-tiers.js?v=187';
import {WORLD_SIZE} from './world.js?v=198';
import {saleValue,isGodRollProtected} from './equipment-rules.js?v=189';
import {calcTreasuryGrossIncome,calcCommanderStipend,EQUIPMENT_SLOTS} from './economy-rules.js?v=192';
import {createPayrollPlan,commanderStipendQuote,PAYROLL_RULES} from './payroll-rules.js?v=195';
import {calcAllRankerBonuses} from './troop-rankings.js?v=187';
import {normalizeRegionalEconomy,recurringNationalIncome,economicState,advanceRegionalEconomy,automaticEconomicTarget,investEconomicProject} from './regional-economy.js?v=182';
import {drawSettlementQuarter} from './economic-visuals.js?v=198';
import {atFacility,HEADQUARTERS_FACILITIES} from './hq-facilities.js?v=201';
import {renderRegionalEconomy} from './economic-interface.js?v=182';
import {workshopFloorTier} from './crafting-rules.js?v=189';
import {normalizeCasino} from './casino-rules.js?v=201';
import {normalizeGuild,advanceGuildContracts} from './guild-contracts.js?v=201';

export const DEVELOPMENT_STAGES=[
  {name:'野営本陣',cost:0}, {name:'城塞と宿場',cost:6000},
  {name:'城下町',cost:18000}, {name:'交易都市',cost:45000},
  {name:'大城下町',cost:90000}, {name:'王都',cost:180000}
];
const amount=n=>Math.max(0,Math.floor(Number(n)||0));
const money=n=>amount(n).toLocaleString()+'G';
const center=WORLD_SIZE/2;
export function normalizeNation(data={}) {
  const investment=amount(data?.investment);
  const level=DEVELOPMENT_STAGES.filter(s=>investment>=s.cost).length-1,economy=normalizeRegionalEconomy(data?.economy);
  if(!data?.economy&&level>0){economy.regions.hq.level=level;for(const t of Object.values(economy.technology))t.level=Math.floor(level/2);}
  const armament=normalizeArmament(data?.armament);
  armament.techTier=Math.max(armament.techTier,workshopFloorTier(level));
  return {armament,investment,level,economy,casino:normalizeCasino(data?.casino,data?.casinoPhase,level),
    totalExports:amount(data?.totalExports),totalDonations:amount(data?.totalDonations),
    guild:normalizeGuild(data?.guild),
    guildPhase:amount(data?.guildPhase),casinoPhase:amount(data?.casinoPhase),smithPhase:amount(data?.smithPhase),lastCasino:String(data?.lastCasino||'')};
}
export const nationalPayrollPlan=game=>createPayrollPlan(game,calcAllRankerBonuses(game));
export const nationalPayroll=game=>nationalPayrollPlan(game).total;
export const nationalSalaryReserve=game=>Math.max(6000,Math.ceil((nationalPayroll(game)+commanderStipendQuote(game,game.phase||1)+(game.nation?.economy?.patrols||0)*18)*PAYROLL_RULES.reserveCycles));
export function publicEquipmentCap(game) {
  const nation=normalizeNation(game.nation),policy=ARMAMENT_POLICIES[nation.armament.policy];
  return Math.min(Math.max(0,(game.treasury||0)-nationalSalaryReserve(game)),policy.budget+nation.level*policy.perLevel+Math.floor(nationalPayroll(game)*PAYROLL_RULES.operatingMargin*policy.maintenanceShare));
}
export function developmentBudget(game) {
  const nation=normalizeNation(game.nation),available=Math.max(0,(game.treasury||0)-nationalSalaryReserve(game));
  return Math.floor(available*(ARMAMENT_POLICIES[nation.armament.policy]?.development||.25));
}
export function inHeadquarters(game,unit) {return !!unit&&!game.currentDungeon&&Math.hypot(unit.x-center,unit.y-center)<220;}
export function headquartersDamageMult(game,unit) {return inHeadquarters(game,unit)?1-(game.nation?.level||0)*.06:1;}
export function nationalIncome(game) {return recurringNationalIncome(game);}
export function fiscalTotals(l) {
  const receipts=(l?.income||0)+(l?.tradeRevenue||0)+(l?.donations||0)+(l?.surplusSales||0)+(l?.treasuryReturns||0)+(l?.facilityRevenue||0)+(l?.defenseRewards||0);
  const expenses=(l?.salariesPaid||0)+(l?.securityUpkeep||0)+(l?.commanderStipend||0)+(l?.distributed||0)+(l?.buyouts||0)+(l?.equipmentProcurement||0)+(l?.publicForging||0)+(l?.armamentResearch||0)+(l?.developmentSpent||0);
  return {receipts,expenses,net:receipts-expenses};
}
export const nationMethods={
  advanceArmamentResearch() {
    this.nation=normalizeNation(this.nation);
    const available=Math.max(0,(this.treasury||0)-nationalSalaryReserve(this));
    const spent=advanceResearch(this,available);this.treasury-=spent;
    this.phaseFiscal.armamentResearch=(this.phaseFiscal.armamentResearch||0)+spent;
    return spent;
  },
  supplyMissingEquipment() {
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
            soldier.gold-=cost;item.selfFunded=true;
            soldier.lastEquipmentPurchase.spent+=cost;soldier.lastEquipmentPurchase.issued++;
            spent+=cost;issued++;
          }else{
            // A broke soldier still gets the cheapest piece for an empty slot, paid by the treasury above the payroll reserve.
            if(publicSpent+lowCost>publicCap)continue;
            item=this.createSupplyEquipment(type,soldier,1);item.publicIssue=true;
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
  },
  investNation() {
    this.nation=normalizeNation(this.nation);const previous=this.nation.level;
    const budget=developmentBudget(this);
    if(budget<=0)return 0;
    if(!this.phaseFiscal)this.beginPhaseFiscal();
    const target=automaticEconomicTarget(this),spent=investEconomicProject(this,target.kind,target.id,budget,'treasury',Math.max(0,(this.treasury||0)-nationalSalaryReserve(this)),nationalSalaryReserve);
    this.nation=normalizeNation(this.nation);
    if(this.nation.level>previous)this.showToast(`国家発展：${DEVELOPMENT_STAGES[this.nation.level].name}！本陣の防衛力と町の施設が向上しました`);
    return spent;
  },
  depositNationalEquipment(ids) {
    const held=new Set(Object.values(this.equipped||{}).filter(Boolean).map(i=>i.id));
    for(const s of [...(this.squad||[]),...(this.reserves||[])])for(const i of Object.values(s.equipped||{}))if(i)held.add(i.id);
    const wanted=new Set(ids),items=(this.inventory||[]).filter(i=>wanted.has(i.id)&&!held.has(i.id)&&!i.favorite&&!isGodRollProtected(i)&&saleValue(i)>0&&['WEAPON','ARMOR','HELMET','SHIELD','GLOVES','LEGS','AMULET'].includes(i.type));
    if(!items.length){this.showToast('バッグで納入する装備を選択してください。装備中・保護中の品は納入できません');return false;}
    const donated=new Set(items.map(i=>i.id));this.inventory=this.inventory.filter(i=>!donated.has(i.id));
    this.sharedEquipBox.push(...items);this.showToast(`装備${items.length}件を納入。次ウェーブに兵士へ支給し、余剰を外販します`);
    this.saveGame();this.renderStrategyUI();return true;
  },
  onNationKill(monster) {return advanceGuildContracts(this,monster);},
  useTownFacility(kind) {
    this.nation=normalizeNation(this.nation);const n=this.nation,phase=this.phase||1;
    if(kind!=='smith'||!atFacility(this,kind,1))return false;
    if(kind==='smith') {
      const item=this.equipped?.weapon;if(n.level<1||n.smithPhase===phase||!item)return false;
      const cost=Math.max(1,Math.floor(this.getUpgradeCost(item)*.8));if(this.gold<cost)return false;
      this.gold-=cost;n.smithPhase=phase;
      this.treasury=(this.treasury||0)+Math.floor(cost*.2);this.phaseFiscal.facilityRevenue=(this.phaseFiscal.facilityRevenue||0)+Math.floor(cost*.2);
      this.upgradeItem(item,true);this.showToast(`鍛冶工房：隊長の武器を2割引で強化（${money(cost)}）。今ウェーブは利用済み`);
    } else return false;
    this.saveGame();this.updateStatsUI();this.renderStrategyUI();return true;
  },
  renderNationStatus() {
    this.nation=normalizeNation(this.nation);const n=this.nation,plan=nationalPayrollPlan(this),payroll=plan.total,count=plan.entries.length,gross=nationalIncome(this,this.phase||1,count,plan),stipend=calcCommanderStipend(this.phase||1,gross,this);
    const panel=this.container?.querySelector('#nation-status');if(!panel)return;
    const next=DEVELOPMENT_STAGES[n.level+1],current=this.phaseFiscal||{},totals=fiscalTotals(current),investmentBudget=developmentBudget(this);
    panel.innerHTML=`<h4>国家の財政状態</h4><p class="${(this.treasury||0)>=payroll?'positive':'negative'}">${(this.treasury||0)>=payroll?'給与原資を確保しています':'給与原資が不足しています。寄付・産業・交易の発展が必要です'}</p><div class="nation-metrics"><div><small>国庫残高</small><strong>${money(this.treasury)}</strong></div><div><small>次ウェーブの地域税収</small><strong>+${money(gross)}</strong></div><div><small>次の給与見込み · ${count}名</small><strong>−${money(payroll)}</strong></div><div><small>給与・指揮手当後</small><strong>${gross-stipend-payroll>=0?'+':'−'}${money(Math.abs(gross-stipend-payroll))}</strong></div></div><p>人口・産業・技術・治安に応じた地域税収と、到着した商隊の交易税で国を運営します。<br>通常給与${money(plan.regular)} / 栄誉手当${money(plan.ranker)} / 指揮手当${money(stipend)}。給与は国の収入から配分します。</p><p>今ウェーブ：入金${money(totals.receipts)} / 支出${money(totals.expenses)}<br>寄付は国庫75%・兵士25%。余剰装備は通常売値の1.6倍で外販。</p><h4>${DEVELOPMENT_STAGES[n.level].name} · 発展Lv${n.level}</h4><progress max="${next?.cost||Math.max(180000,n.investment)}" value="${n.investment}"></progress><p>累計本陣開発${money(n.investment)}${next?` / 次は${next.name}（残り${money(next.cost-n.investment)}）`:' / 王都の設備改良を継続できます'}<br>本陣内の被ダメージ −${n.level*6}% · 回復 +${n.level*10}%</p><p>全給与・手当の2.5期分、最低6,000Gを残し、余裕資金の${Math.round(ARMAMENT_POLICIES[n.armament.policy].development*100)}%を重点事業へ投資します。</p><button type="button" data-nation="invest" ${investmentBudget<=0?'disabled':''}>重点事業へ ${money(investmentBudget)}</button>`;
    const missing=units=>units.filter(s=>s&&!s.dead).reduce((n,s)=>n+Object.values(EQUIPMENT_SLOTS).filter(key=>!s.equipped?.[key]).length,0);
    const last=this.lastFiscalReport||{};
    const a=n.armament,armed=(this.squad||[]).filter(s=>!s.dead),equippedAtStandard=armed.filter(s=>(s.equipped?.weapon?.tier||0)>=a.techTier).length,nextCost=researchCost(a.techTier+1);
    panel.insertAdjacentHTML('beforeend',`<h4>国家の軍備整備</h4><p><strong>製造技術：${tierDescription(a.techTier)}</strong><br>現行規格以上の主武器：${equippedAtStandard}/${armed.length}名（${armed.length?Math.round(equippedAtStandard/armed.length*100):0}%）<br>補充用の備蓄を含む共有箱：${this.sharedEquipBox?.length||0}件</p>${a.techTier<MAX_EQUIPMENT_TIER?`<progress max="${nextCost}" value="${Math.min(nextCost,a.research)}"></progress><p>次は${tierDescription(a.techTier+1)} · 開発${money(a.research)} / ${money(nextCost)}<br>街の発展と新しい戦利品で研究範囲が広がります。</p>`:'<p>全${MAX_EQUIPMENT_TIER}世代の製造技術を完成しました。</p>'}<div class="armament-policies">${Object.entries(ARMAMENT_POLICIES).map(([key,p])=>`<button type="button" data-armament-policy="${key}" aria-pressed="${a.policy===key}">${p.name}</button>`).join('')}</div><p>空き部位：出撃兵 ${missing(this.squad||[])} / 予備兵 ${missing(this.reserves||[])}<br>直近：共有支給${last.sharedEquipmentIssued||0}部位 / 国庫の空き部位支給${last.publicEquipmentIssued||0}部位 / 自費購入${last.equipmentIssued||0}部位 / 換装${last.equipmentUpdated||0}名 / 自費強化${a.last?.forged||0}回<br>国庫の空き部位支給${money(last.equipmentProcurement)} / 兵士の自費調達${money(last.personalEquipmentProcurement)} / 自費強化${money(last.personalForging)} / 国庫の技術開発${money(last.armamentResearch)}</p><p>工房レベルは製造可能ティアの解放条件です。装備の購入・換装・強化は各兵士の所持Gから支払い、6Gを残します。空き部位を自分で買えない兵士には、給与の積立を残し、軍備方針の支給枠（今期${money(publicEquipmentCap(this))}）の範囲で国庫が最安の装備を支給します。換装・強化は予算不足なら今の装備を維持。共有品は先に配ります。予備兵は次の補充${RESERVE_ARMAMENT_COUNT}名を優先整備。外した品は強化を保って共有箱へ戻します。</p>`);
    for(const button of panel.querySelectorAll('[data-armament-policy]'))button.onclick=()=>{this.nation.armament.policy=button.dataset.armamentPolicy;this.saveGame();this.renderStrategyUI();};
    panel.querySelector('[data-nation="invest"]').onclick=()=>{this.investNation();this.saveGame();this.renderStrategyUI();this.updateStatsUI();};
    renderRegionalEconomy(this,panel,nationalSalaryReserve);
    const facilities=this.container.querySelector('#nation-facilities');
    facilities.innerHTML=`<h4>本陣の施設</h4><p>本陣の建物の入口に近づくと利用できます。鍛冶工房は北西、冒険者組合は北東、カジノは南東です。</p>${HEADQUARTERS_FACILITIES.map(p=>`<p><strong>${p.name}</strong> · ${n.level>=p.level?'営業中':`本陣発展Lv${p.level}で営業`}</p>`).join('')}`;
  }
};

/** Shared evolving architecture for the headquarters and settlement interiors. */
export function drawNationalDevelopment(ctx,game,x,y,town=false) {
  const id=town&&game.currentDungeon?.id!=='royal_castle_town'?game.currentDungeon?.id||'hq':'hq';
  drawSettlementQuarter(ctx,game,x,y,id,town);
}
