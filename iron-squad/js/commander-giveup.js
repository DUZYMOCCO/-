// v5.0.0: 隊長ダウン中の「あきらめてセーブからやり直す」ボタン + BGM 復帰ヘルパー。
// 再開処理は討ち死に後と同じ game.continueFallenSave('autosave') を使う（セーブ内容は変えない）。
import {sound} from '../../common/js/audio.js?v=151';
import {displayKana} from '../../common/js/kana-mode.js?v=175';

const BTN_TEXT='あきらめてセーブからやり直す';
const ASK_TEXT='あきらめて、さいごのセーブからやりなおしますか？';

/** 再開後に BGM を戻す。ミュート中は鳴らさない（startBGM は bgmWanted を立てるだけで ミュート時は再生されない）。 */
export function resumeBGM(snd=sound,game=null) {
  if(!snd)return;
  snd.setListener?.(()=>game?.player);
  snd.startBGM?.();
  if(!snd.isMuted)snd.unlock?.();
}

export function commanderGiveUpVisible(game) {
  return !!(game?.player?.isDown&&!game.player.dead&&game.inBattle);
}

export function ensureGiveUpUI(game) {
  const field=game.container?.querySelector?.('#canvas-container')||document.getElementById('canvas-container');
  if(!field)return null;
  if(game._giveUp&&game._giveUp.btn.isConnected)return game._giveUp;
  const btn=document.createElement('button');btn.type='button';btn.id='btn-commander-giveup';btn.className='commander-giveup-btn hidden';
  const dlg=document.createElement('div');dlg.id='commander-giveup-dialog';dlg.className='commander-giveup-dialog hidden';dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');
  dlg.innerHTML='<div class="giveup-card"><p class="giveup-msg"></p><div class="giveup-actions"><button type="button" data-giveup="yes"></button><button type="button" data-giveup="no"></button></div></div>';
  field.append(btn,dlg);
  const ui={btn,dlg,msg:dlg.querySelector('.giveup-msg'),yes:dlg.querySelector('[data-giveup="yes"]'),no:dlg.querySelector('[data-giveup="no"]')};
  const close=()=>dlg.classList.add('hidden');
  btn.onclick=()=>{sound.playTap?.();syncGiveUpUI(game);ui.msg.textContent=displayKana(ASK_TEXT);ui.yes.textContent=displayKana('やりなおす');ui.no.textContent=displayKana('まだ待つ');dlg.classList.remove('hidden');};
  ui.no.onclick=()=>{sound.playTap?.();close();};
  ui.yes.onclick=()=>{
    sound.playTap?.();close();
    if(!commanderGiveUpVisible(game))return;
    game.stopGameLoop?.();
    if(!game.continueFallenSave('autosave'))game.startGameLoop?.();
  };
  game._giveUp=ui;return ui;
}

/** 毎フレーム（render）から呼ぶ。ダウン中のみ表示。 */
export function syncGiveUpUI(game) {
  let ui=null;try{ui=ensureGiveUpUI(game);}catch(error){return;}if(!ui)return;
  const show=commanderGiveUpVisible(game);
  ui.btn.classList.toggle('hidden',!show);
  if(!show)ui.dlg.classList.add('hidden');
  const label=displayKana(BTN_TEXT);if(ui.btn.textContent!==label)ui.btn.textContent=label;
}
