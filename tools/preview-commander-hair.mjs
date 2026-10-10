import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {drawFieldCommander} from '../js/games/iron-squad/visuals.js';
import {createSoldierAppearance} from '../js/games/iron-squad/soldier-appearance.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Review');
const canvas=createCanvas(780,420),c=canvas.getContext('2d');c.showBattleLabels=false;c.fillStyle='#17271f';c.fillRect(0,0,780,420);
c.fillStyle='#d8d1b6';c.font='bold 23px Review';c.fillText('主人公の髪 / 共通の顔を保って短髪へ',20,35);
for(let i=0;i<2;i++){
 c.fillStyle='#24382c';c.fillRect(12+i*390,60,366,318);
 c.save();c.translate(195+i*390,330);c.scale(4,4);
 drawFieldCommander(c,{x:0,y:0,hp:100,maxHp:100,level:1,facingAngle:0,appearance:i?undefined:createSoldierAppearance('soldier:0')},{},0,0,'隊長',false,true);c.restore();
 c.font='17px Review';c.fillStyle='#d7d0b5';c.fillText(i?'修正後 · 短髪':'修正前 · 固定の禿げ頭',30+i*390,88);
}
c.font='13px Review';c.fillStyle='#a8b7a2';c.fillText('フィールド・隊長の顔画像へ同じ髪を反映。兵士の個別の外見は保持。',20,405);
mkdirSync('docs/previews',{recursive:true});const path='docs/previews/commander-hair-v4.2.16.png';writeFileSync(path,canvas.toBuffer('image/png'));console.log(path);
