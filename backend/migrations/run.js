'use strict';
/**
 * Migrations numérotées de Sodales.
 *
 * Chaque fichier `NNN_nom.sql` de ce dossier est appliqué UNE fois, dans
 * l'ordre des numéros, et son application est enregistrée dans la table
 * `schema_migrations`. Conçu pour tourner au démarrage du serveur :
 *
 *   - idempotent : relancer ne rejoue rien ;
 *   - concurrent-safe : un verrou consultatif PostgreSQL sérialise les
 *     démarrages simultanés (redéploiement, plusieurs conteneurs) ;
 *   - compatible bases existantes : une base créée avant la numérotation
 *     (schéma présent, pas d'historique) voit 001 marquée « déjà appliquée »
 *     au lieu d'être rejouée.
 *
 * Ajouter une migration = déposer `002_*.sql` ici. Rien d'autre à modifier.
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = __dirname;
const LOCK_ID = 774411; // identifiant arbitraire du verrou consultatif

function lister() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{3}_.+\.sql$/.test(f))
    .sort();
}

async function runMigrations(dbOrPool, { log = console.log } = {}) {
  const pool = dbOrPool && typeof dbOrPool.connect === 'function' ? dbOrPool : dbOrPool?.pool;
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('runMigrations attend un Pool pg (ou un module exposant { pool })');
  }
  const files = lister();
  if (!files.length) return { applied: [], baseline: false };

  // Un client dédié : le verrou consultatif et les transactions sont liés à
  // la connexion, pas au pool.
  const client = await pool.connect();
  const applied = [];
  let baseline = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         version    TEXT PRIMARY KEY,
         applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    const done = new Set(
      (await client.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version)
    );

    if (done.size === 0) {
      const t = await client.query("SELECT to_regclass('public.users') AS t");
      if (t.rows[0] && t.rows[0].t) {
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
          [files[0]]
        );
        done.add(files[0]);
        baseline = true;
        log(`[DB] Base existante — ${files[0]} considérée comme déjà appliquée`);
      }
    }

    for (const f of files) {
      if (done.has(f)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8');
      log(`[DB] Application de ${f}…`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
        await client.query('COMMIT');
        applied.push(f);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f} en échec : ${err.message}`);
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]); } catch { /* connexion perdue */ }
    client.release();
  }
  return { applied, baseline };
}

module.exports = { runMigrations, lister };

if (require.main === module) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  runMigrations(pool)
    .then(({ applied }) => {
      console.log(applied.length ? `[DB] ${applied.length} migration(s) appliquée(s)` : '[DB] Migrations à jour');
      return pool.end();
    })
    .catch((e) => {
      console.error('[DB] Échec des migrations :', e.message);
      process.exit(1);
    });
}
