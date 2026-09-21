# Sodales — rebrand du VTT (chantier 2026-09)

## Nom retenu
**Sodales** (parmi 8 propositions ; collisions vérifiées web+GitHub). Logo conçu SANS image
fournie — recette `app-rebranding/references/logo-design-family-style.md`.

## Logo / assets (faits)
- Émblème : plaque navy `#082447` + cadre or `#C89E50` ; glyphe = **3 compagnons (bustes)
  tronqués par la table** (liseré navy), table à 2 pieds. Variantes std/small/tiny.
- `assets/final/` : lockup, lockup-dark (wordmark ivoire), icône, favicons 16/32/48,
  favicon.png 64, apple-touch 180. QA : `assets/qa/`.
- Carte sociale : `assets/sodales-social.png` (1280×640, layout type Cohors : badge + texte).
- Générateurs : `make_logo.py`, `make_social.py` (dépendent de `fonts/Montserrat.ttf`).

## Intégration app (faite, dans ~/work/virtualtable-rpg-audit)
- `integrate.py` : favicons (3 liens, cache-buster `?v=2026.09.001`) sur les 9 pages ;
  en-têtes « icône + Sodales » (7 pages) ; lockup sur la page de connexion
  (`max-height:max(110px,calc(100vh - 580px))` — vérifié sans découpe à 1440×900,
  1280×720 et 390×844) ; titres/chaînes de marque ; scripts shell (bannières recentrées) ;
  nginx confs renommées `sodales*.conf.example` ; package.json/schema/VERSION/CHANGELOG.
- **Fix au passage** : `ALTER TABLE tokens ADD COLUMN IF NOT EXISTS hp_max` ajouté au
  schéma — « + Token » échouait sur une installation neuve (no-op en prod).
- Captures README (données fictives) : `docs/sodales-{login,lobby,game}.png` —
  local : `claude/rebrand-2026-09/local/` (seed : Maître du Jeu / Aventurier,
  campagne « Les Brumes d'Ombreval », carte « Forêt de Sombreval »).
- README EN réécrit (lockup `<picture>` + captures + version) ; LICENSE MIT ajouté.

## Livré (2026-09-21)
- Commits `24094d8` (fix schéma) + `0bef124` (rebrand) poussés ; repo renommé `LostInTheBugs/Sodales`.
- Release `2026.09.001` publiée (pre-release, notes CHANGELOG) ; release 2026.08.008 supprimée (tag conservé) ; About + 10 topics ; LICENSE MIT.
- Prod ionos06 : backend 2026.09.001 + frontend rebrandé déployés (md5 des 15 fichiers vérifiés un par un, uploads intacts = 12, colonne tokens.hp_max ok). Backups : `app.bak-20260921`, `nginx/backups/rebrand-20260921/`, `default.conf.bak-20260921`.
- Domaine : `https://sodales.cloudfr.net` (DNS CF DNS-only + bloc :80 + server_name :443) ; certificat virtualtable.cloudfr.net étendu aux 2 SAN ; ancien domaine conservé.
- **Reste à faire par Fred** : upload du social preview GitHub (Settings → Social preview → `docs/sodales-social.png`).
- Non fait (en attente) : rebranding de l'instance TEST papouille5 (vtt.ruban-adhesif.com).


## Divers
- Instance locale : compose `-p sodaleslocal` (db+rpg) + nginx container `sodaleslocal-nginx`
  sur :8090 (conf `/tmp/sodales-local-nginx.conf`) — à éteindre après usage.
- Garde-fous vécus : captures CDP = `cdp('Page.captureScreenshot', format='png',
  _response_timeout=90)` après gel de `requestAnimationFrame` + `activate_tab` +
  `Page.setWebLifecycleState active` ; le helper `capture_screenshot` peut timeouter.
