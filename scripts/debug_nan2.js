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
  const bad = b => !Number.isFinite(b.pos.x) || !Number.isFinite(b.pos.z) || !Number.isFinite(b.angle) || !Number.isFinite(b.angVel);
  for (let s = 0; s < 240; s++) {
    substep(DT);
    const culprits = bodies.filter(bad);
    if (culprits.length) {
      console.log("NaN на субшаге", s, ":", culprits.map(b => b.name).join(","));
      for (const b of culprits.slice(0, 3))
        console.log("  ", b.name, "pos", JSON.stringify(b.pos), "ang", b.angle, "angVel", b.angVel, "vel", JSON.stringify(b.vel));
      for (const c of contacts.slice(0, 8))
        console.log("   C:", c.a.name, "x", c.b.name, "n", JSON.stringify(c.n),
          "pts", c.pts.map(p => ({ x: +p.x?.toFixed?.(4), z: +p.z?.toFixed?.(4), sep: +p.sep?.toFixed?.(6), jn: p.jn })));
      for (const j of joints)
        console.log("   J:", j.body ? "world:" + j.body.name : "pair:" + j.a.name + "/" + j.b.name,
          j.px, j.pz, j.qx, j.qz);
      return;
    }
  }
  console.log("нет NaN за 240 шагов");
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
