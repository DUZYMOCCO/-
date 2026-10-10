// Audit: panels with fixed chrome + small inner scroll areas / nested scrollers. Disposable save page.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const OUT='iron-squad/docs/previews/audit';mkdirSync(OUT,{recursive:true});
const scan=()=>{
  const vh=innerHeight,vw=innerWidth;
  const vis=e=>{const r=e.getBoundingClientRect();if(r.width<2||r.height<2)return false;for(let n=e;n&&n!==document.body;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility==='hidden')return false;}return r.bottom>0&&r.top<vh;};
  const sc=e=>{const c=getComputedStyle(e);return /(auto|scroll)/.test(c.overflowY);};
  const desc=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
  const scrollers=[...document.querySelectorAll('*')].filter(e=>e!==document.documentElement&&e!==document.body&&sc(e)&&vis(e)&&!e.closest('#game-header-skip'));
  const info=scrollers.map(e=>{const r=e.getBoundingClientRect();let nested=false,p=e.parentElement;while(p&&p!==document.body){if(sc(p)&&vis(p)){nested=true;break;}p=p.parentElement;}
    const c=getComputedStyle(e);return {el:desc(e),h:Math.round(r.height),pct:Math.round(r.height/vh*100),scrollH:e.scrollHeight,overflowing:e.scrollHeight>e.clientHeight+2,maxH:c.maxHeight,nested};});
  const fixed=[...document.querySelectorAll('*')].filter(e=>{const c=getComputedStyle(e);return (c.position==='sticky'||c.position==='fixed')&&vis(e);}).map(e=>{const r=e.getBoundingClientRect();return {el:desc(e),pos:getComputedStyle(e).position,h:Math.round(r.height),w:Math.round(r.width)};}).filter(f=>f.h>20&&f.w>vw*0.3);
  return {vh,vw,docOverflowX:document.documentElement.scrollWidth>vw+1,scrollers:info.filter(i=>i.overflowing||i.maxH!=='none'),fixed};
};
const results=[];
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
for(const [vpName,vp] of [['portrait',{width:390,height:844}],['landscape',{width:844,height:390}]]){
  const context=await browser.newContext({viewport:vp,deviceScaleFactor:1,hasTouch:true,isMobile:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.updateSpawns=()=>{};g.inBattle=true;g.restTimer=0;g.gold=5000;g.render();});
  const rec=async(name,fn,arg)=>{
    try{await page.evaluate(fn,arg);await page.waitForTimeout(350);}catch(e){results.push({vpName,name,error:String(e.message).slice(0,160)});return;}
    const r=await page.evaluate(scan);r.vpName=vpName;r.name=name;results.push(r);
    await page.screenshot({path:`${OUT}/${process.env.PFX||""}${vpName}-${name}.png`});
  };
  const reset=()=>page.evaluate(()=>{const g=qualityGame;document.querySelectorAll('.game-overlay,.transfer-popup-overlay,.soldier-detail-host,.recruitment-dialog').forEach(e=>e.classList.add('hidden'));document.getElementById('strategy-modal')?.classList.remove('strat-window-open');g.setDialogState(false);g.inBattle=true;});
  await rec('base-field',()=>{});
  await rec('launcher',()=>{qualityGame.openStrategyModal(true);});
  for(const [n,t] of [['situation','overview'],['squad','troops'],['nation','nation']]){
    await rec('win-'+n,t=>{document.getElementById('tab-strat-'+t).click();},t);
    if(t==='troops'){
      for(const s of ['scout','equip','roster']) await rec('troops-'+s,s=>{document.getElementById('tab-econ-'+s).click();},s);
      await rec('troops-invest',()=>{const b=document.getElementById('tab-econ-invest');b.classList.remove('hidden');b.click();});
      await rec('troops-box',()=>{const b=document.getElementById('tab-econ-box');b.classList.remove('hidden');b.click();});
      await rec('soldier-detail',()=>{document.getElementById('tab-econ-roster').click();const g=qualityGame;g.openSoldierDetail(g.squad[0].id);});
      await rec('transfer-popup',()=>{const g=qualityGame;g.closeSoldierDetail();g.openEquipmentTransferPopup(g.squad[0],'weapon');});
      await page.evaluate(()=>{document.querySelector('#equipment-transfer-popup,.transfer-popup-overlay:not(#merchant-shop-popup)')?.classList.add('hidden');});
    }
    await page.evaluate(()=>document.getElementById('btn-strat-window-back').click());
  }
  await page.evaluate(()=>qualityGame.closeStrategyModal(false));await reset();
  await rec('save-menu',()=>{qualityGame.showSaveMenu();});await reset();
  await rec('world-map',()=>{qualityGame.openWorldMap();});await reset();
  await rec('merchant',()=>{const g=qualityGame;const m=(g.merchants&&g.merchants[0])||null;if(!m)throw new Error('no merchant');g.openMerchantShop(m);});await reset();
  await rec('gameover',()=>{const o=document.getElementById('game-overlay');o.classList.remove('hidden');});await reset();
  await rec('recruit-dialog',()=>{const g=qualityGame;g.openStrategyModal(true);document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-scout').click();document.getElementById('recruitment-launcher')?.querySelector('button')?.click();});await reset();
  await rec('battle-log',()=>{const g=qualityGame;g.openStrategyModal(true);document.getElementById('tab-strat-overview').click();document.querySelectorAll('#strategy-modal details').forEach(d=>d.open=true);});await reset();
  await rec('equip-bag-sale',()=>{const g=qualityGame;const m=g.merchants[0];const st=(m.stock||[]);g.inventory=[];for(let i=0;i<14;i++){const it=JSON.parse(JSON.stringify(st[i%st.length]));it.id='audit'+i;g.inventory.push(it);}g.openStrategyModal(true);document.getElementById('tab-strat-troops').click();document.getElementById('tab-econ-equip').click();document.querySelectorAll('#view-strat-troops details').forEach(d=>d.open=true);});
  await rec('transfer-popup2',()=>{const g=qualityGame;g.openEquipmentTransferPopup(g.squad[0],'weapon');});
  await rec('personal-swap',()=>{const g=qualityGame;const it=JSON.parse(JSON.stringify(g.merchants[0].stock[0]));it.id='aud-in';g.openPersonalSwapDialog(it);});
  await page.evaluate(()=>{document.querySelectorAll('#scout-personal-swap-popup,#personal-swap-popup,[id*=swap]').forEach(e=>e.remove?.());});
  await page.evaluate(()=>qualityGame.closeStrategyModal(false));await reset();
  await rec('battle-log-filled',()=>{const g=qualityGame;g.openStrategyModal(true);document.getElementById('tab-strat-overview').click();const ol=document.getElementById('battle-log-history');for(let i=0;i<40;i++){const li=document.createElement('li');li.textContent='ログ '+i+' 敵を倒した';ol.append(li);}document.querySelectorAll('#strategy-modal details').forEach(d=>d.open=true);document.getElementById('battle-log-history').scrollIntoView();});
  await page.evaluate(()=>qualityGame.closeStrategyModal(false));await reset();
  await context.close();
}
await browser.close();
writeFileSync(`${OUT}/${process.env.PFX||""}measure.json`,JSON.stringify(results,null,1));
for(const r of results){if(r.error){console.log(r.vpName,r.name,'ERR',r.error);continue;}
 console.log(r.vpName,r.name,'|scrollers:',r.scrollers.map(s=>`${s.el} ${s.pct}%${s.nested?' NESTED':''}${s.overflowing?'':' (no-ovf)'} max=${s.maxH}`).join('; '),'|fixed:',r.fixed.map(f=>`${f.el}:${f.h}`).join(','),r.docOverflowX?'XOVF':'');}
if(errors.length)console.log('pageerrors',errors.slice(0,5));
