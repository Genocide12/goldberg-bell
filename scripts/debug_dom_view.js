const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
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
    const out = { dom: [], ramp: [] };
    // разные точки домино0: центр лица, верх, низ
    const d = dominoes[0];
    for (const [lz, tag] of [[0, "центр"], [0.03, "верх"], [-0.03, "низ"], [0.02, "верх-2"]])
      out.dom.push(tag + ": " + JSON.stringify(rgbAt(d.pos.x, 0.0225, d.pos.z + lz)));
    // верхняя грань домино (должна быть светлой костью)
    out.dom.push("верх.грань: " + JSON.stringify(rgbAt(d.pos.x, 0.0475, d.pos.z)));
    // горка: точки вдоль доски
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const x = RAMP_TOP.x + Math.cos(RAMP_A) * RAMP_L * t;
      const z = RAMP_TOP.z - Math.sin(RAMP_A) * RAMP_L * t + 0.008;
      out.ramp.push("t=" + t + ": " + JSON.stringify(rgbAt(x, 0, z)));
    }
    // горка, боковая грань (передняя, к камере): точка на переднем срезе
    out.ramp.push("перед.торец: " + JSON.stringify(rgbAt(0.5, -0.08, RAMP_TOP.z - (0.5 - RAMP_TOP.x) * Math.tan(RAMP_A))));
    // проекция и порядок items у домино0
    const s = cam.project({ x: d.pos.x, y: 0, z: d.pos.z });
    const origPaintItems = paintItems;
    let around = [];
    paintItems = function(items) {
      if (s) around = items
        .map((it, idx) => ({ idx, k: it.k, z: +it.z.toFixed(3),
          x: it.x ?? it.pts?.[0]?.x ?? it.a?.x, y: it.y ?? it.pts?.[0]?.y ?? it.a?.y }))
        .filter(it => it.x !== undefined && Math.abs(it.x - s.x) < 20 && Math.abs(it.y - s.y) < 20);
      return origPaintItems(items);
    };
    draw();
    paintItems = origPaintItems;
    out.around = around;
    // горка items
    const sr = cam.project({ x: 0.5, y: 0, z: RAMP_TOP.z - (0.5 - RAMP_TOP.x) * Math.tan(RAMP_A) + 0.008 });
    out.rampProj = sr ? { x: Math.round(sr.x), y: Math.round(sr.y) } : null;
    return out;
  });
  console.log("ДОМИНО-0:");
  for (const l of res.dom) console.log("  ", l);
  console.log("ГОРКА:");
  for (const l of res.ramp) console.log("  ", l);
  console.log("items возле домино0:", JSON.stringify(res.around, null, 1).slice(0, 900));
  await browser.close();
})();
