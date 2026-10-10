import assert from 'node:assert/strict';
import { generateSoldierName, migrateSoldierName, FIRST_NAMES, FAMILY_NAMES, NINJA_NAMES, BEAST_NAMES } from '../js/games/iron-squad/soldier-names.js';

// 1. 人間（通常兵士）の命名：ファーストネーム・ファミリーネーム
for (let i = 0; i < 50; i++) {
  const name = generateSoldierName({ soldierClass: 'HEAVY' });
  assert.ok(name.includes('・'), `Human name "${name}" should contain middle dot '・' separating first and last name`);
  const [first, family] = name.split('・');
  assert.ok(first.length >= 1, `First name should not be empty: ${name}`);
  assert.ok(family.length >= 1, `Family name should not be empty: ${name}`);
  assert.ok(FIRST_NAMES.includes(first), `First name "${first}" should be from FIRST_NAMES pool`);
  assert.ok(FAMILY_NAMES.includes(family), `Family name "${family}" should be from FAMILY_NAMES pool`);
}

// 2. ニンジャ：ハンゾーなどファミリーネームなしの和名系統
for (let i = 0; i < 30; i++) {
  const name = generateSoldierName({ soldierClass: 'NINJA' });
  assert.ok(!name.includes('・'), `Ninja name "${name}" should not contain middle dot (no family name)`);
  assert.ok(NINJA_NAMES.includes(name), `Ninja name "${name}" should be from NINJA_NAMES pool`);
}

// 3. 獣人：ファミリーネームなし種族風単一ネーム
for (const species of ['wolf', 'bear', 'cat', 'fox', 'bird']) {
  for (let i = 0; i < 15; i++) {
    const name = generateSoldierName({ soldierClass: 'LIGHT', species });
    assert.ok(!name.includes('・'), `Beast name "${name}" for ${species} should not contain middle dot`);
    assert.ok(BEAST_NAMES[species].includes(name), `Beast name "${name}" should be from BEAST_NAMES.${species}`);
  }
}

// 4. 重複回避の検証
const used = new Set();
for (let i = 0; i < 30; i++) {
  const name = generateSoldierName({ soldierClass: 'LIGHT', usedNames: used });
  assert.ok(!used.has(name), `Name "${name}" should be unique`);
  used.add(name);
}

// 5. 旧兵士名のマイグレーション検証
const legacy1 = { name: '兵士#1', soldierClass: 'HEAVY' };
migrateSoldierName(legacy1);
assert.notEqual(legacy1.name, '兵士#1');
assert.ok(legacy1.name.includes('・'));

const legacyNinja = { name: '兵士#12', soldierClass: 'NINJA' };
migrateSoldierName(legacyNinja);
assert.notEqual(legacyNinja.name, '兵士#12');
assert.ok(!legacyNinja.name.includes('・'));

const namedSoldier = { name: 'レオン・アシュフォード', soldierClass: 'HEAVY' };
migrateSoldierName(namedSoldier);
assert.equal(namedSoldier.name, 'レオン・アシュフォード', 'Existing proper name must be preserved');

console.log('PASS: soldier full names, ninja/beast single names, pool integrity, anti-duplication, migration');
