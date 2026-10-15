/** Display only. Values used by combat, purchasing and saves remain numbers. */
export function formatCompact(value) {
  const n=Number(value);
  if(Number.isNaN(n))return '—';
  if(!Number.isFinite(n))return n<0?'−∞':'∞';
  if(Math.abs(n)<1000)return String(Object.is(n,-0)?0:n);
  // K/M の短縮は単位が混ざると読みにくい（ユーザー判断）ため、桁区切りで全桁を出す。
  return Math.round(n).toLocaleString('en-US');
}
/** Only field notices: currency/resources and purely numeric healing/damage. */
export function compactFieldText(value) {
  if(typeof value==='number')return formatCompact(value);
  const text=String(value);
  if(/^[+\-]?\d+(?:\.\d+)?$/.test(text))return `${text[0]==='+'?'+':''}${formatCompact(Number(text))}`;
  return text.replace(/([+\-]?)(\d[\d,]*(?:\.\d+)?)\s*(G|HP|MP)\b/g,(_,sign,n,unit)=>`${sign}${formatCompact(Number(n.replaceAll(',','')))} ${unit}`);
}
export function exactEquipmentStats(item) {
  const labels={atk:'攻撃',def:'防御',hp:'HP',magicAttack:'魔法攻撃',magicDefense:'魔法防御',atkSpeed:'攻速',crit:'会心'};
  return Object.entries(item?.stats||{}).filter(([key])=>labels[key]).map(([key,value])=>`${labels[key]} ${Number(value).toLocaleString()}${['atkSpeed','crit'].includes(key)?'%':''}`).join(' · ');
}
