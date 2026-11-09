// Headless-прогон физики в реальном Chromium: страница с ?test=1&autorun=16
// сама проигрывает опыт и выкладывает телеметрию в window.__test.
const path = require("path");

(async () => {
  const { chromium } = require("playwright");
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html") + "?test=1&autorun=16");
  // ждать готовности телеметрии
  await page.waitForFunction(() => window.__test && window.__test.t >= 15.5, null, { timeout: 120000 });
  const R = await page.evaluate(() => window.__test);
  await browser.close();

  console.log("ТЕЛЕМЕТРИЯ", JSON.stringify(R, null, 1));
  const ok = [], fail = [];
  const check = (name, cond, got) => (cond ? ok : fail).push(
    `${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : " — " + JSON.stringify(got)}`);
  check("все 8 домино упали", R.dominoes === 8, R.dominoes);
  check("колокол зазвонил (rings>0)", R.rings > 0, R.rings);
  check("стальной шар остался на столе (x 0.9..1.9)", R.ball.x > 0.9 && R.ball.x < 1.9, R.ball);
  check("стальной шар на высоте стола (y .56..70)", R.ball.y > 0.56 && R.ball.y < 0.70, R.ball);
  check("стальной шар остановился (KE<0.05)", R.ball.ke < 0.05, R.ball.ke);
  check("шарик ушёл со стола (x>1.9 или на полу)", R.marble.x > 1.9 || R.marble.y < 0.45, R.marble);
  check("шарик остановился у упора (x<8)", R.marble.x < 8 && R.marble.y > -0.5, R.marble);
  check("амплитуда колокола 5..90° (пик)", R.bellPeak > 5 && R.bellPeak < 90, R.bellPeak);
  check("звон пришёлся на момент удара (≤0.6с после старта финала)", (R.firstRing || 0) > 2 && (R.firstRing || 0) < 3.6, R.firstRing);
  check("колокол успокоился (<30°, AV<0.4)", Math.abs(R.bellDeg) < 30 && Math.abs(R.bellAV) < 0.4,
    [R.bellDeg, R.bellAV]);
  check("молоток успокоился (<80°, AV<0.6)", Math.abs(R.malletDeg) < 80 && Math.abs(R.malletAV) < 0.6,
    [R.malletDeg, R.malletAV]);
  check("страйкеры на нитях (<60°)", Math.abs(R.strikerL) < 60 && Math.abs(R.strikerR) < 60,
    [R.strikerL, R.strikerR]);
  check("система сана", R.sane, R.sane);

  console.log("\n" + ok.join("\n"));
  if (errors.length) { console.log("\nОШИБКИ СТРАНИЦЫ:"); errors.slice(0, 6).forEach(e => console.log(" ", e)); }
  if (fail.length || errors.length) { console.log("\n" + fail.join("\n")); process.exit(1); }
  console.log("\nALL " + ok.length + " CHECKS PASSED");
})();
