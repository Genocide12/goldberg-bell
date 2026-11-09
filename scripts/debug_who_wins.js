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
    // собрать ВСЕ items, накрывающие точку (770,280), после сортировки: кто последний — тот виден
    const polys = [], lines = [], sprites = [];
    const cur = [];
    const origPaintItems = paintItems;
    paintItems = function(items) { cur.push(items); return origPaintItems(items); };
    draw();
    paintItems = origPaintItems;
    const inside = (it) => {
      if (it.k === "p") {  // точка в полигоне
        let wn = 0;
        const pts = it.pts;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          if (pts[j].y <= py && pts[i].y > py && (pts[i].x - pts[j].x) * (py - pts[j].y) - (pts[i].y - pts[j].y) * (px - pts[j].x) > 0) wn++;
          if (pts[j].y > py && pts[i].y <= py && (pts[i].x - pts[j].x) * (py - pts[j].y) - (pts[i].y - pts[j].y) * (px - pts[j].x) < 0) wn--;
        }
        return wn !== 0;
      }
      if (it.k === "s") return Math.hypot(it.x - px, it.y - py) < it.r;
      return false;
    };
    // порядок отрисовки: polys→lines→sprites, каждый отсортирован по z desc
    const all = [];
    for (const arr of cur) for (const it of arr) all.push(it);
    const hit = [];
    for (const it of all) if (inside(it)) hit.push(it);
    // описать каждый
    const desc = [];
    for (const it of hit.slice(-8))
      desc.push({ k: it.k, z: +it.z.toFixed(3), fill: (it.fill || it.stops && "gradient").slice(0, 40),
        stops: it.stops ? it.stops.map(s2 => s2[1].slice(0, 24)) : undefined,
        x: Math.round(it.x ?? it.pts?.[0]?.x), y: Math.round(it.y ?? it.pts?.[0]?.y),
        r: it.r && Math.round(it.r) });
    return { point: { px, py }, drawn: desc };
  });
  console.log("Точка на лице домино:", JSON.stringify(res.point));
  console.log("Что рисуется в ней (последние = видимые):");
  for (const d of res.drawn) console.log("  ", JSON.stringify(d));
  await browser.close();
})();
