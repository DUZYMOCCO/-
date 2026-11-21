/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
const hs = { ROTATE: 0, DOLLY: 1, PAN: 2 }, ss = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 }, uu = 0, Sc = 1, du = 2, sh = 1, rh = 2, Zn = 3, ti = 0, tn = 1, Zt = 2, vi = 0, us = 1, bc = 2, wc = 3, Ec = 4, fu = 5, Li = 100, pu = 101, mu = 102, gu = 103, _u = 104, vu = 200, xu = 201, yu = 202, Su = 203, Qo = 204, ea = 205, bu = 206, wu = 207, Eu = 208, Mu = 209, Tu = 210, Au = 211, Ru = 212, Cu = 213, Pu = 214, ta = 0, na = 1, ia = 2, ms = 3, sa = 4, ra = 5, oa = 6, aa = 7, oh = 0, Iu = 1, Lu = 2, xi = 0, Du = 1, Nu = 2, Uu = 3, ah = 4, Fu = 5, Ou = 6, Bu = 7, Mc = "attached", ku = "detached", ch = 300, gs = 301, _s = 302, ca = 303, la = 304, so = 306, $t = 1e3, mi = 1001, $r = 1002, nn = 1003, lh = 1004, Zs = 1005, pn = 1006, Gr = 1007, Jn = 1008, ni = 1009, hh = 1010, uh = 1011, ir = 1012, Ka = 1013, Ni = 1014, Cn = 1015, ar = 1016, ja = 1017, Za = 1018, vs = 1020, dh = 35902, fh = 1021, ph = 1022, xn = 1023, mh = 1024, gh = 1025, ds = 1026, xs = 1027, $a = 1028, Ja = 1029, _h = 1030, Qa = 1031, ec = 1033, Wr = 33776, Xr = 33777, qr = 33778, Yr = 33779, ha = 35840, ua = 35841, da = 35842, fa = 35843, pa = 36196, ma = 37492, ga = 37496, _a = 37808, va = 37809, xa = 37810, ya = 37811, Sa = 37812, ba = 37813, wa = 37814, Ea = 37815, Ma = 37816, Ta = 37817, Aa = 37818, Ra = 37819, Ca = 37820, Pa = 37821, Kr = 36492, Ia = 36494, La = 36495, vh = 36283, Da = 36284, Na = 36285, Ua = 36286, Fa = 2200, Oa = 2201, zu = 2202, sr = 2300, rr = 2301, co = 2302, rs = 2400, os = 2401, Jr = 2402, tc = 2500, Hu = 2501, Vu = 0, xh = 1, Ba = 2, Gu = 3200, Wu = 3201, yh = 0, Xu = 1, pi = "", Nt = "srgb", sn = "srgb-linear", Qr = "linear", vt = "srgb", ki = 7680, Tc = 519, qu = 512, Yu = 513, Ku = 514, Sh = 515, ju = 516, Zu = 517, $u = 518, Ju = 519, ka = 35044, Ac = "300 es", Qn = 2e3, eo = 2001;
class yi {
  addEventListener(e, t) {
    this._listeners === void 0 && (this._listeners = {});
    const n = this._listeners;
    n[e] === void 0 && (n[e] = []), n[e].indexOf(t) === -1 && n[e].push(t);
  }
  hasEventListener(e, t) {
    if (this._listeners === void 0) return !1;
    const n = this._listeners;
    return n[e] !== void 0 && n[e].indexOf(t) !== -1;
  }
  removeEventListener(e, t) {
    if (this._listeners === void 0) return;
    const s = this._listeners[e];
    if (s !== void 0) {
      const r = s.indexOf(t);
      r !== -1 && s.splice(r, 1);
    }
  }
  dispatchEvent(e) {
    if (this._listeners === void 0) return;
    const n = this._listeners[e.type];
    if (n !== void 0) {
      e.target = this;
      const s = n.slice(0);
      for (let r = 0, o = s.length; r < o; r++)
        s[r].call(this, e);
      e.target = null;
    }
  }
}
const Xt = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
let Rc = 1234567;
const Js = Math.PI / 180, ys = 180 / Math.PI;
function Pn() {
  const i = Math.random() * 4294967295 | 0, e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0;
  return (Xt[i & 255] + Xt[i >> 8 & 255] + Xt[i >> 16 & 255] + Xt[i >> 24 & 255] + "-" + Xt[e & 255] + Xt[e >> 8 & 255] + "-" + Xt[e >> 16 & 15 | 64] + Xt[e >> 24 & 255] + "-" + Xt[t & 63 | 128] + Xt[t >> 8 & 255] + "-" + Xt[t >> 16 & 255] + Xt[t >> 24 & 255] + Xt[n & 255] + Xt[n >> 8 & 255] + Xt[n >> 16 & 255] + Xt[n >> 24 & 255]).toLowerCase();
}
function qe(i, e, t) {
  return Math.max(e, Math.min(t, i));
}
function nc(i, e) {
  return (i % e + e) % e;
}
function Qu(i, e, t, n, s) {
  return n + (i - e) * (s - n) / (t - e);
}
function ed(i, e, t) {
  return i !== e ? (t - i) / (e - i) : 0;
}
function Qs(i, e, t) {
  return (1 - t) * i + t * e;
}
function td(i, e, t, n) {
  return Qs(i, e, 1 - Math.exp(-t * n));
}
function nd(i, e = 1) {
  return e - Math.abs(nc(i, e * 2) - e);
}
function id(i, e, t) {
  return i <= e ? 0 : i >= t ? 1 : (i = (i - e) / (t - e), i * i * (3 - 2 * i));
}
function sd(i, e, t) {
  return i <= e ? 0 : i >= t ? 1 : (i = (i - e) / (t - e), i * i * i * (i * (i * 6 - 15) + 10));
}
function rd(i, e) {
  return i + Math.floor(Math.random() * (e - i + 1));
}
function od(i, e) {
  return i + Math.random() * (e - i);
}
function ad(i) {
  return i * (0.5 - Math.random());
}
function cd(i) {
  i !== void 0 && (Rc = i);
  let e = Rc += 1831565813;
  return e = Math.imul(e ^ e >>> 15, e | 1), e ^= e + Math.imul(e ^ e >>> 7, e | 61), ((e ^ e >>> 14) >>> 0) / 4294967296;
}
function ld(i) {
  return i * Js;
}
function hd(i) {
  return i * ys;
}
function ud(i) {
  return (i & i - 1) === 0 && i !== 0;
}
function dd(i) {
  return Math.pow(2, Math.ceil(Math.log(i) / Math.LN2));
}
function fd(i) {
  return Math.pow(2, Math.floor(Math.log(i) / Math.LN2));
}
function pd(i, e, t, n, s) {
  const r = Math.cos, o = Math.sin, a = r(t / 2), c = o(t / 2), l = r((e + n) / 2), h = o((e + n) / 2), u = r((e - n) / 2), d = o((e - n) / 2), f = r((n - e) / 2), g = o((n - e) / 2);
  switch (s) {
    case "XYX":
      i.set(a * h, c * u, c * d, a * l);
      break;
    case "YZY":
      i.set(c * d, a * h, c * u, a * l);
      break;
    case "ZXZ":
      i.set(c * u, c * d, a * h, a * l);
      break;
    case "XZX":
      i.set(a * h, c * g, c * f, a * l);
      break;
    case "YXY":
      i.set(c * f, a * h, c * g, a * l);
      break;
    case "ZYZ":
      i.set(c * g, c * f, a * h, a * l);
      break;
    default:
      console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: " + s);
  }
}
function An(i, e) {
  switch (e.constructor) {
    case Float32Array:
      return i;
    case Uint32Array:
      return i / 4294967295;
    case Uint16Array:
      return i / 65535;
    case Uint8Array:
      return i / 255;
    case Int32Array:
      return Math.max(i / 2147483647, -1);
    case Int16Array:
      return Math.max(i / 32767, -1);
    case Int8Array:
      return Math.max(i / 127, -1);
    default:
      throw new Error("Invalid component type.");
  }
}
function gt(i, e) {
  switch (e.constructor) {
    case Float32Array:
      return i;
    case Uint32Array:
      return Math.round(i * 4294967295);
    case Uint16Array:
      return Math.round(i * 65535);
    case Uint8Array:
      return Math.round(i * 255);
    case Int32Array:
      return Math.round(i * 2147483647);
    case Int16Array:
      return Math.round(i * 32767);
    case Int8Array:
      return Math.round(i * 127);
    default:
      throw new Error("Invalid component type.");
  }
}
const as = {
  DEG2RAD: Js,
  RAD2DEG: ys,
  generateUUID: Pn,
  clamp: qe,
  euclideanModulo: nc,
  mapLinear: Qu,
  inverseLerp: ed,
  lerp: Qs,
  damp: td,
  pingpong: nd,
  smoothstep: id,
  smootherstep: sd,
  randInt: rd,
  randFloat: od,
  randFloatSpread: ad,
  seededRandom: cd,
  degToRad: ld,
  radToDeg: hd,
  isPowerOfTwo: ud,
  ceilPowerOfTwo: dd,
  floorPowerOfTwo: fd,
  setQuaternionFromProperEuler: pd,
  normalize: gt,
  denormalize: An
};
class ue {
  constructor(e = 0, t = 0) {
    ue.prototype.isVector2 = !0, this.x = e, this.y = t;
  }
  get width() {
    return this.x;
  }
  set width(e) {
    this.x = e;
  }
  get height() {
    return this.y;
  }
  set height(e) {
    this.y = e;
  }
  set(e, t) {
    return this.x = e, this.y = t, this;
  }
  setScalar(e) {
    return this.x = e, this.y = e, this;
  }
  setX(e) {
    return this.x = e, this;
  }
  setY(e) {
    return this.y = e, this;
  }
  setComponent(e, t) {
    switch (e) {
      case 0:
        this.x = t;
        break;
      case 1:
        this.y = t;
        break;
      default:
        throw new Error("index is out of range: " + e);
    }
    return this;
  }
  getComponent(e) {
    switch (e) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      default:
        throw new Error("index is out of range: " + e);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y);
  }
  copy(e) {
    return this.x = e.x, this.y = e.y, this;
  }
  add(e) {
    return this.x += e.x, this.y += e.y, this;
  }
  addScalar(e) {
    return this.x += e, this.y += e, this;
  }
  addVectors(e, t) {
    return this.x = e.x + t.x, this.y = e.y + t.y, this;
  }
  addScaledVector(e, t) {
    return this.x += e.x * t, this.y += e.y * t, this;
  }
  sub(e) {
    return this.x -= e.x, this.y -= e.y, this;
  }
  subScalar(e) {
    return this.x -= e, this.y -= e, this;
  }
  subVectors(e, t) {
    return this.x = e.x - t.x, this.y = e.y - t.y, this;
  }
  multiply(e) {
    return this.x *= e.x, this.y *= e.y, this;
  }
  multiplyScalar(e) {
    return this.x *= e, this.y *= e, this;
  }
  divide(e) {
    return this.x /= e.x, this.y /= e.y, this;
  }
  divideScalar(e) {
    return this.multiplyScalar(1 / e);
  }
  applyMatrix3(e) {
    const t = this.x, n = this.y, s = e.elements;
    return this.x = s[0] * t + s[3] * n + s[6], this.y = s[1] * t + s[4] * n + s[7], this;
  }
  min(e) {
    return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this;
  }
  max(e) {
    return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this;
  }
  clamp(e, t) {
    return this.x = qe(this.x, e.x, t.x), this.y = qe(this.y, e.y, t.y), this;
  }
  clampScalar(e, t) {
    return this.x = qe(this.x, e, t), this.y = qe(this.y, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(qe(n, e, t));
  }
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this;
  }
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this;
  }
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this;
  }
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this;
  }
  negate() {
    return this.x = -this.x, this.y = -this.y, this;
  }
  dot(e) {
    return this.x * e.x + this.y * e.y;
  }
  cross(e) {
    return this.x * e.y - this.y * e.x;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  angle() {
    return Math.atan2(-this.y, -this.x) + Math.PI;
  }
  angleTo(e) {
    const t = Math.sqrt(this.lengthSq() * e.lengthSq());
    if (t === 0) return Math.PI / 2;
    const n = this.dot(e) / t;
    return Math.acos(qe(n, -1, 1));
  }
  distanceTo(e) {
    return Math.sqrt(this.distanceToSquared(e));
  }
  distanceToSquared(e) {
    const t = this.x - e.x, n = this.y - e.y;
    return t * t + n * n;
  }
  manhattanDistanceTo(e) {
    return Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
  }
  setLength(e) {
    return this.normalize().multiplyScalar(e);
  }
  lerp(e, t) {
    return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this;
  }
  lerpVectors(e, t, n) {
    return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this;
  }
  equals(e) {
    return e.x === this.x && e.y === this.y;
  }
  fromArray(e, t = 0) {
    return this.x = e[t], this.y = e[t + 1], this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this.x, e[t + 1] = this.y, e;
  }
  fromBufferAttribute(e, t) {
    return this.x = e.getX(t), this.y = e.getY(t), this;
  }
  rotateAround(e, t) {
    const n = Math.cos(t), s = Math.sin(t), r = this.x - e.x, o = this.y - e.y;
    return this.x = r * n - o * s + e.x, this.y = r * s + o * n + e.y, this;
  }
  random() {
    return this.x = Math.random(), this.y = Math.random(), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y;
  }
}
class Ke {
  constructor(e, t, n, s, r, o, a, c, l) {
    Ke.prototype.isMatrix3 = !0, this.elements = [
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ], e !== void 0 && this.set(e, t, n, s, r, o, a, c, l);
  }
  set(e, t, n, s, r, o, a, c, l) {
    const h = this.elements;
    return h[0] = e, h[1] = s, h[2] = a, h[3] = t, h[4] = r, h[5] = c, h[6] = n, h[7] = o, h[8] = l, this;
  }
  identity() {
    return this.set(
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ), this;
  }
  copy(e) {
    const t = this.elements, n = e.elements;
    return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], this;
  }
  extractBasis(e, t, n) {
    return e.setFromMatrix3Column(this, 0), t.setFromMatrix3Column(this, 1), n.setFromMatrix3Column(this, 2), this;
  }
  setFromMatrix4(e) {
    const t = e.elements;
    return this.set(
      t[0],
      t[4],
      t[8],
      t[1],
      t[5],
      t[9],
      t[2],
      t[6],
      t[10]
    ), this;
  }
  multiply(e) {
    return this.multiplyMatrices(this, e);
  }
  premultiply(e) {
    return this.multiplyMatrices(e, this);
  }
  multiplyMatrices(e, t) {
    const n = e.elements, s = t.elements, r = this.elements, o = n[0], a = n[3], c = n[6], l = n[1], h = n[4], u = n[7], d = n[2], f = n[5], g = n[8], _ = s[0], m = s[3], p = s[6], x = s[1], y = s[4], v = s[7], P = s[2], A = s[5], C = s[8];
    return r[0] = o * _ + a * x + c * P, r[3] = o * m + a * y + c * A, r[6] = o * p + a * v + c * C, r[1] = l * _ + h * x + u * P, r[4] = l * m + h * y + u * A, r[7] = l * p + h * v + u * C, r[2] = d * _ + f * x + g * P, r[5] = d * m + f * y + g * A, r[8] = d * p + f * v + g * C, this;
  }
  multiplyScalar(e) {
    const t = this.elements;
    return t[0] *= e, t[3] *= e, t[6] *= e, t[1] *= e, t[4] *= e, t[7] *= e, t[2] *= e, t[5] *= e, t[8] *= e, this;
  }
  determinant() {
    const e = this.elements, t = e[0], n = e[1], s = e[2], r = e[3], o = e[4], a = e[5], c = e[6], l = e[7], h = e[8];
    return t * o * h - t * a * l - n * r * h + n * a * c + s * r * l - s * o * c;
  }
  invert() {
    const e = this.elements, t = e[0], n = e[1], s = e[2], r = e[3], o = e[4], a = e[5], c = e[6], l = e[7], h = e[8], u = h * o - a * l, d = a * c - h * r, f = l * r - o * c, g = t * u + n * d + s * f;
    if (g === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
    const _ = 1 / g;
    return e[0] = u * _, e[1] = (s * l - h * n) * _, e[2] = (a * n - s * o) * _, e[3] = d * _, e[4] = (h * t - s * c) * _, e[5] = (s * r - a * t) * _, e[6] = f * _, e[7] = (n * c - l * t) * _, e[8] = (o * t - n * r) * _, this;
  }
  transpose() {
    let e;
    const t = this.elements;
    return e = t[1], t[1] = t[3], t[3] = e, e = t[2], t[2] = t[6], t[6] = e, e = t[5], t[5] = t[7], t[7] = e, this;
  }
  getNormalMatrix(e) {
    return this.setFromMatrix4(e).invert().transpose();
  }
  transposeIntoArray(e) {
    const t = this.elements;
    return e[0] = t[0], e[1] = t[3], e[2] = t[6], e[3] = t[1], e[4] = t[4], e[5] = t[7], e[6] = t[2], e[7] = t[5], e[8] = t[8], this;
  }
  setUvTransform(e, t, n, s, r, o, a) {
    const c = Math.cos(r), l = Math.sin(r);
    return this.set(
      n * c,
      n * l,
      -n * (c * o + l * a) + o + e,
      -s * l,
      s * c,
      -s * (-l * o + c * a) + a + t,
      0,
      0,
      1
    ), this;
  }
  //
  scale(e, t) {
    return this.premultiply(lo.makeScale(e, t)), this;
  }
  rotate(e) {
    return this.premultiply(lo.makeRotation(-e)), this;
  }
  translate(e, t) {
    return this.premultiply(lo.makeTranslation(e, t)), this;
  }
  // for 2D Transforms
  makeTranslation(e, t) {
    return e.isVector2 ? this.set(
      1,
      0,
      e.x,
      0,
      1,
      e.y,
      0,
      0,
      1
    ) : this.set(
      1,
      0,
      e,
      0,
      1,
      t,
      0,
      0,
      1
    ), this;
  }
  makeRotation(e) {
    const t = Math.cos(e), n = Math.sin(e);
    return this.set(
      t,
      -n,
      0,
      n,
      t,
      0,
      0,
      0,
      1
    ), this;
  }
  makeScale(e, t) {
    return this.set(
      e,
      0,
      0,
      0,
      t,
      0,
      0,
      0,
      1
    ), this;
  }
  //
  equals(e) {
    const t = this.elements, n = e.elements;
    for (let s = 0; s < 9; s++)
      if (t[s] !== n[s]) return !1;
    return !0;
  }
  fromArray(e, t = 0) {
    for (let n = 0; n < 9; n++)
      this.elements[n] = e[n + t];
    return this;
  }
  toArray(e = [], t = 0) {
    const n = this.elements;
    return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e;
  }
  clone() {
    return new this.constructor().fromArray(this.elements);
  }
}
const lo = /* @__PURE__ */ new Ke();
function bh(i) {
  for (let e = i.length - 1; e >= 0; --e)
    if (i[e] >= 65535) return !0;
  return !1;
}
function or(i) {
  return document.createElementNS("http://www.w3.org/1999/xhtml", i);
}
function md() {
  const i = or("canvas");
  return i.style.display = "block", i;
}
const Cc = {};
function is(i) {
  i in Cc || (Cc[i] = !0, console.warn(i));
}
function gd(i, e, t) {
  return new Promise(function(n, s) {
    function r() {
      switch (i.clientWaitSync(e, i.SYNC_FLUSH_COMMANDS_BIT, 0)) {
        case i.WAIT_FAILED:
          s();
          break;
        case i.TIMEOUT_EXPIRED:
          setTimeout(r, t);
          break;
        default:
          n();
      }
    }
    setTimeout(r, t);
  });
}
function _d(i) {
  const e = i.elements;
  e[2] = 0.5 * e[2] + 0.5 * e[3], e[6] = 0.5 * e[6] + 0.5 * e[7], e[10] = 0.5 * e[10] + 0.5 * e[11], e[14] = 0.5 * e[14] + 0.5 * e[15];
}
function vd(i) {
  const e = i.elements;
  e[11] === -1 ? (e[10] = -e[10] - 1, e[14] = -e[14]) : (e[10] = -e[10], e[14] = -e[14] + 1);
}
const Pc = /* @__PURE__ */ new Ke().set(
  0.4123908,
  0.3575843,
  0.1804808,
  0.212639,
  0.7151687,
  0.0721923,
  0.0193308,
  0.1191948,
  0.9505322
), Ic = /* @__PURE__ */ new Ke().set(
  3.2409699,
  -1.5373832,
  -0.4986108,
  -0.9692436,
  1.8759675,
  0.0415551,
  0.0556301,
  -0.203977,
  1.0569715
);
function xd() {
  const i = {
    enabled: !0,
    workingColorSpace: sn,
    /**
     * Implementations of supported color spaces.
     *
     * Required:
     *	- primaries: chromaticity coordinates [ rx ry gx gy bx by ]
     *	- whitePoint: reference white [ x y ]
     *	- transfer: transfer function (pre-defined)
     *	- toXYZ: Matrix3 RGB to XYZ transform
     *	- fromXYZ: Matrix3 XYZ to RGB transform
     *	- luminanceCoefficients: RGB luminance coefficients
     *
     * Optional:
     *  - outputColorSpaceConfig: { drawingBufferColorSpace: ColorSpace }
     *  - workingColorSpaceConfig: { unpackColorSpace: ColorSpace }
     *
     * Reference:
     * - https://www.russellcottrell.com/photo/matrixCalculator.htm
     */
    spaces: {},
    convert: function(s, r, o) {
      return this.enabled === !1 || r === o || !r || !o || (this.spaces[r].transfer === vt && (s.r = ei(s.r), s.g = ei(s.g), s.b = ei(s.b)), this.spaces[r].primaries !== this.spaces[o].primaries && (s.applyMatrix3(this.spaces[r].toXYZ), s.applyMatrix3(this.spaces[o].fromXYZ)), this.spaces[o].transfer === vt && (s.r = fs(s.r), s.g = fs(s.g), s.b = fs(s.b))), s;
    },
    fromWorkingColorSpace: function(s, r) {
      return this.convert(s, this.workingColorSpace, r);
    },
    toWorkingColorSpace: function(s, r) {
      return this.convert(s, r, this.workingColorSpace);
    },
    getPrimaries: function(s) {
      return this.spaces[s].primaries;
    },
    getTransfer: function(s) {
      return s === pi ? Qr : this.spaces[s].transfer;
    },
    getLuminanceCoefficients: function(s, r = this.workingColorSpace) {
      return s.fromArray(this.spaces[r].luminanceCoefficients);
    },
    define: function(s) {
      Object.assign(this.spaces, s);
    },
    // Internal APIs
    _getMatrix: function(s, r, o) {
      return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ);
    },
    _getDrawingBufferColorSpace: function(s) {
      return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace;
    },
    _getUnpackColorSpace: function(s = this.workingColorSpace) {
      return this.spaces[s].workingColorSpaceConfig.unpackColorSpace;
    }
  }, e = [0.64, 0.33, 0.3, 0.6, 0.15, 0.06], t = [0.2126, 0.7152, 0.0722], n = [0.3127, 0.329];
  return i.define({
    [sn]: {
      primaries: e,
      whitePoint: n,
      transfer: Qr,
      toXYZ: Pc,
      fromXYZ: Ic,
      luminanceCoefficients: t,
      workingColorSpaceConfig: { unpackColorSpace: Nt },
      outputColorSpaceConfig: { drawingBufferColorSpace: Nt }
    },
    [Nt]: {
      primaries: e,
      whitePoint: n,
      transfer: vt,
      toXYZ: Pc,
      fromXYZ: Ic,
      luminanceCoefficients: t,
      outputColorSpaceConfig: { drawingBufferColorSpace: Nt }
    }
  }), i;
}
const rt = /* @__PURE__ */ xd();
function ei(i) {
  return i < 0.04045 ? i * 0.0773993808 : Math.pow(i * 0.9478672986 + 0.0521327014, 2.4);
}
function fs(i) {
  return i < 31308e-7 ? i * 12.92 : 1.055 * Math.pow(i, 0.41666) - 0.055;
}
let zi;
class yd {
  static getDataURL(e) {
    if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u")
      return e.src;
    let t;
    if (e instanceof HTMLCanvasElement)
      t = e;
    else {
      zi === void 0 && (zi = or("canvas")), zi.width = e.width, zi.height = e.height;
      const n = zi.getContext("2d");
      e instanceof ImageData ? n.putImageData(e, 0, 0) : n.drawImage(e, 0, 0, e.width, e.height), t = zi;
    }
    return t.width > 2048 || t.height > 2048 ? (console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons", e), t.toDataURL("image/jpeg", 0.6)) : t.toDataURL("image/png");
  }
  static sRGBToLinear(e) {
    if (typeof HTMLImageElement < "u" && e instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && e instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && e instanceof ImageBitmap) {
      const t = or("canvas");
      t.width = e.width, t.height = e.height;
      const n = t.getContext("2d");
      n.drawImage(e, 0, 0, e.width, e.height);
      const s = n.getImageData(0, 0, e.width, e.height), r = s.data;
      for (let o = 0; o < r.length; o++)
        r[o] = ei(r[o] / 255) * 255;
      return n.putImageData(s, 0, 0), t;
    } else if (e.data) {
      const t = e.data.slice(0);
      for (let n = 0; n < t.length; n++)
        t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[n] = Math.floor(ei(t[n] / 255) * 255) : t[n] = ei(t[n]);
      return {
        data: t,
        width: e.width,
        height: e.height
      };
    } else
      return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
  }
}
let Sd = 0;
class wh {
  constructor(e = null) {
    this.isSource = !0, Object.defineProperty(this, "id", { value: Sd++ }), this.uuid = Pn(), this.data = e, this.dataReady = !0, this.version = 0;
  }
  set needsUpdate(e) {
    e === !0 && this.version++;
  }
  toJSON(e) {
    const t = e === void 0 || typeof e == "string";
    if (!t && e.images[this.uuid] !== void 0)
      return e.images[this.uuid];
    const n = {
      uuid: this.uuid,
      url: ""
    }, s = this.data;
    if (s !== null) {
      let r;
      if (Array.isArray(s)) {
        r = [];
        for (let o = 0, a = s.length; o < a; o++)
          s[o].isDataTexture ? r.push(ho(s[o].image)) : r.push(ho(s[o]));
      } else
        r = ho(s);
      n.url = r;
    }
    return t || (e.images[this.uuid] = n), n;
  }
}
function ho(i) {
  return typeof HTMLImageElement < "u" && i instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && i instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && i instanceof ImageBitmap ? yd.getDataURL(i) : i.data ? {
    data: Array.from(i.data),
    width: i.width,
    height: i.height,
    type: i.data.constructor.name
  } : (console.warn("THREE.Texture: Unable to serialize Texture."), {});
}
let bd = 0;
class Ut extends yi {
  constructor(e = Ut.DEFAULT_IMAGE, t = Ut.DEFAULT_MAPPING, n = mi, s = mi, r = pn, o = Jn, a = xn, c = ni, l = Ut.DEFAULT_ANISOTROPY, h = pi) {
    super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: bd++ }), this.uuid = Pn(), this.name = "", this.source = new wh(e), this.mipmaps = [], this.mapping = t, this.channel = 0, this.wrapS = n, this.wrapT = s, this.magFilter = r, this.minFilter = o, this.anisotropy = l, this.format = a, this.internalFormat = null, this.type = c, this.offset = new ue(0, 0), this.repeat = new ue(1, 1), this.center = new ue(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new Ke(), this.generateMipmaps = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = h, this.userData = {}, this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.pmremVersion = 0;
  }
  get image() {
    return this.source.data;
  }
  set image(e = null) {
    this.source.data = e;
  }
  updateMatrix() {
    this.matrix.setUvTransform(this.offset.x, this.offset.y, this.repeat.x, this.repeat.y, this.rotation, this.center.x, this.center.y);
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    return this.name = e.name, this.source = e.source, this.mipmaps = e.mipmaps.slice(0), this.mapping = e.mapping, this.channel = e.channel, this.wrapS = e.wrapS, this.wrapT = e.wrapT, this.magFilter = e.magFilter, this.minFilter = e.minFilter, this.anisotropy = e.anisotropy, this.format = e.format, this.internalFormat = e.internalFormat, this.type = e.type, this.offset.copy(e.offset), this.repeat.copy(e.repeat), this.center.copy(e.center), this.rotation = e.rotation, this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrix.copy(e.matrix), this.generateMipmaps = e.generateMipmaps, this.premultiplyAlpha = e.premultiplyAlpha, this.flipY = e.flipY, this.unpackAlignment = e.unpackAlignment, this.colorSpace = e.colorSpace, this.renderTarget = e.renderTarget, this.isRenderTargetTexture = e.isRenderTargetTexture, this.userData = JSON.parse(JSON.stringify(e.userData)), this.needsUpdate = !0, this;
  }
  toJSON(e) {
    const t = e === void 0 || typeof e == "string";
    if (!t && e.textures[this.uuid] !== void 0)
      return e.textures[this.uuid];
    const n = {
      metadata: {
        version: 4.6,
        type: "Texture",
        generator: "Texture.toJSON"
      },
      uuid: this.uuid,
      name: this.name,
      image: this.source.toJSON(e).uuid,
      mapping: this.mapping,
      channel: this.channel,
      repeat: [this.repeat.x, this.repeat.y],
      offset: [this.offset.x, this.offset.y],
      center: [this.center.x, this.center.y],
      rotation: this.rotation,
      wrap: [this.wrapS, this.wrapT],
      format: this.format,
      internalFormat: this.internalFormat,
      type: this.type,
      colorSpace: this.colorSpace,
      minFilter: this.minFilter,
      magFilter: this.magFilter,
      anisotropy: this.anisotropy,
      flipY: this.flipY,
      generateMipmaps: this.generateMipmaps,
      premultiplyAlpha: this.premultiplyAlpha,
      unpackAlignment: this.unpackAlignment
    };
    return Object.keys(this.userData).length > 0 && (n.userData = this.userData), t || (e.textures[this.uuid] = n), n;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
  transformUv(e) {
    if (this.mapping !== ch) return e;
    if (e.applyMatrix3(this.matrix), e.x < 0 || e.x > 1)
      switch (this.wrapS) {
        case $t:
          e.x = e.x - Math.floor(e.x);
          break;
        case mi:
          e.x = e.x < 0 ? 0 : 1;
          break;
        case $r:
          Math.abs(Math.floor(e.x) % 2) === 1 ? e.x = Math.ceil(e.x) - e.x : e.x = e.x - Math.floor(e.x);
          break;
      }
    if (e.y < 0 || e.y > 1)
      switch (this.wrapT) {
        case $t:
          e.y = e.y - Math.floor(e.y);
          break;
        case mi:
          e.y = e.y < 0 ? 0 : 1;
          break;
        case $r:
          Math.abs(Math.floor(e.y) % 2) === 1 ? e.y = Math.ceil(e.y) - e.y : e.y = e.y - Math.floor(e.y);
          break;
      }
    return this.flipY && (e.y = 1 - e.y), e;
  }
  set needsUpdate(e) {
    e === !0 && (this.version++, this.source.needsUpdate = !0);
  }
  set needsPMREMUpdate(e) {
    e === !0 && this.pmremVersion++;
  }
}
Ut.DEFAULT_IMAGE = null;
Ut.DEFAULT_MAPPING = ch;
Ut.DEFAULT_ANISOTROPY = 1;
class dt {
  constructor(e = 0, t = 0, n = 0, s = 1) {
    dt.prototype.isVector4 = !0, this.x = e, this.y = t, this.z = n, this.w = s;
  }
  get width() {
    return this.z;
  }
  set width(e) {
    this.z = e;
  }
  get height() {
    return this.w;
  }
  set height(e) {
    this.w = e;
  }
  set(e, t, n, s) {
    return this.x = e, this.y = t, this.z = n, this.w = s, this;
  }
  setScalar(e) {
    return this.x = e, this.y = e, this.z = e, this.w = e, this;
  }
  setX(e) {
    return this.x = e, this;
  }
  setY(e) {
    return this.y = e, this;
  }
  setZ(e) {
    return this.z = e, this;
  }
  setW(e) {
    return this.w = e, this;
  }
  setComponent(e, t) {
    switch (e) {
      case 0:
        this.x = t;
        break;
      case 1:
        this.y = t;
        break;
      case 2:
        this.z = t;
        break;
      case 3:
        this.w = t;
        break;
      default:
        throw new Error("index is out of range: " + e);
    }
    return this;
  }
  getComponent(e) {
    switch (e) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      case 3:
        return this.w;
      default:
        throw new Error("index is out of range: " + e);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y, this.z, this.w);
  }
  copy(e) {
    return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w !== void 0 ? e.w : 1, this;
  }
  add(e) {
    return this.x += e.x, this.y += e.y, this.z += e.z, this.w += e.w, this;
  }
  addScalar(e) {
    return this.x += e, this.y += e, this.z += e, this.w += e, this;
  }
  addVectors(e, t) {
    return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this.w = e.w + t.w, this;
  }
  addScaledVector(e, t) {
    return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this.w += e.w * t, this;
  }
  sub(e) {
    return this.x -= e.x, this.y -= e.y, this.z -= e.z, this.w -= e.w, this;
  }
  subScalar(e) {
    return this.x -= e, this.y -= e, this.z -= e, this.w -= e, this;
  }
  subVectors(e, t) {
    return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this.w = e.w - t.w, this;
  }
  multiply(e) {
    return this.x *= e.x, this.y *= e.y, this.z *= e.z, this.w *= e.w, this;
  }
  multiplyScalar(e) {
    return this.x *= e, this.y *= e, this.z *= e, this.w *= e, this;
  }
  applyMatrix4(e) {
    const t = this.x, n = this.y, s = this.z, r = this.w, o = e.elements;
    return this.x = o[0] * t + o[4] * n + o[8] * s + o[12] * r, this.y = o[1] * t + o[5] * n + o[9] * s + o[13] * r, this.z = o[2] * t + o[6] * n + o[10] * s + o[14] * r, this.w = o[3] * t + o[7] * n + o[11] * s + o[15] * r, this;
  }
  divide(e) {
    return this.x /= e.x, this.y /= e.y, this.z /= e.z, this.w /= e.w, this;
  }
  divideScalar(e) {
    return this.multiplyScalar(1 / e);
  }
  setAxisAngleFromQuaternion(e) {
    this.w = 2 * Math.acos(e.w);
    const t = Math.sqrt(1 - e.w * e.w);
    return t < 1e-4 ? (this.x = 1, this.y = 0, this.z = 0) : (this.x = e.x / t, this.y = e.y / t, this.z = e.z / t), this;
  }
  setAxisAngleFromRotationMatrix(e) {
    let t, n, s, r;
    const c = e.elements, l = c[0], h = c[4], u = c[8], d = c[1], f = c[5], g = c[9], _ = c[2], m = c[6], p = c[10];
    if (Math.abs(h - d) < 0.01 && Math.abs(u - _) < 0.01 && Math.abs(g - m) < 0.01) {
      if (Math.abs(h + d) < 0.1 && Math.abs(u + _) < 0.1 && Math.abs(g + m) < 0.1 && Math.abs(l + f + p - 3) < 0.1)
        return this.set(1, 0, 0, 0), this;
      t = Math.PI;
      const y = (l + 1) / 2, v = (f + 1) / 2, P = (p + 1) / 2, A = (h + d) / 4, C = (u + _) / 4, I = (g + m) / 4;
      return y > v && y > P ? y < 0.01 ? (n = 0, s = 0.707106781, r = 0.707106781) : (n = Math.sqrt(y), s = A / n, r = C / n) : v > P ? v < 0.01 ? (n = 0.707106781, s = 0, r = 0.707106781) : (s = Math.sqrt(v), n = A / s, r = I / s) : P < 0.01 ? (n = 0.707106781, s = 0.707106781, r = 0) : (r = Math.sqrt(P), n = C / r, s = I / r), this.set(n, s, r, t), this;
    }
    let x = Math.sqrt((m - g) * (m - g) + (u - _) * (u - _) + (d - h) * (d - h));
    return Math.abs(x) < 1e-3 && (x = 1), this.x = (m - g) / x, this.y = (u - _) / x, this.z = (d - h) / x, this.w = Math.acos((l + f + p - 1) / 2), this;
  }
  setFromMatrixPosition(e) {
    const t = e.elements;
    return this.x = t[12], this.y = t[13], this.z = t[14], this.w = t[15], this;
  }
  min(e) {
    return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this.w = Math.min(this.w, e.w), this;
  }
  max(e) {
    return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this.w = Math.max(this.w, e.w), this;
  }
  clamp(e, t) {
    return this.x = qe(this.x, e.x, t.x), this.y = qe(this.y, e.y, t.y), this.z = qe(this.z, e.z, t.z), this.w = qe(this.w, e.w, t.w), this;
  }
  clampScalar(e, t) {
    return this.x = qe(this.x, e, t), this.y = qe(this.y, e, t), this.z = qe(this.z, e, t), this.w = qe(this.w, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(qe(n, e, t));
  }
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this.w = Math.floor(this.w), this;
  }
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this.w = Math.ceil(this.w), this;
  }
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this.w = Math.round(this.w), this;
  }
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this.w = Math.trunc(this.w), this;
  }
  negate() {
    return this.x = -this.x, this.y = -this.y, this.z = -this.z, this.w = -this.w, this;
  }
  dot(e) {
    return this.x * e.x + this.y * e.y + this.z * e.z + this.w * e.w;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z) + Math.abs(this.w);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  setLength(e) {
    return this.normalize().multiplyScalar(e);
  }
  lerp(e, t) {
    return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this.w += (e.w - this.w) * t, this;
  }
  lerpVectors(e, t, n) {
    return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this.w = e.w + (t.w - e.w) * n, this;
  }
  equals(e) {
    return e.x === this.x && e.y === this.y && e.z === this.z && e.w === this.w;
  }
  fromArray(e, t = 0) {
    return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this.w = e[t + 3], this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e[t + 3] = this.w, e;
  }
  fromBufferAttribute(e, t) {
    return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this.w = e.getW(t), this;
  }
  random() {
    return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this.w = Math.random(), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y, yield this.z, yield this.w;
  }
}
class wd extends yi {
  constructor(e = 1, t = 1, n = {}) {
    super(), this.isRenderTarget = !0, this.width = e, this.height = t, this.depth = 1, this.scissor = new dt(0, 0, e, t), this.scissorTest = !1, this.viewport = new dt(0, 0, e, t);
    const s = { width: e, height: t, depth: 1 };
    n = Object.assign({
      generateMipmaps: !1,
      internalFormat: null,
      minFilter: pn,
      depthBuffer: !0,
      stencilBuffer: !1,
      resolveDepthBuffer: !0,
      resolveStencilBuffer: !0,
      depthTexture: null,
      samples: 0,
      count: 1
    }, n);
    const r = new Ut(s, n.mapping, n.wrapS, n.wrapT, n.magFilter, n.minFilter, n.format, n.type, n.anisotropy, n.colorSpace);
    r.flipY = !1, r.generateMipmaps = n.generateMipmaps, r.internalFormat = n.internalFormat, this.textures = [];
    const o = n.count;
    for (let a = 0; a < o; a++)
      this.textures[a] = r.clone(), this.textures[a].isRenderTargetTexture = !0, this.textures[a].renderTarget = this;
    this.depthBuffer = n.depthBuffer, this.stencilBuffer = n.stencilBuffer, this.resolveDepthBuffer = n.resolveDepthBuffer, this.resolveStencilBuffer = n.resolveStencilBuffer, this._depthTexture = null, this.depthTexture = n.depthTexture, this.samples = n.samples;
  }
  get texture() {
    return this.textures[0];
  }
  set texture(e) {
    this.textures[0] = e;
  }
  set depthTexture(e) {
    this._depthTexture !== null && (this._depthTexture.renderTarget = null), e !== null && (e.renderTarget = this), this._depthTexture = e;
  }
  get depthTexture() {
    return this._depthTexture;
  }
  setSize(e, t, n = 1) {
    if (this.width !== e || this.height !== t || this.depth !== n) {
      this.width = e, this.height = t, this.depth = n;
      for (let s = 0, r = this.textures.length; s < r; s++)
        this.textures[s].image.width = e, this.textures[s].image.height = t, this.textures[s].image.depth = n;
      this.dispose();
    }
    this.viewport.set(0, 0, e, t), this.scissor.set(0, 0, e, t);
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    this.width = e.width, this.height = e.height, this.depth = e.depth, this.scissor.copy(e.scissor), this.scissorTest = e.scissorTest, this.viewport.copy(e.viewport), this.textures.length = 0;
    for (let n = 0, s = e.textures.length; n < s; n++)
      this.textures[n] = e.textures[n].clone(), this.textures[n].isRenderTargetTexture = !0, this.textures[n].renderTarget = this;
    const t = Object.assign({}, e.texture.image);
    return this.texture.source = new wh(t), this.depthBuffer = e.depthBuffer, this.stencilBuffer = e.stencilBuffer, this.resolveDepthBuffer = e.resolveDepthBuffer, this.resolveStencilBuffer = e.resolveStencilBuffer, e.depthTexture !== null && (this.depthTexture = e.depthTexture.clone()), this.samples = e.samples, this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
class Ui extends wd {
  constructor(e = 1, t = 1, n = {}) {
    super(e, t, n), this.isWebGLRenderTarget = !0;
  }
}
class Eh extends Ut {
  constructor(e = null, t = 1, n = 1, s = 1) {
    super(null), this.isDataArrayTexture = !0, this.image = { data: e, width: t, height: n, depth: s }, this.magFilter = nn, this.minFilter = nn, this.wrapR = mi, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
  }
  addLayerUpdate(e) {
    this.layerUpdates.add(e);
  }
  clearLayerUpdates() {
    this.layerUpdates.clear();
  }
}
class Ed extends Ut {
  constructor(e = null, t = 1, n = 1, s = 1) {
    super(null), this.isData3DTexture = !0, this.image = { data: e, width: t, height: n, depth: s }, this.magFilter = nn, this.minFilter = nn, this.wrapR = mi, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
  }
}
class mn {
  constructor(e = 0, t = 0, n = 0, s = 1) {
    this.isQuaternion = !0, this._x = e, this._y = t, this._z = n, this._w = s;
  }
  static slerpFlat(e, t, n, s, r, o, a) {
    let c = n[s + 0], l = n[s + 1], h = n[s + 2], u = n[s + 3];
    const d = r[o + 0], f = r[o + 1], g = r[o + 2], _ = r[o + 3];
    if (a === 0) {
      e[t + 0] = c, e[t + 1] = l, e[t + 2] = h, e[t + 3] = u;
      return;
    }
    if (a === 1) {
      e[t + 0] = d, e[t + 1] = f, e[t + 2] = g, e[t + 3] = _;
      return;
    }
    if (u !== _ || c !== d || l !== f || h !== g) {
      let m = 1 - a;
      const p = c * d + l * f + h * g + u * _, x = p >= 0 ? 1 : -1, y = 1 - p * p;
      if (y > Number.EPSILON) {
        const P = Math.sqrt(y), A = Math.atan2(P, p * x);
        m = Math.sin(m * A) / P, a = Math.sin(a * A) / P;
      }
      const v = a * x;
      if (c = c * m + d * v, l = l * m + f * v, h = h * m + g * v, u = u * m + _ * v, m === 1 - a) {
        const P = 1 / Math.sqrt(c * c + l * l + h * h + u * u);
        c *= P, l *= P, h *= P, u *= P;
      }
    }
    e[t] = c, e[t + 1] = l, e[t + 2] = h, e[t + 3] = u;
  }
  static multiplyQuaternionsFlat(e, t, n, s, r, o) {
    const a = n[s], c = n[s + 1], l = n[s + 2], h = n[s + 3], u = r[o], d = r[o + 1], f = r[o + 2], g = r[o + 3];
    return e[t] = a * g + h * u + c * f - l * d, e[t + 1] = c * g + h * d + l * u - a * f, e[t + 2] = l * g + h * f + a * d - c * u, e[t + 3] = h * g - a * u - c * d - l * f, e;
  }
  get x() {
    return this._x;
  }
  set x(e) {
    this._x = e, this._onChangeCallback();
  }
  get y() {
    return this._y;
  }
  set y(e) {
    this._y = e, this._onChangeCallback();
  }
  get z() {
    return this._z;
  }
  set z(e) {
    this._z = e, this._onChangeCallback();
  }
  get w() {
    return this._w;
  }
  set w(e) {
    this._w = e, this._onChangeCallback();
  }
  set(e, t, n, s) {
    return this._x = e, this._y = t, this._z = n, this._w = s, this._onChangeCallback(), this;
  }
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._w);
  }
  copy(e) {
    return this._x = e.x, this._y = e.y, this._z = e.z, this._w = e.w, this._onChangeCallback(), this;
  }
  setFromEuler(e, t = !0) {
    const n = e._x, s = e._y, r = e._z, o = e._order, a = Math.cos, c = Math.sin, l = a(n / 2), h = a(s / 2), u = a(r / 2), d = c(n / 2), f = c(s / 2), g = c(r / 2);
    switch (o) {
      case "XYZ":
        this._x = d * h * u + l * f * g, this._y = l * f * u - d * h * g, this._z = l * h * g + d * f * u, this._w = l * h * u - d * f * g;
        break;
      case "YXZ":
        this._x = d * h * u + l * f * g, this._y = l * f * u - d * h * g, this._z = l * h * g - d * f * u, this._w = l * h * u + d * f * g;
        break;
      case "ZXY":
        this._x = d * h * u - l * f * g, this._y = l * f * u + d * h * g, this._z = l * h * g + d * f * u, this._w = l * h * u - d * f * g;
        break;
      case "ZYX":
        this._x = d * h * u - l * f * g, this._y = l * f * u + d * h * g, this._z = l * h * g - d * f * u, this._w = l * h * u + d * f * g;
        break;
      case "YZX":
        this._x = d * h * u + l * f * g, this._y = l * f * u + d * h * g, this._z = l * h * g - d * f * u, this._w = l * h * u - d * f * g;
        break;
      case "XZY":
        this._x = d * h * u - l * f * g, this._y = l * f * u - d * h * g, this._z = l * h * g + d * f * u, this._w = l * h * u + d * f * g;
        break;
      default:
        console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: " + o);
    }
    return t === !0 && this._onChangeCallback(), this;
  }
  setFromAxisAngle(e, t) {
    const n = t / 2, s = Math.sin(n);
    return this._x = e.x * s, this._y = e.y * s, this._z = e.z * s, this._w = Math.cos(n), this._onChangeCallback(), this;
  }
  setFromRotationMatrix(e) {
    const t = e.elements, n = t[0], s = t[4], r = t[8], o = t[1], a = t[5], c = t[9], l = t[2], h = t[6], u = t[10], d = n + a + u;
    if (d > 0) {
      const f = 0.5 / Math.sqrt(d + 1);
      this._w = 0.25 / f, this._x = (h - c) * f, this._y = (r - l) * f, this._z = (o - s) * f;
    } else if (n > a && n > u) {
      const f = 2 * Math.sqrt(1 + n - a - u);
      this._w = (h - c) / f, this._x = 0.25 * f, this._y = (s + o) / f, this._z = (r + l) / f;
    } else if (a > u) {
      const f = 2 * Math.sqrt(1 + a - n - u);
      this._w = (r - l) / f, this._x = (s + o) / f, this._y = 0.25 * f, this._z = (c + h) / f;
    } else {
      const f = 2 * Math.sqrt(1 + u - n - a);
      this._w = (o - s) / f, this._x = (r + l) / f, this._y = (c + h) / f, this._z = 0.25 * f;
    }
    return this._onChangeCallback(), this;
  }
  setFromUnitVectors(e, t) {
    let n = e.dot(t) + 1;
    return n < Number.EPSILON ? (n = 0, Math.abs(e.x) > Math.abs(e.z) ? (this._x = -e.y, this._y = e.x, this._z = 0, this._w = n) : (this._x = 0, this._y = -e.z, this._z = e.y, this._w = n)) : (this._x = e.y * t.z - e.z * t.y, this._y = e.z * t.x - e.x * t.z, this._z = e.x * t.y - e.y * t.x, this._w = n), this.normalize();
  }
  angleTo(e) {
    return 2 * Math.acos(Math.abs(qe(this.dot(e), -1, 1)));
  }
  rotateTowards(e, t) {
    const n = this.angleTo(e);
    if (n === 0) return this;
    const s = Math.min(1, t / n);
    return this.slerp(e, s), this;
  }
  identity() {
    return this.set(0, 0, 0, 1);
  }
  invert() {
    return this.conjugate();
  }
  conjugate() {
    return this._x *= -1, this._y *= -1, this._z *= -1, this._onChangeCallback(), this;
  }
  dot(e) {
    return this._x * e._x + this._y * e._y + this._z * e._z + this._w * e._w;
  }
  lengthSq() {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }
  length() {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }
  normalize() {
    let e = this.length();
    return e === 0 ? (this._x = 0, this._y = 0, this._z = 0, this._w = 1) : (e = 1 / e, this._x = this._x * e, this._y = this._y * e, this._z = this._z * e, this._w = this._w * e), this._onChangeCallback(), this;
  }
  multiply(e) {
    return this.multiplyQuaternions(this, e);
  }
  premultiply(e) {
    return this.multiplyQuaternions(e, this);
  }
  multiplyQuaternions(e, t) {
    const n = e._x, s = e._y, r = e._z, o = e._w, a = t._x, c = t._y, l = t._z, h = t._w;
    return this._x = n * h + o * a + s * l - r * c, this._y = s * h + o * c + r * a - n * l, this._z = r * h + o * l + n * c - s * a, this._w = o * h - n * a - s * c - r * l, this._onChangeCallback(), this;
  }
  slerp(e, t) {
    if (t === 0) return this;
    if (t === 1) return this.copy(e);
    const n = this._x, s = this._y, r = this._z, o = this._w;
    let a = o * e._w + n * e._x + s * e._y + r * e._z;
    if (a < 0 ? (this._w = -e._w, this._x = -e._x, this._y = -e._y, this._z = -e._z, a = -a) : this.copy(e), a >= 1)
      return this._w = o, this._x = n, this._y = s, this._z = r, this;
    const c = 1 - a * a;
    if (c <= Number.EPSILON) {
      const f = 1 - t;
      return this._w = f * o + t * this._w, this._x = f * n + t * this._x, this._y = f * s + t * this._y, this._z = f * r + t * this._z, this.normalize(), this;
    }
    const l = Math.sqrt(c), h = Math.atan2(l, a), u = Math.sin((1 - t) * h) / l, d = Math.sin(t * h) / l;
    return this._w = o * u + this._w * d, this._x = n * u + this._x * d, this._y = s * u + this._y * d, this._z = r * u + this._z * d, this._onChangeCallback(), this;
  }
  slerpQuaternions(e, t, n) {
    return this.copy(e).slerp(t, n);
  }
  random() {
    const e = 2 * Math.PI * Math.random(), t = 2 * Math.PI * Math.random(), n = Math.random(), s = Math.sqrt(1 - n), r = Math.sqrt(n);
    return this.set(
      s * Math.sin(e),
      s * Math.cos(e),
      r * Math.sin(t),
      r * Math.cos(t)
    );
  }
  equals(e) {
    return e._x === this._x && e._y === this._y && e._z === this._z && e._w === this._w;
  }
  fromArray(e, t = 0) {
    return this._x = e[t], this._y = e[t + 1], this._z = e[t + 2], this._w = e[t + 3], this._onChangeCallback(), this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._w, e;
  }
  fromBufferAttribute(e, t) {
    return this._x = e.getX(t), this._y = e.getY(t), this._z = e.getZ(t), this._w = e.getW(t), this._onChangeCallback(), this;
  }
  toJSON() {
    return this.toArray();
  }
  _onChange(e) {
    return this._onChangeCallback = e, this;
  }
  _onChangeCallback() {
  }
  *[Symbol.iterator]() {
    yield this._x, yield this._y, yield this._z, yield this._w;
  }
}
class M {
  constructor(e = 0, t = 0, n = 0) {
    M.prototype.isVector3 = !0, this.x = e, this.y = t, this.z = n;
  }
  set(e, t, n) {
    return n === void 0 && (n = this.z), this.x = e, this.y = t, this.z = n, this;
  }
  setScalar(e) {
    return this.x = e, this.y = e, this.z = e, this;
  }
  setX(e) {
    return this.x = e, this;
  }
  setY(e) {
    return this.y = e, this;
  }
  setZ(e) {
    return this.z = e, this;
  }
  setComponent(e, t) {
    switch (e) {
      case 0:
        this.x = t;
        break;
      case 1:
        this.y = t;
        break;
      case 2:
        this.z = t;
        break;
      default:
        throw new Error("index is out of range: " + e);
    }
    return this;
  }
  getComponent(e) {
    switch (e) {
      case 0:
        return this.x;
      case 1:
        return this.y;
      case 2:
        return this.z;
      default:
        throw new Error("index is out of range: " + e);
    }
  }
  clone() {
    return new this.constructor(this.x, this.y, this.z);
  }
  copy(e) {
    return this.x = e.x, this.y = e.y, this.z = e.z, this;
  }
  add(e) {
    return this.x += e.x, this.y += e.y, this.z += e.z, this;
  }
  addScalar(e) {
    return this.x += e, this.y += e, this.z += e, this;
  }
  addVectors(e, t) {
    return this.x = e.x + t.x, this.y = e.y + t.y, this.z = e.z + t.z, this;
  }
  addScaledVector(e, t) {
    return this.x += e.x * t, this.y += e.y * t, this.z += e.z * t, this;
  }
  sub(e) {
    return this.x -= e.x, this.y -= e.y, this.z -= e.z, this;
  }
  subScalar(e) {
    return this.x -= e, this.y -= e, this.z -= e, this;
  }
  subVectors(e, t) {
    return this.x = e.x - t.x, this.y = e.y - t.y, this.z = e.z - t.z, this;
  }
  multiply(e) {
    return this.x *= e.x, this.y *= e.y, this.z *= e.z, this;
  }
  multiplyScalar(e) {
    return this.x *= e, this.y *= e, this.z *= e, this;
  }
  multiplyVectors(e, t) {
    return this.x = e.x * t.x, this.y = e.y * t.y, this.z = e.z * t.z, this;
  }
  applyEuler(e) {
    return this.applyQuaternion(Lc.setFromEuler(e));
  }
  applyAxisAngle(e, t) {
    return this.applyQuaternion(Lc.setFromAxisAngle(e, t));
  }
  applyMatrix3(e) {
    const t = this.x, n = this.y, s = this.z, r = e.elements;
    return this.x = r[0] * t + r[3] * n + r[6] * s, this.y = r[1] * t + r[4] * n + r[7] * s, this.z = r[2] * t + r[5] * n + r[8] * s, this;
  }
  applyNormalMatrix(e) {
    return this.applyMatrix3(e).normalize();
  }
  applyMatrix4(e) {
    const t = this.x, n = this.y, s = this.z, r = e.elements, o = 1 / (r[3] * t + r[7] * n + r[11] * s + r[15]);
    return this.x = (r[0] * t + r[4] * n + r[8] * s + r[12]) * o, this.y = (r[1] * t + r[5] * n + r[9] * s + r[13]) * o, this.z = (r[2] * t + r[6] * n + r[10] * s + r[14]) * o, this;
  }
  applyQuaternion(e) {
    const t = this.x, n = this.y, s = this.z, r = e.x, o = e.y, a = e.z, c = e.w, l = 2 * (o * s - a * n), h = 2 * (a * t - r * s), u = 2 * (r * n - o * t);
    return this.x = t + c * l + o * u - a * h, this.y = n + c * h + a * l - r * u, this.z = s + c * u + r * h - o * l, this;
  }
  project(e) {
    return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix);
  }
  unproject(e) {
    return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld);
  }
  transformDirection(e) {
    const t = this.x, n = this.y, s = this.z, r = e.elements;
    return this.x = r[0] * t + r[4] * n + r[8] * s, this.y = r[1] * t + r[5] * n + r[9] * s, this.z = r[2] * t + r[6] * n + r[10] * s, this.normalize();
  }
  divide(e) {
    return this.x /= e.x, this.y /= e.y, this.z /= e.z, this;
  }
  divideScalar(e) {
    return this.multiplyScalar(1 / e);
  }
  min(e) {
    return this.x = Math.min(this.x, e.x), this.y = Math.min(this.y, e.y), this.z = Math.min(this.z, e.z), this;
  }
  max(e) {
    return this.x = Math.max(this.x, e.x), this.y = Math.max(this.y, e.y), this.z = Math.max(this.z, e.z), this;
  }
  clamp(e, t) {
    return this.x = qe(this.x, e.x, t.x), this.y = qe(this.y, e.y, t.y), this.z = qe(this.z, e.z, t.z), this;
  }
  clampScalar(e, t) {
    return this.x = qe(this.x, e, t), this.y = qe(this.y, e, t), this.z = qe(this.z, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(qe(n, e, t));
  }
  floor() {
    return this.x = Math.floor(this.x), this.y = Math.floor(this.y), this.z = Math.floor(this.z), this;
  }
  ceil() {
    return this.x = Math.ceil(this.x), this.y = Math.ceil(this.y), this.z = Math.ceil(this.z), this;
  }
  round() {
    return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
  }
  roundToZero() {
    return this.x = Math.trunc(this.x), this.y = Math.trunc(this.y), this.z = Math.trunc(this.z), this;
  }
  negate() {
    return this.x = -this.x, this.y = -this.y, this.z = -this.z, this;
  }
  dot(e) {
    return this.x * e.x + this.y * e.y + this.z * e.z;
  }
  // TODO lengthSquared?
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
  manhattanLength() {
    return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z);
  }
  normalize() {
    return this.divideScalar(this.length() || 1);
  }
  setLength(e) {
    return this.normalize().multiplyScalar(e);
  }
  lerp(e, t) {
    return this.x += (e.x - this.x) * t, this.y += (e.y - this.y) * t, this.z += (e.z - this.z) * t, this;
  }
  lerpVectors(e, t, n) {
    return this.x = e.x + (t.x - e.x) * n, this.y = e.y + (t.y - e.y) * n, this.z = e.z + (t.z - e.z) * n, this;
  }
  cross(e) {
    return this.crossVectors(this, e);
  }
  crossVectors(e, t) {
    const n = e.x, s = e.y, r = e.z, o = t.x, a = t.y, c = t.z;
    return this.x = s * c - r * a, this.y = r * o - n * c, this.z = n * a - s * o, this;
  }
  projectOnVector(e) {
    const t = e.lengthSq();
    if (t === 0) return this.set(0, 0, 0);
    const n = e.dot(this) / t;
    return this.copy(e).multiplyScalar(n);
  }
  projectOnPlane(e) {
    return uo.copy(this).projectOnVector(e), this.sub(uo);
  }
  reflect(e) {
    return this.sub(uo.copy(e).multiplyScalar(2 * this.dot(e)));
  }
  angleTo(e) {
    const t = Math.sqrt(this.lengthSq() * e.lengthSq());
    if (t === 0) return Math.PI / 2;
    const n = this.dot(e) / t;
    return Math.acos(qe(n, -1, 1));
  }
  distanceTo(e) {
    return Math.sqrt(this.distanceToSquared(e));
  }
  distanceToSquared(e) {
    const t = this.x - e.x, n = this.y - e.y, s = this.z - e.z;
    return t * t + n * n + s * s;
  }
  manhattanDistanceTo(e) {
    return Math.abs(this.x - e.x) + Math.abs(this.y - e.y) + Math.abs(this.z - e.z);
  }
  setFromSpherical(e) {
    return this.setFromSphericalCoords(e.radius, e.phi, e.theta);
  }
  setFromSphericalCoords(e, t, n) {
    const s = Math.sin(t) * e;
    return this.x = s * Math.sin(n), this.y = Math.cos(t) * e, this.z = s * Math.cos(n), this;
  }
  setFromCylindrical(e) {
    return this.setFromCylindricalCoords(e.radius, e.theta, e.y);
  }
  setFromCylindricalCoords(e, t, n) {
    return this.x = e * Math.sin(t), this.y = n, this.z = e * Math.cos(t), this;
  }
  setFromMatrixPosition(e) {
    const t = e.elements;
    return this.x = t[12], this.y = t[13], this.z = t[14], this;
  }
  setFromMatrixScale(e) {
    const t = this.setFromMatrixColumn(e, 0).length(), n = this.setFromMatrixColumn(e, 1).length(), s = this.setFromMatrixColumn(e, 2).length();
    return this.x = t, this.y = n, this.z = s, this;
  }
  setFromMatrixColumn(e, t) {
    return this.fromArray(e.elements, t * 4);
  }
  setFromMatrix3Column(e, t) {
    return this.fromArray(e.elements, t * 3);
  }
  setFromEuler(e) {
    return this.x = e._x, this.y = e._y, this.z = e._z, this;
  }
  setFromColor(e) {
    return this.x = e.r, this.y = e.g, this.z = e.b, this;
  }
  equals(e) {
    return e.x === this.x && e.y === this.y && e.z === this.z;
  }
  fromArray(e, t = 0) {
    return this.x = e[t], this.y = e[t + 1], this.z = e[t + 2], this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this.x, e[t + 1] = this.y, e[t + 2] = this.z, e;
  }
  fromBufferAttribute(e, t) {
    return this.x = e.getX(t), this.y = e.getY(t), this.z = e.getZ(t), this;
  }
  random() {
    return this.x = Math.random(), this.y = Math.random(), this.z = Math.random(), this;
  }
  randomDirection() {
    const e = Math.random() * Math.PI * 2, t = Math.random() * 2 - 1, n = Math.sqrt(1 - t * t);
    return this.x = n * Math.cos(e), this.y = t, this.z = n * Math.sin(e), this;
  }
  *[Symbol.iterator]() {
    yield this.x, yield this.y, yield this.z;
  }
}
const uo = /* @__PURE__ */ new M(), Lc = /* @__PURE__ */ new mn();
class Ln {
  constructor(e = new M(1 / 0, 1 / 0, 1 / 0), t = new M(-1 / 0, -1 / 0, -1 / 0)) {
    this.isBox3 = !0, this.min = e, this.max = t;
  }
  set(e, t) {
    return this.min.copy(e), this.max.copy(t), this;
  }
  setFromArray(e) {
    this.makeEmpty();
    for (let t = 0, n = e.length; t < n; t += 3)
      this.expandByPoint(bn.fromArray(e, t));
    return this;
  }
  setFromBufferAttribute(e) {
    this.makeEmpty();
    for (let t = 0, n = e.count; t < n; t++)
      this.expandByPoint(bn.fromBufferAttribute(e, t));
    return this;
  }
  setFromPoints(e) {
    this.makeEmpty();
    for (let t = 0, n = e.length; t < n; t++)
      this.expandByPoint(e[t]);
    return this;
  }
  setFromCenterAndSize(e, t) {
    const n = bn.copy(t).multiplyScalar(0.5);
    return this.min.copy(e).sub(n), this.max.copy(e).add(n), this;
  }
  setFromObject(e, t = !1) {
    return this.makeEmpty(), this.expandByObject(e, t);
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    return this.min.copy(e.min), this.max.copy(e.max), this;
  }
  makeEmpty() {
    return this.min.x = this.min.y = this.min.z = 1 / 0, this.max.x = this.max.y = this.max.z = -1 / 0, this;
  }
  isEmpty() {
    return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
  }
  getCenter(e) {
    return this.isEmpty() ? e.set(0, 0, 0) : e.addVectors(this.min, this.max).multiplyScalar(0.5);
  }
  getSize(e) {
    return this.isEmpty() ? e.set(0, 0, 0) : e.subVectors(this.max, this.min);
  }
  expandByPoint(e) {
    return this.min.min(e), this.max.max(e), this;
  }
  expandByVector(e) {
    return this.min.sub(e), this.max.add(e), this;
  }
  expandByScalar(e) {
    return this.min.addScalar(-e), this.max.addScalar(e), this;
  }
  expandByObject(e, t = !1) {
    e.updateWorldMatrix(!1, !1);
    const n = e.geometry;
    if (n !== void 0) {
      const r = n.getAttribute("position");
      if (t === !0 && r !== void 0 && e.isInstancedMesh !== !0)
        for (let o = 0, a = r.count; o < a; o++)
          e.isMesh === !0 ? e.getVertexPosition(o, bn) : bn.fromBufferAttribute(r, o), bn.applyMatrix4(e.matrixWorld), this.expandByPoint(bn);
      else
        e.boundingBox !== void 0 ? (e.boundingBox === null && e.computeBoundingBox(), ur.copy(e.boundingBox)) : (n.boundingBox === null && n.computeBoundingBox(), ur.copy(n.boundingBox)), ur.applyMatrix4(e.matrixWorld), this.union(ur);
    }
    const s = e.children;
    for (let r = 0, o = s.length; r < o; r++)
      this.expandByObject(s[r], t);
    return this;
  }
  containsPoint(e) {
    return e.x >= this.min.x && e.x <= this.max.x && e.y >= this.min.y && e.y <= this.max.y && e.z >= this.min.z && e.z <= this.max.z;
  }
  containsBox(e) {
    return this.min.x <= e.min.x && e.max.x <= this.max.x && this.min.y <= e.min.y && e.max.y <= this.max.y && this.min.z <= e.min.z && e.max.z <= this.max.z;
  }
  getParameter(e, t) {
    return t.set(
      (e.x - this.min.x) / (this.max.x - this.min.x),
      (e.y - this.min.y) / (this.max.y - this.min.y),
      (e.z - this.min.z) / (this.max.z - this.min.z)
    );
  }
  intersectsBox(e) {
    return e.max.x >= this.min.x && e.min.x <= this.max.x && e.max.y >= this.min.y && e.min.y <= this.max.y && e.max.z >= this.min.z && e.min.z <= this.max.z;
  }
  intersectsSphere(e) {
    return this.clampPoint(e.center, bn), bn.distanceToSquared(e.center) <= e.radius * e.radius;
  }
  intersectsPlane(e) {
    let t, n;
    return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
  }
  intersectsTriangle(e) {
    if (this.isEmpty())
      return !1;
    this.getCenter(ks), dr.subVectors(this.max, ks), Hi.subVectors(e.a, ks), Vi.subVectors(e.b, ks), Gi.subVectors(e.c, ks), ri.subVectors(Vi, Hi), oi.subVectors(Gi, Vi), wi.subVectors(Hi, Gi);
    let t = [
      0,
      -ri.z,
      ri.y,
      0,
      -oi.z,
      oi.y,
      0,
      -wi.z,
      wi.y,
      ri.z,
      0,
      -ri.x,
      oi.z,
      0,
      -oi.x,
      wi.z,
      0,
      -wi.x,
      -ri.y,
      ri.x,
      0,
      -oi.y,
      oi.x,
      0,
      -wi.y,
      wi.x,
      0
    ];
    return !fo(t, Hi, Vi, Gi, dr) || (t = [1, 0, 0, 0, 1, 0, 0, 0, 1], !fo(t, Hi, Vi, Gi, dr)) ? !1 : (fr.crossVectors(ri, oi), t = [fr.x, fr.y, fr.z], fo(t, Hi, Vi, Gi, dr));
  }
  clampPoint(e, t) {
    return t.copy(e).clamp(this.min, this.max);
  }
  distanceToPoint(e) {
    return this.clampPoint(e, bn).distanceTo(e);
  }
  getBoundingSphere(e) {
    return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(bn).length() * 0.5), e;
  }
  intersect(e) {
    return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
  }
  union(e) {
    return this.min.min(e.min), this.max.max(e.max), this;
  }
  applyMatrix4(e) {
    return this.isEmpty() ? this : (Gn[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), Gn[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), Gn[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), Gn[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), Gn[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), Gn[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), Gn[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), Gn[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(Gn), this);
  }
  translate(e) {
    return this.min.add(e), this.max.add(e), this;
  }
  equals(e) {
    return e.min.equals(this.min) && e.max.equals(this.max);
  }
}
const Gn = [
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M()
], bn = /* @__PURE__ */ new M(), ur = /* @__PURE__ */ new Ln(), Hi = /* @__PURE__ */ new M(), Vi = /* @__PURE__ */ new M(), Gi = /* @__PURE__ */ new M(), ri = /* @__PURE__ */ new M(), oi = /* @__PURE__ */ new M(), wi = /* @__PURE__ */ new M(), ks = /* @__PURE__ */ new M(), dr = /* @__PURE__ */ new M(), fr = /* @__PURE__ */ new M(), Ei = /* @__PURE__ */ new M();
function fo(i, e, t, n, s) {
  for (let r = 0, o = i.length - 3; r <= o; r += 3) {
    Ei.fromArray(i, r);
    const a = s.x * Math.abs(Ei.x) + s.y * Math.abs(Ei.y) + s.z * Math.abs(Ei.z), c = e.dot(Ei), l = t.dot(Ei), h = n.dot(Ei);
    if (Math.max(-Math.max(c, l, h), Math.min(c, l, h)) > a)
      return !1;
  }
  return !0;
}
const Md = /* @__PURE__ */ new Ln(), zs = /* @__PURE__ */ new M(), po = /* @__PURE__ */ new M();
class Bn {
  constructor(e = new M(), t = -1) {
    this.isSphere = !0, this.center = e, this.radius = t;
  }
  set(e, t) {
    return this.center.copy(e), this.radius = t, this;
  }
  setFromPoints(e, t) {
    const n = this.center;
    t !== void 0 ? n.copy(t) : Md.setFromPoints(e).getCenter(n);
    let s = 0;
    for (let r = 0, o = e.length; r < o; r++)
      s = Math.max(s, n.distanceToSquared(e[r]));
    return this.radius = Math.sqrt(s), this;
  }
  copy(e) {
    return this.center.copy(e.center), this.radius = e.radius, this;
  }
  isEmpty() {
    return this.radius < 0;
  }
  makeEmpty() {
    return this.center.set(0, 0, 0), this.radius = -1, this;
  }
  containsPoint(e) {
    return e.distanceToSquared(this.center) <= this.radius * this.radius;
  }
  distanceToPoint(e) {
    return e.distanceTo(this.center) - this.radius;
  }
  intersectsSphere(e) {
    const t = this.radius + e.radius;
    return e.center.distanceToSquared(this.center) <= t * t;
  }
  intersectsBox(e) {
    return e.intersectsSphere(this);
  }
  intersectsPlane(e) {
    return Math.abs(e.distanceToPoint(this.center)) <= this.radius;
  }
  clampPoint(e, t) {
    const n = this.center.distanceToSquared(e);
    return t.copy(e), n > this.radius * this.radius && (t.sub(this.center).normalize(), t.multiplyScalar(this.radius).add(this.center)), t;
  }
  getBoundingBox(e) {
    return this.isEmpty() ? (e.makeEmpty(), e) : (e.set(this.center, this.center), e.expandByScalar(this.radius), e);
  }
  applyMatrix4(e) {
    return this.center.applyMatrix4(e), this.radius = this.radius * e.getMaxScaleOnAxis(), this;
  }
  translate(e) {
    return this.center.add(e), this;
  }
  expandByPoint(e) {
    if (this.isEmpty())
      return this.center.copy(e), this.radius = 0, this;
    zs.subVectors(e, this.center);
    const t = zs.lengthSq();
    if (t > this.radius * this.radius) {
      const n = Math.sqrt(t), s = (n - this.radius) * 0.5;
      this.center.addScaledVector(zs, s / n), this.radius += s;
    }
    return this;
  }
  union(e) {
    return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (po.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(zs.copy(e.center).add(po)), this.expandByPoint(zs.copy(e.center).sub(po))), this);
  }
  equals(e) {
    return e.center.equals(this.center) && e.radius === this.radius;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
const Wn = /* @__PURE__ */ new M(), mo = /* @__PURE__ */ new M(), pr = /* @__PURE__ */ new M(), ai = /* @__PURE__ */ new M(), go = /* @__PURE__ */ new M(), mr = /* @__PURE__ */ new M(), _o = /* @__PURE__ */ new M();
class cr {
  constructor(e = new M(), t = new M(0, 0, -1)) {
    this.origin = e, this.direction = t;
  }
  set(e, t) {
    return this.origin.copy(e), this.direction.copy(t), this;
  }
  copy(e) {
    return this.origin.copy(e.origin), this.direction.copy(e.direction), this;
  }
  at(e, t) {
    return t.copy(this.origin).addScaledVector(this.direction, e);
  }
  lookAt(e) {
    return this.direction.copy(e).sub(this.origin).normalize(), this;
  }
  recast(e) {
    return this.origin.copy(this.at(e, Wn)), this;
  }
  closestPointToPoint(e, t) {
    t.subVectors(e, this.origin);
    const n = t.dot(this.direction);
    return n < 0 ? t.copy(this.origin) : t.copy(this.origin).addScaledVector(this.direction, n);
  }
  distanceToPoint(e) {
    return Math.sqrt(this.distanceSqToPoint(e));
  }
  distanceSqToPoint(e) {
    const t = Wn.subVectors(e, this.origin).dot(this.direction);
    return t < 0 ? this.origin.distanceToSquared(e) : (Wn.copy(this.origin).addScaledVector(this.direction, t), Wn.distanceToSquared(e));
  }
  distanceSqToSegment(e, t, n, s) {
    mo.copy(e).add(t).multiplyScalar(0.5), pr.copy(t).sub(e).normalize(), ai.copy(this.origin).sub(mo);
    const r = e.distanceTo(t) * 0.5, o = -this.direction.dot(pr), a = ai.dot(this.direction), c = -ai.dot(pr), l = ai.lengthSq(), h = Math.abs(1 - o * o);
    let u, d, f, g;
    if (h > 0)
      if (u = o * c - a, d = o * a - c, g = r * h, u >= 0)
        if (d >= -g)
          if (d <= g) {
            const _ = 1 / h;
            u *= _, d *= _, f = u * (u + o * d + 2 * a) + d * (o * u + d + 2 * c) + l;
          } else
            d = r, u = Math.max(0, -(o * d + a)), f = -u * u + d * (d + 2 * c) + l;
        else
          d = -r, u = Math.max(0, -(o * d + a)), f = -u * u + d * (d + 2 * c) + l;
      else
        d <= -g ? (u = Math.max(0, -(-o * r + a)), d = u > 0 ? -r : Math.min(Math.max(-r, -c), r), f = -u * u + d * (d + 2 * c) + l) : d <= g ? (u = 0, d = Math.min(Math.max(-r, -c), r), f = d * (d + 2 * c) + l) : (u = Math.max(0, -(o * r + a)), d = u > 0 ? r : Math.min(Math.max(-r, -c), r), f = -u * u + d * (d + 2 * c) + l);
    else
      d = o > 0 ? -r : r, u = Math.max(0, -(o * d + a)), f = -u * u + d * (d + 2 * c) + l;
    return n && n.copy(this.origin).addScaledVector(this.direction, u), s && s.copy(mo).addScaledVector(pr, d), f;
  }
  intersectSphere(e, t) {
    Wn.subVectors(e.center, this.origin);
    const n = Wn.dot(this.direction), s = Wn.dot(Wn) - n * n, r = e.radius * e.radius;
    if (s > r) return null;
    const o = Math.sqrt(r - s), a = n - o, c = n + o;
    return c < 0 ? null : a < 0 ? this.at(c, t) : this.at(a, t);
  }
  intersectsSphere(e) {
    return this.distanceSqToPoint(e.center) <= e.radius * e.radius;
  }
  distanceToPlane(e) {
    const t = e.normal.dot(this.direction);
    if (t === 0)
      return e.distanceToPoint(this.origin) === 0 ? 0 : null;
    const n = -(this.origin.dot(e.normal) + e.constant) / t;
    return n >= 0 ? n : null;
  }
  intersectPlane(e, t) {
    const n = this.distanceToPlane(e);
    return n === null ? null : this.at(n, t);
  }
  intersectsPlane(e) {
    const t = e.distanceToPoint(this.origin);
    return t === 0 || e.normal.dot(this.direction) * t < 0;
  }
  intersectBox(e, t) {
    let n, s, r, o, a, c;
    const l = 1 / this.direction.x, h = 1 / this.direction.y, u = 1 / this.direction.z, d = this.origin;
    return l >= 0 ? (n = (e.min.x - d.x) * l, s = (e.max.x - d.x) * l) : (n = (e.max.x - d.x) * l, s = (e.min.x - d.x) * l), h >= 0 ? (r = (e.min.y - d.y) * h, o = (e.max.y - d.y) * h) : (r = (e.max.y - d.y) * h, o = (e.min.y - d.y) * h), n > o || r > s || ((r > n || isNaN(n)) && (n = r), (o < s || isNaN(s)) && (s = o), u >= 0 ? (a = (e.min.z - d.z) * u, c = (e.max.z - d.z) * u) : (a = (e.max.z - d.z) * u, c = (e.min.z - d.z) * u), n > c || a > s) || ((a > n || n !== n) && (n = a), (c < s || s !== s) && (s = c), s < 0) ? null : this.at(n >= 0 ? n : s, t);
  }
  intersectsBox(e) {
    return this.intersectBox(e, Wn) !== null;
  }
  intersectTriangle(e, t, n, s, r) {
    go.subVectors(t, e), mr.subVectors(n, e), _o.crossVectors(go, mr);
    let o = this.direction.dot(_o), a;
    if (o > 0) {
      if (s) return null;
      a = 1;
    } else if (o < 0)
      a = -1, o = -o;
    else
      return null;
    ai.subVectors(this.origin, e);
    const c = a * this.direction.dot(mr.crossVectors(ai, mr));
    if (c < 0)
      return null;
    const l = a * this.direction.dot(go.cross(ai));
    if (l < 0 || c + l > o)
      return null;
    const h = -a * ai.dot(_o);
    return h < 0 ? null : this.at(h / o, r);
  }
  applyMatrix4(e) {
    return this.origin.applyMatrix4(e), this.direction.transformDirection(e), this;
  }
  equals(e) {
    return e.origin.equals(this.origin) && e.direction.equals(this.direction);
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
class Ge {
  constructor(e, t, n, s, r, o, a, c, l, h, u, d, f, g, _, m) {
    Ge.prototype.isMatrix4 = !0, this.elements = [
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ], e !== void 0 && this.set(e, t, n, s, r, o, a, c, l, h, u, d, f, g, _, m);
  }
  set(e, t, n, s, r, o, a, c, l, h, u, d, f, g, _, m) {
    const p = this.elements;
    return p[0] = e, p[4] = t, p[8] = n, p[12] = s, p[1] = r, p[5] = o, p[9] = a, p[13] = c, p[2] = l, p[6] = h, p[10] = u, p[14] = d, p[3] = f, p[7] = g, p[11] = _, p[15] = m, this;
  }
  identity() {
    return this.set(
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  clone() {
    return new Ge().fromArray(this.elements);
  }
  copy(e) {
    const t = this.elements, n = e.elements;
    return t[0] = n[0], t[1] = n[1], t[2] = n[2], t[3] = n[3], t[4] = n[4], t[5] = n[5], t[6] = n[6], t[7] = n[7], t[8] = n[8], t[9] = n[9], t[10] = n[10], t[11] = n[11], t[12] = n[12], t[13] = n[13], t[14] = n[14], t[15] = n[15], this;
  }
  copyPosition(e) {
    const t = this.elements, n = e.elements;
    return t[12] = n[12], t[13] = n[13], t[14] = n[14], this;
  }
  setFromMatrix3(e) {
    const t = e.elements;
    return this.set(
      t[0],
      t[3],
      t[6],
      0,
      t[1],
      t[4],
      t[7],
      0,
      t[2],
      t[5],
      t[8],
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  extractBasis(e, t, n) {
    return e.setFromMatrixColumn(this, 0), t.setFromMatrixColumn(this, 1), n.setFromMatrixColumn(this, 2), this;
  }
  makeBasis(e, t, n) {
    return this.set(
      e.x,
      t.x,
      n.x,
      0,
      e.y,
      t.y,
      n.y,
      0,
      e.z,
      t.z,
      n.z,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  extractRotation(e) {
    const t = this.elements, n = e.elements, s = 1 / Wi.setFromMatrixColumn(e, 0).length(), r = 1 / Wi.setFromMatrixColumn(e, 1).length(), o = 1 / Wi.setFromMatrixColumn(e, 2).length();
    return t[0] = n[0] * s, t[1] = n[1] * s, t[2] = n[2] * s, t[3] = 0, t[4] = n[4] * r, t[5] = n[5] * r, t[6] = n[6] * r, t[7] = 0, t[8] = n[8] * o, t[9] = n[9] * o, t[10] = n[10] * o, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
  }
  makeRotationFromEuler(e) {
    const t = this.elements, n = e.x, s = e.y, r = e.z, o = Math.cos(n), a = Math.sin(n), c = Math.cos(s), l = Math.sin(s), h = Math.cos(r), u = Math.sin(r);
    if (e.order === "XYZ") {
      const d = o * h, f = o * u, g = a * h, _ = a * u;
      t[0] = c * h, t[4] = -c * u, t[8] = l, t[1] = f + g * l, t[5] = d - _ * l, t[9] = -a * c, t[2] = _ - d * l, t[6] = g + f * l, t[10] = o * c;
    } else if (e.order === "YXZ") {
      const d = c * h, f = c * u, g = l * h, _ = l * u;
      t[0] = d + _ * a, t[4] = g * a - f, t[8] = o * l, t[1] = o * u, t[5] = o * h, t[9] = -a, t[2] = f * a - g, t[6] = _ + d * a, t[10] = o * c;
    } else if (e.order === "ZXY") {
      const d = c * h, f = c * u, g = l * h, _ = l * u;
      t[0] = d - _ * a, t[4] = -o * u, t[8] = g + f * a, t[1] = f + g * a, t[5] = o * h, t[9] = _ - d * a, t[2] = -o * l, t[6] = a, t[10] = o * c;
    } else if (e.order === "ZYX") {
      const d = o * h, f = o * u, g = a * h, _ = a * u;
      t[0] = c * h, t[4] = g * l - f, t[8] = d * l + _, t[1] = c * u, t[5] = _ * l + d, t[9] = f * l - g, t[2] = -l, t[6] = a * c, t[10] = o * c;
    } else if (e.order === "YZX") {
      const d = o * c, f = o * l, g = a * c, _ = a * l;
      t[0] = c * h, t[4] = _ - d * u, t[8] = g * u + f, t[1] = u, t[5] = o * h, t[9] = -a * h, t[2] = -l * h, t[6] = f * u + g, t[10] = d - _ * u;
    } else if (e.order === "XZY") {
      const d = o * c, f = o * l, g = a * c, _ = a * l;
      t[0] = c * h, t[4] = -u, t[8] = l * h, t[1] = d * u + _, t[5] = o * h, t[9] = f * u - g, t[2] = g * u - f, t[6] = a * h, t[10] = _ * u + d;
    }
    return t[3] = 0, t[7] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, this;
  }
  makeRotationFromQuaternion(e) {
    return this.compose(Td, e, Ad);
  }
  lookAt(e, t, n) {
    const s = this.elements;
    return dn.subVectors(e, t), dn.lengthSq() === 0 && (dn.z = 1), dn.normalize(), ci.crossVectors(n, dn), ci.lengthSq() === 0 && (Math.abs(n.z) === 1 ? dn.x += 1e-4 : dn.z += 1e-4, dn.normalize(), ci.crossVectors(n, dn)), ci.normalize(), gr.crossVectors(dn, ci), s[0] = ci.x, s[4] = gr.x, s[8] = dn.x, s[1] = ci.y, s[5] = gr.y, s[9] = dn.y, s[2] = ci.z, s[6] = gr.z, s[10] = dn.z, this;
  }
  multiply(e) {
    return this.multiplyMatrices(this, e);
  }
  premultiply(e) {
    return this.multiplyMatrices(e, this);
  }
  multiplyMatrices(e, t) {
    const n = e.elements, s = t.elements, r = this.elements, o = n[0], a = n[4], c = n[8], l = n[12], h = n[1], u = n[5], d = n[9], f = n[13], g = n[2], _ = n[6], m = n[10], p = n[14], x = n[3], y = n[7], v = n[11], P = n[15], A = s[0], C = s[4], I = s[8], w = s[12], S = s[1], D = s[5], W = s[9], H = s[13], Y = s[2], J = s[6], K = s[10], re = s[14], q = s[3], pe = s[7], le = s[11], me = s[15];
    return r[0] = o * A + a * S + c * Y + l * q, r[4] = o * C + a * D + c * J + l * pe, r[8] = o * I + a * W + c * K + l * le, r[12] = o * w + a * H + c * re + l * me, r[1] = h * A + u * S + d * Y + f * q, r[5] = h * C + u * D + d * J + f * pe, r[9] = h * I + u * W + d * K + f * le, r[13] = h * w + u * H + d * re + f * me, r[2] = g * A + _ * S + m * Y + p * q, r[6] = g * C + _ * D + m * J + p * pe, r[10] = g * I + _ * W + m * K + p * le, r[14] = g * w + _ * H + m * re + p * me, r[3] = x * A + y * S + v * Y + P * q, r[7] = x * C + y * D + v * J + P * pe, r[11] = x * I + y * W + v * K + P * le, r[15] = x * w + y * H + v * re + P * me, this;
  }
  multiplyScalar(e) {
    const t = this.elements;
    return t[0] *= e, t[4] *= e, t[8] *= e, t[12] *= e, t[1] *= e, t[5] *= e, t[9] *= e, t[13] *= e, t[2] *= e, t[6] *= e, t[10] *= e, t[14] *= e, t[3] *= e, t[7] *= e, t[11] *= e, t[15] *= e, this;
  }
  determinant() {
    const e = this.elements, t = e[0], n = e[4], s = e[8], r = e[12], o = e[1], a = e[5], c = e[9], l = e[13], h = e[2], u = e[6], d = e[10], f = e[14], g = e[3], _ = e[7], m = e[11], p = e[15];
    return g * (+r * c * u - s * l * u - r * a * d + n * l * d + s * a * f - n * c * f) + _ * (+t * c * f - t * l * d + r * o * d - s * o * f + s * l * h - r * c * h) + m * (+t * l * u - t * a * f - r * o * u + n * o * f + r * a * h - n * l * h) + p * (-s * a * h - t * c * u + t * a * d + s * o * u - n * o * d + n * c * h);
  }
  transpose() {
    const e = this.elements;
    let t;
    return t = e[1], e[1] = e[4], e[4] = t, t = e[2], e[2] = e[8], e[8] = t, t = e[6], e[6] = e[9], e[9] = t, t = e[3], e[3] = e[12], e[12] = t, t = e[7], e[7] = e[13], e[13] = t, t = e[11], e[11] = e[14], e[14] = t, this;
  }
  setPosition(e, t, n) {
    const s = this.elements;
    return e.isVector3 ? (s[12] = e.x, s[13] = e.y, s[14] = e.z) : (s[12] = e, s[13] = t, s[14] = n), this;
  }
  invert() {
    const e = this.elements, t = e[0], n = e[1], s = e[2], r = e[3], o = e[4], a = e[5], c = e[6], l = e[7], h = e[8], u = e[9], d = e[10], f = e[11], g = e[12], _ = e[13], m = e[14], p = e[15], x = u * m * l - _ * d * l + _ * c * f - a * m * f - u * c * p + a * d * p, y = g * d * l - h * m * l - g * c * f + o * m * f + h * c * p - o * d * p, v = h * _ * l - g * u * l + g * a * f - o * _ * f - h * a * p + o * u * p, P = g * u * c - h * _ * c - g * a * d + o * _ * d + h * a * m - o * u * m, A = t * x + n * y + s * v + r * P;
    if (A === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const C = 1 / A;
    return e[0] = x * C, e[1] = (_ * d * r - u * m * r - _ * s * f + n * m * f + u * s * p - n * d * p) * C, e[2] = (a * m * r - _ * c * r + _ * s * l - n * m * l - a * s * p + n * c * p) * C, e[3] = (u * c * r - a * d * r - u * s * l + n * d * l + a * s * f - n * c * f) * C, e[4] = y * C, e[5] = (h * m * r - g * d * r + g * s * f - t * m * f - h * s * p + t * d * p) * C, e[6] = (g * c * r - o * m * r - g * s * l + t * m * l + o * s * p - t * c * p) * C, e[7] = (o * d * r - h * c * r + h * s * l - t * d * l - o * s * f + t * c * f) * C, e[8] = v * C, e[9] = (g * u * r - h * _ * r - g * n * f + t * _ * f + h * n * p - t * u * p) * C, e[10] = (o * _ * r - g * a * r + g * n * l - t * _ * l - o * n * p + t * a * p) * C, e[11] = (h * a * r - o * u * r - h * n * l + t * u * l + o * n * f - t * a * f) * C, e[12] = P * C, e[13] = (h * _ * s - g * u * s + g * n * d - t * _ * d - h * n * m + t * u * m) * C, e[14] = (g * a * s - o * _ * s - g * n * c + t * _ * c + o * n * m - t * a * m) * C, e[15] = (o * u * s - h * a * s + h * n * c - t * u * c - o * n * d + t * a * d) * C, this;
  }
  scale(e) {
    const t = this.elements, n = e.x, s = e.y, r = e.z;
    return t[0] *= n, t[4] *= s, t[8] *= r, t[1] *= n, t[5] *= s, t[9] *= r, t[2] *= n, t[6] *= s, t[10] *= r, t[3] *= n, t[7] *= s, t[11] *= r, this;
  }
  getMaxScaleOnAxis() {
    const e = this.elements, t = e[0] * e[0] + e[1] * e[1] + e[2] * e[2], n = e[4] * e[4] + e[5] * e[5] + e[6] * e[6], s = e[8] * e[8] + e[9] * e[9] + e[10] * e[10];
    return Math.sqrt(Math.max(t, n, s));
  }
  makeTranslation(e, t, n) {
    return e.isVector3 ? this.set(
      1,
      0,
      0,
      e.x,
      0,
      1,
      0,
      e.y,
      0,
      0,
      1,
      e.z,
      0,
      0,
      0,
      1
    ) : this.set(
      1,
      0,
      0,
      e,
      0,
      1,
      0,
      t,
      0,
      0,
      1,
      n,
      0,
      0,
      0,
      1
    ), this;
  }
  makeRotationX(e) {
    const t = Math.cos(e), n = Math.sin(e);
    return this.set(
      1,
      0,
      0,
      0,
      0,
      t,
      -n,
      0,
      0,
      n,
      t,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  makeRotationY(e) {
    const t = Math.cos(e), n = Math.sin(e);
    return this.set(
      t,
      0,
      n,
      0,
      0,
      1,
      0,
      0,
      -n,
      0,
      t,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  makeRotationZ(e) {
    const t = Math.cos(e), n = Math.sin(e);
    return this.set(
      t,
      -n,
      0,
      0,
      n,
      t,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  makeRotationAxis(e, t) {
    const n = Math.cos(t), s = Math.sin(t), r = 1 - n, o = e.x, a = e.y, c = e.z, l = r * o, h = r * a;
    return this.set(
      l * o + n,
      l * a - s * c,
      l * c + s * a,
      0,
      l * a + s * c,
      h * a + n,
      h * c - s * o,
      0,
      l * c - s * a,
      h * c + s * o,
      r * c * c + n,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  makeScale(e, t, n) {
    return this.set(
      e,
      0,
      0,
      0,
      0,
      t,
      0,
      0,
      0,
      0,
      n,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  makeShear(e, t, n, s, r, o) {
    return this.set(
      1,
      n,
      r,
      0,
      e,
      1,
      o,
      0,
      t,
      s,
      1,
      0,
      0,
      0,
      0,
      1
    ), this;
  }
  compose(e, t, n) {
    const s = this.elements, r = t._x, o = t._y, a = t._z, c = t._w, l = r + r, h = o + o, u = a + a, d = r * l, f = r * h, g = r * u, _ = o * h, m = o * u, p = a * u, x = c * l, y = c * h, v = c * u, P = n.x, A = n.y, C = n.z;
    return s[0] = (1 - (_ + p)) * P, s[1] = (f + v) * P, s[2] = (g - y) * P, s[3] = 0, s[4] = (f - v) * A, s[5] = (1 - (d + p)) * A, s[6] = (m + x) * A, s[7] = 0, s[8] = (g + y) * C, s[9] = (m - x) * C, s[10] = (1 - (d + _)) * C, s[11] = 0, s[12] = e.x, s[13] = e.y, s[14] = e.z, s[15] = 1, this;
  }
  decompose(e, t, n) {
    const s = this.elements;
    let r = Wi.set(s[0], s[1], s[2]).length();
    const o = Wi.set(s[4], s[5], s[6]).length(), a = Wi.set(s[8], s[9], s[10]).length();
    this.determinant() < 0 && (r = -r), e.x = s[12], e.y = s[13], e.z = s[14], wn.copy(this);
    const l = 1 / r, h = 1 / o, u = 1 / a;
    return wn.elements[0] *= l, wn.elements[1] *= l, wn.elements[2] *= l, wn.elements[4] *= h, wn.elements[5] *= h, wn.elements[6] *= h, wn.elements[8] *= u, wn.elements[9] *= u, wn.elements[10] *= u, t.setFromRotationMatrix(wn), n.x = r, n.y = o, n.z = a, this;
  }
  makePerspective(e, t, n, s, r, o, a = Qn) {
    const c = this.elements, l = 2 * r / (t - e), h = 2 * r / (n - s), u = (t + e) / (t - e), d = (n + s) / (n - s);
    let f, g;
    if (a === Qn)
      f = -(o + r) / (o - r), g = -2 * o * r / (o - r);
    else if (a === eo)
      f = -o / (o - r), g = -o * r / (o - r);
    else
      throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + a);
    return c[0] = l, c[4] = 0, c[8] = u, c[12] = 0, c[1] = 0, c[5] = h, c[9] = d, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = f, c[14] = g, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
  }
  makeOrthographic(e, t, n, s, r, o, a = Qn) {
    const c = this.elements, l = 1 / (t - e), h = 1 / (n - s), u = 1 / (o - r), d = (t + e) * l, f = (n + s) * h;
    let g, _;
    if (a === Qn)
      g = (o + r) * u, _ = -2 * u;
    else if (a === eo)
      g = r * u, _ = -1 * u;
    else
      throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: " + a);
    return c[0] = 2 * l, c[4] = 0, c[8] = 0, c[12] = -d, c[1] = 0, c[5] = 2 * h, c[9] = 0, c[13] = -f, c[2] = 0, c[6] = 0, c[10] = _, c[14] = -g, c[3] = 0, c[7] = 0, c[11] = 0, c[15] = 1, this;
  }
  equals(e) {
    const t = this.elements, n = e.elements;
    for (let s = 0; s < 16; s++)
      if (t[s] !== n[s]) return !1;
    return !0;
  }
  fromArray(e, t = 0) {
    for (let n = 0; n < 16; n++)
      this.elements[n] = e[n + t];
    return this;
  }
  toArray(e = [], t = 0) {
    const n = this.elements;
    return e[t] = n[0], e[t + 1] = n[1], e[t + 2] = n[2], e[t + 3] = n[3], e[t + 4] = n[4], e[t + 5] = n[5], e[t + 6] = n[6], e[t + 7] = n[7], e[t + 8] = n[8], e[t + 9] = n[9], e[t + 10] = n[10], e[t + 11] = n[11], e[t + 12] = n[12], e[t + 13] = n[13], e[t + 14] = n[14], e[t + 15] = n[15], e;
  }
}
const Wi = /* @__PURE__ */ new M(), wn = /* @__PURE__ */ new Ge(), Td = /* @__PURE__ */ new M(0, 0, 0), Ad = /* @__PURE__ */ new M(1, 1, 1), ci = /* @__PURE__ */ new M(), gr = /* @__PURE__ */ new M(), dn = /* @__PURE__ */ new M(), Dc = /* @__PURE__ */ new Ge(), Nc = /* @__PURE__ */ new mn();
class On {
  constructor(e = 0, t = 0, n = 0, s = On.DEFAULT_ORDER) {
    this.isEuler = !0, this._x = e, this._y = t, this._z = n, this._order = s;
  }
  get x() {
    return this._x;
  }
  set x(e) {
    this._x = e, this._onChangeCallback();
  }
  get y() {
    return this._y;
  }
  set y(e) {
    this._y = e, this._onChangeCallback();
  }
  get z() {
    return this._z;
  }
  set z(e) {
    this._z = e, this._onChangeCallback();
  }
  get order() {
    return this._order;
  }
  set order(e) {
    this._order = e, this._onChangeCallback();
  }
  set(e, t, n, s = this._order) {
    return this._x = e, this._y = t, this._z = n, this._order = s, this._onChangeCallback(), this;
  }
  clone() {
    return new this.constructor(this._x, this._y, this._z, this._order);
  }
  copy(e) {
    return this._x = e._x, this._y = e._y, this._z = e._z, this._order = e._order, this._onChangeCallback(), this;
  }
  setFromRotationMatrix(e, t = this._order, n = !0) {
    const s = e.elements, r = s[0], o = s[4], a = s[8], c = s[1], l = s[5], h = s[9], u = s[2], d = s[6], f = s[10];
    switch (t) {
      case "XYZ":
        this._y = Math.asin(qe(a, -1, 1)), Math.abs(a) < 0.9999999 ? (this._x = Math.atan2(-h, f), this._z = Math.atan2(-o, r)) : (this._x = Math.atan2(d, l), this._z = 0);
        break;
      case "YXZ":
        this._x = Math.asin(-qe(h, -1, 1)), Math.abs(h) < 0.9999999 ? (this._y = Math.atan2(a, f), this._z = Math.atan2(c, l)) : (this._y = Math.atan2(-u, r), this._z = 0);
        break;
      case "ZXY":
        this._x = Math.asin(qe(d, -1, 1)), Math.abs(d) < 0.9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-o, l)) : (this._y = 0, this._z = Math.atan2(c, r));
        break;
      case "ZYX":
        this._y = Math.asin(-qe(u, -1, 1)), Math.abs(u) < 0.9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(c, r)) : (this._x = 0, this._z = Math.atan2(-o, l));
        break;
      case "YZX":
        this._z = Math.asin(qe(c, -1, 1)), Math.abs(c) < 0.9999999 ? (this._x = Math.atan2(-h, l), this._y = Math.atan2(-u, r)) : (this._x = 0, this._y = Math.atan2(a, f));
        break;
      case "XZY":
        this._z = Math.asin(-qe(o, -1, 1)), Math.abs(o) < 0.9999999 ? (this._x = Math.atan2(d, l), this._y = Math.atan2(a, r)) : (this._x = Math.atan2(-h, f), this._y = 0);
        break;
      default:
        console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
    }
    return this._order = t, n === !0 && this._onChangeCallback(), this;
  }
  setFromQuaternion(e, t, n) {
    return Dc.makeRotationFromQuaternion(e), this.setFromRotationMatrix(Dc, t, n);
  }
  setFromVector3(e, t = this._order) {
    return this.set(e.x, e.y, e.z, t);
  }
  reorder(e) {
    return Nc.setFromEuler(this), this.setFromQuaternion(Nc, e);
  }
  equals(e) {
    return e._x === this._x && e._y === this._y && e._z === this._z && e._order === this._order;
  }
  fromArray(e) {
    return this._x = e[0], this._y = e[1], this._z = e[2], e[3] !== void 0 && (this._order = e[3]), this._onChangeCallback(), this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this._x, e[t + 1] = this._y, e[t + 2] = this._z, e[t + 3] = this._order, e;
  }
  _onChange(e) {
    return this._onChangeCallback = e, this;
  }
  _onChangeCallback() {
  }
  *[Symbol.iterator]() {
    yield this._x, yield this._y, yield this._z, yield this._order;
  }
}
On.DEFAULT_ORDER = "XYZ";
class Mh {
  constructor() {
    this.mask = 1;
  }
  set(e) {
    this.mask = (1 << e | 0) >>> 0;
  }
  enable(e) {
    this.mask |= 1 << e | 0;
  }
  enableAll() {
    this.mask = -1;
  }
  toggle(e) {
    this.mask ^= 1 << e | 0;
  }
  disable(e) {
    this.mask &= ~(1 << e | 0);
  }
  disableAll() {
    this.mask = 0;
  }
  test(e) {
    return (this.mask & e.mask) !== 0;
  }
  isEnabled(e) {
    return (this.mask & (1 << e | 0)) !== 0;
  }
}
let Rd = 0;
const Uc = /* @__PURE__ */ new M(), Xi = /* @__PURE__ */ new mn(), Xn = /* @__PURE__ */ new Ge(), _r = /* @__PURE__ */ new M(), Hs = /* @__PURE__ */ new M(), Cd = /* @__PURE__ */ new M(), Pd = /* @__PURE__ */ new mn(), Fc = /* @__PURE__ */ new M(1, 0, 0), Oc = /* @__PURE__ */ new M(0, 1, 0), Bc = /* @__PURE__ */ new M(0, 0, 1), kc = { type: "added" }, Id = { type: "removed" }, qi = { type: "childadded", child: null }, vo = { type: "childremoved", child: null };
class wt extends yi {
  constructor() {
    super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Rd++ }), this.uuid = Pn(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = wt.DEFAULT_UP.clone();
    const e = new M(), t = new On(), n = new mn(), s = new M(1, 1, 1);
    function r() {
      n.setFromEuler(t, !1);
    }
    function o() {
      t.setFromQuaternion(n, void 0, !1);
    }
    t._onChange(r), n._onChange(o), Object.defineProperties(this, {
      position: {
        configurable: !0,
        enumerable: !0,
        value: e
      },
      rotation: {
        configurable: !0,
        enumerable: !0,
        value: t
      },
      quaternion: {
        configurable: !0,
        enumerable: !0,
        value: n
      },
      scale: {
        configurable: !0,
        enumerable: !0,
        value: s
      },
      modelViewMatrix: {
        value: new Ge()
      },
      normalMatrix: {
        value: new Ke()
      }
    }), this.matrix = new Ge(), this.matrixWorld = new Ge(), this.matrixAutoUpdate = wt.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Mh(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.userData = {};
  }
  onBeforeShadow() {
  }
  onAfterShadow() {
  }
  onBeforeRender() {
  }
  onAfterRender() {
  }
  applyMatrix4(e) {
    this.matrixAutoUpdate && this.updateMatrix(), this.matrix.premultiply(e), this.matrix.decompose(this.position, this.quaternion, this.scale);
  }
  applyQuaternion(e) {
    return this.quaternion.premultiply(e), this;
  }
  setRotationFromAxisAngle(e, t) {
    this.quaternion.setFromAxisAngle(e, t);
  }
  setRotationFromEuler(e) {
    this.quaternion.setFromEuler(e, !0);
  }
  setRotationFromMatrix(e) {
    this.quaternion.setFromRotationMatrix(e);
  }
  setRotationFromQuaternion(e) {
    this.quaternion.copy(e);
  }
  rotateOnAxis(e, t) {
    return Xi.setFromAxisAngle(e, t), this.quaternion.multiply(Xi), this;
  }
  rotateOnWorldAxis(e, t) {
    return Xi.setFromAxisAngle(e, t), this.quaternion.premultiply(Xi), this;
  }
  rotateX(e) {
    return this.rotateOnAxis(Fc, e);
  }
  rotateY(e) {
    return this.rotateOnAxis(Oc, e);
  }
  rotateZ(e) {
    return this.rotateOnAxis(Bc, e);
  }
  translateOnAxis(e, t) {
    return Uc.copy(e).applyQuaternion(this.quaternion), this.position.add(Uc.multiplyScalar(t)), this;
  }
  translateX(e) {
    return this.translateOnAxis(Fc, e);
  }
  translateY(e) {
    return this.translateOnAxis(Oc, e);
  }
  translateZ(e) {
    return this.translateOnAxis(Bc, e);
  }
  localToWorld(e) {
    return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
  }
  worldToLocal(e) {
    return this.updateWorldMatrix(!0, !1), e.applyMatrix4(Xn.copy(this.matrixWorld).invert());
  }
  lookAt(e, t, n) {
    e.isVector3 ? _r.copy(e) : _r.set(e, t, n);
    const s = this.parent;
    this.updateWorldMatrix(!0, !1), Hs.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? Xn.lookAt(Hs, _r, this.up) : Xn.lookAt(_r, Hs, this.up), this.quaternion.setFromRotationMatrix(Xn), s && (Xn.extractRotation(s.matrixWorld), Xi.setFromRotationMatrix(Xn), this.quaternion.premultiply(Xi.invert()));
  }
  add(e) {
    if (arguments.length > 1) {
      for (let t = 0; t < arguments.length; t++)
        this.add(arguments[t]);
      return this;
    }
    return e === this ? (console.error("THREE.Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(kc), qi.child = e, this.dispatchEvent(qi), qi.child = null) : console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", e), this);
  }
  remove(e) {
    if (arguments.length > 1) {
      for (let n = 0; n < arguments.length; n++)
        this.remove(arguments[n]);
      return this;
    }
    const t = this.children.indexOf(e);
    return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(Id), vo.child = e, this.dispatchEvent(vo), vo.child = null), this;
  }
  removeFromParent() {
    const e = this.parent;
    return e !== null && e.remove(this), this;
  }
  clear() {
    return this.remove(...this.children);
  }
  attach(e) {
    return this.updateWorldMatrix(!0, !1), Xn.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), Xn.multiply(e.parent.matrixWorld)), e.applyMatrix4(Xn), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(kc), qi.child = e, this.dispatchEvent(qi), qi.child = null, this;
  }
  getObjectById(e) {
    return this.getObjectByProperty("id", e);
  }
  getObjectByName(e) {
    return this.getObjectByProperty("name", e);
  }
  getObjectByProperty(e, t) {
    if (this[e] === t) return this;
    for (let n = 0, s = this.children.length; n < s; n++) {
      const o = this.children[n].getObjectByProperty(e, t);
      if (o !== void 0)
        return o;
    }
  }
  getObjectsByProperty(e, t, n = []) {
    this[e] === t && n.push(this);
    const s = this.children;
    for (let r = 0, o = s.length; r < o; r++)
      s[r].getObjectsByProperty(e, t, n);
    return n;
  }
  getWorldPosition(e) {
    return this.updateWorldMatrix(!0, !1), e.setFromMatrixPosition(this.matrixWorld);
  }
  getWorldQuaternion(e) {
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Hs, e, Cd), e;
  }
  getWorldScale(e) {
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Hs, Pd, e), e;
  }
  getWorldDirection(e) {
    this.updateWorldMatrix(!0, !1);
    const t = this.matrixWorld.elements;
    return e.set(t[8], t[9], t[10]).normalize();
  }
  raycast() {
  }
  traverse(e) {
    e(this);
    const t = this.children;
    for (let n = 0, s = t.length; n < s; n++)
      t[n].traverse(e);
  }
  traverseVisible(e) {
    if (this.visible === !1) return;
    e(this);
    const t = this.children;
    for (let n = 0, s = t.length; n < s; n++)
      t[n].traverseVisible(e);
  }
  traverseAncestors(e) {
    const t = this.parent;
    t !== null && (e(t), t.traverseAncestors(e));
  }
  updateMatrix() {
    this.matrix.compose(this.position, this.quaternion, this.scale), this.matrixWorldNeedsUpdate = !0;
  }
  updateMatrixWorld(e) {
    this.matrixAutoUpdate && this.updateMatrix(), (this.matrixWorldNeedsUpdate || e) && (this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), this.matrixWorldNeedsUpdate = !1, e = !0);
    const t = this.children;
    for (let n = 0, s = t.length; n < s; n++)
      t[n].updateMatrixWorld(e);
  }
  updateWorldMatrix(e, t) {
    const n = this.parent;
    if (e === !0 && n !== null && n.updateWorldMatrix(!0, !1), this.matrixAutoUpdate && this.updateMatrix(), this.matrixWorldAutoUpdate === !0 && (this.parent === null ? this.matrixWorld.copy(this.matrix) : this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix)), t === !0) {
      const s = this.children;
      for (let r = 0, o = s.length; r < o; r++)
        s[r].updateWorldMatrix(!1, !0);
    }
  }
  toJSON(e) {
    const t = e === void 0 || typeof e == "string", n = {};
    t && (e = {
      geometries: {},
      materials: {},
      textures: {},
      images: {},
      shapes: {},
      skeletons: {},
      animations: {},
      nodes: {}
    }, n.metadata = {
      version: 4.6,
      type: "Object",
      generator: "Object3D.toJSON"
    });
    const s = {};
    s.uuid = this.uuid, s.type = this.type, this.name !== "" && (s.name = this.name), this.castShadow === !0 && (s.castShadow = !0), this.receiveShadow === !0 && (s.receiveShadow = !0), this.visible === !1 && (s.visible = !1), this.frustumCulled === !1 && (s.frustumCulled = !1), this.renderOrder !== 0 && (s.renderOrder = this.renderOrder), Object.keys(this.userData).length > 0 && (s.userData = this.userData), s.layers = this.layers.mask, s.matrix = this.matrix.toArray(), s.up = this.up.toArray(), this.matrixAutoUpdate === !1 && (s.matrixAutoUpdate = !1), this.isInstancedMesh && (s.type = "InstancedMesh", s.count = this.count, s.instanceMatrix = this.instanceMatrix.toJSON(), this.instanceColor !== null && (s.instanceColor = this.instanceColor.toJSON())), this.isBatchedMesh && (s.type = "BatchedMesh", s.perObjectFrustumCulled = this.perObjectFrustumCulled, s.sortObjects = this.sortObjects, s.drawRanges = this._drawRanges, s.reservedRanges = this._reservedRanges, s.visibility = this._visibility, s.active = this._active, s.bounds = this._bounds.map((a) => ({
      boxInitialized: a.boxInitialized,
      boxMin: a.box.min.toArray(),
      boxMax: a.box.max.toArray(),
      sphereInitialized: a.sphereInitialized,
      sphereRadius: a.sphere.radius,
      sphereCenter: a.sphere.center.toArray()
    })), s.maxInstanceCount = this._maxInstanceCount, s.maxVertexCount = this._maxVertexCount, s.maxIndexCount = this._maxIndexCount, s.geometryInitialized = this._geometryInitialized, s.geometryCount = this._geometryCount, s.matricesTexture = this._matricesTexture.toJSON(e), this._colorsTexture !== null && (s.colorsTexture = this._colorsTexture.toJSON(e)), this.boundingSphere !== null && (s.boundingSphere = {
      center: s.boundingSphere.center.toArray(),
      radius: s.boundingSphere.radius
    }), this.boundingBox !== null && (s.boundingBox = {
      min: s.boundingBox.min.toArray(),
      max: s.boundingBox.max.toArray()
    }));
    function r(a, c) {
      return a[c.uuid] === void 0 && (a[c.uuid] = c.toJSON(e)), c.uuid;
    }
    if (this.isScene)
      this.background && (this.background.isColor ? s.background = this.background.toJSON() : this.background.isTexture && (s.background = this.background.toJSON(e).uuid)), this.environment && this.environment.isTexture && this.environment.isRenderTargetTexture !== !0 && (s.environment = this.environment.toJSON(e).uuid);
    else if (this.isMesh || this.isLine || this.isPoints) {
      s.geometry = r(e.geometries, this.geometry);
      const a = this.geometry.parameters;
      if (a !== void 0 && a.shapes !== void 0) {
        const c = a.shapes;
        if (Array.isArray(c))
          for (let l = 0, h = c.length; l < h; l++) {
            const u = c[l];
            r(e.shapes, u);
          }
        else
          r(e.shapes, c);
      }
    }
    if (this.isSkinnedMesh && (s.bindMode = this.bindMode, s.bindMatrix = this.bindMatrix.toArray(), this.skeleton !== void 0 && (r(e.skeletons, this.skeleton), s.skeleton = this.skeleton.uuid)), this.material !== void 0)
      if (Array.isArray(this.material)) {
        const a = [];
        for (let c = 0, l = this.material.length; c < l; c++)
          a.push(r(e.materials, this.material[c]));
        s.material = a;
      } else
        s.material = r(e.materials, this.material);
    if (this.children.length > 0) {
      s.children = [];
      for (let a = 0; a < this.children.length; a++)
        s.children.push(this.children[a].toJSON(e).object);
    }
    if (this.animations.length > 0) {
      s.animations = [];
      for (let a = 0; a < this.animations.length; a++) {
        const c = this.animations[a];
        s.animations.push(r(e.animations, c));
      }
    }
    if (t) {
      const a = o(e.geometries), c = o(e.materials), l = o(e.textures), h = o(e.images), u = o(e.shapes), d = o(e.skeletons), f = o(e.animations), g = o(e.nodes);
      a.length > 0 && (n.geometries = a), c.length > 0 && (n.materials = c), l.length > 0 && (n.textures = l), h.length > 0 && (n.images = h), u.length > 0 && (n.shapes = u), d.length > 0 && (n.skeletons = d), f.length > 0 && (n.animations = f), g.length > 0 && (n.nodes = g);
    }
    return n.object = s, n;
    function o(a) {
      const c = [];
      for (const l in a) {
        const h = a[l];
        delete h.metadata, c.push(h);
      }
      return c;
    }
  }
  clone(e) {
    return new this.constructor().copy(this, e);
  }
  copy(e, t = !0) {
    if (this.name = e.name, this.up.copy(e.up), this.position.copy(e.position), this.rotation.order = e.rotation.order, this.quaternion.copy(e.quaternion), this.scale.copy(e.scale), this.matrix.copy(e.matrix), this.matrixWorld.copy(e.matrixWorld), this.matrixAutoUpdate = e.matrixAutoUpdate, this.matrixWorldAutoUpdate = e.matrixWorldAutoUpdate, this.matrixWorldNeedsUpdate = e.matrixWorldNeedsUpdate, this.layers.mask = e.layers.mask, this.visible = e.visible, this.castShadow = e.castShadow, this.receiveShadow = e.receiveShadow, this.frustumCulled = e.frustumCulled, this.renderOrder = e.renderOrder, this.animations = e.animations.slice(), this.userData = JSON.parse(JSON.stringify(e.userData)), t === !0)
      for (let n = 0; n < e.children.length; n++) {
        const s = e.children[n];
        this.add(s.clone());
      }
    return this;
  }
}
wt.DEFAULT_UP = /* @__PURE__ */ new M(0, 1, 0);
wt.DEFAULT_MATRIX_AUTO_UPDATE = !0;
wt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
const En = /* @__PURE__ */ new M(), qn = /* @__PURE__ */ new M(), xo = /* @__PURE__ */ new M(), Yn = /* @__PURE__ */ new M(), Yi = /* @__PURE__ */ new M(), Ki = /* @__PURE__ */ new M(), zc = /* @__PURE__ */ new M(), yo = /* @__PURE__ */ new M(), So = /* @__PURE__ */ new M(), bo = /* @__PURE__ */ new M(), wo = /* @__PURE__ */ new dt(), Eo = /* @__PURE__ */ new dt(), Mo = /* @__PURE__ */ new dt();
class Rn {
  constructor(e = new M(), t = new M(), n = new M()) {
    this.a = e, this.b = t, this.c = n;
  }
  static getNormal(e, t, n, s) {
    s.subVectors(n, t), En.subVectors(e, t), s.cross(En);
    const r = s.lengthSq();
    return r > 0 ? s.multiplyScalar(1 / Math.sqrt(r)) : s.set(0, 0, 0);
  }
  // static/instance method to calculate barycentric coordinates
  // based on: http://www.blackpawn.com/texts/pointinpoly/default.html
  static getBarycoord(e, t, n, s, r) {
    En.subVectors(s, t), qn.subVectors(n, t), xo.subVectors(e, t);
    const o = En.dot(En), a = En.dot(qn), c = En.dot(xo), l = qn.dot(qn), h = qn.dot(xo), u = o * l - a * a;
    if (u === 0)
      return r.set(0, 0, 0), null;
    const d = 1 / u, f = (l * c - a * h) * d, g = (o * h - a * c) * d;
    return r.set(1 - f - g, g, f);
  }
  static containsPoint(e, t, n, s) {
    return this.getBarycoord(e, t, n, s, Yn) === null ? !1 : Yn.x >= 0 && Yn.y >= 0 && Yn.x + Yn.y <= 1;
  }
  static getInterpolation(e, t, n, s, r, o, a, c) {
    return this.getBarycoord(e, t, n, s, Yn) === null ? (c.x = 0, c.y = 0, "z" in c && (c.z = 0), "w" in c && (c.w = 0), null) : (c.setScalar(0), c.addScaledVector(r, Yn.x), c.addScaledVector(o, Yn.y), c.addScaledVector(a, Yn.z), c);
  }
  static getInterpolatedAttribute(e, t, n, s, r, o) {
    return wo.setScalar(0), Eo.setScalar(0), Mo.setScalar(0), wo.fromBufferAttribute(e, t), Eo.fromBufferAttribute(e, n), Mo.fromBufferAttribute(e, s), o.setScalar(0), o.addScaledVector(wo, r.x), o.addScaledVector(Eo, r.y), o.addScaledVector(Mo, r.z), o;
  }
  static isFrontFacing(e, t, n, s) {
    return En.subVectors(n, t), qn.subVectors(e, t), En.cross(qn).dot(s) < 0;
  }
  set(e, t, n) {
    return this.a.copy(e), this.b.copy(t), this.c.copy(n), this;
  }
  setFromPointsAndIndices(e, t, n, s) {
    return this.a.copy(e[t]), this.b.copy(e[n]), this.c.copy(e[s]), this;
  }
  setFromAttributeAndIndices(e, t, n, s) {
    return this.a.fromBufferAttribute(e, t), this.b.fromBufferAttribute(e, n), this.c.fromBufferAttribute(e, s), this;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    return this.a.copy(e.a), this.b.copy(e.b), this.c.copy(e.c), this;
  }
  getArea() {
    return En.subVectors(this.c, this.b), qn.subVectors(this.a, this.b), En.cross(qn).length() * 0.5;
  }
  getMidpoint(e) {
    return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
  }
  getNormal(e) {
    return Rn.getNormal(this.a, this.b, this.c, e);
  }
  getPlane(e) {
    return e.setFromCoplanarPoints(this.a, this.b, this.c);
  }
  getBarycoord(e, t) {
    return Rn.getBarycoord(e, this.a, this.b, this.c, t);
  }
  getInterpolation(e, t, n, s, r) {
    return Rn.getInterpolation(e, this.a, this.b, this.c, t, n, s, r);
  }
  containsPoint(e) {
    return Rn.containsPoint(e, this.a, this.b, this.c);
  }
  isFrontFacing(e) {
    return Rn.isFrontFacing(this.a, this.b, this.c, e);
  }
  intersectsBox(e) {
    return e.intersectsTriangle(this);
  }
  closestPointToPoint(e, t) {
    const n = this.a, s = this.b, r = this.c;
    let o, a;
    Yi.subVectors(s, n), Ki.subVectors(r, n), yo.subVectors(e, n);
    const c = Yi.dot(yo), l = Ki.dot(yo);
    if (c <= 0 && l <= 0)
      return t.copy(n);
    So.subVectors(e, s);
    const h = Yi.dot(So), u = Ki.dot(So);
    if (h >= 0 && u <= h)
      return t.copy(s);
    const d = c * u - h * l;
    if (d <= 0 && c >= 0 && h <= 0)
      return o = c / (c - h), t.copy(n).addScaledVector(Yi, o);
    bo.subVectors(e, r);
    const f = Yi.dot(bo), g = Ki.dot(bo);
    if (g >= 0 && f <= g)
      return t.copy(r);
    const _ = f * l - c * g;
    if (_ <= 0 && l >= 0 && g <= 0)
      return a = l / (l - g), t.copy(n).addScaledVector(Ki, a);
    const m = h * g - f * u;
    if (m <= 0 && u - h >= 0 && f - g >= 0)
      return zc.subVectors(r, s), a = (u - h) / (u - h + (f - g)), t.copy(s).addScaledVector(zc, a);
    const p = 1 / (m + _ + d);
    return o = _ * p, a = d * p, t.copy(n).addScaledVector(Yi, o).addScaledVector(Ki, a);
  }
  equals(e) {
    return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
  }
}
const Th = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
}, li = { h: 0, s: 0, l: 0 }, vr = { h: 0, s: 0, l: 0 };
function To(i, e, t) {
  return t < 0 && (t += 1), t > 1 && (t -= 1), t < 1 / 6 ? i + (e - i) * 6 * t : t < 1 / 2 ? e : t < 2 / 3 ? i + (e - i) * 6 * (2 / 3 - t) : i;
}
class Ie {
  constructor(e, t, n) {
    return this.isColor = !0, this.r = 1, this.g = 1, this.b = 1, this.set(e, t, n);
  }
  set(e, t, n) {
    if (t === void 0 && n === void 0) {
      const s = e;
      s && s.isColor ? this.copy(s) : typeof s == "number" ? this.setHex(s) : typeof s == "string" && this.setStyle(s);
    } else
      this.setRGB(e, t, n);
    return this;
  }
  setScalar(e) {
    return this.r = e, this.g = e, this.b = e, this;
  }
  setHex(e, t = Nt) {
    return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, rt.toWorkingColorSpace(this, t), this;
  }
  setRGB(e, t, n, s = rt.workingColorSpace) {
    return this.r = e, this.g = t, this.b = n, rt.toWorkingColorSpace(this, s), this;
  }
  setHSL(e, t, n, s = rt.workingColorSpace) {
    if (e = nc(e, 1), t = qe(t, 0, 1), n = qe(n, 0, 1), t === 0)
      this.r = this.g = this.b = n;
    else {
      const r = n <= 0.5 ? n * (1 + t) : n + t - n * t, o = 2 * n - r;
      this.r = To(o, r, e + 1 / 3), this.g = To(o, r, e), this.b = To(o, r, e - 1 / 3);
    }
    return rt.toWorkingColorSpace(this, s), this;
  }
  setStyle(e, t = Nt) {
    function n(r) {
      r !== void 0 && parseFloat(r) < 1 && console.warn("THREE.Color: Alpha component of " + e + " will be ignored.");
    }
    let s;
    if (s = /^(\w+)\(([^\)]*)\)/.exec(e)) {
      let r;
      const o = s[1], a = s[2];
      switch (o) {
        case "rgb":
        case "rgba":
          if (r = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))
            return n(r[4]), this.setRGB(
              Math.min(255, parseInt(r[1], 10)) / 255,
              Math.min(255, parseInt(r[2], 10)) / 255,
              Math.min(255, parseInt(r[3], 10)) / 255,
              t
            );
          if (r = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))
            return n(r[4]), this.setRGB(
              Math.min(100, parseInt(r[1], 10)) / 100,
              Math.min(100, parseInt(r[2], 10)) / 100,
              Math.min(100, parseInt(r[3], 10)) / 100,
              t
            );
          break;
        case "hsl":
        case "hsla":
          if (r = /^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))
            return n(r[4]), this.setHSL(
              parseFloat(r[1]) / 360,
              parseFloat(r[2]) / 100,
              parseFloat(r[3]) / 100,
              t
            );
          break;
        default:
          console.warn("THREE.Color: Unknown color model " + e);
      }
    } else if (s = /^\#([A-Fa-f\d]+)$/.exec(e)) {
      const r = s[1], o = r.length;
      if (o === 3)
        return this.setRGB(
          parseInt(r.charAt(0), 16) / 15,
          parseInt(r.charAt(1), 16) / 15,
          parseInt(r.charAt(2), 16) / 15,
          t
        );
      if (o === 6)
        return this.setHex(parseInt(r, 16), t);
      console.warn("THREE.Color: Invalid hex color " + e);
    } else if (e && e.length > 0)
      return this.setColorName(e, t);
    return this;
  }
  setColorName(e, t = Nt) {
    const n = Th[e.toLowerCase()];
    return n !== void 0 ? this.setHex(n, t) : console.warn("THREE.Color: Unknown color " + e), this;
  }
  clone() {
    return new this.constructor(this.r, this.g, this.b);
  }
  copy(e) {
    return this.r = e.r, this.g = e.g, this.b = e.b, this;
  }
  copySRGBToLinear(e) {
    return this.r = ei(e.r), this.g = ei(e.g), this.b = ei(e.b), this;
  }
  copyLinearToSRGB(e) {
    return this.r = fs(e.r), this.g = fs(e.g), this.b = fs(e.b), this;
  }
  convertSRGBToLinear() {
    return this.copySRGBToLinear(this), this;
  }
  convertLinearToSRGB() {
    return this.copyLinearToSRGB(this), this;
  }
  getHex(e = Nt) {
    return rt.fromWorkingColorSpace(qt.copy(this), e), Math.round(qe(qt.r * 255, 0, 255)) * 65536 + Math.round(qe(qt.g * 255, 0, 255)) * 256 + Math.round(qe(qt.b * 255, 0, 255));
  }
  getHexString(e = Nt) {
    return ("000000" + this.getHex(e).toString(16)).slice(-6);
  }
  getHSL(e, t = rt.workingColorSpace) {
    rt.fromWorkingColorSpace(qt.copy(this), t);
    const n = qt.r, s = qt.g, r = qt.b, o = Math.max(n, s, r), a = Math.min(n, s, r);
    let c, l;
    const h = (a + o) / 2;
    if (a === o)
      c = 0, l = 0;
    else {
      const u = o - a;
      switch (l = h <= 0.5 ? u / (o + a) : u / (2 - o - a), o) {
        case n:
          c = (s - r) / u + (s < r ? 6 : 0);
          break;
        case s:
          c = (r - n) / u + 2;
          break;
        case r:
          c = (n - s) / u + 4;
          break;
      }
      c /= 6;
    }
    return e.h = c, e.s = l, e.l = h, e;
  }
  getRGB(e, t = rt.workingColorSpace) {
    return rt.fromWorkingColorSpace(qt.copy(this), t), e.r = qt.r, e.g = qt.g, e.b = qt.b, e;
  }
  getStyle(e = Nt) {
    rt.fromWorkingColorSpace(qt.copy(this), e);
    const t = qt.r, n = qt.g, s = qt.b;
    return e !== Nt ? `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})` : `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(s * 255)})`;
  }
  offsetHSL(e, t, n) {
    return this.getHSL(li), this.setHSL(li.h + e, li.s + t, li.l + n);
  }
  add(e) {
    return this.r += e.r, this.g += e.g, this.b += e.b, this;
  }
  addColors(e, t) {
    return this.r = e.r + t.r, this.g = e.g + t.g, this.b = e.b + t.b, this;
  }
  addScalar(e) {
    return this.r += e, this.g += e, this.b += e, this;
  }
  sub(e) {
    return this.r = Math.max(0, this.r - e.r), this.g = Math.max(0, this.g - e.g), this.b = Math.max(0, this.b - e.b), this;
  }
  multiply(e) {
    return this.r *= e.r, this.g *= e.g, this.b *= e.b, this;
  }
  multiplyScalar(e) {
    return this.r *= e, this.g *= e, this.b *= e, this;
  }
  lerp(e, t) {
    return this.r += (e.r - this.r) * t, this.g += (e.g - this.g) * t, this.b += (e.b - this.b) * t, this;
  }
  lerpColors(e, t, n) {
    return this.r = e.r + (t.r - e.r) * n, this.g = e.g + (t.g - e.g) * n, this.b = e.b + (t.b - e.b) * n, this;
  }
  lerpHSL(e, t) {
    this.getHSL(li), e.getHSL(vr);
    const n = Qs(li.h, vr.h, t), s = Qs(li.s, vr.s, t), r = Qs(li.l, vr.l, t);
    return this.setHSL(n, s, r), this;
  }
  setFromVector3(e) {
    return this.r = e.x, this.g = e.y, this.b = e.z, this;
  }
  applyMatrix3(e) {
    const t = this.r, n = this.g, s = this.b, r = e.elements;
    return this.r = r[0] * t + r[3] * n + r[6] * s, this.g = r[1] * t + r[4] * n + r[7] * s, this.b = r[2] * t + r[5] * n + r[8] * s, this;
  }
  equals(e) {
    return e.r === this.r && e.g === this.g && e.b === this.b;
  }
  fromArray(e, t = 0) {
    return this.r = e[t], this.g = e[t + 1], this.b = e[t + 2], this;
  }
  toArray(e = [], t = 0) {
    return e[t] = this.r, e[t + 1] = this.g, e[t + 2] = this.b, e;
  }
  fromBufferAttribute(e, t) {
    return this.r = e.getX(t), this.g = e.getY(t), this.b = e.getZ(t), this;
  }
  toJSON() {
    return this.getHex();
  }
  *[Symbol.iterator]() {
    yield this.r, yield this.g, yield this.b;
  }
}
const qt = /* @__PURE__ */ new Ie();
Ie.NAMES = Th;
let Ld = 0;
class Fn extends yi {
  constructor() {
    super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: Ld++ }), this.uuid = Pn(), this.name = "", this.type = "Material", this.blending = us, this.side = ti, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = Qo, this.blendDst = ea, this.blendEquation = Li, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new Ie(0, 0, 0), this.blendAlpha = 0, this.depthFunc = ms, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = Tc, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = ki, this.stencilZFail = ki, this.stencilZPass = ki, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
  }
  get alphaTest() {
    return this._alphaTest;
  }
  set alphaTest(e) {
    this._alphaTest > 0 != e > 0 && this.version++, this._alphaTest = e;
  }
  // onBeforeRender and onBeforeCompile only supported in WebGLRenderer
  onBeforeRender() {
  }
  onBeforeCompile() {
  }
  customProgramCacheKey() {
    return this.onBeforeCompile.toString();
  }
  setValues(e) {
    if (e !== void 0)
      for (const t in e) {
        const n = e[t];
        if (n === void 0) {
          console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);
          continue;
        }
        const s = this[t];
        if (s === void 0) {
          console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);
          continue;
        }
        s && s.isColor ? s.set(n) : s && s.isVector3 && n && n.isVector3 ? s.copy(n) : this[t] = n;
      }
  }
  toJSON(e) {
    const t = e === void 0 || typeof e == "string";
    t && (e = {
      textures: {},
      images: {}
    });
    const n = {
      metadata: {
        version: 4.6,
        type: "Material",
        generator: "Material.toJSON"
      }
    };
    n.uuid = this.uuid, n.type = this.type, this.name !== "" && (n.name = this.name), this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && this.emissiveIntensity !== 1 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessRange !== void 0 && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && this.attenuationDistance !== 1 / 0 && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.shadowSide !== null && (n.shadowSide = this.shadowSide), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), this.blending !== us && (n.blending = this.blending), this.side !== ti && (n.side = this.side), this.vertexColors === !0 && (n.vertexColors = !0), this.opacity < 1 && (n.opacity = this.opacity), this.transparent === !0 && (n.transparent = !0), this.blendSrc !== Qo && (n.blendSrc = this.blendSrc), this.blendDst !== ea && (n.blendDst = this.blendDst), this.blendEquation !== Li && (n.blendEquation = this.blendEquation), this.blendSrcAlpha !== null && (n.blendSrcAlpha = this.blendSrcAlpha), this.blendDstAlpha !== null && (n.blendDstAlpha = this.blendDstAlpha), this.blendEquationAlpha !== null && (n.blendEquationAlpha = this.blendEquationAlpha), this.blendColor && this.blendColor.isColor && (n.blendColor = this.blendColor.getHex()), this.blendAlpha !== 0 && (n.blendAlpha = this.blendAlpha), this.depthFunc !== ms && (n.depthFunc = this.depthFunc), this.depthTest === !1 && (n.depthTest = this.depthTest), this.depthWrite === !1 && (n.depthWrite = this.depthWrite), this.colorWrite === !1 && (n.colorWrite = this.colorWrite), this.stencilWriteMask !== 255 && (n.stencilWriteMask = this.stencilWriteMask), this.stencilFunc !== Tc && (n.stencilFunc = this.stencilFunc), this.stencilRef !== 0 && (n.stencilRef = this.stencilRef), this.stencilFuncMask !== 255 && (n.stencilFuncMask = this.stencilFuncMask), this.stencilFail !== ki && (n.stencilFail = this.stencilFail), this.stencilZFail !== ki && (n.stencilZFail = this.stencilZFail), this.stencilZPass !== ki && (n.stencilZPass = this.stencilZPass), this.stencilWrite === !0 && (n.stencilWrite = this.stencilWrite), this.rotation !== void 0 && this.rotation !== 0 && (n.rotation = this.rotation), this.polygonOffset === !0 && (n.polygonOffset = !0), this.polygonOffsetFactor !== 0 && (n.polygonOffsetFactor = this.polygonOffsetFactor), this.polygonOffsetUnits !== 0 && (n.polygonOffsetUnits = this.polygonOffsetUnits), this.linewidth !== void 0 && this.linewidth !== 1 && (n.linewidth = this.linewidth), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.dithering === !0 && (n.dithering = !0), this.alphaTest > 0 && (n.alphaTest = this.alphaTest), this.alphaHash === !0 && (n.alphaHash = !0), this.alphaToCoverage === !0 && (n.alphaToCoverage = !0), this.premultipliedAlpha === !0 && (n.premultipliedAlpha = !0), this.forceSinglePass === !0 && (n.forceSinglePass = !0), this.wireframe === !0 && (n.wireframe = !0), this.wireframeLinewidth > 1 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== "round" && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== "round" && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading === !0 && (n.flatShading = !0), this.visible === !1 && (n.visible = !1), this.toneMapped === !1 && (n.toneMapped = !1), this.fog === !1 && (n.fog = !1), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
    function s(r) {
      const o = [];
      for (const a in r) {
        const c = r[a];
        delete c.metadata, o.push(c);
      }
      return o;
    }
    if (t) {
      const r = s(e.textures), o = s(e.images);
      r.length > 0 && (n.textures = r), o.length > 0 && (n.images = o);
    }
    return n;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    this.name = e.name, this.blending = e.blending, this.side = e.side, this.vertexColors = e.vertexColors, this.opacity = e.opacity, this.transparent = e.transparent, this.blendSrc = e.blendSrc, this.blendDst = e.blendDst, this.blendEquation = e.blendEquation, this.blendSrcAlpha = e.blendSrcAlpha, this.blendDstAlpha = e.blendDstAlpha, this.blendEquationAlpha = e.blendEquationAlpha, this.blendColor.copy(e.blendColor), this.blendAlpha = e.blendAlpha, this.depthFunc = e.depthFunc, this.depthTest = e.depthTest, this.depthWrite = e.depthWrite, this.stencilWriteMask = e.stencilWriteMask, this.stencilFunc = e.stencilFunc, this.stencilRef = e.stencilRef, this.stencilFuncMask = e.stencilFuncMask, this.stencilFail = e.stencilFail, this.stencilZFail = e.stencilZFail, this.stencilZPass = e.stencilZPass, this.stencilWrite = e.stencilWrite;
    const t = e.clippingPlanes;
    let n = null;
    if (t !== null) {
      const s = t.length;
      n = new Array(s);
      for (let r = 0; r !== s; ++r)
        n[r] = t[r].clone();
    }
    return this.clippingPlanes = n, this.clipIntersection = e.clipIntersection, this.clipShadows = e.clipShadows, this.shadowSide = e.shadowSide, this.colorWrite = e.colorWrite, this.precision = e.precision, this.polygonOffset = e.polygonOffset, this.polygonOffsetFactor = e.polygonOffsetFactor, this.polygonOffsetUnits = e.polygonOffsetUnits, this.dithering = e.dithering, this.alphaTest = e.alphaTest, this.alphaHash = e.alphaHash, this.alphaToCoverage = e.alphaToCoverage, this.premultipliedAlpha = e.premultipliedAlpha, this.forceSinglePass = e.forceSinglePass, this.visible = e.visible, this.toneMapped = e.toneMapped, this.userData = JSON.parse(JSON.stringify(e.userData)), this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
  set needsUpdate(e) {
    e === !0 && this.version++;
  }
  onBuild() {
    console.warn("Material: onBuild() has been removed.");
  }
}
class gi extends Fn {
  constructor(e) {
    super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new Ie(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new On(), this.combine = oh, this.reflectivity = 1, this.refractionRatio = 0.98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
  }
}
const Pt = /* @__PURE__ */ new M(), xr = /* @__PURE__ */ new ue();
class Vt {
  constructor(e, t, n = !1) {
    if (Array.isArray(e))
      throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
    this.isBufferAttribute = !0, this.name = "", this.array = e, this.itemSize = t, this.count = e !== void 0 ? e.length / t : 0, this.normalized = n, this.usage = ka, this.updateRanges = [], this.gpuType = Cn, this.version = 0;
  }
  onUploadCallback() {
  }
  set needsUpdate(e) {
    e === !0 && this.version++;
  }
  setUsage(e) {
    return this.usage = e, this;
  }
  addUpdateRange(e, t) {
    this.updateRanges.push({ start: e, count: t });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  copy(e) {
    return this.name = e.name, this.array = new e.array.constructor(e.array), this.itemSize = e.itemSize, this.count = e.count, this.normalized = e.normalized, this.usage = e.usage, this.gpuType = e.gpuType, this;
  }
  copyAt(e, t, n) {
    e *= this.itemSize, n *= t.itemSize;
    for (let s = 0, r = this.itemSize; s < r; s++)
      this.array[e + s] = t.array[n + s];
    return this;
  }
  copyArray(e) {
    return this.array.set(e), this;
  }
  applyMatrix3(e) {
    if (this.itemSize === 2)
      for (let t = 0, n = this.count; t < n; t++)
        xr.fromBufferAttribute(this, t), xr.applyMatrix3(e), this.setXY(t, xr.x, xr.y);
    else if (this.itemSize === 3)
      for (let t = 0, n = this.count; t < n; t++)
        Pt.fromBufferAttribute(this, t), Pt.applyMatrix3(e), this.setXYZ(t, Pt.x, Pt.y, Pt.z);
    return this;
  }
  applyMatrix4(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Pt.fromBufferAttribute(this, t), Pt.applyMatrix4(e), this.setXYZ(t, Pt.x, Pt.y, Pt.z);
    return this;
  }
  applyNormalMatrix(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Pt.fromBufferAttribute(this, t), Pt.applyNormalMatrix(e), this.setXYZ(t, Pt.x, Pt.y, Pt.z);
    return this;
  }
  transformDirection(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Pt.fromBufferAttribute(this, t), Pt.transformDirection(e), this.setXYZ(t, Pt.x, Pt.y, Pt.z);
    return this;
  }
  set(e, t = 0) {
    return this.array.set(e, t), this;
  }
  getComponent(e, t) {
    let n = this.array[e * this.itemSize + t];
    return this.normalized && (n = An(n, this.array)), n;
  }
  setComponent(e, t, n) {
    return this.normalized && (n = gt(n, this.array)), this.array[e * this.itemSize + t] = n, this;
  }
  getX(e) {
    let t = this.array[e * this.itemSize];
    return this.normalized && (t = An(t, this.array)), t;
  }
  setX(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.array[e * this.itemSize] = t, this;
  }
  getY(e) {
    let t = this.array[e * this.itemSize + 1];
    return this.normalized && (t = An(t, this.array)), t;
  }
  setY(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.array[e * this.itemSize + 1] = t, this;
  }
  getZ(e) {
    let t = this.array[e * this.itemSize + 2];
    return this.normalized && (t = An(t, this.array)), t;
  }
  setZ(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.array[e * this.itemSize + 2] = t, this;
  }
  getW(e) {
    let t = this.array[e * this.itemSize + 3];
    return this.normalized && (t = An(t, this.array)), t;
  }
  setW(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.array[e * this.itemSize + 3] = t, this;
  }
  setXY(e, t, n) {
    return e *= this.itemSize, this.normalized && (t = gt(t, this.array), n = gt(n, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this;
  }
  setXYZ(e, t, n, s) {
    return e *= this.itemSize, this.normalized && (t = gt(t, this.array), n = gt(n, this.array), s = gt(s, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = s, this;
  }
  setXYZW(e, t, n, s, r) {
    return e *= this.itemSize, this.normalized && (t = gt(t, this.array), n = gt(n, this.array), s = gt(s, this.array), r = gt(r, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = s, this.array[e + 3] = r, this;
  }
  onUpload(e) {
    return this.onUploadCallback = e, this;
  }
  clone() {
    return new this.constructor(this.array, this.itemSize).copy(this);
  }
  toJSON() {
    const e = {
      itemSize: this.itemSize,
      type: this.array.constructor.name,
      array: Array.from(this.array),
      normalized: this.normalized
    };
    return this.name !== "" && (e.name = this.name), this.usage !== ka && (e.usage = this.usage), e;
  }
}
class Ah extends Vt {
  constructor(e, t, n) {
    super(new Uint16Array(e), t, n);
  }
}
class Rh extends Vt {
  constructor(e, t, n) {
    super(new Uint32Array(e), t, n);
  }
}
class at extends Vt {
  constructor(e, t, n) {
    super(new Float32Array(e), t, n);
  }
}
let Dd = 0;
const _n = /* @__PURE__ */ new Ge(), Ao = /* @__PURE__ */ new wt(), ji = /* @__PURE__ */ new M(), fn = /* @__PURE__ */ new Ln(), Vs = /* @__PURE__ */ new Ln(), kt = /* @__PURE__ */ new M();
class Bt extends yi {
  constructor() {
    super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: Dd++ }), this.uuid = Pn(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = { start: 0, count: 1 / 0 }, this.userData = {};
  }
  getIndex() {
    return this.index;
  }
  setIndex(e) {
    return Array.isArray(e) ? this.index = new (bh(e) ? Rh : Ah)(e, 1) : this.index = e, this;
  }
  setIndirect(e) {
    return this.indirect = e, this;
  }
  getIndirect() {
    return this.indirect;
  }
  getAttribute(e) {
    return this.attributes[e];
  }
  setAttribute(e, t) {
    return this.attributes[e] = t, this;
  }
  deleteAttribute(e) {
    return delete this.attributes[e], this;
  }
  hasAttribute(e) {
    return this.attributes[e] !== void 0;
  }
  addGroup(e, t, n = 0) {
    this.groups.push({
      start: e,
      count: t,
      materialIndex: n
    });
  }
  clearGroups() {
    this.groups = [];
  }
  setDrawRange(e, t) {
    this.drawRange.start = e, this.drawRange.count = t;
  }
  applyMatrix4(e) {
    const t = this.attributes.position;
    t !== void 0 && (t.applyMatrix4(e), t.needsUpdate = !0);
    const n = this.attributes.normal;
    if (n !== void 0) {
      const r = new Ke().getNormalMatrix(e);
      n.applyNormalMatrix(r), n.needsUpdate = !0;
    }
    const s = this.attributes.tangent;
    return s !== void 0 && (s.transformDirection(e), s.needsUpdate = !0), this.boundingBox !== null && this.computeBoundingBox(), this.boundingSphere !== null && this.computeBoundingSphere(), this;
  }
  applyQuaternion(e) {
    return _n.makeRotationFromQuaternion(e), this.applyMatrix4(_n), this;
  }
  rotateX(e) {
    return _n.makeRotationX(e), this.applyMatrix4(_n), this;
  }
  rotateY(e) {
    return _n.makeRotationY(e), this.applyMatrix4(_n), this;
  }
  rotateZ(e) {
    return _n.makeRotationZ(e), this.applyMatrix4(_n), this;
  }
  translate(e, t, n) {
    return _n.makeTranslation(e, t, n), this.applyMatrix4(_n), this;
  }
  scale(e, t, n) {
    return _n.makeScale(e, t, n), this.applyMatrix4(_n), this;
  }
  lookAt(e) {
    return Ao.lookAt(e), Ao.updateMatrix(), this.applyMatrix4(Ao.matrix), this;
  }
  center() {
    return this.computeBoundingBox(), this.boundingBox.getCenter(ji).negate(), this.translate(ji.x, ji.y, ji.z), this;
  }
  setFromPoints(e) {
    const t = this.getAttribute("position");
    if (t === void 0) {
      const n = [];
      for (let s = 0, r = e.length; s < r; s++) {
        const o = e[s];
        n.push(o.x, o.y, o.z || 0);
      }
      this.setAttribute("position", new at(n, 3));
    } else {
      const n = Math.min(e.length, t.count);
      for (let s = 0; s < n; s++) {
        const r = e[s];
        t.setXYZ(s, r.x, r.y, r.z || 0);
      }
      e.length > t.count && console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."), t.needsUpdate = !0;
    }
    return this;
  }
  computeBoundingBox() {
    this.boundingBox === null && (this.boundingBox = new Ln());
    const e = this.attributes.position, t = this.morphAttributes.position;
    if (e && e.isGLBufferAttribute) {
      console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.", this), this.boundingBox.set(
        new M(-1 / 0, -1 / 0, -1 / 0),
        new M(1 / 0, 1 / 0, 1 / 0)
      );
      return;
    }
    if (e !== void 0) {
      if (this.boundingBox.setFromBufferAttribute(e), t)
        for (let n = 0, s = t.length; n < s; n++) {
          const r = t[n];
          fn.setFromBufferAttribute(r), this.morphTargetsRelative ? (kt.addVectors(this.boundingBox.min, fn.min), this.boundingBox.expandByPoint(kt), kt.addVectors(this.boundingBox.max, fn.max), this.boundingBox.expandByPoint(kt)) : (this.boundingBox.expandByPoint(fn.min), this.boundingBox.expandByPoint(fn.max));
        }
    } else
      this.boundingBox.makeEmpty();
    (isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.', this);
  }
  computeBoundingSphere() {
    this.boundingSphere === null && (this.boundingSphere = new Bn());
    const e = this.attributes.position, t = this.morphAttributes.position;
    if (e && e.isGLBufferAttribute) {
      console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.", this), this.boundingSphere.set(new M(), 1 / 0);
      return;
    }
    if (e) {
      const n = this.boundingSphere.center;
      if (fn.setFromBufferAttribute(e), t)
        for (let r = 0, o = t.length; r < o; r++) {
          const a = t[r];
          Vs.setFromBufferAttribute(a), this.morphTargetsRelative ? (kt.addVectors(fn.min, Vs.min), fn.expandByPoint(kt), kt.addVectors(fn.max, Vs.max), fn.expandByPoint(kt)) : (fn.expandByPoint(Vs.min), fn.expandByPoint(Vs.max));
        }
      fn.getCenter(n);
      let s = 0;
      for (let r = 0, o = e.count; r < o; r++)
        kt.fromBufferAttribute(e, r), s = Math.max(s, n.distanceToSquared(kt));
      if (t)
        for (let r = 0, o = t.length; r < o; r++) {
          const a = t[r], c = this.morphTargetsRelative;
          for (let l = 0, h = a.count; l < h; l++)
            kt.fromBufferAttribute(a, l), c && (ji.fromBufferAttribute(e, l), kt.add(ji)), s = Math.max(s, n.distanceToSquared(kt));
        }
      this.boundingSphere.radius = Math.sqrt(s), isNaN(this.boundingSphere.radius) && console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.', this);
    }
  }
  computeTangents() {
    const e = this.index, t = this.attributes;
    if (e === null || t.position === void 0 || t.normal === void 0 || t.uv === void 0) {
      console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");
      return;
    }
    const n = t.position, s = t.normal, r = t.uv;
    this.hasAttribute("tangent") === !1 && this.setAttribute("tangent", new Vt(new Float32Array(4 * n.count), 4));
    const o = this.getAttribute("tangent"), a = [], c = [];
    for (let I = 0; I < n.count; I++)
      a[I] = new M(), c[I] = new M();
    const l = new M(), h = new M(), u = new M(), d = new ue(), f = new ue(), g = new ue(), _ = new M(), m = new M();
    function p(I, w, S) {
      l.fromBufferAttribute(n, I), h.fromBufferAttribute(n, w), u.fromBufferAttribute(n, S), d.fromBufferAttribute(r, I), f.fromBufferAttribute(r, w), g.fromBufferAttribute(r, S), h.sub(l), u.sub(l), f.sub(d), g.sub(d);
      const D = 1 / (f.x * g.y - g.x * f.y);
      isFinite(D) && (_.copy(h).multiplyScalar(g.y).addScaledVector(u, -f.y).multiplyScalar(D), m.copy(u).multiplyScalar(f.x).addScaledVector(h, -g.x).multiplyScalar(D), a[I].add(_), a[w].add(_), a[S].add(_), c[I].add(m), c[w].add(m), c[S].add(m));
    }
    let x = this.groups;
    x.length === 0 && (x = [{
      start: 0,
      count: e.count
    }]);
    for (let I = 0, w = x.length; I < w; ++I) {
      const S = x[I], D = S.start, W = S.count;
      for (let H = D, Y = D + W; H < Y; H += 3)
        p(
          e.getX(H + 0),
          e.getX(H + 1),
          e.getX(H + 2)
        );
    }
    const y = new M(), v = new M(), P = new M(), A = new M();
    function C(I) {
      P.fromBufferAttribute(s, I), A.copy(P);
      const w = a[I];
      y.copy(w), y.sub(P.multiplyScalar(P.dot(w))).normalize(), v.crossVectors(A, w);
      const D = v.dot(c[I]) < 0 ? -1 : 1;
      o.setXYZW(I, y.x, y.y, y.z, D);
    }
    for (let I = 0, w = x.length; I < w; ++I) {
      const S = x[I], D = S.start, W = S.count;
      for (let H = D, Y = D + W; H < Y; H += 3)
        C(e.getX(H + 0)), C(e.getX(H + 1)), C(e.getX(H + 2));
    }
  }
  computeVertexNormals() {
    const e = this.index, t = this.getAttribute("position");
    if (t !== void 0) {
      let n = this.getAttribute("normal");
      if (n === void 0)
        n = new Vt(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
      else
        for (let d = 0, f = n.count; d < f; d++)
          n.setXYZ(d, 0, 0, 0);
      const s = new M(), r = new M(), o = new M(), a = new M(), c = new M(), l = new M(), h = new M(), u = new M();
      if (e)
        for (let d = 0, f = e.count; d < f; d += 3) {
          const g = e.getX(d + 0), _ = e.getX(d + 1), m = e.getX(d + 2);
          s.fromBufferAttribute(t, g), r.fromBufferAttribute(t, _), o.fromBufferAttribute(t, m), h.subVectors(o, r), u.subVectors(s, r), h.cross(u), a.fromBufferAttribute(n, g), c.fromBufferAttribute(n, _), l.fromBufferAttribute(n, m), a.add(h), c.add(h), l.add(h), n.setXYZ(g, a.x, a.y, a.z), n.setXYZ(_, c.x, c.y, c.z), n.setXYZ(m, l.x, l.y, l.z);
        }
      else
        for (let d = 0, f = t.count; d < f; d += 3)
          s.fromBufferAttribute(t, d + 0), r.fromBufferAttribute(t, d + 1), o.fromBufferAttribute(t, d + 2), h.subVectors(o, r), u.subVectors(s, r), h.cross(u), n.setXYZ(d + 0, h.x, h.y, h.z), n.setXYZ(d + 1, h.x, h.y, h.z), n.setXYZ(d + 2, h.x, h.y, h.z);
      this.normalizeNormals(), n.needsUpdate = !0;
    }
  }
  normalizeNormals() {
    const e = this.attributes.normal;
    for (let t = 0, n = e.count; t < n; t++)
      kt.fromBufferAttribute(e, t), kt.normalize(), e.setXYZ(t, kt.x, kt.y, kt.z);
  }
  toNonIndexed() {
    function e(a, c) {
      const l = a.array, h = a.itemSize, u = a.normalized, d = new l.constructor(c.length * h);
      let f = 0, g = 0;
      for (let _ = 0, m = c.length; _ < m; _++) {
        a.isInterleavedBufferAttribute ? f = c[_] * a.data.stride + a.offset : f = c[_] * h;
        for (let p = 0; p < h; p++)
          d[g++] = l[f++];
      }
      return new Vt(d, h, u);
    }
    if (this.index === null)
      return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
    const t = new Bt(), n = this.index.array, s = this.attributes;
    for (const a in s) {
      const c = s[a], l = e(c, n);
      t.setAttribute(a, l);
    }
    const r = this.morphAttributes;
    for (const a in r) {
      const c = [], l = r[a];
      for (let h = 0, u = l.length; h < u; h++) {
        const d = l[h], f = e(d, n);
        c.push(f);
      }
      t.morphAttributes[a] = c;
    }
    t.morphTargetsRelative = this.morphTargetsRelative;
    const o = this.groups;
    for (let a = 0, c = o.length; a < c; a++) {
      const l = o[a];
      t.addGroup(l.start, l.count, l.materialIndex);
    }
    return t;
  }
  toJSON() {
    const e = {
      metadata: {
        version: 4.6,
        type: "BufferGeometry",
        generator: "BufferGeometry.toJSON"
      }
    };
    if (e.uuid = this.uuid, e.type = this.type, this.name !== "" && (e.name = this.name), Object.keys(this.userData).length > 0 && (e.userData = this.userData), this.parameters !== void 0) {
      const c = this.parameters;
      for (const l in c)
        c[l] !== void 0 && (e[l] = c[l]);
      return e;
    }
    e.data = { attributes: {} };
    const t = this.index;
    t !== null && (e.data.index = {
      type: t.array.constructor.name,
      array: Array.prototype.slice.call(t.array)
    });
    const n = this.attributes;
    for (const c in n) {
      const l = n[c];
      e.data.attributes[c] = l.toJSON(e.data);
    }
    const s = {};
    let r = !1;
    for (const c in this.morphAttributes) {
      const l = this.morphAttributes[c], h = [];
      for (let u = 0, d = l.length; u < d; u++) {
        const f = l[u];
        h.push(f.toJSON(e.data));
      }
      h.length > 0 && (s[c] = h, r = !0);
    }
    r && (e.data.morphAttributes = s, e.data.morphTargetsRelative = this.morphTargetsRelative);
    const o = this.groups;
    o.length > 0 && (e.data.groups = JSON.parse(JSON.stringify(o)));
    const a = this.boundingSphere;
    return a !== null && (e.data.boundingSphere = {
      center: a.center.toArray(),
      radius: a.radius
    }), e;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    this.index = null, this.attributes = {}, this.morphAttributes = {}, this.groups = [], this.boundingBox = null, this.boundingSphere = null;
    const t = {};
    this.name = e.name;
    const n = e.index;
    n !== null && this.setIndex(n.clone(t));
    const s = e.attributes;
    for (const l in s) {
      const h = s[l];
      this.setAttribute(l, h.clone(t));
    }
    const r = e.morphAttributes;
    for (const l in r) {
      const h = [], u = r[l];
      for (let d = 0, f = u.length; d < f; d++)
        h.push(u[d].clone(t));
      this.morphAttributes[l] = h;
    }
    this.morphTargetsRelative = e.morphTargetsRelative;
    const o = e.groups;
    for (let l = 0, h = o.length; l < h; l++) {
      const u = o[l];
      this.addGroup(u.start, u.count, u.materialIndex);
    }
    const a = e.boundingBox;
    a !== null && (this.boundingBox = a.clone());
    const c = e.boundingSphere;
    return c !== null && (this.boundingSphere = c.clone()), this.drawRange.start = e.drawRange.start, this.drawRange.count = e.drawRange.count, this.userData = e.userData, this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
const Hc = /* @__PURE__ */ new Ge(), Mi = /* @__PURE__ */ new cr(), yr = /* @__PURE__ */ new Bn(), Vc = /* @__PURE__ */ new M(), Sr = /* @__PURE__ */ new M(), br = /* @__PURE__ */ new M(), wr = /* @__PURE__ */ new M(), Ro = /* @__PURE__ */ new M(), Er = /* @__PURE__ */ new M(), Gc = /* @__PURE__ */ new M(), Mr = /* @__PURE__ */ new M();
class oe extends wt {
  constructor(e = new Bt(), t = new gi()) {
    super(), this.isMesh = !0, this.type = "Mesh", this.geometry = e, this.material = t, this.updateMorphTargets();
  }
  copy(e, t) {
    return super.copy(e, t), e.morphTargetInfluences !== void 0 && (this.morphTargetInfluences = e.morphTargetInfluences.slice()), e.morphTargetDictionary !== void 0 && (this.morphTargetDictionary = Object.assign({}, e.morphTargetDictionary)), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
  }
  updateMorphTargets() {
    const t = this.geometry.morphAttributes, n = Object.keys(t);
    if (n.length > 0) {
      const s = t[n[0]];
      if (s !== void 0) {
        this.morphTargetInfluences = [], this.morphTargetDictionary = {};
        for (let r = 0, o = s.length; r < o; r++) {
          const a = s[r].name || String(r);
          this.morphTargetInfluences.push(0), this.morphTargetDictionary[a] = r;
        }
      }
    }
  }
  getVertexPosition(e, t) {
    const n = this.geometry, s = n.attributes.position, r = n.morphAttributes.position, o = n.morphTargetsRelative;
    t.fromBufferAttribute(s, e);
    const a = this.morphTargetInfluences;
    if (r && a) {
      Er.set(0, 0, 0);
      for (let c = 0, l = r.length; c < l; c++) {
        const h = a[c], u = r[c];
        h !== 0 && (Ro.fromBufferAttribute(u, e), o ? Er.addScaledVector(Ro, h) : Er.addScaledVector(Ro.sub(t), h));
      }
      t.add(Er);
    }
    return t;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.material, r = this.matrixWorld;
    s !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), yr.copy(n.boundingSphere), yr.applyMatrix4(r), Mi.copy(e.ray).recast(e.near), !(yr.containsPoint(Mi.origin) === !1 && (Mi.intersectSphere(yr, Vc) === null || Mi.origin.distanceToSquared(Vc) > (e.far - e.near) ** 2)) && (Hc.copy(r).invert(), Mi.copy(e.ray).applyMatrix4(Hc), !(n.boundingBox !== null && Mi.intersectsBox(n.boundingBox) === !1) && this._computeIntersections(e, t, Mi)));
  }
  _computeIntersections(e, t, n) {
    let s;
    const r = this.geometry, o = this.material, a = r.index, c = r.attributes.position, l = r.attributes.uv, h = r.attributes.uv1, u = r.attributes.normal, d = r.groups, f = r.drawRange;
    if (a !== null)
      if (Array.isArray(o))
        for (let g = 0, _ = d.length; g < _; g++) {
          const m = d[g], p = o[m.materialIndex], x = Math.max(m.start, f.start), y = Math.min(a.count, Math.min(m.start + m.count, f.start + f.count));
          for (let v = x, P = y; v < P; v += 3) {
            const A = a.getX(v), C = a.getX(v + 1), I = a.getX(v + 2);
            s = Tr(this, p, e, n, l, h, u, A, C, I), s && (s.faceIndex = Math.floor(v / 3), s.face.materialIndex = m.materialIndex, t.push(s));
          }
        }
      else {
        const g = Math.max(0, f.start), _ = Math.min(a.count, f.start + f.count);
        for (let m = g, p = _; m < p; m += 3) {
          const x = a.getX(m), y = a.getX(m + 1), v = a.getX(m + 2);
          s = Tr(this, o, e, n, l, h, u, x, y, v), s && (s.faceIndex = Math.floor(m / 3), t.push(s));
        }
      }
    else if (c !== void 0)
      if (Array.isArray(o))
        for (let g = 0, _ = d.length; g < _; g++) {
          const m = d[g], p = o[m.materialIndex], x = Math.max(m.start, f.start), y = Math.min(c.count, Math.min(m.start + m.count, f.start + f.count));
          for (let v = x, P = y; v < P; v += 3) {
            const A = v, C = v + 1, I = v + 2;
            s = Tr(this, p, e, n, l, h, u, A, C, I), s && (s.faceIndex = Math.floor(v / 3), s.face.materialIndex = m.materialIndex, t.push(s));
          }
        }
      else {
        const g = Math.max(0, f.start), _ = Math.min(c.count, f.start + f.count);
        for (let m = g, p = _; m < p; m += 3) {
          const x = m, y = m + 1, v = m + 2;
          s = Tr(this, o, e, n, l, h, u, x, y, v), s && (s.faceIndex = Math.floor(m / 3), t.push(s));
        }
      }
  }
}
function Nd(i, e, t, n, s, r, o, a) {
  let c;
  if (e.side === tn ? c = n.intersectTriangle(o, r, s, !0, a) : c = n.intersectTriangle(s, r, o, e.side === ti, a), c === null) return null;
  Mr.copy(a), Mr.applyMatrix4(i.matrixWorld);
  const l = t.ray.origin.distanceTo(Mr);
  return l < t.near || l > t.far ? null : {
    distance: l,
    point: Mr.clone(),
    object: i
  };
}
function Tr(i, e, t, n, s, r, o, a, c, l) {
  i.getVertexPosition(a, Sr), i.getVertexPosition(c, br), i.getVertexPosition(l, wr);
  const h = Nd(i, e, t, n, Sr, br, wr, Gc);
  if (h) {
    const u = new M();
    Rn.getBarycoord(Gc, Sr, br, wr, u), s && (h.uv = Rn.getInterpolatedAttribute(s, a, c, l, u, new ue())), r && (h.uv1 = Rn.getInterpolatedAttribute(r, a, c, l, u, new ue())), o && (h.normal = Rn.getInterpolatedAttribute(o, a, c, l, u, new M()), h.normal.dot(n.direction) > 0 && h.normal.multiplyScalar(-1));
    const d = {
      a,
      b: c,
      c: l,
      normal: new M(),
      materialIndex: 0
    };
    Rn.getNormal(Sr, br, wr, d.normal), h.face = d, h.barycoord = u;
  }
  return h;
}
class mt extends Bt {
  constructor(e = 1, t = 1, n = 1, s = 1, r = 1, o = 1) {
    super(), this.type = "BoxGeometry", this.parameters = {
      width: e,
      height: t,
      depth: n,
      widthSegments: s,
      heightSegments: r,
      depthSegments: o
    };
    const a = this;
    s = Math.floor(s), r = Math.floor(r), o = Math.floor(o);
    const c = [], l = [], h = [], u = [];
    let d = 0, f = 0;
    g("z", "y", "x", -1, -1, n, t, e, o, r, 0), g("z", "y", "x", 1, -1, n, t, -e, o, r, 1), g("x", "z", "y", 1, 1, e, n, t, s, o, 2), g("x", "z", "y", 1, -1, e, n, -t, s, o, 3), g("x", "y", "z", 1, -1, e, t, n, s, r, 4), g("x", "y", "z", -1, -1, e, t, -n, s, r, 5), this.setIndex(c), this.setAttribute("position", new at(l, 3)), this.setAttribute("normal", new at(h, 3)), this.setAttribute("uv", new at(u, 2));
    function g(_, m, p, x, y, v, P, A, C, I, w) {
      const S = v / C, D = P / I, W = v / 2, H = P / 2, Y = A / 2, J = C + 1, K = I + 1;
      let re = 0, q = 0;
      const pe = new M();
      for (let le = 0; le < K; le++) {
        const me = le * D - H;
        for (let Oe = 0; Oe < J; Oe++) {
          const Ye = Oe * S - W;
          pe[_] = Ye * x, pe[m] = me * y, pe[p] = Y, l.push(pe.x, pe.y, pe.z), pe[_] = 0, pe[m] = 0, pe[p] = A > 0 ? 1 : -1, h.push(pe.x, pe.y, pe.z), u.push(Oe / C), u.push(1 - le / I), re += 1;
        }
      }
      for (let le = 0; le < I; le++)
        for (let me = 0; me < C; me++) {
          const Oe = d + me + J * le, Ye = d + me + J * (le + 1), j = d + (me + 1) + J * (le + 1), ie = d + (me + 1) + J * le;
          c.push(Oe, Ye, ie), c.push(Ye, j, ie), q += 6;
        }
      a.addGroup(f, q, w), f += q, d += re;
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new mt(e.width, e.height, e.depth, e.widthSegments, e.heightSegments, e.depthSegments);
  }
}
function Ss(i) {
  const e = {};
  for (const t in i) {
    e[t] = {};
    for (const n in i[t]) {
      const s = i[t][n];
      s && (s.isColor || s.isMatrix3 || s.isMatrix4 || s.isVector2 || s.isVector3 || s.isVector4 || s.isTexture || s.isQuaternion) ? s.isRenderTargetTexture ? (console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."), e[t][n] = null) : e[t][n] = s.clone() : Array.isArray(s) ? e[t][n] = s.slice() : e[t][n] = s;
    }
  }
  return e;
}
function Qt(i) {
  const e = {};
  for (let t = 0; t < i.length; t++) {
    const n = Ss(i[t]);
    for (const s in n)
      e[s] = n[s];
  }
  return e;
}
function Ud(i) {
  const e = [];
  for (let t = 0; t < i.length; t++)
    e.push(i[t].clone());
  return e;
}
function Ch(i) {
  const e = i.getRenderTarget();
  return e === null ? i.outputColorSpace : e.isXRRenderTarget === !0 ? e.texture.colorSpace : rt.workingColorSpace;
}
const Fd = { clone: Ss, merge: Qt };
var Od = `void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`, Bd = `void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;
class ii extends Fn {
  constructor(e) {
    super(), this.isShaderMaterial = !0, this.type = "ShaderMaterial", this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = Od, this.fragmentShader = Bd, this.linewidth = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.fog = !1, this.lights = !1, this.clipping = !1, this.forceSinglePass = !0, this.extensions = {
      clipCullDistance: !1,
      // set to use vertex shader clipping
      multiDraw: !1
      // set to use vertex shader multi_draw / enable gl_DrawID
    }, this.defaultAttributeValues = {
      color: [1, 1, 1],
      uv: [0, 0],
      uv1: [0, 0]
    }, this.index0AttributeName = void 0, this.uniformsNeedUpdate = !1, this.glslVersion = null, e !== void 0 && this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.fragmentShader = e.fragmentShader, this.vertexShader = e.vertexShader, this.uniforms = Ss(e.uniforms), this.uniformsGroups = Ud(e.uniformsGroups), this.defines = Object.assign({}, e.defines), this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.fog = e.fog, this.lights = e.lights, this.clipping = e.clipping, this.extensions = Object.assign({}, e.extensions), this.glslVersion = e.glslVersion, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    t.glslVersion = this.glslVersion, t.uniforms = {};
    for (const s in this.uniforms) {
      const o = this.uniforms[s].value;
      o && o.isTexture ? t.uniforms[s] = {
        type: "t",
        value: o.toJSON(e).uuid
      } : o && o.isColor ? t.uniforms[s] = {
        type: "c",
        value: o.getHex()
      } : o && o.isVector2 ? t.uniforms[s] = {
        type: "v2",
        value: o.toArray()
      } : o && o.isVector3 ? t.uniforms[s] = {
        type: "v3",
        value: o.toArray()
      } : o && o.isVector4 ? t.uniforms[s] = {
        type: "v4",
        value: o.toArray()
      } : o && o.isMatrix3 ? t.uniforms[s] = {
        type: "m3",
        value: o.toArray()
      } : o && o.isMatrix4 ? t.uniforms[s] = {
        type: "m4",
        value: o.toArray()
      } : t.uniforms[s] = {
        value: o
      };
    }
    Object.keys(this.defines).length > 0 && (t.defines = this.defines), t.vertexShader = this.vertexShader, t.fragmentShader = this.fragmentShader, t.lights = this.lights, t.clipping = this.clipping;
    const n = {};
    for (const s in this.extensions)
      this.extensions[s] === !0 && (n[s] = !0);
    return Object.keys(n).length > 0 && (t.extensions = n), t;
  }
}
class Ph extends wt {
  constructor() {
    super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new Ge(), this.projectionMatrix = new Ge(), this.projectionMatrixInverse = new Ge(), this.coordinateSystem = Qn;
  }
  copy(e, t) {
    return super.copy(e, t), this.matrixWorldInverse.copy(e.matrixWorldInverse), this.projectionMatrix.copy(e.projectionMatrix), this.projectionMatrixInverse.copy(e.projectionMatrixInverse), this.coordinateSystem = e.coordinateSystem, this;
  }
  getWorldDirection(e) {
    return super.getWorldDirection(e).negate();
  }
  updateMatrixWorld(e) {
    super.updateMatrixWorld(e), this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }
  updateWorldMatrix(e, t) {
    super.updateWorldMatrix(e, t), this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
const hi = /* @__PURE__ */ new M(), Wc = /* @__PURE__ */ new ue(), Xc = /* @__PURE__ */ new ue();
class en extends Ph {
  constructor(e = 50, t = 1, n = 0.1, s = 2e3) {
    super(), this.isPerspectiveCamera = !0, this.type = "PerspectiveCamera", this.fov = e, this.zoom = 1, this.near = n, this.far = s, this.focus = 10, this.aspect = t, this.view = null, this.filmGauge = 35, this.filmOffset = 0, this.updateProjectionMatrix();
  }
  copy(e, t) {
    return super.copy(e, t), this.fov = e.fov, this.zoom = e.zoom, this.near = e.near, this.far = e.far, this.focus = e.focus, this.aspect = e.aspect, this.view = e.view === null ? null : Object.assign({}, e.view), this.filmGauge = e.filmGauge, this.filmOffset = e.filmOffset, this;
  }
  /**
   * Sets the FOV by focal length in respect to the current .filmGauge.
   *
   * The default film gauge is 35, so that the focal length can be specified for
   * a 35mm (full frame) camera.
   *
   * @param {number} focalLength - Values for focal length and film gauge must have the same unit.
   */
  setFocalLength(e) {
    const t = 0.5 * this.getFilmHeight() / e;
    this.fov = ys * 2 * Math.atan(t), this.updateProjectionMatrix();
  }
  /**
   * Calculates the focal length from the current .fov and .filmGauge.
   *
   * @returns {number}
   */
  getFocalLength() {
    const e = Math.tan(Js * 0.5 * this.fov);
    return 0.5 * this.getFilmHeight() / e;
  }
  getEffectiveFOV() {
    return ys * 2 * Math.atan(
      Math.tan(Js * 0.5 * this.fov) / this.zoom
    );
  }
  getFilmWidth() {
    return this.filmGauge * Math.min(this.aspect, 1);
  }
  getFilmHeight() {
    return this.filmGauge / Math.max(this.aspect, 1);
  }
  /**
   * Computes the 2D bounds of the camera's viewable rectangle at a given distance along the viewing direction.
   * Sets minTarget and maxTarget to the coordinates of the lower-left and upper-right corners of the view rectangle.
   *
   * @param {number} distance
   * @param {Vector2} minTarget
   * @param {Vector2} maxTarget
   */
  getViewBounds(e, t, n) {
    hi.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse), t.set(hi.x, hi.y).multiplyScalar(-e / hi.z), hi.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse), n.set(hi.x, hi.y).multiplyScalar(-e / hi.z);
  }
  /**
   * Computes the width and height of the camera's viewable rectangle at a given distance along the viewing direction.
   *
   * @param {number} distance
   * @param {Vector2} target - Vector2 target used to store result where x is width and y is height.
   * @returns {Vector2}
   */
  getViewSize(e, t) {
    return this.getViewBounds(e, Wc, Xc), t.subVectors(Xc, Wc);
  }
  /**
   * Sets an offset in a larger frustum. This is useful for multi-window or
   * multi-monitor/multi-machine setups.
   *
   * For example, if you have 3x2 monitors and each monitor is 1920x1080 and
   * the monitors are in grid like this
   *
   *   +---+---+---+
   *   | A | B | C |
   *   +---+---+---+
   *   | D | E | F |
   *   +---+---+---+
   *
   * then for each monitor you would call it like this
   *
   *   const w = 1920;
   *   const h = 1080;
   *   const fullWidth = w * 3;
   *   const fullHeight = h * 2;
   *
   *   --A--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 0, w, h );
   *   --B--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 0, w, h );
   *   --C--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 0, w, h );
   *   --D--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 0, h * 1, w, h );
   *   --E--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 1, h * 1, w, h );
   *   --F--
   *   camera.setViewOffset( fullWidth, fullHeight, w * 2, h * 1, w, h );
   *
   *   Note there is no reason monitors have to be the same size or in a grid.
   *
   * @param {number} fullWidth
   * @param {number} fullHeight
   * @param {number} x
   * @param {number} y
   * @param {number} width
   * @param {number} height
   */
  setViewOffset(e, t, n, s, r, o) {
    this.aspect = e / t, this.view === null && (this.view = {
      enabled: !0,
      fullWidth: 1,
      fullHeight: 1,
      offsetX: 0,
      offsetY: 0,
      width: 1,
      height: 1
    }), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = s, this.view.width = r, this.view.height = o, this.updateProjectionMatrix();
  }
  clearViewOffset() {
    this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
  }
  updateProjectionMatrix() {
    const e = this.near;
    let t = e * Math.tan(Js * 0.5 * this.fov) / this.zoom, n = 2 * t, s = this.aspect * n, r = -0.5 * s;
    const o = this.view;
    if (this.view !== null && this.view.enabled) {
      const c = o.fullWidth, l = o.fullHeight;
      r += o.offsetX * s / c, t -= o.offsetY * n / l, s *= o.width / c, n *= o.height / l;
    }
    const a = this.filmOffset;
    a !== 0 && (r += e * a / this.getFilmWidth()), this.projectionMatrix.makePerspective(r, r + s, t, t - n, e, this.far, this.coordinateSystem), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return t.object.fov = this.fov, t.object.zoom = this.zoom, t.object.near = this.near, t.object.far = this.far, t.object.focus = this.focus, t.object.aspect = this.aspect, this.view !== null && (t.object.view = Object.assign({}, this.view)), t.object.filmGauge = this.filmGauge, t.object.filmOffset = this.filmOffset, t;
  }
}
const Zi = -90, $i = 1;
class kd extends wt {
  constructor(e, t, n) {
    super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
    const s = new en(Zi, $i, e, t);
    s.layers = this.layers, this.add(s);
    const r = new en(Zi, $i, e, t);
    r.layers = this.layers, this.add(r);
    const o = new en(Zi, $i, e, t);
    o.layers = this.layers, this.add(o);
    const a = new en(Zi, $i, e, t);
    a.layers = this.layers, this.add(a);
    const c = new en(Zi, $i, e, t);
    c.layers = this.layers, this.add(c);
    const l = new en(Zi, $i, e, t);
    l.layers = this.layers, this.add(l);
  }
  updateCoordinateSystem() {
    const e = this.coordinateSystem, t = this.children.concat(), [n, s, r, o, a, c] = t;
    for (const l of t) this.remove(l);
    if (e === Qn)
      n.up.set(0, 1, 0), n.lookAt(1, 0, 0), s.up.set(0, 1, 0), s.lookAt(-1, 0, 0), r.up.set(0, 0, -1), r.lookAt(0, 1, 0), o.up.set(0, 0, 1), o.lookAt(0, -1, 0), a.up.set(0, 1, 0), a.lookAt(0, 0, 1), c.up.set(0, 1, 0), c.lookAt(0, 0, -1);
    else if (e === eo)
      n.up.set(0, -1, 0), n.lookAt(-1, 0, 0), s.up.set(0, -1, 0), s.lookAt(1, 0, 0), r.up.set(0, 0, 1), r.lookAt(0, 1, 0), o.up.set(0, 0, -1), o.lookAt(0, -1, 0), a.up.set(0, -1, 0), a.lookAt(0, 0, 1), c.up.set(0, -1, 0), c.lookAt(0, 0, -1);
    else
      throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + e);
    for (const l of t)
      this.add(l), l.updateMatrixWorld();
  }
  update(e, t) {
    this.parent === null && this.updateMatrixWorld();
    const { renderTarget: n, activeMipmapLevel: s } = this;
    this.coordinateSystem !== e.coordinateSystem && (this.coordinateSystem = e.coordinateSystem, this.updateCoordinateSystem());
    const [r, o, a, c, l, h] = this.children, u = e.getRenderTarget(), d = e.getActiveCubeFace(), f = e.getActiveMipmapLevel(), g = e.xr.enabled;
    e.xr.enabled = !1;
    const _ = n.texture.generateMipmaps;
    n.texture.generateMipmaps = !1, e.setRenderTarget(n, 0, s), e.render(t, r), e.setRenderTarget(n, 1, s), e.render(t, o), e.setRenderTarget(n, 2, s), e.render(t, a), e.setRenderTarget(n, 3, s), e.render(t, c), e.setRenderTarget(n, 4, s), e.render(t, l), n.texture.generateMipmaps = _, e.setRenderTarget(n, 5, s), e.render(t, h), e.setRenderTarget(u, d, f), e.xr.enabled = g, n.texture.needsPMREMUpdate = !0;
  }
}
class Ih extends Ut {
  constructor(e, t, n, s, r, o, a, c, l, h) {
    e = e !== void 0 ? e : [], t = t !== void 0 ? t : gs, super(e, t, n, s, r, o, a, c, l, h), this.isCubeTexture = !0, this.flipY = !1;
  }
  get images() {
    return this.image;
  }
  set images(e) {
    this.image = e;
  }
}
class zd extends Ui {
  constructor(e = 1, t = {}) {
    super(e, e, t), this.isWebGLCubeRenderTarget = !0;
    const n = { width: e, height: e, depth: 1 }, s = [n, n, n, n, n, n];
    this.texture = new Ih(s, t.mapping, t.wrapS, t.wrapT, t.magFilter, t.minFilter, t.format, t.type, t.anisotropy, t.colorSpace), this.texture.isRenderTargetTexture = !0, this.texture.generateMipmaps = t.generateMipmaps !== void 0 ? t.generateMipmaps : !1, this.texture.minFilter = t.minFilter !== void 0 ? t.minFilter : pn;
  }
  fromEquirectangularTexture(e, t) {
    this.texture.type = t.type, this.texture.colorSpace = t.colorSpace, this.texture.generateMipmaps = t.generateMipmaps, this.texture.minFilter = t.minFilter, this.texture.magFilter = t.magFilter;
    const n = {
      uniforms: {
        tEquirect: { value: null }
      },
      vertexShader: (
        /* glsl */
        `

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`
      ),
      fragmentShader: (
        /* glsl */
        `

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`
      )
    }, s = new mt(5, 5, 5), r = new ii({
      name: "CubemapFromEquirect",
      uniforms: Ss(n.uniforms),
      vertexShader: n.vertexShader,
      fragmentShader: n.fragmentShader,
      side: tn,
      blending: vi
    });
    r.uniforms.tEquirect.value = t;
    const o = new oe(s, r), a = t.minFilter;
    return t.minFilter === Jn && (t.minFilter = pn), new kd(1, 10, this).update(e, o), t.minFilter = a, o.geometry.dispose(), o.material.dispose(), this;
  }
  clear(e, t, n, s) {
    const r = e.getRenderTarget();
    for (let o = 0; o < 6; o++)
      e.setRenderTarget(this, o), e.clear(t, n, s);
    e.setRenderTarget(r);
  }
}
class cs {
  constructor(e, t = 25e-5) {
    this.isFogExp2 = !0, this.name = "", this.color = new Ie(e), this.density = t;
  }
  clone() {
    return new cs(this.color, this.density);
  }
  toJSON() {
    return {
      type: "FogExp2",
      name: this.name,
      color: this.color.getHex(),
      density: this.density
    };
  }
}
class Hd extends wt {
  constructor() {
    super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new On(), this.environmentIntensity = 1, this.environmentRotation = new On(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
  }
  copy(e, t) {
    return super.copy(e, t), e.background !== null && (this.background = e.background.clone()), e.environment !== null && (this.environment = e.environment.clone()), e.fog !== null && (this.fog = e.fog.clone()), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), e.overrideMaterial !== null && (this.overrideMaterial = e.overrideMaterial.clone()), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return this.fog !== null && (t.object.fog = this.fog.toJSON()), this.backgroundBlurriness > 0 && (t.object.backgroundBlurriness = this.backgroundBlurriness), this.backgroundIntensity !== 1 && (t.object.backgroundIntensity = this.backgroundIntensity), t.object.backgroundRotation = this.backgroundRotation.toArray(), this.environmentIntensity !== 1 && (t.object.environmentIntensity = this.environmentIntensity), t.object.environmentRotation = this.environmentRotation.toArray(), t;
  }
}
class Vd {
  constructor(e, t) {
    this.isInterleavedBuffer = !0, this.array = e, this.stride = t, this.count = e !== void 0 ? e.length / t : 0, this.usage = ka, this.updateRanges = [], this.version = 0, this.uuid = Pn();
  }
  onUploadCallback() {
  }
  set needsUpdate(e) {
    e === !0 && this.version++;
  }
  setUsage(e) {
    return this.usage = e, this;
  }
  addUpdateRange(e, t) {
    this.updateRanges.push({ start: e, count: t });
  }
  clearUpdateRanges() {
    this.updateRanges.length = 0;
  }
  copy(e) {
    return this.array = new e.array.constructor(e.array), this.count = e.count, this.stride = e.stride, this.usage = e.usage, this;
  }
  copyAt(e, t, n) {
    e *= this.stride, n *= t.stride;
    for (let s = 0, r = this.stride; s < r; s++)
      this.array[e + s] = t.array[n + s];
    return this;
  }
  set(e, t = 0) {
    return this.array.set(e, t), this;
  }
  clone(e) {
    e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = Pn()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer);
    const t = new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]), n = new this.constructor(t, this.stride);
    return n.setUsage(this.usage), n;
  }
  onUpload(e) {
    return this.onUploadCallback = e, this;
  }
  toJSON(e) {
    return e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = Pn()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer))), {
      uuid: this.uuid,
      buffer: this.array.buffer._uuid,
      type: this.array.constructor.name,
      stride: this.stride
    };
  }
}
const Jt = /* @__PURE__ */ new M();
class ic {
  constructor(e, t, n, s = !1) {
    this.isInterleavedBufferAttribute = !0, this.name = "", this.data = e, this.itemSize = t, this.offset = n, this.normalized = s;
  }
  get count() {
    return this.data.count;
  }
  get array() {
    return this.data.array;
  }
  set needsUpdate(e) {
    this.data.needsUpdate = e;
  }
  applyMatrix4(e) {
    for (let t = 0, n = this.data.count; t < n; t++)
      Jt.fromBufferAttribute(this, t), Jt.applyMatrix4(e), this.setXYZ(t, Jt.x, Jt.y, Jt.z);
    return this;
  }
  applyNormalMatrix(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Jt.fromBufferAttribute(this, t), Jt.applyNormalMatrix(e), this.setXYZ(t, Jt.x, Jt.y, Jt.z);
    return this;
  }
  transformDirection(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Jt.fromBufferAttribute(this, t), Jt.transformDirection(e), this.setXYZ(t, Jt.x, Jt.y, Jt.z);
    return this;
  }
  getComponent(e, t) {
    let n = this.array[e * this.data.stride + this.offset + t];
    return this.normalized && (n = An(n, this.array)), n;
  }
  setComponent(e, t, n) {
    return this.normalized && (n = gt(n, this.array)), this.data.array[e * this.data.stride + this.offset + t] = n, this;
  }
  setX(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.data.array[e * this.data.stride + this.offset] = t, this;
  }
  setY(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 1] = t, this;
  }
  setZ(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 2] = t, this;
  }
  setW(e, t) {
    return this.normalized && (t = gt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 3] = t, this;
  }
  getX(e) {
    let t = this.data.array[e * this.data.stride + this.offset];
    return this.normalized && (t = An(t, this.array)), t;
  }
  getY(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 1];
    return this.normalized && (t = An(t, this.array)), t;
  }
  getZ(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 2];
    return this.normalized && (t = An(t, this.array)), t;
  }
  getW(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 3];
    return this.normalized && (t = An(t, this.array)), t;
  }
  setXY(e, t, n) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = gt(t, this.array), n = gt(n, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this;
  }
  setXYZ(e, t, n, s) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = gt(t, this.array), n = gt(n, this.array), s = gt(s, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = s, this;
  }
  setXYZW(e, t, n, s, r) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = gt(t, this.array), n = gt(n, this.array), s = gt(s, this.array), r = gt(r, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = s, this.data.array[e + 3] = r, this;
  }
  clone(e) {
    if (e === void 0) {
      console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");
      const t = [];
      for (let n = 0; n < this.count; n++) {
        const s = n * this.data.stride + this.offset;
        for (let r = 0; r < this.itemSize; r++)
          t.push(this.data.array[s + r]);
      }
      return new Vt(new this.array.constructor(t), this.itemSize, this.normalized);
    } else
      return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.clone(e)), new ic(e.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
  }
  toJSON(e) {
    if (e === void 0) {
      console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");
      const t = [];
      for (let n = 0; n < this.count; n++) {
        const s = n * this.data.stride + this.offset;
        for (let r = 0; r < this.itemSize; r++)
          t.push(this.data.array[s + r]);
      }
      return {
        itemSize: this.itemSize,
        type: this.array.constructor.name,
        array: t,
        normalized: this.normalized
      };
    } else
      return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.toJSON(e)), {
        isInterleavedBufferAttribute: !0,
        itemSize: this.itemSize,
        data: this.data.uuid,
        offset: this.offset,
        normalized: this.normalized
      };
  }
}
const qc = /* @__PURE__ */ new M(), Yc = /* @__PURE__ */ new dt(), Kc = /* @__PURE__ */ new dt(), Gd = /* @__PURE__ */ new M(), jc = /* @__PURE__ */ new Ge(), Ar = /* @__PURE__ */ new M(), Co = /* @__PURE__ */ new Bn(), Zc = /* @__PURE__ */ new Ge(), Po = /* @__PURE__ */ new cr();
class Wd extends oe {
  constructor(e, t) {
    super(e, t), this.isSkinnedMesh = !0, this.type = "SkinnedMesh", this.bindMode = Mc, this.bindMatrix = new Ge(), this.bindMatrixInverse = new Ge(), this.boundingBox = null, this.boundingSphere = null;
  }
  computeBoundingBox() {
    const e = this.geometry;
    this.boundingBox === null && (this.boundingBox = new Ln()), this.boundingBox.makeEmpty();
    const t = e.getAttribute("position");
    for (let n = 0; n < t.count; n++)
      this.getVertexPosition(n, Ar), this.boundingBox.expandByPoint(Ar);
  }
  computeBoundingSphere() {
    const e = this.geometry;
    this.boundingSphere === null && (this.boundingSphere = new Bn()), this.boundingSphere.makeEmpty();
    const t = e.getAttribute("position");
    for (let n = 0; n < t.count; n++)
      this.getVertexPosition(n, Ar), this.boundingSphere.expandByPoint(Ar);
  }
  copy(e, t) {
    return super.copy(e, t), this.bindMode = e.bindMode, this.bindMatrix.copy(e.bindMatrix), this.bindMatrixInverse.copy(e.bindMatrixInverse), this.skeleton = e.skeleton, e.boundingBox !== null && (this.boundingBox = e.boundingBox.clone()), e.boundingSphere !== null && (this.boundingSphere = e.boundingSphere.clone()), this;
  }
  raycast(e, t) {
    const n = this.material, s = this.matrixWorld;
    n !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), Co.copy(this.boundingSphere), Co.applyMatrix4(s), e.ray.intersectsSphere(Co) !== !1 && (Zc.copy(s).invert(), Po.copy(e.ray).applyMatrix4(Zc), !(this.boundingBox !== null && Po.intersectsBox(this.boundingBox) === !1) && this._computeIntersections(e, t, Po)));
  }
  getVertexPosition(e, t) {
    return super.getVertexPosition(e, t), this.applyBoneTransform(e, t), t;
  }
  bind(e, t) {
    this.skeleton = e, t === void 0 && (this.updateMatrixWorld(!0), this.skeleton.calculateInverses(), t = this.matrixWorld), this.bindMatrix.copy(t), this.bindMatrixInverse.copy(t).invert();
  }
  pose() {
    this.skeleton.pose();
  }
  normalizeSkinWeights() {
    const e = new dt(), t = this.geometry.attributes.skinWeight;
    for (let n = 0, s = t.count; n < s; n++) {
      e.fromBufferAttribute(t, n);
      const r = 1 / e.manhattanLength();
      r !== 1 / 0 ? e.multiplyScalar(r) : e.set(1, 0, 0, 0), t.setXYZW(n, e.x, e.y, e.z, e.w);
    }
  }
  updateMatrixWorld(e) {
    super.updateMatrixWorld(e), this.bindMode === Mc ? this.bindMatrixInverse.copy(this.matrixWorld).invert() : this.bindMode === ku ? this.bindMatrixInverse.copy(this.bindMatrix).invert() : console.warn("THREE.SkinnedMesh: Unrecognized bindMode: " + this.bindMode);
  }
  applyBoneTransform(e, t) {
    const n = this.skeleton, s = this.geometry;
    Yc.fromBufferAttribute(s.attributes.skinIndex, e), Kc.fromBufferAttribute(s.attributes.skinWeight, e), qc.copy(t).applyMatrix4(this.bindMatrix), t.set(0, 0, 0);
    for (let r = 0; r < 4; r++) {
      const o = Kc.getComponent(r);
      if (o !== 0) {
        const a = Yc.getComponent(r);
        jc.multiplyMatrices(n.bones[a].matrixWorld, n.boneInverses[a]), t.addScaledVector(Gd.copy(qc).applyMatrix4(jc), o);
      }
    }
    return t.applyMatrix4(this.bindMatrixInverse);
  }
}
class Lh extends wt {
  constructor() {
    super(), this.isBone = !0, this.type = "Bone";
  }
}
class Dh extends Ut {
  constructor(e = null, t = 1, n = 1, s, r, o, a, c, l = nn, h = nn, u, d) {
    super(null, o, a, c, l, h, s, r, u, d), this.isDataTexture = !0, this.image = { data: e, width: t, height: n }, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
  }
}
const $c = /* @__PURE__ */ new Ge(), Xd = /* @__PURE__ */ new Ge();
class sc {
  constructor(e = [], t = []) {
    this.uuid = Pn(), this.bones = e.slice(0), this.boneInverses = t, this.boneMatrices = null, this.boneTexture = null, this.init();
  }
  init() {
    const e = this.bones, t = this.boneInverses;
    if (this.boneMatrices = new Float32Array(e.length * 16), t.length === 0)
      this.calculateInverses();
    else if (e.length !== t.length) {
      console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."), this.boneInverses = [];
      for (let n = 0, s = this.bones.length; n < s; n++)
        this.boneInverses.push(new Ge());
    }
  }
  calculateInverses() {
    this.boneInverses.length = 0;
    for (let e = 0, t = this.bones.length; e < t; e++) {
      const n = new Ge();
      this.bones[e] && n.copy(this.bones[e].matrixWorld).invert(), this.boneInverses.push(n);
    }
  }
  pose() {
    for (let e = 0, t = this.bones.length; e < t; e++) {
      const n = this.bones[e];
      n && n.matrixWorld.copy(this.boneInverses[e]).invert();
    }
    for (let e = 0, t = this.bones.length; e < t; e++) {
      const n = this.bones[e];
      n && (n.parent && n.parent.isBone ? (n.matrix.copy(n.parent.matrixWorld).invert(), n.matrix.multiply(n.matrixWorld)) : n.matrix.copy(n.matrixWorld), n.matrix.decompose(n.position, n.quaternion, n.scale));
    }
  }
  update() {
    const e = this.bones, t = this.boneInverses, n = this.boneMatrices, s = this.boneTexture;
    for (let r = 0, o = e.length; r < o; r++) {
      const a = e[r] ? e[r].matrixWorld : Xd;
      $c.multiplyMatrices(a, t[r]), $c.toArray(n, r * 16);
    }
    s !== null && (s.needsUpdate = !0);
  }
  clone() {
    return new sc(this.bones, this.boneInverses);
  }
  computeBoneTexture() {
    let e = Math.sqrt(this.bones.length * 4);
    e = Math.ceil(e / 4) * 4, e = Math.max(e, 4);
    const t = new Float32Array(e * e * 4);
    t.set(this.boneMatrices);
    const n = new Dh(t, e, e, xn, Cn);
    return n.needsUpdate = !0, this.boneMatrices = t, this.boneTexture = n, this;
  }
  getBoneByName(e) {
    for (let t = 0, n = this.bones.length; t < n; t++) {
      const s = this.bones[t];
      if (s.name === e)
        return s;
    }
  }
  dispose() {
    this.boneTexture !== null && (this.boneTexture.dispose(), this.boneTexture = null);
  }
  fromJSON(e, t) {
    this.uuid = e.uuid;
    for (let n = 0, s = e.bones.length; n < s; n++) {
      const r = e.bones[n];
      let o = t[r];
      o === void 0 && (console.warn("THREE.Skeleton: No bone found with UUID:", r), o = new Lh()), this.bones.push(o), this.boneInverses.push(new Ge().fromArray(e.boneInverses[n]));
    }
    return this.init(), this;
  }
  toJSON() {
    const e = {
      metadata: {
        version: 4.6,
        type: "Skeleton",
        generator: "Skeleton.toJSON"
      },
      bones: [],
      boneInverses: []
    };
    e.uuid = this.uuid;
    const t = this.bones, n = this.boneInverses;
    for (let s = 0, r = t.length; s < r; s++) {
      const o = t[s];
      e.bones.push(o.uuid);
      const a = n[s];
      e.boneInverses.push(a.toArray());
    }
    return e;
  }
}
class za extends Vt {
  constructor(e, t, n, s = 1) {
    super(e, t, n), this.isInstancedBufferAttribute = !0, this.meshPerAttribute = s;
  }
  copy(e) {
    return super.copy(e), this.meshPerAttribute = e.meshPerAttribute, this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.meshPerAttribute = this.meshPerAttribute, e.isInstancedBufferAttribute = !0, e;
  }
}
const Ji = /* @__PURE__ */ new Ge(), Jc = /* @__PURE__ */ new Ge(), Rr = [], Qc = /* @__PURE__ */ new Ln(), qd = /* @__PURE__ */ new Ge(), Gs = /* @__PURE__ */ new oe(), Ws = /* @__PURE__ */ new Bn();
class Yd extends oe {
  constructor(e, t, n) {
    super(e, t), this.isInstancedMesh = !0, this.instanceMatrix = new za(new Float32Array(n * 16), 16), this.instanceColor = null, this.morphTexture = null, this.count = n, this.boundingBox = null, this.boundingSphere = null;
    for (let s = 0; s < n; s++)
      this.setMatrixAt(s, qd);
  }
  computeBoundingBox() {
    const e = this.geometry, t = this.count;
    this.boundingBox === null && (this.boundingBox = new Ln()), e.boundingBox === null && e.computeBoundingBox(), this.boundingBox.makeEmpty();
    for (let n = 0; n < t; n++)
      this.getMatrixAt(n, Ji), Qc.copy(e.boundingBox).applyMatrix4(Ji), this.boundingBox.union(Qc);
  }
  computeBoundingSphere() {
    const e = this.geometry, t = this.count;
    this.boundingSphere === null && (this.boundingSphere = new Bn()), e.boundingSphere === null && e.computeBoundingSphere(), this.boundingSphere.makeEmpty();
    for (let n = 0; n < t; n++)
      this.getMatrixAt(n, Ji), Ws.copy(e.boundingSphere).applyMatrix4(Ji), this.boundingSphere.union(Ws);
  }
  copy(e, t) {
    return super.copy(e, t), this.instanceMatrix.copy(e.instanceMatrix), e.morphTexture !== null && (this.morphTexture = e.morphTexture.clone()), e.instanceColor !== null && (this.instanceColor = e.instanceColor.clone()), this.count = e.count, e.boundingBox !== null && (this.boundingBox = e.boundingBox.clone()), e.boundingSphere !== null && (this.boundingSphere = e.boundingSphere.clone()), this;
  }
  getColorAt(e, t) {
    t.fromArray(this.instanceColor.array, e * 3);
  }
  getMatrixAt(e, t) {
    t.fromArray(this.instanceMatrix.array, e * 16);
  }
  getMorphAt(e, t) {
    const n = t.morphTargetInfluences, s = this.morphTexture.source.data.data, r = n.length + 1, o = e * r + 1;
    for (let a = 0; a < n.length; a++)
      n[a] = s[o + a];
  }
  raycast(e, t) {
    const n = this.matrixWorld, s = this.count;
    if (Gs.geometry = this.geometry, Gs.material = this.material, Gs.material !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), Ws.copy(this.boundingSphere), Ws.applyMatrix4(n), e.ray.intersectsSphere(Ws) !== !1))
      for (let r = 0; r < s; r++) {
        this.getMatrixAt(r, Ji), Jc.multiplyMatrices(n, Ji), Gs.matrixWorld = Jc, Gs.raycast(e, Rr);
        for (let o = 0, a = Rr.length; o < a; o++) {
          const c = Rr[o];
          c.instanceId = r, c.object = this, t.push(c);
        }
        Rr.length = 0;
      }
  }
  setColorAt(e, t) {
    this.instanceColor === null && (this.instanceColor = new za(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3)), t.toArray(this.instanceColor.array, e * 3);
  }
  setMatrixAt(e, t) {
    t.toArray(this.instanceMatrix.array, e * 16);
  }
  setMorphAt(e, t) {
    const n = t.morphTargetInfluences, s = n.length + 1;
    this.morphTexture === null && (this.morphTexture = new Dh(new Float32Array(s * this.count), s, this.count, $a, Cn));
    const r = this.morphTexture.source.data.data;
    let o = 0;
    for (let l = 0; l < n.length; l++)
      o += n[l];
    const a = this.geometry.morphTargetsRelative ? 1 : 1 - o, c = s * e;
    r[c] = a, r.set(n, c + 1);
  }
  updateMorphTargets() {
  }
  dispose() {
    return this.dispatchEvent({ type: "dispose" }), this.morphTexture !== null && (this.morphTexture.dispose(), this.morphTexture = null), this;
  }
}
const Io = /* @__PURE__ */ new M(), Kd = /* @__PURE__ */ new M(), jd = /* @__PURE__ */ new Ke();
class fi {
  constructor(e = new M(1, 0, 0), t = 0) {
    this.isPlane = !0, this.normal = e, this.constant = t;
  }
  set(e, t) {
    return this.normal.copy(e), this.constant = t, this;
  }
  setComponents(e, t, n, s) {
    return this.normal.set(e, t, n), this.constant = s, this;
  }
  setFromNormalAndCoplanarPoint(e, t) {
    return this.normal.copy(e), this.constant = -t.dot(this.normal), this;
  }
  setFromCoplanarPoints(e, t, n) {
    const s = Io.subVectors(n, t).cross(Kd.subVectors(e, t)).normalize();
    return this.setFromNormalAndCoplanarPoint(s, e), this;
  }
  copy(e) {
    return this.normal.copy(e.normal), this.constant = e.constant, this;
  }
  normalize() {
    const e = 1 / this.normal.length();
    return this.normal.multiplyScalar(e), this.constant *= e, this;
  }
  negate() {
    return this.constant *= -1, this.normal.negate(), this;
  }
  distanceToPoint(e) {
    return this.normal.dot(e) + this.constant;
  }
  distanceToSphere(e) {
    return this.distanceToPoint(e.center) - e.radius;
  }
  projectPoint(e, t) {
    return t.copy(e).addScaledVector(this.normal, -this.distanceToPoint(e));
  }
  intersectLine(e, t) {
    const n = e.delta(Io), s = this.normal.dot(n);
    if (s === 0)
      return this.distanceToPoint(e.start) === 0 ? t.copy(e.start) : null;
    const r = -(e.start.dot(this.normal) + this.constant) / s;
    return r < 0 || r > 1 ? null : t.copy(e.start).addScaledVector(n, r);
  }
  intersectsLine(e) {
    const t = this.distanceToPoint(e.start), n = this.distanceToPoint(e.end);
    return t < 0 && n > 0 || n < 0 && t > 0;
  }
  intersectsBox(e) {
    return e.intersectsPlane(this);
  }
  intersectsSphere(e) {
    return e.intersectsPlane(this);
  }
  coplanarPoint(e) {
    return e.copy(this.normal).multiplyScalar(-this.constant);
  }
  applyMatrix4(e, t) {
    const n = t || jd.getNormalMatrix(e), s = this.coplanarPoint(Io).applyMatrix4(e), r = this.normal.applyMatrix3(n).normalize();
    return this.constant = -s.dot(r), this;
  }
  translate(e) {
    return this.constant -= e.dot(this.normal), this;
  }
  equals(e) {
    return e.normal.equals(this.normal) && e.constant === this.constant;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
const Ti = /* @__PURE__ */ new Bn(), Cr = /* @__PURE__ */ new M();
class rc {
  constructor(e = new fi(), t = new fi(), n = new fi(), s = new fi(), r = new fi(), o = new fi()) {
    this.planes = [e, t, n, s, r, o];
  }
  set(e, t, n, s, r, o) {
    const a = this.planes;
    return a[0].copy(e), a[1].copy(t), a[2].copy(n), a[3].copy(s), a[4].copy(r), a[5].copy(o), this;
  }
  copy(e) {
    const t = this.planes;
    for (let n = 0; n < 6; n++)
      t[n].copy(e.planes[n]);
    return this;
  }
  setFromProjectionMatrix(e, t = Qn) {
    const n = this.planes, s = e.elements, r = s[0], o = s[1], a = s[2], c = s[3], l = s[4], h = s[5], u = s[6], d = s[7], f = s[8], g = s[9], _ = s[10], m = s[11], p = s[12], x = s[13], y = s[14], v = s[15];
    if (n[0].setComponents(c - r, d - l, m - f, v - p).normalize(), n[1].setComponents(c + r, d + l, m + f, v + p).normalize(), n[2].setComponents(c + o, d + h, m + g, v + x).normalize(), n[3].setComponents(c - o, d - h, m - g, v - x).normalize(), n[4].setComponents(c - a, d - u, m - _, v - y).normalize(), t === Qn)
      n[5].setComponents(c + a, d + u, m + _, v + y).normalize();
    else if (t === eo)
      n[5].setComponents(a, u, _, y).normalize();
    else
      throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
    return this;
  }
  intersectsObject(e) {
    if (e.boundingSphere !== void 0)
      e.boundingSphere === null && e.computeBoundingSphere(), Ti.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
    else {
      const t = e.geometry;
      t.boundingSphere === null && t.computeBoundingSphere(), Ti.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
    }
    return this.intersectsSphere(Ti);
  }
  intersectsSprite(e) {
    return Ti.center.set(0, 0, 0), Ti.radius = 0.7071067811865476, Ti.applyMatrix4(e.matrixWorld), this.intersectsSphere(Ti);
  }
  intersectsSphere(e) {
    const t = this.planes, n = e.center, s = -e.radius;
    for (let r = 0; r < 6; r++)
      if (t[r].distanceToPoint(n) < s)
        return !1;
    return !0;
  }
  intersectsBox(e) {
    const t = this.planes;
    for (let n = 0; n < 6; n++) {
      const s = t[n];
      if (Cr.x = s.normal.x > 0 ? e.max.x : e.min.x, Cr.y = s.normal.y > 0 ? e.max.y : e.min.y, Cr.z = s.normal.z > 0 ? e.max.z : e.min.z, s.distanceToPoint(Cr) < 0)
        return !1;
    }
    return !0;
  }
  containsPoint(e) {
    const t = this.planes;
    for (let n = 0; n < 6; n++)
      if (t[n].distanceToPoint(e) < 0)
        return !1;
    return !0;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
class Nh extends Fn {
  constructor(e) {
    super(), this.isLineBasicMaterial = !0, this.type = "LineBasicMaterial", this.color = new Ie(16777215), this.map = null, this.linewidth = 1, this.linecap = "round", this.linejoin = "round", this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.linewidth = e.linewidth, this.linecap = e.linecap, this.linejoin = e.linejoin, this.fog = e.fog, this;
  }
}
const to = /* @__PURE__ */ new M(), no = /* @__PURE__ */ new M(), el = /* @__PURE__ */ new Ge(), Xs = /* @__PURE__ */ new cr(), Pr = /* @__PURE__ */ new Bn(), Lo = /* @__PURE__ */ new M(), tl = /* @__PURE__ */ new M();
class oc extends wt {
  constructor(e = new Bt(), t = new Nh()) {
    super(), this.isLine = !0, this.type = "Line", this.geometry = e, this.material = t, this.updateMorphTargets();
  }
  copy(e, t) {
    return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
  }
  computeLineDistances() {
    const e = this.geometry;
    if (e.index === null) {
      const t = e.attributes.position, n = [0];
      for (let s = 1, r = t.count; s < r; s++)
        to.fromBufferAttribute(t, s - 1), no.fromBufferAttribute(t, s), n[s] = n[s - 1], n[s] += to.distanceTo(no);
      e.setAttribute("lineDistance", new at(n, 1));
    } else
      console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    return this;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.matrixWorld, r = e.params.Line.threshold, o = n.drawRange;
    if (n.boundingSphere === null && n.computeBoundingSphere(), Pr.copy(n.boundingSphere), Pr.applyMatrix4(s), Pr.radius += r, e.ray.intersectsSphere(Pr) === !1) return;
    el.copy(s).invert(), Xs.copy(e.ray).applyMatrix4(el);
    const a = r / ((this.scale.x + this.scale.y + this.scale.z) / 3), c = a * a, l = this.isLineSegments ? 2 : 1, h = n.index, d = n.attributes.position;
    if (h !== null) {
      const f = Math.max(0, o.start), g = Math.min(h.count, o.start + o.count);
      for (let _ = f, m = g - 1; _ < m; _ += l) {
        const p = h.getX(_), x = h.getX(_ + 1), y = Ir(this, e, Xs, c, p, x);
        y && t.push(y);
      }
      if (this.isLineLoop) {
        const _ = h.getX(g - 1), m = h.getX(f), p = Ir(this, e, Xs, c, _, m);
        p && t.push(p);
      }
    } else {
      const f = Math.max(0, o.start), g = Math.min(d.count, o.start + o.count);
      for (let _ = f, m = g - 1; _ < m; _ += l) {
        const p = Ir(this, e, Xs, c, _, _ + 1);
        p && t.push(p);
      }
      if (this.isLineLoop) {
        const _ = Ir(this, e, Xs, c, g - 1, f);
        _ && t.push(_);
      }
    }
  }
  updateMorphTargets() {
    const t = this.geometry.morphAttributes, n = Object.keys(t);
    if (n.length > 0) {
      const s = t[n[0]];
      if (s !== void 0) {
        this.morphTargetInfluences = [], this.morphTargetDictionary = {};
        for (let r = 0, o = s.length; r < o; r++) {
          const a = s[r].name || String(r);
          this.morphTargetInfluences.push(0), this.morphTargetDictionary[a] = r;
        }
      }
    }
  }
}
function Ir(i, e, t, n, s, r) {
  const o = i.geometry.attributes.position;
  if (to.fromBufferAttribute(o, s), no.fromBufferAttribute(o, r), t.distanceSqToSegment(to, no, Lo, tl) > n) return;
  Lo.applyMatrix4(i.matrixWorld);
  const c = e.ray.origin.distanceTo(Lo);
  if (!(c < e.near || c > e.far))
    return {
      distance: c,
      // What do we want? intersection point on the ray or on the segment??
      // point: raycaster.ray.at( distance ),
      point: tl.clone().applyMatrix4(i.matrixWorld),
      index: s,
      face: null,
      faceIndex: null,
      barycoord: null,
      object: i
    };
}
const nl = /* @__PURE__ */ new M(), il = /* @__PURE__ */ new M();
class Zd extends oc {
  constructor(e, t) {
    super(e, t), this.isLineSegments = !0, this.type = "LineSegments";
  }
  computeLineDistances() {
    const e = this.geometry;
    if (e.index === null) {
      const t = e.attributes.position, n = [];
      for (let s = 0, r = t.count; s < r; s += 2)
        nl.fromBufferAttribute(t, s), il.fromBufferAttribute(t, s + 1), n[s] = s === 0 ? 0 : n[s - 1], n[s + 1] = n[s] + nl.distanceTo(il);
      e.setAttribute("lineDistance", new at(n, 1));
    } else
      console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    return this;
  }
}
class $d extends oc {
  constructor(e, t) {
    super(e, t), this.isLineLoop = !0, this.type = "LineLoop";
  }
}
class Uh extends Fn {
  constructor(e) {
    super(), this.isPointsMaterial = !0, this.type = "PointsMaterial", this.color = new Ie(16777215), this.map = null, this.alphaMap = null, this.size = 1, this.sizeAttenuation = !0, this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.size = e.size, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
  }
}
const sl = /* @__PURE__ */ new Ge(), Ha = /* @__PURE__ */ new cr(), Lr = /* @__PURE__ */ new Bn(), Dr = /* @__PURE__ */ new M();
class Jd extends wt {
  constructor(e = new Bt(), t = new Uh()) {
    super(), this.isPoints = !0, this.type = "Points", this.geometry = e, this.material = t, this.updateMorphTargets();
  }
  copy(e, t) {
    return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.matrixWorld, r = e.params.Points.threshold, o = n.drawRange;
    if (n.boundingSphere === null && n.computeBoundingSphere(), Lr.copy(n.boundingSphere), Lr.applyMatrix4(s), Lr.radius += r, e.ray.intersectsSphere(Lr) === !1) return;
    sl.copy(s).invert(), Ha.copy(e.ray).applyMatrix4(sl);
    const a = r / ((this.scale.x + this.scale.y + this.scale.z) / 3), c = a * a, l = n.index, u = n.attributes.position;
    if (l !== null) {
      const d = Math.max(0, o.start), f = Math.min(l.count, o.start + o.count);
      for (let g = d, _ = f; g < _; g++) {
        const m = l.getX(g);
        Dr.fromBufferAttribute(u, m), rl(Dr, m, c, s, e, t, this);
      }
    } else {
      const d = Math.max(0, o.start), f = Math.min(u.count, o.start + o.count);
      for (let g = d, _ = f; g < _; g++)
        Dr.fromBufferAttribute(u, g), rl(Dr, g, c, s, e, t, this);
    }
  }
  updateMorphTargets() {
    const t = this.geometry.morphAttributes, n = Object.keys(t);
    if (n.length > 0) {
      const s = t[n[0]];
      if (s !== void 0) {
        this.morphTargetInfluences = [], this.morphTargetDictionary = {};
        for (let r = 0, o = s.length; r < o; r++) {
          const a = s[r].name || String(r);
          this.morphTargetInfluences.push(0), this.morphTargetDictionary[a] = r;
        }
      }
    }
  }
}
function rl(i, e, t, n, s, r, o) {
  const a = Ha.distanceSqToPoint(i);
  if (a < t) {
    const c = new M();
    Ha.closestPointToPoint(i, c), c.applyMatrix4(n);
    const l = s.ray.origin.distanceTo(c);
    if (l < s.near || l > s.far) return;
    r.push({
      distance: l,
      distanceToRay: Math.sqrt(a),
      point: c,
      index: e,
      face: null,
      faceIndex: null,
      barycoord: null,
      object: o
    });
  }
}
class ye extends wt {
  constructor() {
    super(), this.isGroup = !0, this.type = "Group";
  }
}
class Qd extends Ut {
  constructor(e, t, n, s, r, o, a, c, l) {
    super(e, t, n, s, r, o, a, c, l), this.isCanvasTexture = !0, this.needsUpdate = !0;
  }
}
class Fh extends Ut {
  constructor(e, t, n, s, r, o, a, c, l, h = ds) {
    if (h !== ds && h !== xs)
      throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
    n === void 0 && h === ds && (n = Ni), n === void 0 && h === xs && (n = vs), super(null, s, r, o, a, c, h, n, l), this.isDepthTexture = !0, this.image = { width: e, height: t }, this.magFilter = a !== void 0 ? a : nn, this.minFilter = c !== void 0 ? c : nn, this.flipY = !1, this.generateMipmaps = !1, this.compareFunction = null;
  }
  copy(e) {
    return super.copy(e), this.compareFunction = e.compareFunction, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return this.compareFunction !== null && (t.compareFunction = this.compareFunction), t;
  }
}
class kn {
  constructor() {
    this.type = "Curve", this.arcLengthDivisions = 200;
  }
  // Virtual base class method to overwrite and implement in subclasses
  //	- t [0 .. 1]
  getPoint() {
    return console.warn("THREE.Curve: .getPoint() not implemented."), null;
  }
  // Get point at relative position in curve according to arc length
  // - u [0 .. 1]
  getPointAt(e, t) {
    const n = this.getUtoTmapping(e);
    return this.getPoint(n, t);
  }
  // Get sequence of points using getPoint( t )
  getPoints(e = 5) {
    const t = [];
    for (let n = 0; n <= e; n++)
      t.push(this.getPoint(n / e));
    return t;
  }
  // Get sequence of points using getPointAt( u )
  getSpacedPoints(e = 5) {
    const t = [];
    for (let n = 0; n <= e; n++)
      t.push(this.getPointAt(n / e));
    return t;
  }
  // Get total curve arc length
  getLength() {
    const e = this.getLengths();
    return e[e.length - 1];
  }
  // Get list of cumulative segment lengths
  getLengths(e = this.arcLengthDivisions) {
    if (this.cacheArcLengths && this.cacheArcLengths.length === e + 1 && !this.needsUpdate)
      return this.cacheArcLengths;
    this.needsUpdate = !1;
    const t = [];
    let n, s = this.getPoint(0), r = 0;
    t.push(0);
    for (let o = 1; o <= e; o++)
      n = this.getPoint(o / e), r += n.distanceTo(s), t.push(r), s = n;
    return this.cacheArcLengths = t, t;
  }
  updateArcLengths() {
    this.needsUpdate = !0, this.getLengths();
  }
  // Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant
  getUtoTmapping(e, t) {
    const n = this.getLengths();
    let s = 0;
    const r = n.length;
    let o;
    t ? o = t : o = e * n[r - 1];
    let a = 0, c = r - 1, l;
    for (; a <= c; )
      if (s = Math.floor(a + (c - a) / 2), l = n[s] - o, l < 0)
        a = s + 1;
      else if (l > 0)
        c = s - 1;
      else {
        c = s;
        break;
      }
    if (s = c, n[s] === o)
      return s / (r - 1);
    const h = n[s], d = n[s + 1] - h, f = (o - h) / d;
    return (s + f) / (r - 1);
  }
  // Returns a unit vector tangent at t
  // In case any sub curve does not implement its tangent derivation,
  // 2 points a small delta apart will be used to find its gradient
  // which seems to give a reasonable approximation
  getTangent(e, t) {
    let s = e - 1e-4, r = e + 1e-4;
    s < 0 && (s = 0), r > 1 && (r = 1);
    const o = this.getPoint(s), a = this.getPoint(r), c = t || (o.isVector2 ? new ue() : new M());
    return c.copy(a).sub(o).normalize(), c;
  }
  getTangentAt(e, t) {
    const n = this.getUtoTmapping(e);
    return this.getTangent(n, t);
  }
  computeFrenetFrames(e, t) {
    const n = new M(), s = [], r = [], o = [], a = new M(), c = new Ge();
    for (let f = 0; f <= e; f++) {
      const g = f / e;
      s[f] = this.getTangentAt(g, new M());
    }
    r[0] = new M(), o[0] = new M();
    let l = Number.MAX_VALUE;
    const h = Math.abs(s[0].x), u = Math.abs(s[0].y), d = Math.abs(s[0].z);
    h <= l && (l = h, n.set(1, 0, 0)), u <= l && (l = u, n.set(0, 1, 0)), d <= l && n.set(0, 0, 1), a.crossVectors(s[0], n).normalize(), r[0].crossVectors(s[0], a), o[0].crossVectors(s[0], r[0]);
    for (let f = 1; f <= e; f++) {
      if (r[f] = r[f - 1].clone(), o[f] = o[f - 1].clone(), a.crossVectors(s[f - 1], s[f]), a.length() > Number.EPSILON) {
        a.normalize();
        const g = Math.acos(qe(s[f - 1].dot(s[f]), -1, 1));
        r[f].applyMatrix4(c.makeRotationAxis(a, g));
      }
      o[f].crossVectors(s[f], r[f]);
    }
    if (t === !0) {
      let f = Math.acos(qe(r[0].dot(r[e]), -1, 1));
      f /= e, s[0].dot(a.crossVectors(r[0], r[e])) > 0 && (f = -f);
      for (let g = 1; g <= e; g++)
        r[g].applyMatrix4(c.makeRotationAxis(s[g], f * g)), o[g].crossVectors(s[g], r[g]);
    }
    return {
      tangents: s,
      normals: r,
      binormals: o
    };
  }
  clone() {
    return new this.constructor().copy(this);
  }
  copy(e) {
    return this.arcLengthDivisions = e.arcLengthDivisions, this;
  }
  toJSON() {
    const e = {
      metadata: {
        version: 4.6,
        type: "Curve",
        generator: "Curve.toJSON"
      }
    };
    return e.arcLengthDivisions = this.arcLengthDivisions, e.type = this.type, e;
  }
  fromJSON(e) {
    return this.arcLengthDivisions = e.arcLengthDivisions, this;
  }
}
class ac extends kn {
  constructor(e = 0, t = 0, n = 1, s = 1, r = 0, o = Math.PI * 2, a = !1, c = 0) {
    super(), this.isEllipseCurve = !0, this.type = "EllipseCurve", this.aX = e, this.aY = t, this.xRadius = n, this.yRadius = s, this.aStartAngle = r, this.aEndAngle = o, this.aClockwise = a, this.aRotation = c;
  }
  getPoint(e, t = new ue()) {
    const n = t, s = Math.PI * 2;
    let r = this.aEndAngle - this.aStartAngle;
    const o = Math.abs(r) < Number.EPSILON;
    for (; r < 0; ) r += s;
    for (; r > s; ) r -= s;
    r < Number.EPSILON && (o ? r = 0 : r = s), this.aClockwise === !0 && !o && (r === s ? r = -s : r = r - s);
    const a = this.aStartAngle + e * r;
    let c = this.aX + this.xRadius * Math.cos(a), l = this.aY + this.yRadius * Math.sin(a);
    if (this.aRotation !== 0) {
      const h = Math.cos(this.aRotation), u = Math.sin(this.aRotation), d = c - this.aX, f = l - this.aY;
      c = d * h - f * u + this.aX, l = d * u + f * h + this.aY;
    }
    return n.set(c, l);
  }
  copy(e) {
    return super.copy(e), this.aX = e.aX, this.aY = e.aY, this.xRadius = e.xRadius, this.yRadius = e.yRadius, this.aStartAngle = e.aStartAngle, this.aEndAngle = e.aEndAngle, this.aClockwise = e.aClockwise, this.aRotation = e.aRotation, this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.aX = this.aX, e.aY = this.aY, e.xRadius = this.xRadius, e.yRadius = this.yRadius, e.aStartAngle = this.aStartAngle, e.aEndAngle = this.aEndAngle, e.aClockwise = this.aClockwise, e.aRotation = this.aRotation, e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.aX = e.aX, this.aY = e.aY, this.xRadius = e.xRadius, this.yRadius = e.yRadius, this.aStartAngle = e.aStartAngle, this.aEndAngle = e.aEndAngle, this.aClockwise = e.aClockwise, this.aRotation = e.aRotation, this;
  }
}
class ef extends ac {
  constructor(e, t, n, s, r, o) {
    super(e, t, n, n, s, r, o), this.isArcCurve = !0, this.type = "ArcCurve";
  }
}
function cc() {
  let i = 0, e = 0, t = 0, n = 0;
  function s(r, o, a, c) {
    i = r, e = a, t = -3 * r + 3 * o - 2 * a - c, n = 2 * r - 2 * o + a + c;
  }
  return {
    initCatmullRom: function(r, o, a, c, l) {
      s(o, a, l * (a - r), l * (c - o));
    },
    initNonuniformCatmullRom: function(r, o, a, c, l, h, u) {
      let d = (o - r) / l - (a - r) / (l + h) + (a - o) / h, f = (a - o) / h - (c - o) / (h + u) + (c - a) / u;
      d *= h, f *= h, s(o, a, d, f);
    },
    calc: function(r) {
      const o = r * r, a = o * r;
      return i + e * r + t * o + n * a;
    }
  };
}
const Nr = /* @__PURE__ */ new M(), Do = /* @__PURE__ */ new cc(), No = /* @__PURE__ */ new cc(), Uo = /* @__PURE__ */ new cc();
class Oh extends kn {
  constructor(e = [], t = !1, n = "centripetal", s = 0.5) {
    super(), this.isCatmullRomCurve3 = !0, this.type = "CatmullRomCurve3", this.points = e, this.closed = t, this.curveType = n, this.tension = s;
  }
  getPoint(e, t = new M()) {
    const n = t, s = this.points, r = s.length, o = (r - (this.closed ? 0 : 1)) * e;
    let a = Math.floor(o), c = o - a;
    this.closed ? a += a > 0 ? 0 : (Math.floor(Math.abs(a) / r) + 1) * r : c === 0 && a === r - 1 && (a = r - 2, c = 1);
    let l, h;
    this.closed || a > 0 ? l = s[(a - 1) % r] : (Nr.subVectors(s[0], s[1]).add(s[0]), l = Nr);
    const u = s[a % r], d = s[(a + 1) % r];
    if (this.closed || a + 2 < r ? h = s[(a + 2) % r] : (Nr.subVectors(s[r - 1], s[r - 2]).add(s[r - 1]), h = Nr), this.curveType === "centripetal" || this.curveType === "chordal") {
      const f = this.curveType === "chordal" ? 0.5 : 0.25;
      let g = Math.pow(l.distanceToSquared(u), f), _ = Math.pow(u.distanceToSquared(d), f), m = Math.pow(d.distanceToSquared(h), f);
      _ < 1e-4 && (_ = 1), g < 1e-4 && (g = _), m < 1e-4 && (m = _), Do.initNonuniformCatmullRom(l.x, u.x, d.x, h.x, g, _, m), No.initNonuniformCatmullRom(l.y, u.y, d.y, h.y, g, _, m), Uo.initNonuniformCatmullRom(l.z, u.z, d.z, h.z, g, _, m);
    } else this.curveType === "catmullrom" && (Do.initCatmullRom(l.x, u.x, d.x, h.x, this.tension), No.initCatmullRom(l.y, u.y, d.y, h.y, this.tension), Uo.initCatmullRom(l.z, u.z, d.z, h.z, this.tension));
    return n.set(
      Do.calc(c),
      No.calc(c),
      Uo.calc(c)
    ), n;
  }
  copy(e) {
    super.copy(e), this.points = [];
    for (let t = 0, n = e.points.length; t < n; t++) {
      const s = e.points[t];
      this.points.push(s.clone());
    }
    return this.closed = e.closed, this.curveType = e.curveType, this.tension = e.tension, this;
  }
  toJSON() {
    const e = super.toJSON();
    e.points = [];
    for (let t = 0, n = this.points.length; t < n; t++) {
      const s = this.points[t];
      e.points.push(s.toArray());
    }
    return e.closed = this.closed, e.curveType = this.curveType, e.tension = this.tension, e;
  }
  fromJSON(e) {
    super.fromJSON(e), this.points = [];
    for (let t = 0, n = e.points.length; t < n; t++) {
      const s = e.points[t];
      this.points.push(new M().fromArray(s));
    }
    return this.closed = e.closed, this.curveType = e.curveType, this.tension = e.tension, this;
  }
}
function ol(i, e, t, n, s) {
  const r = (n - e) * 0.5, o = (s - t) * 0.5, a = i * i, c = i * a;
  return (2 * t - 2 * n + r + o) * c + (-3 * t + 3 * n - 2 * r - o) * a + r * i + t;
}
function tf(i, e) {
  const t = 1 - i;
  return t * t * e;
}
function nf(i, e) {
  return 2 * (1 - i) * i * e;
}
function sf(i, e) {
  return i * i * e;
}
function er(i, e, t, n) {
  return tf(i, e) + nf(i, t) + sf(i, n);
}
function rf(i, e) {
  const t = 1 - i;
  return t * t * t * e;
}
function of(i, e) {
  const t = 1 - i;
  return 3 * t * t * i * e;
}
function af(i, e) {
  return 3 * (1 - i) * i * i * e;
}
function cf(i, e) {
  return i * i * i * e;
}
function tr(i, e, t, n, s) {
  return rf(i, e) + of(i, t) + af(i, n) + cf(i, s);
}
class Bh extends kn {
  constructor(e = new ue(), t = new ue(), n = new ue(), s = new ue()) {
    super(), this.isCubicBezierCurve = !0, this.type = "CubicBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n, this.v3 = s;
  }
  getPoint(e, t = new ue()) {
    const n = t, s = this.v0, r = this.v1, o = this.v2, a = this.v3;
    return n.set(
      tr(e, s.x, r.x, o.x, a.x),
      tr(e, s.y, r.y, o.y, a.y)
    ), n;
  }
  copy(e) {
    return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this.v3.copy(e.v3), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e.v3 = this.v3.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this.v3.fromArray(e.v3), this;
  }
}
class lf extends kn {
  constructor(e = new M(), t = new M(), n = new M(), s = new M()) {
    super(), this.isCubicBezierCurve3 = !0, this.type = "CubicBezierCurve3", this.v0 = e, this.v1 = t, this.v2 = n, this.v3 = s;
  }
  getPoint(e, t = new M()) {
    const n = t, s = this.v0, r = this.v1, o = this.v2, a = this.v3;
    return n.set(
      tr(e, s.x, r.x, o.x, a.x),
      tr(e, s.y, r.y, o.y, a.y),
      tr(e, s.z, r.z, o.z, a.z)
    ), n;
  }
  copy(e) {
    return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this.v3.copy(e.v3), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e.v3 = this.v3.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this.v3.fromArray(e.v3), this;
  }
}
class kh extends kn {
  constructor(e = new ue(), t = new ue()) {
    super(), this.isLineCurve = !0, this.type = "LineCurve", this.v1 = e, this.v2 = t;
  }
  getPoint(e, t = new ue()) {
    const n = t;
    return e === 1 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(e).add(this.v1)), n;
  }
  // Line curve is linear, so we can overwrite default getPointAt
  getPointAt(e, t) {
    return this.getPoint(e, t);
  }
  getTangent(e, t = new ue()) {
    return t.subVectors(this.v2, this.v1).normalize();
  }
  getTangentAt(e, t) {
    return this.getTangent(e, t);
  }
  copy(e) {
    return super.copy(e), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
  }
}
class hf extends kn {
  constructor(e = new M(), t = new M()) {
    super(), this.isLineCurve3 = !0, this.type = "LineCurve3", this.v1 = e, this.v2 = t;
  }
  getPoint(e, t = new M()) {
    const n = t;
    return e === 1 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(e).add(this.v1)), n;
  }
  // Line curve is linear, so we can overwrite default getPointAt
  getPointAt(e, t) {
    return this.getPoint(e, t);
  }
  getTangent(e, t = new M()) {
    return t.subVectors(this.v2, this.v1).normalize();
  }
  getTangentAt(e, t) {
    return this.getTangent(e, t);
  }
  copy(e) {
    return super.copy(e), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
  }
}
class zh extends kn {
  constructor(e = new ue(), t = new ue(), n = new ue()) {
    super(), this.isQuadraticBezierCurve = !0, this.type = "QuadraticBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n;
  }
  getPoint(e, t = new ue()) {
    const n = t, s = this.v0, r = this.v1, o = this.v2;
    return n.set(
      er(e, s.x, r.x, o.x),
      er(e, s.y, r.y, o.y)
    ), n;
  }
  copy(e) {
    return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
  }
}
class Hh extends kn {
  constructor(e = new M(), t = new M(), n = new M()) {
    super(), this.isQuadraticBezierCurve3 = !0, this.type = "QuadraticBezierCurve3", this.v0 = e, this.v1 = t, this.v2 = n;
  }
  getPoint(e, t = new M()) {
    const n = t, s = this.v0, r = this.v1, o = this.v2;
    return n.set(
      er(e, s.x, r.x, o.x),
      er(e, s.y, r.y, o.y),
      er(e, s.z, r.z, o.z)
    ), n;
  }
  copy(e) {
    return super.copy(e), this.v0.copy(e.v0), this.v1.copy(e.v1), this.v2.copy(e.v2), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.v0 = this.v0.toArray(), e.v1 = this.v1.toArray(), e.v2 = this.v2.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.v0.fromArray(e.v0), this.v1.fromArray(e.v1), this.v2.fromArray(e.v2), this;
  }
}
class Vh extends kn {
  constructor(e = []) {
    super(), this.isSplineCurve = !0, this.type = "SplineCurve", this.points = e;
  }
  getPoint(e, t = new ue()) {
    const n = t, s = this.points, r = (s.length - 1) * e, o = Math.floor(r), a = r - o, c = s[o === 0 ? o : o - 1], l = s[o], h = s[o > s.length - 2 ? s.length - 1 : o + 1], u = s[o > s.length - 3 ? s.length - 1 : o + 2];
    return n.set(
      ol(a, c.x, l.x, h.x, u.x),
      ol(a, c.y, l.y, h.y, u.y)
    ), n;
  }
  copy(e) {
    super.copy(e), this.points = [];
    for (let t = 0, n = e.points.length; t < n; t++) {
      const s = e.points[t];
      this.points.push(s.clone());
    }
    return this;
  }
  toJSON() {
    const e = super.toJSON();
    e.points = [];
    for (let t = 0, n = this.points.length; t < n; t++) {
      const s = this.points[t];
      e.points.push(s.toArray());
    }
    return e;
  }
  fromJSON(e) {
    super.fromJSON(e), this.points = [];
    for (let t = 0, n = e.points.length; t < n; t++) {
      const s = e.points[t];
      this.points.push(new ue().fromArray(s));
    }
    return this;
  }
}
var Va = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ArcCurve: ef,
  CatmullRomCurve3: Oh,
  CubicBezierCurve: Bh,
  CubicBezierCurve3: lf,
  EllipseCurve: ac,
  LineCurve: kh,
  LineCurve3: hf,
  QuadraticBezierCurve: zh,
  QuadraticBezierCurve3: Hh,
  SplineCurve: Vh
});
class uf extends kn {
  constructor() {
    super(), this.type = "CurvePath", this.curves = [], this.autoClose = !1;
  }
  add(e) {
    this.curves.push(e);
  }
  closePath() {
    const e = this.curves[0].getPoint(0), t = this.curves[this.curves.length - 1].getPoint(1);
    if (!e.equals(t)) {
      const n = e.isVector2 === !0 ? "LineCurve" : "LineCurve3";
      this.curves.push(new Va[n](t, e));
    }
    return this;
  }
  // To get accurate point with reference to
  // entire path distance at time t,
  // following has to be done:
  // 1. Length of each sub path have to be known
  // 2. Locate and identify type of curve
  // 3. Get t for the curve
  // 4. Return curve.getPointAt(t')
  getPoint(e, t) {
    const n = e * this.getLength(), s = this.getCurveLengths();
    let r = 0;
    for (; r < s.length; ) {
      if (s[r] >= n) {
        const o = s[r] - n, a = this.curves[r], c = a.getLength(), l = c === 0 ? 0 : 1 - o / c;
        return a.getPointAt(l, t);
      }
      r++;
    }
    return null;
  }
  // We cannot use the default THREE.Curve getPoint() with getLength() because in
  // THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
  // getPoint() depends on getLength
  getLength() {
    const e = this.getCurveLengths();
    return e[e.length - 1];
  }
  // cacheLengths must be recalculated.
  updateArcLengths() {
    this.needsUpdate = !0, this.cacheLengths = null, this.getCurveLengths();
  }
  // Compute lengths and cache them
  // We cannot overwrite getLengths() because UtoT mapping uses it.
  getCurveLengths() {
    if (this.cacheLengths && this.cacheLengths.length === this.curves.length)
      return this.cacheLengths;
    const e = [];
    let t = 0;
    for (let n = 0, s = this.curves.length; n < s; n++)
      t += this.curves[n].getLength(), e.push(t);
    return this.cacheLengths = e, e;
  }
  getSpacedPoints(e = 40) {
    const t = [];
    for (let n = 0; n <= e; n++)
      t.push(this.getPoint(n / e));
    return this.autoClose && t.push(t[0]), t;
  }
  getPoints(e = 12) {
    const t = [];
    let n;
    for (let s = 0, r = this.curves; s < r.length; s++) {
      const o = r[s], a = o.isEllipseCurve ? e * 2 : o.isLineCurve || o.isLineCurve3 ? 1 : o.isSplineCurve ? e * o.points.length : e, c = o.getPoints(a);
      for (let l = 0; l < c.length; l++) {
        const h = c[l];
        n && n.equals(h) || (t.push(h), n = h);
      }
    }
    return this.autoClose && t.length > 1 && !t[t.length - 1].equals(t[0]) && t.push(t[0]), t;
  }
  copy(e) {
    super.copy(e), this.curves = [];
    for (let t = 0, n = e.curves.length; t < n; t++) {
      const s = e.curves[t];
      this.curves.push(s.clone());
    }
    return this.autoClose = e.autoClose, this;
  }
  toJSON() {
    const e = super.toJSON();
    e.autoClose = this.autoClose, e.curves = [];
    for (let t = 0, n = this.curves.length; t < n; t++) {
      const s = this.curves[t];
      e.curves.push(s.toJSON());
    }
    return e;
  }
  fromJSON(e) {
    super.fromJSON(e), this.autoClose = e.autoClose, this.curves = [];
    for (let t = 0, n = e.curves.length; t < n; t++) {
      const s = e.curves[t];
      this.curves.push(new Va[s.type]().fromJSON(s));
    }
    return this;
  }
}
class df extends uf {
  constructor(e) {
    super(), this.type = "Path", this.currentPoint = new ue(), e && this.setFromPoints(e);
  }
  setFromPoints(e) {
    this.moveTo(e[0].x, e[0].y);
    for (let t = 1, n = e.length; t < n; t++)
      this.lineTo(e[t].x, e[t].y);
    return this;
  }
  moveTo(e, t) {
    return this.currentPoint.set(e, t), this;
  }
  lineTo(e, t) {
    const n = new kh(this.currentPoint.clone(), new ue(e, t));
    return this.curves.push(n), this.currentPoint.set(e, t), this;
  }
  quadraticCurveTo(e, t, n, s) {
    const r = new zh(
      this.currentPoint.clone(),
      new ue(e, t),
      new ue(n, s)
    );
    return this.curves.push(r), this.currentPoint.set(n, s), this;
  }
  bezierCurveTo(e, t, n, s, r, o) {
    const a = new Bh(
      this.currentPoint.clone(),
      new ue(e, t),
      new ue(n, s),
      new ue(r, o)
    );
    return this.curves.push(a), this.currentPoint.set(r, o), this;
  }
  splineThru(e) {
    const t = [this.currentPoint.clone()].concat(e), n = new Vh(t);
    return this.curves.push(n), this.currentPoint.copy(e[e.length - 1]), this;
  }
  arc(e, t, n, s, r, o) {
    const a = this.currentPoint.x, c = this.currentPoint.y;
    return this.absarc(
      e + a,
      t + c,
      n,
      s,
      r,
      o
    ), this;
  }
  absarc(e, t, n, s, r, o) {
    return this.absellipse(e, t, n, n, s, r, o), this;
  }
  ellipse(e, t, n, s, r, o, a, c) {
    const l = this.currentPoint.x, h = this.currentPoint.y;
    return this.absellipse(e + l, t + h, n, s, r, o, a, c), this;
  }
  absellipse(e, t, n, s, r, o, a, c) {
    const l = new ac(e, t, n, s, r, o, a, c);
    if (this.curves.length > 0) {
      const u = l.getPoint(0);
      u.equals(this.currentPoint) || this.lineTo(u.x, u.y);
    }
    this.curves.push(l);
    const h = l.getPoint(1);
    return this.currentPoint.copy(h), this;
  }
  copy(e) {
    return super.copy(e), this.currentPoint.copy(e.currentPoint), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.currentPoint = this.currentPoint.toArray(), e;
  }
  fromJSON(e) {
    return super.fromJSON(e), this.currentPoint.fromArray(e.currentPoint), this;
  }
}
class lc extends Bt {
  constructor(e = [new ue(0, -0.5), new ue(0.5, 0), new ue(0, 0.5)], t = 12, n = 0, s = Math.PI * 2) {
    super(), this.type = "LatheGeometry", this.parameters = {
      points: e,
      segments: t,
      phiStart: n,
      phiLength: s
    }, t = Math.floor(t), s = qe(s, 0, Math.PI * 2);
    const r = [], o = [], a = [], c = [], l = [], h = 1 / t, u = new M(), d = new ue(), f = new M(), g = new M(), _ = new M();
    let m = 0, p = 0;
    for (let x = 0; x <= e.length - 1; x++)
      switch (x) {
        case 0:
          m = e[x + 1].x - e[x].x, p = e[x + 1].y - e[x].y, f.x = p * 1, f.y = -m, f.z = p * 0, _.copy(f), f.normalize(), c.push(f.x, f.y, f.z);
          break;
        case e.length - 1:
          c.push(_.x, _.y, _.z);
          break;
        default:
          m = e[x + 1].x - e[x].x, p = e[x + 1].y - e[x].y, f.x = p * 1, f.y = -m, f.z = p * 0, g.copy(f), f.x += _.x, f.y += _.y, f.z += _.z, f.normalize(), c.push(f.x, f.y, f.z), _.copy(g);
      }
    for (let x = 0; x <= t; x++) {
      const y = n + x * h * s, v = Math.sin(y), P = Math.cos(y);
      for (let A = 0; A <= e.length - 1; A++) {
        u.x = e[A].x * v, u.y = e[A].y, u.z = e[A].x * P, o.push(u.x, u.y, u.z), d.x = x / t, d.y = A / (e.length - 1), a.push(d.x, d.y);
        const C = c[3 * A + 0] * v, I = c[3 * A + 1], w = c[3 * A + 0] * P;
        l.push(C, I, w);
      }
    }
    for (let x = 0; x < t; x++)
      for (let y = 0; y < e.length - 1; y++) {
        const v = y + x * e.length, P = v, A = v + e.length, C = v + e.length + 1, I = v + 1;
        r.push(P, A, I), r.push(C, I, A);
      }
    this.setIndex(r), this.setAttribute("position", new at(o, 3)), this.setAttribute("uv", new at(a, 2)), this.setAttribute("normal", new at(l, 3));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new lc(e.points, e.segments, e.phiStart, e.phiLength);
  }
}
class Ms extends lc {
  constructor(e = 1, t = 1, n = 4, s = 8) {
    const r = new df();
    r.absarc(0, -t / 2, e, Math.PI * 1.5, 0), r.absarc(0, t / 2, e, 0, Math.PI * 0.5), super(r.getPoints(n), s), this.type = "CapsuleGeometry", this.parameters = {
      radius: e,
      length: t,
      capSegments: n,
      radialSegments: s
    };
  }
  static fromJSON(e) {
    return new Ms(e.radius, e.length, e.capSegments, e.radialSegments);
  }
}
class hc extends Bt {
  constructor(e = 1, t = 32, n = 0, s = Math.PI * 2) {
    super(), this.type = "CircleGeometry", this.parameters = {
      radius: e,
      segments: t,
      thetaStart: n,
      thetaLength: s
    }, t = Math.max(3, t);
    const r = [], o = [], a = [], c = [], l = new M(), h = new ue();
    o.push(0, 0, 0), a.push(0, 0, 1), c.push(0.5, 0.5);
    for (let u = 0, d = 3; u <= t; u++, d += 3) {
      const f = n + u / t * s;
      l.x = e * Math.cos(f), l.y = e * Math.sin(f), o.push(l.x, l.y, l.z), a.push(0, 0, 1), h.x = (o[d] / e + 1) / 2, h.y = (o[d + 1] / e + 1) / 2, c.push(h.x, h.y);
    }
    for (let u = 1; u <= t; u++)
      r.push(u, u + 1, 0);
    this.setIndex(r), this.setAttribute("position", new at(o, 3)), this.setAttribute("normal", new at(a, 3)), this.setAttribute("uv", new at(c, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new hc(e.radius, e.segments, e.thetaStart, e.thetaLength);
  }
}
class ln extends Bt {
  constructor(e = 1, t = 1, n = 1, s = 32, r = 1, o = !1, a = 0, c = Math.PI * 2) {
    super(), this.type = "CylinderGeometry", this.parameters = {
      radiusTop: e,
      radiusBottom: t,
      height: n,
      radialSegments: s,
      heightSegments: r,
      openEnded: o,
      thetaStart: a,
      thetaLength: c
    };
    const l = this;
    s = Math.floor(s), r = Math.floor(r);
    const h = [], u = [], d = [], f = [];
    let g = 0;
    const _ = [], m = n / 2;
    let p = 0;
    x(), o === !1 && (e > 0 && y(!0), t > 0 && y(!1)), this.setIndex(h), this.setAttribute("position", new at(u, 3)), this.setAttribute("normal", new at(d, 3)), this.setAttribute("uv", new at(f, 2));
    function x() {
      const v = new M(), P = new M();
      let A = 0;
      const C = (t - e) / n;
      for (let I = 0; I <= r; I++) {
        const w = [], S = I / r, D = S * (t - e) + e;
        for (let W = 0; W <= s; W++) {
          const H = W / s, Y = H * c + a, J = Math.sin(Y), K = Math.cos(Y);
          P.x = D * J, P.y = -S * n + m, P.z = D * K, u.push(P.x, P.y, P.z), v.set(J, C, K).normalize(), d.push(v.x, v.y, v.z), f.push(H, 1 - S), w.push(g++);
        }
        _.push(w);
      }
      for (let I = 0; I < s; I++)
        for (let w = 0; w < r; w++) {
          const S = _[w][I], D = _[w + 1][I], W = _[w + 1][I + 1], H = _[w][I + 1];
          (e > 0 || w !== 0) && (h.push(S, D, H), A += 3), (t > 0 || w !== r - 1) && (h.push(D, W, H), A += 3);
        }
      l.addGroup(p, A, 0), p += A;
    }
    function y(v) {
      const P = g, A = new ue(), C = new M();
      let I = 0;
      const w = v === !0 ? e : t, S = v === !0 ? 1 : -1;
      for (let W = 1; W <= s; W++)
        u.push(0, m * S, 0), d.push(0, S, 0), f.push(0.5, 0.5), g++;
      const D = g;
      for (let W = 0; W <= s; W++) {
        const Y = W / s * c + a, J = Math.cos(Y), K = Math.sin(Y);
        C.x = w * K, C.y = m * S, C.z = w * J, u.push(C.x, C.y, C.z), d.push(0, S, 0), A.x = J * 0.5 + 0.5, A.y = K * 0.5 * S + 0.5, f.push(A.x, A.y), g++;
      }
      for (let W = 0; W < s; W++) {
        const H = P + W, Y = D + W;
        v === !0 ? h.push(Y, Y + 1, H) : h.push(Y + 1, Y, H), I += 3;
      }
      l.addGroup(p, I, v === !0 ? 1 : 2), p += I;
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new ln(e.radiusTop, e.radiusBottom, e.height, e.radialSegments, e.heightSegments, e.openEnded, e.thetaStart, e.thetaLength);
  }
}
class uc extends ln {
  constructor(e = 1, t = 1, n = 32, s = 1, r = !1, o = 0, a = Math.PI * 2) {
    super(0, e, t, n, s, r, o, a), this.type = "ConeGeometry", this.parameters = {
      radius: e,
      height: t,
      radialSegments: n,
      heightSegments: s,
      openEnded: r,
      thetaStart: o,
      thetaLength: a
    };
  }
  static fromJSON(e) {
    return new uc(e.radius, e.height, e.radialSegments, e.heightSegments, e.openEnded, e.thetaStart, e.thetaLength);
  }
}
class dc extends Bt {
  constructor(e = [], t = [], n = 1, s = 0) {
    super(), this.type = "PolyhedronGeometry", this.parameters = {
      vertices: e,
      indices: t,
      radius: n,
      detail: s
    };
    const r = [], o = [];
    a(s), l(n), h(), this.setAttribute("position", new at(r, 3)), this.setAttribute("normal", new at(r.slice(), 3)), this.setAttribute("uv", new at(o, 2)), s === 0 ? this.computeVertexNormals() : this.normalizeNormals();
    function a(x) {
      const y = new M(), v = new M(), P = new M();
      for (let A = 0; A < t.length; A += 3)
        f(t[A + 0], y), f(t[A + 1], v), f(t[A + 2], P), c(y, v, P, x);
    }
    function c(x, y, v, P) {
      const A = P + 1, C = [];
      for (let I = 0; I <= A; I++) {
        C[I] = [];
        const w = x.clone().lerp(v, I / A), S = y.clone().lerp(v, I / A), D = A - I;
        for (let W = 0; W <= D; W++)
          W === 0 && I === A ? C[I][W] = w : C[I][W] = w.clone().lerp(S, W / D);
      }
      for (let I = 0; I < A; I++)
        for (let w = 0; w < 2 * (A - I) - 1; w++) {
          const S = Math.floor(w / 2);
          w % 2 === 0 ? (d(C[I][S + 1]), d(C[I + 1][S]), d(C[I][S])) : (d(C[I][S + 1]), d(C[I + 1][S + 1]), d(C[I + 1][S]));
        }
    }
    function l(x) {
      const y = new M();
      for (let v = 0; v < r.length; v += 3)
        y.x = r[v + 0], y.y = r[v + 1], y.z = r[v + 2], y.normalize().multiplyScalar(x), r[v + 0] = y.x, r[v + 1] = y.y, r[v + 2] = y.z;
    }
    function h() {
      const x = new M();
      for (let y = 0; y < r.length; y += 3) {
        x.x = r[y + 0], x.y = r[y + 1], x.z = r[y + 2];
        const v = m(x) / 2 / Math.PI + 0.5, P = p(x) / Math.PI + 0.5;
        o.push(v, 1 - P);
      }
      g(), u();
    }
    function u() {
      for (let x = 0; x < o.length; x += 6) {
        const y = o[x + 0], v = o[x + 2], P = o[x + 4], A = Math.max(y, v, P), C = Math.min(y, v, P);
        A > 0.9 && C < 0.1 && (y < 0.2 && (o[x + 0] += 1), v < 0.2 && (o[x + 2] += 1), P < 0.2 && (o[x + 4] += 1));
      }
    }
    function d(x) {
      r.push(x.x, x.y, x.z);
    }
    function f(x, y) {
      const v = x * 3;
      y.x = e[v + 0], y.y = e[v + 1], y.z = e[v + 2];
    }
    function g() {
      const x = new M(), y = new M(), v = new M(), P = new M(), A = new ue(), C = new ue(), I = new ue();
      for (let w = 0, S = 0; w < r.length; w += 9, S += 6) {
        x.set(r[w + 0], r[w + 1], r[w + 2]), y.set(r[w + 3], r[w + 4], r[w + 5]), v.set(r[w + 6], r[w + 7], r[w + 8]), A.set(o[S + 0], o[S + 1]), C.set(o[S + 2], o[S + 3]), I.set(o[S + 4], o[S + 5]), P.copy(x).add(y).add(v).divideScalar(3);
        const D = m(P);
        _(A, S + 0, x, D), _(C, S + 2, y, D), _(I, S + 4, v, D);
      }
    }
    function _(x, y, v, P) {
      P < 0 && x.x === 1 && (o[y] = x.x - 1), v.x === 0 && v.z === 0 && (o[y] = P / 2 / Math.PI + 0.5);
    }
    function m(x) {
      return Math.atan2(x.z, -x.x);
    }
    function p(x) {
      return Math.atan2(-x.y, Math.sqrt(x.x * x.x + x.z * x.z));
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new dc(e.vertices, e.indices, e.radius, e.details);
  }
}
class Ts extends dc {
  constructor(e = 1, t = 0) {
    const n = (1 + Math.sqrt(5)) / 2, s = [
      -1,
      n,
      0,
      1,
      n,
      0,
      -1,
      -n,
      0,
      1,
      -n,
      0,
      0,
      -1,
      n,
      0,
      1,
      n,
      0,
      -1,
      -n,
      0,
      1,
      -n,
      n,
      0,
      -1,
      n,
      0,
      1,
      -n,
      0,
      -1,
      -n,
      0,
      1
    ], r = [
      0,
      11,
      5,
      0,
      5,
      1,
      0,
      1,
      7,
      0,
      7,
      10,
      0,
      10,
      11,
      1,
      5,
      9,
      5,
      11,
      4,
      11,
      10,
      2,
      10,
      7,
      6,
      7,
      1,
      8,
      3,
      9,
      4,
      3,
      4,
      2,
      3,
      2,
      6,
      3,
      6,
      8,
      3,
      8,
      9,
      4,
      9,
      5,
      2,
      4,
      11,
      6,
      2,
      10,
      8,
      6,
      7,
      9,
      8,
      1
    ];
    super(s, r, e, t), this.type = "IcosahedronGeometry", this.parameters = {
      radius: e,
      detail: t
    };
  }
  static fromJSON(e) {
    return new Ts(e.radius, e.detail);
  }
}
class rn extends Bt {
  constructor(e = 1, t = 1, n = 1, s = 1) {
    super(), this.type = "PlaneGeometry", this.parameters = {
      width: e,
      height: t,
      widthSegments: n,
      heightSegments: s
    };
    const r = e / 2, o = t / 2, a = Math.floor(n), c = Math.floor(s), l = a + 1, h = c + 1, u = e / a, d = t / c, f = [], g = [], _ = [], m = [];
    for (let p = 0; p < h; p++) {
      const x = p * d - o;
      for (let y = 0; y < l; y++) {
        const v = y * u - r;
        g.push(v, -x, 0), _.push(0, 0, 1), m.push(y / a), m.push(1 - p / c);
      }
    }
    for (let p = 0; p < c; p++)
      for (let x = 0; x < a; x++) {
        const y = x + l * p, v = x + l * (p + 1), P = x + 1 + l * (p + 1), A = x + 1 + l * p;
        f.push(y, v, A), f.push(v, P, A);
      }
    this.setIndex(f), this.setAttribute("position", new at(g, 3)), this.setAttribute("normal", new at(_, 3)), this.setAttribute("uv", new at(m, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new rn(e.width, e.height, e.widthSegments, e.heightSegments);
  }
}
class fc extends Bt {
  constructor(e = 0.5, t = 1, n = 32, s = 1, r = 0, o = Math.PI * 2) {
    super(), this.type = "RingGeometry", this.parameters = {
      innerRadius: e,
      outerRadius: t,
      thetaSegments: n,
      phiSegments: s,
      thetaStart: r,
      thetaLength: o
    }, n = Math.max(3, n), s = Math.max(1, s);
    const a = [], c = [], l = [], h = [];
    let u = e;
    const d = (t - e) / s, f = new M(), g = new ue();
    for (let _ = 0; _ <= s; _++) {
      for (let m = 0; m <= n; m++) {
        const p = r + m / n * o;
        f.x = u * Math.cos(p), f.y = u * Math.sin(p), c.push(f.x, f.y, f.z), l.push(0, 0, 1), g.x = (f.x / t + 1) / 2, g.y = (f.y / t + 1) / 2, h.push(g.x, g.y);
      }
      u += d;
    }
    for (let _ = 0; _ < s; _++) {
      const m = _ * (n + 1);
      for (let p = 0; p < n; p++) {
        const x = p + m, y = x, v = x + n + 1, P = x + n + 2, A = x + 1;
        a.push(y, v, A), a.push(v, P, A);
      }
    }
    this.setIndex(a), this.setAttribute("position", new at(c, 3)), this.setAttribute("normal", new at(l, 3)), this.setAttribute("uv", new at(h, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new fc(e.innerRadius, e.outerRadius, e.thetaSegments, e.phiSegments, e.thetaStart, e.thetaLength);
  }
}
class In extends Bt {
  constructor(e = 1, t = 32, n = 16, s = 0, r = Math.PI * 2, o = 0, a = Math.PI) {
    super(), this.type = "SphereGeometry", this.parameters = {
      radius: e,
      widthSegments: t,
      heightSegments: n,
      phiStart: s,
      phiLength: r,
      thetaStart: o,
      thetaLength: a
    }, t = Math.max(3, Math.floor(t)), n = Math.max(2, Math.floor(n));
    const c = Math.min(o + a, Math.PI);
    let l = 0;
    const h = [], u = new M(), d = new M(), f = [], g = [], _ = [], m = [];
    for (let p = 0; p <= n; p++) {
      const x = [], y = p / n;
      let v = 0;
      p === 0 && o === 0 ? v = 0.5 / t : p === n && c === Math.PI && (v = -0.5 / t);
      for (let P = 0; P <= t; P++) {
        const A = P / t;
        u.x = -e * Math.cos(s + A * r) * Math.sin(o + y * a), u.y = e * Math.cos(o + y * a), u.z = e * Math.sin(s + A * r) * Math.sin(o + y * a), g.push(u.x, u.y, u.z), d.copy(u).normalize(), _.push(d.x, d.y, d.z), m.push(A + v, 1 - y), x.push(l++);
      }
      h.push(x);
    }
    for (let p = 0; p < n; p++)
      for (let x = 0; x < t; x++) {
        const y = h[p][x + 1], v = h[p][x], P = h[p + 1][x], A = h[p + 1][x + 1];
        (p !== 0 || o > 0) && f.push(y, v, A), (p !== n - 1 || c < Math.PI) && f.push(v, P, A);
      }
    this.setIndex(f), this.setAttribute("position", new at(g, 3)), this.setAttribute("normal", new at(_, 3)), this.setAttribute("uv", new at(m, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new In(e.radius, e.widthSegments, e.heightSegments, e.phiStart, e.phiLength, e.thetaStart, e.thetaLength);
  }
}
class As extends Bt {
  constructor(e = 1, t = 0.4, n = 12, s = 48, r = Math.PI * 2) {
    super(), this.type = "TorusGeometry", this.parameters = {
      radius: e,
      tube: t,
      radialSegments: n,
      tubularSegments: s,
      arc: r
    }, n = Math.floor(n), s = Math.floor(s);
    const o = [], a = [], c = [], l = [], h = new M(), u = new M(), d = new M();
    for (let f = 0; f <= n; f++)
      for (let g = 0; g <= s; g++) {
        const _ = g / s * r, m = f / n * Math.PI * 2;
        u.x = (e + t * Math.cos(m)) * Math.cos(_), u.y = (e + t * Math.cos(m)) * Math.sin(_), u.z = t * Math.sin(m), a.push(u.x, u.y, u.z), h.x = e * Math.cos(_), h.y = e * Math.sin(_), d.subVectors(u, h).normalize(), c.push(d.x, d.y, d.z), l.push(g / s), l.push(f / n);
      }
    for (let f = 1; f <= n; f++)
      for (let g = 1; g <= s; g++) {
        const _ = (s + 1) * f + g - 1, m = (s + 1) * (f - 1) + g - 1, p = (s + 1) * (f - 1) + g, x = (s + 1) * f + g;
        o.push(_, m, x), o.push(m, p, x);
      }
    this.setIndex(o), this.setAttribute("position", new at(a, 3)), this.setAttribute("normal", new at(c, 3)), this.setAttribute("uv", new at(l, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new As(e.radius, e.tube, e.radialSegments, e.tubularSegments, e.arc);
  }
}
class ro extends Bt {
  constructor(e = new Hh(new M(-1, -1, 0), new M(-1, 1, 0), new M(1, 1, 0)), t = 64, n = 1, s = 8, r = !1) {
    super(), this.type = "TubeGeometry", this.parameters = {
      path: e,
      tubularSegments: t,
      radius: n,
      radialSegments: s,
      closed: r
    };
    const o = e.computeFrenetFrames(t, r);
    this.tangents = o.tangents, this.normals = o.normals, this.binormals = o.binormals;
    const a = new M(), c = new M(), l = new ue();
    let h = new M();
    const u = [], d = [], f = [], g = [];
    _(), this.setIndex(g), this.setAttribute("position", new at(u, 3)), this.setAttribute("normal", new at(d, 3)), this.setAttribute("uv", new at(f, 2));
    function _() {
      for (let y = 0; y < t; y++)
        m(y);
      m(r === !1 ? t : 0), x(), p();
    }
    function m(y) {
      h = e.getPointAt(y / t, h);
      const v = o.normals[y], P = o.binormals[y];
      for (let A = 0; A <= s; A++) {
        const C = A / s * Math.PI * 2, I = Math.sin(C), w = -Math.cos(C);
        c.x = w * v.x + I * P.x, c.y = w * v.y + I * P.y, c.z = w * v.z + I * P.z, c.normalize(), d.push(c.x, c.y, c.z), a.x = h.x + n * c.x, a.y = h.y + n * c.y, a.z = h.z + n * c.z, u.push(a.x, a.y, a.z);
      }
    }
    function p() {
      for (let y = 1; y <= t; y++)
        for (let v = 1; v <= s; v++) {
          const P = (s + 1) * (y - 1) + (v - 1), A = (s + 1) * y + (v - 1), C = (s + 1) * y + v, I = (s + 1) * (y - 1) + v;
          g.push(P, A, I), g.push(A, C, I);
        }
    }
    function x() {
      for (let y = 0; y <= t; y++)
        for (let v = 0; v <= s; v++)
          l.x = y / t, l.y = v / s, f.push(l.x, l.y);
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  toJSON() {
    const e = super.toJSON();
    return e.path = this.parameters.path.toJSON(), e;
  }
  static fromJSON(e) {
    return new ro(
      new Va[e.path.type]().fromJSON(e.path),
      e.tubularSegments,
      e.radius,
      e.radialSegments,
      e.closed
    );
  }
}
class se extends Fn {
  constructor(e) {
    super(), this.isMeshStandardMaterial = !0, this.type = "MeshStandardMaterial", this.defines = { STANDARD: "" }, this.color = new Ie(16777215), this.roughness = 1, this.metalness = 0, this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.emissive = new Ie(0), this.emissiveIntensity = 1, this.emissiveMap = null, this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = yh, this.normalScale = new ue(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.roughnessMap = null, this.metalnessMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new On(), this.envMapIntensity = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.flatShading = !1, this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.defines = { STANDARD: "" }, this.color.copy(e.color), this.roughness = e.roughness, this.metalness = e.metalness, this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.emissive.copy(e.emissive), this.emissiveMap = e.emissiveMap, this.emissiveIntensity = e.emissiveIntensity, this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.roughnessMap = e.roughnessMap, this.metalnessMap = e.metalnessMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.envMapIntensity = e.envMapIntensity, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.flatShading = e.flatShading, this.fog = e.fog, this;
  }
}
class jt extends se {
  constructor(e) {
    super(), this.isMeshPhysicalMaterial = !0, this.defines = {
      STANDARD: "",
      PHYSICAL: ""
    }, this.type = "MeshPhysicalMaterial", this.anisotropyRotation = 0, this.anisotropyMap = null, this.clearcoatMap = null, this.clearcoatRoughness = 0, this.clearcoatRoughnessMap = null, this.clearcoatNormalScale = new ue(1, 1), this.clearcoatNormalMap = null, this.ior = 1.5, Object.defineProperty(this, "reflectivity", {
      get: function() {
        return qe(2.5 * (this.ior - 1) / (this.ior + 1), 0, 1);
      },
      set: function(t) {
        this.ior = (1 + 0.4 * t) / (1 - 0.4 * t);
      }
    }), this.iridescenceMap = null, this.iridescenceIOR = 1.3, this.iridescenceThicknessRange = [100, 400], this.iridescenceThicknessMap = null, this.sheenColor = new Ie(0), this.sheenColorMap = null, this.sheenRoughness = 1, this.sheenRoughnessMap = null, this.transmissionMap = null, this.thickness = 0, this.thicknessMap = null, this.attenuationDistance = 1 / 0, this.attenuationColor = new Ie(1, 1, 1), this.specularIntensity = 1, this.specularIntensityMap = null, this.specularColor = new Ie(1, 1, 1), this.specularColorMap = null, this._anisotropy = 0, this._clearcoat = 0, this._dispersion = 0, this._iridescence = 0, this._sheen = 0, this._transmission = 0, this.setValues(e);
  }
  get anisotropy() {
    return this._anisotropy;
  }
  set anisotropy(e) {
    this._anisotropy > 0 != e > 0 && this.version++, this._anisotropy = e;
  }
  get clearcoat() {
    return this._clearcoat;
  }
  set clearcoat(e) {
    this._clearcoat > 0 != e > 0 && this.version++, this._clearcoat = e;
  }
  get iridescence() {
    return this._iridescence;
  }
  set iridescence(e) {
    this._iridescence > 0 != e > 0 && this.version++, this._iridescence = e;
  }
  get dispersion() {
    return this._dispersion;
  }
  set dispersion(e) {
    this._dispersion > 0 != e > 0 && this.version++, this._dispersion = e;
  }
  get sheen() {
    return this._sheen;
  }
  set sheen(e) {
    this._sheen > 0 != e > 0 && this.version++, this._sheen = e;
  }
  get transmission() {
    return this._transmission;
  }
  set transmission(e) {
    this._transmission > 0 != e > 0 && this.version++, this._transmission = e;
  }
  copy(e) {
    return super.copy(e), this.defines = {
      STANDARD: "",
      PHYSICAL: ""
    }, this.anisotropy = e.anisotropy, this.anisotropyRotation = e.anisotropyRotation, this.anisotropyMap = e.anisotropyMap, this.clearcoat = e.clearcoat, this.clearcoatMap = e.clearcoatMap, this.clearcoatRoughness = e.clearcoatRoughness, this.clearcoatRoughnessMap = e.clearcoatRoughnessMap, this.clearcoatNormalMap = e.clearcoatNormalMap, this.clearcoatNormalScale.copy(e.clearcoatNormalScale), this.dispersion = e.dispersion, this.ior = e.ior, this.iridescence = e.iridescence, this.iridescenceMap = e.iridescenceMap, this.iridescenceIOR = e.iridescenceIOR, this.iridescenceThicknessRange = [...e.iridescenceThicknessRange], this.iridescenceThicknessMap = e.iridescenceThicknessMap, this.sheen = e.sheen, this.sheenColor.copy(e.sheenColor), this.sheenColorMap = e.sheenColorMap, this.sheenRoughness = e.sheenRoughness, this.sheenRoughnessMap = e.sheenRoughnessMap, this.transmission = e.transmission, this.transmissionMap = e.transmissionMap, this.thickness = e.thickness, this.thicknessMap = e.thicknessMap, this.attenuationDistance = e.attenuationDistance, this.attenuationColor.copy(e.attenuationColor), this.specularIntensity = e.specularIntensity, this.specularIntensityMap = e.specularIntensityMap, this.specularColor.copy(e.specularColor), this.specularColorMap = e.specularColorMap, this;
  }
}
class ff extends Fn {
  constructor(e) {
    super(), this.isMeshDepthMaterial = !0, this.type = "MeshDepthMaterial", this.depthPacking = Gu, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.depthPacking = e.depthPacking, this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this;
  }
}
class pf extends Fn {
  constructor(e) {
    super(), this.isMeshDistanceMaterial = !0, this.type = "MeshDistanceMaterial", this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this;
  }
}
function Ur(i, e, t) {
  return !i || // let 'undefined' and 'null' pass
  !t && i.constructor === e ? i : typeof e.BYTES_PER_ELEMENT == "number" ? new e(i) : Array.prototype.slice.call(i);
}
function mf(i) {
  return ArrayBuffer.isView(i) && !(i instanceof DataView);
}
function gf(i) {
  function e(s, r) {
    return i[s] - i[r];
  }
  const t = i.length, n = new Array(t);
  for (let s = 0; s !== t; ++s) n[s] = s;
  return n.sort(e), n;
}
function al(i, e, t) {
  const n = i.length, s = new i.constructor(n);
  for (let r = 0, o = 0; o !== n; ++r) {
    const a = t[r] * e;
    for (let c = 0; c !== e; ++c)
      s[o++] = i[a + c];
  }
  return s;
}
function Gh(i, e, t, n) {
  let s = 1, r = i[0];
  for (; r !== void 0 && r[n] === void 0; )
    r = i[s++];
  if (r === void 0) return;
  let o = r[n];
  if (o !== void 0)
    if (Array.isArray(o))
      do
        o = r[n], o !== void 0 && (e.push(r.time), t.push.apply(t, o)), r = i[s++];
      while (r !== void 0);
    else if (o.toArray !== void 0)
      do
        o = r[n], o !== void 0 && (e.push(r.time), o.toArray(t, t.length)), r = i[s++];
      while (r !== void 0);
    else
      do
        o = r[n], o !== void 0 && (e.push(r.time), t.push(o)), r = i[s++];
      while (r !== void 0);
}
class lr {
  constructor(e, t, n, s) {
    this.parameterPositions = e, this._cachedIndex = 0, this.resultBuffer = s !== void 0 ? s : new t.constructor(n), this.sampleValues = t, this.valueSize = n, this.settings = null, this.DefaultSettings_ = {};
  }
  evaluate(e) {
    const t = this.parameterPositions;
    let n = this._cachedIndex, s = t[n], r = t[n - 1];
    e: {
      t: {
        let o;
        n: {
          i: if (!(e < s)) {
            for (let a = n + 2; ; ) {
              if (s === void 0) {
                if (e < r) break i;
                return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
              }
              if (n === a) break;
              if (r = s, s = t[++n], e < s)
                break t;
            }
            o = t.length;
            break n;
          }
          if (!(e >= r)) {
            const a = t[1];
            e < a && (n = 2, r = a);
            for (let c = n - 2; ; ) {
              if (r === void 0)
                return this._cachedIndex = 0, this.copySampleValue_(0);
              if (n === c) break;
              if (s = r, r = t[--n - 1], e >= r)
                break t;
            }
            o = n, n = 0;
            break n;
          }
          break e;
        }
        for (; n < o; ) {
          const a = n + o >>> 1;
          e < t[a] ? o = a : n = a + 1;
        }
        if (s = t[n], r = t[n - 1], r === void 0)
          return this._cachedIndex = 0, this.copySampleValue_(0);
        if (s === void 0)
          return n = t.length, this._cachedIndex = n, this.copySampleValue_(n - 1);
      }
      this._cachedIndex = n, this.intervalChanged_(n, r, s);
    }
    return this.interpolate_(n, r, e, s);
  }
  getSettings_() {
    return this.settings || this.DefaultSettings_;
  }
  copySampleValue_(e) {
    const t = this.resultBuffer, n = this.sampleValues, s = this.valueSize, r = e * s;
    for (let o = 0; o !== s; ++o)
      t[o] = n[r + o];
    return t;
  }
  // Template methods for derived classes:
  interpolate_() {
    throw new Error("call to abstract method");
  }
  intervalChanged_() {
  }
}
class _f extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
      endingStart: rs,
      endingEnd: rs
    };
  }
  intervalChanged_(e, t, n) {
    const s = this.parameterPositions;
    let r = e - 2, o = e + 1, a = s[r], c = s[o];
    if (a === void 0)
      switch (this.getSettings_().endingStart) {
        case os:
          r = e, a = 2 * t - n;
          break;
        case Jr:
          r = s.length - 2, a = t + s[r] - s[r + 1];
          break;
        default:
          r = e, a = n;
      }
    if (c === void 0)
      switch (this.getSettings_().endingEnd) {
        case os:
          o = e, c = 2 * n - t;
          break;
        case Jr:
          o = 1, c = n + s[1] - s[0];
          break;
        default:
          o = e - 1, c = t;
      }
    const l = (n - t) * 0.5, h = this.valueSize;
    this._weightPrev = l / (t - a), this._weightNext = l / (c - n), this._offsetPrev = r * h, this._offsetNext = o * h;
  }
  interpolate_(e, t, n, s) {
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = e * a, l = c - a, h = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, g = (n - t) / (s - t), _ = g * g, m = _ * g, p = -d * m + 2 * d * _ - d * g, x = (1 + d) * m + (-1.5 - 2 * d) * _ + (-0.5 + d) * g + 1, y = (-1 - f) * m + (1.5 + f) * _ + 0.5 * g, v = f * m - f * _;
    for (let P = 0; P !== a; ++P)
      r[P] = p * o[h + P] + x * o[l + P] + y * o[c + P] + v * o[u + P];
    return r;
  }
}
class Wh extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s);
  }
  interpolate_(e, t, n, s) {
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = e * a, l = c - a, h = (n - t) / (s - t), u = 1 - h;
    for (let d = 0; d !== a; ++d)
      r[d] = o[l + d] * u + o[c + d] * h;
    return r;
  }
}
class vf extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s);
  }
  interpolate_(e) {
    return this.copySampleValue_(e - 1);
  }
}
class zn {
  constructor(e, t, n, s) {
    if (e === void 0) throw new Error("THREE.KeyframeTrack: track name is undefined");
    if (t === void 0 || t.length === 0) throw new Error("THREE.KeyframeTrack: no keyframes in track named " + e);
    this.name = e, this.times = Ur(t, this.TimeBufferType), this.values = Ur(n, this.ValueBufferType), this.setInterpolation(s || this.DefaultInterpolation);
  }
  // Serialization (in static context, because of constructor invocation
  // and automatic invocation of .toJSON):
  static toJSON(e) {
    const t = e.constructor;
    let n;
    if (t.toJSON !== this.toJSON)
      n = t.toJSON(e);
    else {
      n = {
        name: e.name,
        times: Ur(e.times, Array),
        values: Ur(e.values, Array)
      };
      const s = e.getInterpolation();
      s !== e.DefaultInterpolation && (n.interpolation = s);
    }
    return n.type = e.ValueTypeName, n;
  }
  InterpolantFactoryMethodDiscrete(e) {
    return new vf(this.times, this.values, this.getValueSize(), e);
  }
  InterpolantFactoryMethodLinear(e) {
    return new Wh(this.times, this.values, this.getValueSize(), e);
  }
  InterpolantFactoryMethodSmooth(e) {
    return new _f(this.times, this.values, this.getValueSize(), e);
  }
  setInterpolation(e) {
    let t;
    switch (e) {
      case sr:
        t = this.InterpolantFactoryMethodDiscrete;
        break;
      case rr:
        t = this.InterpolantFactoryMethodLinear;
        break;
      case co:
        t = this.InterpolantFactoryMethodSmooth;
        break;
    }
    if (t === void 0) {
      const n = "unsupported interpolation for " + this.ValueTypeName + " keyframe track named " + this.name;
      if (this.createInterpolant === void 0)
        if (e !== this.DefaultInterpolation)
          this.setInterpolation(this.DefaultInterpolation);
        else
          throw new Error(n);
      return console.warn("THREE.KeyframeTrack:", n), this;
    }
    return this.createInterpolant = t, this;
  }
  getInterpolation() {
    switch (this.createInterpolant) {
      case this.InterpolantFactoryMethodDiscrete:
        return sr;
      case this.InterpolantFactoryMethodLinear:
        return rr;
      case this.InterpolantFactoryMethodSmooth:
        return co;
    }
  }
  getValueSize() {
    return this.values.length / this.times.length;
  }
  // move all keyframes either forwards or backwards in time
  shift(e) {
    if (e !== 0) {
      const t = this.times;
      for (let n = 0, s = t.length; n !== s; ++n)
        t[n] += e;
    }
    return this;
  }
  // scale all keyframe times by a factor (useful for frame <-> seconds conversions)
  scale(e) {
    if (e !== 1) {
      const t = this.times;
      for (let n = 0, s = t.length; n !== s; ++n)
        t[n] *= e;
    }
    return this;
  }
  // removes keyframes before and after animation without changing any values within the range [startTime, endTime].
  // IMPORTANT: We do not shift around keys to the start of the track time, because for interpolated keys this will change their values
  trim(e, t) {
    const n = this.times, s = n.length;
    let r = 0, o = s - 1;
    for (; r !== s && n[r] < e; )
      ++r;
    for (; o !== -1 && n[o] > t; )
      --o;
    if (++o, r !== 0 || o !== s) {
      r >= o && (o = Math.max(o, 1), r = o - 1);
      const a = this.getValueSize();
      this.times = n.slice(r, o), this.values = this.values.slice(r * a, o * a);
    }
    return this;
  }
  // ensure we do not get a GarbageInGarbageOut situation, make sure tracks are at least minimally viable
  validate() {
    let e = !0;
    const t = this.getValueSize();
    t - Math.floor(t) !== 0 && (console.error("THREE.KeyframeTrack: Invalid value size in track.", this), e = !1);
    const n = this.times, s = this.values, r = n.length;
    r === 0 && (console.error("THREE.KeyframeTrack: Track is empty.", this), e = !1);
    let o = null;
    for (let a = 0; a !== r; a++) {
      const c = n[a];
      if (typeof c == "number" && isNaN(c)) {
        console.error("THREE.KeyframeTrack: Time is not a valid number.", this, a, c), e = !1;
        break;
      }
      if (o !== null && o > c) {
        console.error("THREE.KeyframeTrack: Out of order keys.", this, a, c, o), e = !1;
        break;
      }
      o = c;
    }
    if (s !== void 0 && mf(s))
      for (let a = 0, c = s.length; a !== c; ++a) {
        const l = s[a];
        if (isNaN(l)) {
          console.error("THREE.KeyframeTrack: Value is not a valid number.", this, a, l), e = !1;
          break;
        }
      }
    return e;
  }
  // removes equivalent sequential keys as common in morph target sequences
  // (0,0,0,0,1,1,1,0,0,0,0,0,0,0) --> (0,0,1,1,0,0)
  optimize() {
    const e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), s = this.getInterpolation() === co, r = e.length - 1;
    let o = 1;
    for (let a = 1; a < r; ++a) {
      let c = !1;
      const l = e[a], h = e[a + 1];
      if (l !== h && (a !== 1 || l !== e[0]))
        if (s)
          c = !0;
        else {
          const u = a * n, d = u - n, f = u + n;
          for (let g = 0; g !== n; ++g) {
            const _ = t[u + g];
            if (_ !== t[d + g] || _ !== t[f + g]) {
              c = !0;
              break;
            }
          }
        }
      if (c) {
        if (a !== o) {
          e[o] = e[a];
          const u = a * n, d = o * n;
          for (let f = 0; f !== n; ++f)
            t[d + f] = t[u + f];
        }
        ++o;
      }
    }
    if (r > 0) {
      e[o] = e[r];
      for (let a = r * n, c = o * n, l = 0; l !== n; ++l)
        t[c + l] = t[a + l];
      ++o;
    }
    return o !== e.length ? (this.times = e.slice(0, o), this.values = t.slice(0, o * n)) : (this.times = e, this.values = t), this;
  }
  clone() {
    const e = this.times.slice(), t = this.values.slice(), n = this.constructor, s = new n(this.name, e, t);
    return s.createInterpolant = this.createInterpolant, s;
  }
}
zn.prototype.TimeBufferType = Float32Array;
zn.prototype.ValueBufferType = Float32Array;
zn.prototype.DefaultInterpolation = rr;
class Rs extends zn {
  // No interpolation parameter because only InterpolateDiscrete is valid.
  constructor(e, t, n) {
    super(e, t, n);
  }
}
Rs.prototype.ValueTypeName = "bool";
Rs.prototype.ValueBufferType = Array;
Rs.prototype.DefaultInterpolation = sr;
Rs.prototype.InterpolantFactoryMethodLinear = void 0;
Rs.prototype.InterpolantFactoryMethodSmooth = void 0;
class Xh extends zn {
}
Xh.prototype.ValueTypeName = "color";
class bs extends zn {
}
bs.prototype.ValueTypeName = "number";
class xf extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s);
  }
  interpolate_(e, t, n, s) {
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = (n - t) / (s - t);
    let l = e * a;
    for (let h = l + a; l !== h; l += 4)
      mn.slerpFlat(r, 0, o, l - a, o, l, c);
    return r;
  }
}
class Fi extends zn {
  InterpolantFactoryMethodLinear(e) {
    return new xf(this.times, this.values, this.getValueSize(), e);
  }
}
Fi.prototype.ValueTypeName = "quaternion";
Fi.prototype.InterpolantFactoryMethodSmooth = void 0;
class Cs extends zn {
  // No interpolation parameter because only InterpolateDiscrete is valid.
  constructor(e, t, n) {
    super(e, t, n);
  }
}
Cs.prototype.ValueTypeName = "string";
Cs.prototype.ValueBufferType = Array;
Cs.prototype.DefaultInterpolation = sr;
Cs.prototype.InterpolantFactoryMethodLinear = void 0;
Cs.prototype.InterpolantFactoryMethodSmooth = void 0;
class ws extends zn {
}
ws.prototype.ValueTypeName = "vector";
class io {
  constructor(e = "", t = -1, n = [], s = tc) {
    this.name = e, this.tracks = n, this.duration = t, this.blendMode = s, this.uuid = Pn(), this.duration < 0 && this.resetDuration();
  }
  static parse(e) {
    const t = [], n = e.tracks, s = 1 / (e.fps || 1);
    for (let o = 0, a = n.length; o !== a; ++o)
      t.push(Sf(n[o]).scale(s));
    const r = new this(e.name, e.duration, t, e.blendMode);
    return r.uuid = e.uuid, r;
  }
  static toJSON(e) {
    const t = [], n = e.tracks, s = {
      name: e.name,
      duration: e.duration,
      tracks: t,
      uuid: e.uuid,
      blendMode: e.blendMode
    };
    for (let r = 0, o = n.length; r !== o; ++r)
      t.push(zn.toJSON(n[r]));
    return s;
  }
  static CreateFromMorphTargetSequence(e, t, n, s) {
    const r = t.length, o = [];
    for (let a = 0; a < r; a++) {
      let c = [], l = [];
      c.push(
        (a + r - 1) % r,
        a,
        (a + 1) % r
      ), l.push(0, 1, 0);
      const h = gf(c);
      c = al(c, 1, h), l = al(l, 1, h), !s && c[0] === 0 && (c.push(r), l.push(l[0])), o.push(
        new bs(
          ".morphTargetInfluences[" + t[a].name + "]",
          c,
          l
        ).scale(1 / n)
      );
    }
    return new this(e, -1, o);
  }
  static findByName(e, t) {
    let n = e;
    if (!Array.isArray(e)) {
      const s = e;
      n = s.geometry && s.geometry.animations || s.animations;
    }
    for (let s = 0; s < n.length; s++)
      if (n[s].name === t)
        return n[s];
    return null;
  }
  static CreateClipsFromMorphTargetSequences(e, t, n) {
    const s = {}, r = /^([\w-]*?)([\d]+)$/;
    for (let a = 0, c = e.length; a < c; a++) {
      const l = e[a], h = l.name.match(r);
      if (h && h.length > 1) {
        const u = h[1];
        let d = s[u];
        d || (s[u] = d = []), d.push(l);
      }
    }
    const o = [];
    for (const a in s)
      o.push(this.CreateFromMorphTargetSequence(a, s[a], t, n));
    return o;
  }
  // parse the animation.hierarchy format
  static parseAnimation(e, t) {
    if (!e)
      return console.error("THREE.AnimationClip: No animation in JSONLoader data."), null;
    const n = function(u, d, f, g, _) {
      if (f.length !== 0) {
        const m = [], p = [];
        Gh(f, m, p, g), m.length !== 0 && _.push(new u(d, m, p));
      }
    }, s = [], r = e.name || "default", o = e.fps || 30, a = e.blendMode;
    let c = e.length || -1;
    const l = e.hierarchy || [];
    for (let u = 0; u < l.length; u++) {
      const d = l[u].keys;
      if (!(!d || d.length === 0))
        if (d[0].morphTargets) {
          const f = {};
          let g;
          for (g = 0; g < d.length; g++)
            if (d[g].morphTargets)
              for (let _ = 0; _ < d[g].morphTargets.length; _++)
                f[d[g].morphTargets[_]] = -1;
          for (const _ in f) {
            const m = [], p = [];
            for (let x = 0; x !== d[g].morphTargets.length; ++x) {
              const y = d[g];
              m.push(y.time), p.push(y.morphTarget === _ ? 1 : 0);
            }
            s.push(new bs(".morphTargetInfluence[" + _ + "]", m, p));
          }
          c = f.length * o;
        } else {
          const f = ".bones[" + t[u].name + "]";
          n(
            ws,
            f + ".position",
            d,
            "pos",
            s
          ), n(
            Fi,
            f + ".quaternion",
            d,
            "rot",
            s
          ), n(
            ws,
            f + ".scale",
            d,
            "scl",
            s
          );
        }
    }
    return s.length === 0 ? null : new this(r, c, s, a);
  }
  resetDuration() {
    const e = this.tracks;
    let t = 0;
    for (let n = 0, s = e.length; n !== s; ++n) {
      const r = this.tracks[n];
      t = Math.max(t, r.times[r.times.length - 1]);
    }
    return this.duration = t, this;
  }
  trim() {
    for (let e = 0; e < this.tracks.length; e++)
      this.tracks[e].trim(0, this.duration);
    return this;
  }
  validate() {
    let e = !0;
    for (let t = 0; t < this.tracks.length; t++)
      e = e && this.tracks[t].validate();
    return e;
  }
  optimize() {
    for (let e = 0; e < this.tracks.length; e++)
      this.tracks[e].optimize();
    return this;
  }
  clone() {
    const e = [];
    for (let t = 0; t < this.tracks.length; t++)
      e.push(this.tracks[t].clone());
    return new this.constructor(this.name, this.duration, e, this.blendMode);
  }
  toJSON() {
    return this.constructor.toJSON(this);
  }
}
function yf(i) {
  switch (i.toLowerCase()) {
    case "scalar":
    case "double":
    case "float":
    case "number":
    case "integer":
      return bs;
    case "vector":
    case "vector2":
    case "vector3":
    case "vector4":
      return ws;
    case "color":
      return Xh;
    case "quaternion":
      return Fi;
    case "bool":
    case "boolean":
      return Rs;
    case "string":
      return Cs;
  }
  throw new Error("THREE.KeyframeTrack: Unsupported typeName: " + i);
}
function Sf(i) {
  if (i.type === void 0)
    throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");
  const e = yf(i.type);
  if (i.times === void 0) {
    const t = [], n = [];
    Gh(i.keys, t, n, "value"), i.times = t, i.values = n;
  }
  return e.parse !== void 0 ? e.parse(i) : new e(i.name, i.times, i.values, i.interpolation);
}
const _i = {
  enabled: !1,
  files: {},
  add: function(i, e) {
    this.enabled !== !1 && (this.files[i] = e);
  },
  get: function(i) {
    if (this.enabled !== !1)
      return this.files[i];
  },
  remove: function(i) {
    delete this.files[i];
  },
  clear: function() {
    this.files = {};
  }
};
class bf {
  constructor(e, t, n) {
    const s = this;
    let r = !1, o = 0, a = 0, c;
    const l = [];
    this.onStart = void 0, this.onLoad = e, this.onProgress = t, this.onError = n, this.itemStart = function(h) {
      a++, r === !1 && s.onStart !== void 0 && s.onStart(h, o, a), r = !0;
    }, this.itemEnd = function(h) {
      o++, s.onProgress !== void 0 && s.onProgress(h, o, a), o === a && (r = !1, s.onLoad !== void 0 && s.onLoad());
    }, this.itemError = function(h) {
      s.onError !== void 0 && s.onError(h);
    }, this.resolveURL = function(h) {
      return c ? c(h) : h;
    }, this.setURLModifier = function(h) {
      return c = h, this;
    }, this.addHandler = function(h, u) {
      return l.push(h, u), this;
    }, this.removeHandler = function(h) {
      const u = l.indexOf(h);
      return u !== -1 && l.splice(u, 2), this;
    }, this.getHandler = function(h) {
      for (let u = 0, d = l.length; u < d; u += 2) {
        const f = l[u], g = l[u + 1];
        if (f.global && (f.lastIndex = 0), f.test(h))
          return g;
      }
      return null;
    };
  }
}
const wf = /* @__PURE__ */ new bf();
class Ps {
  constructor(e) {
    this.manager = e !== void 0 ? e : wf, this.crossOrigin = "anonymous", this.withCredentials = !1, this.path = "", this.resourcePath = "", this.requestHeader = {};
  }
  load() {
  }
  loadAsync(e, t) {
    const n = this;
    return new Promise(function(s, r) {
      n.load(e, s, t, r);
    });
  }
  parse() {
  }
  setCrossOrigin(e) {
    return this.crossOrigin = e, this;
  }
  setWithCredentials(e) {
    return this.withCredentials = e, this;
  }
  setPath(e) {
    return this.path = e, this;
  }
  setResourcePath(e) {
    return this.resourcePath = e, this;
  }
  setRequestHeader(e) {
    return this.requestHeader = e, this;
  }
}
Ps.DEFAULT_MATERIAL_NAME = "__DEFAULT";
const Kn = {};
class Ef extends Error {
  constructor(e, t) {
    super(e), this.response = t;
  }
}
class qh extends Ps {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = _i.get(e);
    if (r !== void 0)
      return this.manager.itemStart(e), setTimeout(() => {
        t && t(r), this.manager.itemEnd(e);
      }, 0), r;
    if (Kn[e] !== void 0) {
      Kn[e].push({
        onLoad: t,
        onProgress: n,
        onError: s
      });
      return;
    }
    Kn[e] = [], Kn[e].push({
      onLoad: t,
      onProgress: n,
      onError: s
    });
    const o = new Request(e, {
      headers: new Headers(this.requestHeader),
      credentials: this.withCredentials ? "include" : "same-origin"
      // An abort controller could be added within a future PR
    }), a = this.mimeType, c = this.responseType;
    fetch(o).then((l) => {
      if (l.status === 200 || l.status === 0) {
        if (l.status === 0 && console.warn("THREE.FileLoader: HTTP Status 0 received."), typeof ReadableStream > "u" || l.body === void 0 || l.body.getReader === void 0)
          return l;
        const h = Kn[e], u = l.body.getReader(), d = l.headers.get("X-File-Size") || l.headers.get("Content-Length"), f = d ? parseInt(d) : 0, g = f !== 0;
        let _ = 0;
        const m = new ReadableStream({
          start(p) {
            x();
            function x() {
              u.read().then(({ done: y, value: v }) => {
                if (y)
                  p.close();
                else {
                  _ += v.byteLength;
                  const P = new ProgressEvent("progress", { lengthComputable: g, loaded: _, total: f });
                  for (let A = 0, C = h.length; A < C; A++) {
                    const I = h[A];
                    I.onProgress && I.onProgress(P);
                  }
                  p.enqueue(v), x();
                }
              }, (y) => {
                p.error(y);
              });
            }
          }
        });
        return new Response(m);
      } else
        throw new Ef(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`, l);
    }).then((l) => {
      switch (c) {
        case "arraybuffer":
          return l.arrayBuffer();
        case "blob":
          return l.blob();
        case "document":
          return l.text().then((h) => new DOMParser().parseFromString(h, a));
        case "json":
          return l.json();
        default:
          if (a === void 0)
            return l.text();
          {
            const u = /charset="?([^;"\s]*)"?/i.exec(a), d = u && u[1] ? u[1].toLowerCase() : void 0, f = new TextDecoder(d);
            return l.arrayBuffer().then((g) => f.decode(g));
          }
      }
    }).then((l) => {
      _i.add(e, l);
      const h = Kn[e];
      delete Kn[e];
      for (let u = 0, d = h.length; u < d; u++) {
        const f = h[u];
        f.onLoad && f.onLoad(l);
      }
    }).catch((l) => {
      const h = Kn[e];
      if (h === void 0)
        throw this.manager.itemError(e), l;
      delete Kn[e];
      for (let u = 0, d = h.length; u < d; u++) {
        const f = h[u];
        f.onError && f.onError(l);
      }
      this.manager.itemError(e);
    }).finally(() => {
      this.manager.itemEnd(e);
    }), this.manager.itemStart(e);
  }
  setResponseType(e) {
    return this.responseType = e, this;
  }
  setMimeType(e) {
    return this.mimeType = e, this;
  }
}
class Mf extends Ps {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = this, o = _i.get(e);
    if (o !== void 0)
      return r.manager.itemStart(e), setTimeout(function() {
        t && t(o), r.manager.itemEnd(e);
      }, 0), o;
    const a = or("img");
    function c() {
      h(), _i.add(e, this), t && t(this), r.manager.itemEnd(e);
    }
    function l(u) {
      h(), s && s(u), r.manager.itemError(e), r.manager.itemEnd(e);
    }
    function h() {
      a.removeEventListener("load", c, !1), a.removeEventListener("error", l, !1);
    }
    return a.addEventListener("load", c, !1), a.addEventListener("error", l, !1), e.slice(0, 5) !== "data:" && this.crossOrigin !== void 0 && (a.crossOrigin = this.crossOrigin), r.manager.itemStart(e), a.src = e, a;
  }
}
class Tf extends Ps {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    const r = new Ut(), o = new Mf(this.manager);
    return o.setCrossOrigin(this.crossOrigin), o.setPath(this.path), o.load(e, function(a) {
      r.image = a, r.needsUpdate = !0, t !== void 0 && t(r);
    }, n, s), r;
  }
}
class oo extends wt {
  constructor(e, t = 1) {
    super(), this.isLight = !0, this.type = "Light", this.color = new Ie(e), this.intensity = t;
  }
  dispose() {
  }
  copy(e, t) {
    return super.copy(e, t), this.color.copy(e.color), this.intensity = e.intensity, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return t.object.color = this.color.getHex(), t.object.intensity = this.intensity, this.groundColor !== void 0 && (t.object.groundColor = this.groundColor.getHex()), this.distance !== void 0 && (t.object.distance = this.distance), this.angle !== void 0 && (t.object.angle = this.angle), this.decay !== void 0 && (t.object.decay = this.decay), this.penumbra !== void 0 && (t.object.penumbra = this.penumbra), this.shadow !== void 0 && (t.object.shadow = this.shadow.toJSON()), this.target !== void 0 && (t.object.target = this.target.uuid), t;
  }
}
class cl extends oo {
  constructor(e, t, n) {
    super(e, n), this.isHemisphereLight = !0, this.type = "HemisphereLight", this.position.copy(wt.DEFAULT_UP), this.updateMatrix(), this.groundColor = new Ie(t);
  }
  copy(e, t) {
    return super.copy(e, t), this.groundColor.copy(e.groundColor), this;
  }
}
const Fo = /* @__PURE__ */ new Ge(), ll = /* @__PURE__ */ new M(), hl = /* @__PURE__ */ new M();
class pc {
  constructor(e) {
    this.camera = e, this.intensity = 1, this.bias = 0, this.normalBias = 0, this.radius = 1, this.blurSamples = 8, this.mapSize = new ue(512, 512), this.map = null, this.mapPass = null, this.matrix = new Ge(), this.autoUpdate = !0, this.needsUpdate = !1, this._frustum = new rc(), this._frameExtents = new ue(1, 1), this._viewportCount = 1, this._viewports = [
      new dt(0, 0, 1, 1)
    ];
  }
  getViewportCount() {
    return this._viewportCount;
  }
  getFrustum() {
    return this._frustum;
  }
  updateMatrices(e) {
    const t = this.camera, n = this.matrix;
    ll.setFromMatrixPosition(e.matrixWorld), t.position.copy(ll), hl.setFromMatrixPosition(e.target.matrixWorld), t.lookAt(hl), t.updateMatrixWorld(), Fo.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), this._frustum.setFromProjectionMatrix(Fo), n.set(
      0.5,
      0,
      0,
      0.5,
      0,
      0.5,
      0,
      0.5,
      0,
      0,
      0.5,
      0.5,
      0,
      0,
      0,
      1
    ), n.multiply(Fo);
  }
  getViewport(e) {
    return this._viewports[e];
  }
  getFrameExtents() {
    return this._frameExtents;
  }
  dispose() {
    this.map && this.map.dispose(), this.mapPass && this.mapPass.dispose();
  }
  copy(e) {
    return this.camera = e.camera.clone(), this.intensity = e.intensity, this.bias = e.bias, this.radius = e.radius, this.mapSize.copy(e.mapSize), this;
  }
  clone() {
    return new this.constructor().copy(this);
  }
  toJSON() {
    const e = {};
    return this.intensity !== 1 && (e.intensity = this.intensity), this.bias !== 0 && (e.bias = this.bias), this.normalBias !== 0 && (e.normalBias = this.normalBias), this.radius !== 1 && (e.radius = this.radius), (this.mapSize.x !== 512 || this.mapSize.y !== 512) && (e.mapSize = this.mapSize.toArray()), e.camera = this.camera.toJSON(!1).object, delete e.camera.matrix, e;
  }
}
class Af extends pc {
  constructor() {
    super(new en(50, 1, 0.5, 500)), this.isSpotLightShadow = !0, this.focus = 1;
  }
  updateMatrices(e) {
    const t = this.camera, n = ys * 2 * e.angle * this.focus, s = this.mapSize.width / this.mapSize.height, r = e.distance || t.far;
    (n !== t.fov || s !== t.aspect || r !== t.far) && (t.fov = n, t.aspect = s, t.far = r, t.updateProjectionMatrix()), super.updateMatrices(e);
  }
  copy(e) {
    return super.copy(e), this.focus = e.focus, this;
  }
}
class Rf extends oo {
  constructor(e, t, n = 0, s = Math.PI / 3, r = 0, o = 2) {
    super(e, t), this.isSpotLight = !0, this.type = "SpotLight", this.position.copy(wt.DEFAULT_UP), this.updateMatrix(), this.target = new wt(), this.distance = n, this.angle = s, this.penumbra = r, this.decay = o, this.map = null, this.shadow = new Af();
  }
  get power() {
    return this.intensity * Math.PI;
  }
  set power(e) {
    this.intensity = e / Math.PI;
  }
  dispose() {
    this.shadow.dispose();
  }
  copy(e, t) {
    return super.copy(e, t), this.distance = e.distance, this.angle = e.angle, this.penumbra = e.penumbra, this.decay = e.decay, this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
  }
}
const ul = /* @__PURE__ */ new Ge(), qs = /* @__PURE__ */ new M(), Oo = /* @__PURE__ */ new M();
class Cf extends pc {
  constructor() {
    super(new en(90, 1, 0.5, 500)), this.isPointLightShadow = !0, this._frameExtents = new ue(4, 2), this._viewportCount = 6, this._viewports = [
      // These viewports map a cube-map onto a 2D texture with the
      // following orientation:
      //
      //  xzXZ
      //   y Y
      //
      // X - Positive x direction
      // x - Negative x direction
      // Y - Positive y direction
      // y - Negative y direction
      // Z - Positive z direction
      // z - Negative z direction
      // positive X
      new dt(2, 1, 1, 1),
      // negative X
      new dt(0, 1, 1, 1),
      // positive Z
      new dt(3, 1, 1, 1),
      // negative Z
      new dt(1, 1, 1, 1),
      // positive Y
      new dt(3, 0, 1, 1),
      // negative Y
      new dt(1, 0, 1, 1)
    ], this._cubeDirections = [
      new M(1, 0, 0),
      new M(-1, 0, 0),
      new M(0, 0, 1),
      new M(0, 0, -1),
      new M(0, 1, 0),
      new M(0, -1, 0)
    ], this._cubeUps = [
      new M(0, 1, 0),
      new M(0, 1, 0),
      new M(0, 1, 0),
      new M(0, 1, 0),
      new M(0, 0, 1),
      new M(0, 0, -1)
    ];
  }
  updateMatrices(e, t = 0) {
    const n = this.camera, s = this.matrix, r = e.distance || n.far;
    r !== n.far && (n.far = r, n.updateProjectionMatrix()), qs.setFromMatrixPosition(e.matrixWorld), n.position.copy(qs), Oo.copy(n.position), Oo.add(this._cubeDirections[t]), n.up.copy(this._cubeUps[t]), n.lookAt(Oo), n.updateMatrixWorld(), s.makeTranslation(-qs.x, -qs.y, -qs.z), ul.multiplyMatrices(n.projectionMatrix, n.matrixWorldInverse), this._frustum.setFromProjectionMatrix(ul);
  }
}
class mc extends oo {
  constructor(e, t, n = 0, s = 2) {
    super(e, t), this.isPointLight = !0, this.type = "PointLight", this.distance = n, this.decay = s, this.shadow = new Cf();
  }
  get power() {
    return this.intensity * 4 * Math.PI;
  }
  set power(e) {
    this.intensity = e / (4 * Math.PI);
  }
  dispose() {
    this.shadow.dispose();
  }
  copy(e, t) {
    return super.copy(e, t), this.distance = e.distance, this.decay = e.decay, this.shadow = e.shadow.clone(), this;
  }
}
class gc extends Ph {
  constructor(e = -1, t = 1, n = 1, s = -1, r = 0.1, o = 2e3) {
    super(), this.isOrthographicCamera = !0, this.type = "OrthographicCamera", this.zoom = 1, this.view = null, this.left = e, this.right = t, this.top = n, this.bottom = s, this.near = r, this.far = o, this.updateProjectionMatrix();
  }
  copy(e, t) {
    return super.copy(e, t), this.left = e.left, this.right = e.right, this.top = e.top, this.bottom = e.bottom, this.near = e.near, this.far = e.far, this.zoom = e.zoom, this.view = e.view === null ? null : Object.assign({}, e.view), this;
  }
  setViewOffset(e, t, n, s, r, o) {
    this.view === null && (this.view = {
      enabled: !0,
      fullWidth: 1,
      fullHeight: 1,
      offsetX: 0,
      offsetY: 0,
      width: 1,
      height: 1
    }), this.view.enabled = !0, this.view.fullWidth = e, this.view.fullHeight = t, this.view.offsetX = n, this.view.offsetY = s, this.view.width = r, this.view.height = o, this.updateProjectionMatrix();
  }
  clearViewOffset() {
    this.view !== null && (this.view.enabled = !1), this.updateProjectionMatrix();
  }
  updateProjectionMatrix() {
    const e = (this.right - this.left) / (2 * this.zoom), t = (this.top - this.bottom) / (2 * this.zoom), n = (this.right + this.left) / 2, s = (this.top + this.bottom) / 2;
    let r = n - e, o = n + e, a = s + t, c = s - t;
    if (this.view !== null && this.view.enabled) {
      const l = (this.right - this.left) / this.view.fullWidth / this.zoom, h = (this.top - this.bottom) / this.view.fullHeight / this.zoom;
      r += l * this.view.offsetX, o = r + l * this.view.width, a -= h * this.view.offsetY, c = a - h * this.view.height;
    }
    this.projectionMatrix.makeOrthographic(r, o, a, c, this.near, this.far, this.coordinateSystem), this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return t.object.zoom = this.zoom, t.object.left = this.left, t.object.right = this.right, t.object.top = this.top, t.object.bottom = this.bottom, t.object.near = this.near, t.object.far = this.far, this.view !== null && (t.object.view = Object.assign({}, this.view)), t;
  }
}
class Pf extends pc {
  constructor() {
    super(new gc(-5, 5, 5, -5, 0.5, 500)), this.isDirectionalLightShadow = !0;
  }
}
class Ga extends oo {
  constructor(e, t) {
    super(e, t), this.isDirectionalLight = !0, this.type = "DirectionalLight", this.position.copy(wt.DEFAULT_UP), this.updateMatrix(), this.target = new wt(), this.shadow = new Pf();
  }
  dispose() {
    this.shadow.dispose();
  }
  copy(e) {
    return super.copy(e), this.target = e.target.clone(), this.shadow = e.shadow.clone(), this;
  }
}
class nr {
  static decodeText(e) {
    if (console.warn("THREE.LoaderUtils: decodeText() has been deprecated with r165 and will be removed with r175. Use TextDecoder instead."), typeof TextDecoder < "u")
      return new TextDecoder().decode(e);
    let t = "";
    for (let n = 0, s = e.length; n < s; n++)
      t += String.fromCharCode(e[n]);
    try {
      return decodeURIComponent(escape(t));
    } catch {
      return t;
    }
  }
  static extractUrlBase(e) {
    const t = e.lastIndexOf("/");
    return t === -1 ? "./" : e.slice(0, t + 1);
  }
  static resolveURL(e, t) {
    return typeof e != "string" || e === "" ? "" : (/^https?:\/\//i.test(t) && /^\//.test(e) && (t = t.replace(/(^https?:\/\/[^\/]+).*/i, "$1")), /^(https?:)?\/\//i.test(e) || /^data:.*,.*$/i.test(e) || /^blob:.*$/i.test(e) ? e : t + e);
  }
}
class If extends Ps {
  constructor(e) {
    super(e), this.isImageBitmapLoader = !0, typeof createImageBitmap > "u" && console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."), typeof fetch > "u" && console.warn("THREE.ImageBitmapLoader: fetch() not supported."), this.options = { premultiplyAlpha: "none" };
  }
  setOptions(e) {
    return this.options = e, this;
  }
  load(e, t, n, s) {
    e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = this, o = _i.get(e);
    if (o !== void 0) {
      if (r.manager.itemStart(e), o.then) {
        o.then((l) => {
          t && t(l), r.manager.itemEnd(e);
        }).catch((l) => {
          s && s(l);
        });
        return;
      }
      return setTimeout(function() {
        t && t(o), r.manager.itemEnd(e);
      }, 0), o;
    }
    const a = {};
    a.credentials = this.crossOrigin === "anonymous" ? "same-origin" : "include", a.headers = this.requestHeader;
    const c = fetch(e, a).then(function(l) {
      return l.blob();
    }).then(function(l) {
      return createImageBitmap(l, Object.assign(r.options, { colorSpaceConversion: "none" }));
    }).then(function(l) {
      return _i.add(e, l), t && t(l), r.manager.itemEnd(e), l;
    }).catch(function(l) {
      s && s(l), _i.remove(e), r.manager.itemError(e), r.manager.itemEnd(e);
    });
    _i.add(e, c), r.manager.itemStart(e);
  }
}
class Lf extends en {
  constructor(e = []) {
    super(), this.isArrayCamera = !0, this.cameras = e;
  }
}
class Df {
  constructor(e = !0) {
    this.autoStart = e, this.startTime = 0, this.oldTime = 0, this.elapsedTime = 0, this.running = !1;
  }
  start() {
    this.startTime = dl(), this.oldTime = this.startTime, this.elapsedTime = 0, this.running = !0;
  }
  stop() {
    this.getElapsedTime(), this.running = !1, this.autoStart = !1;
  }
  getElapsedTime() {
    return this.getDelta(), this.elapsedTime;
  }
  getDelta() {
    let e = 0;
    if (this.autoStart && !this.running)
      return this.start(), 0;
    if (this.running) {
      const t = dl();
      e = (t - this.oldTime) / 1e3, this.oldTime = t, this.elapsedTime += e;
    }
    return e;
  }
}
function dl() {
  return performance.now();
}
class Nf {
  constructor(e, t, n) {
    this.binding = e, this.valueSize = n;
    let s, r, o;
    switch (t) {
      case "quaternion":
        s = this._slerp, r = this._slerpAdditive, o = this._setAdditiveIdentityQuaternion, this.buffer = new Float64Array(n * 6), this._workIndex = 5;
        break;
      case "string":
      case "bool":
        s = this._select, r = this._select, o = this._setAdditiveIdentityOther, this.buffer = new Array(n * 5);
        break;
      default:
        s = this._lerp, r = this._lerpAdditive, o = this._setAdditiveIdentityNumeric, this.buffer = new Float64Array(n * 5);
    }
    this._mixBufferRegion = s, this._mixBufferRegionAdditive = r, this._setIdentity = o, this._origIndex = 3, this._addIndex = 4, this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0, this.useCount = 0, this.referenceCount = 0;
  }
  // accumulate data in the 'incoming' region into 'accu<i>'
  accumulate(e, t) {
    const n = this.buffer, s = this.valueSize, r = e * s + s;
    let o = this.cumulativeWeight;
    if (o === 0) {
      for (let a = 0; a !== s; ++a)
        n[r + a] = n[a];
      o = t;
    } else {
      o += t;
      const a = t / o;
      this._mixBufferRegion(n, r, 0, a, s);
    }
    this.cumulativeWeight = o;
  }
  // accumulate data in the 'incoming' region into 'add'
  accumulateAdditive(e) {
    const t = this.buffer, n = this.valueSize, s = n * this._addIndex;
    this.cumulativeWeightAdditive === 0 && this._setIdentity(), this._mixBufferRegionAdditive(t, s, 0, e, n), this.cumulativeWeightAdditive += e;
  }
  // apply the state of 'accu<i>' to the binding when accus differ
  apply(e) {
    const t = this.valueSize, n = this.buffer, s = e * t + t, r = this.cumulativeWeight, o = this.cumulativeWeightAdditive, a = this.binding;
    if (this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0, r < 1) {
      const c = t * this._origIndex;
      this._mixBufferRegion(
        n,
        s,
        c,
        1 - r,
        t
      );
    }
    o > 0 && this._mixBufferRegionAdditive(n, s, this._addIndex * t, 1, t);
    for (let c = t, l = t + t; c !== l; ++c)
      if (n[c] !== n[c + t]) {
        a.setValue(n, s);
        break;
      }
  }
  // remember the state of the bound property and copy it to both accus
  saveOriginalState() {
    const e = this.binding, t = this.buffer, n = this.valueSize, s = n * this._origIndex;
    e.getValue(t, s);
    for (let r = n, o = s; r !== o; ++r)
      t[r] = t[s + r % n];
    this._setIdentity(), this.cumulativeWeight = 0, this.cumulativeWeightAdditive = 0;
  }
  // apply the state previously taken via 'saveOriginalState' to the binding
  restoreOriginalState() {
    const e = this.valueSize * 3;
    this.binding.setValue(this.buffer, e);
  }
  _setAdditiveIdentityNumeric() {
    const e = this._addIndex * this.valueSize, t = e + this.valueSize;
    for (let n = e; n < t; n++)
      this.buffer[n] = 0;
  }
  _setAdditiveIdentityQuaternion() {
    this._setAdditiveIdentityNumeric(), this.buffer[this._addIndex * this.valueSize + 3] = 1;
  }
  _setAdditiveIdentityOther() {
    const e = this._origIndex * this.valueSize, t = this._addIndex * this.valueSize;
    for (let n = 0; n < this.valueSize; n++)
      this.buffer[t + n] = this.buffer[e + n];
  }
  // mix functions
  _select(e, t, n, s, r) {
    if (s >= 0.5)
      for (let o = 0; o !== r; ++o)
        e[t + o] = e[n + o];
  }
  _slerp(e, t, n, s) {
    mn.slerpFlat(e, t, e, t, e, n, s);
  }
  _slerpAdditive(e, t, n, s, r) {
    const o = this._workIndex * r;
    mn.multiplyQuaternionsFlat(e, o, e, t, e, n), mn.slerpFlat(e, t, e, t, e, o, s);
  }
  _lerp(e, t, n, s, r) {
    const o = 1 - s;
    for (let a = 0; a !== r; ++a) {
      const c = t + a;
      e[c] = e[c] * o + e[n + a] * s;
    }
  }
  _lerpAdditive(e, t, n, s, r) {
    for (let o = 0; o !== r; ++o) {
      const a = t + o;
      e[a] = e[a] + e[n + o] * s;
    }
  }
}
const _c = "\\[\\]\\.:\\/", Uf = new RegExp("[" + _c + "]", "g"), vc = "[^" + _c + "]", Ff = "[^" + _c.replace("\\.", "") + "]", Of = /* @__PURE__ */ /((?:WC+[\/:])*)/.source.replace("WC", vc), Bf = /* @__PURE__ */ /(WCOD+)?/.source.replace("WCOD", Ff), kf = /* @__PURE__ */ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", vc), zf = /* @__PURE__ */ /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", vc), Hf = new RegExp(
  "^" + Of + Bf + kf + zf + "$"
), Vf = ["material", "materials", "bones", "map"];
class Gf {
  constructor(e, t, n) {
    const s = n || pt.parseTrackName(t);
    this._targetGroup = e, this._bindings = e.subscribe_(t, s);
  }
  getValue(e, t) {
    this.bind();
    const n = this._targetGroup.nCachedObjects_, s = this._bindings[n];
    s !== void 0 && s.getValue(e, t);
  }
  setValue(e, t) {
    const n = this._bindings;
    for (let s = this._targetGroup.nCachedObjects_, r = n.length; s !== r; ++s)
      n[s].setValue(e, t);
  }
  bind() {
    const e = this._bindings;
    for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t)
      e[t].bind();
  }
  unbind() {
    const e = this._bindings;
    for (let t = this._targetGroup.nCachedObjects_, n = e.length; t !== n; ++t)
      e[t].unbind();
  }
}
class pt {
  constructor(e, t, n) {
    this.path = t, this.parsedPath = n || pt.parseTrackName(t), this.node = pt.findNode(e, this.parsedPath.nodeName), this.rootNode = e, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
  }
  static create(e, t, n) {
    return e && e.isAnimationObjectGroup ? new pt.Composite(e, t, n) : new pt(e, t, n);
  }
  /**
   * Replaces spaces with underscores and removes unsupported characters from
   * node names, to ensure compatibility with parseTrackName().
   *
   * @param {string} name Node name to be sanitized.
   * @return {string}
   */
  static sanitizeNodeName(e) {
    return e.replace(/\s/g, "_").replace(Uf, "");
  }
  static parseTrackName(e) {
    const t = Hf.exec(e);
    if (t === null)
      throw new Error("PropertyBinding: Cannot parse trackName: " + e);
    const n = {
      // directoryName: matches[ 1 ], // (tschw) currently unused
      nodeName: t[2],
      objectName: t[3],
      objectIndex: t[4],
      propertyName: t[5],
      // required
      propertyIndex: t[6]
    }, s = n.nodeName && n.nodeName.lastIndexOf(".");
    if (s !== void 0 && s !== -1) {
      const r = n.nodeName.substring(s + 1);
      Vf.indexOf(r) !== -1 && (n.nodeName = n.nodeName.substring(0, s), n.objectName = r);
    }
    if (n.propertyName === null || n.propertyName.length === 0)
      throw new Error("PropertyBinding: can not parse propertyName from trackName: " + e);
    return n;
  }
  static findNode(e, t) {
    if (t === void 0 || t === "" || t === "." || t === -1 || t === e.name || t === e.uuid)
      return e;
    if (e.skeleton) {
      const n = e.skeleton.getBoneByName(t);
      if (n !== void 0)
        return n;
    }
    if (e.children) {
      const n = function(r) {
        for (let o = 0; o < r.length; o++) {
          const a = r[o];
          if (a.name === t || a.uuid === t)
            return a;
          const c = n(a.children);
          if (c) return c;
        }
        return null;
      }, s = n(e.children);
      if (s)
        return s;
    }
    return null;
  }
  // these are used to "bind" a nonexistent property
  _getValue_unavailable() {
  }
  _setValue_unavailable() {
  }
  // Getters
  _getValue_direct(e, t) {
    e[t] = this.targetObject[this.propertyName];
  }
  _getValue_array(e, t) {
    const n = this.resolvedProperty;
    for (let s = 0, r = n.length; s !== r; ++s)
      e[t++] = n[s];
  }
  _getValue_arrayElement(e, t) {
    e[t] = this.resolvedProperty[this.propertyIndex];
  }
  _getValue_toArray(e, t) {
    this.resolvedProperty.toArray(e, t);
  }
  // Direct
  _setValue_direct(e, t) {
    this.targetObject[this.propertyName] = e[t];
  }
  _setValue_direct_setNeedsUpdate(e, t) {
    this.targetObject[this.propertyName] = e[t], this.targetObject.needsUpdate = !0;
  }
  _setValue_direct_setMatrixWorldNeedsUpdate(e, t) {
    this.targetObject[this.propertyName] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // EntireArray
  _setValue_array(e, t) {
    const n = this.resolvedProperty;
    for (let s = 0, r = n.length; s !== r; ++s)
      n[s] = e[t++];
  }
  _setValue_array_setNeedsUpdate(e, t) {
    const n = this.resolvedProperty;
    for (let s = 0, r = n.length; s !== r; ++s)
      n[s] = e[t++];
    this.targetObject.needsUpdate = !0;
  }
  _setValue_array_setMatrixWorldNeedsUpdate(e, t) {
    const n = this.resolvedProperty;
    for (let s = 0, r = n.length; s !== r; ++s)
      n[s] = e[t++];
    this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // ArrayElement
  _setValue_arrayElement(e, t) {
    this.resolvedProperty[this.propertyIndex] = e[t];
  }
  _setValue_arrayElement_setNeedsUpdate(e, t) {
    this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.needsUpdate = !0;
  }
  _setValue_arrayElement_setMatrixWorldNeedsUpdate(e, t) {
    this.resolvedProperty[this.propertyIndex] = e[t], this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  // HasToFromArray
  _setValue_fromArray(e, t) {
    this.resolvedProperty.fromArray(e, t);
  }
  _setValue_fromArray_setNeedsUpdate(e, t) {
    this.resolvedProperty.fromArray(e, t), this.targetObject.needsUpdate = !0;
  }
  _setValue_fromArray_setMatrixWorldNeedsUpdate(e, t) {
    this.resolvedProperty.fromArray(e, t), this.targetObject.matrixWorldNeedsUpdate = !0;
  }
  _getValue_unbound(e, t) {
    this.bind(), this.getValue(e, t);
  }
  _setValue_unbound(e, t) {
    this.bind(), this.setValue(e, t);
  }
  // create getter / setter pair for a property in the scene graph
  bind() {
    let e = this.node;
    const t = this.parsedPath, n = t.objectName, s = t.propertyName;
    let r = t.propertyIndex;
    if (e || (e = pt.findNode(this.rootNode, t.nodeName), this.node = e), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !e) {
      console.warn("THREE.PropertyBinding: No target node found for track: " + this.path + ".");
      return;
    }
    if (n) {
      let l = t.objectIndex;
      switch (n) {
        case "materials":
          if (!e.material) {
            console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!e.material.materials) {
            console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
            return;
          }
          e = e.material.materials;
          break;
        case "bones":
          if (!e.skeleton) {
            console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
            return;
          }
          e = e.skeleton.bones;
          for (let h = 0; h < e.length; h++)
            if (e[h].name === l) {
              l = h;
              break;
            }
          break;
        case "map":
          if ("map" in e) {
            e = e.map;
            break;
          }
          if (!e.material) {
            console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }
          if (!e.material.map) {
            console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
            return;
          }
          e = e.material.map;
          break;
        default:
          if (e[n] === void 0) {
            console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.", this);
            return;
          }
          e = e[n];
      }
      if (l !== void 0) {
        if (e[l] === void 0) {
          console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, e);
          return;
        }
        e = e[l];
      }
    }
    const o = e[s];
    if (o === void 0) {
      const l = t.nodeName;
      console.error("THREE.PropertyBinding: Trying to update property for track: " + l + "." + s + " but it wasn't found.", e);
      return;
    }
    let a = this.Versioning.None;
    this.targetObject = e, e.isMaterial === !0 ? a = this.Versioning.NeedsUpdate : e.isObject3D === !0 && (a = this.Versioning.MatrixWorldNeedsUpdate);
    let c = this.BindingType.Direct;
    if (r !== void 0) {
      if (s === "morphTargetInfluences") {
        if (!e.geometry) {
          console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
          return;
        }
        if (!e.geometry.morphAttributes) {
          console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
          return;
        }
        e.morphTargetDictionary[r] !== void 0 && (r = e.morphTargetDictionary[r]);
      }
      c = this.BindingType.ArrayElement, this.resolvedProperty = o, this.propertyIndex = r;
    } else o.fromArray !== void 0 && o.toArray !== void 0 ? (c = this.BindingType.HasFromToArray, this.resolvedProperty = o) : Array.isArray(o) ? (c = this.BindingType.EntireArray, this.resolvedProperty = o) : this.propertyName = s;
    this.getValue = this.GetterByBindingType[c], this.setValue = this.SetterByBindingTypeAndVersioning[c][a];
  }
  unbind() {
    this.node = null, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
  }
}
pt.Composite = Gf;
pt.prototype.BindingType = {
  Direct: 0,
  EntireArray: 1,
  ArrayElement: 2,
  HasFromToArray: 3
};
pt.prototype.Versioning = {
  None: 0,
  NeedsUpdate: 1,
  MatrixWorldNeedsUpdate: 2
};
pt.prototype.GetterByBindingType = [
  pt.prototype._getValue_direct,
  pt.prototype._getValue_array,
  pt.prototype._getValue_arrayElement,
  pt.prototype._getValue_toArray
];
pt.prototype.SetterByBindingTypeAndVersioning = [
  [
    // Direct
    pt.prototype._setValue_direct,
    pt.prototype._setValue_direct_setNeedsUpdate,
    pt.prototype._setValue_direct_setMatrixWorldNeedsUpdate
  ],
  [
    // EntireArray
    pt.prototype._setValue_array,
    pt.prototype._setValue_array_setNeedsUpdate,
    pt.prototype._setValue_array_setMatrixWorldNeedsUpdate
  ],
  [
    // ArrayElement
    pt.prototype._setValue_arrayElement,
    pt.prototype._setValue_arrayElement_setNeedsUpdate,
    pt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
  ],
  [
    // HasToFromArray
    pt.prototype._setValue_fromArray,
    pt.prototype._setValue_fromArray_setNeedsUpdate,
    pt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
  ]
];
class Wf {
  constructor(e, t, n = null, s = t.blendMode) {
    this._mixer = e, this._clip = t, this._localRoot = n, this.blendMode = s;
    const r = t.tracks, o = r.length, a = new Array(o), c = {
      endingStart: rs,
      endingEnd: rs
    };
    for (let l = 0; l !== o; ++l) {
      const h = r[l].createInterpolant(null);
      a[l] = h, h.settings = c;
    }
    this._interpolantSettings = c, this._interpolants = a, this._propertyBindings = new Array(o), this._cacheIndex = null, this._byClipCacheIndex = null, this._timeScaleInterpolant = null, this._weightInterpolant = null, this.loop = Oa, this._loopCount = -1, this._startTime = null, this.time = 0, this.timeScale = 1, this._effectiveTimeScale = 1, this.weight = 1, this._effectiveWeight = 1, this.repetitions = 1 / 0, this.paused = !1, this.enabled = !0, this.clampWhenFinished = !1, this.zeroSlopeAtStart = !0, this.zeroSlopeAtEnd = !0;
  }
  // State & Scheduling
  play() {
    return this._mixer._activateAction(this), this;
  }
  stop() {
    return this._mixer._deactivateAction(this), this.reset();
  }
  reset() {
    return this.paused = !1, this.enabled = !0, this.time = 0, this._loopCount = -1, this._startTime = null, this.stopFading().stopWarping();
  }
  isRunning() {
    return this.enabled && !this.paused && this.timeScale !== 0 && this._startTime === null && this._mixer._isActiveAction(this);
  }
  // return true when play has been called
  isScheduled() {
    return this._mixer._isActiveAction(this);
  }
  startAt(e) {
    return this._startTime = e, this;
  }
  setLoop(e, t) {
    return this.loop = e, this.repetitions = t, this;
  }
  // Weight
  // set the weight stopping any scheduled fading
  // although .enabled = false yields an effective weight of zero, this
  // method does *not* change .enabled, because it would be confusing
  setEffectiveWeight(e) {
    return this.weight = e, this._effectiveWeight = this.enabled ? e : 0, this.stopFading();
  }
  // return the weight considering fading and .enabled
  getEffectiveWeight() {
    return this._effectiveWeight;
  }
  fadeIn(e) {
    return this._scheduleFading(e, 0, 1);
  }
  fadeOut(e) {
    return this._scheduleFading(e, 1, 0);
  }
  crossFadeFrom(e, t, n) {
    if (e.fadeOut(t), this.fadeIn(t), n) {
      const s = this._clip.duration, r = e._clip.duration, o = r / s, a = s / r;
      e.warp(1, o, t), this.warp(a, 1, t);
    }
    return this;
  }
  crossFadeTo(e, t, n) {
    return e.crossFadeFrom(this, t, n);
  }
  stopFading() {
    const e = this._weightInterpolant;
    return e !== null && (this._weightInterpolant = null, this._mixer._takeBackControlInterpolant(e)), this;
  }
  // Time Scale Control
  // set the time scale stopping any scheduled warping
  // although .paused = true yields an effective time scale of zero, this
  // method does *not* change .paused, because it would be confusing
  setEffectiveTimeScale(e) {
    return this.timeScale = e, this._effectiveTimeScale = this.paused ? 0 : e, this.stopWarping();
  }
  // return the time scale considering warping and .paused
  getEffectiveTimeScale() {
    return this._effectiveTimeScale;
  }
  setDuration(e) {
    return this.timeScale = this._clip.duration / e, this.stopWarping();
  }
  syncWith(e) {
    return this.time = e.time, this.timeScale = e.timeScale, this.stopWarping();
  }
  halt(e) {
    return this.warp(this._effectiveTimeScale, 0, e);
  }
  warp(e, t, n) {
    const s = this._mixer, r = s.time, o = this.timeScale;
    let a = this._timeScaleInterpolant;
    a === null && (a = s._lendControlInterpolant(), this._timeScaleInterpolant = a);
    const c = a.parameterPositions, l = a.sampleValues;
    return c[0] = r, c[1] = r + n, l[0] = e / o, l[1] = t / o, this;
  }
  stopWarping() {
    const e = this._timeScaleInterpolant;
    return e !== null && (this._timeScaleInterpolant = null, this._mixer._takeBackControlInterpolant(e)), this;
  }
  // Object Accessors
  getMixer() {
    return this._mixer;
  }
  getClip() {
    return this._clip;
  }
  getRoot() {
    return this._localRoot || this._mixer._root;
  }
  // Interna
  _update(e, t, n, s) {
    if (!this.enabled) {
      this._updateWeight(e);
      return;
    }
    const r = this._startTime;
    if (r !== null) {
      const c = (e - r) * n;
      c < 0 || n === 0 ? t = 0 : (this._startTime = null, t = n * c);
    }
    t *= this._updateTimeScale(e);
    const o = this._updateTime(t), a = this._updateWeight(e);
    if (a > 0) {
      const c = this._interpolants, l = this._propertyBindings;
      switch (this.blendMode) {
        case Hu:
          for (let h = 0, u = c.length; h !== u; ++h)
            c[h].evaluate(o), l[h].accumulateAdditive(a);
          break;
        case tc:
        default:
          for (let h = 0, u = c.length; h !== u; ++h)
            c[h].evaluate(o), l[h].accumulate(s, a);
      }
    }
  }
  _updateWeight(e) {
    let t = 0;
    if (this.enabled) {
      t = this.weight;
      const n = this._weightInterpolant;
      if (n !== null) {
        const s = n.evaluate(e)[0];
        t *= s, e > n.parameterPositions[1] && (this.stopFading(), s === 0 && (this.enabled = !1));
      }
    }
    return this._effectiveWeight = t, t;
  }
  _updateTimeScale(e) {
    let t = 0;
    if (!this.paused) {
      t = this.timeScale;
      const n = this._timeScaleInterpolant;
      if (n !== null) {
        const s = n.evaluate(e)[0];
        t *= s, e > n.parameterPositions[1] && (this.stopWarping(), t === 0 ? this.paused = !0 : this.timeScale = t);
      }
    }
    return this._effectiveTimeScale = t, t;
  }
  _updateTime(e) {
    const t = this._clip.duration, n = this.loop;
    let s = this.time + e, r = this._loopCount;
    const o = n === zu;
    if (e === 0)
      return r === -1 ? s : o && (r & 1) === 1 ? t - s : s;
    if (n === Fa) {
      r === -1 && (this._loopCount = 0, this._setEndings(!0, !0, !1));
      e: {
        if (s >= t)
          s = t;
        else if (s < 0)
          s = 0;
        else {
          this.time = s;
          break e;
        }
        this.clampWhenFinished ? this.paused = !0 : this.enabled = !1, this.time = s, this._mixer.dispatchEvent({
          type: "finished",
          action: this,
          direction: e < 0 ? -1 : 1
        });
      }
    } else {
      if (r === -1 && (e >= 0 ? (r = 0, this._setEndings(!0, this.repetitions === 0, o)) : this._setEndings(this.repetitions === 0, !0, o)), s >= t || s < 0) {
        const a = Math.floor(s / t);
        s -= t * a, r += Math.abs(a);
        const c = this.repetitions - r;
        if (c <= 0)
          this.clampWhenFinished ? this.paused = !0 : this.enabled = !1, s = e > 0 ? t : 0, this.time = s, this._mixer.dispatchEvent({
            type: "finished",
            action: this,
            direction: e > 0 ? 1 : -1
          });
        else {
          if (c === 1) {
            const l = e < 0;
            this._setEndings(l, !l, o);
          } else
            this._setEndings(!1, !1, o);
          this._loopCount = r, this.time = s, this._mixer.dispatchEvent({
            type: "loop",
            action: this,
            loopDelta: a
          });
        }
      } else
        this.time = s;
      if (o && (r & 1) === 1)
        return t - s;
    }
    return s;
  }
  _setEndings(e, t, n) {
    const s = this._interpolantSettings;
    n ? (s.endingStart = os, s.endingEnd = os) : (e ? s.endingStart = this.zeroSlopeAtStart ? os : rs : s.endingStart = Jr, t ? s.endingEnd = this.zeroSlopeAtEnd ? os : rs : s.endingEnd = Jr);
  }
  _scheduleFading(e, t, n) {
    const s = this._mixer, r = s.time;
    let o = this._weightInterpolant;
    o === null && (o = s._lendControlInterpolant(), this._weightInterpolant = o);
    const a = o.parameterPositions, c = o.sampleValues;
    return a[0] = r, c[0] = t, a[1] = r + e, c[1] = n, this;
  }
}
const Xf = new Float32Array(1);
class Bo extends yi {
  constructor(e) {
    super(), this._root = e, this._initMemoryManager(), this._accuIndex = 0, this.time = 0, this.timeScale = 1;
  }
  _bindAction(e, t) {
    const n = e._localRoot || this._root, s = e._clip.tracks, r = s.length, o = e._propertyBindings, a = e._interpolants, c = n.uuid, l = this._bindingsByRootAndName;
    let h = l[c];
    h === void 0 && (h = {}, l[c] = h);
    for (let u = 0; u !== r; ++u) {
      const d = s[u], f = d.name;
      let g = h[f];
      if (g !== void 0)
        ++g.referenceCount, o[u] = g;
      else {
        if (g = o[u], g !== void 0) {
          g._cacheIndex === null && (++g.referenceCount, this._addInactiveBinding(g, c, f));
          continue;
        }
        const _ = t && t._propertyBindings[u].binding.parsedPath;
        g = new Nf(
          pt.create(n, f, _),
          d.ValueTypeName,
          d.getValueSize()
        ), ++g.referenceCount, this._addInactiveBinding(g, c, f), o[u] = g;
      }
      a[u].resultBuffer = g.buffer;
    }
  }
  _activateAction(e) {
    if (!this._isActiveAction(e)) {
      if (e._cacheIndex === null) {
        const n = (e._localRoot || this._root).uuid, s = e._clip.uuid, r = this._actionsByClip[s];
        this._bindAction(
          e,
          r && r.knownActions[0]
        ), this._addInactiveAction(e, s, n);
      }
      const t = e._propertyBindings;
      for (let n = 0, s = t.length; n !== s; ++n) {
        const r = t[n];
        r.useCount++ === 0 && (this._lendBinding(r), r.saveOriginalState());
      }
      this._lendAction(e);
    }
  }
  _deactivateAction(e) {
    if (this._isActiveAction(e)) {
      const t = e._propertyBindings;
      for (let n = 0, s = t.length; n !== s; ++n) {
        const r = t[n];
        --r.useCount === 0 && (r.restoreOriginalState(), this._takeBackBinding(r));
      }
      this._takeBackAction(e);
    }
  }
  // Memory manager
  _initMemoryManager() {
    this._actions = [], this._nActiveActions = 0, this._actionsByClip = {}, this._bindings = [], this._nActiveBindings = 0, this._bindingsByRootAndName = {}, this._controlInterpolants = [], this._nActiveControlInterpolants = 0;
    const e = this;
    this.stats = {
      actions: {
        get total() {
          return e._actions.length;
        },
        get inUse() {
          return e._nActiveActions;
        }
      },
      bindings: {
        get total() {
          return e._bindings.length;
        },
        get inUse() {
          return e._nActiveBindings;
        }
      },
      controlInterpolants: {
        get total() {
          return e._controlInterpolants.length;
        },
        get inUse() {
          return e._nActiveControlInterpolants;
        }
      }
    };
  }
  // Memory management for AnimationAction objects
  _isActiveAction(e) {
    const t = e._cacheIndex;
    return t !== null && t < this._nActiveActions;
  }
  _addInactiveAction(e, t, n) {
    const s = this._actions, r = this._actionsByClip;
    let o = r[t];
    if (o === void 0)
      o = {
        knownActions: [e],
        actionByRoot: {}
      }, e._byClipCacheIndex = 0, r[t] = o;
    else {
      const a = o.knownActions;
      e._byClipCacheIndex = a.length, a.push(e);
    }
    e._cacheIndex = s.length, s.push(e), o.actionByRoot[n] = e;
  }
  _removeInactiveAction(e) {
    const t = this._actions, n = t[t.length - 1], s = e._cacheIndex;
    n._cacheIndex = s, t[s] = n, t.pop(), e._cacheIndex = null;
    const r = e._clip.uuid, o = this._actionsByClip, a = o[r], c = a.knownActions, l = c[c.length - 1], h = e._byClipCacheIndex;
    l._byClipCacheIndex = h, c[h] = l, c.pop(), e._byClipCacheIndex = null;
    const u = a.actionByRoot, d = (e._localRoot || this._root).uuid;
    delete u[d], c.length === 0 && delete o[r], this._removeInactiveBindingsForAction(e);
  }
  _removeInactiveBindingsForAction(e) {
    const t = e._propertyBindings;
    for (let n = 0, s = t.length; n !== s; ++n) {
      const r = t[n];
      --r.referenceCount === 0 && this._removeInactiveBinding(r);
    }
  }
  _lendAction(e) {
    const t = this._actions, n = e._cacheIndex, s = this._nActiveActions++, r = t[s];
    e._cacheIndex = s, t[s] = e, r._cacheIndex = n, t[n] = r;
  }
  _takeBackAction(e) {
    const t = this._actions, n = e._cacheIndex, s = --this._nActiveActions, r = t[s];
    e._cacheIndex = s, t[s] = e, r._cacheIndex = n, t[n] = r;
  }
  // Memory management for PropertyMixer objects
  _addInactiveBinding(e, t, n) {
    const s = this._bindingsByRootAndName, r = this._bindings;
    let o = s[t];
    o === void 0 && (o = {}, s[t] = o), o[n] = e, e._cacheIndex = r.length, r.push(e);
  }
  _removeInactiveBinding(e) {
    const t = this._bindings, n = e.binding, s = n.rootNode.uuid, r = n.path, o = this._bindingsByRootAndName, a = o[s], c = t[t.length - 1], l = e._cacheIndex;
    c._cacheIndex = l, t[l] = c, t.pop(), delete a[r], Object.keys(a).length === 0 && delete o[s];
  }
  _lendBinding(e) {
    const t = this._bindings, n = e._cacheIndex, s = this._nActiveBindings++, r = t[s];
    e._cacheIndex = s, t[s] = e, r._cacheIndex = n, t[n] = r;
  }
  _takeBackBinding(e) {
    const t = this._bindings, n = e._cacheIndex, s = --this._nActiveBindings, r = t[s];
    e._cacheIndex = s, t[s] = e, r._cacheIndex = n, t[n] = r;
  }
  // Memory management of Interpolants for weight and time scale
  _lendControlInterpolant() {
    const e = this._controlInterpolants, t = this._nActiveControlInterpolants++;
    let n = e[t];
    return n === void 0 && (n = new Wh(
      new Float32Array(2),
      new Float32Array(2),
      1,
      Xf
    ), n.__cacheIndex = t, e[t] = n), n;
  }
  _takeBackControlInterpolant(e) {
    const t = this._controlInterpolants, n = e.__cacheIndex, s = --this._nActiveControlInterpolants, r = t[s];
    e.__cacheIndex = s, t[s] = e, r.__cacheIndex = n, t[n] = r;
  }
  // return an action for a clip optionally using a custom root target
  // object (this method allocates a lot of dynamic memory in case a
  // previously unknown clip/root combination is specified)
  clipAction(e, t, n) {
    const s = t || this._root, r = s.uuid;
    let o = typeof e == "string" ? io.findByName(s, e) : e;
    const a = o !== null ? o.uuid : e, c = this._actionsByClip[a];
    let l = null;
    if (n === void 0 && (o !== null ? n = o.blendMode : n = tc), c !== void 0) {
      const u = c.actionByRoot[r];
      if (u !== void 0 && u.blendMode === n)
        return u;
      l = c.knownActions[0], o === null && (o = l._clip);
    }
    if (o === null) return null;
    const h = new Wf(this, o, t, n);
    return this._bindAction(h, l), this._addInactiveAction(h, a, r), h;
  }
  // get an existing action
  existingAction(e, t) {
    const n = t || this._root, s = n.uuid, r = typeof e == "string" ? io.findByName(n, e) : e, o = r ? r.uuid : e, a = this._actionsByClip[o];
    return a !== void 0 && a.actionByRoot[s] || null;
  }
  // deactivates all previously scheduled actions
  stopAllAction() {
    const e = this._actions, t = this._nActiveActions;
    for (let n = t - 1; n >= 0; --n)
      e[n].stop();
    return this;
  }
  // advance the time and update apply the animation
  update(e) {
    e *= this.timeScale;
    const t = this._actions, n = this._nActiveActions, s = this.time += e, r = Math.sign(e), o = this._accuIndex ^= 1;
    for (let l = 0; l !== n; ++l)
      t[l]._update(s, e, r, o);
    const a = this._bindings, c = this._nActiveBindings;
    for (let l = 0; l !== c; ++l)
      a[l].apply(o);
    return this;
  }
  // Allows you to seek to a specific time in an animation.
  setTime(e) {
    this.time = 0;
    for (let t = 0; t < this._actions.length; t++)
      this._actions[t].time = 0;
    return this.update(e);
  }
  // return this mixer's root target object
  getRoot() {
    return this._root;
  }
  // free all resources specific to a particular clip
  uncacheClip(e) {
    const t = this._actions, n = e.uuid, s = this._actionsByClip, r = s[n];
    if (r !== void 0) {
      const o = r.knownActions;
      for (let a = 0, c = o.length; a !== c; ++a) {
        const l = o[a];
        this._deactivateAction(l);
        const h = l._cacheIndex, u = t[t.length - 1];
        l._cacheIndex = null, l._byClipCacheIndex = null, u._cacheIndex = h, t[h] = u, t.pop(), this._removeInactiveBindingsForAction(l);
      }
      delete s[n];
    }
  }
  // free all resources specific to a particular root target object
  uncacheRoot(e) {
    const t = e.uuid, n = this._actionsByClip;
    for (const o in n) {
      const a = n[o].actionByRoot, c = a[t];
      c !== void 0 && (this._deactivateAction(c), this._removeInactiveAction(c));
    }
    const s = this._bindingsByRootAndName, r = s[t];
    if (r !== void 0)
      for (const o in r) {
        const a = r[o];
        a.restoreOriginalState(), this._removeInactiveBinding(a);
      }
  }
  // remove a targeted clip from the cache
  uncacheAction(e, t) {
    const n = this.existingAction(e, t);
    n !== null && (this._deactivateAction(n), this._removeInactiveAction(n));
  }
}
class fl {
  constructor(e = 1, t = 0, n = 0) {
    return this.radius = e, this.phi = t, this.theta = n, this;
  }
  set(e, t, n) {
    return this.radius = e, this.phi = t, this.theta = n, this;
  }
  copy(e) {
    return this.radius = e.radius, this.phi = e.phi, this.theta = e.theta, this;
  }
  // restrict phi to be between EPS and PI-EPS
  makeSafe() {
    return this.phi = qe(this.phi, 1e-6, Math.PI - 1e-6), this;
  }
  setFromVector3(e) {
    return this.setFromCartesianCoords(e.x, e.y, e.z);
  }
  setFromCartesianCoords(e, t, n) {
    return this.radius = Math.sqrt(e * e + t * t + n * n), this.radius === 0 ? (this.theta = 0, this.phi = 0) : (this.theta = Math.atan2(e, n), this.phi = Math.acos(qe(t / this.radius, -1, 1))), this;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
class qf extends yi {
  constructor(e, t = null) {
    super(), this.object = e, this.domElement = t, this.enabled = !0, this.state = -1, this.keys = {}, this.mouseButtons = { LEFT: null, MIDDLE: null, RIGHT: null }, this.touches = { ONE: null, TWO: null };
  }
  connect() {
  }
  disconnect() {
  }
  dispose() {
  }
  update() {
  }
}
function pl(i, e, t, n) {
  const s = Yf(n);
  switch (t) {
    // https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
    case fh:
      return i * e;
    case mh:
      return i * e;
    case gh:
      return i * e * 2;
    case $a:
      return i * e / s.components * s.byteLength;
    case Ja:
      return i * e / s.components * s.byteLength;
    case _h:
      return i * e * 2 / s.components * s.byteLength;
    case Qa:
      return i * e * 2 / s.components * s.byteLength;
    case ph:
      return i * e * 3 / s.components * s.byteLength;
    case xn:
      return i * e * 4 / s.components * s.byteLength;
    case ec:
      return i * e * 4 / s.components * s.byteLength;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/
    case Wr:
    case Xr:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 8;
    case qr:
    case Yr:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_pvrtc/
    case ua:
    case fa:
      return Math.max(i, 16) * Math.max(e, 8) / 4;
    case ha:
    case da:
      return Math.max(i, 8) * Math.max(e, 8) / 2;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc/
    case pa:
    case ma:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 8;
    case ga:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/
    case _a:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    case va:
      return Math.floor((i + 4) / 5) * Math.floor((e + 3) / 4) * 16;
    case xa:
      return Math.floor((i + 4) / 5) * Math.floor((e + 4) / 5) * 16;
    case ya:
      return Math.floor((i + 5) / 6) * Math.floor((e + 4) / 5) * 16;
    case Sa:
      return Math.floor((i + 5) / 6) * Math.floor((e + 5) / 6) * 16;
    case ba:
      return Math.floor((i + 7) / 8) * Math.floor((e + 4) / 5) * 16;
    case wa:
      return Math.floor((i + 7) / 8) * Math.floor((e + 5) / 6) * 16;
    case Ea:
      return Math.floor((i + 7) / 8) * Math.floor((e + 7) / 8) * 16;
    case Ma:
      return Math.floor((i + 9) / 10) * Math.floor((e + 4) / 5) * 16;
    case Ta:
      return Math.floor((i + 9) / 10) * Math.floor((e + 5) / 6) * 16;
    case Aa:
      return Math.floor((i + 9) / 10) * Math.floor((e + 7) / 8) * 16;
    case Ra:
      return Math.floor((i + 9) / 10) * Math.floor((e + 9) / 10) * 16;
    case Ca:
      return Math.floor((i + 11) / 12) * Math.floor((e + 9) / 10) * 16;
    case Pa:
      return Math.floor((i + 11) / 12) * Math.floor((e + 11) / 12) * 16;
    // https://registry.khronos.org/webgl/extensions/EXT_texture_compression_bptc/
    case Kr:
    case Ia:
    case La:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/EXT_texture_compression_rgtc/
    case vh:
    case Da:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 8;
    case Na:
    case Ua:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 16;
  }
  throw new Error(
    `Unable to determine texture byte length for ${t} format.`
  );
}
function Yf(i) {
  switch (i) {
    case ni:
    case hh:
      return { byteLength: 1, components: 1 };
    case ir:
    case uh:
    case ar:
      return { byteLength: 2, components: 1 };
    case ja:
    case Za:
      return { byteLength: 2, components: 4 };
    case Ni:
    case Ka:
    case Cn:
      return { byteLength: 4, components: 1 };
    case dh:
      return { byteLength: 4, components: 3 };
  }
  throw new Error(`Unknown texture type ${i}.`);
}
typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register", { detail: {
  revision: "172"
} }));
typeof window < "u" && (window.__THREE__ ? console.warn("WARNING: Multiple instances of Three.js being imported.") : window.__THREE__ = "172");
/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
function Yh() {
  let i = null, e = !1, t = null, n = null;
  function s(r, o) {
    t(r, o), n = i.requestAnimationFrame(s);
  }
  return {
    start: function() {
      e !== !0 && t !== null && (n = i.requestAnimationFrame(s), e = !0);
    },
    stop: function() {
      i.cancelAnimationFrame(n), e = !1;
    },
    setAnimationLoop: function(r) {
      t = r;
    },
    setContext: function(r) {
      i = r;
    }
  };
}
function Kf(i) {
  const e = /* @__PURE__ */ new WeakMap();
  function t(a, c) {
    const l = a.array, h = a.usage, u = l.byteLength, d = i.createBuffer();
    i.bindBuffer(c, d), i.bufferData(c, l, h), a.onUploadCallback();
    let f;
    if (l instanceof Float32Array)
      f = i.FLOAT;
    else if (l instanceof Uint16Array)
      a.isFloat16BufferAttribute ? f = i.HALF_FLOAT : f = i.UNSIGNED_SHORT;
    else if (l instanceof Int16Array)
      f = i.SHORT;
    else if (l instanceof Uint32Array)
      f = i.UNSIGNED_INT;
    else if (l instanceof Int32Array)
      f = i.INT;
    else if (l instanceof Int8Array)
      f = i.BYTE;
    else if (l instanceof Uint8Array)
      f = i.UNSIGNED_BYTE;
    else if (l instanceof Uint8ClampedArray)
      f = i.UNSIGNED_BYTE;
    else
      throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: " + l);
    return {
      buffer: d,
      type: f,
      bytesPerElement: l.BYTES_PER_ELEMENT,
      version: a.version,
      size: u
    };
  }
  function n(a, c, l) {
    const h = c.array, u = c.updateRanges;
    if (i.bindBuffer(l, a), u.length === 0)
      i.bufferSubData(l, 0, h);
    else {
      u.sort((f, g) => f.start - g.start);
      let d = 0;
      for (let f = 1; f < u.length; f++) {
        const g = u[d], _ = u[f];
        _.start <= g.start + g.count + 1 ? g.count = Math.max(
          g.count,
          _.start + _.count - g.start
        ) : (++d, u[d] = _);
      }
      u.length = d + 1;
      for (let f = 0, g = u.length; f < g; f++) {
        const _ = u[f];
        i.bufferSubData(
          l,
          _.start * h.BYTES_PER_ELEMENT,
          h,
          _.start,
          _.count
        );
      }
      c.clearUpdateRanges();
    }
    c.onUploadCallback();
  }
  function s(a) {
    return a.isInterleavedBufferAttribute && (a = a.data), e.get(a);
  }
  function r(a) {
    a.isInterleavedBufferAttribute && (a = a.data);
    const c = e.get(a);
    c && (i.deleteBuffer(c.buffer), e.delete(a));
  }
  function o(a, c) {
    if (a.isInterleavedBufferAttribute && (a = a.data), a.isGLBufferAttribute) {
      const h = e.get(a);
      (!h || h.version < a.version) && e.set(a, {
        buffer: a.buffer,
        type: a.type,
        bytesPerElement: a.elementSize,
        version: a.version
      });
      return;
    }
    const l = e.get(a);
    if (l === void 0)
      e.set(a, t(a, c));
    else if (l.version < a.version) {
      if (l.size !== a.array.byteLength)
        throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");
      n(l.buffer, a, c), l.version = a.version;
    }
  }
  return {
    get: s,
    remove: r,
    update: o
  };
}
var jf = `#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`, Zf = `#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`, $f = `#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`, Jf = `#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`, Qf = `#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`, ep = `#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`, tp = `#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`, np = `#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`, ip = `#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`, sp = `#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`, rp = `vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`, op = `vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`, ap = `float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`, cp = `#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`, lp = `#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`, hp = `#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`, up = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`, dp = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`, fp = `#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`, pp = `#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`, mp = `#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`, gp = `#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`, _p = `#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`, vp = `#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`, xp = `#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`, yp = `vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`, Sp = `#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`, bp = `#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`, wp = `#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`, Ep = `#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`, Mp = "gl_FragColor = linearToOutputTexel( gl_FragColor );", Tp = `vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`, Ap = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`, Rp = `#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`, Cp = `#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`, Pp = `#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`, Ip = `#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`, Lp = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`, Dp = `#ifdef USE_FOG
	varying float vFogDepth;
#endif`, Np = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`, Up = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`, Fp = `#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`, Op = `#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`, Bp = `LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`, kp = `varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`, zp = `uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`, Hp = `#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`, Vp = `ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`, Gp = `varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`, Wp = `BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`, Xp = `varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`, qp = `PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`, Yp = `struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`, Kp = `
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`, jp = `#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`, Zp = `#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`, $p = `#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`, Jp = `#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, Qp = `#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, em = `#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`, tm = `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`, nm = `#ifdef USE_MAP
	uniform sampler2D map;
#endif`, im = `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`, sm = `#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`, rm = `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`, om = `#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`, am = `#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`, cm = `#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`, lm = `#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, hm = `#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`, um = `#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, dm = `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`, fm = `#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`, pm = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, mm = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, gm = `#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`, _m = `#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`, vm = `#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`, xm = `#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`, ym = `#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`, Sm = `#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`, bm = `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`, wm = `vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`, Em = `#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`, Mm = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`, Tm = `#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`, Am = `#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`, Rm = `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`, Cm = `#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`, Pm = `#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`, Im = `#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`, Lm = `#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`, Dm = `float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`, Nm = `#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`, Um = `#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`, Fm = `#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`, Om = `#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`, Bm = `float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`, km = `#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`, zm = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`, Hm = `#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`, Vm = `#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`, Gm = `#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`, Wm = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`, Xm = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`, qm = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`, Ym = `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;
const Km = `varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`, jm = `uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, Zm = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, $m = `#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, Jm = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, Qm = `uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, e0 = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`, t0 = `#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`, n0 = `#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`, i0 = `#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`, s0 = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`, r0 = `uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, o0 = `uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`, a0 = `uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`, c0 = `#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`, l0 = `uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, h0 = `#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, u0 = `#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, d0 = `#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`, f0 = `#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, p0 = `#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`, m0 = `#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`, g0 = `#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, _0 = `#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, v0 = `#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`, x0 = `#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, y0 = `#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, S0 = `#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`, b0 = `uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`, w0 = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`, E0 = `#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`, M0 = `uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`, T0 = `uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`, A0 = `uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`, Ze = {
  alphahash_fragment: jf,
  alphahash_pars_fragment: Zf,
  alphamap_fragment: $f,
  alphamap_pars_fragment: Jf,
  alphatest_fragment: Qf,
  alphatest_pars_fragment: ep,
  aomap_fragment: tp,
  aomap_pars_fragment: np,
  batching_pars_vertex: ip,
  batching_vertex: sp,
  begin_vertex: rp,
  beginnormal_vertex: op,
  bsdfs: ap,
  iridescence_fragment: cp,
  bumpmap_pars_fragment: lp,
  clipping_planes_fragment: hp,
  clipping_planes_pars_fragment: up,
  clipping_planes_pars_vertex: dp,
  clipping_planes_vertex: fp,
  color_fragment: pp,
  color_pars_fragment: mp,
  color_pars_vertex: gp,
  color_vertex: _p,
  common: vp,
  cube_uv_reflection_fragment: xp,
  defaultnormal_vertex: yp,
  displacementmap_pars_vertex: Sp,
  displacementmap_vertex: bp,
  emissivemap_fragment: wp,
  emissivemap_pars_fragment: Ep,
  colorspace_fragment: Mp,
  colorspace_pars_fragment: Tp,
  envmap_fragment: Ap,
  envmap_common_pars_fragment: Rp,
  envmap_pars_fragment: Cp,
  envmap_pars_vertex: Pp,
  envmap_physical_pars_fragment: Hp,
  envmap_vertex: Ip,
  fog_vertex: Lp,
  fog_pars_vertex: Dp,
  fog_fragment: Np,
  fog_pars_fragment: Up,
  gradientmap_pars_fragment: Fp,
  lightmap_pars_fragment: Op,
  lights_lambert_fragment: Bp,
  lights_lambert_pars_fragment: kp,
  lights_pars_begin: zp,
  lights_toon_fragment: Vp,
  lights_toon_pars_fragment: Gp,
  lights_phong_fragment: Wp,
  lights_phong_pars_fragment: Xp,
  lights_physical_fragment: qp,
  lights_physical_pars_fragment: Yp,
  lights_fragment_begin: Kp,
  lights_fragment_maps: jp,
  lights_fragment_end: Zp,
  logdepthbuf_fragment: $p,
  logdepthbuf_pars_fragment: Jp,
  logdepthbuf_pars_vertex: Qp,
  logdepthbuf_vertex: em,
  map_fragment: tm,
  map_pars_fragment: nm,
  map_particle_fragment: im,
  map_particle_pars_fragment: sm,
  metalnessmap_fragment: rm,
  metalnessmap_pars_fragment: om,
  morphinstance_vertex: am,
  morphcolor_vertex: cm,
  morphnormal_vertex: lm,
  morphtarget_pars_vertex: hm,
  morphtarget_vertex: um,
  normal_fragment_begin: dm,
  normal_fragment_maps: fm,
  normal_pars_fragment: pm,
  normal_pars_vertex: mm,
  normal_vertex: gm,
  normalmap_pars_fragment: _m,
  clearcoat_normal_fragment_begin: vm,
  clearcoat_normal_fragment_maps: xm,
  clearcoat_pars_fragment: ym,
  iridescence_pars_fragment: Sm,
  opaque_fragment: bm,
  packing: wm,
  premultiplied_alpha_fragment: Em,
  project_vertex: Mm,
  dithering_fragment: Tm,
  dithering_pars_fragment: Am,
  roughnessmap_fragment: Rm,
  roughnessmap_pars_fragment: Cm,
  shadowmap_pars_fragment: Pm,
  shadowmap_pars_vertex: Im,
  shadowmap_vertex: Lm,
  shadowmask_pars_fragment: Dm,
  skinbase_vertex: Nm,
  skinning_pars_vertex: Um,
  skinning_vertex: Fm,
  skinnormal_vertex: Om,
  specularmap_fragment: Bm,
  specularmap_pars_fragment: km,
  tonemapping_fragment: zm,
  tonemapping_pars_fragment: Hm,
  transmission_fragment: Vm,
  transmission_pars_fragment: Gm,
  uv_pars_fragment: Wm,
  uv_pars_vertex: Xm,
  uv_vertex: qm,
  worldpos_vertex: Ym,
  background_vert: Km,
  background_frag: jm,
  backgroundCube_vert: Zm,
  backgroundCube_frag: $m,
  cube_vert: Jm,
  cube_frag: Qm,
  depth_vert: e0,
  depth_frag: t0,
  distanceRGBA_vert: n0,
  distanceRGBA_frag: i0,
  equirect_vert: s0,
  equirect_frag: r0,
  linedashed_vert: o0,
  linedashed_frag: a0,
  meshbasic_vert: c0,
  meshbasic_frag: l0,
  meshlambert_vert: h0,
  meshlambert_frag: u0,
  meshmatcap_vert: d0,
  meshmatcap_frag: f0,
  meshnormal_vert: p0,
  meshnormal_frag: m0,
  meshphong_vert: g0,
  meshphong_frag: _0,
  meshphysical_vert: v0,
  meshphysical_frag: x0,
  meshtoon_vert: y0,
  meshtoon_frag: S0,
  points_vert: b0,
  points_frag: w0,
  shadow_vert: E0,
  shadow_frag: M0,
  sprite_vert: T0,
  sprite_frag: A0
}, xe = {
  common: {
    diffuse: { value: /* @__PURE__ */ new Ie(16777215) },
    opacity: { value: 1 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaTest: { value: 0 }
  },
  specularmap: {
    specularMap: { value: null },
    specularMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  envmap: {
    envMap: { value: null },
    envMapRotation: { value: /* @__PURE__ */ new Ke() },
    flipEnvMap: { value: -1 },
    reflectivity: { value: 1 },
    // basic, lambert, phong
    ior: { value: 1.5 },
    // physical
    refractionRatio: { value: 0.98 }
    // basic, lambert, phong
  },
  aomap: {
    aoMap: { value: null },
    aoMapIntensity: { value: 1 },
    aoMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  lightmap: {
    lightMap: { value: null },
    lightMapIntensity: { value: 1 },
    lightMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  bumpmap: {
    bumpMap: { value: null },
    bumpMapTransform: { value: /* @__PURE__ */ new Ke() },
    bumpScale: { value: 1 }
  },
  normalmap: {
    normalMap: { value: null },
    normalMapTransform: { value: /* @__PURE__ */ new Ke() },
    normalScale: { value: /* @__PURE__ */ new ue(1, 1) }
  },
  displacementmap: {
    displacementMap: { value: null },
    displacementMapTransform: { value: /* @__PURE__ */ new Ke() },
    displacementScale: { value: 1 },
    displacementBias: { value: 0 }
  },
  emissivemap: {
    emissiveMap: { value: null },
    emissiveMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  metalnessmap: {
    metalnessMap: { value: null },
    metalnessMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  roughnessmap: {
    roughnessMap: { value: null },
    roughnessMapTransform: { value: /* @__PURE__ */ new Ke() }
  },
  gradientmap: {
    gradientMap: { value: null }
  },
  fog: {
    fogDensity: { value: 25e-5 },
    fogNear: { value: 1 },
    fogFar: { value: 2e3 },
    fogColor: { value: /* @__PURE__ */ new Ie(16777215) }
  },
  lights: {
    ambientLightColor: { value: [] },
    lightProbe: { value: [] },
    directionalLights: { value: [], properties: {
      direction: {},
      color: {}
    } },
    directionalLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    directionalShadowMap: { value: [] },
    directionalShadowMatrix: { value: [] },
    spotLights: { value: [], properties: {
      color: {},
      position: {},
      direction: {},
      distance: {},
      coneCos: {},
      penumbraCos: {},
      decay: {}
    } },
    spotLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {}
    } },
    spotLightMap: { value: [] },
    spotShadowMap: { value: [] },
    spotLightMatrix: { value: [] },
    pointLights: { value: [], properties: {
      color: {},
      position: {},
      decay: {},
      distance: {}
    } },
    pointLightShadows: { value: [], properties: {
      shadowIntensity: 1,
      shadowBias: {},
      shadowNormalBias: {},
      shadowRadius: {},
      shadowMapSize: {},
      shadowCameraNear: {},
      shadowCameraFar: {}
    } },
    pointShadowMap: { value: [] },
    pointShadowMatrix: { value: [] },
    hemisphereLights: { value: [], properties: {
      direction: {},
      skyColor: {},
      groundColor: {}
    } },
    // TODO (abelnation): RectAreaLight BRDF data needs to be moved from example to main src
    rectAreaLights: { value: [], properties: {
      color: {},
      position: {},
      width: {},
      height: {}
    } },
    ltc_1: { value: null },
    ltc_2: { value: null }
  },
  points: {
    diffuse: { value: /* @__PURE__ */ new Ie(16777215) },
    opacity: { value: 1 },
    size: { value: 1 },
    scale: { value: 1 },
    map: { value: null },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaTest: { value: 0 },
    uvTransform: { value: /* @__PURE__ */ new Ke() }
  },
  sprite: {
    diffuse: { value: /* @__PURE__ */ new Ie(16777215) },
    opacity: { value: 1 },
    center: { value: /* @__PURE__ */ new ue(0.5, 0.5) },
    rotation: { value: 0 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaTest: { value: 0 }
  }
}, Un = {
  basic: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.specularmap,
      xe.envmap,
      xe.aomap,
      xe.lightmap,
      xe.fog
    ]),
    vertexShader: Ze.meshbasic_vert,
    fragmentShader: Ze.meshbasic_frag
  },
  lambert: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.specularmap,
      xe.envmap,
      xe.aomap,
      xe.lightmap,
      xe.emissivemap,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      xe.fog,
      xe.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ie(0) }
      }
    ]),
    vertexShader: Ze.meshlambert_vert,
    fragmentShader: Ze.meshlambert_frag
  },
  phong: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.specularmap,
      xe.envmap,
      xe.aomap,
      xe.lightmap,
      xe.emissivemap,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      xe.fog,
      xe.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ie(0) },
        specular: { value: /* @__PURE__ */ new Ie(1118481) },
        shininess: { value: 30 }
      }
    ]),
    vertexShader: Ze.meshphong_vert,
    fragmentShader: Ze.meshphong_frag
  },
  standard: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.envmap,
      xe.aomap,
      xe.lightmap,
      xe.emissivemap,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      xe.roughnessmap,
      xe.metalnessmap,
      xe.fog,
      xe.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ie(0) },
        roughness: { value: 1 },
        metalness: { value: 0 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: Ze.meshphysical_vert,
    fragmentShader: Ze.meshphysical_frag
  },
  toon: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.aomap,
      xe.lightmap,
      xe.emissivemap,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      xe.gradientmap,
      xe.fog,
      xe.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ie(0) }
      }
    ]),
    vertexShader: Ze.meshtoon_vert,
    fragmentShader: Ze.meshtoon_frag
  },
  matcap: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      xe.fog,
      {
        matcap: { value: null }
      }
    ]),
    vertexShader: Ze.meshmatcap_vert,
    fragmentShader: Ze.meshmatcap_frag
  },
  points: {
    uniforms: /* @__PURE__ */ Qt([
      xe.points,
      xe.fog
    ]),
    vertexShader: Ze.points_vert,
    fragmentShader: Ze.points_frag
  },
  dashed: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.fog,
      {
        scale: { value: 1 },
        dashSize: { value: 1 },
        totalSize: { value: 2 }
      }
    ]),
    vertexShader: Ze.linedashed_vert,
    fragmentShader: Ze.linedashed_frag
  },
  depth: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.displacementmap
    ]),
    vertexShader: Ze.depth_vert,
    fragmentShader: Ze.depth_frag
  },
  normal: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.bumpmap,
      xe.normalmap,
      xe.displacementmap,
      {
        opacity: { value: 1 }
      }
    ]),
    vertexShader: Ze.meshnormal_vert,
    fragmentShader: Ze.meshnormal_frag
  },
  sprite: {
    uniforms: /* @__PURE__ */ Qt([
      xe.sprite,
      xe.fog
    ]),
    vertexShader: Ze.sprite_vert,
    fragmentShader: Ze.sprite_frag
  },
  background: {
    uniforms: {
      uvTransform: { value: /* @__PURE__ */ new Ke() },
      t2D: { value: null },
      backgroundIntensity: { value: 1 }
    },
    vertexShader: Ze.background_vert,
    fragmentShader: Ze.background_frag
  },
  backgroundCube: {
    uniforms: {
      envMap: { value: null },
      flipEnvMap: { value: -1 },
      backgroundBlurriness: { value: 0 },
      backgroundIntensity: { value: 1 },
      backgroundRotation: { value: /* @__PURE__ */ new Ke() }
    },
    vertexShader: Ze.backgroundCube_vert,
    fragmentShader: Ze.backgroundCube_frag
  },
  cube: {
    uniforms: {
      tCube: { value: null },
      tFlip: { value: -1 },
      opacity: { value: 1 }
    },
    vertexShader: Ze.cube_vert,
    fragmentShader: Ze.cube_frag
  },
  equirect: {
    uniforms: {
      tEquirect: { value: null }
    },
    vertexShader: Ze.equirect_vert,
    fragmentShader: Ze.equirect_frag
  },
  distanceRGBA: {
    uniforms: /* @__PURE__ */ Qt([
      xe.common,
      xe.displacementmap,
      {
        referencePosition: { value: /* @__PURE__ */ new M() },
        nearDistance: { value: 1 },
        farDistance: { value: 1e3 }
      }
    ]),
    vertexShader: Ze.distanceRGBA_vert,
    fragmentShader: Ze.distanceRGBA_frag
  },
  shadow: {
    uniforms: /* @__PURE__ */ Qt([
      xe.lights,
      xe.fog,
      {
        color: { value: /* @__PURE__ */ new Ie(0) },
        opacity: { value: 1 }
      }
    ]),
    vertexShader: Ze.shadow_vert,
    fragmentShader: Ze.shadow_frag
  }
};
Un.physical = {
  uniforms: /* @__PURE__ */ Qt([
    Un.standard.uniforms,
    {
      clearcoat: { value: 0 },
      clearcoatMap: { value: null },
      clearcoatMapTransform: { value: /* @__PURE__ */ new Ke() },
      clearcoatNormalMap: { value: null },
      clearcoatNormalMapTransform: { value: /* @__PURE__ */ new Ke() },
      clearcoatNormalScale: { value: /* @__PURE__ */ new ue(1, 1) },
      clearcoatRoughness: { value: 0 },
      clearcoatRoughnessMap: { value: null },
      clearcoatRoughnessMapTransform: { value: /* @__PURE__ */ new Ke() },
      dispersion: { value: 0 },
      iridescence: { value: 0 },
      iridescenceMap: { value: null },
      iridescenceMapTransform: { value: /* @__PURE__ */ new Ke() },
      iridescenceIOR: { value: 1.3 },
      iridescenceThicknessMinimum: { value: 100 },
      iridescenceThicknessMaximum: { value: 400 },
      iridescenceThicknessMap: { value: null },
      iridescenceThicknessMapTransform: { value: /* @__PURE__ */ new Ke() },
      sheen: { value: 0 },
      sheenColor: { value: /* @__PURE__ */ new Ie(0) },
      sheenColorMap: { value: null },
      sheenColorMapTransform: { value: /* @__PURE__ */ new Ke() },
      sheenRoughness: { value: 1 },
      sheenRoughnessMap: { value: null },
      sheenRoughnessMapTransform: { value: /* @__PURE__ */ new Ke() },
      transmission: { value: 0 },
      transmissionMap: { value: null },
      transmissionMapTransform: { value: /* @__PURE__ */ new Ke() },
      transmissionSamplerSize: { value: /* @__PURE__ */ new ue() },
      transmissionSamplerMap: { value: null },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      thicknessMapTransform: { value: /* @__PURE__ */ new Ke() },
      attenuationDistance: { value: 0 },
      attenuationColor: { value: /* @__PURE__ */ new Ie(0) },
      specularColor: { value: /* @__PURE__ */ new Ie(1, 1, 1) },
      specularColorMap: { value: null },
      specularColorMapTransform: { value: /* @__PURE__ */ new Ke() },
      specularIntensity: { value: 1 },
      specularIntensityMap: { value: null },
      specularIntensityMapTransform: { value: /* @__PURE__ */ new Ke() },
      anisotropyVector: { value: /* @__PURE__ */ new ue() },
      anisotropyMap: { value: null },
      anisotropyMapTransform: { value: /* @__PURE__ */ new Ke() }
    }
  ]),
  vertexShader: Ze.meshphysical_vert,
  fragmentShader: Ze.meshphysical_frag
};
const Fr = { r: 0, b: 0, g: 0 }, Ai = /* @__PURE__ */ new On(), R0 = /* @__PURE__ */ new Ge();
function C0(i, e, t, n, s, r, o) {
  const a = new Ie(0);
  let c = r === !0 ? 0 : 1, l, h, u = null, d = 0, f = null;
  function g(y) {
    let v = y.isScene === !0 ? y.background : null;
    return v && v.isTexture && (v = (y.backgroundBlurriness > 0 ? t : e).get(v)), v;
  }
  function _(y) {
    let v = !1;
    const P = g(y);
    P === null ? p(a, c) : P && P.isColor && (p(P, 1), v = !0);
    const A = i.xr.getEnvironmentBlendMode();
    A === "additive" ? n.buffers.color.setClear(0, 0, 0, 1, o) : A === "alpha-blend" && n.buffers.color.setClear(0, 0, 0, 0, o), (i.autoClear || v) && (n.buffers.depth.setTest(!0), n.buffers.depth.setMask(!0), n.buffers.color.setMask(!0), i.clear(i.autoClearColor, i.autoClearDepth, i.autoClearStencil));
  }
  function m(y, v) {
    const P = g(v);
    P && (P.isCubeTexture || P.mapping === so) ? (h === void 0 && (h = new oe(
      new mt(1, 1, 1),
      new ii({
        name: "BackgroundCubeMaterial",
        uniforms: Ss(Un.backgroundCube.uniforms),
        vertexShader: Un.backgroundCube.vertexShader,
        fragmentShader: Un.backgroundCube.fragmentShader,
        side: tn,
        depthTest: !1,
        depthWrite: !1,
        fog: !1
      })
    ), h.geometry.deleteAttribute("normal"), h.geometry.deleteAttribute("uv"), h.onBeforeRender = function(A, C, I) {
      this.matrixWorld.copyPosition(I.matrixWorld);
    }, Object.defineProperty(h.material, "envMap", {
      get: function() {
        return this.uniforms.envMap.value;
      }
    }), s.update(h)), Ai.copy(v.backgroundRotation), Ai.x *= -1, Ai.y *= -1, Ai.z *= -1, P.isCubeTexture && P.isRenderTargetTexture === !1 && (Ai.y *= -1, Ai.z *= -1), h.material.uniforms.envMap.value = P, h.material.uniforms.flipEnvMap.value = P.isCubeTexture && P.isRenderTargetTexture === !1 ? -1 : 1, h.material.uniforms.backgroundBlurriness.value = v.backgroundBlurriness, h.material.uniforms.backgroundIntensity.value = v.backgroundIntensity, h.material.uniforms.backgroundRotation.value.setFromMatrix4(R0.makeRotationFromEuler(Ai)), h.material.toneMapped = rt.getTransfer(P.colorSpace) !== vt, (u !== P || d !== P.version || f !== i.toneMapping) && (h.material.needsUpdate = !0, u = P, d = P.version, f = i.toneMapping), h.layers.enableAll(), y.unshift(h, h.geometry, h.material, 0, 0, null)) : P && P.isTexture && (l === void 0 && (l = new oe(
      new rn(2, 2),
      new ii({
        name: "BackgroundMaterial",
        uniforms: Ss(Un.background.uniforms),
        vertexShader: Un.background.vertexShader,
        fragmentShader: Un.background.fragmentShader,
        side: ti,
        depthTest: !1,
        depthWrite: !1,
        fog: !1
      })
    ), l.geometry.deleteAttribute("normal"), Object.defineProperty(l.material, "map", {
      get: function() {
        return this.uniforms.t2D.value;
      }
    }), s.update(l)), l.material.uniforms.t2D.value = P, l.material.uniforms.backgroundIntensity.value = v.backgroundIntensity, l.material.toneMapped = rt.getTransfer(P.colorSpace) !== vt, P.matrixAutoUpdate === !0 && P.updateMatrix(), l.material.uniforms.uvTransform.value.copy(P.matrix), (u !== P || d !== P.version || f !== i.toneMapping) && (l.material.needsUpdate = !0, u = P, d = P.version, f = i.toneMapping), l.layers.enableAll(), y.unshift(l, l.geometry, l.material, 0, 0, null));
  }
  function p(y, v) {
    y.getRGB(Fr, Ch(i)), n.buffers.color.setClear(Fr.r, Fr.g, Fr.b, v, o);
  }
  function x() {
    h !== void 0 && (h.geometry.dispose(), h.material.dispose()), l !== void 0 && (l.geometry.dispose(), l.material.dispose());
  }
  return {
    getClearColor: function() {
      return a;
    },
    setClearColor: function(y, v = 1) {
      a.set(y), c = v, p(a, c);
    },
    getClearAlpha: function() {
      return c;
    },
    setClearAlpha: function(y) {
      c = y, p(a, c);
    },
    render: _,
    addToRenderList: m,
    dispose: x
  };
}
function P0(i, e) {
  const t = i.getParameter(i.MAX_VERTEX_ATTRIBS), n = {}, s = d(null);
  let r = s, o = !1;
  function a(S, D, W, H, Y) {
    let J = !1;
    const K = u(H, W, D);
    r !== K && (r = K, l(r.object)), J = f(S, H, W, Y), J && g(S, H, W, Y), Y !== null && e.update(Y, i.ELEMENT_ARRAY_BUFFER), (J || o) && (o = !1, v(S, D, W, H), Y !== null && i.bindBuffer(i.ELEMENT_ARRAY_BUFFER, e.get(Y).buffer));
  }
  function c() {
    return i.createVertexArray();
  }
  function l(S) {
    return i.bindVertexArray(S);
  }
  function h(S) {
    return i.deleteVertexArray(S);
  }
  function u(S, D, W) {
    const H = W.wireframe === !0;
    let Y = n[S.id];
    Y === void 0 && (Y = {}, n[S.id] = Y);
    let J = Y[D.id];
    J === void 0 && (J = {}, Y[D.id] = J);
    let K = J[H];
    return K === void 0 && (K = d(c()), J[H] = K), K;
  }
  function d(S) {
    const D = [], W = [], H = [];
    for (let Y = 0; Y < t; Y++)
      D[Y] = 0, W[Y] = 0, H[Y] = 0;
    return {
      // for backward compatibility on non-VAO support browser
      geometry: null,
      program: null,
      wireframe: !1,
      newAttributes: D,
      enabledAttributes: W,
      attributeDivisors: H,
      object: S,
      attributes: {},
      index: null
    };
  }
  function f(S, D, W, H) {
    const Y = r.attributes, J = D.attributes;
    let K = 0;
    const re = W.getAttributes();
    for (const q in re)
      if (re[q].location >= 0) {
        const le = Y[q];
        let me = J[q];
        if (me === void 0 && (q === "instanceMatrix" && S.instanceMatrix && (me = S.instanceMatrix), q === "instanceColor" && S.instanceColor && (me = S.instanceColor)), le === void 0 || le.attribute !== me || me && le.data !== me.data) return !0;
        K++;
      }
    return r.attributesNum !== K || r.index !== H;
  }
  function g(S, D, W, H) {
    const Y = {}, J = D.attributes;
    let K = 0;
    const re = W.getAttributes();
    for (const q in re)
      if (re[q].location >= 0) {
        let le = J[q];
        le === void 0 && (q === "instanceMatrix" && S.instanceMatrix && (le = S.instanceMatrix), q === "instanceColor" && S.instanceColor && (le = S.instanceColor));
        const me = {};
        me.attribute = le, le && le.data && (me.data = le.data), Y[q] = me, K++;
      }
    r.attributes = Y, r.attributesNum = K, r.index = H;
  }
  function _() {
    const S = r.newAttributes;
    for (let D = 0, W = S.length; D < W; D++)
      S[D] = 0;
  }
  function m(S) {
    p(S, 0);
  }
  function p(S, D) {
    const W = r.newAttributes, H = r.enabledAttributes, Y = r.attributeDivisors;
    W[S] = 1, H[S] === 0 && (i.enableVertexAttribArray(S), H[S] = 1), Y[S] !== D && (i.vertexAttribDivisor(S, D), Y[S] = D);
  }
  function x() {
    const S = r.newAttributes, D = r.enabledAttributes;
    for (let W = 0, H = D.length; W < H; W++)
      D[W] !== S[W] && (i.disableVertexAttribArray(W), D[W] = 0);
  }
  function y(S, D, W, H, Y, J, K) {
    K === !0 ? i.vertexAttribIPointer(S, D, W, Y, J) : i.vertexAttribPointer(S, D, W, H, Y, J);
  }
  function v(S, D, W, H) {
    _();
    const Y = H.attributes, J = W.getAttributes(), K = D.defaultAttributeValues;
    for (const re in J) {
      const q = J[re];
      if (q.location >= 0) {
        let pe = Y[re];
        if (pe === void 0 && (re === "instanceMatrix" && S.instanceMatrix && (pe = S.instanceMatrix), re === "instanceColor" && S.instanceColor && (pe = S.instanceColor)), pe !== void 0) {
          const le = pe.normalized, me = pe.itemSize, Oe = e.get(pe);
          if (Oe === void 0) continue;
          const Ye = Oe.buffer, j = Oe.type, ie = Oe.bytesPerElement, Ae = j === i.INT || j === i.UNSIGNED_INT || pe.gpuType === Ka;
          if (pe.isInterleavedBufferAttribute) {
            const ae = pe.data, Le = ae.stride, Fe = pe.offset;
            if (ae.isInstancedInterleavedBuffer) {
              for (let ze = 0; ze < q.locationSize; ze++)
                p(q.location + ze, ae.meshPerAttribute);
              S.isInstancedMesh !== !0 && H._maxInstanceCount === void 0 && (H._maxInstanceCount = ae.meshPerAttribute * ae.count);
            } else
              for (let ze = 0; ze < q.locationSize; ze++)
                m(q.location + ze);
            i.bindBuffer(i.ARRAY_BUFFER, Ye);
            for (let ze = 0; ze < q.locationSize; ze++)
              y(
                q.location + ze,
                me / q.locationSize,
                j,
                le,
                Le * ie,
                (Fe + me / q.locationSize * ze) * ie,
                Ae
              );
          } else {
            if (pe.isInstancedBufferAttribute) {
              for (let ae = 0; ae < q.locationSize; ae++)
                p(q.location + ae, pe.meshPerAttribute);
              S.isInstancedMesh !== !0 && H._maxInstanceCount === void 0 && (H._maxInstanceCount = pe.meshPerAttribute * pe.count);
            } else
              for (let ae = 0; ae < q.locationSize; ae++)
                m(q.location + ae);
            i.bindBuffer(i.ARRAY_BUFFER, Ye);
            for (let ae = 0; ae < q.locationSize; ae++)
              y(
                q.location + ae,
                me / q.locationSize,
                j,
                le,
                me * ie,
                me / q.locationSize * ae * ie,
                Ae
              );
          }
        } else if (K !== void 0) {
          const le = K[re];
          if (le !== void 0)
            switch (le.length) {
              case 2:
                i.vertexAttrib2fv(q.location, le);
                break;
              case 3:
                i.vertexAttrib3fv(q.location, le);
                break;
              case 4:
                i.vertexAttrib4fv(q.location, le);
                break;
              default:
                i.vertexAttrib1fv(q.location, le);
            }
        }
      }
    }
    x();
  }
  function P() {
    I();
    for (const S in n) {
      const D = n[S];
      for (const W in D) {
        const H = D[W];
        for (const Y in H)
          h(H[Y].object), delete H[Y];
        delete D[W];
      }
      delete n[S];
    }
  }
  function A(S) {
    if (n[S.id] === void 0) return;
    const D = n[S.id];
    for (const W in D) {
      const H = D[W];
      for (const Y in H)
        h(H[Y].object), delete H[Y];
      delete D[W];
    }
    delete n[S.id];
  }
  function C(S) {
    for (const D in n) {
      const W = n[D];
      if (W[S.id] === void 0) continue;
      const H = W[S.id];
      for (const Y in H)
        h(H[Y].object), delete H[Y];
      delete W[S.id];
    }
  }
  function I() {
    w(), o = !0, r !== s && (r = s, l(r.object));
  }
  function w() {
    s.geometry = null, s.program = null, s.wireframe = !1;
  }
  return {
    setup: a,
    reset: I,
    resetDefaultState: w,
    dispose: P,
    releaseStatesOfGeometry: A,
    releaseStatesOfProgram: C,
    initAttributes: _,
    enableAttribute: m,
    disableUnusedAttributes: x
  };
}
function I0(i, e, t) {
  let n;
  function s(l) {
    n = l;
  }
  function r(l, h) {
    i.drawArrays(n, l, h), t.update(h, n, 1);
  }
  function o(l, h, u) {
    u !== 0 && (i.drawArraysInstanced(n, l, h, u), t.update(h, n, u));
  }
  function a(l, h, u) {
    if (u === 0) return;
    e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n, l, 0, h, 0, u);
    let f = 0;
    for (let g = 0; g < u; g++)
      f += h[g];
    t.update(f, n, 1);
  }
  function c(l, h, u, d) {
    if (u === 0) return;
    const f = e.get("WEBGL_multi_draw");
    if (f === null)
      for (let g = 0; g < l.length; g++)
        o(l[g], h[g], d[g]);
    else {
      f.multiDrawArraysInstancedWEBGL(n, l, 0, h, 0, d, 0, u);
      let g = 0;
      for (let _ = 0; _ < u; _++)
        g += h[_] * d[_];
      t.update(g, n, 1);
    }
  }
  this.setMode = s, this.render = r, this.renderInstances = o, this.renderMultiDraw = a, this.renderMultiDrawInstances = c;
}
function L0(i, e, t, n) {
  let s;
  function r() {
    if (s !== void 0) return s;
    if (e.has("EXT_texture_filter_anisotropic") === !0) {
      const C = e.get("EXT_texture_filter_anisotropic");
      s = i.getParameter(C.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    } else
      s = 0;
    return s;
  }
  function o(C) {
    return !(C !== xn && n.convert(C) !== i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT));
  }
  function a(C) {
    const I = C === ar && (e.has("EXT_color_buffer_half_float") || e.has("EXT_color_buffer_float"));
    return !(C !== ni && n.convert(C) !== i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE) && // Edge and Chrome Mac < 52 (#9513)
    C !== Cn && !I);
  }
  function c(C) {
    if (C === "highp") {
      if (i.getShaderPrecisionFormat(i.VERTEX_SHADER, i.HIGH_FLOAT).precision > 0 && i.getShaderPrecisionFormat(i.FRAGMENT_SHADER, i.HIGH_FLOAT).precision > 0)
        return "highp";
      C = "mediump";
    }
    return C === "mediump" && i.getShaderPrecisionFormat(i.VERTEX_SHADER, i.MEDIUM_FLOAT).precision > 0 && i.getShaderPrecisionFormat(i.FRAGMENT_SHADER, i.MEDIUM_FLOAT).precision > 0 ? "mediump" : "lowp";
  }
  let l = t.precision !== void 0 ? t.precision : "highp";
  const h = c(l);
  h !== l && (console.warn("THREE.WebGLRenderer:", l, "not supported, using", h, "instead."), l = h);
  const u = t.logarithmicDepthBuffer === !0, d = t.reverseDepthBuffer === !0 && e.has("EXT_clip_control"), f = i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS), g = i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS), _ = i.getParameter(i.MAX_TEXTURE_SIZE), m = i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE), p = i.getParameter(i.MAX_VERTEX_ATTRIBS), x = i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS), y = i.getParameter(i.MAX_VARYING_VECTORS), v = i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS), P = g > 0, A = i.getParameter(i.MAX_SAMPLES);
  return {
    isWebGL2: !0,
    // keeping this for backwards compatibility
    getMaxAnisotropy: r,
    getMaxPrecision: c,
    textureFormatReadable: o,
    textureTypeReadable: a,
    precision: l,
    logarithmicDepthBuffer: u,
    reverseDepthBuffer: d,
    maxTextures: f,
    maxVertexTextures: g,
    maxTextureSize: _,
    maxCubemapSize: m,
    maxAttributes: p,
    maxVertexUniforms: x,
    maxVaryings: y,
    maxFragmentUniforms: v,
    vertexTextures: P,
    maxSamples: A
  };
}
function D0(i) {
  const e = this;
  let t = null, n = 0, s = !1, r = !1;
  const o = new fi(), a = new Ke(), c = { value: null, needsUpdate: !1 };
  this.uniform = c, this.numPlanes = 0, this.numIntersection = 0, this.init = function(u, d) {
    const f = u.length !== 0 || d || // enable state of previous frame - the clipping code has to
    // run another frame in order to reset the state:
    n !== 0 || s;
    return s = d, n = u.length, f;
  }, this.beginShadows = function() {
    r = !0, h(null);
  }, this.endShadows = function() {
    r = !1;
  }, this.setGlobalState = function(u, d) {
    t = h(u, d, 0);
  }, this.setState = function(u, d, f) {
    const g = u.clippingPlanes, _ = u.clipIntersection, m = u.clipShadows, p = i.get(u);
    if (!s || g === null || g.length === 0 || r && !m)
      r ? h(null) : l();
    else {
      const x = r ? 0 : n, y = x * 4;
      let v = p.clippingState || null;
      c.value = v, v = h(g, d, y, f);
      for (let P = 0; P !== y; ++P)
        v[P] = t[P];
      p.clippingState = v, this.numIntersection = _ ? this.numPlanes : 0, this.numPlanes += x;
    }
  };
  function l() {
    c.value !== t && (c.value = t, c.needsUpdate = n > 0), e.numPlanes = n, e.numIntersection = 0;
  }
  function h(u, d, f, g) {
    const _ = u !== null ? u.length : 0;
    let m = null;
    if (_ !== 0) {
      if (m = c.value, g !== !0 || m === null) {
        const p = f + _ * 4, x = d.matrixWorldInverse;
        a.getNormalMatrix(x), (m === null || m.length < p) && (m = new Float32Array(p));
        for (let y = 0, v = f; y !== _; ++y, v += 4)
          o.copy(u[y]).applyMatrix4(x, a), o.normal.toArray(m, v), m[v + 3] = o.constant;
      }
      c.value = m, c.needsUpdate = !0;
    }
    return e.numPlanes = _, e.numIntersection = 0, m;
  }
}
function N0(i) {
  let e = /* @__PURE__ */ new WeakMap();
  function t(o, a) {
    return a === ca ? o.mapping = gs : a === la && (o.mapping = _s), o;
  }
  function n(o) {
    if (o && o.isTexture) {
      const a = o.mapping;
      if (a === ca || a === la)
        if (e.has(o)) {
          const c = e.get(o).texture;
          return t(c, o.mapping);
        } else {
          const c = o.image;
          if (c && c.height > 0) {
            const l = new zd(c.height);
            return l.fromEquirectangularTexture(i, o), e.set(o, l), o.addEventListener("dispose", s), t(l.texture, o.mapping);
          } else
            return null;
        }
    }
    return o;
  }
  function s(o) {
    const a = o.target;
    a.removeEventListener("dispose", s);
    const c = e.get(a);
    c !== void 0 && (e.delete(a), c.dispose());
  }
  function r() {
    e = /* @__PURE__ */ new WeakMap();
  }
  return {
    get: n,
    dispose: r
  };
}
const ls = 4, ml = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582], Di = 20, ko = /* @__PURE__ */ new gc(), gl = /* @__PURE__ */ new Ie();
let zo = null, Ho = 0, Vo = 0, Go = !1;
const Ii = (1 + Math.sqrt(5)) / 2, Qi = 1 / Ii, _l = [
  /* @__PURE__ */ new M(-Ii, Qi, 0),
  /* @__PURE__ */ new M(Ii, Qi, 0),
  /* @__PURE__ */ new M(-Qi, 0, Ii),
  /* @__PURE__ */ new M(Qi, 0, Ii),
  /* @__PURE__ */ new M(0, Ii, -Qi),
  /* @__PURE__ */ new M(0, Ii, Qi),
  /* @__PURE__ */ new M(-1, 1, -1),
  /* @__PURE__ */ new M(1, 1, -1),
  /* @__PURE__ */ new M(-1, 1, 1),
  /* @__PURE__ */ new M(1, 1, 1)
];
class vl {
  constructor(e) {
    this._renderer = e, this._pingPongRenderTarget = null, this._lodMax = 0, this._cubeSize = 0, this._lodPlanes = [], this._sizeLods = [], this._sigmas = [], this._blurMaterial = null, this._cubemapMaterial = null, this._equirectMaterial = null, this._compileMaterial(this._blurMaterial);
  }
  /**
   * Generates a PMREM from a supplied Scene, which can be faster than using an
   * image if networking bandwidth is low. Optional sigma specifies a blur radius
   * in radians to be applied to the scene before PMREM generation. Optional near
   * and far planes ensure the scene is rendered in its entirety (the cubeCamera
   * is placed at the origin).
   *
   * @param {Scene} scene
   * @param {number} sigma
   * @param {number} near
   * @param {number} far
   * @return {WebGLRenderTarget}
   */
  fromScene(e, t = 0, n = 0.1, s = 100) {
    zo = this._renderer.getRenderTarget(), Ho = this._renderer.getActiveCubeFace(), Vo = this._renderer.getActiveMipmapLevel(), Go = this._renderer.xr.enabled, this._renderer.xr.enabled = !1, this._setSize(256);
    const r = this._allocateTargets();
    return r.depthBuffer = !0, this._sceneToCubeUV(e, n, s, r), t > 0 && this._blur(r, 0, 0, t), this._applyPMREM(r), this._cleanup(r), r;
  }
  /**
   * Generates a PMREM from an equirectangular texture, which can be either LDR
   * or HDR. The ideal input image size is 1k (1024 x 512),
   * as this matches best with the 256 x 256 cubemap output.
   * The smallest supported equirectangular image size is 64 x 32.
   *
   * @param {Texture} equirectangular
   * @param {WebGLRenderTarget} [renderTarget=null] - Optional render target.
   * @return {WebGLRenderTarget}
   */
  fromEquirectangular(e, t = null) {
    return this._fromTexture(e, t);
  }
  /**
   * Generates a PMREM from an cubemap texture, which can be either LDR
   * or HDR. The ideal input cube size is 256 x 256,
   * as this matches best with the 256 x 256 cubemap output.
   * The smallest supported cube size is 16 x 16.
   *
   * @param {Texture} cubemap
   * @param {null} [renderTarget=null] - Optional render target.
   * @return {WebGLRenderTarget}
   */
  fromCubemap(e, t = null) {
    return this._fromTexture(e, t);
  }
  /**
   * Pre-compiles the cubemap shader. You can get faster start-up by invoking this method during
   * your texture's network fetch for increased concurrency.
   */
  compileCubemapShader() {
    this._cubemapMaterial === null && (this._cubemapMaterial = Sl(), this._compileMaterial(this._cubemapMaterial));
  }
  /**
   * Pre-compiles the equirectangular shader. You can get faster start-up by invoking this method during
   * your texture's network fetch for increased concurrency.
   */
  compileEquirectangularShader() {
    this._equirectMaterial === null && (this._equirectMaterial = yl(), this._compileMaterial(this._equirectMaterial));
  }
  /**
   * Disposes of the PMREMGenerator's internal memory. Note that PMREMGenerator is a static class,
   * so you should not need more than one PMREMGenerator object. If you do, calling dispose() on
   * one of them will cause any others to also become unusable.
   */
  dispose() {
    this._dispose(), this._cubemapMaterial !== null && this._cubemapMaterial.dispose(), this._equirectMaterial !== null && this._equirectMaterial.dispose();
  }
  // private interface
  _setSize(e) {
    this._lodMax = Math.floor(Math.log2(e)), this._cubeSize = Math.pow(2, this._lodMax);
  }
  _dispose() {
    this._blurMaterial !== null && this._blurMaterial.dispose(), this._pingPongRenderTarget !== null && this._pingPongRenderTarget.dispose();
    for (let e = 0; e < this._lodPlanes.length; e++)
      this._lodPlanes[e].dispose();
  }
  _cleanup(e) {
    this._renderer.setRenderTarget(zo, Ho, Vo), this._renderer.xr.enabled = Go, e.scissorTest = !1, Or(e, 0, 0, e.width, e.height);
  }
  _fromTexture(e, t) {
    e.mapping === gs || e.mapping === _s ? this._setSize(e.image.length === 0 ? 16 : e.image[0].width || e.image[0].image.width) : this._setSize(e.image.width / 4), zo = this._renderer.getRenderTarget(), Ho = this._renderer.getActiveCubeFace(), Vo = this._renderer.getActiveMipmapLevel(), Go = this._renderer.xr.enabled, this._renderer.xr.enabled = !1;
    const n = t || this._allocateTargets();
    return this._textureToCubeUV(e, n), this._applyPMREM(n), this._cleanup(n), n;
  }
  _allocateTargets() {
    const e = 3 * Math.max(this._cubeSize, 112), t = 4 * this._cubeSize, n = {
      magFilter: pn,
      minFilter: pn,
      generateMipmaps: !1,
      type: ar,
      format: xn,
      colorSpace: sn,
      depthBuffer: !1
    }, s = xl(e, t, n);
    if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== e || this._pingPongRenderTarget.height !== t) {
      this._pingPongRenderTarget !== null && this._dispose(), this._pingPongRenderTarget = xl(e, t, n);
      const { _lodMax: r } = this;
      ({ sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas } = U0(r)), this._blurMaterial = F0(r, e, t);
    }
    return s;
  }
  _compileMaterial(e) {
    const t = new oe(this._lodPlanes[0], e);
    this._renderer.compile(t, ko);
  }
  _sceneToCubeUV(e, t, n, s) {
    const a = new en(90, 1, t, n), c = [1, -1, 1, 1, 1, 1], l = [1, 1, 1, -1, -1, -1], h = this._renderer, u = h.autoClear, d = h.toneMapping;
    h.getClearColor(gl), h.toneMapping = xi, h.autoClear = !1;
    const f = new gi({
      name: "PMREM.Background",
      side: tn,
      depthWrite: !1,
      depthTest: !1
    }), g = new oe(new mt(), f);
    let _ = !1;
    const m = e.background;
    m ? m.isColor && (f.color.copy(m), e.background = null, _ = !0) : (f.color.copy(gl), _ = !0);
    for (let p = 0; p < 6; p++) {
      const x = p % 3;
      x === 0 ? (a.up.set(0, c[p], 0), a.lookAt(l[p], 0, 0)) : x === 1 ? (a.up.set(0, 0, c[p]), a.lookAt(0, l[p], 0)) : (a.up.set(0, c[p], 0), a.lookAt(0, 0, l[p]));
      const y = this._cubeSize;
      Or(s, x * y, p > 2 ? y : 0, y, y), h.setRenderTarget(s), _ && h.render(g, a), h.render(e, a);
    }
    g.geometry.dispose(), g.material.dispose(), h.toneMapping = d, h.autoClear = u, e.background = m;
  }
  _textureToCubeUV(e, t) {
    const n = this._renderer, s = e.mapping === gs || e.mapping === _s;
    s ? (this._cubemapMaterial === null && (this._cubemapMaterial = Sl()), this._cubemapMaterial.uniforms.flipEnvMap.value = e.isRenderTargetTexture === !1 ? -1 : 1) : this._equirectMaterial === null && (this._equirectMaterial = yl());
    const r = s ? this._cubemapMaterial : this._equirectMaterial, o = new oe(this._lodPlanes[0], r), a = r.uniforms;
    a.envMap.value = e;
    const c = this._cubeSize;
    Or(t, 0, 0, 3 * c, 2 * c), n.setRenderTarget(t), n.render(o, ko);
  }
  _applyPMREM(e) {
    const t = this._renderer, n = t.autoClear;
    t.autoClear = !1;
    const s = this._lodPlanes.length;
    for (let r = 1; r < s; r++) {
      const o = Math.sqrt(this._sigmas[r] * this._sigmas[r] - this._sigmas[r - 1] * this._sigmas[r - 1]), a = _l[(s - r - 1) % _l.length];
      this._blur(e, r - 1, r, o, a);
    }
    t.autoClear = n;
  }
  /**
   * This is a two-pass Gaussian blur for a cubemap. Normally this is done
   * vertically and horizontally, but this breaks down on a cube. Here we apply
   * the blur latitudinally (around the poles), and then longitudinally (towards
   * the poles) to approximate the orthogonally-separable blur. It is least
   * accurate at the poles, but still does a decent job.
   *
   * @param {WebGLRenderTarget} cubeUVRenderTarget
   * @param {number} lodIn
   * @param {number} lodOut
   * @param {number} sigma
   * @param {Vector3} [poleAxis]
   */
  _blur(e, t, n, s, r) {
    const o = this._pingPongRenderTarget;
    this._halfBlur(
      e,
      o,
      t,
      n,
      s,
      "latitudinal",
      r
    ), this._halfBlur(
      o,
      e,
      n,
      n,
      s,
      "longitudinal",
      r
    );
  }
  _halfBlur(e, t, n, s, r, o, a) {
    const c = this._renderer, l = this._blurMaterial;
    o !== "latitudinal" && o !== "longitudinal" && console.error(
      "blur direction must be either latitudinal or longitudinal!"
    );
    const h = 3, u = new oe(this._lodPlanes[s], l), d = l.uniforms, f = this._sizeLods[n] - 1, g = isFinite(r) ? Math.PI / (2 * f) : 2 * Math.PI / (2 * Di - 1), _ = r / g, m = isFinite(r) ? 1 + Math.floor(h * _) : Di;
    m > Di && console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Di}`);
    const p = [];
    let x = 0;
    for (let C = 0; C < Di; ++C) {
      const I = C / _, w = Math.exp(-I * I / 2);
      p.push(w), C === 0 ? x += w : C < m && (x += 2 * w);
    }
    for (let C = 0; C < p.length; C++)
      p[C] = p[C] / x;
    d.envMap.value = e.texture, d.samples.value = m, d.weights.value = p, d.latitudinal.value = o === "latitudinal", a && (d.poleAxis.value = a);
    const { _lodMax: y } = this;
    d.dTheta.value = g, d.mipInt.value = y - n;
    const v = this._sizeLods[s], P = 3 * v * (s > y - ls ? s - y + ls : 0), A = 4 * (this._cubeSize - v);
    Or(t, P, A, 3 * v, 2 * v), c.setRenderTarget(t), c.render(u, ko);
  }
}
function U0(i) {
  const e = [], t = [], n = [];
  let s = i;
  const r = i - ls + 1 + ml.length;
  for (let o = 0; o < r; o++) {
    const a = Math.pow(2, s);
    t.push(a);
    let c = 1 / a;
    o > i - ls ? c = ml[o - i + ls - 1] : o === 0 && (c = 0), n.push(c);
    const l = 1 / (a - 2), h = -l, u = 1 + l, d = [h, h, u, h, u, u, h, h, u, u, h, u], f = 6, g = 6, _ = 3, m = 2, p = 1, x = new Float32Array(_ * g * f), y = new Float32Array(m * g * f), v = new Float32Array(p * g * f);
    for (let A = 0; A < f; A++) {
      const C = A % 3 * 2 / 3 - 1, I = A > 2 ? 0 : -1, w = [
        C,
        I,
        0,
        C + 2 / 3,
        I,
        0,
        C + 2 / 3,
        I + 1,
        0,
        C,
        I,
        0,
        C + 2 / 3,
        I + 1,
        0,
        C,
        I + 1,
        0
      ];
      x.set(w, _ * g * A), y.set(d, m * g * A);
      const S = [A, A, A, A, A, A];
      v.set(S, p * g * A);
    }
    const P = new Bt();
    P.setAttribute("position", new Vt(x, _)), P.setAttribute("uv", new Vt(y, m)), P.setAttribute("faceIndex", new Vt(v, p)), e.push(P), s > ls && s--;
  }
  return { lodPlanes: e, sizeLods: t, sigmas: n };
}
function xl(i, e, t) {
  const n = new Ui(i, e, t);
  return n.texture.mapping = so, n.texture.name = "PMREM.cubeUv", n.scissorTest = !0, n;
}
function Or(i, e, t, n, s) {
  i.viewport.set(e, t, n, s), i.scissor.set(e, t, n, s);
}
function F0(i, e, t) {
  const n = new Float32Array(Di), s = new M(0, 1, 0);
  return new ii({
    name: "SphericalGaussianBlur",
    defines: {
      n: Di,
      CUBEUV_TEXEL_WIDTH: 1 / e,
      CUBEUV_TEXEL_HEIGHT: 1 / t,
      CUBEUV_MAX_MIP: `${i}.0`
    },
    uniforms: {
      envMap: { value: null },
      samples: { value: 1 },
      weights: { value: n },
      latitudinal: { value: !1 },
      dTheta: { value: 0 },
      mipInt: { value: 0 },
      poleAxis: { value: s }
    },
    vertexShader: xc(),
    fragmentShader: (
      /* glsl */
      `

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`
    ),
    blending: vi,
    depthTest: !1,
    depthWrite: !1
  });
}
function yl() {
  return new ii({
    name: "EquirectangularToCubeUV",
    uniforms: {
      envMap: { value: null }
    },
    vertexShader: xc(),
    fragmentShader: (
      /* glsl */
      `

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`
    ),
    blending: vi,
    depthTest: !1,
    depthWrite: !1
  });
}
function Sl() {
  return new ii({
    name: "CubemapToCubeUV",
    uniforms: {
      envMap: { value: null },
      flipEnvMap: { value: -1 }
    },
    vertexShader: xc(),
    fragmentShader: (
      /* glsl */
      `

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`
    ),
    blending: vi,
    depthTest: !1,
    depthWrite: !1
  });
}
function xc() {
  return (
    /* glsl */
    `

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`
  );
}
function O0(i) {
  let e = /* @__PURE__ */ new WeakMap(), t = null;
  function n(a) {
    if (a && a.isTexture) {
      const c = a.mapping, l = c === ca || c === la, h = c === gs || c === _s;
      if (l || h) {
        let u = e.get(a);
        const d = u !== void 0 ? u.texture.pmremVersion : 0;
        if (a.isRenderTargetTexture && a.pmremVersion !== d)
          return t === null && (t = new vl(i)), u = l ? t.fromEquirectangular(a, u) : t.fromCubemap(a, u), u.texture.pmremVersion = a.pmremVersion, e.set(a, u), u.texture;
        if (u !== void 0)
          return u.texture;
        {
          const f = a.image;
          return l && f && f.height > 0 || h && f && s(f) ? (t === null && (t = new vl(i)), u = l ? t.fromEquirectangular(a) : t.fromCubemap(a), u.texture.pmremVersion = a.pmremVersion, e.set(a, u), a.addEventListener("dispose", r), u.texture) : null;
        }
      }
    }
    return a;
  }
  function s(a) {
    let c = 0;
    const l = 6;
    for (let h = 0; h < l; h++)
      a[h] !== void 0 && c++;
    return c === l;
  }
  function r(a) {
    const c = a.target;
    c.removeEventListener("dispose", r);
    const l = e.get(c);
    l !== void 0 && (e.delete(c), l.dispose());
  }
  function o() {
    e = /* @__PURE__ */ new WeakMap(), t !== null && (t.dispose(), t = null);
  }
  return {
    get: n,
    dispose: o
  };
}
function B0(i) {
  const e = {};
  function t(n) {
    if (e[n] !== void 0)
      return e[n];
    let s;
    switch (n) {
      case "WEBGL_depth_texture":
        s = i.getExtension("WEBGL_depth_texture") || i.getExtension("MOZ_WEBGL_depth_texture") || i.getExtension("WEBKIT_WEBGL_depth_texture");
        break;
      case "EXT_texture_filter_anisotropic":
        s = i.getExtension("EXT_texture_filter_anisotropic") || i.getExtension("MOZ_EXT_texture_filter_anisotropic") || i.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
        break;
      case "WEBGL_compressed_texture_s3tc":
        s = i.getExtension("WEBGL_compressed_texture_s3tc") || i.getExtension("MOZ_WEBGL_compressed_texture_s3tc") || i.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");
        break;
      case "WEBGL_compressed_texture_pvrtc":
        s = i.getExtension("WEBGL_compressed_texture_pvrtc") || i.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");
        break;
      default:
        s = i.getExtension(n);
    }
    return e[n] = s, s;
  }
  return {
    has: function(n) {
      return t(n) !== null;
    },
    init: function() {
      t("EXT_color_buffer_float"), t("WEBGL_clip_cull_distance"), t("OES_texture_float_linear"), t("EXT_color_buffer_half_float"), t("WEBGL_multisampled_render_to_texture"), t("WEBGL_render_shared_exponent");
    },
    get: function(n) {
      const s = t(n);
      return s === null && is("THREE.WebGLRenderer: " + n + " extension not supported."), s;
    }
  };
}
function k0(i, e, t, n) {
  const s = {}, r = /* @__PURE__ */ new WeakMap();
  function o(u) {
    const d = u.target;
    d.index !== null && e.remove(d.index);
    for (const g in d.attributes)
      e.remove(d.attributes[g]);
    d.removeEventListener("dispose", o), delete s[d.id];
    const f = r.get(d);
    f && (e.remove(f), r.delete(d)), n.releaseStatesOfGeometry(d), d.isInstancedBufferGeometry === !0 && delete d._maxInstanceCount, t.memory.geometries--;
  }
  function a(u, d) {
    return s[d.id] === !0 || (d.addEventListener("dispose", o), s[d.id] = !0, t.memory.geometries++), d;
  }
  function c(u) {
    const d = u.attributes;
    for (const f in d)
      e.update(d[f], i.ARRAY_BUFFER);
  }
  function l(u) {
    const d = [], f = u.index, g = u.attributes.position;
    let _ = 0;
    if (f !== null) {
      const x = f.array;
      _ = f.version;
      for (let y = 0, v = x.length; y < v; y += 3) {
        const P = x[y + 0], A = x[y + 1], C = x[y + 2];
        d.push(P, A, A, C, C, P);
      }
    } else if (g !== void 0) {
      const x = g.array;
      _ = g.version;
      for (let y = 0, v = x.length / 3 - 1; y < v; y += 3) {
        const P = y + 0, A = y + 1, C = y + 2;
        d.push(P, A, A, C, C, P);
      }
    } else
      return;
    const m = new (bh(d) ? Rh : Ah)(d, 1);
    m.version = _;
    const p = r.get(u);
    p && e.remove(p), r.set(u, m);
  }
  function h(u) {
    const d = r.get(u);
    if (d) {
      const f = u.index;
      f !== null && d.version < f.version && l(u);
    } else
      l(u);
    return r.get(u);
  }
  return {
    get: a,
    update: c,
    getWireframeAttribute: h
  };
}
function z0(i, e, t) {
  let n;
  function s(d) {
    n = d;
  }
  let r, o;
  function a(d) {
    r = d.type, o = d.bytesPerElement;
  }
  function c(d, f) {
    i.drawElements(n, f, r, d * o), t.update(f, n, 1);
  }
  function l(d, f, g) {
    g !== 0 && (i.drawElementsInstanced(n, f, r, d * o, g), t.update(f, n, g));
  }
  function h(d, f, g) {
    if (g === 0) return;
    e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n, f, 0, r, d, 0, g);
    let m = 0;
    for (let p = 0; p < g; p++)
      m += f[p];
    t.update(m, n, 1);
  }
  function u(d, f, g, _) {
    if (g === 0) return;
    const m = e.get("WEBGL_multi_draw");
    if (m === null)
      for (let p = 0; p < d.length; p++)
        l(d[p] / o, f[p], _[p]);
    else {
      m.multiDrawElementsInstancedWEBGL(n, f, 0, r, d, 0, _, 0, g);
      let p = 0;
      for (let x = 0; x < g; x++)
        p += f[x] * _[x];
      t.update(p, n, 1);
    }
  }
  this.setMode = s, this.setIndex = a, this.render = c, this.renderInstances = l, this.renderMultiDraw = h, this.renderMultiDrawInstances = u;
}
function H0(i) {
  const e = {
    geometries: 0,
    textures: 0
  }, t = {
    frame: 0,
    calls: 0,
    triangles: 0,
    points: 0,
    lines: 0
  };
  function n(r, o, a) {
    switch (t.calls++, o) {
      case i.TRIANGLES:
        t.triangles += a * (r / 3);
        break;
      case i.LINES:
        t.lines += a * (r / 2);
        break;
      case i.LINE_STRIP:
        t.lines += a * (r - 1);
        break;
      case i.LINE_LOOP:
        t.lines += a * r;
        break;
      case i.POINTS:
        t.points += a * r;
        break;
      default:
        console.error("THREE.WebGLInfo: Unknown draw mode:", o);
        break;
    }
  }
  function s() {
    t.calls = 0, t.triangles = 0, t.points = 0, t.lines = 0;
  }
  return {
    memory: e,
    render: t,
    programs: null,
    autoReset: !0,
    reset: s,
    update: n
  };
}
function V0(i, e, t) {
  const n = /* @__PURE__ */ new WeakMap(), s = new dt();
  function r(o, a, c) {
    const l = o.morphTargetInfluences, h = a.morphAttributes.position || a.morphAttributes.normal || a.morphAttributes.color, u = h !== void 0 ? h.length : 0;
    let d = n.get(a);
    if (d === void 0 || d.count !== u) {
      let w = function() {
        C.dispose(), n.delete(a), a.removeEventListener("dispose", w);
      };
      d !== void 0 && d.texture.dispose();
      const f = a.morphAttributes.position !== void 0, g = a.morphAttributes.normal !== void 0, _ = a.morphAttributes.color !== void 0, m = a.morphAttributes.position || [], p = a.morphAttributes.normal || [], x = a.morphAttributes.color || [];
      let y = 0;
      f === !0 && (y = 1), g === !0 && (y = 2), _ === !0 && (y = 3);
      let v = a.attributes.position.count * y, P = 1;
      v > e.maxTextureSize && (P = Math.ceil(v / e.maxTextureSize), v = e.maxTextureSize);
      const A = new Float32Array(v * P * 4 * u), C = new Eh(A, v, P, u);
      C.type = Cn, C.needsUpdate = !0;
      const I = y * 4;
      for (let S = 0; S < u; S++) {
        const D = m[S], W = p[S], H = x[S], Y = v * P * 4 * S;
        for (let J = 0; J < D.count; J++) {
          const K = J * I;
          f === !0 && (s.fromBufferAttribute(D, J), A[Y + K + 0] = s.x, A[Y + K + 1] = s.y, A[Y + K + 2] = s.z, A[Y + K + 3] = 0), g === !0 && (s.fromBufferAttribute(W, J), A[Y + K + 4] = s.x, A[Y + K + 5] = s.y, A[Y + K + 6] = s.z, A[Y + K + 7] = 0), _ === !0 && (s.fromBufferAttribute(H, J), A[Y + K + 8] = s.x, A[Y + K + 9] = s.y, A[Y + K + 10] = s.z, A[Y + K + 11] = H.itemSize === 4 ? s.w : 1);
        }
      }
      d = {
        count: u,
        texture: C,
        size: new ue(v, P)
      }, n.set(a, d), a.addEventListener("dispose", w);
    }
    if (o.isInstancedMesh === !0 && o.morphTexture !== null)
      c.getUniforms().setValue(i, "morphTexture", o.morphTexture, t);
    else {
      let f = 0;
      for (let _ = 0; _ < l.length; _++)
        f += l[_];
      const g = a.morphTargetsRelative ? 1 : 1 - f;
      c.getUniforms().setValue(i, "morphTargetBaseInfluence", g), c.getUniforms().setValue(i, "morphTargetInfluences", l);
    }
    c.getUniforms().setValue(i, "morphTargetsTexture", d.texture, t), c.getUniforms().setValue(i, "morphTargetsTextureSize", d.size);
  }
  return {
    update: r
  };
}
function G0(i, e, t, n) {
  let s = /* @__PURE__ */ new WeakMap();
  function r(c) {
    const l = n.render.frame, h = c.geometry, u = e.get(c, h);
    if (s.get(u) !== l && (e.update(u), s.set(u, l)), c.isInstancedMesh && (c.hasEventListener("dispose", a) === !1 && c.addEventListener("dispose", a), s.get(c) !== l && (t.update(c.instanceMatrix, i.ARRAY_BUFFER), c.instanceColor !== null && t.update(c.instanceColor, i.ARRAY_BUFFER), s.set(c, l))), c.isSkinnedMesh) {
      const d = c.skeleton;
      s.get(d) !== l && (d.update(), s.set(d, l));
    }
    return u;
  }
  function o() {
    s = /* @__PURE__ */ new WeakMap();
  }
  function a(c) {
    const l = c.target;
    l.removeEventListener("dispose", a), t.remove(l.instanceMatrix), l.instanceColor !== null && t.remove(l.instanceColor);
  }
  return {
    update: r,
    dispose: o
  };
}
const Kh = /* @__PURE__ */ new Ut(), bl = /* @__PURE__ */ new Fh(1, 1), jh = /* @__PURE__ */ new Eh(), Zh = /* @__PURE__ */ new Ed(), $h = /* @__PURE__ */ new Ih(), wl = [], El = [], Ml = new Float32Array(16), Tl = new Float32Array(9), Al = new Float32Array(4);
function Is(i, e, t) {
  const n = i[0];
  if (n <= 0 || n > 0) return i;
  const s = e * t;
  let r = wl[s];
  if (r === void 0 && (r = new Float32Array(s), wl[s] = r), e !== 0) {
    n.toArray(r, 0);
    for (let o = 1, a = 0; o !== e; ++o)
      a += t, i[o].toArray(r, a);
  }
  return r;
}
function Ft(i, e) {
  if (i.length !== e.length) return !1;
  for (let t = 0, n = i.length; t < n; t++)
    if (i[t] !== e[t]) return !1;
  return !0;
}
function Ot(i, e) {
  for (let t = 0, n = e.length; t < n; t++)
    i[t] = e[t];
}
function ao(i, e) {
  let t = El[e];
  t === void 0 && (t = new Int32Array(e), El[e] = t);
  for (let n = 0; n !== e; ++n)
    t[n] = i.allocateTextureUnit();
  return t;
}
function W0(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1f(this.addr, e), t[0] = e);
}
function X0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2f(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (Ft(t, e)) return;
    i.uniform2fv(this.addr, e), Ot(t, e);
  }
}
function q0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3f(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else if (e.r !== void 0)
    (t[0] !== e.r || t[1] !== e.g || t[2] !== e.b) && (i.uniform3f(this.addr, e.r, e.g, e.b), t[0] = e.r, t[1] = e.g, t[2] = e.b);
  else {
    if (Ft(t, e)) return;
    i.uniform3fv(this.addr, e), Ot(t, e);
  }
}
function Y0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4f(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (Ft(t, e)) return;
    i.uniform4fv(this.addr, e), Ot(t, e);
  }
}
function K0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (Ft(t, e)) return;
    i.uniformMatrix2fv(this.addr, !1, e), Ot(t, e);
  } else {
    if (Ft(t, n)) return;
    Al.set(n), i.uniformMatrix2fv(this.addr, !1, Al), Ot(t, n);
  }
}
function j0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (Ft(t, e)) return;
    i.uniformMatrix3fv(this.addr, !1, e), Ot(t, e);
  } else {
    if (Ft(t, n)) return;
    Tl.set(n), i.uniformMatrix3fv(this.addr, !1, Tl), Ot(t, n);
  }
}
function Z0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (Ft(t, e)) return;
    i.uniformMatrix4fv(this.addr, !1, e), Ot(t, e);
  } else {
    if (Ft(t, n)) return;
    Ml.set(n), i.uniformMatrix4fv(this.addr, !1, Ml), Ot(t, n);
  }
}
function $0(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1i(this.addr, e), t[0] = e);
}
function J0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2i(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (Ft(t, e)) return;
    i.uniform2iv(this.addr, e), Ot(t, e);
  }
}
function Q0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3i(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else {
    if (Ft(t, e)) return;
    i.uniform3iv(this.addr, e), Ot(t, e);
  }
}
function eg(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4i(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (Ft(t, e)) return;
    i.uniform4iv(this.addr, e), Ot(t, e);
  }
}
function tg(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1ui(this.addr, e), t[0] = e);
}
function ng(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2ui(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (Ft(t, e)) return;
    i.uniform2uiv(this.addr, e), Ot(t, e);
  }
}
function ig(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3ui(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else {
    if (Ft(t, e)) return;
    i.uniform3uiv(this.addr, e), Ot(t, e);
  }
}
function sg(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4ui(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (Ft(t, e)) return;
    i.uniform4uiv(this.addr, e), Ot(t, e);
  }
}
function rg(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s);
  let r;
  this.type === i.SAMPLER_2D_SHADOW ? (bl.compareFunction = Sh, r = bl) : r = Kh, t.setTexture2D(e || r, s);
}
function og(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTexture3D(e || Zh, s);
}
function ag(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTextureCube(e || $h, s);
}
function cg(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTexture2DArray(e || jh, s);
}
function lg(i) {
  switch (i) {
    case 5126:
      return W0;
    // FLOAT
    case 35664:
      return X0;
    // _VEC2
    case 35665:
      return q0;
    // _VEC3
    case 35666:
      return Y0;
    // _VEC4
    case 35674:
      return K0;
    // _MAT2
    case 35675:
      return j0;
    // _MAT3
    case 35676:
      return Z0;
    // _MAT4
    case 5124:
    case 35670:
      return $0;
    // INT, BOOL
    case 35667:
    case 35671:
      return J0;
    // _VEC2
    case 35668:
    case 35672:
      return Q0;
    // _VEC3
    case 35669:
    case 35673:
      return eg;
    // _VEC4
    case 5125:
      return tg;
    // UINT
    case 36294:
      return ng;
    // _VEC2
    case 36295:
      return ig;
    // _VEC3
    case 36296:
      return sg;
    // _VEC4
    case 35678:
    // SAMPLER_2D
    case 36198:
    // SAMPLER_EXTERNAL_OES
    case 36298:
    // INT_SAMPLER_2D
    case 36306:
    // UNSIGNED_INT_SAMPLER_2D
    case 35682:
      return rg;
    case 35679:
    // SAMPLER_3D
    case 36299:
    // INT_SAMPLER_3D
    case 36307:
      return og;
    case 35680:
    // SAMPLER_CUBE
    case 36300:
    // INT_SAMPLER_CUBE
    case 36308:
    // UNSIGNED_INT_SAMPLER_CUBE
    case 36293:
      return ag;
    case 36289:
    // SAMPLER_2D_ARRAY
    case 36303:
    // INT_SAMPLER_2D_ARRAY
    case 36311:
    // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 36292:
      return cg;
  }
}
function hg(i, e) {
  i.uniform1fv(this.addr, e);
}
function ug(i, e) {
  const t = Is(e, this.size, 2);
  i.uniform2fv(this.addr, t);
}
function dg(i, e) {
  const t = Is(e, this.size, 3);
  i.uniform3fv(this.addr, t);
}
function fg(i, e) {
  const t = Is(e, this.size, 4);
  i.uniform4fv(this.addr, t);
}
function pg(i, e) {
  const t = Is(e, this.size, 4);
  i.uniformMatrix2fv(this.addr, !1, t);
}
function mg(i, e) {
  const t = Is(e, this.size, 9);
  i.uniformMatrix3fv(this.addr, !1, t);
}
function gg(i, e) {
  const t = Is(e, this.size, 16);
  i.uniformMatrix4fv(this.addr, !1, t);
}
function _g(i, e) {
  i.uniform1iv(this.addr, e);
}
function vg(i, e) {
  i.uniform2iv(this.addr, e);
}
function xg(i, e) {
  i.uniform3iv(this.addr, e);
}
function yg(i, e) {
  i.uniform4iv(this.addr, e);
}
function Sg(i, e) {
  i.uniform1uiv(this.addr, e);
}
function bg(i, e) {
  i.uniform2uiv(this.addr, e);
}
function wg(i, e) {
  i.uniform3uiv(this.addr, e);
}
function Eg(i, e) {
  i.uniform4uiv(this.addr, e);
}
function Mg(i, e, t) {
  const n = this.cache, s = e.length, r = ao(t, s);
  Ft(n, r) || (i.uniform1iv(this.addr, r), Ot(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture2D(e[o] || Kh, r[o]);
}
function Tg(i, e, t) {
  const n = this.cache, s = e.length, r = ao(t, s);
  Ft(n, r) || (i.uniform1iv(this.addr, r), Ot(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture3D(e[o] || Zh, r[o]);
}
function Ag(i, e, t) {
  const n = this.cache, s = e.length, r = ao(t, s);
  Ft(n, r) || (i.uniform1iv(this.addr, r), Ot(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTextureCube(e[o] || $h, r[o]);
}
function Rg(i, e, t) {
  const n = this.cache, s = e.length, r = ao(t, s);
  Ft(n, r) || (i.uniform1iv(this.addr, r), Ot(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture2DArray(e[o] || jh, r[o]);
}
function Cg(i) {
  switch (i) {
    case 5126:
      return hg;
    // FLOAT
    case 35664:
      return ug;
    // _VEC2
    case 35665:
      return dg;
    // _VEC3
    case 35666:
      return fg;
    // _VEC4
    case 35674:
      return pg;
    // _MAT2
    case 35675:
      return mg;
    // _MAT3
    case 35676:
      return gg;
    // _MAT4
    case 5124:
    case 35670:
      return _g;
    // INT, BOOL
    case 35667:
    case 35671:
      return vg;
    // _VEC2
    case 35668:
    case 35672:
      return xg;
    // _VEC3
    case 35669:
    case 35673:
      return yg;
    // _VEC4
    case 5125:
      return Sg;
    // UINT
    case 36294:
      return bg;
    // _VEC2
    case 36295:
      return wg;
    // _VEC3
    case 36296:
      return Eg;
    // _VEC4
    case 35678:
    // SAMPLER_2D
    case 36198:
    // SAMPLER_EXTERNAL_OES
    case 36298:
    // INT_SAMPLER_2D
    case 36306:
    // UNSIGNED_INT_SAMPLER_2D
    case 35682:
      return Mg;
    case 35679:
    // SAMPLER_3D
    case 36299:
    // INT_SAMPLER_3D
    case 36307:
      return Tg;
    case 35680:
    // SAMPLER_CUBE
    case 36300:
    // INT_SAMPLER_CUBE
    case 36308:
    // UNSIGNED_INT_SAMPLER_CUBE
    case 36293:
      return Ag;
    case 36289:
    // SAMPLER_2D_ARRAY
    case 36303:
    // INT_SAMPLER_2D_ARRAY
    case 36311:
    // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 36292:
      return Rg;
  }
}
class Pg {
  constructor(e, t, n) {
    this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.setValue = lg(t.type);
  }
}
class Ig {
  constructor(e, t, n) {
    this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.size = t.size, this.setValue = Cg(t.type);
  }
}
class Lg {
  constructor(e) {
    this.id = e, this.seq = [], this.map = {};
  }
  setValue(e, t, n) {
    const s = this.seq;
    for (let r = 0, o = s.length; r !== o; ++r) {
      const a = s[r];
      a.setValue(e, t[a.id], n);
    }
  }
}
const Wo = /(\w+)(\])?(\[|\.)?/g;
function Rl(i, e) {
  i.seq.push(e), i.map[e.id] = e;
}
function Dg(i, e, t) {
  const n = i.name, s = n.length;
  for (Wo.lastIndex = 0; ; ) {
    const r = Wo.exec(n), o = Wo.lastIndex;
    let a = r[1];
    const c = r[2] === "]", l = r[3];
    if (c && (a = a | 0), l === void 0 || l === "[" && o + 2 === s) {
      Rl(t, l === void 0 ? new Pg(a, i, e) : new Ig(a, i, e));
      break;
    } else {
      let u = t.map[a];
      u === void 0 && (u = new Lg(a), Rl(t, u)), t = u;
    }
  }
}
class jr {
  constructor(e, t) {
    this.seq = [], this.map = {};
    const n = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
    for (let s = 0; s < n; ++s) {
      const r = e.getActiveUniform(t, s), o = e.getUniformLocation(t, r.name);
      Dg(r, o, this);
    }
  }
  setValue(e, t, n, s) {
    const r = this.map[t];
    r !== void 0 && r.setValue(e, n, s);
  }
  setOptional(e, t, n) {
    const s = t[n];
    s !== void 0 && this.setValue(e, n, s);
  }
  static upload(e, t, n, s) {
    for (let r = 0, o = t.length; r !== o; ++r) {
      const a = t[r], c = n[a.id];
      c.needsUpdate !== !1 && a.setValue(e, c.value, s);
    }
  }
  static seqWithValue(e, t) {
    const n = [];
    for (let s = 0, r = e.length; s !== r; ++s) {
      const o = e[s];
      o.id in t && n.push(o);
    }
    return n;
  }
}
function Cl(i, e, t) {
  const n = i.createShader(e);
  return i.shaderSource(n, t), i.compileShader(n), n;
}
const Ng = 37297;
let Ug = 0;
function Fg(i, e) {
  const t = i.split(`
`), n = [], s = Math.max(e - 6, 0), r = Math.min(e + 6, t.length);
  for (let o = s; o < r; o++) {
    const a = o + 1;
    n.push(`${a === e ? ">" : " "} ${a}: ${t[o]}`);
  }
  return n.join(`
`);
}
const Pl = /* @__PURE__ */ new Ke();
function Og(i) {
  rt._getMatrix(Pl, rt.workingColorSpace, i);
  const e = `mat3( ${Pl.elements.map((t) => t.toFixed(4))} )`;
  switch (rt.getTransfer(i)) {
    case Qr:
      return [e, "LinearTransferOETF"];
    case vt:
      return [e, "sRGBTransferOETF"];
    default:
      return console.warn("THREE.WebGLProgram: Unsupported color space: ", i), [e, "LinearTransferOETF"];
  }
}
function Il(i, e, t) {
  const n = i.getShaderParameter(e, i.COMPILE_STATUS), s = i.getShaderInfoLog(e).trim();
  if (n && s === "") return "";
  const r = /ERROR: 0:(\d+)/.exec(s);
  if (r) {
    const o = parseInt(r[1]);
    return t.toUpperCase() + `

` + s + `

` + Fg(i.getShaderSource(e), o);
  } else
    return s;
}
function Bg(i, e) {
  const t = Og(e);
  return [
    `vec4 ${i}( vec4 value ) {`,
    `	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,
    "}"
  ].join(`
`);
}
function kg(i, e) {
  let t;
  switch (e) {
    case Du:
      t = "Linear";
      break;
    case Nu:
      t = "Reinhard";
      break;
    case Uu:
      t = "Cineon";
      break;
    case ah:
      t = "ACESFilmic";
      break;
    case Ou:
      t = "AgX";
      break;
    case Bu:
      t = "Neutral";
      break;
    case Fu:
      t = "Custom";
      break;
    default:
      console.warn("THREE.WebGLProgram: Unsupported toneMapping:", e), t = "Linear";
  }
  return "vec3 " + i + "( vec3 color ) { return " + t + "ToneMapping( color ); }";
}
const Br = /* @__PURE__ */ new M();
function zg() {
  rt.getLuminanceCoefficients(Br);
  const i = Br.x.toFixed(4), e = Br.y.toFixed(4), t = Br.z.toFixed(4);
  return [
    "float luminance( const in vec3 rgb ) {",
    `	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,
    "	return dot( weights, rgb );",
    "}"
  ].join(`
`);
}
function Hg(i) {
  return [
    i.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "",
    i.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""
  ].filter($s).join(`
`);
}
function Vg(i) {
  const e = [];
  for (const t in i) {
    const n = i[t];
    n !== !1 && e.push("#define " + t + " " + n);
  }
  return e.join(`
`);
}
function Gg(i, e) {
  const t = {}, n = i.getProgramParameter(e, i.ACTIVE_ATTRIBUTES);
  for (let s = 0; s < n; s++) {
    const r = i.getActiveAttrib(e, s), o = r.name;
    let a = 1;
    r.type === i.FLOAT_MAT2 && (a = 2), r.type === i.FLOAT_MAT3 && (a = 3), r.type === i.FLOAT_MAT4 && (a = 4), t[o] = {
      type: r.type,
      location: i.getAttribLocation(e, o),
      locationSize: a
    };
  }
  return t;
}
function $s(i) {
  return i !== "";
}
function Ll(i, e) {
  const t = e.numSpotLightShadows + e.numSpotLightMaps - e.numSpotLightShadowsWithMaps;
  return i.replace(/NUM_DIR_LIGHTS/g, e.numDirLights).replace(/NUM_SPOT_LIGHTS/g, e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, t).replace(/NUM_RECT_AREA_LIGHTS/g, e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, e.numPointLights).replace(/NUM_HEMI_LIGHTS/g, e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g, e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, e.numPointLightShadows);
}
function Dl(i, e) {
  return i.replace(/NUM_CLIPPING_PLANES/g, e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, e.numClippingPlanes - e.numClipIntersection);
}
const Wg = /^[ \t]*#include +<([\w\d./]+)>/gm;
function Wa(i) {
  return i.replace(Wg, qg);
}
const Xg = /* @__PURE__ */ new Map();
function qg(i, e) {
  let t = Ze[e];
  if (t === void 0) {
    const n = Xg.get(e);
    if (n !== void 0)
      t = Ze[n], console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', e, n);
    else
      throw new Error("Can not resolve #include <" + e + ">");
  }
  return Wa(t);
}
const Yg = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function Nl(i) {
  return i.replace(Yg, Kg);
}
function Kg(i, e, t, n) {
  let s = "";
  for (let r = parseInt(e); r < parseInt(t); r++)
    s += n.replace(/\[\s*i\s*\]/g, "[ " + r + " ]").replace(/UNROLLED_LOOP_INDEX/g, r);
  return s;
}
function Ul(i) {
  let e = `precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;
  return i.precision === "highp" ? e += `
#define HIGH_PRECISION` : i.precision === "mediump" ? e += `
#define MEDIUM_PRECISION` : i.precision === "lowp" && (e += `
#define LOW_PRECISION`), e;
}
function jg(i) {
  let e = "SHADOWMAP_TYPE_BASIC";
  return i.shadowMapType === sh ? e = "SHADOWMAP_TYPE_PCF" : i.shadowMapType === rh ? e = "SHADOWMAP_TYPE_PCF_SOFT" : i.shadowMapType === Zn && (e = "SHADOWMAP_TYPE_VSM"), e;
}
function Zg(i) {
  let e = "ENVMAP_TYPE_CUBE";
  if (i.envMap)
    switch (i.envMapMode) {
      case gs:
      case _s:
        e = "ENVMAP_TYPE_CUBE";
        break;
      case so:
        e = "ENVMAP_TYPE_CUBE_UV";
        break;
    }
  return e;
}
function $g(i) {
  let e = "ENVMAP_MODE_REFLECTION";
  if (i.envMap)
    switch (i.envMapMode) {
      case _s:
        e = "ENVMAP_MODE_REFRACTION";
        break;
    }
  return e;
}
function Jg(i) {
  let e = "ENVMAP_BLENDING_NONE";
  if (i.envMap)
    switch (i.combine) {
      case oh:
        e = "ENVMAP_BLENDING_MULTIPLY";
        break;
      case Iu:
        e = "ENVMAP_BLENDING_MIX";
        break;
      case Lu:
        e = "ENVMAP_BLENDING_ADD";
        break;
    }
  return e;
}
function Qg(i) {
  const e = i.envMapCubeUVHeight;
  if (e === null) return null;
  const t = Math.log2(e) - 2, n = 1 / e;
  return { texelWidth: 1 / (3 * Math.max(Math.pow(2, t), 112)), texelHeight: n, maxMip: t };
}
function e_(i, e, t, n) {
  const s = i.getContext(), r = t.defines;
  let o = t.vertexShader, a = t.fragmentShader;
  const c = jg(t), l = Zg(t), h = $g(t), u = Jg(t), d = Qg(t), f = Hg(t), g = Vg(r), _ = s.createProgram();
  let m, p, x = t.glslVersion ? "#version " + t.glslVersion + `
` : "";
  t.isRawShaderMaterial ? (m = [
    "#define SHADER_TYPE " + t.shaderType,
    "#define SHADER_NAME " + t.shaderName,
    g
  ].filter($s).join(`
`), m.length > 0 && (m += `
`), p = [
    "#define SHADER_TYPE " + t.shaderType,
    "#define SHADER_NAME " + t.shaderName,
    g
  ].filter($s).join(`
`), p.length > 0 && (p += `
`)) : (m = [
    Ul(t),
    "#define SHADER_TYPE " + t.shaderType,
    "#define SHADER_NAME " + t.shaderName,
    g,
    t.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
    t.batching ? "#define USE_BATCHING" : "",
    t.batchingColor ? "#define USE_BATCHING_COLOR" : "",
    t.instancing ? "#define USE_INSTANCING" : "",
    t.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
    t.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",
    t.useFog && t.fog ? "#define USE_FOG" : "",
    t.useFog && t.fogExp2 ? "#define FOG_EXP2" : "",
    t.map ? "#define USE_MAP" : "",
    t.envMap ? "#define USE_ENVMAP" : "",
    t.envMap ? "#define " + h : "",
    t.lightMap ? "#define USE_LIGHTMAP" : "",
    t.aoMap ? "#define USE_AOMAP" : "",
    t.bumpMap ? "#define USE_BUMPMAP" : "",
    t.normalMap ? "#define USE_NORMALMAP" : "",
    t.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
    t.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
    t.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
    t.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
    t.anisotropy ? "#define USE_ANISOTROPY" : "",
    t.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
    t.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
    t.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
    t.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
    t.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
    t.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
    t.specularMap ? "#define USE_SPECULARMAP" : "",
    t.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
    t.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
    t.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
    t.metalnessMap ? "#define USE_METALNESSMAP" : "",
    t.alphaMap ? "#define USE_ALPHAMAP" : "",
    t.alphaHash ? "#define USE_ALPHAHASH" : "",
    t.transmission ? "#define USE_TRANSMISSION" : "",
    t.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
    t.thicknessMap ? "#define USE_THICKNESSMAP" : "",
    t.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
    t.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
    //
    t.mapUv ? "#define MAP_UV " + t.mapUv : "",
    t.alphaMapUv ? "#define ALPHAMAP_UV " + t.alphaMapUv : "",
    t.lightMapUv ? "#define LIGHTMAP_UV " + t.lightMapUv : "",
    t.aoMapUv ? "#define AOMAP_UV " + t.aoMapUv : "",
    t.emissiveMapUv ? "#define EMISSIVEMAP_UV " + t.emissiveMapUv : "",
    t.bumpMapUv ? "#define BUMPMAP_UV " + t.bumpMapUv : "",
    t.normalMapUv ? "#define NORMALMAP_UV " + t.normalMapUv : "",
    t.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + t.displacementMapUv : "",
    t.metalnessMapUv ? "#define METALNESSMAP_UV " + t.metalnessMapUv : "",
    t.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + t.roughnessMapUv : "",
    t.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + t.anisotropyMapUv : "",
    t.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + t.clearcoatMapUv : "",
    t.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + t.clearcoatNormalMapUv : "",
    t.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + t.clearcoatRoughnessMapUv : "",
    t.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + t.iridescenceMapUv : "",
    t.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + t.iridescenceThicknessMapUv : "",
    t.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + t.sheenColorMapUv : "",
    t.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + t.sheenRoughnessMapUv : "",
    t.specularMapUv ? "#define SPECULARMAP_UV " + t.specularMapUv : "",
    t.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + t.specularColorMapUv : "",
    t.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + t.specularIntensityMapUv : "",
    t.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + t.transmissionMapUv : "",
    t.thicknessMapUv ? "#define THICKNESSMAP_UV " + t.thicknessMapUv : "",
    //
    t.vertexTangents && t.flatShading === !1 ? "#define USE_TANGENT" : "",
    t.vertexColors ? "#define USE_COLOR" : "",
    t.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
    t.vertexUv1s ? "#define USE_UV1" : "",
    t.vertexUv2s ? "#define USE_UV2" : "",
    t.vertexUv3s ? "#define USE_UV3" : "",
    t.pointsUvs ? "#define USE_POINTS_UV" : "",
    t.flatShading ? "#define FLAT_SHADED" : "",
    t.skinning ? "#define USE_SKINNING" : "",
    t.morphTargets ? "#define USE_MORPHTARGETS" : "",
    t.morphNormals && t.flatShading === !1 ? "#define USE_MORPHNORMALS" : "",
    t.morphColors ? "#define USE_MORPHCOLORS" : "",
    t.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + t.morphTextureStride : "",
    t.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + t.morphTargetsCount : "",
    t.doubleSided ? "#define DOUBLE_SIDED" : "",
    t.flipSided ? "#define FLIP_SIDED" : "",
    t.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
    t.shadowMapEnabled ? "#define " + c : "",
    t.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",
    t.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
    t.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "",
    t.reverseDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "",
    "uniform mat4 modelMatrix;",
    "uniform mat4 modelViewMatrix;",
    "uniform mat4 projectionMatrix;",
    "uniform mat4 viewMatrix;",
    "uniform mat3 normalMatrix;",
    "uniform vec3 cameraPosition;",
    "uniform bool isOrthographic;",
    "#ifdef USE_INSTANCING",
    "	attribute mat4 instanceMatrix;",
    "#endif",
    "#ifdef USE_INSTANCING_COLOR",
    "	attribute vec3 instanceColor;",
    "#endif",
    "#ifdef USE_INSTANCING_MORPH",
    "	uniform sampler2D morphTexture;",
    "#endif",
    "attribute vec3 position;",
    "attribute vec3 normal;",
    "attribute vec2 uv;",
    "#ifdef USE_UV1",
    "	attribute vec2 uv1;",
    "#endif",
    "#ifdef USE_UV2",
    "	attribute vec2 uv2;",
    "#endif",
    "#ifdef USE_UV3",
    "	attribute vec2 uv3;",
    "#endif",
    "#ifdef USE_TANGENT",
    "	attribute vec4 tangent;",
    "#endif",
    "#if defined( USE_COLOR_ALPHA )",
    "	attribute vec4 color;",
    "#elif defined( USE_COLOR )",
    "	attribute vec3 color;",
    "#endif",
    "#ifdef USE_SKINNING",
    "	attribute vec4 skinIndex;",
    "	attribute vec4 skinWeight;",
    "#endif",
    `
`
  ].filter($s).join(`
`), p = [
    Ul(t),
    "#define SHADER_TYPE " + t.shaderType,
    "#define SHADER_NAME " + t.shaderName,
    g,
    t.useFog && t.fog ? "#define USE_FOG" : "",
    t.useFog && t.fogExp2 ? "#define FOG_EXP2" : "",
    t.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
    t.map ? "#define USE_MAP" : "",
    t.matcap ? "#define USE_MATCAP" : "",
    t.envMap ? "#define USE_ENVMAP" : "",
    t.envMap ? "#define " + l : "",
    t.envMap ? "#define " + h : "",
    t.envMap ? "#define " + u : "",
    d ? "#define CUBEUV_TEXEL_WIDTH " + d.texelWidth : "",
    d ? "#define CUBEUV_TEXEL_HEIGHT " + d.texelHeight : "",
    d ? "#define CUBEUV_MAX_MIP " + d.maxMip + ".0" : "",
    t.lightMap ? "#define USE_LIGHTMAP" : "",
    t.aoMap ? "#define USE_AOMAP" : "",
    t.bumpMap ? "#define USE_BUMPMAP" : "",
    t.normalMap ? "#define USE_NORMALMAP" : "",
    t.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
    t.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
    t.emissiveMap ? "#define USE_EMISSIVEMAP" : "",
    t.anisotropy ? "#define USE_ANISOTROPY" : "",
    t.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",
    t.clearcoat ? "#define USE_CLEARCOAT" : "",
    t.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
    t.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
    t.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",
    t.dispersion ? "#define USE_DISPERSION" : "",
    t.iridescence ? "#define USE_IRIDESCENCE" : "",
    t.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
    t.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",
    t.specularMap ? "#define USE_SPECULARMAP" : "",
    t.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
    t.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",
    t.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
    t.metalnessMap ? "#define USE_METALNESSMAP" : "",
    t.alphaMap ? "#define USE_ALPHAMAP" : "",
    t.alphaTest ? "#define USE_ALPHATEST" : "",
    t.alphaHash ? "#define USE_ALPHAHASH" : "",
    t.sheen ? "#define USE_SHEEN" : "",
    t.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
    t.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",
    t.transmission ? "#define USE_TRANSMISSION" : "",
    t.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
    t.thicknessMap ? "#define USE_THICKNESSMAP" : "",
    t.vertexTangents && t.flatShading === !1 ? "#define USE_TANGENT" : "",
    t.vertexColors || t.instancingColor || t.batchingColor ? "#define USE_COLOR" : "",
    t.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
    t.vertexUv1s ? "#define USE_UV1" : "",
    t.vertexUv2s ? "#define USE_UV2" : "",
    t.vertexUv3s ? "#define USE_UV3" : "",
    t.pointsUvs ? "#define USE_POINTS_UV" : "",
    t.gradientMap ? "#define USE_GRADIENTMAP" : "",
    t.flatShading ? "#define FLAT_SHADED" : "",
    t.doubleSided ? "#define DOUBLE_SIDED" : "",
    t.flipSided ? "#define FLIP_SIDED" : "",
    t.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
    t.shadowMapEnabled ? "#define " + c : "",
    t.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",
    t.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",
    t.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
    t.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",
    t.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "",
    t.reverseDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "",
    "uniform mat4 viewMatrix;",
    "uniform vec3 cameraPosition;",
    "uniform bool isOrthographic;",
    t.toneMapping !== xi ? "#define TONE_MAPPING" : "",
    t.toneMapping !== xi ? Ze.tonemapping_pars_fragment : "",
    // this code is required here because it is used by the toneMapping() function defined below
    t.toneMapping !== xi ? kg("toneMapping", t.toneMapping) : "",
    t.dithering ? "#define DITHERING" : "",
    t.opaque ? "#define OPAQUE" : "",
    Ze.colorspace_pars_fragment,
    // this code is required here because it is used by the various encoding/decoding function defined below
    Bg("linearToOutputTexel", t.outputColorSpace),
    zg(),
    t.useDepthPacking ? "#define DEPTH_PACKING " + t.depthPacking : "",
    `
`
  ].filter($s).join(`
`)), o = Wa(o), o = Ll(o, t), o = Dl(o, t), a = Wa(a), a = Ll(a, t), a = Dl(a, t), o = Nl(o), a = Nl(a), t.isRawShaderMaterial !== !0 && (x = `#version 300 es
`, m = [
    f,
    "#define attribute in",
    "#define varying out",
    "#define texture2D texture"
  ].join(`
`) + `
` + m, p = [
    "#define varying in",
    t.glslVersion === Ac ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
    t.glslVersion === Ac ? "" : "#define gl_FragColor pc_fragColor",
    "#define gl_FragDepthEXT gl_FragDepth",
    "#define texture2D texture",
    "#define textureCube texture",
    "#define texture2DProj textureProj",
    "#define texture2DLodEXT textureLod",
    "#define texture2DProjLodEXT textureProjLod",
    "#define textureCubeLodEXT textureLod",
    "#define texture2DGradEXT textureGrad",
    "#define texture2DProjGradEXT textureProjGrad",
    "#define textureCubeGradEXT textureGrad"
  ].join(`
`) + `
` + p);
  const y = x + m + o, v = x + p + a, P = Cl(s, s.VERTEX_SHADER, y), A = Cl(s, s.FRAGMENT_SHADER, v);
  s.attachShader(_, P), s.attachShader(_, A), t.index0AttributeName !== void 0 ? s.bindAttribLocation(_, 0, t.index0AttributeName) : t.morphTargets === !0 && s.bindAttribLocation(_, 0, "position"), s.linkProgram(_);
  function C(D) {
    if (i.debug.checkShaderErrors) {
      const W = s.getProgramInfoLog(_).trim(), H = s.getShaderInfoLog(P).trim(), Y = s.getShaderInfoLog(A).trim();
      let J = !0, K = !0;
      if (s.getProgramParameter(_, s.LINK_STATUS) === !1)
        if (J = !1, typeof i.debug.onShaderError == "function")
          i.debug.onShaderError(s, _, P, A);
        else {
          const re = Il(s, P, "vertex"), q = Il(s, A, "fragment");
          console.error(
            "THREE.WebGLProgram: Shader Error " + s.getError() + " - VALIDATE_STATUS " + s.getProgramParameter(_, s.VALIDATE_STATUS) + `

Material Name: ` + D.name + `
Material Type: ` + D.type + `

Program Info Log: ` + W + `
` + re + `
` + q
          );
        }
      else W !== "" ? console.warn("THREE.WebGLProgram: Program Info Log:", W) : (H === "" || Y === "") && (K = !1);
      K && (D.diagnostics = {
        runnable: J,
        programLog: W,
        vertexShader: {
          log: H,
          prefix: m
        },
        fragmentShader: {
          log: Y,
          prefix: p
        }
      });
    }
    s.deleteShader(P), s.deleteShader(A), I = new jr(s, _), w = Gg(s, _);
  }
  let I;
  this.getUniforms = function() {
    return I === void 0 && C(this), I;
  };
  let w;
  this.getAttributes = function() {
    return w === void 0 && C(this), w;
  };
  let S = t.rendererExtensionParallelShaderCompile === !1;
  return this.isReady = function() {
    return S === !1 && (S = s.getProgramParameter(_, Ng)), S;
  }, this.destroy = function() {
    n.releaseStatesOfProgram(this), s.deleteProgram(_), this.program = void 0;
  }, this.type = t.shaderType, this.name = t.shaderName, this.id = Ug++, this.cacheKey = e, this.usedTimes = 1, this.program = _, this.vertexShader = P, this.fragmentShader = A, this;
}
let t_ = 0;
class n_ {
  constructor() {
    this.shaderCache = /* @__PURE__ */ new Map(), this.materialCache = /* @__PURE__ */ new Map();
  }
  update(e) {
    const t = e.vertexShader, n = e.fragmentShader, s = this._getShaderStage(t), r = this._getShaderStage(n), o = this._getShaderCacheForMaterial(e);
    return o.has(s) === !1 && (o.add(s), s.usedTimes++), o.has(r) === !1 && (o.add(r), r.usedTimes++), this;
  }
  remove(e) {
    const t = this.materialCache.get(e);
    for (const n of t)
      n.usedTimes--, n.usedTimes === 0 && this.shaderCache.delete(n.code);
    return this.materialCache.delete(e), this;
  }
  getVertexShaderID(e) {
    return this._getShaderStage(e.vertexShader).id;
  }
  getFragmentShaderID(e) {
    return this._getShaderStage(e.fragmentShader).id;
  }
  dispose() {
    this.shaderCache.clear(), this.materialCache.clear();
  }
  _getShaderCacheForMaterial(e) {
    const t = this.materialCache;
    let n = t.get(e);
    return n === void 0 && (n = /* @__PURE__ */ new Set(), t.set(e, n)), n;
  }
  _getShaderStage(e) {
    const t = this.shaderCache;
    let n = t.get(e);
    return n === void 0 && (n = new i_(e), t.set(e, n)), n;
  }
}
class i_ {
  constructor(e) {
    this.id = t_++, this.code = e, this.usedTimes = 0;
  }
}
function s_(i, e, t, n, s, r, o) {
  const a = new Mh(), c = new n_(), l = /* @__PURE__ */ new Set(), h = [], u = s.logarithmicDepthBuffer, d = s.vertexTextures;
  let f = s.precision;
  const g = {
    MeshDepthMaterial: "depth",
    MeshDistanceMaterial: "distanceRGBA",
    MeshNormalMaterial: "normal",
    MeshBasicMaterial: "basic",
    MeshLambertMaterial: "lambert",
    MeshPhongMaterial: "phong",
    MeshToonMaterial: "toon",
    MeshStandardMaterial: "physical",
    MeshPhysicalMaterial: "physical",
    MeshMatcapMaterial: "matcap",
    LineBasicMaterial: "basic",
    LineDashedMaterial: "dashed",
    PointsMaterial: "points",
    ShadowMaterial: "shadow",
    SpriteMaterial: "sprite"
  };
  function _(w) {
    return l.add(w), w === 0 ? "uv" : `uv${w}`;
  }
  function m(w, S, D, W, H) {
    const Y = W.fog, J = H.geometry, K = w.isMeshStandardMaterial ? W.environment : null, re = (w.isMeshStandardMaterial ? t : e).get(w.envMap || K), q = re && re.mapping === so ? re.image.height : null, pe = g[w.type];
    w.precision !== null && (f = s.getMaxPrecision(w.precision), f !== w.precision && console.warn("THREE.WebGLProgram.getParameters:", w.precision, "not supported, using", f, "instead."));
    const le = J.morphAttributes.position || J.morphAttributes.normal || J.morphAttributes.color, me = le !== void 0 ? le.length : 0;
    let Oe = 0;
    J.morphAttributes.position !== void 0 && (Oe = 1), J.morphAttributes.normal !== void 0 && (Oe = 2), J.morphAttributes.color !== void 0 && (Oe = 3);
    let Ye, j, ie, Ae;
    if (pe) {
      const lt = Un[pe];
      Ye = lt.vertexShader, j = lt.fragmentShader;
    } else
      Ye = w.vertexShader, j = w.fragmentShader, c.update(w), ie = c.getVertexShaderID(w), Ae = c.getFragmentShaderID(w);
    const ae = i.getRenderTarget(), Le = i.state.buffers.depth.getReversed(), Fe = H.isInstancedMesh === !0, ze = H.isBatchedMesh === !0, ct = !!w.map, Qe = !!w.matcap, Mt = !!re, N = !!w.aoMap, Wt = !!w.lightMap, je = !!w.bumpMap, $e = !!w.normalMap, Te = !!w.displacementMap, _t = !!w.emissiveMap, Re = !!w.metalnessMap, T = !!w.roughnessMap, b = w.anisotropy > 0, k = w.clearcoat > 0, $ = w.dispersion > 0, ee = w.iridescence > 0, L = w.sheen > 0, B = w.transmission > 0, ce = b && !!w.anisotropyMap, be = k && !!w.clearcoatMap, Je = k && !!w.clearcoatNormalMap, ne = k && !!w.clearcoatRoughnessMap, ve = ee && !!w.iridescenceMap, Pe = ee && !!w.iridescenceThicknessMap, De = L && !!w.sheenColorMap, Se = L && !!w.sheenRoughnessMap, Xe = !!w.specularMap, He = !!w.specularColorMap, ht = !!w.specularIntensityMap, U = B && !!w.transmissionMap, de = B && !!w.thicknessMap, X = !!w.gradientMap, Z = !!w.alphaMap, fe = w.alphaTest > 0, _e = !!w.alphaHash, Be = !!w.extensions;
    let St = xi;
    w.toneMapped && (ae === null || ae.isXRRenderTarget === !0) && (St = i.toneMapping);
    const Ct = {
      shaderID: pe,
      shaderType: w.type,
      shaderName: w.name,
      vertexShader: Ye,
      fragmentShader: j,
      defines: w.defines,
      customVertexShaderID: ie,
      customFragmentShaderID: Ae,
      isRawShaderMaterial: w.isRawShaderMaterial === !0,
      glslVersion: w.glslVersion,
      precision: f,
      batching: ze,
      batchingColor: ze && H._colorsTexture !== null,
      instancing: Fe,
      instancingColor: Fe && H.instanceColor !== null,
      instancingMorph: Fe && H.morphTexture !== null,
      supportsVertexTextures: d,
      outputColorSpace: ae === null ? i.outputColorSpace : ae.isXRRenderTarget === !0 ? ae.texture.colorSpace : sn,
      alphaToCoverage: !!w.alphaToCoverage,
      map: ct,
      matcap: Qe,
      envMap: Mt,
      envMapMode: Mt && re.mapping,
      envMapCubeUVHeight: q,
      aoMap: N,
      lightMap: Wt,
      bumpMap: je,
      normalMap: $e,
      displacementMap: d && Te,
      emissiveMap: _t,
      normalMapObjectSpace: $e && w.normalMapType === Xu,
      normalMapTangentSpace: $e && w.normalMapType === yh,
      metalnessMap: Re,
      roughnessMap: T,
      anisotropy: b,
      anisotropyMap: ce,
      clearcoat: k,
      clearcoatMap: be,
      clearcoatNormalMap: Je,
      clearcoatRoughnessMap: ne,
      dispersion: $,
      iridescence: ee,
      iridescenceMap: ve,
      iridescenceThicknessMap: Pe,
      sheen: L,
      sheenColorMap: De,
      sheenRoughnessMap: Se,
      specularMap: Xe,
      specularColorMap: He,
      specularIntensityMap: ht,
      transmission: B,
      transmissionMap: U,
      thicknessMap: de,
      gradientMap: X,
      opaque: w.transparent === !1 && w.blending === us && w.alphaToCoverage === !1,
      alphaMap: Z,
      alphaTest: fe,
      alphaHash: _e,
      combine: w.combine,
      //
      mapUv: ct && _(w.map.channel),
      aoMapUv: N && _(w.aoMap.channel),
      lightMapUv: Wt && _(w.lightMap.channel),
      bumpMapUv: je && _(w.bumpMap.channel),
      normalMapUv: $e && _(w.normalMap.channel),
      displacementMapUv: Te && _(w.displacementMap.channel),
      emissiveMapUv: _t && _(w.emissiveMap.channel),
      metalnessMapUv: Re && _(w.metalnessMap.channel),
      roughnessMapUv: T && _(w.roughnessMap.channel),
      anisotropyMapUv: ce && _(w.anisotropyMap.channel),
      clearcoatMapUv: be && _(w.clearcoatMap.channel),
      clearcoatNormalMapUv: Je && _(w.clearcoatNormalMap.channel),
      clearcoatRoughnessMapUv: ne && _(w.clearcoatRoughnessMap.channel),
      iridescenceMapUv: ve && _(w.iridescenceMap.channel),
      iridescenceThicknessMapUv: Pe && _(w.iridescenceThicknessMap.channel),
      sheenColorMapUv: De && _(w.sheenColorMap.channel),
      sheenRoughnessMapUv: Se && _(w.sheenRoughnessMap.channel),
      specularMapUv: Xe && _(w.specularMap.channel),
      specularColorMapUv: He && _(w.specularColorMap.channel),
      specularIntensityMapUv: ht && _(w.specularIntensityMap.channel),
      transmissionMapUv: U && _(w.transmissionMap.channel),
      thicknessMapUv: de && _(w.thicknessMap.channel),
      alphaMapUv: Z && _(w.alphaMap.channel),
      //
      vertexTangents: !!J.attributes.tangent && ($e || b),
      vertexColors: w.vertexColors,
      vertexAlphas: w.vertexColors === !0 && !!J.attributes.color && J.attributes.color.itemSize === 4,
      pointsUvs: H.isPoints === !0 && !!J.attributes.uv && (ct || Z),
      fog: !!Y,
      useFog: w.fog === !0,
      fogExp2: !!Y && Y.isFogExp2,
      flatShading: w.flatShading === !0,
      sizeAttenuation: w.sizeAttenuation === !0,
      logarithmicDepthBuffer: u,
      reverseDepthBuffer: Le,
      skinning: H.isSkinnedMesh === !0,
      morphTargets: J.morphAttributes.position !== void 0,
      morphNormals: J.morphAttributes.normal !== void 0,
      morphColors: J.morphAttributes.color !== void 0,
      morphTargetsCount: me,
      morphTextureStride: Oe,
      numDirLights: S.directional.length,
      numPointLights: S.point.length,
      numSpotLights: S.spot.length,
      numSpotLightMaps: S.spotLightMap.length,
      numRectAreaLights: S.rectArea.length,
      numHemiLights: S.hemi.length,
      numDirLightShadows: S.directionalShadowMap.length,
      numPointLightShadows: S.pointShadowMap.length,
      numSpotLightShadows: S.spotShadowMap.length,
      numSpotLightShadowsWithMaps: S.numSpotLightShadowsWithMaps,
      numLightProbes: S.numLightProbes,
      numClippingPlanes: o.numPlanes,
      numClipIntersection: o.numIntersection,
      dithering: w.dithering,
      shadowMapEnabled: i.shadowMap.enabled && D.length > 0,
      shadowMapType: i.shadowMap.type,
      toneMapping: St,
      decodeVideoTexture: ct && w.map.isVideoTexture === !0 && rt.getTransfer(w.map.colorSpace) === vt,
      decodeVideoTextureEmissive: _t && w.emissiveMap.isVideoTexture === !0 && rt.getTransfer(w.emissiveMap.colorSpace) === vt,
      premultipliedAlpha: w.premultipliedAlpha,
      doubleSided: w.side === Zt,
      flipSided: w.side === tn,
      useDepthPacking: w.depthPacking >= 0,
      depthPacking: w.depthPacking || 0,
      index0AttributeName: w.index0AttributeName,
      extensionClipCullDistance: Be && w.extensions.clipCullDistance === !0 && n.has("WEBGL_clip_cull_distance"),
      extensionMultiDraw: (Be && w.extensions.multiDraw === !0 || ze) && n.has("WEBGL_multi_draw"),
      rendererExtensionParallelShaderCompile: n.has("KHR_parallel_shader_compile"),
      customProgramCacheKey: w.customProgramCacheKey()
    };
    return Ct.vertexUv1s = l.has(1), Ct.vertexUv2s = l.has(2), Ct.vertexUv3s = l.has(3), l.clear(), Ct;
  }
  function p(w) {
    const S = [];
    if (w.shaderID ? S.push(w.shaderID) : (S.push(w.customVertexShaderID), S.push(w.customFragmentShaderID)), w.defines !== void 0)
      for (const D in w.defines)
        S.push(D), S.push(w.defines[D]);
    return w.isRawShaderMaterial === !1 && (x(S, w), y(S, w), S.push(i.outputColorSpace)), S.push(w.customProgramCacheKey), S.join();
  }
  function x(w, S) {
    w.push(S.precision), w.push(S.outputColorSpace), w.push(S.envMapMode), w.push(S.envMapCubeUVHeight), w.push(S.mapUv), w.push(S.alphaMapUv), w.push(S.lightMapUv), w.push(S.aoMapUv), w.push(S.bumpMapUv), w.push(S.normalMapUv), w.push(S.displacementMapUv), w.push(S.emissiveMapUv), w.push(S.metalnessMapUv), w.push(S.roughnessMapUv), w.push(S.anisotropyMapUv), w.push(S.clearcoatMapUv), w.push(S.clearcoatNormalMapUv), w.push(S.clearcoatRoughnessMapUv), w.push(S.iridescenceMapUv), w.push(S.iridescenceThicknessMapUv), w.push(S.sheenColorMapUv), w.push(S.sheenRoughnessMapUv), w.push(S.specularMapUv), w.push(S.specularColorMapUv), w.push(S.specularIntensityMapUv), w.push(S.transmissionMapUv), w.push(S.thicknessMapUv), w.push(S.combine), w.push(S.fogExp2), w.push(S.sizeAttenuation), w.push(S.morphTargetsCount), w.push(S.morphAttributeCount), w.push(S.numDirLights), w.push(S.numPointLights), w.push(S.numSpotLights), w.push(S.numSpotLightMaps), w.push(S.numHemiLights), w.push(S.numRectAreaLights), w.push(S.numDirLightShadows), w.push(S.numPointLightShadows), w.push(S.numSpotLightShadows), w.push(S.numSpotLightShadowsWithMaps), w.push(S.numLightProbes), w.push(S.shadowMapType), w.push(S.toneMapping), w.push(S.numClippingPlanes), w.push(S.numClipIntersection), w.push(S.depthPacking);
  }
  function y(w, S) {
    a.disableAll(), S.supportsVertexTextures && a.enable(0), S.instancing && a.enable(1), S.instancingColor && a.enable(2), S.instancingMorph && a.enable(3), S.matcap && a.enable(4), S.envMap && a.enable(5), S.normalMapObjectSpace && a.enable(6), S.normalMapTangentSpace && a.enable(7), S.clearcoat && a.enable(8), S.iridescence && a.enable(9), S.alphaTest && a.enable(10), S.vertexColors && a.enable(11), S.vertexAlphas && a.enable(12), S.vertexUv1s && a.enable(13), S.vertexUv2s && a.enable(14), S.vertexUv3s && a.enable(15), S.vertexTangents && a.enable(16), S.anisotropy && a.enable(17), S.alphaHash && a.enable(18), S.batching && a.enable(19), S.dispersion && a.enable(20), S.batchingColor && a.enable(21), w.push(a.mask), a.disableAll(), S.fog && a.enable(0), S.useFog && a.enable(1), S.flatShading && a.enable(2), S.logarithmicDepthBuffer && a.enable(3), S.reverseDepthBuffer && a.enable(4), S.skinning && a.enable(5), S.morphTargets && a.enable(6), S.morphNormals && a.enable(7), S.morphColors && a.enable(8), S.premultipliedAlpha && a.enable(9), S.shadowMapEnabled && a.enable(10), S.doubleSided && a.enable(11), S.flipSided && a.enable(12), S.useDepthPacking && a.enable(13), S.dithering && a.enable(14), S.transmission && a.enable(15), S.sheen && a.enable(16), S.opaque && a.enable(17), S.pointsUvs && a.enable(18), S.decodeVideoTexture && a.enable(19), S.decodeVideoTextureEmissive && a.enable(20), S.alphaToCoverage && a.enable(21), w.push(a.mask);
  }
  function v(w) {
    const S = g[w.type];
    let D;
    if (S) {
      const W = Un[S];
      D = Fd.clone(W.uniforms);
    } else
      D = w.uniforms;
    return D;
  }
  function P(w, S) {
    let D;
    for (let W = 0, H = h.length; W < H; W++) {
      const Y = h[W];
      if (Y.cacheKey === S) {
        D = Y, ++D.usedTimes;
        break;
      }
    }
    return D === void 0 && (D = new e_(i, S, w, r), h.push(D)), D;
  }
  function A(w) {
    if (--w.usedTimes === 0) {
      const S = h.indexOf(w);
      h[S] = h[h.length - 1], h.pop(), w.destroy();
    }
  }
  function C(w) {
    c.remove(w);
  }
  function I() {
    c.dispose();
  }
  return {
    getParameters: m,
    getProgramCacheKey: p,
    getUniforms: v,
    acquireProgram: P,
    releaseProgram: A,
    releaseShaderCache: C,
    // Exposed for resource monitoring & error feedback via renderer.info:
    programs: h,
    dispose: I
  };
}
function r_() {
  let i = /* @__PURE__ */ new WeakMap();
  function e(o) {
    return i.has(o);
  }
  function t(o) {
    let a = i.get(o);
    return a === void 0 && (a = {}, i.set(o, a)), a;
  }
  function n(o) {
    i.delete(o);
  }
  function s(o, a, c) {
    i.get(o)[a] = c;
  }
  function r() {
    i = /* @__PURE__ */ new WeakMap();
  }
  return {
    has: e,
    get: t,
    remove: n,
    update: s,
    dispose: r
  };
}
function o_(i, e) {
  return i.groupOrder !== e.groupOrder ? i.groupOrder - e.groupOrder : i.renderOrder !== e.renderOrder ? i.renderOrder - e.renderOrder : i.material.id !== e.material.id ? i.material.id - e.material.id : i.z !== e.z ? i.z - e.z : i.id - e.id;
}
function Fl(i, e) {
  return i.groupOrder !== e.groupOrder ? i.groupOrder - e.groupOrder : i.renderOrder !== e.renderOrder ? i.renderOrder - e.renderOrder : i.z !== e.z ? e.z - i.z : i.id - e.id;
}
function Ol() {
  const i = [];
  let e = 0;
  const t = [], n = [], s = [];
  function r() {
    e = 0, t.length = 0, n.length = 0, s.length = 0;
  }
  function o(u, d, f, g, _, m) {
    let p = i[e];
    return p === void 0 ? (p = {
      id: u.id,
      object: u,
      geometry: d,
      material: f,
      groupOrder: g,
      renderOrder: u.renderOrder,
      z: _,
      group: m
    }, i[e] = p) : (p.id = u.id, p.object = u, p.geometry = d, p.material = f, p.groupOrder = g, p.renderOrder = u.renderOrder, p.z = _, p.group = m), e++, p;
  }
  function a(u, d, f, g, _, m) {
    const p = o(u, d, f, g, _, m);
    f.transmission > 0 ? n.push(p) : f.transparent === !0 ? s.push(p) : t.push(p);
  }
  function c(u, d, f, g, _, m) {
    const p = o(u, d, f, g, _, m);
    f.transmission > 0 ? n.unshift(p) : f.transparent === !0 ? s.unshift(p) : t.unshift(p);
  }
  function l(u, d) {
    t.length > 1 && t.sort(u || o_), n.length > 1 && n.sort(d || Fl), s.length > 1 && s.sort(d || Fl);
  }
  function h() {
    for (let u = e, d = i.length; u < d; u++) {
      const f = i[u];
      if (f.id === null) break;
      f.id = null, f.object = null, f.geometry = null, f.material = null, f.group = null;
    }
  }
  return {
    opaque: t,
    transmissive: n,
    transparent: s,
    init: r,
    push: a,
    unshift: c,
    finish: h,
    sort: l
  };
}
function a_() {
  let i = /* @__PURE__ */ new WeakMap();
  function e(n, s) {
    const r = i.get(n);
    let o;
    return r === void 0 ? (o = new Ol(), i.set(n, [o])) : s >= r.length ? (o = new Ol(), r.push(o)) : o = r[s], o;
  }
  function t() {
    i = /* @__PURE__ */ new WeakMap();
  }
  return {
    get: e,
    dispose: t
  };
}
function c_() {
  const i = {};
  return {
    get: function(e) {
      if (i[e.id] !== void 0)
        return i[e.id];
      let t;
      switch (e.type) {
        case "DirectionalLight":
          t = {
            direction: new M(),
            color: new Ie()
          };
          break;
        case "SpotLight":
          t = {
            position: new M(),
            direction: new M(),
            color: new Ie(),
            distance: 0,
            coneCos: 0,
            penumbraCos: 0,
            decay: 0
          };
          break;
        case "PointLight":
          t = {
            position: new M(),
            color: new Ie(),
            distance: 0,
            decay: 0
          };
          break;
        case "HemisphereLight":
          t = {
            direction: new M(),
            skyColor: new Ie(),
            groundColor: new Ie()
          };
          break;
        case "RectAreaLight":
          t = {
            color: new Ie(),
            position: new M(),
            halfWidth: new M(),
            halfHeight: new M()
          };
          break;
      }
      return i[e.id] = t, t;
    }
  };
}
function l_() {
  const i = {};
  return {
    get: function(e) {
      if (i[e.id] !== void 0)
        return i[e.id];
      let t;
      switch (e.type) {
        case "DirectionalLight":
          t = {
            shadowIntensity: 1,
            shadowBias: 0,
            shadowNormalBias: 0,
            shadowRadius: 1,
            shadowMapSize: new ue()
          };
          break;
        case "SpotLight":
          t = {
            shadowIntensity: 1,
            shadowBias: 0,
            shadowNormalBias: 0,
            shadowRadius: 1,
            shadowMapSize: new ue()
          };
          break;
        case "PointLight":
          t = {
            shadowIntensity: 1,
            shadowBias: 0,
            shadowNormalBias: 0,
            shadowRadius: 1,
            shadowMapSize: new ue(),
            shadowCameraNear: 1,
            shadowCameraFar: 1e3
          };
          break;
      }
      return i[e.id] = t, t;
    }
  };
}
let h_ = 0;
function u_(i, e) {
  return (e.castShadow ? 2 : 0) - (i.castShadow ? 2 : 0) + (e.map ? 1 : 0) - (i.map ? 1 : 0);
}
function d_(i) {
  const e = new c_(), t = l_(), n = {
    version: 0,
    hash: {
      directionalLength: -1,
      pointLength: -1,
      spotLength: -1,
      rectAreaLength: -1,
      hemiLength: -1,
      numDirectionalShadows: -1,
      numPointShadows: -1,
      numSpotShadows: -1,
      numSpotMaps: -1,
      numLightProbes: -1
    },
    ambient: [0, 0, 0],
    probe: [],
    directional: [],
    directionalShadow: [],
    directionalShadowMap: [],
    directionalShadowMatrix: [],
    spot: [],
    spotLightMap: [],
    spotShadow: [],
    spotShadowMap: [],
    spotLightMatrix: [],
    rectArea: [],
    rectAreaLTC1: null,
    rectAreaLTC2: null,
    point: [],
    pointShadow: [],
    pointShadowMap: [],
    pointShadowMatrix: [],
    hemi: [],
    numSpotLightShadowsWithMaps: 0,
    numLightProbes: 0
  };
  for (let l = 0; l < 9; l++) n.probe.push(new M());
  const s = new M(), r = new Ge(), o = new Ge();
  function a(l) {
    let h = 0, u = 0, d = 0;
    for (let w = 0; w < 9; w++) n.probe[w].set(0, 0, 0);
    let f = 0, g = 0, _ = 0, m = 0, p = 0, x = 0, y = 0, v = 0, P = 0, A = 0, C = 0;
    l.sort(u_);
    for (let w = 0, S = l.length; w < S; w++) {
      const D = l[w], W = D.color, H = D.intensity, Y = D.distance, J = D.shadow && D.shadow.map ? D.shadow.map.texture : null;
      if (D.isAmbientLight)
        h += W.r * H, u += W.g * H, d += W.b * H;
      else if (D.isLightProbe) {
        for (let K = 0; K < 9; K++)
          n.probe[K].addScaledVector(D.sh.coefficients[K], H);
        C++;
      } else if (D.isDirectionalLight) {
        const K = e.get(D);
        if (K.color.copy(D.color).multiplyScalar(D.intensity), D.castShadow) {
          const re = D.shadow, q = t.get(D);
          q.shadowIntensity = re.intensity, q.shadowBias = re.bias, q.shadowNormalBias = re.normalBias, q.shadowRadius = re.radius, q.shadowMapSize = re.mapSize, n.directionalShadow[f] = q, n.directionalShadowMap[f] = J, n.directionalShadowMatrix[f] = D.shadow.matrix, x++;
        }
        n.directional[f] = K, f++;
      } else if (D.isSpotLight) {
        const K = e.get(D);
        K.position.setFromMatrixPosition(D.matrixWorld), K.color.copy(W).multiplyScalar(H), K.distance = Y, K.coneCos = Math.cos(D.angle), K.penumbraCos = Math.cos(D.angle * (1 - D.penumbra)), K.decay = D.decay, n.spot[_] = K;
        const re = D.shadow;
        if (D.map && (n.spotLightMap[P] = D.map, P++, re.updateMatrices(D), D.castShadow && A++), n.spotLightMatrix[_] = re.matrix, D.castShadow) {
          const q = t.get(D);
          q.shadowIntensity = re.intensity, q.shadowBias = re.bias, q.shadowNormalBias = re.normalBias, q.shadowRadius = re.radius, q.shadowMapSize = re.mapSize, n.spotShadow[_] = q, n.spotShadowMap[_] = J, v++;
        }
        _++;
      } else if (D.isRectAreaLight) {
        const K = e.get(D);
        K.color.copy(W).multiplyScalar(H), K.halfWidth.set(D.width * 0.5, 0, 0), K.halfHeight.set(0, D.height * 0.5, 0), n.rectArea[m] = K, m++;
      } else if (D.isPointLight) {
        const K = e.get(D);
        if (K.color.copy(D.color).multiplyScalar(D.intensity), K.distance = D.distance, K.decay = D.decay, D.castShadow) {
          const re = D.shadow, q = t.get(D);
          q.shadowIntensity = re.intensity, q.shadowBias = re.bias, q.shadowNormalBias = re.normalBias, q.shadowRadius = re.radius, q.shadowMapSize = re.mapSize, q.shadowCameraNear = re.camera.near, q.shadowCameraFar = re.camera.far, n.pointShadow[g] = q, n.pointShadowMap[g] = J, n.pointShadowMatrix[g] = D.shadow.matrix, y++;
        }
        n.point[g] = K, g++;
      } else if (D.isHemisphereLight) {
        const K = e.get(D);
        K.skyColor.copy(D.color).multiplyScalar(H), K.groundColor.copy(D.groundColor).multiplyScalar(H), n.hemi[p] = K, p++;
      }
    }
    m > 0 && (i.has("OES_texture_float_linear") === !0 ? (n.rectAreaLTC1 = xe.LTC_FLOAT_1, n.rectAreaLTC2 = xe.LTC_FLOAT_2) : (n.rectAreaLTC1 = xe.LTC_HALF_1, n.rectAreaLTC2 = xe.LTC_HALF_2)), n.ambient[0] = h, n.ambient[1] = u, n.ambient[2] = d;
    const I = n.hash;
    (I.directionalLength !== f || I.pointLength !== g || I.spotLength !== _ || I.rectAreaLength !== m || I.hemiLength !== p || I.numDirectionalShadows !== x || I.numPointShadows !== y || I.numSpotShadows !== v || I.numSpotMaps !== P || I.numLightProbes !== C) && (n.directional.length = f, n.spot.length = _, n.rectArea.length = m, n.point.length = g, n.hemi.length = p, n.directionalShadow.length = x, n.directionalShadowMap.length = x, n.pointShadow.length = y, n.pointShadowMap.length = y, n.spotShadow.length = v, n.spotShadowMap.length = v, n.directionalShadowMatrix.length = x, n.pointShadowMatrix.length = y, n.spotLightMatrix.length = v + P - A, n.spotLightMap.length = P, n.numSpotLightShadowsWithMaps = A, n.numLightProbes = C, I.directionalLength = f, I.pointLength = g, I.spotLength = _, I.rectAreaLength = m, I.hemiLength = p, I.numDirectionalShadows = x, I.numPointShadows = y, I.numSpotShadows = v, I.numSpotMaps = P, I.numLightProbes = C, n.version = h_++);
  }
  function c(l, h) {
    let u = 0, d = 0, f = 0, g = 0, _ = 0;
    const m = h.matrixWorldInverse;
    for (let p = 0, x = l.length; p < x; p++) {
      const y = l[p];
      if (y.isDirectionalLight) {
        const v = n.directional[u];
        v.direction.setFromMatrixPosition(y.matrixWorld), s.setFromMatrixPosition(y.target.matrixWorld), v.direction.sub(s), v.direction.transformDirection(m), u++;
      } else if (y.isSpotLight) {
        const v = n.spot[f];
        v.position.setFromMatrixPosition(y.matrixWorld), v.position.applyMatrix4(m), v.direction.setFromMatrixPosition(y.matrixWorld), s.setFromMatrixPosition(y.target.matrixWorld), v.direction.sub(s), v.direction.transformDirection(m), f++;
      } else if (y.isRectAreaLight) {
        const v = n.rectArea[g];
        v.position.setFromMatrixPosition(y.matrixWorld), v.position.applyMatrix4(m), o.identity(), r.copy(y.matrixWorld), r.premultiply(m), o.extractRotation(r), v.halfWidth.set(y.width * 0.5, 0, 0), v.halfHeight.set(0, y.height * 0.5, 0), v.halfWidth.applyMatrix4(o), v.halfHeight.applyMatrix4(o), g++;
      } else if (y.isPointLight) {
        const v = n.point[d];
        v.position.setFromMatrixPosition(y.matrixWorld), v.position.applyMatrix4(m), d++;
      } else if (y.isHemisphereLight) {
        const v = n.hemi[_];
        v.direction.setFromMatrixPosition(y.matrixWorld), v.direction.transformDirection(m), _++;
      }
    }
  }
  return {
    setup: a,
    setupView: c,
    state: n
  };
}
function Bl(i) {
  const e = new d_(i), t = [], n = [];
  function s(h) {
    l.camera = h, t.length = 0, n.length = 0;
  }
  function r(h) {
    t.push(h);
  }
  function o(h) {
    n.push(h);
  }
  function a() {
    e.setup(t);
  }
  function c(h) {
    e.setupView(t, h);
  }
  const l = {
    lightsArray: t,
    shadowsArray: n,
    camera: null,
    lights: e,
    transmissionRenderTarget: {}
  };
  return {
    init: s,
    state: l,
    setupLights: a,
    setupLightsView: c,
    pushLight: r,
    pushShadow: o
  };
}
function f_(i) {
  let e = /* @__PURE__ */ new WeakMap();
  function t(s, r = 0) {
    const o = e.get(s);
    let a;
    return o === void 0 ? (a = new Bl(i), e.set(s, [a])) : r >= o.length ? (a = new Bl(i), o.push(a)) : a = o[r], a;
  }
  function n() {
    e = /* @__PURE__ */ new WeakMap();
  }
  return {
    get: t,
    dispose: n
  };
}
const p_ = `void main() {
	gl_Position = vec4( position, 1.0 );
}`, m_ = `uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;
function g_(i, e, t) {
  let n = new rc();
  const s = new ue(), r = new ue(), o = new dt(), a = new ff({ depthPacking: Wu }), c = new pf(), l = {}, h = t.maxTextureSize, u = { [ti]: tn, [tn]: ti, [Zt]: Zt }, d = new ii({
    defines: {
      VSM_SAMPLES: 8
    },
    uniforms: {
      shadow_pass: { value: null },
      resolution: { value: new ue() },
      radius: { value: 4 }
    },
    vertexShader: p_,
    fragmentShader: m_
  }), f = d.clone();
  f.defines.HORIZONTAL_PASS = 1;
  const g = new Bt();
  g.setAttribute(
    "position",
    new Vt(
      new Float32Array([-1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5]),
      3
    )
  );
  const _ = new oe(g, d), m = this;
  this.enabled = !1, this.autoUpdate = !0, this.needsUpdate = !1, this.type = sh;
  let p = this.type;
  this.render = function(A, C, I) {
    if (m.enabled === !1 || m.autoUpdate === !1 && m.needsUpdate === !1 || A.length === 0) return;
    const w = i.getRenderTarget(), S = i.getActiveCubeFace(), D = i.getActiveMipmapLevel(), W = i.state;
    W.setBlending(vi), W.buffers.color.setClear(1, 1, 1, 1), W.buffers.depth.setTest(!0), W.setScissorTest(!1);
    const H = p !== Zn && this.type === Zn, Y = p === Zn && this.type !== Zn;
    for (let J = 0, K = A.length; J < K; J++) {
      const re = A[J], q = re.shadow;
      if (q === void 0) {
        console.warn("THREE.WebGLShadowMap:", re, "has no shadow.");
        continue;
      }
      if (q.autoUpdate === !1 && q.needsUpdate === !1) continue;
      s.copy(q.mapSize);
      const pe = q.getFrameExtents();
      if (s.multiply(pe), r.copy(q.mapSize), (s.x > h || s.y > h) && (s.x > h && (r.x = Math.floor(h / pe.x), s.x = r.x * pe.x, q.mapSize.x = r.x), s.y > h && (r.y = Math.floor(h / pe.y), s.y = r.y * pe.y, q.mapSize.y = r.y)), q.map === null || H === !0 || Y === !0) {
        const me = this.type !== Zn ? { minFilter: nn, magFilter: nn } : {};
        q.map !== null && q.map.dispose(), q.map = new Ui(s.x, s.y, me), q.map.texture.name = re.name + ".shadowMap", q.camera.updateProjectionMatrix();
      }
      i.setRenderTarget(q.map), i.clear();
      const le = q.getViewportCount();
      for (let me = 0; me < le; me++) {
        const Oe = q.getViewport(me);
        o.set(
          r.x * Oe.x,
          r.y * Oe.y,
          r.x * Oe.z,
          r.y * Oe.w
        ), W.viewport(o), q.updateMatrices(re, me), n = q.getFrustum(), v(C, I, q.camera, re, this.type);
      }
      q.isPointLightShadow !== !0 && this.type === Zn && x(q, I), q.needsUpdate = !1;
    }
    p = this.type, m.needsUpdate = !1, i.setRenderTarget(w, S, D);
  };
  function x(A, C) {
    const I = e.update(_);
    d.defines.VSM_SAMPLES !== A.blurSamples && (d.defines.VSM_SAMPLES = A.blurSamples, f.defines.VSM_SAMPLES = A.blurSamples, d.needsUpdate = !0, f.needsUpdate = !0), A.mapPass === null && (A.mapPass = new Ui(s.x, s.y)), d.uniforms.shadow_pass.value = A.map.texture, d.uniforms.resolution.value = A.mapSize, d.uniforms.radius.value = A.radius, i.setRenderTarget(A.mapPass), i.clear(), i.renderBufferDirect(C, null, I, d, _, null), f.uniforms.shadow_pass.value = A.mapPass.texture, f.uniforms.resolution.value = A.mapSize, f.uniforms.radius.value = A.radius, i.setRenderTarget(A.map), i.clear(), i.renderBufferDirect(C, null, I, f, _, null);
  }
  function y(A, C, I, w) {
    let S = null;
    const D = I.isPointLight === !0 ? A.customDistanceMaterial : A.customDepthMaterial;
    if (D !== void 0)
      S = D;
    else if (S = I.isPointLight === !0 ? c : a, i.localClippingEnabled && C.clipShadows === !0 && Array.isArray(C.clippingPlanes) && C.clippingPlanes.length !== 0 || C.displacementMap && C.displacementScale !== 0 || C.alphaMap && C.alphaTest > 0 || C.map && C.alphaTest > 0) {
      const W = S.uuid, H = C.uuid;
      let Y = l[W];
      Y === void 0 && (Y = {}, l[W] = Y);
      let J = Y[H];
      J === void 0 && (J = S.clone(), Y[H] = J, C.addEventListener("dispose", P)), S = J;
    }
    if (S.visible = C.visible, S.wireframe = C.wireframe, w === Zn ? S.side = C.shadowSide !== null ? C.shadowSide : C.side : S.side = C.shadowSide !== null ? C.shadowSide : u[C.side], S.alphaMap = C.alphaMap, S.alphaTest = C.alphaTest, S.map = C.map, S.clipShadows = C.clipShadows, S.clippingPlanes = C.clippingPlanes, S.clipIntersection = C.clipIntersection, S.displacementMap = C.displacementMap, S.displacementScale = C.displacementScale, S.displacementBias = C.displacementBias, S.wireframeLinewidth = C.wireframeLinewidth, S.linewidth = C.linewidth, I.isPointLight === !0 && S.isMeshDistanceMaterial === !0) {
      const W = i.properties.get(S);
      W.light = I;
    }
    return S;
  }
  function v(A, C, I, w, S) {
    if (A.visible === !1) return;
    if (A.layers.test(C.layers) && (A.isMesh || A.isLine || A.isPoints) && (A.castShadow || A.receiveShadow && S === Zn) && (!A.frustumCulled || n.intersectsObject(A))) {
      A.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse, A.matrixWorld);
      const H = e.update(A), Y = A.material;
      if (Array.isArray(Y)) {
        const J = H.groups;
        for (let K = 0, re = J.length; K < re; K++) {
          const q = J[K], pe = Y[q.materialIndex];
          if (pe && pe.visible) {
            const le = y(A, pe, w, S);
            A.onBeforeShadow(i, A, C, I, H, le, q), i.renderBufferDirect(I, null, H, le, A, q), A.onAfterShadow(i, A, C, I, H, le, q);
          }
        }
      } else if (Y.visible) {
        const J = y(A, Y, w, S);
        A.onBeforeShadow(i, A, C, I, H, J, null), i.renderBufferDirect(I, null, H, J, A, null), A.onAfterShadow(i, A, C, I, H, J, null);
      }
    }
    const W = A.children;
    for (let H = 0, Y = W.length; H < Y; H++)
      v(W[H], C, I, w, S);
  }
  function P(A) {
    A.target.removeEventListener("dispose", P);
    for (const I in l) {
      const w = l[I], S = A.target.uuid;
      S in w && (w[S].dispose(), delete w[S]);
    }
  }
}
const __ = {
  [ta]: na,
  [ia]: oa,
  [sa]: aa,
  [ms]: ra,
  [na]: ta,
  [oa]: ia,
  [aa]: sa,
  [ra]: ms
};
function v_(i, e) {
  function t() {
    let U = !1;
    const de = new dt();
    let X = null;
    const Z = new dt(0, 0, 0, 0);
    return {
      setMask: function(fe) {
        X !== fe && !U && (i.colorMask(fe, fe, fe, fe), X = fe);
      },
      setLocked: function(fe) {
        U = fe;
      },
      setClear: function(fe, _e, Be, St, Ct) {
        Ct === !0 && (fe *= St, _e *= St, Be *= St), de.set(fe, _e, Be, St), Z.equals(de) === !1 && (i.clearColor(fe, _e, Be, St), Z.copy(de));
      },
      reset: function() {
        U = !1, X = null, Z.set(-1, 0, 0, 0);
      }
    };
  }
  function n() {
    let U = !1, de = !1, X = null, Z = null, fe = null;
    return {
      setReversed: function(_e) {
        if (de !== _e) {
          const Be = e.get("EXT_clip_control");
          de ? Be.clipControlEXT(Be.LOWER_LEFT_EXT, Be.ZERO_TO_ONE_EXT) : Be.clipControlEXT(Be.LOWER_LEFT_EXT, Be.NEGATIVE_ONE_TO_ONE_EXT);
          const St = fe;
          fe = null, this.setClear(St);
        }
        de = _e;
      },
      getReversed: function() {
        return de;
      },
      setTest: function(_e) {
        _e ? ae(i.DEPTH_TEST) : Le(i.DEPTH_TEST);
      },
      setMask: function(_e) {
        X !== _e && !U && (i.depthMask(_e), X = _e);
      },
      setFunc: function(_e) {
        if (de && (_e = __[_e]), Z !== _e) {
          switch (_e) {
            case ta:
              i.depthFunc(i.NEVER);
              break;
            case na:
              i.depthFunc(i.ALWAYS);
              break;
            case ia:
              i.depthFunc(i.LESS);
              break;
            case ms:
              i.depthFunc(i.LEQUAL);
              break;
            case sa:
              i.depthFunc(i.EQUAL);
              break;
            case ra:
              i.depthFunc(i.GEQUAL);
              break;
            case oa:
              i.depthFunc(i.GREATER);
              break;
            case aa:
              i.depthFunc(i.NOTEQUAL);
              break;
            default:
              i.depthFunc(i.LEQUAL);
          }
          Z = _e;
        }
      },
      setLocked: function(_e) {
        U = _e;
      },
      setClear: function(_e) {
        fe !== _e && (de && (_e = 1 - _e), i.clearDepth(_e), fe = _e);
      },
      reset: function() {
        U = !1, X = null, Z = null, fe = null, de = !1;
      }
    };
  }
  function s() {
    let U = !1, de = null, X = null, Z = null, fe = null, _e = null, Be = null, St = null, Ct = null;
    return {
      setTest: function(lt) {
        U || (lt ? ae(i.STENCIL_TEST) : Le(i.STENCIL_TEST));
      },
      setMask: function(lt) {
        de !== lt && !U && (i.stencilMask(lt), de = lt);
      },
      setFunc: function(lt, on, gn) {
        (X !== lt || Z !== on || fe !== gn) && (i.stencilFunc(lt, on, gn), X = lt, Z = on, fe = gn);
      },
      setOp: function(lt, on, gn) {
        (_e !== lt || Be !== on || St !== gn) && (i.stencilOp(lt, on, gn), _e = lt, Be = on, St = gn);
      },
      setLocked: function(lt) {
        U = lt;
      },
      setClear: function(lt) {
        Ct !== lt && (i.clearStencil(lt), Ct = lt);
      },
      reset: function() {
        U = !1, de = null, X = null, Z = null, fe = null, _e = null, Be = null, St = null, Ct = null;
      }
    };
  }
  const r = new t(), o = new n(), a = new s(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap();
  let h = {}, u = {}, d = /* @__PURE__ */ new WeakMap(), f = [], g = null, _ = !1, m = null, p = null, x = null, y = null, v = null, P = null, A = null, C = new Ie(0, 0, 0), I = 0, w = !1, S = null, D = null, W = null, H = null, Y = null;
  const J = i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  let K = !1, re = 0;
  const q = i.getParameter(i.VERSION);
  q.indexOf("WebGL") !== -1 ? (re = parseFloat(/^WebGL (\d)/.exec(q)[1]), K = re >= 1) : q.indexOf("OpenGL ES") !== -1 && (re = parseFloat(/^OpenGL ES (\d)/.exec(q)[1]), K = re >= 2);
  let pe = null, le = {};
  const me = i.getParameter(i.SCISSOR_BOX), Oe = i.getParameter(i.VIEWPORT), Ye = new dt().fromArray(me), j = new dt().fromArray(Oe);
  function ie(U, de, X, Z) {
    const fe = new Uint8Array(4), _e = i.createTexture();
    i.bindTexture(U, _e), i.texParameteri(U, i.TEXTURE_MIN_FILTER, i.NEAREST), i.texParameteri(U, i.TEXTURE_MAG_FILTER, i.NEAREST);
    for (let Be = 0; Be < X; Be++)
      U === i.TEXTURE_3D || U === i.TEXTURE_2D_ARRAY ? i.texImage3D(de, 0, i.RGBA, 1, 1, Z, 0, i.RGBA, i.UNSIGNED_BYTE, fe) : i.texImage2D(de + Be, 0, i.RGBA, 1, 1, 0, i.RGBA, i.UNSIGNED_BYTE, fe);
    return _e;
  }
  const Ae = {};
  Ae[i.TEXTURE_2D] = ie(i.TEXTURE_2D, i.TEXTURE_2D, 1), Ae[i.TEXTURE_CUBE_MAP] = ie(i.TEXTURE_CUBE_MAP, i.TEXTURE_CUBE_MAP_POSITIVE_X, 6), Ae[i.TEXTURE_2D_ARRAY] = ie(i.TEXTURE_2D_ARRAY, i.TEXTURE_2D_ARRAY, 1, 1), Ae[i.TEXTURE_3D] = ie(i.TEXTURE_3D, i.TEXTURE_3D, 1, 1), r.setClear(0, 0, 0, 1), o.setClear(1), a.setClear(0), ae(i.DEPTH_TEST), o.setFunc(ms), je(!1), $e(Sc), ae(i.CULL_FACE), N(vi);
  function ae(U) {
    h[U] !== !0 && (i.enable(U), h[U] = !0);
  }
  function Le(U) {
    h[U] !== !1 && (i.disable(U), h[U] = !1);
  }
  function Fe(U, de) {
    return u[U] !== de ? (i.bindFramebuffer(U, de), u[U] = de, U === i.DRAW_FRAMEBUFFER && (u[i.FRAMEBUFFER] = de), U === i.FRAMEBUFFER && (u[i.DRAW_FRAMEBUFFER] = de), !0) : !1;
  }
  function ze(U, de) {
    let X = f, Z = !1;
    if (U) {
      X = d.get(de), X === void 0 && (X = [], d.set(de, X));
      const fe = U.textures;
      if (X.length !== fe.length || X[0] !== i.COLOR_ATTACHMENT0) {
        for (let _e = 0, Be = fe.length; _e < Be; _e++)
          X[_e] = i.COLOR_ATTACHMENT0 + _e;
        X.length = fe.length, Z = !0;
      }
    } else
      X[0] !== i.BACK && (X[0] = i.BACK, Z = !0);
    Z && i.drawBuffers(X);
  }
  function ct(U) {
    return g !== U ? (i.useProgram(U), g = U, !0) : !1;
  }
  const Qe = {
    [Li]: i.FUNC_ADD,
    [pu]: i.FUNC_SUBTRACT,
    [mu]: i.FUNC_REVERSE_SUBTRACT
  };
  Qe[gu] = i.MIN, Qe[_u] = i.MAX;
  const Mt = {
    [vu]: i.ZERO,
    [xu]: i.ONE,
    [yu]: i.SRC_COLOR,
    [Qo]: i.SRC_ALPHA,
    [Tu]: i.SRC_ALPHA_SATURATE,
    [Eu]: i.DST_COLOR,
    [bu]: i.DST_ALPHA,
    [Su]: i.ONE_MINUS_SRC_COLOR,
    [ea]: i.ONE_MINUS_SRC_ALPHA,
    [Mu]: i.ONE_MINUS_DST_COLOR,
    [wu]: i.ONE_MINUS_DST_ALPHA,
    [Au]: i.CONSTANT_COLOR,
    [Ru]: i.ONE_MINUS_CONSTANT_COLOR,
    [Cu]: i.CONSTANT_ALPHA,
    [Pu]: i.ONE_MINUS_CONSTANT_ALPHA
  };
  function N(U, de, X, Z, fe, _e, Be, St, Ct, lt) {
    if (U === vi) {
      _ === !0 && (Le(i.BLEND), _ = !1);
      return;
    }
    if (_ === !1 && (ae(i.BLEND), _ = !0), U !== fu) {
      if (U !== m || lt !== w) {
        if ((p !== Li || v !== Li) && (i.blendEquation(i.FUNC_ADD), p = Li, v = Li), lt)
          switch (U) {
            case us:
              i.blendFuncSeparate(i.ONE, i.ONE_MINUS_SRC_ALPHA, i.ONE, i.ONE_MINUS_SRC_ALPHA);
              break;
            case bc:
              i.blendFunc(i.ONE, i.ONE);
              break;
            case wc:
              i.blendFuncSeparate(i.ZERO, i.ONE_MINUS_SRC_COLOR, i.ZERO, i.ONE);
              break;
            case Ec:
              i.blendFuncSeparate(i.ZERO, i.SRC_COLOR, i.ZERO, i.SRC_ALPHA);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", U);
              break;
          }
        else
          switch (U) {
            case us:
              i.blendFuncSeparate(i.SRC_ALPHA, i.ONE_MINUS_SRC_ALPHA, i.ONE, i.ONE_MINUS_SRC_ALPHA);
              break;
            case bc:
              i.blendFunc(i.SRC_ALPHA, i.ONE);
              break;
            case wc:
              i.blendFuncSeparate(i.ZERO, i.ONE_MINUS_SRC_COLOR, i.ZERO, i.ONE);
              break;
            case Ec:
              i.blendFunc(i.ZERO, i.SRC_COLOR);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", U);
              break;
          }
        x = null, y = null, P = null, A = null, C.set(0, 0, 0), I = 0, m = U, w = lt;
      }
      return;
    }
    fe = fe || de, _e = _e || X, Be = Be || Z, (de !== p || fe !== v) && (i.blendEquationSeparate(Qe[de], Qe[fe]), p = de, v = fe), (X !== x || Z !== y || _e !== P || Be !== A) && (i.blendFuncSeparate(Mt[X], Mt[Z], Mt[_e], Mt[Be]), x = X, y = Z, P = _e, A = Be), (St.equals(C) === !1 || Ct !== I) && (i.blendColor(St.r, St.g, St.b, Ct), C.copy(St), I = Ct), m = U, w = !1;
  }
  function Wt(U, de) {
    U.side === Zt ? Le(i.CULL_FACE) : ae(i.CULL_FACE);
    let X = U.side === tn;
    de && (X = !X), je(X), U.blending === us && U.transparent === !1 ? N(vi) : N(U.blending, U.blendEquation, U.blendSrc, U.blendDst, U.blendEquationAlpha, U.blendSrcAlpha, U.blendDstAlpha, U.blendColor, U.blendAlpha, U.premultipliedAlpha), o.setFunc(U.depthFunc), o.setTest(U.depthTest), o.setMask(U.depthWrite), r.setMask(U.colorWrite);
    const Z = U.stencilWrite;
    a.setTest(Z), Z && (a.setMask(U.stencilWriteMask), a.setFunc(U.stencilFunc, U.stencilRef, U.stencilFuncMask), a.setOp(U.stencilFail, U.stencilZFail, U.stencilZPass)), _t(U.polygonOffset, U.polygonOffsetFactor, U.polygonOffsetUnits), U.alphaToCoverage === !0 ? ae(i.SAMPLE_ALPHA_TO_COVERAGE) : Le(i.SAMPLE_ALPHA_TO_COVERAGE);
  }
  function je(U) {
    S !== U && (U ? i.frontFace(i.CW) : i.frontFace(i.CCW), S = U);
  }
  function $e(U) {
    U !== uu ? (ae(i.CULL_FACE), U !== D && (U === Sc ? i.cullFace(i.BACK) : U === du ? i.cullFace(i.FRONT) : i.cullFace(i.FRONT_AND_BACK))) : Le(i.CULL_FACE), D = U;
  }
  function Te(U) {
    U !== W && (K && i.lineWidth(U), W = U);
  }
  function _t(U, de, X) {
    U ? (ae(i.POLYGON_OFFSET_FILL), (H !== de || Y !== X) && (i.polygonOffset(de, X), H = de, Y = X)) : Le(i.POLYGON_OFFSET_FILL);
  }
  function Re(U) {
    U ? ae(i.SCISSOR_TEST) : Le(i.SCISSOR_TEST);
  }
  function T(U) {
    U === void 0 && (U = i.TEXTURE0 + J - 1), pe !== U && (i.activeTexture(U), pe = U);
  }
  function b(U, de, X) {
    X === void 0 && (pe === null ? X = i.TEXTURE0 + J - 1 : X = pe);
    let Z = le[X];
    Z === void 0 && (Z = { type: void 0, texture: void 0 }, le[X] = Z), (Z.type !== U || Z.texture !== de) && (pe !== X && (i.activeTexture(X), pe = X), i.bindTexture(U, de || Ae[U]), Z.type = U, Z.texture = de);
  }
  function k() {
    const U = le[pe];
    U !== void 0 && U.type !== void 0 && (i.bindTexture(U.type, null), U.type = void 0, U.texture = void 0);
  }
  function $() {
    try {
      i.compressedTexImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function ee() {
    try {
      i.compressedTexImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function L() {
    try {
      i.texSubImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function B() {
    try {
      i.texSubImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function ce() {
    try {
      i.compressedTexSubImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function be() {
    try {
      i.compressedTexSubImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function Je() {
    try {
      i.texStorage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function ne() {
    try {
      i.texStorage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function ve() {
    try {
      i.texImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function Pe() {
    try {
      i.texImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function De(U) {
    Ye.equals(U) === !1 && (i.scissor(U.x, U.y, U.z, U.w), Ye.copy(U));
  }
  function Se(U) {
    j.equals(U) === !1 && (i.viewport(U.x, U.y, U.z, U.w), j.copy(U));
  }
  function Xe(U, de) {
    let X = l.get(de);
    X === void 0 && (X = /* @__PURE__ */ new WeakMap(), l.set(de, X));
    let Z = X.get(U);
    Z === void 0 && (Z = i.getUniformBlockIndex(de, U.name), X.set(U, Z));
  }
  function He(U, de) {
    const Z = l.get(de).get(U);
    c.get(de) !== Z && (i.uniformBlockBinding(de, Z, U.__bindingPointIndex), c.set(de, Z));
  }
  function ht() {
    i.disable(i.BLEND), i.disable(i.CULL_FACE), i.disable(i.DEPTH_TEST), i.disable(i.POLYGON_OFFSET_FILL), i.disable(i.SCISSOR_TEST), i.disable(i.STENCIL_TEST), i.disable(i.SAMPLE_ALPHA_TO_COVERAGE), i.blendEquation(i.FUNC_ADD), i.blendFunc(i.ONE, i.ZERO), i.blendFuncSeparate(i.ONE, i.ZERO, i.ONE, i.ZERO), i.blendColor(0, 0, 0, 0), i.colorMask(!0, !0, !0, !0), i.clearColor(0, 0, 0, 0), i.depthMask(!0), i.depthFunc(i.LESS), o.setReversed(!1), i.clearDepth(1), i.stencilMask(4294967295), i.stencilFunc(i.ALWAYS, 0, 4294967295), i.stencilOp(i.KEEP, i.KEEP, i.KEEP), i.clearStencil(0), i.cullFace(i.BACK), i.frontFace(i.CCW), i.polygonOffset(0, 0), i.activeTexture(i.TEXTURE0), i.bindFramebuffer(i.FRAMEBUFFER, null), i.bindFramebuffer(i.DRAW_FRAMEBUFFER, null), i.bindFramebuffer(i.READ_FRAMEBUFFER, null), i.useProgram(null), i.lineWidth(1), i.scissor(0, 0, i.canvas.width, i.canvas.height), i.viewport(0, 0, i.canvas.width, i.canvas.height), h = {}, pe = null, le = {}, u = {}, d = /* @__PURE__ */ new WeakMap(), f = [], g = null, _ = !1, m = null, p = null, x = null, y = null, v = null, P = null, A = null, C = new Ie(0, 0, 0), I = 0, w = !1, S = null, D = null, W = null, H = null, Y = null, Ye.set(0, 0, i.canvas.width, i.canvas.height), j.set(0, 0, i.canvas.width, i.canvas.height), r.reset(), o.reset(), a.reset();
  }
  return {
    buffers: {
      color: r,
      depth: o,
      stencil: a
    },
    enable: ae,
    disable: Le,
    bindFramebuffer: Fe,
    drawBuffers: ze,
    useProgram: ct,
    setBlending: N,
    setMaterial: Wt,
    setFlipSided: je,
    setCullFace: $e,
    setLineWidth: Te,
    setPolygonOffset: _t,
    setScissorTest: Re,
    activeTexture: T,
    bindTexture: b,
    unbindTexture: k,
    compressedTexImage2D: $,
    compressedTexImage3D: ee,
    texImage2D: ve,
    texImage3D: Pe,
    updateUBOMapping: Xe,
    uniformBlockBinding: He,
    texStorage2D: Je,
    texStorage3D: ne,
    texSubImage2D: L,
    texSubImage3D: B,
    compressedTexSubImage2D: ce,
    compressedTexSubImage3D: be,
    scissor: De,
    viewport: Se,
    reset: ht
  };
}
function x_(i, e, t, n, s, r, o) {
  const a = e.has("WEBGL_multisampled_render_to_texture") ? e.get("WEBGL_multisampled_render_to_texture") : null, c = typeof navigator > "u" ? !1 : /OculusBrowser/g.test(navigator.userAgent), l = new ue(), h = /* @__PURE__ */ new WeakMap();
  let u;
  const d = /* @__PURE__ */ new WeakMap();
  let f = !1;
  try {
    f = typeof OffscreenCanvas < "u" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
  } catch {
  }
  function g(T, b) {
    return f ? (
      // eslint-disable-next-line compat/compat
      new OffscreenCanvas(T, b)
    ) : or("canvas");
  }
  function _(T, b, k) {
    let $ = 1;
    const ee = Re(T);
    if ((ee.width > k || ee.height > k) && ($ = k / Math.max(ee.width, ee.height)), $ < 1)
      if (typeof HTMLImageElement < "u" && T instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && T instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && T instanceof ImageBitmap || typeof VideoFrame < "u" && T instanceof VideoFrame) {
        const L = Math.floor($ * ee.width), B = Math.floor($ * ee.height);
        u === void 0 && (u = g(L, B));
        const ce = b ? g(L, B) : u;
        return ce.width = L, ce.height = B, ce.getContext("2d").drawImage(T, 0, 0, L, B), console.warn("THREE.WebGLRenderer: Texture has been resized from (" + ee.width + "x" + ee.height + ") to (" + L + "x" + B + ")."), ce;
      } else
        return "data" in T && console.warn("THREE.WebGLRenderer: Image in DataTexture is too big (" + ee.width + "x" + ee.height + ")."), T;
    return T;
  }
  function m(T) {
    return T.generateMipmaps;
  }
  function p(T) {
    i.generateMipmap(T);
  }
  function x(T) {
    return T.isWebGLCubeRenderTarget ? i.TEXTURE_CUBE_MAP : T.isWebGL3DRenderTarget ? i.TEXTURE_3D : T.isWebGLArrayRenderTarget || T.isCompressedArrayTexture ? i.TEXTURE_2D_ARRAY : i.TEXTURE_2D;
  }
  function y(T, b, k, $, ee = !1) {
    if (T !== null) {
      if (i[T] !== void 0) return i[T];
      console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + T + "'");
    }
    let L = b;
    if (b === i.RED && (k === i.FLOAT && (L = i.R32F), k === i.HALF_FLOAT && (L = i.R16F), k === i.UNSIGNED_BYTE && (L = i.R8)), b === i.RED_INTEGER && (k === i.UNSIGNED_BYTE && (L = i.R8UI), k === i.UNSIGNED_SHORT && (L = i.R16UI), k === i.UNSIGNED_INT && (L = i.R32UI), k === i.BYTE && (L = i.R8I), k === i.SHORT && (L = i.R16I), k === i.INT && (L = i.R32I)), b === i.RG && (k === i.FLOAT && (L = i.RG32F), k === i.HALF_FLOAT && (L = i.RG16F), k === i.UNSIGNED_BYTE && (L = i.RG8)), b === i.RG_INTEGER && (k === i.UNSIGNED_BYTE && (L = i.RG8UI), k === i.UNSIGNED_SHORT && (L = i.RG16UI), k === i.UNSIGNED_INT && (L = i.RG32UI), k === i.BYTE && (L = i.RG8I), k === i.SHORT && (L = i.RG16I), k === i.INT && (L = i.RG32I)), b === i.RGB_INTEGER && (k === i.UNSIGNED_BYTE && (L = i.RGB8UI), k === i.UNSIGNED_SHORT && (L = i.RGB16UI), k === i.UNSIGNED_INT && (L = i.RGB32UI), k === i.BYTE && (L = i.RGB8I), k === i.SHORT && (L = i.RGB16I), k === i.INT && (L = i.RGB32I)), b === i.RGBA_INTEGER && (k === i.UNSIGNED_BYTE && (L = i.RGBA8UI), k === i.UNSIGNED_SHORT && (L = i.RGBA16UI), k === i.UNSIGNED_INT && (L = i.RGBA32UI), k === i.BYTE && (L = i.RGBA8I), k === i.SHORT && (L = i.RGBA16I), k === i.INT && (L = i.RGBA32I)), b === i.RGB && k === i.UNSIGNED_INT_5_9_9_9_REV && (L = i.RGB9_E5), b === i.RGBA) {
      const B = ee ? Qr : rt.getTransfer($);
      k === i.FLOAT && (L = i.RGBA32F), k === i.HALF_FLOAT && (L = i.RGBA16F), k === i.UNSIGNED_BYTE && (L = B === vt ? i.SRGB8_ALPHA8 : i.RGBA8), k === i.UNSIGNED_SHORT_4_4_4_4 && (L = i.RGBA4), k === i.UNSIGNED_SHORT_5_5_5_1 && (L = i.RGB5_A1);
    }
    return (L === i.R16F || L === i.R32F || L === i.RG16F || L === i.RG32F || L === i.RGBA16F || L === i.RGBA32F) && e.get("EXT_color_buffer_float"), L;
  }
  function v(T, b) {
    let k;
    return T ? b === null || b === Ni || b === vs ? k = i.DEPTH24_STENCIL8 : b === Cn ? k = i.DEPTH32F_STENCIL8 : b === ir && (k = i.DEPTH24_STENCIL8, console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : b === null || b === Ni || b === vs ? k = i.DEPTH_COMPONENT24 : b === Cn ? k = i.DEPTH_COMPONENT32F : b === ir && (k = i.DEPTH_COMPONENT16), k;
  }
  function P(T, b) {
    return m(T) === !0 || T.isFramebufferTexture && T.minFilter !== nn && T.minFilter !== pn ? Math.log2(Math.max(b.width, b.height)) + 1 : T.mipmaps !== void 0 && T.mipmaps.length > 0 ? T.mipmaps.length : T.isCompressedTexture && Array.isArray(T.image) ? b.mipmaps.length : 1;
  }
  function A(T) {
    const b = T.target;
    b.removeEventListener("dispose", A), I(b), b.isVideoTexture && h.delete(b);
  }
  function C(T) {
    const b = T.target;
    b.removeEventListener("dispose", C), S(b);
  }
  function I(T) {
    const b = n.get(T);
    if (b.__webglInit === void 0) return;
    const k = T.source, $ = d.get(k);
    if ($) {
      const ee = $[b.__cacheKey];
      ee.usedTimes--, ee.usedTimes === 0 && w(T), Object.keys($).length === 0 && d.delete(k);
    }
    n.remove(T);
  }
  function w(T) {
    const b = n.get(T);
    i.deleteTexture(b.__webglTexture);
    const k = T.source, $ = d.get(k);
    delete $[b.__cacheKey], o.memory.textures--;
  }
  function S(T) {
    const b = n.get(T);
    if (T.depthTexture && (T.depthTexture.dispose(), n.remove(T.depthTexture)), T.isWebGLCubeRenderTarget)
      for (let $ = 0; $ < 6; $++) {
        if (Array.isArray(b.__webglFramebuffer[$]))
          for (let ee = 0; ee < b.__webglFramebuffer[$].length; ee++) i.deleteFramebuffer(b.__webglFramebuffer[$][ee]);
        else
          i.deleteFramebuffer(b.__webglFramebuffer[$]);
        b.__webglDepthbuffer && i.deleteRenderbuffer(b.__webglDepthbuffer[$]);
      }
    else {
      if (Array.isArray(b.__webglFramebuffer))
        for (let $ = 0; $ < b.__webglFramebuffer.length; $++) i.deleteFramebuffer(b.__webglFramebuffer[$]);
      else
        i.deleteFramebuffer(b.__webglFramebuffer);
      if (b.__webglDepthbuffer && i.deleteRenderbuffer(b.__webglDepthbuffer), b.__webglMultisampledFramebuffer && i.deleteFramebuffer(b.__webglMultisampledFramebuffer), b.__webglColorRenderbuffer)
        for (let $ = 0; $ < b.__webglColorRenderbuffer.length; $++)
          b.__webglColorRenderbuffer[$] && i.deleteRenderbuffer(b.__webglColorRenderbuffer[$]);
      b.__webglDepthRenderbuffer && i.deleteRenderbuffer(b.__webglDepthRenderbuffer);
    }
    const k = T.textures;
    for (let $ = 0, ee = k.length; $ < ee; $++) {
      const L = n.get(k[$]);
      L.__webglTexture && (i.deleteTexture(L.__webglTexture), o.memory.textures--), n.remove(k[$]);
    }
    n.remove(T);
  }
  let D = 0;
  function W() {
    D = 0;
  }
  function H() {
    const T = D;
    return T >= s.maxTextures && console.warn("THREE.WebGLTextures: Trying to use " + T + " texture units while this GPU supports only " + s.maxTextures), D += 1, T;
  }
  function Y(T) {
    const b = [];
    return b.push(T.wrapS), b.push(T.wrapT), b.push(T.wrapR || 0), b.push(T.magFilter), b.push(T.minFilter), b.push(T.anisotropy), b.push(T.internalFormat), b.push(T.format), b.push(T.type), b.push(T.generateMipmaps), b.push(T.premultiplyAlpha), b.push(T.flipY), b.push(T.unpackAlignment), b.push(T.colorSpace), b.join();
  }
  function J(T, b) {
    const k = n.get(T);
    if (T.isVideoTexture && Te(T), T.isRenderTargetTexture === !1 && T.version > 0 && k.__version !== T.version) {
      const $ = T.image;
      if ($ === null)
        console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");
      else if ($.complete === !1)
        console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");
      else {
        j(k, T, b);
        return;
      }
    }
    t.bindTexture(i.TEXTURE_2D, k.__webglTexture, i.TEXTURE0 + b);
  }
  function K(T, b) {
    const k = n.get(T);
    if (T.version > 0 && k.__version !== T.version) {
      j(k, T, b);
      return;
    }
    t.bindTexture(i.TEXTURE_2D_ARRAY, k.__webglTexture, i.TEXTURE0 + b);
  }
  function re(T, b) {
    const k = n.get(T);
    if (T.version > 0 && k.__version !== T.version) {
      j(k, T, b);
      return;
    }
    t.bindTexture(i.TEXTURE_3D, k.__webglTexture, i.TEXTURE0 + b);
  }
  function q(T, b) {
    const k = n.get(T);
    if (T.version > 0 && k.__version !== T.version) {
      ie(k, T, b);
      return;
    }
    t.bindTexture(i.TEXTURE_CUBE_MAP, k.__webglTexture, i.TEXTURE0 + b);
  }
  const pe = {
    [$t]: i.REPEAT,
    [mi]: i.CLAMP_TO_EDGE,
    [$r]: i.MIRRORED_REPEAT
  }, le = {
    [nn]: i.NEAREST,
    [lh]: i.NEAREST_MIPMAP_NEAREST,
    [Zs]: i.NEAREST_MIPMAP_LINEAR,
    [pn]: i.LINEAR,
    [Gr]: i.LINEAR_MIPMAP_NEAREST,
    [Jn]: i.LINEAR_MIPMAP_LINEAR
  }, me = {
    [qu]: i.NEVER,
    [Ju]: i.ALWAYS,
    [Yu]: i.LESS,
    [Sh]: i.LEQUAL,
    [Ku]: i.EQUAL,
    [$u]: i.GEQUAL,
    [ju]: i.GREATER,
    [Zu]: i.NOTEQUAL
  };
  function Oe(T, b) {
    if (b.type === Cn && e.has("OES_texture_float_linear") === !1 && (b.magFilter === pn || b.magFilter === Gr || b.magFilter === Zs || b.magFilter === Jn || b.minFilter === pn || b.minFilter === Gr || b.minFilter === Zs || b.minFilter === Jn) && console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), i.texParameteri(T, i.TEXTURE_WRAP_S, pe[b.wrapS]), i.texParameteri(T, i.TEXTURE_WRAP_T, pe[b.wrapT]), (T === i.TEXTURE_3D || T === i.TEXTURE_2D_ARRAY) && i.texParameteri(T, i.TEXTURE_WRAP_R, pe[b.wrapR]), i.texParameteri(T, i.TEXTURE_MAG_FILTER, le[b.magFilter]), i.texParameteri(T, i.TEXTURE_MIN_FILTER, le[b.minFilter]), b.compareFunction && (i.texParameteri(T, i.TEXTURE_COMPARE_MODE, i.COMPARE_REF_TO_TEXTURE), i.texParameteri(T, i.TEXTURE_COMPARE_FUNC, me[b.compareFunction])), e.has("EXT_texture_filter_anisotropic") === !0) {
      if (b.magFilter === nn || b.minFilter !== Zs && b.minFilter !== Jn || b.type === Cn && e.has("OES_texture_float_linear") === !1) return;
      if (b.anisotropy > 1 || n.get(b).__currentAnisotropy) {
        const k = e.get("EXT_texture_filter_anisotropic");
        i.texParameterf(T, k.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(b.anisotropy, s.getMaxAnisotropy())), n.get(b).__currentAnisotropy = b.anisotropy;
      }
    }
  }
  function Ye(T, b) {
    let k = !1;
    T.__webglInit === void 0 && (T.__webglInit = !0, b.addEventListener("dispose", A));
    const $ = b.source;
    let ee = d.get($);
    ee === void 0 && (ee = {}, d.set($, ee));
    const L = Y(b);
    if (L !== T.__cacheKey) {
      ee[L] === void 0 && (ee[L] = {
        texture: i.createTexture(),
        usedTimes: 0
      }, o.memory.textures++, k = !0), ee[L].usedTimes++;
      const B = ee[T.__cacheKey];
      B !== void 0 && (ee[T.__cacheKey].usedTimes--, B.usedTimes === 0 && w(b)), T.__cacheKey = L, T.__webglTexture = ee[L].texture;
    }
    return k;
  }
  function j(T, b, k) {
    let $ = i.TEXTURE_2D;
    (b.isDataArrayTexture || b.isCompressedArrayTexture) && ($ = i.TEXTURE_2D_ARRAY), b.isData3DTexture && ($ = i.TEXTURE_3D);
    const ee = Ye(T, b), L = b.source;
    t.bindTexture($, T.__webglTexture, i.TEXTURE0 + k);
    const B = n.get(L);
    if (L.version !== B.__version || ee === !0) {
      t.activeTexture(i.TEXTURE0 + k);
      const ce = rt.getPrimaries(rt.workingColorSpace), be = b.colorSpace === pi ? null : rt.getPrimaries(b.colorSpace), Je = b.colorSpace === pi || ce === be ? i.NONE : i.BROWSER_DEFAULT_WEBGL;
      i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, b.flipY), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, b.premultiplyAlpha), i.pixelStorei(i.UNPACK_ALIGNMENT, b.unpackAlignment), i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL, Je);
      let ne = _(b.image, !1, s.maxTextureSize);
      ne = _t(b, ne);
      const ve = r.convert(b.format, b.colorSpace), Pe = r.convert(b.type);
      let De = y(b.internalFormat, ve, Pe, b.colorSpace, b.isVideoTexture);
      Oe($, b);
      let Se;
      const Xe = b.mipmaps, He = b.isVideoTexture !== !0, ht = B.__version === void 0 || ee === !0, U = L.dataReady, de = P(b, ne);
      if (b.isDepthTexture)
        De = v(b.format === xs, b.type), ht && (He ? t.texStorage2D(i.TEXTURE_2D, 1, De, ne.width, ne.height) : t.texImage2D(i.TEXTURE_2D, 0, De, ne.width, ne.height, 0, ve, Pe, null));
      else if (b.isDataTexture)
        if (Xe.length > 0) {
          He && ht && t.texStorage2D(i.TEXTURE_2D, de, De, Xe[0].width, Xe[0].height);
          for (let X = 0, Z = Xe.length; X < Z; X++)
            Se = Xe[X], He ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, Se.width, Se.height, ve, Pe, Se.data) : t.texImage2D(i.TEXTURE_2D, X, De, Se.width, Se.height, 0, ve, Pe, Se.data);
          b.generateMipmaps = !1;
        } else
          He ? (ht && t.texStorage2D(i.TEXTURE_2D, de, De, ne.width, ne.height), U && t.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, ne.width, ne.height, ve, Pe, ne.data)) : t.texImage2D(i.TEXTURE_2D, 0, De, ne.width, ne.height, 0, ve, Pe, ne.data);
      else if (b.isCompressedTexture)
        if (b.isCompressedArrayTexture) {
          He && ht && t.texStorage3D(i.TEXTURE_2D_ARRAY, de, De, Xe[0].width, Xe[0].height, ne.depth);
          for (let X = 0, Z = Xe.length; X < Z; X++)
            if (Se = Xe[X], b.format !== xn)
              if (ve !== null)
                if (He) {
                  if (U)
                    if (b.layerUpdates.size > 0) {
                      const fe = pl(Se.width, Se.height, b.format, b.type);
                      for (const _e of b.layerUpdates) {
                        const Be = Se.data.subarray(
                          _e * fe / Se.data.BYTES_PER_ELEMENT,
                          (_e + 1) * fe / Se.data.BYTES_PER_ELEMENT
                        );
                        t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, _e, Se.width, Se.height, 1, ve, Be);
                      }
                      b.clearLayerUpdates();
                    } else
                      t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, 0, Se.width, Se.height, ne.depth, ve, Se.data);
                } else
                  t.compressedTexImage3D(i.TEXTURE_2D_ARRAY, X, De, Se.width, Se.height, ne.depth, 0, Se.data, 0, 0);
              else
                console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
            else
              He ? U && t.texSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, 0, Se.width, Se.height, ne.depth, ve, Pe, Se.data) : t.texImage3D(i.TEXTURE_2D_ARRAY, X, De, Se.width, Se.height, ne.depth, 0, ve, Pe, Se.data);
        } else {
          He && ht && t.texStorage2D(i.TEXTURE_2D, de, De, Xe[0].width, Xe[0].height);
          for (let X = 0, Z = Xe.length; X < Z; X++)
            Se = Xe[X], b.format !== xn ? ve !== null ? He ? U && t.compressedTexSubImage2D(i.TEXTURE_2D, X, 0, 0, Se.width, Se.height, ve, Se.data) : t.compressedTexImage2D(i.TEXTURE_2D, X, De, Se.width, Se.height, 0, Se.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : He ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, Se.width, Se.height, ve, Pe, Se.data) : t.texImage2D(i.TEXTURE_2D, X, De, Se.width, Se.height, 0, ve, Pe, Se.data);
        }
      else if (b.isDataArrayTexture)
        if (He) {
          if (ht && t.texStorage3D(i.TEXTURE_2D_ARRAY, de, De, ne.width, ne.height, ne.depth), U)
            if (b.layerUpdates.size > 0) {
              const X = pl(ne.width, ne.height, b.format, b.type);
              for (const Z of b.layerUpdates) {
                const fe = ne.data.subarray(
                  Z * X / ne.data.BYTES_PER_ELEMENT,
                  (Z + 1) * X / ne.data.BYTES_PER_ELEMENT
                );
                t.texSubImage3D(i.TEXTURE_2D_ARRAY, 0, 0, 0, Z, ne.width, ne.height, 1, ve, Pe, fe);
              }
              b.clearLayerUpdates();
            } else
              t.texSubImage3D(i.TEXTURE_2D_ARRAY, 0, 0, 0, 0, ne.width, ne.height, ne.depth, ve, Pe, ne.data);
        } else
          t.texImage3D(i.TEXTURE_2D_ARRAY, 0, De, ne.width, ne.height, ne.depth, 0, ve, Pe, ne.data);
      else if (b.isData3DTexture)
        He ? (ht && t.texStorage3D(i.TEXTURE_3D, de, De, ne.width, ne.height, ne.depth), U && t.texSubImage3D(i.TEXTURE_3D, 0, 0, 0, 0, ne.width, ne.height, ne.depth, ve, Pe, ne.data)) : t.texImage3D(i.TEXTURE_3D, 0, De, ne.width, ne.height, ne.depth, 0, ve, Pe, ne.data);
      else if (b.isFramebufferTexture) {
        if (ht)
          if (He)
            t.texStorage2D(i.TEXTURE_2D, de, De, ne.width, ne.height);
          else {
            let X = ne.width, Z = ne.height;
            for (let fe = 0; fe < de; fe++)
              t.texImage2D(i.TEXTURE_2D, fe, De, X, Z, 0, ve, Pe, null), X >>= 1, Z >>= 1;
          }
      } else if (Xe.length > 0) {
        if (He && ht) {
          const X = Re(Xe[0]);
          t.texStorage2D(i.TEXTURE_2D, de, De, X.width, X.height);
        }
        for (let X = 0, Z = Xe.length; X < Z; X++)
          Se = Xe[X], He ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, ve, Pe, Se) : t.texImage2D(i.TEXTURE_2D, X, De, ve, Pe, Se);
        b.generateMipmaps = !1;
      } else if (He) {
        if (ht) {
          const X = Re(ne);
          t.texStorage2D(i.TEXTURE_2D, de, De, X.width, X.height);
        }
        U && t.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, ve, Pe, ne);
      } else
        t.texImage2D(i.TEXTURE_2D, 0, De, ve, Pe, ne);
      m(b) && p($), B.__version = L.version, b.onUpdate && b.onUpdate(b);
    }
    T.__version = b.version;
  }
  function ie(T, b, k) {
    if (b.image.length !== 6) return;
    const $ = Ye(T, b), ee = b.source;
    t.bindTexture(i.TEXTURE_CUBE_MAP, T.__webglTexture, i.TEXTURE0 + k);
    const L = n.get(ee);
    if (ee.version !== L.__version || $ === !0) {
      t.activeTexture(i.TEXTURE0 + k);
      const B = rt.getPrimaries(rt.workingColorSpace), ce = b.colorSpace === pi ? null : rt.getPrimaries(b.colorSpace), be = b.colorSpace === pi || B === ce ? i.NONE : i.BROWSER_DEFAULT_WEBGL;
      i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, b.flipY), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, b.premultiplyAlpha), i.pixelStorei(i.UNPACK_ALIGNMENT, b.unpackAlignment), i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL, be);
      const Je = b.isCompressedTexture || b.image[0].isCompressedTexture, ne = b.image[0] && b.image[0].isDataTexture, ve = [];
      for (let Z = 0; Z < 6; Z++)
        !Je && !ne ? ve[Z] = _(b.image[Z], !0, s.maxCubemapSize) : ve[Z] = ne ? b.image[Z].image : b.image[Z], ve[Z] = _t(b, ve[Z]);
      const Pe = ve[0], De = r.convert(b.format, b.colorSpace), Se = r.convert(b.type), Xe = y(b.internalFormat, De, Se, b.colorSpace), He = b.isVideoTexture !== !0, ht = L.__version === void 0 || $ === !0, U = ee.dataReady;
      let de = P(b, Pe);
      Oe(i.TEXTURE_CUBE_MAP, b);
      let X;
      if (Je) {
        He && ht && t.texStorage2D(i.TEXTURE_CUBE_MAP, de, Xe, Pe.width, Pe.height);
        for (let Z = 0; Z < 6; Z++) {
          X = ve[Z].mipmaps;
          for (let fe = 0; fe < X.length; fe++) {
            const _e = X[fe];
            b.format !== xn ? De !== null ? He ? U && t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe, 0, 0, _e.width, _e.height, De, _e.data) : t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe, Xe, _e.width, _e.height, 0, _e.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : He ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe, 0, 0, _e.width, _e.height, De, Se, _e.data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe, Xe, _e.width, _e.height, 0, De, Se, _e.data);
          }
        }
      } else {
        if (X = b.mipmaps, He && ht) {
          X.length > 0 && de++;
          const Z = Re(ve[0]);
          t.texStorage2D(i.TEXTURE_CUBE_MAP, de, Xe, Z.width, Z.height);
        }
        for (let Z = 0; Z < 6; Z++)
          if (ne) {
            He ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, 0, 0, ve[Z].width, ve[Z].height, De, Se, ve[Z].data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, Xe, ve[Z].width, ve[Z].height, 0, De, Se, ve[Z].data);
            for (let fe = 0; fe < X.length; fe++) {
              const Be = X[fe].image[Z].image;
              He ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe + 1, 0, 0, Be.width, Be.height, De, Se, Be.data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe + 1, Xe, Be.width, Be.height, 0, De, Se, Be.data);
            }
          } else {
            He ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, 0, 0, De, Se, ve[Z]) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, Xe, De, Se, ve[Z]);
            for (let fe = 0; fe < X.length; fe++) {
              const _e = X[fe];
              He ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe + 1, 0, 0, De, Se, _e.image[Z]) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, fe + 1, Xe, De, Se, _e.image[Z]);
            }
          }
      }
      m(b) && p(i.TEXTURE_CUBE_MAP), L.__version = ee.version, b.onUpdate && b.onUpdate(b);
    }
    T.__version = b.version;
  }
  function Ae(T, b, k, $, ee, L) {
    const B = r.convert(k.format, k.colorSpace), ce = r.convert(k.type), be = y(k.internalFormat, B, ce, k.colorSpace), Je = n.get(b), ne = n.get(k);
    if (ne.__renderTarget = b, !Je.__hasExternalTextures) {
      const ve = Math.max(1, b.width >> L), Pe = Math.max(1, b.height >> L);
      ee === i.TEXTURE_3D || ee === i.TEXTURE_2D_ARRAY ? t.texImage3D(ee, L, be, ve, Pe, b.depth, 0, B, ce, null) : t.texImage2D(ee, L, be, ve, Pe, 0, B, ce, null);
    }
    t.bindFramebuffer(i.FRAMEBUFFER, T), $e(b) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, $, ee, ne.__webglTexture, 0, je(b)) : (ee === i.TEXTURE_2D || ee >= i.TEXTURE_CUBE_MAP_POSITIVE_X && ee <= i.TEXTURE_CUBE_MAP_NEGATIVE_Z) && i.framebufferTexture2D(i.FRAMEBUFFER, $, ee, ne.__webglTexture, L), t.bindFramebuffer(i.FRAMEBUFFER, null);
  }
  function ae(T, b, k) {
    if (i.bindRenderbuffer(i.RENDERBUFFER, T), b.depthBuffer) {
      const $ = b.depthTexture, ee = $ && $.isDepthTexture ? $.type : null, L = v(b.stencilBuffer, ee), B = b.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, ce = je(b);
      $e(b) ? a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER, ce, L, b.width, b.height) : k ? i.renderbufferStorageMultisample(i.RENDERBUFFER, ce, L, b.width, b.height) : i.renderbufferStorage(i.RENDERBUFFER, L, b.width, b.height), i.framebufferRenderbuffer(i.FRAMEBUFFER, B, i.RENDERBUFFER, T);
    } else {
      const $ = b.textures;
      for (let ee = 0; ee < $.length; ee++) {
        const L = $[ee], B = r.convert(L.format, L.colorSpace), ce = r.convert(L.type), be = y(L.internalFormat, B, ce, L.colorSpace), Je = je(b);
        k && $e(b) === !1 ? i.renderbufferStorageMultisample(i.RENDERBUFFER, Je, be, b.width, b.height) : $e(b) ? a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER, Je, be, b.width, b.height) : i.renderbufferStorage(i.RENDERBUFFER, be, b.width, b.height);
      }
    }
    i.bindRenderbuffer(i.RENDERBUFFER, null);
  }
  function Le(T, b) {
    if (b && b.isWebGLCubeRenderTarget) throw new Error("Depth Texture with cube render targets is not supported");
    if (t.bindFramebuffer(i.FRAMEBUFFER, T), !(b.depthTexture && b.depthTexture.isDepthTexture))
      throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");
    const $ = n.get(b.depthTexture);
    $.__renderTarget = b, (!$.__webglTexture || b.depthTexture.image.width !== b.width || b.depthTexture.image.height !== b.height) && (b.depthTexture.image.width = b.width, b.depthTexture.image.height = b.height, b.depthTexture.needsUpdate = !0), J(b.depthTexture, 0);
    const ee = $.__webglTexture, L = je(b);
    if (b.depthTexture.format === ds)
      $e(b) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, i.DEPTH_ATTACHMENT, i.TEXTURE_2D, ee, 0, L) : i.framebufferTexture2D(i.FRAMEBUFFER, i.DEPTH_ATTACHMENT, i.TEXTURE_2D, ee, 0);
    else if (b.depthTexture.format === xs)
      $e(b) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, i.DEPTH_STENCIL_ATTACHMENT, i.TEXTURE_2D, ee, 0, L) : i.framebufferTexture2D(i.FRAMEBUFFER, i.DEPTH_STENCIL_ATTACHMENT, i.TEXTURE_2D, ee, 0);
    else
      throw new Error("Unknown depthTexture format");
  }
  function Fe(T) {
    const b = n.get(T), k = T.isWebGLCubeRenderTarget === !0;
    if (b.__boundDepthTexture !== T.depthTexture) {
      const $ = T.depthTexture;
      if (b.__depthDisposeCallback && b.__depthDisposeCallback(), $) {
        const ee = () => {
          delete b.__boundDepthTexture, delete b.__depthDisposeCallback, $.removeEventListener("dispose", ee);
        };
        $.addEventListener("dispose", ee), b.__depthDisposeCallback = ee;
      }
      b.__boundDepthTexture = $;
    }
    if (T.depthTexture && !b.__autoAllocateDepthBuffer) {
      if (k) throw new Error("target.depthTexture not supported in Cube render targets");
      Le(b.__webglFramebuffer, T);
    } else if (k) {
      b.__webglDepthbuffer = [];
      for (let $ = 0; $ < 6; $++)
        if (t.bindFramebuffer(i.FRAMEBUFFER, b.__webglFramebuffer[$]), b.__webglDepthbuffer[$] === void 0)
          b.__webglDepthbuffer[$] = i.createRenderbuffer(), ae(b.__webglDepthbuffer[$], T, !1);
        else {
          const ee = T.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, L = b.__webglDepthbuffer[$];
          i.bindRenderbuffer(i.RENDERBUFFER, L), i.framebufferRenderbuffer(i.FRAMEBUFFER, ee, i.RENDERBUFFER, L);
        }
    } else if (t.bindFramebuffer(i.FRAMEBUFFER, b.__webglFramebuffer), b.__webglDepthbuffer === void 0)
      b.__webglDepthbuffer = i.createRenderbuffer(), ae(b.__webglDepthbuffer, T, !1);
    else {
      const $ = T.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, ee = b.__webglDepthbuffer;
      i.bindRenderbuffer(i.RENDERBUFFER, ee), i.framebufferRenderbuffer(i.FRAMEBUFFER, $, i.RENDERBUFFER, ee);
    }
    t.bindFramebuffer(i.FRAMEBUFFER, null);
  }
  function ze(T, b, k) {
    const $ = n.get(T);
    b !== void 0 && Ae($.__webglFramebuffer, T, T.texture, i.COLOR_ATTACHMENT0, i.TEXTURE_2D, 0), k !== void 0 && Fe(T);
  }
  function ct(T) {
    const b = T.texture, k = n.get(T), $ = n.get(b);
    T.addEventListener("dispose", C);
    const ee = T.textures, L = T.isWebGLCubeRenderTarget === !0, B = ee.length > 1;
    if (B || ($.__webglTexture === void 0 && ($.__webglTexture = i.createTexture()), $.__version = b.version, o.memory.textures++), L) {
      k.__webglFramebuffer = [];
      for (let ce = 0; ce < 6; ce++)
        if (b.mipmaps && b.mipmaps.length > 0) {
          k.__webglFramebuffer[ce] = [];
          for (let be = 0; be < b.mipmaps.length; be++)
            k.__webglFramebuffer[ce][be] = i.createFramebuffer();
        } else
          k.__webglFramebuffer[ce] = i.createFramebuffer();
    } else {
      if (b.mipmaps && b.mipmaps.length > 0) {
        k.__webglFramebuffer = [];
        for (let ce = 0; ce < b.mipmaps.length; ce++)
          k.__webglFramebuffer[ce] = i.createFramebuffer();
      } else
        k.__webglFramebuffer = i.createFramebuffer();
      if (B)
        for (let ce = 0, be = ee.length; ce < be; ce++) {
          const Je = n.get(ee[ce]);
          Je.__webglTexture === void 0 && (Je.__webglTexture = i.createTexture(), o.memory.textures++);
        }
      if (T.samples > 0 && $e(T) === !1) {
        k.__webglMultisampledFramebuffer = i.createFramebuffer(), k.__webglColorRenderbuffer = [], t.bindFramebuffer(i.FRAMEBUFFER, k.__webglMultisampledFramebuffer);
        for (let ce = 0; ce < ee.length; ce++) {
          const be = ee[ce];
          k.__webglColorRenderbuffer[ce] = i.createRenderbuffer(), i.bindRenderbuffer(i.RENDERBUFFER, k.__webglColorRenderbuffer[ce]);
          const Je = r.convert(be.format, be.colorSpace), ne = r.convert(be.type), ve = y(be.internalFormat, Je, ne, be.colorSpace, T.isXRRenderTarget === !0), Pe = je(T);
          i.renderbufferStorageMultisample(i.RENDERBUFFER, Pe, ve, T.width, T.height), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + ce, i.RENDERBUFFER, k.__webglColorRenderbuffer[ce]);
        }
        i.bindRenderbuffer(i.RENDERBUFFER, null), T.depthBuffer && (k.__webglDepthRenderbuffer = i.createRenderbuffer(), ae(k.__webglDepthRenderbuffer, T, !0)), t.bindFramebuffer(i.FRAMEBUFFER, null);
      }
    }
    if (L) {
      t.bindTexture(i.TEXTURE_CUBE_MAP, $.__webglTexture), Oe(i.TEXTURE_CUBE_MAP, b);
      for (let ce = 0; ce < 6; ce++)
        if (b.mipmaps && b.mipmaps.length > 0)
          for (let be = 0; be < b.mipmaps.length; be++)
            Ae(k.__webglFramebuffer[ce][be], T, b, i.COLOR_ATTACHMENT0, i.TEXTURE_CUBE_MAP_POSITIVE_X + ce, be);
        else
          Ae(k.__webglFramebuffer[ce], T, b, i.COLOR_ATTACHMENT0, i.TEXTURE_CUBE_MAP_POSITIVE_X + ce, 0);
      m(b) && p(i.TEXTURE_CUBE_MAP), t.unbindTexture();
    } else if (B) {
      for (let ce = 0, be = ee.length; ce < be; ce++) {
        const Je = ee[ce], ne = n.get(Je);
        t.bindTexture(i.TEXTURE_2D, ne.__webglTexture), Oe(i.TEXTURE_2D, Je), Ae(k.__webglFramebuffer, T, Je, i.COLOR_ATTACHMENT0 + ce, i.TEXTURE_2D, 0), m(Je) && p(i.TEXTURE_2D);
      }
      t.unbindTexture();
    } else {
      let ce = i.TEXTURE_2D;
      if ((T.isWebGL3DRenderTarget || T.isWebGLArrayRenderTarget) && (ce = T.isWebGL3DRenderTarget ? i.TEXTURE_3D : i.TEXTURE_2D_ARRAY), t.bindTexture(ce, $.__webglTexture), Oe(ce, b), b.mipmaps && b.mipmaps.length > 0)
        for (let be = 0; be < b.mipmaps.length; be++)
          Ae(k.__webglFramebuffer[be], T, b, i.COLOR_ATTACHMENT0, ce, be);
      else
        Ae(k.__webglFramebuffer, T, b, i.COLOR_ATTACHMENT0, ce, 0);
      m(b) && p(ce), t.unbindTexture();
    }
    T.depthBuffer && Fe(T);
  }
  function Qe(T) {
    const b = T.textures;
    for (let k = 0, $ = b.length; k < $; k++) {
      const ee = b[k];
      if (m(ee)) {
        const L = x(T), B = n.get(ee).__webglTexture;
        t.bindTexture(L, B), p(L), t.unbindTexture();
      }
    }
  }
  const Mt = [], N = [];
  function Wt(T) {
    if (T.samples > 0) {
      if ($e(T) === !1) {
        const b = T.textures, k = T.width, $ = T.height;
        let ee = i.COLOR_BUFFER_BIT;
        const L = T.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, B = n.get(T), ce = b.length > 1;
        if (ce)
          for (let be = 0; be < b.length; be++)
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglMultisampledFramebuffer), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + be, i.RENDERBUFFER, null), t.bindFramebuffer(i.FRAMEBUFFER, B.__webglFramebuffer), i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0 + be, i.TEXTURE_2D, null, 0);
        t.bindFramebuffer(i.READ_FRAMEBUFFER, B.__webglMultisampledFramebuffer), t.bindFramebuffer(i.DRAW_FRAMEBUFFER, B.__webglFramebuffer);
        for (let be = 0; be < b.length; be++) {
          if (T.resolveDepthBuffer && (T.depthBuffer && (ee |= i.DEPTH_BUFFER_BIT), T.stencilBuffer && T.resolveStencilBuffer && (ee |= i.STENCIL_BUFFER_BIT)), ce) {
            i.framebufferRenderbuffer(i.READ_FRAMEBUFFER, i.COLOR_ATTACHMENT0, i.RENDERBUFFER, B.__webglColorRenderbuffer[be]);
            const Je = n.get(b[be]).__webglTexture;
            i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0, i.TEXTURE_2D, Je, 0);
          }
          i.blitFramebuffer(0, 0, k, $, 0, 0, k, $, ee, i.NEAREST), c === !0 && (Mt.length = 0, N.length = 0, Mt.push(i.COLOR_ATTACHMENT0 + be), T.depthBuffer && T.resolveDepthBuffer === !1 && (Mt.push(L), N.push(L), i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER, N)), i.invalidateFramebuffer(i.READ_FRAMEBUFFER, Mt));
        }
        if (t.bindFramebuffer(i.READ_FRAMEBUFFER, null), t.bindFramebuffer(i.DRAW_FRAMEBUFFER, null), ce)
          for (let be = 0; be < b.length; be++) {
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglMultisampledFramebuffer), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + be, i.RENDERBUFFER, B.__webglColorRenderbuffer[be]);
            const Je = n.get(b[be]).__webglTexture;
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglFramebuffer), i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0 + be, i.TEXTURE_2D, Je, 0);
          }
        t.bindFramebuffer(i.DRAW_FRAMEBUFFER, B.__webglMultisampledFramebuffer);
      } else if (T.depthBuffer && T.resolveDepthBuffer === !1 && c) {
        const b = T.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT;
        i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER, [b]);
      }
    }
  }
  function je(T) {
    return Math.min(s.maxSamples, T.samples);
  }
  function $e(T) {
    const b = n.get(T);
    return T.samples > 0 && e.has("WEBGL_multisampled_render_to_texture") === !0 && b.__useRenderToTexture !== !1;
  }
  function Te(T) {
    const b = o.render.frame;
    h.get(T) !== b && (h.set(T, b), T.update());
  }
  function _t(T, b) {
    const k = T.colorSpace, $ = T.format, ee = T.type;
    return T.isCompressedTexture === !0 || T.isVideoTexture === !0 || k !== sn && k !== pi && (rt.getTransfer(k) === vt ? ($ !== xn || ee !== ni) && console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : console.error("THREE.WebGLTextures: Unsupported texture color space:", k)), b;
  }
  function Re(T) {
    return typeof HTMLImageElement < "u" && T instanceof HTMLImageElement ? (l.width = T.naturalWidth || T.width, l.height = T.naturalHeight || T.height) : typeof VideoFrame < "u" && T instanceof VideoFrame ? (l.width = T.displayWidth, l.height = T.displayHeight) : (l.width = T.width, l.height = T.height), l;
  }
  this.allocateTextureUnit = H, this.resetTextureUnits = W, this.setTexture2D = J, this.setTexture2DArray = K, this.setTexture3D = re, this.setTextureCube = q, this.rebindTextures = ze, this.setupRenderTarget = ct, this.updateRenderTargetMipmap = Qe, this.updateMultisampleRenderTarget = Wt, this.setupDepthRenderbuffer = Fe, this.setupFrameBufferTexture = Ae, this.useMultisampledRTT = $e;
}
function y_(i, e) {
  function t(n, s = pi) {
    let r;
    const o = rt.getTransfer(s);
    if (n === ni) return i.UNSIGNED_BYTE;
    if (n === ja) return i.UNSIGNED_SHORT_4_4_4_4;
    if (n === Za) return i.UNSIGNED_SHORT_5_5_5_1;
    if (n === dh) return i.UNSIGNED_INT_5_9_9_9_REV;
    if (n === hh) return i.BYTE;
    if (n === uh) return i.SHORT;
    if (n === ir) return i.UNSIGNED_SHORT;
    if (n === Ka) return i.INT;
    if (n === Ni) return i.UNSIGNED_INT;
    if (n === Cn) return i.FLOAT;
    if (n === ar) return i.HALF_FLOAT;
    if (n === fh) return i.ALPHA;
    if (n === ph) return i.RGB;
    if (n === xn) return i.RGBA;
    if (n === mh) return i.LUMINANCE;
    if (n === gh) return i.LUMINANCE_ALPHA;
    if (n === ds) return i.DEPTH_COMPONENT;
    if (n === xs) return i.DEPTH_STENCIL;
    if (n === $a) return i.RED;
    if (n === Ja) return i.RED_INTEGER;
    if (n === _h) return i.RG;
    if (n === Qa) return i.RG_INTEGER;
    if (n === ec) return i.RGBA_INTEGER;
    if (n === Wr || n === Xr || n === qr || n === Yr)
      if (o === vt)
        if (r = e.get("WEBGL_compressed_texture_s3tc_srgb"), r !== null) {
          if (n === Wr) return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;
          if (n === Xr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
          if (n === qr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
          if (n === Yr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
        } else
          return null;
      else if (r = e.get("WEBGL_compressed_texture_s3tc"), r !== null) {
        if (n === Wr) return r.COMPRESSED_RGB_S3TC_DXT1_EXT;
        if (n === Xr) return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;
        if (n === qr) return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;
        if (n === Yr) return r.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      } else
        return null;
    if (n === ha || n === ua || n === da || n === fa)
      if (r = e.get("WEBGL_compressed_texture_pvrtc"), r !== null) {
        if (n === ha) return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
        if (n === ua) return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
        if (n === da) return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
        if (n === fa) return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
      } else
        return null;
    if (n === pa || n === ma || n === ga)
      if (r = e.get("WEBGL_compressed_texture_etc"), r !== null) {
        if (n === pa || n === ma) return o === vt ? r.COMPRESSED_SRGB8_ETC2 : r.COMPRESSED_RGB8_ETC2;
        if (n === ga) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : r.COMPRESSED_RGBA8_ETC2_EAC;
      } else
        return null;
    if (n === _a || n === va || n === xa || n === ya || n === Sa || n === ba || n === wa || n === Ea || n === Ma || n === Ta || n === Aa || n === Ra || n === Ca || n === Pa)
      if (r = e.get("WEBGL_compressed_texture_astc"), r !== null) {
        if (n === _a) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : r.COMPRESSED_RGBA_ASTC_4x4_KHR;
        if (n === va) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : r.COMPRESSED_RGBA_ASTC_5x4_KHR;
        if (n === xa) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : r.COMPRESSED_RGBA_ASTC_5x5_KHR;
        if (n === ya) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : r.COMPRESSED_RGBA_ASTC_6x5_KHR;
        if (n === Sa) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : r.COMPRESSED_RGBA_ASTC_6x6_KHR;
        if (n === ba) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : r.COMPRESSED_RGBA_ASTC_8x5_KHR;
        if (n === wa) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : r.COMPRESSED_RGBA_ASTC_8x6_KHR;
        if (n === Ea) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : r.COMPRESSED_RGBA_ASTC_8x8_KHR;
        if (n === Ma) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : r.COMPRESSED_RGBA_ASTC_10x5_KHR;
        if (n === Ta) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : r.COMPRESSED_RGBA_ASTC_10x6_KHR;
        if (n === Aa) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : r.COMPRESSED_RGBA_ASTC_10x8_KHR;
        if (n === Ra) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : r.COMPRESSED_RGBA_ASTC_10x10_KHR;
        if (n === Ca) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : r.COMPRESSED_RGBA_ASTC_12x10_KHR;
        if (n === Pa) return o === vt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : r.COMPRESSED_RGBA_ASTC_12x12_KHR;
      } else
        return null;
    if (n === Kr || n === Ia || n === La)
      if (r = e.get("EXT_texture_compression_bptc"), r !== null) {
        if (n === Kr) return o === vt ? r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : r.COMPRESSED_RGBA_BPTC_UNORM_EXT;
        if (n === Ia) return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
        if (n === La) return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
      } else
        return null;
    if (n === vh || n === Da || n === Na || n === Ua)
      if (r = e.get("EXT_texture_compression_rgtc"), r !== null) {
        if (n === Kr) return r.COMPRESSED_RED_RGTC1_EXT;
        if (n === Da) return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;
        if (n === Na) return r.COMPRESSED_RED_GREEN_RGTC2_EXT;
        if (n === Ua) return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
      } else
        return null;
    return n === vs ? i.UNSIGNED_INT_24_8 : i[n] !== void 0 ? i[n] : null;
  }
  return { convert: t };
}
const S_ = { type: "move" };
class Xo {
  constructor() {
    this._targetRay = null, this._grip = null, this._hand = null;
  }
  getHandSpace() {
    return this._hand === null && (this._hand = new ye(), this._hand.matrixAutoUpdate = !1, this._hand.visible = !1, this._hand.joints = {}, this._hand.inputState = { pinching: !1 }), this._hand;
  }
  getTargetRaySpace() {
    return this._targetRay === null && (this._targetRay = new ye(), this._targetRay.matrixAutoUpdate = !1, this._targetRay.visible = !1, this._targetRay.hasLinearVelocity = !1, this._targetRay.linearVelocity = new M(), this._targetRay.hasAngularVelocity = !1, this._targetRay.angularVelocity = new M()), this._targetRay;
  }
  getGripSpace() {
    return this._grip === null && (this._grip = new ye(), this._grip.matrixAutoUpdate = !1, this._grip.visible = !1, this._grip.hasLinearVelocity = !1, this._grip.linearVelocity = new M(), this._grip.hasAngularVelocity = !1, this._grip.angularVelocity = new M()), this._grip;
  }
  dispatchEvent(e) {
    return this._targetRay !== null && this._targetRay.dispatchEvent(e), this._grip !== null && this._grip.dispatchEvent(e), this._hand !== null && this._hand.dispatchEvent(e), this;
  }
  connect(e) {
    if (e && e.hand) {
      const t = this._hand;
      if (t)
        for (const n of e.hand.values())
          this._getHandJoint(t, n);
    }
    return this.dispatchEvent({ type: "connected", data: e }), this;
  }
  disconnect(e) {
    return this.dispatchEvent({ type: "disconnected", data: e }), this._targetRay !== null && (this._targetRay.visible = !1), this._grip !== null && (this._grip.visible = !1), this._hand !== null && (this._hand.visible = !1), this;
  }
  update(e, t, n) {
    let s = null, r = null, o = null;
    const a = this._targetRay, c = this._grip, l = this._hand;
    if (e && t.session.visibilityState !== "visible-blurred") {
      if (l && e.hand) {
        o = !0;
        for (const _ of e.hand.values()) {
          const m = t.getJointPose(_, n), p = this._getHandJoint(l, _);
          m !== null && (p.matrix.fromArray(m.transform.matrix), p.matrix.decompose(p.position, p.rotation, p.scale), p.matrixWorldNeedsUpdate = !0, p.jointRadius = m.radius), p.visible = m !== null;
        }
        const h = l.joints["index-finger-tip"], u = l.joints["thumb-tip"], d = h.position.distanceTo(u.position), f = 0.02, g = 5e-3;
        l.inputState.pinching && d > f + g ? (l.inputState.pinching = !1, this.dispatchEvent({
          type: "pinchend",
          handedness: e.handedness,
          target: this
        })) : !l.inputState.pinching && d <= f - g && (l.inputState.pinching = !0, this.dispatchEvent({
          type: "pinchstart",
          handedness: e.handedness,
          target: this
        }));
      } else
        c !== null && e.gripSpace && (r = t.getPose(e.gripSpace, n), r !== null && (c.matrix.fromArray(r.transform.matrix), c.matrix.decompose(c.position, c.rotation, c.scale), c.matrixWorldNeedsUpdate = !0, r.linearVelocity ? (c.hasLinearVelocity = !0, c.linearVelocity.copy(r.linearVelocity)) : c.hasLinearVelocity = !1, r.angularVelocity ? (c.hasAngularVelocity = !0, c.angularVelocity.copy(r.angularVelocity)) : c.hasAngularVelocity = !1));
      a !== null && (s = t.getPose(e.targetRaySpace, n), s === null && r !== null && (s = r), s !== null && (a.matrix.fromArray(s.transform.matrix), a.matrix.decompose(a.position, a.rotation, a.scale), a.matrixWorldNeedsUpdate = !0, s.linearVelocity ? (a.hasLinearVelocity = !0, a.linearVelocity.copy(s.linearVelocity)) : a.hasLinearVelocity = !1, s.angularVelocity ? (a.hasAngularVelocity = !0, a.angularVelocity.copy(s.angularVelocity)) : a.hasAngularVelocity = !1, this.dispatchEvent(S_)));
    }
    return a !== null && (a.visible = s !== null), c !== null && (c.visible = r !== null), l !== null && (l.visible = o !== null), this;
  }
  // private method
  _getHandJoint(e, t) {
    if (e.joints[t.jointName] === void 0) {
      const n = new ye();
      n.matrixAutoUpdate = !1, n.visible = !1, e.joints[t.jointName] = n, e.add(n);
    }
    return e.joints[t.jointName];
  }
}
const b_ = `
void main() {

	gl_Position = vec4( position, 1.0 );

}`, w_ = `
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;
class E_ {
  constructor() {
    this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
  }
  init(e, t, n) {
    if (this.texture === null) {
      const s = new Ut(), r = e.properties.get(s);
      r.__webglTexture = t.texture, (t.depthNear !== n.depthNear || t.depthFar !== n.depthFar) && (this.depthNear = t.depthNear, this.depthFar = t.depthFar), this.texture = s;
    }
  }
  getMesh(e) {
    if (this.texture !== null && this.mesh === null) {
      const t = e.cameras[0].viewport, n = new ii({
        vertexShader: b_,
        fragmentShader: w_,
        uniforms: {
          depthColor: { value: this.texture },
          depthWidth: { value: t.z },
          depthHeight: { value: t.w }
        }
      });
      this.mesh = new oe(new rn(20, 20), n);
    }
    return this.mesh;
  }
  reset() {
    this.texture = null, this.mesh = null;
  }
  getDepthTexture() {
    return this.texture;
  }
}
class M_ extends yi {
  constructor(e, t) {
    super();
    const n = this;
    let s = null, r = 1, o = null, a = "local-floor", c = 1, l = null, h = null, u = null, d = null, f = null, g = null;
    const _ = new E_(), m = t.getContextAttributes();
    let p = null, x = null;
    const y = [], v = [], P = new ue();
    let A = null;
    const C = new en();
    C.viewport = new dt();
    const I = new en();
    I.viewport = new dt();
    const w = [C, I], S = new Lf();
    let D = null, W = null;
    this.cameraAutoUpdate = !0, this.enabled = !1, this.isPresenting = !1, this.getController = function(j) {
      let ie = y[j];
      return ie === void 0 && (ie = new Xo(), y[j] = ie), ie.getTargetRaySpace();
    }, this.getControllerGrip = function(j) {
      let ie = y[j];
      return ie === void 0 && (ie = new Xo(), y[j] = ie), ie.getGripSpace();
    }, this.getHand = function(j) {
      let ie = y[j];
      return ie === void 0 && (ie = new Xo(), y[j] = ie), ie.getHandSpace();
    };
    function H(j) {
      const ie = v.indexOf(j.inputSource);
      if (ie === -1)
        return;
      const Ae = y[ie];
      Ae !== void 0 && (Ae.update(j.inputSource, j.frame, l || o), Ae.dispatchEvent({ type: j.type, data: j.inputSource }));
    }
    function Y() {
      s.removeEventListener("select", H), s.removeEventListener("selectstart", H), s.removeEventListener("selectend", H), s.removeEventListener("squeeze", H), s.removeEventListener("squeezestart", H), s.removeEventListener("squeezeend", H), s.removeEventListener("end", Y), s.removeEventListener("inputsourceschange", J);
      for (let j = 0; j < y.length; j++) {
        const ie = v[j];
        ie !== null && (v[j] = null, y[j].disconnect(ie));
      }
      D = null, W = null, _.reset(), e.setRenderTarget(p), f = null, d = null, u = null, s = null, x = null, Ye.stop(), n.isPresenting = !1, e.setPixelRatio(A), e.setSize(P.width, P.height, !1), n.dispatchEvent({ type: "sessionend" });
    }
    this.setFramebufferScaleFactor = function(j) {
      r = j, n.isPresenting === !0 && console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.");
    }, this.setReferenceSpaceType = function(j) {
      a = j, n.isPresenting === !0 && console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.");
    }, this.getReferenceSpace = function() {
      return l || o;
    }, this.setReferenceSpace = function(j) {
      l = j;
    }, this.getBaseLayer = function() {
      return d !== null ? d : f;
    }, this.getBinding = function() {
      return u;
    }, this.getFrame = function() {
      return g;
    }, this.getSession = function() {
      return s;
    }, this.setSession = async function(j) {
      if (s = j, s !== null) {
        if (p = e.getRenderTarget(), s.addEventListener("select", H), s.addEventListener("selectstart", H), s.addEventListener("selectend", H), s.addEventListener("squeeze", H), s.addEventListener("squeezestart", H), s.addEventListener("squeezeend", H), s.addEventListener("end", Y), s.addEventListener("inputsourceschange", J), m.xrCompatible !== !0 && await t.makeXRCompatible(), A = e.getPixelRatio(), e.getSize(P), s.enabledFeatures !== void 0 && s.enabledFeatures.includes("layers")) {
          let Ae = null, ae = null, Le = null;
          m.depth && (Le = m.stencil ? t.DEPTH24_STENCIL8 : t.DEPTH_COMPONENT24, Ae = m.stencil ? xs : ds, ae = m.stencil ? vs : Ni);
          const Fe = {
            colorFormat: t.RGBA8,
            depthFormat: Le,
            scaleFactor: r
          };
          u = new XRWebGLBinding(s, t), d = u.createProjectionLayer(Fe), s.updateRenderState({ layers: [d] }), e.setPixelRatio(1), e.setSize(d.textureWidth, d.textureHeight, !1), x = new Ui(
            d.textureWidth,
            d.textureHeight,
            {
              format: xn,
              type: ni,
              depthTexture: new Fh(d.textureWidth, d.textureHeight, ae, void 0, void 0, void 0, void 0, void 0, void 0, Ae),
              stencilBuffer: m.stencil,
              colorSpace: e.outputColorSpace,
              samples: m.antialias ? 4 : 0,
              resolveDepthBuffer: d.ignoreDepthValues === !1
            }
          );
        } else {
          const Ae = {
            antialias: m.antialias,
            alpha: !0,
            depth: m.depth,
            stencil: m.stencil,
            framebufferScaleFactor: r
          };
          f = new XRWebGLLayer(s, t, Ae), s.updateRenderState({ baseLayer: f }), e.setPixelRatio(1), e.setSize(f.framebufferWidth, f.framebufferHeight, !1), x = new Ui(
            f.framebufferWidth,
            f.framebufferHeight,
            {
              format: xn,
              type: ni,
              colorSpace: e.outputColorSpace,
              stencilBuffer: m.stencil
            }
          );
        }
        x.isXRRenderTarget = !0, this.setFoveation(c), l = null, o = await s.requestReferenceSpace(a), Ye.setContext(s), Ye.start(), n.isPresenting = !0, n.dispatchEvent({ type: "sessionstart" });
      }
    }, this.getEnvironmentBlendMode = function() {
      if (s !== null)
        return s.environmentBlendMode;
    }, this.getDepthTexture = function() {
      return _.getDepthTexture();
    };
    function J(j) {
      for (let ie = 0; ie < j.removed.length; ie++) {
        const Ae = j.removed[ie], ae = v.indexOf(Ae);
        ae >= 0 && (v[ae] = null, y[ae].disconnect(Ae));
      }
      for (let ie = 0; ie < j.added.length; ie++) {
        const Ae = j.added[ie];
        let ae = v.indexOf(Ae);
        if (ae === -1) {
          for (let Fe = 0; Fe < y.length; Fe++)
            if (Fe >= v.length) {
              v.push(Ae), ae = Fe;
              break;
            } else if (v[Fe] === null) {
              v[Fe] = Ae, ae = Fe;
              break;
            }
          if (ae === -1) break;
        }
        const Le = y[ae];
        Le && Le.connect(Ae);
      }
    }
    const K = new M(), re = new M();
    function q(j, ie, Ae) {
      K.setFromMatrixPosition(ie.matrixWorld), re.setFromMatrixPosition(Ae.matrixWorld);
      const ae = K.distanceTo(re), Le = ie.projectionMatrix.elements, Fe = Ae.projectionMatrix.elements, ze = Le[14] / (Le[10] - 1), ct = Le[14] / (Le[10] + 1), Qe = (Le[9] + 1) / Le[5], Mt = (Le[9] - 1) / Le[5], N = (Le[8] - 1) / Le[0], Wt = (Fe[8] + 1) / Fe[0], je = ze * N, $e = ze * Wt, Te = ae / (-N + Wt), _t = Te * -N;
      if (ie.matrixWorld.decompose(j.position, j.quaternion, j.scale), j.translateX(_t), j.translateZ(Te), j.matrixWorld.compose(j.position, j.quaternion, j.scale), j.matrixWorldInverse.copy(j.matrixWorld).invert(), Le[10] === -1)
        j.projectionMatrix.copy(ie.projectionMatrix), j.projectionMatrixInverse.copy(ie.projectionMatrixInverse);
      else {
        const Re = ze + Te, T = ct + Te, b = je - _t, k = $e + (ae - _t), $ = Qe * ct / T * Re, ee = Mt * ct / T * Re;
        j.projectionMatrix.makePerspective(b, k, $, ee, Re, T), j.projectionMatrixInverse.copy(j.projectionMatrix).invert();
      }
    }
    function pe(j, ie) {
      ie === null ? j.matrixWorld.copy(j.matrix) : j.matrixWorld.multiplyMatrices(ie.matrixWorld, j.matrix), j.matrixWorldInverse.copy(j.matrixWorld).invert();
    }
    this.updateCamera = function(j) {
      if (s === null) return;
      let ie = j.near, Ae = j.far;
      _.texture !== null && (_.depthNear > 0 && (ie = _.depthNear), _.depthFar > 0 && (Ae = _.depthFar)), S.near = I.near = C.near = ie, S.far = I.far = C.far = Ae, (D !== S.near || W !== S.far) && (s.updateRenderState({
        depthNear: S.near,
        depthFar: S.far
      }), D = S.near, W = S.far), C.layers.mask = j.layers.mask | 2, I.layers.mask = j.layers.mask | 4, S.layers.mask = C.layers.mask | I.layers.mask;
      const ae = j.parent, Le = S.cameras;
      pe(S, ae);
      for (let Fe = 0; Fe < Le.length; Fe++)
        pe(Le[Fe], ae);
      Le.length === 2 ? q(S, C, I) : S.projectionMatrix.copy(C.projectionMatrix), le(j, S, ae);
    };
    function le(j, ie, Ae) {
      Ae === null ? j.matrix.copy(ie.matrixWorld) : (j.matrix.copy(Ae.matrixWorld), j.matrix.invert(), j.matrix.multiply(ie.matrixWorld)), j.matrix.decompose(j.position, j.quaternion, j.scale), j.updateMatrixWorld(!0), j.projectionMatrix.copy(ie.projectionMatrix), j.projectionMatrixInverse.copy(ie.projectionMatrixInverse), j.isPerspectiveCamera && (j.fov = ys * 2 * Math.atan(1 / j.projectionMatrix.elements[5]), j.zoom = 1);
    }
    this.getCamera = function() {
      return S;
    }, this.getFoveation = function() {
      if (!(d === null && f === null))
        return c;
    }, this.setFoveation = function(j) {
      c = j, d !== null && (d.fixedFoveation = j), f !== null && f.fixedFoveation !== void 0 && (f.fixedFoveation = j);
    }, this.hasDepthSensing = function() {
      return _.texture !== null;
    }, this.getDepthSensingMesh = function() {
      return _.getMesh(S);
    };
    let me = null;
    function Oe(j, ie) {
      if (h = ie.getViewerPose(l || o), g = ie, h !== null) {
        const Ae = h.views;
        f !== null && (e.setRenderTargetFramebuffer(x, f.framebuffer), e.setRenderTarget(x));
        let ae = !1;
        Ae.length !== S.cameras.length && (S.cameras.length = 0, ae = !0);
        for (let Fe = 0; Fe < Ae.length; Fe++) {
          const ze = Ae[Fe];
          let ct = null;
          if (f !== null)
            ct = f.getViewport(ze);
          else {
            const Mt = u.getViewSubImage(d, ze);
            ct = Mt.viewport, Fe === 0 && (e.setRenderTargetTextures(
              x,
              Mt.colorTexture,
              d.ignoreDepthValues ? void 0 : Mt.depthStencilTexture
            ), e.setRenderTarget(x));
          }
          let Qe = w[Fe];
          Qe === void 0 && (Qe = new en(), Qe.layers.enable(Fe), Qe.viewport = new dt(), w[Fe] = Qe), Qe.matrix.fromArray(ze.transform.matrix), Qe.matrix.decompose(Qe.position, Qe.quaternion, Qe.scale), Qe.projectionMatrix.fromArray(ze.projectionMatrix), Qe.projectionMatrixInverse.copy(Qe.projectionMatrix).invert(), Qe.viewport.set(ct.x, ct.y, ct.width, ct.height), Fe === 0 && (S.matrix.copy(Qe.matrix), S.matrix.decompose(S.position, S.quaternion, S.scale)), ae === !0 && S.cameras.push(Qe);
        }
        const Le = s.enabledFeatures;
        if (Le && Le.includes("depth-sensing")) {
          const Fe = u.getDepthInformation(Ae[0]);
          Fe && Fe.isValid && Fe.texture && _.init(e, Fe, s.renderState);
        }
      }
      for (let Ae = 0; Ae < y.length; Ae++) {
        const ae = v[Ae], Le = y[Ae];
        ae !== null && Le !== void 0 && Le.update(ae, ie, l || o);
      }
      me && me(j, ie), ie.detectedPlanes && n.dispatchEvent({ type: "planesdetected", data: ie }), g = null;
    }
    const Ye = new Yh();
    Ye.setAnimationLoop(Oe), this.setAnimationLoop = function(j) {
      me = j;
    }, this.dispose = function() {
    };
  }
}
const Ri = /* @__PURE__ */ new On(), T_ = /* @__PURE__ */ new Ge();
function A_(i, e) {
  function t(m, p) {
    m.matrixAutoUpdate === !0 && m.updateMatrix(), p.value.copy(m.matrix);
  }
  function n(m, p) {
    p.color.getRGB(m.fogColor.value, Ch(i)), p.isFog ? (m.fogNear.value = p.near, m.fogFar.value = p.far) : p.isFogExp2 && (m.fogDensity.value = p.density);
  }
  function s(m, p, x, y, v) {
    p.isMeshBasicMaterial || p.isMeshLambertMaterial ? r(m, p) : p.isMeshToonMaterial ? (r(m, p), u(m, p)) : p.isMeshPhongMaterial ? (r(m, p), h(m, p)) : p.isMeshStandardMaterial ? (r(m, p), d(m, p), p.isMeshPhysicalMaterial && f(m, p, v)) : p.isMeshMatcapMaterial ? (r(m, p), g(m, p)) : p.isMeshDepthMaterial ? r(m, p) : p.isMeshDistanceMaterial ? (r(m, p), _(m, p)) : p.isMeshNormalMaterial ? r(m, p) : p.isLineBasicMaterial ? (o(m, p), p.isLineDashedMaterial && a(m, p)) : p.isPointsMaterial ? c(m, p, x, y) : p.isSpriteMaterial ? l(m, p) : p.isShadowMaterial ? (m.color.value.copy(p.color), m.opacity.value = p.opacity) : p.isShaderMaterial && (p.uniformsNeedUpdate = !1);
  }
  function r(m, p) {
    m.opacity.value = p.opacity, p.color && m.diffuse.value.copy(p.color), p.emissive && m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity), p.map && (m.map.value = p.map, t(p.map, m.mapTransform)), p.alphaMap && (m.alphaMap.value = p.alphaMap, t(p.alphaMap, m.alphaMapTransform)), p.bumpMap && (m.bumpMap.value = p.bumpMap, t(p.bumpMap, m.bumpMapTransform), m.bumpScale.value = p.bumpScale, p.side === tn && (m.bumpScale.value *= -1)), p.normalMap && (m.normalMap.value = p.normalMap, t(p.normalMap, m.normalMapTransform), m.normalScale.value.copy(p.normalScale), p.side === tn && m.normalScale.value.negate()), p.displacementMap && (m.displacementMap.value = p.displacementMap, t(p.displacementMap, m.displacementMapTransform), m.displacementScale.value = p.displacementScale, m.displacementBias.value = p.displacementBias), p.emissiveMap && (m.emissiveMap.value = p.emissiveMap, t(p.emissiveMap, m.emissiveMapTransform)), p.specularMap && (m.specularMap.value = p.specularMap, t(p.specularMap, m.specularMapTransform)), p.alphaTest > 0 && (m.alphaTest.value = p.alphaTest);
    const x = e.get(p), y = x.envMap, v = x.envMapRotation;
    y && (m.envMap.value = y, Ri.copy(v), Ri.x *= -1, Ri.y *= -1, Ri.z *= -1, y.isCubeTexture && y.isRenderTargetTexture === !1 && (Ri.y *= -1, Ri.z *= -1), m.envMapRotation.value.setFromMatrix4(T_.makeRotationFromEuler(Ri)), m.flipEnvMap.value = y.isCubeTexture && y.isRenderTargetTexture === !1 ? -1 : 1, m.reflectivity.value = p.reflectivity, m.ior.value = p.ior, m.refractionRatio.value = p.refractionRatio), p.lightMap && (m.lightMap.value = p.lightMap, m.lightMapIntensity.value = p.lightMapIntensity, t(p.lightMap, m.lightMapTransform)), p.aoMap && (m.aoMap.value = p.aoMap, m.aoMapIntensity.value = p.aoMapIntensity, t(p.aoMap, m.aoMapTransform));
  }
  function o(m, p) {
    m.diffuse.value.copy(p.color), m.opacity.value = p.opacity, p.map && (m.map.value = p.map, t(p.map, m.mapTransform));
  }
  function a(m, p) {
    m.dashSize.value = p.dashSize, m.totalSize.value = p.dashSize + p.gapSize, m.scale.value = p.scale;
  }
  function c(m, p, x, y) {
    m.diffuse.value.copy(p.color), m.opacity.value = p.opacity, m.size.value = p.size * x, m.scale.value = y * 0.5, p.map && (m.map.value = p.map, t(p.map, m.uvTransform)), p.alphaMap && (m.alphaMap.value = p.alphaMap, t(p.alphaMap, m.alphaMapTransform)), p.alphaTest > 0 && (m.alphaTest.value = p.alphaTest);
  }
  function l(m, p) {
    m.diffuse.value.copy(p.color), m.opacity.value = p.opacity, m.rotation.value = p.rotation, p.map && (m.map.value = p.map, t(p.map, m.mapTransform)), p.alphaMap && (m.alphaMap.value = p.alphaMap, t(p.alphaMap, m.alphaMapTransform)), p.alphaTest > 0 && (m.alphaTest.value = p.alphaTest);
  }
  function h(m, p) {
    m.specular.value.copy(p.specular), m.shininess.value = Math.max(p.shininess, 1e-4);
  }
  function u(m, p) {
    p.gradientMap && (m.gradientMap.value = p.gradientMap);
  }
  function d(m, p) {
    m.metalness.value = p.metalness, p.metalnessMap && (m.metalnessMap.value = p.metalnessMap, t(p.metalnessMap, m.metalnessMapTransform)), m.roughness.value = p.roughness, p.roughnessMap && (m.roughnessMap.value = p.roughnessMap, t(p.roughnessMap, m.roughnessMapTransform)), p.envMap && (m.envMapIntensity.value = p.envMapIntensity);
  }
  function f(m, p, x) {
    m.ior.value = p.ior, p.sheen > 0 && (m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen), m.sheenRoughness.value = p.sheenRoughness, p.sheenColorMap && (m.sheenColorMap.value = p.sheenColorMap, t(p.sheenColorMap, m.sheenColorMapTransform)), p.sheenRoughnessMap && (m.sheenRoughnessMap.value = p.sheenRoughnessMap, t(p.sheenRoughnessMap, m.sheenRoughnessMapTransform))), p.clearcoat > 0 && (m.clearcoat.value = p.clearcoat, m.clearcoatRoughness.value = p.clearcoatRoughness, p.clearcoatMap && (m.clearcoatMap.value = p.clearcoatMap, t(p.clearcoatMap, m.clearcoatMapTransform)), p.clearcoatRoughnessMap && (m.clearcoatRoughnessMap.value = p.clearcoatRoughnessMap, t(p.clearcoatRoughnessMap, m.clearcoatRoughnessMapTransform)), p.clearcoatNormalMap && (m.clearcoatNormalMap.value = p.clearcoatNormalMap, t(p.clearcoatNormalMap, m.clearcoatNormalMapTransform), m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale), p.side === tn && m.clearcoatNormalScale.value.negate())), p.dispersion > 0 && (m.dispersion.value = p.dispersion), p.iridescence > 0 && (m.iridescence.value = p.iridescence, m.iridescenceIOR.value = p.iridescenceIOR, m.iridescenceThicknessMinimum.value = p.iridescenceThicknessRange[0], m.iridescenceThicknessMaximum.value = p.iridescenceThicknessRange[1], p.iridescenceMap && (m.iridescenceMap.value = p.iridescenceMap, t(p.iridescenceMap, m.iridescenceMapTransform)), p.iridescenceThicknessMap && (m.iridescenceThicknessMap.value = p.iridescenceThicknessMap, t(p.iridescenceThicknessMap, m.iridescenceThicknessMapTransform))), p.transmission > 0 && (m.transmission.value = p.transmission, m.transmissionSamplerMap.value = x.texture, m.transmissionSamplerSize.value.set(x.width, x.height), p.transmissionMap && (m.transmissionMap.value = p.transmissionMap, t(p.transmissionMap, m.transmissionMapTransform)), m.thickness.value = p.thickness, p.thicknessMap && (m.thicknessMap.value = p.thicknessMap, t(p.thicknessMap, m.thicknessMapTransform)), m.attenuationDistance.value = p.attenuationDistance, m.attenuationColor.value.copy(p.attenuationColor)), p.anisotropy > 0 && (m.anisotropyVector.value.set(p.anisotropy * Math.cos(p.anisotropyRotation), p.anisotropy * Math.sin(p.anisotropyRotation)), p.anisotropyMap && (m.anisotropyMap.value = p.anisotropyMap, t(p.anisotropyMap, m.anisotropyMapTransform))), m.specularIntensity.value = p.specularIntensity, m.specularColor.value.copy(p.specularColor), p.specularColorMap && (m.specularColorMap.value = p.specularColorMap, t(p.specularColorMap, m.specularColorMapTransform)), p.specularIntensityMap && (m.specularIntensityMap.value = p.specularIntensityMap, t(p.specularIntensityMap, m.specularIntensityMapTransform));
  }
  function g(m, p) {
    p.matcap && (m.matcap.value = p.matcap);
  }
  function _(m, p) {
    const x = e.get(p).light;
    m.referencePosition.value.setFromMatrixPosition(x.matrixWorld), m.nearDistance.value = x.shadow.camera.near, m.farDistance.value = x.shadow.camera.far;
  }
  return {
    refreshFogUniforms: n,
    refreshMaterialUniforms: s
  };
}
function R_(i, e, t, n) {
  let s = {}, r = {}, o = [];
  const a = i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);
  function c(x, y) {
    const v = y.program;
    n.uniformBlockBinding(x, v);
  }
  function l(x, y) {
    let v = s[x.id];
    v === void 0 && (g(x), v = h(x), s[x.id] = v, x.addEventListener("dispose", m));
    const P = y.program;
    n.updateUBOMapping(x, P);
    const A = e.render.frame;
    r[x.id] !== A && (d(x), r[x.id] = A);
  }
  function h(x) {
    const y = u();
    x.__bindingPointIndex = y;
    const v = i.createBuffer(), P = x.__size, A = x.usage;
    return i.bindBuffer(i.UNIFORM_BUFFER, v), i.bufferData(i.UNIFORM_BUFFER, P, A), i.bindBuffer(i.UNIFORM_BUFFER, null), i.bindBufferBase(i.UNIFORM_BUFFER, y, v), v;
  }
  function u() {
    for (let x = 0; x < a; x++)
      if (o.indexOf(x) === -1)
        return o.push(x), x;
    return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
  }
  function d(x) {
    const y = s[x.id], v = x.uniforms, P = x.__cache;
    i.bindBuffer(i.UNIFORM_BUFFER, y);
    for (let A = 0, C = v.length; A < C; A++) {
      const I = Array.isArray(v[A]) ? v[A] : [v[A]];
      for (let w = 0, S = I.length; w < S; w++) {
        const D = I[w];
        if (f(D, A, w, P) === !0) {
          const W = D.__offset, H = Array.isArray(D.value) ? D.value : [D.value];
          let Y = 0;
          for (let J = 0; J < H.length; J++) {
            const K = H[J], re = _(K);
            typeof K == "number" || typeof K == "boolean" ? (D.__data[0] = K, i.bufferSubData(i.UNIFORM_BUFFER, W + Y, D.__data)) : K.isMatrix3 ? (D.__data[0] = K.elements[0], D.__data[1] = K.elements[1], D.__data[2] = K.elements[2], D.__data[3] = 0, D.__data[4] = K.elements[3], D.__data[5] = K.elements[4], D.__data[6] = K.elements[5], D.__data[7] = 0, D.__data[8] = K.elements[6], D.__data[9] = K.elements[7], D.__data[10] = K.elements[8], D.__data[11] = 0) : (K.toArray(D.__data, Y), Y += re.storage / Float32Array.BYTES_PER_ELEMENT);
          }
          i.bufferSubData(i.UNIFORM_BUFFER, W, D.__data);
        }
      }
    }
    i.bindBuffer(i.UNIFORM_BUFFER, null);
  }
  function f(x, y, v, P) {
    const A = x.value, C = y + "_" + v;
    if (P[C] === void 0)
      return typeof A == "number" || typeof A == "boolean" ? P[C] = A : P[C] = A.clone(), !0;
    {
      const I = P[C];
      if (typeof A == "number" || typeof A == "boolean") {
        if (I !== A)
          return P[C] = A, !0;
      } else if (I.equals(A) === !1)
        return I.copy(A), !0;
    }
    return !1;
  }
  function g(x) {
    const y = x.uniforms;
    let v = 0;
    const P = 16;
    for (let C = 0, I = y.length; C < I; C++) {
      const w = Array.isArray(y[C]) ? y[C] : [y[C]];
      for (let S = 0, D = w.length; S < D; S++) {
        const W = w[S], H = Array.isArray(W.value) ? W.value : [W.value];
        for (let Y = 0, J = H.length; Y < J; Y++) {
          const K = H[Y], re = _(K), q = v % P, pe = q % re.boundary, le = q + pe;
          v += pe, le !== 0 && P - le < re.storage && (v += P - le), W.__data = new Float32Array(re.storage / Float32Array.BYTES_PER_ELEMENT), W.__offset = v, v += re.storage;
        }
      }
    }
    const A = v % P;
    return A > 0 && (v += P - A), x.__size = v, x.__cache = {}, this;
  }
  function _(x) {
    const y = {
      boundary: 0,
      // bytes
      storage: 0
      // bytes
    };
    return typeof x == "number" || typeof x == "boolean" ? (y.boundary = 4, y.storage = 4) : x.isVector2 ? (y.boundary = 8, y.storage = 8) : x.isVector3 || x.isColor ? (y.boundary = 16, y.storage = 12) : x.isVector4 ? (y.boundary = 16, y.storage = 16) : x.isMatrix3 ? (y.boundary = 48, y.storage = 48) : x.isMatrix4 ? (y.boundary = 64, y.storage = 64) : x.isTexture ? console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.") : console.warn("THREE.WebGLRenderer: Unsupported uniform value type.", x), y;
  }
  function m(x) {
    const y = x.target;
    y.removeEventListener("dispose", m);
    const v = o.indexOf(y.__bindingPointIndex);
    o.splice(v, 1), i.deleteBuffer(s[y.id]), delete s[y.id], delete r[y.id];
  }
  function p() {
    for (const x in s)
      i.deleteBuffer(s[x]);
    o = [], s = {}, r = {};
  }
  return {
    bind: c,
    update: l,
    dispose: p
  };
}
class C_ {
  constructor(e = {}) {
    const {
      canvas: t = md(),
      context: n = null,
      depth: s = !0,
      stencil: r = !1,
      alpha: o = !1,
      antialias: a = !1,
      premultipliedAlpha: c = !0,
      preserveDrawingBuffer: l = !1,
      powerPreference: h = "default",
      failIfMajorPerformanceCaveat: u = !1,
      reverseDepthBuffer: d = !1
    } = e;
    this.isWebGLRenderer = !0;
    let f;
    if (n !== null) {
      if (typeof WebGLRenderingContext < "u" && n instanceof WebGLRenderingContext)
        throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");
      f = n.getContextAttributes().alpha;
    } else
      f = o;
    const g = new Uint32Array(4), _ = new Int32Array(4);
    let m = null, p = null;
    const x = [], y = [];
    this.domElement = t, this.debug = {
      /**
       * Enables error checking and reporting when shader programs are being compiled
       * @type {boolean}
       */
      checkShaderErrors: !0,
      /**
       * Callback for custom error reporting.
       * @type {?Function}
       */
      onShaderError: null
    }, this.autoClear = !0, this.autoClearColor = !0, this.autoClearDepth = !0, this.autoClearStencil = !0, this.sortObjects = !0, this.clippingPlanes = [], this.localClippingEnabled = !1, this._outputColorSpace = Nt, this.toneMapping = xi, this.toneMappingExposure = 1;
    const v = this;
    let P = !1, A = 0, C = 0, I = null, w = -1, S = null;
    const D = new dt(), W = new dt();
    let H = null;
    const Y = new Ie(0);
    let J = 0, K = t.width, re = t.height, q = 1, pe = null, le = null;
    const me = new dt(0, 0, K, re), Oe = new dt(0, 0, K, re);
    let Ye = !1;
    const j = new rc();
    let ie = !1, Ae = !1;
    this.transmissionResolutionScale = 1;
    const ae = new Ge(), Le = new Ge(), Fe = new M(), ze = new dt(), ct = { background: null, fog: null, environment: null, overrideMaterial: null, isScene: !0 };
    let Qe = !1;
    function Mt() {
      return I === null ? q : 1;
    }
    let N = n;
    function Wt(E, F) {
      return t.getContext(E, F);
    }
    try {
      const E = {
        alpha: !0,
        depth: s,
        stencil: r,
        antialias: a,
        premultipliedAlpha: c,
        preserveDrawingBuffer: l,
        powerPreference: h,
        failIfMajorPerformanceCaveat: u
      };
      if ("setAttribute" in t && t.setAttribute("data-engine", "three.js r172"), t.addEventListener("webglcontextlost", Z, !1), t.addEventListener("webglcontextrestored", fe, !1), t.addEventListener("webglcontextcreationerror", _e, !1), N === null) {
        const F = "webgl2";
        if (N = Wt(F, E), N === null)
          throw Wt(F) ? new Error("Error creating WebGL context with your selected attributes.") : new Error("Error creating WebGL context.");
      }
    } catch (E) {
      throw console.error("THREE.WebGLRenderer: " + E.message), E;
    }
    let je, $e, Te, _t, Re, T, b, k, $, ee, L, B, ce, be, Je, ne, ve, Pe, De, Se, Xe, He, ht, U;
    function de() {
      je = new B0(N), je.init(), He = new y_(N, je), $e = new L0(N, je, e, He), Te = new v_(N, je), $e.reverseDepthBuffer && d && Te.buffers.depth.setReversed(!0), _t = new H0(N), Re = new r_(), T = new x_(N, je, Te, Re, $e, He, _t), b = new N0(v), k = new O0(v), $ = new Kf(N), ht = new P0(N, $), ee = new k0(N, $, _t, ht), L = new G0(N, ee, $, _t), De = new V0(N, $e, T), ne = new D0(Re), B = new s_(v, b, k, je, $e, ht, ne), ce = new A_(v, Re), be = new a_(), Je = new f_(je), Pe = new C0(v, b, k, Te, L, f, c), ve = new g_(v, L, $e), U = new R_(N, _t, $e, Te), Se = new I0(N, je, _t), Xe = new z0(N, je, _t), _t.programs = B.programs, v.capabilities = $e, v.extensions = je, v.properties = Re, v.renderLists = be, v.shadowMap = ve, v.state = Te, v.info = _t;
    }
    de();
    const X = new M_(v, N);
    this.xr = X, this.getContext = function() {
      return N;
    }, this.getContextAttributes = function() {
      return N.getContextAttributes();
    }, this.forceContextLoss = function() {
      const E = je.get("WEBGL_lose_context");
      E && E.loseContext();
    }, this.forceContextRestore = function() {
      const E = je.get("WEBGL_lose_context");
      E && E.restoreContext();
    }, this.getPixelRatio = function() {
      return q;
    }, this.setPixelRatio = function(E) {
      E !== void 0 && (q = E, this.setSize(K, re, !1));
    }, this.getSize = function(E) {
      return E.set(K, re);
    }, this.setSize = function(E, F, z = !0) {
      if (X.isPresenting) {
        console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");
        return;
      }
      K = E, re = F, t.width = Math.floor(E * q), t.height = Math.floor(F * q), z === !0 && (t.style.width = E + "px", t.style.height = F + "px"), this.setViewport(0, 0, E, F);
    }, this.getDrawingBufferSize = function(E) {
      return E.set(K * q, re * q).floor();
    }, this.setDrawingBufferSize = function(E, F, z) {
      K = E, re = F, q = z, t.width = Math.floor(E * z), t.height = Math.floor(F * z), this.setViewport(0, 0, E, F);
    }, this.getCurrentViewport = function(E) {
      return E.copy(D);
    }, this.getViewport = function(E) {
      return E.copy(me);
    }, this.setViewport = function(E, F, z, V) {
      E.isVector4 ? me.set(E.x, E.y, E.z, E.w) : me.set(E, F, z, V), Te.viewport(D.copy(me).multiplyScalar(q).round());
    }, this.getScissor = function(E) {
      return E.copy(Oe);
    }, this.setScissor = function(E, F, z, V) {
      E.isVector4 ? Oe.set(E.x, E.y, E.z, E.w) : Oe.set(E, F, z, V), Te.scissor(W.copy(Oe).multiplyScalar(q).round());
    }, this.getScissorTest = function() {
      return Ye;
    }, this.setScissorTest = function(E) {
      Te.setScissorTest(Ye = E);
    }, this.setOpaqueSort = function(E) {
      pe = E;
    }, this.setTransparentSort = function(E) {
      le = E;
    }, this.getClearColor = function(E) {
      return E.copy(Pe.getClearColor());
    }, this.setClearColor = function() {
      Pe.setClearColor.apply(Pe, arguments);
    }, this.getClearAlpha = function() {
      return Pe.getClearAlpha();
    }, this.setClearAlpha = function() {
      Pe.setClearAlpha.apply(Pe, arguments);
    }, this.clear = function(E = !0, F = !0, z = !0) {
      let V = 0;
      if (E) {
        let O = !1;
        if (I !== null) {
          const te = I.texture.format;
          O = te === ec || te === Qa || te === Ja;
        }
        if (O) {
          const te = I.texture.type, ge = te === ni || te === Ni || te === ir || te === vs || te === ja || te === Za, we = Pe.getClearColor(), Ee = Pe.getClearAlpha(), Ne = we.r, ke = we.g, Ce = we.b;
          ge ? (g[0] = Ne, g[1] = ke, g[2] = Ce, g[3] = Ee, N.clearBufferuiv(N.COLOR, 0, g)) : (_[0] = Ne, _[1] = ke, _[2] = Ce, _[3] = Ee, N.clearBufferiv(N.COLOR, 0, _));
        } else
          V |= N.COLOR_BUFFER_BIT;
      }
      F && (V |= N.DEPTH_BUFFER_BIT), z && (V |= N.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), N.clear(V);
    }, this.clearColor = function() {
      this.clear(!0, !1, !1);
    }, this.clearDepth = function() {
      this.clear(!1, !0, !1);
    }, this.clearStencil = function() {
      this.clear(!1, !1, !0);
    }, this.dispose = function() {
      t.removeEventListener("webglcontextlost", Z, !1), t.removeEventListener("webglcontextrestored", fe, !1), t.removeEventListener("webglcontextcreationerror", _e, !1), Pe.dispose(), be.dispose(), Je.dispose(), Re.dispose(), b.dispose(), k.dispose(), L.dispose(), ht.dispose(), U.dispose(), B.dispose(), X.dispose(), X.removeEventListener("sessionstart", Oi), X.removeEventListener("sessionend", Hn), yn.stop();
    };
    function Z(E) {
      E.preventDefault(), console.log("THREE.WebGLRenderer: Context Lost."), P = !0;
    }
    function fe() {
      console.log("THREE.WebGLRenderer: Context Restored."), P = !1;
      const E = _t.autoReset, F = ve.enabled, z = ve.autoUpdate, V = ve.needsUpdate, O = ve.type;
      de(), _t.autoReset = E, ve.enabled = F, ve.autoUpdate = z, ve.needsUpdate = V, ve.type = O;
    }
    function _e(E) {
      console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ", E.statusMessage);
    }
    function Be(E) {
      const F = E.target;
      F.removeEventListener("dispose", Be), St(F);
    }
    function St(E) {
      Ct(E), Re.remove(E);
    }
    function Ct(E) {
      const F = Re.get(E).programs;
      F !== void 0 && (F.forEach(function(z) {
        B.releaseProgram(z);
      }), E.isShaderMaterial && B.releaseShaderCache(E));
    }
    this.renderBufferDirect = function(E, F, z, V, O, te) {
      F === null && (F = ct);
      const ge = O.isMesh && O.matrixWorld.determinant() < 0, we = Nn(E, F, z, V, O);
      Te.setMaterial(V, ge);
      let Ee = z.index, Ne = 1;
      if (V.wireframe === !0) {
        if (Ee = ee.getWireframeAttribute(z), Ee === void 0) return;
        Ne = 2;
      }
      const ke = z.drawRange, Ce = z.attributes.position;
      let et = ke.start * Ne, ot = (ke.start + ke.count) * Ne;
      te !== null && (et = Math.max(et, te.start * Ne), ot = Math.min(ot, (te.start + te.count) * Ne)), Ee !== null ? (et = Math.max(et, 0), ot = Math.min(ot, Ee.count)) : Ce != null && (et = Math.max(et, 0), ot = Math.min(ot, Ce.count));
      const G = ot - et;
      if (G < 0 || G === 1 / 0) return;
      ht.setup(O, V, we, z, Ee);
      let Q, Me = Se;
      if (Ee !== null && (Q = $.get(Ee), Me = Xe, Me.setIndex(Q)), O.isMesh)
        V.wireframe === !0 ? (Te.setLineWidth(V.wireframeLinewidth * Mt()), Me.setMode(N.LINES)) : Me.setMode(N.TRIANGLES);
      else if (O.isLine) {
        let he = V.linewidth;
        he === void 0 && (he = 1), Te.setLineWidth(he * Mt()), O.isLineSegments ? Me.setMode(N.LINES) : O.isLineLoop ? Me.setMode(N.LINE_LOOP) : Me.setMode(N.LINE_STRIP);
      } else O.isPoints ? Me.setMode(N.POINTS) : O.isSprite && Me.setMode(N.TRIANGLES);
      if (O.isBatchedMesh)
        if (O._multiDrawInstances !== null)
          Me.renderMultiDrawInstances(O._multiDrawStarts, O._multiDrawCounts, O._multiDrawCount, O._multiDrawInstances);
        else if (je.get("WEBGL_multi_draw"))
          Me.renderMultiDraw(O._multiDrawStarts, O._multiDrawCounts, O._multiDrawCount);
        else {
          const he = O._multiDrawStarts, Ve = O._multiDrawCounts, Ue = O._multiDrawCount, nt = Ee ? $.get(Ee).bytesPerElement : 1, ut = Re.get(V).currentProgram.getUniforms();
          for (let We = 0; We < Ue; We++)
            ut.setValue(N, "_gl_DrawID", We), Me.render(he[We] / nt, Ve[We]);
        }
      else if (O.isInstancedMesh)
        Me.renderInstances(et, G, O.count);
      else if (z.isInstancedBufferGeometry) {
        const he = z._maxInstanceCount !== void 0 ? z._maxInstanceCount : 1 / 0, Ve = Math.min(z.instanceCount, he);
        Me.renderInstances(et, G, Ve);
      } else
        Me.render(et, G);
    };
    function lt(E, F, z) {
      E.transparent === !0 && E.side === Zt && E.forceSinglePass === !1 ? (E.side = tn, E.needsUpdate = !0, Sn(E, F, z), E.side = ti, E.needsUpdate = !0, Sn(E, F, z), E.side = Zt) : Sn(E, F, z);
    }
    this.compile = function(E, F, z = null) {
      z === null && (z = E), p = Je.get(z), p.init(F), y.push(p), z.traverseVisible(function(O) {
        O.isLight && O.layers.test(F.layers) && (p.pushLight(O), O.castShadow && p.pushShadow(O));
      }), E !== z && E.traverseVisible(function(O) {
        O.isLight && O.layers.test(F.layers) && (p.pushLight(O), O.castShadow && p.pushShadow(O));
      }), p.setupLights();
      const V = /* @__PURE__ */ new Set();
      return E.traverse(function(O) {
        if (!(O.isMesh || O.isPoints || O.isLine || O.isSprite))
          return;
        const te = O.material;
        if (te)
          if (Array.isArray(te))
            for (let ge = 0; ge < te.length; ge++) {
              const we = te[ge];
              lt(we, z, O), V.add(we);
            }
          else
            lt(te, z, O), V.add(te);
      }), y.pop(), p = null, V;
    }, this.compileAsync = function(E, F, z = null) {
      const V = this.compile(E, F, z);
      return new Promise((O) => {
        function te() {
          if (V.forEach(function(ge) {
            Re.get(ge).currentProgram.isReady() && V.delete(ge);
          }), V.size === 0) {
            O(E);
            return;
          }
          setTimeout(te, 10);
        }
        je.get("KHR_parallel_shader_compile") !== null ? te() : setTimeout(te, 10);
      });
    };
    let on = null;
    function gn(E) {
      on && on(E);
    }
    function Oi() {
      yn.stop();
    }
    function Hn() {
      yn.start();
    }
    const yn = new Yh();
    yn.setAnimationLoop(gn), typeof self < "u" && yn.setContext(self), this.setAnimationLoop = function(E) {
      on = E, X.setAnimationLoop(E), E === null ? yn.stop() : yn.start();
    }, X.addEventListener("sessionstart", Oi), X.addEventListener("sessionend", Hn), this.render = function(E, F) {
      if (F !== void 0 && F.isCamera !== !0) {
        console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");
        return;
      }
      if (P === !0) return;
      if (E.matrixWorldAutoUpdate === !0 && E.updateMatrixWorld(), F.parent === null && F.matrixWorldAutoUpdate === !0 && F.updateMatrixWorld(), X.enabled === !0 && X.isPresenting === !0 && (X.cameraAutoUpdate === !0 && X.updateCamera(F), F = X.getCamera()), E.isScene === !0 && E.onBeforeRender(v, E, F, I), p = Je.get(E, y.length), p.init(F), y.push(p), Le.multiplyMatrices(F.projectionMatrix, F.matrixWorldInverse), j.setFromProjectionMatrix(Le), Ae = this.localClippingEnabled, ie = ne.init(this.clippingPlanes, Ae), m = be.get(E, x.length), m.init(), x.push(m), X.enabled === !0 && X.isPresenting === !0) {
        const te = v.xr.getDepthSensingMesh();
        te !== null && Vn(te, F, -1 / 0, v.sortObjects);
      }
      Vn(E, F, 0, v.sortObjects), m.finish(), v.sortObjects === !0 && m.sort(pe, le), Qe = X.enabled === !1 || X.isPresenting === !1 || X.hasDepthSensing() === !1, Qe && Pe.addToRenderList(m, E), this.info.render.frame++, ie === !0 && ne.beginShadows();
      const z = p.state.shadowsArray;
      ve.render(z, E, F), ie === !0 && ne.endShadows(), this.info.autoReset === !0 && this.info.reset();
      const V = m.opaque, O = m.transmissive;
      if (p.setupLights(), F.isArrayCamera) {
        const te = F.cameras;
        if (O.length > 0)
          for (let ge = 0, we = te.length; ge < we; ge++) {
            const Ee = te[ge];
            Us(V, O, E, Ee);
          }
        Qe && Pe.render(E);
        for (let ge = 0, we = te.length; ge < we; ge++) {
          const Ee = te[ge];
          Ns(m, E, Ee, Ee.viewport);
        }
      } else
        O.length > 0 && Us(V, O, E, F), Qe && Pe.render(E), Ns(m, E, F);
      I !== null && C === 0 && (T.updateMultisampleRenderTarget(I), T.updateRenderTargetMipmap(I)), E.isScene === !0 && E.onAfterRender(v, E, F), ht.resetDefaultState(), w = -1, S = null, y.pop(), y.length > 0 ? (p = y[y.length - 1], ie === !0 && ne.setGlobalState(v.clippingPlanes, p.state.camera)) : p = null, x.pop(), x.length > 0 ? m = x[x.length - 1] : m = null;
    };
    function Vn(E, F, z, V) {
      if (E.visible === !1) return;
      if (E.layers.test(F.layers)) {
        if (E.isGroup)
          z = E.renderOrder;
        else if (E.isLOD)
          E.autoUpdate === !0 && E.update(F);
        else if (E.isLight)
          p.pushLight(E), E.castShadow && p.pushShadow(E);
        else if (E.isSprite) {
          if (!E.frustumCulled || j.intersectsSprite(E)) {
            V && ze.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Le);
            const ge = L.update(E), we = E.material;
            we.visible && m.push(E, ge, we, z, ze.z, null);
          }
        } else if ((E.isMesh || E.isLine || E.isPoints) && (!E.frustumCulled || j.intersectsObject(E))) {
          const ge = L.update(E), we = E.material;
          if (V && (E.boundingSphere !== void 0 ? (E.boundingSphere === null && E.computeBoundingSphere(), ze.copy(E.boundingSphere.center)) : (ge.boundingSphere === null && ge.computeBoundingSphere(), ze.copy(ge.boundingSphere.center)), ze.applyMatrix4(E.matrixWorld).applyMatrix4(Le)), Array.isArray(we)) {
            const Ee = ge.groups;
            for (let Ne = 0, ke = Ee.length; Ne < ke; Ne++) {
              const Ce = Ee[Ne], et = we[Ce.materialIndex];
              et && et.visible && m.push(E, ge, et, z, ze.z, Ce);
            }
          } else we.visible && m.push(E, ge, we, z, ze.z, null);
        }
      }
      const te = E.children;
      for (let ge = 0, we = te.length; ge < we; ge++)
        Vn(te[ge], F, z, V);
    }
    function Ns(E, F, z, V) {
      const O = E.opaque, te = E.transmissive, ge = E.transparent;
      p.setupLightsView(z), ie === !0 && ne.setGlobalState(v.clippingPlanes, z), V && Te.viewport(D.copy(V)), O.length > 0 && Si(O, F, z), te.length > 0 && Si(te, F, z), ge.length > 0 && Si(ge, F, z), Te.buffers.depth.setTest(!0), Te.buffers.depth.setMask(!0), Te.buffers.color.setMask(!0), Te.setPolygonOffset(!1);
    }
    function Us(E, F, z, V) {
      if ((z.isScene === !0 ? z.overrideMaterial : null) !== null)
        return;
      p.state.transmissionRenderTarget[V.id] === void 0 && (p.state.transmissionRenderTarget[V.id] = new Ui(1, 1, {
        generateMipmaps: !0,
        type: je.has("EXT_color_buffer_half_float") || je.has("EXT_color_buffer_float") ? ar : ni,
        minFilter: Jn,
        samples: 4,
        stencilBuffer: r,
        resolveDepthBuffer: !1,
        resolveStencilBuffer: !1,
        colorSpace: rt.workingColorSpace
      }));
      const te = p.state.transmissionRenderTarget[V.id], ge = V.viewport || D;
      te.setSize(ge.z * v.transmissionResolutionScale, ge.w * v.transmissionResolutionScale);
      const we = v.getRenderTarget();
      v.setRenderTarget(te), v.getClearColor(Y), J = v.getClearAlpha(), J < 1 && v.setClearColor(16777215, 0.5), v.clear(), Qe && Pe.render(z);
      const Ee = v.toneMapping;
      v.toneMapping = xi;
      const Ne = V.viewport;
      if (V.viewport !== void 0 && (V.viewport = void 0), p.setupLightsView(V), ie === !0 && ne.setGlobalState(v.clippingPlanes, V), Si(E, z, V), T.updateMultisampleRenderTarget(te), T.updateRenderTargetMipmap(te), je.has("WEBGL_multisampled_render_to_texture") === !1) {
        let ke = !1;
        for (let Ce = 0, et = F.length; Ce < et; Ce++) {
          const ot = F[Ce], G = ot.object, Q = ot.geometry, Me = ot.material, he = ot.group;
          if (Me.side === Zt && G.layers.test(V.layers)) {
            const Ve = Me.side;
            Me.side = tn, Me.needsUpdate = !0, Fs(G, z, V, Q, Me, he), Me.side = Ve, Me.needsUpdate = !0, ke = !0;
          }
        }
        ke === !0 && (T.updateMultisampleRenderTarget(te), T.updateRenderTargetMipmap(te));
      }
      v.setRenderTarget(we), v.setClearColor(Y, J), Ne !== void 0 && (V.viewport = Ne), v.toneMapping = Ee;
    }
    function Si(E, F, z) {
      const V = F.isScene === !0 ? F.overrideMaterial : null;
      for (let O = 0, te = E.length; O < te; O++) {
        const ge = E[O], we = ge.object, Ee = ge.geometry, Ne = V === null ? ge.material : V, ke = ge.group;
        we.layers.test(z.layers) && Fs(we, F, z, Ee, Ne, ke);
      }
    }
    function Fs(E, F, z, V, O, te) {
      E.onBeforeRender(v, F, z, V, O, te), E.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse, E.matrixWorld), E.normalMatrix.getNormalMatrix(E.modelViewMatrix), O.onBeforeRender(v, F, z, V, E, te), O.transparent === !0 && O.side === Zt && O.forceSinglePass === !1 ? (O.side = tn, O.needsUpdate = !0, v.renderBufferDirect(z, F, V, O, E, te), O.side = ti, O.needsUpdate = !0, v.renderBufferDirect(z, F, V, O, E, te), O.side = Zt) : v.renderBufferDirect(z, F, V, O, E, te), E.onAfterRender(v, F, z, V, O, te);
    }
    function Sn(E, F, z) {
      F.isScene !== !0 && (F = ct);
      const V = Re.get(E), O = p.state.lights, te = p.state.shadowsArray, ge = O.state.version, we = B.getParameters(E, O.state, te, F, z), Ee = B.getProgramCacheKey(we);
      let Ne = V.programs;
      V.environment = E.isMeshStandardMaterial ? F.environment : null, V.fog = F.fog, V.envMap = (E.isMeshStandardMaterial ? k : b).get(E.envMap || V.environment), V.envMapRotation = V.environment !== null && E.envMap === null ? F.environmentRotation : E.envMapRotation, Ne === void 0 && (E.addEventListener("dispose", Be), Ne = /* @__PURE__ */ new Map(), V.programs = Ne);
      let ke = Ne.get(Ee);
      if (ke !== void 0) {
        if (V.currentProgram === ke && V.lightsStateVersion === ge)
          return un(E, we), ke;
      } else
        we.uniforms = B.getUniforms(E), E.onBeforeCompile(we, v), ke = B.acquireProgram(we, Ee), Ne.set(Ee, ke), V.uniforms = we.uniforms;
      const Ce = V.uniforms;
      return (!E.isShaderMaterial && !E.isRawShaderMaterial || E.clipping === !0) && (Ce.clippingPlanes = ne.uniform), un(E, we), V.needsLights = Os(E), V.lightsStateVersion = ge, V.needsLights && (Ce.ambientLightColor.value = O.state.ambient, Ce.lightProbe.value = O.state.probe, Ce.directionalLights.value = O.state.directional, Ce.directionalLightShadows.value = O.state.directionalShadow, Ce.spotLights.value = O.state.spot, Ce.spotLightShadows.value = O.state.spotShadow, Ce.rectAreaLights.value = O.state.rectArea, Ce.ltc_1.value = O.state.rectAreaLTC1, Ce.ltc_2.value = O.state.rectAreaLTC2, Ce.pointLights.value = O.state.point, Ce.pointLightShadows.value = O.state.pointShadow, Ce.hemisphereLights.value = O.state.hemi, Ce.directionalShadowMap.value = O.state.directionalShadowMap, Ce.directionalShadowMatrix.value = O.state.directionalShadowMatrix, Ce.spotShadowMap.value = O.state.spotShadowMap, Ce.spotLightMatrix.value = O.state.spotLightMatrix, Ce.spotLightMap.value = O.state.spotLightMap, Ce.pointShadowMap.value = O.state.pointShadowMap, Ce.pointShadowMatrix.value = O.state.pointShadowMatrix), V.currentProgram = ke, V.uniformsList = null, ke;
    }
    function Dn(E) {
      if (E.uniformsList === null) {
        const F = E.currentProgram.getUniforms();
        E.uniformsList = jr.seqWithValue(F.seq, E.uniforms);
      }
      return E.uniformsList;
    }
    function un(E, F) {
      const z = Re.get(E);
      z.outputColorSpace = F.outputColorSpace, z.batching = F.batching, z.batchingColor = F.batchingColor, z.instancing = F.instancing, z.instancingColor = F.instancingColor, z.instancingMorph = F.instancingMorph, z.skinning = F.skinning, z.morphTargets = F.morphTargets, z.morphNormals = F.morphNormals, z.morphColors = F.morphColors, z.morphTargetsCount = F.morphTargetsCount, z.numClippingPlanes = F.numClippingPlanes, z.numIntersection = F.numClipIntersection, z.vertexAlphas = F.vertexAlphas, z.vertexTangents = F.vertexTangents, z.toneMapping = F.toneMapping;
    }
    function Nn(E, F, z, V, O) {
      F.isScene !== !0 && (F = ct), T.resetTextureUnits();
      const te = F.fog, ge = V.isMeshStandardMaterial ? F.environment : null, we = I === null ? v.outputColorSpace : I.isXRRenderTarget === !0 ? I.texture.colorSpace : sn, Ee = (V.isMeshStandardMaterial ? k : b).get(V.envMap || ge), Ne = V.vertexColors === !0 && !!z.attributes.color && z.attributes.color.itemSize === 4, ke = !!z.attributes.tangent && (!!V.normalMap || V.anisotropy > 0), Ce = !!z.morphAttributes.position, et = !!z.morphAttributes.normal, ot = !!z.morphAttributes.color;
      let G = xi;
      V.toneMapped && (I === null || I.isXRRenderTarget === !0) && (G = v.toneMapping);
      const Q = z.morphAttributes.position || z.morphAttributes.normal || z.morphAttributes.color, Me = Q !== void 0 ? Q.length : 0, he = Re.get(V), Ve = p.state.lights;
      if (ie === !0 && (Ae === !0 || E !== S)) {
        const Lt = E === S && V.id === w;
        ne.setState(V, E, Lt);
      }
      let Ue = !1;
      V.version === he.__version ? (he.needsLights && he.lightsStateVersion !== Ve.state.version || he.outputColorSpace !== we || O.isBatchedMesh && he.batching === !1 || !O.isBatchedMesh && he.batching === !0 || O.isBatchedMesh && he.batchingColor === !0 && O.colorTexture === null || O.isBatchedMesh && he.batchingColor === !1 && O.colorTexture !== null || O.isInstancedMesh && he.instancing === !1 || !O.isInstancedMesh && he.instancing === !0 || O.isSkinnedMesh && he.skinning === !1 || !O.isSkinnedMesh && he.skinning === !0 || O.isInstancedMesh && he.instancingColor === !0 && O.instanceColor === null || O.isInstancedMesh && he.instancingColor === !1 && O.instanceColor !== null || O.isInstancedMesh && he.instancingMorph === !0 && O.morphTexture === null || O.isInstancedMesh && he.instancingMorph === !1 && O.morphTexture !== null || he.envMap !== Ee || V.fog === !0 && he.fog !== te || he.numClippingPlanes !== void 0 && (he.numClippingPlanes !== ne.numPlanes || he.numIntersection !== ne.numIntersection) || he.vertexAlphas !== Ne || he.vertexTangents !== ke || he.morphTargets !== Ce || he.morphNormals !== et || he.morphColors !== ot || he.toneMapping !== G || he.morphTargetsCount !== Me) && (Ue = !0) : (Ue = !0, he.__version = V.version);
      let nt = he.currentProgram;
      Ue === !0 && (nt = Sn(V, F, O));
      let ut = !1, We = !1, Et = !1;
      const st = nt.getUniforms(), bt = he.uniforms;
      if (Te.useProgram(nt.program) && (ut = !0, We = !0, Et = !0), V.id !== w && (w = V.id, We = !0), ut || S !== E) {
        Te.buffers.depth.getReversed() ? (ae.copy(E.projectionMatrix), _d(ae), vd(ae), st.setValue(N, "projectionMatrix", ae)) : st.setValue(N, "projectionMatrix", E.projectionMatrix), st.setValue(N, "viewMatrix", E.matrixWorldInverse);
        const zt = st.map.cameraPosition;
        zt !== void 0 && zt.setValue(N, Fe.setFromMatrixPosition(E.matrixWorld)), $e.logarithmicDepthBuffer && st.setValue(
          N,
          "logDepthBufFC",
          2 / (Math.log(E.far + 1) / Math.LN2)
        ), (V.isMeshPhongMaterial || V.isMeshToonMaterial || V.isMeshLambertMaterial || V.isMeshBasicMaterial || V.isMeshStandardMaterial || V.isShaderMaterial) && st.setValue(N, "isOrthographic", E.isOrthographicCamera === !0), S !== E && (S = E, We = !0, Et = !0);
      }
      if (O.isSkinnedMesh) {
        st.setOptional(N, O, "bindMatrix"), st.setOptional(N, O, "bindMatrixInverse");
        const Lt = O.skeleton;
        Lt && (Lt.boneTexture === null && Lt.computeBoneTexture(), st.setValue(N, "boneTexture", Lt.boneTexture, T));
      }
      O.isBatchedMesh && (st.setOptional(N, O, "batchingTexture"), st.setValue(N, "batchingTexture", O._matricesTexture, T), st.setOptional(N, O, "batchingIdTexture"), st.setValue(N, "batchingIdTexture", O._indirectTexture, T), st.setOptional(N, O, "batchingColorTexture"), O._colorsTexture !== null && st.setValue(N, "batchingColorTexture", O._colorsTexture, T));
      const yt = z.morphAttributes;
      if ((yt.position !== void 0 || yt.normal !== void 0 || yt.color !== void 0) && De.update(O, z, nt), (We || he.receiveShadow !== O.receiveShadow) && (he.receiveShadow = O.receiveShadow, st.setValue(N, "receiveShadow", O.receiveShadow)), V.isMeshGouraudMaterial && V.envMap !== null && (bt.envMap.value = Ee, bt.flipEnvMap.value = Ee.isCubeTexture && Ee.isRenderTargetTexture === !1 ? -1 : 1), V.isMeshStandardMaterial && V.envMap === null && F.environment !== null && (bt.envMapIntensity.value = F.environmentIntensity), We && (st.setValue(N, "toneMappingExposure", v.toneMappingExposure), he.needsLights && bi(bt, Et), te && V.fog === !0 && ce.refreshFogUniforms(bt, te), ce.refreshMaterialUniforms(bt, V, q, re, p.state.transmissionRenderTarget[E.id]), jr.upload(N, Dn(he), bt, T)), V.isShaderMaterial && V.uniformsNeedUpdate === !0 && (jr.upload(N, Dn(he), bt, T), V.uniformsNeedUpdate = !1), V.isSpriteMaterial && st.setValue(N, "center", O.center), st.setValue(N, "modelViewMatrix", O.modelViewMatrix), st.setValue(N, "normalMatrix", O.normalMatrix), st.setValue(N, "modelMatrix", O.matrixWorld), V.isShaderMaterial || V.isRawShaderMaterial) {
        const Lt = V.uniformsGroups;
        for (let zt = 0, an = Lt.length; zt < an; zt++) {
          const si = Lt[zt];
          U.update(si, nt), U.bind(si, nt);
        }
      }
      return nt;
    }
    function bi(E, F) {
      E.ambientLightColor.needsUpdate = F, E.lightProbe.needsUpdate = F, E.directionalLights.needsUpdate = F, E.directionalLightShadows.needsUpdate = F, E.pointLights.needsUpdate = F, E.pointLightShadows.needsUpdate = F, E.spotLights.needsUpdate = F, E.spotLightShadows.needsUpdate = F, E.rectAreaLights.needsUpdate = F, E.hemisphereLights.needsUpdate = F;
    }
    function Os(E) {
      return E.isMeshLambertMaterial || E.isMeshToonMaterial || E.isMeshPhongMaterial || E.isMeshStandardMaterial || E.isShadowMaterial || E.isShaderMaterial && E.lights === !0;
    }
    this.getActiveCubeFace = function() {
      return A;
    }, this.getActiveMipmapLevel = function() {
      return C;
    }, this.getRenderTarget = function() {
      return I;
    }, this.setRenderTargetTextures = function(E, F, z) {
      Re.get(E.texture).__webglTexture = F, Re.get(E.depthTexture).__webglTexture = z;
      const V = Re.get(E);
      V.__hasExternalTextures = !0, V.__autoAllocateDepthBuffer = z === void 0, V.__autoAllocateDepthBuffer || je.has("WEBGL_multisampled_render_to_texture") === !0 && (console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"), V.__useRenderToTexture = !1);
    }, this.setRenderTargetFramebuffer = function(E, F) {
      const z = Re.get(E);
      z.__webglFramebuffer = F, z.__useDefaultFramebuffer = F === void 0;
    };
    const Bs = N.createFramebuffer();
    this.setRenderTarget = function(E, F = 0, z = 0) {
      I = E, A = F, C = z;
      let V = !0, O = null, te = !1, ge = !1;
      if (E) {
        const Ee = Re.get(E);
        if (Ee.__useDefaultFramebuffer !== void 0)
          Te.bindFramebuffer(N.FRAMEBUFFER, null), V = !1;
        else if (Ee.__webglFramebuffer === void 0)
          T.setupRenderTarget(E);
        else if (Ee.__hasExternalTextures)
          T.rebindTextures(E, Re.get(E.texture).__webglTexture, Re.get(E.depthTexture).__webglTexture);
        else if (E.depthBuffer) {
          const Ce = E.depthTexture;
          if (Ee.__boundDepthTexture !== Ce) {
            if (Ce !== null && Re.has(Ce) && (E.width !== Ce.image.width || E.height !== Ce.image.height))
              throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");
            T.setupDepthRenderbuffer(E);
          }
        }
        const Ne = E.texture;
        (Ne.isData3DTexture || Ne.isDataArrayTexture || Ne.isCompressedArrayTexture) && (ge = !0);
        const ke = Re.get(E).__webglFramebuffer;
        E.isWebGLCubeRenderTarget ? (Array.isArray(ke[F]) ? O = ke[F][z] : O = ke[F], te = !0) : E.samples > 0 && T.useMultisampledRTT(E) === !1 ? O = Re.get(E).__webglMultisampledFramebuffer : Array.isArray(ke) ? O = ke[z] : O = ke, D.copy(E.viewport), W.copy(E.scissor), H = E.scissorTest;
      } else
        D.copy(me).multiplyScalar(q).floor(), W.copy(Oe).multiplyScalar(q).floor(), H = Ye;
      if (z !== 0 && (O = Bs), Te.bindFramebuffer(N.FRAMEBUFFER, O) && V && Te.drawBuffers(E, O), Te.viewport(D), Te.scissor(W), Te.setScissorTest(H), te) {
        const Ee = Re.get(E.texture);
        N.framebufferTexture2D(N.FRAMEBUFFER, N.COLOR_ATTACHMENT0, N.TEXTURE_CUBE_MAP_POSITIVE_X + F, Ee.__webglTexture, z);
      } else if (ge) {
        const Ee = Re.get(E.texture), Ne = F;
        N.framebufferTextureLayer(N.FRAMEBUFFER, N.COLOR_ATTACHMENT0, Ee.__webglTexture, z, Ne);
      } else if (E !== null && z !== 0) {
        const Ee = Re.get(E.texture);
        N.framebufferTexture2D(N.FRAMEBUFFER, N.COLOR_ATTACHMENT0, N.TEXTURE_2D, Ee.__webglTexture, z);
      }
      w = -1;
    }, this.readRenderTargetPixels = function(E, F, z, V, O, te, ge) {
      if (!(E && E.isWebGLRenderTarget)) {
        console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
        return;
      }
      let we = Re.get(E).__webglFramebuffer;
      if (E.isWebGLCubeRenderTarget && ge !== void 0 && (we = we[ge]), we) {
        Te.bindFramebuffer(N.FRAMEBUFFER, we);
        try {
          const Ee = E.texture, Ne = Ee.format, ke = Ee.type;
          if (!$e.textureFormatReadable(Ne)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
            return;
          }
          if (!$e.textureTypeReadable(ke)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
            return;
          }
          F >= 0 && F <= E.width - V && z >= 0 && z <= E.height - O && N.readPixels(F, z, V, O, He.convert(Ne), He.convert(ke), te);
        } finally {
          const Ee = I !== null ? Re.get(I).__webglFramebuffer : null;
          Te.bindFramebuffer(N.FRAMEBUFFER, Ee);
        }
      }
    }, this.readRenderTargetPixelsAsync = async function(E, F, z, V, O, te, ge) {
      if (!(E && E.isWebGLRenderTarget))
        throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
      let we = Re.get(E).__webglFramebuffer;
      if (E.isWebGLCubeRenderTarget && ge !== void 0 && (we = we[ge]), we) {
        const Ee = E.texture, Ne = Ee.format, ke = Ee.type;
        if (!$e.textureFormatReadable(Ne))
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
        if (!$e.textureTypeReadable(ke))
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
        if (F >= 0 && F <= E.width - V && z >= 0 && z <= E.height - O) {
          Te.bindFramebuffer(N.FRAMEBUFFER, we);
          const Ce = N.createBuffer();
          N.bindBuffer(N.PIXEL_PACK_BUFFER, Ce), N.bufferData(N.PIXEL_PACK_BUFFER, te.byteLength, N.STREAM_READ), N.readPixels(F, z, V, O, He.convert(Ne), He.convert(ke), 0);
          const et = I !== null ? Re.get(I).__webglFramebuffer : null;
          Te.bindFramebuffer(N.FRAMEBUFFER, et);
          const ot = N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE, 0);
          return N.flush(), await gd(N, ot, 4), N.bindBuffer(N.PIXEL_PACK_BUFFER, Ce), N.getBufferSubData(N.PIXEL_PACK_BUFFER, 0, te), N.deleteBuffer(Ce), N.deleteSync(ot), te;
        } else
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
      }
    }, this.copyFramebufferToTexture = function(E, F = null, z = 0) {
      E.isTexture !== !0 && (is("WebGLRenderer: copyFramebufferToTexture function signature has changed."), F = arguments[0] || null, E = arguments[1]);
      const V = Math.pow(2, -z), O = Math.floor(E.image.width * V), te = Math.floor(E.image.height * V), ge = F !== null ? F.x : 0, we = F !== null ? F.y : 0;
      T.setTexture2D(E, 0), N.copyTexSubImage2D(N.TEXTURE_2D, z, 0, 0, ge, we, O, te), Te.unbindTexture();
    };
    const Bi = N.createFramebuffer(), hr = N.createFramebuffer();
    this.copyTextureToTexture = function(E, F, z = null, V = null, O = 0, te = null) {
      E.isTexture !== !0 && (is("WebGLRenderer: copyTextureToTexture function signature has changed."), V = arguments[0] || null, E = arguments[1], F = arguments[2], te = arguments[3] || 0, z = null), te === null && (O !== 0 ? (is("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."), te = O, O = 0) : te = 0);
      let ge, we, Ee, Ne, ke, Ce, et, ot, G;
      const Q = E.isCompressedTexture ? E.mipmaps[te] : E.image;
      if (z !== null)
        ge = z.max.x - z.min.x, we = z.max.y - z.min.y, Ee = z.isBox3 ? z.max.z - z.min.z : 1, Ne = z.min.x, ke = z.min.y, Ce = z.isBox3 ? z.min.z : 0;
      else {
        const yt = Math.pow(2, -O);
        ge = Math.floor(Q.width * yt), we = Math.floor(Q.height * yt), E.isDataArrayTexture ? Ee = Q.depth : E.isData3DTexture ? Ee = Math.floor(Q.depth * yt) : Ee = 1, Ne = 0, ke = 0, Ce = 0;
      }
      V !== null ? (et = V.x, ot = V.y, G = V.z) : (et = 0, ot = 0, G = 0);
      const Me = He.convert(F.format), he = He.convert(F.type);
      let Ve;
      F.isData3DTexture ? (T.setTexture3D(F, 0), Ve = N.TEXTURE_3D) : F.isDataArrayTexture || F.isCompressedArrayTexture ? (T.setTexture2DArray(F, 0), Ve = N.TEXTURE_2D_ARRAY) : (T.setTexture2D(F, 0), Ve = N.TEXTURE_2D), N.pixelStorei(N.UNPACK_FLIP_Y_WEBGL, F.flipY), N.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL, F.premultiplyAlpha), N.pixelStorei(N.UNPACK_ALIGNMENT, F.unpackAlignment);
      const Ue = N.getParameter(N.UNPACK_ROW_LENGTH), nt = N.getParameter(N.UNPACK_IMAGE_HEIGHT), ut = N.getParameter(N.UNPACK_SKIP_PIXELS), We = N.getParameter(N.UNPACK_SKIP_ROWS), Et = N.getParameter(N.UNPACK_SKIP_IMAGES);
      N.pixelStorei(N.UNPACK_ROW_LENGTH, Q.width), N.pixelStorei(N.UNPACK_IMAGE_HEIGHT, Q.height), N.pixelStorei(N.UNPACK_SKIP_PIXELS, Ne), N.pixelStorei(N.UNPACK_SKIP_ROWS, ke), N.pixelStorei(N.UNPACK_SKIP_IMAGES, Ce);
      const st = E.isDataArrayTexture || E.isData3DTexture, bt = F.isDataArrayTexture || F.isData3DTexture;
      if (E.isDepthTexture) {
        const yt = Re.get(E), Lt = Re.get(F), zt = Re.get(yt.__renderTarget), an = Re.get(Lt.__renderTarget);
        Te.bindFramebuffer(N.READ_FRAMEBUFFER, zt.__webglFramebuffer), Te.bindFramebuffer(N.DRAW_FRAMEBUFFER, an.__webglFramebuffer);
        for (let si = 0; si < Ee; si++)
          st && (N.framebufferTextureLayer(N.READ_FRAMEBUFFER, N.COLOR_ATTACHMENT0, Re.get(E).__webglTexture, O, Ce + si), N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER, N.COLOR_ATTACHMENT0, Re.get(F).__webglTexture, te, G + si)), N.blitFramebuffer(Ne, ke, ge, we, et, ot, ge, we, N.DEPTH_BUFFER_BIT, N.NEAREST);
        Te.bindFramebuffer(N.READ_FRAMEBUFFER, null), Te.bindFramebuffer(N.DRAW_FRAMEBUFFER, null);
      } else if (O !== 0 || E.isRenderTargetTexture || Re.has(E)) {
        const yt = Re.get(E), Lt = Re.get(F);
        Te.bindFramebuffer(N.READ_FRAMEBUFFER, Bi), Te.bindFramebuffer(N.DRAW_FRAMEBUFFER, hr);
        for (let zt = 0; zt < Ee; zt++)
          st ? N.framebufferTextureLayer(N.READ_FRAMEBUFFER, N.COLOR_ATTACHMENT0, yt.__webglTexture, O, Ce + zt) : N.framebufferTexture2D(N.READ_FRAMEBUFFER, N.COLOR_ATTACHMENT0, N.TEXTURE_2D, yt.__webglTexture, O), bt ? N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER, N.COLOR_ATTACHMENT0, Lt.__webglTexture, te, G + zt) : N.framebufferTexture2D(N.DRAW_FRAMEBUFFER, N.COLOR_ATTACHMENT0, N.TEXTURE_2D, Lt.__webglTexture, te), O !== 0 ? N.blitFramebuffer(Ne, ke, ge, we, et, ot, ge, we, N.COLOR_BUFFER_BIT, N.NEAREST) : bt ? N.copyTexSubImage3D(Ve, te, et, ot, G + zt, Ne, ke, ge, we) : N.copyTexSubImage2D(Ve, te, et, ot, Ne, ke, ge, we);
        Te.bindFramebuffer(N.READ_FRAMEBUFFER, null), Te.bindFramebuffer(N.DRAW_FRAMEBUFFER, null);
      } else
        bt ? E.isDataTexture || E.isData3DTexture ? N.texSubImage3D(Ve, te, et, ot, G, ge, we, Ee, Me, he, Q.data) : F.isCompressedArrayTexture ? N.compressedTexSubImage3D(Ve, te, et, ot, G, ge, we, Ee, Me, Q.data) : N.texSubImage3D(Ve, te, et, ot, G, ge, we, Ee, Me, he, Q) : E.isDataTexture ? N.texSubImage2D(N.TEXTURE_2D, te, et, ot, ge, we, Me, he, Q.data) : E.isCompressedTexture ? N.compressedTexSubImage2D(N.TEXTURE_2D, te, et, ot, Q.width, Q.height, Me, Q.data) : N.texSubImage2D(N.TEXTURE_2D, te, et, ot, ge, we, Me, he, Q);
      N.pixelStorei(N.UNPACK_ROW_LENGTH, Ue), N.pixelStorei(N.UNPACK_IMAGE_HEIGHT, nt), N.pixelStorei(N.UNPACK_SKIP_PIXELS, ut), N.pixelStorei(N.UNPACK_SKIP_ROWS, We), N.pixelStorei(N.UNPACK_SKIP_IMAGES, Et), te === 0 && F.generateMipmaps && N.generateMipmap(Ve), Te.unbindTexture();
    }, this.copyTextureToTexture3D = function(E, F, z = null, V = null, O = 0) {
      return E.isTexture !== !0 && (is("WebGLRenderer: copyTextureToTexture3D function signature has changed."), z = arguments[0] || null, V = arguments[1] || null, E = arguments[2], F = arguments[3], O = arguments[4] || 0), is('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'), this.copyTextureToTexture(E, F, z, V, O);
    }, this.initRenderTarget = function(E) {
      Re.get(E).__webglFramebuffer === void 0 && T.setupRenderTarget(E);
    }, this.initTexture = function(E) {
      E.isCubeTexture ? T.setTextureCube(E, 0) : E.isData3DTexture ? T.setTexture3D(E, 0) : E.isDataArrayTexture || E.isCompressedArrayTexture ? T.setTexture2DArray(E, 0) : T.setTexture2D(E, 0), Te.unbindTexture();
    }, this.resetState = function() {
      A = 0, C = 0, I = null, Te.reset(), ht.reset();
    }, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
  }
  get coordinateSystem() {
    return Qn;
  }
  get outputColorSpace() {
    return this._outputColorSpace;
  }
  set outputColorSpace(e) {
    this._outputColorSpace = e;
    const t = this.getContext();
    t.drawingBufferColorspace = rt._getDrawingBufferColorSpace(e), t.unpackColorSpace = rt._getUnpackColorSpace();
  }
}
const kl = { type: "change" }, yc = { type: "start" }, Jh = { type: "end" }, kr = new cr(), zl = new fi(), P_ = Math.cos(70 * as.DEG2RAD), Dt = new M(), cn = 2 * Math.PI, xt = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6
}, qo = 1e-6;
class I_ extends qf {
  constructor(e, t = null) {
    super(e, t), this.state = xt.NONE, this.enabled = !0, this.target = new M(), this.cursor = new M(), this.minDistance = 0, this.maxDistance = 1 / 0, this.minZoom = 0, this.maxZoom = 1 / 0, this.minTargetRadius = 0, this.maxTargetRadius = 1 / 0, this.minPolarAngle = 0, this.maxPolarAngle = Math.PI, this.minAzimuthAngle = -1 / 0, this.maxAzimuthAngle = 1 / 0, this.enableDamping = !1, this.dampingFactor = 0.05, this.enableZoom = !0, this.zoomSpeed = 1, this.enableRotate = !0, this.rotateSpeed = 1, this.keyRotateSpeed = 1, this.enablePan = !0, this.panSpeed = 1, this.screenSpacePanning = !0, this.keyPanSpeed = 7, this.zoomToCursor = !1, this.autoRotate = !1, this.autoRotateSpeed = 2, this.keys = { LEFT: "ArrowLeft", UP: "ArrowUp", RIGHT: "ArrowRight", BOTTOM: "ArrowDown" }, this.mouseButtons = { LEFT: hs.ROTATE, MIDDLE: hs.DOLLY, RIGHT: hs.PAN }, this.touches = { ONE: ss.ROTATE, TWO: ss.DOLLY_PAN }, this.target0 = this.target.clone(), this.position0 = this.object.position.clone(), this.zoom0 = this.object.zoom, this._domElementKeyEvents = null, this._lastPosition = new M(), this._lastQuaternion = new mn(), this._lastTargetPosition = new M(), this._quat = new mn().setFromUnitVectors(e.up, new M(0, 1, 0)), this._quatInverse = this._quat.clone().invert(), this._spherical = new fl(), this._sphericalDelta = new fl(), this._scale = 1, this._panOffset = new M(), this._rotateStart = new ue(), this._rotateEnd = new ue(), this._rotateDelta = new ue(), this._panStart = new ue(), this._panEnd = new ue(), this._panDelta = new ue(), this._dollyStart = new ue(), this._dollyEnd = new ue(), this._dollyDelta = new ue(), this._dollyDirection = new M(), this._mouse = new ue(), this._performCursorZoom = !1, this._pointers = [], this._pointerPositions = {}, this._controlActive = !1, this._onPointerMove = D_.bind(this), this._onPointerDown = L_.bind(this), this._onPointerUp = N_.bind(this), this._onContextMenu = H_.bind(this), this._onMouseWheel = O_.bind(this), this._onKeyDown = B_.bind(this), this._onTouchStart = k_.bind(this), this._onTouchMove = z_.bind(this), this._onMouseDown = U_.bind(this), this._onMouseMove = F_.bind(this), this._interceptControlDown = V_.bind(this), this._interceptControlUp = G_.bind(this), this.domElement !== null && this.connect(), this.update();
  }
  connect() {
    this.domElement.addEventListener("pointerdown", this._onPointerDown), this.domElement.addEventListener("pointercancel", this._onPointerUp), this.domElement.addEventListener("contextmenu", this._onContextMenu), this.domElement.addEventListener("wheel", this._onMouseWheel, { passive: !1 }), this.domElement.getRootNode().addEventListener("keydown", this._interceptControlDown, { passive: !0, capture: !0 }), this.domElement.style.touchAction = "none";
  }
  disconnect() {
    this.domElement.removeEventListener("pointerdown", this._onPointerDown), this.domElement.removeEventListener("pointermove", this._onPointerMove), this.domElement.removeEventListener("pointerup", this._onPointerUp), this.domElement.removeEventListener("pointercancel", this._onPointerUp), this.domElement.removeEventListener("wheel", this._onMouseWheel), this.domElement.removeEventListener("contextmenu", this._onContextMenu), this.stopListenToKeyEvents(), this.domElement.getRootNode().removeEventListener("keydown", this._interceptControlDown, { capture: !0 }), this.domElement.style.touchAction = "auto";
  }
  dispose() {
    this.disconnect();
  }
  getPolarAngle() {
    return this._spherical.phi;
  }
  getAzimuthalAngle() {
    return this._spherical.theta;
  }
  getDistance() {
    return this.object.position.distanceTo(this.target);
  }
  listenToKeyEvents(e) {
    e.addEventListener("keydown", this._onKeyDown), this._domElementKeyEvents = e;
  }
  stopListenToKeyEvents() {
    this._domElementKeyEvents !== null && (this._domElementKeyEvents.removeEventListener("keydown", this._onKeyDown), this._domElementKeyEvents = null);
  }
  saveState() {
    this.target0.copy(this.target), this.position0.copy(this.object.position), this.zoom0 = this.object.zoom;
  }
  reset() {
    this.target.copy(this.target0), this.object.position.copy(this.position0), this.object.zoom = this.zoom0, this.object.updateProjectionMatrix(), this.dispatchEvent(kl), this.update(), this.state = xt.NONE;
  }
  update(e = null) {
    const t = this.object.position;
    Dt.copy(t).sub(this.target), Dt.applyQuaternion(this._quat), this._spherical.setFromVector3(Dt), this.autoRotate && this.state === xt.NONE && this._rotateLeft(this._getAutoRotationAngle(e)), this.enableDamping ? (this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor, this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor) : (this._spherical.theta += this._sphericalDelta.theta, this._spherical.phi += this._sphericalDelta.phi);
    let n = this.minAzimuthAngle, s = this.maxAzimuthAngle;
    isFinite(n) && isFinite(s) && (n < -Math.PI ? n += cn : n > Math.PI && (n -= cn), s < -Math.PI ? s += cn : s > Math.PI && (s -= cn), n <= s ? this._spherical.theta = Math.max(n, Math.min(s, this._spherical.theta)) : this._spherical.theta = this._spherical.theta > (n + s) / 2 ? Math.max(n, this._spherical.theta) : Math.min(s, this._spherical.theta)), this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi)), this._spherical.makeSafe(), this.enableDamping === !0 ? this.target.addScaledVector(this._panOffset, this.dampingFactor) : this.target.add(this._panOffset), this.target.sub(this.cursor), this.target.clampLength(this.minTargetRadius, this.maxTargetRadius), this.target.add(this.cursor);
    let r = !1;
    if (this.zoomToCursor && this._performCursorZoom || this.object.isOrthographicCamera)
      this._spherical.radius = this._clampDistance(this._spherical.radius);
    else {
      const o = this._spherical.radius;
      this._spherical.radius = this._clampDistance(this._spherical.radius * this._scale), r = o != this._spherical.radius;
    }
    if (Dt.setFromSpherical(this._spherical), Dt.applyQuaternion(this._quatInverse), t.copy(this.target).add(Dt), this.object.lookAt(this.target), this.enableDamping === !0 ? (this._sphericalDelta.theta *= 1 - this.dampingFactor, this._sphericalDelta.phi *= 1 - this.dampingFactor, this._panOffset.multiplyScalar(1 - this.dampingFactor)) : (this._sphericalDelta.set(0, 0, 0), this._panOffset.set(0, 0, 0)), this.zoomToCursor && this._performCursorZoom) {
      let o = null;
      if (this.object.isPerspectiveCamera) {
        const a = Dt.length();
        o = this._clampDistance(a * this._scale);
        const c = a - o;
        this.object.position.addScaledVector(this._dollyDirection, c), this.object.updateMatrixWorld(), r = !!c;
      } else if (this.object.isOrthographicCamera) {
        const a = new M(this._mouse.x, this._mouse.y, 0);
        a.unproject(this.object);
        const c = this.object.zoom;
        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), this.object.updateProjectionMatrix(), r = c !== this.object.zoom;
        const l = new M(this._mouse.x, this._mouse.y, 0);
        l.unproject(this.object), this.object.position.sub(l).add(a), this.object.updateMatrixWorld(), o = Dt.length();
      } else
        console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."), this.zoomToCursor = !1;
      o !== null && (this.screenSpacePanning ? this.target.set(0, 0, -1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position) : (kr.origin.copy(this.object.position), kr.direction.set(0, 0, -1).transformDirection(this.object.matrix), Math.abs(this.object.up.dot(kr.direction)) < P_ ? this.object.lookAt(this.target) : (zl.setFromNormalAndCoplanarPoint(this.object.up, this.target), kr.intersectPlane(zl, this.target))));
    } else if (this.object.isOrthographicCamera) {
      const o = this.object.zoom;
      this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), o !== this.object.zoom && (this.object.updateProjectionMatrix(), r = !0);
    }
    return this._scale = 1, this._performCursorZoom = !1, r || this._lastPosition.distanceToSquared(this.object.position) > qo || 8 * (1 - this._lastQuaternion.dot(this.object.quaternion)) > qo || this._lastTargetPosition.distanceToSquared(this.target) > qo ? (this.dispatchEvent(kl), this._lastPosition.copy(this.object.position), this._lastQuaternion.copy(this.object.quaternion), this._lastTargetPosition.copy(this.target), !0) : !1;
  }
  _getAutoRotationAngle(e) {
    return e !== null ? cn / 60 * this.autoRotateSpeed * e : cn / 60 / 60 * this.autoRotateSpeed;
  }
  _getZoomScale(e) {
    const t = Math.abs(e * 0.01);
    return Math.pow(0.95, this.zoomSpeed * t);
  }
  _rotateLeft(e) {
    this._sphericalDelta.theta -= e;
  }
  _rotateUp(e) {
    this._sphericalDelta.phi -= e;
  }
  _panLeft(e, t) {
    Dt.setFromMatrixColumn(t, 0), Dt.multiplyScalar(-e), this._panOffset.add(Dt);
  }
  _panUp(e, t) {
    this.screenSpacePanning === !0 ? Dt.setFromMatrixColumn(t, 1) : (Dt.setFromMatrixColumn(t, 0), Dt.crossVectors(this.object.up, Dt)), Dt.multiplyScalar(e), this._panOffset.add(Dt);
  }
  // deltaX and deltaY are in pixels; right and down are positive
  _pan(e, t) {
    const n = this.domElement;
    if (this.object.isPerspectiveCamera) {
      const s = this.object.position;
      Dt.copy(s).sub(this.target);
      let r = Dt.length();
      r *= Math.tan(this.object.fov / 2 * Math.PI / 180), this._panLeft(2 * e * r / n.clientHeight, this.object.matrix), this._panUp(2 * t * r / n.clientHeight, this.object.matrix);
    } else this.object.isOrthographicCamera ? (this._panLeft(e * (this.object.right - this.object.left) / this.object.zoom / n.clientWidth, this.object.matrix), this._panUp(t * (this.object.top - this.object.bottom) / this.object.zoom / n.clientHeight, this.object.matrix)) : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."), this.enablePan = !1);
  }
  _dollyOut(e) {
    this.object.isPerspectiveCamera || this.object.isOrthographicCamera ? this._scale /= e : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."), this.enableZoom = !1);
  }
  _dollyIn(e) {
    this.object.isPerspectiveCamera || this.object.isOrthographicCamera ? this._scale *= e : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."), this.enableZoom = !1);
  }
  _updateZoomParameters(e, t) {
    if (!this.zoomToCursor)
      return;
    this._performCursorZoom = !0;
    const n = this.domElement.getBoundingClientRect(), s = e - n.left, r = t - n.top, o = n.width, a = n.height;
    this._mouse.x = s / o * 2 - 1, this._mouse.y = -(r / a) * 2 + 1, this._dollyDirection.set(this._mouse.x, this._mouse.y, 1).unproject(this.object).sub(this.object.position).normalize();
  }
  _clampDistance(e) {
    return Math.max(this.minDistance, Math.min(this.maxDistance, e));
  }
  //
  // event callbacks - update the object state
  //
  _handleMouseDownRotate(e) {
    this._rotateStart.set(e.clientX, e.clientY);
  }
  _handleMouseDownDolly(e) {
    this._updateZoomParameters(e.clientX, e.clientX), this._dollyStart.set(e.clientX, e.clientY);
  }
  _handleMouseDownPan(e) {
    this._panStart.set(e.clientX, e.clientY);
  }
  _handleMouseMoveRotate(e) {
    this._rotateEnd.set(e.clientX, e.clientY), this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
    const t = this.domElement;
    this._rotateLeft(cn * this._rotateDelta.x / t.clientHeight), this._rotateUp(cn * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd), this.update();
  }
  _handleMouseMoveDolly(e) {
    this._dollyEnd.set(e.clientX, e.clientY), this._dollyDelta.subVectors(this._dollyEnd, this._dollyStart), this._dollyDelta.y > 0 ? this._dollyOut(this._getZoomScale(this._dollyDelta.y)) : this._dollyDelta.y < 0 && this._dollyIn(this._getZoomScale(this._dollyDelta.y)), this._dollyStart.copy(this._dollyEnd), this.update();
  }
  _handleMouseMovePan(e) {
    this._panEnd.set(e.clientX, e.clientY), this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed), this._pan(this._panDelta.x, this._panDelta.y), this._panStart.copy(this._panEnd), this.update();
  }
  _handleMouseWheel(e) {
    this._updateZoomParameters(e.clientX, e.clientY), e.deltaY < 0 ? this._dollyIn(this._getZoomScale(e.deltaY)) : e.deltaY > 0 && this._dollyOut(this._getZoomScale(e.deltaY)), this.update();
  }
  _handleKeyDown(e) {
    let t = !1;
    switch (e.code) {
      case this.keys.UP:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(cn * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, this.keyPanSpeed), t = !0;
        break;
      case this.keys.BOTTOM:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(-cn * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, -this.keyPanSpeed), t = !0;
        break;
      case this.keys.LEFT:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(cn * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(this.keyPanSpeed, 0), t = !0;
        break;
      case this.keys.RIGHT:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(-cn * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(-this.keyPanSpeed, 0), t = !0;
        break;
    }
    t && (e.preventDefault(), this.update());
  }
  _handleTouchStartRotate(e) {
    if (this._pointers.length === 1)
      this._rotateStart.set(e.pageX, e.pageY);
    else {
      const t = this._getSecondPointerPosition(e), n = 0.5 * (e.pageX + t.x), s = 0.5 * (e.pageY + t.y);
      this._rotateStart.set(n, s);
    }
  }
  _handleTouchStartPan(e) {
    if (this._pointers.length === 1)
      this._panStart.set(e.pageX, e.pageY);
    else {
      const t = this._getSecondPointerPosition(e), n = 0.5 * (e.pageX + t.x), s = 0.5 * (e.pageY + t.y);
      this._panStart.set(n, s);
    }
  }
  _handleTouchStartDolly(e) {
    const t = this._getSecondPointerPosition(e), n = e.pageX - t.x, s = e.pageY - t.y, r = Math.sqrt(n * n + s * s);
    this._dollyStart.set(0, r);
  }
  _handleTouchStartDollyPan(e) {
    this.enableZoom && this._handleTouchStartDolly(e), this.enablePan && this._handleTouchStartPan(e);
  }
  _handleTouchStartDollyRotate(e) {
    this.enableZoom && this._handleTouchStartDolly(e), this.enableRotate && this._handleTouchStartRotate(e);
  }
  _handleTouchMoveRotate(e) {
    if (this._pointers.length == 1)
      this._rotateEnd.set(e.pageX, e.pageY);
    else {
      const n = this._getSecondPointerPosition(e), s = 0.5 * (e.pageX + n.x), r = 0.5 * (e.pageY + n.y);
      this._rotateEnd.set(s, r);
    }
    this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
    const t = this.domElement;
    this._rotateLeft(cn * this._rotateDelta.x / t.clientHeight), this._rotateUp(cn * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd);
  }
  _handleTouchMovePan(e) {
    if (this._pointers.length === 1)
      this._panEnd.set(e.pageX, e.pageY);
    else {
      const t = this._getSecondPointerPosition(e), n = 0.5 * (e.pageX + t.x), s = 0.5 * (e.pageY + t.y);
      this._panEnd.set(n, s);
    }
    this._panDelta.subVectors(this._panEnd, this._panStart).multiplyScalar(this.panSpeed), this._pan(this._panDelta.x, this._panDelta.y), this._panStart.copy(this._panEnd);
  }
  _handleTouchMoveDolly(e) {
    const t = this._getSecondPointerPosition(e), n = e.pageX - t.x, s = e.pageY - t.y, r = Math.sqrt(n * n + s * s);
    this._dollyEnd.set(0, r), this._dollyDelta.set(0, Math.pow(this._dollyEnd.y / this._dollyStart.y, this.zoomSpeed)), this._dollyOut(this._dollyDelta.y), this._dollyStart.copy(this._dollyEnd);
    const o = (e.pageX + t.x) * 0.5, a = (e.pageY + t.y) * 0.5;
    this._updateZoomParameters(o, a);
  }
  _handleTouchMoveDollyPan(e) {
    this.enableZoom && this._handleTouchMoveDolly(e), this.enablePan && this._handleTouchMovePan(e);
  }
  _handleTouchMoveDollyRotate(e) {
    this.enableZoom && this._handleTouchMoveDolly(e), this.enableRotate && this._handleTouchMoveRotate(e);
  }
  // pointers
  _addPointer(e) {
    this._pointers.push(e.pointerId);
  }
  _removePointer(e) {
    delete this._pointerPositions[e.pointerId];
    for (let t = 0; t < this._pointers.length; t++)
      if (this._pointers[t] == e.pointerId) {
        this._pointers.splice(t, 1);
        return;
      }
  }
  _isTrackingPointer(e) {
    for (let t = 0; t < this._pointers.length; t++)
      if (this._pointers[t] == e.pointerId) return !0;
    return !1;
  }
  _trackPointer(e) {
    let t = this._pointerPositions[e.pointerId];
    t === void 0 && (t = new ue(), this._pointerPositions[e.pointerId] = t), t.set(e.pageX, e.pageY);
  }
  _getSecondPointerPosition(e) {
    const t = e.pointerId === this._pointers[0] ? this._pointers[1] : this._pointers[0];
    return this._pointerPositions[t];
  }
  //
  _customWheelEvent(e) {
    const t = e.deltaMode, n = {
      clientX: e.clientX,
      clientY: e.clientY,
      deltaY: e.deltaY
    };
    switch (t) {
      case 1:
        n.deltaY *= 16;
        break;
      case 2:
        n.deltaY *= 100;
        break;
    }
    return e.ctrlKey && !this._controlActive && (n.deltaY *= 10), n;
  }
}
function L_(i) {
  this.enabled !== !1 && (this._pointers.length === 0 && (this.domElement.setPointerCapture(i.pointerId), this.domElement.addEventListener("pointermove", this._onPointerMove), this.domElement.addEventListener("pointerup", this._onPointerUp)), !this._isTrackingPointer(i) && (this._addPointer(i), i.pointerType === "touch" ? this._onTouchStart(i) : this._onMouseDown(i)));
}
function D_(i) {
  this.enabled !== !1 && (i.pointerType === "touch" ? this._onTouchMove(i) : this._onMouseMove(i));
}
function N_(i) {
  switch (this._removePointer(i), this._pointers.length) {
    case 0:
      this.domElement.releasePointerCapture(i.pointerId), this.domElement.removeEventListener("pointermove", this._onPointerMove), this.domElement.removeEventListener("pointerup", this._onPointerUp), this.dispatchEvent(Jh), this.state = xt.NONE;
      break;
    case 1:
      const e = this._pointers[0], t = this._pointerPositions[e];
      this._onTouchStart({ pointerId: e, pageX: t.x, pageY: t.y });
      break;
  }
}
function U_(i) {
  let e;
  switch (i.button) {
    case 0:
      e = this.mouseButtons.LEFT;
      break;
    case 1:
      e = this.mouseButtons.MIDDLE;
      break;
    case 2:
      e = this.mouseButtons.RIGHT;
      break;
    default:
      e = -1;
  }
  switch (e) {
    case hs.DOLLY:
      if (this.enableZoom === !1) return;
      this._handleMouseDownDolly(i), this.state = xt.DOLLY;
      break;
    case hs.ROTATE:
      if (i.ctrlKey || i.metaKey || i.shiftKey) {
        if (this.enablePan === !1) return;
        this._handleMouseDownPan(i), this.state = xt.PAN;
      } else {
        if (this.enableRotate === !1) return;
        this._handleMouseDownRotate(i), this.state = xt.ROTATE;
      }
      break;
    case hs.PAN:
      if (i.ctrlKey || i.metaKey || i.shiftKey) {
        if (this.enableRotate === !1) return;
        this._handleMouseDownRotate(i), this.state = xt.ROTATE;
      } else {
        if (this.enablePan === !1) return;
        this._handleMouseDownPan(i), this.state = xt.PAN;
      }
      break;
    default:
      this.state = xt.NONE;
  }
  this.state !== xt.NONE && this.dispatchEvent(yc);
}
function F_(i) {
  switch (this.state) {
    case xt.ROTATE:
      if (this.enableRotate === !1) return;
      this._handleMouseMoveRotate(i);
      break;
    case xt.DOLLY:
      if (this.enableZoom === !1) return;
      this._handleMouseMoveDolly(i);
      break;
    case xt.PAN:
      if (this.enablePan === !1) return;
      this._handleMouseMovePan(i);
      break;
  }
}
function O_(i) {
  this.enabled === !1 || this.enableZoom === !1 || this.state !== xt.NONE || (i.preventDefault(), this.dispatchEvent(yc), this._handleMouseWheel(this._customWheelEvent(i)), this.dispatchEvent(Jh));
}
function B_(i) {
  this.enabled !== !1 && this._handleKeyDown(i);
}
function k_(i) {
  switch (this._trackPointer(i), this._pointers.length) {
    case 1:
      switch (this.touches.ONE) {
        case ss.ROTATE:
          if (this.enableRotate === !1) return;
          this._handleTouchStartRotate(i), this.state = xt.TOUCH_ROTATE;
          break;
        case ss.PAN:
          if (this.enablePan === !1) return;
          this._handleTouchStartPan(i), this.state = xt.TOUCH_PAN;
          break;
        default:
          this.state = xt.NONE;
      }
      break;
    case 2:
      switch (this.touches.TWO) {
        case ss.DOLLY_PAN:
          if (this.enableZoom === !1 && this.enablePan === !1) return;
          this._handleTouchStartDollyPan(i), this.state = xt.TOUCH_DOLLY_PAN;
          break;
        case ss.DOLLY_ROTATE:
          if (this.enableZoom === !1 && this.enableRotate === !1) return;
          this._handleTouchStartDollyRotate(i), this.state = xt.TOUCH_DOLLY_ROTATE;
          break;
        default:
          this.state = xt.NONE;
      }
      break;
    default:
      this.state = xt.NONE;
  }
  this.state !== xt.NONE && this.dispatchEvent(yc);
}
function z_(i) {
  switch (this._trackPointer(i), this.state) {
    case xt.TOUCH_ROTATE:
      if (this.enableRotate === !1) return;
      this._handleTouchMoveRotate(i), this.update();
      break;
    case xt.TOUCH_PAN:
      if (this.enablePan === !1) return;
      this._handleTouchMovePan(i), this.update();
      break;
    case xt.TOUCH_DOLLY_PAN:
      if (this.enableZoom === !1 && this.enablePan === !1) return;
      this._handleTouchMoveDollyPan(i), this.update();
      break;
    case xt.TOUCH_DOLLY_ROTATE:
      if (this.enableZoom === !1 && this.enableRotate === !1) return;
      this._handleTouchMoveDollyRotate(i), this.update();
      break;
    default:
      this.state = xt.NONE;
  }
}
function H_(i) {
  this.enabled !== !1 && i.preventDefault();
}
function V_(i) {
  i.key === "Control" && (this._controlActive = !0, this.domElement.getRootNode().addEventListener("keyup", this._interceptControlUp, { passive: !0, capture: !0 }));
}
function G_(i) {
  i.key === "Control" && (this._controlActive = !1, this.domElement.getRootNode().removeEventListener("keyup", this._interceptControlUp, { passive: !0, capture: !0 }));
}
function W_(i, e = !1) {
  const t = i[0].index !== null, n = new Set(Object.keys(i[0].attributes)), s = new Set(Object.keys(i[0].morphAttributes)), r = {}, o = {}, a = i[0].morphTargetsRelative, c = new Bt();
  let l = 0;
  for (let h = 0; h < i.length; ++h) {
    const u = i[h];
    let d = 0;
    if (t !== (u.index !== null))
      return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."), null;
    for (const f in u.attributes) {
      if (!n.has(f))
        return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + '. All geometries must have compatible attributes; make sure "' + f + '" attribute exists among all geometries, or in none of them.'), null;
      r[f] === void 0 && (r[f] = []), r[f].push(u.attributes[f]), d++;
    }
    if (d !== n.size)
      return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". Make sure all geometries have the same number of attributes."), null;
    if (a !== u.morphTargetsRelative)
      return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". .morphTargetsRelative must be consistent throughout all geometries."), null;
    for (const f in u.morphAttributes) {
      if (!s.has(f))
        return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ".  .morphAttributes must be consistent throughout all geometries."), null;
      o[f] === void 0 && (o[f] = []), o[f].push(u.morphAttributes[f]);
    }
    if (e) {
      let f;
      if (t)
        f = u.index.count;
      else if (u.attributes.position !== void 0)
        f = u.attributes.position.count;
      else
        return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". The geometry must have either an index or a position attribute"), null;
      c.addGroup(l, f, h), l += f;
    }
  }
  if (t) {
    let h = 0;
    const u = [];
    for (let d = 0; d < i.length; ++d) {
      const f = i[d].index;
      for (let g = 0; g < f.count; ++g)
        u.push(f.getX(g) + h);
      h += i[d].attributes.position.count;
    }
    c.setIndex(u);
  }
  for (const h in r) {
    const u = Hl(r[h]);
    if (!u)
      return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + h + " attribute."), null;
    c.setAttribute(h, u);
  }
  for (const h in o) {
    const u = o[h][0].length;
    if (u === 0) break;
    c.morphAttributes = c.morphAttributes || {}, c.morphAttributes[h] = [];
    for (let d = 0; d < u; ++d) {
      const f = [];
      for (let _ = 0; _ < o[h].length; ++_)
        f.push(o[h][_][d]);
      const g = Hl(f);
      if (!g)
        return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + h + " morphAttribute."), null;
      c.morphAttributes[h].push(g);
    }
  }
  return c;
}
function Hl(i) {
  let e, t, n, s = -1, r = 0;
  for (let l = 0; l < i.length; ++l) {
    const h = i[l];
    if (e === void 0 && (e = h.array.constructor), e !== h.array.constructor)
      return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."), null;
    if (t === void 0 && (t = h.itemSize), t !== h.itemSize)
      return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."), null;
    if (n === void 0 && (n = h.normalized), n !== h.normalized)
      return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."), null;
    if (s === -1 && (s = h.gpuType), s !== h.gpuType)
      return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."), null;
    r += h.count * t;
  }
  const o = new e(r), a = new Vt(o, t, n);
  let c = 0;
  for (let l = 0; l < i.length; ++l) {
    const h = i[l];
    if (h.isInterleavedBufferAttribute) {
      const u = c / t;
      for (let d = 0, f = h.count; d < f; d++)
        for (let g = 0; g < t; g++) {
          const _ = h.getComponent(d, g);
          a.setComponent(d + u, g, _);
        }
    } else
      o.set(h.array, c);
    c += h.count * t;
  }
  return s !== void 0 && (a.gpuType = s), a;
}
function Vl(i, e) {
  if (e === Vu)
    return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."), i;
  if (e === Ba || e === xh) {
    let t = i.getIndex();
    if (t === null) {
      const o = [], a = i.getAttribute("position");
      if (a !== void 0) {
        for (let c = 0; c < a.count; c++)
          o.push(c);
        i.setIndex(o), t = i.getIndex();
      } else
        return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."), i;
    }
    const n = t.count - 2, s = [];
    if (e === Ba)
      for (let o = 1; o <= n; o++)
        s.push(t.getX(0)), s.push(t.getX(o)), s.push(t.getX(o + 1));
    else
      for (let o = 0; o < n; o++)
        o % 2 === 0 ? (s.push(t.getX(o)), s.push(t.getX(o + 1)), s.push(t.getX(o + 2))) : (s.push(t.getX(o + 2)), s.push(t.getX(o + 1)), s.push(t.getX(o)));
    s.length / 3 !== n && console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");
    const r = i.clone();
    return r.setIndex(s), r.clearGroups(), r;
  } else
    return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:", e), i;
}
class X_ extends Ps {
  constructor(e) {
    super(e), this.dracoLoader = null, this.ktx2Loader = null, this.meshoptDecoder = null, this.pluginCallbacks = [], this.register(function(t) {
      return new Z_(t);
    }), this.register(function(t) {
      return new $_(t);
    }), this.register(function(t) {
      return new ov(t);
    }), this.register(function(t) {
      return new av(t);
    }), this.register(function(t) {
      return new cv(t);
    }), this.register(function(t) {
      return new Q_(t);
    }), this.register(function(t) {
      return new ev(t);
    }), this.register(function(t) {
      return new tv(t);
    }), this.register(function(t) {
      return new nv(t);
    }), this.register(function(t) {
      return new j_(t);
    }), this.register(function(t) {
      return new iv(t);
    }), this.register(function(t) {
      return new J_(t);
    }), this.register(function(t) {
      return new rv(t);
    }), this.register(function(t) {
      return new sv(t);
    }), this.register(function(t) {
      return new Y_(t);
    }), this.register(function(t) {
      return new lv(t);
    }), this.register(function(t) {
      return new hv(t);
    });
  }
  load(e, t, n, s) {
    const r = this;
    let o;
    if (this.resourcePath !== "")
      o = this.resourcePath;
    else if (this.path !== "") {
      const l = nr.extractUrlBase(e);
      o = nr.resolveURL(l, this.path);
    } else
      o = nr.extractUrlBase(e);
    this.manager.itemStart(e);
    const a = function(l) {
      s ? s(l) : console.error(l), r.manager.itemError(e), r.manager.itemEnd(e);
    }, c = new qh(this.manager);
    c.setPath(this.path), c.setResponseType("arraybuffer"), c.setRequestHeader(this.requestHeader), c.setWithCredentials(this.withCredentials), c.load(e, function(l) {
      try {
        r.parse(l, o, function(h) {
          t(h), r.manager.itemEnd(e);
        }, a);
      } catch (h) {
        a(h);
      }
    }, n, a);
  }
  setDRACOLoader(e) {
    return this.dracoLoader = e, this;
  }
  setKTX2Loader(e) {
    return this.ktx2Loader = e, this;
  }
  setMeshoptDecoder(e) {
    return this.meshoptDecoder = e, this;
  }
  register(e) {
    return this.pluginCallbacks.indexOf(e) === -1 && this.pluginCallbacks.push(e), this;
  }
  unregister(e) {
    return this.pluginCallbacks.indexOf(e) !== -1 && this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e), 1), this;
  }
  parse(e, t, n, s) {
    let r;
    const o = {}, a = {}, c = new TextDecoder();
    if (typeof e == "string")
      r = JSON.parse(e);
    else if (e instanceof ArrayBuffer)
      if (c.decode(new Uint8Array(e, 0, 4)) === Qh) {
        try {
          o[tt.KHR_BINARY_GLTF] = new uv(e);
        } catch (u) {
          s && s(u);
          return;
        }
        r = JSON.parse(o[tt.KHR_BINARY_GLTF].content);
      } else
        r = JSON.parse(c.decode(e));
    else
      r = e;
    if (r.asset === void 0 || r.asset.version[0] < 2) {
      s && s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
      return;
    }
    const l = new Ev(r, {
      path: t || this.resourcePath || "",
      crossOrigin: this.crossOrigin,
      requestHeader: this.requestHeader,
      manager: this.manager,
      ktx2Loader: this.ktx2Loader,
      meshoptDecoder: this.meshoptDecoder
    });
    l.fileLoader.setRequestHeader(this.requestHeader);
    for (let h = 0; h < this.pluginCallbacks.length; h++) {
      const u = this.pluginCallbacks[h](l);
      u.name || console.error("THREE.GLTFLoader: Invalid plugin found: missing name"), a[u.name] = u, o[u.name] = !0;
    }
    if (r.extensionsUsed)
      for (let h = 0; h < r.extensionsUsed.length; ++h) {
        const u = r.extensionsUsed[h], d = r.extensionsRequired || [];
        switch (u) {
          case tt.KHR_MATERIALS_UNLIT:
            o[u] = new K_();
            break;
          case tt.KHR_DRACO_MESH_COMPRESSION:
            o[u] = new dv(r, this.dracoLoader);
            break;
          case tt.KHR_TEXTURE_TRANSFORM:
            o[u] = new fv();
            break;
          case tt.KHR_MESH_QUANTIZATION:
            o[u] = new pv();
            break;
          default:
            d.indexOf(u) >= 0 && a[u] === void 0 && console.warn('THREE.GLTFLoader: Unknown extension "' + u + '".');
        }
      }
    l.setExtensions(o), l.setPlugins(a), l.parse(n, s);
  }
  parseAsync(e, t) {
    const n = this;
    return new Promise(function(s, r) {
      n.parse(e, t, s, r);
    });
  }
}
function q_() {
  let i = {};
  return {
    get: function(e) {
      return i[e];
    },
    add: function(e, t) {
      i[e] = t;
    },
    remove: function(e) {
      delete i[e];
    },
    removeAll: function() {
      i = {};
    }
  };
}
const tt = {
  KHR_BINARY_GLTF: "KHR_binary_glTF",
  KHR_DRACO_MESH_COMPRESSION: "KHR_draco_mesh_compression",
  KHR_LIGHTS_PUNCTUAL: "KHR_lights_punctual",
  KHR_MATERIALS_CLEARCOAT: "KHR_materials_clearcoat",
  KHR_MATERIALS_DISPERSION: "KHR_materials_dispersion",
  KHR_MATERIALS_IOR: "KHR_materials_ior",
  KHR_MATERIALS_SHEEN: "KHR_materials_sheen",
  KHR_MATERIALS_SPECULAR: "KHR_materials_specular",
  KHR_MATERIALS_TRANSMISSION: "KHR_materials_transmission",
  KHR_MATERIALS_IRIDESCENCE: "KHR_materials_iridescence",
  KHR_MATERIALS_ANISOTROPY: "KHR_materials_anisotropy",
  KHR_MATERIALS_UNLIT: "KHR_materials_unlit",
  KHR_MATERIALS_VOLUME: "KHR_materials_volume",
  KHR_TEXTURE_BASISU: "KHR_texture_basisu",
  KHR_TEXTURE_TRANSFORM: "KHR_texture_transform",
  KHR_MESH_QUANTIZATION: "KHR_mesh_quantization",
  KHR_MATERIALS_EMISSIVE_STRENGTH: "KHR_materials_emissive_strength",
  EXT_MATERIALS_BUMP: "EXT_materials_bump",
  EXT_TEXTURE_WEBP: "EXT_texture_webp",
  EXT_TEXTURE_AVIF: "EXT_texture_avif",
  EXT_MESHOPT_COMPRESSION: "EXT_meshopt_compression",
  EXT_MESH_GPU_INSTANCING: "EXT_mesh_gpu_instancing"
};
class Y_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_LIGHTS_PUNCTUAL, this.cache = { refs: {}, uses: {} };
  }
  _markDefs() {
    const e = this.parser, t = this.parser.json.nodes || [];
    for (let n = 0, s = t.length; n < s; n++) {
      const r = t[n];
      r.extensions && r.extensions[this.name] && r.extensions[this.name].light !== void 0 && e._addNodeRef(this.cache, r.extensions[this.name].light);
    }
  }
  _loadLight(e) {
    const t = this.parser, n = "light:" + e;
    let s = t.cache.get(n);
    if (s) return s;
    const r = t.json, c = ((r.extensions && r.extensions[this.name] || {}).lights || [])[e];
    let l;
    const h = new Ie(16777215);
    c.color !== void 0 && h.setRGB(c.color[0], c.color[1], c.color[2], sn);
    const u = c.range !== void 0 ? c.range : 0;
    switch (c.type) {
      case "directional":
        l = new Ga(h), l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      case "point":
        l = new mc(h), l.distance = u;
        break;
      case "spot":
        l = new Rf(h), l.distance = u, c.spot = c.spot || {}, c.spot.innerConeAngle = c.spot.innerConeAngle !== void 0 ? c.spot.innerConeAngle : 0, c.spot.outerConeAngle = c.spot.outerConeAngle !== void 0 ? c.spot.outerConeAngle : Math.PI / 4, l.angle = c.spot.outerConeAngle, l.penumbra = 1 - c.spot.innerConeAngle / c.spot.outerConeAngle, l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      default:
        throw new Error("THREE.GLTFLoader: Unexpected light type: " + c.type);
    }
    return l.position.set(0, 0, 0), l.decay = 2, $n(l, c), c.intensity !== void 0 && (l.intensity = c.intensity), l.name = t.createUniqueName(c.name || "light_" + e), s = Promise.resolve(l), t.cache.add(n, s), s;
  }
  getDependency(e, t) {
    if (e === "light")
      return this._loadLight(t);
  }
  createNodeAttachment(e) {
    const t = this, n = this.parser, r = n.json.nodes[e], a = (r.extensions && r.extensions[this.name] || {}).light;
    return a === void 0 ? null : this._loadLight(a).then(function(c) {
      return n._getNodeRef(t.cache, a, c);
    });
  }
}
class K_ {
  constructor() {
    this.name = tt.KHR_MATERIALS_UNLIT;
  }
  getMaterialType() {
    return gi;
  }
  extendParams(e, t, n) {
    const s = [];
    e.color = new Ie(1, 1, 1), e.opacity = 1;
    const r = t.pbrMetallicRoughness;
    if (r) {
      if (Array.isArray(r.baseColorFactor)) {
        const o = r.baseColorFactor;
        e.color.setRGB(o[0], o[1], o[2], sn), e.opacity = o[3];
      }
      r.baseColorTexture !== void 0 && s.push(n.assignTexture(e, "map", r.baseColorTexture, Nt));
    }
    return Promise.all(s);
  }
}
class j_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name].emissiveStrength;
    return r !== void 0 && (t.emissiveIntensity = r), Promise.resolve();
  }
}
class Z_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_CLEARCOAT;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    if (o.clearcoatFactor !== void 0 && (t.clearcoat = o.clearcoatFactor), o.clearcoatTexture !== void 0 && r.push(n.assignTexture(t, "clearcoatMap", o.clearcoatTexture)), o.clearcoatRoughnessFactor !== void 0 && (t.clearcoatRoughness = o.clearcoatRoughnessFactor), o.clearcoatRoughnessTexture !== void 0 && r.push(n.assignTexture(t, "clearcoatRoughnessMap", o.clearcoatRoughnessTexture)), o.clearcoatNormalTexture !== void 0 && (r.push(n.assignTexture(t, "clearcoatNormalMap", o.clearcoatNormalTexture)), o.clearcoatNormalTexture.scale !== void 0)) {
      const a = o.clearcoatNormalTexture.scale;
      t.clearcoatNormalScale = new ue(a, a);
    }
    return Promise.all(r);
  }
}
class $_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_DISPERSION;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name];
    return t.dispersion = r.dispersion !== void 0 ? r.dispersion : 0, Promise.resolve();
  }
}
class J_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_IRIDESCENCE;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.iridescenceFactor !== void 0 && (t.iridescence = o.iridescenceFactor), o.iridescenceTexture !== void 0 && r.push(n.assignTexture(t, "iridescenceMap", o.iridescenceTexture)), o.iridescenceIor !== void 0 && (t.iridescenceIOR = o.iridescenceIor), t.iridescenceThicknessRange === void 0 && (t.iridescenceThicknessRange = [100, 400]), o.iridescenceThicknessMinimum !== void 0 && (t.iridescenceThicknessRange[0] = o.iridescenceThicknessMinimum), o.iridescenceThicknessMaximum !== void 0 && (t.iridescenceThicknessRange[1] = o.iridescenceThicknessMaximum), o.iridescenceThicknessTexture !== void 0 && r.push(n.assignTexture(t, "iridescenceThicknessMap", o.iridescenceThicknessTexture)), Promise.all(r);
  }
}
class Q_ {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_SHEEN;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [];
    t.sheenColor = new Ie(0, 0, 0), t.sheenRoughness = 0, t.sheen = 1;
    const o = s.extensions[this.name];
    if (o.sheenColorFactor !== void 0) {
      const a = o.sheenColorFactor;
      t.sheenColor.setRGB(a[0], a[1], a[2], sn);
    }
    return o.sheenRoughnessFactor !== void 0 && (t.sheenRoughness = o.sheenRoughnessFactor), o.sheenColorTexture !== void 0 && r.push(n.assignTexture(t, "sheenColorMap", o.sheenColorTexture, Nt)), o.sheenRoughnessTexture !== void 0 && r.push(n.assignTexture(t, "sheenRoughnessMap", o.sheenRoughnessTexture)), Promise.all(r);
  }
}
class ev {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_TRANSMISSION;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.transmissionFactor !== void 0 && (t.transmission = o.transmissionFactor), o.transmissionTexture !== void 0 && r.push(n.assignTexture(t, "transmissionMap", o.transmissionTexture)), Promise.all(r);
  }
}
class tv {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_VOLUME;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    t.thickness = o.thicknessFactor !== void 0 ? o.thicknessFactor : 0, o.thicknessTexture !== void 0 && r.push(n.assignTexture(t, "thicknessMap", o.thicknessTexture)), t.attenuationDistance = o.attenuationDistance || 1 / 0;
    const a = o.attenuationColor || [1, 1, 1];
    return t.attenuationColor = new Ie().setRGB(a[0], a[1], a[2], sn), Promise.all(r);
  }
}
class nv {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_IOR;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name];
    return t.ior = r.ior !== void 0 ? r.ior : 1.5, Promise.resolve();
  }
}
class iv {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_SPECULAR;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    t.specularIntensity = o.specularFactor !== void 0 ? o.specularFactor : 1, o.specularTexture !== void 0 && r.push(n.assignTexture(t, "specularIntensityMap", o.specularTexture));
    const a = o.specularColorFactor || [1, 1, 1];
    return t.specularColor = new Ie().setRGB(a[0], a[1], a[2], sn), o.specularColorTexture !== void 0 && r.push(n.assignTexture(t, "specularColorMap", o.specularColorTexture, Nt)), Promise.all(r);
  }
}
class sv {
  constructor(e) {
    this.parser = e, this.name = tt.EXT_MATERIALS_BUMP;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return t.bumpScale = o.bumpFactor !== void 0 ? o.bumpFactor : 1, o.bumpTexture !== void 0 && r.push(n.assignTexture(t, "bumpMap", o.bumpTexture)), Promise.all(r);
  }
}
class rv {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_MATERIALS_ANISOTROPY;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : jt;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.anisotropyStrength !== void 0 && (t.anisotropy = o.anisotropyStrength), o.anisotropyRotation !== void 0 && (t.anisotropyRotation = o.anisotropyRotation), o.anisotropyTexture !== void 0 && r.push(n.assignTexture(t, "anisotropyMap", o.anisotropyTexture)), Promise.all(r);
  }
}
class ov {
  constructor(e) {
    this.parser = e, this.name = tt.KHR_TEXTURE_BASISU;
  }
  loadTexture(e) {
    const t = this.parser, n = t.json, s = n.textures[e];
    if (!s.extensions || !s.extensions[this.name])
      return null;
    const r = s.extensions[this.name], o = t.options.ktx2Loader;
    if (!o) {
      if (n.extensionsRequired && n.extensionsRequired.indexOf(this.name) >= 0)
        throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");
      return null;
    }
    return t.loadTextureImage(e, r.source, o);
  }
}
class av {
  constructor(e) {
    this.parser = e, this.name = tt.EXT_TEXTURE_WEBP, this.isSupported = null;
  }
  loadTexture(e) {
    const t = this.name, n = this.parser, s = n.json, r = s.textures[e];
    if (!r.extensions || !r.extensions[t])
      return null;
    const o = r.extensions[t], a = s.images[o.source];
    let c = n.textureLoader;
    if (a.uri) {
      const l = n.options.manager.getHandler(a.uri);
      l !== null && (c = l);
    }
    return this.detectSupport().then(function(l) {
      if (l) return n.loadTextureImage(e, o.source, c);
      if (s.extensionsRequired && s.extensionsRequired.indexOf(t) >= 0)
        throw new Error("THREE.GLTFLoader: WebP required by asset but unsupported.");
      return n.loadTexture(e);
    });
  }
  detectSupport() {
    return this.isSupported || (this.isSupported = new Promise(function(e) {
      const t = new Image();
      t.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", t.onload = t.onerror = function() {
        e(t.height === 1);
      };
    })), this.isSupported;
  }
}
class cv {
  constructor(e) {
    this.parser = e, this.name = tt.EXT_TEXTURE_AVIF, this.isSupported = null;
  }
  loadTexture(e) {
    const t = this.name, n = this.parser, s = n.json, r = s.textures[e];
    if (!r.extensions || !r.extensions[t])
      return null;
    const o = r.extensions[t], a = s.images[o.source];
    let c = n.textureLoader;
    if (a.uri) {
      const l = n.options.manager.getHandler(a.uri);
      l !== null && (c = l);
    }
    return this.detectSupport().then(function(l) {
      if (l) return n.loadTextureImage(e, o.source, c);
      if (s.extensionsRequired && s.extensionsRequired.indexOf(t) >= 0)
        throw new Error("THREE.GLTFLoader: AVIF required by asset but unsupported.");
      return n.loadTexture(e);
    });
  }
  detectSupport() {
    return this.isSupported || (this.isSupported = new Promise(function(e) {
      const t = new Image();
      t.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=", t.onload = t.onerror = function() {
        e(t.height === 1);
      };
    })), this.isSupported;
  }
}
class lv {
  constructor(e) {
    this.name = tt.EXT_MESHOPT_COMPRESSION, this.parser = e;
  }
  loadBufferView(e) {
    const t = this.parser.json, n = t.bufferViews[e];
    if (n.extensions && n.extensions[this.name]) {
      const s = n.extensions[this.name], r = this.parser.getDependency("buffer", s.buffer), o = this.parser.options.meshoptDecoder;
      if (!o || !o.supported) {
        if (t.extensionsRequired && t.extensionsRequired.indexOf(this.name) >= 0)
          throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");
        return null;
      }
      return r.then(function(a) {
        const c = s.byteOffset || 0, l = s.byteLength || 0, h = s.count, u = s.byteStride, d = new Uint8Array(a, c, l);
        return o.decodeGltfBufferAsync ? o.decodeGltfBufferAsync(h, u, d, s.mode, s.filter).then(function(f) {
          return f.buffer;
        }) : o.ready.then(function() {
          const f = new ArrayBuffer(h * u);
          return o.decodeGltfBuffer(new Uint8Array(f), h, u, d, s.mode, s.filter), f;
        });
      });
    } else
      return null;
  }
}
class hv {
  constructor(e) {
    this.name = tt.EXT_MESH_GPU_INSTANCING, this.parser = e;
  }
  createNodeMesh(e) {
    const t = this.parser.json, n = t.nodes[e];
    if (!n.extensions || !n.extensions[this.name] || n.mesh === void 0)
      return null;
    const s = t.meshes[n.mesh];
    for (const l of s.primitives)
      if (l.mode !== vn.TRIANGLES && l.mode !== vn.TRIANGLE_STRIP && l.mode !== vn.TRIANGLE_FAN && l.mode !== void 0)
        return null;
    const o = n.extensions[this.name].attributes, a = [], c = {};
    for (const l in o)
      a.push(this.parser.getDependency("accessor", o[l]).then((h) => (c[l] = h, c[l])));
    return a.length < 1 ? null : (a.push(this.parser.createNodeMesh(e)), Promise.all(a).then((l) => {
      const h = l.pop(), u = h.isGroup ? h.children : [h], d = l[0].count, f = [];
      for (const g of u) {
        const _ = new Ge(), m = new M(), p = new mn(), x = new M(1, 1, 1), y = new Yd(g.geometry, g.material, d);
        for (let v = 0; v < d; v++)
          c.TRANSLATION && m.fromBufferAttribute(c.TRANSLATION, v), c.ROTATION && p.fromBufferAttribute(c.ROTATION, v), c.SCALE && x.fromBufferAttribute(c.SCALE, v), y.setMatrixAt(v, _.compose(m, p, x));
        for (const v in c)
          if (v === "_COLOR_0") {
            const P = c[v];
            y.instanceColor = new za(P.array, P.itemSize, P.normalized);
          } else v !== "TRANSLATION" && v !== "ROTATION" && v !== "SCALE" && g.geometry.setAttribute(v, c[v]);
        wt.prototype.copy.call(y, g), this.parser.assignFinalMaterial(y), f.push(y);
      }
      return h.isGroup ? (h.clear(), h.add(...f), h) : f[0];
    }));
  }
}
const Qh = "glTF", Ys = 12, Gl = { JSON: 1313821514, BIN: 5130562 };
class uv {
  constructor(e) {
    this.name = tt.KHR_BINARY_GLTF, this.content = null, this.body = null;
    const t = new DataView(e, 0, Ys), n = new TextDecoder();
    if (this.header = {
      magic: n.decode(new Uint8Array(e.slice(0, 4))),
      version: t.getUint32(4, !0),
      length: t.getUint32(8, !0)
    }, this.header.magic !== Qh)
      throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
    if (this.header.version < 2)
      throw new Error("THREE.GLTFLoader: Legacy binary file detected.");
    const s = this.header.length - Ys, r = new DataView(e, Ys);
    let o = 0;
    for (; o < s; ) {
      const a = r.getUint32(o, !0);
      o += 4;
      const c = r.getUint32(o, !0);
      if (o += 4, c === Gl.JSON) {
        const l = new Uint8Array(e, Ys + o, a);
        this.content = n.decode(l);
      } else if (c === Gl.BIN) {
        const l = Ys + o;
        this.body = e.slice(l, l + a);
      }
      o += a;
    }
    if (this.content === null)
      throw new Error("THREE.GLTFLoader: JSON content not found.");
  }
}
class dv {
  constructor(e, t) {
    if (!t)
      throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");
    this.name = tt.KHR_DRACO_MESH_COMPRESSION, this.json = e, this.dracoLoader = t, this.dracoLoader.preload();
  }
  decodePrimitive(e, t) {
    const n = this.json, s = this.dracoLoader, r = e.extensions[this.name].bufferView, o = e.extensions[this.name].attributes, a = {}, c = {}, l = {};
    for (const h in o) {
      const u = Xa[h] || h.toLowerCase();
      a[u] = o[h];
    }
    for (const h in e.attributes) {
      const u = Xa[h] || h.toLowerCase();
      if (o[h] !== void 0) {
        const d = n.accessors[e.attributes[h]], f = ps[d.componentType];
        l[u] = f.name, c[u] = d.normalized === !0;
      }
    }
    return t.getDependency("bufferView", r).then(function(h) {
      return new Promise(function(u, d) {
        s.decodeDracoFile(h, function(f) {
          for (const g in f.attributes) {
            const _ = f.attributes[g], m = c[g];
            m !== void 0 && (_.normalized = m);
          }
          u(f);
        }, a, l, sn, d);
      });
    });
  }
}
class fv {
  constructor() {
    this.name = tt.KHR_TEXTURE_TRANSFORM;
  }
  extendTexture(e, t) {
    return (t.texCoord === void 0 || t.texCoord === e.channel) && t.offset === void 0 && t.rotation === void 0 && t.scale === void 0 || (e = e.clone(), t.texCoord !== void 0 && (e.channel = t.texCoord), t.offset !== void 0 && e.offset.fromArray(t.offset), t.rotation !== void 0 && (e.rotation = t.rotation), t.scale !== void 0 && e.repeat.fromArray(t.scale), e.needsUpdate = !0), e;
  }
}
class pv {
  constructor() {
    this.name = tt.KHR_MESH_QUANTIZATION;
  }
}
class eu extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s);
  }
  copySampleValue_(e) {
    const t = this.resultBuffer, n = this.sampleValues, s = this.valueSize, r = e * s * 3 + s;
    for (let o = 0; o !== s; o++)
      t[o] = n[r + o];
    return t;
  }
  interpolate_(e, t, n, s) {
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = a * 2, l = a * 3, h = s - t, u = (n - t) / h, d = u * u, f = d * u, g = e * l, _ = g - l, m = -2 * f + 3 * d, p = f - d, x = 1 - m, y = p - d + u;
    for (let v = 0; v !== a; v++) {
      const P = o[_ + v + a], A = o[_ + v + c] * h, C = o[g + v + a], I = o[g + v] * h;
      r[v] = x * P + y * A + m * C + p * I;
    }
    return r;
  }
}
const mv = new mn();
class gv extends eu {
  interpolate_(e, t, n, s) {
    const r = super.interpolate_(e, t, n, s);
    return mv.fromArray(r).normalize().toArray(r), r;
  }
}
const vn = {
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6
}, ps = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
}, Wl = {
  9728: nn,
  9729: pn,
  9984: lh,
  9985: Gr,
  9986: Zs,
  9987: Jn
}, Xl = {
  33071: mi,
  33648: $r,
  10497: $t
}, Yo = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
}, Xa = {
  POSITION: "position",
  NORMAL: "normal",
  TANGENT: "tangent",
  TEXCOORD_0: "uv",
  TEXCOORD_1: "uv1",
  TEXCOORD_2: "uv2",
  TEXCOORD_3: "uv3",
  COLOR_0: "color",
  WEIGHTS_0: "skinWeight",
  JOINTS_0: "skinIndex"
}, ui = {
  scale: "scale",
  translation: "position",
  rotation: "quaternion",
  weights: "morphTargetInfluences"
}, _v = {
  CUBICSPLINE: void 0,
  // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
  // keyframe track will be initialized with a default interpolation type, then modified.
  LINEAR: rr,
  STEP: sr
}, Ko = {
  OPAQUE: "OPAQUE",
  MASK: "MASK",
  BLEND: "BLEND"
};
function vv(i) {
  return i.DefaultMaterial === void 0 && (i.DefaultMaterial = new se({
    color: 16777215,
    emissive: 0,
    metalness: 1,
    roughness: 1,
    transparent: !1,
    depthTest: !0,
    side: ti
  })), i.DefaultMaterial;
}
function Ci(i, e, t) {
  for (const n in t.extensions)
    i[n] === void 0 && (e.userData.gltfExtensions = e.userData.gltfExtensions || {}, e.userData.gltfExtensions[n] = t.extensions[n]);
}
function $n(i, e) {
  e.extras !== void 0 && (typeof e.extras == "object" ? Object.assign(i.userData, e.extras) : console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, " + e.extras));
}
function xv(i, e, t) {
  let n = !1, s = !1, r = !1;
  for (let l = 0, h = e.length; l < h; l++) {
    const u = e[l];
    if (u.POSITION !== void 0 && (n = !0), u.NORMAL !== void 0 && (s = !0), u.COLOR_0 !== void 0 && (r = !0), n && s && r) break;
  }
  if (!n && !s && !r) return Promise.resolve(i);
  const o = [], a = [], c = [];
  for (let l = 0, h = e.length; l < h; l++) {
    const u = e[l];
    if (n) {
      const d = u.POSITION !== void 0 ? t.getDependency("accessor", u.POSITION) : i.attributes.position;
      o.push(d);
    }
    if (s) {
      const d = u.NORMAL !== void 0 ? t.getDependency("accessor", u.NORMAL) : i.attributes.normal;
      a.push(d);
    }
    if (r) {
      const d = u.COLOR_0 !== void 0 ? t.getDependency("accessor", u.COLOR_0) : i.attributes.color;
      c.push(d);
    }
  }
  return Promise.all([
    Promise.all(o),
    Promise.all(a),
    Promise.all(c)
  ]).then(function(l) {
    const h = l[0], u = l[1], d = l[2];
    return n && (i.morphAttributes.position = h), s && (i.morphAttributes.normal = u), r && (i.morphAttributes.color = d), i.morphTargetsRelative = !0, i;
  });
}
function yv(i, e) {
  if (i.updateMorphTargets(), e.weights !== void 0)
    for (let t = 0, n = e.weights.length; t < n; t++)
      i.morphTargetInfluences[t] = e.weights[t];
  if (e.extras && Array.isArray(e.extras.targetNames)) {
    const t = e.extras.targetNames;
    if (i.morphTargetInfluences.length === t.length) {
      i.morphTargetDictionary = {};
      for (let n = 0, s = t.length; n < s; n++)
        i.morphTargetDictionary[t[n]] = n;
    } else
      console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.");
  }
}
function Sv(i) {
  let e;
  const t = i.extensions && i.extensions[tt.KHR_DRACO_MESH_COMPRESSION];
  if (t ? e = "draco:" + t.bufferView + ":" + t.indices + ":" + jo(t.attributes) : e = i.indices + ":" + jo(i.attributes) + ":" + i.mode, i.targets !== void 0)
    for (let n = 0, s = i.targets.length; n < s; n++)
      e += ":" + jo(i.targets[n]);
  return e;
}
function jo(i) {
  let e = "";
  const t = Object.keys(i).sort();
  for (let n = 0, s = t.length; n < s; n++)
    e += t[n] + ":" + i[t[n]] + ";";
  return e;
}
function qa(i) {
  switch (i) {
    case Int8Array:
      return 1 / 127;
    case Uint8Array:
      return 1 / 255;
    case Int16Array:
      return 1 / 32767;
    case Uint16Array:
      return 1 / 65535;
    default:
      throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.");
  }
}
function bv(i) {
  return i.search(/\.jpe?g($|\?)/i) > 0 || i.search(/^data\:image\/jpeg/) === 0 ? "image/jpeg" : i.search(/\.webp($|\?)/i) > 0 || i.search(/^data\:image\/webp/) === 0 ? "image/webp" : i.search(/\.ktx2($|\?)/i) > 0 || i.search(/^data\:image\/ktx2/) === 0 ? "image/ktx2" : "image/png";
}
const wv = new Ge();
class Ev {
  constructor(e = {}, t = {}) {
    this.json = e, this.extensions = {}, this.plugins = {}, this.options = t, this.cache = new q_(), this.associations = /* @__PURE__ */ new Map(), this.primitiveCache = {}, this.nodeCache = {}, this.meshCache = { refs: {}, uses: {} }, this.cameraCache = { refs: {}, uses: {} }, this.lightCache = { refs: {}, uses: {} }, this.sourceCache = {}, this.textureCache = {}, this.nodeNamesUsed = {};
    let n = !1, s = -1, r = !1, o = -1;
    if (typeof navigator < "u") {
      const a = navigator.userAgent;
      n = /^((?!chrome|android).)*safari/i.test(a) === !0;
      const c = a.match(/Version\/(\d+)/);
      s = n && c ? parseInt(c[1], 10) : -1, r = a.indexOf("Firefox") > -1, o = r ? a.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }
    typeof createImageBitmap > "u" || n && s < 17 || r && o < 98 ? this.textureLoader = new Tf(this.options.manager) : this.textureLoader = new If(this.options.manager), this.textureLoader.setCrossOrigin(this.options.crossOrigin), this.textureLoader.setRequestHeader(this.options.requestHeader), this.fileLoader = new qh(this.options.manager), this.fileLoader.setResponseType("arraybuffer"), this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(!0);
  }
  setExtensions(e) {
    this.extensions = e;
  }
  setPlugins(e) {
    this.plugins = e;
  }
  parse(e, t) {
    const n = this, s = this.json, r = this.extensions;
    this.cache.removeAll(), this.nodeCache = {}, this._invokeAll(function(o) {
      return o._markDefs && o._markDefs();
    }), Promise.all(this._invokeAll(function(o) {
      return o.beforeRoot && o.beforeRoot();
    })).then(function() {
      return Promise.all([
        n.getDependencies("scene"),
        n.getDependencies("animation"),
        n.getDependencies("camera")
      ]);
    }).then(function(o) {
      const a = {
        scene: o[0][s.scene || 0],
        scenes: o[0],
        animations: o[1],
        cameras: o[2],
        asset: s.asset,
        parser: n,
        userData: {}
      };
      return Ci(r, a, s), $n(a, s), Promise.all(n._invokeAll(function(c) {
        return c.afterRoot && c.afterRoot(a);
      })).then(function() {
        for (const c of a.scenes)
          c.updateMatrixWorld();
        e(a);
      });
    }).catch(t);
  }
  /**
   * Marks the special nodes/meshes in json for efficient parse.
   */
  _markDefs() {
    const e = this.json.nodes || [], t = this.json.skins || [], n = this.json.meshes || [];
    for (let s = 0, r = t.length; s < r; s++) {
      const o = t[s].joints;
      for (let a = 0, c = o.length; a < c; a++)
        e[o[a]].isBone = !0;
    }
    for (let s = 0, r = e.length; s < r; s++) {
      const o = e[s];
      o.mesh !== void 0 && (this._addNodeRef(this.meshCache, o.mesh), o.skin !== void 0 && (n[o.mesh].isSkinnedMesh = !0)), o.camera !== void 0 && this._addNodeRef(this.cameraCache, o.camera);
    }
  }
  /**
   * Counts references to shared node / Object3D resources. These resources
   * can be reused, or "instantiated", at multiple nodes in the scene
   * hierarchy. Mesh, Camera, and Light instances are instantiated and must
   * be marked. Non-scenegraph resources (like Materials, Geometries, and
   * Textures) can be reused directly and are not marked here.
   *
   * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
   *
   * @param {Object} cache
   * @param {Object3D} index
   */
  _addNodeRef(e, t) {
    t !== void 0 && (e.refs[t] === void 0 && (e.refs[t] = e.uses[t] = 0), e.refs[t]++);
  }
  /**
   * Returns a reference to a shared resource, cloning it if necessary.
   *
   * @param {Object} cache
   * @param {Number} index
   * @param {Object} object
   * @return {Object}
   */
  _getNodeRef(e, t, n) {
    if (e.refs[t] <= 1) return n;
    const s = n.clone(), r = (o, a) => {
      const c = this.associations.get(o);
      c != null && this.associations.set(a, c);
      for (const [l, h] of o.children.entries())
        r(h, a.children[l]);
    };
    return r(n, s), s.name += "_instance_" + e.uses[t]++, s;
  }
  _invokeOne(e) {
    const t = Object.values(this.plugins);
    t.push(this);
    for (let n = 0; n < t.length; n++) {
      const s = e(t[n]);
      if (s) return s;
    }
    return null;
  }
  _invokeAll(e) {
    const t = Object.values(this.plugins);
    t.unshift(this);
    const n = [];
    for (let s = 0; s < t.length; s++) {
      const r = e(t[s]);
      r && n.push(r);
    }
    return n;
  }
  /**
   * Requests the specified dependency asynchronously, with caching.
   * @param {string} type
   * @param {number} index
   * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
   */
  getDependency(e, t) {
    const n = e + ":" + t;
    let s = this.cache.get(n);
    if (!s) {
      switch (e) {
        case "scene":
          s = this.loadScene(t);
          break;
        case "node":
          s = this._invokeOne(function(r) {
            return r.loadNode && r.loadNode(t);
          });
          break;
        case "mesh":
          s = this._invokeOne(function(r) {
            return r.loadMesh && r.loadMesh(t);
          });
          break;
        case "accessor":
          s = this.loadAccessor(t);
          break;
        case "bufferView":
          s = this._invokeOne(function(r) {
            return r.loadBufferView && r.loadBufferView(t);
          });
          break;
        case "buffer":
          s = this.loadBuffer(t);
          break;
        case "material":
          s = this._invokeOne(function(r) {
            return r.loadMaterial && r.loadMaterial(t);
          });
          break;
        case "texture":
          s = this._invokeOne(function(r) {
            return r.loadTexture && r.loadTexture(t);
          });
          break;
        case "skin":
          s = this.loadSkin(t);
          break;
        case "animation":
          s = this._invokeOne(function(r) {
            return r.loadAnimation && r.loadAnimation(t);
          });
          break;
        case "camera":
          s = this.loadCamera(t);
          break;
        default:
          if (s = this._invokeOne(function(r) {
            return r != this && r.getDependency && r.getDependency(e, t);
          }), !s)
            throw new Error("Unknown type: " + e);
          break;
      }
      this.cache.add(n, s);
    }
    return s;
  }
  /**
   * Requests all dependencies of the specified type asynchronously, with caching.
   * @param {string} type
   * @return {Promise<Array<Object>>}
   */
  getDependencies(e) {
    let t = this.cache.get(e);
    if (!t) {
      const n = this, s = this.json[e + (e === "mesh" ? "es" : "s")] || [];
      t = Promise.all(s.map(function(r, o) {
        return n.getDependency(e, o);
      })), this.cache.add(e, t);
    }
    return t;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBuffer(e) {
    const t = this.json.buffers[e], n = this.fileLoader;
    if (t.type && t.type !== "arraybuffer")
      throw new Error("THREE.GLTFLoader: " + t.type + " buffer type is not supported.");
    if (t.uri === void 0 && e === 0)
      return Promise.resolve(this.extensions[tt.KHR_BINARY_GLTF].body);
    const s = this.options;
    return new Promise(function(r, o) {
      n.load(nr.resolveURL(t.uri, s.path), r, void 0, function() {
        o(new Error('THREE.GLTFLoader: Failed to load buffer "' + t.uri + '".'));
      });
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferViewIndex
   * @return {Promise<ArrayBuffer>}
   */
  loadBufferView(e) {
    const t = this.json.bufferViews[e];
    return this.getDependency("buffer", t.buffer).then(function(n) {
      const s = t.byteLength || 0, r = t.byteOffset || 0;
      return n.slice(r, r + s);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
   * @param {number} accessorIndex
   * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
   */
  loadAccessor(e) {
    const t = this, n = this.json, s = this.json.accessors[e];
    if (s.bufferView === void 0 && s.sparse === void 0) {
      const o = Yo[s.type], a = ps[s.componentType], c = s.normalized === !0, l = new a(s.count * o);
      return Promise.resolve(new Vt(l, o, c));
    }
    const r = [];
    return s.bufferView !== void 0 ? r.push(this.getDependency("bufferView", s.bufferView)) : r.push(null), s.sparse !== void 0 && (r.push(this.getDependency("bufferView", s.sparse.indices.bufferView)), r.push(this.getDependency("bufferView", s.sparse.values.bufferView))), Promise.all(r).then(function(o) {
      const a = o[0], c = Yo[s.type], l = ps[s.componentType], h = l.BYTES_PER_ELEMENT, u = h * c, d = s.byteOffset || 0, f = s.bufferView !== void 0 ? n.bufferViews[s.bufferView].byteStride : void 0, g = s.normalized === !0;
      let _, m;
      if (f && f !== u) {
        const p = Math.floor(d / f), x = "InterleavedBuffer:" + s.bufferView + ":" + s.componentType + ":" + p + ":" + s.count;
        let y = t.cache.get(x);
        y || (_ = new l(a, p * f, s.count * f / h), y = new Vd(_, f / h), t.cache.add(x, y)), m = new ic(y, c, d % f / h, g);
      } else
        a === null ? _ = new l(s.count * c) : _ = new l(a, d, s.count * c), m = new Vt(_, c, g);
      if (s.sparse !== void 0) {
        const p = Yo.SCALAR, x = ps[s.sparse.indices.componentType], y = s.sparse.indices.byteOffset || 0, v = s.sparse.values.byteOffset || 0, P = new x(o[1], y, s.sparse.count * p), A = new l(o[2], v, s.sparse.count * c);
        a !== null && (m = new Vt(m.array.slice(), m.itemSize, m.normalized)), m.normalized = !1;
        for (let C = 0, I = P.length; C < I; C++) {
          const w = P[C];
          if (m.setX(w, A[C * c]), c >= 2 && m.setY(w, A[C * c + 1]), c >= 3 && m.setZ(w, A[C * c + 2]), c >= 4 && m.setW(w, A[C * c + 3]), c >= 5) throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.");
        }
        m.normalized = g;
      }
      return m;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
   * @param {number} textureIndex
   * @return {Promise<THREE.Texture|null>}
   */
  loadTexture(e) {
    const t = this.json, n = this.options, r = t.textures[e].source, o = t.images[r];
    let a = this.textureLoader;
    if (o.uri) {
      const c = n.manager.getHandler(o.uri);
      c !== null && (a = c);
    }
    return this.loadTextureImage(e, r, a);
  }
  loadTextureImage(e, t, n) {
    const s = this, r = this.json, o = r.textures[e], a = r.images[t], c = (a.uri || a.bufferView) + ":" + o.sampler;
    if (this.textureCache[c])
      return this.textureCache[c];
    const l = this.loadImageSource(t, n).then(function(h) {
      h.flipY = !1, h.name = o.name || a.name || "", h.name === "" && typeof a.uri == "string" && a.uri.startsWith("data:image/") === !1 && (h.name = a.uri);
      const d = (r.samplers || {})[o.sampler] || {};
      return h.magFilter = Wl[d.magFilter] || pn, h.minFilter = Wl[d.minFilter] || Jn, h.wrapS = Xl[d.wrapS] || $t, h.wrapT = Xl[d.wrapT] || $t, h.generateMipmaps = !h.isCompressedTexture && h.minFilter !== nn && h.minFilter !== pn, s.associations.set(h, { textures: e }), h;
    }).catch(function() {
      return null;
    });
    return this.textureCache[c] = l, l;
  }
  loadImageSource(e, t) {
    const n = this, s = this.json, r = this.options;
    if (this.sourceCache[e] !== void 0)
      return this.sourceCache[e].then((u) => u.clone());
    const o = s.images[e], a = self.URL || self.webkitURL;
    let c = o.uri || "", l = !1;
    if (o.bufferView !== void 0)
      c = n.getDependency("bufferView", o.bufferView).then(function(u) {
        l = !0;
        const d = new Blob([u], { type: o.mimeType });
        return c = a.createObjectURL(d), c;
      });
    else if (o.uri === void 0)
      throw new Error("THREE.GLTFLoader: Image " + e + " is missing URI and bufferView");
    const h = Promise.resolve(c).then(function(u) {
      return new Promise(function(d, f) {
        let g = d;
        t.isImageBitmapLoader === !0 && (g = function(_) {
          const m = new Ut(_);
          m.needsUpdate = !0, d(m);
        }), t.load(nr.resolveURL(u, r.path), g, void 0, f);
      });
    }).then(function(u) {
      return l === !0 && a.revokeObjectURL(c), $n(u, o), u.userData.mimeType = o.mimeType || bv(o.uri), u;
    }).catch(function(u) {
      throw console.error("THREE.GLTFLoader: Couldn't load texture", c), u;
    });
    return this.sourceCache[e] = h, h;
  }
  /**
   * Asynchronously assigns a texture to the given material parameters.
   *
   * @param {Object} materialParams
   * @param {string} mapName
   * @param {Object} mapDef
   * @param {string} colorSpace
   * @return {Promise<Texture>}
   */
  assignTexture(e, t, n, s) {
    const r = this;
    return this.getDependency("texture", n.index).then(function(o) {
      if (!o) return null;
      if (n.texCoord !== void 0 && n.texCoord > 0 && (o = o.clone(), o.channel = n.texCoord), r.extensions[tt.KHR_TEXTURE_TRANSFORM]) {
        const a = n.extensions !== void 0 ? n.extensions[tt.KHR_TEXTURE_TRANSFORM] : void 0;
        if (a) {
          const c = r.associations.get(o);
          o = r.extensions[tt.KHR_TEXTURE_TRANSFORM].extendTexture(o, a), r.associations.set(o, c);
        }
      }
      return s !== void 0 && (o.colorSpace = s), e[t] = o, o;
    });
  }
  /**
   * Assigns final material to a Mesh, Line, or Points instance. The instance
   * already has a material (generated from the glTF material options alone)
   * but reuse of the same glTF material may require multiple threejs materials
   * to accommodate different primitive types, defines, etc. New materials will
   * be created if necessary, and reused from a cache.
   * @param  {Object3D} mesh Mesh, Line, or Points instance.
   */
  assignFinalMaterial(e) {
    const t = e.geometry;
    let n = e.material;
    const s = t.attributes.tangent === void 0, r = t.attributes.color !== void 0, o = t.attributes.normal === void 0;
    if (e.isPoints) {
      const a = "PointsMaterial:" + n.uuid;
      let c = this.cache.get(a);
      c || (c = new Uh(), Fn.prototype.copy.call(c, n), c.color.copy(n.color), c.map = n.map, c.sizeAttenuation = !1, this.cache.add(a, c)), n = c;
    } else if (e.isLine) {
      const a = "LineBasicMaterial:" + n.uuid;
      let c = this.cache.get(a);
      c || (c = new Nh(), Fn.prototype.copy.call(c, n), c.color.copy(n.color), c.map = n.map, this.cache.add(a, c)), n = c;
    }
    if (s || r || o) {
      let a = "ClonedMaterial:" + n.uuid + ":";
      s && (a += "derivative-tangents:"), r && (a += "vertex-colors:"), o && (a += "flat-shading:");
      let c = this.cache.get(a);
      c || (c = n.clone(), r && (c.vertexColors = !0), o && (c.flatShading = !0), s && (c.normalScale && (c.normalScale.y *= -1), c.clearcoatNormalScale && (c.clearcoatNormalScale.y *= -1)), this.cache.add(a, c), this.associations.set(c, this.associations.get(n))), n = c;
    }
    e.material = n;
  }
  getMaterialType() {
    return se;
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
   * @param {number} materialIndex
   * @return {Promise<Material>}
   */
  loadMaterial(e) {
    const t = this, n = this.json, s = this.extensions, r = n.materials[e];
    let o;
    const a = {}, c = r.extensions || {}, l = [];
    if (c[tt.KHR_MATERIALS_UNLIT]) {
      const u = s[tt.KHR_MATERIALS_UNLIT];
      o = u.getMaterialType(), l.push(u.extendParams(a, r, t));
    } else {
      const u = r.pbrMetallicRoughness || {};
      if (a.color = new Ie(1, 1, 1), a.opacity = 1, Array.isArray(u.baseColorFactor)) {
        const d = u.baseColorFactor;
        a.color.setRGB(d[0], d[1], d[2], sn), a.opacity = d[3];
      }
      u.baseColorTexture !== void 0 && l.push(t.assignTexture(a, "map", u.baseColorTexture, Nt)), a.metalness = u.metallicFactor !== void 0 ? u.metallicFactor : 1, a.roughness = u.roughnessFactor !== void 0 ? u.roughnessFactor : 1, u.metallicRoughnessTexture !== void 0 && (l.push(t.assignTexture(a, "metalnessMap", u.metallicRoughnessTexture)), l.push(t.assignTexture(a, "roughnessMap", u.metallicRoughnessTexture))), o = this._invokeOne(function(d) {
        return d.getMaterialType && d.getMaterialType(e);
      }), l.push(Promise.all(this._invokeAll(function(d) {
        return d.extendMaterialParams && d.extendMaterialParams(e, a);
      })));
    }
    r.doubleSided === !0 && (a.side = Zt);
    const h = r.alphaMode || Ko.OPAQUE;
    if (h === Ko.BLEND ? (a.transparent = !0, a.depthWrite = !1) : (a.transparent = !1, h === Ko.MASK && (a.alphaTest = r.alphaCutoff !== void 0 ? r.alphaCutoff : 0.5)), r.normalTexture !== void 0 && o !== gi && (l.push(t.assignTexture(a, "normalMap", r.normalTexture)), a.normalScale = new ue(1, 1), r.normalTexture.scale !== void 0)) {
      const u = r.normalTexture.scale;
      a.normalScale.set(u, u);
    }
    if (r.occlusionTexture !== void 0 && o !== gi && (l.push(t.assignTexture(a, "aoMap", r.occlusionTexture)), r.occlusionTexture.strength !== void 0 && (a.aoMapIntensity = r.occlusionTexture.strength)), r.emissiveFactor !== void 0 && o !== gi) {
      const u = r.emissiveFactor;
      a.emissive = new Ie().setRGB(u[0], u[1], u[2], sn);
    }
    return r.emissiveTexture !== void 0 && o !== gi && l.push(t.assignTexture(a, "emissiveMap", r.emissiveTexture, Nt)), Promise.all(l).then(function() {
      const u = new o(a);
      return r.name && (u.name = r.name), $n(u, r), t.associations.set(u, { materials: e }), r.extensions && Ci(s, u, r), u;
    });
  }
  /**
   * When Object3D instances are targeted by animation, they need unique names.
   *
   * @param {String} originalName
   * @return {String}
   */
  createUniqueName(e) {
    const t = pt.sanitizeNodeName(e || "");
    return t in this.nodeNamesUsed ? t + "_" + ++this.nodeNamesUsed[t] : (this.nodeNamesUsed[t] = 0, t);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
   *
   * Creates BufferGeometries from primitives.
   *
   * @param {Array<GLTF.Primitive>} primitives
   * @return {Promise<Array<BufferGeometry>>}
   */
  loadGeometries(e) {
    const t = this, n = this.extensions, s = this.primitiveCache;
    function r(a) {
      return n[tt.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a, t).then(function(c) {
        return ql(c, a, t);
      });
    }
    const o = [];
    for (let a = 0, c = e.length; a < c; a++) {
      const l = e[a], h = Sv(l), u = s[h];
      if (u)
        o.push(u.promise);
      else {
        let d;
        l.extensions && l.extensions[tt.KHR_DRACO_MESH_COMPRESSION] ? d = r(l) : d = ql(new Bt(), l, t), s[h] = { primitive: l, promise: d }, o.push(d);
      }
    }
    return Promise.all(o);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
   * @param {number} meshIndex
   * @return {Promise<Group|Mesh|SkinnedMesh>}
   */
  loadMesh(e) {
    const t = this, n = this.json, s = this.extensions, r = n.meshes[e], o = r.primitives, a = [];
    for (let c = 0, l = o.length; c < l; c++) {
      const h = o[c].material === void 0 ? vv(this.cache) : this.getDependency("material", o[c].material);
      a.push(h);
    }
    return a.push(t.loadGeometries(o)), Promise.all(a).then(function(c) {
      const l = c.slice(0, c.length - 1), h = c[c.length - 1], u = [];
      for (let f = 0, g = h.length; f < g; f++) {
        const _ = h[f], m = o[f];
        let p;
        const x = l[f];
        if (m.mode === vn.TRIANGLES || m.mode === vn.TRIANGLE_STRIP || m.mode === vn.TRIANGLE_FAN || m.mode === void 0)
          p = r.isSkinnedMesh === !0 ? new Wd(_, x) : new oe(_, x), p.isSkinnedMesh === !0 && p.normalizeSkinWeights(), m.mode === vn.TRIANGLE_STRIP ? p.geometry = Vl(p.geometry, xh) : m.mode === vn.TRIANGLE_FAN && (p.geometry = Vl(p.geometry, Ba));
        else if (m.mode === vn.LINES)
          p = new Zd(_, x);
        else if (m.mode === vn.LINE_STRIP)
          p = new oc(_, x);
        else if (m.mode === vn.LINE_LOOP)
          p = new $d(_, x);
        else if (m.mode === vn.POINTS)
          p = new Jd(_, x);
        else
          throw new Error("THREE.GLTFLoader: Primitive mode unsupported: " + m.mode);
        Object.keys(p.geometry.morphAttributes).length > 0 && yv(p, r), p.name = t.createUniqueName(r.name || "mesh_" + e), $n(p, r), m.extensions && Ci(s, p, m), t.assignFinalMaterial(p), u.push(p);
      }
      for (let f = 0, g = u.length; f < g; f++)
        t.associations.set(u[f], {
          meshes: e,
          primitives: f
        });
      if (u.length === 1)
        return r.extensions && Ci(s, u[0], r), u[0];
      const d = new ye();
      r.extensions && Ci(s, d, r), t.associations.set(d, { meshes: e });
      for (let f = 0, g = u.length; f < g; f++)
        d.add(u[f]);
      return d;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
   * @param {number} cameraIndex
   * @return {Promise<THREE.Camera>}
   */
  loadCamera(e) {
    let t;
    const n = this.json.cameras[e], s = n[n.type];
    if (!s) {
      console.warn("THREE.GLTFLoader: Missing camera parameters.");
      return;
    }
    return n.type === "perspective" ? t = new en(as.radToDeg(s.yfov), s.aspectRatio || 1, s.znear || 1, s.zfar || 2e6) : n.type === "orthographic" && (t = new gc(-s.xmag, s.xmag, s.ymag, -s.ymag, s.znear, s.zfar)), n.name && (t.name = this.createUniqueName(n.name)), $n(t, n), Promise.resolve(t);
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
   * @param {number} skinIndex
   * @return {Promise<Skeleton>}
   */
  loadSkin(e) {
    const t = this.json.skins[e], n = [];
    for (let s = 0, r = t.joints.length; s < r; s++)
      n.push(this._loadNodeShallow(t.joints[s]));
    return t.inverseBindMatrices !== void 0 ? n.push(this.getDependency("accessor", t.inverseBindMatrices)) : n.push(null), Promise.all(n).then(function(s) {
      const r = s.pop(), o = s, a = [], c = [];
      for (let l = 0, h = o.length; l < h; l++) {
        const u = o[l];
        if (u) {
          a.push(u);
          const d = new Ge();
          r !== null && d.fromArray(r.array, l * 16), c.push(d);
        } else
          console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', t.joints[l]);
      }
      return new sc(a, c);
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
   * @param {number} animationIndex
   * @return {Promise<AnimationClip>}
   */
  loadAnimation(e) {
    const t = this.json, n = this, s = t.animations[e], r = s.name ? s.name : "animation_" + e, o = [], a = [], c = [], l = [], h = [];
    for (let u = 0, d = s.channels.length; u < d; u++) {
      const f = s.channels[u], g = s.samplers[f.sampler], _ = f.target, m = _.node, p = s.parameters !== void 0 ? s.parameters[g.input] : g.input, x = s.parameters !== void 0 ? s.parameters[g.output] : g.output;
      _.node !== void 0 && (o.push(this.getDependency("node", m)), a.push(this.getDependency("accessor", p)), c.push(this.getDependency("accessor", x)), l.push(g), h.push(_));
    }
    return Promise.all([
      Promise.all(o),
      Promise.all(a),
      Promise.all(c),
      Promise.all(l),
      Promise.all(h)
    ]).then(function(u) {
      const d = u[0], f = u[1], g = u[2], _ = u[3], m = u[4], p = [];
      for (let x = 0, y = d.length; x < y; x++) {
        const v = d[x], P = f[x], A = g[x], C = _[x], I = m[x];
        if (v === void 0) continue;
        v.updateMatrix && v.updateMatrix();
        const w = n._createAnimationTracks(v, P, A, C, I);
        if (w)
          for (let S = 0; S < w.length; S++)
            p.push(w[S]);
      }
      return new io(r, void 0, p);
    });
  }
  createNodeMesh(e) {
    const t = this.json, n = this, s = t.nodes[e];
    return s.mesh === void 0 ? null : n.getDependency("mesh", s.mesh).then(function(r) {
      const o = n._getNodeRef(n.meshCache, s.mesh, r);
      return s.weights !== void 0 && o.traverse(function(a) {
        if (a.isMesh)
          for (let c = 0, l = s.weights.length; c < l; c++)
            a.morphTargetInfluences[c] = s.weights[c];
      }), o;
    });
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
   * @param {number} nodeIndex
   * @return {Promise<Object3D>}
   */
  loadNode(e) {
    const t = this.json, n = this, s = t.nodes[e], r = n._loadNodeShallow(e), o = [], a = s.children || [];
    for (let l = 0, h = a.length; l < h; l++)
      o.push(n.getDependency("node", a[l]));
    const c = s.skin === void 0 ? Promise.resolve(null) : n.getDependency("skin", s.skin);
    return Promise.all([
      r,
      Promise.all(o),
      c
    ]).then(function(l) {
      const h = l[0], u = l[1], d = l[2];
      d !== null && h.traverse(function(f) {
        f.isSkinnedMesh && f.bind(d, wv);
      });
      for (let f = 0, g = u.length; f < g; f++)
        h.add(u[f]);
      return h;
    });
  }
  // ._loadNodeShallow() parses a single node.
  // skin and child nodes are created and added in .loadNode() (no '_' prefix).
  _loadNodeShallow(e) {
    const t = this.json, n = this.extensions, s = this;
    if (this.nodeCache[e] !== void 0)
      return this.nodeCache[e];
    const r = t.nodes[e], o = r.name ? s.createUniqueName(r.name) : "", a = [], c = s._invokeOne(function(l) {
      return l.createNodeMesh && l.createNodeMesh(e);
    });
    return c && a.push(c), r.camera !== void 0 && a.push(s.getDependency("camera", r.camera).then(function(l) {
      return s._getNodeRef(s.cameraCache, r.camera, l);
    })), s._invokeAll(function(l) {
      return l.createNodeAttachment && l.createNodeAttachment(e);
    }).forEach(function(l) {
      a.push(l);
    }), this.nodeCache[e] = Promise.all(a).then(function(l) {
      let h;
      if (r.isBone === !0 ? h = new Lh() : l.length > 1 ? h = new ye() : l.length === 1 ? h = l[0] : h = new wt(), h !== l[0])
        for (let u = 0, d = l.length; u < d; u++)
          h.add(l[u]);
      if (r.name && (h.userData.name = r.name, h.name = o), $n(h, r), r.extensions && Ci(n, h, r), r.matrix !== void 0) {
        const u = new Ge();
        u.fromArray(r.matrix), h.applyMatrix4(u);
      } else
        r.translation !== void 0 && h.position.fromArray(r.translation), r.rotation !== void 0 && h.quaternion.fromArray(r.rotation), r.scale !== void 0 && h.scale.fromArray(r.scale);
      return s.associations.has(h) || s.associations.set(h, {}), s.associations.get(h).nodes = e, h;
    }), this.nodeCache[e];
  }
  /**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
   * @param {number} sceneIndex
   * @return {Promise<Group>}
   */
  loadScene(e) {
    const t = this.extensions, n = this.json.scenes[e], s = this, r = new ye();
    n.name && (r.name = s.createUniqueName(n.name)), $n(r, n), n.extensions && Ci(t, r, n);
    const o = n.nodes || [], a = [];
    for (let c = 0, l = o.length; c < l; c++)
      a.push(s.getDependency("node", o[c]));
    return Promise.all(a).then(function(c) {
      for (let h = 0, u = c.length; h < u; h++)
        r.add(c[h]);
      const l = (h) => {
        const u = /* @__PURE__ */ new Map();
        for (const [d, f] of s.associations)
          (d instanceof Fn || d instanceof Ut) && u.set(d, f);
        return h.traverse((d) => {
          const f = s.associations.get(d);
          f != null && u.set(d, f);
        }), u;
      };
      return s.associations = l(r), r;
    });
  }
  _createAnimationTracks(e, t, n, s, r) {
    const o = [], a = e.name ? e.name : e.uuid, c = [];
    ui[r.path] === ui.weights ? e.traverse(function(d) {
      d.morphTargetInfluences && c.push(d.name ? d.name : d.uuid);
    }) : c.push(a);
    let l;
    switch (ui[r.path]) {
      case ui.weights:
        l = bs;
        break;
      case ui.rotation:
        l = Fi;
        break;
      case ui.position:
      case ui.scale:
        l = ws;
        break;
      default:
        switch (n.itemSize) {
          case 1:
            l = bs;
            break;
          case 2:
          case 3:
          default:
            l = ws;
            break;
        }
        break;
    }
    const h = s.interpolation !== void 0 ? _v[s.interpolation] : rr, u = this._getArrayFromAccessor(n);
    for (let d = 0, f = c.length; d < f; d++) {
      const g = new l(
        c[d] + "." + ui[r.path],
        t.array,
        u,
        h
      );
      s.interpolation === "CUBICSPLINE" && this._createCubicSplineTrackInterpolant(g), o.push(g);
    }
    return o;
  }
  _getArrayFromAccessor(e) {
    let t = e.array;
    if (e.normalized) {
      const n = qa(t.constructor), s = new Float32Array(t.length);
      for (let r = 0, o = t.length; r < o; r++)
        s[r] = t[r] * n;
      t = s;
    }
    return t;
  }
  _createCubicSplineTrackInterpolant(e) {
    e.createInterpolant = function(n) {
      const s = this instanceof Fi ? gv : eu;
      return new s(this.times, this.values, this.getValueSize() / 3, n);
    }, e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0;
  }
}
function Mv(i, e, t) {
  const n = e.attributes, s = new Ln();
  if (n.POSITION !== void 0) {
    const a = t.json.accessors[n.POSITION], c = a.min, l = a.max;
    if (c !== void 0 && l !== void 0) {
      if (s.set(
        new M(c[0], c[1], c[2]),
        new M(l[0], l[1], l[2])
      ), a.normalized) {
        const h = qa(ps[a.componentType]);
        s.min.multiplyScalar(h), s.max.multiplyScalar(h);
      }
    } else {
      console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      return;
    }
  } else
    return;
  const r = e.targets;
  if (r !== void 0) {
    const a = new M(), c = new M();
    for (let l = 0, h = r.length; l < h; l++) {
      const u = r[l];
      if (u.POSITION !== void 0) {
        const d = t.json.accessors[u.POSITION], f = d.min, g = d.max;
        if (f !== void 0 && g !== void 0) {
          if (c.setX(Math.max(Math.abs(f[0]), Math.abs(g[0]))), c.setY(Math.max(Math.abs(f[1]), Math.abs(g[1]))), c.setZ(Math.max(Math.abs(f[2]), Math.abs(g[2]))), d.normalized) {
            const _ = qa(ps[d.componentType]);
            c.multiplyScalar(_);
          }
          a.max(c);
        } else
          console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");
      }
    }
    s.expandByVector(a);
  }
  i.boundingBox = s;
  const o = new Bn();
  s.getCenter(o.center), o.radius = s.min.distanceTo(s.max) / 2, i.boundingSphere = o;
}
function ql(i, e, t) {
  const n = e.attributes, s = [];
  function r(o, a) {
    return t.getDependency("accessor", o).then(function(c) {
      i.setAttribute(a, c);
    });
  }
  for (const o in n) {
    const a = Xa[o] || o.toLowerCase();
    a in i.attributes || s.push(r(n[o], a));
  }
  if (e.indices !== void 0 && !i.index) {
    const o = t.getDependency("accessor", e.indices).then(function(a) {
      i.setIndex(a);
    });
    s.push(o);
  }
  return rt.workingColorSpace !== sn && "COLOR_0" in n && console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${rt.workingColorSpace}" not supported.`), $n(i, e), Mv(i, e, t), Promise.all(s).then(function() {
    return e.targets !== void 0 ? xv(i, e.targets, t) : i;
  });
}
function zr(i) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map(), n = i.clone();
  return tu(i, n, function(s, r) {
    e.set(r, s), t.set(s, r);
  }), n.traverse(function(s) {
    if (!s.isSkinnedMesh) return;
    const r = s, o = e.get(s), a = o.skeleton.bones;
    r.skeleton = o.skeleton.clone(), r.bindMatrix.copy(o.bindMatrix), r.skeleton.bones = a.map(function(c) {
      return t.get(c);
    }), r.bind(r.skeleton, r.bindMatrix);
  }), n;
}
function tu(i, e, t) {
  t(i, e);
  for (let n = 0; n < i.children.length; n++)
    tu(i.children[n], e.children[n], t);
}
new M(0, 0, 1);
new M(0, 1, 0);
function Gt(i) {
  let e = i >>> 0;
  return () => {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hn(i, e, t) {
  const n = document.createElement("canvas");
  n.width = i, n.height = e;
  const s = n.getContext("2d");
  t(s, i, e);
  const r = new Qd(n);
  return r.colorSpace = Nt, r.anisotropy = 8, r.wrapS = $t, r.wrapT = $t, r;
}
function R(i, e, t, n) {
  const s = new oe(new mt(e[0], e[1], e[2]), n);
  return s.name = i, s.position.set(t[0], t[1], t[2]), s.castShadow = !0, s.receiveShadow = !0, s;
}
function it(i, e, t, n, s, r, o = 10) {
  const a = new oe(
    new ln(e, t, n, o),
    r
  );
  return a.name = i, a.position.set(s[0], s[1], s[2]), a.castShadow = !0, a.receiveShadow = !0, a;
}
function Tt(i, { id: e, kind: t, grounded: n = !0, assumption: s = null, gameplay: r = null }) {
  i.name = e, i.userData.assetId = e, i.userData.kind = t, i.userData.units = "meters", i.userData.front = "+Z", i.userData.grounded = n, s && (i.userData.assumption = s), r && (i.userData.gameplay = r);
  const o = new wt();
  return o.name = `${e}-front`, i.add(o), i.userData.frontMarker = o, i;
}
function It(i, e) {
  const t = i.userData.frontMarker;
  t && t.position.copy(e);
}
function Ht(i, e) {
  return i.userData.floorHardness = e, i;
}
function Rt(i) {
  i.updateMatrixWorld(!0);
  const e = new Ln().setFromObject(i);
  return i.userData.localMinY = e.min.y, i.userData.localSize = e.getSize(new M()).toArray().map((t) => Math.round(t * 100) / 100), e;
}
function nu(i, e, t, n = 20) {
  const s = [];
  for (let r = 0; r <= n; r++) {
    const o = r / n, a = new M().lerpVectors(i, e, o);
    a.y -= t * 4 * o * (1 - o), s.push(a);
  }
  return new Oh(s);
}
function Ls(i) {
  let e = 2166136261;
  for (let t = 0; t < i.length; t++)
    e ^= i.charCodeAt(t), e = Math.imul(e, 16777619);
  return e >>> 0;
}
function Es(i) {
  var r;
  i.updateMatrixWorld(!0);
  const e = /* @__PURE__ */ new Map();
  i.traverse((o) => {
    var c, l;
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.noMerge || !((l = (c = o.geometry) == null ? void 0 : c.attributes) != null && l.position)) return;
    const a = e.get(o.material);
    a ? a.push(o) : e.set(o.material, [o]);
  });
  const t = new Ge().copy(i.matrixWorld).invert(), n = new Ge();
  let s = 0;
  for (const [o, a] of e) {
    if (a.length < 2) continue;
    const c = [];
    for (const u of a) {
      const d = u.geometry.clone();
      for (const f of Object.keys(d.attributes))
        f !== "position" && f !== "normal" && f !== "uv" && d.deleteAttribute(f);
      if (d.attributes.normal || d.computeVertexNormals(), !d.attributes.uv) {
        const f = d.attributes.position.count;
        d.setAttribute("uv", new Vt(new Float32Array(f * 2), 2));
      }
      d.clearGroups(), n.multiplyMatrices(t, u.matrixWorld), d.applyMatrix4(n), c.push(d);
    }
    const l = W_(c, !1);
    if (!l) continue;
    const h = new oe(l, o);
    h.name = "merged", h.castShadow = !0, h.receiveShadow = !0, a.every((u) => u.userData.ignoreBounds) && (h.userData.ignoreBounds = !0), a.every((u) => u.castShadow === !1) && (h.castShadow = !1, h.receiveShadow = !1);
    for (const u of a)
      (r = u.parent) == null || r.remove(u), u.geometry.dispose();
    i.add(h), s += 1;
  }
  return s;
}
function Tv(i, { amount: e = 0.32, height: t = 2.4 } = {}) {
  return i.onBeforeCompile = (n) => {
    n.uniforms.grimeAmount = { value: e }, n.uniforms.grimeHeight = { value: t }, n.vertexShader = n.vertexShader.replace("#include <common>", `#include <common>
varying vec3 vGrimePos;`).replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
  vGrimePos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    ), n.fragmentShader = n.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec3 vGrimePos;
uniform float grimeAmount;
uniform float grimeHeight;
float grimeHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
    ).replace(
      "#include <map_fragment>",
      `#include <map_fragment>
        {
          vec3 wp = vGrimePos;
          float low = 1.0 - smoothstep(-0.1, grimeHeight, wp.y);
          float col = wp.x * 0.73 + wp.z * 1.31;
          float s1 = grimeHash(vec2(floor(col * 5.0), 3.0));
          float s2 = grimeHash(vec2(floor(col * 13.0), 11.0));
          float streak = smoothstep(0.42, 1.0, s1) * 0.6 + smoothstep(0.72, 1.0, s2) * 0.4;
          float fade = 1.0 - smoothstep(0.0, 8.5, wp.y);
          float g = clamp(low * 0.75 + streak * fade * 0.95, 0.0, 1.0) * grimeAmount / 0.32;
          diffuseColor.rgb *= (1.0 - g * 0.44);
          float mottle = grimeHash(vec2(floor(wp.y * 2.0), floor(col * 1.5)));
          diffuseColor.rgb *= 0.93 + mottle * 0.15;
        }`
    );
  }, i.customProgramCacheKey = () => "pass9-wall-grime", i;
}
function Ks(i, e, t, n, s, r) {
  const o = new M().subVectors(n, t), a = o.length(), c = new oe(new ln(s, s, a, 6), r);
  return c.position.copy(t).add(n).multiplyScalar(0.5), c.quaternion.setFromUnitVectors(new M(0, 1, 0), o.normalize()), c.castShadow = !0, c.name = "tube", i.add(c), c;
}
function Av(i, { r: e = 0.48, h: t = 1.15 } = {}) {
  const n = new ye();
  for (const [s, r] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]])
    n.add(R("leg", [0.05, 0.5, 0.05], [s, 0.25, r], i.metalDark));
  return n.add(it("tank", e, e, t, [0, 0.5 + t / 2, 0], i.tank, 12)), n.add(it("tank-lid", e * 0.55, e * 0.62, 0.16, [0, 0.5 + t + 0.08, 0], i.metal, 10)), n.add(R("tank-band", [e * 2.02, 0.06, e * 2.02], [0, 0.5 + t * 0.35, 0], i.metalDark)), n;
}
function Rv(i, { w: e = 1.7, h: t = 2.1, d: n = 1.6 } = {}) {
  const s = new ye();
  s.add(R("shed", [e, t, n], [0, t / 2, 0], i.vinyl));
  const r = R("shed-lid", [e + 0.1, 0.06, n + 0.1], [0, t + 0.05, 0], i.roof);
  return r.rotation.x = 0.09, s.add(r), s.add(R("shed-door", [0.62, 1.5, 0.04], [-e / 2 + 0.4, 0.76, n / 2 + 0.02], i.woodDark)), s;
}
function Cv(i, { h: e = 2.3 } = {}) {
  const t = new ye();
  t.add(it("mast", 0.025, 0.035, e, [0, e / 2, 0], i.metalDark, 6));
  for (let n = 0; n < 3; n++)
    t.add(R("cross", [0.66 - n * 0.16, 0.02, 0.02], [0, e - 0.25 - n * 0.28, 0], i.metalDark));
  return t.add(R("guy", [0.02, 0.02, 0.9], [0, e * 0.62, 0], i.metalDark)), t;
}
function Yl(i, { w: e = 0.78, h: t = 0.52, d: n = 0.34 } = {}) {
  const s = new ye();
  s.add(R("ac-body", [e, t, n], [0, 0, n / 2], i.metal)), s.add(R("ac-bracket", [e + 0.1, 0.04, n], [0, -t / 2 + 0.02, n / 2], i.metalDark));
  const r = new oe(new As(t * 0.3, 0.014, 5, 10), i.metalDark);
  r.position.set(0, 0, n + 0.01), r.name = "ac-fan", s.add(r);
  for (let o = 0; o < 3; o++)
    s.add(R("ac-slat", [e - 0.12, 0.014, 0.02], [0, -t / 2 + 0.09 + o * 0.05, n + 5e-3], i.metalDark));
  return s;
}
function Pv(i, { w: e = 1.9, d: t = 0.55 } = {}) {
  const n = new ye(), s = R("tin-sheet", [e, 0.04, t], [0, 0, t / 2], i.rust);
  s.rotation.x = -0.12, n.add(s);
  for (const r of [-1, 1])
    n.add(R("tin-bracket", [0.04, 0.3, 0.04], [r * (e / 2 - 0.08), -0.14, t * 0.55], i.metalDark));
  return n;
}
function Iv(i, { w: e = 2, d: t = 0.5 } = {}) {
  const n = new ye();
  n.add(R("balcony-floor", [e, 0.09, t], [0, -0.05, t / 2], i.concretePlain)), n.add(R("balcony-rail", [e, 0.05, 0.05], [0, 0.55, t - 0.04], i.metalDark)), n.add(R("balcony-rail-b", [e, 0.03, 0.03], [0, 0.22, t - 0.04], i.metalDark));
  for (const o of [-1, 0, 1])
    n.add(R("balcony-post", [0.035, 1, 0.035], [o * (e / 2 - 0.1), 0.5, t - 0.04], i.metalDark));
  n.add(it("laundry-pole", 0.02, 0.02, e - 0.1, [0, 0.92, t * 0.45], i.metal, 6));
  const s = n.children[n.children.length - 1];
  s.rotation.z = Math.PI / 2;
  const r = [[-0.55, 0.42, i.clothA], [0.1, 0.5, i.clothB], [0.62, 0.34, i.clothA]];
  for (const [o, a, c] of r) {
    const l = new oe(new rn(a, a * 1.15), c);
    l.position.set(o, 0.62, t * 0.45), l.name = "laundry", n.add(l);
  }
  return n;
}
function Lv(i, { w: e = 1.5, h: t = 1.15, d: n = 0.28 } = {}) {
  const s = new ye();
  s.add(R("bump", [e, t, n], [0, t / 2, n / 2], i.vinyl)), s.add(R("bump-lid", [e + 0.08, 0.12, n + 0.06], [0, t, n / 2], i.roof));
  const r = new oe(new rn(e - 0.36, t - 0.36), i.frost);
  return r.position.set(0, t / 2, n + 0.01), r.name = "bump-window", s.add(r), s;
}
function iu(i, e, t) {
  const { W: n, D: s, H: r, floors: o, groundH: a, upperH: c, zOuter: l, wallMat: h, id: u } = t, d = Gt(Ls(u)), f = (p, x) => p + d() * (x - p), g = (p) => d() < p, _ = r + 0.13;
  for (const p of [-1, 1]) {
    const x = R("edge-chamfer", [0.17, r + 0.1, 0.17], [p * (n / 2 - 0.04), r / 2, l - 0.04], h);
    x.rotation.y = Math.PI / 4, i.add(x);
  }
  const m = 3 + Math.floor(d() * 2);
  for (let p = 0; p < m; p++) {
    const x = n / m, y = -n / 2 + x * (p + 0.5);
    if (g(0.18)) continue;
    const v = f(0.02, 0.62);
    i.add(R("parapet-vary", [x - 0.06, v, 0.14], [y, r + 0.28 + v / 2, l - 0.03], h)), g(0.5) && i.add(R("coping", [x - 0.14, 0.05, 0.22], [y, r + 0.28 + v, l - 0.03], e.stone));
  }
  if (g(0.62)) {
    const p = Av(e);
    p.position.set(f(-n / 2 + 1.1, n / 2 - 1.1), _, f(-s / 2 + 1.1, s / 2 - 1.4)), i.add(p);
  }
  if (g(0.45)) {
    const p = Rv(e);
    p.position.set(f(-n / 2 + 1.2, n / 2 - 1.2), _, f(-s / 2 + 1.2, 0)), p.rotation.y = f(-0.3, 0.3), i.add(p);
  }
  if (g(0.7)) {
    const p = Cv(e);
    p.position.set(f(-n / 2 + 0.7, n / 2 - 0.7), _, f(-s / 2 + 0.8, s / 2 - 1.2)), i.add(p);
  }
  if (g(0.65)) {
    const p = 1 + Math.floor(d() * 2);
    for (let x = 0; x < p; x++) {
      const y = Yl(e, { w: 0.72, h: 0.48, d: 0.3 });
      y.position.set(f(-n / 2 + 0.9, n / 2 - 0.9), _, f(-s / 2 + 0.9, s / 2 - 1)), y.rotation.y = f(-0.4, 0.4), i.add(y);
    }
  }
  if (g(0.4)) {
    const p = R("pent-roof", [n * 0.52, 0.06, s * 0.46], [-n * 0.18, r + 0.34, -s * 0.2], e.roof);
    p.rotation.z = 0.055, i.add(p);
  }
  if (g(0.5))
    for (let p = 0; p < 2; p++)
      i.add(it("vent", 0.07, 0.08, 0.5, [f(-n / 2 + 0.8, n / 2 - 0.8), _ + 0.25, f(-s / 2 + 0.8, s / 2 - 1)], e.metalDark, 6));
  if (i.add(it("downspout-b", 0.04, 0.04, r - 0.35, [-n / 2 + 0.14, (r - 0.35) / 2, l + 0.07], e.metal, 8)), g(0.65) && (i.add(R("gas-meter", [0.4, 0.46, 0.2], [n / 2 - 1, 0.95, l + 0.1], e.metal)), i.add(it("meter-pipe", 0.03, 0.03, 0.9, [n / 2 - 1, 1.55, l + 0.06], e.metal, 6))), g(0.6)) {
    const p = a + c * Math.max(1, o - 1) - 0.7, x = it("pipe-run", 0.045, 0.045, n * 0.55, [0, Math.min(p, r - 0.6), l + 0.09], e.metal, 6);
    x.rotation.z = Math.PI / 2, i.add(x);
  }
  if (g(0.55)) {
    const p = Yl(e);
    p.position.set(f(-n / 2 + 1.1, n / 2 - 1.1), f(a + 0.6, Math.max(a + 0.7, r - 0.9)), l), i.add(p);
  }
  if (g(0.3)) {
    const p = Pv(e);
    p.position.set(f(-n / 2 + 1.3, n / 2 - 1.3), 2.42, l), i.add(p);
  }
  if (g(0.5) && o > 1) {
    const p = Iv(e, { w: f(1.6, 2.2) });
    p.position.set(f(-n / 2 + 1.4, n / 2 - 1.4), a + 0.06, l), i.add(p);
  } else if (g(0.5) && o > 1) {
    const p = Lv(e, { w: f(1.2, 1.7) });
    p.position.set(f(-n / 2 + 1.2, n / 2 - 1.2), a + 0.5, l), i.add(p);
  }
  if (g(0.35)) {
    const p = new oe(new mt(0.07, 1.15, 0.42), [e.vinyl, e.vinyl, e.metalDark, e.metalDark, e.metalDark, e.metalDark]);
    p.name = "projecting-sign", p.position.set(-n / 2 + 0.55, Math.min(r - 0.9, 4.3), l + 0.24), p.castShadow = !0, i.add(p), i.add(R("sign-arm", [0.06, 0.06, 0.3], [-n / 2 + 0.55, Math.min(r - 0.9, 4.3) + 0.7, l + 0.14], e.metalDark));
  }
  if (g(0.5)) {
    const p = f(-n / 2 + 1, n / 2 - 1);
    i.add(R("sill-box", [0.5, 0.16, 0.2], [p, a + 0.72, l + 0.12], e.soil));
    for (let x = 0; x < 3; x++) {
      const y = new oe(new Ts(0.1, 0), e.leafA);
      y.position.set(p - 0.15 + x * 0.15, a + 0.87, l + 0.12), y.name = "sill-leaf", i.add(y);
    }
  }
}
function jn(i, { w: e = 0.5, h: t = 0.42, d: n = 0.4, mat: s = i.bagDark } = {}) {
  const r = new ye(), o = new oe(new In(1, 8, 6), s);
  return o.scale.set(e / 2, t / 2, n / 2), o.position.y = t / 2, o.name = "bag", o.castShadow = !0, r.add(o), r.add(it("bag-tie", 0.05, 0.07, 0.09, [0, t - 0.01, 0], s, 6)), r;
}
function es(i, { r: e = 0.17, h: t = 0.33, mat: n = i.plasticBlue } = {}) {
  const s = new ye();
  return s.add(it("bucket", e, e * 0.82, t, [0, t / 2, 0], n, 10)), s.add(it("bucket-rim", e * 1.05, e * 1.05, 0.03, [0, t, 0], n, 10)), s;
}
function ts(i, { mat: e = i.plasticYellow, w: t = 0.42, h: n = 0.27, d: s = 0.3 } = {}) {
  const r = new ye();
  return r.add(R("crate-body", [t, n, s], [0, n / 2, 0], e)), r.add(R("crate-lip", [t + 0.02, 0.03, s + 0.02], [0, n - 0.01, 0], i.woodDark)), r;
}
function Hr(i, { r: e = 0.16, h: t = 0.28, leaf: n = i.leafB } = {}) {
  const s = new ye();
  s.add(it("pot", e, e * 0.78, t, [0, t / 2, 0], i.rust, 9));
  const r = new oe(new Ts(e * 1.5, 0), n);
  return r.position.y = t + e * 0.9, r.scale.set(1, 1.2, 1), r.name = "pot-leaf", r.castShadow = !0, s.add(r), s;
}
function Kl(i) {
  const e = new ye(), t = (n) => {
    const s = new oe(new As(0.33, 0.024, 5, 14), i.metalDark);
    s.position.set(n, 0.33, 0), s.name = "wheel", s.castShadow = !0, e.add(s);
  };
  return t(-0.52), t(0.52), Ks(e, i, new M(-0.52, 0.33, 0), new M(-0.08, 0.72, 0), 0.022, i.metal), Ks(e, i, new M(-0.08, 0.72, 0), new M(0.28, 0.7, 0), 0.022, i.metal), Ks(e, i, new M(0.28, 0.7, 0), new M(0.52, 0.33, 0), 0.022, i.metal), Ks(e, i, new M(-0.08, 0.72, 0), new M(0, 0.34, 0), 0.022, i.metal), Ks(e, i, new M(0, 0.34, 0), new M(0.52, 0.33, 0), 0.022, i.metal), e.add(R("seat", [0.24, 0.05, 0.1], [-0.16, 0.76, 0], i.woodDark)), e.add(R("handlebar", [0.04, 0.05, 0.42], [0.3, 0.8, 0], i.metalDark)), e.add(R("basket", [0.28, 0.2, 0.24], [0.42, 0.62, 0], i.metal)), e;
}
function jl(i) {
  const e = new ye(), t = R("aframe-a", [0.6, 0.85, 0.035], [0, 0.46, 0.13], i.signStand);
  t.rotation.x = 0.16;
  const n = R("aframe-b", [0.6, 0.85, 0.035], [0, 0.46, -0.13], i.signStand);
  return n.rotation.x = -0.16, e.add(t, n), e.add(R("aframe-foot", [0.6, 0.04, 0.4], [0, 0.02, 0], i.metalDark)), e;
}
function Dv(i) {
  const e = new ye();
  e.add(R("nobori-base", [0.36, 0.06, 0.36], [0, 0.03, 0], i.metalDark)), e.add(it("nobori-pole", 0.022, 0.028, 1.95, [0, 1, 0], i.metal, 6));
  const t = new oe(new rn(0.42, 1.2), i.noboriCloth);
  return t.position.set(0.24, 1.36, 0), t.name = "nobori-cloth", t.castShadow = !0, e.add(t), e;
}
function Nv(i) {
  const e = new ye();
  e.add(R("v-body", [0.9, 1.82, 0.72], [0, 0.91, 0], i.metal)), e.add(R("v-glass", [0.7, 0.95, 0.04], [0, 1.15, 0.37], i.glass));
  for (let t = 0; t < 3; t++)
    for (let n = 0; n < 3; n++) {
      const s = new oe(new Ms(0.045, 0.12, 3, 6), t === 1 ? i.bottleGreen : i.bottle);
      s.position.set(-0.2 + n * 0.2, 1.35 - t * 0.28, 0.28), s.name = "bottle", e.add(s);
    }
  return e.add(R("v-slot", [0.28, 0.16, 0.04], [0.2, 0.55, 0.37], i.metalDark)), e;
}
function ft(i, e, t, n, s = 0) {
  var o;
  e.position.set(t, 0, n), e.rotation.y = s, i.add(e), e.updateMatrixWorld(!0);
  const r = new Ln().setFromObject(e);
  return i.userData.footprints || (i.userData.footprints = []), i.userData.footprints.push({
    name: ((o = e.children[0]) == null ? void 0 : o.name) || "prop",
    min: [Number(r.min.x.toFixed(2)), Number(r.min.z.toFixed(2))],
    max: [Number(r.max.x.toFixed(2)), Number(r.max.z.toFixed(2))],
    height: Number(r.max.y.toFixed(2))
  }), e;
}
function Uv(i) {
  const e = new ye();
  e.name = "clutter-sidewalk", ft(e, jn(i, { w: 0.52, h: 0.44 }), -11.35, -5.74, 0.4), ft(e, jn(i, { w: 0.44, h: 0.36, mat: i.bagLight }), -10.98, -5.7, -0.2), ft(e, ts(i, { mat: i.plasticYellow }), -10.55, -5.76, 0.15);
  const t = ts(i, { mat: i.plasticBlue });
  t.position.set(-10.55, 0.28, -5.76), e.add(t), e.userData.footprints && e.userData.footprints.push({ name: "crate-body", min: [-10.76, -5.91], max: [-10.34, -5.61], height: 0.55 }), ft(e, es(i), -7.18, -5.74, 0.2), ft(e, es(i, { mat: i.plasticYellow }), -6.86, -5.8, -0.3), ft(e, jl(i), -7.02, -5.62, 0.34), ft(e, Dv(i), -7.62, -5.7, 0.1), ft(e, Nv(i), 13.45, -5.5, 0.03), ft(e, jn(i, { w: 0.46, h: 0.4 }), 12, -5.72, 0.6), ft(e, es(i), 11.72, -5.76, 0), ft(e, jn(i, { w: 0.5, h: 0.42 }), -8.6, 11.12, Math.PI), ft(e, ts(i, { mat: i.plasticBlue }), -8.1, 11.14, Math.PI + 0.2), ft(e, Hr(i), -2.35, 11.12, Math.PI), ft(e, jl(i), -2.05, 11, Math.PI - 0.25), ft(e, jn(i, { w: 0.44, h: 0.36, mat: i.bagLight }), 2.2, 11.14, Math.PI), ft(e, es(i, { mat: i.plasticYellow }), 12, 11.12, Math.PI);
  const n = new ye();
  return n.name = "clutter-alley", ft(n, jn(i, { w: 0.54, h: 0.46 }), -11.5, -13.28, 0.2), ft(n, jn(i, { w: 0.46, h: 0.38, mat: i.bagLight }), -11.08, -13.24, 1.1), ft(n, ts(i, { mat: i.plasticYellow }), -10.3, -13.26, 0.1), ft(n, Hr(i, { leaf: i.leafC }), -2.72, -13.26, 0), ft(n, es(i), 3.9, -13.3, 0.2), ft(n, es(i, { mat: i.plasticYellow }), 4.22, -13.24, -0.1), ft(n, Kl(i), 5.9, -13.34, 0.06), ft(n, ts(i, { mat: i.plasticBlue }), -3.6, -17.15, 0.4), ft(n, jn(i, { w: 0.5, h: 0.4 }), -3.1, -17.1, 0.3), ft(n, Kl(i), -13.95, -9.2, Math.PI / 2), ft(n, Hr(i), -19.2, -12, 0), ft(n, Hr(i, { leaf: i.leafA }), -18.8, -12.4, 0.5), ft(n, ts(i, { mat: i.plasticYellow }), -18.9, -13.4, 0.5), ft(n, jn(i, { w: 0.46, h: 0.4 }), -18.4, -13.35, 0.2), { sidewalk: e, alley: n };
}
function Fv(i) {
  const e = new ye();
  e.name = "ground-detail", e.userData.ignoreBounds = !1;
  const t = 0.166, n = 0.047;
  Gt(Ls("ground-detail"));
  const s = (h, u, d, f, g, _ = t, m = i.patch) => {
    const p = R("patch", [d, 0.014, f], [h, _, u], m);
    p.rotation.y = g, p.castShadow = !1, e.add(p);
  };
  s(-9.4, -3.2, 1.1, 0.8, 0.12), s(-5.2, -2.1, 0.9, 0.7, -0.2), s(-3, -4.2, 1.4, 0.6, 0.06, t, i.gravel), s(7.4, -2.4, 1, 0.75, 0.3), s(10.4, -3.4, 0.8, 0.6, -0.16), s(-11.2, -2.6, 0.85, 0.6, 0.22), s(3, 10.6, 1.2, 0.8, 0.1), s(-1.4, 9.9, 0.9, 0.6, -0.25), s(-14.6, -9, 1, 0.9, 0.4, 0.087, i.gravel);
  const r = [[-5.6, -1.2], [-11.6, -1.2], [8.9, -1.2], [12.4, -1.2]];
  for (const [h, u] of r)
    e.add(R("curb-chip", [0.34, 0.03, 0.18], [h, 0.148, u], i.interior));
  e.add(R("curb-stone", [0.22, 0.12, 0.16], [-6.2, 0.06, -1.5], i.concretePlain)), e.add(R("curb-stone-b", [0.18, 0.1, 0.14], [-6.9, 0.05, -1.45], i.concretePlain));
  const o = (h, u, d, f) => {
    const g = new oe(new ln(d, d, 0.02, 14), i.metalDark);
    g.position.set(h, f, u), g.name = "cover", g.castShadow = !1, e.add(g);
  };
  o(-7.4, -3, 0.36, t), o(6.9, 1.9, 0.5, n), o(9.6, 10.4, 0.33, t), o(-13.3, 6.9, 0.28, n), e.add(R("utility-lid", [0.42, 0.02, 0.3], [-2.9, t, -4.5], i.metal)), e.add(R("drain", [0.55, 0.02, 0.9], [5.2, n, 0.95], i.metalDark));
  const a = (h, u, d, f, g, _) => {
    const m = new oe(new hc(1, 12), i.puddle);
    m.rotation.x = -Math.PI / 2, m.rotation.z = g, m.scale.set(d, f, 1), m.position.set(h, _, u), m.name = "puddle", m.castShadow = !1, m.receiveShadow = !1, e.add(m);
  };
  a(-10.2, -3.9, 0.7, 0.42, 0.3, t + 1e-3), a(-4.4, -3.4, 0.55, 0.33, -0.4, t + 1e-3), a(-2.2, 2.4, 1.1, 0.5, 0.15, n), a(7.2, 5.6, 1.4, 0.6, -0.2, n), a(12.6, 1.1, 0.9, 0.45, 0.5, n), a(-5, -15.3, 0.8, 0.5, 0.2, 0.086), a(27.2, 11.8, 1, 0.55, 0.1, 0.082);
  const c = R("oil", [2.6, 8e-3, 1.1], [-3.6, n, 4.4], i.interior);
  c.rotation.y = 0.18, c.castShadow = !1, e.add(c);
  const l = R("oil-b", [1.6, 8e-3, 0.8], [9, n, 2], i.interior);
  return l.rotation.y = -0.3, l.castShadow = !1, e.add(l), e;
}
function Ov(i) {
  const e = new ye();
  e.name = "far-town", e.userData.ignoreBounds = !0;
  const t = Gt(Ls("far-town")), n = (l, h) => l + t() * (h - l), s = (l) => {
    l.userData.ignoreBounds = !0, l.castShadow = !1, l.receiveShadow = !1, e.add(l);
  }, r = i.asphalt.clone();
  r.map = i.asphalt.map.clone(), r.map.repeat.set(18, 3), r.map.wrapS = $t, r.map.wrapT = $t, s(R("road-far-w", [96, 0.04, 9], [-78, 0.02, 3.2], r)), s(R("road-far-e", [90, 0.04, 9], [79, 0.02, 3.2], r)), s(R("road-far-n", [7, 0.04, 60], [-20, 0.02, -50], r)), s(R("walk-far-w", [96, 0.16, 2.2], [-78, 0.08, -2.6], i.concretePlain)), s(R("walk-far-e", [90, 0.16, 2.2], [79, 0.08, -2.6], i.concretePlain));
  const o = [
    { axis: "z", at: -132 },
    { axis: "z", at: 132 },
    { axis: "x", at: -134 },
    { axis: "x", at: 134 }
  ];
  for (const l of o)
    for (let h = 0; h < 11; h++) {
      const u = n(7, 14), d = n(7, 12), f = n(3.2, 7), g = -84 + h * 17 + n(-3, 3), _ = l.at + n(-4, 4), m = l.axis === "z" ? g : _, p = l.axis === "z" ? _ : g, x = [i.plasterA, i.plasterB, i.plasterC, i.farWall][Math.floor(t() * 4)];
      s(R("far-house", [u, f, d], [m, f / 2, p], x)), s(R("far-roof", [u + 0.6, 0.3, d + 0.6], [m, f + 0.1, p], i.roof)), t() < 0.45 && s(R("far-roof-tier", [u * 0.7, 0.9, d * 0.6], [m, f + 0.7, p], i.roof));
    }
  for (let l = 0; l < 5; l++) {
    const h = n(7, 12), u = n(3.6, 7.5);
    s(R("far-house-e", [h, u, n(7, 10)], [122 + l * 11, u / 2, n(-26, 26)], i.plasterB));
  }
  for (let l = 0; l < 7; l++) {
    const h = 40 + l * 11;
    s(it("far-pole", 0.12, 0.16, 7, [h, 3.5, 8.6], i.concretePlain, 6)), s(it("far-pole-w", 0.12, 0.16, 7, [-h, 3.5, 8.6], i.concretePlain, 6)), s(R("far-wall", [10.4, 0.9, 0.3], [h + 5.4, 0.45, -2.4], i.plasterC)), s(R("far-wall-w", [10.4, 0.9, 0.3], [-h - 5.4, 0.45, -2.4], i.plasterC)), s(R("far-wall-s", [10.4, 0.9, 0.3], [h + 5.4, 0.45, 12.6], i.plasterC));
  }
  for (let l = 0; l < 5; l++) {
    const h = 26 + l * 16;
    s(R("far-wall-n", [0.3, 0.9, 14], [-25.5, 0.45, -h], i.plasterC)), s(R("far-wall-n2", [0.3, 0.9, 14], [24.5, 0.45, h], i.plasterC));
  }
  const a = [
    [-52, -44, 34, 26, i.gravel],
    [44, -40, 40, 30, i.soil],
    [-60, 30, 38, 26, i.soil],
    [52, 34, 44, 28, i.gravel],
    [0, -26, 38, 14, i.gravel],
    [-24, 26, 30, 12, i.earth],
    [96, 0, 60, 60, i.earth],
    [-104, -6, 50, 60, i.earth],
    // pass9: the ring between the block and the far rows was bare, so the block
    // looked pasted onto the dirt. Gravel yards, worn paths and packed earth.
    [-38, -34, 26, 16, i.gravel],
    [34, -30, 22, 18, i.gravel],
    [-40, 36, 24, 16, i.gravel],
    [38, 40, 26, 14, i.gravel],
    [-18, -44, 20, 10, i.earth],
    [16, 46, 22, 10, i.earth],
    [-58, -12, 18, 30, i.earth],
    [58, -8, 20, 34, i.earth]
  ];
  for (let l = 0; l < a.length; l++) {
    const [h, u, d, f, g] = a[l];
    s(R("ground-patch", [d, 0.02, f], [h, 0.01 + l * 8e-4, u], g));
  }
  const c = (l, h, u, d, f) => {
    const g = R("track", [u, 0.016, d], [l, 85e-4, h], i.gravel);
    g.rotation.y = f, s(g);
  };
  return c(-30, -26, 5, 60, 0.42), c(28, 22, 4.4, 54, -0.5), c(2, -52, 46, 4, 0.06), Es(e), e;
}
function Ds(i, e, t, n, s, r) {
  const o = i.getImageData(0, 0, e, t), a = o.data;
  for (let c = 0; c < a.length; c += 4) {
    const l = (n() - 0.5) * r;
    a[c] = s[0] + l, a[c + 1] = s[1] + l, a[c + 2] = s[2] + l * 0.85, a[c + 3] = 255;
  }
  i.putImageData(o, 0, 0);
}
function Bv() {
  return hn(512, 512, (i, e, t) => {
    const n = Gt(11);
    Ds(i, e, t, n, [52, 53, 56], 22), i.strokeStyle = "rgba(40,40,42,0.55)", i.lineWidth = 1.2;
    for (let s = 0; s < 18; s++) {
      i.beginPath();
      let r = n() * e, o = n() * t;
      i.moveTo(r, o);
      for (let a = 0; a < 5; a++)
        r += (n() - 0.5) * 80, o += (n() - 0.3) * 40, i.lineTo(r, o);
      i.stroke();
    }
    i.fillStyle = "rgba(30,28,26,0.18)";
    for (let s = 0; s < 6; s++)
      i.beginPath(), i.ellipse(n() * e, n() * t, 30 + n() * 50, 16 + n() * 20, n() * 3, 0, Math.PI * 2), i.fill();
  });
}
function Zl() {
  return hn(512, 512, (i, e, t) => {
    const n = Gt(21);
    Ds(i, e, t, n, [168, 164, 156], 18), i.strokeStyle = "rgba(90,86,80,0.65)", i.lineWidth = 3, i.strokeRect(8, 8, e - 16, t - 16), i.strokeStyle = "rgba(120,116,108,0.45)", i.beginPath(), i.moveTo(e * 0.5, 8), i.lineTo(e * 0.5, t - 8), i.moveTo(8, t * 0.5), i.lineTo(e - 8, t * 0.5), i.stroke();
  });
}
function Vr(i, e) {
  return hn(512, 512, (t, n, s) => {
    const r = Gt(i);
    Ds(t, n, s, r, e, 16), t.fillStyle = "rgba(90,70,50,0.08)";
    for (let o = 0; o < 40; o++)
      t.fillRect(r() * n, r() * s, 2 + r() * 6, 20 + r() * 80);
    t.fillStyle = "rgba(255,255,255,0.04)";
    for (let o = 0; o < 8; o++)
      t.fillRect(r() * n, r() * s, 40 + r() * 80, 24 + r() * 40);
  });
}
function kv() {
  return hn(256, 256, (i, e, t) => {
    const n = Gt(31);
    i.fillStyle = "#c4b2a4", i.fillRect(0, 0, e, t);
    const s = 32, r = 64;
    for (let o = 0; o < t / s; o++) {
      const a = o % 2 ? r / 2 : 0;
      for (let c = -1; c < e / r + 1; c++) {
        const l = 150 + n() * 40;
        i.fillStyle = `rgb(${l + 30},${l * 0.55},${l * 0.42})`, i.fillRect(c * r + a + 2, o * s + 2, r - 4, s - 4);
      }
    }
  });
}
function $l(i, e) {
  return hn(256, 256, (t, n, s) => {
    const r = Gt(i);
    t.fillStyle = `rgb(${e[0]},${e[1]},${e[2]})`, t.fillRect(0, 0, n, s);
    for (let o = 0; o < s; o++) {
      const a = (r() - 0.5) * 18;
      t.fillStyle = `rgba(40,24,12,${0.05 + r() * 0.08})`, t.fillRect(0, o, n, 1), o % 17 === 0 && (t.strokeStyle = "rgba(30,16,8,0.35)", t.beginPath(), t.moveTo(0, o), t.bezierCurveTo(n * 0.3, o + a, n * 0.6, o - a, n, o + a * 0.3), t.stroke());
    }
  });
}
function zv() {
  return hn(128, 64, (i, e, t) => {
    const n = Gt(41);
    i.fillStyle = "#e7e1d6", i.fillRect(0, 0, e, t), i.strokeStyle = "rgba(60,50,40,0.35)";
    for (let s = 0; s < 30; s++)
      i.beginPath(), i.moveTo(n() * e, 0), i.lineTo(n() * e, t), i.stroke();
  });
}
function Hv() {
  return hn(256, 256, (i, e, t) => {
    const n = Gt(51);
    Ds(i, e, t, n, [92, 98, 104], 12), i.fillStyle = "rgba(255,255,255,0.05)";
    for (let s = 20; s < t; s += 36) i.fillRect(0, s, e, 3);
  });
}
function Vv() {
  return hn(128, 256, (i, e, t) => {
    i.fillStyle = "#8d9298", i.fillRect(0, 0, e, t);
    for (let n = 0; n < t; n += 10)
      i.fillStyle = n % 20 === 0 ? "#6a7076" : "#b7bcc2", i.fillRect(0, n, e, 7);
  });
}
function Gv() {
  return hn(128, 128, (i, e, t) => {
    const n = Gt(61);
    i.fillStyle = "#d5e2ea", i.fillRect(0, 0, e, t);
    for (let s = 0; s < 80; s++)
      i.fillStyle = `rgba(255,255,255,${0.05 + n() * 0.15})`, i.fillRect(n() * e, n() * t, 8, 2);
  });
}
function js(i, e) {
  return hn(128, 128, (t, n, s) => {
    for (let r = 0; r < n; r += 16)
      t.fillStyle = r / 16 % 2 === 0 ? i : e, t.fillRect(r, 0, 16, s);
  });
}
function Mn(i, e, t, n) {
  return hn(512, 256, (s, r, o) => {
    s.fillStyle = t, s.fillRect(0, 0, r, o), s.strokeStyle = n, s.lineWidth = 10, s.strokeRect(8, 8, r - 16, o - 16), s.fillStyle = n, s.textAlign = "center", s.textBaseline = "middle", s.font = '700 86px "Yu Gothic", Meiryo, "MS PGothic", sans-serif', s.fillText(i, r / 2, e ? o * 0.42 : o * 0.52), e && (s.font = '500 40px "Yu Gothic", Meiryo, "MS PGothic", sans-serif', s.fillText(e, r / 2, o * 0.74));
  });
}
function Wv() {
  return hn(256, 256, (i, e, t) => {
    const n = Gt(71);
    Ds(i, e, t, n, [158, 148, 134], 14);
    for (let s = 0; s < 5; s++)
      for (let r = 0; r < 4; r++) {
        const o = 14 + r * 60 + n() * 6, a = 14 + s * 48 + n() * 5;
        i.fillStyle = n() < 0.3 ? "rgba(70,62,52,0.85)" : "rgba(52,48,44,0.6)", i.fillRect(o, a, 34, 28), n() < 0.22 && (i.fillStyle = "rgba(255,206,142,0.5)", i.fillRect(o + 2, a + 2, 30, 24));
      }
    i.fillStyle = "rgba(255,255,255,0.05)";
    for (let s = 0; s < 12; s++) i.fillRect(n() * e, n() * t, 30 + n() * 40, 3);
  });
}
function Xv() {
  return hn(256, 256, (i, e, t) => {
    const n = Gt(73);
    i.fillStyle = "#5d6673", i.fillRect(0, 0, e, t);
    for (let s = 0; s < 9; s++)
      for (let r = 0; r < 6; r++)
        i.fillStyle = n() < 0.35 ? "rgba(150,158,170,0.55)" : "rgba(66,74,86,0.7)", i.fillRect(10 + r * 40, 8 + s * 27, 24, 17);
  });
}
function qv() {
  return hn(256, 256, (i, e, t) => {
    const n = Gt(81);
    Ds(i, e, t, n, [104, 98, 86], 16);
    for (let s = 0; s < 90; s++) {
      const r = 8 + n() * 34;
      i.fillStyle = n() < 0.5 ? "rgba(88,82,70,0.28)" : "rgba(132,124,108,0.22)", i.beginPath(), i.ellipse(n() * e, n() * t, r, r * (0.5 + n()), n() * 3, 0, Math.PI * 2), i.fill();
    }
    i.strokeStyle = "rgba(74,68,58,0.3)", i.lineWidth = 1.4;
    for (let s = 0; s < 14; s++) {
      i.beginPath();
      let r = n() * e, o = n() * t;
      i.moveTo(r, o);
      for (let a = 0; a < 4; a++)
        r += (n() - 0.5) * 70, o += (n() - 0.5) * 70, i.lineTo(r, o);
      i.stroke();
    }
  });
}
function At(i, e, t = 0.85, n = 0) {
  return new se({ map: i, color: e, roughness: t, metalness: n });
}
function Yv() {
  const i = zv();
  i.wrapS = $t, i.wrapT = $t, i.repeat.set(2, 1);
  const e = {
    asphalt: At(Bv(), "#ffffff", 0.92),
    concrete: At(Zl(), "#ffffff", 0.9),
    plasterA: At(Vr(101, [156, 140, 120]), "#ffffff", 0.94),
    plasterB: At(Vr(102, [138, 126, 110]), "#ffffff", 0.93),
    plasterC: At(Vr(103, [122, 114, 102]), "#ffffff", 0.92),
    brick: At(kv(), "#ffffff", 0.86),
    wood: At($l(201, [112, 74, 48]), "#ffffff", 0.8),
    woodDark: At($l(202, [62, 40, 28]), "#ffffff", 0.75),
    roof: At(Hv(), "#ffffff", 0.95),
    slat: At(Vv(), "#ffffff", 0.55, 0.35),
    fiber: At(i, "#ffffff", 0.8),
    frost: new se({
      map: Gv(),
      color: "#e7f2f6",
      roughness: 0.35,
      metalness: 0,
      transparent: !0,
      opacity: 0.78
    }),
    glass: new se({
      color: "#9ec4d4",
      roughness: 0.08,
      metalness: 0.05,
      transparent: !0,
      opacity: 0.38
    }),
    glassDark: new se({
      color: "#1c2830",
      roughness: 0.2,
      metalness: 0.1,
      transparent: !0,
      opacity: 0.72
    }),
    metal: new se({ color: "#8e9398", roughness: 0.45, metalness: 0.72 }),
    metalDark: new se({ color: "#3e444a", roughness: 0.5, metalness: 0.6 }),
    brass: new se({ color: "#b08a45", roughness: 0.38, metalness: 0.75 }),
    pad: new se({ color: "#8d2a2a", roughness: 0.7, metalness: 0.02 }),
    ropeRed: new se({ map: i, color: "#c43838", roughness: 0.82 }),
    ropeWhite: new se({ map: i, color: "#f3efe6", roughness: 0.82 }),
    ropeBlue: new se({ map: i, color: "#2a4c86", roughness: 0.82 }),
    leafA: new se({ color: "#7ba648", roughness: 0.65, metalness: 0.02 }),
    leafB: new se({ color: "#5a8236", roughness: 0.72, metalness: 0.02 }),
    leafC: new se({ color: "#3d5c24", roughness: 0.8, metalness: 0.01 }),
    leafSun: new se({ color: "#96c257", roughness: 0.58, metalness: 0.02 }),
    bark: new se({ color: "#4d3a2b", roughness: 0.92 }),
    barkBranch: new se({ color: "#5a4635", roughness: 0.88 }),
    paintCar: new jt({
      color: "#5b7d99",
      roughness: 0.28,
      metalness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    }),
    paintCarParked: new jt({
      color: "#6e8594",
      roughness: 0.25,
      metalness: 0.45,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    }),
    paintCarTraffic: new jt({
      color: "#2e373d",
      roughness: 0.25,
      metalness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    }),
    paintCarLot: new jt({
      color: "#693732",
      roughness: 0.42,
      metalness: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3
    }),
    headlampGlass: new jt({
      color: "#ffffff",
      transmission: 0.85,
      opacity: 1,
      transparent: !0,
      roughness: 0.1,
      ior: 1.5
    }),
    headlampInner: new se({
      color: "#f8f8f8",
      emissive: "#ffeec8",
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.85
    }),
    tailRed: new se({
      color: "#a31818",
      emissive: "#590d0d",
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.2
    }),
    turnAmber: new se({
      color: "#d47b1c",
      roughness: 0.25,
      metalness: 0.2
    }),
    reverseWhite: new se({
      color: "#e8edf0",
      roughness: 0.2,
      metalness: 0.1
    }),
    plateWhite: new se({
      color: "#e4ebed",
      roughness: 0.4,
      metalness: 0.1
    }),
    plateGreen: new se({
      color: "#245a3a",
      roughness: 0.4
    }),
    carGlass: new jt({
      color: "#283842",
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.72,
      opacity: 1,
      transparent: !0,
      ior: 1.52
    }),
    carTrimBlack: new se({ color: "#181b1d", roughness: 0.75, metalness: 0.1 }),
    mirrorGlass: new se({ color: "#cfd8dc", roughness: 0.05, metalness: 0.95 }),
    brakeDisc: new se({ color: "#8c959a", roughness: 0.3, metalness: 0.85 }),
    tire: new se({ color: "#181a1b", roughness: 0.92 }),
    wheelAlloy: new se({ color: "#d0d6dc", roughness: 0.25, metalness: 0.75 }),
    trim: new se({ color: "#d9d4cc", roughness: 0.4, metalness: 0.4 }),
    matRed: new se({ color: "#a33b3b", roughness: 0.85 }),
    matBlue: new se({ color: "#2f4f86", roughness: 0.85 }),
    stone: At(Vr(301, [214, 208, 196]), "#ffffff", 0.8),
    gold: new se({ color: "#c6a15a", roughness: 0.4, metalness: 0.65 }),
    produce: At(js("#8e342c", "#cfc6b6"), "#ffffff", 0.82),
    detectiveAwning: At(js("#16332d", "#d5cec0"), "#ffffff", 0.8),
    shutterAwning: At(js("#8a6828", "#d2c6ae"), "#ffffff", 0.82),
    dinerAwning: At(js("#7a3030", "#e7d7bf"), "#ffffff", 0.82),
    hangoutAwning: At(js("#243044", "#d8c48a"), "#ffffff", 0.8),
    cable: new se({ color: "#5c6166", roughness: 0.48, metalness: 0.72 }),
    cableWarn: new se({ color: "#6e2e2a", roughness: 0.62, metalness: 0.35 }),
    bronze: new se({ color: "#7a5a32", roughness: 0.42, metalness: 0.62 }),
    gongBox: new se({ color: "#6a2420", roughness: 0.55, metalness: 0.15 }),
    plate: new se({ color: "#8a8e92", roughness: 0.4, metalness: 0.78 }),
    interior: new se({ color: "#3a322b", roughness: 1 }),
    interiorFloor: new se({ color: "#6a5342", roughness: 0.85 }),
    cabbage: new se({ color: "#7ea24a", roughness: 0.8 }),
    bottle: new se({ color: "#d35a3a", roughness: 0.3 }),
    signDetective: new se({
      map: Mn("私立探偵", "タンク", "#1c2a26", "#f3efe4"),
      roughness: 0.6
    }),
    signProduce: new se({
      map: Mn("青果", "", "#f4efe4", "#5a2e24"),
      roughness: 0.65
    }),
    signCivic: new se({
      map: Mn("市役所", "", "#efeae2", "#2c3330"),
      roughness: 0.55
    }),
    signDiner: new se({
      map: Mn("食堂", "", "#f3efe6", "#6a2e28"),
      roughness: 0.62
    }),
    signOffice: new se({
      map: Mn("会社", "", "#e7e4de", "#243038"),
      roughness: 0.5
    }),
    signShop: new se({
      map: Mn("雑貨", "", "#f4efe4", "#3e3428"),
      roughness: 0.65
    }),
    signHangout: new se({
      map: Mn("ゲーム", "", "#1e2430", "#f0d78c"),
      roughness: 0.45
    }),
    signNoVehicle: new se({
      map: Mn("進入禁止", "歩行者", "#f4efe6", "#6e2e2a"),
      roughness: 0.55
    }),
    signWorks: new se({
      map: Mn("工事中", "", "#e6d7a4", "#2c3330"),
      roughness: 0.7
    }),
    water: new se({
      color: "#3f6f78",
      roughness: 0.18,
      metalness: 0.22,
      transparent: !0,
      opacity: 0.9
    }),
    waterBed: new se({ color: "#1d3338", roughness: 0.95 }),
    flower: new se({ color: "#c45a62", roughness: 0.8 }),
    flowerB: new se({ color: "#e2c56a", roughness: 0.8 }),
    grass: new se({ color: "#5d7840", roughness: 1 }),
    earth: new se({ color: "#6a6458", roughness: 1 }),
    lantern: new se({
      color: "#ffd7a8",
      emissive: "#ff8a3a",
      emissiveIntensity: 0.85,
      roughness: 0.4
    }),
    skySil: new se({
      color: "#66707e",
      roughness: 1,
      emissive: "#3a4452",
      emissiveIntensity: 0.45
    }),
    soil: new se({ color: "#5c4634", roughness: 1 }),
    hardPad: At(Zl(), "#cfc8bc", 0.78),
    concretePlain: new se({ color: "#c8c2b6", roughness: 0.9 }),
    curtain: new se({ color: "#d8cfc2", roughness: 0.95 }),
    bulb: new se({ color: "#ffd7a1", emissive: "#ffb15a", emissiveIntensity: 0.8, roughness: 0.4 }),
    cardboard: new se({ color: "#b8894f", roughness: 0.95 }),
    bottleGreen: new se({ color: "#3e8a62", roughness: 0.28 }),
    // pass9: street life props and far scenery
    clothA: new se({ color: "#dfe4e6", roughness: 0.95, side: Zt }),
    clothB: new se({ color: "#b9524c", roughness: 0.95, side: Zt }),
    tarp: new se({ color: "#4f6b5f", roughness: 0.92 }),
    vinyl: new se({ color: "#cfc7b4", roughness: 0.72 }),
    rust: new se({ color: "#6e4a34", roughness: 0.95, metalness: 0.1 }),
    tank: new se({ color: "#b9b3a4", roughness: 0.85 }),
    bagDark: new se({ color: "#2f3a37", roughness: 0.85 }),
    bagLight: new se({ color: "#b9b7a8", roughness: 0.9 }),
    plasticBlue: new se({ color: "#3f6480", roughness: 0.65 }),
    plasticYellow: new se({ color: "#b89a45", roughness: 0.7 }),
    puddle: new se({
      color: "#4a5560",
      roughness: 0.05,
      metalness: 0.35,
      transparent: !0,
      opacity: 0.72
    }),
    patch: new se({ color: "#a8a49a", roughness: 0.92 }),
    gravel: new se({ color: "#7b7264", roughness: 1 }),
    earthGround: At(qv(), "#ffffff", 1),
    farWall: At(Wv(), "#ffffff", 0.95),
    skyWin: At(Xv(), "#9aa4b2", 1),
    noboriCloth: new se({
      map: Mn("特売", "本日", "#f2ead8", "#8a2a22"),
      roughness: 0.85,
      side: Zt
    }),
    signStand: new se({
      map: Mn("営業中", "入ってください", "#f2ead8", "#3d2c22"),
      roughness: 0.7
    })
  };
  e.asphalt.map.repeat.set(4, 4), e.concrete.map.repeat.set(2, 2), e.brick.map.repeat.set(3, 2);
  for (const t of ["plasterA", "plasterB", "plasterC", "brick"])
    Tv(e[t], { amount: t === "brick" ? 0.26 : 0.34, height: t === "brick" ? 1.2 : 3 });
  return e.earthGround.map.repeat.set(26, 26), e;
}
function Kt(i, e, { x: t, y: n, w: s, h: r, zOuter: o }) {
  const a = e.wood, c = 0.055, l = o + 0.02;
  i.add(R("win-l", [c, r, 0.07], [t - s / 2 + c / 2, n, l], a)), i.add(R("win-r", [c, r, 0.07], [t + s / 2 - c / 2, n, l], a)), i.add(R("win-top", [s, c, 0.07], [t, n + r / 2 - c / 2, l], a)), i.add(R("win-bot", [s, c, 0.07], [t, n - r / 2 + c / 2, l], a)), i.add(R("muntin-v", [0.035, r - 0.12, 0.025], [t, n, l + 0.02], a)), i.add(R("muntin-h", [s - 0.12, 0.035, 0.025], [t, n, l + 0.02], a)), i.add(R("sill", [s + 0.1, 0.045, 0.16], [t, n - r / 2, o + 0.06], e.stone)), i.add(R("reveal", [s - 0.08, r - 0.08, 0.18], [t, n, o - 0.12], e.interior));
  const h = new oe(new rn(s - 0.12, r - 0.12), e.glass);
  h.name = "glass", h.position.set(t, n, o - 0.02), h.castShadow = !1, i.add(h);
  const u = new oe(new rn((s - 0.2) * 0.42, r - 0.28), e.curtain);
  u.position.set(t - s * 0.22, n - 0.05, o - 0.2), u.name = "curtain", i.add(u);
}
function Jl(i, e, t, n) {
  const s = new M().subVectors(n, t), r = s.length(), o = new oe(new ln(0.028, 0.028, r, 6), e.metal);
  o.position.copy(t).add(n).multiplyScalar(0.5), o.quaternion.setFromUnitVectors(new M(0, 1, 0), s.normalize()), o.castShadow = !0, o.name = "awning-strut", i.add(o);
}
function su(i, e, t, { width: n, y: s, z: r }) {
  t.side = Zt;
  const o = 1.2, a = new rn(n, o, 28, 8);
  a.rotateX(-Math.PI / 2);
  const c = a.attributes.position;
  for (let g = 0; g < c.count; g++) {
    const _ = c.getX(g), p = (c.getZ(g) + o / 2) / o, x = Math.sin(_ / n * Math.PI * 5) * 0.04 * p;
    c.setY(g, -p * p * 0.2 - x);
  }
  a.computeVertexNormals();
  const l = new oe(a, t);
  l.name = "awning", l.position.set(0, s, r + o / 2), l.castShadow = !0, l.receiveShadow = !0, i.add(l);
  const h = new rn(n, 0.34, 32, 1), u = h.attributes.position;
  for (let g = 0; g < u.count; g++)
    if (u.getY(g) < 0) {
      const _ = u.getX(g);
      u.setY(g, -0.17 - Math.abs(Math.sin(_ / n * Math.PI * 6)) * 0.14);
    }
  h.computeVertexNormals();
  const d = new oe(h, t);
  d.name = "valance", d.position.set(0, s - 0.28, r + o), d.castShadow = !0, i.add(d), i.add(R("awning-bar", [n + 0.08, 0.045, 0.045], [0, s, r], e.metal));
  const f = n / 2 - 0.16;
  Jl(i, e, new M(-f, s - 0.55, r + 0.05), new M(-f, s - 0.16, r + o * 0.92)), Jl(i, e, new M(f, s - 0.55, r + 0.05), new M(f, s - 0.16, r + o * 0.92));
}
function ru(i, e, t, { x: n, y: s, z: r }) {
  const o = new oe(new mt(0.08, 0.72, 1.15), [
    t,
    t,
    e.woodDark,
    e.woodDark,
    e.woodDark,
    e.woodDark
  ]);
  o.name = "blade-sign", o.position.set(n, s, r), o.castShadow = !0, i.add(o), i.add(R("sign-bracket", [0.06, 0.06, 0.7], [n, s + 0.4, r - 0.15], e.metalDark));
}
function ou(i, e, { W: t, floors: n, groundH: s, upperH: r, zOuter: o, wall: a, rand: c }) {
  for (let l = 0; l < n - 1; l++) {
    const h = s + l * r, u = t > 6 ? 3 : 2, d = t - 1.35, f = Math.min(0.96, d / u - 0.28), g = 1.28, _ = h + 1.42;
    for (let m = 0; m < u; m++) {
      const p = u === 1 ? 0 : -d / 2 + d * m / (u - 1), x = c ? (c() - 0.5) * 0.22 : 0, y = c ? (c() - 0.5) * 0.16 : 0, v = c ? 0.92 + c() * 0.16 : 1;
      Kt(i, e, { x: p + x, y: _ + y, w: f * v, h: g, zOuter: o });
    }
    i.add(R("belt", [t + 0.08, 0.12, 0.2], [0, h, o + 0.02], a === "brick" ? e.stone : e.brick));
  }
}
function au(i, e, { W: t, D: n, H: s, wallMat: r }) {
  i.add(R("side-l", [0.2, s, n], [-t / 2 + 0.2 / 2, s / 2, 0], r)), i.add(R("side-r", [0.2, s, n], [t / 2 - 0.2 / 2, s / 2, 0], r)), i.add(R("back", [t, s, 0.2], [0, s / 2, -n / 2 + 0.2 / 2], r)), i.add(R("water-table", [t + 0.08, 0.38, n + 0.06], [0, 0.19, 0], e.brick)), i.add(R("cornice", [t + 0.36, 0.16, n + 0.28], [0, s - 0.02, 0.06], e.stone)), i.add(R("roof", [t - 0.15, 0.1, n - 0.15], [0, s + 0.06, 0], e.roof)), i.add(R("parapet-f", [t + 0.1, 0.38, 0.12], [0, s + 0.28, n / 2 - 0.02], r)), i.add(R("parapet-b", [t + 0.1, 0.38, 0.12], [0, s + 0.28, -n / 2 + 0.02], r)), i.add(R("parapet-l", [0.12, 0.38, n], [-t / 2, s + 0.28, 0], r)), i.add(R("parapet-r", [0.12, 0.38, n], [t / 2, s + 0.28, 0], r)), i.add(it("downspout", 0.035, 0.035, s - 0.2, [t / 2 + 0.02, s / 2, n / 2 - 0.15], e.metal, 8));
}
function Zo(i, e) {
  const t = new ye();
  Tt(t, {
    id: e.id,
    kind: "building",
    assumption: e.assumption || null,
    gameplay: e.gameplay || null
  });
  const n = e.width, s = e.depth, r = e.floors, o = 3.35, a = 2.8, c = o + a * (r - 1), l = s / 2, h = i[e.wall], u = Gt(Ls(e.id) ^ 2654435769);
  return au(t, i, { W: n, D: s, H: c, wallMat: h }), t.add(R("pier-l", [0.28, o, 0.18], [-n / 2 + 0.22, o / 2, l], h)), t.add(R("pier-r", [0.28, o, 0.18], [n / 2 - 0.22, o / 2, l], h)), t.add(R("bulkhead", [n - 0.5, 0.62, 0.16], [0, 0.31, l], i.woodDark)), t.add(R("shop-header", [n, 0.42, 0.18], [0, 3.05, l], h)), t.add(R("interior-floor", [n - 0.45, 0.06, s - 0.5], [0, 0.08, -0.1], i.interiorFloor)), t.add(R("interior-ceiling", [n - 0.45, 0.08, s - 0.55], [0, o - 0.08, -0.15], i.interior)), ou(t, i, { W: n, floors: r, groundH: o, upperH: a, zOuter: l, wall: e.wall, rand: u }), e.side && lu(t, i, { W: n, floors: r, groundH: o, upperH: a, side: e.side }), su(t, i, e.awning, { width: n - 0.7, y: 2.82, z: l }), e.shop === "detective" && Qv(t, i, { W: n, D: s, zOuter: l }), e.shop === "produce" && ex(t, i, { W: n, zOuter: l }), e.shop === "shutter" && tx(t, i, { W: n, zOuter: l, H: c }), It(t, new M(0, 1.6, l + 0.2)), Rt(t), iu(t, i, { W: n, D: s, H: c, floors: r, groundH: o, upperH: a, zOuter: l, wallMat: h, id: e.id }), Es(t), t;
}
function cu(i, e) {
  const t = new ye();
  Tt(t, {
    id: e.id,
    kind: "building",
    assumption: e.assumption || null
  });
  const n = e.width, s = e.depth, r = e.floors, o = 3.35, a = 2.8, c = o + a * (r - 1), l = s / 2, h = i[e.wall], u = Gt(Ls(e.id) ^ 2654435769);
  return au(t, i, { W: n, D: s, H: c, wallMat: h }), t.add(R("pier-l", [0.22, o, 0.16], [-n / 2 + 0.18, o / 2, l], h)), t.add(R("pier-r", [0.22, o, 0.16], [n / 2 - 0.18, o / 2, l], h)), t.add(R("shop-header", [n, 0.36, 0.16], [0, 3.05, l], h)), ou(t, i, { W: n, floors: r, groundH: o, upperH: a, zOuter: l, wall: e.wall, rand: u }), e.side && lu(t, i, { W: n, floors: r, groundH: o, upperH: a, side: e.side }), Kv(t, i, { W: n, floors: r, groundH: o, upperH: a, D: s }), e.awning && su(t, i, e.awning, { width: n - 0.6, y: 2.82, z: l }), e.ground === "diner" && jv(t, i, { W: n, zOuter: l }), e.ground === "office" && Zv(t, i, { W: n, zOuter: l, floors: r }), e.ground === "shop" && $v(t, i, { W: n, zOuter: l }), e.ground === "hangout" && Jv(t, i, { W: n, zOuter: l }), It(t, new M(0, 1.6, l + 0.15)), Rt(t), iu(t, i, { W: n, D: s, H: c, floors: r, groundH: o, upperH: a, zOuter: l, wallMat: h, id: e.id }), Es(t), t;
}
function Kv(i, e, { W: t, floors: n, groundH: s, upperH: r, D: o }) {
  const a = new ye();
  a.name = "back-windows", a.position.set(0, 0, -o / 2), a.rotation.y = Math.PI;
  const c = t > 6 ? 3 : 2, l = t - 1.5;
  for (let h = 0; h < n; h++) {
    const u = h === 0 ? 1.7 : s + (h - 1) * r + 1.35;
    for (let d = 0; d < c; d++) {
      const f = c === 1 ? 0 : -l / 2 + l * d / (c - 1);
      Kt(a, e, { x: f, y: u, w: 0.85, h: h === 0 ? 1.2 : 1.05, zOuter: 0.02 });
    }
  }
  i.add(a);
}
function jv(i, e, { W: t, zOuter: n }) {
  i.add(R("glass", [t - 1.3, 1.7, 0.06], [0.15, 1.55, n + 0.02], e.glass)), i.add(R("door", [0.9, 2.1, 0.07], [-t / 2 + 0.85, 1.08, n + 0.05], e.woodDark)), i.add(R("counter", [t - 1.6, 0.9, 0.5], [0.3, 0.48, n - 0.35], e.wood));
  const s = new oe(new mt(Math.min(t - 0.7, 2.4), 0.46, 0.07), e.signDiner);
  s.name = "fascia-sign", s.position.set(0.1, 3.32, n + 0.14), s.castShadow = !0, i.add(s);
}
function Zv(i, e, { W: t, zOuter: n, floors: s }) {
  i.add(R("canopy", [t - 0.8, 0.12, 1.15], [0, 3.15, n + 0.45], e.concretePlain)), i.add(R("door-l", [0.7, 2.2, 0.06], [-0.38, 1.14, n + 0.04], e.glassDark)), i.add(R("door-r", [0.7, 2.2, 0.06], [0.38, 1.14, n + 0.04], e.glassDark));
  const r = Math.min(1.15, (t - 2.4) / 2);
  i.add(R("glass-l", [r, 2.2, 0.05], [-t / 2 + r / 2 + 0.35, 1.35, n + 0.02], e.glassDark)), i.add(R("glass-r", [r, 2.2, 0.05], [t / 2 - r / 2 - 0.35, 1.35, n + 0.02], e.glassDark));
  const o = new oe(new mt(2.2, 0.42, 0.07), e.signOffice);
  o.name = "fascia-sign", o.position.set(0, 3.55, n + 1.05), o.castShadow = !0, i.add(o);
}
function $v(i, e, { W: t, zOuter: n }) {
  i.add(R("shutter", [t - 1.2, 1.15, 0.06], [0, 2.05, n + 0.04], e.slat)), i.add(R("opening", [t - 1.3, 1.05, 0.06], [0, 0.85, n - 0.02], e.interior)), i.add(R("door", [0.86, 2.05, 0.07], [t / 2 - 0.8, 1.05, n + 0.05], e.woodDark));
  const s = new oe(new mt(Math.min(t - 0.8, 2.2), 0.42, 0.07), e.signShop);
  s.name = "fascia-sign", s.position.set(-0.2, 3.28, n + 0.12), s.castShadow = !0, i.add(s);
}
function Jv(i, e, { W: t, zOuter: n }) {
  i.add(R("opening", [t - 1.05, 2.15, 0.08], [0, 1.2, n - 0.02], e.interior)), i.add(R("counter", [t - 1.5, 0.95, 0.45], [0, 0.5, n - 0.4], e.woodDark));
  for (const r of [-t / 2 + 0.45, t / 2 - 0.45]) {
    const o = new oe(new In(0.14, 10, 8), e.lantern);
    o.position.set(r, 2.55, n + 0.25), o.name = "lamp", i.add(o);
  }
  const s = new oe(new mt(Math.min(t - 0.6, 2.3), 0.46, 0.07), e.signHangout);
  s.name = "fascia-sign", s.position.set(0, 3.3, n + 0.14), s.castShadow = !0, i.add(s);
}
function lu(i, e, { W: t, floors: n, groundH: s, upperH: r, side: o }) {
  const a = o === "right" ? 1 : -1, c = new ye();
  c.name = `side-windows-${o}`, c.position.set(a * (t / 2), 0, 0), c.rotation.y = a > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (let l = 0; l < n - 1; l++) {
    const h = s + l * r;
    Kt(c, e, { x: -0.7, y: h + 1.42, w: 0.85, h: 1.2, zOuter: 0.02 }), Kt(c, e, { x: 0.7, y: h + 1.42, w: 0.85, h: 1.2, zOuter: 0.02 });
  }
  i.add(c);
}
function Qv(i, e, { W: t, D: n, zOuter: s }) {
  const a = new ye();
  a.name = "door", a.position.set(-1.15, 2.15 / 2 + 0.02, s + 0.04), a.add(R("door-slab", [0.96, 2.15, 0.06], [0, 0, 0], e.woodDark));
  const c = new oe(new rn(0.96 - 0.28, 0.7), e.frost);
  c.position.set(0, 0.45, 0.034), a.add(c), a.add(R("kick", [0.96 - 0.12, 0.22, 0.02], [0, -2.15 / 2 + 0.2, 0.04], e.brass)), a.add(it("knob", 0.035, 0.035, 0.06, [0.96 / 2 - 0.12, 0, 0.05], e.brass, 8)), i.add(a), Kt(i, e, { x: 1.15, y: 1.7, w: 1.7, h: 1.45, zOuter: s });
  for (let f = 0; f < 6; f++)
    i.add(R("blind", [1.45, 0.025, 0.01], [1.15, 2.15 - f * 0.16, s - 0.08], e.wood));
  ru(i, e, e.signDetective, { x: -t / 2 + 0.15, y: 3.55, z: s + 0.85 });
  const l = new oe(new mt(2.4, 0.42, 0.07), e.signDetective);
  l.name = "fascia-sign", l.position.set(-0.2, 3.28, s + 0.12), l.castShadow = !0, i.add(l), i.add(R("desk", [1.4, 0.74, 0.7], [-0.2, 0.45, 0.4], e.wood)), i.add(R("desk-leg", [1.25, 0.08, 0.55], [-0.2, 0.78, 0.4], e.woodDark)), i.add(R("chair-seat", [0.42, 0.06, 0.42], [-0.2, 0.5, 1.15], e.woodDark)), i.add(R("chair-back", [0.42, 0.5, 0.05], [-0.2, 0.78, 0.96], e.woodDark)), i.add(R("cabinet", [0.7, 1.3, 0.4], [t / 2 - 0.7, 0.75, -n / 2 + 0.7], e.wood));
  const h = new oe(new uc(0.16, 0.18, 8), e.woodDark);
  h.position.set(-0.2, 1.35, 0.4), h.rotation.x = Math.PI, i.add(h);
  const u = new oe(new In(0.05, 8, 8), e.bulb);
  u.position.set(-0.2, 1.22, 0.4), u.name = "bulb", i.add(u);
  const d = new mc("#ffb56a", 1.4, 4.5, 2);
  d.position.set(-0.2, 1.2, 0.55), i.add(d), i.add(R("plaque", [0.46, 0.16, 0.02], [-1.15, 2.35, s + 0.08], e.brass));
}
function ex(i, e, { W: t, zOuter: n }) {
  i.add(R("counter", [t - 1.3, 0.92, 0.55], [0.1, 0.5, n - 0.15], e.wood));
  const s = new oe(new rn(t - 1.5, 1.7), e.glass);
  s.position.set(0.15, 1.7, n + 0.02), s.material = e.glass, s.name = "shop-glass", i.add(s), ru(i, e, e.signProduce, { x: t / 2 - 0.12, y: 3.5, z: n + 0.8 });
  for (let r = 0; r < 3; r++) {
    const o = R("crate", [0.55, 0.32, 0.4], [-1.3 + r * 0.62, 0.2, n + 0.55], e.wood);
    i.add(o);
    for (let a = 0; a < 3; a++) {
      const c = new oe(new Ts(0.1, 0), e.cabbage);
      c.position.set(-1.3 + r * 0.62 + (a - 1) * 0.12, 0.44, n + 0.55), c.castShadow = !0, c.name = "produce", i.add(c);
    }
  }
}
function tx(i, e, { W: t, zOuter: n, H: s }) {
  const o = new oe(new mt(t - 1.15, 1.35, 0.06), e.slat);
  o.name = "shutter", o.position.set(0, 2.15, n + 0.05), o.castShadow = !0, i.add(o), i.add(it("shutter-roll", 0.16, 0.16, t - 1.05, [0, 2.85, n + 0.08], e.metalDark, 12));
  const a = i.children[i.children.length - 1];
  a.rotation.z = Math.PI / 2, i.add(R("open-shadow", [t - 1.2, 1.15, 0.08], [0, 0.95, n - 0.05], e.interior)), i.add(R("ac", [0.7, 0.28, 0.55], [t / 2 - 0.7, s - 0.55, n - 0.2], e.metal));
  const c = new oe(new As(0.1, 0.012, 6, 12), e.metalDark);
  c.position.set(t / 2 - 0.7, s - 0.55, n + 0.08), i.add(c);
}
function nx(i) {
  const e = new ye();
  Tt(e, {
    id: "dive-terrace",
    kind: "fall-hazard",
    assumption: "仮。2階の店先テラスから歩道や車の屋根へ落ちる。奥の扉は上階の出入口で、中の用途は未設定。事件の特定場所ではない。",
    gameplay: { hazard: "fall", lipHeight: 3.2 }
  });
  const t = 0.2, n = 0.28, s = 16, r = s * n, o = 1.05;
  e.add(R("foot", [n + 0.08, 0.04, o], [-r / 2 + n / 2, 0.02, 0.15], i.concretePlain));
  for (let d = 0; d < s; d++) {
    const f = -r / 2 + n * d + n / 2, g = t * (d + 1);
    e.add(R("tread", [n + 0.02, 0.045, o], [f, g, 0.15], i.concretePlain));
  }
  const a = t * s, c = r / 2 + 0.5;
  e.add(R("deck", [3.4, 0.1, 2.8], [c, a, 1.15], i.concretePlain));
  const l = 2.15, h = 0.92, u = 2.1;
  return e.add(R("upper-door", [h, u, 0.08], [l, a + u / 2, 0.06], i.woodDark)), e.add(R("upper-glass", [h - 0.28, 0.55, 0.02], [l, a + 1.48, 0.1], i.frost)), e.add(R("door-lintel", [h + 0.24, 0.08, 0.14], [l, a + u + 0.04, 0.08], i.concretePlain)), e.add(R("rail-back", [1.35, 0.9, 0.05], [3.75, a + 0.5, -0.15], i.metalDark)), e.add(R("rail-l", [0.05, 0.9, 2.5], [c - 1.67, a + 0.5, 1], i.metalDark)), e.add(R("rail-r", [0.05, 0.9, 2.5], [c + 1.67, a + 0.5, 1], i.metalDark)), e.add(R("table", [0.7, 0.05, 0.7], [r / 2 + 0.2, a + 0.78, 0.7], i.wood)), e.add(it("table-leg", 0.04, 0.04, 0.74, [r / 2 + 0.2, a + 0.4, 0.7], i.metal, 6)), e.userData.lip = [r / 2 + 0.5, a, 2.55], It(e, new M(-r / 2, 0.4, 0.7)), Rt(e), e;
}
function ix(i) {
  const e = new ye();
  Tt(e, {
    id: "civic-portico",
    kind: "landmark",
    assumption: "仮。市長の勤務先。商店と同じコンクリートの町並みに合わせた。神殿列柱にはしない。町名・平面・ケルビンの場所は未設定。マスク紋は市長への視覚的な呼応で、紋章の制定は未設定。"
  });
  const t = 12.5, n = 8.2, s = 7.4, r = s / 2;
  e.add(R("mass", [t, n, s], [0, n / 2, 0], i.concretePlain)), e.add(R("stain", [t + 0.08, 1.1, s + 0.08], [0, 0.55, 0], i.plasterC)), e.add(R("canopy", [6.4, 0.22, 2.2], [0, 3.55, r + 0.7], i.concretePlain)), e.add(R("door", [1.7, 2.5, 0.12], [0, 1.45, r + 0.04], i.woodDark));
  const o = new oe(new mt(2.6, 0.55, 0.08), i.signCivic);
  o.name = "civic-sign", o.position.set(0, 4.15, r + 1.55), e.add(o);
  const a = new ye();
  a.name = "mask-medallion", a.position.set(3.6, 5.15, r + 0.22);
  const c = new oe(new ln(1.25, 1.25, 0.36, 24), i.bronze);
  c.rotation.x = Math.PI / 2, a.add(c);
  for (let h = 0; h < 12; h++) {
    const u = h / 12 * Math.PI * 2, d = R("mane", [0.22, 0.58, 0.28], [Math.sin(u) * 1.05, Math.cos(u) * 1.05, 0.22], i.bronze);
    d.rotation.z = -u, a.add(d);
  }
  a.add(R("mask", [0.82, 1.05, 0.42], [0, -0.02, 0.32], i.stone)), a.add(R("brow", [0.7, 0.12, 0.16], [0, 0.28, 0.5], i.bronze)), a.add(R("eye-l", [0.18, 0.1, 0.08], [-0.2, 0.12, 0.52], i.metalDark)), a.add(R("eye-r", [0.18, 0.1, 0.08], [0.2, 0.12, 0.52], i.metalDark)), a.add(R("muzzle", [0.36, 0.28, 0.2], [0, -0.22, 0.52], i.bronze)), e.add(a), Kt(e, i, { x: -3.4, y: 5.5, w: 1.35, h: 1.7, zOuter: r }), Kt(e, i, { x: -1.4, y: 5.5, w: 1.15, h: 1.7, zOuter: r }), Kt(e, i, { x: 2.35, y: 1.9, w: 1.15, h: 1.45, zOuter: r });
  const l = new ye();
  l.name = "civic-rear", l.position.set(0, 0, -s / 2), l.rotation.y = Math.PI, Kt(l, i, { x: -3.2, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Kt(l, i, { x: 0, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Kt(l, i, { x: 3.2, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Kt(l, i, { x: -3.2, y: 5.6, w: 1.15, h: 1.05, zOuter: 0.02 }), Kt(l, i, { x: 3.2, y: 5.6, w: 1.15, h: 1.05, zOuter: 0.02 }), l.add(R("rear-door", [1.4, 2.3, 0.08], [0, 1.55, 0.04], i.woodDark)), e.add(l);
  for (const h of [-1, 1]) {
    const u = new ye();
    u.position.set(h * (t / 2), 0, 0), u.rotation.y = h > 0 ? Math.PI / 2 : -Math.PI / 2, Kt(u, i, { x: -1.6, y: 3.3, w: 1.1, h: 1.7, zOuter: 0.02 }), Kt(u, i, { x: 1.6, y: 3.3, w: 1.1, h: 1.7, zOuter: 0.02 }), Kt(u, i, { x: 0, y: 5.5, w: 1.3, h: 1.15, zOuter: 0.02 }), e.add(u);
  }
  return It(e, new M(0, 2, r + 1.2)), Rt(e), e;
}
function Ya(i, { id: e = "car-sedan", paint: t = null } = {}) {
  const n = new ye();
  Tt(n, {
    id: e,
    kind: "vehicle",
    assumption: "仮。車に撥ねられるカオス用セダン。リアルなプロポーションとディテールを強化。",
    gameplay: { hazard: "traffic" }
  });
  const s = t || i.paintCar, r = 4.38, o = 1.74, a = 1.44, c = 2.65, l = 1.48;
  n.add(R("chassis", [o - 0.2, 0.16, r - 0.6], [0, 0.22, 0], i.metalDark)), n.add(R("nose", [o - 0.08, 0.44, 0.95], [0, 0.48, r / 2 - 0.52], s)), n.add(R("hood", [o - 0.12, 0.08, 1.25], [0, 0.72, 1.15], s)), n.add(R("body-mid", [o, 0.48, 2.1], [0, 0.5, 0.05], s)), n.add(R("side-mold-l", [0.03, 0.04, 2], [-o / 2 - 0.01, 0.46, 0.05], i.carTrimBlack)), n.add(R("side-mold-r", [0.03, 0.04, 2], [o / 2 + 0.01, 0.46, 0.05], i.carTrimBlack)), [
    [-o / 2 - 0.02, 0.64, 0.45],
    [-o / 2 - 0.02, 0.64, -0.45],
    [o / 2 + 0.02, 0.64, 0.45],
    [o / 2 + 0.02, 0.64, -0.45]
  ].forEach(([q, pe, le], me) => {
    n.add(R(`handle-${me}`, [0.02, 0.035, 0.14], [q, pe, le], i.trim));
  }), n.add(R("trunk-lid", [o - 0.12, 0.08, 0.85], [0, 0.75, -r / 2 + 0.5], s)), n.add(R("tail-block", [o - 0.08, 0.46, 0.85], [0, 0.5, -r / 2 + 0.5], s)), n.add(R("roof", [a, 0.06, 1.55], [0, 1.38, -0.15], s));
  const u = R("pillar-a-l", [0.06, 0.06, 0.82], [-a / 2 + 0.03, 1.05, 0.85], s);
  u.rotation.x = -0.58, u.rotation.z = -0.12;
  const d = R("pillar-a-r", [0.06, 0.06, 0.82], [a / 2 - 0.03, 1.05, 0.85], s);
  d.rotation.x = -0.58, d.rotation.z = 0.12, n.add(u, d), n.add(R("pillar-b-l", [0.04, 0.58, 0.08], [-a / 2 + 0.02, 1.08, -0.12], i.carTrimBlack)), n.add(R("pillar-b-r", [0.04, 0.58, 0.08], [a / 2 - 0.02, 1.08, -0.12], i.carTrimBlack));
  const f = R("pillar-c-l", [0.08, 0.08, 0.85], [-a / 2 + 0.04, 1.06, -1.05], s);
  f.rotation.x = 0.62, f.rotation.z = -0.12;
  const g = R("pillar-c-r", [0.08, 0.08, 0.85], [a / 2 - 0.04, 1.06, -1.05], s);
  g.rotation.x = 0.62, g.rotation.z = 0.12, n.add(f, g);
  const _ = R("windshield", [a - 0.1, 0.03, 0.84], [0, 1.05, 0.82], i.carGlass);
  _.rotation.x = -0.58, n.add(_);
  const m = R("rear-glass", [a - 0.12, 0.03, 0.86], [0, 1.06, -1.04], i.carGlass);
  m.rotation.x = 0.62, n.add(m);
  const p = R("side-glass-l", [0.02, 0.46, 1.62], [-a / 2 + 0.04, 1.07, -0.12], i.carGlass), x = R("side-glass-r", [0.02, 0.46, 1.62], [a / 2 - 0.04, 1.07, -0.12], i.carGlass);
  n.add(p, x);
  const y = R("mirror-l", [0.18, 0.11, 0.12], [-o / 2 - 0.08, 0.88, 0.65], s);
  y.add(R("mirror-glass-l", [0.01, 0.09, 0.1], [0.085, 0, 0], i.mirrorGlass));
  const v = R("mirror-r", [0.18, 0.11, 0.12], [o / 2 + 0.08, 0.88, 0.65], s);
  v.add(R("mirror-glass-r", [0.01, 0.09, 0.1], [-0.085, 0, 0], i.mirrorGlass)), n.add(y, v), n.add(R("bumper-f", [o + 0.02, 0.22, 0.22], [0, 0.36, r / 2 - 0.02], i.carTrimBlack)), n.add(R("bumper-f-lower", [o - 0.15, 0.12, 0.18], [0, 0.22, r / 2 - 0.04], i.carTrimBlack)), n.add(R("bumper-r", [o + 0.02, 0.24, 0.24], [0, 0.38, -r / 2 + 0.02], i.carTrimBlack)), n.add(R("grille", [0.82, 0.16, 0.06], [0, 0.54, r / 2 + 0.02], i.metalDark)), n.add(R("grille-chrome", [0.86, 0.02, 0.08], [0, 0.62, r / 2 + 0.02], i.trim));
  const P = 0.32, A = 0.14, C = R("headlamp-l", [P, A, 0.08], [-0.58, 0.56, r / 2 - 0.02], i.headlampInner);
  C.add(R("hl-lens-l", [P - 0.02, A - 0.02, 0.02], [0, 0, 0.045], i.headlampGlass)), C.add(R("turn-f-l", [0.08, A - 0.02, 0.03], [-P / 2 + 0.04, 0, 0.04], i.turnAmber));
  const I = R("headlamp-r", [P, A, 0.08], [0.58, 0.56, r / 2 - 0.02], i.headlampInner);
  I.add(R("hl-lens-r", [P - 0.02, A - 0.02, 0.02], [0, 0, 0.045], i.headlampGlass)), I.add(R("turn-f-r", [0.08, A - 0.02, 0.03], [P / 2 - 0.04, 0, 0.04], i.turnAmber)), n.add(C, I);
  const w = 0.38, S = 0.16, D = R("taillamp-l", [w, S, 0.06], [-0.58, 0.58, -r / 2 + 0.02], i.tailRed);
  D.add(R("turn-r-l", [0.1, S * 0.45, 0.02], [-w / 2 + 0.06, S * 0.22, -0.025], i.turnAmber)), D.add(R("rev-r-l", [0.1, S * 0.45, 0.02], [-w / 2 + 0.06, -S * 0.22, -0.025], i.reverseWhite));
  const W = R("taillamp-r", [w, S, 0.06], [0.58, 0.58, -r / 2 + 0.02], i.tailRed);
  W.add(R("turn-r-r", [0.1, S * 0.45, 0.02], [w / 2 - 0.06, S * 0.22, -0.025], i.turnAmber)), W.add(R("rev-r-r", [0.1, S * 0.45, 0.02], [w / 2 - 0.06, -S * 0.22, -0.025], i.reverseWhite)), n.add(D, W);
  const H = R("plate-f", [0.36, 0.18, 0.02], [0, 0.32, r / 2 + 0.1], i.plateWhite);
  H.add(R("plate-border-f", [0.34, 0.16, 0.01], [0, 0, 0.01], i.plateGreen));
  const Y = R("plate-r", [0.36, 0.18, 0.02], [0, 0.42, -r / 2 - 0.1], i.plateWhite);
  Y.add(R("plate-border-r", [0.34, 0.16, 0.01], [0, 0, -0.01], i.plateGreen)), n.add(H, Y);
  const J = 0.31, K = 0.22;
  return [
    [-l / 2, c / 2],
    [l / 2, c / 2],
    [-l / 2, -c / 2],
    [l / 2, -c / 2]
  ].forEach(([q, pe], le) => {
    const me = new ye();
    me.position.set(q, J, pe);
    const Oe = new oe(new ln(J, J, K, 20), i.tire);
    Oe.rotation.z = Math.PI / 2, Oe.castShadow = !0, me.add(Oe);
    const Ye = new oe(new ln(0.21, 0.21, K + 0.01, 16), i.wheelAlloy);
    Ye.rotation.z = Math.PI / 2, me.add(Ye);
    const j = new oe(new ln(0.08, 0.08, K + 0.02, 10), i.trim);
    j.rotation.z = Math.PI / 2, me.add(j);
    const ie = new oe(new ln(0.16, 0.16, K - 0.04, 12), i.brakeDisc);
    ie.rotation.z = Math.PI / 2, me.add(ie), me.name = `wheel-${le}`, n.add(me);
  }), It(n, new M(0, 0.7, r / 2 + 0.2)), Rt(n), n;
}
function Zr(i, e = "tree-street", { scale: t = 1, isPark: n = !1 } = {}) {
  const s = new ye();
  Tt(s, {
    id: e,
    kind: "plant",
    assumption: "仮。癒やしは景観だけ。リアルな樹形・枝分かれ・木漏れ日感を持つ樹木。"
  });
  const r = t, o = n ? 0.08 : 0.4;
  return n ? s.add(it("mound", 1.8 * r, 2.2 * r, 0.18, [0, 0.09, 0], i.soil, 14)) : (s.add(R("planter", [1.5, 0.38, 1.5], [0, 0.19, 0], i.concretePlain)), s.add(R("soil", [1.3, 0.06, 1.3], [0, 0.38, 0], i.soil)), s.add(R("grill-a", [1.32, 0.02, 0.15], [0, 0.4, 0.5], i.metalDark)), s.add(R("grill-b", [1.32, 0.02, 0.15], [0, 0.4, -0.5], i.metalDark)), s.add(R("grill-c", [0.15, 0.02, 1.32], [0.5, 0.4, 0], i.metalDark)), s.add(R("grill-d", [0.15, 0.02, 1.32], [-0.5, 0.4, 0], i.metalDark))), s.add(it("root-flare", 0.24 * r, 0.36 * r, 0.6 * r, [0, o + 0.3 * r, 0], i.bark, 10)), s.add(it("trunk-mid", 0.18 * r, 0.24 * r, 1.6 * r, [0.04 * r, o + 1.3 * r, 0.02 * r], i.bark, 10)), s.add(it("trunk-upper", 0.14 * r, 0.18 * r, 1.4 * r, [-0.02 * r, o + 2.7 * r, -0.04 * r], i.barkBranch, 8)), [
    { start: [0.02, o + 2.4 * r, 0], angleY: 0.2, angleZ: 0.65, length: 1.6 * r, thick: 0.1 * r },
    { start: [-0.04, o + 2.8 * r, 0.04], angleY: 2.3, angleZ: 0.72, length: 1.7 * r, thick: 0.09 * r },
    { start: [0.03, o + 3.1 * r, -0.05], angleY: -1.9, angleZ: 0.6, length: 1.5 * r, thick: 0.08 * r },
    { start: [0, o + 3.5 * r, 0], angleY: 0.8, angleZ: 0.45, length: 1.4 * r, thick: 0.07 * r }
  ].forEach((l, h) => {
    const u = it(`branch-${h}`, l.thick * 0.7, l.thick, l.length, [0, l.length / 2, 0], i.barkBranch, 6), d = new ye();
    d.position.set(...l.start), d.rotation.y = l.angleY, d.rotation.z = l.angleZ, d.add(u), s.add(d);
  }), [
    // トップ（太陽の光を受ける明るい黄緑・木漏れ日ハイライト）
    [0, o + 4.8 * r, 0, 1.1 * r, 0.7 * r, 1.1 * r, i.leafSun],
    [0.4 * r, o + 5.1 * r, 0.2 * r, 0.85 * r, 0.6 * r, 0.85 * r, i.leafSun],
    [-0.3 * r, o + 5 * r, -0.3 * r, 0.8 * r, 0.55 * r, 0.8 * r, i.leafSun],
    // 上層・外周（みずみずしい緑）
    [1.1 * r, o + 4.2 * r, 0.4 * r, 0.95 * r, 0.65 * r, 0.9 * r, i.leafA],
    [-1.2 * r, o + 4.3 * r, 0.5 * r, 1 * r, 0.7 * r, 0.95 * r, i.leafA],
    [0.3 * r, o + 4.4 * r, -1.2 * r, 0.95 * r, 0.65 * r, 1 * r, i.leafA],
    [-0.5 * r, o + 4.5 * r, 1.1 * r, 0.9 * r, 0.6 * r, 0.9 * r, i.leafA],
    [0.8 * r, o + 4.6 * r, -0.8 * r, 0.85 * r, 0.55 * r, 0.85 * r, i.leafA],
    // 中層（メインボリューム）
    [1.4 * r, o + 3.4 * r, 0.2 * r, 1.05 * r, 0.7 * r, 1 * r, i.leafB],
    [-1.5 * r, o + 3.5 * r, -0.3 * r, 1.1 * r, 0.75 * r, 1.05 * r, i.leafB],
    [0.2 * r, o + 3.6 * r, 1.4 * r, 1.05 * r, 0.7 * r, 1 * r, i.leafB],
    [-0.3 * r, o + 3.5 * r, -1.4 * r, 1 * r, 0.7 * r, 1.05 * r, i.leafB],
    [1.1 * r, o + 3.7 * r, -1 * r, 0.9 * r, 0.65 * r, 0.9 * r, i.leafB],
    [-1 * r, o + 3.6 * r, 1 * r, 0.95 * r, 0.65 * r, 0.95 * r, i.leafB],
    // 下層・内側（影になる深い緑）
    [0.9 * r, o + 2.7 * r, 0.5 * r, 0.85 * r, 0.55 * r, 0.85 * r, i.leafC],
    [-1 * r, o + 2.8 * r, -0.4 * r, 0.9 * r, 0.55 * r, 0.9 * r, i.leafC],
    [0.4 * r, o + 2.6 * r, -0.9 * r, 0.8 * r, 0.5 * r, 0.8 * r, i.leafC],
    [-0.3 * r, o + 2.7 * r, 0.9 * r, 0.8 * r, 0.5 * r, 0.85 * r, i.leafC],
    [0, o + 3.2 * r, 0, 1.1 * r, 0.8 * r, 1.1 * r, i.leafC]
  ].forEach(([l, h, u, d, f, g, _], m) => {
    const p = new Ts(1, 1), x = new oe(p, _);
    x.position.set(l, h, u), x.scale.set(d, f, g), x.rotation.set(m * 0.4 % 0.5, m * 0.7 % 0.8, m * 0.3 % 0.4), x.castShadow = !0, x.receiveShadow = !0, x.name = `foliage-${m}`, s.add(x);
  }), It(s, new M(0, 1.4 * r, 1 * r)), Rt(s), s;
}
function Ql(i, e) {
  const t = new ye();
  return Tt(t, { id: e, kind: "street-furniture" }), t.add(it("shaft", 0.11, 0.16, 7.1, [0, 3.55, 0], i.concretePlain, 8)), t.add(R("arm", [1.7, 0.08, 0.1], [0, 6.45, 0], i.metalDark)), t.add(it("ins-l", 0.07, 0.09, 0.18, [-0.7, 6.58, 0], i.pad, 8)), t.add(it("ins-r", 0.07, 0.09, 0.18, [0.7, 6.58, 0], i.pad, 8)), t.add(R("transformer", [0.52, 0.38, 0.42], [0.2, 5.45, 0], i.metal)), It(t, new M(0, 2, 0.25)), Rt(t), t;
}
function ns(i, e, t, n) {
  const s = new ye();
  Tt(s, { id: n, kind: "wire", grounded: !1 });
  const r = nu(e.clone(), t.clone(), 0.55, 16), o = new oe(new ro(r, 24, 0.015, 5, !1), i.metalDark);
  return o.name = "wire", s.add(o), It(s, e.clone().lerp(t, 0.5)), Rt(s), s;
}
function sx(i) {
  const e = new ye();
  Tt(e, {
    id: "prop-vending",
    kind: "prop",
    assumption: "仮。食べ物ドロップのある町の自販機。銘柄は作っていない。"
  }), e.add(R("body", [0.9, 1.82, 0.72], [0, 0.91, 0], i.metal)), e.add(R("glass", [0.7, 0.95, 0.04], [0, 1.15, 0.37], i.glass));
  for (let t = 0; t < 3; t++)
    for (let n = 0; n < 3; n++) {
      const s = new oe(new Ms(0.045, 0.12, 3, 6), t === 1 ? i.bottleGreen : i.bottle);
      s.position.set(-0.2 + n * 0.2, 1.35 - t * 0.28, 0.28), s.name = "bottle", e.add(s);
    }
  return e.add(R("slot", [0.28, 0.16, 0.04], [0.2, 0.55, 0.37], i.metalDark)), It(e, new M(0, 1, 0.4)), Rt(e), e;
}
function rx(i, e, t, n) {
  i.add(R("bollard-base", [0.38, 0.08, 0.38], [t, 0.04, n], e.concretePlain)), i.add(it("bollard", 0.06, 0.07, 1.5, [t, 0.83, n], e.cable, 8)), i.add(R("bollard-cap", [0.14, 0.05, 0.14], [t, 1.58, n], e.metalDark));
}
function $o(i, e, t, n, s) {
  const r = [0.72, 1.05, 1.38], o = [e.cable, e.cable, e.cableWarn], a = ["cable-low", "cable-mid", "cable-high"];
  r.forEach((c, l) => {
    const h = t.clone(), u = n.clone();
    h.y = c, u.y = c;
    const d = nu(h, u, s, 18), f = new oe(new ro(d, 28, 0.018, 6, !1), o[l]);
    f.name = a[l], f.castShadow = !0, i.add(f);
  });
}
function ox(i) {
  const e = new ye();
  Tt(e, {
    id: "fight-ring-cables",
    kind: "wrestling-rope",
    assumption: "仮。歩行者区画へ車を入れない防護ケーブルで、三本ロープとして使う。赤白青のリングロープではない。店側は壁が第四の辺。条例でも、誰かが自費で打った杭でもない。高さはトップロープに合わせたまま。",
    gameplay: { use: "hammer-throw", clearWidth: 8, clearDepth: 5.6 }
  });
  const t = [[-4, -2.6], [-4, 3], [4, -2.6], [4, 3]];
  for (const [s, r] of t) rx(e, i, s, r);
  $o(e, i, new M(-4, 0, -2.6), new M(-4, 0, 3), 0.1), $o(e, i, new M(4, 0, -2.6), new M(4, 0, 3), 0.1), $o(e, i, new M(-4, 0, 3), new M(4, 0, 3), 0.16);
  const n = new oe(new mt(0.64, 0.4, 0.045), i.signNoVehicle);
  return n.name = "vehicle-ban", n.position.set(3.55, 1.12, 3.28), n.castShadow = !0, e.add(n), It(e, new M(0, 1, -2.7)), Rt(e), e;
}
function ax(i) {
  const e = new ye();
  return Tt(e, {
    id: "floor-soft-cardboard",
    kind: "floor",
    gameplay: { floorHardness: "soft" },
    assumption: "仮。柔らかい床は店先の段ボールとパレット。試合マットは置かない。"
  }), e.add(R("pallet", [1.3, 0.12, 1.05], [0, 0.06, 0], i.wood)), [[-0.28, 0.28, -0.1], [0.22, 0.42, 0.12], [0.02, 0.62, -0.05], [-0.12, 0.22, 0.22], [0.3, 0.2, -0.2]].forEach((n, s) => {
    const r = R("carton", [0.52, 0.28, 0.4], [n[0], n[1], n[2]], i.cardboard);
    r.rotation.y = s * 0.4, e.add(r);
  }), e.traverse((n) => {
    n.isMesh && Ht(n, "soft");
  }), It(e, new M(0, 0.4, 0.55)), Rt(e), e;
}
function cx(i) {
  const e = new ye();
  Tt(e, {
    id: "floor-hard-plate",
    kind: "floor",
    gameplay: { floorHardness: "hard" },
    assumption: "仮。硬い床は車道の敷鉄板とマンホール。即死級ダメージ側。"
  }), e.add(R("plate", [2.6, 0.03, 1.5], [0, 0.015, 0], i.plate));
  for (let t = -2; t <= 2; t++)
    e.add(R("ridge", [2.4, 0.012, 0.04], [0, 0.034, t * 0.28], i.metalDark));
  return e.traverse((t) => {
    t.isMesh && Ht(t, "hard");
  }), It(e, new M(0, 0.05, 0.8)), Rt(e), e;
}
function lx(i) {
  const e = new ye();
  Tt(e, {
    id: "prop-pole-gong",
    kind: "prop",
    grounded: !1,
    assumption: "仮。レフェリーは喧嘩が始まると現れる。歩道にスツールは置かない。電柱の赤い箱はこの町が喧嘩を前提にしているという小道具で、制度としては未設定。"
  }), e.add(R("housing", [0.32, 0.46, 0.16], [0, 1.55, 0], i.gongBox));
  const t = new oe(new rn(0.22, 0.3), i.glass);
  t.position.set(0, 1.58, 0.082), t.name = "gong-door", e.add(t);
  const n = new oe(new In(0.06, 8, 6), i.brass);
  return n.position.set(0, 1.62, 0.04), n.name = "bell", e.add(n), It(e, new M(0, 1.55, 0.12)), Rt(e), e;
}
function hx() {
  const i = new ye();
  Tt(i, {
    id: "scale-reference",
    kind: "scale",
    assumption: "寸法確認用。キャラクターアセットではない。身長1.75m。"
  });
  const e = new se({ color: "#8a8175", roughness: 0.8 }), t = new oe(new Ms(0.18, 1.05, 4, 8), e);
  t.position.y = 0.705, t.name = "body", i.add(t);
  const n = new oe(new In(0.14, 12, 10), e);
  return n.position.y = 1.56, n.name = "head", i.add(n), i.add(R("band", [0.18, 0.045, 0.18], [0, 1.66, 0], new se({ color: "#c43838" }))), It(i, new M(0, 1.5, 0.16)), Rt(i), i;
}
function ux() {
  const i = new ye();
  Tt(i, {
    id: "fight-dummies",
    kind: "debug",
    grounded: !1,
    assumption: "仮。UEのカプセル寸法（半径0.42m、半高0.96m）を置いた確認用の塊。キャラクターではない。"
  });
  const e = [
    { name: "dummy-a", x: 0.9, z: -3.1, color: "#7a8698" },
    { name: "dummy-b", x: 3.6, z: -2, color: "#96705c" }
  ];
  for (const t of e) {
    const n = new se({ color: t.color, roughness: 0.75 }), s = new oe(new Ms(0.42, 1.08, 4, 12), n);
    s.name = t.name, s.position.set(t.x, 0.96 + 0.16, t.z), s.castShadow = !0, s.userData.debugDummy = !0, s.userData.capsule = { radius: 0.42, halfHeight: 0.96 }, i.add(s);
    const r = new oe(
      new fc(0.36, 0.42, 20),
      new gi({ color: t.color, transparent: !0, opacity: 0.55, side: Zt })
    );
    r.name = `${t.name}-footprint`, r.rotation.x = -Math.PI / 2, r.position.set(t.x, 0.171, t.z), i.add(r);
    const o = new oe(
      new ln(0.435, 0.435, 0.07, 16, 1, !0),
      new se({ color: "#2b2b2b", roughness: 0.8, side: Zt })
    );
    o.name = `${t.name}-band`, o.position.set(t.x, 1.3, t.z), i.add(o);
  }
  return It(i, new M(0, 1.92, 0)), i;
}
const dx = 0.16;
function fx(i, e, t) {
  const n = i.clone();
  return i.map && (n.map = i.map.clone(), n.map.repeat.set(e, t), n.map.wrapS = $t, n.map.wrapT = $t), n;
}
function px(i, e, t) {
  const n = i.userData.localSize[2];
  i.rotation.y = Math.PI, i.position.set(e, dx, t + n / 2);
}
function mx(i, e, t) {
  const n = i.userData.localSize[2];
  i.rotation.y = -Math.PI / 2, i.position.set(e + n / 2, 0, t);
}
function gx(i) {
  const e = new ye();
  e.name = "opposite-row";
  const t = 11.45, n = [
    {
      id: "building-row-shop",
      width: 4.4,
      depth: 5,
      floors: 3,
      wall: "plasterC",
      awning: i.shutterAwning,
      ground: "shop",
      x: -9.4,
      assumption: "仮。生活の店。事件の場所でも店名でもない。"
    },
    {
      id: "building-row-diner",
      width: 5.6,
      depth: 5.2,
      floors: 2,
      wall: "plasterA",
      awning: i.dinerAwning,
      ground: "diner",
      side: "left",
      x: -3,
      assumption: "仮。飲食のある店。固有の店名は未設定。"
    },
    {
      id: "building-row-office",
      width: 7.2,
      depth: 6,
      floors: 4,
      wall: "plasterB",
      ground: "office",
      side: "right",
      x: 5.2,
      assumption: "仮。サイドの会社の塊。社名は未設定。コブラ会のフロントでもない。"
    },
    {
      id: "building-row-hangout",
      width: 4.8,
      depth: 4.8,
      floors: 2,
      wall: "plasterC",
      awning: i.hangoutAwning,
      ground: "hangout",
      x: 12.6,
      assumption: "仮。たまり場に見える店。試合会場でも店名でもない。"
    },
    {
      id: "building-row-east",
      width: 4.2,
      depth: 5.4,
      floors: 3,
      wall: "plasterA",
      awning: i.shutterAwning,
      ground: "shop",
      x: 18.6,
      // pass9: this one steps back 0.4m from the rest of the row. It only widens the
      // walk, never narrows it, and no row building moves toward the road.
      frontShift: 0.4,
      assumption: "仮。向かいの通りを閉じる店。事件の場所ではない。"
    }
  ];
  for (const s of n) {
    const r = cu(i, s);
    px(r, s.x, t + (s.frontShift || 0)), e.add(r);
  }
  return e;
}
function _x(i) {
  const e = new ye();
  e.name = "far-bank";
  const t = 43.15, n = [
    {
      id: "building-far-south",
      width: 5.2,
      depth: 4.6,
      floors: 2,
      wall: "plasterB",
      awning: i.dinerAwning,
      ground: "diner",
      z: 0.4,
      assumption: "仮。川向こうの店。固有名も事件の場所も未設定。"
    },
    {
      id: "building-far-north",
      width: 6.4,
      depth: 5,
      floors: 3,
      wall: "plasterC",
      ground: "office",
      z: 8.4,
      // pass9: the two canal-side buildings no longer sit on one line.
      frontShift: 0.45,
      assumption: "仮。川向こうの建物。社名は未設定。"
    }
  ];
  for (const s of n) {
    const r = cu(i, s);
    mx(r, t + (s.frontShift || 0), s.z), e.add(r);
  }
  return e;
}
function vx(i) {
  const e = new ye();
  Tt(e, {
    id: "alley-loop",
    kind: "ground",
    assumption: "仮。表の歩道、店と店の隙間、裏、西側の空き地を一周できる。事件の特定場所ではない。"
  });
  const t = fx(i.concrete, 6, 2), n = (h, u, d, f = "hard") => {
    const g = R(h, u, d, t);
    e.add(Ht(g, f));
  };
  n("alley-back", [26.2, 0.08, 4.3], [-1.1, 0.04, -15.45]), n("alley-shutter-fill", [5.3, 0.08, 0.7], [6.75, 0.04, -13.05]), n("gap-produce", [4, 0.08, 7.15], [-4.45, 0.04, -9.6]), n("return-west", [2.35, 0.08, 11.4], [-13.075, 0.04, -11.7]), n("return-east", [2.65, 0.08, 11.2], [10.675, 0.04, -11.65]), n("lot", [7.4, 0.08, 8.8], [-16.1, 0.04, -13]), n("lot-spur", [4.6, 0.08, 10.2], [-16.8, 0.04, -2.9]), n("walk-opposite", [34, 0.16, 1.35], [4.2, 0.08, 11.85]);
  const s = new ye();
  s.name = "trash-cage", s.position.set(-8.6, 0, -14.15), s.add(R("pad", [1.45, 0.08, 1.05], [0, 0.04, 0], i.concretePlain)), s.add(R("post-a", [0.06, 1.05, 0.06], [-0.66, 0.58, -0.46], i.metalDark)), s.add(R("post-b", [0.06, 1.05, 0.06], [0.66, 0.58, -0.46], i.metalDark)), s.add(R("post-c", [0.06, 1.05, 0.06], [-0.66, 0.58, 0.46], i.metalDark)), s.add(R("post-d", [0.06, 1.05, 0.06], [0.66, 0.58, 0.46], i.metalDark)), s.add(R("rail", [1.4, 0.05, 0.05], [0, 1.05, -0.46], i.metalDark)), s.add(R("bag", [0.55, 0.42, 0.38], [-0.2, 0.32, 0], i.metal)), s.add(R("bag-b", [0.4, 0.3, 0.32], [0.28, 0.26, 0.1], i.cardboard)), e.add(s);
  const r = new ye();
  r.name = "outdoor-ac", r.position.set(1.7, 0, -14.05), r.add(R("pad", [0.95, 0.08, 0.58], [0, 0.04, 0], i.concretePlain)), r.add(R("body", [0.82, 0.58, 0.4], [0, 0.4, 0], i.metal));
  const o = new oe(new As(0.14, 0.018, 6, 12), i.metalDark);
  o.position.set(0, 0.42, 0.21), o.name = "fan", r.add(o), e.add(r);
  const a = new ye();
  a.name = "service-pipe", a.position.set(7.4, 0, -13.55), a.add(R("foot", [0.28, 0.08, 0.28], [0, 0.04, 0], i.concretePlain)), a.add(it("riser", 0.05, 0.05, 1.7, [0, 0.9, 0], i.metal, 8));
  const c = it("run", 0.045, 0.045, 3.2, [1.5, 1.55, 0], i.metal, 8);
  return c.rotation.z = Math.PI / 2, a.add(c), e.add(a), [
    [-9.2, -13.08],
    [0.4, -13.28],
    [7.6, -12.9]
  ].forEach(([h, u], d) => {
    const f = R(`service-door-${d}`, [0.9, 2.05, 0.07], [h, 1.18, u], i.metalDark);
    e.add(f);
  }), It(e, new M(-3.55, 0.4, -6.2)), Rt(e), e;
}
function xx(i) {
  const e = new ye();
  Tt(e, {
    id: "healing-park",
    kind: "scenery",
    assumption: "仮。喧嘩の通りに対する景観。公園の固有名は未設定。癒しは景色だけで、ここで事件は起きない設定にはしていない。"
  }), e.add(Ht(R("lawn", [11.2, 0.06, 8.2], [28.4, 0.04, 14.7], i.grass), "soft")), e.add(Ht(R("path", [1.4, 0.06, 7.6], [27.2, 0.05, 14.4], i.concretePlain), "hard")), e.add(Ht(R("bed-a", [2.4, 0.28, 1.1], [30.6, 0.14, 12.2], i.soil), "normal")), e.add(Ht(R("bed-b", [1.8, 0.28, 1.1], [32.4, 0.14, 16.6], i.soil), "normal"));
  for (let n = 0; n < 7; n++) {
    const s = new oe(new In(0.12, 8, 6), n % 2 ? i.flower : i.flowerB);
    s.position.set(29.7 + n % 4 * 0.35, 0.38, 12 + Math.floor(n / 4) * 0.28), s.name = "flower", e.add(s);
  }
  for (let n = 0; n < 5; n++) {
    const s = new oe(new In(0.11, 8, 6), i.flower);
    s.position.set(31.8 + n % 3 * 0.32, 0.36, 16.45), s.name = "flower", e.add(s);
  }
  return e.add(R("bench-seat", [1.5, 0.06, 0.42], [26.2, 0.48, 12.4], i.wood)), e.add(R("bench-back", [1.5, 0.4, 0.06], [26.2, 0.72, 12.2], i.woodDark)), e.add(R("bench-leg", [0.08, 0.42, 0.36], [25.6, 0.24, 12.4], i.metalDark)), e.add(R("bench-leg-b", [0.08, 0.42, 0.36], [26.8, 0.24, 12.4], i.metalDark)), e.add(R("bench-seat-b", [1.4, 0.06, 0.42], [31.5, 0.48, 17.4], i.wood)), e.add(R("bench-leg-c", [0.08, 0.42, 0.36], [31, 0.24, 17.4], i.metalDark)), e.add(R("bench-leg-d", [0.08, 0.42, 0.36], [32, 0.24, 17.4], i.metalDark)), e.add(it("basin", 1.15, 1.25, 0.38, [29.4, 0.2, 15.6], i.concretePlain, 16)), e.add(it("pool", 0.85, 0.85, 0.08, [29.4, 0.38, 15.6], i.water, 16)), e.add(it("jet", 0.06, 0.1, 0.55, [29.4, 0.62, 15.6], i.stone, 8)), [[24.8, 12.6], [33.6, 13.2], [26.4, 17.6]].forEach(([n, s], r) => {
    e.add(it(`lamp-pole-${r}`, 0.06, 0.08, 3.1, [n, 1.55, s], i.metalDark, 8));
    const o = new oe(new In(0.16, 10, 8), i.lantern);
    o.position.set(n, 3.15, s), o.name = "lamp-head", e.add(o);
    const a = new mc("#ffb56a", 0.55, 7, 2);
    a.position.set(n, 3, s), e.add(a);
  }), It(e, new M(27, 1, 11.2)), Rt(e), e;
}
function yx(i) {
  const e = new ye();
  Tt(e, {
    id: "scenery-canal",
    kind: "scenery",
    assumption: "仮。通りの東を川と人道橋で閉じる。川の名も、ここで落ちるイベントも未設定。町は橋の向こうへ続いている。"
  }), e.add(R("bed", [7.2, 0.06, 24], [38.4, 0.03, 5], i.waterBed)), e.add(R("water", [6.2, 0.08, 22.5], [38.4, 0.1, 5], i.water)), e.add(R("bank-west-s", [0.55, 0.48, 8.6], [34.85, 0.24, -2.9], i.concretePlain)), e.add(R("bank-west-n", [0.55, 0.48, 11.6], [34.85, 0.24, 11], i.concretePlain)), e.add(R("bank-east-s", [0.55, 0.48, 8.6], [41.95, 0.24, -2.9], i.concretePlain)), e.add(R("bank-east-n", [0.55, 0.48, 11.6], [41.95, 0.24, 11], i.concretePlain)), e.add(R("bank-gap-s", [6.4, 0.42, 3.4], [38.4, 0.21, -0.7], i.concretePlain)), e.add(R("bank-gap-n", [6.4, 0.42, 9.8], [38.4, 0.21, 9.9], i.concretePlain)), e.add(Ht(R("deck", [9.6, 0.14, 3.5], [38.2, 0.24, 3.2], i.concretePlain), "hard")), e.add(Ht(R("approach", [2.4, 0.12, 3.5], [32.6, 0.12, 3.2], i.concretePlain), "hard")), e.add(R("rail-n", [9.4, 0.08, 0.08], [38.2, 0.78, 4.8], i.metalDark)), e.add(R("rail-s", [9.4, 0.08, 0.08], [38.2, 0.78, 1.6], i.metalDark));
  for (const t of [34, 38.2, 42.2])
    e.add(R("rail-post", [0.08, 0.62, 0.08], [t, 0.55, 4.8], i.metalDark)), e.add(R("rail-post-s", [0.08, 0.62, 0.08], [t, 0.55, 1.6], i.metalDark));
  return e.add(it("bollard-a", 0.12, 0.14, 0.85, [33.4, 0.42, 1.15], i.concretePlain, 8)), e.add(it("bollard-b", 0.12, 0.14, 0.85, [33.4, 0.42, 5.35], i.concretePlain, 8)), It(e, new M(33.6, 0.6, 3.2)), Rt(e), e;
}
function Sx(i) {
  const e = new ye();
  Tt(e, {
    id: "road-barricade",
    kind: "street-furniture",
    assumption: "仮。西の車道は町の外へ続いているが、この街区の端で止めている。警察の仕掛けでも事件でもない。"
  }), e.position.set(-29.2, 0, 2.15), e.add(R("plank", [0.14, 0.22, 5.4], [0, 0.86, 0], i.cableWarn)), e.add(R("plank-low", [0.12, 0.16, 5.4], [0, 0.52, 0], i.trim));
  for (const n of [-2.2, 0, 2.2]) {
    const s = R("leg-a", [0.08, 0.9, 0.08], [-0.22, 0.48, n], i.metalDark);
    s.rotation.z = 0.22;
    const r = R("leg-b", [0.08, 0.9, 0.08], [0.22, 0.48, n], i.metalDark);
    r.rotation.z = -0.22, e.add(s, r);
  }
  const t = new oe(new mt(0.08, 0.7, 1.3), i.signWorks);
  return t.name = "works-sign", t.position.set(0.2, 1.45, -1.4), e.add(t), It(e, new M(0.4, 1, 0)), Rt(e), e;
}
function bx(i) {
  const e = new ye();
  e.name = "district", e.add(gx(i)), e.add(_x(i)), e.add(vx(i)), e.add(xx(i));
  const t = Zr(i, "tree-park-a", { scale: 1.25, isPark: !0 });
  t.position.set(24.6, 0, 16.8);
  const n = Zr(i, "tree-park-b", { scale: 1.35, isPark: !0 });
  n.position.set(33.2, 0, 16.2);
  const s = Zr(i, "tree-park-c", { scale: 1.15, isPark: !0 });
  s.position.set(31.4, 0, 12.4), e.add(t, n, s), e.add(yx(i)), e.add(Sx(i));
  const r = Ya(i, { id: "car-lot", paint: i.paintCarLot });
  return r.position.set(-16.8, 0, -14.2), e.add(r), e;
}
function Pi(i) {
  return i.userData.ignoreBounds = !0, i.castShadow = !1, i.receiveShadow = !1, i;
}
function wx(i) {
  const e = new ye();
  Tt(e, {
    id: "skyline",
    kind: "backdrop",
    grounded: !1,
    assumption: "仮。地平の虚無を消す遠景。高速道路も塔も、この町の施設としては未設定。遊べる範囲ではない。"
  });
  const t = [
    [-16, 0, -168, 22, 62, 18],
    [22, 0, -182, 20, 84, 18],
    [56, 0, -160, 18, 46, 16],
    [-52, 0, -174, 24, 54, 20],
    [4, 0, 172, 20, 70, 16],
    [-34, 0, 164, 18, 44, 16],
    [46, 0, 180, 22, 52, 18],
    [168, 0, 2, 18, 88, 16],
    [182, 0, 36, 16, 40, 14],
    [156, 0, -30, 20, 36, 16],
    [-162, 0, 8, 18, 72, 18],
    [-176, 0, -28, 22, 38, 16]
  ], n = Gt(Ls("skyline")), s = (a, c) => a + n() * (c - a);
  t.forEach((a, c) => {
    const [l, , h, u, d, f] = a, g = new oe(new mt(u, d, f), i.skyWin);
    g.position.set(l, d / 2, h), g.name = `sil-${c}`, e.add(Pi(g));
    const _ = 1 + Math.floor(n() * 3);
    for (let m = 0; m < _; m++) {
      const p = s(u * 0.2, u * 0.45), x = s(2, d * 0.12), y = new oe(new mt(p, x, s(f * 0.25, f * 0.6)), i.skySil);
      y.position.set(l + s(-u / 2 + p, u / 2 - p), d + x / 2, h + s(-f / 4, f / 4)), y.name = "sky-roof", e.add(Pi(y));
    }
    if (n() < 0.6) {
      const m = new oe(new mt(1.2, s(6, 16), 1.2), i.skySil);
      m.position.set(l + s(-u / 3, u / 3), d + 6, h), m.name = "sky-mast", e.add(Pi(m));
    }
  });
  const r = new oe(new mt(120, 1.1, 8), i.skySil);
  r.position.set(6, 14, -170), r.name = "elevated-deck", e.add(Pi(r));
  for (const a of [-40, -12, 16, 44]) {
    const c = new oe(new mt(2.2, 14, 2.2), i.skySil);
    c.position.set(a, 7, -170), c.name = "pier", e.add(Pi(c));
  }
  const o = new oe(new mt(9, 1.1, 70), i.skySil);
  o.position.set(174, 12, 8), o.name = "elevated-east", e.add(Pi(o));
  for (const a of [-16, 8, 32]) {
    const c = new oe(new mt(2.2, 12, 2.2), i.skySil);
    c.position.set(174, 6, a), c.name = "pier-east", e.add(Pi(c));
  }
  return It(e, new M(0, 8, -40)), Rt(e), Es(e), e;
}
const Tn = 0.16;
function eh(i, e, t) {
  const n = i.clone();
  return i.map && (n.map = i.map.clone(), n.map.repeat.set(e, t), n.map.wrapS = $t, n.map.wrapT = $t), n;
}
function Ex(i) {
  const e = new ye();
  e.name = "street-ground", Tt(e, { id: "street-ground", kind: "ground", grounded: !1 });
  const t = new oe(new rn(300, 300), i.earthGround);
  t.rotation.x = -Math.PI / 2, t.receiveShadow = !0, t.userData.ignoreBounds = !0, t.name = "packed-earth", Ht(t, "normal"), e.add(t);
  const n = eh(i.asphalt, 14, 3), s = new oe(new mt(64, 0.04, 9), n);
  s.position.set(2, 0.02, 3.2), s.receiveShadow = !0, s.name = "road-through", Ht(s, "hard"), e.add(s);
  const r = new oe(new mt(8, 0.04, 14), n);
  r.position.set(-16, 0.025, 9.2), r.receiveShadow = !0, r.name = "road-cross", Ht(r, "hard"), e.add(r);
  const o = eh(i.concrete, 8, 2), a = new oe(new mt(28, 0.16, 4.7), o);
  a.position.set(0.2, 0.08, -3.65), a.receiveShadow = !0, a.name = "sidewalk-shop", Ht(a, "hard"), e.add(a);
  const c = new oe(new mt(36, 0.16, 3.2), o);
  c.position.set(4, 0.08, 9.6), c.receiveShadow = !0, c.name = "sidewalk-far", Ht(c, "hard"), e.add(c), e.add(R("curb-shop", [28, 0.16, 0.16], [0.2, 0.08, -1.2], i.concretePlain)), e.add(R("curb-far", [36, 0.16, 0.16], [4, 0.08, 7.9], i.concretePlain));
  for (let u = 0; u < 8; u++)
    e.add(Ht(R("crosswalk", [0.4, 0.012, 3.2], [-1.4 + u * 0.7, 0.045, 1.2], i.trim), "hard"));
  const l = new oe(new ln(0.55, 0.55, 0.025, 18), i.metalDark);
  l.position.set(-4.2, 0.05, 3.4), l.name = "manhole", Ht(l, "hard"), e.add(l);
  const h = new oe(new mt(0.7, 0.02, 1.4), i.metalDark);
  return h.position.set(4.8, 0.05, -0.9), h.name = "grating", Ht(h, "hard"), e.add(h), e;
}
function Mx(i) {
  const e = new ye();
  e.name = "ring-street-block";
  const t = new ye();
  t.name = "street-core", t.add(Ex(i));
  const n = Zo(i, {
    id: "building-produce",
    width: 5.4,
    depth: 7,
    floors: 3,
    wall: "plasterA",
    awning: i.produce,
    shop: "produce",
    side: "left",
    assumption: "仮。青果は食べ物のある日常の店。固有の店名は未設定。"
  });
  n.position.set(-9.2, Tn, -9.5), t.add(n);
  const s = Zo(i, {
    id: "building-detective",
    width: 6.2,
    depth: 7.2,
    floors: 3,
    wall: "plasterB",
    awning: i.detectiveAwning,
    shop: "detective",
    side: "right",
    gameplay: { role: "player-home" },
    assumption: "看板の「タンク」はデフォルト名。改名できる設定はそのまま。"
  });
  s.position.set(0.8, Tn, -9.6), t.add(s);
  const r = Zo(i, {
    id: "building-shutter",
    width: 5.2,
    depth: 6.8,
    floors: 2,
    wall: "plasterC",
    awning: i.shutterAwning,
    shop: "shutter",
    side: "right",
    assumption: "仮。閉まりかけの店。特定の事件現場ではない。"
  });
  r.position.set(6.75, Tn, -9.4), t.add(r);
  const o = ox(i);
  o.position.set(2.2, Tn, -2.5), t.add(o);
  const a = nx(i);
  a.position.set(6.3, Tn, -6.05), t.add(a);
  const c = ax(i);
  c.position.set(-8.3, Tn, -4.6), t.add(c);
  const l = cx(i);
  l.position.set(0.4, 0.04, 5.4), t.add(l);
  const h = Ya(i, { id: "car-traffic", paint: i.paintCarTraffic });
  h.position.set(-9.5, 0, 4.6), h.rotation.y = Math.PI / 2, t.add(h);
  const u = Ya(i, { id: "car-under-terrace", paint: i.paintCarParked });
  u.position.set(9.4, 0, -2.15), u.rotation.y = Math.PI / 2, t.add(u);
  const d = Zr(i, "tree-street", { scale: 1.05 });
  d.position.set(28.6, 0, 17.2), t.add(d);
  const f = Ql(i, "pole-west");
  f.position.set(-12.5, 0, 8.6), f.rotation.z = 0.013;
  const g = Ql(i, "pole-east");
  g.position.set(16.2, 0, 8.6), g.rotation.z = -9e-3, t.add(f, g);
  const _ = (S, D) => new M(D, 6.58, 0).applyEuler(S.rotation).add(S.position), m = _(f, 0.7), p = _(f, -0.7), x = _(g, -0.7), y = _(g, 0.7);
  t.add(ns(i, m.clone(), y.clone(), "wire-main")), t.add(ns(i, p.clone(), x.clone(), "wire-second")), t.add(ns(i, m.clone(), y.clone(), "wire-third")), t.add(ns(i, new M(-12.42, 5.85, 8.6), new M(16.14, 5.85, 8.6), "wire-comms")), t.add(ns(i, new M(-12.4, 5.35, 8.6), new M(16.1, 5.3, 8.6), "wire-comms-b")), t.add(ns(i, new M(16.1, 5.2, 8.5), new M(9.5, 4.85, -5.95), "wire-drop"));
  const v = lx(i);
  v.position.set(-12.28, 0, 8.85), t.add(v);
  const P = sx(i);
  P.position.set(12.6, Tn, -5.45), t.add(P);
  const A = hx();
  A.position.set(2.2, Tn, -3.15), A.rotation.y = Math.PI, t.add(A);
  const C = ux();
  C.visible = !1, t.add(C);
  const I = ix(i);
  I.position.set(-27.5, 0, 12), I.rotation.y = Math.PI / 2, t.add(bx(i));
  const w = Uv(i);
  return Tt(w.sidewalk, {
    id: "clutter-sidewalk",
    kind: "street-furniture",
    assumption: "仮。暮らしの小物（ゴミ袋、バケツ、ビールケース、植木鉢、のぼり、立て看板、自転車、自販機）。店先の壁際と歩道の端にだけ置き、戦闘範囲と路地の有効幅には置いていない。"
  }), Rt(w.sidewalk), Es(w.sidewalk), w.sidewalk.position.y = Tn, Tt(w.alley, {
    id: "clutter-alley",
    kind: "street-furniture",
    assumption: "仮。裏の路地と西の空き地の小物。壁際0.4m以内、路地の有効幅4.6mは空けたまま。"
  }), Rt(w.alley), Es(w.alley), w.alley.position.y = 0.08, t.add(w.sidewalk, w.alley), t.add(Fv(i)), e.add(t), e.add(I), e.add(wx(i)), e.add(Ov(i)), e.userData.player = {
    eye: [2.2, 1.68, 0.2],
    target: [1.2, 1.35, -6],
    fov: 78
  }, e.userData.fightArea = {
    min: [-1.8, Tn, -6],
    max: [6.2, Tn, 0.5],
    clearance: { width: 8, depth: 6.5, capsuleWidths: 9.5 }
  }, e;
}
const Jo = [
  {
    id: "powerbomb",
    label: "パワーボム",
    dmg: 34,
    impactFrame: 64,
    file: "./muscle-detective/assets/glbs/powerbomb_v2b.glb",
    koFile: "./muscle-detective/assets/glbs/powerbomb_ragdoll.glb",
    endTime: 3.1
  },
  {
    id: "chokeslam",
    label: "チョークスラム",
    dmg: 32,
    impactFrame: 70,
    file: "./muscle-detective/assets/glbs/chokeslam_v2c.glb",
    koFile: "./muscle-detective/assets/glbs/chokeslam_ragdoll.glb",
    endTime: 3.2
  },
  {
    id: "german",
    label: "ジャーマン",
    dmg: 36,
    impactFrame: 79,
    file: "./muscle-detective/assets/glbs/german_v4.glb",
    koFile: null,
    endTime: 3.6
  },
  {
    id: "backdrop",
    label: "バックドロップ",
    dmg: 35,
    impactFrame: 80,
    file: "./muscle-detective/assets/glbs/backdrop_bridge.glb",
    koFile: null,
    endTime: 3.5
  },
  {
    id: "schmidt",
    label: "シュミット式",
    dmg: 30,
    impactFrame: 64,
    file: "./muscle-detective/assets/glbs/schmidt_v8.glb",
    koFile: null,
    endTime: 3.3
  }
], th = [
  { id: "powerbomb_v2b", label: "パワーボム (柔)", file: "./muscle-detective/assets/glbs/powerbomb_v2b.glb", ragdoll: !1 },
  { id: "powerbomb_ragdoll", label: "パワーボム (ラグドール)", file: "./muscle-detective/assets/glbs/powerbomb_ragdoll.glb", ragdoll: !0 },
  { id: "chokeslam_v2c", label: "チョークスラム (柔)", file: "./muscle-detective/assets/glbs/chokeslam_v2c.glb", ragdoll: !1 },
  { id: "chokeslam_ragdoll", label: "チョークスラム (ラグドール)", file: "./muscle-detective/assets/glbs/chokeslam_ragdoll.glb", ragdoll: !0 },
  { id: "german_v4", label: "ジャーマン (頭痛がり)", file: "./muscle-detective/assets/glbs/german_v4.glb", ragdoll: !1 },
  { id: "backdrop_bridge", label: "バックドロップ (ブリッジ)", file: "./muscle-detective/assets/glbs/backdrop_bridge.glb", ragdoll: !1 },
  { id: "schmidt_v8", label: "シュミット式", file: "./muscle-detective/assets/glbs/schmidt_v8.glb", ragdoll: !1 }
], di = 0.165, Yt = { minX: -1.2, maxX: 5.6, minZ: -5.4, maxZ: -0.2, cx: 2.2, cz: -2.75 }, nh = new M(Yt.cx, di, Yt.cz), ih = new M(0, 0, 0);
function Tx() {
  const i = {
    tap: "./common/assets/audio/tap.wav",
    hit: "./common/assets/audio/hit.wav",
    block: "./common/assets/audio/metal.wav",
    slam: "./common/assets/audio/blast.wav",
    down: "./common/assets/audio/down.wav",
    win: "./common/assets/audio/reward.wav"
  }, e = {};
  return {
    play(t, n = 0.7) {
      try {
        e[t] || (e[t] = new Audio(i[t]));
        const s = e[t].cloneNode();
        s.volume = n, s.play().catch(() => {
        });
      } catch {
      }
    }
  };
}
function Ax(i) {
  const e = atob(i), t = new Uint8Array(e.length);
  for (let r = 0; r < e.length; r++) t[r] = e.charCodeAt(r);
  const n = new Int16Array(t.buffer), s = new Float32Array(n.length);
  for (let r = 0; r < n.length; r++) s[r] = n[r] / 32767;
  return s;
}
function Rx(i) {
  const e = [], t = i.times ? new Float32Array(i.times) : null;
  for (const n of i.tracks) {
    const s = n.name.endsWith(".quaternion") || n.type === "quaternion";
    n.name.endsWith(".position") || n.type;
    let r = n.times ? new Float32Array(n.times) : t, o;
    if (typeof n.values == "string")
      o = Ax(n.values);
    else if (Array.isArray(n.values))
      o = new Float32Array(n.values);
    else
      continue;
    n.constant && (r = new Float32Array([0])), !(!r || r.length === 0 || o.length === 0) && s && o.length === r.length * 4 && e.push(new Fi(n.name, r, o));
  }
  return new io(i.name, i.duration, e);
}
function Cx(i, e) {
  const t = Tx();
  i.innerHTML = `
    <div class="md-root">
      <div class="md-canvas-wrap"></div>

      <div class="md-topbar">
        <button class="md-back-btn" id="mdBackBtn">← 工房</button>
        <div class="md-mode-group">
          <button class="md-pill-btn active" id="mdModeBattle">🥊 バトル</button>
          <button class="md-pill-btn" id="mdModeViewer">🎬 ビューア</button>
        </div>
        <div class="md-badge" id="mdFps">60 FPS</div>
      </div>

      <!-- Battle HUD -->
      <div class="md-battle-hud" id="mdBattleHud">
        <div class="md-hp-row">
          <div class="md-hp-box player">
            <div class="md-hp-label"><span>探偵タンク</span><span id="mdPlayerHpTxt">100</span></div>
            <div class="md-bar"><div class="md-bar-fill blue" id="mdPlayerHpBar" style="width:100%"></div></div>
          </div>
          <div class="md-hp-box enemy">
            <div class="md-hp-label"><span>容疑者</span><span id="mdEnemyHpTxt">100</span></div>
            <div class="md-bar"><div class="md-bar-fill orange" id="mdEnemyHpBar" style="width:100%"></div></div>
            <div class="md-stun-bar"><div class="md-stun-fill" id="mdEnemyStunBar" style="width:0%"></div></div>
          </div>
        </div>
        <div class="md-banner" id="mdBanner"></div>
      </div>

      <!-- Throw Selection Overlay -->
      <div class="md-throw-picker hidden" id="mdThrowPicker">
        <div class="md-picker-title">🔥 技を選べ！</div>
        <div class="md-picker-grid" id="mdPickerGrid"></div>
      </div>

      <!-- KO / Rematch Overlay -->
      <div class="md-ko-overlay hidden" id="mdKoOverlay">
        <div class="md-ko-title" id="mdKoTitle">K.O.!</div>
        <div class="md-ko-sub" id="mdKoSub">事件解決！</div>
        <button class="md-rematch-btn" id="mdRematchBtn">🔄 もう一度戦う</button>
      </div>

      <!-- Battle Controls (Left Stick + Right 3 Buttons) -->
      <div class="md-battle-controls" id="mdBattleControls">
        <div class="md-stick-zone" id="mdStickZone">
          <div class="md-stick-base" id="mdStickBase">
            <div class="md-stick-knob" id="mdStickKnob"></div>
          </div>
        </div>
        <div class="md-action-pad">
          <button class="md-act-btn throw" id="mdBtnThrow"><span>🤼</span><small>投げ</small></button>
          <button class="md-act-btn strike" id="mdBtnStrike"><span>👊</span><small>打撃</small></button>
          <button class="md-act-btn guard" id="mdBtnGuard"><span>🛡️</span><small>ガード</small></button>
        </div>
      </div>

      <!-- Viewer UI (hidden in battle mode) -->
      <div class="md-cam-bar hidden" id="mdViewerCamBar">
        <button class="md-cam-btn md-stage-btn" id="mdStageBtn">🏙️ 街中</button>
        <button class="md-cam-btn" data-cam="review">斜め前</button>
        <button class="md-cam-btn" data-cam="side">真横</button>
        <button class="md-cam-btn" data-cam="close">アップ</button>
        <button class="md-cam-btn" data-cam="top">真上</button>
      </div>
      <div class="md-panel hidden" id="mdViewerPanel">
        <div class="md-moves-row" id="mdMovesRow"></div>
        <div class="md-controls">
          <button class="md-ctrl-btn" id="mdPlayBtn">❚❚</button>
          <input type="range" class="md-scrubber" id="mdScrubber" min="0" max="1" step="0.001" value="0" />
          <div class="md-frame-txt" id="mdFrameTxt">f0 / 0</div>
          <button class="md-ctrl-btn" id="mdSpeedBtn">1.0x</button>
        </div>
      </div>

      <div class="md-loading show" id="mdLoading">読み込み中...</div>
    </div>
  `;
  const n = i.querySelector(".md-canvas-wrap"), s = i.querySelector("#mdLoading"), r = i.querySelector("#mdFps"), o = i.querySelector("#mdBackBtn"), a = i.querySelector("#mdModeBattle"), c = i.querySelector("#mdModeViewer"), l = i.querySelector("#mdBattleHud"), h = i.querySelector("#mdBattleControls"), u = i.querySelector("#mdPlayerHpBar"), d = i.querySelector("#mdPlayerHpTxt"), f = i.querySelector("#mdEnemyHpBar"), g = i.querySelector("#mdEnemyHpTxt"), _ = i.querySelector("#mdEnemyStunBar"), m = i.querySelector("#mdBanner"), p = i.querySelector("#mdThrowPicker"), x = i.querySelector("#mdPickerGrid"), y = i.querySelector("#mdKoOverlay"), v = i.querySelector("#mdKoTitle"), P = i.querySelector("#mdKoSub"), A = i.querySelector("#mdRematchBtn"), C = i.querySelector("#mdStickZone"), I = i.querySelector("#mdStickKnob"), w = i.querySelector("#mdBtnStrike"), S = i.querySelector("#mdBtnThrow"), D = i.querySelector("#mdBtnGuard"), W = i.querySelector("#mdViewerCamBar"), H = i.querySelector("#mdViewerPanel"), Y = i.querySelector("#mdStageBtn"), J = i.querySelector("#mdMovesRow"), K = i.querySelector("#mdPlayBtn"), re = i.querySelector("#mdSpeedBtn"), q = i.querySelector("#mdScrubber"), pe = i.querySelector("#mdFrameTxt"), le = new C_({ antialias: !0, powerPreference: "high-performance" });
  le.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)), le.setSize(window.innerWidth, window.innerHeight), le.outputColorSpace = Nt, le.shadowMap.enabled = !0, le.shadowMap.type = rh, le.toneMapping = ah, le.toneMappingExposure = 0.96, n.appendChild(le.domElement);
  const me = new Hd();
  me.background = new Ie("#c5d4e4"), me.fog = new cs("#aeb6be", 28e-4);
  const Oe = () => window.innerHeight > window.innerWidth, Ye = new en(Oe() ? 50 : 44, window.innerWidth / window.innerHeight, 0.1, 350), j = new I_(Ye, le.domElement);
  j.enableDamping = !0, j.dampingFactor = 0.08, j.maxPolarAngle = Math.PI * 0.49, j.minDistance = 1.4, j.maxDistance = 45, j.enabled = !1;
  const ie = new ye(), Ae = new oe(
    new In(160, 24, 14),
    new ii({
      side: tn,
      depthWrite: !1,
      uniforms: {
        top: { value: new Ie("#8eb4d4") },
        horizon: { value: new Ie("#f4e3cf") },
        bottom: { value: new Ie("#cbb892") }
      },
      vertexShader: "varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom;
        void main() {
          float h = normalize(vPos).y;
          vec3 col = mix(horizon, top, smoothstep(0.0, 0.62, h));
          col = mix(bottom, col, smoothstep(-0.25, 0.08, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    })
  );
  Ae.frustumCulled = !1, ie.add(Ae), ie.add(new cl("#c5d0dc", "#6d5c48", 0.68));
  const ae = new Ga("#ffd2a8", 2.8);
  ae.position.set(16, 22, 8), ae.castShadow = !0, ae.shadow.mapSize.set(1024, 1024), ae.shadow.camera.near = 1, ae.shadow.camera.far = 70, ae.shadow.camera.left = -20, ae.shadow.camera.right = 20, ae.shadow.camera.top = 18, ae.shadow.camera.bottom = -18, ae.shadow.bias = -5e-4, ae.shadow.normalBias = 0.03, ie.add(ae);
  const Le = Mx(Yv()), Fe = Le.getObjectByName("scale-reference");
  Fe && (Fe.visible = !1), ie.add(Le), me.add(ie);
  const ze = new ye();
  ze.visible = !1, ze.add(new cl(12375295, 3812388, 0.95));
  const ct = new Ga(16773596, 2.2);
  ct.position.set(4.5, 7.5, 4), ct.castShadow = !0, ct.shadow.mapSize.set(1024, 1024), ct.shadow.camera.left = -4.5, ct.shadow.camera.right = 4.5, ct.shadow.camera.top = 4.5, ct.shadow.camera.bottom = -4.5, ze.add(ct);
  const Qe = new oe(
    new mt(6.4, 0.2, 6.4),
    new se({ color: 13358561, roughness: 0.85 })
  );
  Qe.position.y = -0.105, Qe.receiveShadow = !0, ze.add(Qe), me.add(ze);
  const Mt = new X_(), N = /* @__PURE__ */ new Map();
  let Wt = null, je = "battle", $e = "town", Te = !1, _t = 0;
  const Re = new ye();
  me.add(Re);
  const T = new ye();
  Re.add(T);
  const b = new se({ color: 2714329, roughness: 0.48, metalness: 0.05 }), k = new se({ color: 15102766, roughness: 0.52, metalness: 0.05 }), $ = new se({ color: 16726832, emissive: 6684672, roughness: 0.4 });
  function ee(G, Q, Me) {
    const he = new ye();
    he.name = Me;
    const Ve = zr(G);
    Ve.traverse((We) => {
      We.isMesh && (We.material = Q, We.castShadow = !0, We.receiveShadow = !0, We.frustumCulled = !1);
    }), he.add(Ve), Re.add(he);
    const Ue = new Bo(Ve), nt = {};
    for (const [We, Et] of Object.entries(Wt))
      nt[We] = Ue.clipAction(Et);
    return {
      root: he,
      model: Ve,
      mixer: Ue,
      actions: nt,
      baseMat: Q,
      curAnim: null,
      pos: new M(),
      yaw: 0,
      hp: 100,
      maxHp: 100,
      stun: 0,
      state: "idle",
      // idle | walk | strike | block | hit | dizzy | getup | grab_lunge | ko
      stateTimer: 0,
      comboStep: 0,
      hitChecked: !1,
      flashTimer: 0,
      play(We, { loop: Et = !0, fade: st = 0.12, speed: bt = 1 } = {}) {
        if (this.curAnim === We && Et) return;
        const yt = this.actions[We];
        yt && (yt.reset(), yt.setLoop(Et ? Oa : Fa, Et ? 1 / 0 : 1), yt.clampWhenFinished = !Et, yt.timeScale = bt, yt.play(), this.curAnim && this.actions[this.curAnim] && this.curAnim !== We && this.actions[this.curAnim].crossFadeTo(yt, st, !1), this.curAnim = We);
      },
      setFlash(We) {
        this.model.traverse((Et) => {
          Et.isMesh && (Et.material = We ? $ : this.baseMat);
        });
      }
    };
  }
  let L = null, B = null, ce = "fight", be = 0, Je = null, ne = null, ve = null, Pe = 0, De = !1, Se = 0, Xe = 0, He = 0, ht = 0, U = 0.8;
  const de = { x: 0, y: 0 }, X = {};
  let Z = !1;
  function fe(G, Q = "#fbbf24", Me = 1) {
    m.textContent = G, m.style.color = Q, m.classList.add("show"), ht = Me;
  }
  function _e() {
    if (!L || !B) return;
    const G = Math.max(0, Math.round(L.hp / L.maxHp * 100)), Q = Math.max(0, Math.round(B.hp / B.maxHp * 100));
    u.style.width = `${G}%`, d.textContent = `${Math.max(0, Math.round(L.hp))}`, f.style.width = `${Q}%`, g.textContent = `${Math.max(0, Math.round(B.hp))}`, _.style.width = `${Math.min(100, Math.round(B.stun))}%`;
  }
  function Be() {
    ne && (ne.stopAllAction(), ne = null), Je && (T.remove(Je), Je = null), ve = null;
  }
  function St() {
    Be(), ce = "fight", Se = 0, Xe = 0, p.classList.add("hidden"), y.classList.add("hidden"), L.hp = 100, L.stun = 0, L.state = "idle", L.stateTimer = 0, L.comboStep = 0, L.pos.set(Yt.cx - 1.1, di, Yt.cz), L.yaw = Math.PI * 0.5, L.root.visible = !0, L.setFlash(!1), L.play("idle", { loop: !0, fade: 0.05 }), B.hp = 100, B.stun = 0, B.state = "idle", B.stateTimer = 0, B.pos.set(Yt.cx + 1.1, di, Yt.cz), B.yaw = -Math.PI * 0.5, B.root.visible = !0, B.setFlash(!1), B.play("idle", { loop: !0, fade: 0.05 }), U = 1, _e(), fe("FIGHT!", "#60a5fa", 1.1);
  }
  async function Ct(G) {
    if (!N.has(G)) {
      const Q = await Mt.loadAsync(G);
      N.set(G, Q);
    }
    return N.get(G);
  }
  async function lt(G) {
    if (ce !== "pick_throw") return;
    p.classList.add("hidden"), ce = "playing_throw", t.play("tap", 0.6);
    const Q = B.hp - G.dmg <= 0, Me = Q && G.koFile ? G.koFile : G.file;
    s.classList.add("show");
    const he = await Ct(Me);
    if (s.classList.remove("show"), Te || je !== "battle") return;
    Be();
    const Ve = zr(he.scene);
    Ve.traverse((bt) => {
      bt.isMesh && (bt.castShadow = !0, bt.receiveShadow = !0, bt.frustumCulled = !1);
    });
    const Ue = B.pos.x - L.pos.x, nt = B.pos.z - L.pos.z, ut = Math.atan2(Ue, nt), We = as.clamp((L.pos.x + B.pos.x) * 0.5, Yt.minX + 0.6, Yt.maxX - 0.6), Et = as.clamp((L.pos.z + B.pos.z) * 0.5, Yt.minZ + 0.6, Yt.maxZ - 0.6);
    T.position.set(We, di, Et), T.rotation.set(0, ut, 0), T.add(Ve), L.root.visible = !1, B.root.visible = !1, Je = Ve, ne = new Bo(Ve);
    let st = 2.5;
    he.animations.forEach((bt) => {
      st = Math.max(st, bt.duration);
      const yt = ne.clipAction(bt);
      yt.setLoop(Fa, 1), yt.clampWhenFinished = !0, yt.play();
    }), ve = { ...G, isKo: Q, duration: Q ? st : Math.min(st, G.endTime) }, Pe = 0, De = !1, fe(G.label + "!", "#fb923c", 0.9);
  }
  Jo.forEach((G) => {
    const Q = document.createElement("button");
    Q.className = "md-pick-btn", Q.innerHTML = `<strong>${G.label}</strong><span>DMG ${G.dmg}</span>`, Q.addEventListener("click", () => lt(G)), x.appendChild(Q);
  });
  function on() {
    if (je !== "battle" || ce !== "fight" || !L || L.state === "hit" || L.state === "dizzy" || L.state === "grab_lunge" || L.state === "strike" && L.stateTimer > 0.14) return;
    const G = ["jab", "cross", "hook", "uppercut"], Q = G[L.comboStep % G.length];
    L.comboStep = (L.comboStep + 1) % G.length, L.state = "strike", L.stateTimer = Q === "uppercut" ? 0.52 : 0.36, L.hitChecked = !1, L.yaw = Math.atan2(B.pos.x - L.pos.x, B.pos.z - L.pos.z), L.play(Q, { loop: !1, fade: 0.06, speed: 1.35 }), t.play("tap", 0.45);
  }
  function gn() {
    if (je !== "battle" || ce !== "fight" || !L || L.state === "hit" || L.state === "dizzy") return;
    const G = L.pos.distanceTo(B.pos);
    L.yaw = Math.atan2(B.pos.x - L.pos.x, B.pos.z - L.pos.z), G <= 1.75 && B.state !== "getup" ? (ce = "pick_throw", be = 2.6, t.play("hit", 0.55), fe("掴んだ！", "#38bdf8", 0.8), p.classList.remove("hidden")) : (L.state = "grab_lunge", L.stateTimer = 0.42, L.play("jab", { loop: !1, fade: 0.06, speed: 0.9 }), fe("スカッ！", "#94a3b8", 0.55));
  }
  w.addEventListener("pointerdown", (G) => {
    G.preventDefault(), on();
  }), S.addEventListener("pointerdown", (G) => {
    G.preventDefault(), gn();
  }), D.addEventListener("pointerdown", (G) => {
    G.preventDefault(), Z = !0, D.classList.add("held");
  });
  const Oi = () => {
    Z = !1, D.classList.remove("held");
  };
  D.addEventListener("pointerup", Oi), D.addEventListener("pointercancel", Oi), D.addEventListener("pointerleave", Oi), A.addEventListener("click", () => {
    t.play("tap", 0.5), St();
  });
  let Hn = null, yn = { x: 0, y: 0 };
  const Vn = 42;
  C.addEventListener("pointerdown", (G) => {
    if (Hn !== null) return;
    Hn = G.pointerId, C.setPointerCapture(Hn);
    const Q = C.getBoundingClientRect();
    yn = { x: Q.left + Q.width * 0.5, y: Q.top + Q.height * 0.5 }, Us(G.clientX, G.clientY);
  }), C.addEventListener("pointermove", (G) => {
    G.pointerId === Hn && Us(G.clientX, G.clientY);
  });
  const Ns = (G) => {
    G.pointerId === Hn && (Hn = null, de.x = 0, de.y = 0, I.style.transform = "translate(0px, 0px)");
  };
  C.addEventListener("pointerup", Ns), C.addEventListener("pointercancel", Ns);
  function Us(G, Q) {
    let Me = G - yn.x, he = Q - yn.y;
    const Ve = Math.hypot(Me, he);
    Ve > Vn && (Me = Me / Ve * Vn, he = he / Ve * Vn), de.x = Me / Vn, de.y = he / Vn, I.style.transform = `translate(${Me}px, ${he}px)`;
  }
  const Si = (G) => {
    X[G.code] = !0, (G.code === "KeyJ" || G.code === "Space") && on(), G.code === "KeyK" && gn(), (G.code === "KeyL" || G.code === "ShiftLeft") && (Z = !0);
  }, Fs = (G) => {
    X[G.code] = !1, (G.code === "KeyL" || G.code === "ShiftLeft") && (Z = !1);
  };
  window.addEventListener("keydown", Si), window.addEventListener("keyup", Fs);
  const Sn = new ye();
  Sn.visible = !1, me.add(Sn);
  let Dn = null, un = null, Nn = 1, bi = !0, Os = !1;
  const Bs = [1, 0.5, 0.25];
  let Bi = 0;
  function hr(G) {
    const Q = $e === "town" ? nh : ih, Me = Oe(), he = {
      review: Me ? [3.6, 2.2, 4.8] : [2.8, 1.8, 3.6],
      side: Me ? [5.2, 1.4, 0] : [4.2, 1.25, 0],
      close: [2.1, 1, 2.2],
      top: [0, 6.2, 1.2]
    }, Ve = he[G] || he.review;
    Ye.position.set(Q.x + Ve[0], Q.y + Ve[1], Q.z + Ve[2]), j.target.set(Q.x, Q.y + 0.85, Q.z), j.update();
  }
  function E(G) {
    $e = G;
    const Q = G === "town";
    ie.visible = Q, ze.visible = !Q, Q ? (me.background = new Ie("#c5d4e4"), me.fog = new cs("#aeb6be", 28e-4), Y.textContent = "🏙️ 街中") : (me.background = new Ie(1251620), me.fog = new cs(1251620, 0.045), Y.textContent = "🥊 リング"), Sn.position.copy(Q ? nh : ih), hr("review");
  }
  async function F(G) {
    s.classList.add("show"), i.querySelectorAll(".md-move-chip").forEach((Q) => Q.classList.toggle("active", Q.dataset.id === G.id));
    try {
      const Q = await Ct(G.file);
      if (Te) return;
      un && un.stopAllAction(), Dn && Sn.remove(Dn), Dn = zr(Q.scene), Dn.traverse((Me) => {
        Me.isMesh && (Me.castShadow = !0, Me.receiveShadow = !0, Me.frustumCulled = !1);
      }), Sn.add(Dn), un = new Bo(Dn), Nn = 0.1, Q.animations.forEach((Me) => {
        Nn = Math.max(Nn, Me.duration);
        const he = un.clipAction(Me);
        he.setLoop(Oa), he.play();
      }), un.setTime(0), bi = !0, K.textContent = "❚❚";
    } finally {
      Te || s.classList.remove("show");
    }
  }
  th.forEach((G) => {
    const Q = document.createElement("button");
    Q.className = "md-move-chip" + (G.ragdoll ? " ragdoll" : ""), Q.dataset.id = G.id, Q.textContent = G.label, Q.addEventListener("click", () => F(G)), J.appendChild(Q);
  }), Y.addEventListener("click", () => E($e === "town" ? "ring" : "town")), i.querySelectorAll(".md-cam-btn[data-cam]").forEach((G) => G.addEventListener("click", () => hr(G.dataset.cam))), K.addEventListener("click", () => {
    bi = !bi, K.textContent = bi ? "❚❚" : "▶";
  }), re.addEventListener("click", () => {
    Bi = (Bi + 1) % Bs.length, re.textContent = Bs[Bi].toFixed(2).replace(/\.00$/, ".0") + "x";
  }), q.addEventListener("pointerdown", () => {
    Os = !0;
  }), q.addEventListener("pointerup", () => {
    Os = !1;
  }), q.addEventListener("input", () => {
    if (!un) return;
    const G = parseFloat(q.value) * Nn;
    un.setTime(G), pe.textContent = `f${Math.round(G * 30)} / ${Math.round(Nn * 30)}`;
  });
  function z(G) {
    je = G;
    const Q = G === "battle";
    a.classList.toggle("active", Q), c.classList.toggle("active", !Q), l.classList.toggle("hidden", !Q), h.classList.toggle("hidden", !Q), Q || (p.classList.add("hidden"), y.classList.add("hidden")), W.classList.toggle("hidden", Q), H.classList.toggle("hidden", Q), Re.visible = Q, Sn.visible = !Q, j.enabled = !Q, Q ? (ie.visible = !0, ze.visible = !1, me.background = new Ie("#c5d4e4"), me.fog = new cs("#aeb6be", 28e-4), L && B && St()) : (E($e), Dn || F(th[0]));
  }
  a.addEventListener("click", () => z("battle")), c.addEventListener("click", () => z("viewer"));
  function V(G) {
    if (!L || !B) return;
    if (ht > 0 && (ht -= G, ht <= 0 && m.classList.remove("show")), Se > 0) {
      Se -= G;
      return;
    }
    if (ce === "pick_throw") {
      be -= G, L.mixer.update(G * 0.15), B.mixer.update(G * 0.15), be <= 0 && lt(Jo[0]), ge(G, !0);
      return;
    }
    if (ce === "playing_throw" && ne && ve) {
      ne.update(G), Pe += G;
      const nt = Pe * 30;
      if (!De && nt >= ve.impactFrame && (De = !0, B.hp = Math.max(0, B.hp - ve.dmg), B.stun = 0, _e(), Se = 0.085, Xe = 0.32, He = 0.18, t.play(ve.isKo ? "slam" : "down", 0.9), fe(ve.isKo ? "K.O.!!" : `-${ve.dmg}!`, "#f97316", 1.1)), Pe >= ve.duration)
        if (ve.isKo)
          ce = "ko", t.play("win", 0.75), v.textContent = "K.O.!!", P.textContent = `${ve.label}で容疑者を確保！`, y.classList.remove("hidden");
        else {
          const ut = T.position.clone(), We = new M(Math.sin(T.rotation.y), 0, Math.cos(T.rotation.y));
          Be(), L.root.visible = !0, B.root.visible = !0, L.pos.copy(ut).addScaledVector(We, -0.55), B.pos.copy(ut).addScaledVector(We, 0.85), O(L.pos), O(B.pos), L.state = "idle", L.play("idle", { loop: !0, fade: 0.15 }), B.state = "getup", B.stateTimer = 1.15, B.play("getup", { loop: !1, fade: 0.1, speed: 1.35 }), ce = "fight";
        }
      ge(G, !1, !0);
      return;
    }
    if (ce === "ko") {
      ge(G, !1, !0);
      return;
    }
    let Q = de.x + (X.KeyD || X.ArrowRight ? 1 : 0) - (X.KeyA || X.ArrowLeft ? 1 : 0), Me = de.y + (X.KeyS || X.ArrowDown ? 1 : 0) - (X.KeyW || X.ArrowUp ? 1 : 0);
    const he = Math.hypot(Q, Me);
    if (he > 1 && (Q /= he, Me /= he), L.stateTimer > 0) {
      if (L.stateTimer -= G, L.state === "strike" && !L.hitChecked && L.stateTimer < 0.22 && (L.hitChecked = !0, L.pos.distanceTo(B.pos) < 1.65 && B.state !== "getup"))
        if (B.state === "block")
          t.play("block", 0.65), fe("GUARD!", "#94a3b8", 0.5);
        else {
          const ut = L.comboStep === 0, We = ut ? 11 : 7;
          B.hp = Math.max(1, B.hp - We), B.stun = Math.min(100, B.stun + (ut ? 34 : 22)), B.flashTimer = 0.12, B.setFlash(!0), Se = ut ? 0.06 : 0.03, Xe = 0.14, He = ut ? 0.09 : 0.04, t.play("hit", 0.75), B.stun >= 100 && B.state !== "dizzy" ? (B.state = "dizzy", B.stateTimer = 4.5, B.play("dizzy", { loop: !0, fade: 0.12 }), fe("グロッキー！投げチャンス！", "#facc15", 1.4)) : (B.state = "hit", B.stateTimer = 0.38, B.play(ut ? "hit_head" : "hit_body", { loop: !1, fade: 0.05, speed: 1.25 })), _e();
        }
      L.stateTimer <= 0 && (L.state = "idle");
    }
    if (L.state === "idle" || L.state === "walk" || L.state === "block")
      if (Z)
        L.state = "block", L.yaw = Math.atan2(B.pos.x - L.pos.x, B.pos.z - L.pos.z), L.play("block", { loop: !0, fade: 0.1 });
      else if (he > 0.12) {
        L.state = "walk";
        const nt = 2.9;
        L.pos.x += Q * nt * G, L.pos.z += Me * nt * G, L.yaw = Math.atan2(Q, Me), L.play("walk", { loop: !0, fade: 0.12, speed: 1.15 });
      } else
        L.state = "idle", L.yaw = Math.atan2(B.pos.x - L.pos.x, B.pos.z - L.pos.z), L.play("idle", { loop: !0, fade: 0.14 });
    else L.state === "grab_lunge" && (L.pos.x += Math.sin(L.yaw) * 2.2 * G, L.pos.z += Math.cos(L.yaw) * 2.2 * G);
    if (B.flashTimer > 0 && (B.flashTimer -= G, B.flashTimer <= 0 && B.setFlash(!1)), B.stateTimer > 0 && (B.stateTimer -= G, B.state === "strike" && !B.hitChecked && B.stateTimer < 0.24 && (B.hitChecked = !0, L.pos.distanceTo(B.pos) < 1.6 && (L.state === "block" ? (t.play("block", 0.7), fe("ブロック！反撃チャンス！", "#38bdf8", 0.8)) : (L.hp = Math.max(0, L.hp - 9), L.state = "hit", L.stateTimer = 0.35, L.play("hit_body", { loop: !1, fade: 0.05, speed: 1.2 }), Xe = 0.15, He = 0.07, t.play("hit", 0.7), _e(), L.hp <= 0 && (ce = "ko", v.textContent = "DOWN...", P.textContent = "もう一度リベンジしよう！", y.classList.remove("hidden"))))), B.stateTimer <= 0 && (B.state === "dizzy" && (B.stun = 0), B.state = "idle", _e())), B.state === "idle" || B.state === "walk") {
      const nt = B.pos.distanceTo(L.pos), ut = new M().subVectors(L.pos, B.pos);
      B.yaw = Math.atan2(ut.x, ut.z), U -= G, nt > 1.45 ? (B.state = "walk", ut.normalize(), B.pos.x += ut.x * 1.85 * G, B.pos.z += ut.z * 1.85 * G, B.play("walk", { loop: !0, fade: 0.12, speed: 0.95 })) : (B.state = "idle", B.play("idle", { loop: !0, fade: 0.15 }), U <= 0 && (U = 1.1 + Math.random() * 0.9, Math.random() < 0.72 ? (B.state = "strike", B.stateTimer = 0.52, B.hitChecked = !1, B.play(Math.random() < 0.5 ? "jab" : "hook", { loop: !1, fade: 0.08, speed: 1.05 })) : (B.state = "block", B.stateTimer = 0.85, B.play("block", { loop: !0, fade: 0.1 }))));
    }
    const Ve = new M().subVectors(L.pos, B.pos);
    Ve.y = 0;
    const Ue = Ve.length();
    if (Ue > 1e-3 && Ue < 0.82) {
      const nt = (0.82 - Ue) * 0.5;
      Ve.normalize(), L.pos.addScaledVector(Ve, nt), B.pos.addScaledVector(Ve, -nt);
    }
    O(L.pos), O(B.pos), L.root.position.copy(L.pos), L.root.rotation.y = L.yaw, B.root.position.copy(B.pos), B.root.rotation.y = B.yaw, L.mixer.update(G), B.mixer.update(G), ge(G, !1, !1);
  }
  function O(G) {
    G.x = as.clamp(G.x, Yt.minX, Yt.maxX), G.z = as.clamp(G.z, Yt.minZ, Yt.maxZ), G.y = di;
  }
  const te = new M(Yt.cx, di + 0.9, Yt.cz);
  function ge(G, Q = !1, Me = !1) {
    const he = Me ? T.position.clone() : new M().addVectors(L.pos, B.pos).multiplyScalar(0.5), Ve = new M(he.x, di + (Q ? 1.05 : 0.9), he.z);
    te.lerp(Ve, Math.min(1, G * 6));
    const Ue = Oe(), nt = Q ? Ue ? 3.4 : 2.6 : Me ? Ue ? 5.8 : 4.6 : Ue ? 5.2 : 4.2, ut = Q ? 1.75 : Me ? Ue ? 2.5 : 2.1 : Ue ? 2.6 : 2.15, We = new M(te.x + 0.6, di + ut, te.z + nt);
    if (Ye.position.lerp(We, Math.min(1, G * 5)), Xe > 0) {
      Xe -= G;
      const Et = He * (Xe / 0.32);
      Ye.position.x += (Math.random() - 0.5) * Et * 2, Ye.position.y += (Math.random() - 0.5) * Et * 2;
    }
    Ye.lookAt(te);
  }
  async function we() {
    try {
      let Ve = function(nt) {
        var zt;
        const ut = new ye(), We = zr(Q.scene), Et = /* @__PURE__ */ new Set(), st = We.getObjectByName(nt);
        st && (Et.add(st), st.traverse((an) => Et.add(an)));
        const bt = [];
        We.traverse((an) => {
          an.isSkinnedMesh && an.skeleton && an.skeleton.bones.some((hu) => Et.has(hu)) && bt.push(an);
        });
        const yt = nt === "Powerbomb_A" ? "Powerbomb_B" : "Powerbomb_A", Lt = We.getObjectByName(yt);
        return Lt && ((zt = Lt.parent) == null || zt.remove(Lt)), We.traverse((an) => {
          an.isSkinnedMesh && !bt.includes(an) && (an.visible = !1);
        }), ut.add(We), ut;
      };
      const [G, Q] = await Promise.all([
        fetch("./muscle-detective/assets/combat_anims.json").then((nt) => nt.json()),
        Ct(Jo[0].file)
      ]);
      if (Te) return;
      Wt = {};
      for (const [nt, ut] of Object.entries(G))
        Wt[nt] = Rx(ut);
      const Me = Q.scene.getObjectByName("Powerbomb_A"), he = Q.scene.getObjectByName("Powerbomb_B");
      if (!Me || !he) throw new Error("Armatures not found in base GLB");
      const Ue = Ve("Powerbomb_A");
      L = ee(Ue, b, "Player"), B = ee(Ue, k, "Enemy"), z("battle");
    } catch (G) {
      console.error("[muscle-detective] init failed:", G), fe("読み込みエラー", "#ef4444", 5);
    } finally {
      Te || s.classList.remove("show");
    }
  }
  const Ee = () => {
    Te || (Ye.fov = Oe() ? 50 : 44, Ye.aspect = window.innerWidth / window.innerHeight, Ye.updateProjectionMatrix(), le.setSize(window.innerWidth, window.innerHeight));
  };
  window.addEventListener("resize", Ee);
  function Ne() {
    Te || (Te = !0, cancelAnimationFrame(_t), window.removeEventListener("resize", Ee), window.removeEventListener("keydown", Si), window.removeEventListener("keyup", Fs), Be(), j.dispose(), le.dispose(), i.innerHTML = "");
  }
  o.addEventListener("click", () => {
    Ne(), typeof e == "function" && e();
  });
  const ke = new Df();
  let Ce = 0, et = 0;
  function ot() {
    if (Te) return;
    _t = requestAnimationFrame(ot);
    const G = Math.min(ke.getDelta(), 0.05);
    if (Ce += G, et++, Ce >= 0.5 && (r.textContent = `${Math.round(et / Ce)} FPS`, Ce = 0, et = 0), je === "battle")
      V(G);
    else {
      if (un && bi && !Os) {
        un.update(G * Bs[Bi]);
        const Q = un.time % Nn;
        q.value = (Q / Nn).toFixed(4), pe.textContent = `f${Math.round(Q * 30)} / ${Math.round(Nn * 30)}`;
      }
      j.update();
    }
    le.render(me, Ye);
  }
  return ot(), we(), Ne;
}
export {
  Cx as mountMuscleDetective
};
