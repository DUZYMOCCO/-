// Menu routes are presentation state only; they are never included in a save.
export const NATION_GROUPS = {
  finance: { label: '財政・開発', pages: [['treasury','国庫・寄付'],['fiscal','収支報告'],['development','本陣開発'],['facilities','施設']] },
  territory: { label: '領土・交易', pages: [['regions','地域'],['technology','技術'],['projects','建設'],['patrols','街道巡回']] },
  army: { label: '軍備・防衛', pages: [['armament','軍備'],['shared','共有装備'],['defense','本陣防衛']] },
  operations: { label: '軍令', pages: [['quest','軍令']] } // v7.1.13: 小隊遠征 moved to 部隊
};

export function configureCommandNavigation(game) {
  const root=game.container, get=id=>root.querySelector(`#${id}`), nation=get('view-strat-nation');
  nation.querySelector('.hub-intro').remove();
  const home=document.createElement('nav');home.id='nation-home';home.className='nation-category-grid';home.setAttribute('aria-label','国家の大分類');
  for(const [key,group] of Object.entries(NATION_GROUPS)) {
    const button=document.createElement('button');button.type='button';button.dataset.nationGroup=key;
    button.innerHTML=`<strong>${group.label}</strong><small>${group.pages.map(p=>p[1]).join('・')}</small>`;
    button.onclick=()=>game._openNationPage(key);home.append(button);
  }
  const nav=document.createElement('nav');nav.id='nation-page-tabs';nav.className='nation-page-tabs hidden';nav.setAttribute('aria-label','国家の項目');
  const crumb=document.createElement('p');crumb.id='nation-path';crumb.className='nation-path hidden';
  nation.prepend(home,nav,crumb);
  game._nationRoute={group:null,page:null};
  game._openNationPage=(group,page)=>{
    const definition=NATION_GROUPS[group];
    if(!definition||!definition.pages.some(p=>p[0]===(page||definition.pages[0][0])))return;
    game._nationRoute={group,page:page||definition.pages[0][0]};
    game._selectStratTab('nation');game._refreshCommandNavigation();
    get('strategy-modal').querySelector('.dialog-body').scrollTop=0;
    get('btn-strat-window-back').focus();
  };
  game._backCommandPage=()=>{
    if(!get('view-strat-nation').classList.contains('hidden')&&game._nationRoute.group) {
      game._nationRoute={group:null,page:null};game._refreshCommandNavigation();
      get('strategy-modal').querySelector('.dialog-body').scrollTop=0;
      home.querySelector('button').focus();return;
    }
    game._showStratLauncher(true);
  };
  game._refreshCommandNavigation=()=>{
    const {group,page}=game._nationRoute,definition=NATION_GROUPS[group];
    home.classList.toggle('hidden',!!definition);nav.classList.toggle('hidden',!definition);crumb.classList.toggle('hidden',!definition);
    if(nav.dataset.group!==(group||'')) {
      nav.replaceChildren();nav.dataset.group=group||'';
      for(const [key,label] of definition?.pages||[]) {
        const button=document.createElement('button');button.type='button';button.dataset.nationPage=key;button.textContent=label;
        button.onclick=()=>game._openNationPage(group,key);nav.append(button);
      }
    }
    for(const button of nav.children)button.setAttribute('aria-pressed',String(button.dataset.nationPage===page));
    crumb.textContent=definition?`国家 › ${definition.label}`:'';
    const visible=(node,show)=>node?.classList.toggle('hidden',!show);
    const nationActive=!nation.classList.contains('hidden');
    if(nationActive){get('strat-window-title').textContent=definition?.pages.find(p=>p[0]===page)?.[1]||'国家';get('btn-strat-window-back').textContent=definition?'‹ 国家へ':'‹ 戻る';}
    else get('btn-strat-window-back').textContent='‹ 戻る';
    visible(get('nation-status'),['treasury','development','armament','regions','technology','projects','patrols'].includes(page));
    for(const section of root.querySelectorAll('[data-nation-section]'))visible(section,section.dataset.nationSection===page);
    visible(get('view-econ-invest'),page==='treasury');
    visible(get('nation-finances'),page==='fiscal');visible(get('nation-facilities'),page==='facilities');
    visible(get('nation-shared-box'),page==='shared');visible(get('nation-defense'),page==='defense');
    visible(get('nation-quest-panel'),page==='quest');
    visible(get('regional-economy-panel'),group==='territory');
    for(const section of root.querySelectorAll('[data-economic-page]'))visible(section,section.dataset.economicPage===page);
  };
  const originalSelect=game._selectStratTab;
  game._selectStratTab=(name,open=true)=>{originalSelect(name,open);game._refreshCommandNavigation();};
  for(const button of root.querySelectorAll('.dialog-tabs .sub-tab-btn'))button.addEventListener('click',()=>game._refreshCommandNavigation());
  // The nation launcher always starts at its four categories; action redraws keep the current page.
  get('tab-strat-nation').addEventListener('click',()=>{game._nationRoute={group:null,page:null};game._refreshCommandNavigation();});
  const launcher=get('strategy-modal').querySelector('.dialog-tabs');
  const travel=document.createElement('button');travel.id='btn-fast-travel';travel.className='sub-tab-btn menu-travel';travel.type='button';travel.textContent='ファストトラベル';travel.onclick=()=>game.openWorldMap('travel');
  const map=get('btn-world-map');map.className='sub-tab-btn';map.textContent='地図';map.type='button';
  launcher.removeAttribute('style');launcher.prepend(travel);launcher.append(map);
  const settings=get('tab-strat-settings');if(settings)launcher.append(settings);
  game._refreshCommandNavigation();
}
