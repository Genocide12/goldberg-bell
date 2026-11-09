// Свежие скриншоты для аудита: общий вид + крупные планы проблемных узлов
const path = require("path");
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("pageerror", e => console.log("PAGEERROR:", e.message));
  await page.goto("file://" + path.resolve("/home/z/my-project/site/index.html"));
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(800);

  const cam = (pos, tgt) => page.evaluate(([p, t]) => {
    window.__ctl.target.set(...t);      // цель орбиты — иначе controls вернёт взгляд
    window.__cam.position.set(...p);
    window.__cam.lookAt(...t);
    window.__ctl.update();
  }, [pos, tgt]);

  // 1. общий вид
  await cam([3.6, 2.0, 3.4], [2.1, 0.45, 0]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/home/z/my-project/work/audit_full.png" });

  // 2. стык: горка → стол → домино (крупно, сбоку)
  await cam([0.9, 1.1, 1.6], [1.05, 0.68, 0]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/home/z/my-project/work/audit_joint.png" });

  // 3. портал: молот, колокол, страйкеры, перекладина (крупно, спереди-сбоку)
  await cam([3.3, 1.35, 1.5], [3.15, 0.55, 0]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/home/z/my-project/work/audit_portal.png" });

  // 4. обрыв стола + жёлоб + подача в молот
  await cam([2.3, 0.9, 1.3], [2.35, 0.42, 0]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/home/z/my-project/work/audit_chute.png" });

  await browser.close();
  console.log("OK 4 снимка");
})();
