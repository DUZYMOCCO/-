/**
 * ABYSS DIVE — Three.js 本格 3D 空間レンダラー（Phase 1: 回廊・ブラックホール）
 *
 * 将来の完全 3D 背後視点潜航（Phase 2）の基盤としても再利用できるよう、
 * 3D 潜水艇リグ・PBR 洞窟メッシュ・3D 加速リング・重力レンズ BH 背景を疎結合に構成する。
 *
 * 座標系（Three.js 標準右手系）:
 *   +X = 右 (pipe.cx, st.px)
 *   +Y = 上 (-pipe.cy, -st.py)
 *   -Z = 前方 (-progress * Z_SCALE)
 */

import * as THREE from '../vendor/three.module.min.js';
import { samplePipeAt } from './tunnel-rules.js?v=6';

const TAU = Math.PI * 2;
const Z_SCALE = 56.0;     // progress 0..1 を 3D ワールド長 56m へ写像
const BH_EXIT_P = 0.45;   // ブラックホールモードで洞窟を抜ける進行度

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/* =========================================================================
 * 1) リアルタイム重力レンズ・ブラックホール背景シェーダー（ShaderMaterial）
 *    ※ 好評だった一般相対論的光線屈折＋降着円盤＋光子球をそのまま Three.js へ統合
 * ========================================================================= */
const BH_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const BH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;
uniform float uBoost;
uniform vec2  uPlayerPos;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.06 + vec2(13.1, 7.7);
    a *= 0.5;
  }
  return v;
}

