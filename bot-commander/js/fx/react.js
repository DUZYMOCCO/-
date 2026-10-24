// BotFx の「強さ」と「被弾の反応」だけを取り出したもの（DOM を使わない。js/sim からも読む）。
// 元: new-game-rts/fx/fx.js v0.2（10/23）。中身の計算は変えていない。数字は REACT 表と dial()。
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
// ===== 強さ（ここ1か所で決める） =====
// motion_s（1発の動作時間）が長いほど・tier が高いほど・splash が広いほど強い。0..1
const LOGMIN=Math.log(0.1), LOGMAX=Math.log(15);
export function intensity(row){ if(typeof row==='number') return clamp(row,0,1);
  const m=Math.max(0.1,row.motion_s||1), mot=clamp((Math.log(m)-LOGMIN)/(LOGMAX-LOGMIN),0,1);
  return clamp(0.6*mot+0.25*clamp((row.tier||0)/50,0,1)+0.15*clamp((row.splash||0)/120,0,1),0,1); }
// w から各量を出す（大艦巨砲: 重いほど急に大きくなる指数）
export function dial(w){ return {
  size: 4+48*Math.pow(w,1.6),          // 火の玉の半径 px（s=1。ロボの背 40px。w=1 で背の1.3倍）
  shake: 18*Math.pow(w,2.4),           // 画面ゆれ px
  hitstop: w<0.5?0:0.03+(w-0.5)*0.22,  // 止め 秒（w=1 で 0.14）
  smoke: 0.3+3.2*Math.pow(w,1.5),      // 煙の残る秒
  debris: Math.round(1+26*Math.pow(w,1.5)),
  sparks: Math.round(3+22*w),
  ring: w>=0.28, flash: w>0.72?(w-0.72)*1.3:0, decal: w>=0.35 }; }

// 武器の行 → 演出の種類（bullet/heavy/explosion…）・弾・強さ。weapons.json の行をそのまま渡す
export function classify(r){ const n=r.name||'', t=r.type, al=r.stage===3; let k='bullet', pk='tracer', v=null;
  if(t==='melee'){ k=/ブレード|のこ|ワイヤー|居合/.test(n)?'blade':'blunt'; pk=null; }
  else if(t==='throw'){ if(/爆弾|手榴弾/.test(n)){ k='explosion'; v='grenade'; pk='grenade'; } else { k='blunt'; pk='stone'; } }
  else if(t==='trap'){ if(/地雷/.test(n)){ k='explosion'; v='grenade'; } else if(/ワイヤー/.test(n)) k='blade'; else k='blunt'; pk=null; }
  else if(t==='jam'){ k='jam'; pk=null; } else if(t==='repair'){ k='repair'; pk=null; } else if(t==='barrier'){ k='barrier'; pk=null; }
  else if(t==='cannon'){ if(/ロケット/.test(n)){ k='explosion'; v='rocket'; pk='rocket'; } else if(/プラズマ/.test(n)){ k='explosion'; v='plasma'; pk='shell'; }
    else if(/光砲|レール/.test(n)){ k='beam'; pk=null; } else { k='explosion'; v='shell'; pk=(r.special||[]).includes('indirect')?'grenade':'shell'; } }
  else { // shoot
    if(/火炎/.test(n)){ k='flame'; pk=null; } else if((r.special||[]).includes('track')){ k='explosion'; v='missile'; pk='missile'; }
    else if(/魚雷/.test(n)){ k='explosion'; v='rocket'; pk='rocket'; } else if(/衝撃波/.test(n)){ k='shock'; pk=null; }
    else if(/レーザー/.test(n)){ k='laser'; pk=null; } else if(/光線|狙撃砲/.test(n)){ k='beam'; pk=null; }
    else if((r.pellets||1)>1){ k='shotgun'; pk='tracer'; } else if((r.motion_s||1)>=1.4){ k='heavy'; pk='shell'; } else { k='bullet'; pk=al?'needle':'tracer'; } }
  return {kind:k,proj:pk,variant:v,alien:al,w:intensity(r),pellets:r.pellets||1}; }
