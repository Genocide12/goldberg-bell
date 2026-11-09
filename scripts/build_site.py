# Генерация сайта GitHub Pages: самодостаточный index.html (inline CSS/JS),
# media/ с кадрами, звуком и видео. Данные телеметрии встраиваются в страницу.
import json, os, shutil, math

WORK = "/home/z/my-project/work"
SITE = "/home/z/my-project/site"
os.makedirs(SITE, exist_ok=True)
os.makedirs(f"{SITE}/media", exist_ok=True)

# ---------- данные ----------
tel = json.load(open(f"{WORK}/goldberg_log.json"))["frames"]

def series(getter, every=2):
    return [round(getter(r), 3) for r in tel[::every]]

S_frame   = [r["f"] for r in tel[::2]]
S_bell    = series(lambda r: r["Bell"][3])
S_hammer  = series(lambda r: r["Hammer"][3])
S_ball2v  = series(lambda r: r["Ball2"][4])
S_strike  = series(lambda r: max(r["StrikerL"][4], r["StrikerR"][4]))
S_ball1x  = series(lambda r: r["Ball1"][0])

# события для вертикальных линий на графике
def t(f): return round((f - 1) / 24.0, 2)
ev_lines = [
    (t(6),   "старт шар1"),
    (t(30),  "домино"),
    (t(36),  "шар2 срыв"),
    (t(51),  "полёт"),
    (t(59),  "удар молотка"),
    (t(59),  None),  # dup guard
]
ev_lines = [(t(6), "старт"), (t(30), "домино"), (t(36), "шар2 с края"),
            (t(51), "полёт"), (t(59), "удар молотка")]

KEYS_ORDER = ["start", "dominoes", "flight", "hammer", "strike", "ring"]
KEYS_RU = {
    "start": ("1–2 · Старт", "Стальной шар скатывается с горки-1 (30°) и катится по столу"),
    "dominoes": ("2 · Домино", "Шар валит 8 домино на «липком» участке стола"),
    "flight": ("4 · Полёт", "Шар2 срывается с края, скатывается по горке-2 и жёлобу"),
    "hammer": ("5 · Молоток", "Шар2 летит баллистически в голову молотка-маятника"),
    "strike": ("6 · Удар", "Молоток бьёт в юбку колокола"),
    "ring": ("6 · Звон", "Колокол качается на шарнире и звенит в боковые страйкеры"),
}
gallery = []
for k in KEYS_ORDER:
    src = f"{WORK}/keys/{k}.png"
    if os.path.exists(src):
        shutil.copy(src, f"{SITE}/media/{k}.png")
        title, sub = KEYS_RU[k]
        gallery.append((k, title, sub))
print("gallery:", [g[0] for g in gallery])

has_video = os.path.exists("/home/z/my-project/download/goldberg_bell.mp4")
if has_video:
    shutil.copy("/home/z/my-project/download/goldberg_bell.mp4", f"{SITE}/media/goldberg_bell.mp4")
shutil.copy(f"{WORK}/bell_sound.wav", f"{SITE}/media/bell_sound.wav")

data_js = json.dumps({
    "frames": S_frame, "bell": S_bell, "hammer": S_hammer,
    "ball2v": S_ball2v, "strike": S_strike, "ball1x": S_ball1x,
    "events": ev_lines,
}, separators=(",", ":"))

gallery_html = "\n".join(
    f'''      <figure class="shot"><img src="media/{k}.png" alt="{title}" loading="lazy">
        <figcaption><b>{title}</b><span>{sub}</span></figcaption></figure>'''
    for k, title, sub in gallery)

video_html = (
    '<video controls preload="metadata" width="1152" height="648"><source src="media/goldberg_bell.mp4" type="video/mp4">Ваш браузер не поддерживает видео.</video>'
    if has_video else
    '<p class="note">Видео пересобирается — см. <code>scripts/make_video.py</code>.</p>')

html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Машина Голдберга · Blender Bullet Physics → звон колокола</title>
<meta name="description" content="Полностью физическая машина Голдберга в Blender 4.5 (Bullet Physics): шар → домино → баллистический полёт → молоток-маятник → колокол звонит в страйкеры.">
<style>
:root {{
  --bg: #0d1117; --panel: #161b27; --line: #232a3a; --ink: #e6edf3;
  --dim: #8b98ab; --brass: #d4a437; --steel: #9fb6c9; --red: #e5534b; --teal: #3fb950;
  --mono: ui-monospace, "Cascadia Code", Consolas, monospace;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ background: var(--bg); color: var(--ink);
  font: 16px/1.65 "Segoe UI", system-ui, -apple-system, sans-serif; }}
