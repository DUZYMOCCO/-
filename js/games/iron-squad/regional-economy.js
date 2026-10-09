import {WORLD_SIZE,SETTLEMENTS,fieldBlocks} from './world.js?v=134';

const C=WORLD_SIZE/2;
export const ECONOMY_VERSION=4;
export const ECONOMIC_RULES={taxRate:.18,salaryShare:.55,honorShare:.12,patrolCost:18,constructionSeconds:45,trafficLimit:24};
export const INDUSTRIES={farm:'農業',mine:'採掘・精錬',trade:'宿泊・交易',industry:'加工・製造',capital:'本陣・商業'};
export const ECONOMIC_REGIONS=[
  {id:'hq',name:'本陣城下',x:C,y:C,industry:'capital',population:160,productivity:105,kind:'town'},
  ...SETTLEMENTS.map((s,i)=>({id:s.id,name:s.name,x:C+s.ox,y:C+s.oy,industry:s.id.includes('salt')||s.id.includes('iron')?'mine':s.id.includes('fort')||s.id.includes('keep')?'industry':'trade',population:s.kind==='town'?50+i*8:0,productivity:60+i*10,kind:s.kind})),
  {id:'river_farms',name:'川辺の農村',x:C+3400,y:C+2400,industry:'farm',population:45,productivity:75,kind:'village'},
  {id:'mountain_mine',name:'北山の鉱山村',x:C-680,y:C-6800,industry:'mine',population:35,productivity:110,kind:'village'}
];
export const PUBLIC_WORKS=[
  {id:'farm_bridge',name:'川辺の谷の架橋',kind:'bridge',x:C+2400,y:C+1700,w:370,h:110,angle:.68,cost:3600,region:'river_farms',benefit:'農村への近道・農産物の輸送',gain:.15},
  {id:'crossroads_fill',name:'十字路の窪地を埋め立て',kind:'landfill',x:C+1270,y:C+410,w:220,h:170,angle:0,cost:2800,region:'place_crossroads',benefit:'市場と倉庫の用地・人口受入',gain:.2},
  {id:'north_bridge',name:'北山の谷の架橋',kind:'bridge',x:C-460,y:C-6100,w:320,h:100,angle:-.6,cost:6400,region:'mountain_mine',benefit:'鉱石輸送の短縮・出荷拡大',gain:.25},
  {id:'north_road',name:'北関街道の復旧',kind:'road',x:C+100,y:C-11000,w:700,h:100,angle:Math.PI/2,cost:8000,region:'place_north_gate',benefit:'宿場への輸送・移動速度',gain:.25},
  {id:'salt_fill',name:'塩原の穴の埋め立て',kind:'landfill',x:C-330,y:C+22400,w:280,h:210,angle:0,cost:15000,region:'place_salt_village',benefit:'塩の作業場と倉庫',gain:.3},
  {id:'iron_road',name:'鉄嶺への石畳街道',kind:'road',x:C+32400,y:C+90,w:950,h:120,angle:0,cost:22000,region:'place_iron_ridge',benefit:'精錬品の輸送・交易拡大',gain:.35},
  {id:'west_bridge',name:'西の湿地の架橋',kind:'bridge',x:C-29000,y:C+260,w:380,h:110,angle:0,cost:26000,region:'place_west_keep',benefit:'西部の復興と加工品の流通',gain:.35},
  {id:'south_road',name:'南西の宿場への街道整備',kind:'road',x:C-24500,y:C+42400,w:800,h:120,angle:2.05,cost:34000,region:'place_last_inn',benefit:'遠方の宿場・旅人の往来',gain:.4}
];
export const CIVIL_TECH={production:{name:'生産技術',stages:['手作業','水車と大型炉','精錬工房','魔力炉','連動工房'],cost:5000},transport:{name:'道路・輸送技術',stages:['土の道','砂利道','石畳','排水と石橋','街道網'],cost:4000},urban:{name:'都市・生活技術',stages:['天幕と井戸','木造家屋','市場と倉庫','石造と排水路','街灯と広場'],cost:4500}};
const n=v=>Math.max(0,Number.isFinite(Number(v))?Number(v):0);
const integer=v=>Math.floor(n(v));
export const civilTechCost=(key,level)=>Math.ceil(CIVIL_TECH[key].cost*(1+n(level))**1.6);
export const regionDevelopmentCost=region=>Math.ceil((region.id==='hq'?3500:1800)*(1+n(region.level))**1.5);
export const regionDefinition=id=>ECONOMIC_REGIONS.find(r=>r.id===id);
export const workDefinition=id=>PUBLIC_WORKS.find(r=>r.id===id);

