// Бенчмарки v4: три неизвестных звена длинной цепочки.
// 1) живучесть волны: сколько плашек проходит волна от удара шаром (1.2 м/с);
// 2) медленный разгон: время стального Ø32 по склону (5-10°), длина 0.5-1.0 м;
// 3) молот→шар: голова 8.5 г на 0.34 м/с бьёт стальной Ø20 (33 г) — скорость шара.
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const V = (x, y, z) => new CANNON.Vec3(x, y, z);

function world60() {
  const world = new CANNON.World({ gravity: V(0, -9.81, 0) });
  world.solver.iterations = 60;
  return world;
}
function matPair(world, fr, rest) {
  const a = new CANNON.Material("a"), b = new CANNON.Material("b");
  world.addContactMaterial(new CANNON.ContactMaterial(a, b, { friction: fr, restitution: rest }));
  return [a, b];
}
const tiltOf = b => {
  const u = b.quaternion.vmult(V(0, 1, 0));
  return Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI;
};

/* ---------- 1) волна N плашек от удара шаром ---------- */
function waveBench(N, step) {
  const world = world60();
  const [domM] = matPair(world, 0.10, 0.35);
  const [footM] = matPair(world, 0.80, 0.10);
  const [steelDom] = matPair(world, 0.25, 0.30);
  const floorM = new CANNON.Material("f");
  world.addContactMaterial(new CANNON.ContactMaterial(domM, floorM, { friction: 0.8, restitution: 0.1 }));
  const floor = new CANNON.Body({ mass: 0, material: floorM });
  floor.addShape(new CANNON.Box(V(2, 0.05, 0.3))); floor.position.set(1, -0.05, 0);
  world.addBody(floor);
  const doms = [];
  for (let i = 0; i < N; i++) {
    const b = new CANNON.Body({ mass: 0.010 * 0.088 * 0.044 * 600, material: domM,
      angularDamping: 0.02, linearDamping: 0.005 });
    b.addShape(new CANNON.Box(V(0.005, 0.044, 0.022)));
    b.position.set(i * step, 0.044, 0);
    world.addBody(b); doms.push(b);
  }
  const ball = new CANNON.Body({ mass: 0.135, material: steelDom, angularDamping: 0.10 });
  ball.addShape(new CANNON.Sphere(0.016));
  ball.position.set(-0.05, 0.07 + 0.016, 0);
  ball.velocity.set(1.2, 0, 0);
  world.addBody(ball);
  let lastFall = 0;
  for (let i = 0; i < 120 * 30; i++) {
    world.step(1 / 120);
    const fell = doms.filter(d => tiltOf(d) > 50).length;
    if (fell > 0 && (i / 120) - lastFall > 0.01) lastFall = i / 120;
    if (fell === N) break;
  }
  const fell = doms.filter(d => tiltOf(d) > 50).length;
  return { fell, N, lastFall: +lastFall.toFixed(2) };
}

/* ---------- 2) разгон шара по склону ---------- */
function rollBench(deg, len) {
  const world = world60();
  const [steelW] = matPair(world, 0.32, 0.20);
  const a = deg * Math.PI / 180;
  const board = new CANNON.Body({ mass: 0, material: steelW });
  board.addShape(new CANNON.Box(V(len / 2 + 0.05, 0.006, 0.09)));
  // центр доски: середина отрезка [0,len] на линии, опущенной на полтолщины по нормали
  const nl = { x: Math.sin(a), y: Math.cos(a) };            // нормаль вверх от склона
  const cx = len / 2, cy = len / 2 * Math.tan(a);
  board.position.set(cx - nl.x * 0.003, cy - nl.y * 0.003, 0);
  board.quaternion.setFromAxisAngle(V(0, 0, 1), -a);
  world.addBody(board);
  const ball = new CANNON.Body({ mass: 0.135, material: steelW, angularDamping: 0.10 });
  ball.addShape(new CANNON.Sphere(0.016));
  ball.position.set(0.03, (len - 0.03) * Math.tan(a) + 0.016 / Math.cos(a), 0);
  world.addBody(ball);
  let t = 0;
  for (let i = 0; i < 120 * 40; i++) {
    world.step(1 / 120); t = i / 120;
    if (ball.position.x >= len) break;
  }
  return { deg, len, t: +t.toFixed(2), v: +ball.velocity.length().toFixed(2) };
}

/* ---------- 3) молот → шар ---------- */
function malletBallBench(headV) {
  const world = world60();
  const [w] = matPair(world, 0.45, 0.22);
  const [steelW] = matPair(world, 0.32, 0.20);
  const [steelWood] = matPair(world, 0.32, 0.20);
  const anchor = new CANNON.Body({ mass: 0 }); anchor.position.set(0, 0.54, 0);
  world.addBody(anchor);
  const mallet = new CANNON.Body({ mass: 0.0085, material: w, angularDamping: 0.02 });
  mallet.addShape(new CANNON.Box(V(0.008, 0.21, 0.003)), V(0, -0.21, 0));
  mallet.addShape(new CANNON.Box(V(0.008, 0.008, 0.025)), V(0, -0.42, 0));
  mallet.position.set(0, 0.54, 0);
  world.addBody(mallet);
  world.addConstraint(new CANNON.HingeConstraint(anchor, mallet, {
    pivotA: V(0, 0, 0), axisA: V(0, 0, 1), pivotB: V(0, 0, 0), axisB: V(0, 0, 1) }));
  // шар на тумбе в точке дуги 16° (голова при взмахе проходит здесь)
  const th = 16 * Math.PI / 180;
  const hx = 0.42 * Math.sin(th), hy = 0.54 - 0.42 * Math.cos(th);
  const tee = new CANNON.Body({ mass: 0, material: steelWood });
  tee.addShape(new CANNON.Box(V(0.006, 0.012, 0.006)));
  tee.position.set(hx + 0.010 + 0.008 + 0.004, hy - 0.010 - 0.012 - 0.004, 0);
  world.addBody(tee);
  const ball = new CANNON.Body({ mass: 0.033, material: steelW, angularDamping: 0.10 });
  ball.addShape(new CANNON.Sphere(0.010));
  ball.position.set(hx + 0.010 + 0.008 + 0.004, hy, 0);
  world.addBody(ball);
  let hit = null, peakV = 0;
  ball.addEventListener("collide", e => {
    if (e.body === tee || e.target === tee) return;
    if (!hit) hit = { v: +Math.abs(e.contact.getImpactVelocityAlongNormal()).toFixed(2) };
  });
  mallet.angularVelocity.set(0, 0, -headV);   // замах из вертикали
  for (let i = 0; i < 120 * 5; i++) {
    world.step(1 / 120);
    peakV = Math.max(peakV, ball.velocity.length());
    if (hit && ball.position.x > 0.3) break;
  }
  return { headV, hitV: hit ? hit.v : 0, ballV: +peakV.toFixed(2) };
}

console.log("== 3) молот→шар: скорость шара после удара ==");
for (const hv of [0.8, 1.2, 2.0])
  console.log("  ", JSON.stringify(malletBallBench(hv)));
