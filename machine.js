/* ============================================================
   machine.js v5 — цепочка на cannon-es, 3D.
   Единый источник для headless-прогона (Node) и страницы (браузер).
   Система координат: y=0 — верх базовой доски; столешница y=-0.02;
   пол комнаты y=-0.78. Машина идёт вдоль +x, z — поперёк.
   Цепочка: горка (шар-орех 12 г) → волна① 8 → дом7 опрокидывается
   НА шарик② → прокат по мёртво-плоскому ярусу → жёлоб 2.4 м (1.5°)
   → волна② 46 → маятник-боёк → колокол.
   v5 «по-настоящему» (по жалобе «медленно и не по-настоящему»):
   - домино 60×28×8 мм, бук 700 кг/м³ → 9.4 г; шаг 0.65×h — реальные
     пропорции и темп (0.15-0.2 с/плашка, опрокидывание у основания);
   - шарик② СТОИТ на мёртво-горизонтальном ярусе в 26 мм за гранью
     дом7: без наклона и без удара он неподвижен — его запускает
     только физическое падение дом7 (никаких наклонных тумб, на
     которых шарик «сам катится» на старте);
   - молот① и наклонная тумба упразднены: их звено было косметическим.
   ============================================================ */

export const P = {
  dens: { pine: 600, walnut: 700, dom: 700, steel: 7850, glass: 2500, brass: 8500 },
  fr:   { woodWood: 0.45, steelWood: 0.32, glassWood: 0.22, steelGlass: 0.30,
          woodBrass: 0.30, steelBrass: 0.35, glassBrass: 0.40 },
  rest: { woodWood: 0.22, steelWood: 0.20, glassWood: 0.35, steelGlass: 0.50,
          woodBrass: 0.55, steelBrass: 0.50, glassBrass: 0.45 },
  dt: 1 / 120,

  // стол и комната (машина длинная: до x≈7.3)
  desk: { x0: -0.25, x1: 7.30, z: 0.30, top: -0.02, thick: 0.04 },
  floorY: -0.78,

  // горка (проверенная): пол 20° от (0.08,0.26) до (0.52,0.104)
  rampX0: 0.08, rampX1: 0.52, rampY0: 0.26, rampY1: 0.104,
  rampW: 0.09, rampT: 0.012,
  wallH: 0.025, wallT: 0.010,

  // ярус A: плоский прогон 0.52..2.40 (верх y=0.10). Он же «полка»
  // шарика②: мёртво-горизонтален — шарик без удара не двигается.
  runX0: 0.52, runX1: 2.40, runTop: 0.10, runH: 0.08, runW: 0.20,

  ballR: 0.012, ball2R: 0.006,   // шар① Ø24 орех (5 г — мягкий триггер); шарик② Ø12 стекло (2.3 г)
  ballX0: 0.13,

  // волна ①: 8 домино У КРАЯ яруса; дом7 центр 2.336, грань 2.340.
  // Куча улёгшихся плашек занимает до грани+64 мм = 2.40 = край яруса.
  domStep: 0.039,                 // 0.65 × h — шаг настоящих цепей
  dom1X0: 2.063, domN1: 8,        // дом0 2.063 … дом7 2.336
  domSize: [0.008, 0.060, 0.028], // 8×60×28 мм, бук 700 кг/м³ → 9.4 г

  // ПЬЕДЕСТАЛ у края яруса (топ 0.125): шарик② в зоне, где дуга кончика
  // дом7 (θ≈52) врезается в него радиально — чистый горизонтальный
  // хлыст (проверено: запуск v=0.68). Хвост волны после звона не показываем:
  // страница останавливает опыт через 2.5 с после звона.
  ball2X: 2.392, pedX: 2.389, pedTop: 0.125,

  // жёлоб составной: голова 8° (разгон после пьедестала) + тело 0.4°
  chH0: 2.40, chH1: 2.75, chHY0: 0.077, chHY1: 0.028,   // голова 8°
  chB0: 2.75, chB1: 4.94, chBY0: 0.028, chBY1: 0.020,   // тело 0.4°
  chuteW: 0.09, chuteT: 0.012,

  // нижняя полоса (накладка на столешнице)
  base2X0: 4.80, base2X1: 7.15, base2Top: -0.015, base2T: 0.005,

  // волна ②: длинный честный финал (0.14 с/плашка ≈ 6.5 с)
  dom2X0: 4.98, domN2: 46,        // дом8 4.98 … дом53 6.735 (грань 6.739)

  // маятник-боёк: кончик дом53 хлещет его палку на высоте ~35 мм;
  // палка висит в 34 мм за гранью дом53
  piv2: [6.773, 0.425], armLen: 0.42, shaftR: 0.003,
  headSize: [0.020, 0.020, 0.060],

  // колокол: КОНЧИК дом53 хлещет юбку напрямую (молот упразднён:
  // его 11-секундный ползунок — та самая «медленная неестественность»).
  // Юбка лицом на 96 мм за гранью дом53, низ на 10 мм над полосой:
  // кончик при θ55-70 проходит в 30 мм от пола — в юбку.
  bellX: 6.800, bellY: 0.008, bellMass: 0.15,   // юбка лицом на 46 мм за гранью: кончик при θ≈54 (v 0.85)
};

