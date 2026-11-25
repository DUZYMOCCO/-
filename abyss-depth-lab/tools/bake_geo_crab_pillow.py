"""ABYSS DIVE — 地層背負いの巨蟹（仮）: 殻（黒玄武岩の地層塊）をプロシージャル焼きする。

外部素材・ライセンス非依存（Pillow のみ・オフライン生成 = Blender 焼き相当の生成素材）。
出力: assets/geo-crab-shell.webp / _n.webp（法線）/ _e.webp（発光）

  * 殻は「起伏のある黒玄武岩の露頭」に見えること（生物の脚は焼き込まない＝前脚は実行時に
    関節で描く）。
  * 線画なし・セミリアリスティック厚塗り（ART_STYLE_GUIDE 準拠）。輪郭線は描かない。

設計:
  1. 不規則なセル状割れ目網（ボロノイの細胞境界）＋横の節理で「割れて割れた岩」を作る。
  2. 割れ目は高さ場を彫り、割れ目に沿って淡い堆積と暗い空洞（AO）を置く。
  3. 上部の稜に、まとまりのある付着生物（サイズ・形の違う小さな群生）を置く。
  4. 接地のすぐ上に湿った露出関節（暗く彩度を落とし、鋭い艶）。
低解像度で描き LANCZOS 拡大する。
"""
import math as m
import time
from pathlib import Path
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parents[1] / 'assets'
CW, CH = 1180, 470
RW, RH = 480, 191           # 描画解像度（出力の約 2.46 倍へ拡大）
FLOOR_R = RH - 6
RESAMPLE = Image.Resampling.LANCZOS


def clamp(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def _hash(x, y, s):
    n = (x * 374761393 + y * 668265263 + s * 2147483647) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFFFF) / 0xFFFFFF


def vnoise(x, y, s=0):
    xi, yi = int(m.floor(x)), int(m.floor(y))
    xf, yf = x - xi, y - yi
    u, v = smooth(xf), smooth(yf)
    a = _hash(xi, yi, s); b = _hash(xi + 1, yi, s)
    c = _hash(xi, yi + 1, s); d = _hash(xi + 1, yi + 1, s)
    ab = a + (b - a) * u
    cd = c + (d - c) * u
    return ab + (cd - ab) * v


def fbm(x, y, oct_, s=0):
    total = 0.0; amp = 1.0; norm = 0.0; f = 1.0
    for i in range(oct_):
        total += amp * vnoise(x * f, y * f, s + i * 17)
        norm += amp; amp *= 0.5; f *= 2.0
    return total / norm


def ridge(x, y, s=0):
    return 1.0 - abs(fbm(x, y, 3, s) * 2.0 - 1.0)


def cell_edge(x, y, sx, sy, seed):
    """ボロノイの細胞境界（1=境界/割れ目）。sx,sy で縦横の異方性。"""
    px = x * sx; py = y * sy
    ix = int(m.floor(px)); iy = int(m.floor(py))
    f1 = 1e9; f2 = 1e9
    for j in (-1, 0, 1):
        cy = iy + j
        for i in (-1, 0, 1):
            cx = ix + i
            fx = cx + _hash(cx, cy, seed)
            fy = cy + _hash(cx, cy, seed + 7)
            dx = fx - px; dy = fy - py
            d = m.sqrt(dx * dx + dy * dy)
            if d < f1:
                f2 = f1; f1 = d
            elif d < f2:
                f2 = d
    return clamp(1.0 - (f2 - f1) / 0.42)


def top_line(u):
    """角ばった露頭の輪郭（左右非対称・割れた塊・張り出し）。"""
    top = 0.90
    # 大きな塊（高さの違うローブ）
    lobes = [(0.07, 0.30, 0.13), (0.26, 0.44, 0.16), (0.47, 0.50, 0.17),
             (0.70, 0.40, 0.14), (0.91, 0.30, 0.13)]
    for (cu, amt, w) in lobes:
        top -= amt * m.exp(-((u - cu) / w) ** 2)
    # 割れた塊・張り出し（角のある刻み）
    top -= (ridge(u * 9.0, 2.0, 301) - 0.5) * 0.11
    top -= (ridge(u * 21.0, 6.0, 607) - 0.5) * 0.06
    # 左に低い欠けた棚、右の肩に張り出し
    top += 0.10 * smooth(clamp((0.16 - u) / 0.16))
    top -= 0.06 * m.exp(-((u - 0.60) / 0.05) ** 2)
    return clamp(top, 0.06, 0.92)


