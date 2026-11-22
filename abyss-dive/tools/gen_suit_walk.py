"""
ABYSS DIVE — 探索者（suit）の歩行アトラスと射撃上半身を生成する（再現用）。

使い方（リポジトリの D:\\スマホゲーム工房 が前提）:
    cd D:\\スマホゲーム工房\\abyss-dive
    python tools/gen_suit_walk.py
出力: assets/suit_walk.webp（4x4 アトラス・セル 200x280。元絵384 の (96,88)-(296,368) を切り出し）
        コマ順 = 0:待機 / 1..8:歩行 / 9,10:歩き出し / 11..14:調査
      assets/suit_shoot_upper.webp（射撃の上半身だけを同じ基準で切り出す）
元絵: アセット倉庫 bot-commander/assets/suit の suit_idle / suit_shoot（384x384）。
      倉庫が別の場所なら環境変数 SUIT_SRC で指定する。

原理:
  * 上半身（胴・腕・銃・ペルヴィス）は元絵をマスクで切り出し、剛体のまま使う。
    → 金属感・照明・スーツの絵柄を荒らさない。
  * 脚は「もも」「すね」「ブーツ」の3ピース。股関節・膝の2ボーンで足首を目標位置へ置き、
    ブーツは足首まわりに別角度で回す。→ 接地中はブーツ底を水平に保てる（つま先立ち回避）。
    踵の接地（爪先上げ）と蹴り出し（踵上げ）は足首角度で作る。
    接地足のブーツ最下点を床 y=360 に合わせ、遊脚はクリアランスぶん浮かせる。
    8コマ（接地→踏み込み→すれ違い→蹴り出し × 左右）。
"""
import math
from PIL import Image, ImageDraw
import suitrig as R

S = 32.0            # 片側ストライド（元絵px）
CLR = 12.0          # 遊脚のクリアランス
BOB = 3.0
NF = 8
HEEL = 14.0         # 接地（踵）で爪先を上げる角度（度）
TOE = 22.0          # 蹴り出しで踵を上げる角度（度）
C = R.CENTER_X
ATLAS_COLS, ATLAS_ROWS = 4, 4


def o_of(p):
    p = p % 1.0
    return S * (1 - 4 * p) if p < 0.5 else S * (-1 + 4 * (p - 0.5))


def foot_deg_of(p):
    """足首角度（度・正で爪先上げ）。接地(0)→足裏(〜0.32)→蹴り出し(0.5)→振り出し→接地。"""
    p = p % 1.0
    if p < 0.10:
        return HEEL * (1 - p / 0.10)          # 踵で着いて足裏へ
    if p < 0.32:
        return 0.0                            # 足裏を接地（ブーツ底は水平）
    if p < 0.50:
        return -TOE * ((p - 0.32) / 0.18)     # 踵を上げて蹴り出す
    q = (p - 0.50) / 0.50
    return -TOE + (HEEL + TOE) * q            # 振り出しで爪先を持ち上げ次の接地へ


def lift_of(p):
    p = p % 1.0
    return 0.0 if p <= 0.5 else CLR * math.sin(math.pi * (p - 0.5) / 0.5)


def body_dy_of(u):
    return BOB * (0.5 + 0.5 * math.cos(4 * math.pi * u))


def foot_pose(pieces, leg, off, lift=0.0, foot_deg=0.0):
    """足首を (C+off, GROUND-lift-boot底の深さ) へ置き、足首角度 foot_deg を添える。"""
    fx = C + off
    fy = R.GROUND - lift - R.boot_low(pieces, leg, foot_deg)
    return (fx, fy, foot_deg)


def poses_from_offsets(pieces, on, of, lift_n=0.0, lift_f=0.0, dy=0.0, fn=0.0, ff=0.0):
    return {'near': foot_pose(pieces, 'near', on, lift_n, fn),
            'far': foot_pose(pieces, 'far', of, lift_f, ff)}


def walk_frames(pieces):
    out = []
    sat = []
    for f in range(NF):
        u = f / NF
        dy = body_dy_of(u)
        pose = {}
        for leg, phase in (('near', u), ('far', u + 0.5)):
            pose[leg] = foot_pose(pieces, leg, o_of(phase), lift_of(phase), foot_deg_of(phase))
            if not R.reachable(leg, pose[leg][0], pose[leg][1], dy):
                sat.append((f, leg, round(phase, 3)))
        out.append(R.render_pose(pieces, pose, body_dy=dy))
    print('IK 到達不能:', sat if sat else 'なし（全 8 コマ 接地足が目標に届く）')
    return out


