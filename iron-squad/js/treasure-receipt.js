import {CRAFT_MATERIALS} from './crafting-rules.js?v=231';
import {equipmentName} from './equipment-rules.js?v=238';

/** Report the actual destination after pickup, including treasury buyouts and material caps. */
export function receiveTreasure(game,loot) {
  const lines=[];
  for(const item of loot){
    const before={...game.materials},gold=game.gold||0;
    const accepted=game.collectDrop(item);
    if(item.type==='MATERIAL'){
      for(const [id,n]of Object.entries(item.materials||{})){
        const gained=game.materials?Math.max(0,(game.materials[id]||0)-(before[id]||0)):accepted===false?0:n;
        if(gained&&CRAFT_MATERIALS[id])lines.push(`${CRAFT_MATERIALS[id].name} × ${gained.toLocaleString()} → 素材庫`);
      }
    }else if(game.sharedEquipBox?.some(i=>i.id===item.id)){
      lines.push(`${equipmentName(item)} → 国庫買取 +${((game.gold||0)-gold).toLocaleString()}G`);
    }else lines.push(`${equipmentName(item)} → ${Object.values(game.equipped||{}).some(i=>i?.id===item.id)?'装備中':'バッグ'}`);
  }
  if(!lines.length)lines.push('素材の所持数が上限です');
  game.recordBattleLog?.(`宝箱の中身：${lines.join(' / ')}`,'loot');
  showTreasureReceipt(game,lines);
  return lines;
}
export function showTreasureReceipt(game,lines) {
  if(!game.container)return;
  clearTimeout(game._treasureReceiptTimer);
  game.container.querySelector('.treasure-receipt')?.remove();
  const host=document.createElement('aside');host.className='treasure-receipt';host.setAttribute('role','status');host.setAttribute('aria-live','polite');
  const title=document.createElement('strong');title.textContent='宝箱の中身';host.append(title);
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','取得表示を閉じる');host.append(close);
  const body=document.createElement('div');for(const line of lines){const p=document.createElement('p');p.textContent=line;body.append(p);}host.append(body);
  (game.container.querySelector('.game-wrapper')||game.container).append(host);
  const dismiss=()=>{clearTimeout(game._treasureReceiptTimer);host.remove();};close.onclick=dismiss;
  game._treasureReceiptTimer=setTimeout(dismiss,8000);
}
