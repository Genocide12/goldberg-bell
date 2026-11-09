#!/usr/bin/env python3
"""Патч 9 — финальная калибровка звона и разгона шарика:
1) порог мгновенного звона 0.8→0.35: слышимый удар молота о колокол
   звучит СРАЗУ (жалоба «звук позже удара»); страйкеры добавляют перезвон;
2) шарик на 1.52 (у самой кромки): короткий толчок волны — быстрый сход.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()
def rep(old, new, tag):
    global s
    assert s.count(old) == 1, f"FAIL: {tag}"
    s = s.replace(old, new)
    print("  ✓", tag)

rep("""      if (vn > 0.8) { if (!window.__firstTok) window.__firstTok = +simT.toFixed(2);   // сильный удар — колокол звучит сразу, не ждёт страйкеров
        ring(Math.min(1 + vn * 1.1, 3.5)); ringCount++;
        lastEvent = "удар молота — ЗВОНОК №" + ringCount;
      } else lastEvent = "молот бьёт в колокол";""",
"""      if (vn > 0.35) { if (!window.__firstTok) window.__firstTok = +simT.toFixed(2);   // слышимый удар — колокол звучит сразу, не ждёт страйкеров
        ring(Math.min(1 + vn * 1.4, 4)); ringCount++;
        lastEvent = "удар молота — ЗВОНОК №" + ringCount;
      } else lastEvent = "молот бьёт в колокол";""", "ring thr 0.35")

rep("  marble: { x: 1.40, y: zone2Y(1.40) + 0.021, rot: 0 },   // сразу за волной: куча в полёте разгоняет его до кромки",
    "  marble: { x: 1.52, y: zone2Y(1.52) + 0.021, rot: 0 },   // у самой кромки: короткий толчок волны — сразу сход",
    "marble 1.52")

open(p, "w", encoding="utf-8").write(s)
print("OK патч 9 применён")
