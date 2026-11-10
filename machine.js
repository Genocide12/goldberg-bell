/* ============================================================
   machine.js v4 — длинная цепочка (~25 с) на cannon-es, 3D.
   Единый источник для headless-прогона (Node) и страницы (браузер).
   Продолжает v3 (зелёная): те же материалы, солвер 60, board().
   Система координат: y=0 — верх базовой доски; столешница y=-0.02;
   пол комнаты y=-0.78. Машина идёт вдоль +x, z — поперёк.
   Цепочка: горка → волна 14 → маятник① → тумба/жёлоб (пологий) →
   волна 20 → маятник②-боёк → колокол.
   ============================================================ */

export const P = {
  dens: { pine: 600, walnut: 700, steel: 7850, glass: 2500, brass: 8500 },
  fr:   { woodWood: 0.45, steelWood: 0.32, glassWood: 0.22, steelGlass: 0.30,
          woodBrass: 0.30, steelBrass: 0.35, glassBrass: 0.40 },
  rest: { woodWood: 0.22, steelWood: 0.20, glassWood: 0.35, steelGlass: 0.50,
          woodBrass: 0.55, steelBrass: 0.50, glassBrass: 0.45 },
  dt: 1 / 120,

  // стол и комната (машина длинная: до x≈5.9)
  desk: { x0: -0.25, x1: 6.20, z: 0.30, top: -0.02, thick: 0.04 },
  floorY: -0.78,

  // горка (v3, проверенная): пол 20° от (0.08,0.26) до (0.52,0.104)
  rampX0: 0.08, rampX1: 0.52, rampY0: 0.26, rampY1: 0.104,
  rampW: 0.09, rampT: 0.012,
  wallH: 0.025, wallT: 0.010,

  // дорожка-ярус A (высокий): 0.52..1.90, верх y=0.10
  runX0: 0.52, runX1: 1.90, runTop: 0.10, runH: 0.08, runW: 0.20,

  ballR: 0.016, ball2R: 0.008,        // шар① Ø32 (135 г); шарик② Ø16 стекло (4.3 г)
  ballX0: 0.13,

  // волна ①: 8 плашек на ярусе A (6с, 0.75с/шт)
  domStep: 0.035,
  dom1X0: 0.94, domN1: 8,
  domSize: [0.010, 0.088, 0.044],

  // молот①: v3-узел — дом7 (последний в волне①) бьёт по голове в зоне кромки
  piv1: [1.28, 0.555], armLen: 0.42,
  headSize: [0.020, 0.020, 0.060], shaftR: 0.003,  // как в зелёной v4: ~23 г

  // тумба①: шарик② ЦЕНТР в точке дуги 13° взмаха (пик скорости головы):
  // (1.28+0.42sin13, 0.555-0.42cos13) = (1.374, 0.145); вплотную перед головой
  tee1X: 1.396, tee1Top: 0.154,   // верх наклонной площадки

  // жёлоб-регулятор темпа: от тумбы до нижней полосы
  chuteX0: 1.415, chuteX1: 4.02, chuteY0: 0.140, chuteY1: 0.020, // 2.6 м; вход под срезом тумбы
  chuteW: 0.09, chuteT: 0.012,

  // нижняя полоса (накладка на столешнице)
  base2X0: 3.95, base2X1: 5.70, base2Top: -0.015, base2T: 0.005,

  // волна ②: 14 плашек на полосе (11с)
  dom2X0: 4.10, domN2: 26,  // длинная волна: дом25 на 4.965

  // маятник ②-боёк: ось (5.55, 0.45)
  piv2: [5.00, 0.425],  // вплотную к дом25 (грудь 4.97+0.03); голова Y=полоса+0.02

  // колокол: юбка на дуге 16° маятника②
  bellX: 5.095, bellY: 0.045, bellMass: 0.80, // юбка на дуге 12-13° молота②
};

