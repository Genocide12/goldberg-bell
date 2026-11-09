#!/usr/bin/env python3
"""Аудит-правки машины Голдберга по сверке с эталоном c5e153d и VLM-осмотром:
1) УБРАТЬ мёртвые элементы: runway (погребён под домино-зоной на 1 см — шар на него
   никогда не попадает, зона выше), физ-кроссбар на 0.56 (в 2D был инертен, тут ничего
   не касается — оси подвесов на 0.80/1.02 ВЫШЕ него), нить молота (дублирует палку).
2) ПОЧИНИТЬ геометрию: chuteY от новой привязки жёлоба (стойки стояли для старой
   доски — жёлоб висел в воздухе), опоры до НИЗА досок (были зазоры 6-10 мм),
   жёлоб-меш 12→16 мм под коллайдер, пипсы домино на БОЛЬШИЕ грани (стояли на
   торцевых, потому и были невидимы).
3) ПЕРЕСТРОИТЬ портал: стойки+перекладина на 1.02 (несут ось колокола и крюк шнура),
   кронштейн молота с балки, латунная ось сквозь него, рукава страйкеров от задней
   стойки колокола — подвесы больше не висят в воздухе.
"""
import re, sys

p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()
n0 = len(s)
fixes = []

def rep(old, new, tag):
    global s
    assert old in s, f"НЕ НАЙДЕНО: {tag}\n---\n{old[:200]}"
    assert s.count(old) == 1, f"НЕ УНИКАЛЬНО: {tag}"
    s = s.replace(old, new)
    fixes.append(tag)

# --- 1. физика: убрать runway (мёртвый — погребён под зоной) ---
rep("""  stdBody({ name: "runway", kind: "runway", fixed: true, x: 0.985, y: 0.56, dep: 0.16,
    colliders: [{ hx: 0.055, hy: 0.01, density: 1, fr: 0.18, rest: 0.1 }] });      // разгон шара
""",
"""  // (полка-разгон убрана: её перекрыла домино-зона на 1 см выше — шар идёт с горки сразу на зону)
""", "runway body")

# --- 2. физика: убрать кроссбар (ничего не касается; оси подвесов выше него) ---
rep("""  stdBody({ name: "crossbar", kind: "crossbar", fixed: true, x: 3.16, y: 0.56, dep: 0.06,
    colliders: [{ hx: 0.45, hy: 0.02, density: 1, fr: 0.5, rest: 0.1 }] });
""",
"""  // (кроссбар-брус убран: в цепочке ничего не касался, подвесы крепятся выше)
""", "crossbar body")

# --- 3. chuteY: от новой привязки жёлоба (стойки стояли для старой доски!) ---
rep("const chuteY = x => 0.542 - (x - 1.55) * (CHUTE_DZ / CHUTE_DX); // верх жёлоба",
    "const chuteY = x => CHUTE_Y0 - (x - CHUTE_X0) * (CHUTE_DZ / CHUTE_DX); // верх жёлоба",
    "chuteY fix")

# --- 4. рендер досок: убрать runway/crossbar, жёлоб 16 мм ---
rep("""  board("ramp", RAMP_L, 0.016, MAT.wood);
  board("runway", 0.11, 0.02, MAT.wood);
""", """  board("ramp", RAMP_L, 0.016, MAT.wood);
""", "render runway")
rep("  board(\"chute\", CHUTE_DX, 0.012, MAT.wood);\n  board(\"crossbar\", 0.9, 0.04, MAT.woodD);\n",
"""  board("chute", CHUTE_DX, 0.016, MAT.wood);   // 16 мм — вровень с коллайдером
""", "render chute/crossbar")

