// node tools/update-css-versions.mjs  → tests/fixtures/css-versions.json を書き直す（R-13）。
// css/ の中身を変えて、読む側（js/ の 'css/名前.css?v=数'）の ?v= を上げたあとに流す（上げ忘れは tests/css-versions.test.mjs が見つける）。
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scanCss } from '../tests/fixtures/css-versions-scan.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../tests/fixtures/css-versions.json', import.meta.url));
const mods = scanCss(root);
writeFileSync(out, JSON.stringify(mods, null, 1) + '\n');
console.log('wrote', out, Object.keys(mods).length, 'css files');
