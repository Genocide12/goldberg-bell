// Стенд «клина»: 2 плашки, первая под 24° опирается краем на вторую.
// Худший случай волны: пара лежит в контакте, дальше — только гравитация и солвер.
// Перебор: жёсткость/релаксация контактов, restitution, итерации, dt, масса.
// Второй стенд: волна N=10 + удар шариком Ø16 (вход, как в машине).
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const V = (x, y, z) => new CANNON.Vec3(x, y, z);

const H = 0.088, W = 0.044;

function mkWorld(cfg) {
  const world = new CANNON.World({ gravity: V(0, -9.81, 0) });
  world.solver.iterations = cfg.iters;
  const dom = new CANNON.Material("d"), wood = new CANNON.Material("w");
  const cmOpt = {
    friction: cfg.frDD, restitution: cfg.eDD,
    contactEquationStiffness: cfg.stiff, contactEquationRelaxation: cfg.relax,
  };
  world.addContactMaterial(new CANNON.ContactMaterial(dom, dom, cmOpt));
  world.addContactMaterial(new CANNON.ContactMaterial(dom, wood, {
    friction: 0.80, restitution: 0.10,
    contactEquationStiffness: cfg.stiff, contactEquationRelaxation: cfg.relax,
  }));
  const floor = new CANNON.Body({ mass: 0, material: wood });
  floor.addShape(new CANNON.Box(V(1, 0.05, 0.3)));
  floor.position.set(0.5, -0.05, 0);
  world.addBody(floor);
  return { world, dom };
}

function mkDom(world, dom, t, mass) {
  const b = new CANNON.Body({ mass, material: dom, angularDamping: 0.02, linearDamping: 0.005 });
  b.addShape(new CANNON.Box(V(t / 2, H / 2, W / 2)));
  return b;
}

const tilt = b => {
  const u = b.quaternion.vmult(V(0, 1, 0));
  return Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI;
};

/* ---------- стенд A: клин ---------- */
function wedge(cfg) {
  const { world, dom } = mkWorld(cfg);
  const t = cfg.t;
  // d1: вертикальная, задняя грань на x=0.035
  const d1 = mkDom(world, dom, t, cfg.mass);
  d1.position.set(0.035 + t / 2, H / 2, 0);
  world.addBody(d1);
  // d0: наклонена на 24°, нижнее-переднее ребро в (0,0), верхний край вплотную к грани d1
  const d0 = mkDom(world, dom, t, cfg.mass);
  const th = 24 * Math.PI / 180, q = new CANNON.Quaternion();
  q.setFromAxisAngle(V(0, 0, 1), -th);
  d0.quaternion.copy(q);
  const r = q.vmult(V(t / 2, -H / 2, 0));          // ребро в координатах тела
  d0.position.set(-r.x, -r.y, 0);
  world.addBody(d0);
  let t1 = null, t0 = null, warned = false;
  for (let i = 0; i < Math.round(6 / cfg.dt); i++) {
    world.step(cfg.dt);
    const tt = i * cfg.dt;
    if (t1 === null && tilt(d1) > 10) t1 = tt;
    if (t0 === null && tilt(d0) > 80) t0 = tt;
    if (t0) break;
    if (!Number.isFinite(d1.position.x) || d1.position.y < -0.5) { warned = true; break; }
  }
  return {
    d1_10deg: t1 === null ? "STUCK" : +t1.toFixed(2),
    d0_80deg: t0 === null ? "STUCK" : +t0.toFixed(2),
    fin: `${tilt(d0).toFixed(0)}/${tilt(d1).toFixed(0)}`,
    warn: warned,
  };
}

