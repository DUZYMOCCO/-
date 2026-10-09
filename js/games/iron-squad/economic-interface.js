import {ECONOMIC_REGIONS,PUBLIC_WORKS,CIVIL_TECH,INDUSTRIES,economicState,regionalTaxQuote,localProduction,regionDevelopmentCost,civilTechCost,economicInvestmentQuote,investEconomicProject,automaticEconomicTarget,ECONOMIC_RULES} from './regional-economy.js?v=134';
const gold=n=>Math.floor(Math.max(0,n||0)).toLocaleString()+'G';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderRegionalEconomy(game,panel,reserveQuote) {
  const e=economicState(game),tax=regionalTaxQuote(e),connected=new Set(e.routes.map(r=>r.to)),target=automaticEconomicTarget(game);
  const spending=Math.max(0,(game.treasury||0)-reserveQuote(game));
  const controls=(kind,id,disabled=false)=>`<div class="economic-actions"><button data-economic-kind="${kind}" data-economic-id="${id}" data-economic-source="treasury" ${disabled||spending<=0?'disabled':''}>国庫から投資</button><button data-economic-kind="${kind}" data-economic-id="${id}" data-economic-source="personal" ${disabled||!(game.gold>0)?'disabled':''}>軍資金で投資</button><button data-economic-priority="${kind}" data-economic-id="${id}" ${disabled?'disabled':''}>重点事業にする</button></div>`;
  const regions=ECONOMIC_REGIONS.filter(d=>e.regions[d.id].discovered);
  const markup=`<section id="regional-economy-panel" class="regional-economy-panel">
    <h4>領土・産業・交易</h4><p>発見済み${regions.length}地域 · 交易路${e.routes.length}本 · 往来${e.traffic.length}人<br>到着した商隊${e.shipments}隊 / 積荷喪失${e.losses}隊</p>
    <div class="nation-metrics"><div><small>地域の定期税収</small><strong>${gold(tax.total)}</strong></div><div><small>前期の交易税</small><strong>${gold(e.lastTrade)}</strong></div><div><small>今期の交易税</small><strong>${gold(e.phaseTrade)}</strong></div><div><small>街道巡回隊</small><strong>${e.patrols}隊 · ${gold(e.patrols*ECONOMIC_RULES.patrolCost)}/期</strong></div></div>
    <p>生産・人口・治安と、通行できる発見済み経路から収入が生まれます。商隊が到着すると交易税を納めます。給与と栄誉手当は国の収入に応じて配分され、装備強化は兵士が貯金して行います。</p>
    <label class="economic-amount">投資額 <input id="economic-investment-amount" type="number" min="1" step="100" value="${Math.max(1,game.economicInvestmentAmount||1000)}" inputmode="numeric"> G</label>
    <p>国庫で使える余裕資金 ${gold(spending)} / 軍資金 ${gold(game.gold)}<br>国の重点事業：${escape(economicInvestmentQuote(game,target.kind,target.id)?.name||'工事の完成待ち')} <button data-economic-auto>国家に任せる</button></p>
    <details open><summary>地域の暮らしと国家任務</summary><div class="economic-cards">${regions.map(d=>{const r=e.regions[d.id],linked=d.id==='hq'||connected.has(d.id),income=tax.breakdown.find(t=>t.id===d.id)?.tax||0,needed=regionDevelopmentCost(r),constructing=r.investment>=needed;
      return `<article class="economic-card"><h5>${escape(d.name)} · ${INDUSTRIES[d.industry]} · Lv${r.level}</h5><p>${!r.liberated?'未解放 · 現地の敵を倒し、残宝を回収して解放':linked?'本陣と接続 · 交易中':'本陣への通行経路を探索すると交易開始'}<br>人口 ${Math.floor(r.population)} / 地域の蓄え ${gold(r.wealth)}<br>生産 ${gold(localProduction(e,d.id))}/期 · 国税 ${gold(income)}/期<br>治安 ${Math.round(r.safety*100)}% · 商隊到着${r.delivered} / 損失${r.lost}</p>
      ${d.id!=='hq'?`<p class="economic-mission">街道掃討 ${Math.min(12,r.kills)}/12 ${r.missionPaid?'· 達成済み':'· 周辺の敵を討伐すると治安改善と国庫報酬'}</p>`:''}
      <progress max="${needed}" value="${r.investment}"></progress><p>${constructing?`施設工事中 ${Math.floor(r.work/ECONOMIC_RULES.constructionSeconds*100)}%`:`復興・増設 ${gold(r.investment)} / ${gold(needed)}`}</p>${controls('region',d.id,!r.liberated||constructing)}</article>`;}).join('')}</div></details>
    <details><summary>技術革新</summary><div class="economic-cards">${Object.entries(CIVIL_TECH).map(([key,d])=>{const t=e.technology[key],cost=civilTechCost(key,t.level);return `<article class="economic-card"><h5>${d.name} Lv${t.level}</h5><p>${d.stages[Math.min(t.level,d.stages.length-1)]}${t.level>=d.stages.length?' · 設備の改良継続':''}<br>${key==='production'?'各地の生産性と工房が向上':key==='transport'?'往来の移動速度と街道の舗装が向上':'人口受入と街の建築・生活設備が向上'}</p><progress max="${cost}" value="${t.investment}"></progress><p>${gold(t.investment)} / ${gold(cost)}</p>${controls('technology',key)}</article>`;}).join('')}</div></details>
    <details><summary>各地の投資案件</summary><div class="economic-cards">${PUBLIC_WORKS.filter(d=>e.projects[d.id].discovered).map(d=>{const p=e.projects[d.id],constructing=p.funded>=d.cost&&!p.done;return `<article class="economic-card"><h5>${escape(d.name)}</h5><p>${d.benefit}<br>${escape(ECONOMIC_REGIONS.find(r=>r.id===d.region).name)}の生産 +${Math.round(d.gain*100)}%</p><progress max="${d.cost}" value="${p.funded}"></progress><p>${p.done?'完成・稼働中':constructing?`工事中 ${Math.floor(p.work/ECONOMIC_RULES.constructionSeconds*100)}%`:`${gold(p.funded)} / ${gold(d.cost)}`}</p>${controls('project',d.id,p.done||constructing)}</article>`;}).join('')||'<p>探索すると橋・埋め立て・街道の投資案件が見つかります。</p>'}</div></details>
    <details><summary>街道の護衛と巡回</summary><p>巡回隊を増設すると商隊に護衛が付き、治安の回復と襲撃の抑制が進みます。維持費は国庫から支払います。</p><p>次の巡回隊 ${gold(1500*(e.patrols+1))} · 最大6隊</p>${controls('patrol','roads',e.patrols>=6)}</details>
  </section>`;
  const old=panel.querySelector('#regional-economy-panel');if(old)old.remove();panel.insertAdjacentHTML('beforeend',markup);
  const root=panel.querySelector('#regional-economy-panel');
  const amount=root.querySelector('#economic-investment-amount');amount.onchange=()=>{game.economicInvestmentAmount=Math.max(1,Math.floor(Number(amount.value)||1000));};
  for(const b of root.querySelectorAll('[data-economic-kind]'))b.onclick=()=>{
    game.economicInvestmentAmount=Math.max(1,Math.floor(Number(amount.value)||1000));
    const spent=investEconomicProject(game,b.dataset.economicKind,b.dataset.economicId,game.economicInvestmentAmount,b.dataset.economicSource,Math.max(0,(game.treasury||0)-reserveQuote(game)),reserveQuote);
    if(!spent)game.showToast?.('投資できる資金が不足しています。巡回隊は必要額を一括で支払います');
    game.saveGame();game.updateStatsUI();game.renderStrategyUI();
  };
  for(const b of root.querySelectorAll('[data-economic-priority]'))b.onclick=()=>{economicState(game).priority={kind:b.dataset.economicPriority,id:b.dataset.economicId};game.saveGame();game.renderStrategyUI();};
  root.querySelector('[data-economic-auto]').onclick=()=>{economicState(game).priority={kind:'auto',id:'hq'};game.saveGame();game.renderStrategyUI();};
}
