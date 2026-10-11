import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { drawLootDrop, drawTreasureChest } from '../js/loot-visuals.js';
import { MATERIALS, GENERATIONS, MAX_EQUIPMENT_TIER } from '../js/equipment-tiers.js';

const require=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/YuGothM.ttc','Yu Gothic');
const canvas=createCanvas(1100,1080),c=canvas.getContext('2d');
c.fillStyle='#202c2f';c.fillRect(0,0,1100,1080);
c.fillStyle='#eee3c9';c.font='bold 25px "Yu Gothic"';c.fillText('ドロップと宝箱 — 7素材 × 4製造段',26,38);
c.fillStyle='#aebfba';c.font='14px "Yu Gothic"';c.fillText('大きい図は4倍表示。右下は通常の大きさ。装備の数値・出現率は変更しない。',26,64);

const images=new Set(),rand=Math.random;
try {
  Math.random=()=>{throw new Error('loot rendering must not use randomness');};
  for(let m=1;m<=MATERIALS.length;m++){
    const y=94+(m-1)*102;
    c.fillStyle='#cfceb7';c.font='bold 13px "Yu Gothic"';c.fillText(MATERIALS[m-1].mat,26,y+46);
    for(let g=1;g<=GENERATIONS.length;g++){
      const tier=(m-1)*GENERATIONS.length+g,x=185+(g-1)*220;
      c.fillStyle='#29383a';c.fillRect(x,y,202,90);
      c.fillStyle='#c8d1c5';c.font='12px "Yu Gothic"';c.fillText(`T${tier}  ${GENERATIONS[g-1].name}`,x+10,y+16);
      c.save();c.translate(x+84,y+58);c.scale(4,4);drawLootDrop(c,Object.freeze({x:0,y:0,item:Object.freeze({tier})}),1000);c.restore();
      drawLootDrop(c,{x:x+174,y:y+66,item:{tier}},1000);
      const sample=createCanvas(48,48),s=sample.getContext('2d');
      s.translate(24,27);s.fillStyle='#ff1234';s.lineWidth=3;
      const before=s.getTransform();drawLootDrop(s,Object.freeze({x:0,y:0,item:Object.freeze({tier})}),1000);
      assert.equal(s.lineWidth,3);assert.deepEqual(s.getTransform(),before);
      images.add(Buffer.from(s.getImageData(0,0,48,48).data).toString('base64'));
      // Native Canvas keeps a stale JS fillStyle getter after restore; verify the actual restored paint.
      s.fillRect(-23,-26,1,1);assert.deepEqual([...s.getImageData(1,1,1,1).data],[255,18,52,255]);
    }
  }
  assert.equal(images.size,MAX_EQUIPMENT_TIER,'all 28 manufacturing tiers have distinct drawing');
  c.fillStyle='#eee3c9';c.font='bold 18px "Yu Gothic"';c.fillText('物資・秘宝・最奥宝箱',26,850);
  const specials=[['魔法石',{isMagicStone:true}],['弾薬',{isAmmo:true,ammo:8}],['覚醒宝珠',{isOrb:true}],['神話宝玉',{item:{type:'GEM',tier:7}}],['ボス箱',{isBoss:true,item:{tier:12}}],['神話ボス箱',{isBoss:true,item:{tier:28}}]];
  for(const [i,[label,drop]] of specials.entries()){
    const x=30+i*178;c.fillStyle='#29383a';c.fillRect(x,874,160,130);
    c.fillStyle='#c8d1c5';c.font='13px "Yu Gothic"';c.fillText(label,x+10,895);
    c.save();c.translate(x+62,959);c.scale(4,4);drawLootDrop(c,Object.freeze({x:0,y:0,...drop}),1000);c.restore();
    drawLootDrop(c,{x:x+133,y:971,...drop},1000);
  }
  for(const [i,options] of [{locked:true},{opened:true},{boss:true,opened:true}].entries()){
    c.save();c.translate(400+i*90,1055);c.scale(2,2);drawTreasureChest(c,0,0,28,1000,options);c.restore();
  }
  c.fillStyle='#aebfba';c.font='12px "Yu Gothic"';c.fillText('最奥の至宝箱：施錠／開封／ボス箱開封',26,1050);
} finally {Math.random=rand;}
mkdirSync('iron-squad/docs/previews',{recursive:true});
writeFileSync('iron-squad/docs/previews/loot-visuals-v177.png',canvas.toBuffer('image/png'));
console.log('PASS: 28 distinct tier drawings, no random/no drop mutation, context state restored; preview loot-visuals-v177.png');
