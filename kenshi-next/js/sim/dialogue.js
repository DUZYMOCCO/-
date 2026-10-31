/**
 * Deterministic, DOM-free dialogue simulation.
 *
 * API: createDialogueSystem({seed, defs, hooks}) returns tick(dt, world),
 * events, bubbles(), openChoice(id), choose(id), cancelChoice(), isPaused(),
 * npcIntent(id), serialize() and restore(save). defaultVision is optional;
 * the host owns vision and supplies seesPlayer or canSee(playerId).
 *
 * World: {timeSec, tick?, player:{id,pos:{x,z},squad,money,food,items,
 * sneaking,ko,wanted,factionRelations}, npcs:[{id,name,pos,home,faction,
 * tags,ko,seesPlayer,canSee,group,groupLead,role}]}. Only group leaders initiate
 * (a definition with squadLeadOk also lets a patrol squad's lead member start it).
 * Definitions are an array or {dialogues:[]}. Each has id, kind (ambient,
 * invite, pursue, declare), lines [{text,speaker?}], speakerTags, faction,
 * priority, triggerDist, chancePerm, chanceTemp, repeat (VSHORT, SHORT,
 * MEDIUM, LONG, WEEK, ONCE), and AND conditions. Tests are faction, tag,
 * relation, money, food, sneaking, ko, wanted, squad_size, squad_ko,
 * speaker_ko, item_tag, flag and hour; use eq/gte/lt, or start/end for hour.
 * Text can be an array and supports {name}, {money}, {faction}, {food},
 * {wanted}. A speaker is an NPC id or tag; absent/me means the initiator.
 * Invite uses maxCalls, ignoreSec, ignoreCooldown and onIgnore. Pursuit uses
 * pursuit {giveUpDist,giveUpSec,lostSightSec,leashDist,forever}, onEscape.
 * Declare uses onFinish. Effects are {do,...}: attack, attack_forever,
 * relation, give_money, take_money, give_item, take_item, join_squad, follow,
 * leave, inspect, wanted, set_flag and line. Options have id, text,
 * conditions, effects and optional next node id; nodes have id,text,options.
 * inspect has clean/contraband node ids. Effects are handed to the host.
 *
 * Events: bubble (bubble fields), bubble_end {id}, choice_open (choice
 * fields), choice_close {speakerId}, effect {do,speakerId,...},
 * pursuit_start/pursuit_giveup/escaped {speakerId}, history
 * {tick,timeSec,speakerId,speakerName,kind,text}. Events reset on tick.
 * While a choice is open tick clears events but advances no encounter or
 * bubble timers; the host must also pause its own simulation clock.
 */

// Constants
const REPEAT_SECONDS = { VSHORT: 1200, SHORT: 7200, MEDIUM: 21600, LONG: 172800, WEEK: 604800, ONCE: Infinity };
const TRIGGER_DISTANCE = { ambient: 12, invite: 12, pursue: 20, declare: 20 };
const PURSUIT_DEFAULTS = { giveUpDist: 60, giveUpSec: 40, lostSightSec: 8, leashDist: 120 };
const HEARING_DISTANCE = 25;
const BAR_GAP = 0.35;

/** Distance in the horizontal plane. */
function distance(first, second) {
  return Math.hypot((first?.x || 0) - (second?.x || 0), (first?.z || 0) - (second?.z || 0));
}

// Seeded RNG helpers
/** Hash a stable identifier into a 32-bit seed. */
function hash(value) {
  let result = 2166136261;
  for (const character of String(value)) {
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  }
  return result >>> 0;
}