main {{ max-width: 1060px; margin: 0 auto; padding: 28px 20px 80px; }}
a {{ color: var(--steel); }}
h1 {{ font-size: 30px; line-height: 1.25; margin: 14px 0 10px; }}
h1 .accent {{ color: var(--brass); }}
h2 {{ font-size: 22px; margin: 44px 0 14px; padding-top: 18px; border-top: 1px solid var(--line); }}
h2:first-of-type {{ border-top: none; }}
p.lead {{ color: var(--dim); font-size: 17px; max-width: 780px; }}
.badges {{ display: flex; gap: 8px; flex-wrap: wrap; margin: 14px 0 4px; }}
.badge {{ font: 12px/1 var(--mono); color: var(--dim); border: 1px solid var(--line);
  border-radius: 20px; padding: 6px 12px; background: var(--panel); }}
.badge b {{ color: var(--ink); font-weight: 600; }}
.grid {{ display: grid; gap: 14px; margin: 18px 0; }}
.cards {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
.card {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }}
.card h3 {{ font-size: 15px; margin-bottom: 8px; color: var(--brass); font-weight: 600; }}
.card p, .card li {{ font-size: 14px; color: var(--dim); }}
.card ul {{ padding-left: 18px; }}
.shots {{ grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); }}
.shot {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
.shot img {{ width: 100%; display: block; }}
.shot figcaption {{ padding: 12px 16px; display: flex; flex-direction: column; gap: 3px; }}
.shot figcaption b {{ font-size: 14px; color: var(--ink); }}
.shot figcaption span {{ font-size: 13px; color: var(--dim); }}
.note {{ font-size: 14px; color: var(--dim); }}
video {{ width: 100%; border-radius: 12px; border: 1px solid var(--line); margin: 14px 0; }}
.charts {{ display: grid; gap: 14px; grid-template-columns: 1fr 1fr; }}
@media (max-width: 800px) {{ .charts {{ grid-template-columns: 1fr; }} }}
.chart {{ background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }}
.chart h3 {{ font-size: 14px; color: var(--ink); margin-bottom: 10px; font-weight: 600; }}
.chart svg {{ width: 100%; height: auto; display: block; }}
.legend {{ display: flex; gap: 16px; margin-top: 10px; flex-wrap: wrap; }}
.legend span {{ font: 12px var(--mono); color: var(--dim); display: flex; align-items: center; gap: 6px; }}
.sw {{ width: 18px; height: 3px; border-radius: 2px; display: inline-block; }}
table {{ width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0; }}
th, td {{ text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); }}
th {{ color: var(--dim); font-weight: 600; font-size: 13px; }}
td.mono, th.mono {{ font-family: var(--mono); }}
td .ok {{ color: var(--teal); font-weight: 600; }}
audio {{ width: 100%; margin: 10px 0; }}
.chain-svg {{ width: 100%; height: auto; margin: 16px 0 6px; }}
footer {{ color: var(--dim); font-size: 13px; margin-top: 60px; border-top: 1px solid var(--line); padding-top: 18px; }}
code {{ font: 13px var(--mono); background: var(--panel); border: 1px solid var(--line);
  border-radius: 6px; padding: 1px 6px; }}
