"""ABYSS DIVE — 巨蟹 前脚 上腕(merus) v2 仮絵を Blender 4.5 / Cycles で作り直す。

要件（親指示）:
  - 殻板 3〜4 枚のはっきりした重なり段差、深い溝の暗部、
    背側の小棘とフジツボの起伏をメッシュで彫り、直円柱を避ける。
  - 関節位置・尺度は維持（肩=論理0,0 / 膝=論理300 / 5px/論理px / キャンバス1614x287）。
  - 暗い黒玄武岩〜暗褐色・錆茶の硬質甲殻、深い影。発光なし・輪郭線なし。

公開中の敵アート（v3.8.0）と同じ基準で焼く。読み取り専用の元 bake_geo_crab_leg.py を
元に、merus のみを本スクリプトで作り直す（元ツリーは変更しない）。
使い方:
  "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" -b --factory-startup \
      -P bake_merus_v2.py -- <出力ディレクトリ>
"""
import bpy, json, math, os, random, sys
from mathutils import Vector

TAU = math.tau
S = 5.0
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '.'
L1 = 300.0
random.seed(20261125)

# --- 元仮絵(parts.json)と同じ固定フレーミング＝関節位置・尺度を厳密に維持 ---
FIX_X0 = -9.720504522323608
FIX_X1 = FIX_X0 + 322.8            # (x1-x0)*5 = 1614
FIX_Y0 = -20.742409706115723
FIX_Y1 = 36.468                    # pivot_y = FIX_Y1*5 = 182.34 （元と同じ）
W_PX = int(math.ceil((FIX_X1 - FIX_X0) * S))     # 1614
H_PX = int(math.ceil((FIX_Y1 - FIX_Y0) * S))     # 287


def lerp(a, b, t): return a + (b - a) * t
def hump(t, c, w, a): return a * math.exp(-((t - c) / w) ** 2)


def ring(cx, yc, ytop, ybot, hd, n=22):
    """非円形の断面（上=丸く高い / 下=平ら）。"""
    pts = []
    for i in range(n):
        th = TAU * i / n
        s, c = math.sin(th), math.cos(th)
        y = yc + 0.5 * (ytop + ybot) + 0.5 * (ytop - ybot) * s
        pts.append((cx, y, hd * c))
    return pts


def loft(name, stations, n=22):
    verts, faces, rings = [], [], []
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
    me.from_pydata(verts, [], faces); me.validate(); me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    return ob


def shell_finish(ob, subsurf=2, disp=0.85, bevel=0.24):
    sub = ob.modifiers.new('sub', 'SUBSURF'); sub.levels = subsurf; sub.render_levels = subsurf
    d = ob.modifiers.new('disp', 'DISPLACE')
    d.texture = bpy.data.textures['chit_surface']; d.texture_coords = 'LOCAL'
    d.strength = disp; d.mid_level = 0.5
    b = ob.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 2
    b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40)
    for p in ob.data.polygons: p.use_smooth = True


def collar(prof, x_center, half, bulge, name):
    st = []
    for i in range(9):
        u = i / 8
        x = x_center - half + 2 * half * u
        _, ytop, ybot, hd, yc = prof(x)
        f = 1.0 + bulge * math.exp(-((u - 0.5) / 0.26) ** 2)
        st.append((x, ytop * f, ybot * f, hd * f, yc))
    return loft(name, st)


def chip(ob, frac_x, amount, seed):
    rnd = random.Random(seed); me = ob.data
    xs = [v.co.x for v in me.vertices]; x0, x1 = min(xs), max(xs)
    target = x0 + (x1 - x0) * frac_x
    for v in me.vertices:
        if abs(v.co.x - target) < (x1 - x0) * 0.06 and v.co.y > 0:
            if rnd.random() < 0.30:
                v.co.y -= amount * (0.5 + rnd.random()); v.co.z *= 0.7


def surface_point(prof, x, y):
    x, ytop, ybot, hd, yc = prof(x)
    r = max(0.5, (ytop - ybot) * 0.5)
    dy = (y - (yc + (ytop + ybot) * 0.5)) / r
    dy = max(-0.96, min(0.96, dy))
    z = hd * math.sqrt(max(0.0, 1.0 - dy * dy))
    return y, z


def assign(ob, mat_name):
    mat = bpy.data.materials[mat_name]
    if not ob.data.materials: ob.data.materials.append(mat)
    else: ob.data.materials[0] = mat


