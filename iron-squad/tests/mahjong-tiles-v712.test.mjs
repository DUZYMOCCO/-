// v7.1.2: mahjong tile faces are inline SVG (34 kinds + red fives + back), not text; the kana mode leaves them alone; the table renders them in the hand / rivers / melds / dora / waits.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from '../../__pycache__/ui-tools/node_modules/jsdom/lib/api.js';
const dom=new JSDOM('<div id="game" class="game-container"></div>',{url:'http://localhost/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,matchMedia:()=>({matches:true}),DOMParser:dom.window.DOMParser});
const noop=()=>{},ctx=new Proxy({measureText:()=>({width:40}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});
window.HTMLCanvasElement.prototype.getContext=()=>ctx;
const {tileSvg,backSvg}=await import('../js/mahjong-tiles.js');
const {tileHtml,tileLabel}=await import('../js/mahjong.js');
const {IronSquadGame}=await import('../js/index.js'),{saveSlots}=await import('../js/save-slots.js'),{normalizeNation}=await import('../js/nation-rules.js');
const {setKanaGrade}=await import('../../common/js/kana-mode.js?v=175');
const {HEADQUARTERS_FACILITIES}=await import('../js/hq-facilities.js');
let checks=0;const ok=(c,m)=>{checks++;assert.ok(c,m);};const eq=(a,b,m)=>{checks++;assert.deepEqual(a,b,m);};
const parse=s=>new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${s}</svg>`,'image/svg+xml');
// ---- 1. every face is a well-formed inline SVG ----
const seen=new Set(),texts=[];
for(let t=0;t<34;t++){
  const s=tileSvg(t);ok(s.startsWith('<svg')&&s.endsWith('</svg>'),`kind ${t} is an svg`);ok(!s.includes('<image')&&!s.includes('href=')&&!s.includes('url('),'no image files or external refs');
  ok(!parse(s).querySelector('parsererror'),`kind ${t} parses as XML`);ok(s.length<3500,`kind ${t} stays light (${s.length} bytes)`);
  ok(!seen.has(s),`kind ${t} looks different from every other`);seen.add(s);
  const el=parse(s).querySelector('svg svg');ok(el&&el.getAttribute('viewBox')==='0 0 34 50','one shared viewBox');ok(el.getAttribute('aria-hidden')==='true','the label comes from the tile, not the drawing');
  texts.push([...el.querySelectorAll('text')].map(x=>x.textContent).join(''));
}
for(let t=0;t<9;t++)eq(texts[t],'一二三四五六七八九'[t]+'萬',`manzu ${t+1}: numeral over 萬`);
for(let t=9;t<27;t++)eq(texts[t],'',`suits ${t}: pictures only, no text`);
eq(texts.slice(27),['東','南','西','北','','發','中'],'honours: winds, blank 白 (frame only), 發, 中');
const count=(s,tag)=>(s.match(new RegExp('<'+tag+'[ >]','g'))||[]).length;
for(let n=2;n<=9;n++)eq(count(tileSvg(9+n-1),'circle'),n*2,`${n}p has ${n} dots (ring + core each)`);
eq(count(tileSvg(9),'circle'),3,'1p is the big three-ring circle');
for(let n=2;n<=9;n++)eq(count(tileSvg(18+n-1),'rect'),n,`${n}s has ${n} bamboo sticks`);
ok(tileSvg(18).includes('<ellipse')&&tileSvg(18).includes('<path'),'1s is the bird');
ok(tileSvg(31).includes('<rect')&&!tileSvg(31).includes('<text'),'白 is a frame');
ok(tileSvg(32).includes('#1b7d3d')&&tileSvg(33).includes('#c8262c'),'發 is green, 中 is red');
// the suit colours: 1p/5p/9p carry blue, green and red; 5s has a red centre stick; manzu 萬 is red
ok(['#c8262c','#1b7d3d','#1f55b4'].every(c=>tileSvg(9+8).includes(c)),'9p uses red, green and blue');
ok(tileSvg(0).includes('#c8262c')&&tileSvg(0).includes('#1c2127'),'manzu: black numeral, red 萬');
// ---- 2. red fives ----
for(const t of [4,13,22]){const a=tileSvg(t,true),n=tileSvg(t,false);ok(a!==n,`kind ${t}: the red five differs`);ok(a.includes('#e0151f')&&a.includes('is-aka'),'drawn in the aka red');ok(!n.includes('#e0151f'),'the plain five has no aka red');}
for(let t=0;t<34;t++)if(![4,13,22].includes(t))ok(tileSvg(t,true)===tileSvg(t,false),`kind ${t} has no red version`);
ok(tileSvg(4)===tileSvg(4),'faces are cached');
const back=backSvg();ok(back.startsWith('<svg')&&back.includes('mj-face-back')&&!seen.has(back),'a distinct back');ok(!parse(back).querySelector('parsererror'));
// ---- 3. tileHtml wraps it and keeps the accessibility label ----
for(let t=0;t<34;t++){const h=tileHtml(t,'mj-sm'),d=parse(h.replace(/data-n=/,'data-n='));const span=document.createElement('div');span.innerHTML=h;const el=span.firstElementChild;
  ok(el.matches('.mj-tile.mj-sm')&&el.getAttribute('role')==='img'&&el.getAttribute('aria-label')===tileLabel(t),`tile ${t} keeps role/label`);ok(el.querySelector('svg.mj-face'),`tile ${t} contains the svg`);ok(!el.getAttribute('aria-label').match(/[一-龥]/),'the label is kana, not kanji');}
{const d=document.createElement('div');d.innerHTML=tileHtml(13,'',' ',true);ok(d.firstElementChild.classList.contains('is-aka')&&d.querySelector('.mj-f13.is-aka'),'aka flag reaches class and drawing');}
// ---- 4. CSS: no text faces, no animation on the drawings, mobile sizes ----
const css=readFileSync(new URL('../css/iron-squad-interface.css',import.meta.url),'utf8');
const block=css.slice(css.indexOf('v7.1.2: real mahjong tile faces'));ok(block.length>200,'the v7.1.2 CSS block exists');
ok(/\.mj-tile::before,\.iron-squad \.mj-tile::after \{ content:none !important;/.test(block),'the old text faces are switched off');
ok(!/animation|@keyframes/.test(block)&&!/\.mj-face[^}]*transition/.test(block),'the drawings never animate (reduced motion unaffected)');
ok(/\.mj-tile\.mj-sm \{ width:17px; height:25px/.test(block),'small tiles for rivers and melds');ok(/\.mj-hand \.mj-tile \{ flex:0 0 auto; width:min\(40px,calc\(\(100% - 18px\) \/ 7\)\)/.test(block)&&/\.mj-hand \{ flex-wrap:wrap;/.test(block),'hand tiles: up to 7 per row, 40px wide, two rows for 14 tiles');
ok(/#3f8f66/.test(block)&&/#fffaf0/.test(block),'cream body with a green edge');
// ---- 5. the table ----
const game=Object.create(IronSquadGame);Object.assign(game,{container:document.getElementById('game'),width:390,height:844,zoom:1,ctx,camera:{x:79360,y:79360},selectedSaleIds:new Set(),commandActiveUntil:0});
for(const method of ['startGameLoop','showToast','spawnDamageText','spawnSparks'])game[method]=noop;
game.setupUI();game.activeSlotId=saveSlots.create('MAHJONG TILES TEST ONLY').id;game.startFreshGame(false);
game.nation=normalizeNation({investment:90000});game.gold=5000000;
const site=HEADQUARTERS_FACILITIES.find(p=>p.id==='casino');game.restTimer=0;Object.assign(game.player,{x:site.x,y:site.y+24});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const mj=()=>game.nation.casino.mahjong;
assert.equal(game.openHeadquartersFacility('casino'),true);document.querySelector('[data-casino-page="mahjong"]').click();
ok(game.startCasinoMahjong({seed:424242,mode:'full',level:'adept'}),'a game starts');
{const t0=Date.now();while(!(mj().stage==='act'&&mj().h.turn===0)&&Date.now()-t0<15000)await sleep(10);}
const panel=document.querySelector('.casino-panel');
const hand=[...panel.querySelectorAll('.mj-hand [data-mj-tile]')];ok(hand.length>=13&&hand.length<=14,`the hand shows ${hand.length} tiles`);
for(const b of hand){ok(b.tagName==='BUTTON'&&b.querySelector('svg.mj-face'),'every hand tile is a button with an svg face');ok(b.getAttribute('aria-label')&&b.dataset.mjTile!==undefined);}
const tiles=[...panel.querySelectorAll('.mj-tile')];ok(tiles.length>=hand.length+1,'hand and dora render tiles');
ok(tiles.every(t=>t.querySelector('svg.mj-face')),'every tile on the table is an svg (no text faces)');
ok(tiles.every(t=>[...t.childNodes].every(n=>n.nodeType===1)),'no stray text nodes inside tiles');
ok(panel.querySelectorAll('.mj-dora .mj-tile,.mj-dora-row .mj-tile').length>=1,'the dora indicator is drawn');
// two-step tap still works with the new faces
hand[2].click();ok(document.querySelector('.mj-hand .is-selected'),'first tap selects');const before=mj().h.log.length;document.querySelector('.mj-hand .is-selected').click();
{const t0=Date.now();while(mj().h.log.length===before&&Date.now()-t0<5000)await sleep(10);}ok(mj().h.log.length>before,'second tap throws it');
// ---- 6. kana mode: the drawings are not converted ----
{const t0=Date.now();while(!(mj().over||(mj().stage==='act'&&mj().h.turn===0)||(mj().stage==='claim'&&mj().h.claim.wait==='human'))&&Date.now()-t0<15000)await sleep(10);}
setKanaGrade(2,{persist:false});game.openCasinoPage('mahjong');await sleep(20);
const html=document.querySelector('.casino-panel').innerHTML;
const manzu=[...document.querySelectorAll('.casino-panel .mj-m svg text')];
for(const tx of manzu)ok(/[一二三四五六七八九萬]/.test(tx.textContent)&&!/[ぁ-ん]/.test(tx.textContent),'manzu numerals stay kanji in kana mode');
for(const tx of document.querySelectorAll('.casino-panel .mj-h svg text'))ok(/^[東南西北]$/.test(tx.textContent),'winds stay kanji in kana mode');
setKanaGrade(0,{persist:false});
ok(manzu.length+document.querySelectorAll('.casino-panel .mj-h svg text').length>0,'the table had kanji-faced tiles to check');
ok(html.length>1000,'panel rendered in kana mode');
console.log(JSON.stringify({checks}));
