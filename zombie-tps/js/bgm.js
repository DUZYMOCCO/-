// ゾンビストライク BGM エンジン（Web Audio で その場で つくる。音声ファイルなし）
// 各ステージ（ひる・ゆうがた・よる・ボス・タイトル）の せかいかんに あわせた BGM を なめらかに つなぐ

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- 5つの トラック ていぎ ----
export const TRACKS = {
  // 1. ひる（デイライト・ブラスト）：明るく テンポの よい ポップ・アクション。4つうち と はねる ベース
  day: {
    id: 'day',
    name: 'デイライト・ブラスト',
    sub: 'ひるの まち',
    bpm: 130,
    bars: 8,
    chords: [
      { root: 57, notes: [69, 72, 76] }, // Am
      { root: 53, notes: [65, 69, 72] }, // F
      { root: 48, notes: [60, 64, 67] }, // C
      { root: 55, notes: [67, 71, 74] }, // G
      { root: 57, notes: [69, 72, 76] }, // Am
      { root: 53, notes: [65, 69, 72] }, // F
      { root: 48, notes: [67, 72, 76] }, // C
      { root: 55, notes: [71, 74, 79] }, // G
    ],
    // リードメロディ：[step(16ぶ 0..15), MIDIノート, stepながさ]
    lead: [
      [[0, 76, 2], [2, 79, 2], [4, 76, 2], [6, 72, 2], [8, 74, 4], [12, 76, 3]],
      [[0, 74, 2], [2, 76, 2], [4, 77, 2], [6, 76, 2], [8, 74, 2], [10, 72, 2], [12, 74, 3]],
      [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 81, 2], [8, 79, 4], [12, 76, 3]],
      [[0, 74, 2], [2, 76, 2], [4, 74, 2], [6, 71, 2], [8, 72, 6]],
      // サビ
      [[0, 81, 2], [2, 79, 2], [4, 81, 2], [6, 84, 2], [8, 83, 3], [11, 81, 2], [13, 79, 2]],
      [[0, 84, 2], [2, 83, 2], [4, 81, 2], [6, 79, 2], [8, 77, 2], [10, 76, 2], [12, 77, 3]],
      [[0, 79, 2], [2, 81, 2], [4, 84, 2], [6, 86, 2], [8, 84, 6]],
      [[0, 83, 2], [2, 81, 2], [4, 79, 2], [6, 76, 2], [8, 74, 2], [10, 76, 2], [12, 79, 3]],
    ],
    bassType: 'bounce',
    arpFrom: 4,
  },

  // 2. ゆうがた（トワイライト・チェイス）：赤く染まる夕焼けの疾走感。シンセウェイヴ調の16分ローリングベースと哀愁メロディ
  sunset: {
    id: 'sunset',
    name: 'トワイライト・チェイス',
    sub: 'ゆうがたの まち',
    bpm: 134,
    bars: 8,
    chords: [
      { root: 50, notes: [62, 65, 69] }, // Dm
      { root: 46, notes: [58, 62, 65] }, // Bb
      { root: 53, notes: [65, 69, 72] }, // F
      { root: 48, notes: [60, 64, 67] }, // C
      { root: 50, notes: [62, 65, 69] }, // Dm
      { root: 46, notes: [58, 62, 65] }, // Bb
      { root: 53, notes: [65, 69, 72] }, // F
      { root: 45, notes: [57, 60, 64] }, // Am
    ],
    lead: [
      [[0, 74, 3], [4, 77, 3], [8, 81, 4], [12, 77, 3]],
      [[0, 76, 2], [2, 77, 2], [4, 76, 2], [6, 74, 2], [8, 70, 4], [12, 74, 3]],
      [[0, 72, 3], [4, 77, 3], [8, 81, 2], [10, 84, 2], [12, 81, 3]],
      [[0, 79, 3], [4, 76, 3], [8, 72, 4], [12, 74, 3]],
      // サビ
      [[0, 81, 2], [2, 84, 2], [4, 86, 3], [8, 84, 2], [10, 81, 2], [12, 84, 3]],
      [[0, 82, 2], [2, 81, 2], [4, 77, 2], [6, 74, 2], [8, 77, 2], [10, 81, 2], [12, 77, 3]],
      [[0, 84, 3], [4, 81, 2], [6, 77, 2], [8, 76, 2], [10, 77, 2], [12, 79, 3]],
      [[0, 77, 2], [2, 76, 2], [4, 74, 2], [6, 72, 2], [8, 74, 6]],
    ],
    bassType: 'rolling',
    arpFrom: 0,
  },

  // 3. よる（ミッドナイト・サバイバル）：暗闇と街灯、懐中電灯の世界。ダーク・サスペンスフルな重低音とスリリングな緊張感
  night: {
    id: 'night',
    name: 'ミッドナイト・サバイバル',
    sub: 'よるの まち',
    bpm: 124,
    bars: 8,
    chords: [
      { root: 40, notes: [52, 55, 59] }, // Em
      { root: 36, notes: [48, 52, 55] }, // C
      { root: 45, notes: [57, 60, 64] }, // Am
      { root: 47, notes: [59, 62, 66] }, // Bm
      { root: 40, notes: [52, 55, 59] }, // Em
      { root: 36, notes: [48, 52, 55] }, // C
      { root: 45, notes: [57, 60, 64] }, // Am
      { root: 47, notes: [59, 63, 66] }, // B
    ],
    lead: [
      [[0, 71, 3], [4, 72, 2], [6, 71, 2], [8, 67, 6]],
      [[0, 67, 2], [2, 71, 2], [4, 74, 3], [8, 72, 6]],
      [[0, 69, 2], [2, 72, 2], [4, 76, 3], [8, 74, 2], [10, 72, 2], [12, 69, 3]],
      [[0, 71, 4], [6, 69, 2], [8, 71, 6]],
      // 後半（緊張感アップ）
      [[0, 76, 2], [2, 79, 2], [4, 83, 2], [6, 84, 2], [8, 83, 4], [12, 79, 3]],
      [[0, 84, 2], [2, 83, 2], [4, 79, 2], [6, 76, 2], [8, 74, 6]],
      [[0, 76, 2], [2, 77, 2], [4, 76, 2], [6, 72, 2], [8, 69, 6]],
      [[0, 71, 2], [2, 75, 2], [4, 78, 2], [6, 83, 2], [8, 71, 6]],
    ],
    bassType: 'acid',
    arpFrom: 0,
  },

  // 4. ボス（ジャイアント・クライシス）：巨大ボスゾンビとの死闘！高速・重厚なメタル調ドラムとアグレッシブなバトルサウンド
  boss: {
    id: 'boss',
    name: 'ジャイアント・クライシス',
    sub: 'ボスゾンビ',
    bpm: 144,
    bars: 8,
    chords: [
      { root: 50, notes: [62, 65, 69] }, // Dm
      { root: 50, notes: [62, 65, 69] }, // Dm
      { root: 43, notes: [55, 58, 62] }, // Gm
      { root: 45, notes: [57, 61, 64] }, // A
      { root: 46, notes: [58, 62, 65] }, // Bb
      { root: 48, notes: [60, 64, 67] }, // C
      { root: 50, notes: [62, 65, 69] }, // Dm
      { root: 45, notes: [57, 61, 64, 67] }, // A7
    ],
    lead: [
      [[0, 74, 1], [2, 74, 1], [4, 77, 2], [6, 81, 2], [8, 84, 2], [10, 81, 2], [12, 77, 3]],
      [[0, 86, 2], [2, 84, 2], [4, 81, 2], [6, 77, 2], [8, 76, 2], [10, 77, 2], [12, 79, 3]],
      [[0, 79, 2], [2, 82, 2], [4, 86, 2], [6, 82, 2], [8, 79, 2], [10, 81, 2], [12, 82, 3]],
      [[0, 81, 2], [2, 85, 2], [4, 88, 2], [6, 85, 2], [8, 81, 2], [10, 77, 2], [12, 76, 3]],
      // クライマックス
      [[0, 82, 2], [2, 86, 2], [4, 89, 2], [6, 86, 2], [8, 82, 2], [10, 84, 2], [12, 86, 3]],
      [[0, 84, 2], [2, 88, 2], [4, 91, 2], [6, 88, 2], [8, 84, 2], [10, 86, 2], [12, 88, 3]],
      [[0, 86, 2], [2, 89, 2], [4, 93, 2], [6, 89, 2], [8, 86, 2], [10, 84, 2], [12, 81, 3]],
      [[0, 85, 2], [2, 88, 2], [4, 85, 2], [6, 81, 2], [8, 77, 2], [10, 76, 2], [12, 73, 4]],
    ],
    bassType: 'drive',
    arpFrom: 0,
  },

  // 5. タイトル（シティ・オブ・アンデッド）：ゲーム開始前のブリーフィング。落ち着いたクールなローファイ・ビート
  title: {
    id: 'title',
    name: 'シティ・オブ・アンデッド',
    sub: 'タイトル',
    bpm: 116,
    bars: 8,
    chords: [
      { root: 45, notes: [57, 60, 64] }, // Am
      { root: 50, notes: [57, 62, 65] }, // Dm
      { root: 41, notes: [53, 57, 60] }, // F
      { root: 40, notes: [52, 56, 59] }, // E
      { root: 45, notes: [57, 60, 64] }, // Am
      { root: 50, notes: [57, 62, 65] }, // Dm
      { root: 41, notes: [53, 57, 60] }, // F
      { root: 40, notes: [52, 56, 59] }, // E
    ],
    lead: [
      [[0, 69, 3], [4, 72, 3], [8, 76, 4], [13, 72, 2]],
      [[0, 74, 3], [4, 77, 3], [8, 76, 2], [10, 74, 2], [12, 69, 3]],
      [[0, 72, 3], [4, 76, 3], [8, 77, 4], [13, 76, 2]],
      [[0, 74, 3], [4, 71, 3], [8, 68, 6]],
      [[0, 81, 3], [4, 76, 3], [8, 72, 4], [13, 76, 2]],
      [[0, 77, 3], [4, 74, 3], [8, 69, 6]],
      [[0, 72, 3], [4, 77, 3], [8, 81, 4], [13, 79, 2]],
      [[0, 76, 3], [4, 71, 3], [8, 69, 6]],
    ],
    bassType: 'warm',
    arpFrom: 2,
  },
};

