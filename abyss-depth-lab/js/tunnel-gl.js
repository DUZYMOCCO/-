/**
 * ABYSS DIVE — 本物の WebGL2 3D 空間レンダラー（海底大洞窟レイマーチング ＋ 重力レンズ・ブラックホール）
 *
 * Canvas2D の多角形擬似 3D を完全脱却し、フラグメントシェーダーでピクセル単位の連続 3D 空間を描画する:
 *   1) 海底大洞窟（canyon）:
 *      - tunnel-rules.js の samplePipeAt() と完全同一の蛇行・くびれ数式を 3D 距離関数（SDF）として実装。
 *      - ComfyUI 生成の玄武岩テクスチャ（tunnel_canyon_wall.webp）＋ Depth Anything V2 法線マップ（_n.webp）
 *        ＋発光マップ（_e.webp）を本物の 3D 円筒 UV マッピングで貼り、自艇ヘッドライトでリアルタイム 3D 照光。
 *      - 層・平面・縁取りが物理的に存在しない、無限解像度の連続 3D 洞窟空間。
 *   2) 3,960 マイル・ブラックホール突入（blackhole）:
 *      - 光線を重力場で実際に曲げるリアルタイム重力レンズ・レイトレーシング。
 *      - 事象の地平線、鋭い光子球リング、回転するプラズマ降着円盤（ドップラー増光）、歪む深宇宙の星空を描画。
 */

