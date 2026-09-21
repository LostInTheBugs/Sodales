'use strict';
/**
 * Tests du système de migrations (backend/migrations/run.js).
 *
 *  - base vierge  : 001 appliquée, tables créées, version enregistrée ;
 *  - relance      : aucune migration rejouée (idempotence) ;
 *  - base existante sans historique (installations antérieures) : 001 est
 *    marquée comme déjà appliquée (baseline) sans être rejouée ;
 *  - migration en échec : rien n'est enregistré, la transaction est annulée.
 */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { Pool } = require('pg');
const H = require('./helpers');
const { runMigrations } = require('../migrations/run');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function freshDb(tag) {
  const name = `sodales_mig_${process.pid}_${tag}`;
  const c = new Client({ connectionString: H.dbUrl('postgres') });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await c.query(`CREATE DATABASE ${name}`);
  await c.end();
  return { name, pool: new Pool({ connectionString: H.dbUrl(name) }) };
}

async function dropDb(name, pool) {
  await pool.end();
  const c = new Client({ connectionString: H.dbUrl('postgres') });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await c.end();
}

const silence = { log: () => {} };

describe('Migrations — base vierge', () => {
  let db;
  before(async () => { db = await freshDb('vierge'); });
  after(async () => { await dropDb(db.name, db.pool); });

  test('applique 001 et crée les tables du schéma', async () => {
    const { applied } = await runMigrations(db.pool, silence);
    assert.deepEqual(applied, ['001_initial_schema.sql']);
    const r = await db.pool.query("SELECT to_regclass('public.users') AS u, to_regclass('public.campaigns') AS c");
    assert.ok(r.rows[0].u, 'la table users doit exister');
    assert.ok(r.rows[0].c, 'la table campaigns doit exister');
    const v = await db.pool.query('SELECT version FROM schema_migrations');
    assert.deepEqual(v.rows.map((x) => x.version), ['001_initial_schema.sql']);
  });

  test('relancer ne rejoue rien (idempotent)', async () => {
    const { applied } = await runMigrations(db.pool, silence);
    assert.deepEqual(applied, []);
    const n = await db.pool.query('SELECT COUNT(*)::int AS n FROM schema_migrations');
    assert.equal(n.rows[0].n, 1);
  });
});

describe('Migrations — base existante sans historique (baseline)', () => {
  let db;
  before(async () => { db = await freshDb('baseline'); });
  after(async () => { await dropDb(db.name, db.pool); });

  test('001 est marquée appliquée sans être rejouée', async () => {
    // simule une installation antérieure : schéma présent, pas d'historique
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, '001_initial_schema.sql'), 'utf8');
    await db.pool.query(sql);
    const r = await runMigrations(db.pool, silence);
    assert.equal(r.baseline, true);
    assert.deepEqual(r.applied, [], 'aucune migration ne doit être rejouée');
    const v = await db.pool.query('SELECT version FROM schema_migrations');
    assert.deepEqual(v.rows.map((x) => x.version), ['001_initial_schema.sql']);
  });
});

describe('Migrations — échec d\'une migration', () => {
  let db, extra;
  before(async () => {
    db = await freshDb('echec');
    // migration volontairement cassée (sera supprimée après le test)
    extra = path.join(MIGRATIONS_DIR, '999_migration_cassee.sql');
    fs.writeFileSync(extra, 'CREATE TABLE IF NOT EXISTS ok_table (id int);\nSELECT * FROM table_inexistante;');
  });
  after(async () => {
    try { fs.unlinkSync(extra); } catch { /* déjà retirée */ }
    await dropDb(db.name, db.pool);
  });

  test('rien n\'est enregistré et la transaction est annulée', async () => {
    await assert.rejects(() => runMigrations(db.pool, silence), /999_migration_cassee/);
    const v = await db.pool.query('SELECT version FROM schema_migrations');
    assert.ok(!v.rows.some((x) => x.version.startsWith('999')), '999 ne doit pas être enregistrée');
    // la table intermédiaire de la migration cassée ne doit pas exister (rollback)
    const t = await db.pool.query("SELECT to_regclass('public.ok_table') AS t");
    assert.equal(t.rows[0].t, null, 'le rollback doit annuler la table partielle');
  });
});