pre {{ background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 14px 16px; overflow-x: auto; font: 13px var(--mono); color: var(--ink); margin: 12px 0; }}
</style>
</head>
<body>
<main>
  <div class="badges">
    <span class="badge">Blender <b>4.5 LTS</b></span>
    <span class="badge">Bullet Physics · rigid body</span>
    <span class="badge">24 fps · 240 кадров</span>
    <span class="badge"><b>0</b> ключевых кадров движения</span>
    <span class="badge">Cycles · CPU</span>
  </div>
  <h1>Машина Голдберга: <span class="accent">от шара — до звона колокола</span></h1>
  <p class="lead">Полностью физическая цепочка в Blender 4.5 LTS: ни одного анимированного
  ключевого кадра — только гравитация, столкновения, трение и три шарнира.
  Финал: молоток-маятник бьёт в латунный колокол, тот качается на 34° и звонит
  в два боковых страйкера.</p>

  <h2>Цепочка (SVG-схема трассы)</h2>
  <svg class="chain-svg" viewBox="0 0 1000 300" role="img" aria-label="Схема машины Голдберга">
    <defs>
      <linearGradient id="ramp" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#6e5322"/><stop offset="1" stop-color="#d4a437"/>
      </linearGradient>
    </defs>
    <text x="0" y="16" fill="#8b98ab" font-size="11" font-family="monospace">x, м → 0 … 5.4 · высоты в метрах</text>
    <line x1="30" y1="270" x2="980" y2="270" stroke="#232a3a" stroke-width="6"/>
    <!-- горка 1: верх (0.30,1.55) -> (1.34,0.95); sx=(x)*170+30, sy=270-(z)*150 -->
    <polygon points="81,37.5 258,127.5 258,145 81,55" fill="url(#ramp)" opacity="0.9"/>
    <text x="95" y="45" fill="#d4a437" font-size="12">① горка-1 · 30°</text>
    <!-- шар1 -->
    <circle cx="100" cy="70" r="17" fill="#9fb6c9" stroke="#0d1117" stroke-width="3"/>
    <text x="125" y="75" fill="#9fb6c9" font-size="12">шар1 · сталь ⌀200</text>
    <!-- стол A+B: x 1.30..2.63, верх 0.85 -->
    <rect x="251" y="142.5" width="119" height="6" fill="#a86a3c"/>
    <rect x="371" y="142.5" width="111" height="6" fill="#a86a3c"/>
    <text x="262" y="136" fill="#a86a3c" font-size="11">② скользкий стол (μ=0.1)</text>
    <text x="377" y="186" fill="#a86a3c" font-size="11">стол-B «липкий» (μ=0.9)</text>
    <!-- домино 2.00..2.455 -->
    <g fill="#d4a437">
      <rect x="370" y="112" width="6" height="31"/><rect x="381" y="112" width="6" height="31"/>
      <rect x="392" y="112" width="6" height="31"/><rect x="403" y="112" width="6" height="31"/>
      <rect x="414" y="112" width="6" height="31"/><rect x="425" y="112" width="6" height="31"/>
      <rect x="436" y="112" width="6" height="31"/><rect x="447" y="112" width="6" height="31"/>
    </g>
    <text x="368" y="105" fill="#d4a437" font-size="11">8 домино</text>
    <!-- шар2 на краю -->
    <circle cx="482" cy="135" r="8" fill="#cfe8ff" stroke="#0d1117" stroke-width="2"/>
    <text x="440" y="230" fill="#cfe8ff" font-size="11">③ шар2 (m=0.5) срывается</text>
    <!-- горка 2 (2.72,0.68) -> обрез (3.62,0.36) -->
    <polygon points="492,168 645,216 645,230 492,182" fill="url(#ramp)" opacity="0.9"/>
    <text x="500" y="163" fill="#d4a437" font-size="11">④ горка-2 · 20°</text>
    <!-- жёлоб 3.30..3.62 на 0.40 -->
    <rect x="591" y="210" width="55" height="5" fill="#a86a3c"/>
    <text x="585" y="250" fill="#a86a3c" font-size="11">жёлоб → баллистический прыжок</text>
    <path d="M 646 215 C 680 245, 690 260, 715 258" stroke="#cfe8ff" stroke-width="2" fill="none" stroke-dasharray="5 4"/>
    <circle cx="646" cy="215" r="6" fill="#cfe8ff"/>
    <!-- портал + молоток -->
    <rect x="717" y="120" width="7" height="150" fill="#5c3a1e"/>
    <rect x="763" y="120" width="7" height="150" fill="#5c3a1e"/>
    <rect x="713" y="112" width="60" height="7" fill="#5c3a1e"/>
    <text x="712" y="105" fill="#e5534b" font-size="11">⑤ портал · молоток L=0.8</text>
    <line x1="743" y1="119" x2="743" y2="159" stroke="#9fb6c9" stroke-width="4"/>
    <rect x="728" y="159" width="30" height="27" rx="5" fill="#9fb6c9" stroke="#0d1117" stroke-width="3"/>
    <text x="700" y="230" fill="#9fb6c9" font-size="11">молоток бьёт по юбке</text>
    <!-- колокол -->
    <g transform="translate(840,90)">
      <line x1="0" y1="0" x2="0" y2="22" stroke="#5c3a1e" stroke-width="5"/>
      <path d="M 0 22 C 30 26 38 60 34 96 C 30 120 16 132 0 136 C -16 132 -30 120 -34 96 C -38 60 -30 26 0 22 Z"
        fill="#d4a437" stroke="#8a6d1f" stroke-width="2"/>
      <ellipse cx="-44" cy="122" rx="7" ry="7" fill="#9fb6c9"/>
      <ellipse cx="44" cy="122" rx="7" ry="7" fill="#9fb6c9"/>
      <line x1="-44" y1="118" x2="-44" y2="40" stroke="#9fb6c9" stroke-width="3"/>
      <line x1="44" y1="118" x2="44" y2="40" stroke="#9fb6c9" stroke-width="3"/>
    </g>
    <text x="800" y="80" fill="#d4a437" font-size="11">⑥ колокол · шарнир</text>
    <text x="805" y="260" fill="#3fb950" font-size="12" font-weight="bold">♪ бонг… динь… динь</text>
  </svg>

  <h2>Ключевые кадры (рендер Cycles)</h2>
  <div class="grid shots">
{gallery_html}
  </div>

  <h2>Видео и звук</h2>
  {video_html}
  <p class="note">Звук синтезирован по телеметрии симуляции: моменты ударов страйкеров
  становятся «динь», сила удара задаёт громкость; удар молотка — низкий «бонг»
  (26 событий, см. <code>scripts/bell_sound.py</code>).</p>
  <audio controls preload="none" src="media/bell_sound.wav"></audio>

  <h2>Телеметрия симуляции</h2>
  <p class="note">Данные — из <code>work/goldberg_log.json</code>: покадровые позиции, углы
  и скорости всех звеньев. Каждая точка = 2 кадра (1/12 с).</p>
  <div class="charts">
    <div class="chart"><h3>Углы маятников</h3>
      <svg id="ch1" viewBox="0 0 460 240"></svg>
      <div class="legend">
        <span><i class="sw" style="background:#d4a437"></i>колокол, °</span>
        <span><i class="sw" style="background:#9fb6c9"></i>молоток, °</span>
        <span><i class="sw" style="background:#e5534b"></i>события</span>
      </div>
    </div>
    <div class="chart"><h3>Скорости</h3>
      <svg id="ch2" viewBox="0 0 460 240"></svg>
      <div class="legend">
        <span><i class="sw" style="background:#cfe8ff"></i>шар2, м/с</span>
        <span><i class="sw" style="background:#3fb950"></i>страйкеры, м/с</span>
        <span><i class="sw" style="background:#e5534b"></i>события</span>
      </div>
    </div>
  </div>

  <h2>Параметры звеньев</h2>
  <table>
    <tr><th>Звено</th><th class="mono">Объекты</th><th>Массы</th><th>Ключевые настройки</th></tr>
    <tr><td>① Горка-1</td><td class="mono">Ramp1 30°, rails</td><td>passive</td><td>μ=0.3, шар отпускается на кадре 6 (kinematic→dynamic)</td></tr>
    <tr><td>② Столы + домино</td><td class="mono">TableA/B, Dom0–7</td><td class="mono">0.15 кг × 8</td><td>μ стола-B 0.9: домино падают, а не скользят</td></tr>
    <tr><td>③④ Горка-2 + жёлоб</td><td class="mono">Ramp2 20°, Chute</td><td>passive</td><td>шар2 (m=0.5, μ=0.05) летит баллистически с обреза</td></tr>
    <tr><td>⑤ Молоток</td><td class="mono">Hammer</td><td class="mono">0.30 кг</td><td>шарнир Y, L=0.8 м; origin в голове = центр масс</td></tr>
    <tr><td>⑥ Колокол</td><td class="mono">Bell, Strikers</td><td class="mono">0.90 / 0.05 кг</td><td>полый профиль вращения, стенка 28 мм; 2 страйкера на шарнирах</td></tr>
  </table>

  <h2>Технические находки (проверено экспериментально)</h2>
  <div class="grid cards">
    <div class="card"><h3>Ось HINGE — локальная Z хоста</h3>
      <p>Ось шарнира задаётся не мировой, а локальной Z-осью объекта-хоста констрейнта;
      пивот = его позиция. Якорь поворачивается на 90° по X, чтобы ось стала мировой Y.</p></div>
    <div class="card"><h3>collision_margin</h3>
      <p>Дефолт 0.04 м создаёт фантомные контакты при зазорах &lt; 4 см. Везде поставлена
      маржа 0.004 — «двойные» соударения исчезли.</p></div>
    <div class="card"><h3>Центр масс = origin</h3>
      <p>У rigid body центр масс совпадает с origin объекта. Молоток: origin в голове,
      шток тянется вверх к пивоту — маятник качается сам.</p></div>
    <div class="card"><h3>Знак наклона горки</h3>
      <p><code>rot=(0, +A, 0)</code> опускает +X-конец плоскости вниз: шар едет в +X.
      Проверяется по вектору качения.</p></div>
    <div class="card"><h3>Домино: падать, а не скользить</h3>
      <p>Комбинация трений ~√(μ₁·μ₂): под домино стол «липкий» (0.9), а шар скользкий
      (0.05) — домино валятся цепочкой и толкают шар2 с края.</p></div>
    <div class="card"><h3>Стабильность солвера</h3>
      <p>substeps=10, solver_iterations=60, damping 0.04; маятники без sleep
      (<code>use_deactivation=False</code>), остальные тела засыпают на 0.08 м/с.</p></div>
  </div>

  <h2>Воспроизведение</h2>
  <pre>git clone https://github.com/Genocide12/goldberg-bell.git