def epibionts(prof, x_lo, x_hi, y_lo, y_hi, count, seed, r_min, r_max, sink=0.42):
    """フジツボ。面に載せ、少し埋める。"""
    rnd = random.Random(seed); made = []
    for i in range(count):
        x = rnd.uniform(x_lo, x_hi); y = rnd.uniform(y_lo, y_hi); r = rnd.uniform(r_min, r_max)
        _, z = surface_point(prof, x, y)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r, radius2=r * 0.36,
                                        depth=r * 1.4, location=(x, y, z - r * sink))
        ob = bpy.context.object; ob.name = f'epi_{seed}_{i}'; assign(ob, 'epibiont'); made.append(ob)
    return made


def spines(prof, xs, seed, r_min, r_max, d_min, d_max):
    """背側の小棘。上面から +y へ張り出す（外形は維持範囲内）。"""
    rnd = random.Random(seed); made = []
    for x in xs:
        _, ytop, ybot, hd, yc = prof(x)
        top = yc + ytop                      # 断面の最上部 y
        r = rnd.uniform(r_min, r_max); dd = rnd.uniform(d_min, d_max)
        bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r, radius2=r * 0.12,
                                        depth=dd, location=(x, top + dd * 0.5 - 1.0, 0.0))
        ob = bpy.context.object
        ob.rotation_euler = (math.radians(-90), 0, rnd.uniform(-0.30, 0.30))
        ob.name = f'spine_{int(x)}'; assign(ob, 'chitin'); made.append(ob)
    return made


# ---------------------------------------------------------------- materials
def mat_chitin():
    """暗い黒玄武岩〜暗褐色・錆茶の硬質甲殻。深い影。発光なし・輪郭線なし。"""
    m = bpy.data.materials.new('chitin'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.024, 0.019, 0.016, 1)   # 暗黒〜暗褐
    bsdf.inputs['Roughness'].default_value = 0.74                        # 硬質・マット
    bsdf.inputs['Metallic'].default_value = 0.0
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.18
    noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3.0
    noise.inputs['Detail'].default_value = 8.0; noise.inputs['Roughness'].default_value = 0.62
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.30; ramp.color_ramp.elements[0].color = (0.010, 0.008, 0.006, 1)
    ramp.color_ramp.elements[1].position = 0.72; ramp.color_ramp.elements[1].color = (0.062, 0.034, 0.018, 1)
    mix1 = nt.nodes.new('ShaderNodeMixRGB'); mix1.blend_type = 'MIX'; mix1.inputs['Fac'].default_value = 0.62
    # 錆茶の斑（低周波を別スケールで）
    rust = nt.nodes.new('ShaderNodeTexNoise'); rust.inputs['Scale'].default_value = 9.0
    rr = nt.nodes.new('ShaderNodeValToRGB')
    rr.color_ramp.elements[0].position = 0.44; rr.color_ramp.elements[0].color = (0, 0, 0, 1)
    rr.color_ramp.elements[1].position = 0.70; rr.color_ramp.elements[1].color = (0.9, 0.42, 0.20, 1)
    rustm = nt.nodes.new('ShaderNodeMixRGB'); rustm.blend_type = 'MIX'; rustm.inputs['Fac'].default_value = 0.18
    rustm.inputs['Color2'].default_value = (0.100, 0.045, 0.020, 1)
    # 摩耗（凸部をわずかに明るく）
    geo = nt.nodes.new('ShaderNodeNewGeometry'); pr = nt.nodes.new('ShaderNodeValToRGB')
    pr.color_ramp.elements[0].position = 0.50; pr.color_ramp.elements[0].color = (0, 0, 0, 1)
    pr.color_ramp.elements[1].position = 0.72; pr.color_ramp.elements[1].color = (0.5, 0.5, 0.5, 1)
    mix2 = nt.nodes.new('ShaderNodeMixRGB'); mix2.blend_type = 'SCREEN'; mix2.inputs['Fac'].default_value = 0.05
    # 孔（ボロノイ）＋ざらつき
    vor = nt.nodes.new('ShaderNodeTexVoronoi'); vor.feature = 'F1'; vor.inputs['Scale'].default_value = 24.0
    vr = nt.nodes.new('ShaderNodeValToRGB')
    vr.color_ramp.elements[0].position = 0.00; vr.color_ramp.elements[0].color = (0, 0, 0, 1)
    vr.color_ramp.elements[1].position = 0.32; vr.color_ramp.elements[1].color = (1, 1, 1, 1)
    b1 = nt.nodes.new('ShaderNodeBump'); b1.inputs['Strength'].default_value = 0.95; b1.inputs['Distance'].default_value = 0.9
    b2 = nt.nodes.new('ShaderNodeBump'); b2.inputs['Strength'].default_value = 0.5; b2.inputs['Distance'].default_value = 2.4
    mix3 = nt.nodes.new('ShaderNodeMixRGB'); mix3.blend_type = 'MULTIPLY'; mix3.inputs['Fac'].default_value = 0.36
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 18.0
    mix4 = nt.nodes.new('ShaderNodeMixRGB'); mix4.blend_type = 'MULTIPLY'; mix4.inputs['Fac'].default_value = 0.85  # 深い影
    rgh = nt.nodes.new('ShaderNodeMixRGB'); rgh.blend_type = 'MIX'
    rgh.inputs['Color1'].default_value = (0.66, 0.66, 0.66, 1); rgh.inputs['Color2'].default_value = (0.95, 0.95, 0.95, 1)
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mix1.inputs['Color1'])
    nt.links.new(mix1.outputs['Color'], rustm.inputs['Color1'])
    nt.links.new(rust.outputs['Fac'], rr.inputs['Fac'])
    nt.links.new(rr.outputs['Color'], rustm.inputs['Fac'])
    nt.links.new(rustm.outputs['Color'], mix2.inputs['Color1'])
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
    """関節の濡れ膜（唯一の局所的な暗い艶）。全面の濡れ艶は出さない。"""
    m = bpy.data.materials.new('membrane'); m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (0.020, 0.014, 0.010, 1)
    bsdf.inputs['Roughness'].default_value = 0.44
    if 'Specular IOR Level' in bsdf.inputs: bsdf.inputs['Specular IOR Level'].default_value = 0.40
    return m


