// Chrome runs in a disposable profile; the fixture also replaces localStorage.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],out='iron-squad/docs/previews';
try{
  const context=await browser.newContext({viewport:{width:375,height:780},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  const reports=[];
  for(const style of ['sword','spear','hammer','axe','staff','wand','bow','crossbow','cannon']){
    await page.evaluate(async style=>{
      const g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.squad=[];g.reserves=[];g.monsters=[];g.inBattle=true;g.restTimer=0;
      if(!g.currentDungeon)g.enterDungeon(g.dungeons.find(d=>d.id==='dungeon_goblin_mines'));
      const {generateRandomDrop}=await import('/iron-squad/js/index.js');
      const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});
      g.equipped.weapon=w;g.player.attributeProfile.innate.strength=150;g.player.attributeProfile.innate.magic=1;g.recalcPlayerStats();
      const y=g.currentDungeon.height/2;
      Object.assign(g.player,{x:850,y,atkCooldown:0,powerAtkCooldown:0,crit:0,ammo:200,facingAngle:0,slashAngle:0,slashAnim:0});
      g.monsters=[{id:'weapon-check',type:'goblin',x:905,y,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0,speed:0,atkTimer:100,color:'#719966'}];
      g.projectiles=[];g.damageTexts=[];g.particles=[];g.shockwaves=[];g.rebuildMonsterSpatial();g.camera={x:850,y:y-40};g.zoom=1.4;g.resizeCanvas();g.updateStatsUI(true);g.render();
    },style);
    await page.click('#btn-pad-attack');
    const result=await page.evaluate(style=>{
      const g=qualityGame,p=g.player;g.render();
      return {style,held:g.equipped.weapon.weaponStyle,weaponAttack:g.equipped.weapon.stats.atk,cooldown:p.atkCooldown,animation:p.slashAnim,damage:1e8-g.monsters[0].hp,projectiles:g.projectiles.length,powerLabel:document.querySelector('#btn-pad-power')?.textContent,powerIcon:document.querySelector('#btn-pad-power .pad-btn-icon')?.textContent,
        noOverflow:document.documentElement.scrollWidth<=innerWidth};
    },style);
    assert.equal(result.held,style);assert.ok(result.animation>0&&result.cooldown>0,JSON.stringify(result));assert.ok(result.damage>0||result.projectiles>0,JSON.stringify(result));assert.ok(result.noOverflow);reports.push(result);
    if(style==='axe')assert.equal(result.powerIcon,'🪓');
    if(['axe','bow','cannon'].includes(style)){
      await page.evaluate(()=>{qualityGame.player.slashAnim=.55;qualityGame.render();});
      await page.screenshot({path:`${out}/${style}-mobile-v5.3.0.png`});
    }
  }
  await page.setViewportSize({width:1460,height:1760});
  const gallery=await page.evaluate(async()=>{
    const g=qualityGame;document.getElementById('game').style.display='none';
    const {drawFieldSoldier}=await import('/iron-squad/js/visuals.js?v=187');
    const {buildCommanderAppearance}=await import('/iron-squad/js/commander-identity.js?v=187');
    const {rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js?v=187');
    const {SOLDIER_CLASSES}=await import('/iron-squad/js/index.js');
    const css=document.createElement('style');css.textContent='html,body{height:auto;overflow:auto;background:#14221f;color:#d9cfb6;font:14px "Yu Gothic",sans-serif}#weapon-gallery{padding:16px;width:1440px;box-sizing:border-box}h1{font-size:22px;margin:0 0 10px}.row{display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:8px}.cell{background:#283b30;padding:4px;border-radius:4px}canvas{width:100%;height:auto;display:block}.caption{font-size:12px}';document.head.append(css);
    const gallery=document.createElement('main');gallery.id='weapon-gallery';gallery.innerHTML='<h1>武器と腕 / 全9種・8方向 / Chrome Canvas</h1>';
    const styles=['sword','spear','hammer','axe','staff','wand','bow','crossbow','cannon'],names=['剣','槍','鎚','斧','杖','ワンド','弓','クロスボウ','火砲'];
    for(let row=0;row<styles.length;row++){
      const line=document.createElement('div');line.className='row';gallery.append(line);
      for(let dir=0;dir<8;dir++){
        const family=row>=6?'ARCHER':row>=4?'MAGE':'HEAVY',gender=dir%2?'female':'male',profile=rollAttributeProfile(family,'AVERAGE',()=>.5,true);
        const s=g.createNewSoldier(null,{classKey:family,gender,talent:'AVERAGE',attributeProfile:profile});
        Object.assign(s,{x:0,y:0,portrait:true,facingAngle:dir*Math.PI/4,attackAngle:dir*Math.PI/4,atkAnim:dir%2?.82:.54,
          appearance:buildCommanderAppearance(gender,{hairStyle:gender==='female'?'bob':'short',accessory:'none'}),equipped:{weapon:{weaponStyle:styles[row],tier:13},armor:{tier:9},gloves:{tier:6},legs:{tier:6}}});
        const div=document.createElement('div');div.className='cell';div.innerHTML=`<div class="caption">${names[row]} · ${dir*45}° · ${gender==='male'?'男':'女'}</div>`;
        const cv=document.createElement('canvas');cv.width=320;cv.height=300;const c=cv.getContext('2d');c.showBattleLabels=false;c.translate(160,234);c.scale(3.4,3.4);drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[family],'#839582',false);div.append(cv);line.append(div);
      }
    }
    // Raised classes and the two strength-dependent physiques use the same arms.
    const extra=document.createElement('div');extra.className='row';gallery.append(extra);
    for(const family of ['MAGE','MEDIC'])for(const gender of ['male','female'])for(const weaponStyle of ['axe','staff']){
      const profile=rollAttributeProfile(family,'AVERAGE',()=>.5,true);profile.innate.strength=150;
      const s=g.createNewSoldier(null,{classKey:family,gender,talent:'AVERAGE',attributeProfile:profile});s.soldierClass=family==='MAGE'?'ARCANE_SOVEREIGN':'ARCHANGEL';s.equipped={weapon:{weaponStyle,tier:24},armor:{tier:20},gloves:{tier:24}};s.x=s.y=0;s.portrait=true;s.facingAngle=0;s.atkAnim=.54;g.recalcSoldierStats(s);
      const div=document.createElement('div');div.className='cell';div.innerHTML=`<div class="caption">${family==='MAGE'?'筋肉魔法師':'筋肉衛生士'} · ${gender==='male'?'男':'女'} · ${weaponStyle}</div>`;
      const cv=document.createElement('canvas');cv.width=320;cv.height=320;const c=cv.getContext('2d');c.showBattleLabels=false;c.translate(120,263);c.scale(3.6,3.6);drawFieldSoldier(c,s,1000,SOLDIER_CLASSES[s.soldierClass],'#839582',false);div.append(cv);extra.append(div);
    }
    document.body.append(gallery);return {directions:8,weapons:9,genderVariants:true,muscleCasterAndClass3Examples:8};
  });
  await page.locator('#weapon-gallery').screenshot({path:`${out}/weapon-directions-chrome-v5.3.0.png`});
  assert.deepEqual(errors,[]);writeFileSync(`${out}/heavy-weapons-playtest-v5.3.0.json`,JSON.stringify({reports,gallery,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({reports,gallery,pageErrors:errors}));await context.close();
}finally{await browser.close();}
