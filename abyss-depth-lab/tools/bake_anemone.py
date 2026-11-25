# -*- coding: utf-8 -*-
"""
ABYSS DIVE — 煤冠イソギンチャク（仮）offline bake（Blender 4.5 / ヘッドレス）
生成元（このスクリプト）は abyss-depth-lab/tools/ に保存する。

使い方:
  blender -b -P tools/bake_anemone.py -- --out "<abs assets dir>" --poses open,closed,warn,retract,dead --res 640

設計（docs/ART_STYLE_GUIDE.md 準拠）:
  - 線画（黒輪郭）なし。立体陰影＋ノイズバンプ＋手続き的な凹凸で「厚みと手触り」を出す。
  - 基部は煤色で肉厚、黒玄武岩に根づく。触手はくすんだ銅 → 灰紫の房。体は脈打つ。
  - 柔らかい拡散光（やや斜め上のキー＋弱いフィル＋リム）＋弱い噴気の下光。
  - 背景はフィルム透過（RGBA）。輪郭は陰影だけで作り、白縁・黒縁を出さない。
"""
import bpy, bmesh, math, os, sys
import numpy as np
from mathutils import noise as mnoise

# ------------------------------------------------------------------ args
argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else []

def argval(flag, default):
    return argv[argv.index(flag) + 1] if flag in argv else default

OUT = os.path.abspath(argval('--out', os.path.join(os.path.dirname(__file__), '..', 'assets')))
POSES = argval('--poses', 'open').split(',')
RES = int(argval('--res', '640'))
SAMPLES = int(argval('--samples', '48'))

# ------------------------------------------------------------------ util
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.objects):
        for d in list(c):
            try: c.remove(d)
            except Exception: pass

def node_of(nt, ntype):
    for n in nt.nodes:
        if n.type == ntype:
            return n
    return None

def pbsdf(nt):
    return node_of(nt, 'BSDF_PRINCIPLED')

def new_mesh(name, verts, faces):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(float(x) for x in v) for v in verts], [], faces)
    me.validate()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob

def shade_smooth(ob, angle=0.9):
    for p in ob.data.polygons:
        p.use_smooth = True
    m = ob.modifiers.new('auto', 'EDGE_SPLIT'); m.split_angle = angle

def displace_organic(ob, amp, freq, seed=1.0):
    """手続き的な凹凸（岩肌・マウンド用）。法線方向ではなく座標の和音で変位。"""
    for v in ob.data.vertices:
        x, y, z = v.co
        n = (math.sin(x * freq + seed) * math.cos(y * freq * 1.3 - seed) +
             0.5 * math.sin((x + y) * freq * 2.1 + seed * 2) +
             0.35 * math.cos(z * freq * 1.7 + seed * 3))
        v.co.x += n * amp * (x / (abs(x) + abs(y) + 1e-6) if (abs(x) + abs(y)) > 1e-6 else 0)
        v.co.y += n * amp * (y / (abs(x) + abs(y) + 1e-6) if (abs(x) + abs(y)) > 1e-6 else 0)
        v.co.z += n * amp * 0.6

def tube(name, pts, radii, seg=10):
    pts = np.asarray(pts, dtype=float); radii = np.asarray(radii, dtype=float)
    n = len(pts)
    tang = np.zeros_like(pts)
    tang[1:-1] = pts[2:] - pts[:-2]; tang[0] = pts[1] - pts[0]; tang[-1] = pts[-1] - pts[-2]
    tang /= (np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9)
    ref = np.array([0.0, 0.0, 1.0])
    verts, faces = [], []
    prev_ring = None
    for i in range(n):
        t = tang[i]
        up = ref if abs(np.dot(t, ref)) < 0.9 else np.array([1.0, 0.0, 0.0])
        side = np.cross(t, up); side /= (np.linalg.norm(side) + 1e-9)
        up2 = np.cross(side, t)
        ring = [pts[i] + side * (math.cos(2 * math.pi * k / seg) * radii[i])
                       + up2 * (math.sin(2 * math.pi * k / seg) * radii[i]) for k in range(seg)]
        base = len(verts); verts.extend(ring)
        if prev_ring is not None:
            for k in range(seg):
                faces.append((prev_ring + k, prev_ring + (k + 1) % seg,
                              base + (k + 1) % seg, base + k))
        prev_ring = base
    tip = len(verts); verts.append(pts[-1] + tang[-1] * radii[-1] * 0.8)
    for k in range(seg):
        faces.append((prev_ring + k, prev_ring + (k + 1) % seg, tip))
    return new_mesh(name, verts, faces)

