const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const { byName, stepOnce, bodies } = window.__dbg;
    for (const b of bodies) if (!b.fixed) {
      b.body.setTranslation({ x: b.home.x, y: b.home.y }, true);
      b.body.setRotation(b.home.rot || 0, true);
      b.body.setLinvel({ x: 0, y: 0 }, true); b.body.setAngvel(0, true);
    }
    const rows = [];
    for (let s = 0; s < 240 * 3; s++) {
      stepOnce();
      const mb = byName.marble, t = mb.translation();
      const ml = byName.mallet, mt = ml.translation();
      if (t.x > 2.85 && t.x < 3.25 && rows.length < 30) {
        rows.push("шаг " + s + " шарик (" + t.x.toFixed(3) + "," + t.y.toFixed(3) +
          ") | молот (" + mt.x.toFixed(3) + "," + mt.y.toFixed(3) + ") rot " +
          (ml.rotation() * 180 / Math.PI).toFixed(1) + "° w=" + ml.angvel().toFixed(2));
      }
      if (t.x > 3.3 && t.y < 0.1) break;
    }
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
