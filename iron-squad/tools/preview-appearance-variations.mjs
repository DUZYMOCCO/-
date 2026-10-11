// Browser QA with disposable storage. Requires the local server on :8000.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],output='iron-squad/docs/previews';
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{
    const g=qualityGame;g.stopGameLoop();window.__beforeStats=JSON.stringify([g.player.hp,g.player.maxHp,g.player.atk,g.player.def,g.player.speed,g.player.strength,g.gold]);g.openCommanderGrooming();
  });
  for(const [id,name]of [['ce-face','角ばった顔'],['ce-eye-shape','目つきが悪い'],['ce-nose','高いはな'],['ce-jaw','出たあご'],['ce-hair','かり上げ'],['ce-accessory','輪の耳飾り']]){
    // Labels are sourced from the game catalog below for the ornament.
    const label=id==='ce-accessory'?'わの耳かざり':name;
    await page.locator(`#${id}`).getByRole('button',{name:label,exact:true}).click();
  }
  await page.locator('#commander-editor .ce-preview').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/appearance-editor-mobile-v5.2.0.png`});
  await page.locator('#ce-nose').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/appearance-controls-mobile-v5.2.0.png`});
  await page.click('#btn-commander-confirm');
  const saved=await page.evaluate(()=>{
    const g=qualityGame,data=g.saveGame(),after=JSON.stringify([g.player.hp,g.player.maxHp,g.player.atk,g.player.def,g.player.speed,g.player.strength,g.gold]);
    g.openCommanderGrooming();
    return {appearance:data.player.appearance,statsUnchanged:after===__beforeStats,overflow:document.documentElement.scrollWidth>innerWidth,
      reopened:{eye:document.querySelector('#ce-eye-shape [aria-pressed="true"]')?.textContent,nose:document.querySelector('#ce-nose [aria-pressed="true"]')?.textContent,jaw:document.querySelector('#ce-jaw [aria-pressed="true"]')?.textContent}};
  });
  assert.equal(saved.appearance.eyeShape,'stern');assert.equal(saved.appearance.nose,'high');assert.equal(saved.appearance.jaw,'forward');assert.equal(saved.appearance.hairStyle,'undercut');assert.equal(saved.appearance.accessory,'earring');assert.equal(saved.statsUnchanged,true);assert.equal(saved.overflow,false);assert.equal(saved.reopened.jaw,'出たあご');
  await page.locator('#ce-gender').getByRole('radio',{name:'女',exact:true}).click();
  await page.locator('#ce-given').fill('ヒルダ');
  await page.locator('#ce-hair').getByRole('button',{name:'ウルフ',exact:true}).click();
  await page.locator('#commander-editor .ce-preview').scrollIntoViewIfNeeded();
  await page.screenshot({path:`${output}/appearance-editor-female-mobile-v5.2.0.png`});
  await page.click('#btn-commander-confirm');
  const female=await page.evaluate(()=>qualityGame.saveGame().player.appearance);
  assert.equal(female.feminine,true);assert.equal(female.medicHair,'wolf');assert.equal(female.eyeShape,'stern');assert.equal(female.nose,'high');assert.equal(female.jaw,'forward');assert.equal(female.accessory,'earring');
  saved.female=female;await page.setViewportSize({width:1240,height:1200});
  await page.evaluate(async()=>{
    document.querySelector('#game').style.display='none';
    const {buildCommanderAppearance,MALE_HAIR_STYLES,FEMALE_HAIR_STYLES,HAIR_CHOICE_LABELS,FEMALE_HAIR_LABELS}=await import('/iron-squad/js/commander-identity.js?v=186');
    const {drawSoldierPortrait}=await import('/iron-squad/js/soldier-appearance.js?v=186');
    const {FACE_OUTLINES,EYE_SHAPES,NOSE_TYPES,JAW_TYPES,ACCESSORY_LABELS}=await import('/iron-squad/js/appearance-features.js?v=186');
    const style=document.createElement('style');style.textContent='html,body{height:auto;overflow:auto;background:#16211e;color:#ddd8c6;font:14px "Yu Gothic",sans-serif}.sheet{width:1240px;padding:22px}h1{font-size:25px;margin:0 0 8px}p{color:#a8b9aa;line-height:1.6;margin:0 0 18px}.row{display:grid;gap:8px;margin:0 0 10px}.row-label{align-self:center}.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.cell{border:1px solid #4e5e52;background:#26352e;border-radius:6px;padding:7px;text-align:center;font-size:13px}canvas{display:block;width:100%;height:auto}.sex{color:#a9b5a7;font-size:11px;margin-top:4px}';document.head.append(style);
    const portrait=(gender,patch={},width=120,height=132)=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const a=buildCommanderAppearance(gender,{hairStyle:gender==='female'?'bob':'short',accessory:'none',glasses:'none',...patch});
      drawSoldierPortrait(canvas.getContext('2d'),{id:'appearance-example',gender,soldierClass:'COMMANDER',appearance:a},width,height);return canvas;
    };
    const sheet=(id,title,note)=>{const root=document.createElement('main');root.className='sheet';root.id=id;root.innerHTML=`<h1>${title}</h1><p>${note}</p>`;document.body.append(root);return root;};
    const faces=sheet('faces-sheet','目つき・はな・あごを別々に組み合わせる','v5.2.0 / 左が男、右が女。既存の顔は引き直さず、新しい兵士には個人ごとの組み合わせを保存。');
    for(const [key,title,catalog]of [['faceOutline','輪郭',FACE_OUTLINES],['eyeShape','目つき',EYE_SHAPES],['nose','はな',NOSE_TYPES],['jaw','あご',JAW_TYPES]]){
      const row=document.createElement('div');row.className='row';row.style.gridTemplateColumns=`90px repeat(${Object.keys(catalog).length},1fr)`;const label=document.createElement('div');label.className='row-label';label.textContent=title;row.append(label);
      for(const [value,name]of Object.entries(catalog)){const cell=document.createElement('div');cell.className='cell';cell.textContent=name;const cv=document.createElement('canvas');cv.width=240;cv.height=132;const c=cv.getContext('2d');c.drawImage(portrait('male',{[key]:value}),0,0);c.drawImage(portrait('female',{[key]:value}),120,0);cell.append(cv);row.append(cell);}faces.append(row);
    }
    const hairs=sheet('hairs-sheet','髪型を31種類へ','男18種類・女13種類。新たに12種類を追加。顔と髪の組み合わせは独立。'),hg=document.createElement('div');hg.className='grid';hairs.append(hg);
    for(const gender of ['male','female'])for(const key of gender==='female'?FEMALE_HAIR_STYLES:MALE_HAIR_STYLES){const cell=document.createElement('div');cell.className='cell';cell.textContent=(gender==='female'?FEMALE_HAIR_LABELS:HAIR_CHOICE_LABELS)[key];cell.append(portrait(gender,{hairStyle:key},160,176));const sex=document.createElement('div');sex.className='sex';sex.textContent=gender==='female'?'女':'男';cell.append(sex);hg.append(cell);}
    const ornaments=sheet('ornaments-sheet','かざりを12種類へ','男も女も同じ飾りを使える。耳飾り・眼帯・はちまき・花・額飾り・羽など。'),og=document.createElement('div');og.className='grid';ornaments.append(og);
    for(const [accessory,name]of Object.entries(ACCESSORY_LABELS)){const cell=document.createElement('div');cell.className='cell';cell.textContent=name;const cv=document.createElement('canvas');cv.width=240;cv.height=132;const c=cv.getContext('2d');c.drawImage(portrait('male',{accessory}),0,0);c.drawImage(portrait('female',{accessory}),120,0);cell.append(cv);og.append(cell);}
  });
  for(const [id,name]of [['faces-sheet','face-variations'],['hairs-sheet','hair-variations'],['ornaments-sheet','accessory-variations']])await page.locator(`#${id}`).screenshot({path:`${output}/${name}-v5.2.0.png`});
  assert.deepEqual(errors,[]);writeFileSync(`${output}/appearance-playtest-v5.2.0.json`,JSON.stringify({saved,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({saved,pageErrors:errors}));await context.close();
}finally{await browser.close();}
