"""ABYSS DIVE — 地層背負いの巨蟹: 前脚の各甲殻を Blender 4.5 / Cycles の実体メッシュで造形し、
関節ピボット付きの透過 WebP へ焼く（Canvas 図形は素材が読めない時のフォールバック）。

公開中の敵アート（v3.8.0 のヤドカリB / 煤冠イソギンチャク）は Blender のパーツ別レンダなので、
同じ基準で焼く: 左上からのキー＋寒色のアンビエント、ティントされた AO、輪郭線なし、
マットな甲殻＋関節の濡れ膜だけ局所的な艶。連続反射・チューブ・一様ノイズ・発光による水増しはしない。

造形:
  - 非円形の断面（上=丸く高い / 下=平ら）＋ゆるい S 字の中心線。
  - 殻板は厚みのある別メッシュとして重ねる（合わせ目に落ち影が出る）。
  - 隆起（Subsurf 後の面取り）・欠け・微細な孔（ボロノイのバンプ）・
    付着生物（面に載った小さな円錐）・摩耗（凸部の色）・関節の濡れ膜。
  - 描いた外形は当たり（LEG_R=26 / CLAW_R=34）の内側。

出力: _merus.png / _fore.png / _claw.png（透過・5px/論理px）と crab-leg-parts.json（寸法・ピボット）。
使い方: "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" -b --factory-startup \
        -P tools/bake_geo_crab_leg.py -- <出力ディレクトリ>
"""
import bpy
import json
import math
import os
import random
import sys
from mathutils import Vector

TAU = math.tau
S = 5.0                       # 描画 px / 論理 px
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
L1, L2 = 300.0, 320.0         # geoCrabLeg の脚長（当たりと同じ）
CLAW_R = 34.0

random.seed(20261125)


# ---------------------------------------------------------------- helpers
def lerp(a, b, t):
    return a + (b - a) * t


def hump(t, c, w, a):
    return a * math.exp(-((t - c) / w) ** 2)


def ring(cx, yc, ytop, ybot, hd, n=18):
    """非円形の断面（上=丸く高い / 下=平ら）。"""
    pts = []
    for i in range(n):
        th = TAU * i / n
        s, c = math.sin(th), math.cos(th)
        y = yc + 0.5 * (ytop + ybot) + 0.5 * (ytop - ybot) * s
        pts.append((cx, y, hd * c))
    return pts


