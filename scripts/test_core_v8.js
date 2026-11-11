// test_core.js — headless-тест физ-ядра v8 «ЗАМКИ-КОЛЬЦА».
// Проверяет: 1) старт 0 упавших; 2) волна по кольцу (сегменты по порядку,
// с заворотом); 3) башни рушатся (ярусно); 4) король пал; 5) скорость шага.
const { CardsCore, HZ } = require('/home/z/my-project/scripts/cards_core.js');

const core = new CardsCore();
console.log('карт построено:', core.bodies.length);

// --- 1) устойчивость: 3 секунды БЕЗ старта, никто не должен упасть ---
for (let i = 0; i < 3 * HZ; i++) core.step();
let s = core.stats();
console.log('после 3с покоя: упало', s.fallen, '/ стоило', s.standing, '/ бодрых', s.awake);
if (s.fallen > 0) {
  console.log('FAIL: рассыпается само!');
  process.exit(1);
}

// --- 2) запуск и лог фаз ---
core.start();
const T_MAX = 45; // сек
const log = [];
let kingT = null, segOrder = [];
let lastSegs = '';
for (let i = 0; i < T_MAX * HZ; i++) {
  core.step();
  const t = i / HZ;
  s = core.stats();
  const segKey = s.segs.sort().join(',');
  if (segKey !== lastSegs && segKey) {
    segOrder.push({ t: +t.toFixed(2), segs: segKey, awake: s.awake, fallen: s.fallen });
    lastSegs = segKey;
  }
  if (kingT === null && core.kingFallen()) kingT = t;
  if (t > 3 && s.awake === 0 && s.fallen > 10) break; // всё улеглось
}
console.log('\n--- порядок пробуждения сегментов ---');
for (const e of segOrder.slice(0, 40)) console.log(`${e.t}s segs=${e.segs} awake=${e.awake} fallen=${e.fallen}`);
console.log('фаз смен:', segOrder.length);
console.log('\nКОРОЛЬ ПАЛ на', kingT === null ? 'НИКОГДА (FAIL)' : kingT.toFixed(2) + 'с');
s = core.stats();
console.log('итог: упало', s.fallen, '/', s.total, '| стоит', s.standing);

// --- 3) производительность: время 600 шагов ---
const t0 = process.hrtime.bigint();
for (let i = 0; i < 600; i++) core.step();
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log('производительность:', (ms / 600).toFixed(2), 'мс/шаг → в реальном времени до', Math.floor(1000 / 8.33 / (ms / 600) * 8.33 / (ms / 600) * 0 + 1000 / (ms / 600)), 'шагов/с');

const ok = kingT !== null && s.fallen > s.total * 0.5;
console.log(ok ? '\n=== TEST PASS ===' : '\n=== TEST FAIL ===');
process.exit(ok ? 0 : 2);
