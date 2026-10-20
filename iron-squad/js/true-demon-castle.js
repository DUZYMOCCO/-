// v7.2.17: 真魔王城。魔王が倒れると南東の果てに現れ、入れるようになる。勇者隊は向かわない（勇者の行き先は封印と魔王城だけ）。
import {DUNGEON_DEFS} from './dungeon.js?v=351';
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
