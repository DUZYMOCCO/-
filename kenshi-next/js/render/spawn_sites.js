// ランダム出現の野営地・獣の巣の見た目（仮）と、?spawn=debug の目印。
// 1か所 = 頂点カラーで1つにまとめたメッシュ1つ＋（野営地は）焚き火1つ。最大4か所なので描画は8回まで。
// 目印（debug）は縄張りの輪（1か所1つ）と、部隊の頭の上の柱（InstancedMesh 1つ）。

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { heightAt } from '../sim/index.js';
import { planSiteClutter } from './clutter_plan.js';
import { modelGroup } from './models.js';

const KIND_COLORS = { caravan: 0xffc84a, thieves: 0xb070ff, raiders: 0xff4a3a, beasts: 0x9a6a3a };
const MAX_BEAMS = 24;

// 決定的な小さい乱数（見た目だけ。sim の乱数は使わない）
function looksRng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x2c1b3c6d);
    s = Math.imul(s ^ (s >>> 12), 0x297a2d39);
    s ^= s >>> 15;
    return (s >>> 0) / 4294967296;
  };
}

function painted(geo, color, x, y, z, ry, rx, rz) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0));
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function siteSeed(site) {
  let h = 0;
  for (const ch of String(site.id)) h = Math.imul(h ^ ch.charCodeAt(0), 0x45d9f3b);
  return h ^ Math.round(site.x * 7) ^ Math.round(site.z * 13);
}

// 土地の起伏に沿って置く（中心からの相対で高さを取る）
function groundY(cx, cz, dx, dz, cy) {
  return heightAt(cx + dx, cz + dz) - cy;
}

function buildCamp(site, props) {
  const glbProps = props && Object.keys(props).length ? props : null;
  const r = looksRng(siteSeed(site));
  const cy = heightAt(site.x, site.z);
  const geos = [];
  const thief = site.type === 'thief_camp';
  const cloth = thief ? [0x4a4652, 0x5b5560, 0x3e3a44] : [0x7a5a3a, 0x8a6a44, 0x6a4a30];
  // 天幕（四角錐）を焚き火の周りに
  const tents = thief ? 2 : 3;
  for (let i = 0; i < tents; i += 1) {
    const a = (i / tents) * Math.PI * 2 + r() * 0.6;
    const d = 6 + r() * 2.5;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const h = 2.2 + r() * 0.6;
    geos.push(painted(new THREE.ConeGeometry(2.1, h, 4, 1), cloth[i % 3], x, groundY(site.x, site.z, x, z, cy) + h / 2, z, a + Math.PI / 4));
    // 入口の黒い布
    geos.push(
      painted(new THREE.PlaneGeometry(0.9, 1.3), 0x1a1612, x - Math.cos(a) * 1.05, groundY(site.x, site.z, x, z, cy) + 0.6, z - Math.sin(a) * 1.05, -a + Math.PI / 2)
    );
  }
  // 寝床（平たい箱）
  for (let i = 0; i < 4; i += 1) {
    const a = r() * Math.PI * 2;
    const d = 3 + r() * 1.5;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    geos.push(painted(new THREE.BoxGeometry(0.8, 0.12, 1.9), 0x5a4a3a, x, groundY(site.x, site.z, x, z, cy) + 0.06, z, a));
  }
  // 焚き火の石と薪
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    geos.push(painted(new THREE.DodecahedronGeometry(0.22, 0), 0x6a6660, Math.cos(a) * 0.85, 0.12, Math.sin(a) * 0.85, a));
  }
  for (let i = 0; i < 3; i += 1) {
    geos.push(painted(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 5), 0x3a2a1a, 0, 0.15, 0, (i * Math.PI) / 3, 0, Math.PI / 2));
  }
  // 木箱（野盗の分け前）。小物の glb が読めた時は glb を置く（下）
  for (let i = 0; i < (glbProps ? 0 : thief ? 3 : 2); i += 1) {
    const a = r() * Math.PI * 2;
    const x = Math.cos(a) * 4;
    const z = Math.sin(a) * 4;
    geos.push(painted(new THREE.BoxGeometry(0.8, 0.6, 0.8), 0x6e5232, x, groundY(site.x, site.z, x, z, cy) + 0.3, z, a));
  }
  // 野盗の野営地には見張りの杭と旗
  if (!thief) {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const x = Math.cos(a) * 11;
      const z = Math.sin(a) * 11;
      geos.push(painted(new THREE.CylinderGeometry(0.1, 0.14, 2.2, 5), 0x4a3826, x, groundY(site.x, site.z, x, z, cy) + 1.1, z, 0, 0.12));
    }
    geos.push(painted(new THREE.CylinderGeometry(0.06, 0.06, 4, 5), 0x3a2a1a, 2.5, 2, -2.5, 0));
    geos.push(painted(new THREE.PlaneGeometry(1.4, 0.9), 0x9a2a22, 3.2, 3.4, -2.5, 0));
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const fire = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.1, 6),
    new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.9 })
  );
  fire.position.set(0, 0.6, 0);
  const group = new THREE.Group();
  group.add(mesh, fire);
  if (glbProps) {
    for (const it of planSiteClutter(site)) {
      const baked = glbProps[it.role];
      if (!baked) continue;
      const g = modelGroup(baked); // ジオメトリと材質は共有（disposeEntry で消さない）
      g.position.set(it.x, groundY(site.x, site.z, it.x, it.z, cy) - 0.03, it.z);
      g.rotation.y = it.rot;
      group.add(g);
    }
  }
  group.position.set(site.x, cy, site.z);
  return { group, mesh, fire };
}

