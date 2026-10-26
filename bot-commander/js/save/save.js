// セーブ（遊んだ進み具合）。localStorage の bc-save-v1 に、ミッションの記録・解放した機体と武器・物語の場所を残す。
// シム（js/sim）は記録のことを知らない。ここは画面（DOM）にも依存しない（Node のテストで動く）。
// 武器庫の bc-armory-v1 と、拾った武器の botcommander_owned_weapons は「読むだけ」。書きかえない（v1.0.0: 「記録を消す」の時だけ、いっしょに消す）。
// v1.0.0: チュートリアルの印（古いキー botcommander_tutorial）を bc-save-v1 の tutorial にまとめた。最初に読んだ時に 1 回だけ移して、古いキーを消す。
import { WEAPONS } from '../sim/weapons.js?v=7';

export const SAVE_KEY = 'bc-save-v1';
export const BROKEN_KEY = 'bc-save-v1-broken'; // こわれたデータは、上書きする前に元の文字列を 1 つだけここへ残す
export const OWNED_KEY_READONLY = 'botcommander_owned_weapons'; // index.js の OWNED_KEY と同じ（読むだけ）
export const ARMORY_KEY_READONLY = 'bc-armory-v1'; // armory-view.js の STORE_KEY と同じ（読むだけ。「記録を消す」で消す）
export const LEGACY_TUTORIAL_KEY = 'botcommander_tutorial'; // v0.4.x のチュートリアルの印（工房の storage・JSON の {v:1,state}）。bc-save-v1 へ移したら消す
const TUTORIAL_STATES = new Set(['done', 'skipped']);
const PREFIX = 'game_studio_'; // common/js/storage.js と同じ前づけ
export const SAVE_VERSION = 1;

/**
 * 最初から使える物（ここ 1 か所）。今は全部使える（今のふるまいのまま）。
 * 物語モードが「最初は少なく」にしたい時は、この表を短くする（解放は unlockUnit / unlockWeapon で足す）。
 */
export const START_UNLOCKED = Object.freeze({
  units: Object.freeze(['scav', 'ponco', 'boy', 'girl', 'gunner', 'heavy']),
  weapons: Object.freeze(WEAPONS.map(w => w.id)),
});

/** お試し・見た目だけの URL の付け方。ここにある物だけが付いている時だけ、記録する */
const COSMETIC_PARAMS = new Set(['fx', 'ground', 'human']);
export function shouldRecord(search) {
  try { for (const k of new URLSearchParams(search || '').keys()) if (!COSMETIC_PARAMS.has(k)) return false; } catch { return false; }
  return true;
}

// ---------- 形をととのえる（こわれた所だけ捨てて、ふつうの値に戻す） ----------
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const cleanInt = (v, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(Math.floor(v), max) : 0);
const okKey = k => typeof k === 'string' && k.length > 0 && k.length <= 64 && !BAD_KEYS.has(k);
const cleanStrList = (v, maxN) => {
  const out = [];
  if (Array.isArray(v)) for (const s of v) if (okKey(s) && !out.includes(s) && out.length < maxN) out.push(s);
  return out;
};
const cleanIso = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);

export const emptySave = () => ({ v: SAVE_VERSION, missions: {}, unlocked: { units: [], weapons: [] }, story: { chapter: 0, flags: {} } });

function cleanBest(b) {
  if (!isObj(b) || typeof b.time !== 'number' || !Number.isFinite(b.time) || b.time <= 0) return null;
  const out = { time: Math.round(Math.min(b.time, 1e6) * 10) / 10, delivered: cleanInt(b.delivered), lost: cleanInt(b.lost) };
  // v1.0.0: 残った数（survivors）。前の版の記録にはないので、ある時だけ持つ（ない記録は 0 機として比べる。こわれた扱いにはしない）
  if (b.survivors !== undefined) out.survivors = cleanInt(b.survivors, 999);
  return out;
}
function cleanMission(m) {
  if (!isObj(m)) return null;
  const wins = cleanInt(m.wins);
  const cleared = m.cleared === true || wins > 0;
  const w = Math.max(wins, cleared ? 1 : 0);
  return { cleared, plays: Math.max(cleanInt(m.plays), w), wins: w, best: cleanBest(m.best), firstClearAt: cleared ? cleanIso(m.firstClearAt) : null };
}
function cleanFlags(f) {
  const out = {};
  if (!isObj(f)) return out;
  let n = 0;
  for (const k of Object.keys(f)) {
    if (!okKey(k) || n >= 200) continue;
    const v = f[k];
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 200)) { out[k] = v; n++; }
  }
  return out;
}

