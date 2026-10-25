#!/usr/bin/env python3
# 立ち絵の原本（1024×1536 の透明 PNG）を、会話画面用に小さくして assets/portraits/ へ入れる。
# 何度でも流し直せる（同じ原本・同じ設定なら同じ結果になる）。
#   python tools/make-portraits.py <原本のフォルダ> [設定（既定 tools/portraits-config.json）]
# 原本のフォルダ: <ID>/<ID>__<表情>.png と、ロボの目の光 <ID>/<ID>__<表情>__eyes.png（白〜グレーの明るさだけ）。
#   名前に _wip が付いたファイル（描いている途中のもの）は使わない。設定にない ID のフォルダも使わない。
# 出力: assets/portraits/<ID>/<ID>__<表情>.webp（体。キャラごとに同じ範囲で切り抜く）
#       assets/portraits/<ID>/<ID>__<表情>__eyes.webp（目の光。白一色で、明るさを透明度に入れる＝ゲームで色をかける）
#       assets/portraits/portraits.json（切り抜き・目の位置・大きさなど。ゲームはこれだけを読む）
# 数字は「測った値（auto）」に、設定の「手直し（manual）」を上書きして決める。どちらも portraits.json に残す。
# 座標はすべて原本（1024×1536）の px。ゲームは書き出した絵の大きさではなく、この座標で並べる。
import colorsys, json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

TOOLS = Path(__file__).resolve().parent
OUT = TOOLS.parent / 'assets' / 'portraits'
ALPHA_MIN = 8        # 絵がある＝透明度がこれより大きい
EYE_MIN = 4          # 目の光がある＝明るさ×透明度がこれより大きい
EYE_CENTER_MIN = 40  # 目の中心を測るときは、はっきり光っている所だけ使う
CUT_FILL = 0.25      # 一番下の行がこの割合より埋まっていれば「まっすぐ切れた胸像」


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def grow(b, m, w, h):
    return [max(0, b[0] - m), max(0, b[1] - m), min(w, b[2] + m), min(h, b[3] + m)]


def eye_light(path):
    """目の光の明るさ（0〜255）＝ グレーの明るさ × 透明度"""
    a = np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)
    return a[..., :3].mean(-1) * a[..., 3] / 255


def defringe(img, d):
    """切り抜きの縁の掃除（少年の髪のまわりの白っぽいもや対策）。
    1) 体（透明度 200 以上）から ghost_r px より離れた薄い所を消す＝元の背景の残り（体から離れた灰色の輪）。
    2) 縁（不透明な内側から band_r px 以内）の色を、内側の色より明るくならないようにする＝縁の白いにじみ。"""
    a = np.asarray(img).astype(np.float32)
    al = a[..., 3]
    core = Image.fromarray(((al >= 200) * 255).astype(np.uint8))
    near = np.asarray(core.filter(ImageFilter.MaxFilter(2 * d['ghost_r'] + 1))) > 0
    al = np.where(near, al, 0)
    solid = Image.fromarray(((al >= 250) * 255).astype(np.uint8))
    inner = np.asarray(solid.filter(ImageFilter.MinFilter(2 * d['band_r'] + 1))) > 0
    band = (al > 0) & ~inner
    w = inner.astype(np.float32)
    blur = lambda x: np.asarray(Image.fromarray(x.clip(0, 255).astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(d['blur'])), dtype=np.float32)
    den = blur(w * 255) / 255
    fill = np.stack([blur(a[..., c] * w) for c in range(3)], -1) / np.maximum(den, 1e-4)[..., None]
    ok = band & (den > 0.02)
    rgb = a[..., :3].copy()
    rgb[ok] = np.minimum(rgb[ok], fill[ok] + 8)
    return Image.fromarray(np.dstack([rgb, al]).clip(0, 255).astype(np.uint8), 'RGBA')


