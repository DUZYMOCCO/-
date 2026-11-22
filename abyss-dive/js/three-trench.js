/**
 * ABYSS DIVE — 海溝（trench）の Three.js 2.5D 描画（v1.14.0 / 任意・遅延初期化）
 *
 * ねらい: 本編はこれまでどおり Canvas 2D（操作・シミュレーション・敵・弾・バリア・HUD・入出港・BGM）。
 *   そのうち「海溝の潜航」の**背景と照明だけ**を Three.js（WebGL2 / 正射影）で 1 回だけ描き、
 *   既存の 2D 潜航パイプラインへ 1 枚の画像として合成する（＝別画面のデモでも別物理でもない）。
 *
 * 当たり判定との一致: 衝突する岩は trench-rules.js の solids（矩形）そのもの。ここでも同じ矩形を
 *   同じ世界座標に描く（形を変えない）。solids だけが「触れる岩」。奥の岩壁は暗く沈めて背景として読ませる。
 *
 * 安全側の設計:
 *   - WebGL2 が無い / three の読み込みに失敗 / コンテキストロス → state='failed'|'lost' で即 2D へ戻す（呼び出し側は null を受けて従来描画）。
 *   - 遅延初期化（preload/init）: 海溝が視界に入るまでレンダラも three 本体も作らない。
 *   - 解像度は VW×RES（既定 0.62）に抑える。影なし・光源 4・メッシュ 10 枚程度。毎フレームの再生成なし。
 *   - release()（トグル OFF）／dispose()（ハブ帰還）で GPU リソースとリスナーを破棄。再入場で二重初期化しない（state で管理）。
 *
 * 座標: 世界座標は本編と同じ（x 右＋ / y 下＋、論理解像度 1280×720、海底 FLOOR_Y から下へ潜る）。
 *   Three 側は y を反転（three.y = -world.y）して置き、カメラを 1 回だけ world の窓へ合わせる。
 */

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* world 1px あたりのテクスチャ周期。世界座標は数千pxなので、1 タイル＝約 300px に合わせる
   （大きすぎると同じ画素を何千回もサンプルして平均色へ潰れ、岩の起伏が消える）。 */
const UV = 1 / 300;

/* 決定的な値ノイズ（毎フレーム乱数を使わない）。岩の起伏に使う。 */
function vnoise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
function relief(x, y, amp) {
  return (0.55 * vnoise(x, y) + 0.3 * vnoise(x * 0.37 + 11.3, y * 0.37 + 7.1)
        + 0.15 * vnoise(x * 0.13 + 3.7, y * 0.13 + 19.2) - 0.5) * amp;
}