def loft(name, stations, taper_ends=True):
    verts, faces, rings = [], [], []
    n = 18
    for (x, ytop, ybot, hd, yc) in stations:
        base = len(verts)
        verts.extend(ring(x, yc, ytop, ybot, hd, n))
        rings.append(base)
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(n):
            j = (i + 1) % n
            faces.append((a + i, a + j, b + j, b + i))
    faces.append(tuple(rings[0] + i for i in range(n - 1, -1, -1)))
    faces.append(tuple(rings[-1] + i for i in range(n)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def shell_finish(ob, subsurf=2, disp=0.75, bevel=0.32):
    """実体の殻らしく整える: 分割で丸め、微小な起伏を入れ、縁を面取りする。"""
    sub = ob.modifiers.new('sub', 'SUBSURF')
    sub.levels = subsurf
    sub.render_levels = subsurf
    d = ob.modifiers.new('disp', 'DISPLACE')
    d.texture = bpy.data.textures['chit_surface']
    d.texture_coords = 'LOCAL'
    d.strength = disp
    d.mid_level = 0.5
    b = ob.modifiers.new('bev', 'BEVEL')
    b.width = bevel
    b.segments = 2
    b.limit_method = 'ANGLE'
    b.angle_limit = math.radians(42)
    for p in ob.data.polygons:
        p.use_smooth = True


def collar(prof, x_center, half, bulge, name):
    """殻板の縁が張り出した環（実体の縁＝落ち影が出る）。Subsurf で消えないよう別メッシュにする。"""
    st = []
    for i in range(6):
        u = i / 5
        x = x_center - half + 2 * half * u
        _, ytop, ybot, hd, yc = prof(x)
        f = 1.0 + bulge * math.exp(-((u - 0.5) / 0.34) ** 2)
        st.append((x, ytop * f, ybot * f, hd * f, yc))
    return loft(name, st)


def chip(ob, frac_x, amount, seed):
    """殻板の縁を小さく欠けさせる。"""
    rnd = random.Random(seed)
    me = ob.data
    xs = [v.co.x for v in me.vertices]
    x0, x1 = min(xs), max(xs)
    target = x0 + (x1 - x0) * frac_x
    for v in me.vertices:
        if abs(v.co.x - target) < (x1 - x0) * 0.06 and v.co.y > 0:
            if rnd.random() < 0.30:
                v.co.y -= amount * (0.5 + rnd.random())
                v.co.z *= 0.7


def surface_point(prof, x, y):
    """断面プロファイルから、面(y, z)上の点を返す（付着物を面に載せる）。"""
    x, ytop, ybot, hd, yc = prof(x)
    r = max(0.5, (ytop - ybot) * 0.5)
    dy = (y - (yc + (ytop + ybot) * 0.5)) / r
    dy = max(-0.96, min(0.96, dy))
    z = hd * math.sqrt(max(0.0, 1.0 - dy * dy))
    return y, z


def epibionts(prof, x_lo, x_hi, y_lo, y_hi, count, seed, r_min, r_max):
    """付着生物。面に載せ、少し埋める（浮かせない）。"""
    rnd = random.Random(seed)
    made = []
    for i in range(count):
        x = rnd.uniform(x_lo, x_hi)
        y = rnd.uniform(y_lo, y_hi)
        r = rnd.uniform(r_min, r_max)
        _, z = surface_point(prof, x, y)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r, radius2=r * 0.30,
                                        depth=r * 1.6, location=(x, y, z - r * 0.42))
        ob = bpy.context.object
        ob.name = f'epi_{seed}_{i}'
        assign(ob, 'epibiont')
        made.append(ob)
    return made


def assign(ob, mat_name):
    mat = bpy.data.materials[mat_name]
    if not ob.data.materials:
        ob.data.materials.append(mat)
    else:
        ob.data.materials[0] = mat


# ---------------------------------------------------------------- materials
def mat_chitin():
    """マットな甲殻。曲率に沿った摩耗・孔・ティントされた AO。輪郭線なし。"""
    m = bpy.data.materials.new('chitin')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.052, 0.066, 0.082, 1)
    bsdf.inputs['Roughness'].default_value = 0.66
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.28
    # 色むら（低周波）
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.2
    noise.inputs['Detail'].default_value = 8.0
    noise.inputs['Roughness'].default_value = 0.6
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.32
    ramp.color_ramp.elements[0].color = (0.028, 0.038, 0.052, 1)
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = (0.082, 0.104, 0.130, 1)
    mix1 = nt.nodes.new('ShaderNodeMixRGB')
    mix1.blend_type = 'MIX'
    mix1.inputs['Fac'].default_value = 0.60
    # 摩耗（凸部を少し明るく）
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    pr = nt.nodes.new('ShaderNodeValToRGB')
    pr.color_ramp.elements[0].position = 0.49
    pr.color_ramp.elements[0].color = (0, 0, 0, 1)
    pr.color_ramp.elements[1].position = 0.70
    pr.color_ramp.elements[1].color = (0.60, 0.60, 0.60, 1)
    mix2 = nt.nodes.new('ShaderNodeMixRGB')
    mix2.blend_type = 'SCREEN'
    mix2.inputs['Fac'].default_value = 0.10
    # 孔（ボロノイ）
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.feature = 'F1'
    vor.inputs['Scale'].default_value = 26.0
    vr = nt.nodes.new('ShaderNodeValToRGB')
    vr.color_ramp.elements[0].position = 0.00
    vr.color_ramp.elements[0].color = (0, 0, 0, 1)
    vr.color_ramp.elements[1].position = 0.30
    vr.color_ramp.elements[1].color = (1, 1, 1, 1)
    # 孔を凹ませる＋暗くする＋ざらつかせる
    b1 = nt.nodes.new('ShaderNodeBump')
    b1.inputs['Strength'].default_value = 0.85
    b1.inputs['Distance'].default_value = 0.8
    b2 = nt.nodes.new('ShaderNodeBump')
    b2.inputs['Strength'].default_value = 0.55
    b2.inputs['Distance'].default_value = 2.6
    mix3 = nt.nodes.new('ShaderNodeMixRGB')
    mix3.blend_type = 'MULTIPLY'
    mix3.inputs['Fac'].default_value = 0.30
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = 14.0
    mix4 = nt.nodes.new('ShaderNodeMixRGB')
    mix4.blend_type = 'MULTIPLY'
    mix4.inputs['Fac'].default_value = 0.55
    rgh = nt.nodes.new('ShaderNodeMixRGB')
    rgh.blend_type = 'MIX'
    rgh.inputs['Color1'].default_value = (0.58, 0.58, 0.58, 1)   # 面はマット
    rgh.inputs['Color2'].default_value = (0.92, 0.92, 0.92, 1)   # 孔の中はさらに粗く
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix1.inputs['Color1'])
    nt.links.new(mix1.outputs['Color'], mix2.inputs['Color1'])
    nt.links.new(pr.outputs['Color'], mix2.inputs['Color2'])
    nt.links.new(mix2.outputs['Color'], mix3.inputs['Color1'])
    nt.links.new(vr.outputs['Color'], mix3.inputs['Color2'])
    nt.links.new(mix3.outputs['Color'], mix4.inputs['Color1'])
    nt.links.new(ao.outputs['Color'], mix4.inputs['Color2'])
    nt.links.new(mix4.outputs['Color'], bsdf.inputs['Base Color'])
    nt.links.new(noise.outputs['Fac'], b2.inputs['Height'])
    nt.links.new(vr.outputs['Color'], b1.inputs['Height'])
    nt.links.new(b1.outputs['Normal'], b2.inputs['Normal'])
    nt.links.new(b2.outputs['Normal'], bsdf.inputs['Normal'])
    nt.links.new(vr.outputs['Color'], rgh.inputs['Fac'])
    nt.links.new(rgh.outputs['Color'], bsdf.inputs['Roughness'])
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m


