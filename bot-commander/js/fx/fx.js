// BotFx: 着弾・爆発の演出（依存なし Canvas2D）。元: new-game-rts/fx/fx.js v0.2（10/23）をゲーム用の ES モジュールにしたもの。
// ゲーム用の変更: ①強さ・反応の計算は react.js（sim と共有） ②gate＝ゆれ・止めを呼ぶ側が許す/弱める（o.gate、時間差の爆発にも引き継ぐ）
// ③opt.shakeMax＝ゆれの上限 px ④敵の撃破 enemyDeath を追加（異星生物がはじける。仮）
import { intensity, dial, classify, hitReact, reactStep, hurt, applyReact, REACT } from './react.js?v=2';
const TAU=Math.PI*2, clamp=(x,a,b)=>x<a?a:x>b?b:x, lerp=(a,b,u)=>a+(b-a)*u;
let seed=12345; const rnd=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }; const rr=(a,b)=>a+(b-a)*rnd();
// ===== 色 =====
const C={ white:[255,255,245], fire:[[255,255,230],[255,214,110],[255,130,40],[170,50,20]], fball:[[255,252,225],[255,214,100],[248,128,36],[150,62,30],[72,58,52],[58,52,52]], pball:[[245,255,255],[140,255,240],[50,180,255],[40,70,150],[40,46,70],[36,40,56]], hot:[[255,255,255],[255,240,170],[255,170,60]],
  smoke:[[90,84,80],[70,68,70]], dsmoke:[[48,42,40],[36,34,36]], dust:[[176,150,112],[150,128,98]], spark:[[255,255,230],[255,220,120],[255,140,50]],
  goo:[[214,240,90],[150,190,40]], gooDark:[110,140,30], alien:[[230,255,255],[110,240,255],[40,150,255]], alienFire:[[240,255,255],[120,255,230],[40,170,255],[20,60,140]],
  water:[[255,255,255],[200,235,255]], laser:[[255,255,255],[255,90,90],[200,20,40]], beam:[[255,255,255],[150,240,255],[60,140,255]],
  heal:[[240,255,240],[120,255,170],[60,220,140]], barrier:[[255,255,255],[140,230,255],[70,160,255]], metal:[[70,72,80],[110,112,120],[150,130,100]], flesh:[[190,120,140],[120,150,50],[90,70,60]] };

// ===== 光・煙の絵（色ごとに一度だけ作る） =====
const SPR=new Map(), SZ=64;
function sprite(kind,c){ const q=(c[0]>>4)<<8|(c[1]>>4)<<4|(c[2]>>4), key=kind*4096+q; let s=SPR.get(key); if(s) return s;
  s=document.createElement('canvas'); s.width=s.height=SZ; const g=s.getContext('2d'), h=SZ/2, gr=g.createRadialGradient(h,h,0,h,h,h);
  const r=(c[0]>>4)*17,gg=(c[1]>>4)*17,b=(c[2]>>4)*17, col=a=>`rgba(${r},${gg},${b},${a})`; if(kind===0){
  gr.addColorStop(0,col(1)); gr.addColorStop(0.25,col(0.8)); gr.addColorStop(0.6,col(0.25)); gr.addColorStop(1,col(0)); }      // 光
  if(kind===0){ g.fillStyle=gr; g.fillRect(0,0,SZ,SZ); }
  else { // 煙: もこもこ（小さな玉を5つ重ねる）。ふちは柔らか
    const B=[[0,0,0.62],[-0.3,-0.18,0.42],[0.3,-0.2,0.44],[-0.22,0.25,0.4],[0.26,0.22,0.42],[0,-0.38,0.36]];
    for(const [bx,by,br] of B){ const cx=h+bx*h, cy=h+by*h, rr2=br*h, q2=g.createRadialGradient(cx-rr2*0.25,cy-rr2*0.3,0,cx,cy,rr2);
      q2.addColorStop(0,col(0.9)); q2.addColorStop(0.65,col(0.75)); q2.addColorStop(1,col(0)); g.fillStyle=q2; g.beginPath(); g.arc(cx,cy,rr2,0,TAU); g.fill(); } } SPR.set(key,s); return s; }
function colAt(keys,u){ if(!keys[0].length) return keys; const n=keys.length-1; if(n<=0) return keys[0]; const f=clamp(u,0,1)*n, i=Math.min(n-1,f|0), t=f-i, a=keys[i], b=keys[i+1];
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]; }

// 粒の種類
const GLOW=0,SMOKE=1,SPARK=2,CHUNK=3,RING=4,DROP=5,HEX=6,PLUS=7,DECAL=8,CRACK=9;
const LAYER=[2,1,2,1,2,1,2,2,0,0];

