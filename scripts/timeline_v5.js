// Таймлайн v5: полная цепочка с контролем КАУЗАЛЬНОСТИ.
// Главные вопросы:
//  1) шарик② неподвижен до физического падения дом7 (событие dom7×ball2)?
//  2) темп волны настоящий (0.10-0.25 с/плашка), уклад естественный (70-90°)?
//  3) сколько длится каждая фаза, когда звон (цель 19-24 с)?
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine } = require("/home/z/my-project/site/machine.js");

const m = buildMachine(CANNON);

// трейс шарика②: если сместился > 1 мм ДО события dom7×ball2 — «сам катится»
let launch = null;                 // {t, v}
let driftBeforeLaunch = 0;
const home2 = m.byName.ball2.position.clone();
const fall1 = {}, fall2 = {};      // время первого падения каждой плашки (>50°)
let bellT = 0, ball1Rest = null;
let prev = null;

while (m.t < 60) {
  m.step(10);
  const p = m.probe();
  // события запуска
  if (!launch) {
    const ev = m.events.find(e => /dom7/.test(e.a + e.b) && /ball2/.test(e.a + e.b));
    if (ev) launch = { t: ev.t, v: ev.v };
  }
  if (launch && !prev) {
    // первый замер после запуска
  }
  // дрейф до запуска
  if (!launch) {
    const dx = Math.abs(m.byName.ball2.position.x - home2.x);
    driftBeforeLaunch = Math.max(driftBeforeLaunch, dx);
  }
  p.domAng1.forEach((a, i) => { if (a > 40 && fall1["d" + i] === undefined) fall1["d" + i] = +m.t.toFixed(2); });
  p.domAng2.forEach((a, i) => { if (a > 40 && fall2["d" + i] === undefined) fall2["d" + i] = +m.t.toFixed(2); });
  if (!ball1Rest && m.byName.ball.velocity.length() < 0.03 && m.t > 2) ball1Rest = +m.t.toFixed(1);
  if (p.bellHits > 0 && !bellT) bellT = p.firstBellT;
  if (p.bellHits > 0 && m.t - bellT > 1.2) break;   // звон + 1.2с на укладку
  prev = p;
}
const p = m.probe();
const pace1 = fall1.d0 !== undefined && fall1.d7 !== undefined ? (fall1.d7 - fall1.d0) / 7 : null;
const first2 = fall2.d0, last2 = fall2["d" + (m.P.domN2 - 1)];
const pace2 = first2 !== undefined && last2 !== undefined ? (last2 - first2) / (m.P.domN2 - 1) : null;

console.log("=== ЗАПУСК ШАРИКА② (каузальность) ===");
console.log("событие dom7×ball2:", launch ? `t=${launch.t} v=${launch.v}` : "ОТСУТСТВУЕТ",
  "| дрейф до запуска:", driftBeforeLaunch.toFixed(4), "м",
  (driftBeforeLaunch < 0.001 ? "  ✓ НЕ двигался сам" : "  ✗ САМ КАТИТСЯ"));
console.log("шарик② после запуска: x=%.3f (было %.3f), v=%.2f",
  m.byName.ball2.position.x.toFixed(3), home2.x, m.byName.ball2.velocity.length().toFixed(2));

console.log("\n=== ФАЗЫ ===");
const ph = (label, o) => console.log(`  ${label.padEnd(34)} ${o ? "t=" + o.t + " v=" + o.v : "—"}`);
const ev = re => m.events.find(e => re.test(e.a + "×" + e.b) && e.v > 0.02);
console.log("  шар① → дом0 (старт волны①):     ", (ev(/ball×dom0/) || {}).t);
console.log("  дом7 упал (d7>50°):              ", fall1.d7);
console.log("  дом7 → шарик② (запуск):         ", launch ? launch.t + " v=" + launch.v : "—");
const ch = ev(/ball2×chute(Head|Body)Floor|chute(Head|Body)Floor×ball2/);
console.log("  шарик② на жёлобе (голова/тело):   ", ch ? ch.t + " v=" + ch.v : "—");
const d8 = ev(/ball2×dom8|dom8×ball2/);
console.log("  шарик② → дом8 (старт волны②):   ", d8 ? d8.t + " v=" + d8.v : "—");
const bl = m.events.find(e => /bell/.test(e.a + "×" + e.b) && !/post/.test(e.a + "×" + e.b) && e.v > 0.15);
console.log("  🔔 ЗВОНА (удар по колоколу):     ", bl ? bl.t + " v=" + bl.v : "—");

console.log("\n=== ТЕМП И УКЛАД ===");
console.log("волна① падения:", JSON.stringify(fall1), "→ темп", pace1 ? pace1.toFixed(2) + " с/шт" : "—");
console.log("волна② падения (первая/посл):", first2, "/", last2, "→ темп", pace2 ? pace2.toFixed(2) + " с/шт" : "—");
console.log("уклад① (углы):", p.domAng1.join(","));
console.log("уклад② (углы):", p.domAng2.join(","));
console.log("шар① остановился:", ball1Rest, "на x=" + m.byName.ball.position.x.toFixed(3),
  "(мяч не доехал до шарика②=" + home2.x.toFixed(3) + ":", m.byName.ball.position.x < home2.x - 0.02 ? "✓" : "✗ ПЕРЕЕХАЛ)");
console.log("шарик② финал:", m.byName.ball2.position.toArray().map(v => v.toFixed(3)).join(","));
console.log("ЗВОНА:", p.bellHits ? `t=${p.firstBellT}` : "НЕТ", "| финальный t=" + p.t, "| sane=" + p.sane);
console.log("\nСОБЫТИЯ (все, v>0.1):");
for (const e of m.events) if (e.v > 0.1) console.log("  ", e.t.toFixed(2), e.a + "×" + e.b, "v" + e.v);
