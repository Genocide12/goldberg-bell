const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const W = cv.width, H = cv.height;
    const rgbAt = (x3, y3, z3) => {
      const s = cam.project({ x: x3, y: y3, z: z3 });
      if (!s) return null;
      const ix = Math.round(s.x), iy = Math.round(s.y);
      if (ix < 2 || iy < 2 || ix > W - 3 || iy > H - 3) return null;
      const d = ctx.getImageData(ix - 1, iy - 1, 3, 3).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < 36; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      return [Math.round(r / 9), Math.round(g / 9), Math.round(b / 9)];
    };
    const out = { top: [], tail: [] };
    // верхняя грань вдоль доски, СЕРЕДИНА между волокнами (глубина y=0 — центр доски!)
    for (const t of [0.15, 0.35, 0.55, 0.75]) {
      const x = RAMP_TOP.x + Math.cos(RAMP_A) * RAMP_L * t;
      const z = RAMP_TOP.z - Math.sin(RAMP_A) * RAMP_L * t + 0.0085;
      out.top.push("t=" + t + " (центр доски): " + JSON.stringify(rgbAt(x, 0, z)));
    }
    // скан-линия по экрану: горизонталь через проекцию середины доски
    const mid = cam.project({ x: RAMP_TOP.x + Math.cos(RAMP_A) * RAMP_L * 0.4, y: 0, z: RAMP_TOP.z - Math.sin(RAMP_A) * RAMP_L * 0.4 + 0.0085 });
    if (mid) {
      const line = [];
      for (let dx = -50; dx <= 50; dx += 5) {
        const ix = Math.round(mid.x + dx), iy = Math.round(mid.y);
        if (ix < 0 || ix >= W) continue;
        const d = ctx.getImageData(ix, iy, 1, 1).data;
        line.push([ix - Math.round(mid.x), d[0], d[1], d[2]]);
      }
      out.tail = line;
    }
    return out;
  });
  console.log("ВЕРХНЯЯ ГРАНЬ ГОРКИ (y=0 — центр):");
  for (const l of res.top) console.log("  ", l);
  console.log("скан-линия (offset, rgb):");
  for (const p of res.tail) console.log("  ", p.join("\t"));
  await browser.close();
})();
