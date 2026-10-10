export const DAY_LENGTH=240;
export const NIGHT_LENGTH=240;
export const WORLD_DAY_LENGTH=DAY_LENGTH+NIGHT_LENGTH;

export function daylightAt(seconds=0) {
  const time=Math.max(0,Number(seconds)||0),position=time%WORLD_DAY_LENGTH;
  const period=position<DAY_LENGTH?'day':'night';
  const remaining=(period==='day'?DAY_LENGTH:WORLD_DAY_LENGTH)-position;
  const hour=(6+position/WORLD_DAY_LENGTH*24)%24;
  const minutes=Math.floor(hour*60);
  const clock=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  const dusk=period==='day'?Math.max(0,1-remaining/20):0;
  const dawn=period==='night'?Math.max(0,1-remaining/20):0;
  return {period,clock,day:Math.floor(time/WORLD_DAY_LENGTH)+1,remaining,
    label:dusk>0?'夕暮れ':dawn>0?'夜明け':period==='day'?'昼':'夜',
    icon:period==='day'?'☀':'☾',darkness:period==='day'?.03+.24*dusk:.27-.24*dawn};
}

export function advanceWorldClock(game,dt) {
  if(!game.inBattle || !Number.isFinite(dt) || dt<=0)return false;
  const previous=daylightAt(game.worldTime).period;
  game.worldTime=Math.max(0,Number(game.worldTime)||0)+dt;
  return previous!==daylightAt(game.worldTime).period;
}

export const PERIOD_ENEMIES={
  day:{
    ZONE_PEACE:{type:'wild_boar',name:'野猪',hp:46,atk:10,speed:72,radius:12,color:'#887052'},
    ZONE_WILD:{type:'sun_bandit',name:'日中の山賊',hp:85,atk:19,speed:90,radius:12,color:'#b39968'},
    ZONE_CHAOS:{type:'sun_guard',name:'遺跡の昼番',hp:155,atk:30,speed:60,radius:16,color:'#a99869',elite:true},
    ZONE_ABYSS:{type:'sun_guard',name:'最果ての昼番',hp:250,atk:38,speed:66,radius:17,color:'#a99869',elite:true}
  },
  night:{
    ZONE_PEACE:{type:'cave_bat',name:'夜コウモリ',hp:30,atk:7,speed:102,radius:9,color:'#82798d'},
    ZONE_WILD:{type:'shade_wolf',name:'影狼',hp:88,atk:21,speed:116,radius:12,color:'#606579'},
    ZONE_CHAOS:{type:'bone_warrior',name:'骸骨兵',hp:140,atk:26,speed:64,radius:13,color:'#cec7ae',elite:true},
    ZONE_ABYSS:{type:'bone_warrior',name:'古戦場の骸骨兵',hp:240,atk:36,speed:70,radius:15,color:'#b6b09e',elite:true}
  }
};

export function periodEnemy(zoneId,seconds,random=Math.random) {
  if(random()>=.4)return null;
  return PERIOD_ENEMIES[daylightAt(seconds).period][zoneId] || null;
}

export function enemyAvailable(enemy,period) {
  return !enemy.activePeriod || enemy.activePeriod===period;
}
