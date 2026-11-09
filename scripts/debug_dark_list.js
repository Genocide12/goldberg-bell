const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);
  const res = await page.evaluate(() => {
    const cur = [];
    const orig = paintItems;
    paintItems = function(items) { cur.push(items); return orig(items); };
    draw();
    paintItems = orig;
    return cur.flat().filter(it => it.k === "p" && /rgba\(8[0-9],6[0-9],3[0-9]/.test(it.fill))
      .map(it => ({ z: +it.z.toFixed(2), fill: it.fill,
        pts: it.pts.map(p => [Math.round(p.x), Math.round(p.y)]) }));
  });
  console.log("Тёмные полигоны:", res.length);
  for (const o of res) console.log(" z=" + o.z, o.fill, JSON.stringify(o.pts));
  await browser.close();
})();
