import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {JSDOM} from '../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {normalizeNation,DEVELOPMENT_STAGES,headquartersDamageMult,fiscalTotals,drawNationalDevelopment} from '../js/games/iron-squad/nation-rules.js?v=128';
import {distributeSharedBoxToSoldiers,sellWeakSurplusFromBox,calcTreasuryGrossIncome,calcCommanderStipend} from '../js/games/iron-squad/economy-rules.js';
import {saleValue} from '../js/games/iron-squad/equipment-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame}=await import('../js/games/iron-squad/index.js');const {saveSlots}=await import('../js/games/iron-squad/save-slots.js');
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:664,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('NATION TEST ONLY').id;game.startFreshGame(false);const initial=structuredClone(game.saveGame());
for(const count of [0,48,200,1000]){const gross=calcTreasuryGrossIncome(1,count);assert.ok(gross-calcCommanderStipend(1,gross)-count*20>=3000,'regular income covers payroll and leaves at least 3000G');}
game.gold=100000;const before=game.treasury;assert.equal(game.donateToTreasury(10000),true);assert.ok(game.treasury>=before+7500);assert.equal(game.nation.totalDonations,10000);
for(let wave=0;wave<12;wave++){
  const oldTreasury=game.phaseFiscal.startBalance,headcount=game.squad.filter(s=>!s.dead).length+game.reserves.filter(s=>!s.dead).length;
  game.completePhase();const l=game.lastFiscalReport,t=fiscalTotals(l);
  assert.equal(l.salaryShortfall,0);assert.equal(l.salariesPaid,headcount*20);assert.equal(l.endBalance-oldTreasury,t.net,'every recorded receipt and expense reconciles to the actual treasury');
  assert.ok(game.treasury>=Math.max(6000,headcount*40),'investment keeps salary reserves');
  assert.equal(game.phaseFiscal.phase,game.phase);game.finishRest();
}
assert.ok(game.nation.level>=1);assert.ok(game.nation.investment>=6000);assert.equal(game.squad.length,48);assert.ok(game.reserves.length>=60);
// Donations during the safe interval stay in the next period's ledger.
game.completePhase();game.gold=10000;game.donateToTreasury(1000);const restDonation=game.phaseFiscal.donations;game.finishRest();assert.equal(game.phaseFiscal.donations,restDonation);assert.ok(restDonation>=1000);
const gear=(id,type,n,tier=1)=>({id,name:id,type,tier,upgrade:0,stats:{atk:n,def:n},baseStats:{atk:n,def:n},color:'#ddd'});
const strong=gear('strong','WEAPON',1000),weak=gear('weak','WEAPON',1,5),mid=gear('mid','WEAPON',20),s1={id:'1',hp:100,equipped:{weapon:strong}},s2={id:'2',hp:100,equipped:{weapon:weak}};
const dist=distributeSharedBoxToSoldiers([mid],[s1,s2],noop);assert.equal(dist.equippedCount,1);assert.equal(s2.equipped.weapon,mid);assert.ok(dist.remaining.includes(weak),'replaced equipment is preserved for export');
const sold=sellWeakSurplusFromBox(dist.remaining,[s1,s2]);assert.equal(sold.soldCount,1);assert.equal(sold.soldGold,Math.floor(saleValue(weak)*1.6),'external sales earn a markup even for T5 surplus');
const down={isDown:true,hp:0,equipped:{}};assert.equal(sellWeakSurplusFromBox([weak],[s1,s2,down]).soldCount,0,'do not sell supplies that a wounded soldier still needs');
const protectedItem={...weak,id:'protected',favorite:true};assert.equal(sellWeakSurplusFromBox([protectedItem],[s1,s2]).soldCount,0);
// Actual auto-buyout spends real treasury funds and cannot overdraft.
game.resumeSavedGame(structuredClone(initial));game.equipped.weapon=strong;game.treasury=200;game.phaseFiscal.startBalance=200;
const buy=gear('buy','WEAPON',1);game.collectDrop(buy);assert.ok(game.treasury<200);assert.equal(200-game.treasury,game.phaseFiscal.buyouts);assert.ok(game.sharedEquipBox.some(i=>i.id==='buy'));
game.treasury=0;game.collectDrop(gear('poor-buy','WEAPON',1));assert.equal(game.treasury,0);assert.ok(game.inventory.some(i=>i.id==='poor-buy'));
// Voluntary deposits exclude equipment currently equipped or protected.
game.inventory=[strong,protectedItem,gear('donate','ARMOR',30)];game.sharedEquipBox=[];assert.equal(game.depositNationalEquipment(game.inventory.map(i=>i.id)),true);assert.deepEqual(game.sharedEquipBox.map(i=>i.id),['donate']);
// Actual town entry, locked facilities, upgraded discounts, contracts and casino cooldown.
game.nation=normalizeNation({investment:90000});game.gold=10000;game.equipped.weapon=gear('smith','WEAPON',20);const town=game.dungeons.find(d=>d.id==='royal_castle_town');assert.ok(town);game.enterDungeon(town);
const smithGold=game.gold,smithCost=Math.floor(game.getUpgradeCost(game.equipped.weapon)*.8);assert.equal(game.useTownFacility('smith'),true);assert.equal(game.gold,smithGold-smithCost);assert.equal(game.equipped.weapon.upgrade,1);assert.equal(game.useTownFacility('smith'),false);
assert.equal(game.useTownFacility('guild'),true);for(let i=0;i<20;i++)game.onNationKill();const reward=game.nation.guild.reward,guildGold=game.gold;assert.equal(game.useTownFacility('guild'),true);assert.equal(game.gold,guildGold+reward);assert.equal(game.useTownFacility('guild'),false);
const random=Math.random;Math.random=()=>.99;const casinoGold=game.gold;assert.equal(game.useTownFacility('casino'),true);assert.equal(game.gold,casinoGold+150);assert.equal(game.useTownFacility('casino'),false);Math.random=random;
game.exitDungeon();const center=79360;game.player.x=center;game.player.y=center;
const target={x:center,y:center,maxHp:10000,hp:10000,def:0};game.squad=[];game.nation=normalizeNation({investment:180000});assert.equal(headquartersDamageMult(game,target),.7);let displayedDamage;game.spawnDamageText=(x,y,value)=>{if(typeof value==='number')displayedDamage=value;};game.damageTarget(target,100);assert.equal(displayedDamage,70,'developed HQ reduces actual combat damage');game.spawnDamageText=noop;
target.x+=1000;assert.equal(headquartersDamageMult(game,target),1);game.currentDungeon={kind:'town'};target.x=center;assert.equal(headquartersDamageMult(game,target),1,'local town coordinates never receive field defenses');game.currentDungeon=null;
const saved=structuredClone(game.saveGame());game.nation=null;game.resumeSavedGame(saved);assert.equal(game.nation.level,5);assert.equal(game.nation.casinoPhase,saved.nation.casinoPhase);const legacy={...initial};delete legacy.nation;game.resumeSavedGame(legacy);assert.equal(game.nation.level,0);
game.renderStrategyUI();game._selectStratTab('nation');assert.ok(document.getElementById('nation-status').textContent.includes('次ウェーブ'));assert.equal(document.getElementById('nation-status').closest('#view-strat-nation').id,'view-strat-nation');assert.equal(document.getElementById('nation-finances').open,true);game.completePhase();game.renderStrategyUI();assert.ok(document.querySelector('.fiscal-table').textContent.includes('本陣・町の開発'));assert.ok(document.querySelector('.fiscal-net').textContent.includes('黒字'));
// Render the real architecture into pixels at both early and late development levels.
const {createCanvas}=createRequire(resolve('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','entry.cjs'))('@napi-rs/canvas');const canvas=createCanvas(640,640),c=canvas.getContext('2d');
game.nation=normalizeNation({investment:180000});drawNationalDevelopment(c,game,320,320);assert.ok(c.getImageData(0,0,640,640).data.some((n,i)=>i%4===3&&n>0));drawNationalDevelopment(c,game,320,320,true);
// Death keeps this expedition's nation and offers the last living save.
game.nation=normalizeNation({investment:90000,armament:{...game.nation.armament,policy:'balanced',techTier:4}});
game.gold=777;game.treasury=42000;game.player.hp=game.player.maxHp||130;game.saveGame();
const livingGold=saveSlots.get(game.activeSlotId).data.gold;
game.gold=1;game.treasury=99999;game.nation=normalizeNation({investment:180000,armament:{...game.nation.armament,policy:'military',techTier:6}});
game.sharedEquipBox=[{id:'death-box'}];game.player.hp=0;game.gameOver();
const fallen=saveSlots.get(game.activeSlotId);
assert.equal(fallen.state,'fallen');assert.equal(fallen.nation.level,5);assert.equal(fallen.nation.armament.policy,'military');
assert.equal(fallen.data.gold,livingGold);assert.equal(fallen.data.player.hp>0,true);
assert.equal(document.getElementById('game-overlay').classList.contains('hidden'),false);
assert.match(document.getElementById('btn-continue-save').textContent,/セーブからやり直す/);
assert.match(document.getElementById('overlay-nation-note').textContent,/王都/);
document.getElementById('btn-continue-save').click();
assert.equal(game.gold,777);assert.equal(game.nation.level,4);assert.equal(saveSlots.get(game.activeSlotId).state,'active');assert.ok(game.player.hp>0);
const resumed=structuredClone(saveSlots.get(game.activeSlotId).data);resumed.gold=321;resumed.player.hp=80;
saveSlots.update(game.activeSlotId,{checkpoint:{place:'本陣',savedAt:Date.now(),data:resumed}});
game.player.hp=0;game.gameOver();
const point=document.getElementById('btn-continue-checkpoint');
assert.equal(point.classList.contains('hidden'),false);assert.match(point.textContent,/本陣/);
point.click();assert.equal(game.gold,321);assert.equal(game.player.hp>0,true);
game.nation=normalizeNation({investment:180000,armament:{policy:'military',techTier:6}});game.treasury=99999;game.player.hp=0;game.gameOver();
document.getElementById('btn-restart').click();
assert.equal(game.phase,1);assert.equal(game.gold,50);assert.equal(game.treasury,6000);assert.deepEqual(game.sharedEquipBox,[]);
assert.equal(game.nation.level,5);assert.equal(game.nation.investment,180000);assert.equal(game.nation.armament.policy,'military');assert.equal(game.nation.armament.techTier,6);
const separate=saveSlots.create('別遠征');game.activeSlotId=separate.id;game.startFreshGame(false);
assert.equal(game.nation.level,0);assert.equal(game.nation.investment,0);
console.log('PASS: 12 real waves with payroll/reserves and reconciled ledgers, retained donations during rest, equipment priority/markup/protection/buyout/deposits, development/HQ damage, live nation UI, town smith/guild/casino cooldown, save migration and native architecture Canvas; death keeps nation development and can resume the living save or checkpoint');dom.window.close();
