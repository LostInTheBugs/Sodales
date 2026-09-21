# Réponse — couverture de tests étendue (v2026.09.015)

Bonne piste, et elle a payé immédiatement : ces tests ont fait sortir deux vraies fuites que l'audit pensait avoir fermées.

**Ce qui est maintenant couvert** (35 nouveaux tests, 58 au total en CI) :

- **Règles de fiche** (`tests/sheet-rules.test.js`, 26 tests) : encombrement D&D 5e (seuils, kg/lbs, somme quantité × poids, arrondis, fiche vide), poids d'objets (exact + flou + inconnu), vision en mètres (0/1/3 cases), CD de classe PF2e (niveau + meilleure stat mentale + rang) et sélecteur de rangs de maîtrise. Le module est chargé dans un contexte `vm` avec un mini-DOM factice : **aucun navigateur, aucune base**, la suite tourne en quelques dizaines de millisecondes.
- **Synchronisation carte/jetons** (`tests/map-sync.socket.test.js`, 9 tests, vrai serveur + base jetable) : déplacement de jeton (diffusion aux autres membres, hors émetteur, + persistance), propriété (un joueur ne bouge que le jeton de son personnage — ni celui d'un autre joueur, ni un PNJ), changement de carte, brouillard (diffusion + persistance + réservé au MJ), et cloisonnement entre campagnes (avec contrôle positif dans la même campagne).

**Les deux fuites trouvées et corrigées** :

1. **`map_change` diffusait les jetons invisibles à tout le monde.** Le filtre utilisait le rôle de **l'émetteur** (`t.visible OR $2='gm'`) — or l'événement est réservé au MJ, donc le filtre ne s'appliquait jamais, et le même payload partait à tous les destinataires (`io.to(room).emit`). Le point 4 de l'audit n'était donc pas réellement fermé. Correction : le payload est construit **par destinataire** (`io.in(room).fetchSockets()` puis filtrage selon `dest.role`).
2. **`token_create` ignorait la visibilité** : impossible de créer un jeton caché par l'API socket (la colonne `visible` existait mais rien ne l'alimentait). La création accepte maintenant `visible: false` et, dans ce cas, le jeton n'est diffusé qu'aux MJ — même règle que le chargement initial de campagne. (Aucune interface ne crée encore de jeton caché : la fuite était latente, mais la colonne est désormais utilisable.)

Chaque test de refus est doublé d'un **contrôle positif** (le même événement, autorisé, doit bien passer) pour qu'un test ne puisse pas « réussir » parce que rien ne fonctionne.

Livré en **`v2026.09.015`** : 58 tests verts en CI (41 s), déployé en production et sur l'instance de test, une seule release courante. Le reste à votre avis (sécurité, révocation, CSP, découpage, médias) est toujours vert après ces changements.
