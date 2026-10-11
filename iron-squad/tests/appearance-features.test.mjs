import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createSoldierAppearance,ensureSoldierAppearance,drawSoldierHead,drawSoldierPortrait,NORMAL_HAIR_STYLES,MEDIC_STYLES} from '../js/soldier-appearance.js';
import {buildCommanderAppearance,choicesFromAppearance,normalizeCommanderIdentity,MALE_HAIR_STYLES,FEMALE_HAIR_STYLES} from '../js/commander-identity.js';
import {FACE_OUTLINES,EYE_SHAPES,NOSE_TYPES,JAW_TYPES,ACCESSORY_LABELS} from '../js/appearance-features.js';
import {persistentUnit} from '../js/render-support.js';
const {createCanvas}=createRequire('C:/Users/Yoshiyuki/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/entry.cjs')('@napi-rs/canvas');
const catalogs={faceOutline:FACE_OUTLINES,eyeShape:EYE_SHAPES,nose:NOSE_TYPES,jaw:JAW_TYPES,accessory:ACCESSORY_LABELS};
const coverage=Object.fromEntries(Object.keys(catalogs).map(key=>[key,new Set()]));
for(let i=0;i<1500;i++){
  const a=createSoldierAppearance(`expanded-person-${i}`,i%2?'female':'male');
  assert.deepEqual(a,createSoldierAppearance(`expanded-person-${i}`,i%2?'female':'male'),'personal rolls are stable');
  for(const key of Object.keys(catalogs))coverage[key].add(a[key]);
}
for(const [key,catalog]of Object.entries(catalogs))assert.equal(coverage[key].size,Object.keys(catalog).length,`new soldiers can roll every ${key}`);
const old=createSoldierAppearance('old-face','female');for(const key of Object.keys(catalogs))delete old[key];old.medicAccessory='ribbon';
const before=structuredClone(old),unit={id:'old-face',gender:'female',appearance:old,soldierClass:'MEDIC'};
assert.equal(ensureSoldierAppearance(unit),old);
for(const key of Object.keys(before))assert.deepEqual(old[key],before[key],'migrating old appearance never rerolls its existing face or hair');
for(const key of ['faceOutline','eyeShape','nose','jaw'])assert.equal(old[key],'standard');assert.equal(old.accessory,'ribbon');
const legacyMale={...before,accessory:undefined,feminine:false};ensureSoldierAppearance({gender:'male',appearance:legacyMale,soldierClass:'HEAVY'});assert.equal(legacyMale.accessory,'none','a formerly unused female ornament cannot appear on an old male');
const render=(gender,patch={},small=false)=>{
  const a=buildCommanderAppearance(gender,{hairStyle:gender==='female'?'bob':'short',accessory:'none',glasses:'none',...patch});
  const actor={id:'feature-test',gender,soldierClass:'HEAVY',appearance:a,hp:99,atk:12};
  const canvas=createCanvas(220,240),c=canvas.getContext('2d');c.translate(110,130);c.scale(10,10);const before=JSON.stringify(actor);
  drawSoldierHead(c,actor,{small});assert.equal(JSON.stringify(actor),before,'drawing does not change the saved face or abilities');return canvas.toBuffer('image/png');
};
const gameplayRandom=Math.random;Math.random=()=>{throw new Error('art consumed gameplay randomness');};
try{
  for(const gender of ['male','female']){
    for(const [key,catalog]of Object.entries(catalogs))for(const small of [false,true]){
      const seen=[];
      for(const value of Object.keys(catalog)){
        const image=render(gender,{[key]:value},small);
        for(const previous of seen)assert.notDeepEqual(image,previous,`${gender}/${key}/${value} is visibly distinct at ${small?'field':'portrait'} size`);
        seen.push(image);
        const choices={hairStyle:gender==='female'?'bob':'short',eyeShape:'stern',nose:'high',jaw:'forward',accessory:'earring',[key]:value};
        const a=buildCommanderAppearance(gender,choices),person={id:'feature-save',gender,soldierClass:'HEAVY',appearance:a};
        assert.deepEqual(normalizeCommanderIdentity({gender,appearance:a}).appearance,a,'commander normalization keeps every choice');
        assert.equal(choicesFromAppearance(a,gender)[key],value);
        const saved=JSON.parse(JSON.stringify(persistentUnit(person)));assert.deepEqual(ensureSoldierAppearance(saved),a,'soldier serializer keeps every choice');
        const portrait=createCanvas(120,132);drawSoldierPortrait(portrait.getContext('2d'),person,120,132);
      }
    }
    const hairFrames=[];
    for(const hairStyle of gender==='female'?FEMALE_HAIR_STYLES:MALE_HAIR_STYLES){
      const image=render(gender,{hairStyle});for(const old of hairFrames)assert.notDeepEqual(image,old,`${hairStyle} has its own visible shape`);hairFrames.push(image);
    }
  }
}finally{Math.random=gameplayRandom;}
assert.equal(NORMAL_HAIR_STYLES.length,11);assert.equal(Object.keys(MEDIC_STYLES).length,13);
console.log('PASS: independent face outlines/7 eye looks/6 noses/6 jaws/12 ornaments for both genders, close/field pixels, new hair, stable personal generation, legacy neutral migration, saved/editor choices, no RNG/stat/render mutation');
