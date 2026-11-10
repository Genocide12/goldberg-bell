// Быстрая проверка финального плана кино-камеры с dt-лерпом:
// локальный сервер + Playwright, ждём звона, снимаем кадр, смотрим
// где камера. Без VLM — проверяем числом: колокол (6.40) должен быть
// в пределах ±0.5 от target.x камеры в момент звона.
const { chromium } = require("playwright");
const http = require("http"); const fs = require("fs"); const path = require("path");
const ROOT = "/home/z/my-project/site";

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  const ct = p.endsWith(".html") ? "text/html" : "text/javascript";
  res.writeHead(200, { "content-type": ct }); fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(8911, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("http://127.0.0.1:8911/?test=1", { waitUntil: "load" });

  await page.bringToFront();
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  await page.waitForTimeout(1500);

  // прогон: звон → авто-стоп через 2.5с; замер камерой до и после
  await page.click("#btnRun");
  await page.evaluate(() => { cine = true; });   // ПОСЛЕ клика: btnRun в test-режиме ставит cine=false
  let ok = false, camMid = null;
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(1000);
    const st = await page.evaluate(() => ({
      t: window.__test ? window.__test.t : 0,
      rings: window.__test ? window.__test.rings : 0,
      cam: window.__camPos(), tg: window.__camTarget(),
      cine,
    })).catch(() => null);
    if (!st) continue;
    if (st.t > 10.5 && !camMid) camMid = st;   // поздний план (волна②/финал)
    if (st.rings > 0 || st.t >= 90) { if (st.rings > 0) ok = true; break; }
  }
  console.log("камера в финальном плане:", JSON.stringify(camMid));
  if (!ok) { console.log("прогон не дошёл до звона"); await browser.close(); process.exit(2); }

  // камера ПОСЛЕ звона (авто-стоп): план 5 — колокол в кадре?
  await page.waitForTimeout(3500);
  const cam = await page.evaluate(() => ({
    pos: window.__camPos(), target: window.__camTarget(),
    ev: document.querySelector("#hudEvent").textContent,
  }));
  await page.screenshot({ path: "/home/z/my-project/work/cam_final.png" });
  console.log("после звона:", JSON.stringify(cam));
  await browser.close(); server.close();
  process.exit(0);
})();
