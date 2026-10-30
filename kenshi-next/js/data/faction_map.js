// ゲーム内の勢力・役目を factions_all_v2.json 由来の勢力（faction_palettes.js）に対応付ける表。
// sim（装備に元の勢力を持たせる）と render（色を塗る）の両方から使う、THREE に依存しない純データ。
import { FACTION_PALETTES } from './faction_palettes.js';

// ゲームの勢力 → パレット勢力
export const GAME_FACTION_MAP = {
  guard: 'lantern_council', // 衛兵＝灯守評議会
  bandit: 'dust_bandits', // 盗賊・野盗の既定＝砂塵の野盗
  player: 'relic_explorers_guild', // 流れ者（プレイヤーと仲間）
  beast: 'ashen_wolves', // 獣（服は着ない。念のため）
};
// 役目での上書き（隊商の商人、盗賊の種類、人食い・グールなど）
export const ROLE_FACTION_MAP = {
  merchant: 'caravan_guild',
  caravan_guard: 'lantern_council',
  thief: 'hungry_blades',
  raider: 'dust_bandits',
  raider_boss: 'dust_bandits',
  cannibal: 'fog_cannibal_outcasts',
  cannibal_chief: 'fog_cannibal_outcasts',
  ghoul: 'fleshpack',
  robot_light: 'ancient_automatons',
  robot_heavy: 'ancient_automatons',
};
// 町の住人（非武装の guard）
export const RESIDENT_FACTION = 'independent_herders';
export const FALLBACK_FACTION = 'independent_herders';

// 人（actor）かゲームの勢力 id 文字列から、パレット勢力の id を返す。パレット勢力 id そのものも通す。
export function paletteIdFor(who) {
  if (who && typeof who === 'object') {
    if (who.role && ROLE_FACTION_MAP[who.role]) return ROLE_FACTION_MAP[who.role];
    if (who.faction === 'guard' && who.civil) return RESIDENT_FACTION;
    return GAME_FACTION_MAP[who.faction] || FALLBACK_FACTION;
  }
  if (FACTION_PALETTES[who]) return who;
  return GAME_FACTION_MAP[who] || FALLBACK_FACTION;
}
