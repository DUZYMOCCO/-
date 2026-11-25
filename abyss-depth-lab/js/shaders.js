/**
 * Depth Stacking — GLSL ES 3.00 シェーダー群
 *
 * パイプライン:
 *   1. OCCLUDER   : 遮蔽体（巨大生物・岩柱・遺跡）の低解像度深度付きマスク生成
 *   2. LIGHT_GROUP: 5ライティンググループのアトラス生成（環境光 + 動的Tier1/Tier2光源 + 遮蔽ソフトシャドウ + 水中光散乱）
 *   3. SPRITE     : 多層2D本体描画（水流揺れ/遊泳波動 + 屈折 + 疑似ボケ + 隣接2ライトグループ連続補間 + 法線立体照光 + Beer-Lambert水中濁り + 発光マップ）
 *   4. BEAM       : 潜水艇ライト＆深海コースティクスのボリュメトリック光条（遮蔽マスク反応）
 *   5. PARTICLE   : 多層浮遊粒子（マリンスノー・発光プランクトン・気泡：ライトバッファから直接照光）
 *   6. BLOOM / COMPOSITE : 発光抽出・ガウスブラー・ACESトーンマッピング最終合成
 */

export const FULLSCREEN_VS = `#version 300 es
precision highp float;
const vec2 POS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2( 3.0, -1.0),
  vec2(-1.0,  3.0)
);
out vec2 vUv;
void main() {
  vec2 p = POS[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

export const SPRITE_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPos; // -0.5..0.5
layout(location = 1) in vec2 aUv;  //  0.0..1.0

uniform vec2  uViewSize;      // 論理ビュー (1748, 804)
uniform vec2  uCenterScreen;  // スクリーン論理中心
uniform vec2  uSizeScreen;    // スクリーン論理サイズ
uniform float uRotation;
uniform vec2  uFlip;          // (1 or -1, 1 or -1)
uniform vec4  uUvRect;        // (u0, v0, du, dv)
uniform float uTime;
uniform float uSwayAmp;       // 水流揺れ振幅 (px)
uniform float uSwayFreq;
uniform float uSwayPhase;
uniform int   uDeformMode;    // 0:none, 1:kelp(bottom anchor), 2:hang(top anchor), 3:swim(horizontal wave)
uniform float uDepthNorm;     // 0(手前) .. 1(奥)

out vec2 vUv;
out vec2 vLocalUv;
out vec2 vScreenUv;

void main() {
  vec2 local = aPos;
  vec2 uv = aUv;

  // 頂点変形（水流揺れ・巨大生物の優雅な遊泳波動）
  if (uDeformMode == 1 && uSwayAmp > 0.001) {
    // 根元(uv.y = 1)固定、先端(uv.y = 0)ほど大きくたなびく
    float tip = 1.0 - uv.y;
    float w = tip * tip;
    float wave = sin(uTime * uSwayFreq + uSwayPhase + tip * 3.2)
               + 0.42 * sin(uTime * uSwayFreq * 1.618 + uSwayPhase * 1.7 + tip * 5.4);
    local.x += (wave * uSwayAmp / max(1.0, uSizeScreen.x)) * w;
    local.y += abs(wave) * (uSwayAmp * 0.14 / max(1.0, uSizeScreen.y)) * w;
  } else if (uDeformMode == 2 && uSwayAmp > 0.001) {
    // 上端(uv.y = 0)固定、垂れ下がる海藻・蔓
    float tip = uv.y;
    float w = tip * tip;
    float wave = sin(uTime * uSwayFreq + uSwayPhase + tip * 2.8)
               + 0.35 * cos(uTime * uSwayFreq * 1.414 + uSwayPhase + tip * 4.5);
    local.x += (wave * uSwayAmp / max(1.0, uSizeScreen.x)) * w;
  } else if (uDeformMode == 3 && uSwayAmp > 0.001) {
    // 巨大生物の水平遊泳うねり（頭側を抑え、胴〜尾へ滑らかに波打つ）
    float body = 1.0 - uv.x;
    float w = 0.25 + 0.75 * body * body;
    float wave = sin(uTime * uSwayFreq + uSwayPhase - uv.x * 4.6);
    local.y += (wave * uSwayAmp / max(1.0, uSizeScreen.y)) * w;
  }

  vec2 scaled = local * uSizeScreen * uFlip;
  float c = cos(uRotation);
  float s = sin(uRotation);
  vec2 rot = vec2(scaled.x * c - scaled.y * s, scaled.x * s + scaled.y * c);
  vec2 scr = uCenterScreen + rot;

  vec2 ndc = vec2(
    (scr.x / uViewSize.x) * 2.0 - 1.0,
    1.0 - (scr.y / uViewSize.y) * 2.0
  );

  gl_Position = vec4(ndc, uDepthNorm * 2.0 - 1.0, 1.0);
  vUv = uUvRect.xy + uv * uUvRect.zw;
  vLocalUv = uv;
  vScreenUv = vec2(scr.x / uViewSize.x, 1.0 - scr.y / uViewSize.y);
}
`;

