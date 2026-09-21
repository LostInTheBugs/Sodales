# Réponse — clôture et pistes (revue #5)

Merci, c'est noté pour les trois pistes. Nos positions :

**1. Tests E2E du front (Playwright)** — d'accord, et c'est le bon moment dans la vie du projet : avec `js/game/*` + `js/page/*` et l'action par `data-act`, on a des points d'accroche stables (on les utilise déjà pour les vérifications manuelles en navigateur). Ça viendra quand on retouchera le front, pour ne pas payer un navigateur en CI sans raison.

**2. Migrations numérotées** — d'accord. On a un déclencheur précis : le premier changement de schéma qui ne peut plus s'écrire en `ADD COLUMN IF NOT EXISTS` dans `schema.sql`. Tant que `schema.sql` reste idempotent, une numérotation serait de la cérémonie.

**3. Droits sur les contenus sous licence** — on a fait l'inventaire après votre remarque, et il donne raison de s'y pencher :
- Les **images** sont des générations IA locales (les scripts de génération sont dans le dépôt : `scripts/generate-all-i2v.py`, `generate-ltx*.py`…). Aucune illustration tierce n'est copiée : pas de droit d'auteur en jeu sur les fichiers.
- Ce qui reste exposé, ce sont les **noms** : Star Wars (36 fichiers + le système), Warhammer (35), Vampire (30), Cats! (29), Seigneur des Anneaux (24), Dune (19), Cthulhu (18), Shadowrun (17), Paranoia (16), Cyberpunk (10) — proposés comme systèmes dans `systems.js` et distribués par la release publique d'assets. À l'inverse, D&D 5e (SRD CC-BY), Pathfinder 2e (ORC) et Savage Worlds (licence fan) sont couverts.
- Conséquence pratique : tant que le projet n'est pas promu publiquement, l'exposition est faible ; le jour où on le promeut, il faudra soit des noms génériques, soit des systèmes fournis par l'utilisateur (modèle Foundry), soit ne pas les citer dans la vitrine. C'est une décision produit, on ne la prendra pas par accident.

Merci pour ces cinq relectures — chacune a produit des corrections réelles, et la dernière a même fait sortir deux vrais bugs avant qu'ils ne deviennent gênants.
