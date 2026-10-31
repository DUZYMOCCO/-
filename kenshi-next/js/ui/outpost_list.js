import { outpostSummary } from '../sim/outposts.js';
import { panels } from './panels.js';

export function createOutpostList(options = {}) {
  const getState=options.getState||(()=>null), onFocus=options.onFocus||(()=>{}), onTravel=options.onTravel||(()=>{});
  const root=document.createElement('div');root.className='outpost-overlay';root.hidden=true;
  const panel=document.createElement('section');panel.className='outpost-panel';panel.setAttribute('aria-label','拠点一覧');
  const header=document.createElement('header'),title=document.createElement('strong');title.textContent='拠点';
  const close=document.createElement('button');close.type='button';close.textContent='閉じる';header.append(title,close);
  const rows=document.createElement('div');rows.className='outpost-rows';panel.append(header,rows);root.append(panel);document.body.append(root);
  const button=document.createElement('button');button.type='button';button.className='build-shortcut outpost-shortcut';button.textContent='拠点';(options.container||document.getElementById('hud')||document.body).append(button);
  function render(){
    const state=getState();rows.replaceChildren();if(!state)return;
    const origin=state.actors?.find(a=>a.id===state.playerId)||{x:0,z:0};
    for(const item of outpostSummary(state,origin)){
      const row=document.createElement('article');row.className='outpost-row';
      const name=document.createElement('button');name.type='button';name.className='outpost-name';name.textContent=item.name;name.addEventListener('click',()=>onFocus(item));
      const detail=document.createElement('span');detail.textContent=`距離 ${item.distance}m・人数 ${item.people}・工事中 ${item.sites}${item.sleeping?'・休眠':''}`;
      const travel=document.createElement('button');travel.type='button';travel.textContent='ここへ向かう';travel.addEventListener('click',()=>onTravel(item));
      row.append(name,detail,travel);rows.append(row);
    }
    if(!rows.childNodes.length){const empty=document.createElement('p');empty.textContent='拠点はまだありません';rows.append(empty);}
  }
  function open(){render();root.hidden=false;panels.open('outposts');}
  function closePanel(){panels.close('outposts');root.hidden=true;}
  panels.register('outposts',{contains:t=>panel.contains(t),close:()=>{root.hidden=true;}});
  button.addEventListener('click',open);close.addEventListener('click',closePanel);
  return {button,open,close:closePanel,render,dispose(){button.remove();root.remove();}};
}
