const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    // пересобрать грани горки с нормалями
    const out = [];
    const b = ramp, base = COL.wood;
    const hx = RAMP_L / 2, hz = 0.008, hy = 0.16 / 2, a = b.angle;
    const R = (lx, ly, lz) => { const p = rot2({ x: lx, z: lz }, a);
      return { x: b.pos.x + p.x, y: ly, z: b.pos.z + p.z }; };
    const nrm = (x, z) => { const p = rot2({ x, z }, a); const l = Math.hypot(p.x, p.z) || 1;
      return { x: p.x / l, y: 0, z: p.z / l }; };
    const faces = [
      ["верх", [R(-hx, hy, -hz), R(hx, hy, -hz), R(hx, hy, hz), R(-hx, hy, hz)], { x: 0, y: 1, z: 0 }],
      ["перед(+Y к камере)", [R(-hx, -hy, hz), R(-hx, -hy, -hz), R(hx, -hy, -hz), R(hx, -hy, hz)], nrm(0, 1)],
    ];
    for (const [name, pts, n] of faces) {
      const lam = Math.max(0, n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z);
      const fill = rgb(base, 0.5 + 0.55 * lam);
      out.push({ name, n, lam: +lam.toFixed(3), fill,
        pts: pts.map(p => cam.project(p)).map(p2 => p2 && [Math.round(p2.x), Math.round(p2.y)]) });
    }
    return out;
  });
  for (const f of res) console.log(f.name, "lam=" + f.lam, f.fill, JSON.stringify(f.pts));
  await browser.close();
})();