export const barSeconds = (track) => (60 / track.bpm) * 4;

/**
 * 1小節分の演奏イベントを生成する（テスト・スケジューリング両用）
 */
export function trackEvents(track, bar) {
  const beat = 60 / track.bpm;
  const step = beat / 4;
  const ch = track.chords[bar % track.chords.length];
  const ev = [];

  // ドラムパターン
  if (track.id === 'day') {
    // 4つうち + 2,4拍スネア + 裏ハット
    for (let b = 0; b < 4; b++) {
      ev.push({ kind: 'kick', t: b * beat });
      if (b === 1 || b === 3) ev.push({ kind: 'snare', t: b * beat });
      ev.push({ kind: 'hat', t: b * beat + 2 * step, open: true });
      ev.push({ kind: 'hat', t: b * beat });
    }
    if (bar % 2 === 1) ev.push({ kind: 'kick', t: 3.5 * beat });
    if (bar % 4 === 3) {
      ev.push({ kind: 'snare', t: 3 * beat + step, soft: true });
      ev.push({ kind: 'snare', t: 3 * beat + 2 * step, soft: true });
      ev.push({ kind: 'snare', t: 3 * beat + 3 * step, soft: false });
    }
  } else if (track.id === 'sunset') {
    // シンセウェイヴ：キック (0, 6, 8, 10), スネア (4, 12), 16分ハット
    ev.push({ kind: 'kick', t: 0 * step });
    ev.push({ kind: 'kick', t: 6 * step });
    ev.push({ kind: 'kick', t: 8 * step });
    ev.push({ kind: 'kick', t: 10 * step });
    ev.push({ kind: 'snare', t: 4 * step });
    ev.push({ kind: 'snare', t: 12 * step });
    for (let s = 0; s < 16; s++) {
      ev.push({ kind: 'hat', t: s * step, open: s % 4 === 2 });
    }
    if (bar % 4 === 3) {
      ev.push({ kind: 'snare', t: 14 * step, soft: true });
      ev.push({ kind: 'snare', t: 15 * step, soft: true });
    }
  } else if (track.id === 'night') {
    // サスペンス：キック (0, 7, 10), スネア (4, 12), 刻むハット
    ev.push({ kind: 'kick', t: 0 * step });
    ev.push({ kind: 'kick', t: 7 * step });
    ev.push({ kind: 'kick', t: 10 * step });
    ev.push({ kind: 'snare', t: 4 * step, clap: true });
    ev.push({ kind: 'snare', t: 12 * step, clap: true });
    for (let s = 0; s < 16; s += 2) {
      ev.push({ kind: 'hat', t: s * step, open: s === 6 || s === 14 });
    }
    if (bar >= 4) {
      for (let s = 1; s < 16; s += 2) ev.push({ kind: 'hat', t: s * step, soft: true });
    }
  } else if (track.id === 'boss') {
    // 高速バトル：高速キック + スネア + 連打フィル
    for (let b = 0; b < 4; b++) {
      ev.push({ kind: 'kick', t: b * beat });
      if (b === 1 || b === 3) ev.push({ kind: 'snare', t: b * beat });
      ev.push({ kind: 'hat', t: b * beat });
      ev.push({ kind: 'hat', t: b * beat + step });
      ev.push({ kind: 'hat', t: b * beat + 2 * step, open: true });
      ev.push({ kind: 'hat', t: b * beat + 3 * step });
    }
    ev.push({ kind: 'kick', t: 2.5 * beat });
    ev.push({ kind: 'kick', t: 3.5 * beat });
    ev.push({ kind: 'snare', t: 3 * beat + 2 * step, soft: true });
    ev.push({ kind: 'snare', t: 3 * beat + 3 * step });
  } else {
    // タイトル：落ち着いたローファイ・ビート
    ev.push({ kind: 'kick', t: 0 * step });
    ev.push({ kind: 'kick', t: 8 * step });
    ev.push({ kind: 'kick', t: 10 * step });
    ev.push({ kind: 'snare', t: 4 * step, soft: true });
    ev.push({ kind: 'snare', t: 12 * step, soft: true });
    for (let b = 0; b < 4; b++) {
      ev.push({ kind: 'hat', t: b * beat, soft: true });
      ev.push({ kind: 'hat', t: b * beat + 2 * step, open: true });
    }
  }

  // ベース
  const r = ch.root;
  if (track.bassType === 'bounce') {
    // はねるベース（ルート ↔ オクターブ ↔ 5度）
    for (let i = 0; i < 8; i++) {
      const note = i % 2 === 0 ? r : r + 12;
      ev.push({ kind: 'bass', t: i * 2 * step, note, len: step * 1.5, type: 'saw' });
    }
  } else if (track.bassType === 'rolling') {
    // 16分ローリングベース
    for (let s = 0; s < 16; s++) {
      const oct = (s % 4 === 2 || s % 4 === 3) ? 12 : 0;
      ev.push({ kind: 'bass', t: s * step, note: r + oct, len: step * 0.85, type: 'saw' });
    }
  } else if (track.bassType === 'acid') {
    // サブベース＆アシッド
    ev.push({ kind: 'bass', t: 0, note: r, len: step * 3.5, type: 'acid' });
    ev.push({ kind: 'bass', t: 4 * step, note: r + 12, len: step * 1.8, type: 'acid' });
    ev.push({ kind: 'bass', t: 7 * step, note: r, len: step * 2.5, type: 'acid' });
    ev.push({ kind: 'bass', t: 10 * step, note: r + 7, len: step * 1.8, type: 'acid' });
    ev.push({ kind: 'bass', t: 12 * step, note: r + (bar % 2 ? 10 : 12), len: step * 3.5, type: 'acid' });
  } else if (track.bassType === 'drive') {
    // ボスの疾走ドライブベース
    for (let s = 0; s < 16; s++) {
      const note = s % 8 === 6 || s % 8 === 7 ? r + 12 : r;
      ev.push({ kind: 'bass', t: s * step, note, len: step * 0.8, type: 'drive' });
    }
  } else {
    // タイトルのウォームベース
    ev.push({ kind: 'bass', t: 0, note: r, len: step * 3.5, type: 'warm' });
    ev.push({ kind: 'bass', t: 4 * step, note: r, len: step * 2.5, type: 'warm' });
    ev.push({ kind: 'bass', t: 8 * step, note: r + 7, len: step * 3.0, type: 'warm' });
    ev.push({ kind: 'bass', t: 12 * step, note: r + 12, len: step * 3.0, type: 'warm' });
  }

  // 和音 / コードスタブ
  if (track.id === 'day') {
    // 8分裏スタブ
    for (let b = 0; b < 4; b++) {
      for (const n of ch.notes) {
        ev.push({ kind: 'chord', t: b * beat + 2 * step, note: n, len: step * 1.4, type: 'bright' });
      }
    }
  } else if (track.id === 'sunset') {
    // ウォームパッド
    for (const n of ch.notes) {
      ev.push({ kind: 'chord', t: 0, note: n, len: beat * 3.9, type: 'pad' });
    }
  } else if (track.id === 'boss') {
    // 激しいスタブ (0, 3, 6, 8, 11, 14)
    for (const s of [0, 3, 6, 8, 11, 14]) {
      for (const n of ch.notes) {
        ev.push({ kind: 'chord', t: s * step, note: n, len: step * 1.5, type: 'hit' });
      }
    }
  } else if (track.id === 'night') {
    // 控えめなダークスタブ
    for (const s of [0, 6, 12]) {
      for (const n of ch.notes) {
        ev.push({ kind: 'chord', t: s * step, note: n, len: step * 2.5, type: 'dark' });
      }
    }
  } else {
    // タイトルのエレピ調和音
    for (const n of ch.notes) {
      ev.push({ kind: 'chord', t: 0, note: n, len: step * 3.5, type: 'epiano' });
      ev.push({ kind: 'chord', t: 8 * step, note: n, len: step * 3.5, type: 'epiano' });
    }
  }

  // アルペジオ
  if (bar % track.bars >= track.arpFrom) {
    const notes = [...ch.notes, ch.notes[0] + 12];
    for (let s = 0; s < 16; s++) {
      const n = notes[s % notes.length] + 12;
      ev.push({ kind: 'arp', t: s * step, note: n, len: step * 0.75, trackId: track.id });
    }
  }

  // リードメロディ
  const leadBar = track.lead[bar % track.lead.length];
  if (leadBar) {
    for (const [s, n, l] of leadBar) {
      ev.push({ kind: 'lead', t: s * step, note: n, len: l * step * 0.92, trackId: track.id });
    }
  }

  return ev.sort((a, b) => a.t - b.t);
}

