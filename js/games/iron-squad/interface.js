/** Presentation only: keep game actions on their original DOM nodes. */
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};
const fold = (parent, id, title, nodes) => {
  const details = element('details', 'command-fold'); details.id = id;
  details.append(element('summary', '', title));
  const content = element('div', 'fold-content'); content.append(...nodes.filter(Boolean));
  details.append(content); parent.append(details); return details;
};
const title = (parent, text, hint) => {
  const heading = element('div', 'section-heading');
  heading.append(element('h4', '', text));
  if (hint) heading.append(element('p', '', hint));
  parent.prepend(heading);
};

export function configureInterface(game) {
  const root = game.container;
  const get = id => root.querySelector(`#${id}`);
  const stats = root.querySelector('.game-stats');
  // Keep live update targets, but show administrative figures in the command panel.
  for (const id of ['player-rank', 'current-gold', 'current-orbs']) get(id).parentElement.classList.add('hud-admin');
  get('btn-back').textContent = '⌂'; get('btn-back').setAttribute('aria-label', '工房へ戻る');
  get('btn-strategy').innerHTML = '<span aria-hidden="true">☰</span><small>司令部</small>';
  get('btn-strategy').setAttribute('aria-label', '司令部を開く');
  stats.querySelector('#player-hp').previousElementSibling.textContent = '隊長 HP';
  get('squad-alive').previousElementSibling.textContent = '直属 / 本隊';
  get('phase-timer-display').previousElementSibling.textContent = '残り時間';
  const field = get('canvas-container');
  // Share layout with the controls so log text clears their actual height,
  // including the recovery button and the conditional transport badge.
  get('virtual-gamepad').prepend(get('battle-log-window'));
  const fieldStatus = element('div', 'field-status');
  fieldStatus.append(get('field-zone-badge'), get('day-night-badge')); field.append(fieldStatus);
  const alerts = element('div', 'field-alerts');
  alerts.append(get('base-raid-banner'), get('dungeon-prompt-banner'), get('phase-complete-banner')); field.append(alerts);

  const heading = root.querySelector('.dialog-heading');
  heading.querySelector('span').classList.add('command-wallet');
  // The balance labels must be explicit; icons alone were ambiguous.
  const wallet = heading.querySelector('.command-wallet');
  const gold = get('strat-gold'), treasury = get('strat-treasury'), orbs = get('strat-orbs');
  wallet.replaceChildren();
  for (const [label, value, unit] of [['軍資金', gold, ' G'], ['国庫', treasury, ' G'], ['宝珠 / 宝玉', orbs, '']]) {
    const entry = element('span', 'wallet-entry'); entry.append(element('small', '', label), value, document.createTextNode(unit)); wallet.append(entry);
  }
  get('tab-strat-overview').textContent = '戦況';
  get('tab-strat-troops').textContent = '部隊・装備';
  get('tab-strat-nation').textContent = '国家';
  // Everyday management next to the overview, followed by national operations.
  get('tab-strat-overview').after(get('tab-strat-troops'));
  const overview = get('view-strat-overview');
  const snapshot = element('section', 'command-snapshot'); snapshot.id = 'command-snapshot'; overview.prepend(snapshot);
  const heal = get('btn-heal-all').parentElement; heal.classList.add('command-heal');
  heal.firstElementChild.children[0].textContent = '部隊の一括治療';
  heal.firstElementChild.children[1].textContent = '隊長と行動可能な兵士を治療。ダウン中は搬送・衛生兵の救護が必要。';
  const links = element('div', 'command-shortcuts');
  for (const [label, tab, sub] of [['兵士を管理', 'troops', 'roster'], ['装備を整理', 'troops', 'equip'], ['遠征・国庫', 'nation', null]]) {
    const button = element('button', '', label); button.type = 'button';
    button.onclick = () => { if (sub) game.rosterManageTab = sub; game._selectStratTab(tab); };
    links.append(button);
  }
  snapshot.after(heal, links);
  fold(overview, 'command-report', '前回の作戦報告', [get('strat-report')]);
  fold(overview, 'commander-record', '隊長の成長・覚醒', [get('player-record-box')]);
  const rules = fold(overview, 'command-rules', '整備・昼夜・救助のルール', []); rules.querySelector('.fold-content').id = 'command-rule-content';
  const restart = get('btn-restart-from-strat'); restart.textContent = 'セーブ選択へ戻る';
  fold(overview, 'command-session', 'セーブ・ゲーム管理', [restart]);

  const troops = get('view-strat-troops');
  troops.querySelector('.hub-intro').replaceChildren();
  title(troops.querySelector('.hub-intro'), '部隊と装備', '名簿で兵士を選び、支給・強化・昇格を行えます。');
  get('formation-bar').classList.add('command-note');
  const subnav = root.querySelector('.economy-tab-row'); troops.querySelector('.hub-intro').after(subnav);
  get('tab-econ-roster').textContent = '兵士名簿'; get('tab-econ-scout').textContent = '雇用'; get('tab-econ-equip').textContent = '隊長装備・バッグ';
  const rosterTools = element('div', 'list-tools'); rosterTools.id = 'roster-tools';
  const searchLabel = element('label', '', '兵士を探す');
  const search = element('input'); search.id = 'roster-search'; search.type = 'search'; search.placeholder = '名前・職・小隊'; searchLabel.append(search);
  const woundedLabel = element('label', 'check-filter'); const wounded = element('input'); wounded.type = 'checkbox'; wounded.id = 'roster-wounded-only';
  woundedLabel.append(wounded, document.createTextNode('負傷者のみ')); rosterTools.append(searchLabel, woundedLabel);
  get('squad-roster-list').before(rosterTools);
  search.addEventListener('input', () => filterRoster(root)); wounded.addEventListener('change', () => filterRoster(root));
  const empty = element('p', 'list-empty hidden', '条件に合う兵士はいません。'); empty.id = 'roster-empty'; get('squad-roster-list').after(empty);
  get('squad-roster-list').after(get('reserve-roster'));
  const rulesNote = get('roster-experience-note'); rulesNote.classList.add('command-note', 'roster-help');
  // The active panel owns its help and roster. Hiring no longer repeats all soldiers.
  const originalSync = game._syncTroopsSubView;
  game._syncTroopsSubView = sub => {
    originalSync(sub);
    get('squad-roster-list').style.display = sub === 'roster' ? '' : 'none';
    for (const node of [rosterTools, get('reserve-roster'), get('reinforcement-summary'), get('formation-bar'), rulesNote]) {
      node?.classList.toggle('hidden', sub !== 'roster');
    }
    if (sub !== 'roster') empty.classList.add('hidden'); else filterRoster(root);
    game.rosterManageTab = sub;
  };

  const equip = get('view-strat-equip'); equip.classList.add('equipment-workspace');
  const worn = get('player-equip-box');
  fold(equip, 'commander-equipment', '隊長の装備・強化（全7部位）', [worn]);
  equip.prepend(get('commander-equipment'));
  const inventoryTools = element('div', 'list-tools'); inventoryTools.id = 'inventory-tools';
  const slotLabel = element('label', '', '装備の部位'); const slot = element('select'); slot.id = 'inventory-slot-filter';
  for (const [key, label] of [['', '全ての部位'], ['weapon', '武器'], ['shield', '盾'], ['helmet', '兜'], ['armor', '鎧'], ['gloves', '手'], ['legs', '脚'], ['amulet', '装飾']]) {
    const option = element('option', '', label); option.value = key; slot.append(option);
  }
  slotLabel.append(slot);
  const betterLabel = element('label', 'check-filter'); const better = element('input'); better.type = 'checkbox'; better.id = 'inventory-better-only';
  betterLabel.append(better, document.createTextNode('上昇項目あり')); inventoryTools.append(slotLabel, betterLabel);
  get('inventory-list').before(inventoryTools);
  slot.onchange = better.onchange = () => filterInventory(root);
  const inventoryCount = element('p', 'list-count'); inventoryCount.id = 'inventory-visible-count'; inventoryTools.after(inventoryCount);
  const inventoryEmpty = element('p', 'list-empty hidden', '条件に合う装備はありません。'); inventoryEmpty.id = 'inventory-filter-empty'; get('inventory-list').after(inventoryEmpty);

  const nation = get('view-strat-nation'); nation.querySelector('.hub-intro').replaceChildren();
  title(nation.querySelector('.hub-intro'), '国家運営', '軍令の確認、国庫への寄付、本隊の遠征をまとめて管理。');
  const donate = get('view-econ-invest'); donate.classList.add('command-card'); get('nation-quest-panel').after(donate);
  title(get('nation-expedition-panel'), '本隊の小隊遠征', '出発先と参加兵士を確認して派遣します。');
  fold(nation, 'nation-finances', '前回の財政報告', [get('nation-fiscal-panel')]);
  fold(nation, 'nation-shared-box', '共有装備箱', [get('view-econ-box')]);
  // Details and hand-off popups close before the underlying dialog on Escape.
  const modal = get('strategy-modal');
  modal.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const transfer = get('equipment-transfer-popup');
    if (transfer && !transfer.classList.contains('hidden')) {
      event.preventDefault(); event.stopImmediatePropagation(); transfer.querySelector('.transfer-popup-close-btn')?.click();
    } else if (game.selectedSoldierDetailId != null) {
      event.preventDefault(); event.stopImmediatePropagation(); game.closeSoldierDetail();
    }
  }, true);
}