def robot_layout(alpha, bb, eye, d):
    """ロボの大きさ・下へのずらし・頭のまん中を測る（設定の manual がないときに使う）。
    見えている高さが visible_h px くらいになる大きさにして、足もと（bbox の下）が画面の bottom（文字の枠の上の線の少し下）に来るようにずらす。
    ずらしが 0〜nudge_max に入らないときは、ずらしをその端にして大きさで合わせる。"""
    L = d['layout']  # portrait-layout.js の DIALOG_LAYOUT と同じ数字
    below = bb[3] - eye[1]
    per = L['portraitH'] / 1536  # 原本 1px × scale → 画面の高さに対する割合
    s = d['visible_h'] / (bb[3] - bb[1])
    ny = (d['bottom'] - L['eyeLine'] - below * per * s) / L['portraitH']
    if ny > d['nudge_max'] or ny < 0:
        ny = min(max(ny, 0), d['nudge_max'])
        s = (d['bottom'] - L['eyeLine'] - ny * L['portraitH']) / (below * per)
    s = min(max(s, d['scale_min']), d['scale_max'])
    ny = min(max((d['bottom'] - L['eyeLine'] - below * per * s) / L['portraitH'], 0), d['nudge_max'])
    # 頭のまん中: 目の高さから上 100px の各行で、目の x を含む（なければ一番近い）絵のつながりのまん中
    xs = []
    for y in range(max(0, eye[1] - 100), eye[1] + 1, 10):
        row = alpha[y] > 128
        cols = np.nonzero(row)[0]
        if not len(cols):
            continue
        x = eye[0] if row[eye[0]] else int(cols[np.argmin(np.abs(cols - eye[0]))])
        l = x
        while l > 0 and row[l - 1]:
            l -= 1
        r = x
        while r < len(row) - 1 and row[r + 1]:
            r += 1
        xs.append((l + r) / 2)
    return {'scale': round(s, 3), 'nudge': [0, round(ny, 3)], 'face_x': round(float(np.median(xs))) if xs else eye[0]}


