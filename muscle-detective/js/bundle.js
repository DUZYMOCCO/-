/**
 * @license
 * Copyright 2010-2024 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
const ds = { ROTATE: 0, DOLLY: 1, PAN: 2 }, os = { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 }, pu = 0, Ec = 1, mu = 2, ah = 1, ch = 2, $n = 3, ni = 0, sn = 1, Jt = 2, yi = 0, fs = 1, Mc = 2, Tc = 3, Ac = 4, gu = 5, Ni = 100, _u = 101, vu = 102, xu = 103, yu = 104, Su = 200, bu = 201, wu = 202, Eu = 203, ta = 204, na = 205, Mu = 206, Tu = 207, Au = 208, Ru = 209, Cu = 210, Pu = 211, Iu = 212, Lu = 213, Du = 214, ia = 0, sa = 1, ra = 2, _s = 3, oa = 4, aa = 5, ca = 6, la = 7, lh = 0, Nu = 1, Uu = 2, Si = 0, Fu = 1, Ou = 2, Bu = 3, hh = 4, ku = 5, zu = 6, Hu = 7, Rc = "attached", Vu = "detached", uh = 300, vs = 301, xs = 302, ha = 303, ua = 304, oo = 306, Qt = 1e3, _i = 1001, Qr = 1002, rn = 1003, dh = 1004, Zs = 1005, pn = 1006, Xr = 1007, Qn = 1008, ii = 1009, fh = 1010, ph = 1011, ir = 1012, Za = 1013, Fi = 1014, Rn = 1015, ar = 1016, $a = 1017, Ja = 1018, ys = 1020, mh = 35902, gh = 1021, _h = 1022, yn = 1023, vh = 1024, xh = 1025, ps = 1026, Ss = 1027, Qa = 1028, ec = 1029, yh = 1030, tc = 1031, nc = 1033, qr = 33776, Yr = 33777, Kr = 33778, jr = 33779, da = 35840, fa = 35841, pa = 35842, ma = 35843, ga = 36196, _a = 37492, va = 37496, xa = 37808, ya = 37809, Sa = 37810, ba = 37811, wa = 37812, Ea = 37813, Ma = 37814, Ta = 37815, Aa = 37816, Ra = 37817, Ca = 37818, Pa = 37819, Ia = 37820, La = 37821, Zr = 36492, Da = 36494, Na = 36495, Sh = 36283, Ua = 36284, Fa = 36285, Oa = 36286, Ba = 2200, ka = 2201, Gu = 2202, sr = 2300, rr = 2301, uo = 2302, as = 2400, cs = 2401, eo = 2402, ic = 2500, Wu = 2501, Xu = 0, bh = 1, za = 2, qu = 3200, Yu = 3201, wh = 0, Ku = 1, gi = "", Ot = "srgb", on = "srgb-linear", to = "linear", yt = "srgb", Hi = 7680, Cc = 519, ju = 512, Zu = 513, $u = 514, Eh = 515, Ju = 516, Qu = 517, ed = 518, td = 519, Ha = 35044, Pc = "300 es", ei = 2e3, no = 2001;
class bi {
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
const Yt = ["00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f", "70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f", "80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af", "b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf", "c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf", "d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df", "e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef", "f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"];
let Ic = 1234567;
const Js = Math.PI / 180, bs = 180 / Math.PI;
function Cn() {
  const i = Math.random() * 4294967295 | 0, e = Math.random() * 4294967295 | 0, t = Math.random() * 4294967295 | 0, n = Math.random() * 4294967295 | 0;
  return (Yt[i & 255] + Yt[i >> 8 & 255] + Yt[i >> 16 & 255] + Yt[i >> 24 & 255] + "-" + Yt[e & 255] + Yt[e >> 8 & 255] + "-" + Yt[e >> 16 & 15 | 64] + Yt[e >> 24 & 255] + "-" + Yt[t & 63 | 128] + Yt[t >> 8 & 255] + "-" + Yt[t >> 16 & 255] + Yt[t >> 24 & 255] + Yt[n & 255] + Yt[n >> 8 & 255] + Yt[n >> 16 & 255] + Yt[n >> 24 & 255]).toLowerCase();
}
function Ye(i, e, t) {
  return Math.max(e, Math.min(t, i));
}
function sc(i, e) {
  return (i % e + e) % e;
}
function nd(i, e, t, n, s) {
  return n + (i - e) * (s - n) / (t - e);
}
function id(i, e, t) {
  return i !== e ? (t - i) / (e - i) : 0;
}
function Qs(i, e, t) {
  return (1 - t) * i + t * e;
}
function sd(i, e, t, n) {
  return Qs(i, e, 1 - Math.exp(-t * n));
}
function rd(i, e = 1) {
  return e - Math.abs(sc(i, e * 2) - e);
}
function od(i, e, t) {
  return i <= e ? 0 : i >= t ? 1 : (i = (i - e) / (t - e), i * i * (3 - 2 * i));
}
function ad(i, e, t) {
  return i <= e ? 0 : i >= t ? 1 : (i = (i - e) / (t - e), i * i * i * (i * (i * 6 - 15) + 10));
}
function cd(i, e) {
  return i + Math.floor(Math.random() * (e - i + 1));
}
function ld(i, e) {
  return i + Math.random() * (e - i);
}
function hd(i) {
  return i * (0.5 - Math.random());
}
function ud(i) {
  i !== void 0 && (Ic = i);
  let e = Ic += 1831565813;
  return e = Math.imul(e ^ e >>> 15, e | 1), e ^= e + Math.imul(e ^ e >>> 7, e | 61), ((e ^ e >>> 14) >>> 0) / 4294967296;
}
function dd(i) {
  return i * Js;
}
function fd(i) {
  return i * bs;
}
function pd(i) {
  return (i & i - 1) === 0 && i !== 0;
}
function md(i) {
  return Math.pow(2, Math.ceil(Math.log(i) / Math.LN2));
}
function gd(i) {
  return Math.pow(2, Math.floor(Math.log(i) / Math.LN2));
}
function _d(i, e, t, n, s) {
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
function Tn(i, e) {
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
function xt(i, e) {
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
const ls = {
  DEG2RAD: Js,
  RAD2DEG: bs,
  generateUUID: Cn,
  clamp: Ye,
  euclideanModulo: sc,
  mapLinear: nd,
  inverseLerp: id,
  lerp: Qs,
  damp: sd,
  pingpong: rd,
  smoothstep: od,
  smootherstep: ad,
  randInt: cd,
  randFloat: ld,
  randFloatSpread: hd,
  seededRandom: ud,
  degToRad: dd,
  radToDeg: fd,
  isPowerOfTwo: pd,
  ceilPowerOfTwo: md,
  floorPowerOfTwo: gd,
  setQuaternionFromProperEuler: _d,
  normalize: xt,
  denormalize: Tn
};
class he {
  constructor(e = 0, t = 0) {
    he.prototype.isVector2 = !0, this.x = e, this.y = t;
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
    return this.x = Ye(this.x, e.x, t.x), this.y = Ye(this.y, e.y, t.y), this;
  }
  clampScalar(e, t) {
    return this.x = Ye(this.x, e, t), this.y = Ye(this.y, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(Ye(n, e, t));
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
    return Math.acos(Ye(n, -1, 1));
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
    const n = e.elements, s = t.elements, r = this.elements, o = n[0], a = n[3], c = n[6], l = n[1], h = n[4], u = n[7], d = n[2], f = n[5], g = n[8], _ = s[0], m = s[3], p = s[6], x = s[1], b = s[4], v = s[7], P = s[2], T = s[5], C = s[8];
    return r[0] = o * _ + a * x + c * P, r[3] = o * m + a * b + c * T, r[6] = o * p + a * v + c * C, r[1] = l * _ + h * x + u * P, r[4] = l * m + h * b + u * T, r[7] = l * p + h * v + u * C, r[2] = d * _ + f * x + g * P, r[5] = d * m + f * b + g * T, r[8] = d * p + f * v + g * C, this;
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
    return this.premultiply(fo.makeScale(e, t)), this;
  }
  rotate(e) {
    return this.premultiply(fo.makeRotation(-e)), this;
  }
  translate(e, t) {
    return this.premultiply(fo.makeTranslation(e, t)), this;
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
const fo = /* @__PURE__ */ new Ke();
function Mh(i) {
  for (let e = i.length - 1; e >= 0; --e)
    if (i[e] >= 65535) return !0;
  return !1;
}
function or(i) {
  return document.createElementNS("http://www.w3.org/1999/xhtml", i);
}
function vd() {
  const i = or("canvas");
  return i.style.display = "block", i;
}
const Lc = {};
function rs(i) {
  i in Lc || (Lc[i] = !0, console.warn(i));
}
function xd(i, e, t) {
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
function yd(i) {
  const e = i.elements;
  e[2] = 0.5 * e[2] + 0.5 * e[3], e[6] = 0.5 * e[6] + 0.5 * e[7], e[10] = 0.5 * e[10] + 0.5 * e[11], e[14] = 0.5 * e[14] + 0.5 * e[15];
}
function Sd(i) {
  const e = i.elements;
  e[11] === -1 ? (e[10] = -e[10] - 1, e[14] = -e[14]) : (e[10] = -e[10], e[14] = -e[14] + 1);
}
const Dc = /* @__PURE__ */ new Ke().set(
  0.4123908,
  0.3575843,
  0.1804808,
  0.212639,
  0.7151687,
  0.0721923,
  0.0193308,
  0.1191948,
  0.9505322
), Nc = /* @__PURE__ */ new Ke().set(
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
function bd() {
  const i = {
    enabled: !0,
    workingColorSpace: on,
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
      return this.enabled === !1 || r === o || !r || !o || (this.spaces[r].transfer === yt && (s.r = ti(s.r), s.g = ti(s.g), s.b = ti(s.b)), this.spaces[r].primaries !== this.spaces[o].primaries && (s.applyMatrix3(this.spaces[r].toXYZ), s.applyMatrix3(this.spaces[o].fromXYZ)), this.spaces[o].transfer === yt && (s.r = ms(s.r), s.g = ms(s.g), s.b = ms(s.b))), s;
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
      return s === gi ? to : this.spaces[s].transfer;
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
    [on]: {
      primaries: e,
      whitePoint: n,
      transfer: to,
      toXYZ: Dc,
      fromXYZ: Nc,
      luminanceCoefficients: t,
      workingColorSpaceConfig: { unpackColorSpace: Ot },
      outputColorSpaceConfig: { drawingBufferColorSpace: Ot }
    },
    [Ot]: {
      primaries: e,
      whitePoint: n,
      transfer: yt,
      toXYZ: Dc,
      fromXYZ: Nc,
      luminanceCoefficients: t,
      outputColorSpaceConfig: { drawingBufferColorSpace: Ot }
    }
  }), i;
}
const ct = /* @__PURE__ */ bd();
function ti(i) {
  return i < 0.04045 ? i * 0.0773993808 : Math.pow(i * 0.9478672986 + 0.0521327014, 2.4);
}
function ms(i) {
  return i < 31308e-7 ? i * 12.92 : 1.055 * Math.pow(i, 0.41666) - 0.055;
}
let Vi;
class wd {
  static getDataURL(e) {
    if (/^data:/i.test(e.src) || typeof HTMLCanvasElement > "u")
      return e.src;
    let t;
    if (e instanceof HTMLCanvasElement)
      t = e;
    else {
      Vi === void 0 && (Vi = or("canvas")), Vi.width = e.width, Vi.height = e.height;
      const n = Vi.getContext("2d");
      e instanceof ImageData ? n.putImageData(e, 0, 0) : n.drawImage(e, 0, 0, e.width, e.height), t = Vi;
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
        r[o] = ti(r[o] / 255) * 255;
      return n.putImageData(s, 0, 0), t;
    } else if (e.data) {
      const t = e.data.slice(0);
      for (let n = 0; n < t.length; n++)
        t instanceof Uint8Array || t instanceof Uint8ClampedArray ? t[n] = Math.floor(ti(t[n] / 255) * 255) : t[n] = ti(t[n]);
      return {
        data: t,
        width: e.width,
        height: e.height
      };
    } else
      return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."), e;
  }
}
let Ed = 0;
class Th {
  constructor(e = null) {
    this.isSource = !0, Object.defineProperty(this, "id", { value: Ed++ }), this.uuid = Cn(), this.data = e, this.dataReady = !0, this.version = 0;
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
          s[o].isDataTexture ? r.push(po(s[o].image)) : r.push(po(s[o]));
      } else
        r = po(s);
      n.url = r;
    }
    return t || (e.images[this.uuid] = n), n;
  }
}
function po(i) {
  return typeof HTMLImageElement < "u" && i instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && i instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && i instanceof ImageBitmap ? wd.getDataURL(i) : i.data ? {
    data: Array.from(i.data),
    width: i.width,
    height: i.height,
    type: i.data.constructor.name
  } : (console.warn("THREE.Texture: Unable to serialize Texture."), {});
}
let Md = 0;
class Bt extends bi {
  constructor(e = Bt.DEFAULT_IMAGE, t = Bt.DEFAULT_MAPPING, n = _i, s = _i, r = pn, o = Qn, a = yn, c = ii, l = Bt.DEFAULT_ANISOTROPY, h = gi) {
    super(), this.isTexture = !0, Object.defineProperty(this, "id", { value: Md++ }), this.uuid = Cn(), this.name = "", this.source = new Th(e), this.mipmaps = [], this.mapping = t, this.channel = 0, this.wrapS = n, this.wrapT = s, this.magFilter = r, this.minFilter = o, this.anisotropy = l, this.format = a, this.internalFormat = null, this.type = c, this.offset = new he(0, 0), this.repeat = new he(1, 1), this.center = new he(0, 0), this.rotation = 0, this.matrixAutoUpdate = !0, this.matrix = new Ke(), this.generateMipmaps = !0, this.premultiplyAlpha = !1, this.flipY = !0, this.unpackAlignment = 4, this.colorSpace = h, this.userData = {}, this.version = 0, this.onUpdate = null, this.renderTarget = null, this.isRenderTargetTexture = !1, this.pmremVersion = 0;
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
    if (this.mapping !== uh) return e;
    if (e.applyMatrix3(this.matrix), e.x < 0 || e.x > 1)
      switch (this.wrapS) {
        case Qt:
          e.x = e.x - Math.floor(e.x);
          break;
        case _i:
          e.x = e.x < 0 ? 0 : 1;
          break;
        case Qr:
          Math.abs(Math.floor(e.x) % 2) === 1 ? e.x = Math.ceil(e.x) - e.x : e.x = e.x - Math.floor(e.x);
          break;
      }
    if (e.y < 0 || e.y > 1)
      switch (this.wrapT) {
        case Qt:
          e.y = e.y - Math.floor(e.y);
          break;
        case _i:
          e.y = e.y < 0 ? 0 : 1;
          break;
        case Qr:
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
Bt.DEFAULT_IMAGE = null;
Bt.DEFAULT_MAPPING = uh;
Bt.DEFAULT_ANISOTROPY = 1;
class mt {
  constructor(e = 0, t = 0, n = 0, s = 1) {
    mt.prototype.isVector4 = !0, this.x = e, this.y = t, this.z = n, this.w = s;
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
      const b = (l + 1) / 2, v = (f + 1) / 2, P = (p + 1) / 2, T = (h + d) / 4, C = (u + _) / 4, I = (g + m) / 4;
      return b > v && b > P ? b < 0.01 ? (n = 0, s = 0.707106781, r = 0.707106781) : (n = Math.sqrt(b), s = T / n, r = C / n) : v > P ? v < 0.01 ? (n = 0.707106781, s = 0, r = 0.707106781) : (s = Math.sqrt(v), n = T / s, r = I / s) : P < 0.01 ? (n = 0.707106781, s = 0.707106781, r = 0) : (r = Math.sqrt(P), n = C / r, s = I / r), this.set(n, s, r, t), this;
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
    return this.x = Ye(this.x, e.x, t.x), this.y = Ye(this.y, e.y, t.y), this.z = Ye(this.z, e.z, t.z), this.w = Ye(this.w, e.w, t.w), this;
  }
  clampScalar(e, t) {
    return this.x = Ye(this.x, e, t), this.y = Ye(this.y, e, t), this.z = Ye(this.z, e, t), this.w = Ye(this.w, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(Ye(n, e, t));
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
class Td extends bi {
  constructor(e = 1, t = 1, n = {}) {
    super(), this.isRenderTarget = !0, this.width = e, this.height = t, this.depth = 1, this.scissor = new mt(0, 0, e, t), this.scissorTest = !1, this.viewport = new mt(0, 0, e, t);
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
    const r = new Bt(s, n.mapping, n.wrapS, n.wrapT, n.magFilter, n.minFilter, n.format, n.type, n.anisotropy, n.colorSpace);
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
    return this.texture.source = new Th(t), this.depthBuffer = e.depthBuffer, this.stencilBuffer = e.stencilBuffer, this.resolveDepthBuffer = e.resolveDepthBuffer, this.resolveStencilBuffer = e.resolveStencilBuffer, e.depthTexture !== null && (this.depthTexture = e.depthTexture.clone()), this.samples = e.samples, this;
  }
  dispose() {
    this.dispatchEvent({ type: "dispose" });
  }
}
class Oi extends Td {
  constructor(e = 1, t = 1, n = {}) {
    super(e, t, n), this.isWebGLRenderTarget = !0;
  }
}
class Ah extends Bt {
  constructor(e = null, t = 1, n = 1, s = 1) {
    super(null), this.isDataArrayTexture = !0, this.image = { data: e, width: t, height: n, depth: s }, this.magFilter = rn, this.minFilter = rn, this.wrapR = _i, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1, this.layerUpdates = /* @__PURE__ */ new Set();
  }
  addLayerUpdate(e) {
    this.layerUpdates.add(e);
  }
  clearLayerUpdates() {
    this.layerUpdates.clear();
  }
}
class Ad extends Bt {
  constructor(e = null, t = 1, n = 1, s = 1) {
    super(null), this.isData3DTexture = !0, this.image = { data: e, width: t, height: n, depth: s }, this.magFilter = rn, this.minFilter = rn, this.wrapR = _i, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
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
      const p = c * d + l * f + h * g + u * _, x = p >= 0 ? 1 : -1, b = 1 - p * p;
      if (b > Number.EPSILON) {
        const P = Math.sqrt(b), T = Math.atan2(P, p * x);
        m = Math.sin(m * T) / P, a = Math.sin(a * T) / P;
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
    return 2 * Math.acos(Math.abs(Ye(this.dot(e), -1, 1)));
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
    return this.applyQuaternion(Uc.setFromEuler(e));
  }
  applyAxisAngle(e, t) {
    return this.applyQuaternion(Uc.setFromAxisAngle(e, t));
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
    return this.x = Ye(this.x, e.x, t.x), this.y = Ye(this.y, e.y, t.y), this.z = Ye(this.z, e.z, t.z), this;
  }
  clampScalar(e, t) {
    return this.x = Ye(this.x, e, t), this.y = Ye(this.y, e, t), this.z = Ye(this.z, e, t), this;
  }
  clampLength(e, t) {
    const n = this.length();
    return this.divideScalar(n || 1).multiplyScalar(Ye(n, e, t));
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
    return mo.copy(this).projectOnVector(e), this.sub(mo);
  }
  reflect(e) {
    return this.sub(mo.copy(e).multiplyScalar(2 * this.dot(e)));
  }
  angleTo(e) {
    const t = Math.sqrt(this.lengthSq() * e.lengthSq());
    if (t === 0) return Math.PI / 2;
    const n = this.dot(e) / t;
    return Math.acos(Ye(n, -1, 1));
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
const mo = /* @__PURE__ */ new M(), Uc = /* @__PURE__ */ new mn();
class In {
  constructor(e = new M(1 / 0, 1 / 0, 1 / 0), t = new M(-1 / 0, -1 / 0, -1 / 0)) {
    this.isBox3 = !0, this.min = e, this.max = t;
  }
  set(e, t) {
    return this.min.copy(e), this.max.copy(t), this;
  }
  setFromArray(e) {
    this.makeEmpty();
    for (let t = 0, n = e.length; t < n; t += 3)
      this.expandByPoint(Sn.fromArray(e, t));
    return this;
  }
  setFromBufferAttribute(e) {
    this.makeEmpty();
    for (let t = 0, n = e.count; t < n; t++)
      this.expandByPoint(Sn.fromBufferAttribute(e, t));
    return this;
  }
  setFromPoints(e) {
    this.makeEmpty();
    for (let t = 0, n = e.length; t < n; t++)
      this.expandByPoint(e[t]);
    return this;
  }
  setFromCenterAndSize(e, t) {
    const n = Sn.copy(t).multiplyScalar(0.5);
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
          e.isMesh === !0 ? e.getVertexPosition(o, Sn) : Sn.fromBufferAttribute(r, o), Sn.applyMatrix4(e.matrixWorld), this.expandByPoint(Sn);
      else
        e.boundingBox !== void 0 ? (e.boundingBox === null && e.computeBoundingBox(), dr.copy(e.boundingBox)) : (n.boundingBox === null && n.computeBoundingBox(), dr.copy(n.boundingBox)), dr.applyMatrix4(e.matrixWorld), this.union(dr);
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
    return this.clampPoint(e.center, Sn), Sn.distanceToSquared(e.center) <= e.radius * e.radius;
  }
  intersectsPlane(e) {
    let t, n;
    return e.normal.x > 0 ? (t = e.normal.x * this.min.x, n = e.normal.x * this.max.x) : (t = e.normal.x * this.max.x, n = e.normal.x * this.min.x), e.normal.y > 0 ? (t += e.normal.y * this.min.y, n += e.normal.y * this.max.y) : (t += e.normal.y * this.max.y, n += e.normal.y * this.min.y), e.normal.z > 0 ? (t += e.normal.z * this.min.z, n += e.normal.z * this.max.z) : (t += e.normal.z * this.max.z, n += e.normal.z * this.min.z), t <= -e.constant && n >= -e.constant;
  }
  intersectsTriangle(e) {
    if (this.isEmpty())
      return !1;
    this.getCenter(ks), fr.subVectors(this.max, ks), Gi.subVectors(e.a, ks), Wi.subVectors(e.b, ks), Xi.subVectors(e.c, ks), ci.subVectors(Wi, Gi), li.subVectors(Xi, Wi), Mi.subVectors(Gi, Xi);
    let t = [
      0,
      -ci.z,
      ci.y,
      0,
      -li.z,
      li.y,
      0,
      -Mi.z,
      Mi.y,
      ci.z,
      0,
      -ci.x,
      li.z,
      0,
      -li.x,
      Mi.z,
      0,
      -Mi.x,
      -ci.y,
      ci.x,
      0,
      -li.y,
      li.x,
      0,
      -Mi.y,
      Mi.x,
      0
    ];
    return !go(t, Gi, Wi, Xi, fr) || (t = [1, 0, 0, 0, 1, 0, 0, 0, 1], !go(t, Gi, Wi, Xi, fr)) ? !1 : (pr.crossVectors(ci, li), t = [pr.x, pr.y, pr.z], go(t, Gi, Wi, Xi, fr));
  }
  clampPoint(e, t) {
    return t.copy(e).clamp(this.min, this.max);
  }
  distanceToPoint(e) {
    return this.clampPoint(e, Sn).distanceTo(e);
  }
  getBoundingSphere(e) {
    return this.isEmpty() ? e.makeEmpty() : (this.getCenter(e.center), e.radius = this.getSize(Sn).length() * 0.5), e;
  }
  intersect(e) {
    return this.min.max(e.min), this.max.min(e.max), this.isEmpty() && this.makeEmpty(), this;
  }
  union(e) {
    return this.min.min(e.min), this.max.max(e.max), this;
  }
  applyMatrix4(e) {
    return this.isEmpty() ? this : (Wn[0].set(this.min.x, this.min.y, this.min.z).applyMatrix4(e), Wn[1].set(this.min.x, this.min.y, this.max.z).applyMatrix4(e), Wn[2].set(this.min.x, this.max.y, this.min.z).applyMatrix4(e), Wn[3].set(this.min.x, this.max.y, this.max.z).applyMatrix4(e), Wn[4].set(this.max.x, this.min.y, this.min.z).applyMatrix4(e), Wn[5].set(this.max.x, this.min.y, this.max.z).applyMatrix4(e), Wn[6].set(this.max.x, this.max.y, this.min.z).applyMatrix4(e), Wn[7].set(this.max.x, this.max.y, this.max.z).applyMatrix4(e), this.setFromPoints(Wn), this);
  }
  translate(e) {
    return this.min.add(e), this.max.add(e), this;
  }
  equals(e) {
    return e.min.equals(this.min) && e.max.equals(this.max);
  }
}
const Wn = [
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M(),
  /* @__PURE__ */ new M()
], Sn = /* @__PURE__ */ new M(), dr = /* @__PURE__ */ new In(), Gi = /* @__PURE__ */ new M(), Wi = /* @__PURE__ */ new M(), Xi = /* @__PURE__ */ new M(), ci = /* @__PURE__ */ new M(), li = /* @__PURE__ */ new M(), Mi = /* @__PURE__ */ new M(), ks = /* @__PURE__ */ new M(), fr = /* @__PURE__ */ new M(), pr = /* @__PURE__ */ new M(), Ti = /* @__PURE__ */ new M();
function go(i, e, t, n, s) {
  for (let r = 0, o = i.length - 3; r <= o; r += 3) {
    Ti.fromArray(i, r);
    const a = s.x * Math.abs(Ti.x) + s.y * Math.abs(Ti.y) + s.z * Math.abs(Ti.z), c = e.dot(Ti), l = t.dot(Ti), h = n.dot(Ti);
    if (Math.max(-Math.max(c, l, h), Math.min(c, l, h)) > a)
      return !1;
  }
  return !0;
}
const Rd = /* @__PURE__ */ new In(), zs = /* @__PURE__ */ new M(), _o = /* @__PURE__ */ new M();
class kn {
  constructor(e = new M(), t = -1) {
    this.isSphere = !0, this.center = e, this.radius = t;
  }
  set(e, t) {
    return this.center.copy(e), this.radius = t, this;
  }
  setFromPoints(e, t) {
    const n = this.center;
    t !== void 0 ? n.copy(t) : Rd.setFromPoints(e).getCenter(n);
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
    return e.isEmpty() ? this : this.isEmpty() ? (this.copy(e), this) : (this.center.equals(e.center) === !0 ? this.radius = Math.max(this.radius, e.radius) : (_o.subVectors(e.center, this.center).setLength(e.radius), this.expandByPoint(zs.copy(e.center).add(_o)), this.expandByPoint(zs.copy(e.center).sub(_o))), this);
  }
  equals(e) {
    return e.center.equals(this.center) && e.radius === this.radius;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
const Xn = /* @__PURE__ */ new M(), vo = /* @__PURE__ */ new M(), mr = /* @__PURE__ */ new M(), hi = /* @__PURE__ */ new M(), xo = /* @__PURE__ */ new M(), gr = /* @__PURE__ */ new M(), yo = /* @__PURE__ */ new M();
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
    return this.origin.copy(this.at(e, Xn)), this;
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
    const t = Xn.subVectors(e, this.origin).dot(this.direction);
    return t < 0 ? this.origin.distanceToSquared(e) : (Xn.copy(this.origin).addScaledVector(this.direction, t), Xn.distanceToSquared(e));
  }
  distanceSqToSegment(e, t, n, s) {
    vo.copy(e).add(t).multiplyScalar(0.5), mr.copy(t).sub(e).normalize(), hi.copy(this.origin).sub(vo);
    const r = e.distanceTo(t) * 0.5, o = -this.direction.dot(mr), a = hi.dot(this.direction), c = -hi.dot(mr), l = hi.lengthSq(), h = Math.abs(1 - o * o);
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
    return n && n.copy(this.origin).addScaledVector(this.direction, u), s && s.copy(vo).addScaledVector(mr, d), f;
  }
  intersectSphere(e, t) {
    Xn.subVectors(e.center, this.origin);
    const n = Xn.dot(this.direction), s = Xn.dot(Xn) - n * n, r = e.radius * e.radius;
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
    return this.intersectBox(e, Xn) !== null;
  }
  intersectTriangle(e, t, n, s, r) {
    xo.subVectors(t, e), gr.subVectors(n, e), yo.crossVectors(xo, gr);
    let o = this.direction.dot(yo), a;
    if (o > 0) {
      if (s) return null;
      a = 1;
    } else if (o < 0)
      a = -1, o = -o;
    else
      return null;
    hi.subVectors(this.origin, e);
    const c = a * this.direction.dot(gr.crossVectors(hi, gr));
    if (c < 0)
      return null;
    const l = a * this.direction.dot(xo.cross(hi));
    if (l < 0 || c + l > o)
      return null;
    const h = -a * hi.dot(yo);
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
class We {
  constructor(e, t, n, s, r, o, a, c, l, h, u, d, f, g, _, m) {
    We.prototype.isMatrix4 = !0, this.elements = [
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
    return new We().fromArray(this.elements);
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
    const t = this.elements, n = e.elements, s = 1 / qi.setFromMatrixColumn(e, 0).length(), r = 1 / qi.setFromMatrixColumn(e, 1).length(), o = 1 / qi.setFromMatrixColumn(e, 2).length();
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
    return this.compose(Cd, e, Pd);
  }
  lookAt(e, t, n) {
    const s = this.elements;
    return dn.subVectors(e, t), dn.lengthSq() === 0 && (dn.z = 1), dn.normalize(), ui.crossVectors(n, dn), ui.lengthSq() === 0 && (Math.abs(n.z) === 1 ? dn.x += 1e-4 : dn.z += 1e-4, dn.normalize(), ui.crossVectors(n, dn)), ui.normalize(), _r.crossVectors(dn, ui), s[0] = ui.x, s[4] = _r.x, s[8] = dn.x, s[1] = ui.y, s[5] = _r.y, s[9] = dn.y, s[2] = ui.z, s[6] = _r.z, s[10] = dn.z, this;
  }
  multiply(e) {
    return this.multiplyMatrices(this, e);
  }
  premultiply(e) {
    return this.multiplyMatrices(e, this);
  }
  multiplyMatrices(e, t) {
    const n = e.elements, s = t.elements, r = this.elements, o = n[0], a = n[4], c = n[8], l = n[12], h = n[1], u = n[5], d = n[9], f = n[13], g = n[2], _ = n[6], m = n[10], p = n[14], x = n[3], b = n[7], v = n[11], P = n[15], T = s[0], C = s[4], I = s[8], w = s[12], S = s[1], L = s[5], H = s[9], V = s[13], Y = s[2], ee = s[6], K = s[10], oe = s[14], q = s[3], ce = s[7], ve = s[11], fe = s[15];
    return r[0] = o * T + a * S + c * Y + l * q, r[4] = o * C + a * L + c * ee + l * ce, r[8] = o * I + a * H + c * K + l * ve, r[12] = o * w + a * V + c * oe + l * fe, r[1] = h * T + u * S + d * Y + f * q, r[5] = h * C + u * L + d * ee + f * ce, r[9] = h * I + u * H + d * K + f * ve, r[13] = h * w + u * V + d * oe + f * fe, r[2] = g * T + _ * S + m * Y + p * q, r[6] = g * C + _ * L + m * ee + p * ce, r[10] = g * I + _ * H + m * K + p * ve, r[14] = g * w + _ * V + m * oe + p * fe, r[3] = x * T + b * S + v * Y + P * q, r[7] = x * C + b * L + v * ee + P * ce, r[11] = x * I + b * H + v * K + P * ve, r[15] = x * w + b * V + v * oe + P * fe, this;
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
    const e = this.elements, t = e[0], n = e[1], s = e[2], r = e[3], o = e[4], a = e[5], c = e[6], l = e[7], h = e[8], u = e[9], d = e[10], f = e[11], g = e[12], _ = e[13], m = e[14], p = e[15], x = u * m * l - _ * d * l + _ * c * f - a * m * f - u * c * p + a * d * p, b = g * d * l - h * m * l - g * c * f + o * m * f + h * c * p - o * d * p, v = h * _ * l - g * u * l + g * a * f - o * _ * f - h * a * p + o * u * p, P = g * u * c - h * _ * c - g * a * d + o * _ * d + h * a * m - o * u * m, T = t * x + n * b + s * v + r * P;
    if (T === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    const C = 1 / T;
    return e[0] = x * C, e[1] = (_ * d * r - u * m * r - _ * s * f + n * m * f + u * s * p - n * d * p) * C, e[2] = (a * m * r - _ * c * r + _ * s * l - n * m * l - a * s * p + n * c * p) * C, e[3] = (u * c * r - a * d * r - u * s * l + n * d * l + a * s * f - n * c * f) * C, e[4] = b * C, e[5] = (h * m * r - g * d * r + g * s * f - t * m * f - h * s * p + t * d * p) * C, e[6] = (g * c * r - o * m * r - g * s * l + t * m * l + o * s * p - t * c * p) * C, e[7] = (o * d * r - h * c * r + h * s * l - t * d * l - o * s * f + t * c * f) * C, e[8] = v * C, e[9] = (g * u * r - h * _ * r - g * n * f + t * _ * f + h * n * p - t * u * p) * C, e[10] = (o * _ * r - g * a * r + g * n * l - t * _ * l - o * n * p + t * a * p) * C, e[11] = (h * a * r - o * u * r - h * n * l + t * u * l + o * n * f - t * a * f) * C, e[12] = P * C, e[13] = (h * _ * s - g * u * s + g * n * d - t * _ * d - h * n * m + t * u * m) * C, e[14] = (g * a * s - o * _ * s - g * n * c + t * _ * c + o * n * m - t * a * m) * C, e[15] = (o * u * s - h * a * s + h * n * c - t * u * c - o * n * d + t * a * d) * C, this;
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
    const s = this.elements, r = t._x, o = t._y, a = t._z, c = t._w, l = r + r, h = o + o, u = a + a, d = r * l, f = r * h, g = r * u, _ = o * h, m = o * u, p = a * u, x = c * l, b = c * h, v = c * u, P = n.x, T = n.y, C = n.z;
    return s[0] = (1 - (_ + p)) * P, s[1] = (f + v) * P, s[2] = (g - b) * P, s[3] = 0, s[4] = (f - v) * T, s[5] = (1 - (d + p)) * T, s[6] = (m + x) * T, s[7] = 0, s[8] = (g + b) * C, s[9] = (m - x) * C, s[10] = (1 - (d + _)) * C, s[11] = 0, s[12] = e.x, s[13] = e.y, s[14] = e.z, s[15] = 1, this;
  }
  decompose(e, t, n) {
    const s = this.elements;
    let r = qi.set(s[0], s[1], s[2]).length();
    const o = qi.set(s[4], s[5], s[6]).length(), a = qi.set(s[8], s[9], s[10]).length();
    this.determinant() < 0 && (r = -r), e.x = s[12], e.y = s[13], e.z = s[14], bn.copy(this);
    const l = 1 / r, h = 1 / o, u = 1 / a;
    return bn.elements[0] *= l, bn.elements[1] *= l, bn.elements[2] *= l, bn.elements[4] *= h, bn.elements[5] *= h, bn.elements[6] *= h, bn.elements[8] *= u, bn.elements[9] *= u, bn.elements[10] *= u, t.setFromRotationMatrix(bn), n.x = r, n.y = o, n.z = a, this;
  }
  makePerspective(e, t, n, s, r, o, a = ei) {
    const c = this.elements, l = 2 * r / (t - e), h = 2 * r / (n - s), u = (t + e) / (t - e), d = (n + s) / (n - s);
    let f, g;
    if (a === ei)
      f = -(o + r) / (o - r), g = -2 * o * r / (o - r);
    else if (a === no)
      f = -o / (o - r), g = -o * r / (o - r);
    else
      throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: " + a);
    return c[0] = l, c[4] = 0, c[8] = u, c[12] = 0, c[1] = 0, c[5] = h, c[9] = d, c[13] = 0, c[2] = 0, c[6] = 0, c[10] = f, c[14] = g, c[3] = 0, c[7] = 0, c[11] = -1, c[15] = 0, this;
  }
  makeOrthographic(e, t, n, s, r, o, a = ei) {
    const c = this.elements, l = 1 / (t - e), h = 1 / (n - s), u = 1 / (o - r), d = (t + e) * l, f = (n + s) * h;
    let g, _;
    if (a === ei)
      g = (o + r) * u, _ = -2 * u;
    else if (a === no)
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
const qi = /* @__PURE__ */ new M(), bn = /* @__PURE__ */ new We(), Cd = /* @__PURE__ */ new M(0, 0, 0), Pd = /* @__PURE__ */ new M(1, 1, 1), ui = /* @__PURE__ */ new M(), _r = /* @__PURE__ */ new M(), dn = /* @__PURE__ */ new M(), Fc = /* @__PURE__ */ new We(), Oc = /* @__PURE__ */ new mn();
class Bn {
  constructor(e = 0, t = 0, n = 0, s = Bn.DEFAULT_ORDER) {
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
        this._y = Math.asin(Ye(a, -1, 1)), Math.abs(a) < 0.9999999 ? (this._x = Math.atan2(-h, f), this._z = Math.atan2(-o, r)) : (this._x = Math.atan2(d, l), this._z = 0);
        break;
      case "YXZ":
        this._x = Math.asin(-Ye(h, -1, 1)), Math.abs(h) < 0.9999999 ? (this._y = Math.atan2(a, f), this._z = Math.atan2(c, l)) : (this._y = Math.atan2(-u, r), this._z = 0);
        break;
      case "ZXY":
        this._x = Math.asin(Ye(d, -1, 1)), Math.abs(d) < 0.9999999 ? (this._y = Math.atan2(-u, f), this._z = Math.atan2(-o, l)) : (this._y = 0, this._z = Math.atan2(c, r));
        break;
      case "ZYX":
        this._y = Math.asin(-Ye(u, -1, 1)), Math.abs(u) < 0.9999999 ? (this._x = Math.atan2(d, f), this._z = Math.atan2(c, r)) : (this._x = 0, this._z = Math.atan2(-o, l));
        break;
      case "YZX":
        this._z = Math.asin(Ye(c, -1, 1)), Math.abs(c) < 0.9999999 ? (this._x = Math.atan2(-h, l), this._y = Math.atan2(-u, r)) : (this._x = 0, this._y = Math.atan2(a, f));
        break;
      case "XZY":
        this._z = Math.asin(-Ye(o, -1, 1)), Math.abs(o) < 0.9999999 ? (this._x = Math.atan2(d, l), this._y = Math.atan2(a, r)) : (this._x = Math.atan2(-h, f), this._y = 0);
        break;
      default:
        console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: " + t);
    }
    return this._order = t, n === !0 && this._onChangeCallback(), this;
  }
  setFromQuaternion(e, t, n) {
    return Fc.makeRotationFromQuaternion(e), this.setFromRotationMatrix(Fc, t, n);
  }
  setFromVector3(e, t = this._order) {
    return this.set(e.x, e.y, e.z, t);
  }
  reorder(e) {
    return Oc.setFromEuler(this), this.setFromQuaternion(Oc, e);
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
Bn.DEFAULT_ORDER = "XYZ";
class Rh {
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
let Id = 0;
const Bc = /* @__PURE__ */ new M(), Yi = /* @__PURE__ */ new mn(), qn = /* @__PURE__ */ new We(), vr = /* @__PURE__ */ new M(), Hs = /* @__PURE__ */ new M(), Ld = /* @__PURE__ */ new M(), Dd = /* @__PURE__ */ new mn(), kc = /* @__PURE__ */ new M(1, 0, 0), zc = /* @__PURE__ */ new M(0, 1, 0), Hc = /* @__PURE__ */ new M(0, 0, 1), Vc = { type: "added" }, Nd = { type: "removed" }, Ki = { type: "childadded", child: null }, So = { type: "childremoved", child: null };
class Mt extends bi {
  constructor() {
    super(), this.isObject3D = !0, Object.defineProperty(this, "id", { value: Id++ }), this.uuid = Cn(), this.name = "", this.type = "Object3D", this.parent = null, this.children = [], this.up = Mt.DEFAULT_UP.clone();
    const e = new M(), t = new Bn(), n = new mn(), s = new M(1, 1, 1);
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
        value: new We()
      },
      normalMatrix: {
        value: new Ke()
      }
    }), this.matrix = new We(), this.matrixWorld = new We(), this.matrixAutoUpdate = Mt.DEFAULT_MATRIX_AUTO_UPDATE, this.matrixWorldAutoUpdate = Mt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE, this.matrixWorldNeedsUpdate = !1, this.layers = new Rh(), this.visible = !0, this.castShadow = !1, this.receiveShadow = !1, this.frustumCulled = !0, this.renderOrder = 0, this.animations = [], this.userData = {};
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
    return Yi.setFromAxisAngle(e, t), this.quaternion.multiply(Yi), this;
  }
  rotateOnWorldAxis(e, t) {
    return Yi.setFromAxisAngle(e, t), this.quaternion.premultiply(Yi), this;
  }
  rotateX(e) {
    return this.rotateOnAxis(kc, e);
  }
  rotateY(e) {
    return this.rotateOnAxis(zc, e);
  }
  rotateZ(e) {
    return this.rotateOnAxis(Hc, e);
  }
  translateOnAxis(e, t) {
    return Bc.copy(e).applyQuaternion(this.quaternion), this.position.add(Bc.multiplyScalar(t)), this;
  }
  translateX(e) {
    return this.translateOnAxis(kc, e);
  }
  translateY(e) {
    return this.translateOnAxis(zc, e);
  }
  translateZ(e) {
    return this.translateOnAxis(Hc, e);
  }
  localToWorld(e) {
    return this.updateWorldMatrix(!0, !1), e.applyMatrix4(this.matrixWorld);
  }
  worldToLocal(e) {
    return this.updateWorldMatrix(!0, !1), e.applyMatrix4(qn.copy(this.matrixWorld).invert());
  }
  lookAt(e, t, n) {
    e.isVector3 ? vr.copy(e) : vr.set(e, t, n);
    const s = this.parent;
    this.updateWorldMatrix(!0, !1), Hs.setFromMatrixPosition(this.matrixWorld), this.isCamera || this.isLight ? qn.lookAt(Hs, vr, this.up) : qn.lookAt(vr, Hs, this.up), this.quaternion.setFromRotationMatrix(qn), s && (qn.extractRotation(s.matrixWorld), Yi.setFromRotationMatrix(qn), this.quaternion.premultiply(Yi.invert()));
  }
  add(e) {
    if (arguments.length > 1) {
      for (let t = 0; t < arguments.length; t++)
        this.add(arguments[t]);
      return this;
    }
    return e === this ? (console.error("THREE.Object3D.add: object can't be added as a child of itself.", e), this) : (e && e.isObject3D ? (e.removeFromParent(), e.parent = this, this.children.push(e), e.dispatchEvent(Vc), Ki.child = e, this.dispatchEvent(Ki), Ki.child = null) : console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.", e), this);
  }
  remove(e) {
    if (arguments.length > 1) {
      for (let n = 0; n < arguments.length; n++)
        this.remove(arguments[n]);
      return this;
    }
    const t = this.children.indexOf(e);
    return t !== -1 && (e.parent = null, this.children.splice(t, 1), e.dispatchEvent(Nd), So.child = e, this.dispatchEvent(So), So.child = null), this;
  }
  removeFromParent() {
    const e = this.parent;
    return e !== null && e.remove(this), this;
  }
  clear() {
    return this.remove(...this.children);
  }
  attach(e) {
    return this.updateWorldMatrix(!0, !1), qn.copy(this.matrixWorld).invert(), e.parent !== null && (e.parent.updateWorldMatrix(!0, !1), qn.multiply(e.parent.matrixWorld)), e.applyMatrix4(qn), e.removeFromParent(), e.parent = this, this.children.push(e), e.updateWorldMatrix(!1, !0), e.dispatchEvent(Vc), Ki.child = e, this.dispatchEvent(Ki), Ki.child = null, this;
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
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Hs, e, Ld), e;
  }
  getWorldScale(e) {
    return this.updateWorldMatrix(!0, !1), this.matrixWorld.decompose(Hs, Dd, e), e;
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
Mt.DEFAULT_UP = /* @__PURE__ */ new M(0, 1, 0);
Mt.DEFAULT_MATRIX_AUTO_UPDATE = !0;
Mt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE = !0;
const wn = /* @__PURE__ */ new M(), Yn = /* @__PURE__ */ new M(), bo = /* @__PURE__ */ new M(), Kn = /* @__PURE__ */ new M(), ji = /* @__PURE__ */ new M(), Zi = /* @__PURE__ */ new M(), Gc = /* @__PURE__ */ new M(), wo = /* @__PURE__ */ new M(), Eo = /* @__PURE__ */ new M(), Mo = /* @__PURE__ */ new M(), To = /* @__PURE__ */ new mt(), Ao = /* @__PURE__ */ new mt(), Ro = /* @__PURE__ */ new mt();
class An {
  constructor(e = new M(), t = new M(), n = new M()) {
    this.a = e, this.b = t, this.c = n;
  }
  static getNormal(e, t, n, s) {
    s.subVectors(n, t), wn.subVectors(e, t), s.cross(wn);
    const r = s.lengthSq();
    return r > 0 ? s.multiplyScalar(1 / Math.sqrt(r)) : s.set(0, 0, 0);
  }
  // static/instance method to calculate barycentric coordinates
  // based on: http://www.blackpawn.com/texts/pointinpoly/default.html
  static getBarycoord(e, t, n, s, r) {
    wn.subVectors(s, t), Yn.subVectors(n, t), bo.subVectors(e, t);
    const o = wn.dot(wn), a = wn.dot(Yn), c = wn.dot(bo), l = Yn.dot(Yn), h = Yn.dot(bo), u = o * l - a * a;
    if (u === 0)
      return r.set(0, 0, 0), null;
    const d = 1 / u, f = (l * c - a * h) * d, g = (o * h - a * c) * d;
    return r.set(1 - f - g, g, f);
  }
  static containsPoint(e, t, n, s) {
    return this.getBarycoord(e, t, n, s, Kn) === null ? !1 : Kn.x >= 0 && Kn.y >= 0 && Kn.x + Kn.y <= 1;
  }
  static getInterpolation(e, t, n, s, r, o, a, c) {
    return this.getBarycoord(e, t, n, s, Kn) === null ? (c.x = 0, c.y = 0, "z" in c && (c.z = 0), "w" in c && (c.w = 0), null) : (c.setScalar(0), c.addScaledVector(r, Kn.x), c.addScaledVector(o, Kn.y), c.addScaledVector(a, Kn.z), c);
  }
  static getInterpolatedAttribute(e, t, n, s, r, o) {
    return To.setScalar(0), Ao.setScalar(0), Ro.setScalar(0), To.fromBufferAttribute(e, t), Ao.fromBufferAttribute(e, n), Ro.fromBufferAttribute(e, s), o.setScalar(0), o.addScaledVector(To, r.x), o.addScaledVector(Ao, r.y), o.addScaledVector(Ro, r.z), o;
  }
  static isFrontFacing(e, t, n, s) {
    return wn.subVectors(n, t), Yn.subVectors(e, t), wn.cross(Yn).dot(s) < 0;
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
    return wn.subVectors(this.c, this.b), Yn.subVectors(this.a, this.b), wn.cross(Yn).length() * 0.5;
  }
  getMidpoint(e) {
    return e.addVectors(this.a, this.b).add(this.c).multiplyScalar(1 / 3);
  }
  getNormal(e) {
    return An.getNormal(this.a, this.b, this.c, e);
  }
  getPlane(e) {
    return e.setFromCoplanarPoints(this.a, this.b, this.c);
  }
  getBarycoord(e, t) {
    return An.getBarycoord(e, this.a, this.b, this.c, t);
  }
  getInterpolation(e, t, n, s, r) {
    return An.getInterpolation(e, this.a, this.b, this.c, t, n, s, r);
  }
  containsPoint(e) {
    return An.containsPoint(e, this.a, this.b, this.c);
  }
  isFrontFacing(e) {
    return An.isFrontFacing(this.a, this.b, this.c, e);
  }
  intersectsBox(e) {
    return e.intersectsTriangle(this);
  }
  closestPointToPoint(e, t) {
    const n = this.a, s = this.b, r = this.c;
    let o, a;
    ji.subVectors(s, n), Zi.subVectors(r, n), wo.subVectors(e, n);
    const c = ji.dot(wo), l = Zi.dot(wo);
    if (c <= 0 && l <= 0)
      return t.copy(n);
    Eo.subVectors(e, s);
    const h = ji.dot(Eo), u = Zi.dot(Eo);
    if (h >= 0 && u <= h)
      return t.copy(s);
    const d = c * u - h * l;
    if (d <= 0 && c >= 0 && h <= 0)
      return o = c / (c - h), t.copy(n).addScaledVector(ji, o);
    Mo.subVectors(e, r);
    const f = ji.dot(Mo), g = Zi.dot(Mo);
    if (g >= 0 && f <= g)
      return t.copy(r);
    const _ = f * l - c * g;
    if (_ <= 0 && l >= 0 && g <= 0)
      return a = l / (l - g), t.copy(n).addScaledVector(Zi, a);
    const m = h * g - f * u;
    if (m <= 0 && u - h >= 0 && f - g >= 0)
      return Gc.subVectors(r, s), a = (u - h) / (u - h + (f - g)), t.copy(s).addScaledVector(Gc, a);
    const p = 1 / (m + _ + d);
    return o = _ * p, a = d * p, t.copy(n).addScaledVector(ji, o).addScaledVector(Zi, a);
  }
  equals(e) {
    return e.a.equals(this.a) && e.b.equals(this.b) && e.c.equals(this.c);
  }
}
const Ch = {
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
}, di = { h: 0, s: 0, l: 0 }, xr = { h: 0, s: 0, l: 0 };
function Co(i, e, t) {
  return t < 0 && (t += 1), t > 1 && (t -= 1), t < 1 / 6 ? i + (e - i) * 6 * t : t < 1 / 2 ? e : t < 2 / 3 ? i + (e - i) * 6 * (2 / 3 - t) : i;
}
class Ne {
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
  setHex(e, t = Ot) {
    return e = Math.floor(e), this.r = (e >> 16 & 255) / 255, this.g = (e >> 8 & 255) / 255, this.b = (e & 255) / 255, ct.toWorkingColorSpace(this, t), this;
  }
  setRGB(e, t, n, s = ct.workingColorSpace) {
    return this.r = e, this.g = t, this.b = n, ct.toWorkingColorSpace(this, s), this;
  }
  setHSL(e, t, n, s = ct.workingColorSpace) {
    if (e = sc(e, 1), t = Ye(t, 0, 1), n = Ye(n, 0, 1), t === 0)
      this.r = this.g = this.b = n;
    else {
      const r = n <= 0.5 ? n * (1 + t) : n + t - n * t, o = 2 * n - r;
      this.r = Co(o, r, e + 1 / 3), this.g = Co(o, r, e), this.b = Co(o, r, e - 1 / 3);
    }
    return ct.toWorkingColorSpace(this, s), this;
  }
  setStyle(e, t = Ot) {
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
  setColorName(e, t = Ot) {
    const n = Ch[e.toLowerCase()];
    return n !== void 0 ? this.setHex(n, t) : console.warn("THREE.Color: Unknown color " + e), this;
  }
  clone() {
    return new this.constructor(this.r, this.g, this.b);
  }
  copy(e) {
    return this.r = e.r, this.g = e.g, this.b = e.b, this;
  }
  copySRGBToLinear(e) {
    return this.r = ti(e.r), this.g = ti(e.g), this.b = ti(e.b), this;
  }
  copyLinearToSRGB(e) {
    return this.r = ms(e.r), this.g = ms(e.g), this.b = ms(e.b), this;
  }
  convertSRGBToLinear() {
    return this.copySRGBToLinear(this), this;
  }
  convertLinearToSRGB() {
    return this.copyLinearToSRGB(this), this;
  }
  getHex(e = Ot) {
    return ct.fromWorkingColorSpace(Kt.copy(this), e), Math.round(Ye(Kt.r * 255, 0, 255)) * 65536 + Math.round(Ye(Kt.g * 255, 0, 255)) * 256 + Math.round(Ye(Kt.b * 255, 0, 255));
  }
  getHexString(e = Ot) {
    return ("000000" + this.getHex(e).toString(16)).slice(-6);
  }
  getHSL(e, t = ct.workingColorSpace) {
    ct.fromWorkingColorSpace(Kt.copy(this), t);
    const n = Kt.r, s = Kt.g, r = Kt.b, o = Math.max(n, s, r), a = Math.min(n, s, r);
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
  getRGB(e, t = ct.workingColorSpace) {
    return ct.fromWorkingColorSpace(Kt.copy(this), t), e.r = Kt.r, e.g = Kt.g, e.b = Kt.b, e;
  }
  getStyle(e = Ot) {
    ct.fromWorkingColorSpace(Kt.copy(this), e);
    const t = Kt.r, n = Kt.g, s = Kt.b;
    return e !== Ot ? `color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})` : `rgb(${Math.round(t * 255)},${Math.round(n * 255)},${Math.round(s * 255)})`;
  }
  offsetHSL(e, t, n) {
    return this.getHSL(di), this.setHSL(di.h + e, di.s + t, di.l + n);
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
    this.getHSL(di), e.getHSL(xr);
    const n = Qs(di.h, xr.h, t), s = Qs(di.s, xr.s, t), r = Qs(di.l, xr.l, t);
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
const Kt = /* @__PURE__ */ new Ne();
Ne.NAMES = Ch;
let Ud = 0;
class On extends bi {
  constructor() {
    super(), this.isMaterial = !0, Object.defineProperty(this, "id", { value: Ud++ }), this.uuid = Cn(), this.name = "", this.type = "Material", this.blending = fs, this.side = ni, this.vertexColors = !1, this.opacity = 1, this.transparent = !1, this.alphaHash = !1, this.blendSrc = ta, this.blendDst = na, this.blendEquation = Ni, this.blendSrcAlpha = null, this.blendDstAlpha = null, this.blendEquationAlpha = null, this.blendColor = new Ne(0, 0, 0), this.blendAlpha = 0, this.depthFunc = _s, this.depthTest = !0, this.depthWrite = !0, this.stencilWriteMask = 255, this.stencilFunc = Cc, this.stencilRef = 0, this.stencilFuncMask = 255, this.stencilFail = Hi, this.stencilZFail = Hi, this.stencilZPass = Hi, this.stencilWrite = !1, this.clippingPlanes = null, this.clipIntersection = !1, this.clipShadows = !1, this.shadowSide = null, this.colorWrite = !0, this.precision = null, this.polygonOffset = !1, this.polygonOffsetFactor = 0, this.polygonOffsetUnits = 0, this.dithering = !1, this.alphaToCoverage = !1, this.premultipliedAlpha = !1, this.forceSinglePass = !1, this.visible = !0, this.toneMapped = !0, this.userData = {}, this.version = 0, this._alphaTest = 0;
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
    n.uuid = this.uuid, n.type = this.type, this.name !== "" && (n.name = this.name), this.color && this.color.isColor && (n.color = this.color.getHex()), this.roughness !== void 0 && (n.roughness = this.roughness), this.metalness !== void 0 && (n.metalness = this.metalness), this.sheen !== void 0 && (n.sheen = this.sheen), this.sheenColor && this.sheenColor.isColor && (n.sheenColor = this.sheenColor.getHex()), this.sheenRoughness !== void 0 && (n.sheenRoughness = this.sheenRoughness), this.emissive && this.emissive.isColor && (n.emissive = this.emissive.getHex()), this.emissiveIntensity !== void 0 && this.emissiveIntensity !== 1 && (n.emissiveIntensity = this.emissiveIntensity), this.specular && this.specular.isColor && (n.specular = this.specular.getHex()), this.specularIntensity !== void 0 && (n.specularIntensity = this.specularIntensity), this.specularColor && this.specularColor.isColor && (n.specularColor = this.specularColor.getHex()), this.shininess !== void 0 && (n.shininess = this.shininess), this.clearcoat !== void 0 && (n.clearcoat = this.clearcoat), this.clearcoatRoughness !== void 0 && (n.clearcoatRoughness = this.clearcoatRoughness), this.clearcoatMap && this.clearcoatMap.isTexture && (n.clearcoatMap = this.clearcoatMap.toJSON(e).uuid), this.clearcoatRoughnessMap && this.clearcoatRoughnessMap.isTexture && (n.clearcoatRoughnessMap = this.clearcoatRoughnessMap.toJSON(e).uuid), this.clearcoatNormalMap && this.clearcoatNormalMap.isTexture && (n.clearcoatNormalMap = this.clearcoatNormalMap.toJSON(e).uuid, n.clearcoatNormalScale = this.clearcoatNormalScale.toArray()), this.dispersion !== void 0 && (n.dispersion = this.dispersion), this.iridescence !== void 0 && (n.iridescence = this.iridescence), this.iridescenceIOR !== void 0 && (n.iridescenceIOR = this.iridescenceIOR), this.iridescenceThicknessRange !== void 0 && (n.iridescenceThicknessRange = this.iridescenceThicknessRange), this.iridescenceMap && this.iridescenceMap.isTexture && (n.iridescenceMap = this.iridescenceMap.toJSON(e).uuid), this.iridescenceThicknessMap && this.iridescenceThicknessMap.isTexture && (n.iridescenceThicknessMap = this.iridescenceThicknessMap.toJSON(e).uuid), this.anisotropy !== void 0 && (n.anisotropy = this.anisotropy), this.anisotropyRotation !== void 0 && (n.anisotropyRotation = this.anisotropyRotation), this.anisotropyMap && this.anisotropyMap.isTexture && (n.anisotropyMap = this.anisotropyMap.toJSON(e).uuid), this.map && this.map.isTexture && (n.map = this.map.toJSON(e).uuid), this.matcap && this.matcap.isTexture && (n.matcap = this.matcap.toJSON(e).uuid), this.alphaMap && this.alphaMap.isTexture && (n.alphaMap = this.alphaMap.toJSON(e).uuid), this.lightMap && this.lightMap.isTexture && (n.lightMap = this.lightMap.toJSON(e).uuid, n.lightMapIntensity = this.lightMapIntensity), this.aoMap && this.aoMap.isTexture && (n.aoMap = this.aoMap.toJSON(e).uuid, n.aoMapIntensity = this.aoMapIntensity), this.bumpMap && this.bumpMap.isTexture && (n.bumpMap = this.bumpMap.toJSON(e).uuid, n.bumpScale = this.bumpScale), this.normalMap && this.normalMap.isTexture && (n.normalMap = this.normalMap.toJSON(e).uuid, n.normalMapType = this.normalMapType, n.normalScale = this.normalScale.toArray()), this.displacementMap && this.displacementMap.isTexture && (n.displacementMap = this.displacementMap.toJSON(e).uuid, n.displacementScale = this.displacementScale, n.displacementBias = this.displacementBias), this.roughnessMap && this.roughnessMap.isTexture && (n.roughnessMap = this.roughnessMap.toJSON(e).uuid), this.metalnessMap && this.metalnessMap.isTexture && (n.metalnessMap = this.metalnessMap.toJSON(e).uuid), this.emissiveMap && this.emissiveMap.isTexture && (n.emissiveMap = this.emissiveMap.toJSON(e).uuid), this.specularMap && this.specularMap.isTexture && (n.specularMap = this.specularMap.toJSON(e).uuid), this.specularIntensityMap && this.specularIntensityMap.isTexture && (n.specularIntensityMap = this.specularIntensityMap.toJSON(e).uuid), this.specularColorMap && this.specularColorMap.isTexture && (n.specularColorMap = this.specularColorMap.toJSON(e).uuid), this.envMap && this.envMap.isTexture && (n.envMap = this.envMap.toJSON(e).uuid, this.combine !== void 0 && (n.combine = this.combine)), this.envMapRotation !== void 0 && (n.envMapRotation = this.envMapRotation.toArray()), this.envMapIntensity !== void 0 && (n.envMapIntensity = this.envMapIntensity), this.reflectivity !== void 0 && (n.reflectivity = this.reflectivity), this.refractionRatio !== void 0 && (n.refractionRatio = this.refractionRatio), this.gradientMap && this.gradientMap.isTexture && (n.gradientMap = this.gradientMap.toJSON(e).uuid), this.transmission !== void 0 && (n.transmission = this.transmission), this.transmissionMap && this.transmissionMap.isTexture && (n.transmissionMap = this.transmissionMap.toJSON(e).uuid), this.thickness !== void 0 && (n.thickness = this.thickness), this.thicknessMap && this.thicknessMap.isTexture && (n.thicknessMap = this.thicknessMap.toJSON(e).uuid), this.attenuationDistance !== void 0 && this.attenuationDistance !== 1 / 0 && (n.attenuationDistance = this.attenuationDistance), this.attenuationColor !== void 0 && (n.attenuationColor = this.attenuationColor.getHex()), this.size !== void 0 && (n.size = this.size), this.shadowSide !== null && (n.shadowSide = this.shadowSide), this.sizeAttenuation !== void 0 && (n.sizeAttenuation = this.sizeAttenuation), this.blending !== fs && (n.blending = this.blending), this.side !== ni && (n.side = this.side), this.vertexColors === !0 && (n.vertexColors = !0), this.opacity < 1 && (n.opacity = this.opacity), this.transparent === !0 && (n.transparent = !0), this.blendSrc !== ta && (n.blendSrc = this.blendSrc), this.blendDst !== na && (n.blendDst = this.blendDst), this.blendEquation !== Ni && (n.blendEquation = this.blendEquation), this.blendSrcAlpha !== null && (n.blendSrcAlpha = this.blendSrcAlpha), this.blendDstAlpha !== null && (n.blendDstAlpha = this.blendDstAlpha), this.blendEquationAlpha !== null && (n.blendEquationAlpha = this.blendEquationAlpha), this.blendColor && this.blendColor.isColor && (n.blendColor = this.blendColor.getHex()), this.blendAlpha !== 0 && (n.blendAlpha = this.blendAlpha), this.depthFunc !== _s && (n.depthFunc = this.depthFunc), this.depthTest === !1 && (n.depthTest = this.depthTest), this.depthWrite === !1 && (n.depthWrite = this.depthWrite), this.colorWrite === !1 && (n.colorWrite = this.colorWrite), this.stencilWriteMask !== 255 && (n.stencilWriteMask = this.stencilWriteMask), this.stencilFunc !== Cc && (n.stencilFunc = this.stencilFunc), this.stencilRef !== 0 && (n.stencilRef = this.stencilRef), this.stencilFuncMask !== 255 && (n.stencilFuncMask = this.stencilFuncMask), this.stencilFail !== Hi && (n.stencilFail = this.stencilFail), this.stencilZFail !== Hi && (n.stencilZFail = this.stencilZFail), this.stencilZPass !== Hi && (n.stencilZPass = this.stencilZPass), this.stencilWrite === !0 && (n.stencilWrite = this.stencilWrite), this.rotation !== void 0 && this.rotation !== 0 && (n.rotation = this.rotation), this.polygonOffset === !0 && (n.polygonOffset = !0), this.polygonOffsetFactor !== 0 && (n.polygonOffsetFactor = this.polygonOffsetFactor), this.polygonOffsetUnits !== 0 && (n.polygonOffsetUnits = this.polygonOffsetUnits), this.linewidth !== void 0 && this.linewidth !== 1 && (n.linewidth = this.linewidth), this.dashSize !== void 0 && (n.dashSize = this.dashSize), this.gapSize !== void 0 && (n.gapSize = this.gapSize), this.scale !== void 0 && (n.scale = this.scale), this.dithering === !0 && (n.dithering = !0), this.alphaTest > 0 && (n.alphaTest = this.alphaTest), this.alphaHash === !0 && (n.alphaHash = !0), this.alphaToCoverage === !0 && (n.alphaToCoverage = !0), this.premultipliedAlpha === !0 && (n.premultipliedAlpha = !0), this.forceSinglePass === !0 && (n.forceSinglePass = !0), this.wireframe === !0 && (n.wireframe = !0), this.wireframeLinewidth > 1 && (n.wireframeLinewidth = this.wireframeLinewidth), this.wireframeLinecap !== "round" && (n.wireframeLinecap = this.wireframeLinecap), this.wireframeLinejoin !== "round" && (n.wireframeLinejoin = this.wireframeLinejoin), this.flatShading === !0 && (n.flatShading = !0), this.visible === !1 && (n.visible = !1), this.toneMapped === !1 && (n.toneMapped = !1), this.fog === !1 && (n.fog = !1), Object.keys(this.userData).length > 0 && (n.userData = this.userData);
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
class vi extends On {
  constructor(e) {
    super(), this.isMeshBasicMaterial = !0, this.type = "MeshBasicMaterial", this.color = new Ne(16777215), this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.specularMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Bn(), this.combine = lh, this.reflectivity = 1, this.refractionRatio = 0.98, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.specularMap = e.specularMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.combine = e.combine, this.reflectivity = e.reflectivity, this.refractionRatio = e.refractionRatio, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.fog = e.fog, this;
  }
}
const Dt = /* @__PURE__ */ new M(), yr = /* @__PURE__ */ new he();
class Wt {
  constructor(e, t, n = !1) {
    if (Array.isArray(e))
      throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");
    this.isBufferAttribute = !0, this.name = "", this.array = e, this.itemSize = t, this.count = e !== void 0 ? e.length / t : 0, this.normalized = n, this.usage = Ha, this.updateRanges = [], this.gpuType = Rn, this.version = 0;
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
        yr.fromBufferAttribute(this, t), yr.applyMatrix3(e), this.setXY(t, yr.x, yr.y);
    else if (this.itemSize === 3)
      for (let t = 0, n = this.count; t < n; t++)
        Dt.fromBufferAttribute(this, t), Dt.applyMatrix3(e), this.setXYZ(t, Dt.x, Dt.y, Dt.z);
    return this;
  }
  applyMatrix4(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Dt.fromBufferAttribute(this, t), Dt.applyMatrix4(e), this.setXYZ(t, Dt.x, Dt.y, Dt.z);
    return this;
  }
  applyNormalMatrix(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Dt.fromBufferAttribute(this, t), Dt.applyNormalMatrix(e), this.setXYZ(t, Dt.x, Dt.y, Dt.z);
    return this;
  }
  transformDirection(e) {
    for (let t = 0, n = this.count; t < n; t++)
      Dt.fromBufferAttribute(this, t), Dt.transformDirection(e), this.setXYZ(t, Dt.x, Dt.y, Dt.z);
    return this;
  }
  set(e, t = 0) {
    return this.array.set(e, t), this;
  }
  getComponent(e, t) {
    let n = this.array[e * this.itemSize + t];
    return this.normalized && (n = Tn(n, this.array)), n;
  }
  setComponent(e, t, n) {
    return this.normalized && (n = xt(n, this.array)), this.array[e * this.itemSize + t] = n, this;
  }
  getX(e) {
    let t = this.array[e * this.itemSize];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  setX(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.array[e * this.itemSize] = t, this;
  }
  getY(e) {
    let t = this.array[e * this.itemSize + 1];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  setY(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.array[e * this.itemSize + 1] = t, this;
  }
  getZ(e) {
    let t = this.array[e * this.itemSize + 2];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  setZ(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.array[e * this.itemSize + 2] = t, this;
  }
  getW(e) {
    let t = this.array[e * this.itemSize + 3];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  setW(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.array[e * this.itemSize + 3] = t, this;
  }
  setXY(e, t, n) {
    return e *= this.itemSize, this.normalized && (t = xt(t, this.array), n = xt(n, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this;
  }
  setXYZ(e, t, n, s) {
    return e *= this.itemSize, this.normalized && (t = xt(t, this.array), n = xt(n, this.array), s = xt(s, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = s, this;
  }
  setXYZW(e, t, n, s, r) {
    return e *= this.itemSize, this.normalized && (t = xt(t, this.array), n = xt(n, this.array), s = xt(s, this.array), r = xt(r, this.array)), this.array[e + 0] = t, this.array[e + 1] = n, this.array[e + 2] = s, this.array[e + 3] = r, this;
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
    return this.name !== "" && (e.name = this.name), this.usage !== Ha && (e.usage = this.usage), e;
  }
}
class Ph extends Wt {
  constructor(e, t, n) {
    super(new Uint16Array(e), t, n);
  }
}
class Ih extends Wt {
  constructor(e, t, n) {
    super(new Uint32Array(e), t, n);
  }
}
class ut extends Wt {
  constructor(e, t, n) {
    super(new Float32Array(e), t, n);
  }
}
let Fd = 0;
const vn = /* @__PURE__ */ new We(), Po = /* @__PURE__ */ new Mt(), $i = /* @__PURE__ */ new M(), fn = /* @__PURE__ */ new In(), Vs = /* @__PURE__ */ new In(), Vt = /* @__PURE__ */ new M();
class Ht extends bi {
  constructor() {
    super(), this.isBufferGeometry = !0, Object.defineProperty(this, "id", { value: Fd++ }), this.uuid = Cn(), this.name = "", this.type = "BufferGeometry", this.index = null, this.indirect = null, this.attributes = {}, this.morphAttributes = {}, this.morphTargetsRelative = !1, this.groups = [], this.boundingBox = null, this.boundingSphere = null, this.drawRange = { start: 0, count: 1 / 0 }, this.userData = {};
  }
  getIndex() {
    return this.index;
  }
  setIndex(e) {
    return Array.isArray(e) ? this.index = new (Mh(e) ? Ih : Ph)(e, 1) : this.index = e, this;
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
    return vn.makeRotationFromQuaternion(e), this.applyMatrix4(vn), this;
  }
  rotateX(e) {
    return vn.makeRotationX(e), this.applyMatrix4(vn), this;
  }
  rotateY(e) {
    return vn.makeRotationY(e), this.applyMatrix4(vn), this;
  }
  rotateZ(e) {
    return vn.makeRotationZ(e), this.applyMatrix4(vn), this;
  }
  translate(e, t, n) {
    return vn.makeTranslation(e, t, n), this.applyMatrix4(vn), this;
  }
  scale(e, t, n) {
    return vn.makeScale(e, t, n), this.applyMatrix4(vn), this;
  }
  lookAt(e) {
    return Po.lookAt(e), Po.updateMatrix(), this.applyMatrix4(Po.matrix), this;
  }
  center() {
    return this.computeBoundingBox(), this.boundingBox.getCenter($i).negate(), this.translate($i.x, $i.y, $i.z), this;
  }
  setFromPoints(e) {
    const t = this.getAttribute("position");
    if (t === void 0) {
      const n = [];
      for (let s = 0, r = e.length; s < r; s++) {
        const o = e[s];
        n.push(o.x, o.y, o.z || 0);
      }
      this.setAttribute("position", new ut(n, 3));
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
    this.boundingBox === null && (this.boundingBox = new In());
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
          fn.setFromBufferAttribute(r), this.morphTargetsRelative ? (Vt.addVectors(this.boundingBox.min, fn.min), this.boundingBox.expandByPoint(Vt), Vt.addVectors(this.boundingBox.max, fn.max), this.boundingBox.expandByPoint(Vt)) : (this.boundingBox.expandByPoint(fn.min), this.boundingBox.expandByPoint(fn.max));
        }
    } else
      this.boundingBox.makeEmpty();
    (isNaN(this.boundingBox.min.x) || isNaN(this.boundingBox.min.y) || isNaN(this.boundingBox.min.z)) && console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.', this);
  }
  computeBoundingSphere() {
    this.boundingSphere === null && (this.boundingSphere = new kn());
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
          Vs.setFromBufferAttribute(a), this.morphTargetsRelative ? (Vt.addVectors(fn.min, Vs.min), fn.expandByPoint(Vt), Vt.addVectors(fn.max, Vs.max), fn.expandByPoint(Vt)) : (fn.expandByPoint(Vs.min), fn.expandByPoint(Vs.max));
        }
      fn.getCenter(n);
      let s = 0;
      for (let r = 0, o = e.count; r < o; r++)
        Vt.fromBufferAttribute(e, r), s = Math.max(s, n.distanceToSquared(Vt));
      if (t)
        for (let r = 0, o = t.length; r < o; r++) {
          const a = t[r], c = this.morphTargetsRelative;
          for (let l = 0, h = a.count; l < h; l++)
            Vt.fromBufferAttribute(a, l), c && ($i.fromBufferAttribute(e, l), Vt.add($i)), s = Math.max(s, n.distanceToSquared(Vt));
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
    this.hasAttribute("tangent") === !1 && this.setAttribute("tangent", new Wt(new Float32Array(4 * n.count), 4));
    const o = this.getAttribute("tangent"), a = [], c = [];
    for (let I = 0; I < n.count; I++)
      a[I] = new M(), c[I] = new M();
    const l = new M(), h = new M(), u = new M(), d = new he(), f = new he(), g = new he(), _ = new M(), m = new M();
    function p(I, w, S) {
      l.fromBufferAttribute(n, I), h.fromBufferAttribute(n, w), u.fromBufferAttribute(n, S), d.fromBufferAttribute(r, I), f.fromBufferAttribute(r, w), g.fromBufferAttribute(r, S), h.sub(l), u.sub(l), f.sub(d), g.sub(d);
      const L = 1 / (f.x * g.y - g.x * f.y);
      isFinite(L) && (_.copy(h).multiplyScalar(g.y).addScaledVector(u, -f.y).multiplyScalar(L), m.copy(u).multiplyScalar(f.x).addScaledVector(h, -g.x).multiplyScalar(L), a[I].add(_), a[w].add(_), a[S].add(_), c[I].add(m), c[w].add(m), c[S].add(m));
    }
    let x = this.groups;
    x.length === 0 && (x = [{
      start: 0,
      count: e.count
    }]);
    for (let I = 0, w = x.length; I < w; ++I) {
      const S = x[I], L = S.start, H = S.count;
      for (let V = L, Y = L + H; V < Y; V += 3)
        p(
          e.getX(V + 0),
          e.getX(V + 1),
          e.getX(V + 2)
        );
    }
    const b = new M(), v = new M(), P = new M(), T = new M();
    function C(I) {
      P.fromBufferAttribute(s, I), T.copy(P);
      const w = a[I];
      b.copy(w), b.sub(P.multiplyScalar(P.dot(w))).normalize(), v.crossVectors(T, w);
      const L = v.dot(c[I]) < 0 ? -1 : 1;
      o.setXYZW(I, b.x, b.y, b.z, L);
    }
    for (let I = 0, w = x.length; I < w; ++I) {
      const S = x[I], L = S.start, H = S.count;
      for (let V = L, Y = L + H; V < Y; V += 3)
        C(e.getX(V + 0)), C(e.getX(V + 1)), C(e.getX(V + 2));
    }
  }
  computeVertexNormals() {
    const e = this.index, t = this.getAttribute("position");
    if (t !== void 0) {
      let n = this.getAttribute("normal");
      if (n === void 0)
        n = new Wt(new Float32Array(t.count * 3), 3), this.setAttribute("normal", n);
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
      Vt.fromBufferAttribute(e, t), Vt.normalize(), e.setXYZ(t, Vt.x, Vt.y, Vt.z);
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
      return new Wt(d, h, u);
    }
    if (this.index === null)
      return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."), this;
    const t = new Ht(), n = this.index.array, s = this.attributes;
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
const Wc = /* @__PURE__ */ new We(), Ai = /* @__PURE__ */ new cr(), Sr = /* @__PURE__ */ new kn(), Xc = /* @__PURE__ */ new M(), br = /* @__PURE__ */ new M(), wr = /* @__PURE__ */ new M(), Er = /* @__PURE__ */ new M(), Io = /* @__PURE__ */ new M(), Mr = /* @__PURE__ */ new M(), qc = /* @__PURE__ */ new M(), Tr = /* @__PURE__ */ new M();
class ae extends Mt {
  constructor(e = new Ht(), t = new vi()) {
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
      Mr.set(0, 0, 0);
      for (let c = 0, l = r.length; c < l; c++) {
        const h = a[c], u = r[c];
        h !== 0 && (Io.fromBufferAttribute(u, e), o ? Mr.addScaledVector(Io, h) : Mr.addScaledVector(Io.sub(t), h));
      }
      t.add(Mr);
    }
    return t;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.material, r = this.matrixWorld;
    s !== void 0 && (n.boundingSphere === null && n.computeBoundingSphere(), Sr.copy(n.boundingSphere), Sr.applyMatrix4(r), Ai.copy(e.ray).recast(e.near), !(Sr.containsPoint(Ai.origin) === !1 && (Ai.intersectSphere(Sr, Xc) === null || Ai.origin.distanceToSquared(Xc) > (e.far - e.near) ** 2)) && (Wc.copy(r).invert(), Ai.copy(e.ray).applyMatrix4(Wc), !(n.boundingBox !== null && Ai.intersectsBox(n.boundingBox) === !1) && this._computeIntersections(e, t, Ai)));
  }
  _computeIntersections(e, t, n) {
    let s;
    const r = this.geometry, o = this.material, a = r.index, c = r.attributes.position, l = r.attributes.uv, h = r.attributes.uv1, u = r.attributes.normal, d = r.groups, f = r.drawRange;
    if (a !== null)
      if (Array.isArray(o))
        for (let g = 0, _ = d.length; g < _; g++) {
          const m = d[g], p = o[m.materialIndex], x = Math.max(m.start, f.start), b = Math.min(a.count, Math.min(m.start + m.count, f.start + f.count));
          for (let v = x, P = b; v < P; v += 3) {
            const T = a.getX(v), C = a.getX(v + 1), I = a.getX(v + 2);
            s = Ar(this, p, e, n, l, h, u, T, C, I), s && (s.faceIndex = Math.floor(v / 3), s.face.materialIndex = m.materialIndex, t.push(s));
          }
        }
      else {
        const g = Math.max(0, f.start), _ = Math.min(a.count, f.start + f.count);
        for (let m = g, p = _; m < p; m += 3) {
          const x = a.getX(m), b = a.getX(m + 1), v = a.getX(m + 2);
          s = Ar(this, o, e, n, l, h, u, x, b, v), s && (s.faceIndex = Math.floor(m / 3), t.push(s));
        }
      }
    else if (c !== void 0)
      if (Array.isArray(o))
        for (let g = 0, _ = d.length; g < _; g++) {
          const m = d[g], p = o[m.materialIndex], x = Math.max(m.start, f.start), b = Math.min(c.count, Math.min(m.start + m.count, f.start + f.count));
          for (let v = x, P = b; v < P; v += 3) {
            const T = v, C = v + 1, I = v + 2;
            s = Ar(this, p, e, n, l, h, u, T, C, I), s && (s.faceIndex = Math.floor(v / 3), s.face.materialIndex = m.materialIndex, t.push(s));
          }
        }
      else {
        const g = Math.max(0, f.start), _ = Math.min(c.count, f.start + f.count);
        for (let m = g, p = _; m < p; m += 3) {
          const x = m, b = m + 1, v = m + 2;
          s = Ar(this, o, e, n, l, h, u, x, b, v), s && (s.faceIndex = Math.floor(m / 3), t.push(s));
        }
      }
  }
}
function Od(i, e, t, n, s, r, o, a) {
  let c;
  if (e.side === sn ? c = n.intersectTriangle(o, r, s, !0, a) : c = n.intersectTriangle(s, r, o, e.side === ni, a), c === null) return null;
  Tr.copy(a), Tr.applyMatrix4(i.matrixWorld);
  const l = t.ray.origin.distanceTo(Tr);
  return l < t.near || l > t.far ? null : {
    distance: l,
    point: Tr.clone(),
    object: i
  };
}
function Ar(i, e, t, n, s, r, o, a, c, l) {
  i.getVertexPosition(a, br), i.getVertexPosition(c, wr), i.getVertexPosition(l, Er);
  const h = Od(i, e, t, n, br, wr, Er, qc);
  if (h) {
    const u = new M();
    An.getBarycoord(qc, br, wr, Er, u), s && (h.uv = An.getInterpolatedAttribute(s, a, c, l, u, new he())), r && (h.uv1 = An.getInterpolatedAttribute(r, a, c, l, u, new he())), o && (h.normal = An.getInterpolatedAttribute(o, a, c, l, u, new M()), h.normal.dot(n.direction) > 0 && h.normal.multiplyScalar(-1));
    const d = {
      a,
      b: c,
      c: l,
      normal: new M(),
      materialIndex: 0
    };
    An.getNormal(br, wr, Er, d.normal), h.face = d, h.barycoord = u;
  }
  return h;
}
class vt extends Ht {
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
    g("z", "y", "x", -1, -1, n, t, e, o, r, 0), g("z", "y", "x", 1, -1, n, t, -e, o, r, 1), g("x", "z", "y", 1, 1, e, n, t, s, o, 2), g("x", "z", "y", 1, -1, e, n, -t, s, o, 3), g("x", "y", "z", 1, -1, e, t, n, s, r, 4), g("x", "y", "z", -1, -1, e, t, -n, s, r, 5), this.setIndex(c), this.setAttribute("position", new ut(l, 3)), this.setAttribute("normal", new ut(h, 3)), this.setAttribute("uv", new ut(u, 2));
    function g(_, m, p, x, b, v, P, T, C, I, w) {
      const S = v / C, L = P / I, H = v / 2, V = P / 2, Y = T / 2, ee = C + 1, K = I + 1;
      let oe = 0, q = 0;
      const ce = new M();
      for (let ve = 0; ve < K; ve++) {
        const fe = ve * L - V;
        for (let Ie = 0; Ie < ee; Ie++) {
          const ot = Ie * S - H;
          ce[_] = ot * x, ce[m] = fe * b, ce[p] = Y, l.push(ce.x, ce.y, ce.z), ce[_] = 0, ce[m] = 0, ce[p] = T > 0 ? 1 : -1, h.push(ce.x, ce.y, ce.z), u.push(Ie / C), u.push(1 - ve / I), oe += 1;
        }
      }
      for (let ve = 0; ve < I; ve++)
        for (let fe = 0; fe < C; fe++) {
          const Ie = d + fe + ee * ve, ot = d + fe + ee * (ve + 1), j = d + (fe + 1) + ee * (ve + 1), ne = d + (fe + 1) + ee * ve;
          c.push(Ie, ot, ne), c.push(ot, j, ne), q += 6;
        }
      a.addGroup(f, q, w), f += q, d += oe;
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new vt(e.width, e.height, e.depth, e.widthSegments, e.heightSegments, e.depthSegments);
  }
}
function ws(i) {
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
function tn(i) {
  const e = {};
  for (let t = 0; t < i.length; t++) {
    const n = ws(i[t]);
    for (const s in n)
      e[s] = n[s];
  }
  return e;
}
function Bd(i) {
  const e = [];
  for (let t = 0; t < i.length; t++)
    e.push(i[t].clone());
  return e;
}
function Lh(i) {
  const e = i.getRenderTarget();
  return e === null ? i.outputColorSpace : e.isXRRenderTarget === !0 ? e.texture.colorSpace : ct.workingColorSpace;
}
const kd = { clone: ws, merge: tn };
var zd = `void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`, Hd = `void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;
class si extends On {
  constructor(e) {
    super(), this.isShaderMaterial = !0, this.type = "ShaderMaterial", this.defines = {}, this.uniforms = {}, this.uniformsGroups = [], this.vertexShader = zd, this.fragmentShader = Hd, this.linewidth = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.fog = !1, this.lights = !1, this.clipping = !1, this.forceSinglePass = !0, this.extensions = {
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
    return super.copy(e), this.fragmentShader = e.fragmentShader, this.vertexShader = e.vertexShader, this.uniforms = ws(e.uniforms), this.uniformsGroups = Bd(e.uniformsGroups), this.defines = Object.assign({}, e.defines), this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.fog = e.fog, this.lights = e.lights, this.clipping = e.clipping, this.extensions = Object.assign({}, e.extensions), this.glslVersion = e.glslVersion, this;
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
class Dh extends Mt {
  constructor() {
    super(), this.isCamera = !0, this.type = "Camera", this.matrixWorldInverse = new We(), this.projectionMatrix = new We(), this.projectionMatrixInverse = new We(), this.coordinateSystem = ei;
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
const fi = /* @__PURE__ */ new M(), Yc = /* @__PURE__ */ new he(), Kc = /* @__PURE__ */ new he();
class nn extends Dh {
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
    this.fov = bs * 2 * Math.atan(t), this.updateProjectionMatrix();
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
    return bs * 2 * Math.atan(
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
    fi.set(-1, -1, 0.5).applyMatrix4(this.projectionMatrixInverse), t.set(fi.x, fi.y).multiplyScalar(-e / fi.z), fi.set(1, 1, 0.5).applyMatrix4(this.projectionMatrixInverse), n.set(fi.x, fi.y).multiplyScalar(-e / fi.z);
  }
  /**
   * Computes the width and height of the camera's viewable rectangle at a given distance along the viewing direction.
   *
   * @param {number} distance
   * @param {Vector2} target - Vector2 target used to store result where x is width and y is height.
   * @returns {Vector2}
   */
  getViewSize(e, t) {
    return this.getViewBounds(e, Yc, Kc), t.subVectors(Kc, Yc);
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
const Ji = -90, Qi = 1;
class Vd extends Mt {
  constructor(e, t, n) {
    super(), this.type = "CubeCamera", this.renderTarget = n, this.coordinateSystem = null, this.activeMipmapLevel = 0;
    const s = new nn(Ji, Qi, e, t);
    s.layers = this.layers, this.add(s);
    const r = new nn(Ji, Qi, e, t);
    r.layers = this.layers, this.add(r);
    const o = new nn(Ji, Qi, e, t);
    o.layers = this.layers, this.add(o);
    const a = new nn(Ji, Qi, e, t);
    a.layers = this.layers, this.add(a);
    const c = new nn(Ji, Qi, e, t);
    c.layers = this.layers, this.add(c);
    const l = new nn(Ji, Qi, e, t);
    l.layers = this.layers, this.add(l);
  }
  updateCoordinateSystem() {
    const e = this.coordinateSystem, t = this.children.concat(), [n, s, r, o, a, c] = t;
    for (const l of t) this.remove(l);
    if (e === ei)
      n.up.set(0, 1, 0), n.lookAt(1, 0, 0), s.up.set(0, 1, 0), s.lookAt(-1, 0, 0), r.up.set(0, 0, -1), r.lookAt(0, 1, 0), o.up.set(0, 0, 1), o.lookAt(0, -1, 0), a.up.set(0, 1, 0), a.lookAt(0, 0, 1), c.up.set(0, 1, 0), c.lookAt(0, 0, -1);
    else if (e === no)
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
class Nh extends Bt {
  constructor(e, t, n, s, r, o, a, c, l, h) {
    e = e !== void 0 ? e : [], t = t !== void 0 ? t : vs, super(e, t, n, s, r, o, a, c, l, h), this.isCubeTexture = !0, this.flipY = !1;
  }
  get images() {
    return this.image;
  }
  set images(e) {
    this.image = e;
  }
}
class Gd extends Oi {
  constructor(e = 1, t = {}) {
    super(e, e, t), this.isWebGLCubeRenderTarget = !0;
    const n = { width: e, height: e, depth: 1 }, s = [n, n, n, n, n, n];
    this.texture = new Nh(s, t.mapping, t.wrapS, t.wrapT, t.magFilter, t.minFilter, t.format, t.type, t.anisotropy, t.colorSpace), this.texture.isRenderTargetTexture = !0, this.texture.generateMipmaps = t.generateMipmaps !== void 0 ? t.generateMipmaps : !1, this.texture.minFilter = t.minFilter !== void 0 ? t.minFilter : pn;
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
    }, s = new vt(5, 5, 5), r = new si({
      name: "CubemapFromEquirect",
      uniforms: ws(n.uniforms),
      vertexShader: n.vertexShader,
      fragmentShader: n.fragmentShader,
      side: sn,
      blending: yi
    });
    r.uniforms.tEquirect.value = t;
    const o = new ae(s, r), a = t.minFilter;
    return t.minFilter === Qn && (t.minFilter = pn), new Vd(1, 10, this).update(e, o), t.minFilter = a, o.geometry.dispose(), o.material.dispose(), this;
  }
  clear(e, t, n, s) {
    const r = e.getRenderTarget();
    for (let o = 0; o < 6; o++)
      e.setRenderTarget(this, o), e.clear(t, n, s);
    e.setRenderTarget(r);
  }
}
class hs {
  constructor(e, t = 25e-5) {
    this.isFogExp2 = !0, this.name = "", this.color = new Ne(e), this.density = t;
  }
  clone() {
    return new hs(this.color, this.density);
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
class Wd extends Mt {
  constructor() {
    super(), this.isScene = !0, this.type = "Scene", this.background = null, this.environment = null, this.fog = null, this.backgroundBlurriness = 0, this.backgroundIntensity = 1, this.backgroundRotation = new Bn(), this.environmentIntensity = 1, this.environmentRotation = new Bn(), this.overrideMaterial = null, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
  }
  copy(e, t) {
    return super.copy(e, t), e.background !== null && (this.background = e.background.clone()), e.environment !== null && (this.environment = e.environment.clone()), e.fog !== null && (this.fog = e.fog.clone()), this.backgroundBlurriness = e.backgroundBlurriness, this.backgroundIntensity = e.backgroundIntensity, this.backgroundRotation.copy(e.backgroundRotation), this.environmentIntensity = e.environmentIntensity, this.environmentRotation.copy(e.environmentRotation), e.overrideMaterial !== null && (this.overrideMaterial = e.overrideMaterial.clone()), this.matrixAutoUpdate = e.matrixAutoUpdate, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return this.fog !== null && (t.object.fog = this.fog.toJSON()), this.backgroundBlurriness > 0 && (t.object.backgroundBlurriness = this.backgroundBlurriness), this.backgroundIntensity !== 1 && (t.object.backgroundIntensity = this.backgroundIntensity), t.object.backgroundRotation = this.backgroundRotation.toArray(), this.environmentIntensity !== 1 && (t.object.environmentIntensity = this.environmentIntensity), t.object.environmentRotation = this.environmentRotation.toArray(), t;
  }
}
class Xd {
  constructor(e, t) {
    this.isInterleavedBuffer = !0, this.array = e, this.stride = t, this.count = e !== void 0 ? e.length / t : 0, this.usage = Ha, this.updateRanges = [], this.version = 0, this.uuid = Cn();
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
    e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = Cn()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = this.array.slice(0).buffer);
    const t = new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]), n = new this.constructor(t, this.stride);
    return n.setUsage(this.usage), n;
  }
  onUpload(e) {
    return this.onUploadCallback = e, this;
  }
  toJSON(e) {
    return e.arrayBuffers === void 0 && (e.arrayBuffers = {}), this.array.buffer._uuid === void 0 && (this.array.buffer._uuid = Cn()), e.arrayBuffers[this.array.buffer._uuid] === void 0 && (e.arrayBuffers[this.array.buffer._uuid] = Array.from(new Uint32Array(this.array.buffer))), {
      uuid: this.uuid,
      buffer: this.array.buffer._uuid,
      type: this.array.constructor.name,
      stride: this.stride
    };
  }
}
const en = /* @__PURE__ */ new M();
class rc {
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
      en.fromBufferAttribute(this, t), en.applyMatrix4(e), this.setXYZ(t, en.x, en.y, en.z);
    return this;
  }
  applyNormalMatrix(e) {
    for (let t = 0, n = this.count; t < n; t++)
      en.fromBufferAttribute(this, t), en.applyNormalMatrix(e), this.setXYZ(t, en.x, en.y, en.z);
    return this;
  }
  transformDirection(e) {
    for (let t = 0, n = this.count; t < n; t++)
      en.fromBufferAttribute(this, t), en.transformDirection(e), this.setXYZ(t, en.x, en.y, en.z);
    return this;
  }
  getComponent(e, t) {
    let n = this.array[e * this.data.stride + this.offset + t];
    return this.normalized && (n = Tn(n, this.array)), n;
  }
  setComponent(e, t, n) {
    return this.normalized && (n = xt(n, this.array)), this.data.array[e * this.data.stride + this.offset + t] = n, this;
  }
  setX(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.data.array[e * this.data.stride + this.offset] = t, this;
  }
  setY(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 1] = t, this;
  }
  setZ(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 2] = t, this;
  }
  setW(e, t) {
    return this.normalized && (t = xt(t, this.array)), this.data.array[e * this.data.stride + this.offset + 3] = t, this;
  }
  getX(e) {
    let t = this.data.array[e * this.data.stride + this.offset];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  getY(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 1];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  getZ(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 2];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  getW(e) {
    let t = this.data.array[e * this.data.stride + this.offset + 3];
    return this.normalized && (t = Tn(t, this.array)), t;
  }
  setXY(e, t, n) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = xt(t, this.array), n = xt(n, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this;
  }
  setXYZ(e, t, n, s) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = xt(t, this.array), n = xt(n, this.array), s = xt(s, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = s, this;
  }
  setXYZW(e, t, n, s, r) {
    return e = e * this.data.stride + this.offset, this.normalized && (t = xt(t, this.array), n = xt(n, this.array), s = xt(s, this.array), r = xt(r, this.array)), this.data.array[e + 0] = t, this.data.array[e + 1] = n, this.data.array[e + 2] = s, this.data.array[e + 3] = r, this;
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
      return new Wt(new this.array.constructor(t), this.itemSize, this.normalized);
    } else
      return e.interleavedBuffers === void 0 && (e.interleavedBuffers = {}), e.interleavedBuffers[this.data.uuid] === void 0 && (e.interleavedBuffers[this.data.uuid] = this.data.clone(e)), new rc(e.interleavedBuffers[this.data.uuid], this.itemSize, this.offset, this.normalized);
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
const jc = /* @__PURE__ */ new M(), Zc = /* @__PURE__ */ new mt(), $c = /* @__PURE__ */ new mt(), qd = /* @__PURE__ */ new M(), Jc = /* @__PURE__ */ new We(), Rr = /* @__PURE__ */ new M(), Lo = /* @__PURE__ */ new kn(), Qc = /* @__PURE__ */ new We(), Do = /* @__PURE__ */ new cr();
class Yd extends ae {
  constructor(e, t) {
    super(e, t), this.isSkinnedMesh = !0, this.type = "SkinnedMesh", this.bindMode = Rc, this.bindMatrix = new We(), this.bindMatrixInverse = new We(), this.boundingBox = null, this.boundingSphere = null;
  }
  computeBoundingBox() {
    const e = this.geometry;
    this.boundingBox === null && (this.boundingBox = new In()), this.boundingBox.makeEmpty();
    const t = e.getAttribute("position");
    for (let n = 0; n < t.count; n++)
      this.getVertexPosition(n, Rr), this.boundingBox.expandByPoint(Rr);
  }
  computeBoundingSphere() {
    const e = this.geometry;
    this.boundingSphere === null && (this.boundingSphere = new kn()), this.boundingSphere.makeEmpty();
    const t = e.getAttribute("position");
    for (let n = 0; n < t.count; n++)
      this.getVertexPosition(n, Rr), this.boundingSphere.expandByPoint(Rr);
  }
  copy(e, t) {
    return super.copy(e, t), this.bindMode = e.bindMode, this.bindMatrix.copy(e.bindMatrix), this.bindMatrixInverse.copy(e.bindMatrixInverse), this.skeleton = e.skeleton, e.boundingBox !== null && (this.boundingBox = e.boundingBox.clone()), e.boundingSphere !== null && (this.boundingSphere = e.boundingSphere.clone()), this;
  }
  raycast(e, t) {
    const n = this.material, s = this.matrixWorld;
    n !== void 0 && (this.boundingSphere === null && this.computeBoundingSphere(), Lo.copy(this.boundingSphere), Lo.applyMatrix4(s), e.ray.intersectsSphere(Lo) !== !1 && (Qc.copy(s).invert(), Do.copy(e.ray).applyMatrix4(Qc), !(this.boundingBox !== null && Do.intersectsBox(this.boundingBox) === !1) && this._computeIntersections(e, t, Do)));
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
    const e = new mt(), t = this.geometry.attributes.skinWeight;
    for (let n = 0, s = t.count; n < s; n++) {
      e.fromBufferAttribute(t, n);
      const r = 1 / e.manhattanLength();
      r !== 1 / 0 ? e.multiplyScalar(r) : e.set(1, 0, 0, 0), t.setXYZW(n, e.x, e.y, e.z, e.w);
    }
  }
  updateMatrixWorld(e) {
    super.updateMatrixWorld(e), this.bindMode === Rc ? this.bindMatrixInverse.copy(this.matrixWorld).invert() : this.bindMode === Vu ? this.bindMatrixInverse.copy(this.bindMatrix).invert() : console.warn("THREE.SkinnedMesh: Unrecognized bindMode: " + this.bindMode);
  }
  applyBoneTransform(e, t) {
    const n = this.skeleton, s = this.geometry;
    Zc.fromBufferAttribute(s.attributes.skinIndex, e), $c.fromBufferAttribute(s.attributes.skinWeight, e), jc.copy(t).applyMatrix4(this.bindMatrix), t.set(0, 0, 0);
    for (let r = 0; r < 4; r++) {
      const o = $c.getComponent(r);
      if (o !== 0) {
        const a = Zc.getComponent(r);
        Jc.multiplyMatrices(n.bones[a].matrixWorld, n.boneInverses[a]), t.addScaledVector(qd.copy(jc).applyMatrix4(Jc), o);
      }
    }
    return t.applyMatrix4(this.bindMatrixInverse);
  }
}
class Uh extends Mt {
  constructor() {
    super(), this.isBone = !0, this.type = "Bone";
  }
}
class Fh extends Bt {
  constructor(e = null, t = 1, n = 1, s, r, o, a, c, l = rn, h = rn, u, d) {
    super(null, o, a, c, l, h, s, r, u, d), this.isDataTexture = !0, this.image = { data: e, width: t, height: n }, this.generateMipmaps = !1, this.flipY = !1, this.unpackAlignment = 1;
  }
}
const el = /* @__PURE__ */ new We(), Kd = /* @__PURE__ */ new We();
class oc {
  constructor(e = [], t = []) {
    this.uuid = Cn(), this.bones = e.slice(0), this.boneInverses = t, this.boneMatrices = null, this.boneTexture = null, this.init();
  }
  init() {
    const e = this.bones, t = this.boneInverses;
    if (this.boneMatrices = new Float32Array(e.length * 16), t.length === 0)
      this.calculateInverses();
    else if (e.length !== t.length) {
      console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."), this.boneInverses = [];
      for (let n = 0, s = this.bones.length; n < s; n++)
        this.boneInverses.push(new We());
    }
  }
  calculateInverses() {
    this.boneInverses.length = 0;
    for (let e = 0, t = this.bones.length; e < t; e++) {
      const n = new We();
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
      const a = e[r] ? e[r].matrixWorld : Kd;
      el.multiplyMatrices(a, t[r]), el.toArray(n, r * 16);
    }
    s !== null && (s.needsUpdate = !0);
  }
  clone() {
    return new oc(this.bones, this.boneInverses);
  }
  computeBoneTexture() {
    let e = Math.sqrt(this.bones.length * 4);
    e = Math.ceil(e / 4) * 4, e = Math.max(e, 4);
    const t = new Float32Array(e * e * 4);
    t.set(this.boneMatrices);
    const n = new Fh(t, e, e, yn, Rn);
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
      o === void 0 && (console.warn("THREE.Skeleton: No bone found with UUID:", r), o = new Uh()), this.bones.push(o), this.boneInverses.push(new We().fromArray(e.boneInverses[n]));
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
class Va extends Wt {
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
const es = /* @__PURE__ */ new We(), tl = /* @__PURE__ */ new We(), Cr = [], nl = /* @__PURE__ */ new In(), jd = /* @__PURE__ */ new We(), Gs = /* @__PURE__ */ new ae(), Ws = /* @__PURE__ */ new kn();
class Zd extends ae {
  constructor(e, t, n) {
    super(e, t), this.isInstancedMesh = !0, this.instanceMatrix = new Va(new Float32Array(n * 16), 16), this.instanceColor = null, this.morphTexture = null, this.count = n, this.boundingBox = null, this.boundingSphere = null;
    for (let s = 0; s < n; s++)
      this.setMatrixAt(s, jd);
  }
  computeBoundingBox() {
    const e = this.geometry, t = this.count;
    this.boundingBox === null && (this.boundingBox = new In()), e.boundingBox === null && e.computeBoundingBox(), this.boundingBox.makeEmpty();
    for (let n = 0; n < t; n++)
      this.getMatrixAt(n, es), nl.copy(e.boundingBox).applyMatrix4(es), this.boundingBox.union(nl);
  }
  computeBoundingSphere() {
    const e = this.geometry, t = this.count;
    this.boundingSphere === null && (this.boundingSphere = new kn()), e.boundingSphere === null && e.computeBoundingSphere(), this.boundingSphere.makeEmpty();
    for (let n = 0; n < t; n++)
      this.getMatrixAt(n, es), Ws.copy(e.boundingSphere).applyMatrix4(es), this.boundingSphere.union(Ws);
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
        this.getMatrixAt(r, es), tl.multiplyMatrices(n, es), Gs.matrixWorld = tl, Gs.raycast(e, Cr);
        for (let o = 0, a = Cr.length; o < a; o++) {
          const c = Cr[o];
          c.instanceId = r, c.object = this, t.push(c);
        }
        Cr.length = 0;
      }
  }
  setColorAt(e, t) {
    this.instanceColor === null && (this.instanceColor = new Va(new Float32Array(this.instanceMatrix.count * 3).fill(1), 3)), t.toArray(this.instanceColor.array, e * 3);
  }
  setMatrixAt(e, t) {
    t.toArray(this.instanceMatrix.array, e * 16);
  }
  setMorphAt(e, t) {
    const n = t.morphTargetInfluences, s = n.length + 1;
    this.morphTexture === null && (this.morphTexture = new Fh(new Float32Array(s * this.count), s, this.count, Qa, Rn));
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
const No = /* @__PURE__ */ new M(), $d = /* @__PURE__ */ new M(), Jd = /* @__PURE__ */ new Ke();
class mi {
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
    const s = No.subVectors(n, t).cross($d.subVectors(e, t)).normalize();
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
    const n = e.delta(No), s = this.normal.dot(n);
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
    const n = t || Jd.getNormalMatrix(e), s = this.coplanarPoint(No).applyMatrix4(e), r = this.normal.applyMatrix3(n).normalize();
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
const Ri = /* @__PURE__ */ new kn(), Pr = /* @__PURE__ */ new M();
class ac {
  constructor(e = new mi(), t = new mi(), n = new mi(), s = new mi(), r = new mi(), o = new mi()) {
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
  setFromProjectionMatrix(e, t = ei) {
    const n = this.planes, s = e.elements, r = s[0], o = s[1], a = s[2], c = s[3], l = s[4], h = s[5], u = s[6], d = s[7], f = s[8], g = s[9], _ = s[10], m = s[11], p = s[12], x = s[13], b = s[14], v = s[15];
    if (n[0].setComponents(c - r, d - l, m - f, v - p).normalize(), n[1].setComponents(c + r, d + l, m + f, v + p).normalize(), n[2].setComponents(c + o, d + h, m + g, v + x).normalize(), n[3].setComponents(c - o, d - h, m - g, v - x).normalize(), n[4].setComponents(c - a, d - u, m - _, v - b).normalize(), t === ei)
      n[5].setComponents(c + a, d + u, m + _, v + b).normalize();
    else if (t === no)
      n[5].setComponents(a, u, _, b).normalize();
    else
      throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: " + t);
    return this;
  }
  intersectsObject(e) {
    if (e.boundingSphere !== void 0)
      e.boundingSphere === null && e.computeBoundingSphere(), Ri.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);
    else {
      const t = e.geometry;
      t.boundingSphere === null && t.computeBoundingSphere(), Ri.copy(t.boundingSphere).applyMatrix4(e.matrixWorld);
    }
    return this.intersectsSphere(Ri);
  }
  intersectsSprite(e) {
    return Ri.center.set(0, 0, 0), Ri.radius = 0.7071067811865476, Ri.applyMatrix4(e.matrixWorld), this.intersectsSphere(Ri);
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
      if (Pr.x = s.normal.x > 0 ? e.max.x : e.min.x, Pr.y = s.normal.y > 0 ? e.max.y : e.min.y, Pr.z = s.normal.z > 0 ? e.max.z : e.min.z, s.distanceToPoint(Pr) < 0)
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
class Oh extends On {
  constructor(e) {
    super(), this.isLineBasicMaterial = !0, this.type = "LineBasicMaterial", this.color = new Ne(16777215), this.map = null, this.linewidth = 1, this.linecap = "round", this.linejoin = "round", this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.linewidth = e.linewidth, this.linecap = e.linecap, this.linejoin = e.linejoin, this.fog = e.fog, this;
  }
}
const io = /* @__PURE__ */ new M(), so = /* @__PURE__ */ new M(), il = /* @__PURE__ */ new We(), Xs = /* @__PURE__ */ new cr(), Ir = /* @__PURE__ */ new kn(), Uo = /* @__PURE__ */ new M(), sl = /* @__PURE__ */ new M();
class cc extends Mt {
  constructor(e = new Ht(), t = new Oh()) {
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
        io.fromBufferAttribute(t, s - 1), so.fromBufferAttribute(t, s), n[s] = n[s - 1], n[s] += io.distanceTo(so);
      e.setAttribute("lineDistance", new ut(n, 1));
    } else
      console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    return this;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.matrixWorld, r = e.params.Line.threshold, o = n.drawRange;
    if (n.boundingSphere === null && n.computeBoundingSphere(), Ir.copy(n.boundingSphere), Ir.applyMatrix4(s), Ir.radius += r, e.ray.intersectsSphere(Ir) === !1) return;
    il.copy(s).invert(), Xs.copy(e.ray).applyMatrix4(il);
    const a = r / ((this.scale.x + this.scale.y + this.scale.z) / 3), c = a * a, l = this.isLineSegments ? 2 : 1, h = n.index, d = n.attributes.position;
    if (h !== null) {
      const f = Math.max(0, o.start), g = Math.min(h.count, o.start + o.count);
      for (let _ = f, m = g - 1; _ < m; _ += l) {
        const p = h.getX(_), x = h.getX(_ + 1), b = Lr(this, e, Xs, c, p, x);
        b && t.push(b);
      }
      if (this.isLineLoop) {
        const _ = h.getX(g - 1), m = h.getX(f), p = Lr(this, e, Xs, c, _, m);
        p && t.push(p);
      }
    } else {
      const f = Math.max(0, o.start), g = Math.min(d.count, o.start + o.count);
      for (let _ = f, m = g - 1; _ < m; _ += l) {
        const p = Lr(this, e, Xs, c, _, _ + 1);
        p && t.push(p);
      }
      if (this.isLineLoop) {
        const _ = Lr(this, e, Xs, c, g - 1, f);
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
function Lr(i, e, t, n, s, r) {
  const o = i.geometry.attributes.position;
  if (io.fromBufferAttribute(o, s), so.fromBufferAttribute(o, r), t.distanceSqToSegment(io, so, Uo, sl) > n) return;
  Uo.applyMatrix4(i.matrixWorld);
  const c = e.ray.origin.distanceTo(Uo);
  if (!(c < e.near || c > e.far))
    return {
      distance: c,
      // What do we want? intersection point on the ray or on the segment??
      // point: raycaster.ray.at( distance ),
      point: sl.clone().applyMatrix4(i.matrixWorld),
      index: s,
      face: null,
      faceIndex: null,
      barycoord: null,
      object: i
    };
}
const rl = /* @__PURE__ */ new M(), ol = /* @__PURE__ */ new M();
class Qd extends cc {
  constructor(e, t) {
    super(e, t), this.isLineSegments = !0, this.type = "LineSegments";
  }
  computeLineDistances() {
    const e = this.geometry;
    if (e.index === null) {
      const t = e.attributes.position, n = [];
      for (let s = 0, r = t.count; s < r; s += 2)
        rl.fromBufferAttribute(t, s), ol.fromBufferAttribute(t, s + 1), n[s] = s === 0 ? 0 : n[s - 1], n[s + 1] = n[s] + rl.distanceTo(ol);
      e.setAttribute("lineDistance", new ut(n, 1));
    } else
      console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");
    return this;
  }
}
class ef extends cc {
  constructor(e, t) {
    super(e, t), this.isLineLoop = !0, this.type = "LineLoop";
  }
}
class Bh extends On {
  constructor(e) {
    super(), this.isPointsMaterial = !0, this.type = "PointsMaterial", this.color = new Ne(16777215), this.map = null, this.alphaMap = null, this.size = 1, this.sizeAttenuation = !0, this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.color.copy(e.color), this.map = e.map, this.alphaMap = e.alphaMap, this.size = e.size, this.sizeAttenuation = e.sizeAttenuation, this.fog = e.fog, this;
  }
}
const al = /* @__PURE__ */ new We(), Ga = /* @__PURE__ */ new cr(), Dr = /* @__PURE__ */ new kn(), Nr = /* @__PURE__ */ new M();
class tf extends Mt {
  constructor(e = new Ht(), t = new Bh()) {
    super(), this.isPoints = !0, this.type = "Points", this.geometry = e, this.material = t, this.updateMorphTargets();
  }
  copy(e, t) {
    return super.copy(e, t), this.material = Array.isArray(e.material) ? e.material.slice() : e.material, this.geometry = e.geometry, this;
  }
  raycast(e, t) {
    const n = this.geometry, s = this.matrixWorld, r = e.params.Points.threshold, o = n.drawRange;
    if (n.boundingSphere === null && n.computeBoundingSphere(), Dr.copy(n.boundingSphere), Dr.applyMatrix4(s), Dr.radius += r, e.ray.intersectsSphere(Dr) === !1) return;
    al.copy(s).invert(), Ga.copy(e.ray).applyMatrix4(al);
    const a = r / ((this.scale.x + this.scale.y + this.scale.z) / 3), c = a * a, l = n.index, u = n.attributes.position;
    if (l !== null) {
      const d = Math.max(0, o.start), f = Math.min(l.count, o.start + o.count);
      for (let g = d, _ = f; g < _; g++) {
        const m = l.getX(g);
        Nr.fromBufferAttribute(u, m), cl(Nr, m, c, s, e, t, this);
      }
    } else {
      const d = Math.max(0, o.start), f = Math.min(u.count, o.start + o.count);
      for (let g = d, _ = f; g < _; g++)
        Nr.fromBufferAttribute(u, g), cl(Nr, g, c, s, e, t, this);
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
function cl(i, e, t, n, s, r, o) {
  const a = Ga.distanceSqToPoint(i);
  if (a < t) {
    const c = new M();
    Ga.closestPointToPoint(i, c), c.applyMatrix4(n);
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
class ye extends Mt {
  constructor() {
    super(), this.isGroup = !0, this.type = "Group";
  }
}
class nf extends Bt {
  constructor(e, t, n, s, r, o, a, c, l) {
    super(e, t, n, s, r, o, a, c, l), this.isCanvasTexture = !0, this.needsUpdate = !0;
  }
}
class kh extends Bt {
  constructor(e, t, n, s, r, o, a, c, l, h = ps) {
    if (h !== ps && h !== Ss)
      throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");
    n === void 0 && h === ps && (n = Fi), n === void 0 && h === Ss && (n = ys), super(null, s, r, o, a, c, h, n, l), this.isDepthTexture = !0, this.image = { width: e, height: t }, this.magFilter = a !== void 0 ? a : rn, this.minFilter = c !== void 0 ? c : rn, this.flipY = !1, this.generateMipmaps = !1, this.compareFunction = null;
  }
  copy(e) {
    return super.copy(e), this.compareFunction = e.compareFunction, this;
  }
  toJSON(e) {
    const t = super.toJSON(e);
    return this.compareFunction !== null && (t.compareFunction = this.compareFunction), t;
  }
}
class zn {
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
    const o = this.getPoint(s), a = this.getPoint(r), c = t || (o.isVector2 ? new he() : new M());
    return c.copy(a).sub(o).normalize(), c;
  }
  getTangentAt(e, t) {
    const n = this.getUtoTmapping(e);
    return this.getTangent(n, t);
  }
  computeFrenetFrames(e, t) {
    const n = new M(), s = [], r = [], o = [], a = new M(), c = new We();
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
        const g = Math.acos(Ye(s[f - 1].dot(s[f]), -1, 1));
        r[f].applyMatrix4(c.makeRotationAxis(a, g));
      }
      o[f].crossVectors(s[f], r[f]);
    }
    if (t === !0) {
      let f = Math.acos(Ye(r[0].dot(r[e]), -1, 1));
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
class lc extends zn {
  constructor(e = 0, t = 0, n = 1, s = 1, r = 0, o = Math.PI * 2, a = !1, c = 0) {
    super(), this.isEllipseCurve = !0, this.type = "EllipseCurve", this.aX = e, this.aY = t, this.xRadius = n, this.yRadius = s, this.aStartAngle = r, this.aEndAngle = o, this.aClockwise = a, this.aRotation = c;
  }
  getPoint(e, t = new he()) {
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
class sf extends lc {
  constructor(e, t, n, s, r, o) {
    super(e, t, n, n, s, r, o), this.isArcCurve = !0, this.type = "ArcCurve";
  }
}
function hc() {
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
const Ur = /* @__PURE__ */ new M(), Fo = /* @__PURE__ */ new hc(), Oo = /* @__PURE__ */ new hc(), Bo = /* @__PURE__ */ new hc();
class zh extends zn {
  constructor(e = [], t = !1, n = "centripetal", s = 0.5) {
    super(), this.isCatmullRomCurve3 = !0, this.type = "CatmullRomCurve3", this.points = e, this.closed = t, this.curveType = n, this.tension = s;
  }
  getPoint(e, t = new M()) {
    const n = t, s = this.points, r = s.length, o = (r - (this.closed ? 0 : 1)) * e;
    let a = Math.floor(o), c = o - a;
    this.closed ? a += a > 0 ? 0 : (Math.floor(Math.abs(a) / r) + 1) * r : c === 0 && a === r - 1 && (a = r - 2, c = 1);
    let l, h;
    this.closed || a > 0 ? l = s[(a - 1) % r] : (Ur.subVectors(s[0], s[1]).add(s[0]), l = Ur);
    const u = s[a % r], d = s[(a + 1) % r];
    if (this.closed || a + 2 < r ? h = s[(a + 2) % r] : (Ur.subVectors(s[r - 1], s[r - 2]).add(s[r - 1]), h = Ur), this.curveType === "centripetal" || this.curveType === "chordal") {
      const f = this.curveType === "chordal" ? 0.5 : 0.25;
      let g = Math.pow(l.distanceToSquared(u), f), _ = Math.pow(u.distanceToSquared(d), f), m = Math.pow(d.distanceToSquared(h), f);
      _ < 1e-4 && (_ = 1), g < 1e-4 && (g = _), m < 1e-4 && (m = _), Fo.initNonuniformCatmullRom(l.x, u.x, d.x, h.x, g, _, m), Oo.initNonuniformCatmullRom(l.y, u.y, d.y, h.y, g, _, m), Bo.initNonuniformCatmullRom(l.z, u.z, d.z, h.z, g, _, m);
    } else this.curveType === "catmullrom" && (Fo.initCatmullRom(l.x, u.x, d.x, h.x, this.tension), Oo.initCatmullRom(l.y, u.y, d.y, h.y, this.tension), Bo.initCatmullRom(l.z, u.z, d.z, h.z, this.tension));
    return n.set(
      Fo.calc(c),
      Oo.calc(c),
      Bo.calc(c)
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
function ll(i, e, t, n, s) {
  const r = (n - e) * 0.5, o = (s - t) * 0.5, a = i * i, c = i * a;
  return (2 * t - 2 * n + r + o) * c + (-3 * t + 3 * n - 2 * r - o) * a + r * i + t;
}
function rf(i, e) {
  const t = 1 - i;
  return t * t * e;
}
function of(i, e) {
  return 2 * (1 - i) * i * e;
}
function af(i, e) {
  return i * i * e;
}
function er(i, e, t, n) {
  return rf(i, e) + of(i, t) + af(i, n);
}
function cf(i, e) {
  const t = 1 - i;
  return t * t * t * e;
}
function lf(i, e) {
  const t = 1 - i;
  return 3 * t * t * i * e;
}
function hf(i, e) {
  return 3 * (1 - i) * i * i * e;
}
function uf(i, e) {
  return i * i * i * e;
}
function tr(i, e, t, n, s) {
  return cf(i, e) + lf(i, t) + hf(i, n) + uf(i, s);
}
class Hh extends zn {
  constructor(e = new he(), t = new he(), n = new he(), s = new he()) {
    super(), this.isCubicBezierCurve = !0, this.type = "CubicBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n, this.v3 = s;
  }
  getPoint(e, t = new he()) {
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
class df extends zn {
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
class Vh extends zn {
  constructor(e = new he(), t = new he()) {
    super(), this.isLineCurve = !0, this.type = "LineCurve", this.v1 = e, this.v2 = t;
  }
  getPoint(e, t = new he()) {
    const n = t;
    return e === 1 ? n.copy(this.v2) : (n.copy(this.v2).sub(this.v1), n.multiplyScalar(e).add(this.v1)), n;
  }
  // Line curve is linear, so we can overwrite default getPointAt
  getPointAt(e, t) {
    return this.getPoint(e, t);
  }
  getTangent(e, t = new he()) {
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
class ff extends zn {
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
class Gh extends zn {
  constructor(e = new he(), t = new he(), n = new he()) {
    super(), this.isQuadraticBezierCurve = !0, this.type = "QuadraticBezierCurve", this.v0 = e, this.v1 = t, this.v2 = n;
  }
  getPoint(e, t = new he()) {
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
class Wh extends zn {
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
class Xh extends zn {
  constructor(e = []) {
    super(), this.isSplineCurve = !0, this.type = "SplineCurve", this.points = e;
  }
  getPoint(e, t = new he()) {
    const n = t, s = this.points, r = (s.length - 1) * e, o = Math.floor(r), a = r - o, c = s[o === 0 ? o : o - 1], l = s[o], h = s[o > s.length - 2 ? s.length - 1 : o + 1], u = s[o > s.length - 3 ? s.length - 1 : o + 2];
    return n.set(
      ll(a, c.x, l.x, h.x, u.x),
      ll(a, c.y, l.y, h.y, u.y)
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
      this.points.push(new he().fromArray(s));
    }
    return this;
  }
}
var Wa = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ArcCurve: sf,
  CatmullRomCurve3: zh,
  CubicBezierCurve: Hh,
  CubicBezierCurve3: df,
  EllipseCurve: lc,
  LineCurve: Vh,
  LineCurve3: ff,
  QuadraticBezierCurve: Gh,
  QuadraticBezierCurve3: Wh,
  SplineCurve: Xh
});
class pf extends zn {
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
      this.curves.push(new Wa[n](t, e));
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
      this.curves.push(new Wa[s.type]().fromJSON(s));
    }
    return this;
  }
}
class mf extends pf {
  constructor(e) {
    super(), this.type = "Path", this.currentPoint = new he(), e && this.setFromPoints(e);
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
    const n = new Vh(this.currentPoint.clone(), new he(e, t));
    return this.curves.push(n), this.currentPoint.set(e, t), this;
  }
  quadraticCurveTo(e, t, n, s) {
    const r = new Gh(
      this.currentPoint.clone(),
      new he(e, t),
      new he(n, s)
    );
    return this.curves.push(r), this.currentPoint.set(n, s), this;
  }
  bezierCurveTo(e, t, n, s, r, o) {
    const a = new Hh(
      this.currentPoint.clone(),
      new he(e, t),
      new he(n, s),
      new he(r, o)
    );
    return this.curves.push(a), this.currentPoint.set(r, o), this;
  }
  splineThru(e) {
    const t = [this.currentPoint.clone()].concat(e), n = new Xh(t);
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
    const l = new lc(e, t, n, s, r, o, a, c);
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
class uc extends Ht {
  constructor(e = [new he(0, -0.5), new he(0.5, 0), new he(0, 0.5)], t = 12, n = 0, s = Math.PI * 2) {
    super(), this.type = "LatheGeometry", this.parameters = {
      points: e,
      segments: t,
      phiStart: n,
      phiLength: s
    }, t = Math.floor(t), s = Ye(s, 0, Math.PI * 2);
    const r = [], o = [], a = [], c = [], l = [], h = 1 / t, u = new M(), d = new he(), f = new M(), g = new M(), _ = new M();
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
      const b = n + x * h * s, v = Math.sin(b), P = Math.cos(b);
      for (let T = 0; T <= e.length - 1; T++) {
        u.x = e[T].x * v, u.y = e[T].y, u.z = e[T].x * P, o.push(u.x, u.y, u.z), d.x = x / t, d.y = T / (e.length - 1), a.push(d.x, d.y);
        const C = c[3 * T + 0] * v, I = c[3 * T + 1], w = c[3 * T + 0] * P;
        l.push(C, I, w);
      }
    }
    for (let x = 0; x < t; x++)
      for (let b = 0; b < e.length - 1; b++) {
        const v = b + x * e.length, P = v, T = v + e.length, C = v + e.length + 1, I = v + 1;
        r.push(P, T, I), r.push(C, I, T);
      }
    this.setIndex(r), this.setAttribute("position", new ut(o, 3)), this.setAttribute("uv", new ut(a, 2)), this.setAttribute("normal", new ut(l, 3));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new uc(e.points, e.segments, e.phiStart, e.phiLength);
  }
}
class As extends uc {
  constructor(e = 1, t = 1, n = 4, s = 8) {
    const r = new mf();
    r.absarc(0, -t / 2, e, Math.PI * 1.5, 0), r.absarc(0, t / 2, e, 0, Math.PI * 0.5), super(r.getPoints(n), s), this.type = "CapsuleGeometry", this.parameters = {
      radius: e,
      length: t,
      capSegments: n,
      radialSegments: s
    };
  }
  static fromJSON(e) {
    return new As(e.radius, e.length, e.capSegments, e.radialSegments);
  }
}
class dc extends Ht {
  constructor(e = 1, t = 32, n = 0, s = Math.PI * 2) {
    super(), this.type = "CircleGeometry", this.parameters = {
      radius: e,
      segments: t,
      thetaStart: n,
      thetaLength: s
    }, t = Math.max(3, t);
    const r = [], o = [], a = [], c = [], l = new M(), h = new he();
    o.push(0, 0, 0), a.push(0, 0, 1), c.push(0.5, 0.5);
    for (let u = 0, d = 3; u <= t; u++, d += 3) {
      const f = n + u / t * s;
      l.x = e * Math.cos(f), l.y = e * Math.sin(f), o.push(l.x, l.y, l.z), a.push(0, 0, 1), h.x = (o[d] / e + 1) / 2, h.y = (o[d + 1] / e + 1) / 2, c.push(h.x, h.y);
    }
    for (let u = 1; u <= t; u++)
      r.push(u, u + 1, 0);
    this.setIndex(r), this.setAttribute("position", new ut(o, 3)), this.setAttribute("normal", new ut(a, 3)), this.setAttribute("uv", new ut(c, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new dc(e.radius, e.segments, e.thetaStart, e.thetaLength);
  }
}
class hn extends Ht {
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
    x(), o === !1 && (e > 0 && b(!0), t > 0 && b(!1)), this.setIndex(h), this.setAttribute("position", new ut(u, 3)), this.setAttribute("normal", new ut(d, 3)), this.setAttribute("uv", new ut(f, 2));
    function x() {
      const v = new M(), P = new M();
      let T = 0;
      const C = (t - e) / n;
      for (let I = 0; I <= r; I++) {
        const w = [], S = I / r, L = S * (t - e) + e;
        for (let H = 0; H <= s; H++) {
          const V = H / s, Y = V * c + a, ee = Math.sin(Y), K = Math.cos(Y);
          P.x = L * ee, P.y = -S * n + m, P.z = L * K, u.push(P.x, P.y, P.z), v.set(ee, C, K).normalize(), d.push(v.x, v.y, v.z), f.push(V, 1 - S), w.push(g++);
        }
        _.push(w);
      }
      for (let I = 0; I < s; I++)
        for (let w = 0; w < r; w++) {
          const S = _[w][I], L = _[w + 1][I], H = _[w + 1][I + 1], V = _[w][I + 1];
          (e > 0 || w !== 0) && (h.push(S, L, V), T += 3), (t > 0 || w !== r - 1) && (h.push(L, H, V), T += 3);
        }
      l.addGroup(p, T, 0), p += T;
    }
    function b(v) {
      const P = g, T = new he(), C = new M();
      let I = 0;
      const w = v === !0 ? e : t, S = v === !0 ? 1 : -1;
      for (let H = 1; H <= s; H++)
        u.push(0, m * S, 0), d.push(0, S, 0), f.push(0.5, 0.5), g++;
      const L = g;
      for (let H = 0; H <= s; H++) {
        const Y = H / s * c + a, ee = Math.cos(Y), K = Math.sin(Y);
        C.x = w * K, C.y = m * S, C.z = w * ee, u.push(C.x, C.y, C.z), d.push(0, S, 0), T.x = ee * 0.5 + 0.5, T.y = K * 0.5 * S + 0.5, f.push(T.x, T.y), g++;
      }
      for (let H = 0; H < s; H++) {
        const V = P + H, Y = L + H;
        v === !0 ? h.push(Y, Y + 1, V) : h.push(Y + 1, Y, V), I += 3;
      }
      l.addGroup(p, I, v === !0 ? 1 : 2), p += I;
    }
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new hn(e.radiusTop, e.radiusBottom, e.height, e.radialSegments, e.heightSegments, e.openEnded, e.thetaStart, e.thetaLength);
  }
}
class fc extends hn {
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
    return new fc(e.radius, e.height, e.radialSegments, e.heightSegments, e.openEnded, e.thetaStart, e.thetaLength);
  }
}
class pc extends Ht {
  constructor(e = [], t = [], n = 1, s = 0) {
    super(), this.type = "PolyhedronGeometry", this.parameters = {
      vertices: e,
      indices: t,
      radius: n,
      detail: s
    };
    const r = [], o = [];
    a(s), l(n), h(), this.setAttribute("position", new ut(r, 3)), this.setAttribute("normal", new ut(r.slice(), 3)), this.setAttribute("uv", new ut(o, 2)), s === 0 ? this.computeVertexNormals() : this.normalizeNormals();
    function a(x) {
      const b = new M(), v = new M(), P = new M();
      for (let T = 0; T < t.length; T += 3)
        f(t[T + 0], b), f(t[T + 1], v), f(t[T + 2], P), c(b, v, P, x);
    }
    function c(x, b, v, P) {
      const T = P + 1, C = [];
      for (let I = 0; I <= T; I++) {
        C[I] = [];
        const w = x.clone().lerp(v, I / T), S = b.clone().lerp(v, I / T), L = T - I;
        for (let H = 0; H <= L; H++)
          H === 0 && I === T ? C[I][H] = w : C[I][H] = w.clone().lerp(S, H / L);
      }
      for (let I = 0; I < T; I++)
        for (let w = 0; w < 2 * (T - I) - 1; w++) {
          const S = Math.floor(w / 2);
          w % 2 === 0 ? (d(C[I][S + 1]), d(C[I + 1][S]), d(C[I][S])) : (d(C[I][S + 1]), d(C[I + 1][S + 1]), d(C[I + 1][S]));
        }
    }
    function l(x) {
      const b = new M();
      for (let v = 0; v < r.length; v += 3)
        b.x = r[v + 0], b.y = r[v + 1], b.z = r[v + 2], b.normalize().multiplyScalar(x), r[v + 0] = b.x, r[v + 1] = b.y, r[v + 2] = b.z;
    }
    function h() {
      const x = new M();
      for (let b = 0; b < r.length; b += 3) {
        x.x = r[b + 0], x.y = r[b + 1], x.z = r[b + 2];
        const v = m(x) / 2 / Math.PI + 0.5, P = p(x) / Math.PI + 0.5;
        o.push(v, 1 - P);
      }
      g(), u();
    }
    function u() {
      for (let x = 0; x < o.length; x += 6) {
        const b = o[x + 0], v = o[x + 2], P = o[x + 4], T = Math.max(b, v, P), C = Math.min(b, v, P);
        T > 0.9 && C < 0.1 && (b < 0.2 && (o[x + 0] += 1), v < 0.2 && (o[x + 2] += 1), P < 0.2 && (o[x + 4] += 1));
      }
    }
    function d(x) {
      r.push(x.x, x.y, x.z);
    }
    function f(x, b) {
      const v = x * 3;
      b.x = e[v + 0], b.y = e[v + 1], b.z = e[v + 2];
    }
    function g() {
      const x = new M(), b = new M(), v = new M(), P = new M(), T = new he(), C = new he(), I = new he();
      for (let w = 0, S = 0; w < r.length; w += 9, S += 6) {
        x.set(r[w + 0], r[w + 1], r[w + 2]), b.set(r[w + 3], r[w + 4], r[w + 5]), v.set(r[w + 6], r[w + 7], r[w + 8]), T.set(o[S + 0], o[S + 1]), C.set(o[S + 2], o[S + 3]), I.set(o[S + 4], o[S + 5]), P.copy(x).add(b).add(v).divideScalar(3);
        const L = m(P);
        _(T, S + 0, x, L), _(C, S + 2, b, L), _(I, S + 4, v, L);
      }
    }
    function _(x, b, v, P) {
      P < 0 && x.x === 1 && (o[b] = x.x - 1), v.x === 0 && v.z === 0 && (o[b] = P / 2 / Math.PI + 0.5);
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
    return new pc(e.vertices, e.indices, e.radius, e.details);
  }
}
class Rs extends pc {
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
    return new Rs(e.radius, e.detail);
  }
}
class an extends Ht {
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
      for (let b = 0; b < l; b++) {
        const v = b * u - r;
        g.push(v, -x, 0), _.push(0, 0, 1), m.push(b / a), m.push(1 - p / c);
      }
    }
    for (let p = 0; p < c; p++)
      for (let x = 0; x < a; x++) {
        const b = x + l * p, v = x + l * (p + 1), P = x + 1 + l * (p + 1), T = x + 1 + l * p;
        f.push(b, v, T), f.push(v, P, T);
      }
    this.setIndex(f), this.setAttribute("position", new ut(g, 3)), this.setAttribute("normal", new ut(_, 3)), this.setAttribute("uv", new ut(m, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new an(e.width, e.height, e.widthSegments, e.heightSegments);
  }
}
class mc extends Ht {
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
    const d = (t - e) / s, f = new M(), g = new he();
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
        const x = p + m, b = x, v = x + n + 1, P = x + n + 2, T = x + 1;
        a.push(b, v, T), a.push(v, P, T);
      }
    }
    this.setIndex(a), this.setAttribute("position", new ut(c, 3)), this.setAttribute("normal", new ut(l, 3)), this.setAttribute("uv", new ut(h, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new mc(e.innerRadius, e.outerRadius, e.thetaSegments, e.phiSegments, e.thetaStart, e.thetaLength);
  }
}
class Pn extends Ht {
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
      const x = [], b = p / n;
      let v = 0;
      p === 0 && o === 0 ? v = 0.5 / t : p === n && c === Math.PI && (v = -0.5 / t);
      for (let P = 0; P <= t; P++) {
        const T = P / t;
        u.x = -e * Math.cos(s + T * r) * Math.sin(o + b * a), u.y = e * Math.cos(o + b * a), u.z = e * Math.sin(s + T * r) * Math.sin(o + b * a), g.push(u.x, u.y, u.z), d.copy(u).normalize(), _.push(d.x, d.y, d.z), m.push(T + v, 1 - b), x.push(l++);
      }
      h.push(x);
    }
    for (let p = 0; p < n; p++)
      for (let x = 0; x < t; x++) {
        const b = h[p][x + 1], v = h[p][x], P = h[p + 1][x], T = h[p + 1][x + 1];
        (p !== 0 || o > 0) && f.push(b, v, T), (p !== n - 1 || c < Math.PI) && f.push(v, P, T);
      }
    this.setIndex(f), this.setAttribute("position", new ut(g, 3)), this.setAttribute("normal", new ut(_, 3)), this.setAttribute("uv", new ut(m, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new Pn(e.radius, e.widthSegments, e.heightSegments, e.phiStart, e.phiLength, e.thetaStart, e.thetaLength);
  }
}
class Cs extends Ht {
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
    this.setIndex(o), this.setAttribute("position", new ut(a, 3)), this.setAttribute("normal", new ut(c, 3)), this.setAttribute("uv", new ut(l, 2));
  }
  copy(e) {
    return super.copy(e), this.parameters = Object.assign({}, e.parameters), this;
  }
  static fromJSON(e) {
    return new Cs(e.radius, e.tube, e.radialSegments, e.tubularSegments, e.arc);
  }
}
class ao extends Ht {
  constructor(e = new Wh(new M(-1, -1, 0), new M(-1, 1, 0), new M(1, 1, 0)), t = 64, n = 1, s = 8, r = !1) {
    super(), this.type = "TubeGeometry", this.parameters = {
      path: e,
      tubularSegments: t,
      radius: n,
      radialSegments: s,
      closed: r
    };
    const o = e.computeFrenetFrames(t, r);
    this.tangents = o.tangents, this.normals = o.normals, this.binormals = o.binormals;
    const a = new M(), c = new M(), l = new he();
    let h = new M();
    const u = [], d = [], f = [], g = [];
    _(), this.setIndex(g), this.setAttribute("position", new ut(u, 3)), this.setAttribute("normal", new ut(d, 3)), this.setAttribute("uv", new ut(f, 2));
    function _() {
      for (let b = 0; b < t; b++)
        m(b);
      m(r === !1 ? t : 0), x(), p();
    }
    function m(b) {
      h = e.getPointAt(b / t, h);
      const v = o.normals[b], P = o.binormals[b];
      for (let T = 0; T <= s; T++) {
        const C = T / s * Math.PI * 2, I = Math.sin(C), w = -Math.cos(C);
        c.x = w * v.x + I * P.x, c.y = w * v.y + I * P.y, c.z = w * v.z + I * P.z, c.normalize(), d.push(c.x, c.y, c.z), a.x = h.x + n * c.x, a.y = h.y + n * c.y, a.z = h.z + n * c.z, u.push(a.x, a.y, a.z);
      }
    }
    function p() {
      for (let b = 1; b <= t; b++)
        for (let v = 1; v <= s; v++) {
          const P = (s + 1) * (b - 1) + (v - 1), T = (s + 1) * b + (v - 1), C = (s + 1) * b + v, I = (s + 1) * (b - 1) + v;
          g.push(P, T, I), g.push(T, C, I);
        }
    }
    function x() {
      for (let b = 0; b <= t; b++)
        for (let v = 0; v <= s; v++)
          l.x = b / t, l.y = v / s, f.push(l.x, l.y);
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
    return new ao(
      new Wa[e.path.type]().fromJSON(e.path),
      e.tubularSegments,
      e.radius,
      e.radialSegments,
      e.closed
    );
  }
}
class re extends On {
  constructor(e) {
    super(), this.isMeshStandardMaterial = !0, this.type = "MeshStandardMaterial", this.defines = { STANDARD: "" }, this.color = new Ne(16777215), this.roughness = 1, this.metalness = 0, this.map = null, this.lightMap = null, this.lightMapIntensity = 1, this.aoMap = null, this.aoMapIntensity = 1, this.emissive = new Ne(0), this.emissiveIntensity = 1, this.emissiveMap = null, this.bumpMap = null, this.bumpScale = 1, this.normalMap = null, this.normalMapType = wh, this.normalScale = new he(1, 1), this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.roughnessMap = null, this.metalnessMap = null, this.alphaMap = null, this.envMap = null, this.envMapRotation = new Bn(), this.envMapIntensity = 1, this.wireframe = !1, this.wireframeLinewidth = 1, this.wireframeLinecap = "round", this.wireframeLinejoin = "round", this.flatShading = !1, this.fog = !0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.defines = { STANDARD: "" }, this.color.copy(e.color), this.roughness = e.roughness, this.metalness = e.metalness, this.map = e.map, this.lightMap = e.lightMap, this.lightMapIntensity = e.lightMapIntensity, this.aoMap = e.aoMap, this.aoMapIntensity = e.aoMapIntensity, this.emissive.copy(e.emissive), this.emissiveMap = e.emissiveMap, this.emissiveIntensity = e.emissiveIntensity, this.bumpMap = e.bumpMap, this.bumpScale = e.bumpScale, this.normalMap = e.normalMap, this.normalMapType = e.normalMapType, this.normalScale.copy(e.normalScale), this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.roughnessMap = e.roughnessMap, this.metalnessMap = e.metalnessMap, this.alphaMap = e.alphaMap, this.envMap = e.envMap, this.envMapRotation.copy(e.envMapRotation), this.envMapIntensity = e.envMapIntensity, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this.wireframeLinecap = e.wireframeLinecap, this.wireframeLinejoin = e.wireframeLinejoin, this.flatShading = e.flatShading, this.fog = e.fog, this;
  }
}
class $t extends re {
  constructor(e) {
    super(), this.isMeshPhysicalMaterial = !0, this.defines = {
      STANDARD: "",
      PHYSICAL: ""
    }, this.type = "MeshPhysicalMaterial", this.anisotropyRotation = 0, this.anisotropyMap = null, this.clearcoatMap = null, this.clearcoatRoughness = 0, this.clearcoatRoughnessMap = null, this.clearcoatNormalScale = new he(1, 1), this.clearcoatNormalMap = null, this.ior = 1.5, Object.defineProperty(this, "reflectivity", {
      get: function() {
        return Ye(2.5 * (this.ior - 1) / (this.ior + 1), 0, 1);
      },
      set: function(t) {
        this.ior = (1 + 0.4 * t) / (1 - 0.4 * t);
      }
    }), this.iridescenceMap = null, this.iridescenceIOR = 1.3, this.iridescenceThicknessRange = [100, 400], this.iridescenceThicknessMap = null, this.sheenColor = new Ne(0), this.sheenColorMap = null, this.sheenRoughness = 1, this.sheenRoughnessMap = null, this.transmissionMap = null, this.thickness = 0, this.thicknessMap = null, this.attenuationDistance = 1 / 0, this.attenuationColor = new Ne(1, 1, 1), this.specularIntensity = 1, this.specularIntensityMap = null, this.specularColor = new Ne(1, 1, 1), this.specularColorMap = null, this._anisotropy = 0, this._clearcoat = 0, this._dispersion = 0, this._iridescence = 0, this._sheen = 0, this._transmission = 0, this.setValues(e);
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
class gf extends On {
  constructor(e) {
    super(), this.isMeshDepthMaterial = !0, this.type = "MeshDepthMaterial", this.depthPacking = qu, this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.wireframe = !1, this.wireframeLinewidth = 1, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.depthPacking = e.depthPacking, this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this.wireframe = e.wireframe, this.wireframeLinewidth = e.wireframeLinewidth, this;
  }
}
class _f extends On {
  constructor(e) {
    super(), this.isMeshDistanceMaterial = !0, this.type = "MeshDistanceMaterial", this.map = null, this.alphaMap = null, this.displacementMap = null, this.displacementScale = 1, this.displacementBias = 0, this.setValues(e);
  }
  copy(e) {
    return super.copy(e), this.map = e.map, this.alphaMap = e.alphaMap, this.displacementMap = e.displacementMap, this.displacementScale = e.displacementScale, this.displacementBias = e.displacementBias, this;
  }
}
function Fr(i, e, t) {
  return !i || // let 'undefined' and 'null' pass
  !t && i.constructor === e ? i : typeof e.BYTES_PER_ELEMENT == "number" ? new e(i) : Array.prototype.slice.call(i);
}
function vf(i) {
  return ArrayBuffer.isView(i) && !(i instanceof DataView);
}
function xf(i) {
  function e(s, r) {
    return i[s] - i[r];
  }
  const t = i.length, n = new Array(t);
  for (let s = 0; s !== t; ++s) n[s] = s;
  return n.sort(e), n;
}
function hl(i, e, t) {
  const n = i.length, s = new i.constructor(n);
  for (let r = 0, o = 0; o !== n; ++r) {
    const a = t[r] * e;
    for (let c = 0; c !== e; ++c)
      s[o++] = i[a + c];
  }
  return s;
}
function qh(i, e, t, n) {
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
class yf extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s), this._weightPrev = -0, this._offsetPrev = -0, this._weightNext = -0, this._offsetNext = -0, this.DefaultSettings_ = {
      endingStart: as,
      endingEnd: as
    };
  }
  intervalChanged_(e, t, n) {
    const s = this.parameterPositions;
    let r = e - 2, o = e + 1, a = s[r], c = s[o];
    if (a === void 0)
      switch (this.getSettings_().endingStart) {
        case cs:
          r = e, a = 2 * t - n;
          break;
        case eo:
          r = s.length - 2, a = t + s[r] - s[r + 1];
          break;
        default:
          r = e, a = n;
      }
    if (c === void 0)
      switch (this.getSettings_().endingEnd) {
        case cs:
          o = e, c = 2 * n - t;
          break;
        case eo:
          o = 1, c = n + s[1] - s[0];
          break;
        default:
          o = e - 1, c = t;
      }
    const l = (n - t) * 0.5, h = this.valueSize;
    this._weightPrev = l / (t - a), this._weightNext = l / (c - n), this._offsetPrev = r * h, this._offsetNext = o * h;
  }
  interpolate_(e, t, n, s) {
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = e * a, l = c - a, h = this._offsetPrev, u = this._offsetNext, d = this._weightPrev, f = this._weightNext, g = (n - t) / (s - t), _ = g * g, m = _ * g, p = -d * m + 2 * d * _ - d * g, x = (1 + d) * m + (-1.5 - 2 * d) * _ + (-0.5 + d) * g + 1, b = (-1 - f) * m + (1.5 + f) * _ + 0.5 * g, v = f * m - f * _;
    for (let P = 0; P !== a; ++P)
      r[P] = p * o[h + P] + x * o[l + P] + b * o[c + P] + v * o[u + P];
    return r;
  }
}
class Yh extends lr {
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
class Sf extends lr {
  constructor(e, t, n, s) {
    super(e, t, n, s);
  }
  interpolate_(e) {
    return this.copySampleValue_(e - 1);
  }
}
class Hn {
  constructor(e, t, n, s) {
    if (e === void 0) throw new Error("THREE.KeyframeTrack: track name is undefined");
    if (t === void 0 || t.length === 0) throw new Error("THREE.KeyframeTrack: no keyframes in track named " + e);
    this.name = e, this.times = Fr(t, this.TimeBufferType), this.values = Fr(n, this.ValueBufferType), this.setInterpolation(s || this.DefaultInterpolation);
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
        times: Fr(e.times, Array),
        values: Fr(e.values, Array)
      };
      const s = e.getInterpolation();
      s !== e.DefaultInterpolation && (n.interpolation = s);
    }
    return n.type = e.ValueTypeName, n;
  }
  InterpolantFactoryMethodDiscrete(e) {
    return new Sf(this.times, this.values, this.getValueSize(), e);
  }
  InterpolantFactoryMethodLinear(e) {
    return new Yh(this.times, this.values, this.getValueSize(), e);
  }
  InterpolantFactoryMethodSmooth(e) {
    return new yf(this.times, this.values, this.getValueSize(), e);
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
      case uo:
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
        return uo;
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
    if (s !== void 0 && vf(s))
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
    const e = this.times.slice(), t = this.values.slice(), n = this.getValueSize(), s = this.getInterpolation() === uo, r = e.length - 1;
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
Hn.prototype.TimeBufferType = Float32Array;
Hn.prototype.ValueBufferType = Float32Array;
Hn.prototype.DefaultInterpolation = rr;
class Ps extends Hn {
  // No interpolation parameter because only InterpolateDiscrete is valid.
  constructor(e, t, n) {
    super(e, t, n);
  }
}
Ps.prototype.ValueTypeName = "bool";
Ps.prototype.ValueBufferType = Array;
Ps.prototype.DefaultInterpolation = sr;
Ps.prototype.InterpolantFactoryMethodLinear = void 0;
Ps.prototype.InterpolantFactoryMethodSmooth = void 0;
class Kh extends Hn {
}
Kh.prototype.ValueTypeName = "color";
class Es extends Hn {
}
Es.prototype.ValueTypeName = "number";
class bf extends lr {
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
class Bi extends Hn {
  InterpolantFactoryMethodLinear(e) {
    return new bf(this.times, this.values, this.getValueSize(), e);
  }
}
Bi.prototype.ValueTypeName = "quaternion";
Bi.prototype.InterpolantFactoryMethodSmooth = void 0;
class Is extends Hn {
  // No interpolation parameter because only InterpolateDiscrete is valid.
  constructor(e, t, n) {
    super(e, t, n);
  }
}
Is.prototype.ValueTypeName = "string";
Is.prototype.ValueBufferType = Array;
Is.prototype.DefaultInterpolation = sr;
Is.prototype.InterpolantFactoryMethodLinear = void 0;
Is.prototype.InterpolantFactoryMethodSmooth = void 0;
class Ms extends Hn {
}
Ms.prototype.ValueTypeName = "vector";
class ro {
  constructor(e = "", t = -1, n = [], s = ic) {
    this.name = e, this.tracks = n, this.duration = t, this.blendMode = s, this.uuid = Cn(), this.duration < 0 && this.resetDuration();
  }
  static parse(e) {
    const t = [], n = e.tracks, s = 1 / (e.fps || 1);
    for (let o = 0, a = n.length; o !== a; ++o)
      t.push(Ef(n[o]).scale(s));
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
      t.push(Hn.toJSON(n[r]));
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
      const h = xf(c);
      c = hl(c, 1, h), l = hl(l, 1, h), !s && c[0] === 0 && (c.push(r), l.push(l[0])), o.push(
        new Es(
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
        qh(f, m, p, g), m.length !== 0 && _.push(new u(d, m, p));
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
              const b = d[g];
              m.push(b.time), p.push(b.morphTarget === _ ? 1 : 0);
            }
            s.push(new Es(".morphTargetInfluence[" + _ + "]", m, p));
          }
          c = f.length * o;
        } else {
          const f = ".bones[" + t[u].name + "]";
          n(
            Ms,
            f + ".position",
            d,
            "pos",
            s
          ), n(
            Bi,
            f + ".quaternion",
            d,
            "rot",
            s
          ), n(
            Ms,
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
function wf(i) {
  switch (i.toLowerCase()) {
    case "scalar":
    case "double":
    case "float":
    case "number":
    case "integer":
      return Es;
    case "vector":
    case "vector2":
    case "vector3":
    case "vector4":
      return Ms;
    case "color":
      return Kh;
    case "quaternion":
      return Bi;
    case "bool":
    case "boolean":
      return Ps;
    case "string":
      return Is;
  }
  throw new Error("THREE.KeyframeTrack: Unsupported typeName: " + i);
}
function Ef(i) {
  if (i.type === void 0)
    throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");
  const e = wf(i.type);
  if (i.times === void 0) {
    const t = [], n = [];
    qh(i.keys, t, n, "value"), i.times = t, i.values = n;
  }
  return e.parse !== void 0 ? e.parse(i) : new e(i.name, i.times, i.values, i.interpolation);
}
const xi = {
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
class Mf {
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
const Tf = /* @__PURE__ */ new Mf();
class Ls {
  constructor(e) {
    this.manager = e !== void 0 ? e : Tf, this.crossOrigin = "anonymous", this.withCredentials = !1, this.path = "", this.resourcePath = "", this.requestHeader = {};
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
Ls.DEFAULT_MATERIAL_NAME = "__DEFAULT";
const jn = {};
class Af extends Error {
  constructor(e, t) {
    super(e), this.response = t;
  }
}
class jh extends Ls {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = xi.get(e);
    if (r !== void 0)
      return this.manager.itemStart(e), setTimeout(() => {
        t && t(r), this.manager.itemEnd(e);
      }, 0), r;
    if (jn[e] !== void 0) {
      jn[e].push({
        onLoad: t,
        onProgress: n,
        onError: s
      });
      return;
    }
    jn[e] = [], jn[e].push({
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
        const h = jn[e], u = l.body.getReader(), d = l.headers.get("X-File-Size") || l.headers.get("Content-Length"), f = d ? parseInt(d) : 0, g = f !== 0;
        let _ = 0;
        const m = new ReadableStream({
          start(p) {
            x();
            function x() {
              u.read().then(({ done: b, value: v }) => {
                if (b)
                  p.close();
                else {
                  _ += v.byteLength;
                  const P = new ProgressEvent("progress", { lengthComputable: g, loaded: _, total: f });
                  for (let T = 0, C = h.length; T < C; T++) {
                    const I = h[T];
                    I.onProgress && I.onProgress(P);
                  }
                  p.enqueue(v), x();
                }
              }, (b) => {
                p.error(b);
              });
            }
          }
        });
        return new Response(m);
      } else
        throw new Af(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`, l);
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
      xi.add(e, l);
      const h = jn[e];
      delete jn[e];
      for (let u = 0, d = h.length; u < d; u++) {
        const f = h[u];
        f.onLoad && f.onLoad(l);
      }
    }).catch((l) => {
      const h = jn[e];
      if (h === void 0)
        throw this.manager.itemError(e), l;
      delete jn[e];
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
class Rf extends Ls {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = this, o = xi.get(e);
    if (o !== void 0)
      return r.manager.itemStart(e), setTimeout(function() {
        t && t(o), r.manager.itemEnd(e);
      }, 0), o;
    const a = or("img");
    function c() {
      h(), xi.add(e, this), t && t(this), r.manager.itemEnd(e);
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
class Cf extends Ls {
  constructor(e) {
    super(e);
  }
  load(e, t, n, s) {
    const r = new Bt(), o = new Rf(this.manager);
    return o.setCrossOrigin(this.crossOrigin), o.setPath(this.path), o.load(e, function(a) {
      r.image = a, r.needsUpdate = !0, t !== void 0 && t(r);
    }, n, s), r;
  }
}
class co extends Mt {
  constructor(e, t = 1) {
    super(), this.isLight = !0, this.type = "Light", this.color = new Ne(e), this.intensity = t;
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
class ul extends co {
  constructor(e, t, n) {
    super(e, n), this.isHemisphereLight = !0, this.type = "HemisphereLight", this.position.copy(Mt.DEFAULT_UP), this.updateMatrix(), this.groundColor = new Ne(t);
  }
  copy(e, t) {
    return super.copy(e, t), this.groundColor.copy(e.groundColor), this;
  }
}
const ko = /* @__PURE__ */ new We(), dl = /* @__PURE__ */ new M(), fl = /* @__PURE__ */ new M();
class gc {
  constructor(e) {
    this.camera = e, this.intensity = 1, this.bias = 0, this.normalBias = 0, this.radius = 1, this.blurSamples = 8, this.mapSize = new he(512, 512), this.map = null, this.mapPass = null, this.matrix = new We(), this.autoUpdate = !0, this.needsUpdate = !1, this._frustum = new ac(), this._frameExtents = new he(1, 1), this._viewportCount = 1, this._viewports = [
      new mt(0, 0, 1, 1)
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
    dl.setFromMatrixPosition(e.matrixWorld), t.position.copy(dl), fl.setFromMatrixPosition(e.target.matrixWorld), t.lookAt(fl), t.updateMatrixWorld(), ko.multiplyMatrices(t.projectionMatrix, t.matrixWorldInverse), this._frustum.setFromProjectionMatrix(ko), n.set(
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
    ), n.multiply(ko);
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
class Pf extends gc {
  constructor() {
    super(new nn(50, 1, 0.5, 500)), this.isSpotLightShadow = !0, this.focus = 1;
  }
  updateMatrices(e) {
    const t = this.camera, n = bs * 2 * e.angle * this.focus, s = this.mapSize.width / this.mapSize.height, r = e.distance || t.far;
    (n !== t.fov || s !== t.aspect || r !== t.far) && (t.fov = n, t.aspect = s, t.far = r, t.updateProjectionMatrix()), super.updateMatrices(e);
  }
  copy(e) {
    return super.copy(e), this.focus = e.focus, this;
  }
}
class If extends co {
  constructor(e, t, n = 0, s = Math.PI / 3, r = 0, o = 2) {
    super(e, t), this.isSpotLight = !0, this.type = "SpotLight", this.position.copy(Mt.DEFAULT_UP), this.updateMatrix(), this.target = new Mt(), this.distance = n, this.angle = s, this.penumbra = r, this.decay = o, this.map = null, this.shadow = new Pf();
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
const pl = /* @__PURE__ */ new We(), qs = /* @__PURE__ */ new M(), zo = /* @__PURE__ */ new M();
class Lf extends gc {
  constructor() {
    super(new nn(90, 1, 0.5, 500)), this.isPointLightShadow = !0, this._frameExtents = new he(4, 2), this._viewportCount = 6, this._viewports = [
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
      new mt(2, 1, 1, 1),
      // negative X
      new mt(0, 1, 1, 1),
      // positive Z
      new mt(3, 1, 1, 1),
      // negative Z
      new mt(1, 1, 1, 1),
      // positive Y
      new mt(3, 0, 1, 1),
      // negative Y
      new mt(1, 0, 1, 1)
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
    r !== n.far && (n.far = r, n.updateProjectionMatrix()), qs.setFromMatrixPosition(e.matrixWorld), n.position.copy(qs), zo.copy(n.position), zo.add(this._cubeDirections[t]), n.up.copy(this._cubeUps[t]), n.lookAt(zo), n.updateMatrixWorld(), s.makeTranslation(-qs.x, -qs.y, -qs.z), pl.multiplyMatrices(n.projectionMatrix, n.matrixWorldInverse), this._frustum.setFromProjectionMatrix(pl);
  }
}
class _c extends co {
  constructor(e, t, n = 0, s = 2) {
    super(e, t), this.isPointLight = !0, this.type = "PointLight", this.distance = n, this.decay = s, this.shadow = new Lf();
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
class vc extends Dh {
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
class Df extends gc {
  constructor() {
    super(new vc(-5, 5, 5, -5, 0.5, 500)), this.isDirectionalLightShadow = !0;
  }
}
class Xa extends co {
  constructor(e, t) {
    super(e, t), this.isDirectionalLight = !0, this.type = "DirectionalLight", this.position.copy(Mt.DEFAULT_UP), this.updateMatrix(), this.target = new Mt(), this.shadow = new Df();
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
class Nf extends Ls {
  constructor(e) {
    super(e), this.isImageBitmapLoader = !0, typeof createImageBitmap > "u" && console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."), typeof fetch > "u" && console.warn("THREE.ImageBitmapLoader: fetch() not supported."), this.options = { premultiplyAlpha: "none" };
  }
  setOptions(e) {
    return this.options = e, this;
  }
  load(e, t, n, s) {
    e === void 0 && (e = ""), this.path !== void 0 && (e = this.path + e), e = this.manager.resolveURL(e);
    const r = this, o = xi.get(e);
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
      return xi.add(e, l), t && t(l), r.manager.itemEnd(e), l;
    }).catch(function(l) {
      s && s(l), xi.remove(e), r.manager.itemError(e), r.manager.itemEnd(e);
    });
    xi.add(e, c), r.manager.itemStart(e);
  }
}
class Uf extends nn {
  constructor(e = []) {
    super(), this.isArrayCamera = !0, this.cameras = e;
  }
}
class Ff {
  constructor(e = !0) {
    this.autoStart = e, this.startTime = 0, this.oldTime = 0, this.elapsedTime = 0, this.running = !1;
  }
  start() {
    this.startTime = ml(), this.oldTime = this.startTime, this.elapsedTime = 0, this.running = !0;
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
      const t = ml();
      e = (t - this.oldTime) / 1e3, this.oldTime = t, this.elapsedTime += e;
    }
    return e;
  }
}
function ml() {
  return performance.now();
}
class Of {
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
const xc = "\\[\\]\\.:\\/", Bf = new RegExp("[" + xc + "]", "g"), yc = "[^" + xc + "]", kf = "[^" + xc.replace("\\.", "") + "]", zf = /* @__PURE__ */ /((?:WC+[\/:])*)/.source.replace("WC", yc), Hf = /* @__PURE__ */ /(WCOD+)?/.source.replace("WCOD", kf), Vf = /* @__PURE__ */ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", yc), Gf = /* @__PURE__ */ /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", yc), Wf = new RegExp(
  "^" + zf + Hf + Vf + Gf + "$"
), Xf = ["material", "materials", "bones", "map"];
class qf {
  constructor(e, t, n) {
    const s = n || _t.parseTrackName(t);
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
class _t {
  constructor(e, t, n) {
    this.path = t, this.parsedPath = n || _t.parseTrackName(t), this.node = _t.findNode(e, this.parsedPath.nodeName), this.rootNode = e, this.getValue = this._getValue_unbound, this.setValue = this._setValue_unbound;
  }
  static create(e, t, n) {
    return e && e.isAnimationObjectGroup ? new _t.Composite(e, t, n) : new _t(e, t, n);
  }
  /**
   * Replaces spaces with underscores and removes unsupported characters from
   * node names, to ensure compatibility with parseTrackName().
   *
   * @param {string} name Node name to be sanitized.
   * @return {string}
   */
  static sanitizeNodeName(e) {
    return e.replace(/\s/g, "_").replace(Bf, "");
  }
  static parseTrackName(e) {
    const t = Wf.exec(e);
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
      Xf.indexOf(r) !== -1 && (n.nodeName = n.nodeName.substring(0, s), n.objectName = r);
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
    if (e || (e = _t.findNode(this.rootNode, t.nodeName), this.node = e), this.getValue = this._getValue_unavailable, this.setValue = this._setValue_unavailable, !e) {
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
_t.Composite = qf;
_t.prototype.BindingType = {
  Direct: 0,
  EntireArray: 1,
  ArrayElement: 2,
  HasFromToArray: 3
};
_t.prototype.Versioning = {
  None: 0,
  NeedsUpdate: 1,
  MatrixWorldNeedsUpdate: 2
};
_t.prototype.GetterByBindingType = [
  _t.prototype._getValue_direct,
  _t.prototype._getValue_array,
  _t.prototype._getValue_arrayElement,
  _t.prototype._getValue_toArray
];
_t.prototype.SetterByBindingTypeAndVersioning = [
  [
    // Direct
    _t.prototype._setValue_direct,
    _t.prototype._setValue_direct_setNeedsUpdate,
    _t.prototype._setValue_direct_setMatrixWorldNeedsUpdate
  ],
  [
    // EntireArray
    _t.prototype._setValue_array,
    _t.prototype._setValue_array_setNeedsUpdate,
    _t.prototype._setValue_array_setMatrixWorldNeedsUpdate
  ],
  [
    // ArrayElement
    _t.prototype._setValue_arrayElement,
    _t.prototype._setValue_arrayElement_setNeedsUpdate,
    _t.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate
  ],
  [
    // HasToFromArray
    _t.prototype._setValue_fromArray,
    _t.prototype._setValue_fromArray_setNeedsUpdate,
    _t.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate
  ]
];
class Yf {
  constructor(e, t, n = null, s = t.blendMode) {
    this._mixer = e, this._clip = t, this._localRoot = n, this.blendMode = s;
    const r = t.tracks, o = r.length, a = new Array(o), c = {
      endingStart: as,
      endingEnd: as
    };
    for (let l = 0; l !== o; ++l) {
      const h = r[l].createInterpolant(null);
      a[l] = h, h.settings = c;
    }
    this._interpolantSettings = c, this._interpolants = a, this._propertyBindings = new Array(o), this._cacheIndex = null, this._byClipCacheIndex = null, this._timeScaleInterpolant = null, this._weightInterpolant = null, this.loop = ka, this._loopCount = -1, this._startTime = null, this.time = 0, this.timeScale = 1, this._effectiveTimeScale = 1, this.weight = 1, this._effectiveWeight = 1, this.repetitions = 1 / 0, this.paused = !1, this.enabled = !0, this.clampWhenFinished = !1, this.zeroSlopeAtStart = !0, this.zeroSlopeAtEnd = !0;
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
        case Wu:
          for (let h = 0, u = c.length; h !== u; ++h)
            c[h].evaluate(o), l[h].accumulateAdditive(a);
          break;
        case ic:
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
    const o = n === Gu;
    if (e === 0)
      return r === -1 ? s : o && (r & 1) === 1 ? t - s : s;
    if (n === Ba) {
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
    n ? (s.endingStart = cs, s.endingEnd = cs) : (e ? s.endingStart = this.zeroSlopeAtStart ? cs : as : s.endingStart = eo, t ? s.endingEnd = this.zeroSlopeAtEnd ? cs : as : s.endingEnd = eo);
  }
  _scheduleFading(e, t, n) {
    const s = this._mixer, r = s.time;
    let o = this._weightInterpolant;
    o === null && (o = s._lendControlInterpolant(), this._weightInterpolant = o);
    const a = o.parameterPositions, c = o.sampleValues;
    return a[0] = r, c[0] = t, a[1] = r + e, c[1] = n, this;
  }
}
const Kf = new Float32Array(1);
class Ho extends bi {
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
        g = new Of(
          _t.create(n, f, _),
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
    return n === void 0 && (n = new Yh(
      new Float32Array(2),
      new Float32Array(2),
      1,
      Kf
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
    let o = typeof e == "string" ? ro.findByName(s, e) : e;
    const a = o !== null ? o.uuid : e, c = this._actionsByClip[a];
    let l = null;
    if (n === void 0 && (o !== null ? n = o.blendMode : n = ic), c !== void 0) {
      const u = c.actionByRoot[r];
      if (u !== void 0 && u.blendMode === n)
        return u;
      l = c.knownActions[0], o === null && (o = l._clip);
    }
    if (o === null) return null;
    const h = new Yf(this, o, t, n);
    return this._bindAction(h, l), this._addInactiveAction(h, a, r), h;
  }
  // get an existing action
  existingAction(e, t) {
    const n = t || this._root, s = n.uuid, r = typeof e == "string" ? ro.findByName(n, e) : e, o = r ? r.uuid : e, a = this._actionsByClip[o];
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
class gl {
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
    return this.phi = Ye(this.phi, 1e-6, Math.PI - 1e-6), this;
  }
  setFromVector3(e) {
    return this.setFromCartesianCoords(e.x, e.y, e.z);
  }
  setFromCartesianCoords(e, t, n) {
    return this.radius = Math.sqrt(e * e + t * t + n * n), this.radius === 0 ? (this.theta = 0, this.phi = 0) : (this.theta = Math.atan2(e, n), this.phi = Math.acos(Ye(t / this.radius, -1, 1))), this;
  }
  clone() {
    return new this.constructor().copy(this);
  }
}
class jf extends bi {
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
function _l(i, e, t, n) {
  const s = Zf(n);
  switch (t) {
    // https://registry.khronos.org/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
    case gh:
      return i * e;
    case vh:
      return i * e;
    case xh:
      return i * e * 2;
    case Qa:
      return i * e / s.components * s.byteLength;
    case ec:
      return i * e / s.components * s.byteLength;
    case yh:
      return i * e * 2 / s.components * s.byteLength;
    case tc:
      return i * e * 2 / s.components * s.byteLength;
    case _h:
      return i * e * 3 / s.components * s.byteLength;
    case yn:
      return i * e * 4 / s.components * s.byteLength;
    case nc:
      return i * e * 4 / s.components * s.byteLength;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_s3tc_srgb/
    case qr:
    case Yr:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 8;
    case Kr:
    case jr:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_pvrtc/
    case fa:
    case ma:
      return Math.max(i, 16) * Math.max(e, 8) / 4;
    case da:
    case pa:
      return Math.max(i, 8) * Math.max(e, 8) / 2;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_etc/
    case ga:
    case _a:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 8;
    case va:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/WEBGL_compressed_texture_astc/
    case xa:
      return Math.floor((i + 3) / 4) * Math.floor((e + 3) / 4) * 16;
    case ya:
      return Math.floor((i + 4) / 5) * Math.floor((e + 3) / 4) * 16;
    case Sa:
      return Math.floor((i + 4) / 5) * Math.floor((e + 4) / 5) * 16;
    case ba:
      return Math.floor((i + 5) / 6) * Math.floor((e + 4) / 5) * 16;
    case wa:
      return Math.floor((i + 5) / 6) * Math.floor((e + 5) / 6) * 16;
    case Ea:
      return Math.floor((i + 7) / 8) * Math.floor((e + 4) / 5) * 16;
    case Ma:
      return Math.floor((i + 7) / 8) * Math.floor((e + 5) / 6) * 16;
    case Ta:
      return Math.floor((i + 7) / 8) * Math.floor((e + 7) / 8) * 16;
    case Aa:
      return Math.floor((i + 9) / 10) * Math.floor((e + 4) / 5) * 16;
    case Ra:
      return Math.floor((i + 9) / 10) * Math.floor((e + 5) / 6) * 16;
    case Ca:
      return Math.floor((i + 9) / 10) * Math.floor((e + 7) / 8) * 16;
    case Pa:
      return Math.floor((i + 9) / 10) * Math.floor((e + 9) / 10) * 16;
    case Ia:
      return Math.floor((i + 11) / 12) * Math.floor((e + 9) / 10) * 16;
    case La:
      return Math.floor((i + 11) / 12) * Math.floor((e + 11) / 12) * 16;
    // https://registry.khronos.org/webgl/extensions/EXT_texture_compression_bptc/
    case Zr:
    case Da:
    case Na:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 16;
    // https://registry.khronos.org/webgl/extensions/EXT_texture_compression_rgtc/
    case Sh:
    case Ua:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 8;
    case Fa:
    case Oa:
      return Math.ceil(i / 4) * Math.ceil(e / 4) * 16;
  }
  throw new Error(
    `Unable to determine texture byte length for ${t} format.`
  );
}
function Zf(i) {
  switch (i) {
    case ii:
    case fh:
      return { byteLength: 1, components: 1 };
    case ir:
    case ph:
    case ar:
      return { byteLength: 2, components: 1 };
    case $a:
    case Ja:
      return { byteLength: 2, components: 4 };
    case Fi:
    case Za:
    case Rn:
      return { byteLength: 4, components: 1 };
    case mh:
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
function Zh() {
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
function $f(i) {
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
var Jf = `#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`, Qf = `#ifdef USE_ALPHAHASH
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
#endif`, ep = `#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`, tp = `#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`, np = `#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`, ip = `#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`, sp = `#ifdef USE_AOMAP
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
#endif`, rp = `#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`, op = `#ifdef USE_BATCHING
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
#endif`, ap = `#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`, cp = `vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`, lp = `vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`, hp = `float G_BlinnPhong_Implicit( ) {
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
} // validated`, up = `#ifdef USE_IRIDESCENCE
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
#endif`, dp = `#ifdef USE_BUMPMAP
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
#endif`, fp = `#if NUM_CLIPPING_PLANES > 0
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
#endif`, pp = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`, mp = `#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`, gp = `#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`, _p = `#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`, vp = `#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`, xp = `#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`, yp = `#if defined( USE_COLOR_ALPHA )
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
#endif`, Sp = `#define PI 3.141592653589793
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
} // validated`, bp = `#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`, wp = `vec3 transformedNormal = objectNormal;
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
#endif`, Ep = `#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`, Mp = `#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`, Tp = `#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`, Ap = `#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`, Rp = "gl_FragColor = linearToOutputTexel( gl_FragColor );", Cp = `vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`, Pp = `#ifdef USE_ENVMAP
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
#endif`, Ip = `#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`, Lp = `#ifdef USE_ENVMAP
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
#endif`, Dp = `#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`, Np = `#ifdef USE_ENVMAP
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
#endif`, Up = `#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`, Fp = `#ifdef USE_FOG
	varying float vFogDepth;
#endif`, Op = `#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`, Bp = `#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`, kp = `#ifdef USE_GRADIENTMAP
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
}`, zp = `#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`, Hp = `LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`, Vp = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`, Gp = `uniform bool receiveShadow;
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
#endif`, Wp = `#ifdef USE_ENVMAP
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
#endif`, Xp = `ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`, qp = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`, Yp = `BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`, Kp = `varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`, jp = `PhysicalMaterial material;
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
#endif`, Zp = `struct PhysicalMaterial {
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
}`, $p = `
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
#endif`, Jp = `#if defined( RE_IndirectDiffuse )
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
#endif`, Qp = `#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`, em = `#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`, tm = `#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, nm = `#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`, im = `#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`, sm = `#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`, rm = `#ifdef USE_MAP
	uniform sampler2D map;
#endif`, om = `#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`, am = `#if defined( USE_POINTS_UV )
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
#endif`, cm = `float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`, lm = `#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`, hm = `#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`, um = `#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`, dm = `#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, fm = `#ifdef USE_MORPHTARGETS
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
#endif`, pm = `#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`, mm = `float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`, gm = `#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`, _m = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, vm = `#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`, xm = `#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`, ym = `#ifdef USE_NORMALMAP
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
#endif`, Sm = `#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`, bm = `#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`, wm = `#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`, Em = `#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`, Mm = `#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`, Tm = `vec3 packNormalToRGB( const in vec3 normal ) {
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
}`, Am = `#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`, Rm = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`, Cm = `#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`, Pm = `#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`, Im = `float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`, Lm = `#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`, Dm = `#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`, Nm = `#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`, Um = `#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`, Fm = `float getShadowMask() {
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
}`, Om = `#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`, Bm = `#ifdef USE_SKINNING
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
#endif`, km = `#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`, zm = `#ifdef USE_SKINNING
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
#endif`, Hm = `float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`, Vm = `#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`, Gm = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`, Wm = `#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`, Xm = `#ifdef USE_TRANSMISSION
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
#endif`, qm = `#ifdef USE_TRANSMISSION
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
#endif`, Ym = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`, Km = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`, jm = `#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`, Zm = `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;
const $m = `varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`, Jm = `uniform sampler2D t2D;
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
}`, Qm = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, e0 = `#ifdef ENVMAP_TYPE_CUBE
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
}`, t0 = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`, n0 = `uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, i0 = `#include <common>
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
}`, s0 = `#if DEPTH_PACKING == 3200
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
}`, r0 = `#define DISTANCE
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
}`, o0 = `#define DISTANCE
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
}`, a0 = `varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`, c0 = `uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`, l0 = `uniform float scale;
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
}`, h0 = `uniform vec3 diffuse;
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
}`, u0 = `#include <common>
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
}`, d0 = `uniform vec3 diffuse;
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
}`, f0 = `#define LAMBERT
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
}`, p0 = `#define LAMBERT
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
}`, m0 = `#define MATCAP
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
}`, g0 = `#define MATCAP
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
}`, _0 = `#define NORMAL
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
}`, v0 = `#define NORMAL
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
}`, x0 = `#define PHONG
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
}`, y0 = `#define PHONG
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
}`, S0 = `#define STANDARD
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
}`, b0 = `#define STANDARD
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
}`, w0 = `#define TOON
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
}`, E0 = `#define TOON
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
}`, M0 = `uniform float size;
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
}`, T0 = `uniform vec3 diffuse;
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
}`, A0 = `#include <common>
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
}`, R0 = `uniform vec3 color;
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
}`, C0 = `uniform float rotation;
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
}`, P0 = `uniform vec3 diffuse;
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
}`, Je = {
  alphahash_fragment: Jf,
  alphahash_pars_fragment: Qf,
  alphamap_fragment: ep,
  alphamap_pars_fragment: tp,
  alphatest_fragment: np,
  alphatest_pars_fragment: ip,
  aomap_fragment: sp,
  aomap_pars_fragment: rp,
  batching_pars_vertex: op,
  batching_vertex: ap,
  begin_vertex: cp,
  beginnormal_vertex: lp,
  bsdfs: hp,
  iridescence_fragment: up,
  bumpmap_pars_fragment: dp,
  clipping_planes_fragment: fp,
  clipping_planes_pars_fragment: pp,
  clipping_planes_pars_vertex: mp,
  clipping_planes_vertex: gp,
  color_fragment: _p,
  color_pars_fragment: vp,
  color_pars_vertex: xp,
  color_vertex: yp,
  common: Sp,
  cube_uv_reflection_fragment: bp,
  defaultnormal_vertex: wp,
  displacementmap_pars_vertex: Ep,
  displacementmap_vertex: Mp,
  emissivemap_fragment: Tp,
  emissivemap_pars_fragment: Ap,
  colorspace_fragment: Rp,
  colorspace_pars_fragment: Cp,
  envmap_fragment: Pp,
  envmap_common_pars_fragment: Ip,
  envmap_pars_fragment: Lp,
  envmap_pars_vertex: Dp,
  envmap_physical_pars_fragment: Wp,
  envmap_vertex: Np,
  fog_vertex: Up,
  fog_pars_vertex: Fp,
  fog_fragment: Op,
  fog_pars_fragment: Bp,
  gradientmap_pars_fragment: kp,
  lightmap_pars_fragment: zp,
  lights_lambert_fragment: Hp,
  lights_lambert_pars_fragment: Vp,
  lights_pars_begin: Gp,
  lights_toon_fragment: Xp,
  lights_toon_pars_fragment: qp,
  lights_phong_fragment: Yp,
  lights_phong_pars_fragment: Kp,
  lights_physical_fragment: jp,
  lights_physical_pars_fragment: Zp,
  lights_fragment_begin: $p,
  lights_fragment_maps: Jp,
  lights_fragment_end: Qp,
  logdepthbuf_fragment: em,
  logdepthbuf_pars_fragment: tm,
  logdepthbuf_pars_vertex: nm,
  logdepthbuf_vertex: im,
  map_fragment: sm,
  map_pars_fragment: rm,
  map_particle_fragment: om,
  map_particle_pars_fragment: am,
  metalnessmap_fragment: cm,
  metalnessmap_pars_fragment: lm,
  morphinstance_vertex: hm,
  morphcolor_vertex: um,
  morphnormal_vertex: dm,
  morphtarget_pars_vertex: fm,
  morphtarget_vertex: pm,
  normal_fragment_begin: mm,
  normal_fragment_maps: gm,
  normal_pars_fragment: _m,
  normal_pars_vertex: vm,
  normal_vertex: xm,
  normalmap_pars_fragment: ym,
  clearcoat_normal_fragment_begin: Sm,
  clearcoat_normal_fragment_maps: bm,
  clearcoat_pars_fragment: wm,
  iridescence_pars_fragment: Em,
  opaque_fragment: Mm,
  packing: Tm,
  premultiplied_alpha_fragment: Am,
  project_vertex: Rm,
  dithering_fragment: Cm,
  dithering_pars_fragment: Pm,
  roughnessmap_fragment: Im,
  roughnessmap_pars_fragment: Lm,
  shadowmap_pars_fragment: Dm,
  shadowmap_pars_vertex: Nm,
  shadowmap_vertex: Um,
  shadowmask_pars_fragment: Fm,
  skinbase_vertex: Om,
  skinning_pars_vertex: Bm,
  skinning_vertex: km,
  skinnormal_vertex: zm,
  specularmap_fragment: Hm,
  specularmap_pars_fragment: Vm,
  tonemapping_fragment: Gm,
  tonemapping_pars_fragment: Wm,
  transmission_fragment: Xm,
  transmission_pars_fragment: qm,
  uv_pars_fragment: Ym,
  uv_pars_vertex: Km,
  uv_vertex: jm,
  worldpos_vertex: Zm,
  background_vert: $m,
  background_frag: Jm,
  backgroundCube_vert: Qm,
  backgroundCube_frag: e0,
  cube_vert: t0,
  cube_frag: n0,
  depth_vert: i0,
  depth_frag: s0,
  distanceRGBA_vert: r0,
  distanceRGBA_frag: o0,
  equirect_vert: a0,
  equirect_frag: c0,
  linedashed_vert: l0,
  linedashed_frag: h0,
  meshbasic_vert: u0,
  meshbasic_frag: d0,
  meshlambert_vert: f0,
  meshlambert_frag: p0,
  meshmatcap_vert: m0,
  meshmatcap_frag: g0,
  meshnormal_vert: _0,
  meshnormal_frag: v0,
  meshphong_vert: x0,
  meshphong_frag: y0,
  meshphysical_vert: S0,
  meshphysical_frag: b0,
  meshtoon_vert: w0,
  meshtoon_frag: E0,
  points_vert: M0,
  points_frag: T0,
  shadow_vert: A0,
  shadow_frag: R0,
  sprite_vert: C0,
  sprite_frag: P0
}, ge = {
  common: {
    diffuse: { value: /* @__PURE__ */ new Ne(16777215) },
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
    normalScale: { value: /* @__PURE__ */ new he(1, 1) }
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
    fogColor: { value: /* @__PURE__ */ new Ne(16777215) }
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
    diffuse: { value: /* @__PURE__ */ new Ne(16777215) },
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
    diffuse: { value: /* @__PURE__ */ new Ne(16777215) },
    opacity: { value: 1 },
    center: { value: /* @__PURE__ */ new he(0.5, 0.5) },
    rotation: { value: 0 },
    map: { value: null },
    mapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaMap: { value: null },
    alphaMapTransform: { value: /* @__PURE__ */ new Ke() },
    alphaTest: { value: 0 }
  }
}, Fn = {
  basic: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.specularmap,
      ge.envmap,
      ge.aomap,
      ge.lightmap,
      ge.fog
    ]),
    vertexShader: Je.meshbasic_vert,
    fragmentShader: Je.meshbasic_frag
  },
  lambert: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.specularmap,
      ge.envmap,
      ge.aomap,
      ge.lightmap,
      ge.emissivemap,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      ge.fog,
      ge.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ne(0) }
      }
    ]),
    vertexShader: Je.meshlambert_vert,
    fragmentShader: Je.meshlambert_frag
  },
  phong: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.specularmap,
      ge.envmap,
      ge.aomap,
      ge.lightmap,
      ge.emissivemap,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      ge.fog,
      ge.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ne(0) },
        specular: { value: /* @__PURE__ */ new Ne(1118481) },
        shininess: { value: 30 }
      }
    ]),
    vertexShader: Je.meshphong_vert,
    fragmentShader: Je.meshphong_frag
  },
  standard: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.envmap,
      ge.aomap,
      ge.lightmap,
      ge.emissivemap,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      ge.roughnessmap,
      ge.metalnessmap,
      ge.fog,
      ge.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ne(0) },
        roughness: { value: 1 },
        metalness: { value: 0 },
        envMapIntensity: { value: 1 }
      }
    ]),
    vertexShader: Je.meshphysical_vert,
    fragmentShader: Je.meshphysical_frag
  },
  toon: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.aomap,
      ge.lightmap,
      ge.emissivemap,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      ge.gradientmap,
      ge.fog,
      ge.lights,
      {
        emissive: { value: /* @__PURE__ */ new Ne(0) }
      }
    ]),
    vertexShader: Je.meshtoon_vert,
    fragmentShader: Je.meshtoon_frag
  },
  matcap: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      ge.fog,
      {
        matcap: { value: null }
      }
    ]),
    vertexShader: Je.meshmatcap_vert,
    fragmentShader: Je.meshmatcap_frag
  },
  points: {
    uniforms: /* @__PURE__ */ tn([
      ge.points,
      ge.fog
    ]),
    vertexShader: Je.points_vert,
    fragmentShader: Je.points_frag
  },
  dashed: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.fog,
      {
        scale: { value: 1 },
        dashSize: { value: 1 },
        totalSize: { value: 2 }
      }
    ]),
    vertexShader: Je.linedashed_vert,
    fragmentShader: Je.linedashed_frag
  },
  depth: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.displacementmap
    ]),
    vertexShader: Je.depth_vert,
    fragmentShader: Je.depth_frag
  },
  normal: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.bumpmap,
      ge.normalmap,
      ge.displacementmap,
      {
        opacity: { value: 1 }
      }
    ]),
    vertexShader: Je.meshnormal_vert,
    fragmentShader: Je.meshnormal_frag
  },
  sprite: {
    uniforms: /* @__PURE__ */ tn([
      ge.sprite,
      ge.fog
    ]),
    vertexShader: Je.sprite_vert,
    fragmentShader: Je.sprite_frag
  },
  background: {
    uniforms: {
      uvTransform: { value: /* @__PURE__ */ new Ke() },
      t2D: { value: null },
      backgroundIntensity: { value: 1 }
    },
    vertexShader: Je.background_vert,
    fragmentShader: Je.background_frag
  },
  backgroundCube: {
    uniforms: {
      envMap: { value: null },
      flipEnvMap: { value: -1 },
      backgroundBlurriness: { value: 0 },
      backgroundIntensity: { value: 1 },
      backgroundRotation: { value: /* @__PURE__ */ new Ke() }
    },
    vertexShader: Je.backgroundCube_vert,
    fragmentShader: Je.backgroundCube_frag
  },
  cube: {
    uniforms: {
      tCube: { value: null },
      tFlip: { value: -1 },
      opacity: { value: 1 }
    },
    vertexShader: Je.cube_vert,
    fragmentShader: Je.cube_frag
  },
  equirect: {
    uniforms: {
      tEquirect: { value: null }
    },
    vertexShader: Je.equirect_vert,
    fragmentShader: Je.equirect_frag
  },
  distanceRGBA: {
    uniforms: /* @__PURE__ */ tn([
      ge.common,
      ge.displacementmap,
      {
        referencePosition: { value: /* @__PURE__ */ new M() },
        nearDistance: { value: 1 },
        farDistance: { value: 1e3 }
      }
    ]),
    vertexShader: Je.distanceRGBA_vert,
    fragmentShader: Je.distanceRGBA_frag
  },
  shadow: {
    uniforms: /* @__PURE__ */ tn([
      ge.lights,
      ge.fog,
      {
        color: { value: /* @__PURE__ */ new Ne(0) },
        opacity: { value: 1 }
      }
    ]),
    vertexShader: Je.shadow_vert,
    fragmentShader: Je.shadow_frag
  }
};
Fn.physical = {
  uniforms: /* @__PURE__ */ tn([
    Fn.standard.uniforms,
    {
      clearcoat: { value: 0 },
      clearcoatMap: { value: null },
      clearcoatMapTransform: { value: /* @__PURE__ */ new Ke() },
      clearcoatNormalMap: { value: null },
      clearcoatNormalMapTransform: { value: /* @__PURE__ */ new Ke() },
      clearcoatNormalScale: { value: /* @__PURE__ */ new he(1, 1) },
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
      sheenColor: { value: /* @__PURE__ */ new Ne(0) },
      sheenColorMap: { value: null },
      sheenColorMapTransform: { value: /* @__PURE__ */ new Ke() },
      sheenRoughness: { value: 1 },
      sheenRoughnessMap: { value: null },
      sheenRoughnessMapTransform: { value: /* @__PURE__ */ new Ke() },
      transmission: { value: 0 },
      transmissionMap: { value: null },
      transmissionMapTransform: { value: /* @__PURE__ */ new Ke() },
      transmissionSamplerSize: { value: /* @__PURE__ */ new he() },
      transmissionSamplerMap: { value: null },
      thickness: { value: 0 },
      thicknessMap: { value: null },
      thicknessMapTransform: { value: /* @__PURE__ */ new Ke() },
      attenuationDistance: { value: 0 },
      attenuationColor: { value: /* @__PURE__ */ new Ne(0) },
      specularColor: { value: /* @__PURE__ */ new Ne(1, 1, 1) },
      specularColorMap: { value: null },
      specularColorMapTransform: { value: /* @__PURE__ */ new Ke() },
      specularIntensity: { value: 1 },
      specularIntensityMap: { value: null },
      specularIntensityMapTransform: { value: /* @__PURE__ */ new Ke() },
      anisotropyVector: { value: /* @__PURE__ */ new he() },
      anisotropyMap: { value: null },
      anisotropyMapTransform: { value: /* @__PURE__ */ new Ke() }
    }
  ]),
  vertexShader: Je.meshphysical_vert,
  fragmentShader: Je.meshphysical_frag
};
const Or = { r: 0, b: 0, g: 0 }, Ci = /* @__PURE__ */ new Bn(), I0 = /* @__PURE__ */ new We();
function L0(i, e, t, n, s, r, o) {
  const a = new Ne(0);
  let c = r === !0 ? 0 : 1, l, h, u = null, d = 0, f = null;
  function g(b) {
    let v = b.isScene === !0 ? b.background : null;
    return v && v.isTexture && (v = (b.backgroundBlurriness > 0 ? t : e).get(v)), v;
  }
  function _(b) {
    let v = !1;
    const P = g(b);
    P === null ? p(a, c) : P && P.isColor && (p(P, 1), v = !0);
    const T = i.xr.getEnvironmentBlendMode();
    T === "additive" ? n.buffers.color.setClear(0, 0, 0, 1, o) : T === "alpha-blend" && n.buffers.color.setClear(0, 0, 0, 0, o), (i.autoClear || v) && (n.buffers.depth.setTest(!0), n.buffers.depth.setMask(!0), n.buffers.color.setMask(!0), i.clear(i.autoClearColor, i.autoClearDepth, i.autoClearStencil));
  }
  function m(b, v) {
    const P = g(v);
    P && (P.isCubeTexture || P.mapping === oo) ? (h === void 0 && (h = new ae(
      new vt(1, 1, 1),
      new si({
        name: "BackgroundCubeMaterial",
        uniforms: ws(Fn.backgroundCube.uniforms),
        vertexShader: Fn.backgroundCube.vertexShader,
        fragmentShader: Fn.backgroundCube.fragmentShader,
        side: sn,
        depthTest: !1,
        depthWrite: !1,
        fog: !1
      })
    ), h.geometry.deleteAttribute("normal"), h.geometry.deleteAttribute("uv"), h.onBeforeRender = function(T, C, I) {
      this.matrixWorld.copyPosition(I.matrixWorld);
    }, Object.defineProperty(h.material, "envMap", {
      get: function() {
        return this.uniforms.envMap.value;
      }
    }), s.update(h)), Ci.copy(v.backgroundRotation), Ci.x *= -1, Ci.y *= -1, Ci.z *= -1, P.isCubeTexture && P.isRenderTargetTexture === !1 && (Ci.y *= -1, Ci.z *= -1), h.material.uniforms.envMap.value = P, h.material.uniforms.flipEnvMap.value = P.isCubeTexture && P.isRenderTargetTexture === !1 ? -1 : 1, h.material.uniforms.backgroundBlurriness.value = v.backgroundBlurriness, h.material.uniforms.backgroundIntensity.value = v.backgroundIntensity, h.material.uniforms.backgroundRotation.value.setFromMatrix4(I0.makeRotationFromEuler(Ci)), h.material.toneMapped = ct.getTransfer(P.colorSpace) !== yt, (u !== P || d !== P.version || f !== i.toneMapping) && (h.material.needsUpdate = !0, u = P, d = P.version, f = i.toneMapping), h.layers.enableAll(), b.unshift(h, h.geometry, h.material, 0, 0, null)) : P && P.isTexture && (l === void 0 && (l = new ae(
      new an(2, 2),
      new si({
        name: "BackgroundMaterial",
        uniforms: ws(Fn.background.uniforms),
        vertexShader: Fn.background.vertexShader,
        fragmentShader: Fn.background.fragmentShader,
        side: ni,
        depthTest: !1,
        depthWrite: !1,
        fog: !1
      })
    ), l.geometry.deleteAttribute("normal"), Object.defineProperty(l.material, "map", {
      get: function() {
        return this.uniforms.t2D.value;
      }
    }), s.update(l)), l.material.uniforms.t2D.value = P, l.material.uniforms.backgroundIntensity.value = v.backgroundIntensity, l.material.toneMapped = ct.getTransfer(P.colorSpace) !== yt, P.matrixAutoUpdate === !0 && P.updateMatrix(), l.material.uniforms.uvTransform.value.copy(P.matrix), (u !== P || d !== P.version || f !== i.toneMapping) && (l.material.needsUpdate = !0, u = P, d = P.version, f = i.toneMapping), l.layers.enableAll(), b.unshift(l, l.geometry, l.material, 0, 0, null));
  }
  function p(b, v) {
    b.getRGB(Or, Lh(i)), n.buffers.color.setClear(Or.r, Or.g, Or.b, v, o);
  }
  function x() {
    h !== void 0 && (h.geometry.dispose(), h.material.dispose()), l !== void 0 && (l.geometry.dispose(), l.material.dispose());
  }
  return {
    getClearColor: function() {
      return a;
    },
    setClearColor: function(b, v = 1) {
      a.set(b), c = v, p(a, c);
    },
    getClearAlpha: function() {
      return c;
    },
    setClearAlpha: function(b) {
      c = b, p(a, c);
    },
    render: _,
    addToRenderList: m,
    dispose: x
  };
}
function D0(i, e) {
  const t = i.getParameter(i.MAX_VERTEX_ATTRIBS), n = {}, s = d(null);
  let r = s, o = !1;
  function a(S, L, H, V, Y) {
    let ee = !1;
    const K = u(V, H, L);
    r !== K && (r = K, l(r.object)), ee = f(S, V, H, Y), ee && g(S, V, H, Y), Y !== null && e.update(Y, i.ELEMENT_ARRAY_BUFFER), (ee || o) && (o = !1, v(S, L, H, V), Y !== null && i.bindBuffer(i.ELEMENT_ARRAY_BUFFER, e.get(Y).buffer));
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
  function u(S, L, H) {
    const V = H.wireframe === !0;
    let Y = n[S.id];
    Y === void 0 && (Y = {}, n[S.id] = Y);
    let ee = Y[L.id];
    ee === void 0 && (ee = {}, Y[L.id] = ee);
    let K = ee[V];
    return K === void 0 && (K = d(c()), ee[V] = K), K;
  }
  function d(S) {
    const L = [], H = [], V = [];
    for (let Y = 0; Y < t; Y++)
      L[Y] = 0, H[Y] = 0, V[Y] = 0;
    return {
      // for backward compatibility on non-VAO support browser
      geometry: null,
      program: null,
      wireframe: !1,
      newAttributes: L,
      enabledAttributes: H,
      attributeDivisors: V,
      object: S,
      attributes: {},
      index: null
    };
  }
  function f(S, L, H, V) {
    const Y = r.attributes, ee = L.attributes;
    let K = 0;
    const oe = H.getAttributes();
    for (const q in oe)
      if (oe[q].location >= 0) {
        const ve = Y[q];
        let fe = ee[q];
        if (fe === void 0 && (q === "instanceMatrix" && S.instanceMatrix && (fe = S.instanceMatrix), q === "instanceColor" && S.instanceColor && (fe = S.instanceColor)), ve === void 0 || ve.attribute !== fe || fe && ve.data !== fe.data) return !0;
        K++;
      }
    return r.attributesNum !== K || r.index !== V;
  }
  function g(S, L, H, V) {
    const Y = {}, ee = L.attributes;
    let K = 0;
    const oe = H.getAttributes();
    for (const q in oe)
      if (oe[q].location >= 0) {
        let ve = ee[q];
        ve === void 0 && (q === "instanceMatrix" && S.instanceMatrix && (ve = S.instanceMatrix), q === "instanceColor" && S.instanceColor && (ve = S.instanceColor));
        const fe = {};
        fe.attribute = ve, ve && ve.data && (fe.data = ve.data), Y[q] = fe, K++;
      }
    r.attributes = Y, r.attributesNum = K, r.index = V;
  }
  function _() {
    const S = r.newAttributes;
    for (let L = 0, H = S.length; L < H; L++)
      S[L] = 0;
  }
  function m(S) {
    p(S, 0);
  }
  function p(S, L) {
    const H = r.newAttributes, V = r.enabledAttributes, Y = r.attributeDivisors;
    H[S] = 1, V[S] === 0 && (i.enableVertexAttribArray(S), V[S] = 1), Y[S] !== L && (i.vertexAttribDivisor(S, L), Y[S] = L);
  }
  function x() {
    const S = r.newAttributes, L = r.enabledAttributes;
    for (let H = 0, V = L.length; H < V; H++)
      L[H] !== S[H] && (i.disableVertexAttribArray(H), L[H] = 0);
  }
  function b(S, L, H, V, Y, ee, K) {
    K === !0 ? i.vertexAttribIPointer(S, L, H, Y, ee) : i.vertexAttribPointer(S, L, H, V, Y, ee);
  }
  function v(S, L, H, V) {
    _();
    const Y = V.attributes, ee = H.getAttributes(), K = L.defaultAttributeValues;
    for (const oe in ee) {
      const q = ee[oe];
      if (q.location >= 0) {
        let ce = Y[oe];
        if (ce === void 0 && (oe === "instanceMatrix" && S.instanceMatrix && (ce = S.instanceMatrix), oe === "instanceColor" && S.instanceColor && (ce = S.instanceColor)), ce !== void 0) {
          const ve = ce.normalized, fe = ce.itemSize, Ie = e.get(ce);
          if (Ie === void 0) continue;
          const ot = Ie.buffer, j = Ie.type, ne = Ie.bytesPerElement, be = j === i.INT || j === i.UNSIGNED_INT || ce.gpuType === Za;
          if (ce.isInterleavedBufferAttribute) {
            const _e = ce.data, Me = _e.stride, ke = ce.offset;
            if (_e.isInstancedInterleavedBuffer) {
              for (let je = 0; je < q.locationSize; je++)
                p(q.location + je, _e.meshPerAttribute);
              S.isInstancedMesh !== !0 && V._maxInstanceCount === void 0 && (V._maxInstanceCount = _e.meshPerAttribute * _e.count);
            } else
              for (let je = 0; je < q.locationSize; je++)
                m(q.location + je);
            i.bindBuffer(i.ARRAY_BUFFER, ot);
            for (let je = 0; je < q.locationSize; je++)
              b(
                q.location + je,
                fe / q.locationSize,
                j,
                ve,
                Me * ne,
                (ke + fe / q.locationSize * je) * ne,
                be
              );
          } else {
            if (ce.isInstancedBufferAttribute) {
              for (let _e = 0; _e < q.locationSize; _e++)
                p(q.location + _e, ce.meshPerAttribute);
              S.isInstancedMesh !== !0 && V._maxInstanceCount === void 0 && (V._maxInstanceCount = ce.meshPerAttribute * ce.count);
            } else
              for (let _e = 0; _e < q.locationSize; _e++)
                m(q.location + _e);
            i.bindBuffer(i.ARRAY_BUFFER, ot);
            for (let _e = 0; _e < q.locationSize; _e++)
              b(
                q.location + _e,
                fe / q.locationSize,
                j,
                ve,
                fe * ne,
                fe / q.locationSize * _e * ne,
                be
              );
          }
        } else if (K !== void 0) {
          const ve = K[oe];
          if (ve !== void 0)
            switch (ve.length) {
              case 2:
                i.vertexAttrib2fv(q.location, ve);
                break;
              case 3:
                i.vertexAttrib3fv(q.location, ve);
                break;
              case 4:
                i.vertexAttrib4fv(q.location, ve);
                break;
              default:
                i.vertexAttrib1fv(q.location, ve);
            }
        }
      }
    }
    x();
  }
  function P() {
    I();
    for (const S in n) {
      const L = n[S];
      for (const H in L) {
        const V = L[H];
        for (const Y in V)
          h(V[Y].object), delete V[Y];
        delete L[H];
      }
      delete n[S];
    }
  }
  function T(S) {
    if (n[S.id] === void 0) return;
    const L = n[S.id];
    for (const H in L) {
      const V = L[H];
      for (const Y in V)
        h(V[Y].object), delete V[Y];
      delete L[H];
    }
    delete n[S.id];
  }
  function C(S) {
    for (const L in n) {
      const H = n[L];
      if (H[S.id] === void 0) continue;
      const V = H[S.id];
      for (const Y in V)
        h(V[Y].object), delete V[Y];
      delete H[S.id];
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
    releaseStatesOfGeometry: T,
    releaseStatesOfProgram: C,
    initAttributes: _,
    enableAttribute: m,
    disableUnusedAttributes: x
  };
}
function N0(i, e, t) {
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
function U0(i, e, t, n) {
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
    return !(C !== yn && n.convert(C) !== i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT));
  }
  function a(C) {
    const I = C === ar && (e.has("EXT_color_buffer_half_float") || e.has("EXT_color_buffer_float"));
    return !(C !== ii && n.convert(C) !== i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE) && // Edge and Chrome Mac < 52 (#9513)
    C !== Rn && !I);
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
  const u = t.logarithmicDepthBuffer === !0, d = t.reverseDepthBuffer === !0 && e.has("EXT_clip_control"), f = i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS), g = i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS), _ = i.getParameter(i.MAX_TEXTURE_SIZE), m = i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE), p = i.getParameter(i.MAX_VERTEX_ATTRIBS), x = i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS), b = i.getParameter(i.MAX_VARYING_VECTORS), v = i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS), P = g > 0, T = i.getParameter(i.MAX_SAMPLES);
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
    maxVaryings: b,
    maxFragmentUniforms: v,
    vertexTextures: P,
    maxSamples: T
  };
}
function F0(i) {
  const e = this;
  let t = null, n = 0, s = !1, r = !1;
  const o = new mi(), a = new Ke(), c = { value: null, needsUpdate: !1 };
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
      const x = r ? 0 : n, b = x * 4;
      let v = p.clippingState || null;
      c.value = v, v = h(g, d, b, f);
      for (let P = 0; P !== b; ++P)
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
        for (let b = 0, v = f; b !== _; ++b, v += 4)
          o.copy(u[b]).applyMatrix4(x, a), o.normal.toArray(m, v), m[v + 3] = o.constant;
      }
      c.value = m, c.needsUpdate = !0;
    }
    return e.numPlanes = _, e.numIntersection = 0, m;
  }
}
function O0(i) {
  let e = /* @__PURE__ */ new WeakMap();
  function t(o, a) {
    return a === ha ? o.mapping = vs : a === ua && (o.mapping = xs), o;
  }
  function n(o) {
    if (o && o.isTexture) {
      const a = o.mapping;
      if (a === ha || a === ua)
        if (e.has(o)) {
          const c = e.get(o).texture;
          return t(c, o.mapping);
        } else {
          const c = o.image;
          if (c && c.height > 0) {
            const l = new Gd(c.height);
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
const us = 4, vl = [0.125, 0.215, 0.35, 0.446, 0.526, 0.582], Ui = 20, Vo = /* @__PURE__ */ new vc(), xl = /* @__PURE__ */ new Ne();
let Go = null, Wo = 0, Xo = 0, qo = !1;
const Di = (1 + Math.sqrt(5)) / 2, ts = 1 / Di, yl = [
  /* @__PURE__ */ new M(-Di, ts, 0),
  /* @__PURE__ */ new M(Di, ts, 0),
  /* @__PURE__ */ new M(-ts, 0, Di),
  /* @__PURE__ */ new M(ts, 0, Di),
  /* @__PURE__ */ new M(0, Di, -ts),
  /* @__PURE__ */ new M(0, Di, ts),
  /* @__PURE__ */ new M(-1, 1, -1),
  /* @__PURE__ */ new M(1, 1, -1),
  /* @__PURE__ */ new M(-1, 1, 1),
  /* @__PURE__ */ new M(1, 1, 1)
];
class Sl {
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
    Go = this._renderer.getRenderTarget(), Wo = this._renderer.getActiveCubeFace(), Xo = this._renderer.getActiveMipmapLevel(), qo = this._renderer.xr.enabled, this._renderer.xr.enabled = !1, this._setSize(256);
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
    this._cubemapMaterial === null && (this._cubemapMaterial = El(), this._compileMaterial(this._cubemapMaterial));
  }
  /**
   * Pre-compiles the equirectangular shader. You can get faster start-up by invoking this method during
   * your texture's network fetch for increased concurrency.
   */
  compileEquirectangularShader() {
    this._equirectMaterial === null && (this._equirectMaterial = wl(), this._compileMaterial(this._equirectMaterial));
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
    this._renderer.setRenderTarget(Go, Wo, Xo), this._renderer.xr.enabled = qo, e.scissorTest = !1, Br(e, 0, 0, e.width, e.height);
  }
  _fromTexture(e, t) {
    e.mapping === vs || e.mapping === xs ? this._setSize(e.image.length === 0 ? 16 : e.image[0].width || e.image[0].image.width) : this._setSize(e.image.width / 4), Go = this._renderer.getRenderTarget(), Wo = this._renderer.getActiveCubeFace(), Xo = this._renderer.getActiveMipmapLevel(), qo = this._renderer.xr.enabled, this._renderer.xr.enabled = !1;
    const n = t || this._allocateTargets();
    return this._textureToCubeUV(e, n), this._applyPMREM(n), this._cleanup(n), n;
  }
  _allocateTargets() {
    const e = 3 * Math.max(this._cubeSize, 112), t = 4 * this._cubeSize, n = {
      magFilter: pn,
      minFilter: pn,
      generateMipmaps: !1,
      type: ar,
      format: yn,
      colorSpace: on,
      depthBuffer: !1
    }, s = bl(e, t, n);
    if (this._pingPongRenderTarget === null || this._pingPongRenderTarget.width !== e || this._pingPongRenderTarget.height !== t) {
      this._pingPongRenderTarget !== null && this._dispose(), this._pingPongRenderTarget = bl(e, t, n);
      const { _lodMax: r } = this;
      ({ sizeLods: this._sizeLods, lodPlanes: this._lodPlanes, sigmas: this._sigmas } = B0(r)), this._blurMaterial = k0(r, e, t);
    }
    return s;
  }
  _compileMaterial(e) {
    const t = new ae(this._lodPlanes[0], e);
    this._renderer.compile(t, Vo);
  }
  _sceneToCubeUV(e, t, n, s) {
    const a = new nn(90, 1, t, n), c = [1, -1, 1, 1, 1, 1], l = [1, 1, 1, -1, -1, -1], h = this._renderer, u = h.autoClear, d = h.toneMapping;
    h.getClearColor(xl), h.toneMapping = Si, h.autoClear = !1;
    const f = new vi({
      name: "PMREM.Background",
      side: sn,
      depthWrite: !1,
      depthTest: !1
    }), g = new ae(new vt(), f);
    let _ = !1;
    const m = e.background;
    m ? m.isColor && (f.color.copy(m), e.background = null, _ = !0) : (f.color.copy(xl), _ = !0);
    for (let p = 0; p < 6; p++) {
      const x = p % 3;
      x === 0 ? (a.up.set(0, c[p], 0), a.lookAt(l[p], 0, 0)) : x === 1 ? (a.up.set(0, 0, c[p]), a.lookAt(0, l[p], 0)) : (a.up.set(0, c[p], 0), a.lookAt(0, 0, l[p]));
      const b = this._cubeSize;
      Br(s, x * b, p > 2 ? b : 0, b, b), h.setRenderTarget(s), _ && h.render(g, a), h.render(e, a);
    }
    g.geometry.dispose(), g.material.dispose(), h.toneMapping = d, h.autoClear = u, e.background = m;
  }
  _textureToCubeUV(e, t) {
    const n = this._renderer, s = e.mapping === vs || e.mapping === xs;
    s ? (this._cubemapMaterial === null && (this._cubemapMaterial = El()), this._cubemapMaterial.uniforms.flipEnvMap.value = e.isRenderTargetTexture === !1 ? -1 : 1) : this._equirectMaterial === null && (this._equirectMaterial = wl());
    const r = s ? this._cubemapMaterial : this._equirectMaterial, o = new ae(this._lodPlanes[0], r), a = r.uniforms;
    a.envMap.value = e;
    const c = this._cubeSize;
    Br(t, 0, 0, 3 * c, 2 * c), n.setRenderTarget(t), n.render(o, Vo);
  }
  _applyPMREM(e) {
    const t = this._renderer, n = t.autoClear;
    t.autoClear = !1;
    const s = this._lodPlanes.length;
    for (let r = 1; r < s; r++) {
      const o = Math.sqrt(this._sigmas[r] * this._sigmas[r] - this._sigmas[r - 1] * this._sigmas[r - 1]), a = yl[(s - r - 1) % yl.length];
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
    const h = 3, u = new ae(this._lodPlanes[s], l), d = l.uniforms, f = this._sizeLods[n] - 1, g = isFinite(r) ? Math.PI / (2 * f) : 2 * Math.PI / (2 * Ui - 1), _ = r / g, m = isFinite(r) ? 1 + Math.floor(h * _) : Ui;
    m > Ui && console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ui}`);
    const p = [];
    let x = 0;
    for (let C = 0; C < Ui; ++C) {
      const I = C / _, w = Math.exp(-I * I / 2);
      p.push(w), C === 0 ? x += w : C < m && (x += 2 * w);
    }
    for (let C = 0; C < p.length; C++)
      p[C] = p[C] / x;
    d.envMap.value = e.texture, d.samples.value = m, d.weights.value = p, d.latitudinal.value = o === "latitudinal", a && (d.poleAxis.value = a);
    const { _lodMax: b } = this;
    d.dTheta.value = g, d.mipInt.value = b - n;
    const v = this._sizeLods[s], P = 3 * v * (s > b - us ? s - b + us : 0), T = 4 * (this._cubeSize - v);
    Br(t, P, T, 3 * v, 2 * v), c.setRenderTarget(t), c.render(u, Vo);
  }
}
function B0(i) {
  const e = [], t = [], n = [];
  let s = i;
  const r = i - us + 1 + vl.length;
  for (let o = 0; o < r; o++) {
    const a = Math.pow(2, s);
    t.push(a);
    let c = 1 / a;
    o > i - us ? c = vl[o - i + us - 1] : o === 0 && (c = 0), n.push(c);
    const l = 1 / (a - 2), h = -l, u = 1 + l, d = [h, h, u, h, u, u, h, h, u, u, h, u], f = 6, g = 6, _ = 3, m = 2, p = 1, x = new Float32Array(_ * g * f), b = new Float32Array(m * g * f), v = new Float32Array(p * g * f);
    for (let T = 0; T < f; T++) {
      const C = T % 3 * 2 / 3 - 1, I = T > 2 ? 0 : -1, w = [
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
      x.set(w, _ * g * T), b.set(d, m * g * T);
      const S = [T, T, T, T, T, T];
      v.set(S, p * g * T);
    }
    const P = new Ht();
    P.setAttribute("position", new Wt(x, _)), P.setAttribute("uv", new Wt(b, m)), P.setAttribute("faceIndex", new Wt(v, p)), e.push(P), s > us && s--;
  }
  return { lodPlanes: e, sizeLods: t, sigmas: n };
}
function bl(i, e, t) {
  const n = new Oi(i, e, t);
  return n.texture.mapping = oo, n.texture.name = "PMREM.cubeUv", n.scissorTest = !0, n;
}
function Br(i, e, t, n, s) {
  i.viewport.set(e, t, n, s), i.scissor.set(e, t, n, s);
}
function k0(i, e, t) {
  const n = new Float32Array(Ui), s = new M(0, 1, 0);
  return new si({
    name: "SphericalGaussianBlur",
    defines: {
      n: Ui,
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
    vertexShader: Sc(),
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
    blending: yi,
    depthTest: !1,
    depthWrite: !1
  });
}
function wl() {
  return new si({
    name: "EquirectangularToCubeUV",
    uniforms: {
      envMap: { value: null }
    },
    vertexShader: Sc(),
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
    blending: yi,
    depthTest: !1,
    depthWrite: !1
  });
}
function El() {
  return new si({
    name: "CubemapToCubeUV",
    uniforms: {
      envMap: { value: null },
      flipEnvMap: { value: -1 }
    },
    vertexShader: Sc(),
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
    blending: yi,
    depthTest: !1,
    depthWrite: !1
  });
}
function Sc() {
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
function z0(i) {
  let e = /* @__PURE__ */ new WeakMap(), t = null;
  function n(a) {
    if (a && a.isTexture) {
      const c = a.mapping, l = c === ha || c === ua, h = c === vs || c === xs;
      if (l || h) {
        let u = e.get(a);
        const d = u !== void 0 ? u.texture.pmremVersion : 0;
        if (a.isRenderTargetTexture && a.pmremVersion !== d)
          return t === null && (t = new Sl(i)), u = l ? t.fromEquirectangular(a, u) : t.fromCubemap(a, u), u.texture.pmremVersion = a.pmremVersion, e.set(a, u), u.texture;
        if (u !== void 0)
          return u.texture;
        {
          const f = a.image;
          return l && f && f.height > 0 || h && f && s(f) ? (t === null && (t = new Sl(i)), u = l ? t.fromEquirectangular(a) : t.fromCubemap(a), u.texture.pmremVersion = a.pmremVersion, e.set(a, u), a.addEventListener("dispose", r), u.texture) : null;
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
function H0(i) {
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
      return s === null && rs("THREE.WebGLRenderer: " + n + " extension not supported."), s;
    }
  };
}
function V0(i, e, t, n) {
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
      for (let b = 0, v = x.length; b < v; b += 3) {
        const P = x[b + 0], T = x[b + 1], C = x[b + 2];
        d.push(P, T, T, C, C, P);
      }
    } else if (g !== void 0) {
      const x = g.array;
      _ = g.version;
      for (let b = 0, v = x.length / 3 - 1; b < v; b += 3) {
        const P = b + 0, T = b + 1, C = b + 2;
        d.push(P, T, T, C, C, P);
      }
    } else
      return;
    const m = new (Mh(d) ? Ih : Ph)(d, 1);
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
function G0(i, e, t) {
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
function W0(i) {
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
function X0(i, e, t) {
  const n = /* @__PURE__ */ new WeakMap(), s = new mt();
  function r(o, a, c) {
    const l = o.morphTargetInfluences, h = a.morphAttributes.position || a.morphAttributes.normal || a.morphAttributes.color, u = h !== void 0 ? h.length : 0;
    let d = n.get(a);
    if (d === void 0 || d.count !== u) {
      let w = function() {
        C.dispose(), n.delete(a), a.removeEventListener("dispose", w);
      };
      d !== void 0 && d.texture.dispose();
      const f = a.morphAttributes.position !== void 0, g = a.morphAttributes.normal !== void 0, _ = a.morphAttributes.color !== void 0, m = a.morphAttributes.position || [], p = a.morphAttributes.normal || [], x = a.morphAttributes.color || [];
      let b = 0;
      f === !0 && (b = 1), g === !0 && (b = 2), _ === !0 && (b = 3);
      let v = a.attributes.position.count * b, P = 1;
      v > e.maxTextureSize && (P = Math.ceil(v / e.maxTextureSize), v = e.maxTextureSize);
      const T = new Float32Array(v * P * 4 * u), C = new Ah(T, v, P, u);
      C.type = Rn, C.needsUpdate = !0;
      const I = b * 4;
      for (let S = 0; S < u; S++) {
        const L = m[S], H = p[S], V = x[S], Y = v * P * 4 * S;
        for (let ee = 0; ee < L.count; ee++) {
          const K = ee * I;
          f === !0 && (s.fromBufferAttribute(L, ee), T[Y + K + 0] = s.x, T[Y + K + 1] = s.y, T[Y + K + 2] = s.z, T[Y + K + 3] = 0), g === !0 && (s.fromBufferAttribute(H, ee), T[Y + K + 4] = s.x, T[Y + K + 5] = s.y, T[Y + K + 6] = s.z, T[Y + K + 7] = 0), _ === !0 && (s.fromBufferAttribute(V, ee), T[Y + K + 8] = s.x, T[Y + K + 9] = s.y, T[Y + K + 10] = s.z, T[Y + K + 11] = V.itemSize === 4 ? s.w : 1);
        }
      }
      d = {
        count: u,
        texture: C,
        size: new he(v, P)
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
function q0(i, e, t, n) {
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
const $h = /* @__PURE__ */ new Bt(), Ml = /* @__PURE__ */ new kh(1, 1), Jh = /* @__PURE__ */ new Ah(), Qh = /* @__PURE__ */ new Ad(), eu = /* @__PURE__ */ new Nh(), Tl = [], Al = [], Rl = new Float32Array(16), Cl = new Float32Array(9), Pl = new Float32Array(4);
function Ds(i, e, t) {
  const n = i[0];
  if (n <= 0 || n > 0) return i;
  const s = e * t;
  let r = Tl[s];
  if (r === void 0 && (r = new Float32Array(s), Tl[s] = r), e !== 0) {
    n.toArray(r, 0);
    for (let o = 1, a = 0; o !== e; ++o)
      a += t, i[o].toArray(r, a);
  }
  return r;
}
function kt(i, e) {
  if (i.length !== e.length) return !1;
  for (let t = 0, n = i.length; t < n; t++)
    if (i[t] !== e[t]) return !1;
  return !0;
}
function zt(i, e) {
  for (let t = 0, n = e.length; t < n; t++)
    i[t] = e[t];
}
function lo(i, e) {
  let t = Al[e];
  t === void 0 && (t = new Int32Array(e), Al[e] = t);
  for (let n = 0; n !== e; ++n)
    t[n] = i.allocateTextureUnit();
  return t;
}
function Y0(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1f(this.addr, e), t[0] = e);
}
function K0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2f(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (kt(t, e)) return;
    i.uniform2fv(this.addr, e), zt(t, e);
  }
}
function j0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3f(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else if (e.r !== void 0)
    (t[0] !== e.r || t[1] !== e.g || t[2] !== e.b) && (i.uniform3f(this.addr, e.r, e.g, e.b), t[0] = e.r, t[1] = e.g, t[2] = e.b);
  else {
    if (kt(t, e)) return;
    i.uniform3fv(this.addr, e), zt(t, e);
  }
}
function Z0(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4f(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (kt(t, e)) return;
    i.uniform4fv(this.addr, e), zt(t, e);
  }
}
function $0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (kt(t, e)) return;
    i.uniformMatrix2fv(this.addr, !1, e), zt(t, e);
  } else {
    if (kt(t, n)) return;
    Pl.set(n), i.uniformMatrix2fv(this.addr, !1, Pl), zt(t, n);
  }
}
function J0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (kt(t, e)) return;
    i.uniformMatrix3fv(this.addr, !1, e), zt(t, e);
  } else {
    if (kt(t, n)) return;
    Cl.set(n), i.uniformMatrix3fv(this.addr, !1, Cl), zt(t, n);
  }
}
function Q0(i, e) {
  const t = this.cache, n = e.elements;
  if (n === void 0) {
    if (kt(t, e)) return;
    i.uniformMatrix4fv(this.addr, !1, e), zt(t, e);
  } else {
    if (kt(t, n)) return;
    Rl.set(n), i.uniformMatrix4fv(this.addr, !1, Rl), zt(t, n);
  }
}
function eg(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1i(this.addr, e), t[0] = e);
}
function tg(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2i(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (kt(t, e)) return;
    i.uniform2iv(this.addr, e), zt(t, e);
  }
}
function ng(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3i(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else {
    if (kt(t, e)) return;
    i.uniform3iv(this.addr, e), zt(t, e);
  }
}
function ig(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4i(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (kt(t, e)) return;
    i.uniform4iv(this.addr, e), zt(t, e);
  }
}
function sg(i, e) {
  const t = this.cache;
  t[0] !== e && (i.uniform1ui(this.addr, e), t[0] = e);
}
function rg(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y) && (i.uniform2ui(this.addr, e.x, e.y), t[0] = e.x, t[1] = e.y);
  else {
    if (kt(t, e)) return;
    i.uniform2uiv(this.addr, e), zt(t, e);
  }
}
function og(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z) && (i.uniform3ui(this.addr, e.x, e.y, e.z), t[0] = e.x, t[1] = e.y, t[2] = e.z);
  else {
    if (kt(t, e)) return;
    i.uniform3uiv(this.addr, e), zt(t, e);
  }
}
function ag(i, e) {
  const t = this.cache;
  if (e.x !== void 0)
    (t[0] !== e.x || t[1] !== e.y || t[2] !== e.z || t[3] !== e.w) && (i.uniform4ui(this.addr, e.x, e.y, e.z, e.w), t[0] = e.x, t[1] = e.y, t[2] = e.z, t[3] = e.w);
  else {
    if (kt(t, e)) return;
    i.uniform4uiv(this.addr, e), zt(t, e);
  }
}
function cg(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s);
  let r;
  this.type === i.SAMPLER_2D_SHADOW ? (Ml.compareFunction = Eh, r = Ml) : r = $h, t.setTexture2D(e || r, s);
}
function lg(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTexture3D(e || Qh, s);
}
function hg(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTextureCube(e || eu, s);
}
function ug(i, e, t) {
  const n = this.cache, s = t.allocateTextureUnit();
  n[0] !== s && (i.uniform1i(this.addr, s), n[0] = s), t.setTexture2DArray(e || Jh, s);
}
function dg(i) {
  switch (i) {
    case 5126:
      return Y0;
    // FLOAT
    case 35664:
      return K0;
    // _VEC2
    case 35665:
      return j0;
    // _VEC3
    case 35666:
      return Z0;
    // _VEC4
    case 35674:
      return $0;
    // _MAT2
    case 35675:
      return J0;
    // _MAT3
    case 35676:
      return Q0;
    // _MAT4
    case 5124:
    case 35670:
      return eg;
    // INT, BOOL
    case 35667:
    case 35671:
      return tg;
    // _VEC2
    case 35668:
    case 35672:
      return ng;
    // _VEC3
    case 35669:
    case 35673:
      return ig;
    // _VEC4
    case 5125:
      return sg;
    // UINT
    case 36294:
      return rg;
    // _VEC2
    case 36295:
      return og;
    // _VEC3
    case 36296:
      return ag;
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
      return cg;
    case 35679:
    // SAMPLER_3D
    case 36299:
    // INT_SAMPLER_3D
    case 36307:
      return lg;
    case 35680:
    // SAMPLER_CUBE
    case 36300:
    // INT_SAMPLER_CUBE
    case 36308:
    // UNSIGNED_INT_SAMPLER_CUBE
    case 36293:
      return hg;
    case 36289:
    // SAMPLER_2D_ARRAY
    case 36303:
    // INT_SAMPLER_2D_ARRAY
    case 36311:
    // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 36292:
      return ug;
  }
}
function fg(i, e) {
  i.uniform1fv(this.addr, e);
}
function pg(i, e) {
  const t = Ds(e, this.size, 2);
  i.uniform2fv(this.addr, t);
}
function mg(i, e) {
  const t = Ds(e, this.size, 3);
  i.uniform3fv(this.addr, t);
}
function gg(i, e) {
  const t = Ds(e, this.size, 4);
  i.uniform4fv(this.addr, t);
}
function _g(i, e) {
  const t = Ds(e, this.size, 4);
  i.uniformMatrix2fv(this.addr, !1, t);
}
function vg(i, e) {
  const t = Ds(e, this.size, 9);
  i.uniformMatrix3fv(this.addr, !1, t);
}
function xg(i, e) {
  const t = Ds(e, this.size, 16);
  i.uniformMatrix4fv(this.addr, !1, t);
}
function yg(i, e) {
  i.uniform1iv(this.addr, e);
}
function Sg(i, e) {
  i.uniform2iv(this.addr, e);
}
function bg(i, e) {
  i.uniform3iv(this.addr, e);
}
function wg(i, e) {
  i.uniform4iv(this.addr, e);
}
function Eg(i, e) {
  i.uniform1uiv(this.addr, e);
}
function Mg(i, e) {
  i.uniform2uiv(this.addr, e);
}
function Tg(i, e) {
  i.uniform3uiv(this.addr, e);
}
function Ag(i, e) {
  i.uniform4uiv(this.addr, e);
}
function Rg(i, e, t) {
  const n = this.cache, s = e.length, r = lo(t, s);
  kt(n, r) || (i.uniform1iv(this.addr, r), zt(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture2D(e[o] || $h, r[o]);
}
function Cg(i, e, t) {
  const n = this.cache, s = e.length, r = lo(t, s);
  kt(n, r) || (i.uniform1iv(this.addr, r), zt(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture3D(e[o] || Qh, r[o]);
}
function Pg(i, e, t) {
  const n = this.cache, s = e.length, r = lo(t, s);
  kt(n, r) || (i.uniform1iv(this.addr, r), zt(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTextureCube(e[o] || eu, r[o]);
}
function Ig(i, e, t) {
  const n = this.cache, s = e.length, r = lo(t, s);
  kt(n, r) || (i.uniform1iv(this.addr, r), zt(n, r));
  for (let o = 0; o !== s; ++o)
    t.setTexture2DArray(e[o] || Jh, r[o]);
}
function Lg(i) {
  switch (i) {
    case 5126:
      return fg;
    // FLOAT
    case 35664:
      return pg;
    // _VEC2
    case 35665:
      return mg;
    // _VEC3
    case 35666:
      return gg;
    // _VEC4
    case 35674:
      return _g;
    // _MAT2
    case 35675:
      return vg;
    // _MAT3
    case 35676:
      return xg;
    // _MAT4
    case 5124:
    case 35670:
      return yg;
    // INT, BOOL
    case 35667:
    case 35671:
      return Sg;
    // _VEC2
    case 35668:
    case 35672:
      return bg;
    // _VEC3
    case 35669:
    case 35673:
      return wg;
    // _VEC4
    case 5125:
      return Eg;
    // UINT
    case 36294:
      return Mg;
    // _VEC2
    case 36295:
      return Tg;
    // _VEC3
    case 36296:
      return Ag;
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
      return Rg;
    case 35679:
    // SAMPLER_3D
    case 36299:
    // INT_SAMPLER_3D
    case 36307:
      return Cg;
    case 35680:
    // SAMPLER_CUBE
    case 36300:
    // INT_SAMPLER_CUBE
    case 36308:
    // UNSIGNED_INT_SAMPLER_CUBE
    case 36293:
      return Pg;
    case 36289:
    // SAMPLER_2D_ARRAY
    case 36303:
    // INT_SAMPLER_2D_ARRAY
    case 36311:
    // UNSIGNED_INT_SAMPLER_2D_ARRAY
    case 36292:
      return Ig;
  }
}
class Dg {
  constructor(e, t, n) {
    this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.setValue = dg(t.type);
  }
}
class Ng {
  constructor(e, t, n) {
    this.id = e, this.addr = n, this.cache = [], this.type = t.type, this.size = t.size, this.setValue = Lg(t.type);
  }
}
class Ug {
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
const Yo = /(\w+)(\])?(\[|\.)?/g;
function Il(i, e) {
  i.seq.push(e), i.map[e.id] = e;
}
function Fg(i, e, t) {
  const n = i.name, s = n.length;
  for (Yo.lastIndex = 0; ; ) {
    const r = Yo.exec(n), o = Yo.lastIndex;
    let a = r[1];
    const c = r[2] === "]", l = r[3];
    if (c && (a = a | 0), l === void 0 || l === "[" && o + 2 === s) {
      Il(t, l === void 0 ? new Dg(a, i, e) : new Ng(a, i, e));
      break;
    } else {
      let u = t.map[a];
      u === void 0 && (u = new Ug(a), Il(t, u)), t = u;
    }
  }
}
class $r {
  constructor(e, t) {
    this.seq = [], this.map = {};
    const n = e.getProgramParameter(t, e.ACTIVE_UNIFORMS);
    for (let s = 0; s < n; ++s) {
      const r = e.getActiveUniform(t, s), o = e.getUniformLocation(t, r.name);
      Fg(r, o, this);
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
function Ll(i, e, t) {
  const n = i.createShader(e);
  return i.shaderSource(n, t), i.compileShader(n), n;
}
const Og = 37297;
let Bg = 0;
function kg(i, e) {
  const t = i.split(`
`), n = [], s = Math.max(e - 6, 0), r = Math.min(e + 6, t.length);
  for (let o = s; o < r; o++) {
    const a = o + 1;
    n.push(`${a === e ? ">" : " "} ${a}: ${t[o]}`);
  }
  return n.join(`
`);
}
const Dl = /* @__PURE__ */ new Ke();
function zg(i) {
  ct._getMatrix(Dl, ct.workingColorSpace, i);
  const e = `mat3( ${Dl.elements.map((t) => t.toFixed(4))} )`;
  switch (ct.getTransfer(i)) {
    case to:
      return [e, "LinearTransferOETF"];
    case yt:
      return [e, "sRGBTransferOETF"];
    default:
      return console.warn("THREE.WebGLProgram: Unsupported color space: ", i), [e, "LinearTransferOETF"];
  }
}
function Nl(i, e, t) {
  const n = i.getShaderParameter(e, i.COMPILE_STATUS), s = i.getShaderInfoLog(e).trim();
  if (n && s === "") return "";
  const r = /ERROR: 0:(\d+)/.exec(s);
  if (r) {
    const o = parseInt(r[1]);
    return t.toUpperCase() + `

` + s + `

` + kg(i.getShaderSource(e), o);
  } else
    return s;
}
function Hg(i, e) {
  const t = zg(e);
  return [
    `vec4 ${i}( vec4 value ) {`,
    `	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,
    "}"
  ].join(`
`);
}
function Vg(i, e) {
  let t;
  switch (e) {
    case Fu:
      t = "Linear";
      break;
    case Ou:
      t = "Reinhard";
      break;
    case Bu:
      t = "Cineon";
      break;
    case hh:
      t = "ACESFilmic";
      break;
    case zu:
      t = "AgX";
      break;
    case Hu:
      t = "Neutral";
      break;
    case ku:
      t = "Custom";
      break;
    default:
      console.warn("THREE.WebGLProgram: Unsupported toneMapping:", e), t = "Linear";
  }
  return "vec3 " + i + "( vec3 color ) { return " + t + "ToneMapping( color ); }";
}
const kr = /* @__PURE__ */ new M();
function Gg() {
  ct.getLuminanceCoefficients(kr);
  const i = kr.x.toFixed(4), e = kr.y.toFixed(4), t = kr.z.toFixed(4);
  return [
    "float luminance( const in vec3 rgb ) {",
    `	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,
    "	return dot( weights, rgb );",
    "}"
  ].join(`
`);
}
function Wg(i) {
  return [
    i.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "",
    i.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : ""
  ].filter($s).join(`
`);
}
function Xg(i) {
  const e = [];
  for (const t in i) {
    const n = i[t];
    n !== !1 && e.push("#define " + t + " " + n);
  }
  return e.join(`
`);
}
function qg(i, e) {
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
function Ul(i, e) {
  const t = e.numSpotLightShadows + e.numSpotLightMaps - e.numSpotLightShadowsWithMaps;
  return i.replace(/NUM_DIR_LIGHTS/g, e.numDirLights).replace(/NUM_SPOT_LIGHTS/g, e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g, e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g, t).replace(/NUM_RECT_AREA_LIGHTS/g, e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g, e.numPointLights).replace(/NUM_HEMI_LIGHTS/g, e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g, e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g, e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g, e.numPointLightShadows);
}
function Fl(i, e) {
  return i.replace(/NUM_CLIPPING_PLANES/g, e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, e.numClippingPlanes - e.numClipIntersection);
}
const Yg = /^[ \t]*#include +<([\w\d./]+)>/gm;
function qa(i) {
  return i.replace(Yg, jg);
}
const Kg = /* @__PURE__ */ new Map();
function jg(i, e) {
  let t = Je[e];
  if (t === void 0) {
    const n = Kg.get(e);
    if (n !== void 0)
      t = Je[n], console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', e, n);
    else
      throw new Error("Can not resolve #include <" + e + ">");
  }
  return qa(t);
}
const Zg = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;
function Ol(i) {
  return i.replace(Zg, $g);
}
function $g(i, e, t, n) {
  let s = "";
  for (let r = parseInt(e); r < parseInt(t); r++)
    s += n.replace(/\[\s*i\s*\]/g, "[ " + r + " ]").replace(/UNROLLED_LOOP_INDEX/g, r);
  return s;
}
function Bl(i) {
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
function Jg(i) {
  let e = "SHADOWMAP_TYPE_BASIC";
  return i.shadowMapType === ah ? e = "SHADOWMAP_TYPE_PCF" : i.shadowMapType === ch ? e = "SHADOWMAP_TYPE_PCF_SOFT" : i.shadowMapType === $n && (e = "SHADOWMAP_TYPE_VSM"), e;
}
function Qg(i) {
  let e = "ENVMAP_TYPE_CUBE";
  if (i.envMap)
    switch (i.envMapMode) {
      case vs:
      case xs:
        e = "ENVMAP_TYPE_CUBE";
        break;
      case oo:
        e = "ENVMAP_TYPE_CUBE_UV";
        break;
    }
  return e;
}
function e_(i) {
  let e = "ENVMAP_MODE_REFLECTION";
  if (i.envMap)
    switch (i.envMapMode) {
      case xs:
        e = "ENVMAP_MODE_REFRACTION";
        break;
    }
  return e;
}
function t_(i) {
  let e = "ENVMAP_BLENDING_NONE";
  if (i.envMap)
    switch (i.combine) {
      case lh:
        e = "ENVMAP_BLENDING_MULTIPLY";
        break;
      case Nu:
        e = "ENVMAP_BLENDING_MIX";
        break;
      case Uu:
        e = "ENVMAP_BLENDING_ADD";
        break;
    }
  return e;
}
function n_(i) {
  const e = i.envMapCubeUVHeight;
  if (e === null) return null;
  const t = Math.log2(e) - 2, n = 1 / e;
  return { texelWidth: 1 / (3 * Math.max(Math.pow(2, t), 112)), texelHeight: n, maxMip: t };
}
function i_(i, e, t, n) {
  const s = i.getContext(), r = t.defines;
  let o = t.vertexShader, a = t.fragmentShader;
  const c = Jg(t), l = Qg(t), h = e_(t), u = t_(t), d = n_(t), f = Wg(t), g = Xg(r), _ = s.createProgram();
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
    Bl(t),
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
    Bl(t),
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
    t.toneMapping !== Si ? "#define TONE_MAPPING" : "",
    t.toneMapping !== Si ? Je.tonemapping_pars_fragment : "",
    // this code is required here because it is used by the toneMapping() function defined below
    t.toneMapping !== Si ? Vg("toneMapping", t.toneMapping) : "",
    t.dithering ? "#define DITHERING" : "",
    t.opaque ? "#define OPAQUE" : "",
    Je.colorspace_pars_fragment,
    // this code is required here because it is used by the various encoding/decoding function defined below
    Hg("linearToOutputTexel", t.outputColorSpace),
    Gg(),
    t.useDepthPacking ? "#define DEPTH_PACKING " + t.depthPacking : "",
    `
`
  ].filter($s).join(`
`)), o = qa(o), o = Ul(o, t), o = Fl(o, t), a = qa(a), a = Ul(a, t), a = Fl(a, t), o = Ol(o), a = Ol(a), t.isRawShaderMaterial !== !0 && (x = `#version 300 es
`, m = [
    f,
    "#define attribute in",
    "#define varying out",
    "#define texture2D texture"
  ].join(`
`) + `
` + m, p = [
    "#define varying in",
    t.glslVersion === Pc ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
    t.glslVersion === Pc ? "" : "#define gl_FragColor pc_fragColor",
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
  const b = x + m + o, v = x + p + a, P = Ll(s, s.VERTEX_SHADER, b), T = Ll(s, s.FRAGMENT_SHADER, v);
  s.attachShader(_, P), s.attachShader(_, T), t.index0AttributeName !== void 0 ? s.bindAttribLocation(_, 0, t.index0AttributeName) : t.morphTargets === !0 && s.bindAttribLocation(_, 0, "position"), s.linkProgram(_);
  function C(L) {
    if (i.debug.checkShaderErrors) {
      const H = s.getProgramInfoLog(_).trim(), V = s.getShaderInfoLog(P).trim(), Y = s.getShaderInfoLog(T).trim();
      let ee = !0, K = !0;
      if (s.getProgramParameter(_, s.LINK_STATUS) === !1)
        if (ee = !1, typeof i.debug.onShaderError == "function")
          i.debug.onShaderError(s, _, P, T);
        else {
          const oe = Nl(s, P, "vertex"), q = Nl(s, T, "fragment");
          console.error(
            "THREE.WebGLProgram: Shader Error " + s.getError() + " - VALIDATE_STATUS " + s.getProgramParameter(_, s.VALIDATE_STATUS) + `

Material Name: ` + L.name + `
Material Type: ` + L.type + `

Program Info Log: ` + H + `
` + oe + `
` + q
          );
        }
      else H !== "" ? console.warn("THREE.WebGLProgram: Program Info Log:", H) : (V === "" || Y === "") && (K = !1);
      K && (L.diagnostics = {
        runnable: ee,
        programLog: H,
        vertexShader: {
          log: V,
          prefix: m
        },
        fragmentShader: {
          log: Y,
          prefix: p
        }
      });
    }
    s.deleteShader(P), s.deleteShader(T), I = new $r(s, _), w = qg(s, _);
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
    return S === !1 && (S = s.getProgramParameter(_, Og)), S;
  }, this.destroy = function() {
    n.releaseStatesOfProgram(this), s.deleteProgram(_), this.program = void 0;
  }, this.type = t.shaderType, this.name = t.shaderName, this.id = Bg++, this.cacheKey = e, this.usedTimes = 1, this.program = _, this.vertexShader = P, this.fragmentShader = T, this;
}
let s_ = 0;
class r_ {
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
    return n === void 0 && (n = new o_(e), t.set(e, n)), n;
  }
}
class o_ {
  constructor(e) {
    this.id = s_++, this.code = e, this.usedTimes = 0;
  }
}
function a_(i, e, t, n, s, r, o) {
  const a = new Rh(), c = new r_(), l = /* @__PURE__ */ new Set(), h = [], u = s.logarithmicDepthBuffer, d = s.vertexTextures;
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
  function m(w, S, L, H, V) {
    const Y = H.fog, ee = V.geometry, K = w.isMeshStandardMaterial ? H.environment : null, oe = (w.isMeshStandardMaterial ? t : e).get(w.envMap || K), q = oe && oe.mapping === oo ? oe.image.height : null, ce = g[w.type];
    w.precision !== null && (f = s.getMaxPrecision(w.precision), f !== w.precision && console.warn("THREE.WebGLProgram.getParameters:", w.precision, "not supported, using", f, "instead."));
    const ve = ee.morphAttributes.position || ee.morphAttributes.normal || ee.morphAttributes.color, fe = ve !== void 0 ? ve.length : 0;
    let Ie = 0;
    ee.morphAttributes.position !== void 0 && (Ie = 1), ee.morphAttributes.normal !== void 0 && (Ie = 2), ee.morphAttributes.color !== void 0 && (Ie = 3);
    let ot, j, ne, be;
    if (ce) {
      const lt = Fn[ce];
      ot = lt.vertexShader, j = lt.fragmentShader;
    } else
      ot = w.vertexShader, j = w.fragmentShader, c.update(w), ne = c.getVertexShaderID(w), be = c.getFragmentShaderID(w);
    const _e = i.getRenderTarget(), Me = i.state.buffers.depth.getReversed(), ke = V.isInstancedMesh === !0, je = V.isBatchedMesh === !0, dt = !!w.map, qe = !!w.matcap, Et = !!oe, D = !!w.aoMap, qt = !!w.lightMap, Qe = !!w.bumpMap, Ze = !!w.normalMap, Re = !!w.displacementMap, at = !!w.emissiveMap, Pe = !!w.metalnessMap, A = !!w.roughnessMap, y = w.anisotropy > 0, k = w.clearcoat > 0, Q = w.dispersion > 0, te = w.iridescence > 0, $ = w.sheen > 0, B = w.transmission > 0, N = y && !!w.anisotropyMap, ue = k && !!w.clearcoatMap, tt = k && !!w.clearcoatNormalMap, se = k && !!w.clearcoatRoughnessMap, xe = te && !!w.iridescenceMap, Te = te && !!w.iridescenceThicknessMap, Ue = $ && !!w.sheenColorMap, we = $ && !!w.sheenRoughnessMap, $e = !!w.specularMap, Be = !!w.specularColorMap, ft = !!w.specularIntensityMap, U = B && !!w.transmissionMap, de = B && !!w.thicknessMap, X = !!w.gradientMap, Z = !!w.alphaMap, me = w.alphaTest > 0, le = !!w.alphaHash, ze = !!w.extensions;
    let bt = Si;
    w.toneMapped && (_e === null || _e.isXRRenderTarget === !0) && (bt = i.toneMapping);
    const Ut = {
      shaderID: ce,
      shaderType: w.type,
      shaderName: w.name,
      vertexShader: ot,
      fragmentShader: j,
      defines: w.defines,
      customVertexShaderID: ne,
      customFragmentShaderID: be,
      isRawShaderMaterial: w.isRawShaderMaterial === !0,
      glslVersion: w.glslVersion,
      precision: f,
      batching: je,
      batchingColor: je && V._colorsTexture !== null,
      instancing: ke,
      instancingColor: ke && V.instanceColor !== null,
      instancingMorph: ke && V.morphTexture !== null,
      supportsVertexTextures: d,
      outputColorSpace: _e === null ? i.outputColorSpace : _e.isXRRenderTarget === !0 ? _e.texture.colorSpace : on,
      alphaToCoverage: !!w.alphaToCoverage,
      map: dt,
      matcap: qe,
      envMap: Et,
      envMapMode: Et && oe.mapping,
      envMapCubeUVHeight: q,
      aoMap: D,
      lightMap: qt,
      bumpMap: Qe,
      normalMap: Ze,
      displacementMap: d && Re,
      emissiveMap: at,
      normalMapObjectSpace: Ze && w.normalMapType === Ku,
      normalMapTangentSpace: Ze && w.normalMapType === wh,
      metalnessMap: Pe,
      roughnessMap: A,
      anisotropy: y,
      anisotropyMap: N,
      clearcoat: k,
      clearcoatMap: ue,
      clearcoatNormalMap: tt,
      clearcoatRoughnessMap: se,
      dispersion: Q,
      iridescence: te,
      iridescenceMap: xe,
      iridescenceThicknessMap: Te,
      sheen: $,
      sheenColorMap: Ue,
      sheenRoughnessMap: we,
      specularMap: $e,
      specularColorMap: Be,
      specularIntensityMap: ft,
      transmission: B,
      transmissionMap: U,
      thicknessMap: de,
      gradientMap: X,
      opaque: w.transparent === !1 && w.blending === fs && w.alphaToCoverage === !1,
      alphaMap: Z,
      alphaTest: me,
      alphaHash: le,
      combine: w.combine,
      //
      mapUv: dt && _(w.map.channel),
      aoMapUv: D && _(w.aoMap.channel),
      lightMapUv: qt && _(w.lightMap.channel),
      bumpMapUv: Qe && _(w.bumpMap.channel),
      normalMapUv: Ze && _(w.normalMap.channel),
      displacementMapUv: Re && _(w.displacementMap.channel),
      emissiveMapUv: at && _(w.emissiveMap.channel),
      metalnessMapUv: Pe && _(w.metalnessMap.channel),
      roughnessMapUv: A && _(w.roughnessMap.channel),
      anisotropyMapUv: N && _(w.anisotropyMap.channel),
      clearcoatMapUv: ue && _(w.clearcoatMap.channel),
      clearcoatNormalMapUv: tt && _(w.clearcoatNormalMap.channel),
      clearcoatRoughnessMapUv: se && _(w.clearcoatRoughnessMap.channel),
      iridescenceMapUv: xe && _(w.iridescenceMap.channel),
      iridescenceThicknessMapUv: Te && _(w.iridescenceThicknessMap.channel),
      sheenColorMapUv: Ue && _(w.sheenColorMap.channel),
      sheenRoughnessMapUv: we && _(w.sheenRoughnessMap.channel),
      specularMapUv: $e && _(w.specularMap.channel),
      specularColorMapUv: Be && _(w.specularColorMap.channel),
      specularIntensityMapUv: ft && _(w.specularIntensityMap.channel),
      transmissionMapUv: U && _(w.transmissionMap.channel),
      thicknessMapUv: de && _(w.thicknessMap.channel),
      alphaMapUv: Z && _(w.alphaMap.channel),
      //
      vertexTangents: !!ee.attributes.tangent && (Ze || y),
      vertexColors: w.vertexColors,
      vertexAlphas: w.vertexColors === !0 && !!ee.attributes.color && ee.attributes.color.itemSize === 4,
      pointsUvs: V.isPoints === !0 && !!ee.attributes.uv && (dt || Z),
      fog: !!Y,
      useFog: w.fog === !0,
      fogExp2: !!Y && Y.isFogExp2,
      flatShading: w.flatShading === !0,
      sizeAttenuation: w.sizeAttenuation === !0,
      logarithmicDepthBuffer: u,
      reverseDepthBuffer: Me,
      skinning: V.isSkinnedMesh === !0,
      morphTargets: ee.morphAttributes.position !== void 0,
      morphNormals: ee.morphAttributes.normal !== void 0,
      morphColors: ee.morphAttributes.color !== void 0,
      morphTargetsCount: fe,
      morphTextureStride: Ie,
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
      shadowMapEnabled: i.shadowMap.enabled && L.length > 0,
      shadowMapType: i.shadowMap.type,
      toneMapping: bt,
      decodeVideoTexture: dt && w.map.isVideoTexture === !0 && ct.getTransfer(w.map.colorSpace) === yt,
      decodeVideoTextureEmissive: at && w.emissiveMap.isVideoTexture === !0 && ct.getTransfer(w.emissiveMap.colorSpace) === yt,
      premultipliedAlpha: w.premultipliedAlpha,
      doubleSided: w.side === Jt,
      flipSided: w.side === sn,
      useDepthPacking: w.depthPacking >= 0,
      depthPacking: w.depthPacking || 0,
      index0AttributeName: w.index0AttributeName,
      extensionClipCullDistance: ze && w.extensions.clipCullDistance === !0 && n.has("WEBGL_clip_cull_distance"),
      extensionMultiDraw: (ze && w.extensions.multiDraw === !0 || je) && n.has("WEBGL_multi_draw"),
      rendererExtensionParallelShaderCompile: n.has("KHR_parallel_shader_compile"),
      customProgramCacheKey: w.customProgramCacheKey()
    };
    return Ut.vertexUv1s = l.has(1), Ut.vertexUv2s = l.has(2), Ut.vertexUv3s = l.has(3), l.clear(), Ut;
  }
  function p(w) {
    const S = [];
    if (w.shaderID ? S.push(w.shaderID) : (S.push(w.customVertexShaderID), S.push(w.customFragmentShaderID)), w.defines !== void 0)
      for (const L in w.defines)
        S.push(L), S.push(w.defines[L]);
    return w.isRawShaderMaterial === !1 && (x(S, w), b(S, w), S.push(i.outputColorSpace)), S.push(w.customProgramCacheKey), S.join();
  }
  function x(w, S) {
    w.push(S.precision), w.push(S.outputColorSpace), w.push(S.envMapMode), w.push(S.envMapCubeUVHeight), w.push(S.mapUv), w.push(S.alphaMapUv), w.push(S.lightMapUv), w.push(S.aoMapUv), w.push(S.bumpMapUv), w.push(S.normalMapUv), w.push(S.displacementMapUv), w.push(S.emissiveMapUv), w.push(S.metalnessMapUv), w.push(S.roughnessMapUv), w.push(S.anisotropyMapUv), w.push(S.clearcoatMapUv), w.push(S.clearcoatNormalMapUv), w.push(S.clearcoatRoughnessMapUv), w.push(S.iridescenceMapUv), w.push(S.iridescenceThicknessMapUv), w.push(S.sheenColorMapUv), w.push(S.sheenRoughnessMapUv), w.push(S.specularMapUv), w.push(S.specularColorMapUv), w.push(S.specularIntensityMapUv), w.push(S.transmissionMapUv), w.push(S.thicknessMapUv), w.push(S.combine), w.push(S.fogExp2), w.push(S.sizeAttenuation), w.push(S.morphTargetsCount), w.push(S.morphAttributeCount), w.push(S.numDirLights), w.push(S.numPointLights), w.push(S.numSpotLights), w.push(S.numSpotLightMaps), w.push(S.numHemiLights), w.push(S.numRectAreaLights), w.push(S.numDirLightShadows), w.push(S.numPointLightShadows), w.push(S.numSpotLightShadows), w.push(S.numSpotLightShadowsWithMaps), w.push(S.numLightProbes), w.push(S.shadowMapType), w.push(S.toneMapping), w.push(S.numClippingPlanes), w.push(S.numClipIntersection), w.push(S.depthPacking);
  }
  function b(w, S) {
    a.disableAll(), S.supportsVertexTextures && a.enable(0), S.instancing && a.enable(1), S.instancingColor && a.enable(2), S.instancingMorph && a.enable(3), S.matcap && a.enable(4), S.envMap && a.enable(5), S.normalMapObjectSpace && a.enable(6), S.normalMapTangentSpace && a.enable(7), S.clearcoat && a.enable(8), S.iridescence && a.enable(9), S.alphaTest && a.enable(10), S.vertexColors && a.enable(11), S.vertexAlphas && a.enable(12), S.vertexUv1s && a.enable(13), S.vertexUv2s && a.enable(14), S.vertexUv3s && a.enable(15), S.vertexTangents && a.enable(16), S.anisotropy && a.enable(17), S.alphaHash && a.enable(18), S.batching && a.enable(19), S.dispersion && a.enable(20), S.batchingColor && a.enable(21), w.push(a.mask), a.disableAll(), S.fog && a.enable(0), S.useFog && a.enable(1), S.flatShading && a.enable(2), S.logarithmicDepthBuffer && a.enable(3), S.reverseDepthBuffer && a.enable(4), S.skinning && a.enable(5), S.morphTargets && a.enable(6), S.morphNormals && a.enable(7), S.morphColors && a.enable(8), S.premultipliedAlpha && a.enable(9), S.shadowMapEnabled && a.enable(10), S.doubleSided && a.enable(11), S.flipSided && a.enable(12), S.useDepthPacking && a.enable(13), S.dithering && a.enable(14), S.transmission && a.enable(15), S.sheen && a.enable(16), S.opaque && a.enable(17), S.pointsUvs && a.enable(18), S.decodeVideoTexture && a.enable(19), S.decodeVideoTextureEmissive && a.enable(20), S.alphaToCoverage && a.enable(21), w.push(a.mask);
  }
  function v(w) {
    const S = g[w.type];
    let L;
    if (S) {
      const H = Fn[S];
      L = kd.clone(H.uniforms);
    } else
      L = w.uniforms;
    return L;
  }
  function P(w, S) {
    let L;
    for (let H = 0, V = h.length; H < V; H++) {
      const Y = h[H];
      if (Y.cacheKey === S) {
        L = Y, ++L.usedTimes;
        break;
      }
    }
    return L === void 0 && (L = new i_(i, S, w, r), h.push(L)), L;
  }
  function T(w) {
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
    releaseProgram: T,
    releaseShaderCache: C,
    // Exposed for resource monitoring & error feedback via renderer.info:
    programs: h,
    dispose: I
  };
}
function c_() {
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
function l_(i, e) {
  return i.groupOrder !== e.groupOrder ? i.groupOrder - e.groupOrder : i.renderOrder !== e.renderOrder ? i.renderOrder - e.renderOrder : i.material.id !== e.material.id ? i.material.id - e.material.id : i.z !== e.z ? i.z - e.z : i.id - e.id;
}
function kl(i, e) {
  return i.groupOrder !== e.groupOrder ? i.groupOrder - e.groupOrder : i.renderOrder !== e.renderOrder ? i.renderOrder - e.renderOrder : i.z !== e.z ? e.z - i.z : i.id - e.id;
}
function zl() {
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
    t.length > 1 && t.sort(u || l_), n.length > 1 && n.sort(d || kl), s.length > 1 && s.sort(d || kl);
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
function h_() {
  let i = /* @__PURE__ */ new WeakMap();
  function e(n, s) {
    const r = i.get(n);
    let o;
    return r === void 0 ? (o = new zl(), i.set(n, [o])) : s >= r.length ? (o = new zl(), r.push(o)) : o = r[s], o;
  }
  function t() {
    i = /* @__PURE__ */ new WeakMap();
  }
  return {
    get: e,
    dispose: t
  };
}
function u_() {
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
            color: new Ne()
          };
          break;
        case "SpotLight":
          t = {
            position: new M(),
            direction: new M(),
            color: new Ne(),
            distance: 0,
            coneCos: 0,
            penumbraCos: 0,
            decay: 0
          };
          break;
        case "PointLight":
          t = {
            position: new M(),
            color: new Ne(),
            distance: 0,
            decay: 0
          };
          break;
        case "HemisphereLight":
          t = {
            direction: new M(),
            skyColor: new Ne(),
            groundColor: new Ne()
          };
          break;
        case "RectAreaLight":
          t = {
            color: new Ne(),
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
function d_() {
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
            shadowMapSize: new he()
          };
          break;
        case "SpotLight":
          t = {
            shadowIntensity: 1,
            shadowBias: 0,
            shadowNormalBias: 0,
            shadowRadius: 1,
            shadowMapSize: new he()
          };
          break;
        case "PointLight":
          t = {
            shadowIntensity: 1,
            shadowBias: 0,
            shadowNormalBias: 0,
            shadowRadius: 1,
            shadowMapSize: new he(),
            shadowCameraNear: 1,
            shadowCameraFar: 1e3
          };
          break;
      }
      return i[e.id] = t, t;
    }
  };
}
let f_ = 0;
function p_(i, e) {
  return (e.castShadow ? 2 : 0) - (i.castShadow ? 2 : 0) + (e.map ? 1 : 0) - (i.map ? 1 : 0);
}
function m_(i) {
  const e = new u_(), t = d_(), n = {
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
  const s = new M(), r = new We(), o = new We();
  function a(l) {
    let h = 0, u = 0, d = 0;
    for (let w = 0; w < 9; w++) n.probe[w].set(0, 0, 0);
    let f = 0, g = 0, _ = 0, m = 0, p = 0, x = 0, b = 0, v = 0, P = 0, T = 0, C = 0;
    l.sort(p_);
    for (let w = 0, S = l.length; w < S; w++) {
      const L = l[w], H = L.color, V = L.intensity, Y = L.distance, ee = L.shadow && L.shadow.map ? L.shadow.map.texture : null;
      if (L.isAmbientLight)
        h += H.r * V, u += H.g * V, d += H.b * V;
      else if (L.isLightProbe) {
        for (let K = 0; K < 9; K++)
          n.probe[K].addScaledVector(L.sh.coefficients[K], V);
        C++;
      } else if (L.isDirectionalLight) {
        const K = e.get(L);
        if (K.color.copy(L.color).multiplyScalar(L.intensity), L.castShadow) {
          const oe = L.shadow, q = t.get(L);
          q.shadowIntensity = oe.intensity, q.shadowBias = oe.bias, q.shadowNormalBias = oe.normalBias, q.shadowRadius = oe.radius, q.shadowMapSize = oe.mapSize, n.directionalShadow[f] = q, n.directionalShadowMap[f] = ee, n.directionalShadowMatrix[f] = L.shadow.matrix, x++;
        }
        n.directional[f] = K, f++;
      } else if (L.isSpotLight) {
        const K = e.get(L);
        K.position.setFromMatrixPosition(L.matrixWorld), K.color.copy(H).multiplyScalar(V), K.distance = Y, K.coneCos = Math.cos(L.angle), K.penumbraCos = Math.cos(L.angle * (1 - L.penumbra)), K.decay = L.decay, n.spot[_] = K;
        const oe = L.shadow;
        if (L.map && (n.spotLightMap[P] = L.map, P++, oe.updateMatrices(L), L.castShadow && T++), n.spotLightMatrix[_] = oe.matrix, L.castShadow) {
          const q = t.get(L);
          q.shadowIntensity = oe.intensity, q.shadowBias = oe.bias, q.shadowNormalBias = oe.normalBias, q.shadowRadius = oe.radius, q.shadowMapSize = oe.mapSize, n.spotShadow[_] = q, n.spotShadowMap[_] = ee, v++;
        }
        _++;
      } else if (L.isRectAreaLight) {
        const K = e.get(L);
        K.color.copy(H).multiplyScalar(V), K.halfWidth.set(L.width * 0.5, 0, 0), K.halfHeight.set(0, L.height * 0.5, 0), n.rectArea[m] = K, m++;
      } else if (L.isPointLight) {
        const K = e.get(L);
        if (K.color.copy(L.color).multiplyScalar(L.intensity), K.distance = L.distance, K.decay = L.decay, L.castShadow) {
          const oe = L.shadow, q = t.get(L);
          q.shadowIntensity = oe.intensity, q.shadowBias = oe.bias, q.shadowNormalBias = oe.normalBias, q.shadowRadius = oe.radius, q.shadowMapSize = oe.mapSize, q.shadowCameraNear = oe.camera.near, q.shadowCameraFar = oe.camera.far, n.pointShadow[g] = q, n.pointShadowMap[g] = ee, n.pointShadowMatrix[g] = L.shadow.matrix, b++;
        }
        n.point[g] = K, g++;
      } else if (L.isHemisphereLight) {
        const K = e.get(L);
        K.skyColor.copy(L.color).multiplyScalar(V), K.groundColor.copy(L.groundColor).multiplyScalar(V), n.hemi[p] = K, p++;
      }
    }
    m > 0 && (i.has("OES_texture_float_linear") === !0 ? (n.rectAreaLTC1 = ge.LTC_FLOAT_1, n.rectAreaLTC2 = ge.LTC_FLOAT_2) : (n.rectAreaLTC1 = ge.LTC_HALF_1, n.rectAreaLTC2 = ge.LTC_HALF_2)), n.ambient[0] = h, n.ambient[1] = u, n.ambient[2] = d;
    const I = n.hash;
    (I.directionalLength !== f || I.pointLength !== g || I.spotLength !== _ || I.rectAreaLength !== m || I.hemiLength !== p || I.numDirectionalShadows !== x || I.numPointShadows !== b || I.numSpotShadows !== v || I.numSpotMaps !== P || I.numLightProbes !== C) && (n.directional.length = f, n.spot.length = _, n.rectArea.length = m, n.point.length = g, n.hemi.length = p, n.directionalShadow.length = x, n.directionalShadowMap.length = x, n.pointShadow.length = b, n.pointShadowMap.length = b, n.spotShadow.length = v, n.spotShadowMap.length = v, n.directionalShadowMatrix.length = x, n.pointShadowMatrix.length = b, n.spotLightMatrix.length = v + P - T, n.spotLightMap.length = P, n.numSpotLightShadowsWithMaps = T, n.numLightProbes = C, I.directionalLength = f, I.pointLength = g, I.spotLength = _, I.rectAreaLength = m, I.hemiLength = p, I.numDirectionalShadows = x, I.numPointShadows = b, I.numSpotShadows = v, I.numSpotMaps = P, I.numLightProbes = C, n.version = f_++);
  }
  function c(l, h) {
    let u = 0, d = 0, f = 0, g = 0, _ = 0;
    const m = h.matrixWorldInverse;
    for (let p = 0, x = l.length; p < x; p++) {
      const b = l[p];
      if (b.isDirectionalLight) {
        const v = n.directional[u];
        v.direction.setFromMatrixPosition(b.matrixWorld), s.setFromMatrixPosition(b.target.matrixWorld), v.direction.sub(s), v.direction.transformDirection(m), u++;
      } else if (b.isSpotLight) {
        const v = n.spot[f];
        v.position.setFromMatrixPosition(b.matrixWorld), v.position.applyMatrix4(m), v.direction.setFromMatrixPosition(b.matrixWorld), s.setFromMatrixPosition(b.target.matrixWorld), v.direction.sub(s), v.direction.transformDirection(m), f++;
      } else if (b.isRectAreaLight) {
        const v = n.rectArea[g];
        v.position.setFromMatrixPosition(b.matrixWorld), v.position.applyMatrix4(m), o.identity(), r.copy(b.matrixWorld), r.premultiply(m), o.extractRotation(r), v.halfWidth.set(b.width * 0.5, 0, 0), v.halfHeight.set(0, b.height * 0.5, 0), v.halfWidth.applyMatrix4(o), v.halfHeight.applyMatrix4(o), g++;
      } else if (b.isPointLight) {
        const v = n.point[d];
        v.position.setFromMatrixPosition(b.matrixWorld), v.position.applyMatrix4(m), d++;
      } else if (b.isHemisphereLight) {
        const v = n.hemi[_];
        v.direction.setFromMatrixPosition(b.matrixWorld), v.direction.transformDirection(m), _++;
      }
    }
  }
  return {
    setup: a,
    setupView: c,
    state: n
  };
}
function Hl(i) {
  const e = new m_(i), t = [], n = [];
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
function g_(i) {
  let e = /* @__PURE__ */ new WeakMap();
  function t(s, r = 0) {
    const o = e.get(s);
    let a;
    return o === void 0 ? (a = new Hl(i), e.set(s, [a])) : r >= o.length ? (a = new Hl(i), o.push(a)) : a = o[r], a;
  }
  function n() {
    e = /* @__PURE__ */ new WeakMap();
  }
  return {
    get: t,
    dispose: n
  };
}
const __ = `void main() {
	gl_Position = vec4( position, 1.0 );
}`, v_ = `uniform sampler2D shadow_pass;
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
function x_(i, e, t) {
  let n = new ac();
  const s = new he(), r = new he(), o = new mt(), a = new gf({ depthPacking: Yu }), c = new _f(), l = {}, h = t.maxTextureSize, u = { [ni]: sn, [sn]: ni, [Jt]: Jt }, d = new si({
    defines: {
      VSM_SAMPLES: 8
    },
    uniforms: {
      shadow_pass: { value: null },
      resolution: { value: new he() },
      radius: { value: 4 }
    },
    vertexShader: __,
    fragmentShader: v_
  }), f = d.clone();
  f.defines.HORIZONTAL_PASS = 1;
  const g = new Ht();
  g.setAttribute(
    "position",
    new Wt(
      new Float32Array([-1, -1, 0.5, 3, -1, 0.5, -1, 3, 0.5]),
      3
    )
  );
  const _ = new ae(g, d), m = this;
  this.enabled = !1, this.autoUpdate = !0, this.needsUpdate = !1, this.type = ah;
  let p = this.type;
  this.render = function(T, C, I) {
    if (m.enabled === !1 || m.autoUpdate === !1 && m.needsUpdate === !1 || T.length === 0) return;
    const w = i.getRenderTarget(), S = i.getActiveCubeFace(), L = i.getActiveMipmapLevel(), H = i.state;
    H.setBlending(yi), H.buffers.color.setClear(1, 1, 1, 1), H.buffers.depth.setTest(!0), H.setScissorTest(!1);
    const V = p !== $n && this.type === $n, Y = p === $n && this.type !== $n;
    for (let ee = 0, K = T.length; ee < K; ee++) {
      const oe = T[ee], q = oe.shadow;
      if (q === void 0) {
        console.warn("THREE.WebGLShadowMap:", oe, "has no shadow.");
        continue;
      }
      if (q.autoUpdate === !1 && q.needsUpdate === !1) continue;
      s.copy(q.mapSize);
      const ce = q.getFrameExtents();
      if (s.multiply(ce), r.copy(q.mapSize), (s.x > h || s.y > h) && (s.x > h && (r.x = Math.floor(h / ce.x), s.x = r.x * ce.x, q.mapSize.x = r.x), s.y > h && (r.y = Math.floor(h / ce.y), s.y = r.y * ce.y, q.mapSize.y = r.y)), q.map === null || V === !0 || Y === !0) {
        const fe = this.type !== $n ? { minFilter: rn, magFilter: rn } : {};
        q.map !== null && q.map.dispose(), q.map = new Oi(s.x, s.y, fe), q.map.texture.name = oe.name + ".shadowMap", q.camera.updateProjectionMatrix();
      }
      i.setRenderTarget(q.map), i.clear();
      const ve = q.getViewportCount();
      for (let fe = 0; fe < ve; fe++) {
        const Ie = q.getViewport(fe);
        o.set(
          r.x * Ie.x,
          r.y * Ie.y,
          r.x * Ie.z,
          r.y * Ie.w
        ), H.viewport(o), q.updateMatrices(oe, fe), n = q.getFrustum(), v(C, I, q.camera, oe, this.type);
      }
      q.isPointLightShadow !== !0 && this.type === $n && x(q, I), q.needsUpdate = !1;
    }
    p = this.type, m.needsUpdate = !1, i.setRenderTarget(w, S, L);
  };
  function x(T, C) {
    const I = e.update(_);
    d.defines.VSM_SAMPLES !== T.blurSamples && (d.defines.VSM_SAMPLES = T.blurSamples, f.defines.VSM_SAMPLES = T.blurSamples, d.needsUpdate = !0, f.needsUpdate = !0), T.mapPass === null && (T.mapPass = new Oi(s.x, s.y)), d.uniforms.shadow_pass.value = T.map.texture, d.uniforms.resolution.value = T.mapSize, d.uniforms.radius.value = T.radius, i.setRenderTarget(T.mapPass), i.clear(), i.renderBufferDirect(C, null, I, d, _, null), f.uniforms.shadow_pass.value = T.mapPass.texture, f.uniforms.resolution.value = T.mapSize, f.uniforms.radius.value = T.radius, i.setRenderTarget(T.map), i.clear(), i.renderBufferDirect(C, null, I, f, _, null);
  }
  function b(T, C, I, w) {
    let S = null;
    const L = I.isPointLight === !0 ? T.customDistanceMaterial : T.customDepthMaterial;
    if (L !== void 0)
      S = L;
    else if (S = I.isPointLight === !0 ? c : a, i.localClippingEnabled && C.clipShadows === !0 && Array.isArray(C.clippingPlanes) && C.clippingPlanes.length !== 0 || C.displacementMap && C.displacementScale !== 0 || C.alphaMap && C.alphaTest > 0 || C.map && C.alphaTest > 0) {
      const H = S.uuid, V = C.uuid;
      let Y = l[H];
      Y === void 0 && (Y = {}, l[H] = Y);
      let ee = Y[V];
      ee === void 0 && (ee = S.clone(), Y[V] = ee, C.addEventListener("dispose", P)), S = ee;
    }
    if (S.visible = C.visible, S.wireframe = C.wireframe, w === $n ? S.side = C.shadowSide !== null ? C.shadowSide : C.side : S.side = C.shadowSide !== null ? C.shadowSide : u[C.side], S.alphaMap = C.alphaMap, S.alphaTest = C.alphaTest, S.map = C.map, S.clipShadows = C.clipShadows, S.clippingPlanes = C.clippingPlanes, S.clipIntersection = C.clipIntersection, S.displacementMap = C.displacementMap, S.displacementScale = C.displacementScale, S.displacementBias = C.displacementBias, S.wireframeLinewidth = C.wireframeLinewidth, S.linewidth = C.linewidth, I.isPointLight === !0 && S.isMeshDistanceMaterial === !0) {
      const H = i.properties.get(S);
      H.light = I;
    }
    return S;
  }
  function v(T, C, I, w, S) {
    if (T.visible === !1) return;
    if (T.layers.test(C.layers) && (T.isMesh || T.isLine || T.isPoints) && (T.castShadow || T.receiveShadow && S === $n) && (!T.frustumCulled || n.intersectsObject(T))) {
      T.modelViewMatrix.multiplyMatrices(I.matrixWorldInverse, T.matrixWorld);
      const V = e.update(T), Y = T.material;
      if (Array.isArray(Y)) {
        const ee = V.groups;
        for (let K = 0, oe = ee.length; K < oe; K++) {
          const q = ee[K], ce = Y[q.materialIndex];
          if (ce && ce.visible) {
            const ve = b(T, ce, w, S);
            T.onBeforeShadow(i, T, C, I, V, ve, q), i.renderBufferDirect(I, null, V, ve, T, q), T.onAfterShadow(i, T, C, I, V, ve, q);
          }
        }
      } else if (Y.visible) {
        const ee = b(T, Y, w, S);
        T.onBeforeShadow(i, T, C, I, V, ee, null), i.renderBufferDirect(I, null, V, ee, T, null), T.onAfterShadow(i, T, C, I, V, ee, null);
      }
    }
    const H = T.children;
    for (let V = 0, Y = H.length; V < Y; V++)
      v(H[V], C, I, w, S);
  }
  function P(T) {
    T.target.removeEventListener("dispose", P);
    for (const I in l) {
      const w = l[I], S = T.target.uuid;
      S in w && (w[S].dispose(), delete w[S]);
    }
  }
}
const y_ = {
  [ia]: sa,
  [ra]: ca,
  [oa]: la,
  [_s]: aa,
  [sa]: ia,
  [ca]: ra,
  [la]: oa,
  [aa]: _s
};
function S_(i, e) {
  function t() {
    let U = !1;
    const de = new mt();
    let X = null;
    const Z = new mt(0, 0, 0, 0);
    return {
      setMask: function(me) {
        X !== me && !U && (i.colorMask(me, me, me, me), X = me);
      },
      setLocked: function(me) {
        U = me;
      },
      setClear: function(me, le, ze, bt, Ut) {
        Ut === !0 && (me *= bt, le *= bt, ze *= bt), de.set(me, le, ze, bt), Z.equals(de) === !1 && (i.clearColor(me, le, ze, bt), Z.copy(de));
      },
      reset: function() {
        U = !1, X = null, Z.set(-1, 0, 0, 0);
      }
    };
  }
  function n() {
    let U = !1, de = !1, X = null, Z = null, me = null;
    return {
      setReversed: function(le) {
        if (de !== le) {
          const ze = e.get("EXT_clip_control");
          de ? ze.clipControlEXT(ze.LOWER_LEFT_EXT, ze.ZERO_TO_ONE_EXT) : ze.clipControlEXT(ze.LOWER_LEFT_EXT, ze.NEGATIVE_ONE_TO_ONE_EXT);
          const bt = me;
          me = null, this.setClear(bt);
        }
        de = le;
      },
      getReversed: function() {
        return de;
      },
      setTest: function(le) {
        le ? _e(i.DEPTH_TEST) : Me(i.DEPTH_TEST);
      },
      setMask: function(le) {
        X !== le && !U && (i.depthMask(le), X = le);
      },
      setFunc: function(le) {
        if (de && (le = y_[le]), Z !== le) {
          switch (le) {
            case ia:
              i.depthFunc(i.NEVER);
              break;
            case sa:
              i.depthFunc(i.ALWAYS);
              break;
            case ra:
              i.depthFunc(i.LESS);
              break;
            case _s:
              i.depthFunc(i.LEQUAL);
              break;
            case oa:
              i.depthFunc(i.EQUAL);
              break;
            case aa:
              i.depthFunc(i.GEQUAL);
              break;
            case ca:
              i.depthFunc(i.GREATER);
              break;
            case la:
              i.depthFunc(i.NOTEQUAL);
              break;
            default:
              i.depthFunc(i.LEQUAL);
          }
          Z = le;
        }
      },
      setLocked: function(le) {
        U = le;
      },
      setClear: function(le) {
        me !== le && (de && (le = 1 - le), i.clearDepth(le), me = le);
      },
      reset: function() {
        U = !1, X = null, Z = null, me = null, de = !1;
      }
    };
  }
  function s() {
    let U = !1, de = null, X = null, Z = null, me = null, le = null, ze = null, bt = null, Ut = null;
    return {
      setTest: function(lt) {
        U || (lt ? _e(i.STENCIL_TEST) : Me(i.STENCIL_TEST));
      },
      setMask: function(lt) {
        de !== lt && !U && (i.stencilMask(lt), de = lt);
      },
      setFunc: function(lt, cn, gn) {
        (X !== lt || Z !== cn || me !== gn) && (i.stencilFunc(lt, cn, gn), X = lt, Z = cn, me = gn);
      },
      setOp: function(lt, cn, gn) {
        (le !== lt || ze !== cn || bt !== gn) && (i.stencilOp(lt, cn, gn), le = lt, ze = cn, bt = gn);
      },
      setLocked: function(lt) {
        U = lt;
      },
      setClear: function(lt) {
        Ut !== lt && (i.clearStencil(lt), Ut = lt);
      },
      reset: function() {
        U = !1, de = null, X = null, Z = null, me = null, le = null, ze = null, bt = null, Ut = null;
      }
    };
  }
  const r = new t(), o = new n(), a = new s(), c = /* @__PURE__ */ new WeakMap(), l = /* @__PURE__ */ new WeakMap();
  let h = {}, u = {}, d = /* @__PURE__ */ new WeakMap(), f = [], g = null, _ = !1, m = null, p = null, x = null, b = null, v = null, P = null, T = null, C = new Ne(0, 0, 0), I = 0, w = !1, S = null, L = null, H = null, V = null, Y = null;
  const ee = i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
  let K = !1, oe = 0;
  const q = i.getParameter(i.VERSION);
  q.indexOf("WebGL") !== -1 ? (oe = parseFloat(/^WebGL (\d)/.exec(q)[1]), K = oe >= 1) : q.indexOf("OpenGL ES") !== -1 && (oe = parseFloat(/^OpenGL ES (\d)/.exec(q)[1]), K = oe >= 2);
  let ce = null, ve = {};
  const fe = i.getParameter(i.SCISSOR_BOX), Ie = i.getParameter(i.VIEWPORT), ot = new mt().fromArray(fe), j = new mt().fromArray(Ie);
  function ne(U, de, X, Z) {
    const me = new Uint8Array(4), le = i.createTexture();
    i.bindTexture(U, le), i.texParameteri(U, i.TEXTURE_MIN_FILTER, i.NEAREST), i.texParameteri(U, i.TEXTURE_MAG_FILTER, i.NEAREST);
    for (let ze = 0; ze < X; ze++)
      U === i.TEXTURE_3D || U === i.TEXTURE_2D_ARRAY ? i.texImage3D(de, 0, i.RGBA, 1, 1, Z, 0, i.RGBA, i.UNSIGNED_BYTE, me) : i.texImage2D(de + ze, 0, i.RGBA, 1, 1, 0, i.RGBA, i.UNSIGNED_BYTE, me);
    return le;
  }
  const be = {};
  be[i.TEXTURE_2D] = ne(i.TEXTURE_2D, i.TEXTURE_2D, 1), be[i.TEXTURE_CUBE_MAP] = ne(i.TEXTURE_CUBE_MAP, i.TEXTURE_CUBE_MAP_POSITIVE_X, 6), be[i.TEXTURE_2D_ARRAY] = ne(i.TEXTURE_2D_ARRAY, i.TEXTURE_2D_ARRAY, 1, 1), be[i.TEXTURE_3D] = ne(i.TEXTURE_3D, i.TEXTURE_3D, 1, 1), r.setClear(0, 0, 0, 1), o.setClear(1), a.setClear(0), _e(i.DEPTH_TEST), o.setFunc(_s), Qe(!1), Ze(Ec), _e(i.CULL_FACE), D(yi);
  function _e(U) {
    h[U] !== !0 && (i.enable(U), h[U] = !0);
  }
  function Me(U) {
    h[U] !== !1 && (i.disable(U), h[U] = !1);
  }
  function ke(U, de) {
    return u[U] !== de ? (i.bindFramebuffer(U, de), u[U] = de, U === i.DRAW_FRAMEBUFFER && (u[i.FRAMEBUFFER] = de), U === i.FRAMEBUFFER && (u[i.DRAW_FRAMEBUFFER] = de), !0) : !1;
  }
  function je(U, de) {
    let X = f, Z = !1;
    if (U) {
      X = d.get(de), X === void 0 && (X = [], d.set(de, X));
      const me = U.textures;
      if (X.length !== me.length || X[0] !== i.COLOR_ATTACHMENT0) {
        for (let le = 0, ze = me.length; le < ze; le++)
          X[le] = i.COLOR_ATTACHMENT0 + le;
        X.length = me.length, Z = !0;
      }
    } else
      X[0] !== i.BACK && (X[0] = i.BACK, Z = !0);
    Z && i.drawBuffers(X);
  }
  function dt(U) {
    return g !== U ? (i.useProgram(U), g = U, !0) : !1;
  }
  const qe = {
    [Ni]: i.FUNC_ADD,
    [_u]: i.FUNC_SUBTRACT,
    [vu]: i.FUNC_REVERSE_SUBTRACT
  };
  qe[xu] = i.MIN, qe[yu] = i.MAX;
  const Et = {
    [Su]: i.ZERO,
    [bu]: i.ONE,
    [wu]: i.SRC_COLOR,
    [ta]: i.SRC_ALPHA,
    [Cu]: i.SRC_ALPHA_SATURATE,
    [Au]: i.DST_COLOR,
    [Mu]: i.DST_ALPHA,
    [Eu]: i.ONE_MINUS_SRC_COLOR,
    [na]: i.ONE_MINUS_SRC_ALPHA,
    [Ru]: i.ONE_MINUS_DST_COLOR,
    [Tu]: i.ONE_MINUS_DST_ALPHA,
    [Pu]: i.CONSTANT_COLOR,
    [Iu]: i.ONE_MINUS_CONSTANT_COLOR,
    [Lu]: i.CONSTANT_ALPHA,
    [Du]: i.ONE_MINUS_CONSTANT_ALPHA
  };
  function D(U, de, X, Z, me, le, ze, bt, Ut, lt) {
    if (U === yi) {
      _ === !0 && (Me(i.BLEND), _ = !1);
      return;
    }
    if (_ === !1 && (_e(i.BLEND), _ = !0), U !== gu) {
      if (U !== m || lt !== w) {
        if ((p !== Ni || v !== Ni) && (i.blendEquation(i.FUNC_ADD), p = Ni, v = Ni), lt)
          switch (U) {
            case fs:
              i.blendFuncSeparate(i.ONE, i.ONE_MINUS_SRC_ALPHA, i.ONE, i.ONE_MINUS_SRC_ALPHA);
              break;
            case Mc:
              i.blendFunc(i.ONE, i.ONE);
              break;
            case Tc:
              i.blendFuncSeparate(i.ZERO, i.ONE_MINUS_SRC_COLOR, i.ZERO, i.ONE);
              break;
            case Ac:
              i.blendFuncSeparate(i.ZERO, i.SRC_COLOR, i.ZERO, i.SRC_ALPHA);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", U);
              break;
          }
        else
          switch (U) {
            case fs:
              i.blendFuncSeparate(i.SRC_ALPHA, i.ONE_MINUS_SRC_ALPHA, i.ONE, i.ONE_MINUS_SRC_ALPHA);
              break;
            case Mc:
              i.blendFunc(i.SRC_ALPHA, i.ONE);
              break;
            case Tc:
              i.blendFuncSeparate(i.ZERO, i.ONE_MINUS_SRC_COLOR, i.ZERO, i.ONE);
              break;
            case Ac:
              i.blendFunc(i.ZERO, i.SRC_COLOR);
              break;
            default:
              console.error("THREE.WebGLState: Invalid blending: ", U);
              break;
          }
        x = null, b = null, P = null, T = null, C.set(0, 0, 0), I = 0, m = U, w = lt;
      }
      return;
    }
    me = me || de, le = le || X, ze = ze || Z, (de !== p || me !== v) && (i.blendEquationSeparate(qe[de], qe[me]), p = de, v = me), (X !== x || Z !== b || le !== P || ze !== T) && (i.blendFuncSeparate(Et[X], Et[Z], Et[le], Et[ze]), x = X, b = Z, P = le, T = ze), (bt.equals(C) === !1 || Ut !== I) && (i.blendColor(bt.r, bt.g, bt.b, Ut), C.copy(bt), I = Ut), m = U, w = !1;
  }
  function qt(U, de) {
    U.side === Jt ? Me(i.CULL_FACE) : _e(i.CULL_FACE);
    let X = U.side === sn;
    de && (X = !X), Qe(X), U.blending === fs && U.transparent === !1 ? D(yi) : D(U.blending, U.blendEquation, U.blendSrc, U.blendDst, U.blendEquationAlpha, U.blendSrcAlpha, U.blendDstAlpha, U.blendColor, U.blendAlpha, U.premultipliedAlpha), o.setFunc(U.depthFunc), o.setTest(U.depthTest), o.setMask(U.depthWrite), r.setMask(U.colorWrite);
    const Z = U.stencilWrite;
    a.setTest(Z), Z && (a.setMask(U.stencilWriteMask), a.setFunc(U.stencilFunc, U.stencilRef, U.stencilFuncMask), a.setOp(U.stencilFail, U.stencilZFail, U.stencilZPass)), at(U.polygonOffset, U.polygonOffsetFactor, U.polygonOffsetUnits), U.alphaToCoverage === !0 ? _e(i.SAMPLE_ALPHA_TO_COVERAGE) : Me(i.SAMPLE_ALPHA_TO_COVERAGE);
  }
  function Qe(U) {
    S !== U && (U ? i.frontFace(i.CW) : i.frontFace(i.CCW), S = U);
  }
  function Ze(U) {
    U !== pu ? (_e(i.CULL_FACE), U !== L && (U === Ec ? i.cullFace(i.BACK) : U === mu ? i.cullFace(i.FRONT) : i.cullFace(i.FRONT_AND_BACK))) : Me(i.CULL_FACE), L = U;
  }
  function Re(U) {
    U !== H && (K && i.lineWidth(U), H = U);
  }
  function at(U, de, X) {
    U ? (_e(i.POLYGON_OFFSET_FILL), (V !== de || Y !== X) && (i.polygonOffset(de, X), V = de, Y = X)) : Me(i.POLYGON_OFFSET_FILL);
  }
  function Pe(U) {
    U ? _e(i.SCISSOR_TEST) : Me(i.SCISSOR_TEST);
  }
  function A(U) {
    U === void 0 && (U = i.TEXTURE0 + ee - 1), ce !== U && (i.activeTexture(U), ce = U);
  }
  function y(U, de, X) {
    X === void 0 && (ce === null ? X = i.TEXTURE0 + ee - 1 : X = ce);
    let Z = ve[X];
    Z === void 0 && (Z = { type: void 0, texture: void 0 }, ve[X] = Z), (Z.type !== U || Z.texture !== de) && (ce !== X && (i.activeTexture(X), ce = X), i.bindTexture(U, de || be[U]), Z.type = U, Z.texture = de);
  }
  function k() {
    const U = ve[ce];
    U !== void 0 && U.type !== void 0 && (i.bindTexture(U.type, null), U.type = void 0, U.texture = void 0);
  }
  function Q() {
    try {
      i.compressedTexImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function te() {
    try {
      i.compressedTexImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function $() {
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
  function N() {
    try {
      i.compressedTexSubImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function ue() {
    try {
      i.compressedTexSubImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function tt() {
    try {
      i.texStorage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function se() {
    try {
      i.texStorage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function xe() {
    try {
      i.texImage2D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function Te() {
    try {
      i.texImage3D.apply(i, arguments);
    } catch (U) {
      console.error("THREE.WebGLState:", U);
    }
  }
  function Ue(U) {
    ot.equals(U) === !1 && (i.scissor(U.x, U.y, U.z, U.w), ot.copy(U));
  }
  function we(U) {
    j.equals(U) === !1 && (i.viewport(U.x, U.y, U.z, U.w), j.copy(U));
  }
  function $e(U, de) {
    let X = l.get(de);
    X === void 0 && (X = /* @__PURE__ */ new WeakMap(), l.set(de, X));
    let Z = X.get(U);
    Z === void 0 && (Z = i.getUniformBlockIndex(de, U.name), X.set(U, Z));
  }
  function Be(U, de) {
    const Z = l.get(de).get(U);
    c.get(de) !== Z && (i.uniformBlockBinding(de, Z, U.__bindingPointIndex), c.set(de, Z));
  }
  function ft() {
    i.disable(i.BLEND), i.disable(i.CULL_FACE), i.disable(i.DEPTH_TEST), i.disable(i.POLYGON_OFFSET_FILL), i.disable(i.SCISSOR_TEST), i.disable(i.STENCIL_TEST), i.disable(i.SAMPLE_ALPHA_TO_COVERAGE), i.blendEquation(i.FUNC_ADD), i.blendFunc(i.ONE, i.ZERO), i.blendFuncSeparate(i.ONE, i.ZERO, i.ONE, i.ZERO), i.blendColor(0, 0, 0, 0), i.colorMask(!0, !0, !0, !0), i.clearColor(0, 0, 0, 0), i.depthMask(!0), i.depthFunc(i.LESS), o.setReversed(!1), i.clearDepth(1), i.stencilMask(4294967295), i.stencilFunc(i.ALWAYS, 0, 4294967295), i.stencilOp(i.KEEP, i.KEEP, i.KEEP), i.clearStencil(0), i.cullFace(i.BACK), i.frontFace(i.CCW), i.polygonOffset(0, 0), i.activeTexture(i.TEXTURE0), i.bindFramebuffer(i.FRAMEBUFFER, null), i.bindFramebuffer(i.DRAW_FRAMEBUFFER, null), i.bindFramebuffer(i.READ_FRAMEBUFFER, null), i.useProgram(null), i.lineWidth(1), i.scissor(0, 0, i.canvas.width, i.canvas.height), i.viewport(0, 0, i.canvas.width, i.canvas.height), h = {}, ce = null, ve = {}, u = {}, d = /* @__PURE__ */ new WeakMap(), f = [], g = null, _ = !1, m = null, p = null, x = null, b = null, v = null, P = null, T = null, C = new Ne(0, 0, 0), I = 0, w = !1, S = null, L = null, H = null, V = null, Y = null, ot.set(0, 0, i.canvas.width, i.canvas.height), j.set(0, 0, i.canvas.width, i.canvas.height), r.reset(), o.reset(), a.reset();
  }
  return {
    buffers: {
      color: r,
      depth: o,
      stencil: a
    },
    enable: _e,
    disable: Me,
    bindFramebuffer: ke,
    drawBuffers: je,
    useProgram: dt,
    setBlending: D,
    setMaterial: qt,
    setFlipSided: Qe,
    setCullFace: Ze,
    setLineWidth: Re,
    setPolygonOffset: at,
    setScissorTest: Pe,
    activeTexture: A,
    bindTexture: y,
    unbindTexture: k,
    compressedTexImage2D: Q,
    compressedTexImage3D: te,
    texImage2D: xe,
    texImage3D: Te,
    updateUBOMapping: $e,
    uniformBlockBinding: Be,
    texStorage2D: tt,
    texStorage3D: se,
    texSubImage2D: $,
    texSubImage3D: B,
    compressedTexSubImage2D: N,
    compressedTexSubImage3D: ue,
    scissor: Ue,
    viewport: we,
    reset: ft
  };
}
function b_(i, e, t, n, s, r, o) {
  const a = e.has("WEBGL_multisampled_render_to_texture") ? e.get("WEBGL_multisampled_render_to_texture") : null, c = typeof navigator > "u" ? !1 : /OculusBrowser/g.test(navigator.userAgent), l = new he(), h = /* @__PURE__ */ new WeakMap();
  let u;
  const d = /* @__PURE__ */ new WeakMap();
  let f = !1;
  try {
    f = typeof OffscreenCanvas < "u" && new OffscreenCanvas(1, 1).getContext("2d") !== null;
  } catch {
  }
  function g(A, y) {
    return f ? (
      // eslint-disable-next-line compat/compat
      new OffscreenCanvas(A, y)
    ) : or("canvas");
  }
  function _(A, y, k) {
    let Q = 1;
    const te = Pe(A);
    if ((te.width > k || te.height > k) && (Q = k / Math.max(te.width, te.height)), Q < 1)
      if (typeof HTMLImageElement < "u" && A instanceof HTMLImageElement || typeof HTMLCanvasElement < "u" && A instanceof HTMLCanvasElement || typeof ImageBitmap < "u" && A instanceof ImageBitmap || typeof VideoFrame < "u" && A instanceof VideoFrame) {
        const $ = Math.floor(Q * te.width), B = Math.floor(Q * te.height);
        u === void 0 && (u = g($, B));
        const N = y ? g($, B) : u;
        return N.width = $, N.height = B, N.getContext("2d").drawImage(A, 0, 0, $, B), console.warn("THREE.WebGLRenderer: Texture has been resized from (" + te.width + "x" + te.height + ") to (" + $ + "x" + B + ")."), N;
      } else
        return "data" in A && console.warn("THREE.WebGLRenderer: Image in DataTexture is too big (" + te.width + "x" + te.height + ")."), A;
    return A;
  }
  function m(A) {
    return A.generateMipmaps;
  }
  function p(A) {
    i.generateMipmap(A);
  }
  function x(A) {
    return A.isWebGLCubeRenderTarget ? i.TEXTURE_CUBE_MAP : A.isWebGL3DRenderTarget ? i.TEXTURE_3D : A.isWebGLArrayRenderTarget || A.isCompressedArrayTexture ? i.TEXTURE_2D_ARRAY : i.TEXTURE_2D;
  }
  function b(A, y, k, Q, te = !1) {
    if (A !== null) {
      if (i[A] !== void 0) return i[A];
      console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '" + A + "'");
    }
    let $ = y;
    if (y === i.RED && (k === i.FLOAT && ($ = i.R32F), k === i.HALF_FLOAT && ($ = i.R16F), k === i.UNSIGNED_BYTE && ($ = i.R8)), y === i.RED_INTEGER && (k === i.UNSIGNED_BYTE && ($ = i.R8UI), k === i.UNSIGNED_SHORT && ($ = i.R16UI), k === i.UNSIGNED_INT && ($ = i.R32UI), k === i.BYTE && ($ = i.R8I), k === i.SHORT && ($ = i.R16I), k === i.INT && ($ = i.R32I)), y === i.RG && (k === i.FLOAT && ($ = i.RG32F), k === i.HALF_FLOAT && ($ = i.RG16F), k === i.UNSIGNED_BYTE && ($ = i.RG8)), y === i.RG_INTEGER && (k === i.UNSIGNED_BYTE && ($ = i.RG8UI), k === i.UNSIGNED_SHORT && ($ = i.RG16UI), k === i.UNSIGNED_INT && ($ = i.RG32UI), k === i.BYTE && ($ = i.RG8I), k === i.SHORT && ($ = i.RG16I), k === i.INT && ($ = i.RG32I)), y === i.RGB_INTEGER && (k === i.UNSIGNED_BYTE && ($ = i.RGB8UI), k === i.UNSIGNED_SHORT && ($ = i.RGB16UI), k === i.UNSIGNED_INT && ($ = i.RGB32UI), k === i.BYTE && ($ = i.RGB8I), k === i.SHORT && ($ = i.RGB16I), k === i.INT && ($ = i.RGB32I)), y === i.RGBA_INTEGER && (k === i.UNSIGNED_BYTE && ($ = i.RGBA8UI), k === i.UNSIGNED_SHORT && ($ = i.RGBA16UI), k === i.UNSIGNED_INT && ($ = i.RGBA32UI), k === i.BYTE && ($ = i.RGBA8I), k === i.SHORT && ($ = i.RGBA16I), k === i.INT && ($ = i.RGBA32I)), y === i.RGB && k === i.UNSIGNED_INT_5_9_9_9_REV && ($ = i.RGB9_E5), y === i.RGBA) {
      const B = te ? to : ct.getTransfer(Q);
      k === i.FLOAT && ($ = i.RGBA32F), k === i.HALF_FLOAT && ($ = i.RGBA16F), k === i.UNSIGNED_BYTE && ($ = B === yt ? i.SRGB8_ALPHA8 : i.RGBA8), k === i.UNSIGNED_SHORT_4_4_4_4 && ($ = i.RGBA4), k === i.UNSIGNED_SHORT_5_5_5_1 && ($ = i.RGB5_A1);
    }
    return ($ === i.R16F || $ === i.R32F || $ === i.RG16F || $ === i.RG32F || $ === i.RGBA16F || $ === i.RGBA32F) && e.get("EXT_color_buffer_float"), $;
  }
  function v(A, y) {
    let k;
    return A ? y === null || y === Fi || y === ys ? k = i.DEPTH24_STENCIL8 : y === Rn ? k = i.DEPTH32F_STENCIL8 : y === ir && (k = i.DEPTH24_STENCIL8, console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")) : y === null || y === Fi || y === ys ? k = i.DEPTH_COMPONENT24 : y === Rn ? k = i.DEPTH_COMPONENT32F : y === ir && (k = i.DEPTH_COMPONENT16), k;
  }
  function P(A, y) {
    return m(A) === !0 || A.isFramebufferTexture && A.minFilter !== rn && A.minFilter !== pn ? Math.log2(Math.max(y.width, y.height)) + 1 : A.mipmaps !== void 0 && A.mipmaps.length > 0 ? A.mipmaps.length : A.isCompressedTexture && Array.isArray(A.image) ? y.mipmaps.length : 1;
  }
  function T(A) {
    const y = A.target;
    y.removeEventListener("dispose", T), I(y), y.isVideoTexture && h.delete(y);
  }
  function C(A) {
    const y = A.target;
    y.removeEventListener("dispose", C), S(y);
  }
  function I(A) {
    const y = n.get(A);
    if (y.__webglInit === void 0) return;
    const k = A.source, Q = d.get(k);
    if (Q) {
      const te = Q[y.__cacheKey];
      te.usedTimes--, te.usedTimes === 0 && w(A), Object.keys(Q).length === 0 && d.delete(k);
    }
    n.remove(A);
  }
  function w(A) {
    const y = n.get(A);
    i.deleteTexture(y.__webglTexture);
    const k = A.source, Q = d.get(k);
    delete Q[y.__cacheKey], o.memory.textures--;
  }
  function S(A) {
    const y = n.get(A);
    if (A.depthTexture && (A.depthTexture.dispose(), n.remove(A.depthTexture)), A.isWebGLCubeRenderTarget)
      for (let Q = 0; Q < 6; Q++) {
        if (Array.isArray(y.__webglFramebuffer[Q]))
          for (let te = 0; te < y.__webglFramebuffer[Q].length; te++) i.deleteFramebuffer(y.__webglFramebuffer[Q][te]);
        else
          i.deleteFramebuffer(y.__webglFramebuffer[Q]);
        y.__webglDepthbuffer && i.deleteRenderbuffer(y.__webglDepthbuffer[Q]);
      }
    else {
      if (Array.isArray(y.__webglFramebuffer))
        for (let Q = 0; Q < y.__webglFramebuffer.length; Q++) i.deleteFramebuffer(y.__webglFramebuffer[Q]);
      else
        i.deleteFramebuffer(y.__webglFramebuffer);
      if (y.__webglDepthbuffer && i.deleteRenderbuffer(y.__webglDepthbuffer), y.__webglMultisampledFramebuffer && i.deleteFramebuffer(y.__webglMultisampledFramebuffer), y.__webglColorRenderbuffer)
        for (let Q = 0; Q < y.__webglColorRenderbuffer.length; Q++)
          y.__webglColorRenderbuffer[Q] && i.deleteRenderbuffer(y.__webglColorRenderbuffer[Q]);
      y.__webglDepthRenderbuffer && i.deleteRenderbuffer(y.__webglDepthRenderbuffer);
    }
    const k = A.textures;
    for (let Q = 0, te = k.length; Q < te; Q++) {
      const $ = n.get(k[Q]);
      $.__webglTexture && (i.deleteTexture($.__webglTexture), o.memory.textures--), n.remove(k[Q]);
    }
    n.remove(A);
  }
  let L = 0;
  function H() {
    L = 0;
  }
  function V() {
    const A = L;
    return A >= s.maxTextures && console.warn("THREE.WebGLTextures: Trying to use " + A + " texture units while this GPU supports only " + s.maxTextures), L += 1, A;
  }
  function Y(A) {
    const y = [];
    return y.push(A.wrapS), y.push(A.wrapT), y.push(A.wrapR || 0), y.push(A.magFilter), y.push(A.minFilter), y.push(A.anisotropy), y.push(A.internalFormat), y.push(A.format), y.push(A.type), y.push(A.generateMipmaps), y.push(A.premultiplyAlpha), y.push(A.flipY), y.push(A.unpackAlignment), y.push(A.colorSpace), y.join();
  }
  function ee(A, y) {
    const k = n.get(A);
    if (A.isVideoTexture && Re(A), A.isRenderTargetTexture === !1 && A.version > 0 && k.__version !== A.version) {
      const Q = A.image;
      if (Q === null)
        console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");
      else if (Q.complete === !1)
        console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");
      else {
        j(k, A, y);
        return;
      }
    }
    t.bindTexture(i.TEXTURE_2D, k.__webglTexture, i.TEXTURE0 + y);
  }
  function K(A, y) {
    const k = n.get(A);
    if (A.version > 0 && k.__version !== A.version) {
      j(k, A, y);
      return;
    }
    t.bindTexture(i.TEXTURE_2D_ARRAY, k.__webglTexture, i.TEXTURE0 + y);
  }
  function oe(A, y) {
    const k = n.get(A);
    if (A.version > 0 && k.__version !== A.version) {
      j(k, A, y);
      return;
    }
    t.bindTexture(i.TEXTURE_3D, k.__webglTexture, i.TEXTURE0 + y);
  }
  function q(A, y) {
    const k = n.get(A);
    if (A.version > 0 && k.__version !== A.version) {
      ne(k, A, y);
      return;
    }
    t.bindTexture(i.TEXTURE_CUBE_MAP, k.__webglTexture, i.TEXTURE0 + y);
  }
  const ce = {
    [Qt]: i.REPEAT,
    [_i]: i.CLAMP_TO_EDGE,
    [Qr]: i.MIRRORED_REPEAT
  }, ve = {
    [rn]: i.NEAREST,
    [dh]: i.NEAREST_MIPMAP_NEAREST,
    [Zs]: i.NEAREST_MIPMAP_LINEAR,
    [pn]: i.LINEAR,
    [Xr]: i.LINEAR_MIPMAP_NEAREST,
    [Qn]: i.LINEAR_MIPMAP_LINEAR
  }, fe = {
    [ju]: i.NEVER,
    [td]: i.ALWAYS,
    [Zu]: i.LESS,
    [Eh]: i.LEQUAL,
    [$u]: i.EQUAL,
    [ed]: i.GEQUAL,
    [Ju]: i.GREATER,
    [Qu]: i.NOTEQUAL
  };
  function Ie(A, y) {
    if (y.type === Rn && e.has("OES_texture_float_linear") === !1 && (y.magFilter === pn || y.magFilter === Xr || y.magFilter === Zs || y.magFilter === Qn || y.minFilter === pn || y.minFilter === Xr || y.minFilter === Zs || y.minFilter === Qn) && console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."), i.texParameteri(A, i.TEXTURE_WRAP_S, ce[y.wrapS]), i.texParameteri(A, i.TEXTURE_WRAP_T, ce[y.wrapT]), (A === i.TEXTURE_3D || A === i.TEXTURE_2D_ARRAY) && i.texParameteri(A, i.TEXTURE_WRAP_R, ce[y.wrapR]), i.texParameteri(A, i.TEXTURE_MAG_FILTER, ve[y.magFilter]), i.texParameteri(A, i.TEXTURE_MIN_FILTER, ve[y.minFilter]), y.compareFunction && (i.texParameteri(A, i.TEXTURE_COMPARE_MODE, i.COMPARE_REF_TO_TEXTURE), i.texParameteri(A, i.TEXTURE_COMPARE_FUNC, fe[y.compareFunction])), e.has("EXT_texture_filter_anisotropic") === !0) {
      if (y.magFilter === rn || y.minFilter !== Zs && y.minFilter !== Qn || y.type === Rn && e.has("OES_texture_float_linear") === !1) return;
      if (y.anisotropy > 1 || n.get(y).__currentAnisotropy) {
        const k = e.get("EXT_texture_filter_anisotropic");
        i.texParameterf(A, k.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(y.anisotropy, s.getMaxAnisotropy())), n.get(y).__currentAnisotropy = y.anisotropy;
      }
    }
  }
  function ot(A, y) {
    let k = !1;
    A.__webglInit === void 0 && (A.__webglInit = !0, y.addEventListener("dispose", T));
    const Q = y.source;
    let te = d.get(Q);
    te === void 0 && (te = {}, d.set(Q, te));
    const $ = Y(y);
    if ($ !== A.__cacheKey) {
      te[$] === void 0 && (te[$] = {
        texture: i.createTexture(),
        usedTimes: 0
      }, o.memory.textures++, k = !0), te[$].usedTimes++;
      const B = te[A.__cacheKey];
      B !== void 0 && (te[A.__cacheKey].usedTimes--, B.usedTimes === 0 && w(y)), A.__cacheKey = $, A.__webglTexture = te[$].texture;
    }
    return k;
  }
  function j(A, y, k) {
    let Q = i.TEXTURE_2D;
    (y.isDataArrayTexture || y.isCompressedArrayTexture) && (Q = i.TEXTURE_2D_ARRAY), y.isData3DTexture && (Q = i.TEXTURE_3D);
    const te = ot(A, y), $ = y.source;
    t.bindTexture(Q, A.__webglTexture, i.TEXTURE0 + k);
    const B = n.get($);
    if ($.version !== B.__version || te === !0) {
      t.activeTexture(i.TEXTURE0 + k);
      const N = ct.getPrimaries(ct.workingColorSpace), ue = y.colorSpace === gi ? null : ct.getPrimaries(y.colorSpace), tt = y.colorSpace === gi || N === ue ? i.NONE : i.BROWSER_DEFAULT_WEBGL;
      i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, y.flipY), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, y.premultiplyAlpha), i.pixelStorei(i.UNPACK_ALIGNMENT, y.unpackAlignment), i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL, tt);
      let se = _(y.image, !1, s.maxTextureSize);
      se = at(y, se);
      const xe = r.convert(y.format, y.colorSpace), Te = r.convert(y.type);
      let Ue = b(y.internalFormat, xe, Te, y.colorSpace, y.isVideoTexture);
      Ie(Q, y);
      let we;
      const $e = y.mipmaps, Be = y.isVideoTexture !== !0, ft = B.__version === void 0 || te === !0, U = $.dataReady, de = P(y, se);
      if (y.isDepthTexture)
        Ue = v(y.format === Ss, y.type), ft && (Be ? t.texStorage2D(i.TEXTURE_2D, 1, Ue, se.width, se.height) : t.texImage2D(i.TEXTURE_2D, 0, Ue, se.width, se.height, 0, xe, Te, null));
      else if (y.isDataTexture)
        if ($e.length > 0) {
          Be && ft && t.texStorage2D(i.TEXTURE_2D, de, Ue, $e[0].width, $e[0].height);
          for (let X = 0, Z = $e.length; X < Z; X++)
            we = $e[X], Be ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, we.width, we.height, xe, Te, we.data) : t.texImage2D(i.TEXTURE_2D, X, Ue, we.width, we.height, 0, xe, Te, we.data);
          y.generateMipmaps = !1;
        } else
          Be ? (ft && t.texStorage2D(i.TEXTURE_2D, de, Ue, se.width, se.height), U && t.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, se.width, se.height, xe, Te, se.data)) : t.texImage2D(i.TEXTURE_2D, 0, Ue, se.width, se.height, 0, xe, Te, se.data);
      else if (y.isCompressedTexture)
        if (y.isCompressedArrayTexture) {
          Be && ft && t.texStorage3D(i.TEXTURE_2D_ARRAY, de, Ue, $e[0].width, $e[0].height, se.depth);
          for (let X = 0, Z = $e.length; X < Z; X++)
            if (we = $e[X], y.format !== yn)
              if (xe !== null)
                if (Be) {
                  if (U)
                    if (y.layerUpdates.size > 0) {
                      const me = _l(we.width, we.height, y.format, y.type);
                      for (const le of y.layerUpdates) {
                        const ze = we.data.subarray(
                          le * me / we.data.BYTES_PER_ELEMENT,
                          (le + 1) * me / we.data.BYTES_PER_ELEMENT
                        );
                        t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, le, we.width, we.height, 1, xe, ze);
                      }
                      y.clearLayerUpdates();
                    } else
                      t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, 0, we.width, we.height, se.depth, xe, we.data);
                } else
                  t.compressedTexImage3D(i.TEXTURE_2D_ARRAY, X, Ue, we.width, we.height, se.depth, 0, we.data, 0, 0);
              else
                console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");
            else
              Be ? U && t.texSubImage3D(i.TEXTURE_2D_ARRAY, X, 0, 0, 0, we.width, we.height, se.depth, xe, Te, we.data) : t.texImage3D(i.TEXTURE_2D_ARRAY, X, Ue, we.width, we.height, se.depth, 0, xe, Te, we.data);
        } else {
          Be && ft && t.texStorage2D(i.TEXTURE_2D, de, Ue, $e[0].width, $e[0].height);
          for (let X = 0, Z = $e.length; X < Z; X++)
            we = $e[X], y.format !== yn ? xe !== null ? Be ? U && t.compressedTexSubImage2D(i.TEXTURE_2D, X, 0, 0, we.width, we.height, xe, we.data) : t.compressedTexImage2D(i.TEXTURE_2D, X, Ue, we.width, we.height, 0, we.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()") : Be ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, we.width, we.height, xe, Te, we.data) : t.texImage2D(i.TEXTURE_2D, X, Ue, we.width, we.height, 0, xe, Te, we.data);
        }
      else if (y.isDataArrayTexture)
        if (Be) {
          if (ft && t.texStorage3D(i.TEXTURE_2D_ARRAY, de, Ue, se.width, se.height, se.depth), U)
            if (y.layerUpdates.size > 0) {
              const X = _l(se.width, se.height, y.format, y.type);
              for (const Z of y.layerUpdates) {
                const me = se.data.subarray(
                  Z * X / se.data.BYTES_PER_ELEMENT,
                  (Z + 1) * X / se.data.BYTES_PER_ELEMENT
                );
                t.texSubImage3D(i.TEXTURE_2D_ARRAY, 0, 0, 0, Z, se.width, se.height, 1, xe, Te, me);
              }
              y.clearLayerUpdates();
            } else
              t.texSubImage3D(i.TEXTURE_2D_ARRAY, 0, 0, 0, 0, se.width, se.height, se.depth, xe, Te, se.data);
        } else
          t.texImage3D(i.TEXTURE_2D_ARRAY, 0, Ue, se.width, se.height, se.depth, 0, xe, Te, se.data);
      else if (y.isData3DTexture)
        Be ? (ft && t.texStorage3D(i.TEXTURE_3D, de, Ue, se.width, se.height, se.depth), U && t.texSubImage3D(i.TEXTURE_3D, 0, 0, 0, 0, se.width, se.height, se.depth, xe, Te, se.data)) : t.texImage3D(i.TEXTURE_3D, 0, Ue, se.width, se.height, se.depth, 0, xe, Te, se.data);
      else if (y.isFramebufferTexture) {
        if (ft)
          if (Be)
            t.texStorage2D(i.TEXTURE_2D, de, Ue, se.width, se.height);
          else {
            let X = se.width, Z = se.height;
            for (let me = 0; me < de; me++)
              t.texImage2D(i.TEXTURE_2D, me, Ue, X, Z, 0, xe, Te, null), X >>= 1, Z >>= 1;
          }
      } else if ($e.length > 0) {
        if (Be && ft) {
          const X = Pe($e[0]);
          t.texStorage2D(i.TEXTURE_2D, de, Ue, X.width, X.height);
        }
        for (let X = 0, Z = $e.length; X < Z; X++)
          we = $e[X], Be ? U && t.texSubImage2D(i.TEXTURE_2D, X, 0, 0, xe, Te, we) : t.texImage2D(i.TEXTURE_2D, X, Ue, xe, Te, we);
        y.generateMipmaps = !1;
      } else if (Be) {
        if (ft) {
          const X = Pe(se);
          t.texStorage2D(i.TEXTURE_2D, de, Ue, X.width, X.height);
        }
        U && t.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, xe, Te, se);
      } else
        t.texImage2D(i.TEXTURE_2D, 0, Ue, xe, Te, se);
      m(y) && p(Q), B.__version = $.version, y.onUpdate && y.onUpdate(y);
    }
    A.__version = y.version;
  }
  function ne(A, y, k) {
    if (y.image.length !== 6) return;
    const Q = ot(A, y), te = y.source;
    t.bindTexture(i.TEXTURE_CUBE_MAP, A.__webglTexture, i.TEXTURE0 + k);
    const $ = n.get(te);
    if (te.version !== $.__version || Q === !0) {
      t.activeTexture(i.TEXTURE0 + k);
      const B = ct.getPrimaries(ct.workingColorSpace), N = y.colorSpace === gi ? null : ct.getPrimaries(y.colorSpace), ue = y.colorSpace === gi || B === N ? i.NONE : i.BROWSER_DEFAULT_WEBGL;
      i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, y.flipY), i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL, y.premultiplyAlpha), i.pixelStorei(i.UNPACK_ALIGNMENT, y.unpackAlignment), i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL, ue);
      const tt = y.isCompressedTexture || y.image[0].isCompressedTexture, se = y.image[0] && y.image[0].isDataTexture, xe = [];
      for (let Z = 0; Z < 6; Z++)
        !tt && !se ? xe[Z] = _(y.image[Z], !0, s.maxCubemapSize) : xe[Z] = se ? y.image[Z].image : y.image[Z], xe[Z] = at(y, xe[Z]);
      const Te = xe[0], Ue = r.convert(y.format, y.colorSpace), we = r.convert(y.type), $e = b(y.internalFormat, Ue, we, y.colorSpace), Be = y.isVideoTexture !== !0, ft = $.__version === void 0 || Q === !0, U = te.dataReady;
      let de = P(y, Te);
      Ie(i.TEXTURE_CUBE_MAP, y);
      let X;
      if (tt) {
        Be && ft && t.texStorage2D(i.TEXTURE_CUBE_MAP, de, $e, Te.width, Te.height);
        for (let Z = 0; Z < 6; Z++) {
          X = xe[Z].mipmaps;
          for (let me = 0; me < X.length; me++) {
            const le = X[me];
            y.format !== yn ? Ue !== null ? Be ? U && t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me, 0, 0, le.width, le.height, Ue, le.data) : t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me, $e, le.width, le.height, 0, le.data) : console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()") : Be ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me, 0, 0, le.width, le.height, Ue, we, le.data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me, $e, le.width, le.height, 0, Ue, we, le.data);
          }
        }
      } else {
        if (X = y.mipmaps, Be && ft) {
          X.length > 0 && de++;
          const Z = Pe(xe[0]);
          t.texStorage2D(i.TEXTURE_CUBE_MAP, de, $e, Z.width, Z.height);
        }
        for (let Z = 0; Z < 6; Z++)
          if (se) {
            Be ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, 0, 0, xe[Z].width, xe[Z].height, Ue, we, xe[Z].data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, $e, xe[Z].width, xe[Z].height, 0, Ue, we, xe[Z].data);
            for (let me = 0; me < X.length; me++) {
              const ze = X[me].image[Z].image;
              Be ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me + 1, 0, 0, ze.width, ze.height, Ue, we, ze.data) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me + 1, $e, ze.width, ze.height, 0, Ue, we, ze.data);
            }
          } else {
            Be ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, 0, 0, Ue, we, xe[Z]) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, 0, $e, Ue, we, xe[Z]);
            for (let me = 0; me < X.length; me++) {
              const le = X[me];
              Be ? U && t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me + 1, 0, 0, Ue, we, le.image[Z]) : t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X + Z, me + 1, $e, Ue, we, le.image[Z]);
            }
          }
      }
      m(y) && p(i.TEXTURE_CUBE_MAP), $.__version = te.version, y.onUpdate && y.onUpdate(y);
    }
    A.__version = y.version;
  }
  function be(A, y, k, Q, te, $) {
    const B = r.convert(k.format, k.colorSpace), N = r.convert(k.type), ue = b(k.internalFormat, B, N, k.colorSpace), tt = n.get(y), se = n.get(k);
    if (se.__renderTarget = y, !tt.__hasExternalTextures) {
      const xe = Math.max(1, y.width >> $), Te = Math.max(1, y.height >> $);
      te === i.TEXTURE_3D || te === i.TEXTURE_2D_ARRAY ? t.texImage3D(te, $, ue, xe, Te, y.depth, 0, B, N, null) : t.texImage2D(te, $, ue, xe, Te, 0, B, N, null);
    }
    t.bindFramebuffer(i.FRAMEBUFFER, A), Ze(y) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, Q, te, se.__webglTexture, 0, Qe(y)) : (te === i.TEXTURE_2D || te >= i.TEXTURE_CUBE_MAP_POSITIVE_X && te <= i.TEXTURE_CUBE_MAP_NEGATIVE_Z) && i.framebufferTexture2D(i.FRAMEBUFFER, Q, te, se.__webglTexture, $), t.bindFramebuffer(i.FRAMEBUFFER, null);
  }
  function _e(A, y, k) {
    if (i.bindRenderbuffer(i.RENDERBUFFER, A), y.depthBuffer) {
      const Q = y.depthTexture, te = Q && Q.isDepthTexture ? Q.type : null, $ = v(y.stencilBuffer, te), B = y.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, N = Qe(y);
      Ze(y) ? a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER, N, $, y.width, y.height) : k ? i.renderbufferStorageMultisample(i.RENDERBUFFER, N, $, y.width, y.height) : i.renderbufferStorage(i.RENDERBUFFER, $, y.width, y.height), i.framebufferRenderbuffer(i.FRAMEBUFFER, B, i.RENDERBUFFER, A);
    } else {
      const Q = y.textures;
      for (let te = 0; te < Q.length; te++) {
        const $ = Q[te], B = r.convert($.format, $.colorSpace), N = r.convert($.type), ue = b($.internalFormat, B, N, $.colorSpace), tt = Qe(y);
        k && Ze(y) === !1 ? i.renderbufferStorageMultisample(i.RENDERBUFFER, tt, ue, y.width, y.height) : Ze(y) ? a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER, tt, ue, y.width, y.height) : i.renderbufferStorage(i.RENDERBUFFER, ue, y.width, y.height);
      }
    }
    i.bindRenderbuffer(i.RENDERBUFFER, null);
  }
  function Me(A, y) {
    if (y && y.isWebGLCubeRenderTarget) throw new Error("Depth Texture with cube render targets is not supported");
    if (t.bindFramebuffer(i.FRAMEBUFFER, A), !(y.depthTexture && y.depthTexture.isDepthTexture))
      throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");
    const Q = n.get(y.depthTexture);
    Q.__renderTarget = y, (!Q.__webglTexture || y.depthTexture.image.width !== y.width || y.depthTexture.image.height !== y.height) && (y.depthTexture.image.width = y.width, y.depthTexture.image.height = y.height, y.depthTexture.needsUpdate = !0), ee(y.depthTexture, 0);
    const te = Q.__webglTexture, $ = Qe(y);
    if (y.depthTexture.format === ps)
      Ze(y) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, i.DEPTH_ATTACHMENT, i.TEXTURE_2D, te, 0, $) : i.framebufferTexture2D(i.FRAMEBUFFER, i.DEPTH_ATTACHMENT, i.TEXTURE_2D, te, 0);
    else if (y.depthTexture.format === Ss)
      Ze(y) ? a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER, i.DEPTH_STENCIL_ATTACHMENT, i.TEXTURE_2D, te, 0, $) : i.framebufferTexture2D(i.FRAMEBUFFER, i.DEPTH_STENCIL_ATTACHMENT, i.TEXTURE_2D, te, 0);
    else
      throw new Error("Unknown depthTexture format");
  }
  function ke(A) {
    const y = n.get(A), k = A.isWebGLCubeRenderTarget === !0;
    if (y.__boundDepthTexture !== A.depthTexture) {
      const Q = A.depthTexture;
      if (y.__depthDisposeCallback && y.__depthDisposeCallback(), Q) {
        const te = () => {
          delete y.__boundDepthTexture, delete y.__depthDisposeCallback, Q.removeEventListener("dispose", te);
        };
        Q.addEventListener("dispose", te), y.__depthDisposeCallback = te;
      }
      y.__boundDepthTexture = Q;
    }
    if (A.depthTexture && !y.__autoAllocateDepthBuffer) {
      if (k) throw new Error("target.depthTexture not supported in Cube render targets");
      Me(y.__webglFramebuffer, A);
    } else if (k) {
      y.__webglDepthbuffer = [];
      for (let Q = 0; Q < 6; Q++)
        if (t.bindFramebuffer(i.FRAMEBUFFER, y.__webglFramebuffer[Q]), y.__webglDepthbuffer[Q] === void 0)
          y.__webglDepthbuffer[Q] = i.createRenderbuffer(), _e(y.__webglDepthbuffer[Q], A, !1);
        else {
          const te = A.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, $ = y.__webglDepthbuffer[Q];
          i.bindRenderbuffer(i.RENDERBUFFER, $), i.framebufferRenderbuffer(i.FRAMEBUFFER, te, i.RENDERBUFFER, $);
        }
    } else if (t.bindFramebuffer(i.FRAMEBUFFER, y.__webglFramebuffer), y.__webglDepthbuffer === void 0)
      y.__webglDepthbuffer = i.createRenderbuffer(), _e(y.__webglDepthbuffer, A, !1);
    else {
      const Q = A.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, te = y.__webglDepthbuffer;
      i.bindRenderbuffer(i.RENDERBUFFER, te), i.framebufferRenderbuffer(i.FRAMEBUFFER, Q, i.RENDERBUFFER, te);
    }
    t.bindFramebuffer(i.FRAMEBUFFER, null);
  }
  function je(A, y, k) {
    const Q = n.get(A);
    y !== void 0 && be(Q.__webglFramebuffer, A, A.texture, i.COLOR_ATTACHMENT0, i.TEXTURE_2D, 0), k !== void 0 && ke(A);
  }
  function dt(A) {
    const y = A.texture, k = n.get(A), Q = n.get(y);
    A.addEventListener("dispose", C);
    const te = A.textures, $ = A.isWebGLCubeRenderTarget === !0, B = te.length > 1;
    if (B || (Q.__webglTexture === void 0 && (Q.__webglTexture = i.createTexture()), Q.__version = y.version, o.memory.textures++), $) {
      k.__webglFramebuffer = [];
      for (let N = 0; N < 6; N++)
        if (y.mipmaps && y.mipmaps.length > 0) {
          k.__webglFramebuffer[N] = [];
          for (let ue = 0; ue < y.mipmaps.length; ue++)
            k.__webglFramebuffer[N][ue] = i.createFramebuffer();
        } else
          k.__webglFramebuffer[N] = i.createFramebuffer();
    } else {
      if (y.mipmaps && y.mipmaps.length > 0) {
        k.__webglFramebuffer = [];
        for (let N = 0; N < y.mipmaps.length; N++)
          k.__webglFramebuffer[N] = i.createFramebuffer();
      } else
        k.__webglFramebuffer = i.createFramebuffer();
      if (B)
        for (let N = 0, ue = te.length; N < ue; N++) {
          const tt = n.get(te[N]);
          tt.__webglTexture === void 0 && (tt.__webglTexture = i.createTexture(), o.memory.textures++);
        }
      if (A.samples > 0 && Ze(A) === !1) {
        k.__webglMultisampledFramebuffer = i.createFramebuffer(), k.__webglColorRenderbuffer = [], t.bindFramebuffer(i.FRAMEBUFFER, k.__webglMultisampledFramebuffer);
        for (let N = 0; N < te.length; N++) {
          const ue = te[N];
          k.__webglColorRenderbuffer[N] = i.createRenderbuffer(), i.bindRenderbuffer(i.RENDERBUFFER, k.__webglColorRenderbuffer[N]);
          const tt = r.convert(ue.format, ue.colorSpace), se = r.convert(ue.type), xe = b(ue.internalFormat, tt, se, ue.colorSpace, A.isXRRenderTarget === !0), Te = Qe(A);
          i.renderbufferStorageMultisample(i.RENDERBUFFER, Te, xe, A.width, A.height), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + N, i.RENDERBUFFER, k.__webglColorRenderbuffer[N]);
        }
        i.bindRenderbuffer(i.RENDERBUFFER, null), A.depthBuffer && (k.__webglDepthRenderbuffer = i.createRenderbuffer(), _e(k.__webglDepthRenderbuffer, A, !0)), t.bindFramebuffer(i.FRAMEBUFFER, null);
      }
    }
    if ($) {
      t.bindTexture(i.TEXTURE_CUBE_MAP, Q.__webglTexture), Ie(i.TEXTURE_CUBE_MAP, y);
      for (let N = 0; N < 6; N++)
        if (y.mipmaps && y.mipmaps.length > 0)
          for (let ue = 0; ue < y.mipmaps.length; ue++)
            be(k.__webglFramebuffer[N][ue], A, y, i.COLOR_ATTACHMENT0, i.TEXTURE_CUBE_MAP_POSITIVE_X + N, ue);
        else
          be(k.__webglFramebuffer[N], A, y, i.COLOR_ATTACHMENT0, i.TEXTURE_CUBE_MAP_POSITIVE_X + N, 0);
      m(y) && p(i.TEXTURE_CUBE_MAP), t.unbindTexture();
    } else if (B) {
      for (let N = 0, ue = te.length; N < ue; N++) {
        const tt = te[N], se = n.get(tt);
        t.bindTexture(i.TEXTURE_2D, se.__webglTexture), Ie(i.TEXTURE_2D, tt), be(k.__webglFramebuffer, A, tt, i.COLOR_ATTACHMENT0 + N, i.TEXTURE_2D, 0), m(tt) && p(i.TEXTURE_2D);
      }
      t.unbindTexture();
    } else {
      let N = i.TEXTURE_2D;
      if ((A.isWebGL3DRenderTarget || A.isWebGLArrayRenderTarget) && (N = A.isWebGL3DRenderTarget ? i.TEXTURE_3D : i.TEXTURE_2D_ARRAY), t.bindTexture(N, Q.__webglTexture), Ie(N, y), y.mipmaps && y.mipmaps.length > 0)
        for (let ue = 0; ue < y.mipmaps.length; ue++)
          be(k.__webglFramebuffer[ue], A, y, i.COLOR_ATTACHMENT0, N, ue);
      else
        be(k.__webglFramebuffer, A, y, i.COLOR_ATTACHMENT0, N, 0);
      m(y) && p(N), t.unbindTexture();
    }
    A.depthBuffer && ke(A);
  }
  function qe(A) {
    const y = A.textures;
    for (let k = 0, Q = y.length; k < Q; k++) {
      const te = y[k];
      if (m(te)) {
        const $ = x(A), B = n.get(te).__webglTexture;
        t.bindTexture($, B), p($), t.unbindTexture();
      }
    }
  }
  const Et = [], D = [];
  function qt(A) {
    if (A.samples > 0) {
      if (Ze(A) === !1) {
        const y = A.textures, k = A.width, Q = A.height;
        let te = i.COLOR_BUFFER_BIT;
        const $ = A.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT, B = n.get(A), N = y.length > 1;
        if (N)
          for (let ue = 0; ue < y.length; ue++)
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglMultisampledFramebuffer), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + ue, i.RENDERBUFFER, null), t.bindFramebuffer(i.FRAMEBUFFER, B.__webglFramebuffer), i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0 + ue, i.TEXTURE_2D, null, 0);
        t.bindFramebuffer(i.READ_FRAMEBUFFER, B.__webglMultisampledFramebuffer), t.bindFramebuffer(i.DRAW_FRAMEBUFFER, B.__webglFramebuffer);
        for (let ue = 0; ue < y.length; ue++) {
          if (A.resolveDepthBuffer && (A.depthBuffer && (te |= i.DEPTH_BUFFER_BIT), A.stencilBuffer && A.resolveStencilBuffer && (te |= i.STENCIL_BUFFER_BIT)), N) {
            i.framebufferRenderbuffer(i.READ_FRAMEBUFFER, i.COLOR_ATTACHMENT0, i.RENDERBUFFER, B.__webglColorRenderbuffer[ue]);
            const tt = n.get(y[ue]).__webglTexture;
            i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0, i.TEXTURE_2D, tt, 0);
          }
          i.blitFramebuffer(0, 0, k, Q, 0, 0, k, Q, te, i.NEAREST), c === !0 && (Et.length = 0, D.length = 0, Et.push(i.COLOR_ATTACHMENT0 + ue), A.depthBuffer && A.resolveDepthBuffer === !1 && (Et.push($), D.push($), i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER, D)), i.invalidateFramebuffer(i.READ_FRAMEBUFFER, Et));
        }
        if (t.bindFramebuffer(i.READ_FRAMEBUFFER, null), t.bindFramebuffer(i.DRAW_FRAMEBUFFER, null), N)
          for (let ue = 0; ue < y.length; ue++) {
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglMultisampledFramebuffer), i.framebufferRenderbuffer(i.FRAMEBUFFER, i.COLOR_ATTACHMENT0 + ue, i.RENDERBUFFER, B.__webglColorRenderbuffer[ue]);
            const tt = n.get(y[ue]).__webglTexture;
            t.bindFramebuffer(i.FRAMEBUFFER, B.__webglFramebuffer), i.framebufferTexture2D(i.DRAW_FRAMEBUFFER, i.COLOR_ATTACHMENT0 + ue, i.TEXTURE_2D, tt, 0);
          }
        t.bindFramebuffer(i.DRAW_FRAMEBUFFER, B.__webglMultisampledFramebuffer);
      } else if (A.depthBuffer && A.resolveDepthBuffer === !1 && c) {
        const y = A.stencilBuffer ? i.DEPTH_STENCIL_ATTACHMENT : i.DEPTH_ATTACHMENT;
        i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER, [y]);
      }
    }
  }
  function Qe(A) {
    return Math.min(s.maxSamples, A.samples);
  }
  function Ze(A) {
    const y = n.get(A);
    return A.samples > 0 && e.has("WEBGL_multisampled_render_to_texture") === !0 && y.__useRenderToTexture !== !1;
  }
  function Re(A) {
    const y = o.render.frame;
    h.get(A) !== y && (h.set(A, y), A.update());
  }
  function at(A, y) {
    const k = A.colorSpace, Q = A.format, te = A.type;
    return A.isCompressedTexture === !0 || A.isVideoTexture === !0 || k !== on && k !== gi && (ct.getTransfer(k) === yt ? (Q !== yn || te !== ii) && console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.") : console.error("THREE.WebGLTextures: Unsupported texture color space:", k)), y;
  }
  function Pe(A) {
    return typeof HTMLImageElement < "u" && A instanceof HTMLImageElement ? (l.width = A.naturalWidth || A.width, l.height = A.naturalHeight || A.height) : typeof VideoFrame < "u" && A instanceof VideoFrame ? (l.width = A.displayWidth, l.height = A.displayHeight) : (l.width = A.width, l.height = A.height), l;
  }
  this.allocateTextureUnit = V, this.resetTextureUnits = H, this.setTexture2D = ee, this.setTexture2DArray = K, this.setTexture3D = oe, this.setTextureCube = q, this.rebindTextures = je, this.setupRenderTarget = dt, this.updateRenderTargetMipmap = qe, this.updateMultisampleRenderTarget = qt, this.setupDepthRenderbuffer = ke, this.setupFrameBufferTexture = be, this.useMultisampledRTT = Ze;
}
function w_(i, e) {
  function t(n, s = gi) {
    let r;
    const o = ct.getTransfer(s);
    if (n === ii) return i.UNSIGNED_BYTE;
    if (n === $a) return i.UNSIGNED_SHORT_4_4_4_4;
    if (n === Ja) return i.UNSIGNED_SHORT_5_5_5_1;
    if (n === mh) return i.UNSIGNED_INT_5_9_9_9_REV;
    if (n === fh) return i.BYTE;
    if (n === ph) return i.SHORT;
    if (n === ir) return i.UNSIGNED_SHORT;
    if (n === Za) return i.INT;
    if (n === Fi) return i.UNSIGNED_INT;
    if (n === Rn) return i.FLOAT;
    if (n === ar) return i.HALF_FLOAT;
    if (n === gh) return i.ALPHA;
    if (n === _h) return i.RGB;
    if (n === yn) return i.RGBA;
    if (n === vh) return i.LUMINANCE;
    if (n === xh) return i.LUMINANCE_ALPHA;
    if (n === ps) return i.DEPTH_COMPONENT;
    if (n === Ss) return i.DEPTH_STENCIL;
    if (n === Qa) return i.RED;
    if (n === ec) return i.RED_INTEGER;
    if (n === yh) return i.RG;
    if (n === tc) return i.RG_INTEGER;
    if (n === nc) return i.RGBA_INTEGER;
    if (n === qr || n === Yr || n === Kr || n === jr)
      if (o === yt)
        if (r = e.get("WEBGL_compressed_texture_s3tc_srgb"), r !== null) {
          if (n === qr) return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;
          if (n === Yr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;
          if (n === Kr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;
          if (n === jr) return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT;
        } else
          return null;
      else if (r = e.get("WEBGL_compressed_texture_s3tc"), r !== null) {
        if (n === qr) return r.COMPRESSED_RGB_S3TC_DXT1_EXT;
        if (n === Yr) return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;
        if (n === Kr) return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;
        if (n === jr) return r.COMPRESSED_RGBA_S3TC_DXT5_EXT;
      } else
        return null;
    if (n === da || n === fa || n === pa || n === ma)
      if (r = e.get("WEBGL_compressed_texture_pvrtc"), r !== null) {
        if (n === da) return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
        if (n === fa) return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
        if (n === pa) return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
        if (n === ma) return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;
      } else
        return null;
    if (n === ga || n === _a || n === va)
      if (r = e.get("WEBGL_compressed_texture_etc"), r !== null) {
        if (n === ga || n === _a) return o === yt ? r.COMPRESSED_SRGB8_ETC2 : r.COMPRESSED_RGB8_ETC2;
        if (n === va) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC : r.COMPRESSED_RGBA8_ETC2_EAC;
      } else
        return null;
    if (n === xa || n === ya || n === Sa || n === ba || n === wa || n === Ea || n === Ma || n === Ta || n === Aa || n === Ra || n === Ca || n === Pa || n === Ia || n === La)
      if (r = e.get("WEBGL_compressed_texture_astc"), r !== null) {
        if (n === xa) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR : r.COMPRESSED_RGBA_ASTC_4x4_KHR;
        if (n === ya) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR : r.COMPRESSED_RGBA_ASTC_5x4_KHR;
        if (n === Sa) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR : r.COMPRESSED_RGBA_ASTC_5x5_KHR;
        if (n === ba) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR : r.COMPRESSED_RGBA_ASTC_6x5_KHR;
        if (n === wa) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR : r.COMPRESSED_RGBA_ASTC_6x6_KHR;
        if (n === Ea) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR : r.COMPRESSED_RGBA_ASTC_8x5_KHR;
        if (n === Ma) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR : r.COMPRESSED_RGBA_ASTC_8x6_KHR;
        if (n === Ta) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR : r.COMPRESSED_RGBA_ASTC_8x8_KHR;
        if (n === Aa) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR : r.COMPRESSED_RGBA_ASTC_10x5_KHR;
        if (n === Ra) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR : r.COMPRESSED_RGBA_ASTC_10x6_KHR;
        if (n === Ca) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR : r.COMPRESSED_RGBA_ASTC_10x8_KHR;
        if (n === Pa) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR : r.COMPRESSED_RGBA_ASTC_10x10_KHR;
        if (n === Ia) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR : r.COMPRESSED_RGBA_ASTC_12x10_KHR;
        if (n === La) return o === yt ? r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR : r.COMPRESSED_RGBA_ASTC_12x12_KHR;
      } else
        return null;
    if (n === Zr || n === Da || n === Na)
      if (r = e.get("EXT_texture_compression_bptc"), r !== null) {
        if (n === Zr) return o === yt ? r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT : r.COMPRESSED_RGBA_BPTC_UNORM_EXT;
        if (n === Da) return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;
        if (n === Na) return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT;
      } else
        return null;
    if (n === Sh || n === Ua || n === Fa || n === Oa)
      if (r = e.get("EXT_texture_compression_rgtc"), r !== null) {
        if (n === Zr) return r.COMPRESSED_RED_RGTC1_EXT;
        if (n === Ua) return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;
        if (n === Fa) return r.COMPRESSED_RED_GREEN_RGTC2_EXT;
        if (n === Oa) return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT;
      } else
        return null;
    return n === ys ? i.UNSIGNED_INT_24_8 : i[n] !== void 0 ? i[n] : null;
  }
  return { convert: t };
}
const E_ = { type: "move" };
class Ko {
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
      a !== null && (s = t.getPose(e.targetRaySpace, n), s === null && r !== null && (s = r), s !== null && (a.matrix.fromArray(s.transform.matrix), a.matrix.decompose(a.position, a.rotation, a.scale), a.matrixWorldNeedsUpdate = !0, s.linearVelocity ? (a.hasLinearVelocity = !0, a.linearVelocity.copy(s.linearVelocity)) : a.hasLinearVelocity = !1, s.angularVelocity ? (a.hasAngularVelocity = !0, a.angularVelocity.copy(s.angularVelocity)) : a.hasAngularVelocity = !1, this.dispatchEvent(E_)));
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
const M_ = `
void main() {

	gl_Position = vec4( position, 1.0 );

}`, T_ = `
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
class A_ {
  constructor() {
    this.texture = null, this.mesh = null, this.depthNear = 0, this.depthFar = 0;
  }
  init(e, t, n) {
    if (this.texture === null) {
      const s = new Bt(), r = e.properties.get(s);
      r.__webglTexture = t.texture, (t.depthNear !== n.depthNear || t.depthFar !== n.depthFar) && (this.depthNear = t.depthNear, this.depthFar = t.depthFar), this.texture = s;
    }
  }
  getMesh(e) {
    if (this.texture !== null && this.mesh === null) {
      const t = e.cameras[0].viewport, n = new si({
        vertexShader: M_,
        fragmentShader: T_,
        uniforms: {
          depthColor: { value: this.texture },
          depthWidth: { value: t.z },
          depthHeight: { value: t.w }
        }
      });
      this.mesh = new ae(new an(20, 20), n);
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
class R_ extends bi {
  constructor(e, t) {
    super();
    const n = this;
    let s = null, r = 1, o = null, a = "local-floor", c = 1, l = null, h = null, u = null, d = null, f = null, g = null;
    const _ = new A_(), m = t.getContextAttributes();
    let p = null, x = null;
    const b = [], v = [], P = new he();
    let T = null;
    const C = new nn();
    C.viewport = new mt();
    const I = new nn();
    I.viewport = new mt();
    const w = [C, I], S = new Uf();
    let L = null, H = null;
    this.cameraAutoUpdate = !0, this.enabled = !1, this.isPresenting = !1, this.getController = function(j) {
      let ne = b[j];
      return ne === void 0 && (ne = new Ko(), b[j] = ne), ne.getTargetRaySpace();
    }, this.getControllerGrip = function(j) {
      let ne = b[j];
      return ne === void 0 && (ne = new Ko(), b[j] = ne), ne.getGripSpace();
    }, this.getHand = function(j) {
      let ne = b[j];
      return ne === void 0 && (ne = new Ko(), b[j] = ne), ne.getHandSpace();
    };
    function V(j) {
      const ne = v.indexOf(j.inputSource);
      if (ne === -1)
        return;
      const be = b[ne];
      be !== void 0 && (be.update(j.inputSource, j.frame, l || o), be.dispatchEvent({ type: j.type, data: j.inputSource }));
    }
    function Y() {
      s.removeEventListener("select", V), s.removeEventListener("selectstart", V), s.removeEventListener("selectend", V), s.removeEventListener("squeeze", V), s.removeEventListener("squeezestart", V), s.removeEventListener("squeezeend", V), s.removeEventListener("end", Y), s.removeEventListener("inputsourceschange", ee);
      for (let j = 0; j < b.length; j++) {
        const ne = v[j];
        ne !== null && (v[j] = null, b[j].disconnect(ne));
      }
      L = null, H = null, _.reset(), e.setRenderTarget(p), f = null, d = null, u = null, s = null, x = null, ot.stop(), n.isPresenting = !1, e.setPixelRatio(T), e.setSize(P.width, P.height, !1), n.dispatchEvent({ type: "sessionend" });
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
        if (p = e.getRenderTarget(), s.addEventListener("select", V), s.addEventListener("selectstart", V), s.addEventListener("selectend", V), s.addEventListener("squeeze", V), s.addEventListener("squeezestart", V), s.addEventListener("squeezeend", V), s.addEventListener("end", Y), s.addEventListener("inputsourceschange", ee), m.xrCompatible !== !0 && await t.makeXRCompatible(), T = e.getPixelRatio(), e.getSize(P), s.enabledFeatures !== void 0 && s.enabledFeatures.includes("layers")) {
          let be = null, _e = null, Me = null;
          m.depth && (Me = m.stencil ? t.DEPTH24_STENCIL8 : t.DEPTH_COMPONENT24, be = m.stencil ? Ss : ps, _e = m.stencil ? ys : Fi);
          const ke = {
            colorFormat: t.RGBA8,
            depthFormat: Me,
            scaleFactor: r
          };
          u = new XRWebGLBinding(s, t), d = u.createProjectionLayer(ke), s.updateRenderState({ layers: [d] }), e.setPixelRatio(1), e.setSize(d.textureWidth, d.textureHeight, !1), x = new Oi(
            d.textureWidth,
            d.textureHeight,
            {
              format: yn,
              type: ii,
              depthTexture: new kh(d.textureWidth, d.textureHeight, _e, void 0, void 0, void 0, void 0, void 0, void 0, be),
              stencilBuffer: m.stencil,
              colorSpace: e.outputColorSpace,
              samples: m.antialias ? 4 : 0,
              resolveDepthBuffer: d.ignoreDepthValues === !1
            }
          );
        } else {
          const be = {
            antialias: m.antialias,
            alpha: !0,
            depth: m.depth,
            stencil: m.stencil,
            framebufferScaleFactor: r
          };
          f = new XRWebGLLayer(s, t, be), s.updateRenderState({ baseLayer: f }), e.setPixelRatio(1), e.setSize(f.framebufferWidth, f.framebufferHeight, !1), x = new Oi(
            f.framebufferWidth,
            f.framebufferHeight,
            {
              format: yn,
              type: ii,
              colorSpace: e.outputColorSpace,
              stencilBuffer: m.stencil
            }
          );
        }
        x.isXRRenderTarget = !0, this.setFoveation(c), l = null, o = await s.requestReferenceSpace(a), ot.setContext(s), ot.start(), n.isPresenting = !0, n.dispatchEvent({ type: "sessionstart" });
      }
    }, this.getEnvironmentBlendMode = function() {
      if (s !== null)
        return s.environmentBlendMode;
    }, this.getDepthTexture = function() {
      return _.getDepthTexture();
    };
    function ee(j) {
      for (let ne = 0; ne < j.removed.length; ne++) {
        const be = j.removed[ne], _e = v.indexOf(be);
        _e >= 0 && (v[_e] = null, b[_e].disconnect(be));
      }
      for (let ne = 0; ne < j.added.length; ne++) {
        const be = j.added[ne];
        let _e = v.indexOf(be);
        if (_e === -1) {
          for (let ke = 0; ke < b.length; ke++)
            if (ke >= v.length) {
              v.push(be), _e = ke;
              break;
            } else if (v[ke] === null) {
              v[ke] = be, _e = ke;
              break;
            }
          if (_e === -1) break;
        }
        const Me = b[_e];
        Me && Me.connect(be);
      }
    }
    const K = new M(), oe = new M();
    function q(j, ne, be) {
      K.setFromMatrixPosition(ne.matrixWorld), oe.setFromMatrixPosition(be.matrixWorld);
      const _e = K.distanceTo(oe), Me = ne.projectionMatrix.elements, ke = be.projectionMatrix.elements, je = Me[14] / (Me[10] - 1), dt = Me[14] / (Me[10] + 1), qe = (Me[9] + 1) / Me[5], Et = (Me[9] - 1) / Me[5], D = (Me[8] - 1) / Me[0], qt = (ke[8] + 1) / ke[0], Qe = je * D, Ze = je * qt, Re = _e / (-D + qt), at = Re * -D;
      if (ne.matrixWorld.decompose(j.position, j.quaternion, j.scale), j.translateX(at), j.translateZ(Re), j.matrixWorld.compose(j.position, j.quaternion, j.scale), j.matrixWorldInverse.copy(j.matrixWorld).invert(), Me[10] === -1)
        j.projectionMatrix.copy(ne.projectionMatrix), j.projectionMatrixInverse.copy(ne.projectionMatrixInverse);
      else {
        const Pe = je + Re, A = dt + Re, y = Qe - at, k = Ze + (_e - at), Q = qe * dt / A * Pe, te = Et * dt / A * Pe;
        j.projectionMatrix.makePerspective(y, k, Q, te, Pe, A), j.projectionMatrixInverse.copy(j.projectionMatrix).invert();
      }
    }
    function ce(j, ne) {
      ne === null ? j.matrixWorld.copy(j.matrix) : j.matrixWorld.multiplyMatrices(ne.matrixWorld, j.matrix), j.matrixWorldInverse.copy(j.matrixWorld).invert();
    }
    this.updateCamera = function(j) {
      if (s === null) return;
      let ne = j.near, be = j.far;
      _.texture !== null && (_.depthNear > 0 && (ne = _.depthNear), _.depthFar > 0 && (be = _.depthFar)), S.near = I.near = C.near = ne, S.far = I.far = C.far = be, (L !== S.near || H !== S.far) && (s.updateRenderState({
        depthNear: S.near,
        depthFar: S.far
      }), L = S.near, H = S.far), C.layers.mask = j.layers.mask | 2, I.layers.mask = j.layers.mask | 4, S.layers.mask = C.layers.mask | I.layers.mask;
      const _e = j.parent, Me = S.cameras;
      ce(S, _e);
      for (let ke = 0; ke < Me.length; ke++)
        ce(Me[ke], _e);
      Me.length === 2 ? q(S, C, I) : S.projectionMatrix.copy(C.projectionMatrix), ve(j, S, _e);
    };
    function ve(j, ne, be) {
      be === null ? j.matrix.copy(ne.matrixWorld) : (j.matrix.copy(be.matrixWorld), j.matrix.invert(), j.matrix.multiply(ne.matrixWorld)), j.matrix.decompose(j.position, j.quaternion, j.scale), j.updateMatrixWorld(!0), j.projectionMatrix.copy(ne.projectionMatrix), j.projectionMatrixInverse.copy(ne.projectionMatrixInverse), j.isPerspectiveCamera && (j.fov = bs * 2 * Math.atan(1 / j.projectionMatrix.elements[5]), j.zoom = 1);
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
    let fe = null;
    function Ie(j, ne) {
      if (h = ne.getViewerPose(l || o), g = ne, h !== null) {
        const be = h.views;
        f !== null && (e.setRenderTargetFramebuffer(x, f.framebuffer), e.setRenderTarget(x));
        let _e = !1;
        be.length !== S.cameras.length && (S.cameras.length = 0, _e = !0);
        for (let ke = 0; ke < be.length; ke++) {
          const je = be[ke];
          let dt = null;
          if (f !== null)
            dt = f.getViewport(je);
          else {
            const Et = u.getViewSubImage(d, je);
            dt = Et.viewport, ke === 0 && (e.setRenderTargetTextures(
              x,
              Et.colorTexture,
              d.ignoreDepthValues ? void 0 : Et.depthStencilTexture
            ), e.setRenderTarget(x));
          }
          let qe = w[ke];
          qe === void 0 && (qe = new nn(), qe.layers.enable(ke), qe.viewport = new mt(), w[ke] = qe), qe.matrix.fromArray(je.transform.matrix), qe.matrix.decompose(qe.position, qe.quaternion, qe.scale), qe.projectionMatrix.fromArray(je.projectionMatrix), qe.projectionMatrixInverse.copy(qe.projectionMatrix).invert(), qe.viewport.set(dt.x, dt.y, dt.width, dt.height), ke === 0 && (S.matrix.copy(qe.matrix), S.matrix.decompose(S.position, S.quaternion, S.scale)), _e === !0 && S.cameras.push(qe);
        }
        const Me = s.enabledFeatures;
        if (Me && Me.includes("depth-sensing")) {
          const ke = u.getDepthInformation(be[0]);
          ke && ke.isValid && ke.texture && _.init(e, ke, s.renderState);
        }
      }
      for (let be = 0; be < b.length; be++) {
        const _e = v[be], Me = b[be];
        _e !== null && Me !== void 0 && Me.update(_e, ne, l || o);
      }
      fe && fe(j, ne), ne.detectedPlanes && n.dispatchEvent({ type: "planesdetected", data: ne }), g = null;
    }
    const ot = new Zh();
    ot.setAnimationLoop(Ie), this.setAnimationLoop = function(j) {
      fe = j;
    }, this.dispose = function() {
    };
  }
}
const Pi = /* @__PURE__ */ new Bn(), C_ = /* @__PURE__ */ new We();
function P_(i, e) {
  function t(m, p) {
    m.matrixAutoUpdate === !0 && m.updateMatrix(), p.value.copy(m.matrix);
  }
  function n(m, p) {
    p.color.getRGB(m.fogColor.value, Lh(i)), p.isFog ? (m.fogNear.value = p.near, m.fogFar.value = p.far) : p.isFogExp2 && (m.fogDensity.value = p.density);
  }
  function s(m, p, x, b, v) {
    p.isMeshBasicMaterial || p.isMeshLambertMaterial ? r(m, p) : p.isMeshToonMaterial ? (r(m, p), u(m, p)) : p.isMeshPhongMaterial ? (r(m, p), h(m, p)) : p.isMeshStandardMaterial ? (r(m, p), d(m, p), p.isMeshPhysicalMaterial && f(m, p, v)) : p.isMeshMatcapMaterial ? (r(m, p), g(m, p)) : p.isMeshDepthMaterial ? r(m, p) : p.isMeshDistanceMaterial ? (r(m, p), _(m, p)) : p.isMeshNormalMaterial ? r(m, p) : p.isLineBasicMaterial ? (o(m, p), p.isLineDashedMaterial && a(m, p)) : p.isPointsMaterial ? c(m, p, x, b) : p.isSpriteMaterial ? l(m, p) : p.isShadowMaterial ? (m.color.value.copy(p.color), m.opacity.value = p.opacity) : p.isShaderMaterial && (p.uniformsNeedUpdate = !1);
  }
  function r(m, p) {
    m.opacity.value = p.opacity, p.color && m.diffuse.value.copy(p.color), p.emissive && m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity), p.map && (m.map.value = p.map, t(p.map, m.mapTransform)), p.alphaMap && (m.alphaMap.value = p.alphaMap, t(p.alphaMap, m.alphaMapTransform)), p.bumpMap && (m.bumpMap.value = p.bumpMap, t(p.bumpMap, m.bumpMapTransform), m.bumpScale.value = p.bumpScale, p.side === sn && (m.bumpScale.value *= -1)), p.normalMap && (m.normalMap.value = p.normalMap, t(p.normalMap, m.normalMapTransform), m.normalScale.value.copy(p.normalScale), p.side === sn && m.normalScale.value.negate()), p.displacementMap && (m.displacementMap.value = p.displacementMap, t(p.displacementMap, m.displacementMapTransform), m.displacementScale.value = p.displacementScale, m.displacementBias.value = p.displacementBias), p.emissiveMap && (m.emissiveMap.value = p.emissiveMap, t(p.emissiveMap, m.emissiveMapTransform)), p.specularMap && (m.specularMap.value = p.specularMap, t(p.specularMap, m.specularMapTransform)), p.alphaTest > 0 && (m.alphaTest.value = p.alphaTest);
    const x = e.get(p), b = x.envMap, v = x.envMapRotation;
    b && (m.envMap.value = b, Pi.copy(v), Pi.x *= -1, Pi.y *= -1, Pi.z *= -1, b.isCubeTexture && b.isRenderTargetTexture === !1 && (Pi.y *= -1, Pi.z *= -1), m.envMapRotation.value.setFromMatrix4(C_.makeRotationFromEuler(Pi)), m.flipEnvMap.value = b.isCubeTexture && b.isRenderTargetTexture === !1 ? -1 : 1, m.reflectivity.value = p.reflectivity, m.ior.value = p.ior, m.refractionRatio.value = p.refractionRatio), p.lightMap && (m.lightMap.value = p.lightMap, m.lightMapIntensity.value = p.lightMapIntensity, t(p.lightMap, m.lightMapTransform)), p.aoMap && (m.aoMap.value = p.aoMap, m.aoMapIntensity.value = p.aoMapIntensity, t(p.aoMap, m.aoMapTransform));
  }
  function o(m, p) {
    m.diffuse.value.copy(p.color), m.opacity.value = p.opacity, p.map && (m.map.value = p.map, t(p.map, m.mapTransform));
  }
  function a(m, p) {
    m.dashSize.value = p.dashSize, m.totalSize.value = p.dashSize + p.gapSize, m.scale.value = p.scale;
  }
  function c(m, p, x, b) {
    m.diffuse.value.copy(p.color), m.opacity.value = p.opacity, m.size.value = p.size * x, m.scale.value = b * 0.5, p.map && (m.map.value = p.map, t(p.map, m.uvTransform)), p.alphaMap && (m.alphaMap.value = p.alphaMap, t(p.alphaMap, m.alphaMapTransform)), p.alphaTest > 0 && (m.alphaTest.value = p.alphaTest);
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
    m.ior.value = p.ior, p.sheen > 0 && (m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen), m.sheenRoughness.value = p.sheenRoughness, p.sheenColorMap && (m.sheenColorMap.value = p.sheenColorMap, t(p.sheenColorMap, m.sheenColorMapTransform)), p.sheenRoughnessMap && (m.sheenRoughnessMap.value = p.sheenRoughnessMap, t(p.sheenRoughnessMap, m.sheenRoughnessMapTransform))), p.clearcoat > 0 && (m.clearcoat.value = p.clearcoat, m.clearcoatRoughness.value = p.clearcoatRoughness, p.clearcoatMap && (m.clearcoatMap.value = p.clearcoatMap, t(p.clearcoatMap, m.clearcoatMapTransform)), p.clearcoatRoughnessMap && (m.clearcoatRoughnessMap.value = p.clearcoatRoughnessMap, t(p.clearcoatRoughnessMap, m.clearcoatRoughnessMapTransform)), p.clearcoatNormalMap && (m.clearcoatNormalMap.value = p.clearcoatNormalMap, t(p.clearcoatNormalMap, m.clearcoatNormalMapTransform), m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale), p.side === sn && m.clearcoatNormalScale.value.negate())), p.dispersion > 0 && (m.dispersion.value = p.dispersion), p.iridescence > 0 && (m.iridescence.value = p.iridescence, m.iridescenceIOR.value = p.iridescenceIOR, m.iridescenceThicknessMinimum.value = p.iridescenceThicknessRange[0], m.iridescenceThicknessMaximum.value = p.iridescenceThicknessRange[1], p.iridescenceMap && (m.iridescenceMap.value = p.iridescenceMap, t(p.iridescenceMap, m.iridescenceMapTransform)), p.iridescenceThicknessMap && (m.iridescenceThicknessMap.value = p.iridescenceThicknessMap, t(p.iridescenceThicknessMap, m.iridescenceThicknessMapTransform))), p.transmission > 0 && (m.transmission.value = p.transmission, m.transmissionSamplerMap.value = x.texture, m.transmissionSamplerSize.value.set(x.width, x.height), p.transmissionMap && (m.transmissionMap.value = p.transmissionMap, t(p.transmissionMap, m.transmissionMapTransform)), m.thickness.value = p.thickness, p.thicknessMap && (m.thicknessMap.value = p.thicknessMap, t(p.thicknessMap, m.thicknessMapTransform)), m.attenuationDistance.value = p.attenuationDistance, m.attenuationColor.value.copy(p.attenuationColor)), p.anisotropy > 0 && (m.anisotropyVector.value.set(p.anisotropy * Math.cos(p.anisotropyRotation), p.anisotropy * Math.sin(p.anisotropyRotation)), p.anisotropyMap && (m.anisotropyMap.value = p.anisotropyMap, t(p.anisotropyMap, m.anisotropyMapTransform))), m.specularIntensity.value = p.specularIntensity, m.specularColor.value.copy(p.specularColor), p.specularColorMap && (m.specularColorMap.value = p.specularColorMap, t(p.specularColorMap, m.specularColorMapTransform)), p.specularIntensityMap && (m.specularIntensityMap.value = p.specularIntensityMap, t(p.specularIntensityMap, m.specularIntensityMapTransform));
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
function I_(i, e, t, n) {
  let s = {}, r = {}, o = [];
  const a = i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);
  function c(x, b) {
    const v = b.program;
    n.uniformBlockBinding(x, v);
  }
  function l(x, b) {
    let v = s[x.id];
    v === void 0 && (g(x), v = h(x), s[x.id] = v, x.addEventListener("dispose", m));
    const P = b.program;
    n.updateUBOMapping(x, P);
    const T = e.render.frame;
    r[x.id] !== T && (d(x), r[x.id] = T);
  }
  function h(x) {
    const b = u();
    x.__bindingPointIndex = b;
    const v = i.createBuffer(), P = x.__size, T = x.usage;
    return i.bindBuffer(i.UNIFORM_BUFFER, v), i.bufferData(i.UNIFORM_BUFFER, P, T), i.bindBuffer(i.UNIFORM_BUFFER, null), i.bindBufferBase(i.UNIFORM_BUFFER, b, v), v;
  }
  function u() {
    for (let x = 0; x < a; x++)
      if (o.indexOf(x) === -1)
        return o.push(x), x;
    return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."), 0;
  }
  function d(x) {
    const b = s[x.id], v = x.uniforms, P = x.__cache;
    i.bindBuffer(i.UNIFORM_BUFFER, b);
    for (let T = 0, C = v.length; T < C; T++) {
      const I = Array.isArray(v[T]) ? v[T] : [v[T]];
      for (let w = 0, S = I.length; w < S; w++) {
        const L = I[w];
        if (f(L, T, w, P) === !0) {
          const H = L.__offset, V = Array.isArray(L.value) ? L.value : [L.value];
          let Y = 0;
          for (let ee = 0; ee < V.length; ee++) {
            const K = V[ee], oe = _(K);
            typeof K == "number" || typeof K == "boolean" ? (L.__data[0] = K, i.bufferSubData(i.UNIFORM_BUFFER, H + Y, L.__data)) : K.isMatrix3 ? (L.__data[0] = K.elements[0], L.__data[1] = K.elements[1], L.__data[2] = K.elements[2], L.__data[3] = 0, L.__data[4] = K.elements[3], L.__data[5] = K.elements[4], L.__data[6] = K.elements[5], L.__data[7] = 0, L.__data[8] = K.elements[6], L.__data[9] = K.elements[7], L.__data[10] = K.elements[8], L.__data[11] = 0) : (K.toArray(L.__data, Y), Y += oe.storage / Float32Array.BYTES_PER_ELEMENT);
          }
          i.bufferSubData(i.UNIFORM_BUFFER, H, L.__data);
        }
      }
    }
    i.bindBuffer(i.UNIFORM_BUFFER, null);
  }
  function f(x, b, v, P) {
    const T = x.value, C = b + "_" + v;
    if (P[C] === void 0)
      return typeof T == "number" || typeof T == "boolean" ? P[C] = T : P[C] = T.clone(), !0;
    {
      const I = P[C];
      if (typeof T == "number" || typeof T == "boolean") {
        if (I !== T)
          return P[C] = T, !0;
      } else if (I.equals(T) === !1)
        return I.copy(T), !0;
    }
    return !1;
  }
  function g(x) {
    const b = x.uniforms;
    let v = 0;
    const P = 16;
    for (let C = 0, I = b.length; C < I; C++) {
      const w = Array.isArray(b[C]) ? b[C] : [b[C]];
      for (let S = 0, L = w.length; S < L; S++) {
        const H = w[S], V = Array.isArray(H.value) ? H.value : [H.value];
        for (let Y = 0, ee = V.length; Y < ee; Y++) {
          const K = V[Y], oe = _(K), q = v % P, ce = q % oe.boundary, ve = q + ce;
          v += ce, ve !== 0 && P - ve < oe.storage && (v += P - ve), H.__data = new Float32Array(oe.storage / Float32Array.BYTES_PER_ELEMENT), H.__offset = v, v += oe.storage;
        }
      }
    }
    const T = v % P;
    return T > 0 && (v += P - T), x.__size = v, x.__cache = {}, this;
  }
  function _(x) {
    const b = {
      boundary: 0,
      // bytes
      storage: 0
      // bytes
    };
    return typeof x == "number" || typeof x == "boolean" ? (b.boundary = 4, b.storage = 4) : x.isVector2 ? (b.boundary = 8, b.storage = 8) : x.isVector3 || x.isColor ? (b.boundary = 16, b.storage = 12) : x.isVector4 ? (b.boundary = 16, b.storage = 16) : x.isMatrix3 ? (b.boundary = 48, b.storage = 48) : x.isMatrix4 ? (b.boundary = 64, b.storage = 64) : x.isTexture ? console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.") : console.warn("THREE.WebGLRenderer: Unsupported uniform value type.", x), b;
  }
  function m(x) {
    const b = x.target;
    b.removeEventListener("dispose", m);
    const v = o.indexOf(b.__bindingPointIndex);
    o.splice(v, 1), i.deleteBuffer(s[b.id]), delete s[b.id], delete r[b.id];
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
class L_ {
  constructor(e = {}) {
    const {
      canvas: t = vd(),
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
    const x = [], b = [];
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
    }, this.autoClear = !0, this.autoClearColor = !0, this.autoClearDepth = !0, this.autoClearStencil = !0, this.sortObjects = !0, this.clippingPlanes = [], this.localClippingEnabled = !1, this._outputColorSpace = Ot, this.toneMapping = Si, this.toneMappingExposure = 1;
    const v = this;
    let P = !1, T = 0, C = 0, I = null, w = -1, S = null;
    const L = new mt(), H = new mt();
    let V = null;
    const Y = new Ne(0);
    let ee = 0, K = t.width, oe = t.height, q = 1, ce = null, ve = null;
    const fe = new mt(0, 0, K, oe), Ie = new mt(0, 0, K, oe);
    let ot = !1;
    const j = new ac();
    let ne = !1, be = !1;
    this.transmissionResolutionScale = 1;
    const _e = new We(), Me = new We(), ke = new M(), je = new mt(), dt = { background: null, fog: null, environment: null, overrideMaterial: null, isScene: !0 };
    let qe = !1;
    function Et() {
      return I === null ? q : 1;
    }
    let D = n;
    function qt(E, F) {
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
      if ("setAttribute" in t && t.setAttribute("data-engine", "three.js r172"), t.addEventListener("webglcontextlost", Z, !1), t.addEventListener("webglcontextrestored", me, !1), t.addEventListener("webglcontextcreationerror", le, !1), D === null) {
        const F = "webgl2";
        if (D = qt(F, E), D === null)
          throw qt(F) ? new Error("Error creating WebGL context with your selected attributes.") : new Error("Error creating WebGL context.");
      }
    } catch (E) {
      throw console.error("THREE.WebGLRenderer: " + E.message), E;
    }
    let Qe, Ze, Re, at, Pe, A, y, k, Q, te, $, B, N, ue, tt, se, xe, Te, Ue, we, $e, Be, ft, U;
    function de() {
      Qe = new H0(D), Qe.init(), Be = new w_(D, Qe), Ze = new U0(D, Qe, e, Be), Re = new S_(D, Qe), Ze.reverseDepthBuffer && d && Re.buffers.depth.setReversed(!0), at = new W0(D), Pe = new c_(), A = new b_(D, Qe, Re, Pe, Ze, Be, at), y = new O0(v), k = new z0(v), Q = new $f(D), ft = new D0(D, Q), te = new V0(D, Q, at, ft), $ = new q0(D, te, Q, at), Ue = new X0(D, Ze, A), se = new F0(Pe), B = new a_(v, y, k, Qe, Ze, ft, se), N = new P_(v, Pe), ue = new h_(), tt = new g_(Qe), Te = new L0(v, y, k, Re, $, f, c), xe = new x_(v, $, Ze), U = new I_(D, at, Ze, Re), we = new N0(D, Qe, at), $e = new G0(D, Qe, at), at.programs = B.programs, v.capabilities = Ze, v.extensions = Qe, v.properties = Pe, v.renderLists = ue, v.shadowMap = xe, v.state = Re, v.info = at;
    }
    de();
    const X = new R_(v, D);
    this.xr = X, this.getContext = function() {
      return D;
    }, this.getContextAttributes = function() {
      return D.getContextAttributes();
    }, this.forceContextLoss = function() {
      const E = Qe.get("WEBGL_lose_context");
      E && E.loseContext();
    }, this.forceContextRestore = function() {
      const E = Qe.get("WEBGL_lose_context");
      E && E.restoreContext();
    }, this.getPixelRatio = function() {
      return q;
    }, this.setPixelRatio = function(E) {
      E !== void 0 && (q = E, this.setSize(K, oe, !1));
    }, this.getSize = function(E) {
      return E.set(K, oe);
    }, this.setSize = function(E, F, z = !0) {
      if (X.isPresenting) {
        console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");
        return;
      }
      K = E, oe = F, t.width = Math.floor(E * q), t.height = Math.floor(F * q), z === !0 && (t.style.width = E + "px", t.style.height = F + "px"), this.setViewport(0, 0, E, F);
    }, this.getDrawingBufferSize = function(E) {
      return E.set(K * q, oe * q).floor();
    }, this.setDrawingBufferSize = function(E, F, z) {
      K = E, oe = F, q = z, t.width = Math.floor(E * z), t.height = Math.floor(F * z), this.setViewport(0, 0, E, F);
    }, this.getCurrentViewport = function(E) {
      return E.copy(L);
    }, this.getViewport = function(E) {
      return E.copy(fe);
    }, this.setViewport = function(E, F, z, G) {
      E.isVector4 ? fe.set(E.x, E.y, E.z, E.w) : fe.set(E, F, z, G), Re.viewport(L.copy(fe).multiplyScalar(q).round());
    }, this.getScissor = function(E) {
      return E.copy(Ie);
    }, this.setScissor = function(E, F, z, G) {
      E.isVector4 ? Ie.set(E.x, E.y, E.z, E.w) : Ie.set(E, F, z, G), Re.scissor(H.copy(Ie).multiplyScalar(q).round());
    }, this.getScissorTest = function() {
      return ot;
    }, this.setScissorTest = function(E) {
      Re.setScissorTest(ot = E);
    }, this.setOpaqueSort = function(E) {
      ce = E;
    }, this.setTransparentSort = function(E) {
      ve = E;
    }, this.getClearColor = function(E) {
      return E.copy(Te.getClearColor());
    }, this.setClearColor = function() {
      Te.setClearColor.apply(Te, arguments);
    }, this.getClearAlpha = function() {
      return Te.getClearAlpha();
    }, this.setClearAlpha = function() {
      Te.setClearAlpha.apply(Te, arguments);
    }, this.clear = function(E = !0, F = !0, z = !0) {
      let G = 0;
      if (E) {
        let O = !1;
        if (I !== null) {
          const ie = I.texture.format;
          O = ie === nc || ie === tc || ie === ec;
        }
        if (O) {
          const ie = I.texture.type, pe = ie === ii || ie === Fi || ie === ir || ie === ys || ie === $a || ie === Ja, Ee = Te.getClearColor(), Se = Te.getClearAlpha(), Fe = Ee.r, Oe = Ee.g, Le = Ee.b;
          pe ? (g[0] = Fe, g[1] = Oe, g[2] = Le, g[3] = Se, D.clearBufferuiv(D.COLOR, 0, g)) : (_[0] = Fe, _[1] = Oe, _[2] = Le, _[3] = Se, D.clearBufferiv(D.COLOR, 0, _));
        } else
          G |= D.COLOR_BUFFER_BIT;
      }
      F && (G |= D.DEPTH_BUFFER_BIT), z && (G |= D.STENCIL_BUFFER_BIT, this.state.buffers.stencil.setMask(4294967295)), D.clear(G);
    }, this.clearColor = function() {
      this.clear(!0, !1, !1);
    }, this.clearDepth = function() {
      this.clear(!1, !0, !1);
    }, this.clearStencil = function() {
      this.clear(!1, !1, !0);
    }, this.dispose = function() {
      t.removeEventListener("webglcontextlost", Z, !1), t.removeEventListener("webglcontextrestored", me, !1), t.removeEventListener("webglcontextcreationerror", le, !1), Te.dispose(), ue.dispose(), tt.dispose(), Pe.dispose(), y.dispose(), k.dispose(), $.dispose(), ft.dispose(), U.dispose(), B.dispose(), X.dispose(), X.removeEventListener("sessionstart", Fs), X.removeEventListener("sessionend", hr), Ln.stop();
    };
    function Z(E) {
      E.preventDefault(), console.log("THREE.WebGLRenderer: Context Lost."), P = !0;
    }
    function me() {
      console.log("THREE.WebGLRenderer: Context Restored."), P = !1;
      const E = at.autoReset, F = xe.enabled, z = xe.autoUpdate, G = xe.needsUpdate, O = xe.type;
      de(), at.autoReset = E, xe.enabled = F, xe.autoUpdate = z, xe.needsUpdate = G, xe.type = O;
    }
    function le(E) {
      console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ", E.statusMessage);
    }
    function ze(E) {
      const F = E.target;
      F.removeEventListener("dispose", ze), bt(F);
    }
    function bt(E) {
      Ut(E), Pe.remove(E);
    }
    function Ut(E) {
      const F = Pe.get(E).programs;
      F !== void 0 && (F.forEach(function(z) {
        B.releaseProgram(z);
      }), E.isShaderMaterial && B.releaseShaderCache(E));
    }
    this.renderBufferDirect = function(E, F, z, G, O, ie) {
      F === null && (F = dt);
      const pe = O.isMesh && O.matrixWorld.determinant() < 0, Ee = ur(E, F, z, G, O);
      Re.setMaterial(G, pe);
      let Se = z.index, Fe = 1;
      if (G.wireframe === !0) {
        if (Se = te.getWireframeAttribute(z), Se === void 0) return;
        Fe = 2;
      }
      const Oe = z.drawRange, Le = z.attributes.position;
      let it = Oe.start * Fe, ht = (Oe.start + Oe.count) * Fe;
      ie !== null && (it = Math.max(it, ie.start * Fe), ht = Math.min(ht, (ie.start + ie.count) * Fe)), Se !== null ? (it = Math.max(it, 0), ht = Math.min(ht, Se.count)) : Le != null && (it = Math.max(it, 0), ht = Math.min(ht, Le.count));
      const At = ht - it;
      if (At < 0 || At === 1 / 0) return;
      ft.setup(O, G, Ee, z, Se);
      let wt, st = we;
      if (Se !== null && (wt = Q.get(Se), st = $e, st.setIndex(wt)), O.isMesh)
        G.wireframe === !0 ? (Re.setLineWidth(G.wireframeLinewidth * Et()), st.setMode(D.LINES)) : st.setMode(D.TRIANGLES);
      else if (O.isLine) {
        let De = G.linewidth;
        De === void 0 && (De = 1), Re.setLineWidth(De * Et()), O.isLineSegments ? st.setMode(D.LINES) : O.isLineLoop ? st.setMode(D.LINE_LOOP) : st.setMode(D.LINE_STRIP);
      } else O.isPoints ? st.setMode(D.POINTS) : O.isSprite && st.setMode(D.TRIANGLES);
      if (O.isBatchedMesh)
        if (O._multiDrawInstances !== null)
          st.renderMultiDrawInstances(O._multiDrawStarts, O._multiDrawCounts, O._multiDrawCount, O._multiDrawInstances);
        else if (Qe.get("WEBGL_multi_draw"))
          st.renderMultiDraw(O._multiDrawStarts, O._multiDrawCounts, O._multiDrawCount);
        else {
          const De = O._multiDrawStarts, W = O._multiDrawCounts, J = O._multiDrawCount, Ae = Se ? Q.get(Se).bytesPerElement : 1, Ve = Pe.get(G).currentProgram.getUniforms();
          for (let Ge = 0; Ge < J; Ge++)
            Ve.setValue(D, "_gl_DrawID", Ge), st.render(De[Ge] / Ae, W[Ge]);
        }
      else if (O.isInstancedMesh)
        st.renderInstances(it, At, O.count);
      else if (z.isInstancedBufferGeometry) {
        const De = z._maxInstanceCount !== void 0 ? z._maxInstanceCount : 1 / 0, W = Math.min(z.instanceCount, De);
        st.renderInstances(it, At, W);
      } else
        st.render(it, At);
    };
    function lt(E, F, z) {
      E.transparent === !0 && E.side === Jt && E.forceSinglePass === !1 ? (E.side = sn, E.needsUpdate = !0, wi(E, F, z), E.side = ni, E.needsUpdate = !0, wi(E, F, z), E.side = Jt) : wi(E, F, z);
    }
    this.compile = function(E, F, z = null) {
      z === null && (z = E), p = tt.get(z), p.init(F), b.push(p), z.traverseVisible(function(O) {
        O.isLight && O.layers.test(F.layers) && (p.pushLight(O), O.castShadow && p.pushShadow(O));
      }), E !== z && E.traverseVisible(function(O) {
        O.isLight && O.layers.test(F.layers) && (p.pushLight(O), O.castShadow && p.pushShadow(O));
      }), p.setupLights();
      const G = /* @__PURE__ */ new Set();
      return E.traverse(function(O) {
        if (!(O.isMesh || O.isPoints || O.isLine || O.isSprite))
          return;
        const ie = O.material;
        if (ie)
          if (Array.isArray(ie))
            for (let pe = 0; pe < ie.length; pe++) {
              const Ee = ie[pe];
              lt(Ee, z, O), G.add(Ee);
            }
          else
            lt(ie, z, O), G.add(ie);
      }), b.pop(), p = null, G;
    }, this.compileAsync = function(E, F, z = null) {
      const G = this.compile(E, F, z);
      return new Promise((O) => {
        function ie() {
          if (G.forEach(function(pe) {
            Pe.get(pe).currentProgram.isReady() && G.delete(pe);
          }), G.size === 0) {
            O(E);
            return;
          }
          setTimeout(ie, 10);
        }
        Qe.get("KHR_parallel_shader_compile") !== null ? ie() : setTimeout(ie, 10);
      });
    };
    let cn = null;
    function gn(E) {
      cn && cn(E);
    }
    function Fs() {
      Ln.stop();
    }
    function hr() {
      Ln.start();
    }
    const Ln = new Zh();
    Ln.setAnimationLoop(gn), typeof self < "u" && Ln.setContext(self), this.setAnimationLoop = function(E) {
      cn = E, X.setAnimationLoop(E), E === null ? Ln.stop() : Ln.start();
    }, X.addEventListener("sessionstart", Fs), X.addEventListener("sessionend", hr), this.render = function(E, F) {
      if (F !== void 0 && F.isCamera !== !0) {
        console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");
        return;
      }
      if (P === !0) return;
      if (E.matrixWorldAutoUpdate === !0 && E.updateMatrixWorld(), F.parent === null && F.matrixWorldAutoUpdate === !0 && F.updateMatrixWorld(), X.enabled === !0 && X.isPresenting === !0 && (X.cameraAutoUpdate === !0 && X.updateCamera(F), F = X.getCamera()), E.isScene === !0 && E.onBeforeRender(v, E, F, I), p = tt.get(E, b.length), p.init(F), b.push(p), Me.multiplyMatrices(F.projectionMatrix, F.matrixWorldInverse), j.setFromProjectionMatrix(Me), be = this.localClippingEnabled, ne = se.init(this.clippingPlanes, be), m = ue.get(E, x.length), m.init(), x.push(m), X.enabled === !0 && X.isPresenting === !0) {
        const ie = v.xr.getDepthSensingMesh();
        ie !== null && ki(ie, F, -1 / 0, v.sortObjects);
      }
      ki(E, F, 0, v.sortObjects), m.finish(), v.sortObjects === !0 && m.sort(ce, ve), qe = X.enabled === !1 || X.isPresenting === !1 || X.hasDepthSensing() === !1, qe && Te.addToRenderList(m, E), this.info.render.frame++, ne === !0 && se.beginShadows();
      const z = p.state.shadowsArray;
      xe.render(z, E, F), ne === !0 && se.endShadows(), this.info.autoReset === !0 && this.info.reset();
      const G = m.opaque, O = m.transmissive;
      if (p.setupLights(), F.isArrayCamera) {
        const ie = F.cameras;
        if (O.length > 0)
          for (let pe = 0, Ee = ie.length; pe < Ee; pe++) {
            const Se = ie[pe];
            Vn(G, O, E, Se);
          }
        qe && Te.render(E);
        for (let pe = 0, Ee = ie.length; pe < Ee; pe++) {
          const Se = ie[pe];
          zi(m, E, Se, Se.viewport);
        }
      } else
        O.length > 0 && Vn(G, O, E, F), qe && Te.render(E), zi(m, E, F);
      I !== null && C === 0 && (A.updateMultisampleRenderTarget(I), A.updateRenderTargetMipmap(I)), E.isScene === !0 && E.onAfterRender(v, E, F), ft.resetDefaultState(), w = -1, S = null, b.pop(), b.length > 0 ? (p = b[b.length - 1], ne === !0 && se.setGlobalState(v.clippingPlanes, p.state.camera)) : p = null, x.pop(), x.length > 0 ? m = x[x.length - 1] : m = null;
    };
    function ki(E, F, z, G) {
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
            G && je.setFromMatrixPosition(E.matrixWorld).applyMatrix4(Me);
            const pe = $.update(E), Ee = E.material;
            Ee.visible && m.push(E, pe, Ee, z, je.z, null);
          }
        } else if ((E.isMesh || E.isLine || E.isPoints) && (!E.frustumCulled || j.intersectsObject(E))) {
          const pe = $.update(E), Ee = E.material;
          if (G && (E.boundingSphere !== void 0 ? (E.boundingSphere === null && E.computeBoundingSphere(), je.copy(E.boundingSphere.center)) : (pe.boundingSphere === null && pe.computeBoundingSphere(), je.copy(pe.boundingSphere.center)), je.applyMatrix4(E.matrixWorld).applyMatrix4(Me)), Array.isArray(Ee)) {
            const Se = pe.groups;
            for (let Fe = 0, Oe = Se.length; Fe < Oe; Fe++) {
              const Le = Se[Fe], it = Ee[Le.materialIndex];
              it && it.visible && m.push(E, pe, it, z, je.z, Le);
            }
          } else Ee.visible && m.push(E, pe, Ee, z, je.z, null);
        }
      }
      const ie = E.children;
      for (let pe = 0, Ee = ie.length; pe < Ee; pe++)
        ki(ie[pe], F, z, G);
    }
    function zi(E, F, z, G) {
      const O = E.opaque, ie = E.transmissive, pe = E.transparent;
      p.setupLightsView(z), ne === !0 && se.setGlobalState(v.clippingPlanes, z), G && Re.viewport(L.copy(G)), O.length > 0 && ri(O, F, z), ie.length > 0 && ri(ie, F, z), pe.length > 0 && ri(pe, F, z), Re.buffers.depth.setTest(!0), Re.buffers.depth.setMask(!0), Re.buffers.color.setMask(!0), Re.setPolygonOffset(!1);
    }
    function Vn(E, F, z, G) {
      if ((z.isScene === !0 ? z.overrideMaterial : null) !== null)
        return;
      p.state.transmissionRenderTarget[G.id] === void 0 && (p.state.transmissionRenderTarget[G.id] = new Oi(1, 1, {
        generateMipmaps: !0,
        type: Qe.has("EXT_color_buffer_half_float") || Qe.has("EXT_color_buffer_float") ? ar : ii,
        minFilter: Qn,
        samples: 4,
        stencilBuffer: r,
        resolveDepthBuffer: !1,
        resolveStencilBuffer: !1,
        colorSpace: ct.workingColorSpace
      }));
      const ie = p.state.transmissionRenderTarget[G.id], pe = G.viewport || L;
      ie.setSize(pe.z * v.transmissionResolutionScale, pe.w * v.transmissionResolutionScale);
      const Ee = v.getRenderTarget();
      v.setRenderTarget(ie), v.getClearColor(Y), ee = v.getClearAlpha(), ee < 1 && v.setClearColor(16777215, 0.5), v.clear(), qe && Te.render(z);
      const Se = v.toneMapping;
      v.toneMapping = Si;
      const Fe = G.viewport;
      if (G.viewport !== void 0 && (G.viewport = void 0), p.setupLightsView(G), ne === !0 && se.setGlobalState(v.clippingPlanes, G), ri(E, z, G), A.updateMultisampleRenderTarget(ie), A.updateRenderTargetMipmap(ie), Qe.has("WEBGL_multisampled_render_to_texture") === !1) {
        let Oe = !1;
        for (let Le = 0, it = F.length; Le < it; Le++) {
          const ht = F[Le], At = ht.object, wt = ht.geometry, st = ht.material, De = ht.group;
          if (st.side === Jt && At.layers.test(G.layers)) {
            const W = st.side;
            st.side = sn, st.needsUpdate = !0, oi(At, z, G, wt, st, De), st.side = W, st.needsUpdate = !0, Oe = !0;
          }
        }
        Oe === !0 && (A.updateMultisampleRenderTarget(ie), A.updateRenderTargetMipmap(ie));
      }
      v.setRenderTarget(Ee), v.setClearColor(Y, ee), Fe !== void 0 && (G.viewport = Fe), v.toneMapping = Se;
    }
    function ri(E, F, z) {
      const G = F.isScene === !0 ? F.overrideMaterial : null;
      for (let O = 0, ie = E.length; O < ie; O++) {
        const pe = E[O], Ee = pe.object, Se = pe.geometry, Fe = G === null ? pe.material : G, Oe = pe.group;
        Ee.layers.test(z.layers) && oi(Ee, F, z, Se, Fe, Oe);
      }
    }
    function oi(E, F, z, G, O, ie) {
      E.onBeforeRender(v, F, z, G, O, ie), E.modelViewMatrix.multiplyMatrices(z.matrixWorldInverse, E.matrixWorld), E.normalMatrix.getNormalMatrix(E.modelViewMatrix), O.onBeforeRender(v, F, z, G, E, ie), O.transparent === !0 && O.side === Jt && O.forceSinglePass === !1 ? (O.side = sn, O.needsUpdate = !0, v.renderBufferDirect(z, F, G, O, E, ie), O.side = ni, O.needsUpdate = !0, v.renderBufferDirect(z, F, G, O, E, ie), O.side = Jt) : v.renderBufferDirect(z, F, G, O, E, ie), E.onAfterRender(v, F, z, G, O, ie);
    }
    function wi(E, F, z) {
      F.isScene !== !0 && (F = dt);
      const G = Pe.get(E), O = p.state.lights, ie = p.state.shadowsArray, pe = O.state.version, Ee = B.getParameters(E, O.state, ie, F, z), Se = B.getProgramCacheKey(Ee);
      let Fe = G.programs;
      G.environment = E.isMeshStandardMaterial ? F.environment : null, G.fog = F.fog, G.envMap = (E.isMeshStandardMaterial ? k : y).get(E.envMap || G.environment), G.envMapRotation = G.environment !== null && E.envMap === null ? F.environmentRotation : E.envMapRotation, Fe === void 0 && (E.addEventListener("dispose", ze), Fe = /* @__PURE__ */ new Map(), G.programs = Fe);
      let Oe = Fe.get(Se);
      if (Oe !== void 0) {
        if (G.currentProgram === Oe && G.lightsStateVersion === pe)
          return Bs(E, Ee), Oe;
      } else
        Ee.uniforms = B.getUniforms(E), E.onBeforeCompile(Ee, v), Oe = B.acquireProgram(Ee, Se), Fe.set(Se, Oe), G.uniforms = Ee.uniforms;
      const Le = G.uniforms;
      return (!E.isShaderMaterial && !E.isRawShaderMaterial || E.clipping === !0) && (Le.clippingPlanes = se.uniform), Bs(E, Ee), G.needsLights = Gn(E), G.lightsStateVersion = pe, G.needsLights && (Le.ambientLightColor.value = O.state.ambient, Le.lightProbe.value = O.state.probe, Le.directionalLights.value = O.state.directional, Le.directionalLightShadows.value = O.state.directionalShadow, Le.spotLights.value = O.state.spot, Le.spotLightShadows.value = O.state.spotShadow, Le.rectAreaLights.value = O.state.rectArea, Le.ltc_1.value = O.state.rectAreaLTC1, Le.ltc_2.value = O.state.rectAreaLTC2, Le.pointLights.value = O.state.point, Le.pointLightShadows.value = O.state.pointShadow, Le.hemisphereLights.value = O.state.hemi, Le.directionalShadowMap.value = O.state.directionalShadowMap, Le.directionalShadowMatrix.value = O.state.directionalShadowMatrix, Le.spotShadowMap.value = O.state.spotShadowMap, Le.spotLightMatrix.value = O.state.spotLightMatrix, Le.spotLightMap.value = O.state.spotLightMap, Le.pointShadowMap.value = O.state.pointShadowMap, Le.pointShadowMatrix.value = O.state.pointShadowMatrix), G.currentProgram = Oe, G.uniformsList = null, Oe;
    }
    function Os(E) {
      if (E.uniformsList === null) {
        const F = E.currentProgram.getUniforms();
        E.uniformsList = $r.seqWithValue(F.seq, E.uniforms);
      }
      return E.uniformsList;
    }
    function Bs(E, F) {
      const z = Pe.get(E);
      z.outputColorSpace = F.outputColorSpace, z.batching = F.batching, z.batchingColor = F.batchingColor, z.instancing = F.instancing, z.instancingColor = F.instancingColor, z.instancingMorph = F.instancingMorph, z.skinning = F.skinning, z.morphTargets = F.morphTargets, z.morphNormals = F.morphNormals, z.morphColors = F.morphColors, z.morphTargetsCount = F.morphTargetsCount, z.numClippingPlanes = F.numClippingPlanes, z.numIntersection = F.numClipIntersection, z.vertexAlphas = F.vertexAlphas, z.vertexTangents = F.vertexTangents, z.toneMapping = F.toneMapping;
    }
    function ur(E, F, z, G, O) {
      F.isScene !== !0 && (F = dt), A.resetTextureUnits();
      const ie = F.fog, pe = G.isMeshStandardMaterial ? F.environment : null, Ee = I === null ? v.outputColorSpace : I.isXRRenderTarget === !0 ? I.texture.colorSpace : on, Se = (G.isMeshStandardMaterial ? k : y).get(G.envMap || pe), Fe = G.vertexColors === !0 && !!z.attributes.color && z.attributes.color.itemSize === 4, Oe = !!z.attributes.tangent && (!!G.normalMap || G.anisotropy > 0), Le = !!z.morphAttributes.position, it = !!z.morphAttributes.normal, ht = !!z.morphAttributes.color;
      let At = Si;
      G.toneMapped && (I === null || I.isXRRenderTarget === !0) && (At = v.toneMapping);
      const wt = z.morphAttributes.position || z.morphAttributes.normal || z.morphAttributes.color, st = wt !== void 0 ? wt.length : 0, De = Pe.get(G), W = p.state.lights;
      if (ne === !0 && (be === !0 || E !== S)) {
        const Xe = E === S && G.id === w;
        se.setState(G, E, Xe);
      }
      let J = !1;
      G.version === De.__version ? (De.needsLights && De.lightsStateVersion !== W.state.version || De.outputColorSpace !== Ee || O.isBatchedMesh && De.batching === !1 || !O.isBatchedMesh && De.batching === !0 || O.isBatchedMesh && De.batchingColor === !0 && O.colorTexture === null || O.isBatchedMesh && De.batchingColor === !1 && O.colorTexture !== null || O.isInstancedMesh && De.instancing === !1 || !O.isInstancedMesh && De.instancing === !0 || O.isSkinnedMesh && De.skinning === !1 || !O.isSkinnedMesh && De.skinning === !0 || O.isInstancedMesh && De.instancingColor === !0 && O.instanceColor === null || O.isInstancedMesh && De.instancingColor === !1 && O.instanceColor !== null || O.isInstancedMesh && De.instancingMorph === !0 && O.morphTexture === null || O.isInstancedMesh && De.instancingMorph === !1 && O.morphTexture !== null || De.envMap !== Se || G.fog === !0 && De.fog !== ie || De.numClippingPlanes !== void 0 && (De.numClippingPlanes !== se.numPlanes || De.numIntersection !== se.numIntersection) || De.vertexAlphas !== Fe || De.vertexTangents !== Oe || De.morphTargets !== Le || De.morphNormals !== it || De.morphColors !== ht || De.toneMapping !== At || De.morphTargetsCount !== st) && (J = !0) : (J = !0, De.__version = G.version);
      let Ae = De.currentProgram;
      J === !0 && (Ae = wi(G, F, O));
      let Ve = !1, Ge = !1, Lt = !1;
      const He = Ae.getUniforms(), et = De.uniforms;
      if (Re.useProgram(Ae.program) && (Ve = !0, Ge = !0, Lt = !0), G.id !== w && (w = G.id, Ge = !0), Ve || S !== E) {
        Re.buffers.depth.getReversed() ? (_e.copy(E.projectionMatrix), yd(_e), Sd(_e), He.setValue(D, "projectionMatrix", _e)) : He.setValue(D, "projectionMatrix", E.projectionMatrix), He.setValue(D, "viewMatrix", E.matrixWorldInverse);
        const pt = He.map.cameraPosition;
        pt !== void 0 && pt.setValue(D, ke.setFromMatrixPosition(E.matrixWorld)), Ze.logarithmicDepthBuffer && He.setValue(
          D,
          "logDepthBufFC",
          2 / (Math.log(E.far + 1) / Math.LN2)
        ), (G.isMeshPhongMaterial || G.isMeshToonMaterial || G.isMeshLambertMaterial || G.isMeshBasicMaterial || G.isMeshStandardMaterial || G.isShaderMaterial) && He.setValue(D, "isOrthographic", E.isOrthographicCamera === !0), S !== E && (S = E, Ge = !0, Lt = !0);
      }
      if (O.isSkinnedMesh) {
        He.setOptional(D, O, "bindMatrix"), He.setOptional(D, O, "bindMatrixInverse");
        const Xe = O.skeleton;
        Xe && (Xe.boneTexture === null && Xe.computeBoneTexture(), He.setValue(D, "boneTexture", Xe.boneTexture, A));
      }
      O.isBatchedMesh && (He.setOptional(D, O, "batchingTexture"), He.setValue(D, "batchingTexture", O._matricesTexture, A), He.setOptional(D, O, "batchingIdTexture"), He.setValue(D, "batchingIdTexture", O._indirectTexture, A), He.setOptional(D, O, "batchingColorTexture"), O._colorsTexture !== null && He.setValue(D, "batchingColorTexture", O._colorsTexture, A));
      const Ce = z.morphAttributes;
      if ((Ce.position !== void 0 || Ce.normal !== void 0 || Ce.color !== void 0) && Ue.update(O, z, Ae), (Ge || De.receiveShadow !== O.receiveShadow) && (De.receiveShadow = O.receiveShadow, He.setValue(D, "receiveShadow", O.receiveShadow)), G.isMeshGouraudMaterial && G.envMap !== null && (et.envMap.value = Se, et.flipEnvMap.value = Se.isCubeTexture && Se.isRenderTargetTexture === !1 ? -1 : 1), G.isMeshStandardMaterial && G.envMap === null && F.environment !== null && (et.envMapIntensity.value = F.environmentIntensity), Ge && (He.setValue(D, "toneMappingExposure", v.toneMappingExposure), De.needsLights && ai(et, Lt), ie && G.fog === !0 && N.refreshFogUniforms(et, ie), N.refreshMaterialUniforms(et, G, q, oe, p.state.transmissionRenderTarget[E.id]), $r.upload(D, Os(De), et, A)), G.isShaderMaterial && G.uniformsNeedUpdate === !0 && ($r.upload(D, Os(De), et, A), G.uniformsNeedUpdate = !1), G.isSpriteMaterial && He.setValue(D, "center", O.center), He.setValue(D, "modelViewMatrix", O.modelViewMatrix), He.setValue(D, "normalMatrix", O.normalMatrix), He.setValue(D, "modelMatrix", O.matrixWorld), G.isShaderMaterial || G.isRawShaderMaterial) {
        const Xe = G.uniformsGroups;
        for (let pt = 0, Rt = Xe.length; pt < Rt; pt++) {
          const Ct = Xe[pt];
          U.update(Ct, Ae), U.bind(Ct, Ae);
        }
      }
      return Ae;
    }
    function ai(E, F) {
      E.ambientLightColor.needsUpdate = F, E.lightProbe.needsUpdate = F, E.directionalLights.needsUpdate = F, E.directionalLightShadows.needsUpdate = F, E.pointLights.needsUpdate = F, E.pointLightShadows.needsUpdate = F, E.spotLights.needsUpdate = F, E.spotLightShadows.needsUpdate = F, E.rectAreaLights.needsUpdate = F, E.hemisphereLights.needsUpdate = F;
    }
    function Gn(E) {
      return E.isMeshLambertMaterial || E.isMeshToonMaterial || E.isMeshPhongMaterial || E.isMeshStandardMaterial || E.isShadowMaterial || E.isShaderMaterial && E.lights === !0;
    }
    this.getActiveCubeFace = function() {
      return T;
    }, this.getActiveMipmapLevel = function() {
      return C;
    }, this.getRenderTarget = function() {
      return I;
    }, this.setRenderTargetTextures = function(E, F, z) {
      Pe.get(E.texture).__webglTexture = F, Pe.get(E.depthTexture).__webglTexture = z;
      const G = Pe.get(E);
      G.__hasExternalTextures = !0, G.__autoAllocateDepthBuffer = z === void 0, G.__autoAllocateDepthBuffer || Qe.has("WEBGL_multisampled_render_to_texture") === !0 && (console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"), G.__useRenderToTexture = !1);
    }, this.setRenderTargetFramebuffer = function(E, F) {
      const z = Pe.get(E);
      z.__webglFramebuffer = F, z.__useDefaultFramebuffer = F === void 0;
    };
    const _n = D.createFramebuffer();
    this.setRenderTarget = function(E, F = 0, z = 0) {
      I = E, T = F, C = z;
      let G = !0, O = null, ie = !1, pe = !1;
      if (E) {
        const Se = Pe.get(E);
        if (Se.__useDefaultFramebuffer !== void 0)
          Re.bindFramebuffer(D.FRAMEBUFFER, null), G = !1;
        else if (Se.__webglFramebuffer === void 0)
          A.setupRenderTarget(E);
        else if (Se.__hasExternalTextures)
          A.rebindTextures(E, Pe.get(E.texture).__webglTexture, Pe.get(E.depthTexture).__webglTexture);
        else if (E.depthBuffer) {
          const Le = E.depthTexture;
          if (Se.__boundDepthTexture !== Le) {
            if (Le !== null && Pe.has(Le) && (E.width !== Le.image.width || E.height !== Le.image.height))
              throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");
            A.setupDepthRenderbuffer(E);
          }
        }
        const Fe = E.texture;
        (Fe.isData3DTexture || Fe.isDataArrayTexture || Fe.isCompressedArrayTexture) && (pe = !0);
        const Oe = Pe.get(E).__webglFramebuffer;
        E.isWebGLCubeRenderTarget ? (Array.isArray(Oe[F]) ? O = Oe[F][z] : O = Oe[F], ie = !0) : E.samples > 0 && A.useMultisampledRTT(E) === !1 ? O = Pe.get(E).__webglMultisampledFramebuffer : Array.isArray(Oe) ? O = Oe[z] : O = Oe, L.copy(E.viewport), H.copy(E.scissor), V = E.scissorTest;
      } else
        L.copy(fe).multiplyScalar(q).floor(), H.copy(Ie).multiplyScalar(q).floor(), V = ot;
      if (z !== 0 && (O = _n), Re.bindFramebuffer(D.FRAMEBUFFER, O) && G && Re.drawBuffers(E, O), Re.viewport(L), Re.scissor(H), Re.setScissorTest(V), ie) {
        const Se = Pe.get(E.texture);
        D.framebufferTexture2D(D.FRAMEBUFFER, D.COLOR_ATTACHMENT0, D.TEXTURE_CUBE_MAP_POSITIVE_X + F, Se.__webglTexture, z);
      } else if (pe) {
        const Se = Pe.get(E.texture), Fe = F;
        D.framebufferTextureLayer(D.FRAMEBUFFER, D.COLOR_ATTACHMENT0, Se.__webglTexture, z, Fe);
      } else if (E !== null && z !== 0) {
        const Se = Pe.get(E.texture);
        D.framebufferTexture2D(D.FRAMEBUFFER, D.COLOR_ATTACHMENT0, D.TEXTURE_2D, Se.__webglTexture, z);
      }
      w = -1;
    }, this.readRenderTargetPixels = function(E, F, z, G, O, ie, pe) {
      if (!(E && E.isWebGLRenderTarget)) {
        console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
        return;
      }
      let Ee = Pe.get(E).__webglFramebuffer;
      if (E.isWebGLCubeRenderTarget && pe !== void 0 && (Ee = Ee[pe]), Ee) {
        Re.bindFramebuffer(D.FRAMEBUFFER, Ee);
        try {
          const Se = E.texture, Fe = Se.format, Oe = Se.type;
          if (!Ze.textureFormatReadable(Fe)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");
            return;
          }
          if (!Ze.textureTypeReadable(Oe)) {
            console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");
            return;
          }
          F >= 0 && F <= E.width - G && z >= 0 && z <= E.height - O && D.readPixels(F, z, G, O, Be.convert(Fe), Be.convert(Oe), ie);
        } finally {
          const Se = I !== null ? Pe.get(I).__webglFramebuffer : null;
          Re.bindFramebuffer(D.FRAMEBUFFER, Se);
        }
      }
    }, this.readRenderTargetPixelsAsync = async function(E, F, z, G, O, ie, pe) {
      if (!(E && E.isWebGLRenderTarget))
        throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");
      let Ee = Pe.get(E).__webglFramebuffer;
      if (E.isWebGLCubeRenderTarget && pe !== void 0 && (Ee = Ee[pe]), Ee) {
        const Se = E.texture, Fe = Se.format, Oe = Se.type;
        if (!Ze.textureFormatReadable(Fe))
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");
        if (!Ze.textureTypeReadable(Oe))
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");
        if (F >= 0 && F <= E.width - G && z >= 0 && z <= E.height - O) {
          Re.bindFramebuffer(D.FRAMEBUFFER, Ee);
          const Le = D.createBuffer();
          D.bindBuffer(D.PIXEL_PACK_BUFFER, Le), D.bufferData(D.PIXEL_PACK_BUFFER, ie.byteLength, D.STREAM_READ), D.readPixels(F, z, G, O, Be.convert(Fe), Be.convert(Oe), 0);
          const it = I !== null ? Pe.get(I).__webglFramebuffer : null;
          Re.bindFramebuffer(D.FRAMEBUFFER, it);
          const ht = D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE, 0);
          return D.flush(), await xd(D, ht, 4), D.bindBuffer(D.PIXEL_PACK_BUFFER, Le), D.getBufferSubData(D.PIXEL_PACK_BUFFER, 0, ie), D.deleteBuffer(Le), D.deleteSync(ht), ie;
        } else
          throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.");
      }
    }, this.copyFramebufferToTexture = function(E, F = null, z = 0) {
      E.isTexture !== !0 && (rs("WebGLRenderer: copyFramebufferToTexture function signature has changed."), F = arguments[0] || null, E = arguments[1]);
      const G = Math.pow(2, -z), O = Math.floor(E.image.width * G), ie = Math.floor(E.image.height * G), pe = F !== null ? F.x : 0, Ee = F !== null ? F.y : 0;
      A.setTexture2D(E, 0), D.copyTexSubImage2D(D.TEXTURE_2D, z, 0, 0, pe, Ee, O, ie), Re.unbindTexture();
    };
    const Dn = D.createFramebuffer(), Ei = D.createFramebuffer();
    this.copyTextureToTexture = function(E, F, z = null, G = null, O = 0, ie = null) {
      E.isTexture !== !0 && (rs("WebGLRenderer: copyTextureToTexture function signature has changed."), G = arguments[0] || null, E = arguments[1], F = arguments[2], ie = arguments[3] || 0, z = null), ie === null && (O !== 0 ? (rs("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."), ie = O, O = 0) : ie = 0);
      let pe, Ee, Se, Fe, Oe, Le, it, ht, At;
      const wt = E.isCompressedTexture ? E.mipmaps[ie] : E.image;
      if (z !== null)
        pe = z.max.x - z.min.x, Ee = z.max.y - z.min.y, Se = z.isBox3 ? z.max.z - z.min.z : 1, Fe = z.min.x, Oe = z.min.y, Le = z.isBox3 ? z.min.z : 0;
      else {
        const Ce = Math.pow(2, -O);
        pe = Math.floor(wt.width * Ce), Ee = Math.floor(wt.height * Ce), E.isDataArrayTexture ? Se = wt.depth : E.isData3DTexture ? Se = Math.floor(wt.depth * Ce) : Se = 1, Fe = 0, Oe = 0, Le = 0;
      }
      G !== null ? (it = G.x, ht = G.y, At = G.z) : (it = 0, ht = 0, At = 0);
      const st = Be.convert(F.format), De = Be.convert(F.type);
      let W;
      F.isData3DTexture ? (A.setTexture3D(F, 0), W = D.TEXTURE_3D) : F.isDataArrayTexture || F.isCompressedArrayTexture ? (A.setTexture2DArray(F, 0), W = D.TEXTURE_2D_ARRAY) : (A.setTexture2D(F, 0), W = D.TEXTURE_2D), D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL, F.flipY), D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL, F.premultiplyAlpha), D.pixelStorei(D.UNPACK_ALIGNMENT, F.unpackAlignment);
      const J = D.getParameter(D.UNPACK_ROW_LENGTH), Ae = D.getParameter(D.UNPACK_IMAGE_HEIGHT), Ve = D.getParameter(D.UNPACK_SKIP_PIXELS), Ge = D.getParameter(D.UNPACK_SKIP_ROWS), Lt = D.getParameter(D.UNPACK_SKIP_IMAGES);
      D.pixelStorei(D.UNPACK_ROW_LENGTH, wt.width), D.pixelStorei(D.UNPACK_IMAGE_HEIGHT, wt.height), D.pixelStorei(D.UNPACK_SKIP_PIXELS, Fe), D.pixelStorei(D.UNPACK_SKIP_ROWS, Oe), D.pixelStorei(D.UNPACK_SKIP_IMAGES, Le);
      const He = E.isDataArrayTexture || E.isData3DTexture, et = F.isDataArrayTexture || F.isData3DTexture;
      if (E.isDepthTexture) {
        const Ce = Pe.get(E), Xe = Pe.get(F), pt = Pe.get(Ce.__renderTarget), Rt = Pe.get(Xe.__renderTarget);
        Re.bindFramebuffer(D.READ_FRAMEBUFFER, pt.__webglFramebuffer), Re.bindFramebuffer(D.DRAW_FRAMEBUFFER, Rt.__webglFramebuffer);
        for (let Ct = 0; Ct < Se; Ct++)
          He && (D.framebufferTextureLayer(D.READ_FRAMEBUFFER, D.COLOR_ATTACHMENT0, Pe.get(E).__webglTexture, O, Le + Ct), D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER, D.COLOR_ATTACHMENT0, Pe.get(F).__webglTexture, ie, At + Ct)), D.blitFramebuffer(Fe, Oe, pe, Ee, it, ht, pe, Ee, D.DEPTH_BUFFER_BIT, D.NEAREST);
        Re.bindFramebuffer(D.READ_FRAMEBUFFER, null), Re.bindFramebuffer(D.DRAW_FRAMEBUFFER, null);
      } else if (O !== 0 || E.isRenderTargetTexture || Pe.has(E)) {
        const Ce = Pe.get(E), Xe = Pe.get(F);
        Re.bindFramebuffer(D.READ_FRAMEBUFFER, Dn), Re.bindFramebuffer(D.DRAW_FRAMEBUFFER, Ei);
        for (let pt = 0; pt < Se; pt++)
          He ? D.framebufferTextureLayer(D.READ_FRAMEBUFFER, D.COLOR_ATTACHMENT0, Ce.__webglTexture, O, Le + pt) : D.framebufferTexture2D(D.READ_FRAMEBUFFER, D.COLOR_ATTACHMENT0, D.TEXTURE_2D, Ce.__webglTexture, O), et ? D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER, D.COLOR_ATTACHMENT0, Xe.__webglTexture, ie, At + pt) : D.framebufferTexture2D(D.DRAW_FRAMEBUFFER, D.COLOR_ATTACHMENT0, D.TEXTURE_2D, Xe.__webglTexture, ie), O !== 0 ? D.blitFramebuffer(Fe, Oe, pe, Ee, it, ht, pe, Ee, D.COLOR_BUFFER_BIT, D.NEAREST) : et ? D.copyTexSubImage3D(W, ie, it, ht, At + pt, Fe, Oe, pe, Ee) : D.copyTexSubImage2D(W, ie, it, ht, Fe, Oe, pe, Ee);
        Re.bindFramebuffer(D.READ_FRAMEBUFFER, null), Re.bindFramebuffer(D.DRAW_FRAMEBUFFER, null);
      } else
        et ? E.isDataTexture || E.isData3DTexture ? D.texSubImage3D(W, ie, it, ht, At, pe, Ee, Se, st, De, wt.data) : F.isCompressedArrayTexture ? D.compressedTexSubImage3D(W, ie, it, ht, At, pe, Ee, Se, st, wt.data) : D.texSubImage3D(W, ie, it, ht, At, pe, Ee, Se, st, De, wt) : E.isDataTexture ? D.texSubImage2D(D.TEXTURE_2D, ie, it, ht, pe, Ee, st, De, wt.data) : E.isCompressedTexture ? D.compressedTexSubImage2D(D.TEXTURE_2D, ie, it, ht, wt.width, wt.height, st, wt.data) : D.texSubImage2D(D.TEXTURE_2D, ie, it, ht, pe, Ee, st, De, wt);
      D.pixelStorei(D.UNPACK_ROW_LENGTH, J), D.pixelStorei(D.UNPACK_IMAGE_HEIGHT, Ae), D.pixelStorei(D.UNPACK_SKIP_PIXELS, Ve), D.pixelStorei(D.UNPACK_SKIP_ROWS, Ge), D.pixelStorei(D.UNPACK_SKIP_IMAGES, Lt), ie === 0 && F.generateMipmaps && D.generateMipmap(W), Re.unbindTexture();
    }, this.copyTextureToTexture3D = function(E, F, z = null, G = null, O = 0) {
      return E.isTexture !== !0 && (rs("WebGLRenderer: copyTextureToTexture3D function signature has changed."), z = arguments[0] || null, G = arguments[1] || null, E = arguments[2], F = arguments[3], O = arguments[4] || 0), rs('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'), this.copyTextureToTexture(E, F, z, G, O);
    }, this.initRenderTarget = function(E) {
      Pe.get(E).__webglFramebuffer === void 0 && A.setupRenderTarget(E);
    }, this.initTexture = function(E) {
      E.isCubeTexture ? A.setTextureCube(E, 0) : E.isData3DTexture ? A.setTexture3D(E, 0) : E.isDataArrayTexture || E.isCompressedArrayTexture ? A.setTexture2DArray(E, 0) : A.setTexture2D(E, 0), Re.unbindTexture();
    }, this.resetState = function() {
      T = 0, C = 0, I = null, Re.reset(), ft.reset();
    }, typeof __THREE_DEVTOOLS__ < "u" && __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
  }
  get coordinateSystem() {
    return ei;
  }
  get outputColorSpace() {
    return this._outputColorSpace;
  }
  set outputColorSpace(e) {
    this._outputColorSpace = e;
    const t = this.getContext();
    t.drawingBufferColorspace = ct._getDrawingBufferColorSpace(e), t.unpackColorSpace = ct._getUnpackColorSpace();
  }
}
const Vl = { type: "change" }, bc = { type: "start" }, tu = { type: "end" }, zr = new cr(), Gl = new mi(), D_ = Math.cos(70 * ls.DEG2RAD), Ft = new M(), ln = 2 * Math.PI, St = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6
}, jo = 1e-6;
class N_ extends jf {
  constructor(e, t = null) {
    super(e, t), this.state = St.NONE, this.enabled = !0, this.target = new M(), this.cursor = new M(), this.minDistance = 0, this.maxDistance = 1 / 0, this.minZoom = 0, this.maxZoom = 1 / 0, this.minTargetRadius = 0, this.maxTargetRadius = 1 / 0, this.minPolarAngle = 0, this.maxPolarAngle = Math.PI, this.minAzimuthAngle = -1 / 0, this.maxAzimuthAngle = 1 / 0, this.enableDamping = !1, this.dampingFactor = 0.05, this.enableZoom = !0, this.zoomSpeed = 1, this.enableRotate = !0, this.rotateSpeed = 1, this.keyRotateSpeed = 1, this.enablePan = !0, this.panSpeed = 1, this.screenSpacePanning = !0, this.keyPanSpeed = 7, this.zoomToCursor = !1, this.autoRotate = !1, this.autoRotateSpeed = 2, this.keys = { LEFT: "ArrowLeft", UP: "ArrowUp", RIGHT: "ArrowRight", BOTTOM: "ArrowDown" }, this.mouseButtons = { LEFT: ds.ROTATE, MIDDLE: ds.DOLLY, RIGHT: ds.PAN }, this.touches = { ONE: os.ROTATE, TWO: os.DOLLY_PAN }, this.target0 = this.target.clone(), this.position0 = this.object.position.clone(), this.zoom0 = this.object.zoom, this._domElementKeyEvents = null, this._lastPosition = new M(), this._lastQuaternion = new mn(), this._lastTargetPosition = new M(), this._quat = new mn().setFromUnitVectors(e.up, new M(0, 1, 0)), this._quatInverse = this._quat.clone().invert(), this._spherical = new gl(), this._sphericalDelta = new gl(), this._scale = 1, this._panOffset = new M(), this._rotateStart = new he(), this._rotateEnd = new he(), this._rotateDelta = new he(), this._panStart = new he(), this._panEnd = new he(), this._panDelta = new he(), this._dollyStart = new he(), this._dollyEnd = new he(), this._dollyDelta = new he(), this._dollyDirection = new M(), this._mouse = new he(), this._performCursorZoom = !1, this._pointers = [], this._pointerPositions = {}, this._controlActive = !1, this._onPointerMove = F_.bind(this), this._onPointerDown = U_.bind(this), this._onPointerUp = O_.bind(this), this._onContextMenu = W_.bind(this), this._onMouseWheel = z_.bind(this), this._onKeyDown = H_.bind(this), this._onTouchStart = V_.bind(this), this._onTouchMove = G_.bind(this), this._onMouseDown = B_.bind(this), this._onMouseMove = k_.bind(this), this._interceptControlDown = X_.bind(this), this._interceptControlUp = q_.bind(this), this.domElement !== null && this.connect(), this.update();
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
    this.target.copy(this.target0), this.object.position.copy(this.position0), this.object.zoom = this.zoom0, this.object.updateProjectionMatrix(), this.dispatchEvent(Vl), this.update(), this.state = St.NONE;
  }
  update(e = null) {
    const t = this.object.position;
    Ft.copy(t).sub(this.target), Ft.applyQuaternion(this._quat), this._spherical.setFromVector3(Ft), this.autoRotate && this.state === St.NONE && this._rotateLeft(this._getAutoRotationAngle(e)), this.enableDamping ? (this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor, this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor) : (this._spherical.theta += this._sphericalDelta.theta, this._spherical.phi += this._sphericalDelta.phi);
    let n = this.minAzimuthAngle, s = this.maxAzimuthAngle;
    isFinite(n) && isFinite(s) && (n < -Math.PI ? n += ln : n > Math.PI && (n -= ln), s < -Math.PI ? s += ln : s > Math.PI && (s -= ln), n <= s ? this._spherical.theta = Math.max(n, Math.min(s, this._spherical.theta)) : this._spherical.theta = this._spherical.theta > (n + s) / 2 ? Math.max(n, this._spherical.theta) : Math.min(s, this._spherical.theta)), this._spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this._spherical.phi)), this._spherical.makeSafe(), this.enableDamping === !0 ? this.target.addScaledVector(this._panOffset, this.dampingFactor) : this.target.add(this._panOffset), this.target.sub(this.cursor), this.target.clampLength(this.minTargetRadius, this.maxTargetRadius), this.target.add(this.cursor);
    let r = !1;
    if (this.zoomToCursor && this._performCursorZoom || this.object.isOrthographicCamera)
      this._spherical.radius = this._clampDistance(this._spherical.radius);
    else {
      const o = this._spherical.radius;
      this._spherical.radius = this._clampDistance(this._spherical.radius * this._scale), r = o != this._spherical.radius;
    }
    if (Ft.setFromSpherical(this._spherical), Ft.applyQuaternion(this._quatInverse), t.copy(this.target).add(Ft), this.object.lookAt(this.target), this.enableDamping === !0 ? (this._sphericalDelta.theta *= 1 - this.dampingFactor, this._sphericalDelta.phi *= 1 - this.dampingFactor, this._panOffset.multiplyScalar(1 - this.dampingFactor)) : (this._sphericalDelta.set(0, 0, 0), this._panOffset.set(0, 0, 0)), this.zoomToCursor && this._performCursorZoom) {
      let o = null;
      if (this.object.isPerspectiveCamera) {
        const a = Ft.length();
        o = this._clampDistance(a * this._scale);
        const c = a - o;
        this.object.position.addScaledVector(this._dollyDirection, c), this.object.updateMatrixWorld(), r = !!c;
      } else if (this.object.isOrthographicCamera) {
        const a = new M(this._mouse.x, this._mouse.y, 0);
        a.unproject(this.object);
        const c = this.object.zoom;
        this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), this.object.updateProjectionMatrix(), r = c !== this.object.zoom;
        const l = new M(this._mouse.x, this._mouse.y, 0);
        l.unproject(this.object), this.object.position.sub(l).add(a), this.object.updateMatrixWorld(), o = Ft.length();
      } else
        console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."), this.zoomToCursor = !1;
      o !== null && (this.screenSpacePanning ? this.target.set(0, 0, -1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position) : (zr.origin.copy(this.object.position), zr.direction.set(0, 0, -1).transformDirection(this.object.matrix), Math.abs(this.object.up.dot(zr.direction)) < D_ ? this.object.lookAt(this.target) : (Gl.setFromNormalAndCoplanarPoint(this.object.up, this.target), zr.intersectPlane(Gl, this.target))));
    } else if (this.object.isOrthographicCamera) {
      const o = this.object.zoom;
      this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / this._scale)), o !== this.object.zoom && (this.object.updateProjectionMatrix(), r = !0);
    }
    return this._scale = 1, this._performCursorZoom = !1, r || this._lastPosition.distanceToSquared(this.object.position) > jo || 8 * (1 - this._lastQuaternion.dot(this.object.quaternion)) > jo || this._lastTargetPosition.distanceToSquared(this.target) > jo ? (this.dispatchEvent(Vl), this._lastPosition.copy(this.object.position), this._lastQuaternion.copy(this.object.quaternion), this._lastTargetPosition.copy(this.target), !0) : !1;
  }
  _getAutoRotationAngle(e) {
    return e !== null ? ln / 60 * this.autoRotateSpeed * e : ln / 60 / 60 * this.autoRotateSpeed;
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
    Ft.setFromMatrixColumn(t, 0), Ft.multiplyScalar(-e), this._panOffset.add(Ft);
  }
  _panUp(e, t) {
    this.screenSpacePanning === !0 ? Ft.setFromMatrixColumn(t, 1) : (Ft.setFromMatrixColumn(t, 0), Ft.crossVectors(this.object.up, Ft)), Ft.multiplyScalar(e), this._panOffset.add(Ft);
  }
  // deltaX and deltaY are in pixels; right and down are positive
  _pan(e, t) {
    const n = this.domElement;
    if (this.object.isPerspectiveCamera) {
      const s = this.object.position;
      Ft.copy(s).sub(this.target);
      let r = Ft.length();
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
    this._rotateLeft(ln * this._rotateDelta.x / t.clientHeight), this._rotateUp(ln * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd), this.update();
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
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(ln * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, this.keyPanSpeed), t = !0;
        break;
      case this.keys.BOTTOM:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateUp(-ln * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(0, -this.keyPanSpeed), t = !0;
        break;
      case this.keys.LEFT:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(ln * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(this.keyPanSpeed, 0), t = !0;
        break;
      case this.keys.RIGHT:
        e.ctrlKey || e.metaKey || e.shiftKey ? this.enableRotate && this._rotateLeft(-ln * this.keyRotateSpeed / this.domElement.clientHeight) : this.enablePan && this._pan(-this.keyPanSpeed, 0), t = !0;
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
    this._rotateLeft(ln * this._rotateDelta.x / t.clientHeight), this._rotateUp(ln * this._rotateDelta.y / t.clientHeight), this._rotateStart.copy(this._rotateEnd);
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
    t === void 0 && (t = new he(), this._pointerPositions[e.pointerId] = t), t.set(e.pageX, e.pageY);
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
function U_(i) {
  this.enabled !== !1 && (this._pointers.length === 0 && (this.domElement.setPointerCapture(i.pointerId), this.domElement.addEventListener("pointermove", this._onPointerMove), this.domElement.addEventListener("pointerup", this._onPointerUp)), !this._isTrackingPointer(i) && (this._addPointer(i), i.pointerType === "touch" ? this._onTouchStart(i) : this._onMouseDown(i)));
}
function F_(i) {
  this.enabled !== !1 && (i.pointerType === "touch" ? this._onTouchMove(i) : this._onMouseMove(i));
}
function O_(i) {
  switch (this._removePointer(i), this._pointers.length) {
    case 0:
      this.domElement.releasePointerCapture(i.pointerId), this.domElement.removeEventListener("pointermove", this._onPointerMove), this.domElement.removeEventListener("pointerup", this._onPointerUp), this.dispatchEvent(tu), this.state = St.NONE;
      break;
    case 1:
      const e = this._pointers[0], t = this._pointerPositions[e];
      this._onTouchStart({ pointerId: e, pageX: t.x, pageY: t.y });
      break;
  }
}
function B_(i) {
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
    case ds.DOLLY:
      if (this.enableZoom === !1) return;
      this._handleMouseDownDolly(i), this.state = St.DOLLY;
      break;
    case ds.ROTATE:
      if (i.ctrlKey || i.metaKey || i.shiftKey) {
        if (this.enablePan === !1) return;
        this._handleMouseDownPan(i), this.state = St.PAN;
      } else {
        if (this.enableRotate === !1) return;
        this._handleMouseDownRotate(i), this.state = St.ROTATE;
      }
      break;
    case ds.PAN:
      if (i.ctrlKey || i.metaKey || i.shiftKey) {
        if (this.enableRotate === !1) return;
        this._handleMouseDownRotate(i), this.state = St.ROTATE;
      } else {
        if (this.enablePan === !1) return;
        this._handleMouseDownPan(i), this.state = St.PAN;
      }
      break;
    default:
      this.state = St.NONE;
  }
  this.state !== St.NONE && this.dispatchEvent(bc);
}
function k_(i) {
  switch (this.state) {
    case St.ROTATE:
      if (this.enableRotate === !1) return;
      this._handleMouseMoveRotate(i);
      break;
    case St.DOLLY:
      if (this.enableZoom === !1) return;
      this._handleMouseMoveDolly(i);
      break;
    case St.PAN:
      if (this.enablePan === !1) return;
      this._handleMouseMovePan(i);
      break;
  }
}
function z_(i) {
  this.enabled === !1 || this.enableZoom === !1 || this.state !== St.NONE || (i.preventDefault(), this.dispatchEvent(bc), this._handleMouseWheel(this._customWheelEvent(i)), this.dispatchEvent(tu));
}
function H_(i) {
  this.enabled !== !1 && this._handleKeyDown(i);
}
function V_(i) {
  switch (this._trackPointer(i), this._pointers.length) {
    case 1:
      switch (this.touches.ONE) {
        case os.ROTATE:
          if (this.enableRotate === !1) return;
          this._handleTouchStartRotate(i), this.state = St.TOUCH_ROTATE;
          break;
        case os.PAN:
          if (this.enablePan === !1) return;
          this._handleTouchStartPan(i), this.state = St.TOUCH_PAN;
          break;
        default:
          this.state = St.NONE;
      }
      break;
    case 2:
      switch (this.touches.TWO) {
        case os.DOLLY_PAN:
          if (this.enableZoom === !1 && this.enablePan === !1) return;
          this._handleTouchStartDollyPan(i), this.state = St.TOUCH_DOLLY_PAN;
          break;
        case os.DOLLY_ROTATE:
          if (this.enableZoom === !1 && this.enableRotate === !1) return;
          this._handleTouchStartDollyRotate(i), this.state = St.TOUCH_DOLLY_ROTATE;
          break;
        default:
          this.state = St.NONE;
      }
      break;
    default:
      this.state = St.NONE;
  }
  this.state !== St.NONE && this.dispatchEvent(bc);
}
function G_(i) {
  switch (this._trackPointer(i), this.state) {
    case St.TOUCH_ROTATE:
      if (this.enableRotate === !1) return;
      this._handleTouchMoveRotate(i), this.update();
      break;
    case St.TOUCH_PAN:
      if (this.enablePan === !1) return;
      this._handleTouchMovePan(i), this.update();
      break;
    case St.TOUCH_DOLLY_PAN:
      if (this.enableZoom === !1 && this.enablePan === !1) return;
      this._handleTouchMoveDollyPan(i), this.update();
      break;
    case St.TOUCH_DOLLY_ROTATE:
      if (this.enableZoom === !1 && this.enableRotate === !1) return;
      this._handleTouchMoveDollyRotate(i), this.update();
      break;
    default:
      this.state = St.NONE;
  }
}
function W_(i) {
  this.enabled !== !1 && i.preventDefault();
}
function X_(i) {
  i.key === "Control" && (this._controlActive = !0, this.domElement.getRootNode().addEventListener("keyup", this._interceptControlUp, { passive: !0, capture: !0 }));
}
function q_(i) {
  i.key === "Control" && (this._controlActive = !1, this.domElement.getRootNode().removeEventListener("keyup", this._interceptControlUp, { passive: !0, capture: !0 }));
}
function Y_(i, e = !1) {
  const t = i[0].index !== null, n = new Set(Object.keys(i[0].attributes)), s = new Set(Object.keys(i[0].morphAttributes)), r = {}, o = {}, a = i[0].morphTargetsRelative, c = new Ht();
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
    const u = Wl(r[h]);
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
      const g = Wl(f);
      if (!g)
        return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + h + " morphAttribute."), null;
      c.morphAttributes[h].push(g);
    }
  }
  return c;
}
function Wl(i) {
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
  const o = new e(r), a = new Wt(o, t, n);
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
function Xl(i, e) {
  if (e === Xu)
    return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."), i;
  if (e === za || e === bh) {
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
    if (e === za)
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
class K_ extends Ls {
  constructor(e) {
    super(e), this.dracoLoader = null, this.ktx2Loader = null, this.meshoptDecoder = null, this.pluginCallbacks = [], this.register(function(t) {
      return new Q_(t);
    }), this.register(function(t) {
      return new ev(t);
    }), this.register(function(t) {
      return new lv(t);
    }), this.register(function(t) {
      return new hv(t);
    }), this.register(function(t) {
      return new uv(t);
    }), this.register(function(t) {
      return new nv(t);
    }), this.register(function(t) {
      return new iv(t);
    }), this.register(function(t) {
      return new sv(t);
    }), this.register(function(t) {
      return new rv(t);
    }), this.register(function(t) {
      return new J_(t);
    }), this.register(function(t) {
      return new ov(t);
    }), this.register(function(t) {
      return new tv(t);
    }), this.register(function(t) {
      return new cv(t);
    }), this.register(function(t) {
      return new av(t);
    }), this.register(function(t) {
      return new Z_(t);
    }), this.register(function(t) {
      return new dv(t);
    }), this.register(function(t) {
      return new fv(t);
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
    }, c = new jh(this.manager);
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
      if (c.decode(new Uint8Array(e, 0, 4)) === nu) {
        try {
          o[nt.KHR_BINARY_GLTF] = new pv(e);
        } catch (u) {
          s && s(u);
          return;
        }
        r = JSON.parse(o[nt.KHR_BINARY_GLTF].content);
      } else
        r = JSON.parse(c.decode(e));
    else
      r = e;
    if (r.asset === void 0 || r.asset.version[0] < 2) {
      s && s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));
      return;
    }
    const l = new Av(r, {
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
          case nt.KHR_MATERIALS_UNLIT:
            o[u] = new $_();
            break;
          case nt.KHR_DRACO_MESH_COMPRESSION:
            o[u] = new mv(r, this.dracoLoader);
            break;
          case nt.KHR_TEXTURE_TRANSFORM:
            o[u] = new gv();
            break;
          case nt.KHR_MESH_QUANTIZATION:
            o[u] = new _v();
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
function j_() {
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
const nt = {
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
class Z_ {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_LIGHTS_PUNCTUAL, this.cache = { refs: {}, uses: {} };
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
    const h = new Ne(16777215);
    c.color !== void 0 && h.setRGB(c.color[0], c.color[1], c.color[2], on);
    const u = c.range !== void 0 ? c.range : 0;
    switch (c.type) {
      case "directional":
        l = new Xa(h), l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      case "point":
        l = new _c(h), l.distance = u;
        break;
      case "spot":
        l = new If(h), l.distance = u, c.spot = c.spot || {}, c.spot.innerConeAngle = c.spot.innerConeAngle !== void 0 ? c.spot.innerConeAngle : 0, c.spot.outerConeAngle = c.spot.outerConeAngle !== void 0 ? c.spot.outerConeAngle : Math.PI / 4, l.angle = c.spot.outerConeAngle, l.penumbra = 1 - c.spot.innerConeAngle / c.spot.outerConeAngle, l.target.position.set(0, 0, -1), l.add(l.target);
        break;
      default:
        throw new Error("THREE.GLTFLoader: Unexpected light type: " + c.type);
    }
    return l.position.set(0, 0, 0), l.decay = 2, Jn(l, c), c.intensity !== void 0 && (l.intensity = c.intensity), l.name = t.createUniqueName(c.name || "light_" + e), s = Promise.resolve(l), t.cache.add(n, s), s;
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
class $_ {
  constructor() {
    this.name = nt.KHR_MATERIALS_UNLIT;
  }
  getMaterialType() {
    return vi;
  }
  extendParams(e, t, n) {
    const s = [];
    e.color = new Ne(1, 1, 1), e.opacity = 1;
    const r = t.pbrMetallicRoughness;
    if (r) {
      if (Array.isArray(r.baseColorFactor)) {
        const o = r.baseColorFactor;
        e.color.setRGB(o[0], o[1], o[2], on), e.opacity = o[3];
      }
      r.baseColorTexture !== void 0 && s.push(n.assignTexture(e, "map", r.baseColorTexture, Ot));
    }
    return Promise.all(s);
  }
}
class J_ {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_EMISSIVE_STRENGTH;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name].emissiveStrength;
    return r !== void 0 && (t.emissiveIntensity = r), Promise.resolve();
  }
}
class Q_ {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_CLEARCOAT;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    if (o.clearcoatFactor !== void 0 && (t.clearcoat = o.clearcoatFactor), o.clearcoatTexture !== void 0 && r.push(n.assignTexture(t, "clearcoatMap", o.clearcoatTexture)), o.clearcoatRoughnessFactor !== void 0 && (t.clearcoatRoughness = o.clearcoatRoughnessFactor), o.clearcoatRoughnessTexture !== void 0 && r.push(n.assignTexture(t, "clearcoatRoughnessMap", o.clearcoatRoughnessTexture)), o.clearcoatNormalTexture !== void 0 && (r.push(n.assignTexture(t, "clearcoatNormalMap", o.clearcoatNormalTexture)), o.clearcoatNormalTexture.scale !== void 0)) {
      const a = o.clearcoatNormalTexture.scale;
      t.clearcoatNormalScale = new he(a, a);
    }
    return Promise.all(r);
  }
}
class ev {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_DISPERSION;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name];
    return t.dispersion = r.dispersion !== void 0 ? r.dispersion : 0, Promise.resolve();
  }
}
class tv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_IRIDESCENCE;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.iridescenceFactor !== void 0 && (t.iridescence = o.iridescenceFactor), o.iridescenceTexture !== void 0 && r.push(n.assignTexture(t, "iridescenceMap", o.iridescenceTexture)), o.iridescenceIor !== void 0 && (t.iridescenceIOR = o.iridescenceIor), t.iridescenceThicknessRange === void 0 && (t.iridescenceThicknessRange = [100, 400]), o.iridescenceThicknessMinimum !== void 0 && (t.iridescenceThicknessRange[0] = o.iridescenceThicknessMinimum), o.iridescenceThicknessMaximum !== void 0 && (t.iridescenceThicknessRange[1] = o.iridescenceThicknessMaximum), o.iridescenceThicknessTexture !== void 0 && r.push(n.assignTexture(t, "iridescenceThicknessMap", o.iridescenceThicknessTexture)), Promise.all(r);
  }
}
class nv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_SHEEN;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [];
    t.sheenColor = new Ne(0, 0, 0), t.sheenRoughness = 0, t.sheen = 1;
    const o = s.extensions[this.name];
    if (o.sheenColorFactor !== void 0) {
      const a = o.sheenColorFactor;
      t.sheenColor.setRGB(a[0], a[1], a[2], on);
    }
    return o.sheenRoughnessFactor !== void 0 && (t.sheenRoughness = o.sheenRoughnessFactor), o.sheenColorTexture !== void 0 && r.push(n.assignTexture(t, "sheenColorMap", o.sheenColorTexture, Ot)), o.sheenRoughnessTexture !== void 0 && r.push(n.assignTexture(t, "sheenRoughnessMap", o.sheenRoughnessTexture)), Promise.all(r);
  }
}
class iv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_TRANSMISSION;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.transmissionFactor !== void 0 && (t.transmission = o.transmissionFactor), o.transmissionTexture !== void 0 && r.push(n.assignTexture(t, "transmissionMap", o.transmissionTexture)), Promise.all(r);
  }
}
class sv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_VOLUME;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    t.thickness = o.thicknessFactor !== void 0 ? o.thicknessFactor : 0, o.thicknessTexture !== void 0 && r.push(n.assignTexture(t, "thicknessMap", o.thicknessTexture)), t.attenuationDistance = o.attenuationDistance || 1 / 0;
    const a = o.attenuationColor || [1, 1, 1];
    return t.attenuationColor = new Ne().setRGB(a[0], a[1], a[2], on), Promise.all(r);
  }
}
class rv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_IOR;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const s = this.parser.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = s.extensions[this.name];
    return t.ior = r.ior !== void 0 ? r.ior : 1.5, Promise.resolve();
  }
}
class ov {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_SPECULAR;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    t.specularIntensity = o.specularFactor !== void 0 ? o.specularFactor : 1, o.specularTexture !== void 0 && r.push(n.assignTexture(t, "specularIntensityMap", o.specularTexture));
    const a = o.specularColorFactor || [1, 1, 1];
    return t.specularColor = new Ne().setRGB(a[0], a[1], a[2], on), o.specularColorTexture !== void 0 && r.push(n.assignTexture(t, "specularColorMap", o.specularColorTexture, Ot)), Promise.all(r);
  }
}
class av {
  constructor(e) {
    this.parser = e, this.name = nt.EXT_MATERIALS_BUMP;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return t.bumpScale = o.bumpFactor !== void 0 ? o.bumpFactor : 1, o.bumpTexture !== void 0 && r.push(n.assignTexture(t, "bumpMap", o.bumpTexture)), Promise.all(r);
  }
}
class cv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_MATERIALS_ANISOTROPY;
  }
  getMaterialType(e) {
    const n = this.parser.json.materials[e];
    return !n.extensions || !n.extensions[this.name] ? null : $t;
  }
  extendMaterialParams(e, t) {
    const n = this.parser, s = n.json.materials[e];
    if (!s.extensions || !s.extensions[this.name])
      return Promise.resolve();
    const r = [], o = s.extensions[this.name];
    return o.anisotropyStrength !== void 0 && (t.anisotropy = o.anisotropyStrength), o.anisotropyRotation !== void 0 && (t.anisotropyRotation = o.anisotropyRotation), o.anisotropyTexture !== void 0 && r.push(n.assignTexture(t, "anisotropyMap", o.anisotropyTexture)), Promise.all(r);
  }
}
class lv {
  constructor(e) {
    this.parser = e, this.name = nt.KHR_TEXTURE_BASISU;
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
class hv {
  constructor(e) {
    this.parser = e, this.name = nt.EXT_TEXTURE_WEBP, this.isSupported = null;
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
class uv {
  constructor(e) {
    this.parser = e, this.name = nt.EXT_TEXTURE_AVIF, this.isSupported = null;
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
class dv {
  constructor(e) {
    this.name = nt.EXT_MESHOPT_COMPRESSION, this.parser = e;
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
class fv {
  constructor(e) {
    this.name = nt.EXT_MESH_GPU_INSTANCING, this.parser = e;
  }
  createNodeMesh(e) {
    const t = this.parser.json, n = t.nodes[e];
    if (!n.extensions || !n.extensions[this.name] || n.mesh === void 0)
      return null;
    const s = t.meshes[n.mesh];
    for (const l of s.primitives)
      if (l.mode !== xn.TRIANGLES && l.mode !== xn.TRIANGLE_STRIP && l.mode !== xn.TRIANGLE_FAN && l.mode !== void 0)
        return null;
    const o = n.extensions[this.name].attributes, a = [], c = {};
    for (const l in o)
      a.push(this.parser.getDependency("accessor", o[l]).then((h) => (c[l] = h, c[l])));
    return a.length < 1 ? null : (a.push(this.parser.createNodeMesh(e)), Promise.all(a).then((l) => {
      const h = l.pop(), u = h.isGroup ? h.children : [h], d = l[0].count, f = [];
      for (const g of u) {
        const _ = new We(), m = new M(), p = new mn(), x = new M(1, 1, 1), b = new Zd(g.geometry, g.material, d);
        for (let v = 0; v < d; v++)
          c.TRANSLATION && m.fromBufferAttribute(c.TRANSLATION, v), c.ROTATION && p.fromBufferAttribute(c.ROTATION, v), c.SCALE && x.fromBufferAttribute(c.SCALE, v), b.setMatrixAt(v, _.compose(m, p, x));
        for (const v in c)
          if (v === "_COLOR_0") {
            const P = c[v];
            b.instanceColor = new Va(P.array, P.itemSize, P.normalized);
          } else v !== "TRANSLATION" && v !== "ROTATION" && v !== "SCALE" && g.geometry.setAttribute(v, c[v]);
        Mt.prototype.copy.call(b, g), this.parser.assignFinalMaterial(b), f.push(b);
      }
      return h.isGroup ? (h.clear(), h.add(...f), h) : f[0];
    }));
  }
}
const nu = "glTF", Ys = 12, ql = { JSON: 1313821514, BIN: 5130562 };
class pv {
  constructor(e) {
    this.name = nt.KHR_BINARY_GLTF, this.content = null, this.body = null;
    const t = new DataView(e, 0, Ys), n = new TextDecoder();
    if (this.header = {
      magic: n.decode(new Uint8Array(e.slice(0, 4))),
      version: t.getUint32(4, !0),
      length: t.getUint32(8, !0)
    }, this.header.magic !== nu)
      throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");
    if (this.header.version < 2)
      throw new Error("THREE.GLTFLoader: Legacy binary file detected.");
    const s = this.header.length - Ys, r = new DataView(e, Ys);
    let o = 0;
    for (; o < s; ) {
      const a = r.getUint32(o, !0);
      o += 4;
      const c = r.getUint32(o, !0);
      if (o += 4, c === ql.JSON) {
        const l = new Uint8Array(e, Ys + o, a);
        this.content = n.decode(l);
      } else if (c === ql.BIN) {
        const l = Ys + o;
        this.body = e.slice(l, l + a);
      }
      o += a;
    }
    if (this.content === null)
      throw new Error("THREE.GLTFLoader: JSON content not found.");
  }
}
class mv {
  constructor(e, t) {
    if (!t)
      throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");
    this.name = nt.KHR_DRACO_MESH_COMPRESSION, this.json = e, this.dracoLoader = t, this.dracoLoader.preload();
  }
  decodePrimitive(e, t) {
    const n = this.json, s = this.dracoLoader, r = e.extensions[this.name].bufferView, o = e.extensions[this.name].attributes, a = {}, c = {}, l = {};
    for (const h in o) {
      const u = Ya[h] || h.toLowerCase();
      a[u] = o[h];
    }
    for (const h in e.attributes) {
      const u = Ya[h] || h.toLowerCase();
      if (o[h] !== void 0) {
        const d = n.accessors[e.attributes[h]], f = gs[d.componentType];
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
        }, a, l, on, d);
      });
    });
  }
}
class gv {
  constructor() {
    this.name = nt.KHR_TEXTURE_TRANSFORM;
  }
  extendTexture(e, t) {
    return (t.texCoord === void 0 || t.texCoord === e.channel) && t.offset === void 0 && t.rotation === void 0 && t.scale === void 0 || (e = e.clone(), t.texCoord !== void 0 && (e.channel = t.texCoord), t.offset !== void 0 && e.offset.fromArray(t.offset), t.rotation !== void 0 && (e.rotation = t.rotation), t.scale !== void 0 && e.repeat.fromArray(t.scale), e.needsUpdate = !0), e;
  }
}
class _v {
  constructor() {
    this.name = nt.KHR_MESH_QUANTIZATION;
  }
}
class iu extends lr {
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
    const r = this.resultBuffer, o = this.sampleValues, a = this.valueSize, c = a * 2, l = a * 3, h = s - t, u = (n - t) / h, d = u * u, f = d * u, g = e * l, _ = g - l, m = -2 * f + 3 * d, p = f - d, x = 1 - m, b = p - d + u;
    for (let v = 0; v !== a; v++) {
      const P = o[_ + v + a], T = o[_ + v + c] * h, C = o[g + v + a], I = o[g + v] * h;
      r[v] = x * P + b * T + m * C + p * I;
    }
    return r;
  }
}
const vv = new mn();
class xv extends iu {
  interpolate_(e, t, n, s) {
    const r = super.interpolate_(e, t, n, s);
    return vv.fromArray(r).normalize().toArray(r), r;
  }
}
const xn = {
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6
}, gs = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array
}, Yl = {
  9728: rn,
  9729: pn,
  9984: dh,
  9985: Xr,
  9986: Zs,
  9987: Qn
}, Kl = {
  33071: _i,
  33648: Qr,
  10497: Qt
}, Zo = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16
}, Ya = {
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
}, pi = {
  scale: "scale",
  translation: "position",
  rotation: "quaternion",
  weights: "morphTargetInfluences"
}, yv = {
  CUBICSPLINE: void 0,
  // We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
  // keyframe track will be initialized with a default interpolation type, then modified.
  LINEAR: rr,
  STEP: sr
}, $o = {
  OPAQUE: "OPAQUE",
  MASK: "MASK",
  BLEND: "BLEND"
};
function Sv(i) {
  return i.DefaultMaterial === void 0 && (i.DefaultMaterial = new re({
    color: 16777215,
    emissive: 0,
    metalness: 1,
    roughness: 1,
    transparent: !1,
    depthTest: !0,
    side: ni
  })), i.DefaultMaterial;
}
function Ii(i, e, t) {
  for (const n in t.extensions)
    i[n] === void 0 && (e.userData.gltfExtensions = e.userData.gltfExtensions || {}, e.userData.gltfExtensions[n] = t.extensions[n]);
}
function Jn(i, e) {
  e.extras !== void 0 && (typeof e.extras == "object" ? Object.assign(i.userData, e.extras) : console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, " + e.extras));
}
function bv(i, e, t) {
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
function wv(i, e) {
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
function Ev(i) {
  let e;
  const t = i.extensions && i.extensions[nt.KHR_DRACO_MESH_COMPRESSION];
  if (t ? e = "draco:" + t.bufferView + ":" + t.indices + ":" + Jo(t.attributes) : e = i.indices + ":" + Jo(i.attributes) + ":" + i.mode, i.targets !== void 0)
    for (let n = 0, s = i.targets.length; n < s; n++)
      e += ":" + Jo(i.targets[n]);
  return e;
}
function Jo(i) {
  let e = "";
  const t = Object.keys(i).sort();
  for (let n = 0, s = t.length; n < s; n++)
    e += t[n] + ":" + i[t[n]] + ";";
  return e;
}
function Ka(i) {
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
function Mv(i) {
  return i.search(/\.jpe?g($|\?)/i) > 0 || i.search(/^data\:image\/jpeg/) === 0 ? "image/jpeg" : i.search(/\.webp($|\?)/i) > 0 || i.search(/^data\:image\/webp/) === 0 ? "image/webp" : i.search(/\.ktx2($|\?)/i) > 0 || i.search(/^data\:image\/ktx2/) === 0 ? "image/ktx2" : "image/png";
}
const Tv = new We();
class Av {
  constructor(e = {}, t = {}) {
    this.json = e, this.extensions = {}, this.plugins = {}, this.options = t, this.cache = new j_(), this.associations = /* @__PURE__ */ new Map(), this.primitiveCache = {}, this.nodeCache = {}, this.meshCache = { refs: {}, uses: {} }, this.cameraCache = { refs: {}, uses: {} }, this.lightCache = { refs: {}, uses: {} }, this.sourceCache = {}, this.textureCache = {}, this.nodeNamesUsed = {};
    let n = !1, s = -1, r = !1, o = -1;
    if (typeof navigator < "u") {
      const a = navigator.userAgent;
      n = /^((?!chrome|android).)*safari/i.test(a) === !0;
      const c = a.match(/Version\/(\d+)/);
      s = n && c ? parseInt(c[1], 10) : -1, r = a.indexOf("Firefox") > -1, o = r ? a.match(/Firefox\/([0-9]+)\./)[1] : -1;
    }
    typeof createImageBitmap > "u" || n && s < 17 || r && o < 98 ? this.textureLoader = new Cf(this.options.manager) : this.textureLoader = new Nf(this.options.manager), this.textureLoader.setCrossOrigin(this.options.crossOrigin), this.textureLoader.setRequestHeader(this.options.requestHeader), this.fileLoader = new jh(this.options.manager), this.fileLoader.setResponseType("arraybuffer"), this.options.crossOrigin === "use-credentials" && this.fileLoader.setWithCredentials(!0);
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
      return Ii(r, a, s), Jn(a, s), Promise.all(n._invokeAll(function(c) {
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
      return Promise.resolve(this.extensions[nt.KHR_BINARY_GLTF].body);
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
      const o = Zo[s.type], a = gs[s.componentType], c = s.normalized === !0, l = new a(s.count * o);
      return Promise.resolve(new Wt(l, o, c));
    }
    const r = [];
    return s.bufferView !== void 0 ? r.push(this.getDependency("bufferView", s.bufferView)) : r.push(null), s.sparse !== void 0 && (r.push(this.getDependency("bufferView", s.sparse.indices.bufferView)), r.push(this.getDependency("bufferView", s.sparse.values.bufferView))), Promise.all(r).then(function(o) {
      const a = o[0], c = Zo[s.type], l = gs[s.componentType], h = l.BYTES_PER_ELEMENT, u = h * c, d = s.byteOffset || 0, f = s.bufferView !== void 0 ? n.bufferViews[s.bufferView].byteStride : void 0, g = s.normalized === !0;
      let _, m;
      if (f && f !== u) {
        const p = Math.floor(d / f), x = "InterleavedBuffer:" + s.bufferView + ":" + s.componentType + ":" + p + ":" + s.count;
        let b = t.cache.get(x);
        b || (_ = new l(a, p * f, s.count * f / h), b = new Xd(_, f / h), t.cache.add(x, b)), m = new rc(b, c, d % f / h, g);
      } else
        a === null ? _ = new l(s.count * c) : _ = new l(a, d, s.count * c), m = new Wt(_, c, g);
      if (s.sparse !== void 0) {
        const p = Zo.SCALAR, x = gs[s.sparse.indices.componentType], b = s.sparse.indices.byteOffset || 0, v = s.sparse.values.byteOffset || 0, P = new x(o[1], b, s.sparse.count * p), T = new l(o[2], v, s.sparse.count * c);
        a !== null && (m = new Wt(m.array.slice(), m.itemSize, m.normalized)), m.normalized = !1;
        for (let C = 0, I = P.length; C < I; C++) {
          const w = P[C];
          if (m.setX(w, T[C * c]), c >= 2 && m.setY(w, T[C * c + 1]), c >= 3 && m.setZ(w, T[C * c + 2]), c >= 4 && m.setW(w, T[C * c + 3]), c >= 5) throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.");
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
      return h.magFilter = Yl[d.magFilter] || pn, h.minFilter = Yl[d.minFilter] || Qn, h.wrapS = Kl[d.wrapS] || Qt, h.wrapT = Kl[d.wrapT] || Qt, h.generateMipmaps = !h.isCompressedTexture && h.minFilter !== rn && h.minFilter !== pn, s.associations.set(h, { textures: e }), h;
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
          const m = new Bt(_);
          m.needsUpdate = !0, d(m);
        }), t.load(nr.resolveURL(u, r.path), g, void 0, f);
      });
    }).then(function(u) {
      return l === !0 && a.revokeObjectURL(c), Jn(u, o), u.userData.mimeType = o.mimeType || Mv(o.uri), u;
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
      if (n.texCoord !== void 0 && n.texCoord > 0 && (o = o.clone(), o.channel = n.texCoord), r.extensions[nt.KHR_TEXTURE_TRANSFORM]) {
        const a = n.extensions !== void 0 ? n.extensions[nt.KHR_TEXTURE_TRANSFORM] : void 0;
        if (a) {
          const c = r.associations.get(o);
          o = r.extensions[nt.KHR_TEXTURE_TRANSFORM].extendTexture(o, a), r.associations.set(o, c);
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
      c || (c = new Bh(), On.prototype.copy.call(c, n), c.color.copy(n.color), c.map = n.map, c.sizeAttenuation = !1, this.cache.add(a, c)), n = c;
    } else if (e.isLine) {
      const a = "LineBasicMaterial:" + n.uuid;
      let c = this.cache.get(a);
      c || (c = new Oh(), On.prototype.copy.call(c, n), c.color.copy(n.color), c.map = n.map, this.cache.add(a, c)), n = c;
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
    return re;
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
    if (c[nt.KHR_MATERIALS_UNLIT]) {
      const u = s[nt.KHR_MATERIALS_UNLIT];
      o = u.getMaterialType(), l.push(u.extendParams(a, r, t));
    } else {
      const u = r.pbrMetallicRoughness || {};
      if (a.color = new Ne(1, 1, 1), a.opacity = 1, Array.isArray(u.baseColorFactor)) {
        const d = u.baseColorFactor;
        a.color.setRGB(d[0], d[1], d[2], on), a.opacity = d[3];
      }
      u.baseColorTexture !== void 0 && l.push(t.assignTexture(a, "map", u.baseColorTexture, Ot)), a.metalness = u.metallicFactor !== void 0 ? u.metallicFactor : 1, a.roughness = u.roughnessFactor !== void 0 ? u.roughnessFactor : 1, u.metallicRoughnessTexture !== void 0 && (l.push(t.assignTexture(a, "metalnessMap", u.metallicRoughnessTexture)), l.push(t.assignTexture(a, "roughnessMap", u.metallicRoughnessTexture))), o = this._invokeOne(function(d) {
        return d.getMaterialType && d.getMaterialType(e);
      }), l.push(Promise.all(this._invokeAll(function(d) {
        return d.extendMaterialParams && d.extendMaterialParams(e, a);
      })));
    }
    r.doubleSided === !0 && (a.side = Jt);
    const h = r.alphaMode || $o.OPAQUE;
    if (h === $o.BLEND ? (a.transparent = !0, a.depthWrite = !1) : (a.transparent = !1, h === $o.MASK && (a.alphaTest = r.alphaCutoff !== void 0 ? r.alphaCutoff : 0.5)), r.normalTexture !== void 0 && o !== vi && (l.push(t.assignTexture(a, "normalMap", r.normalTexture)), a.normalScale = new he(1, 1), r.normalTexture.scale !== void 0)) {
      const u = r.normalTexture.scale;
      a.normalScale.set(u, u);
    }
    if (r.occlusionTexture !== void 0 && o !== vi && (l.push(t.assignTexture(a, "aoMap", r.occlusionTexture)), r.occlusionTexture.strength !== void 0 && (a.aoMapIntensity = r.occlusionTexture.strength)), r.emissiveFactor !== void 0 && o !== vi) {
      const u = r.emissiveFactor;
      a.emissive = new Ne().setRGB(u[0], u[1], u[2], on);
    }
    return r.emissiveTexture !== void 0 && o !== vi && l.push(t.assignTexture(a, "emissiveMap", r.emissiveTexture, Ot)), Promise.all(l).then(function() {
      const u = new o(a);
      return r.name && (u.name = r.name), Jn(u, r), t.associations.set(u, { materials: e }), r.extensions && Ii(s, u, r), u;
    });
  }
  /**
   * When Object3D instances are targeted by animation, they need unique names.
   *
   * @param {String} originalName
   * @return {String}
   */
  createUniqueName(e) {
    const t = _t.sanitizeNodeName(e || "");
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
      return n[nt.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a, t).then(function(c) {
        return jl(c, a, t);
      });
    }
    const o = [];
    for (let a = 0, c = e.length; a < c; a++) {
      const l = e[a], h = Ev(l), u = s[h];
      if (u)
        o.push(u.promise);
      else {
        let d;
        l.extensions && l.extensions[nt.KHR_DRACO_MESH_COMPRESSION] ? d = r(l) : d = jl(new Ht(), l, t), s[h] = { primitive: l, promise: d }, o.push(d);
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
      const h = o[c].material === void 0 ? Sv(this.cache) : this.getDependency("material", o[c].material);
      a.push(h);
    }
    return a.push(t.loadGeometries(o)), Promise.all(a).then(function(c) {
      const l = c.slice(0, c.length - 1), h = c[c.length - 1], u = [];
      for (let f = 0, g = h.length; f < g; f++) {
        const _ = h[f], m = o[f];
        let p;
        const x = l[f];
        if (m.mode === xn.TRIANGLES || m.mode === xn.TRIANGLE_STRIP || m.mode === xn.TRIANGLE_FAN || m.mode === void 0)
          p = r.isSkinnedMesh === !0 ? new Yd(_, x) : new ae(_, x), p.isSkinnedMesh === !0 && p.normalizeSkinWeights(), m.mode === xn.TRIANGLE_STRIP ? p.geometry = Xl(p.geometry, bh) : m.mode === xn.TRIANGLE_FAN && (p.geometry = Xl(p.geometry, za));
        else if (m.mode === xn.LINES)
          p = new Qd(_, x);
        else if (m.mode === xn.LINE_STRIP)
          p = new cc(_, x);
        else if (m.mode === xn.LINE_LOOP)
          p = new ef(_, x);
        else if (m.mode === xn.POINTS)
          p = new tf(_, x);
        else
          throw new Error("THREE.GLTFLoader: Primitive mode unsupported: " + m.mode);
        Object.keys(p.geometry.morphAttributes).length > 0 && wv(p, r), p.name = t.createUniqueName(r.name || "mesh_" + e), Jn(p, r), m.extensions && Ii(s, p, m), t.assignFinalMaterial(p), u.push(p);
      }
      for (let f = 0, g = u.length; f < g; f++)
        t.associations.set(u[f], {
          meshes: e,
          primitives: f
        });
      if (u.length === 1)
        return r.extensions && Ii(s, u[0], r), u[0];
      const d = new ye();
      r.extensions && Ii(s, d, r), t.associations.set(d, { meshes: e });
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
    return n.type === "perspective" ? t = new nn(ls.radToDeg(s.yfov), s.aspectRatio || 1, s.znear || 1, s.zfar || 2e6) : n.type === "orthographic" && (t = new vc(-s.xmag, s.xmag, s.ymag, -s.ymag, s.znear, s.zfar)), n.name && (t.name = this.createUniqueName(n.name)), Jn(t, n), Promise.resolve(t);
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
          const d = new We();
          r !== null && d.fromArray(r.array, l * 16), c.push(d);
        } else
          console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', t.joints[l]);
      }
      return new oc(a, c);
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
      for (let x = 0, b = d.length; x < b; x++) {
        const v = d[x], P = f[x], T = g[x], C = _[x], I = m[x];
        if (v === void 0) continue;
        v.updateMatrix && v.updateMatrix();
        const w = n._createAnimationTracks(v, P, T, C, I);
        if (w)
          for (let S = 0; S < w.length; S++)
            p.push(w[S]);
      }
      return new ro(r, void 0, p);
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
        f.isSkinnedMesh && f.bind(d, Tv);
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
      if (r.isBone === !0 ? h = new Uh() : l.length > 1 ? h = new ye() : l.length === 1 ? h = l[0] : h = new Mt(), h !== l[0])
        for (let u = 0, d = l.length; u < d; u++)
          h.add(l[u]);
      if (r.name && (h.userData.name = r.name, h.name = o), Jn(h, r), r.extensions && Ii(n, h, r), r.matrix !== void 0) {
        const u = new We();
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
    n.name && (r.name = s.createUniqueName(n.name)), Jn(r, n), n.extensions && Ii(t, r, n);
    const o = n.nodes || [], a = [];
    for (let c = 0, l = o.length; c < l; c++)
      a.push(s.getDependency("node", o[c]));
    return Promise.all(a).then(function(c) {
      for (let h = 0, u = c.length; h < u; h++)
        r.add(c[h]);
      const l = (h) => {
        const u = /* @__PURE__ */ new Map();
        for (const [d, f] of s.associations)
          (d instanceof On || d instanceof Bt) && u.set(d, f);
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
    pi[r.path] === pi.weights ? e.traverse(function(d) {
      d.morphTargetInfluences && c.push(d.name ? d.name : d.uuid);
    }) : c.push(a);
    let l;
    switch (pi[r.path]) {
      case pi.weights:
        l = Es;
        break;
      case pi.rotation:
        l = Bi;
        break;
      case pi.position:
      case pi.scale:
        l = Ms;
        break;
      default:
        switch (n.itemSize) {
          case 1:
            l = Es;
            break;
          case 2:
          case 3:
          default:
            l = Ms;
            break;
        }
        break;
    }
    const h = s.interpolation !== void 0 ? yv[s.interpolation] : rr, u = this._getArrayFromAccessor(n);
    for (let d = 0, f = c.length; d < f; d++) {
      const g = new l(
        c[d] + "." + pi[r.path],
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
      const n = Ka(t.constructor), s = new Float32Array(t.length);
      for (let r = 0, o = t.length; r < o; r++)
        s[r] = t[r] * n;
      t = s;
    }
    return t;
  }
  _createCubicSplineTrackInterpolant(e) {
    e.createInterpolant = function(n) {
      const s = this instanceof Bi ? xv : iu;
      return new s(this.times, this.values, this.getValueSize() / 3, n);
    }, e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = !0;
  }
}
function Rv(i, e, t) {
  const n = e.attributes, s = new In();
  if (n.POSITION !== void 0) {
    const a = t.json.accessors[n.POSITION], c = a.min, l = a.max;
    if (c !== void 0 && l !== void 0) {
      if (s.set(
        new M(c[0], c[1], c[2]),
        new M(l[0], l[1], l[2])
      ), a.normalized) {
        const h = Ka(gs[a.componentType]);
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
            const _ = Ka(gs[d.componentType]);
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
  const o = new kn();
  s.getCenter(o.center), o.radius = s.min.distanceTo(s.max) / 2, i.boundingSphere = o;
}
function jl(i, e, t) {
  const n = e.attributes, s = [];
  function r(o, a) {
    return t.getDependency("accessor", o).then(function(c) {
      i.setAttribute(a, c);
    });
  }
  for (const o in n) {
    const a = Ya[o] || o.toLowerCase();
    a in i.attributes || s.push(r(n[o], a));
  }
  if (e.indices !== void 0 && !i.index) {
    const o = t.getDependency("accessor", e.indices).then(function(a) {
      i.setIndex(a);
    });
    s.push(o);
  }
  return ct.workingColorSpace !== on && "COLOR_0" in n && console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${ct.workingColorSpace}" not supported.`), Jn(i, e), Rv(i, e, t), Promise.all(s).then(function() {
    return e.targets !== void 0 ? bv(i, e.targets, t) : i;
  });
}
function Hr(i) {
  const e = /* @__PURE__ */ new Map(), t = /* @__PURE__ */ new Map(), n = i.clone();
  return su(i, n, function(s, r) {
    e.set(r, s), t.set(s, r);
  }), n.traverse(function(s) {
    if (!s.isSkinnedMesh) return;
    const r = s, o = e.get(s), a = o.skeleton.bones;
    r.skeleton = o.skeleton.clone(), r.bindMatrix.copy(o.bindMatrix), r.skeleton.bones = a.map(function(c) {
      return t.get(c);
    }), r.bind(r.skeleton, r.bindMatrix);
  }), n;
}
function su(i, e, t) {
  t(i, e);
  for (let n = 0; n < i.children.length; n++)
    su(i.children[n], e.children[n], t);
}
new M(0, 0, 1);
new M(0, 1, 0);
function Xt(i) {
  let e = i >>> 0;
  return () => {
    e |= 0, e = e + 1831565813 | 0;
    let t = Math.imul(e ^ e >>> 15, 1 | e);
    return t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function un(i, e, t) {
  const n = document.createElement("canvas");
  n.width = i, n.height = e;
  const s = n.getContext("2d");
  t(s, i, e);
  const r = new nf(n);
  return r.colorSpace = Ot, r.anisotropy = 8, r.wrapS = Qt, r.wrapT = Qt, r;
}
function R(i, e, t, n) {
  const s = new ae(new vt(e[0], e[1], e[2]), n);
  return s.name = i, s.position.set(t[0], t[1], t[2]), s.castShadow = !0, s.receiveShadow = !0, s;
}
function rt(i, e, t, n, s, r, o = 10) {
  const a = new ae(
    new hn(e, t, n, o),
    r
  );
  return a.name = i, a.position.set(s[0], s[1], s[2]), a.castShadow = !0, a.receiveShadow = !0, a;
}
function Tt(i, { id: e, kind: t, grounded: n = !0, assumption: s = null, gameplay: r = null }) {
  i.name = e, i.userData.assetId = e, i.userData.kind = t, i.userData.units = "meters", i.userData.front = "+Z", i.userData.grounded = n, s && (i.userData.assumption = s), r && (i.userData.gameplay = r);
  const o = new Mt();
  return o.name = `${e}-front`, i.add(o), i.userData.frontMarker = o, i;
}
function Nt(i, e) {
  const t = i.userData.frontMarker;
  t && t.position.copy(e);
}
function Gt(i, e) {
  return i.userData.floorHardness = e, i;
}
function It(i) {
  i.updateMatrixWorld(!0);
  const e = new In().setFromObject(i);
  return i.userData.localMinY = e.min.y, i.userData.localSize = e.getSize(new M()).toArray().map((t) => Math.round(t * 100) / 100), e;
}
function ru(i, e, t, n = 20) {
  const s = [];
  for (let r = 0; r <= n; r++) {
    const o = r / n, a = new M().lerpVectors(i, e, o);
    a.y -= t * 4 * o * (1 - o), s.push(a);
  }
  return new zh(s);
}
function Ns(i) {
  let e = 2166136261;
  for (let t = 0; t < i.length; t++)
    e ^= i.charCodeAt(t), e = Math.imul(e, 16777619);
  return e >>> 0;
}
function Ts(i) {
  var r;
  i.updateMatrixWorld(!0);
  const e = /* @__PURE__ */ new Map();
  i.traverse((o) => {
    var c, l;
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.noMerge || !((l = (c = o.geometry) == null ? void 0 : c.attributes) != null && l.position)) return;
    const a = e.get(o.material);
    a ? a.push(o) : e.set(o.material, [o]);
  });
  const t = new We().copy(i.matrixWorld).invert(), n = new We();
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
        d.setAttribute("uv", new Wt(new Float32Array(f * 2), 2));
      }
      d.clearGroups(), n.multiplyMatrices(t, u.matrixWorld), d.applyMatrix4(n), c.push(d);
    }
    const l = Y_(c, !1);
    if (!l) continue;
    const h = new ae(l, o);
    h.name = "merged", h.castShadow = !0, h.receiveShadow = !0, a.every((u) => u.userData.ignoreBounds) && (h.userData.ignoreBounds = !0), a.every((u) => u.castShadow === !1) && (h.castShadow = !1, h.receiveShadow = !1);
    for (const u of a)
      (r = u.parent) == null || r.remove(u), u.geometry.dispose();
    i.add(h), s += 1;
  }
  return s;
}
function Cv(i, { amount: e = 0.32, height: t = 2.4 } = {}) {
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
  const o = new M().subVectors(n, t), a = o.length(), c = new ae(new hn(s, s, a, 6), r);
  return c.position.copy(t).add(n).multiplyScalar(0.5), c.quaternion.setFromUnitVectors(new M(0, 1, 0), o.normalize()), c.castShadow = !0, c.name = "tube", i.add(c), c;
}
function Pv(i, { r: e = 0.48, h: t = 1.15 } = {}) {
  const n = new ye();
  for (const [s, r] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]])
    n.add(R("leg", [0.05, 0.5, 0.05], [s, 0.25, r], i.metalDark));
  return n.add(rt("tank", e, e, t, [0, 0.5 + t / 2, 0], i.tank, 12)), n.add(rt("tank-lid", e * 0.55, e * 0.62, 0.16, [0, 0.5 + t + 0.08, 0], i.metal, 10)), n.add(R("tank-band", [e * 2.02, 0.06, e * 2.02], [0, 0.5 + t * 0.35, 0], i.metalDark)), n;
}
function Iv(i, { w: e = 1.7, h: t = 2.1, d: n = 1.6 } = {}) {
  const s = new ye();
  s.add(R("shed", [e, t, n], [0, t / 2, 0], i.vinyl));
  const r = R("shed-lid", [e + 0.1, 0.06, n + 0.1], [0, t + 0.05, 0], i.roof);
  return r.rotation.x = 0.09, s.add(r), s.add(R("shed-door", [0.62, 1.5, 0.04], [-e / 2 + 0.4, 0.76, n / 2 + 0.02], i.woodDark)), s;
}
function Lv(i, { h: e = 2.3 } = {}) {
  const t = new ye();
  t.add(rt("mast", 0.025, 0.035, e, [0, e / 2, 0], i.metalDark, 6));
  for (let n = 0; n < 3; n++)
    t.add(R("cross", [0.66 - n * 0.16, 0.02, 0.02], [0, e - 0.25 - n * 0.28, 0], i.metalDark));
  return t.add(R("guy", [0.02, 0.02, 0.9], [0, e * 0.62, 0], i.metalDark)), t;
}
function Zl(i, { w: e = 0.78, h: t = 0.52, d: n = 0.34 } = {}) {
  const s = new ye();
  s.add(R("ac-body", [e, t, n], [0, 0, n / 2], i.metal)), s.add(R("ac-bracket", [e + 0.1, 0.04, n], [0, -t / 2 + 0.02, n / 2], i.metalDark));
  const r = new ae(new Cs(t * 0.3, 0.014, 5, 10), i.metalDark);
  r.position.set(0, 0, n + 0.01), r.name = "ac-fan", s.add(r);
  for (let o = 0; o < 3; o++)
    s.add(R("ac-slat", [e - 0.12, 0.014, 0.02], [0, -t / 2 + 0.09 + o * 0.05, n + 5e-3], i.metalDark));
  return s;
}
function Dv(i, { w: e = 1.9, d: t = 0.55 } = {}) {
  const n = new ye(), s = R("tin-sheet", [e, 0.04, t], [0, 0, t / 2], i.rust);
  s.rotation.x = -0.12, n.add(s);
  for (const r of [-1, 1])
    n.add(R("tin-bracket", [0.04, 0.3, 0.04], [r * (e / 2 - 0.08), -0.14, t * 0.55], i.metalDark));
  return n;
}
function Nv(i, { w: e = 2, d: t = 0.5 } = {}) {
  const n = new ye();
  n.add(R("balcony-floor", [e, 0.09, t], [0, -0.05, t / 2], i.concretePlain)), n.add(R("balcony-rail", [e, 0.05, 0.05], [0, 0.55, t - 0.04], i.metalDark)), n.add(R("balcony-rail-b", [e, 0.03, 0.03], [0, 0.22, t - 0.04], i.metalDark));
  for (const o of [-1, 0, 1])
    n.add(R("balcony-post", [0.035, 1, 0.035], [o * (e / 2 - 0.1), 0.5, t - 0.04], i.metalDark));
  n.add(rt("laundry-pole", 0.02, 0.02, e - 0.1, [0, 0.92, t * 0.45], i.metal, 6));
  const s = n.children[n.children.length - 1];
  s.rotation.z = Math.PI / 2;
  const r = [[-0.55, 0.42, i.clothA], [0.1, 0.5, i.clothB], [0.62, 0.34, i.clothA]];
  for (const [o, a, c] of r) {
    const l = new ae(new an(a, a * 1.15), c);
    l.position.set(o, 0.62, t * 0.45), l.name = "laundry", n.add(l);
  }
  return n;
}
function Uv(i, { w: e = 1.5, h: t = 1.15, d: n = 0.28 } = {}) {
  const s = new ye();
  s.add(R("bump", [e, t, n], [0, t / 2, n / 2], i.vinyl)), s.add(R("bump-lid", [e + 0.08, 0.12, n + 0.06], [0, t, n / 2], i.roof));
  const r = new ae(new an(e - 0.36, t - 0.36), i.frost);
  return r.position.set(0, t / 2, n + 0.01), r.name = "bump-window", s.add(r), s;
}
function ou(i, e, t) {
  const { W: n, D: s, H: r, floors: o, groundH: a, upperH: c, zOuter: l, wallMat: h, id: u } = t, d = Xt(Ns(u)), f = (p, x) => p + d() * (x - p), g = (p) => d() < p, _ = r + 0.13;
  for (const p of [-1, 1]) {
    const x = R("edge-chamfer", [0.17, r + 0.1, 0.17], [p * (n / 2 - 0.04), r / 2, l - 0.04], h);
    x.rotation.y = Math.PI / 4, i.add(x);
  }
  const m = 3 + Math.floor(d() * 2);
  for (let p = 0; p < m; p++) {
    const x = n / m, b = -n / 2 + x * (p + 0.5);
    if (g(0.18)) continue;
    const v = f(0.02, 0.62);
    i.add(R("parapet-vary", [x - 0.06, v, 0.14], [b, r + 0.28 + v / 2, l - 0.03], h)), g(0.5) && i.add(R("coping", [x - 0.14, 0.05, 0.22], [b, r + 0.28 + v, l - 0.03], e.stone));
  }
  if (g(0.62)) {
    const p = Pv(e);
    p.position.set(f(-n / 2 + 1.1, n / 2 - 1.1), _, f(-s / 2 + 1.1, s / 2 - 1.4)), i.add(p);
  }
  if (g(0.45)) {
    const p = Iv(e);
    p.position.set(f(-n / 2 + 1.2, n / 2 - 1.2), _, f(-s / 2 + 1.2, 0)), p.rotation.y = f(-0.3, 0.3), i.add(p);
  }
  if (g(0.7)) {
    const p = Lv(e);
    p.position.set(f(-n / 2 + 0.7, n / 2 - 0.7), _, f(-s / 2 + 0.8, s / 2 - 1.2)), i.add(p);
  }
  if (g(0.65)) {
    const p = 1 + Math.floor(d() * 2);
    for (let x = 0; x < p; x++) {
      const b = Zl(e, { w: 0.72, h: 0.48, d: 0.3 });
      b.position.set(f(-n / 2 + 0.9, n / 2 - 0.9), _, f(-s / 2 + 0.9, s / 2 - 1)), b.rotation.y = f(-0.4, 0.4), i.add(b);
    }
  }
  if (g(0.4)) {
    const p = R("pent-roof", [n * 0.52, 0.06, s * 0.46], [-n * 0.18, r + 0.34, -s * 0.2], e.roof);
    p.rotation.z = 0.055, i.add(p);
  }
  if (g(0.5))
    for (let p = 0; p < 2; p++)
      i.add(rt("vent", 0.07, 0.08, 0.5, [f(-n / 2 + 0.8, n / 2 - 0.8), _ + 0.25, f(-s / 2 + 0.8, s / 2 - 1)], e.metalDark, 6));
  if (i.add(rt("downspout-b", 0.04, 0.04, r - 0.35, [-n / 2 + 0.14, (r - 0.35) / 2, l + 0.07], e.metal, 8)), g(0.65) && (i.add(R("gas-meter", [0.4, 0.46, 0.2], [n / 2 - 1, 0.95, l + 0.1], e.metal)), i.add(rt("meter-pipe", 0.03, 0.03, 0.9, [n / 2 - 1, 1.55, l + 0.06], e.metal, 6))), g(0.6)) {
    const p = a + c * Math.max(1, o - 1) - 0.7, x = rt("pipe-run", 0.045, 0.045, n * 0.55, [0, Math.min(p, r - 0.6), l + 0.09], e.metal, 6);
    x.rotation.z = Math.PI / 2, i.add(x);
  }
  if (g(0.55)) {
    const p = Zl(e);
    p.position.set(f(-n / 2 + 1.1, n / 2 - 1.1), f(a + 0.6, Math.max(a + 0.7, r - 0.9)), l), i.add(p);
  }
  if (g(0.3)) {
    const p = Dv(e);
    p.position.set(f(-n / 2 + 1.3, n / 2 - 1.3), 2.42, l), i.add(p);
  }
  if (g(0.5) && o > 1) {
    const p = Nv(e, { w: f(1.6, 2.2) });
    p.position.set(f(-n / 2 + 1.4, n / 2 - 1.4), a + 0.06, l), i.add(p);
  } else if (g(0.5) && o > 1) {
    const p = Uv(e, { w: f(1.2, 1.7) });
    p.position.set(f(-n / 2 + 1.2, n / 2 - 1.2), a + 0.5, l), i.add(p);
  }
  if (g(0.35)) {
    const p = new ae(new vt(0.07, 1.15, 0.42), [e.vinyl, e.vinyl, e.metalDark, e.metalDark, e.metalDark, e.metalDark]);
    p.name = "projecting-sign", p.position.set(-n / 2 + 0.55, Math.min(r - 0.9, 4.3), l + 0.24), p.castShadow = !0, i.add(p), i.add(R("sign-arm", [0.06, 0.06, 0.3], [-n / 2 + 0.55, Math.min(r - 0.9, 4.3) + 0.7, l + 0.14], e.metalDark));
  }
  if (g(0.5)) {
    const p = f(-n / 2 + 1, n / 2 - 1);
    i.add(R("sill-box", [0.5, 0.16, 0.2], [p, a + 0.72, l + 0.12], e.soil));
    for (let x = 0; x < 3; x++) {
      const b = new ae(new Rs(0.1, 0), e.leafA);
      b.position.set(p - 0.15 + x * 0.15, a + 0.87, l + 0.12), b.name = "sill-leaf", i.add(b);
    }
  }
}
function Zn(i, { w: e = 0.5, h: t = 0.42, d: n = 0.4, mat: s = i.bagDark } = {}) {
  const r = new ye(), o = new ae(new Pn(1, 8, 6), s);
  return o.scale.set(e / 2, t / 2, n / 2), o.position.y = t / 2, o.name = "bag", o.castShadow = !0, r.add(o), r.add(rt("bag-tie", 0.05, 0.07, 0.09, [0, t - 0.01, 0], s, 6)), r;
}
function ns(i, { r: e = 0.17, h: t = 0.33, mat: n = i.plasticBlue } = {}) {
  const s = new ye();
  return s.add(rt("bucket", e, e * 0.82, t, [0, t / 2, 0], n, 10)), s.add(rt("bucket-rim", e * 1.05, e * 1.05, 0.03, [0, t, 0], n, 10)), s;
}
function is(i, { mat: e = i.plasticYellow, w: t = 0.42, h: n = 0.27, d: s = 0.3 } = {}) {
  const r = new ye();
  return r.add(R("crate-body", [t, n, s], [0, n / 2, 0], e)), r.add(R("crate-lip", [t + 0.02, 0.03, s + 0.02], [0, n - 0.01, 0], i.woodDark)), r;
}
function Vr(i, { r: e = 0.16, h: t = 0.28, leaf: n = i.leafB } = {}) {
  const s = new ye();
  s.add(rt("pot", e, e * 0.78, t, [0, t / 2, 0], i.rust, 9));
  const r = new ae(new Rs(e * 1.5, 0), n);
  return r.position.y = t + e * 0.9, r.scale.set(1, 1.2, 1), r.name = "pot-leaf", r.castShadow = !0, s.add(r), s;
}
function $l(i) {
  const e = new ye(), t = (n) => {
    const s = new ae(new Cs(0.33, 0.024, 5, 14), i.metalDark);
    s.position.set(n, 0.33, 0), s.name = "wheel", s.castShadow = !0, e.add(s);
  };
  return t(-0.52), t(0.52), Ks(e, i, new M(-0.52, 0.33, 0), new M(-0.08, 0.72, 0), 0.022, i.metal), Ks(e, i, new M(-0.08, 0.72, 0), new M(0.28, 0.7, 0), 0.022, i.metal), Ks(e, i, new M(0.28, 0.7, 0), new M(0.52, 0.33, 0), 0.022, i.metal), Ks(e, i, new M(-0.08, 0.72, 0), new M(0, 0.34, 0), 0.022, i.metal), Ks(e, i, new M(0, 0.34, 0), new M(0.52, 0.33, 0), 0.022, i.metal), e.add(R("seat", [0.24, 0.05, 0.1], [-0.16, 0.76, 0], i.woodDark)), e.add(R("handlebar", [0.04, 0.05, 0.42], [0.3, 0.8, 0], i.metalDark)), e.add(R("basket", [0.28, 0.2, 0.24], [0.42, 0.62, 0], i.metal)), e;
}
function Jl(i) {
  const e = new ye(), t = R("aframe-a", [0.6, 0.85, 0.035], [0, 0.46, 0.13], i.signStand);
  t.rotation.x = 0.16;
  const n = R("aframe-b", [0.6, 0.85, 0.035], [0, 0.46, -0.13], i.signStand);
  return n.rotation.x = -0.16, e.add(t, n), e.add(R("aframe-foot", [0.6, 0.04, 0.4], [0, 0.02, 0], i.metalDark)), e;
}
function Fv(i) {
  const e = new ye();
  e.add(R("nobori-base", [0.36, 0.06, 0.36], [0, 0.03, 0], i.metalDark)), e.add(rt("nobori-pole", 0.022, 0.028, 1.95, [0, 1, 0], i.metal, 6));
  const t = new ae(new an(0.42, 1.2), i.noboriCloth);
  return t.position.set(0.24, 1.36, 0), t.name = "nobori-cloth", t.castShadow = !0, e.add(t), e;
}
function Ov(i) {
  const e = new ye();
  e.add(R("v-body", [0.9, 1.82, 0.72], [0, 0.91, 0], i.metal)), e.add(R("v-glass", [0.7, 0.95, 0.04], [0, 1.15, 0.37], i.glass));
  for (let t = 0; t < 3; t++)
    for (let n = 0; n < 3; n++) {
      const s = new ae(new As(0.045, 0.12, 3, 6), t === 1 ? i.bottleGreen : i.bottle);
      s.position.set(-0.2 + n * 0.2, 1.35 - t * 0.28, 0.28), s.name = "bottle", e.add(s);
    }
  return e.add(R("v-slot", [0.28, 0.16, 0.04], [0.2, 0.55, 0.37], i.metalDark)), e;
}
function gt(i, e, t, n, s = 0) {
  var o;
  e.position.set(t, 0, n), e.rotation.y = s, i.add(e), e.updateMatrixWorld(!0);
  const r = new In().setFromObject(e);
  return i.userData.footprints || (i.userData.footprints = []), i.userData.footprints.push({
    name: ((o = e.children[0]) == null ? void 0 : o.name) || "prop",
    min: [Number(r.min.x.toFixed(2)), Number(r.min.z.toFixed(2))],
    max: [Number(r.max.x.toFixed(2)), Number(r.max.z.toFixed(2))],
    height: Number(r.max.y.toFixed(2))
  }), e;
}
function Bv(i) {
  const e = new ye();
  e.name = "clutter-sidewalk", gt(e, Zn(i, { w: 0.52, h: 0.44 }), -11.35, -5.74, 0.4), gt(e, Zn(i, { w: 0.44, h: 0.36, mat: i.bagLight }), -10.98, -5.7, -0.2), gt(e, is(i, { mat: i.plasticYellow }), -10.55, -5.76, 0.15);
  const t = is(i, { mat: i.plasticBlue });
  t.position.set(-10.55, 0.28, -5.76), e.add(t), e.userData.footprints && e.userData.footprints.push({ name: "crate-body", min: [-10.76, -5.91], max: [-10.34, -5.61], height: 0.55 }), gt(e, ns(i), -7.18, -5.74, 0.2), gt(e, ns(i, { mat: i.plasticYellow }), -6.86, -5.8, -0.3), gt(e, Jl(i), -7.02, -5.62, 0.34), gt(e, Fv(i), -7.62, -5.7, 0.1), gt(e, Ov(i), 13.45, -5.5, 0.03), gt(e, Zn(i, { w: 0.46, h: 0.4 }), 12, -5.72, 0.6), gt(e, ns(i), 11.72, -5.76, 0), gt(e, Zn(i, { w: 0.5, h: 0.42 }), -8.6, 11.12, Math.PI), gt(e, is(i, { mat: i.plasticBlue }), -8.1, 11.14, Math.PI + 0.2), gt(e, Vr(i), -2.35, 11.12, Math.PI), gt(e, Jl(i), -2.05, 11, Math.PI - 0.25), gt(e, Zn(i, { w: 0.44, h: 0.36, mat: i.bagLight }), 2.2, 11.14, Math.PI), gt(e, ns(i, { mat: i.plasticYellow }), 12, 11.12, Math.PI);
  const n = new ye();
  return n.name = "clutter-alley", gt(n, Zn(i, { w: 0.54, h: 0.46 }), -11.5, -13.28, 0.2), gt(n, Zn(i, { w: 0.46, h: 0.38, mat: i.bagLight }), -11.08, -13.24, 1.1), gt(n, is(i, { mat: i.plasticYellow }), -10.3, -13.26, 0.1), gt(n, Vr(i, { leaf: i.leafC }), -2.72, -13.26, 0), gt(n, ns(i), 3.9, -13.3, 0.2), gt(n, ns(i, { mat: i.plasticYellow }), 4.22, -13.24, -0.1), gt(n, $l(i), 5.9, -13.34, 0.06), gt(n, is(i, { mat: i.plasticBlue }), -3.6, -17.15, 0.4), gt(n, Zn(i, { w: 0.5, h: 0.4 }), -3.1, -17.1, 0.3), gt(n, $l(i), -13.95, -9.2, Math.PI / 2), gt(n, Vr(i), -19.2, -12, 0), gt(n, Vr(i, { leaf: i.leafA }), -18.8, -12.4, 0.5), gt(n, is(i, { mat: i.plasticYellow }), -18.9, -13.4, 0.5), gt(n, Zn(i, { w: 0.46, h: 0.4 }), -18.4, -13.35, 0.2), { sidewalk: e, alley: n };
}
function kv(i) {
  const e = new ye();
  e.name = "ground-detail", e.userData.ignoreBounds = !1;
  const t = 0.166, n = 0.047;
  Xt(Ns("ground-detail"));
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
    const g = new ae(new hn(d, d, 0.02, 14), i.metalDark);
    g.position.set(h, f, u), g.name = "cover", g.castShadow = !1, e.add(g);
  };
  o(-7.4, -3, 0.36, t), o(6.9, 1.9, 0.5, n), o(9.6, 10.4, 0.33, t), o(-13.3, 6.9, 0.28, n), e.add(R("utility-lid", [0.42, 0.02, 0.3], [-2.9, t, -4.5], i.metal)), e.add(R("drain", [0.55, 0.02, 0.9], [5.2, n, 0.95], i.metalDark));
  const a = (h, u, d, f, g, _) => {
    const m = new ae(new dc(1, 12), i.puddle);
    m.rotation.x = -Math.PI / 2, m.rotation.z = g, m.scale.set(d, f, 1), m.position.set(h, _, u), m.name = "puddle", m.castShadow = !1, m.receiveShadow = !1, e.add(m);
  };
  a(-10.2, -3.9, 0.7, 0.42, 0.3, t + 1e-3), a(-4.4, -3.4, 0.55, 0.33, -0.4, t + 1e-3), a(-2.2, 2.4, 1.1, 0.5, 0.15, n), a(7.2, 5.6, 1.4, 0.6, -0.2, n), a(12.6, 1.1, 0.9, 0.45, 0.5, n), a(-5, -15.3, 0.8, 0.5, 0.2, 0.086), a(27.2, 11.8, 1, 0.55, 0.1, 0.082);
  const c = R("oil", [2.6, 8e-3, 1.1], [-3.6, n, 4.4], i.interior);
  c.rotation.y = 0.18, c.castShadow = !1, e.add(c);
  const l = R("oil-b", [1.6, 8e-3, 0.8], [9, n, 2], i.interior);
  return l.rotation.y = -0.3, l.castShadow = !1, e.add(l), e;
}
function zv(i) {
  const e = new ye();
  e.name = "far-town", e.userData.ignoreBounds = !0;
  const t = Xt(Ns("far-town")), n = (l, h) => l + t() * (h - l), s = (l) => {
    l.userData.ignoreBounds = !0, l.castShadow = !1, l.receiveShadow = !1, e.add(l);
  }, r = i.asphalt.clone();
  r.map = i.asphalt.map.clone(), r.map.repeat.set(18, 3), r.map.wrapS = Qt, r.map.wrapT = Qt, s(R("road-far-w", [96, 0.04, 9], [-78, 0.02, 3.2], r)), s(R("road-far-e", [90, 0.04, 9], [79, 0.02, 3.2], r)), s(R("road-far-n", [7, 0.04, 60], [-20, 0.02, -50], r)), s(R("walk-far-w", [96, 0.16, 2.2], [-78, 0.08, -2.6], i.concretePlain)), s(R("walk-far-e", [90, 0.16, 2.2], [79, 0.08, -2.6], i.concretePlain));
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
    s(rt("far-pole", 0.12, 0.16, 7, [h, 3.5, 8.6], i.concretePlain, 6)), s(rt("far-pole-w", 0.12, 0.16, 7, [-h, 3.5, 8.6], i.concretePlain, 6)), s(R("far-wall", [10.4, 0.9, 0.3], [h + 5.4, 0.45, -2.4], i.plasterC)), s(R("far-wall-w", [10.4, 0.9, 0.3], [-h - 5.4, 0.45, -2.4], i.plasterC)), s(R("far-wall-s", [10.4, 0.9, 0.3], [h + 5.4, 0.45, 12.6], i.plasterC));
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
  return c(-30, -26, 5, 60, 0.42), c(28, 22, 4.4, 54, -0.5), c(2, -52, 46, 4, 0.06), Ts(e), e;
}
function Us(i, e, t, n, s, r) {
  const o = i.getImageData(0, 0, e, t), a = o.data;
  for (let c = 0; c < a.length; c += 4) {
    const l = (n() - 0.5) * r;
    a[c] = s[0] + l, a[c + 1] = s[1] + l, a[c + 2] = s[2] + l * 0.85, a[c + 3] = 255;
  }
  i.putImageData(o, 0, 0);
}
function Hv() {
  return un(512, 512, (i, e, t) => {
    const n = Xt(11);
    Us(i, e, t, n, [52, 53, 56], 22), i.strokeStyle = "rgba(40,40,42,0.55)", i.lineWidth = 1.2;
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
function Ql() {
  return un(512, 512, (i, e, t) => {
    const n = Xt(21);
    Us(i, e, t, n, [168, 164, 156], 18), i.strokeStyle = "rgba(90,86,80,0.65)", i.lineWidth = 3, i.strokeRect(8, 8, e - 16, t - 16), i.strokeStyle = "rgba(120,116,108,0.45)", i.beginPath(), i.moveTo(e * 0.5, 8), i.lineTo(e * 0.5, t - 8), i.moveTo(8, t * 0.5), i.lineTo(e - 8, t * 0.5), i.stroke();
  });
}
function Gr(i, e) {
  return un(512, 512, (t, n, s) => {
    const r = Xt(i);
    Us(t, n, s, r, e, 16), t.fillStyle = "rgba(90,70,50,0.08)";
    for (let o = 0; o < 40; o++)
      t.fillRect(r() * n, r() * s, 2 + r() * 6, 20 + r() * 80);
    t.fillStyle = "rgba(255,255,255,0.04)";
    for (let o = 0; o < 8; o++)
      t.fillRect(r() * n, r() * s, 40 + r() * 80, 24 + r() * 40);
  });
}
function Vv() {
  return un(256, 256, (i, e, t) => {
    const n = Xt(31);
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
function eh(i, e) {
  return un(256, 256, (t, n, s) => {
    const r = Xt(i);
    t.fillStyle = `rgb(${e[0]},${e[1]},${e[2]})`, t.fillRect(0, 0, n, s);
    for (let o = 0; o < s; o++) {
      const a = (r() - 0.5) * 18;
      t.fillStyle = `rgba(40,24,12,${0.05 + r() * 0.08})`, t.fillRect(0, o, n, 1), o % 17 === 0 && (t.strokeStyle = "rgba(30,16,8,0.35)", t.beginPath(), t.moveTo(0, o), t.bezierCurveTo(n * 0.3, o + a, n * 0.6, o - a, n, o + a * 0.3), t.stroke());
    }
  });
}
function Gv() {
  return un(128, 64, (i, e, t) => {
    const n = Xt(41);
    i.fillStyle = "#e7e1d6", i.fillRect(0, 0, e, t), i.strokeStyle = "rgba(60,50,40,0.35)";
    for (let s = 0; s < 30; s++)
      i.beginPath(), i.moveTo(n() * e, 0), i.lineTo(n() * e, t), i.stroke();
  });
}
function Wv() {
  return un(256, 256, (i, e, t) => {
    const n = Xt(51);
    Us(i, e, t, n, [92, 98, 104], 12), i.fillStyle = "rgba(255,255,255,0.05)";
    for (let s = 20; s < t; s += 36) i.fillRect(0, s, e, 3);
  });
}
function Xv() {
  return un(128, 256, (i, e, t) => {
    i.fillStyle = "#8d9298", i.fillRect(0, 0, e, t);
    for (let n = 0; n < t; n += 10)
      i.fillStyle = n % 20 === 0 ? "#6a7076" : "#b7bcc2", i.fillRect(0, n, e, 7);
  });
}
function qv() {
  return un(128, 128, (i, e, t) => {
    const n = Xt(61);
    i.fillStyle = "#d5e2ea", i.fillRect(0, 0, e, t);
    for (let s = 0; s < 80; s++)
      i.fillStyle = `rgba(255,255,255,${0.05 + n() * 0.15})`, i.fillRect(n() * e, n() * t, 8, 2);
  });
}
function js(i, e) {
  return un(128, 128, (t, n, s) => {
    for (let r = 0; r < n; r += 16)
      t.fillStyle = r / 16 % 2 === 0 ? i : e, t.fillRect(r, 0, 16, s);
  });
}
function En(i, e, t, n) {
  return un(512, 256, (s, r, o) => {
    s.fillStyle = t, s.fillRect(0, 0, r, o), s.strokeStyle = n, s.lineWidth = 10, s.strokeRect(8, 8, r - 16, o - 16), s.fillStyle = n, s.textAlign = "center", s.textBaseline = "middle", s.font = '700 86px "Yu Gothic", Meiryo, "MS PGothic", sans-serif', s.fillText(i, r / 2, e ? o * 0.42 : o * 0.52), e && (s.font = '500 40px "Yu Gothic", Meiryo, "MS PGothic", sans-serif', s.fillText(e, r / 2, o * 0.74));
  });
}
function Yv() {
  return un(256, 256, (i, e, t) => {
    const n = Xt(71);
    Us(i, e, t, n, [158, 148, 134], 14);
    for (let s = 0; s < 5; s++)
      for (let r = 0; r < 4; r++) {
        const o = 14 + r * 60 + n() * 6, a = 14 + s * 48 + n() * 5;
        i.fillStyle = n() < 0.3 ? "rgba(70,62,52,0.85)" : "rgba(52,48,44,0.6)", i.fillRect(o, a, 34, 28), n() < 0.22 && (i.fillStyle = "rgba(255,206,142,0.5)", i.fillRect(o + 2, a + 2, 30, 24));
      }
    i.fillStyle = "rgba(255,255,255,0.05)";
    for (let s = 0; s < 12; s++) i.fillRect(n() * e, n() * t, 30 + n() * 40, 3);
  });
}
function Kv() {
  return un(256, 256, (i, e, t) => {
    const n = Xt(73);
    i.fillStyle = "#5d6673", i.fillRect(0, 0, e, t);
    for (let s = 0; s < 9; s++)
      for (let r = 0; r < 6; r++)
        i.fillStyle = n() < 0.35 ? "rgba(150,158,170,0.55)" : "rgba(66,74,86,0.7)", i.fillRect(10 + r * 40, 8 + s * 27, 24, 17);
  });
}
function jv() {
  return un(256, 256, (i, e, t) => {
    const n = Xt(81);
    Us(i, e, t, n, [104, 98, 86], 16);
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
function Pt(i, e, t = 0.85, n = 0) {
  return new re({ map: i, color: e, roughness: t, metalness: n });
}
function Zv() {
  const i = Gv();
  i.wrapS = Qt, i.wrapT = Qt, i.repeat.set(2, 1);
  const e = {
    asphalt: Pt(Hv(), "#ffffff", 0.92),
    concrete: Pt(Ql(), "#ffffff", 0.9),
    plasterA: Pt(Gr(101, [156, 140, 120]), "#ffffff", 0.94),
    plasterB: Pt(Gr(102, [138, 126, 110]), "#ffffff", 0.93),
    plasterC: Pt(Gr(103, [122, 114, 102]), "#ffffff", 0.92),
    brick: Pt(Vv(), "#ffffff", 0.86),
    wood: Pt(eh(201, [112, 74, 48]), "#ffffff", 0.8),
    woodDark: Pt(eh(202, [62, 40, 28]), "#ffffff", 0.75),
    roof: Pt(Wv(), "#ffffff", 0.95),
    slat: Pt(Xv(), "#ffffff", 0.55, 0.35),
    fiber: Pt(i, "#ffffff", 0.8),
    frost: new re({
      map: qv(),
      color: "#e7f2f6",
      roughness: 0.35,
      metalness: 0,
      transparent: !0,
      opacity: 0.78
    }),
    glass: new re({
      color: "#9ec4d4",
      roughness: 0.08,
      metalness: 0.05,
      transparent: !0,
      opacity: 0.38
    }),
    glassDark: new re({
      color: "#1c2830",
      roughness: 0.2,
      metalness: 0.1,
      transparent: !0,
      opacity: 0.72
    }),
    metal: new re({ color: "#8e9398", roughness: 0.45, metalness: 0.72 }),
    metalDark: new re({ color: "#3e444a", roughness: 0.5, metalness: 0.6 }),
    brass: new re({ color: "#b08a45", roughness: 0.38, metalness: 0.75 }),
    pad: new re({ color: "#8d2a2a", roughness: 0.7, metalness: 0.02 }),
    ropeRed: new re({ map: i, color: "#c43838", roughness: 0.82 }),
    ropeWhite: new re({ map: i, color: "#f3efe6", roughness: 0.82 }),
    ropeBlue: new re({ map: i, color: "#2a4c86", roughness: 0.82 }),
    leafA: new re({ color: "#7ba648", roughness: 0.65, metalness: 0.02 }),
    leafB: new re({ color: "#5a8236", roughness: 0.72, metalness: 0.02 }),
    leafC: new re({ color: "#3d5c24", roughness: 0.8, metalness: 0.01 }),
    leafSun: new re({ color: "#96c257", roughness: 0.58, metalness: 0.02 }),
    bark: new re({ color: "#4d3a2b", roughness: 0.92 }),
    barkBranch: new re({ color: "#5a4635", roughness: 0.88 }),
    paintCar: new $t({
      color: "#5b7d99",
      roughness: 0.28,
      metalness: 0.35,
      clearcoat: 1,
      clearcoatRoughness: 0.08
    }),
    paintCarParked: new $t({
      color: "#6e8594",
      roughness: 0.25,
      metalness: 0.45,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    }),
    paintCarTraffic: new $t({
      color: "#2e373d",
      roughness: 0.25,
      metalness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.06
    }),
    paintCarLot: new $t({
      color: "#693732",
      roughness: 0.42,
      metalness: 0.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3
    }),
    headlampGlass: new $t({
      color: "#ffffff",
      transmission: 0.85,
      opacity: 1,
      transparent: !0,
      roughness: 0.1,
      ior: 1.5
    }),
    headlampInner: new re({
      color: "#f8f8f8",
      emissive: "#ffeec8",
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.85
    }),
    tailRed: new re({
      color: "#a31818",
      emissive: "#590d0d",
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.2
    }),
    turnAmber: new re({
      color: "#d47b1c",
      roughness: 0.25,
      metalness: 0.2
    }),
    reverseWhite: new re({
      color: "#e8edf0",
      roughness: 0.2,
      metalness: 0.1
    }),
    plateWhite: new re({
      color: "#e4ebed",
      roughness: 0.4,
      metalness: 0.1
    }),
    plateGreen: new re({
      color: "#245a3a",
      roughness: 0.4
    }),
    carGlass: new $t({
      color: "#283842",
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.72,
      opacity: 1,
      transparent: !0,
      ior: 1.52
    }),
    carTrimBlack: new re({ color: "#181b1d", roughness: 0.75, metalness: 0.1 }),
    mirrorGlass: new re({ color: "#cfd8dc", roughness: 0.05, metalness: 0.95 }),
    brakeDisc: new re({ color: "#8c959a", roughness: 0.3, metalness: 0.85 }),
    tire: new re({ color: "#181a1b", roughness: 0.92 }),
    wheelAlloy: new re({ color: "#d0d6dc", roughness: 0.25, metalness: 0.75 }),
    trim: new re({ color: "#d9d4cc", roughness: 0.4, metalness: 0.4 }),
    matRed: new re({ color: "#a33b3b", roughness: 0.85 }),
    matBlue: new re({ color: "#2f4f86", roughness: 0.85 }),
    stone: Pt(Gr(301, [214, 208, 196]), "#ffffff", 0.8),
    gold: new re({ color: "#c6a15a", roughness: 0.4, metalness: 0.65 }),
    produce: Pt(js("#8e342c", "#cfc6b6"), "#ffffff", 0.82),
    detectiveAwning: Pt(js("#16332d", "#d5cec0"), "#ffffff", 0.8),
    shutterAwning: Pt(js("#8a6828", "#d2c6ae"), "#ffffff", 0.82),
    dinerAwning: Pt(js("#7a3030", "#e7d7bf"), "#ffffff", 0.82),
    hangoutAwning: Pt(js("#243044", "#d8c48a"), "#ffffff", 0.8),
    cable: new re({ color: "#5c6166", roughness: 0.48, metalness: 0.72 }),
    cableWarn: new re({ color: "#6e2e2a", roughness: 0.62, metalness: 0.35 }),
    bronze: new re({ color: "#7a5a32", roughness: 0.42, metalness: 0.62 }),
    gongBox: new re({ color: "#6a2420", roughness: 0.55, metalness: 0.15 }),
    plate: new re({ color: "#8a8e92", roughness: 0.4, metalness: 0.78 }),
    interior: new re({ color: "#3a322b", roughness: 1 }),
    interiorFloor: new re({ color: "#6a5342", roughness: 0.85 }),
    cabbage: new re({ color: "#7ea24a", roughness: 0.8 }),
    bottle: new re({ color: "#d35a3a", roughness: 0.3 }),
    signDetective: new re({
      map: En("私立探偵", "タンク", "#1c2a26", "#f3efe4"),
      roughness: 0.6
    }),
    signProduce: new re({
      map: En("青果", "", "#f4efe4", "#5a2e24"),
      roughness: 0.65
    }),
    signCivic: new re({
      map: En("市役所", "", "#efeae2", "#2c3330"),
      roughness: 0.55
    }),
    signDiner: new re({
      map: En("食堂", "", "#f3efe6", "#6a2e28"),
      roughness: 0.62
    }),
    signOffice: new re({
      map: En("会社", "", "#e7e4de", "#243038"),
      roughness: 0.5
    }),
    signShop: new re({
      map: En("雑貨", "", "#f4efe4", "#3e3428"),
      roughness: 0.65
    }),
    signHangout: new re({
      map: En("ゲーム", "", "#1e2430", "#f0d78c"),
      roughness: 0.45
    }),
    signNoVehicle: new re({
      map: En("進入禁止", "歩行者", "#f4efe6", "#6e2e2a"),
      roughness: 0.55
    }),
    signWorks: new re({
      map: En("工事中", "", "#e6d7a4", "#2c3330"),
      roughness: 0.7
    }),
    water: new re({
      color: "#3f6f78",
      roughness: 0.18,
      metalness: 0.22,
      transparent: !0,
      opacity: 0.9
    }),
    waterBed: new re({ color: "#1d3338", roughness: 0.95 }),
    flower: new re({ color: "#c45a62", roughness: 0.8 }),
    flowerB: new re({ color: "#e2c56a", roughness: 0.8 }),
    grass: new re({ color: "#5d7840", roughness: 1 }),
    earth: new re({ color: "#6a6458", roughness: 1 }),
    lantern: new re({
      color: "#ffd7a8",
      emissive: "#ff8a3a",
      emissiveIntensity: 0.85,
      roughness: 0.4
    }),
    skySil: new re({
      color: "#66707e",
      roughness: 1,
      emissive: "#3a4452",
      emissiveIntensity: 0.45
    }),
    soil: new re({ color: "#5c4634", roughness: 1 }),
    hardPad: Pt(Ql(), "#cfc8bc", 0.78),
    concretePlain: new re({ color: "#c8c2b6", roughness: 0.9 }),
    curtain: new re({ color: "#d8cfc2", roughness: 0.95 }),
    bulb: new re({ color: "#ffd7a1", emissive: "#ffb15a", emissiveIntensity: 0.8, roughness: 0.4 }),
    cardboard: new re({ color: "#b8894f", roughness: 0.95 }),
    bottleGreen: new re({ color: "#3e8a62", roughness: 0.28 }),
    // pass9: street life props and far scenery
    clothA: new re({ color: "#dfe4e6", roughness: 0.95, side: Jt }),
    clothB: new re({ color: "#b9524c", roughness: 0.95, side: Jt }),
    tarp: new re({ color: "#4f6b5f", roughness: 0.92 }),
    vinyl: new re({ color: "#cfc7b4", roughness: 0.72 }),
    rust: new re({ color: "#6e4a34", roughness: 0.95, metalness: 0.1 }),
    tank: new re({ color: "#b9b3a4", roughness: 0.85 }),
    bagDark: new re({ color: "#2f3a37", roughness: 0.85 }),
    bagLight: new re({ color: "#b9b7a8", roughness: 0.9 }),
    plasticBlue: new re({ color: "#3f6480", roughness: 0.65 }),
    plasticYellow: new re({ color: "#b89a45", roughness: 0.7 }),
    puddle: new re({
      color: "#4a5560",
      roughness: 0.05,
      metalness: 0.35,
      transparent: !0,
      opacity: 0.72
    }),
    patch: new re({ color: "#a8a49a", roughness: 0.92 }),
    gravel: new re({ color: "#7b7264", roughness: 1 }),
    earthGround: Pt(jv(), "#ffffff", 1),
    farWall: Pt(Yv(), "#ffffff", 0.95),
    skyWin: Pt(Kv(), "#9aa4b2", 1),
    noboriCloth: new re({
      map: En("特売", "本日", "#f2ead8", "#8a2a22"),
      roughness: 0.85,
      side: Jt
    }),
    signStand: new re({
      map: En("営業中", "入ってください", "#f2ead8", "#3d2c22"),
      roughness: 0.7
    })
  };
  e.asphalt.map.repeat.set(4, 4), e.concrete.map.repeat.set(2, 2), e.brick.map.repeat.set(3, 2);
  for (const t of ["plasterA", "plasterB", "plasterC", "brick"])
    Cv(e[t], { amount: t === "brick" ? 0.26 : 0.34, height: t === "brick" ? 1.2 : 3 });
  return e.earthGround.map.repeat.set(26, 26), e;
}
function Zt(i, e, { x: t, y: n, w: s, h: r, zOuter: o }) {
  const a = e.wood, c = 0.055, l = o + 0.02;
  i.add(R("win-l", [c, r, 0.07], [t - s / 2 + c / 2, n, l], a)), i.add(R("win-r", [c, r, 0.07], [t + s / 2 - c / 2, n, l], a)), i.add(R("win-top", [s, c, 0.07], [t, n + r / 2 - c / 2, l], a)), i.add(R("win-bot", [s, c, 0.07], [t, n - r / 2 + c / 2, l], a)), i.add(R("muntin-v", [0.035, r - 0.12, 0.025], [t, n, l + 0.02], a)), i.add(R("muntin-h", [s - 0.12, 0.035, 0.025], [t, n, l + 0.02], a)), i.add(R("sill", [s + 0.1, 0.045, 0.16], [t, n - r / 2, o + 0.06], e.stone)), i.add(R("reveal", [s - 0.08, r - 0.08, 0.18], [t, n, o - 0.12], e.interior));
  const h = new ae(new an(s - 0.12, r - 0.12), e.glass);
  h.name = "glass", h.position.set(t, n, o - 0.02), h.castShadow = !1, i.add(h);
  const u = new ae(new an((s - 0.2) * 0.42, r - 0.28), e.curtain);
  u.position.set(t - s * 0.22, n - 0.05, o - 0.2), u.name = "curtain", i.add(u);
}
function th(i, e, t, n) {
  const s = new M().subVectors(n, t), r = s.length(), o = new ae(new hn(0.028, 0.028, r, 6), e.metal);
  o.position.copy(t).add(n).multiplyScalar(0.5), o.quaternion.setFromUnitVectors(new M(0, 1, 0), s.normalize()), o.castShadow = !0, o.name = "awning-strut", i.add(o);
}
function au(i, e, t, { width: n, y: s, z: r }) {
  t.side = Jt;
  const o = 1.2, a = new an(n, o, 28, 8);
  a.rotateX(-Math.PI / 2);
  const c = a.attributes.position;
  for (let g = 0; g < c.count; g++) {
    const _ = c.getX(g), p = (c.getZ(g) + o / 2) / o, x = Math.sin(_ / n * Math.PI * 5) * 0.04 * p;
    c.setY(g, -p * p * 0.2 - x);
  }
  a.computeVertexNormals();
  const l = new ae(a, t);
  l.name = "awning", l.position.set(0, s, r + o / 2), l.castShadow = !0, l.receiveShadow = !0, i.add(l);
  const h = new an(n, 0.34, 32, 1), u = h.attributes.position;
  for (let g = 0; g < u.count; g++)
    if (u.getY(g) < 0) {
      const _ = u.getX(g);
      u.setY(g, -0.17 - Math.abs(Math.sin(_ / n * Math.PI * 6)) * 0.14);
    }
  h.computeVertexNormals();
  const d = new ae(h, t);
  d.name = "valance", d.position.set(0, s - 0.28, r + o), d.castShadow = !0, i.add(d), i.add(R("awning-bar", [n + 0.08, 0.045, 0.045], [0, s, r], e.metal));
  const f = n / 2 - 0.16;
  th(i, e, new M(-f, s - 0.55, r + 0.05), new M(-f, s - 0.16, r + o * 0.92)), th(i, e, new M(f, s - 0.55, r + 0.05), new M(f, s - 0.16, r + o * 0.92));
}
function cu(i, e, t, { x: n, y: s, z: r }) {
  const o = new ae(new vt(0.08, 0.72, 1.15), [
    t,
    t,
    e.woodDark,
    e.woodDark,
    e.woodDark,
    e.woodDark
  ]);
  o.name = "blade-sign", o.position.set(n, s, r), o.castShadow = !0, i.add(o), i.add(R("sign-bracket", [0.06, 0.06, 0.7], [n, s + 0.4, r - 0.15], e.metalDark));
}
function lu(i, e, { W: t, floors: n, groundH: s, upperH: r, zOuter: o, wall: a, rand: c }) {
  for (let l = 0; l < n - 1; l++) {
    const h = s + l * r, u = t > 6 ? 3 : 2, d = t - 1.35, f = Math.min(0.96, d / u - 0.28), g = 1.28, _ = h + 1.42;
    for (let m = 0; m < u; m++) {
      const p = u === 1 ? 0 : -d / 2 + d * m / (u - 1), x = c ? (c() - 0.5) * 0.22 : 0, b = c ? (c() - 0.5) * 0.16 : 0, v = c ? 0.92 + c() * 0.16 : 1;
      Zt(i, e, { x: p + x, y: _ + b, w: f * v, h: g, zOuter: o });
    }
    i.add(R("belt", [t + 0.08, 0.12, 0.2], [0, h, o + 0.02], a === "brick" ? e.stone : e.brick));
  }
}
function hu(i, e, { W: t, D: n, H: s, wallMat: r }) {
  i.add(R("side-l", [0.2, s, n], [-t / 2 + 0.2 / 2, s / 2, 0], r)), i.add(R("side-r", [0.2, s, n], [t / 2 - 0.2 / 2, s / 2, 0], r)), i.add(R("back", [t, s, 0.2], [0, s / 2, -n / 2 + 0.2 / 2], r)), i.add(R("water-table", [t + 0.08, 0.38, n + 0.06], [0, 0.19, 0], e.brick)), i.add(R("cornice", [t + 0.36, 0.16, n + 0.28], [0, s - 0.02, 0.06], e.stone)), i.add(R("roof", [t - 0.15, 0.1, n - 0.15], [0, s + 0.06, 0], e.roof)), i.add(R("parapet-f", [t + 0.1, 0.38, 0.12], [0, s + 0.28, n / 2 - 0.02], r)), i.add(R("parapet-b", [t + 0.1, 0.38, 0.12], [0, s + 0.28, -n / 2 + 0.02], r)), i.add(R("parapet-l", [0.12, 0.38, n], [-t / 2, s + 0.28, 0], r)), i.add(R("parapet-r", [0.12, 0.38, n], [t / 2, s + 0.28, 0], r)), i.add(rt("downspout", 0.035, 0.035, s - 0.2, [t / 2 + 0.02, s / 2, n / 2 - 0.15], e.metal, 8));
}
function Qo(i, e) {
  const t = new ye();
  Tt(t, {
    id: e.id,
    kind: "building",
    assumption: e.assumption || null,
    gameplay: e.gameplay || null
  });
  const n = e.width, s = e.depth, r = e.floors, o = 3.35, a = 2.8, c = o + a * (r - 1), l = s / 2, h = i[e.wall], u = Xt(Ns(e.id) ^ 2654435769);
  return hu(t, i, { W: n, D: s, H: c, wallMat: h }), t.add(R("pier-l", [0.28, o, 0.18], [-n / 2 + 0.22, o / 2, l], h)), t.add(R("pier-r", [0.28, o, 0.18], [n / 2 - 0.22, o / 2, l], h)), t.add(R("bulkhead", [n - 0.5, 0.62, 0.16], [0, 0.31, l], i.woodDark)), t.add(R("shop-header", [n, 0.42, 0.18], [0, 3.05, l], h)), t.add(R("interior-floor", [n - 0.45, 0.06, s - 0.5], [0, 0.08, -0.1], i.interiorFloor)), t.add(R("interior-ceiling", [n - 0.45, 0.08, s - 0.55], [0, o - 0.08, -0.15], i.interior)), lu(t, i, { W: n, floors: r, groundH: o, upperH: a, zOuter: l, wall: e.wall, rand: u }), e.side && du(t, i, { W: n, floors: r, groundH: o, upperH: a, side: e.side }), au(t, i, e.awning, { width: n - 0.7, y: 2.82, z: l }), e.shop === "detective" && nx(t, i, { W: n, D: s, zOuter: l }), e.shop === "produce" && ix(t, i, { W: n, zOuter: l }), e.shop === "shutter" && sx(t, i, { W: n, zOuter: l, H: c }), Nt(t, new M(0, 1.6, l + 0.2)), It(t), ou(t, i, { W: n, D: s, H: c, floors: r, groundH: o, upperH: a, zOuter: l, wallMat: h, id: e.id }), Ts(t), t;
}
function uu(i, e) {
  const t = new ye();
  Tt(t, {
    id: e.id,
    kind: "building",
    assumption: e.assumption || null
  });
  const n = e.width, s = e.depth, r = e.floors, o = 3.35, a = 2.8, c = o + a * (r - 1), l = s / 2, h = i[e.wall], u = Xt(Ns(e.id) ^ 2654435769);
  return hu(t, i, { W: n, D: s, H: c, wallMat: h }), t.add(R("pier-l", [0.22, o, 0.16], [-n / 2 + 0.18, o / 2, l], h)), t.add(R("pier-r", [0.22, o, 0.16], [n / 2 - 0.18, o / 2, l], h)), t.add(R("shop-header", [n, 0.36, 0.16], [0, 3.05, l], h)), lu(t, i, { W: n, floors: r, groundH: o, upperH: a, zOuter: l, wall: e.wall, rand: u }), e.side && du(t, i, { W: n, floors: r, groundH: o, upperH: a, side: e.side }), $v(t, i, { W: n, floors: r, groundH: o, upperH: a, D: s }), e.awning && au(t, i, e.awning, { width: n - 0.6, y: 2.82, z: l }), e.ground === "diner" && Jv(t, i, { W: n, zOuter: l }), e.ground === "office" && Qv(t, i, { W: n, zOuter: l, floors: r }), e.ground === "shop" && ex(t, i, { W: n, zOuter: l }), e.ground === "hangout" && tx(t, i, { W: n, zOuter: l }), Nt(t, new M(0, 1.6, l + 0.15)), It(t), ou(t, i, { W: n, D: s, H: c, floors: r, groundH: o, upperH: a, zOuter: l, wallMat: h, id: e.id }), Ts(t), t;
}
function $v(i, e, { W: t, floors: n, groundH: s, upperH: r, D: o }) {
  const a = new ye();
  a.name = "back-windows", a.position.set(0, 0, -o / 2), a.rotation.y = Math.PI;
  const c = t > 6 ? 3 : 2, l = t - 1.5;
  for (let h = 0; h < n; h++) {
    const u = h === 0 ? 1.7 : s + (h - 1) * r + 1.35;
    for (let d = 0; d < c; d++) {
      const f = c === 1 ? 0 : -l / 2 + l * d / (c - 1);
      Zt(a, e, { x: f, y: u, w: 0.85, h: h === 0 ? 1.2 : 1.05, zOuter: 0.02 });
    }
  }
  i.add(a);
}
function Jv(i, e, { W: t, zOuter: n }) {
  i.add(R("glass", [t - 1.3, 1.7, 0.06], [0.15, 1.55, n + 0.02], e.glass)), i.add(R("door", [0.9, 2.1, 0.07], [-t / 2 + 0.85, 1.08, n + 0.05], e.woodDark)), i.add(R("counter", [t - 1.6, 0.9, 0.5], [0.3, 0.48, n - 0.35], e.wood));
  const s = new ae(new vt(Math.min(t - 0.7, 2.4), 0.46, 0.07), e.signDiner);
  s.name = "fascia-sign", s.position.set(0.1, 3.32, n + 0.14), s.castShadow = !0, i.add(s);
}
function Qv(i, e, { W: t, zOuter: n, floors: s }) {
  i.add(R("canopy", [t - 0.8, 0.12, 1.15], [0, 3.15, n + 0.45], e.concretePlain)), i.add(R("door-l", [0.7, 2.2, 0.06], [-0.38, 1.14, n + 0.04], e.glassDark)), i.add(R("door-r", [0.7, 2.2, 0.06], [0.38, 1.14, n + 0.04], e.glassDark));
  const r = Math.min(1.15, (t - 2.4) / 2);
  i.add(R("glass-l", [r, 2.2, 0.05], [-t / 2 + r / 2 + 0.35, 1.35, n + 0.02], e.glassDark)), i.add(R("glass-r", [r, 2.2, 0.05], [t / 2 - r / 2 - 0.35, 1.35, n + 0.02], e.glassDark));
  const o = new ae(new vt(2.2, 0.42, 0.07), e.signOffice);
  o.name = "fascia-sign", o.position.set(0, 3.55, n + 1.05), o.castShadow = !0, i.add(o);
}
function ex(i, e, { W: t, zOuter: n }) {
  i.add(R("shutter", [t - 1.2, 1.15, 0.06], [0, 2.05, n + 0.04], e.slat)), i.add(R("opening", [t - 1.3, 1.05, 0.06], [0, 0.85, n - 0.02], e.interior)), i.add(R("door", [0.86, 2.05, 0.07], [t / 2 - 0.8, 1.05, n + 0.05], e.woodDark));
  const s = new ae(new vt(Math.min(t - 0.8, 2.2), 0.42, 0.07), e.signShop);
  s.name = "fascia-sign", s.position.set(-0.2, 3.28, n + 0.12), s.castShadow = !0, i.add(s);
}
function tx(i, e, { W: t, zOuter: n }) {
  i.add(R("opening", [t - 1.05, 2.15, 0.08], [0, 1.2, n - 0.02], e.interior)), i.add(R("counter", [t - 1.5, 0.95, 0.45], [0, 0.5, n - 0.4], e.woodDark));
  for (const r of [-t / 2 + 0.45, t / 2 - 0.45]) {
    const o = new ae(new Pn(0.14, 10, 8), e.lantern);
    o.position.set(r, 2.55, n + 0.25), o.name = "lamp", i.add(o);
  }
  const s = new ae(new vt(Math.min(t - 0.6, 2.3), 0.46, 0.07), e.signHangout);
  s.name = "fascia-sign", s.position.set(0, 3.3, n + 0.14), s.castShadow = !0, i.add(s);
}
function du(i, e, { W: t, floors: n, groundH: s, upperH: r, side: o }) {
  const a = o === "right" ? 1 : -1, c = new ye();
  c.name = `side-windows-${o}`, c.position.set(a * (t / 2), 0, 0), c.rotation.y = a > 0 ? Math.PI / 2 : -Math.PI / 2;
  for (let l = 0; l < n - 1; l++) {
    const h = s + l * r;
    Zt(c, e, { x: -0.7, y: h + 1.42, w: 0.85, h: 1.2, zOuter: 0.02 }), Zt(c, e, { x: 0.7, y: h + 1.42, w: 0.85, h: 1.2, zOuter: 0.02 });
  }
  i.add(c);
}
function nx(i, e, { W: t, D: n, zOuter: s }) {
  const a = new ye();
  a.name = "door", a.position.set(-1.15, 2.15 / 2 + 0.02, s + 0.04), a.add(R("door-slab", [0.96, 2.15, 0.06], [0, 0, 0], e.woodDark));
  const c = new ae(new an(0.96 - 0.28, 0.7), e.frost);
  c.position.set(0, 0.45, 0.034), a.add(c), a.add(R("kick", [0.96 - 0.12, 0.22, 0.02], [0, -2.15 / 2 + 0.2, 0.04], e.brass)), a.add(rt("knob", 0.035, 0.035, 0.06, [0.96 / 2 - 0.12, 0, 0.05], e.brass, 8)), i.add(a), Zt(i, e, { x: 1.15, y: 1.7, w: 1.7, h: 1.45, zOuter: s });
  for (let f = 0; f < 6; f++)
    i.add(R("blind", [1.45, 0.025, 0.01], [1.15, 2.15 - f * 0.16, s - 0.08], e.wood));
  cu(i, e, e.signDetective, { x: -t / 2 + 0.15, y: 3.55, z: s + 0.85 });
  const l = new ae(new vt(2.4, 0.42, 0.07), e.signDetective);
  l.name = "fascia-sign", l.position.set(-0.2, 3.28, s + 0.12), l.castShadow = !0, i.add(l), i.add(R("desk", [1.4, 0.74, 0.7], [-0.2, 0.45, 0.4], e.wood)), i.add(R("desk-leg", [1.25, 0.08, 0.55], [-0.2, 0.78, 0.4], e.woodDark)), i.add(R("chair-seat", [0.42, 0.06, 0.42], [-0.2, 0.5, 1.15], e.woodDark)), i.add(R("chair-back", [0.42, 0.5, 0.05], [-0.2, 0.78, 0.96], e.woodDark)), i.add(R("cabinet", [0.7, 1.3, 0.4], [t / 2 - 0.7, 0.75, -n / 2 + 0.7], e.wood));
  const h = new ae(new fc(0.16, 0.18, 8), e.woodDark);
  h.position.set(-0.2, 1.35, 0.4), h.rotation.x = Math.PI, i.add(h);
  const u = new ae(new Pn(0.05, 8, 8), e.bulb);
  u.position.set(-0.2, 1.22, 0.4), u.name = "bulb", i.add(u);
  const d = new _c("#ffb56a", 1.4, 4.5, 2);
  d.position.set(-0.2, 1.2, 0.55), i.add(d), i.add(R("plaque", [0.46, 0.16, 0.02], [-1.15, 2.35, s + 0.08], e.brass));
}
function ix(i, e, { W: t, zOuter: n }) {
  i.add(R("counter", [t - 1.3, 0.92, 0.55], [0.1, 0.5, n - 0.15], e.wood));
  const s = new ae(new an(t - 1.5, 1.7), e.glass);
  s.position.set(0.15, 1.7, n + 0.02), s.material = e.glass, s.name = "shop-glass", i.add(s), cu(i, e, e.signProduce, { x: t / 2 - 0.12, y: 3.5, z: n + 0.8 });
  for (let r = 0; r < 3; r++) {
    const o = R("crate", [0.55, 0.32, 0.4], [-1.3 + r * 0.62, 0.2, n + 0.55], e.wood);
    i.add(o);
    for (let a = 0; a < 3; a++) {
      const c = new ae(new Rs(0.1, 0), e.cabbage);
      c.position.set(-1.3 + r * 0.62 + (a - 1) * 0.12, 0.44, n + 0.55), c.castShadow = !0, c.name = "produce", i.add(c);
    }
  }
}
function sx(i, e, { W: t, zOuter: n, H: s }) {
  const o = new ae(new vt(t - 1.15, 1.35, 0.06), e.slat);
  o.name = "shutter", o.position.set(0, 2.15, n + 0.05), o.castShadow = !0, i.add(o), i.add(rt("shutter-roll", 0.16, 0.16, t - 1.05, [0, 2.85, n + 0.08], e.metalDark, 12));
  const a = i.children[i.children.length - 1];
  a.rotation.z = Math.PI / 2, i.add(R("open-shadow", [t - 1.2, 1.15, 0.08], [0, 0.95, n - 0.05], e.interior)), i.add(R("ac", [0.7, 0.28, 0.55], [t / 2 - 0.7, s - 0.55, n - 0.2], e.metal));
  const c = new ae(new Cs(0.1, 0.012, 6, 12), e.metalDark);
  c.position.set(t / 2 - 0.7, s - 0.55, n + 0.08), i.add(c);
}
function rx(i) {
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
  return e.add(R("upper-door", [h, u, 0.08], [l, a + u / 2, 0.06], i.woodDark)), e.add(R("upper-glass", [h - 0.28, 0.55, 0.02], [l, a + 1.48, 0.1], i.frost)), e.add(R("door-lintel", [h + 0.24, 0.08, 0.14], [l, a + u + 0.04, 0.08], i.concretePlain)), e.add(R("rail-back", [1.35, 0.9, 0.05], [3.75, a + 0.5, -0.15], i.metalDark)), e.add(R("rail-l", [0.05, 0.9, 2.5], [c - 1.67, a + 0.5, 1], i.metalDark)), e.add(R("rail-r", [0.05, 0.9, 2.5], [c + 1.67, a + 0.5, 1], i.metalDark)), e.add(R("table", [0.7, 0.05, 0.7], [r / 2 + 0.2, a + 0.78, 0.7], i.wood)), e.add(rt("table-leg", 0.04, 0.04, 0.74, [r / 2 + 0.2, a + 0.4, 0.7], i.metal, 6)), e.userData.lip = [r / 2 + 0.5, a, 2.55], Nt(e, new M(-r / 2, 0.4, 0.7)), It(e), e;
}
function ox(i) {
  const e = new ye();
  Tt(e, {
    id: "civic-portico",
    kind: "landmark",
    assumption: "仮。市長の勤務先。商店と同じコンクリートの町並みに合わせた。神殿列柱にはしない。町名・平面・ケルビンの場所は未設定。マスク紋は市長への視覚的な呼応で、紋章の制定は未設定。"
  });
  const t = 12.5, n = 8.2, s = 7.4, r = s / 2;
  e.add(R("mass", [t, n, s], [0, n / 2, 0], i.concretePlain)), e.add(R("stain", [t + 0.08, 1.1, s + 0.08], [0, 0.55, 0], i.plasterC)), e.add(R("canopy", [6.4, 0.22, 2.2], [0, 3.55, r + 0.7], i.concretePlain)), e.add(R("door", [1.7, 2.5, 0.12], [0, 1.45, r + 0.04], i.woodDark));
  const o = new ae(new vt(2.6, 0.55, 0.08), i.signCivic);
  o.name = "civic-sign", o.position.set(0, 4.15, r + 1.55), e.add(o);
  const a = new ye();
  a.name = "mask-medallion", a.position.set(3.6, 5.15, r + 0.22);
  const c = new ae(new hn(1.25, 1.25, 0.36, 24), i.bronze);
  c.rotation.x = Math.PI / 2, a.add(c);
  for (let h = 0; h < 12; h++) {
    const u = h / 12 * Math.PI * 2, d = R("mane", [0.22, 0.58, 0.28], [Math.sin(u) * 1.05, Math.cos(u) * 1.05, 0.22], i.bronze);
    d.rotation.z = -u, a.add(d);
  }
  a.add(R("mask", [0.82, 1.05, 0.42], [0, -0.02, 0.32], i.stone)), a.add(R("brow", [0.7, 0.12, 0.16], [0, 0.28, 0.5], i.bronze)), a.add(R("eye-l", [0.18, 0.1, 0.08], [-0.2, 0.12, 0.52], i.metalDark)), a.add(R("eye-r", [0.18, 0.1, 0.08], [0.2, 0.12, 0.52], i.metalDark)), a.add(R("muzzle", [0.36, 0.28, 0.2], [0, -0.22, 0.52], i.bronze)), e.add(a), Zt(e, i, { x: -3.4, y: 5.5, w: 1.35, h: 1.7, zOuter: r }), Zt(e, i, { x: -1.4, y: 5.5, w: 1.15, h: 1.7, zOuter: r }), Zt(e, i, { x: 2.35, y: 1.9, w: 1.15, h: 1.45, zOuter: r });
  const l = new ye();
  l.name = "civic-rear", l.position.set(0, 0, -s / 2), l.rotation.y = Math.PI, Zt(l, i, { x: -3.2, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Zt(l, i, { x: 0, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Zt(l, i, { x: 3.2, y: 3.4, w: 1.15, h: 1.7, zOuter: 0.02 }), Zt(l, i, { x: -3.2, y: 5.6, w: 1.15, h: 1.05, zOuter: 0.02 }), Zt(l, i, { x: 3.2, y: 5.6, w: 1.15, h: 1.05, zOuter: 0.02 }), l.add(R("rear-door", [1.4, 2.3, 0.08], [0, 1.55, 0.04], i.woodDark)), e.add(l);
  for (const h of [-1, 1]) {
    const u = new ye();
    u.position.set(h * (t / 2), 0, 0), u.rotation.y = h > 0 ? Math.PI / 2 : -Math.PI / 2, Zt(u, i, { x: -1.6, y: 3.3, w: 1.1, h: 1.7, zOuter: 0.02 }), Zt(u, i, { x: 1.6, y: 3.3, w: 1.1, h: 1.7, zOuter: 0.02 }), Zt(u, i, { x: 0, y: 5.5, w: 1.3, h: 1.15, zOuter: 0.02 }), e.add(u);
  }
  return Nt(e, new M(0, 2, r + 1.2)), It(e), e;
}
function ja(i, { id: e = "car-sedan", paint: t = null } = {}) {
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
  ].forEach(([q, ce, ve], fe) => {
    n.add(R(`handle-${fe}`, [0.02, 0.035, 0.14], [q, ce, ve], i.trim));
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
  const b = R("mirror-l", [0.18, 0.11, 0.12], [-o / 2 - 0.08, 0.88, 0.65], s);
  b.add(R("mirror-glass-l", [0.01, 0.09, 0.1], [0.085, 0, 0], i.mirrorGlass));
  const v = R("mirror-r", [0.18, 0.11, 0.12], [o / 2 + 0.08, 0.88, 0.65], s);
  v.add(R("mirror-glass-r", [0.01, 0.09, 0.1], [-0.085, 0, 0], i.mirrorGlass)), n.add(b, v), n.add(R("bumper-f", [o + 0.02, 0.22, 0.22], [0, 0.36, r / 2 - 0.02], i.carTrimBlack)), n.add(R("bumper-f-lower", [o - 0.15, 0.12, 0.18], [0, 0.22, r / 2 - 0.04], i.carTrimBlack)), n.add(R("bumper-r", [o + 0.02, 0.24, 0.24], [0, 0.38, -r / 2 + 0.02], i.carTrimBlack)), n.add(R("grille", [0.82, 0.16, 0.06], [0, 0.54, r / 2 + 0.02], i.metalDark)), n.add(R("grille-chrome", [0.86, 0.02, 0.08], [0, 0.62, r / 2 + 0.02], i.trim));
  const P = 0.32, T = 0.14, C = R("headlamp-l", [P, T, 0.08], [-0.58, 0.56, r / 2 - 0.02], i.headlampInner);
  C.add(R("hl-lens-l", [P - 0.02, T - 0.02, 0.02], [0, 0, 0.045], i.headlampGlass)), C.add(R("turn-f-l", [0.08, T - 0.02, 0.03], [-P / 2 + 0.04, 0, 0.04], i.turnAmber));
  const I = R("headlamp-r", [P, T, 0.08], [0.58, 0.56, r / 2 - 0.02], i.headlampInner);
  I.add(R("hl-lens-r", [P - 0.02, T - 0.02, 0.02], [0, 0, 0.045], i.headlampGlass)), I.add(R("turn-f-r", [0.08, T - 0.02, 0.03], [P / 2 - 0.04, 0, 0.04], i.turnAmber)), n.add(C, I);
  const w = 0.38, S = 0.16, L = R("taillamp-l", [w, S, 0.06], [-0.58, 0.58, -r / 2 + 0.02], i.tailRed);
  L.add(R("turn-r-l", [0.1, S * 0.45, 0.02], [-w / 2 + 0.06, S * 0.22, -0.025], i.turnAmber)), L.add(R("rev-r-l", [0.1, S * 0.45, 0.02], [-w / 2 + 0.06, -S * 0.22, -0.025], i.reverseWhite));
  const H = R("taillamp-r", [w, S, 0.06], [0.58, 0.58, -r / 2 + 0.02], i.tailRed);
  H.add(R("turn-r-r", [0.1, S * 0.45, 0.02], [w / 2 - 0.06, S * 0.22, -0.025], i.turnAmber)), H.add(R("rev-r-r", [0.1, S * 0.45, 0.02], [w / 2 - 0.06, -S * 0.22, -0.025], i.reverseWhite)), n.add(L, H);
  const V = R("plate-f", [0.36, 0.18, 0.02], [0, 0.32, r / 2 + 0.1], i.plateWhite);
  V.add(R("plate-border-f", [0.34, 0.16, 0.01], [0, 0, 0.01], i.plateGreen));
  const Y = R("plate-r", [0.36, 0.18, 0.02], [0, 0.42, -r / 2 - 0.1], i.plateWhite);
  Y.add(R("plate-border-r", [0.34, 0.16, 0.01], [0, 0, -0.01], i.plateGreen)), n.add(V, Y);
  const ee = 0.31, K = 0.22;
  return [
    [-l / 2, c / 2],
    [l / 2, c / 2],
    [-l / 2, -c / 2],
    [l / 2, -c / 2]
  ].forEach(([q, ce], ve) => {
    const fe = new ye();
    fe.position.set(q, ee, ce);
    const Ie = new ae(new hn(ee, ee, K, 20), i.tire);
    Ie.rotation.z = Math.PI / 2, Ie.castShadow = !0, fe.add(Ie);
    const ot = new ae(new hn(0.21, 0.21, K + 0.01, 16), i.wheelAlloy);
    ot.rotation.z = Math.PI / 2, fe.add(ot);
    const j = new ae(new hn(0.08, 0.08, K + 0.02, 10), i.trim);
    j.rotation.z = Math.PI / 2, fe.add(j);
    const ne = new ae(new hn(0.16, 0.16, K - 0.04, 12), i.brakeDisc);
    ne.rotation.z = Math.PI / 2, fe.add(ne), fe.name = `wheel-${ve}`, n.add(fe);
  }), Nt(n, new M(0, 0.7, r / 2 + 0.2)), It(n), n;
}
function Jr(i, e = "tree-street", { scale: t = 1, isPark: n = !1 } = {}) {
  const s = new ye();
  Tt(s, {
    id: e,
    kind: "plant",
    assumption: "仮。癒やしは景観だけ。リアルな樹形・枝分かれ・木漏れ日感を持つ樹木。"
  });
  const r = t, o = n ? 0.08 : 0.4;
  return n ? s.add(rt("mound", 1.8 * r, 2.2 * r, 0.18, [0, 0.09, 0], i.soil, 14)) : (s.add(R("planter", [1.5, 0.38, 1.5], [0, 0.19, 0], i.concretePlain)), s.add(R("soil", [1.3, 0.06, 1.3], [0, 0.38, 0], i.soil)), s.add(R("grill-a", [1.32, 0.02, 0.15], [0, 0.4, 0.5], i.metalDark)), s.add(R("grill-b", [1.32, 0.02, 0.15], [0, 0.4, -0.5], i.metalDark)), s.add(R("grill-c", [0.15, 0.02, 1.32], [0.5, 0.4, 0], i.metalDark)), s.add(R("grill-d", [0.15, 0.02, 1.32], [-0.5, 0.4, 0], i.metalDark))), s.add(rt("root-flare", 0.24 * r, 0.36 * r, 0.6 * r, [0, o + 0.3 * r, 0], i.bark, 10)), s.add(rt("trunk-mid", 0.18 * r, 0.24 * r, 1.6 * r, [0.04 * r, o + 1.3 * r, 0.02 * r], i.bark, 10)), s.add(rt("trunk-upper", 0.14 * r, 0.18 * r, 1.4 * r, [-0.02 * r, o + 2.7 * r, -0.04 * r], i.barkBranch, 8)), [
    { start: [0.02, o + 2.4 * r, 0], angleY: 0.2, angleZ: 0.65, length: 1.6 * r, thick: 0.1 * r },
    { start: [-0.04, o + 2.8 * r, 0.04], angleY: 2.3, angleZ: 0.72, length: 1.7 * r, thick: 0.09 * r },
    { start: [0.03, o + 3.1 * r, -0.05], angleY: -1.9, angleZ: 0.6, length: 1.5 * r, thick: 0.08 * r },
    { start: [0, o + 3.5 * r, 0], angleY: 0.8, angleZ: 0.45, length: 1.4 * r, thick: 0.07 * r }
  ].forEach((l, h) => {
    const u = rt(`branch-${h}`, l.thick * 0.7, l.thick, l.length, [0, l.length / 2, 0], i.barkBranch, 6), d = new ye();
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
    const p = new Rs(1, 1), x = new ae(p, _);
    x.position.set(l, h, u), x.scale.set(d, f, g), x.rotation.set(m * 0.4 % 0.5, m * 0.7 % 0.8, m * 0.3 % 0.4), x.castShadow = !0, x.receiveShadow = !0, x.name = `foliage-${m}`, s.add(x);
  }), Nt(s, new M(0, 1.4 * r, 1 * r)), It(s), s;
}
function nh(i, e) {
  const t = new ye();
  return Tt(t, { id: e, kind: "street-furniture" }), t.add(rt("shaft", 0.11, 0.16, 7.1, [0, 3.55, 0], i.concretePlain, 8)), t.add(R("arm", [1.7, 0.08, 0.1], [0, 6.45, 0], i.metalDark)), t.add(rt("ins-l", 0.07, 0.09, 0.18, [-0.7, 6.58, 0], i.pad, 8)), t.add(rt("ins-r", 0.07, 0.09, 0.18, [0.7, 6.58, 0], i.pad, 8)), t.add(R("transformer", [0.52, 0.38, 0.42], [0.2, 5.45, 0], i.metal)), Nt(t, new M(0, 2, 0.25)), It(t), t;
}
function ss(i, e, t, n) {
  const s = new ye();
  Tt(s, { id: n, kind: "wire", grounded: !1 });
  const r = ru(e.clone(), t.clone(), 0.55, 16), o = new ae(new ao(r, 24, 0.015, 5, !1), i.metalDark);
  return o.name = "wire", s.add(o), Nt(s, e.clone().lerp(t, 0.5)), It(s), s;
}
function ax(i) {
  const e = new ye();
  Tt(e, {
    id: "prop-vending",
    kind: "prop",
    assumption: "仮。食べ物ドロップのある町の自販機。銘柄は作っていない。"
  }), e.add(R("body", [0.9, 1.82, 0.72], [0, 0.91, 0], i.metal)), e.add(R("glass", [0.7, 0.95, 0.04], [0, 1.15, 0.37], i.glass));
  for (let t = 0; t < 3; t++)
    for (let n = 0; n < 3; n++) {
      const s = new ae(new As(0.045, 0.12, 3, 6), t === 1 ? i.bottleGreen : i.bottle);
      s.position.set(-0.2 + n * 0.2, 1.35 - t * 0.28, 0.28), s.name = "bottle", e.add(s);
    }
  return e.add(R("slot", [0.28, 0.16, 0.04], [0.2, 0.55, 0.37], i.metalDark)), Nt(e, new M(0, 1, 0.4)), It(e), e;
}
function cx(i, e, t, n) {
  i.add(R("bollard-base", [0.38, 0.08, 0.38], [t, 0.04, n], e.concretePlain)), i.add(rt("bollard", 0.06, 0.07, 1.5, [t, 0.83, n], e.cable, 8)), i.add(R("bollard-cap", [0.14, 0.05, 0.14], [t, 1.58, n], e.metalDark));
}
function ea(i, e, t, n, s) {
  const r = [0.72, 1.05, 1.38], o = [e.cable, e.cable, e.cableWarn], a = ["cable-low", "cable-mid", "cable-high"];
  r.forEach((c, l) => {
    const h = t.clone(), u = n.clone();
    h.y = c, u.y = c;
    const d = ru(h, u, s, 18), f = new ae(new ao(d, 28, 0.018, 6, !1), o[l]);
    f.name = a[l], f.castShadow = !0, i.add(f);
  });
}
function lx(i) {
  const e = new ye();
  Tt(e, {
    id: "fight-ring-cables",
    kind: "wrestling-rope",
    assumption: "仮。歩行者区画へ車を入れない防護ケーブルで、三本ロープとして使う。赤白青のリングロープではない。店側は壁が第四の辺。条例でも、誰かが自費で打った杭でもない。高さはトップロープに合わせたまま。",
    gameplay: { use: "hammer-throw", clearWidth: 8, clearDepth: 5.6 }
  });
  const t = [[-4, -2.6], [-4, 3], [4, -2.6], [4, 3]];
  for (const [s, r] of t) cx(e, i, s, r);
  ea(e, i, new M(-4, 0, -2.6), new M(-4, 0, 3), 0.1), ea(e, i, new M(4, 0, -2.6), new M(4, 0, 3), 0.1), ea(e, i, new M(-4, 0, 3), new M(4, 0, 3), 0.16);
  const n = new ae(new vt(0.64, 0.4, 0.045), i.signNoVehicle);
  return n.name = "vehicle-ban", n.position.set(3.55, 1.12, 3.28), n.castShadow = !0, e.add(n), Nt(e, new M(0, 1, -2.7)), It(e), e;
}
function hx(i) {
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
    n.isMesh && Gt(n, "soft");
  }), Nt(e, new M(0, 0.4, 0.55)), It(e), e;
}
function ux(i) {
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
    t.isMesh && Gt(t, "hard");
  }), Nt(e, new M(0, 0.05, 0.8)), It(e), e;
}
function dx(i) {
  const e = new ye();
  Tt(e, {
    id: "prop-pole-gong",
    kind: "prop",
    grounded: !1,
    assumption: "仮。レフェリーは喧嘩が始まると現れる。歩道にスツールは置かない。電柱の赤い箱はこの町が喧嘩を前提にしているという小道具で、制度としては未設定。"
  }), e.add(R("housing", [0.32, 0.46, 0.16], [0, 1.55, 0], i.gongBox));
  const t = new ae(new an(0.22, 0.3), i.glass);
  t.position.set(0, 1.58, 0.082), t.name = "gong-door", e.add(t);
  const n = new ae(new Pn(0.06, 8, 6), i.brass);
  return n.position.set(0, 1.62, 0.04), n.name = "bell", e.add(n), Nt(e, new M(0, 1.55, 0.12)), It(e), e;
}
function fx() {
  const i = new ye();
  Tt(i, {
    id: "scale-reference",
    kind: "scale",
    assumption: "寸法確認用。キャラクターアセットではない。身長1.75m。"
  });
  const e = new re({ color: "#8a8175", roughness: 0.8 }), t = new ae(new As(0.18, 1.05, 4, 8), e);
  t.position.y = 0.705, t.name = "body", i.add(t);
  const n = new ae(new Pn(0.14, 12, 10), e);
  return n.position.y = 1.56, n.name = "head", i.add(n), i.add(R("band", [0.18, 0.045, 0.18], [0, 1.66, 0], new re({ color: "#c43838" }))), Nt(i, new M(0, 1.5, 0.16)), It(i), i;
}
function px() {
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
    const n = new re({ color: t.color, roughness: 0.75 }), s = new ae(new As(0.42, 1.08, 4, 12), n);
    s.name = t.name, s.position.set(t.x, 0.96 + 0.16, t.z), s.castShadow = !0, s.userData.debugDummy = !0, s.userData.capsule = { radius: 0.42, halfHeight: 0.96 }, i.add(s);
    const r = new ae(
      new mc(0.36, 0.42, 20),
      new vi({ color: t.color, transparent: !0, opacity: 0.55, side: Jt })
    );
    r.name = `${t.name}-footprint`, r.rotation.x = -Math.PI / 2, r.position.set(t.x, 0.171, t.z), i.add(r);
    const o = new ae(
      new hn(0.435, 0.435, 0.07, 16, 1, !0),
      new re({ color: "#2b2b2b", roughness: 0.8, side: Jt })
    );
    o.name = `${t.name}-band`, o.position.set(t.x, 1.3, t.z), i.add(o);
  }
  return Nt(i, new M(0, 1.92, 0)), i;
}
const mx = 0.16;
function gx(i, e, t) {
  const n = i.clone();
  return i.map && (n.map = i.map.clone(), n.map.repeat.set(e, t), n.map.wrapS = Qt, n.map.wrapT = Qt), n;
}
function _x(i, e, t) {
  const n = i.userData.localSize[2];
  i.rotation.y = Math.PI, i.position.set(e, mx, t + n / 2);
}
function vx(i, e, t) {
  const n = i.userData.localSize[2];
  i.rotation.y = -Math.PI / 2, i.position.set(e + n / 2, 0, t);
}
function xx(i) {
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
    const r = uu(i, s);
    _x(r, s.x, t + (s.frontShift || 0)), e.add(r);
  }
  return e;
}
function yx(i) {
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
    const r = uu(i, s);
    vx(r, t + (s.frontShift || 0), s.z), e.add(r);
  }
  return e;
}
function Sx(i) {
  const e = new ye();
  Tt(e, {
    id: "alley-loop",
    kind: "ground",
    assumption: "仮。表の歩道、店と店の隙間、裏、西側の空き地を一周できる。事件の特定場所ではない。"
  });
  const t = gx(i.concrete, 6, 2), n = (h, u, d, f = "hard") => {
    const g = R(h, u, d, t);
    e.add(Gt(g, f));
  };
  n("alley-back", [26.2, 0.08, 4.3], [-1.1, 0.04, -15.45]), n("alley-shutter-fill", [5.3, 0.08, 0.7], [6.75, 0.04, -13.05]), n("gap-produce", [4, 0.08, 7.15], [-4.45, 0.04, -9.6]), n("return-west", [2.35, 0.08, 11.4], [-13.075, 0.04, -11.7]), n("return-east", [2.65, 0.08, 11.2], [10.675, 0.04, -11.65]), n("lot", [7.4, 0.08, 8.8], [-16.1, 0.04, -13]), n("lot-spur", [4.6, 0.08, 10.2], [-16.8, 0.04, -2.9]), n("walk-opposite", [34, 0.16, 1.35], [4.2, 0.08, 11.85]);
  const s = new ye();
  s.name = "trash-cage", s.position.set(-8.6, 0, -14.15), s.add(R("pad", [1.45, 0.08, 1.05], [0, 0.04, 0], i.concretePlain)), s.add(R("post-a", [0.06, 1.05, 0.06], [-0.66, 0.58, -0.46], i.metalDark)), s.add(R("post-b", [0.06, 1.05, 0.06], [0.66, 0.58, -0.46], i.metalDark)), s.add(R("post-c", [0.06, 1.05, 0.06], [-0.66, 0.58, 0.46], i.metalDark)), s.add(R("post-d", [0.06, 1.05, 0.06], [0.66, 0.58, 0.46], i.metalDark)), s.add(R("rail", [1.4, 0.05, 0.05], [0, 1.05, -0.46], i.metalDark)), s.add(R("bag", [0.55, 0.42, 0.38], [-0.2, 0.32, 0], i.metal)), s.add(R("bag-b", [0.4, 0.3, 0.32], [0.28, 0.26, 0.1], i.cardboard)), e.add(s);
  const r = new ye();
  r.name = "outdoor-ac", r.position.set(1.7, 0, -14.05), r.add(R("pad", [0.95, 0.08, 0.58], [0, 0.04, 0], i.concretePlain)), r.add(R("body", [0.82, 0.58, 0.4], [0, 0.4, 0], i.metal));
  const o = new ae(new Cs(0.14, 0.018, 6, 12), i.metalDark);
  o.position.set(0, 0.42, 0.21), o.name = "fan", r.add(o), e.add(r);
  const a = new ye();
  a.name = "service-pipe", a.position.set(7.4, 0, -13.55), a.add(R("foot", [0.28, 0.08, 0.28], [0, 0.04, 0], i.concretePlain)), a.add(rt("riser", 0.05, 0.05, 1.7, [0, 0.9, 0], i.metal, 8));
  const c = rt("run", 0.045, 0.045, 3.2, [1.5, 1.55, 0], i.metal, 8);
  return c.rotation.z = Math.PI / 2, a.add(c), e.add(a), [
    [-9.2, -13.08],
    [0.4, -13.28],
    [7.6, -12.9]
  ].forEach(([h, u], d) => {
    const f = R(`service-door-${d}`, [0.9, 2.05, 0.07], [h, 1.18, u], i.metalDark);
    e.add(f);
  }), Nt(e, new M(-3.55, 0.4, -6.2)), It(e), e;
}
function bx(i) {
  const e = new ye();
  Tt(e, {
    id: "healing-park",
    kind: "scenery",
    assumption: "仮。喧嘩の通りに対する景観。公園の固有名は未設定。癒しは景色だけで、ここで事件は起きない設定にはしていない。"
  }), e.add(Gt(R("lawn", [11.2, 0.06, 8.2], [28.4, 0.04, 14.7], i.grass), "soft")), e.add(Gt(R("path", [1.4, 0.06, 7.6], [27.2, 0.05, 14.4], i.concretePlain), "hard")), e.add(Gt(R("bed-a", [2.4, 0.28, 1.1], [30.6, 0.14, 12.2], i.soil), "normal")), e.add(Gt(R("bed-b", [1.8, 0.28, 1.1], [32.4, 0.14, 16.6], i.soil), "normal"));
  for (let n = 0; n < 7; n++) {
    const s = new ae(new Pn(0.12, 8, 6), n % 2 ? i.flower : i.flowerB);
    s.position.set(29.7 + n % 4 * 0.35, 0.38, 12 + Math.floor(n / 4) * 0.28), s.name = "flower", e.add(s);
  }
  for (let n = 0; n < 5; n++) {
    const s = new ae(new Pn(0.11, 8, 6), i.flower);
    s.position.set(31.8 + n % 3 * 0.32, 0.36, 16.45), s.name = "flower", e.add(s);
  }
  return e.add(R("bench-seat", [1.5, 0.06, 0.42], [26.2, 0.48, 12.4], i.wood)), e.add(R("bench-back", [1.5, 0.4, 0.06], [26.2, 0.72, 12.2], i.woodDark)), e.add(R("bench-leg", [0.08, 0.42, 0.36], [25.6, 0.24, 12.4], i.metalDark)), e.add(R("bench-leg-b", [0.08, 0.42, 0.36], [26.8, 0.24, 12.4], i.metalDark)), e.add(R("bench-seat-b", [1.4, 0.06, 0.42], [31.5, 0.48, 17.4], i.wood)), e.add(R("bench-leg-c", [0.08, 0.42, 0.36], [31, 0.24, 17.4], i.metalDark)), e.add(R("bench-leg-d", [0.08, 0.42, 0.36], [32, 0.24, 17.4], i.metalDark)), e.add(rt("basin", 1.15, 1.25, 0.38, [29.4, 0.2, 15.6], i.concretePlain, 16)), e.add(rt("pool", 0.85, 0.85, 0.08, [29.4, 0.38, 15.6], i.water, 16)), e.add(rt("jet", 0.06, 0.1, 0.55, [29.4, 0.62, 15.6], i.stone, 8)), [[24.8, 12.6], [33.6, 13.2], [26.4, 17.6]].forEach(([n, s], r) => {
    e.add(rt(`lamp-pole-${r}`, 0.06, 0.08, 3.1, [n, 1.55, s], i.metalDark, 8));
    const o = new ae(new Pn(0.16, 10, 8), i.lantern);
    o.position.set(n, 3.15, s), o.name = "lamp-head", e.add(o);
    const a = new _c("#ffb56a", 0.55, 7, 2);
    a.position.set(n, 3, s), e.add(a);
  }), Nt(e, new M(27, 1, 11.2)), It(e), e;
}
function wx(i) {
  const e = new ye();
  Tt(e, {
    id: "scenery-canal",
    kind: "scenery",
    assumption: "仮。通りの東を川と人道橋で閉じる。川の名も、ここで落ちるイベントも未設定。町は橋の向こうへ続いている。"
  }), e.add(R("bed", [7.2, 0.06, 24], [38.4, 0.03, 5], i.waterBed)), e.add(R("water", [6.2, 0.08, 22.5], [38.4, 0.1, 5], i.water)), e.add(R("bank-west-s", [0.55, 0.48, 8.6], [34.85, 0.24, -2.9], i.concretePlain)), e.add(R("bank-west-n", [0.55, 0.48, 11.6], [34.85, 0.24, 11], i.concretePlain)), e.add(R("bank-east-s", [0.55, 0.48, 8.6], [41.95, 0.24, -2.9], i.concretePlain)), e.add(R("bank-east-n", [0.55, 0.48, 11.6], [41.95, 0.24, 11], i.concretePlain)), e.add(R("bank-gap-s", [6.4, 0.42, 3.4], [38.4, 0.21, -0.7], i.concretePlain)), e.add(R("bank-gap-n", [6.4, 0.42, 9.8], [38.4, 0.21, 9.9], i.concretePlain)), e.add(Gt(R("deck", [9.6, 0.14, 3.5], [38.2, 0.24, 3.2], i.concretePlain), "hard")), e.add(Gt(R("approach", [2.4, 0.12, 3.5], [32.6, 0.12, 3.2], i.concretePlain), "hard")), e.add(R("rail-n", [9.4, 0.08, 0.08], [38.2, 0.78, 4.8], i.metalDark)), e.add(R("rail-s", [9.4, 0.08, 0.08], [38.2, 0.78, 1.6], i.metalDark));
  for (const t of [34, 38.2, 42.2])
    e.add(R("rail-post", [0.08, 0.62, 0.08], [t, 0.55, 4.8], i.metalDark)), e.add(R("rail-post-s", [0.08, 0.62, 0.08], [t, 0.55, 1.6], i.metalDark));
  return e.add(rt("bollard-a", 0.12, 0.14, 0.85, [33.4, 0.42, 1.15], i.concretePlain, 8)), e.add(rt("bollard-b", 0.12, 0.14, 0.85, [33.4, 0.42, 5.35], i.concretePlain, 8)), Nt(e, new M(33.6, 0.6, 3.2)), It(e), e;
}
function Ex(i) {
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
  const t = new ae(new vt(0.08, 0.7, 1.3), i.signWorks);
  return t.name = "works-sign", t.position.set(0.2, 1.45, -1.4), e.add(t), Nt(e, new M(0.4, 1, 0)), It(e), e;
}
function Mx(i) {
  const e = new ye();
  e.name = "district", e.add(xx(i)), e.add(yx(i)), e.add(Sx(i)), e.add(bx(i));
  const t = Jr(i, "tree-park-a", { scale: 1.25, isPark: !0 });
  t.position.set(24.6, 0, 16.8);
  const n = Jr(i, "tree-park-b", { scale: 1.35, isPark: !0 });
  n.position.set(33.2, 0, 16.2);
  const s = Jr(i, "tree-park-c", { scale: 1.15, isPark: !0 });
  s.position.set(31.4, 0, 12.4), e.add(t, n, s), e.add(wx(i)), e.add(Ex(i));
  const r = ja(i, { id: "car-lot", paint: i.paintCarLot });
  return r.position.set(-16.8, 0, -14.2), e.add(r), e;
}
function Li(i) {
  return i.userData.ignoreBounds = !0, i.castShadow = !1, i.receiveShadow = !1, i;
}
function Tx(i) {
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
  ], n = Xt(Ns("skyline")), s = (a, c) => a + n() * (c - a);
  t.forEach((a, c) => {
    const [l, , h, u, d, f] = a, g = new ae(new vt(u, d, f), i.skyWin);
    g.position.set(l, d / 2, h), g.name = `sil-${c}`, e.add(Li(g));
    const _ = 1 + Math.floor(n() * 3);
    for (let m = 0; m < _; m++) {
      const p = s(u * 0.2, u * 0.45), x = s(2, d * 0.12), b = new ae(new vt(p, x, s(f * 0.25, f * 0.6)), i.skySil);
      b.position.set(l + s(-u / 2 + p, u / 2 - p), d + x / 2, h + s(-f / 4, f / 4)), b.name = "sky-roof", e.add(Li(b));
    }
    if (n() < 0.6) {
      const m = new ae(new vt(1.2, s(6, 16), 1.2), i.skySil);
      m.position.set(l + s(-u / 3, u / 3), d + 6, h), m.name = "sky-mast", e.add(Li(m));
    }
  });
  const r = new ae(new vt(120, 1.1, 8), i.skySil);
  r.position.set(6, 14, -170), r.name = "elevated-deck", e.add(Li(r));
  for (const a of [-40, -12, 16, 44]) {
    const c = new ae(new vt(2.2, 14, 2.2), i.skySil);
    c.position.set(a, 7, -170), c.name = "pier", e.add(Li(c));
  }
  const o = new ae(new vt(9, 1.1, 70), i.skySil);
  o.position.set(174, 12, 8), o.name = "elevated-east", e.add(Li(o));
  for (const a of [-16, 8, 32]) {
    const c = new ae(new vt(2.2, 12, 2.2), i.skySil);
    c.position.set(174, 6, a), c.name = "pier-east", e.add(Li(c));
  }
  return Nt(e, new M(0, 8, -40)), It(e), Ts(e), e;
}
const Mn = 0.16;
function ih(i, e, t) {
  const n = i.clone();
  return i.map && (n.map = i.map.clone(), n.map.repeat.set(e, t), n.map.wrapS = Qt, n.map.wrapT = Qt), n;
}
function Ax(i) {
  const e = new ye();
  e.name = "street-ground", Tt(e, { id: "street-ground", kind: "ground", grounded: !1 });
  const t = new ae(new an(300, 300), i.earthGround);
  t.rotation.x = -Math.PI / 2, t.receiveShadow = !0, t.userData.ignoreBounds = !0, t.name = "packed-earth", Gt(t, "normal"), e.add(t);
  const n = ih(i.asphalt, 14, 3), s = new ae(new vt(64, 0.04, 9), n);
  s.position.set(2, 0.02, 3.2), s.receiveShadow = !0, s.name = "road-through", Gt(s, "hard"), e.add(s);
  const r = new ae(new vt(8, 0.04, 14), n);
  r.position.set(-16, 0.025, 9.2), r.receiveShadow = !0, r.name = "road-cross", Gt(r, "hard"), e.add(r);
  const o = ih(i.concrete, 8, 2), a = new ae(new vt(28, 0.16, 4.7), o);
  a.position.set(0.2, 0.08, -3.65), a.receiveShadow = !0, a.name = "sidewalk-shop", Gt(a, "hard"), e.add(a);
  const c = new ae(new vt(36, 0.16, 3.2), o);
  c.position.set(4, 0.08, 9.6), c.receiveShadow = !0, c.name = "sidewalk-far", Gt(c, "hard"), e.add(c), e.add(R("curb-shop", [28, 0.16, 0.16], [0.2, 0.08, -1.2], i.concretePlain)), e.add(R("curb-far", [36, 0.16, 0.16], [4, 0.08, 7.9], i.concretePlain));
  for (let u = 0; u < 8; u++)
    e.add(Gt(R("crosswalk", [0.4, 0.012, 3.2], [-1.4 + u * 0.7, 0.045, 1.2], i.trim), "hard"));
  const l = new ae(new hn(0.55, 0.55, 0.025, 18), i.metalDark);
  l.position.set(-4.2, 0.05, 3.4), l.name = "manhole", Gt(l, "hard"), e.add(l);
  const h = new ae(new vt(0.7, 0.02, 1.4), i.metalDark);
  return h.position.set(4.8, 0.05, -0.9), h.name = "grating", Gt(h, "hard"), e.add(h), e;
}
function Rx(i) {
  const e = new ye();
  e.name = "ring-street-block";
  const t = new ye();
  t.name = "street-core", t.add(Ax(i));
  const n = Qo(i, {
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
  n.position.set(-9.2, Mn, -9.5), t.add(n);
  const s = Qo(i, {
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
  s.position.set(0.8, Mn, -9.6), t.add(s);
  const r = Qo(i, {
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
  r.position.set(6.75, Mn, -9.4), t.add(r);
  const o = lx(i);
  o.position.set(2.2, Mn, -2.5), t.add(o);
  const a = rx(i);
  a.position.set(6.3, Mn, -6.05), t.add(a);
  const c = hx(i);
  c.position.set(-8.3, Mn, -4.6), t.add(c);
  const l = ux(i);
  l.position.set(0.4, 0.04, 5.4), t.add(l);
  const h = ja(i, { id: "car-traffic", paint: i.paintCarTraffic });
  h.position.set(-9.5, 0, 4.6), h.rotation.y = Math.PI / 2, t.add(h);
  const u = ja(i, { id: "car-under-terrace", paint: i.paintCarParked });
  u.position.set(9.4, 0, -2.15), u.rotation.y = Math.PI / 2, t.add(u);
  const d = Jr(i, "tree-street", { scale: 1.05 });
  d.position.set(28.6, 0, 17.2), t.add(d);
  const f = nh(i, "pole-west");
  f.position.set(-12.5, 0, 8.6), f.rotation.z = 0.013;
  const g = nh(i, "pole-east");
  g.position.set(16.2, 0, 8.6), g.rotation.z = -9e-3, t.add(f, g);
  const _ = (S, L) => new M(L, 6.58, 0).applyEuler(S.rotation).add(S.position), m = _(f, 0.7), p = _(f, -0.7), x = _(g, -0.7), b = _(g, 0.7);
  t.add(ss(i, m.clone(), b.clone(), "wire-main")), t.add(ss(i, p.clone(), x.clone(), "wire-second")), t.add(ss(i, m.clone(), b.clone(), "wire-third")), t.add(ss(i, new M(-12.42, 5.85, 8.6), new M(16.14, 5.85, 8.6), "wire-comms")), t.add(ss(i, new M(-12.4, 5.35, 8.6), new M(16.1, 5.3, 8.6), "wire-comms-b")), t.add(ss(i, new M(16.1, 5.2, 8.5), new M(9.5, 4.85, -5.95), "wire-drop"));
  const v = dx(i);
  v.position.set(-12.28, 0, 8.85), t.add(v);
  const P = ax(i);
  P.position.set(12.6, Mn, -5.45), t.add(P);
  const T = fx();
  T.position.set(2.2, Mn, -3.15), T.rotation.y = Math.PI, t.add(T);
  const C = px();
  C.visible = !1, t.add(C);
  const I = ox(i);
  I.position.set(-27.5, 0, 12), I.rotation.y = Math.PI / 2, t.add(Mx(i));
  const w = Bv(i);
  return Tt(w.sidewalk, {
    id: "clutter-sidewalk",
    kind: "street-furniture",
    assumption: "仮。暮らしの小物（ゴミ袋、バケツ、ビールケース、植木鉢、のぼり、立て看板、自転車、自販機）。店先の壁際と歩道の端にだけ置き、戦闘範囲と路地の有効幅には置いていない。"
  }), It(w.sidewalk), Ts(w.sidewalk), w.sidewalk.position.y = Mn, Tt(w.alley, {
    id: "clutter-alley",
    kind: "street-furniture",
    assumption: "仮。裏の路地と西の空き地の小物。壁際0.4m以内、路地の有効幅4.6mは空けたまま。"
  }), It(w.alley), Ts(w.alley), w.alley.position.y = 0.08, t.add(w.sidewalk, w.alley), t.add(kv(i)), e.add(t), e.add(I), e.add(Tx(i)), e.add(zv(i)), e.userData.player = {
    eye: [2.2, 1.68, 0.2],
    target: [1.2, 1.35, -6],
    fov: 78
  }, e.userData.fightArea = {
    min: [-1.8, Mn, -6],
    max: [6.2, Mn, 0.5],
    clearance: { width: 8, depth: 6.5, capsuleWidths: 9.5 }
  }, e;
}
const Wr = [
  {
    id: "powerbomb",
    label: "パワーボム",
    grip: "front",
    dmg: 34,
    impactFrame: 64,
    file: "./muscle-detective/assets/glbs/powerbomb_v2b.glb",
    koFile: "./muscle-detective/assets/glbs/powerbomb_ragdoll.glb",
    endTime: 3.1
  },
  {
    id: "chokeslam",
    label: "チョークスラム",
    grip: "front",
    dmg: 32,
    impactFrame: 70,
    file: "./muscle-detective/assets/glbs/chokeslam_v2c.glb",
    koFile: "./muscle-detective/assets/glbs/chokeslam_ragdoll.glb",
    endTime: 3.2
  },
  {
    id: "schmidt",
    label: "シュミット式",
    grip: "front",
    dmg: 30,
    impactFrame: 64,
    file: "./muscle-detective/assets/glbs/schmidt_v8.glb",
    koFile: null,
    endTime: 3.3
  },
  {
    id: "german",
    label: "ジャーマン",
    grip: "back",
    dmg: 38,
    impactFrame: 79,
    file: "./muscle-detective/assets/glbs/german_v4.glb",
    koFile: null,
    endTime: 3.6
  },
  {
    id: "backdrop",
    label: "バックドロップ",
    grip: "back",
    dmg: 36,
    impactFrame: 80,
    file: "./muscle-detective/assets/glbs/backdrop_bridge.glb",
    koFile: null,
    endTime: 3.5
  }
], sh = [
  { id: "powerbomb_v2b", label: "パワーボム (柔)", file: "./muscle-detective/assets/glbs/powerbomb_v2b.glb", ragdoll: !1 },
  { id: "powerbomb_ragdoll", label: "パワーボム (ラグドール)", file: "./muscle-detective/assets/glbs/powerbomb_ragdoll.glb", ragdoll: !0 },
  { id: "chokeslam_v2c", label: "チョークスラム (柔)", file: "./muscle-detective/assets/glbs/chokeslam_v2c.glb", ragdoll: !1 },
  { id: "chokeslam_ragdoll", label: "チョークスラム (ラグドール)", file: "./muscle-detective/assets/glbs/chokeslam_ragdoll.glb", ragdoll: !0 },
  { id: "german_v4", label: "ジャーマン (頭痛がり)", file: "./muscle-detective/assets/glbs/german_v4.glb", ragdoll: !1 },
  { id: "backdrop_bridge", label: "バックドロップ (ブリッジ)", file: "./muscle-detective/assets/glbs/backdrop_bridge.glb", ragdoll: !1 },
  { id: "schmidt_v8", label: "シュミット式", file: "./muscle-detective/assets/glbs/schmidt_v8.glb", ragdoll: !1 }
], Un = 0.165, jt = { minX: -1.2, maxX: 5.6, minZ: -5.4, maxZ: -0.2, cx: 2.2, cz: -2.75 }, rh = new M(jt.cx, Un, jt.cz), oh = new M(0, 0, 0);
function Cx() {
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
function Px(i) {
  const e = atob(i), t = new Uint8Array(e.length);
  for (let r = 0; r < e.length; r++) t[r] = e.charCodeAt(r);
  const n = new Int16Array(t.buffer), s = new Float32Array(n.length);
  for (let r = 0; r < n.length; r++) s[r] = n[r] / 32767;
  return s;
}
function Ix(i) {
  const e = [], t = i.times ? new Float32Array(i.times) : null;
  for (const n of i.tracks) {
    const s = n.name.endsWith(".quaternion") || n.type === "quaternion";
    n.name.endsWith(".position") || n.type;
    let r = n.times ? new Float32Array(n.times) : t, o;
    if (typeof n.values == "string")
      o = Px(n.values);
    else if (Array.isArray(n.values))
      o = new Float32Array(n.values);
    else
      continue;
    n.constant && (r = new Float32Array([0])), !(!r || r.length === 0 || o.length === 0) && s && o.length === r.length * 4 && e.push(new Bi(n.name, r, o));
  }
  return new ro(i.name, i.duration, e);
}
function Dx(i, e) {
  const t = Cx();
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
        <div class="md-picker-title" id="mdPickerTitle">🔥 技を選べ！</div>
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
  const n = i.querySelector(".md-canvas-wrap"), s = i.querySelector("#mdLoading"), r = i.querySelector("#mdFps"), o = i.querySelector("#mdBackBtn"), a = i.querySelector("#mdModeBattle"), c = i.querySelector("#mdModeViewer"), l = i.querySelector("#mdBattleHud"), h = i.querySelector("#mdBattleControls"), u = i.querySelector("#mdPlayerHpBar"), d = i.querySelector("#mdPlayerHpTxt"), f = i.querySelector("#mdEnemyHpBar"), g = i.querySelector("#mdEnemyHpTxt"), _ = i.querySelector("#mdEnemyStunBar"), m = i.querySelector("#mdBanner"), p = i.querySelector("#mdThrowPicker"), x = i.querySelector("#mdPickerTitle"), b = i.querySelector("#mdPickerGrid"), v = i.querySelector("#mdKoOverlay"), P = i.querySelector("#mdKoTitle"), T = i.querySelector("#mdKoSub"), C = i.querySelector("#mdRematchBtn"), I = i.querySelector("#mdStickZone"), w = i.querySelector("#mdStickKnob"), S = i.querySelector("#mdBtnStrike"), L = i.querySelector("#mdBtnThrow"), H = i.querySelector("#mdBtnGuard"), V = i.querySelector("#mdViewerCamBar"), Y = i.querySelector("#mdViewerPanel"), ee = i.querySelector("#mdStageBtn"), K = i.querySelector("#mdMovesRow"), oe = i.querySelector("#mdPlayBtn"), q = i.querySelector("#mdSpeedBtn"), ce = i.querySelector("#mdScrubber"), ve = i.querySelector("#mdFrameTxt"), fe = new L_({ antialias: !0, powerPreference: "high-performance" });
  fe.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)), fe.setSize(window.innerWidth, window.innerHeight), fe.outputColorSpace = Ot, fe.shadowMap.enabled = !0, fe.shadowMap.type = ch, fe.toneMapping = hh, fe.toneMappingExposure = 0.96, n.appendChild(fe.domElement);
  const Ie = new Wd();
  Ie.background = new Ne("#c5d4e4"), Ie.fog = new hs("#aeb6be", 28e-4);
  const ot = () => window.innerHeight > window.innerWidth, j = new nn(ot() ? 52 : 45, window.innerWidth / window.innerHeight, 0.1, 350), ne = new N_(j, fe.domElement);
  ne.enableDamping = !0, ne.dampingFactor = 0.08, ne.maxPolarAngle = Math.PI * 0.49, ne.minDistance = 1.4, ne.maxDistance = 45, ne.enabled = !1;
  const be = new ye(), _e = new ae(
    new Pn(160, 24, 14),
    new si({
      side: sn,
      depthWrite: !1,
      uniforms: {
        top: { value: new Ne("#8eb4d4") },
        horizon: { value: new Ne("#f4e3cf") },
        bottom: { value: new Ne("#cbb892") }
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
  _e.frustumCulled = !1, be.add(_e), be.add(new ul("#c5d0dc", "#6d5c48", 0.68));
  const Me = new Xa("#ffd2a8", 2.8);
  Me.position.set(16, 22, 8), Me.castShadow = !0, Me.shadow.mapSize.set(1024, 1024), Me.shadow.camera.near = 1, Me.shadow.camera.far = 70, Me.shadow.camera.left = -20, Me.shadow.camera.right = 20, Me.shadow.camera.top = 18, Me.shadow.camera.bottom = -18, Me.shadow.bias = -5e-4, Me.shadow.normalBias = 0.03, be.add(Me);
  const ke = Rx(Zv()), je = ke.getObjectByName("scale-reference");
  je && (je.visible = !1), be.add(ke), Ie.add(be);
  const dt = new ye();
  dt.visible = !1, dt.add(new ul(12375295, 3812388, 0.95));
  const qe = new Xa(16773596, 2.2);
  qe.position.set(4.5, 7.5, 4), qe.castShadow = !0, qe.shadow.mapSize.set(1024, 1024), qe.shadow.camera.left = -4.5, qe.shadow.camera.right = 4.5, qe.shadow.camera.top = 4.5, qe.shadow.camera.bottom = -4.5, dt.add(qe);
  const Et = new ae(
    new vt(6.4, 0.2, 6.4),
    new re({ color: 13358561, roughness: 0.85 })
  );
  Et.position.y = -0.105, Et.receiveShadow = !0, dt.add(Et), Ie.add(dt);
  const D = new K_(), qt = /* @__PURE__ */ new Map();
  let Qe = null, Ze = "battle", Re = "town", at = !1, Pe = 0;
  const A = new ye();
  Ie.add(A);
  const y = new ye();
  A.add(y);
  const k = new re({ color: 2714329, roughness: 0.48, metalness: 0.05 }), Q = new re({ color: 15102766, roughness: 0.52, metalness: 0.05 }), te = new re({ color: 16726832, emissive: 6684672, roughness: 0.4 });
  function $(W, J, Ae) {
    const Ve = new ye();
    Ve.name = Ae;
    const Ge = Hr(W);
    Ge.traverse((Ce) => {
      Ce.isMesh && (Ce.material = J, Ce.castShadow = !0, Ce.receiveShadow = !0, Ce.frustumCulled = !1);
    }), Ve.add(Ge), A.add(Ve);
    const Lt = new Ho(Ge), He = {};
    for (const [Ce, Xe] of Object.entries(Qe))
      He[Ce] = Lt.clipAction(Xe);
    return {
      root: Ve,
      model: Ge,
      mixer: Lt,
      actions: He,
      baseMat: J,
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
      play(Ce, { loop: Xe = !0, fade: pt = 0.12, speed: Rt = 1 } = {}) {
        if (this.curAnim === Ce && Xe) return;
        const Ct = this.actions[Ce];
        Ct && (Ct.reset(), Ct.setLoop(Xe ? ka : Ba, Xe ? 1 / 0 : 1), Ct.clampWhenFinished = !Xe, Ct.timeScale = Rt, Ct.play(), this.curAnim && this.actions[this.curAnim] && this.curAnim !== Ce && this.actions[this.curAnim].crossFadeTo(Ct, pt, !1), this.curAnim = Ce);
      },
      setFlash(Ce) {
        this.model.traverse((Xe) => {
          Xe.isMesh && (Xe.material = Ce ? te : this.baseMat);
        });
      }
    };
  }
  let B = null, N = null, ue = "fight", tt = 0, se = null, xe = null, Te = null, Ue = 0, we = !1, $e = 0, Be = 0, ft = 0, U = 0, de = 0.8;
  const X = { x: 0, y: 0 }, Z = {};
  let me = !1;
  function le(W, J = "#fbbf24", Ae = 1) {
    m.textContent = W, m.style.color = J, m.classList.add("show"), U = Ae;
  }
  function ze() {
    if (!B || !N) return;
    const W = Math.max(0, Math.round(B.hp / B.maxHp * 100)), J = Math.max(0, Math.round(N.hp / N.maxHp * 100));
    u.style.width = `${W}%`, d.textContent = `${Math.max(0, Math.round(B.hp))}`, f.style.width = `${J}%`, g.textContent = `${Math.max(0, Math.round(N.hp))}`, _.style.width = `${Math.min(100, Math.round(N.stun))}%`;
  }
  function bt() {
    xe && (xe.stopAllAction(), xe = null), se && (y.remove(se), se = null), Te = null;
  }
  function Ut() {
    bt(), ue = "fight", $e = 0, Be = 0, p.classList.add("hidden"), v.classList.add("hidden"), B.hp = 100, B.stun = 0, B.state = "idle", B.stateTimer = 0, B.comboStep = 0, B.pos.set(jt.cx - 1.1, Un, jt.cz), B.yaw = Math.PI * 0.5, B.root.visible = !0, B.setFlash(!1), B.play("idle", { loop: !0, fade: 0.05 }), N.hp = 100, N.stun = 0, N.state = "idle", N.stateTimer = 0, N.pos.set(jt.cx + 1.1, Un, jt.cz), N.yaw = -Math.PI * 0.5, N.root.visible = !0, N.setFlash(!1), N.play("idle", { loop: !0, fade: 0.05 }), de = 1, ze(), le("FIGHT!", "#60a5fa", 1.1);
  }
  async function lt(W) {
    if (!qt.has(W)) {
      const J = await D.loadAsync(W);
      qt.set(W, J);
    }
    return qt.get(W);
  }
  async function cn(W) {
    if (ue !== "pick_throw") return;
    p.classList.add("hidden"), ue = "playing_throw", t.play("tap", 0.6);
    const J = N.hp - W.dmg <= 0, Ae = J && W.koFile ? W.koFile : W.file;
    s.classList.add("show");
    const Ve = await lt(Ae);
    if (s.classList.remove("show"), at || Ze !== "battle") return;
    bt();
    const Ge = Hr(Ve.scene);
    Ge.traverse((Rt) => {
      Rt.isMesh && (Rt.castShadow = !0, Rt.receiveShadow = !0, Rt.frustumCulled = !1);
    });
    const Lt = N.pos.x - B.pos.x, He = N.pos.z - B.pos.z, et = Math.atan2(Lt, He), Ce = ls.clamp((B.pos.x + N.pos.x) * 0.5, jt.minX + 0.6, jt.maxX - 0.6), Xe = ls.clamp((B.pos.z + N.pos.z) * 0.5, jt.minZ + 0.6, jt.maxZ - 0.6);
    y.position.set(Ce, Un, Xe), y.rotation.set(0, et, 0), y.add(Ge), B.root.visible = !1, N.root.visible = !1, se = Ge, xe = new Ho(Ge);
    let pt = 2.5;
    Ve.animations.forEach((Rt) => {
      pt = Math.max(pt, Rt.duration);
      const Ct = xe.clipAction(Rt);
      Ct.setLoop(Ba, 1), Ct.clampWhenFinished = !0, Ct.play();
    }), Te = { ...W, isKo: J, duration: J ? pt : Math.min(pt, W.endTime) }, Ue = 0, we = !1, le(W.label + "!", "#fb923c", 0.9);
  }
  let gn = "front";
  function Fs() {
    if (!B || !N) return !1;
    const W = Math.sin(N.yaw), J = Math.cos(N.yaw), Ae = B.pos.x - N.pos.x, Ve = B.pos.z - N.pos.z, Ge = Math.hypot(Ae, Ve);
    return Ge < 1e-4 ? !1 : (W * Ae + J * Ve) / Ge < -0.15;
  }
  function hr(W) {
    gn = W, x.textContent = W === "back" ? "🔥 背後グラップル！（大技）" : "🔥 正面グラップル！", b.innerHTML = "", Wr.filter((Ae) => Ae.grip === W).forEach((Ae) => {
      const Ve = document.createElement("button");
      Ve.className = "md-pick-btn", Ve.innerHTML = `<strong>${Ae.label}</strong><span>DMG ${Ae.dmg}</span>`, Ve.addEventListener("click", () => cn(Ae)), b.appendChild(Ve);
    });
  }
  function Ln() {
    if (Ze !== "battle" || ue !== "fight" || !B || B.state === "hit" || B.state === "dizzy" || B.state === "grab_lunge" || B.state === "strike" && B.stateTimer > 0.14) return;
    const W = ["jab", "cross", "hook", "uppercut"], J = W[B.comboStep % W.length];
    B.comboStep = (B.comboStep + 1) % W.length, B.state = "strike", B.stateTimer = J === "uppercut" ? 0.52 : 0.36, B.hitChecked = !1, B.yaw = Math.atan2(N.pos.x - B.pos.x, N.pos.z - B.pos.z), B.play(J, { loop: !1, fade: 0.06, speed: 1.35 }), t.play("tap", 0.45);
  }
  function ki() {
    if (Ze !== "battle" || ue !== "fight" || !B || B.state === "hit" || B.state === "dizzy") return;
    const W = B.pos.distanceTo(N.pos);
    if (B.yaw = Math.atan2(N.pos.x - B.pos.x, N.pos.z - B.pos.z), W <= 1.85 && N.state !== "getup") {
      const Ae = N.state === "dizzy" && Fs() ? "back" : "front";
      hr(Ae), ue = "pick_throw", tt = 2.8, t.play("hit", 0.55), le(Ae === "back" ? "背後を取った！" : "正面グラップル！", Ae === "back" ? "#facc15" : "#38bdf8", 0.9), p.classList.remove("hidden");
    } else
      B.state = "grab_lunge", B.stateTimer = 0.42, B.play("jab", { loop: !1, fade: 0.06, speed: 0.9 }), le("スカッ！", "#94a3b8", 0.55);
  }
  S.addEventListener("pointerdown", (W) => {
    W.preventDefault(), Ln();
  }), L.addEventListener("pointerdown", (W) => {
    W.preventDefault(), ki();
  }), H.addEventListener("pointerdown", (W) => {
    W.preventDefault(), me = !0, H.classList.add("held");
  });
  const zi = () => {
    me = !1, H.classList.remove("held");
  };
  H.addEventListener("pointerup", zi), H.addEventListener("pointercancel", zi), H.addEventListener("pointerleave", zi), C.addEventListener("click", () => {
    t.play("tap", 0.5), Ut();
  });
  let Vn = null, ri = { x: 0, y: 0 };
  const oi = 42;
  I.addEventListener("pointerdown", (W) => {
    if (Vn !== null) return;
    Vn = W.pointerId, I.setPointerCapture(Vn);
    const J = I.getBoundingClientRect();
    ri = { x: J.left + J.width * 0.5, y: J.top + J.height * 0.5 }, Os(W.clientX, W.clientY);
  }), I.addEventListener("pointermove", (W) => {
    W.pointerId === Vn && Os(W.clientX, W.clientY);
  });
  const wi = (W) => {
    W.pointerId === Vn && (Vn = null, X.x = 0, X.y = 0, w.style.transform = "translate(0px, 0px)");
  };
  I.addEventListener("pointerup", wi), I.addEventListener("pointercancel", wi);
  function Os(W, J) {
    let Ae = W - ri.x, Ve = J - ri.y;
    const Ge = Math.hypot(Ae, Ve);
    Ge > oi && (Ae = Ae / Ge * oi, Ve = Ve / Ge * oi), X.x = Ae / oi, X.y = Ve / oi, w.style.transform = `translate(${Ae}px, ${Ve}px)`;
  }
  const Bs = (W) => {
    Z[W.code] = !0, (W.code === "KeyJ" || W.code === "Space") && Ln(), W.code === "KeyK" && ki(), (W.code === "KeyL" || W.code === "ShiftLeft") && (me = !0);
  }, ur = (W) => {
    Z[W.code] = !1, (W.code === "KeyL" || W.code === "ShiftLeft") && (me = !1);
  };
  window.addEventListener("keydown", Bs), window.addEventListener("keyup", ur);
  const ai = new ye();
  ai.visible = !1, Ie.add(ai);
  let Gn = null, _n = null, Dn = 1, Ei = !0, E = !1;
  const F = [1, 0.5, 0.25];
  let z = 0;
  function G(W) {
    const J = Re === "town" ? rh : oh, Ae = ot(), Ve = {
      review: Ae ? [3.6, 2.2, 4.8] : [2.8, 1.8, 3.6],
      side: Ae ? [5.2, 1.4, 0] : [4.2, 1.25, 0],
      close: [2.1, 1, 2.2],
      top: [0, 6.2, 1.2]
    }, Ge = Ve[W] || Ve.review;
    j.position.set(J.x + Ge[0], J.y + Ge[1], J.z + Ge[2]), ne.target.set(J.x, J.y + 0.85, J.z), ne.update();
  }
  function O(W) {
    Re = W;
    const J = W === "town";
    be.visible = J, dt.visible = !J, J ? (Ie.background = new Ne("#c5d4e4"), Ie.fog = new hs("#aeb6be", 28e-4), ee.textContent = "🏙️ 街中") : (Ie.background = new Ne(1251620), Ie.fog = new hs(1251620, 0.045), ee.textContent = "🥊 リング"), ai.position.copy(J ? rh : oh), G("review");
  }
  async function ie(W) {
    s.classList.add("show"), i.querySelectorAll(".md-move-chip").forEach((J) => J.classList.toggle("active", J.dataset.id === W.id));
    try {
      const J = await lt(W.file);
      if (at) return;
      _n && _n.stopAllAction(), Gn && ai.remove(Gn), Gn = Hr(J.scene), Gn.traverse((Ae) => {
        Ae.isMesh && (Ae.castShadow = !0, Ae.receiveShadow = !0, Ae.frustumCulled = !1);
      }), ai.add(Gn), _n = new Ho(Gn), Dn = 0.1, J.animations.forEach((Ae) => {
        Dn = Math.max(Dn, Ae.duration);
        const Ve = _n.clipAction(Ae);
        Ve.setLoop(ka), Ve.play();
      }), _n.setTime(0), Ei = !0, oe.textContent = "❚❚";
    } finally {
      at || s.classList.remove("show");
    }
  }
  sh.forEach((W) => {
    const J = document.createElement("button");
    J.className = "md-move-chip" + (W.ragdoll ? " ragdoll" : ""), J.dataset.id = W.id, J.textContent = W.label, J.addEventListener("click", () => ie(W)), K.appendChild(J);
  }), ee.addEventListener("click", () => O(Re === "town" ? "ring" : "town")), i.querySelectorAll(".md-cam-btn[data-cam]").forEach((W) => W.addEventListener("click", () => G(W.dataset.cam))), oe.addEventListener("click", () => {
    Ei = !Ei, oe.textContent = Ei ? "❚❚" : "▶";
  }), q.addEventListener("click", () => {
    z = (z + 1) % F.length, q.textContent = F[z].toFixed(2).replace(/\.00$/, ".0") + "x";
  }), ce.addEventListener("pointerdown", () => {
    E = !0;
  }), ce.addEventListener("pointerup", () => {
    E = !1;
  }), ce.addEventListener("input", () => {
    if (!_n) return;
    const W = parseFloat(ce.value) * Dn;
    _n.setTime(W), ve.textContent = `f${Math.round(W * 30)} / ${Math.round(Dn * 30)}`;
  });
  function pe(W) {
    Ze = W;
    const J = W === "battle";
    a.classList.toggle("active", J), c.classList.toggle("active", !J), l.classList.toggle("hidden", !J), h.classList.toggle("hidden", !J), J || (p.classList.add("hidden"), v.classList.add("hidden")), V.classList.toggle("hidden", J), Y.classList.toggle("hidden", J), A.visible = J, ai.visible = !J, ne.enabled = !J, J ? (be.visible = !0, dt.visible = !1, Ie.background = new Ne("#c5d4e4"), Ie.fog = new hs("#aeb6be", 28e-4), B && N && Ut()) : (O(Re), Gn || ie(sh[0]));
  }
  a.addEventListener("click", () => pe("battle")), c.addEventListener("click", () => pe("viewer"));
  function Ee(W) {
    if (!B || !N) return;
    if (U > 0 && (U -= W, U <= 0 && m.classList.remove("show")), $e > 0) {
      $e -= W;
      return;
    }
    if (ue === "pick_throw") {
      if (tt -= W, B.mixer.update(W * 0.15), N.mixer.update(W * 0.15), tt <= 0) {
        const et = Wr.filter((Ce) => Ce.grip === gn);
        cn(et[0] || Wr[0]);
      }
      Oe(W, !0);
      return;
    }
    if (ue === "playing_throw" && xe && Te) {
      xe.update(W), Ue += W;
      const et = Ue * 30;
      if (!we && et >= Te.impactFrame && (we = !0, N.hp = Math.max(0, N.hp - Te.dmg), N.stun = 0, ze(), $e = 0.085, Be = 0.32, ft = 0.18, t.play(Te.isKo ? "slam" : "down", 0.9), le(Te.isKo ? "K.O.!!" : `-${Te.dmg}!`, "#f97316", 1.1)), Ue >= Te.duration)
        if (Te.isKo)
          ue = "ko", t.play("win", 0.75), P.textContent = "K.O.!!", T.textContent = `${Te.label}で容疑者を確保！`, v.classList.remove("hidden");
        else {
          const Ce = y.position.clone(), Xe = new M(Math.sin(y.rotation.y), 0, Math.cos(y.rotation.y));
          bt(), B.root.visible = !0, N.root.visible = !0, B.pos.copy(Ce).addScaledVector(Xe, -0.55), N.pos.copy(Ce).addScaledVector(Xe, 0.85), Se(B.pos), Se(N.pos), B.state = "idle", B.play("idle", { loop: !0, fade: 0.15 }), N.state = "getup", N.stateTimer = 1.15, N.play("getup", { loop: !1, fade: 0.1, speed: 1.35 }), ue = "fight";
        }
      Oe(W, !1, !0);
      return;
    }
    if (ue === "ko") {
      Oe(W, !1, !0);
      return;
    }
    let J = X.x + (Z.KeyD || Z.ArrowRight ? 1 : 0) - (Z.KeyA || Z.ArrowLeft ? 1 : 0), Ae = X.y + (Z.KeyS || Z.ArrowDown ? 1 : 0) - (Z.KeyW || Z.ArrowUp ? 1 : 0);
    const Ve = Math.hypot(J, Ae);
    if (Ve > 1 && (J /= Ve, Ae /= Ve), B.stateTimer > 0) {
      if (B.stateTimer -= W, B.state === "strike" && !B.hitChecked && B.stateTimer < 0.22 && (B.hitChecked = !0, B.pos.distanceTo(N.pos) < 1.65 && N.state !== "getup"))
        if (N.state === "block")
          t.play("block", 0.65), le("GUARD!", "#94a3b8", 0.5);
        else {
          const Ce = B.comboStep === 0, Xe = Ce ? 11 : 7;
          N.hp = Math.max(1, N.hp - Xe), N.stun = Math.min(100, N.stun + (Ce ? 34 : 22)), N.flashTimer = 0.12, N.setFlash(!0), $e = Ce ? 0.06 : 0.03, Be = 0.14, ft = Ce ? 0.09 : 0.04, t.play("hit", 0.75), N.stun >= 100 && N.state !== "dizzy" ? (N.state = "dizzy", N.stateTimer = 4.5, N.play("dizzy", { loop: !0, fade: 0.12 }), le("グロッキー！投げチャンス！", "#facc15", 1.4)) : (N.state = "hit", N.stateTimer = 0.38, N.play(Ce ? "hit_head" : "hit_body", { loop: !1, fade: 0.05, speed: 1.25 })), ze();
        }
      B.stateTimer <= 0 && (B.state = "idle");
    }
    if (B.state === "idle" || B.state === "walk" || B.state === "block")
      if (me)
        B.state = "block", B.yaw = Math.atan2(N.pos.x - B.pos.x, N.pos.z - B.pos.z), B.play("block", { loop: !0, fade: 0.1 });
      else if (Ve > 0.12) {
        B.state = "walk";
        const et = 2.9;
        B.pos.x += J * et * W, B.pos.z += Ae * et * W, B.yaw = Math.atan2(J, Ae), B.play("walk", { loop: !0, fade: 0.12, speed: 1.15 });
      } else
        B.state = "idle", B.yaw = Math.atan2(N.pos.x - B.pos.x, N.pos.z - B.pos.z), B.play("idle", { loop: !0, fade: 0.14 });
    else B.state === "grab_lunge" && (B.pos.x += Math.sin(B.yaw) * 2.2 * W, B.pos.z += Math.cos(B.yaw) * 2.2 * W);
    if (N.flashTimer > 0 && (N.flashTimer -= W, N.flashTimer <= 0 && N.setFlash(!1)), N.stateTimer > 0 && (N.stateTimer -= W, N.state === "strike" && !N.hitChecked && N.stateTimer < 0.24 && (N.hitChecked = !0, B.pos.distanceTo(N.pos) < 1.6 && (B.state === "block" ? (t.play("block", 0.7), le("ブロック！反撃チャンス！", "#38bdf8", 0.8)) : (B.hp = Math.max(0, B.hp - 9), B.state = "hit", B.stateTimer = 0.35, B.play("hit_body", { loop: !1, fade: 0.05, speed: 1.2 }), Be = 0.15, ft = 0.07, t.play("hit", 0.7), ze(), B.hp <= 0 && (ue = "ko", P.textContent = "DOWN...", T.textContent = "もう一度リベンジしよう！", v.classList.remove("hidden"))))), N.stateTimer <= 0 && (N.state === "dizzy" && (N.stun = 0), N.state = "idle", ze())), N.state === "idle" || N.state === "walk") {
      const et = N.pos.distanceTo(B.pos), Ce = new M().subVectors(B.pos, N.pos);
      N.yaw = Math.atan2(Ce.x, Ce.z), de -= W, et > 1.45 ? (N.state = "walk", Ce.normalize(), N.pos.x += Ce.x * 1.85 * W, N.pos.z += Ce.z * 1.85 * W, N.play("walk", { loop: !0, fade: 0.12, speed: 0.95 })) : (N.state = "idle", N.play("idle", { loop: !0, fade: 0.15 }), de <= 0 && (de = 1.1 + Math.random() * 0.9, Math.random() < 0.72 ? (N.state = "strike", N.stateTimer = 0.52, N.hitChecked = !1, N.play(Math.random() < 0.5 ? "jab" : "hook", { loop: !1, fade: 0.08, speed: 1.05 })) : (N.state = "block", N.stateTimer = 0.85, N.play("block", { loop: !0, fade: 0.1 }))));
    }
    const Ge = new M().subVectors(B.pos, N.pos);
    Ge.y = 0;
    const Lt = Ge.length();
    if (Lt > 1e-3 && Lt < 0.82) {
      const et = (0.82 - Lt) * 0.5;
      Ge.normalize(), B.pos.addScaledVector(Ge, et), N.pos.addScaledVector(Ge, -et);
    }
    Se(B.pos), Se(N.pos), B.root.position.copy(B.pos), B.root.rotation.y = B.yaw, N.root.position.copy(N.pos), N.root.rotation.y = N.yaw;
    const He = N.state === "dizzy" && Fs() && B.pos.distanceTo(N.pos) <= 1.95;
    if (L.querySelector("small").textContent = He ? "背後投げ!" : "投げ", L.classList.toggle("back-ready", He), B.mixer.update(W), N.mixer.update(W), N.state === "getup") {
      N.root.updateMatrixWorld(!0);
      const et = ["pelvis", "spine_02", "spine_03", "Head", "foot_l", "foot_r", "calf_l", "calf_r"], Ce = new M();
      let Xe = 1 / 0;
      for (const pt of et) {
        const Rt = N.model.getObjectByName(pt);
        Rt && (Rt.getWorldPosition(Ce), Ce.y < Xe && (Xe = Ce.y));
      }
      if (Number.isFinite(Xe)) {
        const pt = Un + 0.05;
        N.root.position.y += pt - Xe;
      }
    } else
      N.root.position.y = Un;
    Oe(W, !1, !1);
  }
  function Se(W) {
    W.x = ls.clamp(W.x, jt.minX, jt.maxX), W.z = ls.clamp(W.z, jt.minZ, jt.maxZ), W.y = Un;
  }
  const Fe = new M(jt.cx, Un + 0.9, jt.cz);
  function Oe(W, J = !1, Ae = !1) {
    const Ve = Ae ? y.position.clone() : new M().addVectors(B.pos, N.pos).multiplyScalar(0.5), Ge = Ae ? 1.5 : B.pos.distanceTo(N.pos), Lt = new M(Ve.x, Un + (J ? 0.95 : 0.85), Ve.z);
    Fe.lerp(Lt, Math.min(1, W * 6));
    const He = ot(), et = Math.max(0, Ge - 1.6) * (He ? 0.75 : 0.5), Ce = J ? He ? 5.2 : 3.8 : Ae ? He ? 8.6 : 6.4 : (He ? 7.4 : 5.6) + et, Xe = J ? 2.2 : Ae ? He ? 3.85 : 3 : (He ? 3.55 : 2.8) + et * 0.35, pt = new M(Fe.x + 0.55, Un + Xe, Fe.z + Ce);
    if (j.position.lerp(pt, Math.min(1, W * 5)), Be > 0) {
      Be -= W;
      const Rt = ft * (Be / 0.32);
      j.position.x += (Math.random() - 0.5) * Rt * 2, j.position.y += (Math.random() - 0.5) * Rt * 2;
    }
    j.lookAt(Fe);
  }
  async function Le() {
    try {
      let Ge = function(He) {
        var wc;
        const et = new ye(), Ce = Hr(J.scene), Xe = /* @__PURE__ */ new Set(), pt = Ce.getObjectByName(He);
        pt && (Xe.add(pt), pt.traverse((Nn) => Xe.add(Nn)));
        const Rt = [];
        Ce.traverse((Nn) => {
          Nn.isSkinnedMesh && Nn.skeleton && Nn.skeleton.bones.some((fu) => Xe.has(fu)) && Rt.push(Nn);
        });
        const Ct = He === "Powerbomb_A" ? "Powerbomb_B" : "Powerbomb_A", ho = Ce.getObjectByName(Ct);
        return ho && ((wc = ho.parent) == null || wc.remove(ho)), Ce.traverse((Nn) => {
          Nn.isSkinnedMesh && !Rt.includes(Nn) && (Nn.visible = !1);
        }), et.add(Ce), et;
      };
      const [W, J] = await Promise.all([
        fetch("./muscle-detective/assets/combat_anims.json").then((He) => He.json()),
        lt(Wr[0].file)
      ]);
      if (at) return;
      Qe = {};
      for (const [He, et] of Object.entries(W))
        Qe[He] = Ix(et);
      const Ae = J.scene.getObjectByName("Powerbomb_A"), Ve = J.scene.getObjectByName("Powerbomb_B");
      if (!Ae || !Ve) throw new Error("Armatures not found in base GLB");
      const Lt = Ge("Powerbomb_A");
      B = $(Lt, k, "Player"), N = $(Lt, Q, "Enemy"), pe("battle");
    } catch (W) {
      console.error("[muscle-detective] init failed:", W), le("読み込みエラー", "#ef4444", 5);
    } finally {
      at || s.classList.remove("show");
    }
  }
  const it = () => {
    at || (j.fov = ot() ? 50 : 44, j.aspect = window.innerWidth / window.innerHeight, j.updateProjectionMatrix(), fe.setSize(window.innerWidth, window.innerHeight));
  };
  window.addEventListener("resize", it);
  function ht() {
    at || (at = !0, cancelAnimationFrame(Pe), window.removeEventListener("resize", it), window.removeEventListener("keydown", Bs), window.removeEventListener("keyup", ur), bt(), ne.dispose(), fe.dispose(), i.innerHTML = "");
  }
  o.addEventListener("click", () => {
    ht(), typeof e == "function" && e();
  });
  const At = new Ff();
  let wt = 0, st = 0;
  function De() {
    if (at) return;
    Pe = requestAnimationFrame(De);
    const W = Math.min(At.getDelta(), 0.05);
    if (wt += W, st++, wt >= 0.5 && (r.textContent = `${Math.round(st / wt)} FPS`, wt = 0, st = 0), Ze === "battle")
      Ee(W);
    else {
      if (_n && Ei && !E) {
        _n.update(W * F[z]);
        const J = _n.time % Dn;
        ce.value = (J / Dn).toFixed(4), ve.textContent = `f${Math.round(J * 30)} / ${Math.round(Dn * 30)}`;
      }
      ne.update();
    }
    fe.render(Ie, j);
  }
  return De(), Le(), ht;
}
export {
  Dx as mountMuscleDetective
};
