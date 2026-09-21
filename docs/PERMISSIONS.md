# Permissions matrix

Who can do what, and which automated test proves it.
`Player` = member of the campaign · `GM` = campaign owner/game master · `Admin` = instance administrator.

## REST API

| Resource / action | Player | GM | Admin | Covered by |
|---|---|---|---|---|
| Read own campaigns | yes | yes | yes | `authz.rest.test.js` (cloisonnement) |
| Read a campaign you are not a member of | **no (403)** | — | yes | `authz.rest.test.js` (non-membre) |
| Update campaign settings | no | yes | yes | `authz.rest.test.js` (joueur vs MJ) |
| Delete campaign | no | yes (owner) | yes | `authz.rest.test.js` |
| Join by invite code | yes (rate-limited, 10/15 min) | yes | yes | `authz.rest.test.js`, `campaigns.js` limiter |
| Create / read / update **own** character | yes | yes | yes | `authz.rest.test.js` (fiches) |
| Read / update **another player's** character | no (unless shared) | yes | yes | `authz.rest.test.js` (fiches : propriétaire vs MJ) |
| Upload a file (image ≤ 10 MB, audio ≤ 30 MB) | yes | yes | yes | `uploads.test.js` |
| Delete an upload | own files only | own files only | any file | `uploads.test.js` |
| Admin routes (users, tiers, deletion) | no | no | yes | `authz.rest.test.js` (administration) |
| Revoked JWT (token_version) | rejected | rejected | rejected | `authz.rest.test.js` (sessions et jetons) |

## Socket.io

| Event family | Player | GM | Admin | Covered by |
|---|---|---|---|---|
| `join_campaign` (non-member) | **refused** | — | — | `authz.socket.test.js` |
| Chat / dice / whisper | yes | yes | yes | `authz.socket.test.js` (chat), `map-sync.socket.test.js` (chuchotement) |
| GM-only events (`night_mode_set`, `map_change`, `fog_*`, `walls_save`, `token_create`, `combat_*`…) | **ignored** | yes | yes | `authz.socket.test.js` (night_mode_set), `map-sync.socket.test.js` |
| Move a token | own character's token only | any token | any token | `map-sync.socket.test.js` (propriété) |
| See an **invisible** token (move, HP, conditions, creation, deletion, map change) | **never** | yes | yes | `map-sync.socket.test.js` (5 tests) |
| Cross-campaign isolation | enforced | enforced | enforced | `map-sync.socket.test.js` (cloisonnement) |
| Revoked JWT | refused at handshake | refused | refused | `authz.socket.test.js` |

## Uploaded files — access model (explicit)

Uploaded files are served as static resources from `/uploads/<uuid>.<ext>`.

- **Who can read a file: anyone who has its exact URL.** The name is a random UUID (not
  guessable, not enumerable, directory listing disabled, `X-Robots-Tag: noindex, nofollow`),
  but there is **no per-user or per-campaign access check** on the download itself.
- Files are **not campaign-scoped**: the same portrait or map can be referenced from several
  campaigns.
- Consequence: **treat uploads as shareable-by-link, not secret.** Do not use them for private
  documents. This matches the model used by other self-hosted VTTs; if you need
  campaign-private media, put the webroot behind an authentication layer
  (`auth_request` / Apache `Require`) — the browser sends no cookie today, so `img` tags would
  need that layer rather than a Bearer token.
- The API side *is* protected: listing is per-user, deletion is restricted to the owner (or an
  admin), and the content is validated (magic bytes) and quota-checked on upload.

## trust proxy

`TRUST_PROXY` (default `1`) configures how many proxies Express trusts, which drives the client
IP used by the rate limiters.

| Deployment | Value |
|---|---|
| Bundled nginx, or a single external proxy that sets `X-Forwarded-For` | `1` (default) |
| CDN + proxy (two hops) | `2` |

Verified on the production instance: a client sending forged `X-Forwarded-For` values still gets
rate-limited by its **real** address (nginx appends the real IP last and Express only reads the
last trusted hop).

## Notes

- Roles are re-read from the database on every request (`authMiddleware` overwrites `is_admin`/`tier`);
  `token_version` makes an issued JWT invalid immediately after a password change, tier change, admin
  toggle, account deletion or `logout-others`.
- Socket recipients are resolved with `fetchSockets()` and `socket.data.role`, so the checks keep
  working with a multi-node adapter.
- File uploads: content checked against the declared extension (magic bytes), stored under a random
  UUID name, SVGs refused, per-user quota (500 MB) tracked in the database.

Run everything: `cd backend && npm test` (see `backend/tests/run-local.sh` for a local database).
