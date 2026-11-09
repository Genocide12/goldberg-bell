const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  // запустить опыт, подождать звона, как в смоуке
  await page.click("#btnRun");
  await page.waitForFunction(() => /звонков [1-9]/.test(document.getElementById("hudStats").textContent),
    null, { timeout: 30000 });
  const out = await page.evaluate(() => {
    const cam = window.__cam;
    const t = window.__dbg.pos("ball");
    const v = new THREE.Vector3(t.x, t.y, 0).project(cam);
    const cv = document.querySelector("canvas");
    const r = cv.getBoundingClientRect();
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    const nx = (sx - r.left) / r.width * 2 - 1;
    const ny = -((sy - r.top) / r.height * 2 - 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera({ x: nx, y: ny }, cam);
    const hits = rc.intersectObjects(window.__scene.children, true);
    return {
      ball: { x: +t.x.toFixed(3), y: +t.y.toFixed(3) },
      screen: { x: +sx.toFixed(0), y: +sy.toFixed(0) },
      n: { x: +nx.toFixed(3), y: +ny.toFixed(3) },
      hits: hits.slice(0, 4).map(h => ({
        obj: h.object.type, dist: +h.distance.toFixed(2),
        pick: !!(h.object.userData && h.object.userData.pick) ||
               !!(h.object.parent && h.object.parent.userData && h.object.parent.userData.pick),
      })),
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
