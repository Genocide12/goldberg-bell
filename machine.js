/* ============================================================
   machine.js v2 — физическая модель машины Голдберга (cannon-es, 3D).
   Единый источник для headless-прогона (Node) и страницы (браузер).
   Трасса из настоящих досок: накатные полы (шар катится по поверхности),
   боковые стенки-направляющие, стойки. Реальные плотности и трения.
   Система координат: y=0 — верх базовой доски; столешница y=-0.02;
   пол комнаты y=-0.78. Машина идёт вдоль +x, z — поперёк.
   ============================================================ */

export const P = {
  dens: { pine: 600, walnut: 700, steel: 7850, glass: 2500, brass: 8500 },
  fr:   { woodWood: 0.45, steelWood: 0.32, glassWood: 0.22, steelGlass: 0.30,
          woodBrass: 0.30, steelBrass: 0.35, glassBrass: 0.40 },
  rest: { woodWood: 0.22, steelWood: 0.20, glassWood: 0.35, steelGlass: 0.50,
          woodBrass: 0.55, steelBrass: 0.50, glassBrass: 0.45 },
  dt: 1 / 120,

  // горка: пол-доска 20°, от (0.08, 0.26) до (0.52, 0.10) — стык вровень с дорожкой
  rampA: 20 * Math.PI / 180,
  rampX0: 0.08, rampX1: 0.52, rampY0: 0.26, rampY1: 0.104,   // стык вровень+4мм
  rampW: 0.09, rampT: 0.012,          // ширина доски 90, толщина 12
  wallH: 0.025, wallT: 0.010,         // боковые стенки 25 высотой

  // дорожка (полка): x 0.52..1.52, верх y=0.10
  runX0: 0.52, runX1: 1.52, runTop: 0.10, runH: 0.08, runW: 0.20,

  ballR: 0.016, glassR: 0.010,        // сталь Ø32 (135 г); боёк Ø20 — тоже сталь (33 г)
  ballX0: 0.13,                        // старт стального шара на горке

  // домино 44×88×10; шаг 40 = 0.45h — установившийся режим реальных волн
  domStep: 0.035, domX0: 0.94, domN: 6,   // 6 шт: меньше потерь, боёк в 26 мм от dom5
  domSize: [0.010, 0.088, 0.044],

  // стекло в 26 мм от лица dom7 (лицо на 1.190); гнездо позади, край на 1.30
  glassX: 1.144,   // 24 мм от ребра dom5: контакт на 45° (d=10(1+sin45)/cos45)
  stopLen: 0.030, stopH: 0.012, stopT: 0.015, stopGap: 0.0235,  // приют-стопы по бокам

  // (жёлоб упразднён)

  // молот-маятник: ось (2.03, 0.40), рука 400, голова 30×30×70 на конце
  pivot: [1.19, 0.54], armLen: 0.42, shaftR: 0.003,  // рука 6×420: лёгкий маятник
  headSize: [0.016, 0.016, 0.050], shaftR: 0.003,  // 8.5 г: вдвое меньший момент — размах 30°

  // колокол: латунный Ø58×75, 800 г, стоит на столешнице
  bellX: 1.34, bellY: 0.135, bellMass: 0.80,   // юбка на дуге взмаха (пик 16.7° — прямо в юбку)

  // стол и комната
  desk: { x0: -0.25, x1: 2.35, z: 0.30, top: -0.02, thick: 0.04 },
  floorY: -0.78,
};

