// Тест интерактивной модели без браузера: извлекаем <script> из index.html,
// исполняем в vm-песочнице со стабами DOM/canvas, гоним опыт и проверяем события.
// Запуск: node scripts/test_model.js
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync("/home/z/my-project/site/index.html", "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error("NO SCRIPT FOUND"); process.exit(2); }
const src = m[1];

// ---- стабы DOM ----
function elStub() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    textContent: "", className: "", innerHTML: "",
    appendChild() { return this; },
    querySelector() { return { addEventListener() {}, value: 1, textContent: "" }; },
    addEventListener() {}, onclick: null,
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
  };
}
const cvStub = {
  width: 0, height: 0, className: "",
  getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
  addEventListener() {}, setPointerCapture() {},
  getContext: () => new Proxy({}, {
    get(t, p) {
      if (p === "createLinearGradient" || p === "createRadialGradient")
        return () => ({ addColorStop() {} });
      if (p === "canvas") return cvStub;
      return () => {};
    },
    set() { return true; },
  }),
};
const els = {};
const document = {
  getElementById(id) { return els[id] || (els[id] = id === "cv" ? cvStub : elStub()); },
  createElement() { return elStub(); },
};

const sandbox = {
  console, Math, JSON, Date,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  addEventListener() {}, location: { search: "" },
  devicePixelRatio: 1, navigator: {},
  document,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// ---- тестовый код, исполняется в том же скоупе, что и модель ----
const TEST = `
;(function () {
  reset();
  const N = Math.round(14 / DT); // 14 симуляционных секунд
  const log = [];
  let peakBell = 0, events = [];
  for (let i = 0; i < N; i++) {
    substep(DT);
    peakBell = Math.max(peakBell, Math.abs(bell.angle));
    if (i % 240 === 0)
      log.push("t=" + (i * DT).toFixed(1).padStart(5) +
        " b1x=" + ball1.pos.x.toFixed(2).padStart(6) +
        " b2x=" + ball2.pos.x.toFixed(2).padStart(6) +
        " b2z=" + ball2.pos.z.toFixed(2).padStart(6) +
        " bell=" + (bell.angle * 180 / Math.PI).toFixed(1).padStart(7) + "°" +
        " rings=" + ringCount + " dom=" + dominoFell.size +
        " ham=" + (hammer.angle * 180 / Math.PI).toFixed(1) + "°");
  }
  const F = {
    log,
    dominoes: dominoFell.size,
    rings: ringCount,
    peakBellDeg: peakBell * 180 / Math.PI,
    bellFinalDeg: bell.angle * 180 / Math.PI,
    hammerFinalDeg: hammer.angle * 180 / Math.PI,
    strikerLDeg: strikerL.angle * 180 / Math.PI,
    strikerRDeg: strikerR.angle * 180 / Math.PI,
    ball1: { x: +ball1.pos.x.toFixed(3), z: +ball1.pos.z.toFixed(3) },
    ball2: { x: +ball2.pos.x.toFixed(3), z: +ball2.pos.z.toFixed(3) },
    energy: +(0.5 * ball1.mass * (ball1.vel.x ** 2 + ball1.vel.z ** 2)).toFixed(4),
  };
  // деградация: тела не улетели и не провалились
  F.sane = bodies.filter(b => !b.isStatic).every(b =>
    b.pos.x > -3 && b.pos.x < 12 && b.pos.z > -3 && b.pos.z < 8) &&
    [ball1, ball2, hammer, bell, strikerL, strikerR].every(b =>
      Number.isFinite(b.pos.x) && Number.isFinite(b.pos.z) && Number.isFinite(b.angle));
  window.__R = F;
})();
`;

try {
  vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
} catch (e) {
  console.error("SCRIPT ERROR:", e.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

const R = sandbox.__R;
console.log(R.log.join("\n"));
console.log("RESULT", JSON.stringify(
  { dominoes: R.dominoes, rings: R.rings, peakBellDeg: +R.peakBellDeg.toFixed(1),
    bellFinalDeg: +R.bellFinalDeg.toFixed(1), hammerFinalDeg: +R.hammerFinalDeg.toFixed(1),
    strikerLDeg: +R.strikerLDeg.toFixed(1), strikerRDeg: +R.strikerRDeg.toFixed(1),
    ball1: R.ball1, ball2: R.ball2, energy: R.energy, sane: R.sane }, null, 1));

// ---- проверки ----
const ok = [], fail = [];
const check = (name, cond, got) => (cond ? ok : fail).push(
  `${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : " — " + JSON.stringify(got)}`);
check("все 8 домино упали", R.dominoes === 8, R.dominoes);
check("колокол зазвонил (rings>0)", R.rings > 0, R.rings);
check("шар1 остановился у домино на столе",
  R.ball1.x > 1.30 && R.ball1.x < 2.63 && R.ball1.z > 0.90 && R.ball1.z < 1.05, R.ball1);
check("шар2 лежит на полу в зоне машины (x 3.2..5.6)",
  R.ball2.x > 3.2 && R.ball2.x < 5.6 && R.ball2.z < 0.12, R.ball2);
check("шар2 приземлился (z<0.4)", R.ball2.z < 0.4, R.ball2);
check("амплитуда колокола 12..65°", R.peakBellDeg > 12 && R.peakBellDeg < 65, R.peakBellDeg);
check("молоток успокоился (<35°)", Math.abs(R.hammerFinalDeg) < 35, R.hammerFinalDeg);
check("колокол успокоился (<25°)", Math.abs(R.bellFinalDeg) < 25, R.bellFinalDeg);
check("страйкеры на нити (<60°)", Math.abs(R.strikerLDeg) < 60 && Math.abs(R.strikerRDeg) < 60,
  [R.strikerLDeg, R.strikerRDeg]);
check("система сана (ничего не улетело)", R.sane, R.sane);
check("шары не дрожат (E<0.05)", R.energy < 0.05, R.energy);

console.log("\n" + ok.join("\n"));
if (fail.length) { console.log("\n" + fail.join("\n")); process.exit(1); }
console.log("\nALL " + ok.length + " CHECKS PASSED");
