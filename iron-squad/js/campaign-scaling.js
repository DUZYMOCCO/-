// Only the three authored borders jump. Never multiply these values by another ring.
export const CAMPAIGN_SCALE_VERSION=2,DEMON_KING_HP=1_000_000_000;
const CASTLE_DISTANCE=Math.hypot(42000,42000),REWARD_WALL=Math.sqrt(10);
export const CAMPAIGN_BORDERS=Object.freeze([8000,22000,48000]);
const VERSION_1_POINTS=Object.freeze([
  [0,1,1,1,1],
  [8000,1.25,1.25,1.35,1.35],
  [22000,12,10,75,60],
  [48000,180,100,500,400],
  [Math.hypot(42000,42000),3000,350,1900,1600],
  [79360,20000,1000,26000,22000]
]);
export const CAMPAIGN_SCALE_POINTS=Object.freeze([
  [0,1,1,1,1],
  [7999,1.25,1.25,1.35,1.35],
  [8000,12.5,6,1.35*REWARD_WALL,1.35*REWARD_WALL],
  [21999,25,12,75,60],
  [22000,250,60,75*REWARD_WALL,60*REWARD_WALL],
  [47999,600,120,500,400],
  [48000,6000,600,500*REWARD_WALL,400*REWARD_WALL],
  // HP stays on the 480m -> rim logarithmic line; only ATK needs a castle control point.
  [CASTLE_DISTANCE,6000*(1_000_000/6000)**((CASTLE_DISTANCE-48000)/(79360-48000)),1000,1900,1600],
  [79360,1_000_000,20_000,26000,22000]
]);
function scale(points,distance,phase,walls=false){
  const d=Math.max(0,Math.min(79360,Number(distance)||0));
  let a=points[0],b=points[1];
  for(let i=1;i<points.length;i++){a=points[i-1];b=points[i];if(d<=b[0])break;}
  const t=Math.max(0,Math.min(1,(d-a[0])/(b[0]-a[0]))),s=t*t*(3-2*t);
  // A left-limit sample and border are 1cm apart; the jump occurs AT the border.
  const border=walls&&b[0]-a[0]===1&&CAMPAIGN_BORDERS.includes(b[0]);
  const value=i=>d===b[0]?b[i]:border?a[i]:Math.exp(Math.log(a[i])+(Math.log(b[i])-Math.log(a[i]))*(walls&&i<3?t:s));
  const phaseBonus=1+Math.min(.6,Math.max(0,(Number(phase)||1)-1)*.025);
  return {hp:value(1)*phaseBonus,atk:value(2)*phaseBonus,exp:value(3)*phaseBonus,gold:value(4)*phaseBonus,phaseBonus,ringPower:value(1)};
}
export const campaignScaling=(distance,phase=1)=>scale(CAMPAIGN_SCALE_POINTS,distance,phase,true);
// v7.2.19: the abyss beyond the demon castle. Only where BOTH offsets from headquarters pass the castle (+42,000, +42,000), so the
// other three corners and everything north / west of the castle keep the distance curve. Field enemies grow log-linearly from x1 at
// the castle line to x10 at the true demon castle line (+74,000) and stay x10 to the map edge.
export const ABYSS_START=42000,ABYSS_FULL=74000,ABYSS_MAX=10;
export function southEastAbyss(dx,dy){
  const reach=Math.min(Number(dx)||0,Number(dy)||0)-ABYSS_START;
  if(!(reach>0))return 1;
  return ABYSS_MAX**Math.min(1,reach/(ABYSS_FULL-ABYSS_START));
}
// Keep the old curve for 1 -> 2 migration and the unchanged random HQ raid producer.
export const campaignScalingV1=(distance,phase=1)=>scale(VERSION_1_POINTS,distance,phase);
// Only for migrating authored enemies retained by an old save, never for new generation.
function legacyScaling(distance,phase){
  const raw=Math.max(0,Number(distance)||0),d=Math.min(70000,raw);
  const knots=[[0,1,1],[7999,1.25,1.25],[8000,6,6],[21999,8.5,8.5],[22000,35,32],[47999,45,42],[48000,180,160],[70000,280,240]];
  let a=knots[0],b=knots[1];for(let i=1;i<knots.length;i++){a=knots[i-1];b=knots[i];if(d<=b[0])break;}
  const t=(d-a[0])/(b[0]-a[0]),u=Math.min(1,Math.max(0,(raw-48000)/(79360-48000)));
  const rings=raw<8000?0:raw<22000?1:raw<48000?2:3+3*u*u*(3-2*u),power=10**rings;
  const ring=raw<8000?1:Math.min(1e6,power/(1+power/2e7)),p=1+Math.min(.6,Math.max(0,(phase||1)-1)*.025);
  return {hp:(a[1]+(b[1]-a[1])*t)*ring*p,atk:(a[2]+(b[2]-a[2])*t)*ring*p};
}
/** Retain identity, buffs and the fraction of remaining HP, and never rescale twice. */
export function migrateCampaignEnemy(enemy,distance,phase=1){
  if(!enemy||enemy.campaignScaleVersion>=CAMPAIGN_SCALE_VERSION)return enemy;
  const before=Math.max(1,enemy.maxHp||enemy.hp||1),ratio=Math.max(0,Math.min(1,(enemy.hp||0)/before));
  if(enemy.isDemonKing||enemy.type==='demon_king'){
    const oldBase=enemy.campaignScaleVersion===1?DEMON_KING_HP:10_000_000;
    enemy.maxHp=Math.round(before*DEMON_KING_HP/oldBase);enemy.hp=Math.round(enemy.maxHp*ratio);
  }else if(!enemy.isRaidMob&&!(enemy.isColossal&&!enemy.isDungeonBoss)){
    const old=enemy.campaignScaleVersion===1?campaignScalingV1(distance,phase):legacyScaling(distance,phase),next=campaignScaling(distance,phase);
    const oldHp=enemy.isDungeonBoss?Math.max(1,old.hp*.75):old.hp,newHp=enemy.isDungeonBoss?Math.max(1,next.hp*.75):next.hp;
    const oldAtk=enemy.isDungeonBoss?Math.max(1,old.atk*.75):old.atk,newAtk=enemy.isDungeonBoss?Math.max(1,next.atk*.75):next.atk;
    enemy.maxHp=Math.max(1,Math.round(before*newHp/oldHp));enemy.hp=Math.round(enemy.maxHp*ratio);
    if(enemy.atk>0)enemy.atk=Math.max(1,Math.round(enemy.atk*newAtk/oldAtk));
  }
  enemy.campaignScaleVersion=CAMPAIGN_SCALE_VERSION;return enemy;
}
