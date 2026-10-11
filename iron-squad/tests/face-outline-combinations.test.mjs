// Cheeks remain round/narrow/long even when a different chin is selected.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {drawVariantFace,JAW_TYPES} from '../js/appearance-features.js';
import {buildCommanderAppearance,normalizeCommanderIdentity} from '../js/commander-identity.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');

function faceMask(gender,faceOutline,jaw,small=false){
  const canvas=createCanvas(400,500),c=canvas.getContext('2d');
  c.translate(200,160);c.scale(25,25);
  const a=buildCommanderAppearance(gender,{faceOutline,jaw});
  const before=JSON.stringify(a);drawVariantFace(c,a,gender==='female',small);
  assert.equal(JSON.stringify(a),before,'art does not change the chosen face');
  const widthAt=y=>{
    const data=c.getImageData(0,Math.round(160+y*25),400,1).data;
    let first=-1,last=-1;
    for(let x=0;x<400;x++)if(data[x*4+3]>200){if(first<0)first=x;last=x;}
    return first<0?0:(last-first+1)/25;
  };
  const pixels=c.getImageData(0,0,400,500).data;
  let bottom=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>200)bottom=Math.floor(i/4/400);
  return {widthAt,bottom:(bottom-160)/25};
}
for(const gender of ['male','female'])for(const small of [false,true]){
  for(const jaw of Object.keys(JAW_TYPES).filter(k=>k!=='standard')){
    const round=faceMask(gender,'round',jaw,small),square=faceMask(gender,'square',jaw,small),angular=faceMask(gender,'angular',jaw,small);
    const cheekRatio=mask=>mask.widthAt(3)/mask.widthAt(0);
    assert.ok(cheekRatio(square)>cheekRatio(round)+.07,`${gender}/${jaw}: round cheeks cannot inherit square sides`);
    assert.ok(cheekRatio(angular)<cheekRatio(round)-.07,`${gender}/${jaw}: narrow cheeks survive a jaw change`);
    const long=faceMask(gender,'long',jaw,small);
    assert.ok(long.bottom>round.bottom+.5,`${gender}/${jaw}: a long face keeps its extra length`);
    if(jaw==='pointed')assert.ok(round.widthAt(round.bottom-.5)/round.widthAt(3)<.25,'pointed chin tapers to a tip instead of a wide flat bottom');
    const appearance=buildCommanderAppearance(gender,{faceOutline:'round',jaw});
    assert.deepEqual(normalizeCommanderIdentity({gender,appearance}).appearance,appearance,'normalization preserves both choices');
  }
}
console.log('PASS: cheeks and length survive every jaw combination, pointed chin tapers, both genders and close/field art, saved choices unchanged');
