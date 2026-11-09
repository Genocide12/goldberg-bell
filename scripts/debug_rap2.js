const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const { world, byName, stepOnce, bodies } = window.__dbg;
    const res = [];
    const contactsOf = (nm) => {
      const b = byName[nm];
      const list = [];
      world.contactsWith(b.collider(0) ? b.collider(0) : world.getCollider(0), () => {});
      // проще: enumerate
      return list;
    };
    for (let s = 0; s < 200; s++) stepOnce();
    const ball = byName.ball;
    const t = ball.translation();
    res.push("шар: " + t.x.toFixed(4) + "," + t.y.toFixed(4));
    // все контакты шар:
    world.contactPairsWith ? null : null;
    // перебор всех пар «вручную» не нужен: переберём все тела и contactPair с шаром
    const ballCol = ball.collider(0) || ball.colliders()[0];
    for (const bd of bodies) {
      if (bd.name === "ball") continue;
      const other = bd.body;
      const cols = other.colliders ? other.colliders() : [];
      for (const oc of cols) {
        let found = null;
        world.contactPair(ballCol, oc, (m, f) => { if (m.numContacts() > 0) found = m.numContacts(); });
        if (found) res.push("КОНТАКТ шар×" + bd.name + " точек=" + found);
      }
    }
    // скорости
    const v = ball.linvel();
    res.push("v=" + v.x.toFixed(3) + "," + v.y.toFixed(3) + " w=" + ball.angvel().toFixed(3));
    res.push("sleeping? " + ball.isSleeping());
    return res;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
