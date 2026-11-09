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
  // изолировать пару: молоток и колокол подальше друг от друга не двигая тел —
  // просто вызвать boxBox вручную с их геометрией
  const ga = shapeWorld(mallet, mallet.shapes[0]);   // голова
  const gb = shapeWorld(bell, bell.shapes[0]);
  console.log("голова: c", JSON.stringify(ga.c), "hw", ga.hw, "hh", ga.hh, "a", ga.a);
  console.log("колокол стенка0: c", JSON.stringify(gb.c), "hw", gb.hw, "hh", gb.hh);
  const d = sub(gb.c, ga.c);
  console.log("разнос центров:", +d.x.toFixed(4), +d.z.toFixed(4));
  contacts.length = 0;
  boxBox(mallet, ga, bell, gb);
  console.log("boxBox(голова×колокол):", contacts.length, "контакт(ов)");
  for (const c of contacts)
    console.log("  n", JSON.stringify(c.n), "pts", c.pts.map(p => ({ x:+p.x.toFixed(4), z:+p.z.toFixed(4), sep:+p.sep.toFixed(5) })));
  // и перекладина×палка
  const gp = shapeWorld(mallet, mallet.shapes[1]);
  const gc = shapeWorld(crossbar, crossbar.shapes[0]);
  console.log("палка: c", JSON.stringify(gp.c), "hw", gp.hw, "hh", gp.hh, "a", gp.a);
  console.log("перекладина: c", JSON.stringify(gc.c), "hw", gc.hw, "hh", gc.hh);
  contacts.length = 0;
  boxBox(mallet, gp, crossbar, gc);
  console.log("boxBox(палка×перекладина):", contacts.length);
  for (const c of contacts)
    console.log("  n", JSON.stringify(c.n), "pts", c.pts.map(p => ({ x:+p.x.toFixed(4), z:+p.z.toFixed(4), sep:+p.sep.toFixed(5) })));
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
