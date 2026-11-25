"""ABYSS DIVE — 地層背負いの巨蟹（仮）: Blender の形状（高さパス）から最終マテリアルを作る。

入力: assets/_crab_tmp/height.png（Blender の Y 深度パス。大きいほど手前）, clay.png（アルファ用）
出力: assets/geo-crab-shell.webp / _n.webp / _e.webp（1180x470）

Blender は「形」だけを担当し、色・空洞(AO)・割れ目の堆積・湿った下帯・付着生物・法線は
ここで高さ場から作る（シェーダ依存を減らし破綻を避ける）。低彩度寒色の黒玄武岩。
"""
import math as m
import time
from pathlib import Path
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / 'assets'
TMP = ASSETS / '_crab_tmp'
OUT_WH = (1180, 470)
RESAMPLE = Image.Resampling.LANCZOS


def clamp(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def downsample(arr, w, h, f=4):
    ow, oh = w // f, h // f
    out = [[0.0] * ow for _ in range(oh)]
    for oy in range(oh):
        row = out[oy]
        for ox in range(ow):
            s = 0.0
            for dy in range(f):
                src = arr[oy * f + dy]
                base = ox * f
                for dx in range(f):
                    s += src[base + dx]
            row[ox] = s / (f * f)
    return out, ow, oh


def box_blur(A, w, h, r):
    tmp = [[0.0] * w for _ in range(h)]
    for y in range(h):
        row = A[y]; trow = tmp[y]
        for x in range(w):
            x0 = x - r if x - r > 0 else 0
            x1 = x + r if x + r < w - 1 else w - 1
            s = 0.0
            for xx in range(x0, x1 + 1):
                s += row[xx]
            trow[x] = s / (x1 - x0 + 1)
    out = [[0.0] * w for _ in range(h)]
    for x in range(w):
        for y in range(h):
            y0 = y - r if y - r > 0 else 0
            y1 = y + r if y + r < h - 1 else h - 1
            s = 0.0
            for yy in range(y0, y1 + 1):
                s += tmp[yy][x]
            out[y][x] = s / (y1 - y0 + 1)
    return out


RAMP = [
    (0.00, (7, 10, 15)),
    (0.20, (15, 21, 29)),
    (0.42, (26, 35, 46)),
    (0.62, (45, 55, 68)),
    (0.80, (72, 79, 92)),
    (1.00, (124, 128, 140)),
]
SED_LO = (74, 80, 86)
SED_HI = (150, 156, 158)
EPI = [(112, 190, 182), (150, 214, 206), (92, 166, 172)]
WET_TINT = (9, 17, 23)


def ramp(v):
    v = clamp(v)
    for i in range(len(RAMP) - 1):
        a, ca = RAMP[i]; b, cb = RAMP[i + 1]
        if v <= b:
            t = (v - a) / (b - a) if b > a else 0.0
            return (ca[0] + (cb[0] - ca[0]) * t,
                    ca[1] + (cb[1] - ca[1]) * t,
                    ca[2] + (cb[2] - ca[2]) * t)
    return RAMP[-1][1]


def vnoise(x, y, s=0):
    n = (int(x) * 374761393 + int(y) * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFF) / 0xFFFFFF


def val(u, v, s=0):
    xi, yi = int(m.floor(u)), int(m.floor(v))
    xf, yf = u - xi, v - yi
    a = vnoise(xi, yi, s); b = vnoise(xi + 1, yi, s)
    c = vnoise(xi, yi + 1, s); d = vnoise(xi + 1, yi + 1, s)
    sx, sy = smooth(xf), smooth(yf)
    ab = a + (b - a) * sx; cd = c + (d - c) * sx
    return ab + (cd - ab) * sy


def fbm2(u, v, oct_, s=0):
    t = 0.0; a = 1.0; nrm = 0.0; f = 1.0
    for i in range(oct_):
        t += a * val(u * f, v * f, s + i * 13)
        nrm += a; a *= 0.5; f *= 2.0
    return t / nrm


def main():
    t0 = time.time()
    hi = Image.open(TMP / 'height.png').convert('RGBA')
    W, Hh = hi.size
    hp = hi.load()
    rgb = hi.convert('RGB')
    gr = rgb.load()
    Ap = hi.split()[3].load()
    # alpha: height.png は film_transparent なので形のマスクに使える。clay のアルファの方が確実。
    clay = Image.open(TMP / 'clay.png').convert('RGBA')
    clp = clay.split()[3].load()
    Hm = [[0.0] * W for _ in range(Hh)]
    Am = [[0] * W for _ in range(Hh)]
    lo, hi_ = 1.0, 0.0
    for y in range(Hh):
        row = Hm[y]; arow = Am[y]
        for x in range(W):
            v = gr[x, y][0] / 255.0
            a = max(Ap[x, y], clp[x, y])
            row[x] = v
            arow[x] = a
            if a > 8:
                if v < lo: lo = v
                if v > hi_: hi_ = v
    rng = (hi_ - lo) or 1.0
    # 高さを不透明域いっぱいへ伸ばす（実際の起伏を出す）
    for y in range(Hh):
        row = Hm[y]
        for x in range(W):
            row[x] = (row[x] - lo) / rng
    # 低解像度で AO を作る
    Hs, aow, aoh = downsample(Hm, W, Hh, 4)
    b6 = box_blur(Hs, aow, aoh, 3)
    b16 = box_blur(Hs, aow, aoh, 8)
    b40 = box_blur(Hs, aow, aoh, 20)
    # 法線
    K = 11.0
    lx, lz, lo = -0.50, 0.62, 0.60
    ln = m.sqrt(lx * lx + lz * lz + lo * lo)
    lx, lz, lo = lx / ln, lz / ln, lo / ln
    col = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    emi = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    nrm = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    cp = col.load(); ep = emi.load(); np_ = nrm.load()
    for y in range(1, Hh - 1):
        hp0 = Hm[y - 1]; hp1 = Hm[y]; hp2 = Hm[y + 1]
        arow = Am[y]
        uu = y / Hh
        for x in range(1, W - 1):
            a = arow[x]
            if a < 8:
                continue
            h = hp1[x]
            # 勾配
            dgx = (hp1[x + 1] - hp1[x - 1]) * K
            dgy = (hp2[x] - hp0[x]) * K
            gz = -dgy
            nx = -dgx; nz = -gz; no = 1.0
            ln2 = m.sqrt(nx * nx + nz * nz + no * no)
            nx /= ln2; nz /= ln2; no /= ln2
            diff = clamp(nx * lx + nz * lz + no * lo)
            # AO（低解像度から）
            sx = int(x) // 4; sy = int(y) // 4
            if sx > aow - 1: sx = aow - 1
            if sy > aoh - 1: sy = aoh - 1
            occ = clamp((b6[sy][sx] - h) * 3.4) * 0.5 + clamp((b16[sy][sx] - h) * 2.4) * 0.32 + clamp((b40[sy][sx] - h) * 1.7) * 0.18
            ao = clamp(1.0 - occ)
            grad = m.sqrt(dgx * dgx + dgy * dgy)
            crev = clamp((b6[sy][sx] - h) * 8.0) * 0.6 + clamp(grad * 0.16)
            crev = clamp(crev)
            shade = clamp(0.030 + 0.98 * diff * (0.28 + 0.72 * ao) + 0.16 * ao * h)
            r, g, b = ramp(shade)
            # 割れ目の堆積（光の当たる面に淡く）＋空洞を強く沈める
            if crev > 0.15:
                fill = clamp((crev - 0.15) / 0.6) * (0.25 + 0.6 * diff)
                sed = SED_HI if diff > 0.45 else SED_LO
                r += (sed[0] - r) * fill * 0.6
                g += (sed[1] - g) * fill * 0.6
                b += (sed[2] - b) * fill * 0.6
                dk = 1.0 - 0.78 * clamp((crev - 0.22) / 0.5) * (1.0 - 0.55 * diff)
                r *= dk; g *= dk; b *= dk
            glow = 0
            # 付着生物（上部の稜・小さな群生。バーナクル状・縁に暗い影）
            if h > 0.46 and crev < 0.45:
                du = x / W; dv = y / Hh
                clump = fbm2(du * 7.0, dv * 6.0, 3, 171)
                dens = fbm2(du * 54.0, dv * 48.0, 3, 71)
                thr = 0.755 - 0.10 * clamp((clump - 0.5) * 2.0 + 0.5)
                if dens > thr - 0.06:
                    dd = dens - thr
                    # 縁（dd<0）は暗い影、芯（dd>0）は殻＋灯り
                    if dd < 0:
                        dk2 = 1.0 - 0.45 * clamp((-dd) / 0.06)
                        r *= dk2; g *= dk2 * 1.02; b *= dk2 * 1.04
                    else:
                        t = clamp(dd / 0.14)
                        e0 = EPI[int(fbm2(du * 40.0, dv * 40.0, 1, 5) * 3) % 3]
                        rim = clamp(diff * 1.3)
                        r += (e0[0] - r) * (0.20 + 0.34 * t)
                        g += (e0[1] - g) * (0.20 + 0.34 * t)
                        b += (e0[2] - b) * (0.20 + 0.34 * t)
                        r += 24 * rim; g += 28 * rim; b += 24 * rim
                        if dd > 0.05:
                            glow = int(200 * clamp((dd - 0.05) / 0.10) * (0.4 + 0.6 * rim))
            # 湿った露出関節（接地のすぐ上・暗く艶あり・水面際の明るい縁）。
            # 境界は形に沿って波打たせる（直線の帯にしない）。
            edge_noise = (fbm2(x / W * 5.0, y / Hh * 3.0, 3, 401) - 0.5) * 0.20
            wet_lo = 0.70 + edge_noise
            wet = smooth(clamp((uu - wet_lo) / 0.09)) * smooth(clamp((0.95 - uu) / 0.09))
            if wet > 0:
                spec = (diff ** 10) * wet
                r = r * (1 - 0.44 * wet) + WET_TINT[0] * 0.44 * wet + 120 * spec
                g = g * (1 - 0.44 * wet) + WET_TINT[1] * 0.44 * wet + 134 * spec
                b = b * (1 - 0.44 * wet) + WET_TINT[2] * 0.44 * wet + 156 * spec
                wl = smooth(clamp((0.03 - abs(uu - wet_lo)) / 0.025))
                r += 13 * wl; g += 15 * wl; b += 18 * wl
            # 玄武岩の細かな孔（ベシクル）。小さな凹みを散らす。
            pit = fbm2(x / W * 170.0, y / Hh * 170.0, 2, 909)
            if pit > 0.75:
                pk = 0.72 + 0.28 * clamp((pit - 0.75) / 0.25)
                r *= pk; g *= pk; b *= pk * 1.03
            cp[x, y] = (int(clamp(r, 0, 255)), int(clamp(g, 0, 255)), int(clamp(b, 0, 255)), a)
            np_[x, y] = (int(clamp(128 + 127 * nx, 0, 255)),
                         int(clamp(128 + 127 * nz, 0, 255)),
                         int(clamp(128 + 127 * no, 0, 255)), a)
            if glow:
                ep[x, y] = (int(glow * 0.5), int(glow * 0.9), int(glow * 0.86), int(min(255, glow * 1.1)))
    col = col.resize(OUT_WH, RESAMPLE)
    emi = emi.resize(OUT_WH, RESAMPLE)
    nrm = nrm.resize(OUT_WH, RESAMPLE)
    ASSETS.mkdir(parents=True, exist_ok=True)
    col.save(ASSETS / 'geo-crab-shell.webp', lossless=True, method=6)
    nrm.save(ASSETS / 'geo-crab-shell_n.webp', lossless=True, method=6)
    emi.save(ASSETS / 'geo-crab-shell_e.webp', lossless=True, method=6)
    print('post baked', OUT_WH, 'in %.1fs' % (time.time() - t0))


if __name__ == '__main__':
    main()
