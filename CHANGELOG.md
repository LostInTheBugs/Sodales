# Changelog

All notable changes to Sodales are documented in this file.

## 2026.09.019 (2026-09-21)

### External review follow-up — migrations, hardening, tests, docs
- **Numbered SQL migrations** replace the cumulative `schema.sql`: `backend/migrations/NNN_*.sql` applied at server start (and by `install.sh` / `update.sh` / `deploy.sh`) through `migrations/run.js` — idempotent, serialised by a PostgreSQL advisory lock, baseline-aware for databases created before the change. Tests cover fresh / re-run / baseline / failed-migration paths. Fixed a **pre-existing syntax error in `install.sh`** (the installer did not parse at all).
- **No external runtime dependency left in the frontend**: three.js, marked and DOMPurify vendored in `js/vendor/`, the Socket.io client served by the app itself → CSP `script-src 'self'` (both CDN origins removed). Markdown rendering now fails **closed** (escaped) when the sanitiser is unavailable.
- **Six `data-act` handlers were missing their `$el` argument** (item/spell row delete, portrait fallbacks, audio queue button, invite-code input) — silent regressions from the CSP migration. Fixed; a scanner guards this class of bug.
- **Uploads**: tests added (valid upload → UUID filename, content/extension mismatch → rejected *and* deleted from disk, SVG refused, delete permissions).
- **Deployment hardening**: pinned images (`postgres:15.8-alpine`, `nginx:1.27-alpine`, `certbot/certbot:v5.8.0`), explicit Docker network, log rotation, CPU/memory limits, PostgreSQL never published on the host.
- **Backups**: `backup.sh` / `restore.sh` (pg_dump + uploads, retention); restore verified against a scratch database with row-count comparison.
- **Docs**: `docs/PERMISSIONS.md` (permission matrix mapped to the covering test), `docs/USAGE.md` (GM/player guide, backups, updates, media), Dependabot config.

## 2026.09.018 (2026-09-21)

### Removals — Star Wars / The Lord of the Rings systems, and per-character videos
- The `Star Wars` and `Le Seigneur des Anneaux` systems are removed from the app: definitions, race/class image maps, selectors and map presets, along with their media (60 files, ~11 MB).
- Per-character animation videos (`*-i2v.mp4`, `*-grok.mp4`; 94 files, ~22 MB) are removed — the "Animation" link in the character picker simply stays hidden when the file is absent (portraits, GIFs and system intros are untouched).
- New media bundle `assets-2026.10` (248 files, 65 MB instead of 95 MB) with its pinned SHA-256; `fetch-assets.sh` now pins version 2026.10.

## 2026.09.017 (2026-09-21)

### Internal — no code path depends on the single-process socket map anymore
- Remaining `io.sockets.sockets.get(id).role` reads replaced by `fetchSockets()` + `socket.data.role`: whispers, combat targets (`set_target`, `clear_target`, `reveal_targets_on_roll`), combat HP ownership, level-up notifications, campaign join filters and the `scoped()` GM guard.
- 2 new tests covering those GM-targeted broadcasts (combat targets, whispers) — 63 total in CI.

## 2026.09.016 (2026-09-21)

### Fixes — all hidden-token leaks closed, centralised in one helper
- New `emitToken(campaignId, token, event, payload, opts)` helper: an invisible token is emitted **to GMs only**. Every token-related event goes through it now — `token_moved`, `token_created`, `token_deleted`, `token_hp_updated`, `token_conditions_updated` — plus the per-recipient `map_changed` (015).
- `token_move`, `token_hp` and `token_delete` now read the token's visibility with the same write and emit nothing if the row is not in the campaign.
- `token_conditions` verifies the token belongs to the campaign before broadcasting.
- The role is also stored in `socket.data.role`, so the GM filter keeps working with a multi-node adapter (Redis), where `fetchSockets()` only returns `socket.data`.
- 3 new socket tests (61 total in CI); the new tests were verified to **fail without the fix** (3 failures) and pass with it.

## 2026.09.015 (2026-09-21)

