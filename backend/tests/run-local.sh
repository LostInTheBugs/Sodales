#!/bin/bash
# Tests d'autorisation Sodales — lanceur local.
# Démarre rpg-db si besoin (docker compose -p sodaleslocal), construit
# PG_SUPER_URL depuis .env, puis exécute la suite (base jetable).
#
# Usage :  backend/tests/run-local.sh
set -e
cd "$(dirname "$0")/../.."

if [ -z "${PG_SUPER_URL:-}" ]; then
  if ! docker inspect rpg-db >/dev/null 2>&1; then
    echo "→ rpg-db absent : démarrage (docker compose -p sodaleslocal up -d rpg-db)"
    docker compose -p sodaleslocal up -d rpg-db 2>&1 | tail -1
    sleep 4
  fi
  PASS=$(grep -E '^RPG_DB_PASSWORD=' .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [ -z "$PASS" ]; then
    echo "RPG_DB_PASSWORD introuvable dans .env — définissez PG_SUPER_URL à la main." >&2
    exit 1
  fi
  IP=$(docker inspect rpg-db --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
  if [ -z "$IP" ]; then
    echo "Conteneur rpg-db introuvable (lancement échoué ?)" >&2
    exit 1
  fi
  export PG_SUPER_URL="postgres://rpg:${PASS}@${IP}:5432/postgres"
fi

echo "→ Base hôte : ${PG_SUPER_URL%%@*}@… (base jetable sodales_test_<pid>)"
cd backend
npm test