/* ---------- стенд B: волна N + удар шариком ---------- */
function wave(cfg, N = 10, strikeV = 0.9, strikeH = 0.065) {
  const { world, dom } = mkWorld(cfg);
  const steel = new CANNON.Material("s");
  world.addContactMaterial(new CANNON.ContactMaterial(steel, dom, {
    friction: 0.25, restitution: 0.30,
    contactEquationStiffness: cfg.stiff, contactEquationRelaxation: cfg.relax,
  }));
  const t = cfg.t, s = 0.035, doms = [];
  for (let i = 0; i < N; i++) {
    const d = mkDom(world, dom, t, cfg.mass);
    d.position.set(i * s + t / 2, H / 2, 0);
    world.addBody(d); doms.push(d);
  }
  // шарик Ø16 (17 г): 3 см от грани dom0, на высоте strikeH, скорость strikeV
  const ball = new CANNON.Body({ mass: 0.0085, material: steel, angularDamping: 0.1 });
  ball.addShape(new CANNON.Sphere(0.008));
  ball.position.set(t / 2 - 0.008 - 0.03, strikeH, 0);
  ball.velocity.set(strikeV, 0, 0);
  world.addBody(ball);
  const fallT = new Array(N).fill(0);
  for (let i = 0; i < Math.round(10 / cfg.dt); i++) {
    world.step(cfg.dt);
    const tt = i * cfg.dt;
    doms.forEach((d, k) => { if (!fallT[k] && tilt(d) > 50) fallT[k] = tt; });
    if (fallT.every(x => x)) break;
  }
  const bridges = doms.map((d, k) => ({ k, a: +tilt(d).toFixed(0) }))
    .filter(x => x.a >= 20 && x.a <= 60);
  const fallen = fallT.filter(Boolean).length;
  const first = fallT.find(Boolean), last = fallT.filter(Boolean).pop();
  return {
    fell: `${fallen}/${N}`,
    last: last ? +last.toFixed(2) : "—",
    perPiece: fallen > 1 && last ? +((last - first) / (fallen - 1)).toFixed(2) : "—",
    bridges: bridges.length ? bridges.map(b => `d${b.k}:${b.a}°`).join(" ") : "нет",
  };
}

const BASE = { iters: 60, dt: 1 / 120, stiff: 1e7, relax: 3, mass: 0.0232, t: 0.010, eDD: 0.35, frDD: 0.10 };
const L = (over) => ({ ...BASE, ...over });

const configs = [
  ["базлайн (как в машине)", L({})],
  ["stiff 1e8", L({ stiff: 1e8 })],
  ["stiff 1e9", L({ stiff: 1e9 })],
  ["relax 2", L({ relax: 2 })],
  ["relax 1", L({ relax: 1 })],
  ["eDD 0.10", L({ eDD: 0.10 })],
  ["eDD 0.02", L({ eDD: 0.02 })],
  ["iters 150", L({ iters: 150 })],
  ["dt 1/240", L({ dt: 1 / 240 })],
  ["масса 15.7 г (9 мм)", L({ mass: 0.0157, t: 0.009 })],
  ["масса 10.9 г (8 мм)", L({ mass: 0.0109, t: 0.008 })],
  ["комбо: stiff1e8+relax2+eDD.10", L({ stiff: 1e8, relax: 2, eDD: 0.10 })],
  ["комбо + легче 15.7 г", L({ stiff: 1e8, relax: 2, eDD: 0.10, mass: 0.0157, t: 0.009 })],
  ["комбо + iters 120", L({ stiff: 1e8, relax: 2, eDD: 0.10, iters: 120 })],
];

console.log("=== A. КЛИН (2 плашки, 24°, только гравитация; «STUCK» = висит) ===");
console.log("конфиг".padEnd(34), "d1→10°(с)".padEnd(11), "d0→80°(с)".padEnd(11), "фин(°/°)");
for (const [name, cfg] of configs) {
  const r = wedge(cfg);
  console.log(name.padEnd(34), String(r.d1_10deg).padEnd(11), String(r.d0_80deg).padEnd(11), r.fin, r.warn ? "  NaN!" : "");
}

console.log("\n=== B. ВОЛНА 10 + удар шариком 0.9 м/с на 65 мм ===");
console.log("конфиг".padEnd(34), "упало".padEnd(7), "последняя(с)".padEnd(13), "с/шт".padEnd(7), "мосты(20-60°)");
for (const [name, cfg] of configs) {
  const r = wave(cfg);
  console.log(name.padEnd(34), r.fell.padEnd(7), String(r.last).padEnd(13), String(r.perPiece).padEnd(7), r.bridges);
}
