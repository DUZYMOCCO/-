// Local Chrome playtest in disposable storage. Requires common/tools/serve.py on :8000.
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
const output='iron-squad/docs/previews';
try{
  const context=await browser.newContext({viewport:{width:1100,height:1560},serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await page.waitForFunction(()=>window.qualityReady);
  await page.evaluate(async()=>{
    qualityGame.stopGameLoop();document.querySelector('#game').style.display='none';
    const {DUNGEON_DEFS,drawDungeonEnvironment,drawDungeonVault}=await import('/iron-squad/js/dungeon.js?v=179');
    const {explorationLayout}=await import('/iron-squad/js/dungeon-layout.js?v=179');
    const {drawDungeonSideChests}=await import('/iron-squad/js/dungeon-exploration.js?v=179');
    const {drawFieldCommander,drawFieldBoss}=await import('/iron-squad/js/visuals.js?v=177');
    const style=document.createElement('style');style.textContent='html,body{height:auto;overflow:auto;background:#17221f;color:#ded8c3;font-family:"Yu Gothic",sans-serif}*{box-sizing:border-box}.preview{width:1100px;padding:24px}h1{font-size:23px;margin:0 0 8px}p{font-size:14px;color:#b0bdad;margin:0 0 20px}.row{display:grid;grid-template-columns:150px 1fr 1fr;gap:12px;margin:0 0 12px}.label{padding-top:95px;font-size:16px}.cell{background:#26332c;border:1px solid #475244;border-radius:6px;padding:7px}.caption{font-size:13px;margin-bottom:6px}canvas{display:block;width:100%;height:auto}';document.head.append(style);
    const root=document.createElement('main');root.className='preview';root.innerHTML='<h1>IRON SQUAD — 通路を調べ、奥の財宝へ</h1><p>v4.2.28 / 実ゲームの描画。左は通路の端にある宝箱、右はボスを倒して開く最奥の財宝。</p>';
    const defs=[...DUNGEON_DEFS.filter(d=>d.kind==='dungeon'),DUNGEON_DEFS.find(d=>d.kind==='ruin')];
    for(const d of defs){
      const layout=explorationLayout(d),row=document.createElement('div');row.className='row';
      const label=document.createElement('div');label.className='label';label.textContent=d.name;row.append(label);
      for(const mode of ['branch','boss']){
        const camera=mode==='branch'?{x:layout.branches[0].x,y:layout.branches[0].y+90}:{x:d.width-360,y:d.height/2};
        const cell=document.createElement('div');cell.className='cell';const caption=document.createElement('div');caption.className='caption';caption.textContent=mode==='branch'?'寄り道の先の宝箱':'ボスの広間と財宝';cell.append(caption);
        const canvas=document.createElement('canvas');canvas.width=438;canvas.height=300;cell.append(canvas);const c=canvas.getContext('2d'),z=mode==='boss'?.55:.85;
        c.showBattleLabels=false;c.translate(219,150);c.scale(z,z);c.translate(-camera.x,-camera.y);
        drawDungeonEnvironment(c,d,camera,438,300,z,1,qualityGame);
        drawDungeonSideChests(c,{currentDungeon:d,dungeonExploration:{}},1000);
        if(mode==='boss'){
          drawDungeonVault(c,{x:d.width-240,y:d.height/2,dungeon:d,unlocked:false,opened:false,name:'財宝'},1);
          const boss=d.boss?qualityGame.createDungeonBoss(d.boss,d.width-350,d.height/2,d):qualityGame.createDungeonMob('orc',d.width-350,d.height/2,d,true,false);
          qualityGame.drawMonster(c,boss,1000);
        }
        drawFieldCommander(c,{x:camera.x-85,y:camera.y+42,level:1,hp:100,maxHp:100},{},1000,0,'隊長',false,true);
        row.append(cell);
      }
      root.append(row);
    }
    document.body.append(root);
  });
  await page.screenshot({path:`${output}/dungeon-interiors-v4.2.28.png`,fullPage:true});
  const field=await context.newPage();field.on('pageerror',e=>errors.push(e.message));await field.setViewportSize({width:375,height:667});
  await field.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');await field.waitForFunction(()=>window.qualityReady);
  const entry=await field.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();g.monsters=[];g.squad=[];g.reserves=[];g.updateSpawns=()=>{};g.treasury=0;g.inBattle=true;g.restTimer=0;
    const layoutModule=await import('/iron-squad/js/dungeon-layout.js?v=179');window.__layout=layoutModule;
    const d=g.dungeons.find(d=>d.id==='dungeon_goblin_mines');g.enterDungeon(d);
    const inside=g.monsters.every(m=>!layoutModule.explorationBlocks(d,m.x,m.y));
    window.__boss=g.monsters.find(m=>m.isDungeonBoss);g.monsters=[];
    g.camera={x:g.player.x+80,y:g.player.y};g.resizeCanvas();g.render();return {floorSpawns:inside,monsters:g.monsters.length,dungeon:d.id};
  });assert.ok(entry.floorSpawns);
  await field.screenshot({path:`${output}/dungeon-entry-mobile-v4.2.28.png`});
  const journey=await field.evaluate(()=>{
    const g=qualityGame,d=g.currentDungeon,l=__layout.explorationLayout(d),visited=[];
    window.__walk=target=>{
      let count=0;
      while(Math.hypot(target.x-g.player.x,target.y-g.player.y)>34&&count++<900){
        const goal=__layout.dungeonSteeringTarget(d,g.player,target),dx=goal.x-g.player.x,dy=goal.y-g.player.y,dist=Math.hypot(dx,dy);
        if(dist<.01)throw new Error('stalled player route');
        g.joystick={active:true,dirX:dx/dist,dirY:dy/dist};g.update(.05);
        if(g.currentDungeon?.id!==d.id)throw new Error('unexpected exit');
      }
      g.resetMovementInput();if(count>=900)throw new Error('player route timed out');g.render();return count;
    };
    for(const chest of l.branches){const before=g.inventory.length,steps=__walk(chest);visited.push({id:chest.id,steps,rewards:g.inventory.length-before});}
    g.camera={x:g.player.x,y:g.player.y-50};g.render();return {visited,opened:g.dungeonExploration[d.id].opened.slice()};
  });assert.deepEqual(journey.opened,['north','south']);assert.ok(journey.visited.every(v=>v.rewards===1));
  await field.screenshot({path:`${output}/dungeon-side-chest-mobile-v4.2.28.png`});
  await field.evaluate(()=>{const g=qualityGame;__walk({x:__boss.x-65,y:__boss.y});g.monsters=[__boss];g.rebuildMonsterSpatial();g.player.atk=1e8;g.player.atkCooldown=0;g.camera={x:g.player.x+70,y:g.player.y};g.render();});
  await field.click('#btn-pad-attack');
  const killed=await field.evaluate(()=>({unlocked:qualityGame.dungeonVault.unlocked,bossAlive:qualityGame.monsters.some(m=>m.isDungeonBoss)}));
  assert.equal(killed.unlocked,true);assert.equal(killed.bossAlive,false);
  await field.evaluate(()=>{const g=qualityGame;__walk({x:g.dungeonVault.x,y:g.dungeonVault.y+25});for(let i=0;i<30;i++)g.update(1/60);g.camera={x:g.player.x-45,y:g.player.y};g.render();});
  await field.screenshot({path:`${output}/dungeon-victory-mobile-v4.2.28.png`});
  const cycles=await field.evaluate(()=>{
    const g=qualityGame,d=g.currentDungeon,saved=g.saveGame(),opened=saved.dungeonExploration[d.id].opened.slice(),clearPhase=g.phase;
    const vaultOpened=g.dungeonVault.opened;g.exitDungeon();g.enterDungeon(d);
    const immediate={monsters:g.monsters.length,opened:g.dungeonVault.opened,side:g.dungeonExploration[d.id].opened.length};g.exitDungeon();
    g.phase=clearPhase+2;g.wave=g.phase;g.enterDungeon(d);
    return {savedOpened:opened,vaultOpened,immediate,later:{monsters:g.monsters.length,opened:g.dungeonVault.opened,side:g.dungeonExploration[d.id].opened.length}};
  });assert.deepEqual(cycles.savedOpened,['north','south']);assert.equal(cycles.vaultOpened,true);assert.equal(cycles.immediate.monsters,0);assert.equal(cycles.immediate.opened,true);assert.ok(cycles.later.monsters>0);assert.equal(cycles.later.opened,false);assert.equal(cycles.later.side,0);
  writeFileSync(`${output}/dungeon-playtest-v4.2.28.json`,JSON.stringify({entry,journey,killed,cycles,pageErrors:errors},null,2)+'\n');
  assert.equal(errors.length,0);console.log(JSON.stringify({entry,journey,killed,cycles,pageErrors:errors}));
  await context.close();
}finally{await browser.close();}