def build():
    H = [[0.0] * RW for _ in range(RH)]
    C = [[0.0] * RW for _ in range(RH)]
    floor_v = FLOOR_R / RH
    for iy in range(RH):
        v = iy / RH
        hrow = H[iy]; crow = C[iy]
        for ix in range(RW):
            u = ix / RW
            edge = smooth(clamp((u - 0.010) / 0.12)) * smooth(clamp((0.990 - u) / 0.12))
            top = 0.92 + (top_line(u) - 0.92) * edge
            if v < top:
                continue
            h0 = clamp((v - top) / (floor_v - top))
            # 割れ目網: 不規則セル ＋ 横の節理（縦横比で横に長いセル）
            cell = cell_edge(u, v, 13.0, 17.0, 51)
            joint = cell_edge(u * 1.0, v * 3.4, 7.0, 7.0, 131)
            crack = clamp(max(cell, joint * 0.92))
            crow[ix] = crack
            bump = (fbm(u * 7.0, v * 4.0, 4, 3) - 0.5) * 1.05
            rg = (ridge(u * 12.0, v * 3.2, 9) - 0.5) * 0.85
            micro = (fbm(u * 30.0, v * 22.0, 2, 21) - 0.5) * 0.36
            cap = edge * (1.0 - h0) ** 0.42
            hh = clamp(h0 + (bump + rg + micro) * cap - crack * 0.55, 0.0, 1.0)
            hrow[ix] = hh * smooth(clamp((floor_v - v) / 0.07))
    return H, C


def box_blur(H, r=5):
    tmp = [[0.0] * RW for _ in range(RH)]
    for y in range(RH):
        row = H[y]; trow = tmp[y]
        for x in range(RW):
            x0 = x - r if x - r > 0 else 0
            x1 = x + r if x + r < RW - 1 else RW - 1
            s = 0.0
            for xx in range(x0, x1 + 1):
                s += row[xx]
            trow[x] = s / (x1 - x0 + 1)
    out = [[0.0] * RW for _ in range(RH)]
    for x in range(RW):
        for y in range(RH):
            y0 = y - r if y - r > 0 else 0
            y1 = y + r if y + r < RH - 1 else RH - 1
            s = 0.0
            for yy in range(y0, y1 + 1):
                s += tmp[yy][x]
            out[y][x] = s / (y1 - y0 + 1)
    return out


def to_normals(H):
    N = [[(128, 128, 255)] * RW for _ in range(RH)]
    K = 8.0
    for iy in range(1, RH - 1):
        hn = H[iy - 1]; hc = H[iy]; hp = H[iy + 1]
        nr = N[iy]
        for ix in range(1, RW - 1):
            nx = -(hc[ix + 1] - hc[ix - 1]) * K
            ny = -(hp[ix] - hn[ix]) * K
            nz = 1.0
            ln = m.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
            nr[ix] = (int(128 + 127 * nx / ln), int(128 + 127 * ny / ln), int(128 + 127 * nz / ln))
    return N


RAMP = [
    (0.00, (7, 10, 15)),
    (0.22, (15, 21, 29)),
    (0.45, (26, 35, 46)),
    (0.66, (44, 54, 67)),
    (0.84, (72, 79, 92)),
    (1.00, (120, 124, 136)),
]
SED_LO = (78, 84, 90)
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


LX, LY, LZ = -0.50, -0.58, 0.64