export function normalizeRegionalEconomy(data={}) {
  const regions={};
  for(const d of ECONOMIC_REGIONS){const old=data?.regions?.[d.id]||{};
    regions[d.id]={id:d.id,discovered:d.id==='hq'||!!old.discovered,liberated:d.kind!=='ruin'||!!old.liberated,
      population:n(old.population??d.population),wealth:n(old.wealth??300),level:integer(old.level),investment:n(old.investment),work:n(old.work),
      safety:Math.min(1,n(old.safety??(d.id==='hq'?1:.7))),prosperity:n(old.prosperity),delivered:integer(old.delivered),lost:integer(old.lost),kills:integer(old.kills),missionPaid:!!old.missionPaid};
  }
  const projects={};for(const d of PUBLIC_WORKS){const old=data?.projects?.[d.id]||{};projects[d.id]={discovered:!!old.discovered,funded:Math.min(d.cost,n(old.funded)),work:Math.min(ECONOMIC_RULES.constructionSeconds,n(old.work)),done:!!old.done};}
  const technology={};for(const key of Object.keys(CIVIL_TECH)){const old=data?.technology?.[key]||{};technology[key]={level:integer(old.level),investment:n(old.investment)};}
  const priority=data?.priority;
  return {version:ECONOMY_VERSION,regions,projects,technology,priority:priority&&['auto','region','project','technology','patrol'].includes(priority.kind)?{kind:priority.kind,id:String(priority.id||'hq')}:{kind:'auto',id:'hq'},
    patrols:Math.min(6,integer(data?.patrols)),lastPhase:integer(data?.lastPhase),lastTax:integer(data?.lastTax),lastTrade:integer(data?.lastTrade),phaseTrade:integer(data?.phaseTrade),
    shipments:integer(data?.shipments),losses:integer(data?.losses),sequence:integer(data?.sequence),spawnClock:n(data?.spawnClock),raidClock:n(data?.raidClock),
    routes:Array.isArray(data?.routes)?data.routes.filter(r=>regionDefinition(r.to)&&Array.isArray(r.points)&&r.points.length>=2).map(r=>({id:String(r.id),to:r.to,length:n(r.length),points:r.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[p[0],p[1]])})):[],
    traffic:Array.isArray(data?.traffic)?data.traffic.filter(a=>a&&a.hp>0&&!a.dead&&regionDefinition(a.region)).slice(0,ECONOMIC_RULES.trafficLimit).map(a=>({id:String(a.id),name:String(a.name),role:a.role==='guard'?'guard':a.role==='merchant'?'merchant':'traveler',region:a.region,routeId:String(a.routeId),x:n(a.x),y:n(a.y),hp:n(a.hp),maxHp:n(a.maxHp)||100,atk:n(a.atk),speed:n(a.speed)||100,progress:n(a.progress),cargo:n(a.cargo),outbound:!!a.outbound,party:String(a.party||a.id),attackClock:n(a.attackClock),points:Array.isArray(a.points)?a.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(p=>[...p]):null,routeLength:n(a.routeLength),isCommerce:true,isCommerceGuard:a.role==='guard'})):[],
    raiders:Array.isArray(data?.raiders)?data.raiders.filter(a=>a&&a.hp>0).slice(0,4).map(a=>Object.fromEntries(Object.entries(a).filter(([key])=>!key.startsWith('_')))):[],
    revision:integer(data?.revision)};
}
export function economicState(game) {
  if(!game.nation)game.nation={};
  if(game.nation.economy?.version!==ECONOMY_VERSION)game.nation.economy=normalizeRegionalEconomy(game.nation.economy);
  return game.nation.economy;
}
export function projectTerrain(economy) {
  return PUBLIC_WORKS.map(d=>{const c=Math.cos(d.angle||0),s=Math.sin(d.angle||0);return {...d,c,s,boundX:Math.abs(c)*d.w/2+Math.abs(s)*d.h/2,boundY:Math.abs(s)*d.w/2+Math.abs(c)*d.h/2,done:!!economy?.projects?.[d.id]?.done};});
}
export function localProduction(economy,id) {
  const d=regionDefinition(id),r=economy?.regions?.[id];if(!d||!r||!r.liberated||!r.discovered||d.kind==='ruin'&&r.level===0)return 0;
  const works=PUBLIC_WORKS.filter(p=>p.region===id&&economy.projects[p.id]?.done).reduce((v,p)=>v+p.gain,0);
  return Math.floor(r.population*d.productivity*(1+r.level*.2)*(1+(economy.technology.production?.level||0)*.14)*(1+works)*(.3+.7*r.safety));
}
export function regionalTaxQuote(economy) {
  const connected=new Set(['hq',...(economy?.routes||[]).map(r=>r.to)]),breakdown=[];
  for(const d of ECONOMIC_REGIONS){const r=economy?.regions?.[d.id];if(!r||!connected.has(d.id))continue;
    const tax=Math.floor(localProduction(economy,d.id)*ECONOMIC_RULES.taxRate);if(tax)breakdown.push({id:d.id,name:d.name,tax});
  }
  return {total:breakdown.reduce((s,r)=>s+r.tax,0),breakdown};
}
/** Sustainable public income; neither equipment prices, army strength nor elapsed phases create money. */
export function recurringNationalIncome(game) {
  const e=game.nation?.economy?.version===4?game.nation.economy:normalizeRegionalEconomy(game.nation?.economy);
  return regionalTaxQuote(e).total;
}
export function economicPayrollBudget(game) {
  const shares={balanced:.55,military:.62,development:.45};
  return Math.floor((recurringNationalIncome(game)+(game.nation?.economy?.lastTrade||0)*.5)*(shares[game.nation?.armament?.policy]||.55));
}
export const economicHonorBudget=game=>Math.floor((recurringNationalIncome(game)+(game.nation?.economy?.lastTrade||0)*.5)*ECONOMIC_RULES.honorShare);

