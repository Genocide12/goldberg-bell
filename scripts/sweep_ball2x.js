// Свип позиции шарика② относительно грани дом7 (запуск последним домино).
// Грань дом7 на x=1.217; шарик на X мм от грани. Ищем: чистый вылет
// (v>0.15 сразу и свободный прокат), без wedge-зажима и без выброса.
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine, P } = require("/home/z/my-project/site/machine.js");

function run(ball2X) {
  P.ball2X = ball2X;                 // патч до buildMachine (P читается при сборке)
  const m = buildMachine(CANNON);
  let launch = null;
  const samples = [];
  let t = 0;
  while (t < 26) {
    m.step(10);
    t = m.t;
    if (!launch) {
      const ev = m.events.find(e => /dom7/.test(e.a + e.b) && /ball2/.test(e.a + e.b) && e.v > 0.05);
      if (ev) launch = ev;
    }
    for (const tm of [2.5, 5, 8, 12, 20])
      if (t >= tm && !samples.some(s => s.tm === tm))
        samples.push({ tm, x: +m.byName.ball2.position.x.toFixed(2), y: +m.byName.ball2.position.y.toFixed(2),
          z: +m.byName.ball2.position.z.toFixed(3), v: +m.byName.ball2.velocity.length().toFixed(2) });
    const p = m.probe();
    if (p.bellHits > 0 && t - p.firstBellT > 1) break;
  }
  const p = m.probe();
  const d7 = m.byName.dom7, b2 = m.byName.ball2;
  const a7 = (() => { const u = d7.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    return +(Math.acos(Math.max(-1, Math.min(1, u.y))) * 180 / Math.PI).toFixed(0); })();
  return {
    launch: launch ? `t=${launch.t} v=${launch.v}` : "НЕТ",
    t25: samples.find(s => s.tm === 2.5), t5: samples.find(s => s.tm === 5),
    t8: samples.find(s => s.tm === 8), t20: samples.find(s => s.tm === 20),
    final: `x=${b2.position.x.toFixed(2)} y=${b2.position.y.toFixed(2)} z=${b2.position.z.toFixed(2)} v=${b2.velocity.length().toFixed(2)}`,
    dom7: a7 + "°",
    bell: p.bellHits ? `t=${p.firstBellT}` : "—",
  };
}

// Грань дом7 = 1.217. Свип X мм от грани.
for (const mm of [16, 20, 24, 28, 32, 36, 40, 48]) {
  const x = +(1.217 + mm / 1000).toFixed(3);
  console.log(`\nball2X=${x} (+${mm}мм от грани):`);
  console.log("  ", JSON.stringify(run(x)));
}
