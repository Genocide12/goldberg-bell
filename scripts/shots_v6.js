// Фазовые скриншоты с ЖИВОЙ страницы Pages (v6-шоу).
// Снимает: idle, жёлоб с ладами-нотами (t~7.4), волна② (w2≥12), финал-звон.
// Флажок headless (волна иногда замирает) лечим рестартами: до 5 попыток,
// фазовые снимки делаем в удачном прогоне.
const { chromium } = require("playwright");

const URL = process.argv[2] || "https://genocide12.github.io/goldberg-bell/";
const OUT = process.argv[3] || "/home/z/my-project/work/shot";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(URL + "?test=1", { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: OUT + "_idle.png" });
  console.log("idle снят, ошибки:", errors.length ? errors.slice(0, 2) : "нет");

  // ДО 5 ПОПЫТОК-ПРОГРЕВОВ: ждём либо звона, либо замирания
  // (t упёрся в 90/таймаут). Паттерн: свежая страница замерает в 1-м
  // прогоне, повторный — проходит.
  let ok = false;
  for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
    if (attempt > 1) await page.waitForTimeout(500);
    let prevT = -1, stuckCycles = 0, gaveUp = false;
    for (let i = 0; i < 90; i++) {           // опрос до ~135с
      await page.waitForTimeout(1500);
      const t = await page.evaluate(() => window.__test).catch(() => null);
      if (!t) continue;
      if (t.rings > 0) { ok = true; break; }
      if (t.t >= 90) { gaveUp = true; break; }        // опыт-таймаут без звона
      stuckCycles = t.t === prevT ? stuckCycles + 1 : 0;   // simT не растёт
      prevT = t.t;
      if (stuckCycles >= 8) { gaveUp = true; break; }  // ~12с без движения
    }
    console.log("прогрев", attempt, ok ? "ЗВОН ✓" : gaveUp ? "замерла" : "таймаут");
  }

  // теперь прогрето: прогон с фазовыми снимками (тоже с рестартами при замере)
  let shot = { notes: false, wave2: false, ring: false };
  for (let attempt = 1; attempt <= 5 && !(shot.notes && shot.wave2 && shot.ring); attempt++) {
    await page.click("#btnRun");
    let prevT = -1, stuck = 0;
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(1200);
      const t = await page.evaluate(() => window.__test).catch(() => null);
      if (!t) continue;
      if (!shot.notes && t.t >= 7.4 && t.t < 8.4) {
        await page.screenshot({ path: OUT + "_notes.png" }); shot.notes = true;
      }
      if (!shot.wave2 && t.wave2 >= 12 && t.rings === 0) {
        await page.screenshot({ path: OUT + "_wave2.png" }); shot.wave2 = true;
      }
      if (t.rings > 0 && !shot.ring) {
        await page.screenshot({ path: OUT + "_ring.png" }); shot.ring = true;
      }
      if (shot.notes && shot.wave2 && shot.ring) break;
      if (t.t >= 90 || (t.t === prevT && ++stuck > 10)) break;   // замерла — рестарт
      if (t.t !== prevT) stuck = 0;
      prevT = t.t;
    }
    console.log("прогон-снимки", attempt, JSON.stringify(shot));
  }
  const t = await page.evaluate(() => window.__test);
  console.log("финал:", JSON.stringify(t));
  console.log("ошибки за опыт:", errors.length ? errors.slice(0, 3) : "нет");
  await browser.close();
  process.exit(errors.length || !shot.ring ? 1 : 0);
})();
