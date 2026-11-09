const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1");
  await page.waitForFunction(() => window.__dbg, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    // минимальный мир: два шара с зазором 4 мм — что вернёт contactPair?
    const W = new RAPIER.World({ x: 0, y: 0 });
    const a = W.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0));
    const b = W.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0.028, 0));  // зазор 4 мм (r=12)
    const ca = W.createCollider(RAPIER.ColliderDesc.ball(0.012), a);
    const cb = W.createCollider(RAPIER.ColliderDesc.ball(0.012), b);
    W.step();
    let calls = 0, contacts = 0;
    W.contactPair(ca, cb, (m, f) => { calls++; contacts = m.numContacts(); });
    const res = { calls, contacts, gap: 0.028 - 0.024 };
    // и правда касающиеся:
    const c = W.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0.02, 0.3));
    const cc = W.createCollider(RAPIER.ColliderDesc.ball(0.012), c);
    W.step();
    let tc = 0;
    W.contactPair(ca, cc, (m, f) => { tc = m.numContacts(); });
    res.touchCase = tc;
    return res;
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
