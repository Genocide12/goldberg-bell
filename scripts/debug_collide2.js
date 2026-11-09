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
  // вручную: поставить шарик вплотную к голове и столкнуть
  marble.pos = { x: 2.95, z: 0.28 };
  marble.vel = { x: 1.0, z: 0 };
  console.log("голова AABB:", JSON.stringify(bodyAABB(mallet, 0)));
  console.log("шарик AABB:", JSON.stringify(bodyAABB(marble, 0)));
  collide();
  console.log("контакты после ручного collide:", contacts.map(c =>
    c.a.name + "x" + c.b.name + " vn0:" + +c.vn0.toFixed(3)).join(" | ") || "НЕТ");
  substep(DT);
  console.log("после substep: mall angVel", +mallet.angVel.toFixed(3),
    "angle", +(mallet.angle * 180 / Math.PI).toFixed(2),
    "marble v", +len(marble.vel).toFixed(3));
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