def mat_epibiont():
    """フジツボ。面色寄りの暗灰褐（淡い水色・薄ピンクは使わない）。"""
    m = bpy.data.materials.new('epibiont'); m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (0.070, 0.058, 0.046, 1)
    bsdf.inputs['Roughness'].default_value = 0.72
    vor = m.node_tree.nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 38.0
    b = m.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.7; b.inputs['Distance'].default_value = 0.32
    m.node_tree.links.new(vor.outputs['Distance'], b.inputs['Height'])
    m.node_tree.links.new(b.outputs['Normal'], bsdf.inputs['Normal'])
    return m


# ---------------------------------------------------------------- merus v2
def prof_merus(x):
    """元のエンベロープを維持しつつ、S字の反りと肋を入れて直円柱を避ける。"""
    t = max(0.0, min(1.0, x / L1))
    pinch = 0.66 + 0.34 * min(1.0, (1 - t) / 0.20)
    ytop = (lerp(21.0, 14.0, t) + hump(t, 0.34, 0.28, 2.0)) * pinch
    ybot = -lerp(12.5, 9.0, t) * pinch
    yc = math.sin(t * 3.1) * 3.0 + 0.9 * math.sin(t * 6.4 + 1.0)          # 有機的な反り
    hd = 0.52 * (ytop - ybot) * 0.5 * (1.0 + 0.10 * math.sin(t * 7.0))    # 肋
    return x, ytop, ybot, hd, yc


def build_merus():
    objs = []
    N = 30
    base = [prof_merus(L1 * i / N) for i in range(N + 1)]

    def B(tt): return base[min(N, int(round(tt * N)))]

    # 殻板4枚。手前板ほど外へ張り出し、各板の先端に「高い段差の縁＋直後の深い溝（下刳り）」を
    # メッシュで彫る＝はっきりした重なり段差。縁の前後に測点を密に置き、Subsurf 後も段差を残す。
    plates = [(0.00, 0.30, 0.80), (0.24, 0.55, 1.01), (0.49, 0.79, 1.20), (0.73, 1.00, 1.38)]
    for k, (a, b, ws) in enumerate(plates):
        M = 22
        xs = [a + (b - a) * i / M for i in range(M + 1)]
        xs += [a + d for d in (-0.012, -0.005, 0.003, 0.008, 0.016, 0.026, 0.040, 0.056)]
        xs = sorted(set(round(v, 5) for v in xs if a - 0.02 <= v <= b + 0.005))
        sub = []
        for tt in xs:
            x, ytop, ybot, hd, yc = B(tt)
            g = 1.0
            g += 0.10 * math.sin(math.pi * max(0.0, min(1.0, (tt - a) / max(1e-6, b - a))))  # 面の膨らみ（円筒回避）
            if k > 0:
                g += 0.42 * math.exp(-((tt - a) / 0.016) ** 2)            # 段差の縁（高く立ち上げる）
                g -= 0.44 * math.exp(-((tt - (a + 0.052)) / 0.024) ** 2)  # 直後の深い溝（下刳り＝暗部）
            sub.append((x, ytop * ws * g, ybot * ws * g, hd * ws * g, yc))
        o = loft(f'merus_plate{k}', sub)
        shell_finish(o, subsurf=1, disp=0.75, bevel=0.18)
        chip(o, 0.55, 2.6, 11 + k); assign(o, 'chitin'); objs.append(o)
    for i, xc in enumerate((L1 * 0.24, L1 * 0.49, L1 * 0.73)):   # 板先端の張り出し縁（落ち影を作る）
        c = collar(prof_merus, xc, 3.2, 0.34, f'merus_collar{i}')
        shell_finish(c, subsurf=1, disp=0.4, bevel=0.14); assign(c, 'chitin'); objs.append(c)
    # 背側の小棘
    objs += spines(prof_merus, [24, 52, 80, 110, 142, 176, 210, 242, 272, 292], 7, 1.2, 2.4, 3.0, 5.0)
    # フジツボ・付着物（面に載せる）
    objs += epibionts(prof_merus, 16, L1 - 30, -3.0, 16.0, 24, 21, 1.0, 2.8, sink=0.42)
    objs += epibionts(prof_merus, 36, L1 - 60, -12.0, -4.0, 10, 22, 0.8, 1.7, sink=0.40)
    # 膝側の濡れ膜（唯一の局所艶）
    mem = loft('merus_membrane', [
        (L1 - 26, 1.2, -1.2, 0.9, 0.0), (L1 - 18, 8.5, -7.8, 5.4, 0.0),
        (L1 - 6, 10.0, -9.2, 6.0, 0.0), (L1 + 2, 5.5, -5.0, 3.2, 0.0),
    ])
    assign(mem, 'membrane'); objs.append(mem)
    return objs


