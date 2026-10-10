# Freeze diagnosis (soak playtest)

Tools: `tools/soak-freeze.mjs <off|on> <min> [w h dpr tag]`, `tools/analyze-cpuprofile.mjs`. No game code changed.
Env: Playwright Chromium (WebKit not installed), CPU throttle 4x, 10 min real time per run, two runs in parallel. Runs: 390x844 DPR3 and 375x667 DPR2 (iPhone SE2 size), kana OFF/ON (ON toggled off/on at 3 and 6 min). Route: random props/trees, settlement props (teleport), free walking, fights; every 20 s strategy tabs / merchant / save menu / world map.
Raw data: soak*-{off,on}.json, soak*-prof-N.cpuprofile (kept only for 15 s segments containing a >200 ms gap).

## Results
- No multi-second stall, no hang, no render-problem recovery screen, 0 uncaught exceptions / unhandled rejections (only a favicon-type 404) in all 4 runs. NOT reproduced.
- SE size, field-only gaps >300 ms: OFF 9, ON 3 (max 633 ms OFF, 450 ms ON). Other long frames: first-frame init (~1.7-1.9 s, both modes) and strategy-modal open (~0.4-0.7 s). Kana did not worsen stalls; toggling kana caused no gap.
- Heap: 9-10 MB -> 15 MB (sawtooth, 14-38 MB peaks, no growth). DOM nodes: 1.3k -> ~12k once the strategy modal is built, then flat (no leak).
- toKana cache: 0 clears of a >=3900-entry Map in either run (no thrash).
- MutationObserver (kana ON, SE): childList 12.5k, characterData 9.2k, aria-label 5.8k, title 1.3k, class 5.7k in 10 min -> avg 79 callbacks/s, 327 records/s (baseline game-only observer: 45/s, 91 recs/s). Peak 92 ms/s at 4x CPU; total 1.4-2.1 s of 600 s. Not a feedback loop: conversions are idempotent (kana-mode.js convertText/convertAttrs early-return when conv===v). Churners: `#squad-proximity-badge`, `#base-heal-badge`, `#btn-strategy` aria-label (battlefield-ui.js refreshAttention rewrites it ~10/s, kana re-converts), stat-value spans, pad-btn labels. The observer uses attributeFilter ['title','aria-label','placeholder','alt'], so style/class/transform changes are NOT observed. convertTree walks only added subtrees.

## Suspects (evidence)
1. `js/games/iron-squad/battlefield-ui.js:51` Proxy around the 2D context (quietBattlefieldContext, used in index.js:9992): `set`/`get` traps are the top self-time JS function in every profile (e.g. 2.0 s set + 0.9 s get of a 15 s window at 4x; ~10-15% of CPU), in kana OFF as well. Every ctx.fillStyle/globalAlpha/etc goes through Reflect. This is the most plausible JS-side cause of low FPS / long frames on an SE2 (weaker than 4x-throttled desktop?). Other cost: drawImage of terrain tiles, drawWorldObj (index.js:10398), update (index.js:5237).
2. Correctness bug (not a stall): the Proxy `methods` cache binds the first-seen function (battlefield-ui.js:51). If it was first read before kana patched CanvasRenderingContext2D.prototype.fillText/measureText (or after unpatch), later toggles may not apply/revert on canvas text.
3. Kana MO adds ~2x callbacks; cheap in measurements, but on a slow WebKit with the HUD rewriting text every frame it is extra main-thread work (childList/characterData from innerHTML-style HUD updates).
4. Hang review: while loops reviewed (index.js 4025/4026 angle normalisation would hang only on Infinity, 8222/8537 guarded, trade-routes.js:52 budgeted, world.js:883 terminates, supply/magic/nation loops terminate on no-progress). No unbounded loop found.

## Recommended fix (not applied)
- Replace the context Proxy with a plain flag on the real ctx (e.g. ctx.showBattleLabels=false checked by the label drawers), or wrap only the label functions; at minimum drop the `set` trap.
- If kana stays: skip text nodes/attributes whose text is unchanged, throttle HUD text updates (write only on change), and rebuild the Proxy method cache on kana toggle.
- Confirm on a real iPhone SE2 (Safari): a Web Inspector timeline during the stall; terrain canvases at DPR2/WebKit memory (GPU) are not measurable here.
