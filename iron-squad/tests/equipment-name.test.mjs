import assert from 'node:assert/strict';
import { equipmentIcon, equipmentName } from '../js/equipment-rules.js';

const sword = { type: 'WEAPON', weaponStyle: 'sword', name: '鉄の剣' };
const spear = { type: 'WEAPON', weaponStyle: 'spear', name: '鉄の槍+3', baseName: '鉄の槍' };
const before = JSON.stringify(spear);

assert.equal(equipmentName(sword), '🗡️ 鉄の剣');
assert.equal(equipmentName(spear), '🔱 鉄の槍+3');
assert.equal(sword.name, '鉄の剣');
assert.equal(JSON.stringify(spear), before);

assert.equal(equipmentIcon({ type: 'WEAPON' }), '🗡️');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'hammer', name: '戦鎚' }), '🔨 戦鎚');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'bow', name: '狩人の弓' }), '🏹 狩人の弓');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'crossbow', name: '石弓' }), '🎯 石弓');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'cannon', name: '野砲' }), '💣 野砲');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'staff', name: '樫の杖' }), '🪄 樫の杖');
assert.equal(equipmentName({ type: 'WEAPON', weaponStyle: 'wand', name: '骨のワンド' }), '🔮 骨のワンド');

assert.equal(equipmentName({ type: 'SHIELD', name: '木の盾' }), '🛡️ 木の盾');
assert.equal(equipmentIcon({ type: 'HELMET', name: '鉄の兜' }), '🪖');
assert.equal(equipmentIcon({ type: 'ARMOR', name: '革の鎧' }), '🥋');
assert.equal(equipmentIcon({ type: 'GLOVES', name: '皮手袋' }), '🧤');
assert.equal(equipmentIcon({ type: 'LEGS', name: '革靴' }), '🥾');
assert.equal(equipmentIcon({ type: 'AMULET', name: '石の装飾' }), '📿');
assert.equal(equipmentIcon({ type: 'ARMOR' }) === equipmentIcon({ type: 'WEAPON' }), false);
assert.equal(equipmentName(null), '');
assert.equal(equipmentIcon({ type: 'ORB', name: '宝珠' }), '');
assert.equal(equipmentName({ type: 'ORB', name: '宝珠' }), '宝珠');