// BGM の 基本レベル（マスターボリュームに対して適正なバランス）
export const BGM_VOLUME = 0.38;

/**
 * 1小節分のノートを WebAudio の AudioContext にスケジュールする
 */
export function scheduleBar(ctx, out, noise, track, bar, t0) {
  const events = trackEvents(track, bar);
  for (const e of events) {
    const t = t0 + e.t;
    if (t < ctx.currentTime - 0.05) continue; // 過去のノートはスキップ

    if (e.kind === 'kick') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const isBoss = track.id === 'boss';
      o.type = 'sine';
      o.frequency.setValueAtTime(isBoss ? 165 : 150, t);
      o.frequency.exponentialRampToValueAtTime(36, t + (isBoss ? 0.14 : 0.11));
      g.gain.setValueAtTime(isBoss ? 1.0 : 0.88, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (isBoss ? 0.34 : 0.28));
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.35);
    } else if (e.kind === 'snare' || e.kind === 'hat') {
      const s = ctx.createBufferSource();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      s.buffer = noise;
      if (e.kind === 'snare') {
        f.type = e.clap ? 'highpass' : 'bandpass';
        f.frequency.value = e.clap ? 1200 : 1800;
        f.Q.value = 1.0;
        const peak = e.soft ? 0.22 : 0.52;
        const dec = e.soft ? 0.12 : 0.17;
        g.gain.setValueAtTime(peak, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        s.connect(f).connect(g).connect(out);
        s.start(t, Math.random() * 0.5);
        s.stop(t + dec + 0.02);
        // スネアの胴鳴り（トーン成分）
        if (!e.soft) {
          const o = ctx.createOscillator();
          const og = ctx.createGain();
          o.type = 'triangle';
          o.frequency.setValueAtTime(190, t);
          o.frequency.exponentialRampToValueAtTime(95, t + 0.07);
          og.gain.setValueAtTime(0.25, t);
          og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
          o.connect(og).connect(out);
          o.start(t);
          o.stop(t + 0.1);
        }
      } else {
        // ハイハット
        f.type = 'highpass';
        f.frequency.value = track.id === 'night' ? 8200 : 7000;
        const peak = e.soft ? 0.06 : e.open ? 0.18 : 0.11;
        const dec = e.open ? 0.095 : 0.035;
        g.gain.setValueAtTime(peak, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dec);
        s.connect(f).connect(g).connect(out);
        s.start(t, Math.random() * 0.5);
        s.stop(t + dec + 0.02);
      }
    } else if (e.kind === 'bass') {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = e.type === 'warm' ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(midiToFreq(e.note), t);
      f.type = 'lowpass';
      const cut = e.type === 'acid' ? 700 : e.type === 'drive' ? 1200 : 800;
      f.frequency.setValueAtTime(cut, t);
      if (e.type === 'acid') {
        f.Q.value = 4.0;
        f.frequency.exponentialRampToValueAtTime(220, t + e.len);
      }
      const gain = e.type === 'warm' ? 0.28 : e.type === 'drive' ? 0.24 : 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.008);
      g.gain.setValueAtTime(gain, t + e.len * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + e.len);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + e.len + 0.03);
    } else if (e.kind === 'chord') {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = e.type === 'pad' || e.type === 'epiano' ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(midiToFreq(e.note), t);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(e.type === 'hit' ? 3200 : 2000, t);
      const gain = e.type === 'pad' ? 0.035 : e.type === 'hit' ? 0.065 : 0.045;
      const att = e.type === 'pad' ? 0.08 : 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + att);
      g.gain.setValueAtTime(gain, t + e.len * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + e.len);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + e.len + 0.03);
    } else if (e.kind === 'arp') {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(midiToFreq(e.note), t);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(4500, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.04, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + e.len);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + e.len + 0.02);
    } else if (e.kind === 'lead') {
      const o = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      o.type = track.id === 'sunset' || track.id === 'boss' ? 'sawtooth' : 'square';
      o.frequency.setValueAtTime(midiToFreq(e.note), t);
      o.detune.setValueAtTime(5, t); // わずかなデチューンで広がり
      f.type = 'lowpass';
      f.frequency.setValueAtTime(track.id === 'night' ? 2800 : 3800, t);
      const gain = track.id === 'boss' ? 0.095 : 0.075;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.setValueAtTime(gain, t + e.len * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + e.len);
      o.connect(f).connect(g).connect(out);
      o.start(t);
      o.stop(t + e.len + 0.03);
    }
  }
}

