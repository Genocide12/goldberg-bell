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
  collide();
  // все пары с mallet + проверка их AABB
  for (const c of contacts) {
    if (c.a.name === "mallet" || c.b.name === "mallet") {
      const A = bodyAABB(c.a, -0.05), B = bodyAABB(c.b, -0.05);  // расширенные на 5 см
      const ov = !(A.x1 < B.x0 || B.x1 < A.x0 || A.z1 < B.z0 || B.z1 < A.z0);
      console.log("ПАРА:", c.a.name, "x", c.b.name,
        "| aABB", JSON.stringify(bodyAABB(c.a, 0)), "| bABB", JSON.stringify(bodyAABB(c.b, 0)),
        "| пересечение(+5см):", ov,
        "| n", JSON.stringify(c.n), "pts", c.pts.map(p => ({ x:+p.x.toFixed(3), z:+p.z.toFixed(3), sep:+p.sep.toFixed(4) })));
    }
  }
  console.log("mallet pos", JSON.stringify(mallet.pos), "angle", mallet.angle);
  console.log("bell pos", JSON.stringify(bell.pos));
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
