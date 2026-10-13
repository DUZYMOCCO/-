import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/talent-rework-v6.9.0-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    const fixture=await page.evaluate(async()=>{
      const g=qualityGame;g.stopGameLoop();g.closeSoldierDetail();g._merchantShopClose?.();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.squad=[];g.reserves=[];g.monsters=[];g.gold=400000;
      const {rollAttributeProfile,talentGrowth}=await import('/iron-squad/js/unit-attributes.js'),{talentTag}=await import('/iron-squad/js/talent-labels.js');
      const units=[];for(const [name,talent,level,awakened,grit] of [['まだへっぽこ','INFERIOR',40,false,0],['死線を越えた若手','INFERIOR',30,true,0],['花開く古参兵','INFERIOR',35,true,4],['大器晩成の英雄','INFERIOR',40,true,8],['三千人に一人の天才','GENIUS',40,false,0]]){
        const u=g.createNewSoldier(null,{classKey:'HEAVY',talent,level,attributeProfile:rollAttributeProfile('HEAVY',talent,()=>.5,true)});u.name=name;u.survivedDeathlines=awakened?1:0;u.deathlineSkills=awakened?['IRON_RESOLVE']:[];u.inferiorGrit=grit;u.isPersonalGuard=true;u.gold=75;g.recalcSoldierStats(u);units.push(u);
      }
      g.squad=units;g.render();g.openStrategyModal();g._selectStratTab('troops');g.renderStrategyUI();window.talentQA={g,units};return units.map(u=>({id:u.id,name:u.name,talent:u.talent,level:u.level,growth:talentGrowth(u),tag:talentTag(u),grit:u.inferiorGrit,hp:u.maxHp,atk:u.atk,def:u.def,strength:u.strength}));
    });assert.deepEqual(fixture.map(u=>u.growth),[.85,.85,1.2,1.55,2.4]);assert.ok(fixture[4].atk>fixture[3].atk);
    assert.deepEqual(await page.locator('.roster-entry .roster-talent').allTextContents(),['🍂へっぽこ','🍂大器晩成','🍂大器晩成','🍂大器晩成','🌟天才']);await page.screenshot({path:`${out}/talent-roster-${size}.png`});
    await page.evaluate(()=>talentQA.g.openSoldierDetail(talentQA.units[3].id));await page.screenshot({path:`${out}/late-bloomer-detail-${size}.png`});assert.match(await page.locator('#soldier-detail-host').innerText(),/大器晩成/);await page.evaluate(()=>talentQA.g.closeSoldierDetail());
    await page.evaluate(()=>{const g=talentQA.g;g._troopRankingCategory='deathline';g._selectStratTab('rankings');g.renderTroopRankings();});assert.match(await page.locator('#command-troop-rankings').innerText(),/大器晩成/);await page.screenshot({path:`${out}/late-bloomer-ranking-${size}.png`});
    await page.evaluate(()=>{const {g}=talentQA;g._selectStratTab('troops');g.openScoutDialog();const original=g.rollScoutTalent;g.rollScoutTalent=()=> 'GENIUS';g.refreshScoutCandidates();g.rollScoutTalent=original;g.scoutCandidates[0].soldier.name='天才スカウトの確認';g.renderScoutCandidates();});
    assert.match(await page.locator('#recruitment-dialog .recruitment-candidate').innerText(),/🌟天才/);await page.screenshot({path:`${out}/genius-recruit-${size}.png`});
    await page.evaluate(async()=>{const g=talentQA.g;g.closeScoutDialog();g._selectStratTab('troops');const mode=await import('/common/js/kana-mode.js?v=175');talentQA.kana=mode;mode.setKanaMode(true);g.renderStrategyUI();});
    await page.waitForFunction(()=>[...document.querySelectorAll('.roster-talent')].filter(n=>n.textContent.includes('たいきばんせい')).length===3);const kanaLabels=await page.locator('.roster-entry .roster-talent').allTextContents();await page.locator('.roster-entry').filter({hasText:'たいきばんせい'}).first().scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/late-bloomer-kana-${size}.png`});await page.evaluate(()=>{talentQA.kana.setKanaMode(false);talentQA.g.renderStrategyUI();});
    const saved=await page.evaluate(()=>{const {g,units}=talentQA;g.closeScoutDialog();g.closeStrategyModal();const s=structuredClone(g.saveGame()),id=units[3].id;g.resumeSavedGame(s);const u=g.squad.find(s=>s.id===id);return {talent:u.talent,grit:u.inferiorGrit,hp:u.maxHp,atk:u.atk,def:u.def,profileEqual:JSON.stringify(u.attributeProfile)===JSON.stringify(units[3].attributeProfile),overflow:document.documentElement.scrollWidth>innerWidth};});assert.equal(saved.talent,'INFERIOR');assert.equal(saved.grit,8);assert.equal(saved.hp,fixture[3].hp);assert.equal(saved.atk,fixture[3].atk);assert.equal(saved.def,fixture[3].def);assert.equal(saved.profileEqual,true);assert.equal(saved.overflow,false);results.push({viewport,fixture,kanaLabels,saved});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version:'6.9.0',results,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