export function buildMachine(CANNON) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 60;

  const M = {};
  for (const n of ["wood", "steel", "glass", "brass", "dom"]) M[n] = new CANNON.Material(n);
  // контакты домино — жёсткие и малоинерционные (stiff 1e8, relax 2):
  // при дефолтных relax 3 волна «висит клином» по 10+ секунд
  const cm = (a, b, fr, rest, eq) =>
    world.addContactMaterial(new CANNON.ContactMaterial(a, b,
      { friction: fr, restitution: rest, ...eq }));
  cm(M.wood, M.wood, P.fr.woodWood, P.rest.woodWood);
  cm(M.steel, M.wood, P.fr.steelWood, P.rest.steelWood);
  cm(M.glass, M.wood, P.fr.glassWood, P.rest.glassWood);
  cm(M.steel, M.glass, P.fr.steelGlass, P.rest.steelGlass);
  cm(M.wood, M.brass, P.fr.woodBrass, P.rest.woodBrass);
  cm(M.steel, M.brass, P.fr.steelBrass, P.rest.steelBrass);
  cm(M.glass, M.brass, P.fr.glassBrass, P.rest.glassBrass);
  const domEq = { contactEquationStiffness: 1e8, contactEquationRelaxation: 2 };
  cm(M.dom, M.dom, 0.10, 0.12, domEq);       // грани: щелчок без рикошета
  cm(M.dom, M.wood, 0.80, 0.10, domEq);      // подошва цепкая
  cm(M.dom, M.steel, 0.25, 0.30, domEq);
  cm(M.dom, M.glass, 0.25, 0.35, domEq);
  cm(M.dom, M.brass, 0.30, 0.25, domEq);

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

  /* Накатная доска: пол вдоль линии p0→p1 + боковые стенки. {lineY(x)} */
  function board(name, p0, p1, w, thick, mat, opts = {}) {
    const dir = V(p1[0] - p0[0], p1[1] - p0[1], 0);
    const len = dir.length(); dir.normalize();
    let normal = V(dir.y, -dir.x, 0);
    if (normal.y < 0) normal = normal.scale(-1);
    const mid = V((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, 0);
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(V(0, 0, 1), Math.atan2(dir.y, dir.x));
    const wh = opts.wallH || P.wallH, wt = opts.wallT || P.wallT;
    const fp = V(mid.x - normal.x * thick / 2, mid.y - normal.y * thick / 2, 0);
    staticBox(name + "Floor", [len, thick, w], [fp.x, fp.y, 0], mat, q, "floor");
    const wp = V(mid.x + normal.x * (wh / 2 - thick / 2),
                 mid.y + normal.y * (wh / 2 - thick / 2), 0);
    for (const s of [1, -1])
      staticBox(name + "Wall" + (s > 0 ? "R" : "L"),
        [len, wh, wt], [wp.x, wp.y, s * (w / 2 + wt / 2)], mat, q, "wall");
    return { lineY: x => p0[1] + (x - p0[0]) * (p1[1] - p0[1]) / (p1[0] - p0[0]) };
  }

  function post(name, x, z, topY, baseY, mat, sx = 0.04, sz = 0.04) {
    const h = topY - baseY;
    if (h <= 0.005) return;
    staticBox(name, [sx, h, sz], [x, baseY + h / 2, z], mat, null, "post");
  }

  /* ================= СТАТИКА ================= */
  const d = P.desk;
  staticBox("floor", [8, 0.1, 8], [2.5, P.floorY - 0.05, 0], "walnut", null, "floor");
  spec.push({ name: "walls", mat: "walls", dynamic: false, shape: "room", pos: [0, 0, 0] });
  staticBox("desk", [d.x1 - d.x0, d.thick, 2 * d.z], [(d.x0 + d.x1) / 2, d.top - d.thick / 2, 0], "walnut", null, "desk");
  for (const lx of [d.x0 + 0.05, 1.3, 2.7, 4.1, 5.5, d.x1 - 0.05])
    for (const lz of [-d.z + 0.05, d.z - 0.05])
      post("deskleg" + lx.toFixed(2) + lz.toFixed(2), lx, lz, d.top - d.thick, P.floorY, "walnut", 0.06, 0.06);
  staticBox("base", [6.0, 0.02, 0.42], [2.95, -0.03, 0], "walnut", null, "base");

  // горка (v3): пол 20° + стенки + стойки
  const ramp = board("ramp", [P.rampX0, P.rampY0], [P.rampX1, P.rampY1],
    P.rampW, P.rampT, "pine", {});
  for (const [nx, lx] of [["1", 0.16], ["2", 0.30]])
    post("rampleg" + nx, lx, 0, ramp.lineY(lx) - P.rampT, -0.02, "pine", 0.05, 0.16);

  // ярус A: дорожка 0.52..1.90 (верх 0.10) + направляющие + ноги
  staticBox("runway", [P.runX1 - P.runX0, P.runH, P.runW],
    [(P.runX0 + P.runX1) / 2, P.runTop - P.runH / 2, 0], "pine", null, "runway");
  for (const s of [1, -1])
    staticBox("guide" + (s > 0 ? "R" : "L"), [0.40, 0.045, 0.010],
      [0.72, P.runTop + 0.0225, s * 0.105], "pine", null, "guide");
  post("runfoot1", 0.68, 0, P.runTop - P.runH, -0.02, "pine", 0.06, 0.18);
  post("runfoot2", 1.70, 0, P.runTop - P.runH, -0.02, "pine", 0.06, 0.18);

  // жёлоб-регулятор: 1.78..4.62, пологий спуск
  const chute = board("chute", [P.chuteX0, P.chuteY0], [P.chuteX1, P.chuteY1],
    P.chuteW, P.chuteT, "pine", { wallH: 0.030 });
  for (const [nx, lx] of [["a", 2.00], ["b", 3.00], ["c", 3.70]])  // три ноги: прогон 2.6 м
    post("chuteleg" + nx, lx, 0, chute.lineY(lx) - P.chuteT, -0.02, "pine", 0.04, 0.14);

  // маятник ①: стойки от яруса A, перекладина
  post("g1postL", P.piv1[0], -0.11, P.piv1[1] + 0.055, P.runTop, "pine", 0.05, 0.05);
  post("g1postR", P.piv1[0], 0.11, P.piv1[1] + 0.055, P.runTop, "pine", 0.05, 0.05);
  staticBox("g1bar", [0.05, 0.05, 0.27], [P.piv1[0], P.piv1[1] + 0.055, 0], "pine", null, "g1bar");
  // тумба①: наклонная площадка 15° (шарик② при тапе скатывается сам)
  const teeQ = new CANNON.Quaternion();
  teeQ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), -20 * Math.PI / 180);  // tan20=0.36 > 0.32: скатывание
  staticBox("tee1", [0.024, 0.006, 0.030],
    [P.tee1X - 0.003, P.tee1Top - 0.003, 0], "pine", teeQ, "tee");
  // опора площадки — узкий пост СЗАДИ (1.445): за зоной падения дом7 (край 1.41)
  // и за дугой взмаха головы (максимум вылета 1.396+10 мм)
  // опора площадки — КРОНШТЕЙН СБОКУ от стойки молота① (g1postR): доска в z=+0.05,
  // от z=0.11 к z=0.015 — вне головы молота (до z=0.03) и вне падения дом7 (z±0.022)
  staticBox("tee1arm", [P.tee1X - P.piv1[0] + 0.06, 0.006, 0.05],
    [(P.piv1[0] + P.tee1X + 0.06) / 2 - 0.01, P.tee1Top - 0.004, 0.062], "pine", null, "bracket");

  // нижняя полоса: накладка на столешнице под волну ②
  staticBox("base2", [P.base2X1 - P.base2X0, P.base2T, 0.42],
    [(P.base2X0 + P.base2X1) / 2, P.base2Top - P.base2T / 2, 0], "walnut", null, "base2");

  // (маятник① упразднён)
  // (маятник① упразднён)
  // маятник ②-боёк: стойки от полосы, перекладина
  post("g2postL", P.piv2[0], -0.11, P.piv2[1] + 0.055, P.base2Top, "pine", 0.05, 0.05);
  post("g2postR", P.piv2[0], 0.11, P.piv2[1] + 0.055, P.base2Top, "pine", 0.05, 0.05);
  staticBox("g2bar", [0.05, 0.05, 0.27], [P.piv2[0], P.piv2[1] + 0.055, 0], "pine", null, "g2bar");

  // подставка колокола (столешница → юбка)
  post("bellpost", P.bellX, 0, P.bellY, d.top, "walnut", 0.022, 0.022);  // узкая: не на дуге взмаха

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

  // шар ① Ø32 (135 г) — на горке
  addDyn("ball", 4 / 3 * Math.PI * P.ballR ** 3 * P.dens.steel, "steel",
    [{ shape: new CANNON.Sphere(P.ballR) }],
    [P.ballX0, ramp.lineY(P.ballX0) + P.ballR + P.rampT / 2, 0], "sphere",
    { angularDamping: 0.10, linearDamping: 0.01,
      spec: { size: [2 * P.ballR, 2 * P.ballR, 2 * P.ballR] } });

  // шарик ② Ø16 (сталь 17 г) — на тумбе①: молот① тапает его на взмахе
  addDyn("ball2", 4 / 3 * Math.PI * P.ball2R ** 3 * P.dens.steel, "steel",
    [{ shape: new CANNON.Sphere(P.ball2R) }],
    [P.tee1X, P.tee1Top + P.ball2R, 0], "sphere",
    { angularDamping: 0.10, linearDamping: 0.01,
      spec: { size: [2 * P.ball2R, 2 * P.ball2R, 2 * P.ball2R] } });

  // волна ① (14, ярус A) + волна ② (20, полоса)
  for (let i = 0; i < P.domN1; i++)
    addDyn("dom" + i, P.domSize[0] * P.domSize[1] * P.domSize[2] * P.dens.pine, "dom",
      [{ shape: new CANNON.Box(V(P.domSize[0] / 2, P.domSize[1] / 2, P.domSize[2] / 2)) }],
      [P.dom1X0 + i * P.domStep, P.runTop + P.domSize[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005, spec: { size: [...P.domSize] } });
  for (let i = 0; i < P.domN2; i++)
    addDyn("dom" + (P.domN1 + i), P.domSize[0] * P.domSize[1] * P.domSize[2] * P.dens.pine, "dom",
      [{ shape: new CANNON.Box(V(P.domSize[0] / 2, P.domSize[1] / 2, P.domSize[2] / 2)) }],
      [P.dom2X0 + i * P.domStep, P.base2Top + P.domSize[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005, spec: { size: [...P.domSize] } });

  // маятники: рука 6×420 + голова 20×20×60 (сосна ~10 г)
  function addMallet(name, piv) {
    // физмат «сосна»: с дом7 сцепляется (dom-wood 0.80 — плашка тащит голову, длинный
    // импульс), а тап по шарику — steel-wood 0.32/0.20. Так работало в зелёной v4 (0.78).
    const b = addDyn(name,
      (0.006 * P.armLen * 0.006 + P.headSize[0] * P.headSize[1] * P.headSize[2]) * P.dens.pine,
      "pine",
      [{ shape: new CANNON.Box(V(P.shaftR, P.armLen / 2, P.shaftR)), off: V(0, -P.armLen / 2, 0) },
       { shape: new CANNON.Box(V(P.headSize[0] / 2, P.headSize[1] / 2, P.headSize[2] / 2)),
         off: V(0, -P.armLen, 0) }],
      [piv[0], piv[1], 0], "mallet",
      { angularDamping: 0.02, linearDamping: 0.005,
        spec: { armLen: P.armLen, head: [...P.headSize] } });
    const anchor = new CANNON.Body({ mass: 0 });
    anchor.position.set(piv[0], piv[1], 0);
    world.addBody(anchor); byName[name + "Anchor"] = anchor;
    world.addConstraint(new CANNON.HingeConstraint(anchor, b, {
      pivotA: V(0, 0, 0), axisA: V(0, 0, 1), pivotB: V(0, 0, 0), axisB: V(0, 0, 1) }));
    return b;
  }
  addMallet("mallet1", P.piv1);
  addMallet("mallet2", P.piv2);

  // колокол: латунный Ø58×75, 800 г — юбка на дуге 16° маятника②
  addDyn("bell", P.bellMass, "brass",
    [{ shape: new CANNON.Box(V(0.029, 0.015, 0.029)), off: V(0, 0.015, 0) },
     { shape: new CANNON.Box(V(0.025, 0.0125, 0.025)), off: V(0, 0.0425, 0) },
     { shape: new CANNON.Box(V(0.020, 0.010, 0.020)), off: V(0, 0.065, 0) }],
    [P.bellX, P.bellY, 0], "bell",
    { angularDamping: 0.50, linearDamping: 0.10, spec: { bell: [0.058, 0.075] } });

  /* ================= события ================= */
  const listen = ["ball", "ball2", "mallet1", "mallet2", "bell",
    ...Array.from({ length: P.domN1 + P.domN2 }, (_, i) => "dom" + i)];
  const lastEv = {};
  for (const n of listen) byName[n].addEventListener("collide", e => {
    const other = e.body === byName[n] ? e.target : e.body;
    let oname = null;
    for (const k in byName) if (byName[k] === other) { oname = k; break; }
    if (!oname || /Anchor/.test(oname)) return;
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
    const ang = n => +tilt(byName[n]).toFixed(0);
    const domAng1 = Array.from({ length: P.domN1 }, (_, i) => ang("dom" + i));
    const domAng2 = Array.from({ length: P.domN2 }, (_, i) => ang("dom" + (P.domN1 + i)));
    const malDeg = b => byName[b] ? (() => {
      const u = byName[b].quaternion.vmult(V(0, -1, 0));
      return +(Math.atan2(u.x, -u.y) * 180 / Math.PI).toFixed(1);
    })() : 0;
    const bellEv = events.filter(e => (e.a === "bell" || e.b === "bell") &&
      (e.a === "mallet2" || e.b === "mallet2"));
    return {
      t: +t.toFixed(2),
      ball: { p: byName.ball.position.toArray().map(v => +v.toFixed(3)),
              v: +byName.ball.velocity.length().toFixed(2) },
      ball2: byName.ball2 ? { p: byName.ball2.position.toArray().map(v => +v.toFixed(3)),
               v: +byName.ball2.velocity.length().toFixed(2) } : null,
      domAng1, domFallen1: domAng1.filter(a => a > 50).length,
      domAng2, domFallen2: domAng2.filter(a => a > 50).length,
      mallet1Deg: malDeg("mallet1"), mallet2Deg: malDeg("mallet2"),
      bellTilt: +tilt(byName.bell).toFixed(1),
      bellHits: bellEv.length, firstBellT: bellEv.length ? bellEv[0].t : 0,
      allRest: dynamics.every(d => d.body.velocity.length() < 0.008 && d.body.angularVelocity.length() < 0.02),
      sane: dynamics.every(d => Number.isFinite(d.body.position.x) && d.body.position.y > -1.2
        && d.body.position.x > -1 && d.body.position.x < 8),
    };
  }
  return { world, P, spec, byName, dynamics, events, step, reset, probe, dt: P.dt,
    get t() { return t; } };
}
