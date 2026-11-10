// Смоук v7 в headless-браузере: загрузка страницы, автозапуск,
// фазы цепочки, скриншоты ключевых моментов + итог по __test.
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e).slice(0, 300)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });

  await page.goto("http://localhost:8901/index_v7.html?test=1", { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  console.log("загрузка:", errors.length === 0 ? "OK, без JS-ошибок" : "ОШИБКИ: " + errors.slice(0, 3).join(" | "));

  // скриншот старта (до запуска авто)
  await page.screenshot({ path: "/home/z/my-project/work/v7_idle.png", timeout: 60000, animations: "disabled" });

  // ждём цепочку: __test обновляется каждый кадр
  const phases = [
    { name: "волна A+B пошли", cond: t => t.waveA >= 12 && t.waveB > 0, shot: "v7_waveAB" },
    { name: "волна C пошла", cond: t => t.waveC > 10, shot: "v7_waveC" },
    { name: "волна D + улица", cond: t => t.waveD > 10 && t.street > 0, shot: "v7_street" },
    { name: "пирамида рушится", cond: t => t.pyr > 30, shot: "v7_pyr" },
    { name: "КОРОЛЬ ПАЛ", cond: t => t.crownFall, shot: "v7_crown" },
  ];
  let pi = 0;
  const t0 = Date.now();
  while (pi < phases.length && Date.now() - t0 < 300000) {
    const t = await page.evaluate(() => window.__test);
    if (t && phases[pi].cond(t)) {
      console.log(`фаза «${phases[pi].name}»: t=${t.t}с A${t.waveA}/12 B${t.waveB}/36 C${t.waveC}/36 D${t.waveD}/36 улица${t.street}/8 пир${t.pyr}/108`);
      if (phases[pi].shot) await page.screenshot({ path: `/home/z/my-project/work/${phases[pi].shot}.png`, timeout: 60000, animations: "disabled" }).catch(() => console.log("скриншот пропущен:", phases[pi].shot));
      pi++;
    }
    await page.waitForTimeout(500);
  }
  console.log("фазы пройдено:", pi, "/", phases.length);

  // финальное состояние
  await page.waitForTimeout(4000);
  const t = await page.evaluate(() => window.__test);
  console.log("ФИНАЛ:", JSON.stringify(t));
  const ok = t.waveA === 12 && t.waveB >= 35 && t.waveC >= 35 && t.waveD >= 35 &&
    t.street >= 4 && t.pyr >= 90 && t.crownFall && t.sane;
  console.log(ok ? "\nСМОУК v7: ПРОЙДЕН ✓" : "\nСМОУК v7: НЕ ПОЛНОСТЬЮ — см. фазы");
  await browser.close();
  process.exit(ok && errors.length === 0 ? 0 : 2);
})();
