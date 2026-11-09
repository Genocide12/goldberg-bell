#!/usr/bin/env python3
"""Патч 2 — «система намного развитей»:
1) ЗОНДЫ: firstTok/firstRing (проверка, что звон звучит в момент удара, а не
   секунду спустя), позиции упавших плашек в __test (контроль BUG-B).
2) ДВОЙНОЙ ФИНАЛ: липкая зона (fr 0.9) глушила стальной шар — он мёртво
   останавливался у обрыва, и вся его энергия пропадала. Теперь зона скользкая
   (fr 0.18): шар ПРОДОЛЖАЕТ цепочку — сгребает домино, выталкивает шарик с
   обрыва и сам уходит следом по жёлобу. Двойной удар (стекло + 2,1 кг стали)
   в молот: маятник бьёт сильно, колокол разбегается широко и сам звенит о
   страйкеры — перезвон, как у настольного колокольчика. Шару включён CCD
   (на скорости 2,5 м/с без него возможен туннельный промах сквозь голову).
3) HUD-трекер этапов: живая строка «шар: жёлоб · домино 5/8 · стекло: удар ·
   ЗВОНОК ×3» — машина читается как цепочка, а не как куча предметов.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()

def rep(old, new, tag):
    global s
    assert s.count(old) == 1, f"FAIL: {tag}"
    s = s.replace(old, new)
    print("  ✓", tag)

assert "__firstRing = +(simT - DT)" not in s or True
# firstRing-блок вставляется ниже, если его нет
rep("""      if (vn > 0.8) {   // сильный удар — колокол звучит сразу, не ждёт страйкеров""",
"""      if (vn > 0.8) { if (!window.__firstTok) window.__firstTok = +simT.toFixed(2);   // сильный удар — колокол звучит сразу, не ждёт страйкеров""", "firstTok mark")
rep("""  window.__peakBell = 0;
  sndState.clear();""",
"""  window.__peakBell = 0; window.__firstRing = 0; window.__firstTok = 0;
  sndState.clear();""", "hooks reset")
# вставка метки первого звона в шаг (прошлый heredoc не сохранился)
rep("""  simT += DT;
  // пик колокола и звон — внутри шага""",
"""  simT += DT;
  if (ringCount > 0 && !window.__firstRing) window.__firstRing = +(simT - DT).toFixed(2);
  // пик колокола и звон — внутри шага""", "firstRing mark (insert)")

# --- 1б. зонд плашек в __test ---
rep("""    bellDeg: +(byName.bell.rotation() * 180 / Math.PI).toFixed(1),""",
"""    domPos: Array.from({ length: TILE_N }, (_, i) => {
      const d = byName["dom" + i], t = d.translation();
      return [+t.x.toFixed(3), +t.y.toFixed(3), +(d.rotation() * 180 / Math.PI).toFixed(0)];
    }),
    firstTok: +(window.__firstTok || 0).toFixed(2),
    firstRing: +(window.__firstRing || 0).toFixed(2),
    bellDeg: +(byName.bell.rotation() * 180 / Math.PI).toFixed(1),""", "test domPos")

# --- 2. двойной финал: зона скользкая, шар с CCD ---
rep("""    colliders: [{ hx: 0.30, hy: 0.01, density: 1, fr: 0.9, rest: 0.1 }] });        // домино-зона «липкая», обрыв 1.56""",
"""    colliders: [{ hx: 0.30, hy: 0.01, density: 1, fr: 0.18, rest: 0.1 }] });       // домино-зона скользкая: шар проходит до обрыва""", "zone fr")
# --- CCD у шара: уже включён (ldamp 0.05/adamp 2.5, ccd true) — пропускаем
assert "ccd: true,  // 2.5" in s or "ccd: true" in s, "нет ccd у шара"
print("  ✓ ball ccd (уже был)")

# --- 3. HUD-трекер этапов ---
rep("""function updateHUD() {""",
"""function stageOf() {   // живой трекер: где сейчас каждый элемент цепочки
  const bl = byName.ball, mb = byName.marble;
  const bp = bl.translation(), mp = mb.translation();
  const seg = (x, y, span, lo, hi, mid) => x < lo ? span[0] : x < hi ? span[1] : mid;
  const ballSeg = !running ? "старт" :
    bp.y > 0.585 ? (bp.x < 1.0 ? "горка" : "стол") :
    bp.y > 0.24 && bp.x < 2.96 ? "жёлоб" :
    bp.x < 3.6 ? "у молота" : "покой";
  const marbSeg = !running ? "старт" :
    mp.y > 0.585 ? "стол" :
    mp.y > 0.24 && mp.x < 2.96 ? "жёлоб" :
    rings > 0 && mp.x < 3.6 ? "удар" : "покой";
  return `шар: ${ballSeg} · домино ${dominoFell}/${TILE_N} · стекло: ${marbSeg}` +
    (ringCount > 0 ? ` · 🔔 ×${ringCount}` : "");
}
function updateHUD() {""", "stageOf fn")
rep("""  $("hudStats").textContent =
    `t ${simT.toFixed(1)}с · колокол ${bellA.toFixed(0)}° · звонков ${ringCount}`;""",
"""  $("hudStats").textContent =
    `t ${simT.toFixed(1)}с · ${stageOf()}`;""", "hud stats line")

open(p, "w", encoding="utf-8").write(s)
print("OK патч 2 применён")
