// Живой тест GitHub Pages: v4, длинная цепочка до звона (~28 c симуляции).
const { chromium } = require("playwright");
const ok = [], bad = [];
const check = (n, c, e = "") => (c ? ok : bad).push(n + (c ? "" : `  ← ${JSON.stringify(e)}`));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e).slice(0, 200)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 150)); });

  await page.goto("https://genocide12.github.io/goldberg-bell/?test=1", { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  check("живая страница: без JS-ошибок", errors.length === 0, errors.slice(0, 2));

  await page.waitForFunction(() => window.__test && window.__test.rings > 0, null, { timeout: 240000 });
  const t = await page.evaluate(() => window.__test);
  check("звон на проде", t.rings > 0, t);
  check("обе волны упали (8+34)", t.wave1 === 8 && t.wave2 === 34, t);
  check("звон в 11-15с", t.firstBellT > 11 && t.firstBellT < 15, t.firstBellT);
  check("физика сана", t.sane, t);
  console.log("LIVE:", JSON.stringify(t));

  await page.screenshot({ path: "/home/z/my-project/work/live_v4.png" });
  await browser.close();

  for (const o of ok) console.log("PASS", o);
  for (const b of bad) console.log("FAIL", b);
  console.log(`LIVE: ${ok.length}/${ok.length + bad.length}`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