def mat_membrane():
    """関節の濡れた膜。ここだけ艶（ローカルな鏡面）。"""
    m = bpy.data.materials.new('membrane')
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    # 真っ黒にしない（合わせ目が黒い楔に見える）。濡れて暗いが面の向きが読める暗青。
    bsdf.inputs['Base Color'].default_value = (0.046, 0.058, 0.072, 1)
    bsdf.inputs['Roughness'].default_value = 0.20
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = 0.66
    if 'Coat Weight' in bsdf.inputs:
        bsdf.inputs['Coat Weight'].default_value = 0.22
        bsdf.inputs['Coat Roughness'].default_value = 0.12
    return m


def mat_epibiont():
    """付着生物。少し明るい灰青。"""
    m = bpy.data.materials.new('epibiont')
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (0.145, 0.185, 0.185, 1)
    bsdf.inputs['Roughness'].default_value = 0.58
    vor = m.node_tree.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = 40.0
    b = m.node_tree.nodes.new('ShaderNodeBump')
    b.inputs['Strength'].default_value = 0.7
    b.inputs['Distance'].default_value = 0.35
    m.node_tree.links.new(vor.outputs['Distance'], b.inputs['Height'])
    m.node_tree.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return m


# ---------------------------------------------------------------- parts
PROF_M = None
PROF_F = None


