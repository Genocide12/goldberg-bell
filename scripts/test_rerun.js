// Сброс и повторный запуск: полный цикл дважды.
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)));
  await page.goto("http://localhost:8901/index_v7.html?test=1", { waitUntil: "load" });
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  // 1-й прогон до короля
  await page.waitForFunction(() => window.__test && window.__test.crownFall, null, { timeout: 240000 });
  const run1 = await page.evaluate(() => window.__test);
  console.log("прогон 1: КОРОЛЬ на", run1.crownAt, "с, пирамида", run1.pyr + "/" + run1.pyrTotal);
  // сброс и повтор
  await page.evaluate(() => document.getElementById("btnRun").click());
  await page.waitForFunction(() => window.__test && window.__test.t < 3, null, { timeout: 30000 });
  console.log("сброс: карты восстановлены, t=", (await page.evaluate(() => window.__test.t)));
  await page.waitForFunction(() => window.__test && window.__test.crownFall, null, { timeout: 240000 });
  const run2 = await page.evaluate(() => window.__test);
  console.log("прогон 2: КОРОЛЬ на", run2.crownAt, "с, пирамида", run2.pyr + "/" + run2.pyrTotal);
  const ok = run1.crownAt !== null && run2.crownAt !== null && run1.crownAt === run2.crownAt &&
    errors.length === 0;
  console.log(ok ? "ПОВТОРНЫЙ ЗАПУСК: идентичен ✓" : "РАСХОЖДЕНИЕ: " + JSON.stringify({ r1: run1.crownAt, r2: run2.crownAt, errors: errors.slice(0, 2) }));
  await browser.close();
  process.exit(ok ? 0 : 2);
})();
