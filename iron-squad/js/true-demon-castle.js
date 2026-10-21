// v7.2.17: 真魔王城。魔王が倒れると南東の果てに現れ、入れるようになる。v7.2.20 から、魔王が倒れたあとの勇者隊もここへ向かう（hero-party.js）。
import {DUNGEON_DEFS,TRUE_DEMON_KING_HP,TRUE_DEMON_KING_ATK} from './dungeon.js?v=354';
import {addBattleReport} from './battle-report.js?v=333';
export const TRUE_CASTLE_ID='dungeon_true_demon_castle';
const DEMON_CASTLE_ID='dungeon_demon_castle',TAU=Math.PI*2;
export const TRUE_CASTLE_RULES=Object.freeze({revealRadius:2600});
export const trueCastleDef=()=>DUNGEON_DEFS.find(d=>d.id===TRUE_CASTLE_ID);
const int=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
/** 魔王が一度でも倒れた世界（勇者でも隊長でも、旧セーブで魔王城が踏破済みでも）。 */
export function demonKingFallen(game){
  return !!(game?.heroJourney?.demonKingDefeat||(game?.dungeons||[]).find(d=>d.id===DEMON_CASTLE_ID)?.cleared);
}
export const trueCastleOpen=game=>!!(game?.trueCastle?.unlocked||demonKingFallen(game));
/** 一覧（game.dungeons）に真魔王城を出し入れする。閉じている間は記録を預かり、開いたら戻す。 */
export function syncTrueCastleEntry(game){
  const list=game.dungeons||(game.dungeons=[]),i=list.findIndex(d=>d.id===TRUE_CASTLE_ID),def=trueCastleDef();
  if(!def)return null;
  if(!trueCastleOpen(game)){
    if(i>=0){const d=list[i];game._trueCastleRecord={cleared:!!d.cleared,discovered:!!d.discovered,clearedWave:d.clearedWave||0,clearedPhase:d.clearedPhase||0};list.splice(i,1);}
    return null;
  }
  if(i>=0)return list[i];
  const kept=game._trueCastleRecord||{};
  const entry={...def,cleared:!!kept.cleared,discovered:!!kept.discovered,clearedWave:kept.clearedWave||0,...(kept.clearedPhase?{clearedPhase:kept.clearedPhase}:{})};
  list.push(entry);return entry;
}
function revealTrueCastle(game){
  const d=trueCastleDef();if(!d)return;
  try{game.ensureFog?.()?.forceRevealAt?.(d.entrance.x,d.entrance.y,TRUE_CASTLE_RULES.revealRadius);}catch{}
}
/** 魔王が倒れた瞬間に呼ぶ。魔王の最期の言葉と、遠くに城が現れる場面。 */
export function unlockTrueCastle(game,{by='commander'}={}){
  const s=game.trueCastle||(game.trueCastle={unlocked:false,unlockedPhase:0,defeats:0,firstDefeat:null});
  if(s.unlocked)return false;
  s.unlocked=true;s.unlockedPhase=int(game.phase)||1;
  syncTrueCastleEntry(game);revealTrueCastle(game);
  const king='深淵魔王ヴァルドール';
  game.showToast?.(`😈「……みごとだ。だが、わしは門番にすぎぬ。南東の地のはしで、真の王が目ざめる……」――${king}、最後のことば`,{field:true,important:true});
  game.showToast?.('🏰👿 南東の遠くに、黒い城のかげが見えてきた。真魔王城が姿を現した。',{field:true,important:true});
  addBattleReport(game,'boss',`魔王の最後のことば。南東のはしに真魔王城が現れた（${by==='hero'?'勇者隊の勝利のあと':'隊長側の勝利のあと'}）`);
  game.trueCastleReveal={t:0};
  return true;
}
/** 新しいゲーム・読み込みのたびに呼ぶ。旧セーブで魔王が倒れていれば、場面なしで開いた状態にする。 */
export function initializeTrueCastle(game,saved=null){
  const old=saved?.trueCastle&&typeof saved.trueCastle==='object'?saved.trueCastle:{};
  game.trueCastle={unlocked:!!old.unlocked,unlockedPhase:int(old.unlockedPhase),defeats:int(old.defeats),firstDefeat:old.firstDefeat&&typeof old.firstDefeat==='object'?{phase:int(old.firstDefeat.phase),by:old.firstDefeat.by==='hero'?'hero':'commander',name:String(old.firstDefeat.name||'隊長').slice(0,40)}:null};
  game._trueCastleRecord=null;
  if(!game.trueCastle.unlocked&&demonKingFallen(game)){game.trueCastle.unlocked=true;game.trueCastle.unlockedPhase=int(game.phase)||1;game._trueCastleLateReveal=true;}
  syncTrueCastleEntry(game);
  if(game.trueCastle.unlocked)revealTrueCastle(game);
  return game.trueCastle;
}
export const serializeTrueCastle=game=>{const s=game.trueCastle||{};return {unlocked:!!s.unlocked,unlockedPhase:int(s.unlockedPhase),defeats:int(s.defeats),firstDefeat:s.firstDefeat||null};};
/** 旧セーブ：読み込み後の最初の更新で一度だけ知らせる（場面は出さない）。 */
export function updateTrueCastle(game,dt){
  if(game._trueCastleLateReveal){game._trueCastleLateReveal=false;game.showToast?.('🏰👿 南東のはしに、黒い城がそびえている。真魔王城だ。',{field:true,important:true});}
  if(game.trueCastleReveal){game.trueCastleReveal.t+=dt;if(game.trueCastleReveal.t>12)game.trueCastleReveal=null;}
}
/** 世界地図の印（開いたあとだけ）。 */
export function drawTrueCastleMap(c,game,px,py){
  if(!trueCastleOpen(game))return;const d=trueCastleDef();if(!d)return;
  const x=px(d.entrance.x),y=py(d.entrance.y),beat=game.trueCastleReveal?1+.35*Math.sin(game.trueCastleReveal.t*5):1;
  c.save();c.fillStyle='#3b0764';c.strokeStyle='#c4b5fd';c.lineWidth=1.5;
  c.beginPath();c.moveTo(x-6,y+5);c.lineTo(x-6,y-3);c.lineTo(x-3,y-8);c.lineTo(x,y-3);c.lineTo(x+3,y-8);c.lineTo(x+6,y-3);c.lineTo(x+6,y+5);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#e9d5ff';c.lineWidth=1;c.beginPath();c.arc(x,y,10*beat,0,TAU);c.stroke();
  c.font='bold 9px sans-serif';c.textAlign='right';c.lineWidth=3;c.strokeStyle='#111827';c.strokeText('真魔王城',x-12,y+3);c.fillStyle='#e9d5ff';c.fillText('真魔王城',x-12,y+3);
  c.restore();
}
/** 野外の入口：黒い尖塔の城。 */
export function drawTrueCastleEntrance(ctx,def,time=0){
  if(def?.id!==TRUE_CASTLE_ID)return false;
  const {x,y}=def.entrance,glow=.55+.25*Math.sin(time*3);
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(x+4,y+12,92,20,0,0,TAU);ctx.fill();
  const tower=(cx,w,h,roof)=>{ctx.fillStyle='#1c1325';ctx.fillRect(cx-w/2,y+10-h,w,h);ctx.fillStyle='#2e1f3d';ctx.fillRect(cx-w/2,y+10-h,w*.35,h);
    ctx.fillStyle='#0d0814';ctx.beginPath();ctx.moveTo(cx-w/2-4,y+10-h);ctx.lineTo(cx,y+10-h-roof);ctx.lineTo(cx+w/2+4,y+10-h);ctx.closePath();ctx.fill();
    ctx.fillStyle=`rgba(167,139,250,${glow})`;ctx.fillRect(cx-2,y+10-h*.7,4,7);};
  tower(-62+x,24,70,30);tower(62+x,24,70,30);tower(-30+x,26,96,40);tower(30+x,26,96,40);tower(x,34,128,56);
  ctx.fillStyle='#120b1a';ctx.fillRect(x-72,y-22,144,32);
  for(let i=-70;i<70;i+=12){ctx.fillRect(x+i,y-28,7,6);}
  ctx.fillStyle='#050208';ctx.beginPath();ctx.moveTo(x-14,y+10);ctx.lineTo(x-14,y-8);ctx.quadraticCurveTo(x,y-24,x+14,y-8);ctx.lineTo(x+14,y+10);ctx.closePath();ctx.fill();
  ctx.strokeStyle=`rgba(196,181,253,${glow})`;ctx.lineWidth=2;ctx.stroke();
  ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#0b0614';ctx.strokeText(def.name,x,y+34);ctx.fillStyle='#e9d5ff';ctx.fillText(def.name,x,y+34);
  if(def.cleared){ctx.font='11px sans-serif';ctx.strokeText('踏破済',x,y+49);ctx.fillStyle='#a5b4fc';ctx.fillText('踏破済',x,y+49);}
  ctx.restore();
  return true;
}

