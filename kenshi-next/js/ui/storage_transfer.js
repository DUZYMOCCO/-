import { BUILD_MATERIALS } from '../data/buildings.js';
import { panels } from './panels.js';

function total(items, id) {
  return (items || []).filter((item) => item?.id === id).reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.n) || 1)), 0);
}

export function createStorageTransfer(options = {}) {
  const getState = options.getState || (() => null);
  const onCommand = options.onCommand || (() => {});
  const root = document.createElement('div');
  root.className = 'build-storage-overlay';
  root.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'build-storage-panel';
  panel.setAttribute('aria-label', '素材の預け入れ');
  const header = document.createElement('header');
  const title = document.createElement('strong');
  title.textContent = '物置箱に素材を預ける';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '閉じる';
  header.append(title, close);
  const rows = document.createElement('div');
  rows.className = 'build-storage-rows';
  panel.append(header, rows);
  root.append(panel);
  document.body.append(root);

  let pieceId = null;
  let actorId = null;
  function render() {
    rows.replaceChildren();
    const state = getState();
    const actor = state?.actors?.find((item) => item.id === actorId);
    const box = state?.outposts?.pieces?.find((item) => item.id === pieceId && item.type === 'storage_box');
    if (!actor || !box) {
      const empty = document.createElement('p');
      empty.textContent = '物置箱か仲間を確認できません';
      rows.append(empty);
      return;
    }
    const materials = Object.keys(BUILD_MATERIALS).sort();
    let shown = 0;
    for (const id of materials) {
      const count = total(actor.inv, id);
      const stored = Math.max(0, Math.floor(Number(box.contents?.[id]) || 0));
      if (!count && !stored) continue;
      shown += 1;
      const row = document.createElement('article');
      row.className = 'build-storage-row';
      const label = document.createElement('span');
      label.textContent = `${BUILD_MATERIALS[id]}　所持 ${count} / 箱 ${stored}`;
      const one = document.createElement('button');
      one.type = 'button';
      one.textContent = '1個';
      one.disabled = count < 1;
      one.addEventListener('click', () => {
        onCommand({ type: 'depositMaterials', pieceId, actorId, materials: { [id]: 1 } });
        render();
      });
      const all = document.createElement('button');
      all.type = 'button';
      all.textContent = '全部';
      all.disabled = count < 1;
      all.addEventListener('click', () => {
        onCommand({ type: 'depositMaterials', pieceId, actorId, materials: { [id]: count } });
        render();
      });
      row.append(label, one, all);
      rows.append(row);
    }
    if (!shown) {
      const empty = document.createElement('p');
      empty.textContent = '預けられる建築素材がありません';
      rows.append(empty);
    }
  }
  function open(nextPieceId, nextActorId) {
    pieceId = nextPieceId;
    actorId = nextActorId;
    render();
    root.hidden = false;
    panels.open('buildStorage');
  }
  function closePanel() {
    root.hidden = true;
    panels.close('buildStorage');
  }
  close.addEventListener('click', closePanel);
  panels.register('buildStorage', { contains: (target) => panel.contains(target), close: () => { root.hidden = true; } });
  return { open, close: closePanel, render, dispose() { root.remove(); } };
}
