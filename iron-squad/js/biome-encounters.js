import {ENEMY_ROSTER} from './enemy-art.js?v=280';
import {biomeAt} from './world.js?v=281';
import {daylightAt,PERIOD_ENEMIES} from './day-night.js?v=182';
const C=79360;
// Multipliers are against an ordinary enemy in the SAME distance band.
// Campaign scaling (including the three strength jumps) is applied afterwards.
const NEW={
 road_archer:[.8,.85,83,'formation','road_archer'],bandit_rider:[1.1,1,132],wild_dog:[.62,.72,118,'pack'],plains_bull:[1.5,1.15,66,null,null,'charge'],
 salt_scorpion:[1.05,1.05,66],sand_worm:[1.5,1.18,42],salt_mummy:[1.25,1,58],dust_spirit:[.72,.85,82,null,'dust_spirit','flying'],
 goat_ogre:[1.3,1.12,65],snow_wolf:[.8,.9,117,'pack'],rock_troll:[1.65,1.15,43],harpy:[.8,.86,108,null,null,'flying'],
 bog_slime:[.7,.75,57,'pack'],giant_frog:[1.1,1.04,85],lizard_spearman:[1.1,1,75,'formation'],marsh_wisp:[.65,.85,83,null,'marsh_wisp','flying'],
 wraith:[.9,.95,80,null,null,'flying'],vampire_bat:[.6,.65,126,'pack',null,'flying'],imp:[.68,.8,105,'pack'],demon_lancer:[1.2,1.08,74,'formation'],demon_mage:[.8,1,64,null,'demon_mage'],hellhound:[1.08,1.1,124,null,null,'charge']
};
export const BIOME_ENEMY_PROFILES=Object.freeze(Object.fromEntries(ENEMY_ROSTER.map(e=>{
 const [hp,atk,speed,group,rangedKind,behavior]=NEW[e.id];return [e.id,Object.freeze({type:e.id,name:e.name,radius:Math.max(16,e.radius),hp,atk,speed,group,rangedKind,flying:behavior==='flying',charge:behavior==='charge',nightOnly:['wraith','vampire_bat'].includes(e.id)})];
})));
const REGIONAL={east:['road_archer','bandit_rider','wild_dog','plains_bull'],south:['salt_scorpion','sand_worm','salt_mummy','dust_spirit'],north:['goat_ogre','snow_wolf','rock_troll','harpy'],west:['bog_slime','giant_frog','lizard_spearman','marsh_wisp']};
const OLD={east:['goblin','wild_boar','wolf','orc','wyvern'],south:['slime','sun_bandit','bone_warrior','sun_guard','dragon'],north:['wolf','wild_boar','orc','wyvern','dragon'],west:['slime','goblin','shade_wolf','orc','wyvern']};
const ZONES=['ZONE_PEACE','ZONE_WILD','ZONE_CHAOS','ZONE_ABYSS'];
export const ENCOUNTER_TABLES=Object.freeze(ZONES.map((zone,band)=>Object.freeze(Object.fromEntries(Object.keys(REGIONAL).map(region=>[region,Object.freeze(Object.fromEntries(['day','night'].map(period=>{
 const periodDef=PERIOD_ENEMIES[period][zone],first=region==='east'?periodDef.type:period==='night'?(region==='west'?'shade_wolf':'bone_warrior'):(band>1?'sun_guard':'wild_boar');
 const entries=[{type:first,weight:region==='east'?38:12,activePeriod:period}];
 REGIONAL[region].forEach((type,i)=>entries.push({type,weight:([14,13,21,12][i])+(band>1&&i===3?8:0)}));
 const ids=OLD[region];for(let i=0;i<=Math.min(4,band+1);i++){const type=ids[i];if(period==='day'&&['bone_warrior','shade_wolf'].includes(type))continue;entries.push({type,weight:i>band+1?0:9});}
 if(period==='night')entries.push({type:'wraith',weight:14,activePeriod:'night'},{type:'vampire_bat',weight:14,activePeriod:'night'});
 return [period,Object.freeze(entries.map(Object.freeze))];
}))) ])))));
export const encounterBand=distance=>distance<8000?0:distance<22000?1:distance<48000?2:3;
export const castleEncounterChance=(x,y)=>Math.max(0,1-Math.hypot(x-C-42000,y-C-42000)/32000)*.8;
const pick=(entries,random)=>{let n=random()*entries.reduce((s,e)=>s+e.weight,0);for(const e of entries){n-=e.weight;if(n<0)return e;}return entries.at(-1);};
export function selectBiomeEncounter(x,y,seconds=0,random=Math.random){
 const band=encounterBand(Math.hypot(x-C,y-C)),region=biomeAt(x,y).id||'east',period=daylightAt(seconds).period;
 const chance=castleEncounterChance(x,y);
 if(chance>0&&random()<chance)return {...pick([{type:'imp',weight:20},{type:'demon_lancer',weight:20},{type:'demon_mage',weight:18},{type:'hellhound',weight:18},{type:'demon_front',weight:14},{type:'demon_rear',weight:10}],random),band,region,castle:true};
 return {...pick(ENCOUNTER_TABLES[band][region][period],random),band,region};
}
export function biomeEnemyStats(encounter,zoneId){
 const {type,band}=encounter,profile=BIOME_ENEMY_PROFILES[type];
 if(profile){const hp=[55,90,140,200][band],atk=[12,18,20,18][band];return {...profile,rawHp:Math.round(hp*profile.hp),rawAtk:Math.round(atk*profile.atk),color:'#879686',attackReach:type==='lizard_spearman'||type==='demon_lancer'?46:undefined};}
 const period=encounter.activePeriod&&PERIOD_ENEMIES[encounter.activePeriod][zoneId];
 if(period?.type===type)return {type,name:period.name,rawHp:period.hp,rawAtk:period.atk,speed:period.speed,radius:period.radius,color:period.color};
 const old={slime:[45,10,65,10],goblin:[band?75:60,band?15:14,78,11],wolf:[90,18,114,12],orc:[band>1?100:120,band>1?16:22,66,15],wyvern:[band>2?160:140,band>2?14:20,84,18],dragon:[240,18,65,28],wild_boar:[46,10,72,12],sun_bandit:[85,19,90,12],sun_guard:[band>2?250:155,band>2?38:30,60,16],bone_warrior:[band>2?240:140,band>2?36:26,64,13],shade_wolf:[88,21,116,12],demon_front:[200,22,74,20],demon_rear:[145,21,64,18]};
 const [rawHp,rawAtk,speed,radius]=old[type]||old.goblin;return {type,rawHp,rawAtk,speed,radius,color:'#879686',rangedKind:type==='demon_rear'?'dark_mage':undefined};
}
/** Small formations share a bearing; archers stay behind the melee front. */
export function encounterSlots(profile,room,random=Math.random){
 if(!profile?.group||room<3)return [{dx:0,dy:0,type:profile?.type}];
 const count=Math.min(room,3+Math.floor(random()*4));
 return Array.from({length:count},(_,i)=>profile.group==='formation'
  ?{dx:i<Math.ceil(count/2)?35:-40,dy:(i%Math.ceil(count/2)-(Math.ceil(count/2)-1)/2)*33,type:profile.type==='road_archer'&&i<Math.ceil(count/2)?'sun_bandit':profile.type}
  :{dx:(i%3-1)*34,dy:Math.floor(i/3)*37,type:profile.type});
}
/** Charge uses a short committed run and a recovery, never an extra damage multiplier. */
export function updateBiomeCharge(game,m,target,dt){
 if(!m.charge)return false;m.chargeCooldown=Math.max(0,(m.chargeCooldown??2)-dt);
 if(m.chargeTime>0){m.chargeTime-=dt;const step=m.speed*1.8*dt;m.x+=Math.cos(m.chargeAngle)*step;m.y+=Math.sin(m.chargeAngle)*step;m.facingAngle=m.chargeAngle;return m.chargeTime>0;}
 const d=Math.hypot(target.x-m.x,target.y-m.y);
 if(!m.chargeCooldown&&d>90&&d<360&&!game.wallBlocksEnemyAttack(m,target)){m.chargeAngle=Math.atan2(target.y-m.y,target.x-m.x);m.chargeTime=.65;m.chargeCooldown=3.8;return true;}
 return false;
}
