import {gameText} from './game-text.js?v=318';
/** 才能キーの表示名（内部キーを画面へ出さないための共有辞書。index.js の TALENTS.tag と一致させる）。 */
export const TALENT_TAGS = {INFERIOR:'🍂へっぽこ',AVERAGE:'凡庸',TALENTED:'✨有望',ELITE:'🔮英才',GENIUS:'🌟天才'};
export const isLateBloomer = unit => unit?.talent==='INFERIOR'&&(unit.survivedDeathlines>0||Array.isArray(unit.deathlineSkills)&&unit.deathlineSkills.length>0);
/** 旧来のキー指定も受け付ける。兵士を渡すと、その兵士の死線経験を表示に反映する。 */
export const talentTag = keyOrUnit => gameText(isLateBloomer(keyOrUnit)?'🍂大器晩成':TALENT_TAGS[typeof keyOrUnit==='string'?keyOrUnit:keyOrUnit?.talent]||TALENT_TAGS.AVERAGE);
