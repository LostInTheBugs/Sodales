# Réponse à la revue #3 — Sodales (posté en v2026.09.013)

Merci pour cette relecture — et pour le timing sur la réécriture d'historique.

## Sur vos vérifications

Tout concorde. Deux précisions de décompte : `game.html` fait bien **2 052 lignes** dans un clone vierge (la logique de page est sortie dans `js/page/*.js` + `js/game/core.js` pendant la mise en place de la CSP), et il y a **44 fichiers JS applicatifs** au total : 26 dans `js/game/`, 8 dans `js/page/`, 9 à la racine de `js/`, 1 lib vendorisée. Les 23 tests d'autorisation (19 REST + 4 socket, `backend/tests/`) tournent bien en CI via `tests.yml`.

## Vos quatre points

**1. Médias** — la purge a eu lieu en `v2026.09.006` (git-filter-repo, 93 commits ; le pack de 105 Mo vient d'un clone antérieur à cette réécriture). Mesures faites à l'instant sur un **clone vierge** du dépôt public : `.git` = **3,6 Mo**, total 21 Mo, et **zéro média dans l'historique**. Les 402 fichiers de médias (~95 Mo) sont servis par la release `assets-2026.09` et récupérés par `fetch-assets.sh`, branché dans `install.sh`.
Votre remarque tombait juste malgré tout : il restait un résidu que je n'avais pas vu — les portraits « Cats! La Mascarade » (PNG/GIF) et les cartes prédéfinies (JPG), ~13 Mo, que le `.gitignore` de `006` ne couvrait pas (il ne filtrait que jpg/mp4/mp3). Corrigé en **`v2026.09.013`** : sortis du suivi, ajoutés au bundle (402 fichiers, re-téléchargé et testé) et purgés de l'historique par une seconde réécriture. Faire la réécriture tant qu'il y a peu de forks était le bon réflexe — c'est fait.

**2. CSP hors nginx intégré** — fondé, corrigé en **`v2026.09.013`** : la politique complète est maintenant dans `nginx/sodales.conf.example` et `nginx/sodales-apache.conf.example` (donc option 2 de `install.sh` couverte). Nous avons préféré les exemples à helmet côté Express parce qu'Express ne sert que l'API (`/rpg/api`), pas le HTML : une CSP posée par helmet ne protégerait pas les pages. Si un mode d'installation sert le frontend via Express, dites-le et on l'ajoute aussi.

**3. QR code** — fondé, corrigé en **`v2026.09.013`** : génération 100 % locale (`js/vendor/qrcode.min.js`, générateur de Kazuhiko Arase, MIT). `api.qrserver.com` est retiré et l'exception supprimée : `img-src` n'autorise plus aucun domaine externe. L'URL d'instance ne sort plus chez un tiers.

**4. Suppression de compte** — fondé : `disconnectSockets` passe désormais **avant** le DELETE (`v2026.09.013`). Testé en réel (compte jetable : suppression 200, ligne absente, socket coupé).

## Deux choses que votre relecture a fait sortir au passage

- Un bug d'enregistrement des helpers d'actions dans les modules (`ACT is not defined`) — il était invisible parce que le navigateur de test servait du JS en cache ; les tests tournent maintenant avec le cache désactivé, et le registre d'actions est vérifié à chaque page.
- Le mode table nécessite `mode=display` **et** `table=1` (les deux), ce qui rendait le QR difficile à tester ; c'est documenté.

Le tout est poussé sous **`v2026.09.013`** (tags `2026.09.001`→`013`, une seule release courante, CI Release + Tests verte) et déployé en production et sur l'instance de test.
