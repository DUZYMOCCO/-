import {sound} from '../../audio.js?v=151';
import {mountKanaPanel} from '../../kana-mode.js?v=168';

export function configureAudioInterface(game) {
  game.audioUIUnsubscribe?.();
  const root=game.container,field=root.querySelector('#canvas-container'),overview=root.querySelector('#view-strat-overview');
  const fieldButton=document.createElement('button');fieldButton.type='button';fieldButton.id='btn-field-sound';fieldButton.className='field-sound-toggle';field.append(fieldButton);
  const panel=document.createElement('details');panel.className='command-fold audio-settings';panel.id='audio-settings';
  panel.innerHTML='<summary>音・BGMの設定</summary><div class="fold-content"><p class="audio-status" role="status"></p><div class="audio-actions"><button type="button" data-audio="toggle">音をONにする</button><button type="button" data-audio="resume">音を再開</button></div><label class="audio-volume"><span>BGM</span><input type="range" min="0" max="100" step="1" data-audio-volume="bgm" aria-label="BGM音量"><output></output></label><label class="audio-volume"><span>効果音</span><input type="range" min="0" max="100" step="1" data-audio-volume="effects" aria-label="効果音音量"><output></output></label><button type="button" class="audio-defaults">標準の音量に戻す</button><p class="audio-hint">BGMと効果音を別々に調整できます。音が止まった場合は「音を再開」を押してください。</p></div>';
  overview.append(panel);
  game.kanaPanelCleanup?.();game.kanaPanelCleanup=mountKanaPanel(overview);
  const toggle=panel.querySelector('[data-audio="toggle"]'),resume=panel.querySelector('[data-audio="resume"]');
  fieldButton.onclick=()=>{const state=sound.state;if(state.muted){sound.setMute(false);sound.unlock();}else if(state.context!=='running'||!state.ready){sound.unlock();}else sound.setMute(true);};
  toggle.onclick=()=>{sound.toggleMute();if(!sound.isMuted)sound.unlock();};
  resume.onclick=()=>{sound.setMute(false);sound.unlock();};
  for(const slider of panel.querySelectorAll('[data-audio-volume]'))slider.oninput=()=>sound.setVolumes({[slider.dataset.audioVolume]:Number(slider.value)/100});
  panel.querySelector('.audio-defaults').onclick=()=>{sound.setVolumes({bgm:.35,effects:.65});sound.setMute(false);sound.unlock();};
  game.audioUIUnsubscribe=sound.subscribe(state=>{
    fieldButton.disabled=!state.available;fieldButton.textContent=!state.available?'音 未対応':state.muted?'音 OFF':state.context==='running'&&state.ready?'音 ON':state.loading?'音 準備中':'音を再開';
    fieldButton.setAttribute('aria-label',state.muted?'音をONにする':state.context==='running'&&state.ready?'音をOFFにする':'音の再生を開始・再開する');fieldButton.setAttribute('aria-pressed',String(!state.muted));
    toggle.disabled=resume.disabled=!state.available;toggle.textContent=state.muted?'音をONにする':'音をOFFにする';toggle.setAttribute('aria-pressed',String(!state.muted));
    const status=panel.querySelector('.audio-status');status.textContent=!state.available?'この環境では音声を再生できません':state.muted?'音はOFFです':state.loading?'音素材を読み込んでいます':state.failed?'一部の音を読み込めませんでした。「音を再開」で再試行できます':state.context!=='running'?'音の再開が必要です。ボタンを押してください':state.bgmPlaying?'BGM・効果音を再生中':'効果音を再生できます';
    for(const slider of panel.querySelectorAll('[data-audio-volume]')){slider.value=String(Math.round(state[slider.dataset.audioVolume]*100));slider.nextElementSibling.textContent=`${slider.value}%`;}
  });
}
