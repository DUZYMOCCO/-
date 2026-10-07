import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {WorldTerrain,WORLD_SIZE} from '../js/games/iron-squad/world.js';
import {initMerchants,ensureMerchants,applyMerchantSave,serializeMerchants,merchantHealingStatus,useMerchantHealing,updateMerchants,refreshMerchantStock,drawMerchantEscort,drawMerchantBody,MERCHANT_RESPAWN_SEC,campHasMerchant} from '../js/games/iron-squad/merchant-rules.js';
import {updateWounded,carriedCount,sanitizeCarriers,syncDragged,hasActiveRopePull,treatWounded,markSoldierDown,attachWounded,handleTransportAI} from '../js/games/iron-squad/casualty-rules.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{};
const ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const center=WORLD_SIZE/2,base={x:center,y:center};let seq=0;
const loot=()=>({id:`test-item-${seq++}`,tier:3,name:'検証品',stats:{atk:3},type:'WEAPON'});
const sites=Array.from({length:30},(_,i)=>({id:`camp_${150+i}_150`,x:center+600+i*15,y:center+200}));
const fixture=()=>({phase:1,merchantCampSeed:123456789,player:{x:0,y:0,hp:40,maxHp:100},gold:150,
  monsters:[],dungeons:[{kind:'town',id:'test_inn',name:'検証宿場',entrance:{x:center+2000,y:center}}],worldTerrain:{visibleCamps:sites}});