/** 小隊名「第1小隊 (前衛突撃)」→ 略称と小隊方針を分離（個人の役割と混同しない） */
function parsePlatoonDoctrine(platoonName) {
  const raw = String(platoonName || '小隊').trim();
  const m = raw.match(/^(.+?)\s*[（(]\s*(.+?)\s*[）)]\s*$/);
  if (m) return { shortName: m[1].trim(), doctrine: m[2].trim() };
  return { shortName: raw, doctrine: '' };
}

/** 職種から個人の戦場ポジション（小隊方針とは別） */
function classCombatRoleLabel(cls) {
  const base = (cls && (cls.baseClassId || cls.id)) || '';
  if (base === 'ARCHER') return '遠距離射撃';
  if (base === 'MEDIC') return '後方支援';
  if (base === 'MAGE') return '範囲魔法';
  if (base === 'LIGHT') return '遊撃強襲';
  if (base === 'HEAVY') return '前衛防御';
  if (cls && cls.range >= 200) return '遠距離射撃';
  return '戦闘';
}

export function compactSoldierCard(game, row, soldier, cls, platoonName, talent) {
  const details = element('details', 'roster-entry'); details.dataset.soldierId = soldier.id;
  const { shortName, doctrine } = parsePlatoonDoctrine(platoonName);
  const roleLabel = classCombatRoleLabel(cls);
  const talentTag = (talent && talent.tag) || '';
  const talentName = (talent && talent.name) || '';
  const assignLabel = soldier.isPersonalGuard
    ? '直属'
    : (doctrine ? `${shortName} · 小隊方針:${doctrine}` : shortName);
  details.dataset.search = `${soldier.name} ${soldier.title || ''} ${cls.name} ${shortName} ${doctrine} ${roleLabel} ${talentTag} ${talentName}`.toLocaleLowerCase();
  details.dataset.wounded = String(!!soldier.isDown || soldier.hp < soldier.maxHp);
  const summary = element('summary', 'roster-summary');
  const portrait = row.querySelector('.soldier-portrait'); summary.append(portrait);
  const identity = element('span', 'roster-identity');
  identity.append(element('strong', '', `${soldier.isNamed ? soldier.title || '' : ''}${soldier.name}`));
  const meta = element('small', 'roster-meta');
  meta.append(document.createTextNode(`${cls.name} · Lv.${soldier.level || 1} · ${roleLabel}`));
  if (talentTag) {
    meta.append(document.createTextNode(' · '));
    const tEl = element('span', 'roster-talent', talentTag);
    if (talent && talent.color) tEl.style.color = talent.color;
    if (talent && talent.desc) tEl.title = talent.desc;
    meta.append(tEl);
  }
  identity.append(meta);
  const magic=game.magicUnitDescription?.(soldier);if(magic){identity.append(element('small','roster-mana',magic));details.dataset.search+=' '+magic;}
  identity.append(element('small', 'roster-assign', assignLabel));
  const hp = element('span', 'roster-health');
  const hpText = element('span', '', `${Math.max(0, Math.floor(soldier.hp))} / ${soldier.maxHp} HP`);
  const hpBar = element('span', 'health-track'); const fill = element('span'); fill.style.width = `${Math.max(0, Math.min(100, soldier.hp / Math.max(1, soldier.maxHp) * 100))}%`; hpBar.append(fill);
  hp.append(hpText, hpBar);
  const status = element('span', `roster-state${soldier.isDown ? ' is-wounded' : ''}`, soldier.isDown ? '要救助' : soldier.magicRecovering?'瞑想':soldier.maxMana>0&&soldier.mana<16?'魔力不足':soldier.hp < soldier.maxHp ? '負傷' : '健在');
  const arrow = element('span', 'roster-expand', '＋'); arrow.setAttribute('aria-hidden', 'true');
  summary.append(identity, hp, status, arrow);
  details.append(summary, row); details.open = game.uiExpandedSoldierId === soldier.id;
  details.addEventListener('toggle', () => {
    if (!details.isConnected) return;
    arrow.textContent = details.open ? '−' : '＋';
    if (details.open) {
      game.uiExpandedSoldierId = soldier.id;
      for (const other of details.parentElement?.querySelectorAll('.roster-entry[open]') || []) if (other !== details) other.open = false;
    } else if (game.uiExpandedSoldierId === soldier.id) game.uiExpandedSoldierId = null;
  });
  const detailButton = row.querySelector('.btn-soldier-detail'); if (detailButton) detailButton.textContent = '個人記録・戦歴';
  row.querySelector('.btn-dismiss')?.classList.add('danger-action');
  return details;
}

