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
    let onChute = 0, onFloor = 0;
    for (let s = 0; s < 240 * 6; s++) {
      stepOnce();
      const mb = byName.marble, t = mb.translation();
      // детект: что под шариком (луч вниз на 0.1)
      const ray = new RAPIER.Ray({ x: t.x, y: t.y }, { x: 0, y: -1 });
      const hit = world.castRay(ray, 0.08, true, null, null, null, byName.marble.collider(0));
      if (s % 30 === 0 || (t.y < 0.3 && rows.length < 20))
        rows.push("шаг " + s + " шарик (" + t.x.toFixed(3) + "," + t.y.toFixed(3) +
          ") v=(" + mb.linvel().x.toFixed(2) + "," + mb.linvel().y.toFixed(2) + ")");
      if (t.y < 0.1 && rows.length < 25) rows.push("   !!! шарик НА ПОЛУ на шаге " + s);
      if (t.x > 3.4) { rows.push('   дошёл до финала на шаге ' + s + ' y=' + t.y.toFixed(3) + ' v=' + mb.linvel().x.toFixed(2)); break; }
      if (t.y < -1) break;
    }
    return rows;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
