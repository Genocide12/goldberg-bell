// Headless-прогон физики машины v4 (cannon-es в Node, без браузера).
// Полная цепочка ~28с: горка → волна① 8 → молот① → шарик② → жёлоб 2.26 м →
// волна② 10 → молот② → колокол.
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine } = require("/home/z/my-project/site/machine.js");

const RUNS = +(process.env.RUNS || 1);
const TEND = +(process.env.TEND || 40);
// мост-детектор: плашка, зависшая на 20-60° в конце прогона = «не упала»
// мост = плашка, зависшая НАД укладом (20-55°); 56-90° — нормальный нахлёст плотной волны (шаг 0.4h)
const bridges = arr => arr.filter(a => a >= 20 && a <= 55).length;

function oneRun(r) {
  const m = buildMachine(CANNON);
  let lastP = 0;
  while (m.t < TEND) {
    m.step(10);
    const p = m.probe();
    if (!lastP || p.t - lastP >= 2) {
      lastP = p.t;
      console.log(`  t=${String(p.t.toFixed(0)).padStart(3)} ①${p.domFallen1}/${m.P.domN1} mal①${p.mallet1Deg}°  b2(${p.ball2.p.map(v=>v.toFixed(2))}) v${p.ball2.v}  ②${p.domFallen2}/${m.P.domN2} mal②${p.mallet2Deg}° 🔔×${p.bellHits}`);
    }
    if (p.bellHits > 0) break;
  }
  const p = m.probe();
  const last1 = "dom" + (m.P.domN1 - 1), last2 = "dom" + (m.P.domN1 + m.P.domN2 - 1);
  const find = re => m.events.find(e => re.test(e.a + "×" + e.b) && e.v > 0.02);
  const phM1 = find(new RegExp(`mallet1.*${last1}|${last1}.*mallet1`));
  const phB2 = find(/ball2.*mallet1|mallet1.*ball2/);
  const phCh = m.events.find(e => /ball2/.test(e.a + e.b) && /chuteFloor/.test(e.a + e.b) && e.v > 0.1);
  const phD8 = find(new RegExp(`ball2.*dom${m.P.domN1 + 0}|dom${m.P.domN1}.*ball2`));  // первая плашка волны② = dom8
  const phM2 = find(new RegExp(`mallet2.*${last2}|${last2}.*mallet2`));
  const phBell = m.events.find(e => /mallet2/.test(e.a + e.b) && /bell/.test(e.a + e.b) && e.v > 0.05);
  console.log("  фазы:",
    `дом(посл①)→молот① ${phM1 ? phM1.t + " v" + phM1.v : "—"};`,
    `молот①→шар② ${phB2 ? phB2.t + " v" + phB2.v : "—"};`,
    `шар②→жёлоб ${phCh ? phCh.t : "—"};`,
    `шар②→дом8 ${phD8 ? phD8.t + " v" + phD8.v : "—"};`,
    `дом(посл②)→молот② ${phM2 ? phM2.t + " v" + phM2.v : "—"};`,
    `🔔 ${phBell ? phBell.t + " v" + phBell.v : "—"}`);

  const ok = [];
  const ck = (name, cond, extra) => ok.push([name, !!cond, extra]);
  ck("волна① вся (8)", p.domFallen1 === m.P.domN1, p.domAng1.join(","));
  ck("волна② вся (26)", p.domFallen2 === m.P.domN2, p.domAng2.join(","));
  ck("молот① качнулся", !!phM1, "");
  ck("шарик② съехал с тумбы", phCh ? "съезд " + phCh.t : !!phB2, "");
  ck("шарик② влетел в волну②", !!phD8 && phD8.v > 0.5, phD8 ? "v=" + phD8.v : "нет");
  ck("молот② качнулся", !!phM2, "");
  ck("ЗВОНА", p.bellHits >= 1, "hits=" + p.bellHits);
  ck("звон в 18-28с", p.firstBellT > 18 && p.firstBellT < 28, "t=" + p.firstBellT);
  ck("без мостов① (20-60°)", bridges(p.domAng1) === 0, bridges(p.domAng1) + " шт");
  ck("без мостов② (20-60°)", bridges(p.domAng2) === 0, bridges(p.domAng2) + " шт");
  ck("сана", p.sane, "");
  const fails = ok.filter(x => !x[1]);
  console.log(`  run#${r}: ${ok.length - fails.length}/${ok.length}` + (fails.length ? "  FAIL: " + fails.map(f => f[0]).join("; ") : "  ALL OK"));
  return fails.length === 0;
}

let good = 0;
for (let r = 1; r <= RUNS; r++) { console.log(`\n===== прогон ${r} =====`); if (oneRun(r)) good++; }
console.log(`\nИТОГ: ${good}/${RUNS}`);
process.exit(good === RUNS ? 0 : 1);
