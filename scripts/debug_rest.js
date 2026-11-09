const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    // 1.5 с покоя: какие контакты между dynamic-телами?
    const pairs = new Set();
    const origStep = window.__dbg.stepOnce;
    for (let s = 0; s < 360; s++) {
      window.__dbg.stepOnce();
      for (const a of window.__dbg.bodies) {
        if (a.fixed) continue;
        for (const b of window.__dbg.bodies) {
          if (b.fixed || b === a) continue;
          let touch = false;
          world.contactPair(a.body.collider(0), b.body.collider(0),
            m => { if (m.numContacts() > 0) touch = true; });
          if (touch) pairs.add(a.name + "×" + b.name);
        }
      }
    }
    return { pairs: [...pairs], rings: window.__ringCount || (typeof ringCount !== "undefined" ? ringCount : "?") };
  });
  console.log("контакты покоя между динамикой:", JSON.stringify(out.pairs));
  console.log("звонков за 1.5с покоя:", out.rings);
  await browser.close();
})();
