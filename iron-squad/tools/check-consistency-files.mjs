import assert from 'node:assert/strict';
import {readdirSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
const files=readdirSync('iron-squad/js').filter(p=>p.endsWith('.js')).map(p=>join('iron-squad/js',p));
const out=process.argv[2]||'iron-squad/docs/previews/consistency-fixes-20261012',expectedVersion=process.argv[3]||'6.0.1',expectedCache=process.argv[4]||'v200';
for(const path of [...files,'iron-squad/sw-assets.js'])execFileSync(process.execPath,['--check',path]);
const context={self:{}};runInNewContext(readFileSync('iron-squad/sw-assets.js','utf8'),context);
const manifest=context.self.GAME_ASSETS['iron-squad'];assert.equal(manifest.gameVersion,expectedVersion);assert.equal(manifest.version,expectedCache);
for(const path of manifest.files)assert.ok(existsSync(resolve('iron-squad',path)),path);
for(const path of files){
  const source=readFileSync(path,'utf8');
  for(const m of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)){
    const base=resolve(path,'..'),target=resolve(base,m[1].split('?')[0]);assert.ok(existsSync(target),`${path}: ${m[1]}`);
  }
}
const changedPreviews=execFileSync('git',['diff','--name-only','--','iron-squad/docs/previews'],{encoding:'utf8'}).trim();assert.equal(changedPreviews,'','tracked preview artifacts were restored');
execFileSync('git',['-c','core.safecrlf=false','diff','--check']);
const ui=JSON.parse(readFileSync(`${out}/ui.json`,'utf8'));assert.deepEqual(ui.errors,[]);
const validation={syntaxModules:files.length,cacheAssets:manifest.files.length,gameVersion:manifest.gameVersion,cacheVersion:manifest.version,importsResolved:true,trackedPreviewsRestored:true,diffCheck:true,browserErrors:ui.errors.length};
writeFileSync(`${out}/validation.json`,JSON.stringify(validation,null,2));console.log(JSON.stringify(validation));
