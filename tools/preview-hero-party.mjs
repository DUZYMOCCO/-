// Isolated local playtest: never touches the user's browser saves.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8000/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
 const departure=await page.evaluate(async()=>{
   const {rollHeroRevelation}=await import('../js/games/iron-squad/hero-party.js');
   const g=qualityGame;g.stopGameLoop();g.phase=10;g.restTimer=0;g.monsters=[];g.updateSpawns=()=>{};
   rollHeroRevelation(g,()=>0);for(let i=0;i<25;i++)g.update(.1);
   const p=g.heroJourney.party;g.player.x=p.x-90;g.player.y=p.y+55;g.camera={x:g.player.x,y:g.player.y};g.render();
   return {members:p.members.length,phase:p.phase,x:p.x,y:p.y,levels:p.members.map(u=>u.level),status:p.status};
 });
 await page.screenshot({path:'docs/previews/hero-departure-v4.2.25.png'});
 await page.evaluate(()=>{const g=qualityGame;g.openStrategyModal();g._selectStratTab('overview');document.getElementById('hero-journey').open=true;document.getElementById('hero-journey').scrollIntoView();});
 await page.screenshot({path:'docs/previews/hero-status-v4.2.25.png'});
 const menu=await page.evaluate(()=>{const panel=document.getElementById('hero-journey'),close=document.getElementById('btn-strat-window-close').getBoundingClientRect();return {text:panel.textContent,closeVisible:close.top>=0&&close.bottom<=innerHeight};});
 if(!menu.closeVisible)throw Error('menu close button out of viewport');
 await page.getByRole('button',{name:'勇者を追う',exact:true}).click();
 const follow=await page.evaluate(()=>{const g=qualityGame;g.stopGameLoop();const x=g.player.x;for(let i=0;i<60;i++)g.update(.1);const followed=g.player.x>x;g.joystick.active=true;g.joystick.dirX=-1;g.update(.1);g.joystick.active=false;return {followed,manualCancels:!g.heroFollowing};});
 if(!follow.followed||!follow.manualCancels)throw Error('follow control failed');
 const soak=await page.evaluate(async()=>{
   const {WORLD_SIZE}=await import('../js/games/iron-squad/world.js?v=172');const c=WORLD_SIZE/2;
   const g=qualityGame;g.player.x=c;g.player.y=c;g.player.maxHp=g.player.hp=1e9;g.camera={x:c,y:c};
   let ticks=0;for(;ticks<10000&&g.heroJourney.party.status!=='fallen';ticks++)g.update(.1);
   const p=g.heroJourney.party;
   return {seconds:ticks*.1,status:p.status,distance:Math.hypot(p.x-c,p.y-c),levels:p.members.map(u=>u.level),down:p.members.filter(u=>u.isDown).length,dead:p.members.filter(u=>u.dead).length,history:g.heroJourney.history.map(h=>({name:h.name,result:h.result})),diaryBytes:new TextEncoder().encode(JSON.stringify(p.journal)).length,events:p.journal.events.length,trail:p.journal.trail.length};
 });
 if(soak.distance<1000)throw Error('autonomous march stalled near camp');
 if(soak.status!=='fallen')throw Error(`unattended party did not fall: ${JSON.stringify(soak)}`);
 await page.evaluate(()=>{const g=qualityGame,p=g.heroJourney.party;g.player.x=p.x-90;g.player.y=p.y+80;g.camera={x:g.player.x,y:g.player.y};g.ensureFog().revealCamp(p.x,p.y);g.render();g.openStrategyModal();g._selectStratTab('overview');document.getElementById('hero-journey').open=true;document.getElementById('hero-journey').scrollIntoView();});
 await page.screenshot({path:'docs/previews/hero-fallen-v4.2.25.png'});
 await page.evaluate(()=>{const diary=document.querySelector('.hero-diary');diary.open=true;diary.scrollIntoView();});
 await page.waitForTimeout(100);
 await page.screenshot({path:'docs/previews/hero-diary-v4.2.25.png'});
 const diaryLayout=await page.evaluate(()=>{const d=document.querySelector('.hero-diary');return {text:d.textContent,canvasWidth:d.querySelector('canvas').width,windowScroll:document.querySelector('.dialog-body').scrollHeight>document.querySelector('.dialog-body').clientHeight};});
 if(!diaryLayout.text.includes('全滅')||diaryLayout.canvasWidth!==300)throw Error('journey diary failed to render');
 const diaryCost=await page.evaluate(async()=>{
   const {updateHeroJournal}=await import('../js/games/iron-squad/hero-journal.js');const g=qualityGame,p=structuredClone(g.heroJourney.party);p.journal.ended=false;
   const begin=performance.now();for(let i=0;i<10000;i++)updateHeroJournal(g,p,2);
   return {checks:10000,totalMs:performance.now()-begin,maxEvents:p.journal.events.length,maxTrail:p.journal.trail.length};
 });
 await page.setViewportSize({width:844,height:390});await page.waitForTimeout(150);
 await page.evaluate(()=>document.querySelector('.hero-diary').scrollIntoView());
 const landscape=await page.evaluate(()=>{const close=document.getElementById('btn-strat-window-close').getBoundingClientRect();return {closeVisible:close.top>=0&&close.bottom<=innerHeight};});
 if(!landscape.closeVisible)throw Error('landscape close button out of viewport');
 await page.screenshot({path:'docs/previews/hero-diary-landscape-v4.2.25.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
 // Commander joins a party already fighting inside the persistent castle scene.
 const castle=await page.evaluate(async()=>{
   const {initializeHeroJourney,rollHeroRevelation,updateHeroParty}=await import('../js/games/iron-squad/hero-party.js');
   const {DUNGEON_DEFS}=await import('../js/games/iron-squad/dungeon.js?v=151');
   const {SOLDIER_CLASSES}=await import('../js/games/iron-squad/index.js');
   const g=qualityGame;g.closeStrategyModal(false);g.stopGameLoop();initializeHeroJourney(g);g.restTimer=0;g.phase=30;g.currentDungeon=null;g.monsters=[];rollHeroRevelation(g,()=>0);
   const p=g.heroJourney.party,d=DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle');p.x=d.entrance.x;p.y=d.entrance.y;p.destination={...d.entrance};p.route=[{...d.entrance}];p.routeIndex=0;p.members.forEach(u=>{u.x=p.x;u.y=p.y;});
   updateHeroParty(g,.1,SOLDIER_CLASSES);g.player.x=d.entrance.x;g.player.y=d.entrance.y;g.enterDungeon(d);
   g.camera={x:260,y:1000};g.render();return {space:p.space,members:p.members.length,kings:g.monsters.filter(m=>m.isDemonKing).length,shared:g.monsters===g.heroJourney.castleScene.monsters};
 });
 if(!castle.shared||castle.kings!==1)throw Error('castle scene duplication');
 await page.screenshot({path:'docs/previews/hero-castle-v4.2.25.png'});
 const result={departure,menu,follow,soak,diaryLayout,diaryCost,landscape,castle,errors};writeFileSync('docs/previews/hero-playtest-v4.2.25.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,menu:{closeVisible:menu.closeVisible},diaryLayout:{canvasWidth:diaryLayout.canvasWidth,windowScroll:diaryLayout.windowScroll}},null,2));
 await context.close();
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
