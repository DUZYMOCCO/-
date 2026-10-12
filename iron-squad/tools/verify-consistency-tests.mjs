import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
const out=process.argv[2]||'iron-squad/docs/previews/consistency-fixes-20261012';mkdirSync(out,{recursive:true});
const pngs=execFileSync('git',['ls-files','iron-squad/docs/previews'],{encoding:'utf8'}).split(/\r?\n/).filter(p=>p.endsWith('.png'));
const originals=new Map(pngs.map(p=>[p,readFileSync(p)]));
try{
  const tests=readdirSync('iron-squad/tests').filter(p=>p.endsWith('.test.mjs')).map(p=>'iron-squad/tests/'+p);
  const result=spawnSync(process.execPath,['--test',...tests],{encoding:'utf8',maxBuffer:12e6,timeout:360000});
  writeFileSync(`${out}/tests.log`,(result.stdout||'')+(result.stderr||'')+(result.error?.message||''));
  console.log((result.stdout||'').split(/\r?\n/).filter(s=>/ℹ|✖|Assertion|Error|FAIL/.test(s)).join('\n'));console.log(result.stderr||'');
  process.exitCode=result.status??1;
}finally{for(const [p,bytes]of originals)if(!readFileSync(p).equals(bytes))writeFileSync(p,bytes);}