/** Produce a reproducible uniform value for a seed. */
function randomFromSeed(seed) {
  let value = (seed + 0x6d2b79f5) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

/**
 * Test a 120-degree forward cone. Facing 0 points along +z, PI/2 along +x.
 * Pass dt and a mutable state object per observer/target to accumulate notice;
 * detection requires 0.8 seconds continuously in view, including sneaking.
 * opts may override distance, sneakDistance, coneRadians and noticeSec.
 * @param {object} npc Observer with pos and facing in radians.
 * @param {object} player Target with pos and optional sneaking.
 * @param {object} opts Timing, state and optional vision settings.
 * @returns {boolean} Whether the target has been noticed.
 */
export function defaultVision(npc, player, opts = {}) {
  const dx = player.pos.x - npc.pos.x;
  const dz = player.pos.z - npc.pos.z;
  const range = Math.hypot(dx, dz);
  const facing = npc.facing ?? 0;
  const dot = range ? (dx * Math.sin(facing) + dz * Math.cos(facing)) / range : 1;
  const limit = player.sneaking ? (opts.sneakDistance ?? 6) : (opts.distance ?? 25);
  const visible = range <= limit && dot >= Math.cos((opts.coneRadians ?? (2 * Math.PI / 3)) / 2) - 1e-12;
  const state = opts.state ?? npc;
  state.notice = visible ? (state.notice ?? 0) + (opts.dt ?? 0) : 0;
  return visible && state.notice + 1e-12 >= (opts.noticeSec ?? 0.8);
}

// Condition evaluation: each test returns the value compared by the evaluator.
const CONDITION_TESTS = {
  faction: (condition, npc) => npc.faction,
  tag: (condition, npc) => (npc.tags || []).includes(condition.value),
  relation: (condition, npc, world) => world.player.factionRelations?.[condition.faction || npc.faction] || 0,
  money: (condition, npc, world) => world.player.money,
  food: (condition, npc, world) => world.player.food,
  sneaking: (condition, npc, world) => world.player.sneaking,
  ko: (condition, npc, world) => world.player.ko,
  wanted: (condition, npc, world, flags, wanted) => world.player.wanted ?? wanted,
  squad_size: (condition, npc, world) => (world.player.squad || []).length,
  squad_ko: (condition, npc, world) => (world.player.squad || []).some(member => member.ko),
  squad_race_checked: (condition, npc) => !!npc.squadRaceChecked,
  squad_race: (condition, npc, world) => (world.player.squad || []).some(member => member.race === condition.value),
  speaker_ko: (condition, npc) => !!npc.ko,
  item_tag: (condition, npc, world) => (world.player.items || []).some(item => item.id === condition.value || (item.tags || []).includes(condition.value)),
  flag: (condition, npc, world, flags) => flags[condition.name] ?? false,
  hour: (condition, npc, world) => {
    const hour = ((world.timeSec / 3600) % 24 + 24) % 24;
    return condition.start <= condition.end ? hour >= condition.start && hour < condition.end : hour >= condition.start || hour < condition.end;
  }
};

/** Evaluate all conditions against the adapter snapshot. */
function matchesConditions(conditions, npc, world, flags, wanted) {
  return (conditions || []).every(condition => {
    const test = CONDITION_TESTS[condition.test];
    if (!test) return false;
    const value = test(condition, npc, world, flags, wanted);
    if (condition.test === 'hour') return value;
    return (condition.eq === undefined || value === condition.eq) &&
      (condition.gte === undefined || value >= condition.gte) &&
      (condition.lt === undefined || value < condition.lt);
  });
}

/**
 * Create a seeded dialogue runtime; the host supplies snapshots and effects.
 * @param {object} config Seed, definitions and optional applyEffect hook.
 * @returns {object} Dialogue runtime API described in the module header.
 */
export function createDialogueSystem({ seed = 1, defs = [], hooks = {} } = {}) {
  const definitions = Array.isArray(defs) ? defs : defs.dialogues;
  let events = [];
  let active = {};
  let cool = {};
  let ignored = {};
  let flags = {};
  let wanted = 0;
  let paused = null;
  let world = null;
  let check = {};
  let serial = 0;
  let draw = 0;
  let intents = {};
  let transient = [];

  /** Emit an event and forward effects to the host once. */
  function emit(event) {
    events.push(event);
    if (event.type === 'effect') hooks.applyEffect?.(event, { world, encounter: active[event.speakerId] });
  }

  function random() {
    return randomFromSeed(hash(`${seed}:${draw++}`));
  }

  function findNpc(id) {
    return world?.npcs.find(npc => npc.id === id);
  }

  function seesPlayer(npc) {
    return typeof npc.canSee === 'function' ? !!npc.canSee(world.player.id) : !!npc.seesPlayer;
  }

  function conditionsMatch(conditions, npc) {
    return matchesConditions(conditions, npc, world, flags, wanted);
  }

  // Text selection and word swaps
  /** Select a seeded text variant and substitute adapter values. */
  function selectText(value, npc) {
    const selected = Array.isArray(value) ? value[Math.floor(random() * value.length)] : value;
    const words = { name: npc.name || npc.id, faction: npc.faction, ...world.player };
    return String(selected || '').replace(/\{(name|money|faction|food|wanted)\}/g, (match, key) => words[key] ?? '');
  }

  /** Show a line, recording a history entry when it is audible. */
  function showBubble(encounter, line, interactive = false) {
    const npc = findNpc(encounter.npcId);
    if (!npc) return null;
    const speaker = line.speaker && line.speaker !== 'me'
      ? findNpc(line.speaker) || world.npcs.find(candidate => (candidate.tags || []).includes(line.speaker)) || npc
      : npc;
    const text = selectText(line.text, npc);
    const ttl = Math.max(3, Math.min(7, 3 + [...text].length * 0.1));
    const bubble = { id: `b${++serial}`, speakerId: speaker.id, text, kind: encounter.def.kind, interactive, ttl, priority: encounter.def.priority || 0 };
    encounter.bubble = bubble;
    emit({ type: 'bubble', ...bubble });
    if (distance(speaker.pos, world.player.pos) <= HEARING_DISTANCE) {
      emit({ type: 'history', tick: world.tick ?? Math.floor(world.timeSec * 30), timeSec: world.timeSec, speakerId: speaker.id, speakerName: speaker.name || speaker.id, kind: encounter.def.kind, text: `【${speaker.name || speaker.id}】${text}` });
    }
    return bubble;
  }

  // Effects
  /** Emit host effects; line effects survive the encounter that created them. */
  function applyEffects(effects, encounter) {
    for (const effect of effects || []) {
      const action = { ...effect, speakerId: encounter.npcId };
      if (action.faction === 'me') action.faction = findNpc(encounter.npcId)?.faction;
      if (action.do === 'take_money') action.amount = Math.min(action.amount || 0, world.player.money || 0);
      if (action.do === 'set_flag') flags[action.name] = action.value ?? true;
      if (action.do === 'wanted') wanted = (world.player.wanted ?? wanted) + (action.delta || 0);
      if (action.do === 'line') {
        const previous = encounter.bubble;
        const bubble = showBubble(encounter, { text: action.text });
        if (bubble) transient.push(bubble);
        encounter.bubble = previous;
        continue;
      }
      emit({ type: 'effect', ...action });
    }
  }

  // Encounter lifecycle: trigger, approach, speaking, waiting, pursuit, leave.
  /** End an encounter and apply escape or ignore consequences. */
  function endEncounter(encounter, reason) {
    if (encounter.bubble) emit({ type: 'bubble_end', id: encounter.bubble.id });
    delete active[encounter.npcId];
    if (reason === 'escape') {
      emit({ type: 'escaped', speakerId: encounter.npcId });
      emit({ type: 'pursuit_giveup', speakerId: encounter.npcId });
      applyEffects(encounter.def.onEscape, encounter);
      intents[encounter.npcId] = { mode: 'return', target: findNpc(encounter.npcId)?.home, speed: 2 };
    } else if (reason === 'ignore') {
      ignored[encounter.npcId] = world.timeSec + (encounter.def.ignoreCooldown ?? 7200);
      applyEffects(encounter.def.onIgnore || [{ do: 'line', text: '聞こえなかったか' }, { do: 'leave' }], encounter);
      intents[encounter.npcId] = { mode: 'return', target: findNpc(encounter.npcId)?.home, speed: 2 };
    } else if (reason === 'done' && ['invite','pursue'].includes(encounter.def.kind)) {
      intents[encounter.npcId] = { mode: 'return', target: findNpc(encounter.npcId)?.home, speed: 2 };
    }
  }

  /** Start the highest-priority eligible encounter. */
  function startEncounter(npc, definition) {
    const encounter = { npcId: npc.id, def: definition, elapsed: 0, lost: 0, calls: 0, index: 0, bubble: null, gap: 0 };
    active[npc.id] = encounter;
    cool[`${npc.id}:${definition.id}`] = world.timeSec;
    intents[npc.id] = { mode: definition.kind === 'pursue' ? 'pursue' : definition.kind === 'invite' ? 'approach' : 'idle', target: world.player.pos, speed: 3 };
    if (definition.kind === 'pursue') emit({ type: 'pursuit_start', speakerId: npc.id });
    showBubble(encounter, definition.lines[0], definition.kind === 'invite' || definition.kind === 'pursue' || (definition.kind === 'declare' && !!definition.options?.length));
    encounter.calls++;
  }

  /** Advance one encounter and its current bubble. */
  function advanceEncounter(encounter, npc, dt) {
    const definition = encounter.def;
    encounter.elapsed += dt;
    encounter.lost = seesPlayer(npc) ? 0 : encounter.lost + dt;
    if (encounter.bubble) {
      encounter.bubble.ttl -= dt;
      // Dialogue between NPCs starts the next line shortly before the first
      // bubble disappears, so both remain readable during the overlap.
      const nextLine = definition.lines[encounter.index + 1];
      if (definition.kind === 'ambient' && nextLine && (nextLine.speaker || definition.lines[encounter.index].speaker) && encounter.bubble.ttl <= BAR_GAP) {
        transient.push(encounter.bubble);
        encounter.bubble = null;
        encounter.index++;
        showBubble(encounter, nextLine);
        return;
      }
      if (encounter.bubble.ttl <= 0) {
        emit({ type: 'bubble_end', id: encounter.bubble.id });
        encounter.bubble = null;
      }
    }
    if (definition.kind === 'pursue') {
      const limits = { ...PURSUIT_DEFAULTS, ...definition.pursuit };
      if (!limits.forever && (distance(npc.pos, world.player.pos) > limits.giveUpDist || encounter.elapsed > limits.giveUpSec || encounter.lost > limits.lostSightSec || distance(npc.pos, npc.home || npc.pos) > limits.leashDist)) {
        endEncounter(encounter, 'escape');
        return;
      }
      if (!encounter.bubble) showBubble(encounter, definition.lines[0], true);
      intents[npc.id] = { mode: 'pursue', target: { ...world.player.pos }, speed: 3.5 };
    } else if (definition.kind === 'invite') {
      if (encounter.elapsed >= (definition.ignoreSec ?? 12)) {
        endEncounter(encounter, 'ignore');
        return;
      }
      if (!encounter.bubble && encounter.calls < (definition.maxCalls ?? 2)) {
        showBubble(encounter, definition.lines[0], true);
        encounter.calls++;
      }
      intents[npc.id] = { mode: 'approach', target: { ...world.player.pos }, speed: 2.5 };
    } else if (!encounter.bubble) {
      encounter.index++;
      if (encounter.index < definition.lines.length) {
        showBubble(encounter, definition.lines[encounter.index], definition.kind === 'declare' && !!definition.options?.length);
      } else {
        if (definition.kind === 'declare') applyEffects(definition.onFinish || [{ do: 'attack' }], encounter);
        endEncounter(encounter, 'done');
      }
    }
  }

  /** Find eligible definitions, respecting per-NPC checks and cooldowns. */
  function triggerEncounter(npc) {
    if (npc.ko || npc.busy || !seesPlayer(npc) || world.timeSec < (ignored[npc.id] ?? -Infinity) || (check[npc.id] ?? -Infinity) > world.timeSec) return;
    check[npc.id] = world.timeSec + 1;
    const candidates = definitions.filter(definition =>
      (!npc.group || npc.role === 'leader' || (definition.squadLeadOk && npc.groupLead)) &&
      distance(npc.pos, world.player.pos) <= (definition.triggerDist ?? TRIGGER_DISTANCE[definition.kind]) &&
      (definition.speakerTags || []).every(tag => (npc.tags || []).includes(tag)) &&
      (!definition.faction || definition.faction === npc.faction) &&
      conditionsMatch(definition.conditions, npc) &&
      randomFromSeed(hash(`${seed}:${npc.id}:${definition.id}`)) < (definition.chancePerm ?? 1) &&
      (cool[`${npc.id}:${definition.id}`] === undefined || world.timeSec - cool[`${npc.id}:${definition.id}`] >= (REPEAT_SECONDS[definition.repeat] ?? 7200)) &&
      random() < (definition.chanceTemp ?? 1)
    );
    candidates.sort((first, second) => (second.priority || 0) - (first.priority || 0) || hash(`${seed}:${npc.id}:${first.id}`) - hash(`${seed}:${npc.id}:${second.id}`));
    const definition = candidates[0];
    const approaching = Object.values(active).filter(encounter => ['invite', 'pursue'].includes(encounter.def.kind)).length;
    if (definition && (!['invite', 'pursue'].includes(definition.kind) || approaching < 3)) startEncounter(npc, definition);
  }

  /** Explicitly start a known definition for the host's visual QA entry point. */
  function debugStart(definitionId, npcId, snapshot) {
    world = snapshot;
    const npc = findNpc(npcId);
    const definition = definitions.find(candidate => candidate.id === definitionId);
    if (!npc || !definition) return null;
    startEncounter(npc, definition);
    return encounterBubble(npcId);
  }

  function encounterBubble(npcId) { return active[npcId]?.bubble || null; }

  /** Advance the runtime; while paused no timers are advanced. */
  function tick(dt, snapshot) {
    events = [];
    world = snapshot;
    if (paused) return events;
    transient = transient.filter(bubble => {
      bubble.ttl -= dt;
      if (bubble.ttl > 0) return true;
      emit({ type: 'bubble_end', id: bubble.id });
      return false;
    });
    const present = new Set();
    for (const npc of world.npcs) {
      present.add(npc.id);
      const encounter = active[npc.id];
      if (encounter) advanceEncounter(encounter, npc, dt);
      else triggerEncounter(npc);
    }
    // An encounter whose speaker left the world (died, carried, joined the
    // squad, or moved out of the host's dialogue radius) must not linger and
    // block the approacher cap (max 3) forever.
    for (const encounter of Object.values(active)) {
      if (!present.has(encounter.npcId)) { endEncounter(encounter, 'gone'); delete intents[encounter.npcId]; }
    }
    return events;
  }

  // Choice panel
  /** Build a choice view with only currently valid options. */
  function choiceView(encounter, node) {
    const npc = findNpc(encounter.npcId);
    return { encounterId: encounter.npcId, speakerId: encounter.npcId, speakerName: npc?.name || encounter.npcId, faction: npc?.faction, lines: [selectText(node.text, npc)], options: (node.options || []).filter(option => conditionsMatch(option.conditions, npc)).map(option => ({ id: option.id, text: selectText(option.text, npc) })) };
  }

  /** Open an interactive bubble and pause encounter timers. */
  function openChoice(id) {
    const encounter = Object.values(active).find(candidate => candidate.bubble?.id === id && candidate.bubble.interactive);
    if (!encounter) return null;
    paused = { npcId: encounter.npcId, node: '$root' };
    const view = choiceView(encounter, { text: encounter.def.choiceText || encounter.def.lines[0].text, options: encounter.def.options });
    emit({ type: 'choice_open', ...view });
    return view;
  }

  /** Apply an eligible option and advance to its next node or close. */
  function choose(id) {
    if (!paused) return null;
    const encounter = active[paused.npcId];
    const node = paused.node === '$root' ? { options: encounter.def.options } : encounter.def.nodes?.find(candidate => candidate.id === paused.node);
    const option = (node?.options || []).find(candidate => candidate.id === id && conditionsMatch(candidate.conditions, findNpc(encounter.npcId)));
    if (!option) return null;
    applyEffects(option.effects, encounter);
    let next = option.next;
    const inspect = option.effects?.find(effect => effect.do === 'inspect');
    if (inspect) next = (world.player.items || []).some(item => (item.tags || []).includes('contraband')) ? inspect.contraband : inspect.clean;
    const nextNode = encounter.def.nodes?.find(candidate => candidate.id === next);
    if (nextNode) {
      paused.node = next;
      return choiceView(encounter, nextNode);
    }
    paused = null;
    emit({ type: 'choice_close', speakerId: encounter.npcId });
    endEncounter(encounter, 'done');
    return null;
  }

  /** Cancel a choice and apply the encounter's ignore or escape consequences. */
  function cancelChoice() {
    if (!paused) return;
    const encounter = active[paused.npcId];
    paused = null;
    emit({ type: 'choice_close', speakerId: encounter.npcId });
    endEncounter(encounter, encounter.def.kind === 'pursue' ? 'escape' : 'ignore');
  }

  /** Close a choice after a host action such as opening a merchant panel. */
  function finishChoice() {
    if (!paused) return;
    const encounter = active[paused.npcId];
    paused = null;
    emit({ type: 'choice_close', speakerId: encounter.npcId });
    endEncounter(encounter, 'done');
  }

  // NPC intents and serialization
  /** Player-initiated talk (long-press 「話す」): start the best ambient or
   *  invite definition for this NPC regardless of trigger distance/sight. */
  function talkTo(npcId, snapshot) {
    world = snapshot;
    const npc = findNpc(npcId);
    if (!npc || npc.ko || paused) return null;
    if (active[npcId]) return active[npcId].bubble || null;
    const pick = definitions.filter(definition => ['invite', 'ambient'].includes(definition.kind) &&
      (definition.speakerTags || []).every(tag => (npc.tags || []).includes(tag)) &&
      (!definition.faction || definition.faction === npc.faction) && conditionsMatch(definition.conditions, npc))
      .sort((a, b) => (b.kind === 'invite') - (a.kind === 'invite') || (b.priority || 0) - (a.priority || 0) || hash(`${seed}:${npc.id}:${a.id}`) - hash(`${seed}:${npc.id}:${b.id}`))[0];
    if (!pick) return null;
    startEncounter(npc, pick);
    if (pick.kind === 'invite') intents[npcId] = { mode: 'idle', target: null, speed: 0 };
    return encounterBubble(npcId);
  }

  /** Forget a finished steering intent (e.g. the NPC reached home). */
  function clearIntent(id) { delete intents[id]; }

  /** Return the most recent steering intent for an NPC. */
  function npcIntent(id) {
    return intents[id] || { mode: 'idle', target: null, speed: 0 };
  }

  /** Return a detached JSON-compatible save of the runtime state. */
  function serialize() {
    return JSON.parse(JSON.stringify({ active, cool, ignored, flags, wanted, paused, check, serial, draw, intents, transient }));
  }

  /** Restore a save produced by serialize. */
  function restore(saved) {
    ({ active, cool, ignored, flags, wanted, paused, check, serial, draw, intents, transient } = structuredClone(saved));
  }

  return {
    tick,
    get events() { return events; },
    bubbles: () => [...Object.values(active).map(encounter => encounter.bubble).filter(Boolean), ...transient],
    openChoice,
    choose,
    cancelChoice,
    finishChoice,
    isPaused: () => !!paused,
    npcIntent,
    debugStart,
    talkTo,
    clearIntent,
    activeIds: () => Object.keys(active),
    serialize,
    restore
  };
}
