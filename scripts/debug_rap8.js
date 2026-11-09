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
    for (let s = 0; s < 240 * 6; s++) {
      stepOnce();
      if (s % 120 === 0 && (s/240) > 2.2) {
        const g = n => { const t = byName[n].translation();
          return n + " (" + t.x.toFixed(2) + "," + t.y.toFixed(2) + ") " +
            (byName[n].rotation() * 180 / Math.PI).toFixed(1) + "° w=" + byName[n].angvel().toFixed(2); };
        const mb = byName.marble.translation();
        rows.push("t=" + (s / 240).toFixed(0) + "с  " + g("mallet") + " | " + g("bell") +
          " | sL " + (byName.strikerL.rotation() * 180 / Math.PI).toFixed(0) + "°" +
          " sR " + (byName.strikerR.rotation() * 180 / Math.PI).toFixed(0) + "°" +
          " | шарик (" + mb.x.toFixed(2) + "," + mb.y.toFixed(2) + ") v=" +
          Math.hypot(byName.marble.linvel().x, byName.marble.linvel().y).toFixed(2) +
          " | sLxy (" + byName.strikerL.translation().x.toFixed(2) + "," + byName.strikerL.translation().y.toFixed(2) + ")");
      }
    }
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
