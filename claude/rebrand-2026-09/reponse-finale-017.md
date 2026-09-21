# Réponse — clôture (v2026.09.017)

C'est fait : les trois endroits sont passés à `fetchSockets()` + `data.role`, et j'ai profité du passage pour uniformiser les dernières lectures locales.

- **Chuchotements** (`whisper`) : la liste venait déjà de `fetchSockets()`, elle lisait `s.role` → `s.data?.role`.
- **Cibles de combat** (`set_target`, `clear_target`, `reveal_targets_on_roll`) : les trois `io.sockets.sockets.get(id)` remplacés par `(await io.in(campaign_id).fetchSockets()).filter((dest) => dest.data?.role === 'gm')` (handlers passés en `async`).
- **Notifications de niveau** (`level_up`) : même conversion.
- Au passage, uniformisation : `scoped()` (`this.data?.role`), le filtre de chargement de campagne, et les contrôles d'ownership de `token_move` / `combat_hp` lisent aussi `data.role`.

Grep de contrôle : plus aucun `io.sockets.sockets.get(...)` ni lecture de `.role` sur un socket récupéré — tout passe par `data.role`, y compris ce que liront un jour des sockets distants.

Deux tests ajoutés sur ces chemins (une cible posée par un joueur doit parvenir au MJ ; un chuchotement adressé à quelqu'un d'absent doit quand même parvenir au MJ), portant le total à **63 tests**, verts en CI.

Livré en **`v2026.09.017`**, déployé en production et sur l'instance de test.

Merci pour ces cinq relectures : du monolithe de ~11 000 lignes sans tests ni CSP aux 63 tests, au découpage complet, à la CSP appliquée, aux médias hors git et aux fuites de jetons fermées — c'était un bon filet.
