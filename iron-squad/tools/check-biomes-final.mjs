// node --experimental-vm-modules iron-squad/tools/check-biomes-final.mjs
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname,join,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const base=resolve('iron-squad'),files=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(['.js','.mjs'].includes(extname(p)))files.push(p);}}
for(const folder of ['js','tests','tools'])walk(join(base,folder));
let imports=0;
for(const file of files){const m=new vm.SourceTextModule(readFileSync(file,'utf8'),{identifier:file});for(const spec of m.dependencySpecifiers)if(spec.startsWith('.')){assert.ok(existsSync(resolve(dirname(file),spec.split('?')[0])),`${file}: missing ${spec}`);imports++;}}
const context={self:{GAME_ASSETS:{}}};vm.runInNewContext(readFileSync(join(base,'sw-assets.js'),'utf8'),context);const assets=context.self.GAME_ASSETS['iron-squad'];
assert.equal(assets.version,'v281');assert.equal(assets.gameVersion,'7.0.4');assert.equal(new Set(assets.files).size,assets.files.length);for(const path of assets.files)assert.ok(existsSync(join(base,path)),`asset ${path}`);
for(const path of ['js/biome-terrain.js','js/biome-encounters.js','js/enemy-art.js','js/enemy-art-toon.js','js/wilderness-sites.js','js/wilderness-layout.js'])assert.ok(assets.files.includes(path));
const diff=execFileSync('git',['-c','core.quotepath=false','diff','--name-only'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
const added=execFileSync('git',['-c','core.quotepath=false','ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert.ok([...diff,...added].every(p=>p.startsWith('iron-squad/')),'every changed/untracked file belongs to Iron Squad');
const textFiles=[...new Set([...diff,...added])].filter(p=>['.js','.mjs','.md','.json','.py','.css','.html'].includes(extname(p)));
for(const path of textFiles)assert.ok(!/\r(?!\n)|(?<!\r)\n/.test(readFileSync(path,'utf8')),`CRLF: ${path}`);
const snapshots=[];
for(const v of ['7.0.1','7.0.2','7.0.3','7.0.4']){
 const report=JSON.parse(readFileSync(join(base,`docs/validation/biomes-v${v}/after.json`),'utf8'));
 for(const region of ['east','south','north','west'])for(const period of ['day','night'])assert.ok(existsSync(join(base,`docs/validation/biomes-v${v}/${region}-${period}-390.png`)));
 assert.deepEqual(report.errors,[]);snapshots.push({version:v,screens:report.screens.length});
}
const before=JSON.parse(readFileSync(join(base,'docs/validation/biomes-v7.0.4/profile-before.json'),'utf8')),after=JSON.parse(readFileSync(join(base,'docs/validation/biomes-v7.0.4/profile-after.json'),'utf8'));
assert.equal(before.biomes.length,8);assert.equal(after.biomes.length,8);const comparison=[];
for(let i=0;i<8;i++){
 const a=before.biomes[i],b=after.biomes[i];assert.equal(a.name,b.name);assert.equal(a.period,b.period);assert.equal(a.actors,b.actors);assert.equal(a.enemies,b.enemies);
 assert.ok(b.raf.over100<=a.raf.over100,`${a.name}/${a.period} rAF slow frames increased`);assert.ok(b.arrival.over100<=a.arrival.over100,`${a.name}/${a.period} callback slow frames increased`);
 comparison.push({name:b.name,period:b.period,mean:b.work.mean,p95:b.work.p95,max:b.work.max,rafBefore:a.raf.over100,rafAfter:b.raf.over100,arrivalBefore:a.arrival.over100,arrivalAfter:b.arrival.over100});
}
const report={syntaxFiles:files.length,localImports:imports,assets:assets.files.length,changedTextFiles:textFiles.length,snapshots,comparison};
writeFileSync(join(base,'docs/validation/biomes-v7.0.4/final-validation.json'),JSON.stringify(report,null,2).split('\n').join('\r\n'));console.log(JSON.stringify(report));
