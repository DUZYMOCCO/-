// 小物（tex_props_cx1 の色付き glb）を町・根城・廃墟に置き、根城の柵を glb の板にする。見た目だけ。
import * as THREE from 'three';
import { heightAt } from '../sim/index.js';
import { instancedModel } from './models.js';
import { planClutter, planFences, PROP_MODELS } from './clutter_plan.js';

// props: { 役目: baked }（読めた物だけ）。戻り値 { group, count, fences }
export function createClutter(scene, state, props) {
  const group = new THREE.Group();
  group.name = 'clutter';
  const items = [...planClutter(state), ...(props.fence ? planFences(state) : [])].filter((p) => props[p.role]);
  const byRole = {};
  for (const it of items) (byRole[it.role] = byRole[it.role] || []).push(it);
  const dummy = new THREE.Object3D();
  let count = 0;
  for (const [role, list] of Object.entries(byRole)) {
    const set = instancedModel(props[role], list.length, { name: 'prop_' + role, castShadow: role !== 'rubble' });
    list.forEach((it, i) => {
      // 斜面では低い側に合わせて少し埋める
      const r = 0.4 * it.scale;
      const y = Math.min(heightAt(it.x, it.z), heightAt(it.x + r, it.z), heightAt(it.x - r, it.z), heightAt(it.x, it.z + r), heightAt(it.x, it.z - r)) - 0.03;
      dummy.position.set(it.x, y, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.scale * (it.scaleX || 1), it.scale, it.scale);
      dummy.updateMatrix();
      set.set(i, dummy.matrix);
    });
    set.setCount(list.length);
    set.finish();
    set.addTo(group);
    count += list.length;
  }
  scene.add(group);
  return { group, count, fences: !!props.fence, roles: Object.keys(byRole) };
}

// 読めた glb（名前 → baked）を役目 → baked にする
export function propsByRole(loaded) {
  const out = {};
  for (const [role, name] of Object.entries(PROP_MODELS)) if (loaded && loaded[name]) out[role] = loaded[name];
  return out;
}
