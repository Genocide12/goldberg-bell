// Полный тест на ЖИВОМ GitHub Pages
const url = "https://genocide12.github.io/goldberg-bell/?test=1&autorun=16";
(async () => {
  const { chromium } = require("playwright");
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/WebGL|GroupMarker/.test(m.text()))
    errors.push("CONSOLE: " + m.text()); });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => window.__test && window.__test.t >= 15.5, null, { timeout: 120000 });
  const R = await page.evaluate(() => window.__test);
  await browser.close();
  console.log("LIVE", JSON.stringify({ t: R.t, rings: R.rings, dom: R.dominoes,
    ball: R.ball, marble: R.marble, bellPeak: R.bellPeak, sane: R.sane }));
  const ok = [], fail = [];
  const check = (n, c, g) => (c ? ok : fail).push((c ? "PASS " : "FAIL ") + n + (c ? "" : " — " + JSON.stringify(g)));
  check("домино 8/8", R.dominoes === 8, R.dominoes);
  check("звон", R.rings > 0, R.rings);
  check("пик колокола 8..90°", R.bellPeak > 8 && R.bellPeak < 90, R.bellPeak);
  check("шар на столе", R.ball.x > 0.9 && R.ball.x < 1.9 && R.ball.y > 0.56, R.ball);
  check("шарик на полу у машины", R.marble.x > 1.9 && R.marble.x < 6, R.marble);
  check("сана", R.sane, R.sane);
  console.log(ok.join("\n"));
  if (errors.length) { console.log("ОШИБКИ:"); errors.slice(0, 5).forEach(e => console.log(" ", e)); }
  if (fail.length || errors.length) process.exit(1);
  console.log("\nLIVE OK");
})();