def prof_merus(x):
    t = max(0.0, min(1.0, x / L1))
    pinch = 0.66 + 0.34 * min(1.0, (1 - t) / 0.20)
    ytop = (lerp(21.0, 14.0, t) + hump(t, 0.34, 0.28, 2.0)) * pinch
    ybot = -lerp(12.5, 9.0, t) * pinch
    yc = math.sin(t * 3.1) * 2.6
    hd = 0.52 * (ytop - ybot) * 0.5
    return x, ytop, ybot, hd, yc


def prof_fore(x):
    t = max(0.0, min(1.0, x / L2))
    pinch = 0.66 + 0.34 * min(1.0, t / 0.22)
    ytop = (lerp(15.0, 10.0, t) + hump(t, 0.30, 0.30, 1.0)) * pinch
    ybot = -lerp(10.5, 7.0, t) * pinch
    yc = math.sin(t * 3.6 + 1.2) * 1.8
    hd = 0.50 * (ytop - ybot) * 0.5
    return x, ytop, ybot, hd, yc


def build_merus():
    objs = []
    N = 26
    base = [prof_merus(L1 * i / N) for i in range(N + 1)]
    # 先の殻板ほど外へ少し張り出す＝合わせ目に縁の厚みが出る（重なった殻板）。
    for k, (a, b, ws) in enumerate([(0.00, 0.42, 0.90), (0.34, 0.74, 1.12), (0.66, 1.00, 1.22)]):
        sub = []
        M = 16
        for i in range(M + 1):
            tt = a + (b - a) * i / M
            x, ytop, ybot, hd, yc = base[min(N, int(round(tt * N)))]
            g = 1.0
            for s in (0.37, 0.70):          # 合わせ目の手前に溝＝縁の下に落ち影
                g -= 0.13 * math.exp(-((tt - s) / 0.030) ** 2)
            if k > 0:                       # 手前の殻板の縁を張り出させる（縁の厚み）
                g += 0.17 * math.exp(-((tt - a) / 0.020) ** 2)
            sub.append((x, ytop * ws * g, ybot * ws * g, hd * ws * g, yc))
        o = loft(f'merus_plate{k}', sub)
        shell_finish(o)
        chip(o, 0.55, 2.4, 11 + k)
        assign(o, 'chitin')
        objs.append(o)
    for i, xc in enumerate((L1 * 0.37, L1 * 0.70)):
        c = collar(prof_merus, xc, 5.0, 0.22, f'merus_collar{i}')
        shell_finish(c, disp=0.5, bevel=0.25)
        assign(c, 'chitin')
        objs.append(c)
    objs += epibionts(prof_merus, 20, L1 - 40, -2.0, 15.0, 14, 21, 1.2, 2.8)
    mem = loft('merus_membrane', [
        (L1 - 30, 1.5, -1.5, 1.0, 0.0),
        (L1 - 20, 9.5, -8.5, 6.0, 0.0),
        (L1 - 6, 11.0, -9.5, 6.8, 0.0),
        (L1 + 3, 6.5, -5.5, 3.8, 0.0),
    ])
    assign(mem, 'membrane')
    objs.append(mem)
    return objs


