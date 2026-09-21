# Réponse à la revue #4 (suite) — précision sur l'empreinte

Merci — vous avez raison, et voici le comportement exact (c'est bien celui que vous décrivez) :

- **URL personnalisée + version connue** (celle du dépôt) → l'empreinte **épinglée** de cette version est utilisée : l'archive reste vérifiée, même servie depuis un miroir. C'est le comportement voulu — un miroir de la même version passe la vérification, un contenu différent est rejeté.
- **Empreinte explicite** (`SODALES_ASSETS_SHA`) requise uniquement pour une version inconnue du script (aucune empreinte épinglée disponible).

L'imprécision était donc dans notre message, pas dans le script — mais le commentaire d'en-tête disait la même chose et a été corrigé : commit `05c1b40` sur `main`, documentation uniquement (la release `2026.09.014` reste la courante). Re-vérifié à l'instant sur ce scénario précis : URL personnalisée, version par défaut, aucune empreinte fournie → contrôle d'intégrité effectué avec l'empreinte épinglée.

Merci aussi pour la piste. C'est noté pour la suite : la couverture au-delà des autorisations, en priorité les règles des fiches de personnage et la synchronisation carte/jetons — précisément les zones où les régressions du refactor sont apparues.
