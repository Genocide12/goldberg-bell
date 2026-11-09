// Проверка «натуральности» рендера: цвет в canvas ровно под каждым телом
const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForTimeout(800);

  const res = await page.evaluate(() => {
    const W = cv.width, H = cv.height;
    const pick = (x3, y3, z3) => {
      const s = cam.project({ x: x3, y: y3, z: z3 });
      if (!s) return null;
      const ix = Math.round(s.x), iy = Math.round(s.y);
      if (ix < 2 || iy < 2 || ix > W - 3 || iy > H - 3) return null;
      const d = ctx.getImageData(ix - 1, iy - 1, 3, 3).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < 36; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      return { x: ix, y: iy, rgb: [Math.round(r / 9), Math.round(g / 9), Math.round(b / 9)] };
    };
    const belt = () => {  // горизонтальная полоса пола на глубине y=+1.0
      const pts = [];
      for (let x = -0.5; x <= 5.5; x += 0.5) {
        const p = pick(x, 1.2, 0.004);
        if (p) pts.push(p.rgb);
      }
      return pts.length ? pts.reduce((a, p) => [Math.round((a[0]+p[0]/pts.length)), 0, 0] && [0,0,0], [0,0,0]) : null;
    };
    // средний цвет пола: 8 сэмплов
    const floorSamples = [];
    for (const [x, y] of [[-0.5, 1.2], [0.5, 1.2], [1.5, 1.2], [2.5, 1.2], [3.5, 1.2], [4.5, 1.2], [5.5, 1.2], [2.5, -1.2]]) {
      const p = pick(x, y, 0.004);
      if (p) floorSamples.push(p.rgb);
    }
    const avg = a => a.length ? [0,1,2].map(i => Math.round(a.reduce((s,p)=>s+p[i],0)/a.length)) : null;
    return {
      W, H,
      ball: pick(ball.pos.x, 0, ball.pos.z),        // центр стального шара
      marble: pick(marble.pos.x, 0, marble.pos.z),  // центр стеклянного шарика
      dom0: pick(dominoes[0].pos.x, 0.0225, dominoes[0].pos.z),  // лицо, между крестиками
      bellSide: pick(bell.pos.x - 0.03, 0, bell.pos.z + 0.01),          // бок колокола
      bellMouth: pick(bell.pos.x, 0, bell.pos.z - 0.075),               // горло
      clapper: pick(clapper.pos.x, 0, clapper.pos.z),                    // язычок
      malletFace: pick(mallet.pos.x - 0.005, 0.03, mallet.pos.z),        // лицо лопасти
      rampTop: (() => {  // верхняя грань горки между волокнами
        const t = 0.35, x = RAMP_TOP.x + Math.cos(RAMP_A)*RAMP_L*t,
              z = RAMP_TOP.z - Math.sin(RAMP_A)*RAMP_L*t + 0.0085;
        return pick(x, 0, z); })(),
      floorAvg: avg(floorSamples),
      bg: pick(0, -2.0, 2.5) || pick(5.0, -2.0, 2.5),                   // фон-бумага
    };
  });
  console.log(JSON.stringify(res, null, 1));

  // проверки материалов
  const near = (c, t, tol) => c && Math.abs(c[0]-t[0])<tol && Math.abs(c[1]-t[1])<tol && Math.abs(c[2]-t[2])<tol;
  const warm = c => c && c[0] > c[2] + 25 && c[0] > 140; // тёплый деревянный тон
  const checks = [
    ["стальной шар — серый/холодный", res.ball && res.ball.rgb[2] >= res.ball.rgb[0] - 12 && res.ball.rgb[0] > 90, res.ball],
    ["стекло шарик — голубоватый", res.marble && res.marble.rgb[2] > res.marble.rgb[0], res.marble],
    ["домино — светлая кость", res.dom0 && res.dom0.rgb[0] > 200 && res.dom0.rgb[2] > 180, res.dom0],
    ["колокол — латунный тёплый", res.bellSide && warm(res.bellSide.rgb) && res.bellSide.rgb[0] > 120, res.bellSide],
    ["горло колокола — тёмное", res.bellMouth && res.bellMouth.rgb[0] < 110, res.bellMouth],
    ["язычок — латунный", res.clapper && warm(res.clapper.rgb), res.clapper],
    ["лопасть — дерево", res.malletFace && warm(res.malletFace.rgb), res.malletFace],
    ["горка — дерево", res.rampTop && warm(res.rampTop.rgb) || (res.rampTop && res.rampTop.rgb[0] > 100), res.rampTop],
    ["пол — тёплое дерево", res.floorAvg && warm(res.floorAvg) && res.floorAvg[0] > 150, res.floorAvg],
    ["фон — бумага", res.bg && res.bg.rgb[0] > 235, res.bg],
  ];
  for (const [n, ok, got] of checks)
    console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : " — " + JSON.stringify(got)));
  await browser.close();
  const fails = checks.filter(c => !c[1]);
  if (fails.length) process.exit(1);
  console.log("\nMATERIALS OK");
})();
