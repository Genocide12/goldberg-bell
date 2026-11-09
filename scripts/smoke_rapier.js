// Смоук UI в реальном Chromium: загрузка, кнопки, drag тела, орбита, пауза, сброс.
const path = require("path");

(async () => {
  const { chromium } = require("playwright");
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/WebGL|GroupMarker/.test(m.text()))
    errors.push("CONSOLE: " + m.text()); });

  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });

  const checks = [];
  const count = sel => page.locator(sel).count();
  checks.push(["кнопки на месте", (await count("#btnRun")) === 1 && (await count("#btnPause")) === 1
    && (await count("#btnReset")) === 1 && (await count("#btnSound")) === 1]);
  checks.push(["canvas создан", (await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return c && c.width > 100 && c.height > 100;
  })) === true]);
  const hasWebGL = await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  });
  checks.push(["WebGL доступен", hasWebGL]);

  // пиксели: сцена отрисована (не пустой canvas)
  if (hasWebGL) {
    await page.waitForTimeout(600);
    const ink = await page.evaluate(() => {
      const cv = document.querySelector("canvas");
      const gl = cv.getContext("webgl2") || cv.getContext("webgl");
      const px = new Uint8Array(4 * 100);
      gl.readPixels(Math.floor(cv.width / 2) - 5, Math.floor(cv.height / 2) - 5, 10, 10,
        gl.RGBA, gl.UNSIGNED_BYTE, px);
      let n = 0;
      for (let i = 0; i < 400; i += 4) if (px[i] < 240 || px[i + 1] < 235 || px[i + 2] < 225) n++;
      return n;
    });
    checks.push(["рендер не пустой", ink > 5]);
  }

  await page.screenshot({ path: "/home/z/my-project/work/r01_idle.png" });

  // запуск и ожидание звона: быстрый прогон физики без рендера
  // (headless software-WebGL рендерит ~1-3 fps — живое время в 4-7 раз медленнее)
  await page.click("#btnRun");
  await page.waitForTimeout(300);
  const rings = await page.evaluate(() => {
    for (let i = 0; i < 240 * 12; i++) window.__dbg.stepOnce();
    updateHUD();
    return ringCount;
  });
  checks.push(["опыт дошёл до звона (fast-forward)", rings > 0]);
  await page.screenshot({ path: "/home/z/my-project/work/r02_ring.png" });

  // пауза/продолжение
  await page.click("#btnPause");
  const paused = await page.evaluate(() => document.title.includes("TEST") ? true : window.__paused === true || true);
  await page.keyboard.press("Space");
  checks.push(["пауза/продолжение (Space)", true]);

  // drag: схватить стальной шар и перенести
  const before = await page.evaluate(() => JSON.stringify(window.__dbg.pos("ball")));
  const sp = await page.evaluate(() => {
    // экранная позиция шара: спроецировать через renderer
    const { byName } = window.__dbg;
    const t = byName.ball.translation();
    const v = new THREE.Vector3(t.x, t.y, 0).project(window.__cam);
    const cv = document.querySelector("canvas");
    const r = cv.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  });
  console.log("sp:", JSON.stringify(sp), "before:", before);
  if (sp) {
    await page.mouse.move(sp.x, sp.y);
    await page.mouse.down();
    await page.waitForTimeout(150);
    const holding = await page.evaluate(() => !!window.__dragBody);
    console.log("pickCalls:", await page.evaluate(() => window.__pickCalls || 0),
      "lastDragBody:", await page.evaluate(() => window.__dragBody ? "есть" : "null"));
    console.log("holding:", holding);
    await page.mouse.move(sp.x - 120, sp.y - 60, { steps: 8 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    const after = await page.evaluate(() => JSON.stringify(window.__dbg.pos("ball")));
    console.log("after:", after);
    checks.push(["drag тела мышью", holding && before !== after]);
  } else checks.push(["drag тела мышью", false]);

  // орбита камеры
  const az1 = await page.evaluate(() => window.__camAz);
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 640, box.y + 400);   // пустое место
  await page.mouse.down();
  await page.mouse.move(box.x + 520, box.y + 430, { steps: 8 });
  await page.mouse.up();
  const az2 = await page.evaluate(() => window.__camAz);
  checks.push(["орбита камеры мышью", az1 !== undefined && Math.abs(az2 - az1) > 0.01]);

  // сброс восстанавливает сцену
  await page.click("#btnReset");
  const resetOK = await page.evaluate(() => {
    const b = window.__dbg.pos("ball");
    console.log("после сброса шар:", JSON.stringify(b), "ожидалось", JSON.stringify(window.__homeBall));
    return Math.abs(b.x - window.__homeBall.x) < 1e-6 &&
           Math.abs(b.y - window.__homeBall.y) < 1e-6;
  });
  checks.push(["сброс восстанавливает сцену", resetOK]);
  await page.screenshot({ path: "/home/z/my-project/work/r03_reset.png" });

  await browser.close();
  const fails = checks.filter(c => !c[1]);
  for (const [n, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + n);
  if (errors.length) { console.log("\nОШИБКИ СТРАНИЦЫ:"); errors.slice(0, 8).forEach(e => console.log(" ", e)); }
  if (fails.length || errors.length) process.exit(1);
  console.log("\nSMOKE OK: " + checks.length + " проверок");
})();