const game=fixture();initMerchants(game,loot,base);ensureMerchants(game,loot,base);
const camps=game.merchants.filter(m=>m.placeKind==='field-camp');
assert.ok(camps.length>0&&camps.length<sites.length,'a random subset of real camp sites has merchants');
assert.equal(game.merchants.length,camps.length+2,'the existing base and inn merchants remain');
ensureMerchants(game,loot,base);assert.equal(game.merchants.length,camps.length+2,'repeated discovery never duplicates merchants');
assert.ok(sites.every(site=>camps.some(m=>m.placeId===site.id)===campHasMerchant(game.merchantCampSeed,site.id)));
const m=camps[0];game.player.x=m.x;game.player.y=m.y;
game.player.hp=100;assert.equal(useMerchantHealing(game,m).reason,'full');assert.equal(game.gold,150);assert.equal(m.healingUsed,false);
game.player.hp=40;game.gold=149;assert.equal(useMerchantHealing(game,m).reason,'poor');assert.equal(m.healingUsed,false);
game.gold=150;assert.deepEqual(useMerchantHealing(game,m),{ok:true,restored:60,cost:150});assert.equal(game.player.hp,100);assert.equal(game.gold,0);
game.player.hp=35;game.gold=500;assert.equal(useMerchantHealing(game,m).reason,'cooldown');assert.equal(game.gold,500);assert.equal(game.player.hp,35);
refreshMerchantStock(m,loot,2);assert.equal(m.healingUsed,true,'restocking does not bypass the cooldown');
m.dead=true;m.hp=0;m.respawnIn=1;updateMerchants(game,2,loot);assert.equal(m.dead,false);assert.equal(m.healingUsed,true,'a returning merchant retains the cooldown');
const saved=JSON.parse(JSON.stringify(serializeMerchants(game.merchants)));
const loaded=fixture();loaded.worldTerrain.visibleCamps=[];initMerchants(loaded,loot,base);applyMerchantSave(loaded,saved,loot,base);
const restored=loaded.merchants.find(other=>other.id===m.id);assert.ok(restored);assert.equal(restored.healingUsed,true);
loaded.worldTerrain.visibleCamps=sites;ensureMerchants(loaded,loot,base);
assert.deepEqual(loaded.merchants.filter(m=>m.placeKind==='field-camp').map(m=>[m.id,m.x,m.y]),camps.map(m=>[m.id,m.x,m.y]),'saved camps and future discovery use the same distribution');
assert.equal(restored.name,m.name);assert.deepEqual(restored.escorts[0].appearance,m.escorts[0].appearance);
const other=camps[1];game.player.x=other.x+500;game.player.y=other.y;assert.equal(merchantHealingStatus(game,other),'unavailable');
other.dead=true;game.player.x=other.x;assert.equal(merchantHealingStatus(game,other),'unavailable');other.dead=false;
game.player.hp=0;assert.equal(merchantHealingStatus(game,other),'unavailable','the service is not a resurrection');game.player.hp=10;
const inn=game.merchants.find(m=>m.placeKind==='inn');game.currentDungeon={kind:'town',id:'test_inn'};
assert.equal(merchantHealingStatus(game,inn),'available');assert.equal(merchantHealingStatus(game,other),'unavailable');game.currentDungeon=null;
// Actual procedural terrain exposes the camps that were drawn; eviction and
// regeneration retain their IDs/positions and do not reroll occupancy.
const terrain=new WorldTerrain();let campTile;
for(let y=145;y<160&&!campTile;y++)for(let x=145;x<160;x++){const tile=terrain.get(x,y);if(tile.camps.length){campTile={x,y,camps:tile.camps};break;}}
assert.ok(campTile,'the current world has procedural camp sites');
for(let y=0;y<6;y++)for(let x=0;x<6;x++)terrain.get(x,y);
assert.deepEqual(terrain.get(campTile.x,campTile.y).camps,campTile.camps);
const site=campTile.camps[0];terrain.draw(ctx,{x:site.x,y:site.y},390,664,1);
assert.ok(terrain.visibleCamps.some(s=>s.id===site.id));assert.ok(terrain.tiles.size<=24);
// Real shop handler, gold/HP transaction and saved-game resume.
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');
const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const live=Object.create(IronSquadGame);live.container=document.getElementById('game');
Object.assign(live,{width:390,height:664,zoom:1,ctx,camera:{x:center,y:center},selectedSaleIds:new Set(),commandActiveUntil:0});
live.startGameLoop=noop;live.showToast=noop;live.setupUI();live.activeSlotId=saveSlots.create('MERCHANT TEST ONLY').id;live.startFreshGame(false);
let shop=live.merchants[0];Object.assign(live.player,{x:shop.x,y:shop.y,hp:1});live.gold=150;
live.openMerchantShop(shop);let button=document.querySelector('.merchant-heal-button');assert.equal(button.disabled,false);button.click();
assert.equal(live.gold,0);assert.equal(live.player.hp,live.player.maxHp);assert.equal(document.querySelector('.merchant-heal-button').disabled,true);
const snapshot=saveSlots.get(live.activeSlotId).data;assert.equal(snapshot.merchants.find(m=>m.id===shop.id).healingUsed,true);assert.equal(snapshot.merchantCampSeed,live.merchantCampSeed);
document.querySelector('.btn-close-merchant').click();live.resumeSavedGame(snapshot);shop=live.merchants[0];live.player.x=shop.x;live.player.y=shop.y;live.player.hp=1;live.gold=200;
live.openMerchantShop(shop);assert.match(document.querySelector('.merchant-heal-button').textContent,/あと2ウェーブ/);document.querySelector('.merchant-heal-button').click();assert.equal(live.gold,200);assert.equal(live.player.hp,1);
// Old saves without these fields gain the service and a stable seed normally.
delete snapshot.merchantCampSeed;for(const entry of snapshot.merchants){delete entry.healingUsed;delete entry.healReadyPhase;}
live.resumeSavedGame(snapshot);assert.equal(live.merchants[0].healingUsed,false);assert.ok(Number.isInteger(live.merchantCampSeed));
// Escort movement and attack pose follow the actual AI without changing damage.
const escort=camps[0].escorts[0];game.currentDungeon=null;game.player.x=camps[0].x;game.player.y=camps[0].y;game.monsters=[{x:escort.x+120,y:escort.y,hp:9999,radius:12,atk:1}];
updateMerchants(game,.016,loot);assert.ok(escort.vx>0);
game.monsters[0].x=escort.x+12;escort.atkTimer=0;let hits=0;updateMerchants(game,.016,loot,{damageMonster:()=>hits++});assert.ok(hits>0);assert.equal(escort.atkAnim,1);
const {createCanvas}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');
const paint=(escort,anim)=>{const canvas=createCanvas(220,210),c=canvas.getContext('2d');c.translate(110-escort.x,150-escort.y);drawMerchantEscort(c,{...escort,atkAnim:anim,attackAngle:0},100);return {canvas,c};};
const spear=paint(camps[0].escorts[0],.57),axe=paint(camps[0].escorts[1],.54);
assert.ok(spear.c.getImageData(106,117,8,8).data.some((v,i)=>i%4===3&&v>0),'a head and helmet rise above the old circle');
assert.notDeepEqual(spear.canvas.toBuffer('image/png'),axe.canvas.toBuffer('image/png'),'spear and axe guards have different equipment silhouettes');
// Lethal damage now downs both people, leaving a real rescue window.
const rescueGame=fixture();rescueGame.squad=[];rescueGame.player.isHero=true;
initMerchants(rescueGame,loot,base);ensureMerchants(rescueGame,loot,base);
const trader=rescueGame.merchants.find(m=>m.placeKind==='field-camp');trader.healingUsed=true;
trader.hp=1;for(const e of trader.escorts){e.x=trader.x+5;e.y=trader.y;e.hp=1;}
rescueGame.player.x=trader.x+12;rescueGame.player.y=trader.y;
rescueGame.monsters=[{x:trader.x,y:trader.y,hp:1e9,radius:16,atk:1000}];
updateMerchants(rescueGame,.1,loot);
updateMerchants(rescueGame,1.1,loot);
assert.equal(trader.isDown,true);assert.equal(trader.dead,false);assert.ok(trader.escorts.every(e=>e.isDown&&!e.dead));
assert.equal(merchantHealingStatus(rescueGame,trader),'unavailable');
updateWounded(rescueGame,5);assert.equal(carriedCount(rescueGame,rescueGame.player),2,'the player shares two slots across merchant and escort casualties');
sanitizeCarriers(rescueGame);assert.equal(carriedCount(rescueGame,rescueGame.player),2,'sanitizing retains the final permitted slot');
assert.equal(trader.downTimer,45,'transport pauses the same rescue timer');assert.equal(hasActiveRopePull(rescueGame),true);
const downSave=serializeMerchants(rescueGame.merchants),loadedDown=fixture();loadedDown.squad=[];loadedDown.player.isHero=true;
initMerchants(loadedDown,loot,base);applyMerchantSave(loadedDown,downSave,loot,base);sanitizeCarriers(loadedDown);
assert.equal(carriedCount(loadedDown,loadedDown.player),2,'both ropes survive saved-game state restoration');
const distanceBefore=trader.distance;
rescueGame.monsters=[];rescueGame.player.x=center;rescueGame.player.y=center;
syncDragged(rescueGame,1);updateWounded(rescueGame,0);
assert.equal(trader.isDown,false);assert.equal(trader.hp,trader.maxHp);assert.equal(trader.rescuedToBase,true);
assert.equal(trader.healingUsed,true,'rescuing the merchant does not skip its cooldown');
assert.ok(trader.escorts[0].rescuedToBase);assert.equal(trader.escorts[0].hp,trader.escorts[0].maxHp);
assert.equal(trader.distance,distanceBefore,'rescue does not change the original area used by stock pricing');
assert.equal(trader.exp,undefined,'NPC rescue cannot turn the trader into a leveled army soldier');
updateMerchants(rescueGame,5,loot);updateMerchants(rescueGame,.1,loot);assert.equal(trader.returningToBase,false);
assert.notEqual(trader.homeX,trader.escorts[0].homeX,'rescued people have distinct resting positions');
// A field medic revives the second guard; it evacuates to base and stays there.
const guardPatient=trader.escorts[1],medic={id:'rescue-medic',soldierClass:'MEDIC',hp:100,x:guardPatient.x,y:guardPatient.y};
rescueGame.squad=[medic];assert.equal(treatWounded(rescueGame,medic,guardPatient,.5),false);assert.equal(treatWounded(rescueGame,medic,guardPatient,.5),true);
assert.equal(guardPatient.returningToBase,true);assert.equal(guardPatient.rescuedToBase,true);
updateMerchants(rescueGame,100,loot);updateMerchants(rescueGame,.1,loot);
assert.equal(guardPatient.returningToBase,false);assert.ok(Math.hypot(guardPatient.x-center,guardPatient.y-center)<150);
updateMerchants(rescueGame,30,loot);assert.ok(trader.escorts.every(e=>Math.hypot(e.x-center,e.y-center)<180),'rescued guards do not return to the old field camp');
const permanent=fixture();permanent.squad=[];initMerchants(permanent,loot,base);applyMerchantSave(permanent,serializeMerchants(rescueGame.merchants),loot,base);
const housed=permanent.merchants.find(m=>m.id===trader.id);assert.equal(housed.rescuedToBase,true);assert.equal(housed.x,trader.x);assert.equal(housed.distance,distanceBefore);
assert.ok(housed.escorts.every(e=>e.rescuedToBase));
// Unattended casualties can still die after the normal rescue timeout.
const doomed=permanent.merchants.find(m=>m.placeKind==='field-camp'&&m.id!==housed.id&&!m.isDown&&!m.dead);permanent.player.x=center;permanent.player.y=center;
markSoldierDown(permanent,doomed,{downTimer:.1});updateWounded(permanent,1);assert.equal(doomed.dead,true);assert.ok(doomed.respawnIn>0);
const person=createCanvas(220,210),personCtx=person.getContext('2d');personCtx.translate(110-trader.x,150-trader.y);drawMerchantBody(personCtx,trader);
assert.ok(personCtx.getImageData(105,111,10,15).data.some((v,i)=>i%4===3&&v>0),'the merchant has a visible hat and face, not just a stall');
// The actual expedition save/load path reconstructs NPC casualties and ropes.
const livePatient=live.merchants[0];Object.assign(live.player,{x:livePatient.x+10,y:livePatient.y,hp:100});
markSoldierDown(live,livePatient);updateWounded(live,0);assert.equal(livePatient.carrierId,'player');
live.saveGame();live.resumeSavedGame(saveSlots.get(live.activeSlotId).data);
assert.equal(live.merchants[0].isDown,true);assert.equal(live.merchants[0].carrierId,'player');assert.ok(live._merchantWounded.includes(live.merchants[0]));
const portGame=fixture();portGame.player.x=center;portGame.player.y=center;initMerchants(portGame,loot,base);ensureMerchants(portGame,loot,base);
const portPatient=portGame.merchants.find(m=>m.placeKind==='field-camp');markSoldierDown(portGame,portPatient);
const porter={id:'npc-porter',hp:100,soldierClass:'HEAVY',x:portPatient.x+10,y:portPatient.y,speed:80};portGame.squad=[porter];
portGame.outposts=[{x:porter.x+20,y:porter.y,radius:30,cleared:true}];
assert.equal(attachWounded(portGame,porter,portPatient),true);sanitizeCarriers(portGame);assert.equal(carriedCount(portGame,porter),1);
const portX=porter.x;handleTransportAI(portGame,porter,.5);assert.ok(porter.x<portX,'NPC carriers head to HQ rather than stopping forever at the closer outpost');
console.log('PASS: camp distribution and saves, 150G wave-based healing, actual shop/resume, old saves, human guards and merchant, lethal damage→down, shared rope capacity, carried-state restore, base rescue and permanent stay, medic evacuation and ordinary timeout');
dom.window.close();
