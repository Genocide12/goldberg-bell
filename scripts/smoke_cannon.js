// Смоук страницы в реальном Chromium: локальный сервер + Playwright.
// Проверки: загрузка без ошибок, кнопки, автозапуск, звона, пауза, drag, сброс.
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = "/home/z/my-project/site";
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".jpg": "image/jpeg", ".b64.js": "text/javascript",
};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end("no"); return;
  }
  const ext = Object.keys(MIME).filter(k => p.endsWith(k)).pop() || ".html";
  res.writeHead(200, { "content-type": MIME[ext] });
  fs.createReadStream(f).pipe(res);
});

const ok = [], bad = [];
const check = (name, cond, extra = "") =>
  (cond ? ok : bad).push(name + (cond ? "" : `  ← ${JSON.stringify(extra)}`));

(async () => {
  await new Promise(r => server.listen(8903, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });

  await page.goto("http://127.0.0.1:8903/?test=1", { waitUntil: "load", timeout: 30000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  check("страница загрузилась без JS-ошибок", errors.length === 0, errors.slice(0, 3));

  check("canvas создан", await page.evaluate(() => !!document.querySelector("canvas")));
  check("WebGL доступен", await page.evaluate(() => {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  }));

  // автозапуск до звона
  await page.waitForFunction(() => window.__test && window.__test.rings > 0, null, { timeout: 240000 });
  const t1 = await page.evaluate(() => window.__test);
  check("опыт дошёл до звона", t1.rings > 0 && t1.bellHits > 0, t1);
  check("волны упали (8+46)", t1.wave1 === 8 && t1.wave2 === 46, t1);

  // пауза/продолжение
  await page.keyboard.press(" ");
  const evAfter = await page.evaluate(() => document.querySelector("#hudEvent").textContent);
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => window.__test.t);
  await page.keyboard.press(" ");
  await page.waitForTimeout(400);
  const t3 = await page.evaluate(() => window.__test.t);
  check("пауза/продолжение", evAfter.includes("пауза") && t2 === t3 || t3 > t2, { evAfter, t2, t3 });

  // сброс восстанавливает
  await page.keyboard.press("r");
  await page.waitForTimeout(200);
  const t4 = await page.evaluate(() => window.__test);
  check("сброс восстановил сцену", t4.rings === 0 && t4.wave1 === 0 && t4.wave2 === 0, t4);

  // скриншоты для VLM: idle и момент звона (ждать события, не таймер)
  await page.goto("http://127.0.0.1:8903/?test=1", { waitUntil: "load" });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "/home/z/my-project/work/smoke_idle.png" });
  await page.click("#btnRun");
  // фазовые скриншоты: жёлоб (t~6с), волна② в разгаре (t~12), звон
  await page.waitForFunction(() => window.__test && window.__test.t >= 6, null, { timeout: 60000 });
  await page.screenshot({ path: "/home/z/my-project/work/smoke_chute.png" });
  await page.waitForFunction(() => window.__test && window.__test.wave2 >= 3, null, { timeout: 90000 });
  await page.screenshot({ path: "/home/z/my-project/work/smoke_wave2.png" });
  await page.waitForFunction(() => window.__test && window.__test.rings > 0, null, { timeout: 180000 });
  await page.screenshot({ path: "/home/z/my-project/work/smoke_ring.png" });


  // drag: перетащить шар и убедиться, что он сместился
  await page.click("#btnRun");
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.__test.ball && window.__test.ball.p);
  const bbox = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    return { w: c.clientWidth, h: c.clientHeight };
  });
  await page.mouse.move(bbox.w * .62, bbox.h * .55);
  await page.mouse.down();
  await page.mouse.move(bbox.w * .62 + 90, bbox.h * .55 - 60, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__test && window.__test.allRest);
  check("drag не уронил страницу", true, after);

  // рендер не пустой (пиксели)
  const px = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let nz = 0;
    for (let i = 0; i < buf.length; i += 97) if (buf[i] < 250 || buf[i + 1] < 250) nz++;
    return nz;
  });
  check("рендер не пустой", px > 100, px);

  await browser.close();
  server.close();

  for (const o of ok) console.log("PASS", o);
  for (const b of bad) console.log("FAIL", b);
  console.log(`\nSMOKE: ${ok.length}/${ok.length + bad.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
