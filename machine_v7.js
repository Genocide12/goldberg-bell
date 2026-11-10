/* ============================================================
   machine.js v7 — «ГОРОД ИЗ КАРТ»: машина Голдберга ТОЛЬКО из
   игральных карт (покер 88×63 мм, плотность 920 кг/м³ → 3.1 г).
   Единый источник для headless-прогона (Node) и страницы (браузер).

   СЕКРЕТ СТОЙКИ: карта 0.3 мм на ребре не стоит (тонет в
   контактах). Мир не усыпляет (allowSleep=false) — каждая карта
   заморожена вручную body.sleep() и стоит идеально; любое касание
   БУДИТ тело, дальше честная физика падения (лабы cards_lab4/5:
   сон 1200/1200 кадров, темп волны 0.10-0.14 с/карта — настоящий).

   ЦЕПОЧКА (~22-26 с):
     щелчок пальцем по первой карте (кнопка «Запуск»)
     → ВОЛНА A 10 карт → камертон-88 … ветка «веер» → БАШНЯ «Маяк» 3эт
     → камертон бьёт ВОЛНУ B 26 карт (веер-ветки: Λ-домики 2 эт.)
     → камертон бьёт ВОЛНУ C 20 карт … ветка → Λ-домик
     → камертон бьёт ВОЛНУ D 24 карты … ветка → БАШНЯ «Юбилейная» 2эт
     → камертон валит УЛИЦУ-ЗАМОК из 6 Λ-домиков (рушат друг друга)
     → улица рушится в ГИГАНТ-ПИРАМИДУ [8-7-6-5-4-3-2-1] = 108 карт
     → на вершине КАРТА-КОРОЛЬ — обвал валит его: «КОРОЛЬ ПАЛ».

   Система координат: поле карт y=0; машина вдоль +x; z — поперёк.
   ============================================================ */

export const P = {
  dens: { card: 920, pine: 600, walnut: 700 },
  card: { L: 0.088, W: 0.063, T: 0.0006 },     // покер; физ-толщина 0.6 мм
  dt: 1 / 120,

  // стол и поле карт (поле 0.30..4.60, верх y=0)
  desk: { x0: -0.25, x1: 8.85, z: 0.55, top: -0.02, thick: 0.04 },
  field: { x0: 0.30, x1: 8.55, z: 0.45, t: 0.02 },
  floorY: -0.78,

  // домик Λ: стойки H63 наклонены, полупролёт s
  house: { H: 0.063, s: 0.028 },

  // волны: шаг 50 мм; последняя карта волны — КАМЕРТОН (H88 на
  // коротком ребре: выше центр удара, длиннее рычаг — бьёт дальше)
  waves: [                                        // зазор камертон→волна 45 мм
    { id: "A", x0: 0.50, n: 12, pitch: 0.058 },    // пролог ~1.6с, камертон 1.138
    { id: "B", x0: 1.183, n: 36, pitch: 0.058 },   // ~5с, камертон 3.213
    { id: "C", x0: 3.258, n: 36, pitch: 0.058 },   // ~5с, камертон 5.288
    { id: "D", x0: 5.333, n: 36, pitch: 0.058 },   // ~5с, камертон 7.363
  ],
  bridgeGap: 0.075,      // зазор камертон → первая карта след. волны (лаба W2 ✓)

  // ветки «веер-камертон»: карта H88 в волне, повёрнутая на 25° —
  // волна проходит (лаба 20/20), веер падает по дуге на цель
  branches: [
    { wave: "A", i: 5,  kind: "tower", levels: 5, x: 0.82, z: 0.065 }, // «Маяк» 5 эт.
    { wave: "B", i: 17, kind: "house", x: 2.19,  z: 0.075 },           // Λ-домик 2 эт.
    { wave: "C", i: 15, kind: "tower", levels: 4, x: 4.16, z: 0.065 }, // «Гранд» 4 эт.
    { wave: "D", i: 13, kind: "house", x: 6.11,  z: 0.075 },           // Λ-домик 2 эт.
  ],
  fanRotY: 25 * Math.PI / 180,   // поворот веера к волне (лаба: 20-30° ✓)

  // улица-замок: 6 Λ-домиков; камертон C валит первый (лаба W2),
  // домики рушат друг друга с шагом 60 мм (лаба F)
  street: { x0: 7.412, n: 8, spacing: 0.06 },

  // ГИГАНТ-ПИРАМИДА [8-7-6-5-4-3-2-1] = 36 домиков = 108 карт
  pyramid: { x0: 7.875, rows: [8, 7, 6, 5, 4, 3, 2, 1], spacing: 0.056 },

  flickV: 1.2,           // щелчок пальцем (лаба B: v1.2 → волна 12/12)
};

