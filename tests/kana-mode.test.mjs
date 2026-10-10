import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {toKana,leftoverKanji} from '../js/kana-text.js';
import {gradeOf} from '../js/kanji-grades.js';
import {wrapDialogueText} from '../js/games/iron-squad/soldier-dialogue.js';

// 1. grade 2 conversion examples
assert.equal(toKana('兵士',2),'へいし');
assert.equal(toKana('戦う',2),'たたかう');
assert.equal(toKana('敵軍が来る',2),'てきぐんが来る','grade 1-2 kanji such as 来 stay');
for(const text of ['人が山に行く','大きな田の中','学校の外で話す','上下左右、前後'])assert.equal(toKana(text,2),text,`${text} uses only grade 1-2 kanji`);
assert.equal(toKana('かな only 123 ABC！',2),'かな only 123 ABC！');
assert.equal(toKana('',2),'');assert.equal(toKana(12,2),12);
assert.equal(toKana('兵士',0),'兵士','grade 0 is off');assert.equal(toKana('兵士',7),'兵士');
assert.notEqual(toKana('戦う',2),toKana('戦う',6),'per-grade dictionaries differ');

// 2. idempotence
for(const text of ['兵士は戦場へ向かう','隊長、下がっててください！','王都の商人・救助 12秒','敵軍を撃破']){
  const once=toKana(text,2);assert.equal(toKana(once,2),once,text);
}

// 3. every Japanese string in js/ ends up with no kanji above grade 2
const files=[];
(function walk(dir){for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else if(name.endsWith('.js'))files.push(path);}})(fileURLToPath(new URL('../js',import.meta.url)));
const stripComments=src=>{
  let out='',i=0,quote='';
  while(i<src.length){
    const ch=src[i],next=src[i+1];
    if(quote){out+=ch;if(ch==='\\'){out+=src[i+1]??'';i+=2;continue;}if(ch===quote)quote='';if(ch==='\n'&&quote!=='`')quote='';i++;continue;}
    if(ch==='/'&&next==='*'){const end=src.indexOf('*/',i+2);i=end<0?src.length:end+2;continue;}
    if(ch==='/'&&next==='/'&&src[i-1]!==':'){while(i<src.length&&src[i]!=='\n')i++;continue;}
    if(ch==='/'&&/[(,=:[!&|?{};]/.test(out.trimEnd().slice(-1)||'(')){ // regex literal: not display text
      let j=i+1,cls=false;
      for(;j<src.length&&src[j]!==String.fromCharCode(10);j++){const c=src[j];if(c==='\\'){j++;continue;}if(c==='[')cls=true;else if(c===']')cls=false;else if(c==='/'&&!cls)break;}
      out+=' ';i=j+1;continue;
    }
    if(ch==='"'||ch==="'"||ch==='`')quote=ch;
    out+=ch;i++;
  }
  return out;
};
const fragments=new Map();
for(const file of files){
  if(/kana-dict\.js$|kanji-grades\.js$/.test(file))continue;
  for(const m of stripComments(readFileSync(file,'utf8')).matchAll(/[^\n"'`<>{}\\]*[\u3400-\u4dbf\u4e00-\u9fff][^\n"'`<>{}\\]*/g)){
    if(!fragments.has(m[0]))fragments.set(m[0],relative(process.cwd(),file));
  }
}
assert.ok(fragments.size>1500,`scanned a realistic number of Japanese fragments (${fragments.size})`);
const bad=[];
for(const [text,file] of fragments){
  const out=toKana(text,2);
  const left=leftoverKanji(out,2);
  if(left.length)bad.push(`${file}: ${JSON.stringify(text)} -> ${left.join('')}`);
  assert.equal(toKana(out,2),out,`not idempotent: ${text}`);
  for(const ch of out)if(/[\u3400-\u9fff]/.test(ch))assert.ok(gradeOf(ch)<=2,`${ch} in ${out}`);
}
assert.deepEqual(bad.slice(0,20),[],`kanji above grade 2 remain in ${bad.length} strings`);

// 4. mode switch: canvas methods are swapped in only while ON, and OFF leaves text unchanged
const calls=[];
class FakeContext{fillText(text,x,y){calls.push(['fill',text]);}strokeText(text){calls.push(['stroke',text]);}measureText(text){calls.push(['measure',text]);return {width:String(text).length*10};}}
globalThis.CanvasRenderingContext2D=FakeContext;
const originals=['fillText','strokeText','measureText'].map(n=>FakeContext.prototype[n]);
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
// same specifier as the game's imports so both share one module instance
const mode=await import('../js/kana-mode.js?v=164');
assert.equal(mode.isKanaMode(),false);
assert.equal(mode.displayKana('敵軍'),'敵軍','OFF returns text untouched');
const ctx=new FakeContext();ctx.fillText('敵軍',0,0);assert.deepEqual(calls.pop(),['fill','敵軍']);
mode.setKanaMode(true);
assert.equal(memory.get('game_studio_kana_grade'),'2','the setting is persisted under the game_studio_ prefix');
assert.equal(mode.isKanaMode(),true);assert.equal(mode.kanaGrade(),2);
assert.equal(mode.displayKana('敵軍'),'てきぐん');
ctx.fillText('敵軍',0,0);assert.deepEqual(calls.pop(),['fill','てきぐん']);
ctx.strokeText('兵士');assert.deepEqual(calls.pop(),['stroke','へいし']);
assert.equal(ctx.measureText('兵士').width,30,'measured on the converted text');
ctx.fillText(123,0,0);assert.deepEqual(calls.pop(),['fill',123],'non-strings pass through');
// wrapping splits converted text, so a word is never cut mid-reading
const lines=wrapDialogueText(new FakeContext(),'敵軍が来る！兵士は戦う',80);
assert.equal(lines.join(''),'てきぐんが来る！へいしはたたかう');
mode.setKanaMode(false);
assert.equal(memory.has('game_studio_kana_grade'),false,'turning OFF clears the saved setting');
assert.equal(mode.isKanaMode(),false);
['fillText','strokeText','measureText'].forEach((n,i)=>assert.equal(FakeContext.prototype[n],originals[i],`${n} is restored to the original when OFF`));
ctx.fillText('敵軍',0,0);assert.deepEqual(calls.pop(),['fill','敵軍']);
assert.equal(wrapDialogueText(new FakeContext(),'敵軍',80).join(''),'敵軍');
console.log(`kana-mode: ${fragments.size} Japanese fragments checked at grade 2`);
