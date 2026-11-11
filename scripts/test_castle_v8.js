#!/usr/bin/env node
// test_castle.js — живой тест index_castle.html в headless Chrome:
// FPS, старт, фазы, король, скриншоты. window.__fps/__castle — тест-хуки.
const path = require("path");
(async () => {
  const p = require(path.resolve("/home/z/my-project/scripts", "node_modules", "puppeteer-core"));
  const b = await p.launch({
    executablePath: "/home/z/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome",
    headless: true, protocolTimeout: 180000,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--use-gl=swiftshader",
           "--enable-unsafe-swiftshader", "--disable-gpu-sandbox"],
  });
  const pg = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  pg.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  pg.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });

  const url = process.argv[2] || "http://localhost:8920/index_castle.html";
  await pg.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await new Promise(r => setTimeout(r, 2500));

  const idle = await pg.evaluate(() => ({
    cards: window.__castle.bodies.length,
    stats: window.__stats(),
    fps: window.__fps,
  }));
  console.log("старт:", JSON.stringify(idle));
  await pg.screenshot({ path: "/home/z/my-project/work/castle_idle.png" });

  // ЗАПУСК
  await pg.click("#goBtn");
  await new Promise(r => setTimeout(r, 1200));
  console.log("после старта 1.2с:", JSON.stringify(await pg.evaluate(() => window.__stats())));
  await pg.screenshot({ path: "/home/z/my-project/work/castle_run1.png" });

  // волна по кольцу
  await new Promise(r => setTimeout(r, 3000));
  console.log("4.2с:", JSON.stringify(await pg.evaluate(() => window.__stats())));
  await pg.screenshot({ path: "/home/z/my-project/work/castle_run2.png" });

  // башни/донжон
  await new Promise(r => setTimeout(r, 4000));
  console.log("8.2с:", JSON.stringify(await pg.evaluate(() => window.__stats())));
  await pg.screenshot({ path: "/home/z/my-project/work/castle_run3.png" });

  // финал
  await new Promise(r => setTimeout(r, 14000));
  const fin = await pg.evaluate(() => ({
    king: window.__kingFallen(), stats: window.__stats(), fps: window.__fps,
    phase: document.getElementById("phaseName").textContent,
  }));
  console.log("финал:", JSON.stringify(fin));
  await pg.screenshot({ path: "/home/z/my-project/work/castle_final.png" });

  console.log("FPS средний:", fin.fps && fin.fps.toFixed ? fin.fps.toFixed(1) : fin.fps);
  console.log("JS-ошибки:", errs.length ? errs.slice(0, 5) : "нет");
  await b.close();

  const ok = fin.king && fin.stats.fallen > 120 && !errs.filter(e=>!e.includes("404")).length;
  console.log(ok ? "=== BROWSER TEST PASS ===" : "=== BROWSER TEST FAIL ===");
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("FAIL:", e.message); process.exit(1); });
