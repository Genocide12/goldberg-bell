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
  // геометрия: концы жёлоба, бита, колокол
  const g = shapeWorld(chute, chute.shapes[0]);
  const a = chute.angle;
  console.log("ЖЁЛОБ shapeWorld: центр", g.c.x.toFixed(3), g.c.z.toFixed(3), "hw", g.hw,
    "angle°", (a * 180 / Math.PI).toFixed(2));
  for (const lx of [-g.hw, -g.hw/2, 0, g.hw/2, g.hw]) {
    const p = add(g.c, add(mul(g.ux, lx), mul(g.uz, g.hh)));
    const top = add(g.c, add(mul(g.ux, lx), mul(g.uz, -g.hh)));
    console.log("   lx=" + (+lx).toFixed(3), "низ", p.x.toFixed(3), p.z.toFixed(3),
      "верх", top.x.toFixed(3), top.z.toFixed(3));
  }
  console.log("БИТА: центр", mallet.pos.x.toFixed(3), mallet.pos.z.toFixed(3),
    "край X от", (mallet.pos.x - 0.095).toFixed(3), "до", (mallet.pos.x + 0.095).toFixed(3),
    "по Z от", (mallet.pos.z - 0.03).toFixed(3), "до", (mallet.pos.z + 0.03).toFixed(3));
  console.log("КОЛОКОЛ: центр", bell.pos.x.toFixed(3), bell.pos.z.toFixed(3),
    "юбка X от", (bell.pos.x - 0.055).toFixed(3), "до", (bell.pos.x + 0.055).toFixed(3));
  console.log("Стойки жёлоба (рендер): lx 1.98/2.42");
  collide();
  console.log("Контакты покоя:");
  for (const c of contacts)
    console.log("  ", c.a.name, "x", c.b.name, +c.vn0.toFixed(3),
      "pts", c.pts.map(p => [+(+p.x).toFixed(3), +(+p.z).toFixed(3), +(+p.sep).toFixed(4)]));
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
