const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  // сбросить и следить за шаром первые 1.5 с
  const log = await page.evaluate(() => {
    const { byName, stepOnce } = window.__dbg;
    window.__hudSet = true;
    const out = [];
    for (let s = 0; s < 360; s++) {
      stepOnce();
      if (s % 40 === 0) {
        const b = byName.ball, t = b.translation(), v = b.linvel();
        out.push("шаг " + s + " шар: (" + t.x.toFixed(3) + "," + t.y.toFixed(3) +
          ") v=(" + v.x.toFixed(2) + "," + v.y.toFixed(2) + ") w=" + b.angvel().toFixed(2));
      }
    }
    return out;
  });
  console.log(log.join("\n"));
  await browser.close();
})();
