// Финальный хронометраж v7: ключевые моменты с чёткими порогами.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const CANNON = require("/home/z/my-project/site/vendor/cannon-es.global.js");
const { buildMachine } = await import("file:///home/z/my-project/site/machine_v7.js");

const m = buildMachine(CANNON);
const V = (x, y, z) => new CANNON.Vec3(x, y, z);

for (let i = 0; i < 360; i++) m.step();
m.start();

const T0 = m.t;
const marks = {};
const seen = {};
while (m.t < 130) {
  m.step(10);
  const p = m.probe();
  const ev = (name, cond) => { if (cond && !seen[name]) { seen[name] = 1; marks[name] = +(m.t - T0).toFixed(2); } };
  ev("волна A прошла", p.waveA.fallen >= 8);
  ev("волна B прошла", p.waveB.fallen >= 24);
  ev("волна C прошла", p.waveC.fallen >= 18);
  ev("волна D прошла", p.waveD.fallen >= 22);
  ev("башни пали", p.towerFall >= 5);
  ev("улица пала", p.streetFall >= 5);
  ev("пирамида тронулась", p.pyrFall >= 20);
  ev("пирамида рухнула", p.pyrFall >= 80);
  // король: урон ИЛИ ушёл вниз заметно
  const c = m.byName.crown;
  if (!seen["КОРОЛЬ ПАЛ"] && (p.crownFall || p.crownY < 0.42)) {
    seen["КОРОЛЬ ПАЛ"] = 1;
    marks["КОРОЛЬ ПАЛ"] = +(m.t - T0).toFixed(2);
    marks["_король y"] = +p.crownY.toFixed(3);
  }
  if (seen["КОРОЛЬ ПАЛ"] && marks["КОРОЛЬ ПАЛ"] < 30 && m.t - T0 - marks["КОРОЛЬ ПАЛ"] > 3) break;
  if (!seen["КОРОЛЬ ПАЛ"] && m.t - T0 > 60) { marks["КОРОЛЬ ПАЛ"] = "не пал за 60с"; break; }
}
for (const [k, v] of Object.entries(marks)) console.log(`${k}: ${v}с`);
const p = m.probe();
console.log(`\nфиниш: пирамида ${p.pyrFall}/${p.pyrTotal}, король наклон ${p.crownTilt}°, y=${p.crownY}`);