/**
 * BGM 出力バスの生成（ゲイン ＋ ローパスフィルター）
 */
export function makeBgmBus(ctx, dest) {
  const bus = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 20000;
  bus.connect(filter).connect(dest);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  return { bus, filter, noise, ctx };
}

/**
 * ゾンビストライク BGM プレイヤー
 */
export class BgmPlayer {
  constructor(sfx) {
    this.sfx = sfx;
    this.wanted = false;
    this.trackId = 'title';
    this.playingTrackId = null;
    this.targetTrackId = 'title';
    this.timer = null;
    this.bus = null;
    this.bar = 0;
    this.next = 0;
    this.paused = false;
    this.enabled = true;
  }

  /**
   * トラックを設定する。小節の変わり目でシームレスに切り替わる
   * immediate が true の場合は 即座に切り替える
   */
  setTrack(trackId, immediate = false) {
    const valid = TRACKS[trackId] ? trackId : 'day';
    this.targetTrackId = valid;
    if (immediate) {
      this.trackId = valid;
      this.playingTrackId = valid;
      this.next = 0;
      this.bar = 0;
    }
  }

  start(trackId) {
    if (trackId && TRACKS[trackId]) {
      this.targetTrackId = trackId;
      this.trackId = trackId;
    }
    this.wanted = true;
    this.paused = false;
    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), 40);
    }
    this.tick();
  }

  stop(immediate = false) {
    this.wanted = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const b = this.bus;
    this.bus = null;
    this.next = 0;
    this.playingTrackId = null;
    if (b && b.ctx && b.ctx.state !== 'closed') {
      try {
        const t = b.ctx.currentTime;
        b.bus.gain.setTargetAtTime(0, t, immediate ? 0.03 : 0.2);
        setTimeout(() => {
          try {
            b.bus.disconnect();
            b.filter.disconnect();
          } catch (e) { /* なし */ }
        }, 300);
      } catch (e) { /* なし */ }
    }
  }

  pause() {
    this.paused = true;
    if (this.bus && this.bus.ctx) {
      const t = this.bus.ctx.currentTime;
      this.bus.filter.frequency.setTargetAtTime(600, t, 0.08); // ポーズ時は くぐもった おと
      this.bus.bus.gain.setTargetAtTime(BGM_VOLUME * 0.35, t, 0.08);
    }
  }

  resume() {
    this.paused = false;
    if (this.bus && this.bus.ctx) {
      const t = this.bus.ctx.currentTime;
      this.bus.filter.frequency.setTargetAtTime(20000, t, 0.1);
      this.bus.bus.gain.setTargetAtTime(this.calcGain(), t, 0.1);
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this.bus && this.bus.ctx) {
      this.bus.bus.gain.setTargetAtTime(this.calcGain(), this.bus.ctx.currentTime, 0.06);
    }
  }

  calcGain() {
    if (!this.enabled || !this.sfx || this.sfx.muted) return 0;
    return BGM_VOLUME;
  }

  tick() {
    const sfx = this.sfx;
    if (!sfx || !sfx.ctx || sfx.ctx.state !== 'running') {
      this.next = 0;
      return;
    }
    const ctx = sfx.ctx;
    if (!this.wanted) return;

    if (!this.bus || this.bus.ctx !== ctx) {
      const out = sfx.comp || sfx.master || ctx.destination;
      this.bus = makeBgmBus(ctx, out);
      this.next = 0;
    }

    const targetGain = this.paused ? BGM_VOLUME * 0.35 : this.calcGain();
    this.bus.bus.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.06);

    // まだ鳴らす必要がない（ミュートまたは無効）時も小節タイマーは維持しつつ予約スキップ
    if (targetGain <= 0.0001) {
      // 無音時
    }

    if (this.next < ctx.currentTime) {
      this.next = ctx.currentTime + 0.05;
      this.bar = 0;
      this.playingTrackId = this.targetTrackId;
    }

    while (this.next < ctx.currentTime + 0.35) {
      // 4小節境界またはトラック変更要求があればスムーズに切り替え
      if (this.bar % 4 === 0 && this.playingTrackId !== this.targetTrackId) {
        this.playingTrackId = this.targetTrackId;
        this.bar = 0;
      }
      const track = TRACKS[this.playingTrackId || this.targetTrackId] || TRACKS.day;
      if (targetGain > 0.0001) {
        scheduleBar(ctx, this.bus.bus, this.bus.noise, track, this.bar, this.next);
      }
      this.next += barSeconds(track);
      this.bar++;
    }
  }
}
