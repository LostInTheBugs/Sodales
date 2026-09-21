#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Sodales — Restauration d'une sauvegarde
#  Usage : ./restore.sh backups/20260921-120000 [--yes]
#
#  Restaure la base (pg_restore --clean --if-exists : le contenu actuel
#  des tables est remplacé) puis les fichiers uploadés.
#  --yes saute la confirmation (scripts, tests de restauration).
#
#  ⚠️  Arrêtez le backend pendant la restauration si possible :
#      docker compose stop rpg
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERREUR]${NC} $*" >&2; exit 1; }

SRC="${1:-}"
ASSUME_YES=false
[[ "${2:-}" == "--yes" || "${1:-}" == "--yes" ]] && ASSUME_YES=true
[[ -z "$SRC" || "$SRC" == "--yes" ]] && err "Usage : ./restore.sh <dossier-de-sauvegarde> [--yes]"
[[ -d "$SRC" ]] || err "Dossier introuvable : $SRC"
[[ -f "$SRC/db.dump" ]] || err "db.dump absent dans $SRC"

echo -e "${YELLOW}Restauration depuis : $SRC${NC}"
[[ -f "$SRC/manifest.txt" ]] && sed 's/^/  /' "$SRC/manifest.txt"

if ! $ASSUME_YES; then
  echo ""
  read -rp "$(echo -e "${YELLOW}Le contenu actuel de la base sera REMPLACÉ. Continuer ? [o/N] :${NC} ")" C
  [[ "${C,,}" == "o" ]] || { echo "Annulé."; exit 0; }
fi

# ── 1. Base de données ────────────────────────────────────────
if docker inspect rpg-db >/dev/null 2>&1; then
  info "Restauration PostgreSQL (conteneur rpg-db)…"
  docker exec -i rpg-db pg_restore -U rpg -d rpg --clean --if-exists --no-owner < "$SRC/db.dump" 2>&1 | grep -vE "^(pg_restore: )?(warning|errors ignored)" || true
  ok "Base restaurée."
elif [[ -n "${DATABASE_URL:-}" ]]; then
  command -v pg_restore >/dev/null 2>&1 || err "pg_restore introuvable (installez postgresql-client)."
  info "Restauration PostgreSQL (DATABASE_URL)…"
  pg_restore -d "$DATABASE_URL" --clean --if-exists --no-owner "$SRC/db.dump" 2>&1 | grep -vE "^(pg_restore: )?(warning|errors ignored)" || true
  ok "Base restaurée."
else
  err "Aucune base trouvée : conteneur rpg-db absent et DATABASE_URL non défini."
fi

# ── 2. Fichiers uploadés ──────────────────────────────────────
if [[ -f "$SRC/uploads.tar.gz" ]]; then
  info "Restauration des fichiers uploadés…"
  mkdir -p frontend/uploads
  tar xzf "$SRC/uploads.tar.gz" -C frontend --no-same-owner
  ok "Fichiers restaurés."
fi

ok "Restauration terminée. Redémarrez le backend : docker compose up -d rpg"
