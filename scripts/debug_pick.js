const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  const out = await page.evaluate(() => {
    const cam = window.__cam;
    const t = window.__dbg.pos("ball");
    const v = new THREE.Vector3(t.x, t.y, 0).project(cam);
    const cv = document.querySelector("canvas");
    const r = cv.getBoundingClientRect();
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    // raycast прямо в эту точку
    const nx = (sx - r.left) / r.width * 2 - 1;
    const ny = -((sy - r.top) / r.height * 2 - 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera({ x: nx, y: ny }, cam);
    const hits = rc.intersectObjects(window.__scene.children, true);
    return {
      screen: { x: sx, y: sy },
      n: { x: nx, y: ny },
      hits: hits.slice(0, 5).map(h => ({
        obj: h.object.type + (h.object.userData && h.object.userData.pick ? "+pick" : ""),
        dist: +h.distance.toFixed(3),
        hasPick: !!(h.object.userData && h.object.userData.pick),
        parentHas: !!(h.object.parent && h.object.parent.userData && h.object.parent.userData.pick),
      })),
      sceneChildren: window.__scene.children.map(c => c.type + (c.userData.pick ? "+pick" : "")).slice(0, 12),
    };
  });
  console.log(JSON.stringify(out, null, 1).slice(0, 900));
  await browser.close();
})();
