#!/bin/bash
# ── Sodales — médias (portraits, vidéos I2V, musique) ──────────────
# Ces fichiers (~95 Mo) ne sont pas stockés dans git : ils sont téléchargés
# depuis la release « assets-2026.09 ». Script idempotent.
set -e
cd "$(dirname "$0")"

URL="${SODALES_ASSETS_URL:-https://github.com/LostInTheBugs/Sodales/releases/download/assets-2026.09/sodales-assets-2026.09.tar.gz}"

if [ -f frontend/img/cats-bengal-portrait.jpg ] && [ -f frontend/music/taverne.mp3 ]; then
  echo "[assets] Médias déjà présents — rien à faire."
  exit 0
fi

echo "[assets] Téléchargement des médias (~95 Mo) depuis la release assets..."
TMP="$(mktemp /tmp/sodales-assets.XXXXXX.tar.gz)"
if command -v curl >/dev/null 2>&1; then
  curl -L --fail --silent --show-error -o "$TMP" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q -O "$TMP" "$URL"
else
  echo "[assets] Ni curl ni wget — téléchargez à la main puis : tar xzf <archive>" >&2
  exit 1
fi

tar xzf "$TMP"
rm -f "$TMP"
echo "[assets] OK : $(find frontend/img -maxdepth 1 -name '*.jpg' | wc -l) portraits, $(find frontend/img -maxdepth 1 -name '*.mp4' | wc -l) vidéos, $(find frontend/music -maxdepth 1 -name '*.mp3' | wc -l) musiques."
