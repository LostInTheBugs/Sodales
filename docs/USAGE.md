# Using Sodales

Short guide for players and game masters. Installation lives in the [README](../README.md).

## Create a campaign (GM)

1. Log in, then **Créer une campagne** on the lobby page.
2. Pick a game system — it drives which fields the character sheets show (stats, skills, spells…).
   "Autre" gives a generic sheet.
3. The campaign gets an **invite code** (8 hex characters, regenerable in *Réglages de la campagne*).

## Invite a player

1. *Réglages de la campagne* → copy the invite code (or the lobby invite panel for a QR code in table mode).
2. The player registers, then enters the code in **Rejoindre une campagne**.
3. That's it — they appear in the member list; their characters are visible to the GM immediately.

## Characters

- Players create their own characters (portrait, stats, inventory, attacks, spells, notes).
- **Encumbrance** is computed from STR, body weight and item weights (kg). Item weights are auto-filled
  from a built-in table when the name is recognised.
- The GM can edit any character and reassign one to another player (`token_reassign`).

## Maps

1. *Réglages de la campagne* → upload a map image (JPG/PNG/WebP, ≤ 10 MB) or import a **UVTT** file
   (`.dd2vtt`, Universal VTT — walls and lights come with it).
2. Pick a map, place tokens (drag & drop, GM moves any token, players move theirs).
3. GM tools: walls, lights, fog of war (reveal circles), drawings, ping, measure, targeting.

## Backup and restore

```bash
./backup.sh                 # → backups/<timestamp>/{db.dump, uploads.tar.gz, manifest.txt}
./restore.sh backups/<timestamp>    # replaces the database content, restores uploads
```

`BACKUP_KEEP=7` (default) keeps the last 7 backups. A cron entry like
`0 4 * * * cd /path/to/sodales && ./backup.sh` is a good start. **Test your restore once** before
you need it.

## Updating

```bash
sudo ./update.sh
```

It fetches the latest version, applies the numbered migrations, restores/updates the media bundle
(verified by SHA-256) and restarts what changed. Existing data is preserved.

## Media files

Portraits, music and default maps are **not** stored in git. `fetch-assets.sh` downloads the
`assets-YYYY.MM` release (SHA-256 pinned) and records the installed version in
`frontend/.assets-version`. Run it again after an assets release to pick up new media.

## Experimental / caveats

- The **table mode** (`?mode=display&table=1`) is meant for a screen in the middle of the table.
- Per-character animation videos are no longer shipped (storage); portraits remain.
- Game systems referencing commercial universes are personal-use content — see `docs/PERMISSIONS.md`
  for the security model and the repository README for licensing notes.
