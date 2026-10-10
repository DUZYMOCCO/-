// v4.2.24: 隊長づくり／身だしなみの全画面シート（細い固定バー＋1つのスクロール）。
import {drawSoldierPortrait} from './soldier-appearance.js?v=151';
import {drawFieldCommander} from './visuals.js?v=171';
import {GENDERS,MALE_HAIR_STYLES,FEMALE_HAIR_STYLES,HAIR_CHOICE_LABELS,FEMALE_HAIR_LABELS,HAIR_COLORS,SKIN_COLORS,EYE_COLOR_CHOICES,BEARDS,GLASSES,
  NAME_MAX,cleanName,buildCommanderAppearance,choicesFromAppearance,normalizeCommanderIdentity,randomCommanderIdentity} from './commander-identity.js?v=171';
import {randomGivenName,randomFamilyName} from './soldier-names.js?v=151';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const ACCESSORIES={none:'なし',clip:'ヘアピン',ribbon:'リボン'};

/**
 * mode 'create'：出発前。何も選ばなくても出発できる（名前は自動で入る）。
 * mode 'edit'：遠征中。費用なし。名前・性別・見た目をあとから設定できる。
 */
export function openCommanderEditor({host,mode='create',initial=null,onConfirm,onCancel}) {
  const edit=mode==='edit';
  const start=edit&&initial?normalizeCommanderIdentity(initial):null;
  // 新規は男の子・今までの見た目・おまかせ名前から始める。既存隊長は今の設定から始める。
  const state=start?{familyName:start.familyName,givenName:start.givenName,gender:start.gender||'male',
      choices:choicesFromAppearance(start.appearance,start.gender||'male'),givenAuto:false}
    :{familyName:randomFamilyName(),givenName:randomGivenName('male'),gender:'male',choices:choicesFromAppearance(null,'male'),givenAuto:true};
  const previous=document.activeElement;
  const root=el('div','game-overlay commander-editor');root.id='commander-editor';
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','commander-editor-title');
  const panel=el('section','strategy-panel ce-panel');
  const bar=el('div','sheet-bar');
  const title=el('strong','sheet-bar-title',edit?'身だしなみ':'隊長をつくろう');title.id='commander-editor-title';title.tabIndex=-1;
  const back=el('button','sheet-bar-btn',edit?'‹ もどる':'‹ 名前にもどる');back.type='button';back.id='btn-commander-back';
  bar.append(title,back);
  const body=el('div','ce-body');
  body.append(el('p','ce-lead',edit?'名前・性別・見た目をいつでも変えられます。お金はかかりません。':'名前と見た目をえらびます。えらばなくても、このまま出発できます。'));
  const preview=el('div','ce-preview');
  const bust=el('canvas','ce-bust');bust.setAttribute('role','img');bust.setAttribute('aria-label','隊長の顔');
  const full=el('canvas','ce-full');full.setAttribute('role','img');full.setAttribute('aria-label','隊長の全身');
  preview.append(bust,full);
  const nameLabel=el('p','ce-fullname');nameLabel.setAttribute('aria-live','polite');
  body.append(preview,nameLabel);

  const group=(label,id)=>{const g=el('section','ce-group');g.append(el('h3','ce-heading',label));const c=el('div','ce-chips');if(id)c.id=id;g.append(c);body.append(g);return c;};
  const nameBox=el('section','ce-group');nameBox.append(el('h3','ce-heading','名前'));
  const makeNameRow=(label,id,key,make)=>{
    const row=el('div','ce-name-row');const lab=el('label','ce-name-label',label);lab.htmlFor=id;
    const input=el('input','save-name ce-input');input.id=id;input.type='text';input.maxLength=NAME_MAX;input.autocomplete='off';input.placeholder='おまかせでもOK';input.value=state[key];
    const dice=el('button','action-btn secondary ce-dice','おまかせ');dice.type='button';dice.setAttribute('aria-label',`${label}をおまかせ`);
    input.addEventListener('input',()=>{state[key]=cleanName(input.value);if(key==='givenName')state.givenAuto=false;paint();});
    dice.addEventListener('click',()=>{state[key]=make();if(key==='givenName')state.givenAuto=true;input.value=state[key];paint();});
    row.append(lab,input,dice);nameBox.append(row);return input;
  };
  const familyInput=makeNameRow('名字','ce-family','familyName',()=>randomFamilyName());
  const givenInput=makeNameRow('名前','ce-given','givenName',()=>randomGivenName(state.gender));
  body.append(nameBox);
  const genderBox=group('性別','ce-gender');genderBox.setAttribute('role','radiogroup');genderBox.setAttribute('aria-label','性別');
  const hairBox=group('髪型','ce-hair'),hairColorBox=group('髪の色','ce-hair-color'),skinBox=group('はだの色','ce-skin');
  const beardWrap=group('ひげ','ce-beard'),glassesBox=group('メガネ','ce-glasses'),eyeBox=group('目','ce-eyes'),eyeColorBox=group('目の色','ce-eye-color'),accessoryBox=group('かざり','ce-accessory');
  const actions=el('div','ce-actions');
  const allRandom=el('button','action-btn secondary','ぜんぶおまかせ');allRandom.type='button';allRandom.id='btn-commander-random';
  const go=el('button','action-btn',edit?'この姿に決める':'この隊長で出発');go.type='button';go.id='btn-commander-confirm';
  actions.append(allRandom,go);
  panel.append(bar,body,actions);root.append(panel);

  const chip=(parent,label,pressed,onPick,{role='button'}={})=>{
    const b=el('button','ce-chip',label);b.type='button';
    if(role==='radio'){b.setAttribute('role','radio');b.setAttribute('aria-checked',String(pressed));}else b.setAttribute('aria-pressed',String(pressed));
    b.addEventListener('click',onPick);parent.append(b);return b;
  };
  const swatch=(parent,color,label,pressed,onPick)=>{
    const b=el('button','ce-swatch');b.type='button';b.style.background=color;b.setAttribute('aria-label',label);b.setAttribute('aria-pressed',String(pressed));
    b.addEventListener('click',onPick);parent.append(b);return b;
  };
  const female=()=>state.gender==='female';
  const current=()=>buildCommanderAppearance(state.gender,state.choices);
  const identity=()=>({familyName:state.familyName,givenName:state.givenName,gender:state.gender,appearance:current()});

  function paint() {
    const a=current();
    const ratio=Math.min(3,window.devicePixelRatio||1);
    const person={id:'commander',soldierClass:'COMMANDER',appearance:a};
    for(const [canvas,w,h] of [[bust,120,132],[full,112,128]]) {canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
    const bc=bust.getContext('2d');
    if(bc){bc.setTransform(ratio,0,0,ratio,0,0);drawSoldierPortrait(bc,person,120,132,{compact:false});}
    const fc=full.getContext('2d');
    if(fc){fc.setTransform(ratio,0,0,ratio,0,0);fc.fillStyle='#17242c';fc.fillRect(0,0,112,128);fc.save();fc.translate(56,92);fc.scale(2,2);
      drawFieldCommander(fc,{x:0,y:0,hp:1,maxHp:1,level:1,facingAngle:0,slashAngle:0,slashAnim:0,appearance:a},{},0,0,'',false,true);fc.restore();}
    const n=state.givenName&&state.familyName?`${state.givenName}・${state.familyName}`:state.givenName||state.familyName||'名前はおまかせ';
    nameLabel.textContent=`${n}（${GENDERS[state.gender]}）`;
  }
  function renderOptions() {
    for(const box of [genderBox,hairBox,hairColorBox,skinBox,beardWrap,glassesBox,eyeBox,eyeColorBox,accessoryBox])box.replaceChildren();
    const f=female(),c=state.choices;
    for(const g of Object.keys(GENDERS))chip(genderBox,GENDERS[g],state.gender===g,()=>setGender(g),{role:'radio'});
    for(const key of f?FEMALE_HAIR_STYLES:MALE_HAIR_STYLES)chip(hairBox,(f?FEMALE_HAIR_LABELS:HAIR_CHOICE_LABELS)[key],c.hairStyle===key,()=>choose({hairStyle:key}));
    HAIR_COLORS.forEach((color,i)=>swatch(hairColorBox,color,`髪の色${i+1}`,c.hairColor===color,()=>choose({hairColor:color})));
    SKIN_COLORS.forEach((color,i)=>swatch(skinBox,color,`はだの色${i+1}`,c.skin===color,()=>choose({skin:color})));
    for(const [k,label] of Object.entries(GLASSES))chip(glassesBox,label,c.glasses===k,()=>choose({glasses:k}));
    beardWrap.parentElement.hidden=f;eyeBox.parentElement.hidden=!f;eyeColorBox.parentElement.hidden=!f||!c.beautiful;accessoryBox.parentElement.hidden=!f;
    if(!f)for(const [k,label] of Object.entries(BEARDS))chip(beardWrap,label,c.facialHair===k,()=>choose({facialHair:k}));
    if(f) {
      chip(eyeBox,'ふつう',!c.beautiful,()=>choose({beautiful:false}));chip(eyeBox,'ぱっちり',!!c.beautiful,()=>choose({beautiful:true}));
      EYE_COLOR_CHOICES.forEach((color,i)=>swatch(eyeColorBox,color,`目の色${i+1}`,c.eyeColor===color,()=>choose({eyeColor:color})));
      for(const [k,label] of Object.entries(ACCESSORIES))chip(accessoryBox,label,(c.accessory||'ribbon')===k,()=>choose({accessory:k}));
    }
  }
  function repaint(){renderOptions();paint();}
  function choose(patch){Object.assign(state.choices,patch);repaint();}
  function setGender(g) {
    if(state.gender===g)return;
    state.gender=g;
    // 髪型は性別ごとに別の種類。髪の色・はだの色はそのまま引き継ぐ。
    state.choices={...state.choices,hairStyle:g==='female'?'bob':'short',facialHair:'none',beautiful:false};
    // おまかせで入った名前は、性別に合わせて入れ直す。自分で書いた名前は変えない。
    if(state.givenAuto){state.givenName=randomGivenName(g);givenInput.value=state.givenName;}
    repaint();
  }
  function applyAllRandom() {
    const r=randomCommanderIdentity(null);
    state.gender=r.gender;state.familyName=r.familyName;state.givenName=r.givenName;state.givenAuto=true;
    state.choices=choicesFromAppearance(r.appearance,r.gender);familyInput.value=r.familyName;givenInput.value=r.givenName;repaint();
  }
  function close() {
    root.remove();for(const canvas of [bust,full]){canvas.width=canvas.height=0;}
    try{previous?.focus?.({preventScroll:true});}catch{}
  }
  allRandom.addEventListener('click',applyAllRandom);
  back.addEventListener('click',()=>{close();onCancel?.();});
  go.addEventListener('click',()=>{
    // 空欄は自動で埋める。性別は必ずどちらかが選ばれている。
    if(!state.familyName)state.familyName=randomFamilyName();
    if(!state.givenName)state.givenName=randomGivenName(state.gender);
    const result=normalizeCommanderIdentity(identity());close();onConfirm?.(result);
  });
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){close();onCancel?.();}});
  host.append(root);repaint();
  title.focus({preventScroll:true});
  return {root,close,state:()=>identity()};
}