def dome(name, radius, height, rings=16, segs=48, bump=0.0, seed=1.0, squash_z=1.0):
    verts, faces = [], []
    idx = []
    for r in range(rings + 1):
        v = (r / rings) * (math.pi / 2.0)
        rr = math.cos(v) * radius
        zz = math.sin(v) * height
        ring = []
        for s in range(segs):
            a = 2 * math.pi * s / segs
            x = math.cos(a) * rr; y = math.sin(a) * rr
            z = zz * squash_z
            if bump and r > 0:
                n = (math.sin(a * 5 + seed) * 0.5 + mango(a, r, seed)) * bump
                x += math.cos(a) * n; y += math.sin(a) * n; z += n * 0.5
            ring.append(len(verts)); verts.append((x, y, z))
        idx.append(ring)
    # 下の縁を閉じる
    for r in range(rings):
        for s in range(segs):
            a = idx[r][s]; b = idx[r][(s + 1) % segs]
            c = idx[r + 1][(s + 1) % segs]; d = idx[r + 1][s]
            faces.append((a, b, c, d))
    ob = new_mesh(name, verts, faces)
    return ob

def mango(a, r, seed):
    return math.cos(a * 2.3 + r * 1.7 + seed) * 0.6

# ------------------------------------------------------------------ materials
def add_bump(nt, bsdf, scale, strength, detail=8.0):
    tex = nt.nodes.new('ShaderNodeTexNoise')
    tex.inputs['Scale'].default_value = scale
    tex.inputs['Detail'].default_value = detail
    b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength
    nt.links.new(tex.outputs['Fac'], b.inputs['Height'])
    nt.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return tex

def mat_rock():
    m = bpy.data.materials.new('basalt'); m.use_nodes = True
    nt = m.node_tree; b = pbsdf(nt)
    b.inputs['Base Color'].default_value = (0.014, 0.012, 0.013, 1)
    b.inputs['Roughness'].default_value = 0.94
    add_bump(nt, b, 7.0, 0.7, 10.0)
    return m

def mat_soot():
    """煤色の肉厚な基部。下ほど黒く（岩に溶ける）、上ほど灰褐。"""
    m = bpy.data.materials.new('soot'); m.use_nodes = True
    nt = m.node_tree; b = pbsdf(nt); b.inputs['Roughness'].default_value = 0.9
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0
    mr.inputs['From Max'].default_value = 0.7
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.024, 0.020, 0.019, 1)   # 根（黒に近い煤）
    ramp.color_ramp.elements[1].color = (0.090, 0.072, 0.062, 1)   # 上部（煤灰褐）
    e = ramp.color_ramp.elements.new(0.5); e.color = (0.048, 0.040, 0.037, 1)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    add_bump(nt, b, 18.0, 0.85, 10.0)
    return m

def mat_tentacle(white=False, dead=False):
    m = bpy.data.materials.new('tent_dead' if dead else ('tent_white' if white else 'tent')); m.use_nodes = True
    nt = m.node_tree; b = pbsdf(nt); b.inputs['Roughness'].default_value = 0.55
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0
    mr.inputs['From Max'].default_value = 1.0
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    if dead:
        ramp.color_ramp.elements[0].color = (0.055, 0.052, 0.058, 1)
        ramp.color_ramp.elements[1].color = (0.150, 0.145, 0.150, 1)
        e0 = ramp.color_ramp.elements.new(0.45); e0.color = (0.100, 0.095, 0.100, 1)
        b.inputs['Roughness'].default_value = 0.85
    elif white:
        ramp.color_ramp.elements[0].color = (0.72, 0.85, 1.00, 1)
        ramp.color_ramp.elements[1].color = (1.00, 1.00, 1.00, 1)
    else:
        ramp.color_ramp.elements[0].color = (0.045, 0.040, 0.065, 1)  # 根元（灰紫黒）
        e0 = ramp.color_ramp.elements.new(0.30); e0.color = (0.190, 0.140, 0.235, 1)  # 灰紫
        e1 = ramp.color_ramp.elements.new(0.62); e1.color = (0.340, 0.180, 0.065, 1)  # くすんだ銅
        e2 = ramp.color_ramp.elements.new(0.86); e2.color = (0.400, 0.235, 0.095, 1)  # 銅のハイライト
        ramp.color_ramp.elements[1].color = (0.255, 0.200, 0.310, 1)  # 先端（灰紫）
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    # 縦縞（flesh の筋）＋微細 bump
    wave = nt.nodes.new('ShaderNodeTexWave'); wave.wave_type = 'BANDS'
    wave.inputs['Scale'].default_value = 40.0
    wave.inputs['Distortion'].default_value = 3.0
    bmix = nt.nodes.new('ShaderNodeMixRGB'); bmix.blend_type = 'MULTIPLY'
    bmix.inputs['Fac'].default_value = 0.25
    nt.links.new(ramp.outputs['Color'], bmix.inputs['Color1'])
    nt.links.new(wave.outputs['Color'], bmix.inputs['Color2'])
    nt.links.new(bmix.outputs['Color'], b.inputs['Base Color'])
    add_bump(nt, b, 30.0, 0.32, 10.0)
    if white:
        b.inputs['Emission Color'].default_value = (0.80, 0.90, 1.0, 1)
        b.inputs['Emission Strength'].default_value = 1.4
    return m

