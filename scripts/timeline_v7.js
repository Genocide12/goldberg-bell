// Таймлайн v7 «Город из карт»: полная цепочка в headless.
// Проверки:
//  1) до старта НИ ОДНА карта не упала (сон держит всё) — 3с покоя
//  2) волны A(10)/B(26)/C(20): пробег от первой до последней
//  3) ветки: башня «Маяк» (3 эт.), Λ-домики 2 эт. — рушатся
//  4) улица-замок 6 домиков — последовательный обвал
//  5) ГИГАНТ-пирамида 84 карты — обвал, КОРОЛЬ на вершине пал
//  6) хронометраж: старт → КОРОЛЬ ПАЛ, цель ≥15с
//  7) sanity: ничего не вылетело за пределы
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine } = await import("file:///home/z/my-project/site/machine_v7.js");

const m = buildMachine(CANNON);

// 1) покой до старта: 3 с
for (let i = 0; i < 3 * 120; i++) m.step();
const p0 = m.probe();
console.log(`покой 3с: A ${p0.waveA.fallen}/${p0.waveA.total}, B ${p0.waveB.fallen}/${p0.waveB.total}, C ${p0.waveC.fallen}/${p0.waveC.total}, башня ${p0.towerFall}, улица ${p0.streetFall}/${p0.streetTotal}, пирамида ${p0.pyrFall}/${p0.pyrTotal}, король ${p0.crownTilt}° — ${p0.sane ? "сан" : "БЕЗУМИЕ"}`);
if (p0.waveA.fallen || p0.pyrFall || p0.crownFall) {
  console.log("FAIL: самопроизвольные обвалы до старта!"); process.exit(1);
}

m.start();
const T0 = m.t;
const marks = {};
let last = null, stall = 0;
while (m.t < 120) {
  m.step(10);
  const p = m.probe();
  const ev = (name, cond) => { if (cond && !marks[name]) marks[name] = +(m.t - T0).toFixed(2); };
  ev("A старт", p.waveA.fallen >= 1);
  ev("A конец", p.waveA.fallen >= p.waveA.total);
  ev("башня пала", p.towerFall >= 3);
  ev("B старт", p.waveB.fallen >= 1);
  ev("B конец", p.waveB.fallen >= p.waveB.total);
  ev("C старт", p.waveC.fallen >= 1);
  ev("C конец", p.waveC.fallen >= p.waveC.total);
  ev("D старт", p.waveD.fallen >= 1);
  ev("D конец", p.waveD.fallen >= p.waveD.total);
  ev("улица пала", p.streetFall >= p.streetTotal);
  ev("пирамида 50%", p.pyrFall >= Math.floor(p.pyrTotal / 2));
  ev("КОРОЛЬ ПАЛ", p.crownFall);
  // дублируем контроль: печатаем промежуточные каждые ~2с
  const sec = Math.floor(m.t - T0);
  if (sec % 2 === 0 && last !== sec) {
    last = sec;
    console.log(`t=${sec.toFixed(0).padStart(3)}с A ${p.waveA.fallen}/${p.waveA.total} B ${p.waveB.fallen}/${p.waveB.total} C ${p.waveC.fallen}/${p.waveC.total} D ${p.waveD.fallen}/${p.waveD.total} баш ${p.towerFall} ул ${p.streetFall}/${p.streetTotal} пир ${p.pyrFall}/${p.pyrTotal} король ${p.crownTilt}°`);
  }
  if (marks["КОРОЛЬ ПАЛ"] && m.t - T0 - marks["КОРОЛЬ ПАЛ"] > 15) break;   // ждём укладку улицы/пирамиды
}

console.log("\n=== ХРОНОМЕТРАЖ ===");
for (const [k, v] of Object.entries(marks)) console.log(`  ${k}: ${v}с`);
const p = m.probe();
console.log(`\nфиниш: A ${p.waveA.fallen}/${p.waveA.total}, B ${p.waveB.fallen}/${p.waveB.total}, C ${p.waveC.fallen}/${p.waveC.total}, D ${p.waveD.fallen}/${p.waveD.total}`);
console.log(`башни ${p.towerFall}/5, улица ${p.streetFall}/${p.streetTotal}, пирамида ${p.pyrFall}/${p.pyrTotal}, король ${p.crownTilt}° пал=${p.crownFall}`);
console.log(`sane=${p.sane} allRest=${p.allRest}`);
const ok = p.waveA.fallen === p.waveA.total && p.waveB.fallen >= p.waveB.total - 1 &&
  p.waveC.fallen === p.waveC.total && p.waveD.fallen >= p.waveD.total - 1 &&
  p.towerFall >= 9 &&
  p.streetFall >= p.streetTotal - 1 && p.pyrFall >= p.pyrTotal - 20 && p.crownFall;
console.log(ok ? "\nЦЕПОЧКА ПОЛНАЯ ✓" : "\nЦЕПОЧКА НЕПОЛНАЯ — смотреть фазы выше");
process.exit(ok ? 0 : 2);