// v7.2.18: 真魔王ゼルヴァーン。攻撃は決まった値。v7.2.22 から HP は挑む隊の魔王HP×10（下限100億）、勇者だけなら勇者が会った魔王HP×10。
// ふだんの攻撃は防御で減る近接（周りも薙ぐ）と、魔法防御で減る「虚空の波動」。段階ごとに大技が増える：
//  第2段（HP70%以下）「さばきの刻」：近くの全員に最大HPの割合ダメージ（防御無視）。聖域・身代わり・結界などの保護で減る。
//  第3段（HP40%以下）「終わりの鐘」：数人に最大HPを大きく超える割合ダメージ。聖域と身代わりが重ならないと倒れ、蘇生が追いつかないと崩れる。
// 段階が変わるときは数秒「虚空の障壁」で攻撃が通らない（一瞬で終わらないように）。調整はこの表だけ。
export const TRUE_KING_RULES=Object.freeze({
  heroStrikePct:0.35, // v7.2.20: vs the hero party only (index.js damageTarget)
  kingHpMultiple:10, // v7.2.22: HP = その隊が魔王と戦うときのHP×10（下限は hp）。勇者だけなら勇者が入ったときの魔王HP×10（下限なし）
  hp:TRUE_DEMON_KING_HP, atk:TRUE_DEMON_KING_ATK, strikeInterval:1.5, cleaveRadius:90, reach:96,
  wave:{interval:3.5,radius:320,atk:30_000},
  growthStrength:2_000_000, // 被弾成長はこの強さの敵として数える（決まった巨大ATKで成長が跳ねないように）
  phaseAt:[0.7,0.4], barrierSeconds:8,
  judgment:{phase:2,interval:22,windup:2,radius:650,pct:1.2},
  requiem:{phase:3,interval:22,windup:2.5,targets:2,pct:4.0},
  // 大技は聖騎士の系統（聖域）の光が届く者（この距離以内）には1/4しか通らない。ふつうの聖域（140px・-30%）・身代わりとも重なる。
  // 光がなければさばきの刻（最大HPの120%）で倒れる。終わりの鐘（400%）は光の中でも100%なので、身代わりか近くの聖域が重ならないと倒れ、蘇生が要る。
  sanctuary:{radius:300,cut:0.25},
  firstReward:{orbs:20,gems:5}
});
export function shapeTrueDemonKing(king,hp=TRUE_KING_RULES.hp){
  const R=TRUE_KING_RULES;if(!king)return king;hp=Math.max(1,Math.round(Number(hp)||R.hp));
  Object.assign(king,{hp,maxHp:hp,atk:R.atk,attackInterval:R.strikeInterval,cleaveRadius:R.cleaveRadius,attackReach:R.reach,skillCooldown:9999,skillTimer:9999,isTrueDemonKing:true,hitGrowthStrength:R.growthStrength});
  king.tk={phase:1,barrier:0,lockHp:0,wave:R.wave.interval,judgment:R.judgment.interval,requiem:R.requiem.interval,cast:null};
  return king;
}
const ready=u=>!!u&&!u.dead&&!u.isDown&&u.hp>0;
const SANCTUARY_CLASSES=['PALADIN','TEMPLAR','IMMORTAL_AEGIS'];
/** 大技の割合：聖域の光（聖騎士の系統が近くにいる）なら半分。 */
export function trueKingBlowPct(game,u,pct){const S=TRUE_KING_RULES.sanctuary;const lit=(game.squad||[]).some(s=>ready(s)&&SANCTUARY_CLASSES.includes(s.soldierClass)&&(!game.currentDungeon||!s.heroPartyId)&&Math.hypot(s.x-u.x,s.y-u.y)<=S.radius);return lit?pct*S.cut:pct;}
const say=(game,m,text,color)=>game.spawnDamageText?.(m.x,m.y-120,text,color); // v7.2.24: above the larger body
function alliesOf(game,units){return [game.player,...(units||[])].filter(u=>ready(u)&&!(u===game.player&&game.spectating));}
/** 毎フレーム。true を返す間（大技の詠唱中・障壁中）は通常の移動・攻撃をしない。 */
export function updateTrueDemonKing(game,m,dt,units){
  const R=TRUE_KING_RULES,s=m.tk||(shapeTrueDemonKing(m),m.tk);
  // 段階の切り替え：しきい値で止めて障壁を張る
  if(s.phase<3){const th=R.phaseAt[s.phase-1]*m.maxHp;if(m.hp<=th){m.hp=th;s.lockHp=th;s.phase++;s.barrier=R.barrierSeconds;s.cast=null;
    if(s.phase===2)s.judgment=Math.min(s.judgment,R.judgment.windup+.5);else s.requiem=Math.min(s.requiem,R.barrierSeconds-R.requiem.windup);
    game.screenShake=Math.max(game.screenShake||0,.7);
    game.showToast?.(s.phase===2?'👿「……ほう、ここまで来るか。ならば、さばきを受けよ」――真魔王が虚空の守りをまとった':'👿「終わりだ。おまえたちをここでほうむってやろう」――真魔王のようすがかわった',{field:true,urgent:true});}}
  if(s.barrier>0){s.barrier-=dt;if(m.hp<s.lockHp)m.hp=s.lockHp;if(s.barrier<=0)s.lockHp=0;}
  const allies=alliesOf(game,units);
  // 虚空の波動（魔法・魔法防御で減る）
  s.wave-=dt;if(s.wave<=0){s.wave=R.wave.interval;let hit=0;
    for(const u of allies)if(Math.hypot(u.x-m.x,u.y-m.y)<=R.wave.radius){game.damageTarget(u,R.wave.atk,{attacker:m,damageKind:'magic'});hit++;}
    if(hit)say(game,m,'🌑虚空の波動','#a78bfa');}
  // 大技の詠唱と発動
  if(s.cast){s.cast.t-=dt;if(s.cast.t>0)return true;const kind=s.cast.kind;s.cast=null;
    if(kind==='judgment'){for(const u of alliesOf(game,units))if(Math.hypot(u.x-m.x,u.y-m.y)<=R.judgment.radius)game.damageTarget(u,m.atk,{attacker:m,damageKind:'magic',pctMax:trueKingBlowPct(game,u,R.judgment.pct)});
      game.screenShake=Math.max(game.screenShake||0,.8);say(game,m,'⚖️さばきの刻!','#f472b6');}
    else{const pool=alliesOf(game,units).filter(u=>Math.hypot(u.x-m.x,u.y-m.y)<=900);
      for(let k=0;k<R.requiem.targets&&pool.length;k++){const u=pool.splice(Math.floor(Math.random()*pool.length),1)[0];game.damageTarget(u,m.atk,{attacker:m,damageKind:'magic',pctMax:trueKingBlowPct(game,u,R.requiem.pct)});}
      game.screenShake=Math.max(game.screenShake||0,.9);say(game,m,'⚰️終わりの鐘!','#e879f9');}
    return true;}
  if(s.phase>=R.judgment.phase){s.judgment-=dt;if(s.judgment<=0){s.judgment=R.judgment.interval;s.cast={kind:'judgment',t:R.judgment.windup,total:R.judgment.windup,radius:R.judgment.radius};say(game,m,'⚖️さばきの刻が来る……','#f9a8d4');return true;}}
  if(s.phase>=R.requiem.phase){s.requiem-=dt;if(s.requiem<=0){s.requiem=R.requiem.interval;s.cast={kind:'requiem',t:R.requiem.windup,total:R.requiem.windup,radius:120};say(game,m,'⚰️終わりの鐘が鳴りはじめる……','#f0abfc');return true;}}
  return s.barrier>0;
}
/** 真魔王が倒れたとき。初めての討伐は記録・発表・追加の褒美。 */
export function recordTrueKingDefeat(game,attacker=null,isPlayer=false){
  const s=game.trueCastle||(game.trueCastle={unlocked:true,unlockedPhase:int(game.phase)||1,defeats:0,firstDefeat:null});
  s.defeats=int(s.defeats)+1;
  const name=isPlayer?'隊長':String(attacker?.name||'味方').slice(0,40);
  if(s.firstDefeat){game.showToast?.(`👿 真魔王ゼルヴァーンをふたたび討った（${s.defeats}度目）`,{field:true,important:true});return false;}
  s.firstDefeat={phase:int(game.phase)||1,by:'commander',name};
  const R=TRUE_KING_RULES.firstReward;game.awakeningOrbs=(game.awakeningOrbs||0)+R.orbs;game.awakeningGems=(game.awakeningGems||0)+R.gems;
  game.showToast?.(`👿👑【真魔王討伐！！】『真魔王ゼルヴァーン』が倒れた。世界のはての玉座は、ついに空になった（トドメ：${name}）`,{field:true,urgent:true});
  game.showToast?.(`💎 真魔王討伐のほうび：覚醒宝珠 +${R.orbs}・神話宝玉 +${R.gems}`,{field:true,important:true});
  addBattleReport(game,'boss',`真魔王ゼルヴァーンを初めて討伐（第${s.firstDefeat.phase}期・トドメ：${name}）。覚醒宝珠+${R.orbs}・神話宝玉+${R.gems}`);
  return true;
}
