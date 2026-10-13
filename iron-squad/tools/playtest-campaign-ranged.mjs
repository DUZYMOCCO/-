import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/previews/campaign-ranged-v6.7.0-20261013';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    for(const style of ['bow','crossbow','cannon']){
      const result=await page.evaluate(async style=>{
        const g=qualityGame;g.stopGameLoop();g.closeSoldierDetail();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};g.deployReserves=()=>{};
        Object.assign(g,{squad:[],reserves:[],monsters:[],restMonsters:[],merchants:[],gateGuards:[],civilians:[],medicalPosts:[],projectiles:[],powerFx:[],particles:[],shockwaves:[],damageTexts:[],outposts:[],restTimer:0,inBattle:true,_monsterGrid:null});
        const {generateRandomDrop}=await import('/iron-squad/js/index.js'),{rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js'),{WORLD_SIZE,northSouthRoadX}=await import('/iron-squad/js/world.js'),{ammoCapacity}=await import('/iron-squad/js/supply-rules.js'),{weaponCombatProfile}=await import('/iron-squad/js/equipment-rules.js');
        const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y);
        const u=g.createNewSoldier(null,{classKey:'ARCHER',gender:'female',talent:'AVERAGE',attributeProfile:rollAttributeProfile('ARCHER','AVERAGE',()=>.5,true)});u.level=14;
        const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
        Object.assign(u,{x,y,hp:u.maxHp,ammo:ammoCapacity(u),isPersonalGuard:true,isDown:false,dead:false,atkCooldown:999,crit:0,reqExp:1e12,name:'射手の確認'});g.squad=[u];
        Object.assign(g.player,{x:x-110,y:y-35,hp:g.player.maxHp,isDown:false,atkCooldown:999,powerAtkCooldown:999,facingAngle:0});g.joystick={active:false,dirX:0,dirY:0};g.camera={x:x+45,y:y+70};g.zoom=1.25;g.resizeCanvas();
        g.monsters=[120,160,200].map((dx,i)=>({id:`visual-${i}`,type:'goblin',x:x+dx,y,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0,speed:0,atkTimer:999,color:'#719966'}));
        window.rangedReviewTargets=[...g.monsters];g.spawnRangedProjectile(u,g.monsters[0],200,weaponCombatProfile(w),false);
        for(let i=0;i<12;i++)g.update(.05);
        g.camera={x:x+45,y:y+70};g.player.powerAtkCooldown=0;g.updateStatsUI(true);g.updatePowerAtkButtonUI();g.render();window.rangedReviewUnit=u;
        return {style,hitTargets:rangedReviewTargets.filter(m=>m.hp<1e8).length,ammo:u.ammo,maxAmmo:ammoCapacity(u),stones:g.projectiles.filter(p=>p.type==='STONE').length,overflow:document.documentElement.scrollWidth>innerWidth};
      },style);
      assert.ok(result.hitTargets>0,JSON.stringify(result));if(style==='crossbow')assert.equal(result.hitTargets,3);assert.equal(result.stones,0);assert.equal(result.overflow,false);results.push({viewport,...result});
      await page.screenshot({path:`${out}/${style}-${size}.png`});
    }
    const empty=await page.evaluate(async()=>{
      const g=qualityGame,u=rangedReviewUnit,{ammoCapacity,updateSupplies}=await import('/iron-squad/js/supply-rules.js');u.ammo=0;u.atkCooldown=0;
      const m=g.monsters[0];m.x=u.x+50;m.y=u.y;const hp=m.hp;const hit=g.performRangedSidearm(u,m);g.updateStatsUI(true);g.updatePowerAtkButtonUI();g.render();
      return {hit,damage:hp-m.hp,ammo:u.ammo,maxAmmo:ammoCapacity(u),stones:g.projectiles.filter(p=>p.type==='STONE').length,badge:document.getElementById('supply-status-badge').textContent};
    });
    assert.equal(empty.hit,true);assert.ok(empty.damage>0);assert.equal(empty.ammo,0);assert.equal(empty.stones,0);assert.match(empty.badge,/短剣で迎撃/);results.push({viewport,empty});
    await page.screenshot({path:`${out}/sidearm-${size}.png`});
    await page.evaluate(()=>{qualityGame.openStrategyModal();qualityGame.openSoldierDetail(rangedReviewUnit.id);});
    const resource=page.locator('.soldier-ammo-state');await resource.scrollIntoViewIfNeeded();assert.match(await resource.innerText(),/短剣/);await page.screenshot({path:`${out}/empty-detail-${size}.png`});
    const refill=await page.evaluate(async()=>{
      const g=qualityGame,u=rangedReviewUnit,{ammoCapacity,updateSupplies}=await import('/iron-squad/js/supply-rules.js'),{weaponCombatProfile}=await import('/iron-squad/js/equipment-rules.js');g.closeSoldierDetail();g.closeStrategyModal();
      g.worldTerrain.tiles.set('qa-camp',{camps:[{id:'qa-camp',x:u.x,y:u.y}]});updateSupplies(g,.25);const full=u.ammo;g.projectiles=[];g.spawnRangedProjectile(u,g.monsters[0],200,weaponCombatProfile(u.weapon),false);
      return {full,maxAmmo:ammoCapacity(u),projectile:g.projectiles[0]?.type,remaining:u.ammo};
    });
    assert.equal(refill.full,refill.maxAmmo);assert.equal(refill.projectile,'CANNONBALL');assert.equal(refill.remaining,refill.full-1);results.push({viewport,refill});
    const commander=await page.evaluate(()=>{const g=qualityGame,u=rangedReviewUnit;g.equipped.weapon=u.weapon;g.player.level=14;g.recalcPlayerStats();g.player.ammo=0;g.player.atkCooldown=0;g.player.powerAtkCooldown=0;g.projectiles=[];const m=g.monsters[0];m.x=g.player.x+50;m.y=g.player.y;const hp=m.hp;g.triggerPowerAttack();g.updateStatsUI(true);g.updatePowerAtkButtonUI();g.render();return {damage:hp-m.hp,projectiles:g.projectiles.length,powerCooldown:g.player.powerAtkCooldown,label:document.querySelector('#btn-pad-power .pad-btn-label').textContent};});
    assert.ok(commander.damage>0);assert.equal(commander.projectiles,0);assert.equal(commander.powerCooldown,0);assert.equal(commander.label,'短剣');results.push({viewport,commander});await page.screenshot({path:`${out}/empty-commander-${size}.png`});

    const castle=await page.evaluate(async()=>{
      const g=qualityGame,{DUNGEON_DEFS}=await import('/iron-squad/js/dungeon.js');const d=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');g.currentDungeon=d;g.currentQuest=null;g.projectiles=[];g.monsters=[g.createDungeonBoss(d.boss,1400,1000,d)];g.squad=[];
      Object.assign(g.player,{x:1360,y:1000,hp:g.player.maxHp,isDown:false});g.camera={x:1380,y:1060};g.resizeCanvas();g.updateStatsUI(true);g.updatePowerAtkButtonUI();g.render();return {hp:g.monsters[0].maxHp,overflow:document.documentElement.scrollWidth>innerWidth};
    });assert.equal(castle.hp,1_000_000_000);assert.equal(castle.overflow,false);results.push({viewport,castle});await page.screenshot({path:`${out}/demon-king-${size}.png`});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({results,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
