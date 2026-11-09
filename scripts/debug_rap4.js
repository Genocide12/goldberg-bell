const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const { byName, stepOnce } = window.__dbg;
    const res = [];
    reset && null;
    // сбросить и вести оба шара
    for (const b of window.__dbg.bodies) if (!b.fixed) {
      b.body.setTranslation({ x: b.home.x, y: b.home.y }, true);
      b.body.setRotation(b.home.rot || 0, true);
      b.body.setLinvel({ x: 0, y: 0 }, true); b.body.setAngvel(0, true);
    }
    let simT0 = 0;
    window.__dbg.t0 = true;
    const rows = [];
    for (let s = 0; s < 240 * 8; s++) {
      stepOnce();
      if (s % 120 === 0) {
        const bl = byName.ball.translation(), mb = byName.marble.translation();
        const blv = byName.ball.linvel(), mv = byName.marble.linvel();
        rows.push("t=" + (s / 240).toFixed(1) +
          "  шар (" + bl.x.toFixed(2) + "," + bl.y.toFixed(2) + ") v=" + Math.hypot(blv.x, blv.y).toFixed(2) +
          " | шарик (" + mb.x.toFixed(2) + "," + mb.y.toFixed(2) + ") v=" + Math.hypot(mv.x, mv.y).toFixed(2) +
          " | dom0 " + (byName.dom0.rotation() * 180 / Math.PI).toFixed(0) + "°");
      }
    }
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
