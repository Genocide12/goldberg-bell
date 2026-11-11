// cards_core.js — физ-ядро v8 «ЗАМОК-КОЛЬЦО». Node + браузер.
// Геометрия Λ-домика взята из проверенной v7 (houseAt):
//   стойки H63 наклонены на atan2(s, HL), сверху горизонтальная
//   перекладина (deck) — так домик стоит идеально в дискретном солвере.
// Все карты заморожены body.sleep() до первого касания (v7-патент).
//
// ЗАМОК: стены-кольцо из Λ-домиков (волна ЗАВОРАЧИВАЕТ за угол),
// 4 угловые башни 4 яруса + центральный ДОНЖОН 6 ярусов + КОРОЛЬ.
const CE = (typeof window !== 'undefined') ? window.CANNON
  : require('/home/z/my-project/scripts/node_modules/cannon-es');
const { World, Body, Box, Vec3, Quaternion, Material, ContactMaterial, SAPBroadphase } = CE;

const CARD = { L: 0.088, W: 0.063, T: 0.0006 };   // покер, физ-толщина 0.6 мм
const MASS = +(CARD.L * CARD.W * CARD.T * 920).toFixed(5);  // ≈3.06 г
const HZ = 120, DT = 1 / HZ;

// Λ-домик: H = 63 (высота стойки), s = полупролёт (из v7)
const HOUSE = { H: CARD.W, s: 0.028 };
const HL = Math.sqrt(HOUSE.H ** 2 - HOUSE.s ** 2);   // вертикальная проекция
const AL = Math.atan2(HOUSE.s, HL);                  // угол наклона стойки
const HOUSE_H = HL + CARD.T;                         // полная высота домика

class CardsCore {
  constructor() {
    this.world = new World({ gravity: new Vec3(0, -9.81, 0) });
    this.world.broadphase = new SAPBroadphase(this.world);
    this.world.allowSleep = false;      // мир НЕ усыпляет: только явный sleep()
    this.world.solver.iterations = 20;

    this.matC = new Material('card');
    this.matW = new Material('ground');
    const eq = { contactEquationStiffness: 1e8, contactEquationRelaxation: 2 };
    this.world.addContactMaterial(new ContactMaterial(this.matC, this.matC,
      { friction: 0.30, restitution: 0.02, ...eq }));
    this.world.addContactMaterial(new ContactMaterial(this.matC, this.matW,
      { friction: 0.45, restitution: 0.05, ...eq }));

    // пол
    const floor = new Body({ mass: 0, material: this.matW });
    floor.addShape(new Box(new Vec3(3, 0.05, 3)));
    floor.position.set(0, -0.05, 0);
    this.world.addBody(floor);

    this.bodies = [];
    this.meta = new Map();   // body.id → {kind, seg, tier, name}
    this.byName = {};
    this.events = [];
    this.t0 = null;

    this.buildCastle();
    this._wire();
  }

  _addCard(name, kind, half, pos, rotZ = 0, rotY = 0, meta = {}) {
    const b = new Body({ mass: MASS, material: this.matC, allowSleep: true,
      sleepSpeedLimit: 0.04, sleepTimeLimit: 0.35,
      angularDamping: 0.03, linearDamping: 0.01 });
    b.addShape(new Box(half));
    b.position.set(...pos);
    if (rotY) { const q = new Quaternion(); q.setFromAxisAngle(new Vec3(0, 1, 0), rotY); b.quaternion.copy(q); }
    if (rotZ) { const q = new Quaternion(); q.setFromAxisAngle(new Vec3(0, 0, 1), rotZ); b.quaternion.mult(q, b.quaternion); }
    this.world.addBody(b);
    b.sleep();
    this.bodies.push(b);
    this.byName[name] = b;
    this.meta.set(b.id, { kind, name, ...meta });
    return b;
  }
  _halfLean() { return new Vec3(CARD.T / 2, HOUSE.H / 2, CARD.L / 2); }   // стойка
  _halfDeck() { return new Vec3(CARD.L / 2, CARD.T / 2, CARD.W / 2); }    // перекладина
  _halfStand() { return new Vec3(CARD.T / 2, CARD.W / 2, CARD.L / 2); }   // H63 стоя
  _halfTall()  { return new Vec3(CARD.T / 2, CARD.L / 2, CARD.W / 2); }   // H88 стоя