/**
 * Pass 1: 遮蔽マスク（巨大生物・主要岩柱・遺跡アーチのシルエットと奥行きを書き込む）
 * R = 遮蔽不透明度, G = 正規化深度 (0:手前 .. 1:奥), B = 遮蔽強度
 */
export const OCCLUDER_FS = `#version 300 es
precision highp float;

uniform sampler2D uColorTex;
uniform float uOccluderWeight;
uniform float uDepthNorm;

in vec2 vUv;
out vec4 fragColor;

void main() {
  float a = texture(uColorTex, vUv).a;
  if (a < 0.22) discard;
  float occ = smoothstep(0.22, 0.72, a) * uOccluderWeight;
  fragColor = vec4(occ, uDepthNorm, 1.0, 1.0);
}
`;

/**
 * Pass 2: 5グループ空間ライトバッファ（低解像度ライトアトラスの1タイルを描画）
 * - ワールド座標を厳密復元（カメラ移動・ズーム完全連動）
 * - Tier 1 高品質光源（最大6）: 3D距離減衰 + スポットコーン + 遮蔽ソフトシャドウ(10ステップ) + 水中光散乱
 * - Tier 2 簡易光源（最大16）: 3D距離減衰加算
 * - Tier 4 深海環境光 + 海面コースティクス揺らぎ
 * 出力: RGB = 入射光 (HDR寄りスケール), A = 水中光散乱エネルギー
 */
