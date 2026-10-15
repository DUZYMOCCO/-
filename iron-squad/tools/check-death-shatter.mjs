// node --experimental-vm-modules iron-squad/tools/check-death-shatter.mjs
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import vm from 'node:vm';
import {startQaServer} from './qa-server.mjs';

const root=resolve('iron-squad'),out=join(root,'docs/validation/death-shatter-v7.0.6'),files=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())walk(path);else if(['.js','.mjs'].includes(extname(path)))files.push(path);}}
for(const folder of ['js','tests','tools'])walk(join(root,folder));
let imports=0;
for(const path of files){
  const module=new vm.SourceTextModule(readFileSync(path,'utf8'),{identifier:path});
  for(const spec of module.dependencySpecifiers)if(spec.startsWith('.')){assert.ok(existsSync(resolve(dirname(path),spec.split('?')[0])),`${path}: ${spec}`);imports++;}
}
const scope={self:{GAME_ASSETS:{}}};vm.runInNewContext(readFileSync(join(root,'sw-assets.js'),'utf8'),scope);
const assets=scope.self.GAME_ASSETS['iron-squad'];
assert.equal(assets.version,'v283');assert.equal(assets.gameVersion,'7.0.6');assert.ok(assets.files.includes('js/death-shatter.js'));
assert.equal(new Set(assets.files).size,assets.files.length);
const server=await startQaServer();
try{
  for(const path of assets.files){
    const response=await fetch(`${server.origin}/iron-squad/${path}`);assert.equal(response.status,200,path);
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(readFileSync(join(root,path))),`served bytes: ${path}`);
  }
}finally{await server.close();}
const changed=['js/index.js','js/death-shatter.js','sw-assets.js','tests/death-shatter.test.mjs','tools/playtest-death-shatter.mjs','tools/check-death-shatter.mjs','docs/CURRENT_WORK.md','docs/GEMINI_REQUEST_KANA_2026-10-15.md'];
for(const path of changed)assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(readFileSync(join(root,path),'utf8')),`CRLF: ${path}`);
const before=JSON.parse(readFileSync(join(out,'before.json'))),after=JSON.parse(readFileSync(join(out,'after.json')));
assert.deepEqual(before.errors,[]);assert.deepEqual(after.errors,[]);
assert.equal(before.measurement.work.count,after.measurement.work.count);
assert.equal(before.measurement.actors,after.measurement.actors);
assert.ok(after.measurement.work.over100<=before.measurement.work.over100,'100ms work frames did not increase');
assert.ok(after.measurement.raf.over100<=before.measurement.raf.over100,'100ms rAF intervals did not increase');
assert.ok(after.measurement.peakGroups<=12);assert.ok(after.measurement.peakShards<=96);
for(const name of ['ordinary','ordinary-fragments','ordinary-gray-fragments','crowd','midboss','boss'])assert.ok(existsSync(join(out,`${name}-390.png`)));
const report={syntaxFiles:files.length,relativeImports:imports,servedAssets:assets.files.length,crlfFiles:changed.length,
  work:{before:before.measurement.work,after:after.measurement.work},raf:{before:before.measurement.raf,after:after.measurement.raf},peakGroups:after.measurement.peakGroups,peakShards:after.measurement.peakShards,screens:after.screens,errors:after.errors};
writeFileSync(join(out,'final-validation.json'),JSON.stringify(report,null,2).replace(/\n/g,'\r\n')+'\r\n');
console.log(JSON.stringify(report));
