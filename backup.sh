#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Sodales — Sauvegarde (base de données + fichiers uploadés)
#  Usage : ./backup.sh        (planifiable en cron)
#
#  Crée backups/<horodatage>/ contenant :
#    - db.dump        base complète (format pg_dump -Fc, restaurable)
#    - uploads.tar.gz fichiers du dossier frontend/uploads
#    - manifest.txt   horodatage, source, tailles
#
#  Variables : BACKUP_DIR (défaut ./backups), BACKUP_KEEP (défaut 7)
#  Restauration : ./restore.sh <dossier-de-sauvegarde>
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
info() { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }
err()  { echo -e "${RED}[ERREUR]${NC} $*" >&2; exit 1; }

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-7}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_DIR/$STAMP"

mkdir -p "$DEST"

# ── 1. Base de données ────────────────────────────────────────
if docker inspect rpg-db >/dev/null 2>&1; then
  info "Sauvegarde PostgreSQL (conteneur rpg-db)…"
  docker exec rpg-db pg_dump -U rpg -Fc rpg > "$DEST/db.dump"
  DB_SRC="conteneur rpg-db"
elif [[ -n "${DATABASE_URL:-}" ]]; then
  command -v pg_dump >/dev/null 2>&1 || err "pg_dump introuvable (installez postgresql-client)."
  info "Sauvegarde PostgreSQL (DATABASE_URL)…"
  pg_dump -Fc "$DATABASE_URL" > "$DEST/db.dump"
  DB_SRC="DATABASE_URL"
else
  err "Aucune base trouvée : conteneur rpg-db absent et DATABASE_URL non défini (sourcez .env)."
fi

# ── 2. Fichiers uploadés ──────────────────────────────────────
if [[ -d frontend/uploads ]]; then
  info "Archive des fichiers uploadés…"
  tar czf "$DEST/uploads.tar.gz" -C frontend uploads
else
  info "Aucun dossier frontend/uploads — archive vide créée."
  mkdir -p frontend/uploads
  tar czf "$DEST/uploads.tar.gz" -C frontend uploads
fi

# ── 3. Manifeste ──────────────────────────────────────────────
{
  echo "date=$STAMP"
  echo "db_source=$DB_SRC"
  echo "db_taille=$(stat -c%s "$DEST/db.dump" 2>/dev/null || stat -f%z "$DEST/db.dump")"
  echo "uploads_taille=$(stat -c%s "$DEST/uploads.tar.gz" 2>/dev/null || stat -f%z "$DEST/uploads.tar.gz")"
} > "$DEST/manifest.txt"

# ── 4. Rétention ──────────────────────────────────────────────
info "Rétention : ${KEEP} sauvegardes conservées."
ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

ok "Sauvegarde terminée : $DEST"
echo "     $(du -sh "$DEST" | cut -f1) — restauration : ./restore.sh $DEST"
