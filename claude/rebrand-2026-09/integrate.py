"""Sodales — intégration de la marque (HTML, scripts, configs). Idempotent.

Usage : python3 integrate.py  (via /tmp copy pour le garde-fou terminal)
"""
import os
import re
import shutil

BASE = os.path.expanduser("~/work/virtualtable-rpg-audit")
CH = f"{BASE}/claude/rebrand-2026-09"
FIN = f"{CH}/assets/final"
FE = f"{BASE}/frontend"
V = "2026.09.001"


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def write(p, s):
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)


def rebox(line, newtext):
    """Recentre le contenu d'une bannière '║ … ║' en conservant sa largeur."""
    m = re.match(r"^(.*?║)(.*?)(║.*)$", line)
    inner = m.group(2)
    if "VirtualTable RPG" not in inner:
        return line
    t = newtext
    pad = len(inner) - len(t)
    left = pad // 2
    right = pad - left
    return m.group(1) + " " * left + t + " " * right + m.group(3)


# ---------- 1) assets
for src, dst in [
    ("favicon.ico", f"{FE}/favicon.ico"),
    ("favicon.png", f"{FE}/favicon.png"),
    ("apple-touch-icon.png", f"{FE}/apple-touch-icon.png"),
    ("sodales-lockup.png", f"{FE}/img/sodales-lockup.png"),
    ("sodales-lockup-dark.png", f"{FE}/img/sodales-lockup-dark.png"),
    ("sodales-icon.png", f"{FE}/img/sodales-icon.png"),
]:
    shutil.copyfile(f"{FIN}/{src}", dst)
    print("asset  ", os.path.relpath(dst, BASE))

# ---------- 2) HTML
FAV = (
    f'<link rel="icon" href="/favicon.ico?v={V}" sizes="any"/>\n'
    f'<link rel="icon" type="image/png" href="/favicon.png?v={V}"/>\n'
    f'<link rel="apple-touch-icon" href="/apple-touch-icon.png?v={V}"/>'
)
ICO = '<img class="brand-ico" src="/img/sodales-icon.png" alt=""/>'

for fn in ["index.html", "lobby.html", "game.html", "account.html", "admin.html",
           "campaign-settings.html", "features.html", "releases.html", "stats.html"]:
    p = f"{FE}/{fn}"
    s = read(p)
    changed = []

    if "favicon.ico" not in s:
        m = re.search(r"<title>[^<]*</title>", s)
        assert m, f"pas de <title> dans {fn}"
        s = s[:m.end()] + "\n" + FAV + s[m.end():]
        changed.append("favicons")

    s, c = re.subn(
        r'<a class="(logo-sm|logo)" href="([^"]*)">[^<]*</a>',
        lambda m: f'<a class="{m.group(1)}" href="{m.group(2)}">{ICO}Sodales</a>',
        s)
    if c:
        changed.append(f"header x{c}")

    s, c = re.subn(r"<h1>[^<]*VirtualTable[^<]*</h1>",
                   '<img class="brand-lockup" src="/img/sodales-lockup-dark.png" alt="Sodales"/>', s)
    if c:
        changed.append("lockup login")

    if "VirtualTable RPG" in s:
        s = s.replace("VirtualTable RPG", "Sodales")
        changed.append("brand text")

    if ICO in s and ".brand-ico{" not in s:
        m = re.search(r"^(\s*)\.logo(-sm)?\{[^\n]*$", s, re.M)
        assert m, f"pas de règle .logo(-sm) CSS dans {fn}"
        css = f"{m.group(1)}.logo{m.group(2) or ''} .brand-ico{{height:28px;vertical-align:middle;margin-right:.45rem;}}"
        s = s.replace(m.group(0), m.group(0) + "\n" + css, 1)
        changed.append("css header")

    if "brand-lockup" in s and "brand-lockup{" not in s:
        m = re.search(r"^(\s*)\.logo p\{[^\n]*$", s, re.M)
        assert m, f"pas de règle .logo p CSS dans {fn}"
        css = f"{m.group(1)}.logo img.brand-lockup{{display:block;width:280px;max-width:72vw;height:auto;margin:0 auto;}}"
        s = s.replace(m.group(0), m.group(0) + "\n" + css, 1)
        changed.append("css login")

    assert "VirtualTable" not in s, f"reste du nom dans {fn}"
    if changed:
        write(p, s)
        print(f"html   {fn}: {', '.join(changed)}")

