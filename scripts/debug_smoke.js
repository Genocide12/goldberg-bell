// почему смоук не видит звона: реальный прогон с таймлайном
const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.click("#btnRun");
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate(() => ({
      t: (window.__dbg ? +window.__dbg.world.timestep : 0) || 0,
      rings: (typeof ringCount !== "undefined") ? ringCount : -1,
      hud: document.getElementById("hudStats").textContent,
      event: document.getElementById("hudEvent").textContent,
      simT: (window.__simT !== undefined) ? window.__simT : null,
    }));
    console.log("сек", i + 1, JSON.stringify(st));
    if (st.rings > 0) break;
  }
  await browser.close();
})();
