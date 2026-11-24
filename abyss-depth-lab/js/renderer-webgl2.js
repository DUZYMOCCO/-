/**
 * Depth Stacking — 独自軽量 WebGL2 レンダラ
 *
 * 特徴:
 * - ゼロ依存・GLSL ES 3.00
 * - 描画レイヤー (5〜30層) と 5ライティンググループ (3×2 アトラスFBO) の完全分離 + 隣接グループ連続補間
 * - 遮蔽マスク FBO (437×201) + ソフトシャドウ + ボリュメトリック光条
 * - 内部描画解像度 (874×402 / 1748×804 / 2622×1206) とライトバッファ解像度の動的切替
 * - 12×12 サブディビジョン共有メッシュによる滑らかな海藻揺れ＆巨大生物の遊泳波動
 * - フラスタムカリング・空レイヤースキップ・リアルタイム統計 (DrawCalls / Visible / Culled / Overdraw / VRAM)
 */
import {
  CAMERA_DIST,
  LIGHT_GROUPS,
  LOGICAL_W,
  LOGICAL_H,
  clamp,
  computeLightingGroupBlend,
  isRectVisible,
  projectWorldToView,
} from './depth-math.js';
import {
  FULLSCREEN_VS,
  SPRITE_VS,
  OCCLUDER_FS,
  LIGHT_GROUP_FS,
  LAYER_SPRITE_FS,
  BEAM_VS,
  BEAM_FS,
  PARTICLE_VS,
  PARTICLE_FS,
  BLOOM_EXTRACT_FS,
  BLUR_FS,
  COMPOSITE_FS,
} from './shaders.js';

function depthToNorm(z) {
  return clamp((z + 0.6) / 10.6, 0.0, 1.0);
}

