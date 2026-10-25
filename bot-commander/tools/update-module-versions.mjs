// node tools/update-module-versions.mjs  → tests/fixtures/module-versions.json を書き直す。
// js/ のモジュールの中身を変えて、読む側の ?v= を上げたあとに流す（上げ忘れは tests/module-versions.test.mjs が見つける）。
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanModules } from '../tests/fixtures/module-versions-scan.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../tests/fixtures/module-versions.json', import.meta.url));
const mods = scanModules(root);
writeFileSync(out, JSON.stringify(mods, null, 1) + '\n');
console.log('wrote', out, Object.keys(mods).length, 'modules');
