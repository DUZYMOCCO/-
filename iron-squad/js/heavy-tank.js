// 重装歩兵(HEAVY系統)のタンク特化: ヘイト距離補正・かばう(身代わり)・重圧オーラ・重撃スタン。純関数＋フレーム毎の健在重装キャッシュ。
import {attributeFamily} from './unit-attributes.js?v=298';
import {activeSquad} from './instance-rules.js?v=321';
import {weaponStyleOf} from './growth-rules.js?v=295';
export const TANK={hateDistMult:.5,hateReach:1000,coverRadius:75,coverShare:.5,coverMinHp:.20,auraRadius:48,auraSlow:.60,slowFloor:.25,stunChance:.35,stunSeconds:.8,bossStunMult:.5};
const alive=u=>!!u&&!u.dead&&!u.isDown&&(u.hp||0)>0;
/** 兵士の重装(隊長・英雄・門番・商人は除く)。 */
export const isHeavySoldier=u=>!!u&&!u.isPlayer&&!u.isHero&&!u.isGateGuard&&!u.isCommerce&&!!(u.soldierClass||u.combatClass)&&attributeFamily(u)==='HEAVY';
export const isTankHeavy=u=>alive(u)&&isHeavySoldier(u);
/** フレーム頭で1回: 味方集合と健在重装リストを作る(以降の敵ループ・被弾はこれを使う)。 */
export function prepareTanks(game,squad=activeSquad(game)){
  game._tankAllies=new Set(squad);game._tankHeavies=squad.filter(isTankHeavy);
}
const heavies=game=>game._tankHeavies||activeSquad(game).filter(isTankHeavy);
const allies=game=>game._tankAllies||new Set(activeSquad(game));
/** 柱1: 敵の索敵で重装は見かけ距離が半分(二乗では×0.25)。移動・射程には使わない。 */
export const tankEvalDistSq=(unit,dsq)=>isTankHeavy(unit)?dsq*TANK.hateDistMult*TANK.hateDistMult:dsq;
/** 柱3-A: 重圧オーラ内なら速度×0.60(魔法鈍足と重複、下限25%)。base=魔法鈍足込みの係数。 */
export function tankSlowFactor(game,m,base=1){
  const list=game._tankHeavies;if(!list||!list.length)return base;
  const r=TANK.auraRadius,r2=r*r;
  for(let i=0;i<list.length;i++){const h=list[i];const dx=h.x-m.x;if(dx>r||dx<-r)continue;const dy=h.y-m.y;if(dy>r||dy<-r)continue;if(dx*dx+dy*dy<=r2&&isTankHeavy(h))return Math.max(TANK.slowFloor,base*TANK.auraSlow);}
  return base;
}
/** 柱2: 重装以外の味方が敵から被弾→最寄りの健在重装(HP>20%)へ半分を肩代わり。{guardian,share,rest}かnull。 */
export function tankCover(game,victim,rawDmg,options={}){
  if(options.environmental||options.cover||options.noCover||!options.attacker||!(rawDmg>0)||!victim)return null;
  if(isHeavySoldier(victim))return null;
  const list=game._tankHeavies||heavies(game);if(!list.length)return null;
  if(victim!==game.player&&!allies(game).has(victim))return null;
  const r2=TANK.coverRadius*TANK.coverRadius;let best=null,bd=r2;
  for(let i=0;i<list.length;i++){const g=list[i];if(g===victim||!isTankHeavy(g)||g.hp<=g.maxHp*TANK.coverMinHp)continue;const dx=g.x-victim.x,dy=g.y-victim.y,d=dx*dx+dy*dy;if(d<=bd){bd=d;best=g;}}
  if(!best)return null;
  const share=rawDmg*TANK.coverShare;
  return {guardian:best,share,rest:rawDmg-share};
}
/** 柱3-B: 大盾装備か槌・斧の重装の近接命中で35%スタン。返り値=付与秒(0なら無し)。巨頭は無効・ボスは半減。 */
export function tankStunSeconds(attacker,monster,rand=Math.random){
  if(!isHeavySoldier(attacker)||!monster||monster.isColossal)return 0;
  const w=attacker.equipped?.weapon||attacker.weapon,style=weaponStyleOf(w);
  if(!attacker.equipped?.shield&&style!=='hammer'&&style!=='axe')return 0;
  if(rand()>=TANK.stunChance)return 0;
  return TANK.stunSeconds*(monster.isBoss||monster.isDungeonBoss?TANK.bossStunMult:1);
}
