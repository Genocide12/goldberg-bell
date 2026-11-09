# Синтез звука колокола по телеметрии: удары страйкеров -> моменты "динь",
# сила удара -> громкость. Плюс низкий "бонг" от удара молотка.
import json, math, wave, struct

FPS = 24
SR = 44100
DUR = 8.0
N = int(SR * DUR)
audio = [0.0] * N

d = json.load(open("/home/z/my-project/work/goldberg_log.json"))
frames = d["frames"]

PARTIALS = [
    (440.0, 0.9, 5.2, 1.00), (440*2.0, 0.45, 4.0, 0.95),
    (440*2.4, 0.35, 3.0, 0.80), (440*3.0, 0.28, 2.2, 0.70),
    (440*4.5, 0.22, 1.6, 0.65), (440*5.4, 0.15, 1.1, 0.60),
    (440*6.8, 0.10, 0.8, 0.55),
]

def add_strike(t0, gain):
    n0 = int(t0 * SR)
    for (f, a, dec, atk) in PARTIALS:
        n_end = min(N, n0 + int(dec * SR))
        for n in range(n0, n_end):
            t = (n - n0) / SR
            env = min(1.0, t / 0.002) * math.exp(-t / dec)
            audio[n] += gain * a * env * math.sin(2 * math.pi * f * t)

def add_thump(t0, gain):
    n0 = int(t0 * SR)
    dec = 0.25
    n_end = min(N, n0 + int(dec * SR * 3))
    for n in range(n0, n_end):
        t = (n - n0) / SR
        env = min(1.0, t / 0.001) * math.exp(-t / dec)
        audio[n] += gain * 0.7 * env * math.sin(2 * math.pi * 130 * t)
        audio[n] += gain * 0.4 * env * math.sin(2 * math.pi * 97 * t)

events = []
prev_lv = prev_rv = 0.0
for r in frames:
    f = r["f"]
    t = (f - 1) / FPS
    lv, rv = r["StrikerL"][4], r["StrikerR"][4]
    if prev_lv < 0.15 <= lv:
        events.append((t, min(lv, 3.0), "ring"))
    if prev_rv < 0.15 <= rv:
        events.append((t + 0.001, min(rv, 3.0), "ring"))
    prev_lv, prev_rv = lv, rv
for r in frames:
    if r["f"] > 40 and abs(r["Hammer"][3]) > 3:
        events.append(((r["f"] - 1) / FPS, 1.0, "thump"))
        break

print("events:", len(events), [(round(t,2), round(v,2), k) for t, v, k in events[:12]])
for t, v, kind in events:
    if kind == "ring":
        add_strike(t, 0.10 + 0.12 * v)
    else:
        add_thump(t, 0.35)
        add_strike(t + 0.005, 0.22)

peak = max(abs(x) for x in audio)
k = 0.85 / peak if peak > 0 else 1.0
audio = [math.tanh(x * k * 1.2) for x in audio]

with wave.open("/home/z/my-project/work/bell_sound.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", int(a * 32000)) for a in audio))
print("WAV_DONE")
