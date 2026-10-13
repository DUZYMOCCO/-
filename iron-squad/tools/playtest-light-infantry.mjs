import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const version=manifest.GAME_ASSETS['iron-squad'].gameVersion,reviewRescue=process.argv.includes('--review-rescue');
const out=process.argv[2]||`iron-squad/docs/previews/light-infantry-v${version}-20261013`;mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[],results=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
    await page.setViewportSize(viewport);const size=viewport.width===390?'mobile':'desktop';
    await page.evaluate(async()=>{
      const g=qualityGame;g.stopGameLoop();g.closeSoldierDetail();g.closeStrategyModal();g.currentDungeon=null;g.career.status='enlisted';g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};g.deployReserves=()=>{};
      Object.assign(g,{squad:[],reserves:[],monsters:[],restMonsters:[],merchants:[],gateGuards:[],civilians:[],medicalPosts:[],projectiles:[],powerFx:[],particles:[],shockwaves:[],damageTexts:[],outposts:[],restTimer:0,inBattle:true,_monsterGrid:null});
      const {generateRandomDrop}=await import('/iron-squad/js/index.js'),{rollAttributeProfile}=await import('/iron-squad/js/unit-attributes.js'),{WORLD_SIZE,northSouthRoadX}=await import('/iron-squad/js/world.js');
      const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y);
      window.lightQA={g,x,y,make(cls,style,dx=0,dy=0){
        const p=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);p.innate.strength=100;
        const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:p});u.level=14;
        const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier:9,quality:1,merchant:true,random:()=>.5});u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
        Object.assign(u,{x:x+dx,y:y+dy,hp:u.maxHp,isPersonalGuard:true,isDown:false,dead:false,atkCooldown:999,weaponSkillCooldown:999,crit:0,reqExp:1e12,name:cls==='HEAVY'?'重装・前線維持':cls==='LIGHT'?'軽装・救助役':'火砲・白兵援護'});g.squad.push(u);return u;
      },enemy(dx=45,dy=0){const m={id:'qa-enemy',type:'goblin',x:x+dx,y:y+dy,hp:1e8,maxHp:1e8,radius:12,atk:0,def:0,speed:0,atkTimer:999,color:'#719966'};g.monsters.push(m);return m;},show(){g.camera={x:x+25,y:y+95};g.zoom=1.5;g.resizeCanvas();g.updateStatsUI(true);g.updatePowerAtkButtonUI();g.render();}};
      g.equipped.weapon=null;g.recalcPlayerStats();
      Object.assign(g.player,{x:x-70,y:y-55,hp:g.player.maxHp,isDown:false,atkCooldown:999,powerAtkCooldown:999,facingAngle:0});g.joystick={active:false,dirX:0,dirY:0};g.rankIndex=2;
    });
    const rescue=await page.evaluate(helperClass=>{
      const q=lightQA,{g,x,y}=q,heavy=q.make('HEAVY','sword'),light=q.make(helperClass,helperClass==='ARCHER'?'bow':'sword',-45),patient=q.make('HEAVY','sword',60,90);light.name=helperClass==='ARCHER'?'弓兵・救助役':'軽装・救助役';Object.assign(patient,{isDown:true,hp:0,downTimer:40,name:'要救助'});q.enemy();
      const before={heavy:{x:heavy.x,y:heavy.y},light:{x:light.x,y:light.y}};g.update(.1);q.show();
      return {helperClass,heavyForward:heavy.x>before.heavy.x,heavyY:heavy.y-before.heavy.y,helperTowardPatient:light.y>before.light.y,overflow:document.documentElement.scrollWidth>innerWidth};
    },reviewRescue?'ARCHER':'LIGHT');assert.equal(rescue.heavyForward,true);assert.equal(rescue.heavyY,0);assert.equal(rescue.helperTowardPatient,true);assert.equal(rescue.overflow,false);results.push({viewport,rescue});await page.screenshot({path:`${out}/rescue-${size}.png`});
    if(reviewRescue)continue;
    const bash=await page.evaluate(async()=>{
      const q=lightQA,{g,x,y}=q;g.squad=[];g.monsters=[];g.projectiles=[];const gun=q.make('ARCHER','cannon'),tank=q.make('HEAVY','sword',25,20),m=q.enemy(45);gun.ammo=0;gun.atkCooldown=0;gun.quickness=15;gun.atkSpeed=1;
      const hp=m.hp,start=m.x;const hit=g.performRangedSidearm(gun,m);gun.atkAnim=.55;q.gun=gun;q.tank=tank;q.target=m;q.show();
      const {rangedDrawPose}=await import('/iron-squad/js/ranged-combat.js');
      return {hit,damage:hp-m.hp,knockback:m.x-start,cooldown:gun.atkCooldown,actualStyle:gun.weapon.weaponStyle,drawStyle:rangedDrawPose(gun).weapon.weaponStyle,bashPose:rangedDrawPose(gun)._rangedBash,ammo:gun.ammo,badge:document.getElementById('supply-status-badge').textContent};
    });assert.equal(bash.hit,true);assert.ok(bash.damage>0);assert.equal(bash.knockback,25);assert.equal(bash.cooldown,1.4);assert.equal(bash.actualStyle,'cannon');assert.equal(bash.drawStyle,'cannon');assert.equal(bash.bashPose,true);assert.match(bash.badge,/白兵戦/);results.push({viewport,bash});await page.screenshot({path:`${out}/barrel-bash-${size}.png`});
    await page.evaluate(()=>{qualityGame.openStrategyModal();qualityGame.openSoldierDetail(lightQA.gun.id);});const resource=page.locator('.soldier-ammo-state');await resource.scrollIntoViewIfNeeded();assert.match(await resource.innerText(),/銃身殴り/);await page.screenshot({path:`${out}/empty-detail-${size}.png`});
    const refill=await page.evaluate(async()=>{
      const q=lightQA,{g,gun,target,x,y}=q;g.closeSoldierDetail();g.closeStrategyModal();gun.x=x+40;gun.y=y;target.x=x+70;target.y=y;gun.atkCooldown=0;
      const {ammoCapacity,updateSupplies}=await import('/iron-squad/js/supply-rules.js');g.worldTerrain.tiles.set('qa-camp',{camps:[{id:'qa-camp',x:gun.x,y:gun.y}]});updateSupplies(g,.25);const full=gun.ammo,start=gun.x;
      const original=g.spawnRangedProjectile;let shot;g.spawnRangedProjectile=function(...args){const r=original.apply(this,args);shot=this.projectiles.at(-1)?.type;return r;};g.update(.05);g.spawnRangedProjectile=original;q.show();
      return {full,max:ammoCapacity(gun),remaining:gun.ammo,retreat:gun.x<start,shot,bashFlag:gun._cannonBashAttack};
    });assert.equal(refill.full,refill.max);assert.equal(refill.remaining,refill.full-1);assert.equal(refill.retreat,true);assert.equal(refill.shot,'CANNONBALL');assert.equal(refill.bashFlag,false);results.push({viewport,refill});await page.screenshot({path:`${out}/refilled-${size}.png`});
    const commander=await page.evaluate(()=>{
      const q=lightQA,{g,gun,target}=q;g.equipped.weapon=gun.weapon;g.recalcPlayerStats();g.player.ammo=0;g.player.atkCooldown=0;g.player.atkSpeed=1;g.player.quickness=255;target.x=g.player.x+45;target.y=g.player.y;
      const hp=target.hp;g.performRangedSidearm(g.player,target,true);g.player.slashAnim=.55;g.player.powerAtkCooldown=0;q.show();return {damage:hp-target.hp,cooldown:g.player.atkCooldown,label:document.querySelector('#btn-pad-power .pad-btn-label').textContent};
    });assert.ok(commander.damage>0);assert.equal(commander.cooldown,1.4);assert.equal(commander.label,'銃身殴り');results.push({viewport,commander});await page.screenshot({path:`${out}/commander-bash-${size}.png`});
    const kana=await page.evaluate(async()=>{const {setKanaMode}=await import('/common/js/kana-mode.js?v=175');setKanaMode(true);qualityGame.updateStatsUI(true);return document.querySelector('#btn-pad-power .pad-btn-label').textContent;});assert.equal(kana,'じゅうしんなぐり');results.push({viewport,kana});
    await page.evaluate(async()=>{const {setKanaMode}=await import('/common/js/kana-mode.js?v=175');setKanaMode(false);});
  }
  assert.deepEqual(errors,[]);writeFileSync(`${out}/browser-playtest.json`,JSON.stringify({version,results,pageErrors:errors,disposableBrowserStorage:true},null,2)+'\n');console.log(JSON.stringify({results,pageErrors:errors}));await context.close();
}finally{await browser.close();}
