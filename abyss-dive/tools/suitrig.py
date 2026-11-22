"""
ABYSS DIVE — 徒歩探索の探索者（suit）3ボーン脚リグ（生成用）

方針:
  * 上半身（胴・腕・銃・ペルヴィス）は元絵をマスクで切り出し、剛体のまま使う。
    → 金属感・照明・スーツの絵柄を荒らさない。
  * 脚は「もも」「すね」「ブーツ（足）」の3ピースに切る。股関節・膝の2ボーンで
    足首（ブーツの付け根＝回転中心）を目標位置へ置き、ブーツは足首まわりに
    別角度で回す。接地中はブーツ底を水平に保てるので、つま先立ちにならない。
    踵の接地（爪先上げ）と蹴り出し（踵上げ）は足首の角度で表現する。
  * 8コマぶん、脚の姿勢が実際に変わる実フレームを生成する（フェード無し）。

座標系: 元絵 384x384 / 足元 y=360 / 進行方向は +x（右）。
"""
import math
from PIL import Image, ImageDraw, ImageChops

W = H = 384
GROUND = 360          # 足の裏（目標接地 y）
ANKLE_Y = 342         # 足首（ブーツの付け根＝回転中心）の y
ANKLE_CUT = 334       # すね/ブーツの切り分け線（足首より少し上＝細い所で切る）
Y_SPLIT = 264         # 股関節帯の上端
THIGH_TOP = 254       # ももピースの上端（上半身に隠れる）
XSPLIT = 186          # 左脚(奥) / 右脚(手前) の境界
BAND = 14             # 股関節帯の高さ

HIP = {'far': (184.0, 260.0), 'near': (184.0, 260.0)}
KNEE = {'far': (157.0, 312.0), 'near': (210.0, 312.0)}
ANKLE = {'far': (152.0, ANKLE_Y), 'near': (211.0, ANKLE_Y)}
CENTER_X = 184.0      # 骨盤中心（左右の接地を対称にする基準）
DEPTH = HIP['near'][0] - HIP['far'][0]


def _dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


L1 = {k: _dist(HIP[k], KNEE[k]) for k in HIP}
L2 = {k: _dist(KNEE[k], ANKLE[k]) for k in HIP}
LEG_MAX = min(L1[k] + L2[k] for k in HIP)
REST_THIGH = {k: math.atan2(KNEE[k][1] - HIP[k][1], KNEE[k][0] - HIP[k][0]) for k in HIP}
REST_SHIN = {k: math.atan2(ANKLE[k][1] - KNEE[k][1], ANKLE[k][0] - KNEE[k][0]) for k in HIP}


def load_img(path):
    return Image.open(path).convert('RGBA')


def _rects_mask(rects, disks=()):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    for r in rects:
        d.rectangle(r, fill=255)
    for cx, cy, rad in disks:
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=255)
    return m


KNEE_PAD = 18         # 膝の丸い関節カバー（回しても隙間が出ない）
ANKLE_PAD = 15        # 足首の丸い関節カバー（ブーツ側。回してもすねとの境目が割れない）


def cut_pieces(src, xsplit=XSPLIT):
    alpha = src.getchannel('A')
    leg_x = {'far': (0, xsplit), 'near': (xsplit + 1, W - 1)}

    def make(rects, disks=()):
        out = src.copy()
        out.putalpha(ImageChops.multiply(alpha, _rects_mask(rects, disks)))
        return out

    pieces = {}
    for leg in ('far', 'near'):
        x0, x1 = leg_x[leg]
        kx, ky = KNEE[leg]
        ax, ay = ANKLE[leg]
        ky = int(ky)
        cy = int(ANKLE_CUT)
        knee_disk = (kx, ky, KNEE_PAD)
        ankle_disk = (ax, ay, ANKLE_PAD)
        pieces['thigh_' + leg] = make([[x0, THIGH_TOP, x1, ky]])
        pieces['shin_' + leg] = make([[x0, ky + 1, x1, cy]], [knee_disk])
        pieces['boot_' + leg] = make([[x0, cy + 1, x1, H - 1]], [ankle_disk])
    # 上半身 = y<Y_SPLIT + 股関節帯（全幅・静止）
    pieces['upper'] = make([[0, 0, W - 1, Y_SPLIT - 1], [0, Y_SPLIT, W - 1, Y_SPLIT + BAND]])
    return pieces


def _clamp(v, a, b):
    return a if v < a else (b if v > b else v)


def ik_leg(leg, foot_x, foot_y, hip_dy=0.0):
    """股関節を (HIP + (0,hip_dy)) に置き、足首 (foot_x, foot_y) へ届く
    (thigh_deg, shin_deg) を返す（休め姿勢からの差分・膝は前方へ曲がる）。
    届かないときは (0,0)（＝休め姿勢）を返す。"""
    hx = HIP[leg][0]
    hy = HIP[leg][1] + hip_dy
    l1, l2 = L1[leg], L2[leg]
    dx, dy = foot_x - hx, foot_y - hy
    d = math.hypot(dx, dy)
    base = math.atan2(dy, dx)
    if d >= l1 + l2 - 0.3:
        return 0.0, 0.0
    d = max(d, abs(l1 - l2) + 0.5)
    A = math.acos(_clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1))
    K = math.acos(_clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1))
    thigh = base - A
    shin_abs = thigh + (math.pi - K)
    return math.degrees(thigh - REST_THIGH[leg]), math.degrees(shin_abs - REST_SHIN[leg])