// 撃つ→飛ぶ→当たるまで全部。x0,y0=銃口 x1,y1=当たる所。o={surface,medium,s,gy,dt(火炎)}
// 被弾の体の動き（rigplayer の pose.root に足す）。age=当たってからの秒、w=強さ、human=人間（軽いので大きく跳ねる）
// 返り値: dx（背の高さに対する割合。左向き＝負）、dy、r（度）、flash（0..1 白く光る）、sx/sy（つぶれ）
export function hurt(age,w=0.3,{human=false,dir=-1}={}){ if(age<0||age>0.6+w) return {dx:0,dy:0,r:0,flash:0,sx:1,sy:1};
  const k=human?1.6:1, kb=(0.01+0.06*w)*k, e=age<0.05?age/0.05:Math.exp(-(age-0.05)*(human?7:5-2*w));
  const wob=Math.cos((age-0.05)*(human?26:16))*e;
  return { dx:dir*kb*e, dy:human?-0.04*w*Math.sin(Math.min(1,age/0.25)*Math.PI):0, r:-dir*(3+14*w)*k*wob*0.5, flash:(age<0.04?0.72:age<0.08?0.25:age<0.12?0.55:Math.max(0,0.35-age*2))*Math.min(1,0.3+1.1*w),
    sx:1+0.06*e*(human?1.5:1), sy:1-0.06*e*(human?1.5:1) }; }
// ===== 被弾の反応（のけぞり・痛がり・ノックバック） v0.2 =====
// 強さは着弾と同じ w。体の重さ mass（ロボ1・人間0.45 相当は human:true・巨大機 3〜4）で割って段を決める。
// 段: 0 軽い（ちらつくだけ・止まらない） 1 中（ひるむ） 2 重い（のけぞる・押し戻される・少し止まる） 3 とても重い（ロボ: 大きくよろけて滑る / 人間: 倒れる）
// 長さは「s=1 の画素（ロボの背 40px）」と「秒」と「度」。ゲーム側は px に s を掛ける（hitReact の o.s で渡せば掛けて返す）
export const REACT={
  edges:[0.30,0.55,0.78],            // 実効の重さ e の段の境目
  tilt:[1.5,9,22,28],                // のけぞりの角度（度）。段の中で ×0.8〜×1.2
  push:[0,4,14,26],                  // 押し戻される距離 px（s=1）
  stun:[0,0.10,0.55,0.90],           // 止まる秒（行動できない）
  flash:[0.35,0.6,0.8,0.9], squash:[0.02,0.05,0.08,0.10], resAdd:[0,0.08,0.30,0.50],
  human:{tilt:1.3,push:1.3,stun:1.3,e:1.3},   // 人間は大きく反応
  boom:0.06,                         // 爆発（explosion/robotDeath/shock）は e に足す
  resDecay:0.4,                      // 慣れ（res 0..1）が1秒で減る量。res が高いほど段が下がり・止まる時間が短くなる
  knockRes:0.5,                      // 人間はこれ未満の慣れの時だけ倒れる（倒れ続けない）
  down:{fall:0.5,lie:0.9,getup:0.45,hop:7,push:18},   // 倒れる: 倒れる 0.5 秒・寝る 0.9 秒・起きる 0.45 秒、跳ねる高さ px
  fric:6 };                          // 滑りの摩擦（距離 = 初速 / fric）
export const BOOMK={explosion:1,robotDeath:1,shock:1};
function reactState(u){ return u._hr||(u._hr={res:0,th:0,tv:0,T:0,stun:0,vx:0,vy:0,flash:0,sq:0,jit:0,hop:0,down:null,hurt:-1,hurtHold:0,tier:-1,age:9,
  out:{dx:0,dy:0,tilt:0,fallTilt:0,sx:1,sy:1,flash:0,stun:false,moveX:0,moveY:0,anim:null,frame:0,animT:0,tier:-1,down:false}}); }
