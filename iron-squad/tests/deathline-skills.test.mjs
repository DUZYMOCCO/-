import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {revivalCooldownOf,REVIVAL_COOLDOWN,revivalSkillCooldownLeft,normalizeRevivalSkill} from '../js/casualty-rules.js';
import {tickDeathline,lowHpGuardActive} from '../js/deathline-rules.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,DEATHLINE_SKILLS}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const game=Object.create(IronSquadGame);
Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnSparks','spawnDamageText'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('DEATHLINE SKILLS TEST').id;game.startFreshGame(false);game.career.status='enlisted';game.closeStrategyModal();
game.monsters=[];game.reserves=[];game.sharedEquipBox=[];
const unit=(classKey,skills=[])=>{
  const u=game.createNewSoldier(null,{classKey,talent:'AVERAGE',attributeProfile:rollAttributeProfile(classKey,'AVERAGE',()=>.5,true)});
  u.attributeProfile=rollAttributeProfile(classKey,'AVERAGE',()=>.5,true);u._attributesNormalized=false;
  u.equipped={};u.weapon=null;u.deathlineSkills=[...skills];game.recalcSoldierStats(u);u.hp=u.maxHp;return u;
};
const plain=unit('HEAVY'),phantom=unit('HEAVY',['PHANTOM_STEP']),grit=unit('HEAVY',['VETERAN_GRIT']),surv=unit('HEAVY',['SURVIVAL_INSTINCT']);
game.squad=[plain,phantom,grit,surv];
assert.ok(DEATHLINE_SKILLS.PHANTOM_STEP.atkSpeedBonus===25&&DEATHLINE_SKILLS.VETERAN_GRIT.regenPct===2);

// Phantom is included once in the shared non-weapon speed budget, not in clock advancement.
assert.equal(phantom.deathlineAtkSpeed,25);assert.equal(plain.deathlineAtkSpeed,0);
assert.ok(phantom.atkSpeed>=plain.atkSpeed);
phantom.atkCooldown=1;tickDeathline(phantom,.2);assert.equal(phantom.atkCooldown,1);
phantom.isDown=true;tickDeathline(phantom,.2);assert.equal(phantom.atkCooldown,1);phantom.isDown=false;

// 2. 自然治癒 毎秒最大HPの2%（ダウン中・死亡中は不可）
grit.hp=Math.floor(grit.maxHp/2);let h0=grit.hp;for(let i=0;i<100;i++)tickDeathline(grit,.01);
assert.ok(Math.abs(grit.hp-h0-grit.maxHp*.02)<1e-6,`regen 2%/s: +${grit.hp-h0}`);
plain.hp=Math.floor(plain.maxHp/2);h0=plain.hp;tickDeathline(plain,1);assert.equal(plain.hp,h0,'no skill, no regen');
grit.isDown=true;grit.hp=0;tickDeathline(grit,1);assert.equal(grit.hp,0,'downed units are not healed');grit.isDown=false;
grit.dead=true;grit.hp=5;tickDeathline(grit,1);assert.equal(grit.hp,5,'dead units are not healed');grit.dead=false;
grit.hp=grit.maxHp-1;tickDeathline(grit,5);assert.equal(grit.hp,grit.maxHp,'capped at max');

// 3. サバイバルソウル: HP35%以下で被ダメ半減・速度+30%（一時的）
const hit=(u,hpRatio)=>{u.isDown=false;u.dead=false;u.hp=Math.ceil(u.maxHp*hpRatio);const before=u.hp;game.damageTarget(u,40,{environmental:true});return before-u.hp;};
const twin=unit('HEAVY',['SURVIVAL_INSTINCT']);twin.deathlineSkills=['SURVIVAL_INSTINCT'];
const hiDmg=hit(surv,.9),loDmg=hit(unit('HEAVY',['SURVIVAL_INSTINCT']),.3);
assert.ok(hiDmg>0&&loDmg===Math.round(hiDmg*.5),`damage halves at <=35%: ${hiDmg} -> ${loDmg}`);
surv.hp=Math.floor(surv.maxHp*.5);const base=surv.speed;tickDeathline(surv,.1);assert.equal(surv.speed,base,'no boost above 35%');
surv.hp=Math.floor(surv.maxHp*.3);tickDeathline(surv,.1);assert.equal(surv.speed,Math.floor(base*1.3));
tickDeathline(surv,.1);assert.equal(surv.speed,Math.floor(base*1.3),'boost does not stack');
surv.hp=Math.floor(surv.maxHp*.8);tickDeathline(surv,.1);assert.equal(surv.speed,base,'boost ends when healed');
assert.equal(lowHpGuardActive(plain),false);

// 蘇生の再使用時間 2.5倍速（60秒→24秒、所持者のみ・保存値は上限に丸める）
const m0=unit('MEDIC'),m1=unit('MEDIC',['MIRACLE_PRAYER']);game.squad.push(m0,m1);
assert.equal(revivalCooldownOf(m0),REVIVAL_COOLDOWN);assert.equal(revivalCooldownOf(m1),24);assert.equal(revivalCooldownOf(null),60);
game.worldTime=1000;m0.revivalSkillCooldownUntil=m1.revivalSkillCooldownUntil=1060;
assert.equal(revivalSkillCooldownLeft(game,m0),60);assert.equal(revivalSkillCooldownLeft(game,m1),24,'stored 60s is clamped to 24s');
normalizeRevivalSkill(game,m1);assert.equal(m1.revivalSkillCooldownUntil,1024);normalizeRevivalSkill(game,m0);assert.equal(m0.revivalSkillCooldownUntil,1060);
// 4. 再計算しても能力が漂流しない
const snap=u=>JSON.stringify({maxHp:u.maxHp,atk:u.atk,def:u.def,speed:u.speed,dmgReduction:u.dmgReduction,a:u.deathlineAtkSpeed,g:u.deathlineRegenPct,v:u.deathlineRevivalSpeed,l:u.deathlineLowHpGuard});
for(const u of [phantom,grit,surv,m1]){const hp=u.hp;game.recalcSoldierStats(u);const s0=snap(u);for(let i=0;i<5;i++)game.recalcSoldierStats(u);assert.equal(snap(u),s0,'stable after repeated recalc');u.hp=hp;}
surv.hp=Math.floor(surv.maxHp*.3);game.recalcSoldierStats(surv);const baseAfter=surv.speed;
for(let i=0;i<5;i++){tickDeathline(surv,.1);game.recalcSoldierStats(surv);assert.equal(surv.speed,baseAfter,'recalc while boosted restores clean speed');}
surv.hp=surv.maxHp;tickDeathline(surv,.1);assert.equal(surv.speed,baseAfter,'no permanent drift after boost+recalc cycles');
console.log('deathline-skills ok');