export function filterRoster(root) {
  const query = root.querySelector('#roster-search')?.value.trim().toLocaleLowerCase() || '';
  const wounded = root.querySelector('#roster-wounded-only')?.checked;
  let visible = 0;
  const list = root.querySelector('#squad-roster-list');
  for (const row of list.querySelectorAll('.roster-entry')) {
    const show = (!query || row.dataset.search.includes(query)) && (!wounded || row.dataset.wounded === 'true');
    row.classList.toggle('hidden', !show); if (show) visible++;
  }
  for (const heading of list.querySelectorAll('.roster-category-header')) {
    let node = heading.nextElementSibling, hasVisible = false;
    while (node && !node.classList.contains('roster-category-header')) {
      if (node.classList.contains('roster-entry') && !node.classList.contains('hidden')) hasVisible = true;
      node = node.nextElementSibling;
    }
    heading.classList.toggle('hidden', !hasVisible && !!(query || wounded));
    heading.nextElementSibling?.classList.toggle('hidden', !hasVisible && !!(query || wounded));
  }
  root.querySelector('#roster-empty')?.classList.toggle('hidden', visible > 0 || list.style.display === 'none');
}

export function filterInventory(root) {
  const slot = root.querySelector('#inventory-slot-filter')?.value;
  const better = root.querySelector('#inventory-better-only')?.checked;
  const rows = [...root.querySelectorAll('#inventory-list > .inventory-card')];
  let visible = 0;
  for (const row of rows) {
    const show = (!slot || row.dataset.slot === slot) && (!better || row.dataset.improves === 'true');
    row.classList.toggle('hidden', !show); if (show) visible++;
  }
  const count = root.querySelector('#inventory-visible-count'); if (count) count.textContent = `${visible} / ${rows.length} 件表示 · 上昇項目は引継後も含む。売却選択は絞り込み後も保持。`;
  root.querySelector('#inventory-filter-empty')?.classList.toggle('hidden', visible > 0 || rows.length === 0);
}

