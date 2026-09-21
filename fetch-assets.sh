#!/bin/bash
# ── Sodales — médias (portraits, vidéos I2V, musique) ──────────────
# Ces fichiers (~95 Mo) ne sont PAS stockés dans git : ils sont téléchargés
# depuis la release « assets-<version> » du dépôt et vérifiés par empreinte
# SHA-256 avant extraction. Script idempotent.
#
# Variables d'environnement (optionnelles) :
#   SODALES_ASSETS_VERSION  version des médias à installer (défaut : celle du dépôt)
#   SODALES_ASSETS_URL      URL de l'archive (défaut : release GitHub)
#   SODALES_ASSETS_SHA      empreinte SHA-256 attendue (obligatoire si URL/version custom)
set -e
cd "$(dirname "$0")"

# ── Version des médias attendue par cette révision du dépôt ──
# (mettre à jour ces deux lignes à chaque nouvelle release d'assets)
ASSETS_VERSION_DEFAULT="2026.09"
SHA_2026_09="09b8c7d690a3016c5ccc67746bf155950f42ad12e07638e6a54f2d285bb13b9e"

VERSION="${SODALES_ASSETS_VERSION:-$ASSETS_VERSION_DEFAULT}"
case "$VERSION" in
  2026.09) SHA_DEFAULT="$SHA_2026_09" ;;
  *)       SHA_DEFAULT="" ;;
esac
URL="${SODALES_ASSETS_URL:-https://github.com/LostInTheBugs/Sodales/releases/download/assets-${VERSION}/sodales-assets-${VERSION}.tar.gz}"
SHA="${SODALES_ASSETS_SHA:-$SHA_DEFAULT}"

# ── Déjà installé dans la bonne version ? ──
if [ -f frontend/.assets-version ] \
   && [ "$(cat frontend/.assets-version)" = "$VERSION" ] \
   && [ -f frontend/img/cats-bengal-portrait.jpg ] \
   && [ -f frontend/music/taverne.mp3 ]; then
  echo "[assets] Médias ${VERSION} déjà installés — rien à faire."
  exit 0
fi

if [ -z "$SHA" ]; then
  echo "[assets] Aucune empreinte SHA-256 connue pour la version '${VERSION}'." >&2
  echo "[assets] Définissez SODALES_ASSETS_SHA=<empreinte> et relancez." >&2
  exit 1
fi

echo "[assets] Téléchargement des médias ${VERSION} (~95 Mo) depuis la release assets..."
TMP="$(mktemp /tmp/sodales-assets.XXXXXX.tar.gz)"
trap 'rm -f "$TMP"' EXIT
if command -v curl >/dev/null 2>&1; then
  curl -L --fail --silent --show-error -o "$TMP" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -q -O "$TMP" "$URL"
else
  echo "[assets] Ni curl ni wget — téléchargez à la main puis : tar xzf <archive>" >&2
  exit 1
fi

# ── Vérification d'intégrité AVANT toute extraction ──
if command -v sha256sum >/dev/null 2>&1; then
  GOT="$(sha256sum "$TMP" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  GOT="$(shasum -a 256 "$TMP" | awk '{print $1}')"
else
  echo "[assets] sha256sum/shasum introuvable — impossible de vérifier l'archive." >&2
  exit 1
fi
if [ "$GOT" != "$SHA" ]; then
  echo "[assets] ÉCHEC de vérification SHA-256 — archive rejetée, rien n'a été extrait :" >&2
  echo "  attendu : $SHA" >&2
  echo "  obtenu  : $GOT" >&2
  exit 1
fi

tar xzf "$TMP" --no-same-owner
mkdir -p frontend/music frontend/maps frontend/img
echo "$VERSION" > frontend/.assets-version
echo "[assets] OK (empreinte vérifiée) : $(find frontend/img -maxdepth 1 -name '*.jpg' | wc -l) portraits, $(find frontend/img -maxdepth 1 -name '*.mp4' | wc -l) vidéos, $(find frontend/music -maxdepth 1 -name '*.mp3' | wc -l) musiques, $(find frontend/maps -maxdepth 1 -name '*.jpg' | wc -l) cartes."