# ------------------------------------------------------------------ build
def build(st, rng):
    objs = []
    dead = bool(st.get('dead'))
    # 黒玄武岩の欠片（マウンドを抱くように 4 塊）
    for i, (rx, ry, rz, s) in enumerate([(-0.50, 0.06, 0.03, 0.40), (0.48, 0.02, 0.05, 0.36),
                                          (0.02, 0.30, 0.02, 0.30), (-0.14, -0.28, 0.0, 0.26)]):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=4, radius=s)
        for v in bm.verts:
            v.co.x *= 1.5; v.co.z *= 0.55
            j = rng.normal(0, 0.05, 3)
            v.co.x += rx + float(j[0]); v.co.y += ry + float(j[1]); v.co.z += rz + float(j[2])
        me = bpy.data.meshes.new('rock%d' % i); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('rock%d' % i, me); bpy.context.collection.objects.link(ob)
        displace_organic(ob, 0.05, 6.0, i * 3.7); shade_smooth(ob, 0.5)
        ob.data.materials.append(mat_rock()); objs.append(ob)

    # 煤色の肉厚な「体柱」（根づいた太い胴）。上部に肩を作り、凹凸で手触りを出す。
    floor = dome('mound', radius=0.74, height=0.20, rings=8, segs=56, bump=0.04, seed=5.0)
    displace_organic(floor, 0.04, 7.0, 1.3); shade_smooth(floor, 1.0)
    floor.data.materials.append(mat_soot()); objs.append(floor)
    column = dome('column', radius=0.60, height=0.74, rings=20, segs=56, bump=0.05, seed=2.0)
    for v in column.data.vertices: v.co.z += 0.02
    displace_organic(column, 0.022, 4.0, 1.3)
    shade_smooth(column, 3.0); column.data.materials.append(mat_soot()); objs.append(column)

    # 中央の口盤（浅い凹み・銅色。触手はこの口盤の縁から放射状に出る）
    disc = dome('disc', radius=0.26, height=0.08, rings=8, segs=44, bump=0.0)
    for v in disc.data.vertices: v.co.z = v.co.z * 0.5 - 0.04
    disc.location = (0, 0, 0.76)
    shade_smooth(disc, 1.0);    disc.data.materials.append(mat_tentacle(st.get('white', False), dead))
    objs.append(disc)

    # 触手: 外環＋内環。口盤の縁から放射状に広がる王冠。state で「閉／収縮（白）／広げ」を切替。
    tm = mat_tentacle(st.get('white', False), dead)
    rings = [(0.200, 26, 1.00, 0.755), (0.125, 16, 0.66, 0.785)]
    for ri, (r0, count, lmul, z0) in enumerate(rings):
        for i in range(count):
            a = 2 * math.pi * i / count + 0.22 * ri
            sp = st['spread'] * lmul + rng.normal(0, 0.02)
            ln = st['length'] * lmul * (1 + rng.normal(0, 0.08))
            curl = st['curl'] * lmul
            base_r = st['base_r'] * lmul; tip_r = st['tip_r'] * lmul
            steps = 13; pp, rr = [], []
            for s in range(steps + 1):
                t = s / steps
                # 放射状: 横へ弧を描いて伸び、先端で外向きにカール
                rad = r0 + sp * (t ** 1.15)
                z = z0 + ln * (t - 0.18 * t * t)
                sway = math.sin(t * 4.2 + i * 1.7 + ri) * st.get('sway', 0.05)
                ang = a + sway * t
                x = math.cos(ang) * rad; y = math.sin(ang) * rad
                zz = z + curl * (t ** 1.7) * 0.5 - curl * (t ** 3) * 0.5
                pp.append([x, y, zz])
                # 触手の根元は太く、先端で僅かにふくらんでから尖る（イソギンチャクの触手）
                bulge = 1.0 + 0.30 * math.exp(-((t - 0.82) / 0.16) ** 2)
                rr.append(max(0.004, (base_r * (1 - t) ** 1.05 + tip_r) * bulge))
            ob = tube('t%d_%d' % (ri, i), pp, rr, seg=10)
            shade_smooth(ob, 1.0); ob.data.materials.append(tm); objs.append(ob)

    # 基部の窪みに小さな付着物（フジツボ風の粒）
    for i in range(9):
        a = 2 * math.pi * i / 9 + 0.4
        rr = 0.52 + rng.normal(0, 0.05)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045 + rng.normal(0, 0.01))
        for v in bm.verts: v.co.z *= 0.7
        me = bpy.data.meshes.new('enc%d' % i); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('enc%d' % i, me); bpy.context.collection.objects.link(ob)
        ob.location = (math.cos(a) * rr, math.sin(a) * rr, 0.30 + rng.normal(0, 0.03))
        shade_smooth(ob, 0.7); ob.data.materials.append(mat_soot()); objs.append(ob)
    return objs