export class DepthStackingRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      throw new Error('WebGL2 context could not be initialized.');
    }
    this.gl = gl;

    // ハーフ浮動小数点 FBO 対応チェック（対応時は HDR ライト＆シーンバッファを使用）
    this.extFloat = gl.getExtension('EXT_color_buffer_half_float') || gl.getExtension('EXT_color_buffer_float');
    this.useHalfFloat = Boolean(this.extFloat);

    this.sceneW = 1748;
    this.sceneH = 804;
    this.lightW = 874;
    this.lightH = 402;
    this.occluderW = 437;
    this.occluderH = 201;

    this.textures = new Map();
    this.textureVramBytes = 0;
    this.fboVramBytes = 0;

    this.stats = {
      drawCalls: 0,
      visibleSprites: 0,
      culledSprites: 0,
      activeLayers: 0,
      drawnLayers: 0,
      overdrawRatio: 0,
      vramMB: 0,
      particleCount: 0,
      highLightCount: 0,
      simpleLightCount: 0,
      cpuSubmitMs: 0,
      useHalfFloat: this.useHalfFloat,
      rendererInfo: '',
    };

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      this.stats.rendererInfo = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '';
    }

    this._initPrograms();
    this._initMeshes();
    this._initFallbackTextures();
    this._rebuildFBOs();
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile error:\n${log}`);
    }
    return sh;
  }

  _createProgram(vsSrc, fsSrc) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(prog);
      throw new Error(`Program link error:\n${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uniforms = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (!info) continue;
      const baseName = info.name.replace(/\[0\]$/, '');
      uniforms[baseName] = gl.getUniformLocation(prog, info.name);
      uniforms[info.name] = uniforms[baseName];
    }
    return { prog, u: uniforms };
  }

  _initPrograms() {
    this.progs = {
      occluder:     this._createProgram(SPRITE_VS, OCCLUDER_FS),
      lightGroup:   this._createProgram(FULLSCREEN_VS, LIGHT_GROUP_FS),
      sprite:       this._createProgram(SPRITE_VS, LAYER_SPRITE_FS),
      beam:         this._createProgram(BEAM_VS, BEAM_FS),
      particle:     this._createProgram(PARTICLE_VS, PARTICLE_FS),
      bloomExtract: this._createProgram(FULLSCREEN_VS, BLOOM_EXTRACT_FS),
      blur:         this._createProgram(FULLSCREEN_VS, BLUR_FS),
      composite:    this._createProgram(FULLSCREEN_VS, COMPOSITE_FS),
    };
  }

  _initMeshes() {
    const gl = this.gl;
    // 1) 12x12 サブディビジョン共有メッシュ（海藻の揺れ・巨大生物の波動が滑らかに変形）
    const nx = 12, ny = 12;
    const verts = [];
    const indices = [];
    for (let j = 0; j <= ny; j++) {
      const v = j / ny;
      for (let i = 0; i <= nx; i++) {
        const u = i / nx;
        verts.push(u - 0.5, v - 0.5, u, v);
      }
    }
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const c = a + (nx + 1);
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    this.gridIndexCount = indices.length;
    this.gridVao = gl.createVertexArray();
    gl.bindVertexArray(this.gridVao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    // 2) シンプル 2三角形クワッド（光条・フラット背景用）
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    const qvbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qvbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -0.5, -0.5, 0, 0,
       0.5, -0.5, 1, 0,
      -0.5,  0.5, 0, 1,
       0.5,  0.5, 1, 1,
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

    // 3) フルスクリーン三角形用空VAO
    this.emptyVao = gl.createVertexArray();

    // 4) 浮遊粒子 VAO（最大 1200 粒子を決定論的生成）
    this.maxParticles = 1200;
    this.particleVao = gl.createVertexArray();
    gl.bindVertexArray(this.particleVao);
    this.particleVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleVbo);
    const pData = this._buildParticleBuffer(this.maxParticles);
    gl.bufferData(gl.ARRAY_BUFFER, pData, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);

    gl.bindVertexArray(null);
  }

  _buildParticleBuffer(count) {
    // 決定論的PRNG（カメラ・再読込に依らず美しい多層粒子分布）
    let s = 20261125;
    const rnd = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const arr = new Float32Array(count * 8);
    for (let i = 0; i < count; i++) {
      const wx = (rnd() - 0.5) * 3600;
      const wy = (rnd() - 0.5) * 1850;
      // 深度分布：遠景〜中景〜操作層〜最前景へ連続配置
      const r = rnd();
      let wz;
      if (r < 0.24) wz = 2.6 + rnd() * 5.2;        // 遠景
      else if (r < 0.54) wz = 0.7 + rnd() * 1.9;   // 中景
      else if (r < 0.80) wz = -0.1 + rnd() * 0.8;  // 近景〜操作層
      else wz = -0.48 + rnd() * 0.36;              // 前景〜最前景ボケ

      const kr = rnd();
      const kind = kr < 0.72 ? 0.0 : (kr < 0.90 ? 1.0 : 2.0); // 72%マリンスノー, 18%発光プランクトン, 10%気泡
      const size = kind === 1.0 ? (3.2 + rnd() * 4.5) : (2.2 + rnd() * 4.2);
      const phase = rnd() * Math.PI * 2;
      const speed = 0.45 + rnd() * 1.1;
      const tint = rnd() < 0.72 ? 0.0 : 1.0; // シアン主体＋一部琥珀

      const o = i * 8;
      arr[o + 0] = wx;
      arr[o + 1] = wy;
      arr[o + 2] = wz;
      arr[o + 3] = size;
      arr[o + 4] = kind;
      arr[o + 5] = phase;
      arr[o + 6] = speed;
      arr[o + 7] = tint;
    }
    return arr;
  }

  _initFallbackTextures() {
    const gl = this.gl;
    const make1x1 = (rgba) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return tex;
    };
    this.texWhite = make1x1([255, 255, 255, 255]);
    this.texFlatNormal = make1x1([128, 128, 255, 255]);
    this.texBlack = make1x1([0, 0, 0, 255]);
  }

  _createFBO(w, h, { hdr = false, depth = false } = {}) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const internalFormat = (hdr && this.useHalfFloat) ? gl.RGBA16F : gl.RGBA8;
    const type = (hdr && this.useHalfFloat) ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, gl.RGBA, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    let rbo = null;
    if (depth) {
      rbo = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rbo);
    }

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      // RGBA16F が失敗した場合は安全に RGBA8 へフォールバック
      if (hdr && this.useHalfFloat) {
        this.useHalfFloat = false;
        gl.deleteFramebuffer(fbo);
        gl.deleteTexture(tex);
        if (rbo) gl.deleteRenderbuffer(rbo);
        return this._createFBO(w, h, { hdr: false, depth });
      }
      throw new Error(`FBO incomplete: 0x${status.toString(16)}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const bpp = (hdr && this.useHalfFloat) ? 8 : 4;
    return { fbo, tex, rbo, w, h, bytes: w * h * (bpp + (depth ? 2 : 0)) };
  }

  _deleteFBO(target) {
    if (!target) return;
    const gl = this.gl;
    gl.deleteFramebuffer(target.fbo);
    gl.deleteTexture(target.tex);
    if (target.rbo) gl.deleteRenderbuffer(target.rbo);
  }

  _rebuildFBOs() {
    this._deleteFBO(this.occluderFbo);
    this._deleteFBO(this.lightAtlasFbo);
    this._deleteFBO(this.sceneFbo);
    this._deleteFBO(this.bloomA);
    this._deleteFBO(this.bloomB);

    this.occluderW = Math.max(218, Math.round(this.lightW * 0.5));
    this.occluderH = Math.max(100, Math.round(this.lightH * 0.5));
    const bloomW = Math.max(218, Math.round(this.sceneW * 0.25));
    const bloomH = Math.max(100, Math.round(this.sceneH * 0.25));

    this.occluderFbo = this._createFBO(this.occluderW, this.occluderH, { hdr: false, depth: true });
    // 5ライティンググループを 3×2 アトラス 1枚に集約
    this.lightAtlasFbo = this._createFBO(this.lightW * 3, this.lightH * 2, { hdr: true, depth: false });
    this.sceneFbo = this._createFBO(this.sceneW, this.sceneH, { hdr: true, depth: false });
    this.bloomA = this._createFBO(bloomW, bloomH, { hdr: true, depth: false });
    this.bloomB = this._createFBO(bloomW, bloomH, { hdr: true, depth: false });

    this.fboVramBytes =
      this.occluderFbo.bytes +
      this.lightAtlasFbo.bytes +
      this.sceneFbo.bytes +
      this.bloomA.bytes +
      this.bloomB.bytes;

    this.canvas.width = this.sceneW;
    this.canvas.height = this.sceneH;
    this.stats.useHalfFloat = this.useHalfFloat;
  }

  setResolution(sceneW, sceneH, lightW, lightH) {
    if (
      sceneW === this.sceneW &&
      sceneH === this.sceneH &&
      lightW === this.lightW &&
      lightH === this.lightH
    ) {
      return;
    }
    this.sceneW = sceneW;
    this.sceneH = sceneH;
    this.lightW = lightW;
    this.lightH = lightH;
    this._rebuildFBOs();
  }

  async loadManifestAssets(manifestUrl = './assets/manifest.json', baseUrl = null) {
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    const manifest = await res.json();
    const resolveUrl = (rel) => baseUrl ? new URL(rel, baseUrl).href : rel;

    const loadImage = (url) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Image load failed: ${url}`));
      img.src = url;
    });

    const uploadTex = (img) => {
      const gl = this.gl;
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.textureVramBytes += Math.round(img.width * img.height * 4 * 1.33);
      return tex;
    };

    const entries = Object.entries(manifest);
    await Promise.all(entries.map(async ([key, meta]) => {
      const [cImg, nImg, eImg] = await Promise.all([
        loadImage(resolveUrl(meta.color)),
        meta.hasNormal ? loadImage(resolveUrl(meta.normal)) : Promise.resolve(null),
        meta.hasEmissive ? loadImage(resolveUrl(meta.emissive)) : Promise.resolve(null),
      ]);
      this.textures.set(key, {
        color: uploadTex(cImg),
        normal: nImg ? uploadTex(nImg) : null,
        emissive: eImg ? uploadTex(eImg) : null,
        w: meta.w,
        h: meta.h,
      });
    }));

    return manifest;
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    this._deleteFBO(this.occluderFbo);
    this._deleteFBO(this.lightAtlasFbo);
    this._deleteFBO(this.sceneFbo);
    this._deleteFBO(this.bloomA);
    this._deleteFBO(this.bloomB);
    for (const entry of this.textures.values()) {
      if (entry.color) gl.deleteTexture(entry.color);
      if (entry.normal) gl.deleteTexture(entry.normal);
      if (entry.emissive) gl.deleteTexture(entry.emissive);
    }
    this.textures.clear();
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }

  render(frame, syncFinish = false) {
    const t0 = performance.now();
    const gl = this.gl;
    const { cam, cfg, layers, itemsByLayerKey, highLights, simpleLights, beams, worldTime } = frame;
    const viewW = frame.viewW || LOGICAL_W;
    const viewH = frame.viewH || LOGICAL_H;

    let drawCalls = 0;
    let visibleSprites = 0;
    let culledSprites = 0;
    let drawnLayers = 0;
    let overdrawArea = 0;
    const viewArea = viewW * viewH;

    // 高品質光源のスクリーン投影データを事前計算（最大6個）
    const hlCount = Math.min(6, highLights.length);
    const hlPosZ = new Float32Array(24);
    const hlColorI = new Float32Array(24);
    const hlDirCone = new Float32Array(24);
    const hlScreen = new Float32Array(24);

    for (let i = 0; i < hlCount; i++) {
      const l = highLights[i];
      const proj = projectWorldToView(l.x, l.y, l.z, cam, viewW, viewH, {
        parallaxStrength: cfg.parallaxStrength,
        depthScaleStrength: cfg.depthScaleStrength,
      });
      hlPosZ[i * 4 + 0] = l.x;
      hlPosZ[i * 4 + 1] = l.y;
      hlPosZ[i * 4 + 2] = l.z;
      hlPosZ[i * 4 + 3] = l.radius;

      hlColorI[i * 4 + 0] = l.color[0];
      hlColorI[i * 4 + 1] = l.color[1];
      hlColorI[i * 4 + 2] = l.color[2];
      hlColorI[i * 4 + 3] = l.intensity;

      hlDirCone[i * 4 + 0] = l.dirX ?? 1;
      hlDirCone[i * 4 + 1] = l.dirY ?? 0;
      hlDirCone[i * 4 + 2] = l.cosHalfAngle ?? -2.0;
      hlDirCone[i * 4 + 3] = l.coneSoftness ?? 0.3;

      hlScreen[i * 4 + 0] = proj.sx / viewW;
      hlScreen[i * 4 + 1] = 1.0 - proj.sy / viewH;
      hlScreen[i * 4 + 2] = depthToNorm(l.z);
      hlScreen[i * 4 + 3] = l.zRange ?? 2.2;
    }

    const slCount = Math.min(16, simpleLights.length);
    const slPosZ = new Float32Array(64);
    const slColorI = new Float32Array(64);
    for (let i = 0; i < slCount; i++) {
      const l = simpleLights[i];
      slPosZ[i * 4 + 0] = l.x;
      slPosZ[i * 4 + 1] = l.y;
      slPosZ[i * 4 + 2] = l.z;
      slPosZ[i * 4 + 3] = l.radius;
      slColorI[i * 4 + 0] = l.color[0];
      slColorI[i * 4 + 1] = l.color[1];
      slColorI[i * 4 + 2] = l.color[2];
      slColorI[i * 4 + 3] = l.intensity;
    }

    // ------------------------------------------------------------------
    // PASS 1: 遮蔽マスク生成 (Occluder FBO + Depth Buffer)
    // ------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.occluderFbo.fbo);
    gl.viewport(0, 0, this.occluderW, this.occluderH);
    gl.clearColor(0, 1, 0, 1);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (cfg.enableShadows && cfg.enableLighting) {
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.disable(gl.BLEND);
      const po = this.progs.occluder;
      gl.useProgram(po.prog);
      gl.uniform2f(po.u.uViewSize, viewW, viewH);
      gl.uniform1f(po.u.uTime, worldTime);
      gl.uniform1i(po.u.uColorTex, 0);
      gl.bindVertexArray(this.gridVao);

      for (const layer of layers) {
        const items = itemsByLayerKey.get(layer.key);
        if (!items || items.length === 0) continue;
        for (const it of items) {
          if (!it.occluderWeight || it.occluderWeight <= 0) continue;
          const texEntry = this.textures.get(it.asset);
          if (!texEntry) continue;

          const wz = it.z ?? layer.z;
          const proj = projectWorldToView(it.x, it.y, wz, cam, viewW, viewH, {
            parallaxStrength: cfg.parallaxStrength,
            depthScaleStrength: cfg.depthScaleStrength,
          });
          const sw = it.w * proj.scale * layer.scaleMul;
          const sh = it.h * proj.scale * layer.scaleMul;
          if (!isRectVisible(proj.sx, proj.sy, sw * 0.65, sh * 0.65, viewW, viewH, 120)) continue;

          const dn = depthToNorm(wz);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texEntry.color);
          gl.uniform2f(po.u.uCenterScreen, proj.sx, proj.sy);
          gl.uniform2f(po.u.uSizeScreen, sw, sh);
          gl.uniform1f(po.u.uRotation, it.rotation || 0);
          gl.uniform2f(po.u.uFlip, it.flipX ? -1 : 1, it.flipY ? -1 : 1);
          gl.uniform4f(po.u.uUvRect, 0, 0, 1, 1);
          gl.uniform1f(po.u.uSwayAmp, cfg.enableAnim ? (it.swayAmp || 0) * cfg.currentStrength * proj.scale : 0);
          gl.uniform1f(po.u.uSwayFreq, (it.swayFreq || 1.2) * layer.animSpeed);
          gl.uniform1f(po.u.uSwayPhase, it.swayPhase || 0);
          gl.uniform1i(po.u.uDeformMode, it.deformMode || 0);
          gl.uniform1f(po.u.uDepthNorm, dn);
          gl.uniform1f(po.u.uOccluderWeight, it.occluderWeight);

          gl.drawElements(gl.TRIANGLES, this.gridIndexCount, gl.UNSIGNED_SHORT, 0);
          drawCalls++;
        }
      }
      gl.disable(gl.DEPTH_TEST);
    }

    // ------------------------------------------------------------------
    // PASS 2: 5ライティンググループ・アトラス (3×2 タイル)
    // ------------------------------------------------------------------
    if (cfg.enableLighting) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightAtlasFbo.fbo);
      gl.disable(gl.BLEND);
      const pl = this.progs.lightGroup;
      gl.useProgram(pl.prog);
      gl.bindVertexArray(this.emptyVao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.occluderFbo.tex);
      gl.uniform1i(pl.u.uOccluderTex, 0);
      gl.uniform2f(pl.u.uViewSize, viewW, viewH);
      gl.uniform2f(pl.u.uCamPos, cam.x, cam.y);
      gl.uniform1f(pl.u.uCamZoom, cam.zoom);
      gl.uniform1f(pl.u.uCameraDist, CAMERA_DIST);
      gl.uniform1f(pl.u.uParallaxStrength, cfg.parallaxStrength);
      gl.uniform1f(pl.u.uTime, worldTime);
      gl.uniform1f(pl.u.uTurbidity, cfg.turbidity);
      gl.uniform1f(pl.u.uShadowStrength, cfg.shadowStrength);
      gl.uniform1f(pl.u.uScatterStrength, cfg.scatterStrength);
      gl.uniform1f(pl.u.uAmbientBoost, cfg.ambientBoost);
      gl.uniform1i(pl.u.uEnableShadows, cfg.enableShadows ? 1 : 0);
      gl.uniform1i(pl.u.uEnableCaustics, cfg.enableCaustics ? 1 : 0);

      gl.uniform1i(pl.u.uHighLightCount, hlCount);
      gl.uniform4fv(pl.u.uHighPosZ, hlPosZ);
      gl.uniform4fv(pl.u.uHighColorI, hlColorI);
      gl.uniform4fv(pl.u.uHighDirCone, hlDirCone);
      gl.uniform4fv(pl.u.uHighScreen, hlScreen);

      gl.uniform1i(pl.u.uSimpleLightCount, slCount);
      gl.uniform4fv(pl.u.uSimplePosZ, slPosZ);
      gl.uniform4fv(pl.u.uSimpleColorI, slColorI);

      for (let g = 0; g < LIGHT_GROUPS.length; g++) {
        const col = g % 3;
        const row = Math.floor(g / 3);
        gl.viewport(col * this.lightW, row * this.lightH, this.lightW, this.lightH);
        gl.uniform1f(pl.u.uGroupZ, LIGHT_GROUPS[g].z);
        gl.uniform1f(pl.u.uGroupDepthNorm, depthToNorm(LIGHT_GROUPS[g].z));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        drawCalls++;
      }
    }

    // ------------------------------------------------------------------
    // PASS 3: 多層 2D 本体描画 + 深度インターリーブ粒子 + 光条
    // ------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo.fbo);
    gl.viewport(0, 0, this.sceneW, this.sceneH);
    gl.clearColor(0.012, 0.042, 0.062, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const ps = this.progs.sprite;
    const pp = this.progs.particle;
    const pb = this.progs.beam;

    const bindSpriteShared = () => {
      gl.useProgram(ps.prog);
      gl.bindVertexArray(this.gridVao);
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.lightAtlasFbo.tex);
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.occluderFbo.tex);

      gl.uniform1i(ps.u.uColorTex, 0);
      gl.uniform1i(ps.u.uNormalTex, 1);
      gl.uniform1i(ps.u.uEmissiveTex, 2);
      gl.uniform1i(ps.u.uLightAtlas, 3);
      gl.uniform1i(ps.u.uOccluderTex, 4);

      gl.uniform2f(ps.u.uViewSize, viewW, viewH);
      gl.uniform2f(ps.u.uCamPos, cam.x, cam.y);
      gl.uniform1f(ps.u.uCamZoom, cam.zoom);
      gl.uniform1f(ps.u.uCameraDist, CAMERA_DIST);
      gl.uniform1f(ps.u.uParallaxStrength, cfg.parallaxStrength);
      gl.uniform1f(ps.u.uTime, worldTime);

      gl.uniform1i(ps.u.uEnableNormal, cfg.enableNormal ? 1 : 0);
      gl.uniform1i(ps.u.uEnableLighting, cfg.enableLighting ? 1 : 0);
      gl.uniform1i(ps.u.uEnableFog, cfg.enableFog ? 1 : 0);
      gl.uniform1i(ps.u.uEnableRefraction, cfg.enableRefraction ? 1 : 0);
      gl.uniform1i(ps.u.uEnableBlur, cfg.enableBlur ? 1 : 0);
      gl.uniform1i(ps.u.uEnableShadows, cfg.enableShadows ? 1 : 0);
      gl.uniform1f(ps.u.uShadowStrength, cfg.shadowStrength);
      gl.uniform3f(ps.u.uFogColor, 0.018, 0.068, 0.095);

      gl.uniform1i(ps.u.uHighLightCount, hlCount);
      gl.uniform4fv(ps.u.uHighPosZ, hlPosZ);
      gl.uniform4fv(ps.u.uHighColorI, hlColorI);
      gl.uniform4fv(ps.u.uHighDirCone, hlDirCone);
      gl.uniform4fv(ps.u.uHighScreen, hlScreen);
    };

    const drawParticlesBand = (zMin, zMax, refZ) => {
      if (!cfg.enableParticles || cfg.particleCount <= 0) return;
      const blend = computeLightingGroupBlend(refZ);
      gl.useProgram(pp.prog);
      gl.bindVertexArray(this.particleVao);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.lightAtlasFbo.tex);
      gl.uniform1i(pp.u.uLightAtlas, 3);
      gl.uniform2f(pp.u.uViewSize, viewW, viewH);
      gl.uniform2f(pp.u.uCamPos, cam.x, cam.y);
      gl.uniform1f(pp.u.uCamZoom, cam.zoom);
      gl.uniform1f(pp.u.uCameraDist, CAMERA_DIST);
      gl.uniform1f(pp.u.uParallaxStrength, cfg.parallaxStrength);
      gl.uniform1f(pp.u.uTime, worldTime);
      gl.uniform1f(pp.u.uCurrentStrength, cfg.enableAnim ? cfg.currentStrength : 0.0);
      gl.uniform1f(pp.u.uZMin, zMin);
      gl.uniform1f(pp.u.uZMax, zMax);
      gl.uniform1f(pp.u.uPixelRatio, this.sceneW / viewW);
      gl.uniform1i(pp.u.uGroup0, blend.g0);
      gl.uniform1i(pp.u.uGroup1, blend.g1);
      gl.uniform1f(pp.u.uGroupBlend, blend.weight);
      gl.uniform1f(pp.u.uEmissiveBoost, cfg.emissiveBoost);
      gl.uniform1i(pp.u.uEnableLighting, cfg.enableLighting ? 1 : 0);

      gl.drawArrays(gl.POINTS, 0, Math.min(this.maxParticles, cfg.particleCount));
      drawCalls++;
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      bindSpriteShared();
    };

    const drawVolumetricBeams = () => {
      if (!cfg.enableLighting || !cfg.enableScatter || cfg.scatterStrength <= 0.01 || beams.length === 0) return;
      gl.useProgram(pb.prog);
      gl.bindVertexArray(this.quadVao);
      gl.blendFunc(gl.ONE, gl.ONE); // 加算光条

      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.occluderFbo.tex);
      gl.uniform1i(pb.u.uOccluderTex, 4);
      gl.uniform2f(pb.u.uViewSize, viewW, viewH);
      gl.uniform1f(pb.u.uTime, worldTime);
      gl.uniform1f(pb.u.uShadowStrength, cfg.shadowStrength);
      gl.uniform1i(pb.u.uEnableShadows, cfg.enableShadows ? 1 : 0);

      for (const b of beams) {
        const proj = projectWorldToView(b.x, b.y, b.z, cam, viewW, viewH, {
          parallaxStrength: cfg.parallaxStrength,
          depthScaleStrength: cfg.depthScaleStrength,
        });
        gl.uniform2f(pb.u.uOriginScreen, proj.sx, proj.sy);
        gl.uniform2f(pb.u.uOriginUv, proj.sx / viewW, 1.0 - proj.sy / viewH);
        gl.uniform1f(pb.u.uLengthScreen, b.length * proj.scale);
        gl.uniform1f(pb.u.uHalfWidthStart, b.halfStart * proj.scale);
        gl.uniform1f(pb.u.uHalfWidthEnd, b.halfEnd * proj.scale);
        gl.uniform1f(pb.u.uAngle, b.angle);
        gl.uniform3f(pb.u.uColor, b.color[0], b.color[1], b.color[2]);
        gl.uniform1f(pb.u.uIntensity, b.intensity * cfg.scatterStrength);
        gl.uniform1f(pb.u.uBeamDepthNorm, depthToNorm(b.z));

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        drawCalls++;
      }
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      bindSpriteShared();
    };

    bindSpriteShared();

    // 粒子帯域のインターリーブ管理（遠景 / 中景 / 操作層 / 前景の4帯域）
    const particleBands = [
      { zTrigger: 3.1, zMin: 2.6,  zMax: 10.0, refZ: 4.5, done: false },
      { zTrigger: 0.9, zMin: 0.7,  zMax: 2.6,  refZ: 1.5, done: false },
      { zTrigger: -0.05, zMin: -0.1, zMax: 0.7, refZ: 0.1, done: false },
    ];
    let beamsDrawn = false;

    for (const layer of layers) {
      // 深度帯域を跨いだタイミングで対応粒子を描画
      for (const band of particleBands) {
        if (!band.done && layer.z <= band.zTrigger) {
          drawParticlesBand(band.zMin, band.zMax, band.refZ);
          band.done = true;
        }
      }

      const items = itemsByLayerKey.get(layer.key);
      if (!items || items.length === 0) continue; // 空レイヤーの描画省略 (要件 6.2)

      let layerHadDraw = false;
      for (const it of items) {
        const texEntry = this.textures.get(it.asset);
        if (!texEntry) continue;

        const wz = it.z ?? layer.z;
        const proj = projectWorldToView(it.x, it.y, wz, cam, viewW, viewH, {
          parallaxStrength: cfg.parallaxStrength,
          depthScaleStrength: cfg.depthScaleStrength,
        });

        const sw = it.w * proj.scale * layer.scaleMul;
        const sh = it.h * proj.scale * layer.scaleMul;

        // 画面外フラスタムカリング (要件 6.2)
        if (!isRectVisible(proj.sx, proj.sy, sw * 0.6, sh * 0.6, viewW, viewH, 100)) {
          culledSprites++;
          continue;
        }

        const blend = it.z !== undefined ? computeLightingGroupBlend(wz) : layer.lightBlend;
        const layerTurbidity = clamp(layer.turbidity * cfg.turbidity * (it.turbidityMul ?? 1.0), 0.0, 0.86);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texEntry.color);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texEntry.normal || this.texFlatNormal);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, texEntry.emissive || this.texBlack);

        gl.uniform2f(ps.u.uCenterScreen, proj.sx, proj.sy);
        gl.uniform2f(ps.u.uSizeScreen, sw, sh);
        gl.uniform1f(ps.u.uRotation, it.rotation || 0);
        gl.uniform2f(ps.u.uFlip, it.flipX ? -1 : 1, it.flipY ? -1 : 1);
        gl.uniform4f(ps.u.uUvRect, 0, 0, 1, 1);

        const swayAmp = cfg.enableAnim ? (it.swayAmp || 0) * cfg.currentStrength * layer.swayStrength * proj.scale : 0;
        gl.uniform1f(ps.u.uSwayAmp, swayAmp);
        gl.uniform1f(ps.u.uSwayFreq, (it.swayFreq || 1.1) * layer.animSpeed);
        gl.uniform1f(ps.u.uSwayPhase, it.swayPhase || 0);
        gl.uniform1i(ps.u.uDeformMode, it.deformMode || 0);
        gl.uniform1f(ps.u.uDepthNorm, depthToNorm(wz));

        gl.uniform1i(ps.u.uHasNormal, texEntry.normal ? 1 : 0);
        gl.uniform1i(ps.u.uHasEmissive, texEntry.emissive ? 1 : 0);
        gl.uniform1f(ps.u.uLayerZ, wz);
        gl.uniform1f(ps.u.uLayerDepthNorm, depthToNorm(wz));
        gl.uniform1f(ps.u.uOpacity, layer.opacity * (it.opacity ?? 1.0));
        gl.uniform1f(ps.u.uBrightness, layer.brightness * (it.brightness ?? 1.0));
        gl.uniform1f(ps.u.uSaturation, layer.saturation * (it.saturation ?? 1.0));
        gl.uniform3f(ps.u.uTint, layer.tint[0], layer.tint[1], layer.tint[2]);
        gl.uniform1f(ps.u.uTurbidity, layerTurbidity);
        gl.uniform1f(ps.u.uBlur, layer.blur * (it.blurMul ?? 1.0));
        gl.uniform1f(ps.u.uEmissiveBoost, layer.emissiveBoost * cfg.emissiveBoost * (it.emissiveMul ?? 1.0));
        gl.uniform1f(ps.u.uLightInfluence, layer.lightInfluence * (it.lightInfluenceMul ?? 1.0));
        gl.uniform1f(ps.u.uNormalStrength, cfg.normalStrength * (it.normalMul ?? 1.0));
        gl.uniform1f(ps.u.uRefractionAmp, (it.noRefract ? 0.0 : 0.0014) * cfg.currentStrength * (wz > 0 ? clamp(wz * 0.25, 0.2, 1.1) : 0.2));

        gl.uniform1i(ps.u.uGroup0, blend.g0);
        gl.uniform1i(ps.u.uGroup1, blend.g1);
        gl.uniform1f(ps.u.uGroupBlend, blend.weight);

        gl.drawElements(gl.TRIANGLES, this.gridIndexCount, gl.UNSIGNED_SHORT, 0);
        drawCalls++;
        visibleSprites++;
        layerHadDraw = true;

        // 画面と交差する実描画ピクセル面積をオーバードロー推定へ加算
        const x0 = Math.max(0, proj.sx - sw * 0.5);
        const x1 = Math.min(viewW, proj.sx + sw * 0.5);
        const y0 = Math.max(0, proj.sy - sh * 0.5);
        const y1 = Math.min(viewH, proj.sy + sh * 0.5);
        if (x1 > x0 && y1 > y0) {
          overdrawArea += (x1 - x0) * (y1 - y0) * (it.fillRatio ?? 0.65);
        }
      }
      if (layerHadDraw) drawnLayers++;

      // 操作層の直後に潜水艇ボリュメトリック光条を描画（前景岩の後ろ、中景の前面）
      if (!beamsDrawn && layer.z <= 0.0) {
        drawVolumetricBeams();
        beamsDrawn = true;
      }
    }

    // 残りの粒子（背景専用モードでは z < 0 の前景粒子は Canvas2D 前景側へ譲る）
    for (const band of particleBands) {
      if (!band.done) drawParticlesBand(band.zMin, band.zMax, band.refZ);
    }
    if (!frame.skipForegroundParticles) {
      drawParticlesBand(-1.0, -0.1, -0.35);
    }

    // ------------------------------------------------------------------
    // PASS 4: 発光抽出 + 低解像度ピンポンブルーム
    // ------------------------------------------------------------------
    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.emptyVao);

    if (cfg.enableBloom && cfg.bloomStrength > 0.01) {
      // Extract -> bloomA
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
      const pe = this.progs.bloomExtract;
      gl.useProgram(pe.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.sceneFbo.tex);
      gl.uniform1i(pe.u.uSceneTex, 0);
      gl.uniform1f(pe.u.uThreshold, 0.58);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawCalls++;

      // Horizontal Blur -> bloomB
      const pbl = this.progs.blur;
      gl.useProgram(pbl.prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomB.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
      gl.uniform1i(pbl.u.uTex, 0);
      gl.uniform2f(pbl.u.uDir, 1.4 / this.bloomA.w, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawCalls++;

      // Vertical Blur -> bloomA
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.bloomB.tex);
      gl.uniform2f(pbl.u.uDir, 0, 1.4 / this.bloomA.h);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      drawCalls++;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.viewport(0, 0, this.bloomA.w, this.bloomA.h);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // ------------------------------------------------------------------
    // PASS 5: 最終合成（キャンバスへ出力）
    // ------------------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const pc = this.progs.composite;
    gl.useProgram(pc.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneFbo.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.bloomA.tex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.lightAtlasFbo.tex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.occluderFbo.tex);

    gl.uniform1i(pc.u.uSceneTex, 0);
    gl.uniform1i(pc.u.uBloomTex, 1);
    gl.uniform1i(pc.u.uLightAtlas, 2);
    gl.uniform1i(pc.u.uOccluderTex, 3);
    gl.uniform1f(pc.u.uBloomStrength, cfg.enableBloom ? cfg.bloomStrength : 0.0);
    gl.uniform1i(pc.u.uDebugView, cfg.debugView || 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    drawCalls++;
    if (syncFinish) gl.finish();

    // 統計更新
    this.stats.cpuSubmitMs = performance.now() - t0;
    this.stats.drawCalls = drawCalls;
    this.stats.visibleSprites = visibleSprites;
    this.stats.culledSprites = culledSprites;
    this.stats.activeLayers = layers.length;
    this.stats.drawnLayers = drawnLayers;
    this.stats.overdrawRatio = overdrawArea / viewArea;
    this.stats.vramMB = (this.textureVramBytes + this.fboVramBytes) / (1024 * 1024);
    this.stats.particleCount = cfg.enableParticles ? cfg.particleCount : 0;
    this.stats.highLightCount = hlCount;
    this.stats.simpleLightCount = slCount;
  }
}
