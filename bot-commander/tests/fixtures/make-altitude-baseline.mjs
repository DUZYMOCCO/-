// node tests/fixtures/make-altitude-baseline.mjs <ゲームのフォルダ>  → altitude-baseline.json を書く（1回だけ。入れる前のコードで）
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { runScenarios } from './altitude-scenarios.mjs';
const dir = path.resolve(process.argv[2]);
const S = await import(pathToFileURL(path.join(dir, 'js/sim/sim.js')).href);
const M = await import(pathToFileURL(path.join(dir, 'js/sim/mission.js')).href);
const out = fileURLToPath(new URL('./altitude-baseline.json', import.meta.url));
writeFileSync(out, JSON.stringify({ source: path.basename(dir), scenarios: runScenarios(S, M) }, null, 0) + '\n');
console.log('wrote', out);