def build_fore():
    objs = []
    N = 26
    base = [prof_fore(L2 * i / N) for i in range(N + 1)]
    for k, (a, b, ws) in enumerate([(0.00, 0.44, 0.90), (0.36, 0.76, 1.10), (0.68, 1.00, 1.18)]):
        sub = []
        M = 14
        for i in range(M + 1):
            tt = a + (b - a) * i / M
            x, ytop, ybot, hd, yc = base[min(N, int(round(tt * N)))]
            g = 1.0
            for s in (0.39, 0.72):
                g -= 0.13 * math.exp(-((tt - s) / 0.030) ** 2)
            if k > 0:
                g += 0.17 * math.exp(-((tt - a) / 0.020) ** 2)
            sub.append((x, ytop * ws * g, ybot * ws * g, hd * ws * g, yc))
        o = loft(f'fore_plate{k}', sub)
        shell_finish(o)
        chip(o, 0.5, 2.0, 31 + k)
        assign(o, 'chitin')
        objs.append(o)
    for i, xc in enumerate((L2 * 0.39, L2 * 0.72)):
        c = collar(prof_fore, xc, 4.5, 0.22, f'fore_collar{i}')
        shell_finish(c, disp=0.5, bevel=0.22)
        assign(c, 'chitin')
        objs.append(c)
    objs += epibionts(prof_fore, 16, L2 - 30, -1.5, 11.0, 9, 41, 1.0, 2.3)
    mem = loft('fore_membrane', [
        (-8, 1.2, -1.2, 0.8, 0.0),
        (6, 7.5, -7.0, 4.6, 0.0),
        (20, 8.5, -7.5, 5.0, 0.0),
        (30, 4.0, -3.5, 2.4, 0.0),
    ])
    assign(mem, 'membrane')
    objs.append(mem)
    return objs


def prof_claw_palm(x):
    u = (x + 18.0) / 34.0
    u = max(0.0, min(1.0, u))
    ytop = [(0.0, 1.4), (0.18, 17.5), (0.47, 23.0), (0.76, 19.5), (1.0, 12.5)]
    ybot = [(0.0, -1.2), (0.18, -15.0), (0.47, -19.5), (0.76, -16.0), (1.0, -10.5)]
    hd = [(0.0, 0.8), (0.18, 9.5), (0.47, 12.0), (0.76, 10.5), (1.0, 7.0)]

    def spl(tb):
        for i in range(len(tb) - 1):
            a, b = tb[i], tb[i + 1]
            if u <= b[0]:
                f = (u - a[0]) / max(1e-6, b[0] - a[0])
                return lerp(a[1], b[1], f)
        return tb[-1][1]
    return x, spl(ytop), spl(ybot), spl(hd), 0.0


def build_claw():
    objs = []
    palm = loft('claw_palm', [prof_claw_palm(-18 + 34 * i / 14) for i in range(15)])
    shell_finish(palm, disp=0.6)
    assign(palm, 'chitin')
    objs.append(palm)

    def prof_up(x):
        t = max(0.0, min(1.0, (x - 6.0) / 28.0))
        ytop = lerp(18.5, 11.0, t) + hump(t, 0.45, 0.4, 1.4)
        ybot = lerp(7.0, 5.5, t)
        hd = 0.5 * (ytop - ybot) * 0.5
        return x, ytop, ybot, hd, lerp(6.0, 5.0, t)

    up = loft('claw_finger_up', [prof_up(6 + 28 * i / 12) for i in range(13)])
    shell_finish(up, disp=0.5)
    assign(up, 'chitin')
    objs.append(up)

    def prof_lo(x):
        t = max(0.0, min(1.0, (x - 6.0) / 22.0))
        ytop = lerp(3.0, 2.4, t)
        ybot = lerp(-16.5, -5.5, t) - hump(t, 0.5, 0.4, 1.1)
        hd = 0.5 * (ytop - ybot) * 0.5
        return x, ytop, ybot, hd, lerp(-9.0, -5.0, t)

    lo = loft('claw_finger_lo', [prof_lo(6 + 22 * i / 10) for i in range(11)])
    shell_finish(lo, disp=0.5)
    assign(lo, 'chitin')
    objs.append(lo)
    for o in (palm, up, lo):
        chip(o, 0.88, 1.6, 51)
    objs += epibionts(prof_claw_palm, -10, 14, 2.0, 13.0, 6, 61, 0.9, 2.0)
    return objs


