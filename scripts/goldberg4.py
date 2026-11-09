# ============================================================
# Машина Голдберга v4 — Blender 4.5 headless, Bullet Physics.
# 1. Шар1 скатывается с горки-1 (30°, верх 1.55)
# 2. Катится по скользкому столу-A, влетает в 8 домино на липком столе-B
# 3. Последнее домино сбрасывает шар2 с края стола
# 4. Шар2 падает на горку-2, скатывается в жёлоб
# 5. Слетает с обреза жёлоба БАЛЛИСТИЧЕСКИ и бьёт свободно висящий
#    молоток-маятник
# 6. Молоток бьёт в юбку колокола; колокол качается на шарнире и
#    звонит в два боковых страйкера (бонг..динь..динь)
# Фазы: --phase=bake | save
# ============================================================
import bpy, sys, math, time, json
from mathutils import Matrix, Vector

PHASE = "bake"
for a in sys.argv:
    if a.startswith("--phase="):
        PHASE = a.split("=", 1)[1]
WORK = "/home/z/my-project/work"
OUT = f"{WORK}/goldberg_log.json"
FPS = 24
FMAX = 240

def add_box(name, loc, size, rot=(0,0,0), parts=None):
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.transform(Matrix.Diagonal((size[0]/2, size[1]/2, size[2]/2, 1.0)))
    if parts:
        meshes = [obj]
        for i, (c, psz) in enumerate(parts):
            bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
            p = bpy.context.active_object
            p.name = f"{name}_p{i}"
            tr = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((psz[0]/2, psz[1]/2, psz[2]/2, 1.0))
            p.data.transform(tr)
            meshes.append(p)
        bpy.ops.object.select_all(action='DESELECT')
        for m in meshes:
            m.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.join()
    obj.rotation_euler = rot
    return obj

