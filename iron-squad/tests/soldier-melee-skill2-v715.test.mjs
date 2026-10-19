// v7.1.5: second automatic skill for ordinary heavy/light melee soldiers (sword/spear/hammer/axe).
// Rules, CT, target selection, trigger conditions, spacing with skill 1, eligibility, save safety, two-line text,
// and a real-game DPS regression against the measured design values (simulation of proposal A).
import assert from 'node:assert/strict';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
import {rollAttributeProfile} from '../js/unit-attributes.js';
import {SOLDIER_MELEE_SKILLS2,SOLDIER_SKILL_GAP,soldierMeleeSkill2,soldierMeleeReload,tickSoldierMeleeSkill,soldierMeleeSkillLines,soldierMeleeSkillText,updateSoldierSkillFx,drawSoldierSkillFx} from '../js/soldier-melee-skills.js';
import {masteryReloadMult} from '../js/growth-rules.js';
import {soldierCombatTempo} from '../js/unit-attributes.js';
import {WORLD_SIZE,northSouthRoadX} from '../js/world.js';
const dom=new JSDOM('<div id="game"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {IronSquadGame,applyUpgradeStats,generateRandomDrop}=await import('../js/index.js');
const {saveSlots}=await import('../js/save-slots.js');
const g=Object.create(IronSquadGame);
Object.assign(g,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:83000,y:83000},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const name of ['startGameLoop','showToast','spawnSparks','spawnDamageText','updateSpawns'])g[name]=noop;
g.setupUI();g.activeSlotId=saveSlots.create('MELEE SKILL2 TEST ONLY').id;g.startFreshGame(false);g.closeStrategyModal();g.career.status='enlisted';
const y=WORLD_SIZE/2+6000,x=northSouthRoadX(y),random=Math.random;
const traits={length:1,attackTempo:1,swingSpeed:1,sweep:1,sweetWidth:1,sweetPower:1,sweetShift:0,crit:0};
let serial=0;
function gear(style,tier=9){const w=generateRandomDrop(0,'normal',{type:'WEAPON',weaponStyle:style,tier,quality:1,merchant:true,random:()=>.5});w.id=`skill2-weapon-${++serial}`;w.weaponTraits={...traits};applyUpgradeStats(w,0);return w;}
function fixture(style,cls='LIGHT'){
  g.currentDungeon=null;g.restTimer=0;g.inBattle=true;g.outposts=[];g.gateGuards=[];g.merchants=[];g.civilians=[];g.medicalPosts=[];g.reserves=[];g.projectiles=[];g.powerFx=[];g.damageTexts=[];g.shockwaves=[];g.soldierSkillFx=[];g.dropsOnField=[];g._hazardClock=0;g._monsterGrid=null;
  Object.assign(g.player,{x,y,atkCooldown:1e6,isAdvanced:false,isDown:false,hp:g.player.maxHp});g.joystick={active:false,dirX:0,dirY:0};g.camera={x,y};g.rankIndex=2;
  const profile=rollAttributeProfile(cls,'AVERAGE',()=>.5,true);profile.innate.strength=150;profile.innate.magic=1;
  const u=g.createNewSoldier(null,{classKey:cls,talent:'AVERAGE',attributeProfile:profile});const w=gear(style);u.equipped.weapon=w;u.weapon=w;g.recalcSoldierStats(u);
  Object.assign(u,{x,y,isPersonalGuard:true,dead:false,isDown:false,hp:u.maxHp,atkCooldown:1e6,weaponSkillCooldown:1e6,weaponSkill2Cooldown:0,weaponSkill2Ready:0,weaponSkillGap:0,crit:0,mana:0,speed:0,reqExp:1e12});g.squad=[u];g.monsters=[];
  return u;
}
function enemy(id,dx=55,dy=0,hp=1e8,extra={}){const m={id,type:'goblin',x:x+dx,y:y+dy,hp,maxHp:hp,radius:10,def:0,magicDef:0,speed:0,atk:0,atkTimer:100,...extra};g.monsters.push(m);return m;}
const lost=m=>m.maxHp-m.hp;
let checks=0;const ok=(v,msg)=>{assert.ok(v,msg);checks++;};const eq=(a,b,msg)=>{assert.equal(a,b,msg);checks++;};
try{
  Math.random=()=>.99;
  // 1. The rule table is the design (proposal A): CT 7 / 9 / 11 / 7.5 and the stated multipliers.
  eq(SOLDIER_MELEE_SKILLS2.sword.name,'ラピッドラッシュ');eq(SOLDIER_MELEE_SKILLS2.sword.cooldown,7);eq(SOLDIER_MELEE_SKILLS2.sword.mult,1);eq(SOLDIER_MELEE_SKILLS2.sword.finisherMult,1.3);eq(SOLDIER_MELEE_SKILLS2.sword.finisherMax,3);assert.deepEqual([...SOLDIER_MELEE_SKILLS2.sword.steps],[0,.12,.26]);
  eq(SOLDIER_MELEE_SKILLS2.spear.name,'チャージスラスト');eq(SOLDIER_MELEE_SKILLS2.spear.cooldown,9);eq(SOLDIER_MELEE_SKILLS2.spear.mult,2.2);eq(SOLDIER_MELEE_SKILLS2.spear.max,4);
  eq(SOLDIER_MELEE_SKILLS2.hammer.name,'脳天割り');eq(SOLDIER_MELEE_SKILLS2.hammer.cooldown,11);eq(SOLDIER_MELEE_SKILLS2.hammer.mult,5.5);
  eq(SOLDIER_MELEE_SKILLS2.axe.name,'大薙ぎ');eq(SOLDIER_MELEE_SKILLS2.axe.cooldown,7.5);eq(SOLDIER_MELEE_SKILLS2.axe.mult,2.4);eq(SOLDIER_MELEE_SKILLS2.axe.max,5);eq(SOLDIER_MELEE_SKILLS2.axe.hold,3);
  // 2. Eligibility: ordinary heavy/light melee soldiers only.
  for(const cls of ['HEAVY','LIGHT'])for(const style of Object.keys(SOLDIER_MELEE_SKILLS2))ok(soldierMeleeSkill2(fixture(style,cls)),`${cls} ${style} has skill 2`);
  for(const cls of ['ARCHER','MAGE','MEDIC','NINJA']){const u=fixture('sword',cls);eq(soldierMeleeSkill2(u),null,`${cls} has no skill 2`);eq(g.trySoldierMeleeSkill2(u,enemy(cls)),false);}
  {const u=fixture('bow','LIGHT');eq(soldierMeleeSkill2(u),null,'ranged weapon has no skill 2');}
  for(const flag of ['isHero','heroPartyId','isPlayer','isCommander']){const u=fixture('sword');u[flag]=flag==='heroPartyId'?'party-1':true;eq(soldierMeleeSkill2(u),null,`${flag}: no skill 2`);eq(soldierMeleeSkillLines(u).some(l=>l.startsWith('スキル2')),false);}
  eq(soldierMeleeSkill2(g.player),null,'the commander keeps only the manual strong attack');
  {const u=fixture('hammer');u.attributeProfile.innate.strength=1;eq(g.trySoldierMeleeSkill2(u,enemy('too-heavy')),false,'unusable heavy gear cannot cast');}
  // 3. CT: same reductions as skill 1 (mastery, soldier tempo, deathline attack speed); first cooldown is 50%.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS2)){
    const u=fixture(style,'HEAVY'),rule=SOLDIER_MELEE_SKILLS2[style];
    const want=rule.cooldown*masteryReloadMult(u.weaponMastery,style)*soldierCombatTempo(u);
    ok(Math.abs(soldierMeleeReload(u,rule)-want)<1e-9,`${style} CT formula`);
    u.deathlineAtkSpeed=25;ok(Math.abs(soldierMeleeReload(u,rule)-want/1.25)<1e-9,`${style} deathline attack speed shortens CT`);u.deathlineAtkSpeed=0;
    delete u.weaponSkill2Cooldown;tickSoldierMeleeSkill(g,u,0);ok(Math.abs(u.weaponSkill2Cooldown-want*.5)<1e-9,`${style} starts at 50%`);
    u.weaponSkill2Cooldown=NaN;tickSoldierMeleeSkill(g,u,0);ok(Number.isFinite(u.weaponSkill2Cooldown)&&u.weaponSkill2Cooldown>0,'bad saved value is reset');
    u.weaponSkill2Cooldown=0;const m=enemy(`ct-${style}`,style==='spear'?90:50);
    if(style==='spear')u.weaponSkillCooldown=1;
    if(style==='axe')u.weaponSkill2Ready=rule.hold;
    eq(g.trySoldierMeleeSkill2(u,m),true,`${style} casts`);ok(Math.abs(u.weaponSkill2Cooldown-want)<1e-9,`${style} spends its own CT`);
    eq(u.weaponSkillCooldown,style==='spear'?1:1e6,'skill 1 CT is untouched');
    u.weaponSkillGap=0;delete u.weaponSkill2Pending;eq(g.trySoldierMeleeSkill2(u,m),false,'immediate recast is blocked');
  }
  // 4. Sword: two hits on the main target, then up to 3 enemies around at x1.3 after 0.26 s.
  {
    const u=fixture('sword'),a=enemy('main',40),b=enemy('near-1',30,25),c=enemy('near-2',30,-25),d=enemy('near-3',-35,0),far=enemy('far',260);
    eq(g.trySoldierMeleeSkill2(u,a),true);const first=lost(a);ok(first>0,'first slash lands at once');eq(lost(b)+lost(c)+lost(d),0);
    tickSoldierMeleeSkill(g,u,.10);eq(lost(a),first,'second slash waits for 0.12 s');
    tickSoldierMeleeSkill(g,u,.03);eq(lost(a),first*2,'second slash hits the main target for the same amount');
    tickSoldierMeleeSkill(g,u,.10);eq(lost(a),first*2,'finisher waits for 0.26 s');
    tickSoldierMeleeSkill(g,u,.05);
    const fin=lost(a)-first*2;ok(Math.abs(fin/first-1.3)<.02,`finisher is x1.3 of a slash (${fin}/${first})`);
    eq([b,c,d].filter(m=>lost(m)>0).length,2,'finisher hits at most 3 enemies including the main target');eq(far.hp,far.maxHp);eq(u.weaponSkill2Pending,undefined);
    const after=lost(a);tickSoldierMeleeSkill(g,u,.5);eq(lost(a),after,'sequence runs once');
    // the multiplier is ATK x 1.0 exactly, so the displayed numbers predict the slash
    const line=soldierMeleeSkillLines(u)[1];ok(line.includes(`（${Math.round(u.atk).toLocaleString('ja-JP')}／${Math.round(u.atk*1.3).toLocaleString('ja-JP')}）`),line);
  }
  {
    const u=fixture('sword'),a=enemy('dies',40,0,1),b=enemy('next',45,10);
    g.trySoldierMeleeSkill2(u,a);ok(a.hp<=0);tickSoldierMeleeSkill(g,u,.13);ok(lost(b)>0,'the second slash retargets after a lethal first slash');
  }
  for(const cancel of ['weapon','space','down']){
    const u=fixture('sword'),a=enemy('cancel',40);g.trySoldierMeleeSkill2(u,a);const before=a.hp;
    if(cancel==='weapon')u.equipped.weapon=gear('axe');
    if(cancel==='space')g.currentDungeon={id:'different-space',kind:'test'};
    if(cancel==='down'){u.isDown=true;u.hp=0;}
    tickSoldierMeleeSkill(g,u,.3);eq(a.hp,before,`${cancel} cancels the rest of the combo`);eq(u.weaponSkill2Pending,undefined);
  }
  // 5. Spear: pierces up to 4 enemies on the line; needs 2 on the line unless skill 1 is cooling down.
  {
    const u=fixture('spear');u.weaponSkillCooldown=0;const lone=enemy('lone',90);
    eq(g.trySoldierMeleeSkill2(u,lone),false,'one enemy on the line and skill 1 ready: keep the charge');eq(lone.hp,lone.maxHp);
    u.weaponSkillCooldown=2;eq(g.trySoldierMeleeSkill2(u,lone),true,'skill 1 cooling down: charge even a single enemy');ok(lost(lone)>0);
  }
  {
    const u=fixture('spear');u.weaponSkillCooldown=0;
    const line=[60,85,110,135,150].map((d,i)=>enemy(`line-${i}`,d,i%2?6:-6)),off=enemy('off-line',90,60),behind=enemy('behind',-60);
    eq(g.trySoldierMeleeSkill2(u,line[0]),true,'two or more on the line');
    eq(line.slice(0,4).filter(m=>lost(m)>0).length,4,'first four on the line are pierced');eq(line[4].hp,line[4].maxHp,'fifth is beyond the cap');
    eq(off.hp,off.maxHp);eq(behind.hp,behind.maxHp);ok(u.weaponLungeTime>0,'lunge pose');ok(g.soldierSkillFx.some(f=>f.kind==='thrust'),'thrust light');
    const d=lost(line[0]);ok(line.slice(1,4).every(m=>lost(m)>d*.5&&lost(m)<d*2),'each pierced enemy takes the skill hit (only the usual sweet-spot band differs)');
  }
  // 6. Hammer: elites/bosses first, then the highest HP; wind-up, then one heavy hit with a stun.
  {
    const u=fixture('hammer'),small=enemy('small',40,0,5e7),big=enemy('big',70,0,9e7),out=enemy('out',200,0,1e9);
    eq(g.trySoldierMeleeSkill2(u,small),true);eq(small.hp,small.maxHp);eq(big.hp,big.maxHp,'no damage during the wind-up');ok(g.soldierSkillFx.some(f=>f.kind==='charge'));
    tickSoldierMeleeSkill(g,u,.3);ok(lost(big)>0,'the highest-HP enemy in reach is smashed');eq(small.hp,small.maxHp);eq(out.hp,out.maxHp,'out of reach is ignored');
    ok(big.magicStunTimer>0,'stun');ok(g.soldierSkillFx.some(f=>f.kind==='crack'),'ground cracks');
  }
  {
    const u=fixture('hammer'),big=enemy('big',40,0,9e7),elite=enemy('elite',60,0,1e7,{isElite:true});
    g.trySoldierMeleeSkill2(u,big);tickSoldierMeleeSkill(g,u,.3);ok(lost(elite)>0&&big.hp===big.maxHp,'elite is preferred over a bigger ordinary enemy');
  }
  {
    const u=fixture('hammer'),a=enemy('a',50);g.trySoldierMeleeSkill2(u,a);u.equipped.weapon=gear('sword');tickSoldierMeleeSkill(g,u,.3);eq(a.hp,a.maxHp,'weapon swap cancels the smash');
  }
  // 7. Axe: front half circle, up to 5; with one enemy it waits up to 3 s after becoming ready.
  {
    const u=fixture('axe');const front=[[50,0],[45,30],[45,-30],[20,70],[20,-70],[70,0]].map(([dx,dy],i)=>enemy(`front-${i}`,dx,dy)),back=enemy('back',-70,0),far=enemy('far',220);
    eq(g.trySoldierMeleeSkill2(u,front[0]),true);
    eq(front.filter(m=>lost(m)>0).length,5,'five in the front half circle');eq(back.hp,back.maxHp,'behind is outside the half circle');eq(far.hp,far.maxHp);
    ok(g.soldierSkillFx.some(f=>f.kind==='arc'),'half-circle trail');
  }
  {
    const u=fixture('axe');tickSoldierMeleeSkill(g,u,0);const lone=enemy('lone',50);
    eq(g.trySoldierMeleeSkill2(u,lone),false,'waits for a second enemy');
    for(let t=0;t<2.9;t+=.1)tickSoldierMeleeSkill(g,u,.1);eq(g.trySoldierMeleeSkill2(u,lone),false,'still within 3 s');
    tickSoldierMeleeSkill(g,u,.2);eq(g.trySoldierMeleeSkill2(u,lone),true,'after 3 s a single enemy is enough');
    const u2=fixture('axe');enemy('pair-a',50);const pb=enemy('pair-b',55,25);eq(g.trySoldierMeleeSkill2(u2,g.monsters[0]),true,'two enemies: no wait');ok(lost(pb)>0);
  }
  // 8. Walls block skill 2 without spending its CT.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS2)){
    const u=fixture(style),c=WORLD_SIZE/2;u.x=c-320;u.y=c-190;u.weaponSkillCooldown=1;u.weaponSkill2Ready=9;
    const m=enemy('wall-target');m.x=c-275;m.y=u.y;
    eq(g.trySoldierMeleeSkill2(u,m),false,`${style} wall`);eq(m.hp,1e8);eq(u.weaponSkill2Cooldown,0);
  }
  // 9. Spacing with skill 1: never the same frame, at least SOLDIER_SKILL_GAP apart.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS2)){
    const u=fixture(style),m=enemy('gap',style==='spear'?90:50),m2=enemy('gap-2',style==='spear'?120:55,style==='spear'?0:25);
    u.weaponSkillCooldown=0;u.weaponSkill2Cooldown=0;u.weaponSkill2Ready=9;
    g.update(.01);
    eq(u.weaponSkillCooldown>0&&u.weaponSkill2Cooldown===0,true,`${style}: skill 1 first, skill 2 held`);
    ok(u.weaponSkillGap>0&&u.weaponSkillGap<=SOLDIER_SKILL_GAP,'gap set');
    let t=0;while(u.weaponSkill2Cooldown===0&&t<2){g.update(.01);t+=.01;}
    ok(t>=SOLDIER_SKILL_GAP-.02&&t<SOLDIER_SKILL_GAP+.1,`${style}: skill 2 follows after the gap (${t.toFixed(2)}s)`);
    u.weaponSkillCooldown=0;eq(g.trySoldierMeleeSkill(u,m),false,'skill 1 waits for skill 2 too');
  }
  // 10. Save: CD and an in-flight combo are plain data; old saves without the fields start safely.
  {
    const u=fixture('sword'),m=enemy('save',40);g.trySoldierMeleeSkill2(u,m);
    const cd=u.weaponSkill2Cooldown,saved=structuredClone(g.saveGame({immediate:true}));assert.doesNotThrow(()=>JSON.stringify(saved));
    const raw=saved.squad.find(s=>s.id===u.id);delete raw.weaponSkill2Cooldown;delete raw.weaponSkill2Pending;delete raw.weaponSkillGap;delete raw.weaponSkill2Ready;
    g.resumeSavedGame(saved);const r=g.squad.find(s=>s.id===u.id);tickSoldierMeleeSkill(g,r,0);
    ok(Math.abs(r.weaponSkill2Cooldown-soldierMeleeReload(r,SOLDIER_MELEE_SKILLS2.sword)*.5)<1e-9,'old save: 50% start');ok(cd>0);
    r.weaponSkill2Pending={style:'sword',weaponId:'x',context:'field',steps:'bad'};assert.doesNotThrow(()=>tickSoldierMeleeSkill(g,r,.1));eq(r.weaponSkill2Pending,undefined,'broken pending is dropped');
  }
  // 11. Two-line description: skill 1 and skill 2 with multipliers and the displayed-ATK result.
  for(const style of Object.keys(SOLDIER_MELEE_SKILLS2)){
    const u=fixture(style,'HEAVY'),lines=soldierMeleeSkillLines(u);eq(lines.length,2);
    ok(lines[0].startsWith('スキル1 ')&&lines[1].startsWith(`スキル2 ${SOLDIER_MELEE_SKILLS2[style].name}`),lines.join('|'));
    ok(lines.every(l=>/ATK×\d\.\d/.test(l)&&/自動/.test(l)&&/CT\d+\.\d秒/.test(l)),lines.join('|'));
    ok(lines[1].includes(`ATK×${SOLDIER_MELEE_SKILLS2[style].mult.toFixed(1)}`));eq(soldierMeleeSkillText(u),lines.join('\n'));
  }
  // 12. Effects: update/draw are safe, respect the space and the reduced-motion preference.
  {
    fixture('axe');g.soldierSkillFx=[];for(const kind of ['slash','thrust','charge','crack','arc'])g.soldierSkillFx.push({kind,x,y,angle:0,len:40,width:3,seed:3,hits:[{x,y}],life:.3,maxLife:.3,context:'field'});
    assert.doesNotThrow(()=>drawSoldierSkillFx(ctx,g));
    window.matchMedia=globalThis.matchMedia=()=>({matches:true});assert.doesNotThrow(()=>drawSoldierSkillFx(ctx,g));delete globalThis.matchMedia;
    g.currentDungeon={id:'elsewhere'};updateSoldierSkillFx(g,.01);eq(g.soldierSkillFx.length,0,'effects of another space are dropped');g.currentDungeon=null;
    for(let i=0;i<100;i++)g.soldierSkillFx.push({kind:'arc',life:1,maxLife:1,context:'field'});ok(g.soldierSkillFx.length===100);
  }
  // 13. DPS regression in the real game loop: gain of skill 1+2 over skill 1 alone, single target and a dense group of 5.
  // Expected gains are the measured simulation of proposal A (D:\スマホゲーム工房_測定\skill2, T10, mastery 0).
  const EXPECT={HEAVY:{sword:[1.19,1.22],spear:[1.27,1.22],hammer:[1.75,1.64],axe:[1.49,1.78]},LIGHT:{sword:[1.11,1.14],spear:[1.17,1.14],hammer:[1.52,1.42],axe:[1.32,1.64]}};
  const spots=[[[45,0]],[[42,0],[50,6],[50,-6],[58,0],[66,3]]];
  const run=(style,cls,set,withSkill2)=>{
    const u=fixture(style,cls);u.atkCooldown=0;u.weaponSkillCooldown=undefined;u.weaponSkill2Cooldown=undefined;u.weaponSkill2Ready=0;
    const ms=spots[set].map(([dx,dy],i)=>enemy(`dps-${i}`,style==='spear'?dx+30:dx,dy,1e12));
    const home=ms.map(m=>[m.x,m.y]);const real=g.trySoldierMeleeSkill2;if(!withSkill2)g.trySoldierMeleeSkill2=()=>false;
    try{for(let i=0;i<1200;i++){g.update(.05);ms.forEach((m,k)=>{m.x=home[k][0];m.y=home[k][1];m.knockFly=0;m.knockTime=0;m.knockVx=0;m.knockVy=0;m.knockSlam=0;});}}
    finally{g.trySoldierMeleeSkill2=real;}
    return ms.reduce((s,m)=>s+lost(m),0);
  };
  const report=[];
  for(const cls of ['HEAVY','LIGHT'])for(const style of Object.keys(SOLDIER_MELEE_SKILLS2))for(const set of [0,1]){
    const one=run(style,cls,set,false),two=run(style,cls,set,true),gain=two/one,want=EXPECT[cls][style][set];
    report.push({cls,style,targets:set?5:1,one,two,gain,want});
  }
  console.log(report.map(r=>`${r.cls}/${r.style}/${r.targets}: gain ${r.gain.toFixed(3)} (sim ${r.want})`).join('\n'));
  // The simulation fires the axe at once; in game a lone enemy makes it wait up to rule.hold seconds (design), so scale its share.
  // Dense hammer/spear: the real normal attacks already sweep/pierce the whole group (the simulation counted the main target),
  // so the game's baseline is larger (hammer) or smaller (spear) there; only the direction and an upper bound are checked.
  for(const r of report){
    ok(r.one>0,'baseline deals damage');
    let want=r.want;
    if(r.style==='axe'&&r.targets===1){const u=fixture('axe',r.cls),ct=soldierMeleeReload(u,SOLDIER_MELEE_SKILLS2.axe);want=1+(want-1)*ct/(ct+SOLDIER_MELEE_SKILLS2.axe.hold);}
    if(r.targets===5&&['hammer','spear'].includes(r.style)){ok(r.gain>1.1&&r.gain<want*1.3,`${r.cls} ${r.style} dense gain ${r.gain.toFixed(3)} (simulation ${want})`);continue;}
    ok(Math.abs(r.gain-want)/want<=.15,`${r.cls} ${r.style} ${r.targets} targets: gain ${r.gain.toFixed(3)} vs simulation ${want.toFixed(3)}`);
  }
  console.log(`PASS: v7.1.5 skill 2 rules, eligibility, CT, sword combo, spear line, hammer priority, axe hold, walls, spacing, save, text, effects, DPS gain vs simulation (${checks} checks)`);
}finally{Math.random=random;dom.window.close();}
