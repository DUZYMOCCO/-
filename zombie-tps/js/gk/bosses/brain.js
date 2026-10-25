// v0.17.0: ガンキック ボスの あたま（three.js なし → テスト できる・あとから よむ）
// ボスごとの ファイル js/gk/bosses/<id>.js は BOSS = { id, look, moves:[…], … } を だす。うごかすのは rt.js
// わざは ぜんぶ「よこく（tele）→ こうげき（act）→ やすみ」。よこくは 0.8びょう いじょう・1かいの いたさは 25 まで（7さい むけ）
export const RULE = { teleMin: 0.8, dmgMax: 25, fxMax: 30, rest: 0.7, gap: 1.2 };
// わざの しゅるい
//  shots   : たまを n こ（gap びょう おき・spread どの おうぎ）。speed・dmg
//  line    : まっすぐの おび（len×w）。dash なら そこを つっこむ（stun: かべで きぜつ）・でなければ その ばで つく
//  circles : まるい よこく n こ（at: player / around / self・seq びょう ずつ じゅんばん）→ dmg。after: puddle（さんの みずたまり）/ ice（こおり）
//  cone    : まえの おうぎ（ながさ len・angle）に dur びょう（tick びょう ごとに dmg）。range は どの わざも [つかう きょりの min, max]
//  summon  : たまご → てき（kind）を n たい（cap まで）
//  clones  : にせもの（みため look・よわい）を n たい
//  pounce  : きえて（hide びょう）→ プレイヤーの ところに まるい よこく → とびだす（r・dmg）
//  wave    : ジャンプ（よこく）→ ちゃくちで わが ひろがる（speed・R・dmg）。ジャンプして いれば あたらない
//  summon / pounce に via:'doors' → へやの ドアを つかう（ステージ18）
// phases: [{ at: 1, moves }, { at: 0.5, moves, msg, color }] → HP が at いかに なると その わざに かわる（さいごの ボス）
export const KINDS = ['shots', 'line', 'circles', 'cone', 'summon', 'clones', 'pounce', 'wave'];
export const allMoves = (B) => (B.phases ? B.phases.flatMap((p) => p.moves) : B.moves);
// HP の わりあい → だんかい（phases の なかで at いかの いちばん あと）
export function bossPhase(B, frac) {
  if (!B.phases) return 0;
  let k = 0; B.phases.forEach((p, i) => { if (frac <= p.at) k = i; });
  return k;
}
export const phaseMoves = (B, k) => (B.phases ? B.phases[k].moves : B.moves);

// こうげきの ながさ（びょう）
export function actTime(m) {
  switch (m.kind) {
    case 'shots': return (m.gap || 0) * ((m.n || 1) - 1) + 0.25;
    case 'line': return m.dash ? m.len / m.speed + 0.1 : 0.35;
    case 'circles': return (m.seq || 0) * ((m.n || 1) - 1) + 0.35;
    case 'cone': return m.dur;
    case 'pounce': return 0.45;
    case 'wave': return m.R / m.speed + 0.1;
    default: return 0.3;
  }
}
// よこくの ながさ（pounce は きえて いる じかんも）
export const teleTime = (m) => m.tele + (m.kind === 'pounce' ? m.hide || 0 : 0);
// 1かいの いちばん おおきい いたさ
export const moveDmg = (m) => m.dmg || 0;

// あたらしい あたま
export function brainNew(boss) {
  const cd = {};
  for (const m of allMoves(boss)) cd[m.id] = m.cd0 ?? 1.5 + m.cd * 0.3;
  return { phase: 'idle', t: 0, move: null, cd, gap: 1.5, n: 0, ph: 0 };
}
// クールダウンを へらす（まいフレーム）
export function brainCool(st, dt) {
  for (const k in st.cd) st.cd[k] -= dt;
  if (st.phase === 'idle') st.gap -= dt;
}
// つぎの わざ（つかえる もの・きょりが あう もの・じゅんばんに すこし ばらつき）
export function pickMove(boss, st, dist, r = Math.random) {
  if (st.phase !== 'idle' || st.gap > 0) return null;
  const ok = phaseMoves(boss, st.ph || 0).filter((m) => st.cd[m.id] <= 0 && dist >= (m.range ? m.range[0] : 0) && dist <= (m.range ? m.range[1] : 99) && (!m.when || m.when(st)));
  if (!ok.length) return null;
  return ok[Math.min(ok.length - 1, Math.floor(r() * ok.length))];
}
export function brainStart(st, m) { st.phase = 'tele'; st.t = 0; st.move = m; st.cd[m.id] = m.cd; st.n++; }
// すすめる。かわった ときは あたらしい phase（'act' / 'rest' / 'idle'）
export function brainStep(st, dt) {
  if (st.phase === 'idle') return null;
  st.t += dt;
  const m = st.move;
  if (st.phase === 'tele' && st.t >= teleTime(m)) { st.phase = 'act'; st.t = 0; return 'act'; }
  if (st.phase === 'act' && st.t >= (st.actLen ?? actTime(m))) { st.phase = 'rest'; st.t = 0; st.actLen = null; return 'rest'; }
  if (st.phase === 'rest' && st.t >= (m.rest ?? RULE.rest)) { st.phase = 'idle'; st.t = 0; st.move = null; st.gap = RULE.gap; return 'idle'; }
  return null;
}

