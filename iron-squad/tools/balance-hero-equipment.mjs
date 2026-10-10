// Deterministic, isolated balance runs using the real battlefield update.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),results=[],errors=[];
try{
 for(const seed of [3,11,29]){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async(seed)=>{
   let state=seed;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
   const {rollHeroRevelation}=await import('../js/hero-party.js');
   const g=qualityGame;g.stopGameLoop();g.phase=10;g.restTimer=0;g.monsters=[];g.updateSpawns=()=>{};rollHeroRevelation(g,()=>0);
   window.balanceState={seed,ticks:0};
  },seed);
  let result;
  for(let batch=0;batch<24;batch++){
   result=await page.evaluate(async()=>{
    const {WORLD_SIZE}=await import('../js/world.js?v=175');const c=WORLD_SIZE/2,g=qualityGame,p=g.heroJourney.party,b=balanceState;
    const start=performance.now();for(let i=0;i<500&&p.status!=='fallen'&&!g.heroJourney.demonKingDefeat;i++){g.update(.25);b.ticks++;}
    return {seed:b.seed,seconds:b.ticks*.25,distance:Math.round(Math.hypot(p.x-c,p.y-c)),status:p.status,
     members:p.members.map(u=>({class:u.isChosenHero?'HERO':u.soldierClass,talent:u.talent,level:u.level,maxHp:u.maxHp,atk:u.atk,def:u.def,magicDef:u.magicDef,dead:u.dead})),
     diaryBytes:new TextEncoder().encode(JSON.stringify(p.journal)).length,monsters:g.monsters.length,batchMs:Math.round(performance.now()-start)};
   });
   if(result.status==='fallen')break;
  }
  results.push(result);console.log(JSON.stringify(result));writeFileSync('iron-squad/docs/previews/hero-equipment-balance-v4.2.26.json',JSON.stringify({results,errors},null,2));await context.close();
 }
}finally{await browser.close();}
if(errors.length)throw Error(errors.join('\n'));