export function discoverEconomicRegions(game) {
  const e=economicState(game);let changed=false;
  for(const d of ECONOMIC_REGIONS){const r=e.regions[d.id];
    if(!r.discovered&&game.fog?.isExploredWorld(d.x,d.y)){r.discovered=true;changed=true;game.showToast?.(`地域発見：${d.name} · ${INDUSTRIES[d.industry]}`);}
    const dungeon=game.dungeons?.find(s=>s.id===d.id);
    if(d.kind==='ruin'&&dungeon?.cleared&&!r.liberated){r.liberated=true;r.population=12;changed=true;game.showToast?.(`${d.name}を解放。復興への投資で生産を再開できます`);}
  }
  for(const d of PUBLIC_WORKS){const p=e.projects[d.id];if(!p.discovered&&game.fog?.isExploredWorld(d.x,d.y)){p.discovered=true;changed=true;}}
  if(changed)e.revision++;
  return changed;
}
export function tickEconomicConstruction(game,dt) {
  const e=economicState(game);if(!(dt>0))return;
  for(const d of PUBLIC_WORKS){const p=e.projects[d.id];if(p.done||p.funded<d.cost)continue;p.work+=dt;
    if(p.work>=ECONOMIC_RULES.constructionSeconds){p.work=ECONOMIC_RULES.constructionSeconds;p.done=true;e.revision++;game._tradeSearch=null;game.showToast?.(`工事完成：${d.name}！${d.benefit}`);}}
  for(const d of ECONOMIC_REGIONS){const r=e.regions[d.id];if(r.investment<regionDevelopmentCost(r))continue;r.work+=dt;
    if(r.work>=ECONOMIC_RULES.constructionSeconds){r.work=0;r.investment-=regionDevelopmentCost(r);r.level++;e.revision++;game.showToast?.(`${d.name}の施設が完成 · 地域Lv${r.level}`);}}
}
export function advanceRegionalEconomy(game,phase) {
  const e=economicState(game);if(e.lastPhase>=phase)return 0;discoverEconomicRegions(game);e.lastPhase=phase;
  e.lastTrade=e.phaseTrade;e.phaseTrade=0;
  for(const d of ECONOMIC_REGIONS){const r=e.regions[d.id];if(!r.discovered||!r.liberated)continue;
    const capacity=(d.population||20)+r.level*35+(e.technology.urban.level||0)*25;
    if(r.population<capacity)r.population=Math.min(capacity,r.population+Math.max(1,r.population*.02)*r.safety);
    const production=localProduction(e,d.id);r.wealth+=Math.floor(production*.06);r.prosperity+=production/10000;
    // Local savings pay for their own buildings; this never spends public gold.
    const cost=regionDevelopmentCost(r);if(d.id!=='hq'&&r.level>0&&r.wealth>=cost*2&&r.investment<cost){const spend=Math.min(cost-r.investment,Math.floor(r.wealth*.25));r.wealth-=spend;r.investment+=spend;}
    r.safety=Math.min(1,r.safety+.01+e.patrols*.006);
  }
  e.lastTax=regionalTaxQuote(e).total;
  const upkeep=e.patrols*ECONOMIC_RULES.patrolCost;
  const paid=Math.min(Math.max(0,game.treasury||0),upkeep);game.treasury-=paid;
  if(game.phaseFiscal)game.phaseFiscal.securityUpkeep=(game.phaseFiscal.securityUpkeep||0)+paid;
  if(paid<upkeep)for(const r of Object.values(e.regions))r.safety=Math.max(.1,r.safety-.03);
  return e.lastTax;
}
export function economicInvestmentQuote(game,kind,id) {
  const e=economicState(game);
  if(kind==='project'){const d=workDefinition(id),p=e.projects[id];return d&&p?.discovered&&!p.done?{needed:Math.max(0,d.cost-p.funded),name:d.name}:null;}
  if(kind==='technology'&&CIVIL_TECH[id])return {needed:Math.max(0,civilTechCost(id,e.technology[id].level)-e.technology[id].investment),name:CIVIL_TECH[id].name};
  if(kind==='patrol')return e.patrols<6?{needed:1500*(e.patrols+1),name:'街道巡回隊'}:null;
  const r=e.regions[id],d=regionDefinition(id);return r?.discovered&&r.liberated?{needed:Math.max(0,regionDevelopmentCost(r)-r.investment),name:`${d.name}の復興・施設整備`}:null;
}
export function investEconomicProject(game,kind,id,requested,source='treasury',publicAvailable=0,reserveQuote=null) {
  const q=economicInvestmentQuote(game,kind,id);if(!q||!q.needed)return 0;
  const available=source==='personal'?Math.max(0,game.gold||0):Math.max(0,publicAvailable);
  let spent=Math.min(integer(requested),integer(available),integer(q.needed));
  if(source==='treasury'&&reserveQuote&&spent>=q.needed){
    const trial=normalizeRegionalEconomy(game.nation.economy),nation={...game.nation,economy:trial};
    if(kind==='technology')trial.technology[id].level++;
    else if(kind==='patrol')trial.patrols++;
    else if(kind==='project')trial.projects[id].done=true;
    else {trial.regions[id].level++;if(id==='hq'){nation.investment=(nation.investment||0)+spent;nation.level=[0,6000,18000,45000,90000,180000].filter(v=>nation.investment>=v).length-1;}}
    spent=Math.min(spent,Math.max(0,(game.treasury||0)-reserveQuote({...game,nation})));
  }
  if(kind==='patrol'&&spent<q.needed)return 0;if(!spent)return 0;
  const e=economicState(game);
  if(source==='personal')game.gold-=spent;else game.treasury-=spent;
  if(source==='treasury'&&game.phaseFiscal)game.phaseFiscal.developmentSpent=(game.phaseFiscal.developmentSpent||0)+spent;
  if(kind==='project')e.projects[id].funded+=spent;
  else if(kind==='technology'){
    const t=e.technology[id];t.investment+=spent;const cost=civilTechCost(id,t.level);
    if(t.investment>=cost){t.investment-=cost;t.level++;e.revision++;game.showToast?.(`技術革新：${CIVIL_TECH[id].name} Lv${t.level}！`);}
  }else if(kind==='patrol'){e.patrols++;game.showToast?.(`街道巡回隊を増設 · ${e.patrols}隊`);}
  else {e.regions[id].investment+=spent;if(id==='hq')game.nation.investment=(game.nation.investment||0)+spent;}
  game.showToast?.(`${q.name}へ${spent.toLocaleString()}Gを投資${source==='personal'?'（隊長の軍資金）':''}`);
  return spent;
}
export function automaticEconomicTarget(game) {
  const e=economicState(game);if(e.priority.kind!=='auto')return e.priority;
  const hq=e.regions.hq;
  if(hq.level<1)return {kind:'region',id:'hq'};
  for(const key of ['production','transport','urban'])if(e.technology[key].level<Math.ceil(hq.level/2))return {kind:'technology',id:key};
  const restoring=ECONOMIC_REGIONS.find(d=>d.id!=='hq'&&e.regions[d.id].discovered&&e.regions[d.id].liberated&&e.regions[d.id].level===0);
  if(restoring)return {kind:'region',id:restoring.id};
  const work=PUBLIC_WORKS.find(d=>e.projects[d.id].discovered&&!e.projects[d.id].done&&e.projects[d.id].funded<d.cost);
  return work?{kind:'project',id:work.id}:{kind:'region',id:'hq'};
}
export function recordEconomicKill(game,monster,field=false) {
  if(!monster||game.currentDungeon&&!field)return;
  const e=economicState(game);
  for(const d of ECONOMIC_REGIONS){const r=e.regions[d.id];if(!r.discovered||d.id==='hq'||Math.hypot(d.x-monster.x,d.y-monster.y)>1800)continue;
    r.kills++;r.safety=Math.min(1,r.safety+.035);
    if(r.kills>=12&&!r.missionPaid){r.missionPaid=true;const reward=450+Math.round(Math.hypot(d.x-C,d.y-C)*.015);game.treasury=(game.treasury||0)+reward;
      if(game.phaseFiscal)game.phaseFiscal.defenseRewards=(game.phaseFiscal.defenseRewards||0)+reward;
      game.showToast?.(`国家任務：${d.name}周辺の掃討完了 · 国庫+${reward}G`);}
  }
}
export function economicFieldBlocked(game,x,y) {
  const e=game.nation?.economy;
  if(!e)return fieldBlocks(x,y);
  if(game._economicWorksRevision!==e.revision||!game._economicWorks){game._economicWorks=projectTerrain(e);game._economicWorksRevision=e.revision;}
  return fieldBlocks(x,y,game._economicWorks);
}
