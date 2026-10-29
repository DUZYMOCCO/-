// 人形の肌＋服テクスチャ（terra 2回目、仮）。起動時に 512px の素材を読み、
// 肌×服の組み合わせごとに canvas で重ねて1枚にし、テクスチャと材質を人形どうしで使い回す。

import { sexOf } from '../sim/data.js';

export const SKINS = ['skin_01_light', 'skin_02_tan', 'skin_03_brown', 'skin_04_dark'];
export const OUTFITS = {
  guard: ['outfit_guard_a', 'outfit_guard_b'],
  bandit: ['outfit_bandit_a', 'outfit_bandit_b'],
  player: ['outfit_drifter_a', 'outfit_drifter_b'],
};
const TEX_SIZE = 512;
// 人食い・グールの肌と服（tex_props_cx1、男の人形の UV）。assets/tex_mobs/ から別に読み、読めた時だけ使う。
export const MOB_TEX_DIR = 'assets/tex_mobs/';
export const MOB_LOOKS = {
  ghoul: { skin: 'skin_ghoul', outfit: 'outfit_ghoul' },
  cannibal: { skin: 'skin_cannibal', outfit: 'outfit_cannibal' },
};
export const MOB_TEX_NAMES = Object.values(MOB_LOOKS).flatMap((l) => [l.skin, l.outfit]);
const MOB_ROLE_LOOK = { cannibal_chief: 'cannibal', cannibal: 'cannibal', ghoul: 'ghoul' };
let mobReady = false;
// 素材が読めたら true にする（読めなければ人食いも普通の盗賊の見た目）
export function setMobLooksReady(on) {
  mobReady = !!on;
}
export function mobLookKind(actor) {
  return (actor && MOB_ROLE_LOOK[actor.role]) || null;
}

// 整数の簡単なハッシュ（決定的。乱数の流れは使わないので sim に影響しない）。
function hashId(id, salt) {
  let h = (Number(id) | 0) ^ salt;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}

// 人物ごとの肌と服。獣・未知の勢力は null（従来どおり色だけ）。
export function lookFor(actor) {
  if (!actor) return null;
  const mob = mobLookKind(actor);
  if (mob && mobReady) {
    const l = MOB_LOOKS[mob];
    return { skin: l.skin, outfit: l.outfit, key: l.skin + '|' + l.outfit, mob };
  }
  // 隊商の商人は衛兵の服でなく旅人の服（ランダム出現の role）
  const outfits = actor.role === 'merchant' ? OUTFITS.player : OUTFITS[actor.faction];
  if (!outfits) return null;
  const skin = SKINS[hashId(actor.id, 0x5a17) % SKINS.length];
  const outfit = outfits[hashId(actor.id, 0x0f17) % outfits.length];
  return { skin, outfit, key: skin + '|' + outfit };
}

// 21:xx 「美女ではない→モブ行き」になった tex_f3_beauty の5人。女性の町人・衛兵・盗賊の見た目の一部に混ぜる。
// 肌（顔）は tex_f3/ の 512px、髪は hair_f/ の髪の形。服は勢力の服（tex_f）を上から重ねる。
export const BEAUTY_LOOKS = [
  { hair: 'ponytail', skin: 'skin_b1_sword' },
  { hair: 'sidefringe', skin: 'skin_b2_scav' },
  { hair: 'bun', skin: 'skin_b3_noble' },
  { hair: 'bob', skin: 'skin_b4_merc' },
  { hair: 'braid', skin: 'skin_b5_nomad' },
];
export const BEAUTY_SHARE = 50; // 女性の人形のうち何%をこの5人の見た目にするか

// 女性の人形の見た目。beautyReady（髪と肌が読めた）なら id のハッシュで半分ほどを5人の誰かにする。
// force（確認用 ?beauty=<髪型>）: その髪型を女性のモブ全員に。'all' なら全員を5人のどれかに。
export function femaleLookFor(actor, beautyReady, force) {
  const base = lookFor(actor);
  if (!base || base.mob || !beautyReady || actor.isPlayer || actor.faction === 'player') return base; // 仲間（ハナ等）はそのまま
  const forced = force ? BEAUTY_LOOKS.find((b) => b.hair === force) : null;
  if (!forced && force !== 'all' && hashId(actor.id, 0xb3a7) % 100 >= BEAUTY_SHARE) return base;
  const b = forced || BEAUTY_LOOKS[hashId(actor.id, 0x6a12) % BEAUTY_LOOKS.length];
  return { skin: b.skin, outfit: base.outfit, hair: b.hair, key: b.skin + '|' + base.outfit };
}

// 20:42 どちらの人形で描くか。女性の人形が読めなかった・?female=0 の時は男の人形に戻す。
export function dollKindFor(actor, femaleReady, state) {
  if (!femaleReady || !actor || actor.faction === 'beast' || mobLookKind(actor)) return 'm';
  return sexOf(actor, state) === 'f' ? 'f' : 'm';
}

// ?female=0 なら女性の人形を使わない（それ以外は使う）。
export function femaleEnabled(param) {
  return param !== '0';
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像を読めません: ' + url));
    img.src = url;
  });
}

// 素材10枚を読む。失敗したら null（従来の勢力色で表示する）。
export async function loadDollTextures(base, only) {
  const dir = base || 'assets/tex/';
  const names = only || [...SKINS, ...Object.values(OUTFITS).flat()];
  try {
    const images = await Promise.all(names.map((n) => loadImage(dir + n + '.png')));
    const map = {};
    names.forEach((n, i) => {
      map[n] = images[i];
    });
    return map;
  } catch (err) {
    console.warn('人形の服テクスチャを読めませんでした。勢力色で表示します。', err);
    return null;
  }
}

// 肌＋服の材質の置き場。THREE は呼び出し側から渡す（node のテストで読み込めるように）。
export function createLookCache(THREE, images) {
  const textures = new Map();
  const materials = new Map();

  function texture(look) {
    let tex = textures.get(look.key);
    if (tex) return tex;
    const canvas = document.createElement('canvas');
    canvas.width = TEX_SIZE;
    canvas.height = TEX_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(images[look.skin], 0, 0, TEX_SIZE, TEX_SIZE);
    ctx.drawImage(images[look.outfit], 0, 0, TEX_SIZE, TEX_SIZE);
    tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false; // glTF の UV 向き
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true; // 512px（2の累乗）なので遠景はミップマップで軽く・ちらつかない
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 2;
    textures.set(look.key, tex);
    return tex;
  }

  // dead=true は倒れた人の暗い版（材質を書き換えずに別の共有材質にする）。
  function material(look, dead) {
    const key = look.key + (dead ? '|dead' : '');
    let mat = materials.get(key);
    if (mat) return mat;
    mat = new THREE.MeshStandardMaterial({
      map: texture(look),
      color: dead ? 0x575757 : 0xffffff,
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    mat.name = 'look:' + key;
    mat.userData.shared = true;
    materials.set(key, mat);
    return mat;
  }

  function dispose() {
    for (const m of materials.values()) m.dispose();
    for (const t of textures.values()) t.dispose();
    materials.clear();
    textures.clear();
  }

  return {
    material,
    dispose,
    get textureCount() {
      return textures.size;
    },
    get materialCount() {
      return materials.size;
    },
  };
}
