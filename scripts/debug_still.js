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
  marble.pos = { x: 2.80, z: 0.534 - (2.80 - 1.548) * 0.2537 + 0.008 + 0.02 };
  marble.vel = { x: 0, z: 0 };
  for (let s = 0; s < 480; s++) {
    substep(DT);
    if (s % 40 === 0)
      console.log("t=" + (s * DT).toFixed(2), "mar", marble.pos.x.toFixed(3), marble.pos.z.toFixed(3),
        "v", +len(marble.vel).toFixed(2), "vx", +marble.vel.x.toFixed(2),
        "C:", contacts.filter(c => c.a.name === "marble" || c.b.name === "marble")
          .map(c => c.a.name.slice(0,6) + "x" + c.b.name.slice(0,6) + " n:" + JSON.stringify(c.n) + " vn0:" + c.vn0.toFixed(2)).join("|") || "-");
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
