import { BUILDINGS, BUILDING_CATEGORIES, BUILD_MATERIALS, FLAG_KIT_RECIPE } from '../data/buildings.js';
import { canPlacePiece, snapWallEnds, wallLoops } from '../sim/build.js';
import { canPlantFlag, outpostAt } from '../sim/outposts.js';
import { houseAt } from '../sim/town.js';
import { panels } from './panels.js';

function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}

function nearWall(state,x,z){
  let best=null,distance=2.5;
  for(const p of state?.outposts?.pieces||[]){
    if(!['wood_fence','stone_wall'].includes(p.type)||p.state!=='done')continue;
    const a=p.start||{x:p.x-(p.length||1)/2,z:p.z},b=p.end||{x:p.x+(p.length||1)/2,z:p.z};
    const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/l)):0;
    const px=a.x+dx*t,pz=a.z+dz*t,d=Math.hypot(x-px,z-pz);
    if(d<distance){distance=d;best=p;}
  }
  return best;
}

export function createBuildMode(options = {}) {
  const getState=options.getState||(()=>null), onCommand=options.onCommand||(()=>{}), onEnter=options.onEnter||(()=>{}), onExit=options.onExit||(()=>{}), onAlert=options.onAlert||(()=>{}), getMetrics=options.getMetrics||(()=>({calls:0,tris:0}));
  let active=false, selected='outpost_flag', rotation=0, ghost={color:'red',reason:'場所を選んでください'}, ghostPoint=null, wallStart=null;
  const shortcut=node('button','build-shortcut','建てる');shortcut.type='button';(options.container||document.getElementById('hud')||document.body).append(shortcut);
  const root=node('div','build-mode-overlay');root.hidden=true;
  const panel=node('section','build-mode-panel');panel.setAttribute('aria-label','建築メニュー');
  const header=node('header','build-mode-header');const exit=node('button','build-exit','× やめる');exit.type='button';const stock=node('div','build-stock');const categoryToggle=node('button','build-category-toggle','一覧を隠す');categoryToggle.type='button';categoryToggle.setAttribute('aria-expanded','true');header.append(exit,stock,categoryToggle);
  const status=node('div','build-ghost-status');
  const wallStatus=node('div','build-wall-status');
  const controls=node('div','build-controls');
  const rotate=node('button','','回転 90°'),undo=node('button','','戻す'),cancel=node('button','','取り消し'),confirm=node('button','build-confirm','ここに建てる');
  for(const b of [rotate,undo,cancel,confirm]){b.type='button';controls.append(b);}
  const tabs=node('nav','build-tabs'),cards=node('div','build-cards');
  panel.append(header,status,wallStatus,controls,tabs,cards);root.append(panel);document.body.append(root);
  categoryToggle.addEventListener('click',()=>{const hidden=tabs.hidden=!tabs.hidden;cards.hidden=hidden;categoryToggle.textContent=hidden?'一覧を表示':'一覧を隠す';categoryToggle.setAttribute('aria-expanded',String(!hidden));});
  const alert=node('button','build-alert');alert.hidden=true;document.body.append(alert);
  function resources(){
    const s=getState(), base=ghostPoint&&outpostAt(s,ghostPoint.x,ghostPoint.z), house=ghostPoint&&!base?houseAt(s,ghostPoint.x,ghostPoint.z,0):null, out=s?.outposts;
    const totals={flag_kit:(s?.actors?.find(a=>a.id===s.playerId)?.inv||[]).filter(x=>x.id==='flag_kit').reduce((n,x)=>n+(x.n||1),0)};for(const p of out?.pieces||[])if((base?p.outpostId===base.id:house&&p.houseId===house.id)&&p.type==='storage_box'&&p.state==='done')for(const [m,n]of Object.entries(p.contents||{}))totals[m]=(totals[m]||0)+n;
    return totals;
  }
  function renderTabs(){
    tabs.replaceChildren();
    const categories=[{id:'base',name:'拠点',items:['outpost_flag']},...BUILDING_CATEGORIES];
    for(const category of categories){const b=node('button',category.items.includes(selected)?'selected':'',category.name);b.type='button';b.addEventListener('click',()=>{renderCards(category.items);});tabs.append(b);}
  }
  function renderCards(filter=null){
    cards.replaceChildren();const ids=filter||['outpost_flag',...BUILDING_CATEGORIES.flatMap(c=>c.items)],stockNow=resources();
    for(const id of ids){const def=BUILDINGS[id];if(!def)continue;const card=node('button','build-card'+(selected===id?' selected':''));card.type='button';
      const title=node('strong','',def.name);const mats=node('span','build-card-mats');
      const cost=id==='outpost_flag'?{flag_kit:1}:def.cost;
      const materialText=id==='outpost_flag'?'旗キット 1個':Object.entries(cost||{}).map(([m,n])=>`${BUILD_MATERIALS[m]||m} ${n}`).join('・')||'素材なし';mats.textContent=materialText;
      const missing=Object.entries(cost||{}).some(([m,n])=>(stockNow[m]||0)<n);
      if(missing)mats.classList.add('missing');
      const work=node('span','build-card-work',id==='outpost_flag'?'60秒で作成':`作業 約${def.work}秒（1人）`);card.append(title,mats,work);
      card.addEventListener('click',()=>{selected=id;rotation=0;wallStart=null;ghostPoint=null;ghost={color:'red',reason:'場所を選んでください'};render();});cards.append(card);
    }
  }
  function render(){renderTabs();renderCards();updateStatus();}
  function updateStatus(){
    const s=getState(),totals=resources(),out=s?.outposts;
    stock.replaceChildren();stock.append(node('span','',`旗キット ${totals.flag_kit||0}`));for(const [id,name]of Object.entries(BUILD_MATERIALS)){const span=node('span','',`${name} ${totals[id]||0}`);stock.append(span);}
    status.className=`build-ghost-status ${ghost.color||'red'}`;status.textContent=ghost.reason?`${ghost.color==='green'?'置けます':ghost.reason}`:ghost.color==='green'?'置けます':'場所を選んでください';
    const base=ghostPoint&&outpostAt(s,ghostPoint.x,ghostPoint.z),loops=base?wallLoops(s,base.id):0;
    wallStatus.textContent=(selected==='wood_fence'||selected==='stone_wall'?wallStart?'壁の始点を選択中。端をタップして区間を確定':'壁: 端をタップして区間を引きます':'')+(loops?`　囲いが閉じています（${loops}）`:'');
    const def=BUILDINGS[selected],cost=selected==='outpost_flag'?FLAG_KIT_RECIPE.materials:def?.cost||{};
    confirm.disabled=ghost.color!=='green';
  }
  function setGhostAt(x,z){
    const s=getState();if(!s)return ghost;
    ghostPoint={x,z};
    if(selected==='wood_gate'){
      const wall=nearWall(s,x,z);
      ghost=wall?{ok:true,color:'green',reason:'壁を木の門に置き換えます',wallId:wall.id,x:wall.x,z:wall.z,rot:wall.rot||0,length:wall.length||wall.w||1}:
        {ok:false,color:'red',reason:'置き換える壁の近くに置いてください'};
      if(wall)ghostPoint={x:wall.x,z:wall.z,wallId:wall.id};
      options.onGhost?.(selected,ghost.x??x,ghost.z??z,ghost.rot??rotation,ghost,ghost.length);
      updateStatus();return ghost;
    }
    ghost=selected==='outpost_flag'?canPlantFlag(s,x,z):canPlacePiece(s,selected,x,z,rotation,{outpostId:outpostAt(s,x,z)?.id});
    if(selected==='outpost_flag'&&!s.actors?.some((a)=>a.faction==='player'&&a.state!=='dead'&&Math.hypot(a.x-x,a.z-z)<=6))ghost={ok:false,color:'red',reason:'旗を立てる仲間が近くにいません（6m以内）'};
    if(selected==='outpost_flag'&&!resources().flag_kit)ghost={ok:false,color:'red',reason:'旗キットがない'};
    options.onGhost?.(selected,x,z,rotation,ghost);updateStatus();return ghost;
  }
  function setWallPreview(start,end){
    if(selected!=='wood_fence'&&selected!=='stone_wall')return ghost;
    const s=getState();if(!s)return ghost;
    const from=wallStart||start,outpost0=outpostAt(s,from.x,from.z),sn=snapWallEnds(s,from,end,outpost0?.id||null);
    const a=sn.start,b=sn.end,dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(length<0.5)return setGhostAt(b.x,b.z);
    const rot=Math.abs(dx)>=Math.abs(dz)?0:Math.PI/2,x=(a.x+b.x)/2,z=(a.z+b.z)/2;
    const outpost=outpostAt(s,a.x,a.z),result=canPlacePiece(s,selected,x,z,rot,{outpostId:outpost?.id,length,start:a,end:b});
    ghost={...result,length,start:a,end:b,reason:result.ok&&sn.snappedEnd?'柱につながります':result.reason};ghostPoint={x,z};
    options.onGhost?.(selected,x,z,rot,result,length);updateStatus();return ghost;
  }
  function place(){
    if(!ghostPoint||ghost.color!=='green')return false;
    if(selected==='outpost_flag'){const actor=(getState()?.actors||[]).filter((a)=>a.faction==='player'&&a.state!=='dead'&&Math.hypot(a.x-ghostPoint.x,a.z-ghostPoint.z)<=6).sort((a,b)=>Math.hypot(a.x-ghostPoint.x,a.z-ghostPoint.z)-Math.hypot(b.x-ghostPoint.x,b.z-ghostPoint.z))[0];onCommand({type:'plantFlag',x:ghostPoint.x,z:ghostPoint.z,actorId:actor?.id});}
    else if(selected==='wood_gate')onCommand({type:'placePiece',pieceType:'wood_gate',x:ghost.x,z:ghost.z,rot:ghost.rot,wallId:ghostPoint.wallId});
    else onCommand({type:'placePiece',pieceType:selected,x:ghostPoint.x,z:ghostPoint.z,rot:rotation,outpostId:outpostAt(getState(),ghostPoint.x,ghostPoint.z)?.id});
    return true;
  }
  function wallTap(x,z){
    if(!wallStart){wallStart={x,z};ghostPoint={x,z};wallStatus.textContent='壁の始点を選びました。次の端を選んでください';return true;}
    const outpost=outpostAt(getState(),wallStart.x,wallStart.z),sn=snapWallEnds(getState(),wallStart,{x,z},outpost?.id||null);
    onCommand({type:'drawWall',pieceType:selected,points:[[wallStart.x,wallStart.z],[x,z]],outpostId:outpost?.id});
    wallStart=sn.end;return true;
  }
  function groundTap(x,z){if(selected==='wood_fence'||selected==='stone_wall')return wallTap(x,z);setGhostAt(x,z);return false;}
  function enter(type){active=true;if(type&&BUILDINGS[type])selected=type;root.hidden=false;render();panels.open('build');onEnter();return true;}
  function leave(){if(!active)return;active=false;root.hidden=true;alert.hidden=true;options.onHideGhost?.();panels.close('build');onExit();}
  function updateAlerts(state){
    if(!active)return;
    const player=state.actors?.find(a=>a.id===state.playerId);if(!player)return;
    const memberIds=new Set(state.squadIds||[]),down=state.actors.find(a=>memberIds.has(a.id)&&['down','getup'].includes(a.state));
    const hostile=state.actors.filter(a=>a.faction!=='player'&&a.state!=='dead'&&(state.factionHostile?.[a.ownerFaction||a.faction]||a.targetId===player.id)).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
    const threat=hostile&&Math.hypot(hostile.x-player.x,hostile.z-player.z)<=18?hostile:null;
    const target=threat||down;
    if(!target){alert.hidden=true;return;}
    alert.hidden=false;alert.textContent=threat?'敵が近い・タップして確認':'仲間が倒れた・タップして確認';
    alert.onclick=()=>{const p={x:target.x,z:target.z};leave();onAlert(p);};
  }
  function enterWallDrag(start,end){
    if(selected!=='wood_fence'&&selected!=='stone_wall')return false;
    const from=wallStart||start;
    const outpost=outpostAt(getState(),from.x,from.z),sn=snapWallEnds(getState(),from,end,outpost?.id||null);
    onCommand({type:'drawWall',pieceType:selected,points:[[from.x,from.z],[end.x,end.z]],outpostId:outpost?.id});wallStart=sn.end;options.onHideGhost?.();return true;
  }
  shortcut.addEventListener('click',()=>enter());exit.addEventListener('click',leave);
  rotate.addEventListener('click',()=>{rotation=(rotation+Math.PI/2)%(Math.PI*2);if(ghostPoint)setGhostAt(ghostPoint.x,ghostPoint.z);});
  confirm.addEventListener('click',place);
  undo.addEventListener('click',()=>{const p=(getState()?.outposts?.pieces||[]).filter(x=>x.state==='site').slice(-1)[0];if(p)onCommand({type:'cancelPiece',pieceId:p.id});});
  cancel.addEventListener('click',leave);
  panels.register('build',{keepOnNonModal:true,contains:t=>panel.contains(t),close:()=>{root.hidden=true;if(active){active=false;options.onHideGhost?.();onExit();}}});
  return {button:shortcut,enter,leave,isActive:()=>active,isCategoriesCollapsed:()=>tabs.hidden,getSelected:()=>selected,setGhostAt,setWallPreview,groundTap,enterWallDrag,updateAlerts,ghost:()=>({...ghost}),rotate:()=>{rotation=(rotation+Math.PI/2)%(Math.PI*2);},dispose(){shortcut.remove();root.remove();alert.remove();}};
}
