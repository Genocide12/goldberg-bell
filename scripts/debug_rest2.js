const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const res = { rest: {} };
    // 1 с покоя, потом позиции
    for (let s = 0; s < 240; s++) window.__dbg.stepOnce();
    for (const nm of ["bell", "strikerL", "strikerR", "mallet"]) {
      const t = window.__dbg.pos(nm);
      res.rest[nm] = { x: +t.x.toFixed(4), y: +t.y.toFixed(4),
        rot: +(window.__dbg.rot(nm) * 180 / Math.PI).toFixed(2) };
    }
    // зазор bell×strikerR
    const b = res.rest.bell, sr = res.rest.strikerR;
    res.gapR = +(sr.x - 0.012 - (b.x + 0.049)).toFixed(4);
    res.gapL = +((res.rest.strikerL.x + 0.012) - (b.x - 0.049)).toFixed(4);
    res.gapM = +((b.x - 0.049) - (res.rest.mallet.x + 0.08)).toFixed(4);
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
