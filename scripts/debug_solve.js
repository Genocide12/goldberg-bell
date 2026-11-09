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
  // логирующий вызов solve: первый контакт, первая итерация
  const orig = solve;
  let calls = 0;
  solve = function(dt) {
    if (calls++ > 0) return orig(dt);
    for (const c of contacts) c.pts.forEach((p,i)=>{p.age=0;p.jn=0;p.jf=0;});
    const c = contacts[0];
    const A = c.a, B = c.b, n = c.n, p = c.pts[0];
    const ra = sub(p, A.pos), rb = sub(p, B.pos);
    const vB = { x: B.vel.x - B.angVel * rb.z, z: B.vel.z + B.angVel * rb.x };
    const vA = { x: A.vel.x - A.angVel * ra.z, z: A.vel.z + A.angVel * ra.x };
    const vn = (vB.x - vA.x) * n.x + (vB.z - vA.z) * n.z;
    const bias = Math.min(0.2 / dt * Math.max(-p.sep - 0.0008, 0), 0.3);
    const rest = (p.age < 2) ? c.e * Math.max(0, -(c.vn0 + 0.05)) * 0.9 : 0;
    let k = A.invMass + A.invI * (perp(ra).x * n.x + perp(ra).z * n.z) ** 2
          + B.invMass + B.invI * (perp(rb).x * n.x + perp(rb).z * n.z) ** 2;
    console.log("CONTACT0:", A.name, "x", B.name);
    console.log("  A:", JSON.stringify({invMass:A.invMass, invI:A.invI, vel:A.vel, angVel:A.angVel, pos:A.pos}));
    console.log("  B:", JSON.stringify({invMass:B.invMass, invI:B.invI, vel:B.vel, angVel:B.angVel, pos:B.pos}));
    console.log("  vn", vn, "bias", bias, "rest", rest, "k", k,
      "vn0", c.vn0, "e", c.e, "sep", p.sep, "n", JSON.stringify(n));
    console.log("  ra", JSON.stringify(ra), "rb", JSON.stringify(rb));
    return orig(dt);
  };
  substep(DT);
  console.log("после substep: dom0.vel", JSON.stringify(dominoes[0].vel), "angVel", dominoes[0].angVel, "pos", JSON.stringify(dominoes[0].pos));
  console.log("runway.vel", JSON.stringify(runway.vel), "ball.vel", JSON.stringify(ball.vel), "pos", JSON.stringify(ball.pos));
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