export const LIGHT_GROUP_FS = `#version 300 es
precision highp float;

uniform sampler2D uOccluderTex;
uniform vec2  uViewSize;
uniform vec2  uCamPos;
uniform float uCamZoom;
uniform float uCameraDist;
uniform float uParallaxStrength;
uniform float uGroupZ;
uniform float uGroupDepthNorm; // (uGroupZ + 0.6) / 10.6
uniform float uTime;
uniform float uTurbidity;
uniform float uShadowStrength;
uniform float uScatterStrength;
uniform float uAmbientBoost;
uniform vec3  uShallowAmb;
uniform vec3  uDeepAmb;
uniform vec3  uScatterTint;
uniform float uCausticsStrength;
uniform int   uEnableShadows;
uniform int   uEnableCaustics;

// Tier 1 高品質光源 (最大6)
uniform int   uHighLightCount;
uniform vec4  uHighPosZ[6];     // xyz = world (x,y,z), w = radius
uniform vec4  uHighColorI[6];   // rgb = color, w = intensity
uniform vec4  uHighDirCone[6];  // xy = dir, z = cosHalfAngle (<= -1.5 means omni), w = coneSoftness
uniform vec4  uHighScreen[6];   // xy = screenUv (0..1), z = zDepthNorm, w = zRange

// Tier 2 簡易光源 (最大16)
uniform int   uSimpleLightCount;
uniform vec4  uSimplePosZ[16];    // xyz = world, w = radius
uniform vec4  uSimpleColorI[16];  // rgb = color, w = intensity

in vec2 vUv; // 0..1 (gl_FragCoord 基準のタイル内UV)
out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// 遮蔽マスクに対する2D放射レイマーチ（深度比較つきソフトシャドウ）
float computeShadow(vec2 pixelUv, vec2 lightUv, float lightDepthNorm, float pixelDepthNorm) {
  if (uEnableShadows == 0 || uShadowStrength <= 0.001) return 1.0;
  vec2 delta = pixelUv - lightUv;
  float dist = length(delta);
  if (dist < 0.008) return 1.0;

  // 遮蔽体が光源とピクセルの間（または同深度帯）にあるときだけ影を落とす
  float minD = min(lightDepthNorm, pixelDepthNorm) - 0.045;
  float maxD = max(lightDepthNorm, pixelDepthNorm) + 0.065;

  const int STEPS = 11;
  float jitter = (hash21(pixelUv * 317.0 + fract(uTime * 0.07)) - 0.5) * 0.06;
  float blocked = 0.0;

  for (int i = 1; i <= STEPS; i++) {
    float t = (float(i) + jitter) / float(STEPS + 1);
    // 光源近傍とピクセル極近傍は自己遮蔽を避ける
    float st = mix(0.06, 0.93, t);
    vec2 sampleUv = lightUv + delta * st;
    if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) continue;
    vec4 occ = texture(uOccluderTex, sampleUv);
    if (occ.r > 0.05 && occ.g >= minD && occ.g <= maxD) {
      // 光源に近い遮蔽体ほど広く濃い影を落とす
      float proximity = mix(1.15, 0.55, t);
      blocked = max(blocked, occ.r * proximity);
    }
  }
  return 1.0 - clamp(blocked * uShadowStrength, 0.0, 0.88);
}

// 海面からの微細な深海コースティクス揺らぎ（カメラ非依存のワールド座標ベース）
float deepCaustics(vec2 wpos, float z, float t) {
  if (uEnableCaustics == 0) return 0.0;
  float depthFade = exp(-max(0.0, (wpos.y + 620.0)) * 0.0011) * exp(-max(0.0, z) * 0.14);
  float rayX = wpos.x * 0.0026 + wpos.y * 0.00055;
  float w1 = sin(rayX * 3.1 + t * 0.42 + sin(rayX * 1.7 - t * 0.27));
  float w2 = sin(rayX * 5.7 - t * 0.31 + z * 0.8);
  float shaft = pow(clamp(0.5 + 0.32 * w1 + 0.18 * w2, 0.0, 1.0), 3.2);
  return shaft * depthFade;
}

void main() {
  // タイル内 UV → 論理スクリーン座標 → ワールド座標 (wx, wy, uGroupZ)
  vec2 screenPos = vec2(vUv.x * uViewSize.x, (1.0 - vUv.y) * uViewSize.y);
  float p = uCameraDist / max(0.28, uCameraDist + uGroupZ * uParallaxStrength);
  float inv = 1.0 / (p * max(0.25, uCamZoom));
  vec2 wpos = (screenPos - uViewSize * 0.5) * inv + uCamPos;

  // Tier 4: バイオーム環境光（深度と明るさを直結させず、境界で滑らかに補間された水色・環境光を使う）
  float yFactor = clamp((wpos.y + 520.0) / 1450.0, 0.0, 1.0);
  vec3 amb = mix(uShallowAmb, uDeepAmb, yFactor) * uAmbientBoost;
  // 遠景ほど水柱の微細な散乱環境光を乗せて空間の層を分離
  float farGlow = clamp(uGroupZ / 9.0, 0.0, 1.0);
  amb += uScatterTint * 0.28 * farGlow * uAmbientBoost;

  // コースティクス光柱（上部から差し込む静謐な光の筋）
  float caust = deepCaustics(wpos, uGroupZ, uTime) * uCausticsStrength;
  amb += vec3(0.11, 0.28, 0.34) * caust * 0.48;

  vec3 totalLight = amb;
  float scatter = caust * 0.18;

  // Tier 1: 高品質動的光源
  for (int i = 0; i < 6; i++) {
    if (i >= uHighLightCount) break;
    vec3 lPos = uHighPosZ[i].xyz;
    float radius = max(1.0, uHighPosZ[i].w);
    vec3 lCol = uHighColorI[i].rgb;
    float intensity = uHighColorI[i].w;
    if (intensity <= 0.001) continue;

    vec2 dxy = wpos - lPos.xy;
    float distXY = length(dxy);
    float dz = abs(uGroupZ - lPos.z);
    float zRange = max(0.35, uHighScreen[i].w);

    // Z 距離と XY 距離の3次元減衰
    float zAtten = exp(-pow(dz / zRange, 1.35) * (0.72 + uTurbidity * 0.45));
    float rNorm = distXY / radius;
    if (rNorm >= 1.35 || zAtten < 0.01) continue;

    float xyAtten = pow(clamp(1.0 - rNorm / 1.35, 0.0, 1.0), 1.75);
    xyAtten = xyAtten / (1.0 + rNorm * rNorm * 1.25);

    // スポットコーン判定
    float cone = 1.0;
    float cosHalf = uHighDirCone[i].z;
    if (cosHalf > -1.2) {
      vec2 dir = normalize(dxy + vec2(1e-4, 0.0));
      float align = dot(dir, uHighDirCone[i].xy);
      // 船首近傍の柔らかい回り込み光（白飛びさせない控えめなハロー）
      float nearHalo = exp(-rNorm * 6.5) * 0.26;
      float spot = smoothstep(cosHalf - uHighDirCone[i].w, cosHalf + 0.08, align);
      cone = max(spot, nearHalo);
    }

    float contrib = intensity * xyAtten * zAtten * cone;
    if (contrib < 0.002) continue;

    float shadow = computeShadow(vUv, uHighScreen[i].xy, uHighScreen[i].z, uGroupDepthNorm);
    // 巨大生物の影がドラマチックに落ちるよう影の深さを確保
    float litShadow = mix(0.08, 1.0, shadow);

    vec3 waterColorShift = mix(vec3(1.0), vec3(0.62, 0.92, 1.08), clamp(dz / (zRange * 1.25), 0.0, 1.0));
    totalLight += lCol * waterColorShift * contrib * litShadow;
    scatter += contrib * shadow * (0.28 + 0.42 * uTurbidity) * uScatterStrength;
  }

  // Tier 2: 簡易光源（遠方灯・サンゴ・熱水）
  for (int i = 0; i < 16; i++) {
    if (i >= uSimpleLightCount) break;
    vec3 lPos = uSimplePosZ[i].xyz;
    float radius = max(1.0, uSimplePosZ[i].w);
    vec3 lCol = uSimpleColorI[i].rgb;
    float intensity = uSimpleColorI[i].w;
    if (intensity <= 0.001) continue;

    float distXY = length(wpos - lPos.xy);
    float dz = abs(uGroupZ - lPos.z);
    float rNorm = distXY / radius;
    if (rNorm >= 1.2) continue;
    float atten = pow(clamp(1.0 - rNorm / 1.2, 0.0, 1.0), 2.1) * exp(-dz * 0.62);
    totalLight += lCol * intensity * atten;
    scatter += intensity * atten * 0.12 * uScatterStrength;
  }

  fragColor = vec4(totalLight, clamp(scatter, 0.0, 2.5));
}
`;

