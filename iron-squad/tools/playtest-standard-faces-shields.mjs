// One disposable Chrome context; the fixture also isolates localStorage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),out='iron-squad/docs/previews',errors=[];
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();window.__before=JSON.stringify([g.player.hp,g.player.maxHp,g.player.atk,g.player.def,g.player.speed,g.gold]);g.openCommanderGrooming();});
  for(const id of ['ce-face','ce-jaw','ce-eye-shape','ce-nose'])await page.locator(`#${id}`).getByRole('button',{name:'ふつう',exact:true}).click();
  await page.locator('#commander-editor .ce-preview').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/default-face-male-mobile-v5.3.1.png`});
  await page.click('#btn-commander-confirm');
  const male=await page.evaluate(()=>({jaw:qualityGame.saveGame().player.appearance.jaw,outline:qualityGame.player.appearance.faceOutline,unchanged:__before===JSON.stringify([qualityGame.player.hp,qualityGame.player.maxHp,qualityGame.player.atk,qualityGame.player.def,qualityGame.player.speed,qualityGame.gold])}));
  assert.equal(male.jaw,'standard');assert.equal(male.outline,'standard');assert.ok(male.unchanged);
  await page.evaluate(()=>qualityGame.openCommanderGrooming());await page.locator('#ce-gender').getByRole('radio',{name:'女',exact:true}).click();await page.locator('#ce-hair').getByRole('button',{name:'ボブ',exact:true}).click();
  await page.locator('#ce-face').getByRole('button',{name:'細いりんかく',exact:true}).click();await page.locator('#commander-editor .ce-preview').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/default-face-female-mobile-v5.3.1.png`});
  await page.click('#btn-commander-confirm');const female=await page.evaluate(()=>qualityGame.saveGame().player.appearance);assert.equal(female.jaw,'standard');assert.equal(female.faceOutline,'angular');assert.equal(female.medicHair,'bob');
  const shieldResults=[];
  for(const weaponStyle of ['axe','bow']){
    await page.evaluate(async weaponStyle=>{
      const g=qualityGame;g.closeStrategyModal();g.restTimer=0;g.squad=[];g.reserves=[];g.monsters=[];g.inBattle=true;
      if(!g.currentDungeon)g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));
      const {generateRandomDrop}=await import('/iron-squad/js/index.js');
      g.equipped.weapon=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle,tier:13,quality:1,merchant:true,random:()=>.5});
      g.equipped.shield=generateRandomDrop(0,'normal',{type:'SHIELD',tier:28,quality:1,merchant:true,random:()=>.5});
      g.player.attributeProfile.innate.strength=150;g.player.attributeProfile.innate.magic=1;g.recalcPlayerStats();
      const y=g.currentDungeon.height/2;Object.assign(g.player,{x:850,y,atkCooldown:0,powerAtkCooldown:0,crit:0,ammo:100,facingAngle:0,slashAngle:0,slashAnim:0});
      g.monsters=[{id:'shield-input-check',type:'goblin',x:905,y,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0,speed:0,atkTimer:100,color:'#719966'}];
      g.projectiles=[];g.damageTexts=[];g.particles=[];g.rebuildMonsterSpatial();g.camera={x:850,y:y-40};g.zoom=1.4;g.resizeCanvas();g.updateStatsUI(true);g.render();
    },weaponStyle);
    await page.screenshot({path:`${out}/shield-${weaponStyle}-idle-mobile-v5.3.1.png`});await page.click('#btn-pad-attack');
    const state=await page.evaluate(()=>{const g=qualityGame;g.player.slashAnim=.54;const before=JSON.stringify([g.player.hp,g.player.maxHp,g.player.atk,g.player.def,g.equipped,g.player.appearance]);g.render();return {weapon:g.equipped.weapon.weaponStyle,shield:g.equipped.shield.tier,damage:1e8-g.monsters[0].hp,projectiles:g.projectiles.length,unchanged:before===JSON.stringify([g.player.hp,g.player.maxHp,g.player.atk,g.player.def,g.equipped,g.player.appearance]),noOverflow:document.documentElement.scrollWidth<=innerWidth};});
    assert.ok(state.damage>0||state.projectiles>0);assert.ok(state.unchanged&&state.noOverflow);shieldResults.push(state);await page.screenshot({path:`${out}/shield-${weaponStyle}-attack-mobile-v5.3.1.png`});
  }
  assert.deepEqual(errors,[]);const report={male,female:{jaw:female.jaw,outline:female.faceOutline,hair:female.medicHair},shieldResults,pageErrors:errors};writeFileSync(`${out}/standard-faces-shields-playtest-v5.3.1.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