/** どんな値でも、ふつうの形のセーブにして返す（元の値は変えない） */
export function sanitizeSave(raw) {
  const out = emptySave();
  if (!isObj(raw)) return out;
  if (isObj(raw.missions)) {
    let n = 0;
    for (const id of Object.keys(raw.missions)) {
      if (!okKey(id) || n >= 200) continue;
      const m = cleanMission(raw.missions[id]);
      if (m) { out.missions[id] = m; n++; }
    }
  }
  if (isObj(raw.unlocked)) { out.unlocked.units = cleanStrList(raw.unlocked.units, 64); out.unlocked.weapons = cleanStrList(raw.unlocked.weapons, 500); }
  if (isObj(raw.story)) { out.story.chapter = cleanInt(raw.story.chapter, 999); out.story.flags = cleanFlags(raw.story.flags); }
  if (TUTORIAL_STATES.has(raw.tutorial)) out.tutorial = raw.tutorial; // v1.0.0: チュートリアルの印（'done'・'skipped'）。ない時は持たない
  return out;
}

/** 読んだ文字列を調べる。{ save, broken }。broken は「元の文字列を残すべきか」（読めない・版がちがう・捨てた所がある） */
export function parseSave(text) {
  if (text == null) return { save: emptySave(), broken: false };
  let raw;
  try { raw = JSON.parse(text); } catch { return { save: emptySave(), broken: true }; }
  const save = sanitizeSave(raw);
  const broken = !isObj(raw) || raw.v !== SAVE_VERSION || JSON.stringify(save) !== JSON.stringify(raw);
  return { save, broken };
}

// ---------- 記録の足し方（純粋: 新しい値を返す） ----------
/**
 * 「一番よい」の決め方（v1.0.0 の決定）: 残った数（ロボ＋捕まっていない人間）が多いほうがよい。同じなら、かかった時間が短いほう。
 * それも同じなら届けた資材が多いほう、それも同じなら失ったロボが少ないほう。残った数のない古い記録は 0 機として比べる
 */
export function isBetterBest(next, cur) {
  if (!cur) return true;
  const ns = next.survivors || 0, cs = cur.survivors || 0;
  if (ns !== cs) return ns > cs;
  if (next.time !== cur.time) return next.time < cur.time;
  if (next.delivered !== cur.delivered) return next.delivered > cur.delivered;
  return next.lost < cur.lost;
}

/**
 * ミッション 1 回分の結果を足す。result = { id, win, time, delivered, lost, survivors, now? }。
 * 負けは plays だけ。勝てば wins・cleared・best（よければ置きかえ）・firstClearAt（最初の 1 回だけ）。
 * 返り値: { save, firstClear, newBest }。id が使えない時は何も足さない（save はそのまま）。
 */
export function applyMissionResult(save, result) {
  if (!result || !okKey(result.id)) return { save, firstClear: false, newBest: false };
  const cur = save.missions[result.id] || { cleared: false, plays: 0, wins: 0, best: null, firstClearAt: null };
  const m = { ...cur, plays: Math.min(cur.plays + 1, 1e9) };
  let firstClear = false, newBest = false;
  if (result.win === true) {
    m.wins = Math.min(cur.wins + 1, 1e9);
    if (!cur.cleared) { firstClear = true; m.cleared = true; m.firstClearAt = cleanIso(result.now) || new Date().toISOString(); }
    const best = cleanBest({ time: result.time, delivered: result.delivered, lost: result.lost, survivors: result.survivors });
    if (best && isBetterBest(best, cur.best)) { m.best = best; newBest = true; }
  }
  return { save: { ...save, missions: { ...save.missions, [result.id]: m } }, firstClear, newBest };
}

// ---------- 古い 2 つのキーを読むだけ ----------
/** 拾った武器（id → 数）。ふつうの形にして返す */
export function cleanOwned(raw) {
  const out = {};
  if (isObj(raw)) for (const id of Object.keys(raw)) if (okKey(id) && typeof raw[id] === 'number' && raw[id] > 0) out[id] = cleanInt(raw[id]);
  return out;
}
export function ownedSummary(owned) {
  const o = cleanOwned(owned);
  return { kinds: Object.keys(o).length, total: Object.values(o).reduce((a, n) => a + n, 0) };
}
/**
 * 移しかえの案（使われない関数。いまは呼ばない）。
 * 将来 v: 2 に 1 つにまとめる時の、古い 2 つのキーの行き先。inventory.weapons ← 拾った武器、loadout ← 武器庫の loadout。
 * 古いキーは、v2 の保存が成功して読み直せたあとに消す（それまでは残す）。
 */
