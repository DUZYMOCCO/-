// 技名（カタカナ英語）の見本: 強撃ボタン全種と死線覚醒チップを撮る。要: ローカルサーバー :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:667},deviceScaleFactor:2}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();g.currentDungeon=null;g.monsters=[];g.inBattle=true;g.restTimer=0;
    const {DEATHLINE_SKILLS}=await import('/js/games/iron-squad/index.js?v=169');
    const panel=document.createElement('div');panel.style.cssText='position:fixed;left:0;right:0;top:0;z-index:99999;background:#0b0d14;padding:8px 16px;color:#e2e8f0;font:12px sans-serif;height:420px;overflow:hidden';
    panel.innerHTML='<div style="margin-bottom:6px">強撃ボタン（左=通常職 / 右=覇王）</div>';
    const rows=document.createElement('div');rows.style.cssText='display:grid;grid-template-columns:repeat(6,1fr);gap:0;justify-items:center;margin:0 -8px';panel.append(rows);
    const w=g.equipped.weapon||(g.equipped.weapon={type:'WEAPON',id:'pv',weaponStyle:'sword',stats:{}});
    for(const adv of [false,true])for(const st of ['sword','spear','hammer','bow','crossbow','cannon']){
      w.weaponStyle=st;g.player.isAdvanced=adv;g.updateStatsUI();
      const b=document.getElementById('btn-pad-power').cloneNode(true);b.removeAttribute('id');b.style.position='relative';b.style.margin='0';rows.append(b);
    }
    const chips=document.createElement('div');chips.style.cssText='margin-top:10px;display:flex;flex-wrap:wrap;gap:4px';chips.innerHTML='<div style="width:100%">💀死線覚醒</div>'+Object.values(DEATHLINE_SKILLS).map(s=>`<span style="border:1px solid ${s.color};color:${s.color};border-radius:3px;padding:1px 5px;font-size:11px">${s.icon} ${s.name}</span>`).join('');panel.append(chips);
    const boss=document.createElement('div');boss.style.cssText='margin-top:10px;line-height:1.7';boss.innerHTML='ボス技: メガフレアブレス / アースクエイク / ミシックレーザー<br>ダンジョン: ダイナマイトフォール / ソウルイーター / アビスメテオ<br>魔法: マナバースト';panel.append(boss);
    w.weaponStyle='sword';g.player.isAdvanced=false;g.updateStatsUI();
    document.body.append(panel);
  });
  await page.waitForTimeout(300);
  const fit=await page.evaluate(()=>[...document.querySelectorAll('button.pad-btn-power')].slice(-12).map(b=>{const l=b.querySelector('.pad-btn-label'),r=b.getBoundingClientRect(),lr=l.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(l);const tr=range.getBoundingClientRect();return {text:l.textContent.split(String.fromCharCode(10)).join('/'),font:getComputedStyle(l).fontSize,fits:tr.left>=r.left+2&&tr.right<=r.right-2&&tr.bottom<=r.bottom-2};}));
  console.log(JSON.stringify(fit));if(fit.some(f=>!f.fits||parseFloat(f.font)<9))throw new Error('power label does not fit');
  await page.screenshot({path:'docs/previews/skill-names-v4.2.22.png'});
}finally{await browser.close();}
if(errors.length)throw new Error(errors.join('\n'));