# --- 5. опоры и портал: полная замена блока ---
rep("""  /* опоры: козлы под горкой, ножки столов, стойки жёлоба, портал */
  const leg = (x, h, d = 0.036, mat = MAT.woodD) => {
    const m = meshBox(d, h, d, mat);
    m.position.set(x, h / 2, 0);
    bgGroup.add(m);
  };
  for (const lx of [0.25, 0.57, 0.87]) leg(lx, rampY(lx) - 0.008);       // козлы горки
  leg(0.985, 0.55, 0.05); leg(1.50, 0.55, 0.05);                          // ножки стола
  for (const lx of [1.98, 2.42]) leg(lx, chuteY(lx) - 0.006, 0.03);       // стойки жёлоба
  leg(2.78, 0.54, 0.05); leg(3.55, 0.54, 0.05);                           // портал
  { const cap = meshBox(0.9, 0.045, 0.06, MAT.wood);                      // перекладина поверх
    cap.position.set(3.16, 0.565, 0); bgGroup.add(cap);
    for (const ax of [3.06, 3.25]) {   // кронштейны подвесов на перекладине
      const ring = new T.Mesh(new T.TorusGeometry(0.016, 0.005, 10, 24), MAT.brass);
      ring.position.set(ax, 0.59, 0); ring.castShadow = true;
      bgGroup.add(ring);
    } }
  const crossbarM = bgGroup.children.find(m => Math.abs(m.position.x - 3.16) < .01 && Math.abs(m.position.y - .56) < .02);
  if (crossbarM) crossbarM.visible = false;   // физический брус скрыт, видим декоративный
""",
"""  /* опоры: парами перед/зад, высотой точно до НИЗА досок (без зазоров) */
  const leg = (x, h, d = 0.036, mat = MAT.woodD, z = 0) => {
    const m = meshBox(d, h, d, mat);
    m.position.set(x, h / 2, z);
    bgGroup.add(m);
  };
  const rodBetween = (x1, y1, z1, x2, y2, z2, r, mat) => {
    const from = new T.Vector3(x1, y1, z1), to = new T.Vector3(x2, y2, z2);
    const dir = to.clone().sub(from), len = dir.length();
    const m = new T.Mesh(new T.CylinderGeometry(r, r, len, 12), mat);
    m.position.copy(from).addScaledVector(dir, .5);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true;
    bgGroup.add(m);
  };
  for (const lx of [0.25, 0.57, 0.87])               // козлы горки: до низа доски
    for (const z of [-0.075, 0.075]) leg(lx, rampY(lx) - 0.016, 0.036, MAT.woodD, z);
  for (const z of [-0.075, 0.075]) {                 // ножки стола домино-зоны
    leg(0.985, zone2Y(0.985) - 0.02, 0.05, MAT.woodD, z);
    leg(1.50, zone2Y(1.50) - 0.02, 0.05, MAT.woodD, z);
  }
  for (const lx of [1.98, 2.42])                     // стойки жёлоба: до низа доски
    for (const z of [-0.06, 0.06]) leg(lx, chuteY(lx) - 0.016, 0.03, MAT.woodD, z);

  /* портал ЗА плоскостью машины (z −6 см), как в 2D-схеме: стойки 2.98/3.52,
     перекладина на 1.02 несёт шнур колокола; молот — на латунной оси сквозь
     кронштейн, опущенный с балки; страйкеры — на шнурах с рукавов задней стойки */
  leg(2.98, 1.06, 0.06, MAT.woodD, -0.06);           // стойки портала
  leg(3.52, 1.06, 0.06, MAT.woodD, -0.06);
  leg(3.25, 1.02, 0.04, MAT.woodD, -0.055);          // задняя стойка колокола (до пола)
  { const beam = meshBox(0.72, 0.05, 0.07, MAT.wood);
    beam.position.set(3.25, 1.045, -0.06); bgGroup.add(beam); }   // перекладина
  { const drop = meshBox(0.05, 0.24, 0.012, MAT.woodD);
    drop.position.set(3.06, 0.90, -0.055); bgGroup.add(drop); }   // кронштейн молота
  rodBetween(3.25, 1.045, -0.025, 3.25, 1.02, 0, 0.004, MAT.brass);   // крюк шнура колокола
  rodBetween(3.25, 0.60, -0.04, 3.185, 0.60, 0, 0.004, MAT.brass);    // рукав страйкера L
  rodBetween(3.25, 0.60, -0.04, 3.315, 0.60, 0, 0.004, MAT.brass);    // рукав страйкера R
  { const ax = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 0.15, 14), MAT.brass);
    ax.rotation.x = Math.PI / 2; ax.position.set(3.06, 0.80, -0.01);   // ось молота
    bgGroup.add(ax); }
""", "portal+legs")

