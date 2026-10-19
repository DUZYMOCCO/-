// v7.2.2: 忍者・獣人の上位職の中くらいの特技（挑発・群れ狩り・咆哮・狐火・跳び退き・矢の雨・煙玉）。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly}=await import('../js/limited-allies.js?v=335');
const {LIMITED_SKILL_RULES:R,limitedAttackMult,tickLimitedSkills,limitedTauntTarget,limitedSmokeMiss,updateFoxfire,drawLimitedFx}=await import('../js/limited-skills.js?v=336');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
const texts=[];for(const name of ['startGameLoop','showToast','spawnSparks'])game[name]=noop;game.spawnDamageText=(x,y,t)=>texts.push(String(t));
game.setupUI();game.activeSlotId=saveSlots.create('LIMITED SKILLS 2 TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
Object.assign(game,{restTimer:0,currentDungeon:null,projectiles:[],worldTime:100,limitedFx:[]});Object.assign(game.player,{x:83000,y:83000});
const mob=(x,y=83000,extra={})=>({x,y,type:'goblin',hp:1e6,maxHp:1e6,atk:1,def:0,magicDef:0,speed:0,radius:12,atkTimer:0,...extra});
const unit=(id,extra={})=>{const s=createLimitedAlly(game,SOLDIER_CLASSES[id].lineId,'test');s.soldierClass=id;game.recalcSoldierStats(s);s.hp=s.maxHp;return Object.assign(s,{x:83000,y:83000,isPersonalGuard:true,speed:0,atkCooldown:0},extra);};
const step=()=>{game.worldTime+=60;texts.length=0;};
const setMobs=list=>{game.monsters=list;game.rebuildMonsterSpatial?.();};
// Bear taunt (class 1+): nearby enemies aim at the bear, bosses for half the time; it ends when the bear falls.
{const bear=unit('BEAST_BEAR_IWA');game.squad=[bear];const a=mob(83100),b=mob(83120,83020,{isBoss:true}),farMob=mob(83400);setMobs([a,b,farMob]);step();
 tickLimitedSkills(game,bear,.016);ok(texts.includes('🐻挑発'));eq(limitedTauntTarget(game,a),bear);eq(limitedTauntTarget(game,farMob),null,'out of range');
 eq(a._tauntUntil-game.worldTime,R.taunt.duration[1]);eq(b._tauntUntil-game.worldTime,R.taunt.duration[1]/2,'boss half');
 const base=unit('BEAST_BEAR');setMobs([mob(83100)]);step();tickLimitedSkills(game,base,.016);ok(!texts.length,'base bear has no taunt');
 bear.hp=0;eq(limitedTauntTarget(game,a),null,'taunt ends with the bear');}
// Monster AI follows the taunt (real update loop): a taunted enemy leaves the cat beside it alone.
{Object.assign(game,{monsters:[],outposts:[],merchants:[],civilians:[],dropsOnField:[],currentQuest:null,updateSpawns:noop,_monsterGrid:null});game.closeStrategyModal();Object.assign(game,{restTimer:0,_hazardClock:0,worldTerrain:{tiles:new Map()}});game.player.atkCooldown=100;
 const run=taunted=>{const bear=unit('BEAST_BEAR_SANNO',{x:83006,atkCooldown:100,dodge:0,_tauntReadyAt:taunted?0:1e12}),cat=unit('BEAST_CAT',{x:83000,y:83000,dodge:0,atkCooldown:100});game.squad=[cat,bear];
  const m=mob(83000,83000,{speed:0,atk:50,attackInterval:.2});setMobs([m]);
  Object.assign(game.player,{x:83000,y:82750});const hp=cat.hp,bhp=bear.hp;for(let i=0;i<20;i++)game.update(.05);run.bear=bhp-bear.hp;return hp-cat.hp;};
 ok(run(false)>0,'untaunted enemy hits the nearest cat');eq(run(true),0,'the bear taunts in the real loop: the cat is left alone');ok(run.bear>0,'the bear takes the blows');}
// Wolf pack hunt (class 2+) and roar (class 3).
{const g=unit('BEAST_WOLF_GINRO'),target=mob(83030);const allies=[0,1,2,3].map(i=>unit('BEAST_CAT',{x:83030+i*10,y:83040}));game.squad=[g,...allies];game.worldTime=5000;
 eq(+limitedAttackMult(game,g,target).toFixed(3),+(1+3*R.packHunt.perAlly).toFixed(3),'pack hunt caps at 3 allies');
 game.squad=[g,allies[0]];eq(+limitedAttackMult(game,g,target).toFixed(3),1.06);
 const garo=unit('BEAST_WOLF_GARO');game.squad=[garo,...allies];eq(limitedAttackMult(game,garo,target),1,'class 1 has no pack hunt');
 const tenro=unit('BEAST_WOLF_TENRO');game.squad=[tenro];const m1=mob(83050),m2=mob(83060,83040,{isBoss:true}),m3=mob(83070,82980,{isColossal:true});setMobs([m1,m2,m3]);step();
 tickLimitedSkills(game,tenro,.016);ok(texts.includes('🐺咆哮'));eq(m1.magicStunTimer,R.roar.stun);eq(m2.magicStunTimer,R.roar.stun/2);ok(!(m3.magicStunTimer>0),'colossus immune');
 setMobs([mob(83050)]);step();m1.magicStunTimer=0;const solo=game.monsters[0];tickLimitedSkills(game,tenro,.016);ok(!(solo.magicStunTimer>0),'needs two enemies');}
// Fox foxfire: homing flame, magic damage, cooldown by class.
for(const [id,cd] of [['BEAST_FOX_KIKO',6],['BEAST_FOX_TENKO',5.5],['BEAST_FOX_KYUBI',5]]){
 const fox=unit(id);game.squad=[fox];const m=mob(83200);setMobs([m]);game.projectiles=[];step();
 tickLimitedSkills(game,fox,.016);const p=game.projectiles.find(p=>p.type==='FOXFIRE');ok(p,`${id} foxfire`);eq(p.damage,Math.round(fox.atk*R.foxfire.ratio));eq(fox._foxfireReadyAt-game.worldTime,cd);
 tickLimitedSkills(game,fox,.016);eq(game.projectiles.filter(p=>p.type==='FOXFIRE').length,1,'cooldown');
 const hp=m.hp;let done=false;for(let i=0;i<200&&!done;i++)done=updateFoxfire(game,p,.016);ok(done&&m.hp<hp,'flame reaches and burns');
}
{const fox=unit('BEAST_FOX');game.squad=[fox];setMobs([mob(83200)]);game.projectiles=[];step();tickLimitedSkills(game,fox,.016);eq(game.projectiles.length,0,'base fox has no foxfire');}
// Bird leap (class 2+) and arrow rain (class 3).
{const k=unit('BEAST_BIRD_KAZAKIRI');game.squad=[k];setMobs([mob(83040)]);step();tickLimitedSkills(game,k,.016);ok(texts.includes('🪶跳び退き'));
 for(let i=0;i<30;i++)tickLimitedSkills(game,k,.016);ok(Math.abs(k.x-83000-(-R.leap.distance))<1,'leaps 90px away from the enemy');
 const t=unit('BEAST_BIRD_TAKABA');setMobs([mob(83040)]);step();tickLimitedSkills(game,t,.016);ok(!texts.includes('🪶跳び退き'),'class 1 does not leap');
 const karura=unit('BEAST_BIRD_KARURA');game.squad=[karura];const a=mob(83300),b=mob(83330,83030),c=mob(83500);setMobs([a,b,c]);step();
 tickLimitedSkills(game,karura,.016);ok(texts.includes('🦅矢の雨'));ok(game.limitedFx.some(f=>f.kind==='rain'));
 const ha=a.hp,hb=b.hp,hc=c.hp;for(let i=0;i<80;i++){game.worldTime+=.016;tickLimitedSkills(game,karura,.016);}
 ok(a.hp<ha&&b.hp<hb,'rain hits the area');eq(c.hp,hc,'outside untouched');eq(karura._arrowRain,null,'three volleys then done');}
// Ninja smoke (class 3): needs three enemies near; melee attacks inside miss sometimes.
{const k=unit('NINJA_KASHIRA');game.squad=[k];setMobs([mob(83050),mob(83060,83030),mob(83070,82970)]);step();game.limitedFx=[];
 tickLimitedSkills(game,k,.016);ok(texts.includes('🥷煙玉'));const cloud=game.limitedFx.find(f=>f.kind==='smoke');ok(cloud);
 const rnd=Math.random;Math.random=()=>0;ok(limitedSmokeMiss(game,game.monsters[0]),'inside: miss');ok(!limitedSmokeMiss(game,mob(83400)),'outside: hit');Math.random=()=>.99;ok(!limitedSmokeMiss(game,game.monsters[0]),'60% still hit');Math.random=rnd;
 game.worldTime+=R.smoke.duration+.1;ok(!limitedSmokeMiss(game,game.monsters[0]),'smoke fades');
 const j=unit('NINJA_JONIN');step();game.limitedFx=[];tickLimitedSkills(game,j,.016);ok(!game.limitedFx.some(f=>f.kind==='smoke'),'上忍 has no smoke');}
// Effects draw (all kinds) and are capped.
game.limitedFx=[];for(let i=0;i<60;i++)game.limitedFx.push({kind:['ring','smoke','rain'][i%3],x:0,y:0,radius:40,life:1,color:'#fff',start:game.worldTime});drawLimitedFx(ctx,game);ok(game.limitedFx.length<=60);
console.log(`PASS limited-skills-v722 (${checks} checks)`);
