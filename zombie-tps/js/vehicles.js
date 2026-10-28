// v0.9.0: のりもの（くるま・バン・トラック）が ばくはつ する
// ・ふつうの じゅうは なんぱつも（ライフル 10〜12はつ）・ロケットは 1ぱつ
// ・ダメージで けむり → ひ（あぶない の あいず）→ ドカーン！ ちかくの のりものも ゆうばく
// ・ばくはつは ゾンビ だけ（プレイヤー・なかま・おじさんは だいじょうぶ）。こわれた くるまは くろこげで のこる（かべ の まま）
import * as THREE from '../vendor/three.module.min.js';
import { VEHICLE, makeVehicleState, damageVehicle, vehicleStage, chainTargets } from './rules.js?v=39';
import { wreckVehicleBoxes } from './world.js?v=39';

const _p = new THREE.Vector3();
export const VEH_BLAST = { dmg: VEHICLE.dmg, blast: VEHICLE.blast, power: VEHICLE.power, vehicle: true };

export const VehicleMixin = {
  initVehicles() {
    this.vehicles = makeVehicleState(this.map.vehicles || []);
    this.vehById = new Map(this.vehicles.map((v) => [v.id, v]));
    this.vehFxT = 0; this.vehBoomCd = 0; this.vehWarned = false; this.vehBooms = 0;
  },
  resetVehicles() {
    if (!this.vehicles) return;
    for (const v of this.vehicles) if (v.dead) wreckVehicleBoxes(this.map.boxes, v.id, false);
    this.initVehicles();
  },
  // じゅうの たまが あたった（box.veh = ばんごう）
  hitVehicle(id, dmg, pos, opt = {}) {
    const v = this.vehById && this.vehById.get(id); if (!v || v.dead || v.fuse >= 0) return false;
    const st0 = vehicleStage(v);
    if (pos) this.fx.burst(pos, 3, { color: 0xffe080, color2: 0xffffff, speed: 3, up: 1.2, size: 0.04, life: 0.2, gravity: 8 });
    if (damageVehicle(v, dmg, opt)) {
      this.detonateVehicle(v); return true; // ロケットは 1ぱつで ここ
    }
    if (vehicleStage(v) === 2 && st0 < 2 && !this.vehWarned) { this.vehWarned = true; this.hud.kill('くるまが もえてる！ もうすぐ ばくはつ！'); }
    return false;
  },
  detonateVehicle(v) {
    v.dead = true; v.fuse = -1; v.hp = 0; v.burnT = 9; this.vehBooms++;
    wreckVehicleBoxes(this.map.boxes, v.id, true);
    const p = new THREE.Vector3(v.x, (v.minY || 0) + 1.0, v.z);
    this.explode(p, VEH_BLAST, { vehicle: true });
    // おおきな ほのお（つぶは FX の じょうげん 520 で とまる）
    this.fx.burst(p, 18, { color: 0xff7a1a, color2: 0xffd060, speed: 4, up: 5, size: 0.55, life: 0.6, gravity: -4, drag: 2.5 });
    this.fx.burst(p, 12, { color: 0x3a3a3a, color2: 0x5a5a5a, speed: 1.8, up: 4, size: 0.7, life: 1.8, gravity: -2.5, grow: 1.8, drag: 1.5 });
    // ゆうばく（すこし おくれて）
    const [a, b] = VEHICLE.chainDelay;
    let k = 0;
    for (const o of chainTargets(this.vehicles, v)) { o.fuse = a + (b - a) * Math.random() + k * 0.08; k++; }
  },
  updateVehicles(dt) {
    const vs = this.vehicles; if (!vs || !vs.length) return;
    this.vehFxT -= dt;
    const emit = this.vehFxT <= 0; if (emit) this.vehFxT = 0.09;
    for (const v of vs) {
      if (v.fuse >= 0) {
        v.fuse -= dt;
        if (v.fuse < 0) { v.fuse = -1; this.detonateVehicle(v); }
        continue;
      }
      if (!emit) continue;
      const st = vehicleStage(v);
      if (st === 0) continue;
      if (Math.hypot(v.x - this.pos.x, v.z - this.pos.z) > 50) continue;
      const top = (v.maxY || 2) - 0.1;
      _p.set(v.x + (Math.random() - 0.5) * 0.8, top, v.z + (Math.random() - 0.5) * 0.8);
      if (st === 3) { // こげた くるま: ときどき けむり
        v.burnT -= 0.09; if (v.burnT <= 0 || Math.random() < 0.6) continue;
        this.fx.burst(_p, 1, { color: 0x4a4a4a, color2: 0x6a6a6a, speed: 0.3, up: 1.2, size: 0.4, life: 1.6, gravity: -1.4, grow: 1.5, drag: 1 });
        continue;
      }
      this.fx.burst(_p, 1, { color: st === 2 ? 0x3a3a3a : 0x8a8a8a, color2: 0x6a6a6a, speed: 0.3, up: 1.4, size: 0.32, life: 1.3, gravity: -1.6, grow: 1.4, drag: 1 });
      if (st === 2) this.fx.burst(_p, 1, { color: 0xff8a1f, color2: 0xffd060, speed: 0.4, up: 1.2, size: 0.22, life: 0.35, gravity: -3, drag: 2 });
    }
  },
};
