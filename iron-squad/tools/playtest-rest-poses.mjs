import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {startQaServer} from './qa-server.mjs';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const out='iron-squad/docs/validation/town-crowd-v6.11.22';mkdirSync(out,{recursive:true});
for(const mode of ['before','after']){
 const server=await startQaServer(mode==='before'?'iron-squad/docs/backups/town-reference-v6.11.21':null),browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:820},serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.origin);await page.locator('[data-game-id="iron-squad"]').click();await page.locator('#expedition-name').fill('待機姿の比較');await page.locator('#new-expedition-form button').click();await page.locator('#btn-commander-confirm').click();
  await page.waitForFunction(async()=>{const {IronSquadGame:g}=await import('/iron-squad/js/index.js');if(!g.player||!g.running)return false;window.qaGame=g;return true;});
  await page.evaluate(async mode=>{
   qaGame.stopGameLoop();let seed=903;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};const {drawFieldSoldier}=await import('/iron-squad/js/visuals.js'),{createSoldierAppearance}=await import('/iron-squad/js/soldier-appearance.js?v=206'),{SOLDIER_CLASSES}=await import('/iron-squad/js/index.js');
   const canvas=document.createElement('canvas');canvas.id='rest-art-gallery';canvas.width=1120;canvas.height=770;canvas.style='position:fixed;inset:15px;z-index:99999;width:1120px;height:770px';document.body.append(canvas);const c=canvas.getContext('2d');c.showBattleLabels=false;c.fillStyle='#1b292b';c.fillRect(0,0,1120,770);c.fillStyle='#e1d3b3';c.font='bold 20px sans-serif';c.fillText(`${mode==='before'?'変更前 v6.11.21':'変更後 v6.11.22'} — 同じ顔・同じ装備 / ポーズだけ変更`,20,32);
   const poses=[['standing','通常'],['sit','座る'],['drink','飲む'],['eat','食べる'],['hoe','くわ'],['basket','かご'],['tend','手入れ'],['far','遠めの待機']];
   poses.forEach((p,i)=>{c.font='14px sans-serif';c.fillText(p[1],i*140+35,62);});
   ['HEAVY','LIGHT','MEDIC','MAGE'].forEach((key,row)=>{
    const g=qaGame,s=g.createNewSoldier(null,{classKey:key,talent:'AVERAGE',level:12});s.id=`rest-comparison-${row}`;s.gender=row%2?'female':'male';s.appearance=createSoldierAppearance(s.id,s.gender);s.magicAffinity='fire';s.mana=100;s.maxMana=100;
    for(const item of Object.values(s.equipped))if(item)item.tier=8;
    c.fillStyle='#aab5aa';c.font='13px sans-serif';c.fillText(`${SOLDIER_CLASSES[key].name} / ${s.gender}`,18,90+row*170);c.strokeStyle='#405048';c.beginPath();c.moveTo(15,210+row*170);c.lineTo(1105,210+row*170);c.stroke();
    poses.forEach(([pose],col)=>{const unit={...s,x:0,y:0,vx:0,vy:0,atkAnim:0,facingAngle:0,campPose:['sit','drink','eat'].includes(pose)?pose:pose==='far'?'sit':null,farmPose:['hoe','basket','tend'].includes(pose)?pose:null};c.save();c.translate(70+col*140,205+row*170);c.scale(2.8,2.8);drawFieldSoldier(c,unit,1200,SOLDIER_CLASSES[key],'#8eaaad',pose==='far');c.restore();});
   });
  },mode);
  await page.locator('#rest-art-gallery').screenshot({path:`${out}/rest-poses-${mode}.png`});assert.deepEqual(errors,[]);writeFileSync(`${out}/rest-poses-${mode}.json`,JSON.stringify({mode,errors,poses:8,classes:4,sameAppearanceAndEquipment:true},null,2));
 }finally{await browser.close();await server.close();}
}
