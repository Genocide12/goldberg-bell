// Смоук-тест в реальном браузере (Playwright + Chromium):
// загрузка страницы, запуск опыта, физика до звона, canvas не пустой,
// панель живых параметров работает, drag тел и орбита камеры не падают.
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

  // 1. базовые элементы
  const has = sel => page.locator(sel).count();
  const checks = [];
  checks.push(["canvas", await has("#cv") === 1]);
  checks.push(["кнопки", (await has("#btnRun")) === 1 && (await has("#btnPause")) === 1]);
  checks.push(["слайдеры", (await page.locator("#controls input[type=range]").count()) >= 14]);
  checks.push(["canvas имеет размеры", await page.evaluate(
    () => cv.width > 100 && cv.height > 100)]);

  // 2. canvas не пустой (после draw)
  const nonBlank = await page.evaluate(() => {
    const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 40)
      if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) n++;
    return n;
  });
  checks.push(["canvas отрисован (не пустой)", nonBlank > 50]);

  // 3. физика: запуск и ожидание звона
  await page.click("#btnRun");
  await page.waitForFunction(() => window.__ringEventSeen !== undefined || false, { timeout: 200 }).catch(() => {});
  // ожидаем события звона через HUD (rings>0) — прогоняем до 40 с максимум
  let ringsSeen = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    ringsSeen = await page.evaluate(() => {
      const m = hudStats.textContent.match(/звонков (\d+)/);
      return m ? +m[1] : 0;
    });
    if (ringsSeen > 0) break;
    await page.waitForTimeout(500);
  }
  checks.push(["опыт дошёл до звона (rings>0)", ringsSeen > 0]);

  // 4. живой параметр во время опыта: гравитация
  const stats1 = await page.evaluate(() => hudStats.textContent);
  await page.evaluate(() => {
    // гравитация x0.4 (почти Луна) — колокол должен замедлиться
    P.gravity = 3.0;
  });
  await page.waitForTimeout(1500);
  const stats2 = await page.evaluate(() => hudStats.textContent);
  checks.push(["живые параметры влияют (гравитация)", stats1 !== stats2]);

  // 5. слайдер меняет P и отображение
  await page.locator("#controls input[type=range]").first().evaluate(el => {
    el.value = 15; el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const grav = await page.evaluate(() => P.gravity);
  checks.push(["слайдер обновляет P.gravity", grav === 15]);

  // 6. пауза/продолжение
  await page.click("#btnPause");
  const paused = await page.evaluate(() => running === false);
  await page.keyboard.press("Space");
  const resumed = await page.evaluate(() => running === true);
  checks.push(["пауза/продолжение (Space)", paused && resumed]);

  // 7. drag тела: схватить шар1 и перетащить (в паузе двигается напрямую)
  const ballBefore = await page.evaluate(() => JSON.stringify(ball1.pos));
  const cvBox = await page.locator("#cv").boundingBox();
  // экранная позиция шара1 + страховка от NaN (если вдруг за камерой)
  let sp = await page.evaluate(() => {
    const s = cam.project({ x: ball1.pos.x, y: 0, z: ball1.pos.z });
    const r = cv.getBoundingClientRect();
    if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) return null;
    return { x: r.left + s.x * r.width / cv.width, y: r.top + s.y * r.height / cv.height,
             debug: { s: { x: s.x, y: s.y }, rw: r.width, cw: cv.width } };
  });
  if (!sp) {
    console.log("WARN: проекция шара невалидна, беру центр канваса");
    sp = { x: cvBox.x + cvBox.width / 2, y: cvBox.y + cvBox.height / 2 };
  } else {
    // ограничить в пределы вьюпорта
    sp.x = Math.max(5, Math.min(cvBox.x + cvBox.width - 5, sp.x));
    sp.y = Math.max(5, Math.min(cvBox.y + cvBox.height - 5, sp.y));
  }
  console.log("drag at", Math.round(sp.x), Math.round(sp.y));
  await page.mouse.move(sp.x, sp.y);
  await page.mouse.down();
  const moved = await page.evaluate(() => drag && drag.mode === "body");
  await page.mouse.move(sp.x + 120, sp.y + 60, { steps: 5 }).catch(e => console.log("move2 warn:", e.message.split("\n")[0]));
  await page.mouse.up();
  const ballAfter = await page.evaluate(() => JSON.stringify(ball1.pos));
  checks.push(["drag тела мышью", moved && ballBefore !== ballAfter]);

  // 8. орбита камеры
  const az1 = await page.evaluate(() => cam.azim);
  await page.mouse.move(cvBox.x + 640, cvBox.y + 200);
  await page.mouse.down();
  await page.mouse.move(cvBox.x + 740, cvBox.y + 260, { steps: 8 });
  await page.mouse.up();
  const az2 = await page.evaluate(() => cam.azim);
  checks.push(["орбита камеры мышью", Math.abs(az2 - az1) > 0.02]);

  // 9. сброс возвращает всё на место
  await page.click("#btnReset");
  const resetOK = await page.evaluate(() =>
    Math.abs(ball1.pos.x - ball1.home.x) < 1e-6 && ringCount === 0 && simT === 0);
  checks.push(["сброс восстанавливает сцену", resetOK]);

  // скриншот для ручной проверки
  await page.screenshot({ path: "/home/z/my-project/work/smoke_after_reset.png" });
  await page.click("#btnRun");
  await page.waitForTimeout(2500); // домино-фаза
  await page.screenshot({ path: "/home/z/my-project/work/smoke_run.png" });

  await browser.close();

  const fails = checks.filter(c => !c[1]);
  for (const [n, ok] of checks) console.log((ok ? "PASS " : "FAIL ") + n);
  if (errors.length) { console.log("\nОШИБКИ СТРАНИЦЫ:"); errors.forEach(e => console.log(" ", e)); }
  if (fails.length || errors.length) process.exit(1);
  console.log("\nSMOKE OK: " + checks.length + " проверок");
})();
