// v7.2.1: 忍者・獣人の上位職の軽い特技と式典服。
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,confirm:()=>true,alert:()=>{}});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,SOLDIER_CLASSES}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js');
const {createLimitedAlly,updateNinja,LIMITED_ADVANCED_CLASSES}=await import('../js/limited-allies.js?v=335');
const {LIMITED_SKILL_RULES,limitedAttackMult,limitedCritFollowUp,limitedDamageTakenMult,tickLimitedSkills,drawLimitedFx}=await import('../js/limited-skills.js?v=335');
const {classRegaliaFor}=await import('../js/class-regalia.js?v=335');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
const texts=[];for(const name of ['startGameLoop','showToast','spawnSparks'])game[name]=noop;game.spawnDamageText=(x,y,t)=>texts.push(String(t));
game.setupUI();game.activeSlotId=saveSlots.create('LIMITED SKILLS TEST ONLY').id;game.startFreshGame(false);game.career.status='enlisted';
let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;},eq=(a,b,m)=>{assert.equal(a,b,m);checks++;};
Object.assign(game,{restTimer:0,currentDungeon:null,projectiles:[],worldTime:100});Object.assign(game.player,{x:83000,y:83000});
const mob=(x,y=83000)=>({x,y,type:'goblin',hp:1e6,maxHp:1e6,atk:1,def:0,speed:0,radius:12,atkTimer:0});
const unit=(id,extra={})=>{const s=createLimitedAlly(game,SOLDIER_CLASSES[id].lineId,'test');s.soldierClass=id;game.recalcSoldierStats(s);s.hp=s.maxHp;return Object.assign(s,{x:83000,y:83000,isPersonalGuard:true,speed:0,atkCooldown:0},extra);};
// Ninja: shuriken counts by class (base 1, 中忍・上忍 2, 影頭領 3), extra ones to other enemies.
for(const [id,count,mult] of [['NINJA',1,.7],['NINJA_CHUNIN',2,.5],['NINJA_JONIN',2,.5],['NINJA_KASHIRA',3,.42]]){
  const s=unit(id);game.squad=[s];game.monsters=[mob(83200),mob(83210,83040),mob(83190,82960)];game.rebuildMonsterSpatial?.();game.projectiles=[];
  updateNinja(game,s,.01,game.platoons[0]);const shots=game.projectiles.filter(p=>p.type==='NINJA_SHURIKEN');
  eq(shots.length,count,`${id} throws ${count}`);eq(shots[0].damage,Math.round(s.atk*mult));
  eq(new Set(shots.map(p=>p.target)).size,count,'extra shuriken pick other enemies');
}
// Wolf howl: nearby allies get ATK+ for a while; cooldown; ring effect.
const wolf=unit('BEAST_WOLF_GARO'),friend=unit('BEAST_CAT',{x:83060}),far=unit('BEAST_CAT',{x:83600});game.squad=[wolf,friend,far];game.monsters=[mob(83200)];game.rebuildMonsterSpatial?.();game.limitedFx=[];texts.length=0;
tickLimitedSkills(game,wolf,.016);
ok(texts.includes('🐺遠吠え'),'howl is shown');eq(game.limitedFx.length,1,'ring effect');
eq(limitedAttackMult(game,friend,game.monsters[0]),1.10);eq(limitedAttackMult(game,game.player,game.monsters[0]),1.10,'the commander hears it too');eq(limitedAttackMult(game,far,game.monsters[0]),1,'out of range');
texts.length=0;tickLimitedSkills(game,wolf,.016);ok(!texts.length,'cooldown');
game.worldTime+=LIMITED_SKILL_RULES.howl.duration+.1;eq(limitedAttackMult(game,friend,game.monsters[0]),1,'expires');
const tenro=unit('BEAST_WOLF_TENRO',{x:83000});game.squad=[tenro];game.worldTime=500;tickLimitedSkills(game,tenro,.016);eq(limitedAttackMult(game,tenro,game.monsters[0]),1.15,'天狼 +15%');
const base=unit('BEAST_WOLF');game.worldTime=900;texts.length=0;tickLimitedSkills(game,base,.016);ok(!texts.length,'base wolf has no howl');
game.restTimer=5;game.worldTime=1500;texts.length=0;tickLimitedSkills(game,tenro,.016);ok(!texts.length,'no skills while resting');game.restTimer=0;
// Bird hawk eye: far shots stronger.
for(const [id,bonus] of [['BEAST_BIRD',1],['BEAST_BIRD_TAKABA',1.10],['BEAST_BIRD_KAZAKIRI',1.12],['BEAST_BIRD_KARURA',1.15]]){const b=unit(id);game.worldTime+=10;eq(limitedAttackMult(game,b,mob(83300)),bonus,`${id} far`);eq(limitedAttackMult(game,b,mob(83100)),1,`${id} near`);}
// Cat: dodge, crit follow-up.
for(const [id,dodge,follow] of [['BEAST_CAT',0,0],['BEAST_CAT_SUZU',8,0],['BEAST_CAT_KAGE',10,.4],['BEAST_CAT_NEKOMATA',12,.4]]){const c=unit(id);ok(c.dodge>=dodge&&c.dodge-dodge<=(c.dodge-(SOLDIER_CLASSES[id].bonusDodge||0))+dodge,'dodge');eq(SOLDIER_CLASSES[id].bonusDodge||0,dodge);eq(limitedCritFollowUp(c),follow);}
{const c=unit('BEAST_CAT_KAGE',{crit:1000});const target=mob(83040);game.monsters=[target];const orig=game.performAttack;let follow=0;game.performAttack=function(...a){if(a[5]==='followup')follow++;return orig.apply(this,a);};
 texts.length=0;const rnd=Math.random;Math.random=()=>0;game.performAttack(c,target,false,1000,false);Math.random=rnd;game.performAttack=orig;eq(follow,1,'one follow-up per crit');ok(texts.includes('🐾追撃'));}
