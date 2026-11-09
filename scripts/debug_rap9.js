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
    // перехват drainCollisionEvents: посчитаем все события с kind
    let evCount = 0, evPairs = [];
    const origStep = stepOnce;
    const rows = [];
    for (let s = 0; s < 240 * 8; s++) {
      // ручной шаг: событийный дрен в наш сборщик
      window.__dbg.stepOnce();
      evCount = window.__dbg.evCount || 0;
      if (s % 240 === 0 && s / 240 > 2) {
        rows.push("t=" + (s / 240).toFixed(0) + "с peak=" + ((window.__peakBell) || 0).toFixed(1) +
          "° rings=" + (window.__ringCount || 0) + " bell=" +
          (byName.bell.rotation() * 180 / Math.PI).toFixed(1) + "° w=" + byName.bell.angvel().toFixed(2));
      }
    }
    // и глобально: window.__ringCount существует? проверить и сам счётчик:
    rows.push("окно __ringCount: " + (window.__ringCount !== undefined ? window.__ringCount : "НЕТ") +
      " | локальный ringCount: " + (typeof ringCount !== "undefined" ? ringCount : "?"));
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
