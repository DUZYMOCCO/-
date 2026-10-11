// Read-only class costume audit, using the actual browser Canvas renderer.
// Requires the repository server on :8000. The harness uses disposable storage.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const output='iron-squad/docs/previews/class-up-audit-20261011';
mkdirSync('iron-squad/docs/previews',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
try {
  const context=await browser.newContext({viewport:{width:1280,height:1520},deviceScaleFactor:1,serviceWorkers:'block'});
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
    style.textContent=`html,body{height:auto;overflow:auto;background:#17221f;color:#e0dbc9;font-family:'Yu Gothic',sans-serif}*{box-sizing:border-box}.audit{width:1280px;padding:28px 32px}.audit h1{font-size:24px;margin:0 0 8px}.audit p{font-size:14px;color:#b8c3b9;margin:0 0 16px;line-height:1.7}.audit-grid{display:grid;grid-template-columns:112px repeat(4,1fr);gap:8px}.audit-column{padding:10px;background:#283a31;font-size:15px;text-align:center;border-radius:6px}.audit-row-name{display:flex;align-items:center;font-size:17px;font-weight:bold}.audit-cell{background:#22332b;border:1px solid #3d4b3f;border-radius:7px;overflow:hidden;height:212px;text-align:center}.audit-name{font-weight:bold;font-size:16px;line-height:1.5;min-height:33px;padding:6px 3px 0}.audit-cell canvas{width:260px;height:158px;display:block;margin:auto}.audit-note{font-size:12px;color:#acb9a8;line-height:18px}.audit-foot{margin-top:16px!important;padding:12px;background:#283a31;border-radius:6px}`;
    document.head.append(style);
    const root=document.createElement('main');root.className='audit';
    root.innerHTML='<h1>IRON SQUAD — クラスアップの見た目を比較</h1><p>2026-10-11 / v4.2.26　実ゲームの描画関数を使用。各行は同じ人物・同じ武器・同じ時刻。<br>職衣装が見えるよう防具を外し、名前・HPバーを非表示。装備Tierによる外観差は含めていません。</p>';
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
        const canvas=document.createElement('canvas');canvas.width=260;canvas.height=158;cell.append(canvas);
        const c=canvas.getContext('2d');c.showBattleLabels=false;c.translate(130,135);c.scale(2.7,2.7);
        if(base==='COMMANDER')drawFieldCommander(c,{x:0,y:0,level:50,hp:100,maxHp:100,appearance,isAdvanced:stage.tier>0,advancedClass:stage.tier?stage.id:null,facingAngle:0},equipment,1200,0,'隊長',false,true);
        else drawFieldSoldier(c,{id:`class-audit-${base}`,soldierClass:stage.id,appearance,x:0,y:0,level:50,hp:100,maxHp:100,equipped:equipment,portrait:true,facingAngle:0,vx:0,vy:0,magicAffinity:'fire'},1200,SOLDIER_CLASSES[stage.id],'#859b8b',false);
        rasters.push(Array.from(c.getImageData(0,0,260,158).data));
        const note=document.createElement('div');note.className='audit-note';
        note.textContent=stage.tier>1?'第2・第3段階の専用差分なし':stage.tier===1?(base==='MAGE'?'以降の上位職と同じ外観':'最初の上位職の差分あり'):'基本の外観';cell.append(note);grid.append(cell);
      }
      checks.push({base,stages:stages.map(s=>s.id),tier2EqualsTier3:same(rasters[2],rasters[3]),tier1EqualsTier2:same(rasters[1],rasters[2])});
    }
    const foot=document.createElement('p');foot.className='audit-foot';foot.textContent='確認結果：第2・第3段階は全系統でピクセル一致。魔法と隊長は第1〜第3段階も一致。段階別の名称・能力定義があっても、専用の見た目へ接続されていません。';root.append(foot);document.body.append(root);
    return {date:'2026-10-11',gameVersion:'4.2.26',conditions:'same identity / same weapon / no armor / fixed time / labels hidden / real browser Canvas',checks};
  });
  if(audit.checks.some(row=>!row.tier2EqualsTier3))throw new Error('The live renderer differs from the audit result; inspect the gallery.');
  await page.screenshot({path:`${output}.png`,fullPage:true});
  writeFileSync(`${output}.json`,JSON.stringify({...audit,pageErrors:errors},null,2)+'\n');
  await context.close();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({image:`${output}.png`,...audit,pageErrors:errors}));
}finally{await browser.close();}
