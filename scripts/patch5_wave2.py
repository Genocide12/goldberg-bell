#!/usr/bin/env python3
"""Патч 5 — финальная схема волны (по трассам П3/П4):
Трассы показали: при скользкой зоне шар влетает в dom0 на полной скорости —
«летающая очередь» не падает, а стадо переваливает на жёлоб и глушит подачу.
Прилипание трением побеждается плугом 2,1 кг (любой damping продавливается).

Схема как в эталоне, но с честной фиксацией:
1) зона fr 0.9 + шар adamp 2.5 (эталон): волна идёт медленно, плашки УСПЕВАЮТ
   падать, шар гаснет на столе;
2) упавшая плашка (|rot|>75°) или остановившаяся (v<0.15) → КИНЕМАТИЗАЦИЯ:
   тело становится неподвижным препятствием (как лежащая доминошка в реале —
   её не сдвинуть катающимся шаром). Снятие фиксации — в reset();
3) шарик на 1.50 (у обрыва): волна выталкивает его через край, дальше он
   едет по жёлобу один (fr жёлоба 0.02 — скользкий), стадо остаётся на столе.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()
def rep(old, new, tag):
    global s
    assert s.count(old) == 1, f"FAIL: {tag}"; s = s.replace(old, new); print("  ✓", tag)

# 1) эталонная волна
rep("colliders: [{ hx: 0.30, hy: 0.01, density: 1, fr: 0.5, rest: 0.1 }] });        // домино-зона: шар гаснет на плашках, как в эталоне",
    "colliders: [{ hx: 0.30, hy: 0.01, density: 1, fr: 0.9, rest: 0.1 }] });        // домино-зона «липкая» (эталон): волна успевает падать",
    "zone 0.9")
rep("ldamp: 0.05, adamp: 0.8, ccd: true,  // сталь по дереву — лёгкое качение, шар доходит до обрыва",
    "ldamp: 0.05, adamp: 2.5, ccd: true,  // 2.5: сталь по дереву — заметное сопротивление качению (эталон)",
    "ball adamp 2.5")

# 2) кинематизация вместо трения-костыля
rep("""  // упавшая плашка цепляется за доску: не ездит с шарами, как настоящая.
  // Волна должна ЛЕЧЬ на столе: порог 60°, а у обрыва — супер-прилипание
  // (иначе стадо переваливает на жёлоб и глушит подачу шаров).
  for (let i = 0; i < TILE_N; i++) {
    const d = byName["dom" + i];
    const t = d.translation();
    if (d.__settled || Math.abs(d.rotation()) < 1.05) continue;
    d.__settled = true;
    const edge = t.x > 1.5;   // у обрыва — намертво (борт волны)
    d.setLinearDamping(edge ? 10 : 1.5);
    d.collider(0).setFriction(edge ? 2.0 : 1.2);
    d.collider(0).setRestitution(0.03);
  }
}""",
"""  // упавшая доминошка — неподвижное препятствие (как в реале: лежачую
  // плашку не сдвинуть катающимся шаром). Кинематизация вместо трения:
  // плуг 2,1 кг продавливает любой damping, но не твёрдое тело.
  for (let i = 0; i < TILE_N; i++) {
    const d = byName["dom" + i];
    if (d.__settled) continue;
    const v = d.linvel(), sp = Math.hypot(v.x, v.y);
    const t = d.translation();
    if (Math.abs(d.rotation()) > 1.31 || sp < 0.15) {   // 75° или остановилась
      d.__settled = true;
      d.setLinvel({ x: 0, y: 0 }, true); d.setAngvel(0, true);
      d.setBodyType(R.RigidBodyType.KinematicPositionBased);
    }
  }
}""", "kinematize")

# снятие фиксации при reset
rep("""    if (b.kind === "domino") {   // снять «фиксацию» упавших
      b.body.__settled = false; b.body.setLinearDamping(0.005);
      b.body.collider(0).setFriction(0.25); b.body.collider(0).setRestitution(0.08);
    }""",
"""    if (b.kind === "domino") {   // снять «фиксацию» упавших
      b.body.__settled = false;
      b.body.setBodyType(R.RigidBodyType.Dynamic);
    }""", "reset unkinematize")

# 3) шарик к обрыву
rep("  marble: { x: 1.43, y: zone2Y(1.43) + 0.021, rot: 0 },",
    "  marble: { x: 1.50, y: zone2Y(1.50) + 0.021, rot: 0 },   // у обрыва: волна выталкивает его через край",
    "marble 1.50")

open(p, "w", encoding="utf-8").write(s)
print("OK патч 5 применён")