vec3 sampleStars(vec3 rd) {
  vec2 sph = vec2(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)));
  vec3 col = vec3(0.008, 0.006, 0.022);
  float band = exp(-abs(sph.y + sin(sph.x * 2.0) * 0.25) * 4.5);
  float neb = fbm(sph * 4.5 + vec2(1.2, 0.4));
  col += vec3(0.06, 0.08, 0.18) * band * neb;

  vec2 g1 = floor(sph * 65.0);
  float s1 = hash21(g1);
  if (s1 > 0.985) {
    vec2 f1 = fract(sph * 65.0) - 0.5;
    float br = smoothstep(0.28, 0.02, length(f1)) * (0.6 + 0.4 * sin(uTime * 3.0 + s1 * 100.0));
    vec3 starCol = mix(vec3(0.70, 0.86, 1.0), vec3(1.0, 0.90, 0.72), fract(s1 * 37.0));
    col += starCol * br * 1.45;
  }
  vec2 g2 = floor(sph * 130.0);
  float s2 = hash21(g2);
  if (s2 > 0.988) {
    vec2 f2 = fract(sph * 130.0) - 0.5;
    col += vec3(0.85, 0.92, 1.0) * smoothstep(0.25, 0.02, length(f2)) * 0.9;
  }
  return col;
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uRes.x / uRes.y;

  float distCam = mix(10.5, 3.6, pow(uProgress, 0.85));
  vec3 ro = vec3(uPlayerPos.x * 1.35, -uPlayerPos.y * 0.95 + 0.65, -distCam);
  vec3 target = vec3(0.0, 0.0, 0.0);

  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  float fov = mix(1.55, 1.30, uBoost);
  vec3 rd = normalize(fw * fov + rt * uv.x + up * uv.y);

  float tilt = 0.22;
  float ct = cos(tilt), st = sin(tilt);
  mat2 rotTilt = mat2(ct, -st, st, ct);

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 accum = vec3(0.0);
  float rs = 1.0;
  bool captured = false;

  for (int i = 0; i < 56; i++) {
    float r = length(pos);
    if (r < rs * 1.02) { captured = true; break; }
    if (r > 24.0) break;

    float stepLen = clamp(r * 0.11, 0.05, 0.75);
    vec3 grav = -pos * (1.42 / (r * r * r + 0.001));
    vec3 prevPos = pos;
    vel = normalize(vel + grav * stepLen);
    pos += vel * stepLen;

    vec3 pPrevT = prevPos; pPrevT.xy = rotTilt * pPrevT.xy;
    vec3 pCurrT = pos;     pCurrT.xy = rotTilt * pCurrT.xy;

    if (pPrevT.y * pCurrT.y <= 0.0) {
      float f = abs(pPrevT.y) / max(abs(pPrevT.y - pCurrT.y), 0.0001);
      vec3 hitP = mix(pPrevT, pCurrT, f);
      float rad = length(hitP.xz);
      if (rad > rs * 1.32 && rad < rs * 5.8) {
        float ang = atan(hitP.z, hitP.x);
        float spin = ang + uTime * (1.8 / pow(rad, 0.65)) - rad * 1.65;
        float bands = fbm(vec2(rad * 2.6, spin * 1.8));
        float streak = 0.55 + 0.45 * sin(rad * 10.0 - uTime * 2.5 + bands * 4.0);
        float radialFade = smoothstep(rs * 1.32, rs * 1.85, rad) * smoothstep(rs * 5.8, rs * 2.4, rad);

        float doppler = clamp(0.5 + 0.5 * (-hitP.x / max(rad, 0.01)), 0.0, 1.0);
        vec3 hotCol  = vec3(1.00, 0.94, 0.78);
        vec3 midCol  = vec3(1.00, 0.58, 0.22);
        vec3 coolCol = vec3(0.42, 0.52, 1.00);
        vec3 diskCol = mix(mix(coolCol, midCol, doppler), hotCol, pow(doppler, 2.2) * 0.78);

        float intensity = radialFade * (0.45 + 0.85 * bands * streak) * (0.65 + 1.15 * doppler);
        accum += diskCol * intensity * 0.62;
      }
    }

    float photon = exp(-abs(r - rs * 1.48) * 10.0) * 0.038;
    accum += vec3(1.0, 0.88, 0.66) * photon;
  }

  vec3 bg = captured ? vec3(0.0) : sampleStars(vel);
  vec3 col = bg + accum;
  col += vec3(0.18, 0.42, 0.75) * uBoost * 0.10 * (1.0 - length(uv) * 0.35);
  col = col / (1.0 + col * 0.55);
  col = pow(max(col, 0.0), vec3(0.92));

  gl_FragColor = vec4(col, 1.0);
}
`;

/* =========================================================================
 * 2) 本物の 3D 潜水艇リグ（STORY.md §2.7: 3モード物理変形・控えめなスリット発光）
 *    Phase 1（回廊・BH）と Phase 2（完全 3D 深海探査）でそのまま共有する。
 * ========================================================================= */
const MODE_SLIT_COLORS = {
  speed:   new THREE.Color(0x76e8ff), // 機動モード: 青白い極細スリット
  power:   new THREE.Color(0xff7236), // パワーモード: 赤橙色の極細スリット
  barrier: new THREE.Color(0x66eeb8), // バリアモード: エメラルド黄金の極細スリット
};

export function createSubmarineRig() {
  const root = new THREE.Group();

  // 耐圧チタン船体（テカリを抑えたマットな実戦塗装の潜水艦スチール）
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x3b5363,
    metalness: 0.24,
    roughness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xb68d52,
    metalness: 0.52,
    roughness: 0.48,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1b2730,
    metalness: 0.28,
    roughness: 0.68,
  });
  // 絶景を邪魔しない控えめな極細スリット発光マテリアル（モード切替で色遷移）
  const slitMat = new THREE.MeshStandardMaterial({
    color: 0x76e8ff,
    emissive: 0x76e8ff,
    emissiveIntensity: 0.95,
    roughness: 0.25,
    metalness: 0.2,
  });

  // メイン船体（-Z が前、+Z が後ろ）
  const hullGeo = new THREE.SphereGeometry(0.145, 24, 18);
  hullGeo.scale(1.0, 0.78, 2.35);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  root.add(hull);

  // 船体側面の極細発光スリット（左右 2 本）
  const slitGeoSide = new THREE.BoxGeometry(0.008, 0.010, 0.34);
  for (const side of [-1, 1]) {
    const sLine = new THREE.Mesh(slitGeoSide, slitMat);
    sLine.position.set(side * 0.138, 0.012, -0.02);
    root.add(sLine);
  }

  // バリアモードで全周展開する超電導リングコイル 2 基（通常時は船体へ密着格納）
  const coilGeo = new THREE.TorusGeometry(0.136, 0.011, 10, 28);
  coilGeo.scale(1.0, 0.78, 1.0);
  const coilFront = new THREE.Mesh(coilGeo, trimMat);
  coilFront.position.z = -0.10;
  const coilBack = new THREE.Mesh(coilGeo, trimMat);
  coilBack.position.z = 0.11;
  root.add(coilFront, coilBack);

  // 艦橋（背びれセイル）
  const sailGeo = new THREE.BoxGeometry(0.056, 0.095, 0.17);
  const sail = new THREE.Mesh(sailGeo, hullMat);
  sail.position.set(0, 0.115, -0.04);
  root.add(sail);

  // 艦橋後部の極細スリット
  const slitSail = new THREE.Mesh(new THREE.BoxGeometry(0.040, 0.014, 0.018), slitMat);
  slitSail.position.set(0, 0.135, 0.045);
  root.add(slitSail);

  // 左右の可変ハイドロプレーン翼＆パワーモード展開アーマー・武装エミッター
  const wings = [];
  const powerPods = [];
  const wingGeo = new THREE.BoxGeometry(0.24, 0.022, 0.12);
  const podGeo = new THREE.BoxGeometry(0.055, 0.048, 0.18);
  const muzzleGeo = new THREE.CylinderGeometry(0.014, 0.018, 0.10, 10);
  muzzleGeo.rotateX(Math.PI * 0.5);

  for (const side of [-1, 1]) {
    const wingPivot = new THREE.Group();
    wingPivot.position.set(side * 0.12, -0.015, 0.01);
    const wing = new THREE.Mesh(wingGeo, hullMat);
    wing.position.set(side * 0.10, 0, 0.01);
    wing.rotation.z = -side * 0.06;
    wingPivot.add(wing);

    // 翼端ナビゲーション灯（控えめな赤／青緑）
    const nav = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 10, 10),
      new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff6e52 : 0x62ffbe })
    );
    nav.position.set(side * 0.215, -0.008, 0.04);
    wingPivot.add(nav);
    root.add(wingPivot);
    wings.push({ pivot: wingPivot, side });

    // パワーモードで側面からスライド展開する装甲ポッド＋武装エミッター
    const pod = new THREE.Group();
    pod.position.set(side * 0.125, -0.02, -0.14);
    const podBody = new THREE.Mesh(podGeo, darkMetal);
    const muzzle = new THREE.Mesh(muzzleGeo, trimMat);
    muzzle.position.z = -0.10;
    const podSlit = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.012, 0.14), slitMat);
    podSlit.position.set(side * 0.028, 0, -0.01);
    pod.add(podBody, muzzle, podSlit);
    root.add(pod);
    powerPods.push({ pod, side });

    // 前方ヘッドライト球
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc })
    );
    lamp.position.set(side * 0.105, -0.01, -0.26);
    root.add(lamp);

    // ボリューメトリック・ヘッドライト光束コーン（前方 -Z へ伸びる）
    const coneGeo = new THREE.CylinderGeometry(0.025, 0.42, 3.6, 16, 1, true);
    coneGeo.rotateX(Math.PI * 0.5);
    coneGeo.translate(0, 0, -1.8);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xbef2ff,
      transparent: true,
      opacity: 0.085,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(side * 0.105, -0.01, -0.26);
    cone.name = side < 0 ? 'beamL' : 'beamR';
    root.add(cone);
  }

  // 後部シュラウド＆回転真鍮スクリュー（船尾 z=0.34 のすぐ後ろに配置して羽根をしっかり見せる）
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.014, 10, 24), trimMat);
  shroud.position.z = 0.36;
  root.add(shroud);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.06, 12), darkMetal);
  hub.rotation.x = Math.PI * 0.5;
  hub.position.z = 0.36;
  root.add(hub);

  const propeller = new THREE.Group();
  propeller.position.z = 0.372;
  const bladeGeo = new THREE.BoxGeometry(0.026, 0.072, 0.009);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(bladeGeo, trimMat);
    const ang = (i / 4) * TAU;
    blade.position.set(Math.cos(ang) * 0.042, Math.sin(ang) * 0.042, 0);
    blade.rotation.z = ang;
    blade.rotation.x = 0.44;
    propeller.add(blade);
  }
  root.add(propeller);

  // スクリュー噴流コア＆アフターバーナーコーン
  const jetMat = new THREE.MeshBasicMaterial({
    color: 0x6ceeff,
    transparent: true,
    opacity: 0.30,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const jetGeo = new THREE.ConeGeometry(0.046, 0.34, 14, 1, true);
  jetGeo.rotateX(Math.PI * 0.5);
  jetGeo.translate(0, 0, 0.19);
  const jet = new THREE.Mesh(jetGeo, jetMat);
  jet.position.z = 0.39;
  root.add(jet);

  // 3D バリアドーム（絶景を邪魔しない淡い半透明表現。バリアモード／接近時のみ淡く波紋）
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0x66eeb8,
    transparent: true,
    opacity: 0.12,
    wireframe: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(0.39, 2), shieldMat);
  shield.visible = false;
  root.add(shield);

  // 本物の PBR スポットライト（洞窟の玄武岩壁をリアルタイム 3D 照光！）
  const spotLight = new THREE.SpotLight(0xf6f4df, 32, 30, Math.PI * 0.30, 0.65, 1.25);
  spotLight.position.set(0, 0.02, -0.22);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0, -5.5);
  root.add(spotLight, spotTarget);
  spotLight.target = spotTarget;

  // 自艇近傍をほんのり照らす補助ポイントライト
  const fillLight = new THREE.PointLight(0x52c8e8, 2.8, 6.5, 1.6);
  fillLight.position.set(0, 0.16, 0.28);
  root.add(fillLight);

  // ---- 3モード物理変形ステートマシン（2.5秒で滑らかに変形・変形中も操作継続可能） ----
  const modeState = {
    current: 'speed',   // 'speed' | 'power' | 'barrier'
    target: 'speed',
    morphT: 1.0,        // 0..1（2.5秒かけて 1.0 へ到達）
    weights: { speed: 1, power: 0, barrier: 0 },
  };
  const tmpColor = new THREE.Color();

  function setMode(nextMode) {
    if (!MODE_SLIT_COLORS[nextMode] || nextMode === modeState.target) return false;
    modeState.target = nextMode;
    modeState.morphT = 0.0;
    return true;
  }

  function updateTransform(dt, elapsed) {
    if (modeState.morphT < 1.0) {
      modeState.morphT = Math.min(1.0, modeState.morphT + dt / 2.5);
      if (modeState.morphT >= 1.0) modeState.current = modeState.target;
    }
    const w = modeState.weights;
    const rate = Math.min(1, dt * 2.4);
    w.speed   += ((modeState.target === 'speed'   ? 1 : 0) - w.speed)   * rate;
    w.power   += ((modeState.target === 'power'   ? 1 : 0) - w.power)   * rate;
    w.barrier += ((modeState.target === 'barrier' ? 1 : 0) - w.barrier) * rate;

    // 1) 機動モード: 翼を後方へ流線形に折り畳み、シュラウドをわずかに後退
    for (const wg of wings) {
      const sweep = wg.side * (0.18 + w.speed * 0.44 - w.power * 0.12);
      wg.pivot.rotation.y = sweep;
      wg.pivot.position.x = wg.side * (0.12 - w.speed * 0.025 + w.barrier * 0.02);
    }
    shroud.position.z = 0.36 + w.speed * 0.03;

    // 2) パワーモード: 側面装甲ポッド＆武装エミッターを外側前方へスライド展開
    for (const pp of powerPods) {
      pp.pod.position.x = pp.side * (0.105 + w.power * 0.085);
      pp.pod.position.z = -0.10 - w.power * 0.095;
      pp.pod.scale.setScalar(0.75 + w.power * 0.35);
    }

    // 3) バリアモード: 超電導リングコイルが全周展開＆逆回転
    const coilScale = 1.0 + w.barrier * 0.62;
    coilFront.scale.set(coilScale, coilScale, 1.0);
    coilBack.scale.set(coilScale, coilScale, 1.0);
    coilFront.rotation.z = elapsed * (0.2 + w.barrier * 1.4);
    coilBack.rotation.z = -elapsed * (0.2 + w.barrier * 1.4);
    if (w.barrier > 0.15) {
      shield.visible = true;
      shield.rotation.y = elapsed * 0.9;
      shieldMat.opacity = 0.04 + w.barrier * (0.09 + 0.03 * Math.sin(elapsed * 4.0));
    }

    // 4) 控えめな極細スリット発光色の滑らかな補間
    tmpColor.setRGB(
      MODE_SLIT_COLORS.speed.r * w.speed + MODE_SLIT_COLORS.power.r * w.power + MODE_SLIT_COLORS.barrier.r * w.barrier,
      MODE_SLIT_COLORS.speed.g * w.speed + MODE_SLIT_COLORS.power.g * w.power + MODE_SLIT_COLORS.barrier.g * w.barrier,
      MODE_SLIT_COLORS.speed.b * w.speed + MODE_SLIT_COLORS.power.b * w.power + MODE_SLIT_COLORS.barrier.b * w.barrier
    );
    slitMat.color.copy(tmpColor);
    slitMat.emissive.copy(tmpColor);
    // 変形中は淡く明滅して物理変形シークエンスを視覚化
    const morphPulse = modeState.morphT < 1.0 ? (0.75 + 0.55 * Math.sin(elapsed * 18.0)) : 0.92;
    slitMat.emissiveIntensity = morphPulse;
  }

  return {
    root,
    propeller,
    jet,
    jetMat,
    shield,
    spotLight,
    fillLight,
    beamL: root.getObjectByName('beamL'),
    beamR: root.getObjectByName('beamR'),
    setMode,
    updateTransform,
    getModeState: () => modeState,
  };
}

/* =========================================================================
 * 3) 本物の 3D 連続海底洞窟チューブメッシュ（samplePipeAt と完全同一数式）
 * ========================================================================= */
function buildCaveMesh(theme, textures) {
  const isBH = theme.id === 'blackhole';
  const pStart = -0.06;
  const pEnd = isBH ? BH_EXIT_P : 1.10;
  const segZ = isBH ? 115 : 185;
  const segT = 32;

  const vertCount = (segZ + 1) * (segT + 1);
  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const colors = new Float32Array(vertCount * 3);
  const indices = [];

  let vi = 0;
  let ui = 0;
  let ci = 0;

  for (let iz = 0; iz <= segZ; iz++) {
    const fz = iz / segZ;
    const p = pStart + (pEnd - pStart) * fz;
    const pipe = samplePipeAt(theme, Math.max(0, p));
    const zWorld = -p * Z_SCALE;

    // BH モード出口手前ではカルデラ状に大きく広がる
    let radBase = pipe.r;
    let exitWarm = 0;
    if (isBH) {
      const funnel = smoothstep(BH_EXIT_P - 0.12, BH_EXIT_P, p);
      radBase += funnel * funnel * 1.45;
      exitWarm = smoothstep(BH_EXIT_P - 0.16, BH_EXIT_P, p);
    }

    for (let it = 0; it <= segT; it++) {
      const ft = it / segT;
      const ang = ft * TAU;

      // 連続する 3D 岩肌の凹凸（継ぎ目ゼロ）
      const disp =
        Math.sin(ang * 5.0 + zWorld * 0.42) * Math.cos(zWorld * 0.28 - ang * 3.0) * 0.085 +
        Math.sin(ang * 11.0 - zWorld * 0.95) * 0.036 +
        Math.cos(ang * 3.0 + zWorld * 0.70) * 0.032;
      const r = radBase + disp;

      const x = pipe.cx + Math.cos(ang) * r;
      const y = -pipe.cy + Math.sin(ang) * r;

      positions[vi++] = x;
      positions[vi++] = y;
      positions[vi++] = zWorld;

      uvs[ui++] = ft * 2.0;
      uvs[ui++] = p * 14.0;

      // 頂点カラー（洞窟内は自然な深海明暗、BH 出口付近は降着円盤の黄金逆光！）
      const ao = 0.72 + 0.28 * clamp((disp + 0.12) / 0.24, 0, 1);
      const cr = ao * (1.0 + exitWarm * 0.95);
      const cg = ao * (1.0 + exitWarm * 0.55);
      const cb = ao * (1.0 - exitWarm * 0.25);
      colors[ci++] = cr;
      colors[ci++] = cg;
      colors[ci++] = cb;
    }
  }

  for (let iz = 0; iz < segZ; iz++) {
    for (let it = 0; it < segT; it++) {
      const a = iz * (segT + 1) + it;
      const b = a + (segT + 1);
      const c = b + 1;
      const d = a + 1;
      // チューブ内側（法線が中心向き）になる巻き順
      indices.push(a, c, b, a, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  // 円筒 0° / 360° の継ぎ目（it=0 と it=segT）の法線を平均化して完全シームレス化！
  const nAttr = geo.attributes.normal;
  for (let iz = 0; iz <= segZ; iz++) {
    const i0 = iz * (segT + 1);
    const i1 = i0 + segT;
    const nx = nAttr.getX(i0) + nAttr.getX(i1);
    const ny = nAttr.getY(i0) + nAttr.getY(i1);
    const nz = nAttr.getZ(i0) + nAttr.getZ(i1);
    const len = Math.hypot(nx, ny, nz) || 1;
    nAttr.setXYZ(i0, nx / len, ny / len, nz / len);
    nAttr.setXYZ(i1, nx / len, ny / len, nz / len);
  }
  nAttr.needsUpdate = true;

  const mat = new THREE.MeshStandardMaterial({
    map: textures.albedo,
    normalMap: textures.normal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    emissiveMap: textures.emissive,
    emissive: new THREE.Color(0x38d8ff),
    emissiveIntensity: 1.55,
    vertexColors: true,
    roughness: 0.76,
    metalness: 0.16,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return { mesh, mat };
}

/* =========================================================================
 * 4) 3D 水中パーティクル（マリンスノー＆深海気泡）
 * ========================================================================= */
function createGlowDotTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.32, 'rgba(185,244,255,0.85)');
  grad.addColorStop(0.70, 'rgba(110,215,255,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function buildWaterParticles(count) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * TAU;
    const r = 0.24 + Math.random() * 1.12;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
    positions[i * 3 + 2] = -Math.random() * 16.0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xbef5ff,
    map: createGlowDotTexture(),
    size: 0.085,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, geo, mat, count };
}

/* =========================================================================
 * 5) Three.js 3D トンネル＆ブラックホール・レンダラー本体
 * ========================================================================= */
export function createTunnelThree(opts) {
  if (typeof document === 'undefined') return null;
  const w = (opts && opts.width) || 960;
  const h = (opts && opts.height) || 540;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    console.warn('[tunnel-three] WebGLRenderer init failed:', e);
    return null;
  }
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x041624, 0.072);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(62, w / h, 0.08, 120);

  // 環境光＋深海半球ライト
  const hemiLight = new THREE.HemisphereLight(0x52b8e0, 0x0a1c2a, 0.85);
  scene.add(hemiLight);

  // BH モードで宇宙へ出たとき自艇を黄金・蒼に照らす降着円盤ライト
  const bhRimLight = new THREE.DirectionalLight(0xffcb7a, 0.0);
  bhRimLight.position.set(-1.5, 0.8, -10.0);
  scene.add(bhRimLight);
  const bhCoolLight = new THREE.DirectionalLight(0x5c8eff, 0.0);
  bhCoolLight.position.set(2.5, -0.5, -6.0);
  scene.add(bhCoolLight);

  // テクスチャ読み込み（ComfyUI 玄武岩 + Depth Anything V2 法線 + 発光マップ）
  const loader = new THREE.TextureLoader();
  const loadTex = (rel, isSRGB) => {
    const tex = loader.load(new URL('../assets/' + rel, import.meta.url).href);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const textures = {
    albedo: loadTex('tunnel_canyon_wall.webp', true),
    normal: loadTex('tunnel_canyon_wall_n.webp', false),
    emissive: loadTex('tunnel_canyon_wall_e.webp', true),
  };

  // 背景専用シーン（重力レンズ・ブラックホール）
  const bhScene = new THREE.Scene();
  const bhCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bhUniforms = {
    uRes: { value: new THREE.Vector2(w, h) },
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uBoost: { value: 0 },
    uPlayerPos: { value: new THREE.Vector2(0, 0) },
  };
  const bhMat = new THREE.ShaderMaterial({
    vertexShader: BH_VERT,
    fragmentShader: BH_FRAG,
    uniforms: bhUniforms,
    depthTest: false,
    depthWrite: false,
  });
  bhScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bhMat));

  // 3D 潜水艇リグ
  const sub = createSubmarineRig();
  scene.add(sub.root);

  // 3D 水中パーティクル
  const particles = buildWaterParticles(240);
  scene.add(particles.points);

  // テーマごとの洞窟メッシュキャッシュ
  const caveCache = new Map();
  let activeThemeId = null;
  let activeCave = null;

  function ensureTheme(st) {
    const tid = st.theme.id;
    if (activeThemeId !== tid) {
      if (activeCave) scene.remove(activeCave.mesh);
      if (!caveCache.has(tid)) {
        caveCache.set(tid, buildCaveMesh(st.theme, textures));
      }
      activeCave = caveCache.get(tid);
      scene.add(activeCave.mesh);
      activeThemeId = tid;
    }
  }

  const colFogA = new THREE.Color();
  const colFogB = new THREE.Color();
  const colVein = new THREE.Color();

  function updateBiomeLighting(st, boostAmt) {
    const prog = st.progress;
    const isBH = st.theme.id === 'blackhole';
    const isUp = st.theme.id === 'corridor_up';

    if (isBH) {
      const spaceT = smoothstep(BH_EXIT_P - 0.08, BH_EXIT_P + 0.04, prog);
      colFogA.setRGB(0.02, 0.07, 0.13);
      fog.color.copy(colFogA);
      // 宇宙へ出たら水中フォグを完全消去
      fog.density = 0.055 * (1.0 - spaceT);
      colVein.setRGB(0.32 + spaceT * 0.65, 0.82 - spaceT * 0.12, 1.0 - spaceT * 0.55);
      activeCave.mat.emissive.copy(colVein);
      activeCave.mat.emissiveIntensity = 1.45;
      // 宇宙空間では降着円盤の黄金＆青方偏移ライトが 3D 潜水艇を劇的に照らす！
      bhRimLight.intensity = 1.1 + spaceT * 3.2;
      bhCoolLight.intensity = 0.4 + spaceT * 1.6;
      hemiLight.intensity = 0.85 - spaceT * 0.35;
    } else if (isUp) {
      colFogA.setRGB(0.04, 0.15, 0.24).lerp(colFogB.setRGB(0.05, 0.24, 0.35), prog);
      fog.color.copy(colFogA);
      fog.density = 0.068;
      colVein.setRGB(1.0, 0.78, 0.38).lerp(colFogB.setRGB(0.45, 0.94, 1.0), prog);
      activeCave.mat.emissive.copy(colVein);
      activeCave.mat.emissiveIntensity = 1.55;
      bhRimLight.intensity = 0;
      bhCoolLight.intensity = 0;
      hemiLight.intensity = 0.95;
    } else {
      const mid = clamp((prog - 0.15) / 0.45, 0, 1);
      const end = clamp((prog - 0.55) / 0.45, 0, 1);
      colFogA.setRGB(0.02, 0.09, 0.15)
        .lerp(colFogB.setRGB(0.12, 0.06, 0.07), mid)
        .lerp(colFogB.setRGB(0.05, 0.22, 0.33), end);
      fog.color.copy(colFogA);
      fog.density = 0.070 - end * 0.015;
      colVein.setRGB(0.24, 0.82, 0.98)
        .lerp(colFogB.setRGB(1.0, 0.48, 0.20), mid)
        .lerp(colFogB.setRGB(0.46, 0.96, 1.0), end);
      activeCave.mat.emissive.copy(colVein);
      activeCave.mat.emissiveIntensity = 1.60;
      bhRimLight.intensity = 0;
      bhCoolLight.intensity = 0;
      hemiLight.intensity = 0.92;
    }

    // ブースト時はヘッドライトと視野角を強化
    sub.spotLight.intensity = 32 + boostAmt * 18;
    sub.spotLight.color.setHex(boostAmt > 0.2 ? 0xc8fbff : 0xfff6dc);
  }

  function renderFrame(st, camX, camY, shieldOn) {
    ensureTheme(st);

    const isBH = st.theme.id === 'blackhole';
    const boostAmt = Math.min(1, st.boostT / 0.8);
    const zSub = -st.progress * Z_SCALE;

    updateBiomeLighting(st, boostAmt);

    // 1) 3D 潜水艇の位置・バンク・ピッチ・回転スクリュー更新
    sub.root.position.set(st.px, -st.py, zSub);
    sub.root.rotation.set(
      -st.pitch * 0.95,
      -st.vx * 0.14,
      -st.roll * 1.15
    );
    sub.propeller.rotation.z = st.time * (boostAmt > 0.1 ? 34 : 20);
    const jetScale = 1.0 + boostAmt * 0.95 + Math.sin(st.time * 42) * 0.12;
    sub.jet.scale.set(1.0 + boostAmt * 0.35, 1.0 + boostAmt * 0.35, jetScale);
    sub.jetMat.opacity = 0.38 + boostAmt * 0.42;
    sub.shield.visible = !!shieldOn;
    if (shieldOn) {
      sub.shield.rotation.y = st.time * 1.6;
      sub.shield.rotation.x = st.time * 0.9;
    }
    const beamOpacity = isBH
      ? (0.11 * (1.0 - smoothstep(BH_EXIT_P - 0.05, BH_EXIT_P + 0.05, st.progress)))
      : (0.11 + boostAmt * 0.06);
    if (sub.beamL) sub.beamL.material.opacity = beamOpacity;
    if (sub.beamR) sub.beamR.material.opacity = beamOpacity;

    // 2) 3D 背後カメラ（自艇の後ろから前方のパイプ先を見据える）
    const pipeAhead = samplePipeAt(st.theme, Math.min(1.1, st.progress + 0.08));
    const shakeX = st.shake > 0 ? Math.sin(st.time * 62) * 0.045 * st.shake : 0;
    const shakeY = st.shake > 0 ? Math.cos(st.time * 53) * 0.032 * st.shake : 0;

    camera.fov = 62 + boostAmt * 9;
    camera.updateProjectionMatrix();
    camera.position.set(
      camX * 0.85 + st.px * 0.15 + shakeX,
      -(camY * 0.85 + st.py * 0.15) + 0.16 + shakeY,
      zSub + 1.38
    );
    camera.lookAt(
      pipeAhead.cx * 0.65 + st.px * 0.35,
      -(pipeAhead.cy * 0.65 + st.py * 0.35) + 0.03,
      zSub - 5.2
    );

    // 3) 3D 水中パーティクル（カメラ前方を常に周回リサイクル）
    const posArr = particles.geo.attributes.position.array;
    const zMin = zSub - 15.0;
    const zMax = zSub + 1.2;
    const span = zMax - zMin;
    for (let i = 0; i < particles.count; i++) {
      let pz = posArr[i * 3 + 2];
      while (pz > zMax) pz -= span;
      while (pz < zMin) pz += span;
      posArr[i * 3 + 2] = pz;
    }
    particles.geo.attributes.position.needsUpdate = true;
    particles.mat.opacity = isBH
      ? (0.58 * (1.0 - smoothstep(BH_EXIT_P - 0.04, BH_EXIT_P + 0.06, st.progress)))
      : (0.55 + boostAmt * 0.25);

    // 5) 描画パス
    renderer.clear();

    if (isBH) {
      // 背景にリアルタイム重力レンズ・ブラックホールを描画し、その手前に 3D 洞窟＋3D 潜水艇を重ねる
      bhUniforms.uTime.value = st.time;
      bhUniforms.uProgress.value = Math.min(1, st.progress * 0.35 + Math.max(0, (st.progress - 0.42) / 0.58) * 0.65);
      bhUniforms.uBoost.value = boostAmt;
      bhUniforms.uPlayerPos.value.set(st.px, st.py);
      renderer.render(bhScene, bhCam);
      renderer.clearDepth();
    } else {
      renderer.setClearColor(fog.color, 1);
      renderer.clearColor();
    }

    // BH モードで洞窟を抜けた後半は洞窟メッシュを非表示にして描画負荷をさらに削減
    if (activeCave) {
      activeCave.mesh.visible = !isBH || st.progress < BH_EXIT_P + 0.06;
    }

    renderer.render(scene, camera);
    return renderer.domElement;
  }

  return { canvas: renderer.domElement, renderFrame };
}