export function buildMachine(CANNON) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 60;

  const M = {};
  for (const n of ["wood", "steel", "glass", "brass", "dom"]) M[n] = new CANNON.Material(n);
  // единый жёсткий малоинерционный режим контактов: при дефолтных
  // relax 3 лёгкие тела «висят» друг на друге (клин домино по 10+ с)
  const eq = { contactEquationStiffness: 1e8, contactEquationRelaxation: 2 };
  const cm = (a, b, fr, rest) =>
    world.addContactMaterial(new CANNON.ContactMaterial(a, b, { friction: fr, restitution: rest, ...eq }));
  cm(M.wood, M.wood, P.fr.woodWood, P.rest.woodWood);
  cm(M.steel, M.wood, P.fr.steelWood, P.rest.steelWood);
  cm(M.glass, M.wood, P.fr.glassWood, P.rest.glassWood);
  cm(M.steel, M.glass, P.fr.steelGlass, P.rest.steelGlass);
  cm(M.wood, M.brass, P.fr.woodBrass, P.rest.woodBrass);
  cm(M.steel, M.brass, P.fr.steelBrass, P.rest.steelBrass);
  cm(M.glass, M.brass, P.fr.glassBrass, P.rest.glassBrass);
  // домино: грани без рикошета; подошва цепкая (μ 0.8) — опрокидывание
  // у основания, а не скольжение, как у настоящих домино на дереве
  // μ 0.01 — критично: при μ≥0.03 трение скольжения граней (нажим лежащей
  // плашки ~0.9 Н) съедает энергию падения — каскад ползёт 0.6 с/шт.
  // При μ 0.01 темп 0.14 с/шт, уклад плоский 77-90° (стенд tune_cascade)
  cm(M.dom, M.dom, 0.01, 0.02);
  cm(M.dom, M.wood, 0.80, 0.01);
  cm(M.dom, M.steel, 0.25, 0.30);
  cm(M.dom, M.glass, 0.25, 0.35);   // дом7 → шарик② (запуск) и шарик② → дом8
  cm(M.dom, M.brass, 0.30, 0.25);
  cm(M.wood, M.dom, 0.30, 0.05);    // шар-орех① бьёт домино волны①

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
  staticBox("floor", [10, 0.1, 8], [3.5, P.floorY - 0.05, 0], "walnut", null, "floor");
  spec.push({ name: "walls", mat: "walls", dynamic: false, shape: "room", pos: [0, 0, 0] });
  staticBox("desk", [d.x1 - d.x0, d.thick, 2 * d.z], [(d.x0 + d.x1) / 2, d.top - d.thick / 2, 0], "walnut", null, "desk");
  for (const lx of [d.x0 + 0.05, 1.3, 2.7, 4.1, 5.5, 6.3, d.x1 - 0.05])
    for (const lz of [-d.z + 0.05, d.z - 0.05])
      post("deskleg" + lx.toFixed(2) + lz.toFixed(2), lx, lz, d.top - d.thick, P.floorY, "walnut", 0.06, 0.06);
  staticBox("base", [7.4, 0.02, 0.42], [3.45, -0.03, 0], "walnut", null, "base");

  // горка: пол 20° + стенки + стойки
  const ramp = board("ramp", [P.rampX0, P.rampY0], [P.rampX1, P.rampY1],
    P.rampW, P.rampT, "pine", {});
  for (const [nx, lx] of [["1", 0.16], ["2", 0.30]])
    post("rampleg" + nx, lx, 0, ramp.lineY(lx) - P.rampT, -0.02, "pine", 0.05, 0.16);

  // ярус A: плоский прогон 0.52..2.40 + направляющие у горки + ноги
  staticBox("runway", [P.runX1 - P.runX0, P.runH, P.runW],
    [(P.runX0 + P.runX1) / 2, P.runTop - P.runH / 2, 0], "pine", null, "runway");
  for (const s of [1, -1])
    staticBox("guide" + (s > 0 ? "R" : "L"), [0.40, 0.045, 0.010],
      [0.72, P.runTop + 0.0225, s * 0.105], "pine", null, "guide");
  for (const lx of [0.68, 1.70, 2.30])
    post("runfoot" + lx.toFixed(2), lx, 0, P.runTop - P.runH, -0.02, "pine", 0.06, 0.18);

  // жёлоб составной: голова 8° + тело 0.4° (стык на 2.75)
  const chH = board("chuteHead", [P.chH0, P.chHY0], [P.chH1, P.chHY1],
    P.chuteW, P.chuteT, "pine", { wallH: 0.030 });
  const chB = board("chuteBody", [P.chB0, P.chBY0], [P.chB1, P.chBY1],
    P.chuteW, P.chuteT, "pine", { wallH: 0.030 });
  post("chutelegH", 2.55, 0, chH.lineY(2.55) - P.chuteT, -0.02, "pine", 0.04, 0.14);
  for (const lx of [3.30, 4.10, 4.80])
    post("chuteleg" + lx.toFixed(2), lx, 0, chB.lineY(lx) - P.chuteT, -0.02, "pine", 0.04, 0.14);

  // пьедестал шарика② (дизайн, давший полную цепь до звона)
  staticBox("ped1", [0.022, P.pedTop - P.runTop, 0.030],
    [P.pedX, (P.pedTop + P.runTop) / 2, 0], "walnut", null, "post");

  // нижняя полоса: накладка на столешнице под волну ②
  staticBox("base2", [P.base2X1 - P.base2X0, P.base2T, 0.42],
    [(P.base2X0 + P.base2X1) / 2, P.base2Top - P.base2T / 2, 0], "walnut", null, "base2");

  // подставка колокола (столешница → юбка)
  post("bellpost", P.bellX, 0, P.bellY, d.top, "walnut", 0.022, 0.022);

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

  // шар ① Ø32 — орех, 12 г: лёгкий триггер, как в настоящих машинах
  // (тяжёлый стальной шар «переезжал» волну, как бульдозер)
  addDyn("ball", 4 / 3 * Math.PI * P.ballR ** 3 * P.dens.walnut, "walnut",
    [{ shape: new CANNON.Sphere(P.ballR) }],
    [P.ballX0, ramp.lineY(P.ballX0) + P.ballR + P.rampT / 2, 0], "sphere",
    { angularDamping: 0.10, linearDamping: 0.01,
      spec: { size: [2 * P.ballR, 2 * P.ballR, 2 * P.ballR] } });

  // шарик ② Ø12 — стекло 2.3 г. СТОИТ на пьедестале у края яруса:
  // без падения дом7 неподвижен (это лечит «сам катится на старте»).
  // Позиция — на касательной дуги кончика дом7 (θ≈50°): кончик хлещет
  // его вперёд, и шарик улетает за край — сразу вне зоны кучи плашек.
  addDyn("ball2", 4 / 3 * Math.PI * P.ball2R ** 3 * P.dens.glass, "glass",
    [{ shape: new CANNON.Sphere(P.ball2R) }],
    [P.ball2X, P.pedTop + P.ball2R, 0], "sphere",
    { angularDamping: 0.10, linearDamping: 0.01,
      spec: { size: [2 * P.ball2R, 2 * P.ball2R, 2 * P.ball2R] } });

  // волна ① (8) + волна ② (46) — реальные домино
  for (let i = 0; i < P.domN1; i++)
    addDyn("dom" + i, P.domSize[0] * P.domSize[1] * P.domSize[2] * P.dens.dom, "dom",
      [{ shape: new CANNON.Box(V(P.domSize[0] / 2, P.domSize[1] / 2, P.domSize[2] / 2)) }],
      [P.dom1X0 + i * P.domStep, P.runTop + P.domSize[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005, spec: { size: [...P.domSize] } });
  for (let i = 0; i < P.domN2; i++)
    addDyn("dom" + (P.domN1 + i), P.domSize[0] * P.domSize[1] * P.domSize[2] * P.dens.dom, "dom",
      [{ shape: new CANNON.Box(V(P.domSize[0] / 2, P.domSize[1] / 2, P.domSize[2] / 2)) }],
      [P.dom2X0 + i * P.domStep, P.base2Top + P.domSize[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005, spec: { size: [...P.domSize] } });

  // колокол: латунный Ø58×75, 150 г — настоящий настольный; кончик
  // дом53 хлещет юбку (событие dom53×bell = звон)
  addDyn("bell", P.bellMass, "brass",
    [{ shape: new CANNON.Box(V(0.029, 0.015, 0.029)), off: V(0, 0.015, 0) },
     { shape: new CANNON.Box(V(0.025, 0.0125, 0.025)), off: V(0, 0.0425, 0) },
     { shape: new CANNON.Box(V(0.020, 0.010, 0.020)), off: V(0, 0.065, 0) }],
    [P.bellX, P.bellY, 0], "bell",
    { angularDamping: 0.35, linearDamping: 0.06, spec: { bell: [0.058, 0.075] } });

  /* ================= события ================= */
  const listen = ["ball", "ball2", "bell",
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
    // звон = любой удар по колоколу с v>0.15 (кончик дом53 / что угодно)
    const bellEv = events.filter(e => (e.a === "bell" || e.b === "bell") && e.v > 0.15);
    return {
      t: +t.toFixed(2),
      ball: { p: byName.ball.position.toArray().map(v => +v.toFixed(3)),
              v: +byName.ball.velocity.length().toFixed(2) },
      ball2: byName.ball2 ? { p: byName.ball2.position.toArray().map(v => +v.toFixed(3)),
               v: +byName.ball2.velocity.length().toFixed(2) } : null,
      domAng1, domFallen1: domAng1.filter(a => a > 40).length,
      // последняя плашка② заканчивает навалившись на подставку колокола (~34°) —
      // драп «ударил и облокотился», для неё порог >30
      domAng2, domFallen2: domAng2.slice(0, -1).filter(a => a > 40).length
        + (domAng2[domAng2.length - 1] > 30 ? 1 : 0),
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
