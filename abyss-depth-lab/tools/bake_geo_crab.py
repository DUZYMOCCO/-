"""ABYSS DIVE — 地層背負いの巨蟹（仮）: 殻（黒玄武岩の地層塊）をオフライン Blender 焼きする。

外部素材・ライセンス非依存（Blender 標準の手続きのみ・オフライン生成）。
  * 生物の脚は焼き込まない（前脚はゲーム内で関節として描く＝拡大した静止画にしない）。
  * ここでは「形（塊状/柱状玄武岩の起伏）＋素の陰影（マットな暗色）」だけを焼く。
    割れ目の堆積・空洞・湿った下帯・付着生物・法線は tools/bake_geo_crab_post.py が
    高さパスから作る（Blender のシェーダ依存を減らし破綻を避ける）。

使い方:
    "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" -b --factory-startup \
        -P tools/bake_geo_crab.py
        python tools/bake_geo_crab_post.py
"""
import bpy
import math
import os
from mathutils import Vector
from mathutils import noise as mnoise

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.abspath(os.path.join(HERE, '..', 'assets'))
RENDER_W, RENDER_H = 2360, 940
SAMPLES = 96


def top_v(u):
    """露頭の輪郭（天面の v。0=セル上端,1=接地）。左右非対称・割れた塊・張り出し。"""
    t = 0.90
    for (cu, amt, w) in [(0.07, 0.30, 0.13), (0.26, 0.44, 0.16), (0.47, 0.50, 0.17),
                         (0.70, 0.40, 0.14), (0.91, 0.30, 0.13)]:
        t -= amt * math.exp(-((u - cu) / w) ** 2)
    t -= (mnoise.fractal(Vector((u * 9.0, 2.0, 0.0)), 1.0, 2.0, 3) * 0.5 + 0.5 - 0.5) * 0.11
    t -= (mnoise.fractal(Vector((u * 21.0, 6.0, 3.0)), 1.0, 2.0, 2) * 0.5 + 0.5 - 0.5) * 0.06
    t += 0.10 * min(1.0, max(0.0, (0.16 - u) / 0.16))
    t -= 0.06 * math.exp(-((u - 0.60) / 0.05) ** 2)
    return min(0.92, max(0.06, t))


def _cell(u, vv, scale, seed, tilt):
    """ボロノイ最近セルの「面」。セルごとに一定の高さオフセットと傾き（＝平面）を与え、
    境界で急に落とす。これで角のある平面が立ち、法線が面ごとに変わる（＝玄武岩の面）。"""
    d, pts = mnoise.voronoi(Vector((u * scale + seed, vv * scale * 0.72, seed)), distance_metric='DISTANCE')
    q = pts[0]
    cx = (q.x - seed) / scale
    cy = q.y / (scale * 0.72)
    base = mnoise.fractal(Vector((q.x * 17.3, q.y * 11.1, seed * 3.7)), 1.0, 2.0, 2) * 0.5 + 0.5
    t1 = mnoise.fractal(Vector((q.x * 7.1 + 5.0, q.y * 9.7, seed * 2.1)), 1.0, 2.0, 2)
    t2 = mnoise.fractal(Vector((q.x * 5.3, q.y * 13.9 + 8.0, seed * 4.3)), 1.0, 2.0, 2)
    tx = (t1 * 2.0 - 1.0) * tilt
    tz = (t2 * 2.0 - 1.0) * tilt
    loc = tx * (u - cx) + tz * (vv - cy)
    edge = math.exp(-((d[1] - d[0]) * 5.0) ** 2)
    return base, loc, edge


def relief(u, vv):
    """表層の奥行き。傾いた平面のセル（塊・柱・欠け）＋細部。割れ目で急に落とす。"""
    big = mnoise.fractal(Vector((u * 2.6, vv * 1.7, 0.7)), 1.0, 2.0, 3) * 0.5 + 0.5
    b1, l1, e1 = _cell(u, vv, 3.0, 1.7, 2.05)     # 大きな岩塊
    b2, l2, e2 = _cell(u, vv, 7.0, 7.3, 1.05)     # 柱
    b3, l3, e3 = _cell(u, vv, 15.0, 19.1, 0.45)   # 細かな欠け
    micro = mnoise.fractal(Vector((u * 18.0, vv * 12.0, 4.1)), 1.0, 2.0, 3) * 0.5 + 0.5
    dome = math.sin(math.pi * min(1.0, max(0.0, u))) ** 0.5
    depth = 0.36 + 0.24 * dome + 0.18 * big
    depth += (b1 - 0.5) * 0.42 + l1
    depth += (b2 - 0.5) * 0.20 + l2
    depth += (b3 - 0.5) * 0.09 + l3
    depth -= e1 * 0.34 + e2 * 0.15 + e3 * 0.05
    depth += micro * 0.03
    return depth, max(e1, e2 * 0.8, e3 * 0.5)


