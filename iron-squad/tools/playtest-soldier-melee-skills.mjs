// Disposable Chrome profile and in-memory storage in canvas-quality-review.html.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/melee-skills-v6.6.0-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);
    for(const style of ['sword','spear','hammer','axe']){
      const result=await page.evaluate(async style=>{
        const g=qualityGame;g.stopGameLoop();g.closeSoldierDetail();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';
        Object.assign(g,{squad:[],reserves:[],monsters:[],merchants:[],gateGuards:[],civilians:[],medicalPosts:[],projectiles:[],powerFx:[],particles:[],shockwaves:[],damageTexts:[],outposts:[],restTimer:0,inBattle:true,_monsterGrid:null});
        const {generateRandomDrop}=await import('/iron-squad/js/index.js');const {rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js');const {WORLD_SIZE,northSouthRoadX}=await import('/iron-squad/js/world.js');
        const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y),profile=rollAttributeProfile('LIGHT','AVERAGE',()=>.5,true);
        const u=g.createNewSoldier(null,{classKey:'LIGHT',gender:'female',talent:'AVERAGE',attributeProfile:profile});u.level=14;
        const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
        Object.assign(u,{x,y,hp:u.maxHp,isPersonalGuard:true,isDown:false,dead:false,atkCooldown:999,weaponSkillCooldown:0,crit:0,speed:30,reqExp:1e12,name:'技能確認'});g.squad=[u];
        Object.assign(g.player,{x:x-110,y:y-35,hp:g.player.maxHp,isDown:false,atkCooldown:999,facingAngle:0});g.joystick={active:false,dirX:0,dirY:0};g.camera={x:x+45,y:y+70};g.zoom=1.25;g.resizeCanvas();
        const dx=style==='spear'?105:55,positions=style==='axe'?[[dx,0],[-55,0],[0,-55]]:[[dx,0],[dx+25,8],[dx+40,-10]];
        g.monsters=positions.map(([dx,dy],i)=>({id:`visual-${style}-${i}`,type:'goblin',x:x+dx,y:y+dy,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0,speed:0,atkTimer:999,color:'#719966'}));
        g.rebuildMonsterSpatial();g.update(.01);if(style==='axe')u.weaponSpinTime=.25;
        g.updateStatsUI(true);g.render();window.meleeReviewUnit=u;
        return {style,hitTargets:g.monsters.filter(m=>m.hp<1e8).length,cooldown:u.weaponSkillCooldown,pending:!!u.weaponSkillPending,spin:u.weaponSpinTime||0,overflow:document.documentElement.scrollWidth>innerWidth};
      },style);
      assert.ok(result.cooldown>0&&result.hitTargets>0,JSON.stringify(result));assert.equal(result.overflow,false);results.push({viewport,...result});
      await page.screenshot({path:`${out}/${style}-${viewport.width===390?'mobile':'desktop'}.png`});
    }
    await page.evaluate(()=>{qualityGame.openStrategyModal();qualityGame.openSoldierDetail(meleeReviewUnit.id);});
    await page.locator('.soldier-weapon-skill').scrollIntoViewIfNeeded();assert.match(await page.locator('.soldier-weapon-skill').innerText(),/スピンアタック.*自動/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`${out}/skill-detail-${viewport.width===390?'mobile':'desktop'}.png`});
    await page.evaluate(()=>qualityGame.closeSoldierDetail());
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({results,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
