const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const x = RAMP_TOP.x + Math.cos(RAMP_A) * RAMP_L * 0.55;
    const z = RAMP_TOP.z - Math.sin(RAMP_A) * RAMP_L * 0.55 + 0.0085;
    const s = cam.project({ x, y: 0, z });
    const px = Math.round(s.x), py = Math.round(s.y);
    const cur = [];
    const orig = paintItems;
    paintItems = function(items) { cur.push(items); return orig(items); };
    draw();
    paintItems = orig;
    const out = [];
    for (const arr of cur) for (const it of arr) {
      if (it.k !== "p") continue;
      let wn = 0;
      const pts = it.pts;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        if (pts[j].y <= py && pts[i].y > py && (pts[i].x - pts[j].x) * (py - pts[j].y) - (pts[i].y - pts[j].y) * (px - pts[j].x) > 0) wn++;
        if (pts[j].y > py && pts[i].y <= py && (pts[i].x - pts[j].x) * (py - pts[j].y) - (pts[i].y - pts[j].y) * (px - pts[j].x) < 0) wn--;
      }
      if (wn !== 0) out.push({ z: +it.z.toFixed(3), fill: it.fill,
        pts: pts.map(p => [Math.round(p.x), Math.round(p.y)]), depth: pts.map(p => +p.d.toFixed(2)) });
    }
    return { point: [px, py], owners: out };
  });
  console.log("точка:", JSON.stringify(res.point));
  for (const o of res.owners)
    console.log("z=" + o.z, o.fill, "углы:", JSON.stringify(o.pts), "глубины:", JSON.stringify(o.depth));
  await browser.close();
})();
