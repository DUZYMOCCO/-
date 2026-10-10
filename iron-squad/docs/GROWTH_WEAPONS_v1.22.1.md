# Growth / Weapons pass — v1.22.1 (SW v55)

## What archers used before (bug)
- Starter item **name** was `木の短弓`, but `weaponStyle` was hardcoded to **`sword`**.
- ARCHER/SNIPER favorites were drawn from melee weights (sword/spear/hammer).
- Combat ignored weapon style: always class `range` / `atkCooldown` and a generic `ARROW` projectile.
- Visuals always drew a bow, regardless of equipped item.

## Fix
- Real ranged styles: `bow` / `crossbow` / `cannon` with JP names, profiles, mastery, drops, visuals.
- Archers/Snipers pick ranged favorites and start with matching weapons.
- Save migration remaps old melee favorites on ranged classes and name-placeholder weapons (`…弓` → bow, etc.).

## Player (隊長)
- **No class/job restriction** — may freely equip sword, spear, hammer, bow, crossbow, or cannon.
- Combat uses equipped style (melee profiles vs ranged projectiles).
- Mastery grows on the equipped type when hitting.

## Soldiers
- Keep preferred (`favoriteWeapon`) and auto-invest mastery into it (full gain when held, 35% when not).
- Auto-equip prefers favorite via score bias (+120).

## HP growth (被弾鍛錬)
- Soft cap **+40% max HP**.
- Per hit: `gain ≈ 0.0052 * severity * absFactor * room`, severity = clamp(dmg/maxHp, 0.05, 1), absFactor favors bigger hits.
- Persisted as `player.hitGrowthPct` / `soldier.hitGrowthPct`.
- Toast every +10% milestone via battle-log.

## Weapon mastery
- Soft cap **+35% ATK** for that style: `1 + 0.35 * (1 - 1/(1 + xp/48))`, +0.85 XP per hit.
- Saved as `weaponMastery: { sword, spear, hammer, bow, crossbow, cannon }`.

## Combat profiles (atkMult / baseCooldown / reach)
| Style | atkMult | CD | Reach | Notes |
|---|---|---|---|---|
| sword | 1.0 | 0.52 | 85 | baseline DPS |
| spear | 1.5 | 0.78 | 145 | pierce, same DPS ballpark |
| hammer | 2.45 | 0.98 | 80 | strong KB 62 (warlord 78) |
| bow | 1.05 | 0.95 | 250 | fastest ranged, lower punch |
| crossbow | 1.85 | 1.45 | 285 | slower, higher power, light KB |
| cannon | 3.15 | 2.15 | 310 | slowest, splash 52, KB 48 |

Drops: ~70% melee / ~30% ranged pool.

## v1.25.2 melee attack-speed mastery

- sword / spear / hammer: same as bow — `atk *= 1+axis` (existing) and `baseCooldown *= max(0.55, 1-axis)`.
- bow / crossbow: ATK + reload (unchanged).
- cannon: splash + reload (unchanged).
- `axis = MASTERY_SOFT_CAP * (1 - 1/(1 + xp/MASTERY_XP_SCALE))` with SOFT_CAP=0.35, XP_SCALE=48.