export function refreshInterface(game, { rank, time, zone }) {
  const root = game.container; const get = id => root.querySelector(`#${id}`);
  if (!get('command-snapshot')) return; // allows non-DOM simulation fixtures
  const snapshot = get('command-snapshot'); snapshot.replaceChildren();
  const heading = element('div', 'snapshot-heading');
  const portrait = get('player-record-box').querySelector('.commander-portrait');
  if (portrait) heading.append(portrait);
  heading.append(element('span', 'command-eyebrow', 'FIELD COMMAND'), element('h4', '', `${rank.title} · 作戦第${game.phase || game.wave || 1}期`)); snapshot.append(heading);
  const metrics = element('div', 'snapshot-metrics');
  const alive = (game.squad || []).filter(s => !s.dead);
  for (const [label, value, tone] of [['隊長 HP', `${Math.max(0, Math.floor(game.player.hp))} / ${game.player.maxHp}`, ''], ['実戦 / 予備', `${alive.length} / ${(game.reserves || []).length} 名`, ''], ['要救助', `${alive.filter(s => s.isDown).length} 名`, alive.some(s => s.isDown) ? 'danger-text' : ''], ['現在時刻', `${time.label} ${time.clock}`, '']]) {
    const metric = element('div', 'snapshot-metric'); metric.append(element('small', '', label), element('strong', tone, value)); metrics.append(metric);
  }
  snapshot.append(metrics, element('p', 'command-location', `${zone.name || zone.label || '現在地'} · ${time.day}日目`));
  if (game.currentQuest) snapshot.append(element('p', 'command-objective', `軍令：${game.currentQuest.title} · ${game.currentQuest.completed ? '達成済み' : '遂行中'}`));
  for (const id of ['maintenance-summary', 'day-night-summary', 'casualty-summary']) if (get(id)) get('command-rule-content').append(get(id));
  get('nation-shared-box').querySelector('summary').textContent = `共有装備箱 · ${(game.sharedEquipBox || []).length} 件`;
  get('formation-bar').textContent = `防衛陣形 · 本隊は本陣防衛圏、直属は隊長に追従。遠征は「国家」から。`;
  // Formatting is local to the panel and does not alter economy or item rules.
  for (const btn of root.querySelectorAll('#inventory-list button, #player-equip-box button')) btn.type = 'button';
  for (const button of root.querySelectorAll('.btn-up-equipped, .btn-up-inv, .btn-soldier-up')) {
    button.classList.add('upgrade-action');
  }
  const scout = get('scout-candidates-list'); for (const row of scout.children) row.classList.add('scout-card');
  const expedition = get('nation-expedition-panel');
  if (!expedition.querySelector('.section-heading')) title(expedition, '本隊の小隊遠征', '出発先と参加兵士を確認して派遣します。');
  filterRoster(root); filterInventory(root);
}