  // Λ-домик в мировой точке (x,z), повёрнутый на rotY. Возвращает верх.
  houseAt(name, x, y0, z, rotY, meta = {}) {
    // локальные координаты домика → мировые через rotY
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const W2W = (lx, ly) => [x + lx * c + ly * s, y0 + ly, z - lx * s + ly * c]; // rotY вокруг Y: (lx,lz)→(x+lx*c+lz*s, z-lx*s+lz*c); lz=0
    // стойки: сдвиг ±s/2 поперёк оси домика (вдоль локального X)
    const [lx1, ly1] = [-HOUSE.s / 2, HL / 2], [lx2, ly2] = [HOUSE.s / 2, HL / 2];
    this._addCard(name + 'L', 'lean', this._halfLean(),
      W2W(lx1, ly1), AL, rotY, meta);
    this._addCard(name + 'R', 'lean', this._halfLean(),
      W2W(lx2, ly2), -AL, rotY, meta);
    this._addCard(name + 'D', 'deck', this._halfDeck(),
      W2W(0, HL + CARD.T / 2 + 0.0002), 0, rotY, meta);
    return y0 + HOUSE_H + 0.0002;
  }

  // Зубец: карта H63 стоя (merlon)
  merlonAt(name, x, y0, z, rotY, meta = {}) {
    this._addCard(name, 'stand', this._halfStand(),
      [x, y0 + CARD.W / 2, z], 0, rotY, meta);
  }

