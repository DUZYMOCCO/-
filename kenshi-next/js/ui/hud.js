// 時刻・速度・状態・部位HP・ログ・追従・fps・ゲームオーバーのHTML窓口。

import { PART_KEYS, PART_LABEL, FACTIONS, isHostile, formatClock } from '../sim/index.js';
import { VITALS } from '../sim/data.js';
import { bloodOf } from '../sim/body.js';
import { limbBar, bloodBar, hungerBar, healthWord } from './health_ui.js';
import { partyKits, partyKitDur, canBuyKit, KIT_TIERS } from '../sim/medkit.js';
import { effMax, bedrollAt, REST_REACH, PACK_REACH } from '../sim/rest.js';
import { canAssassinate } from './selection.js';
import { factionLine, conditionList, weaponLine } from './labels.js';
import { formatMoney, CURRENCY } from './money.js';
import { memberCard, createTapDetector } from '../render/camfollow.js';

const STATUS_TEXT = {
  idle: '立っている',
  move: '移動中',
  fight: '戦っている',
  down: '気絶中',
  getup: '起き上がり中',
  dead: '死んでいる',
};

const SPEEDS = [0, 1, 2, 3, 5];

const SKILL_LABELS = [
  ['attack', '攻撃'],
  ['defense', '防御'],
  ['toughness', '頑強'],
  ['strength', '筋力'],
  ['dexterity', '器用'],
  ['athletics', '運動'],
  ['stealth', '隠密'],
  ['assassination', '暗殺'],
  ['crossbow', 'クロスボウ'],
  ['medic', '手当て'],
  ['trade', '交易'],
  ['lockpicking', '錠前破り'],
  ['thievery', '盗み'],
];

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

  // 選択パネル（普段は隠す）。選んだキャラの名前・状態・部位HPを出す。
  const hp = make('div', 'hud-hp hidden');
  const hpHead = make('div', 'hp-head');
  const hpName = make('span', 'hp-name', '');
  const hpClose = make('button', 'hp-close', '×');
  hpClose.type = 'button';
  hpClose.addEventListener('click', () => {
    if (hooks.onClearSelection) hooks.onClearSelection();
  });
  hpHead.appendChild(hpName);
  hpHead.appendChild(hpClose);
  hp.appendChild(hpHead);
  // 2行目: 勢力と関係（敵対=赤・中立=白・友好=緑）。3行目: 状態と 気絶・出血・死亡。
  const hpFaction = make('div', 'hp-faction');
  const hpFactionName = make('span', '', '');
  const hpRelation = make('span', 'hp-relation', '');
  hpFaction.appendChild(hpFactionName);
  hpFaction.appendChild(hpRelation);
  hp.appendChild(hpFaction);
  const hpState = make('div', 'hp-status');
  const hpStateText = make('span', '', '');
  const hpCond = make('span', 'hp-cond', '');
  hpState.appendChild(hpStateText);
  hpState.appendChild(hpCond);
  const hpWeapon = make('div', 'hp-weapon', '');
  let panelWeaponText = null;
  hp.appendChild(hpState);
  hp.appendChild(hpWeapon);

  // 体の窓（Kenshi の health pane のまま: 一番上に血、部位、一番下に空腹。名前はバーの中、数字は右の列）
  // 計算は ui/health_ui.js。色: 黄緑=今 / 赤=手当てで戻る / 黒い斜線=最大が下がった分（休むと戻る）
  // 0 未満: バーが「負の物差し」（左0→右−最大）に変わり、気絶点（KO）と右端の死・切断の印まで伸びる。
  const kbBox = make('div', 'kb-box');
  function makeBarRow(labelText, extra) {
    const row = make('div', 'kb-row' + (extra ? ' ' + extra : ''));
    const bar = make('div', 'kb-bar');
    const green = make('div', 'kb-seg kb-green');
    const red = make('div', 'kb-seg kb-red');
    const wound = make('div', 'kb-seg kb-wound');
    const neg = make('div', 'kb-seg kb-neg');
    const mark = make('div', 'kb-mark');
    mark.style.display = 'none';
    const label = make('span', 'kb-label', labelText);
    const arrows = make('span', 'kb-arrows', '');
    bar.appendChild(green);
    bar.appendChild(red);
    bar.appendChild(wound);
    bar.appendChild(neg);
    bar.appendChild(mark);
    bar.appendChild(label);
    bar.appendChild(arrows);
    const num = make('span', 'kb-num', '');
    row.appendChild(bar);
    row.appendChild(num);
    kbBox.appendChild(row);
    return { row, bar, green, red, wound, neg, mark, label, arrows, num, cache: {} };
  }
  // 変わった時だけ書き換える
  function setStyle(r, key, el, prop, value) {
    const k = key + prop;
    if (r.cache[k] === value) return;
    r.cache[k] = value;
    el.style[prop] = value;
  }
  function setText(r, key, el, value) {
    if (r.cache[key] === value) return;
    r.cache[key] = value;
    el.textContent = value;
  }
  const pct = (f) => Math.round(f * 1000) / 10 + '%';
  const bloodRow = makeBarRow('血', 'kb-blood');
  const partRows = {};
  for (const key of PART_KEYS) partRows[key] = makeBarRow(PART_LABEL[key], 'kb-part');
  const kbHungerRow = makeBarRow('空腹', 'kb-hunger');
  hp.appendChild(kbBox);

  function renderBars(actor) {
    // 血
    const bb = bloodBar(bloodOf(actor), actor.bleed, actor.gush);
    const r0 = bloodRow;
    setStyle(r0, 'g', r0.green, 'width', pct(bb.fill));
    setStyle(r0, 'r', r0.red, 'left', pct(bb.fill));
    setStyle(r0, 'r', r0.red, 'width', pct(Math.max(0, 1 - bb.fill)));
    setStyle(r0, 'm', r0.mark, 'left', pct(bb.koMark));
    setStyle(r0, 'm', r0.mark, 'display', '');
    setText(r0, 'a', r0.arrows, '<'.repeat(bb.arrows));
    setText(r0, 'n', r0.num, bb.text);
    r0.row.classList.toggle('low', bb.low);
    // 部位
    const t = (actor.skills && actor.skills.toughness) || 0;
    for (const key of PART_KEYS) {
      const r = partRows[key];
      const lb = limbBar(actor.parts[key], {
        vital: VITALS.includes(key),
        toughness: t,
        missing: Array.isArray(actor.missing) && actor.missing.includes(key),
      });
      const neg = lb.mode === 'neg';
      if (r.cache.modeName !== lb.mode + lb.state) {
        r.cache.modeName = lb.mode + lb.state;
        r.row.className = 'kb-row kb-part mode-' + lb.mode + ' st-' + lb.state;
      }
      setStyle(r, 'g', r.green, 'width', neg ? '0%' : pct(lb.green));
      setStyle(r, 'r', r.red, 'left', neg ? '0%' : pct(lb.green));
      setStyle(r, 'r', r.red, 'width', neg ? '0%' : pct(lb.red));
      setStyle(r, 'w', r.wound, 'width', neg ? '0%' : pct(lb.wound));
      setStyle(r, 'n', r.neg, 'width', neg ? pct(lb.neg) : '0%');
      const showKo = neg && lb.koMark !== null;
      setStyle(r, 'm', r.mark, 'display', showKo ? '' : 'none');
      if (showKo) setStyle(r, 'm', r.mark, 'left', pct(lb.koMark));
      setText(r, 'n', r.num, lb.text);
    }
    // 空腹
    const hb = hungerBar(actor.hunger);
    const r2 = kbHungerRow;
    setStyle(r2, 'd', r2.row, 'display', hb ? '' : 'none');
    if (hb) {
      setStyle(r2, 'g', r2.green, 'width', pct(hb.fill));
      setStyle(r2, 'm', r2.mark, 'left', pct(hb.weakMark));
      setStyle(r2, 'm', r2.mark, 'display', '');
      setText(r2, 'a', r2.arrows, '<'.repeat(hb.arrows));
      setText(r2, 'n', r2.num, hb.text);
      r2.row.classList.toggle('low', hb.low);
    }
  }

  const hpActions = make('div', 'hp-actions');
  const attackButton = make('button', 'hp-action', '攻撃');
  attackButton.type = 'button';
  attackButton.style.display = 'none';
  attackButton.addEventListener('click', () => {
    if (hooks.onAttackSelected) hooks.onAttackSelected();
  });
  const assassinateButton = make('button', 'hp-action', '暗殺');
  assassinateButton.type = 'button';
  assassinateButton.style.display = 'none';
  assassinateButton.addEventListener('click', () => {
    if (hooks.onAssassinateSelected) hooks.onAssassinateSelected();
  });
  const pickupButton = make('button', 'hp-action', '担ぐ');
  pickupButton.type = 'button';
  pickupButton.style.display = 'none';
  pickupButton.addEventListener('click', () => {
    if (hooks.onPickupSelected) hooks.onPickupSelected();
  });
  // 手当て（血を止めるだけ）と縄ほどき。命令は選んでいる／追っている仲間が受ける
  const treatButton = make('button', 'hp-action', '手当て');
  treatButton.type = 'button';
  treatButton.style.display = 'none';
  treatButton.addEventListener('click', () => {
    if (hooks.onTreatSelected) hooks.onTreatSelected();
  });
  // 商人から手当ての道具を買う
  const buyKitButton = make('button', 'hp-action', '手当ての道具を買う');
  buyKitButton.type = 'button';
  buyKitButton.style.display = 'none';
  buyKitButton.addEventListener('click', () => {
    if (hooks.onBuyMedkitSelected) hooks.onBuyMedkitSelected();
  });
  const buyStdButton = make('button', 'hp-action', '救急箱を買う');
  buyStdButton.type = 'button';
  buyStdButton.style.display = 'none';
  buyStdButton.addEventListener('click', () => {
    if (hooks.onBuyMedkitSelected) hooks.onBuyMedkitSelected('standard');
  });
  // 寝袋（敷く・休む・畳む）。選んだ仲間が受ける
  const bedButtons = {};
  for (const [type, text] of [['placeBedroll', '寝袋を敷く'], ['rest', '寝袋で休む'], ['packBedroll', '寝袋を畳む']]) {
    const b = make('button', 'hp-action', text);
    b.type = 'button';
    b.style.display = 'none';
    b.addEventListener('click', () => {
      if (hooks.onBedrollSelected) hooks.onBedrollSelected(type);
    });
    bedButtons[type] = b;
  }
  const freeButton = make('button', 'hp-action', '縄を解く');
  freeButton.type = 'button';
  freeButton.style.display = 'none';
  freeButton.addEventListener('click', () => {
    if (hooks.onFreeSelected) hooks.onFreeSelected();
  });
  // 選んだ仲間ひとりの灯り
  const lanternOneButton = make('button', 'hp-action', '灯りを点ける');
  lanternOneButton.type = 'button';
  lanternOneButton.style.display = 'none';
  lanternOneButton.addEventListener('click', () => {
    if (hooks.onLanternSelected) hooks.onLanternSelected();
  });
  hpActions.appendChild(attackButton);
  hpActions.appendChild(lanternOneButton);
  hpActions.appendChild(assassinateButton);
  hpActions.appendChild(pickupButton);
  hpActions.appendChild(treatButton);
  hpActions.appendChild(buyKitButton);
  hpActions.appendChild(buyStdButton);
  for (const b of Object.values(bedButtons)) hpActions.appendChild(b);
  hpActions.appendChild(freeButton);
  hp.appendChild(hpActions);

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

  // 見回し中だけ出す「追従に戻る」
  const returnButton = make('button', 'hud-return hidden', '◎追従に戻る');
  returnButton.type = 'button';
  returnButton.addEventListener('click', () => {
    if (hooks.onReturnFollow) hooks.onReturnFollow();
  });

  // 部隊の顔カード（画面下）。一回押しで選ぶ、二度押しで選んで追従。
  const portraitBar = make('div', 'hud-portraits');
  const cardTaps = createTapDetector();
  const cards = new Map(); // id -> { node, img, bar, tag, ratio, tagText, kind, src }
  let cardIdsSig = '';
  let cardVersion = -1;

  const follow = make('button', 'hud-follow', '追従');
  follow.type = 'button';
  follow.addEventListener('click', () => {
    if (hooks.onFollow) hooks.onFollow();
  });

  const sneakButton = make('button', 'hud-sneak', '隠密');
  sneakButton.type = 'button';

  // 一行全員の灯り（誰か一人でも点いていれば押した状態）
  const lanternButton = make('button', 'hud-lantern', '灯り');
  lanternButton.type = 'button';
  let lanternOn = false;
  lanternButton.addEventListener('click', () => {
    if (hooks.onLantern) hooks.onLantern(!lanternOn);
  });

  const ability = make('button', 'hud-ability', '能力');
  ability.type = 'button';

  const skillPanel = make('div', 'hud-skills hidden');
  const skillValues = {};
  for (const [key, label] of SKILL_LABELS) {
    const row = make('div', 'skill-row');
    row.appendChild(make('span', 'skill-name', label));
    const value = make('span', 'skill-value', '0.0');
    row.appendChild(value);
    skillPanel.appendChild(row);
    skillValues[key] = value;
  }
  const hungerRow = make('div', 'hunger-row');
  hungerRow.appendChild(make('span', 'hunger-label', '満腹度'));
  const hungerTrack = make('div', 'hunger-track');
  const hungerFill = make('div', 'hunger-fill');
  hungerTrack.appendChild(hungerFill);
  hungerRow.appendChild(hungerTrack);
  skillPanel.appendChild(hungerRow);
  const foodLine = make('div', 'food-line', '食料 0');
  skillPanel.appendChild(foodLine);

  let abilityOpen = false;
  let latestPlayer = null;
  let sneakOn = false;
  sneakButton.addEventListener('click', () => {
    if (hooks.onSneak) hooks.onSneak(latestPlayer);
  });
  ability.addEventListener('click', () => {
    abilityOpen = !abilityOpen;
    ability.classList.toggle('active', abilityOpen);
    skillPanel.classList.toggle('hidden', !abilityOpen);
    if (abilityOpen && latestPlayer) renderAbility(latestPlayer);
  });

  const party = make('div', 'hud-party');
  party.style.position = 'absolute';
  party.style.padding = '4px 7px';
  party.style.borderRadius = '7px';
  party.style.background = 'rgba(10, 14, 20, 0.36)';
  party.style.fontSize = '10px';
  party.style.lineHeight = 1.35;
  party.style.whiteSpace = 'nowrap';
  party.style.pointerEvents = 'auto';
  party.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.85)';
  const money = make('div', 'hud-money', formatMoney(0));
  money.style.fontWeight = '700';
  const squad = make('div', 'hud-squad');
  party.appendChild(money);
  party.appendChild(squad);

  const dropButton = make('button', 'hud-follow', '下ろす');
  dropButton.type = 'button';
  dropButton.style.display = 'none';
  dropButton.addEventListener('click', () => {
    const api = window.__game;
    if (api && typeof api.command === 'function') api.command({ type: 'drop' });
  });

  const log = make('div', 'hud-log');

  const gameover = make('div', 'hud-gameover hidden');
  const overText = make('p', '', '部隊は全滅した');
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
  root.appendChild(returnButton);
  root.appendChild(portraitBar);
  root.appendChild(sneakButton);
  root.appendChild(lanternButton);
  root.appendChild(ability);
  root.appendChild(skillPanel);
  root.appendChild(party);
  root.appendChild(dropButton);
  root.appendChild(log);
  root.appendChild(fps);
  root.appendChild(gameover);

  let logSignature = '';
  let partySignature = '';
  let moneyText = '';
  const skillText = {};
  let hungerWidth = -1;
  let foodText = '';
  let panelActorId = null;
  let panelNameText = '';
  let panelStateText = '';
  let panelFactionText = '';
  let panelRelationKey = '';
  let panelCondText = '';
  let attackShown = false;
  let assassinShown = false;
  let pickupShown = false;

  function findActorById(state, id) {
    for (const actor of state.actors) {
      if (actor.id === id) return actor;
    }
    return null;
  }

  // 選択中のキャラだけ、名前・勢力・状態・部位HP・操作ボタンを出す。
  function renderSelection(state, selectedId, player) {
    const actor =
      selectedId === null || selectedId === undefined
        ? null
        : findActorById(state, selectedId);

    if (!actor) {
      if (panelActorId !== null) {
        hp.classList.add('hidden');
        panelActorId = null;
      }
      party.classList.remove('hidden');
      return;
    }

    if (panelActorId !== actor.id) {
      panelActorId = actor.id;
      hp.classList.remove('hidden');
    }
    party.classList.add('hidden');

    const nameText = actor.name || '';
    if (nameText !== panelNameText) {
      panelNameText = nameText;
      hpName.textContent = nameText;
    }

    const line = factionLine(state, actor);
    if (line.faction !== panelFactionText) {
      panelFactionText = line.faction;
      hpFactionName.textContent = line.faction;
    }
    if (line.relation.key !== panelRelationKey) {
      panelRelationKey = line.relation.key;
      hpRelation.textContent = line.relation.text;
      hpRelation.style.color = line.relation.color;
    }

    const stateText = actor.resting && actor.state === 'idle' ? '寝袋で休んでいる' : STATUS_TEXT[actor.state] || actor.state;
    if (stateText !== panelStateText) {
      panelStateText = stateText;
      hpStateText.textContent = stateText;
    }
    // Kenshi の窓の上の一言（正常・出血・軽傷・気絶・昏睡…）。血の量はバーに出すので文字からは外す。
    const word = healthWord(actor);
    const extra = conditionList(actor).filter(
      (c) => !c.startsWith('血 ') && c !== '気絶' && c !== '出血' && c !== '大出血' && c !== '死亡' && c !== word
    );
    const cond = [word].concat(extra).join('・');
    if (cond !== panelCondText) {
      panelCondText = cond;
      hpCond.textContent = cond;
      hpCond.style.color = word === '正常' ? '#cfe3a0' : word === '軽傷' ? '#ecd27a' : '';
    }

    const wText = weaponLine(actor);
    if (wText !== panelWeaponText) {
      panelWeaponText = wText;
      hpWeapon.textContent = wText;
      hpWeapon.style.display = wText ? '' : 'none';
    }

    renderBars(actor);

    const showAttack =
      actor.state !== 'dead' &&
      actor.state !== 'down' &&
      actor.state !== 'getup' &&
      isHostile(state, player ? player.faction : 'player', actor.faction);
    if (showAttack !== attackShown) {
      attackShown = showAttack;
      attackButton.style.display = showAttack ? '' : 'none';
    }

    const showAssassin = canAssassinate(state, actor.id);
    if (showAssassin !== assassinShown) {
      assassinShown = showAssassin;
      assassinateButton.style.display = showAssassin ? '' : 'none';
    }

    const squadMember =
      actor.state !== 'dead' &&
      (Array.isArray(state.squadIds) ? state.squadIds.includes(actor.id) : actor.faction === 'player');
    const oneText = actor.lantern ? '灯りを消す' : '灯りを点ける';
    if (lanternOneButton.style.display !== (squadMember ? '' : 'none')) {
      lanternOneButton.style.display = squadMember ? '' : 'none';
    }
    if (squadMember && lanternOneButton.textContent !== oneText) lanternOneButton.textContent = oneText;

    const showPickup =
      !!player &&
      actor.faction === 'player' &&
      actor.id !== player.id &&
      actor.state === 'down' &&
      !actor.bound && // 縛られている者は先に縄を解く
      (actor.carriedBy === null || actor.carriedBy === undefined);
    if (showPickup !== pickupShown) {
      pickupShown = showPickup;
      pickupButton.style.display = showPickup ? '' : 'none';
    }

    // 手当て: 血を流しているか傷んでいる、味方・捕まっている者・敵でない者・倒れている者（Kenshi は倒れた敵も手当てできる）
    const alive = actor.state !== 'dead';
    const hurt =
      actor.bleed > 0.05 || actor.gush > 0 ||
      Object.entries(actor.parts).some(([k, p]) => p && !(actor.missing && actor.missing.includes(k)) && p.hp < effMax(p) - 1);
    const showTreat =
      alive && hurt &&
      (actor.faction === 'player' || !!actor.bound || actor.state === 'down' || !isHostile(state, 'player', actor.faction));
    const treatDisp = showTreat ? '' : 'none';
    if (treatButton.style.display !== treatDisp) treatButton.style.display = treatDisp;
    // 救急箱の数と残り（部隊の合計）。無くても素手で（遅く）手当てできる
    const kits = partyKits(state);
    const kd = partyKitDur(state);
    const treatText = kits > 0 ? '手当て 箱' + kits + '・' + Math.round((kd.dur / Math.max(1, kd.full)) * 100) + '%' : '手当て（素手）';
    if (treatButton.textContent !== treatText) treatButton.textContent = treatText;
    const pl = state.actors.find((a) => a.id === state.playerId);
    const merchantOk = alive && actor.role === 'merchant' && !isHostile(state, 'player', actor.faction);
    for (const [btn, tier, stockKey] of [[buyKitButton, 'basic', 'medkitStock'], [buyStdButton, 'standard', 'medkitStockStd']]) {
      const show = merchantOk && (actor[stockKey] || 0) > 0;
      const disp = show ? '' : 'none';
      if (btn.style.display !== disp) btn.style.display = disp;
      if (!show) continue;
      const ok = !!pl && canBuyKit(state, pl, actor, tier);
      const t = KIT_TIERS[tier];
      const bt = t.label + 'を買う ' + CURRENCY + ' ' + t.price + (ok ? '' : '（近くで・所持金）');
      if (btn.textContent !== bt) btn.textContent = bt;
      if (btn.disabled !== !ok) btn.disabled = !ok;
    }
    // 寝袋: 自分の部隊の立っている者だけ
    const mine =
      alive && actor.faction === 'player' && actor.state !== 'down' && actor.state !== 'getup';
    const near = mine ? bedrollAt(state, actor, REST_REACH) : null;
    const showBed = {
      placeBedroll: mine && (actor.bedrollItem || 0) > 0 && !bedrollAt(state, actor, 1.5),
      rest: mine && !actor.resting && !!near && !state.actors.some((a) => a !== actor && a.resting === near.id && a.state !== 'dead'),
      packBedroll: mine && !!bedrollAt(state, actor, PACK_REACH),
    };
    for (const [type, b] of Object.entries(bedButtons)) {
      const disp = showBed[type] ? '' : 'none';
      if (b.style.display !== disp) b.style.display = disp;
    }
    const freeDisp = alive && actor.bound ? '' : 'none';
    if (freeButton.style.display !== freeDisp) freeButton.style.display = freeDisp;
  }

  function renderAbility(player) {
    const skills = player.skills || {};
    for (const [key] of SKILL_LABELS) {
      const value = typeof skills[key] === 'number' ? skills[key] : 0;
      const text = value.toFixed(1);
      if (skillText[key] !== text) {
        skillText[key] = text;
        skillValues[key].textContent = text;
      }
    }
    const raw = typeof player.hunger === 'number' ? player.hunger : 0;
    const hunger = Math.max(0, Math.min(100, raw));
    const width = Math.round(hunger * 10) / 10 + '%';
    if (width !== hungerWidth) {
      hungerWidth = width;
      hungerFill.style.width = width;
    }
    const food = Math.max(0, Math.round(player.food || 0));
    const nextFood = '食料 ' + food;
    if (nextFood !== foodText) {
      foodText = nextFood;
      foodLine.textContent = nextFood;
    }
  }

  const media = window.matchMedia('(orientation: portrait)');
  function applyOrientation() {
    document.body.classList.toggle('portrait', media.matches);
    document.body.classList.toggle('landscape', !media.matches);
    if (media.matches) {
      party.style.left = 'calc(env(safe-area-inset-left, 0px) + 12px)';
      party.style.top = 'calc(env(safe-area-inset-top, 0px) + 34px)';
      party.style.right = 'auto';
      party.style.bottom = 'auto';
      dropButton.style.right = 'calc(env(safe-area-inset-right, 0px) + 100px)';
      dropButton.style.top = 'calc(env(safe-area-inset-top, 0px) + 38px)';
      dropButton.style.left = 'auto';
      dropButton.style.bottom = 'auto';
    } else {
      party.style.left = 'calc(env(safe-area-inset-left, 0px) + 14px)';
      party.style.top = 'calc(env(safe-area-inset-top, 0px) + 32px)';
      party.style.right = 'auto';
      party.style.bottom = 'auto';
      dropButton.style.right = 'calc(env(safe-area-inset-right, 0px) + 102px)';
      dropButton.style.top = 'calc(env(safe-area-inset-top, 0px) + 78px)';
      dropButton.style.left = 'auto';
      dropButton.style.bottom = 'auto';
    }
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

  function partyStatus(actor) {
    if (actor.state === 'dead') return '死亡';
    if (actor.carriedBy !== null) return '担がれている';
    if (actor.state === 'down' || actor.state === 'getup') return '気絶';
    return '立っている';
  }

  // 所持金は部隊の合計（交易の窓と同じ数え方）
  function squadMoney(state, player) {
    const ids = Array.isArray(state.squadIds) ? state.squadIds : [];
    if (!ids.length) return player ? player.money || 0 : 0;
    let n = 0;
    for (const a of state.actors) if (a.faction === 'player' && a.state !== 'dead' && ids.includes(a.id)) n += a.money || 0;
    return n;
  }
  // 売り買いの直後にすぐ所持金を描き直す（1フレーム遅れ対策）
  function refreshMoney(state) {
    const nextMoney = formatMoney(squadMoney(state, null));
    if (nextMoney !== moneyText) {
      moneyText = nextMoney;
      money.textContent = nextMoney;
    }
  }

  function renderParty(state, player) {
    const nextMoney = formatMoney(squadMoney(state, player));
    if (nextMoney !== moneyText) {
      moneyText = nextMoney;
      money.textContent = nextMoney;
    }

    const ids = Array.isArray(state.squadIds) ? state.squadIds : [];
    const rows = [];
    for (const id of ids) {
      let actor = null;
      for (const entry of state.actors) {
        if (entry.id === id) {
          actor = entry;
          break;
        }
      }
      if (!actor) continue;
      let text = actor.name + ' ' + partyStatus(actor);
      if (typeof actor.hunger === 'number' && actor.hunger < 25) text += ' 空腹';
      rows.push({ actor, text });
    }
    // 文字の部隊一覧は顔カードに置き換えた（データ属性だけ残して検証に使う）。
    const signature = rows.map((row) => row.actor.id + ':' + row.text).join('|');
    if (signature !== partySignature) {
      partySignature = signature;
      squad.dataset.rows = signature;
    }
    renderCards(rows.map((row) => row.actor), state);
  }

  function buildCard(actor) {
    const node = make('button', 'pcard');
    node.type = 'button';
    node.dataset.id = String(actor.id);
    const face = make('div', 'pcard-face');
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.style.visibility = 'hidden';
    face.appendChild(img);
    const tag = make('span', 'pcard-tag', '');
    face.appendChild(tag);
    node.appendChild(face);
    node.appendChild(make('span', 'pcard-name', actor.name));
    const track = make('span', 'pcard-hp');
    const bar = make('span', 'pcard-hp-fill');
    track.appendChild(bar);
    node.appendChild(track);
    // 血の量（減っている時だけ見える細い赤帯）
    const bloodTrack = make('span', 'pcard-blood');
    const bloodBar = make('span', 'pcard-blood-fill');
    bloodTrack.appendChild(bloodBar);
    node.appendChild(bloodTrack);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const kind = cardTaps.tap(actor.id, now);
      if (kind === 'double') {
        if (hooks.onFocusActor) hooks.onFocusActor(actor.id);
      } else if (hooks.onSelectActor) {
        hooks.onSelectActor(actor.id);
      }
    });
    // 二度押しでページが拡大されないように
    node.addEventListener('dblclick', (event) => event.preventDefault());
    return { node, img, bar, tag, bloodTrack, bloodBar, blood: -1, ratio: -1, tagText: null, kind: '', src: null };
  }

  function renderCards(actors, state) {
    const sig = actors.map((a) => a.id).join(',');
    if (sig !== cardIdsSig) {
      cardIdsSig = sig;
      portraitBar.innerHTML = '';
      const keep = new Set(actors.map((a) => a.id));
      for (const id of Array.from(cards.keys())) if (!keep.has(id)) cards.delete(id);
      for (const actor of actors) {
        let card = cards.get(actor.id);
        if (!card) {
          card = buildCard(actor);
          cards.set(actor.id, card);
        }
        portraitBar.appendChild(card.node);
      }
      cardVersion = -1;
    }
    const version = hooks.portraitVersion ? hooks.portraitVersion() : 0;
    const refreshImg = version !== cardVersion;
    cardVersion = version;
    for (const actor of actors) {
      const card = cards.get(actor.id);
      if (!card) continue;
      const info = memberCard(actor, PART_KEYS);
      const ratio = Math.round(info.ratio * 100);
      if (info.blood !== card.blood) {
        card.blood = info.blood;
        card.bloodBar.style.width = info.blood + '%';
        card.bloodTrack.style.visibility = info.blood < 100 ? 'visible' : 'hidden';
      }
      if (ratio !== card.ratio) {
        card.ratio = ratio;
        card.bar.style.width = ratio + '%';
        card.bar.classList.toggle('low', ratio < 35);
      }
      if (info.tag !== card.tagText) {
        card.tagText = info.tag;
        card.tag.textContent = info.tag;
        card.tag.style.display = info.tag ? '' : 'none';
      }
      if (info.kind !== card.kind) {
        card.node.classList.remove('ok', 'down', 'dead', 'warn');
        card.node.classList.add(info.kind);
        card.kind = info.kind;
      }
      if (refreshImg && hooks.getPortrait) {
        const src = hooks.getPortrait(actor.id);
        if (src && src !== card.src) {
          card.src = src;
          card.img.src = src;
          card.img.style.visibility = '';
        }
      }
    }
  }

  function markCards(selectedId, followId, following) {
    for (const [id, card] of cards) {
      card.node.classList.toggle('selected', id === selectedId);
      card.node.classList.toggle('followed', !!following && id === followId);
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
      let statusText = STATUS_TEXT[player.state] || player.state;
      if (player.assassinTargetId !== null && player.assassinTargetId !== undefined) {
        statusText = '暗殺に向かう';
      } else if (player.sneaking) {
        statusText += '（隠密）';
      }
      status.textContent = statusText;
    } else {
      status.textContent = '';
    }

    latestPlayer = player;
    setSneak(player ? !!player.sneaking : false);
    {
      const ids = Array.isArray(state.squadIds) ? state.squadIds : [];
      const on = state.actors.some((a) => ids.includes(a.id) && a.lantern && a.state !== 'dead');
      if (on !== lanternOn) {
        lanternOn = on;
        lanternButton.classList.toggle('active', on);
      }
    }
    const selectedId = data.selectionId === undefined ? null : data.selectionId;
    renderSelection(state, selectedId, player);
    renderParty(state, player);
    if (abilityOpen && player) renderAbility(player);
    dropButton.style.display = player && player.carryingId !== null ? 'block' : 'none';

    renderLog(state);

    const speed = data.speed === undefined ? 1 : data.speed;
    for (const [n, button] of speedButtons) {
      button.classList.toggle('active', n === speed);
    }

    follow.classList.toggle('active', !!data.follow);
    returnButton.classList.toggle('hidden', !!data.follow);
    markCards(selectedId, data.followId, !!data.follow);

    if (data.fps !== undefined && Number.isFinite(data.fps)) {
      fps.textContent = Math.round(data.fps) + ' fps';
    }

    gameover.classList.toggle('hidden', !state.gameOver);
    if (state.gameOver) overText.textContent = '部隊は全滅した';
  }

  function setSpeed(n) {
    for (const [value, button] of speedButtons) {
      button.classList.toggle('active', value === n);
    }
  }

  function setFollow(on) {
    follow.classList.toggle('active', !!on);
    returnButton.classList.toggle('hidden', !!on);
  }

  function setSneak(on) {
    const next = !!on;
    if (next === sneakOn) return;
    sneakOn = next;
    sneakButton.classList.toggle('active', next);
  }

  return {
    update,
    setSpeed,
    setFollow,
    setSneak,
    refreshMoney,
  };
}
