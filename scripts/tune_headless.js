// Headless-прогон физики машины (cannon-es в Node, без браузера).
// Печатает хореографию столкновений и зонды; оценивает цепочку.
const CANNON = require("cannon-es");
const { buildMachine } = require("/home/z/my-project/site/machine.js");

const RUNS = +(process.env.RUNS || 1);
const TEND = +(process.env.TEND || 12);

const byName4 = m => m.byName["dom4"].angularVelocity.length().toFixed(2);
function oneRun(r) {
  const m = buildMachine(CANNON);
  const seen = new Set();
  let lastP = null;
  while (m.t < TEND) {
    m.step(10);                       // 10 шагов пакета
    const p = m.probe();
    for (const e of m.events)
      if (!seen.has(e.t + e.a)) { seen.add(e.t + e.a); }
    if (m.t > 2 && m.t < 6 && Math.abs((lastP || 0) - p.t) >= 0.25) {
      console.log(`    dom3=${p.domAng[3]}° dom4=${p.domAng[4]}° dom5=${p.domAng[5]}° dom6=${p.domAng[6]}° w4=${byName4(m)}`);
    }
    if (!lastP || p.t - lastP >= 0.5) {
      lastP = p.t;
      console.log(`  t=${p.t.toFixed(1).padStart(5)} ball(${p.ball.p.map(v=>v.toFixed(2))}) v${p.ball.v}  dom>${50}:${p.domFallen}  mal${p.malletDeg}° bellTilt${p.bellTilt}°`);
    }
    if (p.allRest && p.t > 2) break;
  }
  const p = m.probe();
  console.log("  --- события (первые 40):");
  for (const e of m.events.slice(0, 120))
    if (e.a.startsWith("dom") || e.b.startsWith("dom") || e.a==="glass" || e.b==="glass") console.log(`    t=${e.t.toFixed(2).padStart(6)} ${e.a}×${e.b} v=${e.v}`);
  console.log("  --- финал:", JSON.stringify(p));
  // v3: молот качается от волны, голова бьёт колокол
  let domMallet = null, malletBell = null, maxMalletV = 0;
  for (const e of m.events) {
    const pr = [e.a, e.b].sort().join(",");
    if (!domMallet && e.v > 0.05 && pr.includes("mallet") && /dom[0-9]/.test(pr)) domMallet = e;
    if (pr === "bell,mallet") { if (!malletBell) malletBell = e; maxMalletV = Math.max(maxMalletV, e.v); }
  }
  console.log(`  фазы: волна→молот t=${domMallet ? domMallet.t : "-"} v=${domMallet ? domMallet.v : 0}; молот→колокол t=${malletBell ? malletBell.t : "-"} v=${malletBell ? malletBell.v : 0} (max ${maxMalletV})`);

  const ok = [];
  const ck = (name, cond, extra) => { ok.push([name, !!cond, extra]); };
  ck("волна 6/6", p.domFallen === m.P.domN, p.domAng.join(","));
  ck("волна качнула молот (v>0.05)", !!domMallet, domMallet ? `t=${domMallet.t} v=${domMallet.v}` : "нет");
  ck("молот бил в колокол", p.bellHits >= 1, "hits=" + p.bellHits);
  ck("первый удар по колоколу < 10с", p.firstBellT > 0 && p.firstBellT < 10, "t=" + p.firstBellT);
  ck("всё успокоилось", p.allRest, "");
  ck("сана", p.sane, "");
  const fails = ok.filter(x => !x[1]);
  console.log(`  run#${r}: ${ok.length - fails.length}/${ok.length}` + (fails.length ? "  FAIL: " + fails.map(f => f[0]).join("; ") : "  ALL OK"));
  return fails.length === 0;
}

let good = 0;
for (let r = 1; r <= RUNS; r++) { console.log(`\n===== прогон ${r} =====`); if (oneRun(r)) good++; }
console.log(`\nИТОГ: ${good}/${RUNS}`);
process.exit(good === RUNS ? 0 : 1);