export function buildMachine(CANNON) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 60;        // бенчмарк: 60 оптимально, 140 гасит волну

  const M = {};
  for (const n of ["wood", "steel", "glass", "brass", "dom"]) M[n] = new CANNON.Material(n);
  const cm = (a, b, fr, rest) =>
    world.addContactMaterial(new CANNON.ContactMaterial(a, b, { friction: fr, restitution: rest }));
  cm(M.wood, M.wood, P.fr.woodWood, P.rest.woodWood);
  cm(M.steel, M.wood, P.fr.steelWood, P.rest.steelWood);
  cm(M.glass, M.wood, P.fr.glassWood, P.rest.glassWood);
  cm(M.steel, M.glass, P.fr.steelGlass, P.rest.steelGlass);
  cm(M.wood, M.brass, P.fr.woodBrass, P.rest.woodBrass);
  cm(M.steel, M.brass, P.fr.steelBrass, P.rest.steelBrass);
  cm(M.glass, M.brass, P.fr.glassBrass, P.rest.glassBrass);
  cm(M.dom, M.dom, 0.10, 0.35);       // грани: твёрдый клак, энергия идёт дальше
  cm(M.dom, M.wood, 0.80, 0.10);      // подошва цепкая: чистое опрокидывание
  cm(M.dom, M.steel, 0.25, 0.30);
  cm(M.dom, M.glass, 0.15, 0.35);   // полированная грань скользит по стеклу
  cm(M.dom, M.brass, 0.30, 0.25);

  const V = (x, y, z) => new CANNON.Vec3(x, y, z);
  const spec = [], byName = {}, dynamics = [], events = [];
  let t = 0;
  const matOf = { pine: M.wood, walnut: M.wood, steel: M.steel, glass: M.glass,
                  brass: M.brass, dom: M.dom };

  function staticBox(name, size, pos, mat, quat, tag) {
    const body = new CANNON.Body({ mass: 0, material: matOf[mat] });
    body.addShape(new CANNON.Box(V(size[0] / 2, size[1] / 2, size[2] / 2)));
    body.position.set(...pos);
    if (quat) body.quaternion.copy(quat);
    world.addBody(body);
    byName[name] = body;
    spec.push({ name, mat, dynamic: false, shape: "box", size, pos,
      quat: quat ? [quat.x, quat.y, quat.z, quat.w] : [0, 0, 0, 1], tag });
    return body;
  }

  /* Накатная доска: пол вдоль линии p0→p1 + боковые стенки + торец.
     Возвращает {lineY(x)}. */
  function board(name, p0, p1, w, thick, mat, opts = {}) {
    const dir = V(p1[0] - p0[0], p1[1] - p0[1], 0);
    const len = dir.length(); dir.normalize();
    let normal = V(dir.y, -dir.x, 0);           // перпендикуляр к линии
    if (normal.y < 0) normal = normal.scale(-1); // всегда «вверх» от линии
    const mid = V((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0);
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(V(0, 0, 1), Math.atan2(dir.y, dir.x));   // лок. x вдоль линии
    const wh = opts.wallH || P.wallH, wt = opts.wallT || P.wallT;
    // 1) пол: верхняя поверхность = линия; центр ниже линии на полтолщины
    const fp = V(mid.x - normal.x * thick / 2, mid.y - normal.y * thick / 2, 0);
    staticBox(name + "Floor", [len, thick, w], [fp.x, fp.y, 0], mat, q, "floor");
    // 2) стенки: низ лежит на поверхности пола (линия), идут вверх
    const wallPos = V(mid.x + normal.x * (wh / 2 - thick / 2),
                       mid.y + normal.y * (wh / 2 - thick / 2), 0);
    for (const s of [1, -1])
      staticBox(name + "Wall" + (s > 0 ? "R" : "L"),
        [len, wh, wt], [wallPos.x, wallPos.y, s * (w / 2 + wt / 2)], mat, q, "wall");
    if (opts.endCap) {   // заглушка у p0: на линии, вошла на полтолщины
      const ep = V(p0[0] + dir.x * (wt / 2), p0[1] + dir.y * (wt / 2), 0);
      const capPos = V(ep.x + normal.x * (wh / 2 - thick / 2),
                       ep.y + normal.y * (wh / 2 - thick / 2), 0);
      staticBox(name + "Cap", [wt, wh, w], [capPos.x, capPos.y, 0], mat, q, "cap");
    }
    return { lineY: x => p0[1] + (x - p0[0]) * (p1[1] - p0[1]) / (p1[0] - p0[0]) };
  }

  function post(name, x, z, topY, baseY, mat, sx = 0.04, sz = 0.04) {
    const h = topY - baseY;
    if (h <= 0.005) return;
    staticBox(name, [sx, h, sz], [x, baseY + h / 2, z], mat, null, "post");
  }

  /* ================= СТАТИКА ================= */
  const d = P.desk;
  staticBox("floor", [6, 0.1, 6], [0, P.floorY - 0.05, 0], "walnut", null, "floor");
  spec.push({ name: "walls", mat: "walls", dynamic: false, shape: "room", pos: [0, 0, 0] });
  staticBox("desk", [d.x1 - d.x0, d.thick, 2 * d.z], [(d.x0 + d.x1) / 2, d.top - d.thick / 2, 0], "walnut", null, "desk");
  for (const [lx, lz] of [[d.x0 + 0.05, -d.z + 0.05], [d.x1 - 0.05, -d.z + 0.05],
                          [d.x0 + 0.05, d.z - 0.05], [d.x1 - 0.05, d.z - 0.05]])
    post("deskleg" + lx.toFixed(2) + lz.toFixed(2), lx, lz, d.top - d.thick, P.floorY, "walnut", 0.06, 0.06);
  staticBox("base", [2.10, 0.02, 0.42], [1.00, -0.03, 0], "walnut", null, "base");

  // горка: пол 20° от (0.08, 0.26) до (0.52, 0.10) + стенки + торец + стойки
  const ramp = board("ramp", [P.rampX0, P.rampY0], [P.rampX1, P.rampY1],
    P.rampW, P.rampT, "pine", { endCap: true });
  for (const [nx, lx] of [["1", 0.16], ["2", 0.30]])
    post("rampleg" + nx, lx, 0, ramp.lineY(lx) - P.rampT, -0.02, "pine", 0.05, 0.16);

  // дорожка: полка 0.52..1.52 (верх 0.10) + направляющие с боков
  staticBox("runway", [P.runX1 - P.runX0, P.runH, P.runW],
    [(P.runX0 + P.runX1) / 2, P.runTop - P.runH / 2, 0], "pine", null, "runway");
  for (const s of [1, -1])
    staticBox("guide" + (s > 0 ? "R" : "L"), [P.runX1 - P.runX0, 0.045, 0.010],
      [(P.runX0 + P.runX1) / 2, P.runTop + 0.0225, s * 0.105], "pine", null, "guide");
  post("runfoot1", 0.68, 0, P.runTop - P.runH, -0.02, "pine", 0.06, 0.18);
  post("runfoot2", 1.18, 0, P.runTop - P.runH, -0.02, "pine", 0.06, 0.18);

  // (приют-V упразднён)

  // (жёлоб упразднён)

  // молот: стойки + перекладина (ось на (2.03, 0.40))
  post("gpostL", P.pivot[0], -0.11, P.pivot[1] + 0.055, d.top, "pine", 0.05, 0.05);
  post("gpostR", P.pivot[0], 0.11, P.pivot[1] + 0.055, d.top, "pine", 0.05, 0.05);
  staticBox("gbar", [0.05, 0.05, 0.27], [P.pivot[0], P.pivot[1] + 0.055, 0], "pine", null, "gbar");

  /* ================= ДИНАМИКА ================= */
  function addDyn(name, mass, mat, shapes, pos, kind, extra = {}) {
    const { spec: specX, ...phys } = extra;
    const body = new CANNON.Body({ mass, material: matOf[mat], ...phys });
    for (const s of shapes) body.addShape(s.shape, s.off || V(0, 0, 0));
    body.position.set(...pos);
    world.addBody(body);
    byName[name] = body;
    dynamics.push({ name, body, home: [...pos], kind });
    spec.push({ name, mat, dynamic: true, kind, pos, ...(specX || {}) });
    return body;
  }

  // стальной шар Ø32 (135 г) — на горке, над линией пола
  const ballY = ramp.lineY(P.ballX0) + P.ballR + P.rampT / 2;
  addDyn("ball", 4 / 3 * Math.PI * P.ballR ** 3 * P.dens.steel, "steel",
    [{ shape: new CANNON.Sphere(P.ballR) }], [P.ballX0, ballY, 0], "sphere",
    { angularDamping: 0.10, linearDamping: 0.01,
      spec: { size: [2 * P.ballR, 2 * P.ballR, 2 * P.ballR] } });

  // (боёк упразднён в v3)
  for (let i = 0; i < P.domN; i++)
    addDyn("dom" + i, P.domSize[0] * P.domSize[1] * P.domSize[2] * P.dens.pine, "dom",
      [{ shape: new CANNON.Box(V(P.domSize[0] / 2, P.domSize[1] / 2, P.domSize[2] / 2)) }],
      [P.domX0 + i * P.domStep, P.runTop + P.domSize[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005,
        spec: { size: [...P.domSize] } });

  // молот: рука 10×400×10 + голова 30×30×70 (сосна ~53 г)
  addDyn("mallet",
    (0.01 * 0.42 * 0.01 + 0.02 * 0.02 * 0.06) * P.dens.pine, "pine",   // рука+голова, честно
    [{ shape: new CANNON.Box(V(P.shaftR, P.armLen / 2, P.shaftR)), off: V(0, -P.armLen / 2, 0) },
     { shape: new CANNON.Box(V(P.headSize[0] / 2, P.headSize[1] / 2, P.headSize[2] / 2)),
       off: V(0, -P.armLen, 0) }],
    [P.pivot[0], P.pivot[1], 0], "mallet",
    { angularDamping: 0.02, linearDamping: 0.005,
      spec: { armLen: P.armLen, head: [...P.headSize] } });
  const anchor = new CANNON.Body({ mass: 0 });
  anchor.position.set(P.pivot[0], P.pivot[1], 0);
  world.addBody(anchor); byName.malletAnchor = anchor;
  world.addConstraint(new CANNON.HingeConstraint(anchor, byName.mallet, {
    pivotA: V(0, 0, 0), axisA: V(0, 0, 1), pivotB: V(0, 0, 0), axisB: V(0, 0, 1) }));

  // подставка колокола 160 мм (латунный профиль на деревянной стойке)
  staticBox("bellpost", [0.024, 0.16, 0.024], [P.bellX, -0.02 + 0.08, 0], "walnut", null, "bellpost");
  // колокол: латунный Ø58×75, 800 г, три бокса по профилю; юбка на y=0.14
  addDyn("bell", P.bellMass, "brass",
    [{ shape: new CANNON.Box(V(0.029, 0.015, 0.029)), off: V(0, 0.015, 0) },
     { shape: new CANNON.Box(V(0.025, 0.0125, 0.025)), off: V(0, 0.0425, 0) },
     { shape: new CANNON.Box(V(0.020, 0.010, 0.020)), off: V(0, 0.065, 0) }],
    [P.bellX, P.bellY, 0], "bell",
    { angularDamping: 0.50, linearDamping: 0.10,
      spec: { bell: [0.058, 0.075] } });

  /* ================= события ================= */
  const listen = ["ball", "mallet", "bell", ...Array.from({ length: P.domN }, (_, i) => "dom" + i)];
  const lastEv = {};
  for (const n of listen) byName[n].addEventListener("collide", e => {
    const other = e.body === byName[n] ? e.target : e.body;
    let oname = null;
    for (const k in byName) if (byName[k] === other) { oname = k; break; }
    if (!oname || oname === "malletAnchor") return;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    const key = [n, oname].sort().join("×");
    if (t - (lastEv[key] || -1) < 0.06) return;
    lastEv[key] = t;
    events.push({ t: +t.toFixed(3), a: n, b: oname, v: +v.toFixed(2) });
  });

  /* ================= управление ================= */
  function step(n = 1) { for (let i = 0; i < n; i++) { world.step(P.dt); t += P.dt; } }
  function reset() {
    for (const d of dynamics) {
      d.body.position.set(...d.home);
      d.body.quaternion.set(0, 0, 0, 1);
      d.body.velocity.setZero(); d.body.angularVelocity.setZero();
      d.body.wakeUp();
    }
    events.length = 0; t = 0;
    for (const k in lastEv) delete lastEv[k];
  }
  function probe() {
    const tilt = b => {
      const u = b.quaternion.vmult(V(0, 1, 0));
      return Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI;
    };
    const domAng = Array.from({ length: P.domN }, (_, i) => +tilt(byName["dom" + i]).toFixed(0));
    const malletHits = events.filter(e => (e.a === "bell" || e.b === "bell") &&
      (e.a === "mallet" || e.b === "mallet"));
    return {
      t: +t.toFixed(2),
      ball: { p: byName.ball.position.toArray().map(v => +v.toFixed(3)),
              v: +byName.ball.velocity.length().toFixed(2) },
      domAng, domFallen: domAng.filter(a => a > 50).length,
      malletDeg: +(Math.atan2(byName.mallet.quaternion.vmult(V(0, -1, 0)).x,
        -byName.mallet.quaternion.vmult(V(0, -1, 0)).y) * 180 / Math.PI).toFixed(1),
      bellTilt: +tilt(byName.bell).toFixed(1),
      bellHits: malletHits.length, firstBellT: malletHits.length ? malletHits[0].t : 0,
      allRest: dynamics.every(d => d.body.velocity.length() < 0.05 && d.body.angularVelocity.length() < 0.5),
      sane: dynamics.every(d => Number.isFinite(d.body.position.x) && d.body.position.y > -1.2
        && d.body.position.x > -1 && d.body.position.x < 5),
    };
  }
  return { world, P, spec, byName, dynamics, events, step, reset, probe, dt: P.dt,
    get t() { return t; } };
}
