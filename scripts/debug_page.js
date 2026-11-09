const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  page.on("console", m => console.log("[" + m.type() + "]", m.text().slice(0, 300)));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1&autorun=16");
  await page.waitForTimeout(4000);
  console.log("title:", await page.title());
  console.log("__test:", await page.evaluate(() => window.__test ? JSON.stringify(window.__test).slice(0, 200) : "нет"));
  await browser.close();
})();
