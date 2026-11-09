#!/usr/bin/env python3
"""Патч 1 — багфиксы по жалобам пользователя:
BUG-A «звук намного позже удара»: звон срабатывал только на контакте
колокол-страйкер (колокол долетает до страйкера через ~1с после удара молота).
Лечение: при достаточно сильном ударе молота (vn>0.8) колокол звучит СРАЗУ
(физически верно — ударенный колокол звучит в момент удара; страйкеры дают
дополнительные перезвоны, как настольный колокольчик).
BUG-B «домино катятся вместе со вторым шариком»: упавшие плашки не
фиксировались — шар-плуг (2,1 кг) тащил их по доске, они сгребали шарик,
и вся куча уезжала к обрыву. Лечение: плашка, лежащая почти плашмя
(|rot|>1.35 рад ≈ 77°), «прилипает»: линейное демпфирование 2.5 + трение
коллайдера 1.6 (реальное упавшее домино не скользит по доске). Сброс возвращает.
Плюс: слышимый каскад — щелчки домино-домино (соседние пары), стук шара о
каждую стоящую плашку, стук приземления шара на зону, щелчок домино по шарику.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()

def rep(old, new, tag):
    global s
    assert old in s and s.count(old) == 1, f"FAIL: {tag}"
    s = s.replace(old, new)
    print("  ✓", tag)

# --- BUG-A: звон в момент удара молота ---
rep("""    } else if (kind === "tok") { tok(vn); lastEvent = "молот бьёт в колокол"; }""",
"""    } else if (kind === "tok") {
      tok(vn);
      if (vn > 0.8) {   // сильный удар — колокол звучит сразу, не ждёт страйкеров
        ring(Math.min(1 + vn * 1.1, 3.5)); ringCount++;
        lastEvent = "удар молота — ЗВОНОК №" + ringCount;
      } else lastEvent = "молот бьёт в колокол";
    }""", "ring-at-strike")

# --- слышимый каскад: дополнительные пары ---
rep("""  ["ball", "dom0", "knock"], ["ball", "ramp", "knock"],
  ["marble", "chute", "glassSoft"],
];""",
"""  ["ball", "ramp", "knock"],
  ["marble", "chute", "glassSoft"], ["ball", "runway2", "knock"],
  ["marble", "dom7", "click"],
];
for (let i = 0; i < TILE_N - 1; i++) sndPairs.push(["dom" + i, "dom" + (i + 1), "click"]);
for (let i = 0; i < TILE_N; i++) sndPairs.push(["ball", "dom" + i, "knock"]);""", "sndPairs cascade")

# --- BUG-B: фиксация упавших плашек ---
rep("""  if (fell > dominoFell) { dominoFell = fell; if (fell === 1) lastEvent = "домино пошли"; }
}""",
"""  if (fell > dominoFell) { dominoFell = fell; if (fell === 1) lastEvent = "домино пошли"; }
  // упавшая плашка цепляется за доску: не ездит с шарами, как настоящая
  for (let i = 0; i < TILE_N; i++) {
    const d = byName["dom" + i];
    if (d.__settled || Math.abs(d.rotation()) < 1.35) continue;
    d.__settled = true;
    d.setLinearDamping(2.5);
    d.collider(0).setFriction(1.6); d.collider(0).setRestitution(0.03);
  }
}""", "settle dominoes")

# --- BUG-B: сброс возвращает плашкам исходное трение ---
rep("""    b.body.setAngvel(0, true);
  }
  simT = 0; ringCount = 0; dominoFell = 0;""",
"""    b.body.setAngvel(0, true);
    if (b.kind === "domino") {   // снять «фиксацию» упавших
      b.body.__settled = false; b.body.setLinearDamping(0.005);
      b.body.collider(0).setFriction(0.25); b.body.collider(0).setRestitution(0.08);
    }
  }
  simT = 0; ringCount = 0; dominoFell = 0;""", "reset settled")

# --- щелчок домино ---
rep("""function glassTap(v) { const t = performance.now();""",
"""function domClick(v) { const t = performance.now();
  if (t - lastSnd.c < 60) return; lastSnd.c = t;
  voice([[1600, .35, .01, .001], [520, .45, .02, .001]],
    .06 + .14 * Math.min(v / 3, 1), .05); }
function glassTap(v) { const t = performance.now();""", "domClick fn")
rep("const lastSnd = { r: 0, t: 0, k: 0, g: 0 };",
    "const lastSnd = { r: 0, t: 0, k: 0, g: 0, c: 0 };", "lastSnd.c")
rep("""    else if (kind === "glass") { glassTap(vn); lastEvent = "шарик ударил в молот"; }""",
"""    else if (kind === "glass") { glassTap(vn); lastEvent = "шарик ударил в молот"; }
    else if (kind === "click") domClick(vn);""", "click branch")

open(p, "w", encoding="utf-8").write(s)
print("OK патч 1 применён")
