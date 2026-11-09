// Автотест физики без браузера: извлекаем <script> из index.html,
// исполняем в vm-песочнице со стабами DOM, гоним опыт и проверяем цепочку.
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("/home/z/my-project/site/index.html", "utf8");
const src = html.match(/<script>([\s\S]*)<\/script>/)[1];

function elStub() {
  return { classList: { add() {}, remove() {}, toggle() {} }, textContent: "", className: "",
    innerHTML: "", appendChild() { return this; },
    querySelector() { return { addEventListener() {}, value: 1, textContent: "" }; },
    addEventListener() {}, onclick: null,
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }) };
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
  getElementById(id) { if (!els[id]) els[id] = (id === "cv") ? cvStub : elStub(); return els[id]; },
  createElement() { return elStub(); },
};
const sandbox = {
  console, Math, JSON, Date,
  performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
  setTimeout: () => 0, setInterval: () => 0, clearInterval() {},
  addEventListener() {}, location: { search: "" },
  devicePixelRatio: 1, navigator: {}, document,
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const TEST = `
;(function () {
  reset();
  const N = Math.round(16 / DT);
  const log = [];
  let peakBell = 0;
  for (let i = 0; i < N; i++) {
    substep(DT);
    peakBell = Math.max(peakBell, Math.abs(bell.angle));
    if (i % 240 === 0)
      log.push("t=" + (i * DT).toFixed(1).padStart(5) +
        " ball=" + ball.pos.x.toFixed(2).padStart(6) + "," + ball.pos.z.toFixed(2).padStart(6) +
        " marble=" + marble.pos.x.toFixed(2).padStart(6) + "," + marble.pos.z.toFixed(2).padStart(6) +
        " vmar=" + len(marble.vel).toFixed(2).padStart(5) +
        " mall=" + (mallet.angle * 180 / Math.PI).toFixed(1).padStart(7) + "°" +
        " bell=" + (bell.angle * 180 / Math.PI).toFixed(1).padStart(7) + "°" +
        " rings=" + ringCount + " dom=" + dominoFell.size);
  }
  const F = {
    log, dominoes: dominoFell.size, rings: ringCount,
    peakBellDeg: peakBell * 180 / Math.PI,
    bellFinalDeg: bell.angle * 180 / Math.PI, bellAV: bell.angVel,
    malletFinalDeg: mallet.angle * 180 / Math.PI, malletAV: mallet.angVel,
    strikerLDeg: strikerL.angle * 180 / Math.PI, strikerRDeg: strikerR.angle * 180 / Math.PI,
    ball: { x: +ball.pos.x.toFixed(3), z: +ball.pos.z.toFixed(3) },
    marble: { x: +marble.pos.x.toFixed(3), z: +marble.pos.z.toFixed(3) },
    ballKE: +(0.5 * ball.mass * (ball.vel.x ** 2 + ball.vel.z ** 2)).toFixed(4),
    sane: bodies.filter(b => !b.isStatic).every(b =>
      b.pos.x > -3 && b.pos.x < 12 && b.pos.z > -3 && b.pos.z < 8 &&
      Number.isFinite(b.pos.x) && Number.isFinite(b.angle) && Number.isFinite(b.angVel)),
  };
  window.__R = F;
})();
`;

try { vm.runInContext(src + TEST, sandbox, { filename: "model.js" }); }
catch (e) { console.error("SCRIPT ERROR:", e.stack.split("\n").slice(0, 6).join("\n")); process.exit(1); }

const R = sandbox.__R;
console.log(R.log.join("\n"));
console.log("RESULT", JSON.stringify({
  dominoes: R.dominoes, rings: R.rings, peakBellDeg: +R.peakBellDeg.toFixed(1),
  bellFinalDeg: +R.bellFinalDeg.toFixed(1), bellAV: +R.bellAV.toFixed(3),
  malletFinalDeg: +R.malletFinalDeg.toFixed(1), malletAV: +R.malletAV.toFixed(3),
  strikers: [ +R.strikerLDeg.toFixed(1), +R.strikerRDeg.toFixed(1) ],
  ball: R.ball, marble: R.marble, ballKE: R.ballKE, sane: R.sane,
}, null, 1));

const ok = [], fail = [];
const check = (name, cond, got) => (cond ? ok : fail).push(
  `${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : " — " + JSON.stringify(got)}`);
check("все 8 домино упали", R.dominoes === 8, R.dominoes);
check("колокол зазвонил (rings>0)", R.rings > 0, R.rings);
check("стальной шар остался на столе (x 0.9..1.9)", R.ball.x > 0.9 && R.ball.x < 1.9, R.ball);
check("стальной шар на высоте стола (z .56...70)", R.ball.z > 0.56 && R.ball.z < 0.70, R.ball);
check("стальной шар остановился (KE<0.05)", R.ballKE < 0.05, R.ballKE);
check("шарик ушёл со стола (x>1.9 или на полу)", R.marble.x > 1.9 || R.marble.z < 0.45, R.marble);
check("шарик не улетел (x<6)", R.marble.x < 6 && R.marble.z > -0.5, R.marble);
check("амплитуда колокола 8..90°", R.peakBellDeg > 8 && R.peakBellDeg < 90, R.peakBellDeg);
check("колокол успокоился (<30°, AV<0.4)", Math.abs(R.bellFinalDeg) < 30 && Math.abs(R.bellAV) < 0.4,
  [R.bellFinalDeg, R.bellAV]);
check("молоток успокоился (<80°, AV<0.6)", Math.abs(R.malletFinalDeg) < 80 && Math.abs(R.malletAV) < 0.6,
  [R.malletFinalDeg, R.malletAV]);
check("страйкеры на нитях (<60°)", Math.abs(R.strikerLDeg) < 60 && Math.abs(R.strikerRDeg) < 60, [R.strikerLDeg, R.strikerRDeg]);
check("система сана", R.sane, R.sane);

console.log("\n" + ok.join("\n"));
if (fail.length) { console.log("\n" + fail.join("\n")); process.exit(1); }
console.log("\nALL " + ok.length + " CHECKS PASSED");
