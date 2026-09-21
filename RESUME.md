# Résumé – Correction des failles d'autorisation Socket.io

Fichier : `backend/socket/index.js`

## 1. Helper `scoped()` (module-level)

```js
function scoped(handler, { gmOnly = false } = {}) {
  return async function (payload = {}) {
    const cid = this.campaignId;          // établi par join_campaign
    if (!cid) return;                     // join_campaign non appelé → silencieux
    if (gmOnly && this.role !== 'gm') return;
    return handler.call(this, { ...payload, campaign_id: cid }, cid);
  };
}
```

- Ignore le `campaign_id` envoyé par le client, utilise `this.campaignId`
- Option `gmOnly` : refuse silencieusement si `this.role !== 'gm'`
- Passe `cid` (campaign_id vérifié) en 2e argument au handler

## 2. Handlers wrappés

Tous les handlers sauf 3 exceptions :
- `join_campaign` – initialise `socket.campaignId` et `socket.role`
- `chat_message` – déjà correct (vérifie manuellement)
- `dice_roll` – déjà correct (vérifie manuellement)

Les 50 autres handlers (incluant `whisper`, `level_up_request`, `level_up_requests_list`, `level_up_resolve`) sont wrappés avec `scoped()` ou `scoped(handler, { gmOnly: true })`.

## 3. Requêtes UPDATE/DELETE sécurisées

| Table      | Technique | Handlers |
|-----------|-----------|----------|
| maps      | `WHERE id=$n AND campaign_id=$m` | fog_reveal, fog_clear, fog_reset, draw_stroke, draw_undo, draw_clear, walls_save, lights_save, objects_save, map_change |
| tokens    | `FROM/USING maps WHERE tokens.map_id=maps.id AND maps.campaign_id=$n` | token_move, token_delete, token_hp |
| characters | `WHERE id=$n AND campaign_id=$m` | token_reassign, character_vision_set, combat_hp, level_up_resolve |

## 4. Contrôle GM ajouté

`draw_clear`, `draw_undo`, `draw_stroke`, `combat_hp` : passés en `gmOnly: true` (ils n'avaient aucune vérification de rôle auparavant).

## 5. Filtre `visible` sur `map_change`

```sql
WHERE t.map_id = $1 AND (t.visible = TRUE OR $2 = 'gm')
```

## Compatibilité frontend

Le client continue d'envoyer `campaign_id` normalement. `scoped()` l'écrase par `socket.campaignId` — l'API frontend est inchangée.

## Vérification

```
node --check  →  OK
75/75 checks statiques  →  PASS
```