export function planLegacyMove(ownedRaw, armoryRaw) {
  const loadout = isObj(armoryRaw) && isObj(armoryRaw.loadout) ? armoryRaw.loadout : {};
  return { inventory: { weapons: cleanOwned(ownedRaw) }, loadout };
}

// ---------- 読み書き（入れ物 io を渡せる。テストでは偽の物を渡す） ----------
/** 画面のある環境の入れ物。localStorage が使えない時は、何も起きず null / false を返す */
export function browserIo() {
  return {
    get(key) { try { return globalThis.localStorage.getItem(PREFIX + key); } catch { return null; } },
    set(key, text) { try { globalThis.localStorage.setItem(PREFIX + key, text); return true; } catch { return false; } },
    remove(key) { try { globalThis.localStorage.removeItem(PREFIX + key); return true; } catch { return false; } },
  };
}

export function createSaveStore(io = browserIo()) {
  let cache = null;
  const store = {
    /** 読む（1 回読んだら覚える。fresh: true で読み直す）。こわれていたら、元の文字列を BROKEN_KEY に 1 つだけ残して、ふつうの値に戻す */
    load(fresh = false) {
      if (cache && !fresh) return cache;
      let text = null;
      try { text = io.get(SAVE_KEY); } catch { text = null; }
      const { save, broken } = parseSave(text);
      if (broken) {
        try {
          if (typeof text === 'string' && io.get(BROKEN_KEY) == null) io.set(BROKEN_KEY, text.slice(0, 200000));
        } catch { /* 残せなくても止めない */ }
      }
      cache = save;
      if (broken) store.saveNow(); // ふつうの形に直して書き戻す（元の文字列は上で残してある）
      migrateTutorial();
      return cache;
    },
    /** 今の中身を書く。書けない時は false（ゲームは止まらず、この回の間だけ覚えている） */
    saveNow() {
      if (!cache) return false;
      let ok = false;
      try { ok = io.set(SAVE_KEY, JSON.stringify(cache)) !== false; } catch { ok = false; }
      store.lastSaveOk = ok; // R-07: 最後の保存の成否（画面が「保存できません」を出すのに使う）
      return ok;
    },
    lastSaveOk: true,
    /** ミッションの結果を記録して保存する。返り値は applyMissionResult と同じ { save, firstClear, newBest } に、保存できたか saved を足した物（R-07。書けなかった時は false） */
    recordMissionResult(result) {
      const r = applyMissionResult(store.load(), result);
      let saved = true;
      if (r.save !== cache) { cache = r.save; saved = store.saveNow(); }
      return { ...r, saved };
    },
    getMissionRecord(id) { const m = store.load().missions[id]; return m ? { ...m, best: m.best ? { ...m.best } : null } : null; },
    // --- 解放 ---
    isUnlocked(type, id) {
      const t = type === 'unit' ? 'units' : type === 'weapon' ? 'weapons' : null;
      return !!t && (START_UNLOCKED[t].includes(id) || store.load().unlocked[t].includes(id));
    },
    isUnitUnlocked(kind) { return store.isUnlocked('unit', kind); },
    isWeaponUnlocked(id) { return store.isUnlocked('weapon', id); },
    /** 解放する。新しく解放したら true（もう使えた・id が変な時は false） */
    unlockUnit(kind) { return unlock('units', kind); },
    unlockWeapon(id) { return unlock('weapons', id); },
    /** 今使える物の一覧（最初から＋解放した物。重なりなし） */
    unlockedLists() {
      const u = store.load().unlocked;
      return { units: [...new Set([...START_UNLOCKED.units, ...u.units])], weapons: [...new Set([...START_UNLOCKED.weapons, ...u.weapons])] };
    },
    // --- 物語 ---
    getStoryState() { const s = store.load().story; return { chapter: s.chapter, flags: { ...s.flags } }; },
    /** 物語の場所を直す。patch = { chapter?, flags? }。flags は混ぜる（値が null の旗は消す）。直した結果を返す */
    setStoryState(patch) {
      const cur = store.load().story, p = isObj(patch) ? patch : {};
      const flags = { ...cur.flags };
      if (isObj(p.flags)) for (const k of Object.keys(p.flags)) { if (p.flags[k] === null) delete flags[k]; else flags[k] = p.flags[k]; }
      const story = { chapter: p.chapter === undefined ? cur.chapter : p.chapter, flags };
      cache = { ...cache, story: sanitizeSave({ story }).story };
      store.saveNow();
      return store.getStoryState();
    },
    // --- チュートリアルの印（v1.0.0 から bc-save-v1 の中） ---
    /** { v: 1, state } か null（tutorial-flow.js の isMarked がそのまま読める形） */
    getTutorialMark() { const t = store.load().tutorial; return t ? { v: 1, state: t } : null; },
    /** 'done'・'skipped' を残す（ほかの値は何もしない・false）。null で消す */
    setTutorialMark(state) {
      const s = store.load();
      if (state === null) { const { tutorial, ...rest } = s; cache = rest; return store.saveNow(); }
      if (!TUTORIAL_STATES.has(state)) return false;
      cache = { ...s, tutorial: state };
      return store.saveNow();
    },
    // --- 記録を消す（v1.0.0: bc-save-v1 と、武器庫の選び（bc-armory-v1）・拾った武器（botcommander_owned_weapons）・古いチュートリアルの印。BROKEN_KEY は残す） ---
    resetSave() {
      cache = emptySave();
      for (const k of [SAVE_KEY, ARMORY_KEY_READONLY, OWNED_KEY_READONLY, LEGACY_TUTORIAL_KEY]) {
        try { io.remove(k); } catch { /* 消せなくても止めない */ }
      }
      return cache;
    },
    // --- 古い 2 つのキーを読むだけ ---
    readOwnedWeapons() { try { const t = io.get(OWNED_KEY_READONLY); return t ? cleanOwned(JSON.parse(t)) : {}; } catch { return {}; } },
  };
  /** 古いチュートリアルの印を 1 回だけ移す。セーブに印がない時だけ移し、書けたら古いキーを消す（読めない古い値は、そのまま消す） */
  function migrateTutorial() {
    let text = null;
    try { text = io.get(LEGACY_TUTORIAL_KEY); } catch { return; }
    if (text == null) return;
    let state = null;
    try { const m = JSON.parse(text); state = isObj(m) && TUTORIAL_STATES.has(m.state) ? m.state : null; } catch { state = null; }
    if (state && !cache.tutorial) {
      cache = { ...cache, tutorial: state };
      if (!store.saveNow()) return; // 書けなかった時は古いキーを残す（次に読んだ時にもう一度）
    }
    try { io.remove(LEGACY_TUTORIAL_KEY); } catch { /* 消せなくても止めない */ }
  }
  function unlock(t, id) {
    if (!okKey(id) || store.isUnlocked(t === 'units' ? 'unit' : 'weapon', id)) return false;
    const s = store.load();
    cache = { ...s, unlocked: { ...s.unlocked, [t]: [...s.unlocked[t], id] } };
    store.saveNow();
    return true;
  }
  return store;
}

