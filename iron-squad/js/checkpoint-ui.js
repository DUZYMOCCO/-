// Confirmation and feedback only. No persistent UI fields or save-format changes.
const requests=new WeakMap(),notices=new WeakMap();
export const SAVE_NOTICE_MS=1800;
export function checkpointNotice(game,message,failed=false) {
  const root=game.container?.querySelector('.iron-squad')||game.container;
  if(!root)return;
  const old=notices.get(game);if(old){window.clearTimeout(old.timer);old.node.remove();}
  const node=document.createElement('div');node.className='checkpoint-notice';
  node.dataset.failed=String(failed);node.setAttribute('role',failed?'alert':'status');node.textContent=message;
  root.append(node);const timer=window.setTimeout(()=>{node.remove();if(notices.get(game)?.node===node)notices.delete(game);},SAVE_NOTICE_MS);
  notices.set(game,{node,timer});
}
export function requestCheckpointAction(game,kind,source) {
  // Reject duplicate requests, including events from detached or covered controls.
  if(requests.has(game)||!source?.isConnected||source.disabled||source.closest('.hidden,[inert]'))return;
  const root=game.container.querySelector('.iron-squad')||game.container;
  const background=source.closest('#merchant-shop-popup,#strategy-modal'),wasInert=background?.inert||false;
  const slotId=game.activeSlotId,host=document.createElement('div');host.className='checkpoint-confirm-overlay';host.id='checkpoint-confirm';
  host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-labelledby','checkpoint-confirm-title');host.setAttribute('aria-describedby','checkpoint-confirm-message');
  host.innerHTML='<section class="checkpoint-confirm-panel"><h3 id="checkpoint-confirm-title"></h3><p id="checkpoint-confirm-message"></p><div class="checkpoint-confirm-actions"></div></section>';
  host.querySelector('h3').textContent=kind==='save'?'現在地をセーブ':'地点セーブへ戻る';
  host.querySelector('p').textContent=kind==='save'?'保存方法を選んでください。':'最後に地点セーブした場所へ戻ります。よろしいですか？';
  const state={host,settled:false};requests.set(game,state);
  const close=()=>{
    host.remove();if(background?.isConnected)background.inert=wasInert;
    if(source.isConnected&&!source.disabled)source.focus({preventScroll:true});
  };
  const cancel=()=>{if(state.settled)return;state.settled=true;close();requests.delete(game);};
  const execute=action=>{
    if(state.settled||requests.get(game)!==state)return;state.settled=true;
    for(const b of host.querySelectorAll('button'))b.disabled=true;
    close();
    try {
      if(game.activeSlotId!==slotId)throw new Error('保存先が変更されました');
      const ok=action==='load'?game.loadCheckpoint():game.saveCheckpoint({newSlot:action==='new'});
      // saveCheckpoint reports its own failure, including the actual storage reason.
      if(!ok&&action==='load')checkpointNotice(game,'地点セーブを読み込めませんでした',true);
    } catch {checkpointNotice(game,action==='load'?'地点セーブを読み込めませんでした':'セーブに失敗しました',true);}
    finally {
      // Keep the request locked briefly so a second tap cannot reopen a fresh dialog.
      window.setTimeout(()=>{if(requests.get(game)===state)requests.delete(game);},450);
    }
  };
  const actions=host.querySelector('.checkpoint-confirm-actions');
  const choices=kind==='save'?[['overwrite','既存のセーブデータに上書き'],['new','新しいセーブデータとして保存']]:[['load','戻る']];
  for(const [action,label]of choices){const button=document.createElement('button');button.type='button';button.dataset.checkpointChoice=action;button.textContent=label;button.onclick=()=>execute(action);actions.append(button);}
  const safe=document.createElement('button');safe.type='button';safe.dataset.checkpointChoice='cancel';safe.className='checkpoint-cancel';safe.textContent='キャンセル';safe.onclick=cancel;actions.append(safe);
  host.onclick=event=>{if(event.target===host)cancel();};
  host.onkeydown=event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancel();}
    if(event.key==='Tab'){
      const buttons=[...actions.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      event.stopPropagation();
    }
  };
  if(background)background.inert=true;root.append(host);safe.focus({preventScroll:true});
}