// Bear brace (class 2+ at half HP) and last stand (bear / cat class 3, once per 作戦期).
{const b1=unit('BEAST_BEAR_IWA'),b2=unit('BEAST_BEAR_TETSU');b1.hp=b1.maxHp*.4;b2.hp=b2.maxHp*.4;eq(limitedDamageTakenMult(b1),1);eq(limitedDamageTakenMult(b2),.85);b2.hp=b2.maxHp*.8;eq(limitedDamageTakenMult(b2),1);}
for(const [id,expectHp] of [['BEAST_BEAR_SANNO',s=>Math.ceil(s.maxHp*.35)],['BEAST_CAT_NEKOMATA',()=>1]]){
  const s=unit(id,{dodge:0,def:0,dmgReduction:0});game.squad=[s];s.hp=10;texts.length=0;game.phase=3;
  game.damageTarget(s,1e7,{environmental:true});eq(s.isDown||false,false,`${id} stands once`);eq(Math.round(s.hp),expectHp(s));ok(texts.some(t=>/再起|身返し/.test(t)));
  s.hp=5;game.damageTarget(s,1e7,{environmental:true});ok(s.isDown||s.hp<=0,'only once per 作戦期');
}
{const s=unit('BEAST_BEAR_TETSU',{dodge:0});game.squad=[s];s.hp=5;game.damageTarget(s,1e7,{environmental:true});ok(s.isDown||s.hp<=0,'class 2 has no last stand');}
// Regalia for all 18, without headpieces over ears/masks; effects draw without error.
for(const id of Object.keys(LIMITED_ADVANCED_CLASSES)){const r=classRegaliaFor({soldierClass:id});ok(r&&r.noHeadpiece,`${id} regalia`);eq(r.name,SOLDIER_CLASSES[id].name);}
game.limitedFx=[{kind:'ring',x:0,y:0,radius:40,life:1,color:'#fff',start:game.worldTime}];drawLimitedFx(ctx,game);eq(game.limitedFx.length,1);game.worldTime+=2;drawLimitedFx(ctx,game);eq(game.limitedFx.length,0,'effects expire');
console.log(`PASS limited-skills-v721 (${checks} checks)`);