### Tests — coverage beyond authorization + two hidden-token leaks fixed
- New test suites (35 tests, total 58 in CI): `tests/sheet-rules.test.js` (encumbrance math, item weights, vision meters, PF2e class DC and proficiency ranks — pure Node, no browser) and `tests/map-sync.socket.test.js` (token move broadcast/persistence/ownership, map change, fog of war, cross-campaign isolation).
- **Fixed**: `map_change` filtered invisible tokens using the *sender's* role (always GM, since the event is GM-only) and then broadcast the same payload to everyone — players received invisible tokens. The payload is now built per recipient.
- **Fixed**: `token_create` now accepts a `visible` flag and only sends an invisible token to GMs (same rule as the initial campaign load).
- Test runner labels updated (`tests.yml`, `run-local.sh`).

## 2026.09.014 (2026-09-21)

### Fixes — fourth review: media handling on existing instances
- `update.sh` now restores the media right after `git reset --hard` (they are no longer tracked, so the reset used to delete them on existing installs) and installs a newer asset version when one is published.
- `fetch-assets.sh`: the archive's SHA-256 is pinned and verified **before** extraction (a tampered download is rejected, nothing is extracted); `--no-same-owner` on extraction; the installed asset version is recorded in `frontend/.assets-version` and compared, so future `assets-YYYY.MM` releases reach existing instances.
- A custom `SODALES_ASSETS_URL` now requires an explicit `SODALES_ASSETS_SHA` — no silent unverified download.

## 2026.09.013 (2026-09-21)

### Fixes — third review: CSP everywhere, local QR, media residue, admin delete ordering
- CSP added to the standalone-proxy configs (`nginx/sodales.conf.example`, `nginx/sodales-apache.conf.example`) so installs behind an existing proxy get it too.
- QR code generated locally (vendored `qrcode-generator`, MIT) instead of calling `api.qrserver.com`; the CSP `img-src` no longer allows any third-party host.
- Removed the remaining media from git tracking (AI cat portraits + default maps, ~13 MB) and purged them from history; the asset bundle (402 files, ~95 MB) is updated accordingly.
- Admin account deletion now disconnects the user's sockets **before** the row is deleted (no window).
- `window.ACT` alias exposed so module-level action helpers register (fixes `ACT is not defined` in the chat/audio modules).
- Cache-busters bumped to `?v=2` for all modular JS.

## 2026.09.012 (2026-09-21)

### Security — Content-Security-Policy enforced (no more unsafe-inline for scripts)
- Removed every inline event handler (360 attributes across 9 pages and the JS modules) in favour of event delegation: `data-act` / `data-a` attributes handled by a single engine (`js/csp-actions.js`) with an explicit action registry (`js/csp-registry.js`, 224 actions).
- Moved the 9 inline `<script>` blocks out of the pages into `js/page/*.js` and `js/game/core.js` — no page ships inline JavaScript anymore.
- CSP switched from Report-Only to enforced: `script-src 'self' https://cdn.socket.io https://cdnjs.cloudflare.com` (no `unsafe-inline`, no `unsafe-eval`).
- Verified in a real browser: 9 pages, 0 violations, 0 JS errors, dice rolls / panels / character sheet / forms all exercised under the blocking policy.

## 2026.09.011 (2026-09-21)

### Refactor — game.html modularization (step 4, final)
- Extracted ~2,430 more lines from `game.html` (4,839 → 2,430) into seven modules: `js/game/socket-events.js`, `js/game/audio-player.js` (procedural ambiences, queue, playlists, upload), `js/game/map-presets.js`, `js/game/combat-tracker.js`, `js/game/item-picker.js`, `js/game/gm-tools.js`, `js/game/socket-listeners.js`.
- And before them (steps 3-4 of today): map interactions, map tools, walls, lighting, vision/fog, map settings/UVTT.
- Final state: `game.html` went from **11,072 lines to 2,430** (CSS + HTML + a ~260-line bootstrap shell: state, auth guard, campaign loading); the app logic now lives in **25 modules** under `js/game/` (~8,850 lines).
- Verbatim moves throughout (function census identical at each step), 0 JS errors in real browser sessions — map, tokens, fog, chat, dice, character sheet, NPC library, audio panel, combat tracker, item picker all exercised.

