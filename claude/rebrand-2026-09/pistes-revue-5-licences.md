# Licences — suites données (2026-09-21)

## Fait, sur demande de Fred
- **Systèmes « Star Wars » et « Le Seigneur des Anneaux » retirés de l'application** : définitions
  (`systems.js`), mappings race/classe→image (`lobby.js`), sélecteurs (`lobby.html`,
  `campaign-settings.js`), suggestions de cartes (`map-presets.js`) — et tous leurs médias
  (`swars-*`, `sda-*`, 60 fichiers, ~11 Mo).
- **Vidéos d'animation des personnages retirées** (`*-i2v.mp4`, `*-grok.mp4`, 94 fichiers, ~22 Mo) :
  trop de stockage. Les portraits, GIF d'animation et intros de système sont conservés ; le lien
  « Animation » du lobby s'auto-masque quand le fichier est absent.
- Nouveau bundle **assets-2026.10** : 248 fichiers, **65 Mo** (au lieu de 95), empreinte SHA-256
  épinglée dans `fetch-assets.sh` (version 2026.10). Ancienne release `assets-2026.09` supprimée.
- Déployé prod + test (médias purgés : prod img 75→50 Mo), v2026.09.018.

## Ce qui reste (si promotion un jour)
Marques encore présentes : Warhammer (35), Vampire (30), Cats! (29), Dune (19), Cthulhu (18),
Shadowrun (17), Paranoia (16), Cyberpunk (10) — couverts / permissifs : D&D 5e (SRD CC-BY),
Pathfinder 2e (ORC), Savage Worlds (licence fan).
Stockage restant : portraits ~40 Mo, musique ~21 Mo, cartes 2,2 Mo.

## Pistes (revue #5, sans urgence)
1. Tests E2E front (Playwright) — quand on retouchera le front.
2. Migrations de base numérotées — au premier changement de schéma non idempotent.