function buildNest(site) {
  const r = looksRng(siteSeed(site));
  const cy = heightAt(site.x, site.z);
  const geos = [];
  // 掘り返した土の山（平たい半球を3つ）
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + r();
    const d = i === 0 ? 0 : 3.2;
    const s = i === 0 ? 3.4 : 2.2;
    const g = new THREE.SphereGeometry(s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(1, 0.14, 1); // 低い土の盛り（獣が埋もれないように）
    geos.push(painted(g, i === 0 ? 0x5a4630 : 0x6a5236, Math.cos(a) * d, -0.05, Math.sin(a) * d, a));
  }
  // 穴（暗い円）
  const hole = new THREE.CircleGeometry(1.1, 12);
  geos.push(painted(hole, 0x120c08, 0.6, 0.5, 0.4, 0, -Math.PI / 2 + 0.12));
  // 骨と頭骨が散らばる
  for (let i = 0; i < 16; i += 1) {
    const a = r() * Math.PI * 2;
    const d = 3.5 + r() * 6;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const y = groundY(site.x, site.z, x, z, cy) + 0.06;
    geos.push(painted(new THREE.CylinderGeometry(0.05, 0.05, 0.6 + r() * 0.6, 4), 0xd8d0b8, x, y, z, r() * Math.PI, 0, Math.PI / 2));
  }
  for (let i = 0; i < 4; i += 1) {
    const a = r() * Math.PI * 2;
    const d = 4 + r() * 4;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    const g = new THREE.SphereGeometry(0.2, 6, 4);
    g.scale(1, 0.8, 1.3);
    geos.push(painted(g, 0xe6dec6, x, groundY(site.x, site.z, x, z, cy) + 0.15, z, r() * Math.PI));
  }
  // 枯れ枝の柵
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.3;
    const x = Math.cos(a) * 7.5;
    const z = Math.sin(a) * 7.5;
    geos.push(
      painted(new THREE.CylinderGeometry(0.05, 0.09, 1.6, 4), 0x3a2e22, x, groundY(site.x, site.z, x, z, cy) + 0.7, z, a, 0.5, 0.3)
    );
  }
  const geo = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  group.position.set(site.x, cy, site.z);
  return { group, mesh, fire: null };
}

function leashRing(site) {
  const pts = [];
  const n = 48;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * site.leash;
    const z = Math.sin(a) * site.leash;
    pts.push(new THREE.Vector3(x, heightAt(site.x + x, site.z + z) + 0.3, z));
  }
  const color = site.kind === 'nest' ? KIND_COLORS.beasts : site.type === 'thief_camp' ? KIND_COLORS.thieves : KIND_COLORS.raiders;
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color }));
  line.position.set(site.x, 0, site.z);
  return line;
}

export function createSpawnSites(scene, opts) {
  const debug = !!(opts && opts.debug);
  const root = new THREE.Group();
  root.name = 'spawn_sites';
  scene.add(root);
  const built = new Map(); // site.id -> { group, mesh, fire, ring, state }
  let beams = null;
  if (debug) {
    const g = new THREE.CylinderGeometry(0.18, 0.18, 14, 6);
    g.translate(0, 7 + 2.2, 0);
    beams = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }), MAX_BEAMS);
    beams.count = 0;
    beams.frustumCulled = false;
    root.add(beams);
  }
  const tmp = new THREE.Matrix4();
  const col = new THREE.Color();
  const stats = { sites: 0, beams: 0 };

  function disposeEntry(e) {
    root.remove(e.group);
    e.group.traverse((o) => {
      if (o.userData && o.userData.shared) return; // 小物の glb（共有）
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (e.ring) {
      root.remove(e.ring);
      e.ring.geometry.dispose();
      e.ring.material.dispose();
    }
  }

  function update(state, t) {
    const sites = state.spawn ? state.spawn.sites : [];
    const seen = new Set();
    for (const site of sites) {
      seen.add(site.id);
      let e = built.get(site.id);
      if (!e) {
        e = site.kind === 'nest' ? buildNest(site) : buildCamp(site, opts && opts.props);
        e.state = null;
        e.ring = debug ? leashRing(site) : null;
        root.add(e.group);
        if (e.ring) root.add(e.ring);
        built.set(site.id, e);
      }
      if (e.state !== site.state) {
        e.state = site.state;
        // 片付いた所は火を消して暗く
        if (e.fire) e.fire.visible = site.state === 'active';
        e.mesh.material.color.setScalar(site.state === 'active' ? 1 : 0.55);
      }
      if (e.fire && e.fire.visible) {
        const k = 0.85 + Math.sin((t || 0) * 9 + site.x) * 0.12;
        e.fire.scale.set(k, 0.9 + (1 - k), k);
      }
    }
    for (const [id, e] of built) {
      if (!seen.has(id)) {
        disposeEntry(e);
        built.delete(id);
      }
    }
    stats.sites = built.size;
    if (beams) {
      let n = 0;
      const byId = new Map(state.actors.map((a) => [a.id, a]));
      for (const sq of state.squads) {
        if (!sq.kind || n >= MAX_BEAMS) continue;
        const leader = sq.memberIds.map((id) => byId.get(id)).find((a) => a && a.state !== 'dead');
        if (!leader) continue;
        tmp.makeTranslation(leader.x, heightAt(leader.x, leader.z), leader.z);
        beams.setMatrixAt(n, tmp);
        beams.setColorAt(n, col.set(KIND_COLORS[sq.kind] || 0xffffff));
        n += 1;
      }
      beams.count = n;
      beams.instanceMatrix.needsUpdate = true;
      if (beams.instanceColor) beams.instanceColor.needsUpdate = true;
      stats.beams = n;
    }
  }

  function reset() {
    for (const e of built.values()) disposeEntry(e);
    built.clear();
  }

  return { update, reset, stats, root };
}
