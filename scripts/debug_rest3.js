const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    // следим за звонами первые 0.5 с: что звонит?
    const rows = [];
    let lastRings = 0;
    for (let s = 0; s < 240 / 2; s++) {
      window.__dbg.stepOnce();
      const rc = (typeof ringCount !== "undefined") ? ringCount : (window.__ringCount || 0);
      if (rc > lastRings) {
        lastRings = rc;
        rows.push("звон на шаге " + s + " (" + (s / 240).toFixed(3) + "с): bell rot=" +
          (window.__dbg.rot("bell") * 180 / Math.PI).toFixed(2) + "° w=" +
          window.__dbg.byName.bell.angvel().toFixed(3) +
          " | sL rot=" + (window.__dbg.rot("strikerL") * 180 / Math.PI).toFixed(2) +
          " | sR rot=" + (window.__dbg.rot("strikerR") * 180 / Math.PI).toFixed(2));
      }
    }
    rows.push("итого звонков за 0.5с: " + lastRings);
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
