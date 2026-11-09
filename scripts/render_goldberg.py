# Рендер машины Голдберга: материалы, свет, камера. --phase=test|keyframes|anim|save
import bpy, sys, math, time
from mathutils import Vector

PHASE = "test"
for a in sys.argv:
    if a.startswith("--phase="):
        PHASE = a.split("=", 1)[1]
WORK = "/home/z/my-project/work"
FRAMES_OUT = f"{WORK}/frames"

scn = bpy.context.scene

# ---------- материалы ----------
def mat(name, color, metallic=0.0, rough=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    return m

m_brass = mat("Brass", (0.72, 0.52, 0.18), metallic=1.0, rough=0.25)
m_steel = mat("Steel", (0.75, 0.77, 0.78), metallic=1.0, rough=0.30)
m_wood  = mat("Wood",  (0.45, 0.26, 0.11), metallic=0.0, rough=0.70)
m_wood2 = mat("WoodLight", (0.62, 0.42, 0.20), metallic=0.0, rough=0.75)
m_stone = mat("Stone", (0.42, 0.42, 0.44), metallic=0.0, rough=0.90)
m_dark  = mat("DarkWood", (0.20, 0.11, 0.05), metallic=0.0, rough=0.80)
m_red   = mat("Paint", (0.75, 0.12, 0.10), metallic=0.0, rough=0.40)

for n in ("Bell", "Hammer", "StrikerL", "StrikerR"):
    o = bpy.data.objects.get(n)
    if o:
        o.data.materials.clear(); o.data.materials.append(m_brass if n == "Bell" else m_steel)
for n in ("Ball1",):
    o = bpy.data.objects.get(n)
    if o: o.data.materials.clear(); o.data.materials.append(m_steel)
o = bpy.data.objects.get("Ball2")
if o: o.data.materials.clear(); o.data.materials.append(mat("Glass", (0.85, 0.95, 0.9), metallic=0.1, rough=0.05))
for i in range(8):
    o = bpy.data.objects.get(f"Dom{i}")
    if o: o.data.materials.clear(); o.data.materials.append(m_wood if i % 2 == 0 else m_wood2)
for n in ("TableA", "TableB", "Chute", "Ramp1", "Ramp2", "Post1", "Post2", "Post3",
          "PostHammer", "GantryBeam", "Beam", "PostBeam", "Ledge"):
    o = bpy.data.objects.get(n)
    if o: o.data.materials.clear(); o.data.materials.append(m_dark)
for n in ("Floor",):
    o = bpy.data.objects.get(n)
    if o: o.data.materials.clear(); o.data.materials.append(m_stone)
for n in ("Rail1_-0.15", "Rail1_0.15", "TableRail_-0.14", "TableRail_0.14",
          "Rail2_-0.075", "Rail2_0.075", "ChuteRail_-0.09", "ChuteRail_0.09",
          "GantryPost_-0.20", "GantryPost_0.20", "PitL", "PitR"):
    o = bpy.data.objects.get(n)
    if o: o.data.materials.clear(); o.data.materials.append(m_red)
for n in ("HammerAnchor", "BellAnchor", "StrikerAnchorL", "StrikerAnchorR"):
    o = bpy.data.objects.get(n)
    if o: o.data.materials.clear(); o.data.materials.append(m_red)

# ---------- мир ----------
w = bpy.data.worlds.new("World")
scn.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]
bg.inputs[0].default_value = (0.035, 0.045, 0.06, 1.0)
bg.inputs[1].default_value = 1.0

# ---------- свет ----------
def add_light(name, typ, loc, rot, energy, size=0.5):
    ld = bpy.data.lights.new(name, typ)
    ld.energy = energy
    if hasattr(ld, "size"): ld.size = size
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    lo.rotation_euler = rot
    bpy.context.collection.objects.link(lo)
    return lo

add_light("Key", 'AREA', (2.6, -3.4, 4.2), (math.radians(55), 0, math.radians(18)),
          1400, 4.0)
add_light("Fill", 'AREA', (4.2, 3.6, 3.0), (math.radians(60), 0, math.radians(-140)),
          500, 3.0)
add_light("Rim", 'AREA', (6.5, -1.5, 2.6), (math.radians(75), 0, math.radians(-105)),
          700, 2.5)

# ---------- камера: общий план трассы ----------
cd = bpy.data.cameras.new("Cam")
cd.lens = 42
cd.sensor_width = 32
cam = bpy.data.objects.new("Cam", cd)
cam.location = (3.2, -3.55, 2.1)
# смотрим в центр машины (3.0, 0, 0.75)
d = Vector((3.0, 0, 0.75)) - cam.location
cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
bpy.context.collection.objects.link(cam)
scn.camera = cam

# ---------- рендер настройки ----------
scn.render.engine = 'CYCLES'
scn.cycles.device = 'CPU'
scn.cycles.samples = 48
scn.cycles.use_denoising = True
scn.cycles.denoiser = 'OPENIMAGEDENOISE'
scn.render.resolution_x = 1280
scn.render.resolution_y = 720
scn.render.fps = 24
scn.render.image_settings.file_format = 'PNG'
scn.render.film_transparent = False
# производительность: 2 потока
scn.render.threads_mode = 'FIXED'
scn.render.threads = 2

if PHASE == "test":
    scn.frame_set(70)   # момент удара молотка
    t0 = time.time()
    scn.render.filepath = f"{WORK}/test_frame.png"
    bpy.ops.render.render(write_still=True)
    print(f"RENDER_TEST {time.time()-t0:.1f}s per frame")
elif PHASE == "keyframes":
    import os
    os.makedirs(f"{WORK}/keys", exist_ok=True)
    # быстрое качество для серии
    scn.cycles.samples = 40
    scn.render.resolution_x = 1152
    scn.render.resolution_y = 648
    KF = [(8, "start"), (34, "dominoes"), (50, "flight"), (63, "hammer"),
          (72, "strike"), (100, "ring")]
    t0 = time.time()
    for f, tag in KF:
        scn.frame_set(f)
        scn.render.filepath = f"{WORK}/keys/{tag}.png"
        bpy.ops.render.render(write_still=True)
        print(f"KEY {tag} (f{f}) done {time.time()-t0:.0f}s", flush=True)
    print("KEYFRAMES_DONE")
elif PHASE == "anim":
    import os
    os.makedirs(FRAMES_OUT, exist_ok=True)
    F1, F2 = 1, 132
    t0 = time.time()
    for f in range(F1, F2 + 1):
        scn.frame_set(f)
        scn.render.filepath = f"{FRAMES_OUT}/f{f:04d}.png"
        bpy.ops.render.render(write_still=True)
        if f % 10 == 0:
            print(f"frame {f} done, {time.time()-t0:.0f}s elapsed", flush=True)
    print(f"ANIM_DONE {F2-F1+1} frames in {time.time()-t0:.0f}s")
elif PHASE == "save":
    bpy.ops.wm.save_as_mainfile(filepath=f"{WORK}/goldberg_render.blend")
    print("SAVED render blend")
print("RENDER_SCRIPT_END")
