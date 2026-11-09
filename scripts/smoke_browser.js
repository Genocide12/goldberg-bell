// Смоук-тест в реальном Chromium: загрузка, запуск до звона, canvas не пустой,
// drag тел, орбита камеры, пауза, сброс. Скриншоты в work/.
const path = require("path");

(async () => {
  const { chromium } = require("playwright");
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(700);

  const checks = [];
  const count = sel => page.locator(sel).count();
  checks.push(["кнопки на месте", (await count("#btnRun")) === 1 && (await count("#btnPause")) === 1
    && (await count("#btnReset")) === 1 && (await count("#btnSound")) === 1]);
  checks.push(["ползунков НЕТ (параметры убраны)", (await count("input[type=range]")) === 0]);
  checks.push(["canvas имеет размеры", await page.evaluate(() => cv.width > 100 && cv.height > 100)]);

  // canvas не пустой
  const ink = await page.evaluate(() => {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 40)
      if (d[i] < 230 || d[i + 1] < 225 || d[i + 2] < 210) n++;
    return n;
  });
  checks.push(["canvas отрисован (не пустой)", ink > 80]);
  await page.screenshot({ path: "/home/z/my-project/work/01_idle.png" });

  // запуск и ожидание звона
  await page.click("#btnRun");
  let rings = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 30000) {
    rings = await page.evaluate(() => {
      const m = hudStats.textContent.match(/звонков (\d+)/);
      return m ? +m[1] : 0;
    });
    if (rings > 0) break;
    await page.waitForTimeout(400);
  }
  checks.push(["опыт дошёл до звона (rings>0)", rings > 0]);
  await page.screenshot({ path: "/home/z/my-project/work/02_ring.png" });

  // пауза / продолжение
  await page.click("#btnPause");
  const paused = await page.evaluate(() => running === false);
  await page.keyboard.press("Space");
  const resumed = await page.evaluate(() => running === true);
  checks.push(["пауза/продолжение (Space)", paused && resumed]);

  // drag: схватить стальной шар и перенести
  const before = await page.evaluate(() => JSON.stringify(ball.pos));
  const sp = await page.evaluate(() => {
    const s = cam.project({ x: ball.pos.x, y: 0, z: ball.pos.z });
    if (!s) return null;
    const r = cv.getBoundingClientRect();
    return { x: r.left + s.x * r.width / cv.width, y: r.top + s.y * r.height / cv.height };
  });
  if (sp) {
    await page.mouse.move(sp.x, sp.y);
    await page.mouse.down();
    const holding = await page.evaluate(() => drag && drag.mode === "body");
    await page.mouse.move(sp.x + 100, sp.y + 40, { steps: 6 }).catch(() => {});
    await page.mouse.up();
    const after = await page.evaluate(() => JSON.stringify(ball.pos));
    checks.push(["drag тела мышью", holding && before !== after]);
  } else checks.push(["drag тела мышью", false]);

  // орбита камеры
  const az1 = await page.evaluate(() => cam.azim);
  const box = await page.locator("#cv").boundingBox();
  await page.mouse.move(box.x + 300, box.y + 300);  // пустое место (не тело)
  await page.mouse.down();
  await page.mouse.move(box.x + 420, box.y + 360, { steps: 8 });
  await page.mouse.up();
  const az2 = await page.evaluate(() => cam.azim);
  checks.push(["орбита камеры мышью", Math.abs(az2 - az1) > 0.02]);

  // сброс восстанавливает сцену
  await page.click("#btnReset");
  const resetOK = await page.evaluate(() =>
    Math.abs(ball.pos.x - ball.home.x) < 1e-6 && ringCount === 0 && simT === 0);
  checks.push(["сброс восстанавливает сцену", resetOK]);
  await page.screenshot({ path: "/home/z/my-project/work/03_reset.png" });

  await browser.close();

  const fails = checks.filter(c => !c[1]);
  for (const [n, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + n);
  if (errors.length) { console.log("\nОШИБКИ СТРАНИЦЫ:"); errors.forEach(e => console.log(" ", e)); }
  if (fails.length || errors.length) process.exit(1);
  console.log("\nSMOKE OK: " + checks.length + " проверок");
})();
