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
const cvStub = { width: 0, height: 0, className: "",
  getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0 }),
  addEventListener() {}, setPointerCapture() {},
  getContext: () => new Proxy({}, { get(t, p) {
    if (p === "createLinearGradient" || p === "createRadialGradient") return () => ({ addColorStop() {} });
    if (p === "canvas") return cvStub; return () => {}; }, set: () => true }) };
const els = {};
const document = { getElementById(id) { if (!els[id]) els[id] = (id === "cv") ? cvStub : elStub(); return els[id]; },
  createElement() { return elStub(); } };
const sandbox = { console, Math, JSON, Date, performance: { now: () => Date.now() },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => {}, setTimeout: () => 0,
  setInterval: () => 0, clearInterval() {}, addEventListener() {}, location: { search: "" },
  devicePixelRatio: 1, navigator: {}, document };
sandbox.window = sandbox;
vm.createContext(sandbox);
const TEST = `
;(function(){
  reset();
  let hits = 0;
  for (let s = 0; s < 600; s++) {
    substep(DT);
    for (const c of contacts) {
      const pair = c.a.name + "/" + c.b.name;
      if (pair.includes("dom0") && hits < 5) {
        hits++;
        console.log("КОНТАКТ", pair, "шаг", s, "vn0", +c.vn0.toFixed(3), "e", c.e,
          "n", JSON.stringify(c.n), "mu", +c.mu.toFixed(2),
          "pts", c.pts.map(p => ({ z: +p.z.toFixed(4), sep: +p.sep.toFixed(5), jn: +(+p.jn).toFixed(4) })),
          "dom0 angVel", +dominoes[0].angVel.toFixed(3), "angle", +(dominoes[0].angle*180/Math.PI).toFixed(2), "vel", JSON.stringify({x:+dominoes[0].vel.x.toFixed(3),z:+dominoes[0].vel.z.toFixed(3)}),
          "ball vel", JSON.stringify({ x: +ball.vel.x.toFixed(3), z: +ball.vel.z.toFixed(3) }));
      }
    }
    if (hits >= 5) break;
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
