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
  for (let s = 0; s < 2400; s++) {
    substep(DT);
    if (s % 120 === 0) {
      const d = dominoes.map(x => (x.angle * 180 / Math.PI).toFixed(0)).join(",");
      console.log("t=" + (s * DT).toFixed(2).padStart(6),
        "dom[" + d + "]",
        "ball", ball.pos.x.toFixed(2),
        "mar", marble.pos.x.toFixed(2),
        "vball", len(ball.vel).toFixed(2));
    }
    if (s > 1200) break;
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
