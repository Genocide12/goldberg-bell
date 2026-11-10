// Каскад-стенд: 10 домино (как в машине 8×60×28@700) + триггер-шар.
// Перебор: шаг (0.40-0.65h), e dom-dom, μ dom-dom. Меряем темп и уклад.
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const V = (x, y, z) => new CANNON.Vec3(x, y, z);

function cascade(pitch, eDD, muDD, muSole, eSole, triggerV, muWD = 0.30) {
  const world = new CANNON.World({ gravity: V(0, -9.81, 0) });
  world.solver.iterations = 60;
  const eq = { contactEquationStiffness: 1e8, contactEquationRelaxation: 2 };
  const dom = new CANNON.Material("d"), wood = new CANNON.Material("w");
  world.addContactMaterial(new CANNON.ContactMaterial(dom, dom, { friction: muDD, restitution: eDD, ...eq }));
  world.addContactMaterial(new CANNON.ContactMaterial(dom, wood, { friction: muSole, restitution: eSole, ...eq }));
  world.addContactMaterial(new CANNON.ContactMaterial(wood, dom, { friction: muWD, restitution: 0.05, ...eq }));
  world.addContactMaterial(new CANNON.ContactMaterial(wood, wood, { friction: 0.45, restitution: 0.22, ...eq }));
  // пол-ярус
  const run = new CANNON.Body({ mass: 0, material: wood });
  run.addShape(new CANNON.Box(V(0.8, 0.04, 0.1))); run.position.set(0.5, -0.04, 0);
  world.addBody(run);
  // 10 домино 8×60×28
  const h = 0.060, t = 0.008, w = 0.028, dens = 700;
  const doms = [];
  for (let i = 0; i < 10; i++) {
    const b = new CANNON.Body({ mass: t * h * w * dens, material: dom, angularDamping: 0.02, linearDamping: 0.005 });
    b.addShape(new CANNON.Box(V(t / 2, h / 2, w / 2)));
    b.position.set(0.4 + i * pitch, 0.04 + h / 2, 0);
    world.addBody(b); doms.push(b);
  }
  // триггер: шар Ø24 орех 5 г, влёт 1.2 м/с (как с горки)
  const ball = new CANNON.Body({ mass: 4 / 3 * Math.PI * 0.012 ** 3 * 700, material: wood, angularDamping: 0.10 });
  ball.addShape(new CANNON.Sphere(0.012));
  ball.position.set(0.4 - 0.05, 0.04 + 0.012, 0);
  ball.velocity.set(triggerV, 0, 0);
  world.addBody(ball);
  const fall = new Array(10).fill(null);
  const tilt = b => {
    const u = b.quaternion.vmult(V(0, 1, 0));
    return Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI;
  };
  for (let i = 0; i < 120 * 15; i++) {
    world.step(1 / 120);
    doms.forEach((b, k) => { if (fall[k] === null && tilt(b) > 50) fall[k] = i / 120; });
    if (fall[9] !== null && i / 120 - fall[9] > 1.5) break;
  }
  const angles = doms.map(b => +tilt(b).toFixed(0));
  const pace = fall[0] !== null && fall[9] !== null ? +( (fall[9] - fall[0]) / 9).toFixed(2) : null;
  const stuck = angles.filter(a => a >= 20 && a <= 55).length;
  return { pace, first: fall[0] === null ? null : +fall[0].toFixed(2),
           last: fall[9] === null ? null : +fall[9].toFixed(2),
           falls: fall.map(f => f === null ? null : +f.toFixed(2)).join(" "),
           angles: angles.join(","), stuck,
           ballRest: +ball.position.x.toFixed(3) };
}

const h = 0.060;
for (const [tag, pitch, eDD, muDD, muWD] of [
  ["0.65h e.02 μ.10 шарμ.30", 0.039, 0.02, 0.10, 0.30],  // как в машине сейчас
  ["0.65h e.02 μ.03 шарμ.30", 0.039, 0.02, 0.03, 0.30],
  ["0.65h e.02 μ.01 шарμ.30", 0.039, 0.02, 0.01, 0.30],
  ["0.65h e.12 μ.01 шарμ.30", 0.039, 0.12, 0.01, 0.30],
  ["0.65h e.02 μ.03 шарμ.10", 0.039, 0.02, 0.03, 0.10],
  ["0.65h e.02 μ.01 шарμ.10", 0.039, 0.02, 0.01, 0.10],
  ["0.55h e.02 μ.01 шарμ.10", 0.033, 0.02, 0.01, 0.10],
  ["0.55h e.12 μ.01 шарμ.10", 0.033, 0.12, 0.01, 0.10],
])
  console.log("\n" + tag.padEnd(22), JSON.stringify(cascade(pitch, eDD, muDD, 0.80, 0.01, 1.2, muWD)));
