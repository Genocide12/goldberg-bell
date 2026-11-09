const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    // 1) скан-линия через центр шара
    const s = cam.project({ x: ball.pos.x, y: 0, z: ball.pos.z });
    const line = [];
    if (s) {
      const iy = Math.round(s.y);
      for (let ix = Math.round(s.x) - 40; ix <= Math.round(s.x) + 40; ix += 4) {
        if (ix < 0 || ix >= cv.width) continue;
        const d = ctx.getImageData(ix, iy, 1, 1).data;
        line.push([ix, d[0], d[1], d[2]]);
      }
    }
    // 2) что лежит в items вокруг точки шара: перехват draw
    let around = [];
    const origPaint = null;
    // эмуляция draw с записью items: скопируем логику — просто проверим порядок:
    // соберём items заново, перехватив paintItems
    const origPaintItems = paintItems;
    paintItems = function(items) {
      const px = Math.round(s.x), py = Math.round(s.y);
      around = items
        .map((it, idx) => ({ idx, k: it.k, z: +it.z.toFixed(3),
          x: it.x ?? it.pts?.[0]?.x ?? it.a?.x, y: it.y ?? it.pts?.[0]?.y ?? it.a?.y }))
        .filter(it => it.x !== undefined && Math.abs(it.x - px) < 25 && Math.abs(it.y - py) < 25);
      return origPaintItems(items);
    };
    draw();
    paintItems = origPaintItems;
    return { proj: s ? { x: Math.round(s.x), y: Math.round(s.y) } : null, line, around };
  });
  console.log("проекция шара:", JSON.stringify(res.proj));
  console.log("скан-линия (x,rgb):");
  for (const p of res.line) console.log("  ", p.join("\t"));
  console.log("items возле шара (до сортировки):");
  for (const a of res.around) console.log("  ", JSON.stringify(a));
  await browser.close();
})();