/**
 * Pass 3: 多層2D本体シェーダー
 * - 隣接2ライティンググループを滑らかに補間サンプリング（境界の分断ゼロ）
 * - 高品質光源に対する法線マップ立体照光（岩肌・遺跡彫刻・潜水艇リベットが動的に浮かび上がる）
 * - 水中屈折・疑似被写界深度ボケ・Beer-Lambert濁り＋散乱霧・発光マップ
 */
export const LAYER_SPRITE_FS = `#version 300 es
precision highp float;

uniform sampler2D uColorTex;
uniform sampler2D uNormalTex;
uniform sampler2D uEmissiveTex;
uniform sampler2D uLightAtlas;
uniform sampler2D uOccluderTex;

uniform int   uHasNormal;
uniform int   uHasEmissive;
uniform int   uEnableNormal;
uniform int   uEnableLighting;
uniform int   uEnableFog;
uniform int   uEnableRefraction;
uniform int   uEnableBlur;
uniform int   uEnableShadows;

uniform vec2  uViewSize;
uniform vec2  uCamPos;
uniform float uCamZoom;
uniform float uCameraDist;
uniform float uParallaxStrength;
uniform float uTime;

// レイヤー・オブジェクト属性 (要件 3.2)
uniform float uLayerZ;
uniform float uLayerDepthNorm;
uniform float uOpacity;
uniform float uBrightness;
uniform float uSaturation;
uniform vec3  uTint;
uniform float uTurbidity;       // レイヤー固有 × グローバル濁り
uniform float uBlur;            // レイヤーぼかし強度
uniform float uEmissiveBoost;
uniform float uLightInfluence;
uniform float uNormalStrength;
uniform float uRefractionAmp;
uniform float uShadowStrength;
uniform vec3  uFogColor;
uniform vec3  uScatterTint;

// 隣接2ライティンググループの補間情報 (5グループを 3x2 アトラスに格納)
uniform int   uGroup0;
uniform int   uGroup1;
uniform float uGroupBlend;

// Tier 1 高品質光源（法線マップ指向性照光用）
uniform int   uHighLightCount;
uniform vec4  uHighPosZ[6];
uniform vec4  uHighColorI[6];
uniform vec4  uHighDirCone[6];
uniform vec4  uHighScreen[6];

in vec2 vUv;
in vec2 vLocalUv;
in vec2 vScreenUv;

out vec4 fragColor;

vec4 sampleLightGroup(int groupIdx, vec2 screenUv) {
  // 5グループは 3列×2行 のアトラス配置
  float col = float(groupIdx % 3);
  float row = float(groupIdx / 3);
  // タイル境界のにじみを防ぐハーフピクセル相当クランプ
  vec2 clamped = clamp(screenUv, vec2(0.002), vec2(0.998));
  vec2 atlasUv = (vec2(col, row) + clamped) / vec2(3.0, 2.0);
  return texture(uLightAtlas, atlasUv);
}

vec3 adjustSaturation(vec3 c, float sat) {
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(luma), c, sat);
}

void main() {
  vec2 uv = vUv;

  // 水中屈折（奥行きと水流に応じた微細で上品な歪み）
  if (uEnableRefraction == 1 && uRefractionAmp > 0.0001) {
    float waveX = sin(vScreenUv.y * 19.0 + uTime * 1.45 + uLayerZ * 1.7);
    float waveY = cos(vScreenUv.x * 14.0 - uTime * 1.12 + uLayerZ * 2.1);
    uv += vec2(waveX, waveY) * uRefractionAmp;
  }

  // カラーサンプリング（最遠景・最前景など uBlur > 0 のみ軽量5タップ疑似ボケ）
  vec4 texCol = texture(uColorTex, uv);
  if (uEnableBlur == 1 && uBlur > 0.04) {
    vec2 texel = (vec2(1.0) / vec2(textureSize(uColorTex, 0))) * (uBlur * 5.2);
    vec4 acc = texCol * 0.36;
    acc += texture(uColorTex, uv + vec2( texel.x,  texel.y * 0.5)) * 0.16;
    acc += texture(uColorTex, uv + vec2(-texel.x, -texel.y * 0.5)) * 0.16;
    acc += texture(uColorTex, uv + vec2(-texel.x * 0.5,  texel.y)) * 0.16;
    acc += texture(uColorTex, uv + vec2( texel.x * 0.5, -texel.y)) * 0.16;
    texCol = acc;
  }

  float alpha = texCol.a * uOpacity;
  if (alpha < 0.01) discard;

  vec3 baseCol = texCol.rgb * uTint * uBrightness;
  baseCol = adjustSaturation(baseCol, uSaturation);

  // 発光マップ
  vec3 emissive = vec3(0.0);
  if (uHasEmissive == 1) {
    emissive = texture(uEmissiveTex, uv).rgb * uEmissiveBoost;
  }

  // 法線マップ（無い場合は正面法線）
  vec3 N = vec3(0.0, 0.0, 1.0);
  if (uHasNormal == 1 && uEnableNormal == 1) {
    vec3 rawN = texture(uNormalTex, uv).xyz * 2.0 - 1.0;
    N = normalize(vec3(rawN.xy * uNormalStrength, max(0.15, rawN.z)));
  }

  vec3 litColor = baseCol;
  float scatterAdd = 0.0;

  if (uEnableLighting == 1) {
    // 1) 隣接2ライティンググループの連続補間（境界段差ゼロ）
    vec4 l0 = sampleLightGroup(uGroup0, vScreenUv);
    vec4 l1 = sampleLightGroup(uGroup1, vScreenUv);
    vec4 gLight = mix(l0, l1, uGroupBlend);
    scatterAdd = gLight.a;

    // 2) 高品質光源に対する法線マップ立体照光（原画の陰影と調和）
    vec3 normalDirect = vec3(0.0);
    if (uHasNormal == 1 && uEnableNormal == 1 && uLightInfluence > 0.05) {
      vec2 screenPos = vec2(vScreenUv.x * uViewSize.x, (1.0 - vScreenUv.y) * uViewSize.y);
      float p = uCameraDist / max(0.28, uCameraDist + uLayerZ * uParallaxStrength);
      float inv = 1.0 / (p * max(0.25, uCamZoom));
      vec2 wpos = (screenPos - uViewSize * 0.5) * inv + uCamPos;

      for (int i = 0; i < 6; i++) {
        if (i >= uHighLightCount) break;
        vec3 lPos = uHighPosZ[i].xyz;
        float radius = max(1.0, uHighPosZ[i].w);
        float intensity = uHighColorI[i].w;
        if (intensity <= 0.001) continue;

        vec2 toL = lPos.xy - wpos;
        float distXY = length(toL);
        float rNorm = distXY / radius;
        if (rNorm >= 1.35) continue;

        float dz = abs(uLayerZ - lPos.z);
        float zRange = max(0.35, uHighScreen[i].w);
        float zAtten = exp(-pow(dz / zRange, 1.45) * (0.85 + uTurbidity * 0.55));
        float xyAtten = pow(clamp(1.0 - rNorm / 1.35, 0.0, 1.0), 1.85) / (1.0 + rNorm * rNorm * 1.4);

        float cone = 1.0;
        float cosHalf = uHighDirCone[i].z;
        if (cosHalf > -1.2) {
          vec2 fromL = normalize(-toL + vec2(1e-4, 0.0));
          float align = dot(fromL, uHighDirCone[i].xy);
          float nearHalo = exp(-rNorm * 6.5) * 0.24;
          cone = max(smoothstep(cosHalf - uHighDirCone[i].w, cosHalf + 0.08, align), nearHalo);
        }

        // 3D光線方向（Zをワールド単位スケールに揃える）
        vec3 L = normalize(vec3(toL.x, -toL.y, (lPos.z - uLayerZ) * 260.0 + 165.0));
        float ndl = max(0.0, dot(N, L));
        // 濡れた岩・金属の繊細なスペキュラ（原画の立体ディテールを際立たせる）
        vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
        float spec = pow(max(0.0, dot(N, H)), 18.0) * 0.28;

        // 簡易遮蔽（巨大生物の裏側に入ったときの法線ハイライト抑制）
        float occMul = 1.0;
        if (uEnableShadows == 1 && uShadowStrength > 0.01) {
          vec2 midUv = mix(vScreenUv, uHighScreen[i].xy, 0.45);
          vec4 occ = texture(uOccluderTex, clamp(midUv, vec2(0.0), vec2(1.0)));
          if (occ.r > 0.1 && occ.g < uLayerDepthNorm - 0.02 && occ.g > uHighScreen[i].z - 0.04) {
            occMul = 1.0 - occ.r * uShadowStrength * 0.78;
          }
        }

        normalDirect += uHighColorI[i].rgb * (ndl * 0.95 + spec) * intensity * xyAtten * zAtten * cone * occMul;
      }
    }

    // 暗闇の深みを確保しつつ、空間ライトグループと法線照光を自然に融合（原画の陰影と明暗差を両立）
    vec3 preserved = vec3(0.085, 0.135, 0.165);
    vec3 effectiveLight = mix(vec3(1.0), preserved + gLight.rgb * 1.12 + normalDirect * 0.92, clamp(uLightInfluence, 0.0, 1.35));
    // 白飛びを防ぎながら高輝度域を柔らかくロールオフ
    effectiveLight = effectiveLight / (1.0 + effectiveLight * 0.22);
    litColor = baseCol * effectiveLight;
  }

  // 深海の濁り＆水中インスキャタリング（バイオーム水色・散乱色に応じた空気遠近法＋光に照らされる霧）
  if (uEnableFog == 1 && uTurbidity > 0.001) {
    float fogAmt = clamp(uTurbidity, 0.0, 0.88);
    vec3 litFog = uFogColor + uScatterTint * scatterAdd * (0.40 + 0.60 * fogAmt);
    litColor = mix(litColor, litFog, fogAmt);
  }

  // 発光マップは濁りを越えて神秘的に浮かび上がる（遠景ほどわずかに水中減衰）
  float emissiveFogFade = 1.0 - clamp(uTurbidity * 0.48, 0.0, 0.52);
  litColor += emissive * emissiveFogFade;

  fragColor = vec4(litColor, alpha);
}
`;

