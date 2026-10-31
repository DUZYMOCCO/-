// 部隊管理パネル（Squad Management Panel）および部隊AI設定（AI Settings Tab）
// Kenshi の Squad / AI 設定画面の操作性をモバイル・デスクトップ両対応で実装。

import {
  ensurePlayerSquads,
  createPlayerSquad,
  renamePlayerSquad,
  moveMemberToSquad,
  deletePlayerSquad,
  setSquadAi,
  setSquadFormation,
  FORMATIONS,
  DEFAULT_SQUAD_AI,
} from '../sim/squads.js';

// インゲーム簡易テキスト入力シート（スマホは下部シート、PCは中央ダイアログ）
export function showTextInputSheet(options) {
  const opts = options || {};
  const title = opts.title || '部隊名を入力';
  const defaultValue = opts.defaultValue || '';
  const onConfirm = opts.onConfirm || (() => {});
  const onCancel = opts.onCancel || (() => {});

  const existing = document.querySelector('.squad-text-dialog-overlay');
  if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

  const overlay = document.createElement('div');
  overlay.className = 'squad-text-dialog-overlay';

  const sheet = document.createElement('div');
  sheet.className = 'squad-text-dialog';

  const titleEl = document.createElement('div');
  titleEl.className = 'squad-text-dialog-title';
  titleEl.textContent = title;

  const inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.className = 'squad-text-dialog-input';
  inputEl.maxLength = 16;
  inputEl.value = String(defaultValue || '').slice(0, 16);

  const errorEl = document.createElement('div');
  errorEl.className = 'squad-text-dialog-error';
  errorEl.textContent = '';
  errorEl.style.display = 'none';

  const actionsEl = document.createElement('div');
  actionsEl.className = 'squad-text-dialog-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'squad-text-dialog-btn squad-text-dialog-cancel';
  cancelBtn.textContent = 'キャンセル';

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'squad-text-dialog-btn squad-text-dialog-confirm';
  confirmBtn.textContent = '決定';

  actionsEl.appendChild(cancelBtn);
  actionsEl.appendChild(confirmBtn);

  sheet.appendChild(titleEl);
  sheet.appendChild(inputEl);
  sheet.appendChild(errorEl);
  sheet.appendChild(actionsEl);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('keydown', onKeyDown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  const cancel = () => {
    cleanup();
    onCancel();
  };

  const confirm = () => {
    const val = inputEl.value.trim().slice(0, 16);
    if (!val) {
      errorEl.textContent = '部隊名を入力してください';
      errorEl.style.display = 'block';
      inputEl.focus();
      return;
    }
    cleanup();
    onConfirm(val);
  };

  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cancel();
  });

  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirm();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      e.stopPropagation();
      cancel();
    }
  });

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      confirm();
    } else if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
    }
  }

  window.addEventListener('keydown', onKeyDown, true);

  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 10);
}

