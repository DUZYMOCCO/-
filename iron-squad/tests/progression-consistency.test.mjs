import assert from 'node:assert/strict';
import {headquartersMoveTarget} from '../js/hq-navigation.js';
import {HEADQUARTERS_FACILITIES,headquartersBuildingBlocks} from '../js/hq-facilities.js';
import {fieldDialogReturn} from '../js/dialog-return.js';
import {rerouteTradeActor,updateRegionalTraffic,tradeSegmentOpen} from '../js/trade-routes.js';
import {economicState,ECONOMIC_REGIONS} from '../js/regional-economy.js';
import {normalizeNation} from '../js/nation-rules.js';
import {WORLD_SIZE} from '../js/world.js';
import {receiveTreasure} from '../js/treasure-receipt.js';
import {addMaterials} from '../js/crafting-rules.js';
import {careerSummary,newCareer} from '../js/career-rules.js';
import {setKanaGrade} from '../../common/js/kana-mode.js?v=175';

for(const p of HEADQUARTERS_FACILITIES)for(const [a,b]of [
  [{x:p.x,y:p.y+50},{x:p.x,y:p.y-150}],
  [{x:p.x-160,y:p.y-25},{x:p.x+160,y:p.y-25}]
]){
  const u={...a};let steps=0;
  while(Math.hypot(u.x-b.x,u.y-b.y)>4&&steps++<200){
    const goal=headquartersMoveTarget(u,b),dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy),step=Math.min(d,4);
    assert.ok(d>0);u.x+=dx/d*step;u.y+=dy/d*step;
    assert.equal(headquartersBuildingBlocks(u.x,u.y),false,'walkers go around each facility');
  }
  assert.ok(steps<200,'detours must reach the other side instead of trapping a follower');
}
for(const fromMenu of [false,true]){
  const calls=[],g={inBattle:!fromMenu,container:{querySelector:()=>({classList:{contains:()=>!fromMenu}})},openStrategyModal:()=>calls.push('open'),renderStrategyUI:()=>calls.push('refresh'),closeStrategyModal:resume=>calls.push(resume?'resume':'pause')};
  fieldDialogReturn(g)();assert.deepEqual(calls,fromMenu?['refresh']:['open','refresh','resume']);
}
const C=WORLD_SIZE/2,g={nation:normalizeNation({investment:45000}),inBattle:true,player:{x:C,y:C},fog:{revision:0,isExploredWorld:()=>true},monsters:[],restTimer:1};
g.nation.level=3;const e=economicState(g),region=ECONOMIC_REGIONS.find(r=>r.id!=='hq');
const route={id:'detour',to:region.id,points:[[C+512,C],[C+1024,C],[C+1400,C],[C+1400,C+400]],length:1288};e.routes=[route];e.spawnClock=-1000;
const a={id:'caravan',party:'caravan',role:'merchant',region:region.id,routeId:route.id,x:C+700,y:C+400,hp:100,speed:100,cargo:50,progress:188,outbound:false,points:[[C+512,C+400],[C+1400,C+400]],routeLength:888};
assert.equal(tradeSegmentOpen(g,[C+700,C+400],[C+900,C+400]),false);
const origin={x:a.x,y:a.y};assert.equal(rerouteTradeActor(g,a),true);assert.deepEqual({x:a.x,y:a.y},origin,'replanning never teleports the caravan');
e.traffic=[a,{...a,id:'guard',role:'guard'}];g._tradeRevision=`0:${e.revision}:1`;
let arrived=false;for(let i=0;i<400&&e.traffic.length;i++){
  const before=[a.x,a.y];updateRegionalTraffic(g,.05);assert.equal(tradeSegmentOpen(g,before,[a.x,a.y]),true,'each step respects the new wall');
  if(e.traffic[1])assert.deepEqual([e.traffic[1].x,e.traffic[1].y],[a.x,a.y],'the escort follows the replanned party');
  arrived=!!a.arrived;
}
assert.equal(arrived,true);assert.equal(e.traffic.length,0);assert.equal(e.shipments,1,'one arrival credits the shipment only once');
const reward={materials:{},gold:20,sharedEquipBox:[],collectDrop(item){if(item.type==='MATERIAL')return !!addMaterials(this,item.materials);this.sharedEquipBox.push(item);this.gold+=12;},recordBattleLog(text){this.log=text;}};
const lines=receiveTreasure(reward,[{type:'MATERIAL',materials:{wood:4,fabric:2}},{id:'helm',type:'HELMET',name:'旅の兜',tier:1}]);
assert.ok(lines.some(l=>l.includes('× 4')&&l.includes('素材庫')));assert.ok(lines.some(l=>l.includes('国庫買取 +12G')));assert.ok(reward.log.includes('宝箱の中身'));
const traveler={career:newCareer(),squad:[],reserves:[]};
setKanaGrade(0,{persist:false});assert.ok(careerSummary(traveler,[]).includes('地域への貢献'));
setKanaGrade(2,{persist:false});assert.ok(careerSummary(traveler,[]).includes('こうけん'));assert.ok(!careerSummary(traveler,[]).includes('貢献'));
setKanaGrade(0,{persist:false});assert.ok(careerSummary(traveler,[]).includes('貢献'));
console.log('PASS: facility detours, dialog return, in-flight caravan rerouting, actual treasure destinations and kana toggles');