/**
 * ボリュメトリック光条（潜水艇ツインヘッドライトの光円錐＋遮蔽シャドウ筋）
 */
export const BEAM_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPos; // x: 0..1 (根元..先端), y: -0.5..0.5
layout(location = 1) in vec2 aUv;

uniform vec2  uViewSize;
uniform vec2  uOriginScreen;
uniform float uLengthScreen;
uniform float uHalfWidthStart;
uniform float uHalfWidthEnd;
uniform float uAngle;

out vec2 vUv;
out vec2 vScreenUv;

void main() {
  float t = aPos.x + 0.5; // 0..1
  float hw = mix(uHalfWidthStart, uHalfWidthEnd, t);
  vec2 local = vec2(t * uLengthScreen, aPos.y * 2.0 * hw);
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 scr = uOriginScreen + vec2(local.x * c - local.y * s, local.x * s + local.y * c);
  vec2 ndc = vec2(
    (scr.x / uViewSize.x) * 2.0 - 1.0,
    1.0 - (scr.y / uViewSize.y) * 2.0
  );
  gl_Position = vec4(ndc, 0.0, 1.0);
  vUv = vec2(t, aPos.y + 0.5);
  vScreenUv = vec2(scr.x / uViewSize.x, 1.0 - scr.y / uViewSize.y);
}
`;

export const BEAM_FS = `#version 300 es
precision highp float;

