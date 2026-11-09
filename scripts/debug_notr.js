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
  // микросценарий: только ball, dom0, стол (убрать всё лишнее)
  const keep = new Set(["runway", "ramp", "ball", "dom0"]);
  for (let i = bodies.length - 1; i >= 0; i--)
    if (!keep.has(bodies[i].name)) bodies.splice(i, 1);
  let phase = 0;
  for (let s = 0; s < 500; s++) {
    substep(DT);
    if (s > 230 && s < 260 && s % 4 === 0)
      console.log("шаг", s, "dom0 angle", +(dominoes[0].angle*180/Math.PI).toFixed(1),
        "angVel", +dominoes[0].angVel.toFixed(2),
        "vel", JSON.stringify({x:+dominoes[0].vel.x.toFixed(2), z:+dominoes[0].vel.z.toFixed(2)}),
        "| ball", JSON.stringify({x:+ball.pos.x.toFixed(2), z:+ball.pos.z.toFixed(2)}),
        "contacts:", contacts.map(c => c.a.name.slice(0,6)+"x"+c.b.name.slice(0,6)+" vn0:"+c.vn0.toFixed(2)+" jn:"+(c.pts[0].jn||0).toFixed(2)).join(" | "));
    if (Math.abs(dominoes[0].angle) > 0.5) { console.log("УПАЛ на шаге", s); break; }
  }
  console.log("итог: dom0", +(dominoes[0].angle*180/Math.PI).toFixed(1), "°");
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
