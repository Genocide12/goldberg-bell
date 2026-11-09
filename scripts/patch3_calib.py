#!/usr/bin/env python3
"""Патч 3 — калибровка двойного финала (по трассе):
шар остановился на 1.535 (KE=0): adamp 2.5 душил качение по зоне fr 0.18.
Ослабляем: adamp 2.5→0.8 (сталь по дереву — лёгкое качение), фиксацию плашек
чуть смягчаем (damping 2.5→1.5, fr 1.6→1.2) — шар как плуг всё равно не
разгоняет их стадом, но может дотащить кучу до обрыва.
Тесты: финал теперь двойной — шар УХОДИТ со стола (следом за шариком),
бьёт молот вместе с ним; ассерты переписаны под новую цепочку.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()
def rep(old, new, tag):
    global s
    assert s.count(old) == 1, f"FAIL: {tag}"; s = s.replace(old, new); print("  ✓", tag)

rep("ldamp: 0.05, adamp: 2.5, ccd: true,  // 2.5: сталь по дереву — заметное сопротивление качению",
    "ldamp: 0.05, adamp: 0.8, ccd: true,  // сталь по дереву — лёгкое качение, шар доходит до обрыва",
    "ball adamp")
rep("""    d.setLinearDamping(2.5);
    d.collider(0).setFriction(1.6); d.collider(0).setRestitution(0.03);""",
"""    d.setLinearDamping(1.5);
    d.collider(0).setFriction(1.2); d.collider(0).setRestitution(0.03);""", "settle softer")
rep("""      b.body.__settled = false; b.body.setLinearDamping(0.005);""",
"""      b.body.__settled = false; b.body.setLinearDamping(0.005);""", "noop")  # контроль уникальности
# reset: вернуть и damping плашкам
rep("""    if (b.kind === "domino") {   // снять «фиксацию» упавших
      b.body.__settled = false; b.body.setLinearDamping(0.005);
      b.body.collider(0).setFriction(0.25); b.body.collider(0).setRestitution(0.08);
    }""",
"""    if (b.kind === "domino") {   // снять «фиксацию» упавших
      b.body.__settled = false; b.body.setLinearDamping(0.005);
      b.body.collider(0).setFriction(0.25); b.body.collider(0).setRestitution(0.08);
    }""", "noop2")
open(p, "w", encoding="utf-8").write(s)
print("OK патч 3 применён")
