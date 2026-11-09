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
  marble.pos = { x: 2.90, z: 0.534 - (2.90 - 1.548) * 0.2537 + 0.008 + 0.02 };
  marble.vel = { x: 0, z: 0 };
  for (let s = 0; s < 120; s++) {
    substep(DT);
    const cs = contacts.filter(c => c.a.name === "marble" || c.b.name === "marble");
    if (s % 3 === 0 || cs.length === 0)
      console.log("шаг", s, "x", +marble.pos.x.toFixed(4), "z", +marble.pos.z.toFixed(4),
        "vx", +marble.vel.x.toFixed(3), "vz", +marble.vel.z.toFixed(3),
        cs.length ? cs.map(c => c.a.name.slice(0,5)+"x"+c.b.name.slice(0,5)
          + " n(" + +c.n.x.toFixed(2) + "," + +c.n.z.toFixed(2) + ") vn0:" + +c.vn0.toFixed(3)
          + " pt(" + +(c.pts[0].x).toFixed(3) + "," + +(c.pts[0].z).toFixed(3) + ")").join(" | ")
        : "БЕЗ КОНТАКТА");
    if (cs.length === 0 && s > 5) { console.log("оторвался на шаге", s, "x=", marble.pos.x.toFixed(4)); break; }
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
