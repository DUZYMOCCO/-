import {equipmentUpgradeCost} from './payroll-rules.js?v=226';
import {gameText} from './game-text.js?v=302';

/** Quote the same sequence used for execution, without mutating equipment or money. */
export function planEvenUpgrades(equipped,gold,costOf=equipmentUpgradeCost){
  const seen=new Set(),entries=[];
  for(const item of Object.values(equipped||{})){
    if(!item||seen.has(item))continue;seen.add(item);
    entries.push({item,from:item.upgrade||0,to:item.upgrade||0});
  }
  const budget=Math.max(0,Math.floor(Number(gold)||0));let remaining=budget,count=0;
  if(!Number.isFinite(budget))return {entries,count,spent:0,remaining:0};
  while(entries.length){
    let chosen=null,price=Infinity;
    for(const entry of entries){
      const cost=costOf({...entry.item,upgrade:entry.to});
      if(!chosen||entry.to<chosen.to||entry.to===chosen.to&&cost<price){chosen=entry;price=cost;}
    }
    // Preserve balance: do not upgrade a higher-level cheap item past an unaffordable lowest one.
    if(!Number.isSafeInteger(price)||price<=0||price>remaining)break;
    remaining-=price;chosen.to++;count++;
  }
  return {entries,count,spent:budget-remaining,remaining};
}
const requests=new WeakMap();
export function requestEvenUpgrade(game,source){
  if(requests.has(game)||!source?.isConnected||source.disabled||source.closest('.hidden,[inert]'))return;
  const costOf=item=>game.getUpgradeCost(item),quote=planEvenUpgrades(game.equipped,game.gold,costOf);
  if(!quote.count){game.showToast(gameText('均等に強化する軍資金が足りません'));return;}
  const root=game.container.querySelector('.iron-squad')||game.container,background=source.closest('#strategy-modal');
  const slotId=game.activeSlotId,gold=game.gold,wasInert=background?.inert||false;
  const host=document.createElement('div');host.className='checkpoint-confirm-overlay';host.id='even-upgrade-confirm';
  host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','even-upgrade-title');
  host.innerHTML='<section class="checkpoint-confirm-panel"><h3 id="even-upgrade-title"></h3><p id="even-upgrade-message"></p><div class="checkpoint-confirm-actions"><button type="button" data-even-upgrade="accept"></button><button type="button" class="checkpoint-cancel" data-even-upgrade="cancel"></button></div></section>';
  host.querySelector('h3').textContent=gameText('均等に強化');
  host.querySelector('p').textContent=gameText(`隊長の装備を均等に強化します。${quote.count.toLocaleString()}回・合計${quote.spent.toLocaleString()}G。よろしいですか？`);
  const accept=host.querySelector('[data-even-upgrade="accept"]'),cancel=host.querySelector('[data-even-upgrade="cancel"]');
  accept.textContent=gameText('強化する');cancel.textContent=gameText('やめる');
  const state={settled:false};requests.set(game,state);
  const close=()=>{host.remove();if(background?.isConnected)background.inert=wasInert;if(source.isConnected&&!source.disabled)source.focus({preventScroll:true});};
  const finish=()=>{if(state.settled)return;state.settled=true;close();requests.delete(game);};
  cancel.onclick=finish;host.onclick=e=>{if(e.target===host)finish();};
  accept.onclick=()=>{
    if(state.settled||!host.isConnected||!source.isConnected)return;
    state.settled=true;accept.disabled=cancel.disabled=true;close();
    try{
      const current=planEvenUpgrades(game.equipped,game.gold,costOf);
      if(slotId!==game.activeSlotId||gold!==game.gold||current.count!==quote.count||current.spent!==quote.spent||current.entries.length!==quote.entries.length||current.entries.some((e,i)=>e.item!==quote.entries[i].item||e.from!==quote.entries[i].from||e.to!==quote.entries[i].to)){
        game.showToast(gameText('装備か軍資金がかわりました。もう一度おねがいします'));return;
      }
      game.gold-=quote.spent;
      for(const entry of quote.entries)if(entry.to!==entry.from)game.applyEquipmentUpgrade(entry.item,entry.to);
      game.recalcPlayerStats();game.saveGame({background:true});game.renderStrategyUI();game.updateStatsUI();
      game.showToast(gameText(`隊長の装備を${quote.count.toLocaleString()}回強化しました（${quote.spent.toLocaleString()}G）`));
    }finally{requests.delete(game);}
  };
  host.onkeydown=e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish();}
    if(e.key==='Tab'){e.preventDefault();e.stopPropagation();(document.activeElement===accept?cancel:accept).focus();}
  };
  if(background)background.inert=true;root.append(host);cancel.focus({preventScroll:true});
}