def reachable(leg, foot_x, foot_y, hip_dy=0.0):
    """IK が届くか（デバッグ用。届かないと足が goal に置けない）。"""
    hx, hy = HIP[leg][0], HIP[leg][1] + hip_dy
    return math.hypot(foot_x - hx, foot_y - hy) < L1[leg] + L2[leg] - 0.3


def _place(canvas, piece, angle_deg, center, offset=(0.0, 0.0)):
    rot = piece.rotate(angle_deg, resample=Image.NEAREST, center=center)
    if abs(offset[0]) > 1e-6 or abs(offset[1]) > 1e-6:
        shifted = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        shifted.paste(rot, (int(round(offset[0])), int(round(offset[1]))))
        rot = shifted
    return Image.alpha_composite(canvas, rot)


def boot_low(pieces, leg, foot_deg):
    """ブーツを足首まわりに foot_deg 回したときの、足首より下の深さ（px・正=下）。
    足首の y を GROUND - lift - boot_low に置くと、ブーツの最下点が接地する。"""
    ax, ay = ANKLE[leg]
    rot = pieces['boot_' + leg].rotate(-foot_deg, resample=Image.NEAREST, center=(ax, ay))
    low = lowest_y(rot)
    return 0.0 if low is None else (low - ay)


def render_pose(pieces, poses, body_dy=0.0, upper_rot=0.0):
    """poses[leg] は (足首_x, 足首_y) か (足首_x, 足首_y, 足首角度度<0で爪先下>)。
    奥→手前の順に描き、最後に上半身を body_dy だけ下げて重ねる。値が None の脚は描かない。
    upper_rot: 上半身を骨盤中心で回す角度（度・前傾で正）。"""
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for leg in ('far', 'near'):
        p = poses.get(leg)
        if p is None:
            continue
        fx, fy = p[0], p[1]
        foot_deg = p[2] if len(p) > 2 else 0.0
        t_deg, s_deg = ik_leg(leg, fx, fy, body_dy)
        hx = HIP[leg][0]
        hy = HIP[leg][1] + body_dy
        rt = REST_THIGH[leg] + math.radians(t_deg)
        kx2 = hx + L1[leg] * math.cos(rt)
        ky2 = hy + L1[leg] * math.sin(rt)
        kx, ky = KNEE[leg]
        canvas = _place(canvas, pieces['thigh_' + leg], -t_deg, (hx, hy))
        canvas = _place(canvas, pieces['shin_' + leg], -s_deg, KNEE[leg],
                        offset=(kx2 - kx, ky2 - ky))
        # ブーツ: 足首まわりに foot_deg 回してから、足首を (fx, fy) へ置く
        ax, ay = ANKLE[leg]
        boot = pieces['boot_' + leg].rotate(-foot_deg, resample=Image.NEAREST, center=(ax, ay))
        shifted = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        shifted.paste(boot, (int(round(fx - ax)), int(round(fy - ay))))
        canvas = Image.alpha_composite(canvas, shifted)
    up = pieces['upper']
    if abs(upper_rot) > 1e-6:
        up = up.rotate(-upper_rot, resample=Image.NEAREST, center=(CENTER_X, HIP['near'][1]))
    if abs(body_dy) > 1e-6:
        shifted = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        shifted.paste(up, (0, int(round(body_dy))))
        up = shifted
    return Image.alpha_composite(canvas, up)


def lowest_y(img, athr=24):
    """不透明画素の最大 y（足の裏の接地判定用）。"""
    a = img.getchannel('A').point(lambda v: 255 if v > athr else 0)
    bbox = a.getbbox()
    return None if not bbox else bbox[3] - 1


if __name__ == '__main__':
    import os
    src = load_img(os.path.join(
        os.environ.get('SUIT_SRC', r'D:\スマホゲーム工房\アセット倉庫\bot-commander\assets\suit'),
        'suit_idle.webp'))
    pieces = cut_pieces(src)
    out = render_pose(pieces, {'far': ANKLE['far'], 'near': ANKLE['near']})
    a, b = src.load(), out.load()
    vis = sum(1 for y in range(H) for x in range(W)
              if (a[x, y][3] > 8 or b[x, y][3] > 8) and
              max(abs(a[x, y][i] - b[x, y][i]) for i in range(4)) > 6)
    print('rest visible diff>6:', vis)
    print('L1', {k: round(v, 1) for k, v in L1.items()}, 'L2', {k: round(v, 1) for k, v in L2.items()})
