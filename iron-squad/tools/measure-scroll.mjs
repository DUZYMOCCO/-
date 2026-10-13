// 各画面の縦スクロール量と主ボタンの初期表示を測る（UI改修の前後比較用）。
// 使い方: node iron-squad/tools/measure-scroll.mjs <root> <outDir>
//   <root> は iron-squad/ と common/ を含むディレクトリ。ゲームのコードは変更しない。
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {mkdirSync,writeFileSync,readFileSync,existsSync,statSync} from 'node:fs';
import {resolve,join,extname,normalize} from 'node:path';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const root=resolve(process.argv[2]||'.'),outDir=resolve(process.argv[3]||'scroll-out');mkdirSync(outDir,{recursive:true});
const MIME={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://x').pathname),file=normalize(join(root,p));
    if(!file.startsWith(root)||!existsSync(file)||statSync(file).isDirectory()){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'content-type':MIME[extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});res.end(readFileSync(file));
  }catch(e){res.writeHead(500);res.end(String(e));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;

const VIEWPORTS=[{width:390,height:844},{width:390,height:664},{width:844,height:390}];
const NATION=[['finance','treasury'],['finance','fiscal'],['finance','development'],['finance','facilities'],['territory','regions'],['territory','technology'],['territory','projects'],['territory','patrols'],['army','armament'],['army','shared'],['army','defense'],['operations','quest'],['operations','expedition']];
const STRAT_BACK=['#btn-strat-window-back','#btn-strat-window-close'];

// ---- ページ内ヘルパー（スクロール要素の検出と主ボタン判定） ----
const INSTALL=()=>{
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const label=el=>{
    if(el.id)return `#${el.id}`;
    const cls=[...el.classList].slice(0,2).map(c=>'.'+c).join('');
    const par=el.parentElement,pl=par?(par.id?`#${par.id}`:[...par.classList].slice(0,1).map(c=>'.'+c).join('')):'';
    return `${pl?pl+' > ':''}${el.tagName.toLowerCase()}${cls}`;
  };
  window.__scrollers=scopeSel=>{
    const scope=scopeSel?document.querySelector(scopeSel):null;
    const list=[];
    for(const el of document.querySelectorAll('body, body *')){
      const s=getComputedStyle(el);
      if(!['auto','scroll','overlay'].includes(s.overflowY))continue;
      const amount=el.scrollHeight-el.clientHeight;
      if(amount<=1||!visible(el))continue;
      if(scope&&!scope.contains(el))continue;
      list.push({el,sel:label(el),amount,client:el.clientHeight,scroll:el.scrollHeight});
    }
    const de=document.scrollingElement;
    if(de&&de.scrollHeight-de.clientHeight>1)list.unshift({el:de,sel:'document',amount:de.scrollHeight-de.clientHeight,client:de.clientHeight,scroll:de.scrollHeight});
    return list.map(a=>({sel:a.sel,amount:a.amount,client:a.client,scroll:a.scroll,nested:list.some(b=>b!==a&&b.el!==document.scrollingElement&&b.el.contains(a.el)),
      parentScroller:(list.find(b=>b!==a&&b.el!==document.scrollingElement&&b.el.contains(a.el))||{}).sel||null}));
  };
  window.__resetScroll=()=>{for(const el of document.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;window.scrollTo(0,0);};
  window.__buttons=sels=>sels.map(sel=>{
    const all=[...document.querySelectorAll(sel)],el=all.find(visible);
    if(!el)return {sel,found:false,inView:false};
    const r=el.getBoundingClientRect();
    return {sel,found:true,text:(el.textContent||'').trim().slice(0,20),inView:r.top>=-0.5&&r.bottom<=innerHeight+0.5&&r.left>=-0.5&&r.right<=innerWidth+0.5,top:Math.round(r.top),bottom:Math.round(r.bottom)};
  });
  window.__closeAll=()=>{
    const g=qualityGame;
    try{g.container.querySelector('#btn-world-map-close')&&!document.querySelector('#world-map-modal')?.classList.contains('hidden')&&document.querySelector('#btn-world-map-close').click();}catch(e){}
    try{g._merchantShopClose?.();}catch(e){}
    try{g.closeSoldierDetail?.();}catch(e){}
    try{g.closeHeadquartersFacility?.();}catch(e){}
    try{document.querySelector('#btn-tavern-close')?.click();}catch(e){}
    try{g.closeStrategyModal?.();}catch(e){}
  };
};

// ---- 状態作り（中盤〜終盤のセーブ相当） ----
const SEED=`(()=>{let a=20261014;window.__seed=n=>{a=n>>>0;};Math.random=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};})();`;
const SETUP=async()=>{
  window.__seed(777);const g=qualityGame;g.stopGameLoop();window.__closeAll();g.startFreshGame(false);g.stopGameLoop();
  g.currentDungeon=null;g.career.status='enlisted';g.restTimer=0;g.monsters=[];g.currentQuest=null;g.updateSpawns=()=>{};
  const mod=await import('/iron-squad/js/index.js');const {generateRandomDrop}=mod;
  g.gold=400000;g.treasury=300000;
  const slots=['weapon','shield','helmet','armor','gloves','legs','amulet'];
  const typeOf={weapon:'WEAPON',shield:'SHIELD',helmet:'HELMET',armor:'ARMOR',gloves:'GLOVES',legs:'LEGS',amulet:'AMULET'};
  const drop=(slot,tier,style)=>{const o={type:typeOf[slot],tier,random:Math.random};if(slot==='weapon'&&style)o.weaponStyle=style;try{return generateRandomDrop(0,'normal',o);}catch(e){return null;}};
  const classes=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'],styleOf={HEAVY:'sword',LIGHT:'spear',ARCHER:'bow',MEDIC:'wand',MAGE:'staff'};
  const squad=[],reserves=[];
  for(let i=0;i<46;i++){
    const cls=classes[i%5];
    const s=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',level:6+(i%20)});
    s.name=`${['ガレイン','ミラ','ヨウ','セレス','ブラックウッド'][i%5]}・テスト${i+1}`;
    s.isDown=false;s.dead=false;s.gold=100+i;
    if(i<8)s.isPersonalGuard=true;
    if(i<4)s.deathlineSkills=cls==='MEDIC'?['MIRACLE_PRAYER']:cls==='MAGE'||cls==='LIGHT'?['PHANTOM_STEP','SURVIVAL_INSTINCT']:cls==='ARCHER'?['DEADLY_FOCUS','SURVIVAL_INSTINCT']:['IRON_RESOLVE','SURVIVAL_INSTINCT','PHANTOM_STEP'];
    if(!s.equipped)s.equipped={};
    if(i%2===0||i<12)for(const sl of slots){const it=drop(sl,1+(i%8),sl==='weapon'?styleOf[cls]:null);if(it)s.equipped[sl]=it;}
    try{g.recalcSoldierStats(s);}catch(e){}
    (i<26?squad:reserves).push(s);
  }
  g.squad=squad;g.reserves=reserves;
  g.inventory=[];
  for(let i=0;i<36;i++){const it=drop(slots[i%7],1+(i%9),slots[i%7]==='weapon'?['sword','spear','bow','staff','hammer'][i%5]:null);if(it)g.inventory.push(it);}
  // 商人
  const m=g.merchants[0];m.dead=false;m.isDown=false;m.returningToBase=false;m.hp=m.maxHp||100;
  Object.assign(g.player,{x:m.x,y:m.y,hp:Math.max(1,Math.floor(g.player.maxHp/2)),isDown:false});
  g.squadPotion=0;g.revivalPotion=0;
  g.updateStatsUI(true);g.render();
  window.__qa={squadIds:squad.map(s=>s.id),reserveIds:reserves.map(s=>s.id),inv:g.inventory.length,personal:squad.filter(s=>s.isPersonalGuard).length,
    fullSlots:[...squad,...reserves].filter(s=>s.equipped&&slots.every(sl=>s.equipped[sl])).length,deathline:[...squad,...reserves].filter(s=>(s.deathlineSkills||[]).length>=2).length};
  return window.__qa;
};

const browser=await chromium.launch({channel:'chrome',headless:true});
const report={root,base,viewports:VIEWPORTS,setup:null,screens:[],pageErrors:[]};
try{
  const context=await browser.newContext({viewport:VIEWPORTS[0],deviceScaleFactor:1,serviceWorkers:'block'}),page=await context.newPage();
  let currentName='(load)';
  page.on('pageerror',e=>report.pageErrors.push({screen:currentName,message:e.message}));
  page.on('dialog',d=>d.accept());
  await context.addInitScript(SEED);
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady,null,{timeout:90000});
  await page.evaluate(INSTALL);

  // 1画面を測る。open は画面を開く関数（page.evaluate / page 操作）、buttons は主ボタンのセレクタ
  const measure=async(name,size,open,buttons,scope,note)=>{
    currentName=`${name} @${size}`;
    const rec={screen:name,size,scrollers:[],buttons:[],hOverflow:null,error:null,shot:null};
    const errBefore=report.pageErrors.length;
    try{
      await open();await page.waitForTimeout(150);
      await page.evaluate(()=>window.__resetScroll());await page.waitForTimeout(50);
      rec.scrollers=await page.evaluate(sc=>window.__scrollers(sc),scope||null);
      rec.buttons=await page.evaluate(sels=>window.__buttons(sels),buttons);
      rec.hOverflow=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,innerWidth}));
      const file=`${name.replace(/[^\w\u3040-\u30ff\u4e00-\u9fff-]+/g,'_')}-${size}.png`;
      await page.screenshot({path:join(outDir,file)});rec.shot=file;
    }catch(e){rec.error=String(e.message||e).split('\n')[0];}
    rec.pageErrors=report.pageErrors.slice(errBefore).map(e=>e.message);
    if(note)rec.note=note;
    report.screens.push(rec);
  };
  const ev=(fn,arg)=>()=>page.evaluate(fn,arg);
  const stratLauncher=()=>page.evaluate(()=>{const g=qualityGame;g.openStrategyModal(true);g._showStratLauncher?.(true);});
  const stratTab=(tab,sub)=>()=>page.evaluate(({tab,sub})=>{const g=qualityGame;g.openStrategyModal(true);if(sub)g.rosterManageTab=sub;g._selectStratTab(tab);if(sub)document.getElementById(`tab-econ-${sub}`)?.click();},{tab,sub});
  const tryClick=async sel=>{const l=page.locator(sel).first();if(await l.count()&&await l.isVisible())await l.click();else throw new Error('click対象なし: '+sel);};

  for(const vp of VIEWPORTS){
    const size=`${vp.width}x${vp.height}`;
    await page.setViewportSize(vp);
    const qa=await page.evaluate(SETUP);if(!report.setup)report.setup=qa;
    await page.evaluate(()=>{qualityGame.resizeCanvas?.();});

    await measure('01_メニュートップ',size,stratLauncher,['#btn-close-strat','#tab-strat-overview','#tab-strat-troops','#tab-strat-nation','#tab-strat-rankings','#tab-strat-report','#btn-fast-travel','#btn-world-map'],'#strategy-modal');
    await measure('02_戦況',size,stratTab('overview'),STRAT_BACK,'#strategy-modal');
    // 部隊・装備のタブ
    for(const [sub,label] of [['roster','名簿'],['scout','雇用'],['equip','バッグ']])
      await measure(`03_部隊装備_${label}`,size,stratTab('troops',sub),[...STRAT_BACK,'#tab-econ-roster','#tab-econ-scout','#tab-econ-equip'],'#strategy-modal');
    // 国家
    await measure('04_国家トップ',size,()=>page.evaluate(()=>{const g=qualityGame;g.openStrategyModal(true);g._nationRoute={group:null,page:null};g._selectStratTab('nation');g._refreshCommandNavigation?.();}),[...STRAT_BACK,'[data-nation-group]'],'#strategy-modal');
    for(const [group,pg] of NATION)
      await measure(`04_国家_${group}-${pg}`,size,()=>page.evaluate(({group,pg})=>{const g=qualityGame;g.openStrategyModal(true);g._openNationPage(group,pg);},{group,pg}),[...STRAT_BACK,`[data-nation-page="${pg}"]`],'#strategy-modal');
    await measure('05_ランキング',size,stratTab('rankings'),STRAT_BACK,'#strategy-modal');
    await measure('05_戦闘報告書',size,stratTab('report'),STRAT_BACK,'#strategy-modal');
    await measure('06_ファストトラベル',size,()=>page.evaluate(()=>{const g=qualityGame;g.openStrategyModal(true);g.openWorldMap('travel');}),['#btn-world-map-close','#fast-travel-list button'],'#world-map-modal');
    await measure('06_地図',size,()=>page.evaluate(()=>{const g=qualityGame;g.openStrategyModal(true);g.openWorldMap();}),['#btn-world-map-close','#world-map-canvas'],'#world-map-modal');
    await page.evaluate(()=>window.__closeAll());
    // 兵士の詳細
    const soldierSets=[['本隊の兵士',qa.squadIds[10]],['隊長直属の兵士(装備フル)',qa.squadIds[0]],['予備の兵士',qa.reserveIds[0]]];
    for(const [label,id] of soldierSets){
      const openDetail=async()=>{await page.evaluate(id=>{const g=qualityGame;g.openStrategyModal(true);g._selectStratTab('troops');g.openSoldierDetail(id,[...g.squad,...g.reserves].map(s=>s.id));},id);};
      const detailButtons=['.btn-close-soldier-detail','.btn-soldier-prev','.btn-soldier-next','.btn-scout-own-squad'];
      const hasTabs=await page.evaluate(async id=>{const g=qualityGame;g.openStrategyModal(true);g._selectStratTab('troops');g.openSoldierDetail(id,[...g.squad,...g.reserves].map(s=>s.id));return [...document.querySelectorAll('#soldier-detail-host [data-detail-tab]')].map(b=>b.dataset.detailTab);},id);
      if(!hasTabs.length){
        await measure(`07_兵士詳細_${label}`,size,openDetail,detailButtons,'#soldier-detail-host','タブなし(1枚)');
      }else{
        for(const t of hasTabs)
          await measure(`07_兵士詳細_${label}_${t}`,size,async()=>{await openDetail();await tryClick(`#soldier-detail-host [data-detail-tab="${t}"]`);},[...detailButtons,'#soldier-detail-host [data-detail-tab]'],'#soldier-detail-host');
      }
      await page.evaluate(()=>window.__closeAll());
    }
    // 商人
    const openMerchant=()=>page.evaluate(()=>{const g=qualityGame;window.__closeAll();const m=g.merchants[0];Object.assign(g.player,{x:m.x,y:m.y});g.openMerchantShop(m);});
    const MC=['.transfer-popup-close-btn'];
    await measure('08_商人_トップ',size,openMerchant,[...MC,'[data-merchant-section="recovery"]','[data-merchant-section="trade"]','[data-merchant-section="save"]'],'#merchant-shop-popup');
    await measure('08_商人_回復',size,async()=>{await openMerchant();await tryClick('[data-merchant-section="recovery"]');},[...MC,'.merchant-heal-button','.merchant-potion-button','.merchant-revival-button'],'#merchant-shop-popup');
    for(const [grp,label] of [['weapon','武器'],['armor','防具'],['caster','術士用品']])
      await measure(`08_商人_取引_${label}`,size,async()=>{await openMerchant();await tryClick('[data-merchant-section="trade"]');await tryClick(`[data-shop-group="${grp}"]`);},[...MC,'#merchant-recipient','[data-shop-group]','[data-buy]:not([data-inherit])'],'#merchant-shop-popup');
    await measure('08_商人_セーブ',size,async()=>{await openMerchant();await tryClick('[data-merchant-section="save"]');},[...MC,'[data-supply="save"]','[data-supply="load"]'],'#merchant-shop-popup');
    await page.evaluate(()=>window.__closeAll());
    // 鍛冶工房・酒場・カジノ・冒険者組合
    const moveTo=id=>()=>page.evaluate(async id=>{
      const g=qualityGame;window.__closeAll();
      const {HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js');
      const p=HEADQUARTERS_FACILITIES.find(p=>p.id===id),x=p.x,y=p.y+22;
      g.currentDungeon=null;Object.assign(g.player,{x,y,_openX:x,_openY:y,_wallX:x,_wallY:y});g.inBattle=true;g.restTimer=0;g.update(.01);g.camera={x,y};
      if(!g.openHeadquartersFacility(id))throw new Error('openHeadquartersFacility が false');
    },id);
    for(const [id,label] of [['smith','鍛冶工房'],['guild','冒険者組合'],['casino','カジノ']])
      await measure(`09_${label}`,size,moveTo(id),['#btn-hq-facility-close','[data-hq-service]','#hq-facility-dialog button'],'#hq-facility-dialog');
    await page.evaluate(()=>window.__closeAll());
    await measure('09_酒場',size,()=>page.evaluate(async()=>{
      const g=qualityGame;window.__closeAll();const {FIELD_TAVERN}=await import('/iron-squad/js/tavern.js');
      const x=FIELD_TAVERN.x,y=FIELD_TAVERN.y+22;g.currentDungeon=null;Object.assign(g.player,{x,y});g.inBattle=true;g.update(.01);g.openTavern();
    }),['#btn-tavern-close','#tavern-dialog button'],'#tavern-dialog');
    await page.evaluate(()=>window.__closeAll());
  }
  await context.close();
}finally{await browser.close();server.close();}
writeFileSync(join(outDir,'scroll-report.json'),JSON.stringify(report,null,2)+'\n');
const sum=report.screens.map(s=>`${s.screen} @${s.size}: ${s.error?'ERR '+s.error:s.scrollers.map(x=>x.sel+'='+x.amount).join(', ')||'0'}`);
console.log(sum.join('\n'));console.log(JSON.stringify({screens:report.screens.length,errors:report.screens.filter(s=>s.error).length,pageErrors:report.pageErrors.length,setup:report.setup}));
