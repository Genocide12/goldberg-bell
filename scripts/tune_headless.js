// Headless-прогон физики машины v5 (cannon-es в Node, без браузера).
// Цепочка ~15с: горка → волна① 8 (0.12с/плашка) → кончик дом7 хлещет
// шарик② с пьедестала → жёлоб (8°+0.4°) → волна② 46 → кончик дом53
// хлещет колокол. Останов: звон + 1.2с (хвост после звона не оцениваем).
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine } = require("/home/z/my-project/site/machine.js");

const RUNS = +(process.env.RUNS || 1);
const TEND = +(process.env.TEND || 40);
// мост-детектор: плашка, зависшая на 20-60° в конце прогона = «не упала»
// мост = плашка, зависшая НАД укладом (20-55°); 56-90° — нормальный нахлёст плотной волны (шаг 0.4h)
const bridges = arr => arr.filter(a => a >= 15 && a <= 40).length;   // 41-90 = улёгся

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
    if (p.bellHits > 0 && p.t - p.firstBellT > 1.2) break;   // звон + 1.2с
  }
  const p = m.probe();
  const last1 = "dom" + (m.P.domN1 - 1), last2 = "dom" + (m.P.domN1 + m.P.domN2 - 1);
  const find = re => m.events.find(e => re.test(e.a + "×" + e.b) && e.v > 0.02);
  const phB2 = find(new RegExp(`${last1}.*ball2|ball2.*${last1}`));          // кончик дом7 → шарик②
  const phCh = m.events.find(e => /ball2/.test(e.a + e.b) && /chute(Head|Body)Floor/.test(e.a + e.b) && e.v > 0.1);
  const phD8 = find(new RegExp(`ball2.*dom${m.P.domN1}|dom${m.P.domN1}.*ball2`));  // первая плашка волны② = dom8
  const phBell = m.events.find(e => /bell/.test(e.a + e.b) && !/post/.test(e.a + e.b) && e.v > 0.25);
  console.log("  фазы:",
    `дом7→шар② (запуск) ${phB2 ? phB2.t + " v" + phB2.v : "—"};`,
    `шар②→жёлоб ${phCh ? phCh.t : "—"};`,
    `шар②→дом8 ${phD8 ? phD8.t + " v" + phD8.v : "—"};`,
    `🔔 ${phBell ? phBell.t + " v" + phBell.v : "—"}`);

  const ok = [];
  const ck = (name, cond, extra) => ok.push([name, !!cond, extra]);
  ck("волна① вся (8)", p.domFallen1 === m.P.domN1, p.domAng1.join(","));
  ck("волна② вся (46)", p.domFallen2 === m.P.domN2, p.domAng2.join(","));
  ck("запуск: дом7 хлестнул шарик②", !!phB2 && phB2.v > 0.4, phB2 ? "v=" + phB2.v : "нет");
  ck("шарик② дошёл до волны②", !!phD8 && phD8.v > 0.4, phD8 ? "v=" + phD8.v : "нет");
  ck("ЗВОНА", p.bellHits >= 1, "hits=" + p.bellHits);
  ck("звон в 13-18с", p.firstBellT > 13 && p.firstBellT < 18, "t=" + p.firstBellT);
  ck("звон чёткий (v>0.25)", !!phBell, phBell ? "v=" + phBell.v : "слабый");
  ck("без мостов① (15-40°)", bridges(p.domAng1) === 0, bridges(p.domAng1) + " шт");
  ck("без мостов② (15-40°)", bridges(p.domAng2.slice(0, -1)) === 0, bridges(p.domAng2) + " шт (посл — драп)");
  ck("сана", p.sane, "");
  const fails = ok.filter(x => !x[1]);
  console.log(`  run#${r}: ${ok.length - fails.length}/${ok.length}` + (fails.length ? "  FAIL: " + fails.map(f => f[0]).join("; ") : "  ALL OK"));
  return fails.length === 0;
}

let good = 0;
for (let r = 1; r <= RUNS; r++) { console.log(`\n===== прогон ${r} =====`); if (oneRun(r)) good++; }
console.log(`\nИТОГ: ${good}/${RUNS}`);
process.exit(good === RUNS ? 0 : 1);
