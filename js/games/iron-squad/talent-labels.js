/** 才能キーの表示名（内部キーを画面へ出さないための共有辞書。index.js の TALENTS.tag と一致させる）。 */
export const TALENT_TAGS = {INFERIOR:'🍂へっぽこ',AVERAGE:'凡庸',TALENTED:'✨有望',ELITE:'🔮英才',GENIUS:'🌟天才'};
export const talentTag = key => TALENT_TAGS[key] || TALENT_TAGS.AVERAGE;