const VERT_SRC = `#version 300 es
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

/**
 * 1) 本物の 3D 海底大洞窟レイマーチング・シェーダー
 *    - 蛇行・くびれ関数 pipeAt(u) は tunnel-rules.js の samplePipeAt() と完全一致。
 */
const CANYON_FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;
uniform float uSpeed;
uniform float uBoost;
uniform float uCurveAmpX;
uniform float uCurveAmpY;
uniform float uDir;        // +1: 下降, -1: 上昇
uniform vec2  uPlayerPos;  // (st.px, st.py)
uniform vec2  uCamPos;     // (camX, camY)
uniform float uExitZ;      // この Z を超えたら洞窟終了（背景の宇宙・BH が透けて見える）
uniform float uHasTex;
uniform sampler2D uAlbedo;
uniform sampler2D uNormal;
uniform sampler2D uEmissive;

const float PI = 3.14159265359;
const float Z_SCALE = 36.0; // progress 0..1 を 3D ワールド Z=0..36 へ写像

// tunnel-rules.js の samplePipeAt() と完全同一の連続パイプ数式
vec3 pipeAt(float zWorld) {
  float u = clamp(zWorld / Z_SCALE, 0.0, 1.35);
  float env = sin(clamp(u, 0.0, 1.0) * PI);
  float w1 = u * PI * 5.0;
  float w2 = u * PI * 8.5 + 0.9;
  float cx = (sin(w1) * 0.68 + sin(w2) * 0.32) * uCurveAmpX * (0.35 + 0.65 * env);
  float cy = (cos(w1 * 0.72) * 0.65 + sin(w2 * 0.64) * 0.35) * uCurveAmpY * (0.35 + 0.65 * env);
  float squeeze = 0.5 + 0.5 * sin(u * PI * 10.0 - 1.2);
  float r = 0.90 - squeeze * 0.28 * env;
  return vec3(cx, cy, r);
}

// 3D 岩肌の自然な凹凸（連続関数なので継ぎ目・平面感が一切存在しない）
float rockDisp(vec3 p, float ang) {
  float d1 = sin(ang * 5.0 + p.z * 0.85) * cos(p.z * 0.52 - ang * 3.0) * 0.075;
  float d2 = sin(ang * 11.0 - p.z * 1.9) * 0.032;
  float d3 = cos(p.x * 4.5 + p.y * 4.2 + p.z * 1.3) * 0.025;
  return d1 + d2 + d3;
}

// 洞窟内部からの符号付き距離（内部で正、岩壁で 0）
float mapCanyon(vec3 p) {
  vec3 pipe = pipeAt(p.z);
  vec2 rel = p.xy - pipe.xy;
  float ang = atan(rel.y, rel.x);
  float rad = pipe.z + rockDisp(p, ang);
  return rad - length(rel);
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.012, 0.0);
  float d = mapCanyon(p);
  return normalize(vec3(
    mapCanyon(p + e.xyy) - d,
    mapCanyon(p + e.yxy) - d,
    mapCanyon(p + e.yyx) - d
  ));
}

// 進行度に応じた深海バイオームパレット（前半: 暗青玄武岩 → 中盤: 地熱赤橙 → 終盤: マントル楽園蒼金）
void sampleBiome(float prog, out vec3 fogCol, out vec3 veinCol, out vec3 exitCol) {
  if (uDir < 0.0) {
    fogCol  = mix(vec3(0.04, 0.16, 0.25), vec3(0.05, 0.24, 0.34), prog);
    veinCol = mix(vec3(1.00, 0.78, 0.38), vec3(0.45, 0.92, 1.00), prog);
    exitCol = vec3(0.58, 0.94, 1.00);
    return;
  }
  float mid = clamp((prog - 0.15) / 0.45, 0.0, 1.0);
  float end = clamp((prog - 0.55) / 0.45, 0.0, 1.0);
  vec3 fog0  = mix(vec3(0.02, 0.08, 0.14), vec3(0.11, 0.06, 0.07), mid);
  fogCol     = mix(fog0, vec3(0.05, 0.21, 0.32), end);
  vec3 vein0 = mix(vec3(0.22, 0.78, 0.96), vec3(1.00, 0.46, 0.18), mid);
  veinCol    = mix(vein0, vec3(0.45, 0.96, 1.00), end);
  exitCol    = mix(vec3(0.48, 0.88, 1.00), vec3(1.00, 0.88, 0.56), end * 0.7);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uRes.x / uRes.y;

  float zCam = uProgress * Z_SCALE;
  vec3 pipeNow   = pipeAt(zCam);
  vec3 pipeAhead = pipeAt(zCam + 3.6);

  // カメラは現在パイプ中心と自艇の間を滑らかに追従し、前方の曲がり角を見据える
  vec3 ro = vec3(uCamPos.x, -uCamPos.y, zCam - 0.85);
  vec3 target = vec3(
    mix(pipeAhead.x, uPlayerPos.x, 0.25),
    -mix(pipeAhead.y, uPlayerPos.y, 0.25),
    zCam + 3.6
  );

  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  // ブースト時は視野角を少し広げてスピード感を増幅
  float fov = mix(1.42, 1.24, uBoost);
  vec3 rd = normalize(fw * fov + rt * uv.x + up * uv.y);

  vec3 fogCol, veinCol, exitCol;
  sampleBiome(uProgress, fogCol, veinCol, exitCol);

  // 3D レイマーチング（最大 46 ステップ・早期終了でスマホ 60fps 確保）
  float t = 0.0;
  float maxT = 13.5;
  bool hit = false;
  bool escapedToSpace = false;
  for (int i = 0; i < 46; i++) {
    vec3 p = ro + rd * t;
    if (p.z > uExitZ) {
      escapedToSpace = true;
      break;
    }
    float d = mapCanyon(p);
    if (d < 0.008) {
      hit = true;
      break;
    }
    t += clamp(d * 0.82, 0.02, 0.85);
    if (t > maxT) break;
  }

  // 洞窟の出口を突き抜けたレイは透明にして、背後の宇宙＆リアルタイム重力レンズ BH をそのまま見せる！
  if (escapedToSpace && !hit) {
    fragColor = vec4(0.0, 0.0, 0.0, 0.0);
    return;
  }

  vec3 col = fogCol;

  if (hit) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    vec3 pipe = pipeAt(p.z);
    vec2 rel = p.xy - pipe.xy;
    float ang = atan(rel.y, rel.x);

    // 本物の 3D 円筒 UV マッピング（透視補正 100%・継ぎ目ゼロ！）
    vec2 texUv = vec2(ang / (2.0 * PI) * 2.0 + 0.5, p.z * 0.26);

    vec3 albedo = vec3(0.16, 0.24, 0.30);
    vec3 emissive = vec3(0.0);
    if (uHasTex > 0.5) {
      albedo = texture(uAlbedo, texUv).rgb;
      vec3 nMap = texture(uNormal, texUv).rgb * 2.0 - 1.0;
      // 円筒接空間で Depth Anything V2 法線マップを 3D 法線へ合成
      vec3 tang = normalize(vec3(-sin(ang), cos(ang), 0.0));
      vec3 bitang = normalize(cross(n, tang));
      n = normalize(n + (tang * nMap.x + bitang * nMap.y) * 0.65);
      emissive = texture(uEmissive, texUv).rgb;
    }

    // 自艇のツインヘッドライトによるリアルタイム 3D スポット照光！
    vec3 lightPos = vec3(uPlayerPos.x, -uPlayerPos.y, zCam + 0.15);
    vec3 toLight = lightPos - p;
    float lDist = length(toLight);
    vec3 lDir = toLight / max(lDist, 0.001);
    float diff = max(dot(n, lDir), 0.0);
    // 前方コーン減衰
    float cone = smoothstep(0.15, 0.82, dot(-lDir, fw));
    float atten = 1.0 / (1.0 + lDist * lDist * 0.12);
    float spec = pow(max(dot(reflect(-lDir, n), -rd), 0.0), 18.0) * 0.45;

    // 岩の凹凸エッジを拾う環境アンビエント＋上下の深海間接光
    float hemi = 0.5 + 0.5 * n.y;
    vec3 amb = mix(fogCol * 0.75, fogCol * 1.45 + vec3(0.03, 0.08, 0.12), hemi);

    // バイオ発光鉱脈（テクスチャ発光＋進行バイオーム色）
    float veinWave = smoothstep(0.62, 0.95, sin(ang * 4.0 + p.z * 1.2) * cos(p.z * 0.7 - ang * 2.0));
    vec3 glow = emissive * veinCol * 1.35 + veinCol * veinWave * 0.24;

    vec3 headLightCol = mix(vec3(0.96, 0.94, 0.82), vec3(0.70, 0.98, 1.00), uBoost);
    col = albedo * (amb + headLightCol * (diff * 2.15 + spec) * cone * atten) + glow;

    // 水中指数フォグ（奥へ行くほど自然に深海の霞へ溶け込む）
    float fogAmt = 1.0 - exp(-t * t * 0.022);
    col = mix(col, fogCol, clamp(fogAmt, 0.0, 0.98));
  }

  // 奥の出口から差し込む光（通常回廊のみ。BH モードでは背後の本物のブラックホール自体が光る）
  if (uExitZ > 500.0) {
    float centerAlign = max(dot(rd, fw), 0.0);
    float exitGlow = pow(centerAlign, 6.0) * (0.28 + 0.48 * uProgress) * (1.0 + uBoost * 0.35);
    col += exitCol * exitGlow * (hit ? smoothstep(2.5, 10.5, t) : 1.0);
  }

  // 軽いトーンマッピング＋ガンマ補正
  col = col / (1.0 + col * 0.45);
  col = pow(max(col, 0.0), vec3(0.92));

  fragColor = vec4(col, 1.0);
}
`;