cd goldberg-bell
# симуляция + телеметрия + .blend (~1 мин)
blender -b -P scripts/goldberg4.py -- --phase=save
# материалы/свет/камера + 6 ключевых кадров (~8 мин, CPU)
blender -b work/goldberg.blend -P scripts/render_goldberg.py -- --phase=keyframes
# звук колокола из телеметрии
python3 scripts/bell_sound.py
# видео: кадры + wav → mp4
python3 scripts/make_video.py</pre>

  <footer>
    Машина Голдберга · Blender 4.5 LTS · Bullet Physics · генерация сайта:
    <code>scripts/build_site.py</code> · страница самодостаточна (без CDN и сборки).
  </footer>
</main>
<script>
const DATA = {data_js};
(function () {{
  const W = 460, H = 240, L = 42, R = 10, T = 14, B = 30;
  const tMax = 10;
  function mk(el, tag, attrs) {{
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    el.appendChild(n); return n;
  }}
  function frame(el, xlab) {{
    mk(el, "rect", {{x: L, y: T, width: W - L - R, height: H - T - B, fill: "#10151f", stroke: "#232a3a"}});
    for (let s = 0; s <= tMax; s += 2) {{
      const x = L + (W - L - R) * s / tMax;
      mk(el, "line", {{x1: x, y1: T, x2: x, y2: H - B, stroke: "#232a3a", "stroke-dasharray": "3 4"}});
      mk(el, "text", {{x: x, y: H - 10, fill: "#8b98ab", "font-size": 11, "text-anchor": "middle", "font-family": "monospace"}}).textContent = s + "с";
    }}
    mk(el, "text", {{x: W / 2, y: H - 1, fill: "#66707f", "font-size": 11, "text-anchor": "middle", "font-family": "monospace"}}).textContent = xlab;
  }}
  function events(el, yMax) {{
    for (const [t, name] of DATA.events) {{
      const x = L + (W - L - R) * t / tMax;
      mk(el, "line", {{x1: x, y1: T, x2: x, y2: H - B, stroke: "#e5534b", "stroke-width": 1.2, opacity: 0.75}});
      mk(el, "text", {{x: x + 3, y: T + 11, fill: "#e5534b", "font-size": 10, "font-family": "monospace"}}).textContent = name;
    }}
  }}
  function plot(el, key, color, yMax, yLab) {{
    const pts = DATA.frames.map((f, i) => {{
      const x = L + (W - L - R) * (f - 1) / tMax / 24;
      const v = DATA[key][i];
      return [x, H - B - (H - T - B) * Math.min(v / yMax, 1.15)];
    }}).map(p => p.join(",")).join(" ");
    mk(el, "polyline", {{points: pts, fill: "none", stroke: color, "stroke-width": 2.2}});
    mk(el, "text", {{x: 4, y: T + 14, fill: color, "font-size": 11, "font-family": "monospace"}}).textContent = yLab;
  }}
  const c1 = document.getElementById("ch1");
  frame(c1, "время, с"); events(c1);
  plot(c1, "bell", "#d4a437", 40, "40°");
  plot(c1, "hammer", "#9fb6c9", 40, "");
  const c2 = document.getElementById("ch2");
  frame(c2, "время, с"); events(c2);
  plot(c2, "ball2v", "#cfe8ff", 4, "4 м/с");
  plot(c2, "strike", "#3fb950", 2, "2 м/с");
}})();
</script>
</body>
</html>
'''
open(f"{SITE}/index.html", "w").write(html)
print("SITE_OK", len(html), "bytes")
