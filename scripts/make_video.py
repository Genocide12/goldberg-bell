# Сборка видео из ключевых кадров + звук колокола.
# Кадры держим по ~1.4 c (24 кадра/с при 1152x648), звук с нарастающим звоном.
import subprocess, os, sys

WORK = "/home/z/my-project/work"
KEYS = f"{WORK}/keys"
OUT = "/home/z/my-project/download/goldberg_bell.mp4"

# порядок: старт -> домино -> полёт -> молоток -> удар -> звон
order = ["start", "dominoes", "flight", "hammer", "strike", "ring"]
hold = 34   # кадров на кадр (~1.4 c)

# недостающие кадры заменяем последним доступным (по порядку цепочки)
avail = [k for k in order if os.path.exists(f"{KEYS}/{k}.png")]
print("available:", avail)
if not avail:
    print("NO FRAMES"); sys.exit(1)
order = [k if os.path.exists(f"{KEYS}/{k}.png") else avail[-1] for k in order]

# последовательность с зацикливанием звонка (ring дважды — звук длинный)
seq = []
for k in order:
    seq += [k] * hold
seq += ["ring"] * hold  # финал: колокол звенит

concat_file = f"{WORK}/concat.txt"
with open(concat_file, "w") as f:
    for k in seq:
        f.write(f"file '{KEYS}/{k}.png'\n")
        f.write(f"duration {1/24:.5f}\n")
    f.write(f"file '{KEYS}/{seq[-1]}.png'\n")

cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_file,
       "-i", f"{WORK}/bell_sound.wav",
       "-r", "24", "-c:v", "libx264", "-pix_fmt", "yuv420p",
       "-crf", "20", "-c:a", "aac", "-b:a", "160k",
       "-shortest", OUT]
r = subprocess.run(cmd, capture_output=True, text=True)
print("ffmpeg rc:", r.returncode)
if r.returncode != 0:
    print(r.stderr[-1500:])
else:
    print("VIDEO_DONE", OUT)
