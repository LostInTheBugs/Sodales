# Réponse — fuites de jetons invisibles (v2026.09.016)

Les trois sont exacts, vérifiés ligne à ligne — et corrigés comme vous le suggérez, avec un helper unique.

**Le helper `emitToken(campaignId, token, event, payload)`** est maintenant le passage obligé de tout événement de jeton : si le jeton est invisible, l'émission ne part que vers les sockets MJ ; sinon vers la campagne (avec l'option « exclure l'émetteur » pour conserver la sémantique de `socket.to`).

- **`token_moved`** : l'`UPDATE` renvoie désormais `RETURNING tokens.visible` et passe par `emitToken(..., { excludeSender: socket })`. Le cas le plus exploitable (suivre un monstre caché) est fermé.
- **`token_hp_updated`** : même traitement (`RETURNING tokens.visible`).
- **`token_conditions_updated`** : le handler vérifiait encore moins que les autres (aucune lecture en base) — il contrôle maintenant l'appartenance du jeton à la campagne avant d'émettre.
- **`token_deleted`** : même classe, traité aussi (`DELETE … RETURNING tokens.visible`).
- Bonus du `RETURNING` : plus aucune « diffusion fantôme » quand l'identifiant n'appartient pas à la campagne.

**Preuve que les tests attrapent les fuites** : le correctif backend retiré (stash), la suite passe de 12/12 à **3 échecs** — exactement les trois événements signalés — puis 12/12 une fois le correctif remis. Total en CI : **61 tests**, verts.

**Votre point d'architecture** : `socket.data.role` est posé au `join_campaign`, et `emitToken` comme le filtrage de `map_changed` lisent `dest.data.role` (et non plus `dest.role`). Le jour où un adaptateur multi-nœuds arrive, le filtre continuera de fonctionner.

Livré en **`v2026.09.016`** — CI verte (Release + Tests, 44 s), déployé en production (image backend reconstruite, hash vérifié) et sur l'instance de test.
