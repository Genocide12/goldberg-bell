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
    let last = "";
    for (let s = 0; s < 240 * 3; s++) {
      stepOnce();
      const t = byName.ball.translation();
      if (t.y < -0.5) { rows.push("шаг " + s + ": ШАР ПАДАЕТ СКВОЗЬ y=" + t.y.toFixed(2) +
        " v=" + JSON.stringify(byName.ball.linvel())); break; }
      if (s % 60 === 0) {
        const bl = byName.ball, tt = bl.translation(), v = bl.linvel();
        rows.push("шаг " + s + " шар (" + tt.x.toFixed(3) + "," + tt.y.toFixed(3) + ") v=(" +
          v.x.toFixed(2) + "," + v.y.toFixed(2) + ") rot=" + (bl.rotation() * 180 / Math.PI).toFixed(1));
      }
    }
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
