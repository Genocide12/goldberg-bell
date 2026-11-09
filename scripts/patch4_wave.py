#!/usr/bin/env python3
"""Патч 4 — волна домино по-эталонному + двойной финал (по трассе патча 3):
Трасса показала: плашки переваливали через обрыв и ехали по жёлобу стадом
(стенка на 2.7-2.8 перед молотом), шарик застрял позади стада — молот не
тронут, звона нет.
Правки:
1) прилипание при |rot|>60° (было 77°) — волна ложится ещё НА СТОЛЕ;
2) у края стола (x>1.5) — супер-прилипание (damping 10, fr 2.0): плашка,
   доехавшая до обрыва, хоронится там как борт — волна НЕ переваливает на жёлоб;
3) итого: шарик уходит по жёлобу (толчок волны), шар прокатывается по лежащей
   куче поверх и переваливает через край следом → двойной удар в молот.
"""
p = "/home/z/my-project/site/index.html"
s = open(p, encoding="utf-8").read()
def rep(old, new, tag):
    global s
    assert s.count(old) == 1, f"FAIL: {tag}"; s = s.replace(old, new); print("  ✓", tag)

rep("""  // упавшая плашка цепляется за доску: не ездит с шарами, как настоящая
  for (let i = 0; i < TILE_N; i++) {
    const d = byName["dom" + i];
    if (d.__settled || Math.abs(d.rotation()) < 1.35) continue;
    d.__settled = true;
    d.setLinearDamping(1.5);
    d.collider(0).setFriction(1.2); d.collider(0).setRestitution(0.03);
  }
}""",
"""  // упавшая плашка цепляется за доску: не ездит с шарами, как настоящая.
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
}""", "settle wave")
open(p, "w", encoding="utf-8").write(s)
print("OK патч 4 применён")
