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
  // положить шарик на жёлоб в середине и отпустить
  marble.pos = { x: 2.2, z: 2.2 * 0 + (0.542 - (2.2 - 1.55) * 0.282 / 1.39) + 0.008 + 0.02 };
  marble.vel = { x: 0, z: 0 };
  for (let s = 0; s < 1400; s++) {
    substep(DT);
    if (s % 60 === 0)
      console.log("t=" + (s * DT).toFixed(2),
        "mar", marble.pos.x.toFixed(3), marble.pos.z.toFixed(3),
        "v", +len(marble.vel).toFixed(2),
        "mall", (mallet.angle * 180 / Math.PI).toFixed(1), "av", +mallet.angVel.toFixed(2),
        "C:", contacts.filter(c => (c.a.name === "marble" || c.b.name === "marble") || (c.a.kind === "mallet" || c.b.kind === "mallet"))
          .map(c => c.a.name.slice(0, 7) + "x" + c.b.name.slice(0, 7) + " vn0:" + +c.vn0.toFixed(2)).join(" | ") || "-");
    if (s > 800) break;
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
