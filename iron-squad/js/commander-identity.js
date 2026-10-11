// v4.2.24: 隊長（主人公）の名前・性別・見た目。保存先は game.player.{familyName,givenName,gender,appearance}。
import {createSoldierAppearance,HAIR_LABELS,MEDIC_STYLES,SKINS,HAIRS,MEDIC_HAIRS,EYE_COLORS,FRAME_COLORS} from './soldier-appearance.js?v=182';
import {randomGivenName,randomFamilyName} from './soldier-names.js?v=182';

export const GENDERS=Object.freeze({male:'男',female:'女'});
export const NAME_MAX=12;
/** 男の子向けの髪型（描画側が持つ種類）。女の子向けは衛生兵などと共通のやわらかい髪型。 */
export const MALE_HAIR_STYLES=Object.freeze(['short','parted','tousled','curly','tied','swept','buzz','mohawk','bald']);
export const FEMALE_HAIR_STYLES=Object.freeze(['bob','ponytail','braid','short','long','waves','halfup']);
export const HAIR_CHOICE_LABELS=Object.freeze({...HAIR_LABELS,bald:'つるつる',buzz:'ぼうず',swept:'ながしがみ'});
export const FEMALE_HAIR_LABELS=Object.freeze({...MEDIC_STYLES});
export const HAIR_COLORS=Object.freeze([...HAIRS,...MEDIC_HAIRS]);
export const SKIN_COLORS=SKINS;
export const EYE_COLOR_CHOICES=EYE_COLORS;
export const BEARDS=Object.freeze({none:'なし',stubble:'うっすら',mustache:'くちひげ',chin:'あごひげ'});
export const GLASSES=Object.freeze({none:'なし',round:'まるメガネ',square:'しかくメガネ',half:'ハーフ'});

/** 今までの隊長の姿（共通の兵士描画に渡していた固定の短髪）。旧セーブはこの見た目のまま。 */
export const defaultCommanderAppearance=()=>({...createSoldierAppearance('soldier:0'),hairStyle:'short'});

export const cleanName=value=>String(value??'').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,NAME_MAX);
export const isGender=value=>value==='male'||value==='female';
export const commanderFullName=p=>{
  const given=cleanName(p?.givenName),family=cleanName(p?.familyName);
  return given&&family?`${given}・${family}`:given||family||'';
};

/** 選択（choices）から完全な見た目データを作る。無効な値は既定へ戻る。 */
export function buildCommanderAppearance(gender,choices={}) {
  const base=defaultCommanderAppearance(),female=gender==='female';
  const pick=(value,list,fallback)=>list.includes(value)?value:fallback;
  const hairColor=pick(choices.hairColor,HAIR_COLORS,base.hairColor);
  const a={...base,skin:pick(choices.skin,SKINS,base.skin),hairColor,medicHairColor:female?hairColor:pick(choices.hairColor,MEDIC_HAIRS,base.medicHairColor),
    glasses:pick(choices.glasses,Object.keys(GLASSES),'none'),glassesColor:base.glassesColor,handsome:false,feminine:female};
  if(!FRAME_COLORS.includes(a.glassesColor))a.glassesColor=FRAME_COLORS[0];
  if(female) {
    a.medicHair=pick(choices.hairStyle,FEMALE_HAIR_STYLES,'bob');
    a.medicHairColor=hairColor;a.beautiful=!!choices.beautiful;a.eyeColor=pick(choices.eyeColor,EYE_COLORS,EYE_COLORS[3]);
    a.facialHair='none';a.scar=false;a.medicAccessory=pick(choices.accessory,['none','clip','ribbon'],'ribbon');
  } else {
    a.hairStyle=pick(choices.hairStyle,MALE_HAIR_STYLES,'short');
    a.facialHair=pick(choices.facialHair,Object.keys(BEARDS),'none');
    a.beautiful=false;a.eyeColor=pick(choices.eyeColor,EYE_COLORS,EYE_COLORS[3]);
  }
  return a;
}
/** 保存済みの見た目から、画面の選択（choices）を取り出す。 */
export function choicesFromAppearance(a,gender) {
  const fallback=defaultCommanderAppearance(),x=a||fallback;
  return {hairStyle:gender==='female'?x.medicHair:x.hairStyle,hairColor:gender==='female'?x.medicHairColor:x.hairColor,skin:x.skin,
    facialHair:x.facialHair,glasses:x.glasses,beautiful:!!x.beautiful,eyeColor:x.eyeColor,accessory:x.medicAccessory};
}
/** 隊長の記録を整える。外見がなければ旧来の見た目、性別がなければ未設定のまま（家名のセリフは出ない）。 */
export function normalizeCommanderIdentity(raw={}) {
  const gender=isGender(raw.gender)?raw.gender:'';
  const hasLook=raw.appearance&&typeof raw.appearance==='object'&&raw.appearance.version===1;
  const appearance=hasLook?buildCommanderAppearance(gender,{...choicesFromAppearance(raw.appearance,gender)}):defaultCommanderAppearance();
  return {familyName:cleanName(raw.familyName),givenName:cleanName(raw.givenName),gender,appearance};
}
/** 「おまかせ」用。名前は性別に合わせ、見た目はこの画面で選べる範囲だけから決める。 */
export function randomCommanderIdentity(gender=null,random=Math.random) {
  const g=isGender(gender)?gender:random()<.5?'male':'female',pickOf=list=>list[Math.floor(random()*list.length)%list.length];
  const choices={hairStyle:pickOf(g==='female'?FEMALE_HAIR_STYLES:MALE_HAIR_STYLES),hairColor:pickOf(HAIR_COLORS),skin:pickOf(SKINS),
    facialHair:g==='male'&&random()<.25?pickOf(['stubble','mustache','chin']):'none',glasses:random()<.15?pickOf(['round','square','half']):'none',
    beautiful:g==='female'&&random()<.4,eyeColor:pickOf(EYE_COLORS),accessory:pickOf(['none','clip','ribbon'])};
  return {familyName:randomFamilyName(random),givenName:randomGivenName(g,random),gender:g,appearance:buildCommanderAppearance(g,choices)};
}
/** 旧セーブ・新規どちらでも、遠征の保存データから隊長の記録を取り出す。 */
export const identityOf=p=>normalizeCommanderIdentity(p||{});
export function applyCommanderIdentity(player,identity) {
  const n=normalizeCommanderIdentity(identity);
  player.familyName=n.familyName;player.givenName=n.givenName;player.gender=n.gender;player.appearance=n.appearance;
  return player;
}