# ---------------------------------------------------------------- render
def aim(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def setup_scene():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 128
    sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.render.resolution_percentage = 100
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cam_data); bpy.context.collection.objects.link(cam)
    cam.location = (0, 0, 400); cam.rotation_euler = (0, 0, 0); sc.camera = cam
    # --- 固定フレーミング（関節位置・尺度を維持）---
    cam.data.ortho_scale = (FIX_X1 - FIX_X0)
    cam.data.shift_x = ((FIX_X0 + FIX_X1) / 2) / (FIX_X1 - FIX_X0)
    cam.data.shift_y = ((FIX_Y0 + FIX_Y1) / 2) / (FIX_X1 - FIX_X0)
    sc.render.resolution_x = W_PX; sc.render.resolution_y = H_PX
    tex = bpy.data.textures.new('chit_surface', 'CLOUDS'); tex.noise_scale = 5.0; tex.noise_depth = 3
    key = bpy.data.lights.new('key', 'SUN'); key.energy = 1.15; key.angle = math.radians(7.0)
    key.color = (1.0, 0.96, 0.90)
    ko = bpy.data.objects.new('key', key); bpy.context.collection.objects.link(ko)
    ko.location = (-320, 300, 380); aim(ko, (L1 * 0.5, 0, 0))
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 0.22; fill.angle = math.radians(48.0)
    fill.color = (0.45, 0.55, 0.72)
    fo = bpy.data.objects.new('fill', fill); bpy.context.collection.objects.link(fo)
    fo.location = (260, -240, 200); aim(fo, (L1 * 0.5, 0, 0))
    world = bpy.data.worlds.new('w'); world.use_nodes = True
    bg = world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.012, 0.014, 0.018, 1)
    bg.inputs[1].default_value = 1.0; sc.world = world


def render_fixed(objs, name):
    path = os.path.join(OUT, f'_{name}.png')
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    try:
        img = bpy.data.images.load(path); px = img.pixels[:]; n = len(px) // 4
        step = max(1, n // 60000); s = cnt = mx = 0.0
        for i in range(0, n, step):
            if px[i * 4 + 3] > 0.5:
                v = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3.0; s += v; cnt += 1; mx = max(mx, v)
        bpy.data.images.remove(img)
        print(f'STATS {name}: n={cnt} mean={(s / cnt if cnt else 0):.3f} max={mx:.3f}')
    except Exception as ex:
        print('STATS failed', ex)
    return {
        'w': W_PX, 'h': H_PX, 'scale': S, 'x0': FIX_X0, 'y0': FIX_Y0,
        'pivot': [round((0.0 - FIX_X0) * S, 2), round((FIX_Y1 - 0.0) * S, 2)],
        'len': L1,
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat_chitin(); mat_membrane(); mat_epibiont(); setup_scene()
    meta = render_fixed(build_merus(), 'merus_v2')
    with open(os.path.join(OUT, 'merus_v2.json'), 'w', encoding='utf-8') as f:
        json.dump({'merus': meta}, f, ensure_ascii=False, indent=2)
    print('MERUS_V2_OK', json.dumps(meta))


main()
