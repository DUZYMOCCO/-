import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('playwright');
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'],browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8000');await page.locator('[data-version-for="iron-squad"]').filter({hasText:release.gameVersion}).waitFor();
  await page.click('[data-game-id="iron-squad"]');await page.locator('#new-expedition-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await page.click('#btn-commander-confirm');
  await page.waitForFunction(async release=>{if(!navigator.serviceWorker.controller)return false;const c=await caches.open('game-iron-squad-'+release.version);for(const f of release.files)if(!await c.match(new URL('/iron-squad/'+f,location.href),{ignoreSearch:true}))return false;return true;},release);
  await context.setOffline(true);await page.reload();await page.locator('[data-game-id="iron-squad"]').waitFor();await page.click('[data-game-id="iron-squad"]');await page.locator('[data-slot-id]').first().click();
  await page.waitForFunction(()=>window.gameStudioInstance?.activeGame?.player);await page.evaluate(()=>gameStudioInstance.activeGame.stopGameLoop());
  const evidence=await page.evaluate(async cache=>{const {campaignScaling,CAMPAIGN_SCALE_VERSION}=await import(`/iron-squad/js/campaign-scaling.js?v=${cache}`),{DUNGEON_DEFS}=await import(`/iron-squad/js/dungeon.js?v=${cache}`),{weaponCombatProfile}=await import(`/iron-squad/js/equipment-rules.js?v=${cache}`),{ammoCapacity}=await import(`/iron-squad/js/supply-rules.js?v=${cache}`);return {rimHp:campaignScaling(79360).hp,borderHp:campaignScaling(48000).hp,scaleVersion:CAMPAIGN_SCALE_VERSION,ammoCache:gameStudioInstance.activeGame.player._ammoCapacity,bossHp:DUNGEON_DEFS.find(d=>d.id==='dungeon_demon_castle').boss.hp,bowCooldown:weaponCombatProfile({weaponStyle:'bow'}).baseCooldown,bowAmmo:ammoCapacity({weapon:{weaponStyle:'bow'},strength:30})};},release.version.slice(1));
  assert.equal(evidence.rimHp,1_000_000);assert.equal(evidence.borderHp,6000);assert.equal(evidence.scaleVersion,2);assert.ok(evidence.ammoCache>0);assert.equal(evidence.bossHp,1_000_000_000);assert.equal(evidence.bowCooldown,.60);assert.equal(evidence.bowAmmo,120);assert.deepEqual(errors,[]);
  if(['6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.casterStrikeCost=await page.evaluate(async cache=>{
      const {CASTER_STRIKE_COST,rollAttributeProfile}=await import(`/iron-squad/js/unit-attributes.js?v=${cache}`),{generateRandomDrop}=await import(`/iron-squad/js/index.js?v=${cache}`),{WORLD_SIZE,northSouthRoadX}=await import(`/iron-squad/js/world.js?v=${cache}`),g=gameStudioInstance.activeGame;
      g.closeStrategyModal();g.restTimer=0;const profile=rollAttributeProfile('MAGE','AVERAGE',()=>.5,true);profile.innate.strength=80;profile.innate.magic=1;
      const caster=g.createNewSoldier(null,{classKey:'MAGE',talent:'AVERAGE',attributeProfile:profile}),weapon=generateRandomDrop(0,'normal',{type:'WEAPON',tier:1,weaponStyle:'hammer',random:()=>.5});caster.equipped.weapon=caster.weapon=weapon;g.recalcSoldierStats(caster);
      caster.y=WORLD_SIZE/2+6000;caster.x=northSouthRoadX(caster.y);caster.mana=100;caster.atkCooldown=0;const mana=[caster.mana],target=()=>({type:'goblin',x:caster.x+25,y:caster.y,hp:1e9,maxHp:1e9,radius:12,def:0});
      const first=g.performCasterMelee(caster,target());mana.push(caster.mana);caster.atkCooldown=0;const second=g.performCasterMelee(caster,target());mana.push(caster.mana);
      return {cost:CASTER_STRIKE_COST,mana,first,second,detailShowsMP55:g.buildSoldierDetailHtml(caster).includes('近接・MP55')};
    },release.version.slice(1));
    assert.deepEqual(evidence.casterStrikeCost,{cost:55,mana:[100,45,45],first:true,second:true,detailShowsMP55:true});
  }
  if(['6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.talentRework=await page.evaluate(async cache=>{
      const {talentGrowth,rollAttributeProfile}=await import(`/iron-squad/js/unit-attributes.js?v=${cache}`),{talentTag}=await import(`/iron-squad/js/talent-labels.js?v=${cache}`),{TALENTS}=await import(`/iron-squad/js/index.js?v=${cache}`),g=gameStudioInstance.activeGame;
      const unit=g.createNewSoldier(null,{classKey:'HEAVY',talent:'INFERIOR',level:40,attributeProfile:rollAttributeProfile('HEAVY','INFERIOR',()=>.5,true)});const before={hp:unit.maxHp,atk:unit.atk,def:unit.def};unit.inferiorGrit=8;g.recalcSoldierStats(unit);const boosted={hp:unit.maxHp,atk:unit.atk,def:unit.def};
      return {growth:[30,35,40,80].map(level=>talentGrowth({talent:'INFERIOR',survivedDeathlines:1,level})),ordinaryInferior:talentGrowth({talent:'INFERIOR',level:40}),geniusGrowth:talentGrowth({talent:'GENIUS',level:40}),geniusBase:[TALENTS.GENIUS.hpMult,TALENTS.GENIUS.atkMult,TALENTS.GENIUS.speedBonus,TALENTS.GENIUS.critBonus],lateTag:talentTag({talent:'INFERIOR',survivedDeathlines:1}),gritExact:boosted.hp===Math.floor(before.hp*1.4)&&boosted.atk===Math.floor(before.atk*1.32)&&boosted.def===Math.floor(before.def*1.24)};
    },release.version.slice(1));
    assert.deepEqual(evidence.talentRework,{growth:[.85,1.2,1.55,1.55],ordinaryInferior:.85,geniusGrowth:2.4,geniusBase:[2,2.2,40,40],lateTag:'🍂大器晩成',gritExact:true});
  }
  if(['6.8.4','6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.merchantMenuAndSkills=await page.evaluate(async cache=>{
      const {normalizeDeathlineSkills,chooseDeathlineSkill}=await import(`/iron-squad/js/deathline-rules.js?v=${cache}`),u={soldierClass:'LIGHT',deathlineSkills:['PHANTOM_STEP','MIRACLE_PRAYER']};normalizeDeathlineSkills(u);
      const g=gameStudioInstance.activeGame,m=g.merchants[0];g.closeStrategyModal();g.player.x=m.x;g.player.y=m.y;g.openMerchantShop(m);const popup=document.getElementById('merchant-shop-popup'),categories=[...popup.querySelectorAll('.merchant-main-menu strong')].map(n=>n.textContent),noInventory=!popup.querySelector('[data-buy]');popup.querySelector('[data-merchant-section="save"]').click();const savePage=popup.dataset.section;g._merchantShopClose();
      return {categories,noInventory,savePage,lightSkills:u.deathlineSkills,healerFirst:chooseDeathlineSkill({soldierClass:'ARCHANGEL',deathlineSkills:[]})};
    },release.version.slice(1));
    assert.deepEqual(evidence.merchantMenuAndSkills,{categories:['回復','取引','セーブ'],noInventory:true,savePage:'save',lightSkills:['PHANTOM_STEP','SURVIVAL_INSTINCT'],healerFirst:'MIRACLE_PRAYER'});
  }
  if(['6.8.0','6.8.1','6.8.2','6.8.3','6.8.4','6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.lightInfantry=await page.evaluate(async cache=>{const {soldierCombatTempo}=await import(`/iron-squad/js/unit-attributes.js?v=${cache}`),{soldierAttackCooldown}=await import(`/iron-squad/js/equipment-rules.js?v=${cache}`),{ammoCombatProfile}=await import(`/iron-squad/js/supply-rules.js?v=${cache}`);return {minTempo:soldierCombatTempo({soldierClass:'LIGHT',quickness:255}),commanderTempo:soldierCombatTempo({isCommander:true,quickness:255}),phantomStoredFloor:soldierAttackCooldown({soldierClass:'LIGHT',quickness:255,deathlineAtkSpeed:25},.01),cannonBashCooldown:ammoCombatProfile({weapon:{weaponStyle:'cannon'},ammo:0,strength:30},{ranged:true,style:'cannon'}).baseCooldown};},release.version.slice(1));
    assert.deepEqual(evidence.lightInfantry,{minTempo:.6,commanderTempo:1,phantomStoredFloor:.15,cannonBashCooldown:1.4});
  }
  if(['6.8.1','6.8.2','6.8.3','6.8.4','6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.reviewFixes=await page.evaluate(async cache=>{
      const {soldierMeleeReload}=await import(`/iron-squad/js/soldier-melee-skills.js?v=${cache}`),{buildTransportRescueAssign}=await import(`/iron-squad/js/casualty-rules.js?v=${cache}`);
      const u={soldierClass:'HEAVY',quickness:15,weapon:{weaponStyle:'sword'},weaponMastery:{sword:0}},slow=soldierMeleeReload({...u,atkSpeed:.1}),fast=soldierMeleeReload({...u,atkSpeed:100});
      const heavy={id:'offline-heavy',soldierClass:'HEAVY',hp:100,x:0,y:0},archer={id:'offline-archer',soldierClass:'ARCHER',hp:100,x:0,y:0},patient={id:'offline-patient',hp:0,isDown:true,x:30,y:0};
      const game={player:{hp:100,x:0,y:0},squad:[heavy,archer,patient],monsters:[{hp:100,x:50,y:0}]},first=[...buildTransportRescueAssign(game).keys()][0]?.id;game.squad=[heavy,patient];
      return {skillSlow:slow,skillFast:fast,rescuerWithArcher:first,rescuerAlone:[...buildTransportRescueAssign(game).keys()][0]?.id};
    },release.version.slice(1));
    assert.deepEqual(evidence.reviewFixes,{skillSlow:6,skillFast:6,rescuerWithArcher:'offline-archer',rescuerAlone:'offline-heavy'});
  }
  if(['6.8.2','6.8.3','6.8.4','6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.merchantSquadPurchase=await page.evaluate(async cache=>{
      const g=gameStudioInstance.activeGame,{generateRandomDrop}=await import(`/iron-squad/js/index.js?v=${cache}`);g.closeStrategyModal();
      const soldier=g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'});soldier.isPersonalGuard=true;soldier.gold=70;g.squad=[soldier];
      const item=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:'bow',tier:2,id:'offline-squad-purchase',merchant:true,random:()=>.5});item._merchantPrice=50;
      const m=g.merchants[0];Object.assign(m,{stock:[item],catalogVersion:3,stockPhase:g.phase,stockTier:Math.min(24,(g.nation.armament.techTier||1)+1)});g.player.x=m.x;g.player.y=m.y;g.gold=200;const old=soldier.equipped.weapon,commander=g.equipped.weapon;g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]')?.click();
      const select=document.getElementById('merchant-recipient');select.value=soldier.id;select.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#merchant-shop-popup [data-buy]:not([data-inherit])').click();
      return {gold:g.gold,soldierGold:soldier.gold,equipped:soldier.equipped.weapon.id,commanderUnchanged:g.equipped.weapon===commander,oldInBag:g.inventory.some(i=>i.id===old.id),soldOut:m.stock.length===0};
    },release.version.slice(1));
    assert.deepEqual(evidence.merchantSquadPurchase,{gold:150,soldierGold:70,equipped:'offline-squad-purchase',commanderUnchanged:true,oldInBag:true,soldOut:true});assert.deepEqual(errors,[]);
  }
  if(['6.8.3','6.8.4','6.9.0','6.9.1','6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.casterMarket=await page.evaluate(()=>{const g=gameStudioInstance.activeGame;g._merchantShopClose();const m=g.merchants[1],supplies=m.stock.filter(i=>i.merchantCasterSupply),mage=g.createNewSoldier(null,{classKey:'MAGE',talent:'AVERAGE'});mage.isPersonalGuard=true;mage.gold=50;g.squad=[mage];g.gold=1e7;g.player.x=m.x;g.player.y=m.y;g.openMerchantShop(m);document.querySelector('#merchant-shop-popup [data-merchant-section="trade"]')?.click();const select=document.getElementById('merchant-recipient');select.value=mage.id;select.dispatchEvent(new Event('change',{bubbles:true}));const tab=document.querySelector('[data-shop-group="caster"]').getAttribute('aria-selected');const wand=supplies.find(i=>i.weaponStyle==='wand');[...document.querySelectorAll('[data-buy]:not([data-inherit])')].find(b=>b.dataset.buyId===wand.id).click();return {supplies:supplies.length,hasStaff:supplies.some(i=>i.weaponStyle==='staff'),hasWand:!!wand,headpieces:supplies.filter(i=>i.type==='HELMET').length,gloves:supplies.filter(i=>i.type==='GLOVES').length,selectedTab:tab,equipped:mage.weapon.weaponStyle,soldierGold:mage.gold};});
    assert.deepEqual(evidence.casterMarket,{supplies:8,hasStaff:true,hasWand:true,headpieces:3,gloves:3,selectedTab:'true',equipped:'wand',soldierGold:50});assert.deepEqual(errors,[]);
  }
  if(['6.10.0','6.11.0','6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.commandMenu=await page.evaluate(()=>{
      const g=gameStudioInstance.activeGame;g._merchantShopClose?.();g.closeScoutDialog?.();g.closeSoldierDetail?.();g.currentDungeon=null;g.player.hp=g.player.maxHp;g.player.isDown=false;
      g.openStrategyModal(true);const travel=document.getElementById('btn-fast-travel'),direct=travel.closest('.dialog-tabs')?.firstElementChild===travel;
      document.getElementById('tab-strat-nation').click();const categories=document.querySelectorAll('#nation-home button').length,donationHidden=getComputedStyle(document.getElementById('view-econ-invest')).display==='none';
      g._openNationPage('territory','technology');g.renderStrategyUI();const retained=g._nationRoute.page==='technology',noEconomyFolds=document.querySelectorAll('#regional-economy-panel details').length===0;
      document.getElementById('btn-strat-window-back').click();document.getElementById('btn-strat-window-back').click();travel.click();const destinationFirst=getComputedStyle(document.getElementById('world-map-canvas')).display==='none'&&document.querySelectorAll('#fast-travel-list button').length>0;
      document.getElementById('btn-world-map-close').click();return {direct,categories,donationHidden,retained,noEconomyFolds,destinationFirst,returnPaused:g.inBattle===false};
    });
    assert.deepEqual(evidence.commandMenu,{direct:true,categories:4,donationHidden:true,retained:true,noEconomyFolds:true,destinationFirst:true,returnPaused:true});assert.deepEqual(errors,[]);
  }
  if(['6.11.1','6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.followerRecovery=await page.evaluate(async()=>{
      const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.startFreshGame(false);g.stopGameLoop();g.updateSpawns=()=>{};
      g.monsters=[];g.reserves=[];g.civilians=[];g.gateGuards=[];g.merchants=[];g.dropsOnField=[];g.currentQuest=null;g.currentDungeon=null;g.phaseTimer=100000;
      const {createLimitedAlly}=await import('/iron-squad/js/limited-allies.js?v=251');const u=createLimitedAlly(g,'NINJA','offline-recovery');Object.assign(u,{isPersonalGuard:true,x:79360+95,y:79360-130,atkCooldown:100000,_guardSlot:0});g.squad=[u];
      Object.assign(g.player,{x:79360+285,y:79360-155,atkCooldown:100000,powerAtkCooldown:100000});g.camera={x:g.player.x,y:g.player.y};g.joystick={active:true,dirX:0,dirY:0};
      let warpedAt=null,unearnedTravel=false;
      for(let i=0;i<200;i++){const x=u.x,y=u.y,walk=u.attributeProfile.practice.travel||0;g.update(.05);if(Math.hypot(u.x-x,u.y-y)>100){warpedAt=(i+1)*.05;unearnedTravel=(u.attributeProfile.practice.travel||0)!==walk;break;}}
      return {warpedAt,distance:Math.hypot(u.x-g.player.x,u.y-g.player.y),unearnedTravel};
    });
    assert.ok(evidence.followerRecovery.warpedAt>=8&&evidence.followerRecovery.warpedAt<10);assert.ok(evidence.followerRecovery.distance<=100);assert.equal(evidence.followerRecovery.unearnedTravel,false);assert.deepEqual(errors,[]);
  }
  if(['6.11.2','6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.guardOnlyTravel=await page.evaluate(()=>{
      const g=gameStudioInstance.activeGame;g.stopGameLoop();g.closeStrategyModal();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.currentDungeon=null;
      const make=(id,personal)=>Object.assign(g.createNewSoldier(null,{classKey:'LIGHT',talent:'AVERAGE'}),{id,isPersonalGuard:personal,x:79360,y:79360});
      const main=make('offline-main',false),guard=make('offline-guard',true),hero=make('offline-hero',true),reserve=make('offline-reserve',true);hero.heroPartyId='heroes';g.squad=[main,guard,hero];g.reserves=[reserve];
      const stationary=[main,hero,reserve],before=stationary.map(u=>[u.x,u.y]);g.fastTravelTo(86000,85000,'offline-travel');
      return {mainHeroReservesUnchanged:JSON.stringify(before)===JSON.stringify(stationary.map(u=>[u.x,u.y])),guardDistance:Math.hypot(guard.x-g.player.x,guard.y-g.player.y)};
    });
    assert.equal(evidence.guardOnlyTravel.mainHeroReservesUnchanged,true);assert.ok(evidence.guardOnlyTravel.guardDistance<=60);assert.deepEqual(errors,[]);
  }
  if(['6.11.3','6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    await page.evaluate(()=>{
      const g=gameStudioInstance.activeGame;g.stopGameLoop();g.currentDungeon=null;g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.gold=303;
      const m=g.merchants[0];g.player.x=m.x;g.player.y=m.y;g.openMerchantShop(m);document.querySelector('[data-merchant-section="save"]').click();
    });
    await page.click('#merchant-shop-popup [data-supply="save"]');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.checkpointChoice),'cancel');await page.click('[data-checkpoint-choice="cancel"]');
    await page.click('#merchant-shop-popup [data-supply="save"]');await page.click('[data-checkpoint-choice="overwrite"]');assert.equal(await page.locator('.checkpoint-notice').textContent(),'セーブしました');
    await page.locator('.checkpoint-notice').waitFor({state:'detached',timeout:2500});
    await page.evaluate(()=>gameStudioInstance.activeGame.gold=999);await page.click('#merchant-shop-popup [data-supply="load"]');assert.equal(await page.evaluate(()=>gameStudioInstance.activeGame.gold),999);
    await page.click('[data-checkpoint-choice="cancel"]');assert.equal(await page.evaluate(()=>gameStudioInstance.activeGame.gold),999);
    await page.click('#merchant-shop-popup [data-supply="load"]');await page.click('[data-checkpoint-choice="load"]');assert.equal(await page.evaluate(()=>gameStudioInstance.activeGame.gold),303);
    evidence.checkpointUX={saveChoice:true,defaultCancel:true,noticeDismissed:true,returnConfirm:true,cancelPreservedProgress:true,restoredGold:303};assert.deepEqual(errors,[]);
  }
  if(['6.11.4','6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.personnelLock=await page.evaluate(()=>{
      const g=gameStudioInstance.activeGame;g._merchantShopClose?.();g.closeStrategyModal();g.stopGameLoop();g.currentDungeon=null;g.career.status='enlisted';
      const make=id=>Object.assign(g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'}),{id,isPersonalGuard:false,platoonId:0,x:79360,y:79360});g.squad=['protected','b','c','d'].map(make);g.reserves=[];g.initPlatoons();
      const toggled=g.toggleSoldierLock('protected'),snapshot=structuredClone(g.saveGame());g.resumeSavedGame(snapshot);g.stopGameLoop();g.closeStrategyModal();
      const persisted=g.squad.find(s=>s.id==='protected').personnelLocked,dismissed=g.dismissSoldier('protected'),sent=g.startPlatoonExpedition(0,4,['protected','b','c','d']);
      return {toggled,persisted,dismissed,sent,dispatched:g.platoons[0].expeditionMemberIds};
    });
    assert.deepEqual(evidence.personnelLock,{toggled:true,persisted:true,dismissed:false,sent:true,dispatched:['b','c','d']});assert.deepEqual(errors,[]);
  }
  if(['6.11.5','6.11.6'].includes(release.gameVersion)){
    evidence.revivalPriority=await page.evaluate(()=>{
      const g=gameStudioInstance.activeGame;g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.currentDungeon=null;g.random=()=>.999;Object.assign(g.player,{x:80560,y:79360});g.inBattle=true;
      const make=(id,cls,distance)=>Object.assign(g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE'}),{id,name:id,isPersonalGuard:true,isDown:true,hp:0,downTimer:45,x:g.player.x+distance,y:g.player.y});
      g.squad=[make('mage','MAGE',2),make('other','LIGHT',60),make('heavy','HEAVY',1),make('medic','MEDIC',70)];g.reserves=[];g.revivalPotion=2;g.refreshSupplyUI();
      const press=()=>{const down=g.squad.filter(s=>s.isDown);document.getElementById('btn-pad-revive').click();return down.find(s=>!s.isDown)?.id;};
      const order=[press(),press()];g.revivalPotion=1;g.refreshSupplyUI();order.push(press());return {order,remaining:g.revivalPotion,allFullHp:g.squad.filter(s=>!s.isDown).every(s=>s.hp===s.maxHp),mageStillDown:g.squad[0].isDown};
    });
    assert.deepEqual(evidence.revivalPriority,{order:['medic','heavy','other'],remaining:0,allFullHp:true,mageStillDown:true});assert.deepEqual(errors,[]);
  }
  if(release.gameVersion==='6.11.6'){
    evidence.reserveExpedition=await page.evaluate(async()=>{
      const g=gameStudioInstance.activeGame,{activeExpeditionReserves}=await import('/iron-squad/js/expedition-rules.js?v=256'),{FARM_X,FARM_Y,farmPosts}=await import('/iron-squad/js/reserve-farm.js?v=256');
      g.stopGameLoop();g.startFreshGame(false);g.stopGameLoop();g.closeStrategyModal();g.career.status='enlisted';g.currentDungeon=null;g.expeditionPicks={};
      const make=id=>Object.assign(g.createNewSoldier(null,{classKey:'HEAVY',talent:'AVERAGE'}),{id,name:id,platoonId:2,isPersonalGuard:false,x:79360,y:79360});g.reserves=['reserve-a','reserve-b','reserve-c','locked'].map(make);g.reserves[3].personnelLocked=true;
      const sent=g.startPlatoonExpedition(0,2,g.reserves.map(s=>s.id)),ids=[...g.platoons[0].expeditionMemberIds],departedFromFarm=Math.hypot(g.reserves[0].x-FARM_X,g.reserves[0].y-FARM_Y)<1200,farmWorkers=farmPosts(g.reserves).length;
      const snapshot=structuredClone(g.saveGame());g.resumeSavedGame(snapshot);g.stopGameLoop();g.closeStrategyModal();const resumed=activeExpeditionReserves(g).length;
      g.recallPlatoonExpedition(0);g.completePlatoonExpeditionReturn(g.platoons[0]);return {sent,ids,departedFromFarm,farmWorkers,resumed,main:g.squad.length,reserves:g.reserves.length,returnedToFarm:Math.hypot(g.reserves[0].x-FARM_X,g.reserves[0].y-FARM_Y)<1200,away:activeExpeditionReserves(g).length};
    });
    assert.deepEqual(evidence.reserveExpedition,{sent:true,ids:['reserve-a','reserve-b','reserve-c'],departedFromFarm:true,farmWorkers:1,resumed:3,main:48,reserves:4,returnedToFarm:true,away:0});assert.deepEqual(errors,[]);
  }
  const report={version:release.gameVersion,cache:release.version,assets:release.files.length,allAssetsCached:true,offlineResume:true,evidence,pageErrors:errors,disposableBrowserStorage:true};writeFileSync(`${process.argv[2]||'iron-squad/docs/previews/campaign-ranged-v6.7.0-20261013'}/offline-playtest.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));await context.close();
}finally{await browser.close();}