uniform sampler2D uOccluderTex;
uniform vec2  uOriginUv;
uniform vec3  uColor;
uniform float uIntensity;
uniform float uTime;
uniform float uBeamDepthNorm;
uniform float uShadowStrength;
uniform int   uEnableShadows;

in vec2 vUv;
in vec2 vScreenUv;
out vec4 fragColor;

void main() {
  float along = vUv.x; // 0..1
  float across = abs(vUv.y - 0.5) * 2.0; // 0(中心)..1(縁)

  float radial = pow(clamp(1.0 - across, 0.0, 1.0), 1.85);
  float distFade = pow(clamp(1.0 - along, 0.0, 1.0), 1.45) * smoothstep(0.0, 0.04, along);

  // 水中の微細なゆらぎ（光条の中の塵と水流）
  float shimmer = 0.88 + 0.12 * sin(along * 18.0 - uTime * 2.4 + across * 5.0)
                * cos(along * 9.0 + uTime * 1.3);

  // 遮蔽体による光条シャドウ（巨大生物や岩がライトを横切ると光条が切れる）
  float shadow = 1.0;
  if (uEnableShadows == 1 && uShadowStrength > 0.01) {
    float blocked = 0.0;
    for (int i = 1; i <= 8; i++) {
      float st = float(i) / 9.0;
      vec2 suv = mix(uOriginUv, vScreenUv, st);
      vec4 occ = texture(uOccluderTex, clamp(suv, vec2(0.0), vec2(1.0)));
      if (occ.r > 0.12 && abs(occ.g - uBeamDepthNorm) < 0.22) {
        blocked = max(blocked, occ.r);
      }
    }
    shadow = 1.0 - blocked * uShadowStrength * 0.85;
  }

  float energy = radial * distFade * shimmer * uIntensity * shadow;
  fragColor = vec4(uColor * energy, energy);
}
`;

/**
 * Pass 3b: 多層浮遊粒子（マリンスノー・発光プランクトン・気泡）
 * 5ライティンググループから直接照光され、光条の中だけキラリと輝く！
 */
export const PARTICLE_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec4 aSeedPos;  // xy = baseWorldPos, z = wz, w = size
layout(location = 1) in vec4 aKindPhase; // x = kind(0:snow,1:bio,2:bubble), y = phase, z = speed, w = tint

uniform vec2  uViewSize;
uniform vec2  uCamPos;
uniform float uCamZoom;
uniform float uCameraDist;
uniform float uParallaxStrength;
uniform float uTime;
uniform float uCurrentStrength;
uniform float uZMin;
uniform float uZMax;
uniform float uPixelRatio;

out vec2  vScreenUv;
out float vKind;
out float vZ;
out float vTwinkle;
out float vTint;
out float vAlpha;

void main() {
  float wz = aSeedPos.z;
  if (wz < uZMin || wz >= uZMax) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  float kind = aKindPhase.x;
  float phase = aKindPhase.y;
  float spd = aKindPhase.z;

  // カメラ非依存の連続運動（ワールド周期空間でシームレス循環）
  float spanX = 3600.0;
  float spanY = 1850.0;
  float driftX = uTime * (12.0 * spd * uCurrentStrength + (kind > 1.5 ? 4.0 : 0.0))
               + sin(uTime * (0.45 + spd * 0.3) + phase) * 28.0;
  float driftY = (kind > 1.5 ? -uTime * 32.0 * spd : uTime * (6.0 * spd))
               + cos(uTime * (0.38 + spd * 0.25) + phase * 1.3) * 18.0;

  float p = uCameraDist / max(0.28, uCameraDist + wz * uParallaxStrength);
  float zoom = max(0.25, uCamZoom);

  // カメラ中心を基準にワールド座標をラップ（移動してもリセットされず自然に出入り）
  float relX = mod(aSeedPos.x + driftX - uCamPos.x + spanX * 0.5, spanX) - spanX * 0.5;
  float relY = mod(aSeedPos.y + driftY - uCamPos.y + spanY * 0.5, spanY) - spanY * 0.5;

  vec2 scr = vec2(relX, relY) * p * zoom + uViewSize * 0.5;
  vec2 ndc = vec2(
    (scr.x / uViewSize.x) * 2.0 - 1.0,
    1.0 - (scr.y / uViewSize.y) * 2.0
  );

  // 端での急激な発生・消失を防ぐフェード
  float edgeFadeX = 1.0 - smoothstep(spanX * 0.42, spanX * 0.50, abs(relX));
  float edgeFadeY = 1.0 - smoothstep(spanY * 0.42, spanY * 0.50, abs(relY));

  gl_Position = vec4(ndc, 0.0, 1.0);
  // 最前景はボケて大きく、遠景は繊細に小さく
  float bokehBoost = wz < -0.15 ? mix(1.0, 2.8, clamp((-wz - 0.15) / 0.4, 0.0, 1.0)) : 1.0;
  gl_PointSize = clamp(aSeedPos.w * p * zoom * bokehBoost * uPixelRatio, 1.5, 42.0);

  vScreenUv = vec2(scr.x / uViewSize.x, 1.0 - scr.y / uViewSize.y);
  vKind = kind;
  vZ = wz;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.1 + spd * 1.7) + phase * 3.1);
  vTint = aKindPhase.w;
  vAlpha = edgeFadeX * edgeFadeY;
}
`;