def add_sphere(name, loc, r, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg//2)
    o = bpy.context.active_object
    o.name = name
    return o

def sel(objs, act):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = act

def rb_add(obj, type_='ACTIVE', shape='BOX', mass=1.0, friction=0.5,
           bounce=0.0, damping=0.04):
    sel([obj], obj)
    bpy.ops.rigidbody.objects_add(type=type_)
    rb = obj.rigid_body
    rb.collision_shape = shape
    rb.mass = mass
    rb.friction = friction
    rb.restitution = bounce
    rb.linear_damping = damping
    rb.angular_damping = damping
    rb.use_margin = True
    rb.collision_margin = 0.004
    if type_ == 'ACTIVE':
        rb.use_deactivation = True
        rb.deactivate_linear_velocity = 0.08
        rb.deactivate_angular_velocity = 0.08
    return rb

def make_hinge(host, o1, o2):
    sel([host], host)
    bpy.ops.rigidbody.constraint_add(type='HINGE')
    c = host.rigid_body_constraint
    c.object1 = o1; c.object2 = o2
    c.disable_collisions = True
    return c

# ---------------- scene ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.frame_start, scn.frame_end = 1, FMAX
scn.render.fps = FPS
scn.unit_settings.system = 'METRIC'
bpy.ops.rigidbody.world_add()
rw = scn.rigidbody_world
rw.substeps_per_frame = 10
rw.solver_iterations = 60
rw.point_cache.frame_start = 1
rw.point_cache.frame_end = FMAX

BIG_R, SMALL_R = 0.10, 0.05
floor = add_box("Floor", (3.2, 0, -0.15), (14.0, 6.0, 0.3))
rb_add(floor, 'PASSIVE', friction=0.9)

# --- ЗВЕНО 1: горка-1 30°, верх (0.30, 1.55) -> выход (1.34, 0.95) ---
A1 = math.radians(30)
r1_len = 1.20
r1_top = Vector((0.30, 0, 1.55))
r1_c = r1_top + Vector((math.cos(A1), 0, -math.sin(A1))) * (r1_len/2)
add_box("Ramp1", r1_c, (r1_len, 0.32, 0.04), rot=(0, A1, 0))
rb_add(bpy.data.objects["Ramp1"], 'PASSIVE', friction=0.30)
for sy in (-0.15, 0.15):
    add_box(f"Rail1_{sy}", (r1_c.x, sy, r1_c.z + 0.05), (r1_len, 0.02, 0.10), rot=(0, A1, 0))
    rb_add(bpy.data.objects[f"Rail1_{sy}"], 'PASSIVE', friction=0.2)
add_box("Post1", (0.34, 0, 0.75), (0.32, 0.32, 1.50))
rb_add(bpy.data.objects["Post1"], 'PASSIVE')

bx = 0.44
bz = 1.55 - (bx - 0.30) * math.tan(A1) + BIG_R * math.cos(A1) + 0.006
ball1 = add_sphere("Ball1", (bx, 0, bz), BIG_R)
rb1 = rb_add(ball1, 'ACTIVE', shape='SPHERE', mass=1.0, friction=0.05, bounce=0.05)
rb1.kinematic = True
ball1.keyframe_insert(data_path="location", frame=1)
rb1.keyframe_insert(data_path="kinematic", frame=5)
rb1.kinematic = False
rb1.keyframe_insert(data_path="kinematic", frame=6)

# --- ЗВЕНО 2: два стола: скользкий A + липкий B (верх обоих 0.85) ---
add_box("TableA", (1.65, 0, 0.425), (0.70, 0.55, 0.85))       # x 1.30..2.00
rb_add(bpy.data.objects["TableA"], 'PASSIVE', friction=0.10)
add_box("TableB", (2.305, 0, 0.425), (0.65, 0.55, 0.85))      # x 1.98..2.63
rb_add(bpy.data.objects["TableB"], 'PASSIVE', friction=0.90)
for sy in (-0.14, 0.14):
    add_box(f"TableRail_{sy}", (1.65, sy, 0.875), (0.70, 0.02, 0.05))  # y=+-0.10 wide
    rb_add(bpy.data.objects[f"TableRail_{sy}"], 'PASSIVE', friction=0.15)
DOM_H, DOM_W, DOM_STEP = 0.20, 0.05, 0.065
dom_first_x = 2.00
N_DOM = 8
for i in range(N_DOM):
    x = dom_first_x + i * DOM_STEP   # 2.00 .. 2.455
    d = add_box(f"Dom{i}", (x, 0, 0.85 + DOM_H/2), (DOM_W, 0.11, DOM_H))
    rb_add(d, 'ACTIVE', mass=0.15, friction=1.00, bounce=0.0, damping=0.02)

# --- ЗВЕНО 3: шар2 на столе-B у самого края (2.575; край 2.63) ---
ball2 = add_sphere("Ball2", (2.575, 0, 0.85 + SMALL_R), SMALL_R, seg=32)
rb_add(ball2, 'ACTIVE', shape='SPHERE', mass=0.50, friction=0.05, bounce=0.05)

# --- ЗВЕНО 4: горка-2 (20°) + жёлоб (верх 0.28, обрез 3.62) ---
A2 = math.radians(20)
r2_top, r2_len = Vector((2.72, 0, 0.68)), 0.62
r2_c = r2_top + Vector((math.cos(A2), 0, -math.sin(A2))) * (r2_len/2)
add_box("Ramp2", r2_c, (r2_len, 0.16, 0.04), rot=(0, A2, 0))
rb_add(bpy.data.objects["Ramp2"], 'PASSIVE', friction=0.15)
for sy in (-0.075, 0.075):
    add_box(f"Rail2_{sy}", (r2_c.x, sy, r2_c.z + 0.045), (r2_len, 0.02, 0.08), rot=(0, A2, 0))
    rb_add(bpy.data.objects[f"Rail2_{sy}"], 'PASSIVE', friction=0.12)
add_box("Post2", (3.01, 0, 0.275), (0.06, 0.20, 0.55))
rb_add(bpy.data.objects["Post2"], 'PASSIVE')
add_box("Chute", (3.46, 0, 0.38), (0.32, 0.20, 0.04))          # x 3.30..3.62
rb_add(bpy.data.objects["Chute"], 'PASSIVE', friction=0.02)
for sy in (-0.09, 0.09):
    add_box(f"ChuteRail_{sy}", (3.46, sy, 0.43), (0.32, 0.02, 0.07))
    rb_add(bpy.data.objects[f"ChuteRail_{sy}"], 'PASSIVE', friction=0.02)
add_box("Post3", (3.40, 0, 0.185), (0.05, 0.20, 0.37))
rb_add(bpy.data.objects["Post3"], 'PASSIVE')
# яма-уловитель шара1 на полу (стенки 0.15): x 3.02..3.50
add_box("PitL", (3.02, 0, 0.075), (0.04, 1.40, 0.15))
rb_add(bpy.data.objects["PitL"], 'PASSIVE', friction=0.6)
add_box("PitR", (3.50, 0, 0.075), (0.04, 1.40, 0.15))
rb_add(bpy.data.objects["PitR"], 'PASSIVE', friction=0.6)

# --- ЗВЕНО 5: свободно висящий молоток: пивот (4.10, 1.00), L=0.80 ---
PEND_PIV = Vector((4.10, 0, 1.00))
PEND_L = 0.80
pend = add_box("Hammer", PEND_PIV + Vector((0, 0, -PEND_L)), (0.20, 0.14, 0.18),
               parts=[((0, 0, PEND_L/2), (0.04, 0.04, PEND_L))])
rbp = rb_add(pend, 'ACTIVE', shape='CONVEX_HULL', mass=0.30, friction=0.5, bounce=0.25)
rbp.angular_damping = 0.01
rbp.use_deactivation = False
pend_anchor = add_box("HammerAnchor", PEND_PIV, (0.10, 0.10, 0.10), rot=(math.radians(90), 0, 0))
rb_add(pend_anchor, 'PASSIVE')
make_hinge(pend_anchor, pend_anchor, pend)
# портал: стойки по бокам + перекладина (пивот на 1.00)
for sy in (-0.20, 0.20):
    add_box(f"GantryPost_{sy}", (4.10, sy, 0.50), (0.06, 0.06, 1.00))
    rb_add(bpy.data.objects[f"GantryPost_{sy}"], 'PASSIVE')
add_box("GantryBeam", (4.10, 0, 1.03), (0.08, 0.52, 0.06))
rb_add(bpy.data.objects["GantryBeam"], 'PASSIVE')

# --- ЗВЕНО 6: колокол + страйкеры на общей балке ---
BELL_X, BELL_HINGE_Z = 4.52, 1.09
BELL_H, WALL = 0.55, 0.028
PROF = [(0.00, 0.235), (0.06, 0.240), (0.18, 0.225), (0.45, 0.185),
        (0.72, 0.155), (0.90, 0.115), (1.00, 0.055)]

def make_bell(name, hinge_loc):
    import bmesh
    me = bpy.data.meshes.new(name + "Mesh")
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    SEG = 48
    rings = []
    for frac, r in PROF:
        z = -0.95 + frac * BELL_H
        ring = [(math.sin(t*2*math.pi/SEG)*r, math.cos(t*2*math.pi/SEG)*r, z)
                for t in range(SEG)]
        rings.append(ring)
    for i in range(len(rings)-1):
        for t in range(SEG):
            t2 = (t+1) % SEG
            v1 = bm.verts.new(rings[i][t]); v2 = bm.verts.new(rings[i][t2])
            v3 = bm.verts.new(rings[i+1][t2]); v4 = bm.verts.new(rings[i+1][t])
            bm.faces.new((v1, v2, v3, v4))
    cap_r = PROF[-1][1]
    cv = [bm.verts.new((math.sin(t*2*math.pi/SEG)*cap_r, math.cos(t*2*math.pi/SEG)*cap_r, -0.95 + BELL_H))
          for t in range(SEG)]
    ccenter = bm.verts.new((0, 0, -0.95 + BELL_H))
    for t in range(SEG):
        bm.faces.new((cv[t], cv[(t+1)%SEG], ccenter))
    r_out0, r_in0, z0 = PROF[0][1], max(PROF[0][1] - WALL, 0.12), -0.95
    for t in range(SEG):
        a = t*2*math.pi/SEG; a2 = (t+1)*2*math.pi/SEG
        vo1 = bm.verts.new((math.sin(a)*r_out0, math.cos(a)*r_out0, z0))
        vo2 = bm.verts.new((math.sin(a2)*r_out0, math.cos(a2)*r_out0, z0))
        vi1 = bm.verts.new((math.sin(a)*r_in0, math.cos(a)*r_in0, z0))
        vi2 = bm.verts.new((math.sin(a2)*r_in0, math.cos(a2)*r_in0, z0))
        bm.faces.new((vo1, vo2, vi2, vi1))
    for i in range(len(PROF)-1, 0, -1):
        r_o1 = max(PROF[i][1] - WALL, 0.03); r_o2 = max(PROF[i-1][1] - WALL, 0.03)
        z1 = -0.95 + PROF[i][0]*BELL_H; z2 = -0.95 + PROF[i-1][0]*BELL_H
        for t in range(SEG):
            a = t*2*math.pi/SEG; a2 = (t+1)*2*math.pi/SEG
            v1 = bm.verts.new((math.sin(a)*r_o1, math.cos(a)*r_o1, z1))
            v2 = bm.verts.new((math.sin(a2)*r_o1, math.cos(a2)*r_o1, z1))
            v3 = bm.verts.new((math.sin(a2)*r_o2, math.cos(a2)*r_o2, z2))
            v4 = bm.verts.new((math.sin(a)*r_o2, math.cos(a)*r_o2, z2))
            bm.faces.new((v1, v2, v3, v4))
    bmesh.ops.create_cube(bm, size=1.0)
    stem_verts = [v for v in bm.verts][-8:]
    for v in stem_verts:
        v.co.x *= 0.03; v.co.y *= 0.03
        v.co.z = v.co.z * 0.40 - 0.40 if v.co.z > 0 else v.co.z * 0.40
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj.location = hinge_loc
    return obj

bell = make_bell("Bell", Vector((BELL_X, 0, BELL_HINGE_Z)))
rbb = rb_add(bell, 'ACTIVE', shape='CONVEX_HULL', mass=0.90, friction=0.4, bounce=0.30)
rbb.angular_damping = 0.012
rbb.use_deactivation = False
bell_anchor = add_box("BellAnchor", Vector((BELL_X, 0, BELL_HINGE_Z)),
                      (0.09, 0.09, 0.09), rot=(math.radians(90), 0, 0))
rb_add(bell_anchor, 'PASSIVE')
make_hinge(bell_anchor, bell_anchor, bell)

add_box("Beam", (4.75, 0, 1.14), (1.30, 0.10, 0.07))   # x 4.10..5.40
rb_add(bpy.data.objects["Beam"], 'PASSIVE')
add_box("PostBeam", (5.30, 0, 0.57), (0.10, 0.22, 1.14))
rb_add(bpy.data.objects["PostBeam"], 'PASSIVE')

# страйкеры: головки на z=0.55 (выше дуги молотка), зазор до стенки 0.06
STRIKE_Z = 0.55
STRIKE_GAP = 0.06
def make_striker(tag, x):
    piv = Vector((x, 0, BELL_HINGE_Z))
    L = BELL_HINGE_Z - STRIKE_Z
    s = add_box(f"Striker{tag}", Vector((x, 0, STRIKE_Z)), (0.07, 0.07, 0.07),
                parts=[((0, 0, L/2), (0.018, 0.018, L))])
    rb = rb_add(s, 'ACTIVE', shape='CONVEX_HULL', mass=0.05, friction=0.3, bounce=0.35)
    rb.angular_damping = 0.008
    rb.use_deactivation = False
    an = add_box(f"StrikerAnchor{tag}", piv, (0.07, 0.07, 0.07), rot=(math.radians(90), 0, 0))
    rb_add(an, 'PASSIVE')
    make_hinge(an, an, s)
    return s

bell_r_at_055 = 0.146   # r профиля на z=0.55
strikerL = make_striker("L", BELL_X - bell_r_at_055 - STRIKE_GAP - 0.035)
strikerR = make_striker("R", BELL_X + bell_r_at_055 + STRIKE_GAP + 0.035)

# ---------------- bake ----------------
bpy.context.view_layer.update()
t0 = time.time()
bpy.ops.ptcache.bake_all(bake=True)
print(f"BAKE_DONE {time.time()-t0:.1f}s")

# ---------------- telemetry ----------------
TRACK = (["Ball1", "Ball2", "Hammer", "Bell", "StrikerL", "StrikerR"] +
         [f"Dom{i}" for i in range(N_DOM)])
objs = {n: bpy.data.objects[n] for n in TRACK}
log, prev = [], {}
for f in range(1, FMAX + 1):
    scn.frame_set(f)
    row = {"f": f}
    for n in TRACK:
        o = objs[n]
        t = o.matrix_world.translation
        e = o.matrix_world.to_euler()
        v = ((t - prev[n]) * FPS).length if n in prev else 0.0
        prev[n] = t.copy()
        row[n] = [round(t.x, 4), round(t.y, 4), round(t.z, 4),
                  round(math.degrees(e.y), 2), round(v, 3)]
    log.append(row)
json.dump({"frames": log}, open(OUT, "w"))
print("telemetry frames:", len(log))

# ---------------- events ----------------
def first(pred, lo=1, hi=FMAX):
    for r in log[lo-1:hi]:
        if pred(r):
            return r["f"]
    return None

ev = {}
ev["ball1_moves"] = first(lambda r: r["Ball1"][4] > 0.05, 6)
ev["ball1_at_dominoes"] = first(lambda r: r["Ball1"][0] > 1.95, 10)
ev["dom0_fall"] = first(lambda r: abs(r["Dom0"][3]) > 40, 20)
ev["dom7_fall"] = first(lambda r: abs(r["Dom7"][3]) > 40, 20)
ev["ball2_off_table"] = first(lambda r: r["Ball2"][2] < 0.80, 30)
ev["ball2_ramp2"] = first(lambda r: 2.7 < r["Ball2"][0] < 3.3 and 0.3 < r["Ball2"][2] < 0.62, 30)
ev["ball2_flight"] = first(lambda r: r["Ball2"][0] > 3.63, 30)
ev["hammer_swing"] = first(lambda r: abs(r["Hammer"][3]) > 5, 30)
ev["bell_swing"] = first(lambda r: abs(r["Bell"][3]) > 2, 30)
ev["strikerL_hit"] = first(lambda r: r["StrikerL"][4] > 0.10, 30)
ev["strikerR_hit"] = first(lambda r: r["StrikerR"][4] > 0.10, 30)
for k, v in ev.items():
    print(f"{k}: frame {v}")

last = log[-1]
print("final ball1:", last["Ball1"][:3], " ball2:", last["Ball2"][:3])
print("final bell angle:", last["Bell"][3], " strikers v:", last["StrikerL"][4], last["StrikerR"][4])
peak = max(abs(r["Bell"][3]) for r in log)
print(f"bell max |angle| = {peak:.1f} deg; hammer max |angle| = {max(abs(r['Hammer'][3]) for r in log):.1f}")
if ev["bell_swing"]:
    fs = ev["bell_swing"]
    hits = sum(1 for i in range(fs, FMAX) if log[i]["StrikerL"][4] > 0.25 or log[i]["StrikerR"][4] > 0.25)
    print("striker hits after bell swing:", hits)

if PHASE == "save":
    bpy.ops.wm.save_as_mainfile(filepath=f"{WORK}/goldberg.blend")
    print("SAVED goldberg.blend")
print("GOLDBERG4_END")
