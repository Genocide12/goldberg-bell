const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1&dbg=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    window.__dbgEv = [];
    const { byName, stepOnce, bodies } = window.__dbg;
    for (const b of bodies) if (!b.fixed) {
      b.body.setTranslation({ x: b.home.x, y: b.home.y }, true);
      b.body.setRotation(b.home.rot || 0, true);
      b.body.setLinvel({ x: 0, y: 0 }, true); b.body.setAngvel(0, true);
    }
    const before = window.__dbgEv.length;
    for (let s = 0; s < 240 * 4; s++) stepOnce();
    const evs = window.__dbgEv.slice(0, 40);
    // kindOf недоступен снаружи — посмотрим handle-ы:
    return { count: window.__dbgEv.length, sample: evs.slice(0, 12) };
  });
  console.log("событий всего:", out.count);
  console.log("первые:", JSON.stringify(out.sample));
  await browser.close();
})();