# ---------------------------------------------------------------- render
def aim(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def setup_scene():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 128
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    sc.render.resolution_percentage = 100
    cam_data = bpy.data.cameras.new('cam')
    cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = (0, 0, 400)
    cam.rotation_euler = (0, 0, 0)
    sc.camera = cam
    tex = bpy.data.textures.new('chit_surface', 'CLOUDS')
    tex.noise_scale = 5.0
    tex.noise_depth = 3
    key = bpy.data.lights.new('key', 'SUN')
    key.energy = 1.50        # 殻（assets/geo-crab-shell.webp, 平均 0.26）と揃える
    key.angle = math.radians(8.0)
    key.color = (1.0, 0.98, 0.95)
    ko = bpy.data.objects.new('key', key)
    bpy.context.collection.objects.link(ko)
    ko.location = (-320, 300, 380)
    aim(ko, (L1 * 0.5, 0, 0))
    fill = bpy.data.lights.new('fill', 'SUN')
    fill.energy = 0.58       # 回転させても明度差が開きすぎないよう、回り込みを少し強く
    fill.angle = math.radians(45.0)
    fill.color = (0.55, 0.68, 0.85)
    fo = bpy.data.objects.new('fill', fill)
    bpy.context.collection.objects.link(fo)
    fo.location = (260, -240, 200)
    aim(fo, (L1 * 0.5, 0, 0))
    world = bpy.data.worlds.new('w')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.034, 0.045, 0.060, 1)
    bg.inputs[1].default_value = 1.0
    sc.world = world


def frame_and_render(objs, name, pivot_xy, pad=10):
    dg = bpy.context.evaluated_depsgraph_get()
    xs, ys = [], []
    for o in objs:
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            wc = ev.matrix_world @ Vector(c)
            xs.append(wc.x)
            ys.append(wc.y)
    x0, x1 = min(xs) - pad, max(xs) + pad
    y0, y1 = min(ys) - pad, max(ys) + pad
    wpx = int(math.ceil((x1 - x0) * S))
    hpx = int(math.ceil((y1 - y0) * S))
    cam = bpy.context.scene.camera
    cam.data.ortho_scale = (x1 - x0)
    cam.data.shift_x = ((x0 + x1) / 2) / (x1 - x0)
    cam.data.shift_y = ((y0 + y1) / 2) / (x1 - x0)
    bpy.context.scene.render.resolution_x = wpx
    bpy.context.scene.render.resolution_y = hpx
    path = os.path.join(OUT, f'_{name}.png')
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    try:
        img = bpy.data.images.load(path)
        px = img.pixels[:]
        n = len(px) // 4
        step = max(1, n // 60000)
        s = cnt = mx = 0.0
        for i in range(0, n, step):
            if px[i * 4 + 3] > 0.5:
                v = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3.0
                s += v
                cnt += 1
                mx = max(mx, v)
        bpy.data.images.remove(img)
        print(f'STATS {name}: n={cnt} mean={(s / cnt if cnt else 0):.3f} max={mx:.3f}')
    except Exception as ex:
        print('STATS failed', ex)
    return {
        'w': wpx, 'h': hpx, 'scale': S, 'x0': x0, 'y0': y0,
        'pivot': [round((pivot_xy[0] - x0) * S, 2), round((y1 - pivot_xy[1]) * S, 2)],
    }


def clear_meshes():
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # 先に空のマテリアルを作らない（同名で二重になり assign が別物を掴む）。
    mat_chitin()
    mat_membrane()
    mat_epibiont()
    setup_scene()

    parts = {}
    for key, builder, ln in (('merus', build_merus, L1), ('fore', build_fore, L2), ('claw', build_claw, 0.0)):
        clear_meshes()
        parts[key] = frame_and_render(builder(), key, (0.0, 0.0))
        parts[key]['len'] = ln
    with open(os.path.join(OUT, 'crab-leg-parts.json'), 'w', encoding='utf-8') as f:
        json.dump(parts, f, ensure_ascii=False, indent=2)
    print('LEG_BAKE_OK', json.dumps(parts))


main()