export function buildMachine(CANNON) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;          // мир НЕ усыпляет: только явный sleep()
  world.solver.iterations = 40;

  const CARD = P.card;
  const MASS = +(CARD.L * CARD.W * CARD.T * P.dens.card).toFixed(5);   // ≈3.06 г

  const matC = new CANNON.Material("card"), matW = new CANNON.Material("wood");
  const eq = { contactEquationStiffness: 1e8, contactEquationRelaxation: 2 };
  world.addContactMaterial(new CANNON.ContactMaterial(matC, matC, { friction: 0.30, restitution: 0.02, ...eq }));
  world.addContactMaterial(new CANNON.ContactMaterial(matC, matW, { friction: 0.45, restitution: 0.05, ...eq }));

  const V = (x, y, z) => new CANNON.Vec3(x, y, z);
  const spec = [], byName = {}, dynamics = [], events = [];
  const homeY = {};                  // стартовая высота каждой карты (для probe)
  let t = 0, started = false;

  /* ---------- статика ---------- */
  function staticBox(name, size, pos, mat, tag) {
    const b = new CANNON.Body({ mass: 0, material: mat });
    b.addShape(new CANNON.Box(V(size[0] / 2, size[1] / 2, size[2] / 2)));
    b.position.set(...pos);
    world.addBody(b); byName[name] = b;
    spec.push({ name, mat, dynamic: false, shape: "box", size, pos, tag });
    return b;
  }
  staticBox("floor", [10, 0.1, 8], [2.5, P.floorY - 0.05, 0], "walnut", "floor");
  spec.push({ name: "walls", mat: "walls", dynamic: false, shape: "room", pos: [0, 0, 0] });
  const d = P.desk;
  staticBox("desk", [d.x1 - d.x0, d.thick, 2 * d.z], [(d.x0 + d.x1) / 2, d.top - d.thick / 2, 0], "walnut", "desk");
  for (const lx of [d.x0 + 0.05, 1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, d.x1 - 0.05])
    for (const lz of [-d.z + 0.06, d.z - 0.06]) {
      const h = d.top - d.thick - P.floorY;
      staticBox("deskleg" + lx.toFixed(2) + (lz > 0 ? "P" : "M"), [0.06, h, 0.06],
        [lx, P.floorY + h / 2, lz], "walnut", "post");
    }
  const f = P.field;
  staticBox("field", [f.x1 - f.x0, f.t, 2 * f.z], [(f.x0 + f.x1) / 2, -f.t / 2, 0], "pine", "field");

  /* ---------- карта ----------
     kind: stand (H63 на длинном ребре), tall (H88 камертон/король),
     lean (стойка домика), deck (перекладина), fan (веер-ветка: грань
     поперёк пути — падая, летит вбок) */
  function addCard(name, kind, half, pos, opts = {}) {
    const body = new CANNON.Body({ mass: MASS, material: matC, allowSleep: true,
      sleepSpeedLimit: 0.04, sleepTimeLimit: 0.35,
      angularDamping: 0.03, linearDamping: 0.01 });
    body.addShape(new CANNON.Box(half));
    body.position.set(...pos);
    if (opts.rotZ) body.quaternion.setFromAxisAngle(V(0, 0, 1), opts.rotZ);
    world.addBody(body);
    byName[name] = body;
    homeY[name] = pos[1];
    dynamics.push({ name, body, home: [...pos], kind });
    spec.push({ name, mat: "card", dynamic: true, kind, pos,
      size: [half.x * 2, half.y * 2, half.z * 2],
      rotZ: opts.rotZ || 0, face: opts.face || "back" });
    body.sleep();                     // заморозка до первого касания
    return body;
  }
  const halfStand = () => V(CARD.T / 2, CARD.W / 2, CARD.L / 2);   // H63
  const halfTall  = () => V(CARD.T / 2, CARD.L / 2, CARD.W / 2);   // H88

  /* ---------- Λ-домик (2 стойки + перекладина) ---------- */
  const HL = Math.sqrt(P.house.H ** 2 - P.house.s ** 2);
  const AL = Math.atan2(P.house.s, HL);
  const houseH = HL + CARD.T;
  function houseAt(prefix, x0, y0, z, face) {
    addCard(prefix + "L", "lean", V(CARD.T / 2, P.house.H / 2, CARD.L / 2),
      [x0 - P.house.s / 2, y0 + HL / 2, z], { rotZ: AL, face });
    addCard(prefix + "R", "lean", V(CARD.T / 2, P.house.H / 2, CARD.L / 2),
      [x0 + P.house.s / 2, y0 + HL / 2, z], { rotZ: -AL, face });
    addCard(prefix + "D", "deck", V(CARD.L / 2, CARD.T / 2, CARD.W / 2),
      [x0, y0 + HL + CARD.T / 2 + 0.0002, z], { face });
    return y0 + houseH + 0.0002;      // верх (для следующего этажа)
  }

  /* ---------- ВОЛНЫ + КАМЕРТОНЫ ---------- */
  const waveIdx = { A: [], B: [], C: [], D: [] };
  const fanSet = new Set(P.branches.map(b => b.wave + b.i));
  for (const w of P.waves) {
    for (let i = 0; i < w.n; i++) {
      const name = "w" + w.id + i;
      const x = w.x0 + i * w.pitch;
      if (fanSet.has(w.id + i)) {
        const b = new CANNON.Body({ mass: MASS, material: matC, allowSleep: true,
          sleepSpeedLimit: 0.04, sleepTimeLimit: 0.35,
          angularDamping: 0.03, linearDamping: 0.01 });
        b.addShape(new CANNON.Box(halfTall()));
        b.position.set(x, CARD.L / 2, 0);
        const q = new CANNON.Quaternion();
        q.setFromEuler(0, P.fanRotY, 0);
        b.quaternion.copy(q);
        world.addBody(b); byName[name] = b;
        homeY[name] = CARD.L / 2;
        dynamics.push({ name, body: b, home: [x, CARD.L / 2, 0], kind: "fan" });
        spec.push({ name, mat: "card", dynamic: true, kind: "fan", pos: [x, CARD.L / 2, 0],
          size: [CARD.T, CARD.L, CARD.W], rotZ: 0, rotY: P.fanRotY, face: "fan" });
        b.sleep();
      }
      else if (i === w.n - 1)          // камертон — H88 на коротком ребре
        addCard(name, "tall", halfTall(), [x, CARD.L / 2, 0], { face: "ace" });
      else
        addCard(name, "stand", halfStand(), [x, CARD.W / 2, 0]);
      waveIdx[w.id].push(name);
    }
  }

  /* ---------- цели веток «веер» (z = +0.065 от волны) ---------- */
  for (const br of P.branches) {
    const z = br.z;
    if (br.kind === "tower") {         // БАШНЯ (этажей по ветке)
      let top = 0;
      for (let lvl = 0; lvl < br.levels; lvl++)
        top = houseAt("bt" + br.wave + "_" + lvl + "_", br.x, top + (lvl ? 0.0004 : 0), z, "back");
    } else {                           // Λ-домик 2 этажа
      let top = houseAt("bh" + br.wave + br.i + "_", br.x, 0, z, "back");
      houseAt("bh" + br.wave + br.i + "u_", br.x, top, z, "back");
    }
  }

  /* ---------- УЛИЦА-ЗАМОК: 6 Λ-домиков ---------- */
  const streetNames = [];
  for (let k = 0; k < P.street.n; k++) {
    const x = P.street.x0 + k * P.street.spacing;
    houseAt("st" + k + "_", x, 0, 0, k % 2 ? "back" : "ace");
    streetNames.push("st" + k + "_D");
  }

  /* ---------- ГИГАНТ-ПИРАМИДА + КОРОЛЬ ---------- */
  const pyrNames = [];
  let crownX = 0;
  {
    const cx = P.pyramid.x0 + (P.pyramid.rows[0] - 1) * P.pyramid.spacing / 2;
    crownX = cx;
    let y = 0;
    P.pyramid.rows.forEach((n, r) => {
      const rowW = (n - 1) * P.pyramid.spacing;
      for (let k = 0; k < n; k++) {
        const x = cx - rowW / 2 + k * P.pyramid.spacing;
        houseAt("py" + r + "_" + k + "_", x, y, 0, r >= 4 ? "face" : "back");
        for (const sfx of ["L", "R", "D"]) pyrNames.push("py" + r + "_" + k + "_" + sfx);
      }
      y += houseH + 0.0004;
    });
    // КОРЛЬ на вершине (верх последней перекладины = y - 0.0004)
    addCard("crown", "tall", halfTall(), [cx, y - 0.0004 + CARD.L / 2 + 0.0003, 0],
      { face: "king" });
  }

  /* ---------- события (для звука в браузере) ---------- */
  const lastEv = {};
  for (const dn of dynamics) {
    dn.body.addEventListener("collide", e => {
      const other = e.body === dn.body ? e.target : e.body;
      let oname = null;
      for (const k in byName) if (byName[k] === other) { oname = k; break; }
      if (!oname) return;
      const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
      const key = [dn.name, oname].sort().join("×");
      if (t - (lastEv[key] || -1) < 0.06) return;
      lastEv[key] = t;
      events.push({ t: +t.toFixed(3), a: dn.name, b: oname, v: +v.toFixed(2) });
    });
  }

  /* ---------- управление ---------- */
  /* пробуждение «рухнула опора»: движущееся тело будит спящего,
     если оно в 40 мм по горизонтали и не выше 12 мм / не ниже 90 мм
     (движение ПОД спящим = выдернутая опора: этажи башен, король).
     Домики-ветки (z=65 мм) и улица (57 мм от волны) вне зоны — их
     валит только честный контакт веера/камертона. */
  const WAKE_H2 = 0.040 ** 2;
  function step(n = 1) {
    for (let i = 0; i < n; i++) {
      world.step(P.dt); t += P.dt;
      const moving = [];
      for (const d of dynamics)
        if (d.body.sleepState !== 2 &&
            d.body.velocity.lengthSquared() > 1e-4) moving.push(d.body.position);
      if (moving.length)
        for (const d of dynamics)
          if (d.body.sleepState === 2) {
            const p = d.body.position;
            for (const q of moving) {
              const dx = p.x - q.x, dz = p.z - q.z, dy = p.y - q.y;
              if (dx * dx + dz * dz < WAKE_H2 && dy > -0.012 && dy < 0.090) {
                d.body.wakeUp(); break;
              }
            }
          }
    }
  }
  function start() {                     // щелчок пальцем по первой карте
    if (started) return;
    started = true;
    const b = byName.wA0;
    b.wakeUp();
    b.velocity.set(P.flickV, 0, 0);
  }
  function reset() {
    // квартернион: стойки L → +AL, R → -AL, остальные без поворота
    for (const d of dynamics) {
      d.body.position.set(...d.home);
      const isL = /_(L|uL)$/.test(d.name), isR = /_(R|uR)$/.test(d.name);
      if (isL) d.body.quaternion.setFromAxisAngle(V(0, 0, 1), AL);
      else if (isR) d.body.quaternion.setFromAxisAngle(V(0, 0, 1), -AL);
      else d.body.quaternion.set(0, 0, 0, 1);
      d.body.velocity.setZero(); d.body.angularVelocity.setZero();
      d.body.sleep();
    }
    events.length = 0; t = 0; started = false;
    for (const k in lastEv) delete lastEv[k];
  }

  /* ---------- probe: состояние для HUD и тестов ---------- */
  function probe() {
    const tilt = b => {
      const u = b.quaternion.vmult(V(0, 1, 0));
      return Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI;
    };
    const fell = n => {
      // карта «упала»: лежит (тонкая ось у горизонтали) ИЛИ заметно
      // ниже дома (опёрлась о кучу — в жизни тоже бывает)
      const b = byName[n];
      if (!b) return false;
      const u = b.quaternion.vmult(V(0, 1, 0));
      const tiltDeg = Math.acos(Math.max(-1, Math.min(1, Math.abs(u.y)))) * 180 / Math.PI;
      // лежит (тонкая ось у горизонтали) / сползла с кучи / опёрлась набок
      return tiltDeg > 60 || b.position.y < homeY[n] - 0.012;
    };
    const firstFall = names => {
      for (const n of names) if (fell(n)) return n;
      return null;
    };
    const waveStat = id => ({
      fallen: waveIdx[id].filter(fell).length,
      total: waveIdx[id].length,
    });
        // домик улицы упал = обе стойки лежат (перекладина может остаться
    // лежать на куче почти на исходной высоте — это всё равно обвал)
    const houseDown = pre => fell(pre + "L") && fell(pre + "R");
    const streetFall = Array.from({ length: P.street.n },
      (_, k) => houseDown("st" + k + "_")).filter(Boolean).length;
    const pyrFall = pyrNames.filter(fell).length;
    const crownTilt = +tilt(byName.crown).toFixed(0);
    const crownFall = crownTilt > 30 || byName.crown.position.y < homeY.crown - 0.04;
    const towerFall = ["btA_0_D","btA_1_D","btA_2_D","btA_3_D","btA_4_D","btC_0_D","btC_1_D","btC_2_D","btC_3_D"].filter(fell).length;
    return {
      t: +t.toFixed(2),
      waveA: waveStat("A"), waveB: waveStat("B"), waveC: waveStat("C"), waveD: waveStat("D"),
      towerFall, streetFall, streetTotal: streetNames.length,
      pyrFall, pyrTotal: pyrNames.length,
      crownTilt, crownFall,
      crownX: +byName.crown.position.x.toFixed(2),
      crownY: +byName.crown.position.y.toFixed(3),
      sane: dynamics.every(d => Number.isFinite(d.body.position.x)
        && d.body.position.y > -1.2 && d.body.position.x > -1 && d.body.position.x < 9.5
        && Math.abs(d.body.position.z) < 0.6),
      allRest: dynamics.every(d => d.body.velocity.length() < 0.008
        && d.body.angularVelocity.length() < 0.02),
    };
  }

  return { world, P, spec, byName, dynamics, events, step, start, reset, probe,
    dt: P.dt, get t() { return t; } };
}