## 2026.09.010 (2026-09-21)

### Refactor — game.html modularization (step 3, map layer)
- Extracted ~1,000 more lines from `game.html` (8,262 → 7,275; 11,072 originally) into five modules: `js/game/map-render.js` (grid + token drawing), `js/game/token-render.js` (token image cache), `js/game/map-overlays.js` (HP on tokens, pings, turn sound, freehand drawing, targeting), `js/game/shortcuts.js` (keyboard shortcuts + Ctrl+Z history), `js/game/map-extras.js` (spell zones, objects, render optimization).
- Verbatim move (function census identical: 273 → 273), 0 JS errors in a real browser session — map rendered, tokens drawn, ping sent, hex grid toggled, all exercised.

## 2026.09.009 (2026-09-21)

### Refactor — game.html modularization (step 2)
- Extracted ~1,070 more lines from `game.html` (9,323 → 8,262; 11,072 originally) into four modules: `js/game/token-creator.js` (token creation + placement), `js/game/npc-library.js` (D&D 5e NPC library, CR 0 → 20+), `js/game/combo-select.js` (sheet dropdown helpers), `js/game/sheet-rules.js` (encumbrance, vision in meters, class abilities, PF2e helpers).
- Same guarantees as step 1: verbatim move (function census identical: 325 → 325, no duplicates), no logic rewrite, 0 JS errors in a real browser session — NPC library (103 cards), token creator and the character sheet all exercised.

## 2026.09.008 (2026-09-21)

### Refactor — game.html modularization (step 1)
- Extracted ~1,760 lines out of the `game.html` monolith (11,072 → 9,323 lines) into three plain-script modules loaded before the main inline script: `js/game/chat.js` (chat + random tables), `js/game/dice.js` (2D/3D dice), `js/game/char-sidebar.js` (sheet tooltips, quick rolls, spell casting).
- Verbatim move, no logic rewrite: function census identical before/after (412 functions, no duplicates), and a real browser session shows 0 JS errors — chat, dice picker, random tables and the character-sheet modal all exercised.

## 2026.09.007 (2026-09-21)

### Tests — authorization suite
- First test suite in the repo: 23 integration tests (REST + WebSockets) covering campaign isolation (non-members), player vs GM permissions, character ownership, admin routes, JWT revocation (REST + socket handshake) and GM-only socket events.
- Tests run against a throwaway PostgreSQL database (`PG_SUPER_URL`): the harness creates the DB, spawns the real backend and signs test JWTs directly to stay clear of the auth rate limiters.
- New CI workflow `.github/workflows/tests.yml` runs the suite on every push / PR to `main`; `backend/tests/run-local.sh` runs it locally.
- Validated as a real safety net: neutralizing the non-member guard in `campaigns.js` makes the suite fail.

## 2026.09.006 (2026-09-21)

### Repository & installer — media out of git
- The heavy media (~95 MB: 256 character portraits, 118 I2V videos, 10 music tracks) are no longer stored in git. They now ship as a dedicated `assets-2026.09` GitHub release, fetched by the new `fetch-assets.sh` (called automatically by `install.sh`, and by `deploy.sh` when the clone lacks them).
- Git history was rewritten accordingly: the repository drops from ~108 MB to a few MB.
- The app still runs without the assets (missing portraits/videos/music) — a plain clone is enough for development.

## 2026.09.005 (2026-09-21)

### Security — review follow-up #2
- Roles are re-read from the database on every request (and at socket handshake): an admin demotion or tier change now takes effect immediately, instead of remaining valid in the JWT for up to 7 days.
- Admin promotion/demotion, tier changes and account deletion now increment `token_version` and disconnect every live socket of that account — each socket joins a per-user room (`user:<id>`) at handshake.
- Changing the password also disconnects the account's live sockets, and a new route `POST /account/logout-others` revokes every other session (tokens + sockets) without changing the password — exposed as a button on the account page.

