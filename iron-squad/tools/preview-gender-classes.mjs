// Actual Chrome/Canvas rendering in disposable localStorage (:8000 required).
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],output='iron-squad/docs/previews';
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{qualityGame.stopGameLoop();qualityGame.openCommanderGrooming();});
  await page.locator('#ce-gender').getByRole('radio',{name:'女',exact:true}).click();
  await page.locator('#ce-family').fill('バークレー');await page.locator('#ce-given').fill('ヒルダ');
  await page.locator('#ce-hair').getByRole('button',{name:'ボブ',exact:true}).click();
  await page.screenshot({path:`${output}/bob-commander-mobile-v5.1.0.png`});
  await page.click('#btn-commander-confirm');
  const promotion=await page.evaluate(()=>{
    const g=qualityGame,s=g.createNewSoldier(null,{classKey:'MEDIC',gender:'female',talent:'AVERAGE'});
    g.squad.push(s);g.awakeningOrbs=20;g.awakeningGems=2;g.promoteSoldier(s.id);g.promoteSoldier(s.id);g.openSoldierDetail(s.id);
    return {gender:s.gender,classTier:s.classTier,classId:s.soldierClass,details:document.querySelector('.soldier-detail-head')?.textContent,commander:{gender:g.player.gender,bob:g.player.appearance.medicHair}};
  });
  assert.equal(promotion.classTier,2);assert.equal(promotion.gender,'female');assert.match(promotion.details,/衛生術師 クラス2/);assert.match(promotion.details,/女/);assert.ok(!promotion.details.includes('聖女'));
  assert.equal(promotion.commander.gender,'female');assert.equal(promotion.commander.bob,'bob');
  await page.evaluate(()=>{document.querySelector('#strategy-modal').classList.remove('hidden');});
  await page.screenshot({path:`${output}/class2-medic-mobile-v5.1.0.png`});
  await page.setViewportSize({width:1240,height:1200});
  await page.evaluate(async()=>{
    const g=qualityGame;document.querySelector('#game').style.display='none';
    const {SOLDIER_CLASSES}=await import('/iron-squad/js/index.js');
    const {drawSoldierPortrait,soldierPhysique}=await import('/iron-squad/js/soldier-appearance.js?v=185');
    const {drawFieldSoldier}=await import('/iron-squad/js/visuals.js?v=185');
    const {buildCommanderAppearance}=await import('/iron-squad/js/commander-identity.js?v=185');
    const {rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js?v=185');
    const style=document.createElement('style');style.textContent='html,body{height:auto;overflow:auto;background:#15211e;color:#ded9c9;font:14px "Yu Gothic",sans-serif}.sheet{padding:20px;width:1240px}h1{font-size:24px;margin:0 0 8px}p{color:#b5beb0;margin:0 0 20px}.class-row{display:grid;grid-template-columns:150px repeat(6,1fr);gap:7px;margin:0 0 10px}.build-row{display:grid;grid-template-columns:200px repeat(2,1fr);gap:10px;margin:0 0 10px}.label{align-self:center}.cell{background:#23332c;border:1px solid #526152;border-radius:6px;padding:6px;text-align:center}canvas{display:block;width:100%;height:auto}.caption{font-size:12px;margin-bottom:3px}';document.head.append(style);
    const make=(family,gender,id=family,muscular=false)=>{
      const profile=rollAttributeProfile(family,'AVERAGE',()=>.5,true);if(muscular){profile.innate.strength=60;profile.aptitudes.strength=2;}
      const s=g.createNewSoldier(null,{classKey:family,gender,talent:'AVERAGE',attributeProfile:profile});
      s.soldierClass=id;s.equipped={};s.weapon=null;s.x=s.y=0;s.portrait=true;s.facingAngle=0;
      s.appearance=buildCommanderAppearance(gender,{hairStyle:gender==='female'?'bob':'short',accessory:'none',glasses:'none'});g.recalcSoldierStats(s);s.hp=s.maxHp;
      return s;
    };
    const cell=(s,bust=false)=>{
      const div=document.createElement('div');div.className='cell';
      const caption=document.createElement('div');caption.className='caption';caption.textContent=`${s.gender==='female'?'女':'男'} · ${SOLDIER_CLASSES[s.soldierClass].name}`;div.append(caption);
      const cv=document.createElement('canvas');cv.width=bust?480:220;cv.height=bust?210:240;const c=cv.getContext('2d');c.showBattleLabels=false;
      if(bust){c.save();drawSoldierPortrait(c,s,180,210);c.restore();c.save();c.translate(328,165);c.scale(3.5,3.5);drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[s.soldierClass],'#829cae',false);c.restore();}
      else{c.translate(110,187);c.scale(3.3,3.3);drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[s.soldierClass],'#829cae',false);}
      div.append(cv);return div;
    };
    const roles=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
    const builds=document.createElement('main');builds.className='sheet';builds.id='builds-sheet';builds.innerHTML='<h1>全兵種の男女と、術師の体格</h1><p>v5.1.0 / 筋力で体格が変わるのは筋肉魔法師・筋肉衛生士だけ。男女とも同じ条件。</p>';
    for(const family of roles){const row=document.createElement('div');row.className='build-row';const label=document.createElement('div');label.className='label';label.textContent=SOLDIER_CLASSES[family].name;row.append(label);for(const gender of ['male','female'])row.append(cell(make(family,gender),true));builds.append(row);}
    for(const family of ['MAGE','MEDIC']){const row=document.createElement('div');row.className='build-row';const label=document.createElement('div');label.className='label';label.textContent=family==='MAGE'?'筋肉魔法師':'筋肉衛生士';row.append(label);for(const gender of ['male','female']){const s=make(family,gender,family,true);if(soldierPhysique(s).bodyWidth<=1)throw new Error('muscle caster build is missing');row.append(cell(s,true));}builds.append(row);}
    document.body.append(builds);
    const classes=document.createElement('main');classes.className='sheet';classes.id='classes-sheet';classes.innerHTML='<h1>職種はそのまま、昇格はクラス番号へ</h1><p>左からクラス1の男女、クラス2の男女、クラス3の男女。衣装は昇格に応じて豪華になる。</p>';
    for(const family of roles){const row=document.createElement('div');row.className='class-row';const label=document.createElement('div');label.className='label';label.textContent=SOLDIER_CLASSES[family].name;row.append(label);let id=SOLDIER_CLASSES[family].advancedClassId;for(let tier=1;tier<=3;tier++){for(const gender of ['male','female'])row.append(cell(make(family,gender,id)));id=SOLDIER_CLASSES[id].advancedClassId;}classes.append(row);}
    document.body.append(classes);
  });
  await page.locator('#builds-sheet').screenshot({path:`${output}/gender-physique-v5.1.0.png`});
  await page.locator('#classes-sheet').screenshot({path:`${output}/numbered-classes-v5.1.0.png`});
  assert.deepEqual(errors,[]);writeFileSync(`${output}/gender-classes-playtest-v5.1.0.json`,JSON.stringify({promotion,pageErrors:errors},null,2)+'\n');
  console.log(JSON.stringify({promotion,pageErrors:errors}));await context.close();
}finally{await browser.close();}
