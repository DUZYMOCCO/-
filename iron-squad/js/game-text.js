import {toKana} from '../../common/js/kana-text.js';
import {kanaGrade} from '../../common/js/kana-mode.js?v=175';
// Game vocabulary absent from the studio dictionary; keep the shared files untouched.
const words=[['貢献','こうけん',7]];
export function toGameKana(text,grade=2) {
  if(grade>0&&grade<7)for(const [word,reading,level]of words)if(grade<level)text=text.replaceAll(word,reading);
  return toKana(text,grade);
}
export const gameText=text=>toGameKana(text,kanaGrade());