def start_frames(pieces):
    return [
        R.render_pose(pieces, poses_from_offsets(pieces, 12, -28, lift_n=4.0, dy=3.0, fn=6.0, ff=-10.0), body_dy=3.0),
        R.render_pose(pieces, poses_from_offsets(pieces, 24, -32, dy=2.0, fn=8.0, ff=-6.0), body_dy=2.0),
    ]


def survey_frames(pieces):
    # しゃがんで遺物に姿勢を寄せる短い非ループ（4コマ）
    spec = [(6, 0.0, 22, -30), (14, 3.0, 27, -24), (22, 6.0, 30, -18), (24, 6.0, 30, -16)]
    out = []
    for dy, lean, on, of in spec:
        pose = poses_from_offsets(pieces, on, of, dy=dy, fn=6.0, ff=-4.0)
        out.append(R.render_pose(pieces, pose, body_dy=dy, upper_rot=lean))
    return out


if __name__ == '__main__':
    import os
    HERE = os.path.dirname(os.path.abspath(__file__))
    GAME = os.path.dirname(HERE)
    # 元絵（アセット倉庫）と出力先。倉庫が別の場所なら SRC を書き換える。
    SRC = os.environ.get('SUIT_SRC', r'D:\スマホゲーム工房\アセット倉庫\bot-commander\assets\suit')
    OUT = os.path.join(GAME, 'assets')
    src = R.load_img(os.path.join(SRC, 'suit_idle.webp'))
    pieces = R.cut_pieces(src)

    frames = walk_frames(pieces) + start_frames(pieces) + survey_frames(pieces)
    # 先頭に待機（リグの休め姿勢 = 元の idle と同一）を入れる
    idle = R.render_pose(pieces, {'far': R.ANKLE['far'], 'near': R.ANKLE['near']})
    frames = [idle] + frames
    assert len(frames) <= ATLAS_COLS * ATLAS_ROWS

    # 共通の切り出し枠（探索者フレームの内容は x117..287 / y98..362 に収まる）
    CROP = (96, 88, 296, 368)          # x0,y0,x1,y1（元絵座標）
    CW, CH = CROP[2] - CROP[0], CROP[3] - CROP[1]
    union = Image.new('RGBA', (384, 384), (0, 0, 0, 0))
    for im in frames:
        union = Image.alpha_composite(union, im)
    print('union bbox', union.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox(), 'crop', CROP)

    atlas = Image.new('RGBA', (CW * ATLAS_COLS, CH * ATLAS_ROWS), (0, 0, 0, 0))
    for i, im in enumerate(frames):
        r, c = divmod(i, ATLAS_COLS)
        atlas.alpha_composite(im.crop(CROP), (c * CW, r * CH))
    atlas.save(os.path.join(OUT, 'suit_walk.webp'), lossless=True, quality=100, method=6, exact=True)
    print('atlas', atlas.size,
          'webp', os.path.getsize(os.path.join(OUT, 'suit_walk.webp')), 'frames', len(frames),
          'cell', (CW, CH), 'anchor local', (192 - CROP[0], 363 - CROP[1]))

    # 射撃の銃口位置を計測（suit_shoot の右端）
    sh = R.load_img(os.path.join(SRC, 'suit_shoot.webp'))
    a = sh.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    bb = a.getbbox()
    px = sh.load()
    mx = bb[2] - 1
    ys = [y for y in range(bb[1], bb[3]) if px[mx, y][3] > 40]
    print('shoot bbox', bb, 'muzzle x', mx, 'y', (min(ys), max(ys)) if ys else None)
    # 射撃の上半身だけを、同じ基準 (96,88) で切り出す
    SCROP = (96, 88, 368, R.Y_SPLIT + R.BAND)
    shoot_upper = sh.crop(SCROP)
    shoot_upper.save(os.path.join(OUT, 'suit_shoot_upper.webp'), lossless=True, method=6, exact=True)
    print('shoot upper crop', SCROP, 'size', shoot_upper.size,
          'bytes', os.path.getsize(os.path.join(OUT, 'suit_shoot_upper.webp')),
          'muzzle local', (mx - SCROP[0], 166 - SCROP[1]))

    print('saved assets/suit_walk.webp / assets/suit_shoot_upper.webp')