### Web server
- Content-Security-Policy added in **Report-Only** mode (measures the inline-script surface — `game.html` — before any enforcement; nothing is blocked).

## 2026.09.004 (2026-09-21)

### Security — hardening (external review follow-up)
- CORS no longer falls back to a wildcard: without `ALLOWED_ORIGIN`, no CORS headers are sent (same-origin only); an explicit value (including `*`) still works.
- Added `helmet` on the API (without CSP — the app relies on inline scripts; a strict CSP is a separate project), an explicit `express.json` body limit (1 MB), and `install.sh` no longer defaults `ALLOWED_ORIGIN` to `*`.
- Token revocation: JWTs now carry the account's `token_version`; changing the password increments it and invalidates all previous tokens (API middleware + socket handshake), then issues a fresh token to the current session.

### Documentation
- `TOKENS.md` cleaned up for a public audience (no internal references); README gained a trademarks / third-party content note.

## 2026.09.002 (2026-09-21)

### Corrections
- **Character sheet modal broken on the game page** — the "✏ Modifier la fiche" button no longer opened (JavaScript ReferenceError: race, class and subclass lists were referenced but had been removed by mistake in an earlier cleanup). Subclass lists restored; race and class lists now come from the campaign's game system (all 15 systems, instead of two hard-coded lists).

### Technical
- Frontend-only fix (`frontend/game.html`) — no schema or API change.

## 2026.09.001 (2026-09-21)

### Changed
- **Project renamed to Sodales** — family logo and brand assets (favicon set, app icon, login lockup), all app pages and titles updated, README rewritten in English with screenshots, MIT license added.

### Technical
- Repository renamed to `LostInTheBugs/Sodales` (old URLs redirect). Version bumped to 2026.09.001.

## 2026.08.008 (2026-08-13)

### Ajouts
- **Animations vidéo (I2V) pour les 108 races** : chaque race des 15 systèmes a maintenant son animation générée (LTX 0.9.5, ~2 s, 512×512) — le lien « Animation » apparaît automatiquement au choix de la race, en complément des 7 races Cats déjà animées (115 races animées au total).
- ComfyUI du lab stabilisé : mise à jour 0.32.0 + `--disable-cuda-malloc` + watchdog RAM + swap 11 GB (plus de segfaults sous charge, 108 jobs d'affilée sans incident).

## 2026.08.006 (2026-08-13)

### Ajouts
- **Portraits automatiques pour toutes les classes** : 142 portraits IA générés (RealVisXL) couvrant les 15 systèmes (Barbare, Magicien, Jedi, Decker, Nosferatu Ancilla…). À la création de personnage, sélectionner une classe remplit aussi automatiquement le portrait (dernier choix gagnant). Nouvelle map `SYSTEM_CLASS_PORTRAITS` (lobby.html) ; 3 classes réutilisent leur portrait de race (Vagabond Cats, Mentat et Bene Gesserit Dune).

### Technique
- Génération IA en lots résilients (le lab a subi 2 segfaults ComfyUI sous charge — reprise automatique par lots de 20 avec vérification des fichiers).

## 2026.08.004 (2026-08-13)

### Ajouts
- **Portraits automatiques pour toutes les races** : 108 portraits IA générés (RealVisXL) couvrant les 15 systèmes (D&D 5e, Pathfinder 2e, Warhammer Fantasy, Call of Cthulhu, Starfinder, Shadowrun, Vampire : La Mascarade, Cyberpunk Red, Savage Worlds, Dune, Star Wars, Le Seigneur des Anneaux, Paranoia, Tomorrow City). À la création de personnage, sélectionner une race remplit automatiquement le portrait. Nouvelle map `SYSTEM_RACE_PORTRAITS` (lobby.html) remplaçant la map Cats locale.
- **Vidéos d'intro par système** : 15 cinématiques LTX générées (château fantasy, mégapole cyberpunk, désert d'Arrakis, nefs spatiales…) affichées au premier lancement de campagne via `SYSTEM_INTRO_VIDEOS`.

