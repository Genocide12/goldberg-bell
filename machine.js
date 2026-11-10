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
  fr:   { woodWood: 0.45, steelWood: 0.32, glassWood: 0.03, steelGlass: 0.30,   // стекло скользит по дереву (полировка)
          woodBrass: 0.30, steelBrass: 0.35, glassBrass: 0.05 },   // полированная латунь: шарик бежит
  rest: { woodWood: 0.22, steelWood: 0.20, glassWood: 0.35, steelGlass: 0.50,
          woodBrass: 0.55, steelBrass: 0.50, glassBrass: 0.30 },
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

  // жёлоб трёхсекционный: голова 8° (разгон) + тело 0.6° (ход) +
  // ТОРМОЗ-ГОРКА 6° вверх на финише — шарик взбегает на неё, теряет
  // скорость до ~0.45 м/с и мягко скатывается на клавиши ксилофона
  chH0: 2.40, chH1: 2.75, chHY0: 0.077, chHY1: 0.028,   // голова 8°
  chB0: 2.75, chB1: 4.94, chBY0: 0.028, chBY1: 0.020,   // тело 0.55° (как в v5)
  chuteW: 0.09, chuteT: 0.012,

  // (качалка упразднена: её головка не дотягивалась до дом8 — 60 мм)

  // ЗВЕНО «ФИНАЛИСТ»: дом43 — двойная плашка 120 мм (18.8 г): её кончик
  // дотягивается дальше обычной (до 6.46) и хлещет юбку колокола —
  // та же связка, что давала звон 14.78 с в v5 (кончик×колокол v 0.36)
  finisher2: [0.008, 0.120, 0.028],

  // ПОЛОСА② — ПРИПОДНЯТЫЙ БРУС 25 мм (столешница → верх 0.010): волна②
  // стоит высоко, шарик② скатывается с лесенки ксилофона и бьёт плашки
  // на высоте 23 мм — то самое «высокое» попадание, от которого волна
  // стартовала в v5 (звон 14.78)
  base2X0: 5.00, base2X1: 6.85, base2Top: -0.015, base2T: 0.005,   // плоская накладка 5 мм (как v5)

  // волна ②: на брусе, дом8 в 100 мм за срезом тормоза (приземление
  // шарика + прокат — как в v5, старт v 0.71); домино пробегают
  // ксилофон-мостовую на 5.50..5.86: ноты топ-топ
  dom2X0: 4.98, domN2: 34,        // дом8 4.98 (как в v5) … дом41 6.277

  // ЗВЕНО «КСИЛОФОН-МОСТОВАЯ»: 5 латунных пластин (90×6×80) врезаны
  // вровень бруса волны② — домино бегут по ним: топ-топ-топ, пять
  // медных нот под копытами волны (шаг 39 мм = доминошный).
  // Признан надёжным после провала «лесенки-переката» (шарик терял
  // z-траекторию на стыках): контакты домино-латунь уже проверены
  // (в v5 кончик дом53 хлестал колокол v 0.36).

  xyH: 0.006,                     // толщина пластины (вровень бруса)

  // колокол: на дуге кончика финалиста-120 (грань дом43 6.349, кончик
  // до 6.46 при θ45; юбка лицом на 6.50, низ на 14 мм над полосой)
  bellX: 6.40, bellY: 0.028, bellMass: 0.15,   // юбка на дуге кончика финалиста (за 5 клавишами)
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
  for (const lx of [3.30, 4.10])
    post("chuteleg" + lx.toFixed(2), lx, 0, chB.lineY(lx) - P.chuteT, -0.02, "pine", 0.04, 0.14);

  // пьедестал шарика② (дизайн, давший полную цепь до звона)
  staticBox("ped1", [0.022, P.pedTop - P.runTop, 0.030],
    [P.pedX, (P.pedTop + P.runTop) / 2, 0], "walnut", null, "post");

  // (качалка упразднена)

  // КСИЛОФОН: 5 латунных пластин-«клавиш» лесенкой на РАМЕ (две
  // продольные стойки-брус 12×12 от стола, как у настоящего ксилофона);
  // непрерывная дорожка: конец пластины i = начало пластины i+1,
  // шаг вниз 10 мм — шарик перекатывается: тук-тук-тук, 5 нот
  // КСИЛОФОН «ЛАДЫ»: 5 латунных полосок-ладов (30×1×60) ВРЕЗАНЫ в пол
  // тела жёлоба на отметках 3.50/3.72/3.94/4.16/4.38. Физике не
  // принадлежат (не тела — тоньше контакта): шарик свободно катится,
  // а при ПЕРЕСЕЧЕНИИ отметки звучит нота (probe пишет xyloNotes).
  // Это честное событие: полоски видно, шарик реально проезжает их.
  const m41x = P.dom2X0 + (P.domN2 - 1) * P.domStep;   // (гео-ссылка колокола)
  const xyloFrets = [3.50, 3.72, 3.94, 4.16, 4.38];
  for (let i = 0; i < 5; i++) {
    const px = xyloFrets[i];
    const q = new CANNON.Quaternion(); q.setFromAxisAngle(V(0, 0, 1), Math.atan2(-0.008, 2.19));
    // НЕ физическое тело (1 мм над полом — контакт убил бы ход шарика):
    // только спека для рендера + отметка для звука в probe
    spec.push({ name: "xyloFret" + i, mat: "brass", dynamic: false, shape: "box",
      size: [0.030, 0.002, 0.060],
      pos: [px, chB.lineY(px) + 0.001, 0],
      quat: [q.x, q.y, q.z, q.w], tag: "fret" });
  }
  // колокол: подставка от столешницы до юбки (низ колокола 14 мм)
  post("bellpost", P.bellX, 0, P.bellY, d.top, "walnut", 0.022, 0.022);

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
  for (let i = 0; i < P.domN2; i++) {
    const sz = i === P.domN2 - 1 ? P.finisher2 : P.domSize;   // дом43 — финалист 120
    addDyn("dom" + (P.domN1 + i), sz[0] * sz[1] * sz[2] * P.dens.dom, "dom",
      [{ shape: new CANNON.Box(V(sz[0] / 2, sz[1] / 2, sz[2] / 2)) }],
      [P.dom2X0 + i * P.domStep, P.base2Top + sz[1] / 2, 0], "dom",
      { angularDamping: 0.02, linearDamping: 0.005, spec: { size: [...sz] } });
  }

  // (качалка и шарик③ упразднены: связка «кончик×шарик на плоскости»
  //  геометрически недостижима — плашка ложится на кучу на θ40-45.
  //  Вместо них: ксилофон ПОД СКАТОМ шарика② и финалист-120 → колокол)

  // колокол: латунный Ø58×75, 150 г — настоящий настольный; шарик③
  // прилетает в юбку после пробега по ксилофону (5 нот)
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
  // трекер ладов ксилофона: пересечение шариком② отметок 3.50..4.38
  const fretTimes = []; let fretPrevX = null;
  const FRET_MARKS = [3.50, 3.72, 3.94, 4.16, 4.38];
  function step(n = 1) {
    for (let i = 0; i < n; i++) {
      world.step(P.dt); t += P.dt;
      const x = byName.ball2.position.x;
      if (fretPrevX !== null)
        for (let k = 0; k < FRET_MARKS.length; k++)
          if (fretPrevX < FRET_MARKS[k] && x >= FRET_MARKS[k] && fretTimes.length === k)
            fretTimes.push(+t.toFixed(2));
      fretPrevX = x;
    }
  }
  function reset() {
    for (const d of dynamics) {
      d.body.position.set(...d.home);
      d.body.quaternion.set(0, 0, 0, 1);
      d.body.velocity.setZero(); d.body.angularVelocity.setZero();
      d.body.wakeUp();
    }
    events.length = 0; t = 0; fretTimes.length = 0; fretPrevX = null;
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
      // последняя плашка② — финалист-120: бьёт колокол и опирается
      // на его юбку (угол всего 10-15°) — «ударил и облокотился»
      domAng2, domFallen2: domAng2.slice(0, -1).filter(a => a > 40).length
        + (domAng2[domAng2.length - 1] > 10 ? 1 : 0),
      // ноты ксилофона-ладов: времена пересечения отметок (step-трекер)
      xyloNotes: [...fretTimes],
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
