#!/usr/bin/env python3
"""Собирает локальные vendor-файлы для site/: three.js, rapier2d, OrbitControls,
RoomEnvironment — как классические скрипты (глобалы), без сборщика и без CDN.
Источники: site/vendor/dist (npm-пакеты), raw.githubusercontent.com (examples)."""
import base64, re, subprocess, pathlib

V = pathlib.Path("/home/z/my-project/site/vendor")
V.mkdir(parents=True, exist_ok=True)

def read(p): return (V / p).read_text(encoding="utf-8")
def write(p, s): (V / p).write_text(s, encoding="utf-8"); print(f"{p}: {len(s)} байт")

# ---------- three.core.global.js + three.global.js (r187 split bundle) ----------
core = read("three.core.js")
m = re.search(r"export\s*\{([^}]*)\};?\s*$", core.strip())
assert m, "three.core: export не найден"
core_names = [n.strip() for n in m.group(1).split(",") if n.strip()]
core_body = core[:m.start()]
write("three.core.global.js", "(function(){\n" + core_body + "\n;globalThis.THREE_CORE={" + ",".join(core_names) + "};\n})();")

src = read("three.module.js")
# import {...} from './three.core.js'; -> const {...} = globalThis.THREE_CORE;
src = re.sub(r"import\s*\{([^}]*)\}\s*from\s*['\"]\.?/?three\.core\.js['\"]\s*;?",
             lambda m: "const {" + m.group(1) + "} = globalThis.THREE_CORE;",
             src)
# export {...} from './three.core.js'; (re-export) -> убрать, имена уже в THREE_CORE
src = re.sub(r"export\s*\{([^}]*)\}\s*from\s*['\"]\.?/?three\.core\.js['\"]\s*;?", "", src)
m = re.search(r"export\s*\{([^}]*)\};?\s*$", src.strip())
assert m, "three: export не найден"
names = [n.strip() for n in m.group(1).split(",") if n.strip()]
body = src[:m.start()]
# добавить re-export имена в глобал (это часть three-публичного API)
re_names = re.findall(r"\{([^}]*)\}\s*from\s*['\"]\.?/?three\.core\.js['\"]", read("three.module.js") + "}")
# re-export имена из three.core (Ray, Controls, Plane...) — доопределить в THREE
core_src = read("three.core.js")
mre = re.search(r"export\s*\{([^}]*)\}\s*;?\s*$", core_src.strip())
assert mre, "core export?"
have = set(names)
extra = []
for item in mre.group(1).split(","):
    n = item.strip()
    if n and " as " not in n and n not in have:
        extra.append(n)
adds = "".join(f"T.{n}=C.{n};" for n in extra)
tail = ("\n;(function(){var C=globalThis.THREE_CORE,T=globalThis.THREE;" + adds + "})();")
write("three.global.js", "(function(){\n" + body + "\n;globalThis.THREE={" + ",".join(names) + "};\n})();" + tail)

# ---------- rapier.global.js ----------
src = read("dist/rapier.mjs")
src = re.sub(r"//# sourceMappingURL=.*$", "", src)
m = re.search(r"export\{([^}]*)\};?\s*$", src)
assert m, "rapier: export не найден"
pairs = []
for item in m.group(1).split(","):
    item = item.strip()
    if not item: continue
    if " as " in item:
        ident, name = [x.strip() for x in item.split(" as ")]
    else:
        ident = name = item
    pairs.append(f"{name}:{ident}")
body = src[:m.start()]
write("rapier.global.js", "(function(){\n" + body + "\n;globalThis.RAPIER={" + ",".join(pairs) + "};\n})();")

# ---------- rapier_wasm.b64.js ----------
wasm = (V / "dist/rapier_wasm2d_bg.wasm").read_bytes()
b64 = base64.b64encode(wasm).decode()
write("rapier_wasm.b64.js", 'globalThis.RAPIER_WASM_B64="' + b64 + '";\n')

# ---------- examples/jsm с GitHub (r187) ----------
def fetch_github(path):
    url = f"https://raw.githubusercontent.com/mrdoob/three.js/r187/{path}"
    out = subprocess.run(["curl", "-s", url], capture_output=True, text=True).stdout
    assert len(out) > 500 and "export" in out, f"не скачался {path}"
    return out

def transform_example(src, global_stmt):
    # import {...} from 'three';  ->  const {...} = globalThis.THREE;
    def import_repl(m):
        names = m.group(1)
        return f"const {{{names}}} = globalThis.THREE;"
    src = re.sub(r"import\s*\{([^}]*)\}\s*from\s*['\"]three['\"]\s*;?", import_repl, src)
    # export { X }; / export { X as Y }; -> globalThis.…=…
    src = re.sub(r"export\s*\{([^}]*)\}\s*;", lambda m: global_stmt, src)
    src = re.sub(r"//# sourceMappingURL=.*$", "", src)
    return src

oc = fetch_github("examples/jsm/controls/OrbitControls.js")
write("orbit.global.js", transform_example(oc, "globalThis.THREE.OrbitControls = OrbitControls;"))
re_env = fetch_github("examples/jsm/environments/RoomEnvironment.js")
write("roomenv.global.js", transform_example(re_env, "globalThis.RoomEnvironment = RoomEnvironment;"))
print("OK")
