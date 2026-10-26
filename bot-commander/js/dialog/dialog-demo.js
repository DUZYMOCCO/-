// ?dialogdemo=1（お試し）: 会話画面だけを見る。ミッションは始めない（本編はフラグがなければ今までどおり）。
// 台本は assets/dialog/demo.json（セリフはすべて仮）。最後まで進むと「お試しはここまで」→ もう一度見る／工房へ戻る。
// ?dialogdemo=all: portraits.json の全員を全部の表情で順に出す（dialog-all.js）。&from=ID でその人から始める。
import { playDialog, loadPortraits } from './dialog-view.js?v=4';
import { buildAllScript } from './dialog-all.js?v=2';

const DEMO_URL = new URL('../../assets/dialog/demo.json', import.meta.url).href;

export async function runDialogDemo(game, mode = '1') {
  const params = new URLSearchParams(location.search);
  const root = game.el.root;
  root.classList.add('bc-dialog-demo');
  game.el.loading?.remove(); game.el.loading = null;
  const end = document.createElement('div');
  end.className = 'dlg-end'; end.hidden = true;
  end.innerHTML = `
    <div class="dlg-end-box" role="dialog" aria-modal="true" aria-labelledby="dlg-end-title">
      <h2 id="dlg-end-title" class="dlg-end-title">お試しはここまで</h2>
      <div class="dlg-end-btns"><button class="dlg-again">もう一度見る</button><button class="dlg-end-hub">工房へ戻る</button></div>
    </div>`;
  root.appendChild(end);
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'wheel']) end.addEventListener(ev, e => e.stopPropagation());
  const hub = () => game.exit();
  const play = async () => {
    end.hidden = true;
    const script = mode === 'all' ? buildAllScript(await loadPortraits(), { from: params.get('from') }) : DEMO_URL;
    await playDialog(root, script, { onHub: hub, onOpen: () => { if (window.__botCommander) window.__botCommander.ready = true; } });
    if (!game.alive) return;
    end.hidden = false;
    end.querySelector('.dlg-again').focus({ preventScroll: true });
  };
  end.querySelector('.dlg-again').addEventListener('click', () => { if (window.__botCommander) window.__botCommander.ended = false; play().then(markEnd); });
  end.querySelector('.dlg-end-hub').addEventListener('click', hub);
  const markEnd = () => { if (window.__botCommander) window.__botCommander.ended = !end.hidden; };
  // 自動テスト・スクショ用の入口（会話を進めるのは window.__dialog）
  window.__botCommander = { dialogDemo: mode, ready: false, ended: false };
  play().then(markEnd).catch(err => {
    console.error('dialog demo failed', err);
    end.querySelector('.dlg-end-title').textContent = '会話を出せませんでした: ' + err.message;
    end.hidden = false;
  });
}
