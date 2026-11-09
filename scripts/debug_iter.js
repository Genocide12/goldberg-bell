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
  const pr = () => { for (const c of contacts)
    console.log("  C:", c.a.name, "x", c.b.name, "vn0", +(+c.vn0).toFixed(3),
      "mu", +(+c.mu).toFixed(3), "e", +(+c.e).toFixed(3),
      "n", JSON.stringify(c.n),
      "pts", c.pts.map(p => [ +(+p.x).toFixed(4), +(+p.z).toFixed(4), +(+p.sep).toFixed(5) ])); };
  // контроль dom0.vel по итерациям
  const ITERsave = ITER;
  let iterN = 0;
  const orig = solve;
  solve = function(dt) {
    for (const c of contacts) c.pts.forEach((p,i)=>{p.age=0;p.jn=0;p.jf=0;});
    console.log("ВСЕ контакты в solve:"); pr();
    const bad = contacts.find(c => c.pts.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.sep) || !Number.isFinite(c.vn0) || !Number.isFinite(c.n.x) || !Number.isFinite(c.mu)));
    if (bad) { console.log("!!! КОНТАКТ С NaN:", bad.a.name, "x", bad.b.name); }
    for (let it = 0; it < ITERsave; it++) {
      for (const c of contacts) {
        const A = c.a, B = c.b, n = c.n;
        for (const p of c.pts) {
          const ra = sub(p, A.pos), rb = sub(p, B.pos);
          const vB = { x: B.vel.x - B.angVel * rb.z, z: B.vel.z + B.angVel * rb.x };
          const vA = { x: A.vel.x - A.angVel * ra.z, z: A.vel.z + A.angVel * ra.x };
          const vn = (vB.x - vA.x) * n.x + (vB.z - vA.z) * n.z;
          const bias = Math.min(0.2 / dt * Math.max(-p.sep - 0.0008, 0), 0.3);
          const rest = (p.age < 2) ? c.e * Math.max(0, -(c.vn0 + 0.05)) * 0.9 : 0;
          let k = A.invMass + A.invI * (perp(ra).x*n.x + perp(ra).z*n.z)**2
                + B.invMass + B.invI * (perp(rb).x*n.x + perp(rb).z*n.z)**2;
          if (k < 1e-9) continue;
          const jOld = p.jn;
          let j = jOld + (rest + bias - vn) / k;
          if (j < 0) j = 0;
          const dj = j - jOld; p.jn = j;
          A.vel.x -= dj * n.x * A.invMass; A.vel.z -= dj * n.z * A.invMass;
          A.angVel -= A.invI * (perp(ra).x*n.x + perp(ra).z*n.z) * dj;
          B.vel.x += dj * n.x * B.invMass; B.vel.z += dj * n.z * B.invMass;
          B.angVel += B.invI * (perp(rb).x*n.x + perp(rb).z*n.z) * dj;
          const t = { x: -n.z, z: n.x };
          const vt = (vB.x - vA.x) * t.x + (vB.z - vA.z) * t.z;
          let kf = A.invMass + A.invI*(perp(ra).x*t.x + perp(ra).z*t.z)**2
                + B.invMass + B.invI*(perp(rb).x*t.x + perp(rb).z*t.z)**2;
          if (kf < 1e-9) { p.jf = 0; continue; }
          const fOld = p.jf;
          let f = fOld - vt / kf;
          const fmax = c.mu * p.jn;
          f = clamp(f, -fmax, fmax);
          const df = f - fOld; p.jf = f;
          A.vel.x -= df * t.x * A.invMass; A.vel.z -= df * t.z * A.invMass;
          A.angVel -= A.invI*(perp(ra).x*t.x + perp(ra).z*t.z) * df;
          B.vel.x += df * t.x * B.invMass; B.vel.z += df * t.z * B.invMass;
          B.angVel += B.invI*(perp(rb).x*t.x + perp(rb).z*t.z) * df;
        }
      }
      // ШАРНИРЫ — как в оригинале
      for (const j of joints) { /* копия из оригинала */ 
        let bA, bB=null, imA, imB=0, iiA, iiB=0;
        if (j.body) { bA = j.body;
          const a = rot2({ x: j.ax, z: j.az }, bA.angle);
          j.px = bA.pos.x + a.x; j.pz = bA.pos.z + a.z;
          j.qx = j.wx; j.qz = j.wz;
          imA = bA.invMass; iiA = bA.invI;
        } else { bA = j.a; bB = j.b;
          const a = rot2({ x: j.ax, z: j.az }, bA.angle);
          const b2 = rot2({ x: j.bx, z: j.bz }, bB.angle);
          j.px = bA.pos.x + a.x; j.pz = bA.pos.z + a.z;
          j.qx = bB.pos.x + b2.x; j.qz = bB.pos.z + b2.z;
          imA = bA.invMass; iiA = bA.invI; imB = bB.invMass; iiB = bB.invI; }
        const rAx = j.px - bA.pos.x, rAz = j.pz - bA.pos.z;
        const rBx = j.qx - (bB ? bB.pos.x : 0), rBz = j.qz - (bB ? bB.pos.z : 0);
        const ex = j.px - j.qx, ez = j.pz - j.qz;
        for (const e of [{ x: 1, z: 0 }, { x: 0, z: 1 }]) {
          const vA = { x: bA.vel.x - bA.angVel * rAz, z: bA.vel.z + bA.angVel * rAx };
          const va = vA.x * e.x + vA.z * e.z;
          let vb = 0, jEB = 0;
          if (bB) { const vB = { x: bB.vel.x - bB.angVel * rBz, z: bB.vel.z + bB.angVel * rBx };
            vb = vB.x * e.x + vB.z * e.z; }
          const bias = 0.12 / dt * (ex * e.x + ez * e.z);
          const jEA = perp({ x: rAx, z: rAz }).x * e.x + perp({ x: rAx, z: rAz }).z * e.z;
          if (bB) jEB = perp({ x: rBx, z: rBz }).x * e.x + perp({ x: rBx, z: rBz }).z * e.z;
          const k = imA + iiA * jEA * jEA + imB + iiB * jEB * jEB;
          if (k < 1e-9) continue;
          const lam = -(va - vb + bias) / k;
          bA.vel.x += lam * e.x * imA; bA.vel.z += lam * e.z * imA;
          bA.angVel += iiA * jEA * lam;
          if (bB) { bB.vel.x -= lam * e.x * imB; bB.vel.z -= lam * e.z * imB;
            bB.angVel -= iiB * jEB * lam; }
        }
      }
      if (!Number.isFinite(dominoes[0].vel.x)) {
        console.log("NaN ПОСЛЕ итерации", it, ": dom0", JSON.stringify(dominoes[0].vel), "angVel", dominoes[0].angVel);
        console.log("  runway.vel", JSON.stringify(runway.vel), "ball", JSON.stringify(ball.vel), "bell", JSON.stringify(bell.vel), "clapper", JSON.stringify(clapper.vel));
        return;
      }
    }
    prevContacts.clear();
    for (const c of contacts) c.pts.forEach((p, i) =>
      prevContacts.set(pairKey(c, p, i), { jn: p.jn, jf: p.jf, age: p.age }));
  };
  substep(DT);
  console.log("после substep dom0:", JSON.stringify(dominoes[0].vel), dominoes[0].angVel);
})();
`;
vm.runInContext(src + TEST, sandbox, { filename: "model.js" });