# ------------------------------------------------------------------ lights + cam
def setup_world():
    w = bpy.data.worlds.new('W'); bpy.context.scene.world = w
    w.use_nodes = True
    bg = node_of(w.node_tree, 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.035, 0.03, 0.03, 1)
    bg.inputs['Strength'].default_value = 0.22

def add_area(name, loc, rot, size, energy, color):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot
    bpy.context.collection.objects.link(o); return o

def setup_lights():
    add_area('key', (-2.0, -2.6, 3.4), (math.radians(46), 0, math.radians(-36)), 3.0, 240, (1.0, 0.95, 0.87))
    add_area('fill', (2.8, -1.4, 1.2), (math.radians(74), 0, math.radians(60)), 4.5, 110, (0.70, 0.80, 1.0))
    add_area('rim', (0.4, 2.8, 2.6), (math.radians(124), 0, 0), 2.8, 210, (1.0, 0.86, 0.70))
    add_area('top', (0.0, 0.0, 4.0), (0, 0, 0), 4.0, 60, (0.95, 0.97, 1.0))
    add_area('vent', (0.0, -0.6, -0.8), (math.radians(-20), 0, 0), 2.4, 90, (1.0, 0.55, 0.22))  # 噴気の下光

def setup_cam():
    c = bpy.data.cameras.new('cam'); c.type = 'ORTHO'; c.ortho_scale = 2.6
    o = bpy.data.objects.new('cam', c); o.location = (0, -6, 1.6)
    o.rotation_euler = (math.radians(80), 0, 0)   # わずかに見下ろす 3/4 で王冠と口盤を読ませる
    bpy.context.collection.objects.link(o); bpy.context.scene.camera = o

def setup_render():
    sc = bpy.context.scene
    try: sc.render.engine = 'BLENDER_EEVEE_NEXT'
    except Exception: sc.render.engine = 'BLENDER_EEVEE'
    sc.render.film_transparent = True
    sc.render.resolution_x = RES; sc.render.resolution_y = RES
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    try: sc.eevee.taa_render_samples = SAMPLES
    except Exception: pass
    try: sc.eevee.use_raytracing = True
    except Exception: pass
    try: sc.eevee.use_shadows = True
    except Exception: pass

POSE_STATE = {
    'closed':  dict(length=0.15, spread=-0.02, curl=0.06,  base_r=0.064, tip_r=0.030, sway=0.03),
    'warn':    dict(length=0.13, spread=-0.05, curl=0.03,  base_r=0.060, tip_r=0.028, sway=0.02, white=True),
    'open':    dict(length=0.60, spread=0.52,  curl=0.80,  base_r=0.072, tip_r=0.026, sway=0.06),
    'retract': dict(length=0.26, spread=0.14,  curl=0.22,  base_r=0.066, tip_r=0.030, sway=0.04),
    'dead':    dict(length=0.20, spread=0.30,  curl=-1.15, base_r=0.060, tip_r=0.028, sway=0.05, dead=True),
}

def main():
    clear_scene(); setup_world(); setup_lights(); setup_cam(); setup_render()
    os.makedirs(OUT, exist_ok=True)
    for pi, pose in enumerate(POSES):
        st = POSE_STATE.get(pose, POSE_STATE['open'])
        rng = np.random.default_rng(11)   # ポーズ間で同一シルエット（乱数固定）
        objs = build(st, rng)
        bpy.context.view_layer.update()
        path = os.path.join(OUT, 'anemone-cinder-%s.png' % pose)
        bpy.context.scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        print('WROTE', path)
        for o in objs:
            bpy.data.objects.remove(o, do_unlink=True)

main()