## 2026.08.002-c1 (2026-08-13)

### Ajouts
- **Animations I2V pour toutes les races de Cats! La Mascarade** : vidéos LTX 0.9.5 générées depuis les portraits pour Persan, Maine Coon, Bengal, Sphynx et Européen (le lien « 🎬 Animation (LTX) » de création de personnage fonctionne désormais pour les 7 races).

## 2026.08.002 (2026-08-13)

### Corrections
- **Animation des portraits de races (Cats! La Mascarade)** : l'animation proposée pour « Chat de gouttière » ne correspondait pas au portrait (mauvais asset I2V : chat roux cartoon à écharpe violette). Priorité des animations inversée en `Grok > I2V > GIF` (le code contredisait son propre commentaire qui annonçait déjà le MP4 Grok en premier), et vidéo I2V du Vagabond **régénérée depuis le portrait** (LTX 0.9.5) — l'animation montre désormais le même chat tigré brun aventurier que le portrait.

## 2026.08.001-c1 (2026-08-12)

Fusion des travaux en attente + durcissement sécurité. Port par défaut : **8007** (`RPG_PORT` surchargeable — la prod utilise `PORT=3001`).

### Sécurité
- **Quota d'upload persistant en base** : remplacement du quota mémoire par la table `uploads` (SUM par utilisateur, 500 Mo), avec routes `DELETE /rpg/api/upload/:filename` et `GET /rpg/api/upload/quota`, et script `scripts/purge-orphans.js` (liste + `--delete`)
- **Vérification magic bytes** à l'upload (contenu réel vs extension), limites 10 Mo images / 30 Mo audio
- **Socket scoped** : tous les handlers temps réel sont désormais scopés à la campagne rejointe par le socket (`scoped()`), le `campaign_id` du client est ignoré ; handlers MJ protégés par `gmOnly`
- **Anti-DoS dés** : `rollDice` limité à 100 dés / 1000 faces, expressions invalides ignorées
- **`combat_hp` ownership** : un joueur ne peut modifier les PV que de son propre personnage (PNJ et autres → MJ uniquement)
- **JWT_SECRET fail-fast** : démarrage refusé si le secret est absent ou vaut `change-me-in-production`
- **Rate limit `/campaigns/join`** : 10 tentatives / 15 min par IP (anti brute-force des codes)
- **Codes d'invitation cryptographiques** : `crypto.randomBytes` au lieu de `Math.random()`

### CI / Docs
- Workflow GitHub Actions : création automatique des releases sur push de tag
- `VERSION` + `CHANGELOG.md`, `TOKENS.md` (suivi des coûts LLM)
- README : URL de clone corrigée (`virtualtable-rpg-ds`)

### Corrections
- Message d'erreur upload cohérent avec la limite réelle (30 Mo)

## 2026.08.001 (2026-08-01)

### Changed
- **Version** : adoption du format `ANNEE.MM.NNN` (2026.08.001). Fichier `VERSION` créé à la racine, `backend/package.json` mis à jour.
- **Port par défaut** : le backend écoute désormais sur le port **8007** (au lieu de 3001). La variable `RPG_PORT` permet de surcharger ce port dans `.env`.
- **Docker** : `docker-compose.yml` et `Dockerfile` utilisent `RPG_PORT` (défaut 8007) pour le mapping de port, la variable `PORT` du conteneur et le healthcheck.
- **Scripts** : `install.sh`, `update.sh`, `deploy.sh` utilisent `${RPG_PORT}` au lieu du port 3001 codé en dur pour les healthchecks.
- **Nginx** : tous les exemples de configuration et le template par défaut pointent vers le port 8007.
- **Documentation** : `README.md` enrichi avec la section configuration (variables d'environnement, port 8007, dépendances), version courante et lien vers les releases GitHub.

### Fixed
- Suppression de tous les ports 3001 codés en dur au profit de `RPG_PORT`.