export const PARTICLE_FS = `#version 300 es
precision highp float;

uniform sampler2D uLightAtlas;
uniform int   uGroup0;
uniform int   uGroup1;
uniform float uGroupBlend;
uniform float uEmissiveBoost;
uniform int   uEnableLighting;

in vec2  vScreenUv;
in float vKind;
in float vZ;
in float vTwinkle;
in float vTint;
in float vAlpha;

out vec4 fragColor;

vec4 sampleLightGroup(int groupIdx, vec2 screenUv) {
  float col = float(groupIdx % 3);
  float row = float(groupIdx / 3);
  vec2 atlasUv = (vec2(col, row) + clamp(screenUv, vec2(0.002), vec2(0.998))) / vec2(3.0, 2.0);
  return texture(uLightAtlas, atlasUv);
}

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  if (r > 1.0) discard;

  // 最前景ボケ粒子は柔らかい円形ボケ
  float softness = vZ < -0.15 ? 1.35 : 2.1;
  float shape = pow(clamp(1.0 - r, 0.0, 1.0), softness);

  vec3 lightCol = vec3(0.45, 0.65, 0.78);
  if (uEnableLighting == 1) {
    vec4 l0 = sampleLightGroup(uGroup0, vScreenUv);
    vec4 l1 = sampleLightGroup(uGroup1, vScreenUv);
    vec4 gl = mix(l0, l1, uGroupBlend);
    lightCol = gl.rgb;
  }

  vec3 col;
  float a;
  if (vKind < 0.5) {
    // マリンスノー：ライトに照らされたところだけ繊細に浮かび上がる！
    float litEnergy = dot(lightCol, vec3(0.3, 0.5, 0.2));
    col = mix(vec3(0.38, 0.62, 0.72), vec3(0.95, 0.98, 1.0), clamp(litEnergy, 0.0, 1.0)) * (0.28 + lightCol * 1.45);
    a = shape * (0.14 + clamp(litEnergy * 0.55, 0.0, 0.68)) * vAlpha;
  } else if (vKind < 1.5) {
    // 発光プランクトン（Tier 3 発光オブジェクト）
    vec3 bioCol = mix(vec3(0.24, 0.92, 0.96), vec3(1.0, 0.76, 0.34), vTint);
    col = bioCol * (0.8 + 0.85 * vTwinkle) * uEmissiveBoost;
    a = shape * (0.45 + 0.45 * vTwinkle) * vAlpha;
  } else {
    // 気泡（リングハイライト）
    float ring = smoothstep(0.45, 0.82, r) * (1.0 - smoothstep(0.82, 1.0, r));
    col = (vec3(0.55, 0.88, 0.98) + lightCol * 0.9) * (0.45 + ring * 1.4);
    a = (shape * 0.22 + ring * 0.55) * vAlpha;
  }

  // 前景ボケは控えめな透明度で世界を邪魔しない
  if (vZ < -0.2) a *= 0.55;
  fragColor = vec4(col * a, a);
}
`;

