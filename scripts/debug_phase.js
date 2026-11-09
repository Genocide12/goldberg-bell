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
  const st = tag => console.log(tag,
    "ball", JSON.stringify(ball.pos), "vel", JSON.stringify(ball.vel),
    "| marble", JSON.stringify(marble.pos),
    "| dom0", JSON.stringify(dominoes[0].pos), "vel", JSON.stringify(dominoes[0].vel),
    "| bell", JSON.stringify(bell.pos));
  st("A: после reset       ");
  // ручная интеграция, как в substep
  for (const b of bodies) {
    if (b.isStatic) continue;
    b.vel.z -= G * b.mass * 0 + G * (1/240);   // аналог
    b.vel.x *= 1 - b.ldamp * (1/240); b.vel.z *= 1 - b.ldamp * (1/240);
    b.angVel *= 1 - b.adamp * (1/240);
    b.pos.x += b.vel.x * (1/240); b.pos.z += b.vel.z * (1/240);
    b.angle += b.angVel * (1/240);
  }
  st("B: после интеграции  ");
  console.log("ball.angle", ball.angle, "angVel", ball.angVel, "vel", JSON.stringify(ball.vel));
  console.log("bodyAABB(ball)", JSON.stringify(bodyAABB(ball, 0.02)));
  console.log("bodyAABB(marble)", JSON.stringify(bodyAABB(marble, 0.02)));
  console.log("shapeWorld(ball)", JSON.stringify(shapeWorld(ball, ball.shapes[0])));
  collide();
  console.log("C: контакты:", contacts.length, contacts.map(c => c.a.name + "x" + c.b.name + (c.pts.some(p=>!Number.isFinite(p.x)) ? "[NaN]" : "")).join(" "));
  const bad = bodies.find(b => !Number.isFinite(b.pos.x));
  console.log("D: первое NaN-тело:", bad ? bad.name : "нет");
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