# ---------- 3) renames nginx
os.rename(f"{BASE}/nginx/virtualtable-rpg.conf.example", f"{BASE}/nginx/sodales.conf.example")
os.rename(f"{BASE}/nginx/virtualtable-rpg-apache.conf.example", f"{BASE}/nginx/sodales-apache.conf.example")
print("rename nginx/*.conf.example -> sodales*")
for fn in ("sodales.conf.example", "sodales-apache.conf.example"):
    p = f"{BASE}/nginx/{fn}"
    s = read(p).replace("virtualtable-rpg", "sodales")
    write(p, s)
print("contenu nginx confs OK")

# ---------- 4) scripts & configs
for fn in ("install.sh", "update.sh", "deploy.sh"):
    p = f"{BASE}/{fn}"
    s = read(p)
    lines = s.split("\n")
    for i, ln in enumerate(lines):
        if "VirtualTable RPG" in ln and "║" in ln:
            inner = ln.split("║")[1]
            lines[i] = rebox(ln, inner.replace("VirtualTable RPG", "Sodales").strip())
    s = "\n".join(lines)
    s = s.replace("VirtualTable RPG", "Sodales")
    if fn == "install.sh":
        s = s.replace("virtualtable.example.com", "sodales.example.com")
        s = s.replace("/etc/cron.d/virtualtable-certbot", "/etc/cron.d/sodales-certbot")
        s = s.replace("nginx/virtualtable-rpg.conf.example", "nginx/sodales.conf.example")
        s = s.replace("nginx/virtualtable-rpg-apache.conf.example", "nginx/sodales-apache.conf.example")
    write(p, s)
    print(f"script {fn} OK")

p = f"{BASE}/.env.example"
s = read(p).replace("VirtualTable RPG", "Sodales").replace("virtualtable.example.com", "sodales.example.com")
write(p, s)
print(".env.example OK")

p = f"{BASE}/backend/package.json"
s = read(p)
s = s.replace('"name": "virtualtable-rpg-backend"', '"name": "sodales-backend"')
s = s.replace('"description": "Roll20-like VirtualTable RPG backend"',
              '"description": "Sodales — self-hosted virtual tabletop (VTT) backend"')
s = s.replace('"version": "2026.08.008"', f'"version": "{V}"')
write(p, s)
print("backend/package.json OK")

p = f"{BASE}/backend/schema.sql"
s = read(p).replace("--  VirtualTable RPG — Schéma PostgreSQL", "--  Sodales — Schéma PostgreSQL")
write(p, s)
print("backend/schema.sql OK")

write(f"{BASE}/VERSION", V + "\n")
print("VERSION ->", V)

# ---------- 5) CHANGELOG
p = f"{BASE}/CHANGELOG.md"
s = read(p)
old_head = "# Changelog\n\n## 2026.08.008 (2026-08-13)"
new_head = (
    "# Changelog\n\n"
    "All notable changes to Sodales are documented in this file.\n\n"
    "## 2026.09.001 (2026-09-21)\n\n"
    "### Changed\n"
    "- **Project renamed to Sodales** — family logo and brand assets (favicon set, app icon, "
    "login lockup), all app pages and titles updated, README rewritten in English with "
    "screenshots, MIT license added.\n\n"
    "### Technical\n"
    "- Repository renamed to `LostInTheBugs/Sodales` (old URLs redirect). Version bumped to 2026.09.001.\n\n"
    "## 2026.08.008 (2026-08-13)"
)
assert old_head in s, "en-tête CHANGELOG introuvable"
if "## 2026.09.001" not in s:
    s = s.replace(old_head, new_head, 1)
    write(p, s)
    print("CHANGELOG OK")
else:
    print("CHANGELOG déjà fait")

# ---------- vérif finale
print("\n--- vérif : occurrences restantes de 'virtualtable' (hors legacy toléré) ---")
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in (".git", "node_modules", "claude", "uploads", "img")]
    for fn in files:
        if fn.endswith((".html", ".js", ".sh", ".sql", ".json", ".md", ".example", ".yml")):
            fp = os.path.join(root, fn)
            try:
                s = read(fp)
            except Exception:
                continue
            for i, ln in enumerate(s.split("\n"), 1):
                if "virtualtable" in ln.lower():
                    print(f"  {os.path.relpath(fp, BASE)}:{i}: {ln.strip()[:100]}")
print("--- fin ---")