// 当てる: u=ユニット（状態を u._hr に持つ）, o={w または weight, dir(弾の進む向き ラジアン) か dirX(±1), human, mass, kind, dead, s}
// 返り値: {tier, e, tilt(度), push(px), stun(秒), knockdown}
export function hitReact(u,o={}){ const R=reactState(u), human=!!o.human, mass=Math.max(0.2,o.mass||1), s=o.s||1;
  const w=intensity(o.w!=null?o.w:(o.weight!=null?o.weight:0.3)); let e=(w+(BOOMK[o.kind]?REACT.boom:0))*(human?REACT.human.e:1)/Math.pow(mass,0.6);
  e*=1-0.45*R.res;                                    // 慣れ: 連続で重いのを受けると段が下がる
  let tier=e<REACT.edges[0]?0:e<REACT.edges[1]?1:e<REACT.edges[2]?2:3;
  const lo=[0,REACT.edges[0],REACT.edges[1],REACT.edges[2]][tier], hi=[REACT.edges[0],REACT.edges[1],REACT.edges[2],1.1][tier], f=0.8+0.4*clamp((e-lo)/(hi-lo),0,1);
  const dir=o.dir!=null?o.dir:(o.dirX!=null&&o.dirX<0?Math.PI:0), cx=Math.cos(dir), cy=Math.sin(dir), sx=cx>=0?1:-1;
  if(R.down&&!(o.dead&&!R.down.dead)){ R.flash=Math.max(R.flash,REACT.flash[tier]*0.7); R.jit=0.06; return {tier:-1,e,tilt:0,push:0,stun:0,knockdown:false}; }  // 倒れている間は光るだけ
  R.hitX=sx;                                           // 押された向き（＋＝右へ）。紙芝居の絵の向きに使う
  const hm=human?REACT.human:{tilt:1,push:1,stun:1};
  const knock=human&&(tier===3&&R.res<REACT.knockRes||o.dead&&tier>=2);
  if(human&&tier===3&&!knock) tier=2;
  const tilt=REACT.tilt[tier]*f*hm.tilt/Math.sqrt(mass), push=REACT.push[tier]*f*hm.push/mass*s, stun=REACT.stun[tier]*f*hm.stun/Math.sqrt(mass)*(1-0.7*R.res);
  R.flash=Math.max(R.flash,REACT.flash[tier]); R.sq=Math.max(R.sq,REACT.squash[tier]*(human?1.5:1)); R.age=0; R.tier=tier;
  if(tier===0){ R.jit=0.08; R.tv+=sx*tilt*14; }       // 軽い: ちらつき＋ほんの少し揺れるだけ。止まらない
  else { R.tv+=sx*tilt*(human?17:21); R.T=tier>=2?sx*tilt*0.75:0; R.stun=Math.max(R.stun,stun); R.hold=tier>=2?stun:0;
    const v=push*REACT.fric; R.vx+=cx*v; R.vy+=cy*v*0.35;   // 画面の上下（奥行き）方向は弱め
    if(human){ R.hurt=0; R.hurtHold=tier>=2?stun:0; } }
  if(knock){ const kp=REACT.down.push*f/mass*s; R.vx=cx*kp*REACT.fric; R.vy=cy*kp*REACT.fric*0.35; R.down={t:0,dead:!!o.dead,sx}; R.stun=REACT.down.fall+REACT.down.lie+REACT.down.getup; R.hold=0; R.T=0; R.tv=sx*40; R.hurt=-1; }
  R.res=Math.min(1,R.res+REACT.resAdd[tier]);
  return {tier:knock?4:tier,e,tilt,push:knock?REACT.down.push*f/mass*s:push,stun:R.stun,knockdown:knock}; }
