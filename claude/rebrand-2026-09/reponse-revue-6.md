# Réponse — revue externe (v2026.09.019 / 020)

Merci pour cette lecture. Point par point, avec l'état réel du dépôt après vérification.

**1. Projet jeune** — factuel, rien à corriger : dépôt récent, 0 étoile / 0 fork / 0 issue. Les relectures successives tiennent lieu de validation externe en attendant. Depuis votre lecture : ~105 commits et la CI est passée de 0 à **72 tests**.

**2. Migrations** — fondé, corrigé en `v2026.09.019`. `backend/schema.sql` (cumulatif) est remplacé par des migrations numérotées `backend/migrations/NNN_*.sql` appliquées par `migrations/run.js` : idempotent, **verrou consultatif PostgreSQL** (démarrages concurrents sérialisés), compatible bases existantes (une base créée avant la numérotation voit `001` marquée appliquée au lieu d'être rejouée — vérifié en production le jour même : `[DB] Base existante — 001 considérée comme déjà appliquée`). `install.sh`, `update.sh` et `deploy.sh` passent par le runner ; tests dédiés (base vierge, relance, baseline, échec/rollback).
Au passage, cette passe a fait sortir une **erreur de syntaxe préexistante dans `install.sh`** qui l'empêchait purement et simplement de s'exécuter — corrigée.

**3. Modèle JSONB** — d'accord sur le fond : c'est un choix assumé pour un VTT multi-systèmes, il reste au programme (schémas JSON versionnés par système). Les validations critiques sont déjà côté application (formules de dés bornées, contenu des uploads vérifié, payloads contraints par colonnes).

**4. Sécurité — votre liste, vérifiée une par une** : routes de campagne ✓ (23 tests d'autorisation + **matrice dans `docs/PERMISSIONS.md`, mappée test par test**) ; événements Socket.io ✓ (`scoped()`/`gmOnly` + tests cloisonnement/MJ-only/jetons invisibles) ; accès direct aux uploads ✓ (noms UUID non devinables, volume hors du dépôt) ; URLs d'images ✓ (aucun appel serveur, rendu client sous CSP) ; injection HTML/Markdown ✓ (DOMPurify, désormais **repli sûr** si le filtre manque) ; macros/dés ✓ (parseur borné côté serveur) ; codes d'invitation ✓ (32 bits d'entropie + limiteur dédié sur `/join`) ; révocation JWT ✓ (tests) ; trust proxy ✓ (`app.set('trust proxy', 1)`).

**5. Contenus utilisateur** — vérifié : vérification **par contenu** (magic bytes) en plus de l'extension, noms UUID, **SVG refusé** (hors liste blanche), Markdown sanitisé, quota 500 Mo **sérialisé** depuis `v2026.09.020` (transaction + verrou de ligne : deux envois simultanés ne peuvent plus passer ensemble sous la limite), suppression = fichier **et** ligne effacés (testés). 5 tests d'upload ajoutés.

**6. Déploiement Docker** — corrigé en `v2026.09.019` : versions figées (`postgres:15.8-alpine`, `nginx:1.27-alpine`, `certbot/certbot:v5.8.0`), réseau explicite, rotation des journaux (10 Mo × 3), limites CPU/mémoire, PostgreSQL jamais publié (déjà le cas), backend en `127.0.0.1` par défaut. Sauvegardes : `backup.sh` / `restore.sh`, **restauration testée** (comparaison des compteurs ligne à ligne sur une base jetable).

**7. Front / maintenabilité** — partiellement fondé : Dependabot actif (5 PR en attente, dont des majeures à arbitrer : express 5, multer 2, uuid 14), documentation ajoutée (`docs/PERMISSIONS.md`, `docs/USAGE.md`), 72 tests en CI. Restent au programme : ESLint/formatage, Playwright, tests de charge.

**Ce que votre remarque a fait sortir** : l'audit de cette zone a révélé **six boutons silencieusement cassés** par la migration CSP (suppression d'objet/sort, portraits de repli, file audio, champ d'invitation) — l'argument `$el` avait sauté à la conversion. Réparés et vérifiés en navigateur.

Livré en `v2026.09.019` et `v2026.09.020`, déployé en production et sur l'instance de test, CI verte (72 tests).