def build_mesh():
    nx, nz = 340, 168
    W, H = 2.40, 0.94
    verts = []
    faces = []
    for ix in range(nx + 1):
        u = ix / nx
        vt = top_v(u)
        for iz in range(nz + 1):
            vv = iz / nz
            v = vt + (1.0 - vt) * vv
            dep, _ = relief(u, vv)
            verts.append(((u - 0.5) * W, -dep, (0.5 - v) * H))
    idx = lambda ix, iz: ix * (nz + 1) + iz
    for ix in range(nx):
        for iz in range(nz):
            faces.append((idx(ix, iz), idx(ix + 1, iz), idx(ix + 1, iz + 1), idx(ix, iz + 1)))
    me = bpy.data.meshes.new('geo_crab_shell')
    me.from_pydata(verts, [], faces)
    me.validate()
    ob = bpy.data.objects.new('geo_crab_shell', me)
    bpy.context.collection.objects.link(ob)
    return ob


def clear_scene():
    for c in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for x in list(c):
            c.remove(x)


def mk_clay_material():
    mat = bpy.data.materials.new('basalt_clay')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (0.045, 0.060, 0.082, 1)
    bsdf.inputs['Roughness'].default_value = 0.90
    bsdf.inputs['Specular IOR Level'].default_value = 0.12
    bsdf.inputs['Metallic'].default_value = 0.0
    return mat


def mk_height_material():
    mat = bpy.data.materials.new('height')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geo.outputs['Position'], sep.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1.85
    mr.inputs['From Max'].default_value = 0.05
    nt.links.new(sep.outputs['Y'], mr.inputs['Value'])
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(mr.outputs['Result'], comb.inputs['X'])
    nt.links.new(mr.outputs['Result'], comb.inputs['Y'])
    nt.links.new(mr.outputs['Result'], comb.inputs['Z'])
    nt.links.new(comb.outputs['Vector'], em.inputs['Color'])
    return mat


def setup_scene():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
    sc.render.resolution_x = RENDER_W
    sc.render.resolution_y = RENDER_H
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.file_format = 'PNG'
    try:
        sc.eevee.taa_render_samples = SAMPLES
    except Exception:
        pass
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'

    l1 = bpy.data.lights.new('key', 'AREA')
    l1.energy = 1400; l1.size = 3.6; l1.color = (0.90, 0.94, 1.0)
    o1 = bpy.data.objects.new('key', l1)
    o1.location = (-1.6, -2.1, 1.9)
    o1.rotation_euler = (math.radians(56), 0, math.radians(-38))
    bpy.context.collection.objects.link(o1)

    l2 = bpy.data.lights.new('fill', 'AREA')
    l2.energy = 90; l2.size = 6.0; l2.color = (0.34, 0.40, 0.46)
    o2 = bpy.data.objects.new('fill', l2)
    o2.location = (2.2, -1.5, 0.1)
    o2.rotation_euler = (math.radians(84), 0, math.radians(66))
    bpy.context.collection.objects.link(o2)

    world = bpy.data.worlds.new('w')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.018, 0.030, 0.044, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.7

    cam = bpy.data.cameras.new('cam')
    cam.type = 'ORTHO'; cam.ortho_scale = 2.40
    oc = bpy.data.objects.new('cam', cam)
    oc.location = (0, -3.0, -0.03)
    oc.rotation_euler = (math.radians(90), 0, 0)
    bpy.context.collection.objects.link(oc)
    sc.camera = oc


def render_to(path, mat, ob):
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    clear_scene()
    ob = build_mesh()
    setup_scene()
    sol = ob.modifiers.new('sol', 'SOLIDIFY')
    sol.thickness = 0.14
    sol.offset = 0.0
    bev = ob.modifiers.new('bev', 'BEVEL')
    bev.width = 0.005
    bev.segments = 1
    for p in ob.data.polygons:
        p.use_smooth = False          # 平らな面＝角のある岩
    os.makedirs(ASSETS, exist_ok=True)
    tmp = os.path.join(ASSETS, '_crab_tmp')
    os.makedirs(tmp, exist_ok=True)
    render_to(os.path.join(tmp, 'clay.png'), mk_clay_material(), ob)
    render_to(os.path.join(tmp, 'height.png'), mk_height_material(), ob)
    print('RENDER OK ->', tmp)


if __name__ == '__main__':
    main()
