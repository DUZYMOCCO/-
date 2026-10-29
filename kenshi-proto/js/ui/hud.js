// 時刻・速度・状態・部位HP・ログ・追従・fps・ゲームオーバーのHTML窓口。

import { PART_KEYS, PART_LABEL, formatClock } from '../sim/index.js';

const STATUS_TEXT = {
  idle: '立っている',
  move: '移動中',
  fight: '戦っている',
  down: '気絶中',
  getup: '起き上がり中',
  dead: '死んでいる',
};

const SPEEDS = [0, 1, 2, 3, 5];

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createHud(callbacks) {
  const hooks = callbacks || {};
  const root = document.getElementById('hud');
  root.innerHTML = '';

  const clock = make('span', 'hud-clock', '1日目 08:00');
  const status = make('span', 'hud-status', '立っている');
  const fps = make('span', 'hud-fps', '');

  const hp = make('div', 'hud-hp');
  const fills = {};
  for (const key of PART_KEYS) {
    const row = make('div', 'hp-row');
    const label = make('span', 'hp-label', PART_LABEL[key]);
    const track = make('div', 'hp-track');
    const fill = make('div', 'hp-fill');
    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    hp.appendChild(row);
    fills[key] = fill;
  }

  const speedBox = make('div', 'hud-speed');
  const speedButtons = new Map();
  for (const n of SPEEDS) {
    const button = make('button', '', n === 0 ? '停止' : String(n));
    button.type = 'button';
    button.addEventListener('click', () => {
      if (hooks.onSpeed) hooks.onSpeed(n);
    });
    speedBox.appendChild(button);
    speedButtons.set(n, button);
  }

  const follow = make('button', 'hud-follow', '追従');
  follow.type = 'button';
  follow.addEventListener('click', () => {
    if (hooks.onFollow) hooks.onFollow();
  });

  const log = make('div', 'hud-log');

  const gameover = make('div', 'hud-gameover hidden');
  const overText = make('p', '', '流れ者は死んだ');
  const restart = make('button', '', 'やり直す');
  restart.type = 'button';
  restart.addEventListener('click', () => {
    if (hooks.onRestart) hooks.onRestart();
  });
  gameover.appendChild(overText);
  gameover.appendChild(restart);

  root.appendChild(clock);
  root.appendChild(status);
  root.appendChild(hp);
  root.appendChild(speedBox);
  root.appendChild(follow);
  root.appendChild(log);
  root.appendChild(fps);
  root.appendChild(gameover);

  let logSignature = '';

  const media = window.matchMedia('(orientation: portrait)');
  function applyOrientation() {
    document.body.classList.toggle('portrait', media.matches);
    document.body.classList.toggle('landscape', !media.matches);
  }
  if (media.addEventListener) media.addEventListener('change', applyOrientation);
  else if (media.addListener) media.addListener(applyOrientation);
  applyOrientation();

  function renderLog(state) {
    const lines = (state.log || []).slice(-6);
    const signature = lines.map((e) => e.tick + ':' + e.text).join('|');
    if (signature === logSignature) return;
    logSignature = signature;
    log.innerHTML = '';
    for (let i = 0; i < lines.length; i += 1) {
      const old = i < lines.length - 3;
      log.appendChild(make('div', old ? 'log-line old' : 'log-line', lines[i].text));
    }
  }

  function update(state, info) {
    if (!state) return;
    const data = info || {};
    clock.textContent = formatClock(state.timeSec);

    let player = null;
    for (const actor of state.actors) {
      if (actor.id === state.playerId) {
        player = actor;
        break;
      }
    }

    if (player) {
      status.textContent = STATUS_TEXT[player.state] || player.state;
      for (const key of PART_KEYS) {
        const part = player.parts[key];
        const ratio = part.max > 0 ? part.hp / part.max : 0;
        const fill = fills[key];
        fill.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%';
        if (part.hp <= 0) fill.classList.add('bad');
        else fill.classList.remove('bad');
      }
    } else {
      status.textContent = '';
    }

    renderLog(state);

    const speed = data.speed === undefined ? 1 : data.speed;
    for (const [n, button] of speedButtons) {
      button.classList.toggle('active', n === speed);
    }

    follow.classList.toggle('active', !!data.follow);

    if (data.fps !== undefined && Number.isFinite(data.fps)) {
      fps.textContent = Math.round(data.fps) + ' fps';
    }

    gameover.classList.toggle('hidden', !state.gameOver);
    if (state.gameOver) overText.textContent = '流れ者は死んだ';
  }

  function setSpeed(n) {
    for (const [value, button] of speedButtons) {
      button.classList.toggle('active', value === n);
    }
  }

  function setFollow(on) {
    follow.classList.toggle('active', !!on);
  }

  return {
    update,
    setSpeed,
    setFollow,
  };
}