// ---- かたち（あたり）----
export const inCircle = (x, z, cx, cz, r) => Math.hypot(x - cx, z - cz) <= r;
// おび: (x0,z0) から (ux,uz) むきに len・はば w
export function inLine(x, z, x0, z0, ux, uz, len, w) {
  const dx = x - x0, dz = z - z0, a = dx * ux + dz * uz, c = Math.abs(dx * uz - dz * ux);
  return a >= -0.3 && a <= len && c <= w / 2;
}
// おうぎ: (x0,z0) から (ux,uz) むき・range・angle（ぜんたいの かくど・ど）
export function inCone(x, z, x0, z0, ux, uz, range, angle) {
  const dx = x - x0, dz = z - z0, d = Math.hypot(dx, dz);
  if (d > range) return false; if (d < 0.5) return true;
  return (dx * ux + dz * uz) / d >= Math.cos((angle / 2) * Math.PI / 180);
}
// まるい よこくの ばしょ（at: player = プレイヤーの ところ（seq なら すこし ずつ ずれる）・around = プレイヤーの まわり・self = じぶんの まわり）
export function circleSpots(m, bx, bz, px, pz, r = Math.random) {
  const n = m.n || 1, out = [];
  for (let i = 0; i < n; i++) {
    if (m.at === 'self') { out.push([bx, bz]); continue; }
    if (m.at === 'around' && n > 1) {
      const a = (i / n) * Math.PI * 2 + r() * 0.8, d = (m.spread ?? 3.5) * (0.6 + r() * 0.5);
      out.push([px + Math.cos(a) * d, pz + Math.sin(a) * d]); continue;
    }
    const s = i === 0 ? 0 : (m.spread ?? 1.5);
    out.push([px + (r() - 0.5) * 2 * s, pz + (r() - 0.5) * 2 * s]);
  }
  return out;
}
// おうぎの たま（spread ど を n こに わける）
export function fanDirs(ux, uz, n, spread) {
  const out = [], a0 = Math.atan2(uz, ux);
  for (let i = 0; i < n; i++) {
    const a = a0 + (n > 1 ? (i / (n - 1) - 0.5) * spread * Math.PI / 180 : 0);
    out.push([Math.cos(a), Math.sin(a)]);
  }
  return out;
}

// ---- けんさ（テスト・ボスの ファイルを つくる とき）----
export function checkBoss(B) {
  const errs = [];
  if (!B || !B.id || !Array.isArray(allMoves(B)) || !allMoves(B).length) return ['BOSS が ない'];
  for (const ms of B.phases ? B.phases.map((p) => p.moves) : [B.moves]) if (ms.length < 2 || ms.length > 3) errs.push('わざは 2〜3こ');
  if (B.phases && !(B.phases[0].at === 1 && B.phases.every((p, i) => i === 0 || p.at < B.phases[i - 1].at))) errs.push('phases の at は 1 から へっていく');
  for (const m of allMoves(B)) {
    if (!KINDS.includes(m.kind)) errs.push(`${m.id}: しゅるい ${m.kind}`);
    if (!(m.tele >= RULE.teleMin)) errs.push(`${m.id}: よこく ${m.tele} < ${RULE.teleMin}`);
    if (moveDmg(m) > RULE.dmgMax) errs.push(`${m.id}: いたさ ${m.dmg} > ${RULE.dmgMax}`);
    if (!(m.cd > 0)) errs.push(`${m.id}: cd`);
    if (!(actTime(m) > 0 && actTime(m) < 8)) errs.push(`${m.id}: こうげきの じかん ${actTime(m)}`);
    if (m.kind === 'shots' && (m.n || 1) > 8) errs.push(`${m.id}: たまが おおい`);
    if (m.kind === 'circles' && (m.n || 1) > 6) errs.push(`${m.id}: まるが おおい`);
    if ((m.kind === 'summon' || m.kind === 'clones') && !(m.cap >= 1 && m.cap <= 6)) errs.push(`${m.id}: cap 1〜6`);
    if (m.range && !(Array.isArray(m.range) && m.range.length === 2)) errs.push(`${m.id}: range は [min, max]`);
    if ((m.kind === 'cone' || m.kind === 'line') && !(m.len > 0)) errs.push(`${m.id}: len`);
  }
  if (!B.look || !B.look.colors) errs.push('look.colors が ない');
  for (const p of (B.look && B.look.parts) || []) if (!['head', 'body', 'inner'].includes(p[0]) || p.length < 8) errs.push('look.parts の かたち ' + JSON.stringify(p));
  return errs;
}