// ---------- 入口（物語モード・武器庫・index.js が使う。画面のある環境の localStorage を使う） ----------
let main = null;
const st = () => main || (main = createSaveStore());
export const loadSave = fresh => st().load(fresh);
export const saveNow = () => st().saveNow();
/** R-07: 結果の画面に出す一言（保存先がいっぱい・書き込み禁止の時） */
export const SAVE_FAIL_TEXT = 'この端末では記録を残せません（この回だけ）';
export const recordMissionResult = r => st().recordMissionResult(r);
export const getMissionRecord = id => st().getMissionRecord(id);
export const isUnlocked = (type, id) => st().isUnlocked(type, id);
export const isUnitUnlocked = k => st().isUnitUnlocked(k);
export const isWeaponUnlocked = id => st().isWeaponUnlocked(id);
export const unlockUnit = k => st().unlockUnit(k);
export const unlockWeapon = id => st().unlockWeapon(id);
export const unlockedLists = () => st().unlockedLists();
export const getStoryState = () => st().getStoryState();
export const setStoryState = p => st().setStoryState(p);
export const resetSave = () => st().resetSave();
export const getTutorialMark = () => st().getTutorialMark();
export const setTutorialMark = state => st().setTutorialMark(state);
/** tutorial-flow.js の loadMark / saveMark に渡す入れ物（チュートリアルの印は bc-save-v1 の中） */
export const tutorialMarkStore = Object.freeze({ getTutorialMark, setTutorialMark });
export const readOwnedWeapons = () => st().readOwnedWeapons();
