/**
 * ABYSS DIVE — 武器開発/製作の「結果」モーダルの純粋モデル（DOM 非依存 / テスト可能）
 *
 * 成功が確定し保存された 1 個の個体について、実結果だけを表示用に組み立てる。
 * プレビュー（型の既定形）を流用せず、実際にロールされた弾形・発射数・方向・
 * カテゴリ別の数値（実値）・装弾数（該当時）をそのまま出す。
 *
 * ここはデータ変換だけ。描画・入力は base.js。
 */
import {
  WEAPON_TYPES, itemShort, qualityLabel, qualityColor, effectiveItemStats,
  itemShotCount, itemPattern as armoryPattern, statReal, weaponParams,
  itemProjectile as armoryProjectile, itemStyle, styleLabel,
} from './weapon-rules.js?v=5';
import {
  SHOT_WEAPONS, shotQualityLabel, shotQualityColor, effectiveShotStats, SHOT_STATS,
  itemCount, itemPattern as advPattern, itemProjectile as advProjectile,
  itemLaunchSound, itemImpactSound, optionLabel, shotParams,
} from './advanced-weapons.js?v=4';
import { trajectoryLabel } from './projectile-shapes.js?v=1';

const num = v => (typeof v === 'number' && isFinite(v)) ? v : 1;

/**
 * 製作/開発の結果（{ ok, type:'make'|'design', item }）から、モーダルの表示モデルを作る。
 * 成功（ok===true・item あり・通常製作/指定開発）以外は null（＝モーダルを開かない）。
 */
export function craftResultView(result){
  if (!result || result.ok !== true || !result.item) return null;
  if (result.type !== 'make' && result.type !== 'design') return null;
  const item = result.item;
  const typeId = item.type || result.typeId;
  if (WEAPON_TYPES[typeId]) return armoryView(result, item, typeId);
  const def = SHOT_WEAPONS[typeId];
  if (def && def.kind !== 'torpedo') return advancedView(result, item, typeId, def);
  return null;
}

/** モーダル見出し「{実際の武器名}ができました」。 */
export function craftResultTitle(view){
  return (view && view.name) ? (view.name + 'ができました') : '';
}

function armoryView(result, item, typeId){
  const def = WEAPON_TYPES[typeId];
  const eff = effectiveItemStats(item);
  const stats = def.stats.map(st => {
    const v = num(eff[st.id]);
    return { id:st.id, name:st.name, value:v, real: statReal(st, v) };
  });
  const count = itemShotCount(item, typeId);
  const pattern = armoryPattern(item, typeId);
  const salvo = (count >= 2) ? { count, pattern, label: trajectoryLabel(typeId, count, pattern) } : null;
  const wp = weaponParams(typeId, item);
  return {
    typeId, family:'armory', source:(result.type === 'make') ? '通常製作' : '指定開発',
    name: itemShort(item),
    quality: { label: qualityLabel(item), color: qualityColor(item) },
    shape: { typeId, shapeId: armoryProjectile(item, typeId) },
    beam: null,
    salvo,
    stats,
    ammoCap: (typeId === 'missile' && wp && wp.ammoCap != null) ? wp.ammoCap : null,
    traits: [{ name:'外観', value: styleLabel(itemStyle(item, typeId)) }],
    power: num(wp && wp.salvoMul),
    enhance: Math.max(0, Math.floor(item.enh || 0)),
  };
}

function advancedView(result, item, typeId, def){
  const eff = effectiveShotStats(item);
  const stats = SHOT_STATS.map(st => ({ id:st.id, name:st.name, value:num(eff[st.id]), real:null }));
  const count = itemCount(item, typeId);
  const pattern = advPattern(item, typeId);
  const salvo = (count >= 2) ? { count, pattern, label: trajectoryLabel(typeId, count, pattern) } : null;
  const beam = (def.kind === 'beam') ? { reflect: typeId === 'reflaser' } : null;
  const shape = beam ? null : { typeId, shapeId: advProjectile(item, typeId) };
  const traits = [];
  if (def.kind !== 'beam') traits.push({ name:'弾の形', value: optionLabel('projectile', advProjectile(item, typeId)) });
  traits.push({ name:'発射音', value: optionLabel('launchSound', itemLaunchSound(item, typeId)) });
  if (def.kind !== 'beam') traits.push({ name:'着弾音', value: optionLabel('impactSound', itemImpactSound(item, typeId)) });
  const sp = shotParams(typeId, item);
  return {
    typeId, family:'advanced', source:(result.type === 'make') ? '通常製作' : '指定開発',
    name: def.short + '・' + shotQualityLabel(item),
    quality: { label: shotQualityLabel(item), color: shotQualityColor(item) },
    shape, beam, salvo, stats, ammoCap:null, traits,
    power: num(sp && sp.salvoMul),
    enhance: Math.max(0, Math.floor(item.enh || 0)),
  };
}

/** 成功時だけ開く（state.craftResult に保持）。 */
export function openCraftResult(st, result){
  if (!st) return null;
  const v = craftResultView(result);
  if (!v) return null;
  st.craftResult = v;
  return v;
}
export function closeCraftResult(st){ if (st) st.craftResult = null; }
export function craftResultIsOpen(st){ return !!(st && st.craftResult); }