export function createTrenchThree(opts) {
  const VW = (opts && opts.VW) || 1280;
  const VH = (opts && opts.VH) || 720;
  const RES = clamp((opts && opts.res) || 0.62, 0.4, 1);   // 内部描画解像度（負荷抑制）

  let THREE = null, renderer = null, scene = null, camera = null, canvas = null;
  let tex = null, matFloor = null, matBack = null, matGorge = null, matRock = null;
  let group = null, builtAx = null;
  let ctxLostHandler = null;
  let state = 'idle';        // idle | loading | ready | failed | lost
  let disposed = false;
  let autoPreloaded = false;

  function status() { return state; }
  function ready() { return state === 'ready'; }
  function getCanvas() { return canvas; }

  /* WebGL2 が使えるか（node テスト等では WebGL2RenderingContext が無いので false）。 */
  function probeWebGL2() {
    if (typeof WebGL2RenderingContext === 'undefined') return false;
    try {
      const c = document.createElement('canvas');
      c.width = 8; c.height = 8;
      return !!c.getContext('webgl2');
    } catch (e) { return false; }
  }

  function buildTextures() {
    const url = new URL('../assets/three/ground-trench.webp', import.meta.url).href;
    tex = new THREE.TextureLoader().load(url, (t) => { t.needsUpdate = true; });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 2;
  }

  function makeMaterials() {
    /* 暗い海溝でも「岩」として読めるよう、法線の起伏＋やや明るい色＋控えめな自己発光。
       2D の drawRockRect が上端に冷たいリムを描くのと同じ狙い（暗幕の下でも稜線を残す）。 */
    matRock  = new THREE.MeshStandardMaterial({ map: tex, color: 0xe4ecef, roughness: 0.97, metalness: 0.03,
                                                emissive: 0x2b505c, emissiveIntensity: 0.6 });
    matFloor = new THREE.MeshStandardMaterial({ map: tex, color: 0xb6c0c6, roughness: 0.98, metalness: 0.02,
                                                emissive: 0x234450, emissiveIntensity: 0.55 });
    matBack  = new THREE.MeshStandardMaterial({ map: tex, color: 0x6c7a82, roughness: 1.0, metalness: 0.0,
                                                emissive: 0x101f26, emissiveIntensity: 0.45 });
    matGorge = new THREE.MeshStandardMaterial({ map: tex, color: 0x3f545b, roughness: 1.0, metalness: 0.0,
                                                emissive: 0x0a1a20, emissiveIntensity: 0.4 });
  }

  /* 1 枚の板（世界矩形）を作る。UV は world 単位、z だけ起伏（XY の外形＝当たり矩形は変えない）。 */
  function plate(w, h, cx, cy, z, amp, mat, segDiv) {
    const segX = clamp(Math.round(w / (segDiv || 70)), 6, 40);
    const segY = clamp(Math.round(h / (segDiv || 70)), 3, 18);
    const g = new THREE.PlaneGeometry(w, h, segX, segY);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), py = pos.getY(i);
      const wx = cx + px, wy = cy - py;                 // 世界座標（y 下＋）
      pos.setZ(i, relief(wx, wy, amp));
      uv.setXY(i, wx * UV, wy * UV);
    }
    pos.needsUpdate = true; uv.needsUpdate = true;
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.set(cx, -cy, z);                          // y 反転して配置
    return m;
  }

  /* 海溝レイアウト（世界座標の矩形群）から Three のシーンを組む。layout.ax が変わったときだけ作り直す。 */
  function buildTrench(layout) {
    if (group) { scene.remove(group); disposeGroup(group); group = null; }
    group = new THREE.Group();

    /* 背景: 海溝の地盤（左右と下を沈める）。2D の drawBedrock と同じ範囲。 */
    const bx0 = layout.regionX0 - 220, bx1 = layout.regionX1 + 220;
    group.add(plate(bx1 - bx0, (layout.floorY + 260) - (layout.wallTop - 40), (bx0 + bx1) / 2, (layout.wallTop - 40 + layout.floorY + 260) / 2,
      -9, 46, matBack, 90));

    /* 開口の内側（下へ続く気配。2D の gorge グラデーションの代わり）。 */
    group.add(plate(layout.gorgeX1 - layout.gorgeX0, layout.floorY - layout.wallTop, (layout.gorgeX0 + layout.gorgeX1) / 2,
      (layout.wallTop + layout.floorY) / 2, -5, 30, matGorge, 90));

    /* さらに奥（暗い岩壁 2 枚）＝非衝突の奥岩。暗く沈めて背景として読ませる。 */
    group.add(plate((bx1 - bx0) + 120, (layout.floorY - layout.wallTop) + 320, (bx0 + bx1) / 2, (layout.wallTop + layout.floorY) / 2,
      -15, 34, matGorge, 110));
    group.add(plate((bx1 - bx0) + 300, (layout.floorY - layout.wallTop) + 640, (bx0 + bx1) / 2, (layout.wallTop + layout.floorY) / 2,
      -24, 40, matBack, 140));

    /* 深い底（2D の trench-floor と同じ位置）。 */
    group.add(plate(layout.gorgeX1 - layout.gorgeX0, 150, (layout.gorgeX0 + layout.gorgeX1) / 2, layout.floorY - 1 + 75,
      -1.5, 24, matFloor, 90));

    /* 衝突する岩（壁・岩棚）＝ solids の矩形そのもの。ここだけが「触れる岩」。 */
    for (const s of layout.solids) {
      const z = s.kind === 'ledge' ? 0.4 : 0.0;
      group.add(plate(s.w, s.h, s.x + s.w / 2, s.y + s.h / 2, z, s.kind === 'ledge' ? 16 : 26, matRock, 60));
    }

    scene.add(group);
    builtAx = layout.ax;
  }

  function disposeGroup(g) {
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }

  async function init() {
    if (disposed) return false;
    if (state === 'ready') return true;
    if (state === 'failed' || state === 'lost') return false;
    if (state === 'loading') return false;
    state = 'loading';
    if (!probeWebGL2()) { state = 'failed'; return false; }
    try {
      const mod = await import('../vendor/three.module.min.js');
      if (disposed) { state = 'failed'; return false; }
      THREE = mod;
      const iw = Math.round(VW * RES), ih = Math.max(1, Math.round(VW * RES * VH / VW));
      canvas = document.createElement('canvas');
      canvas.width = iw; canvas.height = ih;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, stencil: false,
        powerPreference: 'low-power', preserveDrawingBuffer: true });
      renderer.setSize(iw, ih, false);
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.autoClear = true;

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-VW / 2, VW / 2, VH / 2, -VH / 2, 0.1, 600);
      camera.position.set(0, 0, 10);
      camera.updateProjectionMatrix();

      /* 物理ベースのライト（three r170）。深い海だが「岩の起伏」が読める強さにする。 */
      scene.add(new THREE.HemisphereLight(0x4d90a8, 0x040f16, 3.4));
      const key = new THREE.DirectionalLight(0xc2e8f4, 4.6); key.position.set(-0.32, 0.7, 1.0); scene.add(key);
      const rim = new THREE.DirectionalLight(0x74b8cf, 2.4); rim.position.set(0.6, -0.5, 0.7); scene.add(rim);
      scene.add(new THREE.AmbientLight(0x1c3c48, 1.2));

      buildTextures();
      makeMaterials();

      /* コンテキストロス: 即 2D へ戻す（呼び出し側は ready() が false になって従来描画に切り替わる）。 */
      ctxLostHandler = (e) => { e.preventDefault(); state = 'lost'; destroyGL(); };
      canvas.addEventListener('webglcontextlost', ctxLostHandler, false);

      state = 'ready';
      return true;
    } catch (e) {
      state = 'failed';
      destroyGL();
      return false;
    }
  }

  function destroyGL() {
    /* 先にリスナーを外す（破棄時に forceContextLoss が webglcontextlost を発火させ、
       state を 'lost' に固定してしまうのを避ける）。 */
    if (canvas && ctxLostHandler) { try { canvas.removeEventListener('webglcontextlost', ctxLostHandler); } catch (e) { /* noop */ } }
    ctxLostHandler = null;
    try { if (renderer) { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } } catch (e) { /* noop */ }
    if (tex) { tex.dispose(); tex = null; }
    if (matRock) matRock.dispose(); if (matFloor) matFloor.dispose();
    if (matBack) matBack.dispose(); if (matGorge) matGorge.dispose();
    matRock = matFloor = matBack = matGorge = null;
    group = null; builtAx = null; scene = null; camera = null; renderer = null; THREE = null;
  }

  /** 事前読み込み（呼んだ瞬間に非同期で three を読む。失敗しても何もしない）。 */
  function preload() {
    if (autoPreloaded) return; autoPreloaded = true;
    try { init(); } catch (e) { /* noop */ }
  }

  /**
   * 海溝の背景を描いて canvas を返す（合成用）。ready でなければ null（＝呼び出し側は 2D にフォールバック）。
   * camX,camY は本編カメラ（world 左上）。lay は trench-rules の layout。t はゲーム時刻。
   */
  function render(camX, camY, lay, t) {
    if (state !== 'ready' || !renderer || !lay) return null;
    if (lay.regionX1 < camX - 260 || lay.regionX0 > camX + VW + 260) return null;   // 視界外は描かない
    if (builtAx !== lay.ax) buildTrench(lay);
    if (!group) return null;
    camera.position.set(camX + VW / 2, -(camY + VH / 2), 10);   // 世界の窓へ 1 回だけ合わせる
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    return canvas;
  }

  /* 資源だけ手放して再初期化できるようにする（3D/2D トグルの OFF 用）。 */
  function release() {
    destroyGL();
    canvas = null;
    state = 'idle';
    autoPreloaded = false;
  }

  /* 恒久破棄（ハブ帰還）。以降 init() は false を返す（＝新しい潜航＝新しいインスタンスで作り直す）。 */
  function dispose() {
    disposed = true;
    destroyGL();
    canvas = null;
    state = 'idle';
    autoPreloaded = false;
  }

  return { preload, init, ready, status, render, getCanvas, release, dispose };
}