  // Мостик: домики вдоль прямой (x0,z0)→(x1,z1), шаг 52 мм (домино-каскад).
  // Первый и последний — с небольшим отступом от «конструкций».
  _bridge(prefix, x0, z0, x1, z1, meta) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(len / 0.052));
    const ux = dx / len, uz = dz / len;
    const yaw = Math.atan2(uz, ux);
    for (let m = 0; m < n; m++) {
      // позиция: от точки старта, последний домик ЗА 26 мм до цели
      const s = (m + 0.5) * (len / n);
      this.houseAt(prefix + m + '_', x0 + ux * s, 0, z0 + uz * s, yaw, meta);
    }
    return n;
  }

  buildCastle() {
    // R подобран так, чтобы шаг дуги между домиками был ~53 мм:
    // падающий домик достаёт до следующего (домино-эффект по кольцу).
    const R = 0.45, ARC = 300 * Math.PI / 180, A0 = -Math.PI / 2;
    this.ring = { R, ARC, A0 };

    // --- стены: домики ВПЛОТНУЮ по кольцу (домино-шаг ~53 мм),
    // волна заворачивает за угол; зубцы над каждым 4-м ---
    const N_WALL = Math.round(R * ARC / 0.053);   // ≈44
    for (let i = 0; i < N_WALL; i++) {
      const a = A0 + (i / (N_WALL - 1)) * ARC;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      // rotY домика = касательная к кольцу
      const rotY = -a - Math.PI / 2;
      const top = this.houseAt('w' + i + '_', x, 0, z, rotY, { kind: 'wall', seg: i, tier: 0 });
      if (i % 4 === 0) {
        const mx = Math.cos(a) * (R + 0.052), mz = Math.sin(a) * (R + 0.052);
        this.merlonAt('wm' + i, mx, top - 0.0002, mz, rotY, { kind: 'wall', seg: i, tier: 1 });
      }
    }

    // --- 4 башни В СЕКТОРЕ ВХОДА (разрыв дуги 60°: волна их не задевает):
    // w43 валится на башню 0 → внешние мостики по дуге входа: 0→1→2→3
    // → мостик башни 3 внутрь, на донжон. Порядок гарантирован геометрией ---
    this.towers = [];
    const rOut = R + 0.16;                       // внешний радиус башен
    const gapA0 = A0 + ARC, gapA1 = A0 + 2 * Math.PI;  // сектор входа
    for (let t = 0; t < 4; t++) {
      const a = gapA0 + 0.10 + t * ((gapA1 - gapA0 - 0.20) / 3);  // 4 башни равномерно во входе
      const bx = Math.cos(a) * rOut, bz = Math.sin(a) * rOut;
      const seg = 100 + t;
      this.towers.push({ a, x: bx, z: bz, seg, tiers: [] });
      let top = 0;
      for (let lvl = 0; lvl < 4; lvl++) {
        const rot = -a - Math.PI / 2;
        top = this.houseAt('t' + t + '_' + lvl + 'a_', bx, top, bz, rot, { kind: 'tower', seg, tier: lvl });
        this.houseAt('t' + t + '_' + lvl + 'b_', bx, top - HOUSE_H - 0.0004 + CARD.T, bz, rot + Math.PI / 2, { kind: 'tower', seg, tier: lvl });
        this.towers[t].tiers.push(top);
      }
      // шпиль: карта H88 на вершине
      this._addCard('t' + t + 'spire', 'tall', this._halfTall(),
        [bx, this.towers[t].tiers[3] + CARD.L / 2 + 0.0004, bz], 0, -a,
        { kind: 'tower', seg, tier: 4, role: 'spire' });
      // МОСТИК башня(t-1)→башня(t) по внешней дуге входа (кроме башни 0 —
      // на неё валится стена w43); шаг 52 мм, домино-каскад
      if (t > 0) {
        const prev = this.towers[t - 1];
        const sx = prev.x + (bx - prev.x) * 0.12, sz = prev.z + (bz - prev.z) * 0.12;
        this._bridge('t' + t + 'm_', sx, sz, bx, bz, { kind: 'bridge', seg, tier: 0 });
      }
    }

    // --- ДОНЖОН в центре: 6 ярусов, каждый — 4 домика по квадрату ---
    let top = 0;
    const D = 0.13;
    this.keepTiers = [];
    for (let lvl = 0; lvl < 6; lvl++) {
      const rr = D * (1 - lvl * 0.10);
      for (let k = 0; k < 4; k++) {
        const aa = k * Math.PI / 2 + Math.PI / 4;
        const ox = Math.cos(aa) * rr, oz = Math.sin(aa) * rr;
        // на ярусе 0-1 домики стоят на полу; выше — на перекладинах нижних
        top = Math.max(top, this.houseAt('k' + lvl + '_' + k + '_', ox, lvl * (HOUSE_H + 0.0004), oz, aa + Math.PI / 2,
          { kind: 'keep', seg: 200, tier: lvl }));
      }
      this.keepTiers.push(lvl * (HOUSE_H + 0.0004) + HOUSE_H);
    }
    // КОРОЛЬ: карта-«tall» на вершине донжона
    const kTop = this.keepTiers[5];
    this.king = this._addCard('king', 'tall', this._halfTall(),
      [0, kTop + CARD.L / 2 + 0.0006, 0], 0, 0,
      { kind: 'keep', seg: 200, tier: 6, role: 'king' });

    // --- МОСТИК башня0 → донжон: обвал башни рушит донжон (и короля).
    // Идёт от башни 0 через ВХОД (разрыв кольца) к донжону — не пересекает
    // ни волну, ни триггер (триггер снаружи у A0, вход у A0+ARC) ---
    const t0 = this.towers[0];
    const kNear = { x: Math.cos(Math.PI / 4) * D, z: Math.sin(Math.PI / 4) * D }; // k0_0
    const away = { x: t0.x - (t0.x / Math.hypot(t0.x, t0.z)) * 0.05,
                   z: t0.z - (t0.z / Math.hypot(t0.x, t0.z)) * 0.05 };
    this._bridge('kb_', away.x, away.z, kNear.x * 1.1, kNear.z * 1.1, { kind: 'bridge', seg: 300, tier: 0 });

    // --- ТРИГГЕР: карта-домино внутри кольца, вплотную к стене 0 (55 мм);
    // заваливается НАРУЖУ на стену w0. Сектор входа (башни) — на другом
    // конце дуги, триггер их не задевает ---
    const aT = A0 + 0.045;                       // чуть вперёд стены 0 по дуге
    const rT = R - 0.058;                        // внутри кольца
    this.trigger = this._addCard('trigger', 'tall', this._halfTall(),
      [Math.cos(aT) * rT, CARD.L / 2, Math.sin(aT) * rT], 0, -aT + Math.PI / 2,
      { kind: 'trigger', seg: -1, tier: 0 });
  }

  _wire() {
    // касание будит спящее
    this.world.addEventListener('beginContact', (ev) => {
      const { bodyA, bodyB } = ev;
      if (bodyA.sleepState === 2 && this.meta.has(bodyA.id)) bodyA.wakeUp();
      if (bodyB.sleepState === 2 && this.meta.has(bodyB.id)) bodyB.wakeUp();
    });
  }

  start() {
    if (this.t0 !== null) return;
    this.t0 = 0;
    // триггер внутри кольца: заваливаем НАРУЖУ на стену w0 (как домино)
    const a0 = this.ring.A0;
    this.trigger.wakeUp();
    // вращение вокруг касательной → верх карты ложится на стену снаружи
    const tang = new Vec3(-Math.sin(a0), 0, Math.cos(a0));
    this.trigger.angularVelocity.set(tang.x * 9, 0, tang.z * 9);
    this.trigger.velocity.set(0, 0, 0);
    this.events.push({ t: 0, msg: 'СТАРТ: карта-рычаг заваливается на стену' });
  }

  step() {
    this.world.step(DT);
    if (this.t0 !== null) this.t0 += DT;
    // «пробуждение по рухнувшей опоре»: быстрое движение в 45 мм будит спящее.
    // ДЛЯ БАШЕН/ДОНЖОНА: если ярус N двигается — будим ярус N+1 (столб рушится
    // снизу вверх по цепочке, не весь сразу: каждый ярус от следующего щелчка)
    const movers = [];
    for (const b of this.bodies) {
      if (b.sleepState !== 2 && b.velocity.lengthSquared() > 0.25) movers.push(b);
    }
    if (movers.length) {
      const r2 = 0.045 * 0.045;
      for (const b of this.bodies) {
        if (b.sleepState !== 2) continue;
        for (const m of movers) {
          const dx = b.position.x - m.position.x, dy = b.position.y - m.position.y,
                dz = b.position.z - m.position.z;
          if (dx * dx + dy * dy + dz * dz < r2) { b.wakeUp(); break; }
        }
      }
    // вертикальная цепочка: НЕСПЯЩИЙ ярус будит ярус выше (столб карточного
    // дома: выбит низ — верх лишается опоры). Работает даже при медленном
    // оседании, поэтому критерий не скорость, а сам факт «не спит».
    {
      const activeTiers = new Set();
      for (const b of this.bodies) {
        if (b.sleepState === 2) continue;
        const md = this.meta.get(b.id);
        if (md && (md.kind === 'tower' || md.kind === 'keep'))
          activeTiers.add(md.kind + ':' + md.seg + ':' + md.tier);
      }
      if (activeTiers.size) {
        for (const b of this.bodies) {
          if (b.sleepState !== 2) continue;
          const md = this.meta.get(b.id);
          if (!md || (md.kind !== 'tower' && md.kind !== 'keep')) continue;
          const key = md.kind + ':' + md.seg + ':';
          if (md.tier > 0 && activeTiers.has(key + (md.tier - 1))) b.wakeUp();
        }
      }
    }
    }
  }

  stats() {
    let awake = 0, fallen = 0, standing = 0;
    const segs = new Set();
    const up = new Vec3(0, 1, 0), tmp = new Vec3();
    for (const b of this.bodies) {
      const md = this.meta.get(b.id);
      if (!md || md.kind === 'trigger') continue;
      if (b.sleepState !== 2 && b.velocity.lengthSquared() > 0.04) {
        awake++; segs.add(md.kind === 'wall' ? 'w' + md.seg : md.kind === 'tower' ? 't' + (md.seg - 100) : md.kind === 'keep' ? 'k' + md.tier : 'x');
      }
      b.quaternion.vmult(up, tmp);
      if (tmp.y < 0.72) fallen++; else standing++;
    }
    return { awake, fallen, standing, total: this.bodies.length - 1, segs: [...segs] };
  }

  kingFallen() {
    const tmp = new Vec3();
    this.king.quaternion.vmult(new Vec3(0, 1, 0), tmp);
    return tmp.y < 0.72 || this.king.position.y < 0.03;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { CardsCore, CARD, HOUSE_H, HZ, DT, MASS };
if (typeof window !== 'undefined') window.CardsCore = CardsCore;
