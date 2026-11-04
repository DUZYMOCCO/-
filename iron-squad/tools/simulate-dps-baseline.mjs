// Measurement only. Does not write gameplay, tests, docs, caches, or saves.
// Run from repository root: node iron-squad/tools/simulate-dps-baseline.mjs
// DPS_OUT_DIR overrides the external output directory; --probe only boots fixtures.
import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve,join,relative,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile,emptyAttributePractice,canChannelWeaponMagic,soldierCombatTempo} from '../js/unit-attributes.js';
import {canUseEquipment,requiredWeaponStrength} from '../js/weapon-requirements.js';
import {TIERS,MAX_EQUIPMENT_TIER} from '../js/equipment-tiers.js';
import {weaponCombatProfile,attackCooldown,soldierAttackCooldown,evaluateMeleeSweetSpot,meleeSweetSpotFor} from '../js/equipment-rules.js';
import {masteryReloadMult} from '../js/growth-rules.js';
// v7.0.18 harness fix: heavyWeaponAttackMult no longer exists (hammer x7 / axe x3 are base ATK data now, nothing is embedded at generation).
const heavyWeaponAttackMult=()=>1;
import {SOLDIER_MELEE_SKILLS,soldierMeleeReload,tickSoldierMeleeSkill,soldierMeleeReach} from '../js/soldier-melee-skills.js';
import {finalCriticalChance} from '../js/enemy-tier.js';
import {castMageSpell,castPlayerSpell,MAGIC_AFFINITIES,ensureMana,regenerateMana} from '../js/magic-rules.js';
import {ammoCapacity} from '../js/supply-rules.js';
import {updatePiercingBolt,sidearmAttack,CANNON_BASH_RULES} from '../js/ranged-combat.js';
import {attackBlocked} from '../js/gate-rules.js';
import {sound} from '../../common/js/audio.js';
import {campaignScaling} from '../js/campaign-scaling.js';
import {fieldAdaptiveScaling} from '../js/field-scaling.js';
import {combatPower} from '../js/combat-rewards.js';
import {invasionStrength,regularInvasionStrength,majorReference,majorInvasionStrength} from '../js/invasion-rules.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');process.chdir(root);
const out=resolve(process.env.DPS_OUT_DIR||join(tmpdir(),'iron-squad-dps'));
assert.ok(out.toLowerCase()!==root.toLowerCase()&&!out.toLowerCase().startsWith(root.toLowerCase()+'\\'),'output must be outside repository');
mkdirSync(out,{recursive:true});
const own=relative(root,fileURLToPath(import.meta.url)).replaceAll('\\','/');
const status=()=>execFileSync('git',['status','--short'],{encoding:'utf8'});
const before=status();writeFileSync(join(out,'git-status-run-before.txt'),before);
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const digest=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const fingerprint=()=>Object.fromEntries(walk('iron-squad').filter(f=>f.replaceAll('\\','/')!==own).map(f=>[f,digest(f)]));
const sourceStart=fingerprint();writeFileSync(join(out,'source-hashes-before.json'),JSON.stringify(sourceStart,null,2));
const manifest={GAME_ASSETS:{}};new Function('self',readFileSync('iron-squad/sw-assets.js','utf8'))(manifest);
const release=manifest.GAME_ASSETS['iron-squad'];
const randomFor=seed=>{let n=seed>>>0;n=Math.imul(n^(n>>>16),0x21f0aaad);n=Math.imul(n^(n>>>15),0x735a2d97);n=(n^(n>>>15))>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};};
const originalRandom=Math.random;Math.random=randomFor(20261016);
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,SOLDIER_CLASSES,RANKS}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:84000,y:84000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText','saveGame'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('DPS MEASUREMENT ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const basePlayer=structuredClone(g.player),baseNation=structuredClone(g.nation);
for(const name of ['updateStatsUI','refreshSupplyUI','updateQuestUI','revealFogAroundPlayer','changeTimePeriod','updateSpawns','updateDemonInvasion','deployReserves','updatePowerAtkButtonUI','pushShockwave','pushParticle','launchMonster','powerKnockStun','powerHitOutpost','recordBattleLog'])g[name]=noop;
const realPlayer=IronSquadGame.recalcPlayerStats,realSoldier=IronSquadGame.recalcSoldierStats,realAttack=IronSquadGame.performAttack;
g.recalcPlayerStats=noop;g.recalcSoldierStats=noop;
const src=readFileSync('iron-squad/js/index.js','utf8');
const projectileStart=src.indexOf('    if (this.projectiles) {',src.indexOf('// 弾丸・矢・ヒール光弾'));
const projectileEnd=src.indexOf('    // 主人公の自動攻撃',projectileStart);
assert.ok(projectileStart>0&&projectileEnd>projectileStart);
// Execute the exact current projectile update block, with explicit dependencies.
const projectileStep=new Function('dt','updatePiercingBolt','coverBlocked','isHostileShot','interceptHostileShot','sound','aliveSquad',src.slice(projectileStart,projectileEnd));
const drain=()=>{for(let i=0;i<300&&g.projectiles.length;i++)projectileStep.call(g,.01,updatePiercingBolt,attackBlocked,()=>false,()=>false,sound,[]);assert.equal(g.projectiles.length,0,'all projectiles settled');};
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
const melee=['sword','spear','hammer','axe'],ranged=['bow','crossbow','cannon'],magic=['staff','wand'];
const tiers=[1,2,3,4,5,6,7,10,19,MAX_EQUIPMENT_TIER],duration=60;
const fixtures=new Map(),kernels=new Map(),rows=[],compensation=[],skillProposals=[],hpRows=[],calibration=[],liveChecks=[],balanceRows=[],growthRows=[];
let state=null,calls=0;
const statMean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const statSd=a=>Math.sqrt(a.reduce((v,x)=>v+(x-statMean(a))**2,0)/Math.max(1,a.length-1));
function fixture(role,style,tier,mastery=0,k=1,rankIndex=3,level=12,waves=0){
  const key=JSON.stringify([role,style,tier,mastery,k,rankIndex,level,waves]);if(fixtures.has(key))return structuredClone(fixtures.get(key));
  const commander=role==='COMMANDER',hero=role.startsWith('HERO'),cls=hero?role.slice(5):role;
  const u={...structuredClone(basePlayer),id:key,isPlayer:commander,isHero:commander,isCommander:commander,heroPartyId:hero?'measurement-party':undefined,soldierClass:commander?undefined:cls,combatClass:commander?'COMMANDER':cls,level,talent:'AVERAGE',survivedWaves:waves,minionKills:0,bossKills:0,midbossKills:0,kills:0,isAdvanced:false,isNamed:false,isVeteran:false,deathlineSkills:[],inferiorGrit:0,favoriteWeapon:style,weaponMastery:{[style]:mastery===15?36:0},magicAffinity:'fire',isDown:false,dead:false,hp:100,maxHp:100,x:84000,y:84000,hitGrowthHp:0,hitGrowthDef:0,hitGrowthVersion:2};
  u.attributeProfile=rollAttributeProfile(commander?'COMMANDER':cls,'AVERAGE',()=>.5,commander);
  // Controlled trained strength, identical across weapons, permits every tested tier.
  // This is a legal-equipment laboratory fixture, not an early-game progression claim.
  if(!magic.includes(style))u.attributeProfile.innate.strength=110;
  const w={id:`weapon-${style}-${tier}`,name:`measurement-${style}`,baseName:`measurement-${style}`,type:'WEAPON',weaponStyle:style,tier,rollMult:1,upgrade:0,weaponTraits:{...traits}};
  applyUpgradeStats(w,0);w.stats.atk=Math.floor(w.stats.atk*k);u.equipped={weapon:w};u.weapon=w;
  Object.assign(g,{player:commander?u:structuredClone(basePlayer),equipped:commander?u.equipped:{},rankIndex,nation:structuredClone(baseNation),rescueBonuses:{},sharedEquipBox:[],inventory:[]});
  if(commander)realPlayer.call(g);else realSoldier.call(g,u);
  u.hp=u.maxHp;ensureMana(u);u.mana=u.maxMana;u.ammo=ammoCapacity(u);u.atkCooldown=0;u.powerAtkCooldown=0;u.weaponSkillCooldown=0;
  assert.ok(canUseEquipment(u,w),`legal equipment ${key}: ${u.strength}/${requiredWeaponStrength(w)}`);
  if(!magic.includes(style))assert.equal(canChannelWeaponMagic(u),false,'default fighters do not channel magic');
  fixtures.set(key,structuredClone(u));return structuredClone(u);
}
function arena(u,c){
  const commander=c.role==='COMMANDER';
  Object.assign(g,{player:commander?u:structuredClone(basePlayer),equipped:commander?u.equipped:{},squad:commander?[]:[u],reserves:[],monsters:[],outposts:[],merchants:[],gateGuards:[],medicalPosts:[],dungeons:[],civilians:[],remains:[],projectiles:[],particles:[],dropsOnField:[],magicBursts:[],damageFields:[],powerFx:[],currentQuest:null,currentDungeon:null,restTimer:0,inBattle:true,phase:1,wildernessBlessing:0,worldTerrain:{tiles:new Map()},_monsterGrid:null,joystick:{active:true,dirX:1,dirY:0}});
  g.player.isAdvanced=commander?false:c.aura;
  const p=weaponCombatProfile(u.weapon),sw=meleeSweetSpotFor(u.weapon);
  const reach=commander?p.playerReach:p.reach;
  let x=melee.includes(c.style)?(c.sweet?reach*sw.peak:Math.min(40,reach*.5)):145;
  // Soldier spear hold position cannot attain the absolute sweet-spot peak (0.86).
  if(c.style==='spear'&&!commander&&!c.role.startsWith('HERO'))x=reach*.74;
  if(c.style==='spear'&&commander)x=p.reach*(c.sweet?sw.peak:.74);
  const offsets=Array.from({length:c.targets},(_,i)=>[x+(i%5)*2,Math.floor(i/5)*10]);
  g.monsters=offsets.map(([dx,dy],i)=>({id:`target-${i}`,type:'goblin',x:u.x+dx,y:u.y+dy,hp:1e9,maxHp:1e9,def:c.def,magicDef:c.def,dmgReduction:c.def?33:0,atk:0,speed:0,radius:8,atkTimer:0,exp:0,color:'#444'}));
  u.facingAngle=0;u.slashAngle=0;u.slashAnim=0;
  return p;
}
function resetProgress(u,mastery,practice){u.weaponMastery=structuredClone(mastery);u.attributeProfile.practice=structuredClone(practice);u._attributesDirty=false;}
g.performAttack=function(u,m,isPlayer,customAtk,sweetOpt,kind=null,magicBonus=0){
  if(!state)return realAttack.call(this,u,m,isPlayer,customAtk,sweetOpt,kind,magicBonus);
  const c=state.c,p=weaponCombatProfile(u.weapon),mageHit=kind==='magic'||(kind==null&&['MAGE','HERO_MAGE'].includes(c.role));
  if(!c.sweet)sweetOpt=false;
  // Counterfactual is explicit: replace the skill's old pre-rounded base in the harness.
  if(state.action==='skill1'&&c.regime!=='current'&&['HEAVY','LIGHT'].includes(c.role)&&melee.includes(c.style)){
    const aura=c.aura&&c.regime==='remove_phys'?1.25:1;
    customAtk=Math.round(Math.round(u.atk*aura)*SOLDIER_MELEE_SKILLS[c.style].mult);
  }
  if(state.action==='sidearm'&&c.regime!=='current'&&c.role==='ARCHER'){
    customAtk=Math.max(1,Math.round(sidearmAttack(u)*(c.aura&&c.regime==='remove_phys'?1.25:1)*(c.style==='cannon'?CANNON_BASH_RULES.mult:1)));
  }
  let sw={critBonus:0,inSweet:false};
  if(sweetOpt!==false&&!p.ranged)sw=evaluateMeleeSweetSpot(u.weapon,typeof sweetOpt==='number'?sweetOpt:Math.hypot(m.x-u.x,m.y-u.y),isPlayer?p.playerReach:p.reach);
  const baseCrit=(u.crit||0)-(kind==='sidearm'?(u.weapon?.stats?.crit||0):0);
  const prob=(mageHit&&!isPlayer?0:finalCriticalChance(baseCrit,isPlayer?sw.critBonus:sw.inSweet?sw.critBonus:0))/100;
  const oldHp=m.hp,mastery=structuredClone(u.weaponMastery),practice=structuredClone(u.attributeProfile.practice),rng=Math.random;
  if(state.live){
    realAttack.call(this,u,m,isPlayer,customAtk,sweetOpt,kind,magicBonus);
    if(state.time<duration)state.damage+=oldHp-m.hp;
    resetProgress(u,mastery,practice);calls++;return;
  }
  Math.random=()=>.999999999;realAttack.call(this,u,m,isPlayer,customAtk,sweetOpt,kind,magicBonus);const normal=oldHp-m.hp;
  m.hp=oldHp;resetProgress(u,mastery,practice);
  Math.random=()=>0;realAttack.call(this,u,m,isPlayer,customAtk,sweetOpt,kind,magicBonus);const critical=oldHp-m.hp;
  m.hp=oldHp-normal;resetProgress(u,mastery,practice);Math.random=rng;
  assert.ok(normal>=0&&critical>=normal);calls+=2;
  state.hits.push({normal,critical,p:prob,delay:state.time,target:m.id});
};
function normalAction(u,c,p){
  const m=g.monsters[0],commander=c.role==='COMMANDER',hero=c.role.startsWith('HERO');
  if(commander){g.manualAttack();drain();return u.atkCooldown;}
  if(magic.includes(c.style)){
    if(hero){g.performAttack(u,m,false,u.magicAttack,false,'magic');return attackCooldown(u.weapon,p.baseCooldown,u.atkSpeed);}
    if(c.role==='MAGE'){castMageSpell(g,u,m);return u.atkCooldown;}
    g.performAttack(u,m,false,Math.round(u.magicAttack),false,'magic');return soldierAttackCooldown(u,SOLDIER_CLASSES.MEDIC.atkCooldown);
  }
  if(hero){
    if(p.ranged){g.spawnRangedProjectile(u,m,u.atk,g.combatProfileFor(u,u.weapon,false),false);drain();}
    else g.performAttack(u,m,false,u.atk);
    return attackCooldown(u.weapon,g.combatProfileFor(u,u.weapon,false).baseCooldown,u.atkSpeed);
  }
  const aura=c.aura&&c.regime!=='remove_all'?1.25:1,phys=c.regime==='current'?2.2:1;
  let atk=Math.round(u.atk*aura*phys);
  const prof=g.combatProfileFor(u,u.weapon,false);
  if(p.ranged){g.spawnRangedProjectile(u,m,atk,prof,false);drain();return soldierAttackCooldown(u,Math.max(.35,prof.baseCooldown/Math.max(.55,u.atkSpeed)));}
  const cls=SOLDIER_CLASSES[c.role],reach=soldierMeleeReach(cls,prof,u.weapon);
  const dm=c.regime==='current'?(c.style==='spear'?1.15:['hammer','axe'].includes(c.style)?1.35:1):1;
  atk=Math.max(1,Math.round(atk*dm));
  if(p.pierce){for(const target of [...g.monsters]){const along=target.x-u.x,perp=Math.abs(target.y-u.y);if(along>=-6&&along<=reach&&perp<=p.pierceHalfWidth+target.radius)g.performAttack(u,target,false,atk,along);}}
  else g.performMeleeSweep(u,m,false,atk,prof,reach);
  const tempo=c.style==='spear'?1.5:['hammer','axe'].includes(c.style)?2.25:.55;
  return soldierAttackCooldown(u,cls.atkCooldown*tempo*masteryReloadMult(u.weaponMastery,c.style)/Math.max(.55,u.atkSpeed*u.weapon.weaponTraits.attackTempo));
}
function kernel(c,action='normal',k=1){
  const key=JSON.stringify([c,action,k]);if(kernels.has(key))return kernels.get(key);
  const u=fixture(c.role,c.style,c.tier,c.mastery,k),p=arena(u,c);
  state={c,action,hits:[],time:0};let cd=Infinity;
  if(action==='normal')cd=normalAction(u,c,p);
  else if(action==='skill1'){
    if(c.role==='COMMANDER'){g.triggerPowerAttack();cd=u.powerAtkCooldown;for(let t=.01;t<=1.01;t+=.01){state.time=t;g.updatePowerFx(.01);}drain();}
    else if(['HEAVY','LIGHT'].includes(c.role)&&melee.includes(c.style)){
      assert.equal(g.trySoldierMeleeSkill(u,g.monsters[0]),true);cd=soldierMeleeReload(u);
      for(let t=.01;t<=.21;t+=.01){state.time=t;tickSoldierMeleeSkill(g,u,.01);}
    }
  }
  else if(action==='skill2'){
    if(['HEAVY','LIGHT'].includes(c.role)&&melee.includes(c.style)){
      cd=8;const selected=c.style==='axe'?[g.monsters[0]]:g.monsters;
      for(const target of selected)g.performAttack(u,target,false,u.atk,false,'physical');
    }
  }
  else if(action==='sidearm'){
    u.ammo=0;g.monsters.forEach((m,i)=>{m.x=u.x+48+i*2;m.y=u.y;});
    assert.equal(g.performRangedSidearm(u,g.monsters[0],c.role==='COMMANDER',true),true);cd=u.atkCooldown;
  }
  const result={hits:state.hits,cd,atk:u.atk,weaponAtk:u.weapon.stats.atk,magicAttack:u.magicAttack,crit:u.crit,atkSpeed:u.atkSpeed,strength:u.strength,quickness:u.quickness};
  state=null;kernels.set(key,result);return result;
}
const count=(cd,start=0)=>Number.isFinite(cd)&&start<duration?Math.max(0,Math.ceil((duration-start-1e-9)/cd)):0;
function summarize(components,crit=true){
  let mean=0,variance=0;const events=[];
  for(const {kernel:k,start=0,mult=1}of components)for(const h of k.hits){
    const n=count(k.cd,start+h.delay),p=crit?h.p:0,a=h.normal*mult,b=h.critical*mult;
    mean+=n*(a+(b-a)*p);variance+=n*p*(1-p)*(b-a)**2;events.push({n,p,a,b});
  }
  return {mean:mean/duration,sd:Math.sqrt(variance)/duration,events};
}
function metrics(c,k=1){
  const n=kernel(c,'normal',k),s=kernel(c,'skill1',k),s2=kernel(c,'skill2',k);
  const start=Number.isFinite(s.cd)&&c.role!=='COMMANDER'?s.cd*.5:0;
  const base=[{kernel:n}],one=[...base,{kernel:s,start}],two=[...one];
  // Proposed explicit ATK multipliers and nominal CT8; available only at mastery+15%.
  if(c.mastery===15)two.push({kernel:s2,start:0,mult:({sword:4,spear:4,hammer:5,axe:6}[c.style]||0)});
  return {n,s,s2,normal:summarize(base),normalNoCrit:summarize(base,false),one:summarize(one),oneNoCrit:summarize(one,false),two:summarize(two),twoNoCrit:summarize(two,false)};
}
function csv(name,data){if(!data.length)return;const keys=Object.keys(data[0]);const enc=v=>{const s=typeof v==='object'?JSON.stringify(v):String(v??'');return /[",\n\r]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};writeFileSync(join(out,name),[keys.join(','),...data.map(r=>keys.map(k=>enc(r[k])).join(','))].join('\n')+'\n');}
function roles(style){return melee.includes(style)?['HEAVY','LIGHT','COMMANDER','HERO_LIGHT']:ranged.includes(style)?['ARCHER','COMMANDER','HERO_ARCHER']:['MAGE','MEDIC','COMMANDER','HERO_MAGE'];}
function solveK(c,target,mode){
  let lo=1,hi=2;const evaluate=k=>metrics(c,k)[mode].mean;
  if(evaluate(lo)>=target)return 1;
  while(evaluate(hi)<target&&hi<128)hi*=2;
  assert.ok(hi<=128,'solution bracket');
  for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(evaluate(mid)>=target)hi=mid;else lo=mid;}
  return hi;
}
function monteCarlo(summary,seeds,seedBase){
  const values=[];for(let s=0;s<seeds;s++){const rng=randomFor(seedBase+s);let d=0;for(const e of summary.events)for(let i=0;i<e.n;i++)d+=rng()<e.p?e.b:e.a;values.push(d/duration);}
  return {seeds,mean:statMean(values),sd:statSd(values),hash:createHash('sha256').update(JSON.stringify(values)).digest('hex')};
}
function liveTrial(c,seed){
  const measured=metrics(c),u=fixture(c.role,c.style,c.tier,c.mastery),p=arena(u,c),events=[],homes=g.monsters.map(m=>({x:m.x,y:m.y})),frozenMastery=structuredClone(u.weaponMastery),frozenPractice=structuredClone(u.attributeProfile.practice);
  for(let t=0;t<duration-1e-9;t+=measured.n.cd)events.push({t,action:'normal'});
  const start=c.role==='COMMANDER'?0:measured.s.cd*.5;
  for(let t=start;t<duration-1e-9;t+=measured.s.cd)events.push({t,action:'skill1'});
  events.sort((a,b)=>a.t-b.t);Math.random=randomFor(seed);state={c,live:true,damage:0,time:0,action:'normal'};
  for(const e of events){
    g.monsters.forEach((m,i)=>Object.assign(m,homes[i]));
    state.action=e.action;state.time=e.t;u.ammo=ammoCapacity(u);u.mana=u.maxMana;u.atkCooldown=0;
    if(e.action==='normal')normalAction(u,c,p);
    else if(c.role==='COMMANDER'){
      u.powerAtkCooldown=0;g.triggerPowerAttack();for(let i=1;i<=101;i++){state.time=e.t+i*.01;g.updatePowerFx(.01);}drain();
    }else{
      u.weaponSkillCooldown=0;g.trySoldierMeleeSkill(u,g.monsters[0]);for(let i=1;i<=21;i++){state.time=e.t+i*.01;tickSoldierMeleeSkill(g,u,.01);}
    }
    resetProgress(u,frozenMastery,frozenPractice);
  }
  const damage=state.damage;state=null;return damage/duration;
}
try{
  if(process.argv.includes('--probe')){
    for(const style of [...melee,...ranged,...magic]){const c={role:melee.includes(style)?'HEAVY':magic.includes(style)?'MAGE':'ARCHER',style,tier:10,mastery:0,targets:3,def:0,sweet:true,aura:false,regime:'current'};const r=metrics(c);console.log(JSON.stringify({style,atk:r.n.atk,weaponAtk:r.n.weaponAtk,cd:r.n.cd,normal:r.normal.mean,skill:r.one.mean,normalHits:r.n.hits.length,skillHits:r.s.hits.length}));}
  }else{
    for(const style of [...melee,...ranged,...magic]){
      for(const role of roles(style))for(const tier of tiers)for(const mastery of [0,15])for(const targets of [1,3,10])for(const def of melee.includes(style)?[0,72]:[0])for(const sweet of melee.includes(style)?[false,true]:[false])for(const aura of [false,true])for(const regime of ['current','remove_phys','remove_all']){
        const c={style,role,tier,mastery,targets,def,sweet,aura,regime},r=metrics(c);
        const skill1Available=Number.isFinite(r.s.cd),skill2Available=mastery===15&&['HEAVY','LIGHT'].includes(role);
        rows.push({...c,normal_no_crit:r.normalNoCrit.mean,normal_crit:r.normal.mean,normal_sd60:r.normal.sd,one_skill_no_crit:r.oneNoCrit.mean,one_skill_crit:r.one.mean,one_skill_sd60:r.one.sd,two_skills_no_crit:r.twoNoCrit.mean,two_skills_crit:r.two.mean,two_skills_sd60:r.two.sd,atk:r.n.atk,weapon_atk:r.n.weaponAtk,normal_ct:r.n.cd,skill1_ct:Number.isFinite(r.s.cd)?r.s.cd:null,source_normal:regime==='current'?'REAL_HIT+ANALYTIC_60S':'COUNTERFACTUAL_REAL_HIT+ANALYTIC_60S',source_one:skill1Available?(regime==='current'?'REAL_SKILL+ANALYTIC_60S':'COUNTERFACTUAL_REAL_SKILL+ANALYTIC_60S'):'SAME_AS_NORMAL_NO_SKILL1',source_two:skill2Available?'PROPOSAL_ANALYTIC+REAL_HIT':'SAME_AS_ONE_NO_SKILL2',skill1_available:skill1Available,two_skill_unlocked:skill2Available,supply:'refilled_each_action',duration});
      }
      console.log(`matrix ${style}: ${rows.length} rows, ${calls} real performAttack calls`);
    }
    csv('A-dps.csv',rows);
    for(const role of ['HEAVY','LIGHT','ARCHER'])for(const style of role==='ARCHER'?ranged:melee)for(const tier of tiers)for(const aura of [false,true])for(const targets of role==='ARCHER'?[1]:[1,3,10]){
      const c={style,role,tier,mastery:15,targets,def:0,sweet:true,aura,regime:'current'},old=metrics(c),after={...c,regime:'remove_all'},retained={...c,regime:'remove_phys'};
      const normalK=solveK(after,old.normal.mean,'normal'),oneK=solveK(after,old.one.mean,'one'),twoK=solveK(after,old.one.mean,'two');
      const prior=style==='spear'?2.43:['hammer','axe'].includes(style)?2.63:2.2;
      compensation.push({role,style,tier,targets,aura,mastery:15,current_normal:old.normal.mean,current_one:old.one.mean,remove_normal:metrics(after).normal.mean,remove_one:metrics(after).one.mean,remove_two:metrics(after).two.mean,k_normal:normalK,k_one:oneK,k_two:twoK,k_keep_aura:solveK(retained,old.one.mean,'one'),extra_increase_reduced_vs_normal_pct:normalK>1?(normalK-twoK)/(normalK-1)*100:0,extra_increase_reduced_vs_one_pct:oneK>1?(oneK-twoK)/(oneK-1)*100:0,previous_estimate:prior,difference_from_previous_pct:(oneK/prior-1)*100,source:'REAL_RECALC+REAL_HITS+ANALYTIC_SCHEDULE+BISECTION'});
      if(role!=='ARCHER'&&targets===1)for(const targets of [1,3,10]){
        const cc={...after,targets},baseline=metrics({...cc,regime:'current'}),r=metrics(cc),unit=summarize([{kernel:r.s2}]).mean,missing=Math.max(0,baseline.one.mean-r.one.mean);
        skillProposals.push({role,style,tier,aura,targets,mastery:15,weapon_k:1,skill2_ct:8,skill2_required_mult:unit>0?missing/unit:0,skill2_candidate_mult:({sword:4,spear:4,hammer:5,axe:6}[style]),max_ct_for_candidate:missing>0?8*({sword:4,spear:4,hammer:5,axe:6}[style])*unit/missing:null,current_target_dps:baseline.one.mean,after_one_dps:r.one.mean,after_two_dps:r.two.mean,source:'ANALYTIC_PROPOSED_TARGETS+REAL_HIT_CALIBRATION'});
      }
    }
    csv('B-compensation.csv',compensation);csv('E-two-skills.csv',skillProposals);
    for(const role of ['HEAVY','LIGHT'])for(const tier of [1,10,28])for(const style of melee){
      const c={style,role,tier,mastery:0,targets:1,def:0,sweet:true,aura:false,regime:'current'},r=metrics(c),u=fixture(role,style,tier),prof=g.combatProfileFor(u,u.weapon,false),sweet=meleeSweetSpotFor(u.weapon);
      let estimateCd=SOLDIER_CLASSES[role].atkCooldown*(style==='spear'?1.5:['hammer','axe'].includes(style)?1.85:1)*masteryReloadMult(u.weaponMastery,style)/Math.max(.55,u.atkSpeed);
      estimateCd=soldierAttackCooldown(u,estimateCd);
      const estimateDps=u.atk*(1+Math.min(.75,u.crit/100)*1.2)/Math.max(.15,estimateCd)*(style==='spear'?1.15:['hammer','axe'].includes(style)?1.35:1)*(sweet?.sweetDmg||1);
      const sword=metrics({...c,style:'sword'}).normal.mean,currentTempo=style==='spear'?1.5:['hammer','axe'].includes(style)?2.25:.55;
      balanceRows.push({role,style,tier,weapon_atk:u.weapon.stats.atk,profile_atk_mult:prof.atkMult,embedded_heavy_mult:heavyWeaponAttackMult(style),weapon_base_ct:weaponCombatProfile(u.weapon).baseCooldown,class_ct:SOLDIER_CLASSES[role].atkCooldown,tempo:currentTempo,actual_ct:r.n.cd,normal_dps:r.normal.mean,ratio_to_sword:r.normal.mean/sword,equipment_estimator_dps:estimateDps,estimator_to_actual:estimateDps/r.normal.mean,equalize_to_sword_tempo:currentTempo*r.normal.mean/sword,equalize_to_sword_target_ct:r.n.cd*r.normal.mean/sword,cooldown_floor:weaponCombatProfile(u.weapon).baseCooldown*.6,source:'REAL_HIT_SCHEDULE;ESTIMATOR_AND_PROPOSED_TEMPO_ANALYTIC'});
    }
    csv('C-balance.csv',balanceRows);
    for(const b of compensation.filter(r=>['HEAVY','ARCHER'].includes(r.role)&&r.targets===1&&!r.aura))for(const scheme of b.role==='ARCHER'?['normal','one']:['normal','two']){
      const k=b[`k_${scheme}`];
      for(const distance of [8000,22000,48000]){
        const p=fixture('COMMANDER',b.style,b.tier,15),q=fixture('COMMANDER',b.style,b.tier,15,k),s=fixture(b.role,b.style,b.tier,15),t=fixture(b.role,b.style,b.tier,15,k);
        const oldGame={player:p,squad:[s],nation:{level:0}},newGame={player:q,squad:[t],nation:{level:0}};
        const a=fieldAdaptiveScaling(oldGame,distance),z=fieldAdaptiveScaling(newGame,distance),campaign=campaignScaling(distance,1);
        const captainConfig={style:b.style,role:'COMMANDER',tier:b.tier,mastery:15,targets:1,def:0,sweet:true,aura:false,regime:'current'};
        const captainOld=metrics(captainConfig),captainNew=metrics(captainConfig,k),hpK=captainNew.one.mean/captainOld.one.mean;
        const c={style:b.style,role:b.role,tier:b.tier,mastery:15,targets:1,def:0,sweet:true,aura:false,regime:'current'};
        const contribution=metrics({...c,regime:'remove_all'},k)[scheme].mean/metrics(c)[scheme==='two'?'one':scheme].mean/hpK;
        const inv0=invasionStrength(oldGame),inv1=invasionStrength(newGame),reg0=regularInvasionStrength(inv0),reg1=regularInvasionStrength(inv1),maj0=majorInvasionStrength(majorReference(inv0)),maj1=majorInvasionStrength(majorReference(inv1));
        hpRows.push({style:b.style,tier:b.tier,scheme,k_weapon:k,distance,commander_before:p.atk,commander_after:q.atk,commander_weapon_share:(q.atk-p.atk)/((k-1||1)*p.atk),commander_atk_ratio:q.atk/p.atk,commander_normal_dps_ratio:captainNew.normal.mean/captainOld.normal.mean,commander_one_skill_dps_ratio:hpK,enemy_total_hp_required:hpK,campaign_hp:campaign.hp,campaign_atk:campaign.atk,adaptive_hp_before:a.hp,adaptive_hp_after:z.hp,adaptive_auto_hp_ratio:z.hp/a.hp,additional_manual_field_hp_ratio:hpK/(z.hp/a.hp),combat_power_ratio:combatPower(q)/combatPower(p),regular_invasion_auto_hp_ratio:reg1.hp/reg0.hp,major_invasion_auto_hp_ratio:maj1.hp/maj0.hp,manual_regular_hp_ratio:hpK/(reg1.hp/reg0.hp),manual_major_hp_ratio:hpK/(maj1.hp/maj0.hp),soldier_relative_contribution:contribution,source:'REAL_RECALC+REAL_CAPTAIN_HITS+REAL_SCALING_FUNCTIONS+ANALYTIC_TTK_RATIO'});
      }
    }
    csv('D-enemy-hp.csv',hpRows);
    for(const style of melee)for(const tier of [1,10,28])for(const level of [1,12,50])for(const waves of [0,10]){
      const k=compensation.find(r=>r.role==='HEAVY'&&r.style===style&&r.tier===tier&&r.targets===1&&!r.aura).k_two;
      const p=fixture('COMMANDER',style,tier,15,1,3,level,waves),q=fixture('COMMANDER',style,tier,15,k,3,level,waves);
      growthRows.push({style,tier,level,waves,k_weapon:k,atk_before:p.atk,atk_after:q.atk,hp_ratio_atk_approx:q.atk/p.atk,source:'REAL_RECALC;DPS_APPROX_FROM_ATK_RATIO'});
    }
    csv('D-growth-sensitivity.csv',growthRows);
    const sidearmRows=[];
    for(const style of ranged)for(const role of ['ARCHER','COMMANDER','HERO_ARCHER'])for(const tier of [1,10,28])for(const aura of [false,true])for(const regime of ['current','remove_phys','remove_all']){
      const c={style,role,tier,mastery:15,targets:1,def:0,sweet:false,aura,regime},k=kernel(c,'sidearm'),r=summarize([{kernel:k}]);
      sidearmRows.push({...c,dps:r.mean,sd60:r.sd,ct:k.cd,source:'REAL_SIDEARM+ANALYTIC_60S'});
    }
    csv('sidearm.csv',sidearmRows);
    // Independent seeded 60-second checks against the exact expectation; adapt sample size.
    for(const style of [...melee,...ranged,...magic])for(const targets of [1,10])for(const role of [roles(style)[0],'COMMANDER']){
      const c={style,role,tier:10,mastery:15,targets,def:0,sweet:true,aura:false,regime:'current'},m=metrics(c).one;
      let a,b,seeds=128;do{a=monteCarlo(m,seeds,202610160);b=monteCarlo(m,seeds,302610160);if(Math.max(Math.abs(a.mean/m.mean-1),Math.abs(b.mean/m.mean-1),Math.abs(a.mean/b.mean-1))<=.01)break;seeds*=2;}while(seeds<=16384);
      assert.ok(seeds<=16384,`seed convergence ${style}`);const repeat=monteCarlo(m,seeds,202610160);assert.equal(repeat.hash,a.hash);
      calibration.push({...c,expected:m.mean,analytic_sd60:m.sd,seeds,mean_a:a.mean,sd_a:a.sd,mean_b:b.mean,sd_b:b.sd,error_a_pct:(a.mean/m.mean-1)*100,error_b_pct:(b.mean/m.mean-1)*100,batch_difference_pct:(a.mean/b.mean-1)*100,repeat_hash:a.hash,source:'SEEDED_CALIBRATED_EVENT_SIMULATION_60S'});
    }
    csv('calibration.csv',calibration);
    for(const style of [...melee,...ranged,...magic])for(const regime of ['current','remove_all']){
      const c={style,role:roles(style)[0],tier:10,mastery:15,targets:3,def:0,sweet:true,aura:false,regime},expected=metrics(c).one;
      let samples=[],second=[],seeds=128;
      do{
        for(let i=samples.length;i<seeds;i++){samples.push(liveTrial(c,202610160+i));second.push(liveTrial(c,302610160+i));}
        if(Math.max(Math.abs(statMean(samples)/expected.mean-1),Math.abs(statMean(second)/expected.mean-1),Math.abs(statMean(samples)/statMean(second)-1))<=.01)break;
        seeds*=2;
      }while(seeds<=4096);
      const mean=statMean(samples),sd=statSd(samples),error=mean/expected.mean-1;
      assert.ok(seeds<=4096,`actual runtime convergence ${style}/${regime}: ${mean} vs ${expected.mean}`);
      liveChecks.push({...c,seeds:samples.length,expected:expected.mean,runtime_mean:mean,runtime_sd:sd,second_runtime_mean:statMean(second),error_pct:error*100,second_error_pct:(statMean(second)/expected.mean-1)*100,batch_difference_pct:(mean/statMean(second)-1)*100,source:'REAL_60S_ATTACK_EVENT_REPLAY_FIXED_GEOMETRY',samples});
    }
    csv('runtime-calibration.csv',liveChecks);
    const fixtureOutput=[...fixtures.entries()].filter(([key])=>JSON.parse(key)[4]===1).map(([key,u])=>({key,atk:u.atk,weapon:u.weapon,magicAttack:u.magicAttack,strength:u.strength,crit:u.crit,atkSpeed:u.atkSpeed,level:u.level,rankIndex:3}));
    writeFileSync(join(out,'fixtures.json'),JSON.stringify(fixtureOutput,null,2));
    writeFileSync(join(out,'summary.json'),JSON.stringify({release:{version:release.gameVersion,cache:release.version},settings:{duration,tiers,mastery:[0,15],fixtureLevel:12,fixtureRankIndex:3,trainedStrengthInnate:110,neutralTraits:traits,supply:'unlimited external refill',geometry:'fixed packed forward, 2px x offsets, 10px y rows',candidate:{ct:8,mults:{sword:4,spear:4,hammer:5,axe:6}}},counts:{rows:rows.length,compensation:compensation.length,hp:hpRows.length,skills:skillProposals.length,calibration:calibration.length,liveChecks:liveChecks.length,realAttackCalls:calls},compensation:compensation.filter(r=>r.role==='HEAVY'&&[1,10,28].includes(r.tier)),hp:hpRows.filter(r=>r.distance===48000&&r.scheme==='two'&&[1,10,28].includes(r.tier)),calibration,liveChecks},null,2));
    console.log(JSON.stringify({out,rows:rows.length,compensation:compensation.length,hp:hpRows.length,skills:skillProposals.length,realAttackCalls:calls}));
  }
}finally{
  state=null;Math.random=originalRandom;g.destroy();dom.window.close();
  assert.deepEqual(fingerprint(),sourceStart,'existing iron-squad files changed');
  const after=status();writeFileSync(join(out,'git-status-run-after.txt'),after);
  writeFileSync(join(out,'integrity.json'),JSON.stringify({existingIronSquadFilesUnchanged:true,nestedDirectoryExists:existsSync('iron-squad/iron-squad'),jsdomBundleExists:existsSync('__pycache__/ui-tools/node_modules/jsdom/lib/api.js'),statusBefore:before,statusAfter:after,script:own,scriptSha256:digest(own)},null,2));
}
