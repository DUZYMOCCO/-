// Dialogue definitions are loaded defensively so an optional content pack cannot stop the game.
const EFFECTS = new Set(['attack','attack_forever','relation','give_money','take_money','give_item','take_item','join_squad','follow','leave','inspect','wanted','set_flag','line']);
const TESTS = new Set(['faction','tag','relation','money','food','sneaking','ko','wanted','squad_size','squad_ko','speaker_ko','item_tag','flag','hour','squad_race_checked','squad_race']);

function normalize(input) { return Array.isArray(input) ? input : Array.isArray(input?.dialogues) ? input.dialogues : []; }

export function validateDialogues(defs) {
  const warnings = [], errors = [];
  const dialogues = normalize(defs);
  if (!Array.isArray(defs) && !Array.isArray(defs?.dialogues)) errors.push('dialogues must be an array or {dialogues:[]}');
  const ids = new Set();
  const valid = [];
  for (const raw of dialogues) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !raw.id || !['ambient','invite','pursue','declare'].includes(raw.kind) || !Array.isArray(raw.lines) || !raw.lines.length) {
      warnings.push(`Skipped malformed dialogue definition: ${raw?.id ?? '(no id)'}`); continue;
    }
    if (ids.has(raw.id)) warnings.push(`Duplicate dialogue id: ${raw.id} (later definition wins)`);
    ids.add(raw.id);
    const item = structuredClone(raw);
    let badTest = false;
    const scanConditions = list => (list || []).forEach(condition => { if (!TESTS.has(condition?.test)) { warnings.push(`${item.id}: unknown condition test ${condition?.test}`); badTest = true; } });
    scanConditions(item.conditions);
    for (const node of item.nodes || []) for (const option of node.options || []) scanConditions(option.conditions);
    for (const option of item.options || []) scanConditions(option.conditions);
    if (badTest) continue;
    const sanitize = effects => (effects || []).filter(effect => {
      if (EFFECTS.has(effect?.do)) return true;
      warnings.push(`${item.id}: unknown effect ${effect?.do}`); return false;
    });
    item.onEscape = sanitize(item.onEscape); item.onIgnore = sanitize(item.onIgnore); item.onFinish = sanitize(item.onFinish);
    for (const option of item.options || []) option.effects = sanitize(option.effects);
    for (const node of item.nodes || []) for (const option of node.options || []) option.effects = sanitize(option.effects);
    valid.push(item);
  }
  const byId = new Map(); for (const item of valid) byId.set(item.id, item);
  return { ok: errors.length === 0, warnings, errors, dialogues: [...byId.values()] };
}

export function mergeDialogueSources(...sources) {
  const combined = [];
  for (const source of sources) combined.push(...normalize(source));
  const result = validateDialogues(combined);
  return { ...result, dialogues: result.dialogues };
}

export function loadDialogues(...sources) { return mergeDialogueSources(...sources); }
