import {normalizeArmament,ARMAMENT_POLICIES,advanceResearch,researchCost,standardEquipmentCost,RESERVE_ARMAMENT_COUNT,ARMAMENT_LIMITS} from './armament-rules.js?v=138';
import {tierDescription,MAX_EQUIPMENT_TIER} from './equipment-tiers.js?v=138';
import {WORLD_SIZE} from './world.js?v=138';
import {saleValue,isGodRollProtected} from './equipment-rules.js?v=138';
import {calcTreasuryGrossIncome,calcCommanderStipend,EQUIPMENT_SLOTS} from './economy-rules.js?v=138';
import {createPayrollPlan,commanderStipendQuote,PAYROLL_RULES} from './payroll-rules.js?v=138';
import {calcAllRankerBonuses} from './troop-rankings.js?v=138';
import {normalizeRegionalEconomy,recurringNationalIncome,economicState,advanceRegionalEconomy,automaticEconomicTarget,investEconomicProject} from './regional-economy.js?v=138';
import {drawSettlementQuarter} from './economic-visuals.js?v=138';
import {renderRegionalEconomy} from './economic-interface.js?v=138';

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
  return {armament:normalizeArmament(data?.armament),investment,level,economy,
    totalExports:amount(data?.totalExports),totalDonations:amount(data?.totalDonations),
    guild:data?.guild?{kills:Math.min(20,amount(data.guild.kills)),target:20,reward:amount(data.guild.reward)||800}:null,
    guildPhase:amount(data?.guildPhase),casinoPhase:amount(data?.casinoPhase),smithPhase:amount(data?.smithPhase),lastCasino:String(data?.lastCasino||'')};
}
export const nationalPayrollPlan=game=>createPayrollPlan(game,calcAllRankerBonuses(game));
export const nationalPayroll=game=>nationalPayrollPlan(game).total;
export const nationalSalaryReserve=game=>Math.max(6000,Math.ceil((nationalPayroll(game)+commanderStipendQuote(game,game.phase||1)+(game.nation?.economy?.patrols||0)*18)*PAYROLL_RULES.reserveCycles));
function reserveAfterEquipment(game,soldier,key,item) {
  const trial={...soldier,equipped:{...soldier.equipped,[key]:item}};
  if(key==='weapon')trial.weapon=item;
  game.recalcSoldierStats(trial);
  const replace=units=>(units||[]).map(s=>s===soldier?trial:s);
  return nationalSalaryReserve({...game,squad:replace(game.squad),reserves:replace(game.reserves)});
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
    const available=Math.max(0,(this.treasury||0)-nationalSalaryReserve(this)),policy=ARMAMENT_POLICIES[a.policy];
    const budget=Math.min(available,policy.budget+this.nation.level*policy.perLevel+Math.floor(nationalPayroll(this)*PAYROLL_RULES.operatingMargin*policy.maintenanceShare));
    let spent=0,issued=0,updated=0,forged=0,forgeSpent=0;
    const slots=Object.entries(EQUIPMENT_SLOTS),missing=s=>slots.filter(([,key])=>!s.equipped?.[key]).length;
    const deployed=(this.squad||[]).filter(s=>s&&!s.dead),reserves=(this.reserves||[]).filter(s=>s&&!s.dead).slice(0,RESERVE_ARMAMENT_COUNT);
    for(const group of [deployed,reserves]) {
      const recipients=group.filter(s=>missing(s)).sort((a,b)=>missing(b)-missing(a));
      let progress=true;
      while(progress){progress=false;
        for(const soldier of recipients){
          const next=slots.find(([,key])=>!soldier.equipped?.[key]);if(!next)continue;
          const [type,key]=next;let item,cost;
          for(let tier=a.techTier;tier>=1;tier--){item=this.createSupplyEquipment(type,soldier,tier);cost=standardEquipmentCost(item);if(spent+cost<=budget)break;}
          if(spent+cost>budget)continue;
          if(this.treasury-spent-cost<reserveAfterEquipment(this,soldier,key,item))continue;
          soldier.equipped||={};soldier.equipped[key]=item;if(key==='weapon')soldier.weapon=item;
          this.recalcSoldierStats(soldier);spent+=cost;issued++;progress=true;
        }
      }
    }
    // One paid improvement per actor, at most eight actors per wave. Keep the old piece intact.
    const ordered=[...deployed].sort((x,y)=>this.equipmentValueFor(x,x.equipped?.weapon,'weapon')-this.equipmentValueFor(y,y.equipped?.weapon,'weapon'));
    for(const soldier of ordered){
      if(updated+forged>=ARMAMENT_LIMITS.improvementsPerWave)break;let best=null;
      for(const [type,key] of slots){
        const cur=soldier.equipped?.[key];if(!cur||cur.favorite||isGodRollProtected(cur))continue;
        const value=this.equipmentValueFor(soldier,cur,key);
        const item=this.createSupplyEquipment(type,soldier,a.techTier),cost=standardEquipmentCost(item),next=this.equipmentValueFor(soldier,item,key);
        const gain=next/Math.max(1,value)-1;
        if(gain>=ARMAMENT_LIMITS.replacementMinGain&&spent+cost<=budget&&(!best||gain/cost>best.efficiency))best={key,item,cost,efficiency:gain/cost,kind:'replace'};
        if(!soldier.isDown){
          const enhanced={...cur,stats:{...cur.stats}},forgeCost=this.getUpgradeCost(cur);this.applyEquipmentUpgrade(enhanced,(cur.upgrade||0)+1);
          const benefit=this.equipmentValueFor(soldier,enhanced,key)/Math.max(1,value)-1;
          if(benefit>=ARMAMENT_LIMITS.forgeMinGain&&spent+forgeCost<=budget&&(!best||benefit/forgeCost>best.efficiency))best={key,item:enhanced,cost:forgeCost,efficiency:benefit/forgeCost,kind:'forge'};
        }
      }
      if(!best)continue;
      if(this.treasury-spent-best.cost<reserveAfterEquipment(this,soldier,best.key,best.item))continue;
      const old=soldier.equipped[best.key];
      if(best.kind==='replace'){(this.sharedEquipBox||=[]).push(old);soldier.equipped[best.key]=best.item;updated++;}
      else{this.applyEquipmentUpgrade(old,best.item.upgrade);forged++;forgeSpent+=best.cost;}
      if(best.key==='weapon')soldier.weapon=soldier.equipped.weapon;
      spent+=best.cost;this.recalcSoldierStats(soldier);
    }
    this.treasury-=spent;
    if(!this.phaseFiscal)this.beginPhaseFiscal();
    this.phaseFiscal.equipmentProcurement=(this.phaseFiscal.equipmentProcurement||0)+spent-forgeSpent;
    this.phaseFiscal.publicForging=(this.phaseFiscal.publicForging||0)+forgeSpent;
    this.phaseFiscal.equipmentIssued=(this.phaseFiscal.equipmentIssued||0)+issued;
    this.phaseFiscal.equipmentUpdated=(this.phaseFiscal.equipmentUpdated||0)+updated;
    this.lastEquipmentSupply=a.last={phase,issued,spent,updated,forged,budget};
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
  onNationKill() {if(this.nation?.guild)this.nation.guild.kills=Math.min(20,this.nation.guild.kills+1);},
  useTownFacility(kind) {
    this.nation=normalizeNation(this.nation);const n=this.nation,phase=this.phase||1;
    if(this.currentDungeon?.kind!=='town')return false;
    if(kind==='smith') {
      const item=this.equipped?.weapon;if(n.level<1||n.smithPhase===phase||!item)return false;
      const cost=Math.max(1,Math.floor(this.getUpgradeCost(item)*.8));if(this.gold<cost)return false;
      this.gold-=cost;n.smithPhase=phase;
      this.treasury=(this.treasury||0)+Math.floor(cost*.2);this.phaseFiscal.facilityRevenue=(this.phaseFiscal.facilityRevenue||0)+Math.floor(cost*.2);
      this.upgradeItem(item,true);this.showToast(`鍛冶工房：隊長の武器を2割引で強化（${money(cost)}）。今ウェーブは利用済み`);
    } else if(kind==='guild') {
      if(n.level<2)return false;
      if(n.guild) {if(n.guild.kills<20)return false;this.gold+=n.guild.reward;this.showToast(`組合依頼を達成！報酬${money(n.guild.reward)}`);n.guild=null;}
      else {if(n.guildPhase===phase)return false;n.guildPhase=phase;n.guild={kills:0,target:20,reward:600+n.level*200};this.showToast('冒険者組合：部隊で敵20体を討伐し、町へ戻って報酬を受け取ろう');}
    } else if(kind==='casino') {
      if(n.level<4||n.casinoPhase===phase||this.gold<100)return false;
      this.gold-=100;n.casinoPhase=phase;const roll=1+Math.floor(Math.random()*6),win=roll>=5,payout=win?250:0;this.gold+=payout;
      // The house reserves winnings; do not turn individual bets into guaranteed national profit.
      n.lastCasino=`出目${roll}：${win?'当たり +150G':'はずれ −100G'}`;this.showToast(`カジノ・一振り勝負：${n.lastCasino}`);
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
    panel.insertAdjacentHTML('beforeend',`<h4>国家の軍備整備</h4><p><strong>製造技術：${tierDescription(a.techTier)}</strong><br>現行規格以上の主武器：${equippedAtStandard}/${armed.length}名（${armed.length?Math.round(equippedAtStandard/armed.length*100):0}%）<br>補充用の備蓄を含む共有箱：${this.sharedEquipBox?.length||0}件</p>${a.techTier<MAX_EQUIPMENT_TIER?`<progress max="${nextCost}" value="${Math.min(nextCost,a.research)}"></progress><p>次は${tierDescription(a.techTier+1)} · 開発${money(a.research)} / ${money(nextCost)}<br>街の発展と新しい戦利品で研究範囲が広がります。</p>`:'<p>全${MAX_EQUIPMENT_TIER}世代の製造技術を完成しました。</p>'}<div class="armament-policies">${Object.entries(ARMAMENT_POLICIES).map(([key,p])=>`<button type="button" data-armament-policy="${key}" aria-pressed="${a.policy===key}">${p.name}</button>`).join('')}</div><p>空き部位：出撃兵 ${missing(this.squad||[])} / 予備兵 ${missing(this.reserves||[])}<br>直近：共有支給${last.sharedEquipmentIssued||0}部位 / 不足補給${last.equipmentIssued||0}部位 / 換装${last.equipmentUpdated||0}名 / 公費強化${a.last?.forged||0}回<br>調達${money(last.equipmentProcurement)} / 強化${money(last.publicForging)} / 技術開発${money(last.armamentResearch)}</p><p>共有品を先に配り、全給与・手当の2.5期分、最低6,000Gを確保して不足補給・換装・強化を進めます。予備兵は次の補充${RESERVE_ARMAMENT_COUNT}名を優先整備。外した品は強化を保って共有箱へ戻します。</p>`);
    for(const button of panel.querySelectorAll('[data-armament-policy]'))button.onclick=()=>{this.nation.armament.policy=button.dataset.armamentPolicy;this.saveGame();this.renderStrategyUI();};
    panel.querySelector('[data-nation="invest"]').onclick=()=>{this.investNation();this.saveGame();this.renderStrategyUI();this.updateStatsUI();};
    renderRegionalEconomy(this,panel,nationalSalaryReserve);
    const facilities=this.container.querySelector('#nation-facilities'),town=this.currentDungeon?.kind==='town';
    const smith=this.equipped?.weapon,smithCost=smith?Math.max(1,Math.floor(this.getUpgradeCost(smith)*.8)):0;
    facilities.innerHTML=`<h4>城下町の施設</h4><p>${town?'町に滞在中。施設を利用できます。':'本陣の南東に城下町入口があります。町に入ると施設を利用できます。'}</p><div class="town-facility"><strong>鍛冶工房 · Lv1</strong><p>隊長武器の強化が2割引。1ウェーブ1回。${smith?money(smithCost):'武器装備が必要'}${n.smithPhase===this.phase?' / 利用済み':''}</p><button data-facility="smith" ${!town||n.level<1||!smith||n.smithPhase===this.phase||this.gold<smithCost?'disabled':''}>工房で強化</button></div><div class="town-facility"><strong>冒険者組合 · Lv2</strong><p>${n.guild?`討伐 ${n.guild.kills}/20 · 報酬${money(n.guild.reward)}`:'部隊で20体を討伐する依頼。1ウェーブ1件。'}</p><button data-facility="guild" ${!town||n.level<2||(n.guild?n.guild.kills<20:n.guildPhase===this.phase)?'disabled':''}>${n.guild?'報酬を受け取る':'依頼を受ける'}</button></div><div class="town-facility"><strong>カジノ · Lv4</strong><p>100Gの一振り勝負。5・6で250G受取。1ウェーブ1回。${n.lastCasino}</p><button data-facility="casino" ${!town||n.level<4||n.casinoPhase===this.phase||this.gold<100?'disabled':''}>100Gで遊ぶ</button></div>`;
    for(const b of facilities.querySelectorAll('[data-facility]'))b.onclick=()=>this.useTownFacility(b.dataset.facility);
  }
};

/** Shared evolving architecture for the headquarters and settlement interiors. */
export function drawNationalDevelopment(ctx,game,x,y,town=false) {
  const id=town&&game.currentDungeon?.id!=='royal_castle_town'?game.currentDungeon?.id||'hq':'hq';
  drawSettlementQuarter(ctx,game,x,y,id,town);
}
