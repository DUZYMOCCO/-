export const BATTLE_LOG_LIMIT=100;
export function resetBattleLog(game) {
  clearTimeout(game._battleLogTimer);game._battleLogTimer=null;
  game.battleLogHistory=[];game._battleLogSequence=0;
  document.getElementById('battle-log-stream')?.replaceChildren?.();
}
export function renderBattleLog(game) {
  const list=game.container?.querySelector('#battle-log-history');if(!list)return;
  const bottom=list.scrollHeight-list.scrollTop-list.clientHeight<24;
  list.replaceChildren();
  for(const entry of game.battleLogHistory||[]){
    const row=document.createElement('li'),stamp=document.createElement('small');
    stamp.textContent=`第${entry.phase}期 · ${Math.floor(entry.seconds/60)}:${String(entry.seconds%60).padStart(2,'0')}`;
    const text=document.createElement('span');text.textContent=entry.text;row.append(stamp,text);list.append(row);
  }
  if(!list.children.length){const row=document.createElement('li');row.textContent='まだ記録はありません。';list.append(row);}
  if(bottom)list.scrollTop=list.scrollHeight;
}
export function recordBattleLog(game,message) {
  if(!message)return;
  const text=String(message),history=game.battleLogHistory||=[];
  game._battleLogSequence=(game._battleLogSequence||0)+1;
  history.push({id:game._battleLogSequence,phase:game.phase||game.wave||1,seconds:Math.max(0,Math.floor(game.totalBattleTime||0)),text});
  if(history.length>BATTLE_LOG_LIMIT)history.splice(0,history.length-BATTLE_LOG_LIMIT);
  const stream=document.getElementById('battle-log-stream');
  if(stream){
    const line=document.createElement('div');line.className='battle-log-msg';line.textContent=text;
    if(/🚨|危険|倒れた/.test(text))line.classList.add('boss-alert');
    else if(/獲得|ドロップ|秘宝|横取り/.test(text))line.classList.add('item-alert');
    else if(/レベルアップ|昇進|覚醒/.test(text))line.classList.add('levelup-alert');
    stream.replaceChildren(line);clearTimeout(game._battleLogTimer);
    game._battleLogTimer=setTimeout(()=>{if(line.parentNode===stream){line.style.opacity='0';line.style.transform='translateY(6px)';}},3000);
  }
  if(game.container?.querySelector('#command-battle-log')?.open)renderBattleLog(game);
  const banner=document.getElementById('drop-banner');if(banner)banner.textContent=text;
}