export function create(opt={}){
  const MAX=opt.max||1200, P=new Array(MAX); for(let i=0;i<MAX;i++) P[i]={};
  let n=0, smN=0, peak=0, trauma=0, shx=0, shy=0, hitstop=0, hsCool=0, flash=0, time=0; const beams=[], arcs=[], proj=[], timers=[];
  const DEC_MAX=48; let decN=0; const dec=[];
  const st={spawned:0,dropped:0,drawMs:0,updMs:0};
  // 予算: 粒が混んだら軽い演出から間引く（重い演出の芯は残す）
  function budget(w){ const f=n/MAX; if(f<0.3) return 1; const b=clamp(1-(f-0.3)/0.6,0.05,1); return clamp(b+w*w*0.6,0,1); }
  function cnt(k,w){ const b=budget(w); const v=k*b; return Math.floor(v)+(rnd()<v%1?1:0); }
  function add(o){ if(n>=MAX||(o.mode===SMOKE&&smN>=MAX*0.35&&!o.keep)){ st.dropped++; return null; } const p=P[n++]; st.spawned++;
    p.mode=o.mode|0; p.x=o.x; p.y=o.y; p.vx=o.vx||0; p.vy=o.vy||0; p.drag=o.drag||0; p.g=o.g||0; p.age=-(o.delay||0); p.life=o.life||0.5;
    p.r0=o.r0!=null?o.r0:4; p.r1=o.r1!=null?o.r1:p.r0; p.ease=o.ease||0; p.a=o.a!=null?o.a:1; p.fi=o.fi||0; p.ap=o.ap||1; p.c=o.c||C.white;
    p.rot=o.rot||0; p.vr=o.vr||0; p.len=o.len||0; p.gy=o.gy!=null?o.gy:1e9; p.bounce=o.bounce||0; p.trail=o.trail||0; p.tt=0; p.sy=o.sy||1; p.lw=o.lw||2;
    p.w2=o.w2||0; p.lx=o.x; p.ly=o.y; p.space=!!o.space; p.rise=o.rise||0; p.add=o.add!=null?o.add:LAYER[p.mode]===2; p.layer=o.layer!=null?o.layer:(p.add?2:LAYER[p.mode]);
    if(p.mode===SMOKE) smN++;
    if(n>MAX*0.45&&(p.mode===SMOKE||p.mode===SPARK)) p.life*=clamp(1.5-1.1*n/MAX,0.45,1);   // 混んだら煙と火花を早めに消す
    return p; }
  function decal(o){ const d=decN<DEC_MAX?(dec[decN++]={}):dec[(rnd()*DEC_MAX)|0]; Object.assign(d,{age:0,life:o.life||6,x:o.x,y:o.y,rx:o.rx,ry:o.ry,a:o.a||0.5,c:o.c||[20,16,14],cracks:o.cracks||0,seed:rnd()*1000,glow:o.glow||0}); }
  // gate: 呼ぶ側が「ゆれ・止め」を許すか（{shake:倍率 0..1, stop:true/false}）。時間差の爆発・弾の着弾にも引き継ぐ
  let gate=null; function run(g,f){ const p=gate; gate=g; try{ return f(); } finally{ gate=p; } }
  function kick(v){ if(gate){ if(!gate.shake) return; v*=gate.shake; } trauma=Math.min(1,Math.max(trauma,v)); }
  function shake(w,mul=1){ if(w<0.3) return; if(gate){ if(!gate.shake) return; mul*=gate.shake; } trauma=Math.min(1,Math.max(trauma,Math.pow(w,1.3)*mul)); }   // ゲーム用: 足し算しない（その瞬間いちばん強いゆれだけ）
  function stop(w){ if(gate&&!gate.stop) return; const h=dial(w).hitstop; if(h<=0) return; if(hsCool>0&&h<=hitstop+0.02) return; hitstop=Math.max(hitstop,h); hsCool=0.35; }   // 連続で止まらない
  function after(t,f){ timers.push({t,f,g:gate}); }
  const M=o=>o.medium||'land', S=o=>(o.s||1)*(o.surface==='human'?0.5:1);
  const dirOf=o=>o.dir!=null?o.dir:-Math.PI/2;   // 弾の進む向き（ラジアン）。跳ねる粒は逆向き

  // ---------- 部品 ----------
  function flashGlow(x,y,r,c,life=0.08,a=1){ add({mode:GLOW,x,y,r0:r,r1:r*0.6,life,c,a,ap:2}); }
  function sparks(x,y,k,o,{spd=260,spread=1.2,c=C.spark,len=0.035,g=500,life=0.32,size=1.2}={}){ const s=S(o), sp=M(o)==='space', d=dirOf(o)+Math.PI;
    for(let i=0;i<k;i++){ const a=d+rr(-spread,spread), v=spd*s*rr(0.4,1.2); add({mode:SPARK,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(sp?0:spd*0.2*s),g:sp?0:g*s,drag:sp?0.3:2.2,life:life*rr(0.5,1.2),r0:size*s,r1:size*s*0.4,c,len,space:sp}); } }
  function smokePuffs(x,y,k,o,{r=8,life=1,c=C.smoke,a=0.55,rise=22,spread=10,vx=0,dark=false}={}){ const s=S(o), sp=M(o)==='space';
    if(sp){ k=Math.ceil(k*0.35); life*=0.4; a*=0.5; rise=0; }
    for(let i=0;i<k;i++) add({mode:SMOKE,x:x+rr(-spread,spread)*s,y:y+rr(-spread,spread)*0.6*s,vx:(vx+rr(-10,10))*s,vy:-rise*s*rr(0.5,1.1),drag:sp?0.2:0.8,life:life*rr(0.7,1.3),r0:r*s*rr(0.5,0.8),r1:r*s*rr(1.6,2.6),ease:1,a:a*rr(0.7,1),fi:0.12,c:dark?C.dsmoke:c,rot:rnd()*TAU,delay:rr(0,0.06*life)}); }
  function ring(x,y,r1,o,{c=[255,230,180],life=0.35,lw=3,a=0.8,flat=true}={}){ const s=S(o), sy=(flat&&M(o)!=='space'&&o.surface!=='barrier'&&o.air!==true)?0.42:1;
    add({mode:RING,x,y,r0:r1*0.15*s,r1:r1*s,ease:1,life,c,a,lw:lw*s,sy,ap:1.5}); }
  function debris(x,y,k,o,{spd=200,c=C.metal,size=3,trail=0,life=1.4,up=1}={}){ const s=S(o), sp=M(o)==='space', gy=(o.gy!=null?o.gy:y+6*s);
    for(let i=0;i<k;i++){ const a=-Math.PI/2+rr(-1.25,1.25)*(sp?2.5:1), v=spd*s*rr(0.35,1.15); const col=c[(rnd()*c.length)|0];
      add({mode:CHUNK,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*up,g:sp?0:620*s,drag:sp?0.05:0.4,life:life*rr(0.7,1.3)*(sp?1.8:1),r0:size*s*rr(0.6,1.4),r1:size*s*rr(0.5,1.1),c:col,rot:rnd()*TAU,vr:rr(-14,14),gy,bounce:0.35,trail:trail&&rnd()<0.35?trail:0,space:sp,ap:3}); } }
  function drops(x,y,k,o,{spd=140,c=C.goo,size=2.2,up=0.8,spread=1.1,g=600,life=0.6}={}){ const s=S(o), sp=M(o)==='space', d=dirOf(o)+Math.PI;
    for(let i=0;i<k;i++){ const a=d+rr(-spread,spread), v=spd*s*rr(0.4,1.2); add({mode:DROP,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-spd*up*0.6*s,g:sp?0:g*s,drag:sp?0.2:1,life:life*rr(0.6,1.2),r0:size*s*rr(0.7,1.3),r1:size*s*0.6,c:colAt(c,rnd()),gy:o.gy!=null?o.gy:1e9}); } }
  // 地面・水・宇宙・バリアの「当たった面」の付け足し
  function surfaceBits(x,y,w,o,big){ const s=S(o), D=dial(w), m=M(o), sf=o.surface||'armor';
    if(sf==='barrier'){ add({mode:HEX,x,y,r0:6*s,r1:(16+50*w)*s,ease:1,life:0.35+0.45*w,c:[120,220,255],a:0.9,lw:(1+1.5*w)*s,w2:(3.5+2*w)*s}); flashGlow(x,y,(10+40*w)*s,[120,220,255],0.12,0.8); ring(x,y,(16+70*w),o,{c:[150,230,255],life:0.3+0.4*w,lw:2+3*w}); return 'absorb'; }
    if(m==='water'||sf==='water'){ // 水しぶきの柱
      const k=cnt(8+50*w,w), H=(60+420*w*w);
      for(let i=0;i<k;i++){ const v=Math.sqrt(H*2*700)*s*rr(0.35,1.05); const a=-Math.PI/2+rr(-0.35,0.35)*(1-0.5*w);
        add({mode:DROP,x:x+rr(-4,4)*s*(1+6*w),y,vx:Math.cos(a)*v*0.6,vy:Math.sin(a)*v,g:700*s,drag:0.5,life:rr(0.5,1)*(0.5+1.6*w),r0:(1.6+3.5*w)*s*rr(0.6,1.4),r1:(1+2*w)*s,c:colAt(C.water,rnd()),gy:y+2*s}); }
      ring(x,y,(10+90*w),o,{c:[210,240,255],life:0.6+1.4*w,lw:1.5+3*w,a:0.7}); if(w>0.3) ring(x,y,(6+60*w),o,{c:[210,240,255],life:0.9+1.6*w,lw:1+2*w,a:0.5});
      smokePuffs(x,y-H*0.4*s,cnt(2+10*w,w),o,{r:6+18*w,life:0.8+1.5*w,c:[[235,245,255],[200,215,230]],a:0.4,rise:16,spread:8+20*w}); return 'water'; }
    if(sf==='flesh'){ drops(x,y,cnt(3+30*w,w),o,{spd:120+260*w,size:1.6+3*w}); flashGlow(x,y,(4+16*w)*s,[220,255,120],0.08,0.6);
      if(big) decal({x,y:o.gy!=null?o.gy:y,rx:(6+40*w)*s,ry:(2.5+16*w)*s,a:0.45,c:C.gooDark,life:5}); return 'flesh'; }
    if(sf==='human'){ add({mode:PLUS,x,y,r0:6*s,r1:3*s,life:0.18,c:[255,255,255],a:1,rot:rnd()}); smokePuffs(x,y,2,o,{r:3,life:0.35,c:[[230,225,215],[200,195,190]],a:0.5,rise:10,spread:2}); return 'human'; }
    if(sf==='ground'){ const k=cnt(2+14*w,w); smokePuffs(x,y,k,o,{r:4+22*w,life:0.5+D.smoke*0.7,c:C.dust,a:0.65,rise:12+18*w,spread:3+30*w});
      debris(x,y,cnt(2+12*w,w),o,{spd:90+260*w,c:[[120,96,70],[90,72,54],[150,124,90]],size:1.5+2.5*w,life:0.9});
      if(w>0.2) decal({x,y,rx:(4+46*w)*s,ry:(1.8+18*w)*s,a:0.35+0.3*w,c:[40,30,22],life:3+6*w,cracks:w>0.6?5:0}); return 'ground'; }
    // armor（ロボット・殻・金属）
    sparks(x,y,cnt(D.sparks,w),o,{spd:180+400*w}); return 'armor'; }

  // ---------- 着弾の種類 ----------
  const K={};
  // 速い弾（機関銃・ガトリング・拳銃）。小さく・くっきり・すぐ消える
  K.bullet=(x,y,o)=>{ const w=o.w, s=S(o), al=o.alien, sf=o.surface||'armor';
    flashGlow(x,y,(5+10*w)*s,al?[150,250,255]:[255,240,190],0.06+0.04*w,0.95);
    add({mode:PLUS,x,y,r0:(3.5+5*w)*s,r1:(2+3*w)*s,life:0.07,c:al?[200,255,255]:[255,255,225],a:1,rot:rnd(),w2:4,layer:2});   // くっきりした「チッ」
    if(sf==='armor') sparks(x,y,cnt(3+8*w,w),o,{spd:220+150*w,life:0.18+0.12*w,c:al?C.alien:C.spark,size:1.1});
    else if(sf==='flesh'){ drops(x,y,cnt(3+6*w,w),o,{spd:120,size:1.8,life:0.4}); flashGlow(x,y,(4+6*w)*s,al?[150,250,255]:[220,255,120],0.07,0.7); if(al) sparks(x,y,2,o,{c:C.alien,spd:160,life:0.15,size:0.8}); }
    else if(sf==='ground'){ smokePuffs(x,y,cnt(1+2*w,w),o,{r:3+4*w,life:0.4,c:C.dust,a:0.6,rise:14,spread:2}); debris(x,y,cnt(1+2*w,w),o,{spd:90,c:[[120,96,70],[90,72,54]],size:1.2,life:0.5}); }
    else surfaceBits(x,y,w*0.5,o,false);
    if(w>0.3){ smokePuffs(x,y,cnt(1+2*w,w),o,{r:3+6*w,life:0.4+0.4*w,a:0.35,rise:15,spread:2}); shake(w,0.5); } };
  // 1発の重い弾（狙撃銃・大口径の実弾）。貫く閃光＋輪＋破片
  K.heavy=(x,y,o)=>{ const w=o.w, s=S(o), D=dial(w), al=o.alien; const hc=al?C.alien:C.hot;
    flashGlow(x,y,D.size*1.1*s,hc[1],0.08+0.08*w,0.9); flashGlow(x,y,D.size*0.6*s,[255,255,255],0.06,1);
    sparks(x,y,cnt(D.sparks*1.2,w),o,{spd:260+500*w,c:al?C.alien:C.spark,len:0.05,size:1.4+w});
    if(D.ring) add({mode:RING,x,y,r0:D.size*0.3*s,r1:D.size*1.5*s,ease:1,life:0.14+0.14*w,c:al?[140,240,255]:[255,236,200],a:0.8,lw:(1.5+3*w)*s,sy:1,ap:1.5});
    surfaceBits(x,y,w*0.7,o,true); smokePuffs(x,y,cnt(2+6*w,w),o,{r:3+D.size*0.3,life:D.smoke*0.6,a:0.4,rise:18,spread:3});
    if((o.surface||'armor')==='armor') debris(x,y,cnt(D.debris*0.5,w),o,{spd:160+260*w,size:1.6+2*w});
    shake(w); stop(w); flash=Math.max(flash,D.flash*0.6); };
  // 散弾: 円錐の中に小さな着弾がばらける
  K.shotgun=(x,y,o)=>{ const k=o.pellets||6, s=S(o), sp=(10+16*o.w)*s; flashGlow(x,y,sp*0.9,[255,230,170],0.07,0.6);
    for(let i=0;i<k;i++){ const dx=rr(-sp,sp), dy=rr(-sp,sp)*0.6; after(rr(0,0.045),()=>K.bullet(x+dx,y+dy,Object.assign({},o,{w:Math.min(0.35,o.w*0.8)}))); }
    smokePuffs(x,y,cnt(3,o.w),o,{r:5,life:0.5,a:0.3,spread:sp/s}); shake(o.w,0.6); };
  // 爆発（ロケット・ミサイル・手榴弾・砲弾・プラズマ）
  K.explosion=(x,y,o)=>{ const w=o.w, s=S(o), D=dial(w), m=M(o), v=o.variant||'rocket', R=D.size*s;
    const pal=v==='plasma'?C.alienFire:C.fire, sp=m==='space';
    flash=Math.max(flash,D.flash); shake(w,v==='missile'?0.8:1); stop(w);
    const gy=o.gy!=null?o.gy:y, low=gy-y<R*0.9;   // 地面の近くで爆ぜたか
    flashGlow(x,y,R*1.5,pal[1],0.08+0.06*w,0.8); flashGlow(x,y,R*0.8,[255,255,255],0.06+0.04*w,1);
    // 火の玉: ふつうの重ね（白飛びしない）で、白→橙→赤→煙へ色が冷える玉を重ねる
    const nb=cnt(5+16*w,w), fb=v==='plasma'?C.pball:C.fball;
    for(let i=0;i<nb;i++){ const a=rnd()*TAU, d=R*rr(0,0.5), vv=R*rr(0.8,2.2)*(sp?1.3:1), lf=rr(0.4,0.75)*(0.6+1.0*w);
      add({mode:SMOKE,x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*0.8,vx:Math.cos(a)*vv,vy:Math.sin(a)*vv*0.75-(sp?0:R*0.5),drag:4,rise:sp?0:R*0.6,life:lf,r0:R*rr(0.3,0.5),r1:R*rr(0.75,1.05),ease:1,c:fb,a:0.95,ap:0.6,delay:rr(0,0.04+0.06*w),layer:1}); }
    for(let i=0;i<cnt(2+4*w,w);i++) add({mode:GLOW,x:x+rr(-0.3,0.3)*R,y:y+rr(-0.3,0.3)*R,r0:R*0.55,r1:R*0.8,ease:1,life:0.12+0.12*w,c:pal,a:0.9,delay:rr(0,0.05)});  // 芯の光
    if(v==='missile'){ for(let i=0;i<cnt(3,w);i++) add({mode:GLOW,x:x+rr(-R,R)*0.5,y:y+rr(-R,R)*0.4,r0:R*0.3,r1:R*0.6,ease:1,life:0.2,c:C.hot,a:0.8,delay:0.03+rnd()*0.1}); }
    if(D.ring||sp) add({mode:RING,x,y,r0:R*0.4,r1:R*(sp?2.4:1.7),ease:1,life:0.16+0.14*w,c:v==='plasma'?[160,255,240]:[255,236,190],a:0.8,lw:(1.5+3.5*w)*s,sy:1,ap:1.5});   // 空気の衝撃波
    if(w>0.5&&!sp&&low) ring(x,gy,R*2.6/s,o,{c:[255,240,215],life:0.35+0.35*w,lw:1.5+3*w,a:0.45});   // 地をはう輪
    sparks(x,y,cnt(D.sparks*(v==='plasma'?0.6:1),w),o,{spd:300+600*w,c:v==='plasma'?C.alien:C.spark,len:0.05,spread:Math.PI,size:1.3+1.2*w,life:0.4+0.4*w});
    const sm=m==='water'?0.4:1;
    if(v!=='plasma') smokePuffs(x,y-R*0.4,cnt((3+12*w)*sm,w),o,{r:R/s*0.42,life:D.smoke,dark:v==='grenade'||w>0.6,a:0.5,rise:14+26*w,spread:R/s*0.55});
    if(v==='grenade'||o.surface==='ground') debris(x,y,cnt(D.debris*(v==='grenade'?1.2:0.7),w),o,{spd:180+360*w,c:[[110,90,66],[80,64,50],[140,118,88]],size:1.8+3*w,up:1.2});
    debris(x,y,cnt(D.debris*(v==='grenade'?0.4:0.7),w),o,{spd:200+400*w,size:1.6+3*w,trail:w>0.5?0.05:0,life:1+w});
    if(m==='water') surfaceBits(x,y,w,o,true);
    else if(o.surface==='flesh') drops(x,y,cnt(4+24*w,w),o,{spd:150+300*w,size:1.8+3*w});
    else if(o.surface==='barrier') surfaceBits(x,y,w,o,true);
    if(!sp&&m!=='water'&&D.decal&&o.surface!=='barrier'&&o.surface!=='flesh') decal({x,y:o.gy!=null?o.gy:y,rx:R*1.4,ry:R*0.4,a:0.5,c:[22,18,16],life:4+8*w,cracks:w>0.6?6:0,glow:w>0.5?1:0});
    if(!sp&&m!=='water'&&w>0.6){ for(let i=0;i<cnt(2+4*w,w);i++) add({mode:GLOW,x:x+rr(-R,R)*1.1,y:(o.gy!=null?o.gy:y)-rr(0,3)*s,r0:R*0.05,r1:R*0.08,life:rr(0.8,2.2)*w,c:[[255,200,90],[255,110,30],[120,30,10]],a:0.7,fi:0.1,delay:0.15,vy:-6*s}); }  // 残り火
  };
  // 光線（重い）: 太い帯＋着弾の爆ぜ
  K.beam=(x,y,o)=>{ const w=o.w, s=S(o), D=dial(w), pal=o.laser?C.laser:C.beam, R=D.size*s;
    if(o.x0!=null) beams.push({x0:o.x0,y0:o.y0,x1:x,y1:y,w:(o.laser?1.2+2*w:2+14*w)*s,age:0,life:(o.laser?0.1:0.18)+0.5*w,c:pal});
    flashGlow(x,y,R*1.2,pal[1],0.12+0.3*w,0.8); flashGlow(x,y,R*0.6,[255,255,255],0.1+0.3*w,1);
    sparks(x,y,cnt(D.sparks*0.8,w),o,{spd:200+450*w,c:pal,len:0.04,spread:1.6,size:1+w});
    if(w>0.35){ add({mode:RING,x,y,r0:R*0.3,r1:R*1.4,ease:1,life:0.16+0.16*w,c:pal[1],a:0.8,lw:(1.5+3*w)*s,sy:1,ap:1.5}); smokePuffs(x,y,cnt(2+6*w,w),o,{r:R/s*0.3,life:D.smoke*0.6,a:0.35,rise:22,spread:3}); }
    if(w>0.6) K.explosion(x,y,Object.assign({},o,{w:w*0.8,variant:'plasma'}));
    else { surfaceBits(x,y,w*0.6,o,w>0.4); shake(w); stop(w*0.95); }
    if(o.surface==='ground'||o.surface==='armor') decal({x,y:o.gy!=null?o.gy:y,rx:(3+R*0.8),ry:(1.5+R*0.3),a:0.5,c:[30,24,22],life:2+4*w,glow:1}); };
  K.laser=(x,y,o)=>K.beam(x,y,Object.assign({},o,{laser:true,w:Math.min(o.w,0.55)}));
  // 火炎放射: 撃っている間 毎フレーム呼ぶ（dt を渡す）。x0,y0 = 口、x,y = 狙い
  K.flame=(x,y,o)=>{ const w=o.w, s=S(o), dt=o.dt||1/30, x0=o.x0!=null?o.x0:x-60*s, y0=o.y0!=null?o.y0:y; const dx=x-x0, dy=y-y0, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L;
    const k=cnt(dt*(70+120*w),w), sp=M(o)==='space', pal=o.alien?C.alienFire:C.fire;
    for(let i=0;i<k;i++){ const v=L*rr(1.7,2.3), j=rr(-0.12,0.12); const tl=rr(0.4,0.55);
      add({mode:GLOW,x:x0,y:y0,vx:(ux-uy*j)*v,vy:(uy+ux*j)*v,drag:1.2,life:tl,r0:3*s,r1:(9+12*w)*s,ease:1,c:pal,a:0.85,rise:sp?0:40*s}); }
    if(rnd()<dt*14) smokePuffs(x,y-6*s,1,o,{r:6+6*w,life:0.9,dark:true,a:0.4,rise:30,spread:6});
    if(rnd()<dt*8) sparks(x,y,2,o,{spd:120,c:pal,size:0.9,life:0.35});
    if(rnd()<dt*3) decal({x,y:o.gy!=null?o.gy:y,rx:10*s,ry:4*s,a:0.25,c:[30,22,18],life:3}); };
  // 近接: 鈍器（拳・ハンマー・メイス・杭）
  K.blunt=(x,y,o)=>{ const w=o.w, s=S(o), D=dial(w), R=D.size*s, gy=o.gy!=null?o.gy:y+10*s;
    flashGlow(x,y,R*1.1,[255,240,210],0.07+0.05*w,0.9);
    add({mode:PLUS,x,y,r0:(6+26*w)*s,r1:(9+34*w)*s,ease:1,life:0.09+0.07*w,c:[255,255,240],a:1,rot:rnd(),w2:8});            // ガツン（とげの星）
    add({mode:RING,x,y,r0:R*0.3,r1:R*1.3,ease:1,life:0.14+0.12*w,c:[255,245,220],a:0.85,lw:(1.5+3*w)*s,sy:1,ap:1.5});
    if(w>0.45){ ring(x,gy,R*2.4/s,o,{c:[255,230,190],life:0.35+0.4*w,lw:2+6*w,a:0.6});
      smokePuffs(x,gy,cnt(4+16*w,w),o,{r:R/s*0.3,life:D.smoke*0.7,c:M(o)==='space'?C.smoke:C.dust,a:0.6,rise:6,spread:R/s*1.0});
      debris(x,gy,cnt(D.debris,w),o,{spd:160+300*w,c:[[120,96,70],[90,72,54],[150,124,90]],size:2+3*w,up:1.3,gy});
      decal({x,y:gy,rx:R*1.2,ry:R*0.4,a:0.5,c:[30,24,20],life:5+6*w,cracks:w>0.55?7:3}); }
    if(o.pierce) sparks(x,y,cnt(D.sparks,w),o,{spd:300+400*w,len:0.06,spread:0.35,size:1.6});
    surfaceBits(x,y,w*0.6,o,w>0.4); shake(w,1.1); stop(Math.min(1,w*1.08)); flash=Math.max(flash,D.flash*0.5); };
  // 近接: 刃（ブレード・のこ・ワイヤー）。斬った弧＋線に沿った火花
  K.blade=(x,y,o)=>{ const w=o.w, s=S(o), R=(12+50*w)*s, a0=o.dir!=null?o.dir-1.1:-2.4;
    arcs.push({x,y,r:R,a0,a1:a0+2.2,age:0,life:0.12+0.15*w,w:(3+8*w)*s,c:o.alien?[150,250,255]:[255,255,240]});
    flashGlow(x,y,R*0.5,[255,255,240],0.06,0.7);
    const sf=o.surface||'armor';
    if(sf==='flesh') drops(x,y,cnt(4+18*w,w),o,{spd:140+200*w,spread:0.6,size:1.4+2*w});
    else if(sf!=='human') sparks(x,y,cnt(4+14*w,w),o,{spd:220+300*w,spread:0.5,len:0.05,c:o.alien?C.alien:C.spark});
    else surfaceBits(x,y,w,o,false);
    shake(w,0.8); stop(w*0.9); };
  // 衝撃波（衝撃波ハサミなど）
  K.shock=(x,y,o)=>{ const w=o.w, s=S(o), R=dial(w).size*s; for(let i=0;i<3;i++) add({mode:RING,x,y,r0:R*0.2,r1:R*(2+i*0.8),ease:1,life:0.3+0.1*i,c:[200,240,255],a:0.7,lw:(2+4*w)*s,sy:1,delay:i*0.05});
    surfaceBits(x,y,w*0.6,o,true); shake(w); stop(w*0.9); };
  // 妨害の波
  K.jam=(x,y,o)=>{ const s=S(o), R=(o.r||120)*s; for(let i=0;i<3;i++) add({mode:RING,x,y,r0:R*0.1,r1:R,ease:1,life:0.9,c:[190,120,255],a:0.5,lw:2*s,sy:1,delay:i*0.25}); };
  // 修理が当たる: 緑の粒と「＋」が上がる。ダメージの演出は出さない
  K.repair=(x,y,o)=>{ const w=o.w, s=S(o);
    for(let i=0;i<cnt(3+8*w,w);i++) add({mode:PLUS,x:x+rr(-10,10)*s,y:y+rr(-6,6)*s,vy:-rr(20,45)*s,drag:1,life:rr(0.5,0.9),r0:(2.5+3*w)*s,r1:1.5*s,c:[140,255,180],a:0.95,fi:0.15,delay:rr(0,0.2)});
    for(let i=0;i<cnt(4+8*w,w);i++) add({mode:GLOW,x:x+rr(-12,12)*s,y:y+rr(-8,8)*s,vy:-rr(10,40)*s,life:rr(0.3,0.7),r0:2*s,r1:4*s,c:C.heal,a:0.8,delay:rr(0,0.25)});
    add({mode:RING,x,y,r0:4*s,r1:(14+16*w)*s,ease:1,life:0.5,c:[120,255,170],a:0.6,lw:1.5*s,sy:1}); };
  // バリアが弾を吸う: 六角の波紋（弾の強さで大きさが変わる）
  K.barrier=(x,y,o)=>surfaceBits(x,y,o.w,Object.assign({},o,{surface:'barrier'}),true);
  // 人間（少年・少女・犬）向けの小さな当たり。ロボットより明確に小さく、血は出さない
  K.human=(x,y,o)=>{ const w=Math.min(o.w,0.5), s=(o.s||1)*0.5; add({mode:PLUS,x,y,r0:(5+6*w)*s,r1:2*s,life:0.14,c:[255,255,255],a:1,rot:rnd()});
    flashGlow(x,y,(4+6*w)*s,[255,240,220],0.06,0.8); smokePuffs(x,y,2,Object.assign({},o,{s}),{r:3,life:0.35,c:[[235,230,220],[205,200,195]],a:0.45,rise:8,spread:2});
    if(o.w>0.5) shake(0.35,0.5); };
  // ロボットの撃破（大爆発）。敵の「焦げて崩れる」とは別物
  K.robotDeath=(x,y,o)=>{ const s=(o.s||1)*(o.big||1), m=M(o), sp=m==='space', H=40*s, gy=o.gy!=null?o.gy:y+H*0.5, oo=Object.assign({},o,{s,gy});
    for(let i=0;i<3;i++) after(i*0.11,()=>{ const px=x+rr(-0.3,0.3)*H, py=y+rr(-0.35,0.2)*H; flashGlow(px,py,10*s,[255,230,170],0.1,1); sparks(px,py,cnt(8,0.6),oo,{spd:260,spread:Math.PI}); smokePuffs(px,py,2,oo,{r:5,life:0.8,dark:true,a:0.5}); kick(Math.min(1,trauma+0.15)); });
    after(0.36,()=>{ K.explosion(x,y,Object.assign({},oo,{w:0.92,s,variant:'rocket',surface:sp?'armor':(m==='water'?'water':'ground')}));
      debris(x,y,cnt(10,1),oo,{spd:420,size:5,trail:sp?0:0.04,life:2.2,c:[[60,62,70],[200,190,170],[40,60,110],[90,92,100]]});
      add({mode:GLOW,x,y,r0:H*1.5,r1:H*4,ease:1,life:0.25,c:[255,255,255],a:0.6}); flash=Math.max(flash,0.45); kick(1); if(!gate||gate.stop){ hitstop=Math.max(hitstop,0.12); hsCool=0.4; } });
    after(0.6,()=>K.explosion(x+rr(-0.3,0.3)*H,y-H*0.2,Object.assign({},oo,{w:0.6,s,variant:'missile',surface:'armor'})));
    if(!sp&&m!=='water'){ // 燃え残りと黒煙の柱
      for(let t=0.7;t<3.6;t+=0.12) after(t,()=>{ add({mode:GLOW,x:x+rr(-8,8)*s,y:gy-rr(0,6)*s,vy:-24*s,life:rr(0.4,0.7),r0:4*s,r1:9*s,ease:1,c:C.fire,a:0.7});
        smokePuffs(x,gy-10*s,1,oo,{r:10,life:2.2,dark:true,a:0.55,rise:34,spread:6,vx:8}); }); }
    if(m==='water') for(let t=0.8;t<2.5;t+=0.2) after(t,()=>smokePuffs(x,gy,1,oo,{r:10,life:1.5,c:[[240,245,250],[200,210,220]],a:0.35,rise:26,spread:8})); };

  // 敵（異星生物）の撃破: 青い火の玉＋体液がはじける（仮。焦げて崩れるアニメは別）
  K.enemyDeath=(x,y,o)=>{ const s=(o.s||1)*(o.big||1), oo=Object.assign({},o,{s,alien:true});
    K.explosion(x,y,Object.assign({},oo,{w:0.6,variant:'plasma',surface:'flesh'})); K.heavy(x,y-6*s,Object.assign({},oo,{w:0.55,surface:'flesh'})); };

  // ---------- 弾（飛んでいく途中） ----------
  // kind: tracer（弾の筋）, shell（重い弾）, rocket（煙の尾）, missile（曲がって飛ぶ）, grenade（放物線）, needle（宇宙・異星の速い弾）
  function fire(proj_kind,x0,y0,x1,y1,o,onHit){ const s=S(o), d=Math.hypot(x1-x0,y1-y0);
    const spd={tracer:1400,shell:900,rocket:420,missile:380,grenade:300,needle:1200,stone:320}[proj_kind]||900;
    const p={k:proj_kind,x0,y0,x1,y1,t:0,dur:Math.max(0.05,d/(spd*s)),arc:proj_kind==='grenade'||proj_kind==='stone'?d*0.35:proj_kind==='missile'?rr(-0.4,0.4)*d+(-0.25*d):0,
      side:rr(-1,1)*d*0.25,o,onHit,x:x0,y:y0,px:x0,py:y0,tt:0,w:o.w,delay:o.delay||0,g:gate}; proj.push(p); return p; }
  function projPos(p,u){ let x=lerp(p.x0,p.x1,u), y=lerp(p.y0,p.y1,u);
    if(p.k==='grenade'||p.k==='stone') y-=4*p.arc*u*(1-u);
    else if(p.k==='missile'){ const b=4*u*(1-u); y+=p.arc*b*0.6; x+=p.side*b*(1-u); } return [x,y]; }

  // ---------- 武器の行から ----------
  function fromWeapon(r,x0,y0,x1,y1,o={}){ return run(o.gate!==undefined?o.gate:gate,()=>fromWeapon_(r,x0,y0,x1,y1,o)); }
  function fromWeapon_(r,x0,y0,x1,y1,o){ const c=classify(r), dir=Math.atan2(y1-y0,x1-x0);
    const oo=Object.assign({w:c.w,alien:c.alien,variant:c.variant,pellets:c.pellets,dir,x0,y0},o);
    if(c.kind!=='flame'&&c.kind!=='repair'&&c.kind!=='barrier'&&c.proj) muzzle(x0,y0,oo,c);
    if(c.kind==='beam'||c.kind==='laser'||c.kind==='flame'||!c.proj){ hit(c.kind,x1,y1,oo); return c; }
    if(c.kind==='explosion'&&c.variant==='missile'&&c.pellets>1){ const k=Math.min(c.pellets,12), each=clamp(c.w*Math.pow(1/c.pellets,0.18),0.2,1);   // 群れのミサイル: 1発ずつは少し小さい
      for(let i=0;i<k;i++){ const tx=x1+rr(-30,30)*S(o), ty=y1+rr(-12,12)*S(o); fire('missile',x0,y0,tx,ty,Object.assign({},oo,{delay:i*0.06}),()=>hit('explosion',tx,ty,Object.assign({},oo,{w:each}))); } return c; }
    fire(c.proj,x0,y0,x1,y1,oo,()=>hit(c.kind,x1,y1,oo)); return c; }
  function muzzle(x,y,o,c){ const s=S(o), w=o.w, al=o.alien, col=al?[120,240,255]:[255,220,140];
    flashGlow(x,y,(4+22*w)*s,col,0.05+0.06*w,0.95); flashGlow(x,y,(2+8*w)*s,[255,255,255],0.04,1);
    if(w>0.4&&M(o)!=='space') smokePuffs(x,y,cnt(1+5*w,w),o,{r:3+10*w,life:0.4+1*w,a:0.35,rise:10,spread:2});
    if(w>0.55){ shake(w,0.35); } }
  function hit(kind,x,y,o){ const f=K[kind]; if(!f) throw new Error('BotFx: unknown kind '+kind); const oo=Object.assign({w:0.5},o); oo.w=intensity(oo.w); run(oo.gate!==undefined?oo.gate:gate,()=>f(x,y,oo)); }

  // ---------- 更新 ----------
  function update(dtReal){ const t0=performance.now(); dtReal=Math.min(dtReal,0.1);
    // 止め: ゲームは止まり（timeScale=0）、演出も 0.12 倍でゆっくり進む＝着弾の瞬間が見える
    let dt=dtReal; if(hitstop>0){ hitstop-=dtReal; dt=dtReal*0.12; } hsCool=Math.max(0,hsCool-dtReal); time+=dt;
    for(let i=timers.length-1;i>=0;i--){ const T=timers[i]; T.t-=dt; if(T.t<=0){ timers.splice(i,1); run(T.g,T.f); } }
    for(let i=proj.length-1;i>=0;i--){ const p=proj[i]; if(p.delay>0){ p.delay-=dt; continue; } p.t+=dt; const u=Math.min(1,p.t/p.dur); p.px=p.x; p.py=p.y; [p.x,p.y]=projPos(p,u);
      const s=S(p.o); p.tt-=dt;
      if(p.k==='rocket'||p.k==='missile'){ const seg=Math.hypot(p.x-p.px,p.y-p.py), step=2.5*s/Math.max(0.25,budget(0.3)), k=Math.min(40,Math.floor((seg+(p.carry||0))/step)); p.carry=(seg+(p.carry||0))-k*step;
        for(let j=1;j<=k;j++){ const f=j/k, X=p.px+(p.x-p.px)*f, Y=p.py+(p.y-p.py)*f;
          if(M(p.o)!=='space') add({mode:SMOKE,x:X,y:Y,vx:rr(-6,6)*s,vy:-rr(4,10)*s,drag:1,life:(p.k==='rocket'?0.9:0.6)*rr(0.7,1.2),r0:1.6*s,r1:(p.k==='rocket'?7:4.5)*s,ease:1,a:0.22,fi:0.08,c:[[210,208,204],[150,150,152]],age0:(1-f)*dt});
          if(j===k) add({mode:GLOW,x:p.x,y:p.y,life:0.08,r0:4.5*s,r1:2*s,c:C.hot,a:0.9}); } }
      if(u>=1){ proj.splice(i,1); if(p.onHit) run(p.g,p.onHit); } }
    for(let i=0;i<n;i++){ const p=P[i]; p.age+=dt; if(p.age<0) continue;
      if(p.age>=p.life){ if(p.mode===SMOKE) smN--; n--; const q=P[i]; P[i]=P[n]; P[n]=q; i--; continue; }
      const dg=Math.max(0,1-p.drag*dt); p.vx*=dg; p.vy*=dg; p.vy+=p.g*dt-(p.rise?p.rise*dt*0.6:0); p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.vr*dt;
      if(p.y>p.gy&&p.vy>0){ p.y=p.gy; if(p.bounce&&Math.abs(p.vy)>40){ p.vy*=-p.bounce; p.vx*=0.6; p.vr*=0.5; } else { p.vy=0; p.vx*=0.5; p.g=0; p.vr=0; p.drag=4; p.trail=0; if(p.mode===DROP){ p.life=Math.min(p.life,p.age+0.15); } } }
      if(p.trail){ const dd=Math.hypot(p.x-p.lx,p.y-p.ly); if(dd>Math.max(1.5,p.r0*0.6)){ p.lx=p.x; p.ly=p.y; const u=p.age/p.life; if(u<0.3&&rnd()<budget(0.1)){ add({mode:GLOW,x:p.x,y:p.y,life:0.12,r0:p.r0*1.4,r1:p.r0*0.4,c:C.fire,a:0.55*(1-u/0.3)}); } } } }
    for(let i=beams.length-1;i>=0;i--){ beams[i].age+=dt; if(beams[i].age>=beams[i].life) beams.splice(i,1); }
    for(let i=arcs.length-1;i>=0;i--){ arcs[i].age+=dt; if(arcs[i].age>=arcs[i].life) arcs.splice(i,1); }
    for(let i=0;i<decN;i++){ dec[i].age+=dt; if(dec[i].age>=dec[i].life){ dec[i]=dec[--decN]; i--; } }
    trauma=Math.max(0,trauma-dtReal*1.8); const sh=Math.min(opt.shakeMax==null?99:opt.shakeMax,trauma*trauma*18*(opt.shakeMul||1));
    shx=sh*(Math.sin(time*97.3)+Math.sin(time*41.1))*0.5; shy=sh*(Math.sin(time*83.7+1)+Math.sin(time*53.3))*0.5; flash=Math.max(0,flash-dtReal*3);
    if(n>peak) peak=n; st.updMs=performance.now()-t0;
    return hitstop>0?0:1; }

  // ---------- 描画 ----------
  function draw(ctx){ const t0=performance.now(); const m=ctx.getTransform(), A=m.a, Dd=m.d, E=m.e, F=m.f;
    ctx.save();
    // 0: 地面の焦げ跡
    for(let i=0;i<decN;i++){ const d=dec[i], u=d.age/d.life, a=d.a*(u<0.05?u/0.05:1)*(1-u*u);
      ctx.globalAlpha=a; ctx.fillStyle=`rgb(${d.c[0]},${d.c[1]},${d.c[2]})`; ctx.beginPath(); ctx.ellipse(d.x,d.y,d.rx,d.ry,0,0,TAU); ctx.fill();
      if(d.cracks){ ctx.strokeStyle='rgba(15,10,8,0.9)'; ctx.lineWidth=Math.max(1,d.rx*0.025); ctx.beginPath(); for(let k=0;k<d.cracks;k++){ const an=(k/d.cracks)*TAU+(d.seed%1)+Math.sin(k*7.3+d.seed)*0.3; ctx.moveTo(d.x+Math.cos(an)*d.rx*0.3,d.y+Math.sin(an)*d.ry*0.3); for(let j=1;j<=3;j++){ const f=0.3+j*0.3, b=an+Math.sin(d.seed+k*3+j*5)*0.25; ctx.lineTo(d.x+Math.cos(b)*d.rx*f,d.y+Math.sin(b)*d.ry*f); } } ctx.stroke(); }
      if(d.glow&&u<0.4){ ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=(0.4-u)/0.4*0.6; const sp=sprite(0,[255,120,40]); ctx.drawImage(sp,d.x-d.rx*0.7,d.y-d.ry*0.9,d.rx*1.4,d.ry*1.8); ctx.globalCompositeOperation='source-over'; } }
    for(let layer=1;layer<=2;layer++){
      ctx.globalCompositeOperation=layer===2?'lighter':'source-over';
      for(let i=0;i<n;i++){ const p=P[i]; if(p.age<0||p.layer!==layer) continue; const u=p.age/p.life;
        let a=p.a*Math.pow(1-u,p.ap); if(p.fi&&u<p.fi) a*=u/p.fi; if(a<0.01) continue;
        const e=p.ease?1-(1-u)*(1-u):u, r=p.r0+(p.r1-p.r0)*e, c=colAt(p.c,u); ctx.globalAlpha=a>1?1:a;
        switch(p.mode){
          case GLOW: case SMOKE: { const sp=sprite(p.mode===GLOW?0:1,c); ctx.drawImage(sp,p.x-r,p.y-r,2*r,2*r); break; }
          case SPARK: { const vx=p.vx, vy=p.vy, sp=Math.hypot(vx,vy)+1e-6, L=Math.max(r*2,sp*p.len)+r, cs=vx/sp, sn=vy/sp;
            ctx.setTransform(A*cs*L,Dd*sn*L,-A*sn*r*2,Dd*cs*r*2,E+A*(p.x-cs*L*0.5),F+Dd*(p.y-sn*L*0.5)); ctx.drawImage(sprite(0,c),-0.5,-0.5,1,1); ctx.setTransform(m); break; }
          case CHUNK: { const cs=Math.cos(p.rot), sn=Math.sin(p.rot); ctx.setTransform(A*cs,Dd*sn,-A*sn,Dd*cs,E+A*p.x,F+Dd*p.y); ctx.fillStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.fillRect(-r,-r*0.6,2*r,1.2*r); ctx.setTransform(m); break; }
          case DROP: { ctx.fillStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.fill(); break; }
          case RING: { ctx.strokeStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.lineWidth=p.lw*(1-u*0.7); ctx.beginPath(); ctx.ellipse(p.x,p.y,r,r*p.sy,0,0,TAU); ctx.stroke(); break; }
          case HEX: { ctx.strokeStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.lineWidth=p.lw*(1-u*0.6); const hs=p.w2||Math.max(3,r*0.2), nq=Math.min(12,Math.ceil(r/hs/1.5)+1); ctx.beginPath();
            for(let q=-nq;q<=nq;q++) for(let k=-nq;k<=nq;k++){ const cx=p.x+(q+((k&1)?0.5:0))*hs*1.75, cy=p.y+k*hs*1.5, dd=Math.hypot(cx-p.x,cy-p.y); if(Math.abs(dd-r*0.75)>hs*1.3) continue;
              for(let j=0;j<=6;j++){ const an=j/6*TAU+Math.PI/6, X=cx+Math.cos(an)*hs*0.95, Y=cy+Math.sin(an)*hs*0.95; j?ctx.lineTo(X,Y):ctx.moveTo(X,Y); } }
            ctx.stroke(); ctx.beginPath(); ctx.arc(p.x,p.y,r,0,TAU); ctx.stroke(); break; }
          case PLUS: { const cs=Math.cos(p.rot), sn=Math.sin(p.rot); ctx.setTransform(A*cs,Dd*sn,-A*sn,Dd*cs,E+A*p.x,F+Dd*p.y); ctx.fillStyle=`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
            if(p.w2){ const k=p.w2; ctx.beginPath(); for(let j=0;j<k*2;j++){ const an=j/(k*2)*TAU, rq=j&1?r*0.32:r*(j%4?0.75:1); j?ctx.lineTo(Math.cos(an)*rq,Math.sin(an)*rq):ctx.moveTo(rq,0); } ctx.closePath(); ctx.fill(); }
            else { ctx.fillRect(-r,-r*0.28,2*r,r*0.56); ctx.fillRect(-r*0.28,-r,r*0.56,2*r); } ctx.setTransform(m); break; }
        } } }
    ctx.globalCompositeOperation='lighter';
    for(const b of beams){ const u=b.age/b.life, env=u<0.12?u/0.12:Math.pow(1-(u-0.12)/0.88,1.5), w=b.w*env*(0.9+0.2*Math.sin(b.age*90)); if(w<0.2) continue; ctx.lineCap='round';
      const cols=b.c; [[3.2,0.22,cols[2]],[1.7,0.5,cols[1]],[0.6,1,cols[0]]].forEach(([k,a,c])=>{ ctx.globalAlpha=a; ctx.strokeStyle=`rgb(${c[0]},${c[1]},${c[2]})`; ctx.lineWidth=w*k; ctx.beginPath(); ctx.moveTo(b.x0,b.y0); ctx.lineTo(b.x1,b.y1); ctx.stroke(); }); }
    for(const a of arcs){ const u=a.age/a.life, g=Math.min(1,u*3); ctx.globalAlpha=1-u; ctx.strokeStyle=`rgb(${a.c[0]},${a.c[1]},${a.c[2]})`; ctx.lineCap='round';
      for(let k=0;k<3;k++){ ctx.lineWidth=a.w*(1-k*0.3)*(1-u); ctx.beginPath(); ctx.arc(a.x,a.y,a.r*(1-k*0.06),a.a0+(a.a1-a.a0)*g*0.25*k,a.a0+(a.a1-a.a0)*g); ctx.stroke(); } }
    for(const p of proj){ if(p.delay>0) continue; const s=S(p.o), w=p.w, hc=p.o.alien?[150,250,255]:[255,230,160]; const dx=p.x-p.px, dy=p.y-p.py, L=Math.hypot(dx,dy)+1e-6;
      if(p.k==='grenade'||p.k==='stone'){ ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.fillStyle=p.k==='stone'?'#8a7a66':'#3b4a2c'; ctx.beginPath(); ctx.arc(p.x,p.y,(p.k==='stone'?2.4:2.8)*s,0,TAU); ctx.fill(); ctx.globalCompositeOperation='lighter'; if(p.k==='grenade'&&(p.t*10|0)%2){ ctx.drawImage(sprite(0,[255,80,60]),p.x-3*s,p.y-3*s,6*s,6*s); } continue; }
      const tl=p.k==='tracer'||p.k==='needle'?Math.max(L*1.6,(10+20*w)*s):p.k==='shell'?Math.max(L*2,24*s):6*s, wd=(p.k==='shell'?3+5*w:p.k==='tracer'?1.4+2*w:3)*s, cs=dx/L, sn=dy/L;
      ctx.globalAlpha=0.95; ctx.setTransform(A*cs*tl,Dd*sn*tl,-A*sn*wd*2,Dd*cs*wd*2,E+A*(p.x-cs*tl*0.5),F+Dd*(p.y-sn*tl*0.5)); ctx.drawImage(sprite(0,hc),-0.5,-0.5,1,1); ctx.setTransform(m);
      ctx.drawImage(sprite(0,[255,255,255]),p.x-wd,p.y-wd,wd*2,wd*2); }
    ctx.restore(); st.drawMs=performance.now()-t0; }
  // 画面全体の白い光（重い一撃）。最後に呼ぶ: fx.drawScreen(ctx, 幅, 高さ)
  function drawScreen(ctx,W,H){ if(flash<=0.01) return; ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(0.7,flash); ctx.fillStyle='#fff8e8'; ctx.fillRect(0,0,W,H); ctx.restore(); }
  function clear(){ n=0; smN=0; beams.length=arcs.length=proj.length=timers.length=0; decN=0; trauma=hitstop=flash=0; peak=0; }
  // 被弾の反応＋足元の土ぼこり。u={x,y(足元)}。o は BotFx.hitReact と同じ＋ medium。重い時は滑った跡に土ぼこり
  function react(u,o={}){ const r=hitReact(u,o); if(r.tier>=2&&M(o)!=='space'&&u.x!=null){ const s=o.s||1, cx=Math.cos(o.dir||0)>=0?1:-1, D=r.push, wet=M(o)==='water';
      const oo={s,medium:M(o)}; for(let i=0;i<4;i++){ const tt=i*0.07; after(tt,()=>{ const X=u.x+cx*D*(1-Math.exp(-REACT.fric*tt))*0.9;
        smokePuffs(X-cx*3*s,u.y,cnt(r.tier>=3?2:1,0.6),oo,{r:3+1.5*r.tier,life:0.55+0.15*r.tier,c:wet?[[230,240,250],[200,220,235]]:C.dust,a:0.55,rise:6,spread:4,vx:-cx*14}); }); } }
    return r; }
  return { hit, fire, fromWeapon, react, classify, muzzle:(x,y,o={})=>muzzle(x,y,Object.assign({},o,{w:intensity(o.w==null?0.5:o.w)})), update, draw, drawScreen, clear, after, kinds:Object.keys(K),
    get shake(){ return [shx,shy]; }, get hitstop(){ return Math.max(0,hitstop); }, get flash(){ return flash; },
    modes:()=>{ const c=[0,0,0,0,0,0,0,0]; for(let i=0;i<n;i++) c[P[i].mode]++; return {glow:c[0],smoke:c[1],spark:c[2],chunk:c[3],ring:c[4],drop:c[5],hex:c[6],plus:c[7]}; },
    stats:()=>({alive:n,peak,max:MAX,beams:beams.length,proj:proj.length,decals:decN,timers:timers.length,spawned:st.spawned,dropped:st.dropped,updMs:st.updMs,drawMs:st.drawMs,sprites:SPR.size}) };
}
