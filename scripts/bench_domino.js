// Бенчмарк домино-волны в cannon-es: 5 плашек, стартовый удар, замер передачи.
const CANNON = require("/home/z/node_modules/cannon-es");

function bench(opts) {
  const { step, frFoot, restFace, iters, domH, domT, domW, impulse } = opts;
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
  world.solver.iterations = iters;
  const mFoot = new CANNON.Material("foot"), mFace = new CANNON.Material("face");
  world.addContactMaterial(new CANNON.ContactMaterial(mFoot, mFoot, { friction: frFoot, restitution: restFace }));
  const floorM = new CANNON.Material("floor");
  world.addContactMaterial(new CANNON.ContactMaterial(mFoot, floorM, { friction: 0.9, restitution: 0.02 }));

  const V = (x, y, z) => new CANNON.Vec3(x, y, z);
  const floor = new CANNON.Body({ mass: 0, material: floorM });
  floor.addShape(new CANNON.Box(V(1, 0.05, 0.5)));
  floor.position.set(0, -0.05, 0);
  world.addBody(floor);

  const bodies = [];
  for (let i = 0; i < 5; i++) {
    const b = new CANNON.Body({ mass: 0.010 * domH * 0.044 * 600, material: mFoot,
      angularDamping: 0.02, linearDamping: 0.005 });
    b.addShape(new CANNON.Box(V(domT / 2, domH / 2, domW / 2)));
    b.position.set(i * step, domH / 2, 0);
    world.addBody(b); bodies.push(b);
    b.__i = i;
  }
  // старт: стальной шар Ø32 влетает в dom0 на скорости impulse (м/с) —
  // бьёт на высоте 70 мм (центр шара над дорожкой)
  const ball = new CANNON.Body({ mass: 0.135, material: mFoot });
  ball.addShape(new CANNON.Sphere(0.016));
  ball.position.set(-0.06, 0.070 + 0.016, 0);
  ball.velocity.set(impulse, 0, 0);
  world.addBody(ball);

  const events = [];
  bodies.forEach(b => b.addEventListener("collide", e => {
    const other = e.body === b ? e.target : e.body;
    if (other === floor) return;
    const oi = other.__i;
    const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
    if (!events.find(x => x.to === oi && x.t > world.__t - 0.05))
      events.push({ t: world.__t, to: oi, v });
  }));

  let firstHit = {}, lastAngle = {};
  for (let i = 0; i < 2400; i++) {
    world.__t = i / 120;
    world.step(1 / 120);
  }
  // финальные углы
  const angs = bodies.map(b => {
    const u = b.quaternion.vmult(V(0, 1, 0));
    return Math.round(Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI);
  });
  return { angs, fell: angs.filter(a => a > 50).length };
}

const H = 0.088, T = 0.010, W = 0.044;
const grid = [];
for (const step of [0.035, 0.044])
  for (const impulse of [0.8, 1.2, 2.0])
    for (const iters of [60])
      grid.push({ step, frFoot: 0.1, restFace: 0.35, iters, domH: H, domT: T, domW: W, impulse });

console.log("step  imp  iters  →  углы (упало/5)");
for (const g of grid) {
  const r = bench(g);
  console.log(`${g.step.toFixed(3)}  ${String(g.impulse).padStart(2)}  ${String(g.iters).padStart(4)}  →  [${r.angs.join(",")}] fell=${r.fell}`);
}
