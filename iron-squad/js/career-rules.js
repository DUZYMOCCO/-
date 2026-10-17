import {isOwnSquad} from './own-squad-marker.js?v=182';

export const CAREER_RULES=Object.freeze({companionLimit:5,invitationMerit:6000,invitationPhases:10,promotionExpMultiplier:8,maxActionExp:300});
const count=n=>Math.max(0,Math.floor(Number(n)||0));
export const newCareer=()=>({version:1,status:'traveler',contribution:0,activePhases:0,lastActivePhase:0,servicePhases:0,lastServicePhase:0,promotionServicePhases:0,joinedPhase:0});
/** The new save rules always start outside the army. */
export function normalizeCareer(raw,phase=1){
  const c=newCareer();
  if(!raw)return c;
  c.status=['traveler','invited','enlisted'].includes(raw.status)?raw.status:'traveler';
  for(const key of Object.keys(c).filter(k=>!['version','status'].includes(k)))c[key]=count(raw[key]);
  c.promotionServicePhases=Math.min(c.promotionServicePhases,c.servicePhases);
  return c;
}
export const isEnlisted=game=>game.career?.status==='enlisted';
export const ownCompanionCount=game=>[...(game.squad||[]),...(game.reserves||[])].filter(isOwnSquad).length;
export function rankForCareer(game,ranks){
  const rank=ranks[game.rankIndex]||ranks[0];
  return isEnlisted(game)?{...rank,personalGuards:Math.max(CAREER_RULES.companionLimit,rank.personalGuards||0)}:
    {...ranks[0],title:'在野の旅人',canCommand:false,personalGuards:CAREER_RULES.companionLimit,desc:gameText('仲間5人までの旅の一行。地域へ貢献すると本陣から声がかかります。')};
}
export function recordCareerContribution(game,merit,serviceExp=0){
  game.career||=newCareer();
  const c=game.career,phase=count(game.phase)||1,earned=count(merit);
  if(earned>0){
    c.contribution+=earned;
    if(c.lastActivePhase!==phase){c.lastActivePhase=phase;c.activePhases++;}
  }
  if(isEnlisted(game)&&serviceExp>0){
    game.exp=(game.exp||0)+Math.min(CAREER_RULES.maxActionExp,count(serviceExp));
    if(c.lastServicePhase!==phase){c.lastServicePhase=phase;c.servicePhases++;}
  }
  if(c.status==='traveler'&&c.contribution>=CAREER_RULES.invitationMerit&&c.activePhases>=CAREER_RULES.invitationPhases){
    c.status='invited';game.showToast?.('本陣から勧誘の話が届きました。戻って話を聞いてみましょう。');
  }
}
/** A new expedition restarts phase numbering, so service streaks restart with it. Status and contribution remain. */
export function restartCareerExpedition(career){
  return Object.assign(career,{lastActivePhase:0,servicePhases:0,lastServicePhase:0,promotionServicePhases:0});
}
export function enlistCareer(game){
  if(game.career?.status!=='invited')return false;
  Object.assign(game.career,{status:'enlisted',joinedPhase:count(game.phase)||1,servicePhases:0,lastServicePhase:0,promotionServicePhases:0});
  game.rankIndex=0;game.exp=0;return true;
}
export const promotionServiceRequired=rankIndex=>4+Math.max(0,rankIndex)*2;
export function canPromoteCareer(game,nextRank){
  if(!isEnlisted(game)||!nextRank||(game.exp||0)<nextRank.reqExp)return false;
  return game.career.servicePhases-game.career.promotionServicePhases>=promotionServiceRequired(game.rankIndex);
}
import {gameText} from './game-text.js?v=297';
export function careerSummary(game,ranks){
  const c=game.career;
  if(!isEnlisted(game))return c?.status==='invited'?'本陣から勧誘が届いています。帰還して話を聞けます。':
    gameText(`旅の仲間 ${ownCompanionCount(game)} / 5人 · 地域への貢献 ${c?.contribution||0} / ${CAREER_RULES.invitationMerit} · 活動した期 ${c?.activePhases||0} / ${CAREER_RULES.invitationPhases}`);
  const next=ranks[game.rankIndex+1];
  return next?`次の昇進：${next.title} · 本人と自部隊の功績 ${Math.floor(game.exp||0).toLocaleString()} / ${next.reqExp.toLocaleString()} · 前回の昇進から活動 ${Math.max(0,(c?.servicePhases||0)-(c?.promotionServicePhases||0))} / ${promotionServiceRequired(game.rankIndex)}期`:'最高階級です。';
}
