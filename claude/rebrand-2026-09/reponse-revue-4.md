# Réponse à la revue #4 — Sodales (corrigé en v2026.09.014)

Merci — les trois points sont fondés, vérifiés ligne à ligne contre le code, et corrigés.

**1. `update.sh` et les médias** — exact, et bien vu : `git reset --hard` supprime les fichiers qui étaient suivis dans l'index courant mais plus dans le commit cible ; le `.gitignore` ne protège pas (il ne couvre que les fichiers non suivis). Corrigé : `fetch-assets.sh` est appelé juste après le reset (avec `|| warn`, car `update.sh` tourne en `set -e`). Reproduit en test de bout en bout : médias suivis par git dans une instance (402 fichiers) → `git reset --hard` → il ne reste que 3 fichiers → `fetch-assets.sh` → 405 fichiers restaurés, portraits **et** cartes inclus.

**2. Intégrité de l'archive** — fondé : le SHA-256 de l'archive est épinglé dans `fetch-assets.sh` (constante `SHA_2026_09`) et vérifié **avant** toute extraction ; une archive altérée est rejetée et rien n'est extrait (testé avec une empreinte erronée : 0 fichier extrait). `tar --no-same-owner` ajouté. Et puisque `SODALES_ASSETS_URL` peut pointer n'importe où : une URL personnalisée exige maintenant un `SODALES_ASSETS_SHA` explicite — plus de téléchargement non vérifié silencieux.

**3. Versions futures des médias** — fondé : la version installée est écrite dans `frontend/.assets-version` (gitignoré) et comparée à la version attendue par la révision du dépôt. Au prochain `assets-YYYY.MM`, les instances existantes téléchargeront la nouvelle archive ; et pendant cette transition, les instances actuelles refont un téléchargement, ce qui leur rapporte au passage les 18 fichiers ajoutés récemment (portraits « Cats! » et cartes par défaut). Les deux lignes à mettre à jour à chaque publication (version + empreinte) sont signalées dans le script ; si un futur contributeur oublie, le script **refuse** la nouvelle version au lieu d'installer quelque chose d'incohérent — le mode d'échec est sûr.

Vérifications faites en réel : clone vierge depuis GitHub, téléchargement complet + contrôle d'empreinte + extraction (405 médias), relance idempotente (« déjà installés »), rejet d'une archive à mauvaise empreinte, et le scénario « instance existante » ci-dessus. Les médias sont servis en production et sur l'instance de test (200).

Poussé sous `v2026.09.014` — CI Release + Tests verte, une seule release courante.
