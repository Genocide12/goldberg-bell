<div align="center">

<img src="assets/banner.png" alt="Машина Голдберга · Город из карт" width="880">

# Машина Голдберга · Город из карт

**Интерактивная машина Голдберга на честной физике: 7 эпох, от рендера в Blender
до города из 292 игральных карт. Ни одной анимации падений — только физика.**

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-живая_демка-ffcd5c?style=flat-square&logo=github)](https://genocide12.github.io/goldberg-bell/)
[![Release](https://img.shields.io/badge/релиз-v7.0.0-3ac96e?style=flat-square)](https://github.com/Genocide12/goldberg-bell/releases/tag/v7.0.0)
[![License: MIT](https://img.shields.io/badge/лицензия-MIT-4a86e8?style=flat-square)](LICENSE)
[![Physics](https://img.shields.io/badge/физика-cannon--es_120Гц-c93a46?style=flat-square)](https://pmndrs.github.io/cannon-es/)

**[▶ ЗАПУСТИТЬ ЗАМОК ИЗ КАРТ (v8)](https://genocide12.github.io/goldberg-bell/index_castle.html)** ·
**[▶ Шоу с колоколом (v6)](https://genocide12.github.io/goldberg-bell/index_v6.html)** ·
**[Лендинг-хаб со всеми эпохами](https://genocide12.github.io/goldberg-bell/)**

</div>

---

## Что это

Машина Голдберга — цепочка безумных приспособлений, которая делает простое
дело сложным путём. Здесь она **целиком построена из игральных карт** (v7):
щелчок по первой карте запускает цепь из 292 карт, которая заканчивается
падением карты-короля с вершины гигант-пирамиды.

Никакого «розыгрыша»: единственный источник правды — физический мир
**cannon-es** (120 Гц). Рендер на **three.js** только читает состояние тел.

```
щелчок → волна A (12) → Башня «Маяк» (5 этажей) → волна B (36) → Λ-домик
→ волна C (36) → Башня «Гранд» (4 этажа) → волна D (36) → Λ-домик
→ камертон валит улицу-замок (8 Λ-домиков) → ГИГАНТ-ПИРАМИДА [8-7-6-5-4-3-2-1]
= 108 карт → обрушение срывает КАРТУ-КОРОЛЯ с вершины («👑 КОРОЛЬ ПАЛ», ~21 c)
```

## Семь эпох проекта

| Версия | Код | Движок | Живая копия | Релиз |
|---|---|---|---|---|
| **v8.0.0** | **ЗАМОК-КОЛЬЦО** (текущая) | cannon-es 120 Гц + PiP-камера | [index_castle.html](https://genocide12.github.io/goldberg-bell/index_castle.html) | [v8.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v8.0.0) |
| v7.0.0 | Город из карт | cannon-es 120 Гц | [index_v7.html](https://genocide12.github.io/goldberg-bell/index_v7.html) | [v7.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v7.0.0) |
| v6.0.0 | Шоу с колоколом | cannon-es 120 Гц | [index_v6.html](https://genocide12.github.io/goldberg-bell/index_v6.html) | [v6.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v6.0.0) |
| v5.0.0 | Реальные домино | cannon-es | [history/v5](https://genocide12.github.io/goldberg-bell/history/v5/index.html) | [v5.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v5.0.0) |
| v4.0.0 | Rapier + PBR | Rapier WASM | [history/v4](https://genocide12.github.io/goldberg-bell/history/v4/index.html) | [v4.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v4.0.0) |
| v3.0.0 | Свой физдвижок | собственный | [history/v3](https://genocide12.github.io/goldberg-bell/history/v3/index.html) | [v3.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v3.0.0) |
| v2.0.0 | Сайт-отчёт | — | [history/v2](https://genocide12.github.io/goldberg-bell/history/v2/index.html) | [v2.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v2.0.0) |
| v1.0.0 | Blender Bullet | Bullet (Blender 4.5) | — | [v1.0.0](https://github.com/Genocide12/goldberg-bell/releases/tag/v1.0.0) |

Полная история изменений — в [CHANGELOG.md](CHANGELOG.md) и в
[релизах](https://github.com/Genocide12/goldberg-bell/releases).

## Кадры

| v7 · Старт | v7 · Волна | v7 · Пирамида |
|:---:|:---:|:---:|
| ![https://genocide12.github.io/goldberg-bell/assets/shot_v7_idle.png](https://genocide12.github.io/goldberg-bell/assets/shot_v7_idle.png) | ![https://genocide12.github.io/goldberg-bell/assets/shot_v7_wave.png](https://genocide12.github.io/goldberg-bell/assets/shot_v7_wave.png) | ![https://genocide12.github.io/goldberg-bell/assets/shot_v7_pyr.png](https://genocide12.github.io/goldberg-bell/assets/shot_v7_pyr.png) |

| v6 · Ксилофон | v6 · Звон | v1 · Blender |
|:---:|:---:|:---:|
| ![https://genocide12.github.io/goldberg-bell/assets/shot_v6_notes.png](https://genocide12.github.io/goldberg-bell/assets/shot_v6_notes.png) | ![https://genocide12.github.io/goldberg-bell/assets/shot_v6_ring.png](https://genocide12.github.io/goldberg-bell/assets/shot_v6_ring.png) | ![https://genocide12.github.io/goldberg-bell/assets/shot_v1_start.png](https://genocide12.github.io/goldberg-bell/assets/shot_v1_start.png) |

## Секрет стойкости карт (физика, не анимация)

Карта 0.3 мм на ребре не стоит в дискретном солвере — падает за 0.01 с
(проверено стендом). Решение: мир не усыпляет тела (`allowSleep=false`),
каждая карта заморожена `body.sleep()` и стоит идеально; **любое касание
будит тело** — дальше честная физика. Дополнительно «пробуждение по рухнувшей
опоре»: движение в 40 мм под спящим будит и его (иначе король и верхние этажи
башен висели бы в воздухе). Темп волны настоящий — 0.10–0.14 с/карта.
Прогоны детерминированы: 3/3 идентичны.

## Тесты

Каждая версия проходит живой прогон в headless-браузере:
загрузка без JS-ошибок, все фазы по таймингам, звон колокола / падение
короля в окне, детерминизм повторного запуска. Для v7 на проде:
**5/5 фаз, пирамида 108/108, король — 21-я секунда**.

## Структура репозитория

```
index.html        лендинг-хаб: 7 эпох, галерея, физика
index_v7.html     ГОРОД ИЗ КАРТ — текущая машина (запуск!)
machine_v7.js     физика v7: единственный источник правды
index_v6.html     шоу с колоколом (прошлая версия)
machine.js        физика v6
history/          живые копии эпох v2–v5 (работают в браузере)
assets/           баннер, иконки, кадры эпох
vendor/           three.js + cannon-es (локально, без CDN)
scripts/          тесты: smoke, скриншоты, тайминги, live-проверка прода
```

## Лицензия

[MIT](LICENSE) — код и страница. Вендорские библиотеки (three.js, cannon-es)
распространяются по их собственным лицензиям (MIT).
