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
  for (let s = 0; s < 1500; s++) {
    substep(DT);
    const d5 = dominoes[5];
    if (s > 380 && s < 700 && s % 30 === 0) {
      const cs = contacts.filter(c => (c.a.name==="dom5"||c.b.name==="dom5") || (c.a.name==="dom4"&&c.b.name==="dom6"))
        .map(c => c.a.name.slice(3)+"x"+c.b.name.slice(3)+" n:"+JSON.stringify(c.n)+" jn:"+(c.pts.map(p=>p.jn.toFixed(3)).join(",")).slice(0,90));
      console.log("шаг", s, "t=" + (s * DT).toFixed(2), "dom5", +(d5.angle*180/Math.PI).toFixed(1), "angVel", +d5.angVel.toFixed(2),
        "pos", d5.pos.x.toFixed(3));
      for (const c of cs) console.log("      ", c);
    }
  }
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