/**
 * Pass 4: 発光抽出 + セパラブルガウスブラー
 */
export const BLOOM_EXTRACT_FS = `#version 300 es
precision highp float;
uniform sampler2D uSceneTex;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 c = texture(uSceneTex, vUv).rgb;
  float luma = max(c.r, max(c.g, c.b));
  float soft = smoothstep(uThreshold, uThreshold + 0.45, luma);
  fragColor = vec4(c * soft, 1.0);
}
`;

export const BLUR_FS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir; // (1/w, 0) or (0, 1/h)
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec3 sum = texture(uTex, vUv).rgb * 0.227027;
  sum += texture(uTex, vUv + uDir * 1.384615).rgb * 0.316216;
  sum += texture(uTex, vUv - uDir * 1.384615).rgb * 0.316216;
  sum += texture(uTex, vUv + uDir * 3.230769).rgb * 0.070270;
  sum += texture(uTex, vUv - uDir * 3.230769).rgb * 0.070270;
  fragColor = vec4(sum, 1.0);
}
`;

/**
 * Pass 5: 最終合成（シーン + ブルーム + ACES近似トーンマップ + 深海ヴィネット）
 * デバッグモードでライトバッファ単体表示・遮蔽マスク表示も切替可能！
 */
export const COMPOSITE_FS = `#version 300 es
precision highp float;

uniform sampler2D uSceneTex;
uniform sampler2D uBloomTex;
uniform sampler2D uLightAtlas;
uniform sampler2D uOccluderTex;
uniform float uBloomStrength;
uniform int   uDebugView; // 0:Final, 1:LightAtlas(5 groups), 2:OccluderMask, 3:BloomOnly

in vec2 vUv;
out vec4 fragColor;

vec3 acesToneMap(vec3 x) {
  const float a = 2.51;
  const float b = 0.03;
  const float c = 2.43;
  const float d = 0.59;
  const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  if (uDebugView == 1) {
    vec4 l = texture(uLightAtlas, vUv);
    fragColor = vec4(acesToneMap(l.rgb * 1.25), 1.0);
    return;
  }
  if (uDebugView == 2) {
    vec4 o = texture(uOccluderTex, vUv);
    fragColor = vec4(o.r, o.g * o.r, o.b * 0.35, 1.0);
    return;
  }
  if (uDebugView == 3) {
    vec3 b = texture(uBloomTex, vUv).rgb;
    fragColor = vec4(acesToneMap(b * 2.0), 1.0);
    return;
  }

  vec3 col = texture(uSceneTex, vUv).rgb;
  vec3 bloom = texture(uBloomTex, vUv).rgb;
  col += bloom * uBloomStrength;

  // ACES 近似トーンマッピングで発光が白飛びせず豊かに階調を保つ
  col = acesToneMap(col * 1.08);

  // 上品な深海ヴィネット
  vec2 centered = vUv - 0.5;
  float vig = 1.0 - dot(centered * vec2(1.12, 1.28), centered * vec2(1.12, 1.28)) * 0.72;
  col *= clamp(vig, 0.38, 1.0);

  fragColor = vec4(col, 1.0);
}
`;
