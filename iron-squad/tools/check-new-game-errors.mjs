// v4.2.27 実アプリ（ハブ→Iron Squad→ニューゲーム→隊長づくり→出発）で pageerror / console.error が出ないか確認する。要: :8000 と同梱 Playwright。
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:Number(process.env.VW||390),height:Number(process.env.VH||844)}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message+'\n'+e.stack));
  page.on('console',m=>{if(m.type()==='error')errors.push('console.error: '+m.text());});
  await page.goto('http://localhost:8000/');await page.waitForTimeout(800);
  await page.click('.game-card[data-game-id="iron-squad"], .game-card');
  await page.waitForSelector('#expedition-name');
  if(!process.env.EMPTY)await page.fill('#expedition-name','検証隊');await page.click('#new-expedition-form button[type=submit]');
  await page.waitForSelector('#btn-commander-confirm');
  if(!process.env.EMPTY){await page.fill('#ce-family','検証');await page.fill('#ce-given','太郎');}
  await page.click('#btn-commander-confirm');
  if(process.env.PLAY){
    await page.keyboard.down('ArrowUp');await page.waitForTimeout(3000);await page.keyboard.up('ArrowUp');
    for(const t of ['攻撃','回復薬','メニュー'])await page.click(`button:has-text("${t}")`,{timeout:2000}).catch(()=>{});
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(Number(process.env.W||4000));await page.screenshot({path:process.env.SHOT||'C://tmp/x.png'});
}finally{await browser.close();}
console.log(errors.length?errors.join('\n'):'NO ERRORS');
process.exit(errors.length?1:0);
