import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {normalizeNation,DEVELOPMENT_STAGES} from '../js/games/iron-squad/nation-rules.js';
import {ECONOMIC_REGIONS,PUBLIC_WORKS,regionalTaxQuote} from '../js/games/iron-squad/regional-economy.js';
import {drawSettlementQuarter,drawEconomicLandscape,drawCommerceActor} from '../js/games/iron-squad/economic-visuals.js';
const {createCanvas,GlobalFonts}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/meiryo.ttc','Meiryo');
const canvas=createCanvas(1200,1080),ctx=canvas.getContext('2d');
ctx.fillStyle='#142219';ctx.fillRect(0,0,1200,1080);ctx.font='bold 22px Meiryo';ctx.fillStyle='#ded5b6';ctx.fillText('IRON SQUAD v4 · 国家発展の実描画',22,32);
for(let level=0;level<6;level++){
  const col=level%3,row=Math.floor(level/3),x=col*400,y=50+row*350;
  ctx.save();ctx.beginPath();ctx.rect(x+8,y+8,384,334);ctx.clip();ctx.fillStyle=level>=3?'#28372b':'#1c2c21';ctx.fillRect(x+8,y+8,384,334);
  const nation=normalizeNation({investment:DEVELOPMENT_STAGES[level].cost});
  nation.economy.regions.hq.level=level;for(const t of Object.values(nation.economy.technology))t.level=level;
  if(level===1)nation.economy.regions.hq.investment=1200;
  const game={nation};ctx.translate(x+200,y+184);ctx.scale(.61,.61);drawSettlementQuarter(ctx,game,0,0,'hq');ctx.restore();
  ctx.font='bold 15px Meiryo';ctx.fillStyle='#d2c4a0';ctx.fillText(`Lv${level} · ${DEVELOPMENT_STAGES[level].name}`,x+20,y+30);
  ctx.font='12px Meiryo';ctx.fillStyle='#b1c0a2';ctx.fillText(`本領の税収 ${regionalTaxQuote(nation.economy).total.toLocaleString()}G / 期`,x+20,y+327);
}
const bridge=PUBLIC_WORKS[0];
for(const [i,done] of [[0,false],[1,true]]){
  const x=i*400,y=775;ctx.fillStyle='#233427';ctx.fillRect(x+8,y,384,278);
  const nation=normalizeNation();nation.economy.projects[bridge.id]={discovered:true,funded:done?bridge.cost:1800,work:done?45:0,done};
  const game={nation,camera:{x:bridge.x,y:bridge.y},width:400,height:260,zoom:1,currentDungeon:null};
  ctx.save();ctx.beginPath();ctx.rect(x+8,y,384,278);ctx.clip();ctx.translate(x+200,y+160);ctx.scale(.7,.7);ctx.translate(-bridge.x,-bridge.y);drawEconomicLandscape(ctx,game);ctx.restore();
  ctx.font='bold 15px Meiryo';ctx.fillStyle='#d2c4a0';ctx.fillText(done?'架橋完成 · 実際に通行可能':'未完成の谷 · 通行を遮る',x+20,y+27);
}
ctx.fillStyle='#25362b';ctx.fillRect(808,775,384,278);ctx.font='bold 15px Meiryo';ctx.fillStyle='#d2c4a0';ctx.fillText('商隊・旅人・街道護衛',826,802);
for(const [i,role] of ['merchant','traveler','guard'].entries()){
  ctx.save();ctx.translate(863+i*115,910);ctx.scale(2,2);drawCommerceActor(ctx,{x:0,y:0,role,progress:25},.5);ctx.restore();
  ctx.font='13px Meiryo';ctx.fillStyle='#bac6ab';ctx.fillText(['商隊','旅人','護衛'][i],850+i*115,957);
}
ctx.font='12px Meiryo';ctx.fillStyle='#b1c0a2';ctx.fillText('到着した積荷が交易税になる',826,1011);
const out=resolve('docs/previews/economy-v4.png');mkdirSync(resolve('docs/previews'),{recursive:true});writeFileSync(out,canvas.toBuffer('image/png'));console.log(out);
