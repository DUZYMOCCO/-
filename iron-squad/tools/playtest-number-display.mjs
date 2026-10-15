import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const mode=process.argv[2]||'screens',before=mode==='before',out='iron-squad/docs/validation/number-display-v6.11.25';mkdirSync(out,{recursive:true});
const server=await startQaServer(before?'iron-squad/docs/backups/number-reference-v6.11.24':null),browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],report={mode,viewport:{width:390,height:844},cpu:4,disposableStorage:true,screens:[]};
try{
 const context=await browser.newContext({viewport:report.viewport,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=13579;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('数値表示の検証');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
 await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
 await page.evaluate(async()=>{
  const g=qaGame,{stopAutoSave}=await import('/iron-squad/js/auto-save.js?v=269');g.stopGameLoop();stopAutoSave(g);g.closeStrategyModal();
  Object.assign(g,{inBattle:true,restTimer:0,currentQuest:null,currentDungeon:null,monsters:[],reserves:[],projectiles:[],particles:[],damageTexts:[],outposts:[],merchants:[],civilians:[],gateGuards:[],medicalPosts:[],phaseTimer:1e9,worldTime:80,_monsterGrid:null});
  g.updateSpawns=()=>{};g.updateDemonInvasion=()=>{};g.updateStatsUI(false);g.squad=[];
  const x=84360,y=84360;Object.assign(g.player,{x,y,level:50,hp:1e8,maxHp:1e8,atkCooldown:1e9,powerAtkCooldown:1e9,isDown:false});g.camera={x,y};g.zoom=1;g.gold=5545200;
  for(let i=0;i<48;i++){const s=g.createNewSoldier(null,{classKey:i%5===0?'MEDIC':i%3===0?'HEAVY':'LIGHT',talent:'AVERAGE',level:30});Object.assign(s,{x:x+(i%8-4)*28,y:y+Math.floor(i/8)*25+35,isPersonalGuard:i<6,hp:s.maxHp,atkCooldown:1e9,weaponSkillCooldown:1e9});g.squad.push(s);}
  for(let i=0;i<40;i++)g.monsters.push({id:`crowded-${i}`,type:i%2?'orc':'goblin',x:x+(i%8-4)*30,y:y-80-Math.floor(i/8)*25,hp:1e9,maxHp:1e9,atk:0,def:10,speed:0,radius:12,atkTimer:1e9});
  g.joystick={active:false,dirX:0,dirY:0};window.qaOrigin={x,y};g.updateStatsUI();g.render();
 });
 if(mode!=='screens'){
  const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  report.measurement=await page.evaluate(async()=>{
   const g=qaGame,work=[],gaps=[];let previous=null,peak=0;
   for(let i=0;i<420;i++){
    const ts=await new Promise(requestAnimationFrame);const start=performance.now();
    // Same dense hit stream, 48 actors and 40 enemies on both versions.
    for(let hit=0;hit<4;hit++){const m=g.monsters[(i*4+hit)%40];g.spawnDamageText(m.x,m.y-14,12345+(i%13)*1000,hit===0?'#ffaa00':'#ffffff',{kind:hit===0?'critical':'normal',maxHp:hit===0?100000:1e9});}
    g.update(1/60);g.camera={...qaOrigin};g.render();
    if(i>=60){work.push(performance.now()-start);if(previous!==null)gaps.push(ts-previous);peak=Math.max(peak,g.damageTexts.length);}previous=ts;
   }
   const summarize=xs=>({count:xs.length,mean:xs.reduce((a,b)=>a+b,0)/xs.length,p95:[...xs].sort((a,b)=>a-b)[Math.floor(xs.length*.95)],max:Math.max(...xs),over100:xs.filter(v=>v>100).length});
   return {work:summarize(work),raf:summarize(gaps),peak,actors:g.squad.length,enemies:g.monsters.length,frames:work,gaps};
  });await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 }
 if(!before){
  if(mode==='screens')await page.evaluate(()=>{const g=qaGame;g.damageTexts=[];g.monsters.forEach((m,i)=>{g.spawnDamageText(m.x,m.y-14,12345+(i%13)*1000,i%8===0?'#ffaa00':'#ffffff',{kind:i%8===0?'critical':'normal'});const p=g.damageTexts.at(-1);p.life-=i%6*.03;p.y-=i%6;});g.render();});
  await page.screenshot({path:`${out}/crowded-390.png`});
  await page.evaluate(async()=>{
   const g=qaGame;g.damageTexts=[];g.monsters=g.monsters.slice(0,4);g.squad=g.squad.slice(0,6);g.player.hp=123456;g.player.maxHp=1234567;g.player.atk=5545200;g.player.def=123456;
   g.equipped.weapon={id:'visual-staff',type:'WEAPON',name:'検証の杖',tier:1,weaponStyle:'staff',minStrength:0,stats:{magicAttack:5}};g.player.equipped=g.equipped;g.player.weaponStyle='staff';g.player.mana=72;g.monsters[0].hp=123456;g.monsters[0].maxHp=1000000;g.monsters[0].isBoss=true;
   g.squad.forEach((s,i)=>{s.maxHp=1234567;s.hp=123456+i*100000;});g.updateStatsUI();
   const {updateSquadHpHud}=await import('/iron-squad/js/squad-hp-hud.js?v=275');updateSquadHpHud(g,0,true);g.render();
  });
  for(const [name,value,color,kind,maxHp] of [['normal',12345,'#ffffff','normal',1e6],['critical',23456,'#ffaa00','critical',1e6],['big-hit',345678,'#ffffff','normal',1e6],['healing','+12345HP','#34d399','heal',1e6],['friendly',12345,'#ff3344','friendly',1e6]]){
   await page.evaluate(({value,color,kind,maxHp})=>{const g=qaGame;g.damageTexts=[];g.spawnDamageText(g.player.x+52,g.player.y-55,value,color,{kind,maxHp});g.damageTexts[0].life-=.055;g.render();},{value,color,kind,maxHp});
   await page.screenshot({path:`${out}/${name}-390.png`});report.screens.push(name);
  }
  report.display=await page.evaluate(()=>{const g=qaGame;g.damageTexts=[];g.spawnDamageText(g.player.x+45,g.player.y-40,'+12345G','#ffe600');g.render();return {hp:document.querySelector('.qv-hp').textContent,gold:document.querySelector('.qv-gold').textContent,mp:document.querySelector('.qv-mp').textContent,number:g.damageTexts[0].text};});
  assert.equal(report.display.hp,'HP 123K/1.23M');assert.equal(report.display.gold,'5.55M G');assert.equal(report.display.number,'+12.3K G');await page.screenshot({path:`${out}/hud-gold-390.png`});
  report.exact=await page.evaluate(()=>{const g=qaGame;g.openStrategyModal();g._selectStratTab('overview');document.getElementById('player-record-box').closest('details').open=true;return document.querySelector('.commander-stat-grid').textContent;});assert.match(report.exact,/123,456.*1,234,567/);
  await page.locator('.commander-stat-grid').evaluate(n=>n.scrollIntoView({block:'center'}));await page.screenshot({path:`${out}/exact-status-390.png`});
  await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:`${out}/exact-status-1280.png`});
 }
 assert.deepEqual(errors,[]);report.errors=errors;console.log(JSON.stringify({...report,measurement:report.measurement?{...report.measurement,frames:undefined,gaps:undefined}:undefined}));
}finally{report.errors=errors;writeFileSync(`${out}/${mode}.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
