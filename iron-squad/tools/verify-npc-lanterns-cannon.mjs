import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const base=process.argv[2]||'http://127.0.0.1:8002',out='iron-squad/docs/previews/npc-lantern-cannon-20261012';mkdirSync(out,{recursive:true});
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);const release=manifest.GAME_ASSETS['iron-squad'];
const oldMotion=execFileSync('git',['show','HEAD:iron-squad/js/weapon-motion.js'],{encoding:'utf8'}).replaceAll("from './",`from '${base}/iron-squad/js/`);
const report={version:release.gameVersion,cache:release.version,errors:[],checks:{},screenshots:[]},browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${base}/iron-squad/tools/canvas-quality-review.html`);await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    window.g=qualityGame;g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.phaseTimer=300;g.inBattle=true;g.monsters=[];g.updateSpawns=()=>{};g.currentQuest=null;g.screenShake=0;
    window.saved=structuredClone(g.saveGame());window.reset=()=>{g.resumeSavedGame(structuredClone(saved));g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.phaseTimer=300;g.monsters=[];g.currentQuest=null;};
    window.light=await import('/iron-squad/js/scene-lighting.js?v=217');window.eq=await import('/iron-squad/js/equipment-rules.js?v=217');
    window.arm=await import('/iron-squad/js/weapon-motion.js?v=217');window.art=await import('/iron-squad/js/visuals.js?v=215');window.C=79360;
    window.draw=(x=g.player.x,y=g.player.y)=>{g.camera={x,y};g.resizeCanvas();g.revealFogAroundPlayer(true);g.updateStatsUI(true);g.render();};
    window.group=()=>{
      reset();const x=C+1400,y=C,base=g.squad[0],merchant=g.merchants[0],escort=merchant.escorts[0],guard=g.gateGuards[0];
      const unit=(source,id,name,dx,dy)=>({...structuredClone(source),id,name,x:x+dx,y:y+dy,dead:false,isDown:false,hp:source.maxHp||100,facingAngle:0});
      const cannon=unit(base,'review-cannon','火砲兵',-45,-120);cannon.equipped.weapon={type:'WEAPON',tier:3,weaponStyle:'cannon'};
      g.squad=[cannon,unit(base,'review-soldier','兵士',65,-120)];
      const trader=unit(merchant,'review-merchant','商人',-45,0);trader.escorts=[unit(escort,'review-escort','護衛',65,0)];g.merchants=[trader];g.gateGuards=[unit(guard,'review-gate','門番',-45,110)];
      g.reserves=[];g.civilians=[];g.taverns={version:3,roster:{phase:1,people:[]},waiting:[]};g.heroJourney=null;
      g.nation.economy.traffic=['traveler','merchant','guard'].map((role,i)=>({id:`review-${role}`,role,hp:100,maxHp:100,x:x+(i?i===1?65:-45:65),y:y+(i?220:110),progress:0,outbound:false,points:[[x-200,y],[x+400,y]],routeLength:600}));
      Object.assign(g.player,{x,y:y+330,facingAngle:0});g.equipped.weapon={type:'WEAPON',tier:6,weaponStyle:'cannon'};g.zoom=1;g.worldTime=300;draw(x,y+50);
    };group();
  });
  const shot=async name=>{const filename=`${name}.png`;await page.screenshot({path:`${out}/${filename}`});report.screenshots.push(filename);};
  report.checks.group=await page.evaluate(()=>({fixtures:light.sceneLightSources(g).filter(l=>l.npc).map(l=>({id:l.id,category:l.category,x:l.x,y:l.y})),pools:light.pooledLanternSources(light.sceneLightSources(g)).filter(l=>l.npc).length,recovery:g._renderProblem||null}));
  assert.equal(report.checks.group.fixtures.length,8);assert.equal(report.checks.group.recovery,null);await shot('night-friendlies-390');
  report.checks.day=await page.evaluate(()=>{g.worldTime=120;draw(C+1400,C+50);return light.sceneLightSources(g).filter(l=>l.npc).length;});assert.equal(report.checks.day,0);await shot('day-friendlies-390');
  report.checks.movement=await page.evaluate(()=>{g.worldTime=300;g.squad[0].x+=44;draw(C+1400,C+50);const s=light.sceneLightSources(g).find(l=>l.id.includes('review-cannon'));return {sourceX:s.x,unitX:g.squad[0].x};});assert.equal(report.checks.movement.sourceX,report.checks.movement.unitX);
  for(const [width,height]of [[844,390],[1280,800]]){await page.setViewportSize({width,height});await page.waitForTimeout(80);await page.evaluate(()=>{g.zoom=innerWidth>1000?1.45:1;draw(C+1400,C+50);});await shot(`night-friendlies-${width}`);}
  report.checks.crowd=await page.evaluate(()=>{reset();g.worldTime=300;g.zoom=1.2;draw(C,C);const t=performance.now();for(let i=0;i<30;i++)g.render();const ms=performance.now()-t,all=light.sceneLightSources(g);return {fixtures:all.filter(l=>l.npc).length,pools:light.pooledLanternSources(all).filter(l=>l.npc).length,meanRenderMs:ms/30,maskPixels:g._lightingMask.width*g._lightingMask.height,recovery:g._renderProblem||null};});assert.ok(report.checks.crowd.pools<report.checks.crowd.fixtures);assert.equal(report.checks.crowd.recovery,null);await shot('night-hq-crowd-1280');
  report.checks.tavern=await page.evaluate(async()=>{reset();const {FIELD_TAVERN,ensureTavernRoster}=await import('/iron-squad/js/tavern.js?v=208');ensureTavernRoster(g);Object.assign(g.player,{x:FIELD_TAVERN.x,y:FIELD_TAVERN.y+80});g.worldTime=300;draw(FIELD_TAVERN.x,FIELD_TAVERN.y);return light.sceneLightSources(g).filter(l=>l.category==='tavern').length;});assert.equal(report.checks.tavern,4);await shot('night-tavern-1280');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);
  report.checks.cave=await page.evaluate(()=>{reset();g.squad[0].isPersonalGuard=true;g.enterDungeon(g.dungeons.find(d=>d.theme==='mines'));g.stopGameLoop();g.monsters=[];g.zoom=1;Object.assign(g.player,{x:640,y:g.currentDungeon.height/2});const ally=g.squad.find(s=>s.isPersonalGuard);Object.assign(ally,{x:720,y:g.player.y});g.worldTime=120;draw();const all=light.sceneLightSources(g);return {npcLamps:all.filter(l=>l.npc).length,localOnly:g._lanternActors.every(a=>g.squad.some(s=>String(s.id)===a.id.split(':').at(-1)&&s.isPersonalGuard)||a.category==='encounter'),recovery:g._renderProblem||null};});assert.ok(report.checks.cave.npcLamps>0);assert.equal(report.checks.cave.localOnly,true);assert.equal(report.checks.cave.recovery,null);await shot('cave-allied-lanterns-390');
  report.checks.compare=await page.evaluate(()=>{
    const a={type:'WEAPON',weaponStyle:'cannon',stats:{atk:80},weaponTraits:{swingSpeed:1.2,attackTempo:1}},b={...a,weaponTraits:{swingSpeed:.8,attackTempo:1}};
    const result=eq.compareEquipment(a,b);return {html:result.html,text:result.text,kind:result.kind,cooldown:eq.weaponCombatProfile(a).baseCooldown,splash:eq.weaponCombatProfile(a).splash};
  });assert.equal(report.checks.compare.kind,'equal');assert.doesNotMatch(report.checks.compare.html,/振り抜き/);assert.equal(report.checks.compare.cooldown,1.85);assert.equal(report.checks.compare.splash,62);
  report.checks.hpAlerts=await page.evaluate(async()=>{
    reset();const {resetBattleLog,refreshCombatFieldNotes}=await import('/iron-squad/js/battle-log.js?v=217');resetBattleLog(g);
    for(const s of [g.player,...g.squad]){s.hp=s.maxHp;s.isDown=false;s.dead=false;}
    const own=g.squad[0],other=g.squad[1];own.isPersonalGuard=true;other.isPersonalGuard=false;other.overflowGuard=false;refreshCombatFieldNotes(g);other.hp=1;refreshCombatFieldNotes(g);
    const otherWarnings=g.battleLogHistory.filter(e=>e.text.includes(`${other.name}のHPが半分以下`)).length;own.hp=own.maxHp*.4;refreshCombatFieldNotes(g);g.player.hp=g.player.maxHp*.4;refreshCombatFieldNotes(g);g.worldTime=300;draw();
    return {otherWarnings,ownWarnings:g.battleLogHistory.filter(e=>e.text.includes(`${own.name}のHPが半分以下`)).length,commanderWarnings:g.battleLogHistory.filter(e=>e.text.includes('隊長のHPが半分以下')).length};
  });assert.deepEqual(report.checks.hpAlerts,{otherWarnings:0,ownWarnings:1,commanderWarnings:1});await shot('own-hp-warning-only-390');
  report.checks.guildBefore=await page.evaluate(async()=>{
    reset();const {HEADQUARTERS_FACILITIES}=await import('/iron-squad/js/hq-facilities.js?v=201'),{guildBoard}=await import('/iron-squad/js/guild-contracts.js?v=217'),site=HEADQUARTERS_FACILITIES.find(p=>p.id==='guild');
    g.nation.guild={version:1,active:[{id:'slime',level:0,target:6,reward:120,progress:4,acceptedPhase:1},{id:'goblin',level:0,target:6,reward:160,progress:2,acceptedPhase:1}],claimed:{},totalCompleted:0};guildBoard(g);Object.assign(g.player,{x:site.x,y:site.y+22});g.openHeadquartersFacility('guild');
    return {version:g.nation.guild.version,slime:structuredClone(g.nation.guild.active[0]),goblin:structuredClone(g.nation.guild.active[1]),gold:g.gold,treasury:g.treasury};
  });assert.equal(report.checks.guildBefore.slime.reward,2400);assert.equal(report.checks.guildBefore.goblin.reward,3200);await shot('guild-rewards-x20-390');
  await page.evaluate(()=>{g.onNationKill({type:'slime'});g.onNationKill({type:'slime'});g.refreshHeadquartersFacility();});await page.click('[data-guild-claim="slime"]');
  report.checks.guildClaim=await page.evaluate(()=>{const paid=g.gold,treasury=g.treasury,repeated=g.claimGuildContract('slime'),state=structuredClone(g.saveGame());g.closeHeadquartersFacility();g.resumeSavedGame(state);g.stopGameLoop();return {paid,treasury,repeated,remaining:structuredClone(g.nation.guild.active[0])};});
  assert.equal(report.checks.guildClaim.paid,report.checks.guildBefore.gold+2400);assert.equal(report.checks.guildClaim.treasury,report.checks.guildBefore.treasury);assert.equal(report.checks.guildClaim.repeated,false);assert.equal(report.checks.guildClaim.remaining.reward,3200);assert.equal(report.checks.guildClaim.remaining.progress,2);
  await page.setViewportSize({width:1160,height:860});await page.waitForTimeout(80);
  await page.evaluate(async source=>{
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'})),before=await import(url);URL.revokeObjectURL(url);
    const canvas=document.createElement('canvas');canvas.id='weapon-review';canvas.width=1100;canvas.height=790;Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:10000,width:'1100px',height:'790px'});document.body.append(canvas);
    const c=canvas.getContext('2d');c.fillStyle='#18292f';c.fillRect(0,0,1100,790);c.font='bold 24px sans-serif';c.fillStyle='#eadcbd';c.fillText('火砲：太い銃口・銃床・機関部・前方グリップ',28,38);
    const colors={cloth:'#708881',gloves:'#987b5b',blade:'#b5bfb8',hand:'#bd9975',weaponProfile:{detail:2}},tiers=await import('/iron-squad/js/equipment-tiers.js?v=187');
    for(const [row,mod,label]of [[0,before,'変更前'],[1,arm,'変更後']]){
      c.fillStyle='#d3c5a6';c.font='bold 20px sans-serif';c.fillText(label,28,88+row*185);
      for(const [i,tier]of [1,5,10,20].entries()){
        const profile=tiers.equipmentVisualProfile({type:'WEAPON',tier,weaponStyle:'cannon'});c.save();c.translate(130+i*265,170+row*185);c.scale(3.5,3.5);mod.drawRangedWeapon(c,{atkAnim:0,facingAngle:0},'cannon',{...colors,blade:profile.color||colors.blade,weaponProfile:profile},i===0,false);c.restore();
        c.font='16px sans-serif';c.fillStyle='#b7c7c1';c.fillText(`T${tier}・詳細${i}`,70+i*265,207+row*185);
      }
    }
    c.fillStyle='#d3c5a6';c.font='bold 20px sans-serif';c.fillText('実際の人物・8方向の構え',28,460);
    for(let i=0;i<8;i++){
      c.save();c.translate(65+i*135,630);c.scale(2.2,2.2);art.drawFieldSoldier(c,{...g.squad[0],x:0,y:0,atkAnim:.57,attackAngle:i*Math.PI/4,facingAngle:i*Math.PI/4,equipped:{weapon:{tier:6,weaponStyle:'cannon'},armor:{tier:3}}},2400,{baseClassId:'HEAVY'},'#789181',false);c.restore();
      c.font='15px sans-serif';c.fillStyle='#b7c7c1';c.fillText(`${i*45}°`,48+i*135,680);
    }
  },oldMotion);await page.locator('#weapon-review').screenshot({path:`${out}/cannon-before-after.png`});report.screenshots.push('cannon-before-after.png');await context.close();
  const offline=await browser.newContext({viewport:{width:390,height:844}}),tab=await offline.newPage();tab.on('pageerror',e=>report.errors.push(e.message));await tab.goto(base);await tab.waitForFunction(()=>navigator.serviceWorker.controller);
  await tab.waitForFunction(async({cache,total})=>(await(await caches.open(cache)).keys()).length>=total,{cache:`game-iron-squad-${release.version}`,total:release.files.length},{timeout:60000});
  await offline.setOffline(true);await tab.reload();await tab.click('[data-game-id="iron-squad"]');await tab.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await tab.click('#btn-commander-confirm');await tab.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);
  report.checks.offline=await tab.evaluate(async()=>{const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.restTimer=0;g.worldTime=300;g.monsters=[];g.camera={x:g.player.x,y:g.player.y};g.render();const {sceneLightSources}=await import('/iron-squad/js/scene-lighting.js?v=217'),{guildBoard}=await import('/iron-squad/js/guild-contracts.js?v=217');return {fixtures:sceneLightSources(g).filter(l=>l.npc).length,recovery:g._renderProblem||null,slimeReward:guildBoard(g).find(q=>q.id==='slime').reward};});assert.ok(report.checks.offline.fixtures>0);assert.equal(report.checks.offline.recovery,null);assert.equal(report.checks.offline.slimeReward,2400);report.checks.offline.assets=release.files.length;await tab.screenshot({path:`${out}/offline.png`});report.screenshots.push('offline.png');await offline.close();assert.deepEqual(report.errors,[]);
  console.log(JSON.stringify(report.checks));
}catch(error){report.failure=error.stack;throw error;}
finally{await browser.close();writeFileSync(`${out}/browser.json`,JSON.stringify(report,null,2));}
