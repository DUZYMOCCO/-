// Upper-class costume and loot preview, using the real browser Canvas renderer.
// Requires the repository server on :8000. The harness uses disposable storage.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const output='iron-squad/docs/previews/class-up-v4.2.27';
mkdirSync('iron-squad/docs/previews',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1280,height:1720},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');
  await page.waitForFunction(()=>window.qualityReady);
  const audit=await page.evaluate(async()=>{
    qualityGame.stopGameLoop();
    const {SOLDIER_CLASSES}=await import('/iron-squad/js/index.js');
    const {drawFieldSoldier,drawFieldCommander}=await import('/iron-squad/js/visuals.js');
    const {createSoldierAppearance}=await import('/iron-squad/js/soldier-appearance.js');
    const {defaultCommanderAppearance}=await import('/iron-squad/js/commander-identity.js');
    const {PLAYER_CLASS_STAGES}=await import('/iron-squad/js/class-up-rules.js');
    document.querySelector('#game').style.display='none';
    const style=document.createElement('style');
    style.textContent=`html,body{height:auto;overflow:auto;background:#17221f;color:#e0dbc9;font-family:'Yu Gothic',sans-serif}*{box-sizing:border-box}.audit{width:1280px;padding:28px 32px}.audit h1{font-size:24px;margin:0 0 8px}.audit p{font-size:14px;color:#b8c3b9;margin:0 0 16px;line-height:1.7}.audit-grid{display:grid;grid-template-columns:112px repeat(4,1fr);gap:8px}.audit-column{padding:10px;background:#283a31;font-size:15px;text-align:center;border-radius:6px}.audit-row-name{display:flex;align-items:center;font-size:17px;font-weight:bold}.audit-cell{background:#22332b;border:1px solid #3d4b3f;border-radius:7px;overflow:hidden;height:230px;text-align:center}.audit-name{font-weight:bold;font-size:16px;line-height:1.5;min-height:33px;padding:6px 3px 0}.audit-cell canvas{width:260px;height:176px;display:block;margin:auto}.audit-note{font-size:12px;color:#acb9a8;line-height:18px}.audit-foot{margin-top:16px!important;padding:12px;background:#283a31;border-radius:6px}`;
    document.head.append(style);
    const root=document.createElement('main');root.className='audit';
    root.innerHTML='<h1>IRON SQUAD — 上位職の礼装</h1><p>2026-10-11 / v4.2.27　実ゲームの描画関数を使用。各行は同じ人物・同じ武器・同じ時刻。<br>職衣装が見えるよう防具を外し、名前・HPバーを非表示。装備Tierによる外観差は含めていません。</p>';
    const grid=document.createElement('div');grid.className='audit-grid';root.append(grid);
    for(const label of ['系統','基本職','上位職（第1段階）','極職（第2段階）','伝説職（第3段階）']){
      const heading=document.createElement('div');heading.className='audit-column';heading.textContent=label;grid.append(heading);
    }
    const checks=[];
    const same=(a,b)=>a.every((value,i)=>value===b[i]);
    const rows=[['HEAVY','重装'],['LIGHT','軽装'],['ARCHER','弓'],['MEDIC','衛生'],['MAGE','魔法'],['COMMANDER','隊長']];
    for(const [base,label] of rows){
      const name=document.createElement('div');name.className='audit-row-name';name.textContent=label;grid.append(name);
      const stages=[];
      if(base==='COMMANDER')stages.push(...PLAYER_CLASS_STAGES.map(stage=>({id:stage.id||'COMMANDER',name:stage.name,tier:stage.tier})));
      else {let key=base;while(key){const cls=SOLDIER_CLASSES[key];stages.push({id:key,name:cls.name,tier:cls.classTier||0});key=cls.advancedClassId;}}
      const weaponStyle=base==='ARCHER'?'bow':['MEDIC','MAGE'].includes(base)?'staff':'sword';
      const equipment={weapon:{id:'audit-weapon',type:'WEAPON',tier:1,upgrade:0,name:'比較用武器',weaponStyle,color:'#bbc4bb',stats:{atk:10}}};
      const appearance=base==='COMMANDER'?defaultCommanderAppearance():createSoldierAppearance(`class-audit-${base}`);
      const rasters=[];
      for(const stage of stages){
        const cell=document.createElement('div');cell.className='audit-cell';
        const title=document.createElement('div');title.className='audit-name';title.textContent=stage.name;cell.append(title);
        const canvas=document.createElement('canvas');canvas.width=260;canvas.height=176;cell.append(canvas);
        const c=canvas.getContext('2d');c.showBattleLabels=false;c.translate(124,147);c.scale(2.5,2.5);
        if(base==='COMMANDER')drawFieldCommander(c,{x:0,y:0,level:50,hp:100,maxHp:100,appearance,isAdvanced:stage.tier>0,advancedClass:stage.tier?stage.id:null,facingAngle:0},equipment,1200,0,'隊長',false,true);
        else drawFieldSoldier(c,{id:`class-audit-${base}`,soldierClass:stage.id,appearance,x:0,y:0,level:50,hp:100,maxHp:100,equipped:equipment,portrait:true,facingAngle:0,vx:0,vy:0,magicAffinity:'fire'},1200,SOLDIER_CLASSES[stage.id],'#859b8b',false);
        rasters.push(Array.from(c.getImageData(0,0,260,176).data));
        const note=document.createElement('div');note.className='audit-note';
        note.textContent=stage.tier===3?'伝説職：重ね飾り・宝石・大きな頭飾り':stage.tier===2?'極職：二重裾・金具・頭飾りを追加':stage.tier===1?'上位職：専用マント・肩飾り・胸章':'基本の外観';cell.append(note);grid.append(cell);
      }
      checks.push({base,stages:stages.map(s=>s.id),tier2EqualsTier3:same(rasters[2],rasters[3]),tier1EqualsTier2:same(rasters[1],rasters[2])});
    }
    const foot=document.createElement('p');foot.className='audit-foot';foot.textContent='各系統の3上位段階を専用礼装で描き分け。人物の顔・体格と実際の装備は維持。スキルと能力値の変更は含めていません。';root.append(foot);document.body.append(root);
    return {date:'2026-10-11',gameVersion:'4.2.27',conditions:'same identity / same weapon / no armor / fixed time / labels hidden / real browser Canvas',checks};
  });
  if(audit.checks.some(row=>row.tier2EqualsTier3||row.tier1EqualsTier2))throw new Error('Upper-class stage costumes must differ; inspect the gallery.');
  await page.screenshot({path:`${output}.png`,fullPage:true});
  writeFileSync(`${output}.json`,JSON.stringify({...audit,pageErrors:errors},null,2)+'\n');
  // Boot another disposable expedition for actual field input, pickup and vault checks.
  const field=await context.newPage();field.on('pageerror',e=>errors.push(e.message));
  await field.setViewportSize({width:375,height:667});
  await field.goto('http://localhost:8000/iron-squad/tools/canvas-quality-review.html');
  await field.waitForFunction(()=>window.qualityReady);
  await field.evaluate(async()=>{
    const g=qualityGame;g.stopGameLoop();
    const {SOLDIER_CLASSES,generateRandomDrop,applyUpgradeStats}=await import('/iron-squad/js/index.js');
    const {WORLD_SIZE}=await import('/iron-squad/js/world.js');
    window.__classes=SOLDIER_CLASSES;
    const equipment=role=>{
      const result={};
      for(const [type,key] of [['WEAPON','weapon'],['ARMOR','armor'],['HELMET','helmet'],['GLOVES','gloves'],['LEGS','legs']]){
        result[key]=generateRandomDrop(0,'normal',{tier:20,type,quality:1,upgrade:0,merchant:true,random:()=>.5});
      }
      result.weapon.weaponStyle=role==='ARCHER'?'bow':['MEDIC','MAGE'].includes(role)?'staff':'sword';
      applyUpgradeStats(result.weapon,0);return result;
    };
    g.monsters=[];g.updateSpawns=()=>{};g.worldObjs=[];g.reserves=[];g.gateGuards=[];g.civilians=[];g.merchants=[];
    g.dropsOnField=[];g.inventory=[];g.treasury=0;g.currentDungeon=null;g.restTimer=0;g.inBattle=true;g.zoom=1.1;
    Object.assign(g.player,{x:WORLD_SIZE/2+900,y:WORLD_SIZE/2+900,isAdvanced:true,advancedClass:'MYTHIC_EMPEROR',level:50,isDown:false});
    g.equipped=equipment('COMMANDER');g.recalcPlayerStats();g.player.hp=g.player.maxHp;
    const positions=[[-80,40],[80,40],[-80,-45],[80,-45],[0,-110]];
    const bases=['HEAVY','LIGHT','ARCHER','MEDIC','MAGE'];
    g.squad=bases.map((base,i)=>{
      const s=g.createNewSoldier(null,{classKey:base,talent:'AVERAGE',level:50});
      let key=base;while(SOLDIER_CLASSES[key].advancedClassId)key=SOLDIER_CLASSES[key].advancedClassId;
      Object.assign(s,{soldierClass:key,equipped:equipment(base),x:g.player.x+positions[i][0],y:g.player.y+positions[i][1],isPersonalGuard:true,campPose:null,farmPose:null});
      g.recalcSoldierStats(s);s.hp=s.maxHp;return s;
    });
    g.camera={x:g.player.x,y:g.player.y-20};g.resizeCanvas();g.updateStatsUI();g.render();
    window.__makeDrop=(extra,dx=140,dy=0)=>({x:g.player.x+dx,y:g.player.y+dy,remainingLife:60,...extra});
    g.dropsOnField=[__makeDrop({isMagicStone:true,mana:20},135,80),__makeDrop({isAmmo:true,ammo:5},-135,80),__makeDrop({item:generateRandomDrop(0,'normal',{tier:28,type:'HELMET',quality:1,merchant:true,random:()=>.5})},0,150)];
    g.render();
  });
  await field.screenshot({path:'iron-squad/docs/previews/class-loot-field-mobile-v4.2.27.png'});
  const pickup=await field.evaluate(()=>{
    const g=qualityGame,before=g.dropsOnField.map(d=>({x:d.x,y:d.y}));
    g.update(1/60);
    const moving=g.dropsOnField.map((d,i)=>Math.hypot(d.x-g.player.x,d.y-g.player.y)<Math.hypot(before[i].x-g.player.x,before[i].y-g.player.y));
    for(let i=0;i<30;i++)g.update(1/60);
    g.render();return {beforeCount:before.length,moving,remaining:g.dropsOnField.length,inventory:g.inventory.length};
  });
  assert.equal(pickup.beforeCount,3);assert.ok(pickup.moving.every(Boolean));assert.equal(pickup.remaining,0);assert.equal(pickup.inventory,1);
  await field.screenshot({path:'iron-squad/docs/previews/drop-pickup-mobile-v4.2.27.png'});
  const start=await field.evaluate(()=>({x:qualityGame.player.x,y:qualityGame.player.y}));
  await field.mouse.move(95,300);await field.mouse.down();await field.mouse.move(145,300);
  const movement=await field.evaluate(()=>{
    const g=qualityGame;g.update(.1);g.render();return {x:g.player.x,y:g.player.y,active:g.joystick.active};
  });
  await field.mouse.up();assert.ok(movement.active&&Math.hypot(movement.x-start.x,movement.y-start.y)>0,'real pointer input moves the commander');
  const pause=await field.evaluate(()=>{
    const g=qualityGame,drop=__makeDrop({isAmmo:true,ammo:1});g.dropsOnField=[drop];
    const x=drop.x;g.inBattle=false;g.update(1);const unchanged=drop.x===x&&drop.remainingLife===60;
    g.inBattle=true;g.dropsOnField=[];return unchanged;
  });assert.ok(pause,'pause freezes attraction and expiry');
  await field.setViewportSize({width:844,height:666});
  await field.evaluate(()=>{qualityGame.camera={x:qualityGame.player.x,y:qualityGame.player.y};qualityGame.resizeCanvas();qualityGame.render();});
  await field.screenshot({path:'iron-squad/docs/previews/class-loot-field-desktop-v4.2.27.png'});
  await field.evaluate(async()=>{
    const g=qualityGame;const {DUNGEON_DEFS}=await import('/iron-squad/js/dungeon.js?v=177');
    const def=DUNGEON_DEFS.find(d=>d.id==='dungeon_dragon_cavern');
    g.currentDungeon=def;g.squad=[];g.monsters=[];g.dropsOnField=[];
    g.dungeonVault={x:def.width-240,y:def.height/2,name:`${def.name}の至宝箱`,opened:false,unlocked:true,dungeon:def};
    g.player.x=g.dungeonVault.x-80;g.player.y=g.dungeonVault.y+75;g.camera={x:g.player.x,y:g.player.y};g.resizeCanvas();g.render();
  });
  await field.screenshot({path:'iron-squad/docs/previews/treasure-vault-v4.2.27.png'});
  const vault=await field.evaluate(()=>{
    const g=qualityGame,inventoryBefore=g.inventory.length;
    g.player.x=g.dungeonVault.x;g.player.y=g.dungeonVault.y+30;g.update(1/60);g.render();
    return {opened:g.dungeonVault.opened,rewards:g.dropsOnField.length+g.inventory.length-inventoryBefore,remainingDrops:g.dropsOnField.length};
  });assert.equal(vault.opened,true);assert.equal(vault.rewards,5);
  await field.screenshot({path:'iron-squad/docs/previews/treasure-vault-open-v4.2.27.png'});
  writeFileSync('iron-squad/docs/previews/class-loot-playtest-v4.2.27.json',JSON.stringify({pickup,movement,pause,vault,pageErrors:errors},null,2)+'\n');
  await context.close();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({image:`${output}.png`,...audit,pageErrors:errors}));
}finally{await browser.close();}
