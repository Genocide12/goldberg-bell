// Чистые кадры v7: idle (город стоит) + ключевые фазы с зумом.
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)));
  await page.goto("http://localhost:8901/index_v7.html?test=1", { waitUntil: "load" });
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  // свободная камера: общий план города (кино-камера off)
  await page.evaluate(() => { window.cine_set(false); });
  await page.evaluate(() => {
    // общий план сверху-сбоку: весь город
    window.__setCam = null;
  });
  const cam = page.evaluate(() => window.__camPos && window.__camPos());
  // выставим камеру через OrbitControls напрямую
  await page.evaluate(() => {
    // eslint-disable-next-line
    const ev = new KeyboardEvent("keydown", { key: "c" });
    dispatchEvent(ev);   // выключить кино (уже off)
  });
  // камера вручную: позиция + target через экспорт-хелперы нельзя,
  // используем drag-эмуляцию? Проще: включить кино и НЕ запускать —
  // кино-камера до старта показывает план 1 (близко к первой карте).
  // Поэтому снимем idle двумя способами:
  await page.screenshot({ path: "/home/z/my-project/work/v7_city_idle.png", timeout: 60000, animations: "disabled" });
  // Теперь запускаем и снимаем фазы
  // автозапуск уже сработал (?test=1)
  const marks = [
    { name: "waveB", cond: t => t && t.waveB >= 10 && t.waveB < 30, shot: "v7_waveB2" },
    { name: "street", cond: t => t && t.street > 0 && t.pyr < 20, shot: "v7_street2" },
    { name: "pyr", cond: t => t && t.pyr > 40 && t.pyr < 100, shot: "v7_pyr2" },
    { name: "crown", cond: t => t && t.crownFall, shot: "v7_crown2" },
  ];
  for (const mk of marks) {
    const t0 = Date.now();
    while (Date.now() - t0 < 120000) {
      const t = await page.evaluate(() => window.__test || null);
      if (t && mk.cond(t)) break;
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `/home/z/my-project/work/${mk.shot}.png`, timeout: 45000, animations: "disabled" }).catch(e => console.log("скрин пропущен", mk.name));
    console.log("снят:", mk.name);
  }
  console.log("errors:", errors.length, errors.slice(0, 2));
  await browser.close();
})();