# --- 6. домино: риска + пипсы 2|1 на больших гранях (x±), вдоль X ---
rep("""    const pipGeo = new T.CylinderGeometry(0.0035, 0.0035, 0.0012, 12);
    for (const zc of [0.026, -0.026]) for (const py of [0.028, 0.006, -0.052]) {
      const p = new T.Mesh(pipGeo, MAT.pip);
      p.rotation.x = Math.PI / 2;
      p.position.set(0, py - 0.012, zc);
      p.castShadow = false;
      g.add(p);
    }
  }
""",
"""    const div = meshBox(0.011, 0.002, 0.05, MAT.pip);   // риска между половинами
    div.position.y = -0.012; div.castShadow = false;
    g.add(div);
    const pipGeo = new T.CylinderGeometry(0.004, 0.004, 0.0016, 14);
    for (const xc of [0.0056, -0.0056])               // обе большие грани (x ±)
      for (const [py, pz] of [[0.035, 0.011], [0.035, -0.011], [-0.06, 0]]) {
        const p = new T.Mesh(pipGeo, MAT.pip);
        p.rotation.z = Math.PI / 2;                   // ось цилиндра вдоль X
        p.position.set(xc, py - 0.012, pz);
        p.castShadow = false;
        g.add(p);
      }
  }
""", "domino pips")

# --- 7. молот: убрать нить-дубль и старую ось (подвес = палка до оси из кронштейна) ---
rep("""    g.userData.pick = byName.mallet;
    threadMesh(3.06, 0.80, byName.mallet, 0.003);
    const axis = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.09, 16), MAT.brassD);
    axis.rotation.x = Math.PI / 2; axis.position.set(3.06, 0.80, 0);
    bgGroup.add(axis);
  }
""",
"""    g.userData.pick = byName.mallet;
    // подвес молота: палка до оси + латунная ось из кронштейна портала
  }
""", "mallet thread/axis")

# --- 8. колокол: ось убрать (шнур с крюка на перекладине) ---
rep("""    threadMesh(3.25, 1.02, byName.bell, 0.002);
    const axis = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.10, 16), MAT.brassD);
    axis.rotation.x = Math.PI / 2; axis.position.set(3.25, 1.02, 0);
    bgGroup.add(axis);
""",
"""    threadMesh(3.25, 1.02, byName.bell, 0.002);   // шнур с крюка на перекладине
""", "bell axis")

# --- 9. страйкеры: шнур толще, ось-цилиндр убрать (рукава от стойки) ---
rep("""    threadMesh(info.home.x, info.home.y + 0.25, info.body, 0.0012);
    const axis = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.085, 14), MAT.brass);
    axis.rotation.x = Math.PI / 2;
    axis.position.set(info.home.x, info.home.y + 0.25, 0);
    bgGroup.add(axis);
""",
"""    threadMesh(info.home.x, info.home.y + 0.25, info.body, 0.002);  // шнур с рукава стойки
""", "striker axis")

# --- 10. звуковые пары: убрать runway ---
rep('  ["ball", "dom0", "knock"], ["ball", "runway", "knock"], ["ball", "ramp", "knock"],',
    '  ["ball", "dom0", "knock"], ["ball", "ramp", "knock"],', "sndPairs runway")

open(p, "w", encoding="utf-8").write(s)
print(f"OK: {len(fixes)} правок, файл {n0} -> {len(s)} байт")
for f in fixes: print("  ✓", f)