// 毎フレーム: 返り値（同じ物を使い回す）
//  dx,dy 見た目のずれ px（ちらつき・跳ね）, tilt 度（＋＝頭が右へ）, sx,sy つぶれ, flash 0..1（白く光らせる）,
//  moveX,moveY このフレームに実際に動かす量 px（ユニットの位置に足す）, stun 行動できない,
//  anim 'hurt'|'knockdown'|'getup'|null と frame（紙芝居の何枚目）, down 倒れている
export function reactStep(u,dt){ const R=reactState(u), O=R.out; R.age+=dt;
  R.res=Math.max(0,R.res-REACT.resDecay*dt*(R.stun>0?0.3:1));
  // のけぞり: ばね（ζ≈0.45）。重い時は止まっている間 T だけ傾いたまま
  if(R.hold>0){ R.hold-=dt; if(R.hold<=0) R.T=0; }
  const k=R.down?0:(u.human?160:240), c=R.down?0:(u.human?11:14); let n=Math.max(1,Math.ceil(dt/0.008)), h=dt/n;
  for(let i=0;i<n;i++){ R.tv+=(-k*(R.th-R.T)-c*R.tv)*h; R.th+=R.tv*h; }
  if(R.down) R.th=R.tv=0;
  const fr=Math.exp(-REACT.fric*dt); const mx=R.vx*(1-fr)/REACT.fric, my=R.vy*(1-fr)/REACT.fric; R.vx*=fr; R.vy*=fr; if(Math.abs(R.vx)<0.5) R.vx=0; if(Math.abs(R.vy)<0.5) R.vy=0;
  O.moveX=mx; O.moveY=my;
  R.stun=Math.max(0,R.stun-dt); R.flash=Math.max(0,R.flash-dt*6); R.sq=Math.max(0,R.sq-dt*0.5); R.jit=Math.max(0,R.jit-dt);
  O.dx=R.jit>0?(Math.sin(R.age*190)*0.8):0; O.dy=0; O.anim=null; O.frame=0; O.down=false;
  if(R.down){ const D=R.down, Dn=REACT.down; D.t+=dt; O.down=true;
    if(D.t<Dn.fall){ O.anim='knockdown'; O.animT=D.t; O.frame=Math.min(3,(D.t/Dn.fall*4)|0); O.dy=-Dn.hop*Math.sin(Math.min(1,D.t/(Dn.fall*0.6))*Math.PI); }
    else if(D.dead||D.t<Dn.fall+Dn.lie){ O.anim='knockdown'; O.frame=3; O.animT=D.t; }
    else if(D.t<Dn.fall+Dn.lie+Dn.getup){ const g=(D.t-Dn.fall-Dn.lie)/Dn.getup; O.anim='getup'; O.animT=g; O.frame=g<0.5?0:1; }
    else { R.down=null; O.down=false; R.res=Math.max(R.res,0.8); } }        // 起きた直後はしばらく倒れない
  else if(R.hurt>=0){ R.hurt+=dt; const hold=R.hurtHold; O.anim='hurt'; O.animT=R.hurt;
    O.frame=R.hurt<0.06?0:R.hurt<0.06+Math.max(0.08,hold)?1:R.hurt<0.24+hold?2:-1; if(O.frame<0){ O.anim=null; O.frame=0; R.hurt=-1; } }
  // 紙芝居の倒れ絵が無いキャラ用（骨のキャラ）: 倒れる角度。足元中心に回すだけの代用
  if(O.down){ const D=R.down||{t:0,sx:1}, Dn=REACT.down; const g=O.anim==='getup'?1-O.animT:Math.min(1,D.t/(Dn.fall*0.8)); O.fallTilt=(R.down?R.down.sx:1)*82*(1-Math.pow(1-g,2)); } else O.fallTilt=0;
  O.tilt=R.th; const q=R.sq*Math.cos(R.age*30)*Math.exp(-R.age*6), kb=R.hold>0&&!O.down?0.045:0; O.sx=1+q+kb*0.5; O.sy=1-q-kb;  /* kb: よろけ中は膝が少し沈む */ O.flash=R.flash; O.stun=R.stun>0; O.tier=R.age<0.6?R.tier:-1;
  return O; }
// 描くときの変形（足元を中心に傾ける）。ctx.save(); BotFx.applyReact(ctx,r,足元x,足元y); キャラを描く; ctx.restore();
export function applyReact(ctx,r,x,y){ ctx.translate(x+r.dx,y+r.dy); if(r.tilt) ctx.rotate(r.tilt*Math.PI/180); if(r.sx!==1||r.sy!==1) ctx.scale(r.sx,r.sy); ctx.translate(-x,-y); }