def compose(H, C, N, HA):
    col = Image.new('RGBA', (RW, RH), (0, 0, 0, 0))
    emi = Image.new('RGBA', (RW, RH), (0, 0, 0, 0))
    cp = col.load(); ep = emi.load()
    lnorm = m.sqrt(LX * LX + LY * LY + LZ * LZ)
    lx, ly, lz = LX / lnorm, LY / lnorm, LZ / lnorm
    for iy in range(RH):
        v = iy / RH
        hrow = H[iy]; crow = C[iy]; nrow = N[iy]; harow = HA[iy]
        for ix in range(RW):
            h = hrow[ix]
            if h <= 0.006:
                continue
            u = ix / RW
            ha = harow[ix]
            nx = (nrow[ix][0] - 128) / 127.0
            ny = (nrow[ix][1] - 128) / 127.0
            nz = (nrow[ix][2] - 128) / 127.0
            diff = clamp(nx * lx + ny * ly + nz * lz)
            ao = clamp(0.26 + 1.6 * (h - ha) + 0.66)
            cavity = smooth(clamp(0.5 + (h - ha) * 8.0))
            crack = crow[ix]
            shade = clamp(0.02 + 0.82 * diff * (0.40 + 0.60 * ao) + 0.26 * h * ao)
            shade *= (0.58 + 0.42 * cavity)
            r, g, b = ramp(shade)
            # 割れ目: 深い空洞 ＋ 光の当たる面に淡い堆積（割れ目の中に溜まる）
            if crack > 0.12:
                fill = clamp((crack - 0.12) / 0.6) * (0.25 + 0.55 * diff)
                sed = SED_LO if diff < 0.45 else SED_HI
                r = r + (sed[0] - r) * fill * 0.55
                g = g + (sed[1] - g) * fill * 0.55
                b = b + (sed[2] - b) * fill * 0.55
                deep = clamp((crack - 0.25) / 0.5)
                dark = 1.0 - 0.62 * deep * (1.0 - 0.55 * diff)
                r *= dark; g *= dark; b *= dark
            glow = 0
            # 付着生物: まとまった群生（クラスタノイズで点在位置を決め、サイズと色を散らす）
            if h > 0.40 and crack < 0.45:
                clump = fbm(u * 9.0, v * 8.0, 3, 171)
                dens = fbm(u * 34.0, v * 30.0, 3, 71)
                thr = 0.60 - 0.14 * clamp((clump - 0.5) * 2.0 + 0.5)
                if dens > thr:
                    t = clamp((dens - thr) / 0.24)
                    e0 = EPI[int(fbm(u * 40.0, v * 40.0, 1, 5) * 3) % 3]
                    rim = clamp(diff * 1.25)
                    r = r + (e0[0] - r) * (0.28 + 0.5 * t)
                    g = g + (e0[1] - g) * (0.28 + 0.5 * t)
                    b = b + (e0[2] - b) * (0.28 + 0.5 * t)
                    r += 46 * rim; g += 52 * rim; b += 46 * rim
                    if dens > thr + 0.06:
                        glow = int(240 * clamp((dens - thr - 0.06) / 0.20) * (0.5 + 0.5 * rim))
            # 湿った露出関節: 接地のすぐ上（暗く・彩度低く・鋭い艶・水面際の明るい線）
            wet = smooth(clamp((h - 0.03) / 0.05)) * smooth(clamp((0.24 - h) / 0.10))
            if wet > 0:
                spec = (diff ** 14) * wet
                r = r * (1 - 0.40 * wet) + WET_TINT[0] * 0.40 * wet + 130 * spec
                g = g * (1 - 0.40 * wet) + WET_TINT[1] * 0.40 * wet + 142 * spec
                b = b * (1 - 0.40 * wet) + WET_TINT[2] * 0.40 * wet + 160 * spec
                wl = smooth(clamp((0.10 - abs(h - 0.20)) / 0.05))
                r += 30 * wl; g += 34 * wl; b += 38 * wl
            a = int(255 * smooth(clamp(h / 0.026)))
            cp[ix, iy] = (int(clamp(r, 0, 255)), int(clamp(g, 0, 255)), int(clamp(b, 0, 255)), a)
            if glow:
                ep[ix, iy] = (int(glow * 0.5), int(glow * 0.9), int(glow * 0.86), glow)
    return col, emi


def main():
    t0 = time.time()
    H, C = build()
    HA = box_blur(H, 5)
    N = to_normals(H)
    col, emi = compose(H, C, N, HA)
    col = col.filter(ImageFilter.GaussianBlur(0.7)).resize((CW, CH), RESAMPLE)
    emi = emi.resize((CW, CH), RESAMPLE)
    ni = Image.new('RGBA', (RW, RH), (0, 0, 0, 0))
    npi = ni.load()
    for iy in range(RH):
        for ix in range(RW):
            if H[iy][ix] > 0.006:
                npi[ix, iy] = N[iy][ix] + (255,)
    ni = ni.resize((CW, CH), RESAMPLE)
    OUT.mkdir(parents=True, exist_ok=True)
    col.save(OUT / 'geo-crab-shell.webp', lossless=True, method=6)
    ni.save(OUT / 'geo-crab-shell_n.webp', lossless=True, method=6)
    emi.save(OUT / 'geo-crab-shell_e.webp', lossless=True, method=6)
    print('baked', (CW, CH), 'in %.1fs' % (time.time() - t0), '->', OUT)


if __name__ == '__main__':
    main()