/**
 * 2) 3,960 マイル・本物の重力レンズ屈折ブラックホール 3D シェーダー
 *    - 光線を重力場で曲げながら降着円盤・光子球・星空をリアルタイム積分。
 */
const BH_FRAG_SRC = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2  uRes;
uniform float uTime;
uniform float uProgress;
uniform float uBoost;
uniform vec2  uPlayerPos;

const float PI = 3.14159265359;

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

// 歪んだ先にある深宇宙の星空＆銀河帯
vec3 sampleStars(vec3 rd) {
  vec2 sph = vec2(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0)));
  vec3 col = vec3(0.008, 0.006, 0.022);
  // 淡い銀河帯
  float band = exp(-abs(sph.y + sin(sph.x * 2.0) * 0.25) * 4.5);
  float neb = fbm(sph * 4.5 + vec2(1.2, 0.4));
  col += vec3(0.06, 0.08, 0.18) * band * neb;

  // 2 層の星々
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

  // ブラックホールへ向かって接近する 3D カメラ（進行度 0→1 で圧倒的に迫る！）
  float distCam = mix(10.5, 3.6, pow(uProgress, 0.85));
  vec3 ro = vec3(uPlayerPos.x * 1.35, -uPlayerPos.y * 0.95 + 0.65, -distCam);
  vec3 target = vec3(0.0, 0.0, 0.0);

  vec3 fw = normalize(target - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
  vec3 up = cross(fw, rt);
  float fov = mix(1.55, 1.30, uBoost);
  vec3 rd = normalize(fw * fov + rt * uv.x + up * uv.y);

  // 降着円盤を少し傾けて美しく見せる回転行列
  float tilt = 0.22;
  float ct = cos(tilt), st = sin(tilt);
  mat2 rotTilt = mat2(ct, -st, st, ct);

  vec3 pos = ro;
  vec3 vel = rd;
  vec3 accum = vec3(0.0);
  float rs = 1.0; // 事象の地平線半径
  bool captured = false;

  // 重力レンズ光線積分（56 ステップ）
  for (int i = 0; i < 56; i++) {
    float r = length(pos);
    if (r < rs * 1.02) {
      captured = true;
      break;
    }
    if (r > 24.0) break;

    // ステップ幅：ブラックホール近傍ほど細かく、遠方ほど大きく
    float stepLen = clamp(r * 0.11, 0.05, 0.75);

    // 重力による光線の湾曲（一般相対論的光線曲げのリアルタイム近似）
    vec3 grav = -pos * (1.42 / (r * r * r + 0.001));
    vec3 prevPos = pos;
    vel = normalize(vel + grav * stepLen);
    pos += vel * stepLen;

    // 傾いた赤道面での降着円盤交差チェック
    vec3 pPrevT = prevPos; pPrevT.xy = rotTilt * pPrevT.xy;
    vec3 pCurrT = pos;     pCurrT.xy = rotTilt * pCurrT.xy;

    if (pPrevT.y * pCurrT.y <= 0.0) {
      float f = abs(pPrevT.y) / max(abs(pPrevT.y - pCurrT.y), 0.0001);
      vec3 hitP = mix(pPrevT, pCurrT, f);
      float rad = length(hitP.xz);
      if (rad > rs * 1.32 && rad < rs * 5.8) {
        float ang = atan(hitP.z, hitP.x);
        // 差動回転（内側ほど高速回転）
        float spin = ang + uTime * (1.8 / pow(rad, 0.65)) - rad * 1.65;
        float bands = fbm(vec2(rad * 2.6, spin * 1.8));
        float streak = 0.55 + 0.45 * sin(rad * 10.0 - uTime * 2.5 + bands * 4.0);
        float radialFade = smoothstep(rs * 1.32, rs * 1.85, rad) * smoothstep(rs * 5.8, rs * 2.4, rad);

        // ドップラー増光（手前へ回転してくる左側が白金〜黄金に眩しく、右側が蒼紫〜紅へシフト）
        float doppler = clamp(0.5 + 0.5 * (-hitP.x / max(rad, 0.01)), 0.0, 1.0);
        vec3 hotCol  = vec3(1.00, 0.94, 0.78);
        vec3 midCol  = vec3(1.00, 0.58, 0.22);
        vec3 coolCol = vec3(0.42, 0.52, 1.00);
        vec3 diskCol = mix(mix(coolCol, midCol, doppler), hotCol, pow(doppler, 2.2) * 0.78);

        float intensity = radialFade * (0.45 + 0.85 * bands * streak) * (0.65 + 1.15 * doppler);
        accum += diskCol * intensity * 0.62;
      }
    }

    // 光子球（フォトンリング）の繊細な輝き
    float photon = exp(-abs(r - rs * 1.48) * 10.0) * 0.038;
    accum += vec3(1.0, 0.88, 0.66) * photon;
  }

  vec3 bg = captured ? vec3(0.0) : sampleStars(vel);
  vec3 col = bg + accum;

  // ブースト時の青方偏移エネルギーグロー
  col += vec3(0.18, 0.42, 0.75) * uBoost * 0.10 * (1.0 - length(uv) * 0.35);

  // 映画的トーンマッピング
  col = col / (1.0 + col * 0.55);
  col = pow(max(col, 0.0), vec3(0.92));

  fragColor = vec4(col, 1.0);
}
`;

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('tunnel-gl shader compile failed: ' + log);
  }
  return sh;
}

function linkProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error('tunnel-gl link failed: ' + log);
  }
  return prog;
}

function createTextureFromUrl(gl, url, fallbackRgba, onLoaded) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(fallbackRgba));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (typeof Image !== 'undefined') {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        if (onLoaded) onLoaded();
      } catch (e) { /* ignore context loss */ }
    };
    img.src = url;
  }
  return tex;
}

/**
 * WebGL2 3D トンネル＆ブラックホールオフスクリーンレンダラーを生成する。
 * WebGL2 非対応環境（Node テスト等）では null を返し、Canvas2D フォールバックさせる。
 */
export function createTunnelGL(opts) {
  if (typeof document === 'undefined') return null;
  const w = (opts && opts.width) || 854;
  const h = (opts && opts.height) || 480;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  let progCanyon, progBH;
  try {
    progCanyon = linkProgram(gl, VERT_SRC, CANYON_FRAG_SRC);
    progBH = linkProgram(gl, VERT_SRC, BH_FRAG_SRC);
  } catch (e) {
    console.warn('[tunnel-gl] init failed, falling back to 2D:', e);
    return null;
  }

  const vao = gl.createVertexArray();
  let texReadyCount = 0;
  const onTexReady = () => { texReadyCount++; };
  const texAlbedo = createTextureFromUrl(gl, new URL('../assets/tunnel_canyon_wall.webp', import.meta.url).href, [36, 56, 72, 255], onTexReady);
  const texNormal = createTextureFromUrl(gl, new URL('../assets/tunnel_canyon_wall_n.webp', import.meta.url).href, [128, 128, 255, 255], onTexReady);
  const texEmissive = createTextureFromUrl(gl, new URL('../assets/tunnel_canyon_wall_e.webp', import.meta.url).href, [0, 0, 0, 255], onTexReady);

  const uC = {
    res: gl.getUniformLocation(progCanyon, 'uRes'),
    time: gl.getUniformLocation(progCanyon, 'uTime'),
    progress: gl.getUniformLocation(progCanyon, 'uProgress'),
    speed: gl.getUniformLocation(progCanyon, 'uSpeed'),
    boost: gl.getUniformLocation(progCanyon, 'uBoost'),
    curveAmpX: gl.getUniformLocation(progCanyon, 'uCurveAmpX'),
    curveAmpY: gl.getUniformLocation(progCanyon, 'uCurveAmpY'),
    dir: gl.getUniformLocation(progCanyon, 'uDir'),
    playerPos: gl.getUniformLocation(progCanyon, 'uPlayerPos'),
    camPos: gl.getUniformLocation(progCanyon, 'uCamPos'),
    exitZ: gl.getUniformLocation(progCanyon, 'uExitZ'),
    hasTex: gl.getUniformLocation(progCanyon, 'uHasTex'),
    albedo: gl.getUniformLocation(progCanyon, 'uAlbedo'),
    normal: gl.getUniformLocation(progCanyon, 'uNormal'),
    emissive: gl.getUniformLocation(progCanyon, 'uEmissive'),
  };

  const uB = {
    res: gl.getUniformLocation(progBH, 'uRes'),
    time: gl.getUniformLocation(progBH, 'uTime'),
    progress: gl.getUniformLocation(progBH, 'uProgress'),
    boost: gl.getUniformLocation(progBH, 'uBoost'),
    playerPos: gl.getUniformLocation(progBH, 'uPlayerPos'),
  };

  function drawCanyonPass(st, camX, camY, boostAmt, exitZ) {
    gl.useProgram(progCanyon);
    gl.uniform2f(uC.res, canvas.width, canvas.height);
    gl.uniform1f(uC.time, st.time);
    gl.uniform1f(uC.progress, st.progress);
    gl.uniform1f(uC.speed, st.speed);
    gl.uniform1f(uC.boost, boostAmt);
    gl.uniform1f(uC.curveAmpX, st.theme.curveAmpX);
    gl.uniform1f(uC.curveAmpY, st.theme.curveAmpY);
    gl.uniform1f(uC.dir, st.theme.dir);
    gl.uniform2f(uC.playerPos, st.px, st.py);
    gl.uniform2f(uC.camPos, camX, camY);
    gl.uniform1f(uC.exitZ, exitZ);
    gl.uniform1f(uC.hasTex, texReadyCount > 0 ? 1.0 : 0.0);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texAlbedo);   gl.uniform1i(uC.albedo, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texNormal);   gl.uniform1i(uC.normal, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texEmissive); gl.uniform1i(uC.emissive, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function renderFrame(st, camX, camY) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindVertexArray(vao);

    const boostAmt = Math.min(1, st.boostT / 0.8);

    if (st.theme.id === 'blackhole') {
      // 1) まず背景にリアルタイム重力レンズ・ブラックホール＆深宇宙を描画
      gl.disable(gl.BLEND);
      gl.useProgram(progBH);
      gl.uniform2f(uB.res, canvas.width, canvas.height);
      gl.uniform1f(uB.time, st.time);
      // 前半の洞窟内でも奥のブラックホールが少しずつ大きくなり、洞窟を抜けた後半(0.48→1.0)で一気に迫る
      const bhProg = Math.min(1, st.progress * 0.35 + Math.max(0, (st.progress - 0.45) / 0.55) * 0.65);
      gl.uniform1f(uB.progress, bhProg);
      gl.uniform1f(uB.boost, boostAmt);
      gl.uniform2f(uB.playerPos, st.px, st.py);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2) 前半 (progress < 0.52) は海溝・マントル洞窟を上に重ね、出口の穴の奥からブラックホールが覗き見える！
      //    出口 (0.48 * 36.0) を突破した瞬間、周囲の岩壁が後ろへ消えて宇宙空間へ一気に飛び出す！
      if (st.progress < 0.52) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        drawCanyonPass(st, camX, camY, boostAmt, 0.48 * 36.0);
        gl.disable(gl.BLEND);
      }
    } else {
      gl.disable(gl.BLEND);
      drawCanyonPass(st, camX, camY, boostAmt, 999.0);
    }

    return canvas;
  }

  return { canvas, renderFrame };
}
