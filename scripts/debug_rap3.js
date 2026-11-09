const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const { byName } = window.__dbg;
    const res = [];
    const dump = nm => {
      const b = byName[nm];
      const t = b.translation();
      const n = b.numColliders ? b.numColliders() : 0;
      const ci = [];
      for (let i = 0; i < n; i++) {
        const col = b.collider(i);
        let half = "?";
        try { const sh = col.shape();
          if (sh && sh.type !== undefined) half = "shapeType=" + sh.type;
        } catch (e) { half = "shape?"; }
        // габарит по «сырым» данным: используем world AABB из RawCollisionEvent? проще —
        // выведем геометрию, которую знаем, через world.computeAABB? нет такой. Возьмём
        // брошенный луч вниз и найдём hit:
        ci.push("coll#" + i + " " + half);
      }
      // луч вниз из центра тела + 0.001
      const ray = new RAPIER.Ray({ x: t.x, y: t.y + 0.001 }, { x: 0, y: -1 });
      const hit = world.castRay(ray, 3.0, true, null, null, null, undefined, b);
      res.push(nm + " (" + t.x.toFixed(3) + "," + t.y.toFixed(3) + ") rot " +
        (b.rotation() * 180 / Math.PI).toFixed(1) + "° coll=" + n +
        " " + ci.join("|") +
        (hit ? (" ЛУЧ hit=" + hit.timeOfImpact.toFixed(4)) : " ЛУЧ: мимо"));
    };
    for (const nm of ["ramp", "ball", "dom0", "runway2", "chute"])
      dump(nm);
    return res;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
