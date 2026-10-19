// v7.1.2: Mahjong tile faces drawn as inline SVG (no image files). Kinds 0-8 manzu (numeral over 萬), 9-17 pinzu (circles), 18-26 souzu (bamboo), 27-30 winds, 31 白, 32 發, 33 中.
// The faces are plain markup built here, never run through the kana converter (it only rewrites strings that pass through gameText), and nothing in them animates.
const W=34,H=50;
const RED='#c8262c',GREEN='#1b7d3d',BLUE='#1f55b4',INK='#1c2127',DEEP_GREEN='#0f5a2a',AKA='#e0151f';
const FONT="'Noto Serif JP','Yu Mincho','Hiragino Mincho ProN','MS PMincho','Noto Serif CJK JP',serif";
const f1=n=>Math.round(n*100)/100;
const svg=(body,cls='')=>`<svg class="mj-face ${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${body}</svg>`;
/** A circle tile dot: white disc, coloured ring, coloured core. */
const dot=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${f1(r)}" fill="#fff" stroke="${c}" stroke-width="${f1(r*0.3)}"/><circle cx="${x}" cy="${y}" r="${f1(r*0.45)}" fill="${c}"/>`;
const big=(c1,c2,c3)=>`<circle cx="17" cy="25" r="13" fill="#fff" stroke="${c1}" stroke-width="2.4"/><circle cx="17" cy="25" r="8.6" fill="none" stroke="${c2}" stroke-width="2"/><circle cx="17" cy="25" r="4.4" fill="${c3}"/>`;
const PIN={
  1:[],
  2:[[17,13.5,7.2,GREEN],[17,36.5,7.2,BLUE]],
  3:[[8.5,9.5,6.4,BLUE],[17,25,6.4,RED],[25.5,40.5,6.4,GREEN]],
  4:[[9,14,6.4,GREEN],[25,14,6.4,BLUE],[9,36,6.4,BLUE],[25,36,6.4,GREEN]],
  5:[[9,13,6,GREEN],[25,13,6,BLUE],[17,25,6,RED],[9,37,6,BLUE],[25,37,6,GREEN]],
  6:[[10,10,5.6,GREEN],[24,10,5.6,GREEN],[10,25,5.6,RED],[24,25,5.6,RED],[10,40,5.6,RED],[24,40,5.6,RED]],
  7:[[9.5,8.5,4.8,GREEN],[17,14.5,4.8,GREEN],[24.5,20.5,4.8,GREEN],[10,32,5,RED],[24,32,5,RED],[10,43,5,RED],[24,43,5,RED]],
  8:[10,24].flatMap(x=>[8.5,19.5,30.5,41.5].map(y=>[x,y,4.9,BLUE])),
  9:[[GREEN,10],[RED,25],[BLUE,40]].flatMap(([c,y])=>[8,17,26].map(x=>[x,y,4.5,c]))
};
/** A bamboo stick (rounded bar with a node line). */
const stick=(x,y,h,c,w=4.6)=>`<rect x="${f1(x-w/2)}" y="${f1(y-h/2)}" width="${w}" height="${h}" rx="${f1(w/2)}" fill="${c}" stroke="${DEEP_GREEN}" stroke-width=".7"/><path d="M${f1(x-w/2+.4)} ${y}H${f1(x+w/2-.4)}M${f1(x-w/2+.4)} ${f1(y-h/4)}H${f1(x+w/2-.4)}M${f1(x-w/2+.4)} ${f1(y+h/4)}H${f1(x+w/2-.4)}" stroke="#fff" stroke-width=".9" opacity=".75"/>`;
const SOU={
  2:[[17,14,17,GREEN],[17,36,17,GREEN]],
  3:[[17,14,18,GREEN],[10,37,18,GREEN],[24,37,18,GREEN]],
  4:[[10,14,18,GREEN],[24,14,18,BLUE],[10,36,18,BLUE],[24,36,18,GREEN]],
  5:[[9,13,17,GREEN],[25,13,17,GREEN],[17,25,17,RED],[9,37,17,GREEN],[25,37,17,GREEN]],
  6:[8,17,26].flatMap(x=>[[x,14,18,GREEN],[x,36,18,x===17?BLUE:GREEN]]),
  7:[[17,9,12,RED],...[8,17,26].map(x=>[x,26,14,GREEN]),...[8,17,26].map(x=>[x,42,14,GREEN])],
  8:[6.5,13.5,20.5,27.5].flatMap(x=>[[x,14,18,GREEN],[x,36,18,GREEN]]),
  9:[8,17,26].flatMap(x=>[10,25,40].map(y=>[x,y,13,x===17?RED:(y===25?BLUE:GREEN)]))
};
const bird=()=>`<ellipse cx="17" cy="30" rx="7.5" ry="10" fill="${GREEN}" stroke="${DEEP_GREEN}" stroke-width=".8"/><circle cx="17" cy="15.5" r="5" fill="${GREEN}" stroke="${DEEP_GREEN}" stroke-width=".8"/><path d="M21.5 14.5 27 16.5 21.4 18.2Z" fill="${RED}"/><circle cx="18.8" cy="14.3" r="1.1" fill="#fff"/><ellipse cx="14.5" cy="30" rx="4" ry="6.5" fill="${RED}" opacity=".9"/><path d="M13 40 9.5 47M17 40.5 17 48M21 40 24.5 47" stroke="${RED}" stroke-width="1.8" stroke-linecap="round"/><path d="M12 44h10" stroke="${BLUE}" stroke-width="1.4" stroke-linecap="round"/>`;
const txt=(s,x,y,size,c,extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="${c}" ${extra}>${s}</text>`;
// 萬 (U+842C) and 發 (U+767C) are tile art, written as escapes: they are drawn, never converted by the kana mode (and are not in the kana grade tables).
const NUM=['一','二','三','四','五','六','七','八','九'];
const HONOR={27:['東',INK],28:['南',INK],29:['西',INK],30:['北',INK],32:['\u767c',GREEN],33:['中',RED]};
const cache=new Map();
/** The face of tile kind t (0..33) as an <svg> string; aka=true gives the red-five look (kinds 4, 13, 22). */
export function tileSvg(t,aka=false) {
  const key=t*2+(aka?1:0);let s=cache.get(key);if(s)return s;
  const a=aka&&(t===4||t===13||t===22);
  let body;
  if(t<9){body=txt(NUM[t],17,23,22,a?AKA:INK)+txt('\u842c',17,46,18,a?AKA:RED);}
  else if(t<18){
    const n=t-9+1;
    if(n===1)body=a?big(AKA,AKA,AKA):big(BLUE,GREEN,RED);
    else body=PIN[n].map(([x,y,r,c])=>dot(x,y,n===5&&a&&x===17?r*1.15:r,a?AKA:c)).join('');
  }
  else if(t<27){
    const n=t-18+1;
    body=n===1?bird():SOU[n].map(([x,y,h,c])=>stick(x,y,h,a?AKA:c)).join('');
  }
  else if(t===31)body=`<rect x="5.5" y="8" width="23" height="34" rx="2.5" fill="none" stroke="#4b5a6a" stroke-width="2.2"/><rect x="9" y="11.5" width="16" height="27" rx="1.5" fill="none" stroke="#4b5a6a" stroke-width=".8"/>`;
  else {const [ch,c]=HONOR[t];body=txt(ch,17,36,31,c);}
  s=svg(body,`mj-f${t}${a?' is-aka':''}`);cache.set(key,s);return s;
}
/** The back of a tile: green with a lattice. */
export const backSvg=()=>svg(`<rect x="3" y="3" width="28" height="44" rx="2.5" fill="none" stroke="#cfe8d6" stroke-width="1.4" opacity=".85"/><path d="M3 14 31 36M3 25 31 47M3 3 31 25M31 14 3 36M31 25 3 47M31 3 3 25" stroke="#cfe8d6" stroke-width=".9" opacity=".55"/><rect x="12" y="19" width="10" height="12" rx="1.5" fill="#cfe8d6" opacity=".6"/>`,'mj-face-back');
