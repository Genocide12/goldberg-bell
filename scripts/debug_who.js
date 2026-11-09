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
  // обернуть все push-функции логом
  const cc = circleCircle, cb = circleBox, bb = boxBox;
  circleCircle = function(A, ga, B, gb) {
    if (A.name === "ball" || B.name === "ball")
      console.log("circleCircle:", A.name, JSON.stringify(ga), "x", B.name, JSON.stringify(gb));
    return cc(A, ga, B, gb);
  };
  circleBox = function(C, gc, B, gb, cIsA) {
    if (C.name === "ball" || B.name === "ball")
      console.log("circleBox:", C.name, "gc=" + JSON.stringify(gc), "x", B.name, "gb=" + JSON.stringify(gb), "cIsA", cIsA);
    return cb(C, gc, B, gb, cIsA);
  };
  // и сам collide с распечаткой пары ball
  const origCollide = collide;
  collide = function() {
    const n0 = contacts.length;
    origCollide();
    for (const c of contacts.slice(n0))
      if (c.a.name === "ball" || c.b.name === "ball")
        console.log("NEW CONTACT:", c.a.name, "x", c.b.name, "n", JSON.stringify(c.n), "pts", JSON.stringify(c.pts));
  };
  substep(DT);
  console.log("ball.pos после substep:", JSON.stringify(ball.pos), "ramp:", JSON.stringify(ramp.pos), ramp.angle);
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