def measured_eye_color(body, light):
    """目の光が当たる所の、体の絵の色合い（あざやかな画素の色相の中央値）。ほとんど色がなければ白っぽい色"""
    px = np.asarray(body.convert('RGB')).astype(np.float32)[light > 60] / 255
    px = px[:: max(1, len(px) // 4000)]
    hsv = np.array([colorsys.rgb_to_hsv(*p) for p in px]) if len(px) else np.zeros((0, 3))
    hsv = hsv[(hsv[:, 1] > 0.35) & (hsv[:, 2] > 0.5)] if len(hsv) else hsv
    if len(hsv) < 50:
        return '#eef6ff'
    h = np.angle(np.mean(np.exp(2j * np.pi * hsv[:, 0]))) / (2 * np.pi) % 1  # 色相は輪なので円の平均
    r, g, b = colorsys.hsv_to_rgb(h, 0.8, 1.0)
    return '#%02x%02x%02x' % (round(r * 255), round(g * 255), round(b * 255))


def save_webp(img, path, size, cfg, lossless=False):
    img = img.resize(size, Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    if lossless:
        img.save(path, 'WEBP', lossless=True, quality=100, method=6)
    else:
        img.save(path, 'WEBP', quality=cfg['quality'], method=6)
    return path.stat().st_size


def faces_of(src, cid, order):
    found = []
    for f in sorted((src / cid).glob(f'{cid}__*.png')):
        key = f.stem[len(cid) + 2:]
        if '_wip' in f.stem or key.endswith('__eyes') or '__' in key:
            continue
        found.append(key)
    rank = {k: i for i, k in enumerate(order)}
    return sorted(found, key=lambda k: (rank.get(k, len(order)), k))


def main():
    if len(sys.argv) < 2:
        sys.exit('使い方: python tools/make-portraits.py <原本のフォルダ> [設定]')
    src = Path(sys.argv[1])
    conf = json.loads(Path(sys.argv[2] if len(sys.argv) > 2 else TOOLS / 'portraits-config.json').read_text(encoding='utf-8'))
    ex = conf['export']
    out = {'_説明': 'tools/make-portraits.py が作る（手で直さない。直すのは tools/portraits-config.json）。座標は原本の px。',
           'canvas': None, 'chars': {}}
    total, written = 0, set()
    for cid, c in conf['chars'].items():
        faces = faces_of(src, cid, conf['face_order'])
        if not faces:
            print(f'{cid}: 原本がない（とばす）')
            continue
        bodies = {k: Image.open(src / cid / f'{cid}__{k}.png').convert('RGBA') for k in faces}
        if ex.get('defringe'):
            bodies = {k: defringe(b, ex['defringe']) for k, b in bodies.items()}
        W, H = bodies[faces[0]].size
        if out['canvas'] is None:
            out['canvas'] = [W, H]
        assert all(b.size == (W, H) for b in bodies.values()), f'{cid}: 原本の大きさがそろっていない'
        alpha = np.maximum.reduce([np.asarray(b)[..., 3] for b in bodies.values()])
        bb = bbox(alpha > ALPHA_MIN)
        bottom = alpha[bb[3] - 1, bb[0]:bb[2]] > 128
        auto = {'bbox': bb, 'cut': bb[3] if bottom.mean() > CUT_FILL else None}
        eyes_files = {k: src / cid / f'{cid}__{k}__eyes.png' for k in faces if (src / cid / f'{cid}__{k}__eyes.png').exists()}
        if c.get('robot') and 'neutral' in eyes_files:
            eb = bbox(eye_light(eyes_files['neutral']) > EYE_CENTER_MIN)
            auto['eye'] = [round((eb[0] + eb[2]) / 2), round((eb[1] + eb[3]) / 2)]
            auto.update(robot_layout(alpha, bb, auto['eye'], conf['robot_auto']))
            auto['eye_color'] = measured_eye_color(bodies['neutral'], eye_light(eyes_files['neutral']))
        else:
            auto['eye'] = [round((bb[0] + bb[2]) / 2), round(H * 0.30)]  # 目の高さは上から約30%（PORTRAIT_PLAN.md 3章）
        man = c.get('manual', {})
        v = {'scale': 1.0, 'nudge': [0, 0], 'crop': grow(bb, ex['margin'], W, H), **auto, **man}
        crop = v['crop']
        es = min(ex['max_scale'], ex['base_scale'] * v['scale'])  # 画面での大きさに合わせて、細かさがそろうように書き出す
        size = (round((crop[2] - crop[0]) * es), round((crop[3] - crop[1]) * es))
        entry = {
            'name': c['name'], 'side': c['side'], 'speaks': c.get('speaks', True), 'robot': bool(c.get('robot')),
            'crop': crop, 'eye': v['eye'], 'face_x': v.get('face_x', v['eye'][0]), 'cut': v['cut'], 'scale': v['scale'], 'nudge': v['nudge'],
        }
        if c.get('robot'):
            ra = conf['robot_auto']
            entry['eye_color'] = c.get('eye_color', auto.get('eye_color', '#7df9ff'))
            entry['eye_color_by_face'] = c.get('eye_color_by_face', ra['eye_color_by_face'])
            entry['eye_fx_by_face'] = c.get('eye_fx_by_face', ra['eye_fx_by_face'])
        entry['faces'] = {}
        for k in faces:
            rel = f'{cid}/{cid}__{k}.webp'
            n = save_webp(bodies[k].crop(crop), OUT / rel, size, ex)
            total += n; written.add(OUT / rel)
            f = {'src': rel}
            if k in eyes_files:
                light = eye_light(eyes_files[k])
                er = grow(bbox(light > EYE_MIN), ex['margin'], W, H)
                a = np.clip(np.round(light[er[1]:er[3], er[0]:er[2]]), 0, 255).astype(np.uint8)
                img = Image.merge('RGBA', [Image.new('L', (er[2] - er[0], er[3] - er[1]), 255)] * 3 + [Image.fromarray(a)])
                erel = f'{cid}/{cid}__{k}__eyes.webp'
                esize = (max(1, round((er[2] - er[0]) * es)), max(1, round((er[3] - er[1]) * es)))
                n2 = save_webp(img, OUT / erel, esize, ex, lossless=True)
                total += n2; written.add(OUT / erel)
                f.update({'eyes': erel, 'eyes_rect': er})
            entry['faces'][k] = f
        entry['auto'] = auto
        entry['manual'] = man
        out['chars'][cid] = entry
        assert 'neutral' in faces, f'{cid}: neutral（ふつうの顔）がない'
        print(f'{cid}: 表情 {len(faces)}（{", ".join(faces)}）目の光 {len(eyes_files)} 切り抜き {crop} → {size[0]}×{size[1]}'
              f' 目 {v["eye"]} 切れ目 {v["cut"]} 大きさ {v["scale"]}')
    for old in sorted(OUT.glob('*/*.webp')):  # 前に書き出して、今はもう使わない絵を消す
        if old not in written:
            old.unlink(); print('消した:', old.relative_to(OUT))
    (OUT / 'portraits.json').write_text(json.dumps(out, ensure_ascii=False, indent=1) + '\n', encoding='utf-8', newline='\n')  # 改行は LF（Windows でも同じ中身に）
    print(f'webp 合計 {total / 1024 / 1024:.2f} MB → {OUT / "portraits.json"}')


if __name__ == '__main__':
    main()