export function createSquadPanel(options) {
  const hooks = options || {};
  const getState = hooks.getState || (() => null);

  const overlay = document.createElement('div');
  overlay.className = 'squad-panel-overlay hidden';
  overlay.id = 'squad-panel-overlay';

  const panel = document.createElement('div');
  panel.className = 'squad-panel';

  // ヘッダー: タブ切り替えと閉じるボタン
  const header = document.createElement('div');
  header.className = 'squad-panel-head';

  const tabSquads = document.createElement('button');
  tabSquads.type = 'button';
  tabSquads.className = 'squad-tab-btn active';
  tabSquads.textContent = '部隊管理';

  const tabAi = document.createElement('button');
  tabAi.type = 'button';
  tabAi.className = 'squad-tab-btn';
  tabAi.textContent = '部隊AI設定';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'squad-panel-close';
  closeBtn.textContent = '×';
  closeBtn.title = '閉じる';

  header.appendChild(tabSquads);
  header.appendChild(tabAi);
  header.appendChild(closeBtn);
  panel.appendChild(header);

  // コンテンツ領域
  const content = document.createElement('div');
  content.className = 'squad-panel-content';
  panel.appendChild(content);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  let currentTab = 'squads'; // 'squads' | 'ai'
  let selectedSquadId = null;

  function isOpen() {
    return !overlay.classList.contains('hidden');
  }

  function open(tab = 'squads') {
    currentTab = tab;
    overlay.classList.remove('hidden');
    render();
  }

  function close() {
    overlay.classList.add('hidden');
  }

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) close();
  });

  tabSquads.addEventListener('click', () => {
    currentTab = 'squads';
    render();
  });

  tabAi.addEventListener('click', () => {
    currentTab = 'ai';
    render();
  });

  function render() {
    const state = getState();
    if (!state) return;

    ensurePlayerSquads(state);
    const squads = state.playerSquads || [];
    if (!selectedSquadId || !squads.some((s) => s.id === selectedSquadId)) {
      selectedSquadId = squads[0] ? squads[0].id : null;
    }

    tabSquads.classList.toggle('active', currentTab === 'squads');
    tabAi.classList.toggle('active', currentTab === 'ai');
    content.innerHTML = '';

    if (currentTab === 'squads') {
      renderSquadsTab(state, squads);
    } else {
      renderAiTab(state, squads);
    }
  }

  function renderSquadsTab(state, squads) {
    const list = document.createElement('div');
    list.className = 'squad-list';

    for (const sq of squads) {
      const card = document.createElement('div');
      card.className = 'squad-card';

      // 部隊ヘッダー
      const cardHead = document.createElement('div');
      cardHead.className = 'squad-card-head';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'squad-title-wrap';

      const title = document.createElement('span');
      title.className = 'squad-card-title';
      title.textContent = sq.name;

      const count = document.createElement('span');
      count.className = 'squad-count-badge';
      count.textContent = `(${sq.memberIds.length}人)`;

      titleWrap.appendChild(title);
      titleWrap.appendChild(count);

      const actions = document.createElement('div');
      actions.className = 'squad-card-actions';

      // 改名ボタン
      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'squad-btn-rename';
      renameBtn.textContent = '改名';
      renameBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        showTextInputSheet({
          title: '部隊名を変更',
          defaultValue: sq.name,
          onConfirm(nextName) {
            renamePlayerSquad(state, sq.id, nextName);
            if (hooks.onUpdate) hooks.onUpdate();
            render();
          },
        });
      });
      actions.appendChild(renameBtn);

      // 削除ボタン（1部隊のみの場合は削除不可）
      if (squads.length > 1) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'squad-btn-delete';
        deleteBtn.textContent = '解散';
        deleteBtn.title = '部隊を解散し、メンバーを本隊へ合流させます';
        deleteBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (window.confirm(`「${sq.name}」を解散しますか？メンバーは先頭部隊へ合流します。`)) {
            deletePlayerSquad(state, sq.id);
            if (hooks.onUpdate) hooks.onUpdate();
            render();
          }
        });
        actions.appendChild(deleteBtn);
      }

      cardHead.appendChild(titleWrap);
      cardHead.appendChild(actions);
      card.appendChild(cardHead);

      // メンバー一覧
      const membersList = document.createElement('div');
      membersList.className = 'squad-members-list';

      if (sq.memberIds.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'squad-empty-hint';
        empty.textContent = 'メンバーがいません';
        membersList.appendChild(empty);
      } else {
        for (const mid of sq.memberIds) {
          const actor = state.actors.find((a) => a.id === mid);
          const row = document.createElement('div');
          row.className = 'squad-member-row';

          const mInfo = document.createElement('div');
          mInfo.className = 'squad-member-info';

          const mName = document.createElement('span');
          mName.className = 'squad-member-name';
          mName.textContent = actor ? actor.name : `ID:${mid}`;

          const mStatus = document.createElement('span');
          mStatus.className = 'squad-member-status';
          if (actor) {
            mStatus.textContent = actor.state === 'dead' ? '死亡' : actor.state === 'down' ? '気絶' : '生存';
            if (actor.state === 'dead') mStatus.classList.add('status-dead');
            else if (actor.state === 'down') mStatus.classList.add('status-down');
          }

          mInfo.appendChild(mName);
          mInfo.appendChild(mStatus);
          row.appendChild(mInfo);

          // 部隊移動ドロップダウン
          const moveSelect = document.createElement('select');
          moveSelect.className = 'squad-move-select';
          const optDefault = document.createElement('option');
          optDefault.value = '';
          optDefault.textContent = '部隊移動...';
          moveSelect.appendChild(optDefault);

          for (const otherSq of squads) {
            if (otherSq.id === sq.id) continue;
            const opt = document.createElement('option');
            opt.value = otherSq.id;
            opt.textContent = `→ ${otherSq.name}`;
            moveSelect.appendChild(opt);
          }

          moveSelect.addEventListener('change', () => {
            const targetSqId = moveSelect.value;
            if (targetSqId) {
              moveMemberToSquad(state, mid, targetSqId);
              if (hooks.onUpdate) hooks.onUpdate();
              render();
            }
          });

          row.appendChild(moveSelect);
          membersList.appendChild(row);
        }
      }

      card.appendChild(membersList);
      list.appendChild(card);
    }

    // 部隊追加ボタン
    const addWrap = document.createElement('div');
    addWrap.className = 'squad-add-wrap';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'squad-btn-add';
    addBtn.textContent = '＋ 新しい部隊を作成';
    addBtn.addEventListener('click', () => {
      showTextInputSheet({
        title: '新しい部隊を作成',
        defaultValue: `部隊 ${squads.length + 1}`,
        onConfirm(newName) {
          createPlayerSquad(state, newName);
          if (hooks.onUpdate) hooks.onUpdate();
          render();
        },
      });
    });
    addWrap.appendChild(addBtn);
    list.appendChild(addWrap);

    content.appendChild(list);
  }

  function renderAiTab(state, squads) {
    const aiWrap = document.createElement('div');
    aiWrap.className = 'squad-ai-wrap';

    // 対象部隊の選択
    const topBar = document.createElement('div');
    topBar.className = 'squad-ai-topbar';

    const lblSquad = document.createElement('span');
    lblSquad.textContent = '設定対象:';
    topBar.appendChild(lblSquad);

    const selSquad = document.createElement('select');
    selSquad.className = 'squad-ai-squad-select';
    for (const sq of squads) {
      const opt = document.createElement('option');
      opt.value = sq.id;
      opt.textContent = sq.name;
      if (sq.id === selectedSquadId) opt.selected = true;
      selSquad.appendChild(opt);
    }
    selSquad.addEventListener('change', () => {
      selectedSquadId = selSquad.value;
      render();
    });
    topBar.appendChild(selSquad);
    aiWrap.appendChild(topBar);

    const activeSquad = squads.find((s) => s.id === selectedSquadId) || squads[0];
    if (!activeSquad) return;
    const ai = activeSquad.ai || { ...DEFAULT_SQUAD_AI };

    // 隊形ドロップダウン
    const formRow = document.createElement('div');
    formRow.className = 'squad-ai-form-row';
    const formLbl = document.createElement('label');
    formLbl.textContent = '隊形:';
    const formSelect = document.createElement('select');
    formSelect.className = 'squad-ai-form-select';

    const FORMATION_NAMES = {
      line: '横列',
      column: '縦列',
      wedge: 'くさび形',
      random: '散開',
    };

    for (const f of FORMATIONS) {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = FORMATION_NAMES[f] || f;
      if (ai.formation === f) opt.selected = true;
      formSelect.appendChild(opt);
    }
    formSelect.addEventListener('change', () => {
      setSquadFormation(state, activeSquad.id, formSelect.value);
      if (hooks.onUpdate) hooks.onUpdate();
    });
    formRow.appendChild(formLbl);
    formRow.appendChild(formSelect);
    aiWrap.appendChild(formRow);

    // AI設定トグル一覧
    const toggleList = document.createElement('div');
    toggleList.className = 'squad-ai-toggles-list';

    const TOGGLE_DEFS = [
      { key: 'helpAllies', label: '味方を救援する', stub: false },
      { key: 'attackOnSight', label: '先制攻撃・視認で突撃', stub: false },
      { key: 'healAllies', label: '負傷した味方を手当てする', stub: false },
      { key: 'rescueDowned', label: '倒れた味方を救出する', stub: false },
      { key: 'storeItemsAuto', label: 'アイテムを自動収納する', stub: true },
      { key: 'restInBed', label: '負傷時にベッドで休む', stub: true },
      { key: 'sitWhenIdle', label: '待機時に座る', stub: true },
      { key: 'shareFood', label: '食料を共有する', stub: true },
      { key: 'feedAnimals', label: '動物に餌をやる', stub: true },
    ];

    for (const item of TOGGLE_DEFS) {
      const label = document.createElement('label');
      label.className = 'squad-ai-toggle-item';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!ai[item.key];
      chk.addEventListener('change', () => {
        setSquadAi(state, activeSquad.id, item.key, chk.checked);
        if (hooks.onUpdate) hooks.onUpdate();
      });

      const span = document.createElement('span');
      span.textContent = item.label;

      if (item.stub) {
        const stubBadge = document.createElement('span');
        stubBadge.className = 'stub-badge';
        stubBadge.textContent = '未実装';
        label.appendChild(chk);
        label.appendChild(span);
        label.appendChild(stubBadge);
      } else {
        label.appendChild(chk);
        label.appendChild(span);
      }

      toggleList.appendChild(label);
    }

    aiWrap.appendChild(toggleList);
    content.appendChild(aiWrap);
  }

  return { open, close, isOpen, render };
}