/** A nested dialog must own keyboard focus and block controls behind it. */
export function setSubDialog(game, host, open, close = null) {
  if (!host || !game.container) return;
  const modal = game.container.querySelector('#strategy-modal');
  const nested = !!host.closest('#strategy-modal');
  if (nested) {
    for (const sibling of modal.querySelector('.strategy-panel').children) if (sibling !== host) sibling.inert = open;
  } else modal.inert = open;
  if (open) {
    if (!host._uiReturnFocus) host._uiReturnFocus = document.activeElement;
    host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-label', nested ? '兵士の個人記録' : '兵士へ装備を譲渡');
    host._uiClose = close;
    if (!host._uiKeyHandler) {
      host._uiKeyHandler = event => {
        if (event.key === 'Escape') {
          event.preventDefault(); event.stopImmediatePropagation(); host._uiClose?.();
        } else if (event.key === 'Tab') {
          const targets = [...host.querySelectorAll('button, select, input, summary, [tabindex="0"]')].filter(node => !node.disabled && node.getClientRects().length);
          const first = targets[0], last = targets[targets.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          event.stopPropagation();
        }
      };
      host.addEventListener('keydown', host._uiKeyHandler);
    }
    host.querySelector('button')?.focus();
  } else {
    const previous = host._uiReturnFocus; host._uiReturnFocus = null;
    if (previous?.isConnected) previous.focus(); else modal.querySelector('#btn-dialog-close')?.focus();
  }
}
